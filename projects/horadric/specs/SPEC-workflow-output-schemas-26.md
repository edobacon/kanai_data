---
id: SPEC-workflow-output-schemas-26
project: horadric
ticket: HOR-026
status: done
---

# Output schemas tipados (zod) — contratos estructurales para SpecTask + SessionBlock

# Output schemas tipados (zod) — contratos estructurales para SpecTask + SessionBlock

## Executive summary — lo que estas aprobando

> *Lectura de 60s.*

### Que se quiere

Records DKC en markdown con frontmatter YAML — parseable pero **no fuertemente tipado**. HOR-022 sufrio 5 bug fixes mid-gate ATRIBUIBLES a falta de validacion. HOR-029 sufrio 3 incidentes mas de formato canonico que requirieron 3 round-trips del dev.

**Solucion**: schemas zod (TypeScript) que validan markdown post-escritura. Tool `dkc-validate` parsea record markdown → JSON → valida contra schema → reporta findings con paths claros.

**2 schemas en este ticket** (los que mas bugs generan):
- `SpecTaskSchema`: tabla canonical 11-column F8 (id, task, source_ref, agent, depends_on, files, validation, rollback, rules, status, session)
- `SessionBlockSchema`: labels canonicos + 4 checkboxes gate + tier + tasksCompleted + Quality review

**Otros records** (Rule, Decision, Bug, Learn): documentados como follow-up. Patron extendible.

### Decisiones criticas

| # | Decision | Por que |
|---|----------|---------|
| 1 | **TypeScript + zod** (no Python + pydantic) | Compatible con horadric-cube ecosystem (ya usa zod). Sin dependencias Python adicionales |
| 2 | **Validate DESPUES de escribir markdown** (no JSON intermedio) | Mas robusto: parse + check coverage. Markdown sigue siendo source of truth. Sin friccion en steps existentes (no requieren cambiar como escriben markdown) |
| 3 | **Bash wrapper + Node CLI** (no Python) | Coherente con HOR-023 (dkc-verify-gate es bash). Tool unico CLI invocable desde steps |
| 4 | **2 schemas (SpecTask + SessionBlock)** vs 4+ | Los 2 que mas bugs generan (7/8 incidentes historicos). Extender luego si emerge dolor |
| 5 | **NO migracion retroactiva** | Tickets pre-HOR-026 quedan validos como-estan. Aplica solo a tickets nuevos. Evita rewriting masivo |

### Riesgos

- **Falsos positivos** por records mas viejos con formato pre-canonical: filtrar por fecha de ticket (post-2026-05-16). Documentado.
- **Schema rigido bloquea innovacion**: si emerge necesidad de cambio en tabla F8, hay que actualizar schema. Mitigacion: schemas estan en `commands/lib/schemas/` versionables.
- **TS+zod requiere Node y `tsx`**: dependency adicional sobre setup. Mitigacion: instalar local en `commands/lib/` con `package.json` minimal. No pollute global.

### Que NO se hace

- NO migracion retroactiva (tickets pre-HOR-026 quedan validos)
- NO schemas para Rule, Decision, Bug, Learn — follow-up si emerge dolor
- NO generador markdown desde JSON (validate-only, markdown sigue siendo source of truth)
- NO breaking changes en como los steps escriben markdown
- NO integracion en HC viewer (follow-up opcional)

### Tamano

4 sessions: S1 POC+schemas, S2 tool+CLI, S3 integracion+dogfood, S4 close. SP: **5**. Tiempo: **~5-7h efectivas**.

### Como vas a saber que funciona

- `commands/dkc-validate SpecTask projects/horadric/specs/SPEC-workflow-gates-verifiable-23.md` retorna `{valid: true, ...}`
- `commands/dkc-validate SessionBlock projects/horadric/tickets/HOR-029.md --session 4` retorna `{valid: true, ...}`
- Tickets recientes (HOR-023, HOR-029) pasan validacion al primer intento (eat own dogfood)
- 3 steps integrados (request-execute, _design-shared, request-close) invocan el tool en gates relevantes

---

## Purpose

Cerrar la brecha entre "markdown human-readable" y "contract enforceable". Sin schemas, el LLM puede producir labels custom, columnas mal nombradas, status invalidos — y solo se descubre cuando un parser downstream (HC viewer) o el dev lo detectan. Schemas zod son guardrails estructurales que detectan estos casos al cierre de cada gate, no post-mortem.

