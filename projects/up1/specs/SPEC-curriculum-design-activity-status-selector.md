---
id: SPEC-curriculum-design-activity-status-selector
project: up1
ticket: TICKET-106
status: done
---

# Selector de transiciones de Activity + cierre lado-mod de la migración (limpieza + docs + evaluación)

# Selector de transiciones de Activity + cierre lado-mod de la migración (limpieza + docs + evaluación)

## Executive summary — lo que estas aprobando

> *Revisión rápida. El detalle vive en Requirements, Changes, Evaluación y Tasks.*

**Que se quiere**: completar el **lado-mod** de la migración UPONE-1381/P4 (que en el core hizo TICKET-103). Cuatro cosas: (1) **activar el selector de transiciones** de `status` en Activity reemplazando el badge read-only por `select` (cambio de config en 2 layouts JSON); (2) **limpiar los restos huérfanos** que dejó la retirada de las mutations de validación de estado (5 error codes sin uso); (3) **actualizar la documentación** del mod que quedó stale + corregir afirmaciones falsas de schema; (4) **evaluar** (sin ejecutar) el retiro del subsistema workflow relacional, con su plan e impacto, y derivar la ejecución destructiva a un ticket propio.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Selector: basta cambiar el layout (badge→select); sin código de write-path | La migración P4 ya movió Activity al motor de enum de core; el save va por `updateInstance` + `enforceEnumTransitions` |
| 2 | Cleanup acotado a los 5 error codes `ACTIVITY_*` huérfanos | Cero consumidores; riesgo nulo. NO se toca el subsistema workflow (aún gobernado por RULE-003) |
| 3 | Retiro del subsistema workflow: se EVALÚA aquí, se EJECUTA en ticket propio | El drop es core + cross-mod + destructivo (migración por tenant); excede mod-only |
| 4 | Offering fuera de alcance | No declara `transitions` (H3) |

**Riesgos principales y como los mitigamos**:

- **Precondición de codegen** (transitions en `core_FieldDefinition`): si no corrió, el guard es no-op silencioso → S1.T1 lo verifica antes de tocar layouts.
- **Afirmaciones falsas de schema** en código/docs ("columna dropeada") → REQ-05 las corrige al estado real (columnas aún presentes, drop diferido).
- **Overlap con el chip `task_070a8813`** (corriendo, no se pudo cerrar) → S2.T1 reconcilia su output antes de editar docs/RULE-004.
- **Remover un code aún usado** → REQ-04 se limita a los 5 verificados sin consumidores; deja intactos los `WORKFLOW_*`.

**Que NO se hace en este ticket**:

- Ejecutar el drop del subsistema workflow (objetos/tablas/columnas/RULE-003) — es destructivo + core + cross-mod → ticket propio (REQ-06 lo evalúa y deriva).
- Tocar `uengagement-up1/objects/Activity.json` (otro owner) — se documenta como prerequisito del drop.
- Implementar `requiresComment` (core D-S5-2 + UI) — gap conocido (L2).
- Agregar transiciones a Offering (H3).
- Remover el bonus `WORKFLOW_HAS_NO_INITIAL_STATUS`/`getInitialStatus.js` (dev acotó el cleanup a los 5 `ACTIVITY_*`).

**Tamano estimado**: 2 sessions (~4-6h). S1 (selector + smoke, T3 ⚑ fuerte) es la riesgosa (verificación runtime + precondición). S2 (cleanup + docs + eval, T1) es acotada.

**Como vas a saber que funciona**:

- Activity "Draft" en edit → selector con solo "Draft" + "InReview"; cambio a "InReview" + guardar → persiste sin error + evento.
- Activity en view → estado read-only sin badge custom.
- Curriculum en edit → selector igual que antes.
- `grep` de los 5 error codes → cero refs; suite del mod verde.
- Docs del mod → sin descripción de mutations retiradas como vigentes; afirmaciones de schema corregidas.
- Evaluación del workflow documentada + ticket de follow-up creado/recomendado.

---

## Purpose

