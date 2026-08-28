---
id: TICKET-082
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1345
module: curriculum-design
autopilot: autonomous
---

# Malla — Objetos planEntry + requirementCategory

> **MC-02** ⭐ (gatea casi todo) · Épica Jira [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) (track interno "A") · Tier 🅼 Must · 5 SP · repo `mod` · Fase F1.
> **Pre-spec (fuente de design):** [`sp5/prespecs/MC-02.md`](../../../../uplanner/specs/up1/sp5/prespecs/MC-02.md) — transcrito abajo. El SPEC formal DKC se crea al tomar el ticket (design-feature), transcribiendo REQ/tasks 1:1.

## ⛔ Gate de inicio — dependencias

> **1 dev, ejecución en serie.** Antes de iniciar design / `request-execute`, verificar que cada bloqueante esté `status: closed` (frontmatter `depends_on` + relaciones `depends_on` en HC; `dkc_read_frontmatter`). Si alguna NO está `closed`: **NO iniciar este ticket** — bloquear y avisar al dev (DET-30 guarda de inicio).

| Bloqueante | Aporta | Debe estar |
|---|---|---|
| [TICKET-081](TICKET-081.md) (MC-01) | enum `progression` (regla de `period` por modo) | closed |

## Request

Como diseñador curricular, quiero colocar asignaturas en períodos del plan y organizarlas en líneas de formación, para construir la malla y agrupar sus créditos.

Agrupa A1 + A2 (handoff). Dos objetos nuevos del mod: `planEntry` (coloca una Activity en un período del plan: planId, activityId, categoryId?, blockId?, kind enum {Course, Internship, Thesis}, period requerido, position, credits?, sourceEntryId?; créditos efectivos por herencia; electividad derivada de blockId; solo secuencial en SP5) y `requirementCategory` (líneas de formación: curriculumId, name, code?, minCredits, maxCredits?, position, description?, color?, icon?; validación min≤max; guard de borrado; color+ícono modelados con valores de la maqueta). Patrón copiable de CurricularSection.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | data model (2 objetos nuevos del mod + resolvers + layouts + lang + seed) |
| Modulo principal | curriculum-design |
| Modulos afectados | curriculum-design (mod-only). MCP-ready para MC-04 |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | layouts RecordList/RecordDetail estándar (reuse), sin componente nuevo |
| Data model | sí | objetos `planEntry` y `requirementCategory` nuevos → draft data-model recomendado al tomar (DET-18); maqueta ya existe (UPONE-1272) |

## Triage

REQs **confirmados** (salvo REQ-05 índices = inferred). Riesgo bajo: patrón ya probado en `CurricularSection`. Decisión menor abierta: opción del guard de borrado (A `onDelete: Restrict` vs B validación de dominio).

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El patrón `CurricularSection` (FK, self-FK, layouts, resolvers, seed) cubre ambos objetos sin tocar core | ✓ confirmada | objeto del mismo mod en producción |

### Context found

**KB del módulo (kb_refs: DEC-026, DEC-030, DEC-033, RULE-cd-013):**
- mod-only (no tocar core); no commitear artefactos de sync/seed (Base, schema, typeDefs).
- objetos deben quedar **MCP-ready** (enums + FK `references` + labels) para MC-04.

**Necesidad/reuso (DET-32):** `planEntry` y `requirementCategory` = **build** (no existen; elemento central de la malla + líneas de formación). Estructura/patrón, layouts = **reuse** (copiar `CurricularSection`).

**Supuestos:** SP5 solo secuencial → `period` **requerido** (modular nullable → SP6, BL-6); se modelan `color` e `icon` (§dec-1); valores de `icon` por categoría a criterio en el seed (la maqueta trae color, no ícono).

**FLAG-1 (resuelto, decisión menor):** guard de borrado — **A (recomendada)** `planEntry.categoryId` con `"onDelete": "Restrict"` (codegen lo honra, DB bloquea) vs **B** validación de dominio en el delete (patrón `lineageUniqueness`, mensaje "reasigna primero"). Elegir A salvo que se requiera el mensaje exacto.

