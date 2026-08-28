---
id: SPEC-layout-fix-recordlist-bulkdelete-error-render
project: up1
ticket: TICKET-130
status: done
---

# Fix: un bloqueo legitimo del borrado via deleteBulkInstances debe mostrarse como aviso, no como error de carga full-view

# Fix: un bloqueo legitimo del borrado via deleteBulkInstances debe mostrarse como aviso, no como error de carga full-view

## Executive summary — lo que estas aprobando

> *Esta seccion esta disenada para revision rapida. El detalle tecnico vive en Requirements, Fix scope y Tasks.*

**Que se quiere**: cerrar el delta que UPONE-1600 dejo abierto sobre el frente frontend de UPONE-1557. 1600 llevo a paridad el borrado gobernado INDIVIDUAL (`customDeleteMutation`): un rechazo de negocio sale como toast y la lista queda intacta. Pero el path que rutea por `deleteBulkInstances` (la rama `else` de `handleCriticalDeleteConfirm`, sin `customMutation`) NO paso por ese fix: cuando el motor de cascada devuelve un bloqueo legitimo, sus errores se escriben en `error.value` y la lista entera se reemplaza por el `<ErrorState>` full-view. Este fix lleva ese path a la misma paridad.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Discriminar por `type` del payload (`deleteBulkInstances.errors[].type`), NO agregar `code` a `ValidationError` en backend | El payload bulk ya trae `type` y el frontend ya lo pide en el selection set (`errors { id field message type }`); el backend ya puebla `CONSTRAINT_VIOLATION`. Es fix frontend puro, cero cambio de contrato GraphQL |
| 2 | Cambiar SOLO la rama `else` (`deleteBulkInstances`) de `handleCriticalDeleteConfirm`; no tocar el `error.value` de carga ni el path `customMutation` ya arreglado por 1600 | El `<ErrorState>` full-view de fetch/filtro y el fix individual mergeado deben quedar intactos |
| 3 | Cierre con verificacion runtime real (DET-36), no solo unit de componente | El comportamiento es config-driven (objeto con cascada Restrict) y DB-gated (el bloqueo depende de una referencia real); un unit no representa el runtime |

**Riesgos principales y como los mitigamos**:

- **Degradar el error de CARGA real de la lista** el fix toca solo la rama `else` del delete; TC-1 (error de carga sigue mostrando `<ErrorState>` full-view) VERDE sobre codigo actual y tras el fix.
- **Romper el path individual ya arreglado por 1600** el cambio no toca la rama `if (customMutation)`; TC-2 (custom delete rechazado sigue con toast) VERDE antes y despues.
- **Cerrar sin evidencia runtime** (bug config/DB-gated) smoke real con OM + suite + tenant sembrado (DET-36); si no es reproducible, `smoke-not-reproducible` con razon auditada.

**Que NO se hace en este ticket**:

- **El frente BACKEND de UPONE-1557** (false-RESTRICT del bulk por proyeccion RT propia): es [[TICKET-122]], hermano de mismo `external`, otra causa raiz.
- **El path individual `customMutation`**: ya resuelto por UPONE-1600, no se toca.
- ~~**El path multi-select `deleteSelectedRows`**~~: **INCORPORADO al alcance en Session 3** (decision del dev, 2026-08-13). El mismo bug de render vive en el borrado multi-seleccion: `deleteSelectedRows` setea `error.value = stats.summary` en su branch de errores, disparando el `<ErrorState>` full-view (`v-if="error"`) que desmonta el modal de `bulkDeleteErrors`. Ver REQ-FIX-02 y Session 3.
- **Agregar `code` a `ValidationError` end-to-end**: innecesario (ver Decision 1); queda como opcion descartada.

**Tamano estimado**: 2 sessions ejecutables, tier T2/T3. La mas delicada es la Session 2 (smoke runtime real contra tenant sembrado).

**Como vas a saber que funciona**:

- Borrar (delete critico single, sin `customMutation`) un registro que el motor de cascada bloquea con Restrict muestra un aviso (toast) con el mensaje del servidor y la lista permanece visible.
- Un delete critico exitoso por esa misma rama sigue con toast de exito + refetch.
- Un error de carga de la lista (fetch/filtro) sigue mostrando la pantalla `<ErrorState>` full-view.
- El path `customMutation` (LevelScheme) arreglado por 1600 sigue mostrando su toast (sin regresion).