Cerrar el lado-mod de la migración UPONE-1381/P4 en curriculum-design: activar el selector de transiciones de `status` de Activity (config de layout), limpiar los restos huérfanos de la retirada de las mutations validated, actualizar la documentación del mod stale, y evaluar (sin ejecutar) el retiro del subsistema workflow relacional. Lo ejecutable es mod + docs, no destructivo; el drop destructivo se deriva.

## Requirements

### REQ-IMPROVE-01: Selector de transiciones en Activity (modo edit)

> **Que cambia**: al editar una Activity, el estado deja de ser una etiqueta fija y pasa a un selector con solo los estados alcanzables desde el actual; al guardar se aplica respetando la máquina de estados.
> **Por que**: hoy el estado es read-only en la ficha; no hay forma de avanzar el workflow desde la UI aunque el backend ya lo soporta.

El sistema MUST renderizar `status` de Activity en edit como `select` de transiciones: valor actual + destinos alcanzables (`getValidTransitions`), ocultando destinos no declarados o bloqueados. En create (sin instanceId) MUST mostrar el enum completo. Si `getValidTransitions` falla, MUST caer al enum completo (fail-soft). Al guardar MUST persistir vía `updateInstance` y ser validado por `enforceEnumTransitions` (emite `onTransition`).

**Actor**: user · **Layers**: config, frontend (consume), backend (valida — sin cambios)

<details><summary>Scenarios de validacion</summary>

#### Scenario: alcanzables desde Draft
- **GIVEN** Activity `status: "Draft"` **WHEN** abre edit **THEN** selector muestra "Draft" + "InReview" **AND** no Approved/Active/Deprecated/Archived

#### Scenario: create enum completo
- **GIVEN** form create (sin instanceId) **WHEN** abre el select **THEN** 6 valores del enum

#### Scenario: guardar transición
- **GIVEN** Activity "Draft" edit **WHEN** elige "InReview" y guarda **THEN** updateInstance OK, status "InReview" en BD, evento onTransition

#### Scenario: fail-soft
- **GIVEN** getValidTransitions no responde **WHEN** abre edit **THEN** cae al enum completo sin romper el form

</details>

#### Acceptance
Abre Activity "Draft" en edit, ve solo "Draft" e "InReview"; cambia a "InReview", guarda, y al reabrir el estado es "InReview".

### REQ-IMPROVE-02: Consistencia del campo status en modo view

> **Que cambia**: en la vista read-only, el estado deja de usar el componente custom `activity-status-badge`.
> **Por que**: unificar el render del estado en el mecanismo estándar ahora que es enum.

El sistema MUST renderizar `status` de Activity en view sin `activity-status-badge`, read-only y coherente con los demás campos.

<details><summary>Scenarios</summary>

#### Scenario: view read-only
- **GIVEN** Activity "Active" **WHEN** abre view **THEN** estado read-only sin badge custom, render legible

</details>

#### Acceptance
Abre Activity en view y ve el estado read-only, sin la etiqueta de color custom.

### REQ-IMPROVE-03: RBAC — destinos por capability

> **Que cambia**: el selector oculta destinos sin permiso (ej. "Approved" requiere `activity:approve`).
> **Por que**: no ofrecer opciones que el backend rechazaría.

El sistema MUST mostrar solo destinos permitidos consumiendo `getValidTransitions` (`allowed` resuelto por `requiredCapabilities`). El write MUST re-validar en `enforceEnumTransitions` (sin cambios).

<details><summary>Scenarios</summary>

#### Scenario: destino bloqueado
- **GIVEN** Activity "InReview" y usuario sin `activity:approve` **WHEN** abre el selector **THEN** "Approved" no aparece

</details>

#### Acceptance
Con usuario sin `activity:approve`, una Activity "InReview" no ofrece "Approved".

### REQ-PRESERVE-01: Curriculum sigue funcionando (regression)

> **Que cambia**: nada en Curriculum — asegura que el cambio en Activity no lo rompe.
> **Por que**: comparten el mecanismo del motor de core.

El sistema MUST mantener el selector de `status` de Curriculum (destinos alcanzables + persistencia vía `updateCurriculumWithRecordType` → `updateInstance` → `enforceEnumTransitions`). **Offering: N/A** (no declara `transitions`).

<details><summary>Scenarios</summary>

