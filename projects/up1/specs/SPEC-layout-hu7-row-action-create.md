---
id: SPEC-layout-hu7-row-action-create
project: up1
ticket: TICKET-042
status: done
---

# SPEC — HU-7: Row action `type: "create"` (primitivo declarativo de clonación/versionamiento en layout)

# SPEC — HU-7: Row action `type: "create"` (primitivo declarativo de clonación/versionamiento en layout)

## Executive summary — lo que estas aprobando

> *Diseñada para revision rapida. El detalle vive en Requirements y Tasks.*

**Que se quiere**: un tipo nuevo de row action declarativo en `layout` — `type: "create"` — que permite, desde una fila de una lista, crear una instancia nueva opcionalmente **precargada desde esa fila** (`prefillFromCurrent`) y opcionalmente **como nueva version** (`asNewVersion`). Dos flags ortogonales cubren dos casos sin componentes a mano: **"Crear nueva version"** (`create + prefillFromCurrent + asNewVersion`) y **"Clonar"** (`create + prefillFromCurrent`). El cambio es **aditivo**: no toca los tipos existentes (`modal`/`mutation`/`download-template`/`import-template`/`multiSelectPicker`).

**Hallazgo del intake que ajusta el alcance** (verificado contra el codigo, ver Learns L1-L5 del ticket):
- El **SDL de `createInstance` NO cambia**. `prefillFrom` y `asNewVersion` viajan **dentro de `data: JSON!`** (HU-1 DEC-LOCAL-02; HU-3 fila 1): `data.prefillFrom = { source }`, `data.asNewVersion = true`. La firma de mutation que el frontend ya usa (`createInstance(objectType: $objectType, data: $data)`, p.ej. `useEnrollment.ts:54`, `useRecurrenceCreation.ts:49`) **ya soporta el shape** — el handler solo construye el `data`.
- **Ningun path del frontend pasa hoy `prefillFrom`/`asNewVersion`** (grep en `layout/src`+`suite` = 0). HU-7 es el primer consumer frontend del versionamiento backend.
- El dispatcher real vive en `RecordList.vue:~2436-2605` (no 2205-2306; el archivo evoluciono). Cada rama `if (action.type===…)` **retorna una accion enriquecida** `{...action, handler, isVisible, isEnabled}` — no ejecuta inline. El caso `create` construye un `handler` closure igual que `mutation`/`modal`.
- La visibilidad por config **ya funciona sin codigo nuevo**: `isActionVisible` (`useRowActionHandler.ts:147-165`) → `evaluateGroup` (`useFieldConditions`) con dot-notation (`getNestedValue` split por `.`), y la lista hidrata relaciones leyendo `layoutConfig.relations` (`useDataFetching.ts:126-135`, manda `includeRelations:true, relations`). Precedente real: `hw-intervention-list.json` declara `relations` en la raiz de `layoutConfig`.

