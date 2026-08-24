---
id: SPEC-mods-025
project: up1
type: spec
module: mods
category: mods
tags: [uengagement, engagement, mod, offering, activity, service, teaching-coverage, availability, retention, wellbeing, risk-factor]
fecha: 2026-08-17
ticket: ENG-13/14 (UPONE-1276/1277); SS-4xx/RET-0x (retention); RET-07 (StudentLogger); UPONE-1489/1490; SS-453/454/469
sources:
  - mods/uengagement-up1/config/app.json
  - mods/uengagement-up1/capabilities.json
  - mods/uengagement-up1/objects/*.json
  - mods/uengagement-up1/objects/RecordTypes/*.json
  - mods/uengagement-up1/.ai/CONTEXT.md
  - mods/uengagement-up1/.ai/PATTERNS.md
  - mods/uengagement-up1/logic/*.resolver.js
  - mods/uengagement-up1/flows/*.json
  - mods/uengagement-up1/lang/{en,es,pt}/*.i18n.json
  - mods/uengagement-up1/config/layouts/retention_*.json
  - mods/uengagement-up1/config/reports/report-definition/*.json
  - mods/uengagement-up1/config/reports/report-template/ueng-ret-*.json
  - mods/uengagement-up1/seed/_data-retention.js
  - mods/uengagement-up1/seed/_data-rbac.js
  - mods/curriculum-design/objects/ProgramEnrollment.json
---
# Ejemplo real: mod uEngagement

> Este documento reemplaza a `example-engagement.md` (el mod `retention-wellbeing` quedo vacio, commit "empty legacy mod, superseded by uEngagement" del 2026-06-09: sin `objects/`, sin `config/app.json`, `capabilities.json` vacio; verificado de nuevo el 2026-08-17, sigue vacio). Desde entonces, el trabajo de retencion/wellbeing (SS-4xx/RET-0x) se construyo **dentro** de `uengagement-up1` como feature propia, no como mod aparte, ver seccion 11.
>
> **Aclaracion de gobernanza (2026-08-17)**: la etiqueta "superseded" del commit de 2026-06-09 se refiere solo al codigo que existia entonces en `retention-wellbeing` (vacio hoy). No es evidencia de que `retention-wellbeing` haya sido retirado como dominio: `uengagement-up1/.ai/CONTEXT.md:18` sigue refiriendose a el como "the operational `retention-wellbeing` mod", un dominio distinto (el lado administrativo de centros de apoyo) del feature de retencion/wellbeing construido dentro de uEngagement. Son dos cosas distintas que comparten nombre por casualidad de dominio: la feature de retencion/wellbeing (SS-4xx/RET-0x, seccion 11) vive en `uengagement-up1`; el mod `retention-wellbeing` sigue sin codigo, ni reemplazado ni descartado formalmente.

Guia practica que recorre el mod de produccion `uengagement-up1` para ilustrar como un mod se conecta con el Object Manager, el Layout Engine y el sistema de traducciones.

## Indice

1. [Vision general](#1-vision-general)
2. [Registro del mod](#2-registro-del-mod)
3. [Objetos de negocio](#3-objetos-de-negocio)
4. [Resolvers custom y GraphQL](#4-resolvers-custom-y-graphql)
5. [Layouts](#5-layouts)
6. [Componentes Vue](#6-componentes-vue)
7. [Traducciones: 3 idiomas](#7-traducciones-3-idiomas)
8. [Workflows n8n](#8-workflows-n8n)
9. [RBAC: capabilities del mod](#9-rbac-capabilities-del-mod)
10. [Flujo completo: de la idea a la UI](#10-flujo-completo-de-la-idea-a-la-ui)
11. [Retention/wellbeing: feature dentro del mod, no un mod separado](#11-retentionwellbeing-feature-dentro-del-mod-no-un-mod-separado)

---

## 1. Vision general

| Aspecto | Detalle |
|---------|--------|
| Nombre en sidebar | **upOne-Engagement** |
| Repo/carpeta | `mods/uengagement-up1/` (repo git propio, mod vivo) |
| Dominio | Ofertas y servicios de apoyo estudiantil, agendamiento, asistencia, cobertura docente |
| Objetos propios | 25 (mas 7 RecordTypes) — incluye `RiskFactor`/`StudentRiskFactor` (retention, ver seccion 11) |
| Objetos core que consume | `Institution`, `Organization` (referenciados por FK); `ProgramEnrollment` (base de `curriculum-design`, extendido mod-shared, ver seccion 11) |
| Layouts | 124 (`config/layouts/`), 13 con prefijo `retention_*` |
| Componentes Vue custom | 0 (`modsComponents/` y `modsComposables/` vacios: el mod se apoya en `RecordList`/`RecordDetail`/`CalendarLayout`/`Dashboard` del core, sin Vueform elements propios) |
| Resolvers custom | 6 pares schema+resolver (`enroll-current-student`, `feedback-request`, `instructor-availability`, `notification`, `offering-create`, `offering-event-create`) |
| Workflows n8n | 13 flows (`flow-01`..`flow-10`, `flow-13`..`flow-15`) |
| Capabilities RBAC | 11 en `capabilities.json` (mas `activitytype:delete`, otorgada solo via seed de rol, ver seccion 11) |
| Roles propios | 6 (`estudiante-eng`, `responsable-eng`, `admin-centro-eng`, `admin-general-eng`, `admin-ret`, `gestor-ret` — los dos ultimos de retention) |
| Idiomas | 3 (en, es, pt) |
| Archivos lang | 39 (13 archivos por objeto/dominio x 3 idiomas) |

Fuente: `config/app.json:6-24`, `objects/*.json` (25 archivos), `config/layouts/` (124 archivos, conteo real), `logic/`, `flows/`, `capabilities.json`, `lang/{en,es,pt}/`.

```text
┌──────────────────────────────────────────────────────────────────┐
│  Mod: uengagement-up1                                            │
│                                                                  │
│  ┌────────────────┐ ┌──────────────────┐ ┌───────────────────┐  │
│  │ 23 objetos     │ │ 6 resolvers      │ │ 0 componentes Vue │  │
│  │ + 7 RecordTypes│ │ custom (schema+  │ │ propios (usa core)│  │
│  │                │ │ resolver)        │ │                   │  │
│  └────────────────┘ └──────────────────┘ └───────────────────┘  │
│  ┌────────────────┐ ┌──────────────────┐ ┌───────────────────┐  │
│  │ 111 layouts    │ │ 39 archivos lang │ │ 13 workflows n8n  │  │
│  │                │ │ (3 idiomas)      │ │                   │  │
│  └────────────────┘ └──────────────────┘ └───────────────────┘  │
│  ┌────────────────┐                                              │
│  │ 11 capabilities│                                              │
│  │ RBAC           │                                              │
│  └────────────────┘                                              │
└────────────────────────────┬─────────────────────────────────────┘
                             │ npm run sync
┌────────────────────────────┼─────────────────────────────────────┐
│  Objetos core referenciados│                                     │
│                            │                                     │
│  Institution  Organization                                      │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   uP1 Runtime   │
                    └─────────────────┘
```

---

## 2. Registro del mod

### config/app.json: Registro en sidebar

```json
{
  "name": "upOne-Engagement",
  "label": "upOne-Engagement",
  "icon": "bi-calendar2-check",
  "order": 10,
  "roles": [
    "Admin",
    "Coordinador",
    "Estudiante",
    "estudiante-eng",
    "responsable-eng",
    "admin-centro-eng",
    "admin-general-eng"
  ],
  "tenants": {
    "TEST": {}, "UPU": {},
    "DEMO01": {}, "DEMO02": {}, "DEMO03": {}, "DEMO04": {}, "DEMO05": {},
    "DEMO06": {}, "DEMO07": {}, "DEMO08": {}, "DEMO09": {}, "DEMO10": {}
  },
  "version": "1.0.0",
  "defaultObjects": ["OrgUnit", "Offering", "Activity", "ActivityType", "FormTemplate", "Feedback"],
  "up1ModelVersion": 1
}
```

Fuente: `config/app.json:1-39`.

**Puntos a notar:**

- `roles` lista 7 roles: los genericos de la plataforma (`Admin`, `Coordinador`, `Estudiante`) y 4 roles propios del dominio (`estudiante-eng`, `responsable-eng`, `admin-centro-eng`, `admin-general-eng`), que conviven con los genericos segun el layout.
- `tenants` habilita el mod en 12 tenants (produccion `TEST`/`UPU` mas 10 tenants demo `DEMO01`..`DEMO10`).
- `defaultObjects` son objetos **propios** del mod (`OrgUnit`, `Offering`, `Activity`, `ActivityType`, `FormTemplate`, `Feedback`), a diferencia del patron de `retention-wellbeing` que reutilizaba objetos core.
- `up1ModelVersion: 1` marca la version del modelo de datos tras la migracion "model-v2" (ver seccion 3).

### Que pasa con este archivo en el sync

```
config/app.json → Fase 6 (Apps & Layouts) → BD: up1_suite_app
```

---

## 3. Objetos de negocio

El mod define **23 objetos propios** mas **7 RecordTypes**. A diferencia de `retention-wellbeing` (2 objetos propios apoyados en 8 objetos core), uEngagement construye su propio modelo de dominio casi completo, referenciando solo `Institution` y `Organization` del core.

### Objetos base (23)

`Activity`, `ActivityLine`, `ActivityType`, `Attendance`, `Availability`, `AvailabilityException`, `Event`, `EventException`, `Feedback`, `FormTemplate`, `Institution`, `Instructor`, `InstructorAffiliation`, `InstructorTier`, `Journal`, `Offering`, `OfferingEnrollment`, `OrgUnit`, `Organization`, `Student`, `TeachingAssignment`, `TeachingCoverage`.

Fuente: `objects/*.json` (listado de archivos).

### RecordTypes (7)

`rt__Service__Activity`, `rt__StudentAvailability__Availability`, `rt__Campus__OrgUnit`, `rt__Faculty__OrgUnit`, `rt__SupportCenter__OrgUnit`, `rt__Institutional__InstructorAffiliation`, `rt__Departmental__InstructorAffiliation`.

Fuente: `objects/RecordTypes/*.json`.

### Cadena Activity → ActivityLine → Offering

```text
Activity (baseObject) ─── rt__Service__Activity ───► "Servicio" (serviceType, activityTypeId, operationalStatus)
   │  1:N activityId
   ▼
ActivityLine ──► vincula Activity con la OrgUnit que la ejecuta (N:M con identidad propia)
   │  1:N activityLineId
   ▼
Offering ──► instancia concreta y programable, con capacidad y estado propios
```

Una `Activity` define **que** se ofrece; una `ActivityLine` define **quien** lo ejecuta (que unidad organizacional); una `Offering` define **cuando y como** ocurre una ejecucion especifica. Fuente: `objects/Offering.json:9` (descripcion del campo `activityLineId`), `objects/ActivityLine.json:9`.

### Objeto: Offering

```json
{
  "activityLineId": { "type": "string", "not_null": true, "isForeignKey": true, "references": "ActivityLine", "onDelete": "Cascade" },
  "code": { "type": "string", "not_null": true, "unique": true },
  "name": { "type": "string", "not_null": true },
  "maxCapacity": { "type": "integer", "description": "Capacidad maxima de participantes. null = ilimitado." },
  "usedCapacity": { "type": "integer", "not_null": true, "static_default": "0", "description": "Inscripciones activas. Actualizado por flujos." },
  "generalModality": { "type": "string", "enum": ["InPerson", "Online", "Hybrid"] },
  "status": { "type": "string", "not_null": true, "enum": ["Active", "Inactive", "Cancelled"], "static_default": "Active" }
}
```

Fuente: `objects/Offering.json:12-89`. `Offering` es un objeto **engagement-owned**, sin RecordType propio (el model-v2 elimino el discriminador `ServiceOffer`).

### RecordType: rt__Service__Activity

```json
{
  "baseObject": "Activity",
  "properties": {
    "serviceType": { "type": "string", "not_null": true, "enum": ["Psychological", "Academic", "Financial", "Career", "Wellness"] },
    "activityTypeId": { "type": "string", "isForeignKey": true, "references": "ActivityType" },
    "operationalStatus": { "type": "boolean", "description": "true si tiene al menos una ActivityLine activa; lo gestiona el flow n8n." }
  }
}
```

Fuente: `objects/RecordTypes/rt__Service__Activity.json:1-38`.

### Objeto: TeachingCoverage (ENG-13/14)

Registro de que un instructor cubre una sesion (`Event`) especifica, ya sea como parte de un curso modular o como reemplazo puntual.

```json
{
  "uniqueConstraints": [["instructorId", "eventId"]],
  "properties": {
    "instructorId": { "type": "string", "not_null": true, "isForeignKey": true, "references": "Instructor" },
    "eventId": { "type": "string", "not_null": true, "isForeignKey": true, "references": "Event", "onDelete": "Cascade" },
    "coverageReason": { "type": "string" },
    "status": { "type": "string", "not_null": true, "enum": ["Planned", "Confirmed", "Cancelled"], "static_default": "Planned" }
  }
}
```

Fuente: `objects/TeachingCoverage.json:1-59`. `[instructorId, eventId]` es unique constraint para evitar duplicar la cobertura del mismo instructor en el mismo evento. `eventId` tiene `onDelete: Cascade` (borrar el evento borra su cobertura); no hay FK desde `TeachingAssignment`, por eso hace falta un flow para limpiar coberturas al borrar una asignacion (ver seccion 8).

### Objeto: Availability (patron time-of-day)

```json
{
  "properties": {
    "dayOfWeek": { "type": "integer", "not_null": true, "description": "0 = Domingo, 6 = Sabado." },
    "startTime": { "type": "string", "format": "date-time", "displayAs": "time-of-day", "not_null": true },
    "endTime": { "type": "string", "format": "date-time", "displayAs": "time-of-day", "not_null": true }
  }
}
```

Fuente: `objects/Availability.json:1-42`. **Decision deliberada**: `startTime`/`endTime` son `format: date-time` (Prisma `DateTime`), no `format: time`, porque el resolver de disponibilidad (`instructor-availability.resolver.js`) y el overlay del calendario calculan solapamientos con `new Date(...)` y consultan con `startTime: { lt: <Date> }`; un campo `time`/`String` hace que Prisma rechace el `Date`. `displayAs: "time-of-day"` evita mostrar la fecha de relleno en el RecordList, sin cambiar el tipo de dato subyacente (evita drift de timezone). El mismo patron aplica a `AvailabilityException`/`EventException`. Fuente: `.ai/PATTERNS.md:797-804`.

### Migracion de campos (model-v2)

Commit `e80c7ef "Migrate engagement fields: userId→studentId, marcado→isTaken, active→isActive"`:

- `OfferingEnrollment`/`Attendance`: `userId` → `studentId` (se dropean `role`, `enrolledAt`, `isResponsable`).
- `Attendance`: `marcado` (boolean) → `isTaken` (boolean, flag de workflow, ver seccion 8).
- `InstructorTier`: `active` → `isActive`.
- `Event`: `startTime`/`endTime` pasan de `time` a `String`.

Fuente: commit `e80c7ef` en `mods/uengagement-up1/`.

### Que pasa con estos objetos en el sync

```
objects/*.json → Fase 2 → object-manager/objects/business/
                    ↓
             npm run codegen
                    ↓
   Prisma model + GraphQL type + CRUD automatico
                    ↓
           npm run tenant:migrate
                    ↓
   Tablas en PostgreSQL de cada tenant
```

---

## 4. Resolvers custom y GraphQL

El CRUD generado cubre operaciones basicas. El mod agrega **6 pares schema+resolver** para logica de negocio que el CRUD generico no puede resolver.

| Resolver | Proposito |
|---------|-----------|
| `enroll-current-student` | Mutacion validada e idempotente: resuelve el `Student` del usuario de sesion y crea la `OfferingEnrollment`, sin exponer `studentId` al cliente. |
| `offering-create` | Creacion de `Offering` con validaciones propias del dominio (capacidad, codigo institucional). |
| `offering-event-create` | Resolver prisma-directo (`createOfferingEvent`) que crea un `Event` desde el calendario de una oferta **bypaseando** `withEventPublish`; por eso publica `Event:create` manualmente al canal core para no romper el flow de cobertura docente (FLOW-15, ver seccion 8). |
| `instructor-availability` | Cruza `Instructor`, `Availability`, `AvailabilityException` y `Event` para calcular disponibilidad real (usa el patron `date-time` de la seccion 3). |
| `feedback-request` | Logica de solicitud de feedback sobre una `Offering`/`Activity`. |
| `notification` | Envio de notificaciones asociadas a eventos del dominio. |

Fuente: `logic/enroll-current-student.resolver.js`, `logic/offering-create.resolver.js`, `logic/offering-event-create.resolver.js`, `logic/instructor-availability.resolver.js`, `logic/feedback-request.resolver.js`, `logic/notification.resolver.js`.

### Patron a notar: bypass de withEventPublish

`createOfferingEvent` (usado por el calendario de la oferta) no pasa por el flujo estandar de creacion `withEventPublish`, asi que el propio resolver debe emitir el evento `Event:create` a mano. Si se olvida, el flow de cobertura docente (FLOW-15) nunca se dispara, porque nunca hay evento que escuchar. Fuente: `.ai/CONTEXT.md:168-172` (pipeline de TeachingCoverage), `.ai/CONTEXT.md:183`.

### Flujo sync → Object Manager → API

```
1. logic/offering-event-create.schema.graphql   ← Definicion
   logic/offering-event-create.resolver.js       ← Implementacion
          │
          │ npm run sync (Fase 5: Logic Sync)
          ▼
2. object-manager/src/graphql/resolvers/mods/uengagement-up1/
          │
          │ Server restart (auto-loader descubre)
          ▼
3. GraphQL API disponible:
   mutation { createOfferingEvent(offeringId: "...", ...) { id } }
```

---

## 5. Layouts

El mod tiene **111 layouts** en `config/layouts/`. Cubre 3 superficies distintas segun el rol (admin/coordinador, estudiante, docente/responsable). Patrones representativos, tomados de la documentacion propia del mod:

### Patron 1: Tab gateada por `requiredCapability` (RecordDetail)

Un tab de `RecordDetail` puede declarar `requiredCapability`; si el usuario no la tiene, el tab **y sus `elements`** se ocultan (si queda un solo tab de campos y ningun tab de layouts asociados, el form se "desenvuelve" a una vista plana sin encabezado de tab).

```json
"tabs": {
  "general":   { "label": "General",   "elements": ["name", "active", "version"] },
  "servicios": { "label": "Servicios", "requiredCapability": "activity:view", "elements": ["servicesList"] }
}
```

Uso real: ocultar el tab "Servicios" (una lista embebida de `Activity`) a `admin-centro-eng` en el detalle de `FormTemplate`. La gate se hace por la capability que el **contenido** del tab necesita (`activity:view`), no por una capability proxy (se probo primero `formtemplate:modify`, pero era menos preciso). Fuente: `.ai/PATTERNS.md:776-793`, `config/layouts/engagement_FormTemplate_center_view.json`.

### Patron 2: Calendario reutilizando filtros del RecordList

Dos formas de mostrar `Event`s en calendario, ambas sobre el mismo motor (`CalendarLayout`/`OfferingCalendar`):

- **Layout `Calendar` standalone** (entrada de navbar propia): el filtro va directo en `layoutConfig.filters`. Ejemplo: `engagement_Event_student_calendar`, con filtro `children.offering.offeringEnrollments.student.userId = {{CURRENT_USER_ID}}`.
- **Vista `calendar` dentro de un RecordList** (`availableViews: [table, calendar]`): la vista calendario **reutiliza los `filters` de la lista** (pasados como `additional-filters`), asi una lista de responsable ya scopeada por `{{USER_RELATED}}` se mantiene scopeada en modo calendario. Ejemplo: `engagement_Event_responsible_list`.

Fuente: `.ai/PATTERNS.md:760-772`.

### Patron 3: Lista filtrada por el instructor del usuario actual

```json
{
  "name": "engagement_Event_responsible_list",
  "objectName": "Event",
  "layoutType": "RecordList",
  "layoutConfig": {
    "availableViews": ["table", "calendar"],
    "filters": [
      { "field": "children.offering.teachingAssignments.instructorId", "operator": "EQUALS", "value": "{{USER_RELATED:Instructor:userId}}" },
      { "field": "children.offering.teachingAssignments.status", "operator": "EQUALS", "value": "Active" }
    ]
  }
}
```

El placeholder `{{USER_RELATED:Instructor:userId}}` resuelve el `Instructor` del usuario logueado en 2 hops. Row actions "Tomar asistencia" / "Ver asistencias" son mutuamente excluyentes via `visibilityConditions` sobre `isAttendanceTaken`. Fuente: `.ai/CONTEXT.md:138-157`, `.ai/CONTEXT.md:205`.

### Patron 4: Limite de 2 hops en filtros de RecordList

La lista "Mis estudiantes" del responsable no puede filtrar por "estudiantes inscritos en las ofertas del responsable" porque ese camino excede el limite de 2 hops del resolver de filtros de RecordList; por eso hoy lista **todos** los `Student` del tenant. Documentado como limitacion de plataforma, no del mod. Fuente: `.ai/CONTEXT.md:209`.

**Workaround del mismo limite en el calendario del estudiante (commit `55d74e4`)**: el filtro de `engagement_Event_student_calendar.json` intentaba `children.offering.offeringEnrollments.student.userId` (3 hops), que excedia el limite y llegaba a Prisma como una key literal (`INVALID_FILTER_FIELD`). Se corrigio filtrando por `studentId` (2 hops) y resolviendo el estudiante actual con el placeholder `{{USER_RELATED:Student:userId}}` en vez de `{{CURRENT_USER_ID}}`. Mismo patron que la seccion 3 de `engagement_Event_responsible_list`.

### Patron 5: tabs+schema reemplaza `layoutConfig.sections` (SS-469)

`engagement-offering-view.json` migro de `layoutConfig.sections` a `tabs` + `schema` (commit `8f2881f`), el mismo formato que ya usaban los layouts de retencion. Agrega un tab "Eventos" de solo lectura y usa `emptyDisplayKey` (capacidad nueva de core, RecordDetail) para que `maxCapacity` muestre "Capacidad ilimitada" en vez de quedar en blanco cuando el campo es `null`:

```json
"maxCapacity": { "type": "text", "emptyDisplayKey": "content.maxCapacityUnlimited" }
```

Fuente: `config/layouts/engagement-offering-view.json:47`.

### Dato de calendario verificado: `slotDuration` fijo en 60 por defecto de `OfferingCalendar`

Los layouts que renderizan `OfferingCalendar` (`engagement-offering-student-list`, `engagement_Event_responsible_list`, `engagement_Event_student_calendar`, `engagement_Offering_admin_calendar`) fijan `slotDuration: 60`; los que usan `BlockCalendar` (`engagement_Availability_instructor_view`, `engagement_Availability_responsible_calendar`) mantienen `slotDuration: 30`. La diferencia no es una decision de diseno del mod: `OfferingCalendar` (componente de core) no propaga el prop `slotDuration` al grid, mientras que `BlockCalendar` si lo hace. Es un workaround de un defecto de core. Fuente: `config/layouts/{engagement-offering-student-list,engagement_Availability_instructor_view,engagement_Availability_responsible_calendar,engagement_Event_responsible_list,engagement_Event_student_calendar,engagement_Offering_admin_calendar}.json`. Ver [`BUG-layout-013`](../../bugs/layout/bug-layout-013.md).

---

## 6. Componentes Vue

A diferencia de `retention-wellbeing` (7 componentes Vue propios, incluyendo un Vueform element de calendario), **uEngagement no define componentes Vue propios**: `modsComponents/` y `modsComposables/` estan vacios. El mod resuelve calendarios, listas y detalle exclusivamente con los layouts del core (`RecordList`, `RecordDetail`, `CalendarLayout`/`OfferingCalendar`), configurados via JSON.

Fuente: listado de directorios `modsComponents/` y `modsComposables/` (sin archivos).

**Patron a notar**: un mod no necesita componentes Vue propios para tener funcionalidad rica (calendarios, tabs gateados por capability, vistas combinadas tabla/calendario): todo se logra configurando `layoutConfig` sobre los layouts genericos del core.

---

## 7. Traducciones: 3 idiomas

### Estructura de archivos (39 total)

```
lang/
├── en/
│   ├── common.i18n.json
│   ├── activity.i18n.json
│   ├── ActivityType.i18n.json
│   ├── Attendance.i18n.json
│   ├── core_User.i18n.json
│   ├── Event.i18n.json
│   ├── Feedback.i18n.json
│   ├── FormTemplate.i18n.json
│   ├── Journal.i18n.json
│   ├── Offering.i18n.json
│   ├── OrgUnit.i18n.json
│   ├── ServiceLine.i18n.json
│   └── Student.i18n.json
├── es/  (mismos 13 archivos)
└── pt/  (mismos 13 archivos)
```

Formula: 13 archivos (1 comun + 12 por objeto/dominio) x 3 idiomas = 39 archivos. Fuente: `lang/{en,es,pt}/*.i18n.json`.

**Diferencia de convencion frente a `retention-wellbeing`**: el mod viejo usaba archivos planos `{locale}@{Object}.json` (`es_CL@Event.json`) en la raiz de `lang/`; uEngagement organiza por carpeta de idioma (`lang/en/`, `lang/es/`, `lang/pt/`) con un archivo por objeto (`Event.i18n.json`). Ambos formatos son validos; reflejan la convencion vigente al momento en que se creo cada mod.

### Navbar vs page title (patron)

El label del **grupo** de navbar viene de `object.<ObjectName>` (lang base), mientras que el label de la **entrada/pagina** viene de `layout.<layoutName>.label`. Pueden diferir a proposito: `engagement_Event_student_calendar` muestra "Events" (grupo `object.Event`) en el navbar pero "My calendar" (`layout.<id>.label`) como titulo de la vista abierta. Fuente: `.ai/PATTERNS.md:770`.

### Patron: el mod conserva nombres legacy en algunos archivos lang

`ServiceLine.i18n.json` y `activity.i18n.json` (minuscula) siguen presentes pese a que el objeto de negocio actual es `ActivityLine`/`Activity` (PascalCase) tras el model-v2; son artefactos de la migracion que la documentacion interna (`.ai/CONTEXT.md`) todavia referencia en varias secciones. Util para el dev que navegue el codigo: no asumir que toda mencion a `ServiceLine` en docs corresponde a un objeto vivo.

---

## 8. Workflows n8n

El mod tiene **13 workflows** (`flow-01` a `flow-10`, mas `flow-13` a `flow-15`; no hay `flow-11`/`flow-12` como archivos vigentes, aunque la documentacion interna aun menciona un `flow-11-service-operational-status-sync` para el calculo de `operationalStatus`).

Fuente: `flows/*.json` (listado de archivos), `.ai/CONTEXT.md:93-115`.

### Pipeline de inscripcion (FLOW-01..04)

```
Estudiante hace clic en "Inscribirse"
   └─► enrollCurrentStudent(offeringId)   // mutacion validada e idempotente
          ├─► evento BullMQ `offeringenrollment:created`
          │       ├─► FLOW-01  → Offering.usedCapacity += 1
          │       └─► FLOW-02  → crea Attendance por cada Event futuro (isActive: true)
          └─► UI refetch ~1.5s despues

Estudiante hace clic en "Desinscribirse"
   └─► deleteInstance(OfferingEnrollment)
          └─► evento BullMQ `offeringenrollment:cancelled`
                  ├─► FLOW-03  → Offering.usedCapacity -= 1 (clamped en 0)
                  └─► FLOW-04  → borra Attendance no marcada (isTaken != true); las marcadas se preservan
```

Fuente: `.ai/CONTEXT.md:116-131`.

### Pipeline de asistencia del responsable (FLOW-05/06)

```
Responsable edita Attendance.status (Present/Absent) en el modal de asistencia
   └─► evento BullMQ `attendance:updated`
          ├─► FLOW-05 → Attendance.isTaken = true (publica la fila al estudiante);
          │             tambien setea checkInTime = updatedAt cuando status = Present
          └─► FLOW-06 → si toda la Attendance del Event tiene isTaken=true,
                         marca Event.isAttendanceTaken = true
```

Ambos flows son idempotentes via compare-then-write (mismo patron que el flow de `operationalStatus`). Fuente: `.ai/CONTEXT.md:135-157`.

### Pipeline de cobertura docente (ENG-13/14, FLOW-13/14/15)

```
Admin asigna un instructor a una oferta
   └─► createInstance(TeachingAssignment)
          └─► canal core `TeachingAssignment:create`
                 └─► FLOW-13: por cada Event de la oferta, crea una TeachingCoverage
                       (status=Planned) que el instructor aun no cubre

Admin crea una sesion desde el calendario de la oferta
   └─► createOfferingEvent(...)   // resolver custom, prisma-directo
          └─► publica `Event:create` MANUALMENTE al canal core
                 └─► FLOW-15: por cada instructor con TA activa en la oferta,
                       crea una TeachingCoverage para el nuevo evento

Admin elimina la TeachingAssignment de un instructor
   └─► deleteBulkInstances(TeachingAssignment)   // delete de RecordList
          └─► canal de dominio del mod `upOne-Engagement` (NO core)
                 └─► FLOW-14: borra la TeachingCoverage de ese instructor en los eventos de la oferta
```

**Datos clave** (documentados en TROUBLESHOOTING.md del mod):

- Los 3 flows son **idempotentes via compare-then-write**: este fork de n8n no honra el `onError` de nodo, asi que apoyarse solo en el unique constraint `[instructorId, eventId]` haria surgir errores; el pre-filtro es lo que mantiene las corridas limpias.
- **El canal de publicacion depende del tipo de mutacion**: operaciones sobre una sola instancia (`createInstance`, `deleteInstance`) publican siempre al canal **core**; las operaciones **bulk** (`deleteBulkInstances`) publican solo al **dominio del mod** (`upOne-Engagement`). Por eso FLOW-14 escucha `upOne-Engagement` mientras que FLOW-13/15 escuchan `core`.
- **No hace falta flow para el delete de Offering/Event**: `Offering → Event → TeachingCoverage` cascadea en la BD (`eventId onDelete: Cascade`, ver seccion 3). FLOW-14 existe solo porque no hay FK de `TeachingAssignment` a `TeachingCoverage`.
- La gestion manual de cobertura (tab "Cobertura docente", ENG-13) convive con esta automatizacion (ENG-14).

Fuente: `.ai/CONTEXT.md:159-186`, `objects/TeachingCoverage.json`.

---

## 9. RBAC: capabilities del mod

```json
{
  "module": "uengagement",
  "version": "0.1.0",
  "capabilities": [
    { "name": "mod/uengagement:view_offerings", "description": "Ver el catalogo de ofertas de engagement (cards/lista/calendario) como estudiante", "riskLevel": "low" },
    { "name": "mod/uengagement:enroll", "description": "Inscribir al estudiante actual en una oferta (crea OfferingEnrollment)", "riskLevel": "medium" },
    { "name": "mod/uengagement:unenroll", "description": "Cancelar la inscripcion del estudiante actual en una oferta", "riskLevel": "medium" },
    { "name": "mod/uengagement:view_attendance", "description": "Ver los registros de asistencia propios del estudiante actual", "riskLevel": "low" },
    { "name": "mod/uengagement:service:create", "label": "Crear servicios", "description": "Permite crear activity con recordType=Service." },
    { "name": "mod/uengagement:service:edit", "label": "Editar servicios", "description": "Permite editar activity con recordType=Service (incluida la asignacion de centro)." },
    { "name": "mod/uengagement:activitytype:create", "label": "Crear tipos de actividad", "description": "Permite crear nuevos ActivityType, incluido el flujo desde el FK del formulario de servicio." },
    { "name": "mod/uengagement:view_students", "description": "Ver el directorio de estudiantes (necesario para el picker de PICK-03 en inscripcion masiva)", "riskLevel": "low" },
    { "name": "mod/uengagement:bulk_enroll", "description": "Inscribir estudiantes en lote en una oferta (row action multiSelectPicker)", "riskLevel": "medium" },
    { "name": "mod/uengagement:edit_attendance_as_responsible", "label": "Editar asistencias como responsable", "description": "Permite al responsable ver y editar (no eliminar) la asistencia de eventos pasados de sus ofertas.", "riskLevel": "medium" },
    { "name": "mod/uengagement:availability:manage", "label": "Gestionar disponibilidad propia", "description": "Permite a un Responsable crear, ver e inactivar sus propios bloques de disponibilidad (UPONE-1139, ENG-07).", "riskLevel": "medium" }
  ]
}
```

Fuente: `capabilities.json:1-63`.

**Patrones a notar:**

- Un unico prefijo `mod/uengagement:*` (a diferencia de `retention-wellbeing`, que combinaba `mod/wellbeing:*` y `mod/retention:*`).
- Separacion view/manage: `view_offerings` (low) vs `enroll`/`unenroll` (medium); `service:create`/`service:edit` sin `riskLevel` explicito (heredan el default del schema).
- **Grants que no viven en el mod**: los permisos de `journal`/`student` para los roles `admin-general-eng`/`admin-centro-eng`/`responsable-eng` se definen en el seed de tenant del Object Manager (`capabilityMap`), no en `capabilities.json` del mod. Fuente: `.ai/CONTEXT.md:215`.
- **Tab gating por capability precisa, no por capability proxy**: ver Patron 1 de la seccion 5 (`activity:view` en vez de `formtemplate:modify`). Fuente: `.ai/PATTERNS.md:786-787`.

---

## 10. Flujo completo: de la idea a la UI

### Caso: "Necesitamos que un admin asigne cobertura docente automaticamente al crear un evento" (ENG-14)

**Paso 1: Objeto** (`mods/uengagement-up1/objects/`):
- `TeachingCoverage.json` ya existia (creado en ENG-13 para gestion manual) con FK `instructorId`, `eventId` (`onDelete: Cascade`) y unique constraint `[instructorId, eventId]`.
- `npm run sync && npm run codegen && npm run tenant:migrate` si el objeto cambia de forma.

**Paso 2: Resolver** (`mods/uengagement-up1/logic/`):
- `offering-event-create.resolver.js` (`createOfferingEvent`) ya existia como resolver prisma-directo para crear eventos desde el calendario de la oferta; se le agrega la publicacion manual de `Event:create` al canal core (porque bypasea `withEventPublish`).

**Paso 3: Flows** (`mods/uengagement-up1/flows/`):
- `flow-13-teachingassignment-coverage-create.json`: escucha `TeachingAssignment:create` en el canal core, crea `TeachingCoverage` (compare-then-write) para cada `Event` de la oferta.
- `flow-14-teachingassignment-coverage-delete.json`: escucha el canal de dominio `upOne-Engagement` (porque el delete es bulk), borra la cobertura del instructor.
- `flow-15-event-coverage-create.json`: escucha `Event:create` en el canal core, crea cobertura para el nuevo evento por cada instructor con TA activa.
- `npm run sync` + `docker compose --profile worker up -d`.

**Paso 4: Layout** (`mods/uengagement-up1/config/layouts/`):
- El tab manual "Cobertura docente" (ENG-13) ya existia y sigue siendo el punto de gestion manual; la automatizacion (ENG-14) no requiere un layout nuevo, solo mantiene los datos consistentes en segundo plano.

**Paso 5: Traducciones** (`mods/uengagement-up1/lang/`):
- Labels de `TeachingCoverage` agregados a `lang/{en,es,pt}/`.
- `npm run sync` → restart Suite.

**Paso 6: Capabilities**: no se agregaron capabilities nuevas para ENG-14 (la automatizacion es transparente al usuario; la gestion manual ya usaba las capabilities de `TeachingAssignment`).

### Diagrama resumen

```text
┌──────────────────────────────────────┐
│  mods/uengagement-up1/               │
│                                      │
│  objects/*.json                      │ ──────────────────────────► PostgreSQL (CRUD auto)
│  logic/*.js + .graphql               │ ──────────────────────────► Object Manager (GraphQL API)
│  config/layouts/*.json               │ ──────────────────────────► BD layouts ──────────────► Suite (UI)
│  lang/{en,es,pt}/*.i18n.json         │ ──────────────────────────► $t() traducciones ────────► Suite (UI)
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

---

## 11. Retention/wellbeing: feature dentro del mod, no un mod separado

Entre 2026-07-13 y 2026-08-03, el repo `uengagement-up1` concentro casi todo su trabajo en una feature de retencion/wellbeing (hilos `SS-4xx`/`RET-0x`, sin tickets UPONE). **No es un mod aparte**: el mod `mods/retention-wellbeing/` sigue vacio (`capabilities.json: { "capabilities": [] }`, sin `objects/`), verificado de nuevo en esta revision. Todo el codigo vive en `uengagement-up1`, con prefijo `retention_` en layouts y roles `admin-ret`/`gestor-ret` en `config/app.json`.

### 11.1 Dashboard de salud + historial de auditoria (RET-07)

`retention_health_dashboard.json` es un layout `layoutType: Dashboard` (roles `admin-ret`/`gestor-ret`, tenant `UPU`) con un mosaico de 5 KPIs + 3 charts, cada widget de `widgetType: report` apuntando a un `reportCode` (`UENG-KPI-ACTIVOS`, `UENG-KPI-FUERA-RIESGO`, `UENG-KPI-EN-RIESGO`, `UENG-KPI-EN-ATENCION`, `UENG-KPI-DESERTADOS`, mas los charts de cohorte/estado/factores) definido en `config/reports/report-definition/` y materializado como `config/reports/report-template/ueng-ret-*.json`.

```json
"widgets": [
  { "widgetId": "kpiActivos", "widgetType": "report", "title": "Estudiantes activos",
    "mode": "dynamic", "config": { "reportCode": "UENG-KPI-ACTIVOS", "defaultView": "kpi" } }
]
```

Fuente: `config/layouts/retention_health_dashboard.json:1-40`, `config/reports/report-template/ueng-ret-*.json`. Un comentario propio del layout (`_comment`) advierte una particularidad no documentada en otro lado: **todo widget en `widgets[]` se monta y ejecuta su query aunque no aparezca en el `mosaic`**; sacar un widget de la vista exige sacarlo tambien de `widgets[]`, no solo del mosaico.

**Correccion de drift (RET-07, commit `0bdb09f`, 2026-08-06)**: el parrafo anterior de esta seccion describia `retention_dataLogEntry_view.json` (un layout sobre `core_DataLog`) como el historial de auditoria de la ficha del estudiante. Ese layout **ya no existe**: se elimino junto con las claves i18n de `core_DataLog` en los 3 idiomas. En su lugar, `retention_StudentLogger_view.json` (nuevo) lee el objeto de dominio propio `StudentLogger` (seccion 11.1bis). Ver el detalle abajo.

### 11.1bis StudentLogger reemplaza core_DataLog como historial del estudiante (RET-07)

`StudentLogger` es un objeto de dominio propio del mod (`objects/StudentLogger.json`, commit `7c9b923`), con dos RecordTypes: `rt__EnrollmentChange__StudentLogger` (cambios de inscripcion/estado) y `rt__RiskFactorChange__StudentLogger` (cambios de factor de riesgo). Se alimenta de 3 eventos (`programenrollment-updated`, `studentriskfactor-created`, `studentriskfactor-updated`) y 3 flows n8n (`flow-16-programenrollment-logger`, `flow-17-riskfactor-added-logger`, `flow-18-riskfactor-changed-logger`), que escuchan esos eventos y crean la fila de `StudentLogger` correspondiente.

El tab de historial de cambios del estudiante (`retention_StudentLogger_view.json`, commit `0bdb09f`) deja de leer `core_DataLog` y lee `StudentLogger` directamente; se elimina el layout `retention_dataLogEntry_view.json` y sus claves i18n. Es el reemplazo inverso al patron documentado antes de esta ventana (`core_DataLog` como historial generico reusable): aqui el mod construye su propio objeto de historial en vez de reusar el genérico de core. Ver [`DECISION-034`](../../decisions/DECISION-034-studentlogger-replaces-datalog.md) para las razones del cambio. Fuente: `objects/StudentLogger.json`, `objects/RecordTypes/rt__{EnrollmentChange,RiskFactorChange}__StudentLogger.json`, `flows/flow-{16,17,18}-*.json`.

### 11.2 Indicadores institucionales: desviacion del patron `ext__<CLIENT>__`

`rut`, `beca` y `ultimoAccesoLms` (indicadores RET-03) se implementaron primero como custom fields per-tenant (`ext__uplanner__programenrollment`, el patron estandar de la plataforma) y luego se refactorizaron a campos declarados directo en el objeto base `objects/ProgramEnrollment.json` de `uengagement-up1` — documentados en el propio schema como "UPU-only por ahora" pero ya sin aislamiento por tenant:

```json
"rut": { "type": "string", "not_null": false,
  "description": "Indicador institucional (RET-03): RUT del estudiante. Extension del mod; hoy solo se usa en UPU (al migrar otros clientes se evaluara hacerlo per-tenant)." }
```

Fuente: `objects/ProgramEnrollment.json` (propiedades `rut`, `beca`, `ultimoAccesoLms`), commit `440b1b1 "refactor: SS-430 indicators as mod-shared fields on ProgramEnrollment (not per-tenant ext) — UPU-only for now"`.

**Nota**: `ProgramEnrollment` es un objeto **base** de `curriculum-design/objects/ProgramEnrollment.json`; `uengagement-up1` declara su propio `objects/ProgramEnrollment.json` con estos campos adicionales, que la fase 2 del sync (Merge Sync) combina con la definicion de `curriculum-design`. Es decir, dos mods distintos aportan propiedades al mismo objeto base — un patron de extension cross-mod ya usado por la plataforma, pero que aqui se usa para declarar campos mod-shared en vez de una extension `ext__` per-tenant.

⚠️ **Desviacion registrada** frente a la convencion de la plataforma (`ext__<CLIENT_CODE>__<objectName>` para campos especificos de cliente, ver CLAUDE.md de up1): estos 3 campos quedan en el objeto base, visibles para **cualquier tenant** que consuma `ProgramEnrollment` via `uengagement-up1`, no solo UPU. Riesgo documentado: si se suma un segundo tenant con indicadores institucionales distintos, no hay aislamiento — todos los tenants comparten las mismas columnas. Reversibilidad media (requiere mover los campos a una extension per-tenant y migrar los datos de UPU). Ver `DECISION-022` en el KB de Deckard Cain (`decisions/DECISION-022-retention-mod-shared-indicators.md`).

`riskLevel` (enum `Alto`/`Medio`/`Bajo`) y `riskStatus` (enum `FueraDeRiesgo`/`EnRiesgo`/`EnProcesoDeAtencion`/`HaDesertado`) se agregaron despues en el mismo objeto, en paralelo al campo numerico preexistente `risk` (percent, poblado por la integracion de uRetention).

### 11.2bis Dashboards de retencion: salud y post mortem (SS-454)

`retention_health_dashboard.json` (seccion 11.1) convive con un segundo dashboard, el **post mortem** (commit `80b3703`), con sus propios KPIs: casos actuales `EnRiesgo` (no relapses, corregido en `cecda73`), y un KPI de recaida ("Casos que han recaido", reincorporado en `9c4dabb` tras un descarte previo). Un chart de riesgo promedio se retiro temporalmente (`d793e33`) hasta corregir un bug de mapeo en core. Un chart adicional de conteo por factor de riesgo se agrego sobre el dashboard de salud (`4c18bae`, SS-453, ver subseccion siguiente).

### 11.2ter Bug de core detras del fix de SS-453 (no atribuible al mod)

El commit `4c18bae` ("count-based risk factor chart on health dashboard") **mitiga** un bug cuya causa raiz esta en **core**, no en `uengagement-up1`: `object-manager/src/graphql/resolvers/instance.resolver.js:2272-2280` tiene un `if (hasSelect) { ... } else { /* auto-includes de relations */ }`. Pasar el argumento `fields` a una query resuelve `hasSelect = true` y entra por la rama `if`, que arma el `select` explicito pero nunca ejecuta el bloque de auto-includes de relaciones (linea 2281 en adelante), porque ese bloque vive exclusivamente en el `else`. El template de reporte de este chart pasaba `fields`, lo que desactivaba el procesamiento de sus `relations` declaradas. El commit del mod solo **removio `fields` del template** como mitigacion; el defecto de fondo en `instance.resolver.js` sigue latente para cualquier otro consumidor que combine `fields` + `relations` en la misma query. Ver [`BUG-object-manager-014`](../../bugs/object-manager/bug-object-manager-014.md).

### 11.2quater Homescreen dedicado para admin-general-eng (PLAT-15/UPONE-1552, sin ticket propio de este commit)

`config/app.json:32` declara `"homescreen": "ueng_home_dashboard"`, el layout al que apunta el boton Home de la navbar (commit `4ab5f54`, PR "engagement-demo-guides-and-view-fixes"). `ueng_home_dashboard.json` restringe `roles: ["Admin", "admin-general-eng"]` y usa exclusivamente widgets `recordlist` (no `report`) para no depender de Flexmonster, hoy bloqueado por licencia (UPONE-1519), sync de reportes roto y un bug de mapping sin tipo que degrada agregaciones a conteo (documentado inline en el propio layout, clave `_documentation.widgetType`). Fuente: `config/layouts/ueng_home_dashboard.json:7-14`.

### 11.2quinquies UPONE-1489/1490: tarjetas de indicadores y descripcion de factor de riesgo desde el contrato de origen

Dos tickets sobre la ficha de retencion del estudiante, cada uno con su propio alcance (no deben confundirse con `emptyDisplayKey`, que es de SS-469, seccion 3 mas abajo):

- **UPONE-1490** ("Indicadores como tarjetas en la ficha + tab editable de indicadores", PR #61, commit de merge `d33b5fd`): agrega un tab editable de indicadores institucionales (`rut`, `beca`, `ultimoAccesoLms`, seccion 11.2) a `retention_ProgramEnrollment_edit.json`, ademas de mostrarlos como tarjetas en la vista.
- **UPONE-1489** ("mostrar la descripcion del factor de riesgo via el contrato de origen", PR #62, commit `feb4b36`): simplifica `retention_StudentRiskFactor_view.json`, resolviendo la descripcion del factor desde el contrato de origen en vez de un campo propio duplicado.

### 11.3 Objetos nuevos: RiskFactor y StudentRiskFactor

Dos objetos nuevos, con relacion catalogo/junction:

- `RiskFactor`: catalogo de factores de riesgo (`name`, `description`), que mide cada factor y como interpretarlo.
- `StudentRiskFactor`: junction `RiskFactor` × `ProgramEnrollment` (unique constraint `[programEnrollmentId, riskFactorId]`, ambas FK con `onDelete: Cascade`), con `value`, `riskPercentage` y `riskLevel` propios de esa combinacion estudiante-factor. El nombre/descripcion se resuelven por FK a `RiskFactor`, sin duplicarse.

Fuente: `objects/RiskFactor.json`, `objects/StudentRiskFactor.json`. Se exponen como CRUD propio (`retention_RiskFactor_{create,edit,list,view}.json`, rol `admin-ret`) y como card list embebido en la pestana de factores de riesgo de la ficha del estudiante (`retention_StudentRiskFactor_view.json` referenciado desde `retention_ProgramEnrollment_view.json`), mismo patron de card list embebido 1:N documentado para otras relaciones del mod.

### 11.4 Ficha de estudiante full-page + vista por carrera

La ficha de retencion del estudiante paso de modal a ruta propia (`openMode: route` + `detailTitle`, tab "General") en `retention_ProgramEnrollment_view.json`. Se agrego ademas `retention_ProgramEnrollment_list.json` + `retention_Student_view.json` para listar estudiantes por carrera filtrados por riesgo.

Fuente: `config/layouts/retention_ProgramEnrollment_{list,view,create,edit}.json`, `config/layouts/retention_Student_view.json`.

### 11.5 Soft-delete en ActivityType + gap de capability

`objects/ActivityType.json` habilita `metadata.softDelete: { "field": "isActive" }` (borrado logico: el delete marca `isActive: false` en vez de eliminar la fila).

```json
"metadata": { "softDelete": { "field": "isActive" } }
```

Fuente: `objects/ActivityType.json:11`. La capability `activitytype:delete` se otorga al rol admin en `seed/_data-rbac.js:105`, **no** figura en `capabilities.json` del mod (a diferencia del resto de capabilities de `uengagement-up1`, todas bajo el prefijo `mod/uengagement:*` y declaradas ahi). El propio commit documenta que el layout ya exponia `canDelete: true` sin la capability correspondiente — la cap se agrego para cerrar ese gap, pero quedo declarada solo en el seed de rol, no en el catalogo del mod.

### 11.6 Retiro de FKs de Activity (sin ticket asociado)

Commit `6cf017e "Remove workflowId and currentStatusId FKs from Activity"`: elimina `workflowId` (→ `Workflow`) y `currentStatusId` (→ `WorkflowStatus`) de `objects/Activity.json`. No hay ticket ni contexto en el mensaje de commit; se interpreta como el retiro de un feature de workflow que nunca se uso en `Activity`. No quedan referencias residuales en layouts/resolvers del mod (confirmado por busqueda en el repo). Pendiente: no hay decision documentada de por que se abandono; si se retoma, confirmar con el autor.

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-07-16 | Documento inicial: guia de ejemplos basada en el mod `uengagement-up1` en produccion, en reemplazo de `example-engagement.md` (retention-wellbeing, superseded 2026-06-09) |
| 2026-08-03 | Seccion 11: feature de retention/wellbeing (SS-4xx/RET-0x) construida dentro de `uengagement-up1`, no en un mod separado. Dashboard de salud (RET-07), historial via `core_DataLog`, objetos `RiskFactor`/`StudentRiskFactor`, desviacion de indicadores institucionales como campo mod-shared (`DECISION-022`), soft-delete en `ActivityType`. Actualizados conteos de objetos/layouts/roles/capabilities en la seccion 1. Verificado `mods/retention-wellbeing/` sigue vacio |
| 2026-08-17 | Ventana 2026-08-03..2026-08-17 (30 commits). Correccion de drift: `StudentLogger` (RET-07, commit `0bdb09f`) reemplaza `core_DataLog` como historial del estudiante, el layout `retention_dataLogEntry_view.json` documentado antes ya no existe (seccion 11.1bis); aclarada la relacion entre el mod vacio `retention-wellbeing` y la mencion de `.ai/CONTEXT.md:18` a un "operational retention-wellbeing mod" distinto (nota de apertura). Agregados: dashboards de salud y post mortem (SS-454); bug de core detras de la mitigacion de SS-453 (`instance.resolver.js:2272-2280`, `fields` desactiva `relations`, no atribuible al mod); homescreen dedicado para `admin-general-eng` (`ueng_home_dashboard`); tarjetas de indicadores (UPONE-1490) y descripcion de factor de riesgo via contrato de origen (UPONE-1489); migracion de `engagement-offering-view` a tabs+schema con `emptyDisplayKey` (SS-469); workaround del limite de 2 hops en el calendario del estudiante (`USER_RELATED`); dato verificado de `slotDuration` fijo por defecto de `OfferingCalendar` (seccion 5) |
