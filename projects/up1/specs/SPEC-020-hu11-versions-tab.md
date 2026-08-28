---
id: SPEC-020-hu11-versions-tab
project: up1
ticket: TICKET-045
status: done
---

# HU-11 — Tab "Versiones" en el RecordDetail de Activity (A-lite+)

# HU-11 — Tab "Versiones" en el RecordDetail de Activity (A-lite+)

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico vive en Requirements / Artifacts / Tasks.*

**Que se quiere**: agregar una pestaña "Versiones" a la ficha (RecordDetail) de un Programa de asignatura (`Activity`) que liste las otras versiones del mismo programa y permita (a) abrir la ficha de cualquier version y (b) crear una nueva version desde la lista. Hoy, parado en una version, no hay forma de ver ni saltar entre versiones desde el detalle. Se resuelve 100% por configuracion reusando el primitivo `record-list` (el mismo que la tab "Historial"), sin tocar layout core.

**Decisiones criticas que necesitan tu OK** (ya confirmadas con el dev):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Filtrar por `code EQUALS {{record.code}}`, no por `previousVersionId` | `previousVersionId` es un puntero al anterior (linked-list) → no da la cadena. `code` es estable entre versiones (schema). |
| 2 | Estado como texto, sin badge/highlight | Columna `badge` declarativa y `highlightCurrent` no existen en `record-list` → serian layout core (diferido SP4, B-1). |
| 3 | Sin columna "autor" | Activity no tiene campo autor/`createdBy`; la autoria vive en ChangeLog. No satisfacible config-only. |
| 4 | "Editar inline" NO entra; si "Ver" + "Nueva version" | Editar inline exige aflojar el override read-only del core (17 listas/3 mods). Diferido a SP4 (B-3). |

**Riesgos principales y como los mitigamos**:

- **El filtro `code` agrupa mal si dos programas distintos comparten `code`** → en la practica `code` es el identificador institucional del programa (estable entre versiones) y las queries filtran por tenant; smoke con 1/2/N versiones valida el agrupamiento real.
- **La accion "Nueva version" podria no renderear en lista embebida (override view-mode)** → verificado: el override fuerza `canCreate/canEdit/canDelete=false` pero NO toca `rowActions`; smoke confirma que el boton aparece y respeta `activity:version` + `allowsVersioning`.
- **i18n en/pt del mod inexistente** → se crean las claves nuevas en es/en/pt; el resto del mod (deuda pre-existente) queda registrado en backlog B-4.

**Que NO se hace en este ticket**:

- Editar inline en la tab (B-3, layout core, SP4).
- Badge de estado, `highlightCurrent`, rowClick de fila completa (B-1, SP4).
- Panel maestro-detalle in-place (B-2, SP4).
- Migracion i18n module-wide de curriculum-design (B-4).

**Tamano estimado**: 2 sessions ejecutables (S2 config, S3 i18n+tests+smoke) + cierre (S5). ~0.75 SP efectivas. La mas riesgosa es S3 (smoke de la accion versionado + navegacion en N versiones).

**Como vas a saber que funciona**:

- Abro la ficha de un Activity con 2+ versiones → veo la tab "Versiones" con la lista (version, etiqueta, estado, fecha).
- Click en una version → llego a la ficha completa de esa version.
- Boton "Nueva version" visible si el estado lo permite; al usarlo crea una version y abre su edicion.
- La tab y sus columnas se ven traducidas en es/en/pt.

---

## Purpose

Exponer la cadena de versiones de un `Activity` dentro de su RecordDetail, como una tab declarativa que reusa el primitivo `record-list` filtrando el propio objeto `Activity` por su `code` (estable entre versiones). Actor: consultor (rol con acceso al detalle de programas). Valor: navegacion y creacion de versiones desde el detalle sin construir UI nueva ni tocar layout core.

## Requirements

### REQ-01: Tab "Versiones" lista la cadena de versiones

