---
id: SPEC-mods-024
project: up1
type: doc
module: mods
tags:
  - up1
  - mods
  - modulos
  - extensibilidad
  - sync
  - objetos
  - resolvers
  - layouts
  - eventos
  - componentes
  - RBAC
  - capabilities
---

# uP1 Mods — Guia completa

## 1. Que son los mods

Un mod es una **extension autonoma** que representa un area funcional de negocio. Cada mod es un **repositorio git independiente** que se clona dentro del monorepo de uP1 y se integra via un mecanismo de sincronizacion.

Los mods encapsulan: objetos de datos, logica de negocio, vistas, estilos, traducciones, eventos y permisos — todo dentro de una carpeta autocontenida.

### Que problema resuelven

Sin mods, todo el codigo viviria mezclado en los workspaces core (object-manager, suite, layout). Esto generaria:
- Conflictos de merge constantes entre equipos
- Dependencias cruzadas entre dominios
- Imposibilidad de activar/desactivar funcionalidad por cliente
- Logica de negocio entremezclada con infraestructura

Los mods resuelven esto con **aislamiento por dominio**: cada area funcional es un paquete independiente con su propio repo, tests, y ciclo de vida.

```text
┌────────────────────────────────────────────────────────────┐
│ Mods (repositorios independientes)                         │
│                                                            │
│   ┌─────────────────┐ ┌──────────┐ ┌─────────────────────┐ │
│   │ uengagement-up1 │ │ ai-agent │ │ academic-scheduling │ │
│   └─────────────────┘ └──────────┘ └─────────────────────┘ │
│   ┌───────────────────┐ ┌─────────────┐                    │
│   │ curriculum-design │ │ up1-manager │                    │
│   └───────────────────┘ └─────────────┘                    │
└─────────────────────────────┬─────────────────────────────┘
                              │  npm run sync
                              ▼
┌──────────────────────────────────────────────────────┐
│ Workspaces Core (monorepo)                           │
│                                                      │
│  ┌────────────────┐  ┌─────────────────────────┐    │
│  │ Suite          │  │ Layout Engine           │    │
│  │ (Frontend Nuxt)│  │ (Vueform + Storybook)   │    │
│  └───────┬────────┘  └─────────────────────────┘    │
│          │                                           │
│          ▼                                           │
│  ┌────────────────┐  ┌─────────────────────────┐    │
│  │ Object Manager │  │ Flow Engine             │    │
│  │ (GraphQL API)  │  │ (n8n)                   │    │
│  └───────┬────────┘  └────────────┬────────────┘    │
│          │                        │                  │
│          ▼                        ▼                  │
│  ┌──────────────┐        ┌──────────────┐           │
│  │ (PostgreSQL) │        │ (Redis)      │           │
│  └──────────────┘        └──────────────┘           │
└──────────────────────────────────────────────────────┘
```

> **Cada mod aporta artefactos a los workspaces core via sync.** Los mods no se ejecutan solos — el runtime es Suite + Object Manager + Flow.

---

## 2. Mods existentes en el ambiente

| Mod | Nombre en sidebar | Tipo | Objetos | Layouts | Estado |
|-----|------------------|------|---------|---------|--------|
| `uengagement-up1` | upOne-Engagement | Dominio | 23 objetos propios + 7 RecordTypes | ~111 | Produccion |
| `retention-wellbeing` | (ver nota abajo) | Dominio | (propios del mod) | (varios) | Activo, se sincroniza; no figura en `mods.json` |
| `academic-scheduling` | Academic Scheduling | Dominio | 21 objetos propios | (varios) | Produccion |
| `ai-agent` | (sin sidebar) | Feature | 0 | 0 | Clonado y catalogado, excluido del sync (ver seccion "Tres mecanismos") |
| `hello-world-mod` | test | Template | 3 (HwAssessment, HwFactor, HwIntervention) | 18 | Ignorado por defecto |
| `object-manager-editor` | Object Manager | Admin | 0 (opera sobre core) | 20 | Legacy (removido del ensamblado activo; reemplazado por `up1-manager`) |
| `flow-viewer` | Flow Viewer | Integracion | 1 (N8nWorkflow) | 1 | Legacy (removido del ensamblado activo; reemplazado por `up1-manager`) |
| `up1-manager` | UP1 Manager | Admin | 0 (opera sobre core) | (varios) | Activo |

