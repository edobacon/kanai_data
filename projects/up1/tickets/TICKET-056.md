---
id: TICKET-056
project: up1
type: ticket
status: closed
work_type: improvement
external: UPONE-1219
module: core
autopilot: autonomous
---

# Calidad de código SP3 — quick wins, type-safety en layout y guard de atomicidad RT (promoción de TICKET-055)

## Request

Promoción del triage de **TICKET-055** (registro de auditoría de calidad SP3). Abarcar SOLO los hallazgos cuyo fix toca **código introducido por el sprint** (verificado por git blame), sin tocar consumidores pre-existentes. Tres clusters:

**Quick wins / nits:**
- **A5** — eliminar/guardar 3 `console.log` de debug en `RecordListElement.vue:35,67,79` (envolver en `import.meta.env.DEV` o quitar). Ruido en producción.
- **M13** — correr prettier sobre `version-from-source.js` (indentación con tabs mientras el repo usa espacios).
- **B2** — `useCreateRowAction.ts:59` usar `isRef` de vue en vez de duck-typing (`'value' in value`).
- **B3** — `humanizeObjectName.ts:33` quitar el flag `i` del regex (prefijos siempre-lowercase `up1`/`ext`).
- **B4** — `useRowActionHandler.ts:307` añadir `console.warn` en `catch {}` (falla de config RT silenciada).
- **B9** — `validate-polymorphic-children-derived.js:135` eliminar var `prefix` sombreada/sin uso.

**Type-safety (layout, composables del sprint):**
- **A3** — `useRowActionHandler.ts:37` `EnhancedRowAction.redirectTo` omite `'none'` que sí existe en `RowAction.redirectTo` (`recordlist.ts:223`); añadir `'none'` a la unión o usar `RowAction` directo.
- **A4** — `useRowActionHandler.ts:124,256` `$t: Function` → `(key: string, params?: Record<string, unknown>) => string` (la firma precisa ya existe en `CreateRowActionDeps.$t`).
- **M7** — `useCreateRowAction.ts:38,40,42,68` reemplazar `any` por `ApolloClient`/`string|Ref<string>`/`Record<string, unknown>`.
- **M2** — `useRowActionHandler.ts:323-349` extraer función privada compartida (copia-pega entre `createDownloadTemplateHandler`/`createImportTemplateHandler`).

**Fix puntual de robustez:**
- **A1 (solo guard)** — añadir guard en `prepareVersionData` (`version-from-source.js`) que rechace `asNewVersion` sobre un objeto RecordType. El path RT de `createInstance` (`instance.resolver.js:2507-2548`) hace 4 writes no-atómicos y retorna antes del `$transaction` Serializable. **NO** unificar el path RT — eso queda como candidato a RULE-core (ver Backlog). El path RT es pre-existente (marzo 2026, no es del sprint); su worst-case de versionado es latente (hoy ningún objeto versionable es RT: `Activity` es base).

**Excluido explícitamente** (queda en TICKET-055 `por-triagear`): dedup transversal (M1/M4/B8/B1/M8 — alcanzan código pre-sprint), Bundle 3 escalabilidad backend (A2/T2/M5/M6), Bundle 5 bugs de seed del mod (M10/M11/A6/M12/B5), y BR-1 (no es código; TICKET-054).

> **Asociación a UPONE-1219**: el Jira que ha funcionado como bucket de follow-ups/polish core de la plataforma de clonación/versionado (TICKET-049/053/054 cuelgan de él) y el que más superficies de este lote tocó (`useCreateRowAction`, `humanizeObjectName` en layout + el validador derived en object-manager). No es la épica (UPONE-1206). Por DET-19 los commits/branch usan UPONE-1219.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | improvement (calidad + robustez; mayoría zero-behavior-change, A1-guard sí cambia comportamiento) |
| Tipo de cambio | multi (object-manager + layout, ambos core) |
| Módulo principal | core |
| Módulos afectados | object-manager (resolvers/helpers + codegen/helpers), layout (composables + utils + elements) |
| Layer / épica | core — épica UPONE-1206, tracking UPONE-1219 |

## Creation scope

| Dimension | Aplica | Descripción |
|-----------|--------|-------------|
| Visual (UI) | no | No crea vistas/componentes; A5 solo quita logs de uno existente |
| Data model | no | No introduce entidades/schemas |

Ambos flags `false` → `design-draft` se omite.

