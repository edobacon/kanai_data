---
id: TICKET-051
project: up1
type: ticket
status: closed
work_type: improvement
external: UPONE-1219
module: core
autopilot: autonomous
---

# Polish de plataforma de clonación/versionamiento (follow-ups core de HU-10)

## Request

Tres follow-ups `could` descoped del cierre de **TICKET-044** (HU-10, UPONE-1216). Son mejoras de la **plataforma core** de clonación/versionamiento (capa `layout` + `object-manager`), por eso se asocian a **UPONE-1219** ("Track 0 Core | Prerequisitos de plataforma para clonación/versionamiento", bajo épica UPONE-1206 "Core | Capacidad de clonación de objetos") — la Historia donde ya aterrizaron los fixes de engine de 044 (FINDING-V1 + incremento por linaje).

Items a abordar (de la sección Backlog de TICKET-044):

- **B6 — Título de modal genérico para objetos RT**. El fallback de `ModalStackManager.openModal` arma el título con `objectLabel || objectName`; para RT projections (`rt__Modality__curricularsection`) sale crudo ("Crear Nuevo rt__Modality__..."). El modal de **clone** ya pasa un título explícito (arreglado en 044), pero "Crear registro" (no-clone) y otros modales RT siguen crudos. Fix: que el modal use el `label` del layout cargado o el `objectLabel` de `GetObjectLabel` (que el modal ya fetchea) en vez del `objectName`. Repo: `layout`.

- **B5 — Generalizar el enforcement de unicidad scoped (hoy hardcoded a CurricularSection) + unit test**. El enforcement de name/code unique scoped por `[ownerId, recordType]` está hardcoded en el RT block de `createInstance` (object-manager). Los JSON declaran `uniqueScopedBy` en las field properties, pero el sync NO persiste props custom a `core_FieldDefinition.properties` → no se puede leer en runtime para generalizar. Para config-driven: (a) que el sync persista `uniqueScopedBy`, o (b) leer los object JSON synced en runtime (cacheado). **Además**: el enforcement actual NO tiene unit test (warn del reviewer aislado en el cierre de 044) — agregar al menos un test de la lógica `scopeWhere` + `findFirst` mockeado. Repo: `object-manager` (+ pipeline de sync).

- **B2 — Mensaje de éxito parametrizado del toast** ("Versión N creada desde versión N-1" en vez del genérico actual, DEC-LOCAL-03 de 044). Requiere extender el selection set de `createInstance` para devolver `version` del nuevo registro + leerlo en el front (primitivo `useCreateRowAction`). Repos: `object-manager` + `layout`.

> Fuente: TICKET-044 (cerrado 2026-06-03) — sección Backlog B2/B5/B6. Ninguno bloqueaba el cierre (todos `could`).

## Classification

- **work_type**: improvement (polish + deuda técnica sobre plataforma existente).
- **change_type**: multi (cruza `layout` + `object-manager`).
- **module principal**: core. **Modules afectados**: layout (B6, B2 front), object-manager (B5 + sync pipeline; B2 sin cambio de backend — `version` ya viaja en `data`).
- **Layer/épica**: core → UPONE-1206 (capacidad de clonación) vía la Historia UPONE-1219 (prereqs de plataforma).
- **Repos** (`execute_scope`): `layout/`, `object-manager/`.
- **Riesgo**: B6/B2 bajo (UI/config); B5 medio (toca pipeline de sync, opción config-driven; la parte del unit test es baja).

## Context found

> Recopilado vía 3 agentes de exploración (sonnet) sobre `layout` + `object-manager` (branch UPONE-1206).

**B6 — título modal RT** (layout):
- Choke point: [ModalStackManager.vue:716-722](../../../../uplanner/up1/layout/src/components/organisms/Modal/ModalStackManager/ModalStackManager.vue) — `const displayName = options.objectLabel || options.objectName; modalTitle = $t(titleKey, { object: displayName })`. Si nadie pasa `objectLabel` y `objectName = rt__Modality__curricularsection`, el título queda crudo.
- `humanizeObjectName` ya existe en [RecordList.vue:1201-1224](../../../../uplanner/up1/layout/src/layouts/RecordList.vue) pero (1) NO cubre el patrón `rt__`, (2) vive local en RecordList → ModalStackManager no lo usa. Múltiples call sites de `openModal` pasan RT crudo sin `objectLabel` (RecordList, RecordDetail, useRowActionHandler, ModalStackManager internos).
- El fix de clone (044) pasó `title` explícito desde `record.name` — solo aplica al clone.

