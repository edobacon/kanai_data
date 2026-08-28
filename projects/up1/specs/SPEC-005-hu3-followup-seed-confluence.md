---
id: SPEC-005-hu3-followup-seed-confluence
project: up1
ticket: TICKET-024
status: done
---

# HU3 followup — corregir flujos del seed UPU + documentar adaptaciones del modelo en Confluence

# HU3 followup — corregir flujos del seed UPU + documentar adaptaciones del modelo en Confluence

## Executive summary — lo que estas aprobando

**Que se quiere**: corregir 4 discrepancias entre la distribucion de statuses pedida por el PM en UPONE-1099 y la que el seed UPU genera actualmente (agregar `EDIT → BOR` en `activity-standard`; reescribir `curriculumPlan-standard` y `changeRequest-standard` que usan statuses cruzados; eliminar `PUB → DIS` en `competencyNode-standard`). El fix es exclusivamente en el seed JS del mod `curriculum-design` + actualizar asserts en los 5 tests del seed. Adicionalmente: documentar en Confluence page/2038366242 las 4 adaptaciones DEC-LOCAL que se aprobaron en Slack pero no llegaron a la pagina canonica (DEC-LOCAL-04 `workflow.lifecycle`, DEC-LOCAL-05 FKs `Int`, DEC-LOCAL-01 `entityType` String libre, DEC-LOCAL-01 bis `curricularSection` plano).

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Aplicar el cambio editando `_data-workflow-objects.js` + `npm run sync`** (no SQL externo) | Modelo operacional del mod: cambios de datos → seed; aplicacion → sync con clean rebuild. Salir de ese patron genera bug que se reproduce en otros ambientes dev (L1 del ticket) |
| 2 | **Mantener el comentario `// updated for UPONE-1099 followup`** en cada workflow editado del seed | Trazabilidad git limpia: el dev que mire diff sin context entiende por que el cambio. Sin ese comentario, parece arbitrario |
| 3 | **Order obligatorio TICKET-024 ANTES de TICKET-025** | TICKET-025 consume el workflow `activity-standard` corregido para el badge UI. Sin orden: el badge usa data incorrecta (HU4 followup falla smoke) |

**Riesgos principales y como los mitigamos**:

- **Los 5 tests del seed tienen asserts hardcoded a counts** → S1 abre con lectura empirica de los 5 archivos antes de editar el seed; los asserts se actualizan en la misma session
- **Confluence MCP requiere permisos** → S3.T1 verifica la pagina con `getConfluencePage` antes de update; si el LLM no tiene permisos para `updateConfluencePage`, fallback documentado a generar payload y delegar al dev
- **Codegen UP1 puede generar enums conflictivos** si statuses se mezclan entre workflows → el fix mantiene espacios separados (PROP/EVAL/APR solo en changeRequest-standard; BOR/EDIT/REV-DEC solo en activity/curriculumPlan/competencyNode-standard) — RULE-mods-038

**Que NO se hace en este ticket** (limites explicitos del scope):

- **Modificar resolvers, mutations o el modelo en codigo** — solo data en seed JS + tests + Confluence (RULE-curriculum-design-003)
- **UI / componentes Vue** — no toca capas frontend
- **Cambios en mutations `*Validated`** — el seed no las usa (DEC-LOCAL-06: seed dev-controlled valida partial uniques en JS)
- **DELETE selectivo / deleteMany de transitions huerfanas** — refutado por L1: `npm run sync` rearma desde cero (clean rebuild) → no hay huerfanos

**Tamano estimado**: 4 sessions ejecutables (~2-3 SP) — S1 fix seed+tests T2 / S2 sync+smoke T1 / S3 Confluence T1 ⚑ fuerte / S4 tracker+close T0. La mas riesgosa es **S1** porque toca 6 archivos (seed + 5 tests) en una session.

**Como vas a saber que funciona** (criterios observables):

