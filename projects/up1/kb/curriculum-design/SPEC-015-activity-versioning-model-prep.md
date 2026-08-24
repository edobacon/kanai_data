---
id: SPEC-015-activity-versioning-model-prep
project: up1
module: curriculum-design
status: in_progress
ticket: TICKET-034
meta_specs: []
created: '2026-05-29'
updated: '2026-05-29'
tags: [versioning, model, migration, sp4, track-0-cd, epic-UPONE-1038]
depends_on: []
---

# Track 0 CD — Cambios en el modelo del mod para versionar Activity

## Executive summary — lo que estas aprobando

> *Seccion de revision rapida. El detalle tecnico vive en Requirements / Artifacts / Tasks abajo.*

**Que se quiere**: dejar el modelo del mod `curriculum-design` listo para versionar `Activity`. Hoy `version` es un string libre, dos FKs clave son nullable, y el "estado inicial" de una Activity vive hardcodeado como `'BOR'` en el seed. Este ticket convierte `version` en un `Int` system-managed (con un `versionLabel` opcional para la etiqueta institucional libre), cierra los dos FKs a NOT NULL, y mueve la politica del estado inicial a **configuracion** (un FK `initialStatusId` en `Workflow` + un flag `allowsVersioning` en `WorkflowStatus`). Tambien limpia el KB que aun nombra la entidad `AcademicActivity`. Es prerequisito de modelo: sin esto, el resolver de versionamiento (HU-3, TICKET-039) no arranca.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Estado inicial = **1 FK `initialStatusId`** en `Workflow` (Opcion C), NO 2 FKs ni flags en el status | El ticket Jira pedia 2 FKs + flags; v5.1 simplifica a 1 FK compartido porque hoy version y scratch arrancan ambos en `BOR`. Unicidad estructural (FK card. 1) en vez de partial-unique. Un 2do FK es aditivo a futuro |
| 2 | `version` String→Int con backfill de las 2 instancias UPU **en la misma migracion** | Cambio de tipo de columna sobre data existente (pre-prod). Reversible, pero toca la BD `uplanner_upu` |
| 3 | SET NOT NULL en `workflowId`/`currentStatusId` tras pre-check empirico | Cierra el deferral "Nullable hasta S14" de TICKET-019; falla si algun FK esta null → pre-check obligatorio antes de migrar |
| 4 | Donde cae el FK `initialStatusId`: mod-local vs core `business/Base/workflow.json` | Hay 2 copias de `workflow.json` + un flag `core` (UPONE-1183) que protege objetos canonicos. S1 (V2) lo resuelve antes de tocar el modelo |

**Riesgos principales y como los mitigamos**:

- **SET NOT NULL falla con data sucia (FK null)** → S4 corre un pre-check empirico en `uplanner_upu` (SELECT por null) ANTES de generar la migracion; backfill si aparece null.
- **FK `initialStatusId` puesto en el `workflow.json` equivocado → invisible para el codegen** → S1 (V2) verifica cual copia consume el codegen + el efecto del flag `core` antes de editar nada.
- **Regresion del codegen: la nueva key cambia objetos que no la usan** → S6 regenera todos los tenants y hace diff vs baseline; el gate exige diff limpio en objetos sin la key.
- **Migracion destructiva sobre data real (super autopilot)** → la aplicacion de cada `prisma migrate` contra `uplanner_upu` se confirma con el dev (super releva el OK del commit local, NO de operaciones destructivas/DB).

**Que NO se hace en este ticket** (limites de scope):

- **No se arregla el bug B3** (`resolveDefaultActivityWorkflow` hardcodea `'BOR'`) — solo se agrega el FK que lo habilita. El fix vive en TICKET-043 (HU-8c).
- **No se agrega `previousVersionId` con FK reflexivo** ni los bloques `metadata.polymorphicChildren`/`prefillFrom`/`versioning` — van en TICKET-043 (HU-8a).
- **No se implementa el 2do FK `scratchInitialStatusId`** — diferido (aditivo si a futuro version y scratch divergen).
- **No se modelan statuses per-workflow** — diferido (D26).

**Tamano estimado**: 7 sessions ejecutables (S1-S7), ~6-9h efectivas. Las mas riesgosas: S3 (cambio de tipo + backfill), S5 (FK nuevo + helper) y S6 (regresion de codegen sobre todos los tenants).

