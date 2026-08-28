---
id: TICKET-127
project: up1
type: ticket
status: closed
work_type: fix
module: curriculum-design
autopilot: autonomous
---

# Restituir auditoria DataLog en resolvers batch de planEntry

## Request

Restituir la auditoria DataLog en los resolvers batch de planEntry del mod curriculum-design (createPlanEntriesBatch / deletePlanEntriesBatch). Hoy esos resolvers no delegan en el CRUD generico (para preservar la garantia todo-o-nada sobre los side-effects) y por eso se saltan el decorator withDataLog: sus filas NO quedan en el historial, mientras que el alta/borrado unitario de planEntry (via createInstance/deleteInstance) SI se audita. Es la mitad de audit del backlog B5 de TICKET-120/UPONE-1539 (la mitad de eventos ya se cerro con planEntryEvent.js). Objetivo: que el batch deje la misma traza de auditoria que el path unitario. Origen: hallazgo de la review dkc-dredd de UPONE-1539 (S2 DataLog). Follow-up local, sin ticket Jira.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | single (mod-only) |
| Modulo principal | curriculum-design |
| Modulos afectados | curriculum-design (core object-manager solo se consume via import de recordMutationDataLog; NO se modifica) |

### Creation scope

| Dimension | Aplica | Detalle |
|-----------|--------|---------|
| creates_visual | no | sin UI nueva |
| creates_data | no | sin objeto/schema/tabla nueva; usa el objeto core_DataLog existente via recordMutationDataLog |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Los batch no auditan porque no delegan en el CRUD generico y por eso se saltan el decorator withDataLog | confirmada | `withDataLog.js:26-31` documenta el invariante: un resolver que reemplaza create/update/delete saltandose la cadena DEBE llamar `recordMutationDataLog(...)` o no se audita. `planEntry-batch.resolver.js` / `planEntry-delete-batch.resolver.js` usan `tx.planEntry.create|delete` directo y solo restituyen RBAC + eventos, no DataLog |
| H2 | El path unitario de planEntry SI audita hoy (asi que el gap es solo del batch, y apagar la auditoria seria regresion) | confirmada | El componente aun define `CREATE_PLAN_ENTRY`/`DELETE_PLAN_ENTRY` (createInstance/deleteInstance, `CurriculumMeshElement.vue:533,579`) que pasan por la cadena y auditan. `planEntry.json` no declara `enableDataLog:false` → auditoria ON por default (`withDataLog.js:78,94`) |

### Context found

**Mecanismo del core (verificado, archivo:linea):**
- `recordMutationDataLog({ operation, objectType, args, result, previous, context })` — `object-manager/src/events/decorators/withDataLog.js:281`. Async, best-effort (nunca lanza, try/catch interno `:319-321`), respeta opt-out `enableDataLog:false`, corre FUERA de cualquier `$transaction` (el decorator lo invoca post-resolver `:398`).
- Cadena de decorators: `withEventPublish → withObjectAuth → withDataLog → resolver` (`instance.resolver.js:3363-3364` create, `:4269-4270` delete).
- Invariante documentado: `withDataLog.js:26-31`.
- Default ON: `isDataLogEnabled` lee `metadata.enableDataLog !== false` (`withDataLog.js:78,94`).

**Precedente EXACTO en el mismo mod:**
- `logic/polymorphicUpdate.resolver.js:184-200` (`loadRecordMutationDataLog`) ya carga `recordMutationDataLog` del core por dynamic import dual-path, y lo llama post-writes (`:509-516`). Es el patron a replicar. Mismo dual-path que `planEntryEvent.js:27-43` (eventos).

**Backlog B5 (TICKET-120):** trade-off consciente del create/delete directo. La mitad de eventos ya se cerro (`planEntryEvent.js`, commit `9a00e22`). La mitad de audit/DataLog sigue abierta (priority `could`). La razon del diferimiento ("no hay consumer de eventos de planEntry") justificaba la mitad de eventos, no la de audit (el DataLog no depende de consumers).

**Rule relacionada:** `RULE-dev-restitute-rbac-on-nondelegating-resolver` (un resolver no-delegante debe restituir los decorators de la cadena que se saltea). Este ticket la extiende de facto a los tres (auth + eventos + DataLog).

