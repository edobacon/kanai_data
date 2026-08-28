---
id: SPEC-layout-fix-recordlist-delete-error-render
project: up1
ticket: TICKET-123
status: in_progress
---

# Fix: un bloqueo legitimo de custom delete debe mostrarse como aviso, no como error de carga full-view

# Fix: un bloqueo legitimo de custom delete debe mostrarse como aviso, no como error de carga full-view

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle tecnico vive en Requirements, Fix scope y Tasks.*

**Que se quiere**: cuando un borrado gobernado (`customDeleteMutation`) es rechazado por el servidor con un error de dominio legitimo (ej. un esquema de niveles en uso por una matriz), el `RecordList` hoy reemplaza toda la lista por la pantalla de error de carga con texto generico ("Ocurrio un error inesperado"). El mensaje util del backend ("inactivalo en su lugar") nunca se ve y el usuario pierde la vista. El path de rowAction `type: mutation` ya lo hace bien (toast, vista intacta); este fix lleva el custom delete a esa paridad.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Opcion A1 (mostrar el error del custom delete como toast sin tocar `error.value`), NO A2 (convencion `_PERSONALISED_ERROR` end-to-end) | A2 no es cambio de front puro: el `code` se pierde en `extensions` (llega como `INTERNAL_SERVER_ERROR`), asi que exigiria cambiar el backend de cada mod + un composable compartido por toda la plataforma. A1 arregla ambos sintomas con una funcion |
| 2 | Cambiar SOLO la rama `customMutation` del catch; no tocar el `error.value` de carga | El `<ErrorState>` full-view de fetch/filtro debe seguir intacto; el fix afecta solo el resultado de la accion de borrar, no la carga de la lista |
| 3 | Cierre con verificacion runtime real (DET-36), no solo unit de componente | El comportamiento es config-driven (layout con `customDeleteMutation`) y DB-gated (el rechazo "en uso" es una query cross-tabla); un unit no representa el runtime |

**Riesgos principales y como los mitigamos**:

- **Degradar el error de CARGA real de la lista** → el fix toca solo la rama `if (customMutation)` del catch; TC-1 (error de carga sigue mostrando `<ErrorState>` full-view) VERDE sobre codigo actual y tras el fix.
- **Romper otros consumers de `customDeleteMutation`** (ej. `deleteObjectDefinition`) → el cambio es generico en `RecordList`, aplica a todos por igual y ahora muestra toast en vez de nuke; se verifica que siguen operando.
- **Cerrar sin evidencia runtime** (bug config/DB-gated) → smoke real con OM + suite + tenant UPU sembrado (DET-36).

**Que NO se hace en este ticket**:

- **Opcion A2' (contrato de errores estructurados backend→front con `extensions.code`)**: cierra la clase entera "el texto del backend no llega al usuario" en toda la plataforma, pero es refactor transversal backend + core. Follow-up de deuda tecnica.
- **El bloqueo del backend (guard R9)**: es correcto por diseño, no se toca.
- **El frente backend** (false-RESTRICT del bulk delete): es [[TICKET-122]], hermano de mismo `external`.

**Tamano estimado**: 2 sessions ejecutables (~1.5 dia efectivo), tier T3 (user-facing con verificacion runtime). La mas delicada es la Session 2 (smoke runtime real contra tenant sembrado).

**Como vas a saber que funciona**:

- Borrar un esquema de niveles en uso (`LS-100`) muestra un aviso (toast) con "esta en uso, inactivalo en su lugar" y la lista permanece visible.
- Borrar una escala libre la elimina normalmente (toast de exito + refetch).
- Un error de carga de la lista (fetch/filtro) sigue mostrando la pantalla `<ErrorState>` full-view.

---

## Purpose

