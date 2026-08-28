---
id: TICKET-126
project: up1
type: ticket
status: closed
work_type: improvement
module: curriculum-design
autopilot: manual
---

# Follow-up UPONE-1539: doc completa del componente CurriculumMesh + emision de evento en resolvers batch + limpieza de comentarios

## Request

Origen: review de dredd sobre la rama feat/UPONE-1539-modular-mesh (UPONE-1539, malla modular). El review dejo tres frentes de deuda que este follow-up cierra. El ticket original de 1539 esta cerrado; esto es trabajo de seguimiento local (sin Jira).

Alcance:

1. Documentacion COMPLETA del componente CurriculumMesh del mod curriculum-design. No acotado al delta de 1539 ni solo a i18n: auditar todo el funcionamiento del componente, verificar que ya esta documentado y agregar lo que falte. Cubre como minimo:
   - Superficie de contrato: mutations batch createPlanEntriesBatch y deletePlanEntriesBatch en docs/reference/graphql-mutations.md (args, returns, atomicidad, RBAC, semantica de eventos); 6 error codes resolver-local en docs/reference/error-codes.md; planEntry.period nullable en docs/reference/plan-entry-object.md (hoy dice Requerido).
   - Arquitectura (docs/architecture/curriculum-mesh-guards-prereqs.md): reescribir el parrafo REQ-13 para reflejar el lock CONDICIONAL de progression + enforcement server-side mod-owned (hoy describe el lock estatico viejo); agregar seccion de borrado seguro REQ-14 (clasificacion allow/cascade/block por satisfacibilidad, colapso de via unica, atomicidad).
   - Guia de usuario (docs/user-guide/curriculum-mesh.md): modo modular, reescribir PrereqBlockModal (ahora tiene modo guiado que continua la operacion, hoy dice que ambos botones abortan), DeleteEntryModal (3 estados), toggle ver solo seleccionado, filas nuevas en la tabla de tests. Y verificar que el resto del componente ya documentado siga vigente.
   - i18n: namespace completo curriculumMesh.* en docs/reference/i18n-keys.md (deuda preexistente de SP6 + lo nuevo de 1539).
   - Auxiliar: .ai/CONTEXT.md (bloque de malla), docs/guides/seed-data.md y seed/README.md (cross-ref al fixture UPONE-1539-modular-smoke-fixture.sql), docs/architecture/INDEX.md y docs/reference/INDEX.md (tags/conteo).

2. Fix de codigo: los resolvers batch planEntry-batch.resolver.js y planEntry-delete-batch.resolver.js hacen tx.create/delete directo y no emiten el evento de dominio que si emite el CRUD generico (createInstance/deleteInstance). Emitir el evento de planEntry POST-commit en ambos batch para cerrar la divergencia de side-effects entre el path de un-curso y el path batch. Con tests que verifiquen la emision post-commit y la atomicidad.

3. Higiene de codigo: reemplazar en comentarios de codigo (.logic.ts y resolvers) los ids internos de workflow (DET-*, DEC-LOCAL-*, B*, L*) por la explicacion del mecanismo o por el id de Jira UPONE-1539. Los mensajes de commit ya usan el id correcto.

Restricciones: solo el mod curriculum-design (los repos core object-manager/layout/suite son read-only en este follow-up). Ejecutar en la rama feat/UPONE-1539-modular-mesh (no hay PR mergeado). Validar con typecheck + los tests del mod (baseline 1546 verde). No cerrar sin OK del dev.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | improvement |
| Tipo de cambio | — |
| Modulo principal | curriculum-design |
| Modulos afectados | — |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|

### Context found

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | — |
| Base branch | — |
| DB state | — |
| Services | — |
| Test data | — |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | (retroactivo) Restituir los EVENTOS de dominio en el resolver batch no-delegante: `createPlanEntriesBatch`/`deletePlanEntriesBatch` no delegan en el CRUD generico y se saltan `withEventPublish`; se emite el evento POST-commit por fila (`planEntryEvent.js`), paridad de payload con el path unitario, defensivo (rollback = cero eventos). Es el 2do de los tres decorators de la cadena que un resolver directo pierde (RBAC en TICKET-120, eventos aca, DataLog en TICKET-127). | retroactivo (dkc-extract-learns) | 1 | refined | RULE-dev-restitute-rbac-on-nondelegating-resolver (cadena de 3 decorators) |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Backlog

Follow-ups de doc detectados durante este ticket, fuera de su alcance (staleness previa a UPONE-1539). Priority `could`: NO bloquean el cierre de este ticket. Locales del proyecto, sin ticket de Jira.

| # | Item | Priority | Origen | Detalle |
|---|------|----------|--------|---------|
| B1 | `.ai/CONTEXT.md` seccion "Auditoria e historial" describe el workflow relacional del mod como vigente, pero UPONE-1459 lo retiro por completo (ya reflejado en `docs/architecture/INDEX.md` y en los docs de seed). | could | pase de completitud del agente de docs | Es gobernanza de Activity, otro subsistema (no CurriculumMesh). Actualizar esa seccion para reflejar el retiro. |
| B2 | Contradiccion interna doc sobre semantica de prereqCheck: `docs/architecture/curriculum-mesh-guards-prereqs.md` indica que MetricThreshold y Concurrent ahora se evaluan, pero `docs/user-guide/curriculum-mesh.md` (fila del helper `usePrereqRequirements` linea 164 y descripcion de `prereqCheck.logic.spec.ts` linea 189) aun dicen "MetricThreshold nunca bloquea" / "Concurrent no bloquea" (semantica previa a UPONE-1378). | could | pase de completitud del agente de docs | La mencion analoga en `.ai/CONTEXT.md` ya se corrigio en este ticket. Falta reconciliar las 2 lineas del user-guide contra `prereqCheck.logic.ts` / `usePrereqRequirements.ts` reales. |