---

## Purpose

Corregir como se renderiza un bloqueo legitimo del borrado que rutea por `deleteBulkInstances` en `RecordList.vue` del core `layout-engine`. Hoy la rama `else` de `handleCriticalDeleteConfirm` (`RecordList.vue:6485-6487`) escribe los errores del payload en `error.value`, el mismo ref que gobierna el `<ErrorState>` full-view de carga (`v-if="error"`), asi que un bloqueo de dominio legitimo reemplaza la lista entera. El fix discrimina por `deleteBulkInstances.errors[].type` (que el frontend ya pide y el backend ya puebla) y enruta el rechazo de negocio al mismo aviso (`showWarning`) que usa el path individual arreglado por UPONE-1600, sin setear `error.value`. El bloqueo del backend es correcto; solo se corrige como se muestra. Cero cambio de backend.

## Requirements

### REQ-FIX-01: un bloqueo legitimo via deleteBulkInstances se muestra como aviso y conserva la lista

> **Que cambia**: cuando borras (delete critico single, sin custom mutation) algo que el motor de cascada bloquea por una referencia real, ves un aviso (toast) con el mensaje del servidor y la lista sigue en pantalla, en vez de una pantalla generica que reemplaza todo.
> **Por que**: hoy la rama `else` del catch/return escribe los errores del payload en el ref de carga de la lista.

El sistema MUST, en la rama `else` (`deleteBulkInstances`) de `handleCriticalDeleteConfirm`, cuando `bulkErrors.length > 0`, discriminar por `bulkErrors[].type`: si es un rechazo de negocio (`CONSTRAINT_VIOLATION` y demas tipos de dominio), mostrar el/los mensaje(s) del servidor como notificacion (`showWarning`) SIN setear `error.value`, de modo que la lista permanezca montada. Un error no-de-negocio (sin `type` de dominio) puede seguir a `error.value`.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: delete critico bloqueado por dominio
- **GIVEN** un listado de un objeto sin `customDeleteMutation` cuyo delete critico rutea por `deleteBulkInstances` y el motor de cascada devuelve un bloqueo `CONSTRAINT_VIOLATION`
- **WHEN** el usuario borra una fila que el backend bloquea
- **THEN** se muestra un toast con el mensaje del servidor Y la lista NO se reemplaza (`error.value` queda null, el `<ErrorState>` no se monta)

#### Scenario: paridad con el path individual de 1600
- **GIVEN** el path `customMutation` arreglado por UPONE-1600
- **WHEN** su delete es rechazado
- **THEN** sigue mostrando su toast sin romper la vista (sin regresion por este fix)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: borrar un registro que el motor de cascada bloquea por Restrict; aparece un aviso con el mensaje del servidor y la lista sigue visible.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-3 | Reproduce el bug | listado sin customMutation, delete via deleteBulkInstances que devuelve CONSTRAINT_VIOLATION | borrar fila bloqueada | toast con mensaje backend + lista intacta | `error.value` null, `<ErrorState>` no montado (ROJO hoy, VERDE con fix) |

### REQ-FIX-02: un rechazo de dominio del borrado multi-seleccion se muestra en el modal, no en el full-view (Session 3)

> **Que cambia**: al borrar varias filas de una vez y el motor de cascada rechaza alguna(s), ves los errores por-registro en el modal de borrado (como fue disenado), sin que la lista sea reemplazada por la pantalla de error full-view.
> **Por que**: `deleteSelectedRows` setea `error.value = stats.summary` en su branch de errores, y `error` gobierna el `<ErrorState>` full-view (`v-if="error"`), que desmonta el `v-else` de datos donde vive el modal de `bulkDeleteErrors`.

El sistema MUST, en la rama `errors.length > 0` de `deleteSelectedRows`, NO setear `error.value` con el resumen del payload: el modal ya renderiza los errores por-registro via `bulkDeleteErrors`. El `catch` de excepciones de transporte (que setea `error.value` legitimamente) NO se toca. Es el mismo bug de render que REQ-FIX-01, en el path multi-seleccion.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: borrado multiple con rechazo de dominio
- **GIVEN** una seleccion multiple cuyo borrado el motor de cascada rechaza parcial o totalmente (`deleteBulkInstances.errors[]` no vacio)
- **WHEN** el usuario confirma el borrado multiple
- **THEN** el modal muestra los errores por-registro (`bulkDeleteErrors`) Y la lista NO se reemplaza (`error.value` queda null, el `<ErrorState>` no se monta)