**Como vas a saber que funciona**:

- El seed produce una Activity con `version: 1` (Int) + `versionLabel: "v2022-actual"`, y las 2 instancias UPU quedan migradas.
- Crear/seedear una Activity sin `workflowId` falla con error claro (NOT NULL).
- `workflow.initialStatusId` apunta a un `WorkflowStatus` valido y cambiar su valor reemplaza el anterior (no acumula).
- `grep -ri AcademicActivity specs/curriculum-design/` no devuelve referencias (salvo 1 nota historica del rename).
- Regenerar el codegen de todos los tenants deja diff limpio en objetos sin las nuevas keys.

---

## Purpose

Preparar el modelo de datos de `curriculum-design` para el versionamiento auto-incremental de `Activity`: tipar `version` como `Int` system-managed + `versionLabel: String?`, cerrar `workflowId`/`currentStatusId` a NOT NULL, y modelar el estado inicial del workflow como configuracion declarativa (FK `initialStatusId` + flag `allowsVersioning`). Consumidores: el resolver `asNewVersion` (HU-3, TICKET-039) y el seed. Layer: mod con migraciones Prisma que aplican a tenants via `object-manager` (core, RULE-dev-004).

## Requirements

### REQ-01: Activity.version Int + versionLabel (HU-0a)

> **Que cambia**: `Activity.version` deja de ser un string libre (`"v2022-actual"`) y pasa a ser un numero entero que el sistema gestiona (arranca en `1`). La etiqueta institucional libre se preserva en un campo nuevo `versionLabel`. Las 2 instancias UPU existentes se migran a `version: 1, versionLabel: "v2022-actual"`.
> **Por que**: el versionamiento auto-incremental necesita un `Int` ordenable; sin esto no se puede calcular "la siguiente version".

El sistema MUST tipar `Activity.version` como `integer` (`static_default: "1"`, `not_null: true`) y agregar `Activity.versionLabel` (`type: string`, `not_null: false`). La migracion Prisma MUST hacer backfill de las 2 instancias UPU (`version=1`, `versionLabel="v2022-actual"`) en la misma migracion.

**Actor**: system
**Layers**: schema, database, backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: seed produce version Int
- **GIVEN** el seed de `curriculum-design` con `PROGRAMA_VERSION=1` + `PROGRAMA_VERSION_LABEL='v2022-actual'`
- **WHEN** se ejecuta `npm run seed`
- **THEN** la Activity seedeada tiene `version: 1` (Int) y `versionLabel: "v2022-actual"`

#### Scenario: backfill de las 2 UPU
- **GIVEN** 2 instancias Activity UPU con `version` string en `uplanner_upu`
- **WHEN** se aplica la migracion
- **THEN** ambas quedan `version=1`, `versionLabel="v2022-actual"` sin filas de audit (version en EXCLUDED_FIELDS)

#### Scenario: audit no genera ruido
- **GIVEN** `version` esta en `EXCLUDED_FIELDS` (`auditCapture.resolver.js:57`)
- **WHEN** se cambia el tipo y se migra
- **THEN** el changeLog no registra el cambio de `version`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el detalle de una Activity en UPU y ve `version: 1` (numero) + el campo `versionLabel` con la etiqueta institucional.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Seed Int | seed config | npm run seed | Activity.version es Int | `version === 1`, `versionLabel === "v2022-actual"` |
| 2 | Backfill UPU | 2 records string | migrate | records migrados | 2 rows `version=1` |
| 3 | Audit limpio | version en EXCLUDED | migrate | sin audit rows | 0 changeLog para version |

### REQ-02: workflowId/currentStatusId NOT NULL (HU-0f)

> **Que cambia**: los dos FKs de `Activity` hacia `Workflow` y `WorkflowStatus` dejan de aceptar `null`. Una Activity sin workflow asignado ya no es un estado valido.
> **Por que**: cierra el deferral "Nullable hasta S14" de TICKET-019 y simplifica el resolver de versionamiento (sin guardas defensivas por null).

El sistema MUST cambiar `Activity.workflowId` y `Activity.currentStatusId` a `not_null: true`. La migracion MUST aplicar SET NOT NULL solo tras pre-check empirico de que las 2 instancias UPU tienen ambos FKs poblados (backfill si null). Las guardas defensivas por null en resolvers MUST removerse si existen.

