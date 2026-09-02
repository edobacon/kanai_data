---
id: SPEC-workflow-scaffold-lint-120
project: horadric
ticket: HOR-120
status: done
---

# Pre-flight lint del scaffold de tickets

# Pre-flight lint del scaffold de tickets

## Executive summary — lo que estas aprobando

**Que se quiere**: un comando que atrape los 3 gotchas sintacticos del scaffold de tickets UPFRONT (al crear el ticket), en vez de que fallen mid-flow con mensajes cripticos (sufridos en vivo HOR-115/116/117): (1) listas de frontmatter a ras → validator devuelve `null`; (2) Plan de sessions con `#` entero pelado → `init-ticket` no la encuentra; (3) `**Tasks completadas:**` colon mal puesto → SessionBlock array vacio.

**Forma** (DET-32): `dkc-lint-scaffold <project> <ticket> [--fix]` (bash, patron de `dkc-fix-date-shape`): detecta por default con mensaje accionable (linea + fix exacto); `--fix` aplica las 3 normalizaciones (deterministas, acotadas a patrones exactos). Wireado como pre-flight en el gate de `request-intake` (tras scaffold, antes de init-ticket). Complementa dkc-validate (no lo reemplaza).

**Que NO se hace**: no duplica la validacion completa; no toca campos fuera de los 3 patrones; `--fix` es opt-in (default detect-only para no editar YAML sorpresivamente).

**Tamano**: 1 session T2. Comando bash + self-test con fixture + 1 ref en request-intake.

**Como vas a saber que funciona**: el comando detecta los 3 gotchas en un fixture sucio, `--fix` los corrige (idempotente: 2da pasada = 0 cambios), un ticket limpio pasa sin findings; self-test verde; ref presente en request-intake.

---

## Purpose

Eliminar la friccion recurrente de los 3 gotchas sintacticos del scaffold de tickets DKC, centralizando su deteccion (y fix opcional) en un comando pre-flight corrido al crear el ticket. Convierte 3 fallos mid-flow con mensajes opacos (validator zod `null`, init-ticket "no encuentra tabla", SessionBlock array vacio) en 1 chequeo upfront con mensaje accionable. Reusa el patron de fix idempotente (`dkc-fix-date-shape`/`dkc-fix-d1`).

## Requirements

### REQ-IMPLEMENT-01: Comando `dkc-lint-scaffold` (detect + --fix + self-test)

> **Que cambia**: aparece `commands/dkc-lint-scaffold <project> <ticket-id> [--fix]` que chequea los 3 gotchas.
> **Por que**: punto unico pre-flight; hoy los chequeos estan dispersos y disparan tarde.

El sistema MUST crear `commands/dkc-lint-scaffold` (bash) que, dado un ticket, detecte:
1. **Frontmatter lists flush**: items `^- ` directamente bajo `^(tags|rules|execute_scope):$` (col 0, sin indentar) → reportar "linea N: indentar item 2 espacios (el validator Ticket devuelve null si no)".
2. **Plan de sessions bare-int**: filas de la tabla bajo `### Plan de sessions` cuya 1ra celda sea entero pelado (`| 1 |`) en vez de `| S1 |` → reportar "usar S{N}".
3. **Tasks completadas colon**: header `**Tasks completadas:**` (colon dentro del bold) → reportar "usar `**Tasks completadas**:`".

Default = detect-only (exit 1 si hay findings, exit 0 si limpio, con reporte accionable: archivo:linea + fix). Con `--fix`: aplicar las 3 normalizaciones (acotadas a los patrones exactos), idempotente (2da pasada = 0 cambios). Incluir `--self-test`: corre contra un fixture inline (o tmp) con los 3 gotchas → detecta 3, `--fix` los corrige, re-detect = 0; exit 1 on fail.

**Actor**: system · **Layers**: config (comando bash)

#### Acceptance
**Verificable**: `dkc-lint-scaffold horadric HOR-120` exit 0 (ticket limpio, 0 findings); contra un fixture sucio detecta los 3; `--fix` los corrige y re-detect=0; `--self-test` exit 0.

### REQ-IMPLEMENT-02: Ref pre-flight en el gate de request-intake

> **Que cambia**: el gate "verificar ticket completo" de `request-intake` referencia correr `dkc-lint-scaffold --fix` tras scaffoldear, antes de `intake-explore`/`init-ticket`.
> **Por que**: es el momento donde los gotchas se introducen; atajarlos ahi evita los stumbles posteriores.

