---
id: SPEC-workflow-prevent-gate-drift-76
project: horadric
ticket: HOR-076
status: done
---

# Prevenir drift de Gate decision — defensa en profundidad (A+B+C+D)

# Prevenir drift de Gate decision — defensa en profundidad (A+B+C+D)

## Executive summary — lo que estas aprobando

> *Fix sistemico del DKC tras drift detectado en BLY-043: 3 sessions cerraron con `S{N}.GATE [x]` pero bloque `**Gate decision:**` vacio → HC mostraba `in_progress`. Causa: LLM uso `done-task` en vez de `close-gate` (comando correcto, documentado en `request-execute/session-gate.md`). Validator permitio el shape inconsistente.*

**Que se quiere**: bloquear el mal uso en origen (B: `done-task` rechaza targets `S{N}.GATE` con error que apunta a `close-gate`) + atrapar drift residual via validator (A: `gateDecision` REQUIRED-when-gate-done en `SessionBlockSchema`) + visibilizar el patron (C: warning en `request-execute.md` root) + auto-validar (D: a-hook `PostToolUse` post `dkc-execute-task` invoca `dkc-validate SessionBlock`). Defensa en profundidad — 4 capas que se complementan.

**Decisiones criticas para tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | `gateDecision` cambia de `optional` a **conditional required** (zod `superRefine` cross-field) cuando ultima task es `S{N}.GATE` con status executed | Sin esto: validator pasa con drift. Con esto: cualquier edicion manual del ticket sin close-gate falla en validacion |
| 2 | `done-task` con target matching `^S\d+\.GATE$` retorna exit 1 con mensaje claro pointing a `close-gate <N> --decision` | Path defensivo en origen. El LLM NO PUEDE generar el drift via comandos |
| 3 | a-hook `PostToolUse` para `Bash` filtrando `dkc-execute-task` ejecuta auto-validate del ticket modificado | Captura drift entre flujos automatizados — si el LLM ignora el output del comando, el hook bloquea. **Opt-in** en settings.local.json del dev |
| 4 | NO se hace migracion retroactiva de tickets con drift latente | Tickets cerrados con drift quedan como estaban. Si emergen issues: fix puntual + ticket separado. Foco aqui es **prevencion**, no cleanup |

**Riesgos y mitigaciones**:

- **Tickets historicos con drift latente** (BLY-042 S2/S3/... potencialmente otros) que pasaron validator pre-fix → S2.T1 ejecuta `dkc-validate SessionBlock` sobre todos los tickets cerrados como verificacion empirica. Si emergen casos: agregar al Backlog del ticket
- **a-hook molesto si dispara mal** → marcarlo opt-in en `settings.local.json` (no `settings.json` shared). Dev controla.
- **El refine zod puede romper tests existentes de SessionBlock** → S1.T1 captura baseline + S1.T4 valida que tests pasan

**Que NO se hace**:
- NO migracion retroactiva de drifts pre-fix
- NO cambio del shape canonical de `Gate decision:` block (es solo enforcement)
- NO breakage del `close-gate` existente (solo extension via rechazo en `done-task`)

**Tamano**: 2 sessions, **3-4 SP**, ~2-3h efectivos. S2 ⚡ fuerte por close + auto-hook.

**Como vas a saber que funciona**:
- `dkc-execute-task <project> <ticket> done-task S1.GATE` → exit 1 con mensaje "use close-gate"
- `dkc-validate SessionBlock` sobre ticket con S{N}.GATE done + `Gate decision:` vacio → exit non-zero con error path `gateDecision`
- Validator sobre tickets historicos OK (segun S2.T1 — o emergen casos que van a Backlog)
- `request-execute.md` root tiene warning visible sobre `close-gate` vs `done-task`

## Purpose

Cerrar la brecha sistemica del DKC que permite cerrar sessions con `S{N}.GATE [x]` pero bloque `Gate decision:` vacio. Audiencia: el LLM ejecutor (que ahora no podra usar el comando wrong) + el dev que abre HC viewer (que vera estados consistentes).