**Decisiones criticas** (racional en Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| A | `type: "create"` como **primitivo declarativo** con flags ortogonales `prefillFromCurrent`/`asNewVersion` (D23) — no reusar `type: "mutation"` ni crear dos tipos separados | Un solo tipo cubre versionar y clonar por composicion de flags; evita duplicar logica y argsMapping a mano. |
| B | El handler ejecuta `createInstance` **directo (sin modal)** con los flags **dentro de `data`** (DEC-LOCAL-01) | El AC del ticket exige "sin modal" para `increment`; el SDL no cambia; consistente con HU-1/HU-3. El modal de captura de valor llega con `user-provided` en SP4. |
| C | **Visibilidad por config en la raiz del config de la lista** (`relations: ["currentStatus"]` + `visibilityConditions` por `currentStatus.allowsVersioning`), no por codigo nuevo (DEC-LOCAL-02) | `relations` NO es campo de `RowAction` (solo de `CalendarViewConfig`); la hidratacion es responsabilidad de la lista. El mecanismo de evaluacion ya existe. |
| D | Handler factory en composable testeable (`createCreateHandler`/equivalente) + unit tests, en vez de logica inline en el `.vue` (DEC-LOCAL-03) | La build del `data` y la decision redirect/error son la unica logica nueva; aislarla la hace testeable sin montar el componente. |

**Riesgos principales y mitigacion**:
- *Romper los otros row actions / el tipado* (las 2 definiciones del union desincronizadas) → REQ-PRESERVE-05 + typecheck verde; el cambio agrega `'create'` a ambos literales y un caso al final del dispatcher, sin tocar los previos.
- *La visibilidad no funciona end-to-end con datos hidratados* (la hipotesis central) → S3 gate ⚑ fuerte: unit de `evaluateGroup` sobre `currentStatus.allowsVersioning` + smoke en storybook con un Activity con `allowsVersioning` true/false.
- *El handler no encuentra como redirigir / mostrar error* → reusar el mecanismo existente (`openModal` mode edit/view como `handleModify`; `showErrorNotification`).

**Que NO se hace**:
- NO se cambia el SDL ni el resolver de `createInstance` (backend ya soporta `data.prefillFrom`/`data.asNewVersion` por HU-1/HU-3).
- NO se abre modal para `increment` (sin captura de valor en SP3).
- NO se toca el codigo de los tipos `modal`/`mutation`/`download-template`/`import-template`/`multiSelectPicker`.
- NO se implementa la strategy `user-provided` (SP4).

**Tamaño estimado**: 2-3 SP · 5 sessions livianas. La mas riesgosa: **S3** (visibilidad declarativa end-to-end) — gate fuerte.

**Como vas a saber que funciona**: (a) typecheck verde con `create` en ambas definiciones; (b) el handler arma `data.prefillFrom = { source: rowId }` y agrega `data.asNewVersion = true` solo si el flag lo pide; (c) exito → redirect a `redirectTo`, fallo → toast con error code; (d) el boton aparece solo cuando `currentStatus.allowsVersioning == true` (unit + smoke storybook); (e) los otros row actions y ChibiList no rompen.

## Purpose

Exponer un **primitivo declarativo de creacion/clonacion/versionamiento** en las listas de `layout`: cualquier mod puede ofrecer "Crear nueva version" o "Clonar" agregando un row action `type: "create"` en su JSON de config, sin escribir componentes, handlers ni `argsMapping` a mano. **Actor**: dev de mod / consumidor de layouts declarativos. **Valor**: cierra el lado frontend de la capacidad de versionamiento de SP3 (epica UPONE-1206), apoyandose en el backend ya construido por HU-1/HU-3, manteniendo el layout 100% declarativo.

## Requirements

### REQ-01: Tipo `create` en las DOS definiciones del union

> **Que cambia**: aparece un nuevo `type: "create"` reconocido por el sistema de tipos en ambos lugares donde se declara el row action.
> **Por que**: hay dos definiciones (`RowAction` y `EnhancedRowAction`); si solo se actualiza una, el tipo nuevo no queda bien tipado y rompe `RecordList`/`ChibiList`.

El sistema MUST agregar el literal `'create'` al `type?` de `RowAction` (`layout/src/types/recordlist.ts:68`) y al `type?` de `EnhancedRowAction` (`layout/src/composables/useRowActionHandler.ts:~24`). MUST agregar las props opcionales del primitivo: `prefillFromCurrent?: boolean` (default conceptual `false`), `asNewVersion?: boolean` (default `false`, semanticamente requiere `prefillFromCurrent`), `redirectTo?: 'edit' | 'view'` (default `edit`). Las props `label`, `icon`, `visibilityConditions` ya existen en `RowAction` y se reusan.

<details><summary>Scenarios de validacion</summary>

#### Scenario: typecheck reconoce create
- **GIVEN** un row action `{ type: 'create', prefillFromCurrent: true, asNewVersion: true, label, redirectTo: 'edit' }`
- **WHEN** se compila `layout` (`vue-tsc`/`tsc`)
- **THEN** no hay error de tipos en `RowAction` ni `EnhancedRowAction`

#### Scenario: los tipos existentes siguen validos
- **GIVEN** los row actions `modal`/`mutation`/`download-template`/`import-template`/`multiSelectPicker` existentes
- **WHEN** se compila
- **THEN** ninguno cambia de tipado (cambio puramente aditivo)

</details>

**Acceptance**: `create` tipado en ambas definiciones con `prefillFromCurrent`/`asNewVersion`/`redirectTo`; typecheck verde en consumers.

### REQ-02: Caso `create` aditivo en el dispatcher de RecordList

> **Que cambia**: al hacer click en un row action `create`, el sistema ejecuta una creacion con los flags pedidos; los otros tipos quedan intactos.
> **Por que**: el dispatcher es una cadena de `if` sin exhaustividad; agregar un caso al final es seguro.

El sistema MUST agregar una rama `if (action.type === 'create')` al dispatcher de `RecordList.vue` (~linea 2603, antes del fallthrough), que retorna la accion enriquecida `{ ...action, handler, isVisible, isEnabled }` siguiendo el mismo patron que `mutation`/`modal` (visibilidad via `isActionVisible` cuando hay `visibilityConditions`/`requiredCapability`). MUST NOT modificar las ramas existentes.

<details><summary>Scenarios de validacion</summary>

#### Scenario: create produce handler
- **GIVEN** un row action `type: 'create'`
- **WHEN** el dispatcher procesa la accion
- **THEN** la accion enriquecida tiene un `handler` funcional y respeta `visibilityConditions` via `isActionVisible`

#### Scenario: otros tipos intactos
- **GIVEN** una lista con row actions `modal` y `mutation`
- **WHEN** se procesa el dispatcher tras agregar `create`
- **THEN** `modal`/`mutation` se enriquecen exactamente como antes

</details>

**Acceptance**: rama `create` aditiva; otros tipos sin cambio de comportamiento.

### REQ-03: Handler invoca `createInstance(prefillFrom + asNewVersion)` sin modal

> **Que cambia**: el handler arma el `data` con `prefillFrom.source = <id de la fila>` y, si corresponde, `asNewVersion: true`, y ejecuta `createInstance` directo (sin abrir modal).
> **Por que**: el AC exige "sin modal" para `increment`; el backend ya acepta los flags dentro de `data`.

El sistema MUST, al disparar la accion `create`:
1. Construir `data = {}`; si `action.prefillFromCurrent` → `data.prefillFrom = { source: getRowId(record) }`; si `action.asNewVersion` → `data.asNewVersion = true`.
2. Ejecutar la mutation `createInstance(objectType: $objectType, data: $data)` via `apolloClient` (sin abrir modal de captura). `$objectType` = objeto de la lista (`props.objectName` / `canCreateObjectName` si aplica).
3. En exito → navegar al registro nuevo segun `redirectTo` (`edit` por defecto → abrir el editor del id creado, mismo mecanismo que `handleModify`/`openModal mode:'edit'`; `view` → modo view).
4. En fallo → `showErrorNotification` con el error code devuelto por el backend (Ladrillo 2: `AS_NEW_VERSION_REQUIRES_PREFILL`, `OBJECT_NOT_VERSIONABLE`, `SOURCE_NOT_VERSIONABLE`, `WORKFLOW_HAS_NO_INITIAL_STATUS`, `PREFILL_SOURCE_NOT_FOUND`).

La logica de construccion de `data` + decision redirect/error MUST vivir en un helper/composable testeable, no inline en el `.vue`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: crear nueva version
- **GIVEN** `action = { type:'create', prefillFromCurrent:true, asNewVersion:true }` y `record.id = 'ACT-1'`
- **WHEN** se dispara el handler
- **THEN** se ejecuta `createInstance` con `data = { prefillFrom: { source: 'ACT-1' }, asNewVersion: true }`

#### Scenario: clonar (sin asNewVersion)
- **GIVEN** `action = { type:'create', prefillFromCurrent:true }` y `record.id = 'ACT-1'`
- **WHEN** se dispara el handler
- **THEN** `data = { prefillFrom: { source: 'ACT-1' } }` (sin `asNewVersion`)

#### Scenario: exito redirige
- **GIVEN** una creacion exitosa que devuelve `{ id: 'ACT-2' }` y `redirectTo` ausente
- **WHEN** resuelve la mutation
- **THEN** se navega al editor de `ACT-2` (default `edit`)

#### Scenario: error muestra toast
- **GIVEN** el backend rechaza con `SOURCE_NOT_VERSIONABLE`
- **WHEN** falla la mutation
- **THEN** se invoca `showErrorNotification` con ese error code y NO se navega

</details>

**Acceptance**: unit del helper cubre los 4 scenarios (version/clon/redirect/error) con assertions concretas sobre el `data` construido y el branch redirect/error.

### REQ-04: Visibilidad declarativa por config (sin codigo nuevo)

> **Que cambia**: el boton aparece solo cuando la fila lo permite, configurado por JSON — no por codigo.
> **Por que**: la visibilidad por flag relacionado ya es soportada; HU-7 solo la usa y la documenta.

El sistema MUST permitir ocultar/mostrar el row action `create` declarando, **en la raiz del config de la lista** (`layoutConfig.relations`), `relations: ["currentStatus"]` para hidratar la relacion, y en el row action `visibilityConditions: { operator:'AND', conditions:[{ field:'currentStatus.allowsVersioning', operator:'==', value:true }] }`. La evaluacion reusa `isActionVisible` → `evaluateGroup` → `getNestedValue` (dot-notation) ya existentes; no se agrega codigo de evaluacion. MUST documentarse el patron (precedente `hw-intervention-list.json`).

<details><summary>Scenarios de validacion</summary>

#### Scenario: oculto cuando allowsVersioning false
- **GIVEN** una fila con `currentStatus.allowsVersioning === false` y un row action create con la `visibilityConditions` de arriba
- **WHEN** se evalua `isActionVisible(action, record)`
- **THEN** retorna `false` (boton oculto)

#### Scenario: visible cuando allowsVersioning true
- **GIVEN** una fila con `currentStatus.allowsVersioning === true`
- **WHEN** se evalua `isActionVisible(action, record)`
- **THEN** retorna `true` (boton visible)

#### Scenario: relacion hidratada por config
- **GIVEN** `layoutConfig.relations = ["currentStatus"]`
- **WHEN** `useDataFetching` arma las variables de `LIST_INSTANCES`
- **THEN** incluye `includeRelations: true, relations: ["currentStatus"]`

</details>

**Acceptance**: unit de `evaluateGroup`/`isActionVisible` sobre `currentStatus.allowsVersioning` (true/false) + verificacion de que `useDataFetching` propaga `relations`; smoke en storybook muestra el boton solo en filas versionables.

### REQ-05 (label i18n): el label del row action se resuelve por `languageTag`

> **Que cambia**: el texto del boton ("Crear nueva version"/"Clonar") sale del sistema i18n, no hardcoded en el config.
> **Por que**: checklist de calidad de artefacto (config declarativa, no hardcoded); patron existente `resolveI18nLabel`.

El sistema MUST resolver el label del row action `create` via `languageTag` (resuelto por `resolveI18nLabel`, `useRowActionHandler.ts:113-135`), con entrada en los archivos `layout/lang/*@RecordList.json`. El config de ejemplo MUST usar `languageTag` (no un `label` hardcoded en castellano).

<details><summary>Scenarios de validacion</summary>

#### Scenario: label resuelto por tag
- **GIVEN** un row action create con `languageTag: 'recordList.actions.createNewVersion'` y la entrada en el lang file
- **WHEN** se renderiza
- **THEN** el boton muestra el texto traducido, no el tag crudo

</details>

**Acceptance**: la clave i18n existe en `layout/lang/en_CL@RecordList.json` (y los locales del repo); el ejemplo usa `languageTag`.

### REQ-PRESERVE-06: ChibiList y los tipos existentes no rompen

> **Que cambia**: nada en ChibiList ni en los otros tipos — se garantiza que siguen igual.
> **Por que**: ChibiList consume row actions enriquecidos; hay que confirmar que `create` fluye por el mismo path.

El sistema MUST garantizar que `ChibiList.vue` renderiza y dispara un row action `create` enriquecido sin romper (filtra por `isVisible`, llama `action.handler`). MUST verificar de donde toma ChibiList las acciones enriquecidas (el enriquecimiento ocurre en el path de `RecordList`); si ChibiList se usa standalone sin ese enriquecimiento, documentar el gap. Los row actions existentes MUST seguir funcionando.

<details><summary>Scenarios de validacion</summary>

#### Scenario: ChibiList dispara create
- **GIVEN** un row action `create` enriquecido (con `handler`/`isVisible`) pasado a ChibiList
- **WHEN** se hace click
- **THEN** se filtra por `isVisible` y se invoca `action.handler` sin error

</details>

**Acceptance**: smoke de ChibiList con un row action create; confirmacion (lectura) del origen del enriquecimiento; otros tipos verdes.

## Tasks

> Numeracion: no hay `### Session N` previas en `## Sessions` del ticket → el plan arranca en S1 (DET-20).

### Session 1 — Tipo `create` en las 2 definiciones del union [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Agregar `'create'` al `type?` de `RowAction` + props `prefillFromCurrent?`/`asNewVersion?`/`redirectTo?` | REQ-01 | developer | — | layout/src/types/recordlist.ts | vue-tsc/tsc del area sin error | git revert del hunk | DET-1, DET-2, DET-8 | done | 1 |
| S1.T2 | Agregar `'create'` al `type?` de `EnhancedRowAction` + mismas props opcionales | REQ-01 | developer | S1.T1 | layout/src/composables/useRowActionHandler.ts | typecheck verde; ambas definiciones en sync | git revert del hunk | DET-1, DET-5, DET-16 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2) — typecheck verde en consumers | — | reviewer | S1.T2 | projects/up1/tickets/ticket-042.md | typecheck/build del modulo verde | n/a | DET-20, DET-23 | done | 1 |

