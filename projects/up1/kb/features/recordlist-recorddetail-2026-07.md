---
id: SPEC-features-007
project: up1
type: spec
module: features
category: features
tags: [up1, recordlist, recorddetail, reload, multivalue, N:M, create-route, hasIntegratedControls, layout]
fecha: 2026-07-16
sources:
  - layout/src/layouts/RecordDetail.vue (PR #296, PR #295)
  - layout/src/composables/useDetailContextReload.ts
  - layout/docs/features/recorddetail.md
  - layout/src/layouts/RecordList.vue (PR #278, PR #295)
  - layout/src/utils/recordListFormatters.ts
  - layout/src/composables/useColumnConfiguration.ts
  - object-manager/docs/design/recordlist-multivalue-columns.md
  - mods/academic-scheduling/specs/recordlist-columnas-multivalor.md
  - suite/pages/[tenant_id]/[object_name]/[instance_id]/[view_type]/[layout_id]/index.vue
ticket: UPONE-1334/1377 (y AP-07/UPONE-1299)
---

# RecordList / RecordDetail: tres mejoras de layout (julio 2026)

> Agrupa tres mejoras recientes e independientes de `RecordDetail` y `RecordList`: boton de recarga con distincion user data vs context (AP-07 / UPONE-1299, PR #296), columnas multivalor N:M en listas (UPONE-1334, PR #278), y creacion por ruta con sentinel "new" mas `hasIntegratedControls` (UPONE-1377, PR #295).

## TLDR

Tres features separadas, mismo periodo (julio 2026), mismo par de layouts (`RecordDetail`/`RecordList`):

1. **Reload**: boton en `RecordDetail` que refresca datos sin pisar lo que el usuario esta escribiendo en modo edit/create.
2. **Columnas multivalor**: `RecordList` puede declarar una columna sintetica que agrega una relacion N:M (ej. lista de profesores de una seccion) sin que sea un campo real del objeto.
3. **Create por ruta**: `RecordList` puede abrir el formulario de creacion navegando a una ruta (`instance_id=new`) en vez de un modal, para layouts anchos que necesitan pantalla completa.

Cada una se activa por su propia clave en `layoutConfig`, son ortogonales entre si.

## A. Boton Reload en RecordDetail (AP-07 / UPONE-1299)

### Que hace

Agrega un boton de recarga en el header de `RecordDetail` que distingue dos tipos de datos:

- **User data**: lo que el usuario escribio en los inputs del Vueform (no se pierde al recargar en modo edit/create).
- **Context**: opciones de selects FK/references y campos formula (si se refrescan, aunque el usuario este editando).

En modo `view` hace un refetch completo (`fullReload`). En modo `edit`/`create` reemplaza solo las opciones de los selects FK/references, sin resetear los valores que el usuario ya tipeo.

### Como se activa

Opt-out explicito, el boton aparece por default:

```json
{
  "layoutConfig": {
    "showReloadButton": false
  }
}
```

El boton no se muestra si el layout esta dentro de un modal stack (`isInModalStack`), independientemente del valor de `showReloadButton`.

### Evidencia de codigo

- `layout/src/layouts/RecordDetail.vue:46-59`: boton condicional a `showReloadButton && !isInModalStack`.
- `layout/src/layouts/RecordDetail.vue:5253-5259`: default de `showReloadButton` es `true`.
- `layout/src/composables/useDetailContextReload.ts:1-20`: logica de distincion user data vs context y las dos estrategias de reload (full vs solo-context).
- Doc interno espejo: `layout/docs/features/recorddetail.md` (documenta `layoutConfig.showReloadButton`).

## B. Columnas multivalor N:M en RecordList (UPONE-1334)

### Que hace

Permite declarar en `RecordList` una columna sintetica que muestra el resultado de una relacion N:M (por ejemplo, los profesores asignados a una seccion), sin que exista como campo del objeto. La columna es siempre de solo lectura.

El render soporta dos modos: `list` (muestra los primeros items mas un indicador `+N`) o `count` (solo el numero total).

### Como se activa

Contrato via `layoutConfig.columns[].source`:

```json
{
  "layoutConfig": {
    "columns": [
      {
        "field": "instructorsSummary",
        "label": "Profesores",
        "source": {
          "relation": "instructors",
          "displayField": "fullName",
          "mode": "list"
        }
      }
    ]
  }
}
```

El contrato completo de `source` (formas soportadas, formato de datos esperado `{items, total}`, y el limite `FETCH_CAP`) esta documentado en `object-manager/docs/design/recordlist-multivalue-columns.md`. Este doc de KB no lo reexplica: apunta ahi para el diseno de backend.

El spec funcional de origen (caso de uso que motivo la feature) esta en `mods/academic-scheduling/specs/recordlist-columnas-multivalor.md`.

### Evidencia de codigo

- Render puro: `layout/src/utils/recordListFormatters.ts:420-442` (`renderMultivalueValue(raw, source)`: decide entre `list` con `+N` o `count`).
- `layout/src/layouts/RecordList.vue:1277,4239-4240,5475-5478,5525-5529`: `columnSourceConfigs` (computed que lee `source` de cada columna), `isFieldEditable` (fuerza solo-lectura si la columna tiene `source`), `getDisplayValue` (delega a `renderMultivalueValue`).
- `layout/src/composables/useColumnConfiguration.ts`: `sourceColumnFields`/`effectiveFields`, para que el selector de columnas (personalizacion de vista) reconozca las columnas sinteticas `source` sin tratarlas como campo real del objeto.

## C. Create por ruta (openMode) + sentinel "new" + hasIntegratedControls (UPONE-1377)

### Que hace

Dos mejoras relacionadas para el flujo de creacion desde `RecordList`:

1. **openMode.create=route**: en vez de abrir el formulario de creacion en un modal, `RecordList` navega a una ruta con `instance_id=new`. Pensado para layouts anchos (ej. un preview de Flexmonster) donde el modal quedaba muy angosto.
2. **hasIntegratedControls**: opt-in para layouts cuyo elemento custom ya trae sus propios botones de guardar/cancelar (ej. un wizard), evitando que `RecordDetail` duplique los botones en su footer externo.

### Como se activa

`openMode` en `RecordList`:

```json
{
  "layoutConfig": {
    "openMode": {
      "create": "route"
    },
    "canCreateLayoutId": "default_AcademicActivity_create"
  }
}
```

Si `getOpenMode('create')` resuelve a `'route'` y hay `canCreateLayoutId` configurado, el click en "Crear" emite `request-action navigate-to-relation` con `targetId: 'new'` en vez de abrir el modal.

`hasIntegratedControls` en `RecordDetail` (opt-in explicito, default `false`):

```json
{
  "layoutConfig": {
    "hasIntegratedControls": true
  }
}
```

### Evidencia de codigo

- `layout/src/layouts/RecordList.vue:4410`: `getOpenMode` ampliado de `'view' | 'edit'` a `'view' | 'edit' | 'create'`.
- `layout/src/layouts/RecordList.vue:5623-5641`: `handleCreateRequest`, la logica que decide entre modal y navegacion por ruta cuando `openMode.create === 'route'`.
- `suite/pages/[tenant_id]/[object_name]/[instance_id]/[view_type]/[layout_id]/index.vue:81-86`: el sentinel `instance_id === 'new'` se trata como "sin instancia" (`instanceId = ''`) para que `RecordDetail` entre en modo create sin intentar un fetch con `id="new"`. Documentado inline en un comentario del propio archivo.
- `layout/src/layouts/RecordDetail.vue:5180-5188`: `hasIntegratedControls` computed. Sin este flag, el footer externo duplicaba los botones guardar/cancelar del wizard de `report-form-manager`.

## Relacion con otros docs

| Doc | Relacion |
|-----|----------|
| [object-manager/docs/design/recordlist-multivalue-columns.md](../../../up1/object-manager/docs/design/recordlist-multivalue-columns.md) | Diseno tecnico completo de la feature B (contrato `source`, formato de datos, `FETCH_CAP`). Este doc no lo duplica |
| [mods/academic-scheduling/specs/recordlist-columnas-multivalor.md](../../../up1/mods/academic-scheduling/specs/recordlist-columnas-multivalor.md) | Spec funcional de origen de la feature B |
| [layout/docs/features/recorddetail.md](../../../up1/layout/docs/features/recorddetail.md) | Doc oficial del repo layout, cubre `showReloadButton` (feature A) |
| [recorddetail-grouped-tabs.md](./recorddetail-grouped-tabs.md) | Otra feature de `RecordDetail` (tabs con multiples bloques), mismo estilo de doc |
