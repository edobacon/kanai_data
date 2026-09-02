---
id: SPEC-workflow-schemas-extension-41
project: horadric
ticket: HOR-041
status: done
---

# Schemas adicionales: Rule + Decision (extension HOR-026)

# Schemas adicionales: Rule + Decision (extension HOR-026)

## Executive summary — lo que estas aprobando

> *Lectura de 60s.*

### Que se quiere

HOR-026 cerro con 2 schemas zod (`SpecTaskSchema`, `SessionBlockSchema`) que validan los records con mas bugs historicos. Quedan **4 records sin schema formal**: Rule, Decision, Bug, Learn. Este ticket cubre **Rule + Decision** (los 2 mas usados y mas susceptibles a drift en el KB).

**Solucion**: 2 schemas zod nuevos en `commands/lib/schemas/`, parsers correspondientes en `commands/lib/parsers/markdown.ts`, y `commands/dkc-validate` acepta `Rule | Decision` como kinds. **Sin migracion retroactiva**: records existentes quedan tal cual; el validador se aplica a records nuevos o explicitamente al revisar.

**Por que en este sprint**: foundation HOR-026 incompleta sin Rule/Decision schemas. KB-first (DET-11) retrieva estos records — sin schema, parsing fragil. HOR-031 (embedding KB) consume estos schemas para filtros pre-search estructurados.

### Decisiones criticas

| # | Decision | Por que |
|---|----------|---------|
| 1 | **2 schemas independientes** (no compartir base) | Cada record evoluciona independiente. Pequeña duplicacion (id, project, module, tags, created) es aceptable por claridad |
| 2 | **Frontmatter opcional con `.optional()` o `.nullable()`** | Records antiguos no rompen (sin migracion). `decision_makers`, `spec`, `ticket`, `superseded_by`, `session` son opcionales por defecto |
| 3 | **Variantes de seccion en parser, no en schema** | `## Decision` vs `## Decisión` vs `## Choice` se normalizan en `extractSection([variants])` antes de validar. Schema sigue limpio con 1 nombre canonical (`decision`) |
| 4 | **`level/scope/status` son `z.enum([...])` strict** | Valor invalido es error util — fuerza limpieza de drift. Records antiguos con typos rompen al validar (mitigado: tickets nuevos primero) |
| 5 | **Solo Rule + Decision, NO Bug ni Learn** | Scope acotado (2 SP). Bug + Learn diferidos a HOR-045 conditional |
| 6 | **NO migracion retroactiva** | Records pre-HOR-041 quedan validos como-estan. Solo aplica a records nuevos o al pasar explicitamente con `dkc-validate Rule {file}` |

### Riesgos

- **Records antiguos rompen con `--strict`**: rules/decisions creadas pre-Etapa-canonical 2026-04 pueden tener frontmatter incompleto. Mitigacion: dogfood retroactivo en S2.T3 mide cuantos warnings vs errors aparecen — si hay >5 errors, ampliar opcionales en schema antes de cerrar
- **Variantes de seccion no contempladas**: muestreo cubrio `Context`/`Contexto`/`Context and problem statement` + `Decision`/`Decisión`/`Choice` + opcional `Alternatives`/`Considered options`. Si emergen mas, agregar al array de candidates de `extractSection`
- **Steps que escriben Rule/Decision no son explicitos**: DKC carece de un step canonico de "crear rule" — la integracion S2.T4 documenta "validate-on-edit" en lugar de "validate-on-create" para evitar ambiguedad

### Que NO se hace

- NO instalar dependencias nuevas (reuso zod + tsx ya en HOR-026)
- NO modificar `dkc-validate` CLI surface — solo agrega 2 kinds al enum
- NO schemas para Bug + Learn (diferido a HOR-045 conditional)
- NO migracion retroactiva de records existentes
- NO breaking changes a SpecTask + SessionBlock existentes

### Tamano

3 sessions: S1 schemas, S2 parsers + tool + dogfood + integracion, S3 close. SP: **2**. Tiempo: **~2-3h efectivas** (extension del patron HOR-026 ya probado).

### Como vas a saber que funciona

