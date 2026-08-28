---
id: BUG-curriculum-design-014
project: up1
type: bug
module: curriculum-design
tags:
  - observabilidad
  - datalog
  - executedeleteplan
  - logentries
  - best-effort
  - contador
  - auditoria
---

# `executeDeletePlan.logEntries` sobrecuenta cuando la auditoría DataLog falla

## Symptom

`executeDeletePlan.logEntries` cuenta las llamadas a `writeDeleteDataLog` que retornaron, NO las escrituras físicas confirmadas de `core_DataLog`. Como el `catch` best-effort vive DENTRO de `writeDeleteDataLog` (nunca lanza), el call site suma `logEntries` aunque `core_DataLog.create` haya fallado.

## Expected behavior

`logEntries` debería reflejar escrituras de auditoría **confirmadas**, o exponer un `logFailures` separado, para que la observabilidad no sea engañosa cuando la auditoría cae.

## Root cause

El contador se incrementa en el call site tras una función best-effort que traga sus propios errores. No es bug de atomicidad (el delete es correcto y no se revierte); es solo el contador de observabilidad el que miente.

## Impact

Bajo. Observabilidad/telemetría del borrado, no correctitud del delete. Candidato a fix acotado: contar solo escrituras confirmadas o exponer `logFailures`. Descubierto al agregar el test best-effort de DataLog (S5).
