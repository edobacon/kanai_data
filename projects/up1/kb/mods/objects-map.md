---
id: SPEC-mods-023
project: up1
type: spec
module: mods
category: mods
tags: [up1, mods, objetos, relaciones, foreign-key, extended, multi-tenant, core, diagrama-er, patrones]
fecha: 2026-04-14
sources:
  - core/object-manager.md (secciones 5, 8, 11)
  - mods/creation-guide.md (seccion 5.1)
  - mods/reference.md (seccion 5)
  - mods/example-uengagement.md
  - mods/example-academic-scheduling.md
  - Confluence: arquitectura, workspaces
  - Codigo fuente de uengagement-up1, academic-scheduling, hello-world-mod
  - mods/academic-scheduling/specs/objetos-minimos-scheduling.md
---
# Mapa de objetos: como los mods se relacionan con uP1

## Indice

1. [Vision general](#1-vision-general)
2. [Categorias de objetos](#2-categorias-de-objetos)
3. [Catalogo de objetos](#3-catalogo-de-objetos)
4. [Diagrama de relaciones](#4-diagrama-de-relaciones)
5. [Mapa de consumo: mod → objetos](#5-mapa-de-consumo-mod--objetos)
6. [Patrones de relacion](#6-patrones-de-relacion)
7. [Extended objects: agregar campos a objetos core](#7-extended-objects-agregar-campos-a-objetos-core)
8. [Guia: crear objeto propio vs extender core vs consumir core](#8-guia-crear-objeto-propio-vs-extender-core-vs-consumir-core)
9. [Referencias cross-mod](#9-referencias-cross-mod)
10. [Reglas y restricciones](#10-reglas-y-restricciones)

---

## 1. Vision general

Los mods no operan en aislamiento: se construyen **sobre** los objetos de la plataforma. Un mod puede:

1. **Crear objetos propios**: tablas nuevas exclusivas del dominio del mod
2. **Consumir objetos core**: usar Person, Institution, Course, etc. en layouts y resolvers
3. **Extender objetos core**: agregar campos custom a objetos existentes (por tenant)
4. **Referenciar objetos de otros mods**: FK entre objetos de distintos mods

```text
┌───────────────────────────────────────────────────────┐
│ Objetos Core (plataforma)                             │
│  ┌────────┐  ┌─────────────┐  ┌────────┐  ┌───────┐  │
│  │ Person │  │ Institution │  │ Course │  │ ...   │  │
│  └────┬───┘  └─────────────┘  └────────┘  │14+    │  │
│       │                                   │objetos│  │
└───────│───────────────────────────────────┴───────┴──┘
        │ consume
┌─────────────────────────────────┐  ┌───────────────────────────────┐
│ Mod: uengagement-up1            │  │ Mod: hello-world-mod          │
│  ┌──────────────────────┐       │  │  ┌────────────┐               │
│  │ Activity             │       │  │  │ HwAssessm. │◄──FK── HwFact │
│  └──────┬───────────────┘       │  │  └────────────┘               │
│         │ 1:N activityId        │  │         ▲                     │
│  ┌──────▼───────────────┐       │  │         └──FK── HwIntervention│
│  │ ActivityLine→Offering│       │  │  (HwAssessment consume Person)│
│  └──────────────────────┘       │  └───────────────────────────────┘
└─────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Mod: academic-scheduling                                            │
│  Shift ──1:N──> TimeBlock                        (objetos propios)  │
│  ┌───────────────────┐                                              │
│  │ InstructorOrgUnit │─FK── instructorId ──> Instructor (uengagement-up1)
│  │ (union N:M propia)│─FK── orgUnitId    ──> OrgUnit    (uengagement-up1)
│  └───────────────────┘                                              │
│  ┌────────────────────────────┐                                     │
│  │ InstructorCourseAssignment │─FK── activityId ──> Activity        │
│  └────────────────────────────┘        (recordType=Course, curriculum-design)
└───────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┐
│ Extended (por tenant)            │
│  ┌──────────────────────────┐    │
│  │ ext__UPU__person         │─── extiende 1:1 ──> Person
│  │ (campos custom)          │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

> `uengagement-up1` y `academic-scheduling` son ejemplos, no la lista completa: cada uno tiene 22 objetos propios (ver seccion 3, tabla "Objetos de Mods"). `InstructorOrgUnit` es el caso canonico de referencia cross-mod resuelta como tabla de union propia (ver seccion 9).

> **Clave:** los mods crean poco y consumen mucho. Un mod efectivo se apoya en los objetos existentes de la plataforma.

---

## 2. Categorias de objetos

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Tipos de objetos en uP1                                                     │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │ System           │  │ Base             │  │ Extended                 │   │
│  │ objects/core/    │  │ objects/business/│  │ objects/business/        │   │
│  │ Infraestructura  │  │ Base/            │  │ Extended/                │   │
│  │                  │  │ Compartidos por  │  │ Campos custom por tenant │   │
│  │                  │  │ todos            │  │                          │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │ Tenant-specific              │  │ Mod                                 │  │
│  │ objects/tenants/{T}/Base/    │  │ mods/{mod}/objects/                 │  │
│  │ Solo un tenant               │  │ Sync → business/                    │  │
│  └──────────────────────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Tipo | Ubicacion | Quien lo crea | Ejemplo | Visible en API de todos los tenants |
|------|-----------|---------------|---------|-------------------------------------|
| **System** | `objects/core/` | Core | `core_ObjectDefinition`, `core_DataLog`, `Capability`, `Role` | Si (infra) |
| **Base** | `objects/business/Base/` | Core | `Person`, `Institution`, `Course` | Si |
| **Plataforma** | categoria hoy vacia (ver seccion 3) | N/A | N/A | N/A |
| **Extended** | `objects/business/Extended/` | Dev (por tenant) | `ext__UPU__person` | Solo en ese tenant |
| **Tenant-specific** | `objects/tenants/{TENANT}/Base/` | Dev (por tenant) | `ResearchProject` (solo UPU) | Solo en ese tenant |
| **Mod** | `mods/{mod}/objects/` | Dev (mod) | `Shift` (academic-scheduling), `Activity` (uengagement-up1), `HwAssessment` (hello-world-mod) | Si (sync → business/) |

### Campos comunes (automaticos)

Todos los objetos heredan de `objects/business/common.json`:

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `id` | String | UUID generado automaticamente |
| `createdAt` | DateTime | Fecha de creacion |
| `updatedAt` | DateTime | Fecha de actualizacion |
| `createdBy` | String | Usuario que creo |
| `updatedBy` | String | Usuario que actualizo |
| `tenantId` | String | ID del tenant (**obligatorio en todo where**) |

---

## 3. Catalogo de objetos

### Objetos Base (14 documentados)

| Objeto | Dominio | Descripcion |
|--------|---------|-------------|
| `Person` | Personas | Estudiante, docente, administrativo |
| `Institution` | Estructura | Entidad educativa |
| `Campus` | Estructura | Campus fisico |
| `Faculty` | Estructura | Facultad |
| `Department` | Estructura | Departamento |
| `Career` | Academico | Carrera academica |
| `Course` | Academico | Curso/asignatura |
| `Curriculum` | Academico | Plan curricular |
| `AcademicPeriod` | Academico | Periodo academico (semestre, trimestre) |
| `Affiliation` | Personas | Relacion persona ↔ institucion |
| `Profile` | Personas | Perfil de usuario |
| `Role` | Sistema | Rol con capabilities |
| `Tenant` | Sistema | Cliente/institucion |
| `TenantIdentity` | Sistema | Identidad del tenant |

> **Nota:** `Shift` y `TimeBlock` figuraban antes como objetos Base. Se eliminaron de `object-manager` (commit "Remove legacy UPU/TEST tenant objects", 2026-07-06) y se recrearon como objetos propios del mod `academic-scheduling` (`mods/academic-scheduling/objects/Shift.json`, `TimeBlock.json`). Los archivos que hoy se ven en `object-manager/objects/business/Base/shift.json`/`timeblock.json` son el espejo sincronizado del mod (Fase 1/2 del sync), no autoria core: la fuente de verdad es el JSON del mod. Ver tabla de "Objetos de Mods" mas abajo.

### Objetos de Plataforma (categoria hoy vacia en la practica)

Historicamente esta categoria agrupaba objetos fuera de `Base/` pero de uso transversal entre mods (`Event`, `Offering`, `OfferingEnrollment`, `Service`, `Category`, `Issue`, consumidos por el mod `retention-wellbeing`). Ese mod quedo vacio (superseded por `uengagement-up1`, commit "empty legacy mod, superseded by uEngagement", 2026-06-09) y el modelo cambio:

- `Event`, `Offering` y `OfferingEnrollment` **siguen existiendo**, pero hoy son objetos **propios** del mod `uengagement-up1` (`mods/uengagement-up1/objects/`), no objetos huerfanos de plataforma. Ver tabla de "Objetos de Mods" mas abajo y [example-uengagement.md](example-uengagement.md).
- `Service` **ya no es un objeto independiente**: es un RecordType de `Activity` (`rt__Service__Activity.json`, en `mods/uengagement-up1/objects/RecordTypes/`).
- `Category` e `Issue` **no existen** en el modelo actual.

En la practica no quedan hoy objetos "de plataforma" fuera de `Base/`/`core/`: todo lo que antes vivia en esta categoria paso a ser objeto propio de un mod.

### Objetos de Mods

| Mod | Objeto | Tipo | Relaciones |
|-----|--------|------|------------|
| `uengagement-up1` | **Activity**, ActivityLine, ActivityType | Catalogo/oferta | Activity → ActivityLine (1:N) → Offering; RecordType `rt__Service__Activity` |
| `uengagement-up1` | **Offering**, OfferingEnrollment | Oferta/inscripcion | Offering → ActivityLine (FK); OfferingEnrollment → Offering |
| `uengagement-up1` | **Event**, EventException | Agenda | Event → Offering; TeachingCoverage → Event (cascade) |
| `uengagement-up1` | **Attendance**, Feedback, Journal | Registro | FK → Event/Offering/Student segun objeto |
| `uengagement-up1` | **Instructor**, InstructorAffiliation, InstructorTier, TeachingAssignment, TeachingCoverage | Docencia | TeachingCoverage → Instructor + Event (unique) |
| `uengagement-up1` | **Availability**, AvailabilityException | Disponibilidad | patron time-of-day (`format: date-time`) |
| `uengagement-up1` | **Student**, OrgUnit, Organization, Institution, FormTemplate | Soporte | consumidos por resto del dominio |
| `academic-scheduling` | **TermType**, Term | Calendario academico | Term contiene periodos de agendamiento |
| `academic-scheduling` | **Shift**, TimeBlock | Calendario horario | Shift 1:N TimeBlock (`shiftId`) |
| `academic-scheduling` | **Resource**, ResourceTypes, ResourceTypeAssignment | Recursos | N:M Resource ↔ ResourceTypes via ResourceTypeAssignment |
| `academic-scheduling` | **InstructorOrgUnit** | Union propia | N:M Instructor (uengagement-up1) ↔ OrgUnit (uengagement-up1), sin FK directa entre mods |
| `academic-scheduling` | **Contract**, ContractRestriction, RestrictionDefinition, InstructorContract | Contratos | InstructorContract = union N:M Instructor ↔ Contract |
| `academic-scheduling` | **RuleDefinition**, RuleSet, RuleSetRule | Reglas | RuleSetRule = union RuleSet ↔ RuleDefinition |
| `academic-scheduling` | **Scenario**, ScenarioSection, ScenarioSectionAssignment, SchedulingJob | Ejecucion de escenarios | Scenario → ScenarioSection → ScenarioSectionAssignment (cascade) |
| `academic-scheduling` | **Section**, SectionInstructor, InstructorCourseAssignment | Cursos y secciones | `Section.activityId`/`InstructorCourseAssignment.activityId` → FK directa a Activity (recordType=Course, curriculum-design) |
| `hello-world-mod` | **HwAssessment** | Evaluacion | consume Person via layout |
| `hello-world-mod` | **HwFactor** | Factor | FK → HwAssessment |
| `hello-world-mod` | **HwIntervention** | Intervencion | FK → HwAssessment |
| `flow-viewer` | **N8nWorkflow** | Integracion | — (standalone) |

> `uengagement-up1` (22 objetos propios, mas 7 RecordTypes) y `academic-scheduling` (22 objetos propios) son los mods de mayor superficie de modelo hoy. Detalle completo, patrones y decisiones en [example-uengagement.md](example-uengagement.md) y [example-academic-scheduling.md](example-academic-scheduling.md).

---

## 4. Diagrama de relaciones

### Ecosistema completo

```text
  ── CORE: Estructura ──────────────────────────────────────────────────────
  Institution ──1:N──> Campus            (tiene)
  Institution ──1:N──> Faculty           (tiene)
  Faculty     ──1:N──> Department        (tiene)
  Institution ──1:N──> Career            (ofrece)
  Career      ──1:N──> Curriculum        (tiene)
  Curriculum  ──1:N──> Course            (incluye)

  ── CORE: Personas ────────────────────────────────────────────────────────
  Person      ──1:N──> Affiliation       (afiliado a)
  Institution ──1:N──> Affiliation       (recibe)
  Person      ──1:N──> Profile           (tiene)

  ── Mod: uengagement-up1 (Tiempo/Engagement, ya no CORE) ──────────────────
  > `Shift`/`TimeBlock` y `Event`/`Offering`/`OfferingEnrollment` dejaron de ser
  > objetos Base/Plataforma: hoy son objetos propios de mods (ver mas abajo).
  Activity      ──1:N──> ActivityLine    (activityId, quien la ejecuta)
  ActivityLine  ──1:N──> Offering        (activityLineId)
  Offering      ──1:N──> Event           (agenda)
  Offering      ──1:N──> OfferingEnrollment (inscripciones)
  Instructor    ──1:N──> TeachingCoverage (instructorId, unique con eventId)
  Event         ──1:N──> TeachingCoverage (eventId, onDelete Cascade)

  ┌────────────────────────────────┐     ┌───────────────────────────────┐
  │ Activity                       │1:N  │ ActivityLine                 │
  │  name, recordType              │────>│  activityId                  │
  │  (RecordType rt__Service__     │     │  orgUnitId (quien la dicta)  │
  │   Activity para servicios)     │     └──────────────┬────────────────┘
  └────────────────────────────────┘                    │ 1:N activityLineId
                                                         ▼
                                              ┌───────────────────────────┐
                                              │ Offering                  │
                                              │  code, maxCapacity, status│
                                              └───────────────────────────┘

  ── Mod: academic-scheduling ───────────────────────────────────────────────
  Shift          ──1:N──> TimeBlock      (shiftId, objetos propios del mod)
  Instructor (uengagement-up1) ←FK── InstructorOrgUnit ──FK→ OrgUnit (uengagement-up1)
  Activity (recordType=Course, curriculum-design) ←FK activityId── InstructorCourseAssignment

  ┌────────────────────────────────┐     ┌───────────────────────────────┐
  │ Shift                         │1:N  │ TimeBlock                     │
  │  name: string                 │────>│  dayOfWeek, startTime, endTime│
  └────────────────────────────────┘     │  shiftId                     │
                                          └───────────────────────────────┘
  ┌────────────────────────────────┐
  │ InstructorOrgUnit              │  union N:M propia (evita FK directa
  │  instructorId (FK Instructor)  │  sobre un objeto de otro mod)
  │  orgUnitId (FK OrgUnit)        │
  └────────────────────────────────┘

  ── Mod: hello-world-mod ──────────────────────────────────────────────────
  ┌────────────────────────────────┐
  │ HwAssessment                   │
  │  studentId: string             │
  │  riskLevel: string             │
  │  riskScore: float              │
  └──────────────┬─────────────────┘
        1:N      │        1:N
        ▼        │        ▼
  ┌──────────────┐  ┌──────────────────┐
  │ HwFactor     │  │ HwIntervention   │
  │  category:str│  │  type: string    │
  │  weight:float│  │  status: string  │
  └──────────────┘  └──────────────────┘

  ── Objetos Core compartidos ──────────────────────────────────────────────
  ┌────────────────────────┐
  │ Person                 │
  │  firstName: string     │
  │  lastName: string      │
  │  email: string         │
  └────────────────────────┘
  ┌────────────────────────┐
  │ Institution            │
  │  name: string          │
  │  code: string          │
  └────────────────────────┘
```

### Solo mods y sus dependencias

```text
  ┌─────────────────────────────────────────────────────────────────────┐
  │ Objetos que academic-scheduling consume de otros mods                │
  │                                                                     │
  │  ┌────────────┐  ┌─────────┐  ┌──────────────────────────────────┐ │
  │  │ Instructor │  │ OrgUnit │  │ Activity (recordType=Course)     │ │
  │  │ (uengagement-up1)       │  │ (curriculum-design)              │ │
  │  └────────────┘  └─────────┘  └──────────────────────────────────┘ │
  └───────────────────────┬─────────────────────────────────────────────┘
              consume (- -)│  FK directa (──>)
              ┌──────────────┘──────────────────┐
              │                                 │
  ┌─────────────────────────────┐   ┌─────────────────────────────────┐
  │ academic-scheduling         │   │ hello-world-mod                 │
  │                             │   │                                 │
  │  ┌──────────────────────┐   │   │  ┌──────────┐                  │
  │  │ InstructorOrgUnit    │   │   │  │HwAssessm.│◄──FK── HwFactor  │
  │  │ (union N:M propia,   │   │   │  └──────────┘                  │
  │  │  no FK directa a     │   │   │         ▲                      │
  │  │  Instructor/OrgUnit  │   │   │         └──FK── HwIntervention │
  │  │  ajenos)             │   │   │  (layouts usan Person)         │
  │  └──────────────────────┘   │   └─────────────────────────────────┘
  │  ┌──────────────────────────┐│
  │  │ InstructorCourseAssignment│  FK directa (N:1) activityId ──>
  │  │  (FK directa: cardinalidad│  Activity (curriculum-design)
  │  │   N:1, no requiere union) ││   ┌──────────────────────────┐
  │  └──────────────────────────┘│   │ flow-viewer              │
  └─────────────────────────────┘    │  ┌────────────────┐      │
                                      │  │ N8nWorkflow    │      │
                                      │  └────────────────┘      │
                                      └──────────────────────────┘
  Linea solida ──> = FK declarada en JSON
  Linea punteada - -> = consumo via layouts/resolvers/GraphQL
```

> **Linea solida** = FK declarada en el JSON del objeto. **Linea punteada** = consumo via layouts, resolvers o GraphQL (sin FK).

---

## 5. Mapa de consumo: mod → objetos

### Objetos propios vs consumidos

| Mod | Objetos propios | Objetos core/otros mods consumidos | Como los consume |
|-----|----------------|------------------------|------------------|
| `uengagement-up1` | 22 objetos (Activity, Offering, Event, Instructor, ... ver [example-uengagement.md](example-uengagement.md)) | Institution, Organization | FK directa (`isForeignKey`/`references`), sin objetos "de plataforma" externos al mod |
| `academic-scheduling` | 22 objetos (Shift, TimeBlock, Section, Scenario, ... ver [example-academic-scheduling.md](example-academic-scheduling.md)) | Instructor y OrgUnit (de `uengagement-up1`); Activity recordType=Course (de `curriculum-design`) | Instructor/OrgUnit via `InstructorOrgUnit` (union N:M propia, sin FK directa); Activity via FK directa N:1 (`Section.activityId`, `InstructorCourseAssignment.activityId`) |
| `hello-world-mod` | HwAssessment, HwFactor, HwIntervention | Person | Layout (FK display de studentId → Person), row action con initialDataMapping |
| `flow-viewer` | N8nWorkflow | — | Standalone, no consume objetos core |
| `object-manager-editor` | — (opera sobre core) | Todos | Usa API generica listInstances/createInstance sobre cualquier objeto |
| `ai-agent` | — | — | Sin objetos ni layouts |

> `object-manager-editor` y `flow-viewer` estan reemplazados por `up1-manager` y removidos del ensamblaje activo de la plataforma; se mantienen en esta tabla solo como referencia historica de patron (ver `CLAUDE.md`, seccion "Legacy removed mods/apps").

### Mecanismos de consumo

```text
  ┌───────────────────────────────────────────────────────────────────────┐
  │ Como un mod consume objetos core                                      │
  │                                                                       │
  │  ┌─────────────────────┐  Tab en sidebar        ┌──────────────────┐ │
  │  │ defaultObjects      │ ──Person, OrgUnit────> │                  │ │
  │  │ en app.json         │                        │    Suite UI      │ │
  │  └─────────────────────┘                        │                  │ │
  │  ┌─────────────────────┐  RecordList/Detail      │                  │ │
  │  │ objectName          │ ──de Event, Offering──> │                  │ │
  │  │ en layouts JSON     │                        │                  │ │
  │  └─────────────────────┘                        │                  │ │
  │  ┌─────────────────────┐  Muestra nombre         │                  │ │
  │  │ relationDisplayField│ ──en vez de UUID───────>│                  │ │
  │  │ en layouts          │                        └──────────────────┘ │
  │  └─────────────────────┘                                             │
  │  ┌─────────────────────┐  FK constraint         ┌──────────────────┐ │
  │  │ x-foreign-key       │ ──en BD───────────────>│                  │ │
  │  │ en objects JSON     │                        │  Object Manager  │ │
  │  └─────────────────────┘                        │                  │ │
  │  ┌─────────────────────┐  Queries custom        │                  │ │
  │  │ GraphQL queries     │ ──cross-objeto─────────>│                  │ │
  │  │ en resolvers        │                        │                  │ │
  │  └─────────────────────┘                        │                  │ │
  │  ┌─────────────────────┐  Fetch generico        │                  │ │
  │  │ CRUD generico       │ ──cualquier objeto─────>│                  │ │
  │  │ listInstances()     │                        └──────────────────┘ │
  │  └─────────────────────┘                                             │
  └───────────────────────────────────────────────────────────────────────┘
```

---

## 6. Patrones de relacion

### Patron 1: FK estandar (`x-foreign-key`)

Relacion declarativa entre objetos. El codegen genera FK constraint en PostgreSQL.

```json
{
  "cursoId": {
    "type": "string",
    "title": "Curso",
    "x-foreign-key": {
      "object": "Course",
      "field": "id"
    }
  }
}
```

**Cuando usar:** relacion fuerte, obligatoria, hacia un objeto que siempre existe.

**Resultado:** Prisma genera `@relation()`, constraint FK en BD, CRUD valida integridad.

---

### Patron 2: Relationship declaration (`relationshipType`)

Variante semantica que indica cardinalidad.

```json
{
  "templateId": {
    "type": "relationship",
    "relationshipType": "belongsTo",
    "relatedObject": "TimeBlockTemplate",
    "required": true
  }
}
```

| Tipo | Significado | Ejemplo |
|------|-------------|---------|
| `belongsTo` | N:1, este objeto pertenece a otro | TimeBlockAssignment → TimeBlockTemplate |
| `hasMany` | 1:N, este objeto tiene muchos hijos | (declarado en el padre, no en el hijo) |

**Cuando usar:** cuando quieres explicitar la cardinalidad en el schema.

---

### Patron 3: Convencion de nombre FK (`{camelCase}Id`)

El codegen auto-detecta campos que terminan en `Id` y coinciden con un objeto existente.

```json
{
  "hwAssessmentId": {
    "type": "string",
    "title": "Assessment"
  }
}
```

Si existe un objeto `HwAssessment`, el codegen genera la relacion Prisma automaticamente. **No requiere `x-foreign-key` explicito** si se sigue la convencion.

**Cuando usar:** relaciones simples donde la convencion basta.

---

### Patron 4: Polimorfismo (type + id)

Para relaciones a multiples tipos de objeto sin FK rigida.

```json
{
  "assigneeType": {
    "type": "select",
    "options": [
      { "value": "user", "label": "User" },
      { "value": "resource", "label": "Resource" }
    ]
  },
  "assigneeId": {
    "type": "string"
  }
}
```

```text
                          assigneeType=user
                    ┌───────────────────────────> Person
                    │
                    │     assigneeType=resource
┌───────────────────┤───────────────────────────> Resource
│ TimeBlockAssign.  │
└───────────────────┤     contextType=institution
                    │───────────────────────────> Institution
                    │
                    │     contextType=event
                    └───────────────────────────> Event
```

**Cuando usar:** el campo puede apuntar a **multiples tipos** de objeto. No hay FK constraint: la integridad se valida en logica.

**Pares comunes:**
- `assigneeType` / `assigneeId`: quien
- `contextType` / `contextId`: donde
- `relatedObjectType` / `relatedObjectId`: que

---

### Patron 5: Campos JSON (JSONB)

Para datos flexibles que no justifican una tabla separada.

```json
{
  "daysOfWeek": {
    "type": "json",
    "helpText": "Array: 0=Sunday, 6=Saturday"
  },
  "applicableRoles": {
    "type": "json",
    "default": []
  },
  "metadata": {
    "type": "json",
    "default": {}
  }
}
```

**Cuando usar:** configuracion, arrays de valores, datos semi-estructurados. Evita tablas intermedias.

**Tradeoff:** no hay FK constraints, no se puede filtrar eficientemente por contenido JSONB en queries genericas.

---

### Patron 6: Consumo via layouts (sin FK)

Un mod puede mostrar objetos core en sus vistas sin crear una relacion formal:

```json
{
  "name": "event_list",
  "objectName": "Event",
  "layoutType": "RecordList"
}
```

El mod define layouts para objetos que **no le pertenecen**. Esto es el patron mas comun de consumo.

**Cuando usar:** el mod necesita mostrar o interactuar con datos core. No necesita FK, solo un layout JSON.

---

### Patron 7: Consumo via CRUD generico

En componentes Vue, un mod puede consultar cualquier objeto via GraphQL generico:

```typescript
const result = await apolloClient.query({
  query: gql`
    query { listInstances(objectName: "Person", filters: [...]) { instances totalCount } }
  `
})
```

**Cuando usar:** el mod necesita datos de un objeto core en un componente custom, sin crear resolver.

---

## 7. Extended objects: agregar campos a objetos core

Para agregar campos que solo existen en un tenant sin modificar el objeto base.

### Estructura

```
objects/business/Extended/ext__UPU__person.json
```

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ext__UPU__person",
  "type": "object",
  "properties": {
    "emergencyContact": {
      "type": "string",
      "title": "Contacto de Emergencia"
    },
    "scholarshipType": {
      "type": "string",
      "enum": ["NONE", "PARTIAL", "FULL"],
      "title": "Tipo de Beca"
    }
  }
}
```

### Naming

`ext__<CLIENT_CODE>__<objectName>.json`

| Parte | Valor | Ejemplo |
|-------|-------|---------|
| Prefijo | `ext__` | fijo |
| Client code | codigo del tenant en MAYUSCULAS | `UPU`, `UNAB` |
| Separador | `__` | fijo |
| Object name | nombre del objeto base en lowercase | `person`, `institution` |

### Que genera el codegen

```text
┌──────────────────┐   1:1    ┌──────────────────────┐   codegen   ┌────────────────────────────┐
│ person           │─────────>│ ext__UPU__person      │────────────>│ GraphQL tipo Person        │
│ (tabla base)     │          │ (tabla extended)      │             │ incluye campos extended    │
└──────────────────┘          └──────────────────────┘             └────────────────────────────┘
```

- Tabla separada `ext__UPU__person` con relacion 1:1 al objeto base
- El tipo GraphQL de `Person` en tenant UPU incluye los campos extended
- En otros tenants, esos campos **no existen**

### Desde un mod

Un mod **puede** crear archivos extended. Pero hay una distincion:

| Escenario | Donde va el archivo | Como llega a business/Extended/ |
|-----------|--------------------|---------------------------------|
| Extended creado manualmente | Directo en `objects/business/Extended/` | Ya esta ahi |
| Extended desde un mod | `mods/{mod}/objects/ext__UPU__person.json` | Via sync (fase 2) |

> **Importante:** si el mod define un extended object, se sincroniza a `objects/business/` como cualquier otro objeto. El codegen lo detecta por el prefijo `ext__`.

---

## 8. Guia: crear objeto propio vs extender core vs consumir core

```text
┌──────────────────────────────────┐
│ Necesito datos en mi mod         │
└──────────────┬───────────────────┘
               │
               ▼
   ┌───────────────────────────────┐
   │ Los datos ya existen          │
   │ en un objeto core?            │
   └──┬────────────────────────────┘
      │
      ├── Si, exactamente ──────────────────────────> [Consumir via layouts o CRUD generico]
      │
      ├── Si, pero faltan campos
      │         │
      │         ▼
      │   ┌─────────────────────────────────┐
      │   │ Los campos extra son            │
      │   │ especificos de un tenant?       │
      │   └──┬──────────────────────────────┘
      │      │
      │      ├── Si ────────────────────────> [Crear extended object: ext__TENANT__objeto.json]
      │      │
      │      └── No, todos los tenants los necesitan
      │                   │
      │                   ▼
      │           ┌────────────────────────────────┐
      │           │ Es mejor agregarlo             │
      │           │ al objeto base?                │
      │           └──┬─────────────────────────────┘
      │              │
      │              ├── Si (campo universal) ──────> [Modificar objeto base (requiere coordinacion)]
      │              │
      │              └── No (campo del mod) ─────────> [Crear objeto propio con FK al core]
      │
      └── No, son datos nuevos
                │
                ▼
        ┌───────────────────────────────┐
        │ Los datos son del             │
        │ dominio del mod?              │
        └──┬────────────────────────────┘
           │
           ├── Si ──────────────────────────────────> [Crear objeto propio con FK al core]
           │
           └── No, son transversales ──────────────> [Modificar objeto base (requiere coordinacion)]
```

### Reglas de decision

| Situacion | Accion | Ejemplo |
|-----------|--------|---------|
| Solo necesito **mostrar** datos core en mi mod | Consumir: layout con `objectName: "Person"` | Engagement muestra personas |
| Necesito **filtrar** datos core por mi dominio | Consumir: layout con filtros o resolver custom | Lista de estudiantes filtrada |
| Necesito **campos nuevos** solo para un cliente | Extended object: `ext__UPU__person.json` | Campo "beca" solo en UPU |
| Necesito una **entidad nueva** de mi dominio | Crear objeto propio con FK al core | `TimeBlockTemplate` |
| Necesito **vincular** mi objeto al core | FK via `x-foreign-key` | `TimeBlockAssignment.personId → Person.id` |
| Necesito vincular a **multiples tipos** | Polimorfismo: `type` + `id` pairs | `assigneeType/assigneeId` |
| Los datos son **configuracion** flexible | Campo JSON dentro de mi objeto | `applicableRoles: ["Admin"]` |

---

## 9. Referencias cross-mod

### Es posible?

**Si.** Un objeto del mod A puede declarar FK a un objeto del mod B usando `x-foreign-key` o convencion de nombre. El codegen trata todos los objetos en `objects/business/` por igual: no distingue si vienen de mod A o mod B.

### Pero hay riesgos

```text
┌──────────────────────────────────────┐
│ Mod A define ObjetoA con FK a ObjetoB│
└──────────────────┬───────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │ Mod B esta      │
         │ activo?         │
         └──┬──────────────┘
            │
            ├── Si ──────────────> [FK funciona: constraint valido]
            │
            └── No (en           > [Sync falla o FK apunta
                ignoredMods)        a tabla inexistente]
```

| Riesgo | Descripcion | Mitigacion |
|--------|-------------|------------|
| **Mod B desactivado** | Si mod B esta en `ignoredMods`, sus objetos no se sincronizan. FK de mod A apunta a tabla inexistente | No hacer FK cross-mod a mods opcionales |
| **Orden de sync** | No hay garantia de que mod B se sincronice antes que mod A | Codegen genera todo junto: no es problema si ambos estan activos |
| **Versionado** | Si mod B cambia su objeto, mod A no se entera | No hay mecanismo de breaking change detection |
| **Dependencia implicita** | No hay forma de declarar "mod A requiere mod B" | Documentar en README del mod |

### Recomendacion

| Escenario | Recomendacion |
|-----------|---------------|
| FK a **objetos core** (Person, Institution) | Seguro: siempre existen |
| FK N:1 a **objeto de otro mod** que siempre se despliega junto | Aceptable via FK directa (ej. `InstructorCourseAssignment.activityId` → Activity de `curriculum-design`) |
| FK N:M a **objeto de otro mod** | Evitar FK directa sobre el objeto ajeno: modelar como tabla de union propia en el mod consumidor (ver ejemplo canonico abajo) |
| Consumo via **CRUD generico** de otro mod | Aceptable: falla gracefully si el objeto no existe |

### Ejemplo canonico: academic-scheduling → uengagement-up1

El mod `academic-scheduling` necesitaba vincular `Instructor` (objeto propio de `uengagement-up1`) con `OrgUnit` (tambien de `uengagement-up1`) para modelar la pertenencia organizacional del docente. La solucion **no fue** agregar un campo `orgUnitId` directo al objeto `Instructor` del mod ajeno: eso violaria la regla "never create cross-mod dependencies" y acoplaria el modelo de `uengagement-up1` a un caso de uso de `academic-scheduling`.

En su lugar, `academic-scheduling` crea `InstructorOrgUnit` (`mods/academic-scheduling/objects/InstructorOrgUnit.json`) como tabla de union propia: `instructorId` y `orgUnitId`, ambos FK hacia el objeto ajeno, con `uniqueConstraints: [["instructorId", "orgUnitId"]]`. El mod consume `Instructor`/`OrgUnit` (layouts, RecordTypes de disponibilidad, FKs) pero nunca los edita; cualquier campo nuevo que se necesite sobre `Instructor` en si mismo va como request de extension a `uengagement-up1`, no como edicion directa.

**Patron general:** la cardinalidad decide la forma de la solucion cross-mod. N:M sobre un objeto ajeno → tabla de union propia en el mod consumidor (como `InstructorOrgUnit`). N:1 → FK directa simple (como `InstructorCourseAssignment.activityId` → `Activity` de `curriculum-design`, sin necesidad de tabla de union porque una seccion pertenece a un unico curso).

Documentado en `mods/academic-scheduling/specs/objetos-minimos-scheduling.md` (Decision 1) y en [example-academic-scheduling.md](example-academic-scheduling.md), seccion 8 ("Cross-mod refs").

---

## 10. Reglas y restricciones

### Do

- **Usar `tenantId: context.tenantId` en todo where**: aislamiento multi-tenant es obligatorio
- **Referenciar objetos core via FK** cuando la relacion es fuerte y el objeto siempre existe
- **Usar polimorfismo** cuando el campo puede apuntar a multiples tipos
- **Usar campos JSON** para configuracion flexible que no justifica una tabla
- **Documentar objetos core consumidos** en el README del mod y en `defaultObjects` de app.json
- **Correr `npm run codegen` + `tenant:migrate`** despues de crear/modificar objetos

### Don't

- **No crear objetos que dupliquen core**: si ya existe `Person`, no crear `ModPerson`
- **No hacer FK a objetos de mods opcionales**: si el mod destino puede estar en `ignoredMods`, la FK falla
- **No editar objetos core desde un mod**: modificar `objects/business/Base/person.json` desde un mod rompe el aislamiento
- **No asumir que un objeto de plataforma existe** sin verificar: algunos pueden ser tenant-specific
- **No usar acceso directo a BD**: siempre via GraphQL (CRUD generico o resolver custom)
- **No omitir `metadata`** (label, labelPlural, gender) en objetos nuevos: la UI los necesita

### Validacion

```bash
# Verificar estructura de mods
npm run check-mods

# Verificar que codegen genera sin errores
npm run codegen --workspace=@uplanner/object-management-backend

# Verificar que migraciones aplican
npm run tenant:migrate --workspace=@uplanner/object-management-backend
```

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-04-14 | Documento inicial: mapa completo de objetos, 7 patrones de relacion, diagramas ER, guia crear vs extender, referencias cross-mod |
| 2026-07-16 | Actualizacion mayor: `Shift`/`TimeBlock` salen de Objetos Base (recreados como propios de `academic-scheduling`); `objects/system/` corregido a `objects/core/` (agregado `core_DataLog`); tabla "Objetos de Plataforma" marcada vacia (`retention-wellbeing` superseded por `uengagement-up1`, `Service` es RecordType, `Category`/`Issue` no existen); tabla "Objetos de Mods" reemplazada con el catalogo real de `uengagement-up1` (22 objetos) y `academic-scheduling` (22 objetos); diagramas de secciones 1 y 4 y mapa de consumo de seccion 5 actualizados; seccion 9 suma el ejemplo canonico `InstructorOrgUnit` (N:M cross-mod resuelta con tabla de union propia). Enlaza a `example-uengagement.md` y `example-academic-scheduling.md` |