- Ejecutas `npm run sync --workspace=@uplanner/curriculum-design` y termina exit 0 sin warnings
- Query GraphQL `workflow(name: "activity-standard") { transitions { fromStatus toStatus action requiresComment } }` retorna 6 transitions incluida `{ fromStatus: "EDIT", toStatus: "BOR", action: "Volver a borrador", requiresComment: true }`
- Suite vitest `workflow-seed-counts.test.ts` pasa
- Abres Confluence page/2038366242 y ves seccion "Adaptaciones de codebase UP1 v1.10" con tabla de 4 entries

---

## Purpose

Corregir el seed UPU del mod `curriculum-design` para que la distribucion de statuses entre los 5 workflows coincida con la matriz canonica acordada con el PM en UPONE-1099 (HU3). Adicionalmente sincronizar la documentacion en Confluence con las 4 adaptaciones DEC-LOCAL aprobadas en Slack pero pendientes de publicacion. Audiencia: dev del mod curriculum-design que toma el ticket en SP2.

## Requirements

### REQ-FIX-01: activity-standard tiene 6 transitions incluyendo `EDIT → BOR Volver a borrador`

> **Que cambia**: el workflow `activity-standard` post-sync tiene 6 transitions (no 5). La transition faltante `EDIT → BOR` con `requiresComment: true` se agrega.
> **Por que**: el ticket Jira UPONE-1099 lo pidio explicito; sin esa transition, el usuario que esta editando una activity no puede volverla a borrador para retrabajo profundo.

El sistema MUST exponer 6 transitions para el workflow `activity-standard` post `npm run sync`. La transition agregada MUST tener `fromStatus: "EDIT"`, `toStatus: "BOR"`, `action: "Volver a borrador"`, `requiresComment: true`.

**Actor**: dev (consume via GraphQL `workflow(name: "activity-standard")`)
**Layers**: backend (seed JS), schema (Prisma `workflowTransition` table)

<details><summary>Scenarios de validacion</summary>

#### Scenario: query retorna la transition agregada
- **GIVEN** UPU post `npm run sync` con el fix aplicado
- **WHEN** GraphQL query `workflow(name: "activity-standard") { transitions { fromStatus toStatus action requiresComment } }`
- **THEN** retorna 6 transitions
- **AND** una de ellas matches `{ fromStatus: "EDIT", toStatus: "BOR", action: "Volver a borrador", requiresComment: true }`

#### Scenario: idempotencia post-sync
- **GIVEN** UPU con el fix aplicado, primera vez
- **WHEN** se ejecuta `npm run sync` por segunda vez
- **THEN** workflow `activity-standard` sigue con 6 transitions (no duplica)

</details>

#### Acceptance
**El dev puede verificar**: ejecuta `npm run sync` y luego query GraphQL → ve la transition presente con los 4 campos correctos.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Transition EDIT→BOR presente | Sync ejecutado | Query GraphQL | Retorna 6 transitions | Una matches `EDIT→BOR Volver a borrador requiresComment=true` |
| 2 | Idempotencia | Sync 2 veces | Query GraphQL | Mismo count | 6 transitions sin duplicar |

---

### REQ-FIX-02: curriculumPlan-standard usa statuses canonicos academicos (BOR/EDIT/REV-DEC/PUB/DIS)

> **Que cambia**: `curriculumPlan-standard` deja de usar PROP/EVAL/APR (statuses reservados para changeRequest) y pasa a usar BOR/EDIT/REV-DEC/PUB/DIS como los otros workflows academicos.
> **Por que**: el PM pidio que `curriculumPlan` sea "identico a activity-standard" en su matriz UPONE-1099. PROP/EVAL/APR son el espacio de statuses de gobernanza (changeRequest), no de los 3 objetos academicos (activity, curriculumPlan, competencyNode).

El sistema MUST exponer el workflow `curriculumPlan-standard` con las mismas 5 statuses + 6 transitions que `activity-standard` (BOR/EDIT/REV-DEC/PUB/DIS).