### Session 2 — Caso `create` en el dispatcher + handler [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Helper/composable `createCreateActionHandler` que arma `data` (`prefillFrom.source`, `asNewVersion`), ejecuta `createInstance` via apolloClient, decide redirect (`redirectTo`) y error (`showErrorNotification`) | REQ-03 | developer | S1.GATE | layout/src/composables/useCreateRowAction.ts (nuevo) | vitest unit del helper (4 casos) verde | borrar el composable | DET-1, DET-2, DET-8 | done | 2 |
| S2.T2 | Rama `if (action.type === 'create')` aditiva en el dispatcher de RecordList que usa el helper y retorna accion enriquecida (handler + isVisible/isEnabled) | REQ-02, REQ-03 | developer | S2.T1 | layout/src/layouts/RecordList.vue | vitest del area + typecheck; otros tipos intactos | git revert del hunk | DET-5, DET-8, DET-16 | done | 2 |
| S2.T3 | Unit tests del helper: version (data.prefillFrom+asNewVersion), clon (solo prefillFrom), redirect en exito, toast en error | REQ-03 | developer | S2.T2 | layout/src/composables/__tests__/useCreateRowAction.spec.ts (nuevo) | vitest run del archivo verde (assertions concretas) | borrar el test | DET-7, DET-1 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T2) — tests verdes; otros row actions intactos | — | reviewer | S2.T3 | projects/up1/tickets/ticket-042.md | vitest --coverage del area verde | n/a | DET-20, DET-23 | done | 2 |