**Actor**: system
**Layers**: schema, database, backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: pre-check FKs poblados
- **GIVEN** las 2 instancias UPU post-TICKET-019 S15
- **WHEN** se corre el pre-check `SELECT count(*) WHERE workflowId IS NULL OR currentStatusId IS NULL`
- **THEN** el resultado es 0 (si >0, backfill antes de migrar)

#### Scenario: SET NOT NULL aplica limpio
- **GIVEN** ambos FKs poblados en UPU
- **WHEN** se aplica la migracion SET NOT NULL
- **THEN** la migracion completa sin error

#### Scenario: Activity sin workflowId falla
- **GIVEN** el schema con NOT NULL
- **WHEN** se intenta crear/seedear una Activity sin `workflowId`
- **THEN** falla con error de constraint claro

</details>

#### Acceptance
**El usuario puede verificar que funciona**: intentar crear una Activity sin workflow en UPU devuelve un error explicito en vez de guardar un registro incompleto.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Pre-check | 2 UPU | SELECT null FKs | count 0 | `0` |
| 2 | Migrate NOT NULL | FKs poblados | migrate | ok | sin error |
| 3 | Insert sin FK | schema NOT NULL | create sin workflowId | error | constraint violation |

### REQ-03: KB rename AcademicActivity → Activity (HU-0g)

> **Que cambia**: el KB de specs del mod deja de nombrar la entidad `AcademicActivity` y usa `Activity` (el codigo ya hizo el rename en UPONE-1100). Queda 1 nota historica del rename.
> **Por que**: cierra el lag KB↔codigo; un dev que lee el KB no encuentra un nombre de entidad que ya no existe.

El sistema (KB) MUST reemplazar las referencias `AcademicActivity → Activity` en `specs/curriculum-design/` (overview.md, programa-de-asignatura.md, legacy-examples.md, open-questions.md, business-rules/, capabilities/). MUST quedar 1 nota historica del rename en `overview.md`. El grep final MUST no devolver referencias accidentales a `AcademicActivity`.

**Actor**: system (doc)
**Layers**: config (KB docs)

<details><summary>Scenarios de validacion</summary>

#### Scenario: grep final limpio
- **GIVEN** el KB renombrado
- **WHEN** `grep -ri AcademicActivity specs/curriculum-design/`
- **THEN** 0 resultados (salvo la nota historica explicita en overview.md)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: busca `AcademicActivity` en el KB del mod y no aparece (excepto la nota historica).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Grep limpio | KB renombrado | grep -ri | sin matches | 0 (excepto nota) |

### REQ-04: WorkflowStatus.allowsVersioning + Workflow.initialStatusId (HU-0h)

> **Que cambia**: `WorkflowStatus` gana un flag `allowsVersioning` ("una instancia puede versionarse desde este estado"). `Workflow` gana un FK `initialStatusId` ("estado inicial donde arranca una version nueva y una instancia desde cero — compartido"). Un helper `getInitialStatus(workflowId)` lee el FK en vez del hardcode `'BOR'`.
> **Por que**: mueve la politica de versionamiento de codigo hardcodeado a configuracion institucional, con la unicidad del estado inicial garantizada por construccion (FK cardinalidad 1).

El sistema MUST agregar a `workflowStatus.json` la property `allowsVersioning` (`type: boolean`, `not_null: true`, `static_default: "false"`). MUST agregar a `workflow.json` (en la copia que el codegen consume — resuelta en S1/V2) el FK `initialStatusId` (`type: string`, `not_null: false`, `isForeignKey: true`, `references: "WorkflowStatus"`, `targetField: "id"`). MUST exponer un helper `getInitialStatus(workflowId)` que lee `workflow.initialStatusId`. La migracion MUST agregar 1 flag + 1 FK aplicables a tenants.

**Actor**: system / dev del mod
**Layers**: schema, database, backend, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: marcar allowsVersioning en N statuses
- **GIVEN** el flag `allowsVersioning` en WorkflowStatus
- **WHEN** se marca `allowsVersioning=true` en varios statuses
- **THEN** no falla (es un flag por status, no constraint global)