**Actor**: dev (GraphQL)
**Layers**: backend (seed JS)

<details><summary>Scenarios de validacion</summary>

#### Scenario: curriculumPlan-standard usa statuses academicos
- **GIVEN** UPU post-sync con fix
- **WHEN** query `workflow(name: "curriculumPlan-standard") { statuses { code } transitions { fromStatus toStatus } }`
- **THEN** statuses contiene exactamente `[BOR, EDIT, REV-DEC, PUB, DIS]`
- **AND** transitions tienen el mismo shape que activity-standard

</details>

#### Acceptance
Query GraphQL retorna statuses esperados; visualmente el dev confirma que es identico al shape de `activity-standard`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 3 | Statuses canonicos | Sync OK | Query GraphQL | Retorna 5 statuses | `[BOR, EDIT, REV-DEC, PUB, DIS]` |

---

### REQ-FIX-03: competencyNode-standard NO tiene transition PUB → DIS

> **Que cambia**: el workflow `competencyNode-standard` deja de tener la transition `PUB → DIS Descontinuar`. Queda con 4 transitions (no 5).
> **Por que**: el PM pidio en UPONE-1099 que las competencias **no se descontinuen** — se reemplazan por versiones nuevas mediante otro flujo. Mantener `PUB → DIS` da una via incorrecta.

El sistema MUST exponer el workflow `competencyNode-standard` con 4 transitions (sin `PUB → DIS`).

**Actor**: dev (GraphQL)
**Layers**: backend (seed JS)

<details><summary>Scenarios de validacion</summary>

#### Scenario: competencyNode sin transition PUB → DIS
- **GIVEN** UPU post-sync con fix
- **WHEN** query `workflow(name: "competencyNode-standard") { transitions { fromStatus toStatus action } }`
- **THEN** retorna 4 transitions
- **AND** ninguna tiene `fromStatus: "PUB"` y `toStatus: "DIS"`

</details>

#### Acceptance
Query GraphQL confirma 4 transitions y ausencia de PUB → DIS.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 4 | Sin PUB → DIS | Sync OK | Query GraphQL | 4 transitions | Ninguna matches `PUB → DIS` |

---

### REQ-FIX-04: changeRequest-standard usa PROP/EVAL/APR/REJ (espacio de gobernanza)

> **Que cambia**: `changeRequest-standard` deja de usar BOR/EDIT/REV-DEC (statuses academicos) y pasa a PROP/EVAL/APR/REJ.
> **Por que**: changeRequest es objeto de gobernanza, no academico. PROP (propuesto) / EVAL (en evaluacion) / APR (aprobado) / REJ (rechazado) reflejan su ciclo de vida. RULE-mods-038 evita colision codegen entre los 2 espacios de statuses.

El sistema MUST exponer el workflow `changeRequest-standard` con 4 statuses (PROP/EVAL/APR/REJ) y 3 transitions (PROP → EVAL → APR | REJ).

**Actor**: dev (GraphQL)
**Layers**: backend (seed JS)

<details><summary>Scenarios de validacion</summary>

#### Scenario: changeRequest usa statuses de gobernanza
- **GIVEN** UPU post-sync con fix
- **WHEN** query `workflow(name: "changeRequest-standard") { statuses { code } transitions { fromStatus toStatus } }`
- **THEN** statuses contiene exactamente `[PROP, EVAL, APR, REJ]`
- **AND** transitions cubre el flujo lineal PROP → EVAL → (APR | REJ)

</details>

#### Acceptance
Query GraphQL retorna statuses + transitions esperados.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 5 | Statuses gobernanza | Sync OK | Query GraphQL | 4 statuses | `[PROP, EVAL, APR, REJ]` |

---

### REQ-FIX-05: Confluence page/2038366242 documenta las 4 adaptaciones DEC-LOCAL

