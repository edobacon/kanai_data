---
id: DOC-kb-sp8-00-registro-analisis-instructionalcomponent
project: up1
type: doc
---

# Registro de analisis: triada Curso - Modalidad - InstructionalComponent

> **Estado:** analisis cerrado, candidato a implementar en la SP siguiente.
> **Fecha:** 2026-08-05.
> **Proposito:** dejar registrado TODO el analisis (entregables, observaciones y validaciones de codigo con evidencia) para retomar la implementacion sin re-investigar.
> **Alcance del analisis:** curriculum-design (nuestro), academic-scheduling, uengagement-up1, core (object-manager + suite). Raiz mods: `uplanner/up1/mods`.

Este es el documento indice del analisis. El detalle visual esta en los otros archivos de sp8 (seccion 1).

---

## 0. TL;DR (veredicto)

- La necesidad la origino **Academic Scheduling**: `Section` toma `Activity` para planificar, pero `Activity` no tiene el detalle de dictado (horas por tipo de actividad, tipo de sala, docentes).
- El modelo **Curso - Modalidad - Componente** ya existe casi entero en UP1: `Activity[Course]` + `CurricularSection[Modality]` + jerarquia `parentId`. La brecha real es un **nivel 3** (la actividad dentro de la modalidad) con tipo de sala y numero de docentes, que hoy no existen en ningun objeto.
- La solucion acordada: **RecordType nuevo `InstructionalComponent`** colgando de la Modality via `parentId`, con `requiredResourceType` como **enum en diseno (no FK)** para que la dependencia entre mods sea unidireccional `as -> cd`.
- La propuesta v1 (del 2026-08-05) formaliza esto y amplia a la triada completa (diseno + planificacion + matricula). Es **solida en el nucleo**, pero **subestima el costo** en tres puntos verificados contra codigo: (1) volver derivados los escalares de Modality ROMPE consumidores; (2) Engagement NO queda en cero (la matricula cambia); (3) `SectionCluster` + derivacion de `Section` hacen que academic-scheduling sea un trabajo sustancial.
- **Recomendacion:** implementar por fases segun la propuesta. F1 curriculum-design (RT + catalogo aditivos, y Modality pasa a contenedor con escalares derivados: breaking). F2 academic-scheduling. F3 engagement. Dejar el rename `Section -> PlannedSection` (A1) para el final.

---

## 1. Entregables de este analisis (archivos en sp8)

| Archivo | Contenido |
|---|---|
| `00-registro-analisis-instructionalcomponent.md` | **Este documento**: registro maestro con todas las validaciones de codigo. |
| `contra-analisis-3-cambios-verificacion.html` | Verificacion de la propuesta inicial de 3 cambios contra codigo; contraste con Confluence; blast radius; diagrama del modelo. |
| `ejemplo-opcion-baja-modality-contenedor.html` | Ejemplo concreto (FIS101) de Modality como contenedor: seccion 0 (comentario AS resuelto punto por punto), datos actuales de CD, estructura de objetos, diagrama ER, vista drill-in en CD, consumo por AS, cobertura de casos, impacto por mod, blast radius. (El nombre del archivo conserva "opcion-baja" por historia; el termino ya no se usa en el contenido.) |
| `origen-curso-modalidad-actividad-conciliacion-cd.md` | El origen (comentario AS) traducido al modelo real y conciliacion a bajo costo. |
| `propuesta-3-cambios-impacto-cd.html` | Propuesta inicial (pre-existente) de 3 cambios acotados. Base del contra-analisis. |

Propuesta v1 externa (artifact) analizada en la seccion 7: "Componente de dictado (InstructionalComponent) · uP1", v1, 2026-08-05.

---

## 2. Origen (comentario de Academic Scheduling, literal)

> "Inicialmente nuestra creacion de Secciones Propuestas, que se aloja en Section, toma los registros de Activity para crear secciones. Sin embargo, ese registro no tiene toda la informacion que necesitamos para planificar. [...] encontramos algunas opciones: el objeto ActivityLine, y el objeto Modality. No es opcion crear un objeto aparte, principalmente porque volvemos a crear la brecha entre mods. Curriculum Design deberia ser quien disene, y Academic Scheduling quien lo planifique. [...] Necesitamos conocer cual sera el repositorio de los distintos modos de dictar un curso (Virtual, presencial, semi-presencial, sabatino, o la version del campus A que puede ser diferente que la del campus B), y para cada una que implica."

