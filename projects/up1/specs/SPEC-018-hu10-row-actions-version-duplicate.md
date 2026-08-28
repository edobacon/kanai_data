---
id: SPEC-018-hu10-row-actions-version-duplicate
project: up1
ticket: TICKET-044
status: done
---

# HU-10 — Row actions: versionar (Activity) + duplicar (BibliographyReference + Modalidad), sobre primitivo core enriquecido

# HU-10 — Row actions: versionar (Activity) + duplicar (BibliographyReference + Modalidad), sobre primitivo core enriquecido

> **Nota de cierre (2026-06-03)** — Este spec capturó el alcance inicial (row actions config-only). Durante el smoke E2E (S3) el alcance creció **más allá de este spec**, con aprobación del dev: alineación i18n, modal de confirmación previa al versionado, bloqueo del campo `version`, unicidad por padre, seed con Activity siempre PUB, y **dos fixes del engine de versionado/clonado** (FINDING-V1 deep-clone RT + incremento por linaje, UPONE-1219). La premisa "sin tocar backend" **no se sostuvo**: activar el versionado end-to-end ejercitó el engine y destapó bugs reales. La fuente de verdad del alcance final son el **ticket TICKET-044** (Test cases TC-1..TC-20, Sessions, Backlog) y el **teach-close.html**. Spec cerrado `done`; las expansiones NO se re-incorporaron como REQs formales aquí (registradas en el ticket).

> **Metas de la historia (alcance acordado con el dev)** — tres comportamientos, todos dentro de CD, sin tocar backend:
> 1. **Activity → versionable** ("Crear nueva versión", gated por estado, nace en BOR).
> 2. **BibliographyReference → clonable** ("Duplicar", objeto standalone con lista propia).
> 3. **Modalidad (CurricularSection RT=Modality) → clonable** ("Duplicar", hijo polimorfico via record-list embebido en el detail de Activity).

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: dar al consultor tres comportamientos sobre el primitivo de row action `type:"create"` (HU-7), todos dentro del mod `curriculum-design`: **versionar** una `Activity` (clona + incrementa version, gated por estado), **duplicar** una `BibliographyReference` (copia simple de un objeto standalone) y **duplicar una Modalidad** (`CurricularSection` RT=Modality, hijo polimorfico de Activity, renderizado como `record-list` embebido en el detail). El primitivo ya soporta los casos a nivel config; lo que falta en el motor core es el **toast de exito** (hoy solo hay toast de error), una **mejora de best-practice** (`==`→`===`) en el evaluador de condiciones, y **verificar/cablear** que el primitivo `create` funcione en el `record-list` embebido del RecordDetail (no solo en el RecordList top-level). Mitad **core minima y generica** (`layout/`, beneficia a todo mod) + mitad **config** en el mod (layouts + `prefillFrom`).

