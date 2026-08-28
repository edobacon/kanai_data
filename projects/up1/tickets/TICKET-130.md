---
id: TICKET-130
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1557
module: layout
autopilot: autonomous
---

# Frontend: un bloqueo legitimo del borrado via deleteBulkInstances debe mostrarse como aviso, no como error de carga full-view

## Request

Delta que dejo abierto **UPONE-1600** sobre el frente frontend de **UPONE-1557**. UPONE-1600 (PR 340, mergeado a develop) llevo a paridad el borrado gobernado INDIVIDUAL (`customDeleteMutation`): un rechazo de negocio sale como toast y la lista queda intacta. Pero el path que rutea por `deleteBulkInstances` (la rama `else` de `handleCriticalDeleteConfirm`, cuando el objeto no declara `customDeleteMutation`) NO paso por ese fix: cuando el motor de cascada devuelve un bloqueo legitimo, sus errores se escriben en `error.value` y la lista entera se reemplaza por el `<ErrorState>` full-view. Hay que llevar ese path a la misma paridad que el individual.

> Atado al Jira **UPONE-1557** (mismo external; el delta se absorbe dentro del mismo ticket Jira, comentado ahi). El frente backend de 1557 es TICKET-122 (otra causa raiz, false-RESTRICT por proyeccion RT). El path individual ya lo resolvio UPONE-1600.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | single (core, layout) |
| Modulo principal | layout |
| Modulos afectados | ninguno (comportamiento generico de RecordList; afecta a todo objeto sin `customDeleteMutation` cuyo delete critico rutea por el motor de cascada) |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | La rama `else` (`deleteBulkInstances`) de `handleCriticalDeleteConfirm` escribe los errores del payload en `error.value`, el mismo ref que gobierna el `<ErrorState>` full-view, incluido el caso de un bloqueo de dominio legitimo | ✓ confirmada | `develop:6485` (`bulkErrors`), `develop:6487` (`error.value = ...`); `handleCriticalDeleteConfirm` en `develop:6446`. Ver ANALISIS en KB |
| H2 | El fix es frontend puro: se puede discriminar por `deleteBulkInstances.errors[].type` sin tocar backend, porque el frontend ya pide `type` y el backend ya puebla `CONSTRAINT_VIOLATION` | ✓ confirmada | selection set `develop:1787`; backend `referenceValidationService.js:331`; `showWarning` en scope `develop:3170`. No hace falta agregar `code` a `ValidationError` |

### Context found