Ejemplos que dio (mismo curso):
- Virtual: actividades sincronas o asincronas, con horas de dedicacion semanal.
- Semipresencial: teoria online sincrona + laboratorio presencial en taller de fisica, 2h/semana.
- Presencial: teoria requiere aula 6h; practica requiere laboratorio y 2 docentes, 1h.

---

## 3. Modelo propuesto (resumen de la v1)

Triada de tres niveles:

1. **Curso** = `Activity` (`recordType = Course`). Que se aprende. Invariante.
2. **Modalidad** = `CurricularSection[Modality]`. Como se cursa. Alternativas excluyentes. Un curso tiene varias.
3. **Componente** = `CurricularSection[InstructionalComponent]` (RT nuevo). De que partes consta la modalidad. Cuelga de la Modality via `parentId`. Acumulativo.

`InstructionalComponent` (campos propios sobre CurricularSection base):

| Campo | Tipo | Proposito |
|---|---|---|
| `componentTypeId` | FK a catalogo `InstructionalComponentType` | catedra / laboratorio / taller / etc. |
| `deliveryLocation` | enum {InPerson, Online, Hybrid} | donde ocurre |
| `synchronicity` | enum {Synchronous, Asynchronous} | cuando ocurre |
| `hoursPerWeek` | number | dedicacion semanal |
| `requiredResourceType` | enum (no FK) | tipo de sala requerido |
| `requiredInstructorCount` | number | docentes requeridos |
| `plannedGroupSize` | number | cupo objetivo |
| `isPrimary` | boolean | ancla la calificacion final |
| `requiresOwnSection` | boolean | si genera seccion propia |

- **Catalogo `InstructionalComponentType`** (objeto nuevo): Catedra, Practica, Laboratorio, Taller, Seminario, Ayudantia, Clinica, Terreno. Abierto (no enum), "el vocabulario varia por pais".
- **Modality** se vuelve contenedor: `theoryHours/practiceHours/labHours` derivados; `deliveryMode` reemplazado por dos derivados (ubicacion + sincronia); `autonomousHours` se mantiene; `code/name/isDefault` sin cambios.
- **academic-scheduling:** `Section.instructionalComponentId` (FK cross-mod), nuevo objeto `SectionCluster` + `Section.sectionClusterId`, `capacity/weeklyModules` derivados, `code` incorpora el componente (ej. `FIS101-LAB3`). Formula: `secciones = techo(demanda / plannedGroupSize)`.
- **Reglas:** R1 (la modalidad cambia el como, no el que: mismos RA/creditos/evaluacion), R2 (agnostico de campus: enum de tipo de sala, no sala fisica), R3 (la nota es del curso: se ancla al componente `isPrimary`).
- **Propuestas adicionales (menor prioridad):** A1 renombrar `Section -> PlannedSection`; A2 trazabilidad planificacion->oferta (FK nullable, volcado 1:N); A3 conversion de horario planificado a eventos fechados; A4 sincronizar la representacion de modalidad en sus 3 ubicaciones (RecordType Modality, `Offering.generalModality`, `Event`).

---

## 4. Validaciones de codigo (evidencia con archivo:linea)

Todo lo siguiente se leyo del working tree real, no de la documentacion.

### 4.1 Objetos base de curriculum-design

