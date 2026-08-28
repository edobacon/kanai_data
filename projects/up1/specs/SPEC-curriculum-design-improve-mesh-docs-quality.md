---
id: SPEC-curriculum-design-improve-mesh-docs-quality
project: up1
ticket: TICKET-100
status: done
---

# Malla curricular — documentación del mod + limpieza de calidad acotada (CurriculumMesh)

# Malla curricular — documentación del mod + limpieza de calidad acotada (CurriculumMesh)

## Executive summary — lo que estas aprobando

> *Sección para revisión rápida. El detalle técnico vive en Requirements, Changes y Tasks.*

**Qué se quiere**: cerrar la deuda **documental** de la malla curricular (el componente `CurriculumMesh`, los objetos `planEntry`/`requirementCategory`, los guards de negocio y la semántica del pre-check de prerrequisitos) que SP5 construyó (MC-02..MC-09) pero nunca documentó, y hacer una **limpieza de calidad acotada y sin cambio de comportamiento** de la capa de composición Vue. La doc es el frente principal; la calidad es secundaria y diferible.

**Decisiones críticas que necesitan tu OK**:

| # | Decisión | Por qué importa |
|---|----------|-----------------|
| 1 | **Recortar** el frente de calidad respecto al borrador del ticket | El diagnóstico del intake sobredimensionó la deuda: los `any` reales son **17-18, no 21**, y **13 son el mismo patrón** `this as any` en `render()` de sub-componentes. El `setup()` gigante es **uno** (el `.vue`, ~1082 líneas), no tres. El spec ataca solo lo seguro. |
| 2 | Refactor de calidad **conservador**: extraer 3 composables limpios (drag&drop, filtros, períodos) + tipar los 5 `any` seguros de `useCurriculumMesh.ts` | **No hay tests de montaje** del `.vue` (gap W1 en el propio código). Extraer solo bloques que son wrappers finos sobre lógica pura ya testeada mantiene el riesgo bajo. Lo riesgoso (bloque de mutaciones ~330 líneas, `this as any`) va a backlog `could`. |
| 3 | Los guards (backend) y el objeto `requirement` se **documentan citando**, no se re-documentan ni se tocan | Los guards viven en `logic/helpers/*.js` (fuera de `execute_scope`); `requirement` ya tiene su referencia. Se leen para documentar la malla, no se modifican. |
| 4 | Zero-behavior-change se valida por **tests verdes idénticos + build + smoke**, no por test de montaje (no existe) | Es la única red disponible. Si un test cambia de resultado, no es refactor: se revierte. |

**Riesgos principales y mitigación**:

| Riesgo | Mitigación |
|--------|------------|
| Extraer un composable del `.vue` rompe wiring reactivo sin que un test lo note (no hay mount test) | Extraer solo bloques que delegan a `.logic.ts` ya testeados; mantener la superficie de `return` del `setup()` **idéntica**; verificar por build + typecheck + smoke render (storybook/preview) además de la suite. Si hay cualquier duda, diferir el bloque a backlog. |
| Doc que se desactualiza rápido | Espejar los docs existentes (`composite-section-tree.md`, `requirement-object.md`) y citar `archivo:línea` + IDs (`DEC-035`, `REQ-XX`, `H2`) tal cual el código, no parafrasear. |
| Scope creep del frente de calidad | El delta acordado es el límite: 3 composables + 5 `any`. Lo demás es backlog `could`, no bloquea cierre. |

**Qué NO se hace**: cambio de comportamiento de la malla; tocar el MCP (ya cubierto en TICKET-099); arreglar ISSUE-SP5-01 (issue de plataforma, solo se documenta); tipar los 13 `this as any` de render-functions; extraer los bloques de mutaciones/picker del `setup()`; agregar tests de montaje (backlog).

**Tamaño estimado**: 2 sessions. **S1** (docs, T0, gate auto) es la más grande en volumen pero de riesgo bajo. **S2** (calidad, T2, gate ⚑ fuerte) es la más riesgosa por el zero-behavior-change sin mount tests.