> **Que cambia**: la pagina canonica "Modelo de objetos de negocio Learning Assurance" tiene seccion nueva "Adaptaciones de codebase UP1 v1.10" con tabla de 4 entries (workflow.lifecycle, FKs Int, entityType String libre, entityType plano).
> **Por que**: las decisiones se aprobaron en Slack 2026-05-13 pero el resto del equipo (que no usa DKC) no las ve. Sin esto, futuras consultas a Confluence retornan modelo desactualizado.

El sistema MUST tener en Confluence page/2038366242 una seccion "Adaptaciones de codebase UP1 v1.10" con tabla que documenta las 4 DEC-LOCAL. El contenido fuente es `projects/up1/specs/learning-assurance/objects-model/adaptations-hu3-workflow-platform.md`.

**Actor**: equipo extendido (lee Confluence)
**Layers**: docs (Confluence)

<details><summary>Scenarios de validacion</summary>

#### Scenario: seccion presente con 4 entries
- **GIVEN** Confluence page/2038366242 post-update
- **WHEN** se abre la pagina via web
- **THEN** se ve la seccion "Adaptaciones de codebase UP1 v1.10"
- **AND** la tabla tiene 4 filas (DEC-LOCAL-04, 05, 01, 01 bis) con columnas: Decision local | Adaptacion vs Confluence v1.10 | Razon

</details>

#### Acceptance
Abre la URL `https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2038366242` → ve la seccion con tabla de 4 filas. Validacion visual del dev.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 6 | Seccion presente | Page actualizada | Abrir URL | Render web | Seccion "Adaptaciones de codebase UP1 v1.10" con tabla 4 entries |

---

### REQ-REGRESSION-01: los otros workflows del seed siguen funcionando

> **Que cambia**: nada visible al dev. Los workflows que NO se tocan (si los hay) y los otros objetos del seed (statuses, history demos) mantienen su comportamiento.
> **Por que**: el fix toca data, no codigo del seed runner. Tests de regression deben pasar.

El sistema MUST mantener los counts de objetos no-workflow del seed identicos antes y despues del fix: 9 statuses, 5 history demos. El sistema MUST mantener el shape de la idempotencia: re-ejecuciones del seed (clean rebuild via `npm run sync`) producen el mismo resultado.

**Actor**: system (suite de tests)
**Layers**: backend (seed JS), schema (Prisma)

#### Acceptance
**Regresion**: suite `seed-counts.test.ts` pasa antes y despues del fix; counts de statuses + history demos sin cambio.

---

## Non-functional requirements

(No aplican — fix sin componente de performance/security/scale)

## Fix scope

### Antes (comportamiento actual)

Seed UPU genera 5 workflows con distribucion incorrecta de statuses:
- `activity-standard`: 5 transitions (falta `EDIT → BOR`)
- `curriculumPlan-standard`: usa PROP/EVAL/APR (reservados para changeRequest)
- `competencyNode-standard`: 5 transitions (incluye `PUB → DIS` no deseada)
- `changeRequest-standard`: usa BOR/EDIT/REV-DEC (reservados para academicos)

Confluence page/2038366242 NO documenta las 4 adaptaciones DEC-LOCAL.

### Despues (comportamiento esperado)

Seed UPU genera 5 workflows con distribucion correcta segun UPONE-1099:
- `activity-standard`: 6 transitions (incluyendo `EDIT → BOR Volver a borrador, requiresComment=true`)
- `curriculumPlan-standard`: 5 statuses BOR/EDIT/REV-DEC/PUB/DIS + 6 transitions (identico shape a activity-standard)
- `competencyNode-standard`: 4 transitions (sin `PUB → DIS`)
- `changeRequest-standard`: 4 statuses PROP/EVAL/APR/REJ + 3 transitions (PROP → EVAL → APR | REJ)

Confluence page/2038366242 tiene seccion "Adaptaciones de codebase UP1 v1.10" con tabla de 4 entries.

### Archivos afectados

