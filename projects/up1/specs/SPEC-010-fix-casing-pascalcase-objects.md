---
id: SPEC-010-fix-casing-pascalcase-objects
project: up1
ticket: TICKET-028
status: done
---

# Fix casing PascalCase objects/layouts/resolvers del workflow + activity (rebase intent de hotfix/casing)

# Fix casing PascalCase objects/layouts/resolvers del workflow + activity (rebase intent de hotfix/casing)

## Executive summary — lo que estas aprobando

> *Revision rapida. Detalle tecnico abajo. Aprueba leyendo solo esta seccion si te basta.*

**Que se quiere**: aplicar la convencion PascalCase del platform up1 a los 5 objects del workflow + activity en `mods/curriculum-design`, alineando con el resto del platform (Person, OrgUnit, Institution, CurricularSection — todos PascalCase). Clemente ya hizo el trabajo en `origin/hotfix/casing` pero su merge-base es pre-TICKET-025 + pre-UPONE-1098, asi que un merge directo borraria el trabajo de esos tickets. Solucion: aplicar la **intent** de sus 4 commits sobre `develop` actual del mod, sin perder ChangeLog ni nuestro TICKET-027. Tambien crear `RULE-platform-006` que codifique la convencion para que no se vuelva a generar el mismatch en futuros objects.

**Decisiones criticas cerradas durante design**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **DEC-LOCAL-01 — Branch nueva propia (no rebase de hotfix/casing)**: forkear desde `develop` del mod (post-merge de TICKET-027) y aplicar la intent PascalCase manualmente | Rebase mecanico borraria `default_changeLog_list.json` y `default_curricularLink_view.json` (agregados por UPONE-1098) + crearia conflicto con renombrado de TICKET-025 (`default_AcademicActivity_*` → `default_activity_*` lowercase). Branch propia preserva todo el trabajo entremedio |
| 2 | **DEC-LOCAL-02 — Approach: edit-in-place (no `git mv` separate)**: usar `git mv` para renombrar los 4 layouts + Edit en TODOS los archivos con refs cross-archivo | Rename + edit en un solo flujo. `git mv` preserva el historial git del file rename; Edit sobre el contenido captura los cambios internos |
| 3 | **DEC-LOCAL-03 — RULE-platform-006 con `level: must` + `scope: global`**: la regla aplica cross-mod, no solo curriculum-design | El mismo patron puede emerger en cualquier mod nuevo (ai-agent, retention-wellbeing, etc.). Global + must impide que un dev cree objects lowercase en futuros mods |

**Riesgos principales y como los mitigamos**:

- **Codegen up1 falla al regenerar schema porque ya hay tabla `activity` lowercase en BD UPU local**: corremos `npm run codegen` y observamos. Si genera migration con `RENAME TABLE`, evaluamos manualmente vs reset destructivo de schema local (per memoria `feedback_sync_canonical_no_shortcuts.md` — NO usar atajos quirurgicos como db push manual)
- **Sync rompe al propagar `objectName` lowercase residual**: validamos con grep recursive `grep -rE "\"objectName\":\s*\"activity\"" .` que retorne 0 matches antes de correr sync
- **TICKET-027 a11y tests (28/28) regresionan**: REQ-PRESERVE-01 con TC-17 corre `npx vitest run tests/integration/activity-status-badge-a11y.test.ts` post-cambios. Sin smoke visual (componente no afectado por casing per scope analysis)
- **Otros tests integration del mod regresionan**: REQ-PRESERVE-02 con TC-18 corre `npx vitest run tests/integration/` y comparamos contra baseline pre-fix

**Que NO se hace en este ticket**:

- **Cleanup de `hotfix/casing`**: la branch de Clemente queda obsoleta — coordinar con el para que la cierre. NO la borramos nosotros
- **Otros mods del repo up1**: solo `curriculum-design`. Auditoria cross-mod queda como follow-up potencial
- **Cambios al token system del platform** (`theme-tokens.css`): no related
- **Tocar nuestro componente `ActivityStatusBadge`**: NO se afecta — usa `BadgeVariant` lowercase de Bootstrap (no related al object name)
- **Migracion Prisma destructiva**: preferir codegen + reset local + script SQL idempotente

**Tamano estimado**: 3 sessions ejecutables (S1, S2, S3), aproximadamente 3-4h efectivas. **S3 es la mas riesgosa** (T3 ⚑ fuerte, valida codegen + sync + smoke + crea RULE).

**Como vas a saber que funciona**:

- `npm run codegen` desde root up1 genera `model Activity {}` (PascalCase) en `object-manager/prisma/UCASMT/schema.prisma`
- `npm run sync` propaga sin errores a `suite/`, `layout/`, `object-manager/objects/`
- Tests integration del mod pasan completos (incluye 28/28 de TICKET-027 sin regresion)
- `grep -r "default_activity_" .` retorna 0 matches en el mod post-fix
- `grep -r '"objectName": "activity"' .` retorna 0 matches en el mod post-fix
- `RULE-platform-006` indexada por `dkc-reindex up1` y consultable desde otros tickets

---

## Purpose

