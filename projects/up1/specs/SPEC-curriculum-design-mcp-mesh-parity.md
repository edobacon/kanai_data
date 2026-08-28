---
id: SPEC-curriculum-design-mcp-mesh-parity
project: up1
ticket: TICKET-099
status: done
---

# Paridad de la malla curricular desde el MCP (Fase A + B)

# Paridad de la malla curricular desde el MCP (Fase A + B)

## Executive summary — lo que estas aprobando

> *Seccion para revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: llevar al MCP (`up1-mcp` / Elric) la potencia que hoy solo tiene el componente de UI `CurriculumMesh` (SP5): ver la malla de un plan, agregar/editar/mover/quitar asignaturas (obligatorias y electivas creando el bloque en el acto), gestionar líneas de formación y el árbol de requisitos — **sin exigir ids crudos** y **avisando de los guards antes de commitear**. Hoy los 3 objetos ya se operan por CRUD genérico, pero el usuario del MCP debe conocer la forma exacta de cada objeto y el orden de pasos, y solo se entera de una regla cuando el commit falla.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Portar** la lógica pura del mod (`prereqCheck`, `recalcPeriodPosition`) al MCP, no importarla | El MCP es repo standalone y solo habla GraphQL — no puede importar TS del mod. Se replica el algoritmo con comentario de procedencia (mismo patrón que `validations.ts` ya usa). Riesgo: duplicación lógica; mitigado con tests que fijan la semántica. |
| 2 | Exponer los guards vía un campo nuevo `guards: string[]` en `ObjectContract` (config-driven) | Mantiene la fuente única: `describe_object` y `get_create_guide` derivan del contrato. Alternativa (hardcodear en cada tool) rompería el patrón declarativo del MCP. |
| 3 | El pre-check de prereqs y el aviso de `totalPeriods` son **informativos, no bloquean** el commit | Paridad exacta con el modal de MC-08 (el usuario decide). Bloquear divergiría de la UI y del semántica H2. |
| 4 | Alta de electiva con bloque nuevo es **atómica con rollback**: si falla el `planEntry`, se borra el bloque huérfano | Cierra G3 (hoy 2 pasos manuales dejan bloques huérfanos si el 2º falla). Replica `createElectivaEntries` del mod. |

**Riesgos principales y como los mitigamos**:

- **La lógica portada diverge de la del mod si el mod cambia sus reglas** → tests unitarios en el MCP que fijan la semántica exacta (timings bloqueantes, exclusión de MetricThreshold, recálculo 0-based); comentario de procedencia con ruta del archivo fuente en el mod.
- **Rollback parcial en alta masiva de electivas** (varias entries, una falla a mitad) → replicar el contrato del mod: borrar el bloque huérfano; documentar que las entries ya creadas del mismo lote no se revierten (mismo comportamiento que la UI) y devolver error claro.
- **El guard MC-09 corre en el commit, no en el preview** → el preview del MCP muestra la advertencia derivada del contrato (REQ-01); el rechazo real sigue viniendo del resolver de up1 (no se duplica el guard, solo se anticipa el mensaje).

**Que NO se hace en este ticket** (Fase C, diferido):

- Configurar el **layout de la malla** por MCP (depende de RecordDetail en MCP — fase 2, G7).
- El **motor de evaluación** de requisitos (degree-audit con notas) → SP6.
- Reactividad instantánea UI↔categorías (freshness) — MC-08 lo resolvió con botón "Actualizar", no requiere MCP.

**Tamano estimado**: 3 sessions ejecutables (S1–S3), ~2–3h efectivas c/u. La más riesgosa es S2 (writes orquestados con rollback + port de lógica pura).

**Como vas a saber que funciona** (observable):

- `describe_object requirement` menciona el bloqueo MC-09 y "versionar"; `describe_object requirementCategory` menciona rango de créditos y "reasigna primero".
- `cd_get_mesh(plan)` devuelve la malla agrupada por período con derivados de créditos + `totalPeriods`.
- `cd_add_plan_entry` de una electiva con `newBlockName` crea el bloque + la entrada en un solo paso; sobre un plan Active rechaza con el mensaje de versionar.
- Invocar una tool con el nombre de un curso (no su id) lo resuelve, y en output se ve el código legible, nunca un UUID.

---

## Purpose

Extender el mod pack `curriculum-design` del MCP con tools dedicadas de malla (`cd_get_mesh`, `cd_add_plan_entry`, `cd_update_plan_entry`, `cd_move_plan_entry`, `cd_remove_plan_entry`, `cd_manage_formation_line`, `cd_manage_requirement`, `cd_get_prereqs`) y exponer en los `ObjectContract` los guards de negocio y la editabilidad del plan. Actor: usuario de diseño curricular operando up1 vía un LLM. Reusa el enrichment de lectura y las mutaciones genéricas ya existentes; no crea objetos ni campos en up1.

