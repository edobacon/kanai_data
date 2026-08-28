---
id: TICKET-089
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1352
module: curriculum-design
autopilot: autonomous
---

# Malla — Validación restrictiva de requisitos en planes publicados

> **MC-09** · Épica Jira [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) (track interno "D") · Tier 🅲 Could *(candidato a Must — compromiso explícito de la reunión que protege integridad de datos)* · 3 SP · repo `mod` (BE+FE) · Fase F4.
> **Pre-spec (fuente de design):** [`sp5/prespecs/MC-09.md`](../../../../uplanner/specs/up1/sp5/prespecs/MC-09.md) — transcrito abajo. El SPEC formal DKC se crea al tomar el ticket (design-feature), transcribiendo REQ/tasks 1:1.

## ⛔ Gate de inicio — dependencias

> **1 dev, ejecución en serie.** Antes de iniciar design / `request-execute`, verificar que cada bloqueante esté `status: closed` (frontmatter `depends_on` + relaciones `depends_on` en HC; `dkc_read_frontmatter`). Si alguna NO está `closed`: **NO iniciar este ticket** — bloquear y avisar al dev (DET-30 guarda de inicio).

| Bloqueante | Aporta | Debe estar |
|---|---|---|
| [TICKET-082](TICKET-082.md) (MC-02) | planEntry (detectar planes publicados) | closed ✅ |
| [TICKET-083](TICKET-083.md) (MC-03) | requirement owner=activity (lo que valida) | closed ✅ |
| [TICKET-085](TICKET-085.md) (MC-05) | gate `canEdit` + vista de malla (para REQ-04) | closed ✅ |

> **Reconciliación 2026-07-01 (super autopilot):** el pre-spec MC-09 (fuente de design) agregó **REQ-04** (alerta "malla no editable", 🆂 Should) posterior al scaffolding del ticket (06-25). Alcance aprobado por el dev = pre-spec completo (4 REQ). Se agregó la dependencia MC-05 (closed) que exige REQ-04.

## Request

Como sistema, quiero impedir editar requisitos de una asignatura que ya está en planes publicados, para no invalidar mallas existentes (obligando a versionar el programa).

= D2 (handoff). BE: al mutar requirement(owner=activity), verificar si la Activity está en planEntry de un Curriculum(Plan) con status=Active → rechazar (restrictivo) con mensaje que sugiere versionar; si solo está en planes Draft (o no asignada), la edición funciona normal. FE: modal de alerta de impacto que sugiere crear nueva versión del programa. En SP5 no hay editor de requisitos (UI es S7-01), así que la regla actúa a nivel de mutación (API/MCP/seed). Análisis de impacto colateral obligatorio. Mod-only. Estado "publicado" = Curriculum.status=Active.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | regla de negocio (BE: guard en mutación de requirement) + UI (modal de alerta de impacto) |
| Modulo principal | curriculum-design |
| Modulos afectados | curriculum-design (mod-only); lee planEntry + Curriculum.status |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | sí | modal de alerta de impacto (REQ-02) — pequeño; en SP5 no hay editor de requisitos (UI completa = S7-01) |
| Data model | no | solo lectura de planEntry/Curriculum.status; sin objeto nuevo |

## Triage

REQs **confirmados**. Regla restrictiva en el resolver de mutación de `requirement(owner=activity)`. **Matiz de alcance:** en SP5 no hay editor de requisitos (la UI es S7-01) → la regla actúa a nivel de **mutación** (API/MCP/seed), no desde una pantalla.

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | "Publicado" = `Curriculum.status = Active`; bloquear mutación basta para proteger mallas | ✓ confirmada | audit C-2; reunión 00:48:06–00:51:07 |

### Context found

**KB del módulo (kb_refs: DEC-034, BUG-curriculum-design-002):**
- mod-only; lee `planEntry` + `Curriculum.status`. "Mejor restrictivo antes que permitir el error" (reunión 00:51:07).

**Necesidad/reuso (DET-32):** regla en el resolver de mutación de `requirement(owner=activity)` = build; reusa la lectura de `planEntry`/`Curriculum.status`.

**Matiz de alcance:** en SP5 **no hay editor de requisitos** (la UI es S7-01); la regla actúa a nivel de **mutación (API/MCP/seed)**, no desde una pantalla. La UI de edición + su modal de impacto completos llegan en SP6. Estado "publicado" = `Curriculum.status = Active` (audit C-2).