- **Analisis code-grounded (fuente de verdad de este ticket)**: [`kb/sp8/ANALISIS-recordlist-bulkdelete-business-reject-full-view-gap.md`](../kb/sp8/ANALISIS-recordlist-bulkdelete-business-reject-full-view-gap.md). Evidencia del comentario del PR, opciones A (frontend-only) / B (backend uniforme), y por que no va en TICKET-122.
- **Path individual ya resuelto (oraculo de correctitud)**: `handleCriticalDeleteConfirm:6514-6517` (patron `resolveBusinessErrorCode`/`showWarning`, UPONE-1600) y `useRowMutation.ts:151`.
- **Hermano backend**: [[TICKET-122]] (mismo `external`, frente `object-manager`, otra causa raiz).
- **Predecesor cerrado**: [[TICKET-123]] (frente frontend individual, superseded por UPONE-1600).
- **Warnings**: cambiar SOLO la rama `else`/`deleteBulkInstances` del delete critico; no tocar el `error.value` de carga (fetch/filtro), ni el path `customMutation` ya arreglado, ni el backend.

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | (a crear) `UPONE-1557` desde `develop` |
| Base branch | `develop` (ACTUALIZADO 2026-08-12, al dia con `origin/develop`, 0/0). Contiene UPONE-1600 (`affeedec` es ancestro) y el merge de UPONE-1540 (PR #342). El working tree local esta en `UPONE-1540`; ramificar `UPONE-1557` desde `develop`, no desde el working tree |
| Precondicion (S1.T0) | VERIFICADA en develop: `graphqlErrors.ts` existe; el path individual `customMutation` muestra toast via `showWarning` en `develop:6514-6517`. Ancla el baseline de TC-2. Al ejecutar, re-confirmar por simbolo (develop se mueve) |
| Bug confirmado en base | SI: la rama `else`/`deleteBulkInstances` escribe `error.value` en `develop:6487` (sin discriminar por `type`). El delta sigue vivo en la base de ejecucion |
| DB state | tenant real con un objeto cuyo delete critico single ruta por `deleteBulkInstances` y es bloqueado por Restrict (referencia real) para reproducir el bloqueo de dominio |
| Services | object-manager + suite |
| Test data | un registro referenciado bajo una regla Restrict que dispare `CONSTRAINT_VIOLATION` en el motor de cascada |

### Reproduction steps

1. Listado de un objeto SIN `customDeleteMutation`, cuyo delete critico single rutea por `deleteBulkInstances`.
2. Borrar una fila que el motor de cascada bloquea por Restrict (referencia real).
3. Observado: la lista se reemplaza por el `<ErrorState>` full-view. Esperado: aviso (toast) con el mensaje del servidor y la lista intacta.

## Acceptance

- [ ] Un delete critico via `deleteBulkInstances` bloqueado por dominio muestra el mensaje del servidor como aviso (toast) y la lista permanece visible.
- [ ] Un borrado MULTI-SELECCION (`deleteSelectedRows`) rechazado por dominio muestra los errores por-registro en el modal (`bulkDeleteErrors`) con la lista intacta, sin reemplazarla por el `<ErrorState>` full-view (S3 / REQ-FIX-02).
- [ ] Un error de carga de la lista (fetch/filtro) sigue mostrando el `<ErrorState>` full-view (no se degrada).
- [ ] El path individual `customMutation` (UPONE-1600) sigue con su toast, sin regresion.
- [ ] Un delete critico exitoso por la rama bulk engine sigue con toast de exito + refetch.
- [ ] Reproduce runtime (DET-36): borrar un registro bloqueado por Restrict muestra el aviso con la lista intacta (evidencia runtime real), o smoke-not-reproducible auditado.

## Testing

### Test cases (plan; se ejecutan y registran en execute — orden tests-first)

| # | Case | Tipo | Momento | Esperado |
|---|------|------|---------|----------|
| TC-1 | Red: error de carga (fetch/filtro) muestra `<ErrorState>` full-view | component | verde sobre base de ejecucion | full-view intacto |
| TC-2 | Red: path individual `customMutation` rechazado sigue con toast (sin regresion) | component | verde sobre base con 1600 (garantizado por S1.T0) | toast intacto |
| TC-3 | Reproduce: delete via `deleteBulkInstances` que devuelve CONSTRAINT_VIOLATION -> toast con mensaje del servidor y lista NO reemplazada (`error.value` null) | component | ROJO hoy -> verde con fix | aviso + lista intacta |
| TC-4 | Red: delete critico exitoso via bulk engine -> toast de exito + refetch | component | verde sobre base de ejecucion | exito |
| TC-5 | Runtime (DET-36): borrar un registro bloqueado por Restrict muestra aviso con la lista intacta | manual/smoke | verde con fix | evidencia runtime real (o smoke-not-reproducible auditado) |

## Sessions

### Plan de sessions (preplanificacion)

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Preparar base (gate 1600) + malla de seguridad VERDE + RED del bug (tests-first) | execute | T2 | S1.T0, S1.T1, S1.T2 | ⚑ fuerte | malla TC-1/TC-2/TC-4 VERDE sobre base; TC-3 ROJO reproducible; gate persistido |
| S2 | Implementar fix (rama else/deleteBulkInstances) + regression + doc + smoke runtime | execute | T3 | S2.T1, S2.T2, S2.T3, S2.T4 | ⚑ fuerte | TC-3 VERDE, malla sin regresion; DET-40 cubierta; evidencia runtime (o smoke-not-reproducible auditado) |
| S3 | Extender el fix al borrado multi-seleccion (deleteSelectedRows) | execute | T3 | S3.T1, S3.T2 | ⚑ fuerte | error.value redundante eliminado; regression VERDE; DET-40 cubierta |

### Session 1 — 2026-08-13 09:20 — Preparar base + red de seguridad + RED del bug (tests-first) [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: re-confirmar por simbolo que la base contiene UPONE-1600 (graphqlErrors.ts + path individual con toast), escribir la malla de seguridad (TC-1/TC-2/TC-4) VERDE sobre la base de ejecucion y el test RED que reproduce el bug (TC-3), sin tocar codigo de produccion.

**Tasks completadas**:
- [x] S1.T0 — precondicion de base (gate): rama UPONE-1557 desde develop con 1600 presente; graphqlErrors.ts existe; path individual customMutation con showWarning (verificar por simbolo)
- [x] S1.T1 — malla de seguridad TC-1/TC-2/TC-4 VERDE sobre la base de ejecucion (sin tocar codigo)
- [x] S1.T2 — test RED TC-3: delete via deleteBulkInstances con CONSTRAINT_VIOLATION debe rutear a toast sin setear error.value (ROJO contra codigo actual)
- [x] S1.GATE — gate de sync Session 1 (T2): confirmar malla VERDE + RED reproducible, decidir continue/iterate

**Validacion del tier**:
- T2 — vitest run del area + confirmacion de RED reproducible

**Discoveries / Learns nuevos**:
- (pendiente)

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S2: implementar fix en rama else/deleteBulkInstances (helper isBusinessBulkDeleteError + ruteo a showWarning). Malla VERDE (3/3) sobre base; RED reproducible (5/5 con isBusinessBulkDeleteError is not a function). Commit test 768008d4.
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Pre-condiciones para Session 2**:
- malla VERDE sobre base + TC-3 ROJO reproducible confirmados

### Session 2 — 2026-08-13 10:20 — Implementar fix + regression + doc [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa)

**Objetivo**: implementar el fix en la rama else/deleteBulkInstances de handleCriticalDeleteConfirm (helper isBusinessBulkDeleteError en graphqlErrors.ts + ruteo del rechazo de dominio a showWarning sin setear error.value), correr la regression completa de RecordList y actualizar la doc oficial. El smoke runtime (S2.T3) lo corre el orquestador.

**Tasks completadas**:
- [x] S2.T1 — fix en rama else/deleteBulkInstances: helper isBusinessBulkDeleteError + toast sin error.value para rechazos de dominio (DET-40 auditoria de reemplazo) → commit `132788ab`
- [x] S2.T2 — regression: correr RecordList spec/area completa, sin regresion
- [x] S2.T3 — smoke runtime real (DET-36): a cargo del orquestador
- [x] S2.T4 — doc oficial: recordlist.md documenta el bloqueo del delete via bulk engine como toast (paridad con path individual) → commit `025a5a52`
- [x] S2.GATE — quality review (DET-23) + verificacion runtime (DET-36) + acceptance con evidencia

**Validacion del tier**:
- T3 — vitest run del area RecordList + graphqlErrors, TC-3 VERDE (8/8 en bulkDeleteErrorRouting.spec.ts), malla sin regresion (suite unit 2222/2223, unico fallo Icon.spec.ts preexistente y ajeno)

**Quality review (DET-23)** — loop dual-judge (DET-35, T3): 2 jueces ciegos dkc-reviewer independientes + verificacion de codigo del orquestador (contexto limpio, read-only). Resultado externo transcrito (el developer NO se auto-aprueba).

**Reviewer**: juez dual ciego (2x dkc-reviewer) + orquestador
**Tier de revision**: exhaustive
**Resultado global**: approved (ambos jueces)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | pass | fix confinado a la rama else/deleteBulkInstances; sin over-reach; sin console.* |
| 2 | Lint/tipado | pass | typecheck sin errores en graphqlErrors.ts ni RecordList.vue |
| 3 | Testing | pass | bulkDeleteErrorRouting.spec.ts 8/8; TC-3 RED→GREEN; sin regresion |
| 4 | Escalabilidad/mantenibilidad | pass | helper isBusinessBulkDeleteError como punto unico de clasificacion por type plano |
| 5 | Contrato backend | pass | discrimina por type plano del payload, cero cambio de backend/GraphQL |
| 6 | DET-40 replicacion | pass | 1:1 cubierta (return + mostrar mensaje; solo cambia el sink para dominio) |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Codigo APROBADO por juez dual ciego (2x dkc-reviewer, ambos approved, cero WARNING) + verificacion del orquestador (spec 8/8, diff limpio in-scope, Icon.spec preexistente). Runtime DET-36: smoke-not-reproducible auditado (UPU sin asignaciones app-rol curriculum-design + sidebar 400; limite de provisioning, no defecto). Execute completo; status NO closed (espera OK del dev).
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Self-report verification (DET-33)** — orquestador: spec re-corrido 8/8 passed; diff limpio (4 archivos in-scope, sin artefactos de sync); Icon.spec.ts confirmado PREEXISTENTE (el diff no toca el atomo Icon).

**Runtime verification (DET-36, S2.T3)**: **smoke-not-reproducible** (razon auditada). El smoke-runner confirmo OM operativo, login Clerk OK y el fix presente+correcto en disco, pero NO pudo ejercer el runtime: en UPU la app curriculum-design tiene CERO asignaciones app-rol (`up1_suite_app_role`) y el sidebar de apps carga vacio por un 400, asi que ningun rol puede abrir los RecordLists (Activity/Curriculum/AcademicProgram) ni core_Role (up1-manager) donde corre el fix. Limite de provisioning del entorno, no defecto del fix.

**Discoveries / Learns nuevos** (DET-16, hallazgos AJENOS a 130 — follow-up local del entorno, NO tickets Jira):
- D1: UPU — app curriculum-design sin asignaciones en `up1_suite_app_role` → sus RecordLists inaccesibles para todo rol.
- D2: sidebar de apps carga vacio para todos los roles (incl. Admin) por un 400 en la query de apps del cliente.

**Pre-condiciones para cierre**:
- TC-3 VERDE + malla sin regresion + doc actualizada; smoke runtime (S2.T3) a cargo del orquestador

### Session 3 — 2026-08-13 12:00 — Extender el fix al borrado multi-seleccion [phase: execute]

**Tipo**: ⚑ fuerte (requiere decision humana)
**Validation tier**: T3 (regression completa)

**Objetivo**: aplicar el mismo fix de render al path multi-seleccion (`deleteSelectedRows`): eliminar la asignacion redundante `error.value = ${stats.summary}` en su branch de errores, para que un rechazo de dominio del borrado multiple se vea en el modal (`bulkDeleteErrors`) sin reemplazar la lista por el `<ErrorState>` full-view. Correr la regression completa. El smoke runtime (DET-36) hereda el limite de entorno de S2.

**Tasks completadas**:
- [x] S3.T1 — fix en deleteSelectedRows: eliminar error.value = stats.summary del branch de errores (DET-40 auditoria de reemplazo); catch de transporte intacto
- [x] S3.T2 — regression: suite unit completa VERDE, sin regresion, malla del delta (S1/S2) sigue VERDE
- [x] S3.GATE — gate de sync Session 3 (T3): DET-40 + regression + quality review re-juzgado por el orquestador, decidir continue/iterate

**Validacion del tier**:
- T3 — suite unit completa 2222 passed | 1 failed (unico fallo Icon.spec.ts preexistente y ajeno); delta spec bulkDeleteErrorRouting.spec.ts 8/8 VERDE; typecheck limpio en RecordList.vue

**DET-40 (auditoria de reemplazo)**: la linea vieja `error.value = ${stats.summary}` (intencion "keep modal open to show errors") hacia dos cosas: (a) mostrar los errores — ya cubierto por `bulkDeleteErrors.value = errors` + el template del modal, NO por esa asignacion; (b) setear `error.value` truthy → `v-if="error"` desmonta el `v-else` de datos (donde vive el modal) → full-view. El nuevo path elimina solo (b): `bulkDeleteErrors` sigue seteado, `showDeleteModal` sigue true, `error.value` queda null → modal montado con los errores por-registro. Replica mostrar los errores sin el nuke. `catch` de transporte (`error.value` legitimo) y rama `else` de exito intactos. `stats` quedaba sin uso → removido. **Veredicto: replacement-audit covered.**

**Runtime verification (DET-36)**: hereda el limite de entorno de S2 (UPU sin asignaciones app-rol curriculum-design + sidebar 400) → **smoke-not-reproducible** auditado. Lo ejecuta/confirma el orquestador (dkc-smoke-runner).

**Quality review (DET-23)**: PENDIENTE de re-juicio por el orquestador (juez dual ciego). El developer NO se auto-aprueba.

**Discoveries / Learns nuevos**:
- (ninguno nuevo)

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Execute S3 completo: fix aplicado (commit e9538c99), regression 2222/2223 (unico fallo Icon.spec preexistente/ajeno), DET-40 replacement-audit covered. Quality review PENDIENTE de re-juicio por el orquestador (juez dual); smoke DET-36 hereda smoke-not-reproducible auditado de S2. Listo-para-juez; status NO closed.
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Pre-condiciones para cierre**:
- error.value redundante eliminado + regression sin regresion; quality review re-juzgado por el orquestador; smoke DET-36 con limite de entorno auditado (S2)

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El delta S3 (fix multi-seleccion en deleteSelectedRows) no trae test de regresion automatizado: correcto por inspeccion estatica, mismo limite de component-mount de RecordList.vue (342KB, apollo/i18n/clerk) que S2. La cobertura runtime queda a cargo del smoke DET-36 cuando el entorno lo permita (hoy smoke-not-reproducible por provisioning de UPU). Hallazgo INFO del juez dual, no bloqueante. | reviewer | #3 | discarded | — |
| L2 | Tras el fix S3, stats.summary del payload de deleteBulkInstances ya no se muestra en el borrado multiple: sin perdida sustantiva porque el modal lista los errores por-registro (bulkDeleteErrors), mas granular que el resumen. Ademas la query DELETE_BULK_INSTANCES puede seguir sobre-pidiendo el bloque stats en el gql (over-fetch inocuo), fuera del fix minimo. Hallazgo INFO del juez dual, no bloqueante. | reviewer | #3 | discarded | — |