### Session 3 — Visibilidad declarativa por config [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Unit/contract: `evaluateGroup`/`isActionVisible` con `visibilityConditions` por `currentStatus.allowsVersioning` (false→oculto, true→visible) + verificar que `useDataFetching` propaga `relations` | REQ-04 | developer | S2.GATE | layout/src/composables/__tests__/useFieldConditions.spec.ts, layout/src/composables/__tests__/useDataFetching (o nuevo) | vitest verde (assertions concretas true/false) | borrar casos | DET-7, DET-5 | done | 3 |
| S3.T2 | Config de ejemplo + i18n: row action create con `languageTag` + `relations:["currentStatus"]` en raiz; entrada en `layout/lang/*@RecordList.json`; documentar el patron (precedente hw-intervention-list.json) | REQ-04, REQ-05 | developer | S2.GATE | layout/lang/en_CL@RecordList.json, layout/src/stories/ (story/config), doc inline | i18n key presente; config valida | revert | DET-2, DET-8 | done | 3 |
| S3.T3 | Smoke en storybook: lista con un Activity `allowsVersioning=true` (boton visible) y otro `false` (oculto); screenshot al subdir del ticket | REQ-04 | developer | S3.T1, S3.T2 | layout/src/stories/, projects/up1/tickets/TICKET-042.screenshots/ | smoke storybook (6006) + screenshot capturado | n/a | DET-7 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier: T2, ⚑ fuerte: visibilidad end-to-end correcta) | — | reviewer | S3.T3 | projects/up1/tickets/ticket-042.md | vitest verde + smoke + screenshot + checklist visibilidad | n/a | DET-20, DET-23, DET-25 | done | 3 |