**Cómo vas a saber que funciona**: (a) existen 3-4 docs nuevos que un dev nuevo puede leer para entender la malla sin abrir 2192 líneas de `.vue`; (b) los índices y `.ai/CONTEXT.md` mencionan SP5/malla; (c) la suite de tests del mod pasa **idéntica** antes y después de S2; (d) el build/typecheck del mod pasa; (e) la malla renderiza igual en el smoke.

## Purpose

Documentar la funcionalidad de malla curricular del mod `curriculum-design` (componente + objetos + guards + pre-check) construida en SP5 y nunca migrada a `docs/`, y reducir deuda de composición Vue localizada (tamaño de `setup()` + `any` inseguros) sin alterar comportamiento. Para: devs del mod que retoman la malla, y el dev futuro que la extiende en SP6 (degree-audit, modo modular).

## Requirements

### REQ-DOC-01: Guía del componente CurriculumMesh

> **Que cambia**: un dev que abre la malla por primera vez tiene una guía (`docs/user-guide/curriculum-mesh.md`) que explica qué es, sus props, los modales, el drag&drop y los filtros — sin leer 2192 líneas de `.vue`.
> **Por que**: hoy el único punto de entrada es el código; el patrón espejo `composite-section-tree.md` existe pero nunca se replicó para la malla.

El sistema (la documentación del mod) MUST incluir una guía del componente `CurriculumMeshElement.vue` espejada de `docs/guides/composite-section-tree.md`, que cubra: propósito y qué renderiza (grid por períodos), props (`planId`, `enableEdit`, `title`), los 4 modales orquestados (Add/Edit/PrereqBlock/ActivityPicker), el drag&drop cross-columna (SortableJS + `recalcPeriodPosition`), los filtros de vista (líneas + bloques, unión no intersección) y el botón "Actualizar".

<details><summary>Scenarios de validación</summary>

#### Scenario: dev localiza props y modales
- **GIVEN** el doc `docs/user-guide/curriculum-mesh.md`
- **WHEN** un dev lo lee sin abrir el `.vue`
- **THEN** puede nombrar las 3 props, los 4 modales y qué dispara cada uno, con referencias `archivo:línea` verificables.

</details>

### REQ-DOC-02: Referencia de objetos planEntry + requirementCategory

> **Que cambia**: existen referencias de objeto (`docs/reference/plan-entry-object.md` y `requirement-category-object.md`) equivalentes a `requirement-object.md`, incluyendo los campos derivados en lectura y el ISSUE-SP5-01.
> **Por que**: `planEntry` y `requirementCategory` no tienen doc; sus campos derivados (`currentCredits`, `mandatoryCount`, `electiveCount`, `creditStatus`) y por qué no aparecen en la tabla son conocimiento tácito hoy.

El sistema MUST incluir dos referencias de objeto espejadas de `docs/reference/requirement-object.md`, documentando: campos persistidos (con tipo/FK/requerido citando el JSON), campos **derivados en lectura** (vía `enrichPlanEntryRows`/`enrichRequirementCategoryRows` en `logic/curriculum-read.resolver.js`) y el **ISSUE-SP5-01** (el RecordList de `layout` filtra columnas a campos persistidos → los derivados existen en GraphQL pero no se muestran en la tabla).

<details><summary>Scenarios de validación</summary>

#### Scenario: se explica por qué los créditos no aparecen en la tabla
- **GIVEN** la referencia de `requirementCategory`
- **WHEN** un dev busca por qué `currentCredits` no sale en la pestaña Líneas de formación
- **THEN** encuentra ISSUE-SP5-01 explicado con la cita a `logic/curriculum-read.resolver.js:237-246` y el mecanismo del RecordList (`useColumnConfiguration.ts:149-156`).

</details>

### REQ-DOC-03: Documentación de guards + semántica H2 del pre-check

> **Que cambia**: existe doc en `docs/architecture/` de los guards de negocio (MC-09) y de la semántica exacta del pre-check de prerrequisitos (H2, DEC-035).
> **Por que**: es la lógica más fácil de documentar mal (qué RecordType bloquea y cuál no); sin doc textual salen falsos positivos al resumir.