#### Scenario: excepcion de transporte en el borrado multiple
- **GIVEN** una falla de red/servidor durante el borrado multiple (throw)
- **WHEN** cae al `catch`
- **THEN** sigue seteando `error.value` (comportamiento legitimo preservado)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: seleccionar varias filas, algunas referenciadas bajo Restrict, y borrar; el modal lista cuales no se pudieron borrar y por que, con la lista aun visible detras.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-6 | Reproduce (multi-select) | seleccion multiple con rechazo de dominio via deleteBulkInstances | borrar | modal con errores por-registro + lista intacta | `error.value` null, `<ErrorState>` no montado |

### REQ-REGRESSION-01: el error de carga, el delete exitoso, el path individual y el multi-select se preservan

> **Que cambia**: nada visible en los otros caminos; el fix afecta solo la rama `else` (deleteBulkInstances) del delete critico single.
> **Por que**: `RecordList` maneja errores por varios caminos; los demas deben quedar intactos.

El sistema MUST preservar: (a) el `<ErrorState>` full-view para errores de CARGA (fetch/filtro); (b) el delete critico EXITOSO con toast de exito + `fetchData(true)`; (c) el path `customMutation` arreglado por UPONE-1600; (d) el multi-select `deleteSelectedRows` con su modal `bulkDeleteErrors` propio.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: error de carga sigue mostrando full-view
- **GIVEN** un fallo de fetch/filtro de la lista
- **WHEN** ocurre el error de carga
- **THEN** se muestra el `<ErrorState>` full-view (no se degrada a toast)

#### Scenario: delete critico exitoso
- **GIVEN** un delete critico que el backend acepta
- **WHEN** se completa
- **THEN** toast de exito + refetch de la lista

#### Scenario: path individual de 1600 intacto
- **GIVEN** el path `customMutation`
- **WHEN** su delete es rechazado
- **THEN** sigue con toast (comportamiento de UPONE-1600, sin regresion)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: forzar un error de carga sigue mostrando la pantalla completa; un delete exitoso sigue refrescando la lista; el borrado de LevelScheme en uso (path 1600) sigue con su toast.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-1 | Error de carga | fallo de fetch/filtro | render de la lista | `<ErrorState>` full-view | full-view intacto (VERDE sobre codigo actual) |
| TC-2 | Path individual 1600 | custom delete rechazado (LevelScheme en uso) | borrar | toast + lista intacta | sin regresion (VERDE antes y despues) |
| TC-4 | Delete critico exitoso | delete via bulk engine aceptado | completar | toast de exito + refetch | exito (VERDE sobre codigo actual y tras el fix) |

## Fix scope

### Antes (comportamiento actual)
`handleCriticalDeleteConfirm` (`develop:6446`), en la rama `else` (sin `customMutation`), rutea el delete critico de un solo registro por `deleteBulkInstances`. Cuando el payload trae `errors` (`bulkErrors` en `develop:6485`, `bulkErrors.length > 0`), hace `error.value = bulkErrors.map(e => e.message).join(' ')` (`develop:6487`) y retorna. `error.value` gobierna el `<ErrorState>` full-view (`v-if="error"`), asi que la lista entera se reemplaza, incluido el caso de un bloqueo de dominio legitimo. Verificado que el bug SIGUE vivo en develop tras el merge de 1600 y 1540.

### Despues (comportamiento esperado)
La rama `else` discrimina por `bulkErrors[].type`: si hay tipos de dominio (`CONSTRAINT_VIOLATION` y demas), muestra el mensaje del servidor como toast (`showWarning`, passthrough del texto ya user-ready) y NO setea `error.value`. La lista permanece montada. Espeja el patron de UPONE-1600 de routear el rechazo de negocio a `showWarning`/toast (no a `error.value`); el mecanismo de discriminacion difiere por shape (el bulk usa el `type` plano del payload, el individual usa `resolveBusinessErrorCode` sobre `extensions.code` de un error lanzado). El resto de los paths (carga, delete exitoso, `customMutation`, multi-select) sin cambios.