### Session 4 — Segundo consumer: ChibiList [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Verificar el path de enriquecimiento de row actions en ChibiList; smoke de un row action create (filtra por isVisible, llama handler); documentar si hay gap standalone | REQ-PRESERVE-06 | developer | S3.GATE | layout/src/layouts/ChibiList.vue | vitest/smoke verde; ChibiList no rompe | revert si hubo cambio | DET-7, DET-4, DET-10 | done | 4 |
| **S4.GATE** | Gate de sync Session 4 (tier: T1) — ChibiList tampoco rompe | — | reviewer | S4.T1 | projects/up1/tickets/ticket-042.md | vitest run del modulo verde | n/a | DET-20, DET-23 | done | 4 |

### Session 5 — Cierre [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Quality review (tier light) + commits granulares DET-27 (layout + repo dkc) | REQ-01 | reviewer | S4.GATE | layout/, projects/up1/ | quality review pass + commits creados | n/a (revert por commit) | DET-13, DET-14, DET-27 | done | 5 |
| **S5.GATE** | Gate de cierre Session 5 (tier: T1) + teach-close | — | reviewer | S5.T1 | projects/up1/tickets/ticket-042.md | vitest run del modulo verde + teach-close generado | n/a | DET-20, DET-22 | done | 5 |

## Technical reference