> **Que cambia**: en la ficha de un Programa de asignatura aparece una pestaña "Versiones" con la lista de las otras versiones del mismo programa (numero, etiqueta, estado, fecha).
> **Por que**: hoy, desde una version no se puede ver ni ubicar las demas versiones del programa.

El sistema MUST renderizar, en `default_Activity_view.json`, una tab `versions` con un elemento `record-list` sobre `objectName: Activity` filtrado por `code EQUALS {{record.code}}`, mostrando las columnas `version`, `versionLabel`, `currentStatusId` (estado como texto via `relationDisplayFields`) y `createdAt`, ordenadas por `version` DESC.

**Actor**: consultor (usuario con acceso al RecordDetail de Activity)
**Layers**: config, frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: programa con N versiones
- **GIVEN** un Activity cuyo `code` tiene 3 versiones (v1, v2, v3)
- **WHEN** el usuario abre la ficha de v2 y entra a la tab "Versiones"
- **THEN** la lista muestra las 3 versiones con version/etiqueta/estado/fecha, ordenadas v3→v1

#### Scenario: programa con una sola version
- **GIVEN** un Activity con una unica version (sin previas ni siguientes)
- **WHEN** el usuario abre la tab "Versiones"
- **THEN** la lista muestra exactamente 1 fila (la version actual), sin error

#### Scenario: dos versiones
- **GIVEN** un Activity con v1 y v2 (mismo `code`)
- **WHEN** el usuario abre la tab desde cualquiera de las dos
- **THEN** ambas versiones aparecen en la lista

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre la ficha de un programa con varias versiones, entra a la tab "Versiones" y ve todas sus versiones listadas.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | N versiones | Activity code con 3 versiones | abrir tab Versiones | lista renderea | 3 filas, orden version DESC |
| 2 | 1 version | Activity sin previas/siguientes | abrir tab | lista renderea | 1 fila, sin error |
| 3 | 2 versiones | Activity con v1+v2 | abrir tab | lista renderea | 2 filas |

### REQ-02: Click en una version navega a su ficha

> **Que cambia**: al clickear el numero de version en la lista, el usuario llega a la ficha completa de esa version.
> **Por que**: el valor central de HU-11 es navegar entre versiones desde el detalle.

El sistema MUST configurar el `record-list` con `openMode: "route"`, `nameField: "version"` y `associatedLayoutConfigs.view.layoutId: "default_Activity_view"`, de modo que el click sobre el campo navegable abra el RecordDetail de la version seleccionada.

**Actor**: consultor
**Layers**: config, frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: navegar a otra version
- **GIVEN** la tab "Versiones" abierta desde v2 con v1 y v3 en la lista
- **WHEN** el usuario clickea la version v1
- **THEN** navega a `/{tenant}/Activity/{idV1}/RecordDetail` y ve los datos de v1 en sus tabs

#### Scenario: navegar a la version actual
- **GIVEN** la lista incluye la version en la que el usuario esta parado
- **WHEN** clickea esa misma version
- **THEN** recarga/permanece en la ficha de esa version sin error

</details>

#### Acceptance
**El usuario puede verificar que funciona**: clickea una version distinta en la lista y la pantalla pasa a mostrar la ficha de esa version.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Navega a version | tab abierta, v1 en lista | click v1 | navega route | URL /Activity/{idV1}/RecordDetail |

### REQ-03: Accion "Nueva version" en la lista

> **Que cambia**: la tab "Versiones" ofrece un boton "Crear nueva version" por fila, que crea una version prefilled y abre su edicion.
> **Por que**: el dev puede generar una nueva version sin salir del detalle, reusando el flujo de versionado de HU-10.

El sistema MUST incluir en el `record-list` un `rowActions` con la entrada `create-new-version` (reusada de `default_Activity_list.json`): `type: "create"`, `asNewVersion: true`, `prefillFromCurrent: true`, `redirectTo: "edit"`, `confirmCascade: true`, `requiredCapability: "activity:version"` y `visibilityConditions` sobre `currentstatus.allowsVersioning == true`. El sistema MUST declarar `relations: ["currentstatus"]` para que la condicion de visibilidad resuelva.

