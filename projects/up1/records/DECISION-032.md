---
id: DECISION-032
project: up1
type: decision
module: mods
tags:
  - curriculum-design
  - planentry
  - transacciones
  - rbac
  - datalog
---

# El batch atomico de `planEntry` escribe directo via `tx` y restituye RBAC, eventos y DataLog a mano

## Contexto

El modo modular de la malla curricular necesita alta/baja en lote de varias `planEntry` con garantia todo-o-nada: si el usuario acepta agregar una asignatura junto con sus prerrequisitos faltantes, o si borra un tramo del plan, el conjunto debe persistir completo o no persistir nada (sin estado parcial en la malla).

## Decision

`createPlanEntriesBatch`/`deletePlanEntriesBatch` (`mods/curriculum-design/logic/planEntry-batch.resolver.js`, `logic/planEntry-delete-batch.resolver.js`) usan `tx.planEntry.create`/`delete` DIRECTO dentro de `context.prisma.$transaction`, en vez de delegar en el `createInstance`/`deleteInstance` generico del core. La razon documentada en el propio codigo (`planEntry-batch.resolver.js:9-38`): el CRUD generico viene envuelto en el decorator de eventos, que publica al canal Redis `core` de forma incondicional apenas cada create retorna, es decir ANTES de que la transaccion envolvente commitee. Si una entrada posterior del lote falla, Prisma revierte las filas en BD, pero los eventos "create" de las entradas previas ya se publicaron sin compensacion posible: la garantia todo-o-nada se rompe para los side-effects aunque la BD quede consistente.

Al no pasar por el decorator generico, el batch pierde automaticamente tres cosas que ese decorator daba gratis, y las restituye a mano:
- **RBAC**: `checkObjectPermissions(context, 'planEntry', 'create'|'delete')` se llama explicitamente ANTES de abrir la transaccion (`planEntry-batch.resolver.js:141-142`).
- **Eventos de dominio**: se emiten POST-commit, por fila, via `publishPlanEntryEvents` (`planEntryEvent.js`), con paridad de payload al path de instancia unica. Best-effort: un fallo al publicar no revierte la mutacion.
- **DataLog**: se audita cada fila POST-commit via `recordPlanEntryDataLogs` (`planEntryDataLog.js`), agregado como follow-up cuando se detecto que las filas del batch no llegaban a `core_DataLog` (`planEntry-batch.resolver.js:44-45,144-148`).

## Alternativas descartadas

- **N llamadas al CRUD generico del core (uno por `planEntry`)**: conserva RBAC, eventos y DataLog gratis via el decorator, pero pierde la atomicidad: no hay forma de revertir las llamadas ya exitosas si una entrada del medio del lote falla, dejando la malla en un estado parcial que el modo modular no puede tolerar.

## Impacto y reversibilidad

El patron es reusable: cualquier mod que necesite mutations de lote atomicas via `tx` directo debe seguir el mismo checklist (restituir RBAC + eventos + DataLog), documentado tambien como regla en `[[RULE-dev-restitute-rbac-on-nondelegating-resolver]]`. Afecta solo a `planEntry` batch; el path de instancia unica sigue usando el CRUD generico sin cambios. Reversible: volver a N llamadas individuales es directo, pero reintroduce el riesgo de estado parcial que motivo el cambio.