### Archivos afectados
| File | Change | Impact |
|------|--------|--------|
| `layout/src/layouts/RecordList/RecordList.vue` | En `handleCriticalDeleteConfirm`, rama `else`/`deleteBulkInstances` (asignacion a `error.value` en :6486, return en :6487 del working tree; sobre la base de ejecucion los numeros pueden correrse por 1600): discriminar por `errors[].type`, toast (`showWarning`, ya en scope :3169) del mensaje del servidor sin setear `error.value` para rechazos de dominio | Todo objeto sin `customDeleteMutation` cuyo delete critico rutea por el motor de cascada |
| `layout/src/layouts/RecordList/RecordList.vue` (Session 3) | En `deleteSelectedRows`, rama `errors.length > 0`: eliminar `error.value = ${stats.summary}` (verificar por simbolo). El modal ya muestra `bulkDeleteErrors`; esa asignacion solo alimentaba el `<ErrorState>` full-view. `catch` de transporte intacto | Borrado multi-seleccion de cualquier objeto: los rechazos de dominio se ven en el modal, no reemplazan la lista |
| `layout/src/utils/graphqlErrors.ts` | **Opcional** (consistencia, NO obligatorio): centralizar un helper `isBusinessDeleteError(e)` que clasifique por el `type` PLANO del payload, distinto de `resolveBusinessErrorCode` (que lee `extensions.code` de un error LANZADO — otro shape). Si el executor lo juzga innecesario, un check local de `type` basta | Punto unico de clasificacion compartible con el path individual |
| `layout/src/layouts/RecordList/RecordList.spec` (o el test de componente vigente) | Agregar TC-1..TC-4 | Cobertura del render de error del delete via bulk engine, hoy inexistente |
| `layout/docs/features/recordlist.md` | Documentar que un bloqueo legitimo del delete via `deleteBulkInstances` se muestra como toast (paridad con el path individual) y no reemplaza la lista | Doc oficial del comportamiento observable |

## Tasks

### Session 1 — Preparar base + red de seguridad + RED del bug (tests-first) [tipo: fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T0 | **Precondicion de base (gate)**: crear la rama `UPONE-1557` desde `develop` (actualizado 2026-08-12, al dia con `origin/develop`, contiene UPONE-1600 `affeedec` + el merge de 1540). Re-confirmar por simbolo que 1600 esta presente en la base: (a) `layout/src/utils/graphqlErrors.ts` existe, (b) el path individual `customMutation` muestra toast via `showWarning` (`resolveBusinessErrorCode` :6514 -> `showWarning` :6515 en develop). Ya verificado al planear; el gate lo re-confirma al ejecutar porque develop se mueve. Ancla el baseline de TC-2. NO ramificar desde el working tree local `UPONE-1540` | Setup, DEC-LOCAL-01 | developer | — | (git: rama de trabajo desde develop) | rama creada desde develop con 1600 presente; graphqlErrors.ts existe; path individual con toast confirmado archivo:linea | git checkout develop | DET-2, DET-33, DET-40 | done | 1 |
| S1.T1 | Escribir la malla de seguridad y correrla VERDE sobre la BASE DE EJECUCION (origin/develop+1600, sin tocar codigo): TC-1 (error de carga fetch/filtro muestra `<ErrorState>` full-view), TC-2 (path individual `customMutation` rechazado sigue con toast, sin regresion — valido SOLO con 1600 presente, garantizado por S1.T0), TC-4 (delete critico exitoso via bulk engine -> toast de exito + refetch) | REQ-REGRESSION-01 | developer | S1.T0 | layout/src/layouts/RecordList/RecordList.spec | Los 3 tests VERDE contra la base de ejecucion (si alguno sale rojo: revisar diagnostico antes de seguir) | git revert | DET-7, DET-33 | done | 1 |
| S1.T2 | Escribir el test que reproduce el bug (RED): TC-3 (delete via deleteBulkInstances que devuelve CONSTRAINT_VIOLATION -> assert toast con mensaje del backend Y `error.value` null / `<ErrorState>` no montado). Debe salir ROJO contra el codigo actual | REQ-FIX-01 | developer | S1.T1 | layout/src/layouts/RecordList/RecordList.spec | TC-3 ROJO reproducible contra codigo actual | git revert | DET-7, DET-13 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** persistir en `## Sessions` con Template de Gate, confirmar malla VERDE + RED reproducible, decidir continue/iterate | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + decision documentada | (no aplica) | DET-20, DET-23 | done | 1 |