Ver tambien: [example-uengagement.md](example-uengagement.md) y [example-academic-scheduling.md](example-academic-scheduling.md) para ejemplos detallados de estos dos mods de dominio.

### Tres mecanismos independientes: clonar, catalogar, sincronizar (ver RULE-platform-026)

**Drift corregido (2026-08-17)**: el ciclo de vida de un mod en up1 lo gobiernan **tres listas independientes**, no una sola. Confundirlas es un error recurrente porque un mod puede estar en cualquier combinacion de las tres:

| Mecanismo | Fuente de verdad | Efecto |
|-----------|------------------|--------|
| **Clonar** | `uPlannerMods` en el `package.json` raiz | Lo lee `scripts/actions.js` al hacer `npm run setup`/`update-repos`: decide que repos se clonan dentro de `mods/` |
| **Catalogar / activar** | `mods.json` | Metadata declarativa (`active`, `type`, `repo`) que describe el mod; NO controla el sync |
| **Excluir del sync** | `ignoredMods` en el `package.json` raiz | **Unica fuente de verdad** del pipeline de 9-10 fases: el sync escanea el **filesystem** de `mods/` y filtra por esta lista. NO lee `mods.json` |

Verificado en `object-manager/scripts/sync/SyncManager.js` (lee `ignoredMods` del `package.json` raiz como config), `object-manager/scripts/sync/fileSync.js` y `object-manager/scripts/sync/logicSync.js` (ambos hacen `readdirSync` sobre `mods/` y filtran cada carpeta contra `this.config.ignoredMods`, sin ninguna referencia a `mods.json`).

Configuracion actual en `package.json` raiz:
```json
{
  "uPlannerMods": [
    "ai-agent.git",
    "hello-world-mod.git",
    "up1-manager.git",
    "academic-scheduling.git",
    "curriculum-design.git",
    "curriculum-mapping.git",
    "uengagement-up1.git"
  ],
  "ignoredMods": ["hello-world-mod", "ueng-dev", "ai-agent"]
}
```

**Casos reales que ilustran la independencia de las tres listas (verificados en codigo):**

- **`ai-agent` esta en las tres listas a la vez, sin contradiccion**: aparece en `uPlannerMods` (se clona), en `mods.json` con `active: true` (se cataloga como mod activo), y tambien en `ignoredMods` (el pipeline de sync lo salta entero). Son tres decisiones distintas: un mod puede clonarse y catalogarse como activo, y aun asi quedar fuera del sync porque su integracion se maneja por otro camino.
- **`retention-wellbeing` no figura en `mods.json` pero SI se sincroniza**: al no estar en `ignoredMods`, el escaneo de filesystem de `fileSync.js`/`logicSync.js` lo toma igual. Es un mod real y activo (existe con contenido en `mods/retention-wellbeing/`), y es un **dominio distinto** del engagement administrativo (`uengagement-up1`): uno no reemplaza al otro, conviven. Evidencia de la distincion de dominios: `mods/uengagement-up1/.ai/CONTEXT.md:18` describe a `retention-wellbeing` como "the operational `retention-wellbeing` mod", separado de las tres superficies de `uengagement-up1`.
- **`mods/uengagement/` existe vacio y sin `.git`**: es residuo del alias que usa `mods.json`, cuya entrada `"name": "uengagement"` apunta al repo `uengagement-up1.git`. El directorio real con contenido es `mods/uengagement-up1/`. `mods/uengagement/` no aporta nada al sync (esta vacio) y no deberia usarse como referencia de path.
- **`ueng-dev` esta en `ignoredMods` sin contraparte verificada**: no existe una carpeta `mods/ueng-dev/` en el filesystem actual del repo. Su entrada en `ignoredMods` es, en la practica, un no-op (no hay nada que excluir), salvo que se clone en el futuro.

