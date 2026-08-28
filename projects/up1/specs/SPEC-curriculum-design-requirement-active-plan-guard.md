---
id: SPEC-curriculum-design-requirement-active-plan-guard
project: up1
ticket: TICKET-089
status: done
---

# Malla — Validación restrictiva de requisitos en planes publicados (MC-09)

# Malla — Validación restrictiva de requisitos en planes publicados (MC-09)

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico vive en Requirements / Artifacts / Tasks.*

**Que se quiere**: impedir crear/editar `requirement(ownerType=activity)` de una asignatura que ya está en un plan **publicado** (`Curriculum.status=Active`), para no invalidar mallas existentes — obligando a versionar el programa. En SP5 **no hay editor de requisitos** (la UI es S7-01), así que la regla actúa a nivel de **mutación (API/MCP/seed)**: un guard restrictivo en el resolver. Además (REQ-04, feedback del dev 2026-07-01) se agrega en la **vista de malla** una **alerta informativa** cuando el plan no es editable, con `EDITABLE_STATUSES` extraído a **fuente única** compartida con el gate `canEdit` (hoy hardcodea `status==='Draft'`). **100% mod-only.**

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | "Publicado" = `Curriculum.status === 'Active'` (bloquea). `Archived` y `Draft` **no** bloquean | Audit C-2 + reunión: solo `Active` es la malla vigente que protegemos. `Archived` es histórico inmutable por otras vías; `Draft` es construcción. Si se quisiera bloquear `Archived`, es cambio de alcance. |
| 2 | El guard NO tiene resolver propio: se inyecta en los 2 overrides singleton del mod (`sectionValidation` create + `polymorphicUpdate` update) vía helper puro | CONSTRAINT H7: un solo override por campo de mutación en todo el mod; un `requirement.resolver.js` nuevo clobbearía los existentes. |
| 3 | REQ-02 en SP5 = **mensaje accionable** del rechazo (BE); el **modal FE** completo se difiere a SP6 (S7-01) | No hay editor de requisitos en SP5 donde alojar el modal. El payload accionable ("versiona el programa") es lo entregable ahora. |
| 4 | REQ-04: `EDITABLE_STATUSES` (+ labels) a **fuente única** consumida por `canEdit` y por el texto de la alerta | Evita hardcodear el criterio de editabilidad en dos lados (gate + alerta) — si cambia, se actualiza en un solo lugar. |

**Riesgos principales y como los mitigamos**:

- **Romper la creación en planes Draft** (falso positivo del guard) → el guard chequea `Curriculum.status='Active'` explícito; TC-02 (solo Draft → permitido) y TC-03 (sin planes → permitido) lo cubren con asserts concretos.
- **Doble override colisiona (H7)** → NO se crea resolver nuevo; se extiende `validateSectionCreate` (create) y el branch `!RT_PATTERN.test` de `polymorphicUpdate` (update), patrón idéntico a `assertCreditRangeOnUpdate`.
- **Refactor de `canEdit` regresiona el gate** (consumers de MC-05/06) → `canEdit` mantiene su firma y comportamiento (`Draft` editable); solo se extrae el literal a constante; TC-06 verifica la fuente única.
- **Runtime DB-gated (FE)**: la alerta se valida por código (vitest verde) + smoke del dev tras `layout sync` + `suite sync` + restart (RULE-mods-050).

**Que NO se hace en este ticket** (límites explícitos):

- Editor de requisitos por UI + su modal de impacto completo → **S7-01 (SP6)**.
- Bloquear mutación de `requirement` en planes `Archived` → fuera de alcance (solo `Active`).
- Integridad referencial en DB de `ownerType/ownerId` → sigue siendo capa app (REQ-06 de MC-03).
- Soporte de UPDATE de `rt__*__requirement` por UI → backlog B-1 de MC-03 (el guard igual cubre el path de update genérico).

**Tamano estimado**: 2 sessions (~3-4h efectivas). S1 BE (guard + wiring create/update + tests + impacto), S2 FE (fuente única + alerta + tests).

