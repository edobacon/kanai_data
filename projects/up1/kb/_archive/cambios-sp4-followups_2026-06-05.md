# Cambios SP4 — follow-ups de calidad + fixes del create flow (2026-06-05)

| Campo | Valor |
|---|---|
| **Autor** | Eduardo Bacon |
| **Fecha** | 2026-06-05 |
| **Sprint / épica** | SP4 — UPONE-1206 (core) + UPONE-1038 (curriculum-design) |
| **Tracking DKC** | TICKET-056, TICKET-058 (deckard/projects/up1) |
| **Estado de merge** | Commits **locales** en ramas de épica (`UPONE-1206`, `UPONE-1038`). **Sin push** — merge a `develop` gated por revisión team up1 (RULE-dev-004). |
| **Origen** | Promoción de la auditoría de calidad SP4 (TICKET-055) + hallazgos del E2E de verificación de clonado/versionado. |

> Documento de tracking: **qué se hizo, cuándo, y los commits**. `uplanner/specs` no es repo git; los hashes referencian los commits reales en los repos de código (`layout`, `object-manager`, `mods/curriculum-design`).

---

## 1. TICKET-056 — Calidad SP4 (type-safety layout + guard de atomicidad RT)

**Qué se hizo** (alcance: solo código introducido por el sprint, verificado por git blame):

- **layout** — composables/utils de row action:
  - Type-safety: `any`/`Function` → tipos precisos en `useCreateRowAction.ts` / `useRowActionHandler.ts` (incl. `apolloClient` tipado contra superficie mínima `Pick<ApolloClient,'mutate'>` — interface segregation, evita romper consumidores).
  - `'none'` añadido a `EnhancedRowAction.redirectTo` (sync con `RowAction.redirectTo`).
  - `isRef` de vue en vez de duck-typing; quitado flag `i` redundante del regex de `humanizeObjectName`.
  - Dedup de `createDownloadTemplateHandler`/`createImportTemplateHandler` en helper compartido.
  - Quitados 3 `console.log` de debug de `RecordListElement.vue`; `catch {}` silencioso → `console.warn`.
- **object-manager** — `version-from-source.js`:
  - **Guard de atomicidad (A1)**: `prepareVersionData` rechaza `asNewVersion` sobre un RecordType (el path RT de create no es atómico). Vive en el helper puro, upstream del resolver; no toca `instance.resolver.js`. Latente hoy (ningún versionable es RT). + normalización prettier.
  - **B9 NO ejecutado**: falso positivo del audit (la var `prefix` está en uso).

**Validación**: suite layout 936→942 (+6 tests, 0 regresiones); object-manager 1851→1853 (+2 tests guard A1, 0 regresiones); typecheck = baseline; **E2E Playwright del flujo de clonado/versionado verde** (createInstance 200, v4 con linaje + estado inicial BOR + deep-clone de hijos).

**Commits**:

| Repo / rama | Hash | Subject |
|---|---|---|
| layout / UPONE-1206 | `74ac54d` | refactor(layout): type-safety + dedup en composables de row action |
| layout / UPONE-1206 | `455c841` | chore(layout): quitar 3 console.log de debug de RecordListElement |
| layout / UPONE-1206 | `035317e` | test(layout): cobertura de template row action handlers |
| object-manager / UPONE-1206 | `fd48024` | fix(versioning): guard de atomicidad rechaza asNewVersion sobre RecordType (A1) |
| object-manager / UPONE-1206 | `23a9815` | test(versioning): cobertura del guard A1 |

---

## 2. TICKET-058 — Scratch Activity create asigna workflow + estado por defecto

**Problema** (descubierto en el E2E de TICKET-056): crear un `Activity` desde cero (botón "Crear registro" → `createInstance` genérico) fallaba — `Activity.workflowId` es `not_null` y el create no asignaba workflow → Prisma rechazaba (*"Error al Crear Activity · Ubicación: Workflow"*). El versionado funcionaba porque copia el workflow del origen.

**Qué se hizo** (enfoque frontend, layering intacto — `Workflow` es dominio del mod; el core no lo aprende):

- **layout** (`RecordDetail.vue`): nuevo `valueSource` **`DEFAULT_BY_QUERY`** en `autoAssignFields` (resuelto en submit-time). Domain-agnostic: resuelve el id (o un campo via `returnField`) del registro de un objeto que matchea un filtro, por query (robusto a reseed; no hardcodea ids cuid).
- **curriculum-design** (`config/layouts/default_Activity_create.json`): `autoAssignFields` (hidden, `editable:false`) para `workflowId` (returnField `id`) + `currentStatusId` (returnField `initialStatusId`) sobre `Workflow {scopeType:activity, isDefault:true}`. Restaura el intent del escenario `create-activity-shell.md` (TICKET-009), adaptado al modelo actual.

**Concordancia con el versionado**: ambos terminan con `currentStatusId = workflow.initialStatusId` (estado BOR/Borrador). Verificado: los ids auto-asignados coinciden con los del path de versionado.

**Validación E2E**: scratch create `createInstance` 200, `workflowId`/`currentStatusId` auto-asignados, Activity creado en estado Borrador, 0 errores de consola.

**Nota operativa**: el `npm run sync` completo falla por drift preexistente de schema BASEMODEL (ajeno); se usó `SYNC_AUTO_APPLY_SCHEMA=false` para empujar el config/layout a la DB (mi cambio es solo config, no toca schema).

**Commits**:

| Repo / rama | Hash | Subject |
|---|---|---|
| layout / UPONE-1206 | `cdea566` | feat(layout): valueSource DEFAULT_BY_QUERY en autoAssignFields |
| curriculum-design / UPONE-1038 | `8e6ad13` | feat(curriculum-design): autoAssign workflow+estado por defecto en Activity create |

---

## 3. Quick-fix — campo `version` numérico en Activity create

**Problema**: en `default_Activity_create.json`, `version` era `type:text` sin validación → aceptaba texto que Prisma rechazaba al guardar (`version` es `Int`); el usuario solo se enteraba al fallar el guardado.

**Qué se hizo** (curriculum-design, `default_Activity_create.json`): `version` → `inputType:"number"` + `rules:"required|numeric"` (coherente con `credits` en el mismo form). El input bloquea letras al tipear.

**Validación E2E**: input `type="number"`; tipear `"abc"` → rechazado; `"7"` → OK.

**Commit**:

| Repo / rama | Hash | Subject |
|---|---|---|
| curriculum-design / UPONE-1038 | `109460b` | fix(curriculum-design): version numérico en Activity create (inputType number + rule numeric) |

---

## Pendientes / deuda registrada

- **Drift de schema BASEMODEL**: bloquea el `npm run sync` completo (los ~17 schemas Prisma del working tree). Fix = regenerar baseline (NO `--accept-data-loss`). Es ops de DB, no de estos cambios.
- **Atomicidad del path RT** (TICKET-056 backlog B1): unificar el path RT de `createInstance` con `$transaction` Serializable — candidato a RULE-core. El guard de A1 acota el riesgo activo; la cirugía de fondo queda pendiente.
- **Scoping de institución** (TICKET-058): el resolver `DEFAULT_BY_QUERY` toma el primer match `isDefault+scopeType` — correcto para UPU (un solo activity workflow en UPU-MAIN). Si UPU se vuelve multi-institución, extender el `match` con `{{formData.executionUnit.institutionId}}`.
- **Test data en UPU**: Activities de prueba creados en E2E (`E2E058 scratch create`, `E2E version-text test`) — limpiar en el próximo reset.
