---
id: TICKET-063
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1268
module: curriculum-design
autopilot: autonomous
---

# curriculum (Plan + Minor) · vista y objetos

> Ticket del SP4 creado **previo a intake** con todo el contexto, lo decidido y lo planificado embebido (autosuficiente — no referencia docs externos). Validado contra el modelo real (model-v2) el 2026-06-12.

## Request

> Ticket externo: [UPONE-1268](https://u-planner.atlassian.net/browse/UPONE-1268) — épica de la familia curriculum (Curriculum Design). Confirmar id de épica en intake (DET-19).

Crear el objeto **`curriculum`** (contenedor curricular tipado) con los RecordTypes **`Plan`** y **`Minor`**, y su **vista**: recordList + detalle + crear + editar + eliminar (real). Alcance = **"solo la información del objeto"** (campos + edit/delete), sin tabs de hijos. Sigue el mismo encuadre que UPONE-1260 (academicProgram).

### Decisiones acordadas con el dev (pre-intake)

- **D-A** (forma del recordList — RESUELTA): **una sola lista** de `curriculum` con columna `recordType` (Tipo). La separación por tipo (Plan, Minor, y futuros RT) la resuelve el **usuario final** con la capacidad de up1 de **vistas con filtros guardadas** — cada usuario crea su vista filtrada por `recordType` cuando la necesita. **No** se crean layouts separados por tipo. Un solo `default_curriculum_list.json`; el filtrado Plan/Minor **no se hardcodea** → escala sin tocar layouts al sumar RT (Major, Track, Concentration…).
- **D-B** (RecordType discriminador): `objects/curriculum.json` + `RecordTypes/rt__Plan__curriculum.json` + `rt__Minor__curriculum.json`. El `Plan` declara los campos temporales (`progression`, `totalCredits`, `totalPeriods`, `periodType`, `rotationConfig`); el `Minor` **no**.
- **D-C** (detalle/create condicional por tipo): layouts por recordType, o un layout con campos condicionales (a definir en design).
- **D-D** (FK polimórfica): `ownerType` / `ownerId` (academicProgram | institution).
- **D-E** (versionado): `curriculum` es **versionable** por `previousVersionId`. Unicidad propuesta: `uniqueConstraints [[previousVersionId, version]]` (= activity); `code` **NO** único (se comparte entre versiones del mismo linaje). Esto habilita UPONE-1270 (clonar/versionar).
- **D-F** (sin hijos en v1): planEntry, requirement, milestone, perfiles, etc. están en draft → **fuera de SP4**. Sin tabs de hijos.
- **D-G** (anotado, futuro — D7): el `Minor` puede anclarse a `institution` (compartido) y ofrecerse en varios programas vía `curriculumAssignment` (M:N). No afecta a SP4 (solo el objeto), pero queda anotado para el diseño de la vista del programa.

**RecordList (columnas):** Nombre · **Tipo (Plan/Minor)** · Código · Versión · Dueño (programa/institución) · Estado.
**Detalle (campos):** base = name, code, recordType, owner (ref), appearsInDiploma, version, estado, externalId · **+ solo si Plan**: progression, totalCredits, totalPeriods, periodType.
**Acciones:** editar, eliminar (real).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement (objeto nuevo + vista nueva) |
| Tipo de cambio | single (mod curriculum-design: objeto + RecordTypes + 4 layouts + i18n + seed) |
| Módulo principal | curriculum-design |
| Módulos afectados | curriculum-design. object-manager: `sync`/codegen (Prisma + GraphQL) para el objeto nuevo |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | yes | recordList + detalle + create + edit del `curriculum` (4 layouts) |
| Data model | yes | nuevo objeto `curriculum` + 2 RecordTypes (`Plan`, `Minor`) + FK polimórfica `ownerType`/`ownerId` |

### Draft status

| Campo | Valor |
|-------|-------|
| Aprobado | ✓ auto-aprobado por autopilot `super` (2026-06-16) — `approved_by: autopilot` |
| Version aprobada | 1 |
| Path | [TICKET-063.draft/](TICKET-063.draft/) — `intent.md` (approved), `data-model.prisma`, `preview.html` |

## Triage

Complejidad estimada: **media-alta (~3 SP)**. El patrón base "configuración de vista y objetos" (6 artefactos de 1260) es conocido; el delta que lo encarece: RecordType discriminador (Plan vs Minor con campos distintos), detalle/create condicional por tipo y FK polimórfica de owner. Libre de dependencias entre tickets del SP4.

### Hipótesis

| # | Hipótesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El patrón "configuración de vista y objetos" de 1260 aplica (6 artefactos: objeto, app.json, sync, 4 layouts, i18n, seed) | ✓ confirmada | Plantilla literal de 1260 ([ticket-059](ticket-059.md), ejecutado: ~2 SP) |
| H2 | Una sola lista con columna Tipo escala sin tocar layouts al sumar RT (D-A) | ✓ decisión cerrada | Capacidad de vistas-con-filtros guardadas de up1 (usuario final filtra por `recordType`) |
| H3 | Los campos temporales solo del `Plan` se modelan vía RecordType (layout por RT o campos condicionales) | ✓ confirmada | **Ambos mecanismos viables sin core.** (A) layouts separados por RT — patrón `CurricularSection` (7 RTs → `default_rt__<Type>__curricularsection_<view\|create\|edit>.json`). (B) layout único + `conditions: [["recordType","==","Plan"]]` en los fields temporales — precedente `mods/object-manager-editor/config/layouts/fielddefinition-create.json:136-165`. **NO existe `visibleWhen`/`showIf`** (la prop nativa es `conditions`, RecordDetail la pasa a Vueform). Elección A/B → `design-feature`. |
| H4 | La FK polimórfica `ownerType`/`ownerId` la soporta el layout (picker academicProgram \| institution) | ✓ confirmada | **Viable sin core.** No hay picker polimórfico nativo (`CurricularSection.ownerType/ownerId` se setea server-side; `Offering.activityId` es FK simple filtrada). **Solución sin core**: `ownerType` (enum select) + un select por destino (`references: AcademicProgram` / `references: Institution`) con `conditions: [["ownerType","==","<val>"]]`, resuelto a `ownerId` en submit. Ref: `layout/src/layouts/RecordDetail.vue:2850-2893` (references estático), `conditions` confirmado en object-manager-editor. ⚠️ ver riesgo H4.1. |
| H4.1 | `conditions` re-evalúa en vivo en create-mode (campo dependiente sin valor inicial) | ~ inferred | `conditions` se evalúa contra el record; en create el `ownerType` puede no estar poblado al render (Vueform reactivo debería re-evaluar al cambiar). **Validación empírica en execute** (smoke del create de un Plan con cada owner). Fallback si falla: dos selects siempre visibles o `ownerType` con default. |
| H5 | Versionado (`previousVersionId`) + `uniqueConstraints [[previousVersionId, version]]` habilita 1270 | ✓ confirmada | Bloque `versioning` exacto de `activity` (`mods/curriculum-design/objects/activity.json:27-39`): `linkageField: previousVersionId`, `versionField: version`, `versionStrategy: increment` + `uniqueConstraints: [["previousVersionId","version"]]`. Replicable; `requiredCapability` → `curriculum:version`. |

### Context found

- **Objeto (model-v2):** `curriculum` es el **contenedor curricular tipado** por `recordType` (Plan, Minor, Major, Concentration, Track, Mención, Certificate, Diploma). Anclaje polimórfico `ownerType` = academicProgram | institution. **Versionado** por `previousVersionId`. **Solo el `Plan`** tiene semántica temporal (`progression`, `totalCredits`, `totalPeriods`, `periodType`, `rotationConfig`). Tiene hijos (planEntry, requirement, milestone, perfiles) casi todos hoy en draft → fuera de alcance.
- **Jerarquía (capa B):** `academicProgram → curriculum (Plan/Minor/…) → planEntry → activity ──MADS──► offering`.
- **Unicidad (propuesta):** `uniqueConstraints [[previousVersionId, version]]`; `code` NO único (compartido entre versiones). La DB no frena `code`/`name` duplicado entre linajes → el enforcement de identidad lo aporta 1270 (unicidad por linaje en el resolver).
- **Secciones:** `CurricularSection.ownerType` ya admite `curriculum` (las secciones del curriculum no están en alcance — solo el objeto).
- **Rules del módulo:** `RULE-mods-003` (**must**, `sync`), `RULE-dev-006` (**must**, tests + arranque), `RULE-platform-006` (**must**, PascalCase en títulos de objeto/RecordType).
- **Dependencia:** **libre** (no depende de otros tickets del SP4). **Habilita** UPONE-1270.
- **Warnings:**
  1. ⚠️ **PascalCase obligatorio** (RULE-platform-006) en el title del objeto y los RecordTypes.
  2. ⚠️ Restart de object-manager post-`sync` (sin hot-reload de typedefs del mod).
  3. ⚠️ **Drift de BASEMODEL al seedear**: no usar `--accept-data-loss`; regenerar baseline si hay drift (lección de 1260).
  4. ⚠️ **Gotcha TICKET-054 (config-driven enforcement):** si se declara `uniqueScopedBy`/`uniqueConstraints`, verificar que el `@@unique` real quedó aplicado en la DB del tenant (falla silencioso si el sync no lo aplicó).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | **`UPONE-1261-academic-program`** (rama del mod, confirmada por el dev 2026-06-16). NO se crea UPONE-1268: `curriculum` referencia `AcademicProgram`, que solo existe en esta rama. object-manager queda en `develop` (output de sync regenerable, NO commiteado — `execute_scope=mods/` only) |
| Base branch | `develop` (del mod) |
| DB state | **cambio de schema** (objeto nuevo) → `npm run sync` (codegen Prisma + GraphQL) + restart object-manager |
| Services | object-manager (GraphQL :4000), suite |
| Test data | `seed/_data-curriculum.js` (a crear) — Plans y Minors de ejemplo idempotentes, con owner academicProgram/institution |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El layout engine de up1 NO tiene `visibleWhen`/`showIf` ni picker polimórfico nativo, pero SÍ soporta `conditions: [[campo, op, valor]]` (RecordDetail → Vueform). Un mismo mecanismo resuelve campos condicionales por RecordType Y owner polimórfico (select por destino + `conditions` sobre `ownerType`), sin tocar core. Ref: `layout/src/layouts/RecordDetail.vue:2850-2893`, `mods/object-manager-editor/config/layouts/fielddefinition-create.json:136-165`. | intake-explore (researcher) | (pre-S1) | refined | RULE-layout-038 |
| L2 | Riesgo abierto: `conditions` se evalúa contra el record; en create-mode el campo dependiente puede no estar poblado al render. Validar empíricamente antes de comprometer layout único. | intake-explore | (pre-S1) | refined | RULE-layout-038 |
| L3 | En up1 los RecordTypes NO son columnas nullable de la tabla base: el codegen genera **tablas de extensión** 1:1 (`rt__Plan__curriculum`, `rt__Minor__curriculum`) con FK `curriculumId`. Los campos PLAN-ONLY viven en `rt__Plan__curriculum`, no en `Curriculum`. Impacto: el data-model.prisma del draft (columnas nullable) era una aproximación; el seed (S3) y los layouts (S2) deben contemplar la tabla de extensión. | developer (S1.T5) | 1 | refined | RULE-mods-045 |
| L4 | Campo JSON en objeto del mod: usar `"type": "object"` + `static_default: "{}"` (precedente `BibliographyReference.metadata`) → codegen lo mapea a `jsonb`. NO existe `"type": "json"`. | developer (S1.T5) | 1 | refined | RULE-mods-046 |
| L5 | **Colisión de objeto con override de tenant**: el tenant UPU ya tenía un `Curriculum` career-based migrado (commit `32d6b25`) en `objects/tenants/UPU/Base/`. Los objetos del tenant REEMPLAZAN totalmente al Base (`fileParsing.js:83`, Map por filename) → el GraphQL de UPU sirve el v1 y eclipsa el v2 del mod. Descubierto en S2 (introspección), no en intake. **Promovido a [RULE-platform-008]** (verificar overrides de tenant en planning) + **[DECISION-017]** (convergencia v1→v2). | developer (S2.T3) | 2 | refined | RULE-platform-008, DECISION-017 |
| L6 | **Owner polimórfico sin core ni campos virtuales**: `references` es estático (no cambia por otro campo) y los selects virtuales chocan con el bug de TICKET-067 (campos fuera de schema → Prisma los rechaza). La solución mod-only es `autoPopulate` + `populateItems` + composable propio (`modsComposables/useOwnerIdOptions.ts`, sync lo proyecta a `layout/src/composables/`): el field `ownerId` (real en el objeto) declara `items:[]` + `watchFields:["ownerType"]` y el composable repuebla las opciones del objeto destino. Ref: `RecordDetail.vue:693-902` (autoPopulate), `useRoleDefinitions.ts` (patrón). | developer (S2.T1) | 2 | refined | RULE-layout-038 |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| — | — | — | — |

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-06-16T08:09:53-0400 | false → super | dev trigger "super autopilot" (arranque del ticket) | proximo gate |

### Plan de sessions (preplanificacion)

3 sessions previstas. **Esqueleto producido por `intake-explore`.** El detalle final (tasks asignadas, gate criteria específicos) lo completa `design-feature` al generar el spec. `design-feature` puede colapsar S2+S3 si el tamaño real es menor (~3 SP cabe en 2-3 sessions).

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Data model: `Curriculum.json` + RecordTypes `Plan`/`Minor` + bloque `versioning` + FK polimórfica `ownerType`/`ownerId` + `uniqueConstraints`; alta en `app.json`; `npm run sync` (codegen Prisma + GraphQL) + restart object-manager | DataModel | T2 | 4-5 (objeto, 2 RT, app.json, sync+verificar `@@unique` aplicado) | ⚑ fuerte | Schema cambia: sync sin drift no controlado (warning #3), `@@unique` realmente aplicado en DB del tenant (gotcha TICKET-054, warning #4), GraphQL expone `curriculum` |
| S2 | Layouts + i18n: recordList único (columna Tipo) + view/create/edit con owner polimórfico (`conditions`) + campos del Plan condicionales (decisión H3 A/B en design) + `es_CL@Curriculum.json` (+ RT i18n si aplica) | UI | T2 | 4-6 (4 layouts base o 1 list + 6 por RT, según H3; i18n) | ⚑ fuerte | Validación empírica H4.1 (`conditions` en create del owner) — TC-7; PascalCase en títulos (RULE-platform-006) |
| S3 | Seed + smoke + cierre: `_data-curriculum.js` idempotente (Plans + Minors, owners variados academicProgram/institution) + smoke UI TC-1..7 + regression del módulo (RULE-dev-006) | Validación | T3 | 2-3 (seed, smoke, regression) | ⚑ fuerte | TC-1..7 verdes con evidencia (DET-25); seed idempotente sin `--accept-data-loss` (warning #3); regression sin nuevos rojos |

**Notas del esqueleto**:
- **Riesgo S1**: schema change en objeto nuevo → drift de BASEMODEL al seedear (warning #3) y falla silenciosa de `@@unique` si el sync no lo aplica (gotcha TICKET-054, warning #4). Verificación explícita del índice en DB como task de S1.
- **Riesgo S2/H4.1**: `conditions` en create-mode para el owner polimórfico — validar empíricamente; fallback documentado en H4.1.
- **Branching (DET-30)**: pre-execute, resolver rama del ticket — object-manager hoy en `develop` (protegido), mod en `UPONE-1261-academic-program` (rama de otro ticket). Bloqueante de inicio a confirmar con el dev en `design-transition-to-execute` (acción compartida, siempre-pregunta en `super`).
- **Numeración continua** (DET-20): no hay sessions previas registradas → el plan arranca en S1.

### Session 1 — 2026-06-16 — DataModel: objeto Curriculum + RecordTypes + versionado + sync [phase: execute]

**Tipo:** ⚑ fuerte
**Validation tier:** T2

parallel_groups: [[S1.T1, S1.T2, S1.T3]]

**Tasks completadas**:
- [x] S1.T1 — Crear `objects/Curriculum.json` (campos comunes, owner polimórfico, bloque versioning, uniqueConstraints, code NO único, status enum)
- [x] S1.T2 — Crear `RecordTypes/rt__Plan__curriculum.json` (properties temporales PLAN-ONLY)
- [x] S1.T3 — Crear `RecordTypes/rt__Minor__curriculum.json` (sin properties adicionales)
- [x] S1.T4 — Agregar `"Curriculum"` a `defaultObjects` en `config/app.json`
- [x] S1.T5 — `npm run sync` + restart; verificar `model Curriculum` + `@@unique([previousVersionId, version])` en schema y aplicado en DB del tenant; GraphQL introspection
- [x] S1.GATE — Gate de sync Session 1 (tier T2): codegen + @@unique en DB + GraphQL + quality review

**Validación del tier (T2)**:
- `npm run sync` **3/3 OK** (object-manager + layout + suite, 0 errores) tras crear los 3 JSON + alta en app.json. Re-corrido tras correcciones del reviewer (rotationConfig + totalCredits), **3/3 OK** de nuevo.
- Codegen: `model Curriculum` generado en `prisma/{BASEMODEL,UPU}/schema.prisma` con enums `CurriculumRecordType`/`CurriculumOwnerType`/`CurriculumStatus`, FK reflexiva `previousVersion`, FK `institution`, y tablas de extensión `rt__Plan__curriculum`/`rt__Minor__curriculum`.
- `@@unique([previousVersionId, version])` **aplicado en DB** del tenant UPU — índice `Curriculum_previousVersionId_version_key` verificado vía `pg_indexes` (gotcha TICKET-054 OK). `db push --accept-data-loss` autorizado por el dev (tabla vacía, 0 filas → sin pérdida real).
- Columnas `rt__Plan__curriculum` verificadas en DB: `totalCredits → integer`, `totalPeriods → integer`, `rotationConfig → jsonb`, `progression/periodType → text`.
- GraphQL: `type Curriculum` + query `curriculum: Curriculum!` generados en `typeDefs/dynamic.js`. Introspección en vivo (server arriba) diferida a S2/S3 (smoke).

**Quality review (DET-23)** — reviewer aislado (sub-agente contexto limpio, mandatorio en `super` + gate ⚑ fuerte):

| # | Dimensión | Veredicto | Nota |
|---|-----------|-----------|------|
| 1 | Calidad de código | pass | JSON bien formado; shape consistente con activity (versioning) y AcademicProgram |
| 2 | Lint | pass | Sin llaves duplicadas ni campos mal tipados |
| 3 | Tipado | pass | tras corrección: `totalCredits → integer` (era number); enums cerrados correctos |
| 4 | Testing | n/a | DataModel puro; smoke en S3 |
| 5 | Escalabilidad | pass | RecordTypes nuevos no tocan el objeto base |
| 6 | Mantenibilidad | pass | descriptions claras, naming consistente con el mod |
| 7 | Claridad | pass | tras corrección: `rotationConfig` agregado (PLAN-ONLY, jsonb) — data model completo |
| 8 | Accesibilidad | n/a | sin UI en S1 |
| 9 | Storybook | n/a | — |
| 10 | Error handling | n/a | JSON declarativo |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 2 (S2: layouts + i18n + validacion H4.1)
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

- **Veredicto inicial**: `iterate` — 2 hallazgos warn: (W1) `rotationConfig` ausente en rt__Plan (debía estar en el data model desde S1 para evitar migración en S2); (W2) `totalCredits` era `number`, el spec dice `int`.
- **Correcciones aplicadas + re-sync + re-verificadas en DB** (rotationConfig→jsonb, totalCredits→integer) → **Resultado global: pass**.
- Scope confirmado dentro de `mods/curriculum-design/` (output de OM regenerable, no commiteado).

**Commit DET-27**: `3f8c5f0` UPONE-1268 feat(curriculum-design): objeto Curriculum + RecordTypes Plan/Minor (rama `UPONE-1261-academic-program` del mod; modo limpio external). Output de sync en object-manager NO commiteado (develop, regenerable).

### Session 2 — 2026-06-16 — UI: 4 layouts + owner polimórfico + i18n + validación H4.1 [phase: execute]

**Tipo:** ⚑ fuerte
**Validation tier:** T2

parallel_groups: [[S2.T1, S2.T2]]

**Tasks completadas**:
- [x] S2.T1 — Crear los 4 layouts `default_Curriculum_{list,view,create,edit}.json` (layout único + `conditions` para campos del Plan y owner polimórfico — DEC-LOCAL-01; delete real en list)
- [x] S2.T2 — Crear `lang/es_CL@Curriculum.json` (column.* + enums.* de recordType/ownerType/status/progression/periodType)
- [D] S2.T3 — `npm run sync` + restart + validación empírica H4.1: smoke del create de un Plan con cada owner (programa/institución) — deferred: Smoke end-to-end bloqueado: tenant UPU sirve Curriculum v1 career-based que eclipsa el v2. Resuelve TICKET-068 (convergencia). Codigo S2 validado estructuralmente (layouts en DB + composable sync + GraphQL)
- [x] S2.GATE — Gate de sync Session 2 (tier T2): validar H4.1 con evidencia, PascalCase, quality review

**Validación del tier (T2 — estructural; empírica diferida)**:
- `npm run sync` **3/3 OK**: 4 layouts proyectados a `up1_layen_layout` (UPU) — verificados los 4 (`default_Curriculum_{list,view,create,edit}`); composable `useOwnerIdOptions` proyectado a `layout/src/composables/` (`New composable files synced: 1`); `es_CL@Curriculum.json` creado (0 errores i18n).
- PascalCase OK (RULE-platform-006): `Curriculum`, layouts `default_Curriculum_*`.
- **Validación empírica H4.1 (smoke create con cada owner) DIFERIDA** — bloqueada por el conflicto Curriculum v1/v2 del tenant UPU (la UI de UPU serviría el v1 career-based). Se ejecuta en [TICKET-068](ticket-068.md) tras la convergencia. La solución del owner polimórfico (`autoPopulate` + composable, L6) queda implementada y lista para validar.

**Quality review (DET-23)** — inline (gate parcial por bloqueo externo; proporcionalidad — el reviewer aislado de S1 ya cubrió el patrón de objetos del mod):

| # | Dimensión | Veredicto | Nota |
|---|-----------|-----------|------|
| 1 | Calidad de código | pass | 4 layouts + composable consistentes con el patrón (AcademicProgram layouts, useRoleDefinitions) |
| 2 | Lint | pass | JSON válido ×5; composable TS shape OK |
| 3 | Tipado | pass | enums por i18n; composable tipa el retorno `[{value,label}]` |
| 4 | Testing | n/a (diferido) | smoke empírico → TICKET-068 |
| 5 | Escalabilidad | pass | `autoPopulate` escala a más ownerTypes (mapa en el composable); conditions escala a más RT |
| 6 | Mantenibilidad | pass | composable documentado (por qué autoPopulate vs references/virtuales) |
| 7 | Claridad | pass | i18n cubre todos los campos/enums |
| 8 | Accesibilidad | warn | no verificada en UI (smoke diferido) |
| 9 | Storybook | n/a | — |
| 10 | Error handling | pass | composable: catch → `[]` (picker vacío, no rompe el form) |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Cierre del ticket con alcance parcial; smoke (S2.T3) y S3 diferidos a TICKET-068
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

- **Resultado**: pass estructural; la única dimensión bloqueada (testing/a11y en UI) depende de TICKET-068. Sin findings que requieran iterate sobre el código actual.

**Commit DET-27**: `a3292b4` UPONE-1268 feat(curriculum-design): vista Curriculum (4 layouts + i18n + owner polimorfico). Rama `UPONE-1261-academic-program` del mod; modo limpio external.

## Teaching — Intake

**Status**: done (2026-06-16). **Archivo**: [TICKET-063.teach/teach-intake.html](TICKET-063.teach/teach-intake.html) — v2 HTML, validado (`dkc-validate Teach` → valid). Bloques: tldr, concept-card, flow, callout, two-col-compare, timeline, tag, study-qa. Cubre las 3 direcciones (bases + entorno + plan) y las 4 preguntas de la barra de éxito.

## Teaching — Close

**Status**: done (2026-06-16). **Archivo**: [TICKET-063.teach/teach-close.html](TICKET-063.teach/teach-close.html) — v2 HTML, validado (`dkc-validate Teach` → valid). Cubre el 5to eje (qué se realizó: S1 data model + S2 vista), evolución de hipótesis (H4 → autoPopulate; el conflicto v1/v2 no anticipado), decisiones (DECISION-017 convergencia) y lessons (RULE-platform-008). Bloques: tldr, timeline, case (mermaid), comparison-table, invariant, study-qa.

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 (objeto + RecordTypes + versionado) | codegen + @@unique en DB (S1) | structural | **COVERED** (S1) |
| REQ-02 (RecordList único) | TC-1 | manual | NOT COVERED (S2/S3) |
| REQ-03 (detalle/create/edit condicional) | TC-2, TC-3, TC-4, TC-5 | manual | NOT COVERED (S2/S3) |
| REQ-04 (owner polimórfico) | TC-7 | manual | NOT COVERED (S2/S3) |
| REQ-05 (delete real) | TC-6 | manual | NOT COVERED (S3) |
| REQ-06 (seed + i18n) | seed idempotente | manual | NOT COVERED (S3) |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|---------|---------------------|
| TC-1 | RecordList muestra Plan y Minor con columna Tipo | REQ-VIEW | manual | yes | seed con Plans y Minors | Abrir el recordList de curriculum | Una sola lista con columna Tipo (Plan/Minor) | — | — | pending | — | — |
| TC-2 | Detalle de un Plan muestra campos temporales | REQ-VIEW | manual | yes | un Plan existente | Abrir el detalle | Se ven progression/totalCredits/totalPeriods/periodType | — | — | pending | — | — |
| TC-3 | Detalle de un Minor NO muestra campos temporales | REQ-VIEW | manual | yes | un Minor existente | Abrir el detalle | No aparecen los campos temporales del Plan | — | — | pending | — | — |
| TC-4 | Crear un Plan y un Minor | REQ-VIEW | manual | yes | tab de curriculum | Crear con cada RecordType | Se crean ambos con sus campos según tipo | — | — | pending | — | — |
| TC-5 | Editar curriculum | REQ-VIEW | manual | yes | curriculum existente | Editar campos + guardar | Cambios persisten | — | — | pending | — | — |
| TC-6 | Eliminar real | REQ-VIEW | manual | yes | curriculum existente | Eliminar | Registro borrado de la DB | — | — | pending | — | — |
| TC-7 | FK owner polimórfica (programa/institución) | REQ-VIEW | manual | yes | crear curriculum | Elegir owner | Picker permite academicProgram o institution; persiste correcto | — | — | pending | — | — |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| (a definir en intake) | — | — | — | — |

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| B1 | Convergencia Curriculum v1 (career-based, tenant UPU) → v2 + smoke end-to-end (TC-1..7) + S3 (seed) | REQ-02..06, REQ-PRESERVE-01 | SPEC-024 (S2.T3, S3) | objeto v2 en Base + DB + 4 layouts en `up1_layen_layout` + composable `useOwnerIdOptions` (todo commiteado: 3f8c5f0, a3292b4). Bloqueado por override de tenant | **Ya escalado a [TICKET-068](ticket-068.md)** (+ [DECISION-017]). Aprobar DECISION-017 → ampliar `objects/tenants/UPU/Base/curriculum.json` + backfill → re-correr smoke | must (en TICKET-068, no en 063) |

## Commits

| Hash | Fecha | Mensaje | Tasks | REQs |
|------|-------|---------|-------|------|
| 3f8c5f0 | 2026-06-16 | UPONE-1268 feat(curriculum-design): objeto Curriculum + RecordTypes Plan/Minor | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | REQ-01 |
| a3292b4 | 2026-06-16 | UPONE-1268 feat(curriculum-design): vista Curriculum (4 layouts + i18n + owner polimorfico) | S2.T1, S2.T2 | REQ-02..06 |

## Summary

**Cerrado con alcance parcial** (autorizado por el dev), SP4 / UPONE-1268.

**Logrado (commiteado en rama `UPONE-1261-academic-program` del mod):**
- **S1 — Data model**: objeto `Curriculum` model-v2 (`Curriculum.json`) + RecordTypes `Plan`/`Minor` + bloque versioning + `uniqueConstraints [[previousVersionId, version]]`. Codegen verificado: `model Curriculum` + enums + tablas de extensión `rt__Plan/Minor__curriculum`; `@@unique` **aplicado en la DB del tenant** (gotcha TICKET-054 OK). Commit `3f8c5f0`.
- **S2 — Vista (código)**: 4 layouts (`default_Curriculum_{list,view,create,edit}`, lista con columna Tipo + delete real; campos del Plan condicionados por `conditions`); i18n `es_CL@Curriculum.json`; **owner polimórfico resuelto sin core ni campos virtuales** vía `autoPopulate` + composable `useOwnerIdOptions` (repuebla `ownerId` según `ownerType`). Layouts en `up1_layen_layout`, composable sincronizado. Commit `a3292b4`.

**Diferido a [TICKET-068](ticket-068.md) (+ [DECISION-017](../decisions/DECISION-017-curriculum-v1-v2-convergence.md)):**
- Smoke end-to-end (TC-1..7) y S3 (seed) — **bloqueados** porque el tenant UPU ya tiene un `Curriculum` v1 career-based (migrado, `32d6b25`) que **eclipsa** el v2 (override total de tenant; `fileParsing.js:83`). La reconciliación v1→v2 (ampliar el objeto del tenant) vive fuera del `execute_scope` (`mods/`).

**Conocimiento generado:** [RULE-platform-008](../rules/platform/rule-platform-008.md) (verificar overrides de tenant en planning) · [DECISION-017] (convergencia v1→v2, defensa concentración vs dispersión de datos) · 6 learns (L1-L6).

**SP**: published 3 / estimated 3 / executed ~2 (S1+S2; S3 diferida).

## Workflow state

| Step | Status | Started | Closed |
|------|--------|---------|--------|
| request-intake | done | 2026-06-12 | 2026-06-12 |
| intake-explore | done | 2026-06-16 | 2026-06-16 |
| teach-intake | done | 2026-06-16 | 2026-06-16 |
| design-draft | done | 2026-06-16 | 2026-06-16 |
| design-feature | done | 2026-06-16 | 2026-06-16 |
| design-transition-to-execute | done | 2026-06-16 | 2026-06-16 |
| request-execute | done (parcial) | 2026-06-16 | 2026-06-16 |
| request-close | done | 2026-06-16 | 2026-06-16 |
