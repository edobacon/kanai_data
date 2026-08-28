---
id: SPEC-curriculum-design-restitute-datalog-batch-planentry
project: up1
ticket: TICKET-127
status: done
---

# Fix: restituir la auditoria DataLog en los resolvers batch de planEntry

# Fix: restituir la auditoria DataLog en los resolvers batch de planEntry

## Executive summary — lo que estas aprobando

**Que se quiere**: `createPlanEntriesBatch` y `deletePlanEntriesBatch` persisten con `tx.planEntry.create|delete` directo (no delegan en el CRUD generico) para preservar la garantia todo-o-nada sobre los side-effects. Al no delegar se saltan el decorator `withDataLog`, asi que sus filas no quedan en el historial (`core_DataLog`), mientras el alta/borrado unitario de planEntry (via `createInstance`/`deleteInstance`) si se audita. Se restituye la auditoria llamando el helper del core `recordMutationDataLog` post-commit, por fila, best-effort. Cierra la mitad de audit del backlog B5 (la mitad de eventos ya esta cerrada por `planEntryEvent.js`).

**Decisiones criticas que necesitan tu OK**: ninguna nueva. El enfoque (A por-fila, restituir en vez de opt-out) ya lo aprobo el dev. Se descarto `enableDataLog:false` porque quitaria la auditoria que hoy si tiene el path unitario (regresion de cobertura).

**Riesgos principales y como los mitigamos**:
- **Que un fallo de auditoria rompa la mutacion** → el helper es best-effort (try/catch por fila con warn), igual que `planEntryEvent.js`; `recordMutationDataLog` del core tambien es best-effort. Un fallo de DataLog nunca revierte la mutacion.
- **Que la auditoria corra dentro de la `$transaction` y contamine la atomicidad** → se llama POST-commit (fuera de la tx), igual que los eventos, tal como el core invoca `recordMutationDataLog` fuera de tx.
- **Divergencia con el shape del path unitario** → el shape incluye `args` (create: `args:{data:row}`, `result:row`, `previous:null`; delete: `args:{id:row.id}`, `previous:row`), verificado linea por linea contra `withDataLog.js` (recordId de delete = `args.id` `:254`; atribucion de create accede `args.data` `:299`). El spec-judge (DET-38) atrapo un shape inicial sin `args` que habria dejado create sin escribir y delete sin `historyKey`; corregido.

**Que NO se hace en este ticket**:
- No se toca el core (object-manager). El helper solo IMPORTA `recordMutationDataLog` por dual-path.
- No se cambia el contrato GraphQL de las mutations (siguen devolviendo `[ID!]`).
- No se implementa el hardening server-side de la cascada del delete (backlog `could`, dimensionado aparte).
- No se cambia la politica de auditoria del path unitario (sigue ON).

**Tamano estimado**: 1 session (T2), aproximadamente 1h efectiva. Parte sensible: paridad de argumentos con el path unitario + best-effort.

**Como vas a saber que funciona**:
- `vitest run` del mod verde: las suites existentes (>= 1559) + los nuevos `planEntryDataLog.test.js` y `planEntryDataLog.realcore.test.js`.
- El test mockeado asevera: 1 llamada a `recordMutationDataLog` por fila, con `args.data`=row en create y `args.id`=row.id en delete, y que un fallo del audit no propaga.
- El test no-mockeado (core real + prisma fake) asevera que la entry escrita en `core_DataLog` lleva `recordId` y `historyKey` poblados (cierra el gap mock-only que marco el spec-judge).
- `typecheck` (vue-tsc) limpio.

---

## Purpose

Restituir la auditoria DataLog en los resolvers batch de planEntry del mod curriculum-design. Hoy `createPlanEntriesBatch` / `deletePlanEntriesBatch` no delegan en el CRUD generico y se saltan el decorator `withDataLog`, por lo que sus filas no se auditan en `core_DataLog`, a diferencia del alta/borrado unitario de planEntry que si se audita. Es la mitad de audit del backlog B5 (TICKET-120 / UPONE-1539); la mitad de eventos ya quedo cubierta por `planEntryEvent.js`. Origen: hallazgo S2 de la review dkc-dredd de UPONE-1539.

## Requirements

### REQ-FIX-01: los batch auditan cada fila post-commit

