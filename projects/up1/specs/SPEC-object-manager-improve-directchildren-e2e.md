---
id: SPEC-object-manager-improve-directchildren-e2e
project: up1
ticket: TICKET-047
status: done
---

# Validar e2e la rama deepClone de relacion directa (directChildren) — autocontenido

# Validar e2e la rama deepClone de relacion directa (directChildren) — autocontenido

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Tasks). Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: el motor de clonacion de objetos (`deepClone`) tiene una rama para hijos de relacion **directa** (FK simple, bloque `metadata.directChildren`) que TICKET-037 entrego solo con unit tests sobre mocks. No tiene consumidor real en SP3 (el unico caso del sprint, Activity→CurricularSection, es polimorfico y ya tiene e2e). Este ticket cierra la brecha: un test end-to-end que clona contra la **DB Docker real**, verifica que las FK repunten al nuevo padre y que la jerarquia/mapa sean consistentes, y deja la DB **sin residuo**. Es trabajo de cobertura — no toca codigo de produccion.

**Decisiones criticas que necesitan tu OK** (racional en Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Inyectar el bloque `directChildren` **inline** en el test (no leerlo de un JSON real) y reusar el modelo real `CurricularSection` de UPU — sin fixture object def, sin codegen, sin editar JSON | Es el patron exacto del e2e polimorfico ya verde (`clone-activity-polymorphic.test.js`): pasa el bloque declarativo directo al helper, evitando `readDirectChildren`. Elimina codegen, edicion de JSON y el reset canonico — el teardown es solo borrado de filas por sentinel. Mas barato y mas faithful que crear un objeto fixture |
| 2 | Cubrir **dos escenarios** sobre CurricularSection: (A) FK directa real `parentId` sin `recursiveBy` — integridad referencial enforced por Postgres; (B) `fk: ownerId` + `recursiveBy: parentId` — match por un solo campo + remap topologico del self-ref | Un solo modelo cubre las dos ramas del helper (repoint de FK plana + walk topologico recursivo) con datos baratos de seedear. Escenario A aporta el FK con constraint real de DB; B aporta la jerarquia recursiva |

**Riesgos principales y como los mitigamos**:

- **Dejar filas residuales en la DB compartida del sprint** → teardown doble por sentinel (`recordType = RUN_TAG` + `ownerId in [SRC, DST]`) en `afterAll`, replicando el patron probado del e2e polimorfico; TC-04 verifica conteo 0 post-test.
- **El test queda rojo en CI si la DB no esta arriba** → guard `isDbReady` (probe en `beforeAll`); si la tabla no existe, cada `it` retorna temprano con warning (no rojo por prerequisito faltante) — mismo patron que el polimorfico.
- **Romper la suite existente** → S1.T3 corre la suite e2e completa (incluido el polimorfico) como gate; REQ-PRESERVE-02.

**Que NO se hace en este ticket** (limites explicitos del scope):

- NO se crea un objeto fixture nuevo ni se declara `directChildren` en un JSON de objeto real (innecesario — el bloque va inline; ver DEC-LOCAL-01).
- NO se toca codigo de produccion (`deep-clone-direct.js`, resolver). Es cobertura de test pura.
- NO se ejercita el camino file-based `readDirectChildren` (queda cubierto por unit tests de 037; el e2e prueba el helper de clonacion, no la lectura del bloque).
- NO se usa un par cross-model real (Workflow←WorkflowTransition, etc.) por costo de seed (FK requeridas extra); ver alternativas descartadas en DEC-LOCAL-01.

**Tamano estimado**: 2 sessions, ~1.5-2h efectivas. La mas riesgosa es S1 (e2e contra DB real + teardown sin residuo). S2 es cierre liviano.

**Como vas a saber que funciona**:

- Corres `vitest tests/e2e/clone-direct-children.test.js` y los 2 escenarios pasan en verde contra la DB Docker.
- Tras correr la suite, consultas la DB y NO hay filas con el sentinel del run (DB restaurada).
- La suite e2e completa (incluido `clone-activity-polymorphic.test.js`) sigue verde.

---

## Purpose

Agregar cobertura end-to-end a la rama `deepCloneDirectChildren` del motor de clonacion del object-manager, validandola contra la DB Postgres real (Docker, tenant UPU) en vez de solo mocks. El test es autocontenido: seedea su escenario, clona via el mismo helper que invoca el resolver, verifica el repoint de FK / jerarquia / mapa, y restaura la DB. Sin cambios de produccion.

## Requirements

### REQ-IMPROVE-01: e2e de la rama directa contra DB real

> **Que cambia**: la rama `deepCloneDirectChildren` (hijos por FK simple) pasa de "solo unit con mocks" a tener un e2e que la ejercita contra Postgres real, igual que el polimorfico ya lo tiene.
> **Por que**: hoy esa rama no tiene red de seguridad e2e — un refactor del motor podria romperla sin que ningun test contra DB real lo note.

El sistema (suite de tests) MUST incluir un e2e que clona, contra la DB real, un padre con hijos de relacion directa declarados via bloque `directChildren` inline, cubriendo: (A) FK directa real sin `recursiveBy`, y (B) `recursiveBy` con remap topologico del self-ref.

**Actor**: system (test suite)
**Layers**: backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario A: FK directa plana (parentId real, sin recursiveBy)
- **GIVEN** una `CurricularSection` padre P y N hijos con `parentId = P.id` (FK self-ref real, enforced por Postgres)
- **WHEN** se clona via `deepCloneDirectChildren({ directChildren: [{name:'children', object:'CurricularSection', fk:'parentId'}], aliases:['children'], sourceId: P.id, newOwnerId: P2.id })`
- **THEN** se crean N clones con `parentId = P2.id` (FK repuntada al nuevo padre), ids y timestamps frescos
- **AND** el arbol fuente queda intacto (el clon no muta el origen)

#### Scenario B: recursiveBy (fk: ownerId + self-ref parentId)
- **GIVEN** un arbol de secciones bajo `ownerId = SRC` con jerarquia interna via `parentId` (root → ramas → hojas)
- **WHEN** se clona via `deepCloneDirectChildren({ directChildren: [{name:'sections', object:'CurricularSection', fk:'ownerId', recursiveBy:'parentId'}], aliases:['sections'], sourceId: SRC, newOwnerId: DST })`
- **THEN** todos los clones tienen `ownerId = DST` y la jerarquia se preserva con `parentId` remapeado al **nuevo** id del padre logico (no al viejo)
- **AND** el root clonado tiene `parentId = null`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: corre `vitest tests/e2e/clone-direct-children.test.js` y ve los 2 escenarios en verde contra la DB Docker.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | FK plana real | padre P + 3 hijos con parentId=P.id | clonar a P2 | hijos clonados con parentId=P2.id | cloneMap.size==3, cada parentId==P2.id |
| 2 | recursiveBy | arbol 5 secciones ownerId=SRC, tree via parentId | clonar a DST | jerarquia remapeada | 5 clones ownerId=DST, parentId remapeado por nombre |
| 3 | mapa consistente | cualquiera de A/B | tras clonar | Map<oldId,{newId,type}> | type=='CurricularSection', newId!=oldId para cada fuente |

### REQ-PRESERVE-01: test autocontenido — DB restaurada sin residuo

> **Que cambia**: el test limpia todo lo que crea; tras correrlo la DB queda como estaba.
> **Por que**: la DB Docker es compartida durante el sprint — residuo contaminaria otros tests/datos.

El sistema (test) MUST restaurar la DB al estado previo en `afterAll`, borrando todas las filas que seedeo o clono, identificadas por un sentinel unico del run.

<details><summary>Scenarios de validacion</summary>

#### Scenario: teardown sin residuo
- **GIVEN** un run que seedeo + clono filas con `recordType = RUN_TAG` y `ownerId in [SRC, DST]`
- **WHEN** termina el test (`afterAll`)
- **THEN** un `deleteMany` por `OR: [{recordType: RUN_TAG}, {ownerId: {in:[SRC,DST]}}]` elimina todas esas filas
- **AND** un conteo post-teardown de filas con el sentinel devuelve 0

</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras la suite, consulta la DB por el sentinel del run y obtiene 0 filas.

### REQ-PRESERVE-02: sin regresion en la suite existente

> **Que cambia**: la suite completa, incluido el e2e polimorfico, sigue verde.
> **Por que**: agregar cobertura no debe romper lo que ya funciona (DET-7).

El sistema (suite) MUST seguir pasando en verde, incluido `tests/e2e/clone-activity-polymorphic.test.js`, tras agregar el nuevo e2e.

#### Acceptance
**El usuario puede verificar que funciona**: corre la suite e2e completa y todo pasa.

## Tasks

### Session 1 — e2e directChildren + teardown/restore [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Baseline de cobertura: documentar que la rama directa esta solo unit-tested (mocks), que no hay e2e, y confirmar modelo elegido (CurricularSection UPU) + campos de seed minimos | REQ-IMPROVE-01 | researcher | — | (read-only: deep-clone-direct.js, schema.prisma UPU) | estado documentado en ## Decisions / ticket | (no aplica) | DET-1, DET-2, DET-11 | done | 1 |
| S1.T2 | Implementar e2e `clone-direct-children.test.js`: escenario A (FK real parentId, sin recursiveBy) + escenario B (fk ownerId + recursiveBy parentId), bloque directChildren inline, seed + clone via deepCloneDirectChildren + asserts FK/jerarquia/mapa + teardown por sentinel | REQ-IMPROVE-01, REQ-PRESERVE-01 | developer | S1.T1 | object-manager/tests/e2e/clone-direct-children.test.js | TC-01, TC-02, TC-03, TC-04 | git rm tests/e2e/clone-direct-children.test.js | DET-2, DET-7, DET-8 | done | 1 |
| S1.T3 | Correr e2e contra DB Docker real + verificar DB restaurada (conteo sentinel == 0) + correr suite e2e completa (incl. polimorfico) sin regresion | REQ-PRESERVE-01, REQ-PRESERVE-02 | reviewer | S1.T2 | (ejecucion: vitest tests/e2e/) | TC-01..TC-05 verdes; filas RUN_TAG == 0 post-test | (no aplica) | DET-5, DET-7, DET-13, DET-14 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T3)** — persistir resultados + TCs inline en ticket (Template de Gate + DET-25), quality review exhaustive (DET-23), decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decision documentada + TCs con evidence | (no aplica — cierre de session) | DET-20, DET-23, DET-25 | done | 1 |

