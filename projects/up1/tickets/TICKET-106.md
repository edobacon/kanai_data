---
id: TICKET-106
project: up1
type: ticket
status: closed
work_type: improvement
external: UPONE-1381-P4
module: curriculum-design
autopilot: autonomous
---

# Selector de transiciones de estado para Activity (reemplazar badge read-only)

## Request

El campo status de Activity usa `activity-status-badge` (read-only) pero el motor de enum de core ya soporta selectores de transiciones que muestran solo estados alcanzables. Necesito reemplazar el badge por un select que: 1) Muestre el estado actual, 2) Muestre solo los destinos alcanzables según el estado actual (via getValidTransitions), 3) Respete requiredCapabilities en el backend. Además verificar que Curriculum y Offering (que ya usan select) funcionen correctamente con las transiciones declaradas.

> **Ampliación de alcance (dev, 2026-07-15)**: cerrar el lado-mod de la migración UPONE-1381/P4 — (a) limpiar los restos huérfanos que dejó la retirada de las mutations de validación de estado, (b) actualizar la documentación del mod stale, (c) evaluar el retiro del subsistema workflow relacional. Ver DEC-INTAKE-04/05/06.

## Classification

| Campo | Valor |
|-------|-------|
| work_type | improvement |
| change_type | multi |
| layer | mod (ejecutable) — la evaluación del subsistema workflow es cross-cutting (referencia core + uengagement-up1, sin ejecutar) |
| módulo principal | curriculum-design |
| Modulos afectados | uengagement-up1 y object-manager (solo lectura/evaluación); RULE-004 en deckard KB (docs) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Cambiar `type: "activity-status-badge"` a `type: "select"` en los layouts de Activity habilita el selector de transiciones | ✓ confirmed | **frontend**: `RecordDetail.vue:3084-3103` detecta `fieldMetadata.properties.transitions` y filtra el enum via `fetchValidTransitions`. **frontend (condición de activación)**: `RecordDetail.vue:3042` solo aplica la lógica cuando `type ∈ {null, 'text', 'select'}` → un `activity-status-badge` queda EXCLUIDO; cambiar a `select` lo activa. |
| H2 | Curriculum ya funciona con select + transiciones | ✓ confirmed | **frontend**: `default_Curriculum_edit.json` usa `customEndpoint: updateCurriculumWithRecordType` (`:14-35`) que delega en `updateInstance` genérico (`curriculum-update.resolver.js:69-92`). **config**: `Curriculum.json:117-126` declara `transitions`. **backend**: `enforceEnumTransitions` (`instance.resolver.js:136-212`, cableado en `:4216-4228`) valida la máquina de estados en el update genérico, object-agnostic. |
| H3 | Offering ya funciona con select + transiciones (parte del request original) | ✗ refuted | **config**: `Offering.json` (mods/uengagement-up1) tiene `status` como enum simple `["Active","Inactive","Cancelled"]` SIN `transitions`. **frontend**: el layout admin (`engagement_Offering_admin_edit.json`) ni siquiera incluye el campo `status` en el schema. La premisa del request ("Offering ya usa select con transiciones") es falsa → REQ-02 se acota a Curriculum. |
| H4 | El save del selector de Activity requiere una mutation de transición gobernada (`transitionActivityValidated`), no el `updateInstance` genérico (por RULE-curriculum-design-004) | ✗ refuted | **backend**: la migración **UPONE-1381/P4 (S5)** ya retiró `transitionActivityValidated`/`updateActivityValidated` y el enforcement `ACTIVITY_STATUS_READ_ONLY`. `Activity.status` ya es enum con `transitions` (`activity.json:134-150`). El override del mod `polymorphicUpdate.resolver.js:661-676` deja caer `objectType="Activity"` al `updateInstance` genérico de core. → **el save viaja por `updateInstance` y lo valida `enforceEnumTransitions`, igual que Curriculum. NO hace falta wiring adicional.** |
| H5 | La retirada de las mutations dejó restos huérfanos en el mod, y el subsistema workflow relacional quedó sin uso → se pueden sacar | ~ partial | **HUÉRFANO seguro**: 5 error codes `ACTIVITY_*` en `logic/errors.js:30-34`, cero consumidores (único emisor era `updateActivityValidated`, ya retirado). **NO huérfano de código**: el subsistema workflow (4 objetos JSON + 3 resolvers `*Validated` + 10 error codes `WORKFLOW_*` + test de integración) sigue vivo, expuesto en GraphQL y gobernado por `RULE-curriculum-design-003`; ningún objeto de negocio lo escribe hoy (Activity/Curriculum/Offering migrados), pero su remoción es **destructiva + core + cross-mod** → fuera de 106 (ver DEC-INTAKE-05). |
| H6 | El drop del subsistema workflow está "bloqueado por uEngagement" por una dependencia de negocio | ✗ refuted | **NO hay dependencia de negocio**: cero referencias a Workflow*/`workflowId`/`currentStatusId` en la lógica de `uengagement-up1`. El bloqueo real es un **JSON duplicado stale**: `uengagement-up1/objects/Activity.json:56-73` todavía declara `workflowId`/`currentStatusId`; el merge append-only de object-manager (`fileSync.js:744-752`) los reintroduce aunque `curriculum-design/objects/activity.json` ya los sacó → materializa las columnas + FK en el Prisma de cada tenant (`prisma/UPU/schema.prisma:701-704`). El drop requiere limpiar ese archivo (otro mod) + migración destructiva por tenant. |