## Requirements

### REQ-01: exponer guards en los contratos de la malla

> **Que cambia**: al pedir la forma de `requirement`/`requirementCategory`/`planEntry`, ahora ves las reglas de negocio (no editar requisitos de asignatura en plan Active → versionar; rango de créditos min≤max; borrar línea con entradas → reasigna primero) antes de intentar el commit.
> **Por que**: hoy `describe_object` muestra `validations: {}` y solo te enteras de la regla cuando el commit falla — rompe "guía antes de enviar".

El sistema MUST exponer, para `requirement`, `requirementCategory` y `planEntry`, las advertencias de sus guards de negocio en la salida de `describe_object` (bajo `validations`/`guards`) y de `get_create_guide` (bajo `notes`), derivadas del contrato (fuente única).

**Actor**: user (vía LLM)
**Layers**: config (contracts), api (tools guide)

<details><summary>Scenarios de validacion</summary>

#### Scenario: describe advierte MC-09 en requirement
- **GIVEN** el contrato de `requirement` con su guard MC-09 declarado
- **WHEN** se invoca `describe_object("requirement")`
- **THEN** la salida incluye una advertencia que menciona el bloqueo en planes Active y "crear una nueva versión del programa"

#### Scenario: guide advierte rango + borrado en requirementCategory
- **GIVEN** el contrato de `requirementCategory`
- **WHEN** se invoca `get_create_guide("requirementCategory")`
- **THEN** `notes` menciona `minCredits ≤ maxCredits` y que borrar una línea con entradas exige reasignar primero

#### Scenario: objeto sin guards no inventa advertencias
- **GIVEN** un objeto sin `guards` en su contrato
- **WHEN** se invoca `describe_object`
- **THEN** no aparece la clave `guards` (o aparece vacía) — no se fabrican advertencias

</details>

#### Acceptance
**El usuario puede verificar que funciona**: pide "describe requirement" y ve mencionado el bloqueo por plan publicado; pide la guía de una línea de formación y ve la regla de créditos y la de borrado.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | describe requirement | contrato con guards | describe_object("requirement") | advertencia MC-09 | texto menciona "Active"/"versión" |
| 2 | guide requirementCategory | contrato | get_create_guide("requirementCategory") | notes con rango + borrado | "min ≤ max" y "reasigna" presentes |

### REQ-02: exponer editabilidad del plan

> **Que cambia**: puedes preguntar si un plan admite cambios antes de intentar mutarlo; la lectura del currículo trae un `isEditable` derivado.
> **Por que**: hoy `EDITABLE_STATUSES` es lógica del frontend no consultable por MCP; el usuario solo lo infiere del `status`.

El sistema MUST derivar y exponer `isEditable` en la lectura de `Curriculum` (`cd_get_curriculum` y `cd_get_mesh`), calculado desde `EDITABLE_STATUSES = ['Draft']` (paridad con el mod).

**Actor**: user (vía LLM)
**Layers**: api (tools read)

<details><summary>Scenarios de validacion</summary>

#### Scenario: plan Draft es editable
- **GIVEN** un currículo con `status: Draft`
- **WHEN** se lee con `cd_get_curriculum` o `cd_get_mesh`
- **THEN** `isEditable: true`

#### Scenario: plan Active no es editable
- **GIVEN** un currículo con `status: Active`
- **WHEN** se lee
- **THEN** `isEditable: false`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: lee un plan en borrador y ve que es editable; lee uno publicado y ve que no lo es.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | editabilidad por status | status Draft/Active | derivar isEditable | boolean correcto | Draft→true, Active/Archived→false |

### REQ-03: `cd_get_mesh(curriculumId)` — lectura agregada

> **Que cambia**: una sola llamada devuelve la malla completa de un plan: entradas agrupadas por período, líneas de formación con sus derivados de créditos, y un resumen — sin armar 3 queries a mano.
> **Por que**: hoy "ver la malla" son 3 queries (`planEntry` + `requirementCategory` + `Curriculum`) + agrupación en el cliente.

El sistema MUST proveer `cd_get_mesh(curriculumId)` que devuelva: entradas agrupadas por período (con código y nombre de asignatura legibles, créditos efectivos, rol oblig/electiva, categoría), líneas de formación con sus derivados (`currentCredits`, `mandatoryCount`, `electiveCount`, `creditStatus`), y un resumen del plan (`totalPeriods`, número de períodos con entradas, `isEditable`).

