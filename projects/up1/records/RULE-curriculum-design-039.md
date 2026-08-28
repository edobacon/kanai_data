---
id: RULE-curriculum-design-039
project: up1
type: rule
module: curriculum-design
tags:
  - delete
  - atomicidad
  - transaction
  - rollback
  - error-propagation
  - best-effort-catch
  - motor
---

# Un delete multi-paso en `$transaction` debe propagar errores para rollback; no usar `try/catch` best-effort

## What

En el motor de borrado (`executeDeletePlan`), los `deleteMany` por capa MUST correr dentro de `$transaction` y **propagar** cualquier FK violation / error hacia la transacción para activar el **rollback completo** (atomicidad, REQ-02). PROHIBIDO envolver los pasos destructivos en `try/catch` best-effort que ignore fallos: rompe la atomicidad y deja estado parcial. Excepción explícita: la escritura de auditoría (`writeDeleteDataLog`) sí es best-effort (no debe abortar el delete correcto), pero eso es una decisión acotada al logging, no al borrado.

## Why

En TICKET-104, `instance.resolver.js` usaba `try/catch` extensivo best-effort en su path de borrado (ignora fallos) — patrón peligroso para atomicidad. `executeDeletePlan` se diseñó deliberadamente SIN ese try/catch para que las violaciones propaguen y reviertan. Al cablear `deleteBulkInstances` al motor hay que revisar y eliminar ese patrón heredado.

## Where

`executeDeletePlan` (motor), `instance.resolver.js` (`deleteBulkInstances`/`deleteInstance`) al cablear el motor.

## When

Al implementar o revisar cualquier operación destructiva multi-paso: verificar que corre en `$transaction` y que los errores propagan (no se swallowean).