- `commands/dkc-validate Rule projects/horadric/rules/workflow/RULE-workflow-session-format-canonical-002.md` retorna `{valid: true}`
- `commands/dkc-validate Decision projects/pehuen/decisions/DEC-007-pinia-state.md` retorna `{valid: true}`
- Dogfood S2.T3: validar 6 rules de horadric + 8 decisions de pehuen — majority valid, warnings en records con variantes de seccion (esperado), 0 errors en records post-2026-05-15
- `dkc-validate all {file}` acepta los 4 kinds (SpecTask, SessionBlock, Rule, Decision) sin breaking changes

---

## Purpose

Cerrar la brecha de HOR-026: schemas para los records que MAS se consumen en KB-first (DET-11) — Rule y Decision aparecen en cada query de `dkc_search_text` y `dkc_find_context`. Sin schemas, el parsing es fragil; con schemas, el indexador (HOR-031) confia en `kind`, `module`, `scope`, `level`, `status` y puede filtrar pre-search.

Para el dev: validacion explicita al editar rules/decisions, drift detectable, contrato formal para fine-tuning (HOR-037 LoRA con dataset coherente). Para HOR-028 (entity tracking): rules/decisions referenciadas tienen shape validable.

## Requirements

### REQ-IMPROVE-01 — Schema zod `RuleSchema`

> **Que cambia**: archivo `commands/lib/schemas/rule.ts` define schema zod que valida records `projects/{project}/rules/{module}/RULE-*.md` con frontmatter (id, project, module, scope, level, created, tags + opcionales spec/ticket) + body con secciones canonicas (`## What`, `## Why`, `## Where`, `## When`).
> **Por que**: rules son el conocimiento normativo del proyecto. Sin schema, drift en `level` (`must` vs `MUST` vs `mandatory`) o `scope` (`global` vs `cross-project`) genera bugs silenciosos al indexar y al filtrar. KB-first (DET-11) depende de retrieval consistente.

El schema MUST:
- Frontmatter required:
  - `id`: regex `/^RULE-/`
  - `project`: string min length 1
  - `module`: string min length 1
  - `scope`: enum `['global', 'module', 'file']`
  - `level`: enum `['must', 'should', 'may']`
  - `created`: ISO date string o YAML date
  - `tags`: array de strings
- Frontmatter optional:
  - `spec`: string nullable
  - `ticket`: string nullable
- Body required (extraido del markdown):
  - `what`: string min length 1 (seccion `## What`)
  - `why`: string min length 1 (seccion `## Why`)
  - `where`: string min length 1 (seccion `## Where`)
  - `when`: string min length 1 (seccion `## When`)
- Exportar type: `type Rule = z.infer<typeof RuleSchema>`

<details><summary>Scenarios de validacion</summary>

#### Scenario: Rule canonical horadric valida
- **GIVEN** `projects/horadric/rules/workflow/RULE-workflow-session-format-canonical-002.md` (formato canonical, frontmatter completo, 4 secciones body)
- **WHEN** `commands/dkc-validate Rule {file}`
- **THEN** exit 0, JSON `{valid: true, errors: [], warnings: []}`

#### Scenario: Rule con `level: MUST` (mayusculas) rechazada
- **GIVEN** rule artificial con `level: MUST` en frontmatter
- **WHEN** `commands/dkc-validate Rule {file}`
- **THEN** exit 1, error con path `frontmatter.level`, expected enum `['must', 'should', 'may']`

#### Scenario: Rule sin seccion `## When` rechazada
- **GIVEN** rule artificial con frontmatter OK pero body sin `## When`
- **WHEN** `commands/dkc-validate Rule {file}`
- **THEN** exit 1, error con path `body.when`, message indicando seccion faltante

</details>

### REQ-IMPROVE-02 — Schema zod `DecisionSchema`

> **Que cambia**: archivo `commands/lib/schemas/decision.ts` define schema zod que valida records `projects/{project}/decisions/DEC-*.md` con frontmatter (id, project, module, status, created, tags + opcionales spec/ticket/session/superseded_by/decision_makers) + body con secciones canonicas (`## Context and problem statement`, `## Decision drivers`, `## Decision`, + opcionales `## Alternatives`, `## Consequences`).
> **Por que**: decisions tienen alta variabilidad observada (24+ en pehuen, 3 en drunappgor, 0 en horadric con variantes de seccion). Schema explicito normaliza variantes via parser sin sacrificar rigor.