**Decisiones criticas que necesitan tu OK** (racional en Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Clone se demuestra en **dos surfaces**: `BibliographyReference` (objeto standalone con `_list`) y **Modalidad** (`CurricularSection` RT=Modality, hijo polimorfico via `record-list` embebido en el detail de Activity) | Cubre clone de objeto standalone Y de hijo polimorfico. Ninguno es workflow-backed → clone sin problema de estado inicial. Modalidad usa el surface embebido (`default_Activity_view.json:154` `type:record-list`); RecordDetail ya pasa `createVisibilityConditions` al embebido — se verifica el wiring del handler en S1 |
| 2 | Activity queda **version-only** (sin boton duplicar sobre Activity misma) | El clone de Activity (objeto con workflow, `currentStatusId` required/excluido) requeriria fix backend; el clone se demuestra en BibliographyReference + Modalidad (sin workflow) que lo evitan |
| 3 | Toast de exito **generico por defecto** (segun `asNewVersion`), override via `onSuccess.notification` | Mantiene el mod en config pura y reusa el contrato que el tipo `mutation` ya tiene |
| 4 | `==`→`===` y `!=`→`!==` en `useFieldConditions.ts`, con la suite de tests como guard | Best practice; el config JSON sigue usando el token `"=="` (enum del DSL; `"==="` no es valido) |

**Riesgos principales y mitigacion**:

- **`==`→`===` cambia la semantica de un evaluador compartido** (todas las visibility/enabled conditions) → mitigacion: correr toda la suite de tests del layout + grep de configs con comparaciones de tipos mixtos antes de cerrar S1; nuestra condicion (`allowsVersioning == true`, booleano) es segura en estricto.
- **El backend podria no incluir `allowsVersioning` en el payload de `currentstatus`** al hidratar → si la visibilidad no resuelve, el boton de versionar no aparece. Mitigacion: S2 verifica el payload hidratado antes del E2E; si falta, documentar gap y escalar.
- **E2E requiere entorno levantado** (object-manager:4000 + postgres + redis + seeds UPU con Activities v1 en PUB/BOR + BibliographyReferences) → S3 valida contra el entorno de Setup; si falta, escalar antes de la acceptance.

**Que NO se hace** (limites explicitos):

- **Mensaje de exito parametrizado** ("Versión N desde N-1") — el mensaje generico cubre el feedback; parametrizar asume campos por-objeto. Diferido (Backlog B2).
- **Cambio backend en object-manager** — innecesario: ningun surface de clone (BibliographyReference, Modalidad) es workflow-backed, asi que el `currentStatusId`-en-clone no aplica. Activity (con workflow) queda version-only.
- **Clone con deepClone profundo de subarboles complejos mas alla de Modalidad** — el clone de Modalidad deepClona su subarbol `parentId`; otros RT de CurricularSection (Session, EvaluationComponent con sub-componentes) NO se abordan aqui.

**Tamano estimado**: 4 sessions (S1 core layout + spike handler embebido, S2 mod config incl. Modalidad, S3 E2E ⚑ fuerte, S4 cierre). La mas riesgosa es S3 (E2E sobre entorno) y la verificacion del handler embebido (S1). SP estimado: 3.

**Como vas a saber que funciona**:

- En la lista de Activity de UPU, una Activity en PUB (`allowsVersioning=true`) muestra "Crear nueva versión"; en BOR no lo muestra.
- Click en "Crear nueva versión" → v2 + redirect a edit + toast de exito.
- En la lista de BibliographyReference, cada fila muestra "Duplicar"; click → copia + redirect a edit + toast de exito.
- En el detail de Activity, la lista embebida de Modalidades muestra "Duplicar" por fila; click → modalidad clonada en el mismo Activity (mismo `ownerId`, `recordType=Modality`, subarbol `parentId` clonado) + toast.
- Un error del backend muestra el toast de error con el codigo traducido.

---

## Purpose

Entregar dos row actions declarativas en el mod `curriculum-design` sobre el primitivo `type:"create"` — "Crear nueva versión" en `Activity` (`prefillFromCurrent + asNewVersion`, gated por `currentstatus.allowsVersioning`) y "Duplicar" en `BibliographyReference` (`prefillFromCurrent`) — habilitando un cambio core minimo y generico en `layout/`: toast de exito en el primitivo `create` + mejora `==`→`===` en el evaluador de condiciones. Ambos comportamientos (version + clone) quedan dentro de CD, sobre entidades con `_list` propia, sin tocar backend.

## Requirements

### REQ-01: Core — toast de éxito en el primitivo `type:"create"`

> **Que cambia**: al crear un registro desde un row action `create` (versionar o duplicar) ahora ves un toast que confirma la accion. Antes redirigia en silencio.
> **Por que**: sin confirmacion el usuario no sabe si la accion ocurrio; el primitivo `mutation` ya da este feedback y `create` no.

El sistema MUST, en `layout/src/composables/useCreateRowAction.ts`, agregar `showSuccess: (message: string) => void` a `CreateRowActionDeps` y, en el path de exito de `createCreateHandler` (tras `createInstance` ok), invocar `deps.showSuccess(message)`. El `message` MUST resolverse asi: si `action.onSuccess?.notification` esta presente, traducir esa clave; si no, usar la clave por defecto segun `asNewVersion` — `recordList.actions.versionCreated` cuando `asNewVersion === true`, `recordList.actions.cloneCreated` en caso contrario. El sistema MUST cablear `showSuccess` en `RecordList.vue` al construir el handler `create` (espejando el handler `mutation` que ya pasa `showSuccess: (msg) => showSuccessNotification(msg)`). El cambio MUST ser aditivo: redirect, refetch y toast de error se preservan.

**Actor**: system
**Layers**: frontend (layout core)

<details><summary>Scenarios de validacion</summary>

#### Scenario: versionar muestra toast por defecto
- **GIVEN** un row action `create` con `asNewVersion: true` sin `onSuccess.notification`
- **WHEN** `createInstance` resuelve ok
- **THEN** se invoca `showSuccess` con la traduccion de `recordList.actions.versionCreated`, y se ejecuta redirect + refetch

#### Scenario: duplicar muestra toast por defecto
- **GIVEN** un row action `create` con `prefillFromCurrent: true` sin `asNewVersion`
- **WHEN** `createInstance` resuelve ok
- **THEN** se invoca `showSuccess` con la traduccion de `recordList.actions.cloneCreated`

#### Scenario: override via onSuccess.notification
- **GIVEN** un row action `create` con `onSuccess.notification: "x.y.z"`
- **WHEN** `createInstance` resuelve ok
- **THEN** se invoca `showSuccess` con la traduccion de `x.y.z`

#### Scenario: error preserva comportamiento (regresion)
- **GIVEN** `createInstance` lanza error con `extensions.code`
- **WHEN** corre el handler
- **THEN** se invoca `showError` con el codigo traducido y NO `showSuccess`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: al crear via un row action `create` aparece un toast de exito; al fallar, el de error como antes.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Toast version | action asNewVersion=true | createInstance ok | showSuccess(versionCreated) | showSuccess con clave version |
| 2 | Toast clone | action prefillFromCurrent | createInstance ok | showSuccess(cloneCreated) | showSuccess con clave clone |
| 3 | Override | action onSuccess.notification | createInstance ok | showSuccess(custom) | showSuccess con clave custom |
| 4 | Regresion error | createInstance throws | handler | showError sin showSuccess | error toast, success no |

### REQ-02: Core — claves i18n de éxito en el bundle RecordList (3 locales)

> **Que cambia**: aparecen dos textos de toast ("Nueva versión creada" / "Registro duplicado") en es_CL/en_CL/pt_BR del bundle RecordList.
> **Por que**: el toast de REQ-01 necesita texto por defecto disponible para cualquier mod sin tocar archivos de mod.

El sistema MUST agregar en `layout/lang/{es_CL,en_CL,pt_BR}@RecordList.json`, bajo `recordList.actions`, las claves `versionCreated` y `cloneCreated` con texto no vacio (es: "Nueva versión creada"/"Registro duplicado"; en: "New version created"/"Record duplicated"; pt: "Nova versão criada"/"Registro duplicado"). Se sincronizan a `suite/lang/*@RecordList.json`. Los labels de boton existentes (`createNewVersion`, `clone`) NO se modifican.

**Actor**: system
**Layers**: frontend (layout core i18n)

<details><summary>Scenarios de validacion</summary>

#### Scenario: claves en 3 locales
- **GIVEN** los 3 bundles RecordList
- **WHEN** se buscan `recordList.actions.versionCreated` y `.cloneCreated`
- **THEN** existen con texto no vacio en los 3 archivos

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el toast muestra el texto correcto al cambiar idioma (es/en/pt).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Claves en 3 locales | bundles es/en/pt | grep versionCreated + cloneCreated | 2 claves por locale | presentes, no vacias |

### REQ-03: Core — best practice de comparacion estricta en `useFieldConditions`

> **Que cambia**: el evaluador de condiciones de visibilidad/habilitacion compara con `===`/`!==` en vez de `==`/`!=`.
> **Por que**: la comparacion laxa (`fieldValue == condition.value`) puede ocultar mismatches de tipo (`1 == true`, `"5" == 5`); estricta es la best practice.

El sistema MUST cambiar en `layout/src/composables/useFieldConditions.ts` los casos `'=='` (de `fieldValue == condition.value` a `===`) y `'!='` (a `!==`). El token del DSL en el config JSON MUST permanecer `"=="`/`"!="` (el enum `ConditionOperator` no define `"==="`; cambiarlo en config romperia el parse). El sistema MUST correr la suite completa de tests del layout como guard de regresion y verificar (grep) que no existan condiciones que dependan de coercion de tipos (config con `value` de tipo distinto al field comparado); si las hubiera, documentarlas antes de cerrar.

**Actor**: system
**Layers**: frontend (layout core)

<details><summary>Scenarios de validacion</summary>

#### Scenario: comparacion estricta booleana
- **GIVEN** una condicion `{ field: "currentstatus.allowsVersioning", operator: "==", value: true }`
- **WHEN** el record tiene `allowsVersioning === true`
- **THEN** la condicion resuelve verdadera (estricto)
- **AND** un record con `allowsVersioning` truthy-no-booleano (ej. `1`) ya NO resuelve verdadera

#### Scenario: regresion de la suite
- **GIVEN** los cambios `===`/`!==`
- **WHEN** corre la suite de tests del layout
- **THEN** pasa sin regresiones (o se documentan los configs afectados)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: la visibilidad por `allowsVersioning` funciona y la suite de tests del layout queda verde.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Estricto booleano | condition == true, field true booleano | evaluar | true | visible |
| 2 | Estricto rechaza coercion | field = 1 (no booleano) | evaluar == true | false | oculto (antes era visible por ==) |
| 3 | Suite layout | cambios aplicados | vitest layout | verde | sin regresiones |

### REQ-04: Mod — Activity version: `default_Activity_list.json` con `relations` + row action versionar

> **Que cambia**: la lista de Activity gana un boton "Crear nueva versión" por fila, visible solo en estados versionables.
> **Por que**: es el comportamiento de versionado pedido por HU-10 para Activity.

El sistema MUST declarar en `mods/curriculum-design/config/layouts/default_Activity_list.json`, **dentro de `layoutConfig`**: `relations: ["currentstatus"]` (lowercase, derivado de `currentStatusId` por `getRelationName`) y un `rowActions` con UNA accion `type:"create"`: `id: "create-new-version"`, `prefillFromCurrent: true`, `asNewVersion: true`, `redirectTo: "edit"`, `languageTag: "recordList.actions.createNewVersion"`, icono, y `visibilityConditions` `{ operator: "AND", conditions: [{ field: "currentstatus.allowsVersioning", operator: "==", value: true }] }`. El filename MUST permanecer PascalCase (RULE-platform-006). `npm run sync` MUST correr sin errores.

**Actor**: consultor (UI) / system (config)
**Layers**: config (mod layout)

<details><summary>Scenarios de validacion</summary>

#### Scenario: row action versionar dentro de layoutConfig
- **GIVEN** `default_Activity_list.json` editado
- **WHEN** se valida el JSON
- **THEN** `layoutConfig.relations` contiene `"currentstatus"` y `layoutConfig.rowActions` tiene la accion `create-new-version` con `asNewVersion: true` y `visibilityConditions` por `currentstatus.allowsVersioning`

#### Scenario: hidratacion de allowsVersioning (multi-capa)
- **GIVEN** `relations: ["currentstatus"]`
- **WHEN** la lista hidrata via `LIST_INSTANCES`
- **THEN** el payload de `currentstatus` incluye `allowsVersioning` (si no, gap del resolver — documentar y escalar)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras `npm run sync`, la lista de Activity de UPU muestra "Crear nueva versión" solo en filas con `allowsVersioning=true`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Shape version action | layout editado | validar JSON | relations + rowAction versionar | currentstatus + asNewVersion + visibility |
| 2 | Hidratacion | relations currentstatus | LIST_INSTANCES | allowsVersioning en payload | presente (o gap documentado) |

### REQ-05: Mod — BibliographyReference clone: `prefillFrom` + row action duplicar

> **Que cambia**: la lista de BibliographyReference gana un boton "Duplicar" por fila que crea una copia editable.
> **Por que**: demuestra el comportamiento de clonado dentro de CD, sobre una entidad con lista propia y sin workflow (clone limpio sin estado).

El sistema MUST declarar en `mods/curriculum-design/objects/BibliographyReference.json`, bajo `metadata`, un bloque `prefillFrom` minimo (`{ "exclude": [] }` o los campos que no deban copiarse; los defaults `id/createdAt/updatedAt/createdBy` ya se excluyen siempre) para documentar que la entidad es clonable. El sistema MUST agregar en `mods/curriculum-design/config/layouts/default_BibliographyReference_list.json`, **dentro de `layoutConfig`**, un `rowActions` con UNA accion `type:"create"`: `id: "duplicate"`, `prefillFromCurrent: true` (sin `asNewVersion`), `redirectTo: "edit"`, `languageTag: "recordList.actions.clone"`, icono, sin `visibilityConditions` de estado. Como BibliographyReference no tiene workflow/`currentStatusId` (required: `institutionId`, `rawCitation` — ambos copiados por el prefill), el clone crea un registro valido sin tocar backend. `npm run sync` MUST correr sin errores.

**Actor**: consultor (UI) / system (config)
**Layers**: config (mod layout + object metadata)

<details><summary>Scenarios de validacion</summary>

#### Scenario: row action duplicar en la lista
- **GIVEN** `default_BibliographyReference_list.json` editado
- **WHEN** se valida el JSON
- **THEN** `layoutConfig.rowActions` tiene `duplicate` con `prefillFromCurrent: true` y SIN `asNewVersion`

#### Scenario: clone copia required fields
- **GIVEN** una BibliographyReference con `institutionId` + `rawCitation`
- **WHEN** se duplica (prefillFrom.source)
- **THEN** la copia incluye `institutionId` + `rawCitation` (no excluidos) y se crea sin error de constraint

</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras `npm run sync`, la lista de BibliographyReference muestra "Duplicar"; al usarlo se crea una copia editable.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Shape clone action | layout editado | validar JSON | rowAction duplicate sin asNewVersion | prefillFromCurrent true |
| 2 | Clone valido | BibRef con required fields | duplicar | copia creada | institutionId+rawCitation copiados, sin error |

### REQ-06: Acceptance E2E — versionar Activity + duplicar BibliographyReference en UPU

> **Que cambia**: los dos flujos quedan validados end-to-end en UPU: version gated en Activity, clone en BibliographyReference, con redirect y toasts.
> **Por que**: prueba integradora de que core (toast) + mod (config) funcionan juntos.

El sistema MUST, en UPU: sobre una Activity v1 en PUB (`allowsVersioning=true`) mostrar "Crear nueva versión" → click produce la v2 (version incrementada, linaje, estado inicial del workflow), redirige a edit y muestra toast de exito; sobre una Activity en estado `allowsVersioning=false` el boton MUST estar oculto. Sobre una BibliographyReference, mostrar "Duplicar" → click crea una copia, redirige a edit y muestra toast de exito. Un error del backend (ej. `SOURCE_NOT_VERSIONABLE`) MUST mostrar el toast de error con el codigo traducido. Se capturan screenshots de los estados relevantes.

**Actor**: consultor
**Layers**: e2e

<details><summary>Scenarios de validacion</summary>

#### Scenario: versionar Activity desde PUB
- **GIVEN** Activity v1 en PUB (`allowsVersioning=true`) en UPU
- **WHEN** click en "Crear nueva versión"
- **THEN** v2 creada con `currentStatusId = workflow.initialStatusId` (= **BOR**, estado inicial — NO hereda PUB), `version` incrementada y `previousVersionId = v1.id`
- **AND** redirect a edit + toast de exito

#### Scenario: Activity en BOR oculta el boton
- **GIVEN** Activity en BOR (`allowsVersioning=false`)
- **WHEN** se abre la lista
- **THEN** "Crear nueva versión" no aparece

#### Scenario: duplicar BibliographyReference
- **GIVEN** una BibliographyReference en UPU
- **WHEN** click en "Duplicar"
- **THEN** copia creada, redirect a edit, toast de exito

</details>

#### Acceptance
**El usuario puede verificar que funciona**: versiona una Activity PUB y duplica una BibliographyReference, viendo redirect + toast; en BOR no ve el boton de versionar.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Version PUB → BOR | Activity v1 PUB | click versionar | v2 en BOR + redirect + toast | version incrementada, currentStatusId=initialStatusId (BOR), previousVersionId=v1.id, edit, toast |
| 2 | Version BOR gating | Activity BOR | abrir lista | boton oculto | no visible |
| 3 | Clone BibRef | BibliographyReference | click duplicar | copia + redirect + toast | copia editable, toast |
| 4 | Error toast | version rechazada | click | toast error | codigo traducido |

### REQ-07: Mod — Modalidad clone: row action en el record-list embebido + prefillFrom en CurricularSection

> **Que cambia**: en el detail de Activity, la lista embebida de Modalidades gana un boton "Duplicar" por fila que crea una copia de esa modalidad dentro del mismo programa.
> **Por que**: demuestra el clone sobre un hijo polimorfico (no solo objeto standalone), cubriendo el caso pedido por el dev.

El sistema MUST verificar (S1, spike) que el primitivo `type:"create"` funcione en el `record-list` embebido del RecordDetail (RecordDetail.vue ya provee `createVisibilityConditions` al embebido, `:316`); si el handler `createCreateHandler` NO esta cableado en el render embebido, el sistema MUST cablearlo (wiring core analogo al de `RecordList.vue`). El sistema MUST agregar, en el field `type:"record-list"` de Modalidades de `default_Activity_view.json` y `default_Activity_edit.json` (objectName `CurricularSection`, filtro `recordType=Modality`), un `rowActions` con una accion `type:"create"`: `id: "duplicate-modality"`, `prefillFromCurrent: true` (sin `asNewVersion`), `redirectTo: "edit"`, `languageTag: "recordList.actions.clone"`, icono. El sistema MUST declarar en `CurricularSection.json`, bajo `metadata`, un `prefillFrom` que **preserve** `ownerType`/`ownerId` (el clon queda en el mismo Activity) y `recordType`, y **deepClone** el subarbol `parentId` (la modalidad puede tener sub-secciones). Como `CurricularSection` NO es workflow-backed (required: `ownerType`, `ownerId`, `recordType`, `name`), el clone no tiene problema de estado inicial. Decidir el manejo de `sourceSectionId` (trazabilidad MADS) y el remapeo de `CurricularLink` si la modalidad participa en links.

**Actor**: consultor (UI) / system (config)
**Layers**: config (mod layout + object metadata) + frontend (verificacion/wiring del handler embebido)

<details><summary>Scenarios de validacion</summary>

#### Scenario: row action duplicar en la lista embebida de modalidades
- **GIVEN** el field `record-list` de Modalidades en `default_Activity_view.json`/`_edit.json` con el rowAction `duplicate-modality`
- **WHEN** se valida el JSON
- **THEN** el rowAction `type:"create"` con `prefillFromCurrent: true` y SIN `asNewVersion` esta presente en el field embebido

#### Scenario: clone preserva owner + recordType + subarbol
- **GIVEN** una Modalidad (CurricularSection recordType=Modality) con `ownerId=ActivityX` y sub-secciones via `parentId`
- **WHEN** se duplica (prefillFrom.source)
- **THEN** la copia tiene `ownerId=ActivityX` (mismo Activity), `recordType=Modality`, y el subarbol `parentId` clonado (deepClone)

#### Scenario: handler embebido operativo
- **GIVEN** el record-list embebido del RecordDetail
- **WHEN** se hace click en "Duplicar" de una modalidad
- **THEN** se ejecuta `createInstance` + redirect + toast (handler cableado; si el spike S1 detecto que faltaba, quedo cableado)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en el detail de una Activity, duplica una Modalidad y obtiene una copia editable en el mismo programa, con su subarbol.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Shape rowAction embebido | view/edit editados | validar JSON | rowAction duplicate-modality en field record-list | prefillFromCurrent sin asNewVersion |
| 2 | Clone preserva owner+RT+subarbol | Modalidad con sub-secciones | duplicar | copia en mismo Activity | ownerId igual, recordType=Modality, parentId deepClonado |
| 3 | Handler embebido | record-list embebido | click duplicar | createInstance+redirect+toast | handler operativo (verificado/cableado en S1) |

## Non-functional requirements

No aplican NFRs especificos (cambio aditivo de UX + config declarativa).

## Artifacts

Sin meta-specs declarados. Secciones ad-hoc.

### Config — row actions (dentro de `layoutConfig`)

| Campo | Activity: versionar | BibliographyReference: duplicar |
|-------|---------------------|----------------------------------|
| layout | `default_Activity_list.json` | `default_BibliographyReference_list.json` |
| `id` | `create-new-version` | `duplicate` |
| `type` | `"create"` | `"create"` |
| `prefillFromCurrent` | `true` | `true` |
| `asNewVersion` | `true` | (ausente) |
| `redirectTo` | `"edit"` | `"edit"` |
| `languageTag` | `recordList.actions.createNewVersion` | `recordList.actions.clone` |
| `visibilityConditions` | `currentstatus.allowsVersioning == true` | (ninguna) |
| `relations` (raiz layoutConfig) | `["currentstatus"]` | (no requiere) |

## Tasks

### Session 1 — Core layout: toast éxito + i18n + === en useFieldConditions + tests [tipo: auto] [tier: T2]

parallel_groups: [[S1.T1, S1.T2, S1.T3]]

> Paralelizable: S1.T1 (`useCreateRowAction.ts`+`RecordList.vue`), S1.T2 (`layout/lang/*`), S1.T3 (`useFieldConditions.ts`) tocan archivos disjuntos, sin dependencia entre si. S1.T5 (spike) corre tras S1.T1 (overlap en `RecordList.vue`); S1.T4 (tests) tras S1.T1+S1.T3.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | En `useCreateRowAction.ts`: agregar `showSuccess` a `CreateRowActionDeps` + emitir toast en path exito (default por `asNewVersion`: `versionCreated`/`cloneCreated`; override `onSuccess.notification`). Cablear `showSuccess` en `RecordList.vue` (handler create, espejo del mutation L2589) | REQ-01 | developer | — | layout/src/composables/useCreateRowAction.ts, layout/src/layouts/RecordList.vue | vitest unit (toast version/clone/override + regresion error); build layout | git revert | DET-5, DET-8, DET-10, DET-11 | pending | 1 |
| S1.T2 | Agregar claves i18n `recordList.actions.versionCreated` + `.cloneCreated` en `layout/lang/{es_CL,en_CL,pt_BR}@RecordList.json` | REQ-02 | developer | — | layout/lang/es_CL@RecordList.json, layout/lang/en_CL@RecordList.json, layout/lang/pt_BR@RecordList.json | grep 2 claves × 3 locales no vacias | git revert | DET-2, DET-8 | pending | 1 |
| S1.T3 | En `useFieldConditions.ts`: `==`→`===` y `!=`→`!==` (casos del switch); grep de configs con comparacion de tipos mixtos; documentar afectados si los hay | REQ-03 | developer | — | layout/src/composables/useFieldConditions.ts | vitest suite layout completa verde; grep configs mixed-type | git revert | DET-5, DET-11, DET-16 | pending | 1 |
| S1.T4 | Extender `useCreateRowAction.spec.ts` con aserciones de `showSuccess` (version/clone/override) + preservar casos existentes; agregar/ajustar test de `useFieldConditions` para estricto booleano | REQ-01, REQ-03 | developer | S1.T1, S1.T3 | layout/src/composables/__tests__/useCreateRowAction.spec.ts | vitest: suite verde; casos nuevos fallan sin el fix | git revert | DET-7, DET-13 | pending | 1 |
| S1.T5 | Spike: verificar que el primitivo `type:"create"` (handler `createCreateHandler`) funcione en el `record-list` embebido del RecordDetail (RecordDetail.vue:316 ya pasa `createVisibilityConditions`). Si NO esta cableado, cablearlo (wiring analogo a `RecordList.vue`). Documentar hallazgo | REQ-07 | developer | S1.T1 | layout/src/layouts/RecordDetail.vue, layout/src/layouts/RecordList.vue | manual + unit: el handler create se invoca desde el record-list embebido; si requirio wiring, test que lo cubre | git revert | DET-4, DET-5, DET-8 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket usando Template de Gate, correr validacion T2 (vitest layout + coverage delta), decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | ticket | gate persistido + decision documentada; vitest layout verde; handler embebido verificado/cableado | (no aplica — cierre de session) | DET-20, DET-23 | pending | 1 |

### Session 2 — Mod config: Activity version + BibliographyReference clone + Modalidad clone + sync [tipo: auto] [tier: T1]

parallel_groups: [[S2.T1, S2.T2, S2.T4]]

> Paralelizable: S2.T1 (`default_Activity_list.json`), S2.T2 (BibliographyReference: object + list), S2.T4 (Modalidad: `default_Activity_view/edit.json` + `CurricularSection.json`) tocan archivos disjuntos, sin dependencia entre si. S2.T3 (`npm run sync` + verificacion de hidratacion) es barrera: corre tras las tres (el sync necesita todos los configs en disco).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Editar `default_Activity_list.json`: `relations: ["currentstatus"]` + rowAction `create-new-version` (asNewVersion + visibility por `currentstatus.allowsVersioning`), dentro de `layoutConfig` | REQ-04 | developer | — | mods/curriculum-design/config/layouts/default_Activity_list.json | JSON valido; shape correcto | git revert | DET-5, DET-8, DET-11, RULE-platform-006 | pending | 2 |
| S2.T2 | Editar `BibliographyReference.json` (metadata.prefillFrom minimo) + `default_BibliographyReference_list.json` (rowAction `duplicate`, prefillFromCurrent sin asNewVersion), dentro de `layoutConfig` | REQ-05 | developer | — | mods/curriculum-design/objects/BibliographyReference.json, mods/curriculum-design/config/layouts/default_BibliographyReference_list.json | JSON valido; shape correcto | git revert | DET-5, DET-8, DET-11 | pending | 2 |
| S2.T3 | Barrera: `npm run sync` (propaga los 3 configs) + verificar (multi-capa, DET-5) que `LIST_INSTANCES` con `relations:["currentstatus"]` expone `allowsVersioning` en el payload hidratado de Activity; si falta, documentar gap y escalar | REQ-04 | developer | S2.T1, S2.T2, S2.T4 | mods/curriculum-design/ (sync), object-manager resolvers (lectura) | `npm run sync` exit 0; payload con allowsVersioning confirmado | git revert | DET-4, DET-5, DET-10 | pending | 2 |
| S2.T4 | Modalidad clone: agregar rowAction `duplicate-modality` (`type:create`, `prefillFromCurrent` sin asNewVersion) al field `record-list` de Modalidades en `default_Activity_view.json` + `default_Activity_edit.json`; declarar `metadata.prefillFrom` en `CurricularSection.json` que preserve `ownerType/ownerId` + `recordType` y deepClone el subarbol `parentId` | REQ-07 | developer | — | mods/curriculum-design/config/layouts/default_Activity_view.json, mods/curriculum-design/config/layouts/default_Activity_edit.json, mods/curriculum-design/objects/CurricularSection.json | JSON valido; rowAction en field embebido; prefillFrom con deepClone | git revert | DET-5, DET-8, DET-11 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T1)** — persistir resultados en `## Sessions` del ticket usando Template de Gate, correr validacion T1 (sync + lint), decidir continue/iterate/escalate/standby | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + decision documentada; sync verde + hidratacion confirmada | (no aplica — cierre de session) | DET-20, DET-23 | pending | 2 |