#### Scenario: initialStatusId cardinalidad 1
- **GIVEN** un Workflow con `initialStatusId` apuntando a un status
- **WHEN** se cambia el valor a otro status
- **THEN** el anterior se reemplaza (no acumula — imposible tener 2 estados iniciales)

#### Scenario: getInitialStatus lee el FK
- **GIVEN** un workflow con `initialStatusId` seteado
- **WHEN** se llama `getInitialStatus(workflowId)`
- **THEN** devuelve el status referenciado por el FK (no el hardcode 'BOR')

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en la config de un workflow, el estado inicial es un valor seleccionable (FK) y `getInitialStatus` lo resuelve; marcar varios statuses como "versionables" no rompe nada.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Flag N statuses | allowsVersioning | set true en varios | ok | sin error |
| 2 | FK card. 1 | initialStatusId set | cambiar valor | reemplaza | 1 solo valor |
| 3 | helper lee FK | workflow con FK | getInitialStatus(id) | status del FK | === FK status |

### REQ-05: Regresion del codegen sin diff espurio (preserve, HU-0h gate)

> **Que cambia**: tras agregar el flag y el FK, regenerar el codegen de todos los tenants no debe cambiar objetos que no usan las nuevas keys.
> **Por que**: las keys nuevas son aditivas; si el codegen toca objetos sin la key, hay un efecto colateral del motor que hay que detectar antes de cerrar.

El sistema MUST, tras los cambios de modelo, regenerar el codegen de todos los tenants y producir un diff vs baseline donde los objetos sin las nuevas keys quedan sin cambios. Los seeds y tenants existentes MUST no romperse.

**Actor**: system
**Layers**: schema, database, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: diff limpio
- **GIVEN** baseline del codegen pre-cambios
- **WHEN** se regenera codegen post-cambios
- **THEN** objetos sin `allowsVersioning`/`initialStatusId`/`versionLabel` quedan sin diff

#### Scenario: tenants no rotos
- **GIVEN** los tenants seedeados
- **WHEN** se aplica el codegen + migraciones
- **THEN** el smoke de UPU corre sin error de schema

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre el codegen completo y el diff solo muestra los 3 campos nuevos donde corresponde; UPU sigue arrancando.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Diff limpio | baseline | regen codegen | solo keys nuevas | diff acotado |
| 2 | Smoke UPU | tenant UPU | arrancar object-manager | sin error schema | servicio up |

## Artifacts

### Models (cambios al schema via JSON object definitions)

| Object | Property | Type | Nullable | Default | Description |
|--------|----------|------|----------|---------|-------------|
| Activity | version | integer | no | "1" | (cambio de string→integer) Version numerica system-managed |
| Activity | versionLabel | string | si | — | (nuevo) Codigo institucional libre (ej. "v2022-actual") |
| Activity | workflowId | string | no | — | (cambio not_null false→true) FK → Workflow |
| Activity | currentStatusId | string | no | — | (cambio not_null false→true) FK → WorkflowStatus, readOnly |
| WorkflowStatus | allowsVersioning | boolean | no | "false" | (nuevo) Si true, una instancia puede versionarse desde este estado |
| Workflow | initialStatusId | string | si | — | (nuevo) FK → WorkflowStatus. Estado inicial del workflow (version + scratch, compartido). Cardinalidad 1 = unicidad estructural |

**Relations**:
| From | To | Type | FK | On delete |
|------|----|------|----|-----------|
| Workflow | WorkflowStatus | belongsTo | initialStatusId | SET NULL (FK nullable) |

**Indexes**: ninguno nuevo (FK cardinalidad 1 no requiere indice unico adicional — la unicidad es estructural por ser FK escalar).

> **Shapes canonicos**: ver seccion "Shapes canonicos del modelo" del ticket TICKET-034 (`activity.json`/`workflow.json`/`workflowStatus.json` post-cambios).

## Tasks

> Plan de 7 sessions (S1-S7) — coincide con el esqueleto `### Plan de sessions` del ticket. Numeracion desde S1 (el ticket no tiene `### Session N` ejecutadas previas). Ejecucion serial (super autopilot). Sin `parallel_groups`: las tasks de cada session son dependientes en serie (json→codegen→migracion→tests).

