---
id: SPEC-workflow-verify-worker-self-report
project: horadric
ticket: HOR-112
status: done
---

# DET-33 — Verificacion del self-report del worker antes de declarar exito

# DET-33 — Verificacion del self-report del worker antes de declarar exito

## Executive summary — lo que estas aprobando

**Que se quiere**: hoy DKC confia en lo que un sub-agente (developer/tester/reviewer) *reporta* — "archivo escrito", "tests verdes", "build PASS", "URL/ID listo" — y eso causo fallos reales: un build PASS que no reproducia en el entorno real, un reviewer aislado que dejo reverts staged contaminando el working tree, y un TC cerrado por override sobre un runtime nunca ejecutado. DET-33 codifica como contrato del workflow lo que gentle-ai (hermes-ephemeral-delegation) tiene como regla dura: *"tratar el output del worker como self-report: verificar archivos, pass/fail de tests, URLs e IDs de forma INDEPENDIENTE antes de declarar exito"*. Se materializa en los puntos donde DKC recibe un handoff y declara exito: Gate D de `task-loop.md` y cierre de gate de `session-gate.md` (incluyendo `git status` anti-contaminacion tras el reviewer aislado).

**Decisiones criticas que necesitan tu OK** (resueltas en super autopilot — racional abajo):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | DET nueva (DET-33) que REFUERZA DET-9/10/13/30, no un bullet en DET-9 | DET-9 es declarativa-conversacional (capas 3-5 opcionales); DET-33 materializa 4 de 5 capas (regla+step-ref+validator+a-hook+entry T2) → bite verificable y observabilidad de primera clase en HC. Mismo patron que DET-31/DET-32 |
| 2 | Enforcement en 2 puntos: Gate D (handoff developer/tester) + cierre de gate (handoff reviewer aislado) | Son los momentos exactos donde DKC "declara exito" sobre un self-report. El `git status` del submodulo de codigo cubre el caso de contaminacion del reviewer aislado |
| 3 | WARN-first calibrable + entry observable `self-report-verification` (reusa `dkc-record-decision`) | Adopcion sin friccion (patron DET-31/32); el veredicto registrado fuerza la consideracion explicita sin bloquear de entrada. Graduable a bloqueante en T3 |
| 4 | Aplica en CUALQUIER modo (no solo autopilot) | El sesgo de confianza en el self-report existe siempre; DET-30·REQ-10 (reviewer aislado) es autopilot-scoped, DET-33 generaliza la verificacion del resultado a todos los modos |

**Riesgos principales y como los mitigamos**:

- **Duplicar DET-13 (cierre con evidencia) o DET-30·REQ-10 (reviewer aislado)** → DET-33 se ubica en serie y los referencia: DET-13 es el cierre del *ticket*; DET-33 es la verificacion en *cada handoff de task/gate*. DET-30·REQ-10 garantiza *independencia del reviewer*; DET-33 verifica *el resultado material* (archivos/tests/build/git status).
- **Validator de enum cerrado rechaza el step nuevo** (leccion DET-32 L4) → REQ-02 agrega `self-report-verification` al enum `InteractiveStepId` + `DecisionChoice` con self-test.
- **Verbosidad / friccion en tasks triviales** → proporcionalidad por tier: la verificacion es liviana en T0/T1 triviales (solo lo que el handoff claimo), exhaustiva en T2/T3.

**Que NO se hace en este ticket**:

- No se construye un comando `dkc-verify-handoff` nuevo: la verificacion es comportamental (Read/Bash/git status) + reusa `dkc-record-decision` (capa 3 = N/A, como DET-32).
- No se aplica DET-33 retroactivo a tickets/specs cerrados.
- No se endurece a bloqueante (queda WARN-first; graduacion a T3 documentada).
- No incluye el dual-judge (HOR-114) ni la inyeccion de KB a sub-agentes (HOR-113) — son tickets hermanos del plan DEC-003.

**Tamano estimado**: 1 session (~2-3h efectivas), T2. S1.T1 (regla+catalogo) es la mas delicada por el wording; el resto es mecanico (step-refs, schema, regen).

**Como vas a saber que funciona**:

- `tsx schemas/decisions.ts` verde incluyendo los casos nuevos de `self-report-verification`.
- `dkc-record-decision --step self-report-verification --choice verified` escribe entry valida.
- `dkc-export-rules --global` emite el bloque con 33 bullets `- **DET-` incluido DET-33.
- `grep "DET-33"` matchea en deterministic-rules.md (capa 1), task-loop.md + session-gate.md (capa 2) y sus `dets:` frontmatter.