## Triage

Promoción de hallazgos ya auditados en TICKET-055 (con `archivo:línea`, racional y recomendación). El contexto de investigación es el cuerpo de TICKET-055; no se requiere nuevo ciclo de researcher.

### Hipótesis

| # | Hipótesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Complejidad media-baja: ~11 fixes acotados, 6 archivos, 2 repos. Particionable en 2 sessions (layout / object-manager) | ✓ confirmada | 6 archivos resueltos a path exacto (`useRowActionHandler.ts`, `useCreateRowAction.ts`, `humanizeObjectName.ts`, `RecordListElement.vue`, `version-from-source.js`, `validate-polymorphic-children-derived.js`); 2 repos ambos en branch UPONE-1206; clusters limpios por repo → 2 sessions |
| H2 | Los fixes de layout (nits + type-safety) son zero-behavior-change → regression de la suite layout (926 tests) debe quedar idéntica | inferred: el cambio es solo de tipos/logs/extracción sin tocar lógica de runtime. Plan de validación empírica: capturar baseline en S1.T0 y comparar al gate S1 (DET-7) | TICKET-055 veredicto "deuda de mantenibilidad, no bugs"; suite layout 926 verde pre-cambio |
| H3 | El guard de A1 es el único cambio de comportamiento: `asNewVersion` sobre RT pasa de "4 writes no-atómicos" a "rechazo explícito". Requiere test nuevo (rechazo) + verificar que no rompe el path versionable actual (Activity, base) | ✓ confirmada | **multi-capa**: (1) git blame — path RT pre-existente (marzo 2026, Clemente); SP3 solo agregó metadata L2547-2548. (2) Q1 TICKET-055 — único objeto con bloque `versioning` es `Activity`, `isRecordType: None` (base, no RT) → el guard no afecta el path versionable activo. (3) `enforceScopedUniqueness` (L2489) corre antes de los writes → el guard se ubica en `prepareVersionData`, upstream del resolver |

### Context found

