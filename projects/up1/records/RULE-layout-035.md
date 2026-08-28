---
id: RULE-layout-035
project: up1
type: rule
module: layout
tags:
  - layout
  - row-action
  - clone
  - create
  - recordtype-projection
  - embedded
  - unique
  - prefilledModal
---

# Clone row action en lista: createObjectName, redirectTo y cloneStrategy según unicidad

## What

Un row action de tipo `create` (clone/versión) en una lista requiere tres decisiones de configuración que van juntas: (a) si la lista renderiza un RecordType projection (ej. `rt__Modality__curricularsection`), el row action DEBE declarar `createObjectName` apuntando al objeto base (ej. `CurricularSection`) porque los RT projections usan `curricularsectionId` como PK y `createInstance` hace `findUnique({where:{id}})` sobre el objeto base — sin este campo explota con `INTERNAL_SERVER_ERROR`; (b) en listas EMBEBIDAS (field `record-list` dentro de un RecordDetail) usar `redirectTo: 'none'` para hacer un clean create (refetch + toast, el nuevo registro aparece como fila) — el redirect por defecto (`edit`) abre un modal de detalle confuso dentro del embebido; (c) si el objeto tiene campos unique, usar `cloneStrategy: 'prefilledModal'` + `uniqueFields: [...]` (el registro se crea SOLO al Guardar, el modal abre pre-llenado con todo excepto los campos unique) — el clone inmediato (`prefillFromCurrent: true` sin cloneStrategy) solo aplica a objetos sin unique.

Ejemplo de row action correcto para Modalidad (RT projection + embebido + unique):
```json
{
  "type": "create",
  "createObjectName": "CurricularSection",
  "cloneStrategy": "prefilledModal",
  "uniqueFields": ["name", "code"],
  "redirectTo": "none",
  "label": "{{$t('duplicate')}}",
  "icon": "bi-copy"
}
```

Ejemplo de row action correcto para BibliographyReference (standalone + sin unique):
```json
{
  "type": "create",
  "prefillFromCurrent": true,
  "redirectTo": "view",
  "label": "{{$t('duplicate')}}",
  "icon": "bi-copy"
}
```

## Why

Los tres gotchas producen bugs distintos y silenciosos en producción: (a) sin `createObjectName` en RT → `INTERNAL_SERVER_ERROR` al intentar clonar (el resolver falla en `findUnique` porque la PK del RT no es `id`); (b) sin `redirectTo:none` en embebido → el clon se crea correctamente pero el modal de detalle que se abre confunde al usuario haciéndolo pensar que va a crear otro registro; (c) sin `prefilledModal` en objeto con unique → el clone inmediato crea un registro corrupto/colisionante antes de que el usuario pueda corregir los campos únicos. Los tres se detectaron en E2E del TICKET-044 S3 (Playwright) — ninguno era visible en unit tests ni en sync.

## Where

Layouts JSON de mods con row actions de tipo `create` (clone o versión), específicamente:
- `mods/curriculum-design/config/layouts/default_Activity_view.json` y `default_Activity_edit.json` (Modalidad + CustomSection clone — embebido)
- `mods/curriculum-design/config/layouts/default_BibliographyReference_list.json` (BibliographyReference clone — standalone)
- `mods/curriculum-design/config/layouts/default_AcademicProgram_list.json` (AcademicProgram clone — standalone + unique)
- `layout/src/layouts/RecordList.vue` — dispatcher (cadena de if; rama `create` en ~L2600+); `RecordDetail.vue` (RecordList embebido vía LayoutOrchestrator)
- `layout/src/composables/useCreateRowAction.ts` — composable del handler
- `layout/src/types/recordlist.ts` — tipos `CreateRowAction` (incluye `createObjectName?`, `cloneStrategy?`, `uniqueFields?`, `redirectTo?`)

## When

Al agregar o modificar un row action `type: 'create'` en cualquier layout de un mod. Antes de declarar el config, evaluar:
1. ¿La lista renderiza un RecordType projection? → declarar `createObjectName` con el nombre del objeto base.
2. ¿La lista está embebida en un RecordDetail (field `type: 'record-list'`)? → usar `redirectTo: 'none'`.
3. ¿El objeto tiene campos con `unique: true` o `uniqueScopedBy`? → usar `cloneStrategy: 'prefilledModal'` + listar los campos únicos en `uniqueFields`.
Si ninguna condición aplica, el clone inmediato con `prefillFromCurrent: true` es suficiente.

## Verification

1. En el layout JSON: si `objectType` corresponde a un RecordType (nombre con prefijo `rt__`), verificar que `createObjectName` está declarado y apunta al objeto base. 2. Si el layout es un field `type: 'record-list'` dentro de un RecordDetail (embebido), verificar que `redirectTo` es `'none'`. 3. Si el objeto tiene `unique: true` en algún campo (verificar en `objects/<Obj>.json` y `RecordTypes/rt__*.json`), verificar que el row action declara `cloneStrategy: 'prefilledModal'` y `uniqueFields` lista esos campos. 4. Smoke E2E: intentar clonar con un valor de campo único duplicado — debe rechazarse sin crear registro a medias.

## Source

- **Discovered in**: TICKET-044, TICKET-062
