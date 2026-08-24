---
id: SPEC-mods-003
project: up1
type: spec
module: mods
category: mods
fecha: 2026-08-17
ticket: UPONE-1369/1316/1317/1334/1254/1398/1404/1447/1480/1523/1521/1527/1606/1614/1595/1611/1318/1524/1520
tags: [academic-scheduling, mod, scheduling, shift, timeblock, resource, scenario, ruleset, contract, sns, scenariojob, concurrency]
sources:
  - mods/academic-scheduling/config/app.json
  - mods/academic-scheduling/objects/Shift.json
  - mods/academic-scheduling/objects/TimeBlock.json
  - mods/academic-scheduling/objects/InstructorOrgUnit.json
  - mods/academic-scheduling/objects/Resource.json
  - mods/academic-scheduling/objects/ResourceTypeAssignment.json
  - mods/academic-scheduling/objects/Section.json
  - mods/academic-scheduling/objects/Scenario.json
  - mods/academic-scheduling/objects/ScenarioJob.json
  - mods/academic-scheduling/objects/ScenarioSection.json
  - mods/academic-scheduling/objects/ScenarioSectionAssignment.json
  - mods/academic-scheduling/objects/ScenarioTerm.json
  - mods/academic-scheduling/objects/SectionCluster.json
  - mods/academic-scheduling/objects/SectionResourceType.json
  - mods/academic-scheduling/objects/TransferTime.json
  - mods/academic-scheduling/objects/OrgUnitRestriction.json
  - mods/academic-scheduling/objects/BuildingCareer.json
  - mods/academic-scheduling/objects/InstructorContract.json
  - mods/academic-scheduling/objects/ContractRestriction.json
  - mods/academic-scheduling/objects/RecordTypes/rt__SectionAvailability__availability.json
  - mods/academic-scheduling/objects/RuleDefinition.json
  - mods/academic-scheduling/objects/RuleSet.json
  - mods/academic-scheduling/objects/RuleSetRule.json
  - mods/academic-scheduling/logic/createRuleSet.resolver.js
  - mods/academic-scheduling/logic/scenario-create.resolver.js
  - mods/academic-scheduling/logic/runScenario.resolver.js
  - mods/academic-scheduling/logic/assign-timeblock.resolver.js
  - mods/academic-scheduling/logic/schedule/summaryAggregates.js
  - mods/academic-scheduling/logic/schedule/conflictDetail.js
  - mods/academic-scheduling/logic/scenario-excel.resolver.js
  - mods/academic-scheduling/logic/schedule/scenarioExcel.js
  - mods/academic-scheduling/logic/scenario-occupancy.resolver.js
  - mods/academic-scheduling/logic/schedule/blockOccupancy.js
  - mods/academic-scheduling/logic/schedule/evalResource.js
  - mods/academic-scheduling/modsComponents/RuleSetEditor/
  - mods/academic-scheduling/modsComponents/ContractAssignment/
  - mods/academic-scheduling/modsComponents/ScenarioDetailPanel/
  - mods/academic-scheduling/modsComponents/ScenarioSectionSelector/
  - mods/academic-scheduling/modsComponents/TermMultiSelect/
  - object-manager/src/helpers/algorithmCallback/callbackToken.js
  - object-manager/src/helpers/snsHelper/index.js
  - mods/academic-scheduling/docs/reference/entities.md
  - mods/academic-scheduling/docs/architecture/run-scenario.md
  - mods/academic-scheduling/docs/architecture/conexion-motor-externo.md
  - mods/academic-scheduling/docs/features/manual-timeblock-assignment.md
  - mods/academic-scheduling/docs/features/scenario-summary-tab.md
  - mods/academic-scheduling/docs/features/scenario-calendar-tab.md
  - mods/academic-scheduling/docs/features/scenario-calendar-pdf-export.md
  - mods/academic-scheduling/specs/objetos-minimos-scheduling.md
  - mods/academic-scheduling/specs/mantenedor-tiempos-de-traslado.md
  - mods/academic-scheduling/specs/exportar-secciones-escenario-excel.md
---

# Ejemplo real: mod Academic Scheduling

Guia practica que recorre el mod `academic-scheduling` para ilustrar como se modela un dominio de agendamiento academico (jornadas, bloques horarios, escenarios, contratos y reglas) sobre el Object Manager, apoyandose en objetos core de otros mods sin crear dependencias cruzadas.

## Indice