### Session 3 — Smoke E2E: versionar Activity + duplicar BibliographyReference + duplicar Modalidad en UPU [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Smoke E2E en UPU: (a) Activity PUB muestra "Crear nueva versión" → v2 en BOR + redirect + toast; Activity BOR oculta el boton; (b) BibliographyReference muestra "Duplicar" → copia + redirect + toast; (c) en el detail de Activity, lista embebida de Modalidades muestra "Duplicar" → copia en mismo Activity (recordType=Modality, subarbol) + redirect/refresh + toast; error → toast con codigo. Screenshots al subdir del ticket | REQ-06, REQ-07 | developer | S1.GATE, S2.GATE | mods/curriculum-design/ (entorno UPU), suite | T3: smoke E2E + screenshots sobre entorno (object-manager:4000 + postgres + redis + seeds UPU) | (no aplica — verificacion) | DET-5, DET-8, DET-10, DET-13 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** — persistir resultados + screenshots en `## Sessions` del ticket usando Template de Gate, correr validacion T3, decidir continue/iterate/escalate/standby | — | reviewer | S3.T1 | ticket | gate persistido + decision documentada; ambos flujos verdes + screenshots | (no aplica — cierre de session) | DET-20, DET-23 | pending | 3 |

### Session 4 — Cierre: commits DET-27 (split core + mod + dkc) + teach-close + SP + backlog [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Commits granulares por tipo (DET-27): core en `UPONE-1206` (layout: primitivo + i18n + useFieldConditions + RecordDetail si hubo wiring + tests), mod en `UPONE-1038` (default_Activity_list/view/edit.json + default_BibliographyReference_list.json + BibliographyReference.json + CurricularSection.json) + repo dkc; teach-close (DET-22); SP executed; Backlog: solo "mensaje exito parametrizado" (B2) — Modalidad clone YA en scope (REQ-07) | — | reviewer | S3.GATE | layout/ (UPONE-1206), mods/curriculum-design/ (UPONE-1038), ticket dkc | commits validados; teach-close present; SP + backlog registrados | (no aplica — cierre de session) | DET-19, DET-20, DET-22, DET-27 | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T1)** — persistir cierre en `## Sessions` del ticket usando Template de Gate, correr validacion T1, decidir continue/close | — | reviewer | S4.T1 | ticket | gate persistido + decision documentada; cierre listo | (no aplica — cierre de session) | DET-20, DET-23 | pending | 4 |