El sistema MUST incluir doc que capture: (a) los 3 guards de negocio —bloqueo de edición en plan `Active`, borrado de categoría con entries, rango `minCredits<=maxCredits`— citando `logic/helpers/{requirementActivityGuard,categoryGuard,creditRange}.js`; (b) la semántica **H2** del pre-check (DEC-035): `RecordState` Before/Either bloquea (colocación estrictamente anterior), `Group` es K-de-N, `MetricThreshold` nunca participa, timing `Concurrent` no participa; (c) el recálculo de posición al mover (`recalcPeriodPosition.logic.ts`, 0-based).

<details><summary>Scenarios de validación</summary>

#### Scenario: la fórmula del pre-check queda inequívoca
- **GIVEN** el doc de guards + pre-check
- **WHEN** un dev necesita saber si `MetricThreshold` bloquea agregar una asignatura
- **THEN** el doc dice explícitamente que NO, citando `usePrereqRequirements.ts:145` y `prereqCheck.logic.ts:82`.

</details>

### REQ-DOC-04: Índices y .ai/CONTEXT.md al día

> **Que cambia**: los INDEX.md de los subdirectorios de `docs/`, el `docs/INDEX.md` maestro y `.ai/CONTEXT.md` listan SP5/malla y enlazan los docs nuevos.
> **Por que**: sin índice, los docs nuevos son invisibles; hoy ningún índice menciona la malla.

El sistema MUST actualizar los INDEX.md afectados (`user-guide/`, `reference/`, `architecture/` como mínimo, + `docs/INDEX.md`) y `.ai/CONTEXT.md` para listar la malla/SP5 y enlazar REQ-DOC-01..03.

### REQ-QUAL-01: Extraer composables limpios del setup() (zero behavior change)

> **Que cambia**: 3 bloques cohesivos del `setup()` de `CurriculumMeshElement.vue` (drag&drop, filtros, gestión de períodos) pasan a composables (`useMeshDragDrop`, `useMeshFilters`, `useMeshPeriods`), reduciendo el `setup()` sin cambiar qué expone al template.
> **Por que**: el `setup()` de ~1082 líneas encarece cada cambio futuro; estos 3 bloques ya delegan a `.logic.ts` testeados, así que la extracción es de bajo riesgo.

El sistema SHOULD extraer a composables los bloques (2) períodos, (3) drag&drop y (4) filtros identificados en el análisis de estado actual, manteniendo **idéntica** la superficie de símbolos que el `setup()` retorna al template. NO extrae los bloques de mutaciones (~330 líneas) ni picker (~183) — van a backlog por riesgo sin mount tests.

<details><summary>Scenarios de validación</summary>

#### Scenario: la malla se comporta igual tras extraer
- **GIVEN** los composables extraídos
- **WHEN** se corre la suite del mod + build + smoke render
- **THEN** los tests pasan idénticos al baseline, el build pasa y la malla renderiza y opera igual (drag&drop, filtros, agregar/quitar período).

</details>

### REQ-QUAL-02: Tipar los `any` seguros de useCurriculumMesh.ts

> **Que cambia**: los 5 `any` de `useCurriculumMesh.ts` (4 `Record<string, any>` en firmas de normalizadores + 1 `catch (err: any)`) pasan a `Record<string, unknown>` / `unknown`.
> **Por que**: son wins seguros —el código ya hace type-narrowing campo por campo— y `useCurriculumMesh.spec.ts` cubre esos normalizadores como red.

El sistema SHOULD reemplazar los 5 `any` de `useCurriculumMesh.ts` por tipos precisos sin cambiar comportamiento. NO toca los 13 `this as any` de los render-functions (backlog `could`, requieren tipar `this` o migrar a closures — riesgo sin mount tests).

<details><summary>Scenarios de validación</summary>

#### Scenario: tipado más estricto sin romper
- **GIVEN** `useCurriculumMesh.ts` con `Record<string, unknown>`
- **WHEN** typecheck + `useCurriculumMesh.spec.ts`
- **THEN** typecheck pasa y el spec pasa idéntico.

</details>