## Requirements

### REQ-IMPROVE-01: `SessionBlockSchema` exige `gateDecision` si task GATE esta done

> **Que cambia**: el validator `dkc-validate SessionBlock` (y por extension `dkc-validate Ticket`) **falla** cuando una session tiene su task `S{N}.GATE` con status `executed` (checkbox `[x]`) pero el campo `gateDecision` es `undefined` o `gateDecision.decision` es null.
> **Por que**: hoy el shape inconsistente pasa silently (validator OK pero HC viewer renderiza `in_progress`). Sin este enforcement, no hay deteccion automatica del drift.

El sistema MUST extender `SessionBlockSchema` con un `superRefine` que verifica: si `tasksCompleted` incluye al menos una task con regex `^S\d+\.GATE$` y status `executed/done`, entonces `gateDecision` MUST estar presente con `decision` no-null.

<details><summary>Scenarios de validacion</summary>

#### Scenario: session con drift falla validacion
- **GIVEN** session synthetic con `tasksCompleted: [{ id: 'S1.T1', status: 'executed' }, { id: 'S1.GATE', status: 'executed' }]` y `gateDecision: undefined`
- **WHEN** `SessionBlockSchema.safeParse(session)`
- **THEN** `result.success === false`, error en path `gateDecision` con mensaje claro

#### Scenario: session sin drift pasa
- **GIVEN** session con S1.GATE executed + `gateDecision: { decision: 'continue' }`
- **WHEN** safeParse
- **THEN** `result.success === true`

#### Scenario: session sin task GATE (caso valido)
- **GIVEN** session con solo `S1.T1` executed, sin `S1.GATE` aun
- **WHEN** safeParse
- **THEN** `result.success === true` (gate todavia no cerrado — gateDecision puede faltar)

</details>

### REQ-IMPROVE-02: `dkc-execute-task done-task` rechaza target `S{N}.GATE`

> **Que cambia**: el comando bash `dkc-execute-task <project> <ticket> done-task <task-id>` falla con **exit 1** cuando `<task-id>` matchea `^S\d+\.GATE$`. Mensaje de error pointing a `close-gate <N> --decision <continue|iterate|escalate|standby>`.
> **Por que**: sin esto, el LLM (yo) volveria a usar el comando wrong porque `done-task` aplica a "cualquier task" segun el mental model. El error inline en origen lo educa.

El sistema MUST detectar el patron `^S\d+\.GATE$` antes de modificar el ticket markdown y retornar exit 1 con mensaje:

```text
ERROR: 'done-task' no aplica a tasks GATE (S<N>.GATE).
       Para cerrar gate de session: usar 'close-gate <N> --decision <continue|iterate|escalate|standby>'.
       Ver prompts/steps/request-execute/session-gate.md para el flujo canonical.
```

<details><summary>Scenarios de validacion</summary>

#### Scenario: rechazo S1.GATE
- **GIVEN** ticket con stub S1
- **WHEN** `dkc-execute-task <project> <ticket> done-task S1.GATE`
- **THEN** exit 1, stderr contiene "use 'close-gate'", ticket markdown NO modificado

#### Scenario: done-task normal pasa (T1, T2...)
- **GIVEN** ticket con S1.T1 in_progress
- **WHEN** `dkc-execute-task <project> <ticket> done-task S1.T1 --evidence "..."`
- **THEN** exit 0, ticket markdown actualizado con `[x] S1.T1`

</details>

### REQ-IMPROVE-03: Documentar `close-gate` en root del step

> **Que cambia**: `prompts/steps/request-execute.md` (root index post HOR-059) tiene warning visible al inicio: "GATE tasks → SIEMPRE usar `close-gate`, NUNCA `done-task`".
> **Por que**: el sub-archivo `session-gate.md` es lazy-loaded. Si el LLM no lo carga, hoy no hay senal en el root. Un warning en el index reduce dependencia del lazy-load.

