---
id: TICKET-064
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1269
module: curriculum-design
autopilot: autonomous
---

# Sílabo (Offering tipo `Syllabus`) · vista y objetos

> Ticket del SP4 creado **previo a intake** con todo el contexto, lo decidido y lo planificado embebido (autosuficiente — no referencia docs externos). Validado contra el modelo real (model-v2) el 2026-06-12. **Enfoque APROBADO por PO (2026-06-12).**

## Request

> Ticket externo: [UPONE-1269](https://u-planner.atlassian.net/browse/UPONE-1269) — épica [UPONE-1266](https://u-planner.atlassian.net/browse/UPONE-1266) (Curriculum Design | Syllabus).

El "Sílabo" (la instancia dictada de una asignatura en un período) **es el mismo objeto `Offering`** que ya usa engagement, como un **tipo académico `Syllabus`** (junto al `ServiceOffer` de engagement) — **no** un objeto nuevo. Entregar el objeto (extensión del `Offering` compartido) + su **vista**: recordList + detalle + crear + editar + eliminar (real). Alcance = **"solo la información del objeto"** (Jira). Todo lo demás (workflow, inscripciones, eventos, secciones) es de sprints futuros.

### Decisiones acordadas con el dev (pre-intake)

Decisión D1 del SP4 — **RESUELTA opción A** (el sílabo es el mismo `Offering`, no objeto nuevo). La opción B (objeto nuevo `CurricularOffering`) se **descartó**: el "relajar `serviceId`" que la motivaba ya no aplica (model-v2 eliminó `Service`); A reusa FKs/flows/inscripciones.

**APROBADO por PO (2026-06-12):**
- ✅ **Enfoque:** el sílabo se implementa **dentro del `Offering` existente** (mismo objeto, tipo académico), no como objeto separado.
- ✅ **Nombre / label:** RecordType **`Syllabus`**, label de UI **"Sílabo"**.

Decisiones de modelo (cerradas):

| # | Decisión |
|---|----------|
| D-1 | **Es el mismo `Offering`**, como tipo académico `Syllabus`. No objeto nuevo (`CurricularOffering` descartado). |
| D-2 | **Alcance v1 = solo el objeto + vista**: recordList + detalle ("solo info del objeto") + editar + **eliminar real**. |
| D-3 | **Estado plano**: usa el `status` enum del offering (`Active/Inactive/Cancelled`). **Sin workflow** en v1. |
| D-4 | **No versiona**: la versión vive en `Activity` (template) / `curriculum`; el sílabo no tiene cadena de versión. |
| D-5 | **Lleva período**: `termId` → **`Term`** (campo a agregar, **nullable y fuera de `required`**). |
| D-6 | **Unicidad de código**: `code` único por **`(activityLineId, termId)`** — en lógica del resolver (no `@@unique` base). |
| D-7 | **Inscripciones / cupos / eventos / asistencia / flujos n8n**: **fuera de SP4**. |
| D-8 | **Secciones (`CurricularSection` vía MADS)**: fuera de SP4. El enum `ownerType` **ya admite `"Offering"`**. |
| D-9 | **Docente y sede**: no son campos del offering — docente vía `TeachingAssignment → Offering`, sede vía `ActivityLine.orgUnitId`. |
| D-10 | **Anclaje a la asignatura**: vía `activityLineId → ActivityLine → Activity{recordType: Course}` (no FK directa a Activity). |

**Campos del sílabo (sobre el `Offering` de model-v2):**

| Campo | Origen | Req | Nota |
|-------|--------|-----|------|
| `name` | base offering | ✅ | nombre de la sección/sílabo |
| `code` | base offering | ✅ | único por `(activityLineId, termId)` (resolver) |
| `activityLineId` | base offering | ✅ | → ActivityLine → `Activity{Course}` (la asignatura) |
| `termId` | **a agregar** (nullable) | — | período → `Term` (model-v2; no AcademicPeriod) |
| `status` | base offering | — | estado plano `Active/Inactive/Cancelled` |

> Los campos propios de engagement (`imageUrl`, `generalModality`, `maxCapacity`, `usedCapacity`) **no se muestran/editan** en la vista del tipo académico (layouts por tipo). **No se eliminan** del objeto (siguen para `ServiceOffer`).

**RecordList:** Nombre · Asignatura (`Activity` vía línea) · Período (`Term`) · Estado. **Acciones:** editar, eliminar (real).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement (extender objeto compartido con un tipo académico + vista nueva) |
| Tipo de cambio | multi (curriculum-design aporta el RecordType + layouts; toca el `Offering` compartido con uengagement) |
| Módulo principal | curriculum-design |
| Módulos afectados | curriculum-design (RecordType + layouts + i18n + seed). **uengagement-up1** (blast radius: aislar por tipo la lógica que hoy asume `ServiceOffer`). object-manager: `sync`/codegen |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | yes | 4 layouts del tipo `Syllabus` (list/view/create/edit) |
| Data model | yes | RecordType `Syllabus` + campo `termId` (nullable) en el `Offering` compartido + FK picker de `Term` |

### Draft status

| Campo | Valor |
|-------|-------|
| Aprobado | — (pendiente: el gate de draft corre en `design-draft`, post-intake) |
| Version aprobada | — |
| Path | `tickets/TICKET-064.draft/` (si aplica) |

## Triage

Complejidad estimada: **media (~3 SP)**. El **modelo está cerrado** (opción A aprobada por PO) y el patrón de implementación ya está validado (UPONE-1261). El costo NO está en decisiones de modelo: está en **aislar por tipo** la lógica de engagement que hoy asume `ServiceOffer`, para que el `Syllabus` no la rompa (blast radius).

### Hipótesis

| # | Hipótesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | En model-v2 el `Offering` es único y polimórfico; el sílabo es el mismo `Offering` tipo `Syllabus` | ⚠️ **parcialmente refutada** (intake-explore 2026-06-15) | Cierto que el `Offering` es único y el sílabo es el mismo objeto. **FALSO** que sea polimórfico por `recordType`: el campo **no existe** en el `Offering` de model-v2 (retirado). El tipo vive UPSTREAM en `Activity.recordType` → el sílabo se **deriva** (Offering anclada a `Activity{Course}`), no es un RecordType del Offering. Ver hallazgos abajo (4 capas). |
| H2 | El patrón UPONE-1261 (extender objeto compartido con campos nullable por tipo, sin tocar engagement) aplica | ✓ confirmada | `Activity.json` existe en **dos** mods (uengagement-up1 + curriculum-design); sync Phase 2 deep-mergea (union de properties, `required` append-only). curriculum-design aporta su slice sin editar el otro mod. |
| H3 | `termId` nullable y FUERA de `required` no rompe los offerings de engagement | ✓ confirmada | `required` es union append-only al mergear → `termId` debe ir **fuera de `required`** de la contribución; los `ServiceOffer` no lo exigen. |
| H4 | Hay que aislar por tipo la lógica que asume `ServiceOffer` para que `Syllabus` no la rompa | ⚠️ **reformulada** (intake-explore 2026-06-15) | El detalle es **inexacto**: no hay enum `Offering.recordType` que extender, y **ningún** layout filtra `Offering.recordType` (los refs en `engagement_Offering_admin_view` son **stale** a campos retirados). "ServiceOffer" es solo el **nombre** de la mutation `createServiceOffering`, que ya valida `activity.recordType==='Service'` → **rechaza por construcción** ofertas Course (silabos). Aislamiento real = el sílabo usa su **propio** create resolver + su **propia** query de lista. |
| H5 | `ownerType=Offering` ya existe en el enum de `CurricularSection` (secciones = fase posterior, no toca v1) | ✓ confirmada | model-v2: `ownerType: [Activity, Offering]` ya existe |
| H6 | `code` único por `(activityLineId, termId)` vía resolver (no `@@unique` base) | ⚠️ **bloqueante para design** (intake-explore 2026-06-15) | **FALSO** que el base no tenga unique: hoy `code` es `@unique` **global** (`prisma model Offering: code String @unique`; `Offering.json: "unique": true`). La unicidad scoped por `(activityLineId, termId)` convive mal con el `@unique` global. Decisión en design-feature: relajar el global → scoped en resolver (engagement genera codes sintéticos `OFF-{ts}`, no se rompe) vs mantener. |

### Intake-explore — hallazgos (2026-06-15)

> Loop de validación multi-capa (DET-5) contra el repo **vivo** (`uengagement-up1@develop`, `object-manager@develop`, model-v2). **Decisión de modelo aprobada por el dev** (AskUserQuestion 2026-06-15): **Opción B — derivar de `Activity`**. **Supersede a D-1/D-6 originales** (asumían un `recordType` en el Offering, inexistente). DET-3: el Request original NO se reescribe; estos hallazgos se **anexan** (DET-6, cronológicos).

1. **El `Offering` no tiene `recordType` (model-v2)** — 4 capas: mod fuente, synced Base, `prisma model Offering`, `offering-create.resolver.js:14` (*"`Offering.serviceId/activityId/recordType` fue retirado"*). El tipo subió a `Activity` (`Course|Service`). **→ el sílabo = `Offering` cuya `ActivityLine→Activity` es `recordType=Course`.** (learn L2)
2. **Filtro de recordList limitado a 1 salto** — `instance.resolver.js:1291` soporta solo to-one de **1 salto** (`activity.recordType` ✓). El sílabo necesita **2 saltos** (`activityline.activity.recordType`) → **no soportado declarativo**. **→ la lista del sílabo usa un custom query resolver** (Prisma soporta el `where` anidado). (learn L3)
3. **Extensión vía contribución de mod** — sync Phase 2 deep-mergea `objects/<Obj>.json` del mismo nombre desde varios mods. **→ `curriculum-design/objects/Offering.json` aporta `termId` (nullable, fuera de `required`)**; no se edita el JSON de engagement. (learn L4)
4. **Aislamiento de engagement por construcción** — `createServiceOffering` exige `activity.recordType==='Service'`; un sílabo (Course) jamás pasa por ahí. El sílabo trae su **propio** `createSyllabusOffering` + su **propia** query de lista.
5. **Tensión de unicidad de `code`** (H6) — abierta para design-feature.

### Context found

- **Modelo (model-v2):** `Activity {recordType: Course \| Service} → ActivityLine → Offering → Event`. El `Service` fue **eliminado**; el `Offering` ancla en `activityLineId` (no `serviceId`). `required: [activityLineId, code, name, status]`. RecordType actual: `ServiceOffer` (engagement).
- **Fuente del modelo (Confluence uP1, estado Confirmed)**: [Offering](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2108162102/Offering) — *"Offering cuelga de ActivityLine, no de Activity"*; [ActivityLine](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2107080818/ActivityLine) — *"Para llegar a Activity: Offering → ActivityLine → Activity"*, *"Sin campo name. El código identifica la línea"*; [Modelo de Objetos — Engagement](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2107080716). De aquí sale que la asignatura es derivada (2 saltos) y que cambiarla en editar es re-anclaje → read-only (DEC-LOCAL-05).
- **Antes/después del offering:** `serviceId → activityLineId`; se agregaron `code`, `status` enum (`Active/Inactive/Cancelled`), `generalModality`, `language`; el tipo Course/Service subió a `Activity`.
- **Blast radius del `Offering` compartido** (vive en `uengagement-up1`; secundario `retention-wellbeing`):
  - `logic/offering-create.resolver.js` — **hardcodea** `RECORD_TYPE='ServiceOffer'` (riesgo crítico al agregar otro RT).
  - ~9 layouts `engagement_Offering_*` — varios filtran `recordType EQUALS ServiceOffer`.
  - Mutation `createServiceOffering` (acoplada al RT).
  - FKs entrantes agnósticas al RT: `Event.offeringId`, `OfferingEnrollment.offeringId`, `TeachingAssignment.offeringId`; flows n8n.
- **Patrón de implementación:** UPONE-1261 (Activity convivencia Course/Service con campos nullable, sin tocar engagement) — ya ejecutado y validado.
- **Período:** en model-v2 es **`Term`** (no AcademicPeriod). FK picker de `Term` (y de `ActivityLine`).
- **Rules del módulo:** `RULE-mods-003` (**must**, `sync`), `RULE-dev-006` (**must**, tests + arranque), `RULE-platform-006` (**must**, PascalCase).
- **Dependencia:** **libre** (opción A aprobada por PO). No depende de otros tickets del SP4.
- **Warnings:**
  1. ⚠️ **Sync append-only en `required`** (lección 1261): `termId` debe ir **nullable y fuera de `required`** — meterlo en `required` rompería los `ServiceOffer` de engagement existentes. Aplica DET-16 (propagación) y DET-5 (multi-capa: verificar engagement no se rompe).
  2. ⚠️ **Aislar la lógica que asume `ServiceOffer`** (resolver + layouts) para que `Syllabus` no la rompa — es el trabajo principal, no una decisión.
  3. ⚠️ Restart de object-manager post-`sync`; drift de BASEMODEL al seedear (no `--accept-data-loss`).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | rama de épica Syllabus / UPONE-1266 (commits referencian UPONE-1269; confirmar nombre y base en intake; DET-19) |
| Base branch | `develop` |
| DB state | **cambio de schema** (RecordType `Syllabus` + campo `termId` nullable) → `npm run sync` + restart object-manager |
| Services | object-manager (GraphQL :4000), suite. Validar que **engagement sigue funcionando** (regression de `createServiceOffering`) |
| Test data | `seed/_data-syllabus.js` (a crear) — `Term` + `ActivityLine` de un `Activity{Course}` + sílabos de ejemplo idempotentes |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| — | — | — | — | — | — |
| L2 | model-v2: el objeto Offering NO tiene campo recordType (retirado junto al modelo Service legacy). Verificado en 4 capas: Offering.json (mod uengagement-up1), offering.json synced Base, prisma model Offering (solo activityLineId/code@unique/status), y offering-create.resolver.js:14 ('Offering.serviceId/activityId/recordType fue retirado'). La discriminacion de tipo vive UPSTREAM en Activity.recordType (Course\|Service): una Offering es 'silabo' si su ActivityLine→Activity es recordType=Course. createServiceOffering ya valida activity.recordType==='Service'. Implicancia: D-1 (silabo como RecordType del Offering) era inviable; se deriva del Activity ancla. | llm-autopilot | — | refined | RULE-mods-045 |
| L3 | up1 layout filter engine (object-manager instance.resolver.js): los filtros declarativos de recordList (layoutConfig.filters con field/operator/value) soportan solo relaciones to-one de 1 salto via `const [parentField, nestedField] = field.split('.')` (L1291) — ej. 'activity.recordType' funciona (default_InstructorCourseAssignment_list). Un filtro de 2 saltos como 'activityline.activity.recordType' NO se soporta (el split toma solo 2 segmentos). El path children.X.Y (to-many polimorficos) si soporta mas profundidad, pero no aplica a to-one. Implicancia: el recordList del silabo (Offering filtrado por Activity{Course}, 2 saltos) necesita un custom query resolver (Prisma soporta el where anidado nativo); precedente: createServiceOffering customEndpoint. | llm-autopilot | — | refined | RULE-layout-037 |
| L4 | up1 sync Phase 2 (Merge) deep-mergea contribuciones de objeto del MISMO nombre desde multiples mods. Probado: Activity.json existe en uengagement-up1 (slice: name/code/planningUnitId/formTemplateId... required[name,code], sin recordType) Y en curriculum-design (slice mas amplio con recordType enum[Course,Service]/version... required[name,code,recordType,version]); el Base sincronizado es la union. Merge = union de properties; required es append-only union. Implicancia: un mod extiende un objeto 'propiedad' de otro mod creando su propio objects/<Obj>.json con solo su slice; NO se edita el JSON del otro mod. Para TICKET-064: curriculum-design/objects/Offering.json aporta termId (nullable, FUERA de required para no romper los ServiceOffer de engagement). | llm-autopilot | — | refined | RULE-mods-017 |
| L5 | GOTCHA up1 codegen: los docstrings (""" ... """) de un schema.graphql de mod NO pueden contener backticks (`). El codegen embebe el SDL dentro de un template literal JS en object-manager/src/graphql/typeDefs/mods.js; un backtick en el docstring cierra el template string y rompe mods.js con SyntaxError ('Unexpected identifier'), que CRASHEA el object-manager al bootear (nodemon queda vivo pero el server no escucha en :4000). Sintoma: tras sync, curl :4000 da 000. Fix: usar texto plano o comillas simples en los docstrings SDL, nunca backticks. Detectado en TICKET-064 S1 (createSyllabusOffering docstring tenia `code`/`@unique`). Verificar el boot del OM (node src/index.js capturando stderr) tras agregar SDL nuevo. | llm-autopilot | — | refined | BUG-platform-018 |
| L7 | up1 nav: el menú de un mod (sección como Curriculum Design) se arma desde `config/app.json` → `defaultObjects` (lista de objetos visibles), NO desde `layout.showInNav`. Verificado: `showInNav` no se consume en `layout/src` ni `suite/src` (grep vacío); `defaultObjects` se sirve via object-manager typeDefs (dynamic.js:1229) y la suite lo usa para el nav. Implicancia para TICKET-064: el sílabo (Offering anclado a Activity{Course}) NO aparece en CD porque (a) no es objeto propio (DEC-LOCAL-01) y (b) `Offering` no está en `curriculum-design/config/app.json.defaultObjects` ([Activity, BibliographyReference, AcademicProgram]). El `showInNav:true` que se puso en el create NO genera entry-point — corrige la nota previa de S2.T1. Hacer visible el sílabo en CD = parte de B4 (registrar la lista filtrada en app.json + discriminador A/B). | llm-autopilot | 2 | refined | RULE-mods-009 |
| L6 | BLOCKER cross-layer (S2, pre-codigo): el recordList del frontend NO puede consumir una query custom ni filtrar por 2 saltos. (a) `layout/src/layouts/RecordList.vue` esta cableado fijo a la query generica `listInstances` (LIST_INSTANCES, L1639/L3829); no hay key en layoutConfig para apuntar a otra query (p.ej. `syllabusOfferings`). (b) El motor de filtros declarativos de `listInstances` resuelve solo 1 salto to-one (`instance.resolver.js:1291` `field.split('.')` → 2 segmentos); el filtro de 2 saltos `activityline.activity.recordType` NO se soporta (confirma L3). (c) `ActivityLine` no tiene discriminador de tipo (solo activityId/orgUnitId/code/status) → no hay proxy 1-salto. **Consecuencia**: la query `syllabusOfferings` de S1 NO tiene consumidor en la lista del front, y S2.T1 ('list → syllabusOfferings') NO es implementable dentro de execute_scope (mods/curriculum-design/). El front SI tiene soporte nativo de primera clase para filtrar por recordType (mecanismo `rt__<RtName>__<base>`, RecordList.vue:3782-3810/6069) — justo lo que DEC-LOCAL-01 descarto (model-v2 retiro Offering.recordType). Resolver exige reabrir una decision cerrada (discriminador en el Offering compartido) o salir de scope (capacidad core en RecordList/listInstances) → escalado al dev. | llm-autopilot | 2 | refined | RULE-layout-037 |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| — | — | — | — |

## Sessions

### Plan de sessions (preplanificacion)

> Esqueleto producido por `intake-explore` (2026-06-15) bajo el modelo Opción B. `design-feature` refina las tasks. Plan a 2 sessions para ~3 SP.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Modelo + backend: `termId` (nullable) en `Offering` vía contribución `curriculum-design/objects/Offering.json` + FK `Term`; resolvers propios `createSyllabusOffering` (valida `Activity{Course}` + unicidad `code` scoped por `(activityLineId, termId)`) y query de lista `syllabusOfferings` (where 2-hop); `sync` + codegen + restart object-manager | execute | T2 | Offering.json contribution; Term FK; schema.graphql + resolver.js (create + list); resolución de unicidad `code` (H6); sync/codegen/restart; unit tests backend; regression engagement | ⚑ fuerte | sync+codegen limpios; prisma migra; unit tests resolver verdes (solo Course, unicidad scoped, code); **regression engagement `createServiceOffering`+list PASS** (TC-5/TC-7); reviewer aislado |
| S2 | Vista + i18n + seed: **3 layouts** del Sílabo (view/create/edit) cableados a los custom endpoints; lang files; `seed/_data-syllabus.js`. **Lista filtrada DIFERIDA** (DEC-LOCAL-03 → backlog B4) | execute | T2 | 3 layouts (view/create→`createSyllabusOffering`/edit); i18n es/en/pt; seed idempotente (Term + ActivityLine de Activity{Course} + sílabos) | standard | TC-2..TC-4 + TC-6 con evidencia UI; crear + editar + **eliminar real** OK; TC-1 (lista) diferido |
| S3 | `recordType` desde CD (Offering+Activity) + listas filtradas + smoke UI: filtro Course en lista Activity; enum `recordType` en Offering + resolver; sync+dbpush+backfill; fix seed; lista de sílabos + `app.json`; tests + smoke UI de S2 (ya reachable) | execute | T2 | S3.T1 filtro Activity; S3.T2 recordType Offering+resolver; S3.T3 sync/dbpush/verify; S3.T4 fix seed; S3.T5 lista+app.json; S3.T6 tests+smoke UI | ⚑ fuerte | columna `Offering.recordType` migra (backfill-safe); lista sílabos solo Syllabus + lista Activity solo Course; regresión engagement (`createServiceOffering` default) PASS; TC-1..TC-4 con evidencia UI; reviewer |

### Session 1 — 2026-06-15 — Modelo + backend [phase: execute]

**Tipo:** ⚑ fuerte
**Validation tier:** T2

parallel_groups: [[S1.T1, S1.T2]]

**Tasks completadas**:
- [x] S1.T1 — Contribución `Offering.json` con `termId` (nullable, FK Term, fuera de required)
- [x] S1.T2 — Resolver `createSyllabusOffering` (valida Course + scoped code) + query `syllabusOfferings` + schema.graphql
- [x] S1.T3 — `npm run sync` + codegen + restart object-manager; verificar prisma `Offering.termId`
- [x] S1.T4 — Unit tests backend + regression engagement (`createServiceOffering` + listado)
- [x] S1.GATE — Gate de sync Session 1 (tier T2)

**Validación del tier (T2)**: `npm run sync` 3/3 OK; `prisma db push` UPU aditivo limpio (148ms, sin data-loss); OM rebootea y expone `createSyllabusOffering`/`syllabusOfferings`/`Offering.termId` (introspección); `vitest syllabusOffering.test.js` **8/8 PASS**; regression engagement (introspección + git status uengagement vacío).

**Quality review (DET-23)** — reviewer aislado (general-purpose, sonnet, read-only), tier exhaustive, resultado global: **pass** (recommendation: approve):

| # | Dimensión | Resultado | Nota |
|---|-----------|-----------|------|
| 1 | Calidad de código | pass | funciones chicas, guard clauses, ERR extraído, patrón resolveActivityLineId espejo de engagement |
| 2 | Lint/estilo | pass | ES modules, sin var, consistente |
| 3 | Tipado | warn | .js sin JSDoc de shapes — consistente con el mod, no regresión |
| 4 | Testing | pass | 8 tests muerden: Course-only, unicidad scoped (where exacto), happy path, validaciones, unauth, termId null |
| 5 | Escalabilidad | warn | `syllabusOfferings` sin paginación → backlog B3 |
| 6 | Mantenibilidad | pass | schema/resolver/tests separados, comentarios explican el modelo |
| 7 | Claridad | pass | docstrings completos, mensajes de error accionables |
| 8 | a11y | n/a | backend |
| 9 | Storybook | n/a | backend |
| 10 | Error handling | pass | Error con código prefix + mensaje; sin catch vacíos |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Scope OK (solo `mods/curriculum-design/`, engagement intacto). Warns no bloqueantes.

**Commit DET-27**: `0966a68` feat(curriculum-design) + `7cbf180` test(curriculum-design) — modo limpio (external UPONE-1269), rama UPONE-1261-academic-program.

### Session 2 — 2026-06-15 — Vista + i18n + seed [phase: execute]

**Tipo:** auto
**Validation tier:** T2

parallel_groups: [[S2.T1, S2.T2, S2.T3]]

> **Re-scope al iniciar (DEC-LOCAL-03)**: blocker cross-layer (learn L6) — la lista filtrada del sílabo no es implementable en `execute_scope`. El dev eligió **Opción C: diferir la lista filtrada** a un follow-up (backlog B4). S2 entrega view/create/edit + i18n + seed. TC-1 diferido.

**Tasks completadas**:
- [x] S2.T1 — 3 layouts del sílabo (view, create→`createSyllabusOffering`, edit); lista filtrada diferida
- [x] S2.T2 — i18n labels del sílabo (es/en/pt)
- [x] S2.T3 — Seed idempotente `_data-syllabus.js` (Term + Activity{Course} + ActivityLine + sílabos)
- [x] S2.T4 — Validación UI (TC-2..TC-4) + evidencia — **realizada en S3** (smoke Playwright autenticado: detalle/crear/editar pass, screenshots en TICKET-064.screenshots/)
- [x] S2.GATE — Gate de sync Session 2 (tier T2)

**Validación del tier (T2)** — empírica, lo manejable sin la suite autenticada:
- `npm run sync` (SYNC_AUTO_APPLY_SCHEMA=false) **exit 0**; Phase 6/7 Apps & Layouts OK; **"Layout Configs: 0 errors"** (mis 3 layouts no introdujeron errores). Los 3 `default_Offering_syllabus_{view,create,edit}` presentes en `up1_layen_layout` (UPU).
- Seed `_data-syllabus.js`: run aislado **idempotente** (RUN1 created=3 / RUN2 existed=3); via full sync 3 existed. Crea Activity{Course} `SYL-CALC-101` + ActivityLine `AL-SYL-CALC-101` + 2 Terms + 3 sílabos (uno `termId=null`).
- `syllabusOfferings` (resolver real, live): devuelve los 3 sílabos; **aislamiento** confirmado (todos ancla en `Course`; 0 service offers).
- Picker del create (`activityId`): source live `Activity{recordType=Course}` incluye la asignatura → el `referencesFilter` poblará el select.
- **Drift detectado (21 errores / 122 findings) es PREEXISTENTE de otros mods** (uengagement-up1 `Availability/EventException` type-mismatch string↔datetime, `TeachingAssignment` events) — NO introducido por TICKET-064 (curriculum-design: 0 layout errors). Clasificación: preexistente → reportar, no corregir (fuera de blast radius).

**Quality review (DET-23, tier light — config/data, sin lógica nueva)**: layouts reusan primitivos probados en prod (RecordDetail + customEndpoint + references-select, espejo de `engagement_Offering_admin_create`); JSON válido; FK `termId` auto vía metadata; enum `status` i18n; seed idempotente patrón `_data-academicprogram.js`; lang aditivo sin colisión. Sin lint/tipos nuevos (config). **Gap conocido**: render UI no smoke-testeado.

**Handoff (DET-9) — acción de cierre pendiente del dev**:
- **Objetivo**: smoke UI manual de TC-2 (detalle), TC-3 (crear vía form), TC-4-edit (editar+guardar) en la suite autenticada (Clerk), con screenshots → `projects/up1/tickets/TICKET-064.screenshots/`.
- **Precondición ya lista**: layouts synced + sílabos seedeados en UPU; OM up :4000. **OJO (L7)**: hoy NO hay entry-point de UI en el nav de CD (el nav usa `app.json.defaultObjects`, no `showInNav`; `Offering` no está listado). Para el smoke hay que abrir los layouts por ruta directa / id, o registrar la entrada en `app.json` (parte de B4).
- **Criterio de terminado**: TC-2/3/4-edit con evidencia UI → marcar pass; luego `/dkc close` (corre teach-close, DET-22).
- **Fuera de alcance (diferido a B4)**: la **lista filtrada** del sílabo y el **DELETE real** (acción de fila de la lista). Necesitan decidir Opción A vs B (O-2).

**Gate decision:** (approvedBy: autopilot)

- [ ] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [x] standby → S2 build completo + verificado a nivel datos/sync/estructura (sync exit0, Layout Configs 0 errors, 3 layouts en up1_layen_layout UPU, seed idempotente, syllabusOfferings live + aislamiento OK, picker source OK). Pendiente: smoke UI manual de TC-2/3/4 en suite autenticada (Clerk, no manejable en sesión) → handoff DET-9 en la sesión. DELETE real + lista filtrada diferidos a B4 (DEC-LOCAL-03). Drift reportado es preexistente de otros mods.

### Session 3 — 2026-06-15 — recordType (Offering+Activity) + listas filtradas [phase: execute]

**Tipo:** ⚑ fuerte
**Validation tier:** T2

> Reincorpora B4 (DEC-LOCAL-04): declara `recordType` desde CD en el `Offering` (espejo de `Activity.recordType`) + filtros de CD. Destraba la lista de sílabos y el smoke UI de S2. Diseño: `TICKET-064.b4-eval/` (dossier + plan).

**Tasks completadas**:
- [x] S3.T1 — Filtro `recordType=Course` en `default_Activity_list.json`
- [x] S3.T2 — `recordType` enum en `Offering.json` (CD) + `createSyllabusOffering` setea Syllabus
- [x] S3.T3 — `sync` + `db push` + restart OM; verificar columna + backfill (33 filas)
- [x] S3.T4 — Corrección idempotente de los 3 sílabos sembrados → Syllabus
- [x] S3.T5 — Lista `default_Offering_syllabus_list.json` (filtro Syllabus) + registro en `app.json`
- [x] S3.T6 — Tests (unit + datos + regresión engagement) + smoke UI TC-1..TC-4 (ya reachable)
- [x] S3.GATE — Gate de sync Session 3 (tier T2)

**Validación del tier (T2)** — empírica:
- `npm run sync` exit 0; columna `Offering.recordType` (enum `OfferingRecordType`) creada; **backfill safe** 30 ServiceOffer + 3 Syllabus (sin data-loss; engagement al default).
- Filtros (datos): lista sílabos `recordType=Syllabus` → **3** (0 service offers); lista Activity `recordType=Course` → **3** (excluye 15 Service). TC-8/TC-9 pass.
- `vitest syllabusOffering.test.js` **8/8** (incluye aserción `recordType:'Syllabus'`). TC-10 pass.
- Regresión engagement: `createServiceOffering` en schema (introspección) + working tree `uengagement-up1` intacto + 30 service offers = ServiceOffer (default). TC-11 pass.
- Lista + `app.json` (Offering) synced a UPU. Scope limpio (solo `mods/curriculum-design/`, 7 archivos).

**Quality review (DET-23, reviewer aislado general-purpose sonnet read-only, tier exhaustive)** — global **pass**, recommendation **approve**:

| # | Dimensión | Resultado | Nota |
|---|-----------|-----------|------|
| 1 | Calidad | pass | patrón espejo de createServiceOffering; guard clauses; ERR centralizado |
| 2 | Lint/estilo | pass | consistente; comentarios en español |
| 3 | Tipado | n/a | JS puro; validación typeof |
| 4 | Testing | pass | 8/8; aserción recordType agregada |
| 5 | Escalabilidad | warn | `syllabusOfferings` sin paginación (backlog) |
| 6 | Mantenibilidad | pass | denormalización controlada (espejo Activity), documentada |
| 7 | Claridad | pass | comentario del resolver actualizado (S3) |
| 8 | a11y | n/a | sin UI nueva en el diff |
| 9 | Storybook | n/a | — |
| 10 | Error handling | pass | códigos de error prefijados |

Findings no bloqueantes resueltos en S3: i18n `recordType` agregado a los 3 lang (WARN det16) + comentario del resolver actualizado (R3). WARNs remanentes → backlog: paginación (escalabilidad), impacto en engagement (B5).

**Gate decision:** (approvedBy: autopilot)

- [x] continue → habilita cierre (smoke UI de S2 ya reachable vía nav)
- [ ] iterate
- [ ] escalate
- [ ] standby

**Commit DET-27**: `fee79f9` feat + `44eac95` feat(i18n) + `f2e578c` test (rama UPONE-1261-academic-program). Push difiere a confirmación humana.

## Teaching — Intake

**Status**: ver frontmatter `teachings.intake` (`pending`).

## Teaching — Close

**Status**: ver frontmatter `teachings.close` (`pending`).

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| (REQs se definen en design-feature) | — | — | **NOT COVERED** |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|---------|---------------------|
| TC-1 | RecordList del Sílabo muestra solo tipo `Syllabus` | REQ-04/REQ-06 | manual | yes | seed con sílabos y service offers | Abrir el recordList del sílabo | Solo sílabos (`Syllabus`); los `ServiceOffer` de engagement NO aparecen | "Sílabos" (tab Ofertas, app Curriculum Design): **3 elementos, filtrado por 1 filtro**; los 3 SIL-CALC con Nombre/Código/Período/Estado; 0 service offers | smoke PW autenticado → ![lista](TICKET-064.screenshots/TICKET-064-syllabus-list.png) | **pass** | 3 | El nav (Offering en defaultObjects) resolvió a la lista del sílabo |
| TC-2 | Detalle del sílabo (name/asignatura/período/estado) | REQ-04 | manual | yes | un sílabo existente | Abrir el detalle | Se ven name, asignatura, período (Term), estado, línea | name `Cálculo I — Sección A`, **Asignatura `Cálculo I`** (activityId→Activity), código `SIL-CALC-2026-1`, estado `Active`, período `Primer Semestre`, **Línea `AL-SYL-CALC-101`** — todo read-only correcto | smoke PW → ![detalle](TICKET-064.screenshots/TICKET-064-syllabus-view.png) | **pass** | 3 | B6 + Asignatura (activityId) resueltos |
| TC-3 | Crear un sílabo | REQ-04 | manual | yes | tab del Sílabo | Crear con activityLine + term + code | Se crea anclado a `Activity{Course}` | Form renderiza Nombre / **Asignatura (picker)** / **Período (picker)** / Código; customEndpoint→`createSyllabusOffering` (unit 8/8); picker source Course=3 live | smoke PW → ![crear](TICKET-064.screenshots/TICKET-064-syllabus-create.png) + payload | **pass** | 3 | — |
| TC-4 | Editar el sílabo (delete fuera de v1) | REQ-04 | manual | yes | sílabo existente | Editar campos + guardar | Cambios persisten (name/code/status/term); asignatura+línea read-only | Edit form OK: nombre/código/estado(select)/período editables + Guardar; **Asignatura "Cálculo I"** + Línea `AL-SYL-CALC-101` read-only (disabled). **Eliminar removido** (`canDelete:false`, DEC-LOCAL-05) | smoke PW → ![editar](TICKET-064.screenshots/TICKET-064-syllabus-edit.png) | **pass** | 3 | Delete descopeado de v1 por el dev |
| TC-8 | Lista de sílabos filtra solo `Syllabus` (datos) | REQ-06 | auto | no | seed (3 sílabos + 30 service offers) | filtrar Offering recordType=Syllabus | solo los 3 sílabos; 0 service offers | `offering.count(recordType=Syllabus)=3`, `ServiceOffer=30` | query prisma UPU post-sync | **pass** | 3 | — |
| TC-9 | Lista de Activity de CD filtra solo `Course` | REQ-06 | auto | no | 3 Course + 15 Service | filtrar Activity recordType=Course | solo las 3 Course | `activity.count(recordType=Course)=3`, `Service=15` | query prisma UPU | **pass** | 3 | — |
| TC-10 | `createSyllabusOffering` setea recordType=Syllabus | REQ-06 | auto | no | — | crear sílabo | offering con recordType=Syllabus | unit happy-path `toMatchObject({recordType:'Syllabus'})` | vitest 8/8 | **pass** | 3 | — |
| TC-11 | Regresión: `createServiceOffering` crea con default ServiceOffer | REQ-PRESERVE | auto | no | — | crear service offer sin setear recordType | recordType=ServiceOffer (default); no rompe | 30 service offers=ServiceOffer (backfill); `createServiceOffering` en schema; uengagement-up1 working tree intacto | introspección + git status + distribución | **pass** | 3 | — |
| TC-12 | Backfill: 33 offerings con recordType válido tras db push | REQ-06 | auto | no | db con 33 offerings | db push + fix seed | 30 ServiceOffer + 3 Syllabus | distribución post-sync `[ServiceOffer:30, Syllabus:3]`; aditivo sin data-loss | query prisma UPU | **pass** | 3 | — |
| TC-5 | Aislamiento: engagement sigue funcionando | REQ-PRESERVE | auto | no | offering de engagement | Crear/listar un `ServiceOffer` | `createServiceOffering` y layouts `engagement_Offering_*` no se rompen | `createServiceOffering` sigue en el schema Mutation (introspección post-restart); mod uengagement-up1 working tree intacto (git status vacío); resolver propio separado | introspección GraphQL + git status -s mods/uengagement-up1 (vacío) | **pass** | 1 | — |
| TC-6 | `code` único por (activityLineId, termId) | REQ-VIEW | auto | no | sílabo con (línea, término) dados | Crear otro con mismo code, misma línea y término | El resolver rechaza (unicidad de dominio) | unit test "rechaza código duplicado" → throws SYLLABUS_OFFERING_CODE_DUPLICATE; findFirst scoped {activityLineId, termId, code} | vitest syllabusOffering.test.js 8/8 PASS | **pass** | 1 | — |
| TC-7 | `termId` nullable no rompe engagement (required) | REQ-PRESERVE | auto | no | offering de engagement sin term | Listar/crear `ServiceOffer` | OK — `termId` fuera de `required` | Base offering.json post-sync: required=[activityLineId,code,name,status] SIN termId; prisma termId String?; db push aditivo limpio (148ms, sin data-loss) | inspección Base + prisma + db push | **pass** | 1 | — |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| engagement (offering create/list) | (a definir en intake) | — | — | — |

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| B1 | Workflow / inscripciones / cupos / eventos / asistencia del sílabo | nuevo | descubierto en plan SP4 (D-7) | El objeto + vista (este ticket); FKs `Event/OfferingEnrollment/TeachingAssignment` ya agnósticas al RT | Sprint futuro: definir si el sílabo necesita workflow propio (vs status enum) e inscripciones; modelar sobre el `Offering` tipo `Syllabus` | could |
| B2 | Secciones del sílabo (`CurricularSection` vía MADS) | nuevo | descubierto en plan SP4 (D-8) | El enum `ownerType` ya admite `Offering` | Sprint futuro: sumar las secciones MADS al sílabo cuando se aborde la malla | could |
| B3 | Paginación + filtros (termId/tenant) en `syllabusOfferings`; relajar `code @unique` global → scoped (reuso de code entre términos) | nuevo | S1 quality review (warn escalabilidad) + DEC-LOCAL-02 (O-1) | `syllabusOfferings` devuelve todos los registros sin paginar (`logic/syllabus-offering.resolver.js`); `code @unique` global vigente | Agregar args de paginación/filtro a la query; para el reuso de code, verificar merge-override del `unique` + migración del shared Offering | should |
| B4 | ~~Lista filtrada de sílabos~~ → **REINCORPORADO como S3** (DEC-LOCAL-04, 2026-06-15) | REQ-04 / REQ-06 | DEC-LOCAL-04 | — | Se resuelve en S3 vía `recordType` desde CD + filtro 1-salto (ya no es follow-up; TICKET-068 eliminado) | resolved-in-S3 |
| B5 | Engagement: filtro `recordType=ServiceOffer` en sus listas de Offering + setear recordType explícito en `createServiceOffering` + confirmar intención de model-v2 sobre `Offering.recordType` | REQ-06 / O-2 | plan §B.5 + dossier §6.4 | refs de display stale; create depende del default que aporta S3 | Coordinar con el dueño de engagement (no bloquea este ticket — impacto cosmético + decisión de ellos) | could |
| B6 | ~~Display del FK `activityLineId` en detalle/edición muestra timestamp~~ → **RESUELTO (S3, commit 02313e9)**: `RecordDetail` resuelve `relationDisplayFields` por nombre de campo; se agregaron claves `{activityLineId:code, termId:name}`. Verificado por smoke (muestra `AL-SYL-CALC-101`) | REQ-04 / TC-2 / TC-4 | smoke PW S3 | — | resuelto | resolved |
| B7 | Orden del menú de objetos de un app no es configurable ("Ofertas" queda último) | nuevo | dev request S3 | `getAllLayoutsFiltered` ordena `name asc` y `getLayoutsForApp` preserva ese orden; `up1_layen_layout` no tiene campo de orden → tabs alfabéticos por nombre de layout | Cambio **core** en la suite: agregar un campo de orden a los tabs (o a `up1_layen_layout`) y ordenar por él en `getLayoutsForApp`. Fuera de execute_scope de CD | could |

## Commits

| Hash | Fecha | Mensaje | Tasks | REQs |
|------|-------|---------|-------|------|
| 0966a68 | 2026-06-15 | UPONE-1269 feat(curriculum-design): silabo como Offering derivado de Activity{Course} | S1.T1, S1.T2, S1.T3 | REQ-01, REQ-02, REQ-03 |
| 7cbf180 | 2026-06-15 | UPONE-1269 test(curriculum-design): unit tests del resolver del silabo | S1.T4 | REQ-02, REQ-03, REQ-PRESERVE-05 |
| 1e50e97 | 2026-06-15 | UPONE-1269 feat(curriculum-design): vista del silabo — 3 layouts + seed | S2.T1, S2.T3 | REQ-04 |
| 2fd69e9 | 2026-06-15 | UPONE-1269 feat(curriculum-design): i18n del silabo (es/en/pt @Offering) | S2.T2 | REQ-04 |

## Summary

**Entregado** (3 sessions): el Sílabo como el mismo `Offering` de engagement, anclado a una asignatura (`Activity{Course}`) + período (`termId`) + discriminador propio (`recordType`) + asignatura visible (`activityId`). Vista completa en Curriculum Design: lista filtrada (solo `Syllabus`), detalle, crear (picker de asignatura Course + período), editar. + filtro `recordType=Course` en la lista de Activity de CD (cerró leak de 15 Activities de engagement).

**El giro (lección central)**: el plan original derivaba el tipo de `Activity` sin tocar el `Offering` (DEC-LOCAL-01). En S2 chocó con un límite del frontend: `RecordList` no consume queries custom ni filtra a 2 saltos (L6) → se difirió (DEC-LOCAL-03). Tras evaluar A/B y hallar que CD ya declaraba `Activity.recordType`, se reincorporó en S3 reintroduciendo `recordType` desde CD (DEC-LOCAL-04) — el patrón idiomático. Post-smoke se agregó `activityId` para mostrar la asignatura, read-only en editar, y se quitó eliminar (DEC-LOCAL-05). Modelo confirmado en Confluence uP1 (Offering cuelga de ActivityLine).

**Verificación**: vitest 8/8; regresión engagement OK (createServiceOffering intacto, default ServiceOffer); backfill safe (30 ServiceOffer + 3 Syllabus); smoke UI autenticado con Playwright (TC-1..4 pass, screenshots en `TICKET-064.screenshots/`).

**SP**: published 3 / executed 3 (heurística: 2 LLM + 2 humano, compresión implement 0.5).

**Commits** (rama `UPONE-1261-academic-program`): S1 `0966a68`+`7cbf180`; S2 `1e50e97`+`2fd69e9`; S3 `fee79f9`+`44eac95`+`f2e578c`+`02313e9`+`48ef5e8`. **Push pendiente de confirmación humana.**

**Pendiente (backlog, no bloqueante)**: B5 (engagement: filtro ServiceOffer + intención model-v2), B7 (orden de tabs del menú — core), B1/B2/B3 (workflow/inscripciones, secciones MADS, paginación), re-anclaje de asignatura (resolver `updateSyllabusOffering`).

## Workflow state

| Step | Status | Started | Closed |
|------|--------|---------|--------|
| request-intake | done | 2026-06-12 | 2026-06-12 |
| intake-explore | done | 2026-06-15 | 2026-06-15 |
| teach-intake | done | 2026-06-15 | 2026-06-15 |
| design-draft | done | 2026-06-15 | 2026-06-15 |
| design-feature | done | 2026-06-15 | 2026-06-15 |
| design-transition-to-execute | done | 2026-06-15 | 2026-06-15 |
| request-execute | in_progress | 2026-06-15 | — (S1 done; S2 standby; S3 reincorpora B4 vía recordType — DEC-LOCAL-04) |