### Session 2 — Implementar + smoke runtime + cerrar [tipo: fuerte] [tier: T3]

parallel_groups: [[S2.T2, S2.T4]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Implementar el fix: en la rama `else`/`deleteBulkInstances` del branch `bulkErrors.length > 0` de `handleCriticalDeleteConfirm`, discriminar por el `type` PLANO de cada `bulkErrors[i]` (`CONSTRAINT_VIOLATION` y demas tipos de dominio) con un check directo (o el helper opcional `isBusinessDeleteError`); mostrar el mensaje del servidor como toast (`showWarning`, ya destructurado en scope :3169) sin setear `error.value` para rechazos de dominio; un error sin `type` de dominio puede seguir a `error.value`. Cambiar SOLO esa rama. Antes de editar, enumerar 1:1 lo que hacia el path viejo (setear `error.value`, retornar) y verificar que el nuevo replica lo que debe (mostrar el error al usuario) sin arrastrar el nuke de la vista (DET-40 auditoria de reemplazo) | REQ-FIX-01 | developer | S1.GATE | layout/src/layouts/RecordList/RecordList.vue (+ opcional layout/src/utils/graphqlErrors.ts si se centraliza el helper de `type`) | TC-3 pasa a VERDE; la malla (TC-1/TC-2/TC-4) sigue VERDE | git revert | DET-5, DET-8, DET-40 | done | 2 |
| S2.T2 | Correr `RecordList.spec` completo (regression): confirmar que ningun test previo queda rojo y que todos los paths de error (carga, individual 1600, delete via bulk engine, multi-select) se comportan como se espera | REQ-FIX-01, REQ-REGRESSION-01 | developer | S2.T1 | layout/src/layouts/RecordList/RecordList.spec | suite de componente VERDE; sin regresion | git revert | DET-7, DET-14 | done | 2 |
| S2.T3 | Smoke runtime real (DET-36): OM + suite + tenant sembrado con un objeto cuyo delete critico single rutea por `deleteBulkInstances` y es bloqueado por Restrict. Borrar la fila bloqueada muestra el aviso con la lista intacta; un delete exitoso por la misma rama elimina la fila. Capturar evidencia runtime real (screenshot/console/DOM). Si no es reproducible en el entorno, registrar `smoke-not-reproducible` con razon auditada (DET-36) | REQ-FIX-01 | reviewer | S2.T1 | (runtime: layout + suite + object-manager) | evidencia runtime real: toast + lista intacta al bloquear; o smoke-not-reproducible auditado | (no aplica verificacion) | DET-13, DET-33, DET-36 | done | 2 |
| S2.T4 | Actualizar la doc oficial: en `recordlist.md` documentar que un bloqueo legitimo del delete via `deleteBulkInstances` se muestra como toast (paridad con el path individual de 1600) y no reemplaza la lista (DET-37 dim1). Referenciar el analisis del KB (dim2) | REQ-FIX-01 | developer | S2.T1 | layout/docs/features/recordlist.md | doc refleja el comportamiento nuevo; lint frontmatter/cross-ref | git revert | DET-16, DET-37 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T3)** persistir en `## Sessions`, quality review (DET-23) + verificacion runtime (DET-36), verificar acceptance con evidencia real, decidir continue/iterate | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + acceptance verificado con evidencia runtime | (no aplica) | DET-13, DET-20, DET-23, DET-36 | done | 2 |