Aplicar la convencion PascalCase del platform up1 al universo de objects/layouts/resolvers del workflow + activity en `mods/curriculum-design`. La violacion de convencion fue introducida por TICKET-019 (HU4 rename `academicActivity → activity` en lowercase) y persistio en TICKET-025 (que renombro layouts a `default_activity_*` lowercase manteniendo la inconsistencia). Clemente detecto el problema empiricamente en deploy y creo `hotfix/casing` con la solucion correcta, pero su branch divergio antes de los merges recientes (TICKET-025, TICKET-027, UPONE-1098), haciendo el merge directo no viable. Este ticket aplica la **intent** de su trabajo sobre `develop` actual y agrega una RULE para prevenir recurrencias.

## Requirements

### REQ-FIX-01: Object titles + cross-references PascalCase

> **Que cambia**: cuando el codegen lee `objects/activity.json` y otros 4 objects del workflow, ahora encuentra `"title": "Activity"`, `"Workflow"`, `"WorkflowStatus"`, `"WorkflowTransition"`, `"WorkflowTransitionHistory"`. Las referencias FK cross-object (`references: "workflow"` etc.) tambien quedan PascalCase.
> **Por que**: el codegen [`fileParsing.js:209-213`](../../../uplanner/up1/object-manager/src/services/fileParsing.js) usa `title` directo como nombre del modelo Prisma. Lowercase title → `model activity {}` lowercase en `UCASMT/schema.prisma`, generando deploy block en ambientes case-sensitive.

El sistema MUST tener `title` en los 5 objects (`activity`, `workflow`, `workflowStatus`, `workflowTransition`, `workflowTransitionHistory`) y `references` cross-object en PascalCase. Lowercase quedara registrado como anti-pattern blockeante via RULE-platform-006.

