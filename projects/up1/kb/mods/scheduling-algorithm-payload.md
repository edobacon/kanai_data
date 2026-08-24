---
id: SPEC-mods-scheduling-algorithm-payload
project: up1
type: spec
module: mods
category: mods
fecha: 2026-08-17
ticket: UPONE-1257/1370/1371/1204/1256
tags: [academic-scheduling, scheduling, algorithm, payload, contract, lambda, sns]
sources:
  - mods/academic-scheduling/logic/scheduling-inputs.resolver.js
  - mods/academic-scheduling/logic/scheduling-outputs.resolver.js
  - mods/academic-scheduling/logic/schedule/conflictDetail.js
---

# Contrato del payload del algoritmo de asignacion (academic-scheduling)

Doc evergreen dedicado al contrato de entrada/salida entre `academic-scheduling` y el algoritmo externo de asignacion de horarios. Se crea porque ese conocimiento hoy vive solo como comentarios dispersos en un unico archivo de 1040 lineas, `logic/scheduling-inputs.resolver.js`, y en la ventana 2026-08-03..2026-08-17 cinco tickets (UPONE-1257, UPONE-1370, UPONE-1371, UPONE-1204, UPONE-1256) convergieron sobre ese mismo archivo: es el mayor foco de riesgo de regresion del mod.

Para el resto del modelo de datos del mod (objetos, escenarios, contratos, rule sets), ver [`example-academic-scheduling.md`](example-academic-scheduling.md). Este doc cubre solo el contrato del payload.

## Indice