### Context found

**Motor de enum de core (post UPONE-1381)**: la máquina de estados de Activity migró del workflow relacional del mod (columna `currentStatusId` + coordinador `transitionActivityValidated`) al **motor de enum de core**: campo `status` con `properties.transitions`, validado por `enforceEnumTransitions` en `updateInstance` (`object-manager/src/graphql/resolvers/instance.resolver.js:136-212` + `:4216-4228`). Guard genérico, aplica a cualquier campo con `transitions`.

**Path de guardado (write-path) — veredicto A (basta el cambio de layout)**:
- `RecordDetail.vue:3552` `handleSubmit`: si el layout declara `customEndpoint` usa esa mutation; si no, usa `updateInstance(objectType, id, data)` genérico (`:1642-1649`, `:4068-4113`).
- Activity NO declara `customEndpoint` → `updateInstance` genérico; `status` viaja en `data`; `enforceEnumTransitions` lo valida. La detección de `transitions` (`:3084-3103`) solo arma el select, no rutea el submit.

**Selector / RBAC**: `useEnumTransitions.ts` (`fetchValidTransitions` → `GET_VALID_TRANSITIONS:259`, `buildTransitionItems`). `getValidTransitions` devuelve `allowed` ya resuelto por `requiredCapabilities`. REQ-03 se cumple consumiendo, no re-implementando.

**Precondición de entorno (verificar en execute)**: `enforceEnumTransitions` lee `fieldDefinitions` de `core_FieldDefinition` (poblado por codegen). Si en UPU el codegen que persiste `activity.json.status.transitions` no corrió, el guard hace **no-op silencioso**. Confirmar antes de dar por gobernada la transición.

**Sincronización layouts (NO es `npm run sync`)**: los layouts JSON se **siembran a la BD** (`up1_layen_layout`) vía `mods/up1-manager/scripts/seed-object-manager-layouts.js`.

**Restos huérfanos de la retirada (limpieza en 106 — solo lo seguro)**:
- `logic/errors.js:30-34` — 5 error codes `ACTIVITY_*` (`ACTIVITY_NOT_FOUND`, `ACTIVITY_NO_WORKFLOW`, `ACTIVITY_TRANSITION_INVALID`, `ACTIVITY_WORKFLOW_ARCHIVED`, `ACTIVITY_STATUS_READ_ONLY`). Cero consumidores (grep). **Seguros de remover.**
- (Fuera de alcance / NO tocar en 106) subsistema workflow completo, columnas `workflowId`/`currentStatusId`, error codes `WORKFLOW_*` — ver Evaluación abajo.

**Afirmaciones FALSAS de schema en código/docs (corregir)**:
- `logic/activity.resolver.js:13` (comentario) dice "la columna dropeada" — **falso**: `workflowId`/`currentStatusId` siguen en el Prisma generado de todos los tenants (`prisma/UPU/schema.prisma:701-704`, `UCENG/schema.prisma:613-616`).
- `docs/reference/error-codes.md:34` afirma "El campo `workflowId`/`currentStatusId` ya no existe en Activity" — **falso**, mismo motivo.

**Docs stale del mod (actualizar)** — un commit de hoy (`0b1d48e`) ya arregló varios (`.ai/CONTEXT.md`, `README.md`, `docs/architecture/activity-governance-hu4.md`, `docs/user-guide/*`, etc.). **Siguen stale**:
- `CLAUDE.md` (≈60-61, 72, 134, 151, 184): describe `transitionActivityValidated`/`updateActivityValidated`/`ACTIVITY_STATUS_READ_ONLY` en presente.
- `.ai/PATTERNS.md` (≈389-427, 468, 512-578): sección "Mutations validated vs CRUD" con esas mutations como patrón vigente para Activity.
- `docs/patterns/validated-vs-crud.md` (≈23, 32-33): lista "6 mutations validated" incluyendo las de Activity.
- `docs/architecture/server-side-integrity.md` (≈25): I1 enforced via `transitionActivityValidated` (se reubicó a `polymorphicUpdate.resolver.js:65-68`).
- `docs/reference/mcp-object-contract.md` (≈36, 53-54): lista las mutations de Activity como allowlisted.
- `docs/architecture/workflow-platform-hu3.md`: nota de deprecación sobre-afirma "retirado por completo" (el subsistema sigue vivo; solo Activity dejó de consumirlo) → matizar.
- `docs/reference/error-codes.md:34`: la afirmación falsa de arriba.
- **KB deckard**: `RULE-curriculum-design-004` — stale (describe las mutations retiradas). Reconciliar con `RULE-curriculum-design-003` (que SÍ sigue vigente para el subsistema workflow).