### Task contract

```
Task S1.T1: Core — toast de exito en primitivo create
- source_ref: REQ-01
- agent: developer
- files: layout/src/composables/useCreateRowAction.ts, layout/src/layouts/RecordList.vue
- precondition: primitivo type:"create" (HU-7) presente; showSuccessNotification disponible en RecordList.vue
- expected_output: showSuccess en deps + toast en exito (default por asNewVersion; override onSuccess.notification); wiring en RecordList.vue; cambio aditivo
- validation: vitest unit (toast version/clone/override + regresion error) + build
- rollback: git revert
- rules: [DET-5, DET-8, DET-10, DET-11]
```

```
Task S1.T3: Core — comparacion estricta en useFieldConditions
- source_ref: REQ-03
- agent: developer
- files: layout/src/composables/useFieldConditions.ts
- precondition: suite de tests del layout disponible como guard
- expected_output: casos '==' y '!=' usan ===/!==; grep de configs mixed-type sin sorpresas (o documentadas); token del DSL en config intacto ("==")
- validation: vitest suite layout completa verde
- rollback: git revert
- rules: [DET-5, DET-11, DET-16]
```

```
Task S2.T1: Mod — Activity version row action
- source_ref: REQ-04
- agent: developer
- files: mods/curriculum-design/config/layouts/default_Activity_list.json
- precondition: primitivo create (S1) — los botones funcionan aun sin el toast (aditivo)
- expected_output: layoutConfig con relations:["currentstatus"] + rowAction create-new-version (asNewVersion + visibility allowsVersioning); filename PascalCase
- validation: JSON valido
- rollback: git revert
- rules: [DET-5, DET-8, DET-11, RULE-platform-006]
```