**Como vas a saber que funciona**:

- `npm test` del mod: `requirementActivityGuard.test.js` pasa TC-01 (Active → rechaza con "versiona"), TC-02 (Draft → permite), TC-03 (sin planes → permite); suite del mod sin regresión.
- Al intentar por MCP/seed crear un `requirement(ownerType=activity)` sobre una Activity de un plan Active → error accionable que sugiere versionar.
- Tras `sync`, abro la malla de un plan `Active` → veo la alerta "El plan está Publicado. Solo se pueden editar mallas de planes en Borrador."; en un plan `Draft` no hay alerta.
- TC-06: agregar `'Review'` a `EDITABLE_STATUSES` hace que `canEdit` y el texto de la alerta lo reflejen sin editar dos lugares.

---

## Purpose

Proteger la integridad de las mallas publicadas impidiendo la mutación de `requirement(ownerType=activity)` de asignaturas referenciadas por `planEntry` de un `Curriculum` con `status=Active`. La regla vive en la capa de mutación (create + update) como guard de dominio; el rechazo entrega un mensaje accionable que sugiere versionar el programa. Complementariamente, la vista de malla informa (no bloquea) cuándo un plan no es editable, con el criterio de editabilidad en una fuente única compartida con el gate `canEdit`. Mod-only: `logic/` (helper + wiring en 2 overrides + error) y `modsComponents/CurriculumMesh` + config del mod.

## Requirements

### REQ-01: Bloqueo restrictivo de requisitos en planes publicados

> **Que cambia**: no se puede crear ni editar `requirement(ownerType=activity)` de una asignatura que está en un plan publicado (`Active`).
> **Por que**: evitar invalidar mallas vigentes; obliga a versionar el programa.

El sistema MUST rechazar la creación y la edición de un `requirement` con `ownerType='activity'` cuando su `ownerId` (id de Activity) esté referenciado por al menos un `planEntry` de un `Curriculum` con `status='Active'`. El sistema MUST permitir la mutación cuando la Activity solo esté en planes `Draft` (o `Archived`) o no esté asignada a ningún plan. El guard MUST correr tanto en el path de create (`sectionValidation.resolver.js`) como en el de update (`polymorphicUpdate.resolver.js`).

<details><summary>Scenarios de validacion</summary>

#### Scenario: Activity en plan Active → rechazado
- **GIVEN** una Activity referenciada por `planEntry` de un `Curriculum` con `status='Active'`
- **WHEN** se crea/edita un `requirement(ownerType='activity', ownerId=<esa Activity>)`
- **THEN** se rechaza con `REQUIREMENT_ACTIVITY_LOCKED_BY_ACTIVE_PLAN` y mensaje que sugiere versionar el programa

#### Scenario: Activity solo en Draft → permitido
- **GIVEN** una Activity referenciada solo por `planEntry` de planes `Draft`
- **WHEN** se crea/edita su `requirement(ownerType='activity')`
- **THEN** la mutación funciona normal (no lanza)

#### Scenario: Activity sin planes → permitido
- **GIVEN** una Activity sin ningún `planEntry`
- **WHEN** se crea/edita su `requirement(ownerType='activity')`
- **THEN** la mutación funciona normal (no lanza)

#### Scenario: requirement no-activity → no aplica
- **GIVEN** un `requirement(ownerType='curriculum')` o `'offering'`
- **WHEN** se crea/edita
- **THEN** el guard no interviene (short-circuit por ownerType)

</details>

### REQ-02: Mensaje accionable de rechazo

> **Que cambia**: el rechazo entrega un mensaje accionable que sugiere versionar; el modal FE completo se difiere a SP6.
> **Por que**: en SP5 no hay editor de requisitos; el mensaje del error es el canal accionable disponible (API/MCP/seed).