**Actor**: user (vía LLM)
**Layers**: api (tool read)

<details><summary>Scenarios de validacion</summary>

#### Scenario: malla agrupada con derivados
- **GIVEN** un plan con entradas y líneas de formación
- **WHEN** `cd_get_mesh(plan)`
- **THEN** devuelve `periods[]` con entradas por período + `formationLines[]` con `creditStatus` + `summary` con `totalPeriods`

#### Scenario: plan vacío
- **GIVEN** un plan sin entradas
- **WHEN** `cd_get_mesh(plan)`
- **THEN** `periods` refleja `totalPeriods` columnas vacías, sin error

</details>

#### Acceptance
**El usuario puede verificar que funciona**: pide "muéstrame la malla del plan X" y recibe los períodos con sus asignaturas por código y las líneas con su estado de créditos.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | agrupación por período | entries en períodos 1-3 | groupByPeriod | columnas ordenadas | entry en `periods[period-1]`, orden por position |

### REQ-04: `cd_add_plan_entry` con creación de bloque orquestada + pre-check

> **Que cambia**: agregas una asignatura (obligatoria o electiva) por nombre/código; para electiva puedes pasar un bloque existente o `newBlockName` y el bloque se crea en el mismo paso, atómico. El preview lista prereqs faltantes y avisa si el período excede el total.
> **Por que**: hoy la electiva son 2 pasos manuales sin orquestación (bloque huérfano si el 2º falla), sin pre-check ni aviso de períodos.

El sistema MUST proveer `cd_add_plan_entry` que: (a) resuelva plan y asignatura por nombre/código; (b) para electiva acepte `blockId` **o** `newBlockName` creando el `rt__Group__requirement` (`ownerType:'curriculum'`, `recordType:'Group'`, `combinator:'OR'`, `effect:'ProgressGate'`, `isHardRule:false`, `minToSatisfy`) y luego el `planEntry` con `blockId`, con **rollback** del bloque si el `planEntry` falla; (c) corra el pre-check estructural de prereqs (REQ-07) informativo en el preview; (d) avise (no bloquee) si el período destino excede `totalPeriods` (REQ-09).

**Actor**: user (vía LLM)
**Layers**: api (tool write), backend (GraphQL create)

<details><summary>Scenarios de validacion</summary>

#### Scenario: electiva con bloque nuevo (atómico)
- **GIVEN** un plan Draft y una asignatura, con `newBlockName`
- **WHEN** `cd_add_plan_entry(..., confirm:true)`
- **THEN** se crea el bloque `rt__Group__requirement` y el `planEntry` con su `blockId`

#### Scenario: rollback si falla el planEntry
- **GIVEN** el bloque se creó pero el `createInstance` del `planEntry` falla
- **WHEN** se ejecuta el alta
- **THEN** se borra el bloque huérfano y se devuelve error claro

#### Scenario: bloqueo por plan Active
- **GIVEN** un plan Active (guard MC-09 aplica a requirement owner=activity)
- **WHEN** se intenta un alta que crea requirement de asignatura
- **THEN** el commit es rechazado por el resolver con el mensaje de versionar

</details>

#### Acceptance
**El usuario puede verificar que funciona**: agrega una electiva "creando el bloque Optativas de Ciencias" y ve creado el bloque + la entrada; si algo falla a mitad, no queda un bloque suelto.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | payload de bloque | plan + label | buildBlockPayload | forma correcta | ownerType=curriculum, recordType=Group, combinator=OR |
| 2 | payload de entry electiva | plan, activity, blockId | buildElectivaEntryPayload | forma correcta | kind='Course', blockId set, credits=null |

### REQ-05: `cd_update_plan_entry` / `cd_remove_plan_entry`

> **Que cambia**: editas una entrada (créditos override, categoría, rol oblig/electiva con opción de crear bloque nuevo) y la quitas, por nombre/id.
> **Por que**: hoy es `update_object`/`delete_object` crudo; falta la orquestación de "cambiar a electiva creando bloque" que tiene la UI.

El sistema MUST proveer `cd_update_plan_entry` (patch parcial de `credits`/`categoryId`/`blockId`, con opción de crear bloque nuevo al pasar a electiva) y `cd_remove_plan_entry`.

**Actor**: user (vía LLM)
**Layers**: api (tool write), backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: editar créditos y categoría
- **GIVEN** una entrada existente
- **WHEN** `cd_update_plan_entry(credits, categoryId, confirm:true)`
- **THEN** el patch aplica solo los campos indicados

#### Scenario: quitar entrada
- **GIVEN** una entrada existente
- **WHEN** `cd_remove_plan_entry(confirm:true)`
- **THEN** la entrada se borra