Para el dev: cero round-trips por bugs de formato canonical. Para HC viewer: parsing predecible. Para HOR-031 (siguiente ticket): execute con contratos validados.

## Requirements

### REQ-IMPROVE-01 — Schema zod `SpecTaskSchema`

> **Que cambia**: archivo `commands/lib/schemas/spec-task.ts` define schema zod que valida la tabla canonical 11-column F8 de tasks del spec (id, task, source_ref, agent, depends_on, files, validation, rollback, rules, status, session).
> **Por que**: el bug #5 de HOR-022 (shape canonico spec) requirio migrar 13 specs retroactivamente. Schema explicito previene drift futuro.

El schema MUST:
- Definir cada campo con type + constraint:
  - `id`: regex `/^S\d+\.(T\d+|GATE)$/` (ej. `S1.T1`, `S2.GATE`)
  - `task`: string min length 1
  - `source_ref`: string o literal `—` (em-dash para tasks sin source explicito)
  - `agent`: enum `['researcher', 'architect', 'developer', 'reviewer', 'scribe', 'tester']`
  - `depends_on`: string (puede ser `—`)
  - `files`: string
  - `validation`: string (referencia a TCs o tipo de validacion)
  - `rollback`: string
  - `rules`: string (IDs de rules)
  - `status`: enum `['pending', 'in_progress', 'done', 'blocked']`
  - `session`: integer positive
- Exportar TypeScript type derivado: `type SpecTask = z.infer<typeof SpecTaskSchema>`

### REQ-IMPROVE-02 — Schema zod `SessionBlockSchema`

> **Que cambia**: archivo `commands/lib/schemas/session-block.ts` define schema zod que valida un bloque de session (header `### Session N`, objetivo, tasksCompleted con checkboxes, Quality review, Gate decision con 4 checkboxes canonicos).
> **Por que**: los 3 incidentes de HOR-029 (sessions stale, Gate decision STOP, checkboxes inline mal formados) son violations de SessionBlockSchema. Schema explicito los detecta automatico.

El schema MUST:
- `number`: integer >=0
- `objective`: string min length 1
- `tier`: enum `['T0', 'T1', 'T2', 'T3']` opcional (header puede tener `[tier: T2]`)
- `gateType`: enum `['auto', 'fuerte']` (fuerte parsea de `⚑ fuerte`)
- `tasksCompleted`: array de `{ id: string, completed: boolean, description: string }` — TODOS deben ser `completed: true` si session esta cerrada
- `qualityReview`: object opcional con dimensions (las 10 + result global)
- `gateDecision`: object con `{ decision: 'continue'|'iterate'|'escalate'|'standby', approvedBy: 'dev'|'autopilot'|null, note: string|null }`
- Exportar TypeScript type `type SessionBlock = z.infer<typeof SessionBlockSchema>`

### REQ-IMPROVE-03 — Tool `commands/dkc-validate` (bash wrapper + Node CLI)

> **Que cambia**: comando ejecutable `commands/dkc-validate {schema} {file} [--session N]` que parsea markdown → JSON → valida contra schema → reporta findings.
> **Por que**: sin tool invocable desde steps, los schemas son solo TypeScript inerte. CLI permite integracion con verifier (HOR-023 pattern).

El tool MUST:
- Aceptar `schema` ∈ `{SpecTask, SessionBlock, all}`
- Aceptar `file` (path al ticket o spec markdown)
- Aceptar `--session N` (filtrar a una session especifica)
- Aceptar `--strict` (default: lenient para tickets pre-2026-05-16; strict para post)
- Output JSON estructurado:
  ```json
  {
    "valid": true|false,
    "schema": "SpecTask",
    "file": "...",
    "records_validated": N,
    "errors": [{ "path": "S1.T2.agent", "message": "...", "expected": "...", "received": "..." }],
    "warnings": [...]
  }
  ```
- Exit codes:
  - `0`: valid
  - `1`: invalid (errors >0)
  - `2`: warnings only (no errors)
  - `3`: error tecnico (file no existe, schema invalido, etc.)

### REQ-IMPROVE-04 — Integracion en 3 steps

> **Que cambia**: 3 steps (`request-execute.md`, `_design-shared.md`, `request-close.md`) invocan `dkc-validate` en gates clave.
> **Por que**: sin invocacion explicita, el tool existe pero no se usa. Patron HOR-023 (verifier integrado en gates).