## Pre-spec (transcrito de MC-02.md)

### Requisitos (REQ)

| REQ | Certeza | source_ref | Enunciado |
|-----|---------|-----------|-----------|
| REQ-01 · objeto `planEntry` | confirmed | handoff §2.1 | campos: planId, activityId, categoryId?, blockId?, kind, period, position, credits?, sourceEntryId?, timestamps; índices planId/categoryId/blockId/(planId,period,position). |
| REQ-02 · `period` requerido | confirmed | reunión 00:36:38 + 00:55:49 | `planEntry.period` requerido (modular nullable → SP6). |
| REQ-03 · créditos efectivos por herencia | confirmed | handoff §2.1 | `planEntry.credits ?? Activity.credits` en el resolver de lectura. |
| REQ-04 · electividad derivada (sin flag) | confirmed | handoff §2.1 + §2.4 | electividad DEBE derivarse de `blockId` (null=obligatoria); NO existe `isElective`. |
| REQ-05 · índices de consulta | inferred | handoff §2.1 | DEBERÍA indexar planId, categoryId, blockId, (planId, period, position). |
| REQ-06 · discriminador `kind` | confirmed | handoff §2.1 + §dec-2 | enum {Course, Internship, Thesis}; UI solo crea Course; Internship/Thesis reservados (sin seed). |
| REQ-07 · objeto `requirementCategory` | confirmed | handoff §2.2 | campos: curriculumId, name, code?, minCredits, maxCredits?, position, description?, color?, icon?, timestamps. |
| REQ-08 · validación min≤max | confirmed | handoff §2.2 | si `maxCredits` definido, rechazar `minCredits > maxCredits`. |
| REQ-09 · guard de borrado | confirmed | handoff §2.2 | delete rechazado si existen `planEntry` con ese `categoryId` ("reasigna primero"). |
| REQ-10 · créditos actuales de categoría | confirmed | handoff §2.2 | consultable = suma de `credits` efectivos de sus entries. |
| REQ-11 · color e ícono modelados | confirmed | §dec-1 (valores de la maqueta) | `color` token tema up1 (`var(--up1-color-*)`) o hex; `icon` bootstrap-icons (`bi-*`). |

### Tasks previstas (con rollback)

| # | Task | Rollback |
|---|------|----------|
| T1 | `objects/planEntry.json` + índices (REQ-01,02,05,06) | eliminar archivo + `reset-mods` |
| T2 | resolvers create/read/update + `.schema.graphql`; lectura calcula `credits` efectivo (REQ-03) y deriva electividad (REQ-04) | revertir resolvers |
| T3 | `objects/requirementCategory.json` + validación min/max + guard de borrado en resolver (REQ-07,08,09,11) | eliminar archivo + revertir resolver |
| T4 | derivación "créditos actuales" de la categoría (REQ-10) | revertir resolver de lectura |
| T5 | lang `es_CL@planEntry`/`@requirementCategory` + layouts RecordList/RecordDetail (REQ-11) | revertir lang/layouts |
| T6 | `seed/`: planEntries + categorías de la maqueta (Núcleo, Habilidades Profesionales, Electivos de Profundización, Proyecto de Grado) con colores | quitar seed |

### Dependencias

