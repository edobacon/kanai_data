---
id: RULE-layout-039
project: up1
type: rule
module: layout
tags:
  - layout
  - rbac
  - RecordDetail
  - RecordList
  - paridad
  - computedMode
  - isFieldViewable
---

# Todo layout que crea o edita gatea por RBAC igual que RecordList

## What

`RecordDetail` debe negar el modo `create`/`edit` cuando el usuario no tiene la capacidad efectiva, exactamente como `RecordList` ya hacía con `effectiveCanCreate`/`canEdit`. No basta con gatear tabs por `requiredCapability`: el modo del formulario y la visibilidad/editabilidad por campo tienen que reflejar las capacidades reales. Cualquier layout nuevo (o composable que envuelva `RecordDetail`) que agregue su propio flujo de creación/edición debe reusar este mismo gate, no inventar uno paralelo.

## Why

Antes de UPONE-1439, `RecordDetail` era menos restrictivo que `RecordList`: gateaba tabs por `requiredCapability` pero ignoraba las capacidades reales al decidir el modo (`create`/`edit`) y el estado por campo, permitiendo crear/editar sin permiso efectivo mientras `RecordList` sí lo bloqueaba. Es un gap de paridad RBAC entre los dos layouts principales, no solo un detalle de UX. Ver [[BUG-layout-007]] y [[BUG-layout-008]] para otros gaps de paridad RecordDetail vs RecordList detectados en el mismo período (timezone, enum).

## Where

- `layout/src/layouts/RecordDetail.vue:1672-1680` (`computedMode`): si `requested` es `create` o `edit` y `getEffectivePermission(objectName, 'create'|'modify', layoutConfig.canCreate|canEdit)` deniega, el modo cae a `view` (los overrides explícitos de `layoutConfig.canCreate`/`canEdit` siguen respetándose).
- `layout/src/composables/useRbacPermissions.ts:251` (`isFieldViewable`): espeja la jerarquía de `isFieldModifiable` (field-level → object-level → deny) pero para la acción `:view`.

## When

Al diseñar o revisar cualquier layout/composable que permita crear o editar un registro. Verificar que el modo efectivo pasa por `getEffectivePermission` (no solo por `requiredCapability` de tabs) y que la visibilidad de campos usa `isFieldViewable`/`isFieldModifiable` según corresponda.

## Source

- **Discovered in**: UPONE-1439