### REQ-PRESERVE-01: Zero behavior change en el frente de calidad (regression)

> **Que cambia**: nada observable — es la garantía de que S2 no altera la malla.
> **Por que**: mejorar la composición y romper la malla no es mejora (DET-7).

El sistema MUST mantener el comportamiento de la malla tras S2: la suite de tests del mod pasa con **el mismo resultado** que el baseline (S2.T1), el build/typecheck del mod pasa, y el smoke de render (storybook/preview) muestra la malla operando igual (drag&drop, filtros, modales, períodos).

### REQ-PRESERVE-02: El frente de documentación es puramente aditivo

> **Que cambia**: nada de código — S1 solo crea/edita archivos bajo `docs/` y `.ai/`.
> **Por que**: la doc no debe tocar el runtime.

El sistema MUST mantener S1 restringido a `docs/` y `.ai/CONTEXT.md`; ningún archivo de `modsComponents/`, `objects/` o `logic/` se modifica en S1.

## Changes

### Added (S1 — docs)

| Artefacto | Tipo | Propósito |
|-----------|------|-----------|
| `docs/user-guide/curriculum-mesh.md` | doc guía | REQ-DOC-01 — guía del componente (espejo de `composite-section-tree.md`) |
| `docs/reference/plan-entry-object.md` | doc referencia | REQ-DOC-02 — objeto `planEntry` + derivados |
| `docs/reference/requirement-category-object.md` | doc referencia | REQ-DOC-02 — objeto `requirementCategory` + derivados + ISSUE-SP5-01 |
| `docs/architecture/curriculum-mesh-guards-prereqs.md` | doc arquitectura | REQ-DOC-03 — guards MC-09 + semántica H2 (DEC-035) + recalc posición |

### Modified (S1 — índices)

| Artefacto | Cambio |
|-----------|--------|
| `docs/user-guide/INDEX.md`, `docs/reference/INDEX.md`, `docs/architecture/INDEX.md`, `docs/INDEX.md` | listar los docs nuevos / SP5-malla |
| `.ai/CONTEXT.md` | agregar sección SP5/malla |

### Modified (S2 — calidad, zero behavior change)

| Artefacto | Antes | Después | Por qué |
|-----------|-------|---------|---------|
| `CurriculumMeshElement.vue` | `setup()` ~1082 líneas con 8 bloques inline | 3 bloques extraídos a composables; `return` idéntico | REQ-QUAL-01 |
| `useMeshDragDrop.ts`, `useMeshFilters.ts`, `useMeshPeriods.ts` (nuevos) | — | composables extraídos | REQ-QUAL-01 |
| `useCurriculumMesh.ts` | 5 `any` | `Record<string, unknown>` / `unknown` | REQ-QUAL-02 |

## Tasks

### Session 1 — Documentación de la malla [tipo: auto] [tier: T0]