### Session 1 — V2: cual workflow.json consume el codegen (core vs mod) + efecto flag `core` [tipo: auto] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Investigar cual `workflow.json` consume el codegen como fuente (core `object-manager/objects/business/Base/workflow.json` vs mod `mods/curriculum-design/objects/workflow.json`), y verificar el efecto del flag `core` (UPONE-1183/PLAT-01) sobre el override del mod. Documentar la conclusion (donde cae `initialStatusId` en S5) como nota en el ticket. | REQ-04 | researcher | — | object-manager/codegen (script), object-manager/objects/business/Base/workflow.json, mods/curriculum-design/objects/workflow.json | manual (lectura codegen + flag core) + nota documentada | (no aplica — read-only) | DET-4, DET-5, DET-11 | pending | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T0) — persistir V2 resuelto en `## Sessions`, decidir continue | — | reviewer | S1.T1 | ticket | gate persistido + V2 documentado | (no aplica) | DET-20, DET-23 | pending | 1 |

### Session 2 — HU-0g: KB rename AcademicActivity → Activity [tipo: auto] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Grep + replace `AcademicActivity → Activity` en `specs/curriculum-design/` (overview.md, programa-de-asignatura.md, legacy-examples.md, open-questions.md, business-rules/, capabilities/). Agregar 1 nota historica del rename en overview.md. | REQ-03 | developer | S1.GATE | deckard/projects/up1/specs/curriculum-design/*.md | grep -ri AcademicActivity → 0 (salvo nota) | git revert (doc) | DET-3, DET-16 | pending | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T0) — grep final limpio, decidir continue | — | reviewer | S2.T1 | ticket | gate persistido + grep limpio | (no aplica) | DET-20, DET-23 | pending | 2 |

### Session 3 — HU-0a: version String→Int + versionLabel + backfill [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | En `activity.json`: `version` → `type: integer`, `static_default: "1"`; agregar `versionLabel` (`string`, `not_null: false`). Mantener `version` en `required`. | REQ-01 | developer | S2.GATE | mods/curriculum-design/objects/activity.json | json valido + `npm run codegen` | git revert | DET-1, DET-2, DET-8 | pending | 3 |
| S3.T2 | Seeds: `_data-univalle.js` / `_data-aiep.js` → `PROGRAMA_VERSION = 1` + `PROGRAMA_VERSION_LABEL = 'v2022-actual'`. | REQ-01 | developer | S3.T1 | mods/curriculum-design/seed/_data-univalle.js, _data-aiep.js | npm run seed produce Int+label | git revert | DET-5, DET-8 | pending | 3 |
| S3.T3 | Codegen + migracion Prisma con backfill de las 2 UPU (`version=1`, `versionLabel="v2022-actual"`) **en la misma migracion**. Aplicar a `uplanner_upu` (confirmar con dev — DB). | REQ-01 | developer | S3.T1, S3.T2 | object-manager/prisma/migrations/, prisma/schema.prisma (auto) | migracion aplica + backfill 2 UPU | migracion inversa Int→String | DET-5, DET-8, DET-11 | pending | 3 |
| S3.T4 | Layouts de Activity (RecordList/RecordDetail) muestran `version` + `versionLabel`. Tests: seed produce `version:1` (Int) + label; smoke UI. | REQ-01 | developer | S3.T3 | mods/curriculum-design/config/layouts/, tests | vitest + smoke UI | git revert | DET-5, DET-7 | pending | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier: T2) — backfill clean en UPU, seed produce Int+label; quality review DET-23; decidir continue | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4 | ticket | gate persistido + tests verdes + coverage | (no aplica) | DET-20, DET-23, DET-25 | pending | 3 |