Steps a editar:
- `prompts/steps/_design-shared.md` GATE 3 (spec completo): `dkc-validate SpecTask {spec-file}` antes de declarar spec listo
- `prompts/steps/request-execute.md` gate de session: `dkc-validate SessionBlock {ticket} --session N` antes de marcar continue
- `prompts/steps/request-close.md` gate A2: `dkc-validate all {ticket}` y `dkc-validate all {spec}` antes de marcar closed

### REQ-IMPROVE-05 — Documentacion en `_style.md` Principio 9

> **Que cambia**: nueva seccion en `prompts/_style.md` documentando el patron de schemas + tool + integracion.
> **Por que**: sin docs, el patron es invisible. Principio 8 (HOR-023) y Principio 9 (HOR-026) son complementarios — gates verificables (estructurales) + schemas (semanticos).

Seccion incluye:
- Schemas disponibles (SpecTask, SessionBlock)
- Como invocar el tool con ejemplos
- Cuando usar validate vs verify (HOR-023)
- Antipatrones

### REQ-PRESERVE-01 — Markdown sigue siendo source of truth

> **Que cambia**: nada disruptivo. Los steps NO cambian como escriben markdown — el tool VALIDA post-escritura.
> **Por que**: cambiar como los steps generan markdown seria scope mayor. Validate-only es approach minimal.

Validacion: TC-08 verifica que records validos por el tool tambien siguen renderizables en HC viewer sin cambios.

### REQ-PRESERVE-02 — Tickets pre-HOR-026 quedan validos

> **Que cambia**: nada. Tool tiene flag `--strict` opt-in. Default lenient para tickets antiguos.
> **Por que**: migrar 30+ tickets historicos seria scope masivo sin valor (estan cerrados, no se editan). Solo aplica a tickets post-HOR-026.

Validacion: TC-09 verifica que ticket pre-HOR-026 (ej. HOR-005) NO falla con strict=false aunque tenga formato no canonical.

## Test cases

| # | Caso | REQ | Affects UI | Expected | Actual | Evidence | Status | Session | Cambios |
|---|------|-----|-----------|----------|--------|----------|--------|---------|---------|
| TC-01 | POC: zod + tsx instalados localmente en `commands/lib/`, schema basico carga sin error | REQ-IMPROVE-01 | no | `npx tsx commands/lib/schemas/spec-task.ts` exit 0 | `OK: true` desde inline test `npx tsx -e "..."`. npm install via package.json local con zod ^3.23 + tsx ^4.19 | npm install + tsx test | pass | S1.T1 | — |
| TC-02 | `SpecTaskSchema` valida task ejemplo correcto retorna `{valid: true}` | REQ-IMPROVE-01 | no | valid:true | Self-test inline: `Sample task valid: true` | tsx run | pass | S1.T2 | — |
| TC-03 | `SpecTaskSchema` rechaza task con id invalido (ej. `T1`) retorna error claro | REQ-IMPROVE-01 | no | valid:false, error con path `S1.T1.id` | `Invalid id rejected: true. Error path: id. Error message: id debe matchear S{N}.T{M} o S{N}.GATE` | tsx run | pass | S1.T2 | — |
| TC-04 | `SessionBlockSchema` valida session valida (sample inline; HOR-029 real diferido a S2 tras parser MD→JSON) | REQ-IMPROVE-02 | no | valid:true | `Sample session valid: true` con session sample con tasksCompleted + qualityReview + gateDecision | tsx run | pass-partial | S1.T3 | validacion HOR-029 real se hace en S2.T4 |
| TC-05 | `SessionBlockSchema` rechaza Gate decision con valor `STOP` (incidente HOR-029) | REQ-IMPROVE-02 | no | valid:false, error con expected enum | `Gate decision STOP rejected: true. Error path: gateDecision.decision. Expected: STOP → enum: continue\|iterate\|escalate\|standby` | tsx run | pass | S1.T3 | — |
| TC-06 | `commands/dkc-validate SpecTask SPEC-X.md` retorna JSON estructurado, exit 0 si valido | REQ-IMPROVE-03 | no | JSON output + exit 0 | `valid=True, records=12, errors=0, warnings=0` sobre SPEC-workflow-gates-verifiable-23.md (12 SpecTasks de HOR-023) | bash test | pass | S2.T4 | — |
| TC-07 | `commands/dkc-validate SessionBlock HOR-029.md` retorna valid pero con 3 warnings de label no canonical | REQ-IMPROVE-03 | no | valid:true con warnings detallados | `valid=True, records=6, errors=0, warnings=3` — detecta `**Tasks**:` (no canonical) en Sessions 2, 3, 5 de HOR-029. Memory antipatron #6 confirmado retroactivo | bash test | pass | S2.T4 | descubrimiento: HOR-029 tiene 3 sessions con label no canonical |
| TC-08 | Records validados por dkc-validate siguen renderizables por HC viewer sin cambios | REQ-PRESERVE-01 | no | Sample manual check via HC | Validacion programatica unicamente (sin instancia HC corriendo en este momento). Schema NO modifica markdown, solo lo lee — markdown sigue identico → HC sin cambios | structural check | pass-partial | S3 | render real diferido a futuro test |
| TC-09 | Ticket pre-HOR-026 con label no canonical retorna warnings sin errors | REQ-PRESERVE-02 | no | exit 0 o 2 con warnings (no errors) | HOR-029 (pre-HOR-026): `valid=True, errors=0, warnings=3` — 3 sessions con `**Tasks**:` no canonical detectadas como warnings (no errors). Exit 2 | bash test | pass | S3.T5 | — |
| TC-10 | Dogfood: `dkc-validate` retorna valid sobre HOR-023 (cerrado pre-HOR-026 pero con formato canonical) | REQ-IMPROVE-04 | no | valid:true | HOR-023 ticket: 3 sessions valid, 0 errors, 0 warnings. HOR-023 spec: 12 SpecTasks valid, 0 errors. HOR-026 ticket: 3 sessions valid. HOR-026 spec: 21 SpecTasks valid | bash test | pass | S3.T4 | — |
| TC-11 | Integracion: 3 steps con invocaciones presentes. Grep retorna >=3 matches | REQ-IMPROVE-04 | no | Grep >=3 matches | 6 matches en 3 archivos (_design-shared: 1, request-execute: 2, request-close: 3) | grep | pass | S3.T1-T3 | — |