- **RowAction** (`layout/src/types/recordlist.ts`): `type?` literal en linea 68 (`'default'|'modal'|'download-template'|'import-template'|'mutation'|'multiSelectPicker'`). `visibilityConditions?: ConditionGroup` (linea 92). `ConditionGroup = { operator:'AND'|'OR'; conditions: FieldCondition[] }` (37-40). `FieldCondition = { field; operator; value? }` (28-32; operators incluyen `==`).
- **EnhancedRowAction** (`useRowActionHandler.ts:21-46`): interface unico; `type?: 'modal'|'default'|'download-template'|'import-template'`. `visibilityConditions?`, `enabledConditions?`, `isVisible?`, `handler?`. `isActionVisible(action, record)` (147-165) → `evaluateGroup(visibilityConditions, record)` (de `useFieldConditions`). `resolveI18nLabel(languageTag, fallback, $t, record)` (113-135).
- **getNestedValue** (`useFieldConditions.ts:38-52`): `path.split('.')` y recorre — soporta `currentStatus.allowsVersioning`.
- **Dispatcher** (`RecordList.vue:~2436-2605`): cadena `if (action.type === ...)`; cada rama retorna `{ ...action, handler, isVisible, isEnabled }`. `mutation` usa `createMutationHandler` (~2581); `modal` usa `createModalHandler` (~2436). Patron de visibilidad: `action.visibilityConditions || action.requiredCapability ? (r)=>isActionVisible(action,r) : action.isVisible`.
- **createInstance (frontend)**: documentos gql existentes usan `createInstance(objectType: $objectType, data: $data)` (p.ej. `useEnrollment.ts:54`, `useRecurrenceCreation.ts:49`, `CompositeSectionTreeElement.vue:206`). `apolloClient.value` disponible en RecordList. Resultado: `result.data?.createInstance?.id`.
- **createInstance (backend, sin cambios)**: `prefillFrom` y `asNewVersion` viajan DENTRO de `data` (HU-1 `instance.resolver.js:2185`; HU-3 `data?.asNewVersion === true`). Errores: `AS_NEW_VERSION_REQUIRES_PREFILL`, `OBJECT_NOT_VERSIONABLE`, `SOURCE_NOT_VERSIONABLE`, `WORKFLOW_HAS_NO_INITIAL_STATUS`, `PREFILL_SOURCE_NOT_FOUND`.
- **relations hydration** (`useDataFetching.ts:126-135`): `const configRelations = layoutConfig?.value?.relations; ... (hasRelations ? { includeRelations:true, relations: configRelations } : {})`. Precedente: `mods/hello-world-mod/config/layouts/hw-intervention-list.json` → `layoutConfig.relations: ["hwassessment"]` (raiz).
- **redirect/error**: `handleModify` abre editor via `modalStackManager.openModal({ mode:'edit', instanceId: recordId, ... })`. Error toast: `showErrorNotification(msg)` (~2588). Row id: `getRowId(record)` (~2943).
- **i18n**: labels via `languageTag` (no `{{$t}}` en JSON). Lang files: `layout/lang/*@RecordList.json` (ej. `recordList.actions.*`).
- **Tests**: vitest. Comando workspace: `npm run test` = `vitest run --project unit` (layout/package.json). Suites relevantes: `useFieldConditions.spec.ts` (evaluateGroup + operators), `useRowMutation.spec.ts` (createMutationHandler + createInstance), `recordListActions.spec.ts`.