#### Scenario: Curriculum sin regresión
- **GIVEN** Curriculum "Active" **WHEN** abre edit **THEN** destinos alcanzables como antes

</details>

#### Acceptance
Abre Curriculum en edit y su selector se comporta igual que antes.

### REQ-IMPROVE-04: Limpieza de error codes huérfanos

> **Que cambia**: se borran del diccionario de errores 5 códigos que ya nadie lanza (restos de las mutations de Activity retiradas).
> **Por que**: dead code que confunde y arrastra deuda de la migración.

El sistema MUST remover de `logic/errors.js` los 5 error codes `ACTIVITY_*` (`ACTIVITY_NOT_FOUND`, `ACTIVITY_NO_WORKFLOW`, `ACTIVITY_TRANSITION_INVALID`, `ACTIVITY_WORKFLOW_ARCHIVED`, `ACTIVITY_STATUS_READ_ONLY`). MUST NOT tocar `WORKFLOW_*`/`WORKFLOW_HISTORY_*` (en uso por RULE-003) ni `WORKFLOW_HAS_NO_INITIAL_STATUS`.

<details><summary>Scenarios</summary>

#### Scenario: cleanup verificado
- **GIVEN** errors.js editado **WHEN** grep de los 5 codes en el mod **THEN** cero matches (fuera de git history) **AND** suite del mod verde

</details>

#### Acceptance
`grep` de los 5 codes → cero referencias; tests del mod pasan.

### REQ-IMPROVE-05: Documentación del mod + KB al día

> **Que cambia**: los docs del mod dejan de describir mutations retiradas como vigentes; se corrigen afirmaciones falsas sobre el schema; RULE-004 se reconcilia.
> **Por que**: la migración dejó docs stale y hasta afirmaciones factualmente falsas ("columna dropeada" cuando sigue existiendo).

El sistema MUST actualizar `CLAUDE.md`, `.ai/PATTERNS.md`, `docs/patterns/validated-vs-crud.md`, `docs/architecture/server-side-integrity.md`, `docs/reference/mcp-object-contract.md`, `docs/architecture/workflow-platform-hu3.md` (matizar "retirado por completo"). MUST corregir las afirmaciones falsas de schema en `logic/activity.resolver.js:13` y `docs/reference/error-codes.md:34` (las columnas `workflowId`/`currentStatusId` SIGUEN en el Prisma; el drop está diferido). MUST reconciliar `RULE-curriculum-design-004` (KB deckard) con el estado real y con RULE-003, y con el output del chip `task_070a8813`.

<details><summary>Scenarios</summary>

#### Scenario: docs sin refs stale
- **GIVEN** docs editados **WHEN** grep de `transitionActivityValidated`/`updateActivityValidated`/`ACTIVITY_STATUS_READ_ONLY` como vigentes **THEN** cero (salvo notas explícitas de "retirado")

#### Scenario: afirmación de schema corregida
- **GIVEN** activity.resolver.js:13 y error-codes.md:34 **THEN** ya no afirman que las columnas fueron dropeadas; reflejan drop diferido

</details>

#### Acceptance
Ningún doc del mod describe las mutations retiradas como vigentes; las afirmaciones de schema reflejan el estado real; RULE-004 reconciliada.

### REQ-EVAL-06: Evaluación del retiro del subsistema workflow relacional

> **Que cambia**: se produce (no se ejecuta) el análisis de impacto + plan del drop del subsistema workflow, y se deriva a un ticket propio.
> **Por que**: el drop parece "limpieza" pero es destructivo + core + cross-mod; hay que dimensionarlo antes de comprometerlo.

El sistema MUST documentar la evaluación (ver sección "Evaluación" abajo) con: objetos/tablas/columnas/resolvers/rule afectados, consumidores actuales, root cause del bloqueo (JSON duplicado en uengagement-up1), plan destructivo por tenant, y la decisión de derivar la ejecución. MUST recomendar/crear el ticket de follow-up coordinado. MUST NOT ejecutar el drop.

#### Acceptance
La evaluación queda en el spec; se registra la decisión; existe (creado o recomendado) el ticket de follow-up.

## Changes