## Tasks

### Session 1 — POC + schemas (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S1.T1 | Setup `commands/lib/` con `package.json` minimal + `tsx` + `zod` instalados localmente. Verify import OK | developer | balanced | commands/lib/package.json, commands/lib/.gitignore | TC-01 | `npx tsx -e "import { z } from 'zod'; console.log('OK')"` exit 0 | rm commands/lib/ | pending | 1 | — |
| S1.T2 | Implementar `commands/lib/schemas/spec-task.ts` con SpecTaskSchema (11 fields). Export type SpecTask | developer | balanced | commands/lib/schemas/spec-task.ts | TC-02, TC-03 | Schema carga sin error, valida task ejemplo, rechaza invalido | git revert | pending | 1 | — |
| S1.T3 | Implementar `commands/lib/schemas/session-block.ts` con SessionBlockSchema (header + tasks + quality review + gate decision) | developer | balanced | commands/lib/schemas/session-block.ts | TC-04, TC-05 | Schema carga, valida session HOR-029 (al menos S0/S5), rechaza Gate decision: STOP | git revert | pending | 1 | — |
| S1.T4 | Baseline validation: hand-parsear 2 records reales (HOR-023 spec, HOR-029 ticket) y validar con schemas. Documentar findings | reviewer | balanced | — (validacion) | TC-02, TC-04 | Records reales pasan o fallan con findings esclarecedores | — | pending | 1 | — |
| S1.GATE | Quality review (DET-23 tier light) + verify HOR-023 G7 (teach skip OK) + commit DET-27 `improve(dkc): zod schemas SpecTask + SessionBlock (HOR-026 S1)` | reviewer | balanced | commands/lib/ | TC-01..05 | Gate decision + commit | git revert commit | pending | 1 | — |