parallel_groups: [[S1.T1, S1.T2, S1.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Escribir guía del componente CurriculumMesh (espejo de composite-section-tree.md) | REQ-DOC-01 | developer | — | docs/user-guide/curriculum-mesh.md | cross-refs válidas + frontmatter lint; refs archivo:línea verificables | git revert | DET-2, DET-11, RULE-dev-004 | done | 1 |
| S1.T2 | Escribir referencias de planEntry + requirementCategory (derivados + ISSUE-SP5-01) | REQ-DOC-02 | developer | — | docs/reference/plan-entry-object.md, docs/reference/requirement-category-object.md | cross-refs + campos citan JSON:línea; ISSUE-SP5-01 citado | git revert | DET-2, DET-11 | done | 1 |
| S1.T3 | Escribir doc de guards MC-09 + semántica H2 (DEC-035) + recalc posición | REQ-DOC-03 | developer | — | docs/architecture/curriculum-mesh-guards-prereqs.md | cross-refs + citas a logic/helpers y prereqCheck.logic.ts | git revert | DET-2, DET-11 | done | 1 |
| S1.T4 | Actualizar INDEX.md (user-guide/reference/architecture + maestro) + .ai/CONTEXT.md | REQ-DOC-04 | developer | S1.T1, S1.T2, S1.T3 | docs/user-guide/INDEX.md, docs/reference/INDEX.md, docs/architecture/INDEX.md, docs/INDEX.md, .ai/CONTEXT.md | los nuevos docs aparecen enlazados; no hay links rotos | git revert | DET-2, DET-16 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T0)** — persistir en `## Sessions` del ticket con Template de Gate, validar cross-refs/frontmatter de los docs nuevos, decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decisión documentada | (no aplica) | DET-13, DET-20, DET-23 | done | 1 |

### Session 2 — Calidad de código, zero behavior change [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Capturar baseline: correr suite del mod + typecheck/build, documentar verde exacto | REQ-PRESERVE-01 | researcher | S1.GATE | (lectura) mods/curriculum-design | `npm test` + build capturados como baseline verde | (no aplica — lectura) | DET-11, DET-13 | done | 2 |
| S2.T2 | Tipar los 5 `any` seguros de useCurriculumMesh.ts (Record<string,unknown> + catch unknown) | REQ-QUAL-02 | developer | S2.T1 | modsComponents/CurriculumMesh/useCurriculumMesh.ts | typecheck OK + useCurriculumMesh.spec.ts idéntico verde | git revert | DET-5, DET-8, DET-10 | done | 2 |
| S2.T3 | Extraer useMeshDragDrop + useMeshFilters + useMeshPeriods del setup(), return idéntico | REQ-QUAL-01 | developer | S2.T2 | modsComponents/CurriculumMesh/CurriculumMeshElement.vue, useMeshDragDrop.ts, useMeshFilters.ts, useMeshPeriods.ts | build OK + suite idéntica verde + smoke render de la malla | git revert | DET-5, DET-8, DET-10, DET-16 | done | 2 |
| S2.T4 | Verificar regresión: diff de resultados de test vs baseline == 0, build, smoke storybook/preview | REQ-PRESERVE-01 | reviewer | S2.T2, S2.T3 | (verificación) mods/curriculum-design | resultados de test idénticos al baseline; build verde; smoke OK | (no aplica) | DET-5, DET-7, DET-13, DET-14 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2, ⚑ fuerte)** — persistir gate, quality review 10-dim (DET-23) + dual-judge (DET-35) + mutation async (DET-31) sobre el diff, decidir continue/iterate | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + review + veredicto | (no aplica) | DET-13, DET-20, DET-23, DET-31, DET-35 | done | 2 |

### Task contract (resumen de los no triviales)

```
Task S2.T3: Extraer composables del setup()
- source_ref: REQ-QUAL-01
- agent: developer
- files: CurriculumMeshElement.vue + useMeshDragDrop.ts + useMeshFilters.ts + useMeshPeriods.ts
- precondition: S2.T1 baseline verde capturado
- expected_output: setup() reducido; los 3 bloques viven en composables; el return del setup() expone los MISMOS símbolos al template
- validation: build + suite idéntica al baseline + smoke render (drag&drop, filtros, add/remove período)
- rollback: git revert (cambio atómico por composable)
- rules: [DET-5, DET-8, DET-10, DET-16]
- nota: si al extraer un bloque la superficie de return cambia o un test se altera → revertir ese bloque y moverlo a backlog. Zero-behavior-change es el límite duro.
```

## Constraints

- **RULE-dev-004**: trabajo del mod en la rama de sprint del mod (`UPONE-1267-sp5`, ya activa); commits con prefijo del external `UPONE-1351` (DET-19).
- **DET-19**: artefactos del repo (commits) usan `UPONE-1351`, no `TICKET-100`.
- **DET-7**: los tests existentes son el baseline de regresión obligatorio para S2.
- **DEC-035**: la semántica H2 del pre-check es fuente de verdad para REQ-DOC-03; documentar textual, no reinterpretar.
- **execute_scope**: `docs/`, `modsComponents/CurriculumMesh/`, `.ai/CONTEXT.md`. Los guards backend (`logic/helpers/`) se **leen** para documentar, no se modifican.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Suite de tests del mod | internal | Baseline de regresión para S2 | Si la suite ya está roja en `develop`, S2.T1 lo detecta y se reporta (preexistente, no introducido) |
| Storybook / preview del mod | internal | Smoke render de la malla en S2.T4 | Si no levanta, el smoke se documenta como bloqueo honesto (memoria: verificar render, no solo config) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Extracción de composable rompe wiring reactivo sin test que lo note | medium | alto | Solo bloques que delegan a `.logic.ts` testeados; return del setup() idéntico; build + typecheck + smoke además de la suite; revertir bloque ante duda |
| Smoke no ejecutable (entorno) | medium | medio | Bloqueo honesto documentado; no cerrar S2 declarando "hecho" sin evidencia de render |
| Doc se desactualiza | low | bajo | Espejar docs existentes + citar archivo:línea e IDs literales |

