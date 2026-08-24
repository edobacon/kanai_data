---
id: SPEC-features-002
project: up1
type: spec
module: features
category: features
tags: [up1, report-builder, programatico, api, graphql, reportes, templates, flexmonster, pivot, filtros, seed, automatizacion, kpi, rbac, environment-filters, code, up1-manager]
fecha: 2026-08-03
ticket: UPONE-1412
sources:
  - report-builder/logic/reportData.schema.graphql (schema completo)
  - report-builder/logic/reportTemplate.schema.graphql (schema completo)
  - report-builder/logic/reportData.resolver.js (resolver completo)
  - report-builder/logic/reportTemplate.resolver.js (resolver completo)
  - services/auth/authChecker.js (checkCapability en las 7 mutations)
  - services/auth/withAuth.js (requireAuth en las queries de lectura, UPONE-1412)
  - report-builder/seed/ (categories, report-templates, sample-reports)
  - report-builder/scripts/ (seed-report-builder-layouts, create-report-template-layout)
---
# Gestion programatica de reportes en uP1

Guia para crear, modificar, consultar y eliminar reportes y templates via API GraphQL, sin usar la interfaz grafica.

## Indice

1. [Resumen de operaciones](#1-resumen-de-operaciones)
2. [Input types: estructura de datos](#2-input-types-estructura-de-datos)
3. [Templates: CRUD programatico](#3-templates-crud-programatico)
4. [Reportes: CRUD programatico](#4-reportes-crud-programatico)
5. [Consultas: queries disponibles](#5-consultas-queries-disponibles)
6. [Filtros y paginacion](#6-filtros-y-paginacion)
7. [Duplicar reportes](#7-duplicar-reportes)
8. [Comportamiento de update en sub-entidades](#8-comportamiento-de-update-en-sub-entidades)
9. [Seed: creacion masiva](#9-seed-creacion-masiva)
10. [Flujo completo: de template a reporte con datos](#10-flujo-completo-de-template-a-reporte-con-datos)
11. [Restricciones y errores](#11-restricciones-y-errores)
12. [KPI cell: celdas de indicador](#12-kpi-cell-celdas-de-indicador)
13. [Environment filters cross-object](#13-environment-filters-cross-object)
14. [RBAC en mutations](#14-rbac-en-mutations)
15. [code: identificador externo](#15-code-identificador-externo)
16. [Delegacion a up1-manager](#16-delegacion-a-up1-manager)

---

## 1. Resumen de operaciones

| Operacion | Mutation/Query | Descripcion |
|-----------|---------------|-------------|
| Crear template | `createReportTemplate` | Define query GraphQL reutilizable |
| Listar templates | `listReportTemplates` | Con filtros y paginacion |
| Obtener template | `getReportTemplateById` | Por ID |
| Actualizar template | `updateReportTemplate` | Parcial |
| Eliminar template | `deleteReportTemplate` | Protegido si hay reportes asociados |
| Crear reporte | `createReport` | Con filtros, pivot, visualizacion |
| Listar reportes | `listReports` | Con filtros server-side y paginacion |
| Obtener reporte | `getReportById` | Con todas las relaciones |
| Obtener reporte por code | `getReportByCode` | Por `code` estable (id externo) |
| Actualizar reporte | `updateReport` | Parcial, upsert en sub-entidades |
| Eliminar reporte | `deleteReport` | Silencioso si no existe |
| Duplicar reporte | `duplicateReport` | Clona con " (Copy)" en nombre |

Todas las mutations y queries requieren header `X-Tenant-ID`.

Las 7 mutations (`createReport`, `updateReport`, `deleteReport`, `duplicateReport`, `createReportTemplate`, `updateReportTemplate`, `deleteReportTemplate`) exigen ademas una capability RBAC del namespace `mod/up1-manager/*` (ver seccion 14). Las queries de lectura no llevan `checkCapability`.

---

## 2. Input types: estructura de datos

### CreateReportInput

```graphql
input CreateReportInput {
  name: String!                        # Nombre del reporte
  code: String                         # Id externo estable (UPPER-KEBAB, prefijo RPT-). Unico
  category: String                     # Existe en el input pero el resolver lo IGNORA (ver nota)
  categoryId: String                   # ID real de ReportCategory (NO el code de la categoria)
  description: String                  # Descripcion
  templateId: String                   # FK al template que define la query
  contextId: String                    # Contexto (institucion, etc.)
  dataSourceObject: String             # Nombre del objeto fuente (ej: "Person")
  dataSourceFields: [String!]          # Array nativo de campos seleccionados
  filters: [ReportFilterInput!]        # Filtros del reporte
  sorting: ReportSortingInput          # Ordenamiento
  visualization: ReportVisualizationInput  # Tipo de grafico
  pivot: ReportPivotInput              # Configuracion de pivot
  kpiCell: ReportKpiCellInput          # Celda de indicador opcional (ver seccion 12)
}
```

> **`category` vs `categoryId`**: el campo `category` sigue declarado en el input por compatibilidad, pero `createReport`/`updateReport` NO lo leen: solo consumen `categoryId`. El `category` que ves en la salida se deriva server-side desde `categoryId` (`resolveCategoryNames`, reportData.resolver.js:849). Usa siempre `categoryId` con el **id real** de una `ReportCategory` existente, no su `code`.

> **`dataSourceFields` es `[String!]` nativo** (reportData.schema.graphql:241,263). Ya no se envia como JSON string. Desde UPONE-1377 no hay `JSON.stringify`/`JSON.parse` en el borde.

> **`environmentFilters` NO va en este input**: en `Report` es `[String!]!` de solo lectura, derivado del template (ver seccion 13). Se declara al crear/actualizar el **template**, no el reporte.

### UpdateReportInput

```graphql
input UpdateReportInput {
  id: ID!                              # ID del reporte a actualizar
  name: String                         # Todos los campos son opcionales
  code: String                         # Id externo estable. Unico
  category: String                     # Declarado pero IGNORADO por el resolver (usar categoryId)
  categoryId: String                   # ID real de ReportCategory
  description: String
  templateId: String                   # null = desconectar template
  dataSourceObject: String
  dataSourceFields: [String!]          # Array nativo de campos
  filters: [ReportFilterInput!]        # Reemplaza TODOS los filtros
  sorting: ReportSortingInput          # null = eliminar sorting
  visualization: ReportVisualizationInput
  pivot: ReportPivotInput              # null = eliminar pivot
  kpiCell: ReportKpiCellInput          # objeto = setear; null = eliminar (ver seccion 12)
}
```

### Sub-entidades

```graphql
input ReportFilterInput {
  field: String!                       # Nombre del campo (ej: "enrollmentStatus")
  operator: String!                    # Operador (EQUALS, CONTAINS, GREATER_THAN, etc.)
  value: String!                       # Valor (como string siempre)
}

input ReportSortingInput {
  field: String!                       # Campo para ordenar
  order: String!                       # "ASC" o "DESC"
}

input ReportVisualizationInput {
  chartType: String!                   # Tipo de grafico (ver tabla abajo)
  conditions: JSON                     # Formato condicional (scalar JSON, NO string serializado)
}

input ReportPivotInput {
  rows: [String!]                      # Campos en filas
  columns: [String!]                   # Campos en columnas
  values: [ReportPivotMeasureInput!]   # Medidas (campo + agregacion)
}

input ReportPivotMeasureInput {
  field: String!                       # Campo a agregar (ej: "gpa")
  aggregation: String!                 # Agregacion (count, sum, average, min, max)
}

input ReportKpiCellInput {             # Celda de indicador. Ver seccion 12
  cellType: String!                    # "grandTotal" o "subtotal"
  measure: String!                     # Campo de pivot.values del que lee
  row: String                          # Etiqueta de fila (solo cellType="subtotal")
  column: String                       # Etiqueta de columna (solo cellType="subtotal")
  label: String                        # Override de etiqueta humana
  format: String                       # "number" | "percent" | "currency" | "decimal"
  abbreviated: Boolean                 # Notacion compacta (19M, 1.2K)
}
```

### Formato de pivot.values

`values` es un array de objetos `{ field, aggregation }` (NO el string `"campo:agregacion"` separado por coma, formato obsoleto anterior a UPONE-1377).

```graphql
values: [
  { field: "gpa", aggregation: "average" }
  { field: "studentName", aggregation: "count" }
  { field: "budget", aggregation: "sum" }
]
```

Agregaciones soportadas: `count`, `sum`, `average`, `min`, `max`.

### Tipos de grafico (chartType)

| Valor | Descripcion |
|-------|-------------|
| `table` o `pivot` | Tabla pivot clasica |
| `bar` | Barras horizontales |
| `column` | Barras verticales |
| `line` | Linea |
| `pie` | Torta |
| `area` | Area |
| `scatter` | Dispersion |
| `stacked_column` | Barras apiladas |
| `column_line` | Columna + linea combinado |

### CreateReportTemplateInput

```graphql
input CreateReportTemplateInput {
  name: String!                        # Nombre unico
  code: String                         # Id externo estable, unico. Opcional en create
  description: String                  # Descripcion
  categoryId: String                   # ID real de ReportCategory
  query: String!                       # Query GraphQL completa
  dataSourceObject: String!            # OBLIGATORIO: objeto fuente del template
  environmentFilters: [String!]        # Campos que aceptan valores desde params (ver seccion 13)
  visibleToRoles: [String!]            # Roles con acceso cuando no es publico
  isPublic: Boolean                    # Visible para todos (default: true)
  contextId: String                    # Contexto opcional
  tags: String                         # Tags separados por coma
}
```

`dataSourceObject` es `String!` (obligatorio). Si falta, el resolver lanza `dataSourceObject is required...` antes de escribir (reportTemplate.resolver.js:399-402).

### UpdateReportTemplateInput

```graphql
input UpdateReportTemplateInput {
  name: String
  code: String                         # Omitir para no cambiar
  description: String
  categoryId: String
  query: String
  dataSourceObject: String             # Omitir para no cambiar; el resolver rechaza string vacio
  environmentFilters: [String!]        # Reemplaza la lista; array vacio = limpiar
  visibleToRoles: [String!]
  tags: String
  isPublic: Boolean
}
```

---

## 3. Templates: CRUD programatico

### Crear template

> **Dos requisitos hoy**: (1) `dataSourceObject` es obligatorio, sin el la mutation falla con `dataSourceObject is required...`. (2) `categoryId` debe ser el **id real** de una `ReportCategory` existente, no su `code`. Pasar el code (ej. `"RPT_ACADEMIC"`) produce `Invalid categoryId...` (reportTemplate.resolver.js:371-383). Resuelve el id con `getReportTemplates`/una query a `ReportCategory` antes de crear, o via seed (ver seccion 9).

```graphql
mutation {
  createReportTemplate(
    tenantId: "UPU"
    input: {
      name: "Panorama de Matricula"
      description: "Vista general de matricula estudiantil con metricas clave"
      categoryId: "clx_reportcategory_academic_id"   # id real de ReportCategory, no "RPT_ACADEMIC"
      dataSourceObject: "Person"                       # OBLIGATORIO
      query: """
        query {
          listInstances(
            objectName: "Person"
            filters: [{ field: "isActive", operator: "EQUALS", value: "true" }]
            limit: 5000
          ) {
            instances
            totalCount
          }
        }
      """
      isPublic: true
      tags: "matricula,enrollment,academico"
    }
  ) {
    id
    name
    description
    query
    isPublic
    createdAt
  }
}
```

### Template con query a objeto de mod

```graphql
mutation {
  createReportTemplate(
    tenantId: "UPU"
    input: {
      name: "Disponibilidad de Facilitadores"
      description: "Bloques horarios de facilitadores por centro de apoyo"
      categoryId: "clx_reportcategory_operational_id"   # id real de ReportCategory
      dataSourceObject: "TimeBlockAssignment"           # OBLIGATORIO
      query: """
        query {
          listInstances(
            objectName: "TimeBlockAssignment"
            filters: [{ field: "status", operator: "EQUALS", value: "available" }]
            limit: 10000
          ) {
            instances
            totalCount
          }
        }
      """
      isPublic: true
      tags: "engagement,facilitadores,disponibilidad"
    }
  ) {
    id
    name
  }
}
```

### Template con query a resolver custom

```graphql
mutation {
  createReportTemplate(
    tenantId: "UPU"
    input: {
      name: "Facilitadores por Centro"
      categoryId: "clx_reportcategory_operational_id"   # id real de ReportCategory
      dataSourceObject: "Instructor"                    # OBLIGATORIO
      query: """
        query {
          facilitatorsByCenter(centerId: "all") {
            id
            name
            email
            availability { startTime endTime status }
          }
        }
      """
      isPublic: false
      tags: "engagement,centros"
    }
  ) {
    id
  }
}
```

### Actualizar template

```graphql
mutation {
  updateReportTemplate(
    tenantId: "UPU"
    id: "clx_template_id"
    input: {
      description: "Descripcion actualizada"
      tags: "matricula,enrollment,academico,retencion"
      isPublic: false
    }
  ) {
    id
    name
    description
    tags
  }
}
```

### Eliminar template

```graphql
mutation {
  deleteReportTemplate(tenantId: "UPU", id: "clx_template_id")
}
```

Si hay reportes usando este template, retorna error:

```
Error: TEMPLATE_IN_USE:3:Reporte A, Reporte B, Reporte C
```

---

## 4. Reportes: CRUD programatico

### Crear reporte basico

```graphql
mutation {
  createReport(
    tenantId: "UPU"
    input: {
      name: "Matricula 2026-1"
      categoryId: "RPT_ACADEMIC"
      description: "Analisis de matricula primer semestre 2026"
      templateId: "clx_template_id"
      visualization: { chartType: "table" }
    }
  ) {
    id
    name
    createdAt
  }
}
```

Si no se pasa `visualization`, se crea automaticamente con `chartType: "table"`.

### Crear reporte completo (con filtros, pivot, grafico)

```graphql
mutation {
  createReport(
    tenantId: "UPU"
    input: {
      name: "Retencion por Carrera 2026"
      categoryId: "RPT_ACADEMIC"
      description: "Dashboard de retencion con riesgo por programa"
      templateId: "clx_template_id"
      dataSourceObject: "ReportTestData"
      dataSourceFields: ["studentName", "program", "gpa", "retentionStatus", "riskScore"]
      filters: [
        { field: "cohortYear", operator: "EQUALS", value: "2026" }
        { field: "enrollmentStatus", operator: "EQUALS", value: "ACTIVE" }
      ]
      sorting: { field: "gpa", order: "DESC" }
      visualization: { chartType: "column" }
      pivot: {
        rows: ["program", "department"]
        columns: ["retentionStatus"]
        values: [
          { field: "gpa", aggregation: "average" }
          { field: "studentName", aggregation: "count" }
          { field: "riskScore", aggregation: "average" }
        ]
      }
    }
  ) {
    id
    name
    filters { field operator value }
    sorting { field order }
    visualization { chartType }
    pivot { rows columns values { field aggregation } }
  }
}
```

### Crear reporte con celda KPI

`kpiCell` declara un indicador destacado sobre una medida del pivot (ver seccion 12 para el detalle).

```graphql
mutation {
  createReport(
    tenantId: "UPU"
    input: {
      name: "Tasa de Retencion (KPI)"
      templateId: "clx_template_id"
      pivot: {
        rows: ["program"]
        values: [{ field: "retentionRate", aggregation: "average" }]
      }
      kpiCell: {
        cellType: "grandTotal"
        measure: "retentionRate"
        label: "Retencion global"
        format: "percent"
        abbreviated: false
      }
    }
  ) {
    id
    kpiCell { cellType measure label format abbreviated }
  }
}
```

### Crear reporte con formato condicional

```graphql
mutation {
  createReport(
    tenantId: "UPU"
    input: {
      name: "GPA con Alertas"
      templateId: "clx_template_id"
      visualization: {
        chartType: "table"
        conditions: [
          { formula: "#value < 4.0", measure: "gpa", format: { backgroundColor: "#FECACA", color: "#991B1B" } }
          { formula: "#value >= 6.0", measure: "gpa", format: { backgroundColor: "#D1FAE5", color: "#065F46" } }
        ]
      }
      pivot: {
        rows: ["studentName", "program"]
        values: [{ field: "gpa", aggregation: "average" }]
      }
    }
  ) {
    id
  }
}
```

`conditions` es el scalar `JSON` (reportData.schema.graphql:170-173): se envia como valor JSON nativo, no como string serializado.

### Actualizar reporte (parcial)

```graphql
# Solo cambiar nombre y agregar filtro
mutation {
  updateReport(
    tenantId: "UPU"
    input: {
      id: "clx_report_id"
      name: "Retencion 2026 (Actualizado)"
      filters: [
        { field: "cohortYear", operator: "EQUALS", value: "2026" }
        { field: "riskScore", operator: "GREATER_THAN", value: "70" }
      ]
    }
  ) {
    id
    name
    filters { field operator value }
  }
}
```

### Cambiar tipo de grafico

```graphql
mutation {
  updateReport(
    tenantId: "UPU"
    input: {
      id: "clx_report_id"
      visualization: { chartType: "pie" }
    }
  ) {
    id
    visualization { chartType }
  }
}
```

### Cambiar configuracion de pivot

```graphql
mutation {
  updateReport(
    tenantId: "UPU"
    input: {
      id: "clx_report_id"
      pivot: {
        rows: ["department"]
        columns: ["semester"]
        values: [
          { field: "gpa", aggregation: "average" }
          { field: "attendanceRate", aggregation: "average" }
        ]
      }
    }
  ) {
    id
    pivot { rows columns values { field aggregation } }
  }
}
```

### Desconectar template y eliminar pivot

```graphql
mutation {
  updateReport(
    tenantId: "UPU"
    input: {
      id: "clx_report_id"
      templateId: null
      pivot: null
    }
  ) {
    id
  }
}
```

### Eliminar reporte

```graphql
mutation {
  deleteReport(tenantId: "UPU", id: "clx_report_id")
}
```

Retorna `true`. Si el reporte no existe, retorna `false` (sin excepcion).

---

## 5. Consultas: queries disponibles

### Listar reportes con paginacion

```graphql
query {
  listReports(
    tenantId: "UPU"
    limit: 20
    offset: 0
    sort: { field: "updatedAt", order: "DESC" }
  ) {
    items {
      id
      code
      name
      categoryId
      description
      createdById
      updatedAt
      templateId
    }
    totalCount
  }
}
```

`listReports` retorna `ReportListResponse`, que solo expone `items` y `totalCount` (reportData.schema.graphql:59-62). No existe `reports` (el campo es `items`), ni `hasMore`, ni `createdBy` (en `Report` el autor es `createdById: Int`).

### Obtener reporte completo por ID

```graphql
query {
  getReportById(id: "clx_report_id", tenantId: "UPU") {
    id
    code
    name
    categoryId
    description
    templateId
    dataSourceObject
    dataSourceFields
    environmentFilters
    createdById
    updatedById
    createdAt
    updatedAt
    filters { id field operator value }
    sorting { field order }
    visualization { chartType conditions }
    pivot { rows columns values { field aggregation } }
    kpiCell { cellType measure row column label format abbreviated }
  }
}
```

### Listar templates

```graphql
query {
  listReportTemplates(
    tenantId: "UPU"
    limit: 50
    offset: 0
    filters: { category: "RPT_ACADEMIC" }
  ) {
    items {
      id
      code
      name
      description
      query
      dataSourceObject
      environmentFilters
      visibleToRoles
      isPublic
      tags
      categoryId
      createdBy
      createdAt
    }
    totalCount
  }
}
```

`listReportTemplates` retorna `TemplateListResponse`, que solo expone `items` y `totalCount` (reportTemplate.schema.graphql:123-126). No hay `templates` (es `items`) ni `hasMore`. En el tipo `ReportTemplate` de salida `createdBy` si existe (String), a diferencia de `Report`.

---

## 6. Filtros y paginacion

### Filtros de listReports (ReportQueryFilters)

El input de filtros de `listReports` usa `createdById`/`updatedById` (Int), no `createdBy`/`updatedBy`. El resolver acepta un id numerico, un nombre o un email y lo normaliza a id internamente (`resolveUserIdFromFilter`, reportData.resolver.js:314-346; se aplica en :549-554).

```graphql
query {
  listReports(
    tenantId: "UPU"
    limit: 10
    offset: 0
    filters: {
      searchQuery: "retencion"            # Busca en name, description, category
      category: "RPT_ACADEMIC"            # Match exacto
      createdById: 42                     # Int. El resolver tambien acepta nombre/email y lo normaliza
      updatedAfter: "2026-01-01"          # ISO date
      updatedBefore: "2026-06-30"
    }
    sort: { field: "name", order: "ASC" }
  ) {
    items { id name }
    totalCount
  }
}
```

### Filtros de listReportTemplates: inconsistencia real

El input `TemplateQueryFilters` declara `createdBy`/`updatedBy` (String) (reportTemplate.schema.graphql:131-140), pero el resolver lee `filters.createdById`/`filters.updatedById` (reportTemplate.resolver.js:131-136). Como esos campos no existen en el input, **el filtro por autor de templates nunca se aplica en la practica**. No lo describas como funcional; usa `searchQuery`, `category` o los rangos de fecha para acotar templates.

### Sorting

Todos los campos ordenables viven en el modelo base `Report`; el sort opera directo sobre esas columnas (reportData.resolver.js:568-571). No hay redireccion a una tabla `ext__uplanner__report` (esa tabla no existe).

---

## 7. Duplicar reportes

```graphql
mutation {
  duplicateReport(tenantId: "UPU", reportId: "clx_report_id") {
    id
    code
    name
    templateId
    filters { field operator value }
    pivot { rows columns values { field aggregation } }
    kpiCell { cellType measure format }
  }
}
```

**Que clona** (reportData.resolver.js, bloque `duplicateReport`):
- Nombre con sufijo " (Copy)"
- `templateId`
- `name`, `categoryId`, `description`, `dataSourceObject`, `dataSourceFields` (ya son campos base del modelo `Report`, no de una extension)
- Todos los `ReportFilter`
- `ReportSorting`
- `ReportVisualization`
- `ReportPivot`
- `ReportKpiCell` (se clona verbatim)

**No clona**:
- `code`: se fuerza a `null` en la copia. El code es un id externo unico, la copia queda sin el hasta que le asignes uno.
- `contextId`: **no** se copia al payload del clon (verificado 2026-07-20; `contextId` solo se setea en `createReport`/`updateReport`, no en `duplicateReport`). La copia queda sin contexto: puede ser bug latente o intencional (ver follow-ups de codigo).

**`createdById`** se establece al usuario actual (no al del original).

---

## 8. Comportamiento de update en sub-entidades

| Sub-entidad | Comportamiento al actualizar |
|------------|------------------------------|
| `filters` | **Destruye y recrea**: elimina TODOS los filtros existentes, crea los nuevos. No hace merge |
| `sorting` | **Upsert**: crea si no existe, actualiza si existe. `null` = eliminar |
| `visualization` | **Upsert**: crea si no existe, actualiza si existe |
| `pivot` | **Upsert**: crea si no existe, actualiza si existe. `null` = eliminar |
| `kpiCell` | **Upsert**: crea si no existe, actualiza si existe. `null` = eliminar (reportData.resolver.js:1179-1216) |
| `templateId` | String = conectar a template. `null` = desconectar |

**Implicacion**: si quieres agregar un filtro sin perder los existentes, primero obtener los filtros actuales con `getReportById`, combinar, y enviar el array completo.

---

## 9. Seed: creacion masiva

### Via scripts de seed

El mecanismo para crear reportes y templates en batch es via los scripts de seed del workspace:

```bash
# Ejecutar seed completo (categorias + templates + reportes de ejemplo + datos de prueba)
npm run seed --workspace=@uplanner/object-management-backend
```

Los seeds se ejecutan en orden:
1. `seed/categories.js`: crea categorias (RPT_ACADEMIC, RPT_FINANCIAL, etc.)
2. `seed/report-templates.js`: crea 13 templates con queries GraphQL
3. `seed/sample-reports.js`: crea reportes de ejemplo referenciando los templates
4. `seed/report-test-data.js`: crea datos de prueba (estudiantes)

### Categorias: seed declarativo

`seed/categories.js` exporta por default un **array declarativo** de filas `{ objectName, uniqueKey, data }`. El loader de seeds (fase 8, `syncSeeds`) lo detecta por la forma del export y hace upsert. El modelo real es `ReportCategory` (el modelo legacy `Category` con `scopeType`/`isActive` se elimino en UPONE-1224). Tanto `report-templates.js` como `sample-reports.js` resuelven su `categoryId` por `code` desde estas filas.

```javascript
// seed/categories.js
export default [
  {
    objectName: 'ReportCategory',
    uniqueKey: { code: 'RPT_ACADEMIC' },
    data: {
      code: 'RPT_ACADEMIC',
      name: 'Académico',
      description: 'Reportes de matrícula, retención, rendimiento académico',
      isActive: true
    }
  }
  // ... mas categorias
];
```

### Templates: seed via funcion

`seed/report-templates.js` exporta por default una **funcion** `seedReportTemplates(prisma, tenantId)`. Construye un `categoryMap` desde `prisma.reportCategory.findMany()` (NO existe `prisma.category`), resuelve `categoryId` por `categoryCode`, y hace upsert manual (`findFirst` por `name`, luego `create`/`update`) via `prisma.reportTemplate`. Cada seed incluye `dataSourceObject` (obligatorio) y opcionalmente `environmentFilters`.

```javascript
// seed/report-templates.js
const templateSeeds = [
  {
    label: 'Panorama de Matrícula (académico)',
    uniqueKey: { name: 'Panorama de Matrícula' },
    categoryCode: 'RPT_ACADEMIC',
    data: {
      name: 'Panorama de Matrícula',
      code: 'RPT-PANORAMA-MATRICULA',
      description: 'Conteo de matrícula por semestre, programa y tipo de estudiante.',
      dataSourceObject: 'ReportTestData',
      environmentFilters: ['studentName', 'semester', 'gpa', 'cohortYear', 'program'],
      query: `query PanoramaMatricula {
        listInstances(
          name: "ReportTestData"
          limit: 1000
          sort: { field: "gpa", direction: DESC }
          fields: ["studentName", "program", "department", "semester", "gpa"]
        ) { items { id data } totalCount }
      }`,
      isPublic: true,
      tags: 'Matrícula, KPI, Semestre'
    }
  }
  // ... mas templates
];

export default async function seedReportTemplates(prisma, tenantId) {
  const categoryMap = {};
  try {
    const categories = await prisma.reportCategory.findMany();
    for (const cat of categories) categoryMap[cat.code] = cat.id;
  } catch {
    // El modelo ReportCategory puede no existir en tenants no-migrados.
  }

  for (const seed of templateSeeds) {
    const categoryId = seed.categoryCode ? (categoryMap[seed.categoryCode] || null) : null;
    const existing = await prisma.reportTemplate.findFirst({ where: { name: seed.uniqueKey.name } });
    const templateData = { ...seed.data, categoryId, createdById: 2, updatedById: 2, tenantId: tenantId || 'UPU' };
    if (existing) {
      await prisma.reportTemplate.update({ where: { id: existing.id }, data: templateData });
    } else {
      await prisma.reportTemplate.create({ data: templateData });
    }
  }
}
```

### Crear seed propio en un mod

Un mod puede incluir un seed de categorias declarativo o un seed de templates via funcion en su carpeta `seed/`. Recuerda: `dataSourceObject` es obligatorio y `categoryId` se resuelve desde `prisma.reportCategory` por `code`.

```javascript
// mods/mi-mod/seed/report-templates.js
export default async function seedModReportTemplates(prisma, tenantId) {
  const cat = await prisma.reportCategory.findFirst({ where: { code: 'RPT_OPERATIONAL' } });
  const existing = await prisma.reportTemplate.findFirst({ where: { name: 'Disponibilidad Semanal' } });
  const data = {
    name: 'Disponibilidad Semanal',
    description: 'Bloques de disponibilidad por facilitador',
    dataSourceObject: 'TimeBlockAssignment',   // OBLIGATORIO
    categoryId: cat?.id || null,
    query: `query { listInstances(name: "TimeBlockAssignment", limit: 5000) { items { id data } totalCount } }`,
    isPublic: true,
    createdById: 2,
    updatedById: 2,
    tenantId: tenantId || 'UPU'
  };
  if (existing) {
    await prisma.reportTemplate.update({ where: { id: existing.id }, data });
  } else {
    await prisma.reportTemplate.create({ data });
  }
}
```

---

## 10. Flujo completo: de template a reporte con datos

### Paso 1: Crear template

```graphql
mutation {
  createReportTemplate(tenantId: "UPU", input: {
    name: "Metricas Academicas por Carrera"
    categoryId: "clx_reportcategory_academic_id"   # id real de ReportCategory
    dataSourceObject: "Person"                       # OBLIGATORIO
    query: """
      query {
        listInstances(
          objectName: "Person"
          filters: [{ field: "isActive", operator: "EQUALS", value: "true" }]
          limit: 5000
        ) { instances totalCount }
      }
    """
    isPublic: true
  }) { id }
}
# → templateId: "clx_tmpl_001"
```

### Paso 2: Crear reporte basado en template

```graphql
mutation {
  createReport(tenantId: "UPU", input: {
    name: "Rendimiento por Carrera 2026"
    categoryId: "clx_reportcategory_academic_id"
    templateId: "clx_tmpl_001"
    dataSourceFields: ["firstName", "lastName", "program", "gpa", "creditsCompleted"]
    filters: [
      { field: "cohortYear", operator: "EQUALS", value: "2026" }
    ]
    sorting: { field: "gpa", order: "DESC" }
    visualization: { chartType: "column" }
    pivot: {
      rows: ["program"]
      columns: []
      values: [
        { field: "gpa", aggregation: "average" }
        { field: "creditsCompleted", aggregation: "sum" }
        { field: "firstName", aggregation: "count" }
      ]
    }
  }) { id }
}
# → reportId: "clx_rpt_001"
```

### Paso 3: Consultar reporte

```graphql
query {
  getReportById(id: "clx_rpt_001", tenantId: "UPU") {
    name
    templateId
    filters { field operator value }
    pivot { rows columns values { field aggregation } }
    visualization { chartType }
  }
}
```

### Paso 4: Obtener datos (lo que hace el viewer internamente)

```graphql
# Ejecutar la query del template
query {
  listInstances(
    objectName: "Person"
    filters: [{ field: "isActive", operator: "EQUALS", value: "true" }]
    limit: 5000
  ) {
    instances
    totalCount
  }
}
```

### Paso 5: Modificar pivot

```graphql
mutation {
  updateReport(tenantId: "UPU", input: {
    id: "clx_rpt_001"
    pivot: {
      rows: ["program", "department"]
      columns: ["semester"]
      values: [
        { field: "gpa", aggregation: "average" }
        { field: "firstName", aggregation: "count" }
      ]
    }
    visualization: { chartType: "stacked_column" }
  }) {
    pivot { rows columns values { field aggregation } }
    visualization { chartType }
  }
}
```

### Paso 6: Duplicar para variante

```graphql
mutation {
  duplicateReport(tenantId: "UPU", reportId: "clx_rpt_001") {
    id
    name  # "Rendimiento por Carrera 2026 (Copy)"
  }
}
```

---

## 11. Restricciones y errores

| Restriccion | Detalle |
|-------------|---------|
| Template name unico | `createReportTemplate` falla si el nombre ya existe |
| Template en uso | `deleteReportTemplate` falla con `TEMPLATE_IN_USE:{count}:{names}` |
| dataSourceObject obligatorio | `createReportTemplate` sin `dataSourceObject` lanza `dataSourceObject is required...` antes de escribir (reportTemplate.resolver.js:399-402) |
| categoryId debe existir | En template, `categoryId` debe referenciar una `ReportCategory` real (por id, no code). Invalido: `Invalid categoryId...` (reportTemplate.resolver.js:371-383) |
| category ignorado en Report | El input `category` de `createReport`/`updateReport` existe pero el resolver no lo usa; solo lee `categoryId` |
| environmentFilters proyectado | Los campos de `environmentFilters` del template deben estar cubiertos por `dataSourceFields` del reporte (UPONE-1384/1387); si no, no se resuelven |
| RBAC en mutations | Las 7 mutations exigen una capability `mod/up1-manager/*`; el `checkCapability` corre antes de escribir (ver seccion 14) |
| filters se destruyen en update | `updateReport` con `filters` elimina todos los previos y crea nuevos |
| sorting/pivot/kpiCell null = eliminar | Pasar `null` en `updateReport` elimina la sub-entidad |
| Reporte inexistente en delete | `deleteReport` retorna `false` sin excepcion (idempotente) |
| Header X-Tenant-ID obligatorio | Toda request GraphQL lo requiere |

### Errores comunes

| Error | Causa | Solucion |
|-------|-------|----------|
| `TEMPLATE_IN_USE:N:...` | Template tiene reportes asociados | Eliminar o reasignar reportes primero |
| `Unique constraint failed on name` | Nombre de template duplicado | Usar nombre unico |
| `dataSourceObject is required...` | Falta `dataSourceObject` en `createReportTemplate` | Declarar el objeto fuente (String) |
| `Invalid categoryId...` | `categoryId` no referencia una `ReportCategory` existente | Pasar el id real de la categoria, no su code |
| `Cannot read properties of null` | Template no existe o templateId incorrecto | Verificar ID del template |
| Capability denegada (`mod/up1-manager/...`) | Usuario sin la capability de la mutation | Otorgar la capability RBAC (ver seccion 14) |
| `TENANT_ID_REQUIRED` | Falta header X-Tenant-ID | Agregar header |

---

## 12. KPI cell: celdas de indicador

`kpiCell` (UPONE-1168 / DASH-10) declara un indicador destacado que el widget renderiza en vista KPI, con un toggle interno de vuelta al pivot completo. Es opcional; `null` = widget estandar. Presente en `CreateReportInput`, `UpdateReportInput` y en la salida `Report.kpiCell`.

### Campos de ReportKpiCellInput

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `cellType` | String! | `"grandTotal"` (total general de `measure`) o `"subtotal"` (subtotal en `(row, column)`) |
| `measure` | String! | Campo tomado de `pivot.values` del que lee la celda |
| `row` | String | Etiqueta de fila tal como la renderiza Flexmonster. Solo aplica a `cellType="subtotal"` |
| `column` | String | Etiqueta de columna. Solo aplica a `cellType="subtotal"` |
| `label` | String | Override de etiqueta humana; si falta se deriva una |
| `format` | String | `"number"` / `"percent"` / `"currency"` / `"decimal"` |
| `abbreviated` | Boolean | `true` = notacion compacta (19M, 1.2K). Se combina con `format` |

### Crear con KPI de gran total

```graphql
mutation {
  createReport(tenantId: "UPU", input: {
    name: "Ingresos por Campus (KPI)"
    templateId: "clx_tmpl_001"
    pivot: {
      rows: ["campus"]
      values: [{ field: "tuitionTotal", aggregation: "sum" }]
    }
    kpiCell: {
      cellType: "grandTotal"
      measure: "tuitionTotal"
      label: "Ingreso total"
      format: "currency"
      abbreviated: true
    }
  }) {
    id
    kpiCell { cellType measure label format abbreviated }
  }
}
```

### Actualizar con KPI de subtotal, o eliminarlo

```graphql
# Setear un subtotal en (row, column)
mutation {
  updateReport(tenantId: "UPU", input: {
    id: "clx_rpt_001"
    kpiCell: {
      cellType: "subtotal"
      measure: "gpa"
      row: "Ingenieria"
      column: "2026"
      format: "decimal"
    }
  }) { id kpiCell { cellType measure row column } }
}

# Eliminar el KPI cell (volver a widget estandar): pasar null
mutation {
  updateReport(tenantId: "UPU", input: { id: "clx_rpt_001", kpiCell: null }) { id }
}
```

El manejo en `updateReport` es upsert: crea si no existe, actualiza si existe, y `null` elimina (reportData.resolver.js:1179-1216).

---

## 13. Environment filters cross-object

`environmentFilters` (UPONE-1166 / DASH-08) declara los campos que aceptan valores desde parametros de URL del dashboard (filtros de entorno). Es una capability declarativa: si un widget los consume se controla per-widget (DASH-13).

- En `ReportTemplate`: es **editable**. `CreateReportTemplateInput.environmentFilters: [String!]` (opcional, default array vacio) y `UpdateReportTemplateInput.environmentFilters: [String!]` (reemplaza la lista; array vacio = limpiar).
- En `Report`: es `environmentFilters: [String!]!` de **solo lectura**, derivado del template. No va en `CreateReportInput`/`UpdateReportInput`.

### Cross-object con notacion dotted

Un environment filter puede referenciar un campo de una relacion con notacion punteada (ej. `instructor.name`). Para que resuelva, la query del template debe declarar la relacion en `relations` y proyectar el campo.

```graphql
mutation {
  createReportTemplate(tenantId: "UPU", input: {
    name: "Ofertas por Instructor"
    categoryId: "clx_reportcategory_operational_id"
    dataSourceObject: "Offering"
    environmentFilters: ["cohortYear", "instructor.name"]
    query: """
      query {
        listInstances(
          name: "Offering"
          relations: ["instructor"]
          fields: ["cohortYear", "instructor.name", "capacity"]
          limit: 5000
        ) { items { id data } totalCount }
      }
    """
    isPublic: true
  }) { id environmentFilters }
}
```

Si `instructor.name` figura en `environmentFilters` pero la query no declara `relations: ["instructor"]` (o no proyecta el campo), el filtro no se resuelve: el campo cross-object no queda proyectado por `dataSourceFields`/la query (UPONE-1384/1387).

---

## 14. RBAC en mutations

Las 7 mutations de reportes y templates ejecutan `checkCapability` (importado de `services/auth/authChecker.js`) antes de escribir. Si el usuario no tiene la capability, la mutation lanza excepcion y no persiste. Las capabilities viven en el namespace `mod/up1-manager/*`.

| Mutation | Capability requerida | Ref |
|----------|----------------------|-----|
| `createReport` | `mod/up1-manager/report:create` | reportData.resolver.js:932 |
| `updateReport` | `mod/up1-manager/report:edit` | reportData.resolver.js:1076 |
| `deleteReport` | `mod/up1-manager/report:delete` | reportData.resolver.js:1400 |
| `duplicateReport` | `mod/up1-manager/report:clone` | reportData.resolver.js:1427 |
| `createReportTemplate` | `mod/up1-manager/reporttemplate:create` | reportTemplate.resolver.js:400 |
| `updateReportTemplate` | `mod/up1-manager/reporttemplate:edit` | reportTemplate.resolver.js:478 |
| `deleteReportTemplate` | `mod/up1-manager/reporttemplate:delete` | reportTemplate.resolver.js:595 |

Las **queries de lectura** (`listReports`, `getReportById`, `getReportByCode`, `listReportTemplates`, `getReportTemplateById`, `getReportTemplates`) NO llevan `checkCapability`; la visibilidad de templates se acota por `isPublic` y `visibleToRoles`. Desde UPONE-1412 (SEC-02) si llevan un gate de **autenticacion**: cada resolver de lectura se envuelve con `requireAuth` (`services/auth/withAuth.js`, aplicado en `reportData.resolver.js:921` y `reportTemplate.resolver.js:214`), asi que una request sin sesion valida es rechazada aunque el template sea publico. `requireAuth` verifica sesion, no capability; no sustituye la tabla de arriba.

---

## 15. code: identificador externo

`code` (UPONE-1168 / DASH-10) es un identificador humano estable y unico (convencion UPPER-KEBAB con prefijo `RPT-`). Sirve para que las referencias externas (configs de widgets del dashboard) sobrevivan a re-seeds, usando `code` en lugar del `id` cuid.

- Es opcional para filas legacy; los reportes nuevos deberian declarar uno.
- Presente en `CreateReportInput`/`UpdateReportInput` (Report) y en `CreateReportTemplateInput`/`UpdateReportTemplateInput` (ReportTemplate).
- `duplicateReport` NO copia `code`: lo fuerza a `null` en la copia (reportData.resolver.js:1408), porque es unico. Asigna uno nuevo si la copia lo necesita.

### Obtener un reporte por code

```graphql
query {
  getReportByCode(code: "RPT-PANORAMA-MATRICULA", tenantId: "UPU") {
    id
    code
    name
    templateId
  }
}
```

Retorna `null` si no existe un reporte con ese code (reportData.schema.graphql:305-309).

---

## 16. Delegacion a up1-manager

El backend que ejecuta estas mutations y queries sigue viviendo en el workspace `report-builder/` (schemas y resolvers de `report-builder/logic/`). Lo que cambio es la **capa de acceso**: las capabilities RBAC y las vistas de UI ahora pertenecen al mod `up1-manager`.

- Las capabilities de las 7 mutations usan el namespace `mod/up1-manager/*` (seccion 14), no nombres legacy como `report:view` o `report:create` sueltos.
- El acceso de usuario final al Report Builder se sirve desde las vistas de `up1-manager` (la consola de administracion de plataforma), no como app standalone.
- El workspace `report-builder/` permanece como el workspace tecnico de reporteria (Flexmonster, schemas, resolvers, seeds); `up1-manager` lo expone.

Al programar contra la API, apunta a las mismas mutations/queries de siempre, pero asegura que el usuario o service account tenga las capabilities `mod/up1-manager/report:*` y `mod/up1-manager/reporttemplate:*` correspondientes.

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-04-10 | Documento inicial: guia de gestion programatica de reportes basada en schemas GraphQL, resolvers y seeds reales |
| 2026-07-16 | Actualización mayor contra el schema/resolvers reales (UPONE-1383/1384/1387/1396/1374/1376/1377/1168/1223): dataSourceFields y pivot como arrays nativos, categoryId como FK a ReportCategory, getModelData retirado, getReportByCode, kpiCell, environmentFilters cross-object, visibleToRoles, code como id externo, RBAC (checkCapability mod/up1-manager/*) en las 7 mutations, delegación de vistas a up1-manager. |
| 2026-08-03 | Verificado contra código (UPONE-1412/SEC-02): se agrega el gate de autenticación `requireAuth` en todas las queries de lectura de `reportBuilderQuery`/`reportTemplateQuery` (sección 14); se corrigen line refs de `checkCapability` tras drift de línea. Se confirmó que el schema de Report ya no referenciaba `ext__uplanner__report` en ningún punto del documento (nada que corregir ahí). |
