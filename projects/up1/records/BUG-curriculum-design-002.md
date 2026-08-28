---
id: BUG-curriculum-design-002
project: up1
type: bug
module: curriculum-design
tags:
  - versionado
  - activity
  - code
  - unicidad
  - cross-mod
  - uengagement
  - academic-scheduling
  - curriculum-design
---

# Versionar un Course (Activity) falla por el UNIQUE plano de code (conflicto cross-mod con uengagement)

## Symptom

Versionar un Course (Activity, recordType=Course) en estado Publicado falla con el friendly-error: "Ya existe un registro con ese valor. Usa un valor diferente." La nueva versión no se crea.

## Expected behavior

La nueva versión (vN+1) se crea conservando el mismo `code` del linaje (misma identidad de código, distinta versión).

## Root cause

La tabla COMPARTIDA `Activity` tiene un UNIQUE plano sobre `code` (índice `Activity_code_key`), declarado por uengagement-up1 (`code.unique: true` en su Activity.json) y propagado por el codegen al Base (business/Base/activity.json) y al schema Prisma. El versionado mantiene el mismo `code` entre versiones del mismo linaje (por contrato), así que la vN+1 viola ese índice. El UNIQUE plano COEXISTE y se CONTRADICE con `@@unique([previousVersionId, version])` (de curriculum-design, que sí habilita el versionado). NO es bug de la lógica de versionado: version-from-source.js no toca `code`.

**Co-definidores de `Activity` (3 mods, verificado 2026-06-24):** (1) **curriculum-design** aporta el objeto base con el versioning + `uniqueConstraints([previousVersionId,version])` y `code` sin unique; (2) **uengagement-up1** aporta el base con `code.unique:true` + el RecordType `rt__Service__Activity`; (3) **academic-scheduling** aporta el RecordType `rt__Course__activity` (tabla 1:1 del Course para FK). Matiz: el RecordType **Course lo posee academic-scheduling, no curriculum-design**. Los RecordTypes NO declaran `code` ni `unique` → el conflicto es 100% a nivel del objeto base (uengagement `code.unique` vs curriculum-design versioning).

## Impact

Bloquea el versionado de Courses (programas de asignatura) de curriculum-design. Es un conflicto de contrato cross-mod: uengagement necesita `code` único para sus Services (todos raíz); curriculum-design necesita que las versiones de un Course compartan `code`. Owners del fix: uengagement-up1 (posee `code.unique`) + core (codegen + migración).

## Reproduction

1) Transicionar un Course a "Publicado" (WorkflowStatus.allowsVersioning=true). 2) Ejecutar "Nueva versión" (createInstance asNewVersion, objectType=Activity). 3) El gate de workflow pasa; el insert de la vN+1 con el mismo `code` viola `Activity_code_key`. NOTA: en estado Borrador el versionado se rechaza ANTES con SOURCE_NOT_VERSIONABLE (gate de workflow), sin llegar al error de unicidad. Verificado vigente 2026-06-24 en UPU: `Activity_code_key` y `Activity_previousVersionId_version_key` coexisten; uengagement `code.unique:true` sigue presente; todas las Activity son version=1/raíz (cero impacto al cambiar la regla).

## Workaround

Ninguno funcional desde curriculum-design (no posee el `code.unique`). Fix recomendado (con precedente YA implementado para Curriculum en lineageUniqueness.js): unicidad por RAÍZ de linaje — `code` único solo entre raíces (previousVersionId IS NULL) vía validación de dominio (opción 1) y/o índice parcial DB (opción 2). Requiere: quitar `code.unique` de uengagement + regenerar codegen + dropear `Activity_code_key`. uniqueScopedBy NO sirve (no soporta condición parcial 'solo raíz').

## Solution

Pendiente.

## Related

- **Specs**: specs/up1/activity-code-uniqueness-versioning-conflict.md
- **Tickets**: —