## Open questions

Ninguna abierta — el análisis de estado actual (researcher, 2026-07-02) resolvió los números reales de deuda y la semántica del pre-check. Ver Learns L1-L4 del ticket.

## Decisions

### DEC-LOCAL-01: Recorte del frente de calidad al alcance seguro
- **Contexto**: el borrador del ticket dimensionó "21 any / 3 setup gigantes"; el análisis real halló 17-18 any (13 = patrón `this as any`) y un solo setup gigante (el `.vue`), sin tests de montaje.
- **Drivers**: zero-behavior-change + ausencia de mount tests + prioridad secundaria del frente.
- **Opción elegida**: extraer 3 composables limpios (drag&drop/filtros/períodos) + tipar 5 `any` seguros; diferir el resto a backlog `could`.
- **Alternativas**: (a) refactor agresivo de todo el setup → descartada (riesgo alto sin red de tests); (b) no tocar código → descartada (el frente aporta valor acotado real).
- **Consecuencias**: gana seguridad y foco; deja deuda residual documentada en backlog.
- **Session**: S-design.

## Success metrics

| Metric | Baseline (current) | Target | How to measure | When |
|--------|-------------------|--------|----------------|------|
| Docs de malla existentes | 1 (`requirement-object.md`) | ≥ 4 | `ls docs/**` | fin S1 |
| Índices que mencionan la malla | 0 | ≥ 4 | grep en INDEX.md + .ai/CONTEXT.md | fin S1 |
| `any` en useCurriculumMesh.ts | 5 | 0 | `grep -c '\bany\b'` | fin S2 |
| Líneas de `setup()` del `.vue` | ~1082 | menor (3 bloques fuera) | conteo | fin S2 |
| Resultado de la suite del mod | verde (baseline S2.T1) | verde idéntico | `npm test` diff | fin S2 |

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-DOC-01..03 satisfechos (docs legibles con refs verificables)
- [ ] **Docs**: 4 docs nuevos + índices + `.ai/CONTEXT.md` actualizados; sin links rotos
- [ ] **Tests**: suite del mod verde idéntica al baseline tras S2
- [ ] **Build**: typecheck/build del mod verde tras S2
- [ ] **Integration (regression)**: smoke render de la malla OK (drag&drop, filtros, modales, períodos) o bloqueo honesto documentado
- [ ] **Rules**: RULE-dev-004 (rama/commits) + DET-19 (prefijo UPONE-1351) respetados
- [ ] **Backlog**: items `could` registrados (no bloquean cierre)

## Backlog

| # | Item | Priority | Razón |
|---|------|----------|-------|
| B-1 | Extraer los bloques de mayor riesgo del setup() (mutaciones de alta ~330 líneas, picker ~183) | could | Requiere primero tests de montaje del `.vue`; riesgo alto sin ellos |
| B-2 | Eliminar los 13 `this as any` de los render-functions | could | Requiere tipar `this` de render-functions o migrar a closures del setup(); riesgo de comportamiento sin mount tests |
| B-3 | Agregar tests de montaje del `.vue` + sub-componentes render-function (cierra gap W1) | could | Habilitaría B-1/B-2 con seguridad; hoy no existe harness de montaje en el mod |

## Archiving

Cuando la spec deje de ser fuente de verdad: `/dkc-archive-spec SPEC-curriculum-design-improve-mesh-docs-quality "razón"`.
