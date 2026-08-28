---
id: BUG-layout-007
project: up1
type: bug
module: layout
tags:
  - layout
  - RecordDetail
  - timezone
  - DateTime
  - view-mode
  - paridad
---

# RecordDetail mostraba UTC crudo en campos DateTime en view-mode

## Symptom

En modo vista, `RecordDetail` mostraba campos de tipo `date-time` (ej. `createdAt`/`updatedAt`) en UTC crudo, sin conversión a timezone local. `RecordList` ya aplicaba timezone local en las mismas columnas, por lo que el mismo dato se veía distinto según el layout desde el que se consultaba.

## Root cause

- **File**: `layout/src/layouts/RecordDetail.vue` (verificado: fix aplicado, mismo mensaje de commit en dos commits - `069d30be` y `d87ce9b1` - indicio de reintento sobre el mismo flujo)
- **Cause**: paridad de formato de fecha incompleta entre `RecordList` y `RecordDetail`: el primero ya tenía la conversión a timezone local, el segundo no la heredaba en modo vista.

## Fix

Se aplica la misma conversión a timezone local que `RecordList` en el render de campos `date-time` de `RecordDetail` en modo vista (UPONE-1227).

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | cualquier usuario viendo un registro en modo vista con campos DateTime |
| Data affected | ninguna (solo presentación; el valor persistido no cambia) |
| Modules affected | layout (`RecordDetail`) |
| Frequency | siempre que se vea un campo `date-time` en modo vista |

## Related

- **Rules**: [[RULE-layout-039]] (mismo patrón de paridad RecordDetail vs RecordList, aplicado a RBAC)
- **Bugs**: [[BUG-layout-008]] (mismo patrón de paridad, aplicado a enum)