</details>

#### Acceptance
**El usuario puede verificar que funciona**: cambia los créditos de una asignatura del plan y luego la quita.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | patch parcial | entry + cambios | prepareUpdatePayload | solo campos cambiados | patch sin `id`, solo credits/categoryId/blockId |

### REQ-06: `cd_manage_formation_line`

> **Que cambia**: creas/editas/quitas una línea de formación (categoría de créditos) con el rango y el guard de borrado visibles.
> **Por que**: hoy es CRUD genérico sin surfacear la validación de rango ni el guard de borrado.

El sistema MUST proveer `cd_manage_formation_line` (create/update/delete de `requirementCategory`) con validación espejo `minCredits ≤ maxCredits` y el guard de borrado ("reasigna primero") surfaceado.

**Actor**: user (vía LLM)
**Layers**: api (tool write), backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: crear línea con rango válido
- **GIVEN** curriculum + name + minCredits ≤ maxCredits
- **WHEN** `cd_manage_formation_line(action:'create', confirm:true)`
- **THEN** se crea la línea

#### Scenario: rango inválido rechazado temprano
- **GIVEN** minCredits > maxCredits
- **WHEN** `cd_manage_formation_line(action:'create')`
- **THEN** error de validación antes del commit

</details>

#### Acceptance
**El usuario puede verificar que funciona**: crea la línea "Formación básica 30–60"; intentar 60–30 es rechazado antes de enviar.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | validateCreditRange | min>max | validación | error | 1 error; min≤max → 0 |

### REQ-07: pre-check estructural de prerrequisitos

> **Que cambia**: al agregar una asignatura, el preview lista los prerrequisitos-curso que no están ubicados en un período anterior (por código legible). Los umbrales de créditos NO alertan. Es informativo, no bloquea. También podés inspeccionar el árbol de prereqs de una asignatura.
> **Por que**: paridad con MC-08; hoy por MCP agregas sin saber que faltan prereqs ubicados antes.

El sistema MUST correr, en `cd_add_plan_entry`, el pre-check estructural: `RecordState` con timing `Before`/`Either` cuyo curso objetivo no esté colocado en período anterior, y `Group` K-de-N con menos de `minToSatisfy` miembros colocados antes → faltante. `MetricThreshold` NUNCA participa (H2). Los faltantes se devuelven por **código/nombre legible** en el preview, informativos. El sistema MUST proveer `cd_get_prereqs(activity)` para inspeccionar el árbol de prereqs de una asignatura.

**Actor**: user (vía LLM)
**Layers**: api (tool), backend (read requirements + entries)

<details><summary>Scenarios de validacion</summary>

#### Scenario: prereq RecordState no ubicado antes
- **GIVEN** una asignatura con prereq (RecordState Before) no colocado en período anterior
- **WHEN** `cd_add_plan_entry` (preview)
- **THEN** el preview lista el prereq faltante por código, sin bloquear

#### Scenario: único requisito es MetricThreshold (créditos)
- **GIVEN** una asignatura cuyo único requisito es un umbral de créditos
- **WHEN** `cd_add_plan_entry` (preview)
- **THEN** NO reporta faltante (H2)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: intenta agregar un curso con prereq no ubicado y ve el aviso con el código del prereq (ej. "MAT110"), pero puede confirmar igual.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | RecordState Before faltante | prereq sin ubicar | findMissingPrereqs | 1 faltante | item con refId + label |
| 2 | MetricThreshold ignorado | solo umbral créditos | findMissingPrereqs | vacío | [] |
| 3 | Group K-de-N | 1 de 2 ubicados, minToSatisfy 2 | findMissingPrereqs | 1 faltante | detail "1 de 2..." |

### REQ-08: mover asignatura entre períodos con recálculo

> **Que cambia**: mover una asignatura de un período a otro recalcula las posiciones de los hermanos en origen y destino (sin huecos ni colisiones), igual que el drag&drop.
> **Por que**: hoy `update_object planEntry` cambia `period`/`position` crudo y deja el orden inconsistente respecto a la UI.

El sistema MUST proveer `cd_move_plan_entry` que cambie `period`/`position` recalculando el orden de hermanos en columna origen y destino (port de `recalcPeriodPosition`, convención 0-based), persistiendo solo las entradas cuyo `period`/`position` cambió.

**Actor**: user (vía LLM)
**Layers**: api (tool write), backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: mover cross-columna
- **GIVEN** 2 períodos con hermanos
- **WHEN** `cd_move_plan_entry(from 2 to 1, index)`
- **THEN** period/position de la movida + hermanos afectados se actualizan sin hueco/colisión

</details>