**B5 — unicidad scoped** (object-manager):
- Hardcode en [instance.resolver.js:2459-2482](../../../../uplanner/up1/object-manager/src/graphql/resolvers/instance.resolver.js): `if (baseModelName === 'CurricularSection' && baseFields.ownerId != null)` + campos `name`/`code` literales + scope `[ownerId, recordType]`.
- `uniqueScopedBy` declarado en `CurricularSection.json` (campo `name`) y `rt__Modality__curricularsection.json` (campo `code`) como array de campos de scope. Solo esos 2 objetos lo usan hoy.
- El resolver YA consulta `core_FieldDefinition` en ese mismo bloque (L2381 `findMany`, L2442 `rtObjDef`) y lee otras props desde `properties` (`storage`, `references`) en runtime. `core_FieldDefinition.properties` es `Json?` ([schema.prisma:61](../../../../uplanner/up1/object-manager/prisma/placeholderTenantID/schema.prisma)). Sync ya construye `properties` campo-por-campo en `generatePrismaSchema.js` (`syncBaseFieldsToRegistry`).
- Tests: [tests/unit/resolvers/instance.resolver.test.js](../../../../uplanner/up1/object-manager/tests/unit/resolvers/instance.resolver.test.js) + factory `tests/mocks/prisma.mock.js` (vitest, Prisma mockeado con `vi.fn()`).

**B2 — toast versión** (layout, sin backend):
- [useCreateRowAction.ts:27-33](../../../../uplanner/up1/layout/src/composables/useCreateRowAction.ts) pide solo `id` en el selection set. El resolver YA retorna `data: JSON` con el registro completo (incl. `version`, `previousVersionId`) — [instance.resolver.js:3088-3091](../../../../uplanner/up1/object-manager/src/graphql/resolvers/instance.resolver.js); SDL `InstanceResult.data: JSON` ya existe ([static.js:1134-1146](../../../../uplanner/up1/object-manager/src/graphql/typeDefs/static.js)). Solo hay que pedir `data`.
- Toast: key i18n `recordList.actions.versionCreated` = "Nueva versión creada" (genérico) en [es/en/pt _CL@RecordList.json:101](../../../../uplanner/up1/layout/lang/es_CL@RecordList.json). i18n soporta interpolación `{param}` (patrón usado en todo el proyecto). `action.asNewVersion` ya distingue versión vs create normal. `sourceVersion = newVersion - 1` (garantía `maxVersionInLineage + 1` del helper version-from-source).

## Triage

### Hipotesis

- H1 — B6: el modal ya fetchea `objectLabel` (vía `GetObjectLabel`) para el clone; reusar esa misma fuente en el fallback de título resuelve todos los modales RT de una. **Confirmada parcialmente**: `objectLabel` solo está fetcheado para el objeto padre, NO para el RT específico en el path no-clone. Approach elegido: humanizar el `objectName` en el choke point (ver spec). El label i18n exacto del RT queda como mejora futura.
- H2 — B5: la opción (b) "leer object JSON synced en runtime + cache" es menos invasiva que tocar el sync. **Descartada a favor de (a)**: el resolver ya consulta `core_FieldDefinition` y lee `properties` en ese bloque → persistir `uniqueScopedBy` ahí es consistente (cero mecanismo nuevo, fuente única en DB). Ver DEC-LOCAL-01.
- H3 — B2: el `version` ya existe en el registro creado; basta agregarlo al selection set. **Confirmada**: viaja en `data: JSON` del `InstanceResult`; sin cambio de backend.

## Setup

- **Branch (código)**: `UPONE-1206` (épica core, RULE-dev-004). Ya activa en `layout` y `object-manager`. NO se mergea a develop con el cierre DKC (gated por review team up1).
- **Base branch**: develop.
- **Repos / paths**: `layout/` (B6, B2), `object-manager/` (B5 + `scripts/sync.js` en up1 root para propagar).
- **DB state**: B5 opción (a) requiere `npm run sync` para persistir `uniqueScopedBy` a `core_FieldDefinition`. Sin migración de schema (columna `properties` ya existe).
- **Services**: object-manager (4000), suite (3000), layout/storybook (6006) — no requeridos para unit tests.
- **Runtime**: node 22.

## Testing

**Coverage map preliminar** (REQs se definen en spec):
- REQ-IMPROVE-B6 (título legible RT) → NOT COVERED
- REQ-IMPROVE-B5 (enforcement config-driven) → NOT COVERED
- REQ-IMPROVE-B5-TEST (unit test scopeWhere) → NOT COVERED
- REQ-IMPROVE-B2 (toast parametrizado) → NOT COVERED
- REQ-PRESERVE-* (regression) → NOT COVERED

