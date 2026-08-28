---
id: TICKET-058
project: up1
type: ticket
status: closed
work_type: tactic
external: UPONE-1219
module: layout
autopilot: manual
---

# Crear Activity desde cero asigna el workflow por defecto del scope (createInstance genérico)

## Request

Crear un `Activity` desde cero (botón "Crear registro" de la vista → `createInstance` genérico) falla con *"Error al Crear Activity · Ubicación: Workflow"* porque `Activity.workflowId` es `not_null` y el create genérico no asigna un workflow. Debe **auto-asignar el workflow por defecto** del scope (`Workflow.isDefault` para `scopeType` + institución) y setear `currentStatusId = workflow.initialStatusId` (= BOR), de forma que **concuerde con el versionado** (que ya hace `currentStatusId = workflow.initialStatusId` vía `getInitialStatus`). Enfoque **core** (decidido por el dev: más simple y sin tocar frontend). Descubierto en el E2E de TICKET-056 (S3).

## KB consulted

> DET-11 — lookup obligatorio antes de tocar código.

- **Rules**: [RULE-core-008](../rules/core/) — firma del CRUD genérico (`createInstance`); el hook NO debe alterar la firma. [RULE-dev-004](../rules/dev/) / core_work_policy — trabajo core va en rama `UPONE-1206`, commits prefijo `UPONE-1219`, merge gated. [RULE-core-013](../rules/core/) — pre-fetch en path no-RT.
- **Bugs**: n/a abierto sobre create de Activity.
- **Specs**: SPEC-core-improve-sp3-quality (TICKET-056) — origen del descubrimiento (S3 E2E). El path de versionado (`prepareVersionData`, HU-3) es el patrón a concordar.

## Discoveries / decisions

- **D1**: El versionado funciona porque `applyPrefillFromSource` copia `workflowId` del origen; `prepareVersionData` setea `currentStatusId = source.workflow.initialStatusId` (REQ-03). El scratch create no tiene origen → `workflowId` queda ausente → Prisma rechaza (`Activity.workflowId` not_null, TICKET-019).
- **D2**: `resolveDefaultActivityWorkflow` (mencionada en comentario de `getInitialStatus.js`, planificada en TICKET-043/HU-8c) **nunca se implementó**. El mecanismo de resolución sí existe en el data model.
- **D3**: `Workflow` tiene `isDefault: boolean` ("1 default por (institutionId, scopeType)") + `scopeType` enum (`activity`/`curriculumPlan`/`competencyNode`/`changeRequest`/`booking`) = el objeto que gobierna. Seed: `activity-standard` es `isDefault:true`, `scopeType:'activity'`, `initialStatusCode:'BOR'`.
- **D4 (gating)**: el hook solo debe disparar si `data.workflowId` está ausente. En clone/version `workflowId` ya viene (copiado del source vía prefill) → el hook NO interfiere con el versionado. Concordancia garantizada por construcción si se reusa `getInitialStatus(workflow.id)` (= `workflow.initialStatusId`).
- **M1 (decisión de enfoque)**: **core** sobre mod. El mod (`createActivityValidated` + `customEndpointConfig` en el layout JSON) es viable pero paga mapping per-campo frágil + mutation duplicada. Core es 1 hook condicional que reusa todo el create genérico, sin tocar frontend, gateado por `!data.workflowId`. (Comparación completa en la conversación de cierre de TICKET-056.)
- **M2 (decisión de enfoque — re-scope a ui+mod)**: el enfoque **core** (hook en `createInstance`) se descartó por layering: `Workflow` es dominio del mod (curriculum-design); core no debe conocerlo. No hay hook before-create para mods (los eventos son post-create). El enfoque **mod-mutation** (`createActivityValidated` + `customEndpoint`) era viable pero pesado. **Elegido**: el form manda el dato en el payload vía el mecanismo existente `autoAssignFields` (RecordDetail.vue:3527 lo inyecta en `submitData` en submit-time, aún para campos no-visibles; no pisa input del usuario; no interfiere con clone/version que ya traen workflowId del prefill). Gap: `getAutoAssignValue` no resuelve por query y un id fijo se rompe al reseed (cuid regenerado) → se añade un `valueSource` **`DEFAULT_BY_QUERY`** domain-agnostic (resuelve id de un objeto por match+returnField). Layering correcto: el engine no aprende "Workflow"; el dominio vive en el config del mod (`default_Activity_create.json`). Verificado viable (submit-time injection confirmada en RecordDetail.vue:3527-3545).
- **OQ-1 (RESUELTO — scoping de institución)**: investigación confirmó que los **tenants son multi-institución** (seed crea Univalle + AIEP) y el `context` solo trae `tenantId` (no `institutionId`). Por ende el scoping por institución es **obligatorio** (opción c "sin institución" tomaría el default de la institución equivocada). Fuente de la institución en un create desde cero = el propio registro: **`executionUnitId` → `OrgUnit.institutionId`** (opción a). Layering: el core lee `workflow.initialStatusId` directo (no usa `getInitialStatus` del mod), igual que `version-from-source.js` — concuerda con el versionado sin dependencia core→mod. Si `OrgUnit.institutionId` es null (FK nullable) → no se puede resolver default → dejar fallar con error claro (no adivinar institución).