- **Activity** (`mods/curriculum-design/objects/activity.json`): `recordType` enum `["Course","Service"]` (:73), `required: [name, code, recordType, version]` (:173). `name` y `code` con `transformations: [{trim}]` (:56-67). `status` es enum con maquina de estados (`transitions`, :141-150); el workflow relacional (`currentStatusId/workflowId`) fue retirado. `executionUnitId` FK -> OrgUnit. `polymorphicChildren`: `sections -> CurricularSection` via `ownerType/ownerId`, `recursiveBy: parentId` (:12-19).
- **CurricularSection** (`.../objects/CurricularSection.json`): `recordType` es **string libre, sin enum** (:44-48). `required: [ownerType, ownerId, recordType, name]` (:110). `ownerType` enum `[Activity, Offering, Curriculum]` (:35). `parentId` self-FK -> CurricularSection (:73-81). `directChildren: children` por `parentId` (:15-22). `name` con `trim`, unico por `[ownerId, recordType]` (:62-65). `sectionType` enum `[STRUCTURAL, COMPLEMENTARY]` (:54).
- **rt__Modality__curricularsection** (`.../objects/RecordTypes/rt__Modality__curricularsection.json`): campos `code`, `theoryHours` (:18), `practiceHours` (:24), `labHours` (:30), `autonomousHours` (:36), `isDefault` (:42), `deliveryMode` enum `[InPerson, Virtual, Hybrid, Synchronous, Asynchronous]` (:49-53). **Ninguno es required. No hay ningun campo de tipo de sala.**
- **RecordTypes de CurricularSection existentes (8 archivos):** Bibliography, Content, CustomSection, EvaluationComponent, GraduationProfile, LearningOutcome, Modality, Session.
- **CurricularLink** (`.../objects/CurricularLink.json`): `linkType` enum `[DEVELOPS, EVALUATES, COVERS, USES, CUSTOM]` (:35-41); FKs `sourceSectionId`/`targetSectionId` -> CurricularSection (mismo owner). Metadata (:9): en SP2 **declarado y validado, pero NO populado en seed ni expuesto en UI**.

### 4.2 Codegen y sync (core)

- **Nullability la define `required`, no `not_null`** (objetos de negocio base): `generatePrismaSchema.js:422` -> `isOptional = !required.includes(fieldName)`. `not_null` si se lee en el path Extended (:630) y otros, pero no en el base. Documentado UPONE-1465.
- **Un RecordType se materializa como tabla 1:1** `rt__<Rt>__<baseLower>`: `generateRecordTypeModel()` (`generatePrismaSchema.js:743-812`), con `<baseLower>Id` como PK/FK. Agregar un RT es aditivo (CREATE TABLE), se aplica por tenant con `db push`.
- **FK cross-mod resuelve, con precedente en produccion:** `Section.activityId -> Activity` ya es cross-mod (Section en academic-scheduling, Activity en curriculum-design). El path base (`generatePrismaSchema.js:428-470`) resuelve el modelo referenciado contra `allObjectTypes`. Requiere que ambos objetos esten en el schema del tenant (lo estan).
- **Merge last-mod-wins:** `fileSync.js:506` ordena fuentes por `localeCompare(modName)`; `applyModToObject` (:781-790) sobrescribe campos preexistentes que difieren. `curriculum-design < uengagement-up1`, asi que engagement gana.
- **Objetos co-propiedad (definidos por 2 mods):** exactamente `Activity`, `Offering`, `ProgramEnrollment`, los tres entre curriculum-design y uengagement-up1. Es el riesgo estructural (el `trim` de Activity se pierde en el merge por esto).
- **Derivacion de campos (patron existente):** `helpers/effectiveCredits.js` deriva creditos por enriquecimiento de lectura, sin segunda fuente de verdad. Es el patron que la v1 quiere usar para las horas de Modality.

### 4.3 Layouts / i18n / RBAC / tests

- **La ficha de Activity es un RecordDetail tabulado** (`config/layouts/default_Activity_view.json`): una pestana por recordType, cada una con **un** `record-list` embebido filtrado por `ownerId = {{parentId}}` + `recordType` (ej. `modalitiesList`, :177-200). La pestana Evaluacion usa `composite-section-tree`, que es un **componente custom** de CD (`modsComponents/CompositeSectionTree/`), no un panel stock.
- **Drill-in nivel 3:** la ficha de la Modality (`default_rt__Modality__curricularsection_view.json`) puede embeber un `record-list` de sus hijos filtrado por `parentId = {{parentId}}`. Mismo mecanismo, solo cambia el campo de filtro. Configuracion pura, sin componentes nuevos.
- **i18n:** la cascada matchea el namespace por nombre; el archivo de un RT debe llamarse con el RT completo (`rt__<Rt>__curricularsection.i18n.json`). `i18nBridge.ts buildLevels` (:76-98) solo capitaliza el primer caracter. Leccion: el nuevo debe ser `rt__InstructionalComponent__curricularsection.i18n.json`.
- **RBAC a nivel objeto:** `capabilities.json` define `curricularsection:view/modify/audit`, que aplican a todos los subtipos. Un RT nuevo hereda; no requiere capability nueva.
- **Test que rompe:** `tests/integration/recordtypes-declared.test.ts:59-68` asserta el set exacto de RT files; agregar `InstructionalComponent` obliga a actualizarlo.

