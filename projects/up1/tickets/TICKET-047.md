---
id: TICKET-047
project: up1
type: ticket
status: closed
work_type: improvement
module: object-manager
autopilot: autonomous
---

# Validar e2e la rama deepClone de relacion Prisma directa (directChildren) — autocontenido

## Request

> Residual de cobertura de **UPONE-1208 / TICKET-037** (HU-2, cerrado), bajo la epica **UPONE-1206** (capacidad de clonacion de objetos). No tiene Jira propio — es trabajo interno de cobertura.

HU-2 (TICKET-037) entrego la rama de `deepClone` de **relacion Prisma directa** (bloque declarativo `metadata.directChildren` + helper `deepCloneDirectChildren` + routing de particion en `instance.resolver.js` + validacion en codegen). Esa rama quedo **solo unit-tested con mocks** — no tiene consumidor real en SP3 (el unico caso del sprint, Activity→CurricularSection, es polimorfico y ya esta probado e2e en `tests/e2e/clone-activity-polymorphic.test.js`).

Este ticket cierra esa brecha: **validar end-to-end contra la DB real** la clonacion por relacion directa, de forma **autocontenida** — el propio ticket genera su caso real, lo prueba, y devuelve la DB al estado actual (durante el resto del sprint no se crean datos nuevos).

### Criterios de aceptacion

- [x] Existe un e2e que clona, contra la DB real (Docker `pg`), un padre con hijos de relacion **directa** (FK simple) declarados via bloque `directChildren` (inyectado inline — ver DEC-LOCAL-01).
- [x] Asserts: hijos clonados con la FK repuntada al nuevo padre; jerarquia preservada con `recursiveBy`; mapa `oldId→{newId,type}` consistente.
- [x] El test es **autocontenido**: genera su caso (modelo real CurricularSection) y restaura la DB al estado previo (teardown por sentinel). Sin residuo (TC-04: count==0).
- [x] No rompe la suite existente (regresion verde: suite e2e 4/4, incluido el e2e polimorfico).

### Cambio vs actual

- `directChildren` pasa de unit-only (mocks) a validado e2e contra datos reales.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | improvement (cobertura de test) |
| Tipo de cambio | single (object-manager) — test + posible fixture/config temporal |
| Modulo principal | object-manager |
| Modulos afectados | object-manager (tests/e2e + posible object def fixture en tenant TEST) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | — |
| Data model | no | (se puede crear un objeto fixture EFIMERO en TEST que se revierte; no es modelo nuevo permanente) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Existe en el modelo un par de objetos con relacion 1-N **directa** (hijo con FK simple al padre, no polimorfico) sobre el cual declarar `directChildren` temporal — evitando crear una tabla fixture | ✓ confirmada | Scan de `objects/**/*.json`: 85 FK directas. Candidatos: `Workflow←WorkflowTransition.workflowId`, `Activity←InstructorCourseAssignment.activityId`, `Offering←OfferingEnrollment.offeringId`; self-ref `OrgUnit.parentId`/`Event.parentEventId` (para `recursiveBy`) |
| H2 | El resolver lee `directChildren` del JSON del objeto (file-based, `readDirectChildren`), NO del registry → declarar el bloque temporal en un JSON real lo activa SIN codegen; revertible con `git checkout`. NO hace falta reset canonico para el caso directo (solo teardown de filas) | ✓ confirmada | `deep-clone-direct.js:readDirectChildren` usa `readObjectMetadataBlock` (lee archivo). El registry (versioningConfig) es para persistencia/validacion, no para el runtime del deepClone |
| H3 | El patron de `tests/e2e/clone-activity-polymorphic.test.js` (setup rows reales + clonar + assert + teardown) se replica para el caso directo | ✓ confirmada | Ese e2e ya corre verde contra la DB Docker |
| H4 | Los pares reales tienen varias FK requeridas (seed costoso); un objeto fixture minimo (parent+child con solo el FK) puede ser mas simple que un par real | ~ a decidir en design | Ej. WorkflowTransition req fromStatusId/toStatusId→WorkflowStatus; InstructorCourseAssignment req instructorId→Instructor. Trade-off seed-real vs fixture-minimo lo resuelve design-improvement |

### Context found

