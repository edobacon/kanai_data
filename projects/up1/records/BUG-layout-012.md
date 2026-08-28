---
id: BUG-layout-012
project: up1
type: bug
module: layout
tags:
  - layout
  - RecordDetail
  - submit
  - Prisma
  - NON_FORM_ELEMENT_TYPES
---

# El submit de RecordDetail enviaba campos que no son de datos y Prisma los rechazaba

## Symptom

Al crear o editar un registro con listas embebidas en su schema (ej. `resourceTypesList` de `Resource`), el submit a `createInstance`/`updateInstance` fallaba: Prisma rechazaba el payload por un argumento desconocido.

## Expected behavior

El submit de RecordDetail no deberia enviar campos que no son datos reales del objeto (listas embebidas, elementos de solo UI). Solo los campos con `baseField`/`customField` correspondiente deberian viajar en el payload.

## Root cause

File: `layout/src/layouts/RecordDetail/RecordDetail.vue` (commit `42634e89`)
Cause: el submit tenia un fallback "por compatibilidad hacia atras" que enviaba cualquier campo de formulario sin `baseField`/`customField` correspondiente. Ese fallback incluia campos de listas embebidas y otros elementos de solo-UI, que no son campos de datos reales del objeto y que Prisma rechaza como argumento desconocido.

## Fix

Se excluyen del payload de submit los campos cuyo tipo de schema esta en `NON_FORM_ELEMENT_TYPES`, siguiendo el mismo criterio que ya se aplicaba a los campos con `submit: false`.

## Impact

| Area | Antes | Despues |
|---|---|---|
| Registro con lista embebida en su schema | Submit fallaba, Prisma rechazaba el campo de UI-only | Campos de `NON_FORM_ELEMENT_TYPES` se excluyen antes de enviar |
| Fallback "backward compatibility" del submit | No distinguia campos de UI-only de campos reales de datos | Ahora respeta la misma exclusion que `submit: false` |

## Reproduction

### Steps
1. Abrir el RecordDetail de un objeto con una lista embebida en su schema (ej. `Resource.resourceTypesList`).
2. Completar el formulario y enviar el submit.
3. Verificar que `createInstance`/`updateInstance` falla porque Prisma rechaza el campo de la lista embebida como argumento desconocido.

## Related

- **Rules**: ninguna registrada
