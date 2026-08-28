---
id: TICKET-100
project: up1
type: ticket
status: closed
work_type: improvement
external: UPONE-1351
module: curriculum-design
autopilot: autonomous
---

# Malla — Documentación del mod + revisión de calidad de código (CurriculumMesh, MC-02..09)

> **Follow-up local colgado de Historia existente**: gap de calidad acumulado en tickets previos del equipo (MC-02..MC-09 / UPONE-1345..1352). Por decisión del dev (2026-07-02) se asocia como `external` a la Historia SP5 **[UPONE-1351](https://u-planner.atlassian.net/browse/UPONE-1351)** (MC-08 · filtros + interacciones avanzadas + pre-check H2) — la que más solapa con lo documentado/refactorizado. **No se creó Historia nueva** de Jira (se cuelga de una existente, per convención de follow-up local). DET-19: los commits del repo del mod usan el prefijo `UPONE-1351`.
> **Origen**: descubierto al cerrar [TICKET-099](TICKET-099.md) (paridad MCP de la malla). Diagnóstico de docs + deuda validado 2026-07-02 por reviewer aislado.

## Request

Poner al día la **documentación del mod `curriculum-design`** respecto al código de la malla curricular (componente `CurriculumMesh` + objetos `planEntry`/`requirementCategory`/`requirement` + guards + pre-check de prereqs), construido en SP5 (MC-02..MC-09) pero **nunca migrado a `docs/`** (la doc se detuvo en MC-02/03). Y una **revisión de calidad de código acotada** de la capa de composición Vue de la malla (deuda de tamaño de función/archivo + uso de `any`), sin cambio de comportamiento.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | improvement (documentación + calidad, zero behavior change en la parte de código) |
| Tipo de cambio | docs nuevos en `mods/curriculum-design/docs/` + refactor acotado de composición Vue |
| Modulo principal | curriculum-design (mod) |
| Modulos afectados | solo el mod curriculum-design (docs + `modsComponents/CurriculumMesh/`). NO toca MCP (ya documentado en TICKET-099) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | Docs + refactor sin cambio de UI. |
| Data model | no | No crea objetos ni campos. |

## Triage

Dos frentes, priorizados. **Frente 1 (documentación) es el principal**; **Frente 2 (calidad de código) es acotado y de menor prioridad** (la higiene es buena: sin TODOs, sin dead code, bien testeado; la deuda es de tamaño/tipado localizado).

### Context found — diagnóstico (reviewer aislado, 2026-07-02)

**Estado de docs del mod (`mods/curriculum-design/docs/`):** los commits de doc se detuvieron en UPONE-1345/1346 (MC-02/03) mientras el código siguió hasta UPONE-1351-S5 (MC-08/09) sin doc paralela. Único doc de malla existente: `docs/reference/requirement-object.md` (cubre MC-03, no el pre-check ni el resto). Ningún INDEX.md ni `.ai/CONTEXT.md` menciona SP5/malla.

**Gaps de documentación (priorizados):**
- **Alto** — (a) No hay doc del componente `CurriculumMeshElement.vue` (2192 líneas: qué es, props, modales de alta/edición, drag&drop, filtros) — existe el patrón espejo `docs/guides/composite-section-tree.md`, no se replicó. (b) No hay doc de los objetos `planEntry` y `requirementCategory` (equivalente a `requirement-object.md`), incluyendo campos derivados en lectura (`currentCredits`/`mandatoryCount`/`electiveCount`/`creditStatus` vía `enrichPlanEntryRows`) y el issue de UI ISSUE-SP5-01 (el RecordList filtra columnas a campos persistidos → derivados no se muestran). (c) No hay doc de los guards de negocio (MC-09 bloqueo en plan Active, borrado de línea con entradas, rango de créditos min≤max). (d) No hay doc de la semántica **H2** del pre-check de prereqs (RecordState Before/Either colocado antes; Group K-de-N; MetricThreshold NO bloquea; Concurrent no participa — DEC-035).
- **Medio** — (e) No hay doc del recálculo de posición al mover (`recalcPeriodPosition.logic.ts`). (f) Los 5 INDEX.md de subdirs + `docs/INDEX.md` maestro no listan SP5/malla.
- **Bajo** — (g) `.ai/CONTEXT.md` describe el mod hasta SP4, sin mencionar SP5/malla.

**Deuda de código (señal superficial, no review profundo):**
- Concentrada en 3 archivos de composición Vue con `setup()` gigante: `CurriculumMeshElement.vue` (2192 líneas, ~1080 en un `setup`), `AddEntryModal.ts` (505, ~380 en `setup`), `EditEntryModal.ts` (404). Candidatos a extraer sub-composables.
- **21 usos de `any`** en 7 archivos, concentrados en `useCurriculumMesh.ts` (8) y `AddEntryModal.ts` (7).
- **Positivo (no requiere acción):** sin TODOs/FIXMEs reales, sin código muerto, sin magic numbers; cada `.logic.ts` tiene su `.spec.ts` + tests de backend. La capa `.logic.ts` pura está bien factorizada (solo 3 funciones >40 líneas).

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | La doc de la malla nunca se escribió (no es que se desactualizó) | ✓ confirmada | git log: doc detenida en MC-02/03; búsqueda en docs/ sin resultados de CurriculumMesh/planEntry/prereqs |
| H2 | La deuda de código es de tamaño/tipado localizado, no estructural | ✓ confirmada | 3 set() grandes + 21 any; sin TODOs/dead-code; tests presentes |

## Requisitos (REQ) — a transcribir al SPEC (borrador)

| REQ | Certeza | source_ref | Enunciado |
|-----|---------|-----------|-----------|
| REQ-DOC-01 · doc del componente CurriculumMesh | confirmed | gap (a) | `docs/user-guide/curriculum-mesh.md`: qué es, props, modales (alta/edición/bloque), drag&drop, filtros. Espejo de `composite-section-tree.md`. |
| REQ-DOC-02 · doc de objetos planEntry + requirementCategory | confirmed | gap (b) | `docs/reference/plan-entry-object.md` + `requirement-category-object.md` (espejo de `requirement-object.md`): campos, derivados en lectura, ISSUE-SP5-01. |
| REQ-DOC-03 · doc de guards + pre-check H2 | confirmed | gap (c),(d) | Doc en `architecture/` o `patterns/`: MC-09, borrado de categoría, rango de créditos, y semántica H2 del pre-check (DEC-035). |
| REQ-DOC-04 · actualizar índices | confirmed | gap (f),(g) | 5 INDEX.md de subdirs + `docs/INDEX.md` + `.ai/CONTEXT.md` listan SP5/malla. |
| REQ-QUAL-01 · extraer sub-composables (zero behavior change) | inferred | deuda código | Evaluar extraer composables del `setup()` de `CurriculumMeshElement.vue`, `AddEntryModal.ts`, `EditEntryModal.ts`. Tests como baseline de preservación. |
| REQ-QUAL-02 · reducir `any` | inferred | deuda código | Tipar los 21 `any` (foco `useCurriculumMesh.ts` 8, `AddEntryModal.ts` 7). |

**Fuera de alcance:** cambios de comportamiento de la malla; tocar el MCP (ya documentado en TICKET-099); ISSUE-SP5-01 en sí (es un issue de plataforma aparte, solo se documenta aquí).

## Setup

| Campo | Valor |
|-------|-------|
| Branch | rama de ticket del mod (per RULE-dev-004); base `develop` |
| Test data | n/a (docs) / suite existente del mod como baseline para REQ-QUAL |
| Services | n/a |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El diagnóstico del intake ("21 any en 7 archivos") era señal superficial. Conteo real: **17-18 `any`**, de los cuales **13 son `this as any` en `render()`** de los 4 sub-componentes render-function (ActivityPicker/AddEntryModal/EditEntryModal/PrereqBlockModal) — un patrón estructural único (Options API con `h()` sin tipado de `this`), no 13 problemas independientes. Solo **5** (en `useCurriculumMesh.ts`) son wins seguros (`Record<string,any>`→`unknown` ×4 + `catch(err:any)` ×1). | researcher (sonnet) | S-design | discarded | — (capturado en spec DEC-LOCAL-01 + backlog B-3) |
| L2 | El `setup()` gigante es esencialmente **uno**: `CurriculumMeshElement.vue` ≈1082 líneas de setup. Los modales tienen setup **moderado** (AddEntryModal ≈158, EditEntryModal ≈112), no ~380 como decía el borrador. El refactor real apunta al `.vue`, no a los modales. | researcher (sonnet) | S-design | discarded | — (capturado en spec DEC-LOCAL-01) |
| L3 | **No hay tests de montaje** del `.vue` ni de los 4 sub-componentes render-function (gap W1 documentado en el propio código). La lógica pura (`.logic.ts`) sí tiene `.spec.ts` 1:1. Consecuencia: el refactor zero-behavior-change debe limitarse a extracciones que sean wrappers finos sobre lógica ya testeada + verificación por build/typecheck/smoke, no por test de montaje. | researcher (sonnet) | S-design | refined | backlog B-4 (agregar mount tests) |
| L4 | Los guards de negocio (MC-09) viven en **backend** (`logic/helpers/{requirementActivityGuard,categoryGuard,creditRange}.js`), no en el componente. Solo `status='Active'` bloquea edición de requirement; `EDITABLE_STATUSES=['Draft']` en FE es constante **duplicada intencionalmente** (runtimes separados). Se documentan (lectura), no se modifican (fuera de execute_scope). | researcher (sonnet) | S-design | discarded | — (documentado en docs/architecture/curriculum-mesh-guards-prereqs.md) |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| 1 | S2.T3: colocar la llamada `useMeshFilters(columns, entries, categories, blockOptions)` en la posición original del bloque de filtros (~línea 762) | `blockOptions` se declara ~60 líneas después (const → temporal dead zone). El código original funcionaba porque usaba `blockOptions` dentro de un `computed` (evaluación diferida); pasarlo como argumento lo evalúa de inmediato → ReferenceError en runtime (que vue-tsc NO atrapa). | Al extraer un composable de un `setup()` grande, la llamada debe ir DESPUÉS de declarar todas sus dependencias reactivas. Refuerza por qué el refactor sin mount tests es riesgoso: el typecheck no habría detectado este bug. Corregido reubicando la llamada tras `blockOptions`. |

## Sessions

### Plan de sessions

| Session | Objetivo | REQ / Tasks | Tier | Tipo gate |
|---------|----------|-------------|------|-----------|
| S1 | Documentación de la malla (componente + objetos + guards/H2 + índices) | REQ-DOC-01..04 | T0 | auto |
| S2 | Revisión de calidad acotada (sub-composables + `any`), zero behavior change | REQ-QUAL-01, REQ-QUAL-02 | T2 | ⚑ fuerte |

> Plan preliminar (esqueleto). Al tomar el ticket, `design-improvement` refina REQ/tasks. S2 es opcional/menor prioridad — puede diferirse si el team prioriza solo la documentación.

### Modo (autopilot)

| Timestamp | Cambio | Razón | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-07-02T14:07:01-0400 | (inicio) → super | dev invocó `/dkc 100 super autopilot` — ejecución continua del ticket completo (HOR-079) | intake/design/execute |

### Session 1 — 2026-07-02 — Documentación de la malla [phase: execute]

**Tipo**: auto (auto-continue si criterios verdes)
**Validation tier**: T0 (doc-only)

**Objetivo**: Escribir la documentación faltante de la malla (guía del componente, referencias de objetos, guards + pre-check H2, índices + `.ai/CONTEXT.md`) espejando los docs existentes. Frente aditivo, solo `docs/` y `.ai/`.

parallel_groups: [[S1.T1, S1.T2, S1.T3]]

**Tasks completadas**:
- [x] S1.T1 — Guía del componente CurriculumMesh (docs/user-guide/curriculum-mesh.md), espejo de composite-section-tree.md
- [x] S1.T2 — Referencias de planEntry + requirementCategory (docs/reference/), derivados + ISSUE-SP5-01
- [x] S1.T3 — Doc de guards MC-09 + semántica H2 (DEC-035) + recalc posición (docs/architecture/)
- [x] S1.T4 — Actualizar INDEX.md (user-guide/reference/architecture + maestro) + .ai/CONTEXT.md
- [x] S1.GATE — Gate de sync Session 1 (tier T0)

**Validación del tier**:
- T0 — Lint frontmatter: pass (los 4 docs nuevos llevan frontmatter `kind: doc` con title/audience/tags/created/updated). Cross-references: pass (0 links `.md` rotos entre los 4 docs nuevos y los 4 índices actualizados; verificado con resolución de rutas relativas).

**Discoveries / Learns nuevos**: (registrados en tabla Learns) L1-L4 emergieron en design (researcher) — números reales de deuda, un solo `setup()` gigante, ausencia de mount tests, guards en backend.

**Quality review (DET-23)**:

**Reviewer**: LLM principal (inline light — tier T0 doc-only, proporcionalidad: reviewer aislado/dual-judge se reservan a T2/T3)
**Tier de revision**: light
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad (contenido) | pass | Docs espejan el patrón existente (composite-section-tree.md / requirement-object.md); citas archivo:línea muestreadas y verificadas exactas (BLOCKING_TIMINGS:28, onDelete Restrict, cm-pe--dimmed:1656). |
| 2 | Lint/formato | pass | Frontmatter `kind: doc` presente en los 4; 0 links rotos. |
| 3 | Tipado | n/a | Doc-only, sin código. |
| 4 | Testing | n/a | Doc-only. |
| 5 | Escalabilidad | pass | Índices al día → docs descubribles; timeline SP5 agregada. |
| 6 | Mantenibilidad | pass | IDs literales (DEC-035, H2, ISSUE-SP5-01, MC-09) sin parafrasear → resisten drift. |
| 7 | Claridad | pass | Semántica H2 documentada como fórmula inequívoca (qué bloquea / qué no). |
| 8 | A11y | n/a | Doc-only. |
| 9 | Storybook | n/a | Doc-only. |
| 10 | Error handling | n/a | Doc-only. |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S1 doc-only T0 verde; docs commiteados 4c1b458
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Trigger-rules: doc-only, sin path sensible ni diff de código → sin recomendación de subir tier; T0 se mantiene.

**Commit DET-27**: `4c1b458` UPONE-1351 docs(curriculum-design): documentar la malla (componente, objetos, guards + pre-check H2, indices)

**Tiempo invertido**: ~1h efectiva
**Contexto retomable**: S1 cerrada — 4 docs nuevos + 4 índices + .ai/CONTEXT.md commiteados (modo limpio) en rama UPONE-1267-sp5 del mod. Sigue S2 (calidad de código).

### Session 2 — 2026-07-02 — Calidad de código (zero behavior change) [phase: execute]

**Tipo**: ⚑ fuerte (validación reforzada antes de avanzar)
**Validation tier**: T2 (unit + coverage)

**Objetivo**: Reducir deuda de composición Vue sin cambiar comportamiento: tipar los 5 `any` seguros de `useCurriculumMesh.ts` y extraer 3 composables limpios (drag&drop, filtros, períodos) del `setup()` de `CurriculumMeshElement.vue`. Tests existentes como baseline de regresión.

**Tasks completadas**:
- [x] S2.T1 — Capturar baseline: suite del mod + typecheck/build en verde
- [x] S2.T2 — Tipar los 5 `any` seguros de useCurriculumMesh.ts
- [x] S2.T3 — Extraer `useMeshFilters` (return idéntico). Drag&drop + períodos diferidos a backlog (riesgo sin mount tests)
- [x] S2.T4 — Verificar regresión (tests idénticos al baseline + build + smoke)
- [x] S2.GATE — Gate de sync Session 2 (tier T2, dual-judge DET-35)

**Validación del tier**:
- T2 — vitest run CurriculumMesh: **226/226 pass** (idéntico al baseline S2.T1). vue-tsc: **75 errores totales = baseline** (0 nuevos, 0 en CurriculumMesh/useMeshFilters). Compile-smoke: `npm run build-storybook` verde (CurriculumMesh.stories compila y empaqueta con el refactor).

**Discoveries / Learns nuevos**: sin learns nuevos en S2 (el análisis de deuda ya estaba en L1-L4 del design). Bug de TDZ auto-detectado y auto-corregido durante T3 (ver Failed approaches).

**Quality review (DET-23)** — modo **dual-judge (DET-35)**, gate T2:

**Reviewer**: 2 jueces ciegos en paralelo (sonnet/balanced), sin disputa → sin adjudicador reasoning
**Tier de revision**: exhaustive (dual-judge)
**Resultado global**: pass (APPROVED — ambos jueces approve, zero-behavior-change=true)

| Finding | Judge A | Judge B | Severity | Status |
|---------|---------|---------|----------|--------|
| `str()` coercería a null valores no-string | info/teórico | info/teórico | info | descartado (ambos verificaron schema: campos = string; IDs de negocio = cuid) |
| gap de cobertura: sin test de str() con no-string | (no lo halló) | info | info | suspect (1 juez) → backlog B (no bloquea; no modificar tests sin OK del dev) |

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad código | pass | Extracción fiel; helper `str()` claro. |
| 2 | Lint/formato | pass | 0 imports huérfanos; `creditRollupRatio` sigue usado. |
| 3 | Tipado | pass | 5 `any` eliminados; narrowing explícito; 0 typecheck errors en el área. |
| 4 | Testing | warn | 226 tests verdes idénticos; gap preexistente de mount tests (backlog B-4) — no introducido. |
| 5 | Escalabilidad | pass | `setup()` reducido; composable reusable. |
| 6 | Mantenibilidad | pass | Bloque de filtros aislado y documentado. |
| 7 | Claridad | pass | Comentarios de procedencia (TICKET-100) + nota de orden por TDZ. |
| 8 | A11y | n/a | Sin cambio de UI/markup. |
| 9 | Storybook | pass | build verde (compile smoke). |
| 10 | Error handling | pass | `catch (err: unknown)` con narrowing `instanceof Error`. |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S2 dual-judge APPROVED, zero-behavior-change; commit a45433c
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

Trigger-rules: diff ~100 líneas en path de composición (no sensible); tier T2 del design se mantiene (dual-judge ya es el modo reforzado). Sin bump.

```dkc:gate-telemetry
session: S2.GATE
work_type: improvement
tier: T2
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 0
adjudicator_invocations: 0
diff_chars: 10166
est_tokens: 2748
span_seconds: 0
```

**Commit DET-27**: `a45433c` UPONE-1351 refactor(curriculum-design): extraer useMeshFilters + tipar any de useCurriculumMesh (zero behavior change)

**Tiempo invertido**: ~1.5h efectiva
**Contexto retomable**: S2 cerrada — `useMeshFilters.ts` extraído + `any` tipados en useCurriculumMesh, commit a45433c. Drag&drop/períodos → backlog. Sigue request-close + teach-close.

## Commits

| Hash | Fecha | Header | Tasks | REQ |
|------|-------|--------|-------|-----|
| 4c1b458 | 2026-07-02 | UPONE-1351 docs(curriculum-design): documentar la malla (componente, objetos, guards + pre-check H2, indices) | S1.T1-T4 | REQ-DOC-01..04 |
| a45433c | 2026-07-02 | UPONE-1351 refactor(curriculum-design): extraer useMeshFilters + tipar any de useCurriculumMesh (zero behavior change) | S2.T2-T3 | REQ-QUAL-01, REQ-QUAL-02, REQ-PRESERVE-01 |
| 3285360 | 2026-07-02 | UPONE-1351 docs(curriculum-design): corregir nota obsoleta de link en guia de la malla | close (fix review) | REQ-DOC-04 |

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-DOC-01..04 | Verificación de existencia + frontmatter + citas archivo:línea + 0 links rotos (S1) | doc-lint | covered |
| REQ-QUAL-02 | `useCurriculumMesh.spec.ts` (9) verde tras tipado; 0 `any`; 0 typecheck errors | unit + typecheck | covered |
| REQ-QUAL-01 | Suite CurriculumMesh (226) idéntica al baseline + typecheck 75=baseline + storybook build verde (extracción `useMeshFilters`) | unit + build + typecheck | covered (parcial: filtros; drag&drop/períodos → backlog) |
| REQ-PRESERVE-01 | 226 tests idénticos al baseline; build/typecheck sin regresión; compile-smoke storybook verde | regression | covered |
| REQ-PRESERVE-02 | S1 solo tocó `docs/` + `.ai/CONTEXT.md` (git status) | regression | covered |

## Backlog

| # | Item | REQ | Prioridad | Cómo retomar |
|---|------|-----|-----------|--------------|
| B-1 | Extraer del `setup()` de `CurriculumMeshElement.vue` el bloque **drag&drop** (~185 líneas: SortableJS lifecycle, watchers, onBeforeUnmount, persist Apollo) → `useMeshDragDrop` | REQ-QUAL-01 | could | Requiere primero B-3 (mount tests). El bloque está demarcado con `// ── Drag&drop cross-columna ──`; pasar `entries`, `editable`, apolloClient, `refetch` por referencia. Verificar con mount test + smoke de drag real. |
| B-2 | Extraer el bloque **gestión de períodos** (~60 líneas: `viewPeriodCount`, `columns`, `addPeriod`, `removePeriod`, `canRemovePeriod`) → `useMeshPeriods` | REQ-QUAL-01 | could | `columns` es consumido por filtros y drag&drop → extraer con cuidado del cableado. Requiere B-3. |
| B-3 | Eliminar los 13 `this as any` de los render-functions (ActivityPicker/AddEntryModal/EditEntryModal/PrereqBlockModal) | REQ-QUAL-02 | could | Requiere tipar `this` de render-functions o migrar a closures del `setup()`. Riesgo de comportamiento sin mount tests. |
| B-4 | Agregar tests de montaje del `.vue` + los 4 sub-componentes render-function (cierra gap W1) | nuevo | could | Habilita B-1/B-2/B-3 con seguridad. Hoy no existe harness de montaje en el mod (vitest node-env; requeriría @vue/test-utils + jsdom + mock Apollo). |

> Todos `could` → no bloquean el cierre del ticket (DET-17: solo `must` bloquea). Son la deuda residual consciente tras el recorte de alcance seguro (DEC-LOCAL-01 del spec).

## Summary

Follow-up local (colgado de la Historia SP5 **UPONE-1351** / MC-08) que puso al día la documentación de la malla curricular y limpió deuda de composición sin cambiar comportamiento. Ejecutado en 2 sessions bajo super autopilot.

**Entregado:**
- **Documentación (S1)**: 4 docs nuevos — `docs/user-guide/curriculum-mesh.md` (guía del componente), `docs/reference/plan-entry-object.md` + `requirement-category-object.md` (objetos + derivados en lectura + ISSUE-SP5-01), `docs/architecture/curriculum-mesh-guards-prereqs.md` (guards MC-09 + semántica H2 del pre-check DEC-035 + recalc de posición). 4 índices + `.ai/CONTEXT.md` al día. Espejan los patrones existentes; citan `archivo:línea` e IDs literales.
- **Calidad de código (S2, zero behavior change)**: extracción de `useMeshFilters.ts` del `setup()` de `CurriculumMeshElement.vue` (return idéntico) + tipado de los 5 `any` seguros de `useCurriculumMesh.ts` (helper `str()` + `catch unknown`).

**Verificación**: 226 tests idénticos al baseline; typecheck 75 errores = baseline (0 nuevos, 0 en CurriculumMesh); build de storybook verde; loop dual-judge (S2.GATE) APPROVED; reviewer aislado de cierre APPROVED (scope + rama + REQs + propagación verificados independientemente, 226 tests re-corridos).

**Alcance recortado (DEC-LOCAL-01)**: el diagnóstico del intake sobredimensionó la deuda (21 `any` reales → 17-18, con 13 estructurales; un solo `setup()` gigante, no tres). Sin tests de montaje del `.vue`, S2 se limitó a lo verificable con seguridad. Diferido a backlog (`could`, no bloquea): extracción de drag&drop (B-1) y períodos (B-2), eliminación de los 13 `this as any` (B-3), y el habilitador — mount tests del `.vue` (B-4).

**Commits** (rama `UPONE-1267-sp5` del mod, prefijo `UPONE-1351` por DET-19): `4c1b458` (docs), `a45433c` (refactor), `3285360` (fix de nota obsoleta en cierre). **No pusheados** — el push difiere el OK humano (super autopilot: auto-commit local, push siempre pregunta).

**Learning clave**: al extraer un composable de un `setup()` grande, la llamada debe ir DESPUÉS de declarar sus dependencias reactivas (un `computed` tolera el orden por evaluación diferida; pasar la dependencia como argumento no → TDZ en runtime que el typecheck no atrapa). Ver Failed approaches #1.