- **Depende de:** MC-01 (enum `progression`, para la regla de `period` por modo).
- **Habilita:** MC-03 (bloque electivo usa `planEntry.blockId`), MC-05/06 (la malla pinta `planEntry`), MC-04 (contratos MCP), MC-07 (líneas).
- **Patrón:** `objects/CurricularSection.json` + sus resolvers/seed.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1267-sp5` en `mods/curriculum-design` (creada desde `develop`; mod-only; nunca `develop`/`main`) — RULE-dev-004 |
| Base branch | `develop` |
| DB state | UPU; `reset-mods`/sync tras crear objetos |
| Services | object-manager (codegen/sync), suite (layouts) |
| Test data | seed del mod + categorías de la maqueta |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Un mod de up1 NO puede registrar field resolvers de TIPO GraphQL. El scanner del platform (object-manager/src/graphql/resolverIndex.js: loadResolversFromDirectory) solo recolecta exports cuyo nombre incluye 'query'/'mutation' (case-insensitive) y los spreadea en Query/Mutation; el unico type resolver es core_FieldDefinition hardcoded. Consecuencia: campos derivados de lectura (effectiveCredits, isElective REQ-03/04; currentCredits REQ-10) NO se entregan como '.schema.graphql extend type + resolver de campo' (devolverian null). Patron correcto = curriculum-read.resolver.js: override de getInstance/listInstances (Query) que enriquece item.data por objectType (batch findMany). Invalida DEC-LOCAL-01; reshape S1.T2 y S2.T3. | developer | S1 | refined | RULE-curriculum-design-017 |
| L2 | El codegen de up1 NO honra metadata.indexes de los objetos del mod: el schema.prisma generado de planEntry NO tiene @@index pese a declararlos, y CurricularSection (objeto en produccion que tambien declara metadata.indexes) tampoco los tiene. Los unicos @@index del schema (11) son de modelos core. Consecuencia: REQ-05 (indices planId/categoryId/blockId/(planId,period,position)) NO es entregable via metadata.indexes en el JSON del mod — es un gap de plataforma, no error de autoria. Aceptable para SP5 (escala chica, mismo estado que CurricularSection en prod); si la performance importa, requeriria un mecanismo de migracion fuera del JSON (core). Hallazgo adicional verificado post-sync: la nullability del schema la decide el array `required[]` del JSON, NO el campo `not_null` — `kind` (not_null:true pero ausente de required) salio `planEntryKind? @default(Course)`, consistente con `Activity.isCurrent Boolean? @default(true)` de MC-01; el enum Postgres igual constrana valores (TC-09 vale) y `period` (en required) salio `Int` no-nullable (TC-01 vale). | developer | S2 | refined | RULE-curriculum-design-018 |
| L3 | Error conceptual corregido (feedback del dev sobre la maqueta UPONE-1272): planEntry y requirementCategory NO son objetos top-level del menu — son HIJOS del Curriculum (Plan de estudios), igual que CurricularSection es hijo de Activity. Se ven EMBEBIDOS en el detalle del plan: tab 'Líneas de formación' (requirementCategory) y 'Malla curricular' (planEntry, componente visual = MC-05/06). Mecanismo up1: (1) lo que pone un objeto en el menu de objetos es tener un layout default_<Obj>_list (RecordList) top-level; CurricularSection NO lo tiene -> no aparece en el menu, solo embebido. (2) los hijos se embeben en el layout VIEW/EDIT del padre via `tabs` + elementos schema `type: 'record-list'` con `objectName`+`columns`+`filters` sobre {{parentId}} (ej. default_Activity_view embebe rt__*__curricularsection filtrando ownerId={{parentId}}). (3) la relacion se declara en metadata.directChildren (FK) / polymorphicChildren del padre. FIX MC-02: borrar default_{requirementCategory,planEntry}_list (sacar del menu), embeber ambos como tabs en default_Curriculum_view (requirementCategory filtrado por curriculumId, planEntry por planId), agregar directChildren a Curriculum.json. Conservar create/edit/view de requirementCategory + view de planEntry (los usan los modales embebidos). | developer | S3 | refined | TICKET-093 (ticket nuevo — placement/embedding) |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-06-25T15:19:21Z | open → super | dev: `/dkc 082 super autopilot` | inicio del ticket |

### Plan de sessions (preplanificacion)

3 sessions previstas. **Esqueleto producido por `intake-explore`.** El detalle final
(tasks asignadas, gate criteria) lo completa `design-feature` al generar el spec.
Cada session puede subdividirse o colapsarse durante execute si el tamano real difiere.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | objeto `planEntry` + resolvers (créditos efectivos REQ-03, electividad derivada REQ-04) + codegen/sync | 1 | T2 | T1, T2 | auto | codegen+sync limpios; unit del mod verde (TC-01..04, TC-09) |
| S2 | objeto `requirementCategory` + validación min≤max + guard de borrado + créditos actuales | 2 | T2 | T3, T4 | auto | unit del mod verde (TC-05..08); codegen+sync limpios |
| S3 | lang + layouts RecordList/RecordDetail + seed (maqueta) + smoke UPU | 3 | T3 | T5, T6 | ⚑ fuerte | seed corre sin error en UPU; layouts renderizan en suite; aceptación DB-gated |

**Notas del esqueleto**:
- Numeración continua (DET-20): el ticket no tenía `### Session N` previas → arranca en S1.
- S1→S2 dependen del mismo flujo codegen/sync; se ejecutan en serie (1 dev).
- S3 es ⚑ fuerte: toca la DB del tenant UPU (seed) y la suite corriendo (layouts) — aceptación DB-gated; en super autopilot la frontera DB-gated + push se respeta (memoria `feedback_super_execute_db_gated_boundary`).
- mod-only (RULE-dev-004): nunca tocar core; no commitear artefactos de sync/seed (Base, schema generado, typeDefs).

