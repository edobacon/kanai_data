---
id: SPEC-004-rename-activity-workflow
project: up1
type: doc
module: curriculum-design
status: in_progress
tags:
  - refactor
  - rename
  - workflow
  - activity
  - hu4
  - sprint-sp3
  - jira-upone-1100
---

# HU4 — Rename `academicActivity` → `activity` + integracion workflow

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Si solo lees el Executive summary y te basta para decidir, ese es el objetivo. El detalle vive en Requirements, Tasks abajo.*

**Que se quiere**: Renombrar el objeto `academicActivity` a `activity` en todo el monorepo UP1 (JSON definition, Prisma, GraphQL, capabilities, layouts, i18n) y reemplazar el campo enum `workflowState` por dos FKs (`workflowId` + `currentStatusId`) que conectan a los workflows configurables de HU3. Agregar campo opcional `purpose` (enum 4 valores) confirmado en Confluence v1.10. Migrar las 2 activities legacy de UPU sandbox al nuevo modelo apuntando a `BOR` + `activity-standard` (sandbox-fresh). Activar los 5 workflows del seed UPU (Draft → Active). Implementar mutations `transitionActivityValidated` (coordinador atomico) y `updateActivityValidated` (enforcement readonly de `currentStatusId`) por **expertise tecnica del dev** para cumplir el resultado real de UPONE-1100 (gobernanza funcional). Smoke runtime ejecuta 3 transiciones reales validando handler de error `WORKFLOW_HISTORY_COMMENT_REQUIRED`.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Combo **A + 2 + S-A** (coordinador en mod + enforcement runtime + activate via prisma.update) | Cumple gobernanza funcional, no nominal |
| 2 | `workflowId` + `currentStatusId` **non-nullable** | Activity sin workflow no tiene sentido |
| 3 | `purpose` como **enum Prisma + GraphQL** (4 valores fijos) | Confluence v1.10 validado, type safety |
| 4 | Smoke runtime de **3 transiciones** (incluye 1 con `requiresComment: true`) | Valida handlers WORKFLOW_*, no solo happy path |
| 5 | REQ-COORD-3 en HU4 (no diferir a HU2): evento BullMQ con `_previousData` | Sin esto HU2 AC2 queda parcial |
| 6 | Sandbox-fresh mapeo legacy → BOR | UPU es sandbox de validacion |
| 7 | **Directiva DEC-04-06**: post-HU4 sin rastros de `academicActivity` en codigo productivo | Coherencia conceptual. `grep -rn "academicActivity"` retorna 0 en codigo productivo |

**Riesgos principales**:

- **Q1 resuelta empiricamente en S9.T3**: el sync NO auto-borra layouts huerfanos. Para REQ-RENAME-4 mantener `name` originales en JSON, solo cambiar `objectName` → sin huerfanos
- **Q3 resuelta en S9.T4**: `transitionActivityValidated` rechaza con `ACTIVITY_NO_WORKFLOW` si workflow/status null (defensivo post-NON NULL)
- **Q4 UPONE-1100 AC6 incorrecto**: en UPU sin roles custom no bloquea. Reporte al PM en cierre + RULE-core-014 documenta
- **Codegen NO regenera CRUD generic en GraphQL para workflow objects** (verificado HU3 S9): `transitionActivityValidated` llama directo a `prisma.activity.update`

**Que NO se hace** (limites explicitos):

- **NO UI para disparar transitions** → gap registrado en Session 7. HU5 propuesta para SP4
- **NO refactor de FKs polimorficas `*.academicActivityId`** en otros objetos fuera de scope literal de UPONE-1100
- **NO migracion de tenants no-UPU** → Fase 2 post-SP3 con logica condicional por tenant

**Tamano estimado**: **7 sessions ejecutables (S9-S15)**, aproximadamente **15-20h efectivas / 7 SP** (matchea estimated del intake, +2 SP sobre published por expertise tecnica). Las sessions continuan la secuencia del intake (Session 0-8 del pre-execute, max=8, plan empieza en S9 — DET-20 numeracion continua).

**Como vas a saber que funciona**:

- `grep -rn "academicActivity\|AcademicActivity" up1/` retorna 0 matches post-rename (DEC-04-06)
- `npm run codegen && npm run sync` desde `up1/` sin errores
- Prisma Studio UPU: tabla `Activity` con 2 instancias con `workflowId` poblado + `currentStatusId` poblado (BOR)
- GraphQL: `transitionActivityValidated(activityId, transitionId, userId)` retorna `{ activity, history }`
- GraphQL: `updateActivityValidated(id, {currentStatusId})` retorna error `ACTIVITY_STATUS_READ_ONLY`
- 5 workflows en `lifecycle: Active` post-script activacion
- BullMQ: evento publicado post-transicion con payload `{ objectType: 'activity', operation: 'transition', _previousData, _transitionContext }`

---

## Purpose

Materializar la integracion entre el objeto operativo `activity` (renombrado desde `academicActivity`) y la capa transversal de workflow entregada en HU3 (TICKET-018). Es el blueprint del **Consumer integration pattern** para futuros consumers: (a) FKs `workflowId` + `currentStatusId` en el objeto operativo, (b) mutation custom `transition{Object}Validated` que coordina update + history atomicamente, (c) mutation custom `update{Object}Validated` con enforcement readonly del campo de estado, (d) evento BullMQ con `_previousData` para audit consumers (changeLog en HU2).

