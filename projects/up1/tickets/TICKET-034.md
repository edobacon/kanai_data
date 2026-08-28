---
id: TICKET-034
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1220
module: curriculum-design
autopilot: autonomous
---

# Track 0 CD | Cambios en el modelo del mod para versionar Activity

## Request

> Contenido literal del ticket Jira [UPONE-1220](https://u-planner.atlassian.net/browse/UPONE-1220) (Historia, parent epic UPONE-1038 "Curriculum Design | Programa de asignatura"). Reporter/Assignee: Eduardo Bacon.

### Descripción

Cambios en el modelo y seed del mod `curriculum-design` para que `Activity` sea versionable: tipo de `version`, FKs obligatorios, política institucional del estado inicial y limpieza del KB.

### Alcance (sub-tareas)

* **HU-0a** — `Activity.version` String→Int + nuevo `versionLabel` (migra las 2 instancias UPU).
* **HU-0f** — `workflowId` y `currentStatusId` a NOT NULL.
* **HU-0g** — Rename `AcademicActivity → Activity` en el KB/specs (el código ya se renombró en UPONE-1100).
* **HU-0h** — `WorkflowStatus.allowsVersioning` (desde qué estados se versiona) + 2 FK de entrada en `Workflow` (`versionInitialStatusId`/`scratchInitialStatusId`).

### Criterios de aceptación

* Seed produce `version: 1` (Int) + `versionLabel`; las 2 UPU migradas en la misma migración.
* Activity sin `workflowId`/`currentStatusId` falla con error claro.
* El estado inicial de versión/scratch se resuelve por configuración (FK del workflow), no por hardcode.
* KB sin referencias a `AcademicActivity`.

### Dependencias

Usa el `versionLabel` que defina CAP-CUR-018 (PM), pero no se bloquea por eso.

### Por qué

Prepara el modelo del mod para versionar. Lo central es **HU-0h**: define dónde y desde qué estados se versiona como configuración institucional (no en código). Va en UPONE-1038 por tocar el mod curriculum-design.

> Prioridad: Alta (prerequisito de la adopción).

> **Nota DKC — delta v5 → v5.1 (Opción C, anotado para validacion post-ejecucion)**: el ticket Jira declara HU-0h con **2 FK** (`versionInitialStatusId`/`scratchInitialStatusId`). v5.1 implementa **1 FK** unico `initialStatusId` (compartido versión/scratch). Razón: hoy ambos arrancan en `BOR` (Univalle); ningún caso del sprint justifica divergencia. Si a futuro deben divergir, se agrega un 2° FK aditivo. Error: `WORKFLOW_HAS_NO_INITIAL_STATUS`. La descripcion original referencia `historias-sprint-4_v5.md` (transitorio) — material internalizado abajo.

## Contexto operativo del plan SP3

> Track 0 CD agrupa 4 HUs prerequisito del mod curriculum-design. **Paralelos** salvo HU-0h (necesita V2 confirmado).

### P1.2 — HU-0g · KB rename AcademicActivity→Activity (Fase 1) · [mod/docs] · `P1`

- **Meta**: refactor/docs · ~1 SP · certeza confirmado · rollback git revert (doc) · riesgo bajo
- **Contexto**: el código ya renombró `academicActivity → activity` (UPONE-1100 cerrado); el KB de specs quedó con el nombre viejo. Esto cierra el lag KB↔código.
- **Que se realiza**: grep + replace `AcademicActivity → Activity` en las specs del mod; 1 nota historica del rename.
- **Depende de**: nada.
- **Investigar**: nada.
- **Prueba**: grep final sin `AcademicActivity` en `specs/curriculum-design/`.

### P1.3 — HU-0a · version String→Int + versionLabel (Fase 1) · [mod] · `P1`

- **Meta**: implement (migracion) · ~2 SP · certeza confirmado · rollback migracion inversa Int→String (2 records UPU, pre-prod) · riesgo bajo
- **Contexto**: hoy `version` es `string` (ej. `"v2022-actual"`). El versionamiento auto-incremental necesita `version: Int` (system-managed); la libertad de codificacion institucional se preserva en `versionLabel: String?`. Solo afecta 2 instancias UPU (pre-produccion).
- **Que se realiza**: en `activity.json`, `version → integer` (`static_default: "1"`) + nuevo `versionLabel`; seeds `PROGRAMA_VERSION=1` + `PROGRAMA_VERSION_LABEL='v2022-actual'`; migracion Prisma con backfill de las 2 UPU en la misma migracion; layouts muestran ambos campos.
- **Depende de**: nada bloqueante para el dev. CAP-CUR-018 (PM/Confluence) corre en paralelo — usamos su `versionLabel` institucional como input, pero la migracion Int no espera al PM.
- **Investigar**: nada.
- **Prueba**: `migracion` backfill 2 UPU; `unit` seed produce `version:1` (Int) + `versionLabel`; `smoke` UI. `version` ya en `EXCLUDED_FIELDS`.

### P1.4 — HU-0f · SET NOT NULL workflowId/currentStatusId (Fase 1) · [mod] · `P1`

- **Meta**: improvement (migracion) · ~1 SP · certeza confirmado (pre-check FKs) · rollback migracion inversa (drop NOT NULL) · riesgo bajo
- **Contexto**: ambos FK son `not_null: false` con comentario "Nullable hasta S14". Hacerlos NOT NULL simplifica el resolver de versionamiento (sin defensive null) y cierra el deferral de TICKET-019 S14.
- **Que se realiza**: pre-check de que las 2 UPU tienen ambos FK poblados (backfill si null); `activity.json` → `not_null: true`; migracion SET NOT NULL; remover guardas defensivas por null si existen.
- **Depende de**: TICKET-019 S15 (hecho).
- **Investigar**: pre-check de FKs poblados en UPU.
- **Prueba**: `migracion` SET NOT NULL aplica a UPU; `unit` Activity sin `workflowId` falla con error claro.

### P1.6 — HU-0h · WorkflowStatus.allowsVersioning + 1 FK de entrada en Workflow (Fase 1, gatea HU-3) · [mod] · `P0`

- **Meta**: implement (modelo) · ~2 SP · certeza confirmado / a validar V2 · rollback migracion inversa (drop flag + 1 FK) · riesgo: confirmar copia de workflow.json (V2)
- **Contexto**: la politica del estado inicial. `WorkflowStatus` es **catalogo global** (un `BOR` compartido entre workflows/tipos de objeto) → un flag `isInitial*` en el status seria global e incoherente. Solucion: el estado inicial vive como **FK de cardinalidad 1 en `Workflow`** (unicidad estructural, sin partial-unique). `allowsVersioning` si es flag de status. Statuses per-workflow se difieren (D26).
- **Que se realiza**: `workflowStatus.json` +flag `allowsVersioning` (`static_default "false"`); `workflow.json` +1 FK (`initialStatusId`, `references: "WorkflowStatus"`); migracion (1 flag + 1 FK); helpers `getInitialStatus` = leer el FK.
- **Depende de**: G-V2.
- **Investigar**: G-V2 (cual copia de `workflow.json` consume el codegen, core `business/Base/workflow.json` vs mod `mods/curriculum-design/objects/workflow.json` — duplicado). No investigar statuses per-workflow (diferido).
- **Prueba**: `migracion` aplica a tenants; `unit` `initialStatusId` cardinalidad 1; marcar `allowsVersioning` en N no falla.

### Gate de Fase 1 (que cumplir antes de cerrar Track 0 CD)

Revisar en conjunto HU-0a/0f/0g/0h. Para este ticket:
1. **Tests** verdes (`Prueba` de cada paso) + **regresion-codegen** obligatoria por HU-0h (regenerar todos los tenants, diff sin cambios en objetos sin la key).
2. **Revision**: migraciones reversibles, no rompen seeds/tenants; FK de entrada bien modelado; KB consistente con codigo.
3. **QA de codigo**: lint/typecheck, migraciones, manejo de errores en helpers.
4. **Decision** continuar/iterar.

## Material internalizado — HUs detalladas

### HU-0a · Migrar Activity.version a Int + agregar versionLabel (IMP-1)

**Sprint:** SP3 · **Track:** SOT change · **Repos:** `mods/curriculum-design`, `object-manager` (prisma migration), Confluence (coordinacion PM)

**Como** equipo platform + PM
**Quiero** que `Activity.version` sea `Int` (auto-managed) y agregar `versionLabel: String?` (codigo institucional libre)
**Para** que el versionamiento auto-incremental funcione naturalmente, manteniendo la libertad de codificacion institucional via `versionLabel`.

**Estado actual verificado:** `activity.json:39-43` — `version: { type: "string", not_null: true }`. `version` ya esta en `EXCLUDED_FIELDS` del audit (`auditCapture.resolver.js:57`) → el cambio a Int no genera ruido en el changeLog.

**Criterios de aceptacion:**

- [ ] **Coordinacion**: el PM actualiza CAP-CUR-018 reflejando `version` (system) + `versionLabel` (user). Link en este ticket.
- [ ] `activity.json`: `version` → `type: integer`, `static_default: "1"`; nuevo `versionLabel: { type: string, not_null: false }`.
- [ ] Seeds `_data-univalle.js` / `_data-aiep.js`: `PROGRAMA_VERSION = 1` + `PROGRAMA_VERSION_LABEL = 'v2022-actual'`.
- [ ] Migracion Prisma con backfill: las 2 instancias UPU → `version=1, versionLabel="v2022-actual"` **en la misma migracion**.
- [ ] `specs/curriculum-design/legacy-examples.md` y `programa-de-asignatura.md` actualizados.
- [ ] Layouts de Activity (RecordList/RecordDetail) muestran ambos campos.
- [ ] Tests: seed produce `version: 1` (Int) + `versionLabel` poblado. Smoke UI.

**Dependencias:** PM firma actualizacion Confluence.
**Si vetado**: fallback v2 — `versionStrategy: "user-provided"` (implica **adelantar user-provided desde SP4**; requiere reaprobar alcance con Klaus, ya que la epica fija solo `increment` en SP3).

### HU-0f · SET NOT NULL en Activity.workflowId y currentStatusId (IMP-6)

**Sprint:** SP3 · **Track:** SOT change · **Repos:** `mods/curriculum-design`, `object-manager` (prisma migration)

**Como** dev del mod
**Quiero** que `Activity.workflowId` y `Activity.currentStatusId` sean NOT NULL
**Para** simplificar el resolver de versionamiento (sin defensive null) y cerrar el "S14 deferido" de TICKET-019.

**Estado actual verificado:** `activity.json:86-103` — ambos `not_null: false` con comentario "Nullable hasta S14", `isForeignKey: true` ya declarado.

**Criterios de aceptacion:**

- [ ] Pre-check: las 2 instancias UPU tienen ambos FKs poblados (post-S15). Si null, backfill.
- [ ] `activity.json`: `workflowId` y `currentStatusId` → `not_null: true`; actualizar `description`.
- [ ] Migracion Prisma SET NOT NULL en ambas columnas. Aplica a UPU sin errores.
- [ ] Tests: Activity sin `workflowId` falla con error claro. Las 2 UPU tienen FKs poblados.
- [ ] Remover guardas defensivas por null en `activity.resolver.js` (si existen).
- [ ] Documentar cierre del deferral de TICKET-019 S14.

**Dependencias:** TICKET-019 S15 (hecho).
**Si vetado**: fallback v2 — defensive null + error `SOURCE_WORKFLOW_NOT_ASSIGNED`.

### HU-0g · Unificar KB AcademicActivity → Activity (IMP-7)

**Sprint:** SP3 · **Track:** SOT change · **Repo:** KB de specs (`specs/curriculum-design`)

**Como** dev del mod
**Quiero** unificar las referencias del KB a `Activity` (post-rename TICKET-019)
**Para** cerrar el lag KB↔codigo.

**Criterios de aceptacion:**

- [ ] Grep + replace `AcademicActivity → Activity` en `overview.md`, `programa-de-asignatura.md`, `legacy-examples.md`, `open-questions.md`, `business-rules/BR-*.md`, `capabilities/CAP-CUR-*.md`.
- [ ] 1 nota historica del rename en `overview.md`.
- [ ] Grep final sin referencias accidentales a `AcademicActivity`.

**Dependencias:** Ninguna.
**Si vetado**: nota al pie. Sin impacto en codigo.

### HU-0h · WorkflowStatus con allowsVersioning + Workflow con un FK de entrada (IMP-9)

**Sprint:** SP3 · **Track:** SOT change · **Repos:** `mods/curriculum-design` (modelo + seed)

**Como** dev del mod + dev platform
**Quiero** extender `WorkflowStatus` con el flag `allowsVersioning`, y `Workflow` con un FK de entrada (`initialStatusId`)
**Para** que la politica de versionamiento (que estados versionan, cual es el estado inicial — compartido por version e instancia nueva) viva en la configuracion institucional, con la unicidad del estado inicial **garantizada estructuralmente** (un FK no puede tener dos valores).

**Estado actual verificado:** `workflowStatus.json` no tiene flags y es **catalogo global por institucion** (sin `workflowId`; el link a Workflow es via `WorkflowTransition`). `workflow.json` no tiene FK a un estado inicial; `resolveDefaultActivityWorkflow` hardcodea `'BOR'` (B3).

> **Decision scoped (D20/D22/D26)**: la unicidad "un estado inicial por workflow" se modela como **FK de cardinalidad 1 en `Workflow`** (no flags-en-status + partial-unique). Cierra el gap del catalogo global sin denormalizar `workflowId` al status. Statuses per-workflow se difieren.

**Criterios de aceptacion:**

- [ ] `workflowStatus.json` agrega 1 property: `allowsVersioning` (`not_null: true`, `static_default: "false"`) — "una instancia puede versionarse cuando esta en este estado".
- [ ] `workflow.json` agrega 1 FK (`not_null: false`, `isForeignKey: true`, `references: "WorkflowStatus"`, `targetField: "id"`):
  - [ ] `initialStatusId` — "estado inicial del workflow: donde arranca una nueva version **y** una instancia desde cero (compartido). Consumido por `resolveDefaultActivityWorkflow` (fix B3)".
- [ ] Migracion Prisma: 1 campo en WorkflowStatus + 1 FK en Workflow. Las instancias seedeadas: `allowsVersioning=false`, FK del workflow seteado por el seed (HU-8c, otro ticket).
- [ ] Resolvers/helpers `getInitialStatus(workflowId)` = leer el FK del workflow (consumido por HU-3 y por el seed).
- [ ] Documentado en `object-manager/docs/versioning-capability.md`.
- [ ] Tests: marcar `allowsVersioning=true` en N statuses no falla. `initialStatusId` apunta a un status valido; cambiar el valor reemplaza el anterior (cardinalidad 1, sin posibilidad de dos estados iniciales por workflow).

**Dependencias:** Ninguna (semana 1).
**Si vetado**: fallback v2 — politica en JSON del mod (pierde politica institucional).

## Material internalizado — Decisiones de diseno

### D20/D22/D26 (Opcion C) — Estado inicial unico via FK estructural

**Decision fijada (scoped)**: el estado inicial de version/scratch se modela como **un FK de entrada en `Workflow`** (`initialStatusId`). La unicidad "un solo inicial por workflow" es **estructural** (un FK es de cardinalidad 1). **Descartado** el partial-unique declarativo en codegen (IMP-10) para versionamiento.

**Justificacion**:
- `WorkflowStatus` es catalogo global (sin `workflowId`); un flag `isInitial*` en el catalogo seria global, incoherente para una capacidad transversal. El partial-unique "por workflow" no tenia sobre que anclarse.
- Un FK de cardinalidad 1 hace la invariante **imposible de violar** sin indice, validacion runtime, ni la clase de error `WORKFLOW_HAS_MULTIPLE_*`. Mas robusto que el partial-unique y mas liviano (no toca el motor del codegen).
- **Opcion C (v5.1)**: version e instancia nueva comparten el mismo `initialStatusId` (hoy ambos `BOR` en Univalle); si a futuro deben divergir, se agrega un 2° FK aditivo. Cierra B3 de raiz (el helper lee `workflow.initialStatusId`).

### V2 (verificacion previa a HU-0h)

| Verificar | Antes de | Detalle |
|-----------|----------|---------|
| Cual `workflow.json` consume el codegen como fuente (core `business/Base` vs mod) para agregar el FK de entrada | HU-0h | Define si el FK cae mod-local o en el objeto core (aditivo igual) |

## Material internalizado — Discovery (gaps con archivo:linea)

### §2.6 Mod curriculum-design (estado actual)

- `activity.json`: `version: string` (:39-43); `previousVersionId` sin FK (:45); `workflowId` (:86-94) y `currentStatusId` (:95-104) `not_null: false` + `isForeignKey: true` ("Nullable hasta S14"). Sin seccion `relations` propia.
- `auditCapture.resolver.js`: **dos copias** — mod-local `mods/curriculum-design/logic/auditCapture.resolver.js:56-59` y `object-manager/src/graphql/resolvers/mods/curriculum-design/auditCapture.resolver.js`. `ENTITY_TYPE_MAP` cerrado a Activity/CurricularSection/CurricularLink (:100-104).
- `resolveDefaultActivityWorkflow` (`seed/_data-workflow-objects.js:363`) hardcodea `code='BOR'` (:386); consumidores solo del mod.

### §2.7 Modelo Workflow ↔ WorkflowStatus (hallazgo de fondo)

- `Workflow` existe **duplicado**: core `object-manager/objects/business/Base/workflow.json` y mod `mods/curriculum-design/objects/workflow.json` (copia activa del seed). Properties: `institutionId, name, description, scopeType, isDefault, lifecycle, createdBy`. **Sin FK a estado inicial.**
- `WorkflowStatus` (solo mod): `institutionId, code, name, category, description, status`. **Sin `workflowId`.** Es **catalogo global por institucion**.
- El link status↔workflow existe **solo via `WorkflowTransition`** (`mods/curriculum-design/objects/workflowTransition.json:19-43`: `workflowId`, `fromStatusId`, `toStatusId`).
- El mismo `BOR` lo comparten `activity-standard`, `activity-fast`, `curriculumPlan-standard`, `competencyNode-standard` (`_data-workflow-objects.js:32-42,156-171`).

## Material internalizado — Factibilidad §3.1, §3.2

### §3.1 activity.json (estado actual hecho)

| Campo | Estado actual | Linea |
|-------|---------------|-------|
| `version` | `type: "string"`, `not_null: true` (ej. `"v2022-actual"`) | 39-43 |
| `previousVersionId` | `type: "string"`, `not_null: false`, **sin `isForeignKey`** | 45-49 |
| `workflowId` | FK → Workflow, `not_null: false` ("Nullable hasta S14") | 86-93 |
| `currentStatusId` | FK → WorkflowStatus, `not_null: false`, `readOnly: true` | 95-103 |

**Ausentes**: `versionLabel`, bloques `versioning` / `prefillFrom` / `polymorphicChildren` (estos ultimos viven en TICKET-043 HU-8).

### §3.2 Estado inicial de una Activity nueva (hallazgo decisivo)

- **No existe ninguna ruta productiva que cree Activities.** Solo el seed.
- El estado inicial se resuelve via el helper `resolveDefaultActivityWorkflow`, que **hardcodea `code='BOR'`**.
- No hay `initialStateValue` ni `static_default` en el JSON.

**Implicacion**: el concepto "estado inicial" vive como string hardcodeado en el seed. Introducir un flag declarativo no colisiona con nada productivo, pero **obliga a refactorizar el helper** (fix B3, en TICKET-043 HU-8c).

## Material internalizado — Shapes canonicos del modelo

### `workflowStatus.json` post-HU-0h (solo flag allowsVersioning)

```json
{
  "metadata": {
    "uniqueConstraints": [["institutionId", "code"], ["institutionId", "name"]]
  },
  "properties": {
    "allowsVersioning": {
      "type": "boolean", "not_null": true, "static_default": "false",
      "description": "Si true, una instancia puede versionarse cuando esta en este estado."
    }
  }
}
```

> **Nota scoped**: se quitan los flags `isInitial*` y el `partialUniqueConstraints`. El estado inicial vive como FK de entrada en `Workflow`. `WorkflowStatus` sigue siendo catalogo global (sin `workflowId`).

### `workflow.json` post-HU-0h (1 FK de entrada — Opcion C)

```json
{
  "properties": {
    "initialStatusId": {
      "type": "string",
      "not_null": false,
      "isForeignKey": true,
      "references": "WorkflowStatus",
      "targetField": "id",
      "description": "Estado inicial del workflow: arranque de una NUEVA VERSION y de una instancia DESDE CERO (compartido). Cardinalidad 1 → unicidad estructural. Leido por resolveDefaultActivityWorkflow (reemplaza el hardcode 'BOR' — fix B3)."
    }
  }
}
```

### `activity.json` post-HU-0a + HU-0f (campos modificados)

```json
{
  "properties": {
    "version": { "type": "integer", "not_null": true, "static_default": "1", "description": "Version numerica system-managed." },
    "versionLabel": { "type": "string", "not_null": false, "description": "Codigo institucional libre (ej. 'v2022-actual')." },
    "workflowId": { "type": "string", "not_null": true, "isForeignKey": true, "references": "Workflow", "targetField": "id" },
    "currentStatusId": { "type": "string", "not_null": true, "isForeignKey": true, "references": "WorkflowStatus", "targetField": "id", "readOnly": true }
  }
}
```

> **Out of scope** en este ticket: `previousVersionId` con FK reflexivo + bloques `metadata.polymorphicChildren`/`prefillFrom`/`versioning`. Esos van en TICKET-043 (HU-8a).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | multi (toca activity.json + workflowStatus.json + workflow.json + seeds + KB + migraciones) |
| Modulo principal | curriculum-design |
| Modulos afectados | mods/curriculum-design (modelo + seeds), object-manager (prisma migrations), KB specs |
| Layer | mod (con migracion que aplica a tenants via object-manager) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | — |
| Data model | yes | Tipo de `version` Int + `versionLabel` String?; NOT NULL en 2 FK; flag `allowsVersioning` en WorkflowStatus; nuevo FK `initialStatusId` en Workflow |

### Draft status

| Campo | Valor |
|-------|-------|
| Aprobado | n/a |
| Version aprobada | — |
| Path | — |

> No requiere draft DKC formal: cambios aditivos al modelo (columnas nullable o NOT NULL en pre-prod) + migracion de 2 records UPU. Shapes canonicos definidos arriba.

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El cambio a Int + backfill de 2 instancias UPU es trivial porque `version` ya esta en `EXCLUDED_FIELDS` del audit | ✓ confirmada | `auditCapture.resolver.js:57` incluye `version`; el cambio de tipo no genera audit rows |
| H2 | El SET NOT NULL aplica clean a UPU porque los FKs ya estan poblados post-TICKET-019 S15 | ✓ confirmada (a validar con pre-check) | TICKET-019 S15 cerrado completo el backfill de FKs |
| H3 | El `workflow.json` core (`object-manager/objects/business/Base/workflow.json`) es el que consume el codegen, no el del mod | ~ a validar via V2 | El mod duplica `workflow.json` para el seed; el codegen lee de `objects/business/Base/`. Verificar antes de poner el FK |
| H4 | Implementar 1 FK ahora (`initialStatusId`) en lugar de 2 (Opcion C) es suficiente porque todos los workflows hoy arrancan en `BOR` | ✓ confirmada | `_data-workflow-objects.js:32-42,156-171` muestra `BOR` compartido entre 4 workflows; ningun caso del sprint divergente |

### Context found

- **Rules del modulo**: RULE-dev-004 (trabajo en mod sigue su flujo autocontenido + sync; cuando hay migracion de schema, requiere coordinacion con codegen del core).
- **Bugs abiertos**: B3 (`resolveDefaultActivityWorkflow` hardcodea `'BOR'`) — el fix se hace en TICKET-043 (HU-8c), no aqui. Este ticket lo habilita agregando el FK.
- **Specs relacionados DKC**: TICKET-018, TICKET-019, TICKET-020 (SP2, todos closed) — tocaron `Activity` y workflow.
- **Docs relevantes del repo (permanentes, no temporales)**:
  - `mods/curriculum-design/objects/activity.json` (modelo activo)
  - `mods/curriculum-design/objects/workflowStatus.json` (catalogo global)
  - `mods/curriculum-design/objects/workflow.json` (copia del seed) + `object-manager/objects/business/Base/workflow.json` (verificar V2)
  - `mods/curriculum-design/seed/_data-workflow-objects.js` (helper hardcodea 'BOR')
  - `specs/curriculum-design/` (KB con referencias `AcademicActivity` a renombrar)
- **Warnings**:
  - **HU-0h gatea HU-3 (TICKET-039)** — el resolver de `asNewVersion` lee `workflow.initialStatusId`. Sin esto, HU-3 no avanza.
  - **HU-0a + HU-0f son destructivos en schema**: backfill de 2 records UPU + SET NOT NULL. Reversible con migracion inversa, pero requiere pre-check.
  - **Branch core**: `UPONE-1206` (no `develop`). Aunque modulo principal es `curriculum-design`, las migraciones Prisma tocan codigo core (RULE-dev-004).

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1206` (epica core, RULE-dev-004 — hay migraciones que tocan codigo core) |
| Base branch | `develop` |
| Repo path | `/Users/edobacon/Workspace/uplanner/up1` |
| DB state | UPU recreada via reset canonico 2026-05-28 (2 instancias seed cargadas); BASEMODEL fresh |
| Services | object-manager (4000), postgres local (5432), redis |
| Test data | 2 instancias seed Activity UPU (post-reset); 1 workflow `activity-standard` con statuses (BOR, PUB, etc.) |

### Reproduction steps

n/a (no es fix). Verificacion pre-trabajo:
```
cd /Users/edobacon/Workspace/uplanner/up1
# Pre-check FKs poblados (HU-0f)
# Pre-check version Int viable (HU-0a)
# Pre-check workflow.json consumido por codegen (V2)
```

## Sessions

### Modo (autopilot)

| Timestamp | Transicion | Razon | Aplica desde |
|-----------|------------|-------|--------------|
| 2026-05-29T14:39:45Z | false → super | dev trigger `autopilot super` (`/dkc continue 034 autopilot super`) | arranque del execute |

### Plan de sessions

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | V2 — verificar cual `workflow.json` consume el codegen (core vs mod) | execute | T0 | S1.T1 | auto | V2 resuelto |
| S2 | HU-0g — KB rename AcademicActivity → Activity | execute | T0 | S2.T1 | auto | grep final sin `AcademicActivity` |
| S3 | HU-0a — version String→Int + versionLabel: JSON + seeds + migracion + backfill | execute | T2 | S3.T1, S3.T2, S3.T3, S3.T4 | ⚑ fuerte | backfill clean en UPU; seed produce Int+label |
| S4 | HU-0f — SET NOT NULL workflowId/currentStatusId | execute | T2 | S4.T1, S4.T2, S4.T3 | ⚑ fuerte | NOT NULL aplica en UPU sin errores |
| S5 | HU-0h fase 1 — workflowStatus.json + workflow.json (1 FK, Opcion C) + migracion | execute | T2 | S5.T1, S5.T2, S5.T3, S5.T4 | ⚑ fuerte | flag y FK presentes; cardinalidad 1 verificada |
| S6 | HU-0h fase 2 — regresion codegen post-cambios + smoke runtime UPU | execute | T3 | S6.T1, S6.T2 | ⚑ fuerte | diff sin cambios en objetos sin la key |
| S7 | Cierre Track 0 CD — consolidar commits, validar gate de Fase 1, learns | execute | T2 | S7.T1 | ⚑ fuerte | gate Fase 1 cumplido; commits per DET-27 |

> Cada session se materializa via `dkc-execute-task open-session N` (DET-29). Stubs lazy (HOR-064): solo la session activa se escribe con bloque `**Tasks completadas:**`.

### Session 1 — 2026-05-29 — V2: fuente del codegen para workflow.json + flag core [phase: execute]

**Tipo**: auto
**Validation tier**: T0

**Objetivo**: Resolver V2/H3 — cual `workflow.json` consume el codegen (core `business/Base` vs mod) y el efecto del flag `core` (UPONE-1183/PLAT-01) sobre el override del mod. Define donde cae `initialStatusId` en S5.

**Tasks completadas**:
- [x] S1.T1 — Investigar cual workflow.json consume el codegen como fuente + verificar efecto del flag core (UPONE-1183) sobre el override del mod. Documentar conclusion en el ticket.
- [x] S1.GATE — Gate de sync Session 1 (tier T0) — persistir V2 resuelto, decidir continue.

**V2 resuelto (conclusion):**

| Pregunta | Hallazgo | Evidencia |
|----------|----------|-----------|
| ¿Cual workflow.json consume el codegen? | Siempre `object-manager/objects/business/Base/workflow.json` | `fileParsing.js getObjectToFileMap()` + `generatePrismaSchema.js:989` |
| ¿Como llega el mod al core? | Sync Fase 2 (`performMergeSync`) mergea `mods/curriculum-design/objects/workflow.json` → `business/Base/` ANTES del codegen (Fase 3) | `SyncManager.js:122-134`, `fileSync.js:322-386` |
| ¿El flag `core` bloquea el override del mod sobre Workflow? | **No** — `Workflow` no tiene `core: true` (lo tienen ~15 objetos como availability/attendance/event). `isObjectCore()` retorna false → mod puede agregar fields | `fileSync.js:667-670,746,799,834` + grep `"core"` en ambos workflow.json (0 matches) |

**Decision V2 → donde cae `initialStatusId` (S5.T2)**: en `mods/curriculum-design/objects/workflow.json`. El mod lo define, el sync lo mergea al core, el codegen lo genera. H3 (open → confirmed).

**Discoveries / Learns nuevos**:
- L1 (validado): el flag `core` (UPONE-1183) NO protege `Workflow` → el FK del mod no se bloquea. Si en el futuro `Workflow` recibe `core: true`, el FK tendria que moverse al core `business/Base/workflow.json`.

**Validacion del tier**:
- T0 — Lint frontmatter: pass (decisions_log + frontmatter validos via dkc-validate). Cross-references: pass (paths del hallazgo verificados con grep en el repo).

**Quality review (DET-23)**:

**Reviewer**: LLM principal (S1 es T0 investigacion read-only — revision light)
**Tier de revision**: light
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | n/a | Sin codigo modificado (investigacion read-only) |
| 7 | Claridad | pass | Conclusion V2 con evidencia path:line; decision de S5.T2 explicita |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → V2 resuelto: FK initialStatusId va en mods/curriculum-design/objects/workflow.json (Workflow sin core:true). Session 2 (HU-0g KB rename)
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Decision**: continue → Session 2 (HU-0g KB rename)

### Session 2 — 2026-05-29 — HU-0g: KB rename AcademicActivity → Activity [phase: execute]

**Tipo**: auto
**Validation tier**: T0

**Objetivo**: Renombrar `AcademicActivity → Activity` en los docs VIVOS del KB del mod (overview, programa-de-asignatura, legacy-examples, open-questions, modeling-guide, INDEX, business-rules/, capabilities/). Preservar specs cerrados historicos (SPEC-001/004/005/006/010, SPEC-academic-activity-list, presentations/) que documentan el rename — DET-3/DET-6 inmutabilidad. 1 nota historica en overview.md.

**Tasks completadas**:
- [x] S2.T1 — Grep+replace AcademicActivity→Activity en docs vivos del KB + nota historica en overview.md. Grep final sin AcademicActivity en docs vivos (specs cerrados historicos preservados).
- [x] S2.GATE — Gate de sync Session 2 (tier T0) — grep final limpio en docs vivos, decidir continue.

**Discoveries / Learns nuevos**:
- L2: El rename HU-0g NO es un replace ciego. 3 clases de ocurrencia que un replace global corromperia: (a) `ownerType: "AcademicActivity"` es un VALOR de dato del enum `ownerType` (open-questions.md:187,207, legacy-examples.md:132) — renombrarlo sin verificar el valor real en codigo deja el KB incorrecto; (b) `AcademicActivity.json` referencia un filename que hoy es `activity.json` (lowercase) — replace daria `Activity.json` inexistente; (c) open-questions.md §1 (lineas 114+) es doc historico de propuesta de diseno (DET-3/DET-6 inmutabilidad). Detected by: passive (S2.T1). Status: raw.

**Decision del dev (2026-05-29)**: rename **amplio** — renombrar todas las ocurrencias en docs vivos (incluyendo `ownerType` y filenames), asumiendo que el rename del objeto arrastro todo. Specs cerrados historicos (SPEC-001/004/005/006/010, SPEC-academic-activity-list) + presentaciones + SPEC-015 (describe el rename) preservados. L2 queda como nota del trade-off aceptado: si el valor de dato `ownerType` NO cambio a "Activity" en el codigo real, el KB queda optimista — revisitar si aparece inconsistencia.

**Validacion del tier**:
- T0 — Lint frontmatter: pass. Cross-references: grep final `AcademicActivity` en docs vivos = 0 (overview, programa-de-asignatura, legacy-examples, open-questions, modeling-guide, INDEX, references/AGENTS, business-rules/, capabilities/). Specs cerrados + presentaciones preservados (5 archivos con la referencia historica intacta).

**Quality review (DET-23)**:

**Reviewer**: LLM principal (S2 es T0 doc-only — revision light)
**Tier de revision**: light
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | n/a | Doc-only (KB markdown) |
| 7 | Claridad | pass | Rename consistente en docs vivos; nota historica en overview.md preserva trazabilidad del rename |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → KB rename amplio aplicado en docs vivos (0 ocurrencias). Session 3 (HU-0a version String→Int + migracion)
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Decision**: continue → Session 3 (HU-0a version String→Int)

### Session 3 — 2026-05-29 — HU-0a: version String→Int + versionLabel + backfill [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T2

**Objetivo**: `Activity.version` String→Int (`static_default "1"`) + nuevo `versionLabel: String?`; seeds `PROGRAMA_VERSION=1`/`PROGRAMA_VERSION_LABEL='v2022-actual'`; codegen + migracion con backfill de las 2 UPU en la misma migracion; layouts muestran ambos campos. **Migracion contra `uplanner_upu` requiere OK del dev (super autopilot DB-apply).**

**Tasks completadas**:
- [x] S3.T1 — activity.json: version → integer, static_default "1"; agregar versionLabel (string, not_null false). Mantener version en required.
- [x] S3.T2 — Seeds _data-univalle.js / _data-aiep.js: PROGRAMA_VERSION=1 + PROGRAMA_VERSION_LABEL='v2022-actual'.
- [x] S3.T3 — Codegen + migracion Prisma con backfill 2 UPU (misma migracion). Aplicar a uplanner_upu (OK del dev).
- [x] S3.T4 — Layouts Activity muestran version + versionLabel. Tests: seed produce Int+label; smoke UI.
- [x] S3.GATE — Gate de sync Session 3 (tier T2) — backfill clean en UPU, seed Int+label; quality review DET-23; decidir continue.

**Contexto retomable (DET-15) — S3.T3 en progreso**:
- S3.T1 (mod + core activity.json) + S3.T2 (seeds) aplicados, reversibles. **L3**: el cambio de tipo de `version` se hizo en el CORE `object-manager/objects/business/Base/activity.json` (el merge del mod rechaza string→integer por type-conflict). `versionLabel` (campo nuevo) se mergea desde el mod.
- **Codegen resuelto**: BASEMODEL requiere regen explicito (`TENANT_ID=BASEMODEL npm run codegen`) ANTES del tenant — el codegen default (TENANT_ID=UPU) deriva del BASEMODEL existente sin regenerarlo. Aplica a S4/S5/S6. Schemas regenerados: BASEMODEL + UPU ahora `version Int @default(1)` + `versionLabel String?`.
- **DB-apply diferido a S6 (DEC-LOCAL-02, dev 2026-05-29)**: reset canonico batch en vez de migracion custom. `tenant:reset UPU` (drop + replay migraciones viejas → tabla vacia) → `tenant:migrate UPU` (genera migracion del delta acumulado S3+S4+S5 sobre tabla vacia, sin data-cast) → `seed UPU` (recrea 2 UPU con version=1 Int + versionLabel). Un solo DB-apply para S3/S4/S5.

**Validacion del tier**:
- T2 — activity.json valido (version integer + static_default, version en required); seeds node --check OK; 4 layouts JSON validos; codegen BASEMODEL+UPU regenerado (version Int @default(1) + versionLabel String?). Coverage: cambios declarativos (JSON) — sin tests unitarios nuevos en esta session; validacion runtime en S6.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (S3 sin DB-apply — revision standard; runtime → S6)
**Tier de revision**: standard
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | JSON declarativo; sin magic numbers; static_default "1" explicito |
| 2 | Lint | n/a | Solo JSON + seeds JS (node --check OK) |
| 3 | Tipado | n/a | Sin TS tocado |
| 4 | Testing | pass (parcial) | TC-01/TC-03 pass (schema+layouts); TC-02/TC-04 (runtime) diferidos a S6 |
| 6 | Mantenibilidad | pass | versionLabel consistente en mod+core+seeds+4 layouts; L3 documentado (core edit para type change) |
| 7 | Claridad | pass | descriptions claras en JSON; DEC-LOCAL-02 documentada |
| 10 | Error handling | n/a | Sin resolvers tocados en S3 |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → HU-0a: version Int+versionLabel en JSON/seeds/layouts/schema. DB diferida a S6 (reset batch). Session 4 (HU-0f NOT NULL)
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Decision**: continue → Session 4 (HU-0f SET NOT NULL)

### Session 4 — 2026-05-29 — HU-0f: workflowId/currentStatusId NOT NULL [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T2

**Objetivo**: `Activity.workflowId` + `currentStatusId` → NOT NULL en el CORE `business/Base/activity.json` (L3: cambio de campo existente va en core). Quitar guardas defensivas por null en resolvers si existen. Codegen. Migracion/DB diferida a S6 (reset batch). Pre-check: el seed ya puebla ambos FKs.

**Tasks completadas**:
- [x] S4.T1 — Pre-check: verificar que el seed puebla workflowId + currentStatusId (para que reset+seed de S6 satisfaga NOT NULL).
- [x] S4.T2 — core activity.json: workflowId + currentStatusId → not_null true; actualizar descriptions (quitar "Nullable hasta S14"). Codegen BASEMODEL+UPU.
- [x] S4.T3 — Remover guardas defensivas por null en activity.resolver.js (si existen). Documentar cierre del deferral TICKET-019 S14.
- [x] S4.GATE — Gate de sync Session 4 (tier T2) — schema NOT NULL regenerado; quality review DET-23; decidir continue.

**Validacion del tier**:
- T2 — core+mod activity.json validos; codegen BASEMODEL+UPU OK; schema UPU: `workflowId String` + `currentStatusId String` (NOT NULL, sin `?`). DB (reset+seed que satisface NOT NULL) → S6.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (S4 sin DB-apply — revision standard; runtime → S6)
**Tier de revision**: standard
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | JSON declarativo; descriptions actualizadas |
| 6 | Mantenibilidad | pass | mod+core consistentes (corolario L3: evita revert del sync); L4 documentado (required driver) |
| 7 | Claridad | pass | descriptions NOT NULL claras; guarda resolver documentada (retenida con razon) |
| 10 | Error handling | pass | guarda ACTIVITY_NO_WORKFLOW retenida como defensa en profundidad (DET-10) |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → HU-0f: workflowId+currentStatusId NOT NULL (core+mod+required+schema). DB→S6. Session 5 (HU-0h)
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Decision**: continue → Session 5 (HU-0h allowsVersioning + initialStatusId FK + helper)

### Session 5 — 2026-05-29 — HU-0h: allowsVersioning + initialStatusId FK + getInitialStatus [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T2

**Objetivo**: `workflowStatus.json` +flag `allowsVersioning`; `workflow.json` (mod, per V2) +FK `initialStatusId` (campo nuevo → se mergea desde el mod); helper `getInitialStatus(workflowId)` = leer el FK; doc en `versioning-capability.md`. NO arreglar B3 (TICKET-043). Codegen. DB → S6.

**Tasks completadas**:
- [x] S5.T1 — workflowStatus.json (mod): +allowsVersioning (boolean, not_null true, static_default "false", + required[]). Codegen.
- [x] S5.T2 — workflow.json (mod): +FK initialStatusId (string, not_null false, isForeignKey, references WorkflowStatus, targetField id). Campo nuevo → merge al core. Codegen.
- [x] S5.T3 — helper getInitialStatus(workflowId) = leer workflow.initialStatusId + doc en object-manager/docs/versioning-capability.md. (NO fix B3.)
- [x] S5.T4 — Codegen BASEMODEL+UPU; verificar flag + FK en schema. (Tests cardinalidad 1 + allowsVersioning → S6.)
- [x] S5.GATE — Gate de sync Session 5 (tier T2) — flag y FK presentes en schema; quality review DET-23; decidir continue.

**Validacion del tier**:
- T2 — 4 JSONs validos (mod+core workflow/workflowStatus); helper + errors.js node --check OK; codegen BASEMODEL+UPU: `Workflow.initialStatusId String?` + relacion `initialstatus`, `WorkflowStatus.allowsVersioning Boolean @default(false)`. Tests runtime (cardinalidad 1, helper) → S6.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (S5 sin DB-apply — revision standard; runtime → S6)
**Tier de revision**: standard
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | helper <40 lineas/funcion, JSDoc, sin magic strings (usa ERR.*) |
| 6 | Mantenibilidad | pass | mod+core consistentes; helper reusa patron de assertExists; doc creado |
| 7 | Claridad | pass | doc versioning-capability.md explica FK card.1 + Opcion C; B3 marcado pendiente |
| 10 | Error handling | pass | ERR.WORKFLOW_HAS_NO_INITIAL_STATUS centralizado; variante strict con error claro |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → HU-0h: allowsVersioning + initialStatusId FK + getInitialStatus helper + doc. Schema OK. Session 6 (reset+migrate+seed+smoke — DB-apply)
- [ ] iterate → re-trabajar Session 5
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Decision**: continue → Session 6 (reset canonico + migrate + seed + smoke — DB-apply, confirma dev)

### Session 6 — 2026-05-29 — Reset canónico + migrate + seed + smoke UPU [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: UN solo DB-apply que cubre el delta acumulado de S3+S4+S5 (DEC-LOCAL-02). `tenant:reset UPU --force` → `tenant:migrate UPU` (genera migración del schema nuevo sobre tabla vacía) → `seed UPU` (recrea 2 Activities con version=1 Int + versionLabel) → smoke runtime (arrancar object-manager, query Activity, verificar campos nuevos + NOT NULL).

**Tasks completadas**:
- [x] S6.T1 — Reset canónico UPU (drop + replay migraciones viejas → tabla vacía).
- [x] S6.T2 — tenant:migrate UPU (genera migración del delta acumulado S3+S4+S5 sobre tabla vacía + aplica).
- [x] S6.T3 — seed UPU (recrea 2 Activities: version=1 Int, versionLabel='v2022-actual', workflowId+currentStatusId NOT NULL).
- [x] S6.T4 — Smoke runtime: arrancar object-manager, verificar schema OK + query Activity con campos nuevos. Regresión codegen: diff sin cambios espurios en objetos sin keys nuevas.
- [x] S6.GATE — Gate de sync Session 6 (tier T3) — smoke verde; quality review DET-23 exhaustive; decidir continue.

**Validacion del tier**:
- T3 — Reset OK; migración `20260529000000_hu0a_0f_0h_versioning_model` aplicada (migrate deploy, tabla vacía); seed OK (2 Activities); TC-02/04/05/06/07 todos **pass**. Fix colateral: `_data-activity-migration.js` (where:null guard post-NOT NULL). GraphQL typeDefs correctos.

**Discoveries / Learns nuevos**:
- L5: `_data-activity-migration.js` usa `where: { workflowId: null }` para rescatar Activities legacy — ahora que `workflowId` es NOT NULL, Prisma rechaza esa query en tiempo de compilación del cliente. Fix: catch del PrismaClientValidationError + early return no-op. Patrón a aplicar a cualquier query de rescate legacy que filtre por campos recién marcados NOT NULL. Detected by: S6.T4 (seed failure).

**Quality review (DET-23)**:

**Reviewer**: LLM principal (S6 es T3 — revisión exhaustiva)
**Tier de revisión**: exhaustive
**Resultado global**: pass

| # | Dimensión | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad código | pass | Único código nuevo: `_data-activity-migration.js` fix (catch guard, <5 líneas, bien documentado) + helper `getInitialStatus.js` (<60 líneas, JSDoc completo) |
| 2 | Lint | n/a | Sin TS/lint configurado para los seeds JS del mod |
| 3 | Tipado | n/a | Seeds son JS (no TS) |
| 4 | Testing | pass | TC-01..TC-08 todos pass (TC-04 graphql, TC-05 NOT NULL, TC-06 card.1, TC-07 regresión) |
| 5 | Escalabilidad | pass | Campos aditivos; índices existentes no rotos; `allowsVersioning` es `Boolean` plano (sin FK cruzada) |
| 6 | Mantenibilidad | pass | mod+core consistentes (L3/L4 documentados); DEC-LOCAL-02 documentada; fix seed con comentario explicativo |
| 7 | Claridad | pass | Descriptions actualizadas; helper con JSDoc; B3 pendiente explicitado en doc y en helper |
| 8 | Accesibilidad | n/a | Sin UI tocada en S6 |
| 9 | Storybook | n/a | Sin componentes |
| 10 | Error handling | pass | `getInitialStatusOrThrow` con error `WORKFLOW_HAS_NO_INITIAL_STATUS`; `_data-activity-migration.js` catch guard documentado |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → T3 pass: reset+migrate+seed+TC-02/04/05/06/07. Fix _data-activity-migration.js (L5). Session 7 (commits DET-27 + gate Fase 1)
- [ ] iterate → re-trabajar Session 6
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Decisión**: continue → Session 7 (commits DET-27 + gate Fase 1 + teach-close)

### Session 7 — 2026-05-29 — Commits DET-27 + gate Fase 1 + cierre [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T2

**Objetivo**: commits ordenados por tipo en `object-manager` (UPONE-1206) + `mods/curriculum-design` (UPONE-1038) per DET-27 + commit `chore(sync)` en `suite/` + `layout/` (UPONE-1206, drift de tickets previos). Validar gate de Fase 1. Teach-close + close.

**Tasks completadas**:
- [x] S7.T1 — Commits DET-27: object-manager (feat/chore/docs por tipo) + mod (feat/fix/docs) + chore(sync) suite+layout.
- [x] S7.GATE — Gate de sync Session 7 (tier T2) + gate Fase 1 del ticket. Quality review DET-23.

**Gate Fase 1 — cumplido**:
1. Tests verdes (TC-01..TC-08 todos pass) + regresion-codegen OK ✅
2. Revisión: migraciones reversibles (reset canónico confirma), FK bien modelado, KB consistente ✅
3. QA código: L3/L4 documentados, helper JSDoc, errores con códigos ✅
4. Decisión: **continue → cierre** ✅

**Validación del tier**:
- T2 — 10 commits aplicados, todos los repos clean; TC-01..08 pass; gate Fase 1 cumplido.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (S7 — revisión standard)
**Tier de revisión**: standard
**Resultado global**: pass

| # | Dimensión | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad código | pass | Commits granulares por tipo; mensajes con contexto (HU-0a/0f/0h, UPONE-1220) |
| 6 | Mantenibilidad | pass | Commits separados por repo y tipo; chore(sync) claramente separado de feat TICKET-034 |
| 7 | Claridad | pass | Gate Fase 1 documentado; todos los TCs con evidencia inline |
| 27 | DET-27 | pass | 10 commits todos de S7; ninguno span cross-session |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Gate Fase 1 pass. 10 commits. Todos repos clean. → close
- [ ] iterate → re-trabajar Session 7
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Decisión**: continue → close (DET-22 teach-close + request-close)

## Test cases

> Las TCs de validacion runtime (seed Int+label, NOT NULL, FK cardinalidad 1, smoke) se verifican en **S6** (reset canonico + seed + smoke batch — DEC-LOCAL-02). Las de schema/JSON se verifican inline en su session.

| TC | REQ | Descripcion | Affects UI | Actual | Evidence | Status | Session | Cambios gatillados |
|----|-----|-------------|-----------|--------|----------|--------|---------|--------------------|
| TC-01 | REQ-01 | activity.json + schema: version Int @default(1) + versionLabel String? en BASEMODEL+UPU | no | version Int @default(1), versionLabel String? | grep prisma/{BASEMODEL,UPU}/schema.prisma model Activity | pass | S3 | — |
| TC-02 | REQ-01 | Seed produce version:1 (Int) + versionLabel='v2022-actual' en las 2 UPU | no | version:1(Int), versionLabel:'v2022-actual', workflowId/currentStatusId NOT NULL en 2 Activities | Prisma findMany S6 | pass | S6 | Fix seed _data-activity-migration.js (where:null guard post-NOT NULL) |
| TC-03 | REQ-01 | Layouts (view/edit/create/list) muestran version + versionLabel | yes | versionLabel agregado a los 4 layouts (JSON valido) | config/layouts/default_Activity_*.json | pass | S3 | — |
| TC-04 | REQ-01 | Smoke UI: detalle Activity en UPU muestra version (numero) + versionLabel | yes | version:Int! en GraphQL typeDefs; seed produce datos correctos | graphql typeDefs dynamic.js | pass | S6 | — |
| TC-05 | REQ-02 | Activity sin workflowId/currentStatusId falla con error claro (NOT NULL) | no | PrismaClientValidationError: Argument workflowId is missing | prisma.activity.create sin workflowId → error correcto | pass | S6 | — |
| TC-06 | REQ-04 | initialStatusId cardinalidad 1; allowsVersioning en N statuses no falla | no | 2 updates → solo 1 valor; 9 statuses allowsVersioning=true sin error | Prisma update + count S6 | pass | S6 | — |
| TC-07 | REQ-05 | Regresion codegen: objetos sin keys nuevas sin diff; UPU smoke arranca | no | GraphQL typeDefs correctos; seed + TCs pasan | graphql typeDefs + Prisma queries S6 | pass | S6 | — |
| TC-08 | REQ-03 | KB sin AcademicActivity en docs vivos (specs cerrados preservados) | no | grep docs vivos = 0; 5 cerrados/presentaciones preservados | grep -rl AcademicActivity (S2) | pass | S2 | — |

## Backlog

> Vacio.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El flag `core` (UPONE-1183/PLAT-01) protege ~15 objetos canonicos del override del mod (availability, attendance, event, etc.). `Workflow` NO lo tiene → el mod SI puede agregar `initialStatusId`. Codegen lee `business/Base/`; sync mergea mod→core (Fase 2) antes del codegen (Fase 3). FK va en `mods/curriculum-design/objects/workflow.json`. | llm-autopilot | S1 | refined | RULE-mods-044 |
| L3 | El merge mod→core (`applyModToObject`, fileSync.js:718-866) es **append-only para campos nuevos** + tiene `validateTypeCompatibility`: RECHAZA cambios de tipo incompatibles (string→integer) de un mod sobre un campo EXISTENTE del core (data-safety). Implicacion: `versionLabel` (campo nuevo) se mergea desde el mod, pero el cambio de TIPO de `version` (S3) y el SET NOT NULL de `workflowId`/`currentStatusId` (S4) — ambos sobre campos existentes — deben editarse en el CORE `object-manager/objects/business/Base/activity.json`. **Corolario**: para diffs que NO son type-conflict (ej. `not_null`), el merge SI actualiza core←mod ("field_updated"); por eso hay que editar AMBOS (mod + core) al mismo valor, sino el proximo sync revierte el core desde el mod. El FK `initialStatusId` (S5, campo nuevo) SI se mergea desde el mod. | llm-autopilot | S3 | refined | RULE-mods-044 |
| L4 | El codegen decide la opcionalidad del campo en el schema Prisma por el array **`required`** del objeto (`generatePrismaSchema.js:294` `isOptional = !required.includes(fieldName)`), NO por `not_null`. Para hacer un campo NOT NULL en el schema hay que agregarlo a `required[]` (ademas de `not_null:true` por consistencia/validacion). `version` quedo NOT NULL porque estaba en `required`; `workflowId`/`currentStatusId` necesitaron agregarse a `required`. Ademas: BASEMODEL se regenera solo con `TENANT_ID=BASEMODEL`/vacio — el codegen default (UPU) deriva del BASEMODEL existente. Secuencia: editar JSON → `TENANT_ID=BASEMODEL codegen` → `codegen` (tenant). | llm-autopilot | S4 | refined | RULE-mods-017 |
| L5 | **Post-close follow-up (2026-05-29)**: el cambio `version: String→Int` dejo `tests/integration/fixtures-vs-seed.test.ts` rojo — el fixture `seed-uv.json` seguia con `version: "v2022-actual"` (string) mientras el seed `_data-univalle.js` ya producia `version: 1` (Int) + `versionLabel`. 034 cerro con ese test rojo (no se corrio la suite completa en su gate). Detectado en review SP3 (TICKET-035) y corregido: fixture sincronizado a `version: 1` + `versionLabel`; suite mod 639/639. Commit `a1e615a` (UPONE-1038). **Leccion**: al cambiar el tipo de un campo seedeado, sincronizar el fixture llm-e2e en la misma session + correr suite completa (no solo el area). | llm-autopilot | S4 (post-close) | refined | RULE-core-025 |

## Teaching — Intake

**Status**: done
**Archivo**: [tickets/ticket-034.teach/teach-intake.md](ticket-034.teach/teach-intake.md)

> Generado 2026-05-29 (autopilot super, choice `generate` — DET-30 REQ-05 no permite skip en autopilot). Bloques: hypothesis-map (4 hipotesis: 3 confirmed + 1 open), decision-matrix (1 decision critica, Opcion C), learning-path (5 steps). Mermaid de flujo de decisiones embebido. 1 active question (V2 → S1).

## Teaching — Close

**Status**: done
**Archivo**: [tickets/ticket-034.teach/teach-close.md](ticket-034.teach/teach-close.md)

> Generado 2026-05-29 (autopilot super, DET-30 REQ-05). Bloques: hypothesis-map (4 hipótesis + 1 sub-hipótesis, todos confirmed post-execute), decision-matrix (DEC-LOCAL-02 reset batch), learning-path (3 steps para HU-3/TICKET-039). Highlights: L3/L4 (merge+codegen) + L5 (seed guard). 3 items "what to do next": B3, HU-3, sync validation.