### Modified: layouts de Activity
| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `default_Activity_edit.json:41` `status.type` | `"activity-status-badge"` | `"select"` | Activa el selector (`RecordDetail.vue:3042` excluye tipos custom) |
| `default_Activity_view.json:91` `status.type` | `"activity-status-badge"` | `"select"` (read-only en view) | Consistencia; deja de depender del componente custom |

### Modified: código huérfano
| Archivo | Cambio |
|---------|--------|
| `logic/errors.js:30-34` | Remover 5 error codes `ACTIVITY_*` |
| `logic/activity.resolver.js:13` | Corregir comentario falso ("columna dropeada") |

### Modified: docs
`CLAUDE.md`, `.ai/PATTERNS.md`, `docs/patterns/validated-vs-crud.md`, `docs/architecture/server-side-integrity.md`, `docs/reference/mcp-object-contract.md`, `docs/architecture/workflow-platform-hu3.md`, `docs/reference/error-codes.md`, y KB `rule-curriculum-design-004.md`.

## Baseline (estado actual)

- Activity `status`: badge read-only en edit/view → no editable desde UI.
- Backend migrado (P4): `Activity.status` enum con `transitions`; `enforceEnumTransitions` cableado; mutations validated retiradas.
- Huérfanos: 5 error codes `ACTIVITY_*` sin consumidor; docs stale; afirmaciones falsas de schema; subsistema workflow sin escritor de negocio (pero vivo + gobernado por RULE-003).
- Curriculum: selector funcional (regression baseline).

## Evaluación: retiro del subsistema workflow relacional (REQ-EVAL-06)

**Alcance del drop**: objetos `workflow.json`/`workflowStatus.json`/`workflowTransition.json`/`workflowTransitionHistory.json` (base, solo en curriculum-design) → 4 tablas Prisma + `ext__uplanner__*` por tenant + FKs `Activity.workflowId`/`currentStatusId`; 3 resolvers `*Validated` + sus schemas GraphQL; 10 error codes `WORKFLOW_*`/`WORKFLOW_HISTORY_*`; test `tests/integration/workflow-resolvers.test.ts`; `RULE-curriculum-design-003` (quedaría sin objeto).

**Consumidores de negocio hoy**: ninguno. Activity/Curriculum/Offering migrados al enum de core; uEngagement no lo usa (cero refs en su lógica); `entityType` polimórfico sin consumidor real. Las 3 mutations `*Validated` están expuestas en GraphQL pero sin invocador de producto.

**Root cause del bloqueo (H6/L4)**: `uengagement-up1/objects/Activity.json:56-73` redeclara `workflowId`/`currentStatusId`; el merge append-only de object-manager (`fileSync.js:744-752`) los reintroduce en el objeto mergeado (`objects/business/Base/activity.json:150-167`, con las descripciones textuales de uengagement) → materializa columnas + FK en el Prisma de cada tenant. NO es dependencia de negocio; es un JSON duplicado stale (~18 líneas).

**Plan del drop (destructivo, por tenant)**:
1. (cross-mod, prerequisito) Limpiar `workflowId`/`currentStatusId` de `uengagement-up1/objects/Activity.json` (diff campo a campo contra `curriculum-design/objects/activity.json` para no perder fields propios de engagement). Owner: uengagement-up1.
2. (mod) Borrar los 4 objetos JSON + i18n + 3 resolvers + schemas + `getInitialStatus.js`; limpiar error codes `WORKFLOW_*`; retirar RULE-003.
3. (core) `sync` → `codegen` → `prisma migrate`: `DROP TABLE` x4 (+ `ext__*`) + `ALTER TABLE Activity DROP COLUMN workflowId, currentStatusId` (+ 2 FK), **por tenant** (UPU, UCENG, DEMO01..10, UCASMT, UCPLN, TEST, BASEMODEL, placeholder).
4. (docs) Actualizar workflow-platform-hu3.md, graphql-mutations.md, error-codes.md.

**Veredicto**: **fuera de la capacidad de 106** (mod-only, no destructivo). Es core + cross-mod + destructivo (irreversible sin restore, en 15+ tenants). El bajo riesgo real del root cause (18 líneas) NO cambia la clasificación. → Ticket propio coordinado (team core + owner uengagement-up1 + mandato sobre migraciones). Ver DEC-LOCAL-03.