## Requirements

### REQ-RENAME-1: Rename JSON object definition + codegen propagado

> **Que cambia**: el objeto `academicActivity.json` pasa a `activity.json` (lowercase, coherente con `course`/`affiliation`). El codegen UP1 regenera Prisma schema + GraphQL types automaticamente.
> **Por que**: el rename del JSON es declarativo; codegen automatiza la propagacion (RULE-core-002). Sin esto, el codigo cross-monorepo no compila.

El sistema **MUST** renombrar `up1/mods/curriculum-design/objects/business/Base/academicActivity.json` a `activity.json`, actualizar `title: "activity"` interno, ejecutar `npm run codegen` y verificar que Prisma schema + GraphQL types regeneran sin errores.

**Source_ref**: H1 confirmada en intake (RULE-core-002). **Confidence**: confirmed.

<details><summary>Scenarios de validacion</summary>

#### Scenario 1: Codegen regenera Prisma sin errores
- **GIVEN** archivo renombrado con `title: "activity"`
- **WHEN** `npm run codegen` desde `up1/`
- **THEN** exit 0, `schema.prisma` contiene `model Activity` (no `model AcademicActivity`), query `activityList` + mutation `createActivity` existen

#### Scenario 2: Grep cross-monorepo sin matches legacy
- **GIVEN** rename + codegen + DEC-04-06 aplicada
- **WHEN** `grep -rn "academicActivity\|AcademicActivity" up1/ --include="*.json" --include="*.js" --include="*.vue" --include="*.ts" --include="*.graphql"`
- **THEN** retorna 0 matches en codigo productivo (excepcion: scripts seed de migracion que documentan la transicion)

</details>

### REQ-RENAME-2: Rename i18n keys y archivo de traducciones

> **Que cambia**: `es_CL@AcademicActivity.json` → `es_CL@Activity.json`. Keys i18n en BD actualizadas via sync.
> **Por que**: las keys viajan a BD via sync. Sin actualizacion, strings se renderizan con la key cruda.

El sistema **MUST** renombrar el archivo de lang, actualizar keys internas mencionando `academicActivity`/`AcademicActivity` al nuevo nombre, ejecutar `npm run sync`, verificar `up1_lang_*` en BD UPU.

**Source_ref**: Context del ticket. **Confidence**: confirmed.

### REQ-RENAME-3: Rename capabilities + reasignacion roles default

> **Que cambia**: `academicActivity:view|create|modify|delete|audit` → `activity:*`. Sin prefix `mod/` (RULE-mods-037).
> **Por que**: el wrapper `withObjectAuth` busca `<objectName>:<action>` literal en `core_RoleCapability`.

El sistema **MUST** actualizar `mods/curriculum-design/capabilities.json` con todas las capabilities object-level renombradas, ejecutar `npm run sync`, validar que: (a) nuevas capabilities existen en BD UPU, (b) asignaciones a roles default se preservan, (c) deuda Q4 documentada (RULE-core-014).

**Source_ref**: H2 + H3 confirmadas. **Confidence**: confirmed.

### REQ-RENAME-4: Rename `objectName` en JSON layouts (mantener `name`)

> **Que cambia**: layouts con `objectName: "AcademicActivity"` pasan a `"Activity"`. El `name` del layout se mantiene (`default_AcademicActivity_*`).
> **Por que**: Q1 resuelta empiricamente en S9.T3 — el sync hace UPSERT por `name`. Cambiar solo `objectName` actualiza in-place sin huerfanos. Si tambien renombrasemos `name`, las filas viejas quedarian huerfanas (sync no auto-borra).

El sistema **MUST** actualizar los 4 layouts JSON del mod (`default_AcademicActivity_create/edit/list/view.json`) cambiando solo `objectName: "AcademicActivity" → "Activity"`, manteniendo el `name` y `id` originales. Ejecutar `npm run sync` y verificar.

**Source_ref**: H6 resuelta en S9.T3 + Discovery L3. **Confidence**: confirmed.

### REQ-MODEL-1: Eliminar campo `workflowState` y enum legacy

> **Que cambia**: el campo `workflowState` (enum `WorkflowState` con 6 valores legacy) se elimina del JSON object definition. Codegen propaga eliminacion a Prisma + GraphQL + BD.
> **Por que**: el workflow ahora es configurable (HU3). Mantener el enum legacy crea dualidad de fuentes de verdad.

El sistema **MUST** eliminar del JSON object def de `activity.json` el campo `workflowState` y su enum, ejecutar codegen, y eliminar el i18n mapping del enum en `es_CL@Activity.json`.

**Source_ref**: Decision principal Jira UPONE-1100. **Confidence**: confirmed.

### REQ-MODEL-2: Agregar campos `workflowId`, `currentStatusId`, `purpose`

> **Que cambia**: 3 campos nuevos en `Activity`. Dos FKs non-nullable (`workflowId` → workflow, `currentStatusId` → workflowStatus) y un enum opcional `purpose` (4 valores).
> **Por que**: las FKs entregan gobernanza funcional. `purpose` agrupa por intencion sin mapear recordTypes (Confluence v1.10).