**Evaluación del retiro del subsistema workflow relacional (REQ-06)**:
- Objetos: `workflow.json`, `workflowStatus.json`, `workflowTransition.json`, `workflowTransitionHistory.json` (base, solo en curriculum-design) → 4 tablas Prisma + `ext__uplanner__*` por tenant + FKs `Activity.workflowId`/`currentStatusId`.
- Consumidores de negocio HOY: **ninguno** (Activity/Curriculum/Offering migrados al enum de core; uEngagement no lo usa; `entityType` polimórfico sin consumidor real). Las 3 mutations `*Validated` están expuestas pero sin invocador de producto; gobernadas por `RULE-curriculum-design-003`.
- Bloqueo real (H6): `uengagement-up1/objects/Activity.json:56-73` redeclara `workflowId`/`currentStatusId`; el merge los reintroduce. Root cause = JSON duplicado stale (~18 líneas), no dependencia de negocio.
- Naturaleza del drop: **core + cross-mod + destructivo** — limpiar el JSON de uengagement-up1 (otro owner) + borrar objetos/resolvers/error codes del mod + retirar RULE-003 + `prisma migrate` destructivo (`DROP TABLE` x4 + `ext__*` + `ALTER TABLE Activity DROP COLUMN`) **por tenant** (15+ esquemas).
- **Veredicto: fuera de la capacidad de 106** (mod-only, no destructivo). 106 documenta la evaluación + plan; la ejecución va a un ticket propio coordinado (team core + owner uengagement-up1). Ver DEC-INTAKE-05.

### Decisiones del intake

- **DEC-INTAKE-01 — Offering fuera de alcance**: no declara `transitions` (H3). REQ-02 se acota a Curriculum.
- **DEC-INTAKE-02 — Write-path sin cambios (veredicto A)**: basta el cambio de layout (H4).
- **DEC-INTAKE-03 — super autopilot + teach skip** (HOR-106).
- **DEC-INTAKE-04 — Cleanup acotado a los 5 `ACTIVITY_*`** (dev, 2026-07-15): remover solo los 5 error codes huérfanos de `errors.js:30-34`. NO tocar el subsistema workflow ni el bonus `WORKFLOW_HAS_NO_INITIAL_STATUS`/`getInitialStatus.js` en este ticket.
- **DEC-INTAKE-05 — Retiro del subsistema workflow: evaluar en 106, ejecutar aparte** (dev, 2026-07-15): 106 produce la evaluación de impacto + plan (REQ-06); la remoción destructiva (core + cross-mod, migración por tenant) se deriva a un ticket propio. Motivo: excede mod-only y no-destructivo.
- **DEC-INTAKE-06 — Consolidar docs en 106** (dev, 2026-07-15): 106 es dueño de la limpieza + docs del mod + RULE-004. El chip `task_070a8813` ya estaba corriendo y NO se pudo cerrar → reconciliar su output (RULE-004 + docs que ya haya tocado) al ejecutar S2, sin re-pisar.

## Requirements

### REQ-01: Selector de transiciones para Activity (modo edit)
El campo `status` de Activity en modo edit muestra un selector con los estados alcanzables desde el actual (no un badge read-only). El guardado viaja por `updateInstance` genérico y lo valida `enforceEnumTransitions`.

**Criterios**: estado actual seleccionado; solo destinos alcanzables (`getValidTransitions`); oculta transiciones bloqueadas por condición/permiso; create (sin instanceId) → enum completo; fail-soft al enum completo si el query falla; guardar transición persiste + dispara `onTransition`.

### REQ-01b: Consistencia del campo en modo view
El campo `status` de Activity en modo view deja de usar el badge custom; se resuelve read-only como el resto. Ver Open question sobre presentación visual.

### REQ-02: Verificación de Curriculum (regression)
Curriculum sigue respetando transiciones y muestra solo estados alcanzables (no se toca; verificación de no-regresión). **Offering: N/A** (H3).

### REQ-03: RBAC en selector
El selector respeta `requiredCapabilities` consumiendo `getValidTransitions` (`allowed` resuelto por capability) + defensa en profundidad de `enforceEnumTransitions`.

### REQ-04: Limpieza de error codes huérfanos
Remover los 5 error codes `ACTIVITY_*` huérfanos de `logic/errors.js:30-34` (cero consumidores). NO tocar `WORKFLOW_*`/`WORKFLOW_HISTORY_*` (en uso por RULE-003) ni el bonus `WORKFLOW_HAS_NO_INITIAL_STATUS`.

**Criterios**: los 5 codes eliminados; `grep` post-cambio confirma cero referencias colgadas; suite del mod sigue verde.

### REQ-05: Actualización de documentación del mod + KB
Actualizar los docs stale del mod (CLAUDE.md, .ai/PATTERNS.md, docs/patterns/validated-vs-crud.md, docs/architecture/server-side-integrity.md, docs/reference/mcp-object-contract.md, docs/architecture/workflow-platform-hu3.md) y corregir las afirmaciones **falsas de schema** (`activity.resolver.js:13`, `docs/reference/error-codes.md:34`). Reconciliar `RULE-curriculum-design-004` (KB deckard) con el estado real y con RULE-003.

**Criterios**: ningún doc del mod describe las mutations retiradas como vigentes; las afirmaciones de "columna dropeada"/"ya no existe" corregidas al estado real (columnas aún presentes, drop diferido); RULE-004 refleja que el estado de Activity va por `updateInstance` + `enforceEnumTransitions`; reconciliado con la reconciliación del chip `task_070a8813`.

### REQ-06: Evaluación del retiro del subsistema workflow relacional (deliverable de análisis)
Documentar la evaluación de impacto del drop del subsistema workflow (objetos + resolvers + tablas + columnas + RULE-003), con el plan destructivo por tenant y el root cause del bloqueo (JSON duplicado en uengagement-up1). **No se ejecuta el drop en 106.** Producir la decisión + recomendación de ticket propio.