#### Acceptance
**El usuario puede verificar que funciona**: mueve un ramo del período 2 al 1 y el orden queda consistente en ambos períodos.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | recalc cross-container | entries 2 columnas | recalcPeriodPosition | updates mínimos | solo entries con cambio real |

### REQ-09: `totalPeriods` como constraint + aviso de discrepancia

> **Que cambia**: `cd_get_mesh` expone `totalPeriods` y el número de períodos actuales; agregar más allá de `totalPeriods` avisa (no bloquea).
> **Por que**: paridad con la alerta de discrepancia de MC-08; hoy el usuario no sabe cuántos períodos tiene el plan ni que se está pasando.

El sistema MUST exponer `totalPeriods` y `#períodos con entradas` en `cd_get_mesh`, y `cd_add_plan_entry` MUST avisar (sin bloquear) si el período destino excede `totalPeriods`.

**Actor**: user (vía LLM)
**Layers**: api (tools)

<details><summary>Scenarios de validacion</summary>

#### Scenario: agregar más allá de totalPeriods
- **GIVEN** un plan con `totalPeriods = 10`
- **WHEN** `cd_add_plan_entry(period: 11)` (preview)
- **THEN** aviso "11 · configurado 10", no bloquea

</details>

#### Acceptance
**El usuario puede verificar que funciona**: agrega en un período mayor al total del plan y ve el aviso de discrepancia, pero puede confirmar.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | discrepancia de períodos | totalPeriods=10, period=11 | check | aviso | mensaje con 11 y 10 |

### REQ-10: `cd_manage_requirement` — gestión del árbol de requisitos

> **Que cambia**: ves y creas nodos del árbol de requisitos (Group/RecordState/MetricThreshold) resolviendo el curso objetivo por código, con `timing`/`mustBe`/`combinator` ofrecidos como opciones legibles.
> **Por que**: hoy es CRUD genérico crudo de `requirement`; falta la orquestación por código y la semántica H2.

El sistema MUST proveer `cd_manage_requirement` (view/create de nodos `requirement`) resolviendo `targetId` por código de asignatura, con `timing`/`mustBe`/`combinator` como opciones (`get_field_options`), respetando H2 (créditos no condicionan ubicación).

**Actor**: user (vía LLM)
**Layers**: api (tool write/read), backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: crear RecordState resolviendo target por código
- **GIVEN** una asignatura objetivo referida por código
- **WHEN** `cd_manage_requirement(action:'create', recordType:'RecordState', target:'MAT110', confirm:true)`
- **THEN** el target se resuelve al id; `timing`/`mustBe` se ofrecen como opciones

</details>

#### Acceptance
**El usuario puede verificar que funciona**: crea un prerrequisito "MAT110 aprobado antes" refiriéndose por código, sin conocer el UUID.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | target por código | activity code | resolución | id resuelto | targetId = id de la Activity |

### REQ-11: (transversal) opciones legibles + resolución por nombre/código

> **Que cambia**: ninguna tool de malla exige ids crudos — resuelve curso/línea/bloque/prereq por nombre o código (tolerante a acentos, desambiguando si hay varios) y devuelve etiquetas legibles (códigos/nombres), nunca UUIDs.
> **Por que**: lección W2 del dual-judge de MC-08 (el modal mostraba el activityId UUID → se corrigió a código). Rompe el "guía al usuario" si se exigen ids.

El sistema MUST, en todas las tools de malla, resolver referencias por nombre/código (matching tolerante a acentos + desambiguación con candidatos) y devolver etiquetas legibles en output; selects/enums vía `get_field_options`.

**Actor**: user (vía LLM)
**Layers**: api (todas las tools de malla)

<details><summary>Scenarios de validacion</summary>

#### Scenario: nombre de curso con homónimos
- **GIVEN** catálogo con "Cálculo I" y "Cálculo II"
- **WHEN** una tool recibe "Cálculo"
- **THEN** desambigua con candidatos, sin pedir UUID

#### Scenario: output legible
- **GIVEN** cualquier tool de malla que devuelve entradas
- **WHEN** se presenta el resultado
- **THEN** las asignaturas aparecen por código/nombre, nunca por UUID

</details>

#### Acceptance
**El usuario puede verificar que funciona**: escribe el nombre de un curso (no su id); si hay ambigüedad, la tool le ofrece elegir; el resultado muestra códigos, no UUIDs.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | desambiguación | 2 matches | resolveReference | ambiguous | candidatos con label+code |

## Artifacts