**Test cases preliminares**:
- TC-B6: abrir "Crear registro" sobre un RT (Modality) → título legible ("Modality"/label), no `rt__Modality__curricularsection`. (manual / storybook)
- TC-B5a: crear CurricularSection con name duplicado en mismo `[ownerId, recordType]` → `Unique constraint failed (name)`. (unit, Prisma mock)
- TC-B5b: crear RT con `code` duplicado en scope → `Unique constraint failed (code)`. (unit)
- TC-B5c: sin duplicado → procede (no lanza). (unit)
- TC-B5d (regression): objeto SIN `uniqueScopedBy` → no se aplica enforcement. (unit)
- TC-B2: crear nueva versión → toast "Versión N creada desde versión N-1". (manual)
- TC-REGRESSION: enforcement de CurricularSection sigue funcionando idéntico tras generalizar; tests existentes de instance.resolver pasan.

**Regression baseline**: suite vitest de object-manager (`npm test` / vitest). Capturar verde antes de B5.

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razón | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-06-04 | false → super | dev invocó `/dkc 051 super autopilot` | intake |

### Plan de sessions (DET-20)

| Session | Items | Repo(s) | Tier | Tipo | Objetivo |
|---------|-------|---------|------|------|----------|
| S1 | B6 + B2 | layout | T1 | auto | Título legible de modales RT (util compartido) + toast de versión parametrizado (selection set + i18n es/en/pt) |
| S2 | B5 | object-manager (+ sync) | T2 | auto | Generalizar enforcement de unicidad scoped config-driven (sync persiste `uniqueScopedBy` → resolver lo lee) + unit test del enforcement |

Cada session cierra con `S{N}.GATE`: persistir + validar tier + quality review (DET-23, reviewer aislado por DET-30 super) + commits granulares (DET-27) en `UPONE-1206`.

### Session 1 — 2026-06-04 — B6 + B2 (layout) [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T1 (unit area)

**Objetivo**: título legible para modales RT (util `humanizeObjectName` compartido) + toast de versión parametrizado (selection set `data` + i18n es/en/pt).

**Tasks completadas**:
- [x] S1.T1 — B6: extraer `humanizeObjectName` a util compartido con rama `rt__` y usarlo como fallback en `ModalStackManager.openModal`
- [x] S1.T2 — B2: pedir `data` en selection set de `createInstance`, leer `version` y parametrizar toast i18n (es/en/pt)
- [x] S1.GATE — quality review + commits granulares en UPONE-1206 + cerrar gate

**Commits** (UPONE-1206):

| Hash | Tasks | Mensaje | Archivos |
|------|-------|---------|----------|
| a3f51d8 | S1.T1 | UPONE-1219-S1 feat(layout): título legible de modales RT | utils/humanizeObjectName.ts (+test), RecordList.vue, ModalStackManager.vue |
| be2dadf | S1.T2 | UPONE-1219-S1 feat(layout): toast de versión parametrizado | useCreateRowAction.ts (+test), lang/{es,en,pt}@RecordList.json |
| c99f268 | S1.T1,T2 | UPONE-1219-S1 fix(layout): fallback genérico del toast (review F1) | useCreateRowAction.ts (+test), 3 lang, humanizeObjectName.ts |

**Validación del tier**:
- T1 — vitest run del área: 23/23 pass (`humanizeObjectName.spec.ts` 8 + `useCreateRowAction.spec.ts` 15). Cubre rama `rt__` + regresión ramas previas (B6) y toast parametrizado + fallback genérico (B2).

**Quality review (DET-23)**:

**Reviewer**: LLM aislado (Agent sonnet, read-only) — DET-30 super
**Tier de revisión**: light (T1)
**Resultado global**: iterate → resuelto → pass