**Criterios**: la evaluación queda en el spec (sección dedicada); se registra la decisión (drop fuera de 106); se recomienda/crea el ticket de follow-up coordinado (core + uengagement-up1).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | Rama de trabajo actual (dev, 2026-07-15): mod curriculum-design en `feat/UPONE-1382-hard-delete-cascade`; deckard KB en `up1-sp6`. NO se crea rama de ticket. Commits usan external id `UPONE-1381-P4` (DET-19). Ver decision `execute-branch-strategy`. |
| Base branch | develop |
| DB state | tenant UPU. Requiere codegen con `activity.json.status.transitions` (precondición REQ-01) |
| Services | object-manager (4000), suite (3000). Seed layouts: `seed-object-manager-layouts.js` |
| Test data | Activities en UPU en distintos estados |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Docs del mod stale tras UPONE-1381/P4. Un commit de hoy (`0b1d48e`) arregló varios; SIGUEN stale: CLAUDE.md, .ai/PATTERNS.md, docs/patterns/validated-vs-crud.md, docs/architecture/server-side-integrity.md, docs/reference/mcp-object-contract.md, docs/architecture/workflow-platform-hu3.md + RULE-004 (KB) | intake (agent verify) | S0 | discarded | — |
| L2 | `requiresComment` de las transiciones de Activity NO se enforcea (core D-S5-2 pendiente + sin UI). No es huérfano: es metadata/input a futuro | intake (agent verify) | S0 | discarded | — |
| L3 | Afirmaciones FALSAS de schema: `activity.resolver.js:13` y `error-codes.md:34` dicen que `workflowId`/`currentStatusId` fueron dropeadas, pero siguen en el Prisma de todos los tenants (drop diferido, no ejecutado) | intake (agent verify) | S0 | discarded | — |
| L4 | El "bloqueo por uEngagement" del drop del workflow NO es dependencia de negocio: es `uengagement-up1/objects/Activity.json:56-73` que redeclara `workflowId`/`currentStatusId` y el merge append-only (`fileSync.js:744-752`) los reintroduce. Root cause = JSON duplicado stale | intake (agent verify) | S0 | refined | RULE-curriculum-design-043 |
| L5 | El subsistema workflow relacional (4 objetos + 3 resolvers `*Validated` + RULE-003) no tiene escritor de negocio hoy, pero NO es código muerto: expuesto + gobernado. Su drop es core + cross-mod + destructivo (migración por tenant) → ticket propio | intake (agent verify) | S0 | discarded | — |
| L6 | El seed de default layouts del mod a `up1_layen_layout` NO es `up1-manager/scripts/seed-object-manager-layouts.js` (ese siembra los layouts propios de la app up1-manager desde `up1-manager/config/layouts`). El mecanismo real es **dbSync Phase 5 `syncAppsAndLayouts`** (`object-manager/scripts/sync/dbSync.js:500-557`, `700+`), que lee **directo** de `mods/<mod>/config/layouts/*.json` y upsertea por `name` por tenant. Ruta canónica acotada: `DEV_TENANTS=UPU npm run sync:db` (solo fases DB, sin Prisma/mirror). Corrige la suposición del Context found del intake | S1.T3 (execute) | 1 | refined | RULE-curriculum-design-044 |
| L7 | `sync:db` Phase 7 (seed de reportes de ejemplo de report-builder) emite ~22 warnings `prisma.report.delete() FK constraint ext__uplanner__report_reportId_fkey` en UPU. Preexistente, ajeno a 106 (report-builder), no bloquea el sync de layouts (Errors: 0, exit 0). No corregir en 106 | S1.T3 (execute) | 1 | discarded | — |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Plan de sessions (preplanificacion)

2 sessions previstas. **Esqueleto producido por `intake-explore`, refinado en design-improvement.** Puede subdividirse en execute.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Precondición codegen + layout Activity (edit+view) badge→select + seed + smoke runtime (Activity edit/view + regression Curriculum + RBAC) | 1 | T3 | ~5 | ⚑ fuerte | Precondición confirmada; selector muestra solo alcanzables; guarda transición + evento; view read-only OK; Curriculum sin regresión; destino por capability oculto |
| S2 | Limpieza de los 5 error codes `ACTIVITY_*` + actualización de docs stale del mod + corrección de afirmaciones falsas de schema + reconciliación RULE-004/RULE-003 + evaluación workflow + crear follow-up ticket | 2 | T1 | ~4 | auto | 5 codes removidos sin refs colgadas + suite verde; docs sin refs stale; RULE-004 reconciliada; evaluación registrada + follow-up ticket creado |

**Notas**:
- Numeración continua (DET-20): sin sessions previas → S1, S2.
- S1 ⚑ fuerte/T3: user-facing + verificación empírica de precondición (verify por el path real de UI — memoria verify-rendered-ui + verify-real-write-entry-path).
- S2 auto/T1: cambio de código acotado (errors.js) + docs (T0). Reconciliar con el output del chip `task_070a8813` antes de editar (DEC-INTAKE-06).

### Session 1 — 2026-07-15 19:27 — Precondición codegen + layout Activity badge→select + seed + smoke runtime [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa + smoke UI)