### 4.4 Academic-scheduling (Section)

- **Section** (`mods/academic-scheduling/objects/Section.json`): `capacity` (:26-31), `numberStudents` (:32-37), `weeklyModules` (:88-93) son enteros **digitados** (no derivados hoy). `uniqueConstraints: [["activityId","termId","code"]]` (:10). FKs: `activityId -> Activity`, `termId -> Term`, `orgUnitId -> OrgUnit`, `shiftId -> Shift`.
- **code hoy = `{activityCode}-{seq}`** (`section-create.resolver.js:70`), con `nextSeq()` (:31-43). El resolver usa **lista blanca** de campos: `{code, name, capacity, numberStudents, status, activityId, termId}` (:92-101) y args explicitos en `section-create.schema.graphql` (:10-17). Agregar `instructionalComponentId`/`requiredResourceTypeId` exige tocar schema + resolver + `data{}`. El code NO incluye componente hoy.
- **FKs entrantes a Section:** `ScenarioSection.sectionId` (:29), `SectionInstructor.sectionId` (:19). Consumidores: 6 layouts, resolvers (`section-create`, `scheduling-inputs`, scenario), 4 seeds, ~19 tests, 3 i18n, componentes (ScenarioSectionSelector, ScenarioDetailPanel). **El rename A1 toca ~40+ puntos (mod + espejo en core).**

### 4.5 Engagement (matricula)

- **Matricula hoy es 1 estudiante : 1 Offering.** `OfferingEnrollment` (`mods/uengagement-up1/objects/OfferingEnrollment.json`): `uniqueConstraints [["offeringId","studentId"]]` (:11-16). Resolver `enroll-current-student.resolver.js` (mutacion `enrollCurrentStudent`, :78-124), idempotente por el unique. `Offering.maxCapacity/usedCapacity` (:48-60, "actualizado por flujos"). Flows `flow-01..04-enrollment-*`.
- Pasar a "una seccion por componente dentro de un cluster" + volcado 1:N tocaria: el unique de OfferingEnrollment, `enrollCurrentStudent`, `offering-create`, los 4 flows y `usedCapacity/maxCapacity`. **Engagement NO queda en cero.**

### 4.6 Objetos nuevos de la v1: no existen hoy

- `InstructionalComponentType` (catalogo) y `SectionCluster`: cero coincidencias en todos los mods y core. Correcto que sean nuevos.

### 4.7 Confluence vs codigo (la doc no es fuente confiable)

Verificado: la doc difiere del codigo en **4 de 6 puntos**.
- Activity RTs: doc Engagement dice `Service/Course/Extension/Degree`; codigo tiene solo `{Course, Service}`. **DIFIERE.**
- CurricularSection RTs: doc dice 12 cerrados; codigo tiene `recordType` string libre y 8 RT files. **DIFIERE.**
- Modality `deliveryMode`: doc dice `Presencial/Online/Hybrid`; codigo `[InPerson, Virtual, Hybrid, Synchronous, Asynchronous]`. **DIFIERE** (enum). Campos de horas: existen (CONCUERDA). Tipo de sala: no existe en ningun lado.
- Offering: doc dice "el silabo no existe aun"; codigo ya tiene `recordType [ServiceOffer, Syllabus]` + `activityLineId` + `activityId`. **DESACTUALIZADO.**
- programEnrollment/planEnrollment (durable vs temporal): **CONCUERDA** con el codigo.
- Casing RT Servicio: codigo ejecutable usa `rt__Service__Activity` (mayuscula); la doc documenta minuscula. **DIFIERE.**

### 4.8 Precedente Jira

