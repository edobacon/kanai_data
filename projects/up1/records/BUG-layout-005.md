---
id: BUG-layout-005
project: up1
type: bug
module: layout
tags:
  - layout
  - rowAction
  - RecordDetail
  - modal
  - navigation
  - tabs
  - useRowActionHandler
---

# rowAction type:modal + targetLayoutType:RecordDetail abre modo create sin instanceId (no hay navegación-a-tab del detalle)

## Symptom

Una `rowAction` declarada con `type: "modal"` + `targetLayoutId: "default_<Obj>_view"` + `targetLayoutType: "RecordDetail"` NO abre el detalle del registro de la fila: abre un **formulario de creación en blanco** de un objeto `unknown`. Además, no existe ningún mecanismo en el RowAction para abrir el detalle en una **pestaña específica** (deep-link a tab).

## Expected behavior

Una rowAction que apunta a un `RecordDetail` debería abrir el detalle **del registro de la fila** (modo view, con su `instanceId`), idealmente pudiendo activar una pestaña concreta. Es lo que pedía REQ-02 de SPEC-curriculum-design-mesh-view ("acción del listado que navega al detalle en la pestaña de malla").

## Root cause

- **File**: `layout/src/composables/useRowActionHandler.ts:309-323`
- **Cause**: el handler de `type: "modal"` sólo setea `modalOptions.instanceId = record.id` + `mode: 'view'` cuando `layoutType ∈ {RecordList, ChibiList, Calendar, OfferingCalendar}`. Para `RecordDetail` cae a la rama `else`, que fuerza `mode: 'create'` y **nunca** setea `instanceId`. Sin `instanceId`, el `{{parentId}}` que usan los layouts de detalle (ej. `planId: "{{parentId}}"`, filtros `curriculumId={{parentId}}`) no resuelve. Además, si falta `targetObjectName`, el modal abre con `objectName: 'unknown'` (línea 292). No hay un `type` de rowAction para "navegar a ruta de detalle + tab".

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | cualquier usuario que use una rowAction modal→RecordDetail |
| Data affected | ninguna (no persiste; abre form vacío) |
| Modules affected | layout (motor de rowActions); cualquier mod que intente esa acción |
| Frequency | siempre que se configure esa combinación |

## Reproduction

### Environment
| Campo | Valor |
|-------|-------|
| Environment | dev |
| Client | suite (Nuxt) |
| Data conditions | un layout RecordList con rowAction modal→RecordDetail |

### Steps
1. Declarar en un `default_<Obj>_list.json` una rowAction `{ type: "modal", targetLayoutId: "default_<Obj>_view", targetLayoutType: "RecordDetail" }`.
2. Abrir el listado y disparar la acción en una fila.
3. Resultado observado: se abre un modal de **creación** en blanco (objeto `unknown`), no el detalle del registro.

## Workaround

Usar la navegación por **click de fila** (con `openMode: "route"` + `associatedLayoutConfigs.view`), que sí pasa el `instanceId` y abre el detalle (aunque en la pestaña por default, no una específica). Para MC-05 (TICKET-085) se **eliminó** la rowAction rota y la acción dedicada del listado se difirió a backlog `should` (DEC-LOCAL-03 del spec) — el acceso a la malla queda por row-click → detalle → pestaña.

## Solution

(Propuesta — no implementado en SP5, es core/layout fuera de alcance del mod) El handler debería: (a) soportar `RecordDetail` en modo `view` pasando `instanceId = record.id` (análogo a las ramas de RecordList/Calendar), y/o (b) ofrecer un `type` de rowAction de **navegación de ruta** con destino de pestaña (`tab`/`activeTab`). Mientras no exista, NO usar modal→RecordDetail para "ver" un registro.

## Related

- **Rules**: —
- **Decisions**: DEC-LOCAL-03 (SPEC-curriculum-design-mesh-view) — difiere REQ-02 acción-listado a backlog
- **Specs**: SPEC-curriculum-design-mesh-view (TICKET-085 / MC-05), learn L2