Corregir el renderizado de un rechazo de dominio del custom delete en `RecordList.vue` del core `layout-engine`. Hoy `handleCriticalDeleteConfirm` escribe el error en `error.value`, el mismo ref que gobierna el `<ErrorState>` full-view de carga, y `useFriendlyErrors` no reconoce el mensaje del backend (cae al generico). El fix (A1) muestra el mensaje del servidor como toast en la rama `customMutation` del catch sin tocar `error.value`, espejando `useRowMutation` (el path que ya funciona). Aplica a todo consumer de `customDeleteMutation`. El bloqueo del backend es correcto; solo se corrige como se muestra.

## Requirements

### REQ-FIX-01: un custom delete rechazado muestra el mensaje del servidor como aviso y conserva la lista

> **Que cambia**: cuando borras algo que el servidor rechaza por dominio (ej. un esquema en uso), ves un aviso (toast) con el mensaje real del servidor y la lista sigue en pantalla, en vez de una pantalla roja generica que reemplaza todo.
> **Por que**: hoy el catch escribe el error en el ref de carga de la lista y el mensaje util del backend se pierde tras el texto generico.

El sistema MUST, en la rama `customMutation` de `handleCriticalDeleteConfirm`, mostrar el mensaje de error del servidor como notificacion (toast, via `showWarning`/`showErrorNotification`) SIN setear `error.value`, de modo que la lista permanezca montada.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: custom delete rechazado por dominio
- **GIVEN** un listado con `customDeleteMutation` cuyo resolver rechaza por dominio (ej. LevelScheme en uso)
- **WHEN** el usuario borra una fila que el backend rechaza
- **THEN** se muestra un toast con el mensaje del servidor Y la lista NO se reemplaza (`error.value` queda null, el `<ErrorState>` no se monta)

#### Scenario: otros consumers de customDeleteMutation
- **GIVEN** otro consumer (ej. `deleteObjectDefinition` del editor de object-manager)
- **WHEN** el borrado es rechazado
- **THEN** el error se muestra como toast, sin romper la vista

</details>

#### Acceptance
**El usuario puede verificar que funciona**: borrar un esquema de niveles en uso; aparece un aviso con "inactivalo en su lugar" y la lista sigue visible.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-3 | Reproduce el bug | listado con customDeleteMutation que rechaza | borrar fila rechazada | toast con mensaje backend + lista intacta | `error.value` null, `<ErrorState>` no montado (ROJO hoy, VERDE con fix) |
| TC-5 | Segundo consumer de customDeleteMutation | listado con OTRO consumer (ej. `deleteObjectDefinition`) cuyo delete es rechazado | borrar fila rechazada | toast con el error, lista intacta | mismo comportamiento que TC-3 (el fix es generico, no per-objeto) |

### REQ-REGRESSION-01: el error de carga, el delete exitoso y el bulk se preservan

> **Que cambia**: nada visible en los otros caminos; el fix afecta solo el rechazo del custom delete.
> **Por que**: `RecordList` maneja errores por cuatro caminos; tres deben quedar intactos.

El sistema MUST preservar: (a) el `<ErrorState>` full-view para errores de CARGA (fetch/filtro); (b) el custom delete EXITOSO con toast de exito + `fetchData(true)`; (c) el bulk delete con su modal `bulkDeleteErrors` propio.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: error de carga sigue mostrando full-view
- **GIVEN** un fallo de fetch/filtro de la lista
- **WHEN** ocurre el error de carga
- **THEN** se muestra el `<ErrorState>` full-view (no se degrada a toast)

#### Scenario: custom delete exitoso
- **GIVEN** un custom delete que el backend acepta
- **WHEN** se completa
- **THEN** toast de exito + refetch de la lista

#### Scenario: bulk delete intacto
- **GIVEN** una seleccion multiple con errores en el borrado en bloque (`handleDeleteConfirmed`)
- **WHEN** se ejecuta el bulk delete
- **THEN** sigue usando su modal `bulkDeleteErrors` propio (no toast, no `error.value`), sin cambio de comportamiento

</details>