- **UPONE-1283 "Reduccion del modelo de objetos" (Finalizada):** "Existia una doble definicion del org spine que colisionaba entre Engagement y curriculum-design [...] Engagement establecido como spine canonico [...] modelo unificado, sin colision". Genera tension con "los campos del curso van en Activity de CD": hay que decidir la propiedad de `Activity`.

---

## 5. Observaciones clave

1. **La vista de CD ya es el patron actual.** No hay que inventar la vista: la ficha de Activity ya lista cada recordType en su pestana (RecordList nativo con `{{parentId}}`). El nivel 3 se ve con drill-in (abrir una Modality -> RecordList de sus componentes). Config pura. El "todo en una vista anidada" requiere el componente custom `CompositeSectionTree` (hoy de un solo nivel) = desarrollo.
2. **Correccion de costo 1: volver derivados los escalares de Modality NO es aditivo, rompe consumidores.** `theoryHours/practiceHours/labHours/deliveryMode` hoy son **digitados** y los usan los layouts create/edit/view de Modality, los de Offering-syllabus (:105-107 / :83-85), los de Activity (:186-188 / :122-124), `resolveFieldKind.ts` (:24-26), los seeds (`_data-syllabus-sections.js:10-20`), el i18n y los tests de `polymorphicUpdate`. Convertirlos en derivados es migracion + reescritura de paths de escritura + tests.
3. **Correccion de costo 2: Engagement no queda en cero.** La matricula 1:1 cambia (ver 4.5).
4. **Correccion de costo 3: academic-scheduling crece.** `SectionCluster` (objeto nuevo) + derivacion de `capacity/weeklyModules` + `code` con componente + invariantes de matricula. No son "2 campos".
5. **`requiredResourceType` debe ser enum en diseno, no FK a `ResourceTypes`** (que vive en academic-scheduling). Asi la dependencia es unidireccional `as -> cd` y no un ciclo. Es la decision que mas abarata y protege la frontera entre mods.
6. **CurricularLink `EVALUATES` existe pero no esta cableado** (SP2 declarado, sin seed/UI); ademas vincula CurricularSections del mismo documento, no el Section de academic-scheduling. "No requiere cambios" para evaluacion es optimista.
7. **Riesgo estructural persistente:** co-propiedad de `Activity/Offering/ProgramEnrollment` + merge last-mod-wins. Cualquier cambio a un campo compartido se pisa. El acople nuevo `Section.instructionalComponentId -> CurricularSection` es cross-mod (con precedente en `Section.activityId`).
8. **Naming acordado:** RecordType `InstructionalComponent`; FK en Section `instructionalComponentId` (camelCase). Se descarto `Component` a secas por colision conceptual con `EvaluationComponent`. `InstructionalComponent` sigue la convencion PascalCase multi-palabra existente.

---

## 6. Blast radius consolidado (solucion InstructionalComponent)

| Item | Veredicto | Nota |
|---|---|---|
| RT nuevo `InstructionalComponent` (codegen/sync) | ADITIVO | tabla 1:1, db push por tenant, no destructivo |
| Switching por recordType | SOLO LECTURA | validadores guardados por `objectType`, no-op fuera de scope |
| Vista en CD (drill-in) | AJUSTE (solo JSON) | `record-list` embebido con `parentId={{parentId}}` |
| i18n del RT | AJUSTE | `rt__InstructionalComponent__curricularsection.i18n.json` |
| RBAC | SOLO LECTURA | nivel objeto, hereda |
| Test `recordtypes-declared` | ROMPE | agregar el RT al set esperado |
| Catalogo `InstructionalComponentType` | ADITIVO | objeto nuevo + seeds + RBAC |
| `Section.instructionalComponentId` + `requiredResourceTypeId` | AJUSTE (cross-mod) | whitelist + schema + resolver; precedente `Section.activityId` |
| **Modality: escalares a derivados** (segun propuesta) | **ROMPE** | breaking; hoy son digitados en layouts create/edit + seeds + tests polymorphicUpdate (obs. 2) |
| `SectionCluster` + derivacion de Section | AJUSTE grande | objeto nuevo + resolver + code |
| Matricula por componente/cluster (v1) | AJUSTE grande | unique OfferingEnrollment + resolver + 4 flows |
| Rename `Section -> PlannedSection` (A1) | ROMPE (transversal) | ~40+ puntos, mod + core |