> **Que cambia**: `createPlanEntriesBatch` y `deletePlanEntriesBatch` registran un DataLog por cada fila creada/borrada, con el mismo shape que el path de instancia unica, DESPUES del commit.
> **Por que**: al no delegar en el CRUD generico se saltan `withDataLog`; el invariante del core (`withDataLog.js:26-31`) exige que un resolver no-delegante llame `recordMutationDataLog(...)` o su mutacion no se audita.

El sistema MUST registrar en `core_DataLog` una entrada por cada fila que el batch crea o borra, invocando `recordMutationDataLog` del core POST-commit (fuera de la `$transaction`), por fila. El `objectType` MUST ser `planEntry`.

Shape de argumentos (verificado contra `withDataLog.js`, linea por linea):
- **create**: `{ operation:'create', objectType:'planEntry', args:{ data: fila }, result: fila, previous: null }`. `recordId` sale de `result.id` (`buildEntry` `:230`), pero el bloque de atribucion accede `args.data` (`:299`) — por eso `args` MUST estar definido: con `args` undefined lanza TypeError, el core lo traga best-effort (`:319-321`) y NO escribe.
- **delete**: `{ operation:'delete', objectType:'planEntry', args:{ id: fila.id }, result: fila, previous: fila }`. `recordId` sale de **`args.id`** (`:254`), NO de `previous.id`; sin `args.id`, `recordId=null` → no se arma `historyKey` (`:313-316`) → entrada huerfana irrecuperable en el visor Historial. `previous`=fila borrada aporta el snapshot de `changes` (`:256`).

El campo `args` es OBLIGATORIO en ambos casos. Esta es la correccion del spec-judge (DET-38): el shape sin `args` da tests mockeados verdes con runtime roto.

**Actor**: system (resolver batch)
**Layers**: logic (resolvers del mod), database (core_DataLog via core)

<details><summary>Scenarios de validacion</summary>

#### Scenario: create batch audita por fila
- **GIVEN** un lote de N planEntry creadas
- **WHEN** el resolver termina (post-commit)
- **THEN** `recordMutationDataLog` se invoca N veces, cada una con `operation='create'`, `objectType='planEntry'`, `args={ data: fila }`, `result`=fila, `previous=null`

#### Scenario: delete batch audita por fila con previous
- **GIVEN** un lote de N planEntry borradas
- **WHEN** el resolver termina (post-commit)
- **THEN** `recordMutationDataLog` se invoca N veces, cada una con `operation='delete'`, `args={ id: fila.id }`, `previous`=fila borrada (snapshot)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: los tests unit aseveran las N llamadas por fila con el shape correcto. (Opcional, no en alcance de este ticket: smoke de integracion contra BD real confirmando filas en `core_DataLog`.)

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | create audita por fila con args.data | 2 records create | helper post-commit | 2 llamadas create, `args.data`=fila, result=fila, previous null | TC-01 verde |
| 2 | delete audita por fila con args.id | 1 record delete | helper post-commit | 1 llamada delete, `args.id`=fila.id, previous=fila | TC-02 verde |
| 3 | core real escribe con recordId + historyKey | fila create y fila delete | `recordMutationDataLog` REAL del core + prisma fake | `core_DataLog.create` recibe entry con `recordId`=fila.id y `historyKey`=`planEntry:{id}` en ambos | TC-06 verde (no-mockeado) |

### REQ-FIX-02: la auditoria es best-effort (no rompe la mutacion)

> **Que cambia**: un fallo al auditar (core no cargable, error de escritura) se loguea y se ignora; la mutacion no se revierte ni corta.
> **Por que**: la auditoria es un side-effect secundario; nunca debe tumbar una operacion de negocio ya committeada. Mismo contrato defensivo que `planEntryEvent.js`.

El sistema MUST contener cualquier fallo de la auditoria: cada emision va en try/catch con `console.warn`, y si el helper del core no se puede cargar, degrada silencioso sin lanzar. El wrapper batch MUST nunca lanzar. Un lote vacio o no-array MUST no invocar nada.

**Actor**: system
**Layers**: logic

#### Acceptance
**El usuario puede verificar que funciona**: TC-03 (un mock que rechaza no propaga y no corta el resto) y TC-04 (lote vacio/no-array = 0 llamadas) verdes.

### REQ-REGRESSION-01: RBAC, eventos, atomicidad y contrato intactos