El sistema **MUST** agregar al JSON object def: `workflowId` (UUID, FK, NOT NULL post-migration), `currentStatusId` (UUID, FK, NOT NULL post-migration), y `purpose` (enum opcional `ActivityPurpose` con valores `Academic`/`Formative`/`Service`/`Extracurricular`, default null).

**Source_ref**: Confluence v1.10 + draft data-model.prisma + decisiones D1 + D2. **Confidence**: confirmed.

### REQ-COORD-1: Mutation `transitionActivityValidated` (coordinador atomico)

> **Que cambia**: nueva mutation custom en el mod que coordina atomicamente cambio de estado: validar transicion legal + update `activity.currentStatusId` + insert en `workflowTransitionHistory`.
> **Por que**: por expertise tecnica del dev. El ticket Jira excluye `transitionActivity` ("responsabilidad object-manager") pero el platform UP1 SP3 NO la entrega. Sin coordinador, las FKs son cosmeticas — gobernanza nominal.

El sistema **MUST** exponer `transitionActivityValidated(input: TransitionActivityValidatedInput!): TransitionActivityValidatedResult!`. Validaciones runtime: (1) `activity.workflowId === transition.workflowId`, (2) `activity.currentStatusId === transition.fromStatusId`, (3) `transition.workflow.lifecycle === 'Active'`, (4) `comment` no vacio si `transition.requiresComment === true`, (5) `userId` existe, (6) **DEC-04-07**: rechazar con `ACTIVITY_NO_WORKFLOW` si `workflowId === null` OR `currentStatusId === null`. Implementacion: transaccion Prisma update + create history. Codigos error consistentes con WORKFLOW_*.

**Source_ref**: Session 6 (re-framing) + decision combo A+2+S-A. **Confidence**: confirmed.

<details><summary>Scenarios de validacion</summary>

#### Scenario 1: Transicion legal exitosa
- **GIVEN** activity con `workflowId=X`, `currentStatusId=BOR`. Transition T1 valida
- **WHEN** `transitionActivityValidated({activityId, transitionId: T1, userId: U})`
- **THEN** retorna `{activity: {currentStatusId: EDIT}, history: {...}}`. BD persiste ambos atomicamente

#### Scenario 2: Self-transition rechazada
- **THEN** error `ACTIVITY_TRANSITION_INVALID` o `WORKFLOW_SELF_TRANSITION`

#### Scenario 3: Comment requerido faltante
- **THEN** error `WORKFLOW_HISTORY_COMMENT_REQUIRED`. Rollback transaccion

#### Scenario 4: Workflow archived
- **THEN** error `ACTIVITY_WORKFLOW_ARCHIVED`

#### Scenario 5: Activity sin workflow asignado (DEC-04-07)
- **GIVEN** activity con `workflowId: null` (caso edge teorico post-NON NULL)
- **THEN** error `ACTIVITY_NO_WORKFLOW` con mensaje guia

</details>

### REQ-COORD-2: Mutation `updateActivityValidated` (enforcement readonly de currentStatusId)

> **Que cambia**: wrapper de `updateActivity` (CRUD generic auto-generada) que rechaza cambios directos a `currentStatusId` con error `ACTIVITY_STATUS_READ_ONLY`.
> **Por que**: sin enforcement, un cliente puede bypasear `transitionActivityValidated` con `updateActivity(currentStatusId: <X>)` → rompe gobernanza + audit.

El sistema **MUST** exponer `updateActivityValidated(id: ID!, data: UpdateActivityValidatedInput!): Activity!`. El input `UpdateActivityValidatedInput` excluye el campo `currentStatusId` del type. Si el cliente envia `currentStatusId`, retorna error `ACTIVITY_STATUS_READ_ONLY` con mensaje "use transitionActivityValidated".

**Source_ref**: Decision combo 2 (Session 6). **Confidence**: confirmed.

### REQ-COORD-3: Evento BullMQ con `_previousData` (consumer HU2)

> **Que cambia**: `transitionActivityValidated` emite evento BullMQ post-commit con payload incluyendo `_previousData.currentStatusId` y `_transitionContext`. El worker de HU2 (TICKET-020) lo consume para registrar `action=StateTransition`.
> **Por que**: AC2 de UPONE-1098 requiere "action=StateTransition + link a workflowTransitionHistoryId". Sin disparador distintivo, el worker veria solo un Update generico.

El sistema **MUST** emitir, tras transaccion exitosa, evento en BullMQ con payload:

```json
{
  "objectType": "activity",
  "operation": "transition",
  "data": { ...activity },
  "_previousData": { "currentStatusId": "<oldStatusId>" },
  "_triggeredBy": { "userId", "email" },
  "_transitionContext": {
    "transitionId",
    "workflowTransitionHistoryId",
    "comment": "<comment|null>"
  }
}
```

Evento se publica SOLO si transaccion exitosa. RULE-core-013 documenta el patron general.

**Source_ref**: Decision D4 + AC2 de UPONE-1098 + RULE-core-013. **Confidence**: confirmed.

### REQ-MIGRATE-1: Script de migracion de instancias UPU (idempotente)

> **Que cambia**: las 2 activities legacy en UPU (`aa-uv-1124` y `TIR101`) migran a `workflowId = activity-standard` + `currentStatusId = BOR`. Script idempotente.
> **Por que**: sin migracion, el SET NOT NULL del codegen falla. Decision L13 sandbox-fresh permite ejercicio end-to-end en smoke.

