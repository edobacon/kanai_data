---
id: BUG-object-manager-011
project: up1
type: bug
module: object-manager
tags:
  - datalog
  - audit
  - core-objects
  - delete
  - restrict
  - id-coercion
---

# La auditoria DataLog estaba deshabilitada de facto sobre objetos core, y al activarla aparecieron tres defectos de escritura

## Symptom

`resolveObjectFile` nunca miraba `objects/core/`, asi que cualquier objeto `core_*` caia con `enableDataLog=false` por defecto: la auditoria de cambios sobre esos objetos no se generaba, sin error visible. Al corregir esa deteccion y activar la auditoria sobre objetos core aparecieron tres defectos adicionales de escritura que antes quedaban invisibles por falta de auditoria.

## Expected behavior

Toda mutacion sobre un objeto core deberia dejar su entrada en `core_DataLog`, incluida la de borrado masivo, con el id coercionado al tipo real de la PK del modelo. Un delete bloqueado por RESTRICT no deberia registrarse como exitoso.

## Root cause

File: `object-manager/src/events/decorators/withDataLog.js:176` (`hasIntegerId`), `object-manager/src/utils/sourceContract.js`, `object-manager/src/graphql/resolvers/instance.resolver.js:5973` (`deleteBulkInstances`).

Cause, cuatro partes:
1. `resolveObjectFile`/`resolveSourcePath` no resolvia objetos bajo `objects/core/` (ademas de un bug de capitalizacion, `core_Role` se buscaba como `Core_Role`).
2. El pre-fetch de UPDATE mandaba un id string a modelos con PK entera; el catch lo tragaba silenciosamente y el diff de auditoria reportaba `old: null` en todos los campos. `hasIntegerId()` originalmente leia `metadata.idType` del JSON del objeto, un campo que el codegen nunca consulta al emitir modelos core (siempre escribe `id Int @id @default(autoincrement())`); el fix lee el schema Prisma generado en runtime en su lugar.
3. `deleteBulkInstances` no pasaba por el wrapper de auditoria (`withDataLog('bulkDelete', ...)`, ver linea 5973 y comentario de contexto en `:5966-5972`).
4. Un delete bloqueado por RESTRICT se auditaba como exitoso: el resolver devolvia 200 con `errors[]` pero el registro de DataLog no reflejaba el bloqueo.

## Fix

`resolveObjectFile`/`resolveSourcePath` ahora resuelven `objects/core/` y corrigen la capitalizacion de `core_Role`. `hasIntegerId()` lee el schema Prisma generado (via `readTenantSchema`) en vez de `metadata.idType` o el prefijo `core_` (ver [[RULE-core-049]]). `deleteBulkInstances` quedo envuelto con `withDataLog('bulkDelete', ...)`. El wrapper de auditoria ahora cruza contra `result.deletedIds` para no registrar como exitoso un delete bloqueado por RESTRICT.

## Impact

| Area | Antes | Despues |
|---|---|---|
| Auditoria sobre `core_*` | deshabilitada de facto (`enableDataLog=false`) | activa, resuelve `objects/core/` correctamente |
| UPDATE sobre PK entera | diff auditado como `old: null` en todos los campos | diff correcto, id coercionado al tipo real de la PK |
| `deleteBulkInstances` | sin paso por auditoria | auditado via `withDataLog('bulkDelete', ...)` |
| Delete bloqueado por RESTRICT | se auditaba como exitoso | el registro de DataLog refleja el bloqueo real |

## Reproduction

### Steps
1. Activar la auditoria sobre un objeto `core_*` (ej. `core_Role`) y ejecutar un UPDATE sobre una instancia con PK entera.
2. Revisar el diff generado en `core_DataLog`: reportaba `old: null` en todos los campos.
3. Ejecutar `deleteBulkInstances` sobre instancias core: no quedaba ningun registro en `core_DataLog`.
4. Forzar un delete bloqueado por RESTRICT: el registro de auditoria lo marcaba como exitoso pese al bloqueo.