---

## 3. Estructura de un mod

```
mods/{nombre-del-mod}/
├── package.json              ← Registro npm (@uplanner/{nombre})
├── capabilities.json         ← Permisos RBAC del mod
├── README.md                 ← Documentacion
│
├── objects/                  ← Objetos de negocio (JSON Schema)
│   ├── MiObjeto.json         → Genera tabla PostgreSQL + tipo GraphQL
│   └── OtroObjeto.json
│
├── logic/                    ← Resolvers GraphQL custom
│   ├── miDominio.resolver.js → Queries y mutations custom
│   └── miDominio.schema.graphql → Type definitions
│
├── modsComponents/           ← Componentes Vue custom
│   └── MiWidget/
│       ├── MiWidgetElement.vue
│       ├── useMiWidget.ts
│       └── MiWidget.stories.ts
│
├── modsComposables/          ← Composables compartidos
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
├── css/                      ← Estilos por capas
│   ├── 1-theme/
│   ├── 2-objectName/
│   └── 3-viewType/
│
├── lang/                     ← Traducciones i18n
│   ├── en.json
│   └── es.json
│
├── events/                   ← Eventos BullMQ
│   └── mi-evento.json
│
├── flows/                    ← Workflows n8n (JSON)
│   └── mi-workflow.json
│
├── seed/                     ← Datos iniciales
│   └── seed.js
│
├── tests/                    ← Tests (no se sincroniza)
└── .ai/                      ← Contexto IA (no se sincroniza)
```

**Solo `package.json` y `capabilities.json` son obligatorios.** El resto se crea segun necesidad.

---

## 4. Mecanismo de sync (9 fases)

Al ejecutar `npm run sync`, los artefactos del mod se copian a los workspaces core:

| Fase | Nombre | Que hace | Requiere BD |
|------|--------|----------|-------------|
| 1 | Mirror Sync | Copia proyectos al directorio `up1/` | No |
| 2 | Merge Sync | Copia objects/ a `object-manager/objects/business/` | No |
| 3 | Prisma Schema | Genera Prisma schema + client (base + per-tenant) | No |
| 4 | Capability Sync | Inserta capabilities en BD | Si |
| 5 | Logic Sync | Copia resolvers a `object-manager/src/graphql/resolvers/mods/{mod}/` | No |
| 6 | Apps & Layouts | Inserta app.json y layouts en BD del tenant | Si |
| 7 | Default Layouts | Layouts por defecto de layout/ a BD | Si |
| 8 | Seed Data | Ejecuta seeds del mod en BD | Si |
| 9 | Flow Sync | Sube workflows JSON a n8n via REST API | Si (n8n) |

**Orquestacion:**
1. `object-manager/scripts/sync.js` → fases 1-9
2. `layout/scripts/sync.js` → modsComponents + modsComposables
3. `suite/scripts/sync-styles.js` → CSS
4. `suite/scripts/sync-i18n.js` → traducciones

### Mapeo archivo → destino

| Origen en mod | Destino | Como |
|---------------|---------|------|
| `objects/*.json` | `object-manager/objects/business/` | Copia + codegen |
| `logic/*.js` | `object-manager/src/graphql/resolvers/mods/{mod}/` | Copia |
| `logic/*.graphql` | (junto a resolvers) | Copia |
| `modsComponents/*/` | `layout/src/modsComponents/` + `suite/modsComponents/` | Copia |
| `modsComposables/*.ts` | `layout/src/composables/` + `suite/modsComposables/` | Copia |
| `css/{layer}/*.css` | `suite/css/mods/` | Copia |
| `lang/**/*.json` | `suite/lang/` | Merge |
| `events/*.json` | `object-manager/events/` | Copia |
| `config/app.json` | BD: `up1_suite_app` | Insert/Update |
| `config/layouts/*.json` | BD: `up1_layen_layout` | Insert/Update |
| `capabilities.json` | BD: capabilities table | Insert/Update |
| `seed/*.js` | BD: tenant data | Execute |
| `flows/*.json` | n8n: workflows | REST API |