El sistema **MUST** entregar `mods/curriculum-design/seed/_data-activity-migration.js` que: (a) ejecute solo si `tenantId === 'UPU'`, (b) busque activities con `workflowId IS NULL`, (c) asigne `workflowId` + `currentStatusId` via `prisma.activity.update`, (d) sea idempotente. Integrar en `seed.js` en orden: workflowObjects → activityMigration → Univalle → AIEP.

**Source_ref**: AC4 UPONE-1100 + Decision L13 + draft. **Confidence**: confirmed.

### REQ-ACTIVATE-1: Script de activacion de workflows (Draft → Active)

> **Que cambia**: los 5 workflows del seed UPU pasan a `lifecycle: Active` via `prisma.workflow.update()` directo.
> **Por que**: `transitionActivityValidated` valida `workflow.lifecycle === 'Active'`. Sin activar, transiciones runtime del smoke fallan. La CRUD generic `updateWorkflow` NO existe en GraphQL.

El sistema **MUST** entregar `seed/_data-workflow-activate.js` (o append a `_data-workflow-objects.js`) que: (a) ejecute solo si `tenantId === 'UPU'`, (b) busque workflows con `lifecycle: 'Draft'`, (c) los pase a `'Active'`, (d) sea idempotente.

**Source_ref**: Decision S-A + draft. **Confidence**: confirmed.

### REQ-SMOKE-1: Smoke runtime con 3 transiciones reales

> **Que cambia**: al cierre de HU4, se ejecutan 3-4 transiciones reales en UPU usando `transitionActivityValidated`.
> **Por que**: prueba end-to-end del coordinador atomico. Genera entries reales en `workflowTransitionHistory` que HU2 consumira.

Plan smoke (decision D3):
1. `aa-uv-1124` (UV, `activity-standard`): `BOR → EDIT` (sin comment)
2. `TIR101` (AIEP, re-asignar a `activity-fast`): `BOR → PUB` (sin comment)
3. `aa-uv-1124` continua: `EDIT → REV-DEC` (sin comment)
4. `aa-uv-1124` intenta `REV-DEC → EDIT` (`requiresComment: true`) — primero SIN comment (espera error `WORKFLOW_HISTORY_COMMENT_REQUIRED`), luego CON comment (success)

**Source_ref**: Decision D3 + Session 1 intake. **Confidence**: confirmed.

### REQ-DOC-1: Documentacion + RULE-curriculum-design-004 + PATTERNS.md

> **Que cambia**: nueva rule canonica + extension PATTERNS.md con las 2 nuevas mutations + actualizacion CLAUDE.md mod + SMOKE-UPU.md post-HU4.
> **Por que**: el patron de coordinador + enforcement es replicable. Documentarlo en `mods/curriculum-design/CLAUDE.md` (auto-load) garantiza que LLMs futuros lo respeten.

El sistema **MUST** entregar:

1. **RULE-curriculum-design-004** en `projects/up1/rules/curriculum-design/`: "Para cambiar `currentStatusId` de un `activity`, usar SIEMPRE `transitionActivityValidated`"
2. **`.ai/PATTERNS.md`** extendido con seccion "Mutations validated para activity"
3. **`CLAUDE.md` mod-level** con obligacion de las 2 nuevas mutations
4. **`seed/SMOKE-UPU.md`** actualizado con counts post-HU4 + queries renombradas

**Source_ref**: Decision combo 2 + replicar patron HU3. **Confidence**: confirmed.

## Coverage map

| REQ | Tasks que lo cubren | Test cases |
|-----|---------------------|-----------|
| REQ-RENAME-1 | S10.T1, S10.T2, S10.T3 | TC-RENAME-1, TC-RENAME-2 |
| REQ-RENAME-2 | S10.T4 | TC-RENAME-3 |
| REQ-RENAME-3 | S10.T5 | TC-RENAME-4, TC-RENAME-5 |
| REQ-RENAME-4 | S10.T6 + S9.T3 (smoke Q1) | TC-RENAME-6 |
| REQ-MODEL-1 | S11.T1, S11.T2 | TC-MODEL-1 |
| REQ-MODEL-2 | S11.T3, S11.T4 | TC-MODEL-2, TC-MODEL-3 |
| REQ-COORD-1 | S12.T1, S12.T2, S12.T3, S12.T4 | TC-COORD-1..5 |
| REQ-COORD-2 | S12.T5, S12.T6 | TC-COORD-6, TC-COORD-7, TC-COORD-8 |
| REQ-COORD-3 | S13.T1, S13.T2, S13.T3 | TC-COORD-9, TC-COORD-10 |
| REQ-MIGRATE-1 | S15.T1, S15.T2 | TC-MIGRATE-1, TC-MIGRATE-2 |
| REQ-ACTIVATE-1 | S15.T3 | TC-ACTIVATE-1 |
| REQ-SMOKE-1 | S16.T1, S16.T2 | TC-SMOKE-1 |
| REQ-DOC-1 | S16.T3, S16.T4, S16.T5, S16.T6 | TC-DOC-1 |

## Tasks