El schema MUST:
- Frontmatter required:
  - `id`: regex `/^DEC-/`
  - `project`: string min length 1
  - `module`: string min length 1
  - `status`: enum `['accepted', 'proposed', 'rejected', 'superseded']` (Q1 cerrada: `deprecated` no incluido — no observado en muestra)
  - `created`: ISO date string o YAML date
  - `tags`: array de strings
- Frontmatter optional:
  - `spec`, `ticket`, `session`, `superseded_by`: string nullable
  - `decision_makers`: array de strings (Q2 cerrada: opcional)
- Body required:
  - `contextAndProblemStatement`: string min length 1 (variantes parser: `['Context and problem statement', 'Contexto', 'Context']`)
  - `decisionDrivers`: string min length 1
  - `decision`: string min length 1 (variantes parser: `['Decision', 'Decisión', 'Choice']`)
- Body optional:
  - `alternatives`: string (variantes parser: `['Alternatives', 'Considered options']`)
  - `consequences`: string
- Exportar type: `type Decision = z.infer<typeof DecisionSchema>`

<details><summary>Scenarios de validacion</summary>

#### Scenario: Decision canonical pehuen valida
- **GIVEN** `projects/pehuen/decisions/DEC-007-pinia-state.md` con frontmatter completo + secciones `## Context and problem statement`, `## Decision drivers`, `## Considered options` (variante), `## Decision`
- **WHEN** `commands/dkc-validate Decision {file}`
- **THEN** exit 0, JSON `{valid: true, errors: [], warnings: []}` (parser normaliza `Considered options` → `alternatives`)

#### Scenario: Decision con `status: deprecated` rechazada
- **GIVEN** decision artificial con `status: deprecated`
- **WHEN** `commands/dkc-validate Decision {file}`
- **THEN** exit 1, error con path `frontmatter.status`, expected enum `['accepted', 'proposed', 'rejected', 'superseded']`

#### Scenario: Decision sin `## Decision` ni variantes
- **GIVEN** decision artificial sin seccion Decision/Decisión/Choice
- **WHEN** `commands/dkc-validate Decision {file}`
- **THEN** exit 1, error con path `body.decision`

</details>

### REQ-IMPROVE-03 — Parsers `parseRule` + `parseDecision`

> **Que cambia**: extension de `commands/lib/parsers/markdown.ts` con 2 nuevas funciones (`parseRule`, `parseDecision`) que extraen frontmatter + body sections desde el markdown y producen JSON validable por los schemas. Variantes de seccion normalizadas a nombres canonicos.
> **Por que**: sin parser, los schemas son TS inerte. La extension reusa el patron `extractSection` ya existente (HOR-026 S2). `extractSection` se modifica minimalmente para aceptar array de candidates (first-match-wins) si aun no lo hace.

El parser MUST:
- `parseRule(filePath)` retorna `{ frontmatter, body }` con frontmatter parseado via gray-matter (o equivalente actual) y body con keys `what/why/where/when`
- `parseDecision(filePath)` retorna `{ frontmatter, body }` con body keys `contextAndProblemStatement/decisionDrivers/decision/alternatives?/consequences?`
- `extractSection(md, candidates: string[])` acepta array — match-wins el primero presente
- Sin breaking changes a `parseSpecTasks` y `parseSessionBlocks` existentes

<details><summary>Scenarios de validacion</summary>

#### Scenario: parseRule sobre rule canonical
- **GIVEN** rule horadric canonical
- **WHEN** `parseRule(filePath)`
- **THEN** retorna `{ frontmatter: { id: 'RULE-...', ... }, body: { what, why, where, when } }` con todos los strings no vacios

#### Scenario: parseDecision normaliza variante `## Decisión`
- **GIVEN** decision artificial con header `## Decisión` en lugar de `## Decision`
- **WHEN** `parseDecision(filePath)`
- **THEN** retorna `body.decision` con contenido extraido (variante normalizada)

</details>

### REQ-IMPROVE-04 — Tool `commands/dkc-validate` acepta `Rule | Decision`