### Session 4 — HU-0f: SET NOT NULL workflowId/currentStatusId [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Pre-check empirico en `uplanner_upu`: `SELECT count(*) FROM ... WHERE workflowId IS NULL OR currentStatusId IS NULL`. Si >0, backfill antes de migrar. Documentar resultado. | REQ-02 | developer | S3.GATE | uplanner_upu (query) | count = 0 (o backfill) | (no aplica — read) | DET-5, DET-11 | pending | 4 |
| S4.T2 | En `activity.json`: `workflowId` y `currentStatusId` → `not_null: true`; actualizar `description` (quitar "Nullable hasta S14"). Codegen + migracion SET NOT NULL. Aplicar a UPU (confirmar con dev — DB). | REQ-02 | developer | S4.T1 | mods/curriculum-design/objects/activity.json, object-manager/prisma/migrations/ | migracion SET NOT NULL aplica | migracion inversa (drop NOT NULL) | DET-5, DET-8, DET-11 | pending | 4 |
| S4.T3 | Remover guardas defensivas por null en `activity.resolver.js` (si existen). Tests: Activity sin `workflowId` falla con error claro; las 2 UPU tienen FKs poblados. Documentar cierre del deferral TICKET-019 S14. | REQ-02 | developer | S4.T2 | mods/curriculum-design/logic/activity.resolver.js, tests | vitest (insert sin FK → error) | git revert | DET-5, DET-7, DET-10 | pending | 4 |
| **S4.GATE** | Gate de sync Session 4 (tier: T2) — NOT NULL aplica en UPU sin error; quality review DET-23; decidir continue | — | reviewer | S4.T1, S4.T2, S4.T3 | ticket | gate persistido + tests verdes | (no aplica) | DET-20, DET-23, DET-25 | pending | 4 |

### Session 5 — HU-0h: allowsVersioning + initialStatusId FK + getInitialStatus [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | En `workflowStatus.json`: agregar `allowsVersioning` (`boolean`, `not_null: true`, `static_default: "false"`). | REQ-04 | developer | S4.GATE | mods/curriculum-design/objects/workflowStatus.json | json valido + codegen | git revert | DET-1, DET-2, DET-8 | pending | 5 |
| S5.T2 | En el `workflow.json` que consume el codegen (resuelto en S1/V2): agregar FK `initialStatusId` (`string`, `not_null: false`, `isForeignKey: true`, `references: "WorkflowStatus"`, `targetField: "id"`). | REQ-04 | developer | S5.T1, S1.GATE | objects/workflow.json (copia resuelta en V2) | json valido + codegen | git revert | DET-1, DET-2, DET-8 | pending | 5 |
| S5.T3 | Helper `getInitialStatus(workflowId)` = leer `workflow.initialStatusId`. Documentar en `object-manager/docs/versioning-capability.md`. (NO arreglar B3 — solo habilitar). | REQ-04 | developer | S5.T2 | mods/curriculum-design/seed/_data-workflow-objects.js o logic/, object-manager/docs/versioning-capability.md | unit getInitialStatus lee FK | git revert | DET-8, DET-10, DET-16 | pending | 5 |
| S5.T4 | Codegen + migracion (1 flag + 1 FK) aplicable a tenants. Aplicar a UPU (confirmar con dev — DB). Tests: marcar `allowsVersioning=true` en N statuses no falla; `initialStatusId` cardinalidad 1 (cambiar valor reemplaza). | REQ-04 | developer | S5.T1, S5.T2, S5.T3 | object-manager/prisma/migrations/ | migracion aplica + tests cardinalidad | migracion inversa (drop flag + FK) | DET-5, DET-8, DET-11 | pending | 5 |
| **S5.GATE** | Gate de sync Session 5 (tier: T2) — flag y FK presentes, cardinalidad 1 verificada; quality review DET-23; decidir continue | — | reviewer | S5.T1, S5.T2, S5.T3, S5.T4 | ticket | gate persistido + tests verdes | (no aplica) | DET-20, DET-23, DET-25 | pending | 5 |

### Session 6 — Regresion codegen + smoke runtime UPU [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S6.T1 | Regenerar codegen de todos los tenants. Diff vs baseline: objetos sin `allowsVersioning`/`initialStatusId`/`versionLabel` quedan sin cambios. | REQ-05 | developer | S5.GATE | object-manager/ (codegen output) | diff acotado a keys nuevas | git revert | DET-5, DET-16 | pending | 6 |
| S6.T2 | Smoke runtime UPU: arrancar object-manager, verificar schema OK + query Activity con campos nuevos. Regresion seeds. | REQ-05 | developer | S6.T1 | object-manager/ (runtime) | smoke UI/GraphQL sin error | (no aplica — verificacion) | DET-5, DET-7, DET-13 | pending | 6 |
| **S6.GATE** | Gate de sync Session 6 (tier: T3) — diff limpio + smoke verde; quality review DET-23 exhaustive; decidir continue | — | reviewer | S6.T1, S6.T2 | ticket | gate persistido + regresion completa | (no aplica) | DET-20, DET-23, DET-25 | pending | 6 |