#### Acceptance
**El usuario puede verificar que funciona**: forzar un error de carga de la lista sigue mostrando la pantalla de error completa; un borrado exitoso sigue refrescando la lista con toast de exito.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-1 | Error de carga | fallo de fetch/filtro | render de la lista | `<ErrorState>` full-view | full-view intacto (VERDE sobre codigo actual) |
| TC-2 | Custom delete exitoso | delete aceptado por backend | completar | toast de exito + refetch | exito (VERDE sobre codigo actual) |
| TC-6 | Bulk delete intacto | seleccion multiple con errores | bulk delete (`handleDeleteConfirmed`) | modal `bulkDeleteErrors` propio | sin cambio (VERDE sobre codigo actual y tras el fix) |

## Fix scope

### Antes (comportamiento actual)
`handleCriticalDeleteConfirm` (`RecordList.vue:6416`), en el `catch` de la rama `customMutation`, hace `error.value = 'Error deleting record: ' + err.message`. `error.value` gobierna el `<ErrorState>` full-view (`RecordList.vue:60`, `v-if="error"`), asi que la lista entera se reemplaza. El texto pasa por `useFriendlyErrors`, que no reconoce el mensaje del backend y devuelve el generico.

### Despues (comportamiento esperado)
La rama `customMutation` del catch muestra el mensaje del servidor como toast (`showWarning`, passthrough del texto ya user-ready) y NO setea `error.value`. La lista permanece montada. Espeja `useRowMutation.ts:151`. El resto de los paths de error (carga, delete exitoso, bulk) sin cambios.

### Archivos afectados
| File | Change | Impact |
|------|--------|--------|
| `layout/src/layouts/RecordList/RecordList.vue` | En `handleCriticalDeleteConfirm`, rama `customMutation` del catch: toast del mensaje del servidor, sin setear `error.value` | Todo consumer de `customDeleteMutation` (levelScheme, coverageScheme, objectDefinition, etc.) |
| `layout/src/layouts/RecordList/RecordList.spec` (o el test de componente vigente) | Agregar TC-1..TC-3 | Cobertura del render de error del custom delete, hoy inexistente |
| `layout/docs/features/recordlist.md` | Documentar que un rechazo de `customDeleteMutation` se muestra como toast (paridad con rowAction mutation) y no reemplaza la lista | Doc oficial del comportamiento observable |

## Tasks