---

## Purpose

Codificar DET-33 (Verificacion del self-report del worker) como contrato de la fase **execute**: todo handoff de un sub-agente que claime archivo / test pass-fail / build / URL / ID se verifica de forma INDEPENDIENTE antes de declarar exito (marcar task `done` o cerrar `S{N}.GATE`), incluido el `git status` del submodulo de codigo tras un reviewer aislado. Refuerza DET-9/DET-10/DET-13/DET-30 y se materializa en las 5 capas del patron de enforcement (HOR-066), reusando la infra de `decisions_log`.

## Requirements

### REQ-IMPROVE-01: DET-33 declarada en capa 1 (catalogo condensado + texto integro)

> **Que cambia**: aparece DET-33 — `dkc_get_rules` y el bloque global de CLAUDE.md la listan, y su detalle integro vive en `deterministic-rules.md`.
> **Por que**: la fuente unica `DETS_CONDENSED` (HOR-088) y el texto integro son las dos caras del contrato; ambas deben existir o la DET es invisible/incoherente.

El sistema MUST registrar DET-33 con `name: "Verificacion del self-report"`, `phases: ["execute", "review", "close"]` y `rule` condensado (<600 chars) en `DETS_CONDENSED`, y una seccion integra `### DET-33` en `deterministic-rules.md` (Que / Por que / Que se verifica / Donde aplica / Fuerza / Interaccion con DETs / Capas de enforcement / Aplicacion temporal).

**Actor**: system · **Layers**: config (python catalog), docs (prompts)

#### Acceptance
**Verificable**: `python -c "...; assert 33 in DETS_CONDENSED and DETS_CONDENSED[33]['name']"`; `grep "### DET-33" prompts/deterministic-rules.md` matchea; `pytest server/tests/test_dets_catalog.py` verde (deriva el conteo, 33 contiguas).

### REQ-IMPROVE-02: Capa 4 (validator) — step `self-report-verification` en el schema de decisiones

> **Que cambia**: `dkc-record-decision --step self-report-verification` deja de ser rechazado por el enum cerrado y valida su choice.
> **Por que**: sin la capa 4, la DET queda advisory-only y el LLM puede cumplirla lexicamente sin que muerda (leccion DET-32 L4: el enum es cerrado).

El sistema MUST agregar `self-report-verification` a `InteractiveStepId` y a `DecisionChoice` en `commands/lib/schemas/decisions.ts`, con choices `verified | verification-failed | not-applicable`, donde `verification-failed` y `not-applicable` exigen `reason` (refinement), y self-tests que cubran: choice valido, reason obligatoria en los 2 casos, y rechazo cross-step.

**Actor**: system · **Layers**: config (schema TS)

#### Acceptance
**Verificable**: `tsx schemas/decisions.ts` verde con los casos nuevos; `dkc-record-decision --step self-report-verification --choice verified` exit 0; `--choice verification-failed` sin reason → exit 1.

### REQ-IMPROVE-03: Capas 2 y 5 — step-refs + a-hook en task-loop y session-gate

> **Que cambia**: el contrato se ejecuta en los puntos reales — Gate D verifica los claims del developer/tester antes de `done`; el cierre de gate verifica el `git status` tras el reviewer aislado.
> **Por que**: una DET declarada pero no referenciada desde los steps queda inerte (caso DET-21/22 sin capa 3 en HOR-014).

El sistema MUST: (a) agregar un sub-paso de verificacion de self-report en Gate D de `task-loop.md` (verificar archivos claimados existen, re-correr/inspeccionar pass-fail del tester en vez de confiar en el JSON, build PASS en el entorno real); (b) agregar en `session-gate.md` la verificacion `git status` del submodulo de codigo tras el reviewer aislado (anti-contaminacion) + verificacion de la evidencia claimada; (c) sumar `33` al frontmatter `dets:` de ambos sub-archivos; (d) dejar el a-hook directive (`<!-- enforcement: a-hook ... -->`) que registra el `self-report-verification` en `decisions_log`.

**Actor**: system · **Layers**: docs (prompts) + a-hook

<details><summary>Scenarios de validacion</summary>

#### Scenario: tester reporta all_pass falso
- **GIVEN** un Gate D donde el tester retorno `all_pass`
- **WHEN** se aplica DET-33 y el orquestador re-corre (o inspecciona el output real de) la suite
- **THEN** si el resultado real no reproduce el self-report, NO se marca `done`; se registra entry `self-report-verification: verification-failed` con reason

