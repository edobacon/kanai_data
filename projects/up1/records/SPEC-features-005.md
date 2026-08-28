---
id: SPEC-features-005
project: up1
type: doc
module: features
tags:
  - up1
  - report-builder
  - reportes
  - flexmonster
  - pivot
  - graficos
  - templates
  - graphql
  - dashboard
  - analytics
  - rbac
---

# Report Builder de uP1 - Guia completa

## Indice

1. [Que es el Report Builder](#1-que-es-el-report-builder)
2. [Arquitectura](#2-arquitectura)
3. [Modelo de datos](#3-modelo-de-datos)
4. [Componentes del sistema](#4-componentes-del-sistema)
5. [Flujo de datos: del template al pivot](#5-flujo-de-datos-del-template-al-pivot)
6. [Templates de reporte](#6-templates-de-reporte)
7. [Creacion y edicion de reportes](#7-creacion-y-edicion-de-reportes)
8. [Visualizacion: Flexmonster](#8-visualizacion-flexmonster)
9. [API GraphQL](#9-api-graphql)
10. [RBAC y permisos](#10-rbac-y-permisos)
11. [Traducciones](#11-traducciones)
12. [Seed data y templates predefinidos](#12-seed-data-y-templates-predefinidos)
13. [Integracion con mods](#13-integracion-con-mods)
14. [Comandos y setup](#14-comandos-y-setup)
15. [Funcionalidades declarativas avanzadas](#15-funcionalidades-declarativas-avanzadas)

---

## 1. Que es el Report Builder

Modulo de **reporteria y analisis interactivo** basado en tablas pivot (Flexmonster). Permite a usuarios crear, configurar y visualizar reportes sobre cualquier objeto de la plataforma sin escribir codigo.

### Capacidades

- Tablas pivot con drag-and-drop de filas, columnas y medidas
- 9 tipos de graficos (bar, column, line, pie, area, scatter, stacked, column+line, tabla)
- Dashboard con vista de tarjetas y lista paginada
- Templates reutilizables con queries GraphQL configurables
- Filtros, sorting y visualizacion persistentes por reporte
- Export a Excel, PDF, CSV, HTML, imagen
- Soporte dark mode y 3 idiomas (es, en, pt)
- RBAC granular (15 capabilities bajo `mod/up1-manager/*`, con enforcement real en el servidor)
- KPI cell declarativa, env-filters cross-object y visibilidad de templates por rol (ver seccion 15)

### Stack

```
Vue 3.5 + TypeScript 5.2 + Vite 7 + Flexmonster 2.9 + Bootstrap 5.3 + Apollo Client
```

---

## 2. Arquitectura

### Posicion en uP1

El Report Builder es un **workspace del monorepo** que sigue el patron de mod: sus artefactos se sincronizan a los workspaces core via `npm run sync`.

**Importante (delegacion de vistas a up1-manager, UPONE-1279/1286/1377):** `report-builder` ya NO publica layouts propios ni una app de Suite. Sigue siendo la **fuente tecnica unica** para `logic/`, `objects/`, `modsComponents/`, `lang/`, `seed/` y `css/`. Las vistas (`report-list`, `report-view`, `report-edit`, `report-create`, `reporttemplate-*`) las expone el mod `up1-manager` (`mods/up1-manager/config/layouts/report*.json`, `mods/up1-manager/config/layouts/reporttemplate-*.json`), incluyendo el `app.json` de Suite. `mods/up1-manager/seed/remove-legacy-apps.js` limpia, durante el sync, el registro legacy de la app Suite `report-builder` (y sus filas de app/layout dependientes) sin borrar datos de reportes. Fuente: `report-builder/README.md` (secciones "Migration Status" y "Suite App And Layout Ownership").

```
report-builder/
├── logic/           → object-manager/src/graphql/resolvers/up1/report-builder/
├── modsComponents/  → layout/src/modsComponents/ + suite/modsComponents/
├── lang/            → suite/lang/
└── seed/            → datos de categorias, templates y reportes de ejemplo

mods/up1-manager/
├── config/layouts/report-*.json         → BD: up1_layen_layout (vistas de Report)
├── config/layouts/reporttemplate-*.json → BD: up1_layen_layout (vistas de ReportTemplate)
├── config/app.json                      → app de Suite que expone las vistas
└── capabilities.json                    → BD: capabilities table (namespace mod/up1-manager/*)
```

### Flujo de datos end-to-end

```text
  ┌────────────────────────────────┐
  │  Suite /:tenant_id/reports     │
  └────────────────┬───────────────┘
                   ▼
  ┌────────────────────────────────┐
  │ LayoutOrchestrator+RecordDetail│
  └────────────────┬───────────────┘
                   ▼
  ┌────────────────────────────────┐
  │  RecordList generico            │  (report-list.json / reporttemplate-list.json)
  └───────────────┬────────────────┘
                  │ Ver reporte (report-view.json, type: report-form-manager)
                  ▼
  ┌────────────────────────────────┐
  │  ReportFormManagerElement      │  (modo view; flattenForView)
  └───┬──────────────┬─────────────┘
      │              │
      ▼              ▼
  ┌──────────┐  ┌──────────────────┐
  │getReport-│  │getReportTemplate-│
  │ ById     │  │    ById          │
  └──────────┘  └──────────┬───────┘
                            ▼
                ┌─────────────────────────┐
                │  Template GraphQL query │
                └────────────┬────────────┘
                             ▼
                ┌─────────────────────────┐
                │   Object Manager data   │
                └────────────┬────────────┘
                             ▼
                ┌─────────────────────────┐
                │    flattenForDisplay     │
                └────────────┬────────────┘
                             ▼
                ┌─────────────────────────┐
                │  FlexmonsterComponent   │
                └────────────┬────────────┘
                             ▼
                ┌─────────────────────────┐
                │  Tabla pivot / grafico  │
                └─────────────────────────┘
```

> **Dos caminos de render (verificado 2026-07-20)**, que este diagrama antes mezclaba:
> - **Vista standalone** ("Ver reporte"): la lista es un `RecordList` generico (`report-list.json`), y `report-view.json` declara `type: report-form-manager` → `ReportFormManagerElement` en modo view (su propio `flattenForView`). `ReportListManagerElement.vue` fue **eliminado** (UPONE-1377); ya no existe.
> - **Widget de dashboard**: `ReportWidget.vue` (layout) monta `ReportViewerManagerElement` (`flattenForDisplay`). Este es el unico consumidor real de `ReportViewerManagerElement` hoy.
>
> El fix de UPONE-1377 para suprimir el alert bloqueante de Flexmonster ("no measures") en pivots vacios se aplico **solo** en `ReportViewerManagerElement` (pasa `suppress-empty-alert="true"` a `FlexmonsterComponent`). La vista standalone (`ReportFormManagerElement` en modo view) **no** pasa `suppressEmptyAlert`, asi que aun puede pegar el alert. La prop `suppressEmptyAlert?: boolean` vive en `FlexmonsterComponent.vue` (deliberadamente separada de `readonly`).

---

## 3. Modelo de datos

> La antigua tabla de extension `ext__uplanner__report` fue **eliminada** (UPONE-1377). Todos los campos de usuario (`name`, `code`, `categoryId`, `description`, `dataSourceObject`, `dataSourceFields`) viven ahora en el modelo base `Report` (`report-builder/objects/Report.json`).

### Entidades principales

```text
  ┌─────────────────┐        ┌────────────────┐
  │ ReportCategory  │◄───────┤ ReportTemplate │
  └────────┬────────┘        └───────┬────────┘
           │ categoryId               │ templateId
           │                          ▼
           │                      ┌──────────┐
           └─────────────────────►│  Report  │
                     categoryId   └────┬─────┘
                                       │
              ┌─────┬─────────────┬───┴───────────┬──────────────┐
              ▼     ▼             ▼               ▼              ▼
           ┌──────┐ ┌──────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
           │Report│ │  Report  │ │   Report    │ │   Report    │ │   Report    │
           │Filter│ │ Sorting  │ │Visualization│ │    Pivot    │ │  KpiCell    │
           │  []  │ │  (1:1)   │ │   (1:1)     │ │   (1:1)     │ │   (1:1)     │
           └──────┘ └──────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### Report (reporte)

Fuente: `report-builder/objects/Report.json`.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | String (cuid) | Identificador unico |
| `tenantId` | String | Tenant |
| `templateId` | String (FK, opcional) | Template que define la query |
| `name` | String | Nombre del reporte |
| `code` | String (unique) | Identificador externo estable (ver seccion "code como identificador externo") |
| `categoryId` | String (FK real a `ReportCategory`) | Categoria |
| `description` | String | Descripcion |
| `dataSourceObject` | String | Nombre del objeto fuente (ej: "Person") |
| `dataSourceFields` | String[] (nativo, `prismaType: "String[]"`) | Campos proyectados en el reporte |
| `createdById` | Int (FK a `core_User`) | Usuario creador; se resuelve a nombre en el render |

No existen campos `createdBy`/`updatedBy` como String: el creador se referencia via `createdById` (Int).

### ReportTemplate (plantilla)

Fuente: `report-builder/objects/ReportTemplate.json`.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | String (cuid) | Identificador unico |
| `name` | String (unique) | Nombre de la plantilla |
| `code` | String (unique, opcional) | Identificador externo estable |
| `description` | String | Descripcion |
| `categoryId` | String (FK real a `ReportCategory`) | Categoria |
| `query` | Text | Query GraphQL que obtiene los datos |
| `dataSourceObject` | String | Objeto que consulta el template; obligatorio al crear |
| `environmentFilters` | String[] (nativo) | Campos que aceptan valores desde parametros de URL del dashboard (ver seccion dedicada) |
| `visibleToRoles` | String[] (nativo) | Roles con acceso cuando el template no es publico (ver seccion RBAC) |
| `isPublic` | Boolean (default: true) | Visible para todos |
| `tags` | String | Tags separados por coma |
| `createdById` | Int (FK a `core_User`) | Usuario creador |

### ReportCategory

Objeto propio (`object-manager/objects/business/Base/reportcategory.json`), reemplaza el legacy "Category" con `scopeType`. Ver seccion dedicada "ReportCategory" mas abajo.

### ReportFilter, ReportSorting, ReportVisualization, ReportPivot, ReportKpiCell

| Entidad | Relacion | Campos clave |
|---------|----------|-------------|
| `ReportFilter` | 1:N con Report | field, operator, value |
| `ReportSorting` | 1:1 con Report | field, order |
| `ReportVisualization` | 1:1 con Report | chartType, conditions (JSON) |
| `ReportPivot` | 1:1 con Report | rows (String[]), columns (String[]), values (JSON) |
| `ReportKpiCell` | 1:1 con Report | cellType, measure, row/column, label, format, abbreviated (ver seccion dedicada) |

**Formato de `ReportPivot`**: `rows` y `columns` son arrays nativos de Postgres (`String[]`), no listas separadas por coma. `values` es un objeto JSON: `[{ field, aggregation }]` (por ejemplo `[{ "field": "gpa", "aggregation": "average" }]`), no el string `"field1:sum,field2:average"`.

---

## 4. Componentes del sistema

### Vista general

```
report-builder/modsComponents/
├── FlexmonsterReport/           ← Wrapper de Flexmonster (motor pivot)
│   ├── FlexmonsterComponent.vue
│   └── useFlexmonsterReport.ts
│
├── ReportListManager/           ← Solo composables (el Element.vue fue eliminado en UPONE-1377)
│   ├── useReportBuilder.ts        el listado ahora es RecordList generico (report-list.json)
│   ├── useReportDashboard.ts
│   ├── useReportPermissions.ts
│   └── useTranslations.ts
│
├── ReportFormManager/           ← Wizard crear/editar + modo view standalone (report-view.json)
│   └── ReportFormManagerElement.vue
│
└── ReportViewerManager/         ← Visor usado por el widget de dashboard (ReportWidget.vue)
    └── ReportViewerManagerElement.vue
```

`ReportBuilderWizard/ReportBuilderWizardElement.vue` fue eliminado (UPONE-1377); ya no existe en el codigo.

### FlexmonsterComponent

Wrapper de Flexmonster para uP1. SSR-safe (import dinamico solo en cliente).

**Caracteristicas:**
- Dark mode automatico via MutationObserver en `<html class="theme-dark">`
- Locale detectado de `localStorage('up1-locale')` → CDN de Flexmonster
- Toolbar customizado: elimina pestanas Connect y Open
- Modo readonly: deshabilita configurator, drillThrough
- Export: Excel, PDF, CSV, HTML, imagen

**Props principales:**

| Prop | Tipo | Descripcion |
|------|------|-------------|
| `dataSource` | Object | Datos para el pivot |
| `slice` | Object | Configuracion de filas/columnas/valores |
| `options` | Object | Opciones de Flexmonster |
| `formats` | Array | Formatos numericos |
| `conditions` | Array | Formato condicional |
| `readonly` | Boolean | Modo solo lectura |
| `licenseKey` | String | Licencia Flexmonster |

**Metodos expuestos:**

```typescript
getPivot()                    // Instancia Flexmonster
getFullReport()               // Configuracion completa (slice + options + formats)
refresh()                     // Recargar datos
exportTo('excel'|'pdf'|'csv') // Exportar
showGridAndCharts(type)       // Cambiar tipo de visualizacion
setLocale(lang)               // Cambiar idioma
```

### ReportListManager

Listado de reportes con dos vistas:

- **Dashboard**: tarjetas con "Recently Updated" (ultimos 7 dias) y "Created by Me"
- **Lista**: tabla paginada con filtros server-side (busqueda, categoria, creador, fechas)

Toggle entre vistas via boton.

### ReportFormManager

Wizard multi-paso para crear/editar reportes y templates:

**Para reportes (3 pasos):**

```
Step 1: Informacion Basica
  → nombre, categoria, descripcion

Step 2: Plantilla
  → seleccionar ReportTemplate existente (filtrado por la categoria del Paso 1)

Step 3: Configuracion
  → filtros, sorting, tipo de grafico, pivot (filas/columnas/valores)
  → sub-paso KPI cell (opcional, ver seccion dedicada "KPI cell declarativa")
  → Preview en tiempo real con FlexmonsterComponent
```

**Para templates (2 pasos):**

```
Step 1: Informacion de la Plantilla
  → nombre, descripcion, publico/privado, tags, visibleToRoles (checkboxes)

Step 2: Consulta GraphQL
  → textarea con la query GraphQL
  → boton "Test Query" para verificar
  → muestra campos detectados
  → environmentFilters (chips)
```

### ReportViewerManager

Visor de reportes existentes. Flujo:

1. Carga reporte por ID via Apollo
2. Si tiene template → carga el template → obtiene query GraphQL
3. Ejecuta la query → datos crudos
4. Aplana objetos anidados (`flattenForDisplay`)
5. Filtra campos segun `dataSourceFields` del reporte
6. Construye `slice` dinamico desde `ReportPivot` (rows, columns, values con agregacion)
7. Pasa todo a `FlexmonsterComponent`

### Tipos de grafico soportados

| chartType (BD) | Flexmonster type | Descripcion |
|----------------|-----------------|-------------|
| `pivot` / `table` | grid | Tabla pivot clasica |
| `bar` | bar_h | Barras horizontales |
| `column` | column | Barras verticales |
| `line` | line | Linea |
| `pie` | pie | Torta |
| `area` | area | Area |
| `scatter` | scatter | Dispersion |
| `stacked_column` | stacked_column | Barras apiladas |
| `column_line` | column_line | Columna + linea combinado |

---

## 5. Flujo de datos: del template al pivot

### Paso 1: El template define la query

```graphql
# Query almacenada en ReportTemplate.query
query {
  listInstances(
    objectName: "ReportTestData"
    filters: []
    limit: 10000
  ) {
    instances
    totalCount
  }
}
```

El template puede apuntar a cualquier objeto del sistema (Person, Event, Course, o un objeto custom).

### Paso 2: El reporte ejecuta la query

```javascript
// ReportViewerManagerElement.vue
const rawResults = await apolloClient.query({
  query: gql(template.query),
  fetchPolicy: 'network-only'
});
```

### Paso 3: Aplanamiento de datos

Los resultados de `listInstances` vienen como objetos anidados. El viewer los aplana:

```javascript
// Entrada:
{ studentName: "Maria", department: { name: "Ingenieria", faculty: { name: "FCFM" } } }

// Salida (flattenForDisplay):
{ studentName: "Maria", "department.name": "Ingenieria", "department.faculty.name": "FCFM" }
```

### Paso 4: El pivot procesa los datos

```javascript
// Slice dinamico construido desde ReportPivot
const slice = {
  rows: [{ uniqueName: "program" }, { uniqueName: "department" }],
  columns: [{ uniqueName: "enrollmentStatus" }],
  measures: [
    { uniqueName: "gpa", aggregation: "average" },
    { uniqueName: "studentName", aggregation: "count" }
  ]
};
```

### Paso 5: Flexmonster renderiza

```
FlexmonsterComponent recibe:
  dataSource: { data: flattenedRows }
  slice: { rows, columns, measures }
  options: { grid: { showHeaders: true }, chart: { type: "column" } }
→ Tabla pivot interactiva con drag-and-drop
```

---

## 6. Templates de reporte

### Que es un template

Un template es una **consulta GraphQL reutilizable** que define de donde vienen los datos de un reporte. Multiples reportes pueden usar el mismo template con diferentes filtros, sorting y visualizacion.

### Separacion template vs reporte

| Aspecto | Template | Reporte |
|---------|----------|---------|
| Define | **De donde** vienen los datos (query GraphQL) | **Como** se muestran (filtros, pivot, grafico) |
| Quien crea | Admin / Coordinador | Cualquier usuario con permiso |
| Reutilizable | Si (N reportes → 1 template) | No (configuracion unica) |
| Contiene query | Si (`query` field) | No (hereda del template) |
| Contiene pivot/chart | No | Si (ReportPivot, ReportVisualization) |

### Ejemplo de template

`categoryId` debe ser el `id` real (cuid) de un `ReportCategory` existente, no su `code`. El `code` (por ejemplo `RPT_ACADEMIC`) vive en `ReportCategory.code` (`object-manager/objects/business/Base/reportcategory.json`); se usa para referenciar la categoria en seeds/UI, pero el campo `categoryId` del template siempre apunta al id de la fila.

```json
{
  "name": "Panorama de Matricula",
  "description": "Vista general de matricula estudiantil",
  "categoryId": "clx_reportcategory_id",
  "dataSourceObject": "ReportTestData",
  "isPublic": true,
  "tags": "matricula,enrollment,estudiantes",
  "visibleToRoles": ["Admin", "Coordinador"],
  "environmentFilters": ["cohortYear", "program"],
  "query": "query { listInstances(objectName: \"ReportTestData\", filters: [], limit: 10000) { instances totalCount } }"
}
```

`dataSourceObject` es obligatorio al crear un template (validado en `reportTemplate.resolver.js:396-402`). `visibleToRoles` y `environmentFilters` son opcionales; ver secciones dedicadas "Visibilidad de templates por rol" y "Env-filters cross-object".

### Templates predefinidos (13)

El seed incluye 13 templates en 4 categorias:

| Categoria | Templates |
|-----------|----------|
| **RPT_ACADEMIC** | Panorama de Matricula, Metricas de Retencion, Analisis Integral, Perfil Socioeconomico, Rendimiento Academico, Analisis de Desercion |
| **RPT_FINANCIAL** | Resumen Financiero, Seguimiento de Pagos, Comparativo Financiero |
| **RPT_OPERATIONAL** | Consulta Base, Analisis de Asistencia, Indicadores de Retencion |
| **RPT_CUSTOM** | KPI Tasa de Retencion 2024-2025 |

Todos apuntan a `ReportTestData` para demo. En produccion se crean templates apuntando a objetos reales.

### Proteccion de templates en uso

Si se intenta eliminar un template que tiene reportes asociados:

```
Error: TEMPLATE_IN_USE:3:Reporte A, Reporte B, Reporte C
```

El frontend parsea este error para mostrar un dialogo informativo.

---

## 7. Creacion y edicion de reportes

### Wizard de creacion (3 pasos)

**Paso 1 - Informacion Basica:**
- Nombre del reporte
- Categoria (dropdown con categorias del seed)
- Descripcion

**Paso 2 - Seleccion de Template:**
- Lista de templates disponibles, filtrada por la categoria elegida en el Paso 1 (ya no hay un selector de categoria duplicado en este paso; se elimino en UPONE-1374)
- Preview de la query del template
- Campos detectados automaticamente

**Paso 3 - Configuracion:**
- Filtros (campo, operador, valor)
- Sorting (campo, orden)
- Tipo de grafico (9 opciones)
- Configuracion de pivot:
  - Filas (drag-and-drop de campos)
  - Columnas (drag-and-drop)
  - Valores (campo + agregacion: sum, average, count, min, max)
- Sub-paso KPI cell (opcional): configura si el widget del reporte muestra un valor destacado en vez del pivot completo. Campos: `cellType` (grandTotal | subtotal), `measure`, `row`/`column` (solo si `cellType` es subtotal), `label`, `format` (number | percent | currency | decimal), `abbreviated` (booleano, formato compacto "19M"/"1.2K"). Implementado en `ReportFormManagerElement.vue:191-352`. Ver seccion dedicada "KPI cell declarativa"
- Preview en tiempo real con FlexmonsterComponent

### Wizard de template (2 pasos)

**Paso 1 - Informacion:**
- Nombre de la plantilla
- Descripcion
- Publico/privado
- Tags
- `visibleToRoles` (checkboxes de roles): restringe la visibilidad del template cuando no es publico. Ver seccion "Visibilidad de templates por rol"

**Paso 2 - Query GraphQL:**
- Textarea con la query
- Boton "Test Query" para verificar contra el Object Manager
- `environmentFilters` (chips): declara que campos del template aceptan valores desde parametros de URL del dashboard. Ver seccion "Env-filters cross-object"
- Lista de campos detectados en el resultado

---

## 8. Visualizacion: Flexmonster

### Que es

Motor de tablas pivot y graficos interactivos. Se integra como componente Vue (`FlexmonsterComponent.vue`).

### Funcionalidades

| Funcion | Descripcion |
|---------|-------------|
| Tabla pivot | Filas, columnas y medidas con drag-and-drop |
| Graficos | 9 tipos (bar, column, line, pie, area, scatter, stacked, column_line, grid) |
| Drill-down | Click en celda para ver detalle |
| Export | Excel, PDF, CSV, HTML, imagen |
| Formato condicional | Colores por valor (ej: rojo si GPA < 2.0) |
| Formatos numericos | Moneda, porcentaje, decimales |
| Sorting | Por cualquier campo o medida |
| Dark mode | Automatico via CSS theme de Flexmonster CDN |
| Locale | es, en, pt via CDN de Flexmonster |

### Integracion con dark mode

```javascript
// MutationObserver en <html> detecta clase "theme-dark"
const observer = new MutationObserver(() => {
  if (html.classList.contains('theme-dark')) {
    // Carga CSS: cdn.flexmonster.com/theme/dark/flexmonster.min.css
  } else {
    // Remueve CSS dark
  }
});
observer.observe(html, { attributes: true, attributeFilter: ['class'] });
```

### Integracion con i18n

```javascript
// Detecta idioma de localStorage
const locale = localStorage.getItem('up1-locale') || 'es';
const localeMap = {
  es: 'https://cdn.flexmonster.com/loc/es.json',
  pt: 'https://cdn.flexmonster.com/loc/pt.json',
  en: 'https://cdn.flexmonster.com/loc/en.json'
};
```

---

## 9. API GraphQL

### Queries de reportes

```graphql
# Listar reportes con filtros y paginacion
query {
  listReports(
    tenantId: "UPU"
    limit: 20
    offset: 0
    filters: {
      searchQuery: "matricula"
      category: "RPT_ACADEMIC"
      createdAfter: "2026-01-01"
    }
    sort: { field: "updatedAt", direction: "DESC" }
  ) {
    reports { id name categoryId description createdById updatedAt }
    totalCount
    hasMore
  }
}

# Obtener reporte por ID
query {
  getReportById(id: "clx123...", tenantId: "UPU") {
    id name code description templateId
    filters { field operator value }
    sorting { field order }
    visualization { chartType conditions }
    pivot { rows columns values }
    kpiCell { cellType measure row column label format abbreviated }
  }
}

# Obtener reporte por code (identificador externo estable, UPONE-1168)
query {
  getReportByCode(code: "RPT-MATRICULA-2026", tenantId: "UPU") {
    id name code
  }
}
```

`getModelData` fue **eliminado** (UPONE-1223): era codigo muerto sin llamadores, bypasseaba el RBAC de campo que si aplica `listInstances`. Los reportes ejecutan siempre el `query` guardado en el `ReportTemplate` (ver `reportData.resolver.js:765-772`).

### Mutations de reportes

```graphql
# Crear reporte
mutation {
  createReport(tenantId: "UPU", input: {
    name: "Matricula 2026"
    code: "RPT-MATRICULA-2026"
    categoryId: "clx_reportcategory_id"
    templateId: "clx_template_id"
    description: "Analisis de matricula primer semestre 2026"
    dataSourceFields: ["studentName", "program", "enrollmentStatus", "gpa"]
    filters: [{ field: "cohortYear", operator: "EQUALS", value: "2026" }]
    sorting: { field: "gpa", order: "DESC" }
    visualization: { chartType: "column" }
    pivot: { rows: ["program"], columns: ["enrollmentStatus"], values: [{ field: "gpa", aggregation: "average" }, { field: "studentName", aggregation: "count" }] }
    kpiCell: { cellType: "grandTotal", measure: "gpa", format: "decimal" }
  }) {
    id name code
  }
}

# Duplicar reporte (el code NO se copia; reportData.resolver.js:1406-1408)
mutation {
  duplicateReport(tenantId: "UPU", reportId: "clx123...") {
    id name
  }
}

# Eliminar reporte
mutation {
  deleteReport(tenantId: "UPU", id: "clx123...")
}
```

`code` es unico; una violacion (P2002) devuelve un error amigable en vez del error crudo de Prisma. Pasar `kpiCell: null` en `UpdateReportInput` elimina un KPI cell existente.

### Queries y mutations de templates

```graphql
# Listar templates
query {
  listReportTemplates(tenantId: "UPU", limit: 50) {
    templates { id name description query isPublic tags }
    totalCount
  }
}

# Crear template
mutation {
  createReportTemplate(tenantId: "UPU", input: {
    name: "Analisis por Carrera"
    code: "RPT-ANALISIS-CARRERA"
    description: "Metricas academicas agrupadas por carrera"
    categoryId: "clx_reportcategory_id"
    dataSourceObject: "Person"
    query: "query { listInstances(objectName: \"Person\", limit: 5000) { instances totalCount } }"
    isPublic: true
    tags: "carrera,academico"
    visibleToRoles: []
    environmentFilters: ["program"]
  }) {
    id name code
  }
}
```

`dataSourceObject` es obligatorio en la creacion (validado en `reportTemplate.resolver.js:396-402`). Con `isPublic: true`, `visibleToRoles` se ignora (todos ven el template); ver seccion "Visibilidad de templates por rol" para el comportamiento cuando `isPublic` es `false`.

---

## 10. RBAC y permisos

### Capabilities (15)

`report-builder/capabilities.json` es un array vacio: el modulo tecnico no declara capabilities propias. Las 15 capabilities reales viven bajo el namespace `mod/up1-manager/*` (`mods/up1-manager/capabilities.json:61-131`), no `report:*` sin prefijo.

| Capability | Descripcion |
|-----------|-------------|
| `mod/up1-manager/report:view` | Ver e interactuar con reportes pivot |
| `mod/up1-manager/report:create` | Crear configuraciones de reporte |
| `mod/up1-manager/report:edit` | Editar reportes existentes |
| `mod/up1-manager/report:delete` | Eliminar reportes |
| `mod/up1-manager/report:clone` | Duplicar reportes |
| `mod/up1-manager/report:export` | Exportar a Excel, PDF, CSV |
| `mod/up1-manager/report:configure_layout` | Configurar slice, opciones y formato |
| `mod/up1-manager/reporttemplate:view` | Ver templates |
| `mod/up1-manager/reporttemplate:create` | Crear templates |
| `mod/up1-manager/reporttemplate:edit` | Editar templates |
| `mod/up1-manager/reporttemplate:delete` | Eliminar templates |
| `mod/up1-manager/reporttestdata:view` | Ver registros de `ReportTestData` |
| `mod/up1-manager/reporttestdata:create` | Crear registros de `ReportTestData` |
| `mod/up1-manager/reporttestdata:edit` | Editar registros de `ReportTestData` |
| `mod/up1-manager/reporttestdata:delete` | Eliminar registros de `ReportTestData` |

### Enforcement en el servidor (UPONE-1376)

Las mutations de escritura llaman `checkCapability(context, [...])` **antes** de tocar la base de datos:

| Mutation | Capability verificada | Ubicacion |
|----------|------------------------|-----------|
| `createReport` | `mod/up1-manager/report:create` | `reportData.resolver.js:932` |
| `updateReport` | `mod/up1-manager/report:edit` | `reportData.resolver.js:1076` |
| `deleteReport` | `mod/up1-manager/report:delete` | `reportData.resolver.js:1400` |
| `duplicateReport` | `mod/up1-manager/report:clone` | `reportData.resolver.js:1427` |
| `createReportTemplate` | `mod/up1-manager/reporttemplate:create` | `reportTemplate.resolver.js:400` |
| `updateReportTemplate` | `mod/up1-manager/reporttemplate:edit` | `reportTemplate.resolver.js:478` |
| `deleteReportTemplate` | `mod/up1-manager/reporttemplate:delete` | `reportTemplate.resolver.js:595` |

Las queries de lectura (`listReports`, `getReportById`, `listReportTemplates`, etc.) **no** llaman `checkCapability`: se filtran por visibilidad del template (`visibleToRoles`/`isPublic`), ver seccion "Visibilidad de templates por rol".

### Autenticacion obligatoria en queries de lectura (UPONE-1412 / SEC-02)

Antes de este ticket, las queries de lectura de `reportBuilderQuery` y `reportTemplateQuery` no exigian sesion: cualquier request anonima podia leer reportes y templates si conocia el `tenantId`. Ahora cada resolver de lectura se envuelve con `requireAuth` (gate de **autenticacion**, no de autorizacion — no reemplaza `checkCapability`):

```javascript
// reportData.resolver.js:921 y reportTemplate.resolver.js:214
Object.entries(reportBuilderQueryRaw).map(([name, resolver]) => [name, requireAuth(resolver)])
```

Una request sin sesion valida a `listReports`, `getReportById`, `getReportByCode`, `listReportTemplates`, `getReportTemplateById` o `getReportTemplates` es rechazada antes de tocar Prisma. Los dashboards y selectores de template siguen funcionando para cualquier rol autenticado; la restriccion fina por rol la sigue dando `visibleToRoles`/`isPublic` (seccion anterior). Fuente: `services/auth/withAuth.js` (`requireAuth`).

### Logica de permisos en frontend

`useReportPermissions` combina configuracion del layout con capabilities del backend:

```
Si layoutConfig dice canCreate: false -> SIEMPRE denegar (hard override)
Si layoutConfig dice canCreate: true o no dice nada -> verificar capability "mod/up1-manager/report:create" del usuario
```

### Roles por defecto

| Recurso | Roles con acceso |
|---------|-----------------|
| Reportes | Admin, Consultor, Colaborador |
| Templates | Admin, Coordinador |

### Visibilidad de templates y reportes: fail-closed (MGR-10, ver RULE-platform-028)

**Drift corregido (2026-08-17)**: la version anterior de este doc describia `visibleToRoles` vacio como "sin restriccion adicional" (visible para todos). Eso ya no es asi. MGR-10 cambio el significado de `visibleToRoles: []`: antes significaba "visible a todos", ahora oculta el registro salvo que sea publico o el usuario sea el creador.

`ReportTemplate.visibleToRoles` controla que usuarios pueden ver y ejecutar un template cuando no es publico. Logica (`reportVisibility.js:30-56`, funcion `canViewTemplateForRoleNames`), en orden de precedencia:

```
isPublic: true            -> visible para todos (ignora visibleToRoles y owner)
owner (createdById)       -> el creador siempre ve lo suyo, sea cual sea visibleToRoles
visibleToRoles con roles  -> solo usuarios con alguno de esos roles (comparacion case-sensitive, hasSome sobre String[])
visibleToRoles vacio      -> SIN owner match y SIN isPublic -> NO visible (fail-closed)
```

**Report tambien tiene su propio `isPublic`/`visibleToRoles`** (`objects/Report.json`, mismo contrato, funcion `canViewTemplateForRoleNames` reutilizada sobre el propio `Report`). Un reporte se filtra por su propia visibilidad Y, si tiene `templateId`, tambien por la visibilidad del template asociado (`reportData.resolver.js:709-718`); los reportes ad-hoc sin `templateId` solo dependen de su propia visibilidad.

Esta visibilidad filtra `getReportTemplates`/`listReportTemplates`/`getReportTemplateById`, y `getReports`/`listReports`/`getReportById`. `sanitizeVisibleToRoles` normaliza la entrada (trim + dedupe); su comentario en el codigo recuerda mantenerla sincronizada con el mirror en `object-manager/src/graphql/resolvers/instance.resolver.js`.

**Por que exigio backfill**: el cambio de semantica es retroactivo sobre datos existentes. Una fila creada antes del cambio con `isPublic: false` y `visibleToRoles: []` era visible para todos bajo la regla vieja; bajo la regla nueva pasa a ser privada de su creador, lo que la oculta de golpe para el resto de usuarios que la veian. `seed/backfill-implicit-public-visibility.js` corrige esto: fija `isPublic: true` en toda fila de `Report`/`ReportTemplate` con `isPublic: false`, `visibleToRoles: []` y `createdAt` anterior al corte (`2026-08-13T00:00:00.000Z`), preservando la visibilidad que esas filas realmente tenian. Filas creadas despues del corte no se tocan: ahi la privacidad ya es intencional (el switch del formulario esta apagado a proposito). El script es idempotente y se puede borrar una vez que todos los ambientes esten desplegados mas alla del corte.

---

## 11. Traducciones

### Archivos (9 total)

```
lang/
├── es_CL.json                   ← Base espanol
├── es_CL@Report.json            ← Campos de Report
├── es_CL@ReportTemplate.json    ← Campos de ReportTemplate
├── en_CL.json                   ← Base ingles
├── en_CL@Report.json
├── en_CL@ReportTemplate.json
├── pt_BR.json                   ← Base portugues
├── pt_BR@Report.json
└── pt_BR@ReportTemplate.json
```

### Namespace `rb.*`

Todas las traducciones del Report Builder usan prefijo `rb.` para evitar colisiones:

```json
{
  "rb": {
    "common": { "edit": "Editar", "save": "Guardar", "cancel": "Cancelar", "delete": "Eliminar" },
    "loading": { "report": "Cargando informe...", "flexmonster": "Cargando Flexmonster..." },
    "list": { "dashboard": "Dashboard", "listView": "Lista", "searchPlaceholder": "Buscar reportes..." },
    "filters": { "createdBy": "Creado por", "last7Days": "Ultimos 7 dias" },
    "form": { "reportName": "Nombre del Reporte", "selectTemplate": "Seleccionar Plantilla" },
    "wizard": { "basicInfoTitle": "Informacion Basica", "templateTitle": "Plantilla" },
    "actions": { "createReport": "Crear Reporte", "editReport": "Editar Reporte" },
    "deleteConfirm": { "title": "Eliminar Reporte", "message": "Esta accion no se puede deshacer." },
    "validation": { "templateInUseTitle": "Plantilla en uso por {count} reportes" },
    "viewer": { "noDataTitle": "Sin datos disponibles" }
  }
}
```

### Fallback i18n

`useTranslations` intenta usar `vue-i18n` de Suite. Si no esta disponible (Storybook), carga `en_CL.json` como fallback directo.

---

## 12. Seed data y templates predefinidos

### Setup

```bash
node scripts/seed-report-builder-layouts.js
```

### Que incluye el seed

| Archivo | Que crea |
|---------|----------|
| `seed/categories.js` | 4 filas de `ReportCategory` (objeto real, no tabla legacy): RPT_ACADEMIC, RPT_FINANCIAL, RPT_OPERATIONAL, RPT_CUSTOM, cada una con `code` unico |
| `seed/report-templates.js` | 13 templates predefinidos con queries GraphQL |
| `seed/sample-reports.js` | Reportes de ejemplo usando los templates |
| `seed/report-test-data.js` | Datos de prueba (estudiantes universitarios chilenos) |

### Objeto ReportTestData

Objeto de datos de prueba que simula registros de estudiantes para demos:

**Campos principales**: studentName, email, program, department, semester, cohortYear, enrollmentStatus, gpa, retentionStatus, riskScore, attendanceRate, financialAidType (GRATUIDAD, BECA_BICENTENARIO...), socioeconomicQuintile, healthInsurance (FONASA_A/B/C/D, ISAPRE), region, commune, zone (URBANO/RURAL), modality, campus, dropoutCause, paymentStatus

### Reportes de ejemplo

| Reporte | Archivo | Pivot |
|---------|---------|-------|
| Enrollment Overview | `reports/enrollment-overview.json` | rows: program+level, columns: term, values: studentCount(sum)+newStudents(sum) |
| Retention Dashboard | `reports/retention-dashboard.json` | rows: cohort+program, columns: riskLevel, values: retentionRate(avg)+studentCount(sum)+wellbeingScore(avg) |

---

## 13. Integracion con mods

### Como un mod puede usar el Report Builder

Un mod no necesita crear su propio sistema de reportes. Puede:

1. **Crear templates** que apunten a objetos del mod via la UI o API:
   ```graphql
   mutation {
     createReportTemplate(tenantId: "UPU", input: {
       name: "Disponibilidad de Facilitadores"
       query: "query { timeBlockAssignments(startDate: \"2026-01-01\") { id status startDate endDate } }"
       dataSourceObject: "TimeBlockAssignment"
       categoryId: "clx_reportcategory_operational_id"
       isPublic: true
     }) { id }
   }
   ```

   Igual que en la seccion 6, `categoryId` es el `id` real de un `ReportCategory` (no su `code`); y `dataSourceObject` es obligatorio.

2. **Crear templates via seed** del mod (en `seed/report-templates.js`) con queries a sus propios objetos.

3. **Usar queries genericas**: `listInstances(objectName: "MiObjeto")` funciona para cualquier objeto del sistema.

### Objetos de mod como fuente de datos

Cualquier objeto sincronizado al Object Manager (de un mod o core) esta disponible como fuente de datos para reportes. El template solo necesita una query GraphQL que apunte al objeto:

```graphql
# Template que usa un objeto de retention-wellbeing
query {
  listInstances(
    objectName: "TimeBlockAssignment"
    filters: [{ field: "status", operator: "EQUALS", value: "available" }]
    limit: 5000
  ) {
    instances
    totalCount
  }
}
```

### Custom resolvers como fuente de datos

Si el mod tiene resolvers custom, el template puede usar esas queries:

```graphql
# Template que usa resolver custom de retention-wellbeing
query {
  facilitatorsByCenter(centerId: "center-001") {
    id
    name
    availability { startTime endTime status }
  }
}
```

---

## 14. Comandos y setup

### Setup inicial

```bash
# Desde raiz del monorepo
npm run sync                                          # Sincroniza artefactos
npm run codegen --workspace=@uplanner/object-management-backend  # Genera schema
npm run tenant:migrate --workspace=@uplanner/object-management-backend  # Migra BD

# Seed de categorias, templates y datos de prueba
cd report-builder
node scripts/seed-report-builder-layouts.js
```

### Variables de entorno

| Variable | Descripcion |
|----------|-------------|
| `VITE_GRAPHQL_ENDPOINT` | URL del Object Manager (default: `http://localhost:4000/graphql`) |
| `VITE_FLEXMONSTER_LICENSE` | Licencia de Flexmonster (opcional en desarrollo) |

### Desarrollo

```bash
npm run dev --workspace=@uplanner/suite          # Frontend con Report Builder
npm run dev --workspace=@uplanner/object-management-backend  # Backend
npm run storybook --workspace=@uplanner/layout-engine  # Storybook con componentes
```

### URL de acceso

```
http://localhost:3000/{TENANT}/reports
```

Ejemplo: `http://localhost:3000/UPU/reports`

---

## 15. Funcionalidades declarativas avanzadas

### KPI cell declarativa (UPONE-1168)

Entidad 1:1 con `Report`: `ReportKpiCell` (`report-builder/objects/ReportKpiCell.json`). Cuando esta seteada, el widget del reporte renderiza un valor prominente en vez del pivot completo, con un toggle in-widget para volver a la vista de pivot. `null` en un reporte significa widget estandar (comportamiento por defecto de todos los reportes legacy).

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `cellType` | String | `grandTotal` (total general del measure) o `subtotal` (subtotal en una celda row/column especifica) |
| `measure` | String | Nombre del campo en `ReportPivot.values` del que se lee el numero |
| `row` / `column` | String (opcional) | Etiqueta de fila/columna tal como Flexmonster la renderiza (solo aplica si `cellType` es `subtotal`) |
| `label` | String (opcional) | Override del label humano |
| `format` | String (opcional) | `number` \| `percent` \| `currency` \| `decimal` |
| `abbreviated` | Boolean (default: false) | Notacion compacta ("19M", "1.2K"); combina con `format` (ej. moneda + abreviado -> "$19M") |

Input GraphQL `kpiCell` en `CreateReportInput`/`UpdateReportInput` (`reportData.schema.graphql:196-204,246-247,269`). UI en `ReportFormManagerElement.vue:191-352`.

**Por que existe un resolver propio para esto**: `ReportKpiCell` se resuelve con el helper `toKpiCellGraphQL` del propio mod (`reportData.resolver.js:368`, invocado en cada punto donde se devuelve un `Report`), en vez de dejarlo al CRUD generico de objetos. La razon es de modelado, no de cuota: `ReportKpiCell` es 1:1 con `Report` y necesita transformarse a la forma que espera el widget (numero destacado vs pivot completo), algo que el CRUD generico de instancias no resuelve por si solo.

**Dato ausente, registrado explicitamente**: la revision de codigo de esta ventana **no encontro limites de capacidad reales** en el Report Builder, ni cuota de reportes/templates por tenant ni validacion de licencia de Flexmonster en el codigo del workspace `report-builder`. Esto contradice un supuesto que circula en el equipo (que ciertas metricas "escapan a las capacidades" del Report Builder). Lo unico verificado es la distincion de arriba: el limite es del **CRUD generico** (no modela una metrica como celda KPI), no una cuota impuesta por el Report Builder. Si existe algun limite real de licencia o de cuota, no esta en este workspace ni fue encontrado en esta revision.

### Env-filters cross-object (UPONE-1166/1387/1384)

`ReportTemplate.environmentFilters` (String[]) declara que campos del template aceptan valores que llegan como parametros de URL del dashboard.

- **UPONE-1387**: acepta entradas "dotted" (por ejemplo `"instructor.name"`) siempre que la query del template declare ese objeto en su argumento `relations`.
- **Validacion en dos capas**:
  - Template: `validateEnvironmentFilters` (`reportTemplate.resolver.js:287-357`) valida entradas simples contra los campos proyectados por la query o del objeto, y entradas dotted contra las `relations` declaradas.
  - Reporte: `validateEnvironmentFiltersAgainstReport` (`reportData.resolver.js:795-834`, UPONE-1384) valida que `dataSourceFields` del reporte proyecte todos los env-filters declarados por su template.
- **Runtime**: el viewer no tiene una rama especial para dotted paths, `flattenForDisplay` (`ReportViewerManagerElement.vue:230-236,690-712`) ya convierte los objetos anidados en claves con punto, por lo que un env-filter dotted encaja con el mismo dato aplanado que usa el pivot.

### ReportCategory (UPONE-1224/1374)

Objeto propio (`object-manager/objects/business/Base/reportcategory.json`) que reemplaza el legacy modelo `Category` con `scopeType` (retirado; la categoria ya esta acotada al dominio de reportes, no necesita un discriminador de scope).

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `name` | String | Nombre de la categoria |
| `code` | String (unico) | Codigo legible en mayusculas (ej. `RPT_ACADEMIC`) |
| `description` | String (opcional) | Descripcion |
| `isActive` | Boolean (default: true) | Soft-delete: se desactiva sin romper Reports/ReportTemplates que la referencian |

`Report.categoryId` y `ReportTemplate.categoryId` son FKs reales a `ReportCategory.id` (no al `code`). El servidor valida la existencia del id (`validateCategoryIdExists`) y resuelve en batch cuid -> nombre para mostrar (`resolveCategoryNames`, `reportData.resolver.js:836-863`).

### `code` como identificador externo (UPONE-1168/1225)

`Report.code` y `ReportTemplate.code` son strings unicos (convencion UPPER-KEBAB, prefijo `RPT-`) pensados para referencias externas estables: configuracion de widgets de dashboard, deep links, exports.

- Query `getReportByCode(code, tenantId)` (`reportData.schema.graphql:305-309`) resuelve un reporte por su code en vez de su id.
- `duplicateReport` **no** copia el `code` del original (`reportData.resolver.js:1406-1408`): cada reporte duplicado queda sin code hasta que se le asigne uno propio.
- Una violacion de unicidad (P2002) se traduce a un error amigable en vez de propagar el error crudo de Prisma.

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-04-10 | Documento inicial: guia completa del Report Builder basada en codigo fuente, componentes, resolvers, schemas y seeds |
| 2026-07-16 | Actualizacion profunda tras ~7 tickets de refactor (UPONE-1166/1168/1223/1224/1225/1279/1286/1374/1376/1377/1384/1387): eliminacion de `ext__uplanner__report`, migracion de arrays a `String[]` nativos, FK real a `ReportCategory`, delegacion de vistas y capabilities a `up1-manager`, enforcement RBAC real en el servidor, `code` como identificador externo, KPI cell declarativa, env-filters cross-object y visibilidad de templates por rol |
| 2026-08-03 | Verificado contra codigo (UPONE-1412/SEC-02): se agrega gate de autenticacion `requireAuth` en todas las queries de lectura de `reportBuilderQuery`/`reportTemplateQuery` (seccion 10); se corrigen line refs de `checkCapability` en las 7 mutations tras drift de linea; se agrega UPONE-1375 a la lista de tickets del frontmatter (ya referenciado en el cuerpo del doc, faltaba en sources) |
| 2026-08-17 | Delta MGR-10, verificado contra codigo: corregido drift en la seccion "Visibilidad de templates por rol" (`visibleToRoles` vacio ahora oculta en vez de mostrar a todos, fail-closed) y extendida a `Report` (que ahora tiene su propio `isPublic`/`visibleToRoles`); documentado el backfill de datos existentes (`seed/backfill-implicit-public-visibility.js`) que exigio el cambio de semantica; documentada la distincion entre "el CRUD generico no modela `ReportKpiCell`" (por eso el resolver propio del mod) y "cuota o limite de licencia" (no encontrado en el codigo, dato ausente); confirmado que el fix del filtro "Created By Me" (comparaba el inexistente `r.createdBy` en vez de `createdById`/`createdByUser`) ya esta en `useReportDashboard.ts` |