1. [Vision general](#1-vision-general)
2. [Objetos de negocio](#2-objetos-de-negocio)
3. [Objetos nuevos por ticket](#3-objetos-nuevos-por-ticket)
4. [Relacion N:M Resource <-> ResourceTypes](#4-relacion-nm-resource---resourcetypes)
5. [Escenarios: de Scenario a ScenarioSectionAssignment](#5-escenarios-de-scenario-a-scenariosectionassignment)
6. [Contratos: cascade delete y limite de UI](#6-contratos-cascade-delete-y-limite-de-ui)
7. [Rule-set editor](#7-rule-set-editor)
8. [Cross-mod refs](#8-cross-mod-refs)
9. [Docs internos del mod](#9-docs-internos-del-mod)
10. [Estado del algoritmo: motor externo via SNS](#10-estado-del-algoritmo-motor-externo-via-sns)
11. [Regla canonica "seccion asignada" (isAssigned)](#11-regla-canonica-seccion-asignada-isassigned)
12. [Features de UI del escenario](#12-features-de-ui-del-escenario)
13. [UPONE-1523: Scenario multi-periodo y objetos de dominio nuevos](#13-upone-1523-scenario-multi-periodo-y-objetos-de-dominio-nuevos)
14. [RuleSet obligatorio y parametrizacion del algoritmo](#14-ruleset-obligatorio-y-parametrizacion-del-algoritmo)
15. [Limitador de concurrencia en operaciones de cascada](#15-limitador-de-concurrencia-en-operaciones-de-cascada)
16. [Export a Excel, paginacion y mantenedor de traslados](#16-export-a-excel-paginacion-y-mantenedor-de-traslados)

---

## 1. Vision general

| Aspecto | Detalle |
|---------|--------|
| Nombre en sidebar | **Academic Scheduling** |
| Repo/carpeta | `mods/academic-scheduling/` (repo git propio) |
| Dominio | Agendamiento academico: secciones, docentes, salas, escenarios de asignacion |
| Roles con acceso | Admin, Coordinador, Consultor |
| Tenants | TEST, UPU, DEMO02 |
| Objetos propios | 27 (21 mas 6 agregados por UPONE-1523: `ScenarioTerm`, `SectionCluster`, `SectionResourceType`, `TransferTime`, `OrgUnitRestriction`, `BuildingCareer`; ver seccion 13) |
| defaultObjects (app.json) | Section, Instructor, `rt__InstructorAvailability__availability`, Resource, `rt__ResourceAvailability__availability`, RuleSet, Contract, Scenario |

`config/app.json` (`mods/academic-scheduling/config/app.json:1-10`):

```json
{
  "name": "academic-scheduling",
  "label": "Academic Scheduling",
  "icon": "bi-file-earmark-code",
  "order": 10,
  "roles": ["Admin", "Coordinador", "Consultor"],
  "tenants": { "TEST": {}, "UPU": {}, "DEMO02": {} },
  "version": "1.0.0",
  "defaultObjects": ["Section", "Instructor", "rt__InstructorAvailability__availability", "Resource", "rt__ResourceAvailability__availability", "RuleSet", "Contract", "Scenario"]
}
```

**Puntos a notar:**

- `tenants` usa la forma objeto (`{ "TEST": {}, "UPU": {}, "DEMO02": {} }`) en vez del array simple que usan otros mods (ver `example-engagement.md` seccion 2, que usa `["TEST", "UPU"]`): ambos formatos son validos.
- `defaultObjects` mezcla objetos propios (`Section`, `Resource`, `RuleSet`, `Contract`, `Scenario`) con RecordTypes propios (`rt__InstructorAvailability__availability`, `rt__ResourceAvailability__availability`) y con `Instructor`, que es un objeto de **otro mod** (`uengagement-up1`).
- El mod declara `roles` explicitos a diferencia de Engagement, que deja la app visible para todos y controla el acceso a nivel de layout/capabilities.

---

## 2. Objetos de negocio

El mod define **21 objetos propios**, sin contar los objetos core que consume (`OrgUnit`, `Activity`, `Instructor`) ni los RecordTypes de disponibilidad.

```
TermType, Term, Resource, ResourceTypes, ResourceTypeAssignment, Shift, TimeBlock,
InstructorOrgUnit, Contract, ContractRestriction, RestrictionDefinition, InstructorContract,
RuleDefinition, RuleSet, RuleSetRule, Scenario, ScenarioSection, ScenarioSectionAssignment,
ScenarioJob, Section, SectionInstructor, InstructorCourseAssignment
```

Se agrupan en 4 subdominios:

- **Calendario**: `TermType`, `Term`, `Shift`, `TimeBlock`.
- **Recursos e infraestructura**: `Resource`, `ResourceTypes`, `ResourceTypeAssignment`.
- **Docentes y contratos**: `InstructorOrgUnit`, `Contract`, `ContractRestriction`, `RestrictionDefinition`, `InstructorContract`.
- **Reglas y ejecucion**: `RuleDefinition`, `RuleSet`, `RuleSetRule`, `Scenario`, `ScenarioSection`, `ScenarioSectionAssignment`, `ScenarioJob` (renombrado desde `SchedulingJob`, UPONE-1254 — ver seccion 10).
- **Cursos y secciones**: `Section`, `SectionInstructor`, `InstructorCourseAssignment`.

`Section` es el objeto central: agrupa matricula de un curso (`Activity` con `recordType=Course`, de `curriculum-design`) en un periodo (`Term`), con cupo y estado (`mods/academic-scheduling/objects/Section.json:9`). La asignacion de horario/sala/docente **no vive en `Section`**: vive por escenario en `ScenarioSectionAssignment` (ver seccion 5).

`Section.json` (`mods/academic-scheduling/objects/Section.json:12-100`) incluye `activityId` (FK -> `Activity`), `termId` (FK -> `Term`), `orgUnitId` (FK -> `OrgUnit`), `shiftId` (FK -> `Shift`), y campos operacionales: `capacity`, `numberStudents`, `weeklyModules`, `dailyModules`, `assignmentRequired` (JSON de flags por dimension). El campo `code` se autogenera server-side como `{activityCode}-{seq}` por la mutacion `createSection` (descripcion en el JSON, `objects/Section.json:17`).

---

## 3. Objetos nuevos por ticket

### UPONE-1369: Shift, TimeBlock, InstructorOrgUnit

Entre mayo y julio de 2026 se agregaron 3 objetos nuevos al mod, documentados en `mods/academic-scheduling/specs/objetos-minimos-scheduling.md`:

- **`Shift`** (`objects/Shift.json:1-22`): jornada horaria (ej. Diurno, Vespertino). Un solo campo propio: `name` (unique, required).
- **`TimeBlock`** (`objects/TimeBlock.json:1-69`): segmento horario dentro de una jornada. Campos: `name` (opcional), `dayOfWeek` (0-6, validado con rule `dayOfWeek >= 0 AND dayOfWeek <= 6`), `startTime`/`endTime` (formato HH:MM, con rule `endTime > startTime`), `sequence`, `shiftId` (FK requerida -> `Shift`). `uniqueConstraints: [["shiftId", "dayOfWeek", "sequence"]]`.
- **`InstructorOrgUnit`** (`objects/InstructorOrgUnit.json:1-34`): union N:M entre `Instructor` (de `uengagement-up1`) y `OrgUnit`, con `uniqueConstraints: [["instructorId", "orgUnitId"]]`.

**Dato relevante para no repetir un error historico:** `Shift` y `TimeBlock` **existieron antes como objetos Base/core** hand-placed solo en el tenant `UPU` (`object-manager/objects/tenants/UPU/Base/shift.json` y `timeBlock.json`). El commit "Remove legacy UPU/TEST tenant objects and dead BASEMODEL seed" (Clemente Jara, 2026-07-06) los elimino junto con ~20 objetos legacy mas. Al no existir ya en ningun lado del repo, se **recrearon como objetos propios del mod** (`mods/academic-scheduling/objects/`) en vez de restaurarlos como Base: asi el sync los propaga a todos los tenants activos (no solo `UPU`), evitando la brecha original (spec, seccion "Decision 2").

### UPONE-1334: Escenarios (Scenario -> ScenarioSection -> ScenarioSectionAssignment)

Ver detalle completo en la seccion 5.

### UPONE-1316: Contract cascade delete

Ver detalle completo en la seccion 6.

### UPONE-1317: Rule-set editor

Ver detalle completo en la seccion 7.

---

## 4. Relacion N:M Resource <-> ResourceTypes

Otro cambio de modelo documentado en la misma spec (`specs/objetos-minimos-scheduling.md`, Decision 4): `Resource.resourceType` (enum) se **elimino** y se reemplazo por una relacion N:M real, porque un recurso puede tener mas de un tipo (ej. una sala que es a la vez Aula y Sala de reuniones).

`Resource.json` (`objects/Resource.json:12-76`) hoy tiene:

- `code` (unique), `name`, `capacity`, `status` (enum `Active`/`Inactive`), `orgUnitId` (FK opcional -> `OrgUnit`).
- 3 booleans nuevos: `isVirtual`, `hasAccessibility` (dos "s"; un typo del diagrama original se corrigio con el usuario, ver spec), `canBeAssigned` (`default: true`, indica si el algoritmo puede asignar el recurso).
- **Ya no tiene** `resourceType`.

`ResourceTypeAssignment.json` (`objects/ResourceTypeAssignment.json:1-35`) modela la N:M: `resourceId` (FK con `onDelete: Cascade`) + `resourceTypeId` (FK -> `ResourceTypes`), con `uniqueConstraints: [["resourceId", "resourceTypeId"]]`.

**UI resultante (Decision 5 de la spec):**

- **Create/edit**: picker `multiSelectPicker` (patron PICK-05/UPONE-1161) sobre un `sourceLayout` minimo (`resourcetypes-picker.json`), con `onConfirm.bulkCreate` contra `ResourceTypeAssignment`.
- **View**: lista embebida de solo lectura (`resource-resourcetypes-list.json`), filtrada por `resourceId = {{parentId}}`.
- **Lista (`resource-list.json`)**: la columna de tipos se **omite deliberadamente**. No hay soporte hoy en el core para columnas de relacion to-many en `RecordList`: existe una spec del core que propone esta capacidad (`specs/recordlist-columnas-multivalor.md`) pero su estado es "propuesta acordada", no implementada. Es un gap conocido y documentado, no un bug del mod.

**Patron a notar**: cuando el core no soporta una capacidad de UI (columnas multivalor), la opcion correcta no es un workaround fragil dentro del mod, sino documentar el gap y resolver la parte que si esta soportada (edicion N:M con picker) dejando la lista sin esa columna.

---

## 5. Escenarios: de Scenario a ScenarioSectionAssignment

UPONE-1334 agrego la cadena de objetos que modela una corrida de planificacion:

```
Scenario (draft|running|completed|failed, termId, orgUnitId, shiftId)
   |
   | 1:N (ScenarioSection, onDelete Cascade en scenarioId)
   v
ScenarioSection (scenarioId + sectionId, uniqueConstraint)
   |
   | 1:N (ScenarioSectionAssignment, onDelete Cascade en scenarioSectionId)
   v
ScenarioSectionAssignment (fila atomica de asignacion)
```

- **`Scenario`** (`objects/Scenario.json:1-49`): `name`, `status` (enum, `draft` por defecto), `orgUnitId`, `shiftId` y `ruleSetId` (FKs), `status` documenta el ciclo: `draft` = editable y unico estado que acepta `runScenario`; `running` = algoritmo invocado; `completed`/`failed` = callback recibido. **Ya no tiene `termId` escalar**: UPONE-1523 lo retiro en favor de `ScenarioTerm` (ver seccion 13); un escenario puede cubrir varios periodos.
- **`ScenarioSection`** (`objects/ScenarioSection.json:1-35`): union N:M entre `Scenario` y `Section`, con `onDelete: Cascade` en `scenarioId` y `uniqueConstraints: [["scenarioId", "sectionId"]]`.
- **`ScenarioSectionAssignment`** (`objects/ScenarioSectionAssignment.json:1-72`): la fila atomica de asignacion. `scenarioSectionId` (FK requerida, cascade), y **3 FKs nullable** (`timeBlockId`, `resourceId`, `instructorId`), nullable porque una asignacion puede no tener bloque/sala/docente aun (ej. seccion virtual sin docente) — el runner externo tambien escribe filas con las tres en null cuando no logra asignar (ver seccion 11, UPONE-1334). `assignedBy` distingue `manual` (usuario) vs `algorithm` (runner de scheduling). `weeks` (JSON array de numeros de semana) y `failureCode` (JSON array, catalogo manejado por el algoritmo) son campos libres. `uniqueConstraints: [["scenarioSectionId", "timeBlockId", "resourceId", "instructorId"]]` (UPONE-1254, `objects/ScenarioSectionAssignment.json:10`) evita filas duplicadas para la misma combinacion de dimensiones dentro de una seccion de escenario.

**Patron de modelo**: una seccion puede tener varias filas de `ScenarioSectionAssignment` (dias/salas/docentes distintos, co-docencia via filas separadas): no se modela como una fila unica con arrays de FKs, sino como multiples filas atomicas.

**Resolver custom**: `createScenarioWithSections` (`mods/academic-scheduling/logic/scenario-create.resolver.js:24`) crea el `Scenario` junto con sus `ScenarioSection` en una sola mutacion, en vez de requerir N llamadas separadas desde el front.

**Componentes Vue del flujo de escenarios** (`modsComponents/`): `ScenarioDetailPanel/ScenarioDetailPanelElement.vue` y `ScenarioSectionSelector/ScenarioSectionSelectorElement.vue` (+ `useScenarioSectionSelector.ts`).

---

## 6. Contratos: cascade delete y limite de UI

UPONE-1316 endurecio el borrado en cascada de la cadena de contratos:

- **`InstructorContract`** (`objects/InstructorContract.json:1-35`): union N:M entre `Instructor` y `Contract`. `contractId` tiene `onDelete: Cascade` (`objects/InstructorContract.json:29`): al borrar un `Contract`, se borran sus asignaciones a docentes. `uniqueConstraints: [["instructorId", "contractId"]]`: un docente no puede tener el mismo contrato repetido, pero **si puede tener varios contratos distintos** a nivel de modelo.
- **`ContractRestriction`** (`objects/ContractRestriction.json:1-42`): join entre `Contract` y `RestrictionDefinition` que carga un `value` (entero, minimo 0) por-contrato. `contractId` tambien tiene `onDelete: Cascade` (`objects/ContractRestriction.json:21`). `uniqueConstraints: [["contractId", "restrictionDefinitionId"]]` evita repetir la misma restriccion dentro de un contrato.

**Contraste modelo vs UI**: aunque el modelo permite N contratos por docente, el componente `ContractAssignmentElement.vue` + `useContractAssignment.ts` (`modsComponents/ContractAssignment/`) impone **un limite de un contrato por instructor a nivel de UI** via una prop `maxContracts`. Es una restriccion de producto encima de un modelo mas flexible, no una limitacion del schema: util distinguir "que permite la base de datos" de "que permite la interfaz" al leer este mod.

---

## 7. Rule-set editor

UPONE-1317 elimino `RuleCategory` y reestructuro el catalogo de reglas:

- **`RuleDefinition`** (`objects/RuleDefinition.json:1-46`): catalogo cerrado, solo precargado via seed. `key` en `CONSTANT_CASE` (ingles) funciona como clave i18n (no hay campo `label` separado). El campo nuevo **`allowedValues`** (array de `{value, label}`, default `[]`) define el dominio del `value`: vacio = input libre (cualquier entero), con miembros = selector restringido a esos valores. `defaultValue` es el valor usado al materializar la regla en un conjunto.
- **`RuleSet`** (`objects/RuleSet.json:1-24`): conjunto administrable por CRUD (`name`, `description`).
- **`RuleSetRule`** (`objects/RuleSetRule.json:1-40`): join entre `RuleSet` y `RuleDefinition` con `value` (string) por-conjunto. `uniqueConstraints: [["ruleSetId", "ruleDefinitionId"]]`.

**Resolver custom `createRuleSet`** (`mods/academic-scheduling/logic/createRuleSet.resolver.js:26-62`): crea el `RuleSet` y, en la misma transaccion, materializa **todas** las `RuleDefinition` del catalogo como filas `RuleSetRule` con `value = defaultValue`. Consecuencia de modelo documentada en el archivo (linea 10-12): un `RuleSet` **siempre** contiene las N reglas del catalogo completo; el planificador no agrega ni quita reglas, solo edita valores. Si se agrega una `RuleDefinition` nueva en el futuro, los `RuleSet` existentes **no se rellenan automaticamente** (backfill pendiente, nota en el archivo linea 14-15).

**Componente `RuleSetEditorElement.vue`** (`modsComponents/RuleSetEditor/`, + `useRuleSetEditor.ts`): grid que renderiza un `Select` (si `allowedValues` tiene miembros) o `Input` (si esta vacio) por regla, con busqueda y paginacion, montado en los layouts `ruleset_edit`/`ruleset_view`. Segun `docs/reference/entities.md:351`, la edicion es en memoria (dirty por fila) con un boton "Guardar" que valida (entero parseable si `allowedValues` vacio; pertenencia a `allowedValues` si no) y persiste cada fila via `updateInstance('RuleSetRule', id, {value})`: CRUD generico, sin resolver custom para el update. La validacion server-side del `value` esta diferida (`docs/reference/entities.md:363`): hoy solo se valida en el componente (front).

---

## 8. Cross-mod refs

El mod sigue la regla "never create cross-mod dependencies" de dos formas distintas segun el caso:

- **`Instructor` y `OrgUnit`** son objetos de `uengagement-up1` (`mods/uengagement-up1/objects/Instructor.json`, espejado a `object-manager/objects/business/Base/instructor.json`). El mod los **consume** (layouts, RecordTypes de disponibilidad, FKs) pero **no los edita**. Cuando necesito una relacion nueva sobre `Instructor` (`orgUnitId`, ver `specs/objetos-minimos-scheduling.md` Decision 1), la solucion **no fue** agregar el campo directo al objeto ajeno: fue crear `InstructorOrgUnit` como tabla de union propia dentro de `academic-scheduling`. Cualquier cambio de campo sobre `Instructor` en si va como REQUEST EXTENSION a `uengagement-up1`, no como edicion directa.
- **`Activity`** (con `recordType = Course`) es de `curriculum-design`. Se consume via FK simple: `Section.activityId` y `InstructorCourseAssignment.activityId` apuntan a `Activity`, sin necesidad de tabla de union porque la relacion es 1:N (una seccion pertenece a un curso).

**Patron a notar**: la forma de la solucion cross-mod depende de la cardinalidad. N:M sobre un objeto ajeno -> tabla de union propia en el mod consumidor. N:1 -> FK simple directa al objeto ajeno.

---

## 9. Docs internos del mod

- **`docs/reference/entities.md`**: documento de referencia de entidades. **Drift confirmado al 2026-08-17**: documenta `InstructorContract` (`docs/reference/entities.md:463-487`) pero no cubre los 6 objetos nuevos de UPONE-1523 (`ScenarioTerm`, `SectionCluster`, `SectionResourceType`, `TransferTime`, `OrgUnitRestriction`, `BuildingCareer`) ni el RecordType `rt__SectionAvailability__availability` (UPONE-1521). El propio doc se declara subordinado al codigo: "si una tabla/campo no coincide, manda el JSON" (`docs/reference/entities.md:9`); esta actualizacion evergreen registra el gap en vez de repetirlo.
- **`docs/architecture/run-scenario.md`**: spec de arquitectura de la conexion a la Lambda de scheduling (UPONE-1228). Marcada como historica pero con un banner de estado actualizado (`updated: '2026-06-10'`) que documenta los deltas entre el diseño original y la implementacion real (endpoint de callback, nombre del secret, etc.).
- **`specs/objetos-minimos-scheduling.md`** (spec activa, `status: wip`, ticket UPONE-1369): la fuente mas completa y actualizada de las decisiones de modelo de julio 2026 (gap analysis contra un diagrama ER acordado,, 5 decisiones documentadas con alternativas descartadas, y bitacora de implementacion con verificacion contra BD real).

**Regla operativa del mod** (declarada en la spec, seccion "Metodo"): verificar siempre el JSON real en `objects/`, nunca el `CLAUDE.md`/snapshot del mod ni un doc con fecha vieja: la fuente de verdad es el codigo.

---

## 10. Estado del algoritmo: motor externo via SNS

El runner de scheduling ya **no se invoca como Lambda directa**: UPONE-1254 migro la conexion a un topico SNS compartido. Verificado en `logic/runScenario.resolver.js` y `object-manager/src/helpers/snsHelper/`, `object-manager/src/helpers/algorithmCallback/`:

- **`SchedulingJob` renombrado a `ScenarioJob`** (commit `0c64948`): mismo rol (rastrear una invocacion al runner), objeto en `objects/ScenarioJob.json`. Estados: `pending` (creado, sin invocar) -> `running` (runner invocado) -> `completed`/`failed` (callback recibido).
- **`TopicRunner` con topico fijo `"up1"`**: `runScenario.resolver.js:123` instancia `new TopicRunner('up1')` — el topico SNS es compartido entre tenants, no se resuelve por `tenantId` (commit `b3ee95f`).
- **Payload renombrado**: el mensaje que se publica a SNS usa `scenarioJobId` (antes `jobId`) junto a `scenarioId`, `tenantId`, `label`, `callbackUrl`, `token`, `exp` (`runScenario.resolver.js:135-142`, commit `43a7d89`).
- **Callback `/complete` -> `/end`**: la URL de callback que el runner externo llama al terminar es `${publicUrl()}/api/jobs/${jobType}/${jobId}/end` (`object-manager/src/helpers/algorithmCallback/callbackToken.js:20`, commit `2587fe1`).
- **`cancelScenario` (mutation nueva)**: revierte un `Scenario` en `running` a `draft` y su `ScenarioJob` mas reciente en `running` a `pending` (`runScenario.resolver.js`, funcion `cancelScenario`); publica el mismo refresh en tiempo real que `runScenario`. Solo valido si el escenario esta `running`; si no hay `ScenarioJob` en `running` para ese escenario, lanza `NOT_FOUND`.
- **Re-run desde `failed`**: `runScenario` acepta arrancar desde `draft`, `completed` o `failed` (antes solo `draft`); el enum `Scenario.status` documenta esto en su descripcion (`objects/Scenario.json:33`).
- **Handler de callback registrado a nivel de modulo**: `_algorithmCallback.register('scenarioJob', ...)` corre una vez al cargar el resolver; ante `completed`/`failed` actualiza `ScenarioJob` y refleja el mismo `status` en `Scenario`.

Segun `docs/architecture/run-scenario.md` (renombrado desde `conexion-lambda.md`, ver `docs/architecture/conexion-motor-externo.md`) y `specs/objetos-minimos-scheduling.md:18-21`, el alcance funcional del algoritmo sigue en dos fases:

- **Phase 1** (implementada): dispara el algoritmo `scheduling-noop` via SNS, recibe el callback de estado, pero **no ingesta resultados** ni crea asignaciones por si mismo.
- **Phase 2+** (pendiente): consumo real de la cadena `Scenario -> Secciones -> Asignaciones` con bloque horario, sala y docente. Es lo que motivo la spec de "objetos minimos" de UPONE-1369: sin `Shift`/`TimeBlock`/la N:M de `ResourceTypeAssignment`/los booleans de `Resource`, el modelo no tenia las entidades necesarias para que el algoritmo real pudiera escribir sus resultados.

La migracion a SNS cambia el transporte y el ciclo de vida del job (rename, topico compartido, cancel, re-run, constraint de unicidad), no el alcance funcional del algoritmo: Phase 2+ sigue pendiente.

---

## 11. Regla canonica "seccion asignada" (isAssigned)

UPONE-1334 (fix de causa raiz, julio 2026) corrigio como se cuenta una seccion como "asignada" en el resumen del escenario. Verificado en `logic/schedule/summaryAggregates.js:21-33`:

- **El bug**: la regla v1 contaba "existe al menos una fila de `ScenarioSectionAssignment`" como seccion asignada. Como `ScenarioSectionAssignment` permite las tres FK (`instructorId`, `resourceId`, `timeBlockId`) en null — y el runner externo efectivamente escribe una fila asi cuando no logra asignar nada, dejando el motivo en `failureCode` — un escenario donde el algoritmo no asigno nada se mostraba **100% completo** (todas las secciones "asignadas" sin instructor, sala ni bloque).
- **La regla vigente**, funcion `isAssigned(f)`: `Boolean(f && (f.instr || f.room || f.block))` — una fila cuenta como asignada solo si **al menos una dimension** (docente, sala o bloque horario) esta presente. Se deriva de las mismas banderas por dimension que alimentan el calculo de brechas ("que falta asignar"), asi que "Asignadas" y "Que falta asignar" no pueden contradecirse entre si.
- **Consumidores**: el agregado de resumen del escenario (`docs/features/scenario-summary-tab.md`) y su equivalente Prisma-side (`scenarioSectionIdsByAssignment`, misma regla expresada como filtro de query) para no traer filas completas solo para contarlas.

**Patron a notar**: para cualquier objeto con FKs nullable que representan "dimensiones" de una asignacion (aqui: docente/sala/bloque), "existe la fila" y "esta asignada" son preguntas distintas — verificar cual de las dos responde cada metrica antes de confiar en un conteo.

---

## 12. Features de UI del escenario

Entre UPONE-1398 y UPONE-1480 se agregaron cuatro features de UI sobre el detalle de escenario, todas ya documentadas como spec propia del mod en `docs/features/` (este doc solo resume y referencia, no duplica):

- **Asignacion manual de bloque horario** (UPONE-1398, Fase 1) — `docs/features/manual-timeblock-assignment.md`. Nueva query `timeBlocksForSection` y mutaciones `setSectionTimeBlocksManually` / `unassignTimeBlocks` (`logic/assign-timeblock.resolver.js`, capability `mod/academic-scheduling:assign_timeblock` en `capabilities.json`). El panel es dueno de la dimension bloque: el footer envia el conjunto completo de `timeBlockId` deseado y la mutacion reconcilia contra el (agrega/quita), sin tocar `weeks`. **Reconciliacion tri-dimensional**: una fila de `ScenarioSectionAssignment` se borra solo si queda vacia en las **tres** dimensiones (docente, sala y bloque) a la vez; si al quitar el bloque la fila todavia carga instructor y/o sala, esas dimensiones se preservan anulando solo `timeBlockId` (`logic/assign-timeblock.resolver.js`, comentarios de reconciliacion por dimension bloque). Las excepciones por semana quedan para Fase 2.
- **Resumen de escenario con heatmap** (UPONE-1404) — `docs/features/scenario-summary-tab.md`. Pestana Resumen con dos sub-vistas: Indicadores (progreso de asignacion, carga por instructor, cobertura por curso, brechas y conflictos) y Mapa de calor (ocupacion por bloque horario). Resolvers nuevos `logic/scenario-summary.resolver.js` y `logic/scenario-occupancy.resolver.js`. Consume la regla `isAssigned` de la seccion 11.
- **Tab de calendario con filtros combinables** (UPONE-1447) — `docs/features/scenario-calendar-tab.md`. Grilla dia x modulo de la planificacion del escenario con filtros por instructor, sala, carrera-plan-nivel y seccion (combinables con OR dentro de un filtro, AND entre filtros). Resolver nuevo `logic/scenario-calendar.resolver.js` + helper `logic/schedule/calendarAggregates.js`; componente `FilterBar` nuevo.
- **Exportar calendario a PDF** (UPONE-1480) — `docs/features/scenario-calendar-pdf-export.md`. Exporta el calendario tal como esta filtrado (sin exigir filtro previo); si bajo el filtro actual algun bloque queda con mas de una seccion visible, avisa sin bloquear. Server-side con `pdfmake` via `logic/scenario-calendar-pdf.resolver.js` + `logic/schedule/calendarPdf.js`.

---

## 13. UPONE-1523: Scenario multi-periodo y objetos de dominio nuevos

Ver [DECISION-030](../../decisions/DECISION-030-scenario-term-many-to-many.md). Un `Scenario` cubria un unico `Term` (`termId` escalar). La necesidad real es que un escenario planifique varios periodos a la vez, asi que el escalar se retiro y se reemplazo por `ScenarioTerm` (N:M, `objects/ScenarioTerm.json`), con `uniqueConstraints: [["scenarioId", "termId"]]`. El front usa un selector propio, **`TermMultiSelect`** (`modsComponents/TermMultiSelect/`), porque el mecanismo generico de opciones FK de RecordDetail no puede ser a la vez campo virtual (no-FK) y multi-select en el mismo control.

Auditoria de reemplazo (todo lo que dependia del escalar se migro en los mismos commits): seeds (`2a9c2b4`) y frontend/resolvers de creacion de escenario (`b5d637c`). El merge de sync es append-only (nunca remueve campos que un mod deja de declarar), asi que retirar `termId` del lado sincronizado a `object-manager` requirio borrar manualmente el `objects/business/Base/scenario.json` fusionado una vez, para que `sync:files` lo regenerara limpio desde la fuente actual del mod.

La misma ventana agrego objetos nuevos de dominio, verificados contra sus JSON reales:

- **`SectionCluster`** (`objects/SectionCluster.json`): agrupa las secciones de una misma modalidad+periodo para validar que exista una seccion por pieza instructiva de un combo, y da un id unico para `Offering`. `uniqueConstraints: [["modalityId", "termId", "code"]]`.
- **`SectionResourceType`** (`objects/SectionResourceType.json`): N:M entre `Section` y `ResourceTypes` que declara los tipos de uso de recurso que admite una seccion (ej. Aula o Laboratorio). Mismo patron que `ResourceTypeAssignment`, aplicado del lado de la demanda. `uniqueConstraints: [["sectionId", "resourceTypeId"]]`, `sectionId` con `onDelete: Cascade`.
- **`TransferTime`** (`objects/TransferTime.json`): tiempo de traslado en minutos entre dos unidades organizacionales (`orgUnitFromId`/`orgUnitToId`), insumo del algoritmo. `uniqueConstraints: [["orgUnitFromId", "orgUnitToId"]]`. Mantenedor propio agregado despues por UPONE-1524 (ver seccion 16).
- **`OrgUnitRestriction`** (`objects/OrgUnitRestriction.json`): restringe una combinacion de unidad organizacional, programa academico y actividad (curso). `uniqueConstraints: [["orgUnitId", "academicProgramId", "activityId"]]`.
- **`BuildingCareer`** (`objects/BuildingCareer.json`): N:M entre un edificio (`OrgUnit` con `type="Building"`) y un programa academico que se dicta en el. `uniqueConstraints: [["orgUnitId", "academicProgramId"]]`.
- **`InstructorContract`**: ya existia desde UPONE-1316 (seccion 6); no es un objeto nuevo de esta ventana, pero es el unico de los siete listados en el request original que `docs/reference/entities.md` si documenta.

UPONE-1521 agrego ademas el RecordType **`rt__SectionAvailability__availability`** (`objects/RecordTypes/rt__SectionAvailability__availability.json`): disponibilidad declarada de una `Section`, mismo patron de RT de disponibilidad que ya existia para `Instructor` y `Resource`.

## 14. RuleSet obligatorio y parametrizacion del algoritmo

UPONE-1527 dejo de hardcodear los parametros del algoritmo de asignacion: pasaron a vivir en el catalogo `RuleDefinition` (seccion 7), editable por escenario desde el `RuleSetEditor`. UPONE-1606 (commits `b612e1b`, `f94b5d5`) endurecio esa relacion: `ruleSetId` en `Scenario` paso de opcional a **obligatorio**. Verificado en `logic/scenario-create.resolver.js:12-17,57-58`: el resolver de creacion rechaza explicitamente `ruleSetId` vacio como "red de seguridad" (el `required` del front es la primera barrera, esto cubre llamadas directas a la API); el comentario del propio archivo aclara que `orgUnitId`/`ruleSetId` siguen siendo `not_null: false` a nivel de schema (`Scenario.json`) porque los seeds de datos de prueba los setean por separado (`seed/_orgUnit.js`, `seed/populate-rulesets.js`), pero la mutacion de creacion real los exige. La misma ventana agrego la vista y edicion del rule set directamente desde el detalle del escenario.

## 15. Limitador de concurrencia en operaciones de cascada

Ver [RULE-mods-068](../../rules/mods/RULE-mods-068.md). UPONE-1614 y UPONE-1595 corrigen la misma clase de bug: una operacion en cascada que abre una consulta a Prisma por elemento de una coleccion (recalculo de conflictos, ranking de instructores/recursos) sin acotar la concurrencia satura el pool de conexiones del tenant.

Contexto de peso: el fix de UPONE-1614 responde a un **incidente real de produccion en el cliente Continental el 2026-08-13**, con ReadTimeouts de 30 segundos por saturacion del pool durante el recalculo de conflictos de seccion. El propio comentario del codigo se autoclasifica como "misma clase de bug que UPONE-1595" (el ranking de instructores por-uno tuvo el mismo patron antes, en la misma ventana).

Implementacion verificada en `logic/schedule/conflictDetail.js`: `mapWithConcurrency` (linea 63) es un `map` asincrono que preserva el orden de resultados y admite a lo sumo `limit` invocaciones en vuelo; `RECOMPUTE_CONCURRENCY = 6` (linea 53). El tope cuenta invocaciones de la funcion, no consultas: cada recalculo mantiene 2-3 consultas en vuelo por sus `Promise.all` internos, asi que el maximo efectivo ronda 18 consultas concurrentes, bajo el limite de 20 conexiones por pod del pool en dev/staging (comentario del codigo, mismo archivo). Se usa en el recalculo de senales de instructor, el recalculo de senales de sala, y un tercer punto de la misma funcion.

**Nota de estado**: existe una rama sin mergear a `develop` (`fix/scheduling-db-concurrency`, commit `36b06bd`) que reemplaza este mecanismo por un semaforo compartido a nivel de proceso (`dbConcurrency.js`) para coordinar la concurrencia entre escenarios simultaneos, no solo dentro de una misma llamada. Al 2026-08-17 esa rama no es el estado real de `develop`: el mecanismo vigente sigue siendo `mapWithConcurrency`/`RECOMPUTE_CONCURRENCY` descrito arriba.

## 16. Export a Excel, paginacion y mantenedor de traslados

- **Export de escenario a Excel** (UPONE-1611, `specs/exportar-secciones-escenario-excel.md`): `logic/scenario-excel.resolver.js` + `logic/schedule/scenarioExcel.js`. Tope real verificado: **`MAX_ASSIGNMENT_ROWS = 50000`** (`logic/schedule/scenarioExcel.js:24`), aplicado por pagina via `fetchAssignmentPages` (generador async) para no traer todas las filas de asignacion a memoria de una vez.
- **Paginacion server-side de secciones candidatas** (UPONE-1318, commit `e3d1800`): el selector de secciones del escenario (`ScenarioSectionSelector`) pagina en el servidor en vez de traer todo el universo de secciones candidatas de una vez.
- **Mantenedor de `TransferTime`** (UPONE-1524, `specs/mantenedor-tiempos-de-traslado.md`): CRUD dedicado para cargar los tiempos de traslado entre unidades organizacionales (objeto de la seccion 13).
- **Campos de planificacion en `Section`** (UPONE-1520): expone en el mantenedor de `Section` campos operacionales de planificacion ya existentes en el schema (capacidad, modulos), mas ajustes de tooltips y reglas `required` del formulario.
- **Fixes de heatmap** (UPONE-1404, ver [BUG-mods-024](../../bugs/mods/bug-mods-024.md)): scoping del denominador de ocupacion al subarbol de la unidad organizacional del escenario (antes mezclaba salas de toda la institucion), y normalizacion de formato de hora al comparar disponibilidad declarada (`DateTime` de Prisma vs `String "HH:MM"` de `TimeBlock`) en `logic/schedule/evalResource.js`.

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-07-16 | Documento inicial: guia de ejemplos basada en el mod academic-scheduling (UPONE-1369/1316/1317/1334) |
| 2026-08-03 | Actualizacion: migracion del motor externo Lambda -> SNS (rename ScenarioJob, topico compartido, cancelScenario, re-run desde failed, unique constraint en asignaciones — UPONE-1254); regla canonica `isAssigned` (UPONE-1334); referencias a las specs propias del mod para asignacion manual de bloque (UPONE-1398), resumen con heatmap (UPONE-1404), calendario con filtros (UPONE-1447) y export a PDF (UPONE-1480) |
| 2026-08-17 | Actualizacion: `Scenario.termId` escalar retirado en favor de `ScenarioTerm` N:M mas 5 objetos de dominio nuevos (UPONE-1523); `SectionAvailability` (UPONE-1521); `RuleSet` obligatorio en `Scenario` (UPONE-1527/1606); limitador de concurrencia `mapWithConcurrency` en operaciones de cascada, motivado por un incidente real de produccion (UPONE-1614/1595); export a Excel con tope de 50000 filas (UPONE-1611), paginacion server-side de secciones candidatas (UPONE-1318), mantenedor de `TransferTime` (UPONE-1524), campos de planificacion en `Section` (UPONE-1520), fixes de heatmap (UPONE-1404); registrado drift de `docs/reference/entities.md` (no cubre los objetos nuevos de UPONE-1523 ni `SectionAvailability`) |