Sin meta-specs: la feature no crea objetos ni endpoints nuevos en up1. Los artefactos son **tools MCP** (funciones registradas en el server) y **metadata de contrato**. Reusa objetos existentes (`planEntry`, `requirementCategory`, `requirement`, `Curriculum`, `Activity`) y sus mutaciones genéricas GraphQL.

### Tools MCP nuevas (mod pack curriculum-design)

| Tool | Tipo | Objeto(s) | Reusa |
|------|------|-----------|-------|
| `cd_get_mesh` | read | Curriculum, planEntry, requirementCategory | enrichment de lectura existente |
| `cd_add_plan_entry` | write | planEntry (+ rt__Group__requirement) | createInstance, resolveReference |
| `cd_update_plan_entry` | write | planEntry | updateInstance |
| `cd_move_plan_entry` | write | planEntry | updateInstance + recalcPeriodPosition (port) |
| `cd_remove_plan_entry` | write | planEntry | deleteInstance |
| `cd_manage_formation_line` | write | requirementCategory | create/update/deleteInstance, validateCreditRange |
| `cd_manage_requirement` | write/read | requirement | create/listInstances, resolveReference |
| `cd_get_prereqs` | read | requirement | listInstances + findMissingPrereqs (port) |

### Cambios de metadata de contrato (registry.ts)

| Cambio | Objeto | Detalle |
|--------|--------|---------|
| campo `guards?: string[]` en `ObjectContract` | (tipo) | nuevo campo opcional |
| poblar `guards` | requirement | MC-09: no editar requisitos de asignatura en plan Active → versionar |
| poblar `guards` | requirementCategory | rango min≤max; borrado con entradas → reasigna primero |
| poblar `guards` | planEntry | (opcional) nota de que se gestiona también desde la malla |
| surface en `describe_object` | guide.ts | `validations.guards` desde `contract.guards` |
| surface en `get_create_guide` | guide.ts | `notes` incluye `contract.guards` |

### Lógica pura portada (nueva, con procedencia)

| Archivo MCP nuevo | Portado de (mod) | Funciones |
|-------------------|------------------|-----------|
| `src/mods/curriculum-design/mesh-logic.ts` | `modsComponents/CurriculumMesh/{prereqCheck,recalcPeriodPosition,curriculumMesh}.logic.ts` | `findMissingPrereqs`, `recalcPeriodPosition`, `groupByPeriod`, `nextPosition`, `EDITABLE_STATUSES`, tipos VM |

## Tasks

### Session 1 — Fase A: contratos (guards + editabilidad) + `cd_get_mesh` [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: [[S1.T1, S1.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Agregar campo `guards?: string[]` a `ObjectContract`; poblarlo en requirement (MC-09), requirementCategory (rango+borrado), planEntry; surfacear en `describe_object.validations.guards` y `get_create_guide.notes` | REQ-01 | developer | — | src/contracts/registry.ts, src/tools/guide.ts | vitest test/contracts.test.ts (TC-01, TC-02) | git revert | DET-1, DET-2, DET-11, RULE-dev-009 | pending | 1 |
| S1.T2 | Derivar `isEditable` desde `EDITABLE_STATUSES=['Draft']` (const en mesh-logic.ts) y exponerlo en `cd_get_curriculum` | REQ-02 | developer | — | src/mods/curriculum-design/curriculum.ts, src/mods/curriculum-design/mesh-logic.ts | vitest (unit isEditable) | git revert | DET-1, DET-2, RULE-dev-009 | pending | 1 |
| S1.T3 | Implementar `cd_get_mesh(curriculumId)`: leer Curriculum + planEntry(planId) + requirementCategory(curriculumId); agrupar por período (port `groupByPeriod`), resolver labels de asignatura, exponer `totalPeriods`/#períodos/`isEditable`/derivados de créditos | REQ-03, REQ-09 | developer | S1.T2 | src/mods/curriculum-design/mesh-read.ts, src/mods/curriculum-design/index.ts | vitest (grouping) + smoke sesión real (TC-03, TC-11) | git revert | DET-1, DET-2, DET-8, DET-16, RULE-dev-009 | pending | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2) — persistir en `## Sessions`, correr vitest + coverage, quality review DET-23, decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + tests verdes | (no aplica) | DET-20, DET-23, DET-33 | pending | 1 |

