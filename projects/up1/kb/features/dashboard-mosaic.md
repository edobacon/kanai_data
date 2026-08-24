---
id: SPEC-features-009
project: up1
type: spec
module: features
category: features
tags: [up1, layout-engine, dashboard, mosaic, widgets, record-list, report-builder, flexmonster, ui-pattern, UPONE-1091, UPONE-1226]
sources:
  - layout/src/layouts/Dashboard.vue (commits 7c94a83, 8193bf1)
  - layout/src/layouts/dashboard/mosaicHelpers.ts
  - layout/src/layouts/dashboard/mosaicHelpers.spec.ts
  - layout/src/types/dashboard.ts
  - layout/src/layouts/widgets/widgetRegistry.ts
  - layout/src/layouts/widgets/RecordListWidget.vue
  - layout/src/layouts/widgets/ReportWidget.vue
  - layout/src/layouts/LayoutOrchestrator.vue
  - layout/docs/reference/dashboard-mosaic.md
  - layout/docs/features/dashboard.md
  - mods/hello-world-mod/config/layouts/hw-dashboard-reference.json (commit bba7e01)
  - mods/hello-world-mod/config/layouts/hw-dashboard-mosaic-large.json (commit 4c84eeb)
  - mods/academic-scheduling/config/layouts/dashboard-test.json
fecha: 2026-07-16
ticket: UPONE-1091, UPONE-1226
---

# Dashboard Layout: mosaic y widgets embebidos

> Layout type `Dashboard`: contenedor de grilla que compone widgets (reportes Flexmonster, listas embebidas) segun un layout JSON. Desde UPONE-1226 (RPT-UPG-04), la posicion de cada widget se declara con una sintaxis de mosaico (estilo `matplotlib.subplot_mosaic`) en vez de coordenadas `(x, y, w, h)` por widget. Merge en `layout/develop` (Vignesh Somayaji, 2026-06-16).

## TLDR

`Dashboard` es un layout type mas (junto a `RecordList`, `RecordDetail`, `ChibiList`, etc.), resuelto por `LayoutOrchestrator` igual que los demas. Su `layoutConfig` declara una lista de `widgets[]` y como se posicionan en la grilla.

Dos formas de posicionar, ambas soportadas en el mismo config:

- **`gridPosition` por widget** (legado, UPONE-1088 / DASH-03): cada widget trae `{ x, y, w, h }` en unidades de columna/fila.
- **`mosaic`** (preferido desde UPONE-1226 / RPT-UPG-04): un array 2D de `widgetId` donde la posicion se infiere de donde aparece el id.

Si el config trae ambos, `mosaic` gana (`layout/src/layouts/Dashboard.vue:154`, `:328`).

Los widgets soportados hoy son `report` (Flexmonster, via `ReportWidget.vue`) y `recordlist` (una lista embebida, via `RecordListWidget.vue`), ambos registrados en `layout/src/layouts/widgets/widgetRegistry.ts:24-33`.

## Que es

`Dashboard.vue` (`layout/src/layouts/Dashboard.vue`) es un contenedor CSS Grid generico "renderer-agnostic": no asume que tipo de contenido va en cada celda, solo resuelve un `widgetType` contra un registry y monta el componente correspondiente (`layout/src/layouts/Dashboard.vue:37-55`). El layout type se registra en `LayoutOrchestrator` como cualquier otro:

```ts
// layout/src/layouts/LayoutOrchestrator.vue:801-815
const layoutComponent = computed(() => {
  const availableLayouts = {
    RecordList: defineAsyncComponent(() => import('./RecordList.vue')),
    RecordDetail: defineAsyncComponent(() => import('./RecordDetail.vue')),
    ChibiList: defineAsyncComponent(() => import('./ChibiList.vue')),
    // ...
    Dashboard: defineAsyncComponent(() => import('./Dashboard.vue')),
  };
  const effectiveType = fetchedLayoutType.value || props.layoutType;
  return availableLayouts[effectiveType as keyof typeof availableLayouts] || null;
});
```