## Tasks

### Session 1 — Precondición + selector + smoke runtime [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Verificar precondición: `activity.json.status.transitions` en `core_FieldDefinition` del tenant UPU (codegen aplicado); si falta, bloquear y correr codegen/sync canónico | REQ-IMPROVE-01 | researcher | — | (introspección GraphQL / query core_FieldDefinition) | TC-00 | (no aplica — lectura) | DET-1, DET-5, DET-11 | pending | 1 |
| S1.T2 | Cambiar `status.type` badge→select en `default_Activity_edit.json:41` y `default_Activity_view.json:91` | REQ-IMPROVE-01, REQ-IMPROVE-02 | developer | S1.T1 | mods/curriculum-design/config/layouts/default_Activity_edit.json, mods/curriculum-design/config/layouts/default_Activity_view.json | JSON válido + diff acotado | git revert | DET-8, DET-10 | pending | 1 |
| S1.T3 | Sembrar layouts a BD (`up1_layen_layout`) vía seed-object-manager-layouts | REQ-IMPROVE-01 | developer | S1.T2 | (seed mods/up1-manager/scripts/seed-object-manager-layouts.js) | Layout Activity refleja type=select en BD | Re-seed layout previo | DET-8, DET-16 | pending | 1 |
| S1.T4 | Smoke Activity por path real de UI: edit alcanzables (TC-01), create enum (TC-02), guardar transición + evento (TC-03), fail-soft (TC-04), view read-only (TC-05) | REQ-IMPROVE-01, REQ-IMPROVE-02 | reviewer | S1.T3 | (UI suite 3000, UPU) | TC-01..05 con evidencia runtime | (no aplica) | DET-4, DET-5, DET-13, DET-36 | pending | 1 |
| S1.T5 | Regression Curriculum (TC-06) + RBAC Activity (TC-07) | REQ-PRESERVE-01, REQ-IMPROVE-03 | reviewer | S1.T3 | (UI suite 3000, UPU) | TC-06 + TC-07 con evidencia runtime | (no aplica) | DET-5, DET-7, DET-13, DET-14 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T3)** — persistir en `## Sessions` con Template de Gate, validación T3 (smoke + regression), quality review (DET-23), decidir | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | ticket | Gate persistido + TCs con evidencia runtime | (no aplica) | DET-20, DET-23, DET-25, DET-36 | pending | 1 |

### Session 2 — Limpieza + docs + evaluación workflow [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Reconciliar output del chip `task_070a8813` (qué tocó de RULE-004 + docs) antes de editar, para no re-pisar | REQ-IMPROVE-05 | researcher | S1.GATE | (git status/diff mod + RULE-004) | Delta del chip identificado | (no aplica — lectura) | DET-11, DET-16 | pending | 2 |
| S2.T2 | Remover los 5 error codes `ACTIVITY_*` de `logic/errors.js:30-34`; grep confirma cero refs; suite del mod verde | REQ-IMPROVE-04 | developer | S2.T1 | mods/curriculum-design/logic/errors.js | TC-08 | git revert | DET-10, DET-16 | pending | 2 |
| S2.T3 | Actualizar docs stale del mod + corregir afirmaciones falsas de schema (`activity.resolver.js:13`, `error-codes.md:34`) + reconciliar RULE-004/RULE-003 | REQ-IMPROVE-05 | developer | S2.T1 | mods/curriculum-design/{CLAUDE.md, .ai/PATTERNS.md, docs/patterns/validated-vs-crud.md, docs/architecture/server-side-integrity.md, docs/reference/mcp-object-contract.md, docs/architecture/workflow-platform-hu3.md, docs/reference/error-codes.md, logic/activity.resolver.js}, deckard rule-curriculum-design-004.md | TC-09 | git revert | DET-4, DET-16 | pending | 2 |
| S2.T4 | Registrar la evaluación del subsistema workflow (ya en spec) + crear/recomendar ticket de follow-up coordinado (core + uengagement-up1) para el drop destructivo | REQ-EVAL-06 | reviewer | S2.T1 | (ticket follow-up + spec) | TC-10 | (no aplica) | DET-12, DET-16 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T1)** — persistir, validación T1 (suite del mod + grep), quality review, decidir | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | Gate persistido + TC-08/09/10 | (no aplica) | DET-20, DET-23 | pending | 2 |