## Pre-spec (transcrito de MC-09.md)

### Requisitos (REQ)

| REQ | Certeza | source_ref | Enunciado |
|-----|---------|-----------|-----------|
| REQ-01 · bloqueo restrictivo en planes publicados | confirmed | reunión 00:48:06–00:51:07 | ver escenario; Active bloquea / Draft permite. |
| REQ-02 · mensaje accionable de rechazo | confirmed | reunión 00:46:27/00:49:38 | el rechazo BE entrega mensaje accionable que sugiere versionar. El modal FE completo se difiere a SP6 (no hay editor de requisitos en SP5). |
| REQ-03 · análisis de impacto colateral (obligatorio) | confirmed | regla global (impacto colateral) | identificar qué resolvers de requirement y de Activity se tocan; confirmar que NO rompe creación en Draft ni otros flujos. |
| REQ-04 · alerta "malla no editable" en la vista de malla (🆂 Should) | confirmed | feedback dev TICKET-086 (2026-07-01) + AC Jira "FE: modal de alerta de impacto" | alerta informativa (no bloqueante) cuando el plan no es editable; `EDITABLE_STATUSES` + labels a **fuente única** consumida por `canEdit` (hoy hardcodea `status==='Draft'`) y por el texto de la alerta. **El texto también informa que los requisitos de planes publicados no se editan y hay que versionar** (cubre el AC FE del Jira en SP5; modal on-edit → SP6, DEC-LOCAL-04). Único deliverable FE de SP5 → justifica `creates_visual: true`. |

<details><summary>Escenario (REQ-01)</summary>

```gherkin
GIVEN una Activity referenciada por planEntry de un Curriculum(Plan) con status=Active
WHEN se intenta crear/editar sus requirement(owner=activity)
THEN se rechaza (restrictivo) con mensaje accionable que sugiere versionar el programa
GIVEN la Activity solo está en planes status=Draft (o no asignada)
THEN la creación/edición de requisitos funciona normal
```
</details>

<details><summary>Escenario (REQ-04)</summary>

```gherkin
GIVEN un Plan con status NO editable (hoy Active/publicado)
THEN la vista de malla muestra una alerta: "El plan está {statusLabel}. Solo se pueden editar mallas de planes en {editableStatusLabels}." (labels dinámicos desde la config)
AND no se muestran las acciones de alta/edición (gate canEdit ya vigente)
GIVEN un Plan con status editable (hoy Draft)
THEN no se muestra la alerta y las acciones están disponibles
GIVEN se cambia la config de estados editables (p.ej. agregar 'Review')
THEN el gate canEdit y el texto de la alerta reflejan el cambio (mismo origen, sin editar dos lugares)
```
</details>

### Tasks previstas (con rollback)

| # | Task | Rollback |
|---|------|----------|
| T1 | BE: helper `requirementActivityGuard.js` + wiring en `sectionValidation.resolver.js` (create) y `polymorphicUpdate.resolver.js` (update): verificar `planEntry` con `Curriculum.status=Active` → rechazar (REQ-01, REQ-02 mensaje) | feature-gate (desactivar regla) |
| T2 | análisis de impacto colateral documentado (REQ-03) | — |
| T3 | FE: extraer `EDITABLE_STATUSES` (+ labels i18n) a fuente única consumida por `canEdit` y por el mensaje; alerta "malla no editable" en la vista de malla (REQ-04) | quitar alerta + volver a inline `status==='Draft'` en `canEdit` |

### Dependencias