### Session 1 — Red de seguridad + RED del bug (tests-first) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Escribir la malla de seguridad y correrla VERDE sobre el codigo ACTUAL (sin tocar codigo): TC-1 (error de carga fetch/filtro muestra `<ErrorState>` full-view), TC-2 (custom delete exitoso -> toast de exito + refetch), TC-6 (bulk delete conserva su modal `bulkDeleteErrors`) | REQ-REGRESSION-01 | developer | — | layout/src/layouts/RecordList/RecordList.spec | Los 3 tests VERDE contra codigo actual (si alguno sale rojo: revisar diagnostico antes de seguir) | git revert | DET-7, DET-33 | pending | 1 |
| S1.T2 | Escribir el test que reproduce el bug (RED): TC-3 (custom delete que rechaza -> assert toast con mensaje del backend Y `error.value` null / `<ErrorState>` no montado). Debe salir ROJO contra el codigo actual | REQ-FIX-01 | developer | S1.T1 | layout/src/layouts/RecordList/RecordList.spec | TC-3 ROJO reproducible contra codigo actual | git revert | DET-7, DET-13 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions` con Template de Gate, confirmar malla VERDE + RED reproducible, decidir continue/iterate | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + decision documentada | (no aplica) | DET-20, DET-23 | pending | 1 |

### Session 2 — Implementar A1 + smoke runtime + cerrar [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S2.T2, S2.T4]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Implementar A1: en la rama `customMutation` del catch de `handleCriticalDeleteConfirm`, mostrar el mensaje del servidor como toast (`showWarning`) y NO setear `error.value`. Cambiar SOLO esa rama. Antes de editar, enumerar 1:1 lo que hacia el path viejo (setear `error.value`, montar `<ErrorState>`, pasar por `translateError`) y verificar que el nuevo replica lo que debe (mostrar el error al usuario) sin arrastrar el nuke de la vista (DET-40 auditoria de reemplazo) | REQ-FIX-01 | developer | S1.GATE | layout/src/layouts/RecordList/RecordList.vue | TC-3 pasa a VERDE; la malla (TC-1/TC-2/TC-6) sigue VERDE | git revert | DET-5, DET-8, DET-11, DET-40 | pending | 2 |
| S2.T2 | Agregar TC-5 (un SEGUNDO consumer de `customDeleteMutation`, ej. `deleteObjectDefinition`, cuyo delete rechazado se muestra como toast con la lista intacta — evidencia de que el fix es generico, no per-objeto) y correr `RecordList.spec` completo (regression): confirmar que ningun test previo queda rojo y que los cuatro paths de error se comportan como se espera | REQ-FIX-01, REQ-REGRESSION-01 | developer | S2.T1 | layout/src/layouts/RecordList/RecordList.spec | suite de componente VERDE incluido TC-5; sin regresion | git revert | DET-7, DET-14 | pending | 2 |
| S2.T3 | Smoke runtime real (DET-36): OM + suite + tenant UPU sembrado (matriz `MAT-GEN` -> `LS-100`). Borrar `LS-100` (en uso) muestra el aviso "inactivalo en su lugar" con la lista intacta; borrar una escala libre la elimina. Capturar evidencia runtime real (screenshot/console/DOM), no referencia a test file | REQ-FIX-01 | reviewer | S2.T1 | (runtime: layout + suite + object-manager sobre UPU) | evidencia runtime real: toast + lista intacta al borrar `LS-100`; escala libre eliminada | (no aplica — verificacion) | DET-13, DET-33, DET-36 | pending | 2 |
| S2.T4 | Actualizar la doc oficial: en `recordlist.md` documentar que un rechazo de `customDeleteMutation` se muestra como toast (paridad con rowAction mutation) y no reemplaza la lista (DET-37 dim1). Marcar resuelto el BUG en el KB (dim2) | REQ-FIX-01 | developer | S2.T1 | layout/docs/features/recordlist.md, projects/up1/kb/sp8/BUG-core-recordlist-harddelete-block-renders-as-load-error.md | doc refleja el comportamiento nuevo; BUG marcado resuelto; lint frontmatter/cross-ref | git revert | DET-16, DET-37 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T3)** — persistir en `## Sessions`, quality review (DET-23) + verificacion runtime (DET-36), verificar acceptance con evidencia real, decidir continue/iterate | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + acceptance verificado con evidencia runtime | (no aplica) | DET-13, DET-20, DET-23, DET-36 | pending | 2 |

## Constraints