### Session 3 — Extender el fix al borrado multi-seleccion [tipo: fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Implementar el fix en `deleteSelectedRows`: en la rama `errors.length > 0`, eliminar la asignacion `error.value = ${stats.summary}` (RecordList.vue, dentro del branch de errores del borrado multiple). El modal ya renderiza los errores via `bulkDeleteErrors`; esa asignacion solo alimentaba el `<ErrorState>` full-view (`v-if="error"`) que desmonta el modal. NO tocar el `catch` (excepciones de transporte -> `error.value` legitimo). DET-40: enumerar 1:1 que hacia la linea vieja (setear `error.value`, intencion "keep modal open to show errors") y verificar que el nuevo replica mostrar los errores (el modal lo hace) sin arrastrar el nuke de la vista | REQ-FIX-02 | developer | S2.GATE | layout/src/layouts/RecordList/RecordList.vue | regression VERDE; sin regresion en el path multi-select | git revert | DET-8, DET-40 | done | 3 |
| S3.T2 | Correr la suite unit completa (regression): confirmar que ningun test previo queda rojo y que la malla del delta (S1/S2) sigue VERDE | REQ-FIX-02, REQ-REGRESSION-01 | developer | S3.T1 | layout/src/layouts/RecordList/ | suite unit VERDE; sin regresion | git revert | DET-7, DET-14 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** persistir en `## Sessions`, quality review (DET-23) re-juzgado por el orquestador (juez dual), DET-40, decidir continue/iterate. Smoke DET-36 hereda el limite de entorno de S2 (smoke-not-reproducible auditado) | — | reviewer | S3.T1, S3.T2 | ticket | gate persistido + DET-40 + regression VERDE | (no aplica) | DET-13, DET-20, DET-23, DET-40 | done | 3 |

## Constraints

- DET-40 (auditoria de reemplazo): al reenrutar el manejo de error de la rama `else`/`deleteBulkInstances`, enumerar 1:1 que hacia el path viejo (setear `error.value`, montar `<ErrorState>`, retornar) y verificar que el nuevo replica lo que debe (mostrar el error al usuario) sin arrastrar el nuke de la vista.
- RULE-dev-004 (core work policy): `layer: core`, trabajo en rama unica `UPONE-1557`; merge a develop gated por revision del team up1.
- RULE-no-touch-layout (feedback): `layout/` es core; el cambio es quirurgico y esta autorizado por el delta del ticket. No expandir a `useFriendlyErrors` ni al backend (`ValidationError.code`).
- Base de ejecucion (precondicion S1.T0): ramificar desde `develop` (actualizado 2026-08-12, al dia con `origin/develop`, contiene UPONE-1600 `affeedec`). Los source_ref del path individual y `graphqlErrors.ts` resuelven sobre develop (verificado), NO sobre el working tree local `UPONE-1540`.
- Clasificacion por `type` del payload (no `extensions.code`): el path bulk NO lanza; lee `deleteBulkInstances.errors[]` y cada error trae un campo PLANO `type`. `resolveBusinessErrorCode`/`readErrorExtensions` (que leen `extensions.code` de un error LANZADO) NO aplican a un elemento del payload. El mecanismo primario es un check directo de `type`; `showWarning` ya esta en scope (:3169). DET-32 "reduce" se satisface sin build nuevo. Reuso de `graphqlErrors.ts` OPCIONAL: solo si se centraliza ahi un helper de `type` para consistencia entre ambos paths; no es obligatorio.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Tenant sembrado con objeto bloqueable por Restrict via bulk engine | internal | Necesario para reproducir el bloqueo de dominio en el smoke runtime | Sin el seed, el runtime no se reproduce; se admite smoke-not-reproducible auditado (DET-36) |
| object-manager + suite corriendo | internal | El smoke runtime cruza las tres capas | — |
| UPONE-1600 presente en la base de ejecucion | internal | El fix espeja el patron individual y el baseline de TC-2 lo requiere | RESUELTO: `develop` actualizado 2026-08-12 (al dia con origin, `affeedec` es ancestro); `graphqlErrors.ts` y el patron individual (`develop:6514-6517`) verificados presentes. Precondicion S1.T0: ramificar de `develop` y re-confirmar por simbolo |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Degradar el `<ErrorState>` full-view de carga | medium | la lista deja de avisar fallos de fetch reales | tocar solo la rama `else`/`deleteBulkInstances`; TC-1 VERDE antes y despues |
| Regresion sobre el path individual de 1600 | low | el custom delete deja de avisar bien | no se toca la rama `if (customMutation)`; TC-2 VERDE antes y despues |
| Cerrar sin evidencia runtime (bug config/DB-gated) | medium | "parece arreglado" pero falla en runtime | smoke real DET-36 con tenant sembrado, evidencia capturada; o smoke-not-reproducible auditado |