### Session 2 — Tool dkc-validate + CLI (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S2.T1 | Implementar markdown parser para extraer tabla SpecTask + bloques Session del markdown (bash + awk + jq) | developer | balanced | commands/lib/parsers/markdown-to-json.sh (o .ts) | — | Parser produce JSON correcto desde tickets de prueba | git revert | pending | 2 | — |
| S2.T2 | Implementar `commands/lib/validate.ts` que recibe JSON + schema name, retorna result JSON estructurado | developer | balanced | commands/lib/validate.ts | TC-06, TC-07 | Tool acepta args, valida, retorna JSON con exit codes | git revert | pending | 2 | — |
| S2.T3 | Wrapper bash `commands/dkc-validate` invoca Node + zod. Args parsing + help | developer | balanced | commands/dkc-validate | TC-06, TC-07 | `commands/dkc-validate --help` muestra usage, comandos funcionan | git revert | pending | 2 | — |
| S2.T4 | TCs verificacion: invocar tool sobre tickets reales (HOR-029, HOR-023) | reviewer | balanced | — | TC-06, TC-07 | TCs pass con outputs reales | — | pending | 2 | — |
| S2.GATE | Quality review (DET-23 tier standard) + dkc-verify-gate G1 + commit DET-27 `improve(dkc): tool dkc-validate + CLI (HOR-026 S2)` | reviewer | balanced | commands/ | TC-06, TC-07 | Gate decision + commit | git revert | pending | 2 | — |

### Session 3 — Integracion + dogfood + docs (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S3.T1 | Editar `prompts/steps/_design-shared.md` GATE 3: invocar `dkc-validate SpecTask {spec}` | developer | balanced | prompts/steps/_design-shared.md | TC-11 | Grep retorna 1 match | git revert | pending | 3 | — |
| S3.T2 | Editar `prompts/steps/request-execute.md` gate de session: invocar `dkc-validate SessionBlock {ticket} --session N` | developer | balanced | prompts/steps/request-execute.md | TC-11 | Grep retorna 1 match | git revert | pending | 3 | — |
| S3.T3 | Editar `prompts/steps/request-close.md` gate A2: invocar `dkc-validate all {ticket}` + `dkc-validate all {spec}` | developer | balanced | prompts/steps/request-close.md | TC-11 | Grep retorna 2 matches | git revert | pending | 3 | — |
| S3.T4 | Dogfood: `dkc-validate all HOR-023.md` debe retornar valid (HOR-023 cumple sus propios schemas) | reviewer | balanced | — | TC-10 | TC-10 pass | — | pending | 3 | — |
| S3.T5 | Smoke retroactivo con `--strict=false`: validar HOR-005 (pre-HOR-026) sin fail | reviewer | balanced | — | TC-09 | Exit 0 con warnings, no errors | — | pending | 3 | — |
| S3.T6 | Docs en `prompts/_style.md` Principio 9: schemas + tool + integracion + cuando usar vs HOR-023 | scribe | fast | prompts/_style.md | — | Seccion completa | git revert | pending | 3 | — |
| S3.GATE | Quality review (DET-23 tier light) + dkc-verify-gate all + commit DET-27 `improve(dkc): integracion dkc-validate en 3 steps + docs (HOR-026 S3)` | reviewer | balanced | prompts/ | TC-08..11 | Gate decision + commit | git revert | pending | 3 | — |

### Session 4 — Close (T0, gate ⚑ fuerte)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S4.T1 | Summary completo: que se hizo, learns, plan adopcion gradual (Rule, Decision, Bug schemas como follow-up) | scribe | fast | HOR-026.md | — | Summary completo | — | pending | 4 | — |
| S4.T2 | Promover learns | scribe | fast | learns/ si aplica | — | Learns refinados | — | pending | 4 | — |
| S4.T3 | Teach-close decision | scribe | fast | HOR-026.md + teach-close.md si aplica | — | teachings.close: done o skipped | — | pending | 4 | — |
| S4.GATE | Cierre. status: closed. Commit DET-27 `close(horadric): HOR-026 closed — output schemas operacionales` + reindex | scribe | fast | HOR-026.md | — | Ticket cerrado | — | pending | 4 | — |

## Backlog

(Vacio.)

## Open questions

- **Schemas adicionales** (Rule, Decision, Bug, Learn): follow-up si emerge dolor. Probable: post-HOR-026 si tickets recurren bugs en esos records
- **Migracion retroactiva**: NO en este ticket. Si en el futuro un dev quiere validar todo el KB, agregar comando `dkc-validate-all` con `--scan` que reporte gaps masivos
- **Integracion con HC viewer**: opcional, follow-up. Validacion podria mostrar badges de "schema valid" en specs/sessions del viewer