El sistema MUST lanzar un `Error` cuyo mensaje incluya el código `REQUIREMENT_ACTIVITY_LOCKED_BY_ACTIVE_PLAN` y un texto en español, accionable, que indique que la asignatura pertenece a plan(es) publicado(s) y que se debe crear una nueva versión del programa para editar sus requisitos. El formato MUST seguir el patrón del mod (`` `${ERR.CODE}: <mensaje>` ``, ver `categoryGuard.js`).

### REQ-03: Análisis de impacto colateral (obligatorio)

> **Que cambia**: se documenta qué resolvers de `requirement`/Activity se tocan y se confirma que la regla no rompe otros flujos.
> **Por que**: regla global de impacto colateral; el guard vive en overrides singleton que sirven a todo el mod.

El sistema (proceso) MUST identificar y documentar en el ticket: (a) los overrides que se modifican (`sectionValidation.createInstance`, `polymorphicUpdate.updateInstance`), (b) que las otras ramas de esos overrides (curricularsection, requirementCategory, Curriculum, rt__*__curricularsection) no cambian de comportamiento, (c) que la creación/edición en planes `Draft` y de otros `ownerType` no se ve afectada. El análisis MUST confirmarse con tests (TC-02/TC-03 + suite del mod sin regresión).

### REQ-04: Alerta "malla no editable" en la vista de malla — fuente única *(🆂 Should)*

> **Que cambia**: la vista de malla muestra una alerta cuando el plan no es editable (hoy `Active`), explicando que solo se editan mallas de planes en borrador; el criterio de editabilidad se extrae a fuente única compartida con `canEdit`.
> **Por que**: hoy la malla queda en solo-lectura **en silencio** (sin botones), y el usuario no sabe por qué; y el criterio no debe hardcodearse en dos lados.

El sistema MUST mostrar, en la vista de malla, una alerta **informativa (no bloqueante)** solo cuando el plan no sea editable. El texto MUST derivar el `statusLabel` del plan y los `editableStatusLabels` desde una **única fuente de verdad** (`EDITABLE_STATUSES` + labels) que TAMBIÉN consume `canEdit`. El sistema MUST NOT duplicar el criterio de editabilidad como literal en el mensaje. Si cambia `EDITABLE_STATUSES`, tanto `canEdit` como la alerta MUST reflejar el cambio sin editar dos lugares.

> **Mapeo del AC del Jira "FE: modal de alerta de impacto" (decisión dev 2026-07-01, DEC-LOCAL-04):** en SP5 no hay editor de requisitos donde disparar un modal on-edit; ese modal se difiere a **S7-01 (SP6)**. Para cubrir el criterio FE del Jira en SP5, el texto de esta alerta MUST **también** informar que **los requisitos de asignaturas en planes publicados no se pueden editar** y que hay que **crear una nueva versión del programa** (mismo intent que el "mensaje que sugiere versionar" del BE). Así el usuario ve el impacto en la malla, y el modal completo llega con el editor en SP6.

<details><summary>Scenarios de validacion</summary>

#### Scenario: plan no editable → alerta visible
- **GIVEN** un Plan con `status` no editable (hoy `Active`)
- **WHEN** se abre la vista de malla
- **THEN** se muestra la alerta con el status y los estados editables; no se muestran acciones de alta/edición (gate `canEdit` vigente)

#### Scenario: plan editable → sin alerta
- **GIVEN** un Plan con `status` editable (hoy `Draft`)
- **WHEN** se abre la vista de malla
- **THEN** no se muestra la alerta y las acciones están disponibles

#### Scenario: cambiar la config editable
- **GIVEN** se agrega `'Review'` a `EDITABLE_STATUSES`
- **WHEN** se evalúa `canEdit('Review', mode)` y el texto de la alerta
- **THEN** ambos reflejan el cambio (mismo origen), sin editar dos lugares

</details>

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | El guard no agrega N+1 | queries por mutación de requirement | ≤2 (planEntry.findMany por activityId + curriculum count/findMany por planIds Active); short-circuit si ownerType≠activity |
| A11y | La alerta no depende solo del color | redundancia | color + ícono + texto (WCAG 1.4.1), patrón del design system up1 |
| Seguridad/Integridad | Restrictivo antes que permisivo | comportamiento por defecto | ante duda del estado, se bloquea (reunión 00:51:07) |