### Session 1 — 2026-06-25 — objeto `planEntry` + resolvers derivados + sync [phase: execute]

**Tipo**: auto
**Validation tier**: T2 (unit + coverage)

**Objetivo**: crear el objeto `planEntry` (campos, enum kind, FKs, índices) y sus field resolvers derivados (`effectiveCredits` por herencia, `isElective` por blockId), corriendo codegen + sync limpio en UPU.

**Tasks completadas**:
- [x] S1.T1 — crear `objects/planEntry.json` (campos REQ-01, period not_null, enum kind, FKs, índices, defaultLayoutType)
- [x] S1.T2 — field resolvers derivados (`effectiveCredits` REQ-03, `isElective` REQ-04) + codegen/sync
- [x] S1.GATE — gate de sync Session 1 (tier T2)

**Validación del tier** (T2): suite del mod `npx vitest run --project '!storybook'` = **765/765 PASS** (46 files), +17 nuevos (planEntryEnrich), 0 regresión sobre el baseline 748. eslint de los 3 archivos tocados = EXIT 0. `planEntry.json` parsea + declara `period` not_null + enum `kind`. **Codegen + sync vivo contra UPU NO ejecutado — DB-gated, diferido al dev** (precedente MC-01/TICKET-081 S1): TC-01 (rechazo de create sin period) y TC-09 (rechazo de kind inválido) se validan a nivel inspección del objeto; el rechazo runtime lo enforza el schema generado post-sync.

**Quality review (DET-23)** — loop dual-judge (DET-35, T2): 2 jueces ciegos `balanced` en paralelo (Judge A `ad1fb40`, Judge B `ac7248c`), handoff idéntico (spec + REQ-01..06 + execute_scope + diff + kb_refs), read-only. Self-report verificado (DET-33): `git status` del submódulo del mod limpio (solo los 4 cambios esperados, sin contaminación), vitest re-corrido 765/765. Sin disputa entre jueces → sin escalación a adjudicador `reasoning`.

| Dimensión | A | B | Veredicto | Nota |
|-----------|---|---|-----------|------|
| 1. Calidad/corrección | pass | pass | pass | enrichment sigue el patrón `enrichCurriculumRows`; credits=0 maneja override correcto (no cae al fallback) |
| 2. Lint/formato | pass | pass | pass | eslint EXIT 0 |
| 3. Tipado | warn | warn | **info (theoretical)** | JS puro + `credits` podría llegar string → concat en `sumCurrentCredits`. `is_real_usage=false` en ambos: el schema tipa `credits` como `number` → path contrived. Defensa con `Number()` opcional al cablear currentCredits en S2.T3 |
| 4. Testing | pass | pass | pass | 17 tests, assertions con valores concretos (=6, =4, false/true, toHaveBeenCalledOnce) |
| 5. Escalabilidad | pass | pass | pass | batch findMany único (sin N+1), dedup de activityIds |
| 6. Mantenibilidad | pass | pass | pass | helper puro testeable; deferral de categoryId FK documentado |
| 7. Claridad | pass | pass | pass | — |
| 8. A11y | n/a | n/a | n/a | backend |
| 9. Storybook | n/a | n/a | n/a | backend |
| 10. Error-handling | pass | pass | pass | enrichment defensivo ante data ausente / sin accesor Activity |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Resultado global**: ambos jueces `approve`, scope_ok, tests_green. Cero CRITICAL, cero real WARNING confirmado → **APPROVED**. Findings restantes = info (no fix). Loop dual-judge: 0 iteraciones de fix.