> **Que cambia**: extension de `commands/lib/validate.ts` + `commands/dkc-validate` para aceptar `Rule | Decision` como `schema` arg, ademas de los 2 existentes (`SpecTask | SessionBlock | all`).
> **Por que**: sin la integracion CLI, los schemas no son invocables desde steps ni desde el dev. Patron HOR-023 (verifier integrado en gates).

El tool MUST:
- Aceptar `schema` ∈ `{SpecTask, SessionBlock, Rule, Decision, all}`
- Output JSON estructurado igual al de HOR-026 (`{valid, schema, file, records_validated, errors, warnings}`)
- Exit codes igual a HOR-026 (0 valid, 1 invalid, 2 warnings, 3 error tecnico)
- `all` ejecuta todos los kinds aplicables al file (Rule sobre `rules/`, Decision sobre `decisions/`, SpecTask sobre `specs/`, SessionBlock sobre `tickets/`)

<details><summary>Scenarios de validacion</summary>

#### Scenario: validacion CLI Rule
- **GIVEN** rule canonical en horadric
- **WHEN** `commands/dkc-validate Rule {file}`
- **THEN** exit 0, JSON output completo con `records_validated: 1`

#### Scenario: `dkc-validate all` sobre directorio rules/
- **GIVEN** `projects/horadric/rules/workflow/` con 2 rules
- **WHEN** `commands/dkc-validate Rule projects/horadric/rules/workflow/`
- **THEN** procesa ambos files, output con `records_validated: 2`

</details>

### REQ-IMPROVE-05 — Documentacion en `_style.md` Principio 9

> **Que cambia**: extension del Principio 9 de `prompts/_style.md` (introducido por HOR-026) con casos Rule + Decision: shape, variantes toleradas, cuando validar.
> **Por que**: sin docs, la extension es invisible al dev. Principio 9 ya documenta SpecTask + SessionBlock — anadir Rule + Decision mantiene coherencia.

Seccion incluye:
- Schemas disponibles ahora: SpecTask, SessionBlock, **Rule**, **Decision**
- Variantes de seccion toleradas en Decision (normalizadas por parser)
- Cuando validar Rule/Decision (al editar, al promover learn → rule, al cerrar ticket que produce decisions)
- Que records quedan sin schema (Bug + Learn → HOR-045 conditional)

### REQ-PRESERVE-01 — Schemas SpecTask + SessionBlock siguen validos

> **Que cambia**: nada disruptivo. Los 2 schemas existentes (HOR-026) NO se modifican.
> **Por que**: cambiar SpecTask o SessionBlock seria scope mayor y riesgo de breaking change. Extension es aditiva.

Validacion: TC-08 verifica que `dkc-validate SpecTask` sobre SPEC-workflow-output-schemas-26.md sigue valido post-HOR-041.

### REQ-PRESERVE-02 — Records pre-HOR-041 quedan validos al pasarlos por el validador

> **Que cambia**: nada. Validacion es opt-in — el dev decide cuando correrla. Default lenient para records pre-2026-05-15.
> **Por que**: migrar ~12 rules + ~24 decisions historicas seria scope masivo. Mejor: validar al editar y dejar records antiguos tal cual.

Validacion: TC-09 verifica que rules + decisions pre-2026-04 pasen sin errors (solo warnings si tienen drift menor en frontmatter opcional).

## Test cases

