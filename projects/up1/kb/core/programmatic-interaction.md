---
id: SPEC-core-002
project: up1
type: spec
module: core
category: core
tags: [up1, programatico, api, graphql, crud, seeds, service-account, headless, automation, n8n, flows, etl, bulk, import]
fecha: 2026-04-14
sources:
  - core/object-manager.md (secciones 7, 12)
  - core/programmatic-objects.md (completo)
  - features/flow-engine.md (nodos custom, ejemplos)
  - features/rbac.md (service accounts, autenticacion)
  - operations/n8n-local-setup.md (session bridge, API keys)
  - mods/creation-guide.md (seeds)
  - confluence/desarrollo.md
---
# Interaccion programatica con uP1 — Guia completa

Como crear, leer, modificar y eliminar datos y objetos en uP1 sin pasar por la UI, y sin inyectar directamente en la base de datos.

## Indice

1. [Panorama general](#1-panorama-general)
2. [Nivel 1: CRUD de datos (instancias)](#2-nivel-1-crud-de-datos-instancias)
3. [Nivel 2: CRUD de estructura (objetos y campos)](#3-nivel-2-crud-de-estructura-objetos-y-campos)
4. [Nivel 3: Import masivo (Excel/CSV y bulk)](#4-nivel-3-import-masivo-excelcsv-y-bulk)
5. [Nivel 4: Seeds (poblacion inicial desde mods)](#5-nivel-4-seeds-poblacion-inicial-desde-mods)
6. [Nivel 5: Flows programaticos (n8n)](#6-nivel-5-flows-programaticos-n8n)
7. [Autenticacion headless](#7-autenticacion-headless)
8. [Guia de decision: que mecanismo usar](#8-guia-de-decision-que-mecanismo-usar)
9. [Ejemplos end-to-end](#9-ejemplos-end-to-end)
10. [Restricciones y limites](#10-restricciones-y-limites)

---

## 1. Panorama general

uP1 ofrece **5 niveles** de interaccion programatica, cada uno para un caso de uso distinto:

```text
  ┌───────────────────────────────────────────────────────────────────────┐
  │                    Mecanismos programaticos                            │
  │                                                                       │
  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │
  │  │     Nivel 1      │  │     Nivel 2      │  │     Nivel 3      │    │
  │  │  CRUD de datos   │  │ CRUD estructura  │  │  Import masivo   │    │
  │  │ GraphQL mutations│  │createObjectDefin.│  │  Excel/CSV+bulk  │    │
  │  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘    │
  │           │                     │                     │               │
  │  ┌──────────────────┐  ┌──────────────────┐           │               │
  │  │     Nivel 4      │  │     Nivel 5      │           │               │
  │  │      Seeds       │  │   Flows n8n      │           │               │
  │  │Poblacion de mods │  │Automatizac. async│           │               │
  │  └────────┬─────────┘  └────────┬─────────┘           │               │
  └───────────┼─────────────────────┼─────────────────────┼───────────────┘
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    ▼
                       ┌────────────────────────┐
                       │    Object Manager       │
                       │     (GraphQL API)       │
                       └────────────┬───────────┘
                                    ▼
                           ┌────────────────┐
                           │  (PostgreSQL)  │
                           └────────────────┘
```

| Nivel | Que hace | Cuando usar | Autenticacion |
|-------|----------|-------------|---------------|
| **1. CRUD datos** | Crear/leer/editar/borrar registros | Operaciones individuales y consultas | JWT o service token |
| **2. CRUD estructura** | Crear/modificar objetos y campos en runtime | Admin crea entidades sin tocar codigo | JWT (Admin) |
| **3. Import masivo** | Cargar datos desde Excel/CSV o arrays | Migraciones, carga inicial, bulk ops | JWT o service token |
| **4. Seeds** | Poblar datos iniciales de un mod | Desarrollo, datos de referencia | Prisma directo (no GraphQL) |
| **5. Flows n8n** | Automatizacion, notificaciones, ETL | Reacciones a eventos, tareas periodicas | Service token (bypass RBAC) |

---

## 2. Nivel 1: CRUD de datos (instancias)

Operaciones sobre **registros** de objetos existentes via GraphQL.

### Operaciones disponibles

| Operacion | Tipo | Query/Mutation |
|-----------|------|----------------|
| Listar | Query | `listInstances(objectName, filters, limit, offset, orderBy)` |
| Obtener uno | Query | `getInstance(objectName, id)` |
| Crear | Mutation | `createInstance(objectName, data)` |
| Actualizar | Mutation | `updateInstance(objectName, id, data)` |
| Eliminar | Mutation | `deleteInstance(objectName, id)` |
| Campos de objeto | Query | `getObjectFields(objectName)` |
| Objetos disponibles | Query | `getObjectDefinitions` |

> **Nota (UPONE-1382):** si el objeto declara hijos en su metadata (`polymorphicChildren`/`directChildren`), `deleteInstance`/`deleteBulkInstances` cascadan el borrado a esos hijos o lo bloquean con un mensaje semantico si hay referencias externas, en vez de fallar con un error de constraint de base de datos. Para anticipar el impacto antes de eliminar, usa la query `deleteImpactPreview(objectType, ids)` (read-only). Ver `features/delete-cascade.md`.

### Headers obligatorios

```
POST /graphql
Content-Type: application/json
X-Tenant-ID: UPU
Authorization: Bearer <jwt-token-o-service-token>
```

### Ejemplos

#### Listar con filtros

```graphql
query {
  listInstances(
    objectName: "Person"
    filters: [
      { field: "isActive", operator: "EQUALS", value: "true" }
      { field: "lastName", operator: "CONTAINS", value: "Garcia" }
    ]
    limit: 20
    offset: 0
    orderBy: { field: "createdAt", direction: "desc" }
  ) {
    instances
    totalCount
  }
}
```

#### Crear registro

```graphql
mutation {
  createInstance(
    objectName: "Person"
    data: {
      firstName: "Maria"
      lastName: "Garcia"
      email: "maria@universidad.cl"
    }
  ) {
    id
    firstName
    lastName
    createdAt
  }
}
```

#### Actualizar registro

```graphql
mutation {
  updateInstance(
    objectName: "Person"
    id: "uuid-123"
    data: { email: "maria.garcia@universidad.cl" }
  ) {
    id
    email
    updatedAt
  }
}
```

### Operadores de filtro

| Operador | Descripcion |
|----------|-------------|
| `EQUALS` | Igual a |
| `NOT_EQUALS` | Distinto de |
| `CONTAINS` | Contiene (texto) |
| `STARTS_WITH` / `ENDS_WITH` | Comienza/termina con |
| `GREATER_THAN` / `LESS_THAN` | Mayor/menor que |
| `GREATER_OR_EQUAL` / `LESS_OR_EQUAL` | Mayor-igual/menor-igual |
| `IN` / `NOT_IN` | Es/no es uno de (lista) |
| `IS_NULL` / `IS_NOT_NULL` | Es/no es null |

---

## 3. Nivel 2: CRUD de estructura (objetos y campos)

Crear y modificar **objetos y campos** en runtime sin tocar archivos JSON ni correr comandos.

> **Detalle completo en** [programmatic-objects.md](programmatic-objects.md). Aqui se resumen las operaciones clave.

### Flujo

```text
  Cliente (script/API)         Object Manager          Filesystem       Pipeline
          │                          │                      │               │
          │─mutation createObject────>                      │               │
          │  Definition(...)         │                      │               │
          │                          │─Valida + crea en─────│               │
          │                          │  core_ObjectDefinition│               │
          │                          │─Escribe JSON──────────>               │
          │                          │  en objects/business/ │               │
          │                          │─Crea 4 capabilities───│               │
          │                          │  RBAC                 │               │
          │                          │─applyChanges()────────────────────────>
          │                          │                       │               │─codegen →────┐
          │                          │                       │               │  db push →   │
          │                          │                       │               │  prisma gen  │
          │                          │                       │               │<─────────────┘
          │                          │<──Server restart automatico───────────│
          │                          │   (~5-30 segundos)    │               │
          │<─Objeto disponible────────                       │               │
          │   en GraphQL API         │                       │               │
```

### Operaciones

| Mutation | Que hace |
|----------|----------|
| `createObjectDefinition(name, fields, label, ...)` | Crea objeto + tabla + API + RBAC |
| `updateObjectDefinition(name, label, ...)` | Modifica metadatos |
| `deleteObjectDefinition(id)` | Elimina cascada completa |
| `createCustomField(objectDefinitionId, name, fieldType, ...)` | Agrega campo |
| `updateCustomField(id, newName, fieldType, ...)` | Modifica campo |
| `deleteCustomField(id)` | Elimina campo |
| `createObjectValidation(data: { formula, errorMessage })` | Validacion con FormulaJS |
| `updateJsonSchema(fieldDefinitionId, schema)` | Schema JSON para campos json |

### Restriccion de source

| Source | Crear via API | Modificar | Eliminar |
|--------|--------------|-----------|----------|
| `Tenant` | Si | Si | Si |
| `Business` (de mods) | No | No | No |
| `System` | No | No | No |

> Los objetos de mods son **read-only** via API. Solo objetos creados via API/UI (`source: 'Tenant'`) son modificables programaticamente.

---

## 4. Nivel 3: Import masivo (Excel/CSV y bulk)

### Import via archivo (Excel/CSV)

Wizard de 4 pasos:

```text
      Cliente                    Object Manager
         │                             │
         │─POST /upload (.xlsx/.csv)──>│
         │<──{ filePath }──────────────│
         │                             │
         │─mutation previewImport──────>
         │  (filePath, objectName)     │
         │<──{ headers, rowCount,──────│
         │    detectedFKs }            │
         │                             │
         │─mutation importInstances────>
         │  (filePath, objectName,     │
         │   mapping)                  │
         │                             │
         │    ┌──────────────────────────────────────────────┐
         │    │ ≤500 filas:                                   │
         │    │   <──Resultado inmediato (sincrono)──────────  │
         │    │                                               │
         │    │ >500 filas:                                   │
         │    │   <──{ jobId } (asincrono)──────────────────  │
         │    │   loop Polling:                               │
         │    │     ──query importStatus(jobId)──────────── > │
         │    └──────────────────────────────────────────────┘
         │                             │
         │<──{ totalProcessed,─────────│
         │    successCount,            │
         │    failedCount, rows[] }    │
```

Validaciones automaticas: campos requeridos, tipos, FK referencial, unicidad, formulas. El Excel de errores es **reimportable**.

### Mutations bulk (sin archivo)

```graphql
# Crear masivo (array de datos)
mutation {
  importInstances(objectName: "Person", data: [
    { firstName: "Ana", lastName: "Lopez" },
    { firstName: "Carlos", lastName: "Perez" }
  ], mode: "create") {
    totalProcessed
    successCount
    failedCount
    rows { rowIndex status errors }
  }
}

# Actualizar masivo (mismos datos a multiples IDs)
mutation {
  updateBulkInstances(objectName: "Person", ids: ["id1", "id2"], data: { isActive: false }) {
    successCount
    failedCount
  }
}

# Eliminar masivo
mutation {
  deleteBulkInstances(objectName: "Person", ids: ["id1", "id2"]) {
    successCount
    failedCount
  }
}
```

> **Nota (UPONE-1382):** si el objeto declara hijos en su metadata (`polymorphicChildren`/`directChildren`), `deleteInstance`/`deleteBulkInstances` cascadan el borrado a esos hijos o lo bloquean con un mensaje semantico si hay referencias externas, en vez de fallar con un error de constraint de base de datos. Para anticipar el impacto antes de eliminar, usa la query `deleteImpactPreview(objectType, ids)` (read-only). Ver `features/delete-cascade.md`.

### Limites

| Parametro | Valor |
|-----------|-------|
| JSON body max | 100KB |
| Umbral sync/async | 500 filas (configurable via `IMPORT_SYNC_THRESHOLD`) |
| Rate limiting | No configurado actualmente |

---

## 5. Nivel 4: Seeds (poblacion inicial desde mods)

Datos de referencia y demo que se ejecutan durante `npm run sync` (fase 8) o manualmente.

### Seeds planos (auto-ejecutados)

```javascript
// mods/mi-mod/seed/config-seeds.js
export default [
  {
    objectName: 'MiObjeto',
    uniqueKey: { nombre: 'Item Default' },
    data: { nombre: 'Item Default', estado: 'ACTIVO', puntuacion: 50 }
  }
];
```

Se ejecutan automaticamente en fase 8 del sync. Logica upsert: si el registro ya existe (por `uniqueKey`), se actualiza; si no, se crea.

### Seeds relacionales (ejecucion manual)

Para datos con FK entre objetos — requiere que los objetos padre ya existan:

```javascript
// mods/mi-mod/seed/_populate-relations.js
const childSeeds = [
  {
    parentObject: 'miPadre',
    parentWhere: { nombre: 'Padre A' },
    childObject: 'miHijo',
    uniqueKey: { nombre: 'Hijo 1' },
    data: { nombre: 'Hijo 1', puntuacion: 80 }
  }
];
```

Prefijo `_` = excluido de auto-ejecucion. Ejecutar manualmente:

```bash
node mods/mi-mod/seed/_populate-relations.js
```

### Seeds vs GraphQL API

```text
  ┌──────────────────────────────────┐   ┌──────────────────────────────────┐
  │      Seeds (Prisma directo)      │   │          GraphQL API              │
  │                                  │   │                                  │
  │  ┌────────────────────────────┐  │   │  ┌─────────────────────────────┐ │
  │  │   seed/config-seeds.js    │  │   │  │  createInstance mutation    │ │
  │  └──────────────┬─────────────┘  │   │  └──────────────┬──────────────┘ │
  │                 │ Prisma Client   │   │                 │ Object Manager  │
  └─────────────────┼─────────────────┘   └─────────────────┼────────────────┘
                    │                                        │
                    └──────────────────┬─────────────────────┘
                                       ▼
                              ┌─────────────────┐
                              │   (PostgreSQL)  │
                              └─────────────────┘
```

| Aspecto | Seeds | GraphQL API |
|---------|-------|-------------|
| Ejecuta | En el servidor (filesystem) | Remoto (HTTP) |
| Autenticacion | Ninguna (Prisma directo) | JWT / service token |
| RBAC | No aplica | Si (withAuth) |
| Eventos | No dispara | Si (withEventPublish) |
| Validaciones | Solo las de Prisma (tipos, constraints) | Completas (formulas, RBAC, FK) |
| Uso ideal | Datos iniciales, config, demo | CRUD normal, integraciones |

---

## 6. Nivel 5: Flows programaticos (n8n)

n8n es el motor de automatizacion de uP1. Permite crear workflows que reaccionan a eventos, ejecutan CRUD, envian notificaciones, y se integran con servicios externos.

### Arquitectura

```text
  ┌──────────────────────────────────────────────────────────────────┐
  │  uP1                                                             │
  │                                                                  │
  │  ┌───────────────────┐   withEventPublish   ┌────────────────┐  │
  │  │  GraphQL Mutation │──────────────────────>│    (Redis)     │  │
  │  └───────────────────┘                       └───────┬────────┘  │
  │                                                      │           │
  │                               ┌──────────────────────┤           │
  │                               │ Pub/Sub              │ Pub/Sub   │
  │                               ▼                      ▼           │
  │                     ┌──────────────────┐    ┌──────────────┐    │
  │                     │  BullMQ Queue    │    │  n8n Flow    │    │
  │                     └────────┬─────────┘    │  Engine      │    │
  └──────────────────────────────┼──────────────└──────┬───────┘────┘
                                 ▼                     │
                      ┌──────────────────┐             ▼
                      │Worker (reintentos│   ┌──────────────────────────────┐
                      └──────────────────┘   │ n8n Flow Engine              │
                                             │                              │
                                             │ ┌────────────────────────┐  │
                                             │ │Up1Event Triggers       │  │
                                             │ │(Create/Update/Delete)  │  │
                                             │ └───────────┬────────────┘  │
                                             │             │               │
                                             │ ┌───────────┼────────────┐  │
                                             │ ▼           ▼            ▼  │
                                             │ ┌──────┐ ┌──────┐ ┌──────┐  │
                                             │ │Up1   │ │Up1   │ │Up1   │  │
                                             │ │Form  │ │Notif-│ │Send  │  │
                                             │ │Object│ │icat. │ │Email │  │
                                             │ └──┬───┘ └──────┘ └──────┘  │
                                             │    │  ┌──────┐  ┌─────────┐ │
                                             │    │  │HTTP  │  │700+     │ │
                                             │    │  │Req.  │  │nodos n8n│ │
                                             │    │  └──────┘  └─────────┘ │
                                             └────┼────────────────────────┘
                                                  ▼
                                          ┌──────────────┐
                                          │ (PostgreSQL) │
                                          └──────────────┘
```

### 6 nodos custom de uP1

| Nodo | Tipo | Que hace |
|------|------|----------|
| **Up1EventCreate** | Trigger | Escucha creacion de registros via Redis Pub/Sub |
| **Up1EventUpdate** | Trigger | Escucha actualizacion |
| **Up1EventDelete** | Trigger | Escucha eliminacion |
| **Up1EventTrigger** | Trigger | Suscripcion generica con wildcards |
| **Up1FormObject** | Action | CRUD directo a PostgreSQL (SELECT, INSERT, UPDATE) |
| **Up1Notification** | Action | Envia notificaciones multi-canal |
| **Up1SendEmail** | Action | Email via AWS SES |

### Up1FormObject — CRUD directo a BD

Permite leer y escribir datos sin pasar por GraphQL:

```
Operaciones:
  - List: SELECT con filtros (tabla, columnas, filtros)
  - Read: SELECT por ID
  - Create: INSERT
  - Update: UPDATE por ID

Configuracion:
  - Table: dropdown dinamico desde pg_catalog
  - Columns: dropdown dinamico
  - Filters: field, operator, value
```

> **Atencion:** Up1FormObject bypasea GraphQL, RBAC y eventos. Usar solo cuando se necesita performance de SQL directo o acceso a tablas internas no expuestas via GraphQL.

### Ejemplo: workflow de notificacion ante inscripcion

```text
  ┌─────────────────────────────────┐     ┌────────────────────────────────┐
  │         Up1EventCreate          │     │        Up1Notification         │
  │  objectType: OfferingEnrollment │────>│  operation: send               │
  │  tenantId: UPU                  │     │  channels: [inapp]             │
  └─────────────────────────────────┘     │  title: Nueva inscripcion      │
                                          └────────────────────────────────┘
```

**Flujo:** alumno se inscribe → mutation createInstance → withEventPublish → Redis Pub/Sub → n8n Up1EventCreate → Up1Notification in-app.

### Ejemplo: ETL periodico con schedule

```text
  ┌──────────────────────┐     ┌─────────────────────────┐     ┌──────────────────┐
  │   Schedule Trigger   │     │      Up1FormObject       │     │    Function      │
  │  cron: 0 6 * * 1-5  │────>│  List: Person            │────>│ transformar datos│
  └──────────────────────┘     │  filters: isActive=true  │     └────────┬─────────┘
                               └─────────────────────────┘              │
                                                                         ▼
                                                               ┌──────────────────────┐
                                                               │     HTTP Request      │
                                                               │ POST a sistema externo│
                                                               └──────────────────────┘
```

### Definir workflows en mods

Los workflows se definen como JSON en `mods/{mod}/flows/` y se sincronizan a n8n en fase 9 del sync:

```
1. Disenar en n8n UI (localhost:5678) visualmente
2. Exportar: menu → Download (o GET /rest/workflows/:id)
3. Limpiar campos auto-generados: id, createdAt, updatedAt, versionId
4. Guardar en flows/{nombre-descriptivo}.json
5. npm run sync → fase 9 sube a n8n via REST API
```

---

## 7. Autenticacion headless

Para interactuar programaticamente sin browser.

### Mecanismos disponibles

```text
  ┌─────────────────┐
  │ Request entrante│
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ userExtractor.js│
  └────────┬────────┘
           ▼
  ┌──────────────────────────┐
  │ UP1_FLOW_SERVICE_TOKEN?  │
  └──────┬────────────┬───────┘
         │ Match      │ No
         ▼            ▼
  ┌──────────────┐  ┌────────────────────────────┐
  │Service Account│  │  STORYBOOK_STATIC_TOKEN?   │
  │isServiceAccount│  │       (solo dev)           │
  │: true         │  └──────┬────────────┬─────────┘
  │RBAC bypass    │         │ Match      │ No
  │completo       │         ▼            ▼
  └──────────────┘  ┌──────────────┐  ┌──────────────────────┐
                    │  Mock User   │  │  RBAC_TEST_MODE?     │
                    │  busca por   │  │      (solo dev)       │
                    │ STORYBOOK_   │  └──────┬────────┬────────┘
                    │ MOCK_EMAIL   │         │ true   │ No
                    └──────────────┘         ▼        ▼
                                    ┌──────────┐  ┌──────────────────┐
                                    │Test User │  │    Clerk JWT     │
                                    │profile.  │  │(verificacion JWKS│
                                    │manager@  │  │                  │
                                    │uplanner.cl  └──────────────────┘
                                    └──────────┘
```

| Mecanismo | Entorno | RBAC | Uso |
|-----------|---------|------|-----|
| **UP1_FLOW_SERVICE_TOKEN** | Produccion + dev | Bypass completo | n8n, automatizacion, scripts |
| **Clerk JWT** | Produccion + dev | Completo | Frontend, integraciones con auth |
| **STORYBOOK_STATIC_TOKEN** | Solo dev | Por usuario mock | Storybook, testing visual |
| **RBAC_TEST_MODE=true** | Solo dev | Simulado | Desarrollo local sin Clerk |

### Service account (produccion)

Para scripts, cron jobs, o integraciones externas:

```bash
# Request con service token
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: UPU" \
  -H "Authorization: Bearer $UP1_FLOW_SERVICE_TOKEN" \
  -d '{"query": "{ listInstances(objectName: \"Person\", limit: 5) { instances totalCount } }"}'
```

**Importante:** el service token bypasea RBAC completamente — sin checkCapability, sin checkObjectPermissions, sin checkFieldPermissions, sin businessContextFilter. Usar con precaucion.

### Session bridge (n8n)

Para que usuarios de uP1 accedan a n8n sin login separado:

```text
  Usuario (Suite)          Object Manager                n8n
        │                        │                        │
        │─Accede a───────────────>                        │
        │  /UPU/N8nWorkflow       │                        │
        │                         │─Valida JWT de Clerk────│
        │                         │   (interno)            │
        │                         │─Login headless────────>│
        │                         │  (N8N_MEMBER_EMAIL/    │
        │                         │   PASSWORD)            │
        │                         │<──Cookie n8n-auth──────│
        │<──Redirect con cookie───│                        │
        │   Usuario autenticado   │                        │
        │   en n8n                │                        │
```

Jerarquia de credenciales:
1. Member por tenant: `N8N_MEMBER_EMAIL_{TENANT_ID}` / `PASSWORD_{TENANT_ID}`
2. Member UPU fallback: `N8N_MEMBER_EMAIL_UPU` / `PASSWORD_UPU`
3. Admin global: `N8N_ADMIN_EMAIL` / `N8N_ADMIN_PASSWORD`

### API keys de n8n

| Mecanismo | Persistencia | Rotacion |
|-----------|-------------|----------|
| `N8N_API_KEY` (env var) | Estatica | Manual |
| flowService (automatico) | Cache + core_SystemConfig + n8n REST API | Cada 7 dias |

Si `N8N_ADMIN_EMAIL`/`PASSWORD` estan disponibles, flowService genera y rota API keys automaticamente sin necesidad de configurar `N8N_API_KEY`.

---

## 8. Guia de decision: que mecanismo usar

```text
  ┌──────────────────────────────┐
  │ Necesito interactuar         │
  │ programaticamente            │
  └──────────────┬───────────────┘
                 ▼
         ┌───────────────┐
         │  Que necesito?│
         └───┬───┬───┬───┘
             │   │   │   └─────────────────────────────────────────────────┐
             │   │   │                                                      │
     Crear/  │   │   │ Crear/editar    Datos iniciales    Reaccion a eventos
     editar  │   │   │ objetos/campos  de un mod          o tarea periodica
     registros   │   │      │               │                   │
             │   │   │      ▼               ▼                   ▼
             │   │   │  ┌──────────┐  ┌──────────┐      ┌──────────────┐
             │   │   │  │ Nivel 2  │  │ Nivel 4  │      │   Nivel 5    │
             │   │   │  │createObj-│  │  Seeds   │      │  Flows n8n  │
             │   │   └──│ ectDefin.│  └──────────┘      └──────────────┘
             │   │      └──────────┘
             ▼
     ┌───────────────┐
     │   Cuantos?    │
     └───┬───┬───┬───┘
         │   │   │
        1-50 │  >500
         │  50-500  │
         ▼   │      ▼
  ┌──────────┐│ ┌──────────────────┐
  │ Nivel 1  ││ │    Nivel 3       │
  │ GraphQL  ││ │importInstances   │
  │ mutations││ │    async         │
  └──────────┘│ └──────────────────┘
              ▼
      ┌───────────────┐
      │    Origen?    │
      └───┬───────┬───┘
          │       │
    Array en    Archivo
    codigo      Excel/CSV
          │       │
          ▼       ▼
  ┌────────────┐ ┌──────────────────┐
  │  Nivel 3   │ │     Nivel 3      │
  │importInst. │ │ POST /upload     │
  │   sync     │ │   + import       │
  └────────────┘ └──────────────────┘
```

### Tabla de decision

| Escenario | Mecanismo | Ejemplo |
|-----------|-----------|---------|
| Script que crea 5 registros | Nivel 1: `createInstance` individual | Script de setup de demo |
| Carga inicial de 200 personas desde CSV | Nivel 3: upload + `importInstances` | Migracion de datos |
| Carga de 10,000 registros | Nivel 3: `importInstances` async | Import masivo |
| Admin crea nueva entidad "Beca" sin codigo | Nivel 2: `createObjectDefinition` | Configuracion en produccion |
| Mod necesita datos de referencia al instalarse | Nivel 4: seeds (`config-seeds.js`) | Catalogos, configuracion |
| Enviar notificacion cuando se crea inscripcion | Nivel 5: flow n8n (Up1EventCreate → Up1Notification) | Automatizacion |
| ETL diario a sistema externo | Nivel 5: flow n8n (Schedule → Up1FormObject → HTTP) | Integracion |
| Actualizar campo en todos los registros activos | Nivel 3: `updateBulkInstances` | Migracion de datos |
| Leer datos para reporte externo | Nivel 1: `listInstances` con filtros | Reporting |

---

## 9. Ejemplos end-to-end

### Ejemplo 1: Script de carga masiva (Node.js)

```javascript
// load-persons.js — carga headless con service token
const GRAPHQL_URL = 'http://localhost:4000/graphql';
const TOKEN = process.env.UP1_FLOW_SERVICE_TOKEN;
const TENANT = 'UPU';

async function graphql(query, variables = {}) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-ID': TENANT,
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

// Crear individual
const person = await graphql(`
  mutation($data: JSON!) {
    createInstance(objectName: "Person", data: $data) { id firstName }
  }
`, { data: { firstName: 'Ana', lastName: 'Lopez', email: 'ana@uni.cl' } });

// Crear masivo
const bulk = await graphql(`
  mutation($data: [JSON!]!) {
    importInstances(objectName: "Person", data: $data, mode: "create") {
      totalProcessed successCount failedCount
      rows { rowIndex status errors }
    }
  }
`, { data: [
  { firstName: 'Carlos', lastName: 'Perez' },
  { firstName: 'Maria', lastName: 'Garcia' }
]});

// Listar con filtros
const persons = await graphql(`
  query {
    listInstances(objectName: "Person", filters: [
      { field: "isActive", operator: "EQUALS", value: "true" }
    ], limit: 100) { instances totalCount }
  }
`);
```

### Ejemplo 2: Workflow n8n — sync diario a sistema externo

```json
{
  "name": "[MiMod] Sync Diario a CRM",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{ "field": "cronExpression", "expression": "0 6 * * 1-5" }]
        }
      }
    },
    {
      "name": "Fetch Personas Activas",
      "type": "n8n-nodes-base.up1FormObject",
      "parameters": {
        "operation": "list",
        "table": "Person",
        "columns": ["id", "firstName", "lastName", "email"],
        "filters": [{ "field": "isActive", "operator": "EQUALS", "value": "true" }]
      }
    },
    {
      "name": "Enviar a CRM",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://crm.example.com/api/contacts/batch",
        "body": "={{ $json }}"
      }
    }
  ],
  "connections": {
    "Schedule Trigger": { "main": [[{ "node": "Fetch Personas Activas" }]] },
    "Fetch Personas Activas": { "main": [[{ "node": "Enviar a CRM" }]] }
  }
}
```

### Ejemplo 3: Seed con datos relacionales

```javascript
// mods/mi-mod/seed/_populate-demo.js
import tenantManager from '../../object-manager/src/services/tenantManager.js';

const tenants = tenantManager.getRegisteredTenants();

for (const tenantId of tenants) {
  const prisma = tenantManager.getClient(tenantId);

  // Upsert padre
  const padre = await prisma.miPadre.upsert({
    where: { tenantId_nombre: { tenantId, nombre: 'Padre Demo' } },
    update: {},
    create: { nombre: 'Padre Demo', tenantId }
  });

  // Upsert hijo con FK al padre
  await prisma.miHijo.upsert({
    where: { tenantId_nombre: { tenantId, nombre: 'Hijo Demo' } },
    update: {},
    create: {
      nombre: 'Hijo Demo',
      tenantId,
      miPadre: { connect: { id: padre.id } }
    }
  });

  console.log(`Seed completo para tenant ${tenantId}`);
}
```

---

## 10. Restricciones y limites

### Que SI se puede hacer programaticamente

| Accion | Mecanismo | Notas |
|--------|-----------|-------|
| CRUD de registros | GraphQL mutations | Cualquier objeto, con RBAC |
| Crear objetos en runtime | `createObjectDefinition` | Solo `source: 'Tenant'` |
| Import masivo | `importInstances` | Sync ≤500, async >500 |
| Poblar datos iniciales | Seeds | Prisma directo, sin RBAC |
| Automatizar con eventos | n8n flows | Fire-and-forget via Redis |
| SQL directo (lectura/escritura) | Up1FormObject (n8n) | Sin RBAC ni eventos |
| Notificaciones programaticas | Up1Notification (n8n) | Multi-canal |

### Que NO se puede (o no se debe)

| Restriccion | Detalle |
|-------------|---------|
| Modificar objetos de mods via API | `source: 'Business'` es read-only. Editar JSON + sync |
| Modificar objetos del sistema | `source: 'System'` es read-only |
| Editar campos base (`isBaseField: true`) | Solo custom fields son editables via API |
| Acceder a BD directamente desde componentes Vue | Siempre via GraphQL (Apollo Client) |
| Ejecutar SQL arbitrario desde GraphQL | Solo Up1FormObject en n8n |
| Bypass de multi-tenant | `tenantId` es obligatorio en todo — incluso service accounts operan dentro de un tenant |

### Limites conocidos

| Parametro | Valor |
|-----------|-------|
| JSON body max | 100KB |
| Import sync threshold | 500 filas |
| Pipeline applyChanges | 5-30 segundos de downtime |
| Service token | Global (sin scoping por tenant/objeto) |
| API key n8n | Rotacion cada 7 dias (automatica) |
| Up1FormObject | Sin transacciones, sin RBAC, sin eventos |

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-04-14 | Documento inicial: guia completa de interaccion programatica — 5 niveles, autenticacion headless, guia de decision, ejemplos end-to-end |