```dkc:gate-telemetry
session: S1
work_type: implement
tier: T2
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 0
adjudicator_invocations: 0
diff_chars: 6400
est_tokens: 1730
span_seconds: 1320
```

**Commit DET-27**: `9223db7` UPONE-1345 feat(curriculum-design): planEntry object + derived effectiveCredits/isElective reads (repo mod, rama UPONE-1267-sp5, modo limpio por `external`).

### Session 2 — 2026-06-25 — objeto `requirementCategory` + validaciones + derivados [phase: execute]

**Tipo**: auto
**Validation tier**: T2 (unit + coverage)

**Objetivo**: crear el objeto `requirementCategory` (línea de formación), validar min≤max en create/update (cableado en los overrides singleton del mod), agregar la FK `planEntry.categoryId`→requirementCategory + guard de borrado (REQ-09), y `currentCredits` por read-enrichment (REQ-10).

**Tasks completadas**:
- [x] S2.T1 — crear `objects/requirementCategory.json` (REQ-07,11: curriculumId FK, name, minCredits, maxCredits?, color/icon)
- [x] S2.T2 — validación min≤max (REQ-08): helper `creditRange.js` + wire en sectionValidation (create) y polymorphicUpdate (update)
- [x] S2.T3 — FK categoryId + guard de borrado (REQ-09, A/B empírico) + `currentCredits` enrichment (REQ-10)
- [x] S2.GATE — gate de sync Session 2 (tier T2)

**Validación del tier** (T2): suite del mod `npx vitest run --project '!storybook'` = **788/788 PASS** (48 files), +23 sobre el baseline de S1 (765): creditRange (13) + requirementCategoryGuard (10). eslint de los archivos tocados = EXIT 0. `requirementCategory.json` + `planEntry.json` parsean. **Codegen + sync vivo contra UPU diferido al dev** (DB-gated): el dev debe correr `npm run sync` para materializar `requirementCategory` + la FK `planEntry.categoryId` con `onDelete: Restrict` (se confirmó que el codegen honra `onDelete` — 25 en el schema UPU). TC-05..08 verificados a nivel unit (logica de dominio); el enforcement runtime (FK + delete) post-sync.

**Quality review (DET-23)** — loop dual-judge (DET-35, T2): 2 jueces ciegos `balanced` en paralelo (Judge A `a572ca8`, Judge B `ab09162`), handoff idéntico (spec + REQ-07..11 + execute_scope + diff + kb_refs), read-only. Self-report verificado (DET-33): `git status` del submódulo del mod limpio (solo los cambios de S2), vitest 788/788. CONSTRAINT H7 verificado por ambos (grep `deleteInstance` → solo el archivo nuevo).