## Sessions

### Session 1 (2026-08-11) — Ejecucion completa y cierre

Flujo de acciones:
1. Auditoria de la brecha de doc del componente CurriculumMesh contra el codigo real de la rama (agente sonnet): mapa por area, estado STALE/MISSING/OK.
2. Fix de codigo (agente opus): nuevo helper `logic/planEntryEvent.js` que emite el evento de dominio de planEntry POST-commit, por fila, replicando `publishEventForInstance` del platform (queueName/includeFields, `_triggeredBy`, `_previousData` en delete), defensivo (un fallo no rompe la mutacion; rollback = cero eventos). Cableado en `planEntry-batch.resolver.js` y `planEntry-delete-batch.resolver.js`: los impl devuelven los records completos, el resolver emite post-commit y retorna los ids (contrato `[ID!]!` intacto). RBAC via `checkObjectPermissions` preservado.
3. Tests: 2 archivos actualizados al nuevo contrato + `planEntryEvent.test.js` nuevo (payload, filtrado, defensividad, no-emision en rollback, una emision por fila post-commit).
4. Higiene DET-19 (agente opus): reemplazo de ids internos `DET-*/DEC-LOCAL-*/B*/L*` en comentarios de ~22 archivos del mod, conservando `REQ-*`. Solo comentarios, sin cambios de logica.
5. Documentacion (agente opus): cierre de los 10 gaps + pase de completitud del componente. Contrato (2 mutations batch, 6 error codes, period nullable), arquitectura (lock condicional REQ-13 + borrado seguro REQ-14), user-guide (modular, guided add, delete modal, toggle, tabla de tests), i18n namespace completo, `.ai/CONTEXT.md`, seed docs, indices.
6. Verificacion independiente (no self-report): `npm test` = 1559 passed / 0 failed (baseline 1546, +13); `vue-tsc --noEmit` limpio; `git status` de object-manager y layout confirma core intacto; lectura del helper y del wiring post-commit.
7. Commits granulares en `feat/UPONE-1539-modular-mesh`: feat (evento), test, docs, chore (higiene).

Decision de cierre: acceptance por evidencia (tests + typecheck + no-touch core verificados). teachings.close: skipped (follow-up de remediacion de baja carga didactica, teach_policy=skip auditado). Learns raw: 0 (nada pendiente). Backlog B1/B2 priority `could`: no bloquean el cierre (DET-17). Cerrado con OK explicito del dev.

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| curriculum-design vitest | `npm test` | 1546 passed / 0 failed | 1559 passed / 0 failed | +13 (emision de evento, atomicidad de side-effects) |
| curriculum-design typecheck | `npx vue-tsc --noEmit` | limpio | limpio | sin cambios |

## Summary

Follow-up de UPONE-1539 que cierra los tres hallazgos del review de dredd sobre la rama de malla modular, y amplia el alcance a la documentacion completa del componente CurriculumMesh (decision del dev).

Resultado:
- **Divergencia de eventos (era Consulta del review): resuelta.** Los resolvers batch `createPlanEntriesBatch`/`deletePlanEntriesBatch` ahora emiten el evento de dominio de planEntry POST-commit, por fila, con paridad de payload al path de instancia unica, sin romper la atomicidad (rollback = cero eventos, publicacion defensiva). Helper nuevo `logic/planEntryEvent.js`.
- **Doc REQ-13 stale (era 🟡): resuelta.** Reescrita a lock condicional + enforcement server-side mod-owned. Ademas, doc completa del componente: contrato (mutations batch, error codes, period nullable), arquitectura (borrado seguro REQ-14), user-guide (modular, guided add, delete modal, toggle, tests), i18n namespace completo, indices y `.ai/CONTEXT.md`.
- **Ids internos en comentarios (era ⚪): resuelta.** `DET-*/DEC-LOCAL-*/B*/L*` reemplazados en ~22 archivos, `REQ-*` conservados.

Evidencia: 1559 tests verde (verificado de forma independiente), typecheck limpio, core (object-manager/layout) intacto, 4 commits granulares en `feat/UPONE-1539-modular-mesh`.

Limitaciones asumidas al cierre (documentadas, no bloqueantes):
- Lint no ejecutado por fallo de entorno preexistente (ajv/eslintrc), ajeno al cambio.
- La emision del evento esta probada a nivel unit/mock y resolver; falta un smoke runtime por rol contra Redis real (el RBAC del batch si tiene integracion real). Es el limite honesto de la verificacion unit/estatica.
- Backlog B1/B2: dos staleness de doc previas a UPONE-1539 (workflow de auditoria retirado por UPONE-1459; contradiccion arch vs user-guide sobre MetricThreshold/Concurrent), priority `could`.