### Session 7 — Cierre Track 0 CD: commits + gate Fase 1 + teach-close [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S7.T1 | Consolidar commits ordenados por tipo (feat/test/docs/chore) en object-manager (UPONE-1206) + mods/curriculum-design (UPONE-1038), per DET-27. Validar gate de Fase 1 del ticket (HU-0a/0f/0g/0h en conjunto). | REQ-05 | developer | S6.GATE | object-manager/, mods/curriculum-design/ | gate Fase 1 cumplido + commits | git revert | DET-13, DET-16, DET-27 | pending | 7 |
| **S7.GATE** | Gate de sync Session 7 (tier: T2) — gate Fase 1 cumplido, commits per DET-27; quality review DET-23; decidir close | — | reviewer | S7.T1 | ticket | gate persistido + cierre | (no aplica) | DET-20, DET-23, DET-25, DET-27 | pending | 7 |

### Task contract (detalle de las criticas)

```
Task S1.T1: V2 — fuente del codegen para workflow.json + flag core
- source_ref: REQ-04
- agent: researcher
- files: object-manager codegen script, business/Base/workflow.json, mods/curriculum-design/objects/workflow.json
- precondition: ninguna
- expected_output: nota documentada en ticket — cual workflow.json consume el codegen + si el flag core (UPONE-1183) bloquea el override del mod → decide donde cae initialStatusId en S5
- validation: lectura del codegen + grep del flag core; conclusion escrita
- rollback: no aplica (read-only)
- rules: [DET-4, DET-5, DET-11]

Task S3.T3: codegen + migracion version Int + backfill UPU
- source_ref: REQ-01
- agent: developer
- files: object-manager/prisma/migrations/, prisma/schema.prisma (auto-generado)
- precondition: activity.json editado (S3.T1) + seeds (S3.T2)
- expected_output: migracion que cambia version a Int + backfill de las 2 UPU en la misma migracion
- validation: migracion aplica a uplanner_upu; SELECT confirma 2 rows version=1
- rollback: migracion inversa Int→String (2 records pre-prod)
- rules: [DET-5, DET-8, DET-11]
- nota: aplicacion a la DB se confirma con el dev (super autopilot — operacion DB)

Task S4.T1: pre-check FKs poblados
- source_ref: REQ-02
- agent: developer
- files: uplanner_upu (query)
- precondition: S3 cerrado
- expected_output: count de FKs null = 0 (o backfill ejecutado)
- validation: SELECT count(*) WHERE workflowId IS NULL OR currentStatusId IS NULL
- rollback: no aplica (read)
- rules: [DET-5, DET-11]

Task S5.T2: FK initialStatusId en workflow.json
- source_ref: REQ-04
- agent: developer
- files: objects/workflow.json (la copia resuelta en V2/S1)
- precondition: S1.GATE (V2 resuelto) + S5.T1
- expected_output: FK initialStatusId presente en la copia correcta, codegen lo genera
- validation: codegen produce el FK en el schema; no rompe otros objetos
- rollback: git revert
- rules: [DET-1, DET-2, DET-8]
```

## Constraints

- RULE-dev-004: trabajo core en rama de epica — las migraciones Prisma tocan `object-manager` (core); van en rama `UPONE-1206`, mod en `UPONE-1038`. Merge a develop gated por revision del team up1.
- DET-18: draft skipped con justificacion (shapes canonicos ya definidos en el intake).
- DET-27: commits al cierre de cada session ejecutada, separados por tipo, en ambos repos.
- DET-30: autopilot super — auto-commit local sin OK; push/merge/destructivo/DB siempre preguntan.
- Decision D20/D22/D26 (Opcion C): estado inicial = 1 FK estructural, no flags-en-status + partial-unique.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| TICKET-019 S15 | internal | Backfill de FKs en UPU (hecho) | Si FKs null → S4 hace backfill antes de SET NOT NULL |
| CAP-CUR-018 (PM/Confluence) | external | Define el `versionLabel` institucional | No bloquea — la migracion Int no espera al PM |
| object-manager codegen | internal | Traduce JSON → Prisma + GraphQL | Si el FK cae en el workflow.json equivocado, el codegen no lo ve (V2/S1 lo resuelve) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| SET NOT NULL falla con FK null en UPU | low | medium | Pre-check empirico S4.T1 antes de migrar; backfill si aparece null |
| FK en workflow.json equivocado (mod vs core) | medium | high | S1/V2 resuelve la fuente del codegen + efecto del flag core antes de editar |
| Codegen toca objetos sin la key nueva | low | medium | S6 regenera todos los tenants + diff vs baseline; gate exige diff limpio |
| Migracion destructiva sobre data real | medium | high | Aplicacion a `uplanner_upu` confirmada con el dev (super autopilot — DB) |