## Artifacts

> Sin meta-specs de componentes nuevos → el delta es un helper puro + wiring en 2 overrides + 1 error + refactor FE de una constante + alerta reusando el sistema de alertas existente.

### Reusados (ya construidos — NO tocar la lógica base)

| Artefacto | Path | Rol |
|-----------|------|-----|
| Override create singleton | `logic/sectionValidation.resolver.js` (`validateSectionCreate`) | punto de inyección del guard en create (H7) |
| Override update singleton | `logic/polymorphicUpdate.resolver.js` (branch `!RT_PATTERN.test`) | punto de inyección del guard en update (H7) |
| Patrón de guard por planEntry | `logic/helpers/categoryGuard.js` (`assertNoEntriesForCategory`) | plantilla del helper nuevo |
| Diccionario de errores | `logic/errors.js` (`ERR`, frozen) | se agrega el código nuevo |
| Objeto requirement / planEntry / Curriculum | `objects/{requirement,planEntry,Curriculum}.json` | modelo (no cambia) |
| Gate `canEdit` + vista de malla | `modsComponents/CurriculumMesh/*` (`curriculumMesh.logic.ts`) | REQ-04 (MC-05/06) |
| Sistema de alertas existente | atoms/molecules del design system (a confirmar en S2.T2) | REQ-04 reusa, no crea |

### Nuevos / modificados (el delta)

| Artefacto | Path | Cambio | source_ref |
|-----------|------|--------|-----------|
| Helper `assertActivityNotInActivePlan` | `logic/helpers/requirementActivityGuard.js` (nuevo) | pura: `{prisma, ownerType, ownerId}` → lanza si la Activity está en plan Active | REQ-01, REQ-02 |
| Código de error | `logic/errors.js` (modifica) | `REQUIREMENT_ACTIVITY_LOCKED_BY_ACTIVE_PLAN` | REQ-02 |
| Wiring create | `logic/sectionValidation.resolver.js` (modifica) | branch `objectType==='requirement' && ownerType==='activity'` en `validateSectionCreate` | REQ-01 |
| Wiring update | `logic/polymorphicUpdate.resolver.js` (modifica) | `assertActivityNotInActivePlanOnUpdate` no-op-by-default en el branch genérico | REQ-01 |
| Tests del guard | `tests/unit/requirementActivityGuard.test.js` (nuevo) | TC-01/02/03/(no-activity) con asserts concretos | REQ-01, REQ-02 |
| Fuente única `EDITABLE_STATUSES` | `modsComponents/CurriculumMesh/curriculumMesh.logic.ts` o const nueva del mod (modifica) | extraer criterio + labels; `canEdit` la consume | REQ-04 |
| Alerta "malla no editable" | `modsComponents/CurriculumMesh/*` (modifica) | alerta condicional reusando alert del design system | REQ-04 |
| Tests fuente única + alerta | `tests/unit|component/` (nuevo) | TC-04/05/06 | REQ-04 |
| i18n | `lang/{es_CL,en_CL,pt_BR}.json` | labels de status + texto alerta | REQ-04 |

> **Gate de necesidad/reuso (DET-32)**: overrides, patrón de guard, diccionario de errores, gate `canEdit`, sistema de alertas = **reuse**. Helper + error + wiring + refactor de constante = **build** (mínimo). No se construye resolver nuevo (H7 lo prohíbe) ni componente de alerta nuevo (reuse del design system). Veredicto: build (helper/error/wiring/alerta-config) + reuse (todo lo demás).

## Tasks