Cada celda del grid es un `<div class="dashboard-layout__cell">` con `data-widget-id` / `data-widget-type`, que monta el componente resuelto pasandole `config`, `mode`, `filterMode`, `frozen`, `apolloClient`, `parentContext`, etc. (`layout/src/layouts/Dashboard.vue:29-55`). Un widget cuyo `widgetType` no esta en el registry cae en `FallbackWidget` en vez de romper el dashboard entero (`layout/src/layouts/widgets/widgetRegistry.ts:41-43`).

`Dashboard` tambien soporta una barra de filtros fija (`filterControls[]` o `filterBar: 'auto'`, UPONE-1167 / DASH-09) que escribe parametros de URL; los widgets `shared` reaccionan a esos parametros segun los `environmentFilters` declarados en su reporte, y los `self-contained` o `frozen` los ignoran (UPONE-1171 / DASH-13). Ese mecanismo de filtros queda fuera del alcance de este doc (ver `layout/docs/features/dashboard.md`); aqui el foco es la posicion de widgets (mosaic) y los dos tipos de widget disponibles.

## Contrato de configuracion

El `layoutConfig` de un layout `Dashboard` vive en `up1_layen_layout.layoutConfig` (jsonb), tipado en `layout/src/types/dashboard.ts:356-444` (`DashboardLayoutConfig`):

```jsonc
{
  "layoutType": "Dashboard",
  "layoutConfig": {
    "grid": { "gap": 12 },
    "mosaic": [
      ["big", "big", "kpi1"],
      ["big", "big", "kpi2"]
    ],
    "rowSizes": ["250px", "150px"],
    "columnSizes": ["2fr", "1fr", "1fr"],
    "widgets": [
      { "widgetId": "big",  "widgetType": "report",     "title": "...", "config": { "reportCode": "RPT-OVERVIEW" } },
      { "widgetId": "kpi1", "widgetType": "report",      "title": "...", "config": { "reportCode": "RPT-RETENTION", "defaultView": "kpi" } },
      { "widgetId": "kpi2", "widgetType": "recordlist",  "title": "...", "config": { "layoutName": "default_Foo_list", "objectName": "Foo" } }
    ]
  }
}
```

### `layoutConfig.mosaic` (`string[][]`, opcional)

Array 2D: cada fila externa es una fila visual; cada celda interna es el `widgetId` que ocupa esa celda. Un mismo id repetido en celdas adyacentes hace que el widget expanda ("span") esas celdas. `.` marca una celda vacia (`layout/src/types/dashboard.ts:413-428`).

Reglas (validadas por `validateMosaicRectangles`, `layout/src/layouts/dashboard/mosaicHelpers.ts:42-78`):

| Regla | Comportamiento |
|---|---|
| Cada `widgetId` debe formar una region rectangular | Se valida al compute time (`Dashboard.vue:160-164`). Un L-shape lanza `Error` con el id, la cuenta de celdas y el area esperada del bounding box. Falla ruidosa a proposito: CSS Grid descartaria las celdas mal puestas en silencio. |
| `.` marca celda vacia | No renderiza widget ahi; el slot queda abierto. |
| Id del mosaic sin entrada en `widgets[]` | Renderiza un tile de error (`Widget '<id>' not found`) en esa celda sin afectar a los demas (`Dashboard.vue:63-75`, `169-179`). |
| Widget en `widgets[]` no referenciado en el mosaic | No se renderiza. Sin error: sirve para dejar widgets "en stage" que aun no estan en la grilla. |
| Todas las filas deben tener el mismo numero de columnas | Requisito de CSS Grid; el dashboard no normaliza filas irregulares. |

`gridPosition` por widget se ignora en silencio cuando `mosaic` esta presente (`layout/src/types/dashboard.ts:109-116`; resuelto en `widgetCellStyle`, `Dashboard.vue:381-385`).

### `layoutConfig.columnSizes` / `rowSizes` (`string[]`, opcional)