- DET-40 (auditoria de reemplazo): al reenrutar el manejo de error de la rama `customMutation`, enumerar 1:1 que hacia el path viejo (setear `error.value`, montar `<ErrorState>`, pasar por `translateError`) y verificar que el nuevo replica lo que debe (mostrar el error al usuario) sin arrastrar el nuke de la vista.
- RULE-dev-004 (core work policy): `layer: core`, trabajo en rama unica `UPONE-1557`; merge a develop gated por revision del team up1.
- RULE-no-touch-layout (feedback): `layout/` es core; el cambio es quirurgico y esta autorizado por el ticket. No expandir el alcance a `useFriendlyErrors` (eso es A2', fuera de scope). `useFriendlyErrors.ts` queda en `execute_scope` como archivo relacionado pero NINGUNA task lo toca (auto-limitacion explicita).
- **execute_scope refinado (design)**: se agrego `layout/docs/features/recordlist.md` al scope del ticket (DET-37 dim1: la doc oficial es MUST porque el cambio es observable en la UI). No introduce codigo nuevo; queda ratificado con el `spec-approval` del dev.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Tenant UPU sembrado (curriculum-mapping) | internal | Necesario para reproducir el rechazo de dominio (`LS-100` en uso por `MAT-GEN`) en el smoke runtime | Sin el seed, no se reproduce el runtime (DET-36) |
| object-manager + suite corriendo | internal | El smoke runtime cruza las tres capas | — |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Degradar el `<ErrorState>` full-view de carga | medium | la lista deja de avisar fallos de fetch reales | tocar solo la rama `customMutation`; TC-1 VERDE antes y despues |
| Romper otros consumers de `customDeleteMutation` | low | otros editores dejan de borrar bien | cambio generico en RecordList; verificar que muestran toast sin romper vista |
| Cerrar sin evidencia runtime (bug config/DB-gated) | medium | "parece arreglado" pero falla en runtime | smoke real DET-36 con tenant sembrado, evidencia capturada |

## Open questions

- (ninguna — H1 y H2 confirmadas en el intake)

## Decisions

### DEC-LOCAL-01: Opcion A1 (toast en la rama custom delete) sobre A2 (convencion _PERSONALISED_ERROR end-to-end)
- **Contexto**: el custom delete rechazado se renderiza como error de carga full-view generico
- **Drivers**: blast radius, riesgo de regresion sobre ~40 patrones de `useFriendlyErrors`, que A2 no es cambio de front puro (el code se pierde en `extensions`), paridad con `useRowMutation`
- **Opcion elegida**: A1 — toast del mensaje del servidor en la rama `customMutation`, sin tocar `error.value`
- **Alternativas**: A2 (convencion end-to-end) — descartada por requerir cambio backend transversal + composable compartido; A2' (contrato de errores estructurados) — follow-up de deuda tecnica
- **Consecuencias**: arregla ambos sintomas visibles con una funcion, aplica a todos los consumers; deja latente la convencion `_PERSONALISED_ERROR` en el resto de la plataforma (A2')
- **Session**: intake (confirmada en design)

## Technical reference

- Bug (fuente de verdad): `projects/up1/kb/sp8/BUG-core-recordlist-harddelete-block-renders-as-load-error.md`
- `RecordList.vue`: `handleCriticalDeleteConfirm` (6359; rama `customMutation` 6373; catch -> `error.value` 6416 — punto del fix), `<ErrorState v-if="error">` (60), bulk delete `handleDeleteConfirmed` (6464/6514 — NO se toca)
- `useRowMutation.ts:151`: oraculo del comportamiento correcto (toast, vista intacta)
- `useFriendlyErrors.ts`: `ERROR_PATTERNS` (65), `DEFAULT_ERROR` (414), `translateError` (484) — NO se toca en A1
- Backend (contexto, NO se toca): `mods/curriculum-mapping/logic/levelScheme-upsert.resolver.js` (`deleteLevelScheme` 475, guard R9 `assertSchemeNotInUse` 353), `helpers/personalisedError.js`, seed `MAT-GEN -> LS-100`
- Config del layout: `mods/curriculum-mapping/config/layouts/default_LevelScheme_list.json:82` (`customDeleteMutation: deleteLevelSchemeValidated`, `deleteWarning.type: critical`)

## Acceptance checkpoints

- [ ] **Funcional**: TC-3 pasa (toast con mensaje del backend + lista intacta al rechazar)
- [ ] **Tests** (DET-37 dim4): malla (TC-1/TC-2) + reproduce (TC-3) en VERDE
- [ ] **Rules**: solo se toca la rama `customMutation`; DET-40 auditoria de reemplazo cubierta
- [ ] **Integration**: error de carga sigue full-view; delete exitoso con refetch; bulk intacto; otros consumers operan con toast
- [ ] **Runtime (DET-36)**: evidencia real de borrar `LS-100` (en uso) -> toast + lista intacta; escala libre eliminada
- [ ] **Docs oficiales** (DET-37 dim1): `recordlist.md` actualizado
- [ ] **KB DKC** (DET-37 dim2): BUG marcado resuelto
- [ ] **Planning-completeness**: entry registrada

## Archiving

Usar `/dkc-archive-spec` cuando deje de ser fuente de verdad. No borrar manualmente.