```
Task S2.T2: Mod — BibliographyReference clone
- source_ref: REQ-05
- agent: developer
- files: mods/curriculum-design/objects/BibliographyReference.json, mods/curriculum-design/config/layouts/default_BibliographyReference_list.json
- precondition: BibliographyReference sin workflow (clone es config puro)
- expected_output: metadata.prefillFrom minimo + rowAction duplicate (prefillFromCurrent sin asNewVersion); clone copia institutionId+rawCitation
- validation: JSON valido
- rollback: git revert
- rules: [DET-5, DET-8, DET-11]
```

```
Task S3.T1: Smoke E2E — versionar Activity + duplicar BibliographyReference
- source_ref: REQ-06
- agent: developer
- files: mods/curriculum-design/ (entorno UPU), suite
- precondition: S1.GATE + S2.GATE cerradas; entorno levantado (object-manager:4000 + postgres + redis + seeds UPU con Activities v1 PUB/BOR + BibliographyReferences)
- expected_output: Activity PUB versiona (v2+redirect+toast), BOR oculta boton; BibliographyReference duplica (copia+redirect+toast); error→toast codigo; screenshots
- validation: T3 smoke E2E + screenshots
- rollback: (no aplica — verificacion)
- rules: [DET-5, DET-8, DET-10, DET-13]
```