Un valor CSS `grid-template-columns` / `grid-template-rows` por columna/fila (`"1fr"`, `"2fr"`, `"200px"`, `"minmax(100px, 1fr)"`, etc.), pass-through verbatim (`Dashboard.vue:335-342`). Si se omiten: columnas iguales (`repeat(N, 1fr)`) y filas auto (`repeat(N, auto)`).

### `layoutConfig.grid.gap` (opcional)

Se sigue honrando en modo mosaic (gap en px, default 16). `grid.columns` y `grid.rowHeight` se **ignoran** en modo mosaic: su semantica queda reemplazada por el ancho de columnas derivado del mosaic y por `rowSizes` (`layout/docs/features/dashboard.md:99-100`).

### Renderizado interno (CSS Grid)

`Dashboard.vue` computa el `grid-template-areas` a partir del mosaic con un helper puro:

```ts
// layout/src/layouts/dashboard/mosaicHelpers.ts:25-27
export function mosaicToGridTemplateAreas(mosaic: string[][]): string {
  return mosaic.map((row) => `"${row.join(' ')}"`).join(' ');
}
```

Y ubica cada celda por `grid-area: <widgetId>` (`Dashboard.vue:369-371`), en vez de `grid-column` / `grid-row` como en el modo legado (`Dashboard.vue:355-361`).

## Widgets soportados

El registry vive en `layout/src/layouts/widgets/widgetRegistry.ts:24-33`:

```ts
export const widgetRegistry: WidgetRegistry = {
  report: defineAsyncComponent(() => import('./ReportWidget.vue')),
  recordlist: defineAsyncComponent(() => import('./RecordListWidget.vue')),
};
```

### `report` (Flexmonster, UPONE-1089 / DASH-04)

Monta `ReportWidget.vue`, que envuelve el visor de reportes (Flexmonster pivot / KPI) del `report-builder`. El `config` acepta `reportCode` o `reportId` (gana `reportCode`, sobrevive a re-seeds que rotan cuids) y `defaultView: 'auto' | 'kpi' | 'pivot'` para forzar el modo inicial cuando el reporte declara un `kpiCell` (`layout/src/types/dashboard.ts:481-502`). Sin ninguno de los dos ids, el widget muestra un estado de error en vez de romper el dashboard (`layout/src/layouts/widgets/ReportWidget.vue:63-66`). Detalle de reportes/plantillas/KPI: ver `features/report-builder.md`.

### `recordlist` (UPONE-1091 / DASH-06)

Monta `RecordListWidget.vue`, que embebe un `RecordList` completo dentro de una celda del dashboard **reutilizando `LayoutOrchestrator`** en vez de reimplementar la grilla:

```vue
<!-- layout/src/layouts/widgets/RecordListWidget.vue:67-77 -->
<LayoutOrchestrator
  v-else
  :object-name="objectName"
  :layout-type="'RecordList'"
  :layout-name="layoutName"
  :apollo-client="apolloClient"
  :application-id="applicationId"
  :role-name="roleName"
  :enable-row-click="rowClickEnabled"
  @row-click="handleRowClick"
/>
```

Esto significa que el `RecordList` embebido hereda gratis el mismo grid, filtrado, ordenamiento, RBAC (object-level + field-level) y CRUD que un `RecordList` de pagina completa (es el mismo componente, no una version reducida). Config requerido (`layout/src/types/dashboard.ts:522-544`):

| Campo | Tipo | Requerido | Que hace |
|---|---|---|---|
| `layoutName` | `string` | Si | Layout a resolver via `LayoutOrchestrator` (ej. `"default_ReportTestData_list"`). |
| `objectName` | `string` | Si | Objeto que apunta el layout. Requerido para que la barra de filtros agrupe widgets `recordlist` junto a widgets `report` sobre el mismo objeto. |
| `rowClickWritesParam` | `string` | No (opt-in, va en par con el siguiente) | Parametro de URL a escribir cuando se hace click en una fila. |
| `rowClickValueField` | `string` | No (opt-in) | Campo de la fila cuyo valor se escribe en `rowClickWritesParam`. Si el campo esta ausente en la fila clickeada, no hace nada (no escribe `undefined`). |