### Regla fundamental

**NUNCA editar archivos en los destinos del sync.** Todos los cambios en la carpeta del mod. Despues: `npm run sync`.

### Conflictos

El sync **aborta** si detecta:
- Nombres de composables duplicados entre mods
- Nombres de componentes duplicados entre mods
- Claves i18n duplicadas en el mismo locale

---

## 5. Objetos de negocio (objects/)

Los objetos JSON son la **fuente de verdad** para BD y API. El codegen genera:
- Tabla PostgreSQL (via Prisma)
- Tipo GraphQL
- CRUD automatico (list, get, create, update, delete, import, bulk)

### Estructura de un objeto

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MiObjeto",
  "type": "object",
  "metadata": {
    "label": "Mi Objeto",
    "labelPlural": "Mis Objetos",
    "gender": "masculino",
    "description": "Descripcion del objeto",
    "defaultLayoutType": "RecordList"
  },
  "properties": {
    "nombre": {
      "type": "string",
      "title": "Nombre",
      "not_null": true
    },
    "puntuacion": {
      "type": "number",
      "title": "Puntuacion",
      "not_null": true
    },
    "estado": {
      "type": "string",
      "title": "Estado",
      "enum": ["BORRADOR", "EN_REVISION", "PUBLICADO"]
    },
    "activo": {
      "type": "boolean",
      "static_default": "true"
    },
    "puntuacionPonderada": {
      "type": "formula",
      "properties": {
        "formula": "=puntuacion * 100"
      }
    },
    "cursoId": {
      "type": "string",
      "title": "Curso",
      "x-foreign-key": {
        "object": "Course",
        "field": "id"
      }
    }
  },
  "required": ["nombre", "puntuacion", "estado"]
}
```

### Tipos de campo soportados

| Tipo | JSON type | Genera en BD | Ejemplo |
|------|-----------|-------------|---------|
| Texto | `string` | VARCHAR | nombre, codigo |
| Numero | `number` | FLOAT/INT | puntuacion, creditos |
| Booleano | `boolean` | BOOLEAN | activo, vigente |
| Enum | `string` + `enum` | VARCHAR + validacion | estado, nivel |
| Fecha | `string` + `format: "date-time"` | TIMESTAMP | fechaCreacion |
| JSON | `object` | JSONB | metadata, config |
| Formula | `formula` | Calculado en runtime | puntuacionPonderada |
| FK (relacion) | `string` + `x-foreign-key` | FK constraint | cursoId → Course.id |

### FK a objetos del core

Los objetos del mod pueden referenciar objetos base de la plataforma:

```json
{
  "institutionId": {
    "type": "string",
    "x-foreign-key": { "object": "Institution", "field": "id" }
  },
  "personId": {
    "type": "string",
    "x-foreign-key": { "object": "Person", "field": "id" }
  }
}
```

### Despues de modificar objetos

```bash
npm run sync                    # Copia JSONs al object-manager
npm run codegen --workspace=@uplanner/object-management-backend  # Genera Prisma + GraphQL
npm run tenant:migrate --workspace=@uplanner/object-management-backend  # Aplica migracion BD
```

---

## 6. Resolvers custom (logic/)

Los resolvers cubren logica de negocio que el CRUD automatico no resuelve. Cada resolver tiene 2 archivos pareados:

### Schema GraphQL (.schema.graphql)

```graphql
# logic/miDominio.schema.graphql

type MiResultado {
  id: String!
  nombre: String!
  estado: String!
  puntuacionCalculada: Float
}

input MiInput {
  nombre: String!
  puntuacion: Float!
}

extend type Query {
  getMiDominio(id: String!): MiResultado
  listMiDominio(filtro: String): [MiResultado!]!
}

extend type Mutation {
  crearMiDominio(input: MiInput!): MiResultado
  actualizarEstado(id: String!, nuevoEstado: String!): MiResultado
}
```

**Clave:** Usar `extend type Query` y `extend type Mutation`, no `type Query`.

### Resolver (.resolver.js)

```javascript
// logic/miDominio.resolver.js
const { withAuth } = require('../../services/auth.service');