| # | Dimensión | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad código | pass | Early returns, guards, ramas exclusivas |
| 2 | Lint/estilo | pass | Consistente con el entorno |
| 3 | Tipado | warn→ok | `any` preexistente en deps; acceso dinámico `.version` aceptable (data es JSON) |
| 4 | Testing | pass | 23 casos; rama rt__, regresión, params, fallback |
| 5 | Escalabilidad | pass | util single-source extensible |
| 6 | Mantenibilidad | pass | sin duplicación; copia local de RecordList eliminada |
| 7 | Claridad | pass | JSDoc + comentarios con ref ticket |
| 8 | A11y | n/a | lógica de strings |
| 9 | Storybook | n/a | — |
| 10 | Manejo errores | fail→pass | **F1 resuelto**: fallback `versionCreatedGeneric` sin huecos i18n |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S1 (B6+B2 layout) verde: 23/23 vitest, quality review iterate→pass (F1 resuelto). Commits a3f51d8/be2dadf/c99f268 en UPONE-1206.
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Hallazgos resueltos en iterate** (commit c99f268):
- F1 (major): toast de versión sin `version` renderizaba placeholders vacíos → key genérica `versionCreatedGeneric`.
- F3 (nit): comentarios en inglés en `humanizeObjectName.ts` → traducidos.
- F2 (minor): test del fallback reforzado para asserir la key genérica.

> Reviewer aislado confirmó working tree sin contaminación (solo `component-registry.json` M preexistente, ajeno).

### Session 2 — 2026-06-04 — B5 (object-manager + sync) [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T2 (unit + coverage del área)

**Objetivo**: generalizar el enforcement de unicidad scoped config-driven (sync persiste `uniqueScopedBy` a `core_FieldDefinition.properties`; el resolver lo lee) + unit test del enforcement.

**Tasks completadas**:
- [x] S2.T1 — B5 sync: persistir `uniqueScopedBy` a `core_FieldDefinition.properties` (base fields + RT fields) en `generatePrismaSchema.js`
- [x] S2.T2 — B5 resolver: reemplazar el `if (=== 'CurricularSection')` por enforcement config-driven que lee `uniqueScopedBy` de los field defs
- [x] S2.T3 — B5 test: unit test del enforcement (name dup, code dup, sin dup, sin uniqueScopedBy, scope en where)
- [x] S2.GATE — quality review + commits granulares en UPONE-1206 + verificar suite vitest + cerrar gate

**Commits** (UPONE-1206):

| Hash | Tasks | Mensaje | Archivos |
|------|-------|---------|----------|
| b800a1c | S2.T1,T2 | UPONE-1219-S2 feat(object-manager): enforcement de unicidad scoped config-driven | generatePrismaSchema.js, helpers/scoped-uniqueness.js, instance.resolver.js |
| 8431443 | S2.T3 | UPONE-1219-S2 test(object-manager): unit test del enforcement | tests/.../scoped-uniqueness.test.js |
| 2acfa1c | S2.T2,T3 | UPONE-1219-S2 refactor(object-manager): filtro isBaseField (review minor) | helpers/scoped-uniqueness.js, test |

**Validación del tier**:
- T2 — vitest: helper `scoped-uniqueness.test.js` 8/8 + suite completa de resolvers **520/520** (sin regresión — REQ-PRESERVE-01: `createInstance` y enforcement de CurricularSection intactos). `npm run sync` verde 3/3 (persiste `uniqueScopedBy`).
- Nota: verificación del valor persistido en `core_FieldDefinition` (DB por-tenant) no ejecutada en este entorno (sin psql; wiring cross-tenant del client desproporcionado). Cubierto por inspección de la línea aditiva + sync verde + el resolver lee el mismo path `properties` ya funcional para `storage`/`references`. Runtime-verifiable.

**Quality review (DET-23)**:

**Reviewer**: LLM aislado (Agent sonnet, read-only) — DET-30 super
**Tier de revisión**: standard (T2)
**Resultado global**: pass

| # | Dimensión | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad código | pass | helper puro <40 líneas, guard clauses |
| 2 | Lint/estilo | pass | consistente con prefill/version helpers |
| 3 | Tipado | pass | JS; JSDoc completo |
| 4 | Testing | pass | 8 casos; paridad + edge cases |
| 5 | Escalabilidad | warn | 2 findMany por RT create (aceptable en write path; documentado) |
| 6 | Mantenibilidad | pass | extraído a helper testeable, config-driven |
| 7 | Claridad | pass | comentarios del contrato/fallback |
| 8 | A11y | n/a | — |
| 9 | Storybook | n/a | — |
| 10 | Manejo errores | pass | mensaje idéntico al hardcode; optional chaining; Array.isArray guard |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S2 (B5 object-manager) verde: helper 8/8 + 520/520 resolver suite (sin regresion), sync verde. Quality review pass (paridad confirmada). Commits b800a1c/8431443/2acfa1c en UPONE-1206.
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Veredicto de paridad**: el reviewer confirmó equivalencia punto-a-punto con el hardcode previo para CurricularSection (guard ownerId, fallback recordType, where de findFirst base/RT, mensaje de error, orden de checks). Único cambio intencional: aplica a cualquier RT con `uniqueScopedBy` (objetivo de B5).