**Warnings:** ninguno bloqueante. No hay bugs abiertos del modulo que afecten. Es un adaptador delgado; el riesgo es bajo.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | feat/UPONE-1539-modular-mesh (rama de trabajo existente de UPONE-1539, no mergeada; el fix va como follow-up ahi) |
| Base branch | develop |
| DB state | n/a para unit (helper es adaptador; core_DataLog lo maneja el core). Smoke de integracion opcional requeriria BD real |
| Services | object-manager (para el import dual-path del core en runtime); vitest para tests |
| Test data | fixtures inline en el test (records de planEntry mockeados), igual que planEntryEvent.test.js |

### Alcance (in / out)

**In scope (mod-only, cero core, sin cambio de contrato, sin migracion):**
- `logic/planEntryDataLog.js` (NUEVO): loader dual-path de `recordMutationDataLog` + emit por-fila post-commit, best-effort.
- `logic/planEntry-batch.resolver.js` (wire: import + 1 llamada post-commit tras `publishPlanEntryEvents`).
- `logic/planEntry-delete-batch.resolver.js` (wire: import + 1 llamada post-commit tras `publishPlanEntryEvents`).
- `tests/unit/planEntryDataLog.test.js` (NUEVO, espeja `tests/unit/planEntryEvent.test.js`).
- `docs/reference/graphql-mutations.md` (agregar DataLog a los side-effects de ambos batch).

**Out of scope (backlog could, NO implementar en este ticket):**
- Hardening server-side del delete-batch (re-clasificar la cascada en el servidor). Dimensionado: ~1700-1900 lineas, 2 twins JS a sincronizar (`evaluateRequirementTree`, `deletionImpact`), cambio de contrato de la mutation (agregar `targetEntryId` + flags de modo), integration real. Mod-only pero tamano mini-feature. La cascada client-side es intencional para v1 (la malla tolera estados insatisfacibles como violacion visible + RBAC gatea el delete). Se registra como decision v1 + backlog could.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | `recordMutationDataLog` exige `args` aun con result/previous: create accede `args.data` (atribucion, `withDataLog.js:299`), delete toma recordId de `args.id` (`:254`). Omitirlo deja create sin escribir (throw tragado) y delete huerfano sin historyKey. | spec-judge (DET-38) | 1 | refined | RULE-dev-restitute-rbac-on-nondelegating-resolver (extendida a los 3 decorators) |
| L2 | `configDir` del core se fija con `process.cwd()` al importar (`fileParsing.js:13`); testear el core real desde la suite del mod exige "calentar" el import de withDataLog.js con cwd mockeado a object-manager/. Artefacto del test, no de produccion. | developer | 1 | discarded | (documentado inline en planEntryDataLog.realcore.test.js; sin valor de KB extra) |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| 1 | Opt-out con `enableDataLog:false` en planEntry.json | Cerraria la brecha del batch pero QUITARIA la auditoria que hoy si tiene el path unitario (createInstance/deleteInstance). Es regresion de cobertura, no cierre del gap. Descartado a favor de restituir (A) | Restituir preserva el comportamiento; opt-out lo cambia |

## Sessions

### Plan de sessions

| Session | Objetivo | Tasks | Tier | Tipo | Criterio de cierre |
|---------|----------|-------|------|------|--------------------|
| S1 | Restituir DataLog en ambos batch (helper + wire) + tests unit + doc | S1.T1 helper `planEntryDataLog.js` (args:{data:row}/{id:row.id}); S1.T2 wire en los 2 resolvers; S1.T3 tests unit (asertan args); S1.T5 test core real (recordId+historyKey); S1.T4 doc mutations; S1.GATE | T2 | auto | vitest run verde (>= 1559 tests, +los nuevos) + typecheck + quality gate + self-report verificado |

### Session 1 — 2026-08-11 — Restituir DataLog en los batch + tests + doc [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Restituir la auditoria DataLog en createPlanEntriesBatch/deletePlanEntriesBatch via helper post-commit por fila (shape con args verificado vs core), tests unit (mock + core real) y doc de mutations.