| File | Change | Impact |
|------|--------|--------|
| `mods/curriculum-design/seed/_data-workflow-objects.js` | 4 ajustes en data de workflows (transitions + statuses) | Workflows aplicados via sync — clean rebuild del tenant UPU |
| `mods/curriculum-design/tests/integration/workflow-seed-counts.test.ts` | Asserts hardcoded actualizados (counts post-fix) | Suite vitest del modulo pasa |
| `mods/curriculum-design/tests/integration/seed-counts.test.ts` | Asserts hardcoded actualizados | Idem |
| `mods/curriculum-design/tests/integration/seed-entry.test.ts` | Verificar asserts (puede no necesitar cambio) | Idem |
| `mods/curriculum-design/tests/integration/fixtures-vs-seed.test.ts` | Verificar fixtures vs seed alineados | Idem |
| `mods/curriculum-design/tests/integration/workflow-resolvers.test.ts` | Verificar tests de resolvers no asumen counts viejos | Idem |
| Confluence page/2038366242 | Agregar seccion nueva con tabla 4 entries | Documentacion canonica del equipo extendido |

## Tasks

### Session 1 — Fix seed + actualizar asserts en 5 tests [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Leer estado actual del seed + 5 tests del seed para identificar todos los asserts hardcoded de counts | REQ-FIX-01 | researcher | — | `mods/curriculum-design/seed/_data-workflow-objects.js` + 5 archivos test | output: lista de asserts + lineas donde estan | (no aplica — solo lectura) | DET-1, DET-5, DET-11 | pending | 1 |
| S1.T2 | Editar `_data-workflow-objects.js`: aplicar los 4 ajustes (agregar `EDIT → BOR` en activity-standard; reescribir curriculumPlan-standard con statuses academicos; eliminar `PUB → DIS` en competencyNode-standard; reescribir changeRequest-standard con PROP/EVAL/APR/REJ). Agregar comentario `// updated for UPONE-1099 followup` por workflow editado | REQ-FIX-01, REQ-FIX-02, REQ-FIX-03, REQ-FIX-04 | developer | S1.T1 | `mods/curriculum-design/seed/_data-workflow-objects.js` | lint del archivo pasa + sintaxis JS valida | `git revert` | DET-5, DET-8, DET-10, DET-11, RULE-curriculum-design-003, RULE-mods-038 | pending | 1 |
| S1.T3 | Actualizar asserts hardcoded en los 5 tests del seed segun los nuevos counts. Cualquier test que use counts viejos como expected debe reflejar los counts post-fix | REQ-FIX-01, REQ-REGRESSION-01 | developer | S1.T2 | 5 archivos test | `npx vitest run mods/curriculum-design/tests/integration/` pasa | `git revert` | DET-5, DET-7, DET-11 | pending | 1 |
| S1.T4 | Ejecutar `npm run sync --workspace=@uplanner/curriculum-design` + vitest del modulo. Verificar exit 0 ambos | REQ-FIX-01, REQ-REGRESSION-01 | reviewer | S1.T3 | mod completo | sync exit 0 + suite vitest exit 0 | (no aplica — verificacion) | DET-4, DET-13, DET-14, RULE-mods-003 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket usando Template de Gate, Quality review DET-23 (standard, dim 1-7+10), decidir continue/iterate | — | reviewer | S1.T1-T4 | `tickets/ticket-024.md` | gate persistido + Quality review pass + decision documentada | (no aplica) | DET-20, DET-23 | pending | 1 |

### Session 2 — Smoke validacion GraphQL post-sync [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Smoke GraphQL: query los 4 workflows en UPU y verificar transitions + statuses esperados. Capturar output como evidencia | REQ-FIX-01, REQ-FIX-02, REQ-FIX-03, REQ-FIX-04 | reviewer | S1.GATE | UPU sandbox | 4 queries retornan counts + shape esperados | (no aplica — verificacion runtime) | DET-4, DET-7, DET-13 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T1)** — persistir resultados + Quality review DET-23 (light, dim 4 + 7) + decision | — | reviewer | S2.T1 | `tickets/ticket-024.md` | gate persistido + smoke documentado | (no aplica) | DET-20, DET-23 | pending | 2 |