**Actor**: consultor con capability `activity:version`
**Layers**: config, frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: accion visible y habilitada
- **GIVEN** un usuario con `activity:version` y una version cuyo estado `allowsVersioning = true`
- **WHEN** abre la tab "Versiones"
- **THEN** la fila ofrece la accion "Crear nueva version"

#### Scenario: accion oculta por estado
- **GIVEN** una version cuyo estado `allowsVersioning = false`
- **WHEN** abre la tab
- **THEN** la accion no aparece para esa fila

#### Scenario: sin capability
- **GIVEN** un usuario sin `activity:version`
- **WHEN** abre la tab
- **THEN** la accion no se muestra

#### Scenario: crear nueva version
- **GIVEN** la accion visible
- **WHEN** el usuario la ejecuta y confirma el cascade
- **THEN** se crea una nueva version prefilled desde la fila y navega a su edicion (`default_Activity_edit`)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: con permiso de versionado y un estado que lo permita, ve y usa "Crear nueva version" en la lista, y aterriza en la edicion de la version nueva.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Visible con cap+estado | cap activity:version, allowsVersioning=true | abrir tab | accion presente | boton "Crear nueva version" |
| 2 | Oculta sin estado | allowsVersioning=false | abrir tab | accion ausente | sin boton |
| 3 | Crea version | accion visible | ejecutar + confirmar | crea + navega | edit de version nueva |

### REQ-04: i18n de la tab y columnas (es/en/pt)

> **Que cambia**: la pestaña "Versiones" y sus columnas nuevas se ven traducidas en es_CL, en_CL y pt_BR.
> **Por que**: criterio de aceptacion de HU-11; el mod hoy es es_CL-only.

El sistema MUST proveer las claves `tabs.versions`, `column.versionLabel` y `column.createdAt` en `lang/es_CL@activity.json`, y crear `lang/en_CL@activity.json` y `lang/pt_BR@activity.json` con `tabs.versions` + las columnas de la tab (`version`, `versionLabel`, `currentStatusId`, `createdAt`). La accion "Nueva version" reusa `recordList.actions.createNewVersion`, ya traducida en core (es/en/pt).

**Actor**: system
**Layers**: config (i18n)

<details><summary>Scenarios de validacion</summary>

#### Scenario: labels en es
- **GIVEN** locale es_CL
- **WHEN** se abre la tab
- **THEN** titulo "Versiones" y columnas en espanol

#### Scenario: labels en en/pt
- **GIVEN** locale en_CL (o pt_BR)
- **WHEN** se abre la tab
- **THEN** titulo y columnas de la tab en el idioma correspondiente

</details>

#### Acceptance
**El usuario puede verificar que funciona**: cambia de idioma y la tab "Versiones" + sus columnas se muestran traducidas.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | es_CL | locale es | abrir tab | traducido | "Versiones", "Etiqueta de versión", "Fecha" |
| 2 | en_CL | locale en | abrir tab | traducido | "Versions" / column labels en EN |

## Artifacts

### Layout config (METASPEC-layout-config)

Elemento nuevo `versionsList` (tipo `record-list`) en `layoutConfig.schema` de `default_Activity_view.json`, y entrada `versions` en `layoutConfig.tabs` (despues de `history`).

| Campo | Valor |
|-------|-------|
| objectName | `Activity` |
| filtro | `code EQUALS {{record.code}}` |
| columns | `version`, `versionLabel`, `currentStatusId`, `createdAt` |
| order | `version` DESC |
| nameField | `version` |
| openMode | `route` |
| relations | `["currentstatus"]` |
| relationDisplayFields | `{ "WorkflowStatus": "name" }` |
| rowActions | `[create-new-version]` (reusada de `default_Activity_list.json`) |
| canCreate/canEdit/canDelete | `false` (el override view-mode los fuerza; rowActions create sobrevive) |