## Constraints

- RULE-dev-004: el trabajo `layer:core` (primitivo + i18n + useFieldConditions en `layout/`) va en `UPONE-1206`; el `layer:mod` (config en `mods/curriculum-design/`) va en `UPONE-1038`. Commits con id externo (UPONE-1216). Merge a develop gated por revision del team up1.
- RULE-platform-006: layout filename PascalCase (`default_Activity_list.json`, `default_BibliographyReference_list.json`).
- DEC-LOCAL-01..04 (ver Decisions).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Primitivo `type:"create"` (HU-7 / TICKET-042) | internal | createInstance + prefillFromCurrent/asNewVersion/redirect/visibility | Cerrado (042); el toast es aditivo |
| Adopcion versionamiento Activity (HU-8 / TICKET-043, SPEC-017) | internal | allowsVersioning en workflows + seed UPU + motor que crea la v2 | Cerrado (043); el E2E de version depende de sus seeds |
| Backend hidratacion de `currentstatus` (LIST_INSTANCES relations) | internal | Debe exponer `allowsVersioning` en el payload de la relacion | Si no lo expone, la visibilidad del boton versionar no resuelve (S2.T3 lo verifica) |
| Entorno UPU levantado | internal | Necesario para el E2E (S3) | Sin entorno, no se valida la acceptance — escalar |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `==`→`===` cambia semantica de un evaluador compartido | medium | Regresion silenciosa en visibility/enabled de otros layouts que dependan de coercion | Suite completa de tests del layout como guard + grep de configs con comparacion de tipos mixtos antes de cerrar S1; nuestra condicion booleana es segura en estricto |
| El resolver no incluye `allowsVersioning` en el payload de `currentstatus` | medium | El boton versionar nunca aparece | S2.T3 verifica el payload hidratado ANTES del E2E; si falta, documentar gap y escalar |
| El cambio core toca un primitivo compartido (todos los RecordList) | low | Regresion en otros row actions create | Cambio aditivo (nueva dep + toast en exito); test extendido fija lo nuevo y preserva redirect/refetch/error |
| E2E requiere entorno completo | medium | No se valida la acceptance | Setup documenta el entorno; si falta, escalar antes de marcar acceptance |
| El handler `create` NO esta cableado en el record-list embebido del RecordDetail (solo en RecordList top-level) | medium | El boton "Duplicar" de Modalidad no ejecuta createInstance | Spike S1.T5 lo verifica ANTES de la config; si falta, se cablea (wiring analogo a RecordList.vue) en S1 (core) — convierte REQ-07 de config-only a config+wiring chico |
| Clone de Modalidad no deepClona el subarbol `parentId` o no preserva owner | medium | Copia incompleta o huerfana | `prefillFrom` en CurricularSection.json con deepClone del subarbol + preservar ownerType/ownerId/recordType (S2.T4); E2E S3 verifica subarbol + ownerId |