> parallelization: S2.T2/S2.T3/S2.T4 dependen todas de S2.T1 y tocan archivos disjuntos (errors.js vs docs vs ticket follow-up), pero S2.T3 también edita `errors.js`-adjacentes (error-codes.md) y RULE-004 — para evitar contención de revisión y mantener el orden de reconciliación, se dejan secuenciales (default conservador). Ver decisión parallelization-assessment.

### Task contract

```
Task S1.T1: Verificar precondición codegen
- agent: researcher · validation: introspección getValidTransitions / query core_FieldDefinition · rollback: n/a · rules: [DET-1, DET-5, DET-11]

Task S1.T2: Cambiar type badge→select
- agent: developer · files: default_Activity_edit.json, default_Activity_view.json · validation: JSON válido + diff · rollback: git revert · rules: [DET-8, DET-10]

Task S1.T3: Sembrar layouts
- agent: developer · validation: layout en up1_layen_layout · rollback: re-seed previo · rules: [DET-8, DET-16]

Task S1.T4: Smoke Activity (UI real)
- agent: reviewer · validation: TC-01..05 evidencia runtime · rollback: n/a · rules: [DET-4, DET-5, DET-13, DET-36]

Task S1.T5: Regression Curriculum + RBAC
- agent: reviewer · validation: TC-06, TC-07 · rollback: n/a · rules: [DET-5, DET-7, DET-13, DET-14]

Task S2.T1: Reconciliar chip task_070a8813
- agent: researcher · validation: delta identificado · rollback: n/a · rules: [DET-11, DET-16]

Task S2.T2: Remover 5 error codes ACTIVITY_*
- agent: developer · files: logic/errors.js · validation: TC-08 (grep + suite) · rollback: git revert · rules: [DET-10, DET-16]

Task S2.T3: Docs del mod + afirmaciones de schema + RULE-004
- agent: developer · files: (ver tabla) · validation: TC-09 · rollback: git revert · rules: [DET-4, DET-16]

Task S2.T4: Evaluación workflow + follow-up ticket
- agent: reviewer · validation: TC-10 · rollback: n/a · rules: [DET-12, DET-16]
```

## Constraints

- RULE-curriculum-design-004: **stale post-migración** — REQ-05 la reconcilia (el estado de Activity va por `updateInstance` + `enforceEnumTransitions`).
- RULE-curriculum-design-003: **vigente** — gobierna el subsistema workflow relacional (4 objetos + 3 mutations `*Validated`), que 106 NO toca. Su retiro solo si el drop se ejecuta (ticket propio).
- DET-16 (propagación): la migración cambió el estado de Activity → propagar a docs + limpieza + evaluación del subsistema. DET-32 (necesidad/reuso): selector/motor/validación ya existen → reduce/reuse.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Motor de enum de core (AP-02/AP-03) | internal | enforceEnumTransitions + getValidTransitions + selector | Entregado; sin riesgo |
| Migración Activity a enum (UPONE-1381/P4, TICKET-103) | internal | Activity.status enum con transitions | Cerrado; requiere codegen aplicado (precond S1.T1) |
| Seed de layouts (up1-manager) | internal | seed-object-manager-layouts | Correr tras el cambio (S1.T3) |
| Chip `task_070a8813` (corriendo) | internal | Edita RULE-004 + docs del mod en paralelo | Overlap → S2.T1 reconcilia antes de editar |
| Owner de uengagement-up1 | external (otro mod) | Prerequisito del drop del workflow (limpiar Activity.json duplicado) | Solo relevante para el follow-up, no para 106 |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Codegen no aplicado → guard no-op | medium | Transiciones no gobernadas silenciosamente | S1.T1 verifica antes de tocar layouts |
| `select` en view peor que el badge | low | UX degradada en view | S1.T4/TC-05 smoke; ajustar si no convence (open question) |
| Regresión Curriculum | low | Deja de filtrar | S1.T5/TC-06 |
| Remover un code aún usado | low | Rompe un resolver | REQ-04 limitado a los 5 verificados; NO toca WORKFLOW_* |
| Doble edición con el chip task_070a8813 | medium | Conflicto de merge en docs/RULE-004 | S2.T1 reconcilia el output del chip primero |
| requiresComment sin enforcement se guarda sin comentario | medium | Gap de gobernanza | Documentado out-of-scope (L2, D-S5-2) |