const miDominioQueryResolvers = {
  getMiDominio: withAuth(async (_, { id }, context) => {
    const record = await context.prisma.miObjeto.findUnique({
      where: { id, tenantId: context.tenantId }
    });
    return record;
  }, 'miobjeto:view'),

  listMiDominio: withAuth(async (_, { filtro }, context) => {
    return context.prisma.miObjeto.findMany({
      where: { tenantId: context.tenantId, ...(filtro && { nombre: { contains: filtro } }) }
    });
  }, 'miobjeto:view')
};

const miDominioMutationResolvers = {
  crearMiDominio: withAuth(async (_, { input }, context) => {
    return context.prisma.miObjeto.create({
      data: { ...input, tenantId: context.tenantId }
    });
  }, 'miobjeto:create'),

  actualizarEstado: withAuth(async (_, { id, nuevoEstado }, context) => {
    // Ejemplo: operacion transaccional
    return context.prisma.$transaction(async (tx) => {
      const record = await tx.miObjeto.update({
        where: { id, tenantId: context.tenantId },
        data: { estado: nuevoEstado }
      });
      await tx.auditLog.create({
        data: { action: 'status_change', recordId: id, tenantId: context.tenantId }
      });
      return record;
    });
  }, 'miobjeto:edit')
};

module.exports = { miDominioQueryResolvers, miDominioMutationResolvers };
```

**Regla critica:** El nombre del export debe contener "Query" o "Mutation" (case-insensitive). Si no, el resolver se ignora silenciosamente.

### RBAC en resolvers

`withAuth(resolverFn, 'capability')` valida que el usuario tenga la capability antes de ejecutar.

### Despues de modificar resolvers

```bash
npm run sync      # Copia a object-manager
# Reiniciar Object Manager (hot reload no aplica para resolvers)
```

---

## 7. Eventos (events/)

Eventos BullMQ que se disparan automaticamente ante cambios de datos.

### Estructura de un evento

```json
{
  "id": "courseProgram:published",
  "trigger": {
    "objectType": "CourseProgram",
    "operation": "update",
    "condition": {
      "field": "status",
      "operator": "EQUALS",
      "value": "published"
    }
  },
  "includeFields": ["id", "courseId", "status", "isCurrentVersion"],
  "priority": 5,
  "attempts": 3
}
```

### Operaciones soportadas

| Operacion | Cuando se dispara |
|-----------|------------------|
| `create` | Al crear un registro del objeto |
| `update` | Al actualizar un registro |
| `delete` | Al eliminar un registro |

### Con condicion vs sin condicion

- **Sin condicion:** se dispara en TODA operacion del tipo indicado
- **Con condicion:** solo cuando el campo cumple la condicion (ej: status = "published")

### Flujo

```text
  Suite           Object Manager      Redis (BullMQ)    Worker         n8n
    │                   │                   │              │             │
    │  GraphQL Mutation  │                   │              │             │
    │──────────────────>│                   │              │             │
    │                   │ Detecta match con │              │             │
    │                   │ evento registrado │              │             │
    │                   │────────────────── │              │             │
    │                   │                   │              │             │
    │                   │ withEventPublish() │              │             │
    │                   │ — encola job      │              │             │
    │                   │──────────────────>│              │             │
    │                   │                   │              │             │
    │<─ ─ ─ ─ ─ ─ ─ ─ ─│  Respuesta inmediata             │             │
    │                   │                   │              │             │
    │                   │                   │  Worker      │             │
    │                   │                   │  consume job │             │
    │                   │                   │─────────────>│             │
    │                   │                   │              │             │
    │                   │                   │  Pub/Sub     │             │
    │                   │                   │<─────────────│             │
    │                   │                   │  publica en canal           │
    │                   │                   │              │             │
    │                   │                   │  Up1RedisTrigger escucha    │
    │                   │                   │────────────────────────────>│
    │                   │                   │              │             │
    │                   │                   │              │   Ejecuta   │
    │                   │                   │              │   workflow  │
    │                   │                   │              │  ──────────►│
    │                   │                   │              │             │