### Session 2 — cierre [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Cierre via request-close: teach-close (DET-22) + commits granulares DET-27 (repo codigo: test e2e; repo dkc: spec/ticket/teach) | — | reviewer | S1.GATE | object-manager test + dkc records | suite verde; teach-close validado | (no aplica) | DET-22, DET-27 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T1)** — verificar acceptance checkpoints + cierre evidencia-based (DET-13) | — | reviewer | S2.T1 | ticket | gate persistido + acceptance OK | (no aplica) | DET-20, DET-23 | done | 2 |

### Task contract

```
Task S1.T2: Implementar e2e clone-direct-children.test.js
- source_ref: REQ-IMPROVE-01, REQ-PRESERVE-01
- agent: developer
- files: object-manager/tests/e2e/clone-direct-children.test.js
- precondition: S1.T1 (baseline + modelo confirmado)
- expected_output: archivo de test con 2 it() (escenario A + B), bloque directChildren inline, seed/clone/assert/teardown por sentinel; espejo estructural de clone-activity-polymorphic.test.js
- validation: TC-01, TC-02, TC-03, TC-04 (correr en S1.T3)
- rollback: git rm tests/e2e/clone-direct-children.test.js
- rules: [DET-2, DET-7, DET-8]
```

## Constraints

- RULE-dev-004: trabajo en object-manager → rama epica `UPONE-1206`. Commits con prefijo `TICKET-047` (external null, DET-19).
- SPEC-object-manager-hu2-prefillfrom-declarative (037): define `directChildren` + `deepCloneDirectChildren`. Esta spec NO la modifica — la cubre con e2e.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| DB Docker `pg` (tenant UPU) | internal | Postgres con tabla CurricularSection generada | si no esta arriba, el test hace skip via guard isDbReady (no rojo) |
| Prisma client UPU generado | internal | `prisma/UPU/generated/index.js` con modelo curricularSection | si falta generate, importar falla — correr prisma generate |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Filas residuales en DB compartida | medium | contamina datos/tests del sprint | teardown doble por sentinel (recordType + ownerId) en afterAll; TC-04 verifica conteo 0 |
| Test rojo si DB no esta arriba | low | falso negativo en CI | guard isDbReady con probe en beforeAll; early-return con warning |
| Escenario B usa ownerId (no FK enforced) | low | menor fidelidad del caso recursivo | escenario A aporta el FK real enforced (parentId); B aporta el remap topologico — juntos cubren ambas dimensiones |

