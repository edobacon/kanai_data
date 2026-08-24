---
id: SPEC-mods-001
project: up1
type: spec
module: mods
category: mods
tags: [up1, mods, creacion, guia, estructura, objects, resolvers, layouts, componentes, eventos, flows, css, i18n, capabilities, seed, testing, sync, desarrollo-local, convenciones]
fecha: 2026-04-10
sources:
  - mods/docs/guides/ (creating-a-mod, objects, resolvers, events, flows, layouts, components, css-theming, i18n, seed-data, testing, python-integration, development)
  - mods/docs/reference/ (mod-structure, sync-targets)
  - mods/docs/features/ (capabilities)
  - Codigo fuente de hello-world-mod y retention-wellbeing
  - up1/CLAUDE.md
  - Confluence: desarrollo, capacidades, arquitectura, layouts-detalle
---
# Guia completa: creacion y desarrollo de Mods en uP1

## Indice

1. [Que es un mod](#1-que-es-un-mod)
2. [Prerrequisitos](#2-prerrequisitos)
3. [Estructura completa de un mod](#3-estructura-completa-de-un-mod)
4. [Archivos obligatorios](#4-archivos-obligatorios)
5. [Archivos y carpetas opcionales](#5-archivos-y-carpetas-opcionales)
   - 5.1 [objects/ — Objetos de negocio](#51-objects--objetos-de-negocio)
   - 5.2 [logic/ — Resolvers GraphQL custom](#52-logic--resolvers-graphql-custom)
   - 5.3 [config/ — App y layouts](#53-config--app-y-layouts)
   - 5.4 [modsComponents/ — Componentes Vue custom](#54-modscomponents--componentes-vue-custom)
   - 5.5 [modsComposables/ — Composables compartidos](#55-modscomposables--composables-compartidos)
   - 5.6 [events/ — Eventos BullMQ](#56-events--eventos-bullmq)
   - 5.7 [flows/ — Workflows n8n](#57-flows--workflows-n8n)
   - 5.8 [css/ — Estilos por capas](#58-css--estilos-por-capas)
   - 5.9 [lang/ — Traducciones i18n](#59-lang--traducciones-i18n)
   - 5.10 [seed/ — Datos iniciales](#510-seed--datos-iniciales)
   - 5.11 [tests/ — Testing](#511-tests--testing)
   - 5.12 [src/ — Scripts internos (Python)](#512-src--scripts-internos-python)
   - 5.13 [docs/ y .ai/ — Documentacion](#513-docs-y-ai--documentacion)
6. [Mecanismo de sync](#6-mecanismo-de-sync)
7. [Desarrollo local sin Bitbucket](#7-desarrollo-local-sin-bitbucket)
8. [Convenciones de nombres](#8-convenciones-de-nombres)
9. [Flujo de trabajo diario](#9-flujo-de-trabajo-diario)
10. [Do's y Don'ts](#10-dos-y-donts)
11. [Troubleshooting](#11-troubleshooting)
12. [Migraciones de base de datos](#12-migraciones-de-base-de-datos)
13. [Deployment](#13-deployment)

---

## 1. Que es un mod

Un mod es una **extension autonoma** que representa un area funcional de negocio dentro de uP1. Cada mod es un **repositorio git independiente** que se clona dentro del monorepo y se integra via un mecanismo de sincronizacion.

### Que problema resuelven

Sin mods, todo el codigo viviria mezclado en los workspaces core (object-manager, suite, layout):
- Conflictos de merge constantes entre equipos
- Dependencias cruzadas entre dominios
- Imposibilidad de activar/desactivar funcionalidad por cliente
- Logica de negocio entremezclada con infraestructura

Los mods resuelven esto con **aislamiento por dominio**: cada area funcional es un paquete independiente con su propio repo, tests y ciclo de vida.

```text
┌──────────────────┐     ┌─────────────────────┐     ┌─────────────────────────────┐
│  Idea de dominio │ ──► │  Crear repo del mod  │ ──► │  Definir objects +          │
└──────────────────┘     └─────────────────────┘     │  logic + layouts            │
                                                      └──────────────┬──────────────┘
                                                                     │
                                                                     ▼
                                                             ┌───────────────┐
                                                             │ npm run sync  │
                                                             └───────┬───────┘
                                                                     │
                                                      ┌──────────────┼──────────────┐
                                                      ▼              ▼              ▼
                                                Object Manager   Layout /        Flow /
                                                                  Suite           n8n
```

### Que encapsula un mod

Objetos de datos, logica de negocio (resolvers GraphQL), vistas (layouts JSON), componentes Vue custom, estilos CSS, traducciones, eventos asincronicos, workflows, permisos RBAC y datos semilla — todo dentro de una carpeta autocontenida.

### Mods existentes como referencia

| Mod | Tipo | Objetos | Componentes | Estado |
|-----|------|---------|-------------|--------|
| `uengagement-up1` | Dominio | 23 (mas 7 RecordTypes) | 0 | Activo |
| `ai-agent` | Feature | 0 | 0 | Activo |
| `hello-world-mod` | Template | 3 | 4 (cards, listas, modales) | Ignorado por defecto |
| `object-manager-editor` | Admin | 0 | 0 | Activo |
| `flow-viewer` | Integracion | 1 | 0 | Activo |

El **hello-world-mod** es la referencia oficial. Demuestra la mayoria de capacidades de un mod.

---

## 2. Prerrequisitos

- Node.js 22.12+
- SSH access a Bitbucket configurado (si se usa repo remoto)
- Monorepo uP1 clonado y `npm run setup` completado
- Stack uP1 corriendo: Object Manager (localhost:4000) + Suite (localhost:3000)
- PostgreSQL corriendo localmente
- Docker Desktop (para Redis/Worker/n8n opcionales)

---

## 3. Estructura completa de un mod

```
mods/{nombre-del-mod}/
├── package.json              ← OBLIGATORIO: registro npm (@uplanner/{nombre})
├── capabilities.json         ← OBLIGATORIO: permisos RBAC (puede ser [])
├── README.md                 ← Documentacion del mod
├── vitest.config.js          ← Configuracion de tests
├── .gitignore
│
├── objects/                  ← Objetos de negocio (JSON Schema)
│   ├── MiObjeto.json
│   └── OtroObjeto.json
│
├── logic/                    ← Resolvers GraphQL custom
│   ├── miFeature.resolver.js
│   └── miFeature.schema.graphql
│
├── modsComponents/           ← Componentes Vue custom
│   └── MiWidget/
│       ├── MiWidgetElement.vue
│       ├── useMiWidget.ts
│       ├── MiWidget.types.ts
│       ├── MiWidget.mocks.ts
│       └── MiWidget.stories.ts
│
├── modsComposables/          ← Composables compartidos (funciones puras)
│   └── useMiLogica.ts
│
├── config/
│   ├── app.json              ← Registro de la app en sidebar
│   └── layouts/              ← Configuracion de vistas (JSON)
│       ├── mi-objeto-list.json
│       ├── mi-objeto-view.json
│       ├── mi-objeto-create.json
│       └── mi-objeto-edit.json
│
├── css/                      ← Estilos por capas CSS
│   ├── 1-theme/
│   ├── 2-objectName/
│   ├── 3-viewType/
│   ├── 4-objectId/
│   └── 5-contextId/
│
├── lang/                     ← Traducciones i18n
│   ├── es_CL.json
│   ├── es_CL@MiObjeto.json
│   ├── en_CL.json
│   └── en_CL@MiObjeto.json
│
├── events/                   ← Eventos BullMQ
│   └── mi-evento.json
│
├── flows/                    ← Workflows n8n (JSON)
│   └── mi-workflow.json
│
├── seed/                     ← Datos iniciales
│   ├── config-seeds.js
│   └── _populate-relations.js
│
├── src/                      ← Scripts internos (ej: Python). NO se sincroniza
│   └── mi_script.py
│
├── tests/                    ← Tests. NO se sincroniza
│   ├── mocks/
│   ├── unit/
│   └── fixtures/
│
├── docs/                     ← Documentacion del mod. NO se sincroniza
└── .ai/                      ← Contexto IA. NO se sincroniza
```

---

## 4. Archivos obligatorios

Solo 2 archivos son obligatorios para que un mod sea reconocido por el sistema.

### 4.1 package.json

Registro del mod como workspace npm.

```json
{
  "name": "@uplanner/mi-mod",
  "version": "1.0.0",
  "description": "Descripcion del mod",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Consideraciones:**
- `name`: siempre `@uplanner/{nombre-del-mod}` en kebab-case
- `private: true`: los mods no se publican a npm
- `type: "module"`: habilita ES modules (import/export)
- `dependencies`: solo si el mod tiene componentes Vue que necesitan paquetes especificos. Los resolvers usan dependencias del object-manager

### 4.2 capabilities.json

Define los permisos RBAC del mod. Puede ser un array vacio `[]` si el mod no necesita permisos custom.

**Formato con permisos:**

```json
{
  "module": "mi-mod",
  "version": "1.0.0",
  "capabilities": [
    {
      "name": "mod/mi-mod:view_dashboard",
      "description": "Ver dashboard de analytics",
      "riskLevel": "low"
    },
    {
      "name": "mod/mi-mod:manage_records",
      "description": "Crear y gestionar registros",
      "riskLevel": "medium"
    },
    {
      "name": "mod/mi-mod:delete_records",
      "description": "Eliminar registros",
      "riskLevel": "high"
    },
    {
      "name": "miobjeto.campSensible:view",
      "description": "Ver campo sensible en MiObjeto",
      "riskLevel": "low"
    }
  ]
}
```

**Formato vacio (sin permisos custom):**

```json
[]
```

**Convenciones de nombre:**

| Nivel | Patron | Ejemplo |
|-------|--------|---------|
| Modulo | `mod/{modname}:{accion}` | `mod/mi-mod:view_dashboard` |
| Objeto | `{objectname}:{accion}` | `miobjeto:create` |
| Campo | `{objectname}.{field}:{accion}` | `miobjeto.salary:view` |

**Niveles de riesgo:**

| riskLevel | Significado | Ejemplo |
|-----------|-------------|---------|
| `low` | Solo lectura, no sensible | view_dashboard, view_reports |
| `medium` | Escritura o dato semi-sensible | manage_records, edit |
| `high` | Destructivo o altamente sensible | delete, publish (irreversible) |

**Integracion con layouts y resolvers:**

```json
// En row actions de RecordList:
{ "requiredCapability": "mod/mi-mod:manage_records" }

// En resolvers con withAuth:
withAuth(['mod/mi-mod:view_dashboard'], async (parent, args, context) => { ... })
```

Las capabilities complementan los permisos estandar de objeto (`objectname:view/create/edit/delete`) y campo (`objectname.field:view/edit`). Usar capabilities para acciones especificas del mod que van mas alla del CRUD.

---

## 5. Archivos y carpetas opcionales

Crear solo lo que el mod necesita. No hay obligacion de tener todas las carpetas.

---

### 5.1 objects/ — Objetos de negocio

Los objetos JSON son la **fuente de verdad** para base de datos y API. El codegen genera automaticamente:
- Tabla PostgreSQL (via Prisma)
- Tipo GraphQL
- CRUD completo (list, get, create, update, delete, import, bulk)

```text
┌─────────────────────────────┐
│  mods/{mod}/                │
│  objects/MiObjeto.json      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│  npm run sync + codegen                         │
│                                                 │
│  Copia a object-manager/objects/business/       │
│                    │                            │
│                    ▼                            │
│           npm run codegen                       │
└────────────────────┬────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
┌──────────────────┐   ┌────────────────────┐
│ prisma/schema.   │   │ typeDefs/dynamic.js│
│ prisma           │   │                    │
└────────┬─────────┘   └──────────┬─────────┘
         │                        │
         ▼                        ▼
   PostgreSQL              GraphQL API
   tabla MiObjeto          CRUD automatico
```

> **Flujo completo para objetos nuevos:** editar JSON → `npm run sync` → `npm run codegen` → `npm run tenant:migrate` → reiniciar Object Manager.

#### Estructura de un objeto

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MiObjeto",
  "type": "object",
  "metadata": {
    "label": "Mi Objeto",
    "labelPlural": "Mis Objetos",
    "gender": "masculino",
    "description": "Descripcion para tooltips y documentacion",
    "defaultLayoutType": "RecordList"
  },
  "properties": {
    "nombre": {
      "type": "string",
      "title": "Nombre",
      "description": "Nombre descriptivo del registro",
      "not_null": true,
      "unique": true
    },
    "puntuacion": {
      "type": "number",
      "title": "Puntuacion",
      "not_null": true
    },
    "estado": {
      "type": "string",
      "title": "Estado",
      "enum": ["BORRADOR", "ACTIVO", "INACTIVO"],
      "static_default": "BORRADOR"
    },
    "activo": {
      "type": "boolean",
      "title": "Activo",
      "static_default": "true"
    },
    "notas": {
      "type": "string",
      "title": "Notas"
    },
    "metadata": {
      "type": "object",
      "title": "Metadata"
    },
    "fechaInicio": {
      "type": "string",
      "format": "date-time",
      "title": "Fecha de Inicio"
    },
    "puntuacionPonderada": {
      "type": "formula",
      "title": "Puntuacion Ponderada",
      "properties": {
        "formula": "=puntuacion * 100"
      }
    }
  },
  "required": ["nombre", "puntuacion", "estado"]
}
```

#### Metadata del objeto

| Campo | Proposito |
|-------|-----------|
| `label` / `labelPlural` | Nombres en UI (singular/plural) |
| `gender` | Genero gramatical para i18n (`"masculino"` / `"femenino"`) |
| `description` | Tooltip y documentacion |
| `defaultLayoutType` | Layout por defecto: `RecordList` o `RecordDetail` |

#### Tipos de campo soportados

| Tipo | JSON type | Genera en BD | Ejemplo |
|------|-----------|-------------|---------|
| Texto | `string` | VARCHAR | nombre, codigo |
| Numero | `number` | FLOAT/INT | puntuacion, creditos |
| Booleano | `boolean` | BOOLEAN | activo, vigente |
| Enum | `string` + `enum` | VARCHAR + validacion | estado, nivel |
| Fecha | `string` + `format: "date-time"` | TIMESTAMP | fechaInicio |
| JSON | `object` | JSONB | metadata, config |
| Formula | `formula` | Calculado en runtime | puntuacionPonderada |

#### Propiedades de campo

| Propiedad | Descripcion | Ejemplo |
|-----------|-------------|---------|
| `not_null` | Requerido a nivel BD | `"not_null": true` |
| `unique` | Constraint de unicidad | `"unique": true` |
| `enum` | Restringe valores (genera Prisma enum) | `"enum": ["A", "B"]` |
| `static_default` | Valor por defecto al crear | `"static_default": "ACTIVO"` |
| `transformations` | Procesamiento server-side | `"transformations": ["trim"]` |

#### Foreign Keys (relaciones)

**FK a otro objeto del mod:**

```json
"padreObjetoId": {
  "type": "string",
  "title": "Padre",
  "isForeignKey": true,
  "references": "PadreObjeto"
}
```

El nombre del campo **debe** seguir el patron `<camelCaseObjectName>Id`.

**FK a un objeto del core de la plataforma:**

```json
"assigneeId": {
  "type": "integer",
  "title": "Asignado",
  "isForeignKey": true,
  "references": "core_User",
  "targetField": "id"
}
```

Objetos core disponibles: `Person`, `Institution`, `AcademicPeriod`, `core_User`, etc.

#### Despues de modificar objetos

```bash
npm run sync
npm run codegen --workspace=@uplanner/object-management-backend
npm run tenant:migrate --workspace=@uplanner/object-management-backend
```

**Ejemplo real** (hello-world-mod): `HwAssessment.json`, `HwFactor.json` (con FK a HwAssessment), `HwIntervention.json` (con FK a HwAssessment).

---

### 5.2 logic/ — Resolvers GraphQL custom

Cubren logica de negocio que el CRUD automatico no resuelve. Cada resolver tiene **2 archivos pareados**:

```
logic/
├── miFeature.resolver.js        ← Implementacion
└── miFeature.schema.graphql     ← Definicion de tipos
```

Ambos se sincronizan a `object-manager/src/graphql/resolvers/mods/{mod}/`.

#### Schema GraphQL (.schema.graphql)

```graphql
type MiResultado {
  id: ID!
  nombre: String!
  puntuacion: Int!
}

input MiInput {
  nombre: String!
  puntuacion: Int!
}

extend type Query {
  getMiDato(id: String!): MiResultado!
  listarMisDatos: [MiResultado!]!
}

extend type Mutation {
  crearMiDato(input: MiInput!): MiResultado!
}
```

**Regla critica:** Siempre usar `extend type Query` y `extend type Mutation`. Nunca redefinir los tipos raiz.

#### Resolver (.resolver.js)

```javascript
import { withAuth } from '../../../../services/auth/withAuth.js';

export const miFeatureQuery = {
  getMiDato: withAuth(['mod/mi-mod:view_data'], async (parent, args, context) => {
    return context.prisma.miObjeto.findFirst({
      where: { id: args.id, tenantId: context.tenantId }
    });
  }),

  listarMisDatos: withAuth(['mod/mi-mod:view_data'], async (parent, args, context) => {
    return context.prisma.miObjeto.findMany({
      where: { tenantId: context.tenantId }
    });
  }),
};

export const miFeatureMutation = {
  crearMiDato: withAuth(['mod/mi-mod:manage_data'], async (parent, args, context) => {
    return context.prisma.miObjeto.create({
      data: { ...args.input, tenantId: context.tenantId }
    });
  }),
};
```

#### Reglas criticas

1. **Export naming**: El nombre del export **debe** contener `Query` o `Mutation` (case-insensitive). El auto-loader del object-manager usa esta convencion. Si no contiene ninguna, el resolver se **ignora silenciosamente**.

   ```javascript
   // OK:
   export const miFeatureQuery = { ... }
   export const miFeatureMutation = { ... }

   // IGNORADO SILENCIOSAMENTE:
   export const miFeatureResolvers = { ... }
   ```

2. **Import path de withAuth**: La ruta es relativa a la ubicacion sincronizada (`object-manager/src/graphql/resolvers/mods/{mod}/`) — 4 niveles arriba hasta `src/services/auth/`.

3. **Siempre filtrar por tenantId**: Toda query debe incluir `tenantId: context.tenantId` en el where.

4. **Transacciones**: Usar `context.prisma.$transaction()` para operaciones atomicas:

   ```javascript
   return context.prisma.$transaction(async (tx) => {
     const record = await tx.miObjeto.update({ where: { id }, data: { estado: 'PUBLICADO' } });
     await tx.auditLog.create({ data: { action: 'publish', recordId: id, tenantId: context.tenantId } });
     return record;
   });
   ```

#### Despues de modificar resolvers

```bash
npm run sync
# Reiniciar Object Manager (hot reload NO aplica para resolvers)
```

**Ejemplo real**: `hello-world-mod/logic/` — `hwMetrics.resolver.js`, `randomPerson.resolver.js`, `textTransform.resolver.js`.

---

### 5.3 config/ — App y layouts

#### config/app.json — Registro en sidebar

```json
{
  "name": "mi-mod",
  "label": "Mi Modulo",
  "icon": "bi-grid",
  "order": 10,
  "roles": ["Admin", "Coordinador"],
  "tenants": ["TEST", "UPU"],
  "version": "1.0.0",
  "defaultObjects": ["MiObjeto", "OtroObjeto"]
}
```

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `name` | string | Identificador interno (kebab-case) |
| `label` | string | Nombre visible en sidebar |
| `icon` | string | Clase de icono Bootstrap (ej: `bi-grid`, `bi-mortarboard`) |
| `order` | number | Posicion en sidebar (menor = mas arriba) |
| `roles` | string[] | Roles que ven la app. Omitir para todos |
| `tenants` | string[] | Tenants donde aparece. `["*"]` = todos |
| `version` | string | Version semantica |
| `defaultObjects` | string[] | Objetos principales (aparecen como tabs de navegacion) |

#### config/layouts/ — Configuracion de vistas

Los layouts son JSONs que definen como se presenta y edita la data. Se sincronizan a la tabla `up1_layen_layout` en BD.

##### Arbol de decision: que tipo de layout usar

```
Necesitas mostrar multiples registros?
├── Si → Superficie reducida (sidebar, mobile)?
│   ├── Si → ChibiList
│   └── No → RecordList
└── No → Formulario crear/editar/ver?
    ├── Si → RecordDetail
    └── No → Calendario?
        ├── Si → OfferingCalendar
        └── No → Flujo de importacion?
            ├── Si → ImportTaskList
            └── No → Chat IA?
                └── Si → AiChatbox
```

##### RecordList — Tabla con CRUD

```json
{
  "name": "mi_objeto_list",
  "objectName": "MiObjeto",
  "layoutType": "RecordList",
  "roles": ["Admin", "Coordinador"],
  "tenants": ["TEST"],
  "layoutConfig": {
    "columns": [
      { "key": "nombre", "label": "Nombre", "sortable": true },
      { "key": "estado", "label": "Estado", "sortable": true },
      { "key": "puntuacion", "label": "Puntuacion", "sortable": true }
    ],
    "defaultSort": { "field": "createdAt", "order": "desc" },
    "canCreate": true,
    "canCreateLayoutId": "mi_objeto_create",
    "canEdit": true,
    "canDelete": true,
    "showSearch": true,
    "associatedLayoutConfigs": {
      "view": { "layoutId": "mi_objeto_view" },
      "edit": { "layoutId": "mi_objeto_edit" }
    }
  }
}
```

Capacidades de RecordList: busqueda por texto, filtros configurables, paginacion server-side, ordenamiento por columna, acciones por fila, acciones globales, seleccion multiple para bulk.

##### RecordDetail con tabs — Vista/edicion

```json
{
  "name": "mi_objeto_view",
  "objectName": "MiObjeto",
  "layoutType": "RecordDetail",
  "applicationId": null,
  "layoutConfig": {
    "mode": "view",
    "tabs": {
      "detalle": { "label": "Detalle", "elements": ["nombre", "estado", "puntuacion"] },
      "hijos": { "label": "Hijos", "elements": ["hijosList"] }
    },
    "schema": {
      "nombre": { "type": "text", "label": "Nombre", "columns": { "container": 6 } },
      "estado": { "type": "text", "label": "Estado", "columns": { "container": 6 } },
      "puntuacion": { "type": "text", "label": "Puntuacion", "columns": { "container": 6 } },
      "hijosList": {
        "type": "record-list",
        "objectName": "HijoObjeto",
        "layoutId": "hijo_parent_list",
        "layoutConfig": {
          "filters": [
            { "field": "miObjetoId", "operator": "EQUALS", "value": "{{parentId}}" }
          ]
        }
      }
    }
  }
}
```

##### RecordDetail con wizard (steps) — Creacion

```json
{
  "name": "mi_objeto_create",
  "objectName": "MiObjeto",
  "layoutType": "RecordDetail",
  "applicationId": null,
  "layoutConfig": {
    "mode": "create",
    "enableFKCreateButton": true,
    "autoAssignFields": {
      "activo": true,
      "assigneeId": { "enabled": true, "editable": true, "valueSource": "CURRENT_USER_ID" }
    },
    "steps": {
      "step1": { "label": "Datos Basicos", "elements": ["nombre", "estado"] },
      "step2": { "label": "Configuracion", "elements": ["puntuacion", "notas"] }
    },
    "schema": {
      "nombre": { "type": "text", "label": "Nombre", "rules": ["required"], "columns": { "container": 6 } },
      "estado": { "type": "text", "label": "Estado", "columns": { "container": 6 } },
      "puntuacion": { "type": "text", "label": "Puntuacion", "columns": { "container": 6 } },
      "notas": { "type": "text", "label": "Notas", "columns": { "container": 12 } }
    }
  }
}
```

##### Row actions — Acciones por fila

```json
"rowActions": [
  {
    "id": "crear-hijo",
    "label": "Crear Hijo",
    "type": "modal",
    "targetLayoutId": "hijo_create",
    "targetObjectName": "HijoObjeto",
    "requiredCapability": "mod/mi-mod:manage_records",
    "languageTag": "actions.crearHijo",
    "modalTitleTag": "actions.crearHijoTitulo",
    "initialDataMapping": {
      "miObjetoId": "record.id"
    },
    "visibilityConditions": {
      "operator": "AND",
      "conditions": [
        { "field": "activo", "operator": "==", "value": true }
      ]
    }
  }
]
```

##### Placeholders soportados

| Placeholder | Se reemplaza por | Uso tipico |
|-------------|-----------------|------------|
| `{{parentId}}` | ID del registro padre | Filtros en listas embebidas |
| `{{CURRENT_USER_ID}}` | ID del usuario logueado | Auto-asignacion, filtros por usuario |
| `record.id` | ID del registro de la fila | `initialDataMapping` en row actions |
| `record.{field}` | Valor de cualquier campo | `initialDataMapping` |

##### FK Display — Mostrar nombre en vez de UUID

```json
{
  "relations": ["padreObjeto"],
  "relationDisplayFields": { "PadreObjeto": "nombre" },
  "relationLayoutIds": { "PadreObjeto": "padre_objeto_view" }
}
```

- `relations`: nombre de relacion Prisma (**lowercase** para multi-word)
- `relationDisplayFields`: objeto (PascalCase) → campo a mostrar
- `relationLayoutIds`: objeto → layout para navegacion clickeable

##### Layouts auxiliares

Layouts con `"applicationId": null` no aparecen en navegacion. Se usan como targets de row actions, listas embebidas, y creates contextuales.

##### Filtrado por roles

- **Nivel app**: `"roles": ["Admin"]` en `config/app.json`
- **Nivel layout**: `"roles": ["Admin"]` en el JSON del layout
- Sin `roles` = visible para todos. Roles filtran visibilidad, no acceso a datos

#### Despues de modificar layouts

```bash
npm run sync    # Upsert automatico en BD, recarga automatica
```

**Ejemplo real**: `hello-world-mod/config/layouts/` — 17 layouts cubriendo list, view con tabs, create con wizard, edit, listas embebidas, my-list filtrado por usuario.

---

### 5.4 modsComponents/ — Componentes Vue custom

Para vistas que no se resuelven con RecordList/RecordDetail estandar.

#### Estructura de un componente

```
modsComponents/
└── MiWidget/
    ├── MiWidgetElement.vue      ← Componente Vueform (usa ElementLayout)
    ├── useMiWidget.ts           ← Composable con logica y GraphQL
    ├── MiWidget.types.ts        ← Tipos TypeScript
    ├── MiWidget.mocks.ts        ← Datos mock para Storybook
    └── MiWidget.stories.ts      ← Story de Storybook
```

#### Dos patrones de componentes

**Patron A: Vueform Element** (integrado al Layout Engine)

Se registra como tipo de campo en el sistema de layouts. Se referencia por nombre en el JSON del layout schema.

```vue
<template>
  <ElementLayout>
    <template #element>
      <!-- Contenido custom -->
      <div v-if="loading">Cargando...</div>
      <div v-else>{{ data }}</div>
    </template>
    <!-- Boilerplate obligatorio: passthrough de slots Vueform -->
    <template v-for="(component, slot) in elementSlots" #[slot]>
      <slot :name="slot" :el$="el$">
        <component :is="component" :el$="el$"/>
      </slot>
    </template>
  </ElementLayout>
</template>

<script lang="ts">
import { defineElement } from '@vueform/vueform'
import { useMiWidget } from './useMiWidget'

export default defineElement({
  name: 'MiWidgetElement',        // PascalCase → tipo "mi-widget" en JSON
  submits: false,                  // Excluir del form data
  props: {
    useMockData: { type: Boolean, default: false },
    customProp: { type: String }
  },
  setup(props) {
    if (props.useMockData) return { /* mock refs */ }
    const { data, loading, fetchData } = useMiWidget()
    fetchData()
    return { data, loading }
  }
})
</script>
```

**Reglas criticas del Patron A:**
- Usar `export default defineElement({})` — NO `<script setup>` (Vueform necesita objeto options)
- `ElementLayout` provee el wrapper estandar (label, descripcion, errores)
- `elementSlots` + passthrough es boilerplate obligatorio
- `submits: false` para excluir del form data
- El `name` en PascalCase se convierte a kebab-case automaticamente: `MiWidgetElement` → `mi-widget`

**Patron B: Componente Vue standalone** (helper)

Para modales auxiliares, barras de busqueda, listas personalizadas. NO se integra con el Layout Engine.

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: boolean
  data: MiTipo[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': [data: MiTipo]
}>()
</script>
```

#### Composable del componente (useMiWidget.ts)

```typescript
import { ref } from 'vue'
import { gql } from '@apollo/client/core'
import { useTenantApolloClient } from '@/composables/useApolloClient'

export function useMiWidget() {
  const apolloClient = useTenantApolloClient()  // Inyecta X-Tenant-ID automaticamente
  const data = ref(null)
  const loading = ref(false)

  async function fetchData() {
    loading.value = true
    try {
      const result = await apolloClient.query({
        query: gql`
          query GetMiDato($id: String!) {
            getMiDato(id: $id) { id nombre estado }
          }
        `,
        variables: { id: 'xxx' },
        fetchPolicy: 'network-only'
      })
      data.value = result.data.getMiDato
    } finally {
      loading.value = false
    }
  }

  return { data, loading, fetchData }
}
```

**Importante:**
- Siempre usar `useTenantApolloClient()` — nunca importar Apollo Client directo
- Todo GraphQL en uP1 es **imperativo** (`apolloClient.query(...)`, `apolloClient.mutate(...)`). NO se usan composables reactivos como `useQuery`/`useMutation`
- El alias `@/` resuelve a `layout/src/` en Storybook y `suite/` en produccion

#### CRUD generico (sin resolver custom)

Para operaciones estandar sin resolvers custom, usar las queries genericas del Object Manager:

```typescript
const result = await apolloClient.query({
  query: gql`
    query ListInstances($objectName: String!, $filters: [FilterInput]) {
      listInstances(objectName: $objectName, filters: $filters) {
        instances
        totalCount
      }
    }
  `,
  variables: {
    objectName: 'MiObjeto',
    filters: [{ field: 'estado', operator: 'EQUALS', value: 'ACTIVO' }]
  }
})
```

#### Referencia en layout JSON

```json
{
  "miWidget": {
    "type": "mi-widget",
    "customProp": "valor",
    "label": "Mi Widget"
  }
}
```

#### Registro automatico

El sync copia a `layout/src/modsComponents/` y `suite/modsComponents/`. El `vueform.config.ts` descubre automaticamente todos los `.vue` con `defineElement()` via glob import. No hay registro manual.

#### Atomic Design

Importar atoms de la libreria layout, nunca HTML o Bootstrap directo:

```typescript
import { Button, Heading, Text, Spinner, Alert } from '../../components/atoms'
```

| HTML | Atom | Props clave |
|------|------|-------------|
| `<h2>` | `<Heading :level="2">` | level, size, weight |
| `<p>` | `<Text as="p">` | as, variant, size |
| `<button>` | `<Button>` | variant, size, loading |

Design tokens: `var(--up1-*)`, nunca valores hardcodeados.

#### Storybook

Todo componente debe tener una story con `useMockData: true`:

```typescript
import type { Meta, StoryObj } from '@storybook/vue3'
import MiWidgetElement from './MiWidgetElement.vue'

const meta: Meta<typeof MiWidgetElement> = {
  title: 'Custom Components/From Mods/mi-mod/MiWidget',
  component: MiWidgetElement,
}
export default meta

export const Default: StoryObj<typeof MiWidgetElement> = {
  args: { useMockData: true },
}
```

#### Destinos del sync

```
modsComponents/ → layout/src/modsComponents/   (Storybook)
modsComponents/ → suite/modsComponents/         (App)
*.stories.ts   → layout/src/stories/ (solo)     (Stories no van a suite)
```

**Ejemplo real**: `hello-world-mod/modsComponents/` — RandomPersonCard (Vueform element), TextTransformer (Vueform element), HwAssessmentList (standalone list), EditHwAssessmentModal (standalone modal).

---

### 5.5 modsComposables/ — Composables compartidos

Funciones puras sin GraphQL ni Vue reactivity. Se comparten entre componentes.

```typescript
// modsComposables/useMiLogica.ts
export const niveles = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

export function getColorPorNivel(nivel: string): string {
  const colores: Record<string, string> = {
    LOW: 'var(--up1-color-success)',
    MEDIUM: 'var(--up1-color-warning)',
    HIGH: 'var(--up1-color-danger)',
    CRITICAL: 'var(--up1-color-danger-dark)'
  }
  return colores[nivel] || 'var(--up1-color-secondary)'
}

export function formatearPuntuacion(score: number): string {
  return `${Math.round(score)}%`
}
```

**Diferencia con composable de componente:**

| Tipo | Ubicacion | Contenido | Se sincroniza a |
|------|-----------|-----------|----------------|
| modsComposable | `modsComposables/` | Funciones puras, sin GraphQL, sin reactivity | `layout/src/composables/` + `suite/modsComposables/` |
| Composable de componente | `modsComponents/X/useX.ts` | GraphQL, refs reactivos, logica de UI | Junto al componente |

**Conflictos**: nombres de composables duplicados entre mods **abortan** el sync.

---

### 5.6 events/ — Eventos BullMQ

Eventos asincronicos que se disparan ante cambios de datos.

#### Estructura de un evento

```json
{
  "id": "miobjeto:publicado",
  "description": "Se dispara cuando un registro de MiObjeto pasa a estado PUBLICADO",
  "trigger": {
    "objectType": "MiObjeto",
    "operation": "update",
    "condition": "data.status === 'PUBLICADO'"
  },
  "includeFields": ["id", "nombre", "estado"],
  "priority": 5,
  "attempts": 3
}
```

| Campo | Descripcion |
|-------|-------------|
| `id` | Identificador unico. Convencion: `<objeto>:<accion>` |
| `trigger.objectType` | Objeto que dispara el evento |
| `trigger.operation` | `"create"`, `"update"`, o `"delete"` |
| `trigger.condition` | Expresion JS evaluada contra el registro. Opcional |
| `includeFields` | Campos a incluir en el payload del evento |
| `priority` | Prioridad BullMQ (1 = maxima) |
| `attempts` | Reintentos ante fallo |

#### Tipos de evento

1. **Sin condicion** (se dispara en TODA operacion del tipo): omitir `condition`
2. **Con condicion en create**: se dispara solo cuando el registro nuevo cumple la condicion
3. **Con condicion en update**: se dispara cuando la actualizacion cumple la condicion

#### Flujo de procesamiento

```text
Suite (Frontend)        Object Manager       Redis (BullMQ)    Worker        Flow Engine (n8n)
       │                      │                    │              │                 │
       │ GraphQL Mutation      │                    │              │                 │
       │ (create/update/delete)│                    │              │                 │
       │ ─────────────────────►│                    │              │                 │
       │                      │ withEventPublish()  │              │                 │
       │                      │ detecta match       │              │                 │
       │                      │ con evento          │              │                 │
       │                      │ Encola job con      │              │                 │
       │                      │ payload             │              │                 │
       │                      │ ───────────────────►│              │                 │
       │ Respuesta GraphQL     │                    │              │                 │
       │ (no espera al evento) │                    │              │                 │
       │◄─────────────────────-│                    │              │                 │
       │                      │                    │ Consume job  │                 │
       │                      │                    │ de la cola   │                 │
       │                      │                    │ ────────────►│                 │
       │                      │                    │ Pub/Sub —    │                 │
       │                      │                    │ publica en   │                 │
       │                      │                    │ canal del mod│                 │
       │                      │                    │◄─────────────│                 │
       │                      │                    │ Up1RedisTrigger escucha canal  │
       │                      │                    │ ───────────────────────────────►│
       │                      │                    │              │  Ejecuta workflow│
       │                      │                    │              │  (notificacion,  │
       │                      │                    │              │   logica, etc.)  │
```

> **Asincronico:** la mutacion retorna inmediatamente. El evento se procesa en background via Worker → n8n.

#### Despues de crear/modificar eventos

```bash
npm run sync
docker compose --profile worker up -d  # Asegurar que el worker esta corriendo
```

**Ejemplo real**: `hello-world-mod/events/` — `hw-assessment-high.json` (condicional), `hw-intervention-created.json` (sin condicion), `hw-intervention-completed.json` (update condicional).

---

### 5.7 flows/ — Workflows n8n

Definiciones de workflows n8n como JSON. Se sincronizan al Flow Engine via REST API (fase 9 del sync).

#### Como crear un flow

1. **Disenar en n8n** (http://localhost:5678) visualmente
2. **Exportar**: menu → Download (o `GET /rest/workflows/:id`)
3. **Limpiar** campos auto-generados: `id`, `createdAt`, `updatedAt`, `versionId`
4. **Guardar** en `flows/{nombre-descriptivo}.json`

#### Estructura del JSON

```json
{
  "name": "[MiMod] Notificacion Diaria",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [0, 0],
      "parameters": {
        "rule": {
          "interval": [{ "field": "cronExpression", "expression": "0 9 * * 1-5" }]
        }
      }
    },
    {
      "name": "UP1 Notification",
      "type": "n8n-nodes-base.up1Notification",
      "typeVersion": 1,
      "position": [220, 0],
      "parameters": {
        "operation": "send",
        "channels": ["inapp"],
        "title": "Recordatorio",
        "message": "Tienes tareas pendientes"
      }
    }
  ],
  "connections": {
    "Schedule Trigger": {
      "main": [[{ "node": "UP1 Notification", "type": "main", "index": 0 }]]
    }
  },
  "settings": { "executionOrder": "v1" }
}
```

| Campo | Requerido | Descripcion |
|-------|-----------|-------------|
| `name` | Si | Nombre en n8n. Convencion: prefijo `[NombreMod]` |
| `nodes` | Si | Array de nodos n8n |
| `connections` | Si | Conexiones entre nodos |
| `settings` | No | Configuracion del workflow |
| `staticData` | No | Estado persistente de triggers |

#### Nodos custom de uP1

| Nodo | Uso |
|------|-----|
| `Up1RedisCreate` | Escucha creacion de registros |
| `Up1RedisUpdate` | Escucha actualizacion |
| `Up1RedisDelete` | Escucha eliminacion |
| `Up1RedisTrigger` | Trigger generico por canal Redis |
| `Up1Notification` | Notificaciones (in-app + email) |

#### Rename safety

El sync asigna `settings.up1Source = "{mod}/{archivo}"` como identificador estable. Se puede renombrar un workflow (cambiar `name`) sin crear duplicados.

#### Sync standalone (solo flows)

```bash
npm run sync:flows --workspace=@uplanner/object-management-backend
```

**Ejemplo real**: `uengagement-up1/flows/`: `flow-01-enrollment-capacity-increment.json` (actualiza `Offering.usedCapacity` al inscribirse), `flow-13-teachingassignment-coverage-create.json` (crea `TeachingCoverage` al asignar un instructor).

---

### 5.8 css/ — Estilos por capas

Sistema de estilos en capas CSS. Cada capa posterior sobreescribe las anteriores.

#### Estructura de capas

```
css/
├── 1-theme/        → @layer theme       (tokens del mod)
├── 2-objectName/   → @layer objectName  (estilos por objeto)
├── 3-viewType/     → @layer viewType    (estilos por tipo de vista)
├── 4-objectId/     → @layer objectId    (estilos por registro)
└── 5-contextId/    → @layer contextId   (estilos por contexto)
```

#### Theme — Tokens del mod (1-theme/)

```css
/* css/1-theme/mi-mod.css */
:root {
  --mimod-card-bg: var(--up1-bg-primary, #ffffff);
  --mimod-card-text: var(--up1-text-primary, #212529);
  --mimod-card-border: var(--up1-border-color, #dee2e6);
  --mimod-color-active: var(--up1-color-success, #22c55e);
}
```

#### Estilos por objeto (2-objectName/)

```css
/* css/2-objectName/mi-objeto.css */
.status-badge--activo {
  background-color: var(--mimod-color-active);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
}
```

#### Reglas

- Usar `var(--mimod-*)` para propiedades custom del mod
- Delegar a `var(--up1-*)` tokens de plataforma con fallbacks
- Nunca usar Bootstrap directo — usar atoms en componentes, variables CSS en stylesheets
- Nunca hardcodear colores o medidas

Se sincronizan a `suite/css/mods/`.

**Ejemplo real**: `hello-world-mod/css/` — `1-theme/hello-world.css`, `2-objectName/hw-assessment.css`, `2-objectName/hw-intervention.css`.

---

### 5.9 lang/ — Traducciones i18n

La BD almacena claves, no texto plano. El texto se resuelve en runtime.

#### Convencion de nombres de archivos

| Patron | Alcance | Ejemplo |
|--------|---------|---------|
| `{locale}_{country}.json` | Traducciones base del mod | `es_CL.json` |
| `{locale}_{country}@{Object}.json` | Override por objeto | `es_CL@MiObjeto.json` |

Los archivos per-object sobreescriben los base.

#### Categorias de claves

```json
{
  "column": {
    "nombre": "Nombre",
    "estado": "Estado",
    "puntuacion": "Puntuacion"
  },
  "steps": {
    "step1": "Datos Basicos",
    "step2": "Configuracion"
  },
  "createModalTitle": {
    "mi_objeto_list": "Crear Nuevo Objeto"
  },
  "tabs": {
    "detalle": "Detalle",
    "hijos": "Elementos Hijo"
  },
  "actions": {
    "crearHijo": "Crear Hijo",
    "crearHijoTitulo": "Crear Hijo para [record.name]"
  }
}
```

| Seccion | Proposito | Usado por |
|---------|---------|-----------|
| `column` | Labels de campos/columnas | RecordList, RecordDetail |
| `steps` | Labels de wizard steps | RecordDetail con `steps` |
| `createModalTitle` | Titulo del modal de creacion por layout | RecordList |
| `tabs` | Labels de pestanas | RecordDetail con `tabs` |
| `actions` | Labels y titulos de row actions | `languageTag` / `modalTitleTag` |

#### Jerarquia de resolucion (mayor prioridad primero)

1. Objeto + Layout especifico
2. Objeto especifico
3. Layout especifico
4. Institucion global
5. Pais global
6. Idioma global

Siempre usar `$t('clave')` en templates, NUNCA texto hardcodeado.

#### Despues de modificar traducciones

```bash
npm run sync    # Sincroniza a suite/lang/
# Reiniciar Suite dev server
```

**Conflictos**: claves i18n duplicadas en el mismo locale entre mods **abortan** el sync.

**Ejemplo real**: `hello-world-mod/lang/` — 8 archivos (es_CL + en_CL, base + per-object para 3 objetos).

---

### 5.10 seed/ — Datos iniciales

Datos de referencia y demo que se populan durante `npm run seed`.

#### Seeds planos (auto-ejecutados en fase 8)

```javascript
// seed/config-seeds.js
export default [
  {
    objectName: 'MiObjeto',
    uniqueKey: { nombre: 'Item Default' },
    data: { nombre: 'Item Default', estado: 'ACTIVO', puntuacion: 50 }
  },
];
```

#### Seeds relacionales (ejecucion manual)

Para FK entre objetos, usar un script con prefijo `_` (fase 8 lo ignora):

```javascript
// seed/_populate-relations.js
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

Ejecutar manualmente:

```bash
node mods/mi-mod/seed/_populate-relations.js
```

**Patrones clave:**
- Prefijo `_` = excluido de ejecucion automatica
- Usar `tenantManager` para iterar todos los tenants
- Logica upsert (find + create/update) para ejecuciones idempotentes
- Prisma `connect` para FKs

**Ejemplo real**: `hello-world-mod/seed/` — `config-seeds.js` (planos), `example-seeds.js` (datos demo), `populate-relations.js` (relaciones FK).

---

### 5.11 tests/ — Testing

Los mods usan **Vitest** para unit e integration tests. Esta carpeta NO se sincroniza.

#### Estructura de tests

```
tests/
├── unit/
│   ├── resolvers/         ← Tests de resolvers
│   ├── composables/       ← Tests de composables Vue
│   ├── config/            ← Validacion de configuracion
│   └── roleFiltering/     ← Tests de filtrado RBAC
├── mocks/
│   ├── prisma.mock.js     ← Factory de mock Prisma
│   └── auth.mock.js       ← Mock de contexto auth
└── fixtures/
    └── mockData.js        ← Datos compartidos de test
```

#### vitest.config.js

```javascript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.{js,ts}'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@om': path.resolve(__dirname, '../../object-manager/src'),
      '@om-scripts': path.resolve(__dirname, '../../object-manager/scripts'),
    },
  },
});
```

#### Patrones de mock

**Prisma mock:**

```javascript
export function createPrismaMock(overrides = {}) {
  return {
    miObjeto: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      ...overrides,
    },
  };
}
```

**Auth context mock:**

```javascript
export function createAuthContext(overrides = {}) {
  return {
    tenantId: 'TEST',
    userId: 'test-user-id',
    roles: ['Admin'],
    ...overrides,
  };
}
```

**Test de resolver:**

```javascript
import { createPrismaMock } from '../mocks/prisma.mock.js';
import { createAuthContext } from '../mocks/auth.mock.js';

describe('miResolver', () => {
  it('filtra por tenantId', async () => {
    const prisma = createPrismaMock();
    const context = { prisma, ...createAuthContext() };

    await resolver.Query.getMisDatos(null, {}, context);

    expect(prisma.miObjeto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'TEST' }),
      })
    );
  });
});
```

**Config validation test**: validar app.json, objects, layouts, capabilities antes del sync. Ver `hello-world-mod/tests/unit/config/config.validation.test.js`.

#### Ejecutar tests

```bash
npm test --workspace=@uplanner/mi-mod
npm run test:watch --workspace=@uplanner/mi-mod
npm run test:coverage --workspace=@uplanner/mi-mod
```

---

### 5.12 src/ — Scripts internos (Python)

Directorio para scripts que el mod ejecuta internamente. **NO se sincroniza** a ningun workspace.

#### Arquitectura de integracion Python

```
Vue Component → Composable → GraphQL → Resolver (Node.js) → child_process.spawn → Python Script
                                                                    ↓
                                                              JSON stdout → parsed → GraphQL response
```

#### Contrato del script Python

- **Input**: argumentos CLI (`sys.argv[1]`, `sys.argv[2]`, etc.)
- **Output**: JSON via `print(json.dumps(result))`
- **Errores**: exit code != 0 + stderr

```python
#!/usr/bin/env python3
import sys, json

def procesar(texto):
    return { "original": texto, "procesado": texto.upper() }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No se proporciono input"}))
        sys.exit(1)
    result = procesar(sys.argv[1])
    print(json.dumps(result, ensure_ascii=True))

if __name__ == "__main__":
    main()
```

**Reglas:**
1. Siempre output JSON — el resolver parsea stdout como JSON
2. Usar `ensure_ascii=True` para evitar problemas de encoding
3. `sys.exit(1)` para errores
4. Sin input interactivo
5. Preferir stdlib; documentar paquetes externos en README

#### Resolucion de path en resolver

Despues del sync, el resolver corre desde `object-manager/src/graphql/resolvers/mods/{mod}/`. El script Python queda en `mods/{mod}/src/`. Se calcula la ruta: 6 niveles arriba hasta la raiz del monorepo.

```javascript
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(__dirname,
  '..', '..', '..', '..', '..', '..',
  'mods', 'mi-mod', 'src', 'mi_script.py'
);
```

**Ejemplo real**: `hello-world-mod/logic/textTransform.resolver.js` + `hello-world-mod/src/text_transformer.py`.

---

### 5.13 docs/ y .ai/ — Documentacion

Carpetas para documentacion del mod y contexto de IA. **NO se sincronizan**.

- `docs/`: guias de desarrollo, patrones del mod, integraciones
- `.ai/`: archivos de contexto para asistentes de IA (CONTEXT.md, PATTERNS.md, TASKS.md, TROUBLESHOOTING.md)

**Ejemplo real**: `hello-world-mod/docs/guides/` — `new-mod.md`, `layouts.md`, `components.md`, `python-integration.md`.

---

## 6. Mecanismo de sync

Al ejecutar `npm run sync`, los artefactos del mod se copian a los workspaces core en **9 fases**.

### Las 9 fases

| Fase | Nombre | Que hace | Requiere BD |
|------|--------|----------|-------------|
| 1 | Mirror Sync | Copia proyectos al directorio `up1/` | No |
| 2 | Merge Sync | Copia objects/ a `object-manager/objects/business/` | No |
| 3 | Prisma Schema | Genera Prisma schema + client (base + per-tenant) | No |
| 4 | Capability Sync | Inserta capabilities en BD | Si |
| 5 | Logic Sync | Copia resolvers a `object-manager/src/graphql/resolvers/mods/{mod}/` | No |
| 6 | Apps & Layouts | Inserta app.json y layouts en BD del tenant | Si |
| 7 | Default Layouts | Layouts por defecto a BD | Si |
| 8 | Seed Data | Ejecuta seeds del mod en BD | Si |
| 9 | Flow Sync | Sube workflows JSON a n8n via REST API | Si (n8n) |

Fases 4, 6, 7, 8 y 9 se **saltan** si no hay conexion a BD/n8n.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  npm run sync                                                               │
│                                                                             │
│  object-manager/scripts/sync.js                                             │
│                                                                             │
│  Fase 1: Mirror Sync                                                        │
│  Copia proyectos → up1/                                                     │
│          │                                                                  │
│          ▼                                                                  │
│  Fase 2: Merge Sync                                                         │
│  objects/ → OM/objects/business/                                            │
│          │                                                                  │
│          ▼                                                                  │
│  Fase 3: Prisma Schema                                                      │
│  Genera schema + client                                                     │
│          │                                                                  │
│          ▼                                                                  │
│  ┌──────────────────┐                                                       │
│  │  BD disponible?  │                                                       │
│  └──────┬────────┬──┘                                                       │
│        Si        No                                                         │
│         │        │                                                          │
│         ▼        │                                                          │
│  Fase 4: Capability Sync                                                    │
│  capabilities → BD                                                          │
│         │        │                                                          │
│         └────────┘                                                          │
│         ▼                                                                   │
│  Fase 5: Logic Sync                                                         │
│  resolvers → OM/resolvers/mods/                                             │
│          │                                                                  │
│          ▼                                                                  │
│  Fase 6: Apps & Layouts                                                     │
│  app.json + layouts → BD                                                    │
│          │                                                                  │
│          ▼                                                                  │
│  Fase 7: Default Layouts → BD                                               │
│          │                                                                  │
│          ▼                                                                  │
│  Fase 8: Seed Data → BD                                                     │
│          │                                                                  │
│          ▼                                                                  │
│  ┌──────────────────┐                                                       │
│  │  n8n disponible? │                                                       │
│  └──────┬────────┬──┘                                                       │
│        Si        No                                                         │
│         │        │                                                          │
│         ▼        │                                                          │
│  Fase 9: Flow Sync                                                          │
│  flows → n8n REST API                                                       │
│         │        │                                                          │
└─────────┼────────┼────────────────────────────────────────────────────────-┘
          └────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Scripts frontend (paralelos)                                               │
│                                                                             │
│  layout/scripts/sync.js          suite/scripts/sync-styles.js              │
│  modsComponents + modsComposables  CSS por capas                            │
│          │                               │                                  │
│          └───────────────────────────────┘                                  │
│                          │                                                  │
│                          ▼                                                  │
│             suite/scripts/sync-i18n.js                                     │
│             Traducciones (merge)                                            │
│                          │                                                  │
└──────────────────────────┼──────────────────────────────────────────────────┘
                           │
                           ▼
                    Sync completo
```

### Orquestacion

El `npm run sync` raiz ejecuta 4 scripts en secuencia:

1. `object-manager/scripts/sync.js` → fases 1-9
2. `layout/scripts/sync.js` → modsComponents + modsComposables
3. `suite/scripts/sync-styles.js` → CSS
4. `suite/scripts/sync-i18n.js` → traducciones

### Mapeo completo archivo → destino

| Origen en mod | Destino | Script |
|---------------|---------|--------|
| `objects/*.json` | `object-manager/objects/business/` | SyncManager.js |
| `logic/*.js` | `object-manager/src/graphql/resolvers/mods/{mod}/` | SyncManager.js |
| `logic/*.graphql` | (junto a resolvers) | SyncManager.js |
| `modsComponents/*/` | `layout/src/modsComponents/` + `suite/modsComponents/` | layout/sync.js |
| `*.stories.ts` | `layout/src/stories/` (solo, NO va a suite) | layout/sync.js |
| `modsComposables/*.ts` | `layout/src/composables/` + `suite/modsComposables/` | layout/sync.js |
| `css/{layer}/*.css` | `suite/css/mods/` | suite/sync-styles.js |
| `lang/**/*.json` | `suite/lang/` | suite/sync-i18n.js |
| `events/*.json` | `object-manager/events/` | SyncManager.js |
| `config/app.json` | BD: `up1_suite_app` | SyncManager.js |
| `config/layouts/*.json` | BD: `up1_layen_layout` | SyncManager.js |
| `capabilities.json` | BD: tabla capabilities | SyncManager.js |
| `seed/*.js` | BD: datos por tenant | SyncManager.js |
| `flows/*.json` | n8n: workflows via REST API | flowSync.js |

### Que NO se sincroniza

- `tests/` — tests unitarios e integracion
- `docs/` — documentacion del mod
- `.ai/` — contexto IA
- `src/` — scripts internos (ej: Python)
- `seed/` — solo se ejecuta contra BD, no se copia al filesystem

### Conflictos que abortan el sync

- Nombres de **composables** duplicados entre mods
- Nombres de **componentes** (carpetas) duplicados entre mods
- Claves **i18n** duplicadas en el mismo locale entre mods

### Regla fundamental

**NUNCA editar archivos en los destinos del sync.** Todos los cambios en la carpeta del mod. Despues: `npm run sync`.

Archivos que nunca editar:
- `suite/modsComponents/`
- `suite/modsComposables/`
- `suite/lang/` (traducciones de mods)
- `suite/css/mods/`
- `layout/src/modsComponents/`
- `layout/src/composables/` (composables de mods)
- `object-manager/src/graphql/resolvers/mods/`
- `prisma/schema.prisma` (generado)
- `src/graphql/typeDefs/dynamic.js` (generado)

### ignoredMods

El `package.json` raiz tiene un array `ignoredMods`. Los mods listados ahi se excluyen de **todas** las fases del sync:

```json
{
  "ignoredMods": ["hello-world-mod"]
}
```

Para activar un mod excluido: removerlo del array y correr `npm run sync`.

---

## 7. Desarrollo local sin Bitbucket

El array `uPlannerMods` en `package.json` raiz **solo** se usa para `npm run setup` (clone automatico desde Bitbucket). Los scripts de sync **no leen ese array** — escanean el directorio `mods/` directamente.

Esto significa que cualquier carpeta creada manualmente en `mods/` sera detectada y sincronizada.

### Pasos para un mod local

```bash
# 1. Crear directorio
mkdir -p mods/mi-mod-local

# 2. Inicializar git (recomendado, no obligatorio)
cd mods/mi-mod-local
git init

# 3. Crear estructura minima
cat > package.json << 'EOF'
{
  "name": "@uplanner/mi-mod-local",
  "version": "1.0.0",
  "private": true
}
EOF

cat > capabilities.json << 'EOF'
[]
EOF

mkdir -p config/layouts objects logic

cat > config/app.json << 'EOF'
{
  "name": "mi-mod-local",
  "label": "Mi Mod (Dev)",
  "icon": "bi-tools",
  "order": 20,
  "roles": ["Admin"],
  "tenants": ["UPU"],
  "version": "1.0.0"
}
EOF

# 4. Volver a la raiz y sincronizar
cd ../..
npm run sync

# 5. Verificar
npm run check-mods
```

### Checklist

- NO agregarlo a `ignoredMods` en package.json raiz (lo excluiria)
- NO es necesario agregarlo a `uPlannerMods` (solo sirve para clone automatico)
- NO hay watch mode para sync — siempre `npm run sync` manual

---

## 8. Convenciones de nombres

| Elemento | Convencion | Ejemplo |
|----------|-----------|---------|
| Nombre de mod | kebab-case | `mi-mod`, `learning-assurance` |
| Package name | `@uplanner/{mod}` | `@uplanner/mi-mod` |
| Objetos (JSON) | PascalCase | `StudentSupport.json` |
| Resolvers | camelCase + sufijo Query/Mutation | `miFeatureQuery`, `miFeatureMutation` |
| Archivos resolver | camelCase | `miFeature.resolver.js` |
| Archivos schema | camelCase | `miFeature.schema.graphql` |
| Carpeta componente | PascalCase | `MiWidget/` |
| Componente Vue | PascalCase + Element | `MiWidgetElement.vue` |
| Tipo en layout JSON | kebab-case (auto) | `"type": "mi-widget"` |
| Composable de componente | `use{Name}.ts` | `useMiWidget.ts` |
| modsComposable | `use{Name}.ts` | `useMiLogica.ts` |
| Archivos CSS | kebab-case | `mi-objeto.css` |
| Archivos lang | `{locale}_{country}[@{Object}].json` | `es_CL.json`, `es_CL@MiObjeto.json` |
| Archivos evento | kebab-case | `mi-evento.json` |
| Archivos flow | kebab-case | `mi-workflow.json` |
| Nombre workflow n8n | `[NombreMod] Descripcion` | `[MiMod] Notificacion Diaria` |
| Capability modulo | `mod/{modname}:{accion}` | `mod/mi-mod:view_dashboard` |
| Capability objeto | `{objectname}:{accion}` | `miobjeto:create` |
| Capability campo | `{objectname}.{field}:{accion}` | `miobjeto.salary:view` |
| Layout names | snake_case | `mi_objeto_list`, `mi_objeto_view` |
| App name | kebab-case | `"name": "mi-mod"` |
| FK field | `{camelCaseObject}Id` | `padreObjetoId` |
| Seed scripts | prefijo `_` = manual | `_populate-relations.js` |
| CSS tokens mod | `--{modname}-*` | `--mimod-card-bg` |
| CSS tokens plataforma | `--up1-*` | `--up1-color-primary` |

---

## 9. Flujo de trabajo diario

### Ciclo basico

```text
┌──────────────────────────────────┐
│ 1. Editar archivos en            │
│    mods/mi-mod/                  │◄─────────────────────────────────┐
└─────────────────┬────────────────┘                                  │
                  │                                                   │
                  ▼                                                   │
          ┌───────────────┐                                           │
          │ 2. npm run sync│                                          │
          └───────┬────────┘                                          │
                  │                                                   │
                  ▼                                                   │
          ┌───────────────────┐                                       │
          │ 3. Tipo de cambio?│                                       │
          └───────┬───────────┘                                       │
                  │                                                   │
   ┌──────┬───────┼──────┬──────┬──────┬──────────────┐             │
   ▼      ▼       ▼      ▼      ▼      ▼              ▼             │
objects/ logic/  mods-  config/ lang/  css/     events,flows,       │
         │       Comp/  layouts/  │     │        capabilities,       │
         ▼         │       │      ▼     ▼        seed                │
npm run  Reiniciar Hot    Recarga Reiniciar Hard   Listo             │
codegen  Object   reload  auto    Suite   refresh  con sync          │
+migrate Manager  auto                    browser     │              │
   │       │       │       │      │       │            │             │
   └───────┴───────┴───────┴──────┴───────┴────────────┘             │
                                  │                                   │
                                  ▼                                   │
                   ┌──────────────────────────────┐                  │
                   │ 4. Verificar en              │ ─────────────────┘
                   │    localhost:3000/TENANT      │
                   └──────────────────────────────┘
```

### Pasos segun tipo de cambio

| Cambio | Pasos adicionales |
|--------|-------------------|
| Nuevo objeto o campo | `npm run codegen` → `npm run tenant:migrate` → `npm run sync` |
| Resolver custom | `npm run sync` → reiniciar Object Manager |
| Componente Vue | `npm run sync` → hot reload automatico |
| Layout JSON | `npm run sync` → recarga automatica |
| Traduccion | `npm run sync` → reiniciar Suite |
| Estilo CSS | `npm run sync` → hard refresh browser |
| Evento | `npm run sync` → recarga cache automatica |
| Flow n8n | `npm run sync` (o `npm run sync:flows`) |
| Capability | `npm run sync` |
| Seed data | `npm run sync` (o ejecucion manual) |

### Comandos de referencia

| Comando | Para que |
|---------|----------|
| `npm run setup` | Primer setup completo |
| `npm run sync` | Sincronizar mods a workspaces core |
| `npm run update-repos` | Pull latest de todos los repos |
| `npm run check-mods` | Validar estructura de mods |
| `npm run codegen --workspace=@uplanner/object-management-backend` | Generar Prisma + GraphQL desde objects |
| `npm run tenant:migrate --workspace=@uplanner/object-management-backend` | Aplicar migracion BD |
| `npm run tenant:create --workspace=@uplanner/object-management-backend` | Crear nuevo tenant |
| `npm run tenant:studio --workspace=@uplanner/object-management-backend` | Abrir Prisma Studio |
| `npm run dev --workspace=@uplanner/object-management-backend` | Backend (localhost:4000) |
| `npm run dev --workspace=@uplanner/suite` | Frontend (localhost:3000) |
| `npm run storybook --workspace=@uplanner/layout-engine` | Storybook (localhost:6006) |
| `docker compose --profile worker up -d` | Redis + Worker (para eventos) |
| `docker compose --profile flow up -d` | n8n (localhost:5678) |

---

## 10. Do's y Don'ts

Reglas practicas para evitar errores comunes y mantener la calidad al crear o trabajar en un mod.

### Arquitectura y aislamiento

| DO | DON'T |
|----|-------|
| Mantener el mod autocontenido — todo dentro de `mods/{mod}/` | Crear dependencias entre mods (mod A importa de mod B) |
| Acceder a datos solo via GraphQL API (Object Manager) | Acceder a BD directamente desde componentes o scripts del mod |
| Referenciar objetos core via FK (`isForeignKey` + `references`) | Copiar o duplicar logica de objetos core dentro del mod |
| Disenar pensando en multi-tenant desde el inicio | Hardcodear tenant IDs, nombres de cliente, o datos especificos |
| Usar `tenantId: context.tenantId` en **todo** where de resolver | Asumir que los datos ya estan filtrados por tenant |
| Activar/desactivar funcionalidad via `tenants` en app.json | Usar `if (tenant === 'X')` en logica de negocio |

### Sync y archivos generados

| DO | DON'T |
|----|-------|
| Editar siempre en `mods/{mod}/` y despues `npm run sync` | Editar archivos en destinos del sync (`suite/modsComponents/`, `suite/lang/`, `object-manager/resolvers/mods/`, etc.) |
| Correr `npm run sync` despues de cada cambio en el mod | Asumir que los cambios se propagan solos (no hay watch mode) |
| Correr `npm run codegen` + `tenant:migrate` despues de cambiar objects | Editar `prisma/schema.prisma` a mano (es generado) |
| Verificar con `npm run check-mods` periodicamente | Ignorar warnings del check-mods |
| Usar nombres unicos para componentes y composables | Reusar nombres de otro mod (aborta el sync) |
| Prefixar claves i18n por mod para evitar colisiones | Usar claves genericas como `"column.name"` sin contexto |

### Resolvers

| DO | DON'T |
|----|-------|
| Nombrar exports con `Query` o `Mutation` en el nombre | Nombrar exports como `miFeatureResolvers` (se ignora silenciosamente) |
| Usar `extend type Query` / `extend type Mutation` en schemas | Redefinir `type Query` o `type Mutation` (rompe el schema merge) |
| Proteger resolvers con `withAuth(['capability'])` | Exponer resolvers sin autenticacion ni autorizacion |
| Usar `context.prisma.$transaction()` para operaciones atomicas | Hacer multiples writes sin transaccion cuando dependen entre si |
| Aprovechar el CRUD generico (`listInstances`, `createInstance`) cuando basta | Crear resolvers custom para operaciones que el CRUD auto ya cubre |
| Verificar que el import path de `withAuth` sea correcto (4 niveles arriba) | Copiar imports de otro mod sin ajustar la ruta relativa |

### Objetos de negocio

| DO | DON'T |
|----|-------|
| Usar JSON Schema valido con `$schema`, `title`, `type`, `metadata` | Omitir `metadata` (label, labelPlural, gender) — la UI los necesita |
| Nombrar campos FK como `{camelCaseObjectName}Id` | Usar nombres de FK arbitrarios (el codegen depende de la convencion) |
| Definir `enum` para campos con valores cerrados | Usar `string` libre donde hay opciones fijas (sin validacion) |
| Agregar `not_null` y `required` donde corresponde | Dejar todo nullable — produce datos inconsistentes |
| Usar `static_default` para valores iniciales | Asignar defaults en logica de frontend (no se aplican en imports/API) |
| Documentar cada campo con `description` | Dejar campos sin `title` ni `description` |

### Layouts

| DO | DON'T |
|----|-------|
| Usar `applicationId: null` para layouts auxiliares (targets de row actions, listas embebidas) | Crear layouts auxiliares con applicationId — aparecen en navegacion sin sentido |
| Definir `associatedLayoutConfigs` para conectar list → view → edit | Esperar que la navegacion entre layouts funcione sola |
| Usar `{{parentId}}` para filtros en listas embebidas | Hardcodear IDs en filtros |
| Usar `{{CURRENT_USER_ID}}` para auto-asignacion y "mis registros" | Obtener el user ID por otro mecanismo en layouts |
| Definir `roles` en layouts sensibles | Asumir que el filtrado de app.json es suficiente para cada vista |
| Usar `requiredCapability` en row actions destructivos | Dejar acciones de delete/publish sin gating RBAC |
| Agregar `visibilityConditions` para acciones contextuales | Mostrar acciones que no aplican al estado actual del registro |
| Usar `languageTag` y `modalTitleTag` para i18n en row actions | Hardcodear labels de acciones (no se traducen) |

### Componentes Vue

| DO | DON'T |
|----|-------|
| Usar `defineElement()` + `ElementLayout` para componentes del Layout Engine | Usar `<script setup>` en Vueform elements (necesita Options API) |
| Importar atoms (`Button`, `Heading`, `Text`, `Spinner`) de la libreria layout | Usar HTML nativo o clases Bootstrap directamente en molecules/organisms |
| Usar `var(--up1-*)` y `var(--mimod-*)` para estilos | Hardcodear colores, fuentes o medidas |
| Usar `useTenantApolloClient()` para GraphQL | Importar Apollo Client directamente o crear instancias propias |
| Crear Storybook story con `useMockData: true` para cada componente | Deployar componentes sin story (no se pueden probar aislados) |
| Separar logica en composable (`useMiWidget.ts`) y UI en el `.vue` | Meter toda la logica GraphQL + estado + UI en un solo archivo |
| Usar `submits: false` en elements que son read-only o manejan su propio save | Dejar `submits: true` (default) en elements que no son campos de formulario |

### CSS y estilos

| DO | DON'T |
|----|-------|
| Definir tokens del mod en `1-theme/` con fallback a `--up1-*` | Definir tokens sin fallback (se rompe si la plataforma cambia) |
| Respetar la jerarquia de capas (theme → objectName → viewType → objectId → contextId) | Poner estilos en la capa incorrecta (un estilo de objeto en `1-theme/`) |
| Usar selectores especificos al objeto/componente | Usar selectores globales que afectan otros mods o el core |

### Traducciones

| DO | DON'T |
|----|-------|
| Crear archivos base (`es_CL.json`) + per-object (`es_CL@MiObjeto.json`) | Poner todas las traducciones en un solo archivo gigante |
| Cubrir todos los locales que usa el tenant | Cubrir solo un idioma y dejar claves sin traducir |
| Usar `$t('clave')` en templates | Hardcodear texto visible en templates o componentes |
| Traducir labels de steps, tabs, y row actions | Asumir que solo las columnas necesitan traduccion |

### Eventos y flows

| DO | DON'T |
|----|-------|
| Definir `includeFields` con solo los campos necesarios | Enviar todos los campos del registro en el payload (peso innecesario) |
| Usar condiciones en triggers para filtrar eventos relevantes | Disparar eventos en toda operacion y filtrar despues en el worker |
| Disenar workflows en n8n UI y exportar como JSON | Escribir JSONs de flow a mano (propenso a errores de estructura) |
| Limpiar `id`, `createdAt`, `updatedAt` del JSON exportado | Dejar campos auto-generados de n8n (crean conflictos en sync) |
| Usar prefijo `[NombreMod]` en nombres de workflow | Usar nombres genericos sin contexto del mod |

### Testing

| DO | DON'T |
|----|-------|
| Crear tests de resolvers verificando filtrado por `tenantId` | Asumir que el aislamiento multi-tenant funciona sin testearlo |
| Crear tests de validacion de config (app.json, objects, layouts, capabilities) | Esperar a que el sync falle para descubrir errores de configuracion |
| Usar mocks de Prisma y Auth context (factory pattern) | Conectar a BD real en tests unitarios |
| Testear edge cases: permisos insuficientes, datos faltantes, tenant inexistente | Solo testear el happy path |
| Mockear `child_process.spawn` para tests de integracion Python | Depender de Python instalado para correr tests unitarios |

### Seeds

| DO | DON'T |
|----|-------|
| Usar logica upsert (find + create/update) para seeds idempotentes | Crear seeds que fallan si se corren dos veces (inserts sin verificar) |
| Prefixar con `_` los scripts de seeds relacionales | Esperar que seeds con FK se ejecuten automaticamente en el orden correcto |
| Usar `tenantManager` para iterar todos los tenants | Hardcodear tenant IDs en scripts de seed |

### General

| DO | DON'T |
|----|-------|
| Documentar el mod en `README.md`, `docs/` y `.ai/` | Dejar el mod sin documentacion |
| Seguir las convenciones de nombres de la seccion 8 consistentemente | Inventar convenciones propias (rompe auto-discovery y codegen) |
| Validar con `npm run check-mods` antes de commitear | Commitear cambios sin verificar estructura |
| Correr tests del mod antes de hacer push | Pushear sin correr `npm test --workspace=@uplanner/mi-mod` |
| Pensar el mod como producto: podria activarse/desactivarse por cliente | Acoplar logica del mod a un cliente o configuracion especifica |
| Consultar el hello-world-mod como referencia antes de implementar un patron nuevo | Implementar un patron desde cero sin verificar si ya hay ejemplo oficial |

---

## 11. Troubleshooting

| Problema | Causa | Solucion |
|----------|-------|----------|
| Objeto no aparece en GraphQL | JSON con error de sintaxis o codegen no ejecutado | Verificar JSON → `npm run codegen` → reiniciar server |
| Resolver ignorado silenciosamente | Export no contiene "Query" o "Mutation" en el nombre | Renombrar export a `miFeatureQuery` o `miFeatureMutation` |
| Componente no renderiza | Sync no ejecutado o `defineElement()` faltante | `npm run sync` → verificar que usa `defineElement` con `name` |
| Traducciones muestran claves | Sync no ejecutado o archivo lang faltante | `npm run sync` → verificar archivo en `lang/` → reiniciar Suite |
| Estilos no aplican | Sync no ejecutado o layer incorrecto | `npm run sync` → verificar orden de capas → hard refresh |
| Conflicto de sync (composable/componente duplicado) | Nombre colisiona con otro mod | Renombrar el composable o componente |
| Conflicto i18n | Clave duplicada en mismo locale entre mods | Usar prefijo unico por mod en las claves |
| Fase 9 (flows) se salta | n8n no corriendo o `SKIP_DB_OPERATIONS=true` | Iniciar n8n: `docker compose up n8n` |
| Flow duplicado en n8n | Workflow existia antes de tag `up1Source` | Eliminar duplicado viejo en n8n |
| Mod no detectado por sync | No esta en `mods/` o esta en `ignoredMods` | Mover a `mods/` y/o remover de `ignoredMods` |
| Aislamiento de tenant roto | Query sin filtro `tenantId` | Agregar `tenantId: context.tenantId` en todo where |
| Python: "Failed to start" | Python no instalado o path incorrecto | Verificar `python3` en PATH, contar niveles de directorio |
| Seed no se ejecuta | Script con prefijo `_` (excluido de auto-ejecucion) | Ejecutar manualmente: `node mods/mi-mod/seed/_script.js` |

---

## 12. Migraciones de base de datos

Cuando un mod crea o modifica objetos, los cambios deben propagarse a PostgreSQL via Prisma.

### Flujo schema-driven

Los objetos JSON son la unica fuente de verdad. El schema de Prisma y la BD son derivados.

```text
┌─────────────────────────────┐  npm run sync   ┌───────────────────────────────┐
│  objects/MiObjeto.json      │ ───────────────► │  object-manager/              │
│  (fuente de verdad)         │                  │  objects/business/            │
└─────────────────────────────┘                  └──────────────┬────────────────┘
                                                                │
                                                    npm run codegen
                                                                │
                                                                ▼
                                                 ┌─────────────────────────────┐
                                                 │  prisma/schema.prisma       │
                                                 │  (GENERADO — no editar)     │
                                                 └──────────┬──────────────────┘
                                                            │
                          ┌─────────────────────────────────┴──────────────────┐
                          │ npm run tenant:migrate                              │ codegen
                          ▼                                                     ▼
                   ╔═════════════════╗                        ┌─────────────────────────┐
                   ║  PostgreSQL     ║                        │  typeDefs/dynamic.js    │
                   ║  tabla por      ║                        │  (GraphQL schema)       │
                   ║  tenant         ║                        └─────────────────────────┘
                   ╚═════════════════╝
```

### Comandos paso a paso

```bash
# 1. Editar JSON del objeto en el mod
# 2. Sincronizar al object-manager
npm run sync

# 3. Regenerar Prisma schema y tipos GraphQL
npm run codegen --workspace=@uplanner/object-management-backend

# 4. Aplicar migracion a BD (todos los tenants)
npm run tenant:migrate --workspace=@uplanner/object-management-backend

# 5. Reiniciar Object Manager para cargar nuevo schema
```

### Multi-tenant: como se aplican las migraciones

Cada tenant tiene su propio schema en PostgreSQL. `tenant:migrate` itera todos los tenants registrados y aplica las migraciones pendientes a cada uno.

```text
┌─────────────────────────────┐
│  npm run tenant:migrate     │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Leer lista de tenants      │
└────┬──────────┬─────────────┘
     │          │          │
     ▼          ▼          ▼
 Tenant UPU  Tenant TEST  Tenant ...
     │          │          │
     ▼          ▼          ▼
prisma       prisma       prisma
migrate      migrate      migrate
deploy       deploy       deploy
→ schema UPU → schema TEST → schema N
```

### Reglas criticas

- **NUNCA** editar `prisma/schema.prisma` a mano — es generado por codegen
- **NUNCA** crear migraciones manuales de Prisma — el flujo es siempre JSON → codegen → migrate
- Si se renombra un campo en el JSON, Prisma genera un DROP + CREATE (no un rename). Evaluar impacto
- Si se elimina un campo, la tabla pierde la columna. Verificar que no haya datos criticos

### Migraciones en produccion

Se ejecutan como ECS task separada (no como parte del deploy de servicios):

```bash
aws ecs run-task --cluster ecs-up1 --task-definition up1-migration-task \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[...],securityGroups=[...],assignPublicIp=DISABLED}" \
  --region sa-east-1
```

> **Orden en produccion:** primero migrar BD → despues deployar servicios. Si se despliega Object Manager antes de migrar, el schema GraphQL no coincide con la BD.

---

## 13. Deployment

### Infraestructura

uP1 corre en **AWS ECS** (Fargate). Tres servicios independientes:

```text
┌──────────────────────────────────────────────────────────────────┐
│  AWS ECS — Cluster ecs-up1                                       │
│                                                                  │
│  ┌─────────────────────────┐   ┌──────────────────────────────┐ │
│  │  Object Manager         │   │  Suite (Frontend)            │ │
│  │  Dockerfile.object-     │   │  Dockerfile.suite.aws        │ │
│  │  manager.aws            │   │  Puerto 3000                 │ │
│  │  Puerto 4000            │   └──────────────┬───────────────┘ │
│  └────────────┬────────────┘                  │                 │
│               │                               │ ───────────────►│(Object Manager)
│  ┌─────────────────────────┐                  │                 │
│  │  Worker (BullMQ)        │                  │                 │
│  │  Dockerfile.worker.aws  │                  │                 │
│  │  Background jobs        │                  │                 │
│  └────────────┬────────────┘                  │                 │
└───────────────┼───────────────────────────────┼─────────────────┘
                │                               │
       ┌────────┼────────────┐                  │
       ▼        ▼            ▼                  │
  PostgreSQL  Redis        n8n              Object Manager
  (RDS)      (ElastiCache) (Flow Engine)
  [OM → PG]  [OM → Redis]  [Worker → n8n]
             [Worker → Redis]
```

### Flujo de deploy (manual)

```bash
# 1. Autenticarse con ECR
aws ecr get-login-password --region sa-east-1 | \
  docker login --username AWS --password-stdin \
  073107684401.dkr.ecr.sa-east-1.amazonaws.com

# 2. Build del servicio (reemplazar {service} por object-manager, suite, o worker)
docker build -f ./aws/Dockerfile.{service}.aws -t up1/{service}:latest . --no-cache

# 3. Tag y push a ECR
docker tag up1/{service}:latest 073107684401.dkr.ecr.sa-east-1.amazonaws.com/up1/{service}:latest
docker push 073107684401.dkr.ecr.sa-east-1.amazonaws.com/up1/{service}:latest

# 4. Force deploy en ECS
aws ecs update-service --cluster ecs-up1 --service {ecs-service-name} \
  --force-new-deployment --region sa-east-1
```

### Orden de deploy

```text
┌──────────────────┐     ┌──────────────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  1. Migrar BD    │ ──► │  2. Deploy Object Manager│ ──► │ 3. Deploy Worker│ ──► │  4. Deploy Suite │
│  (ECS task)      │     └──────────────────────────┘     └─────────────────┘     └──────────────────┘
└──────────────────┘
```

> **Importante:** CI/CD automatizado esta en construccion. Actualmente el deploy es manual via AWS CLI.

### Logs en produccion

```bash
# Object Manager
aws logs tail /ecs/up1-object-manager --follow --region sa-east-1

# Suite
aws logs tail /ecs/up1-suite --follow --region sa-east-1

# Worker
aws logs tail /ecs/up1-worker --follow --region sa-east-1
```

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-04-10 | Documento inicial: guia completa de creacion y desarrollo de mods basada en docs oficiales, codigo de hello-world-mod y retention-wellbeing, y Confluence |
| 2026-04-10 | Agregada seccion 10: Do's y Don'ts — 12 categorias con reglas practicas |
| 2026-04-14 | Agregados diagramas Mermaid: ciclo de vida de objetos, flujo de eventos (sequence), 9 fases de sync, ciclo de trabajo diario |
| 2026-04-14 | Nuevas secciones 12 (Migraciones de BD) y 13 (Deployment) con info de Confluence |