#### Scenario: reviewer aislado deja el working tree sucio
- **GIVEN** un cierre de gate tras invocar el reviewer aislado (DET-30·REQ-10)
- **WHEN** se aplica DET-33 y se corre `git status` del submodulo de codigo
- **THEN** si hay reverts/staged inesperados, se limpia y se reporta antes de declarar exito; entry `self-report-verification` registrada

</details>

#### Acceptance
**Verificable**: `grep -n "DET-33\|self-report" prompts/steps/request-execute/task-loop.md prompts/steps/request-execute/session-gate.md` matchea; `33` presente en el `dets:` de ambos; a-hook directive presente en ambos.

### REQ-IMPROVE-04: Bloque global regenerado desde la fuente unica

> **Que cambia**: el bloque DKC de `~/.claude/CLAUDE.md` pasa a listar 33 reglas con DET-33 incluida.
> **Por que**: el bloque se genera desde `DETS_CONDENSED`; sin regenerar, DET-33 existe en el catalogo pero no se ve en el contexto global.

El sistema MUST regenerar el bloque global via `dkc-export-rules --global` (no editar el bloque a mano — DET-16), emitiendo 33 bullets condensados.

**Actor**: system · **Layers**: config

#### Acceptance
**Verificable**: `dkc-export-rules --global --dry-run` produce bloque con `count("- **DET-") == 33` y `< 20000` chars.

### REQ-PRESERVE-01: Sin regresion en el schema de decisiones ni en los validators DKC

> **Que cambia**: nada — los 16 steps previos de `decisions_log` y los validators existentes siguen funcionando igual.
> **Por que**: el cambio extiende un enum cerrado y edita prompts; no debe romper steps ni gates existentes (DET-7 regression).

El sistema MUST mantener verdes: los 23 self-tests previos de `decisions.ts`, `pytest server/tests/test_dets_catalog.py`, y los validators `dkc-validate` / `dkc-verify-gate` usados en el gate de cierre de este mismo ticket.

**Actor**: system · **Layers**: config

#### Acceptance
**Verificable**: `tsx schemas/decisions.ts` reporta 23 previos + nuevos, todos pass; `pytest server/tests/test_dets_catalog.py` verde; gate de cierre de HOR-112 pasa G1/G4.

## Tasks

### Session 1 — DET-33 en 5 capas + wiring execute + regen global [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Capa 1: entry `33` a `DETS_CONDENSED` (name "Verificacion del self-report", phases ["execute","review","close"], rule <600 chars) + docstring "32"→"33"; seccion integra `### DET-33` antes de `## Meta-nota` en deterministic-rules.md + bump conteos "32→33" del header de checklist | REQ-IMPROVE-01 | developer | — | server/src/deckard_cain/dets_catalog.py, prompts/deterministic-rules.md | `python -c "...assert 33 in DETS_CONDENSED"` + `grep "### DET-33"` + `pytest test_dets_catalog.py` | git revert | DET-1, DET-2, DET-16, DET-24 | done | 1 |
| S1.T2 | Capa 4: `self-report-verification` en `InteractiveStepId` + `DecisionChoice` (verified/verification-failed/not-applicable) + reason refinement + self-tests (3-4 casos) | REQ-IMPROVE-02 | developer | S1.T1 | commands/lib/schemas/decisions.ts | `tsx schemas/decisions.ts` verde | git revert | DET-2, DET-7 | done | 1 |
| S1.T3 | Capas 2+5: sub-paso de verificacion en Gate D (task-loop.md) + verificacion git status post reviewer aislado (session-gate.md) + `33` en `dets:` de ambos + a-hook directive | REQ-IMPROVE-03 | developer | S1.T1 | prompts/steps/request-execute/task-loop.md, prompts/steps/request-execute/session-gate.md | grep DET-33/self-report en ambos + `33` en dets | git revert | DET-9, DET-10, DET-16 | done | 1 |
| S1.T4 | Capa global: regenerar `dkc-export-rules --global` (verificar 33 bullets) + verificar capa 5b (`dkc-record-decision --step self-report-verification`) | REQ-IMPROVE-04 | developer | S1.T1, S1.T2 | (CLAUDE.md global) | `dkc-export-rules --global --dry-run` (33 bullets) + comando de prueba exit 0 | re-run export desde catalogo previo | DET-16 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier T2)** — reviewer aislado (DET-30·REQ-10) + quality review DET-23 + verificacion self-report del propio gate (DET-33 dogfood) + commits DET-27 + decidir | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + self-tests verdes + export 33 + git status limpio post-review | (no aplica) | DET-20, DET-23, DET-33 | done | 1 |