## Open questions

- ~~**Multi-select `deleteSelectedRows`**~~: **RESUELTO (2026-08-13)**. El dev decidio abordarlo DENTRO de este ticket → Session 3 / REQ-FIX-02. Ya no es open question ni backlog.

## Backlog

| # | Item | Priority | Rationale | Status |
|---|------|----------|-----------|--------|
| BL-1 | ~~Revisar el path multi-select `deleteSelectedRows`~~ | could → **in-scope** | DET-16 propagacion. **PROMOVIDO a alcance (Session 3 / REQ-FIX-02) por decision del dev (2026-08-13)**. Ya no es backlog | done (movido a S3) |
| BL-2 | UPU (entorno): la app curriculum-design no tiene asignaciones en `up1_suite_app_role`, asi que sus RecordLists (Activity/Curriculum/AcademicProgram) quedan inaccesibles para todo rol. Hallazgo AJENO a 130 (bloqueo el smoke DET-36). Follow-up local del entorno, NO ticket Jira | could | DET-16: hallazgo de provisioning detectado en el smoke S2.T3; no defecto del fix | pending |
| BL-3 | Suite (entorno): el sidebar de apps carga vacio para todos los roles (incl. Admin) por un 400 en la query de apps del cliente. Hallazgo AJENO a 130. Follow-up local del entorno, NO ticket Jira | could | DET-16: detectado en el smoke S2.T3; concurre con BL-2 para impedir el runtime en UPU | pending |
| BL-4 | Plataforma (raiz de BL-3): `getAppsFiltered` tira `Cannot query field "homescreen" on type "up1_suite_app"`. El campo `homescreen` (UPONE-1513) esta en el object def (`objects/up1/suite/up1_suite_app.json`) y como columna en BD, pero NO en el typeDef GraphQL generado (`dynamic.js`, 0 ocurrencias en develop). Rompe la nav de apps de TODO el tenant. Ajeno a 130; regresion de plataforma de UPONE-1513. Solo un `codegen`/sync completo consistente lo regenera (un `codegen` parcial deja typeDefs mezclados -> `Unknown type Shift`), lo que reincide en el `db push` destructivo (period NOT NULL). Follow-up local, NO Jira sin OK | could | DET-16: raiz del 400 del smoke S2.T3, diagnosticada al intentar el provisioning + codegen (2026-08-13) | pending |
| BL-5 | Limpieza menor: tras el fix S3, `deleteSelectedRows` ya no lee `stats` del payload, pero la query `DELETE_BULK_INSTANCES` (`RecordList.vue`) sigue pidiendo el bloque `stats { totalProcessed successful failed summary }` en el gql (over-fetch inocuo). Evaluar quitarlo del selection set. Fuera del fix minimo de S3 | could | DET-16: observacion INFO del juez dual de S3 (ex-learn L2). No bloquea; no defecto | pending |

## Decisions

### DEC-LOCAL-01: discriminar por `type` del payload (frontend) sobre agregar `code` a `ValidationError` (backend)
- **Contexto**: el comentario que dejo UPONE-1600 en el codigo sugeria agregar `code` a `ValidationError` en object-manager para emparejar el path bulk con el individual (que discrimina por `extensions.code`)
- **Drivers**: el payload bulk ya trae un campo PLANO `type` y el frontend ya lo pide (`errors { id field message type }`, `RecordList.vue:1787-1791`, verificado); el backend ya puebla `CONSTRAINT_VIOLATION` (`referenceValidationService.js:331`, verificado); `ValidationError.code` seria un cambio de contrato GraphQL compartido por create/update/bulk de todos los mods (blast radius mayor)
- **Opcion elegida**: discriminar por `deleteBulkInstances.errors[].type` en el frontend con un check directo. Cero cambio de backend. NO se reusa `resolveBusinessErrorCode` (opera sobre `extensions.code` de un error LANZADO, otro shape); reuso de `graphqlErrors.ts` opcional solo para centralizar un helper de `type`
- **Alternativas**: (a) agregar `code` a `ValidationError` end-to-end descartada por blast radius y por ser innecesaria (el `type` ya alcanza); (b) reusar `resolveBusinessErrorCode` tal cual descartada por incompatibilidad de shape (payload plano vs extensions de error lanzado)
- **Consecuencias**: fix frontend puro, chico y alineado con el patron de 1600; el contrato GraphQL queda sin tocar
- **Session**: intake (confirmada en design)