El sistema MUST agregar en `prompts/steps/request-intake.md` (seccion 10, ejecucion del gate, o Auto-reindex post-step) una referencia: "correr `./commands/dkc-lint-scaffold {project} {TICKET-id} --fix` tras producir el ticket para normalizar los 3 gotchas sintacticos antes de avanzar".

**Actor**: system · **Layers**: docs (prompts)

#### Acceptance
**Verificable**: `grep "dkc-lint-scaffold" prompts/steps/request-intake.md` matchea.

### REQ-PRESERVE-01: Aditivo — sin regresion

> **Que cambia**: nada existente — comando nuevo, ref aditiva.
> **Por que**: DET-7.

El sistema MUST: no modificar dkc-validate ni los parsers existentes; el `--fix` solo toca los 3 patrones (no otros campos); un ticket ya canonico no cambia con `--fix` (idempotencia).

#### Acceptance
**Verificable**: `--fix` sobre HOR-120 (canonico) = 0 cambios (git diff vacio); dkc-validate Ticket HOR-120 sigue valid:true.

## Tasks

### Session 1 — Pre-flight lint del scaffold [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Comando `dkc-lint-scaffold` bash: detect los 3 gotchas + `--fix` idempotente + `--self-test` con fixture | REQ-IMPLEMENT-01 | developer | — | commands/dkc-lint-scaffold | self-test verde; detect 3 en fixture; --fix idempotente | rm comando | DET-32, RULE-005, RULE-002 | done | 1 |
| S1.T2 | Ref pre-flight en el gate de request-intake (correr lint --fix tras scaffold) | REQ-IMPLEMENT-02 | developer | S1.T1 | prompts/steps/request-intake.md | grep dkc-lint-scaffold | git revert | DET-7 | done | 1 |
| **S1.GATE** | **Gate T2** — dual-judge tiered (HOR-116) sobre el comando + self-report (DET-33) + telemetria propia + commits DET-27 + decidir | — | reviewer | S1.T1, S1.T2 | ticket | self-test verde + ref presente + idempotencia + dual-judge APPROVED | (no aplica) | DET-23, DET-33, DET-35 | done | 1 |

## Constraints

- **DET-32**: reusa el patron de fix idempotente (dkc-fix-date-shape); comando minimo, solo los 3 gotchas.
- **Acotamiento del --fix**: solo patrones exactos (items bajo tags/rules/execute_scope; fila Plan de sessions; header literal). Default detect-only.
- **No reemplazar dkc-validate**: complementa; cubre el subset de scaffold-syntax.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `--fix` corrompe YAML/markdown | low-medium | ticket roto | Patrones exactos + idempotencia testeada + default detect-only + el ticket queda bajo git (revert) |
| Falsos positivos (flush legitimo en otro campo) | low | ruido | Scope a tags/rules/execute_scope (no depends_on ni otros); ancla al nombre del campo |
| Duplica dkc-validate | low | mantenimiento | Cubre SOLO los 3 gotchas de scaffold, documentado como complemento |

## Open questions

- [ ] Ninguna — alcance cerrado; super autopilot.

## Decisions

### DEC-LOCAL-01: Detect-only por default, `--fix` opt-in
- **Contexto**: el `--fix` edita frontmatter/markdown por regex
- **Opcion elegida**: default detect (reporte accionable, exit 1); `--fix` opt-in aplica las normalizaciones
- **Alternativa**: auto-fix siempre (descartada — editar YAML sin pedir es sorpresivo; el dev/orquestador decide)
- **Session**: design (S0)

### DEC-LOCAL-02: Comando nuevo acotado (no extender dkc-validate)
- **Contexto**: dkc-validate es zod, no tiene --fix; los gotchas son sintacticos pre-validacion
- **Opcion elegida**: comando bash standalone (patron dkc-fix-date-shape), cubre los 3 gotchas
- **Alternativa**: agregar --fix a dkc-validate (descartada — mezcla validacion zod con normalizacion textual; mas invasivo)
- **Session**: design (S0)

## Acceptance checkpoints

- [x] **Funcional**: detecta los 3 en fixture sucio; --fix los corrige; ticket limpio pasa
- [x] **Idempotencia**: 2da pasada de --fix = 0 cambios
- [x] **Pre-flight**: ref en request-intake
- [x] **No-regresion**: --fix sobre HOR-120 canonico = 0 cambios; dkc-validate sigue valid
- [x] **Dogfood**: el S1.GATE corre dual-judge tiered + captura su telemetria
