---
id: RULE-layout-047
project: up1
type: rule
module: layout
tags:
  - layout
  - RecordList
  - error-handling
  - toast
  - ErrorState
  - negocio-vs-transporte
---

# Un rechazo de negocio va a toast; solo un error de transporte monta el ErrorState full-view

## What

En una mutacion de delete (simple o bulk) sobre RecordList, distinguir dos clases de fallo:

- **Rechazo de negocio** (ej. bloqueo de cascada por RESTRICT): se clasifica con `isBusinessBulkDeleteError`, se muestra como toast (`showWarning`) y la lista permanece montada.
- **Error de transporte** (fallo de red, error no clasificado): setea `error.value`, lo que monta el `<ErrorState>` de vista completa y desmonta la lista.

`error.value` es el mismo ref que gobierna el `ErrorState`; antes del fix, cualquier rechazo (de negocio o de transporte) lo seteaba por igual, asi que un bloqueo de cascada legitimo se mostraba como si la lista hubiera fallado en cargar.

## Why

Cierra el gap ya analizado en `kb/sp8/ANALISIS-recordlist-bulkdelete-business-reject-full-view-gap.md` y en `kb/sp8/BUG-core-recordlist-harddelete-block-renders-as-load-error.md`. El patron se aplico primero al bulk delete (UPONE-1557) y luego al delete simple (UPONE-1600) con el mismo clasificador de `graphqlErrors.ts`, en paridad con el path que ya usaba `customMutation` individual.

## Where

- `layout/src/utils/graphqlErrors.ts` (`isBusinessBulkDeleteError`, funcion clasificadora exportada)
- `layout/src/layouts/RecordList/RecordList.vue:6995` (`handleCriticalDeleteConfirm`): rama de bulk delete que llama `isBusinessBulkDeleteError(bulkErrors)` (`:7049`) y solo setea `error.value` (`:7052`, `:7082`) cuando el error no es de negocio
- `layout/src/composables/useRowMutation.ts` (mismo patron para delete simple, UPONE-1600)
- `layout/src/layouts/RecordList/__tests__/bulkDeleteErrorRouting.spec.ts`

## When

Al agregar un nuevo tipo de rechazo de mutacion en RecordList o al reaccionar a un error de delete en un mod: clasificar primero si es un rechazo de negocio (va a toast, la lista sigue montada) o un fallo de transporte (setea `error.value`, monta `ErrorState`). Nunca setear `error.value` para un rechazo de negocio.

## Source

- **Discovered in**: UPONE-1557, UPONE-1600