### i18n keys

| Archivo | Claves |
|---------|--------|
| `lang/es_CL@activity.json` | + `tabs.versions`, `column.versionLabel`, `column.createdAt` |
| `lang/en_CL@activity.json` (nuevo) | `tabs.versions`, `column.version/versionLabel/currentStatusId/createdAt` |
| `lang/pt_BR@activity.json` (nuevo) | idem en pt |

## Tasks

### Session 2 — Config: tab Versiones + record-list + rowAction nueva version [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Agregar tab `versions` + elemento `versionsList` (record-list sobre Activity, filtro `code`, columns, nameField=version, openMode route, relations currentstatus, relationDisplayFields) en `default_Activity_view.json` | REQ-01, REQ-02 | developer | — | mods/curriculum-design/config/layouts/default_Activity_view.json | JSON valido + carga en view | git revert del archivo | DET-2, DET-8, RULE-platform-006 | pending | 2 |
| S2.T2 | Agregar `rowActions: [create-new-version]` al `versionsList` (reuso de default_Activity_list.json, gate activity:version + allowsVersioning) | REQ-03 | developer | S2.T1 | mods/curriculum-design/config/layouts/default_Activity_view.json | JSON valido | git revert | DET-2, DET-8 | pending | 2 |
| S2.T3 | `npm run sync` (mods → core) y verificar que el layout actualizado quede sincronizado | REQ-01 | developer | S2.T2 | mods/curriculum-design/ | sync sin error | re-sync con archivo revertido | DET-8 | pending | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T1): JSON valido, sync OK, tab renderea | — | reviewer | S2.T3 | projects/up1/tickets/ticket-045.md | gate persistido | — | DET-20, DET-23 | pending | 2 |

### Session 3 — i18n es/en/pt + tests + smoke 1/2/N [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S3.T1, S3.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Extender `es_CL@activity.json` con `tabs.versions`, `column.versionLabel`, `column.createdAt` | REQ-04 | developer | — | mods/curriculum-design/lang/es_CL@activity.json | JSON valido | git revert | DET-2 | pending | 3 |
| S3.T2 | Crear `en_CL@activity.json` y `pt_BR@activity.json` con tabs.versions + columnas de la tab | REQ-04 | developer | — | mods/curriculum-design/lang/en_CL@activity.json, mods/curriculum-design/lang/pt_BR@activity.json | JSON valido | borrar archivos nuevos | DET-2 | pending | 3 |
| S3.T3 | `npm run sync` para registrar lang nuevos | REQ-04 | developer | S3.T1, S3.T2 | mods/curriculum-design/ | sync sin error | re-sync | DET-8 | pending | 3 |
| S3.T4 | Smoke (Playwright) 1/2/N versiones: lista renderea, navegacion al click, accion "Nueva version" visible+gateada, labels traducidos | REQ-01, REQ-02, REQ-03, REQ-04 | reviewer | S3.T3 | mods/curriculum-design/config/layouts/default_Activity_view.json | smoke verde + screenshots | n/a (solo lectura) | DET-7, DET-13 | pending | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier T3): UI verde, navegacion OK, accion gateada, i18n visible | — | reviewer | S3.T4 | projects/up1/tickets/ticket-045.md | gate persistido | — | DET-20, DET-23, DET-25 | pending | 3 |

## Constraints