El sistema MUST agregar en `prompts/steps/request-execute.md` (despues del header de GATES, antes del indice de fases) un callout warning con el comando correcto y referencia al sub-archivo.

### REQ-IMPROVE-04: a-hook `PostToolUse` auto-valida tras `dkc-execute-task`

> **Que cambia**: cuando el LLM invoca `dkc-execute-task ... done-task/close-gate/start-task` via Bash tool, el harness ejecuta inmediatamente `dkc-validate SessionBlock <ticket>.md`. Si retorna no-zero: el LLM ve el error en el output y debe corregir.
> **Por que**: red de seguridad final. Captura cualquier drift residual sin importar como entro (manual edit, race condition, comando bypass).

El sistema MUST proveer un snippet de hook canonical en `settings.local.json.example` (o equivalente) que el dev puede activar en su settings local. **Opt-in**, no obligatorio.

### REQ-PRESERVE-01: Tests existentes de SessionBlock pasan

> **Que cambia**: nada para tests del schema baseline. La extension `superRefine` (REQ-IMPROVE-01) es additive — solo agrega validacion cross-field, no cambia los validators de campos individuales.
> **Por que**: el spec NO debe romper la suite de tests existente.

El sistema MUST mantener `npm test` de `commands/lib` pasando con la misma cantidad de tests del baseline.

## Tasks

### Session 1 — Refine validator + bash rechazo + tests [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Baseline regression: `cd commands/lib && npm test` (capturar count) | REQ-PRESERVE-01 | researcher | — | ticket markdown | baseline doc | — | DET-7, DET-13 | pending | 1 |
| S1.T2 | Refine zod `SessionBlockSchema` con `superRefine` cross-field gate-done ↔ gateDecision required | REQ-IMPROVE-01 | developer | S1.T1 | `commands/lib/schemas/session-block.ts` | typecheck + tests pass | git revert | DET-1, DET-5 | pending | 1 |
| S1.T3 | Extender bash `dkc-execute-task done-task`: detectar `^S\d+\.GATE$` y retornar exit 1 con mensaje claro | REQ-IMPROVE-02 | developer | S1.T2 | `commands/dkc-execute-task` (subcommand) | bash test manual + smoke | git revert | DET-5, DET-8 | pending | 1 |
| S1.T4 | Tests unit: scenarios REQ-IMPROVE-01 (3) + REQ-IMPROVE-02 (2) + REQ-PRESERVE-01 (baseline igual) | REQ-IMPROVE-01, REQ-IMPROVE-02, REQ-PRESERVE-01 | developer | S1.T3 | `commands/lib/__tests__/session-block.test.ts` o equivalente | vitest run + 5+ tests nuevos pass | git revert | DET-7 | pending | 1 |
| **S1.GATE** | Gate Session 1 — T2 auto, DET-23 light, decision continue | — | reviewer | S1.T4 | ticket | gate persistido + close-gate canonical | — | DET-20, DET-23 | pending | 1 |

### Session 2 — Docs + a-hook + regression + close [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Verificar empiricamente: `dkc-validate SessionBlock` strict sobre TODOS los tickets cerrados (bayley + horadric + up1). Documentar casos con drift latente como Backlog del ticket | REQ-IMPROVE-01 | researcher | S1.GATE | reporte inline en `## Backlog` | reporte completo en ticket markdown | — | DET-4, DET-13 | pending | 2 |
| S2.T2 | Agregar warning callout en `prompts/steps/request-execute.md` root sobre `close-gate` vs `done-task` | REQ-IMPROVE-03 | developer | S2.T1 | `prompts/steps/request-execute.md` | grep verifica callout visible | git revert | DET-13 | pending | 2 |
| S2.T3 | Crear snippet a-hook `PostToolUse` para Bash + `dkc-execute-task` en docs/example. Opt-in. | REQ-IMPROVE-04 | developer | S2.T2 | docs ej. `docs/hooks-example.md` o `settings.local.json.example` | snippet copy-pasteable | git revert | DET-5 | pending | 2 |
| S2.T4 | Regression suite full + close del ticket HOR-076 + commits DET-27 | REQ-PRESERVE-01 | scribe | S2.T3 | ticket + spec | suite verde + summary | — | DET-13, DET-27 | pending | 2 |
| **S2.GATE** | Gate ⚑ fuerte Session 2 — DET-23 standard + close del ticket + decision continue (cierra HOR-076) | — | reviewer | S2.T4 | ticket + spec | status closed + spec done | — | DET-13, DET-14, DET-20, DET-23, DET-27 | pending | 2 |