> **Que cambia**: nada del comportamiento existente de los batch.
> **Por que**: DET-7 — el fix es aditivo; no debe alterar la restitucion de RBAC, la emision de eventos, la garantia todo-o-nada ni el contrato de retorno.

El sistema MUST preservar: (a) el check RBAC (`checkObjectPermissions` create/delete) antes de la transaccion; (b) la emision de eventos post-commit (`publishPlanEntryEvents`); (c) la garantia todo-o-nada (`$transaction`); (d) el retorno `[ID!]` (ids). La llamada de auditoria se agrega POST-commit, despues de `publishPlanEntryEvents`, sin alterar el orden ni el resultado.

**Actor**: system
**Layers**: logic

#### Acceptance
**El usuario puede verificar que funciona**: las suites existentes (`planEntryBatch`, `planEntryDeleteBatch`, `planEntryEvent`, `*-rbac`) siguen verdes; el `vitest run` del mod no baja de 1559 tests.

## Fix scope

### Antes (comportamiento actual)
Los batch persisten con `tx.planEntry.create|delete` directo y restituyen RBAC + eventos, pero NO DataLog. Sus filas no aparecen en `core_DataLog`; el alta/borrado unitario si.

### Despues (comportamiento esperado)
Los batch, ademas de RBAC + eventos, invocan `recordMutationDataLog` post-commit por fila. La traza de auditoria del batch queda a la par del path unitario.

### Archivos afectados
| File | Change | Impact |
|------|--------|--------|
| `logic/planEntryDataLog.js` (NUEVO) | Helper: loader dual-path de `recordMutationDataLog` + `recordPlanEntryDataLogs({operation, records, context})` que emite por fila best-effort | Aditivo. Espeja `planEntryEvent.js` |
| `logic/planEntry-batch.resolver.js` | import + 1 llamada `recordPlanEntryDataLogs({operation:'create', records:created, context})` post-commit, tras `publishPlanEntryEvents` | Aditivo. No cambia RBAC/eventos/contrato |
| `logic/planEntry-delete-batch.resolver.js` | import + 1 llamada `recordPlanEntryDataLogs({operation:'delete', records:deleted, context})` post-commit, tras `publishPlanEntryEvents` | Aditivo |
| `tests/unit/planEntryDataLog.test.js` (NUEVO) | Tests unit espejando `planEntryEvent.test.js` (mock de `recordMutationDataLog`), asertando args.data/args.id | Nuevo |
| `tests/unit/planEntryDataLog.realcore.test.js` (NUEVO) | Test no-mockeado: core real + prisma fake, aserta recordId + historyKey (cierra el gap mock-only) | Nuevo |
| `docs/reference/graphql-mutations.md` | Agregar DataLog a los side-effects listados de ambos batch (hoy lista RBAC y eventos) | Doc |

### Auditoria de reemplazo (DET-40)
**N/A — cambio puramente aditivo.** No se retira ni reenruta ningun camino de codigo: se agrega una llamada post-commit. RBAC, eventos, atomicidad y contrato de retorno quedan intactos (REQ-REGRESSION-01 los cubre). Registro: `replacement-audit not-applicable`.

### Necesidad y reuso (DET-32, light por ser fix)
- La auditoria YA existe en el core (`recordMutationDataLog`): se REUSA (no se reimplementa).
- El helper nuevo es un adaptador delgado (dual-path load + loop por fila): BUILD minimo justificado — evita duplicar el loader dual-path inline en los dos resolvers (DRY) y espeja `planEntryEvent.js`. Verdict: `reuse` (mecanismo core) + `build` minimo (adaptador). No hay dep/stdlib que lo cubra.

## Tasks