**Objetivo**: Activar el selector de transiciones de `status` en Activity (edit+view) reemplazando el badge read-only por `select`, previa verificación de la precondición de codegen (transitions en `core_FieldDefinition` del tenant UPU), sembrar los layouts a BD, y verificar por el path real de UI que el selector muestra solo estados alcanzables, guarda transiciones + evento, cae fail-soft, view read-only, sin regresión en Curriculum y con RBAC por capability.

**Tasks completadas**:
- [x] S1.T1 — Verificar precondición: `activity.json.status.transitions` en `core_FieldDefinition` del tenant UPU (codegen aplicado); si falta, bloquear y correr codegen/sync canónico
- [x] S1.T2 — Cambiar `status.type` badge→select en `default_Activity_edit.json` y `default_Activity_view.json`
- [x] S1.T3 — Sembrar layouts a BD (`up1_layen_layout`) vía seed-object-manager-layouts
- [x] S1.T4 — Smoke Activity por path real de UI: edit alcanzables (TC-01), create enum (TC-02), guardar transición + evento (TC-03), fail-soft (TC-04), view read-only (TC-05)
- [x] S1.T5 — Regression Curriculum (TC-06) + RBAC Activity (TC-07)
- [x] S1.GATE — Gate de sync Session 1 (T3): smoke + regression + quality review, decidir

**Validación del tier**:
- T3 — smoke UI por path real (UPU, Consultor): TC-01 ✓ (edit alcanzables), TC-03 ✓ (guarda Draft→InReview persiste, BD confirmada), TC-04 ✓ (fail-soft enum completo), TC-05 ✓ (view read-only sin badge), TC-06 ✓ (Curriculum sin regresión), TC-07 ✓ (RBAC: Diseñador Curricular no ve Approved). TC-02 N/A (create omite status). TC-11 bonus ✓ (transición ilegal rechazada por enforceEnumTransitions). TC-00 ✓ (precondición codegen).
- Cambio config-only (2 layouts JSON); sin cambios de código en el mod → suite unitaria del mod no afectada (no ejecutada; la evidencia T3 es el smoke runtime, no unit).