```

### Despues de crear eventos

```bash
npm run sync
docker compose --profile worker up -d  # Asegurar que el worker esta corriendo
```

---

## 8. Flows (flows/)

Workflows n8n definidos como JSON. Se sincronizan al Flow Engine via REST API.

### Como crear

1. **Disenar en n8n** (localhost:5678) visualmente
2. **Exportar** el workflow como JSON
3. **Limpiar** campos auto-generados (id, createdAt, updatedAt, versionId)
4. **Guardar** en `flows/{nombre}.json`

### Convenciones

- Nombre de archivo: kebab-case (ej: `mads-migration.json`)
- Nombre del workflow: prefijo `[ModName]` (ej: `[LearningAssurance] MADS Migration`)
- Tag automatico: `up1Source` para matching estable

### Nodos custom de uP1

| Nodo | Uso |
|------|-----|
| `Up1RedisCreate` | Escucha creacion de registros |
| `Up1RedisUpdate` | Escucha actualizacion de registros |
| `Up1RedisDelete` | Escucha eliminacion de registros |
| `Up1RedisTrigger` | Trigger generico por canal Redis |
| `Up1Notification` | Envia notificaciones (in-app + email) |

---

## 9. Layouts (config/layouts/)

Configuracion JSON de vistas. Se sincronizan a la tabla `up1_layen_layout` en BD.

### app.json — Registro de la app

```json
{
  "name": "learning-assurance",
  "label": "Learning Assurance",
  "icon": "bi-mortarboard",
  "order": 5,
  "roles": ["Admin", "Coordinador", "Docente"],
  "tenants": ["*"],
  "version": "1.0.0",
  "defaultObjects": ["StudyPlan", "CourseProgram", "Syllabus"]
}
```

| Campo | Efecto |
|-------|--------|
| `name` | Identificador interno (kebab-case) |
| `label` | Nombre visible en sidebar |
| `icon` | Icono Bootstrap o SVG inline |
| `order` | Posicion en sidebar (menor = mas arriba) |
| `roles` | Quien ve la app (array de roles) |
| `tenants` | En que tenants aparece (`["*"]` = todos) |
| `defaultObjects` | Objetos principales (aparecen como tabs) |

### Navegacion entre layouts

```text
                              Click fila
              ┌───────────────────────────────────────────────────────────────┐
              │                                                               ▼
┌─────────────────────────┐                          ┌────────────────────────────────┐
│ RecordList              │                          │ RecordDetail (view)             │
│ hw_assessment_list      │                          │ hw_assessment_view              │
└──────┬──────────────────┘                          └──┬──────────────────────────────┘
       │                                               │ Boton editar    │ Tab: Factores
       │ Boton crear                                   ▼                 ▼
       │                              ┌────────────────────┐  ┌─────────────────────────┐
       ▼                              │ RecordDetail (edit) │  │ RecordList embebida     │
┌──────────────────────┐              │ hw_assessment_edit  │  │ hw_factor_assessment_li │
│ RecordDetail (create)│              └────────────────────┘  │ filtro: {{parentId}}    │
│ hw_assessment_create │                                       └─────────────────────────┘
└──────────────────────┘
       │ Row action
       ▼