**Actor**: developer
**Layers**: data model (objects/*.json)

<details><summary>Scenarios de validacion</summary>

#### Scenario: activity.json title PascalCase
- **GIVEN** branch fix/casing-pascalcase-objects creada desde develop
- **WHEN** se ejecuta `jq '.title' mods/curriculum-design/objects/activity.json`
- **THEN** retorna `"Activity"` (no `"activity"`)

#### Scenario: cross-references PascalCase
- **GIVEN** workflowTransition.json con FKs a workflow, workflowStatus
- **WHEN** se ejecuta `jq '..|.references? // empty' workflowTransition.json`
- **THEN** todas las referencias retornan PascalCase (`"Workflow"`, `"WorkflowStatus"`)

</details>

#### Acceptance
TC-1..TC-5 (grep + jq) verifican title + references PascalCase en los 5 objects.

---

### REQ-FIX-02: GraphQL resolver types PascalCase

> **Que cambia**: las mutations validadas del resolver (`transitionActivityValidated`, `updateActivityValidated`, `createWorkflowValidated`, etc.) retornan tipos PascalCase: `Activity!`, `Workflow!`, `WorkflowTransition!`, `WorkflowTransitionHistory!`.
> **Por que**: el cliente GraphQL del suite (codegen Apollo) genera types PascalCase; los resolvers lowercase generan schema validation mismatch al compilar.

El sistema MUST tener todos los resolver return types en `logic/*.schema.graphql` en PascalCase. Grep `: activity!` retorna 0 matches post-fix.

**Actor**: developer
**Layers**: api (GraphQL schemas)

<details><summary>Scenarios de validacion</summary>

#### Scenario: activity.schema.graphql
- **GIVEN** logic/activity.schema.graphql post-fix
- **WHEN** se ejecuta `grep -c ": activity!" logic/activity.schema.graphql`
- **THEN** retorna `0`
- **AND** grep `": Activity!"` retorna >= 2 matches (mutations transitionActivityValidated + updateActivityValidated)

#### Scenario: schemas adicionales
- **GIVEN** workflow.schema.graphql, workflowTransition.schema.graphql, workflowTransitionHistory.schema.graphql
- **WHEN** se ejecuta grep por tipos lowercase en cada uno
- **THEN** 0 matches en cada uno

</details>

#### Acceptance
TC-6..TC-9 (grep) verifican 0 resolver types lowercase en los 4 GraphQL schemas.

---

### REQ-FIX-03: Layouts renamed + objectName updated

> **Que cambia**: los 4 layouts `default_activity_*` (lowercase, post-TICKET-025) se renombran a `default_Activity_*` (PascalCase). El `objectName` dentro de cada uno tambien pasa a `"Activity"`.
> **Por que**: el `LayoutOrchestrator` resuelve `default_{ObjectName}_{mode}` esperando PascalCase per CLAUDE.md (`Default layout naming convention: default_Person_view`). El sync propaga `objectName` lowercase a BD `up1_layen_layout`, donde queries del suite no encuentran match.

El sistema MUST renombrar los 4 archivos via `git mv` (preservando historial) y actualizar el campo `objectName` interno + el campo `id` + el campo `name` para que apunten al PascalCase.

**Actor**: developer
**Layers**: frontend (layouts JSON)

<details><summary>Scenarios de validacion</summary>

#### Scenario: layouts existen con nombre PascalCase
- **GIVEN** mods/curriculum-design/config/layouts/ post-rename
- **WHEN** se ejecuta `ls config/layouts/ | grep -E "default_Activity_"`
- **THEN** retorna 4 archivos: create/edit/list/view

#### Scenario: objectName interno PascalCase
- **GIVEN** cada layout renombrado
- **WHEN** se ejecuta `jq '.objectName' default_Activity_view.json`
- **THEN** retorna `"Activity"` (no `"activity"`)

#### Scenario: id + name interno tambien actualizado
- **GIVEN** cada layout renombrado
- **WHEN** se ejecuta `jq '.id, .name' default_Activity_view.json`
- **THEN** ambos retornan `"default_Activity_view"`

</details>

#### Acceptance
TC-10..TC-13 (file exists + jq objectName) verifican layouts PascalCase.

---

### REQ-FIX-04: Cross-references en docs/tests/i18n/events/configs

> **Que cambia**: ~30 archivos del mod (docs `.ai/`, README, tests integration assertions, llm-e2e scenarios + fixtures, i18n keys, events JSON, configs `app.json`, layouts cross-mod que embebian `default_activity_*`) actualizan sus referencias a PascalCase.
> **Por que**: refs stale lowercase post-rename quedan como bombas de tiempo — tests fallan, embeds rompen, docs apuntan a nombres viejos.

El sistema MUST tener 0 matches de `default_activity_` (lowercase) y 0 matches de `"objectName":\s*"activity"` en TODO el repo del mod post-fix.

**Actor**: developer
**Layers**: docs, tests, i18n, events, configs (cross-archivo)

<details><summary>Scenarios de validacion</summary>

#### Scenario: grep global lowercase queda en 0
- **GIVEN** mod post-S2
- **WHEN** se ejecuta `grep -r "default_activity_" --include="*.{json,md,ts,js,vue}" mods/curriculum-design/`
- **THEN** retorna 0 matches

#### Scenario: tests integration actualizados
- **GIVEN** layouts-declared.test.ts post-update
- **WHEN** se ejecuta `npx vitest run tests/integration/layouts-declared.test.ts`
- **THEN** pasa (las assertions ahora esperan PascalCase)

</details>

#### Acceptance
TC-14 (grep recursive) verifica 0 refs lowercase residuales.

---

### REQ-FIX-05: Codegen + sync OK + Prisma `model Activity` PascalCase

> **Que cambia**: post-fix, `npm run codegen` desde root up1 regenera `object-manager/prisma/UCASMT/schema.prisma` con `model Activity`, `model Workflow`, etc. en PascalCase. `npm run sync` propaga al core sin errors.
> **Por que**: es el end-to-end validation del fix — sin esto, no podemos confirmar que el codegen produce el output correcto.

El sistema MUST tener `npm run codegen` exit 0 + `grep "model Activity" object-manager/prisma/UCASMT/schema.prisma` retorna >= 1 match + `npm run sync` exit 0.

**Actor**: developer
**Layers**: codegen, sync, Prisma schema

<details><summary>Scenarios de validacion</summary>

#### Scenario: codegen genera PascalCase
- **GIVEN** objects con title PascalCase post-S1
- **WHEN** se ejecuta `npm run codegen --workspace=@uplanner/object-management-backend` desde root up1
- **THEN** exit 0
- **AND** grep `^model Activity` schema.prisma retorna match
- **AND** grep `^model activity` schema.prisma retorna 0 (lowercase eliminado)

#### Scenario: sync no rompe
- **GIVEN** estado post-codegen
- **WHEN** se ejecuta `npm run sync` desde root up1
- **THEN** exit 0
- **AND** sin errores en logs sobre objectName mismatch

</details>

#### Acceptance
TC-15 (codegen + grep) verifica Prisma schema PascalCase + sync OK.

---

### REQ-FIX-06: BD UPU migracion idempotente VIA SEED DEL MOD (no SQL out-of-band)

> **Que cambia**: la tabla `up1_layen_layout` tiene actualmente filas con `name LIKE 'default_activity_%'` lowercase. Un nuevo loader idempotente `seed/_data-layouts-pascalcase-cleanup.js` registrado en `seed/seed.js` (paso 3b) limpia esas filas: UPDATE en place o DELETE orphan segun si existe ya la version PascalCase.
> **Por que**: el sync canonico no elimina filas legacy (BUG-platform-002: `deactivateOrphanedAppsLayouts` es codigo muerto). DEC-LOCAL-04 (post-execute): el approach de SQL out-of-band en `scripts/migrations/*.sql` violaba la regla "solucion vive dentro del mod" porque no hay forma confiable de ejecutar SQL externo en deploy production sin DBA intervention manual. La logica vive ahora dentro del mod, idempotente, invocada por `npm run seed` canonico.

El sistema MUST proveer un loader idempotente `seed/_data-layouts-pascalcase-cleanup.js` registrado en `seed/seed.js` que:
- Detecte filas con `name LIKE 'default_activity_%'` OR `objectName = 'activity'`
- Para cada legacy: si existe la fila PascalCase equivalente → DELETE legacy; si no → UPDATE en place (`name` + `objectName` PascalCase) preservando el cuid `id`
- Re-corrida sea no-op (idempotencia)
- Solo aplique a tenant UPU (Phase 1 — DECISION-012)

**Actor**: developer / scribe
**Layers**: database (BD UPU) via mod-internal seed mechanism (NO SQL out-of-band)

<details><summary>Scenarios de validacion</summary>

#### Scenario: seed loader cleans legacy rows
- **GIVEN** BD UPU con 4 filas legacy `name LIKE 'default_activity_%'` (lowercase)
- **WHEN** se ejecuta `npm run seed` (que invoca seed.js que invoca loadLayoutsPascalCaseCleanup)
- **THEN** ANTES: 4 legacy lowercase + 0 PascalCase (o 4 PascalCase si sync corrio antes)
- **AND** DESPUES: 0 lowercase + 4 PascalCase (UPDATE en place SI sync no corrio aun; DELETE orphan SI sync ya creo las PascalCase nuevas)
- **AND** segunda corrida del seed no afecta nada (idempotencia)

#### Scenario: tenant no-UPU skip
- **GIVEN** tenant distinto a UPU (e.g. TEST, ALU)
- **WHEN** seed.js corre con ese tenantId
- **THEN** loadLayoutsPascalCaseCleanup retorna `{ skipped: true, reason: 'tenant X fuera de scope' }`
- **AND** BD del tenant no se modifica

</details>

#### Acceptance
TC-16 (post-`npm run seed`: query lowercase retorna 0 + PascalCase retorna 4) + TC-16b (idempotencia: segunda corrida no-op).

---

### REQ-PRESERVE-01: TICKET-027 a11y tests NO regresionan

> **Que cambia**: el componente `ActivityStatusBadge` y su test suite (`activity-status-badge-a11y.test.ts` con 28 tests) siguen pasando integramente post-fix.
> **Por que**: nuestro trabajo de TICKET-027 (a11y WCAG AA) toca el componente Vueform, NO el object name de Prisma. Pero el sync propagation podria romper paths de imports — hay que validar empirico.

El sistema MUST mantener 28/28 tests pass en `tests/integration/activity-status-badge-a11y.test.ts` post-S3.

**Actor**: developer / reviewer
**Layers**: tests (regression)

<details><summary>Scenarios de validacion</summary>

#### Scenario: tests a11y intactos
- **GIVEN** branch fix/casing-pascalcase-objects post-S3
- **WHEN** se ejecuta `npx vitest run tests/integration/activity-status-badge-a11y.test.ts`
- **THEN** 28/28 pass

</details>

#### Acceptance
TC-17 (vitest run) confirma 0 regresion en TICKET-027.

---

### REQ-PRESERVE-02: Otros tests integration del mod NO regresionan

> **Que cambia**: la suite completa de tests integration del mod (`tests/integration/`) sigue pasando con la misma tasa que pre-fix.
> **Por que**: el fix toca muchos archivos cross-cutting (40+); riesgo de romper assertions de tests no anticipados.

El sistema MUST mantener pass rate identica de `tests/integration/` post-S3 vs baseline pre-fix.

**Actor**: developer / reviewer
**Layers**: tests (regression suite completa)

<details><summary>Scenarios de validacion</summary>

#### Scenario: suite integration intacta
- **GIVEN** baseline pre-fix capturado al inicio de S1
- **WHEN** se ejecuta `npx vitest run tests/integration/` post-S3
- **THEN** pass rate (X pass / Y total) identica o mejor que baseline
- **AND** sin nuevos fails (los fails preexistentes, si los hay, quedan documentados como pre-existentes)

</details>

#### Acceptance
TC-18 (vitest run suite completa) confirma 0 regresion fuera de los tests actualizados deliberadamente en S2.

---

### REQ-RULE-01: RULE-platform-006 creada documentando la convencion

> **Que cambia**: nuevo archivo `projects/up1/rules/platform/rule-platform-006.md` con la convencion PascalCase canonica (objects, layouts, GraphQL types) + `level: must` + `scope: global`. Cualquier mod nuevo que cree objects debe respetarla.
> **Por que**: el caso actual (lowercase → deploy block) no debe repetirse. Sin RULE explicita, el proximo dev que cree un mod o object nuevo puede caer en el mismo trap.

El sistema MUST tener `projects/up1/rules/platform/rule-platform-006.md` valido (dkc-validate Rule ok), indexado por dkc-reindex, con secciones canonicas (What / Why / Where / When / Verification) + ejemplos positivos y negativos.

**Actor**: scribe / developer
**Layers**: meta (documentation + KB)

<details><summary>Scenarios de validacion</summary>

#### Scenario: RULE creada + validada
- **GIVEN** archivo escrito en projects/up1/rules/platform/rule-platform-006.md
- **WHEN** se ejecuta `./commands/dkc-validate Rule projects/up1/rules/platform/rule-platform-006.md`
- **THEN** valid: true + records_validated: 1

#### Scenario: indexable + consultable
- **GIVEN** post-reindex
- **WHEN** se ejecuta `./commands/dkc-reindex up1`
- **THEN** la rule aparece en `index.db` como `RULE-platform-006`
- **AND** consultable desde otros tickets via researcher

</details>

#### Acceptance
TC-19 (dkc-validate + dkc-reindex) verifica RULE valida + indexable.

---

## Changes

### Modified: objects/activity.json + 4 mas (workflow, workflowStatus, workflowTransition, workflowTransitionHistory)

| Aspecto | Antes | Despues |
|---------|-------|---------|
| `title` (5 archivos) | `"activity"`, `"workflow"`, `"workflowStatus"`, `"workflowTransition"`, `"workflowTransitionHistory"` | `"Activity"`, `"Workflow"`, `"WorkflowStatus"`, `"WorkflowTransition"`, `"WorkflowTransitionHistory"` |
| `references` (FK cross-object) | `"workflow"`, `"workflowStatus"` | `"Workflow"`, `"WorkflowStatus"` |

### Modified + Renamed: config/layouts/default_activity_* → default_Activity_*

| Aspecto | Antes | Despues |
|---------|-------|---------|
| Filename (4 archivos) | `default_activity_{create,edit,list,view}.json` | `default_Activity_{create,edit,list,view}.json` |
| `id` field interno | `"default_activity_view"` | `"default_Activity_view"` |
| `name` field interno | `"default_activity_view"` | `"default_Activity_view"` |
| `objectName` field interno | `"activity"` | `"Activity"` |

### Modified: logic/*.schema.graphql

| Schema | Antes | Despues |
|--------|-------|---------|
| activity.schema.graphql | `: activity!`, `: workflowTransitionHistory!` | `: Activity!`, `: WorkflowTransitionHistory!` |
| workflow.schema.graphql | `: workflow!` | `: Workflow!` |
| workflowTransition.schema.graphql | `: workflowTransition!` | `: WorkflowTransition!` |
| workflowTransitionHistory.schema.graphql | `: workflowTransitionHistory!` | `: WorkflowTransitionHistory!` |

### Modified: cross-refs (~30 archivos)

- `.ai/CONTEXT.md`, `.ai/TASKS.md`, `.ai/TROUBLESHOOTING.md`, `README.md`, `.ai/PATTERNS.md` — docs
- `config/app.json` — config del mod
- `events/activity-transition.json` + otros events que referencien
- `lang/es_CL@*.json` — i18n keys que referencien layouts/objects
- `tests/integration/layouts-declared.test.ts` — assertions de nombres de layouts
- `tests/llm-e2e/fixtures/expected-tabs.json` + scenarios — paths y refs
- `capabilities.json` — verificar si las capabilities usan lowercase objectname

### Added: seed/_data-layouts-pascalcase-cleanup.js (mod-internal, DEC-LOCAL-04)

Loader idempotente registrado en `seed/seed.js` paso 3b. Logica con Prisma client (no SQL raw): detecta filas legacy lowercase + UPDATE en place OR DELETE orphan segun si existe la PascalCase equivalente. Invocado por `npm run seed` canonico del platform. Reemplaza el approach SQL out-of-band de la version inicial del spec (DEC-LOCAL-04 documento la razon del cambio).

### Added: projects/up1/rules/platform/rule-platform-006.md

RULE global codificando la convencion PascalCase para objects (title + references), layouts (filename + objectName), GraphQL resolver types.

## Tasks

> DET-20 numeracion continua. TICKET-028 sin sessions previas (intake-explore + teach-intake + design-fix viven en "Session 0 — phase: intake"). Plan empieza en S1.

### Session 1 — Objects + GraphQL schemas + capabilities PascalCase [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear branch `fix/casing-pascalcase-objects` desde `develop` del mod curriculum-design, validar working tree limpio | REQ-FIX-01 | developer | — | (git op) | branch creada + git status clean | `git checkout develop && git branch -D fix/casing-pascalcase-objects` | DET-1, DET-11 | pending | 1 |
| S1.T2 | Aplicar PascalCase al `title` de los 5 object JSONs (activity, workflow, workflowStatus, workflowTransition, workflowTransitionHistory) | REQ-FIX-01 | developer | S1.T1 | `objects/{activity,workflow,workflowStatus,workflowTransition,workflowTransitionHistory}.json` | grep `"title":` retorna PascalCase en 5 archivos + persistir TC-1..TC-5 inline en ticket (DET-25) | git restore objects/*.json | DET-1, DET-2, DET-7, DET-25 | pending | 1 |
| S1.T3 | Aplicar PascalCase a `references` cross-object FK en los 5 object JSONs (sub-set: workflowTransition.json y workflowTransitionHistory.json apuntan a workflow/workflowStatus; activity.json apunta a workflow/workflowStatus) | REQ-FIX-01 | developer | S1.T2 | `objects/{activity,workflowTransition,workflowTransitionHistory,workflow}.json` (refs internas) + `objects/CurricularSection.json` (puede tener refs) | grep `"references":` retorna PascalCase en todas las refs activity/workflow* | git restore objects/*.json | DET-1, DET-2, DET-7, DET-25 | pending | 1 |
| S1.T4 | Aplicar PascalCase a resolver return types en `logic/*.schema.graphql` (4 archivos) | REQ-FIX-02 | developer | S1.T3 | `logic/{activity,workflow,workflowTransition,workflowTransitionHistory}.schema.graphql` | grep `: activity!`, `: workflow!`, etc. retorna 0 matches en cada uno + persistir TC-6..TC-9 inline | git restore logic/*.schema.graphql | DET-1, DET-2, DET-7, DET-25 | pending | 1 |
| S1.T5 | Auditar `capabilities.json` por keys lowercase y ajustar si aplica | REQ-FIX-04 | developer | S1.T4 | `capabilities.json` | grep `"objectname":` retorna 0 matches lowercase | git restore capabilities.json | DET-1, DET-2 | pending | 1 |
| S1.GATE | Gate de sync Session 1: validar TCs registrados (DET-25) + grep recursive 0 lowercase residuales en objects + GraphQL + capabilities. Decidir continue → S2 | REQ-FIX-01, REQ-FIX-02 | reviewer | S1.T5 | ticket markdown | tabla Quality review 10 dims + decision continue / iterate | — | DET-13, DET-20, DET-23, DET-25 | pending | 1 |

### Session 2 — Rename layouts + cross-refs en docs/tests/i18n/events [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | `git mv` de los 4 layouts `default_activity_*` → `default_Activity_*` preservando historial git | REQ-FIX-03 | developer | S1.GATE | `config/layouts/default_activity_{create,edit,list,view}.json` → renamed | ls de config/layouts retorna 4 archivos default_Activity_ | `git mv` reverso | DET-1, DET-8 | pending | 2 |
| S2.T2 | Actualizar campos internos `id`, `name`, `objectName` de los 4 layouts a PascalCase + persistir TC-10..TC-13 | REQ-FIX-03 | developer | S2.T1 | `config/layouts/default_Activity_*.json` | jq verifica `id`, `name`, `objectName` PascalCase en cada archivo | git restore | DET-1, DET-2, DET-7, DET-25 | pending | 2 |
| S2.T3 | Actualizar refs en docs (`.ai/*.md`, `README.md`, `docs/guides/*.md`), configs (`app.json`), i18n (`lang/es_CL@*.json`), events (`events/*.json`) — usar `grep -r` + Edit batch | REQ-FIX-04 | developer | S2.T2 | ~20 archivos cross-cutting | grep `default_activity_` retorna 0 matches en estos paths | git restore por archivo | DET-1, DET-16 | pending | 2 |
| S2.T4 | Actualizar tests integration `layouts-declared.test.ts` con assertions PascalCase + actualizar `llm-e2e/fixtures/expected-tabs.json` + scenarios `tests/llm-e2e/scenarios/*.md` | REQ-FIX-04 | developer | S2.T3 | `tests/integration/layouts-declared.test.ts`, `tests/llm-e2e/fixtures/expected-tabs.json`, `tests/llm-e2e/scenarios/*.md` | `npx vitest run tests/integration/layouts-declared.test.ts` pass + persistir TC-14 inline | git restore tests/ | DET-1, DET-7, DET-25 | pending | 2 |
| S2.GATE | Gate de sync Session 2: grep recursive global `default_activity_` y `"objectName":\s*"activity"` retornan 0 + tests integration locales pass + Quality review DET-23. Decidir continue → S3 | REQ-FIX-04 | reviewer | S2.T4 | ticket markdown | Quality review 10 dims + decision continue | — | DET-13, DET-20, DET-23, DET-25 | pending | 2 |

### Session 3 — Codegen + sync + script SQL + RULE-platform-006 + smoke [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Ejecutar `npm run codegen --workspace=@uplanner/object-management-backend` desde root up1 y verificar Prisma schema regenerado con `model Activity` PascalCase | REQ-FIX-05 | developer | S2.GATE | `object-manager/prisma/UCASMT/schema.prisma` (regenerado) | exit 0 + grep `model Activity` retorna match + grep `model activity` (lowercase) retorna 0 + persistir TC-15 | rollback Prisma schema manual desde develop reset (peligroso — preferir codegen rerun) | DET-1, DET-8, DET-11 | pending | 3 |
| S3.T2 | Ejecutar `npm run sync` desde root up1 y verificar propagacion sin errores a suite/, layout/, object-manager/objects/ | REQ-FIX-05 | developer | S3.T1 | sync target paths | exit 0 + sin errores objectName mismatch en logs | rollback sync state manual (peligroso — preferir re-sync con state correcto) | DET-1, DET-11 | pending | 3 |
| S3.T3 | Crear loader idempotente mod-internal `seed/_data-layouts-pascalcase-cleanup.js` + registrar en `seed/seed.js` paso 3b + actualizar test mock `seed-entry.test.ts` para incluir el nuevo loader + persistir TC-16 con counts antes/despues (validacion runtime deferida al dev local con docker pg) | REQ-FIX-06 | developer | S3.T2 | `seed/_data-layouts-pascalcase-cleanup.js` (nuevo) + `seed/seed.js` (mod) + `tests/integration/seed-entry.test.ts` (mock) | 7/7 seed-entry tests pass + sintaxis `node --check` OK + idempotencia documentada inline en JSDoc | git revert del commit | DET-1, DET-2, DET-8, DET-25 | done | 3 |
| S3.T4 | Ejecutar `npx vitest run tests/integration/activity-status-badge-a11y.test.ts` (REQ-PRESERVE-01) + `npx vitest run tests/integration/` (REQ-PRESERVE-02) | REQ-PRESERVE-01, REQ-PRESERVE-02 | developer | S3.T3 | `tests/integration/*` | 28/28 a11y pass + suite integration sin regresion + persistir TC-17 + TC-18 | revertir cambios de S1+S2+S3 (rollback total — preferir investigar regresion especifica) | DET-1, DET-7, DET-25 | pending | 3 |
| S3.T5 | Crear `RULE-platform-006` en `projects/up1/rules/platform/rule-platform-006.md` con secciones canonicas (What/Why/Where/When/Verification) + ejemplos positivos/negativos + validar con `./commands/dkc-validate Rule` | REQ-RULE-01 | scribe | S3.T4 | `projects/up1/rules/platform/rule-platform-006.md` (nuevo) | dkc-validate Rule valid + dkc-reindex up1 lista la rule + persistir TC-19 | rm rule-platform-006.md + dkc-reindex | DET-1, DET-2, DET-11, DET-16 | pending | 3 |
| S3.T6 | Quality review DET-23 exhaustive (10 dims) + Summary del ticket con metricas + branch lista para merge a develop del mod | REQ-FIX-01..06, REQ-PRESERVE-01..02, REQ-RULE-01 | reviewer | S3.T5 | ticket markdown | bloque Quality review 10 dims + Summary + decision pass / iterate / escalate | — | DET-23, DET-13, DET-14 | pending | 3 |
| S3.GATE | Gate de cierre Session 3 ⚑ fuerte: validar todo + dev approval explicito + commit final + sugerir PR a develop. Decidir close ticket | REQ-FIX-01..06, REQ-PRESERVE-01..02, REQ-RULE-01 | reviewer | S3.T6 | ticket markdown + branch | gate cerrado con dev close approval | — | DET-13, DET-14, DET-20, DET-23 | pending | 3 |

## Success metrics

| Metric | Baseline (current) | Target | How to measure | When to measure |
|--------|-------------------|--------|----------------|-----------------|
| Prisma `model {object}` PascalCase compliance (UCASMT) | 0/5 — todos lowercase | **5/5 PascalCase** | grep `model {PascalCase}` schema.prisma | post-S3.T1 |
| GraphQL resolver types PascalCase compliance | 0/6 lines de tipos lowercase eliminadas | **6/6 lines PascalCase** | grep `: activity!` retorna 0 | post-S1.T4 |
| Layouts filename + objectName PascalCase compliance | 0/4 lowercase → PascalCase | **4/4 PascalCase** | ls + jq objectName | post-S2.T2 |
| BD UPU `up1_layen_layout` consistency | 4 filas lowercase + 0 PascalCase | **0 lowercase + 4 PascalCase** | SELECT count groups | post-S3.T3 |
| TICKET-027 a11y tests pass rate | 28/28 | **28/28 (no regresion)** | `npx vitest run` | post-S3.T4 |
| RULE-platform-006 indexada en KB | no existe | **valida + indexable** | dkc-validate + dkc-reindex | post-S3.T5 |

## Constraints

- **DET-25** TCs registrados inline per session ejecutada (no diferidos al close)
- **DET-19** branch + commits del repo up1 usan TICKET-028 como id (sin external Jira)
- **Memoria global** `feedback_no_touch_layout_workspace.md` — NO tocar `layout/`, `object-manager/`, `suite/` directamente. Todos los cambios viven en `mods/curriculum-design/` + `scripts/migrations/`
- **Memoria global** `feedback_sync_canonical_no_shortcuts.md` — NO ALTER TABLE / db push / edits manuales. Codegen + sync + migration SQL son el flujo canonico
- **RULE-curriculum-design-001** (Vueform integration pattern) — sin impacto (el fix es objects/layouts/resolvers, no Vueform)

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `npm run codegen` script up1 | internal | Regenera Prisma schema desde objects JSONs | Si codegen rompe con error: investigar antes de S3.T2 (sync). Probable fix: ajustar manualmente o revertir cambio especifico que rompio |
| `npm run sync` script up1 | internal | Propaga mods → core workspaces | Bajo riesgo — sync funciono pre-fix y los cambios son JSON title/refs, no estructura del mod |
| docker `pg` BD UPU local | internal | Para ejecutar script SQL de migracion | Si docker no esta corriendo: levantar antes de S3.T3 |
| `hotfix/casing` branch de Clemente | reference | Source de la intent del fix | No depende — usamos como referencia, no merge |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Codegen genera migration Prisma con `RENAME TABLE activity → Activity` que requiere downtime en UPU production | medium | medium | S3.T1 captura el output del codegen. Si emerge migration RENAME, evaluar caso por caso. Para BD local: preferir codegen + reset + script SQL idempotente. Para UPU production: coordinar con DBA antes de aplicar |
| Sync rompe al propagar al core porque algun consumer del platform tiene hardcoded "activity" lowercase | medium | low | Hipotesis H2 ✓ confirmed dice que los consumers ya esperan PascalCase (otros modelos PascalCase ya funcionan). Si emerge consumer hardcoded: documentar como BUG-platform en lugar de bloquear este ticket |
| TICKET-027 a11y tests regresionan por imports cross-archivo afectados | low | low | REQ-PRESERVE-01 con TC-17 valida explicit. Sin smoke visual (componente no afectado por casing per scope) |
| Refs lowercase residuales escapan al grep porque viven en strings de codigo TS/JS (no JSON) | medium | low | S2.T3 + S2.GATE incluye grep `--include="*.{ts,js,vue,json,md}"` recursive en todo el mod, no solo archivos JSON |

## Open questions

(ninguna abierta al cerrar el design — las 3 DEC-LOCAL resuelven todas las decisiones criticas del intake)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Branch nueva propia (no rebase de hotfix/casing)
- **Contexto**: como aplicar la intent de Clemente
- **Drivers**: preservar el trabajo de UPONE-1098 (ChangeLog) + TICKET-025/027; evitar conflicts massivos
- **Opcion elegida**: forkear desde `develop` actual del mod y aplicar la intent PascalCase manualmente
- **Alternativas**: (a) rebase mecanico de hotfix/casing — descartado por blast radius alto (DELETE archivos UPONE-1098 + conflicts rename); (b) merge directo con resolucion manual — mismo problema
- **Consecuencias**: gana cleanliness + preserva todo trabajo previo; pierde autoria de Clemente (mitigable con co-author en commits o referencia explicita)
- **Session**: design-fix (2026-05-20)

### DEC-LOCAL-02: Edit-in-place con git mv para layouts (no separate operations)
- **Contexto**: como manejar el rename de los 4 layouts + actualizar campos internos
- **Drivers**: preservar historial git del rename; minimizar steps manuales propensos a error
- **Opcion elegida**: `git mv` cada layout + Edit para actualizar campos internos `id`, `name`, `objectName`
- **Alternativas**: (a) cp + rm — pierde historial git del rename; (b) usar script bash sed — fragil
- **Consecuencias**: gana git history clean; agrega 8 operaciones (4 mv + 4 edit) pero son atomicas
- **Session**: design-fix (2026-05-20)

### DEC-LOCAL-03: RULE-platform-006 con level=must, scope=global
- **Contexto**: alcance de la nueva RULE
- **Drivers**: la convencion aplica cross-mod (cualquier mod nuevo); MUST porque deploy block es severity high
- **Opcion elegida**: `level: must`, `scope: global` en frontmatter de la RULE
- **Alternativas**: (a) `scope: module` solo curriculum-design — descartado por aplicabilidad cross-mod; (b) `level: should` — descartado por severity (deploy block no es opcional)
- **Consecuencias**: gana enforcement transversal; la rule se carga automaticamente por researcher/scribe (per `search-operations.md`)
- **Session**: design-fix (2026-05-20)

### DEC-LOCAL-04 (post-execute): BD cleanup via seed mod-internal, NO SQL out-of-band
- **Contexto**: el spec original (S3.T3) proponia `scripts/migrations/TICKET-028-rename-activity-layouts-pascalcase.sql` ejecutado externamente con `psql`. Post-execute el dev senalo que esa solucion viola la regla "vive dentro del mod" — no hay forma confiable de ejecutar SQL externo en deploy production sin DBA intervention manual
- **Drivers**: solucion mod-internal canonica + idempotencia + sin dependencia de pasos externos al flujo `npm run codegen / sync / seed`
- **Opcion elegida**: refactor a `seed/_data-layouts-pascalcase-cleanup.js` registrado en `seed/seed.js` paso 3b. Logica idempotente Prisma-based: UPDATE en place SI no existe la PascalCase OR DELETE orphan SI sync ya creo la PascalCase. Invocado por `npm run seed` canonico. Reusa el patron exacto de `_data-activity-migration.js` que ya existia en el mod
- **Alternativas**: (a) mantener SQL out-of-band — descartado por la regla; (b) wirear `deactivateOrphanedAppsLayouts` en core sync — descartado por NO touch core; (c) aceptar orphans como benignos (queries PascalCase no los retornan) — descartado por preferencia de limpieza
- **Consecuencias**: gana enforcement automatico al deploy (cualquier `npm run seed` aplica la migracion) + idempotencia + alineacion con la regla mod-internal. Pierde el approach pre-sync (script SQL puro era atomic UPDATE before sync); pero el seed cubre ambos casos (sync corrio antes O despues) con el branch DELETE-vs-UPDATE
- **Session**: post-execute refactor (2026-05-20) — commit `6d1bd08` en mod

## Acceptance checkpoints

- [ ] **Funcional**: 7 requirements del spec cumplidos (REQ-FIX-01..06 + REQ-RULE-01)
- [ ] **Tests**: 19 TCs persisted en ticket con Actual/Evidence/Status/Session (DET-25)
- [ ] **NFRs**: 6/6 success metrics en target post-S3
- [ ] **Rules**: RULE-curriculum-design-001 respetado, RULE-platform-006 creada e indexable
- [ ] **Integration**: 28/28 TICKET-027 a11y tests pass + suite integration mod sin regresion (REQ-PRESERVE-01 + REQ-PRESERVE-02)
- [ ] **Docs**: spec + teach-close documentan el cambio. RULE-platform-006 con ejemplos positivos/negativos para devs futuros