### Session 1 — Restituir DataLog en los batch + tests + doc [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `logic/planEntryDataLog.js`: loader dual-path de `recordMutationDataLog` (mismo patron que `polymorphicUpdate.resolver.js:184-200`) + `recordPlanEntryDataLogs({operation, records, context})` que emite por fila best-effort. **create**: `args:{data:row}`, `result:row`, `previous:null`. **delete**: `args:{id:row.id}`, `result:row`, `previous:row`. El `args` es obligatorio (recordId de delete sale de args.id; create accede args.data) | REQ-FIX-01, REQ-FIX-02 | developer | — | logic/planEntryDataLog.js | archivo existe; export `recordPlanEntryDataLogs`; typecheck ok | git rm archivo | DET-2, DET-32 | done | 1 |
| S1.T2 | Wire en los 2 resolvers: import + 1 llamada post-commit tras `publishPlanEntryEvents` (create y delete) | REQ-FIX-01, REQ-REGRESSION-01 | developer | S1.T1 | logic/planEntry-batch.resolver.js, logic/planEntry-delete-batch.resolver.js | diff aditivo; RBAC/eventos/return intactos | git checkout archivos | DET-16, DET-40 | done | 1 |
| S1.T3 | Tests unit `tests/unit/planEntryDataLog.test.js` espejando `planEntryEvent.test.js` (mock del core): TC-01 create por fila **aserta args.data=row** + result + previous null, TC-02 delete por fila **aserta args.id===row.id** + previous=row, TC-03 best-effort no propaga, TC-04 lote vacio/no-array | REQ-FIX-01, REQ-FIX-02 | developer | S1.T1 | tests/unit/planEntryDataLog.test.js | `vitest run` incluye los 4 TC verdes | git rm archivo | DET-7 | done | 1 |
| S1.T3b | Test no-mockeado `tests/unit/planEntryDataLog.realcore.test.js`: driver el helper con el `recordMutationDataLog` REAL del core (sin mock) + prisma fake (`core_DataLog.create` = spy), aserta que la entry escrita tiene `recordId`=row.id y `historyKey`=`planEntry:{id}` para create y delete (TC-06). Cierra el gap "mock consagra runtime roto". Si `resolveAttribution` no es aislable con prisma fake, documentar por que y dejar TC-01/TC-02 (asercion de args) como guard primario | REQ-FIX-01 | developer | S1.T1 | tests/unit/planEntryDataLog.realcore.test.js | TC-06 verde (recordId + historyKey poblados via core real) | git rm archivo | DET-7, DET-33 | done | 1 |
| S1.T4 | Doc: agregar DataLog a los side-effects de ambos batch en `docs/reference/graphql-mutations.md` | REQ-FIX-01 | developer | S1.T2 | docs/reference/graphql-mutations.md | doc menciona DataLog post-commit por fila en ambas mutations | git checkout archivo | DET-37 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions` del ticket, correr `vitest run` + typecheck, quality review (DET-23), verificar self-report (DET-33), decidir continue/iterate/escalate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T3b, S1.T4 | ticket | vitest verde (>= 1559 + nuevos) + typecheck + gate persistido + decision | (cierre de session) | DET-13, DET-20, DET-23, DET-33 | done | 1 |

### Task contract

```
Task S1.T1: helper planEntryDataLog.js
- source_ref: REQ-FIX-01, REQ-FIX-02
- agent: developer
- files: logic/planEntryDataLog.js (NUEVO)
- precondition: rama del mod != protegida (feat/UPONE-1539-modular-mesh OK); up1-check aprobado para el archivo nuevo
- expected_output: helper con loader dual-path de recordMutationDataLog + recordPlanEntryDataLogs por fila best-effort. create: args:{data:row}, result:row, previous:null. delete: args:{id:row.id}, result:row, previous:row. args OBLIGATORIO (recordId de delete = args.id; create accede args.data en la atribucion del core)
- validation: archivo existe, export presente, typecheck ok
- rollback: git rm logic/planEntryDataLog.js
- rules: [DET-2, DET-32]
```

```
Task S1.T2: wire en los 2 resolvers
- source_ref: REQ-FIX-01, REQ-REGRESSION-01
- agent: developer
- files: logic/planEntry-batch.resolver.js, logic/planEntry-delete-batch.resolver.js
- precondition: S1.T1 done
- expected_output: import + 1 llamada post-commit tras publishPlanEntryEvents en cada resolver
- validation: diff aditivo; RBAC/eventos/return sin cambios
- rollback: git checkout de ambos archivos
- rules: [DET-16, DET-40]
```

```
Task S1.T3: tests unit planEntryDataLog.test.js
- source_ref: REQ-FIX-01, REQ-FIX-02
- agent: developer
- files: tests/unit/planEntryDataLog.test.js (NUEVO)
- precondition: S1.T1 done
- expected_output: 4 TC mockeando recordMutationDataLog por dual-path. TC-01 create: aserta args.data=row + result + previous null. TC-02 delete: aserta args.id===row.id + previous=row. TC-03 best-effort no propaga. TC-04 lote vacio/no-array = 0 llamadas
- validation: vitest run con los 4 TC verdes
- rollback: git rm tests/unit/planEntryDataLog.test.js
- rules: [DET-7]