### Task contract (resumen)

```
S1.T1: capa 1 regla+catalogo — files: dets_catalog.py, deterministic-rules.md — validation: import assert + grep + pytest — rollback: git revert — rules: [DET-1, DET-2, DET-16, DET-24]
S1.T2: capa 4 validator — files: decisions.ts — validation: tsx self-test — rollback: git revert — rules: [DET-2, DET-7]
S1.T3: capas 2+5 step-refs+a-hook — files: task-loop.md, session-gate.md — validation: grep DET-33 + dets — rollback: git revert — rules: [DET-9, DET-10, DET-16]
S1.T4: capa global regen — files: CLAUDE.md global — validation: export 33 bullets + comando de prueba — rollback: re-run export — rules: [DET-16]
```

## Constraints

- RULE-workflow-enforcement-pattern-009 (**must**): toda DET ≥30 se materializa en las 5 capas. DET-33: capa 3 = N/A (reusa `dkc-record-decision`), capas 1/2/4/5/5b presentes.
- HOR-088 (fuente unica): NO duplicar el condensado fuera de `DETS_CONDENSED`.
- DET-16 (no editar a mano el bloque global): regenerar con `dkc-export-rules --global`.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| DET-33 percibida como duplicado de DET-13 / DET-30·REQ-10 | medium | confusion normativa | El texto integro define la frontera: DET-13 = cierre del ticket; DET-30·REQ-10 = independencia del reviewer; DET-33 = verificacion material del resultado en cada handoff |
| Enum cerrado rechaza el step nuevo | low (conocido) | comando falla silencioso | REQ-IMPROVE-02 lo agrega con self-test (leccion DET-32 L4) |
| Verbosidad/friccion en tasks triviales | medium | ruido en T0/T1 | Proporcionalidad por tier explicita en el texto: liviano en T1 trivial, exhaustivo T2/T3 |

## Open questions

- [ ] Ninguna — alcance cerrado en el plan; super autopilot resuelve las decisiones con racional documentado.

## Decisions

### DEC-LOCAL-01: DET nueva (DET-33) que refuerza, en vez de extender DET-9 con un bullet
- **Contexto**: el request ofrecia "reforzar DET-9/DET-10 o anadir un DET nuevo"
- **Drivers**: DET-9 es declarativa-conversacional (capas 3-5 opcionales); el contrato amerita bite verificable (validator + a-hook + entry observable) y observabilidad de primera clase en HC
- **Cascada DET-32 (necessity-assessment)**: build — el contrato no existe hoy (no es duplicado de DET-9/10/13/30), no lo da plataforma, no se reduce a config; gana observabilidad como DET propia
- **Opcion elegida**: DET-33 que refuerza DET-9/10/13/30 (mismo patron que DET-31/DET-32)
- **Alternativas**: bullet en DET-9 (descartada — quedaria advisory-only sin capas de enforcement)
- **Consecuencias**: +1 DET en el catalogo (33); coherente con el patron establecido
- **Session**: design (S0)

### DEC-LOCAL-02: WARN-first + aplica en cualquier modo
- **Contexto**: como introducir el contrato sin friccion y sin limitarlo a autopilot
- **Drivers**: el sesgo de confiar en el self-report existe en todos los modos; adopcion sin friccion (patron DET-31)
- **Opcion elegida**: WARN-first (exige veredicto registrado, no bloquea el `verified` justificado; graduable a bloqueante en T3) + aplica en cualquier modo, con proporcionalidad por tier
- **Alternativas**: bloqueante de entrada (friccion) / solo-autopilot (deja el sesgo sin cubrir en conversacional) — descartadas
- **Session**: design (S0)

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-IMPROVE-01..04 pasan
- [x] **Tests**: `tsx schemas/decisions.ts` verde (23 previos + nuevos); `pytest server/tests/test_dets_catalog.py` verde (33 DETs)
- [x] **Rules**: RULE-workflow-enforcement-pattern-009 satisfecha (capas 1/2/4/5/5b; capa 3 N/A justificada)
- [x] **Integration**: `dkc-export-rules --global` emite 33 bullets; resto de la suite sin regresion
- [x] **Docs**: deterministic-rules.md, task-loop.md, session-gate.md coherentes, DET-33 sin duplicar DET-13/30
