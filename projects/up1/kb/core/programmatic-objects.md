---
id: SPEC-core-003
project: up1
type: spec
module: core
category: core
tags: [up1, object-manager, objetos, programatico, api, graphql, mutations, codegen, runtime, campos, fieldDefinition, objectDefinition, applyChanges, hot-swap, arrays, jsonSchema, up1-manager]
fecha: 2026-07-16
sources:
  - object-manager/src/graphql/typeDefs/static.js (mutations completas)
  - object-manager/src/graphql/resolvers/objectDefinition.resolver.js
  - object-manager/src/graphql/resolvers/fieldDefinition.resolver.js
  - object-manager/src/services/applyChanges.js (codigo fuente, incluye hot-swap fast path UPONE-1385)
  - object-manager/src/services/codegen/generatePrismaSchema.js (syncExtendedFieldsToRegistry, UPONE-1385)
  - object-manager/src/services/codegen/helpers/prisma-field-emitter.js (prismaType String[], UPONE-1396)
  - object-manager/src/services/customFields.js (updateCustomField + jsonSchema, UPONE-1290)
  - object-manager/src/services/jsonSchemaMirror.js (UPONE-1290)
  - object-manager/docs/features/runtime-object-creation.md
  - mods/up1-manager/ (mod UI, reemplaza a object-manager-editor)
  - specs/up1/features/schema-hot-swap.md
  - specs/up1/mods/example-up1-manager.md
---
# Creacion y modificacion programatica de objetos en uP1

## Indice