┌──────────────────────┐
│ Modal create         │
│ hw_intervention_crea │
└──────────────────────┘
```

> Los layouts se conectan entre si via `associatedLayoutConfigs` (list→view→edit), `canCreateLayoutId` (list→create), y `targetLayoutId` (row actions→modal).

### RecordList — Ejemplo real (del hello-world-mod)

```json
{
  "name": "hw_assessment_list",
  "objectName": "HwAssessment",
  "layoutType": "RecordList",
  "roles": ["Admin", "Coordinador"],
  "layoutConfig": {
    "columns": [
      { "key": "studentId", "label": "Estudiante", "sortable": true },
      { "key": "riskLevel", "label": "Nivel de Riesgo", "sortable": true }
    ],
    "canCreate": true,
    "canCreateLayoutId": "hw_assessment_create",
    "canEdit": true,
    "canDelete": true,
    "showSearch": true,
    "associatedLayoutConfigs": {
      "view": { "layoutId": "hw_assessment_view" },
      "edit": { "layoutId": "hw_assessment_edit" }
    },
    "rowActions": [
      {
        "id": "create-intervention",
        "label": "Crear Intervencion",
        "type": "modal",
        "targetLayoutId": "hw_intervention_create",
        "targetObjectName": "HwIntervention",
        "requiredCapability": "hwintervention:create",
        "visibilityConditions": {
          "operator": "AND",
          "conditions": [
            { "field": "isActive", "operator": "==", "value": true }
          ]
        },
        "initialDataMapping": {
          "hwAssessmentId": "record.id"
        }
      }
    ]
  }
}
```

### RecordDetail con tabs + listas embebidas — Ejemplo real

```json
{
  "name": "hw_assessment_view",
  "objectName": "HwAssessment",
  "layoutType": "RecordDetail",
  "layoutConfig": {
    "mode": "view",
    "tabs": {
      "detail": { "label": "Detalle", "elements": ["studentId", "riskLevel", "riskScore"] },
      "factors": { "label": "Factores", "elements": ["factorsList"] },
      "interventions": { "label": "Intervenciones", "elements": ["interventionsList"] }
    },
    "schema": {
      "studentId": { "type": "text", "label": "ID Estudiante", "columns": { "container": 6 } },
      "factorsList": {
        "type": "record-list",
        "objectName": "HwFactor",
        "layoutId": "hw_factor_assessment_list",
        "layoutConfig": {
          "filters": [
            { "field": "hwAssessmentId", "operator": "EQUALS", "value": "{{parentId}}" }
          ]
        }
      }
    }
  }
}
```

### RecordDetail create con wizard (steps)

```json
{
  "name": "hw_assessment_create",
  "objectName": "HwAssessment",
  "layoutType": "RecordDetail",
  "layoutConfig": {
    "mode": "create",
    "enableFKCreateButton": true,
    "autoAssignFields": { "isActive": true },
    "steps": {
      "step1": { "label": "Datos del Estudiante", "elements": ["studentId"] },
      "step2": { "label": "Evaluacion de Riesgo", "elements": ["riskLevel", "riskScore"] }
    },
    "schema": {
      "studentId": { "type": "text", "rules": ["required"], "columns": { "container": 6 } }
    }
  }
}
```

### Placeholders soportados

| Placeholder | Se reemplaza por |
|-------------|-----------------|
| `{{parentId}}` | ID del registro padre (en listas embebidas) |
| `{{CURRENT_USER_ID}}` | ID del usuario logueado |
| `record.id` | ID del registro de la fila (en initialDataMapping) |
| `record.{field}` | Valor de cualquier campo del registro |

---

## 10. Componentes Vue custom (modsComponents/)

Para vistas que no se resuelven con RecordList/RecordDetail.

### Estructura

```
modsComponents/
└── MiWidget/
    ├── MiWidgetElement.vue       ← Componente Vueform (usa ElementLayout)
    ├── useMiWidget.ts            ← Composable con logica
    ├── MiWidget.types.ts         ← Tipos TypeScript
    ├── MiWidget.mocks.ts         ← Datos mock para Storybook
    └── MiWidget.stories.ts       ← Story de Storybook