**Tasks completadas**:
- [x] S1.T1 — helper `planEntryDataLog.js` (loader dual-path de recordMutationDataLog + recordPlanEntryDataLogs por fila best-effort; create args:{data:row}/result/previous:null, delete args:{id:row.id}/previous:row)
- [x] S1.T2 — wire en los 2 resolvers (import + 1 llamada post-commit tras publishPlanEntryEvents)
- [x] S1.T3 — tests unit `planEntryDataLog.test.js` (TC-01..04; asertan args.data/args.id)
- [x] S1.T5 — test core real `planEntryDataLog.realcore.test.js` (TC-06; recordId+historyKey)
- [x] S1.T4 — doc `graphql-mutations.md` (DataLog en side-effects de ambos batch)
- [x] S1.GATE — gate T2: vitest run + typecheck + quality review (DET-23) + self-report (DET-33)

**Validacion del tier**:
- T2 — vitest run del mod: **1565 passed / 0 failed / 0 skipped** (95 files), re-corrido por el parent (baseline 1559 + 6 nuevos). typecheck (vue-tsc --noEmit): exit 0, limpio.

**Discoveries / Learns nuevos**:
- L1: `recordMutationDataLog` del core exige `args` aun cuando `result`/`previous` alcanzan para el snapshot: create accede `args.data` en la atribucion (`withDataLog.js:299`) y delete toma `recordId` de `args.id` (`:254`). Omitirlo deja create sin escribir (throw tragado por el best-effort) y delete sin `historyKey` (huerfano). Cazado por el spec-judge (DET-38). Candidato a extender `RULE-dev-restitute-rbac-on-nondelegating-resolver`.
- L2 (test env): `configDir` del core se fija con `process.cwd()` al importar (`fileParsing.js:13`); en la suite standalone del mod hay que "calentar" el import de `withDataLog.js` con `cwd` mockeado a object-manager/ para que `isDataLogEnabled` resuelva. Artefacto del test, no de produccion (el server siempre corre con cwd=object-manager/).

**Quality review (DET-23)**:

**Reviewer**: LLM independiente (dkc-reviewer, contexto aislado) + verificacion del parent
**Tier de revision**: standard (proporcional a T2 aditivo). Nota: DET-35 dual-judge no se corrio con 2 jueces por proporcionalidad (cambio de ~100 lineas aditivo, ya deep-revisado por el spec-judge x2 + verificado por el parent).
**Resultado global**: pass (0 hallazgos bloqueantes)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | solo console.warn best-effort (consistente con planEntryEvent.js); funciones <40 lineas |
| 2 | Lint/estilo | pass | mismo patron que planEntryEvent.js / polymorphicUpdate |
| 3 | Tipado | pass | JS puro; typecheck vue-tsc exit 0 (parent) |
| 4 | Testing | pass | guards reales: TC-01/02 asertan args con toEqual exacto; realcore corre el core real (recordId+historyKey). Combinados cubren el caso args.id vs previous.id |
| 5 | Escalabilidad | pass | loop secuencial por fila, mismo patron que eventos |
| 6 | Mantenibilidad | pass | DRY: helper evita duplicar el loader inline en 2 resolvers |
| 7 | Claridad | pass | comentarios neutros, describen lo implementado, refs a lineas del core verificables |
| 8 | Error handling | pass | best-effort doble capa; nunca rompe la mutacion |
| 9 | Aditividad | pass | wire post-commit tras eventos; RBAC/tx/return intactos (diff 19 inserciones) |
| 10 | Fidelidad al shape del core | pass | create args:{data:row}, delete args:{id:row.id} verificado vs withDataLog.js (blocker del spec-judge resuelto) |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S1 completa: helper DataLog + wire aditivo + tests (mock TC-01..04 + core real TC-06) + doc. vitest 1565/0 (re-corrido parent), typecheck limpio, quality DET-23 pass. Pendiente: close (requiere OK del dev) + propuestas KB (B5 audit-half resuelta, extender rule)
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 (create batch audita por fila) | TC-01, TC-06 | unit | COVERED |
| REQ-02 (delete batch audita por fila con previous) | TC-02 | unit | COVERED |
| REQ-03 (best-effort: fallo de audit no rompe la mutacion) | TC-03 | unit | COVERED |
| REQ-04 (lote vacio/no-array no llama) | TC-04 | unit | COVERED |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-01 | create: un DataLog por fila con args.data | REQ-01 | unit | recordMutationDataLog mockeado | invocar helper con 2 records create | 2 llamadas operation=create, objectType=planEntry, **args.data=row**, result=row, previous=null | pass | vitest run 6/6 nuevos + 1565 total verdes (re-corrido por el parent, 0 failed) | pass |
| TC-02 | delete: un DataLog por fila con args.id | REQ-02 | unit | recordMutationDataLog mockeado | invocar helper con 1 record delete | 1 llamada operation=delete, **args.id===row.id**, previous=row (snapshot) | pass | vitest run 6/6 nuevos + 1565 total verdes (re-corrido por el parent, 0 failed) | pass |
| TC-03 | fallo de recordMutationDataLog no se propaga (best-effort) | REQ-03 | unit | mock que rechaza | invocar helper; no debe lanzar | resuelve undefined, warn por fila, no corta | pass | vitest run 6/6 nuevos + 1565 total verdes (re-corrido por el parent, 0 failed) | pass |
| TC-04 | lote vacio o no-array no llama | REQ-04 | unit | mock | invocar con [] y null | 0 llamadas | pass | vitest run 6/6 nuevos + 1565 total verdes (re-corrido por el parent, 0 failed) | pass |
| TC-06 | core real escribe con recordId + historyKey (no-mockeado) | REQ-01 | unit | recordMutationDataLog REAL + prisma fake (core_DataLog.create spy) | invocar helper con fila create y fila delete | core_DataLog.create recibe entry con recordId=row.id y historyKey='planEntry:{id}' en ambos | pass | vitest run 6/6 nuevos + 1565 total verdes (re-corrido por el parent, 0 failed) | pass |
| TC-05 | regression: resolvers batch siguen restituyendo RBAC + eventos y devuelven ids | REQ-REGRESSION | unit | suites existentes | vitest run | planEntryBatch/DeleteBatch/Event tests verdes | pass | vitest run 6/6 nuevos + 1565 total verdes (re-corrido por el parent, 0 failed) | pass |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| tests/unit/planEntryDataLog.test.js | unit | S1.T3 | REQ-01..04 | vitest |
| tests/unit/planEntryDataLog.realcore.test.js | unit (core real) | S1.T5 | REQ-01 (recordId+historyKey) | vitest |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| mod curriculum-design | npm test --workspace (vitest run) | 1559 passed / 0 failed | 1565 passed / 0 failed | +6 (nuevos TC-01..04, TC-06) |

## Summary

Restituida la auditoria DataLog en los resolvers batch de planEntry (`createPlanEntriesBatch` / `deletePlanEntriesBatch`), cerrando la mitad de audit del backlog B5 (la de eventos ya estaba resuelta). Enfoque A por-fila: helper `planEntryDataLog.js` que carga `recordMutationDataLog` del core por dual-path y emite un DataLog por fila post-commit, best-effort, con el shape exacto que el core exige (`args.data` en create, `args.id` en delete). Mod-only, cero core, sin cambio de contrato, aditivo (RBAC/eventos/atomicidad/return intactos).

**Resultado**: vitest 1565 passed / 0 failed (baseline 1559 + 6 nuevos), typecheck limpio, quality DET-23 pass. El spec-judge (DET-38) cazo un blocker (shape sin `args`) que se corrigio antes de ejecutar; el test no-mockeado (core real) lo guarda.

**Commits** (rama feat/UPONE-1539-modular-mesh, sin push): `c85e18e` feat, `d7d9099` test, `b8c3f7b` docs.

**KB**: B5 de TICKET-120 marcado resuelto; `RULE-dev-restitute-rbac-on-nondelegating-resolver` extendida de auth a los 3 decorators (auth + eventos + DataLog).

**Fuera de alcance (backlog could)**: hardening server-side de la cascada del delete (dimensionado ~1700-1900 lineas, 2 twins JS, cambio de contrato + integration real; cascada client-side intencional para v1).