> **Numeracion** (DET-20): plan empieza en **S9** porque max(### Session N en ticket) = 8 (Session 0-8 del intake). Tasks: `S{N}.T{M}`. Gates: `S{N}.GATE`.

### Session 9 — Pre-execute setup + verificacion empirica de gaps [tipo: ⚑ fuerte] [tier: T1]

**Objetivo**: crear rama UPONE-1100, sync develop, verificar empirico Q1 y Q3 antes de tocar el modelo.

| # | Task | Source_ref | Rollback | Status | Session |
|---|------|-----------|----------|--------|---------|
| S9.T1 | Crear rama `UPONE-1100-{slug}` desde develop del mod | pre-execute baseline | `git branch -D` | done | 9 |
| S9.T2 | Smoke pre-rename: `npm run sync` + verificar counts UPU (9/5/21/5 + 2 activities legacy) | Verificacion baseline HU3 | n/a | done | 9 |
| S9.T3 | Verificacion empirica Q1 (layouts huerfanos) | Q1 abierta del intake | revertir cambios temp | done | 9 |
| S9.T4 | Decision Q3 (activity sin workflow al transitionar) | Q3 abierta del intake | decision documentada | done | 9 |
| **S9.GATE** | Gate sync Session 9 (tier T1). Quality review DET-23 light | DET-20 + DET-23 | n/a | done (continue→S10) | 9 |

### Session 10 — Rename JSON + codegen + verificacion cross-monorepo [tipo: auto] [tier: T2]

**Objetivo**: ejecutar el rename completo `academicActivity → activity` propagado via codegen + sync + grep cross-monorepo.

| # | Task | Source_ref | Rollback | Status | Session |
|---|------|-----------|----------|--------|---------|
| S10.T1 | Renombrar `objects/business/Base/academicActivity.json` → `activity.json` + actualizar `title: "activity"` | REQ-RENAME-1 + H1 | `git mv` inverso | done | 10 |
| S10.T2 | Ejecutar `npm run codegen`. Verificar exit 0 + Prisma regenerado | REQ-RENAME-1 Scenario 1 | git checkout schema.prisma | done | 10 |
| S10.T3 | Grep cross-monorepo `academicActivity\|AcademicActivity` + actualizar todo lo que reste | REQ-RENAME-1 Scenario 2 + DEC-04-06 | git revert por archivo | done | 10 |
| S10.T4 | Renombrar `lang/es_CL@AcademicActivity.json` → `es_CL@Activity.json` + actualizar keys + `npm run sync` | REQ-RENAME-2 | git mv inverso + sync | done | 10 |
| S10.T5 | Actualizar `capabilities.json` (`academicActivity:* → activity:*`) + sync + verificar BD | REQ-RENAME-3 + RULE-mods-037 | revertir + sync | done | 10 |
| S10.T6 | Actualizar JSON layouts (`objectName: "Activity"` mantener `name`) + sync | REQ-RENAME-4 + decision Q1 S9.T3 | revertir layouts + sync | done | 10 |
| **S10.GATE** | Gate sync Session 10 (tier T2). Quality review standard (dim 1,2,3,6,7,10). TC-RENAME-1..6 + TC-BASELINE-1 + TC-Q1-1 + TC-RENAME-REG-1 registrados retroactivos en ticket (DET-25 deuda saldada 2026-05-14) | DET-20 + DET-23 + DET-25 | n/a | done (continue→S11) | 10 |

### Session 11 — Modelo nuevo: workflowId + currentStatusId + purpose [tipo: auto] [tier: T2]

| # | Task | Source_ref | Rollback | Status | Session |
|---|------|-----------|----------|--------|---------|
| S11.T1 | Editar `activity.json`: eliminar `workflowState` + enum `WorkflowState` + i18n mapping (ampliado: layouts JSON + fixture + test ajustados para cumplir DEC-04-06) | REQ-MODEL-1 + DEC-04-06 | git revert | done | 11 |
| S11.T2 | Codegen + verificar Prisma sin enum legacy (ampliado: edicion manual de schemas + JSON destination por sync append-only + codegen no regenera) | REQ-MODEL-1 Scenario + L10 + L11 | git checkout schemas | done | 11 |
| S11.T3 | Agregar campos `workflowId` (FK, nullable hasta S14), `currentStatusId` (FK, nullable hasta S14, readOnly), `purpose` (enum opcional ActivityPurpose) + i18n purpose | REQ-MODEL-2 + D1 + D2 + Confluence v1.10 | git revert | done | 11 |
| S11.T4 | Codegen + verificar Prisma con 3 campos nuevos + enum ActivityPurpose | REQ-MODEL-2 Scenario | codegen reverso | done | 11 |
| **S11.GATE** | Gate sync Session 11 (tier T2). Quality review standard pass (1 warn por L10+L11 deuda platform). BD UPU sincronizada via prisma db push (consent dev). 3 commits DET-27 (mod feat 5be0025, object-manager chore ed58cbb, dkc chore 918346a). SET NOT NULL diferido a S14 | DET-20 + DET-23 + DET-25 + DET-27 | n/a | done (continue→S12) | 11 |

### Session 12 — Mutations validated + tests integration [tipo: ⚑ fuerte] [tier: T3]

| # | Task | Source_ref | Rollback | Status | Session |
|---|------|-----------|----------|--------|---------|
| S12.T1 | Crear `mods/curriculum-design/logic/activity.resolver.js` + schema GraphQL: `transitionActivityValidated` input/output types | REQ-COORD-1 + patron HU3 | git revert | done | 12 |
| S12.T2 | Implementar logica `transitionActivityValidated`: validaciones (1)-(6) DEC-04-07 + transaccion Prisma | REQ-COORD-1 | git revert | done | 12 |
| S12.T3 | Tests integration `transitionActivityValidated`: happy path + 5 error scenarios (TC-COORD-1..7) | REQ-COORD-1 Scenarios | n/a | done | 12 |
| S12.T4 | Codigos error consistentes: ACTIVITY_TRANSITION_INVALID, ACTIVITY_WORKFLOW_ARCHIVED, ACTIVITY_NOT_FOUND, WORKFLOW_HISTORY_COMMENT_REQUIRED, WORKFLOW_HISTORY_INVALID_USER, ACTIVITY_NO_WORKFLOW, ACTIVITY_STATUS_READ_ONLY | REQ-COORD-1 + DEC-04-07 | revisar codigos | done | 12 |
| S12.T5 | Agregar `updateActivityValidated` al resolver + schema. Rechaza `currentStatusId` en input | REQ-COORD-2 + decision combo 2 | git revert | done | 12 |
| S12.T6 | Tests integration `updateActivityValidated`: success campos non-currentStatusId + rechazo + permite update de workflowId (TC-COORD-8..10 + 2 casos borde) | REQ-COORD-2 Scenarios | n/a | done | 12 |
| **S12.GATE** | Gate sync Session 12 (tier T3). Quality review exhaustive pass (8 pass, 2 n/a). 18 tests integration nuevos + 487 previos = 505/505. Commits DET-27 | DET-20 + DET-23 + DET-25 + DET-27 | n/a | done (continue→S13) | 12 |

### Session 13 — Evento BullMQ (REQ-COORD-3) [tipo: auto] [tier: T2]

| # | Task | Source_ref | Rollback | Status | Session |
|---|------|-----------|----------|--------|---------|
| S13.T1 | Definir contrato evento en `events/activity-transition.json` con trigger `activity.transition` | REQ-COORD-3 + RULE-core-013 | git rm | done | 13 |
| S13.T2 | Agregar al resolver emit BullMQ post-commit con payload completo (data + _previousData + _triggeredBy + _transitionContext empaquetados en data) + dependency injection via `context.publishTransitionEvent` | REQ-COORD-3 payload | git revert resolver | done | 13 |
| S13.T3 | Tests integration: 5 cases — emite post-commit con payload completo + NO emite si validacion falla + no-rompe si publisher ausente + no-fatal si publisher lanza + fallback userId | REQ-COORD-3 Scenarios | n/a | done | 13 |
| **S13.GATE** | Gate sync Session 13 (tier T2). TC-COORD-EVENT-1..5 registrados. 510/510 tests. Decision continue→S14 | DET-20 + DET-23 + DET-25 + DET-27 | n/a | done (continue→S14) | 13 |

### Session 14 — Analisis platform deps + diseño alternativa pure-mod [tipo: ⚑ fuerte] [tier: T0]

**Objetivo (no produce codigo)**: documentar los 3 cambios indebidos al `object-manager` hechos durante S11+S12+S13 (rama develop, violacion feedback_up1_mod_scope), entender por que cada uno fue necesario, y diseñar como hacer que HU4 funcione runtime SIN modificar el core (manteniendo el contrato `mods/<mod>/` only). Output: spec adjunto + items concretos para coordinar con platform team UP1 + plan de remediation en codigo si aplica.

| # | Task | Source_ref | Rollback | Status | Session |
|---|------|-----------|----------|--------|---------|
| S14.T1 | Analizar los 3 commits indebidos (S11 schemas/JSON destination + cleanup, S12 typedefs auto-sync, S13 server inject publishTransitionEvent). Para cada uno: que cambio, por que era necesario, que rompe sin el cambio, alternativas pure-mod | feedback_up1_mod_scope + remediation branch `UPONE-1100-hu4-platform-deps` | n/a (doc-only) | done | 14 |
| S14.T2 | Diseñar alternativa para drop de fields del modelo (S11 issue): opcion A reportar bug platform (sync append-only + codegen no regenera) + workaround LOCAL sin commit. Opcion B usar `extension` ext__ del mod para overrides destructivos. Documentar pros/contras | L10 + L11 + REQ-MODEL-1 | n/a | done | 14 |
| S14.T3 | Diseñar alternativa para inject de publisher (S13 issue): el resolver del mod ya tiene fallback gracioso (warn + skip). Para emit runtime real, alternativas: (A) coordinar con platform que agreguen `publishTransitionEvent: enqueueEvent` en context (cambio de 1 linea en `src/index.js`). (B) que el mod publique directo a Redis via patron documentado. (C) outbox pattern desde el mod si platform no responde | REQ-COORD-3 + L13 (raw) | n/a | done | 14 |
| S14.T4 | Documentar items a coordinar con platform team UP1: PD-1 sync append-only, PD-2 codegen no-regen, PD-3 publishTransitionEvent inject, PD-4 coordinar branch `UPONE-1100-hu4-platform-deps`. Reportados al cierre del ticket | L10 + L11 + L13 + Q5 ticket-019 | n/a | done | 14 |
| S14.T5 | Update CLAUDE.md mod-level con seccion "Limitaciones platform UP1 conocidas (HU4)" + 4 sub-secciones (PD-1..PD-4) con workarounds | feedback_up1_mod_scope reforzado + L13 | git revert | done | 14 |
| **S14.GATE** | Gate sync Session 14 (tier T0 doc-only). Quality review light pass (dim 6 + 7). Decision: continue → S15 (backlog `must` Q5 PD-1..PD-4 bloquea cierre del ticket sin tracker comment + coordinacion platform team) | DET-20 + DET-23 + DET-27 | n/a | done (continue→S15) | 14 |

### Session 15 — Scripts seed: migracion + activate workflows [tipo: auto] [tier: T2]

| # | Task | Source_ref | Rollback | Status | Session |
|---|------|-----------|----------|--------|---------|
| S15.T1 | Actualizar `seed/_data-univalle.js` y `_data-aiep.js`: agregar `purpose: null` + `workflowId` + `currentStatusId=BOR` (solo en create; update OMITE currentStatusId). Helper `resolveDefaultActivityWorkflow` exportado desde `_data-workflow-objects.js` | REQ-MIGRATE-1 + Session 8 deltas | git revert | done | 15 |
| S15.T2 | Crear `seed/_data-activity-migration.js` idempotente. Caso primario: 2 activities legacy UPU pre-HU4. Caso secundario defensivo | REQ-MIGRATE-1 + L13 | git rm | done | 15 |
| S15.T3 | Crear `seed/_data-workflow-activate.js` idempotente + integrar en seed.js. Excepcion documentada al patron `*Validated` (no existe `updateWorkflowValidated`) | REQ-ACTIVATE-1 + S-A | git rm + revertir | done | 15 |
| S15.T4 | Smoke local OK. Baseline: 2/0/5/0. Corrida 1: 2/2/0/5 (5 Active, 2 migrated). Corrida 2: idem (idempotencia funcional). Scripts ad-hoc `/tmp/smoke-s15-*.mjs` | REQ-MIGRATE-1 + REQ-ACTIVATE-1 | seed reset | done | 15 |
| **S15.GATE** | Gate sync Session 15 (tier T2). Quality review standard pass (1 warn: testing unitario diferido a S16.T6). Decision: continue → S16. Learn nuevo L15: HU3 upsertWorkflows revierte lifecycle Draft cada corrida — backlog post-HU4 | DET-20 + DET-23 + DET-25 | n/a | done (continue→S16) | 15 |

### Session 16 — Smoke runtime + documentacion + cierre [tipo: ⚑ fuerte] [tier: T3]

| # | Task | Source_ref | Rollback | Status | Session |
|---|------|-----------|----------|--------|---------|
| S16.T1 | Smoke transicion 1: `111026C` (UV, era `aa-uv-1124` pre-seed reset) `BOR → EDIT` via `transitionActivityValidated` con `activity-standard`. Evidence: history `cmp7cn6vn0001xxa09e4awhgr` insertada atomicamente | REQ-SMOKE-1 | n/a | done | 16 |
| S16.T2 | Smoke transiciones 2-5 PASS: (a) `TIR101` reasignado a `activity-fast` via `updateActivityValidated` (sin tocar `currentStatusId`); (b) `TIR101` BOR → PUB via `Publicar directo`; (c) `111026C` EDIT → REV-DEC; (d) REV-DEC → EDIT sin comment → error `WORKFLOW_HISTORY_COMMENT_REQUIRED` (rollback); (e) REV-DEC → EDIT con comment → success (history `cmp7cnu740007xxa0bu5dlg2d` con comment). Bonus: `updateActivityValidated` con `currentStatusId` rechazado en GraphQL validation ("Field currentStatusId is not defined by UpdateActivityValidatedInput") — defensa schema-level. REQ-COORD-3: 4 warns "publishTransitionEvent missing" esperados (PD-3 platform) | REQ-SMOKE-1 + D3 | n/a | done | 16 |
| S16.T3 | Crear `projects/up1/rules/curriculum-design/RULE-curriculum-design-004.md` | REQ-DOC-1 item 1 | git rm | done | 16 |
| S16.T4 | Extender `mods/curriculum-design/.ai/PATTERNS.md` con seccion "Mutations validated para activity" | REQ-DOC-1 item 2 | git revert | done | 16 |
| S16.T5 | Actualizar `mods/curriculum-design/CLAUDE.md` + `seed/SMOKE-UPU.md` con counts post-HU4 + queries renombradas | REQ-DOC-1 items 3-4 | git revert | done | 16 |
| S16.T6 | Pre-cierre: completar Test cases table (DET-25) + preparar tracker comment para UPONE-1100 (reportar AC6 incorrecto Q4 + items platform-deps Q5) | REQ-DOC-1 + Q4 + S14.T4 output | n/a | done | 16 |
| **S16.GATE** | Gate sync final Session 16 (tier T3) PASS. Quality review exhaustive (7 dims pass + 3 n/a). 25 TCs con evidence (DET-25). Decision: **continue → request-close** | DET-20 + DET-23 + DET-25 | n/a | done | 16 |

## Acceptance checkpoints

Al cierre del spec:
- [ ] **Funcional**: 12 REQs cumplidos (coverage map verificado)
- [ ] **Tests**: 15+ test cases con evidence (DET-25)
- [ ] **Regression**: smoke pre-rename (S9.T2) vs post-rename (S15.T4) sin regresiones
- [ ] **Rules**: RULE-curriculum-design-004 creada. PATTERNS.md + CLAUDE.md mod actualizado
- [ ] **Docs**: SMOKE-UPU.md actualizado. CLAUDE.md mod con seccion "Limitaciones platform UP1" (S14.T5)
- [ ] **DEC-04-06 cumplida**: `grep -rn "academicActivity\|AcademicActivity"` retorna 0 en codigo productivo
- [ ] **Backlog**: items Q4, Q5 (PD-3 platform dep — solo 1 deuda real), BL-1..5 clasificados. Q5 documentado en tracker comment
- [ ] **Platform deps**: PD-3 reportado al platform team con patch sugerido 1 linea (reference reflog commit `9606072` para detalle)
- [ ] **Spec status**: `done`
- [ ] **Ticket status**: `closed` + tracker comment publicado

## Decisions taken (formales del spec)

| # | Decision | Driver | Alternativas descartadas |
|---|----------|--------|--------------------------|
| DEC-04-01 | Combo A+2+S-A: coordinador en mod + enforcement runtime + activate via prisma.update | Cumplir resultado real UPONE-1100 + scope SP3 | B (object-manager core) y C (frontend coordina) |
| DEC-04-02 | `workflowId` + `currentStatusId` non-nullable | Activity sin workflow = gobernanza rota | Nullable mas permisivo |
| DEC-04-03 | `purpose` como enum Prisma + GraphQL (4 valores) | Confluence v1.10 verificado + type safety | String libre |
| DEC-04-04 | Smoke runtime con 3-4 transiciones (incluye requiresComment) | Validar error code, no solo happy path | Solo 2 transiciones |
| DEC-04-05 | REQ-COORD-3 evento BullMQ en HU4 (no diferir a HU2) | AC2 HU2 depende del disparador | Integration point en HU2 |
| DEC-04-06 | **Directiva transversal**: sin rastros de `academicActivity` en codigo productivo post-HU4 | Coherencia conceptual del rename — no nominal | Mantener nombres legacy en algunos lugares |
| DEC-04-07 | Q3: `transitionActivityValidated` rechaza con `ACTIVITY_NO_WORKFLOW` si workflow/status null | Defensivo + alineado con DEC-04-06 | B (auto-asignar isDefault) viola DEC-04-06 |

## Backlog

| # | Item | REQ | Prioridad | Como retomar |
|---|------|-----|-----------|--------------|
| BL-1 | UPONE-1100 AC6 incorrecto reportado al PM | Q4 | should | Tracker comment al cierre |
| BL-2 | UI cambio de estado de activity (HU5 propuesta SP4) | gap Session 7 | should | Crear ticket HU5 si PM confirma |
| BL-3 | `transition{Object}Validated` para curriculumPlan/competencyNode/changeRequest | replica patron | could | Cuando los consumers tengan instancias reales |
| BL-4 | Cleanup demos huerfanos de HU3 (5 entries `demo-*-001`) | defer SP4 | could | Cleanup script SP4 |
| BL-5 | Migrar `updateActivityValidated` a flag declarativo `readOnly: true` cuando platform lo habilite | deuda Fase 2 | could | Si platform habilita enforcement runtime field-level |
| ~~PD-1~~ | ~~Bug platform: sync APPEND-ONLY~~ — **INVALIDADO post-experimento S14**. El sync recrea destinations desde el mod source si el archivo no existe. Flow operativo: `rm destination` antes de sync para drops puntuales. NO es bug platform | L10 → L14 | n/a | Removido del backlog |
| ~~PD-2~~ | ~~Bug platform: codegen no regenera schemas~~ — **INVALIDADO post-experimento S14**. Codegen lee del JSON destination y genera schema desde scratch (`generateBaseModel`, `updateBaseModelSchema`). La "soft-delete" era un sync inverso JSON→BD registry, no afecta el schema. NO es bug | L11 → L14 | n/a | Removido del backlog |
| **PD-3** | **Feature request platform**: inyectar `publishTransitionEvent` (o `publish/events` generalizado) en context Apollo. El resolver del mod no puede importar `enqueueEvent` directo (no es workspace dependency). Patch sugerido 1 linea en `object-manager/src/index.js` linea ~395 (return del context): `publishTransitionEvent: enqueueEvent` + import `from './events/queues/enqueue.js'`. Reflog del object-manager preserva commit `9606072` (S13) como referencia | REQ-COORD-3 + L13 | **must** | Tracker comment a UPONE-1100 al cierre con: (a) repro del fallback gracioso del mod, (b) patch sugerido 1 linea, (c) reference al commit en reflog. Sin esto, emit real no funciona en runtime — fallback warn+skip cubre contrato del coordinador pero changeLog HU2 nunca recibe action=StateTransition real |
| ~~PD-4~~ | ~~Coordinar branch `UPONE-1100-hu4-platform-deps`~~ — **OBSOLETO post-experimento**. Branch eliminada (3 commits eran innecesarios). En su lugar, PD-3 lleva el patch sugerido inline | S14 re-analisis | n/a | Removido — no hay branch que coordinar |
