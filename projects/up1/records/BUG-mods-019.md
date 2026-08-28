---
id: BUG-mods-019
project: up1
type: bug
module: mods
tags:
  - layout
  - casing
  - vocabulario
  - up1-manager
  - field-definition
---

# Mismatch de casing entre el vocabulario canónico del backend (`VALID_FIELD_TYPES`) y las conditions hardcodeadas en un layout

## Symptom

Las condiciones de visibilidad del campo `fieldType` en el layout de creación no se activaban para el tipo de campo "Formula": la condición comparaba contra el literal `"formula"` (minúscula) mientras el backend expone el valor canónico `"Formula"` (mayúscula inicial).

## Root cause

- **File**: `mods/up1-manager/config/layouts/fielddefinition-create.json` (verificado, condiciones de `fieldType`)
- **Cause**: UPONE-1386 migró el selector de `fieldType` para resolver sus opciones en runtime via `autoPopulate` + `useFieldTypeVocabulary` contra `VALID_FIELD_TYPES` del backend, pero las conditions del layout que comparan el valor seleccionado siguieron hardcodeadas con el casing anterior.

## Fix

Se alinearon las conditions al valor canónico `"Formula"` que expone el backend.

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | administradores creando/editando definiciones de campo tipo Formula |
| Data affected | ninguno (bug de UI, no persiste dato incorrecto) |
| Modules affected | up1-manager (editor de definiciones de campo) |
| Frequency | siempre que se seleccionaba fieldType "Formula" |

## Related

- **Rules**: [[RULE-mods-063]] (vocabularios de backend no se hardcodean en layouts)
- **Origen**: recon delta 2026-07-13..2026-08-03, UPONE-1497 (fix de seguimiento de UPONE-1386).
