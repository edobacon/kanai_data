---
id: RULE-core-034
project: up1
type: rule
module: core
tags:
  - testing
  - integration
  - mocked-prisma
  - destructive
  - delete
  - persistence
  - rt-ext
  - evidencia
  - runtime-bugs
---

# Código destructivo o de persistencia con proyecciones RT/ext requiere integration tests contra BD real; el prisma mockeado no es evidencia

## What

Todo código que **borra o persiste** sobre objetos con proyecciones `rt__`/`ext__`, enums, o FK con casing no trivial MUST tener cobertura de **integration contra una BD real** (fixtures propios), no solo unit tests con prisma mockeado. El mock acepta cualquier `where`/`select`/`data` y no valida enums, columnas ni casing de FK, así que unit tests verdes pueden convivir con un motor roto en producción. Un test que **afirma el comportamiento buggy** (ej. una assertion que espera el orden que viola una FK) es peor que no tener test.

## Why

En TICKET-104 (S5) **37 unit tests verdes con prisma mockeado convivían con 7 bugs de runtime** del motor de borrado, cazados solo por verificación DB-level + panel adversarial: (1) `action:'delete'` vs enum UPPERCASE; (2) `tenantId` columna inexistente en `core_DataLog`; (3) FK rt/ext camelCase vs real; (4) `select` de campos inexistentes en derivados; (5) `objectLower` raíz camelCase → huérfanos multi-palabra; (6) `depth` hardcodeado viola FK `CurricularLink`; (7) casing RT no-uniforme `rt__Service__Activity`. Ver [[feedback_mocked_tests_consecrate_runtime_bugs]] y [[feedback_verify_real_write_entry_path]].

## Where

Resolvers/motores de delete o persistencia sobre RT/ext (object-manager + logic de mods sincronizada, ej. `instance.resolver.js`, `deleteImpactPlan.js`, `executeDeletePlan`).

## When

Al escribir o revisar tests de código destructivo o de persistencia. En el quality gate: exigir evidencia de integration real, no aceptar unit mockeado como prueba de correctitud.