- **Depende de:** MC-02 (planEntry) + MC-03 (requirement) + **MC-05 (gate `canEdit` + vista de malla, para REQ-04)**. Todas closed.
- **Nota de tier:** clasificado Could, pero **recomendado subir a Must** (compromiso explícito de la reunión que protege integridad de datos). El **editor** de requisitos (UI) es S7-01 (SP6).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1267-sp5` en `mods/curriculum-design` (creada desde `develop`; mod-only; nunca `develop`/`main`) — RULE-dev-004 |
| Base branch | `develop` |
| DB state | UPU con MC-02/03 + planes Active y Draft de prueba |
| Services | object-manager (resolver de mutación), suite (modal) |
| Test data | Activity en plan Active, Activity en plan Draft, Activity sin planes |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | `Curriculum` no tiene workflow ("no workflow formal en v1") y el core NO expone `metadata` de objeto al FE (`core_ObjectDefinition` es allowlist cerrado; sin query de metadata). El BE sí puede leer `metadata.*` del JSON vía helpers exportados. | dev (validación) + audit | S2 | promoted | RULE-core-028 |
| L2 | BE (`logic/`→object-manager) y FE (`modsComponents/`→suite) son deploys separados vía sync: NO pueden compartir un `import` de constantes en runtime. "Fuente única" cross-capa exige codegen o metadata expuesta por core. | audit | S2 | promoted | RULE-core-028 |
| L3 | "editable" (`['Draft']`, gate de malla) y "publicado" (`['Active']`, guard de requisitos) son **políticas distintas** con subsets distintos del enum — no una lista duplicada. `Archived` no es editable ni bloquea. | audit | S2 | discarded | DEC-LOCAL-05 (ya capturado en el spec) |

## Backlog

| # | Item | Priority | Estado |
|---|------|----------|--------|
| B-1 | **Follow-up de core (local, no Jira):** exponer `metadata` de objeto al FE (campo `metadata: JSON` en el tipo GraphQL `core_ObjectDefinition` o query `describeObject`) para poder derivar `editableStatuses`/`publishedStatuses` de `Curriculum.json metadata.lifecycle` en ambas capas (fuente única real config-driven). Hoy bloqueado por allowlist cerrado del core. | could | open |
| B-2 | **SP6 (S7-01):** editor de requisitos por UI + modal de alerta de impacto on-edit completo (REQ-02 FE) — difiere de SP5 por falta de host. | should | deferred → SP6 |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Plan de sessions

| Session | Objetivo | REQ / Tasks | Tier | Tipo gate |
|---------|----------|-------------|------|-----------|
| S1 | BE: guard restrictivo de `requirement(ownerType=activity)` en planes `Active` + análisis de impacto | REQ-01, REQ-02, REQ-03 · T1, T2 | T2 | ⚑ fuerte |
| S2 | FE: `EDITABLE_STATUSES` fuente única (`canEdit` + alerta) + alerta "malla no editable" | REQ-04 · T3 | T2 | ⚑ fuerte |

> Tier T2: regla de negocio que protege integridad de datos (S1) y refactor de un gate compartido con consumers (S2). Ambas sessions cierran con S{N}.GATE (quality review DET-23 tier standard).

### Modo (autopilot)

| Timestamp | Transición | Razón | Aplica desde |
|-----------|-----------|-------|--------------|
| 2026-07-01 | (ausente) → super | dev invocó `/dkc 089 super autopilot` | intake-explore (inicio del ciclo) |

### Session 1 — BE: guard restrictivo + análisis de impacto (2026-07-01)

**session_goal:** REQ-01/02/03 — guard restrictivo de `requirement(ownerType=activity)` en planes `Active`.

**Tasks completadas:**
- [x] S1.T1 — error `REQUIREMENT_ACTIVITY_LOCKED_BY_ACTIVE_PLAN` (`logic/errors.js`) + helper puro `logic/helpers/requirementActivityGuard.js` (`assertActivityNotInActivePlan` + `assertActivityNotInActivePlanOnUpdate`).
- [x] S1.T2 — `tests/unit/requirementActivityGuard.test.js` (14 tests: TC-01/02/03 + no-activity + null + defensivo + dedup + update path + dispatch create).
- [x] S1.T3 — wiring create (`sectionValidation.resolver.js` → branch en `validateSectionCreate`) + update (`polymorphicUpdate.resolver.js` → `assertActivityNotInActivePlanOnUpdate` en el branch `!RT_PATTERN.test`).
- [x] S1.T4 — análisis de impacto colateral (REQ-03, abajo).

**Discoveries:**
- D1 (2026-07-01): `requirement` NO tiene resolver propio — usa CRUD genérico. CONSTRAINT H7 obliga a inyectar el guard en los 2 overrides singleton existentes (`sectionValidation` create, `polymorphicUpdate` update), no en un archivo nuevo. Un `requirement.resolver.js` con `createInstance`/`updateInstance` clobbearía los existentes.
- D2 (2026-07-01): `requirement.ownerId` y `planEntry.activityId` son ambos `string` → comparación directa sin coerción.
- D3 (2026-07-01): `Curriculum.status` enum = `['Draft','Active','Archived']`. "Publicado" = `Active` (audit C-2). `Archived` NO bloquea (DEC-LOCAL-01) — decisión de alcance.

**Análisis de impacto colateral (REQ-03):**

| Dimensión | Resultado |
|-----------|-----------|
| Overrides modificados | `sectionValidation.createInstance` (vía branch `objectType==='requirement'` en `validateSectionCreate`) y `polymorphicUpdate.updateInstance` (vía `assertActivityNotInActivePlanOnUpdate` en el branch `!RT_PATTERN.test`) |
| Ramas NO afectadas (create) | `rt__Modality__curricularsection`, `rt__EvaluationComponent__curricularsection`, `requirementCategory`, `Curriculum` — el nuevo `if` es aditivo, fallthrough intacto |
| Ramas NO afectadas (update) | `rt__*__curricularsection` (handler con auth), `requirementCategory` (creditRange) — el guard corre después de `assertCreditRangeOnUpdate`, antes del delegate, y es no-op salvo `requirement` |
| Otros `ownerType` | `curriculum`/`offering` → short-circuit (no consulta planEntry) |
| Planes no publicados | `Draft`/`Archived`/sin-planes → no bloquea |
| Consumers del guard | los 2 override files son los únicos overrides de create/update del mod; sin resolver nuevo (H7) |
| Verificación | suite del mod **1127/1127 verde** (66 files) — 0 regresión; los 14 tests del guard cubren cada rama |

**Test results:** `npx vitest run` → 66 files / 1127 tests passed (incluye los 14 nuevos). Sin regresión.

**Quality review (DET-23, tier standard):** calidad ✓ (helper puro, patrón categoryGuard) · lint ✓ · tipado n/a (JS) · testing ✓ (14 tests, asserts concretos de `where`/mensaje) · escalabilidad ✓ (short-circuit + ≤2 queries) · mantenibilidad ✓ (fuente única de error, H7 respetado) · claridad ✓ · error-handling ✓ (mensaje accionable). Sin warnings bloqueantes.

**Gate decision:** (autopilot — `approvedBy: autopilot`)
- [x] continue → Session 2 (FE: fuente única + alerta "malla no editable")

### Session 2 — FE: fuente única + alerta "malla no editable" (2026-07-01)

**session_goal:** REQ-04 — `EDITABLE_STATUSES` fuente única + alerta en la vista de malla (cubre el AC FE del Jira en SP5; modal on-edit → SP6).

**Contexto (reconciliación con Jira, mid-flow):** el dev pidió comparar contra UPONE-1352. Hallazgo: el AC "FE: modal de alerta de impacto" del Jira no tiene host en SP5 (sin editor de requisitos). Decisión (DEC-LOCAL-04): el banner REQ-04 se enriquece para informar que los requisitos de planes publicados no se editan y hay que versionar; el modal on-edit completo se difiere a SP6.

**Tasks completadas:**
- [x] S2.T1 — `EDITABLE_STATUSES` + `STATUS_LABEL_KEYS` + `isEditableStatus` (fuente única) en `curriculumMesh.logic.ts`; `canEdit` refactorizado para consumirla (comportamiento `Draft` editable intacto).
- [x] S2.T2 — `buildEditLockAlert` (puro) + alerta en `CurriculumMeshElement.vue` (reusa el `Alert` atom; `editLock`/`editLockMessage` expuestos); texto con status + estados editables + aviso de versionar.
- [x] S2.T3 — tests TC-04/05/06 en `curriculumMesh.logic.spec.ts` (7 nuevos) + i18n `status`/`editLock` en `es_CL`/`en_CL`/`pt_BR` (paridad verificada).

**Test results:** `npx vitest run` → 66 files / **1134 tests** passed (+7). `curriculumMesh.logic.spec.ts` 69/69. Lint changed files: clean. Typecheck: 0 errores en CurriculumMesh (resuelto binding `editLock` en el `return` del setup); resto de errores del typecheck son **preexistentes** (resolución de módulos synced en `components/molecules/*`, `composables/*`, `weightedSum.parity.test.ts` — ajenos al ticket).

**Quality review (DET-23, tier standard):** calidad ✓ (helpers puros) · lint ✓ · tipado ✓ (fix binding; preexistentes reportados) · testing ✓ (7 tests, fuente única verificada por consistencia canEdit⇔alerta) · escalabilidad ✓ · mantenibilidad ✓ (fuente única EDITABLE_STATUSES) · claridad ✓ · a11y ✓ (Alert atom: color+ícono+texto, `showDefaultIcon`) · i18n ✓ (3 locales) · error-handling n/a. Sin warnings bloqueantes.

**Smoke visual (RULE-mods-050) — PENDIENTE del dev:** la alerta es DB-gated (requiere `layout npm run sync` + `suite npm run sync` + restart + tenant con plan `Active` abierto en modo edición). Verificado por código (unit + typecheck + i18n), **no** por render real. TC-04/TC-05 quedan con render pendiente de smoke.

**Gate decision:** (autopilot — `approvedBy: autopilot`)
- [x] continue → cierre (request-close). Bloqueo honesto: el smoke visual de REQ-04 y el `close` del ticket requieren OK del dev (super autopilot: close sin acceptance verde siempre pregunta).

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 | TC-01, TC-02, TC-03 | unit | pending |
| REQ-04 | TC-04, TC-05, TC-06 | unit/component | pending |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-01 | Activity en plan `Active` → crear requirement | REQ-01 | unit | plan Active | mutar requirement | rechazado, mensaje sugiere versionar | rechazado con `REQUIREMENT_ACTIVITY_LOCKED_BY_ACTIVE_PLAN` + "crea una nueva versión" | requirementActivityGuard.test.js (S1) | ✅ passed |
| TC-02 | Activity solo en plan `Draft` → crear requirement | REQ-01 | unit | plan Draft | mutar requirement | permitido | no lanza; consulta curriculum status=Active → [] | requirementActivityGuard.test.js (S1) | ✅ passed |
| TC-03 | Activity sin planes → crear requirement | REQ-01 | unit | sin planes | mutar requirement | permitido | no lanza; no consulta curriculum | requirementActivityGuard.test.js (S1) | ✅ passed |
| TC-04 | abrir malla de plan `Active` (modo edición) | REQ-04 | component | plan Active | render vista malla | alerta visible con status + estados editables; sin acciones de alta/edición | `buildEditLockAlert('Active','edit').visible=true` + labels correctos; acciones gated por `canEdit` | curriculumMesh.logic.spec.ts (S2) | ✅ logic / ⏳ smoke dev |
| TC-05 | abrir malla de plan `Draft` (modo edición) | REQ-04 | component | plan Draft | render vista malla | sin alerta; acciones disponibles | `buildEditLockAlert('Draft','edit').visible=false` | curriculumMesh.logic.spec.ts (S2) | ✅ logic / ⏳ smoke dev |
| TC-06 | fuente única `EDITABLE_STATUSES` | REQ-04 | unit | — | `canEdit` + `buildEditLockAlert` para todo estado | ambos derivan del mismo criterio (complementarios); labels desde `EDITABLE_STATUSES` | consistencia verificada para Draft/Active/Archived | curriculumMesh.logic.spec.ts (S2) | ✅ passed |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| unit mod | `tests/unit/` del mod | — | — | creación de requirement en planes Draft sin afectar |

## Summary

**Cerrado 2026-07-01** (super autopilot). MC-09 entregado: guard restrictivo de `requirement(ownerType=activity)` en planes publicados (`Active`) + alerta FE "malla no editable".

**Qué se entregó:**
- **REQ-01/02 (BE):** helper puro `requirementActivityGuard.js` (create + update) inyectado en los 2 overrides singleton (H7) + error `REQUIREMENT_ACTIVITY_LOCKED_BY_ACTIVE_PLAN` con mensaje que sugiere versionar. `Active` bloquea; `Draft`/`Archived`/sin-planes permiten.
- **REQ-03:** análisis de impacto colateral documentado (Session 1).
- **REQ-04 (FE):** `EDITABLE_STATUSES`/`CURRICULUM_STATUSES` como fuente única por capa (derivada del enum) consumida por `canEdit` + alerta en la vista de malla; el texto cubre el AC FE del Jira en SP5 (modal on-edit → SP6). i18n en 3 locales.

**Verificación:** suite del mod **1134/1134** (0 regresión) · lint limpio · typecheck 0 errores en archivos del ticket · smoke visual REQ-04 confirmado por el dev ("se ve bien").

**Commits locales** (`UPONE-1267-sp5`): `f18145d`, `1680dcb`, `8cc8d0b`, `15b4a9a`, `3812b25`. **Push pendiente** (RULE-dev-004: merge a develop tras revisión del team up1).

**Diferidos con razón:** modal on-edit de impacto → SP6 (S7-01); exponer `metadata` de objeto al FE para fuente única config-driven real → backlog B-1 (core, local). Errores de typecheck preexistentes (módulos synced) no corregidos.

**SP:** published 3 · executed ~2 (2 sessions efectivas).