### Session 1 — BE: guard restrictivo + impacto (REQ-01/02/03) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Código de error `REQUIREMENT_ACTIVITY_LOCKED_BY_ACTIVE_PLAN` en `errors.js` + helper puro `assertActivityNotInActivePlan({prisma, ownerType, ownerId})`: short-circuit si `ownerType!=='activity'`; `planEntry.findMany({where:{activityId:ownerId}, select:{planId}})` → si hay planIds, `curriculum` con `status='Active'` en esos ids → lanza mensaje accionable | REQ-01, REQ-02 | developer | — | logic/errors.js, logic/helpers/requirementActivityGuard.js | vitest (S1.T2) | git revert | DET-1, DET-2, DET-8, DET-11 | done | 1 |
| S1.T2 | `tests/unit/requirementActivityGuard.test.js`: TC-01 (Active → rechaza con /versiona/), TC-02 (solo Draft → no lanza), TC-03 (sin planes → no lanza), TC-extra (ownerType='curriculum' → no lanza, no consulta prisma) con asserts concretos y verificación de `where` | REQ-01, REQ-02 | developer | S1.T1 | tests/unit/requirementActivityGuard.test.js | `vitest run` del mod verde | git revert | DET-7, DET-13 | done | 1 |
| S1.T3 | Wiring: branch en `validateSectionCreate` (create, `objectType==='requirement'`) + `assertActivityNotInActivePlanOnUpdate` en el branch `!RT_PATTERN.test` de `polymorphicUpdate.updateInstance` (update); leer `ownerType`/`ownerId` de `args.data` (create) y resolver el registro/`args.data` (update) | REQ-01 | developer | S1.T1 | logic/sectionValidation.resolver.js, logic/polymorphicUpdate.resolver.js | vitest dispatch + lint | git revert | DET-5, DET-16, RULE-curriculum-design-014 | done | 1 |
| S1.T4 | Análisis de impacto colateral (REQ-03) documentado en el ticket: overrides tocados, ramas no afectadas, confirmación Draft/otros ownerType intactos | REQ-03 | reviewer | S1.T3 | ticket | análisis escrito + suite del mod sin regresión | (no aplica) | DET-16 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2) — persistir en `## Sessions`, `vitest run` del mod verde, quality review standard (DET-23), decidir continue/iterate/escalate | — | reviewer | S1.T1..T4 | ticket | gate persistido + vitest verde + impacto documentado | (no aplica) | DET-13, DET-20, DET-23 | done | 1 |