Sin `layoutName` **y** `objectName`, el widget muestra un estado de error (`RecordListWidget.vue:48-57`) en vez de tirar abajo el dashboard. El click de fila usa `router.replace` (no `push`) para no ensuciar el historial, igual que la barra de filtros del dashboard (`RecordListWidget.vue:192-205`). Detalle de `RecordList` como componente: ver `features/recordlist-recorddetail-2026-07.md`.

## Ejemplo real: `hello-world-mod`

`hello-world-mod` esta en `ignoredMods` y nunca llega a una BD de tenant, por lo que es el lugar elegido para fixtures de referencia (canonical), mientras los fixtures de prueba de mods activos quedan locales. Dos archivos:

### `hw-dashboard-reference.json` (commit bba7e01): foco en `filterMode` + error states

12 columnas, 6 widgets, 4 filas. Migrado de `gridPosition` a `mosaic` en UPONE-1226 Step 3 preservando exactamente el layout original:

```jsonc
// mods/hello-world-mod/config/layouts/hw-dashboard-reference.json
"mosaic": [
  ["wgt-shared-default", ..., "wgt-shared-explicit", ...],   // fila 1, 400px
  ["wgt-self-contained", ..., "wgt-frozen", ...],            // fila 2, 400px
  ["wgt-broken", ...,          "wgt-fallback", ...],         // fila 3, 150px
  ["wgt-broken", ...,          ".", "."]                     // fila 4, 50px
],
"rowSizes": ["400px", "400px", "150px", "50px"]
```

`wgt-broken` ocupa filas 3 y 4 (200px totales, spanning vertical) mientras `wgt-fallback` solo ocupa la fila 3 (150px); el `.` en la fila 4 deja el hueco abierto junto al widget mas alto. Los 6 widgets son todos `widgetType: "report"` y cubren los casos de `filterMode` (`shared` default/explicito, `self-contained`, `frozen`) mas dos casos de error a proposito: `reportId` inexistente (error state) y `widgetType: "unknown-type"` (fallback).

### `hw-dashboard-mosaic-large.json` (commit 4c84eeb): foco en escala + `recordlist`

12 columnas, 11 widgets, 5 filas, mezcla de anchos de 4 y 6 columnas mas una fila footer de ancho completo. Este es el fixture que ademas incluye widgets `recordlist`:

```jsonc
// mods/hello-world-mod/config/layouts/hw-dashboard-mosaic-large.json
"columnSizes": ["1fr","1fr","1fr","1fr","1fr","1fr","1fr","1fr","1fr","1fr","1fr","1fr"],
"rowSizes": ["250px", "150px", "700px", "900px", "900px"],
"widgets": [
  // filas 1-2: KPI tiles de 4 columnas (widgetType: "report", defaultView: "kpi")
  // fila 3: 2 charts de 6 columnas (widgetType: "report", defaultView: "pivot")
  {
    "widgetId": "wgt-list-click",
    "widgetType": "recordlist",
    "title": "Filterable list (row click -> semester)",
    "config": {
      "layoutName": "REPLACE_WITH_REAL_LAYOUT_NAME",
      "objectName": "REPLACE_WITH_REAL_OBJECT",
      "rowClickWritesParam": "semester",
      "rowClickValueField": "semester"
    }
  },
  {
    "widgetId": "wgt-list-footer",
    "widgetType": "recordlist",
    "title": "Detailed listing (full width)",
    "config": {
      "layoutName": "REPLACE_WITH_REAL_LAYOUT_NAME",
      "objectName": "REPLACE_WITH_REAL_OBJECT"
    }
  }
]
```

`wgt-list-click` (fila 4, mitad derecha) demuestra el patron de click-to-filter: al hacer click en una fila escribe `?semester=<valor>` en la URL, que cualquier widget hermano cuyo template declare `semester` en sus `environmentFilters` recoge automaticamente. `wgt-list-footer` (fila 5) es una tabla de detalle de ancho completo, patron tipico de "drill-down" al pie del dashboard.