---

## 7. Contraste: version minima (nuestra) vs propuesta v1

| Dimension | Version minima (sp8 ejemplo) | Propuesta v1 |
|---|---|---|
| Nivel 3 | `InstructionalComponent` con `componentType` **enum** | `componentTypeId` **FK a catalogo** `InstructionalComponentType` |
| Entrega | un `deliveryType` enum | **dos** campos: `deliveryLocation` + `synchronicity` (mejor: permite "online sincrono") |
| Modality | (borrador inicial) mantenia los escalares | **el plan:** escalares a derivados |
| academic-scheduling | `instructionalComponentId` + `requiredResourceTypeId` | + `SectionCluster` + derivacion de capacity/weeklyModules + code con componente |
| engagement | sin cambios | matricula por componente/cluster, volcado 1:N |
| Extras | - | R1/R2/R3, A1-A4 |

La v1 es el plan a implementar. El borrador inicial (version minima) queda solo como referencia de la parte CD-first; el plan incorpora la remocion de escalares de Modality y las piezas de academic-scheduling y engagement.

---

## 8. Plan de fases propuesto (para no romper)

- **F1 - curriculum-design:** crear RT `InstructionalComponent` + catalogo `InstructionalComponentType` (aditivos); Modality pasa a contenedor: `theoryHours/practiceHours/labHours` derivados de los componentes y `deliveryMode` reemplazado por `deliveryLocation`+`synchronicity` derivados (breaking: hoy son digitados, toca layouts create/edit/view, seeds, i18n y tests de polymorphicUpdate); layout drill-in; actualizar `recordtypes-declared.test`.
- **F2 - academic-scheduling:** `Section.instructionalComponentId` (+ `requiredResourceTypeId`); resolver que lee los componentes; luego `SectionCluster` + derivacion de `capacity/weeklyModules` + `code` con componente.
- **F3 - engagement:** matricula por componente dentro de cluster; volcado 1:N; ajustar unique de OfferingEnrollment y flows de capacidad.
- **Renames/extras al final (opcionales):** rename `Section -> PlannedSection` (A1); A4 (representacion canonica de modalidad).

---

## 9. Decisiones abiertas

1. `componentType` como enum (version minima) vs `componentTypeId` FK a catalogo (v1). La v1 gana en extensibilidad; el catalogo es un objeto nuevo.
2. A que apunta `Section.instructionalComponentId`: a la Modality (y se leen sus componentes) o a un componente concreto. Define la semantica de `SectionCluster`.
3. Como implementar la derivacion de las horas de Modality (read-enrichment vs materializado). La propuesta las define derivadas; el `como` es implementacion.
4. Propiedad de `Activity` a la luz de UPONE-1283 (Engagement spine canonico) vs "los campos del curso van en CD".
5. Variante por campus: resolver en ejecucion (ActivityLine) o permitir Modality por campus en diseno.
6. Cablear `CurricularLink[EVALUATES]` (hoy declarado, sin UI/seed) si se quiere vincular evaluacion con dictado.

---

## 10. Referencias

- Archivos sp8: ver seccion 1.
- Confluence: [Modelo de objetos - Learning Assurance](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2038366242) (2038366242); [Modelo de objetos - Engagement](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2107080716) (2107080716).
- Jira: [UPONE-1283 Reduccion del modelo de objetos](https://u-planner.atlassian.net/browse/UPONE-1283).
- Codigo verificado (rutas clave): `curriculum-design/objects/{activity,CurricularSection,CurricularLink}.json`, `curriculum-design/objects/RecordTypes/rt__Modality__curricularsection.json`, `academic-scheduling/objects/Section.json`, `academic-scheduling/logic/section-create.resolver.js`, `object-manager/src/services/codegen/generatePrismaSchema.js`, `object-manager/scripts/sync/fileSync.js`, `suite/utils/i18nBridge.ts`, `uengagement-up1/objects/OfferingEnrollment.json`, `uengagement-up1/logic/enroll-current-student.resolver.js`, `curriculum-design/config/layouts/default_Activity_view.json`.