| # | Caso | REQ | Affects UI | Expected | Actual | Evidence | Status | Session | Cambios |
|---|------|-----|-----------|----------|--------|----------|--------|---------|---------|
| TC-01 | `commands/lib/schemas/rule.ts` carga sin error y self-test inline retorna OK | REQ-IMPROVE-01 | no | `npx tsx commands/lib/schemas/rule.ts` exit 0, `Sample rule valid: true` | `Sample rule valid: true` + 2 asserts mas pass (invalid level rejected, missing When rejected). Exit 0 | `npx tsx commands/lib/schemas/rule.ts` | pass | S1.T2 | — |
| TC-02 | `RuleSchema` valida rule canonical horadric (in-memory sample inline; validacion sobre archivo real en S2.T3 dogfood) | REQ-IMPROVE-01 | no | valid:true sobre sample inline replicando RULE-workflow-session-format-canonical-002 | `Sample rule valid: true` con frontmatter completo + body 4 secciones canonicas + Verification/Source | tsx run | pass-partial | S1.T2 | validacion sobre archivo real diferida a S2.T3 (post-parser) |
| TC-03 | `RuleSchema` rechaza rule con `level: MUST` (mayusculas) — drift comun | REQ-IMPROVE-01 | no | valid:false, error path `frontmatter.level`, expected enum lowercase | `Invalid level rejected: true. Error path: frontmatter.level. Error message: Invalid enum value. Expected 'must' \| 'should' \| 'may', received 'MUST'` | tsx run | pass | S1.T2 | — |
| TC-04 | `commands/lib/schemas/decision.ts` carga sin error y self-test inline retorna OK | REQ-IMPROVE-02 | no | `npx tsx commands/lib/schemas/decision.ts` exit 0, `Sample decision valid: true` | `Sample decision valid: true` + 3 asserts mas pass. Exit 0 | `npx tsx commands/lib/schemas/decision.ts` | pass | S1.T3 | — |
| TC-05 | `DecisionSchema` valida DEC-007 pehuen (sample inline; archivo real en S2.T3 post-parser que normaliza variantes) | REQ-IMPROVE-02 | no | valid:true sobre sample inline replicando DEC-007 (Considered options + Decision outcome) | `Sample decision valid: true` con body post-normalizacion (alternatives, decision, confirmation) | tsx run | pass-partial | S1.T3 | validacion sobre archivo real diferida a S2.T3 (post-parser) |
| TC-06 | `DecisionSchema` rechaza decision con `status: deprecated` (no en enum) | REQ-IMPROVE-02 | no | valid:false, error path `frontmatter.status`, expected enum sin `deprecated` | `Invalid status rejected: true. Error path: frontmatter.status. Error message: Invalid enum value. Expected 'accepted' \| 'proposed' \| 'rejected' \| 'superseded', received 'deprecated'` | tsx run | pass | S1.T3 | — |
| TC-07 | `parseRule` extrae body con 4 secciones canonicas; `parseDecision` normaliza variantes | REQ-IMPROVE-03 | no | JSON con keys what/why/where/when (Rule) y contextAndProblemStatement/decisionDrivers/decision (Decision) | `tsx parsers/markdown.ts Rule RULE-workflow-session-format-canonical-002.md` retorna JSON con 4 secciones canonicas + verification/source. `tsx parsers/markdown.ts Decision DEC-007-pinia-state.md` retorna body con `decision` extraido de `## Decision outcome` y `alternatives` extraido de `## Considered options` (variantes normalizadas) | tsx run | pass | S2.T1 | — |
| TC-08 | `dkc-validate Rule projects/horadric/rules/workflow/RULE-workflow-session-format-canonical-002.md` exit 0 | REQ-IMPROVE-04 | no | exit 0, JSON `{valid: true, records_validated: 1}` | `{"valid": true, "schema": "Rule", "records_validated": 1, "errors": [], "warnings": []}` | bash test | pass | S2.T2 | — |
| TC-09 | `dkc-validate Decision projects/pehuen/decisions/DEC-007-pinia-state.md` exit 0 | REQ-IMPROVE-04 | no | exit 0, JSON `{valid: true, records_validated: 1}` | `{"valid": true, "schema": "Decision", "records_validated": 1, "errors": [], "warnings": []}` | bash test | pass | S2.T2 | — |
| TC-10 | Dogfood retroactivo: validar 6 rules horadric + 8 decisions pehuen — majority valid, drift documentado en JSON warnings | REQ-IMPROVE-04 | no | majority valid (>80%); errors solo en drift real (no falsos positivos) | **33/33 valid (100%)**: 6/6 rules horadric + 21/21 decisions pehuen (todas, no solo las 8 muestreadas) + 5/5 SessionBlocks HOR-026 + 21/21 SpecTasks SPEC-026. Cero errors, cero warnings, cero falsos positivos. Supera target | bash test | pass | S2.T3 | — |
| TC-11 | `dkc-validate SpecTask` sobre SPEC-workflow-output-schemas-26.md sigue valido post-HOR-041 (sin regresion) | REQ-PRESERVE-01 | no | exit 0, sin breaking change | `{"valid": true, "schema": "SpecTask", "records_validated": 21, "errors": [], "warnings": []}` + `dkc-validate SessionBlock HOR-026.md` → valid 5/5 | bash test | pass | S2.T3 | — |
| TC-12 | `prompts/_style.md` Principio 9 contiene `Rule` y `Decision` como kinds documentados | REQ-IMPROVE-05 | no | Grep retorna >=2 matches | 17 menciones de Rule/Decision en _style.md + nueva tabla "Schemas disponibles" con RuleSchema/DecisionSchema + nueva seccion "Variantes de seccion normalizadas" + nueva seccion "validate-on-edit (DEC-LOCAL-01)" | grep | pass | S3.T1 | — |