| Dimensión | A | B | Veredicto | Nota |
|-----------|---|---|-----------|------|
| 1. Calidad/corrección | pass | pass | pass | validate-then-delegate; dispatch por objectType; helpers puros |
| 2. Lint/formato | pass | pass | pass | eslint EXIT 0 |
| 3. Tipado | pass | pass | pass | JSDoc + coerción `Number()` explícita |
| 4. Testing | pass | pass | pass | TC-05..08 + multi-categoría aislado; gap "solo minCredits" notado por B → **test agregado** (788) |
| 5. Escalabilidad | pass | pass | pass | currentCredits: doble batch (planEntry→Activity), sin N+1 |
| 6. Mantenibilidad | pass | pass | pass | patrón modalityDefault/lineageUniqueness; H7 documentado |
| 7. Claridad | pass | pass | pass | — |
| 8. A11y | n/a | n/a | n/a | backend |
| 9. Storybook | n/a | n/a | n/a | backend |
| 10. Error-handling | warn (A) | pass (B) | **info (suspect)** | A: fallback de casing del accesor Prisma → no-op silencioso. Single-judge (B no lo marcó) + `is_real_usage=false` (up1 usa `requirementCategory` lowercase). No-fix |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Resultado global**: ambos `approve`, scope_ok, tests_green. Cero CRITICAL, cero real WARNING confirmado (dim-10 = suspect single-judge + teórico) → **APPROVED**. Gap de test info (B) resuelto agregando 1 caso. Loop dual-judge: 0 iteraciones de fix (1 test de cobertura agregado, no fix de bug).

```dkc:gate-telemetry
session: S2
work_type: implement
tier: T2
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 0
adjudicator_invocations: 0
diff_chars: 14300
est_tokens: 3865
span_seconds: 1680
```

**Commit DET-27**: `adffb87` UPONE-1345 feat(curriculum-design): requirementCategory object + min<=max validation + delete guard + currentCredits (repo mod, rama UPONE-1267-sp5, modo limpio).

### Session 3 — 2026-06-25 — lang + layouts + seed + smoke UPU [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3 (regression + smoke UI)

**Objetivo**: completar la capa de presentación y datos: lang es_CL de ambos objetos (incl. labels del enum `kind`), layouts RecordList/RecordDetail estándar, y seed de la maqueta (4 líneas de formación + planEntries). Smoke en la suite contra UPU (DB-gated).

**Tasks completadas**:
- [x] S3.T1 — lang `es_CL@planEntry.json` + `es_CL@requirementCategory.json` (labels + enum kind)
- [x] S3.T2 — layouts RecordList/RecordDetail de ambos objetos (patrón estándar)
- [x] S3.T3 — seed `_data-malla.js` (maqueta) + registrar en seed.js + smoke UPU
- [x] S3.GATE — gate de sync Session 3 (tier T3, ⚑ fuerte)

**Validación del tier** (T3): suite del mod `npx vitest run --project '!storybook'` = **788/788 PASS** (48 files). eslint de los archivos JS tocados = EXIT 0. 6 layouts + 2 lang + seed parsean. 3 baselines de test actualizados por adiciones deliberadas (47 layouts, +5 índices en las listas conocidas de ensureIndexes, mock `loadMalla` en seed-entry) — actualización de baseline, no debilitamiento. **Smoke contra UPU (seed-run + render de layouts en la suite) = DB-gated, PENDIENTE del dev** — es la aceptación ⚑ fuerte; requiere `npm run sync` (corre seed + ensureIndexes) + verificar la malla en la suite.

**Quality review (DET-23)** — loop dual-judge (DET-35, T3): 2 jueces ciegos `balanced` en paralelo (Judge A `a9fe219`, Judge B `a61320`), read-only. **Resultado: iterate → fix (1 iteración) → APPROVED.** Ambos jueces convergieron en 1 finding real (`is_real_usage=true`): `default_planEntry_list.json` tenía `canEdit: true` sin layout `edit` (ni archivo ni `associatedLayoutConfigs.edit`) → botón "Editar" runtime resolvería un layout inexistente. **Fix**: `canEdit: false` (consistente con `canCreate: false` — planEntry se gestiona vía la malla MC-05/06, no formulario standalone). Self-report verificado (DET-33): git submódulo limpio, vitest 788/788 post-fix.

