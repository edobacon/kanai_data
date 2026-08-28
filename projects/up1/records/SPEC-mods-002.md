---
id: SPEC-mods-002
project: up1
type: doc
module: mods
tags:
  - up1
  - mods
  - ejemplo
  - engagement
  - retention-wellbeing
  - objects
  - resolvers
  - layouts
  - componentes
  - eventos
  - flows
  - lang
  - i18n
  - calendario
  - rbac
---

# Ejemplo real: mod Engagement (retention-wellbeing)

> **Documento superado (2026-06).** El mod `retention-wellbeing` quedo vacio y fue reemplazado por `uengagement-up1`. El dominio de engagement se documenta ahora en [example-uengagement.md](example-uengagement.md). Este archivo se conserva solo como referencia historica del modelo anterior (TimeBlockTemplate/TimeBlockAssignment, objetos Issue/Service/Category), que ya no existe en el codigo.

Guia practica que recorre el mod de produccion `retention-wellbeing` para ilustrar como un mod se conecta con el Object Manager, el Layout Engine y el sistema de traducciones.

## Indice

1. [Vision general](#1-vision-general)
2. [Registro del mod](#2-registro-del-mod)
3. [Objetos de negocio](#3-objetos-de-negocio)
4. [Resolvers custom y GraphQL](#4-resolvers-custom-y-graphql)
5. [Layouts: de lista a calendario](#5-layouts-de-lista-a-calendario)
6. [Componentes Vue custom](#6-componentes-vue-custom)
7. [Traducciones: 3 idiomas, 5 dominios](#7-traducciones-3-idiomas-5-dominios)
8. [Workflows n8n](#8-workflows-n8n)
9. [RBAC: capabilities del mod](#9-rbac-capabilities-del-mod)
10. [Flujo completo: de la idea a la UI](#10-flujo-completo-de-la-idea-a-la-ui)

---

## 1. Vision general

| Aspecto | Detalle |
|---------|--------|
| Nombre en sidebar | **Engagement** |
| Repo/carpeta | `mods/retention-wellbeing/` |
| Dominio | Retencion, bienestar estudiantil, servicios de apoyo |
| Objetos propios | 2 (`TimeBlockTemplate`, `TimeBlockAssignment`) |
| Objetos core que consume | `Person`, `Institution`, `Event`, `Offering`, `OfferingEnrollment`, `Issue`, `Service`, `Category` |
| Layouts | 19 (listas, calendarios, creates, attendance) |
| Componentes Vue | 7 (calendario semanal, busqueda con filtros, modales) |
| Resolvers custom | 4 queries + 4 mutations (disponibilidad de facilitadores) |
| Workflows n8n | 2 (reminder diario, handler de inscripciones) |
| Capabilities RBAC | 6 |
| Idiomas | 3 (es_CL, en_CL, pt_BR) |
| Archivos lang | 15 (base + 4 dominios por idioma) |

```text
┌──────────────────────────────────────────────────────────────────┐
│  Mod: retention-wellbeing                                        │
│                                                                  │
│  ┌────────────────┐ ┌──────────────────┐ ┌───────────────────┐  │
│  │ 2 objetos      │ │ 4Q + 4M resolvers│ │ 7 componentes Vue │  │
│  │ propios        │ │                  │ │                   │  │
│  └────────────────┘ └──────────────────┘ └───────────────────┘  │
│  ┌────────────────┐ ┌──────────────────┐ ┌───────────────────┐  │
│  │ 19 layouts     │ │ 15 archivos lang │ │ 2 workflows n8n   │  │
│  │                │ │ (3 idiomas)      │ │                   │  │
│  └────────────────┘ └──────────────────┘ └───────────────────┘  │
│  ┌────────────────┐                                              │
│  │ 6 capabilities │                                              │
│  │ RBAC           │                                              │
│  └────────────────┘                                              │
└────────────────────────────┬─────────────────────────────────────┘
                             │ npm run sync
┌────────────────────────────┼─────────────────────────────────────┐
│  Objetos core consumidos   │                                     │
│                            │                                     │
│  Person  Institution  Event  Service  Category                   │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   uP1 Runtime   │
                    └─────────────────┘
```

---

## 2. Registro del mod

### package.json

```json
{
  "name": "@uplanner/retention-wellbeing",
  "version": "1.0.0",
  "description": "Retention and Wellbeing Module",
  "type": "module",
  "private": true
}
```

### config/app.json — Registro en sidebar

```json
{
  "name": "engagement",
  "label": "Engagement",
  "icon": "<svg>...</svg>",
  "iconBg": "#8B5CF6",
  "order": 5,
  "tenants": ["TEST", "UPU"],
  "version": "1.0.0",
  "defaultObjects": ["Person", "Category"]
}
```

**Puntos a notar:**

- `name` es `"engagement"` (kebab-case) — este es el identificador del mod en toda la plataforma
- `defaultObjects` son `Person` y `Category` — objetos **core** de la plataforma, no del mod. El mod no necesita definir objetos propios para aparecer como app
- `icon` usa SVG inline en vez de clase Bootstrap — ambos formatos son validos
- `iconBg` agrega un color de fondo al icono en la sidebar
- No define `roles` — la app es visible para todos los roles. El control de acceso se hace a nivel de layout y capabilities
- `order: 5` — posicion alta en la sidebar

### Que pasa con este archivo en el sync

```
config/app.json → Fase 6 (Apps & Layouts) → BD: up1_suite_app
```

Suite lee `up1_suite_app` y renderiza la entrada en el sidebar con el nombre, icono y orden definidos.

---

## 3. Objetos de negocio

El mod define **2 objetos propios** y consume **8 objetos core**. Esto ilustra un patron importante: un mod no necesita crear muchos objetos — puede construir funcionalidad sobre los objetos base de la plataforma.

```text
Relaciones entre entidades:

  TimeBlockTemplate ──────────────────────────────────────────────────────────┐
  ┌─────────────────────┐  1:N templateId      ┌───────────────────────────┐  │
  │ TimeBlockTemplate   │ ──────────────────►  │   TimeBlockAssignment     │  │
  │ name: string        │                      │   assigneeType: string    │  │
  │ code: string        │  1:N assigneeId      │   assigneeId: string      │  │
  │ daysOfWeek: json    │  (polimorfismo)       │   status: string          │  │
  │ startTime: string   │◄───────────────────  │   startDate: date         │  │
  │ endTime: string     │                      │   endDate: date           │  │
  │ durationMinutes: int│  Person              │   metadata: json          │  │
  └─────────────────────┘  ──────────────────► └───────────────────────────┘  │
                                                                               │
  Person ───────────────────────────────────────────────────────────────► TimeBlockAssignment
  (assigneeId, polimorfismo)

  Institution  ──────────────── 1:N ──────────────────► Event
  (contexto)

  Event  ─────────────────────── 1:N ──────────────────► OfferingEnrollment
  (inscripciones)

  Service ◄──────────────────── N:1 ────────────────────  Event
  (servicio)

  Category ◄─────────────────── N:1 ────────────────────  Service
  (categoria)

  Offering ◄─────────────────── N:1 ────────────────────  Event
  (oferta)
```

> **2 objetos propios** (TimeBlockTemplate, TimeBlockAssignment) + **8 objetos core** (Person, Institution, Event, Offering, OfferingEnrollment, Issue, Service, Category).

### Objeto 1: TimeBlockTemplate

Catalogo de bloques horarios oficiales para programacion de servicios de bienestar.

```json
{
  "name": "TimeBlockTemplate",
  "label": "Time Block Template",
  "pluralLabel": "Time Block Templates",
  "description": "Catalog of official time blocks for Wellbeing scheduling",
  "icon": "bi-calendar-range",
  "fields": {
    "name": { "type": "text", "required": true, "searchable": true },
    "code": { "type": "text", "required": true, "unique": true },
    "description": { "type": "textarea" },
    "daysOfWeek": { "type": "json", "helpText": "Array: 0=Sunday, 6=Saturday" },
    "startTime": { "type": "text", "required": true, "format": "time" },
    "endTime": { "type": "text", "required": true, "format": "time" },
    "durationMinutes": { "type": "number", "required": true },
    "blockNumber": { "type": "number", "helpText": "Sequential number for ordering" },
    "applicableApps": { "type": "json", "default": [] },
    "applicableRoles": { "type": "json", "default": [] },
    "applicableResourceTypes": { "type": "json", "default": [] },
    "contextId": { "type": "text" },
    "contextType": { "type": "text" },
    "isActive": { "type": "boolean", "default": true }
  }
}
```

**Patron**: campos `json` para datos flexibles (`daysOfWeek`, `applicableApps`, `applicableRoles`) — evita tablas intermedias para configuracion.

### Objeto 2: TimeBlockAssignment

Asignaciones de disponibilidad de facilitadores a bloques horarios.

```json
{
  "name": "TimeBlockAssignment",
  "label": "Time Block Assignment",
  "description": "Facilitator availability and blocked time assignments",
  "fields": {
    "assigneeType": {
      "type": "select",
      "required": true,
      "options": [
        { "value": "user", "label": "User" },
        { "value": "resource", "label": "Resource" }
      ]
    },
    "assigneeId": { "type": "text" },
    "appScope": { "type": "text", "required": true, "default": "wellbeing" },
    "templateId": {
      "type": "relationship",
      "relationshipType": "belongsTo",
      "relatedObject": "TimeBlockTemplate",
      "required": true
    },
    "status": {
      "type": "select",
      "required": true,
      "options": [
        { "value": "available", "label": "Available" },
        { "value": "blocked", "label": "Blocked" },
        { "value": "occupied", "label": "Occupied" }
      ]
    },
    "startDate": { "type": "date", "required": true },
    "endDate": { "type": "date", "required": true },
    "contextId": { "type": "text" },
    "contextType": { "type": "text" },
    "relatedObjectId": { "type": "text" },
    "relatedObjectType": { "type": "text" },
    "metadata": { "type": "json", "default": {} }
  }
}
```

**Patrones a notar:**

- **FK al objeto propio**: `templateId` → `TimeBlockTemplate` (relacion belongsTo)
- **Polimorfismo via texto**: `assigneeType` + `assigneeId` permiten asignar a usuarios o recursos sin FK rigida
- **Contexto flexible**: `contextId`/`contextType` para asociar a cualquier entidad
- **Metadata JSON**: campo libre para datos adicionales sin cambiar el schema

### Que pasa con estos objetos en el sync

```
objects/TimeBlockTemplate.json  → Fase 2 → object-manager/objects/business/
objects/TimeBlockAssignment.json → Fase 2 → object-manager/objects/business/
                                     ↓
                              npm run codegen
                                     ↓
                    Prisma model + GraphQL type + CRUD automatico
                                     ↓
                            npm run tenant:migrate
                                     ↓
                    Tablas en PostgreSQL de cada tenant
```

Resultado: `listInstances(objectName: "TimeBlockTemplate")` funciona automaticamente.

---

## 4. Resolvers custom y GraphQL

El CRUD generado cubre operaciones basicas. El mod agrega **4 queries y 4 mutations** para logica de negocio de disponibilidad de facilitadores.

### Schema GraphQL

```graphql
# logic/FacilitatorAvailability.schema.graphql

type FacilitatorInfo {
  id: Int!
  name: String!
  email: String
  availability: [TimeBlockAvailability!]
}

type TimeBlockAvailability {
  templateId: Int!
  dayOfWeek: Int!
  startTime: String!
  endTime: String!
  status: String!
}

type FacilitatorAvailabilityResult {
  facilitator: FacilitatorInfo!
  assignments: [TimeBlockAssignment!]!
  templates: [TimeBlockTemplate!]!
}

extend type Query {
  facilitatorsByCenter(centerId: String!): [FacilitatorInfo!]!
  facilitatorAvailability(
    facilitatorId: Int!
    startDate: String!
    endDate: String!
  ): FacilitatorAvailabilityResult

  wellbeingTimeBlockTemplates(
    contextType: String
    contextId: String
  ): [TimeBlockTemplate!]!

  timeBlockAssignments(
    facilitatorId: Int
    startDate: String
    endDate: String
  ): [TimeBlockAssignment!]!
}

extend type Mutation {
  updateFacilitatorAvailability(
    facilitatorId: Int!
    timeBlockId: Int!
    isAvailable: Boolean!
  ): Boolean!

  createTimeBlockAssignment(
    timeBlockTemplateId: Int!
    assigneeType: String!
    assigneeId: String!
    startDate: String!
    endDate: String
    isRecurring: Boolean
  ): TimeBlockAssignment

  upsertTimeBlockAssignment(
    id: Int
    timeBlockTemplateId: Int!
    assigneeType: String!
    assigneeId: String!
    startDate: String!
    endDate: String
    isRecurring: Boolean
    status: String
  ): TimeBlockAssignment

  deleteTimeBlockAssignment(id: Int!): Boolean!
}
```

### Patrones a notar

- **Queries combinan objetos**: `facilitatorAvailability` cruza `Person` (core) con `TimeBlockAssignment` (mod) y `TimeBlockTemplate` (mod) — algo que el CRUD generico no puede hacer
- **Upsert**: `upsertTimeBlockAssignment` crea si no existe, actualiza si existe — patron comun para calendarios
- **Retorno de Boolean**: para operaciones simples (`deleteTimeBlockAssignment`, `updateFacilitatorAvailability`) se retorna boolean en vez de un tipo complejo

### Flujo sync → Object Manager → API

```
1. logic/FacilitatorAvailability.schema.graphql  ← Definicion
   logic/facilitatorAvailability.resolver.js      ← Implementacion
          │
          │ npm run sync (Fase 5: Logic Sync)
          ▼
2. object-manager/src/graphql/resolvers/mods/retention-wellbeing/
   ├── FacilitatorAvailability.schema.graphql
   └── facilitatorAvailability.resolver.js
          │
          │ Server restart (auto-loader descubre)
          ▼
3. GraphQL API disponible:
   query { facilitatorsByCenter(centerId: "123") { id name } }
   mutation { upsertTimeBlockAssignment(...) { id status } }
```

---

## 5. Layouts: de lista a calendario

El mod tiene **19 layouts**. Veamos 4 patrones representativos.

### Patron 1: Lista embebida con filtro por padre (Attendance)

Lista de asistencia filtrada por evento padre — se embebe dentro de la vista de un Event.

```json
{
  "name": "engagement_event_attendance_list",
  "objectName": "Attendance",
  "layoutType": "RecordList",
  "roles": ["Admin", "Consultor", "Colaborador", "Coordinador"],
  "tenants": ["TEST", "UPU"],
  "layoutConfig": {
    "filters": [
      { "field": "eventId", "operator": "EQUALS", "value": "{{parentId}}" }
    ],
    "columns": [
      { "key": "userId", "label": "Estudiante", "sortable": true },
      { "key": "presente", "label": "Presente", "sortable": true, "filterable": true }
    ],
    "relationDisplayFields": { "core_User": "email" },
    "canCreate": true,
    "canCreateLayoutId": "engagement_event_attendance_create",
    "canEdit": true,
    "canDelete": true,
    "showSearch": true
  }
}
```

**Patron**: `{{parentId}}` filtra la asistencia al evento actual. `relationDisplayFields` muestra el email del usuario en vez del UUID.

### Patron 2: Create con auto-asignacion (Attendance)

Formulario de creacion de asistencia con el eventId auto-asignado desde el contexto padre.

```json
{
  "name": "engagement_event_attendance_create",
  "objectName": "Attendance",
  "layoutType": "RecordDetail",
  "applicationId": null,
  "layoutConfig": {
    "mode": "create",
    "enableFKCreateButton": false,
    "autoAssignFields": {
      "eventId": {
        "enabled": true,
        "editable": false,
        "valueSource": "FIXED_VALUE",
        "fixedValue": "{{parentId}}"
      }
    },
    "schema": {
      "eventId": { "type": "hidden" },
      "userId": { "columns": 12 },
      "presente": { "type": "toggle", "label": "Presente", "columns": 12 }
    }
  }
}
```

**Patrones**:
- `applicationId: null` → layout auxiliar, no aparece en navegacion
- `autoAssignFields.eventId` → se llena automaticamente con el ID del evento padre, no editable
- `"type": "hidden"` → el campo eventId existe pero no se muestra
- `"type": "toggle"` → renderiza como switch on/off

### Patron 3: Calendario con holidays y zonas bloqueadas

Vista de calendario semanal para un pais especifico, con holidays y bloques de descanso.

```json
{
  "name": "event_calendario_br",
  "objectName": "Event",
  "layoutType": "OfferingCalendar",
  "roles": ["Admin"],
  "tenants": ["TEST", "UPU"],
  "layoutConfig": {
    "view": "week",
    "startHour": 7,
    "endHour": 22,
    "slotDuration": 60,
    "locale": "pt-BR",
    "enrollmentMode": true,
    "enrollmentObjectName": "OfferingEnrollment",
    "eventObjectName": "Event",
    "relations": ["offering"],
    "canCreateEventsRoles": ["Admin", "Coordinador"],
    "availabilityMode": true,
    "availabilityRestriction": "soft",
    "blockedZones": [
      { "name": "Intervalo", "startTime": "10:00", "endTime": "10:15", "daysOfWeek": [1,2,3,4,5] },
      { "name": "Almoço", "startTime": "12:00", "endTime": "13:30", "daysOfWeek": [1,2,3,4,5] },
      { "name": "Intervalo", "startTime": "15:30", "endTime": "15:45", "daysOfWeek": [1,2,3,4,5] }
    ],
    "holidays": {
      "location": { "country": "BR", "region": "SP" },
      "showInCalendar": true,
      "blockInteraction": "national",
      "types": ["public", "bank"],
      "manualHolidays": [
        { "date": "2026-01-25", "name": "Aniversário de São Paulo" }
      ],
      "icsSources": [
        {
          "url": "https://calendar.google.com/calendar/ical/pt-br.brazilian%23holiday%40group.v.calendar.google.com/public/basic.ics",
          "name": "Google Holidays Brasil"
        }
      ]
    }
  }
}
```

**Patrones avanzados**:
- `OfferingCalendar` — layout type especializado para calendarios
- `enrollmentMode: true` — permite inscripciones desde el calendario
- `blockedZones` — horarios de descanso visualmente marcados
- `holidays` — configuracion de feriados por pais, region, fuente ICS y manuales
- `availabilityRestriction: "soft"` — warning pero no bloqueo en zonas de descanso
- El mod tiene **5 variantes de calendario** para distintos paises (AR, BR, CO, MX, US)

### Patron 4: Lista filtrada por usuario actual

Lista de inscripciones del estudiante logueado — usa `{{CURRENT_USER_ID}}`.

```json
{
  "name": "offeringenrollment_mis_activos_list",
  "objectName": "OfferingEnrollment",
  "layoutType": "RecordList",
  "roles": ["Estudiante"],
  "tenants": ["TEST", "UPU"],
  "layoutConfig": {
    "columns": [
      { "key": "offeringId", "label": "Oferta", "sortable": true },
      { "key": "role", "label": "Rol", "sortable": true },
      { "key": "enrolledAt", "label": "Fecha Inscripcion", "sortable": true }
    ],
    "relationDisplayFields": { "Offering": "name" },
    "relationLayoutIds": { "Offering": "offering_view" },
    "filters": [
      { "field": "userId", "operator": "EQUALS", "value": "{{CURRENT_USER_ID}}" }
    ],
    "canCreate": false,
    "canEdit": false,
    "canDelete": true,
    "showSearch": true
  }
}
```

**Patrones**:
- `roles: ["Estudiante"]` — solo visible para estudiantes
- `{{CURRENT_USER_ID}}` — filtra por el usuario logueado
- `relationDisplayFields` → muestra nombre de la oferta en vez de UUID
- `relationLayoutIds` → click en la oferta navega al layout `offering_view`
- `canCreate: false, canEdit: false` — solo puede ver y desinscribirse (delete)

---

## 6. Componentes Vue custom

El mod tiene **7 componentes** agrupados en 2 categorias.

### Componente principal: AvailabilityCalendar (Vueform Element)

Calendario semanal de disponibilidad de facilitadores — el componente mas complejo del mod.

**Estructura de archivos:**

```
modsComponents/AvailabilityCalendar/
├── AvailabilityCalendarElement.vue    ← Vueform element (defineElement)
├── useAvailabilityCalendar.ts         ← Composable con GraphQL
├── AvailabilityCalendar.stories.ts    ← Storybook
└── AvailabilityCalendar.mocks.ts     ← Mock data
```

**Tipo**: Patron A (Vueform Element) — se integra al Layout Engine y se referencia en layout JSON como:

```json
{ "type": "availability-calendar", "contextId": "{{parentId}}" }
```

**Composable** (`useAvailabilityCalendar.ts`):

```typescript
// Usa useTenantApolloClient() para queries con X-Tenant-ID automatico
const apolloClient = useTenantApolloClient()

// Queries al Object Manager:
// - facilitatorsByCenter(centerId)    → lista facilitadores del centro
// - wellbeingTimeBlockTemplates()      → templates de bloques horarios
// - timeBlockAssignments(facilitatorId, startDate, endDate) → asignaciones

// Mutations al Object Manager:
// - upsertTimeBlockAssignment(...)    → crear/actualizar asignacion
// - deleteTimeBlockAssignment(id)     → eliminar asignacion
```

**Flujo de datos completo:**

```
Layout JSON: { "type": "availability-calendar" }
  ↓ Vueform renderiza AvailabilityCalendarElement.vue
  ↓ setup() llama useAvailabilityCalendar()
  ↓ Composable ejecuta queries GraphQL al Object Manager:
  │   query { facilitatorsByCenter(centerId: "123") { id name } }
  │   query { wellbeingTimeBlockTemplates { id name startTime endTime } }
  │   query { timeBlockAssignments(facilitatorId: 1, startDate: "2026-04-06") { ... } }
  ↓ Object Manager ejecuta resolvers custom del mod:
  │   → Prisma query a TimeBlockTemplate + TimeBlockAssignment + Person
  ↓ Datos vuelven al composable → refs reactivos
  ↓ Template renderiza CalendarSchedule con los datos
  ↓ Usuario modifica disponibilidad → handleSave()
  ↓ Composable ejecuta mutation GraphQL:
  │   mutation { upsertTimeBlockAssignment(templateId: 5, status: "available", ...) { id } }
  ↓ Object Manager: Prisma upsert → PostgreSQL
  ↓ withEventPublish() detecta match → encola en BullMQ (si hay evento registrado)
```

### Componentes standalone: modales y busqueda

| Componente | Tipo | Proposito |
|-----------|------|-----------|
| `CalendarSchedule` | Vueform Element | Vista semanal con bloques horarios, copy/paste, bulk status |
| `FilterableSearchBar` | Vue standalone | Barra de busqueda con sugerencias y filtros por categoria |
| `FilterCategoriesModal` | Vue standalone | Modal para seleccionar categorias de filtro |
| `PasteBlockAvailabilityModal` | Vue standalone | Modal para confirmar pegado de bloques |
| `ResourceConflictModal` | Vue standalone | Modal que muestra conflictos de facilitadores ocupados |
| `StatefulItemListModal` | Vue standalone | Modal generico para seleccion de items con estado |

Todos tienen: `.vue` + `use*.ts` + `.types.ts` + `.mocks.ts` + `.stories.ts`

---

## 7. Traducciones: 3 idiomas, 5 dominios

### Estructura de archivos (15 total)

```
lang/
├── es_CL.json               ← Base espanol: dias, UI calendario, layout labels, engagement actions
├── es_CL@Event.json          ← Campos del objeto Event
├── es_CL@Institution.json    ← Campos de Institution
├── es_CL@Issue.json          ← Campos de Issue
├── es_CL@Service.json        ← Campos de Service + steps
├── en_CL.json                ← Base ingles
├── en_CL@Event.json
├── en_CL@Institution.json
├── en_CL@Issue.json
├── en_CL@Service.json
├── pt_BR.json                ← Base portugues
├── pt_BR@Event.json
├── pt_BR@Institution.json
├── pt_BR@Issue.json
└── pt_BR@Service.json
```

Formula: `(1 base + 4 dominios) × 3 idiomas = 15 archivos`

### Base: es_CL.json — UI del calendario + layout labels

```json
{
  "MONDAY": "Lunes",
  "TUESDAY": "Martes",
  "WEDNESDAY": "Miércoles",
  "THURSDAY": "Jueves",
  "FRIDAY": "Viernes",
  "SATURDAY": "Sábado",
  "SUNDAY": "Domingo",
  "NO_DATA_YET": "Aún no hay datos",
  "FILTER": "Filtrar",
  "SAVE": "Guardar",
  "FACILITATORS_TITLE": "Facilitadores disponibles",
  "COPY_SELECTION": "Copiar selección",
  "PASTE": "Pegar",
  "REPLICATE_WEEK": "Replicar semana",
  "recordList": {
    "buttons": {
      "cancel": "Cancelar",
      "saving": "Guardando...",
      "applyBulk": "Aplicar a {count} elementos",
      "applyChanges": "Aplicar Cambios"
    }
  },
  "engagement": {
    "actions": {
      "viewAttendance": "Ver Asistencia",
      "attendanceModalTitle": "Asistencia: [record.name]"
    }
  },
  "layout": {
    "event_todos_list": { "label": "Todos los Servicios Programados" },
    "event_completados_list": { "label": "Servicios Completados" },
    "event_ejecucion_list": { "label": "En Ejecución" },
    "event_planificacion_list": { "label": "En Planificación" },
    "institution_centros_todos_list": { "label": "Centros de Apoyo" },
    "issue_todos_list": { "label": "Todos los Casos" },
    "issue_abiertos_list": { "label": "Casos Abiertos" },
    "issue_mis_abiertos_list": { "label": "Mis Casos Abiertos" },
    "service_todos_list": { "label": "Todos los Servicios" },
    "service_activos_list": { "label": "Servicios Activos" },
    "service_estudiante_list": { "label": "Servicios para Estudiantes" }
  }
}
```

**Patrones a notar:**

- **Claves UPPER_CASE** para constantes de UI del calendario (dias, acciones) — decision del mod, no obligatorio
- **Namespace `engagement.actions`** para row actions especificas del dominio
- **`[record.name]`** como placeholder dinamico en `attendanceModalTitle`
- **`{count}`** para interpolacion Vue i18n en `applyBulk`
- **`layout.*`** con labels para 17 layouts — uno por cada vista del mod

### Per-object: es_CL@Event.json

```json
{
  "column": {
    "serviceId": "Servicio Base",
    "name": "Nombre del Evento",
    "institutionId": "Centro de Apoyo",
    "startDate": "Fecha de Inicio",
    "endDate": "Fecha de Fin",
    "startTime": "Hora de Inicio",
    "endTime": "Hora de Fin",
    "capacity": "Capacidad",
    "status": "Estado"
  },
  "createModalTitle": {
    "event_todos_list": "Programar Servicio",
    "event_estudiantes_card": "¡Únete al Evento!"
  }
}
```

**Patron**: `createModalTitle` con **distintos titulos segun el layout que origina la creacion**. Desde la lista de todos los servicios se dice "Programar Servicio", pero desde la card de estudiantes se dice "Únete al Evento" — mismo objeto, distinto contexto.

### Per-object: es_CL@Service.json — con steps

```json
{
  "column": {
    "name": "Nombre del Servicio",
    "description": "Descripción",
    "recordType": "Tipo de Servicio"
  },
  "steps": {
    "step1": "Información Básica",
    "step2": "Clasificación"
  }
}
```

### Equivalente en portugues: pt_BR@Event.json

```json
{
  "column": {
    "name": "Nome do Evento",
    "institutionId": "Centro de Apoio",
    "startDate": "Data de Início",
    "endDate": "Data de Fim",
    "startTime": "Hora de Início",
    "endTime": "Hora de Fim"
  }
}
```

### Como las traducciones se conectan con los layouts

```
Layout: event_todos_list
  columns: [{ "key": "name" }, { "key": "institutionId" }, { "key": "startDate" }]
                 │                      │                        │
                 ▼                      ▼                        ▼
Lang (es_CL@Event.json):
  column.name: "Nombre del Evento"
  column.institutionId: "Centro de Apoyo"
  column.startDate: "Fecha de Inicio"

Lang (pt_BR@Event.json):
  column.name: "Nome do Evento"
  column.institutionId: "Centro de Apoio"
  column.startDate: "Data de Início"

→ Usuario chileno ve "Nombre del Evento"
→ Usuario brasilero ve "Nome do Evento"
```

### Patron: el mod traduce objetos core

El mod `retention-wellbeing` traduce campos de `Event`, `Institution`, `Issue`, `Service` — objetos **core** de la plataforma, no del mod. Esto es perfectamente valido: el archivo `es_CL@Event.json` agrega traducciones especificas del contexto Engagement para el objeto Event.

---

## 8. Workflows n8n

### Flow 1: Reminder diario

```json
{
  "name": "[Wellbeing] Daily Check-in Reminder",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{ "field": "cronExpression", "expression": "0 9 * * 1-5" }]
        }
      }
    },
    {
      "name": "UP1 Notification",
      "type": "n8n-nodes-base.up1Notification",
      "parameters": {
        "operation": "send",
        "channels": ["inapp"],
        "title": "Daily Wellbeing Check-in",
        "message": "Take a moment to log how you're feeling today.",
        "notificationType": "info",
        "inappBroadcast": true
      }
    }
  ],
  "connections": {
    "Schedule Trigger": {
      "main": [[{ "node": "UP1 Notification", "type": "main", "index": 0 }]]
    }
  }
}
```

**Patron**: trigger por cron (9 AM de lunes a viernes) → notificacion in-app broadcast a todos los usuarios.

### Flow 2: Handler de inscripciones

```json
{
  "name": "[Wellbeing] Enrollment Event Handler",
  "nodes": [
    {
      "name": "UP1 Event Create",
      "type": "n8n-nodes-base.up1EventCreate",
      "parameters": {
        "tenantId": "UPU",
        "objectType": "OfferingEnrollment",
        "domain": "engagement"
      }
    },
    {
      "name": "UP1 Notification",
      "type": "n8n-nodes-base.up1Notification",
      "parameters": {
        "operation": "send",
        "channels": ["inapp"],
        "title": "Enrollment Confirmed",
        "message": "A new enrollment was created in the wellbeing module."
      }
    }
  ],
  "connections": {
    "UP1 Event Create": {
      "main": [[{ "node": "UP1 Notification", "type": "main", "index": 0 }]]
    }
  }
}
```

**Patron**: escucha creacion de `OfferingEnrollment` en el dominio `engagement` via Redis Pub/Sub → notificacion al usuario.

---

## 9. RBAC: capabilities del mod

```json
{
  "module": "wellbeing",
  "version": "1.0.0",
  "capabilities": [
    { "name": "mod/wellbeing:view360", "description": "Ver dashboard 360° de bienestar", "riskLevel": "low" },
    { "name": "mod/wellbeing:manage_alerts", "description": "Gestionar alertas de bienestar", "riskLevel": "medium" },
    { "name": "mod/wellbeing:manage_facilitator_availability", "description": "Gestionar disponibilidad de facilitadores", "riskLevel": "medium" },
    { "name": "mod/wellbeing:view_facilitator_availability", "description": "Ver disponibilidad de facilitadores", "riskLevel": "low" },
    { "name": "mod/retention:view_reports", "description": "Ver reportes de retencion", "riskLevel": "low" },
    { "name": "mod/retention:manage_interventions", "description": "Crear y gestionar intervenciones", "riskLevel": "high" }
  ]
}
```

**Patrones**:
- Dos prefijos: `mod/wellbeing:*` y `mod/retention:*` — el mod abarca dos subdominios
- Separacion view/manage: `view_facilitator_availability` (low) vs `manage_facilitator_availability` (medium)
- `manage_interventions` es `high` — accion con impacto significativo

---

## 10. Flujo completo: de la idea a la UI

Recorrido de como un nuevo feature del mod llega desde la definicion hasta la interfaz.

### Caso: "Necesitamos que los facilitadores marquen su disponibilidad semanal"

**Paso 1 — Objetos** (mods/retention-wellbeing/objects/):
- Crear `TimeBlockTemplate.json` — catalogo de bloques
- Crear `TimeBlockAssignment.json` — asignaciones de disponibilidad
- `npm run sync && npm run codegen && npm run tenant:migrate`
- Resultado: CRUD automatico via GraphQL

**Paso 2 — Resolvers** (mods/retention-wellbeing/logic/):
- Crear `FacilitatorAvailability.schema.graphql` — tipos y operaciones
- Crear `facilitatorAvailability.resolver.js` — logica que cruza Person + Templates + Assignments
- `npm run sync` → restart Object Manager
- Resultado: `facilitatorsByCenter()`, `upsertTimeBlockAssignment()` disponibles

**Paso 3 — Componente** (mods/retention-wellbeing/modsComponents/):
- Crear `AvailabilityCalendar/AvailabilityCalendarElement.vue` — Vueform element
- Crear `useAvailabilityCalendar.ts` — composable con GraphQL queries/mutations
- Crear mocks y stories
- `npm run sync` → hot reload
- Resultado: componente tipo `"availability-calendar"` registrado

**Paso 4 — Layout** (mods/retention-wellbeing/config/layouts/):
- Crear layout JSON que use el componente:
  ```json
  {
    "name": "facilitator_availability",
    "objectName": "Institution",
    "layoutType": "RecordDetail",
    "layoutConfig": {
      "tabs": {
        "calendar": { "elements": ["availabilityWidget"] }
      },
      "schema": {
        "availabilityWidget": {
          "type": "availability-calendar",
          "contextId": "{{parentId}}"
        }
      }
    }
  }
  ```
- `npm run sync`
- Resultado: vista accesible en Suite

**Paso 5 — Traducciones** (mods/retention-wellbeing/lang/):
- Agregar strings del calendario a `es_CL.json`, `en_CL.json`, `pt_BR.json`
- `npm run sync` → restart Suite
- Resultado: UI en 3 idiomas

**Paso 6 — Capabilities** (capabilities.json):
- Agregar `mod/wellbeing:manage_facilitator_availability` y `view_facilitator_availability`
- `npm run sync`
- Resultado: RBAC aplicable a resolvers y layouts

**Paso 7 — (Opcional) Eventos y flows**:
- Crear evento JSON si se necesita reaccion asincrona ante cambios de disponibilidad
- Crear workflow n8n si se necesita notificacion
- `npm run sync` + `docker compose --profile worker up -d`

### Diagrama resumen

```text
┌──────────────────────────────────────┐
│  mods/retention-wellbeing/           │
│                                      │
│  objects/*.json                      │ ──────────────────────────► PostgreSQL (CRUD auto)
│  logic/*.js + .graphql               │ ──────────────────────────► Object Manager (GraphQL API)
│  config/layouts/*.json               │ ──────────────────────────► BD layouts ──────────────► Suite (UI)
│  modsComponents/                     │ ──────────────────────────────────────────────────────► Suite (UI)
│  lang/*.json                         │ ──────────────────────────► $t() traducciones ────────► Suite (UI)
│  capabilities.json                   │ ──────────────────────────► withAuth() RBAC
│  events/*.json                       │ ──────────────────────────► Worker + n8n
│  flows/*.json                        │ ──────────────────────────► Worker + n8n
│                                      │
└──────────────────────┬───────────────┘
                       │
              npm run sync + Codegen
                       │
                       ▼ (todos los destinos anteriores)

  Object Manager (GraphQL API) ──────────────────────────────────────► Suite (UI)
```

<details>
<summary>Version texto (fallback)</summary>

```
Objetos JSON → Codegen → CRUD auto → PostgreSQL
Resolvers    → Sync    → Object Manager → GraphQL API → Suite
Layouts JSON → Sync    → BD layouts     → Suite
Components   → Sync    → Vueform       → UI
Lang JSON    → Sync    → suite/lang    → $t()
Capabilities → Sync    → BD            → withAuth()
Events/Flows → Sync    → Worker + n8n
```

</details>

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-04-10 | Documento inicial: guia de ejemplos basada en el mod retention-wellbeing en produccion |
| 2026-04-14 | Agregados diagramas Mermaid: vision general, relaciones de objetos (ER), diagrama resumen end-to-end |
