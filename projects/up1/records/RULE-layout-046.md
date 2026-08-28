---
id: RULE-layout-046
project: up1
type: rule
module: layout
tags:
  - layout
  - hooks
  - afterSave
  - afterDelete
  - afterMutation
  - composableHooks
  - best-effort
---

# Los tres hooks de ciclo de vida comparten shape y son best-effort

## What

`afterSave` (RecordDetail), `afterDelete` (RecordList) y `afterMutation` (row actions de tipo `mutation`) son la misma clase de hook: un layout declara una lista de `{ composable, method }`, y tras la escritura correspondiente se invoca cada uno con la firma `(apolloClient, recordId, record)`. Un composable escrito para uno de los tres sirve para los otros dos sin adaptacion.

Los tres son best-effort: si un hook lanza, se loguea y se descarta. La escritura que los disparo ya esta commiteada quando corren, asi que un hook roto nunca revierte ni marca como fallida esa escritura.

## Why

La implementacion canonica vive en `runComposableHooks` (`composableHooks.ts`), que `useRowMutation` (`afterMutation`) ya delega. **Deuda documentada, no oculta**: las copias inline en `RecordDetail.vue` (`afterSave`) y `RecordList.vue` (`afterDelete`) siguen sin unificar con la implementacion canonica. La razon no es negligencia: el formateador del repo reescribe esos dos archivos completos en cualquier edicion (un cambio de 20 lineas ahi genero un diff de 4406 lineas), asi que unificarlas hoy es impracticable sin resolver antes el formateador. Cualquier hook NUEVO debe usar `runComposableHooks`; no agregar una cuarta copia inline.

## Where

- `layout/src/utils/composableHooks.ts` (implementacion canonica, `runComposableHooks`)
- `layout/src/composables/useRowMutation.ts` (delega para `afterMutation`, carga dinamica `await import('@utils/composableHooks')`)
- `layout/src/layouts/RecordDetail.vue` y `layout/src/layouts/RecordList/RecordList.vue` (copias inline de `afterSave`/`afterDelete`, sin unificar por la limitacion del formateador)

## When

Al agregar un hook de ciclo de vida nuevo, o al escribir un composable que reacciona a `afterSave`/`afterDelete`/`afterMutation`: asumir la firma `(apolloClient, recordId, record)` y que un error propio nunca revertira la escritura. No intentar unificar las copias inline de RecordDetail.vue/RecordList.vue sin resolver primero el problema del formateador.

## Source

- **Discovered in**: UPONE-1503 (commits `020e4944`, `3b7ce43d`, `343ac50f`)