| Dimensión | A | B | Veredicto | Nota |
|-----------|---|---|-----------|------|
| 1. Calidad/corrección | warn→**fix** | warn→**fix** | **pass (post-fix)** | canEdit:true sin edit layout → corregido a false (ambos jueces, confirmed) |
| 2. Lint | pass | pass | pass | EXIT 0 |
| 3. Tipado | pass | pass | pass | — |
| 4. Testing | warn | pass | pass | gap: loadMalla sin assert de invocación → **assert agregado** (orden post-syllabus) |
| 5. Escalabilidad | pass | pass | pass | seed batch; índices REQ-05 |
| 6. Mantenibilidad | pass | warn | pass | `prisma.Activity` PascalCase = correcto (modelo Activity, consistente con resolver/tests) — info |
| 7. Claridad | pass | pass | pass | — |
| 8. A11y | n/a | n/a | n/a | — |
| 9. Storybook | n/a | n/a | n/a | — |
| 10. Error-handling | pass | pass | pass | seed defensivo (skip sin Plan/Activities) |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Resultado global**: tras el fix, ambos resuelven a APPROVED en lo code-level. Findings restantes = info (casing correcto, index table names correctos). **El gate ⚑ fuerte NO cierra hasta el smoke DB-gated** (seed-run + render en UPU).

```dkc:gate-telemetry
session: S3
work_type: implement
tier: T3
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 1
adjudicator_invocations: 0
diff_chars: 9800
est_tokens: 2649
span_seconds: 1500
```

**Commit DET-27**: `cc0158e` UPONE-1345 feat(curriculum-design): malla lang + layouts + seed + indices (repo mod, rama UPONE-1267-sp5, modo limpio).

**Gate ⚑ fuerte — pendiente del dev (aceptación DB-gated)**: correr `npm run sync` (seed + ensureIndexes) en UPU y verificar el smoke: las 4 líneas de formación aparecen en el listado de `requirementCategory`, los layouts renderizan, y los 5 índices se crean. Con eso confirmado → `continue` → request-close (teach-close).

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01,02 | TC-01 | unit | covered |
| REQ-03 | TC-02, TC-03 | unit | covered |
| REQ-04 | TC-04 | unit | covered |
| REQ-08 | TC-05 | unit | covered |
| REQ-09 | TC-06, TC-07 | unit | covered |
| REQ-10 | TC-08 | unit | covered |
| REQ-06 | TC-09 | unit | covered |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-01 | crear `planEntry` sin `period` | REQ-01,02 | unit | objeto | crear sin period | rechazado (period requerido) | `period Int` no-nullable | `prisma/UPU/schema.prisma` model planEntry post-sync | PASS (schema) |
| TC-02 | `planEntry.credits=null`, `Activity.credits=6` | REQ-03 | unit | entry+activity | leer crédito efectivo | = 6 (heredado) | = 6 | `planEntryEnrich.test.js` "TC-02" — vitest 765/765 | PASS |
| TC-03 | `planEntry.credits=4`, `Activity.credits=6` | REQ-03 | unit | entry+activity | leer crédito efectivo | = 4 (override) | = 4 | `planEntryEnrich.test.js` "TC-03" — vitest 765/765 | PASS |
| TC-04 | entry con `blockId=null` / `=X` | REQ-04 | unit | 2 entries | leer electividad | obligatoria / electiva (sin isElective) | false / true | `planEntryEnrich.test.js` "TC-04" — vitest 765/765 | PASS |
| TC-05 | categoría `minCredits=30, maxCredits=20` | REQ-08 | unit | resolver | crear | rechazado | throw INVALID_CREDIT_RANGE | `creditRange.test.js` (create+update) — vitest 787/787 | PASS |
| TC-06 | borrar categoría con 1 `planEntry` | REQ-09 | unit | entry asignado | delete | rechazado ("reasigna primero") | throw HAS_ENTRIES "reasigna primero" | `requirementCategoryGuard.test.js` "TC-06" | PASS |
| TC-07 | borrar categoría sin entries | REQ-09 | unit | categoría vacía | delete | permitido | no lanza (count=0) | `requirementCategoryGuard.test.js` "TC-07" | PASS |
| TC-08 | categoría con 2 entries (6+4 cr efectivos) | REQ-10 | unit | 2 entries | consultar créditos actuales | = 10 | = 10 | `requirementCategoryGuard.test.js` "TC-08" | PASS |
| TC-09 | crear entry con `kind` fuera del enum | REQ-06 | unit | objeto | crear | rechazado | enum Postgres `planEntryKind {Course,Internship,Thesis}` | `prisma/UPU/schema.prisma` post-sync | PASS (schema) |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| `tests/unit/planEntryEnrich.test.js` | unit | S1.T2 | REQ-03, REQ-04 (TC-02/03/04) + helpers | vitest |
| `logic/helpers/effectiveCredits.js` | helper | S1.T2 | REQ-03/04/10 (cálculo puro) | — |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| unit mod | `npx vitest run --project '!storybook'` | 748/748 | 765/765 | +17 (planEntryEnrich), 0 regresión |