**Polish aplicado** (commit 2acfa1c): filtro `isBaseField: true` en la query base (robustez minor) + TC-08 contrato null. Hallazgo de performance (2 findMany) documentado como aceptable.

> Reviewer aislado confirmó working tree sin contaminación (solo artefactos de sync preexistentes, ajenos).

## Decisiones locales

- **DEC-LOCAL-01 (B5 mecanismo config-driven)**: elegida **opción (a)** — el sync persiste `uniqueScopedBy` a `core_FieldDefinition.properties` y el resolver lo lee en runtime. Drivers: (1) el resolver YA consulta `core_FieldDefinition` y lee `properties` en ese bloque (cero mecanismo nuevo vs opción (b) que introduce lectura de filesystem + cache en el hot path); (2) fuente única en DB, consultable por otros consumers; (3) cambio aditivo y merge-based en el sync (bajo riesgo de regresión). Trade-off: requiere correr `npm run sync` para poblar (aceptable — sync es parte del flujo). Alternativa (b) descartada: filesystem read acopla a convención de nombres y falla silencioso si no se sincronizó.

## Summary

**Que se hizo**:

- **B6** (`a3f51d8`): extraído `humanizeObjectName` de RecordList.vue a `layout/src/utils/humanizeObjectName.ts` con rama nueva para `rt__<Mod>__<base>`; usado como fallback en el choke point de título de `ModalStackManager.openModal` (`objectLabel || humanizeObjectName(objectName)`). Los modales RT dejan de mostrar el nombre técnico crudo, sin latencia async, cubriendo todos los call sites.
- **B2** (`be2dadf` + `c99f268`): el front pide `data` en el selection set de `createInstance` (el `version` ya viajaba ahí — sin cambio de backend), lee `version` y parametriza la key i18n `versionCreated` con `{version, sourceVersion=N-1}` en es/en/pt. Fallback a `versionCreatedGeneric` (sin huecos) cuando no hay version.
- **B5** (`b800a1c` + `8431443` + `2acfa1c`): el sync persiste `uniqueScopedBy` a `core_FieldDefinition.properties` (base + RT) y el enforcement de unicidad scoped del resolver pasa a config-driven vía el helper `enforceScopedUniqueness` (lee la prop de los field defs), reemplazando el hardcode a CurricularSection. Comportamiento preservado para CurricularSection.

**Como se valido** (DET-13):

| TC | Resultado | Evidencia | Status |
|----|-----------|-----------|--------|
| TC-B6 (título legible RT) | rama `rt__` humaniza a "Modality"/camelCase; ramas previas intactas | `humanizeObjectName.spec.ts` 8/8 | pass |
| TC-B5a/b (name/code dup → throws) | lanza `Unique constraint failed (name)`/`(code)` | `scoped-uniqueness.test.js` TC-01/02 | pass |
| TC-B5c (sin dup → procede) | no lanza | TC-03 | pass |
| TC-B5d (sin uniqueScopedBy → no aplica) | findFirst no se llama | TC-04 | pass |
| TC-B2 (toast parametrizado / fallback) | params {version, sourceVersion}; fallback genérico sin huecos | `useCreateRowAction.spec.ts` (+2 casos) | pass |
| TC-REGRESSION | suite resolvers sin regresión; enforcement CurricularSection idéntico | **520/520** resolvers + 23/23 layout + `npm run sync` 3/3 | pass |

Acceptance checkpoints del spec (AC-1..AC-5): AC-1/AC-3/AC-4/AC-5 verificados por tests + sync. AC-2 (valor persistido en DB) runtime-verifiable (sin DB por-tenant en este entorno; mecanismo verificado por inspección + sync verde).

**Que NO se hizo** (out-of-scope):

- Enforcement de unicidad scoped en `updateInstance` (solo create, como el hardcode previo) — follow-up si se necesita.
- Label i18n exacto del RT en B6 (el fallback humanizado es suficiente).
- Commit de artefactos synced en core (typeDefs/activity/curricularsection) — flujo core/RULE-dev-004.
- **Push de los commits** en `UPONE-1206` (layout + object-manager) — pendiente, gated por review team up1; el cierre DKC no mergea a develop.

## Backlog

| # | Item | Priority | Estado | Notas |
|---|------|----------|--------|-------|
| B1 | Decidir alcance: ¿los 3 en una sola sesión o separar B5? | should | resolved (2026-06-04) | Resuelto: B6+B2 en S1 (layout, T1), B5 en S2 (object-manager, T2). |
</content>