## Open questions

- [ ] ¿`LIST_INSTANCES` con `relations:["currentstatus"]` incluye `allowsVersioning` en el payload de la relacion? — se resuelve en S2.T3 (bloqueante para la visibilidad del boton versionar). Mover a Decisions cuando se confirme.

## Decisions

### DEC-LOCAL-01: clone se demuestra en BibliographyReference (standalone) + Modalidad (hijo polimorfico)
- **Contexto**: el dev pidio clone sobre el hijo polimorfico Modalidad; y/o sobre BibliographyReference si vive en el mod; ambos comportamientos dentro de CD.
- **Drivers**: BibliographyReference tiene `_list` propia, vive en CD, sin workflow → clone config puro. Modalidad (CurricularSection RT=Modality) NO tiene `_list` standalone, PERO se renderiza como field `type:"record-list"` embebido en el detail de Activity (`default_Activity_view.json:154`), y RecordDetail ya provee `createVisibilityConditions` al embebido (`RecordDetail.vue:316`) → el primitivo `create` aplica en esa superficie. Ninguno es workflow-backed.
- **Opcion elegida**: clone en AMBOS — BibliographyReference (REQ-05) y Modalidad via el record-list embebido (REQ-07), con un spike en S1 que verifica/cablea el handler embebido.
- **Alternativas**: (a) solo BibliographyReference, Modalidad diferida — descartada (el dev pidio incorporar Modalidad, y resulto mayormente config); (b) clone en Activity — descartada (objeto con workflow; `currentStatusId`-en-clone requeriria fix backend, ver DEC-LOCAL-02).
- **Consecuencias**: tres comportamientos en CD sin tocar backend; el unico riesgo core es el wiring del handler en el record-list embebido (spike S1.T5). Se cubre clone de objeto standalone Y de hijo polimorfico.
- **Session**: cerrada en design (pre-S1).

### DEC-LOCAL-02: Activity version-only (sin boton duplicar)
- **Contexto**: la version inicial del design ponia version + duplicar ambos en Activity.
- **Drivers**: clonar un objeto con workflow (`currentStatusId` required, excluido del prefill) fallaba/necesitaba fix backend; mover el clone a BibliographyReference (sin workflow) lo evita.
- **Opcion elegida**: Activity solo "Crear nueva versión".
- **Alternativas evaluadas** (para clonar Activity, que tiene workflow):
  - **B1 — fix backend (correcto)**: el path clone resuelve `currentStatusId = workflow.initialStatusId` (simetrico al path version). El clon arranca en estado inicial. Correcto pero requiere tocar object-manager.
  - **B2 — config-only: quitar `currentStatusId` del `prefillFrom.exclude`** → el clon heredaria el `currentStatusId` del source. **Descartada**: un duplicado de un programa **publicado** no debe nacer publicado; debe arrancar en estado inicial (editable). Heredar el estado es semanticamente incorrecto.
  - **B3 — mover el clone a BibliographyReference (elegida globalmente, DEC-LOCAL-01)**: sin workflow → el problema de `currentStatusId`-en-clone no aplica; ni B1 ni B2 son necesarios.
- **Consecuencias**: se elimina el scope backend (object-manager) y el fix `version`-exclude en activity.json. La regla "clone de objeto con workflow arranca en estado inicial, no hereda" queda como learn L1 del ticket (candidata a RULE) para el futuro "Modalidad clone" — que SI clonaria un objeto potencialmente workflow-backed y deberia usar B1, no B2.
- **Session**: cerrada en design (pre-S1).

### DEC-LOCAL-03: toast de éxito genérico por defecto + override via onSuccess.notification
- **Contexto**: el primitivo create no emitia toast de exito; el dev pidio que el mod sea lo mas simple posible.
- **Drivers**: feedback gratis a todo mod sin config; reusar `onSuccess.notification` (ya existe para el tipo `mutation`).
- **Opcion elegida**: default keyed por `asNewVersion` (`versionCreated`/`cloneCreated`); override opcional via `onSuccess.notification`.
- **Alternativas**: requerir siempre la clave (no "simple"); campo nuevo (duplica `onSuccess.notification`).
- **Consecuencias**: API consistente con `mutation`; mod en config pura.
- **Session**: cerrada en design (pre-S1).