- **Rules del módulo**: `RULE-dev-004` / `core_work_policy` (trabajo core va en rama única UPONE-1206, commits prefijo UPONE-1219, merge a develop gated por revisión team up1). `RULE-core-008` (firma CRUD genérico). `RULE-core-013` (pre-fetch `previousRecord`, path no-RT). `RULE-core-020` (patrón "un check upstream del branch RT").
- **Bugs abiertos**: ninguno en object-manager/layout sobre estas superficies.
- **Specs relacionados**: ninguno directo. TICKET-055 es el registro de origen (explore).
- **Docs relevantes**: layout `.ai/CONTEXT.md`, object-manager `.ai/CONTEXT.md`.
- **Warnings**:
  - **DET-16 (propagación)**: A3 propone añadir `'none'` a `EnhancedRowAction.redirectTo` o eliminar la interfaz duplicada usando `RowAction` directo. Si se elimina la interfaz, verificar consumidores de `EnhancedRowAction` antes (análisis de impacto colateral) — puede salirse del alcance "sprint-introducido". Preferir añadir `'none'` (aditivo, seguro).
  - **A1 guard**: aunque el alcance es "solo guard", el guard debe ubicarse en `prepareVersionData` (helper puro testeable) y NO tocar el path de marzo en `instance.resolver.js`. Si durante execute se descubre que el guard requiere tocar el resolver, escalar (DET-12) — sería re-clasificación hacia el ticket de unificación.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1206` (rama core de la épica — ambos repos ya están en ella; RULE-dev-004) |
| Base branch | `develop` (merge gated por revisión team up1; el cierre DKC NO implica merge) |
| DB state | Sin migraciones. A1-guard se valida con unit test del helper (sin DB) |
| Services | object-manager (4000) para e2e opcional; layout/storybook (6006) no requerido |
| Test data | n/a |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Estrechar un `any` a la clase concreta (`ApolloClient<unknown>`) rompió el typecheck del spec (mock parcial `{ mutate }` no asignable; +11 errores). Tipar contra la **superficie mínima usada** (`Pick<ApolloClient,'mutate'>`) cumple type-safety, no introduce `any`, y NO propaga la rotura a consumidores/tests (DET-16 / interface segregation). Gotcha relacionado: `tsc --noEmit` de layout NO procesa `.vue` (solo `.ts`), así que el call site real en `RecordList.vue` no se valida por typecheck — la red es la suite. | llm-autopilot (S1.T4) | S1 | refined | candidato RULE-dev (interface-segregation al tipar deps); documentado en teach-close Lessons. No promovido a RULE formal: patrón contextual, 1 ocurrencia — se promueve si reaparece |
| L2 | B9 (audit TICKET-055) marcaba la var `prefix` de `validate-polymorphic-children-derived.js:135` como "sombreada/sin uso". Verificación in-situ: la var SÍ se usa (4 mensajes de error, líneas 145/154/159/161) y la otra `prefix:52` vive en una función distinta (sin shadowing). Falso positivo del audit estático. Lección: un hallazgo de "var sin uso" sin herramienta (object-manager no tiene eslint configurado) debe verificarse leyendo los usos antes de eliminar — borrar habría roto los mensajes de error. DET-4 (no presentar inferencia como hecho). | llm-autopilot (S2.T3) | S2 | refined | documentado en teach-close (Lessons + Approaches fallidos). No es rule/bug: insight de proceso (verificar uso antes de borrar dead-code reportado) |

## Sessions

### Modo (autopilot)

| Timestamp | Transición | Razón | Aplica desde |
|-----------|-----------|-------|--------------|
| 2026-06-05T00:00:00Z | false → super | dev invocó `/dkc 056 autopilot super` — ejecución autónoma por-ticket hasta cierre | inicio de execute (S1) |

### Plan de sessions (preplanificación)

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Layout: nits + type-safety (A5, B2, B3, B4, A3, A4, M7, M2) | execute | T2 | quitar logs A5 · isRef B2 · regex B3 · warn B4 · `'none'` en unión A3 · tipar `$t` A4 · quitar `any` M7 · extraer helper M2 | auto | suite layout (vitest) sin regresión (= baseline 926) + `vue-tsc`/typecheck verde + coverage no baja |
| S2 | object-manager: guard A1 + M13 + B9 | execute | T2 | guard `asNewVersion` sobre RT en `prepareVersionData` + unit test de rechazo A1 · prettier `version-from-source.js` M13 · eliminar var `prefix` B9 | ⚑ fuerte | unit test nuevo de A1 verde + suite object-manager sin regresión + verificar path versionable actual (Activity) intacto; revisión humana por ser cambio de comportamiento core |
| S3 | Verificación E2E (Playwright) de los flujos de create/clonado/versionado contra el stack real, validando que los refactors de layout (call site `.vue` no cubierto por tsc — Learn L1) no rompieron el flujo de usuario | execute (verificación) | T2 | rebuild layout + restart suite · login Clerk (dev) · E2E create simple · E2E clonado (prefillFromCurrent) · E2E nueva versión (asNewVersion) · screenshots evidencia | auto | flujos create/clone/version funcionan end-to-end con mi código servido; sin errores de consola JS atribuibles al diff; evidencia visual capturada |

**Notas del plan**: S1 y S2 son independientes (repos distintos), paralelizables. Se sugiere S1 primero (zero-behavior-change, baja fricción) para fijar baseline antes del único cambio de comportamiento (S2/A1-guard). Numeración desde S1 (sin sessions previas). **S3 (agregada a pedido del dev en el cierre, 2026-06-05)**: verificación E2E de los flujos reales antes de cerrar — DET-13 reforzado + cierra el gap de cobertura del call site `.vue` (L1).

### Session 1 — 2026-06-05 — Layout: nits + type-safety [phase: execute]

**Tipo**: auto
**Validation tier**: T2 (suite layout sin regresión + typecheck)

**Objetivo**: Limpieza de ruido/dead-code y endurecimiento de tipos en los composables/utils de row action de layout (A5, B4, B2, B3, A3, A4, M7, M2). Zero-behavior-change — fija baseline antes del único cambio de comportamiento (S2/A1).

**Tasks completadas**:
- [x] S1.T1 — Capturar baseline de la suite de layout (conteo pass/fail) — 936 pass; typecheck 183 errores preexistentes (0 en archivos del ticket)
- [x] S1.T2 — A5 + B4: quitar/guardar 3 `console.log` en `RecordListElement.vue`; `console.warn` en el `catch {}` de `useRowActionHandler.ts:307`
- [x] S1.T3 — B2 + B3: `isRef` de vue en `useCreateRowAction.ts:59`; quitar flag `i` del regex de `humanizeObjectName.ts:33`
- [x] S1.T4 — A3 + A4 + M7: añadir `'none'` a `EnhancedRowAction.redirectTo`; tipar `$t`; quitar `any` de `useCreateRowAction`
- [x] S1.T5 — M2: extraer función privada compartida de `createDownloadTemplateHandler`/`createImportTemplateHandler`
- [x] S1.GATE — Gate de sync Session 1 (tier T2): suite layout = baseline + typecheck verde + coverage no baja

**Validación del tier (T2)**: suite layout `npm test` → **942 pass / 57 files** (baseline 936 + 6 nuevos de TC-3, **0 regresiones**, DET-7). Typecheck `tsc --noEmit` → **183 errores = baseline** (0 nuevos, 0 en archivos tocados). Lint de archivos tocados limpio; 1 error de lint preexistente (`RecordListElement.vue:22`, `el$` en `<slot>` del template) **fuera del diff** — reportado, no corregido (código no sprint-introducido, requeriría aprobación + análisis de impacto). Coverage: +6 tests netos (sube, no baja).

**Commits (DET-27)** — repo layout, rama `UPONE-1206`:
- `74ac54d` refactor(layout): type-safety + dedup en composables de row action (A3,A4,M7,M2,B2,B3,B4)
- `455c841` chore(layout): quitar 3 console.log de debug de RecordListElement (A5)
- `035317e` test(layout): cobertura de template row action handlers (TC-3)

**Quality review (DET-23)** — reviewer aislado (sub-agente contexto limpio), tier standard. Resultado global: **pass** · decisión: **approve** · working tree limpio post-review.

| # | Dimensión | Resultado | Nota |
|---|-----------|-----------|------|
| 1 | Calidad código | pass | unwrapRef<T> genérico reemplaza duck-typing frágil; createTemplateHandler dedup sin alterar comportamiento; sin código muerto introducido |
| 2 | Lint/estilo | pass | diff no introduce violaciones; el único error (`el$:22`) es preexistente fuera del diff; 3 console.log eliminados mejoran baseline |
| 3 | Tipado | pass | `Pick<ApolloClient,'mutate'>` correcto por contrato (acepta cliente real + mock); `isRef` canónico; 0 errores nuevos en archivos tocados |
| 4 | Testing | pass | TC-3 6 casos con asserts concretos (`toHaveBeenCalledWith` valor exacto); 942 pass / 0 regresiones |
| 5 | Escalabilidad | pass | factory de template handlers extensible; sin impacto de rendimiento |
| 6 | Mantenibilidad | pass | dedup elimina divergencia futura; JSDoc explica el racional de `Pick` (DET-16) |
| 7 | Claridad | pass | comentario del catch (B4) explica el fallback intencional + nueva observabilidad |
| 8 | A11y | n/a | lógica de composables/tipos; sin cambios de template ARIA |
| 9 | Storybook | n/a | sin stories afectadas |
| 10 | Error handling | pass | B4 convierte catch vacío en console.warn preservando el fallback a creación estándar |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

> Notas no bloqueantes del reviewer: (1) `(record: any)` residual en handlers = deuda preexistente consistente, no introducida; (2) TC-3 no asserta el string exacto del warn (suficiente en T2); (3) `unwrapRef` con `isRef` es más estricto — el consumidor real (`RecordList.vue`) pasa `apolloClient.value` (cliente real) y `objectType` string, sin caso POJO-con-`.value`, riesgo bajo confirmado.

### Session 2 — 2026-06-05 — object-manager: guard A1 + M13 + B9 [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T2 (unit test nuevo de A1 + suite object-manager sin regresión + path versionable de Activity intacto)

**Objetivo**: Guard de robustez en `prepareVersionData` que rechace `asNewVersion` sobre un objeto RecordType (A1, único cambio de comportamiento del ticket) + unit test de rechazo, verificando que `Activity` (base) sigue versionando; más prettier sobre `version-from-source.js` (M13) y eliminar la var `prefix` sin uso en el validador derived (B9).

**Tasks completadas**:
- [x] S2.T1 — Capturar baseline de la suite de object-manager (conteo pass/fail)
- [x] S2.T2 — A1: guard `asNewVersion` sobre RT en `prepareVersionData` + unit test de rechazo; verificar `Activity` (base) intacto
- [x] S2.T3 — M13 + B9: prettier sobre `version-from-source.js`; **B9 = falso positivo** (var `prefix:135` en uso, no eliminada)
- [x] S2.GATE — Gate de sync Session 2 (tier T2, ⚑ fuerte): unit test A1 verde + suite object-manager = baseline + `Activity` versionable intacto

**Validación del tier (T2, ⚑ fuerte)**: suite object-manager `npm test` → **1853 pass / 12 fail / 28 skip** (baseline 1851 + 2 nuevos A1, **0 fallos nuevos** — los 12 fallos son los mismos 4 archivos preexistentes del baseline S2.T1, DET-7). Unit test A1 nuevo verde (TC-1 rechazo RT sin reads de prisma + TC-1b `Activity` base versiona 1→2 intacto, REQ-PRESERVE-02). `prettier --check` de `version-from-source.js` verde (M13). **B9**: falso positivo del audit TICKET-055 — la var `prefix` en `:135` SÍ se usa (líneas 145,154,159,161) y la otra `prefix:52` está en una función distinta (sin shadowing real); eliminarla rompería 4 mensajes de error → NO se toca (DET-4 honesto, ver Learn L2).

**Commits (DET-27)** — repo object-manager, rama `UPONE-1206`:
- `fd48024` fix(versioning): guard de atomicidad rechaza asNewVersion sobre RecordType (A1) + M13
- `23a9815` test(versioning): cobertura del guard A1 (TC-1 + TC-1b)

**Quality review (DET-23)** — reviewer aislado (sub-agente contexto limpio), tier standard (gate ⚑ fuerte). Resultado global: **pass** · decisión: **approve** · comportamiento aislado al guard · prettier no alteró lógica · `Activity` versionable intacto · working tree limpio post-review.

| # | Dimensión | Resultado | Nota |
|---|-----------|-----------|------|
| 1 | Calidad código | pass | guard en primera línea, early-return limpio sin side effects; resto del cuerpo no tocado funcionalmente |
| 2 | Lint/estilo | pass | prettier normalizó tabs→2-spaces (M13); diff whitespace puro fuera del guard; `--check` verde |
| 3 | Tipado | n/a | archivo JS |
| 4 | Testing | pass | TC-1 con `.not.toHaveBeenCalled()` sobre findUnique/findMany (rechazo upstream); TC-1b con version===2 + linkage; delta +2 exacto vs baseline |
| 5 | Escalabilidad | pass | guard O(1) (regex `.test` antes de I/O); sin carga en el path base |
| 6 | Mantenibilidad | pass | JSDoc `@throws` actualizado con el nuevo código (warn del reviewer resuelto en el acto) |
| 7 | Claridad | pass | comentario del guard explica por qué (path RT no-atómico), scope (no toca resolver) y futuro (backlog B1) |
| 8 | A11y | n/a | backend |
| 9 | Storybook | n/a | backend |
| 10 | Error handling | pass | `AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE` sigue la convención SCREAMING_SNAKE del módulo |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

> Confirmaciones del reviewer: la convención `rt__<Name>__<base>` es canónica (mismo regex en `parseRecordTypeFileName`/`fileParsing.js`); el guard es alcanzable desde el path RT (`prepareVersionData` se invoca en `instance.resolver.js:2369`, antes del early-return RT) sin tocar el resolver. Nota: el working tree de object-manager tiene 17 schemas Prisma modificados preexistentes (fuera de `execute_scope`, no tocados).

### Session 3 — 2026-06-05 — Verificación E2E (Playwright) de create/clonado/versionado [phase: execute]

**Tipo**: auto
**Validation tier**: T2 (E2E manual-asistido contra stack real + evidencia visual)

**Objetivo**: Verificación E2E a pedido del dev antes del cierre — validar que los flujos implementados de create simple, clonado (`prefillFromCurrent`) y nueva versión (`asNewVersion`) funcionan end-to-end contra el stack real (suite :3000 + object-manager :4000 + Postgres + Redis), corriendo MI código (rebuild de layout + restart de suite). Cierra el gap de cobertura del call site `.vue` `RecordList.vue` que `tsc` no valida (Learn L1). Auth Clerk: login manual del dev en Playwright headed.

**Tasks completadas**:
- [x] S3.T1 — Rebuild layout (dist con mis cambios) + restart suite (nuxt dev)
- [x] S3.T2 — Setup Playwright headed + login Clerk (dev) + identificar objeto/ruta versionable (Activity)
- [x] S3.T3 — E2E: nueva versión (`asNewVersion` + `prefillFromCurrent`) + gating de visibilidad; capturar screenshots + consola
- [x] S3.GATE — Gate de sync Session 3 (T2): flujo versionado/clonado verde end-to-end con mi código (source) + evidencia visual + sin errores JS del diff

**Validación del tier (T2) — E2E asistido contra stack real** (suite :3000 sirviendo layout desde **source** + object-manager :4000 + Postgres + Redis):

- **Flujo versionado/clonado** (la row action `create-new-version` = `prefillFromCurrent:true` + `asNewVersion:true` — ejerce mi `useCreateRowAction.createCreateHandler` refactorizado): sobre `Activity` "Introduccion a las Redes" Publicado v1 → menú fila → "Nueva versión" → modal de confirmación → `createInstance` **HTTP 200**. Respuesta: `version: 4` (= max del linaje {1,2,3}+1, REQ-04), `previousVersionId` = source (linkage), `currentStatusId` = Borrador (estado inicial del workflow, REQ-03), `_createdVia: "version"` + `_cloneMap` (deep-clone de hijos polimórficos), redirect a `…/RecordDetail/default_Activity_edit` (`redirectTo:'edit'`). Evidencia: `TICKET-056-s3-rowmenu-publicado.png`, `TICKET-056-s3-version-confirmed.png`.
- **Round-trip de lista** (valida `RecordListElement` tras A5): la lista refetcheó y re-renderizó con la **v4** (5 filas). Evidencia: `TICKET-056-s3-list-after-version.png`.
- **Gating de visibilidad** (valida `isActionVisible` en `useRowActionHandler.ts` — A3/A4): filas en estado Borrador NO ofrecen "Nueva versión" (sólo Ver/Editar); sólo la fila Publicado (`allowsVersioning:true`) la ofrece.
- **Consola**: cero errores atribuibles al flujo. Ruido ajeno presente (404 de assets + "Hydration mismatch" de Nuxt SSR) — preexistente, no del diff.
- **A1 guard**: no ejercitable por UI (latente — ningún objeto versionable es RT; `Activity` es base). Cubierto por unit test TC-1 (S2).
- **Create simple** (toolbar "Crear registro" — código NO tocado por el diff): modal abre/renderiza/valida, `createInstance` dispara (pipeline frontend→backend OK), pero el backend rechaza el create de `Activity` desde cero — *"Error al Crear Activity · Ubicación: Workflow"* (relación `workflow` requerida no recolectada por el formulario). Error mostrado **graceful** (diálogo, sin crash). **No es regresión del diff**: el create de toolbar no usa `useCreateRowAction`; el clonado/versionado funciona porque copia el workflow del origen. Hallazgo de dominio/UX preexistente (scratch Activity necesita workflow) — fuera de alcance de TICKET-056, candidato a triage aparte. Evidencia: `TICKET-056-s3-create-open.png`, `TICKET-056-s3-create-saved.png`.

**Commits (DET-27)**: ninguno — S3 no modificó código de producción (sólo scripts E2E efímeros en `/tmp/e2e`, no versionados). El rebuild de dist se omitió (suite sirve source; build de dist roto por preexistente ajeno, ver S3.T1).

**Quality review (DET-23)**: n/a para código de producción (S3 es verificación, no tocó `src/`). La evidencia E2E + GraphQL 200 + screenshots ES la validación del gate (DET-13).

**Resultado del gate**: continue → cierre. El flujo implementado de clonado/versionado funciona end-to-end con mi código servido; mis refactors de layout no introdujeron regresión de comportamiento (gap L1 del call site `.vue` cerrado empíricamente).

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| A1-guard (rechazo `asNewVersion` sobre RT) | TC-1 | auto | **COVERED** (S2: version-from-source-helper.test.js TC-1 + TC-1b) |
| Type-safety layout (A3/A4/M7) no rompe comportamiento | TC-2 | auto | **COVERED** (S1: suite 942 pass + typecheck = baseline) |
| M2 extracción de helper preserva handlers download/import | TC-3 | auto | **COVERED** (S1: templateRowActionHandlers.spec.ts, 6 casos) |
| Flujo real clonado/versionado no roto por refactors de layout (gap L1 call site `.vue`) | TC-4 | manual (E2E) | **COVERED** (S3: Playwright contra stack real) |

### Test cases

| # | Case | REQ | Type | Affects UI | Precondition | Steps | Expected | Actual | Evidence | Status | Session | Cambios gatillados |
|---|------|-----|------|------------|-------------|-------|----------|--------|----------|--------|---------|---------------------|
| TC-1 | `prepareVersionData` rechaza `asNewVersion` sobre objeto RT | A1-guard | auto | no | helper aislado | invocar con `model='rt__Modality__curricularsection'` | lanza `AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE`, 0 reads de prisma | TC-1 throw + `.not.toHaveBeenCalled()`; TC-1b: Activity base versiona 1→2 | `version-from-source-helper.test.js` (S2.T2) | pass | S2 | — |
| TC-2 | Suite layout sin regresión tras type-safety + nits | H2 | auto | no | baseline capturado | `npm test` layout | = baseline (936 pass) | 942 pass / 57 files (936 baseline + 6 nuevos TC-3, 0 regresiones); typecheck 183 = baseline | `npm test` + `npm run typecheck` (S1.GATE) | pass | S1 | — |
| TC-3 | Handlers download/import siguen funcionando tras extraer helper (M2) | M2 | auto | no | — | unit de row actions | comportamiento idéntico al previo | 6/6 pass (record.name, fallback data.name, warn+no-modal sin nombre) | `templateRowActionHandlers.spec.ts` | pass | S1 | — |
| TC-4 | E2E nueva versión/clonado funciona con mi código (suite sirve source) | L1 | manual (E2E) | yes | stack up + Activity Publicado | row action "Nueva versión" → confirmar → ver v4 en lista | `createInstance` 200, v4 con linkage + estado inicial + deep-clone, redirect a edit, lista re-render con v4, 0 errores de consola del flujo | 200 + v4 + _cloneMap; 5 filas con v4; Borrador sin "Nueva versión" | `TICKET-056-s3-version-confirmed.png`, `TICKET-056-s3-list-after-version.png`, `TICKET-056-s3-rowmenu-publicado.png` | pass | S3 | — |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| layout (vitest) | `npm test` (`vitest run --project unit` en layout/) | 936 pass / 56 files (baseline S1.T1; TICKET-055 reportó 926, +10 desde) | 942 pass / 57 files | +6 (tests nuevos TC-3; 0 regresiones) |
| layout (typecheck) | `npm run typecheck` (`tsc --noEmit`) | 183 errores preexistentes (todos en stories/index/mods; **0 en archivos del ticket**) | 183 errores | 0 (sin errores nuevos; 0 en archivos tocados) |
| object-manager | `npm test` (`vitest run` en object-manager/) | 1851 pass / 12 fail / 28 skip (baseline S2.T1; 12 fallos preexistentes en 4 archivos: validation-rules-real-db [integration, requiere DB], evaluator, SyncManager, rbacRecordType service-account — ninguno toca version-from-source) | 1853 pass / 12 fail / 28 skip | +2 pass (tests A1); 0 fallos nuevos (mismos 4 archivos preexistentes) |

**Baseline**: capturar al inicio de cada session (S1 layout, S2 object-manager).

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| B1 | Unificar el path RT de `createInstance` con `$transaction` Serializable (atomicidad multi-write) — candidato a RULE-core. Hoy todo create/clone de RT hace 4 writes no-atómicos (`instance.resolver.js:2507-2548`); el guard de A1 solo bloquea el caso `asNewVersion`, no resuelve la no-atomicidad de fondo. | nuevo | TICKET-055 T1/L1 | Path RT pre-existente (marzo 2026). Guard de A1 (este ticket) acota el riesgo de versionado. | Ticket de diseño arquitectónico con team up1 (core-gated). Envolver L2501-2535 en `$transaction`; verificar todos los creates de RT (Modalidad, etc.). Registrar como RULE-core de atomicidad. | could |

## Teaching — Intake

**Status**: skipped
**Razon**: Dominio enseñado inline en TICKET-055 (auditoría SP3); dev confirmó skip explícito. No hay dominio nuevo: el ticket promueve hallazgos ya documentados con archivo:línea y racional.
**Archivo**: [`TICKET-056.teach/teach-intake.md`](TICKET-056.teach/teach-intake.md) (cuando exista)

> El dominio (auditoría de calidad SP3, atomicidad del path RT, type-safety de row actions) ya está documentado inline en TICKET-055. Candidato a `skip` con razón "dominio enseñado en TICKET-055" — decisión del dev en el gate de teach-intake.

## Teaching — Close

**Status**: done — [`TICKET-056.teach/teach-close.md`](TICKET-056.teach/teach-close.md) (autopilot super: generado, skip no permitido por DET-30 REQ-05).

## Summary

### What was requested
Promoción del triage de TICKET-055: abarcar solo los hallazgos de calidad SP3 cuyo fix toca código sprint-introducido (3 clusters: nits, type-safety en layout, guard de atomicidad RT).

### What was done
- **Layout** (`useCreateRowAction`, `useRowActionHandler`, `humanizeObjectName`, `RecordListElement`): `any`/`Function` → tipos precisos, `isRef` de vue, `'none'` en `redirectTo`, dedup de template handlers, 3 `console.log` quitados, `catch {}` ya no silencia.
- **object-manager** (`version-from-source.js`): guard que rechaza `asNewVersion` sobre RecordType (cierra agujero de atomicidad latente), + normalización prettier.
- Comportamiento observable: sin cambios salvo el guard. Verificado E2E: el flujo de clonado/versionado funciona end-to-end con el código nuevo.

### What was learned
- Learns capturados: 2 (2 refined, 0 discarded). L1: minimal-surface typing (candidato RULE-dev). L2: verificar uso antes de borrar dead-code reportado (proceso).
- Rules creadas: 0 (L1 candidato, no promovido — 1 ocurrencia).
- Decisions: 2 críticas (A3 aditivo; A1 solo-guard) documentadas en teach-close (DEC-LOCAL). Candidato RULE-core de atomicidad en backlog B1.
- Bugs: 0 formal. **Derivado** (fuera de scope): scratch Activity create falla sin workflow por defecto → fix nuevo.

### B9 — hallazgo no ejecutado (documentado)
B9 ("eliminar var `prefix` sin uso") NO se ejecutó: verificación in-situ mostró que la var está en uso (4 mensajes de error). Falso positivo del audit. Confirmado por el reviewer de cierre (defendible). No se tocó el archivo.

### Metrics
| Metric | Value |
|--------|-------|
| Sessions | 3 (S1 layout, S2 object-manager, S3 E2E) |
| Tasks completed | 11/11 (S1: 5, S2: 3, S3: 3) |
| Commits | 5 código (layout 3, om 2) + dkc records |
| Test cases | 4 pass / 0 fail / 0 pending (TC-1..TC-4) |
| Regression | layout 936→942 (+6, 0 reg); om 1851→1853 (+2, 0 reg); typecheck = baseline |
| Learns | 2 (2 refined) |
| Failed approaches | 2 (ApolloClient completo; borrar var B9) |
| SP estimated / executed | 2 / 2 (sessions-heuristic) |
| SP breakdown (llm / human) | 2 / 1 (proxy 3, speedup LLM 1) |
| SP delta (executed - estimated) | 0 (0%) |

### Acceptance checkpoints
- [x] **Funcional**: REQ-IMPROVE-01..05 cumplidos (REQ-01 con B9 = falso positivo documentado).
- [x] **Tests**: unit A1 (TC-1) verde; área layout verde; E2E (TC-4) verde.
- [x] **Rules**: RULE-dev-004 respetada (rama UPONE-1206, commits UPONE-1219, sin push); guard en helper, no en resolver.
- [x] **Integration**: ambas suites = baseline + tests nuevos; `Activity` versionable intacto (unit + E2E).
- [x] **Validación de cierre reforzada** (reviewer aislado): approve, scope OK, ramas OK, sin hallazgos bloqueantes.
- [x] **Docs**: n/a código; teach-close generado; backlog B1 + derivado registrados.

### Pendiente / derivados
- Backlog B1 (`could`): unificar path RT con `$transaction` — no bloquea.
- Derivado (nuevo fix): scratch Activity create sin workflow por defecto — a abrir como ticket aparte.

## Workflow state

| Step | Status | Started | Closed |
|------|--------|---------|--------|
| request-intake | done | 2026-06-05 | 2026-06-05 |
| design-improvement | done | 2026-06-05 | 2026-06-05 |
| request-execute | done | 2026-06-05 | 2026-06-05 |
| request-close | done | 2026-06-05 | 2026-06-05 |