## Tasks

### Session 1 — Schemas Rule + Decision (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S1.T1 | Inspeccionar muestreo: 5 rules horadric + 5 decisions pehuen para confirmar shape canonico + variantes detectadas (validar H1, H2). Documentar variantes finales en `tickets/HOR-041.draft/data-model.ts` si emergen mas | researcher | fast | tickets/HOR-041.draft/data-model.ts | — | Shape confirmado, variantes listadas exhaustivamente | — | done | 1 | L1.1-L1.5 actualizan data-model con Verification/Source/confirmation/updated/Decision outcome/Considered options |
| S1.T2 | Implementar `commands/lib/schemas/rule.ts` con RuleSchema (frontmatter required/optional + body 4 secciones). Self-test inline (sample valid + sample invalido con `level: MUST`) | developer | balanced | commands/lib/schemas/rule.ts | TC-01, TC-02, TC-03 | Schema carga, self-test pass | git revert | done | 1 | — |
| S1.T3 | Implementar `commands/lib/schemas/decision.ts` con DecisionSchema (frontmatter required/optional + body required + body optional). Self-test inline (sample valid + sample invalido con `status: deprecated`) | developer | balanced | commands/lib/schemas/decision.ts | TC-04, TC-05, TC-06 | Schema carga, self-test pass | git revert | done | 1 | — |
| S1.GATE | Quality review (DET-23 tier standard, dims 1/2/3/4/6/7/10 aplicables). Verify `dkc-verify-gate G7 HOR-041` pasa. Commit DET-27 `improve(dkc): schemas Rule + Decision (HOR-041 S1)` | reviewer | balanced | commands/lib/schemas/ | TC-01..06 | Gate decision + commit | git revert | done | 1 | — |

### Session 2 — Parsers + tool + dogfood + integracion (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S2.T1 | Extender `commands/lib/parsers/markdown.ts` con `parseRule` + `parseDecision`. Modificar `extractSection` minimalmente si necesita aceptar array de candidates (first-match-wins) | developer | balanced | commands/lib/parsers/markdown.ts | TC-07 | Parsers extraen JSON correcto desde rule + decision sample | git revert | done | 2 | extractSection extendida a `string \| string[]` backward compat; parseFrontmatter YAML inline (NO nuevas deps) |
| S2.T2 | Extender `commands/lib/validate.ts` + `commands/dkc-validate` para aceptar Rule y Decision como schema arg. Help text actualizado | developer | balanced | commands/lib/validate.ts, commands/dkc-validate | TC-08, TC-09 | CLI acepta nuevos kinds, retorna JSON estructurado | git revert | done | 2 | `all` dispatch por path (rules/ → Rule, decisions/ → Decision, specs/ → SpecTask, tickets/ → SessionBlock) |
| S2.T3 | Dogfood retroactivo: correr `dkc-validate Rule` sobre 6 rules de horadric y `dkc-validate Decision` sobre 8 decisions de pehuen. Documentar findings (warnings esperados, errors a investigar). Tambien verificar REQ-PRESERVE-01 (TC-11) | reviewer | balanced | — | TC-10, TC-11 | Reporte de dogfood en session log, majority valid, 0 falsos positivos en SpecTask | — | done | 2 | 33/33 valid (100%); supera target majority — L2.2 H5 superada |
| S2.T4 | Decidir + documentar integracion: ¿steps que escriben rules/decisions invocan validate? Default: documentar como "validate-on-edit" en `_style.md` Principio 9 — NO modificar steps en este ticket | architect | balanced | — (decision en spec/ticket) | — | Decision DEC-LOCAL documentada en spec, integracion definida | — | done | 2 | DEC-LOCAL-01 confirmada (validate-on-edit); implementacion concreta en S3.T1 |
| S2.GATE | Quality review (DET-23 tier standard). Verify `dkc-validate SpecTask` sobre SPEC-026 sigue OK (regresion). Commit DET-27 `improve(dkc): parsers + tool Rule + Decision + dogfood (HOR-041 S2)` | reviewer | balanced | commands/ | TC-07..11 | Gate decision + commit | git revert | done | 2 | — |

