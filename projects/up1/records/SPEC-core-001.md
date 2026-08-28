---
id: SPEC-core-001
project: up1
type: doc
module: core
tags:
  - up1
  - object-manager
  - graphql
  - prisma
  - postgresql
  - multi-tenant
  - codegen
  - resolvers
  - crud
  - eventos
  - rbac
  - bulk-import
  - mods
  - schema-driven
---

# Object Manager de uP1 — Guia completa

## Indice

1. [Que es el Object Manager](#1-que-es-el-object-manager)
2. [Stack tecnico](#2-stack-tecnico)
3. [Arquitectura y flujo de datos](#3-arquitectura-y-flujo-de-datos)
4. [Schema-driven development](#4-schema-driven-development)
5. [Objetos de negocio](#5-objetos-de-negocio)
6. [Codegen: el motor de generacion](#6-codegen-el-motor-de-generacion)
7. [API GraphQL generada](#7-api-graphql-generada)
8. [Arquitectura multi-tenant](#8-arquitectura-multi-tenant)
9. [RBAC y permisos](#9-rbac-y-permisos)
10. [Sistema de eventos](#10-sistema-de-eventos)
11. [Interaccion con mods](#11-interaccion-con-mods)
12. [Carga de datos e integraciones](#12-carga-de-datos-e-integraciones)
13. [Metadatos estilo Salesforce](#13-metadatos-estilo-salesforce)
14. [Estructura de archivos](#14-estructura-de-archivos)
15. [Comandos de referencia](#15-comandos-de-referencia)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Que es el Object Manager

El Object Manager es la **piedra angular** de uP1. Es el backend centralizado que sirve como **unica fuente de verdad** para todos los datos y logica de negocio de la plataforma.

### Responsabilidades

- **API GraphQL unica**: toda operacion de datos pasa por aqui
- **Generador de esquemas**: crea modelos Prisma y tipos GraphQL desde JSONs
- **Gestor multi-tenant**: aislamiento completo de datos por cliente
- **Hub de extensiones**: integra objetos y logica custom de mods
- **Motor de eventos**: dispara eventos asincronicos ante cambios de datos
- **Procesador batch**: importacion masiva de datos con validacion

### Principio fundamental

**Ningun workspace accede a PostgreSQL directamente.** Todo pasa por el Object Manager via GraphQL:

```text
┌─────────┐
│  Suite  │ ──┐
└─────────┘   │
┌─────────┐   │   ┌───────────────────────┐   ┌─────────────┐
│ Layout  │ ──┼──>│   Object Manager      │──>│ (PostgreSQL)│
└─────────┘   │   │       GraphQL         │   └─────────────┘
┌─────────┐   │   └───────────────────────┘
│  Flow   │ ──┤
└─────────┘   │
┌─────────┐   │
│  YUPI   │ ──┘
└─────────┘
```

---

## 2. Stack tecnico

| Componente | Tecnologia |
|-----------|------------|
| Runtime | Node.js 22.12+ |
| API | GraphQL (Apollo Server 5) |
| Base de datos | PostgreSQL 14+ |
| ORM | Prisma (generado automaticamente) |
| Procesamiento async | BullMQ + Redis |
| Testing | Vitest (422+ tests) |
| Motor de formulas | hot-formula-parser (399 funciones Excel) |
| Autenticacion | Auth0 / Clerk JWT |

---

## 3. Arquitectura y flujo de datos

### Diagrama general

```
                    ┌─────────────┐
                    │    Suite    │
                    │  (Nuxt 4)  │
                    └──────┬──────┘
                           │ GraphQL + X-Tenant-ID
                           ▼
┌──────────────────────────────────────────────────────┐
│                   OBJECT MANAGER                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  GraphQL    │  │   Codegen    │  │   Sync      │ │
│  │  Resolvers  │  │   Engine    │  │   Manager   │ │
│  │  (CRUD +   │  │  (JSON→     │  │  (9 fases)  │ │
│  │   custom)  │  │   Prisma+   │  │             │ │
│  │            │  │   GraphQL)  │  │             │ │
│  └──────┬─────┘  └─────────────┘  └─────────────┘ │
│         │                                           │
│  ┌──────┴──────┐  ┌──────────────┐  ┌────────────┐ │
│  │   Prisma    │  │    Event     │  │   Tenant   │ │
│  │   Client    │  │   System     │  │   Manager  │ │
│  │  (por       │  │  (BullMQ)    │  │  (por DB)  │ │
│  │   tenant)   │  │              │  │            │ │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘ │
└─────────┼────────────────┼─────────────────┼────────┘
          │                │                 │
          ▼                ▼                 ▼
    PostgreSQL          Redis           PostgreSQL
    (por tenant)       (BullMQ)        (otro tenant)
```

### Flujo de una operacion tipica

```text
  Frontend       Apollo Server  TenantManager    Resolver      PostgreSQL     BullMQ     Worker/n8n
     │                │               │              │               │            │           │
     │─Mutation+──────>               │              │               │            │           │
     │  X-Tenant-ID   │               │              │               │            │           │
     │                │─Resolver───-->│              │               │            │           │
     │                │    tenant     │              │               │            │           │
     │                │               │─Prisma──────>│               │            │           │
     │                │               │  client      │               │            │           │
     │                │               │              │─Query/────────>            │           │
     │                │               │              │  mutation      │            │           │
     │                │               │              │<──Resultado────│            │           │
     │                │               │              │─withEventPublish()──────────>           │
     │<─Respuesta GraphQL──────────────────────────  │               │            │           │
     │                │               │              │               │            │─Evento────>
     │                │               │              │               │            │  asincrono│
```

---

## 4. Schema-driven development

Los objetos JSON son la **fuente de verdad**. Todo lo demas se genera automaticamente:

```text
  ┌────────────────────┐
  │   JSON definition  │
  │      objects/      │
  └──────────┬─────────┘
             │
     ┌───────┴────────┐
     ▼                ▼
┌──────────────┐  ┌──────────────┐
│ Prisma schema│  │ GraphQL types│
└──────┬───────┘  └──────┬───────┘
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│  (PostgreSQL │  │CRUD resolvers│
│   tables)    │  │              │
└──────────────┘  └──────────────┘
```

### Reglas inquebrantables

- **NUNCA** editar `prisma/schema.prisma` — es generado por codegen
- **NUNCA** editar `src/graphql/typeDefs/dynamic.js` — es generado
- **NUNCA** escribir SQL crudo — usar Prisma
- Para agregar campo: modificar JSON → codegen → migrate

---

## 5. Objetos de negocio

### Tipos de objetos

| Tipo | Ubicacion | Alcance | Ejemplo |
|------|-----------|---------|---------|
| **Core** | `objects/core/` | Infraestructura de la plataforma | `core_ObjectDefinition`, `core_Capability`, `core_Role`, `core_DataLog`, `core_ModRole`, `core_ServiceAccount`, `core_Translation` |
| **Base** | `objects/business/Base/` | Compartidos por todos los tenants | `Person`, `Institution`, `Course` |
| **Extended** | `objects/business/Extended/` | Campos custom por tenant | `ext__uplanner__person` |
| **Tenant-specific** | `objects/tenants/{TENANT}/Base/` | Solo existen para un tenant | `ResearchProject` (solo UPU) |
| **Mod** | `mods/{mod}/objects/` | Aportados por mods (→ sync a business/) | `HwAssessment`, `TimeBlockTemplate` |

> Las tres categorias (core / base / extended) comparten hoy **un solo emisor de columnas** en el codegen: `src/services/codegen/helpers/prisma-field-emitter.js` (`resolveFieldColumn`, `buildEnumDef`, `formatDefaultValue`). Antes de UPONE-1366 cada path tenia su propio switch de tipos, convencion de enum y formateo de `@default(...)`, con divergencias silenciosas; se unificaron con la garantia de que los schemas de los objetos existentes quedan byte-identicos (refactor puro). Los objetos core ganaron enums nativos de Prisma por primera vez.

> **Vocabulario unico de tipos (UPONE-1386)**: `src/services/typeMappers.js` es la fuente unica del vocabulario de tipos de campo (normalizacion, mapeo a Prisma, mapeo a JSON Schema, deteccion de tipo de PK). Antes del cambio, codegen Prisma/GraphQL y los resolvers de metadata tenian mapeos de tipo dispersos y podian divergir silenciosamente. Hoy lo consumen `generatePrismaSchema.js`, `prisma-field-emitter.js`, `objectDefinition.resolver.js` (`getFieldTypeVocabulary`, fuente del selector de tipo en UP1 Manager), `fieldDefinition.resolver.js`, `instance.resolver.js`, `formulaValidator.js`, `fileParsing.js`, `customFields.js` y `bulkValidationService.js`. Un tipo nuevo o un cambio de mapeo se declara una sola vez ahi.

### Objetos base de la plataforma (16+)

```
objects/business/Base/
├── academicPeriod.json
├── affiliation.json
├── campus.json
├── career.json
├── course.json
├── curriculum.json
├── department.json
├── faculty.json
├── institution.json
├── person.json
├── profile.json
├── role.json
├── shift.json
├── tenant.json
├── tenantidentity.json
└── timeBlock.json
```

### Estructura de un objeto JSON

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Institution",
  "type": "object",
  "metadata": {
    "label": "Institucion",
    "labelPlural": "Instituciones",
    "gender": "femenino",
    "description": "Entidad educativa que ofrece programas academicos",
    "defaultLayout": "institution_default_layout",
    "objectName": "Institution"
  },
  "properties": {
    "name": {
      "type": "string",
      "title": "Nombre",
      "not_null": true
    },
    "code": {
      "type": "string",
      "title": "Codigo"
    }
  },
  "required": ["name", "tenantId"]
}
```

### Campos comunes (automaticos)

Los objetos de **negocio** (Base, Extended y tenant-specific) heredan campos de `objects/business/common.json`:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | String | UUID generado automaticamente |
| `createdAt` | DateTime | Fecha de creacion |
| `updatedAt` | DateTime | Fecha de actualizacion |
| `createdBy` | String | Usuario que creo |
| `updatedBy` | String | Usuario que actualizo |
| `tenantId` | String | ID del tenant |

No necesitas declararlos — se agregan automaticamente por el codegen.

> **Los objetos core NO mergean `common.json`** (verificado en codigo, UPONE-1366). Un objeto de `objects/core/` declara sus campos explicitamente y usa `id Int @id @default(autoincrement())`, no el UUID `String` de negocio. Ejemplo: `core_DataLog` declara su propio `createdAt` y su `id` es entero autoincremental. Al mover un objeto de negocio a core (como paso con DataLog: `objects/business/Base/datalog.json` → `objects/core/core_DataLog.json`), cambia la estrategia de PK (String cuid → Int autoincrement), se pierde el merge de `common.json` (`updatedById` desaparece) y deja de admitir extension via `ext__` (la tabla 1:1 de custom fields por tenant).

> **Retiro del subsistema de workflow relacional (UPONE-1459)**: los 4 objetos JSON del workflow relacional de `Activity` (y sus FKs `workflowId`/`currentStatusId`) fueron eliminados del objeto base (`objects/business/Base/activity.json:206`, comentario en codigo). `Activity` gobierna su estado con el motor de enum declarativo de core (transiciones en `transitions`, enforcement en `enforceEnumTransitions` durante `updateInstance`) desde UPONE-1381. Este ticket es limpieza de deuda source-only; el drop de columnas en BD se coordina por tenant en deploy. Ver `features/enum-transitions.md` para el motor de enum completo — no se duplica aca.

### Extended objects (campos custom por tenant)

Para agregar campos que solo existen en un tenant sin modificar el objeto base:

```
objects/business/Extended/ext__uplanner__institution.json
```

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ext__uplanner__institution",
  "type": "object",
  "properties": {
    "accreditationStatus": {
      "type": "string",
      "enum": ["Accredited", "Pending", "Not Accredited"]
    },
    "customField1": {
      "type": "string",
      "description": "Campo custom para institucion"
    }
  }
}
```

Naming: `ext__<CLIENT_CODE>__<objectName>.json`

El codegen genera:
- Tabla separada `ext__uplanner__institution` con relacion 1:1 al objeto base
- Tipo GraphQL extendido con los campos custom

### Field transformations declaradas (UPONE-1263)

Un campo string del objeto JSON puede declarar `transformations: [{ "type": "trim" }]` (ej. `Instructor.instructorCode`). `src/graphql/resolvers/helpers/schemaTransformations.js` (`applyFieldTransformations`) las aplica in-place antes de persistir en `createInstance`/`updateInstance`, consumido desde `instance.resolver.js`. Hoy solo `trim` esta implementado; cualquier otro tipo declarado (por ejemplo un futuro `uppercase`) es un no-op explicito, no un error silencioso. Antes de este fix la propiedad `transformations` se declaraba en el JSON pero nunca se ejecutaba, por lo que espacios en blanco sorteaban validaciones `unique:true`.

### Cascade opcional en Extended (`baseRelation.onDelete`)

Un JSON de `objects/business/Extended/` puede declarar `"baseRelation": { "onDelete": "Cascade" }` para que Prisma borre la fila de extension junto con la fila base. El default (sin declararlo) es sin cascade — comportamiento historico. `src/services/codegen/generatePrismaSchema.js:607-608` lee `extSchema?.baseRelation?.onDelete` y lo agrega a la relacion generada. Ver `object-manager/docs/features/delete-cascade.md` para el motor de cascade completo (este flag es un caso puntual de la relacion 1:1 base-extension, no el motor polymorphic/direct de esa doc).

---

## 6. Codegen: el motor de generacion

### Que hace `npm run codegen`

En una sola ejecucion:

1. **Escanea** todos los `.json` en `objects/business/Base/`
2. **Aplica** metadatos desde `metadata.json` a cada objeto
3. **Agrega** campos comunes de `common.json` (si no existen ya)
4. **Registra** objetos nuevos en BD (`core_ObjectDefinition`)
5. **Regenera** `prisma/schema.prisma` completo (modelos base + extended + relaciones)
6. **Procesa** campos custom de archivos Extended
7. **Regenera** `src/graphql/typeDefs/dynamic.js` (tipos GraphQL)
8. **Versiona** cambios en Central Schema Tracker
9. **Valida** formulas (sintaxis → campos → tipos → evaluacion)

### Caracteristicas

- **Regeneracion completa**: no es incremental, regenera todo cada vez
- **Deteccion automatica**: no necesitas registrar nuevos objetos manualmente
- **Relaciones inteligentes**: detecta FKs y genera relaciones Prisma
- **Sincronizacion dual**: Prisma y GraphQL siempre sincronizados

### Dos builders paralelos: negocio vs core (BUG-object-manager-013)

`src/services/codegen/generatePrismaSchema.js` tiene dos funciones generadoras independientes, no una sola: `generateBaseModel` (linea 342) construye los modelos de objetos de negocio y `updateBaseModelSchema` (linea 870) construye los de core. Cada una implementa su propia logica para traducir `metadata.indexes` a `@@index`: la de negocio en las lineas 588 a 618 (ejemplo en `:616`), la de core en las lineas 1012 a 1019 (ejemplo en `:1018`).

El marcador `"Auto-updated"` en la descripcion de un campo (para que el codegen respete un valor calculado y no lo pise) ahora se interpreta en AMBOS builders: negocio en `:517` (`if (fieldDef.description?.includes('Auto-updated'))`) y core en `:984`. El comentario de `:514-516` deja explicito que honra el mismo marcador que el builder de core ya interpretaba antes. Test de regresion: `tests/unit/services/codegen/generateBaseModel.auditMarker.test.js:3` (UPONE-1504).

**Leccion reusable para quien toque codegen**: al modificar logica en uno de los dos builders (indexes, marcadores, formateo de default), verificar la simetria con el otro. La duplicacion es real y no esta unificada todavia.

### Para un tenant especifico

```bash
npm run codegen              # Genera BASEMODEL (core + business compartido)
npm run codegen -- TENANT    # Genera BASEMODEL + objetos del tenant
```

### Archivos de entrada y salida

| Entrada (lee) | Salida (genera) |
|--------------|-----------------|
| `objects/business/Base/*.json` | `prisma/schema.prisma` |
| `objects/business/Extended/*.json` | `src/graphql/typeDefs/dynamic.js` |
| `objects/business/common.json` | BD: `core_ObjectDefinition` |
| `objects/business/metadata.json` | BD: `core_CentralSchemaTracker` |

---

## 7. API GraphQL generada

### Operaciones CRUD automaticas

Por cada objeto, el codegen genera estas operaciones:

| Operacion | Tipo | Descripcion |
|-----------|------|-------------|
| `listInstances` | Query | Listado con filtros, paginacion, ordenamiento |
| `getInstance` | Query | Obtener un registro por ID |
| `createInstance` | Mutation | Crear registro individual |
| `updateInstance` | Mutation | Actualizar registro |
| `deleteInstance` | Mutation | Eliminar registro |
| `importInstances` | Mutation | Carga masiva (sync ≤500, async >500) |
| `updateBulkInstances` | Mutation | Actualizacion masiva |
| `deleteBulkInstances` | Mutation | Eliminacion masiva |
| `getObjectFields` | Query | Campos de un objeto |
| `getObjectDefinitions` | Query | Objetos disponibles |
| `deleteImpactPreview` | Query | Preview read-only del impacto de un borrado (cascada + restricciones) |

### Borrado en cascada declarativo (UPONE-1382)

`deleteInstance` y `deleteBulkInstances` no son un delete generico plano. Si el objeto declara hijos en su metadata (`polymorphicChildren`, `directChildren`, `polymorphicChildrenDerived`), un motor reusable calcula el grafo de impacto antes de tocar la base de datos:

- **Gate de minimo blast radius**: solo entran al motor los objetos que declaran hijos; un objeto sin hijos sigue el path generico sin cambios.
- **Restrict generico**: si existe una referencia entrante desde fuera del subarbol, el motor bloquea todo el borrado con un mensaje semantico (nombres legibles, no ids ni nombres tecnicos de modelo).
- **Atomicidad**: el subarbol completo se borra dentro de una unica transaccion; si algo falla, hace rollback completo.
- **Auditoria per-nodo**: cada nodo del subarbol borrado queda registrado en `core_DataLog`.
- **Preview read-only**: la query `deleteImpactPreview(objectType, ids)` corre el mismo motor sin ejecutar el borrado, para alimentar confirmaciones en la UI antes de la accion destructiva.

Ver `object-manager/docs/features/delete-cascade.md` para el detalle completo.

Evidencia: `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js`, `instance.resolver.js:3842-3865,5572-5605,1211-1248`, `static.js:938-949`.

### Ejemplo: listInstances con filtros

```graphql
query {
  listInstances(
    objectName: "Person",
    filters: [
      { field: "isActive", operator: "EQUALS", value: "true" },
      { field: "lastName", operator: "CONTAINS", value: "Garcia" }
    ],
    limit: 20,
    offset: 0,
    orderBy: { field: "createdAt", direction: "desc" }
  ) {
    instances
    totalCount
  }
}
```

### Operadores de filtro disponibles

| Operador | Descripcion |
|----------|-------------|
| `EQUALS` | Igual a |
| `NOT_EQUALS` | Distinto de |
| `CONTAINS` | Contiene (texto) |
| `STARTS_WITH` | Comienza con |
| `ENDS_WITH` | Termina con |
| `GREATER_THAN` | Mayor que |
| `LESS_THAN` | Menor que |
| `GREATER_OR_EQUAL` | Mayor o igual |
| `LESS_OR_EQUAL` | Menor o igual |
| `IN` | Es uno de (lista) |
| `NOT_IN` | No es uno de |
| `IS_NULL` | Es null |
| `IS_NOT_NULL` | No es null |

**Coercion de filtro FK al tipo real de la PK (UPONE-1497)**: un campo `fieldType: "reference"` no trae tipo escalar propio, asi que filtrar por el sin coercion forzaba el valor a String — lo que rompia el filtro cuando el objeto referenciado usa PK entera (todo `core_*` usa `id Int @id @default(autoincrement())`; el resto usa `id String @id @default(cuid())`, misma convencion que aplica el codegen). `resolveReferencedIdType` en `instance.resolver.js` (~linea 791-806) deriva el tipo esperado del prefijo `core_` del objeto referenciado y coerciona el valor del filtro antes de comparar. Sin cambio de contrato GraphQL — es un fix interno del resolver de filtros.

### Ejemplo: createInstance

```graphql
mutation {
  createInstance(
    objectName: "Person",
    data: {
      firstName: "Maria",
      lastName: "Garcia",
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

### Header obligatorio

Toda request GraphQL debe incluir:

```
X-Tenant-ID: UPU
Authorization: Bearer <jwt-token>
```

Sin `X-Tenant-ID`:

```
GraphQLError: X-Tenant-ID header is required for multi-tenant routing
code: TENANT_ID_REQUIRED
```

---

## 8. Arquitectura multi-tenant

### Modelo de aislamiento

Un tenant = una institucion cliente. Cada tenant tiene:
- **Base de datos propia**: `uplanner_upu`, `uplanner_test`
- **Schema Prisma propio**: `prisma/UPU/schema.prisma`
- **Migraciones independientes**: `prisma/UPU/migrations/`
- **Seed data propio**: `prisma/UPU/seed.js`
- **Prisma client dedicado**: gestionado por TenantManager

### TenantManager

Singleton que gestiona conexiones Prisma por tenant:

```javascript
import tenantManager from './services/tenantManager.js';

const prisma = tenantManager.getClient();           // Tenant activo (de env)
const upuPrisma = tenantManager.getClient('UPU');    // Tenant especifico
const tenants = tenantManager.getRegisteredTenants(); // ['UPU', 'TEST']
```

### Estructura de almacenamiento

```
object-manager/
├── objects/
│   ├── business/               ← Compartido entre TODOS los tenants
│   │   ├── Base/               ← Person, Institution, Course...
│   │   ├── Extended/           ← Campos custom compartidos
│   │   ├── common.json         ← Campos automaticos
│   │   └── metadata.json       ← Metadatos Salesforce
│   └── tenants/                ← Objetos exclusivos de un tenant
│       ├── UPU/Base/           ← ResearchProject, Scholarship
│       └── TEST/Base/          ← LabEquipment, Experiment
│
└── prisma/
    ├── BASEMODEL/              ← Template: core + business compartido
    │   └── schema.prisma
    ├── UPU/                    ← BASEMODEL + objetos de UPU
    │   ├── schema.prisma
    │   ├── migrations/
    │   └── seed.js
    └── TEST/                   ← BASEMODEL + objetos de TEST
        ├── schema.prisma
        ├── migrations/
        └── seed.js
```

### Seguridad a nivel de BD

Aunque el GraphQL schema es combinado (tiene tipos de todos los tenants), la seguridad es natural:

```javascript
// Tenant UPU consulta ResearchProject
const upuPrisma = tenantManager.getClient('UPU');
await upuPrisma.researchProject.findMany(); // OK — tabla existe en BD de UPU

// Tenant TEST consulta ResearchProject
const testPrisma = tenantManager.getClient('TEST');
await testPrisma.researchProject.findMany(); // ERROR — tabla no existe en TEST
```

### Configuracion

```bash
# .env
DATABASE_URL_UPU=postgresql://postgres:postgres@localhost:5432/uplanner_upu
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/uplanner_test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres  # fallback
```

### Rebuild de schemas por tenant: BASEMODEL siempre primero (BUG-platform-024)

`SyncManager.js` fuerza un orden estricto al reconstruir los schemas: el Step 1 (comentario en `:342`) corre codegen sobre BASEMODEL (`:347`) y `prisma:generate` sobre BASEMODEL (`:349`) ANTES del Step 3, el loop por cada tenant (`:370-395`). Saltarse este orden deja el Prisma client de un tenant generado contra un BASEMODEL desactualizado.

Los Dockerfiles de deploy respetan el mismo orden: `object-manager/Dockerfile:39` corre el paso BASEMODEL antes del loop de tenants en `:77`; en AWS, `aws/Dockerfile.object-manager.aws:11-26` y `aws/Dockerfile.migration:19` siguen la misma secuencia.

---

## 9. RBAC y permisos

### Modelo

```
Usuario → Roles → Capabilities (permisos)
```

Multiples roles se acumulan — un usuario con Role A y Role B tiene las capabilities de ambos.

### Niveles de permisos

**Nivel de objeto:**

```
person:view    → ver registros
person:create  → crear
person:modify  → editar
person:delete  → eliminar
```

**Nivel de campo** (sobreescribe objeto):

```
person.salary:view    → ver campo salary
person.salary:modify  → editar campo salary
```

**Contextos jerarquicos:**

```
/system
  └─ /system/tenant-123
      └─ /system/tenant-123/institution-456
```

### Capabilities de mods

Cada mod define sus propios permisos en `capabilities.json`:

- Suite: `suite:*`
- Mods: `mod/<modname>:*`

### Normalizacion de email en core_User (UPONE-909)

La unicidad de `core_User.email` era case-sensitive a nivel de indice Postgres: `NICOLAS.PAZ@x.com` y `nicolas.paz@x.com` podian coexistir como dos cuentas. `createInstance`, scoped estrictamente a `objectType === 'core_User'` (`instance.resolver.js` ~linea 3201-3212), normaliza `data.email` a `trim().toLowerCase()` antes de persistir y hace un pre-check case-insensitive (`mode: 'insensitive'`) que lanza el mensaje canonico de unique constraint si ya existe una fila con el mismo email en cualquier casing (incluye filas legacy con casing mixto). Para el resto de los objetos este bloque no corre.

### withAuth en resolvers

```javascript
import { withAuth } from '../../../../services/auth/withAuth.js';

export const miQuery = {
  getDatos: withAuth(['mod/mi-mod:view_data'], async (parent, args, context) => {
    return context.prisma.miObjeto.findMany({
      where: { tenantId: context.tenantId }
    });
  }),
};
```

---

## 10. Sistema de eventos

### Flujo

```
GraphQL Mutation
  → withEventPublish() decorator
  → Detecta match con evento registrado
  → Encola job en BullMQ (Redis)
  → Event Worker procesa asincrono
  → Redis Pub/Sub notifica a n8n
  → n8n ejecuta workflow
```

### Definicion de evento (en mod)

```json
{
  "id": "enrollment:created",
  "description": "Se dispara al inscribir un estudiante",
  "trigger": {
    "objectType": "EventEnrollment",
    "operation": "create"
  },
  "includeFields": ["id", "eventId", "userId", "status"],
  "priority": 5,
  "attempts": 3
}
```

### Colas por mod

Cada mod define su cola en `config/app.json`. El queue name se usa para agrupar eventos:

```json
{ "name": "engagement" }
```

Eventos del mod `retention-wellbeing` van a la cola `"engagement"`.

### Estructura interna

```
object-manager/src/events/
├── core/connection.js          ← Conexion Redis/BullMQ
├── loaders/
│   ├── eventLoader.js          ← Carga eventos de mods
│   └── queueLoader.js          ← Carga colas de app.json
├── queues/
│   ├── queueManager.js         ← Registro de colas
│   └── enqueue.js              ← Encolar eventos
├── publishers/
│   └── redisPublisher.js       ← Publicar a Redis Pub/Sub
├── decorators/
│   ├── withEventPublish.js     ← Decorator GraphQL
│   └── withDataLog.js          ← Decorator de auditoria a core_DataLog
└── index.js                    ← API publica
```

### Auditoria (DataLog)

La auditoria hoy es sincrona, dentro del propio resolver: la cadena de decorators es `withEventPublish → withObjectAuth → withDataLog → resolver`, y `withDataLog` escribe directo a `core_DataLog`. El mecanismo viejo (`ChangeLog`, event-driven via n8n) fue **retirado en UPONE-1380**.

Ver `object-manager/docs/features/datalog.md` para el detalle completo.

Evidencia: `object-manager/src/events/index.js:50-51`, `src/events/decorators/withDataLog.js`.

---

## 11. Interaccion con mods

### Como un mod extiende el Object Manager

Un mod aporta artefactos que se sincronizan al Object Manager en las fases del sync:

| Artefacto del mod | Destino en Object Manager | Fase sync |
|-------------------|--------------------------|-----------|
| `objects/*.json` | `objects/business/` | 2 (Merge Sync) |
| `logic/*.resolver.js` | `src/graphql/resolvers/mods/{mod}/` | 5 (Logic Sync) |
| `logic/*.schema.graphql` | (junto a resolvers) | 5 |
| `events/*.json` | `events/` (cargados por eventLoader) | (copia) |
| `capabilities.json` | BD: tabla capabilities | 4 (Capability Sync) |
| `config/settings.json` | BD: `core_ConfigDefinition` (definiciones de configuracion por plataforma/mod) | 4b (Config Definition Sync) |
| `config/app.json` | BD: `up1_suite_app` | 6 (Apps & Layouts) |
| `config/layouts/*.json` | BD: `up1_layen_layout` | 6 |
| `seed/*.js` | BD: datos del tenant | 8 (Seed Data) |
| `flows/*.json` | n8n via REST API | 9 (Flow Sync) |

Ver `object-manager/docs/features/config-system.md` para el detalle de la Fase 4b.

Evidencia: `object-manager/scripts/sync/SyncManager.js:179-186`, `configSync.js`.

### Seeds consolidados con motor idempotente (DECISION-028)

`scripts/sync/seedUpsert.js` expone la funcion de upsert de seeds (`:58`). Antes de sobrescribir un registro, salta el upsert si el registro fue personalizado por el tenant: `isCustomizedByClient` (`:220-231`) considera protegido cualquier registro cuyo `updatedById` no sea nulo, sin importar quien lo edito.

El objeto `objects/core/core_SeedExecution.json` (campos en `:17-124`) registra cada corrida de seed: `seedFile`, `modName`, `level` (enum `up1|mod|tenant`), `tenantId`, `fingerprint`, `status`, contadores de filas y `executedAt`.

Nivel `up1` (seeds de plataforma, no de un mod especifico) se ejecuta desde `scripts/sync/up1Seed.js` (SEED-02, UPONE-1493), montado en `SyncManager.js:12` (import) y `:963` (invocacion en el pipeline de sync).

### No resolver rutas relativas a `rootPath` en runtime (RULE-platform-027)

`scripts/sync/configSync.js:88-92` resuelve una ruta de config contra `__dirname`, no contra `rootPath` del monorepo. El comentario en ese bloque explica por que: la imagen de deploy del object-manager aplana `object-manager/` a la raiz del contenedor, asi que una ruta armada con ese prefijo apunta a un directorio que no existe en produccion, y la lectura falla en no-op silencioso (no lanza error, simplemente no encuentra nada).

Esto afecto en concreto a `user.theme` y `user.locale`, definidos en `object-manager/config/settings.json:2` y `:12`. Ticket UPONE-1359 (commit `843e97fd`, PR #481).

### Ciclo de vida: como un objeto del mod llega a la API

```
1. Dev crea MiObjeto.json en mods/mi-mod/objects/
2. npm run sync → copia a object-manager/objects/business/
3. npm run codegen → genera modelo Prisma + tipo GraphQL
4. npm run tenant:migrate → crea tabla en PostgreSQL
5. Restart → CRUD completo disponible via GraphQL

Resultado: listInstances(objectName: "MiObjeto") funciona
```

### Resolvers custom del mod

El CRUD generado cubre operaciones basicas. Para logica de negocio:

```
mods/mi-mod/logic/
├── miFeature.resolver.js      ← Implementacion
└── miFeature.schema.graphql   ← Schema GraphQL
```

Despues de `npm run sync`, quedan en:

```
object-manager/src/graphql/resolvers/mods/mi-mod/
├── miFeature.resolver.js
└── miFeature.schema.graphql
```

El server los descubre automaticamente al iniciar. El auto-loader:
1. Escanea `resolvers/mods/*/` y `resolvers/up1/*/`
2. Importa cada `.resolver.js`
3. Exports con "Query" → se agregan a Query
4. Exports con "Mutation" → se agregan a Mutation
5. `.schema.graphql` → se mergean al schema

### Contexto disponible en resolvers

```javascript
export const miQuery = {
  getMiDato: async (parent, args, context) => {
    // context.prisma     → Prisma client del tenant activo
    // context.tenantId   → ID del tenant
    // context.user       → Usuario autenticado
    // context.userId     → ID del usuario
    // args               → Argumentos del query/mutation
  }
};
```

### Transacciones en resolvers

```javascript
return context.prisma.$transaction(async (tx) => {
  const record = await tx.miObjeto.update({ where: { id }, data: { estado: 'PUBLICADO' } });
  await tx.auditLog.create({ data: { action: 'publish', recordId: id, tenantId: context.tenantId } });
  return record;
});
```

### Prioridad de resolvers

Si multiples fuentes definen el mismo query/mutation:
1. **Mods sobreescriben projects** (se cargan despues)
2. **Ultimo cargado gana**
3. Warning en consola

---

## 12. Carga de datos e integraciones

### Endpoints

| Endpoint | Metodo | Uso |
|----------|--------|-----|
| `/graphql` | POST | CRUD individual y masivo |
| `/upload` | POST | Subir archivos Excel/CSV |

### Autenticacion

```
X-Tenant-ID: UPU                           ← Obligatorio siempre
Authorization: Bearer <service-token>       ← JWT de Auth0/Clerk
```

### Importacion masiva (Bulk Import)

Wizard de 4 pasos: Upload → Preview → Importar → Resultados.

```
1. POST /upload                 → Sube .xlsx, retorna { filePath }
2. mutation previewImport       → Lee headers + rowCount, detecta FKs
3. mutation importInstances     → Procesa:
                                   ≤500 filas: sincrono, respuesta inmediata
                                   >500 filas: asincrono, polling de progreso
4. Resultado fila por fila      → SUCCESS/FAILED con errores detallados
```

Validaciones automaticas:
- Campos requeridos
- Tipos de datos
- FK referencial (resolucion automatica)
- Unicidad
- ObjectValidation (formulas)

**Bulk import RT-aware (UPONE-1465)**: `previewImport` e `importInstances` (`instance.resolver.js`) resuelven los campos importables via `resolveImportFieldDefs` (`objectDefinition.resolver.js:151`), que para un `objectType` tipo RecordType (`rt__<RtName>__<baseObjectLower>`) agrega los campos custom del objeto **padre** (`fetchRtParentCustomFieldDefs`) ademas de los propios del RT — antes se descartaban silenciosamente al importar. El discriminador `recordType` nunca se toma del archivo Excel/CSV: lo determina el `objectType` elegido en el selector del modal, y una columna `recordType` en el archivo se ignora explicitamente en preview e import (evita un valor en conflicto o un registro a medias). Los campos `required`/`not_null` se validan contra el set resuelto por RT, no contra el objeto base generico.

El Excel de errores es **reimportable**: se puede corregir y subir de nuevo.

### Operaciones masivas via GraphQL

```graphql
# Crear individual
mutation { createInstance(objectName: "Person", data: { ... }) { id } }

# Importar masivo
mutation { importInstances(objectName: "Person", data: [...], mode: "create") {
  totalProcessed
  successCount
  failedCount
  rows { rowIndex status errors }
}}

# Actualizar masivo
mutation { updateBulkInstances(objectName: "Person", ids: [...], data: { ... }) {
  successCount failedCount
}}

# Eliminar masivo
mutation { deleteBulkInstances(objectName: "Person", ids: [...]) {
  successCount failedCount
}}
```

### Limites

- JSON body max: 100KB
- Umbral sync/async: 500 filas (configurable via `IMPORT_SYNC_THRESHOLD`)
- Rate limiting: no configurado actualmente

---

## 13. Metadatos estilo Salesforce

Cada objeto tiene metadatos para renderizado en UI:

```json
// objects/business/metadata.json
{
  "Institution": {
    "label": "Institucion",
    "labelPlural": "Instituciones",
    "gender": "femenino",
    "description": "Entidad educativa que ofrece programas academicos",
    "defaultLayout": "institution_default_layout",
    "objectName": "Institution"
  }
}
```

| Campo | Proposito |
|-------|-----------|
| `label` | Nombre amigable singular |
| `labelPlural` | Nombre amigable plural |
| `gender` | Genero gramatical (`masculino`, `femenino`, `neutro`) para i18n |
| `description` | Descripcion larga para tooltips |
| `defaultLayout` | Layout por defecto |
| `objectName` | Nombre tecnico interno |

Estos metadatos se aplican automaticamente durante el codegen a los archivos JSON individuales.

---

## 14. Estructura de archivos

```
object-manager/
├── objects/
│   ├── business/
│   │   ├── Base/                   ← Objetos base (16+)
│   │   ├── Extended/               ← Campos custom por tenant
│   │   ├── common.json             ← Campos automaticos
│   │   └── metadata.json           ← Metadatos Salesforce
│   └── tenants/
│       ├── UPU/Base/               ← Objetos solo de UPU
│       └── TEST/Base/              ← Objetos solo de TEST
│
├── prisma/
│   ├── BASEMODEL/schema.prisma     ← Template (core + business)
│   ├── UPU/                        ← Schema + migrations + seed UPU
│   └── TEST/                       ← Schema + migrations + seed TEST
│
├── src/
│   ├── server.js                   ← Entry point (Express + Apollo)
│   ├── graphql/
│   │   ├── typeDefs/
│   │   │   ├── dynamic.js          ← GENERADO: tipos de objetos
│   │   │   └── static.js           ← Tipos fijos (queries, mutations)
│   │   └── resolvers/
│   │       ├── instance.resolver.js         ← CRUD generico
│   │       ├── objectDefinition.resolver.js ← Metadata de objetos
│   │       ├── fieldDefinition.resolver.js  ← Metadata de campos
│   │       ├── user.resolver.js             ← Auth y usuarios
│   │       ├── event.resolver.js            ← Sistema de eventos
│   │       ├── layout.resolver.js           ← Layouts
│   │       ├── tags.resolver.js             ← Tags
│   │       ├── objectValidation.resolver.js ← Formulas
│   │       ├── mods/                        ← Resolvers de mods (synced)
│   │       │   ├── retention-wellbeing/
│   │       │   └── hello-world-mod/
│   │       └── up1/                         ← Resolvers de projects
│   │
│   ├── services/
│   │   ├── tenantManager.js        ← Gestion de Prisma clients
│   │   ├── auth/
│   │   │   └── withAuth.js         ← RBAC decorator
│   │   └── ...
│   │
│   ├── events/                     ← Sistema de eventos BullMQ
│   └── workers/                    ← Workers de procesamiento async
│
├── scripts/
│   ├── sync/                       ← Scripts de las 9 fases
│   │   ├── SyncManager.js          ← Orquestador principal
│   │   ├── fileSync.js
│   │   ├── dbSync.js
│   │   ├── logicSync.js
│   │   └── flowSync.js
│   ├── codegen.js                  ← Generacion Prisma + GraphQL
│   ├── check-mod-structure.js      ← Validacion de estructura de mods
│   └── actions.js                  ← Setup automatico
│
├── events/                         ← Eventos synced desde mods
├── tests/                          ← 422+ tests (unit, integration, e2e)
├── docs/                           ← Documentacion interna
├── .ai/                            ← Contexto para IA
└── package.json
```

---

## 15. Comandos de referencia

### Desarrollo

| Comando | Que hace |
|---------|----------|
| `npm run dev` | Inicia server con nodemon (localhost:4000) |
| `npm start` | Inicia server en produccion |
| `npm run setup:dev` | Setup completo (todos los tenants) |

### Datos y esquemas

| Comando | Que hace |
|---------|----------|
| `npm run codegen` | Genera Prisma + GraphQL desde JSONs |
| `npm run codegen -- TENANT` | Genera schema para tenant especifico |
| `npm run sync` | Sincroniza artefactos de mods (9 fases) |
| `npm run sync:flows` | Sincroniza solo flows (fase 9) |
| `npm run check-mods` | Valida estructura de mods |

### Tenants y BD

| Comando | Que hace |
|---------|----------|
| `npm run tenant:create TENANT` | Setup completo de un tenant |
| `npm run tenant:migrate` | Aplica migraciones |
| `npm run tenant:generate` | Regenera Prisma client |
| `npm run tenant:studio` | Abre Prisma Studio (GUI de BD) |
| `npm run tenant:reset TENANT force` | Reset BD del tenant (borra datos) |
| `npm run seed TENANT` | Ejecuta seeds |

### Testing

| Comando | Que hace |
|---------|----------|
| `npm test` | Todos los tests (Vitest) |
| `npm run test:unit` | Solo unit tests |
| `npm run test:integration` | Solo integration tests |
| `npm run test:watch` | Tests en modo watch |
| `npm run test:coverage` | Tests con cobertura |

### Docker

| Comando | Que hace |
|---------|----------|
| `docker compose up` | Core services |
| `docker compose --profile worker up -d` | Redis + Worker (para eventos) |
| `docker compose --profile flow up -d` | n8n (localhost:5678) |

---

## 16. Troubleshooting

| Problema | Causa | Solucion |
|----------|-------|----------|
| Objeto no aparece en GraphQL | JSON con error de sintaxis o codegen no ejecutado | Verificar JSON → `npm run codegen` → reiniciar server |
| Campos custom no se sincronizan | Naming incorrecto en Extended | Verificar `ext__<CLIENT>__<object>.json` → codegen → migrate |
| `TENANT_ID_REQUIRED` | Falta header X-Tenant-ID | Agregar `X-Tenant-ID: UPU` a la request |
| Aislamiento de tenant roto | Query sin filtro tenantId | Verificar `tenantId: context.tenantId` en todo where |
| Resolver ignorado silenciosamente | Export sin "Query"/"Mutation" en nombre | Renombrar a `miFeatureQuery` o `miFeatureMutation` |
| Tabla no existe para tenant | Objeto definido en otro tenant | Verificar `objects/tenants/{TENANT}/Base/` |
| Prisma client error | Schema no regenerado | `npm run codegen` → `npm run tenant:generate` |
| Migration fails | Conflicto con datos existentes | `npm run tenant:studio` para inspeccionar → ajustar migration |
| Evento no se dispara | Worker no corriendo o evento mal definido | `docker compose --profile worker up -d` → verificar JSON del evento |
| Import async sin progreso | BullMQ/Redis no disponible | Verificar Redis corriendo → `docker compose --profile worker up -d` |

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-04-10 | Documento inicial: guia completa del Object Manager basada en 20+ docs internos, .ai context, Confluence, y specs existentes |
| 2026-07-16 | Agrega borrado en cascada declarativo (UPONE-1382), auditoria via DataLog (UPONE-1380) y config sync Fase 4b |
| 2026-08-03 | Vocabulario unico de tipos (`typeMappers.js`, UPONE-1386), field transformations declaradas (UPONE-1263), bulk import RT-aware (UPONE-1465), email case-insensitive en core_User (UPONE-909), coercion de filtro FK a tipo de PK (UPONE-1497), `baseRelation.onDelete` opt-in en Extended, retiro del workflow relacional de Activity (UPONE-1459) |
| 2026-08-17 | Dos builders paralelos de codegen (negocio/core) y simetria del marcador "Auto-updated" (UPONE-1504); rebuild de schemas por tenant con BASEMODEL siempre primero, incluidos Dockerfiles; seeds consolidados con motor idempotente y proteccion de personalizacion (`seedUpsert.js`, `core_SeedExecution`, SEED-02 UPONE-1493); gotcha de rutas relativas a `rootPath` en runtime del object-manager (UPONE-1359) |