1. [Que es el payload y quien lo consume](#1-que-es-el-payload-y-quien-lo-consume)
2. [Camino de entrada: query `schedulingInputs`](#2-camino-de-entrada-query-schedulinginputs)
3. [Camino de salida: mutation `upsertSchedulingOutputs`](#3-camino-de-salida-mutation-upsertschedulingoutputs)
4. [Los 5 tickets de la ventana](#4-los-5-tickets-de-la-ventana)
5. [Limitacion explicita de este doc](#5-limitacion-explicita-de-este-doc)

---

## 1. Que es el payload y quien lo consume

El payload es el conjunto de datasets que `academic-scheduling` le entrega a un **algoritmo externo de asignacion de horarios** (`ds_algorithm_assignment` en el codigo, referenciado tambien como el runner de scheduling) para que decida que docente, sala y bloque horario le corresponde a cada seccion de un escenario. El algoritmo corre en una **Lambda** invocada via un topico SNS compartido (ver seccion 10 de `example-academic-scheduling.md`), no dentro del monorepo up1.

La entrada se genera con una sola query GraphQL, `schedulingInputs` (`logic/scheduling-inputs.resolver.js`), que reemplaza tanto el SQL directo que el algoritmo corria antes contra la base del tenant como las N llamadas genericas `listInstances` cuyos joins habia que reproducir del lado del cliente. El comentario de cabecera del resolver documenta el diseno: los datasets cuyo tamano explota con el calendario del periodo (`scheduleRange`, `teacherAvailableModules`, `classroomRestriction`) viajan COMPACTOS, como filas por bloque sin la expansion dia a dia; el algoritmo hace la expansion trivial contra las fechas del periodo. El resto de los datasets ya viene final.

## 2. Camino de entrada: query `schedulingInputs`

Auth: gateada por la capability de objeto `scenario:view`, que satisface la cuenta de servicio de solo lectura del algoritmo (`allowedOps: ["*:view"]`).

El payload esta en su **version 3** (campo `version: 3` en la respuesta). Los campos del contrato verificados linea por linea en `logic/scheduling-inputs.resolver.js`:

- **`sectionRequirements`** (`logic/scheduling-inputs.resolver.js:456-491`): una fila por seccion activa del escenario, con la demanda de la seccion. Incluye, entre otros, `id_campus`, `id_academic_period` (el `termId` propio de la seccion, ya que un escenario puede cubrir varios periodos desde UPONE-1523), `id_shift`, `id_parent` (FK a `SectionCluster`, `0` si no tiene), `id_section`, `id_course`, `id_activity`, `id_modality` (`0` si no aplica), `nm_credits`, `id_schedule_range` (calendario del periodo, o el id de un patron de disponibilidad compartido cuando la seccion declara ventanas via `SectionAvailability`, UPONE-1521), `nm_students_quantity`, `id_master_section`, `is_schedule_required`/`is_classroom_required`/`is_teacher_required` (derivados de `Section.assignmentRequired`), `nm_week_modules`, `nm_consecutive_modules`, `nm_teachers` (minimo de co-docencia, default `1`), `is_accessibility_required`, `is_assigned_by_user` (`1` si la fila de `ScenarioSectionAssignment` correspondiente tiene `assignedBy === 'manual'`, `0` en cualquier otro caso) e `id_original_scenario`. Varios campos (`academic_level`, `ind_same_day`, `is_multicampus_section`, etc.) son placeholders marcados `TODO: change later` en el propio codigo: viajan con un valor fijo, no calculado.
- **`sectionUsageType`** (`:554-565`): una fila por tipo de uso que admite una seccion, leida del join `SectionResourceType` (lado de la demanda, UPONE-1523). Una seccion sin filas explicitas **no envia ninguna fila**: el algoritmo interpreta eso como "no admite ningun tipo de uso" y lo reporta en su propia validacion de datos. Campos: `id_section`, `id_usage_type`, `nm_priority_usage_type` (de `ResourceTypes.priority`), `is_virtual` (placeholder `TODO`).
- **`scheduleRange`**: calendario compacto por bloque (sin expansion dia a dia), uno por periodo del escenario o por patron de disponibilidad de seccion cuando aplica UPONE-1521.
- **`presetRestriction`** (`:770-798` en adelante): toda asignacion existente del escenario (manual o de algoritmo) entra como restriccion preestablecida, una fila por semana ISO de la asignacion (o una fila `0/0` = "toda semana" cuando la fila no tiene semanas). El campo `nm_preset_preference` codifica que dimensiones estan fijas: `3` = sala+horario, `5` = solo horario, `7` = solo sala, `9` = ninguna de esas dos (ej. solo docente).
- **`chairAssignmentRestriction`** (`:574-589`): tope de capacidad utilizable por `(recurso, tipo de uso)`, replicado por cada periodo del escenario con el turno del escenario. Viene de `Resource.chairUsagePercentage` (agregado temporalmente sobre `Resource` por UPONE-1523); un recurso sin porcentaje declarado no envia fila (el algoritmo lo asume en 100%).
- **`is_assigned_by_user`** y la constante **`ASSIGNED_BY_MANUAL`**: `is_assigned_by_user` es el campo del dataset `sectionRequirements` que distingue una asignacion hecha a mano de una hecha por el algoritmo; se deriva comparando `ScenarioSectionAssignment.assignedBy` contra el string `'manual'` (la contraparte, el algoritmo, escribe `assignedBy: 'algorithm'` en la salida, ver seccion 3).
- **`id_parent`** (dataset `sectionRequirements`): FK a `SectionCluster` (`Section.sectionClusterId`), no un campo generico de jerarquia; `0` cuando la seccion no pertenece a ningun agrupamiento.
- **`id_master_section`** (dataset `sectionRequirements`): el id de la `Section` misma (`link.sectionId`), repetido como campo propio del dataset ademas de `id_section`.

Otros datasets del payload, verificados en el `return` final del resolver (`:1006-1038`) pero no detallados campo a campo en este doc: `scenario` (con `termIds`, plural, reflejo del modelo N:M de UPONE-1523), `term` (ancla de compatibilidad, primer periodo) y `terms` (lista cronologica completa), `parameters` (el rule set del escenario, `Scenario.ruleSetId -> RuleSet -> RuleSetRule x RuleDefinition`, en filas `id_algorithm`/`parameter_name`/`parameter_value`), `modulesDefinition`, `infrastructure`, `sectionContractType`, `teacherCourseActivity`, `teacherContract`, `groupSchedule`, `academicPeriod`, `careerBuildingRestriction`, `campusTravelTime`/`locationTravelTime` (de `TransferTime`, UPONE-1523), `teacherAvailableBlocks`, `sectionAvailableBlocks` (UPONE-1521), `classroomAvailableBlocks`, `declaredClassroomIds`, `declaredClassroomTerms`, `classroomRestrictedBlocks`.

## 3. Camino de salida: mutation `upsertSchedulingOutputs`

UPONE-1256 (commits `a6759d3`, `df0f37c`, `5586437`) cambio el camino de salida: el algoritmo **ya no escribe sus resultados por SQL directo** contra `ds_core.insert_output`. Ahora los persiste en una sola llamada a la mutation GraphQL `upsertSchedulingOutputs` (`logic/scheduling-outputs.resolver.js`), que:

- Mantiene paridad con el camino SQL previo (`SCENARIOSECTIONASSIGNMENT_OUTPUT_INSERT_DICT`): la identidad de conflicto para upsert es la tupla `(scenarioSectionId, timeBlockId, resourceId, instructorId)`, la misma que el `UNIQUE NULLS NOT DISTINCT` de la tabla; las filas que hacen match actualizan `weeks`, `failureCode` y `assignedBy`, nunca `id`/`createdAt`. Ninguna fila se borra.
- Resuelve el puente `Section.id -> ScenarioSection.id` del lado del servidor (antes era una query SQL directa, `SCENARIO_SECTIONS_QUERY`): el algoritmo habla en terminos de `Section.id`, no de `ScenarioSection.id`. Las secciones sin `ScenarioSection` en el escenario se saltan y se reportan.
- Fija `assignedBy: 'algorithm'` (la constante `ASSIGNED_BY_ALGORITHM`) como valor server-side, nunca aceptado como input del cliente.
- Recalcula, tras el ingreso, la bandera `ScenarioSection.hasConflict` para todo el escenario con la regla canonica (`computeConflictedSectionIds`, `logic/schedule/conflictDetail.js`), de forma defensiva: si el recalculo falla, no revierte un ingreso que ya se commiteo.
- Queda gateada por la capability de mod `mod/academic-scheduling:ingest_outputs`; la cuenta de servicio de solo lectura usada para `schedulingInputs` (`*:view`) NO alcanza para esta mutation.

El SQL upsert directo sigue existiendo, pero solo como **fallback** del algoritmo para ejecuciones sin acceso al object manager (comentario de cabecera de `scheduling-outputs.resolver.js`).

## 4. Los 5 tickets de la ventana

| Ticket | Que corrigio en el resolver |
|--------|------------------------------|
| UPONE-1257 | Ajusto los inputs de disponibilidad docente (`teacherAvailableBlocks` y datasets relacionados) y contribuyo a la introduccion de `parameters` (rule set del escenario) junto con UPONE-1370/1371. |
| UPONE-1370 | Corrigio el input del calendario/rango de horario de seccion (`scheduleRange`) y la identificacion de secciones asignadas por el usuario (asignacion manual pasa a restriccion preestablecida, `presetRestriction`). |
| UPONE-1371 | Corrigio el input `sectionUsageType` y el dataset `chairAssignmentRestriction` (tope de capacidad por tipo de uso). |
| UPONE-1204 | Corrigio `sectionRequirements` (campos de demanda de la seccion) y, junto con UPONE-1371, los inputs de infraestructura. |
| UPONE-1256 | Migro el camino de SALIDA del algoritmo de SQL directo a la mutation `upsertSchedulingOutputs` del object manager; tambien ajusto el curso (`id_course`) en los inputs. |

Nota: varios commits llevan mas de un ticket en su mensaje (ej. `f2dd936` con UPONE-1523/1257/1370/1371), reflejando que los cinco tickets se trabajaron en la misma ventana sobre el mismo archivo, no en aislamiento.

## 5. Limitacion explicita de este doc

**Este doc documenta solo el lado up1 del contrato** (que arma el payload de entrada y que recibe el de salida). El lado Lambda, es decir el codigo del algoritmo externo que consume `schedulingInputs` y produce el payload que llega a `upsertSchedulingOutputs`, **no vive en los repos recorridos por esta actualizacion** (`uplanner/up1/*`). Por lo tanto:

- Los nombres de campo aqui listados estan verificados contra lo que `academic-scheduling` **envia y espera recibir**, no contra una implementacion del algoritmo que se haya podido inspeccionar.
- Los campos marcados `TODO: change later` en el codigo fuente indican que el propio resolver los declara como pendientes de calculo real, no como contrato estable.
- Nadie debe leer este doc como el contrato COMPLETO del algoritmo de asignacion: es la mitad documentable desde este monorepo.

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-08-17 | Documento inicial: contrato del payload de entrada (`schedulingInputs`) y salida (`upsertSchedulingOutputs`) del algoritmo de asignacion, con los 5 tickets de la ventana 2026-08-03..2026-08-17 que convergieron en `scheduling-inputs.resolver.js` |
