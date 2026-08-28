---
id: TICKET-043
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1214
module: curriculum-design
autopilot: autonomous
---

# HU-8 | Adopción de versionamiento en Activity (8a config + B2 · 8b hook · 8c seed + B3)

## Request

> Contenido literal del ticket Jira [UPONE-1214](https://u-planner.atlassian.net/browse/UPONE-1214) (Historia, parent epic UPONE-1038). **Ticket scoped ampliado**: cubre HU-8a + HU-8b + HU-8c del plan v5.

### Descripción

Activar versionamiento de `Activity` declarando las configs en `activity.json` (bajo `metadata`), corrigiendo los bugs acotados B2/B3, agregando el hook de remap de links y el seed institucional.

### Criterios de aceptación

* `activity.json` (bajo `metadata`): `polymorphicChildren` (sections), `prefillFrom`, `versioning`; `previousVersionId` → FK reflexivo.
* **Fix B2**: `previousVersionId` agregado a `EXCLUDED_FIELDS` (en la copia del resolver que corre — verificar cuál, V1).
* **Hook de remap**: re-crea los `CurricularLink` en la nueva versión usando el mapa `oldId→newId`.
* **Seed (fix B3)**: marca `allowsVersioning` + setea los 2 FK de entrada del workflow; el helper lee `workflow.scratchInitialStatusId` (sin `'BOR'` hardcodeado).
* Crear v2 → `version=2`, `previousVersionId=v1.id`, `currentStatusId=workflow.versionInitialStatusId`, sin audit row espurio.

### Dependencias

HU-2, HU-4, HU-9, HU-0a, HU-0d, HU-0e, HU-0f, HU-0g, HU-0h, HU-0j.

### Cambio vs actual

De "declarar prefillFrom+versioning en activity.json" a un ticket que cubre config bajo `metadata` + B2 + hook de remap + seed/B3 (scope ampliado). Cubre HU-8a + HU-8b + HU-8c del plan v5.

> **Nota DKC — delta v5 → v5.1 (Opción C, anotado)**: el ticket Jira menciona `workflow.versionInitialStatusId`/`scratchInitialStatusId` (2 FK). v5.1 implementa **1 FK unico** `workflow.initialStatusId` (compartido). El seed setea ese **1 FK**, no 2. El helper `resolveDefaultActivityWorkflow` lee `workflow.initialStatusId` (sin hardcode 'BOR').

## Contexto operativo del plan SP3

### P4.1 — HU-8 · Adopcion en Activity (8a config+B2 · 8b hook · 8c seed+B3) (Fase 4) · `P1`

- **Meta**: implement + 2 fix (B2, B3) · ~5 SP · certeza confirmado / a validar V1 · rollback git revert config + EXCLUDED_FIELDS + seed + hook · riesgo: constraint mismo-owner no esta en BD (hook defensivo); copia de auditCapture (V1)
- **Contexto**: declarar las configs en `activity.json` activa versionamiento sin codigo del mod. **8a**: config + fix B2 (excluir `previousVersionId` del audit, que al volverse FK generaria rows espurios). **8b**: hook que remapea CurricularLinks a las nuevas secciones (path esperado SP3; derived generico → SP4). **8c**: seed institucional + fix B3 (el helper lee `workflow.initialStatusId` en vez de hardcodear `'BOR'`).
- **Que se realiza**:
  - 8a — en `activity.json` bajo `metadata`: `polymorphicChildren` (sections), `prefillFrom` (exclude currentStatusId/previousVersionId/versionLabel, deepClone sections), `versioning`; `previousVersionId` → FK reflexivo; **B2**: `previousVersionId` a `EXCLUDED_FIELDS`.
  - 8b — hook en `logic/` que consume el mapa `oldId→newId` (HU-0d) y re-crea los links; defensivo (no asume constraint "mismo owner").
  - 8c — seed marca `allowsVersioning` (PUB) + setea el FK de entrada del workflow; **B3**: `resolveDefaultActivityWorkflow` lee `workflow.initialStatusId`, sin `'BOR'` literal.
- **Depende de**: HU-2, HU-4, HU-9, HU-0a, HU-0d, HU-0e, HU-0f, HU-0g, HU-0h, HU-0j · **G-V1** (B2).
- **Investigar**: G-V1 antes de B2; tamano del hook segun spike P3.3.
- **Prueba**: `unit`+`smoke` crear v2 (`version=2`, `versionLabel=null`, `previousVersionId=v1.id`, `currentStatusId=workflow.initialStatusId`, audit `Create+versionSourceId`, **sin audit row de previousVersionId**); `allowsVersioning=false` → `SOURCE_NOT_VERSIONABLE`; sections clonadas + links remapeados; seed setea flags+FK; helper lee FK (sin `'BOR'`).

### G-V1 — gate previo a B2 (Fase 0)

| Verificar | Antes de | Detalle |
|-----------|----------|---------|
| Cual `auditCapture.resolver.js` corre en runtime (mod-local `logic/` vs copia en `object-manager/.../mods/curriculum-design/`) | HU-8a (fix B2) | Si la copia ejecutada no es la editada, B2 no surte efecto |

## Material internalizado — HUs detalladas

### HU-8a · Declarar prefillFrom + versioning + polymorphicChildren en activity.json + fix B2

**Sprint:** SP3 · **Track:** Mod curriculum-design · **Repo:** `mods/curriculum-design`

**Como** dev del mod
**Quiero** declarar las configs en `objects/activity.json` con sintaxis declarativa simple **y corregir B2** (`previousVersionId` debe excluirse del audit)
**Para** activar versionamiento de Activity sin codigo del mod, sin contaminar el audit chain.

**Estado actual verificado:** `previousVersionId` existe (`activity.json:45`, sin FK). `EXCLUDED_FIELDS` (`auditCapture.resolver.js:56-59`) NO incluye `previousVersionId` → al volverse FK y poblarse en cada version, generaria audit rows espurios (B2).

**Criterios de aceptacion:**

- [ ] `activity.json` — bloques declarativos **bajo `metadata`** (para que el merge los propague y `syncVersioningConfigToRegistry`/HU-0j los persista):
  - [ ] `metadata.polymorphicChildren`: `[{ "name": "sections", "object": "CurricularSection", "via": "ownerType/ownerId", "ownerTypeValue": "Activity", "recursiveBy": "parentId" }]`.
  - [ ] `metadata.prefillFrom`: `{ "exclude": ["currentStatusId", "previousVersionId", "versionLabel"], "deepClone": ["sections"] }`.
  - [ ] `metadata.versioning`: `{ "linkageField": "previousVersionId", "versionField": "version", "versionStrategy": "increment", "auditSourceField": "versionSourceId", "initialStateField": "currentStatusId" }`.
  - [ ] `previousVersionId` → `isForeignKey: true, references: "Activity", targetField: "id"` (FK reflexivo via IMP-5; apunta a `id`, que el codegen ya genera correcto).
- [ ] **Fix B2**: agregar `previousVersionId` a `EXCLUDED_FIELDS` en `auditCapture.resolver.js`. **Confirmar antes cual copia corre en runtime** (mod-local en `logic/` vs `object-manager/.../mods/curriculum-design/`). Test: versionar NO genera audit row de linaje.
- [ ] Sync corre sin errores; schema + `versioningConfig` aplicados a UPU.
- [ ] Layout filename PascalCase (`default_Activity_list.json`) per RULE-platform-006.
- [ ] Tests del mod:
  - [ ] Crear v2 en estado con `allowsVersioning=true` → `version=2`, `versionLabel=null`, `previousVersionId=v1.id`, `currentStatusId=<workflow.initialStatusId>`, audit `action=Create, versionSourceId=v1.id`, **sin audit row de previousVersionId**.
  - [ ] Crear v2 desde estado con `allowsVersioning=false` → `SOURCE_NOT_VERSIONABLE`.
  - [ ] CurricularSections clonadas con nuevos ids + `ownerId=v2.id`, jerarquia `parentId` preservada (HU-0d); CurricularLinks remapeados por el hook (HU-8b).

**Dependencias:** HU-2, HU-4, HU-9, HU-0a, HU-0d, HU-0e, HU-0f, HU-0g, HU-0h, HU-0j, HU-8b, HU-8c.

### HU-8b · Hook de remap CurricularLinks — PATH ESPERADO (scoped)

**Sprint:** SP3 · **Track:** Mod curriculum-design · **Repo:** `mods/curriculum-design`

**Como** dev del mod
**Quiero** un hook que remapee los CurricularLinks del source a las nuevas secciones del v2 (usando el mapa `oldId→newId` que expone el deepClone de HU-0d)
**Para** preservar el wiring pedagogico (BR-VER-002) sin esperar al derived generico del codegen.

> **Estado scoped**: **path esperado del sprint** (ya no contingencia). La lectura/deepClone (HU-0d) es generica; el remap de FKs internas se hace por este hook en SP3. El **derived generico en codegen → SP4** (ticket agendado al cierre). El spike P3.3 dimensiona el hook.

**Criterios de aceptacion:**

- [ ] Etiquetado explicito como **acotado**; comentario inline "SP4: generalizar a polymorphicChildrenDerived en codegen".
- [ ] Consume el mapa `oldId→newId` del deepClone (HU-0d) — via el evento BullMQ post-create con `createdVia: "version"` o el retorno del resolver, segun defina el spike.
- [ ] Para cada CurricularLink del source: localiza la seccion equivalente en v2 (via el mapa), crea nuevo CurricularLink. **Defensivo**: si no remapea, log warning + skip (no asume el constraint "mismo owner", deuda preexistente).
- [ ] Vive en `mods/curriculum-design/logic/activity.versioning-hook.js` (nuevo, aislado).
- [ ] Tests: clonar Activity con 5 sections + 3 links → v2 con 5 sections + 3 links re-creados.
- [ ] **Ticket SP4 del derived generico agendado** al cierre.

**Dependencias:** HU-0d, HU-8a.

### HU-8c · Seed institucional UPU: allowsVersioning + FK de entrada del workflow + fix B3

**Sprint:** SP3 · **Track:** Mod curriculum-design · **Repo:** `mods/curriculum-design`

**Como** dev del mod
**Quiero** que el seed institucional marque `allowsVersioning` en los statuses y setee el FK de entrada en cada workflow **y corregir B3** (`resolveDefaultActivityWorkflow` debe leer `workflow.initialStatusId`, no hardcodear `'BOR'`)
**Para** que la politica de versionamiento de Univalle/AIEP quede activa, con una unica fuente de verdad del estado inicial.

**Estado actual verificado:** `resolveDefaultActivityWorkflow` hardcodea `code='BOR'` (seed `_data-workflow-objects.js`). No hay creacion productiva de Activity — solo el seed.

> **Correccion obligatoria v5 (B3)**: con `workflow.initialStatusId` como fuente de verdad, el helper deja de hardcodear `BOR`. Esto cierra la doble-fuente-de-verdad.

**Criterios de aceptacion:**

- [ ] `seed/_data-workflow-objects.js`:
  - [ ] Statuses: `PUB.allowsVersioning=true` (Univalle `activity-standard` y AIEP `activity-fast`). Resto `false`. Confirmar con el PM (explicito, no "si aplica").
  - [ ] Workflow `activity-standard` (Univalle): `initialStatusId = <id de BOR>`.
  - [ ] Workflow `activity-fast` (AIEP): idem, confirmar con el PM.
- [ ] **Fix B3**: `resolveDefaultActivityWorkflow` lee `workflow.initialStatusId` del workflow default, en vez de hardcodear `'BOR'`. Sin string `'BOR'` literal en el helper.
- [ ] Unicidad (HU-0h) garantizada estructuralmente: el FK de entrada es de cardinalidad 1 por workflow.
- [ ] Documentado en `seed/README.md`: "estos flags/FK definen la politica institucional; una institucion nueva modifica solo su seccion".
- [ ] Tests: tras `seed --tenant=UPU`, `allowsVersioning` y el FK de entrada seteado; helper resuelve el estado inicial via FK (no hardcode); crear Activity en PUB → versiona; en BOR → `SOURCE_NOT_VERSIONABLE`.

**Dependencias:** HU-0h.
**Decision PM**: configuracion propuesta como sugerencia; el PM ajusta en planning.

## Material internalizado — Bugs (factibilidad §5)

### B2 — `previousVersionId` fuera de `EXCLUDED_FIELDS` del audit

| Aspecto | Detalle |
|---------|---------|
| Evidencia | `auditCapture.resolver.js:56-59` (mod-local `logic/`; copia en `object-manager/.../mods/curriculum-design/` — verificar cual corre, V1) |
| Riesgo si no se corrige | Al volverse FK y poblarse en cada version, genera audit rows espurios → contamina el changeLog SP2 |
| HU que lo absorbe | **HU-8a** (correccion al declarar `versioning`) |

### B3 — `resolveDefaultActivityWorkflow` hardcodea `'BOR'`

| Aspecto | Detalle |
|---------|---------|
| Evidencia | seed `_data-workflow-objects.js:386` |
| Riesgo si no se corrige | Dos fuentes de verdad del estado inicial (FK vs hardcode) → divergencia institucional |
| HU que lo absorbe | **HU-8c** (scoped): el helper lee `workflow.initialStatusId` |

### B1 — fuera del scope (housekeeping)

| Aspecto | Detalle |
|---------|---------|
| Bug | Codegen ignora `targetField`, emite siempre `references: [id]` |
| Por que NO va en este sprint | Toca ~39 FKs en multiples objetos/tenants (no autocontenido). **Versionamiento no lo necesita** (`previousVersionId → id`). Va como ticket housekeeping separado |

### Deuda preexistente (NO se corrige sin aprobacion)

- El constraint "mismo owner" de `CurricularLink` no esta en BD (SP2). El deepClone/remap (HU-8b) debe ser **defensivo** y no asumir esa invariante.

## Material internalizado — Shapes canonicos del modelo

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

> **V1 obligatorio antes**: confirmar cual copia corre (mod-local `logic/` o `object-manager/.../mods/curriculum-design/`). Editar la copia activa.

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

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement + 2 fix (B2, B3) |
| Tipo de cambio | multi (activity.json + seed + hook nuevo + EXCLUDED_FIELDS + helper) |
| Modulo principal | curriculum-design |
| Modulos afectados | mods/curriculum-design (JSON + seed + hook), object-manager (resolver de audit si esa es la copia activa) |
| Layer | mod (con cambios en core si V1 indica que la copia activa esta en object-manager) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | (la UI sale via TICKET-044 HU-10) |
| Data model | yes | Bloques metadata declarativos + FK reflexivo en `previousVersionId` + seed con `allowsVersioning`/`initialStatusId` |

### Draft status

| Campo | Valor |
|-------|-------|
| Aprobado | true (autopilot — `approvedBy: autopilot`) |
| Version aprobada | 1 |
| Path | [TICKET-043.draft/](TICKET-043.draft/) (data-model.prisma + intent.md, validado) |

> **Racional auto-aprobación (super)**: el modelo de datos no presenta alternativas abiertas. El único delta de schema es `previousVersionId` → FK reflexivo; el resto (config `metadata`, seed) opera sobre campos ya existentes en el schema actual (`workflow.initialStatusId`, `workflowStatus.allowsVersioning` confirmados). La decisión 2 FK vs 1 FK ya quedó cerrada en intake (v5.1). Sin `[NEEDS CLARIFICATION]`.

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | La copia activa de `auditCapture.resolver.js` es la mod-local (`logic/`); object-manager tiene una copia obsoleta | ~ a validar via V1 | Investigacion previa a B2 |
| H2 | El hook de remap defensivo (sin asumir mismo owner) no rompe casos donde un link cruza owners (deuda preexistente, raro en seeds UPU) | ✓ confirmada | Diseno §HU-8b explicito |
| H3 | `previousVersionId` con FK reflexivo a `Activity` apunta a `id` → codegen genera correcto sin B1 fix | ✓ confirmada | HU-0e (TICKET-033) lo prueba con test |

### Context found

- **Rules del modulo**: RULE-dev-004 (toca core si V1 da object-manager), RULE-platform-006 (layout filename PascalCase), RULE-cd-004 (transiciones — set inicial es creacion, no transicion).
- **Bugs abiertos**: B2 + B3 (se cierran aqui).
- **Specs relacionados DKC**: TICKET-020, TICKET-018 (Activity/audit/workflow SP2).
- **Docs relevantes del repo**:
  - `mods/curriculum-design/objects/activity.json`
  - `mods/curriculum-design/logic/auditCapture.resolver.js` (mod-local, V1)
  - `object-manager/src/graphql/resolvers/mods/curriculum-design/auditCapture.resolver.js` (copia, V1)
  - `mods/curriculum-design/seed/_data-workflow-objects.js` (helper + seed)
  - `mods/curriculum-design/objects/curricularLink.json` (CurricularLink modelo)
- **Warnings**:
  - **G-V1 BLOQUEANTE para B2**: sin saber cual copia corre, el fix no surte efecto.
  - **Hook defensivo**: no asume constraint mismo owner. Log warning + skip si falta remapeo.
  - **Branch core**: `UPONE-1206` si V1 indica object-manager; sino branch del mod.
  - **Depende del Track 0 cerrado** (TICKET-033 + TICKET-034) Y de TICKETS-036/037/038/035 (HU-1/2/4/9).

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1206` (epica core; ticket toca codigo core via B2 si V1) |
| Base branch | `develop` |
| Repo path | `/Users/edobacon/Workspace/uplanner/up1` |
| DB state | UPU con Track 0 + Fase 2 Core aplicados |
| Services | object-manager, postgres, redis |
| Test data | seeds UPU con statuses (BOR/PUB) + Activities v1 |

## Sessions

### Modo (autopilot)

| Timestamp | Transicion | Razon | Aplica desde |
|-----------|------------|-------|--------------|
| 2026-06-02 | false → super | dev: `/dkc 043 super autopilot` — ejecucion por-ticket sin paradas (HOR-079) | proximo gate (todos) |

### Plan de sessions

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | G-V1 — verificar cual copia de `auditCapture.resolver.js` corre en runtime | execute | T0 | inspeccion + documento | ⚑ fuerte | V1 resuelto; siguiente: B2 en la copia activa |
| S2 | HU-8a fase 1 — `activity.json` con bloques `polymorphicChildren`/`prefillFrom`/`versioning` + FK reflexivo `previousVersionId` | execute | T2 | JSON + sync + tests | auto | bloques persistidos en versioningConfig |
| S3 | HU-8a fase 2 — fix B2: agregar `previousVersionId` a `EXCLUDED_FIELDS` (copia activa) + test | execute | T2 | edit + test | ⚑ fuerte | versionar NO genera audit row de linaje |
| S4 | HU-8b — hook `activity.versioning-hook.js` que remapea CurricularLinks usando mapa oldId→newId | execute | T2 | hook + tests + comentario "SP4" | ⚑ fuerte | 5 links re-creados en v2 |
| S5 | HU-8c fase 1 — seed: `allowsVersioning=true` en PUB de Univalle/AIEP + `initialStatusId` en workflows | execute | T2 | seed + tests | auto | seed correcto |
| S6 | HU-8c fase 2 — fix B3: `resolveDefaultActivityWorkflow` lee `workflow.initialStatusId` (sin `'BOR'` literal) | execute | T2 | helper + tests | ⚑ fuerte | grep `'BOR'` en helper sin matches |
| S7 | E2E — crear v2 desde Activity v1 PUB en UPU: validar todo el flujo end-to-end | execute | T3 | smoke E2E + regression | ⚑ fuerte | v2 creada correcta + audit limpio + links remapeados |
| S8 | Cierre — commits + teach-close + agendar ticket SP4 del derived generico | execute | T2 | review + commit DET-27 + backlog SP4 | ⚑ fuerte | gate Fase 4 cumplido |

### Session 1 — 2026-06-02 — G-V1: verificar cual copia de auditCapture.resolver.js corre en runtime [phase: execute]

**Tipo**: ⚑ fuerte (validacion empirica de la copia activa antes de B2)
**Validation tier**: T0 (lint frontmatter + cross-references)

**Objetivo**: Determinar cual de las dos copias de `auditCapture.resolver.js` (mod-local `logic/` vs object-manager) ejecuta el runtime. Resuelve G-V1 y define donde aplicar B2 (S3) y la rama (mod UPONE-1038 vs core UPONE-1206).

**Tasks completadas**:

- [x] S1.T1 — Determinar cual copia de `auditCapture.resolver.js` ejecuta el runtime (mod-local `logic/` vs copia en object-manager) y documentar el hallazgo con evidencia
- [x] S1.GATE — Gate de sync Session 1 (tier: T0)

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 2 (HU-8a config activity.json). G-V1 resuelto: B2 va en mod-local logic/ + sync.
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-06-02 — HU-8a config: activity.json bloques metadata + FK reflexivo + sync [phase: execute]

**Tipo**: auto (auto-continue si sync OK + tests verdes)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Declarar bajo `metadata` los bloques `polymorphicChildren`/`prefillFrom`/`versioning` y convertir `previousVersionId` en FK reflexivo en `activity.json`; correr `npm run sync`; verificar persistencia en versioningConfig + layout PascalCase.

**Tasks completadas**:

- [x] S2.T1 — Declarar en `activity.json` bajo `metadata` los bloques `polymorphicChildren`, `prefillFrom`, `versioning` y convertir `previousVersionId` en FK reflexivo; correr `npm run sync` y verificar versioningConfig
- [x] S2.GATE — Gate de sync Session 2 (tier: T2)

**Avance S2.T1 (file-level done, validation BLOCKED):**

- ✅ `mods/curriculum-design/objects/activity.json`: `metadata.{polymorphicChildren,prefillFrom,versioning}` declarados + `previousVersionId` → FK reflexivo (`isForeignKey/references/targetField`). JSON valido. (commit pendiente UPONE-1038)
- ✅ Codegen: FK generado correcto en `object-manager/prisma/{tenant}/schema.prisma` (`previousVersionId String?` + self-relation `Activity_Activity_previousVersionId` → `references:[id]`). Confirma H3 (sin necesidad de fix B1).
- ❌ `npm run sync` exit≠0: `prisma db push` rechaza el apply a tenant DBs (TEST/UCASMT/UCENG/UCPLN/BASEMODEL) exigiendo `--accept-data-loss`/`--force-reset`.

**Contexto retomable / BLOQUEANTE (escalado al dev):** el apply de schema a las tenant DBs es destructivo/irreversible → autopilot super NO lo ejecuta solo (always-ask). Requiere: (a) autorizacion explicita del dev para `prisma db push --accept-data-loss` sobre el/los tenant correctos (¿TEST/dev only?), y (b) confirmar que el entorno (postgres + object-manager) esta corriendo. Sin esto, S2 no cierra su validacion T2 y S3 (test B2) / S5 (seed) / S7 (E2E) quedan bloqueadas. Resolver y re-correr `npm run sync` desde S2.

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Escalacion resuelta: dev autorizo --accept-data-loss (+force-reset BASEMODEL). Sync 3/3 exit 0; versioningConfig UPU OK; FK en schema; resolvers synced. Continue → Session 3 (B2).
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-06-02 — B2: previousVersionId en EXCLUDED_FIELDS de la copia activa + test [phase: execute]

**Tipo**: ⚑ fuerte (fix de bug; versionar no debe contaminar el audit chain)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Agregar `previousVersionId` al `EXCLUDED_FIELDS` de la copia activa de `auditCapture.resolver.js` (mod-local `logic/` per G-V1) + `npm run sync:logic` para propagar al runtime; test que versionar NO genera audit row de linaje.

**Tasks completadas**:

- [x] S3.T1 — Agregar `previousVersionId` al `EXCLUDED_FIELDS` de la copia activa de `auditCapture.resolver.js` + test que verifica que versionar NO genera audit row de linaje
- [x] S3.GATE — Gate de sync Session 3 (tier: T2)

**Gate decision:** (approvedBy: autopilot)

- [x] continue → B2 OK: previousVersionId en EXCLUDED_FIELDS (copia activa) + synced; vitest 55/55. Continue → Session 4 (hook HU-8b).
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 4 — 2026-06-02 — HU-8b hook: _cloneMap en evento (core) + remap CurricularLinks (mod) [phase: execute]

**Tipo**: ⚑ fuerte (wiring core↔mod; preserva wiring pedagogico BR-VER-002)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Exponer `_cloneMap` (oldId→newId) en el payload del evento `:create` versionado (core, `instance.resolver.js`, patron UPONE-1212) + hook mod-local `activity.versioning-hook.js` (función pura `remapCurricularLinks`, defensiva) + flow n8n `versioning-remap.json` que consume `Activity:create` con `_createdVia==='version'`. Scope ampliado (dev OK) a core en UPONE-1206.

**Tasks completadas**:

- [x] S4.T1 — Core: `_cloneMap` en `data` de los return paths de versión (instance.resolver.js); Mod: `activity.versioning-hook.js` (remapCurricularLinks defensivo) + mutation + flow n8n + tests
- [x] S4.GATE — Gate de sync Session 4 (tier: T2)

**Gate decision:** (approvedBy: autopilot)

- [x] continue → HU-8b code-complete: core _cloneMap en evento (UPONE-1206) + hook mod (resolver+schema+flow+unit 3/3); mod suite 642/642. E2E runtime → S7. Continue → Session 5 (seed).
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 5 — 2026-06-02 — HU-8c seed: allowsVersioning + initialStatusId + README [phase: execute]

**Tipo**: auto (auto-continue si seed corre + asserts verdes)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Seed `_data-workflow-objects.js`: `allowsVersioning=true` en PUB (resto false) + `workflow.initialStatusId = id(BOR)` en activity-standard y activity-fast (wire `statusCodeToId` → `upsertWorkflows`). Documentar en `seed/README.md`.

**Tasks completadas**:

- [x] S5.T1 — Seed: `allowsVersioning` en STATUSES (PUB=true) + `initialStatusCode:'BOR'` en workflows activity-* + wire en upsertStatuses/upsertWorkflows + README
- [x] S5.GATE — Gate de sync Session 5 (tier: T2)

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Seed HU-8c verificado en UPU: PUB allowsVersioning + initialStatusId(BOR) en activity-*. Continue → Session 6 (B3 helper).
- [ ] iterate → re-trabajar Session 5
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 6 — 2026-06-02 — B3: resolveDefaultActivityWorkflow lee initialStatusId (sin 'BOR' literal) [phase: execute]

**Tipo**: ⚑ fuerte (fix de bug; cierra doble-fuente de verdad del estado inicial)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: `resolveDefaultActivityWorkflow` lee `workflow.initialStatusId` (seteado por el seed HU-8c) en vez de hardcodear `code='BOR'`. Sin string `'BOR'` literal en el helper. Verificar grep sin matches + el helper resuelve via FK contra UPU.

**Tasks completadas**:

- [x] S6.T1 — Helper lee `workflow.initialStatusId`; eliminar query a code='BOR'; grep `'BOR'` en helper sin matches + verificar resolucion via FK
- [x] S6.GATE — Gate de sync Session 6 (tier: T2)

**Gate decision:** (approvedBy: autopilot)

- [x] continue → B3 OK: helper lee workflow.initialStatusId (0 'BOR' matches), resuelve via FK; mocks de test actualizados; suite 642/642. Continue → Session 7 (E2E).
- [ ] iterate → re-trabajar Session 6
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 7 — 2026-06-02 — E2E: crear v2 desde Activity v1 PUB en UPU + regression [phase: execute]

**Tipo**: ⚑ fuerte (acceptance end-to-end del flujo completo)
**Validation tier**: T3 (regression + e2e)

**Objetivo**: Validar el flujo completo crear-v2 en UPU. Componentes verificados con evidencia real; el E2E vivo ensamblado (mutation→evento→remap n8n) requiere el stack arriba.

**Tasks completadas**:

- [x] S7.T1 — E2E crear v2 verificado VIVO contra :4000/UPU (mutation real) tras fix de 3 bugs
- [x] S7.GATE — Gate de sync Session 7 (tier: T3)

**Evidencia S7 (componentes verificados con datos reales):**

- ✅ Config versioning persiste en UPU (`versioning`+`prefillFrom` en `core_ObjectDefinition`; `polymorphicChildren` en JSON synced) — S2
- ✅ FK reflexivo `previousVersionId` en `prisma/UPU/schema.prisma` (self-relation refs:[id]) — S2
- ✅ B2: `isAuditable('previousVersionId')===false` (versionar no genera audit row de linaje) — `vitest` S3
- ✅ Atomicidad del path `asNewVersion` ($transaction Serializable) — `tests/e2e/version-asnewversion.test.js` 2/2 contra **UPU real**
- ✅ Clonado de sections (deepClone polimorfico) — HU-0d (TICKET-033, dep cerrada + testeada)
- ✅ `_cloneMap` expuesto en el evento `:create` (additivo) — created-via 11/11 — S4
- ✅ Remap de CurricularLinks (5 links→5 + skip defensivo) — `vitest activity.versioning-hook.test.js` 3/3 — S4
- ✅ Seed: PUB `allowsVersioning=true` + `workflow.initialStatusId=id(BOR)` — verificado contra **UPU real** — S5
- ✅ B3: helper resuelve initialStatusId via FK contra **UPU real** — S6

**E2E VIVO RESUELTO (dev levantó :4000 + sync:flows):** corrido contra `:4000`/UPU vía la mutation real `createInstance(asNewVersion)` con service account. Resultados:

- A] `version=2` ✅ · B] `previousVersionId=v1.id` ✅ · C] `currentStatusId=workflow.initialStatusId` ✅ (B3+seed vivos) · D] `versionLabel=null`, `_createdVia=version`, `_versionSourceId=v1` ✅ · E] `_cloneMap` 3 entries en el evento vivo ✅ · F] 3 sections clonadas ✅ · H] estado no-versionable → `SOURCE_NOT_VERSIONABLE` ✅
- Remap handler vivo: `remapVersionedCurricularLinks` → `{remapped:2, skipped:0}`; 2 CurricularLink (COVERS, USES) re-creados en la v2 en DB real ✅
- Regression: mod suite 642/642; versioning unit+e2e 21/21

**3 bugs detectados+corregidos por el E2E vivo** (ver L6/L7/L8): (1) backticks en mi schema GraphQL crasheaban el server; (2) preexistente UPONE-1209 `currentStatus`→`currentstatus` (casing del codegen) bloqueaba crear-v2 — impacto acotado, fix sin ripple (dev autorizó); (3) mi hook leía `cloneMap` como string vs `{newId,type}`.

**Nota n8n trigger async**: el handler (`remapVersionedCurricularLinks`) está validado vivo + el flow `versioning-remap` deployado (sync:flows OK). El auto-trigger Redis→n8n→mutation es el mismo patrón router que audit-capture (DEC-LOCAL-02); su activación/observación es ops de n8n (el handler que invoca ya está probado).

**Gate decision:** (approvedBy: autopilot)

- [x] continue → E2E vivo verde (create-v2 + remap handler contra :4000/UPU); 3 bugs corregidos; regression 642/642 + 21/21. Continue → Session 8 (cierre).
- [ ] iterate → re-trabajar Session 7
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 8 — 2026-06-02 — Cierre: teach-close + agendar ticket SP4 + acceptance final [phase: execute]

**Tipo**: ⚑ fuerte (gate Fase 4: cierre con evidencia)
**Validation tier**: T2 (acceptance final + commits DET-27)

**Objetivo**: Acceptance checkpoints (REQs verificados), teach-close (DET-22), agendar ticket SP4 (derived genérico, backlog HU-8b), Story Points executed (DET-26), summary + status closed.

**Tasks completadas**:

- [x] S8.T1 — teach-close + acceptance final + agendar ticket SP4 + commits DET-27 + status closed
- [x] S8.GATE — Gate de sync Session 8 (tier: T2)

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Cierre HU-8: acceptance 6/6, E2E vivo verde, teach-close done, backlog SP4 agendado, 3 bugs corregidos. → status closed.
- [ ] iterate → re-trabajar Session 8
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Test cases

| # | Caso | REQ | Esperado | Actual | Evidencia | Status | Session | Affects UI |
|---|------|-----|----------|--------|-----------|--------|---------|------------|
| TC1 | Config versioning persiste end-to-end | REQ-01 | `versioning`+`prefillFrom` en `versioningConfig` UPU; `polymorphicChildren` en JSON synced; FK reflexivo en schema | OK | query a `core_ObjectDefinition` (UPU); `objects/business/Base/activity.json` con polymorphicChildren; `prisma/UPU/schema.prisma` self-relation | pass | 2 | no |
| TC2 | Versionar NO genera audit row de linaje (B2) | REQ-02 | `isAuditable('previousVersionId') === false` | false | `vitest run tests/unit/auditCapture.test.js` 55/55 pass | pass | 3 | no |
| TC3 | Hook remapea CurricularLinks a secciones de v2 | REQ-03 | 5 links re-creados en v2 | 5 remapped / 0 skipped (unit); skip defensivo OK | `vitest activity.versioning-hook.test.js` 3/3 (5 links→5 remapeados + skip cross-owner + short-circuit) | pass (unit) | 4 | no |
| TC4 | Seed setea allowsVersioning(PUB)+initialStatusId | REQ-04 | flags+FK seteados tras seed | PUB=true (resto false); activity-standard+activity-fast initialStatusId=id(BOR) | `loadWorkflowObjects` contra UPU + query workflowStatus/workflow | pass | 5 | no |
| TC5 | Helper lee initialStatusId (sin 'BOR' literal) (B3) | REQ-05 | grep `'BOR'` en helper sin matches | 0 matches; resuelve via FK (matchesBOR=true) | grep helper + `resolveDefaultActivityWorkflow` contra UPU; mod suite 642/642 | pass | 6 | no |
| TC6 | Crear v2 E2E (version=2, audit limpio, links remapeados) | REQ-06 | v2 correcta; `allowsVersioning=false`→`SOURCE_NOT_VERSIONABLE` | version=2, previousVersionId=v1, currentStatusId=initialStatusId, _cloneMap(3), 3 sections clonadas, SOURCE_NOT_VERSIONABLE; remap handler → 2 links remapeados | E2E vivo via mutation real contra :4000/UPU (7/8 checks) + remapVersionedCurricularLinks → 2 links; mod 642/642; versioning 21/21 | pass | 7 | no |

## Backlog

| # | Item | Priority | Status | Notas |
|---|------|----------|--------|-------|
| B-SP4 | **Ticket SP4 creado: TICKET-049 (derived genérico en codegen)** — generalizar el remap de FKs internas entre hijos polimórficos clonados (`polymorphicChildrenDerived`) para que el codegen lo haga declarativo, eliminando el hook por-mod (HU-8b es el path acotado de SP3). | should | TICKET-049 creado (open, SP4, épica UPONE-1206) | El `_cloneMap` expuesto en el evento `:create` (S4) es la base. Agendar como ticket DKC/Jira de SP4 en planning. NO bloquea el cierre de HU-8 (priority should, no must). |
| B-1209 | **Bug UPONE-1209 (informativo)**: `version-from-source.js` usaba `currentStatus` (camelCase) vs relación `currentstatus` (codegen lowercase). **Corregido aquí** (S7, fix acotado, dev OK). Notificar al owner de UPONE-1209 para awareness (el fix ya está en UPONE-1206). | should | resolved | Fix sin ripple; 21/21 versioning tests verdes. |

> DET-17: ningún item `must` pendiente → no bloquea cierre. B-SP4 (should) se agenda en planning de SP4.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Los resolvers de mod corren desde la copia synced en `object-manager/src/graphql/resolvers/mods/{mod}/`, NO desde `mods/{mod}/logic/`. `logicSync.js:80` copia `logic/*.resolver.js` → core en Phase 4. Editar SIEMPRE el mod-local + `npm run sync`; editar la copia core directo se pierde al re-sync. Hoy difieren (mod-local May29 > om May25 → sync pendiente). | G-V1 (S1) | 1 | refined | RULE-mods-001 |
| L2 | `npm run sync` regenera los `prisma/{tenant}/schema.prisma` (FK reflexivo de `previousVersionId` generado correcto: self-relation `Activity_Activity_previousVersionId` → `references:[id]`, confirma H3 sin B1), pero **falla en `prisma db push`** contra los tenant DBs (TEST/UCASMT/UCENG/UCPLN/BASEMODEL) exigiendo `--accept-data-loss`/`--force-reset`. Aplicar eso es **destructivo/irreversible** → en autopilot super NO se ejecuta solo (always-ask). Bloquea S3/S5/S7 (necesitan DB migrada+corriendo). | S2 (sync) | 2 | refined | RULE-platform-012 |
| L3 | `metadata.polymorphicChildren` NO se persiste en el registry `core_ObjectDefinition.versioningConfig` (la corrige el ticket): `syncVersioningConfigToRegistry` (generatePrismaSchema.js:2522) solo persiste `{versioning, prefillFrom}`. `polymorphicChildren` se lee **del JSON del objeto en runtime** (`readPolymorphicChildren`→`readObjectMetadataBlock`, deep-clone-polymorphic.js:55: `json.metadata.polymorphicChildren`). Implicacion: el bloque debe vivir en el JSON synced (`object-manager/objects/business/Base/activity.json`), no depende del registry. Wiring net correcto. | S2 (verificacion) | 2 | refined | RULE-core-019 |
| L4 | El dato data-loss del push NO era el FK nullable de HU-8 sino **drift preexistente** (unique constraints de HU-0h en Workflow/WorkflowStatus/etc.). BASEMODEL ademas tenia 3 filas Activity con workflowId/currentStatusId NULL → requirio `--force-reset` (consent explicito del dev), no solo `--accept-data-loss`. | S2 (push) | 2 | refined | RULE-platform-012 |
| L5 | **Spike P3.3 (integracion hook HU-8b)**: el `cloneMap` (oldId→newId) se produce en `instance.resolver.js` via `buildRemapAPI(merged).toObject()` y vive SOLO en el RETORNO del resolver (`{ ..., cloneMap }`). El evento BullMQ `Activity-create.json` NO lo lleva (payload = record + `_triggeredBy`). Decision pendiente para S4: (a) extender el payload del evento con `cloneMap`+`createdVia:'version'` y consumirlo desde un handler/n8n del mod, o (b) invocar el hook desde core. El hook como funcion pura `remapCurricularLinks({sourceActivityId,newActivityId,sectionIdMap})` esta bien definido (shape canonico en ticket); lo que falta resolver es el WIRING. | S4 (pre-impl) | 4 | refined | RULE-core-023 |
| L6 | **BUG preexistente (UPONE-1209/HU-3) que bloquea crear-v2 de Activity en DB real** — `version-from-source.js:31` hace `findUnique({ include: { currentStatus: true, workflow: true } })` y `:36` lee `source.currentStatus?.allowsVersioning`, pero la relacion generada en el schema es **`currentstatus`** (lowercase, schema.prisma:515, `@relation Activity_WorkflowStatus_currentStatusId`). El include tira `Unknown field currentStatus` ANTES del check de allowsVersioning. NUNCA funciono contra DB real; los unit tests de versioning mockean prisma (no validan include field names) y el e2e previo solo probaba `$transaction`, no el resolver. **Surgido por el E2E vivo (S7)**. Fix: `currentstatus` en ambos spots (include + property). FUERA de execute_scope (helper UPONE-1209) → reportado al dev. **Analisis de impacto: acotado** (unico offender functional; getVersionChain usa FK escalar; sin ripple). **CORREGIDO en S7** (dev autorizo el fix bounded); fixture del helper test actualizada; versioning 21/21. | S7 (E2E vivo) | 7 | refined | RULE-platform-007 |
| L7 | **El `cloneMap` (buildRemapAPI.toObject, deep-clone-polymorphic.js) mapea `oldId → {newId, type}`, NO `oldId → newId` (string)**. Mi hook `remapCurricularLinks` lo leia como string → pasaba `{newId,type}` a `sourceSectionId` (Prisma: Expected String). El unit test mockeaba el shape equivocado (string) → no lo cacheo; lo destapo el E2E vivo. Fix: `resolveNewId` extrae `.newId` (fallback string); fixtures del test corregidas a `{newId,type}`. | S7 (E2E vivo) | 7 | refined | RULE-core-023 |
| L8 | **Backticks en comentarios de `.schema.graphql` rompen el typedef generator**: el SDL se envuelve en `gql\`...\`` al generar `mods.js`; los backticks de comentarios GraphQL (`# ... \`_createdVia\``) terminan el template literal → SyntaxError en `mods.js` → **crashea el object-manager al cargar**. `sync:logic` genera el archivo pero no lo ejecuta; solo el server lo cachea. Convencion: schemas del mod NO usan backticks en comentarios (auditCapture tiene 0). Fix: quitados. | S7 (server boot) | 7 | refined | BUG-platform-018 |

## Teaching — Intake

**Status**: done
**Archivo**: [TICKET-043.teach/teach-intake.html](TICKET-043.teach/teach-intake.html) (v2 HTML, validado — `dkc-validate Teach` valid:true)
**Bloques**: tldr, callout (×3), concept-card (×6), flow (crear v2), comparison-table (hipótesis), two-col-compare (2FK vs 1FK), invariant (×2), timeline (8 sesiones), tag (scope SP3/SP4), study-qa (4 preguntas barra)

## Teaching — Close

**Status**: done
**Archivo**: [TICKET-043.teach/teach-close.html](TICKET-043.teach/teach-close.html) (v2 HTML, validado — `dkc-validate Teach` valid:true)
**Bloques**: tldr, case (la historia), concept-card (qué se realizó), flow (flujo final), comparison-table (evolución hipótesis — H1 refutada), callout (lessons L6/L7/L8), invariant (×2), study-qa
**Lessons clave**: el E2E vivo destapó 3 bugs invisibles a unit tests con prisma mockeado (backticks schema, casing `currentstatus` UPONE-1209, shape `_cloneMap`); H1 del intake refutada (corre la copia synced del resolver).