## Constraints

- RULE-dev-004: trabajo core en rama `UPONE-1206` (layout es core); commits con `UPONE-1213`; merge a develop gated por revision team up1 (el cierre DKC ≠ merge).
- RULE-platform-006: filename PascalCase en layout (aplica a componentes; los composables nuevos siguen el naming existente `useXxx`).
- DET-20/DET-23/DET-25/DET-27/DET-30: sessions con gate, quality review, test cases inline (gate D), commits granulares, red autopilot super.
- Checklist de calidad de artefacto: labels via i18n (no hardcoded); cada artefacto con consumer en el sprint (el config de ejemplo/story consume el tipo); sin heuristicas por nombre.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| HU-1 / TICKET-036 | internal | `data.prefillFrom.source` en createInstance (prefill de campos propios) | Cerrada — habilita el clon; sin riesgo |
| HU-3 / TICKET-039 | internal | `data.asNewVersion` en createInstance (versionamiento) + errores nombrados | Cerrada |
| HU-0a/0f/0h / TICKET-033 | internal | Fundaciones de versionamiento (strategy, FKs, status) | Cerradas; contingencia documentada (si HU-0f vetada → fail-closed FKs null; si HU-0a vetada → modal siempre) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Las 2 definiciones del union quedan desincronizadas | medium | high | S1.T1+S1.T2 actualizan ambas en la misma session; S1.GATE exige typecheck verde |
| La visibilidad no funciona end-to-end con datos hidratados | medium | high | S3 gate ⚑ fuerte: unit de evaluateGroup sobre `currentStatus.allowsVersioning` + propagacion de relations + smoke storybook |
| El handler no resuelve redirect/error en el contexto del .vue | low | medium | Reusar mecanismos existentes (openModal edit/view como handleModify; showErrorNotification); helper testeable aislado |
| ChibiList no recibe la accion enriquecida (uso standalone) | medium | low | S4 verifica el path de enriquecimiento; documenta gap si existe (no bloquea HU-7, ChibiList puede no ser consumer en SP3) |
| Tocar inadvertidamente otros tipos del dispatcher | low | high | REQ-PRESERVE-06; cambio aditivo al final de la cadena; vitest del modulo en gates |

## Open questions