### Session 2 — Fase B: writes de entradas + port de lógica pura [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Portar lógica pura al MCP: `findMissingPrereqs` (timings Before/Either, Group K-de-N, excluir MetricThreshold), `recalcPeriodPosition` (0-based), helpers de payload de bloque/entry; tipos VM. Comentario de procedencia con ruta del mod | REQ-07, REQ-08 | developer | S1.GATE | src/mods/curriculum-design/mesh-logic.ts, test/mesh-logic.test.ts | vitest (TC-08, TC-09, TC-10 + Group) | git revert | DET-1, DET-2, DET-8, DET-16, RULE-dev-009 | pending | 2 |
| S2.T2 | `cd_add_plan_entry`: resolver plan/asignatura por nombre/código; electiva con `blockId` o `newBlockName` (crea rt__Group__requirement + entry, rollback del bloque si falla el entry); pre-check prereqs informativo (REQ-07); aviso totalPeriods (REQ-09) | REQ-04, REQ-07, REQ-09 | developer | S2.T1 | src/mods/curriculum-design/mesh-write.ts, src/mods/curriculum-design/index.ts | vitest (payloads TC-04) + smoke (TC-05) | git revert | DET-1, DET-2, DET-5, DET-8, RULE-dev-009 | pending | 2 |
| S2.T3 | `cd_update_plan_entry` (patch parcial credits/categoryId/blockId + opción crear bloque nuevo) y `cd_move_plan_entry` (recalc via S2.T1) y `cd_remove_plan_entry` | REQ-05, REQ-08 | developer | S2.T1 | src/mods/curriculum-design/mesh-write.ts | vitest (TC-06, TC-10) | git revert | DET-1, DET-2, DET-5, DET-8, RULE-dev-009 | pending | 2 |
| S2.T4 | `cd_manage_formation_line` (create/update/delete requirementCategory) con validación rango + guard de borrado surfaceado | REQ-06 | developer | S1.GATE | src/mods/curriculum-design/mesh-write.ts | vitest (TC-07) | git revert | DET-1, DET-2, DET-8, RULE-dev-009 | pending | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T2) — persistir, vitest + coverage, quality review DET-23, verificación self-report DET-33, decidir | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + tests verdes | (no aplica) | DET-20, DET-23, DET-33 | pending | 2 |

### Session 3 — Árbol de requisitos + transversal (opciones legibles) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | `cd_manage_requirement` (view/create nodos requirement) resolviendo target por código, con timing/mustBe/combinator como opciones; respeta H2 | REQ-10 | developer | S2.GATE | src/mods/curriculum-design/requirement-write.ts, src/mods/curriculum-design/index.ts | vitest (TC-12) | git revert | DET-1, DET-2, DET-8, RULE-dev-009 | pending | 3 |
| S3.T2 | `cd_get_prereqs(activity)`: inspeccionar el árbol de prereqs de una asignatura, salida legible por código | REQ-07, REQ-10 | developer | S2.T1 | src/mods/curriculum-design/mesh-read.ts | vitest (unit) + smoke | git revert | DET-1, DET-2, RULE-dev-009 | pending | 3 |
| S3.T3 | Transversal G11: verificar que TODAS las tools de malla resuelven por nombre/código (tolerante a acentos + desambiguación) y devuelven labels legibles; registrar las tools nuevas en el pack (`tools[]`, routingHints, notExposed) | REQ-11 | developer | S3.T1, S3.T2 | src/mods/curriculum-design/index.ts, (tools de malla) | vitest (TC-13) + registry-collision.test | git revert | DET-1, DET-11, DET-16, RULE-dev-009 | pending | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier: T2) — persistir, suite completa MCP + coverage, quality review DET-23, self-report DET-33, decidir cierre | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + suite verde | (no aplica) | DET-20, DET-23, DET-33 | pending | 3 |

### Task contract (referencia — campos por task ya en la tabla)

Cada task de developer sigue el contrato: source_ref (REQ), files concretos, validation (vitest del área + smoke con sesión MCP real donde aplica), rollback `git revert` (cambios atómicos en el repo MCP). El pre-check y los avisos son informativos (no bloquean el commit) — el rollback aplica al código, no a datos de up1 (las mutaciones de prueba se hacen sobre planes Draft de UPU).

## Constraints