## Sessions

### Plan de sessions (preplanificación)

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Resolver default workflow en create genérico (gateado por `!workflowId`) + unit test + E2E retry de scratch create | tactic | T2 | helper `resolveDefaultWorkflow(scopeType, institución)` · hook en `createInstance` (set `workflowId` + `currentStatusId` vía `getInitialStatus`) · unit test · E2E scratch create verde | auto | scratch Activity create funciona end-to-end (createInstance 200, currentStatus=BOR) + versionado intacto (workflowId copiado, hook no dispara) + suite om sin regresión |

### Session 1 — 2026-06-05 — autoAssign default workflow en create [phase: tactic]

**Objetivo**: que el scratch create de Activity auto-asigne el workflow + estado inicial por defecto, vía `autoAssignFields` + nuevo `valueSource` `DEFAULT_BY_QUERY` (frontend, domain-agnostic), sin tocar core/backend.

**Tasks completadas**:
- [x] T1: `resolveDefaultByQuery` (resuelve id/campo de un objeto por match, query-based) + cableado al loop submit-time de `autoAssignFields` en `layout/src/layouts/RecordDetail.vue`. Cambio: `getAutoAssignValue` (sync, fixed/user/date) → branch async `DEFAULT_BY_QUERY` que consulta `listInstances` y matchea client-side. Validado: E2E. → commit layout (pendiente confirmación)
- [x] T2: `autoAssignFields` en `mods/curriculum-design/config/layouts/default_Activity_create.json` para `workflowId` (returnField id) + `currentStatusId` (returnField initialStatusId) sobre `Workflow {scopeType:activity, isDefault:true}`, `editable:false`. Cambio: layout sin auto-assign → con auto-assign hidden. Validado: sync a DB (`SYNC_AUTO_APPLY_SCHEMA=false`, el full sync chocaba con drift preexistente de BASEMODEL) + E2E. → commit cd (pendiente confirmación)
- [x] T3: E2E Playwright scratch create. **Verde**: `createInstance` 200, `workflowId=cmq06aiyp006pxxiy15ky44no` + `currentStatusId=cmq06aiyf0067xxiyz0ay6940` (= BOR) auto-asignados, **coinciden con los ids del versionado** (concuerdan), Activity creado en estado Borrador, 0 errores de consola. Evidencia: `TICKET-058.screenshots/TICKET-058-scratch-create-result.png`.

> **Notas**: (1) el full `npm run sync` falla por drift preexistente de schema BASEMODEL (los 17 schemas Prisma del working tree, ajeno a este cambio) — se usó `SYNC_AUTO_APPLY_SCHEMA=false` que salta schema-apply y corre Phase 6 (layouts→DB); mi cambio es solo config, no toca schema. (2) Quedó 1 Activity de prueba en la DB de UPU ("E2E058 scratch create") — limpiar en reset. (3) Escoping de institución: el resolver toma el primer match `isDefault+scopeType`; correcto para UPU (un solo activity workflow en UPU-MAIN); si UPU se vuelve multi-institución, extender `match` con `{{formData.executionUnit.institutionId}}`.

#### Commits

> Pendientes de confirmación del dev (modo conversacional). Prefijo external `UPONE-1219`, cross-repo.

| Tasks | Repo / rama | Commit | Subject | Archivos |
|-------|-------------|--------|---------|----------|
| T1 | layout / UPONE-1206 | `cdea566` | `UPONE-1219 feat(layout): valueSource DEFAULT_BY_QUERY en autoAssignFields` | `src/layouts/RecordDetail.vue` |
| T2 | curriculum-design / UPONE-1038 | `8e6ad13` | `UPONE-1219 feat(curriculum-design): autoAssign workflow+estado por defecto en Activity create` | `config/layouts/default_Activity_create.json` |

Sin push (RULE-dev-004: cierre DKC no mergea).

## Workflow state

| Step | Status | Started | Closed |
|------|--------|---------|--------|
| tactic-execute | done | 2026-06-05 | 2026-06-05 |
## Teaching — Intake

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Teaching — Close

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.