- RULE-platform-006: filenames PascalCase (no aplica a los lang `*@activity.json` ya existentes; respetar convencion del mod).
- RULE-dev-004 / core_work_policy: este ticket es `layer: mod` (solo `mods/curriculum-design/`); flujo autocontenido + `npm run sync`. No toca core → no usa rama UPONE-1206.
- Override view-mode (`RecordDetail.vue:4138-4150`): fuerza `canCreate/canEdit/canDelete=false` en listas embebidas; el diseño lo respeta (Ver via nav + Nueva version via rowActions, que el override no toca).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| rowAction `create-new-version` (HU-10) | internal | Reusa la accion ya implementada en default_Activity_list.json | Si su contrato cambia, ajustar; bajo (mismo mod) |
| `activity:version` capability (SPEC-019) | internal | Gate de la accion nueva version | Ya existe (RBAC HU) |
| `recordList.actions.createNewVersion` i18n | internal | Label de la accion, en core (es/en/pt) | Ya existe |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `code` agrupa versiones de programas distintos si se repite | low | medium | code es el id institucional estable; queries filtran por tenant; smoke 1/2/N valida |
| rowAction no renderea en lista embebida view-mode | low | medium | Verificado: override no toca rowActions; smoke S3.T4 confirma |
| en/pt no cargan sin sync | medium | low | S3.T3 corre sync; smoke en locale en/pt |
| nameField=version (int) no genera link navegable | low | medium | layoutConfig.nameField es configurable (RecordList.vue:1912); smoke S3.T4 confirma click |

## Open questions

- Ninguna abierta. Las tres incertidumbres de diseño (clave de filtro, autor, i18n) se resolvieron en el design discovery del ticket (2026-06-04).

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Filtrar por `code`, no por `previousVersionId`
- **Contexto**: S1 decia "filtrar por linkageField"; `linkageField = previousVersionId`.
- **Drivers**: `previousVersionId` es FK reflexiva al anterior (linked-list) → un EQUALS no da la cadena. `code` es estable entre versiones (schema activity.json:55). El motor resuelve `{{record.code}}` en filtros (RecordDetail.vue:4099).
- **Opcion elegida**: filtro `code EQUALS {{record.code}}`.
- **Alternativas**: `previousVersionId EQUALS {{currentId}}` (solo sucesor inmediato — descartado); `versionSourceId` (no es columna en Activity — descartado).
- **Consecuencias**: gana cadena completa con config-only; depende de que `code` no se repita entre lineages (riesgo bajo, mitigado).
- **Session**: design (pre-S2).

### DEC-LOCAL-02: Sin columna autor; estado como texto
- **Contexto**: criterios originales pedian estado(badge), fecha, autor.
- **Drivers**: Activity no tiene `createdBy` (prisma); badge declarativo no existe en record-list.
- **Opcion elegida**: columnas version/versionLabel/currentStatusId(texto)/createdAt; sin autor; sin badge.
- **Alternativas**: badge+highlight (layout core, B-1 SP4); autor desde ChangeLog (fuera de record-list-sobre-Activity).
- **Consecuencias**: A-lite config-only; cosmetica y autor diferidos.
- **Session**: design (pre-S2).

### DEC-LOCAL-03: A-lite+ (Ver + Nueva version); editar inline diferido
- **Contexto**: dev pidio ver/editar/nueva version como row actions.
- **Drivers**: override view-mode fuerza canEdit=false en listas embebidas (chokepoint global, 17 listas/3 mods); rowActions sobrevive el override.
- **Opcion elegida**: Ver (nav) + Nueva version (rowAction). Editar inline → B-3 SP4 (layout core, flag opt-in).
- **Alternativas**: full inline ahora (subir a layer core, rama UPONE-1206 — descartado por el dev).
- **Consecuencias**: valor entregado en SP3 sin riesgo de core; editar via 1 hop (ver→ficha→editar).
- **Session**: design (pre-S2), confirmado por dev via AskUserQuestion.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..04 pasan (smoke 1/2/N versiones, navegacion, accion gateada, i18n)
- [ ] **Tests**: smoke Playwright verde con evidencia (screenshots)
- [ ] **Rules**: layer mod respetado (solo mods/curriculum-design/), npm run sync corrido
- [ ] **Integration**: las otras tabs del RecordDetail siguen funcionando (sin regresion)
- [ ] **Docs**: ticket + backlog (B-3/B-4) actualizados
