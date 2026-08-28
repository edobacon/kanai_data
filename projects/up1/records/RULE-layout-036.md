---
id: RULE-layout-036
project: up1
type: rule
module: layout
tags:
  - layout
  - row-action
  - dispatcher
  - union
  - RecordList
  - ChibiList
  - typescript
---

# Contrato del dispatcher de row actions: dos definiciones del union y comportamiento de ChibiList

## What

El sistema de row actions del layout tiene dos puntos de contrato que deben mantenerse sincronizados y cuyo comportamiento difiere según el componente consumidor:

1. **Dos definiciones del union** (no una): `RowAction` en `layout/src/types/recordlist.ts:68` y `EnhancedRowAction` en `layout/src/composables/useRowActionHandler.ts:21-46`. Son estructuralmente distintas: `RowAction` es un union discriminado con `type?` literal en línea; `EnhancedRowAction` es un interface único con `type?` opcional. Agregar un tipo nuevo (ej. `'create'`, `'multiSelectPicker'`) requiere actualizar AMBAS — si se actualiza solo una, el typecheck no falla en los consumidores pero el runtime puede ignorar el tipo nuevo. El tipo `multiSelectPicker` ya existe (no estaba en la documentación original).

2. **RecordList.vue retorna closures, no ejecuta inline**: el dispatcher real (`RecordList.vue:~2600`) NO ejecuta la acción directamente — cada rama `if (action.type === '...')` RETORNA una acción enriquecida `{ ...action, handler, isVisible, isEnabled }` (closures). El `handler` se invoca después. Agregar un tipo nuevo = agregar una rama que construye el closure, no que llama directamente a la API.

3. **ChibiList NO auto-enriquece**: `ChibiList.vue:696-741` filtra por `action.isVisible` (función) y llama `action.handler` directo — asume que las acciones ya vienen enriquecidas desde afuera (el enriquecimiento vive en `RecordList.vue` o en el consumer). Si `ChibiList` recibe un row action declarativo crudo (ej. `{ type: 'create', ... }`), lo ignora o emite `request-action` sin ejecutar el handler.

## Why

Los tres contratos tienen consecuencias silenciosas: (1) no actualizar ambas definiciones del union da type-errors diferidos o comportamiento incorrecto en runtime sin alerta en CI; (2) confundir 'el dispatcher ejecuta' vs 'el dispatcher retorna' lleva a implementar el caso nuevo en el lugar incorrecto; (3) asumir que ChibiList ejecuta row actions declarativos igual que RecordList genera un botón visible que no hace nada (silently broken). Los tres fueron descubiertos en TICKET-042 (HU-7) durante el design-explore y el reviewer de cierre (el reviewer de S5 encontró que `EnhancedRowAction` le faltaban `mutation` y `multiSelectPicker`, que era un preexistente enmascarado).

## Where

- `layout/src/types/recordlist.ts` — `RowAction` union (línea 68+): definición 1
- `layout/src/composables/useRowActionHandler.ts` — `EnhancedRowAction` interface (línea 21-46): definición 2
- `layout/src/layouts/RecordList.vue` — dispatcher (cadena de `if` alrededor de ~L2600; NO es switch exhaustivo — agregar caso es aditivo sin tocar otros)
- `layout/src/layouts/ChibiList.vue` — segundo consumidor (L696-741; sin dispatcher por tipo)
- `layout/src/composables/useCreateRowAction.ts` — ejemplo del patrón de composable por tipo (HU-7)

## When

Al agregar un tipo nuevo de row action, al modificar las props de un tipo existente, o al usar row actions en un componente que no sea `RecordList.vue`. Antes de agregar el tipo: (a) actualizar `recordlist.ts`; (b) actualizar `useRowActionHandler.ts`; (c) agregar la rama aditiva en el dispatcher de `RecordList.vue` construyendo el closure; (d) verificar si el caso de uso incluye `ChibiList` — si es así, el enriquecimiento debe ocurrir antes de pasarle las acciones.

## Verification

1. Grep `type.*RowAction` en `recordlist.ts` y `useRowActionHandler.ts` — deben tener el mismo conjunto de literales de tipo. 2. Verificar que el dispatcher de `RecordList.vue` tiene una rama `if (action.type === '<nuevo>')` que retorna un objeto con `handler`, `isVisible`, `isEnabled`. 3. Si se usa en ChibiList: verificar que el enriquecimiento (construcción del closure) ocurre antes de llegar a ChibiList. 4. `npm run typecheck` del workspace layout — los 183 errores baseline no deben crecer en los archivos tocados.

## Source

- **Discovered in**: TICKET-042