## Constraints

- **DET-19**: horadric sin `external` — branches/commits usan `HOR-076` interno
- **DET-20**: 2 sessions con gate. S2 ⚡ fuerte
- **DET-23**: quality review per gate
- **DET-27**: commits granulares
- **No breaking change**: cambios additive — `gateDecision` sigue tipado optional al nivel field; el refine se activa solo when gate-done. `close-gate` NO se modifica

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Zod (ya usado) | internal | Usar `superRefine` para cross-field validation | bajo |
| Bash + grep | internal | Detectar regex `^S\d+\.GATE$` en bash | bajo |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Tests existentes de SessionBlock fallan tras refine | low | medium | S1.T1 captura baseline. S1.T4 compara delta. Si fallan: ajustar refine para no romper casos validos pre-existentes |
| Tickets historicos con drift latente que no fueron BLY-043 | medium | low | S2.T1 explicito hace audit + documenta en Backlog. NO migrar retroactivo (fuera de scope) |
| Dev no activa el a-hook D | medium | low | D es opt-in. A+B+C ya proveen 80% de coverage. D es plus |

## Open questions

Resueltas (sin gaps al cierre del intake):
- ~~"¿Como rechaza done-task el target GATE — error o auto-redirect a close-gate?"~~ → decision: error explicito (educacion inline > magic redirect)
- ~~"¿El refine zod usa superRefine o transform?"~~ → superRefine (cross-field, no transformation)

Deferidas a execute:
- **Q1**: ¿Mensaje exacto del rechazo bash (idioma, formato)? — decision en S1.T3 segun tests

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Defense-in-depth con 4 capas (A+B+C+D)

- **Contexto**: como prevenir el drift Gate decision tras BLY-043
- **Drivers**: robustez, costo, UX del LLM ejecutor
- **Opcion elegida**: A + B + C + D combinados
- **Alternativas descartadas**: solo B (path principal, no atrapa edits manuales); solo A (no orienta al LLM en origen); solo C (sin enforcement)
- **Consecuencias**: ~50 lineas codigo + config. Coverage cercano a O(0) para flujos automatizados
- **Session**: design

### DEC-LOCAL-02: NO migracion retroactiva

- **Contexto**: tickets historicos pueden tener drift latente
- **Drivers**: focus del ticket (prevencion), scope creep
- **Opcion elegida**: fix solo previene casos nuevos. Casos viejos quedan tal cual
- **Alternativas descartadas**: script de migracion (alto riesgo de tocar tickets cerrados)
- **Consecuencias**: S2.T1 audita y documenta como Backlog. Si emerge dolor real: ticket separado
- **Session**: design

## Acceptance checkpoints

- [ ] **Funcional**: scenarios REQ-IMPROVE-01..04 pasan
- [ ] **Tests**: 5+ tests nuevos cubriendo el refine + bash + regression baseline
- [ ] **Integration**: tickets BLY-042/BLY-043 (post-fix) validan OK con strict
- [ ] **Docs**: warning callout visible en `request-execute.md` root + snippet a-hook en docs

## Archiving

Spec activo durante execute. Al cerrar HOR-076: `status: done`. Si emerge necesidad de migracion retroactiva (HOR-077+): ticket separado.
