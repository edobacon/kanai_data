---
id: SPEC-017-hu8-activity-versioning-adoption
project: up1
ticket: TICKET-043
status: done
---

# HU-8 — Adopción de versionamiento en Activity (8a config + B2 · 8b hook · 8c seed + B3)

# HU-8 — Adopción de versionamiento en Activity (8a config + B2 · 8b hook · 8c seed + B3)

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Artifacts, Tasks). Si solo lees el Executive summary y te basta para decidir, ese es el objetivo. Si necesitas mas detalle, las secciones tecnicas de abajo lo profundizan.*

**Que se quiere**: El motor de versionado generico ya existe (Track 0 cerrado). Este ticket es la **adopcion** de ese motor para la entidad `Activity` del mod `curriculum-design`, no su construccion. Se logra declarando tres bloques de config bajo `metadata` en `activity.json`, volviendo `previousVersionId` un FK reflexivo, cerrando dos bugs acotados (B2 audit espurio, B3 hardcode `'BOR'`), agregando un hook que preserva el wiring pedagogico (CurricularLinks) en la v2, y sembrando la politica institucional de Univalle/AIEP. Al final, un dev del mod puede crear la version 2 de una Activity publicada sin escribir codigo del mod y sin contaminar el audit chain.

**Decisiones criticas que necesitan tu OK** (cada una con racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | 1 FK unico `workflow.initialStatusId` (v5.1) en vez de los 2 FK del Jira v5 (`versionInitialStatusId` + `scratchInitialStatusId`) | Cerrada en intake. El schema actual ya refleja el 1 FK (`workflow.json:75`); el seed setea ese unico campo y el helper B3 lo lee. Una sola fuente de verdad del estado inicial |
| 2 | Hook de remap de CurricularLinks acotado a SP3; el derived generico en codegen se difiere a SP4 | El path generico (`polymorphicChildrenDerived` en codegen) toca el motor; el hook aislado entrega el wiring pedagogico ahora sin esperar al refactor del codegen |

**Riesgos principales y como los mitigamos**:

- **La copia de `auditCapture.resolver.js` que se edita para B2 podria no ser la que corre en runtime** (mod-local `logic/` vs copia en `object-manager/.../mods/curriculum-design/`) → G-V1 en S1 resuelve cual copia ejecuta el runtime ANTES de tocar `EXCLUDED_FIELDS`; B2 se aplica solo a la copia activa.
- **El constraint "mismo owner" de `CurricularLink` no esta en BD (deuda preexistente SP2)** → el hook de remap es defensivo: si una seccion no esta en el mapa `oldId→newId`, loguea warning y hace skip, sin asumir esa invariante.
- **El E2E requiere entorno levantado** (object-manager:4000 + postgres + redis + seeds UPU) → S7 valida con el entorno descrito en Setup; si falta, escalar antes de marcar la acceptance.

**Que NO se hace en este ticket** (limites explicitos del scope):

- **Derived generico en codegen** (`polymorphicChildrenDerived`) — diferido a SP4; se agenda ticket al cierre (S8). El hook acotado lo cubre por ahora.
- **B1 (codegen ignora `targetField`, emite siempre `references: [id]`)** — housekeeping fuera de scope: toca ~39 FKs en multiples objetos/tenants (no autocontenido) y versionamiento no lo necesita porque `previousVersionId → id`.
- **UI de versionamiento** — sale por TICKET-044 (HU-10).
- **Corregir la deuda del constraint "mismo owner"** — no se corrige sin aprobacion; el hook solo se defiende de ella.

**Tamano estimado**: 8 sessions ejecutables (S1-S8). La mas riesgosa es S1 (G-V1, bloqueante para B2) y la mas larga es S7 (E2E con regression sobre entorno levantado).

**Como vas a saber que funciona** (criterios de validacion observables, no tecnicos):

- Creas la v2 de una Activity v1 en estado PUB (con `allowsVersioning=true`) en UPU y obtienes `version=2`, `versionLabel=null`, `previousVersionId=v1.id`, `currentStatusId` igual al estado inicial del workflow.
- El audit de esa v2 muestra `action=Create` con `versionSourceId=v1.id` y **no** aparece una fila de audit por `previousVersionId`.
- Intentas versionar desde un estado con `allowsVersioning=false` y obtienes el error `SOURCE_NOT_VERSIONABLE`.
- La v2 tiene las secciones clonadas y los CurricularLinks re-creados apuntando a las nuevas secciones.

---

## Purpose

Activar el versionamiento de `Activity` mediante config declarativa en `activity.json` (bloques `metadata.polymorphicChildren`, `metadata.prefillFrom`, `metadata.versioning` + FK reflexivo `previousVersionId`), el fix B2 en la copia activa de `auditCapture.resolver.js`, un hook aislado de remap de CurricularLinks, el seed institucional UPU (`allowsVersioning` + `initialStatusId`) y el fix B3 (`resolveDefaultActivityWorkflow` lee el FK en vez de hardcodear `'BOR'`). Adopcion sobre entidades existentes; el unico cambio de forma de schema es la self-relation de `Activity`.

## Requirements

### REQ-01: Config declarativa de versionamiento en activity.json + FK reflexivo

> **Que cambia**: en `objects/activity.json` aparecen tres bloques bajo `metadata` (`polymorphicChildren`, `prefillFrom`, `versioning`) y `previousVersionId` pasa de string suelto a FK reflexivo a `Activity.id`. Con eso el motor generico sabe versionar Activity sin codigo del mod.
> **Por que**: el motor de versionado ya existe (Track 0); declarar la config es lo unico que falta para que Activity lo adopte.

El sistema MUST declarar en `objects/activity.json`, **bajo `metadata`** (para que el merge los propague y `syncVersioningConfigToRegistry`/HU-0j los persista en `versioningConfig`):

- `metadata.polymorphicChildren`: `[{ "name": "sections", "object": "CurricularSection", "via": "ownerType/ownerId", "ownerTypeValue": "Activity", "recursiveBy": "parentId" }]`.
- `metadata.prefillFrom`: `{ "exclude": ["currentStatusId", "previousVersionId", "versionLabel"], "deepClone": ["sections"] }`.
- `metadata.versioning`: `{ "linkageField": "previousVersionId", "versionField": "version", "versionStrategy": "increment", "auditSourceField": "versionSourceId", "initialStateField": "currentStatusId" }`.

El sistema MUST convertir `previousVersionId` en FK reflexivo: `isForeignKey: true, references: "Activity", targetField: "id"` (apunta a `id`, que el codegen ya emite correcto sin el fix B1). El sync (`npm run sync`) MUST correr sin errores y aplicar schema + `versioningConfig` a UPU. El layout MUST respetar filename PascalCase (`default_Activity_list.json`) per RULE-platform-006.

**Actor**: system
**Layers**: config, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: sync persiste la config
- **GIVEN** `activity.json` con los tres bloques bajo `metadata` y `previousVersionId` como FK reflexivo
- **WHEN** se ejecuta `npm run sync`
- **THEN** el sync corre sin errores
- **AND** los bloques quedan persistidos en `versioningConfig` (via HU-0j) y el schema de UPU refleja la self-relation de Activity

#### Scenario: FK reflexivo apunta a id
- **GIVEN** `previousVersionId` con `references: "Activity", targetField: "id"`
- **WHEN** el codegen genera el schema
- **THEN** emite la relacion contra `Activity.id` correctamente (sin requerir el fix B1)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras correr `npm run sync` sobre UPU, los tres bloques aparecen en `versioningConfig` y `previousVersionId` figura como FK reflexivo en el schema generado.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Sync sin errores | activity.json con bloques metadata + FK | `npm run sync` | sync corre y persiste | exit 0; bloques en versioningConfig |
| 2 | FK reflexivo emitido | previousVersionId references Activity targetField id | codegen | relacion a Activity.id | schema con self-relation |

### REQ-02: Fix B2 — previousVersionId excluido del audit chain

> **Que cambia**: `previousVersionId` se agrega al set `EXCLUDED_FIELDS` de la copia **activa** de `auditCapture.resolver.js`. Versionar una Activity ya no genera una fila de audit por el linaje.
> **Por que**: al volverse FK y poblarse en cada version, `previousVersionId` generaria audit rows espurios que contaminan el changeLog de SP2 (B2).

El sistema MUST agregar `previousVersionId` al `EXCLUDED_FIELDS` (`Set`) de la copia de `auditCapture.resolver.js` que **realmente corre en runtime** (resuelta por G-V1 en S1: mod-local `logic/` vs `object-manager/src/graphql/resolvers/mods/curriculum-design/`). Versionar una Activity MUST NOT generar un audit row de linaje por `previousVersionId`.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: versionar no genera audit de linaje
- **GIVEN** la copia activa de `auditCapture.resolver.js` con `previousVersionId` en `EXCLUDED_FIELDS`
- **WHEN** se crea la v2 de una Activity (que puebla `previousVersionId`)
- **THEN** el audit registra `action=Create` con `versionSourceId=v1.id`
- **AND** NO existe un audit row atribuido a un cambio de `previousVersionId`

#### Scenario: copia equivocada no surte efecto
- **GIVEN** la copia editada NO es la que corre en runtime
- **WHEN** se versiona
- **THEN** el audit row espurio persiste (este escenario justifica G-V1 como bloqueante previo)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras crear una v2, el listado de audit de esa Activity no contiene una entrada por `previousVersionId`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Audit limpio al versionar | copia activa con previousVersionId excluido | crear v2 | sin audit row de linaje | 0 filas de audit por previousVersionId |

### REQ-03: Hook HU-8b — remap de CurricularLinks a las secciones de la v2

> **Que cambia**: un nuevo archivo `mods/curriculum-design/logic/activity.versioning-hook.js` re-crea los CurricularLinks del source en las secciones clonadas de la v2 usando el mapa `oldId→newId`. Si no puede remapear, loguea warning y hace skip.
> **Por que**: preserva el wiring pedagogico (BR-VER-002) en la nueva version sin esperar al derived generico del codegen (SP4).

El sistema MUST, en `mods/curriculum-design/logic/activity.versioning-hook.js` (nuevo, aislado), remapear los CurricularLinks del source a las secciones clonadas de la v2 via el mapa `oldId→newId` que expone el deepClone (HU-0d). Para cada CurricularLink del source: localiza la seccion equivalente en v2 (`sectionIdMap[old] → new`) y crea un nuevo CurricularLink. El hook MUST ser **defensivo**: si `sourceSectionId` o `targetSectionId` no estan en el mapa, MUST loguear warning y hacer skip (no asumir el constraint "mismo owner", deuda preexistente). MUST incluir comentario inline `SP4: generalizar a polymorphicChildrenDerived en codegen` y etiquetarse como acotado.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: links re-creados en v2
- **GIVEN** una Activity con 5 sections y 3 CurricularLinks
- **WHEN** se clona a v2 y corre el hook con el mapa `oldId→newId`
- **THEN** la v2 tiene 5 sections y 3 CurricularLinks re-creados apuntando a las nuevas secciones

#### Scenario: link no remapeable (defensivo)
- **GIVEN** un CurricularLink cuyo `sourceSectionId` o `targetSectionId` no esta en el mapa
- **WHEN** corre el hook
- **THEN** loguea un warning y hace skip de ese link
- **AND** no aborta el remap del resto

</details>

#### Acceptance
**El usuario puede verificar que funciona**: al versionar una Activity con secciones y links, la v2 muestra los mismos links pero apuntando a las secciones clonadas.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Remap completo | Activity con 5 sections + 3 links | clonar a v2 + hook | links re-creados | v2 con 5 sections + 3 links |
| 2 | Skip defensivo | link con seccion ausente del mapa | hook | warning + skip | log warning; resto remapeado |

### REQ-04: Seed HU-8c — politica institucional UPU

> **Que cambia**: `seed/_data-workflow-objects.js` setea `allowsVersioning=true` en PUB de los workflows `activity-standard` (Univalle) y `activity-fast` (AIEP), resto `false`, y setea `workflow.initialStatusId` al id de BOR en ambos workflows. Se documenta en `seed/README.md`.
> **Por que**: deja activa la politica de versionamiento de Univalle/AIEP con una unica fuente de verdad del estado inicial.

El sistema MUST, en `seed/_data-workflow-objects.js`, setear `allowsVersioning=true` en el status PUB de los workflows `activity-standard` (Univalle) y `activity-fast` (AIEP), con el resto de statuses en `false`. MUST setear `workflow.initialStatusId` al id de BOR en ambos workflows (`activity-standard` y `activity-fast`). La unicidad (HU-0h) queda garantizada estructuralmente: el FK de entrada es de cardinalidad 1 por workflow. MUST documentar en `seed/README.md` que estos flags/FK definen la politica institucional y que una institucion nueva modifica solo su seccion.

**Actor**: system
**Layers**: data/seed

<details><summary>Scenarios de validacion</summary>

#### Scenario: seed setea flags y FK
- **GIVEN** el seed `_data-workflow-objects.js` con `allowsVersioning` y `initialStatusId`
- **WHEN** se ejecuta `seed --tenant=UPU`
- **THEN** PUB de `activity-standard` y `activity-fast` tienen `allowsVersioning=true`, el resto `false`
- **AND** `workflow.initialStatusId` apunta al id de BOR en ambos workflows

</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras `seed --tenant=UPU`, PUB tiene `allowsVersioning=true` y el FK de entrada del workflow esta seteado al id de BOR.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Flags de versionado | seed con allowsVersioning | seed --tenant=UPU | PUB=true, resto false | allowsVersioning correcto por status |
| 2 | FK de entrada seteado | seed con initialStatusId | seed --tenant=UPU | initialStatusId = id de BOR | FK poblado en ambos workflows |

### REQ-05: Fix B3 — el helper lee initialStatusId en vez de hardcodear BOR

> **Que cambia**: `resolveDefaultActivityWorkflow` lee `workflow.initialStatusId` del workflow default en lugar de hardcodear `code='BOR'`. No queda string `'BOR'` literal en el helper.
> **Por que**: elimina la doble fuente de verdad del estado inicial (FK vs hardcode) que generaba divergencia institucional (B3).

El sistema MUST modificar `resolveDefaultActivityWorkflow` para que lea `workflow.initialStatusId` del workflow default. El helper MUST NOT contener el string `'BOR'` literal.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: helper resuelve via FK
- **GIVEN** un workflow con `initialStatusId` seteado al id de BOR
- **WHEN** `resolveDefaultActivityWorkflow` resuelve el estado inicial
- **THEN** devuelve el status referenciado por `initialStatusId`
- **AND** un grep de `'BOR'` en el helper no arroja matches

</details>

#### Acceptance
**El usuario puede verificar que funciona**: un grep de `'BOR'` en `resolveDefaultActivityWorkflow` no devuelve coincidencias y el helper resuelve el estado inicial a traves del FK.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Resolucion via FK | workflow.initialStatusId = id de BOR | resolveDefaultActivityWorkflow | status inicial resuelto via FK | retorna BOR sin hardcode |
| 2 | Sin literal BOR | helper modificado | grep `'BOR'` en el helper | 0 matches | sin string literal |

### REQ-06: Acceptance E2E — crear v2 desde Activity v1 en PUB

> **Que cambia**: el flujo end-to-end de crear la v2 de una Activity v1 publicada en UPU queda validado: version, linaje, audit limpio, gating por `allowsVersioning` y remap de links.
> **Por que**: es la prueba integradora de que la adopcion (config + B2 + hook + seed + B3) funciona junta sobre el motor generico.

El sistema MUST permitir crear la v2 desde una Activity v1 en estado PUB (`allowsVersioning=true`) en UPU, produciendo: `version=2`, `versionLabel=null`, `previousVersionId=v1.id`, `currentStatusId=workflow.initialStatusId`, y audit `action=Create` con `versionSourceId=v1.id` **sin** audit row de `previousVersionId`. Versionar desde un estado con `allowsVersioning=false` MUST devolver el error `SOURCE_NOT_VERSIONABLE`. La v2 MUST tener las CurricularSections clonadas (nuevos ids, `ownerId=v2.id`, jerarquia `parentId` preservada) y los CurricularLinks remapeados por el hook.

**Actor**: system
**Layers**: e2e

<details><summary>Scenarios de validacion</summary>

#### Scenario: crear v2 desde PUB
- **GIVEN** una Activity v1 en estado PUB (`allowsVersioning=true`) en UPU
- **WHEN** se crea la v2
- **THEN** `version=2`, `versionLabel=null`, `previousVersionId=v1.id`, `currentStatusId=workflow.initialStatusId`
- **AND** audit `action=Create` con `versionSourceId=v1.id`, sin audit row de `previousVersionId`
- **AND** las CurricularSections quedan clonadas con nuevos ids y `ownerId=v2.id`, y los CurricularLinks remapeados

#### Scenario: versionar desde estado no versionable
- **GIVEN** una Activity en un estado con `allowsVersioning=false` (ej. BOR)
- **WHEN** se intenta crear la v2
- **THEN** devuelve el error `SOURCE_NOT_VERSIONABLE`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: crea la v2 de una Activity PUB en UPU y observa version 2 con linaje, audit limpio y links remapeados; intentar desde BOR arroja `SOURCE_NOT_VERSIONABLE`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | v2 desde PUB | Activity v1 PUB (allowsVersioning=true) | crear v2 | version 2 + linaje + audit limpio | version=2, versionLabel=null, previousVersionId=v1.id, currentStatusId=initialStatusId, audit Create+versionSourceId sin row de previousVersionId |
| 2 | estado no versionable | Activity en BOR (allowsVersioning=false) | crear v2 | error | SOURCE_NOT_VERSIONABLE |
| 3 | clonado + remap | Activity v1 con sections + links | crear v2 | sections clonadas + links remapeados | nuevos ids, ownerId=v2.id, parentId preservado, links re-creados |

## Non-functional requirements

No aplican NFRs especificos para esta feature (adopcion declarativa + fixes acotados, sin metas de performance/escala propias).

## Artifacts

Sin meta-specs declarados en el proyecto para este record. Secciones ad-hoc segun lo que la feature necesita.

### Models

| Table | Column | Type | Nullable | Default | Description |
|-------|--------|------|----------|---------|-------------|
| Activity | previousVersionId | string | si | — | FK reflexivo NUEVO → Activity.id (antes: string suelto). Excluido del audit (B2) |
| Activity | version | integer | no | 1 | Version numerica system-managed (increment) |
| Activity | versionLabel | string | si | — | Codigo institucional libre (ej. 'v2022-actual') |
| WorkflowStatus | allowsVersioning | boolean | — | — | [existe] seed lo setea: PUB=true en activity-standard/activity-fast, resto false |
| Workflow | initialStatusId | string | si | — | [existe] seed lo setea → id de BOR; helper B3 lo lee |

**Relations**:
| From | To | Type | FK | On delete |
|------|----|------|----|-----------| 
| Activity | Activity | belongsTo (self, "ActivityVersionChain") | previousVersionId | (no especificado — FK nullable) |
| CurricularSection | Activity | polimorfica (ownerType/ownerId) | ownerId | (no FK directa) |
| Workflow | WorkflowStatus | belongsTo | initialStatusId | (existe) |

> Config declarativa bajo `metadata` (NO son columnas — gobiernan el motor de versionado, persistida por `syncVersioningConfigToRegistry`/HU-0j): `polymorphicChildren`, `prefillFrom`, `versioning`. Ver Technical reference.

## Tasks

### Session 1 — G-V1: verificar cual copia de auditCapture.resolver.js corre en runtime [tipo: ⚑ fuerte] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Determinar cual copia de `auditCapture.resolver.js` ejecuta el runtime (mod-local `logic/` vs copia en object-manager) y documentar el hallazgo con evidencia | REQ-02 | researcher | — | mods/curriculum-design/logic/auditCapture.resolver.js, object-manager/src/graphql/resolvers/mods/curriculum-design/auditCapture.resolver.js | manual: trazar require/import + runtime; documento en ticket | (no aplica — investigacion) | DET-4, DET-5 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T0)** — persistir hallazgo G-V1 en `## Sessions` del ticket usando Template de Gate, correr validacion T0 (lint frontmatter + cross-references), decidir continue/iterate/escalate/standby | — | reviewer | S1.T1 | ticket | gate persistido + decision documentada; G-V1 resuelto (copia activa identificada) | (no aplica — cierre de session) | DET-20, DET-23 | pending | 1 |

### Session 2 — HU-8a config: activity.json bloques metadata + FK reflexivo + sync [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Declarar en `activity.json` bajo `metadata` los bloques `polymorphicChildren`, `prefillFrom`, `versioning` y convertir `previousVersionId` en FK reflexivo (`isForeignKey/references/targetField`); correr `npm run sync` y verificar que persiste en versioningConfig + layout PascalCase | REQ-01 | developer | — | mods/curriculum-design/objects/activity.json, default_Activity_list.json | `npm run sync` exit 0; bloques en versioningConfig; tests del mod | git revert | DET-5, DET-8, DET-10, DET-11 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir resultados en `## Sessions` del ticket usando Template de Gate, correr validacion T2 (unit + coverage delta), decidir continue/iterate/escalate/standby | — | reviewer | S2.T1 | ticket | gate persistido + decision documentada | (no aplica — cierre de session) | DET-20, DET-23 | pending | 2 |

### Session 3 — B2: previousVersionId en EXCLUDED_FIELDS de la copia activa + test [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Agregar `previousVersionId` al `EXCLUDED_FIELDS` de la copia activa de `auditCapture.resolver.js` (resuelta por G-V1 en S1) + test que verifica que versionar NO genera audit row de linaje | REQ-02 | developer | S1.GATE | (copia activa segun G-V1) mods/curriculum-design/logic/auditCapture.resolver.js o object-manager/src/graphql/resolvers/mods/curriculum-design/auditCapture.resolver.js | unit: versionar NO genera audit row de previousVersionId | git revert | DET-5, DET-8, DET-10, DET-11 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2)** — persistir resultados en `## Sessions` del ticket usando Template de Gate, correr validacion T2, decidir continue/iterate/escalate/standby | — | reviewer | S3.T1 | ticket | gate persistido + decision documentada; versionar NO genera audit row de linaje | (no aplica — cierre de session) | DET-20, DET-23 | pending | 3 |

### Session 4 — HU-8b hook: activity.versioning-hook.js (remap CurricularLinks) + tests [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Crear `activity.versioning-hook.js` (aislado) que remapea CurricularLinks via mapa `oldId→newId`; defensivo (warning + skip si falta remapeo); comentario inline "SP4: generalizar a polymorphicChildrenDerived en codegen"; tests (5 sections + 3 links → v2 con 5 sections + 3 links) | REQ-03 | developer | — | mods/curriculum-design/logic/activity.versioning-hook.js (nuevo), mods/curriculum-design/objects/curricularLink.json | unit: clonar Activity con 5 sections + 3 links → v2 con 3 links re-creados; test skip defensivo | git revert | DET-5, DET-8, DET-10, DET-11 | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T2)** — persistir resultados en `## Sessions` del ticket usando Template de Gate, correr validacion T2, decidir continue/iterate/escalate/standby | — | reviewer | S4.T1 | ticket | gate persistido + decision documentada; 5 links re-creados en v2 | (no aplica — cierre de session) | DET-20, DET-23 | pending | 4 |

### Session 5 — HU-8c seed: allowsVersioning + initialStatusId + README [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | En `seed/_data-workflow-objects.js`: setear `allowsVersioning=true` en PUB de `activity-standard` (Univalle) y `activity-fast` (AIEP), resto false; setear `workflow.initialStatusId` = id de BOR en ambos workflows; documentar en `seed/README.md`; tests post-seed | REQ-04 | developer | — | mods/curriculum-design/seed/_data-workflow-objects.js, mods/curriculum-design/seed/README.md | unit/post-seed: `seed --tenant=UPU` → allowsVersioning y initialStatusId seteados correctos | git revert | DET-5, DET-8 | pending | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T2)** — persistir resultados en `## Sessions` del ticket usando Template de Gate, correr validacion T2, decidir continue/iterate/escalate/standby | — | reviewer | S5.T1 | ticket | gate persistido + decision documentada; seed correcto | (no aplica — cierre de session) | DET-20, DET-23 | pending | 5 |

### Session 6 — B3: resolveDefaultActivityWorkflow lee initialStatusId (sin 'BOR' literal) + test [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S6.T1 | Modificar `resolveDefaultActivityWorkflow` para leer `workflow.initialStatusId` del workflow default; eliminar el string `'BOR'` literal; test que verifica resolucion via FK + grep `'BOR'` sin matches | REQ-05 | developer | S5.GATE | mods/curriculum-design/seed/_data-workflow-objects.js | unit: helper resuelve estado inicial via FK; grep `'BOR'` en el helper sin matches | git revert | DET-5, DET-8, DET-10, DET-11 | pending | 6 |
| **S6.GATE** | **Gate de sync Session 6 (tier: T2)** — persistir resultados en `## Sessions` del ticket usando Template de Gate, correr validacion T2, decidir continue/iterate/escalate/standby | — | reviewer | S6.T1 | ticket | gate persistido + decision documentada; grep `'BOR'` en helper sin matches | (no aplica — cierre de session) | DET-20, DET-23 | pending | 6 |

### Session 7 — E2E: crear v2 desde Activity v1 PUB en UPU + regression [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S7.T1 | Smoke E2E: crear v2 desde Activity v1 PUB en UPU (version=2, versionLabel=null, previousVersionId=v1.id, currentStatusId=initialStatusId, audit Create+versionSourceId sin row de previousVersionId); desde allowsVersioning=false → SOURCE_NOT_VERSIONABLE; sections clonadas + links remapeados; correr regression del mod | REQ-06 | developer | S2.GATE, S3.GATE, S4.GATE, S5.GATE, S6.GATE | mods/curriculum-design/ (test E2E del mod) | T3: smoke E2E + regression completa sobre entorno (object-manager:4000 + postgres + redis + seeds UPU) | git revert (tests) | DET-5, DET-8, DET-10, DET-11 | pending | 7 |
| **S7.GATE** | **Gate de sync Session 7 (tier: T3)** — persistir resultados en `## Sessions` del ticket usando Template de Gate, correr validacion T3, decidir continue/iterate/escalate/standby | — | reviewer | S7.T1 | ticket | gate persistido + decision documentada; v2 creada correcta + audit limpio + links remapeados | (no aplica — cierre de session) | DET-20, DET-23 | pending | 7 |

### Session 8 — Cierre: commits DET-27 + teach-close + agendar ticket SP4 [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S8.T1 | Commits granulares por tipo (DET-27) en repo de codigo + repo dkc; teach-close (DET-22); agendar ticket SP4 del derived generico (`polymorphicChildrenDerived` en codegen) en `## Backlog` | — | reviewer | S7.GATE | ticket, repos de codigo y dkc | gate Fase 4 cumplido; teach-close present; backlog SP4 agendado | (no aplica — cierre de session) | DET-20, DET-23 | pending | 8 |
| **S8.GATE** | **Gate de sync Session 8 (tier: T2)** — persistir resultados en `## Sessions` del ticket usando Template de Gate, correr validacion T2, decidir continue/iterate/escalate/standby | — | reviewer | S8.T1 | ticket | gate persistido + decision documentada; cierre listo | (no aplica — cierre de session) | DET-20, DET-23 | pending | 8 |

### Task contract

```
Task S1.T1: G-V1 — identificar copia activa de auditCapture.resolver.js
- source_ref: REQ-02
- agent: researcher
- files: mods/curriculum-design/logic/auditCapture.resolver.js, object-manager/src/graphql/resolvers/mods/curriculum-design/auditCapture.resolver.js
- precondition: ambas copias presentes en el repo; entorno con object-manager resoluble
- expected_output: documento en el ticket que afirma cual copia corre en runtime, con evidencia (require/import chain o trazado de ejecucion). H1 del triage validada o refutada
- validation: manual — trazar el import/require que el runtime resuelve; confirmar multi-capa, no asumir desde una sola
- rollback: (no aplica — investigacion, no modifica codigo)
- rules: [DET-4, DET-5]
```

```
Task S2.T1: HU-8a config en activity.json + FK reflexivo + sync
- source_ref: REQ-01
- agent: developer
- files: mods/curriculum-design/objects/activity.json, default_Activity_list.json
- precondition: motor de versionado generico disponible (Track 0 cerrado); HU-0j (syncVersioningConfigToRegistry) presente
- expected_output: tres bloques bajo metadata + previousVersionId como FK reflexivo; npm run sync exit 0; bloques persistidos en versioningConfig; layout filename PascalCase
- validation: npm run sync (exit 0) + tests del mod; verificar versioningConfig
- rollback: git revert
- rules: [DET-5, DET-8, DET-10, DET-11]
```

```
Task S3.T1: Fix B2 — previousVersionId en EXCLUDED_FIELDS (copia activa)
- source_ref: REQ-02
- agent: developer
- files: copia activa segun G-V1 (mods/curriculum-design/logic/auditCapture.resolver.js o object-manager/src/graphql/resolvers/mods/curriculum-design/auditCapture.resolver.js)
- precondition: S1.GATE cerrada con G-V1 resuelto (copia activa identificada)
- expected_output: previousVersionId agregado al Set EXCLUDED_FIELDS de la copia activa; test que verifica que versionar NO genera audit row de linaje
- validation: unit — versionar NO genera audit row de previousVersionId
- rollback: git revert
- rules: [DET-5, DET-8, DET-10, DET-11]
```

```
Task S4.T1: HU-8b hook activity.versioning-hook.js (remap CurricularLinks)
- source_ref: REQ-03
- agent: developer
- files: mods/curriculum-design/logic/activity.versioning-hook.js (nuevo), mods/curriculum-design/objects/curricularLink.json
- precondition: HU-0d (deepClone que expone mapa oldId→newId) disponible; activity.json (S2) con prefillFrom.deepClone:[sections]
- expected_output: hook aislado que re-crea CurricularLinks via sectionIdMap; defensivo (warning + skip si falta remapeo); comentario inline SP4; tests (5 sections + 3 links → v2 con 3 links re-creados; caso skip defensivo)
- validation: unit — clonar Activity con 5 sections + 3 links → v2 con 5 sections + 3 links re-creados; test del path defensivo
- rollback: git revert
- rules: [DET-5, DET-8, DET-10, DET-11]
```

```
Task S5.T1: HU-8c seed — allowsVersioning + initialStatusId + README
- source_ref: REQ-04
- agent: developer
- files: mods/curriculum-design/seed/_data-workflow-objects.js, mods/curriculum-design/seed/README.md
- precondition: HU-0h (unicidad del estado inicial) disponible; statuses BOR/PUB en el seed
- expected_output: PUB.allowsVersioning=true en activity-standard (Univalle) y activity-fast (AIEP), resto false; workflow.initialStatusId = id de BOR en ambos; README documenta la politica institucional
- validation: post-seed — `seed --tenant=UPU` → allowsVersioning y initialStatusId seteados correctos
- rollback: git revert
- rules: [DET-5, DET-8]
```

```
Task S6.T1: Fix B3 — resolveDefaultActivityWorkflow lee initialStatusId
- source_ref: REQ-05
- agent: developer
- files: mods/curriculum-design/seed/_data-workflow-objects.js
- precondition: S5.GATE cerrada (workflow.initialStatusId seteado por el seed)
- expected_output: el helper lee workflow.initialStatusId del workflow default; sin string 'BOR' literal; test de resolucion via FK
- validation: unit — helper resuelve estado inicial via FK; grep 'BOR' en el helper sin matches
- rollback: git revert
- rules: [DET-5, DET-8, DET-10, DET-11]
```

```
Task S7.T1: E2E — crear v2 desde Activity v1 PUB en UPU + regression
- source_ref: REQ-06
- agent: developer/reviewer
- files: mods/curriculum-design/ (test E2E del mod)
- precondition: S2-S6 cerradas; entorno levantado (object-manager:4000 + postgres + redis + seeds UPU con statuses BOR/PUB + Activities v1)
- expected_output: v2 creada con version=2, versionLabel=null, previousVersionId=v1.id, currentStatusId=initialStatusId, audit Create+versionSourceId sin row de previousVersionId; allowsVersioning=false → SOURCE_NOT_VERSIONABLE; sections clonadas + links remapeados; regression del mod verde
- validation: T3 — smoke E2E + regression completa
- rollback: git revert (tests)
- rules: [DET-5, DET-8, DET-10, DET-11]
```

## Constraints

- RULE-dev-004: toca core si V1 indica object-manager — si G-V1 (S1) determina que la copia activa de `auditCapture.resolver.js` esta en `object-manager/.../mods/curriculum-design/`, el fix B2 toca codigo core y se hace en la branch core (`UPONE-1206`); si la copia activa es la mod-local `logic/`, va en la branch del mod.
- RULE-platform-006: layout filename PascalCase — el layout de Activity debe nombrarse `default_Activity_list.json` (REQ-01).
- RULE-cd-004: transiciones — el set inicial (`currentStatusId = workflow.initialStatusId` al crear la v2) es **creacion**, no transicion; no aplica la maquinaria de transiciones.
- DEC-LOCAL-01 (1-FK, v5.1): el estado inicial se modela con 1 FK unico `workflow.initialStatusId`, no con los 2 FK del Jira v5. El seed setea ese unico campo (REQ-04) y el helper B3 lo lee (REQ-05).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| object-manager (motor de versionado HU-3/HU-5) | internal | Provee el motor generico de versionado que Activity adopta declarativamente | Si el motor cambia su contrato de config, los bloques metadata podrian no persistir |
| HU-0d (deepClone con mapa oldId→newId) | internal | El hook HU-8b consume el mapa que expone el deepClone para remapear CurricularLinks | Sin el mapa, el hook no puede remapear (mitigado por path defensivo: warning + skip) |
| HU-0j (syncVersioningConfigToRegistry) | internal | Persiste los bloques metadata en versioningConfig al correr sync | Sin HU-0j, los bloques declarativos no se aplican al registry |
| seeds UPU (statuses BOR/PUB + Activities v1) | internal | Datos base para el seed institucional y el E2E | Sin seeds, el E2E (S7) no puede crear la v2 |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Se edita la copia de `auditCapture.resolver.js` que NO corre en runtime → B2 no surte efecto | medium | El audit row espurio persiste; B2 queda como falso positivo | G-V1 en S1 (⚑ fuerte, bloqueante) identifica la copia activa ANTES de tocar EXCLUDED_FIELDS |
| El constraint "mismo owner" de CurricularLink no esta en BD → un link cruza owners y el remap asume invariante inexistente | low | Links mal remapeados o crash del hook | Hook defensivo: si una seccion no esta en el mapa, log warning + skip (no asume el constraint) |
| El E2E (S7) requiere entorno completo levantado | medium | No se puede validar la acceptance integradora | Setup documenta el entorno (object-manager:4000 + postgres + redis + seeds UPU); si falta, escalar antes de marcar la acceptance |

## Open questions

- [ ] G-V1: cual copia de `auditCapture.resolver.js` corre en runtime (mod-local `logic/` vs `object-manager/.../mods/curriculum-design/`) — se resuelve en S1 (bloqueante para B2/S3). Mover a Decisions cuando S1 lo confirme.

## Decisions

### DEC-LOCAL-01: 1 FK unico initialStatusId (v5.1) en vez de 2 FK del Jira v5
- **Contexto**: el ticket Jira v5 menciona `workflow.versionInitialStatusId` + `scratchInitialStatusId` (2 FK). v5.1 implementa 1 FK unico `workflow.initialStatusId` compartido.
- **Drivers**: una unica fuente de verdad del estado inicial; el schema actual ya refleja el 1 FK (`workflow.json:75`); evitar divergencia institucional.
- **Opcion elegida**: 1 FK `workflow.initialStatusId`. El seed setea ese unico campo (REQ-04); el helper B3 lo lee (REQ-05).
- **Alternativas**: 2 FK (Jira v5) — descartada por duplicar la fuente de verdad sin beneficio para el alcance actual (no hay distincion version vs scratch que lo justifique aqui).
- **Consecuencias**: se gana una unica fuente de verdad y se cierra B3; se pierde la separacion teorica version/scratch (no requerida en SP3).
- **Session**: cerrada en intake (pre-S1).

### DEC-LOCAL-02: hook de remap acotado SP3, derived generico diferido a SP4
- **Contexto**: el remap de CurricularLinks puede resolverse con un hook aislado (SP3) o con el derived generico `polymorphicChildrenDerived` en codegen (refactor del motor).
- **Drivers**: entregar el wiring pedagogico (BR-VER-002) ahora sin esperar el refactor del codegen; aislar el cambio en un archivo nuevo.
- **Opcion elegida**: hook `activity.versioning-hook.js` aislado en SP3 con comentario inline "SP4: generalizar a polymorphicChildrenDerived en codegen". Ticket SP4 agendado al cierre (S8).
- **Alternativas**: derived generico en codegen — descartado para SP3 por tocar el motor (mayor riesgo y alcance); se difiere a SP4.
- **Consecuencias**: se gana entrega temprana y aislada; se asume deuda (un hook especifico) hasta que SP4 lo generalice.
- **Session**: cerrada en intake (pre-S1).

## Success metrics

No aplican metricas de negocio/sistema post-deploy especificas (feature de adopcion + fixes; la validacion se cubre via acceptance E2E y regression).

## Technical reference

Schema confirmado contra el repo actual: `workflow.initialStatusId` existe (`workflow.json:75`); `workflowStatus.allowsVersioning` existe (`workflowStatus.json:68`). El unico cambio de forma de schema es la self-relation de `Activity` (`previousVersionId` → FK reflexivo).

### `activity.json` post-HU-8a (bloques bajo metadata)

```json
{
  "metadata": {
    "polymorphicChildren": [
      {
        "name": "sections",
        "object": "CurricularSection",
        "via": "ownerType/ownerId",
        "ownerTypeValue": "Activity",
        "recursiveBy": "parentId"
      }
    ],
    "prefillFrom": {
      "exclude": ["currentStatusId", "previousVersionId", "versionLabel"],
      "deepClone": ["sections"]
    },
    "versioning": {
      "linkageField": "previousVersionId",
      "versionField": "version",
      "versionStrategy": "increment",
      "auditSourceField": "versionSourceId",
      "initialStateField": "currentStatusId"
    }
  },
  "properties": {
    "version": { "type": "integer", "not_null": true, "static_default": "1", "description": "Version numerica system-managed." },
    "versionLabel": { "type": "string", "not_null": false, "description": "Codigo institucional libre (ej. 'v2022-actual')." },
    "previousVersionId": {
      "type": "string",
      "not_null": false,
      "isForeignKey": true,
      "references": "Activity",
      "targetField": "id",
      "_comment": "FK reflexiva (IMP-5). Excluido del audit (fix B2)."
    }
  }
}
```

### Fix B2 — `auditCapture.resolver.js`

```js
const EXCLUDED_FIELDS = new Set([
  'updatedAt', 'createdAt', 'version', 'previousVersionId', // <- agregado (B2)
  'lockedBy', 'tenantId',
]);
```

> **V1 obligatorio antes (S1)**: confirmar cual copia corre (mod-local `logic/` o `object-manager/.../mods/curriculum-design/`). Editar la copia activa.

### Seed institucional UPU (`seed/_data-workflow-objects.js`)

```js
// Statuses (catalogo): marcar allowsVersioning donde se autoriza versionar.
{ code: 'PUB', allowsVersioning: true },
{ code: 'BOR', allowsVersioning: false },
// resto allowsVersioning=false.

// Workflow activity-standard (Univalle): estado inicial → BOR.
{ workflowName: 'activity-standard', initialStatusId: <id de BOR> },

// resolveDefaultActivityWorkflow lee workflow.initialStatusId (NO hardcodea 'BOR') — fix B3.
```

### Hook `activity.versioning-hook.js` (HU-8b, aislado)

```js
// SP4: generalizar a polymorphicChildrenDerived en codegen
async function remapCurricularLinks({ sourceActivityId, newActivityId, sectionIdMap }) {
  const sourceLinks = await prisma.curricularLink.findMany({
    where: { /* via sections con ownerType=Activity, ownerId=sourceActivityId */ }
  });
  for (const link of sourceLinks) {
    const newSourceId = sectionIdMap[link.sourceSectionId];
    const newTargetId = sectionIdMap[link.targetSectionId];
    if (!newSourceId || !newTargetId) {
      console.warn(`Cannot remap link ${link.id}: source/target not in map`);
      continue; // defensivo: no asume constraint mismo owner
    }
    await prisma.curricularLink.create({
      data: { /* ...link, */ sourceSectionId: newSourceId, targetSectionId: newTargetId }
    });
  }
}
```

## Rules discovered

{Se llena durante ejecucion.}

## Bugs found

- B2: `previousVersionId` fuera de `EXCLUDED_FIELDS` del audit — se cierra en este spec (REQ-02, S3).
- B3: `resolveDefaultActivityWorkflow` hardcodea `'BOR'` — se cierra en este spec (REQ-05, S6).

## Acceptance checkpoints

- [x] **Funcional**: REQ-01..REQ-06 verificados — E2E vivo contra :4000/UPU (version=2, previousVersionId, currentStatusId, _cloneMap, sections clonadas, SOURCE_NOT_VERSIONABLE) + remap handler (2 links)
- [x] **Tests**: unit por session (auditCapture 55/55, hook 3/3, versioning 21/21) + E2E vivo S7 + version-asnewversion e2e 2/2 (UPU)
- [x] **NFRs**: no aplican NFRs especificos (n/a)
- [x] **Rules**: RULE-dev-004 respetada (mod en UPONE-1038, core en UPONE-1206); RULE-platform-006 y RULE-cd-004 sin violacion
- [x] **Integration**: regression mod 642/642 + versioning 21/21; no rompe funcionalidad existente
- [x] **Docs**: `seed/README.md` documenta la politica institucional (REQ-04); ticket SP4 del derived generico agendado en Backlog (B-SP4)

## Archiving

Una spec se archiva cuando deja de ser fuente de verdad: el codigo fue eliminado, fue superseded por otra spec, descartada por negocio, u obsoleta por refactor. Usar el step `archive-spec` (comando `/dkc-archive-spec SPEC-id "razon"`). NO borrar specs manualmente.