## Open questions

(ninguna — H4 resuelta en DEC-LOCAL-01)

## Decisions

### DEC-LOCAL-01: e2e con directChildren inline sobre CurricularSection real, sin fixture ni codegen
- **Contexto**: H4 del intake — par directo real (declarar directChildren en un JSON) vs objeto fixture nuevo vs reuso de modelo real con bloque inline. Decidida en design (autopilot=super: decidir + documentar).
- **Drivers**: (a) el e2e polimorfico (`clone-activity-polymorphic.test.js`) prueba que el bloque declarativo se pasa **inline** al helper, sin invocar `readObjectMetadataBlock`/`readDirectChildren` → no hace falta tocar ningun JSON ni hacer codegen; (b) CurricularSection ya esta presente en UPU y se seedea con solo `ownerType/ownerId/recordType/name` (costo minimo, probado); (c) CurricularSection tiene un self-ref FK real (`parentId`) → permite cubrir `recursiveBy` con integridad referencial enforced por Postgres.
- **Opcion elegida**: escribir el e2e reusando el modelo real `CurricularSection` con el bloque `directChildren` inyectado inline en el test. Dos escenarios: A (fk=parentId real, sin recursiveBy) y B (fk=ownerId + recursiveBy=parentId).
- **Alternativas descartadas**:
  - *Declarar directChildren en un JSON de objeto real + leerlo file-based*: innecesario — el helper de clonacion recibe el bloque inline; el camino `readDirectChildren` ya esta cubierto por unit tests de 037. Evita git checkout de un JSON modificado.
  - *Crear objeto fixture nuevo (parent+child minimo)*: implica codegen + schema en el tenant + teardown/reset mas pesado. Mayor costo, menor fidelidad.
  - *Par cross-model real (Workflow←WorkflowTransition / Activity←InstructorCourseAssignment / Offering←OfferingEnrollment / Event←Event)*: faithful pero seed costoso por FK requeridas extra (WorkflowStatus, Instructor, Offering, etc.). CurricularSection da un caso igual de valido con seed trivial.