### Session 3 — Docs + close (T0, gate ⚑ fuerte)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S3.T1 | Extender `prompts/_style.md` Principio 9 con casos Rule + Decision (variantes, cuando validar). Listar Bug + Learn como follow-up HOR-045 | scribe | fast | prompts/_style.md | TC-12 | Seccion extendida, grep retorna matches | git revert | done | 3 | tabla schemas + tabla variantes + seccion validate-on-edit + antipatron actualizado |
| S3.T2 | Summary completo en HOR-041.md: que se hizo, learns, follow-up Bug + Learn schemas (HOR-045 conditional) | scribe | fast | tickets/HOR-041.md | — | Summary completo | — | done | 3 | — |
| S3.T3 | Decision teach-close (DET-22 F5): proponer skip alineado al patron HOR-040/HOR-026 (extension lineal sin lessons learned standalone). Si el dev aprueba skip, marcar `teachings.close: skipped` con razon | scribe | fast | tickets/HOR-041.md | — | teachings.close: done o skipped con razon | — | done | 3 | teachings.close: skipped con razon |
| S3.T4 | Cierre: actualizar frontmatter `status: closed` + `closed: 2026-05-16`. Commit DET-27 `close(horadric): HOR-041 closed — schemas Rule + Decision operacionales` + reindex | scribe | fast | tickets/HOR-041.md | — | Ticket cerrado, reindex pasa | — | done | 3 | executed: 1.5 SP (75% del estimado) |
| S3.GATE | Cierre final del ticket. Verify HOR-041 frontmatter post-close coherente. Resolved | reviewer | fast | — | — | Ticket closed status | — | done | 3 | — |

## Constraints

- **DET-1, DET-2** (certeza + source_ref): cada REQ tiene source_ref al ticket/draft; tasks `inferred` solo si tienen task de validacion previa
- **DET-7** (test cases ↔ discovery): cada TC traza a REQ explicito + Session de ejecucion (columna `Session`)
- **DET-8** (rollback documentado): cada task con `git revert` o N/A justificado
- **DET-11** (KB-first): schemas garantizan retrieval consistente desde el indexador (HOR-031)
- **DET-16** (propagacion): cambios afectan a 4 archivos (`commands/lib/schemas/`, `commands/lib/parsers/`, `commands/lib/validate.ts`, `commands/dkc-validate`, `prompts/_style.md`) — todos en scope
- **DET-20** (sessions con gate): 3 sessions con `S{N}.GATE` como ultima task de cada una
- **DET-23** (quality review): S1 tier standard, S2 tier standard, S3 tier light en gate fuerte
- **DET-24** (REQ callouts): todos los REQ-IMPROVE tienen callout `Que cambia` / `Por que`; REQ-PRESERVE-01 trivial omite callout (escape regla 3)
- **DET-25** (test cases registrados en sesion): columna `Session` poblada al ejecutar cada TC
- **RULE-workflow-session-format-canonical-002**: sessions del ticket siguen formato canonical Template de Gate
- **DEC-LOCAL** (S2.T4): integracion documentada como "validate-on-edit" — no modificar steps en este ticket

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `commands/lib/schemas/spec-task.ts` (HOR-026) | internal | Template de referencia para shape zod | bajo |
| `commands/lib/parsers/markdown.ts` (HOR-026) | internal | Parser base + `extractSection` reusable | bajo — modificacion minimal si necesita array de candidates |
| `commands/lib/validate.ts` + `commands/dkc-validate` (HOR-026) | internal | Tool base — extension aditiva al enum de kinds | bajo |
| zod + tsx (instalados HOR-026) | external | Ya en `commands/lib/package.json` — sin install nuevo | nulo |
| Records reales para dogfood (rules horadric + decisions pehuen) | internal | Validacion empirica de schemas | bajo — si dogfood revela >5 errors, expandir opcionales en S2.GATE |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Variantes de seccion no contempladas en muestra | media | medio | Dogfood S2.T3 detecta todas; agregar al array de candidates si emergen |
| Rules antiguas (pre-Etapa-canonical) con frontmatter incompleto | media | medio | Schema con opcionales (`spec`, `ticket` nullable); aplicar lenient mode si `--strict` no especificado |
| Drift entre `level` lowercase canonical vs MUST/Must historicos | baja | bajo | Enum strict fuerza limpieza; reporte en dogfood, fix incremental |
| Integracion S2.T4 ambigua (no hay step canonico de crear rule) | media | bajo | DEC-LOCAL: documentar como "validate-on-edit" — no modificar steps |
| HOR-031 (embedding KB) ya depende del shape esperado | baja | medio | Schema confirma shape — no introduce breaking change vs lo que HOR-031 espera |