### Session 3 — Confluence update con 4 DEC-LOCAL [tipo: ⚑ fuerte] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Leer contenido actual de Confluence page/2038366242 (resolver H4 — verificar si seccion existe parcial/total) | REQ-FIX-05 | researcher | S2.GATE | Confluence page/2038366242 | output: estado actual de la pagina | (no aplica — solo lectura) | DET-1, DET-5, DET-11 | pending | 3 |
| S3.T2 | Generar payload con seccion "Adaptaciones de codebase UP1 v1.10" basado en `specs/learning-assurance/objects-model/adaptations-hu3-workflow-platform.md` (formato wiki para Confluence) | REQ-FIX-05 | developer | S3.T1 | (payload temporal) | payload formato wiki valido | (no aplica) | DET-2, DET-8 | pending | 3 |
| S3.T3 | Invocar `mcp__atlassian__updateConfluencePage` con el payload. Si LLM sin permisos: fallback — generar payload listo y delegar al dev | REQ-FIX-05 | developer | S3.T2 | Confluence page/2038366242 | exit 0 del MCP tool o entrega del payload al dev | manual: revertir version anterior via UI Confluence | DET-8, DET-13 | pending | 3 |
| S3.T4 | Verificar render web: abrir URL de Confluence y validar que la seccion se ve correctamente | REQ-FIX-05 | reviewer | S3.T3 | URL Confluence | dev visualiza la pagina renderizada y aprueba | (no aplica — verificacion) | DET-4, DET-13, DET-14 | pending | 3 |
| **S3.GATE** | **Gate ⚑ fuerte de sync Session 3 (tier: T1)** — Quality review DET-23 (light dim 7) + decision humana del dev sobre el render web | — | reviewer | S3.T1-T4 | `tickets/ticket-024.md` | gate persistido + dev valida visualmente | (no aplica) | DET-20, DET-23 | pending | 3 |

### Session 4 — Tracker comment UPONE-1099 + close [tipo: auto] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Redactar comment Jira con resumen del followup (Gap 1 resuelto + Gap 2 sincronizado) | — | scribe | S3.GATE | (comment temporal) | borrador comment listo | (no aplica) | DET-13 | pending | 4 |
| S4.T2 | Invocar `mcp__atlassian__addCommentToJiraIssue` con el comment sobre UPONE-1099 | — | developer | S4.T1 | UPONE-1099 | comment publicado | manual: borrar via UI Jira | DET-8 | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T0)** — cierre del ticket. Pasar a request-close | — | reviewer | S4.T1-T2 | `tickets/ticket-024.md` | gate persistido + ticket listo para close | (no aplica) | DET-20 | pending | 4 |

## Constraints