- **Origen**: UPONE-1208 (TICKET-037) S3 — `directChildren` + `deepCloneDirectChildren` (`object-manager/src/graphql/resolvers/helpers/deep-clone-direct.js`), routing en `instance.resolver.js`, validacion en `validate-prefill-from.js`. Ver teach-close de 037.
- **Patron e2e existente**: `object-manager/tests/e2e/clone-activity-polymorphic.test.js` (polimorfico, verde).
- **DB**: Docker contenedor `pg` (postgres:17.4), tenants `uplanner_*` (UPU/BASEMODEL/UCASMT/UCENG/UCPLN/TEST). User `pg`/`root`.
- **Reset canonico**: proceso disponible para recrear/limpiar DB de tenant (precedente 033).
- **Warnings**:
  - Crear un object def fixture implica codegen + schema en el tenant → preferir H1 (par directo existente) si lo hay; H2 solo si es imprescindible, y SIEMPRE con teardown/reset que restaure el estado.
  - `RULE-dev-004`: trabajo en object-manager → rama epica `UPONE-1206`.

## Setup

| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1206` (epica; commits prefijo TICKET-047 por DET-19, external null) |
| Base branch | `develop` |
| Repo path | `/Users/edobacon/Workspace/uplanner/up1/object-manager` |
| DB state | Docker `pg`; tenant TEST disponible para fixture efimero; reset canonico disponible |
| Services | object-manager, postgres (Docker) |

## Sessions

### Plan de sessions

> Esqueleto — se refina en design-improvement. La estrategia (H1 par existente vs H2 fixture) se decide en intake/design.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Preparar caso real (par directo existente o fixture TEST) + e2e directChildren (seed, clonar, assert FK/jerarquia/mapa) + teardown/restore | execute | T3 | e2e + setup/teardown | ⚑ fuerte | e2e verde contra DB real; DB restaurada al estado previo; regresion verde |
| S2 | Cierre — commit DET-27 + teach-close | execute | T1 | review + commit | auto | suite verde; teach-close validado |

### Session 1 — 2026-06-01 — e2e directChildren + teardown/restore [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa)

**Objetivo**: Agregar cobertura e2e a la rama `deepCloneDirectChildren` contra la DB real (UPU): baseline de cobertura, implementar `clone-direct-children.test.js` (escenario A FK real parentId + escenario B recursiveBy), correr contra DB Docker, verificar DB restaurada sin residuo y regresion verde.

**Tasks completadas**:
- [x] S1.T1 — Baseline de cobertura: rama directa solo unit (mocks), sin e2e; confirmar modelo CurricularSection UPU + campos de seed
- [x] S1.T2 — Implementar e2e clone-direct-children.test.js (escenario A FK real parentId + escenario B fk ownerId + recursiveBy parentId), bloque directChildren inline, seed/clone/assert/teardown por sentinel
- [x] S1.T3 — Correr e2e contra DB real + verificar DB restaurada (conteo sentinel == 0) + suite e2e completa sin regresion
- [x] S1.GATE — Gate de sync Session 1 (tier T3): persistir + TCs inline + quality review exhaustive + decision

**Validacion del tier**:
- T3 — suite e2e completa: `vitest run tests/e2e` → 2 files / 4 tests passed (clone-activity-polymorphic 1 + clone-direct-children 3). DB restaurada verificada in-test (TC-04: count RUN_TAG==0 post-teardown). Sin smoke UI (cambio test-only, no user-facing).

**Discoveries / Learns nuevos**:
- L1: el bloque `directChildren` se puede inyectar **inline** al helper `deepCloneDirectChildren` (igual que `polymorphicChildren` en el e2e polimorfico), evitando `readDirectChildren`/`readObjectMetadataBlock` → un e2e del caso directo NO necesita tocar JSON de objeto ni codegen. Esto vuelve moot la preocupacion de H2 (file-based read + git checkout) para el alcance de test.
- L2: `CurricularSection` (UPU) sirve para ambas ramas del caso directo con seed minimo: su self-ref FK real `parentId` cubre el escenario recursiveBy con integridad referencial enforced por Postgres, y `ownerId` (String) sirve como fk de enlace plano. Un solo modelo, sin fixture ni codegen.

**Quality review (DET-23)**:

**Reviewer**: LLM aislado (sub-agente general-purpose, contexto limpio — HOR-079 REQ-10)
**Tier de revision**: exhaustive
**Resultado global**: pass (approve)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | Sin codigo muerto ni magic numbers; sentinels descriptivos; seedSection con default limpio |
| 2 | Lint/estilo | pass | Consistente con el patron del e2e polimorfico (beforeAll/afterAll, guard, eslint-disable) |
| 3 | Tipado | n/a | Archivo JS sin tipos |
| 4 | Testing | pass | Escenario A prueba repoint de FK real; B prueba remap topologico de recursiveBy; TC-04 verifica teardown activo. Asserts concretos |
| 5 | Escalabilidad | n/a | Test de cobertura |
| 6 | Mantenibilidad | pass | Sentinels claros, DIRECT_CHILDREN imita shape real, afterAll doble-criterio; facil de extender |
| 7 | Claridad | pass | Header JSDoc explica valor e2e vs unit, modelo elegido y decision inline (ref DEC-LOCAL-01) |
| 8 | A11y | n/a | — |
| 9 | Storybook | n/a | — |
| 10 | Error handling | pass | Guard isDbReady en los 3 tests; afterAll idempotente + $disconnect; beforeAll captura excepcion del probe |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Findings (info, no bloqueantes): (a) `createdAt instanceof Date` es superficial — no compara contra el original; el strip de timestamps ya esta cubierto por el unit test. (b) Sin riesgo de residuo: el helper copia `recordType` en `rest`, asi que los clones tambien caen bajo el sentinel del teardown (verificado contra deep-clone-direct.js). scope_ok: true (unico archivo dentro de object-manager/, sin tocar produccion).

**Tiempo invertido**: ~1.5h efectivos
**Contexto retomable**: S1 cerrada — e2e implementado y verde, DB restaurada, regresion verde, commits hechos. Pendiente: S2 (cierre — teach-close + commits finales de records).
**Commit DET-27**: `5f078b8` (deckard: records dkc S1) + `c5b3429` (object-manager) test e2e

### Session 2 — 2026-06-01 — cierre [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T1 (unit area)

**Objetivo**: Cierre del ticket (request-close): teach-close (DET-22), acceptance checkpoints, Story Points executed (DET-26), commits finales de records (DET-27) y status closed.

**Tasks completadas**:
- [x] S2.T1 — Cierre via request-close: teach-close + commits granulares DET-27 (records dkc + estado final)
- [x] S2.GATE — Gate de sync Session 2 (tier T1): acceptance checkpoints + cierre evidencia-based

**Validacion del tier**:
- T1 — sin cambios de codigo en S2 (cierre records-only). Acceptance checkpoints pass (ver Summary); suite e2e ya verde en S1.

**Quality review (DET-23)**:

**Reviewer**: LLM aislado (sub-agente general-purpose, contexto limpio — validacion de cierre reforzada 1d, HOR-079 REQ-03)
**Tier de revision**: standard
**Resultado global**: pass (approve)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | DET-13 cambios vs spec | pass | Test cubre REQ-IMPROVE-01 (A+B), REQ-PRESERVE-01, REQ-PRESERVE-02 |
| 2 | DET-16 propagacion | pass | Test-only aditivo; nada que propagar (no toca interface/consumers) |
| 3 | DET-23 calidad consolidada | pass | Asserts concretos; sin false-positive; patron espeja el polimorfico |
| 4 | Scope | pass | Unico archivo dentro de object-manager/; sin tocar produccion |
| 5 | Rama | pass | UPONE-1206 (epica, no protegida); sin commits a develop/master/main |

**Gate decision:** (approvedBy: dev)

- [x] continue → cierre del ticket (status: closed — ultima session del plan)
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Tiempo invertido**: ~0.5h efectivos
**Contexto retomable**: ticket cerrado — e2e verde, DB restaurada, teach-close generado, spec done.
**Commit DET-27**: n/a — session de cierre records-only (sin codigo); records dkc en commit final de cierre

## Test cases

> Preliminar — se refina en design.

| # | Case | REQ | Affects UI | Actual | Evidence | Status | Session | Cambios |
|---|------|-----|-----------|--------|----------|--------|---------|---------|
| TC-01 | Clonar padre con hijos de relacion directa → hijos clonados con FK al nuevo padre, id/timestamps frescos | REQ-IMPROVE-01 | no | Escenario A: 3 hijos (parentId=P.id, FK real) clonados a newParent; 3 filas con parentId=P2.id, ids frescos, createdAt Date; fuente intacta | `vitest run tests/e2e/clone-direct-children.test.js` it(A) verde | pass | S1 | — |
| TC-02 | recursiveBy: jerarquia preservada (root antes que hijos, self-ref remapeado) | REQ-IMPROVE-01 | no | Escenario B: arbol de 5, clonado a DST; parentId remapeado por nombre (Root null, Branch→s1, Leaf→s2/s3), fuente intacta | it(B) verde | pass | S1 | — |
| TC-03 | Mapa oldId→{newId,type} consistente y expuesto | REQ-IMPROVE-01 | no | cloneMap.size 3 (A) / 5 (B); cada entry type=CurricularSection, newId!=oldId | asserts en it(A) e it(B) | pass | S1 | — |
| TC-04 | DB restaurada al estado previo tras el test (sin residuo) | REQ-PRESERVE-01 | no | Escenario C: count(recordType=RUN_TAG)>0 pre-teardown; ==0 post deleteMany; count por ownerId tambien 0 | it(C) verde | pass | S1 | — |
| TC-05 | Suite existente (incl. e2e polimorfico) sin regresion | REQ-PRESERVE-02 | no | Suite e2e completa 4/4 verde (clone-activity-polymorphic 1 + clone-direct-children 3) | `vitest run tests/e2e` → 2 files, 4 tests passed | pass | S1 | — |

## Backlog

> Vacio.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El bloque `directChildren` se inyecta inline al helper `deepCloneDirectChildren` (igual que el polimorfico) → un e2e del caso directo no necesita tocar JSON ni codegen; vuelve moot H2 | developer | S1 | refined | DEC-LOCAL-01 + teach-close |
| L2 | `CurricularSection` (UPU) cubre ambas ramas del caso directo con seed minimo: self-ref FK real `parentId` para recursiveBy + `ownerId` como fk plano | developer | S1 | refined | DEC-LOCAL-01 + teach-close |

## Teaching — Intake

**Status**: done
**Archivo**: `tickets/TICKET-047.teach/teach-intake.html` (v2 HTML, validado)
**Decision 0b**: generate (autopilot=super, skip no permitido por REQ-05)

## Teaching — Close

**Status**: done
**Archivo**: `tickets/TICKET-047.teach/teach-close.html` (v2 HTML, validado)
**Decision**: generate (autopilot=super, skip no permitido por REQ-05)

## Commits

| Hash | Fecha | Header | Tasks | REQs |
|------|-------|--------|-------|------|
| `c5b3429` | 2026-06-01 | test(clone): e2e directChildren contra DB real — TICKET-047 S1 (object-manager) | S1.T2 | REQ-IMPROVE-01, REQ-PRESERVE-01, REQ-PRESERVE-02 |
| `5f078b8` | 2026-06-01 | chore(dkc): TICKET-047 S1 — spec + teach-intake + records | S1.T1-T3 | — |
| `5f6ef52` | 2026-06-01 | chore(dkc): TICKET-047 S1.GATE — quality review + gate decision (records) | S1.GATE | — |

## Summary

### What was requested
Validar e2e, contra la DB real, la rama de clonacion por relacion directa (`directChildren`) que TICKET-037 dejo solo unit-tested con mocks — de forma autocontenida y sin residuo.

### What was done
- Nuevo e2e `object-manager/tests/e2e/clone-direct-children.test.js` que clona contra Postgres real (UPU) un padre con hijos de relacion directa, en 2 escenarios: (A) FK directa real `parentId` sin recursion; (B) `recursiveBy` con remap topologico del self-ref. Tercer test verifica teardown sin residuo.
- El bloque `directChildren` se inyecta inline (sin tocar JSON de objeto ni codegen), reusando el modelo real `CurricularSection`. Cero cambios de produccion.
- Suite e2e completa 4/4 verde (incluido el polimorfico). DB restaurada (count sentinel == 0).

### What was learned
- Learns capturados: 2 (2 refined, 0 discarded) — ver L1, L2.
- Rules creadas: ninguna.
- Decisions tomadas: DEC-LOCAL-01 (inline directChildren sobre CurricularSection real; H4 resuelta).
- Bugs encontrados: ninguno.

### Metrics
| Metric | Value |
|--------|-------|
| Sessions | 2 |
| Tasks completed | 5/5 (S1.T1-T3 + 2 GATE) |
| Commits | 3 (+1 cierre) |
| Learns captured | 2 |
| Learns → decisions | 1 (DEC-LOCAL-01, inline en spec) |
| Test cases | 5 pass / 0 fail / 0 pending |
| Failed approaches | 0 |
| SP | external null → DET-26 N/A (executed_method: skip) |

### Acceptance
| Checkpoint | Status | Detail |
|------------|--------|--------|
| Funcional | pass | REQ-IMPROVE-01 (A+B), REQ-PRESERVE-01, REQ-PRESERVE-02 cumplidos |
| Coverage | pass | 3/3 REQs con test (TC-01..TC-05) |
| Tests | pass | 5 TCs pass; suite e2e 4/4 |
| Regression | pass | e2e polimorfico sigue verde |
| Rules | pass | RULE-dev-004 (rama epica UPONE-1206) respetada |
| Docs | n/a | cambio test-only |

### Artefactos generados
- Spec: SPEC-object-manager-improve-directchildren-e2e (status: done)
- Test: object-manager/tests/e2e/clone-direct-children.test.js
- Teach: teach-intake.html + teach-close.html
- Commits: c5b3429 (test), 5f078b8 + 5f6ef52 (records dkc)

### Pendiente
Ninguno. Backlog vacio.
