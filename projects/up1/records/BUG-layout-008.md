---
id: BUG-layout-008
project: up1
type: bug
module: layout
tags:
  - layout
  - RecordDetail
  - enum
  - view-mode
  - round-trip
---

# RecordDetail perdía el valor enum crudo en view-mode, rompía round-trip al reeditar

## Symptom

En modo vista, `RecordDetail` construía el form data de un campo enum solo con la label traducida, descartando el valor crudo original. Al pasar de vista a edición sobre ese mismo registro, el form quedaba con el texto traducido en vez del valor real esperado por el backend.

## Root cause

- **File**: `layout/src/layouts/RecordDetail.vue` (~64 líneas modificadas, UPONE-1515, 2026-07-31)
- **Cause**: un fix previo (commit `fef065bd`, 2026-07-24) resolvió que la label no se mostraba traducida en vista, pero no preservó el valor crudo en paralelo. El contrato "raw value + translated label" no estaba documentado, por lo que el primer fix cubrió solo la mitad del flujo.

## Fix

Se preserva el valor enum crudo en el form data de vista, además de la label traducida usada para mostrar (UPONE-1515). Ver [[RULE-layout-040]] para el contrato documentado.

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | cualquier usuario que vea un registro con campo enum y luego lo edite |
| Data affected | riesgo de guardar un valor incorrecto (la label traducida) en vez del valor enum real, si el usuario reeditaba sin tocar el campo |
| Modules affected | layout (`RecordDetail`) |
| Frequency | todo campo enum visto y luego reeditado sin cambiar su valor |

## Related

- **Rules**: [[RULE-layout-040]]
- **Bugs**: [[BUG-layout-007]] (mismo patrón de paridad view-mode, aplicado a timezone)