## Open questions

- [ ] (resuelta en S1) ¿Cual `workflow.json` consume el codegen (mod vs core) y como afecta el flag `core` de UPONE-1183 donde cae `initialStatusId`? — gateado por S1/V2; bloquea S5.T2.

## Decisions

### DEC-LOCAL-01: Estado inicial via 1 FK estructural (Opcion C) — delta v5→v5.1
- **Contexto**: el ticket Jira pedia HU-0h con 2 FKs (`versionInitialStatusId`/`scratchInitialStatusId`) + flags en status. Modelar la unicidad "un estado inicial por workflow".
- **Drivers**: robustez de la invariante (FK card. 1 imposible de violar), coherencia con el catalogo global de WorkflowStatus (sin `workflowId`), no tocar el motor del codegen, reversibilidad/extensibilidad futura.
- **Opcion elegida**: 1 FK `initialStatusId` compartido entre version e instancia desde cero.
- **Alternativas**: (A) flag isInitial* + partial-unique — descartada (catalogo global incoherente + toca codegen); (B) 2 FKs — descartada (ningun caso del sprint diverge; complejidad prematura).
- **Consecuencias**: cubre el 100% de casos del sprint con 1 columna; si version/scratch divergen a futuro, se agrega `scratchInitialStatusId` aditivo. Cierra B3 de raiz (helper lee el FK).
- **Session**: intake (TICKET-034) — confirmado en design.

## Technical reference

- `activity.json`: `version` (:39-43, string→integer), `versionLabel` (nuevo), `workflowId` (:86-94, FK→Workflow), `currentStatusId` (:95-104, FK→WorkflowStatus, readOnly). `version` en `required` (:119) — se mantiene.
- `auditCapture.resolver.js:56-57`: `EXCLUDED_FIELDS` incluye `version` (REQ-PRESERVE-04) → cambio de tipo sin audit.
- `workflow.json` **duplicado**: mod `mods/curriculum-design/objects/workflow.json` + core `object-manager/objects/business/Base/workflow.json`. Ninguno tiene FK a estado inicial. Flag `core` (UPONE-1183/PLAT-01) protege objetos canonicos del override del mod — verificar en S1.
- `workflowStatus.json`: catalogo global (institutionId, code, name, category, status); uniqueConstraints `[[institutionId,code],[institutionId,name]]`; sin `workflowId`. Sin flags.
- `_data-workflow-objects.js`: statuses (BOR/EDIT/REV-DEC/PUB/DIS/...) + transitions; `resolveDefaultActivityWorkflow` hardcodea `'BOR'` (~:386) — B3, NO se arregla aqui.

## Rules discovered

{Se llena durante ejecucion.}

## Bugs found

- B3: `resolveDefaultActivityWorkflow` hardcodea `'BOR'` — preexistente, fix en TICKET-043 HU-8c. Este ticket lo habilita con el FK.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..05 pasan
- [ ] **Tests**: seed produce version Int+label; Activity sin FK falla; cardinalidad 1 del FK; grep KB limpio
- [ ] **NFRs**: n/a
- [ ] **Rules**: RULE-dev-004 (rama de epica), DET-27 (commits), shapes canonicos respetados
- [ ] **Integration**: regresion codegen sin diff espurio; UPU smoke verde; seeds no rotos
- [ ] **Docs**: `versioning-capability.md` documenta el FK + helper; KB sin AcademicActivity

## Archiving

Usar `/dkc-archive-spec SPEC-015-activity-versioning-model-prep "razon"` cuando deje de ser fuente de verdad.