## Summary

**MC-02 — objetos base de la malla curricular (cerrado 2026-06-25).** Se crearon en el mod `curriculum-design` los dos objetos de datos de la malla, con su lógica, presentación y seed:

- **`planEntry`** (coloca una `Activity` en un período de un plan): FKs (planId→Curriculum, activityId→Activity, sourceEntryId self, categoryId→requirementCategory `onDelete: Restrict`), enum `kind {Course,Internship,Thesis}`, `period` requerido. Campos derivados por read-enrichment: `effectiveCredits` (`credits ?? Activity.credits`, REQ-03), `isElective` (`blockId != null`, REQ-04).
- **`requirementCategory`** (línea de formación): `curriculumId`, `name`, `minCredits`/`maxCredits` (validación min≤max REQ-08 en create+update), `color`/`icon`, guard de borrado A+B (REQ-09, "reasigna primero"), `currentCredits` derivado (REQ-10).
- **Presentación + datos**: lang es_CL (labels + enum `kind`), layouts RecordList/RecordDetail, seed de la maqueta (4 líneas de formación + planEntries), 5 índices REQ-05 vía `ensureIndexes`.

**Métricas**: 3 sesiones · 3 commits de código (`9223db7`, `adffb87`, `cc0158e`) en `UPONE-1267-sp5` · vitest **748→788** (+40, 0 regresión) · eslint EXIT 0 · 3 quality gates con loop dual-judge (DET-35) APPROVED (S3 atrapó un bug real: `planEntry_list canEdit` sin layout edit → fix). SP: published 5 / estimated 5 / **executed 2** (sessions-heuristic; speedup LLM).

**REQ**: 11/11 cubiertos (REQ-05 entregable vía el workaround `ensureIndexes`). Runtime verificado por sync sobre UPU (objetos + enum + FKs + `onDelete: Restrict` materializados; seed de la maqueta; render en la suite).

**Learns promovidos**:
- **L1 → RULE-curriculum-design-017**: un mod no puede registrar field resolvers de tipo GraphQL → read-enrichment en el override de lectura.
- **L2 → RULE-curriculum-design-018**: el codegen ignora `metadata.indexes` (usar `ensureIndexes`) y la nullability la decide `required[]` (no `not_null`).
- **L3 → TICKET-093 (nuevo)**: `planEntry`/`requirementCategory` deben verse como **hijos del Curriculum** (tabs Líneas de formación + Malla curricular embebidas), no como objetos de menú. Corrección de presentación llevada a ticket nuevo (el núcleo de datos de MC-02 quedó completo y aprobado — decisión del dev de no expandir el ticket que cierra).

**Decisiones**: DEC-LOCAL-01 (derivados por read-enrichment), DEC-LOCAL-02 (validación en overrides singleton, CONSTRAINT H7), DEC-LOCAL-03 (guard de borrado A+B).

**Pendiente (no bloqueante)**: TICKET-093 (placement/embedding — L3) + TICKET-094 (pickers visuales color/icon); el componente visual de la malla es MC-05/06. mod-only respetado; solo source del mod committeado (sin artefactos de sync/seed).