1. [Resumen de capacidades](#1-resumen-de-capacidades)
2. [Dos formas de crear objetos](#2-dos-formas-de-crear-objetos)
3. [API GraphQL: mutations de objetos](#3-api-graphql-mutations-de-objetos)
4. [API GraphQL: mutations de campos](#4-api-graphql-mutations-de-campos)
5. [Pipeline automatico: applyChanges()](#5-pipeline-automatico-applychanges)
6. [Tipos de campo soportados](#6-tipos-de-campo-soportados)
7. [Restricciones y permisos](#7-restricciones-y-permisos)
8. [Validaciones y formulas](#8-validaciones-y-formulas)
9. [Mod Object Manager Editor](#9-mod-object-manager-editor)
10. [Ejemplos practicos](#10-ejemplos-practicos)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Resumen de capacidades

| Operacion | Via JSON manual | Via API GraphQL | Via UI (mod editor) |
|-----------|----------------|-----------------|---------------------|
| Crear objeto nuevo | Editar JSON + codegen + migrate | `createObjectDefinition` mutation | Formulario en Object Manager |
| Modificar metadatos | Editar JSON + codegen | `updateObjectDefinition` mutation | Formulario en Object Manager |
| Eliminar objeto | Borrar JSON + codegen | `deleteObjectDefinition` mutation | Boton en Object Manager |
| Agregar campo | Editar JSON + codegen + migrate | `createCustomField` mutation | Formulario en Object Manager |
| Modificar campo | Editar JSON + codegen + migrate | `updateCustomField` mutation | Formulario en Object Manager |
| Eliminar campo | Editar JSON + codegen + migrate | `deleteCustomField` mutation | Boton en Object Manager |
| Agregar validacion (formula) | Editar JSON | `createObjectValidation` mutation | — |
| Modificar JSON Schema de campo | Editar JSON | `updateJsonSchema` mutation (o `jsonSchema` en `updateCustomField`) | — |

**Las mutations GraphQL disparan automaticamente** el pipeline de codegen + migracion + restart. No necesitas correr comandos manuales.

---

## 2. Dos formas de crear objetos

### Forma 1: JSON manual (desarrollo de mods)

El camino clasico para desarrollo de mods:

```
1. Crear/editar JSON en mods/{mod}/objects/MiObjeto.json
2. npm run sync     → copia a object-manager/objects/business/
3. npm run codegen  → genera Prisma + GraphQL
4. npm run tenant:migrate → crea tabla en PostgreSQL
5. Reiniciar Object Manager
```

**Ventaja**: control total, versionado en git, reproducible.
**Desventaja**: requiere acceso al filesystem, multiples comandos, restart manual.

### Forma 2: API GraphQL (runtime, sin tocar archivos)

```
1. Ejecutar mutation createObjectDefinition via GraphQL
2. El resolver:
   a. Crea registro en core_ObjectDefinition
   b. Escribe JSON en objects/business/Base/ automaticamente
   c. Crea capabilities RBAC (view/create/modify/delete)
   d. Dispara applyChanges()
3. applyChanges():
   a. Escribe flag file
   b. Sube a S3 (produccion)
   c. Publica en Redis
   d. Toca restart trigger
4. Server se reinicia automaticamente (o hace hot-swap del Prisma Client sin restart si `SCHEMA_HOT_SWAP_ENABLED=true`, ver seccion 5 "Hot-swap de schema, sin restart")
5. Pipeline: codegen → db push → prisma generate
6. Objeto disponible en GraphQL API
```

**Ventaja**: no requiere acceso al filesystem, automatico, funciona en produccion.
**Desventaja**: solo para objetos con `source='Tenant'`, no versionado en git del mod.

---

## 3. API GraphQL: mutations de objetos

### createObjectDefinition — Crear objeto nuevo

```graphql
mutation {
  createObjectDefinition(
    name: "ResearchProject"
    fields: [
      { name: "title", fieldType: "text", label: "Titulo", isRequired: true }
      { name: "budget", fieldType: "currency", label: "Presupuesto" }
      { name: "status", fieldType: "text", label: "Estado" }
      { name: "startDate", fieldType: "date", label: "Fecha Inicio" }
      { name: "principalInvestigatorId", fieldType: "relation", label: "Investigador Principal", target: "Person" }
    ]
    label: "Proyecto de Investigacion"
    labelPlural: "Proyectos de Investigacion"
    gender: "masculino"
    description: "Proyectos de investigacion academica"
    defaultLayoutType: "RecordList"
  ) {
    id
    name
    tableName
    label
  }
}
```

**Que hace internamente:**

1. Valida nombre (solo letras/numeros, sin espacios ni caracteres especiales)
2. Crea registro en `core_ObjectDefinition` con `source: 'Tenant'`
3. Escribe `ResearchProject.json` en `objects/business/Base/` (o directorio del tenant)
4. Escribe `ext__<CLIENT>__ResearchProject.json` en `objects/business/Extended/`
5. Crea `core_FieldDefinition` por cada campo
6. Crea 4 `core_Capability`: `researchproject:view`, `:create`, `:modify`, `:delete`
7. Llama `applyChanges()` → pipeline automatico

### updateObjectDefinition — Modificar metadatos

```graphql
mutation {
  updateObjectDefinition(
    name: "ResearchProject"
    label: "Proyecto de Investigacion Academica"
    description: "Proyectos de investigacion con seguimiento de presupuesto"
    defaultLayoutType: "RecordDetail"
  ) {
    id
    name
    label
    description
  }
}
```

**Nota**: esta mutation actualiza **metadatos** (label, description, gender, defaultLayoutType). Para agregar o modificar **campos**, usar `createCustomField` / `updateCustomField`.

### deleteObjectDefinition — Eliminar objeto

```graphql
mutation {
  deleteObjectDefinition(id: "clx1234...") {
    id
    name
  }
}
```

**Que hace internamente:**

1. Elimina en cascada: `FieldJsonSchema` → `ObjectValidation` → `FieldDefinition` → `ObjectDefinition`
2. Borra archivos JSON (Base y Extended) del filesystem local
3. Si `ENABLE_S3_SYNC=true`: borra de S3 via `s3Sync.deleteFiles()`
4. Elimina modelos del `prisma.schema`
5. Llama `applyChanges()`

---

## 4. API GraphQL: mutations de campos

### createCustomField — Agregar campo a objeto existente

```graphql
mutation {
  createCustomField(
    objectDefinitionId: "clx1234..."
    name: "fundingSource"
    fieldType: "text"
    label: "Fuente de Financiamiento"
    description: "Organizacion que financia el proyecto"
    isRequired: false
    defaultValue: "Interno"
  ) {
    id
    name
    fieldType
    label
  }
}
```

**Para campos de relacion (FK):**

```graphql
mutation {
  createCustomField(
    objectDefinitionId: "clx1234..."
    name: "departmentId"
    fieldType: "relation"
    label: "Departamento"
    target: "Department"
    oneToOne: false
  ) {
    id
    name
    fieldType
  }
}
```

El resolver detecta automaticamente el tipo de ID del target (Int o String) desde el schema Prisma, y agrega el sufijo `Id` si no esta presente.

### createFieldDefinition — Crear campo con mas opciones

Para campos con propiedades avanzadas (permisos, JSON Schema, formulas):

```graphql
mutation {
  createFieldDefinition(data: {
    objectDefinitionId: "clx1234..."
    name: "riskScore"
    fieldType: "number"
    label: "Puntuacion de Riesgo"
    isBaseField: false
    properties: {
      formula: "=budget / 1000"
    }
  }) {
    id
    name
    fieldType
  }
}
```

### updateCustomField — Modificar campo existente

```graphql
mutation {
  updateCustomField(
    id: "clx5678..."
    newName: "fundingOrganization"
    fieldType: "text"
    label: "Organizacion Financiadora"
    description: "Nombre de la entidad que financia"
    isRequired: true
    defaultValue: "Sin asignar"
  )
}
```

Retorna `Boolean!` (true si exitoso).

**Nota (UPONE-1290)**: `updateCustomField` tambien acepta un argumento opcional `jsonSchema` (`object-manager/src/graphql/typeDefs/static.js:1503`). Si se envia, delega en el mismo mecanismo de `updateJsonSchema`/`deleteJsonSchema` (`object-manager/src/services/customFields.js:220,564-578`): un schema no vacio crea una nueva version activa en `core_FieldJsonSchema`; un valor vacio o `null` desactiva la version actual. En ambos casos, el resultado se espeja en `core_FieldDefinition.properties.jsonSchema` (`object-manager/src/services/jsonSchemaMirror.js:40-53`) para que un editor visual pueda leer el schema activo en el mismo fetch del campo, sin una consulta adicional a `core_FieldJsonSchema`. Ver seccion 9 para el estado de la UI que consume esto.

### deleteCustomField — Eliminar campo

```graphql
mutation {
  deleteCustomField(id: "clx5678...") {
    id
    name
  }
}
```

### updateJsonSchema — Actualizar schema JSON de un campo

Para campos tipo `json`, se puede versionar su schema:

```graphql
mutation {
  updateJsonSchema(
    fieldDefinitionId: "clx5678..."
    schema: {
      type: "object"
      properties: {
        key1: { type: "string" }
        key2: { type: "number" }
      }
      required: ["key1"]
    }
  ) {
    id
    version
    schema
    isActive
  }
}
```

Crea una nueva version del schema (la anterior se desactiva), actualiza el config file, y dispara `applyChanges()`.

---

## 5. Pipeline automatico: applyChanges()

Toda mutation que modifica objetos o campos llama a `applyChanges()`. Este es el puente entre la API y el pipeline de codegen.

### Flujo paso a paso

```
Mutation GraphQL (createObjectDefinition, createCustomField, etc.)
  │
  ▼
applyChanges()
  │
  ├─ 1. Escribe .apply-changes-pending.json (flag file, fuera de src/)
  │
  ├─ 2. [Produccion] Sube objects/ a S3 (persistencia entre contenedores)
  │
  ├─ 3. [Produccion] Publica en Redis canal "schema:changes"
  │     + Set "schema:status" = "restarting" (TTL 120s, para UI)
  │
  └─ 4. Toca src/restart-trigger.js → PM2/nodemon detecta y reinicia
          │
          ▼
       Server restart
          │
          ▼
       runPendingPipeline()
          │
          ├─ [Produccion] Descarga archivos mas nuevos de S3
          │
          ├─ Lee flag file (.apply-changes-pending.json)
          │
          ├─ Ejecuta pipeline sincronico:
          │   codegen → prisma db push → prisma generate
          │
          └─ Elimina flag file
              │
              ▼
          Server carga schema actualizado
          Objeto/campo disponible en GraphQL
```

### Tiempos

| Entorno | Tiempo total |
|---------|-------------|
| Desarrollo local (nodemon) | 5-15 segundos |
| Produccion (PM2 + ECS) | 10-30 segundos |

### S3 y multi-instancia

En produccion, los JSONs se persisten en S3 para:
- Sobrevivir reemplazos de contenedor (ECS deployments)
- Propagar cambios entre instancias

Cuando una nueva instancia arranca, compara timestamps locales vs S3. Si S3 tiene archivos mas nuevos, ejecuta el pipeline automaticamente (sin flag file).

### Hot-swap de schema, sin restart (UPONE-1385)

Con el flag `SCHEMA_HOT_SWAP_ENABLED=true` (default apagado), el paso 4 del flujo anterior cambia: en vez de tocar el restart trigger, `applyChanges()` toma un fast path (`object-manager/src/services/applyChanges.js:138-155`) que corre el codegen inline, recarga el Prisma Client sin reimportar el mismo path de modulo (`tenantManager.reloadClient()`, `object-manager/src/services/tenantManager.js:220-240`) y reemplaza el `ApolloServer` en caliente (`swapSchema()`, `object-manager/src/services/schemaHotSwap.js:144-206`). El proceso Node no se reinicia y el resto de los tenants servidos por el mismo pod no se ven afectados. Si el swap falla, esta deshabilitado, o se agota el limite de swaps acumulados, cae al camino legado de restart. Arquitectura completa (locks distribuidos, aislamiento por tenant, limitaciones y variables de entorno) en `../features/schema-hot-swap.md`.

### Persistencia de custom fields en runtime (UPONE-1385)

Antes de este fix, un campo custom creado via `createCustomField` (`isBaseField: false`) podia desaparecer de la UI tras un restart o un deploy nuevo: el codegen que corre en el init container reconstruye los campos base y de RecordType desde el catalogo JSON "horneado" en la imagen, pero no reconstruia los campos EXTENDED, asi que los trataba como huerfanos y los soft-borraba. Hoy `syncExtendedFieldsToRegistry()` (`object-manager/src/services/codegen/generatePrismaSchema.js:1359-1364,2760-2865`) reconstruye tambien esos campos leyendo el `ext__<CLIENT>__<objeto>.json`, asi que un campo custom creado en runtime sobrevive un restart del container. Detalle en `../features/schema-hot-swap.md` (seccion 3).

---

## 6. Tipos de campo soportados

| fieldType | Prisma type | GraphQL type | Ejemplo |
|-----------|------------|-------------|---------|
| `text` | String | String | nombre, codigo |
| `textarea` | String | String | descripcion corta |
| `textarea_long` | String | String | descripcion larga |
| `number` | Float / Int | Float / Int | puntuacion, creditos |
| `boolean` | Boolean | Boolean | activo, vigente |
| `email` | String | String | correo electronico |
| `currency` | Float | Float | presupuesto |
| `date` | DateTime | String | fecha inicio |
| `datetime` | DateTime | String | timestamp completo |
| `time` | String | String | hora (HH:mm) |
| `percent` | Float | Float | porcentaje |
| `phone` | String | String | telefono |
| `url` | String | String | enlace web |
| `json` | Json | JSON | metadata, config |
| `relation` | String/Int (FK) | String/Int | FK a otro objeto |
| `Formula` | Calculado | Calculado | =budget / 1000 |

### Arrays nativos de Postgres: `prismaType: "String[]"` (UPONE-1396, opt-in)

Solo via JSON manual (Forma 1): un campo del objeto se declara como array nativo de Postgres (`text[]`), no como `Json`, agregando `prismaType: "String[]"` junto a `type: "array"` e `items: { type: "string" }` en la definicion del campo. El codegen lo detecta en `object-manager/src/services/codegen/helpers/prisma-field-emitter.js:69-77` y emite la columna como `String[]` en vez de `Json` (comportamiento por defecto para `type: "array"` sin el opt-in). No esta limitado a `report-builder`: el mecanismo es generico para cualquier objeto business/base que pase por el generador de schema, aunque hoy en la practica solo lo usan objetos de `report-builder` (ej. `dataSourceFields` en `object-manager/objects/up1/report-builder/Report.json`).

```json
{
  "name": "tags",
  "type": "array",
  "items": { "type": "string" },
  "prismaType": "String[]",
  "label": "Etiquetas"
}
```

---

## 7. Restricciones y permisos

### Source del objeto

| Source | Puede crear via API | Puede modificar | Puede eliminar |
|--------|-------------------|-----------------|----------------|
| `Tenant` | Si | Si | Si |
| `Business` | No (viene de JSON de mod) | No | No |
| `System` | No (core del sistema) | No | No |

Las mutations de objetos y campos **solo funcionan** con objetos de source `Tenant`. Los objetos que vienen de mods (`source: 'Business'`) y los del sistema (`source: 'System'`) son **read-only** via API.

### Campos base vs custom

| Tipo campo | Puede crear | Puede modificar | Puede eliminar |
|-----------|-------------|-----------------|----------------|
| Base field (`isBaseField: true`) | Solo al crear objeto | No via updateCustomField | No |
| Custom field (`isBaseField: false`) | Si, con createCustomField | Si, con updateCustomField | Si |

### Capabilities auto-generadas

Al crear un objeto via `createObjectDefinition`, se crean automaticamente 4 capabilities:

```
researchproject:view
researchproject:create
researchproject:modify
researchproject:delete
```

Estas se pueden asignar a roles via el sistema de RBAC.

---

## 8. Validaciones y formulas

### ObjectValidation — Reglas de validacion

```graphql
mutation {
  createObjectValidation(data: {
    objectDefinitionId: "clx1234..."
    name: "budget_positive"
    formula: "=budget > 0"
    errorMessage: "El presupuesto debe ser mayor a 0"
    isActive: true
  }) {
    id
    name
    formula
  }
}
```

Las validaciones usan FormulaJS (399 funciones Excel: SUM, IF, VLOOKUP, etc.) y se ejecutan automaticamente antes de crear/actualizar instancias.

### Campos formula

```graphql
mutation {
  createFieldDefinition(data: {
    objectDefinitionId: "clx1234..."
    name: "budgetPerMonth"
    fieldType: "Formula"
    label: "Presupuesto Mensual"
    properties: {
      formula: "=budget / 12"
    }
  }) {
    id
    name
  }
}
```

El motor valida la formula en 4 pasos: sintaxis → campos referenciados → tipos → evaluacion con datos dummy.

---

## 9. Mod Object Manager Editor

**Nota**: el mod `object-manager-editor` fue absorbido por `up1-manager` (consola de administracion de plataforma); no forma parte del ensamblaje activo. La tabla de layouts de esta seccion describe la funcionalidad original, hoy migrada al mod consolidado. Guia practica y detalle actualizado en `../mods/example-up1-manager.md`.

El mod (hoy `up1-manager`) provee una **UI completa** para gestionar objetos sin editar JSONs ni ejecutar comandos. Internamente consume las mismas mutations GraphQL documentadas arriba.

### Editor de JSON Schema de campos (UPONE-1290)

La mutation `updateCustomField` acepta `jsonSchema` (seccion 4), pero a la fecha de este documento los layouts `fielddefinition-edit.json` y `fielddefinition-create.json` de `up1-manager` no referencian ese argumento: no hay todavia un formulario dedicado para autorar el JSON Schema de un campo tipo `json` desde la UI. Lo que si existe es un elemento de layout generico para **visualizar y editar el valor** de un campo `json` conforme a su schema activo: `JsonFieldViewer` (`layout/src/components/molecules/JsonFieldViewer/JsonFieldViewer.vue`, expuesto como elemento de layout via `JsonFieldViewerElement.vue`), usado por ejemplo en `mods/curriculum-design/config/layouts/datalog_entry_view.json`. Es decir: hoy se puede visualizar/editar el **dato** de un campo JSON contra su schema en cualquier layout que lo use, pero el schema en si todavia se define via la mutation GraphQL, no via un editor visual en el OM Editor.

### Que provee

| Funcionalidad | Layouts |
|---------------|---------|
| Listar objetos | `objectdefinition-list.json` |
| Ver detalle de objeto | `objectdefinition-view.json` |
| Crear objeto | `objectdefinition-create.json` |
| Editar objeto | `objectdefinition-edit.json` |
| Listar campos del objeto | `objectdefinition-fields-list.json` |
| Preview de datos | `objectdefinition-data-preview.json` |
| Crear campo | `fielddefinition-create.json` |
| Editar campo | `fielddefinition-edit.json` |
| Gestionar layouts | `layout-list/create/edit/view.json` |
| Gestionar apps | `app-list/create/edit/view.json` |
| Gestionar RBAC por objeto | `objectRoles.resolver.js` |
| Gestionar RBAC por app | `appRoles.resolver.js` |

### Configuracion

```json
{
  "name": "object-manager",
  "label": "Object Manager",
  "icon": "bi-database-gear",
  "order": 99,
  "roles": ["Admin", "Consultor"],
  "tenants": ["TEST", "UPU"],
  "version": "1.0.0"
}
```

Solo visible para roles Admin y Consultor.

---

## 10. Ejemplos practicos

### Ejemplo 1: Crear objeto completo con campos y relaciones

```graphql
# Paso 1: Crear el objeto
mutation {
  createObjectDefinition(
    name: "ResearchProject"
    fields: [
      { name: "title", fieldType: "text", label: "Titulo", isRequired: true }
      { name: "abstract", fieldType: "textarea_long", label: "Resumen" }
      { name: "budget", fieldType: "currency", label: "Presupuesto" }
      { name: "status", fieldType: "text", label: "Estado" }
      { name: "startDate", fieldType: "date", label: "Fecha Inicio" }
      { name: "endDate", fieldType: "date", label: "Fecha Fin" }
      { name: "isActive", fieldType: "boolean", label: "Activo" }
    ]
    label: "Proyecto de Investigacion"
    labelPlural: "Proyectos de Investigacion"
    gender: "masculino"
    description: "Gestion de proyectos de investigacion academica"
    defaultLayoutType: "RecordList"
  ) {
    id
    name
  }
}

# Esperar ~15 segundos para que el pipeline complete

# Paso 2: Agregar campo de relacion
mutation {
  createCustomField(
    objectDefinitionId: "ID_DEL_PASO_1"
    name: "departmentId"
    fieldType: "relation"
    label: "Departamento"
    target: "Department"
  ) {
    id
    name
  }
}

# Paso 3: Agregar validacion
mutation {
  createObjectValidation(data: {
    objectDefinitionId: "ID_DEL_PASO_1"
    name: "dates_valid"
    formula: "=endDate > startDate"
    errorMessage: "La fecha de fin debe ser posterior a la de inicio"
    isActive: true
  }) {
    id
  }
}
```

### Ejemplo 2: Consultar objetos y campos existentes

```graphql
# Listar todos los objetos
query {
  getObjectDefinitions {
    id
    name
    label
    source
    tableName
  }
}

# Ver campos de un objeto
query {
  getObjectFields(objectName: "ResearchProject") {
    id
    name
    fieldType
    label
    isBaseField
    isRequired
  }
}
```

### Ejemplo 3: Agregar campo a objeto existente

```graphql
mutation {
  createCustomField(
    objectDefinitionId: "clx1234..."
    name: "publicationCount"
    fieldType: "number"
    label: "Publicaciones"
    description: "Numero de publicaciones derivadas del proyecto"
    isRequired: false
    defaultValue: "0"
  ) {
    id
    name
  }
}
```

### Ejemplo 4: Crear instancias del objeto recien creado

```graphql
mutation {
  createInstance(
    objectType: "ResearchProject"
    data: {
      title: "Analisis de retención estudiantil"
      budget: 50000
      status: "En curso"
      startDate: "2026-03-01"
      isActive: true
      departmentId: "dept-uuid-123"
    }
  ) {
    id
    title
    budget
    createdAt
  }
}
```

---

## 11. Troubleshooting

| Problema | Causa | Solucion |
|----------|-------|----------|
| Mutation retorna error "read-only" | Objeto con `source != 'Tenant'` | Solo objetos creados via API/UI son modificables |
| Objeto no aparece despues de crear | Pipeline no completo (10-30s) | Esperar y verificar logs del server |
| Campo relation falla | Target object no existe | Verificar nombre exacto del objeto target |
| Pipeline en loop de restart | Flag no se elimina | Verificar que `runPendingPipeline()` tiene permisos de escritura |
| S3 sync falla | Credenciales AWS | Verificar `ENABLE_S3_SYNC`, `S3_BUCKET_NAME`, `AWS_REGION` |
| Validacion formula falla | Campos referenciados no existen | Verificar nombres de campos en la formula |
| Campo no se puede modificar | Es `isBaseField: true` | Solo custom fields (`isBaseField: false`) son editables |
| Crear objeto con nombre duplicado | Nombre ya existe en `core_ObjectDefinition` | Usar nombre unico |

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-04-10 | Documento inicial: guia de creacion programatica de objetos basada en mutations GraphQL, applyChanges, y runtime object creation |
| 2026-07-16 | Actualizacion: hot-swap de schema sin restart y persistencia de custom fields en runtime (UPONE-1385, enlaza a `../features/schema-hot-swap.md`); arrays nativos `String[]` opt-in en el codegen (UPONE-1396); `jsonSchema` en `updateCustomField` y su espejo a `properties` (UPONE-1290); nota sobre migracion de `object-manager-editor` a `up1-manager` y estado de la UI de JSON Schema (enlaza a `../mods/example-up1-manager.md`) |