Ambos fixtures usan placeholders genericos (`REPLACE_WITH_REAL_REPORT_ID`, `REPLACE_WITH_REAL_LAYOUT_NAME`) porque `hello-world-mod` no tiene datos reales: son plantillas para copiar y completar en un mod activo. Otro ejemplo de mosaic a escala real (12 columnas, 11 widgets, 5 filas): `mods/academic-scheduling/config/layouts/dashboard-test.json`.

## Integracion con LayoutOrchestrator

`Dashboard` se resuelve exactamente igual que cualquier otro layout type: `LayoutOrchestrator` mapea `layoutType: "Dashboard"` a `Dashboard.vue` en su tabla de componentes (`layout/src/layouts/LayoutOrchestrator.vue:801-815`), priorizando el `layoutType` que viene de la BD (`fetchedLayoutType`) sobre el prop del caller. Esto es lo mismo que usa el widget `recordlist` para embeber `RecordList` dentro de una celda: no hay un camino separado, `LayoutOrchestrator` se llama recursivamente (`RecordListWidget.vue` monta su propio `<LayoutOrchestrator layout-type="RecordList">` internamente). Un widget `report` no reentra a `LayoutOrchestrator`: monta directamente el visor del `report-builder`.

`Dashboard.vue` expone el mismo contrato que el resto de layouts (`isDirty`, `submitForm`, `vueform`, `hasIntegratedControls`) via `defineExpose` para que `LayoutOrchestrator` y `ModalStackManager` puedan interrogar cualquier layout de forma uniforme, aunque `Dashboard` no es un formulario (`Dashboard.vue:392-400`).

## Limitaciones

- **Sin drag-and-drop**: la posicion (mosaic o `gridPosition`) se declara en JSON; no hay edicion visual de la grilla desde la UI. `gridPosition` fue disenado pensando en una futura libreria de grid (GridStack, Vue Grid Layout) que traduciria drag-and-drop a mutaciones de config, pero eso no existe aun.
- **Fail loud, no fail soft**: un mosaic con forma no rectangular (L-shape) lanza un `Error` en el render loop de Vue en vez de degradar silenciosamente. Es intencional (evita que CSS Grid descarte celdas en silencio), pero significa que un error de autoria en el JSON rompe el dashboard completo, no solo el widget afectado (a diferencia de un `widgetId` huerfano sin match en `widgets[]`, que solo genera un tile de error localizado).
- **Solo dos widget types**: `report` y `recordlist`. Cualquier otro `widgetType` cae en `FallbackWidget` (no crashea, pero tampoco muestra contenido util).
- **`columnSizes`/`rowSizes` no se auto-derivan**: si se omiten, todas las columnas/filas quedan iguales; no hay heuristica de tamano segun el contenido del widget (ej. un chart no pide automaticamente mas alto que un KPI tile).
- **Filas irregulares no se normalizan**: si las filas del mosaic tienen distinta cantidad de columnas, el dashboard no lo corrige; CSS Grid puede comportarse de forma inesperada.

## Relacionado

| Doc | Relacion |
|---|---|
| `features/report-builder.md` | Widgets de tipo `report`: plantillas, KPI cells, Flexmonster. |
| `features/recordlist-recorddetail-2026-07.md` | `RecordList` como componente: lo que el widget `recordlist` reutiliza via `LayoutOrchestrator`. |
| `core/layout-workspace.md` | Vision general del workspace `layout/` (doc hermano, en creacion). |
| `layout/docs/reference/dashboard-mosaic.md` | Referencia canonica en el repo de codigo: reglas, patrones de autoria, receta de migracion desde `gridPosition`. |
| `layout/docs/features/dashboard.md` | Doc de feature completo del layout type `Dashboard` (filtros, `filterMode`, freeze/unfreeze). |
| UPONE-1088 (DASH-03) | Ticket original del layout type `Dashboard` (grid + registry). |
| UPONE-1091 (DASH-06) | Ticket del widget `recordlist`. |
| UPONE-1226 (RPT-UPG-04) | Ticket que introduce la sintaxis `mosaic`. |