## Open questions

(Vacio — Q1, Q2, Q3 del draft cerradas con defaults aprobados.)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Integracion sin modificar steps

- **Contexto**: ¿steps que escriben rules/decisions deben invocar `dkc-validate` post-escritura?
- **Drivers**: HOR-041 es scope acotado (2 SP); identificar y modificar steps que escriben rules/decisions es trabajo extra de scope incierto (no hay step canonico explicito).
- **Opcion elegida**: documentar como "validate-on-edit" en `_style.md` Principio 9. Dev invoca el tool manualmente al editar rules/decisions o en pre-merge.
- **Alternativas**: (a) modificar `prompts/steps/dkc-learn.md` para validar en promote learn → rule (rechazado: scope creep); (b) hook git pre-commit (rechazado: out of scope).
- **Consecuencias**: gana scope acotado; pierde auto-validacion. Si emerge dolor, follow-up HOR-046 puede agregar hooks.
- **Session**: S2.T4

### DEC-LOCAL-02: `status: deprecated` no incluido en DecisionStatus enum

- **Contexto**: ¿debe `DecisionStatus` incluir `deprecated`?
- **Drivers**: pehuen tiene records con `superseded` pero NO con `deprecated`. drunappgor solo `accepted`. horadric vacio.
- **Opcion elegida**: enum `['accepted', 'proposed', 'rejected', 'superseded']` — 4 valores.
- **Alternativas**: incluir `deprecated` (rechazado: no observado en muestra; agregar si emerge).
- **Consecuencias**: schema strict; si un dev crea decision con `deprecated` recibe error util.
- **Session**: pre-design (Q1 del draft).

### DEC-LOCAL-03: `decision_makers` opcional

- **Contexto**: ¿`decision_makers` required o optional?
- **Drivers**: pehuen lo usa siempre, drunappgor a veces, horadric (vacio).
- **Opcion elegida**: opcional (`array<string>().optional()`).
- **Alternativas**: required (rechazado: rompe records de drunappgor y horadric).
- **Consecuencias**: schema tolerante; pierde rigor en quien tomo la decision.
- **Session**: pre-design (Q2 del draft).

## Acceptance checkpoints

- [ ] **Funcional**: 12 TCs pass con outputs reales documentados en columna `Actual`
- [ ] **Tests**: self-tests inline de rule.ts + decision.ts pass; dogfood majority valid
- [ ] **NFRs**: N/A (mejora estructural sin metricas de runtime)
- [ ] **Rules**: DET-1/2/7/8/11/16/20/23/24/25 respetadas; RULE-workflow-session-format-canonical-002 en sessions
- [ ] **Integration**: `dkc-validate SpecTask` sobre SPEC-026 sigue valido (REQ-PRESERVE-01, TC-11)
- [ ] **Docs**: `_style.md` Principio 9 extendido con Rule + Decision (TC-12)

## Backlog

(Vacio.)

## Follow-ups

- **HOR-045 conditional**: schemas para Bug + Learn si emerge dolor (drift observado bajo, scope post-HOR-041)
- **HOR-046 conditional**: hooks de auto-validacion (git pre-commit o steps que escriben rules/decisions) si "validate-on-edit" manual resulta insuficiente