Task S1.T3b: test no-mockeado (core real) planEntryDataLog.realcore.test.js
- source_ref: REQ-FIX-01
- agent: developer
- files: tests/unit/planEntryDataLog.realcore.test.js (NUEVO)
- precondition: S1.T1 done
- expected_output: TC-06 — driver recordPlanEntryDataLogs con el recordMutationDataLog REAL del core (sin mock) + prisma fake { core_DataLog: { create: spy }, ... }; asertar que la entry escrita tiene recordId=row.id y historyKey='planEntry:{id}' para create y delete. Fallback: si resolveAttribution no es aislable con prisma fake, documentar y apoyarse en TC-01/TC-02
- validation: vitest run con TC-06 verde (o fallback documentado)
- rollback: git rm tests/unit/planEntryDataLog.realcore.test.js
- rules: [DET-7, DET-33]
```

```
Task S1.T4: doc mutations
- source_ref: REQ-FIX-01
- agent: developer
- files: docs/reference/graphql-mutations.md
- precondition: S1.T2 done
- expected_output: DataLog agregado a side-effects de ambos batch
- validation: doc menciona DataLog post-commit por fila
- rollback: git checkout del archivo
- rules: [DET-37]
```

## Constraints

- Mod-only: NO tocar object-manager/layout/suite core. El helper solo IMPORTA `recordMutationDataLog` por dual-path.
- Sin cambio de contrato: las mutations siguen devolviendo `[ID!]`.
- best-effort: la auditoria nunca rompe la mutacion (REQ-FIX-02).
- Post-commit: la llamada corre fuera de la `$transaction`, despues de `publishPlanEntryEvents`.
- DET-3: el request del ticket no se reescribe.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Un fallo de auditoria rompe la mutacion | low | high | best-effort (try/catch por fila + degradacion si el core no carga); TC-03 lo prueba |
| La auditoria corre dentro de la tx y rompe atomicidad | low | medium | se llama post-commit, fuera de tx, tras los eventos; espeja el core |
| Divergencia de shape con el path unitario (omitir args) | medium | high | args:{data:row} en create y args:{id:row.id} en delete, verificado linea por linea contra withDataLog.js (:254 recordId=args.id, :299 args.data). TC-01/TC-02 asertan args; TC-06 (core real) confirma recordId+historyKey. Fue el hallazgo del spec-judge |
| Tests mockeados ocultan un bug de runtime | low | medium | TC-01/TC-02 asertan los campos criticos de args (no solo previous); TC-06 corre el core REAL con prisma fake y verifica recordId+historyKey. El helper es adaptador delgado (sin proyecciones RT/enums/casing) |

## Open questions

_(ninguna — enfoque y shape confirmados con el dev y verificados contra el core)_

## Acceptance checkpoints

- [ ] **Funcional**: REQ-FIX-01 y REQ-FIX-02 verificados por los TC-01..04 (args aserto) + TC-06 (core real: recordId + historyKey) (vitest verde)
- [ ] **Tests** (DET-37 dim4): `planEntryDataLog.test.js` (4 TC, mock) + `planEntryDataLog.realcore.test.js` (TC-06, core real) + regresion del mod sin delta (>= 1559)
- [ ] **Regression** (REQ-REGRESSION-01): suites existentes (batch/deleteBatch/event/rbac) verdes
- [ ] **Docs oficiales del proyecto** (DET-37 dim1): `graphql-mutations.md` actualizado (DataLog en side-effects) — MUST porque el side-effect es observable
- [ ] **KB DKC** (DET-37 dim2): actualizar B5 en TICKET-120 (mitad audit resuelta) + extender `RULE-dev-restitute-rbac-on-nondelegating-resolver` (los 3 decorators) — se propone en close
- [ ] **Docs externas DKC** (DET-37 dim3): N/A — no toca DKC
- [ ] **Planning-completeness**: entry registrada (dim1 doc MUST, dim4 tests, dim2 KB en close; dim3 N/A)