- **RULE-dev-009**: contratos MCP — cada objeto operable declara su `ObjectContract`; las tools derivan de él. El campo `guards` extiende el contrato sin romper el patrón declarativo.
- **DET-1 / DET-2**: los 11 REQ son `confirmed` con `source_ref` al gap MD y a los tickets MC-04/MC-08.
- **DET-11 (KB-first)**: reusar el enrichment de lectura y las mutaciones genéricas existentes; no reimplementar dominio.
- **Restricción de repo standalone**: el MCP no importa código del mod up1 → la lógica pura se **porta** (DEC-LOCAL-01).
- **Semántica H2**: `MetricThreshold` (créditos) NO condiciona la ubicación en el pre-check estructural.
- **Guard MC-09** (`PUBLISHED_STATUSES=['Active']`): el bloqueo real vive en el resolver de up1; el MCP lo anticipa en el contrato, no lo duplica.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| GraphQL up1 (listInstances/createInstance/updateInstance/deleteInstance) | internal | mutaciones/queries genéricas que las tools envuelven | si el schema del objeto cambia, los payloads deben ajustarse |
| mod curriculum-design synced al backend | internal | el enrichment de lectura y el guard MC-09 viven en el resolver del mod | sin el mod synced, derivados llegan null y el guard no corre |
| sesión MCP (authenticate + submit_otp) | external | necesaria para los smoke tests contra UPU | los smoke requieren OTP; los contract tests no |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Lógica portada diverge de la del mod | medium | medium | tests que fijan la semántica exacta; comentario de procedencia con ruta fuente |
| Rollback parcial en alta masiva de electivas | low | medium | replicar contrato del mod (borrar bloque huérfano); documentar que entries ya creadas no se revierten; error claro |
| Smoke tests requieren OTP no disponible en CI | medium | low | contract tests (puros) cubren la lógica; smoke se corre manual con sesión real y se documenta la evidencia |
| Colisión de nombres de tool en el pack | low | high | `registry-collision.test.ts` ya valida; S3.T3 lo corre |

## Open questions

(ninguna — el intake convergió con las 3 hipótesis confirmadas y la decisión import-vs-port resuelta)

## Decisions

### DEC-LOCAL-01: portar la lógica pura del mod al MCP (no importar)
- **Contexto**: REQ-07/REQ-08 piden "reusar" `prereqCheck.logic.ts` y `recalcPeriodPosition.logic.ts` del mod.
- **Drivers**: el MCP es repo git standalone, stateless, solo habla GraphQL; no tiene acceso al filesystem ni al build del mod up1.
- **Opcion elegida**: portar el algoritmo puro a `src/mods/curriculum-design/mesh-logic.ts` con comentario de procedencia y tests que fijan la semántica.
- **Alternativas**: importar el archivo del mod (imposible — repos separados); llamar a un endpoint del mod (no existe — la lógica es client-side).
- **Consecuencias**: gana viabilidad y alineación con el patrón de `validations.ts` (reglas frontend-only replicadas); pierde una fuente única (duplicación mitigada por tests).
- **Session**: design (S0)

## Technical reference

**Payloads GraphQL clave** (verificados en el mod, ver teach-intake):

- `planEntry` create: `{ planId, activityId, period, position, categoryId, blockId, credits, kind:'Course' }`
- `planEntry` update: patch parcial `{ credits?, categoryId?, blockId? }` (por id, sin `id` en data)
- Bloque electivo: `objectType: 'rt__Group__requirement'`, `{ ownerType:'curriculum', ownerId: planId, parentId:null, recordType:'Group', effect:'ProgressGate', combinator:'OR', label, minToSatisfy, isHardRule:false, position }`
- Prereqs de una asignatura: `listInstances('requirement', filters=[{ownerType EQUALS 'activity'},{ownerId EQUALS activityId}])`; miembros de un Group = children con `parentId===group.id && recordType==='RecordState'` → `targetId`.
- `EDITABLE_STATUSES = ['Draft']`; `PUBLISHED_STATUSES = ['Active']` (guard MC-09).
- `MeshEntry`: `{ id, activityId?, subjectCode, subjectName, credits, creditsOverride?, inheritedCredits?, period, blockId?, categoryId?, position? }`.
- `nextPosition(entries, period)`: `max(position)+1` en el período, o 0.

**Infra MCP a reusar**: `InstancesApi` (list/get/create/update/delete/versionChain), `resolveReference` (nombre/código → id, tolerante a acentos, desambiguación), `resolveContractInputs` (enums + FKs), patrón `preview→commit` (arg `confirm`), `jsonResult`/`errorResult`/`textResult`, `requireAuth`/`requireWrite`/`ensureCapability`.

## Rules discovered

(se llena durante ejecución)

## Bugs found

(se llena durante ejecución)

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..REQ-11 pasan
- [ ] **Tests**: contract tests (TC-01..TC-13) verdes; smoke con sesión real documentado
- [ ] **NFRs**: n/a (capa MCP, sin targets de performance nuevos)
- [ ] **Rules**: RULE-dev-009 (contratos) respetada; el patrón declarativo se preserva
- [ ] **Integration**: las 26 `cd_*` existentes no se rompen (suite MCP verde)
- [ ] **Docs**: `notExposed`/`about` del pack actualizados con las tools nuevas

## Archiving

Usar `/dkc-archive-spec SPEC-curriculum-design-mcp-mesh-parity "razon"` cuando deje de ser fuente de verdad. NO borrar manualmente.
