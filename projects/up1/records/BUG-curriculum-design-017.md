---
id: BUG-curriculum-design-017
project: up1
type: bug
module: curriculum-design
tags:
  - datalog
  - audit
  - batch
  - resolver
  - rbac
---

# Las mutations de batch de planEntry no generaban historial en core_DataLog

## Symptom

Las mutations atomicas de lote `createPlanEntriesBatch` y `deletePlanEntriesBatch` (modo modular de la malla, UPONE-1539) no dejaban ningun registro en `core_DataLog`. El tab "Historial" de una `planEntry` creada o borrada por el flujo guiado de lote quedaba sin las entradas correspondientes, mientras que el mismo objeto creado/borrado por el path de instancia unica si auditaba correctamente.

## Expected behavior

Las mutations de batch de `planEntry` deberian generar el mismo historial en `core_DataLog` que el path de instancia unica, sin perder la atomicidad del lote.

## Root cause

File: `logic/planEntry-batch.resolver.js:45` (import de `recordPlanEntryDataLogs`), `:148` (llamada post-commit); espejado en `logic/planEntry-delete-batch.resolver.js:47`, `:139`.
Cause: ambos resolvers escriben directo con `tx.planEntry.create`/`tx.planEntry.delete` dentro de `context.prisma.$transaction`, por atomicidad todo-o-nada del lote. Al no delegar en el `createInstance`/`deleteInstance` generico del core, tampoco pasan por su decorator `withDataLog`, que es el unico punto que audita la mutacion en `core_DataLog`. El resolver ganaba atomicidad de escritura pero perdia la auditoria sin que nada lo senalara: no hay error, la fila simplemente no queda registrada.

## Fix

Se agrego `logic/planEntryDataLog.js` con `recordPlanEntryDataLogs`, que invoca `recordMutationDataLog` del core POST-commit, por fila, respetando el contrato de firma exacto del core (`args.data` obligatorio en create, `args.id` en delete, ya que el `recordId`/`historyKey` se derivan de ahi y no de `previous`). La llamada es best-effort: un fallo en la auditoria no revierte ni bloquea la mutacion ya commiteada.

## Impact

| Area | Antes | Despues |
|---|---|---|
| Historial de planEntry creada/borrada por lote | Sin registro en `core_DataLog` (paridad rota vs. instancia unica) | Auditada por fila, post-commit, con el mismo `recordId`/`historyKey` que el path generico |
| Atomicidad del lote | Preservada (create/delete directo en `$transaction`) | Sin cambios: la auditoria es best-effort y no participa de la transaccion |

## Reproduction

### Steps
1. Ejecutar `createPlanEntriesBatch` o `deletePlanEntriesBatch` sobre un plan.
2. Abrir el tab "Historial" de una `planEntry` afectada por el lote.
3. Verificar que no aparece ninguna entrada, a diferencia de crear/borrar la misma `planEntry` por el path de instancia unica.

## Related

Instancia concreta del patron transversal "bypassear el CRUD generico pierde RBAC, eventos y DataLog": ver [[RULE-dev-restitute-rbac-on-nondelegating-resolver]], que ya cubre los tres decorators perdidos por estos mismos resolvers (RBAC, eventos y DataLog) y documenta por que se descubrieron y restituyeron en ciclos separados.