### DEC-LOCAL-04: comparacion estricta (===) en useFieldConditions; token "==" en config
- **Contexto**: el dev observo que `useFieldConditions.ts:65-66` usa `==` laxo.
- **Drivers**: best practice (evitar coercion `1==true`, `"5"==5`); pero el token del DSL en el config JSON es `"=="` y `"==="` no esta en el enum `ConditionOperator`.
- **Opcion elegida**: cambiar la IMPLEMENTACION a `===`/`!==`; mantener el TOKEN `"=="`/`"!="` en config; guard con la suite de tests + grep de mixed-type.
- **Alternativas**: dejar `==` (rechazada por el dev); cambiar tambien el token a `"==="` (descartada — romperia el parse del DSL).
- **Consecuencias**: evaluador mas estricto; riesgo de regresion en configs que dependian de coercion (mitigado por tests + grep).
- **Session**: cerrada en design (pre-S1).

## Success metrics

No aplican metricas de negocio/sistema post-deploy especificas (UX + config; validacion via acceptance E2E).

## Technical reference

Shapes confirmados contra el repo real:

### RowAction `type:"create"` (real)

`layout/src/types/recordlist.ts:46-219`. Campos: `id` (requerido), `label`, `languageTag` (clave i18n; `label` es fallback), `icon`, `visibilityConditions` (`ConditionGroup`), `type:"create"`, `prefillFromCurrent`, `asNewVersion`, `redirectTo:'edit'|'view'`, `onSuccess?:{ refetch?, notification? }` (reusado para el toast). `rowActions` vive en `layoutConfig` (`RecordListConfig.rowActions`, recordlist.ts:610), NO en la raiz. El handler create se cablea en `RecordList.vue` (`createCreateHandler`, ~L2412/2610). `ChibiList.vue` tiene plumbing de `rowActions` (getRowActions/handleRowAction) pero NO el handler `create`.

### Surface embebida del RecordDetail (Modalidad)

Modalidad NO tiene `_list` standalone, pero se renderiza como field `type:"record-list"` embebido en el detail de Activity (`default_Activity_view.json:154`, `default_Activity_edit.json:99` — objectName `CurricularSection`, filtro `recordType=Modality`). `RecordDetail.vue:316` provee contexto a los record-list embebidos **incluyendo `createVisibilityConditions`** → el primitivo `create` esta plumbeado para el embebido. El spike S1.T5 confirma que el handler `createCreateHandler` se invoca desde el render embebido (o lo cablea si falta). `CurricularSection`: required `["ownerType","ownerId","recordType","name"]` — sin workflow → clone sin problema de estado inicial; tiene `parentId` (jerarquia self-FK) y `sourceSectionId` (MADS).

### Nombre de relacion: `currentstatus` (lowercase)

`getRelationName` (instance.resolver.js): `fkFieldName.replace(/Id\d*$/, '').toLowerCase()`. `currentStatusId` → `currentstatus`. Precedente: `hwAssessmentId` → `hwassessment` (`hw-intervention-list.json:19`). Visibilidad: `"field": "currentstatus.allowsVersioning"`.

### Toast de exito — diff core (REQ-01)

```ts
// useCreateRowAction.ts — CreateRowActionDeps
showSuccess: (message: string) => void;   // <- NUEVO

// path de exito de createCreateHandler, tras redirect/refetch:
const key = action.onSuccess?.notification
  ?? (action.asNewVersion ? 'recordList.actions.versionCreated' : 'recordList.actions.cloneCreated');
const translated = deps.$t(key);
deps.showSuccess(translated !== key ? translated : deps.$t('recordList.actions.created'));
```

```vue
<!-- RecordList.vue — create handler deps (~L2619), espejo del mutation handler (L2589) -->
showSuccess: (msg: string) => showSuccessNotification(msg),  // <- NUEVO (hoy solo showError)
```

### `==`→`===` (REQ-03)

```ts
// useFieldConditions.ts — switch(condition.operator)
case '==': return fieldValue === condition.value;   // antes: ==
case '!=': return fieldValue !== condition.value;   // antes: !=
```

### Clone en BibliographyReference (sin workflow → config puro)

`BibliographyReference.json` required: `["institutionId", "rawCitation"]` (sin workflow/currentStatusId/version). El clone (prefillFrom sin asNewVersion) copia los no-excluidos (incluye institutionId + rawCitation) → registro valido sin backend. Default exclude del motor: `id/createdAt/updatedAt/createdBy`.

### Config objetivo

```json
// default_Activity_list.json → layoutConfig
"relations": ["currentstatus"],
"rowActions": [
  { "id": "create-new-version", "type": "create", "prefillFromCurrent": true, "asNewVersion": true,
    "redirectTo": "edit", "languageTag": "recordList.actions.createNewVersion", "icon": "bi-arrow-clockwise",
    "visibilityConditions": { "operator": "AND", "conditions": [
      { "field": "currentstatus.allowsVersioning", "operator": "==", "value": true } ] } }
]

// default_BibliographyReference_list.json → layoutConfig
"rowActions": [
  { "id": "duplicate", "type": "create", "prefillFromCurrent": true,
    "redirectTo": "edit", "languageTag": "recordList.actions.clone", "icon": "bi-files" }
]
```

## Rules discovered

{Se llena durante ejecucion.}

## Bugs found

{Se llena durante ejecucion.}

## Acceptance checkpoints

- [ ] **Funcional**: REQ-01..REQ-07 verificados — toast core (unit) + === (unit) + handler embebido (spike) + version Activity (config) + clone BibliographyReference (config) + clone Modalidad (config + embebido) + E2E los tres
- [ ] **Tests**: `useCreateRowAction.spec.ts` (toast version/clone/override + regresion error) + `useFieldConditions` estricto + (si hubo wiring embebido) test que lo cubre + suite layout verde + E2E smoke S3
- [ ] **NFRs**: no aplican (n/a)
- [ ] **Rules**: RULE-dev-004 (core UPONE-1206 / mod UPONE-1038) + RULE-platform-006 (PascalCase) respetadas
- [ ] **Integration**: `==`→`===` sin regresion en la suite del layout; el cambio del primitivo no rompe otros row actions create; el wiring embebido (si lo hubo) no rompe RecordDetail; sync del mod sin errores
- [ ] **Docs**: Backlog con "mensaje exito parametrizado" (B2); learn L1 (derivados de objeto con workflow arrancan en estado inicial)

## Archiving

Una spec se archiva cuando deja de ser fuente de verdad. Usar `/dkc-archive-spec SPEC-id "razon"`. NO borrar manualmente.