- **RULE-curriculum-design-003** — Workflow mutations usan `*Validated`, nunca CRUD generic. El fix NO toca resolvers ni mutations
- **RULE-mods-003** — `npm run sync` obligatorio post-cambios en mods. Comando unico operacional del fix
- **RULE-mods-008** — Seeds usan `connect` con relacion lowercase para FK
- **RULE-mods-038** — Field enum naming: evitar colision codegen. Los 2 espacios de statuses (academicos vs gobernanza) son disjuntos por diseño
- **RULE-mods-039** — FK type segun namespace target (`core_*` → `Int`)
- **RULE-core-009** — Prisma client per-tenant sin `tenantId` en where/create
- **RULE-core-014** — Capability Sync: aplica si re-seed toca capabilities (en UPU sandbox sync es suficiente)
- **DET-1** — Niveles de certeza: los 4 cambios del seed son `confirmed` (verificados en S1.T1 antes de editar)
- **DET-2** — Source_ref obligatorio: cada task referencia UPONE-1099 / matriz del ticket
- **DET-5** — Multi-capa: validacion en seed (codigo) + GraphQL (runtime) + tests
- **DET-7** — Test cases para regression: REQ-REGRESSION-01 cubre objetos no-workflow del seed
- **DET-8** — Rollback documentado: `git revert` para todos los cambios JS; rollback manual via UI para Confluence/Jira
- **DET-11** — KB-first: rules consultadas durante intake, listadas arriba
- **DET-13** — Cierre basado en evidencia: query GraphQL + render web Confluence
- **DET-20** — Sessions con Gate de sync: 4 sessions con S{N}.GATE como ultima task
- **DET-21** — Teach-intake done (verificado via G7 PASS)
- **DET-22** — Teach-close obligatorio antes de cerrar (S4 prepara el contexto, request-close lo ejecuta)
- **DET-23** — Quality review en cada gate
- **DET-25** — TCs registrados en sesion (S1 + S2 + S3 actualizan tabla TC del ticket)

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| TICKET-018 (HU3, cerrado) | internal | Spec padre define la matriz canonica de statuses + workflows | Bajo — closed 2026-05-13 |
| TICKET-019 / SPEC-004 (HU4, in_progress) | internal | Spec hermano que depende del workflow `activity-standard` corregido. **Bloquea TICKET-025** (HU4 followup badge) | Coordinacion: TICKET-024 ANTES de TICKET-025 |
| MCP atlassian (Confluence + Jira) | external | Tool disponible en el entorno para `updateConfluencePage` + `addCommentToJiraIssue` | Permisos del LLM — fallback: delegar al dev con payload listo |
| `npm run sync` del mod curriculum-design | internal | Comando operacional unico para aplicar el fix en BD UPU | Bajo — comando estandar del mod |
| `adaptations-hu3-workflow-platform.md` | internal | Fuente de verdad local para las 4 DEC-LOCAL — payload de S3.T2 deriva de aqui | Bajo — archivo presente y `active` |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Tests con asserts hardcoded fallan post-fix | high | medium (bloquea S1) | S1.T1 lee los 5 tests antes de editar; S1.T3 actualiza asserts en la misma session |
| Codegen UP1 genera enums conflictivos por mezcla de statuses | low | high (bloquea sync) | Mantener espacios disjuntos: PROP/EVAL/APR solo en changeRequest, BOR/EDIT/REV-DEC solo en academicos (RULE-mods-038) |
| LLM sin permisos efectivos para `updateConfluencePage` | medium | medium (bloquea S3.T3) | Fallback documentado: generar payload formato wiki listo, delegar al dev con instrucciones de aplicar manualmente |
| Confluence page tiene contenido parcial (no vacio) en la seccion target | low | low | S3.T1 verifica antes y la S3.T2 decide append vs replace segun lo encontrado |
| TICKET-025 inicia execute antes que TICKET-024 cierre | low | high (badge usa workflow incorrecto) | W6 documentado en TICKET-025 + coordinacion explicita; dev verifica orden al iniciar |

## Open questions

- [ ] **¿Confluence page/2038366242 tiene la seccion "Adaptaciones de codebase UP1 v1.10" parcialmente?** (H4 ~partial) — bloquea S3.T1 decision append vs replace. Resolver invocando `mcp__atlassian__getConfluencePage` en S3.T1
- [ ] **¿El LLM tiene permisos para `updateConfluencePage`?** — bloquea S3.T3. Resolver intentando el call; si falla, fallback a delegar al dev

## Decisions

(Se llenan post-ejecucion. En este momento, las 3 decisions criticas del Executive summary cubren el approach. La decision-matrix sobre DELETE selectivo del teach-intake quedo SUPERSEDED por L1 — el flow operacional `npm run sync` resuelve sin necesidad de cleanup explicito.)

## Technical reference

### Comandos clave