> Ninguna bloqueante. Resueltas en Decisions (autopilot super: decidir + documentar):
> - Mecanismo de creacion (directo vs modal) → directo, sin modal (DEC-LOCAL-01), alineado con el AC "sin modal" para `increment`.
> - Ubicacion de los flags (arg GraphQL vs dentro de `data`) → dentro de `data` (no cambia SDL), consistente con HU-1/HU-3.
> - El path de enriquecimiento de ChibiList queda como verificacion de S4 (REQ-PRESERVE-06), no como pregunta abierta de diseño.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Handler ejecuta `createInstance` directo (sin modal), flags dentro de `data`
- **Contexto**: el intake asumio un `createInstance(objectType, {}, args)` con args separados; el codigo real crea via modal (`handleCreateRequest`) o via mutation directa (`type:mutation`). El AC exige "sin modal" para `increment`.
- **Drivers**: AC "sin modal"; el SDL backend no cambia (`prefillFrom`/`asNewVersion` van dentro de `data`, HU-1/HU-3); consistencia con los call sites existentes (`createInstance(objectType, data)`).
- **Opcion elegida**: handler ejecuta la mutation `createInstance(objectType:$objectType, data:$data)` con `data.prefillFrom = { source: rowId }` (+ `data.asNewVersion` si aplica), luego redirige.
- **Alternativas**: (a) abrir modal create con prefill → contradice "sin modal" y requiere que el modal soporte prefill/version (no existe hoy); (b) reusar `type:mutation` con argsMapping a mano → pierde el caracter declarativo de primitivo (D23).
- **Consecuencias**: cambio acotado a layout; ningun cambio de SDL/resolver; el modal de captura llega con `user-provided` en SP4.
- **Session**: design.

### DEC-LOCAL-02: Visibilidad por config en la raiz de la lista (`relations` + `visibilityConditions`)
- **Contexto**: donde declarar la condicion de visibilidad por `currentStatus.allowsVersioning`.
- **Drivers**: `relations` NO es campo de `RowAction` (solo `CalendarViewConfig`); la hidratacion de relaciones es responsabilidad de la lista (`useDataFetching`).
- **Opcion elegida**: `relations: ["currentStatus"]` en la raiz de `layoutConfig` + `visibilityConditions` en el row action; reusa `isActionVisible`/`evaluateGroup`/`getNestedValue` (sin codigo de evaluacion nuevo).
- **Alternativas**: agregar `relations` al RowAction → desalineado con el modelo (la lista hidrata, no la accion).
- **Consecuencias**: cero codigo de evaluacion nuevo; patron documentado con precedente real.
- **Session**: design.

### DEC-LOCAL-03: Logica del handler en composable testeable
- **Contexto**: la unica logica nueva es construir `data` + decidir redirect/error.
- **Opcion elegida**: extraerla a `useCreateRowAction` (composable) testeable en aislamiento; la rama del dispatcher solo la cablea.
- **Alternativas**: inline en `RecordList.vue` → no testeable sin montar el componente.
- **Consecuencias**: 4 scenarios cubiertos por unit directo.
- **Session**: design.

### D23 (heredada del intake): `type: "create"` como primitivo declarativo
- **Opcion elegida**: un tipo `create` con flags ortogonales `prefillFromCurrent`/`asNewVersion` (versionar = ambos; clonar = solo prefill).
- **Alternativas**: reusar `type:"mutation"` o crear dos tipos separados → mas duplicacion, menos general.
- **Session**: intake (D23) — confirmada en design.

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-01..REQ-05 + REQ-PRESERVE-06 pasan
- [x] **Tests**: typecheck verde con `create` en ambas definiciones; unit del helper (4 casos: version/clon/redirect/error); unit de visibilidad (allowsVersioning true/false); propagacion de relations — verdes con assertions concretas
- [x] **Visibilidad**: smoke storybook muestra el boton solo en filas versionables (screenshot en el subdir del ticket)
- [x] **Rules**: labels i18n (no hardcoded); cambio aditivo (otros tipos intactos); no cambia SDL/resolver backend
- [x] **Integration**: RecordList y ChibiList no rompen (vitest del modulo verde)
- [x] **Branch**: trabajo en `UPONE-1206`; commits con `UPONE-1213`
- [x] **Docs**: patron de visibilidad por relations documentado; teach-close generado al cierre