## Open questions

- [ ] Modo view: ¿`select` read-only o display de texto? — se resuelve con TC-05; ajustar en execute si no convence (bajo impacto).

## Decisions

### DEC-LOCAL-01: Write-path sin cambios (veredicto A)
- **Opción elegida**: solo cambio de layout; el save va por `updateInstance` + `enforceEnumTransitions`. Las mutations validated ya no existen (UPONE-1381/P4).

### DEC-LOCAL-02: Necesidad/reuso (DET-32) — reduce/reuse
- **Opción elegida**: selector/motor/validación/RBAC se reusan de core; el REQ del selector se resuelve con config. Cleanup + docs son remoción/actualización, no construcción.

### DEC-LOCAL-03: Retiro del subsistema workflow — evaluar en 106, ejecutar aparte
- **Contexto**: el dev pidió evaluar el retiro del subsistema workflow (que quedó sin escritor de negocio).
- **Drivers**: el drop es destructivo (DROP TABLE/COLUMN en 15+ tenants) + core (object-manager migrate) + cross-mod (limpiar JSON de uengagement-up1, otro owner). El "bloqueo por uEngagement" resultó ser un JSON duplicado stale, no una dependencia de negocio.
- **Opción elegida**: 106 produce la evaluación completa + plan (sección Evaluación) y deriva la ejecución a un ticket propio coordinado.
- **Alternativas**: ejecutar el drop en 106 — descartada (rompe mod-only + no-destructivo; requiere coordinación cross-team).
- **Consecuencias**: 106 queda acotado y no destructivo; el drop queda dimensionado y trazado, no olvidado.
- **Session**: design (S0).

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Cambio de estado de Activity desde UI | Imposible (badge) | Posible respetando máquina de estados + RBAC | Smoke TC-01/03/07 |
| Deuda de la migración en el mod (dead code + docs stale) | 5 error codes huérfanos + 6 docs stale + 2 afirmaciones falsas | 0 | grep + review (TC-08/09) |

## Technical reference

- Selector: `RecordDetail.vue:3042` (condición tipo), `:3084-3103` (armado select), `:3552`/`:4068-4113` (submit updateInstance).
- Composable: `useEnumTransitions.ts` (`fetchValidTransitions` → `GET_VALID_TRANSITIONS:259`).
- Backend: `instance.resolver.js:136-212` (enforceEnumTransitions), `:4216-4228` (cableado).
- Objeto: `activity.json:134-150`. Override mod: `polymorphicUpdate.resolver.js:661-676`.
- Merge que reintroduce columnas: `fileSync.js:744-752`; objeto mergeado `objects/business/Base/activity.json:150-167`; Prisma `prisma/UPU/schema.prisma:701-704`.
- Duplicado stale: `uengagement-up1/objects/Activity.json:56-73`.

## Rules discovered

- (se llena durante ejecución)

## Bugs found

- (se llena durante ejecución)

## Acceptance checkpoints

- [x] **Funcional**: REQ-IMPROVE-01/02/03 pasan (smoke runtime UPU: TC-01/03/04/05/07 + negative TC-11)
- [x] **Tests**: TC-00..11 con evidencia (runtime real para los smoke); TC-02 N/A (create omite status)
- [x] **Cleanup**: 5 error codes removidos sin refs colgadas + suite verde 1186/1186 (TC-08)
- [x] **Docs**: mod sin refs a mutations retiradas + afirmaciones de schema corregidas + RULE-004 reconciliada (TC-09)
- [x] **Evaluación**: workflow evaluado (spec + DEC-LOCAL-03) + follow-up FU-1 recomendado (TC-10)
- [x] **Integration**: Curriculum sin regresión (TC-06)
- [x] **NFRs**: N/A