### Session 2 — FE: fuente única + alerta "malla no editable" (REQ-04) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Extraer `EDITABLE_STATUSES` (+ labels i18n keys) a fuente única del mod; refactor `canEdit` para consumirla (mantener comportamiento: `Draft` editable) | REQ-04 | developer | S1.GATE | modsComponents/CurriculumMesh/curriculumMesh.logic.ts (+ const nueva) | vitest de canEdit sin regresión | git revert | DET-16, RULE-curriculum-design-014 | done | 2 |
| S2.T2 | Alerta "malla no editable" en la vista de malla: condicional a `!canEdit(status)`, reusando el alert del design system; texto con `statusLabel` + `editableStatusLabels` desde la fuente única | REQ-04 | developer | S2.T1 | modsComponents/CurriculumMesh/*.vue|*.ts | render condicional + a11y (color+ícono+texto) | git revert | DET-16, RULE-curriculum-design-014 | done | 2 |
| S2.T3 | Tests TC-04 (Active → alerta visible, sin acciones), TC-05 (Draft → sin alerta), TC-06 (agregar 'Review' → canEdit y texto reflejan, fuente única) + i18n en 3 locales | REQ-04 | developer | S2.T1, S2.T2 | tests/unit|component/, lang/{es_CL,en_CL,pt_BR}.json | vitest verde + paridad de keys | git revert | DET-7, DET-2, RULE-curriculum-design-014 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T2) — vitest verde, i18n paridad, smoke DB-gated de la alerta (dev), quality review, decidir cierre | — | reviewer | S2.T1..T3 | ticket | gate persistido + vitest + smoke | (no aplica) | DET-13, DET-20, DET-23 | done | 2 |

## Constraints

- **CONSTRAINT H7** (`docs/patterns/resolver-override.md`): un solo override por campo de mutación en todo el mod. El guard NO puede vivir en un `requirement.resolver.js` nuevo — se inyecta en `sectionValidation` (create) y `polymorphicUpdate` (update).
- **RULE-curriculum-design-014**: lógica de negocio del mod a helpers/`.ts` puros testeables; el guard es un helper puro con prisma inyectado.
- **RULE-mods-050**: cambios a `lang/*.json` y a componentes/config del mod requieren `layout npm run sync` + `suite npm run sync` + restart; smoke visual lo corre el dev.
- **DEC-034 / BUG-curriculum-design-002** (kb_refs del ticket): contexto del guard de dominio en `requirement`/planEntry.
- **REQ-06 (MC-03)**: `ownerType/ownerId` sin FK en DB — la validación de que `ownerId` es una Activity es responsabilidad de la capa app; el guard asume `ownerType='activity'` ⇒ `ownerId` es Activity id.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| MC-02 (TICKET-082, closed) | internal | `planEntry` (activityId, planId) — detectar planes de una Activity | bajo — cerrado |
| MC-03 (TICKET-083, closed) | internal | `requirement(ownerType=activity)` — lo que se valida | bajo — cerrado |
| MC-05 (TICKET-085, closed) | internal | gate `canEdit` + vista de malla — base de REQ-04 | bajo — cerrado |
| MC-06 (TICKET-086, closed) | internal | feedback origen de REQ-04; consumers del gate `canEdit` | bajo — cerrado |
| S7-01 (SP6) | external | editor de requisitos por UI + modal de impacto completo (REQ-02 FE) | n/a — fuera de scope |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Falso positivo: bloquear creación en planes Draft | low | rompe edición de plan en construcción | guard chequea `status='Active'` explícito; TC-02/TC-03 con asserts |
| Doble override colisiona (H7) | low | clobber silencioso de create/update | no se crea resolver nuevo; se extienden los 2 overlays existentes |
| Refactor de `canEdit` regresiona consumers (MC-05/06) | medium | gate de edición roto | firma y comportamiento de `canEdit` intactos; solo se extrae el literal; TC-06 verifica fuente única |
| Update path: `args.data` no trae ownerType/ownerId | medium | guard no evalúa en update | en update, resolver el registro por id si `data` no incluye owner; test de update dispatch |

## Open questions

- (ninguna abierta — alcance completo aprobado por el dev 2026-07-01; `Active`-only confirmado por audit C-2)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: "Publicado" = `Curriculum.status === 'Active'` (Active-only)
- **Contexto**: el enum de `Curriculum.status` es `['Draft','Active','Archived']`; ¿qué estados bloquean?
- **Drivers**: audit C-2 + reunión definen "publicado = Active"; `Archived` es histórico (protegido por inmutabilidad de versión, no por este guard); `Draft` es construcción.
- **Opcion elegida**: bloquear solo cuando exista al menos un plan `Active`. `Archived`/`Draft` no bloquean.
- **Alternativas**: bloquear también `Archived` (descartado — cambia el alcance; `Archived` no es la malla vigente editable).
- **Consecuencias**: si el negocio luego quiere proteger `Archived`, es un cambio aditivo en `EDITABLE_STATUSES`/guard (fuente única facilita).
- **Session**: S0 (design).

### DEC-LOCAL-02: Guard en los 2 overrides singleton, no resolver nuevo (H7)
- **Contexto**: `requirement` usa CRUD genérico; no tiene resolver propio.
- **Drivers**: CONSTRAINT H7 (un override por campo por mod); `sectionValidation` ya toma `createInstance` y `polymorphicUpdate` ya toma `updateInstance`.
- **Opcion elegida**: helper puro inyectado en `validateSectionCreate` (create) y en el branch genérico de `polymorphicUpdate` (update), patrón `assertCreditRangeOnUpdate`.
- **Alternativas**: `requirement.resolver.js` nuevo (descartado — clobbea los overrides existentes).
- **Consecuencias**: cambios acotados a 2 archivos + helper; testeable en aislamiento (mock prisma).
- **Session**: S0 (design).

### DEC-LOCAL-05: estados editable/publicado como constante por capa derivada del enum (no config runtime)
- **Contexto**: el dev pidió validar que los estados editable (`Draft`) / publicado (`Active`) que gatillan acciones se lean de una config (idealmente la de versionamiento), no hardcodeados. Auditoría: hoy están hardcodeados en 2 capas (BE `PUBLISHED_STATUS='Active'`, FE `EDITABLE_STATUSES=['Draft']`) + el enum re-declarado en ~4 lugares. No existe config de versionamiento que defina editable/publicado (`metadata.versioning` es solo plumbing de cadena; `Curriculum` no tiene workflow — "no workflow formal en v1").
- **Drivers**: eliminar duplicación; preferencia del dev por leer de config/metadata **si el core lo permite sin tocarlo**.
- **Factibilidad de core (zero-touch)**: BE **puede** leer `metadata.lifecycle` del JSON (helpers exportados) — ✅. FE **no puede**: el tipo GraphQL `core_ObjectDefinition` es allowlist cerrado (`label`/`labelPlural`/`defaultLayoutType`…), sin passthrough de `metadata` ni query de metadata; la malla solo trae `listInstances` (data de instancia). Exponerlo al FE **requiere cambio de core** — ❌.
- **Opción elegida** (dev: "metadata si el core permite ahora; si limita → constante por capa"): como el core **limita el FE**, se va a **constante por capa derivada del enum**: FE `CURRICULUM_STATUSES` (`as const`, única declaración; `CurriculumStatus` deriva; `useCurriculumMesh` la consume) + `EDITABLE_STATUSES`; BE `PUBLISHED_STATUSES` (array). Cada política en 1 lugar por capa, espejo del enum de `Curriculum.json`, documentada.
- **Alternativas**: (a) metadata `lifecycle` en Curriculum.json leída por ambas capas — descartada: FE necesita cambio de core; el path BE-only sería frágil (import cross-package con dual-path dev/synced + IO por mutación) y sin payoff de fuente única (FE igual hardcodea). (b) codegen que derive constantes del enum — no existe infra, overkill para 3 SP.
- **Consecuencias**: no hay fuente única cross-capa (imposible sin cambio de core: BE→object-manager y FE→suite son deploys separados). Se deja follow-up de core en backlog. Nota: editable (`['Draft']`) ≠ publicado (`['Active']`) — son 2 políticas distintas, no una lista duplicada.
- **Session**: S2 (validación pedida por el dev, 2026-07-01).

### DEC-LOCAL-04: el AC del Jira "FE: modal de alerta de impacto" se cubre en SP5 con el banner REQ-04 + versionar; modal on-edit → SP6
- **Contexto**: el Jira UPONE-1352 lista como AC "FE: modal de alerta de impacto". En SP5 no hay editor de requisitos que dispare un modal on-edit.
- **Drivers**: sin editor no hay disparador para un modal; pero el usuario debe ver en la UI que un plan publicado no permite editar requisitos y hay que versionar (no solo por error de API).
- **Opcion elegida** (dev 2026-07-01): entregar la alerta REQ-04 en la vista de malla y **enriquecer su texto** para que también mencione que los requisitos de planes publicados no se editan y hay que versionar; el **modal on-edit completo se difiere a S7-01 (SP6)**, donde existirá el editor.
- **Alternativas**: (a) dejar REQ-04 genérico y diferir todo el mensaje de impacto a SP6 (descartado — el usuario no vería nada específico en SP5); (b) construir el modal ahora (descartado — huérfano sin editor que lo dispare).
- **Consecuencias**: el AC FE del Jira queda cubierto en SP5 (mensaje visible en la malla) con nota de deferral del modal on-edit a SP6. En el cierre se marca el AC como "cubierto parcial: banner sí, modal on-edit → SP6".
- **Session**: S1 (revisión de alcance contra Jira, 2026-07-01).

### DEC-LOCAL-03: REQ-02 = mensaje accionable (BE); modal FE difiere a SP6
- **Contexto**: REQ-02 pide un modal de impacto; en SP5 no hay editor de requisitos.
- **Drivers**: sin editor no hay dónde alojar el modal; el canal accionable es el mensaje del error (API/MCP/seed).
- **Opcion elegida**: el rechazo entrega mensaje accionable que sugiere versionar; modal completo → S7-01.
- **Alternativas**: construir un modal sin host (descartado — sin editor, no se ejercita).
- **Consecuencias**: el valor accionable se entrega ahora; la UX completa llega con el editor en SP6.
- **Session**: S0 (design).

## Technical reference

- **Create override**: `sectionValidation.resolver.js:184-204` (`sectionValidationMutation.createInstance`) → `validateSectionCreate` (`:101-130`, dispatch por objectType, fallthrough no-op). Insertar branch `if (objectType === 'requirement') { await assertActivityNotInActivePlan({ prisma: context.prisma, ownerType: readField(data,'ownerType'), ownerId: readField(data,'ownerId') }) }`.
- **Update override**: `polymorphicUpdate.resolver.js:573-591` (`polymorphicUpdateMutation.updateInstance`); el branch `if (!RT_PATTERN.test(objectType))` (`RT_PATTERN` en `:155` solo matchea `curricularsection`) cubre `requirement`. Insertar `await assertActivityNotInActivePlanOnUpdate({ objectType, data: args.data, id: args.id, prisma: context.prisma })` (no-op salvo `requirement`; si `data` no trae owner, leer el registro por id).
- **Query pattern**: `prisma.planEntry.findMany({ where:{ activityId: ownerId }, select:{ planId:true } })` → `planIds` → `prisma.curriculum.findMany({ where:{ id:{ in: planIds }, status:'Active' }, select:{ id:true } })` (idioma doble-batch de `curriculum-read.resolver.js:227-230`). Nombre del modelo prisma: `curriculum` (lowercase) / `planEntry`.
- **Error pattern**: `throw new Error(`${ERR.REQUIREMENT_ACTIVITY_LOCKED_BY_ACTIVE_PLAN}: la asignatura pertenece a un plan publicado; crea una nueva versión del programa para editar sus requisitos.`)`.
- **Test pattern**: vitest, mock `prisma` con `vi.fn()` por accessor (`tests/unit/requirementCategoryGuard.test.js`); assert de `rejects.toThrow(/CODE.*versión/)` y de `toHaveBeenCalledWith({ where:{ activityId } , select:{...} })`.
- **REQ-04 canEdit**: `curriculumMesh.logic.ts` hardcodea `status === 'Draft'`; extraer `EDITABLE_STATUSES = ['Draft']` (+ labels i18n) a const del mod consumida por `canEdit` y por el texto de la alerta.

## Acceptance checkpoints

- [x] **Funcional**: REQ-01 (Active bloquea create+update, Draft/sin-planes permite), REQ-02 (mensaje accionable), REQ-03 (impacto documentado), REQ-04 (alerta en plan no editable + fuente única)
- [x] **Tests**: TC-01/02/03 (+ no-activity) del guard pasando; TC-04/05/06 de REQ-04; suite del mod sin regresión
- [x] **NFRs**: guard ≤2 queries, short-circuit por ownerType; alerta color+ícono+texto (WCAG)
- [x] **Rules**: H7 respetado (sin resolver nuevo); RULE-mods-050 (sync ejecutado por el dev); RULE-curriculum-design-014 (lógica en helper puro)
- [x] **Integration**: create/update de otros objectType y ownerType intactos; gate `canEdit` (MC-05/06) sin regresión
- [x] **Docs**: i18n del mod poblado en 3 locales (REQ-04)

## Archiving

Cuando la spec deje de ser fuente de verdad: `/dkc-archive-spec SPEC-curriculum-design-requirement-active-plan-guard "razon"`.