## Technical reference

> **Nota de procedencia de numeros de linea**: numeros verificados contra `develop` (actualizado 2026-08-12, al dia con `origin/develop`, incluye UPONE-1600 `affeedec`). develop se mueve: al ejecutar, verificar por SIMBOLO, no por numero fijo.

- Analisis (fuente de verdad): `projects/up1/kb/sp8/ANALISIS-recordlist-bulkdelete-business-reject-full-view-gap.md`
- `RecordList.vue` (verificado en `develop`): `handleCriticalDeleteConfirm` (6446), rama `else`/`deleteBulkInstances` (`bulkErrors` :6485, `error.value = ...` :6487, return :6488), selection set con `type` (`errors {` :1787), `<ErrorState v-if="error">` (~60), `showWarning` en scope (`warning: showWarning` :3170)
- Path individual arreglado por UPONE-1600 (oraculo, verificado en `develop`): `resolveBusinessErrorCode(err)` :6514 -> `showWarning(err.message)` :6515, `else error.value` :6517; import `resolveBusinessErrorCode` :1275. Y `useRowMutation.ts` (toast sin romper vista)
- Util (verificado en `develop`, reuso OPCIONAL): `layout/src/utils/graphqlErrors.ts` (`resolveBusinessErrorCode`, `readErrorExtensions` operan sobre `extensions.code` de error LANZADO; el bulk necesita un helper de `type` plano)
- Backend (contexto, NO se toca): `object-manager/src/services/referenceValidationService.js:331` (`type: ERROR_TYPES.CONSTRAINT_VIOLATION`, verificado), `object-manager/src/graphql/typeDefs/static.js:531` (`type ValidationError` tiene `type`, no `code`)
- Multi-select (EN ALCANCE, Session 3 / REQ-FIX-02): `deleteSelectedRows`, `error.value = ${stats.summary}` en la rama `errors.length > 0` (verificar por simbolo; en el working tree tras S1/S2 esta en `RecordList.vue:6575`). El modal de `bulkDeleteErrors` (`RecordList.vue:~792-843`) vive dentro del `<template v-else>` de datos (`:107-1145`) que el `v-if="error"` (`:60`) desmonta; el Modal molecule teletransporta pero la instancia sigue condicionada por el `v-else`. `fetchData` resetea `error.value=null` (`useDataFetching.ts:136`), por eso el full-view del multi-select es transitorio (flash + teardown/reopen del modal), no persistente como el path critico

## Acceptance checkpoints

- [ ] **Funcional**: TC-3 pasa (toast con mensaje del backend + lista intacta al bloquear); TC-6 (multi-select) el modal muestra los errores por-registro con la lista intacta (`error.value` null)
- [ ] **Tests** (DET-37 dim4): malla (TC-1/TC-2/TC-4) + reproduce (TC-3) en VERDE
- [ ] **Rules**: solo se toca la rama `else`/`deleteBulkInstances`; DET-40 auditoria de reemplazo cubierta
- [ ] **Integration**: error de carga sigue full-view; delete exitoso con refetch; path individual 1600 intacto; multi-select intacto
- [ ] **Runtime (DET-36)**: evidencia real de bloquear un delete via bulk engine -> toast + lista intacta; o smoke-not-reproducible auditado
- [ ] **Docs oficiales** (DET-37 dim1): `recordlist.md` actualizado
- [ ] **Reuso/necesidad** (DET-32): clasificacion por `type` directa (sin build de util nuevo); si se centralizo en `graphqlErrors.ts`, es un helper de `type` plano, no `extensions.code`
- [ ] **Base de ejecucion** (S1.T0): rama creada desde `origin/develop`+1600; `graphqlErrors.ts` y el patron individual verificados presentes antes de S1.T1
- [ ] **Planning-completeness**: entry registrada

## Archiving

Usar `/dkc-archive-spec` cuando deje de ser fuente de verdad. No borrar manualmente.