```

### Reglas

- Usar `defineElement()` con `<ElementLayout>` wrapper para integracion con el Layout Engine
- Importar atoms de `layout/src/components/atoms/`, NUNCA Bootstrap directo
- Design tokens: `var(--up1-*)`, nunca valores hardcodeados
- Cada componente debe tener Storybook story

### Se sincroniza a 2 destinos

```
modsComponents/ → layout/src/modsComponents/   (para Storybook)
modsComponents/ → suite/modsComponents/         (para la app)
```

---

## 11. Capabilities / RBAC (capabilities.json)

### Estructura

```json
{
  "module": "learning-assurance",
  "version": "1.0.0",
  "capabilities": [
    {
      "name": "mod/learning-assurance:view_competency_matrix",
      "risk": "low"
    },
    {
      "name": "mod/learning-assurance:publish_course_program",
      "risk": "medium"
    },
    {
      "name": "mod/learning-assurance:delete_study_plan",
      "risk": "high"
    },
    {
      "name": "syllabus.evaluations:modify",
      "risk": "medium"
    }
  ]
}
```

### Convenciones de nombre

| Nivel | Patron | Ejemplo |
|-------|--------|---------|
| Modulo | `mod/{modname}:{accion}` | `mod/learning-assurance:view_reports` |
| Objeto | `{objectname}:{accion}` | `studyplan:create` |
| Campo | `{objectname}.{field}:{accion}` | `syllabus.evaluations:modify` |

### Niveles de riesgo

| Risk | Significado | Ejemplo |
|------|-------------|---------|
| `low` | Solo lectura | view_reports, view_assessments |
| `medium` | Escritura | edit, create, modify |
| `high` | Destructivo | delete, publish (irreversible) |

### Integracion con layouts

```json
// En row actions de RecordList
{ "requiredCapability": "mod/learning-assurance:publish_course_program" }

// En la definicion del layout
{ "roles": ["Admin", "Coordinador"] }
```

---

## 12. Flujo de trabajo diario con un mod

| Cambio | Pasos |
|--------|-------|
| Nuevo objeto o campo | Editar JSON → `npm run sync` → `npm run codegen` → `npx prisma migrate dev` |
| Resolver custom | Crear .resolver.js + .schema.graphql → `npm run sync` → reiniciar Object Manager |
| Componente Vue | Crear en modsComponents/ → `npm run sync` → hot reload automatico |
| Traduccion | Editar lang/es.json → `npm run sync` → reiniciar Suite |
| Estilo CSS | Editar css/ → `npm run sync` → hard refresh |
| Layout | Crear JSON en config/layouts/ → `npm run sync` → recarga automatica |
| Evento | Crear JSON en events/ → `npm run sync` → reiniciar worker |
| Flow n8n | Disenar en n8n → exportar → guardar en flows/ → `npm run sync` |
| Capability | Editar capabilities.json → `npm run sync` |
| Seed data | Crear seed.js → `npm run sync` |

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-04-09 | Documento inicial: guia completa de mods basada en docs oficiales, codigo de 5 mods, y CLAUDE.md |
| 2026-04-10 | Removidas secciones de planificacion de Assessment (analogia, seccion 12, ejemplo de evento) |
| 2026-04-14 | Agregados diagramas Mermaid: arquitectura de capas, flujo de eventos (sequence), navegacion entre layouts |
| 2026-07-16 | Correccion contra `package.json` raiz: lista real de mods activos (`ai-agent`, `up1-manager`, `academic-scheduling`, `curriculum-design`, `uengagement-up1`, `hello-world-mod`); `retention-wellbeing` reemplazado por `uengagement-up1` en diagrama y tabla; `object-manager-editor` y `flow-viewer` marcados como legacy (reemplazados por `up1-manager`); agregados enlaces a example-uengagement.md y example-academic-scheduling.md |
| 2026-08-17 | Corregido drift de 2026-07-16: `retention-wellbeing` no fue "reemplazado" por `uengagement-up1`, es un mod real y activo (dominio distinto) que se sincroniza pese a no estar en `mods.json`, se restituye a la tabla. Se agrega la seccion "Tres mecanismos independientes: clonar, catalogar, sincronizar" con evidencia de codigo (`SyncManager.js`, `fileSync.js`, `logicSync.js`) de que `ignoredMods` del `package.json` raiz -no `mods.json`- es la unica fuente de verdad del sync, y se documentan los casos `ai-agent` (en las tres listas sin contradiccion), el directorio residuo vacio `mods/uengagement/`, y `ueng-dev` sin contraparte en filesystem |