```bash
# Aplicar el fix
cd /Users/edobacon/Workspace/uplanner/up1
npm run sync --workspace=@uplanner/curriculum-design

# Verificar
npx vitest run mods/curriculum-design/tests/integration/

# Smoke GraphQL (despues de sync)
curl -X POST <upu-graphql-endpoint> -d '{"query": "{ workflow(name: \"activity-standard\") { transitions { fromStatus toStatus action requiresComment } } }"}'
```

### Estructura esperada post-fix (activity-standard)

```yaml
workflow: activity-standard
statuses: [BOR, EDIT, REV-DEC, PUB, DIS]
transitions:
  - { from: BOR,    to: EDIT,    action: "Iniciar edicion" }
  - { from: EDIT,   to: REV-DEC, action: "Enviar a revision" }
  - { from: REV-DEC, to: PUB,    action: "Publicar" }
  - { from: REV-DEC, to: EDIT,   action: "Volver a edicion" }
  - { from: PUB,    to: DIS,     action: "Descontinuar" }
  - { from: EDIT,   to: BOR,     action: "Volver a borrador", requiresComment: true }  # AGREGADA por fix
```

### Estructura esperada post-fix (changeRequest-standard)

```yaml
workflow: changeRequest-standard
statuses: [PROP, EVAL, APR, REJ]
transitions:
  - { from: PROP, to: EVAL, action: "Iniciar evaluacion" }
  - { from: EVAL, to: APR,  action: "Aprobar" }
  - { from: EVAL, to: REJ,  action: "Rechazar" }
```

## Rules discovered

(Se llena durante ejecucion. Vacio en draft.)

## Bugs found

(Se llena durante ejecucion. Vacio en draft.)

## Acceptance checkpoints

- [ ] **Funcional**: REQ-FIX-01..05 — todos los scenarios pasan via GraphQL/Confluence
- [ ] **Tests**: 5 archivos test del seed pasan con asserts actualizados
- [ ] **NFRs**: N/A (fix sin componente performance)
- [ ] **Rules**: RULE-curriculum-design-003 (no se tocan resolvers), RULE-mods-003 (npm run sync ejecutado), RULE-mods-038 (espacios de statuses disjuntos) verificadas
- [ ] **Integration**: sync exit 0 + suite vitest verde + GraphQL retorna shapes esperados
- [ ] **Docs**: Confluence actualizado + tracker comment publicado
- [ ] **Coordinacion TICKET-025 — pre-cierre cross-ticket** (decision dev 2026-05-18): verificar que los pre-requisitos de TICKET-025 siguen intactos post-sync clean rebuild de TICKET-024. Razon: `npm run sync` rearma TODO el mod desde el seed (L1); confirmar que no rompio assumptions de 025:
  - **Archivos JSON layout del mod**: los 4 `default_AcademicActivity_*.json` en `mods/curriculum-design/config/layouts/` siguen existiendo (TICKET-025 los va a renombrar). `ls` retorna 4 archivos
  - **Capabilities activity:***: registradas en `capabilities.json` del mod + presentes en BD post-sync. Query `SELECT capability FROM core_RoleCapability WHERE capability LIKE 'activity:%'` retorna >= 5 (`activity:view/create/modify/delete/audit`)
  - **Workflow activity-standard** con 6 transitions correctas: ya verificado por REQ-FIX-01 + S2.T1 (smoke GraphQL). Cross-referencia con TICKET-025 pre-requisito explicito
  - **Atom Badge** en `layout/src/components/atoms/Badge/Badge.vue` intacto (8 variantes, props, stories) — TICKET-025 reusa este atom. Verificar via Storybook o lectura
  - **Reproduccion del bug original NO debe ocurrir**: tras 024 cerrado + sync, `workflow(name: "activity-standard")` debe tener 6 transitions (sin esto, TICKET-025 falla smoke)

## Archiving

Cuando ejecute y cierre: actualizar `status: draft → done`. Si emergen REQs adicionales durante execute: agregar como REQ-FIX-NN o BACKLOG con priority.