- **Consecuencias**: gana simplicidad (cero JSON/codegen, teardown por sentinel), fidelidad (modelo + FK reales). Pierde: el escenario B usa `ownerId` (no FK enforced) como campo de enlace — mitigado por el escenario A que usa el FK real `parentId`.
- **Session**: design (pre-S1).

## Acceptance checkpoints

- [ ] **Funcional**: escenarios A y B de REQ-IMPROVE-01 pasan contra DB real
- [ ] **Tests**: `clone-direct-children.test.js` verde (2 it())
- [ ] **Integration**: suite e2e completa verde, incluido `clone-activity-polymorphic.test.js` (REQ-PRESERVE-02)
- [ ] **Sin residuo**: conteo de filas con sentinel del run == 0 post-teardown (REQ-PRESERVE-01)
- [ ] **Rules**: RULE-dev-004 (rama epica), DET-7 (regression), DET-8 (rollback documentado)

## Technical reference

- Helper bajo prueba: `src/graphql/resolvers/helpers/deep-clone-direct.js` → `deepCloneDirectChildren({ prisma, directChildren, aliases, sourceId, newOwnerId, exclude })`. Devuelve `Map<oldId, {newId, type}>`. Lanza si `directChildren` vacio o alias inexistente. Omite `id/createdAt/updatedAt`, repunta `rest[fk] = newOwnerId`, y si hay `recursiveBy` ordena topologicamente y remapea el self-ref al nuevo id del padre (o null si fuera del set).
- Patron de referencia: `tests/e2e/clone-activity-polymorphic.test.js` (sentinel RUN_TAG, guard isDbReady, seed root-first, asserts por nombre, teardown OR sentinel).
- Modelo: `prisma/UPU/schema.prisma` model `CurricularSection` (id cuid, ownerType enum, ownerId String, recordType String, name String, parentId String? self-ref FK `CurricularSection_CurricularSection_parentId`).

## Rules discovered

(se llena durante ejecucion)

## Bugs found

(se llena durante ejecucion)