**Discoveries / Learns nuevos**:
- L6: el seed real de default layouts es dbSync Phase 5 (`sync:db`), no el script de up1-manager (corrige Context found del intake).
- L7: warnings preexistentes de FK en seed de reportes de report-builder (ajeno a 106).
- L8: `mods/curriculum-design/capabilities.json` describe mutations retiradas (`transitionActivityValidated`, `currentStatusId`, "Ready SP2") en las descripciones de `mod/curriculum-design:approve|publish` y `activity:modify` → doc stale adicional. NO está en el execute_scope de 106; candidato a S2 (docs) o follow-up.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (autopilot super)
**Tier de revision**: light (cambio config-only, 2 JSON, sin lógica)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Diff mínimo: `type` badge→select + quita `readOnly` solo en edit; JSON válido |
| 2 | Lint/format | n/a | JSON; validado con JSON.parse |
| 3 | Tipado | n/a | Sin TS |
| 4 | Testing | pass | Verificación runtime por path real (7 TC + 1 bonus + precondición); write-path negative test |
| 5 | Escalabilidad | pass | Reusa motor de enum de core; cero artefactos nuevos (DET-32 reduce/reuse) |
| 6 | Mantenibilidad | pass | Menos deuda: deja de depender del componente custom badge |
| 7 | Claridad | pass | Consistente con Curriculum (mismo mecanismo) |
| 8 | A11y | pass | Select estándar Vueform (reemplaza badge no interactivo) |
| 9 | Storybook | n/a | Cambio de config de layout, no componente |
| 10 | Error handling | pass | Fail-soft verificado (TC-04); enforcement de escritura verificado (TC-11) |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-07-15 20:00 — Limpieza error codes + docs stale + reconciliación RULE-004 + evaluación workflow + follow-up [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T1 (grep + suite del área)

**Objetivo**: Cerrar el lado-mod de la migración: reconciliar el output del chip `task_070a8813`, remover los 5 error codes `ACTIVITY_*` huérfanos, actualizar la documentación stale del mod y corregir las afirmaciones falsas de schema, reconciliar RULE-004 con el estado real y RULE-003, registrar la evaluación del subsistema workflow y crear/recomendar el follow-up ticket coordinado.

**Tasks completadas**:
- [x] S2.T1 — Reconciliar output del chip `task_070a8813` (qué tocó de RULE-004 + docs) antes de editar, para no re-pisar
- [x] S2.T2 — Remover los 5 error codes `ACTIVITY_*` de `logic/errors.js`; grep confirma cero refs; suite del mod verde
- [x] S2.T3 — Actualizar docs stale del mod + corregir afirmaciones falsas de schema (`activity.resolver.js`, `error-codes.md`) + reconciliar RULE-004/RULE-003
- [x] S2.T4 — Registrar evaluación del subsistema workflow + crear/recomendar follow-up ticket coordinado (core + uengagement-up1)
- [x] S2.GATE — Gate de sync Session 2 (T1): suite del mod + grep + quality review, decidir

**Iterate — feedback del dev (post-reset de BD)**:
- El dev hizo reset de BD y pidió: (1) `status` debe quedar en el mismo orden en edit que en view (aparecía primero); (2) no full-width. Además validar que la BD quedó bien tras el reset.
- **DB post-reset re-validada**: `sync:db` (DEV_TENANTS=UPU) re-sembró; ambos layouts con `status.type=select` (edit editable, view read-only), orden y anchos correctos. Errors: 0.
- **Fix layouts (S1 refinado, commit 373da6f)**: `status` movido de primero → **después de Vigente** (isCurrent) en edit+view; ancho de full-width (container 12) → **tercio (container 4)**; `executionUnitId` 6→4 para armar fila limpia de 3 (Unidad Organizativa | Vigente | Estado). Smoke runtime UPU: edit muestra select [Borrador, En revisión] editable en la fila correcta; view muestra Estado read-only en la misma posición.

**Validación del tier**:
- T1 — suite unitaria del mod: **1186/1186 verde (68 files)** (tras remover 5 error codes). grep TC-09: cero refs a mutations retiradas como vigentes (solo contexto histórico) + cero claims falsos de columna. `node --check` OK en los 4 JS editados.

**Discoveries / Learns nuevos**:
- L9: el orden y ancho de `status` en los layouts se heredó de cuando era badge (primero, full-width). Al volverlo selector editable, el dev pidió reubicarlo (tras Vigente, tercio) — verificado por smoke tras reset de BD.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (autopilot super)
**Tier de revision**: standard (código dead-code removal + docs + layout)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Remoción limpia de 5 codes; cero refs colgadas; comentarios corregidos al estado real |
| 2 | Lint/format | pass | JSON válido; `node --check` OK en JS |
| 3 | Tipado | n/a | Sin TS en lo tocado |
| 4 | Testing | pass | Suite 1186/1186; smoke runtime del layout refinado |
| 5 | Escalabilidad | pass | Menos dead code + docs al día reducen deuda de la migración |
| 6 | Mantenibilidad | pass | Docs ya no describen mutations retiradas como vigentes; claims falsos de schema corregidos |
| 7 | Claridad | pass | Secciones históricas claramente marcadas RETIRADO; subsistema workflow (RULE-003) preservado |
| 8 | A11y | pass | Selector estándar; orden de campos más natural (Nombre primero) |
| 9 | Storybook | n/a | Config/docs, no componentes |
| 10 | Error handling | pass | Sin cambios de runtime en error handling (solo se removieron codes sin emisor) |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 | Selector Activity edit: solo alcanzables / create enum completo / fail-soft / guardar persiste + evento | manual/smoke | pending |
| REQ-01b | Activity view read-only sin badge | manual/smoke | pending |
| REQ-02 | Curriculum edit sin regresión | manual/smoke | pending |
| REQ-03 | Destino por capability oculto sin permiso | manual/smoke | pending |
| REQ-04 | 5 error codes ACTIVITY_* removidos sin refs colgadas + suite verde | grep + test | pending |
| REQ-05 | Docs del mod sin refs a mutations retiradas + afirmaciones de schema corregidas | grep/review | pending |
| REQ-06 | Evaluación workflow registrada + follow-up ticket creado | review | pending |
| Precond | codegen persistió transitions en core_FieldDefinition (UPU) | check | pending |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-00 | Precondición transitions en core_FieldDefinition | Precond | check | UPU, codegen aplicado | Query `core_FieldDefinition.properties->transitions` para `status` de Activity en `uplanner_upu` (S1.T1, 2026-07-15) | transitions no vacío para Activity.status | 8 transiciones pobladas (Draft→InReview; InReview→Approved[activity:approve]; …; Deprecated→Archived[activity:archive]); proyecciones `rt__Course__activity` y `rt__Service__Activity` también con transitions; `ActivityLine`=null (esperado) | Query DB directa UPU: Activity.status.transitions con 8 entries incl. requiredCapabilities/requiresComment | ✓ pass |
| TC-01 | Selector Activity edit solo alcanzables | REQ-01 | smoke | Activity "Draft" | Abrir edit | Draft + InReview; no Approved/Active/etc | Select nativo con **exactamente 2** opciones: Draft(Borrador, selected) + InReview(En revisión); sin Approved/Active/Deprecated/Archived; editable (disabled=false); i18n aplicado | Runtime UPU, Álgebra Lineal (`/UPU/Activity/…/default_Activity_edit`), DOM `#status` options via UI real | ✓ pass |
| TC-02 | Selector Activity create enum completo | REQ-01 | smoke | create (sin instanceId) | Abrir form create | 6 valores del enum | El layout `default_Activity_create` **NO incluye el campo status** (schema+elements); las Activities nacen Draft (static_default). No hay superficie de status en create en la UI real → escenario no ocurre | Inspección layout create del mod + confirmación en runtime | N/A (create omite status por diseño) |
| TC-03 | Guardar transición persiste + evento | REQ-01 | smoke | Activity "Draft" edit | InReview + guardar | updateInstance OK, status=InReview, evento onTransition | Guardado por mutation genérica `updateInstance` (RecordDetail.vue:1642); toast "Registro actualizado correctamente"; lista muestra InReview; **BD `Activity.status`='InReview'** confirmado (UPU). onTransition: **ninguna transición de Activity declara `onTransition.event`** (instance.resolver.js:194 solo emite si la arista lo declara; verificado en field-def + activity.json) → no hay evento que emitir para Draft→InReview; la persistencia es el comportamiento completo | Runtime UPU (UI real) + query BD directa + código | ✓ pass |
| TC-04 | Fail-soft getValidTransitions caído | REQ-01 | smoke | query caído | Abrir edit | Cae al enum completo, no rompe | Interceptor de fetch forzó fallo de getValidTransitions; el select cayó al **enum completo de 6** (Borrador/En revisión/Aprobado/Activo/Deprecado/Archivado), sin romper el form | Runtime UPU (SPA nav), interceptor + DOM options | ✓ pass |
| TC-05 | Activity view read-only sin badge | REQ-01b | smoke | Activity "Active" | Abrir view | Estado read-only sin badge custom | View renderiza ESTADO como `<input>` Vueform **disabled** (value="Draft"), `hasBadge=false` (sin activity-status-badge); coherente con demás campos read-only | Runtime UPU (`/UPU/Activity/…/default_Activity_view`), DOM del campo | ✓ pass |
| TC-11 (bonus) | enforceEnumTransitions gobierna la escritura (negative) | REQ-01/REQ-03 | smoke | Activity "InReview" | updateInstance status=Archived (ilegal) por path real | Backend rechaza la transición no declarada | Rechazado: *"Transición no permitida para status: InReview → Archived no está declarada"*, `updateInstance=null`. Guard NO es no-op | Replay de mutation con headers auth/tenant reales (x-tenant-id UPU, x-selected-role Consultor) contra :4000 | ✓ pass |
| TC-06 | Curriculum edit sin regresión | REQ-02 | smoke | Curriculum "Active" | Abrir edit | Destinos alcanzables como antes | Curriculum "Minor en Matemática Aplicada" (Active) en edit: select nativo con Active(Activo, current) + Draft(Borrador) alcanzable; selector filtrado funciona igual que antes; el cambio en Activity no lo afectó | Runtime UPU (`/UPU/Curriculum/…/default_Curriculum_edit`), DOM `#status` | ✓ pass |
| TC-07 | RBAC destino por capability oculto | REQ-03 | smoke | Activity "InReview", sin activity:approve | Inspeccionar destinos | "Approved" no aparece | Registro InReview vía getValidTransitions (query real de la UI) variando `x-selected-role`: **Diseñador Curricular → Approved `allowed=false, reason=capability`** (oculto), Draft `allowed=true`; Revisor/Autoridad Curricular y Consultor → Approved `allowed=true` (tienen la capability). `buildTransitionItems` filtra allowed=false (mismo path de TC-01) | Runtime UPU, getValidTransitions con header de rol real contra :4000 | ✓ pass |
| TC-08 | 5 error codes ACTIVITY_* removidos | REQ-04 | grep+test | post-edit errors.js | grep ACTIVITY_NOT_FOUND/NO_WORKFLOW/TRANSITION_INVALID/WORKFLOW_ARCHIVED/STATUS_READ_ONLY en mod | cero matches fuera de git history; suite del mod verde | 5 codes removidos de errors.js (0 keys ACTIVITY_* en el export); cero refs `ERR.ACTIVITY_*` a errors.js (los `ACTIVITY_NOT_FOUND` restantes son consts locales con valores prefijados en activity-formtemplate/syllabus-offering, no consumen errors.js); suite **1186/1186 verde (68 files)** | `node import` errors.js + grep + `npm test` | ✓ pass |
| TC-09 | Docs sin refs stale + schema corregido | REQ-05 | grep/review | post-edit docs | grep transitionActivityValidated/updateActivityValidated/ACTIVITY_STATUS_READ_ONLY como vigentes; revisar afirmaciones de columna | docs describen el estado real; afirmaciones falsas corregidas | Editados: CLAUDE.md, .ai/PATTERNS.md, docs/patterns/validated-vs-crud.md, docs/architecture/server-side-integrity.md, docs/reference/mcp-object-contract.md, docs/architecture/workflow-platform-hu3.md, logic/activity.resolver.js, seed/seed.js, logic/helpers/{activityEvaluations,evaluationWeight}.js + RULE-004 (deckard). grep: cero refs a mutations retiradas como vigentes (solo contexto histórico explícito: strikethrough, bloque "Se RETIRARON", `<details>` RETIRADO); cero claims falsos "columna dropeada" (corregidos a drop diferido + columnas presentes); subsistema workflow (RULE-003) preservado. `node --check` OK en los 4 JS. error-codes.md ya estaba limpio (commit 0b1d48e) | grep + review + node --check; agente sonnet para los 6 docs, verificado por DET-33 | ✓ pass |
| TC-10 | Evaluación workflow + follow-up | REQ-06 | review | post-S2 | Revisar sección de evaluación en spec + ticket follow-up | Evaluación completa + ticket creado/recomendado | Evaluación completa en el spec (sección "Evaluación": alcance del drop, consumidores=ninguno, root cause H6/L4 = JSON duplicado en uengagement-up1, plan destructivo por-tenant, veredicto fuera-de-106) + DEC-LOCAL-03. Follow-up FU-1 registrado en Backlog del ticket (priority should), **recomendado no creado** en Jira (pendiente confirmación del dev por memoria follow-up-local). Drop NO ejecutado (correcto) | review spec + ticket Backlog | ✓ pass (evaluación registrada + follow-up recomendado) |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|

## Backlog / Follow-ups

> Items descubiertos, fuera del alcance ejecutable de 106. Ninguno es `must` → no bloquean el cierre (DET-17). El drop del workflow es deferido por diseño (DEC-LOCAL-03).

| # | Item | Priority | Owner sugerido | Notas |
|---|------|----------|----------------|-------|
| FU-1 | **Retiro del subsistema workflow relacional** (drop destructivo) — deliverable de REQ-06 | should | team core + owner uengagement-up1 | Evaluación + plan por-tenant en el spec (sección "Evaluación") + DEC-LOCAL-03. Prerequisito: limpiar `uengagement-up1/objects/Activity.json:56-73` (redeclara workflowId/currentStatusId; el merge append-only los reintroduce). **Ticket propio: RECOMENDADO, no creado** (Jira requiere confirmación del dev — memoria follow-up-local). ¿Creo el ticket Jira/DKC? |
| FU-2 | `seed/SMOKE-UPU.md` stale post-migración (describe smoke HU3/HU4 con workflow relacional + `transitionActivityValidated`) | could | curriculum-design | Detectado en S2.T3; no estaba en execute_scope. Doc de smoke, no runtime |
| FU-3 | `capabilities.json` — descripciones de `mod/curriculum-design:approve\|publish` y `activity:modify` citan mutations retiradas (`transitionActivityValidated`, `currentStatusId`, "Ready SP2") | could | curriculum-design | L8. Descripciones de capabilities, no afectan enforcement |
| FU-4 | Componente `ActivityStatusBadge` (`layout/src/modsComponents/ActivityStatusBadge/`) quedó sin consumidor tras el cambio de layout (ningún layout usa `activity-status-badge`) | could | curriculum-design + layout (core) | Candidato a remoción; layout/ es core (requiere permiso explícito) |
| FU-5 | Seed de reportes de ejemplo de report-builder: ~22 warnings `prisma.report.delete() FK ext__uplanner__report_reportId_fkey` en `sync:db` UPU | could | report-builder | L7. Preexistente, ajeno a curriculum-design |

## Teaching — Intake

**Status**: skipped
**Razon**: teach_policy: skip (opt-out explícito del dev, HOR-106). El aprendizaje del intake queda capturado inline en Triage + Context found + Learns.
**Archivo**: (no generado por decisión del dev en intake)

## Teaching — Close

**Status**: skipped
**Razon**: teach_policy: skip — opt-out explicito del dev (HOR-106); aprendizaje del cierre capturado inline en Sessions + Summary + Learns L1-L9 + Backlog

## Summary

**Cerrado 2026-07-15.** Se completó el lado-mod de la migración UPONE-1381/P4 en `curriculum-design`, en 2 sessions, sobre la rama de trabajo actual (`feat/UPONE-1382-hard-delete-cascade`) por directiva del dev, con commits bajo el external id `UPONE-1381-P4`.

**Qué se entregó:**
- **Selector de transiciones de Activity** (REQ-IMPROVE-01/02/03): `status` badge→select en edit (editable) y view (read-only sin badge custom); el save viaja por `updateInstance` genérico y lo valida `enforceEnumTransitions` (sin cambios de write-path, veredicto A). Verificado por UI real en UPU: solo alcanzables, fail-soft al enum completo, RBAC por capability, y transición ilegal rechazada por el guard. Ajuste de feedback del dev: `status` reubicado tras "Vigente" y a ancho de tercio (fila Unidad Organizativa | Vigente | Estado). BD re-validada tras reset del dev (`sync:db` UPU).
- **Cleanup** (REQ-IMPROVE-04): removidos los 5 error codes `ACTIVITY_*` huérfanos; suite del mod 1186/1186 verde.
- **Docs + KB** (REQ-IMPROVE-05): reconciliados CLAUDE.md, .ai/PATTERNS.md, 4 docs, comentarios de resolver/seed/helpers y RULE-004; corregido el claim falso "columna dropeada" (workflowId/currentStatusId siguen en Prisma, drop diferido). Subsistema workflow (RULE-003) preservado.
- **Evaluación** (REQ-EVAL-06): drop del subsistema workflow evaluado en el spec + DEC-LOCAL-03; follow-up FU-1 recomendado (no creado en Jira, pendiente confirmación del dev).

**Verificación:** acceptance completo (TC-00..TC-11, TC-02 N/A); validación de cierre reforzada por reviewer aislado (super autopilot) → **approve**. Precondición codegen confirmada. Smoke runtime por path real de UI (memorias verify-rendered-ui + verify-real-write-entry-path).

**Decisiones clave:** DEC-LOCAL-01 (write-path sin cambios), DEC-LOCAL-02 (reduce/reuse motor de core), DEC-LOCAL-03 (drop workflow evaluar-aquí/ejecutar-aparte), execute-branch-strategy (rama de trabajo actual).

**Pendiente (no bloqueante):** FU-1 drop workflow (should, coordinado core + uengagement-up1), FU-2 SMOKE-UPU.md stale, FU-3 capabilities.json stale, FU-4 componente ActivityStatusBadge huérfano, FU-5 warnings FK seed report-builder.

**Story points:** estimated 5 → executed 3 (sessions-heuristic; el LLM comprimió la porción automatizable).

**Teach-close:** skipped (teach_policy: skip, HOR-106).

**Sin pushear** (el push siempre requiere confirmación del dev): mod 4 commits + deckard 2 commits.
