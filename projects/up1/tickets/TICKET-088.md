---
id: TICKET-088
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1351
module: curriculum-design
autopilot: autonomous
---

# Malla — Filtros + interacciones avanzadas

> **MC-08** · Épica Jira [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) (track interno "B") · Tier 🆂 Should (filtros) + 🅲 Could (bloqueo, drag&drop) · 7 SP · repo `mod` (FE) · Fase F2.
> **Pre-spec (fuente de design):** [`sp5/prespecs/MC-08.md`](../../../../uplanner/specs/up1/sp5/prespecs/MC-08.md) — transcrito abajo. El SPEC formal DKC se crea al tomar el ticket (design-feature), transcribiendo REQ/tasks 1:1.
> **Colchón/Could del sprint:** entra según velocity (compromiso firme = MC-01..MC-07).

## ⛔ Gate de inicio — dependencias

> **1 dev, ejecución en serie.** Antes de iniciar design / `request-execute`, verificar que cada bloqueante esté `status: closed` (frontmatter `depends_on` + relaciones `depends_on` en HC; `dkc_read_frontmatter`). Si alguna NO está `closed`: **NO iniciar este ticket** — bloquear y avisar al dev (DET-30 guarda de inicio).

| Bloqueante | Aporta | Debe estar |
|---|---|---|
| [TICKET-085](TICKET-085.md) (MC-05) | componente de malla (los filtros operan sobre él) | closed |
| [TICKET-083](TICKET-083.md) (MC-03) | requirement owner=activity (checker de prereqs) | closed |
| [TICKET-086](TICKET-086.md) (MC-06) | bloques electivos creados (chips de electivos) | closed |

## Request

Como diseñador curricular, quiero filtrar la malla y reorganizarla con fluidez, con alertas cuando falten prerrequisitos, para analizar y construir el plan cómodamente.

Agrupa B9 + B6 + B8 (handoff). Filtros (Should): chips de líneas de formación (resaltar/atenuar por categoryId) + chips de bloques electivos (derivados de blockId); limpiar. Bloqueo por prereqs (Could): al agregar un curso, si un prereq-curso (RecordState Before) no está en período anterior, o un Group K-de-N tiene miembros ausentes, se bloquea (modal de faltantes: Cancelar/Volver); MetricThreshold(Credits) NO alerta. Drag&drop (Could): entre columnas actualiza period/position (recalcula hermanos), persistido; botón "Agregar período". sortablejs (ya dependencia). Alerta informativa, no corrección automática.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | UI (chips de filtro + checker de prereqs + drag&drop) |
| Modulo principal | curriculum-design |
| Modulos afectados | curriculum-design (mod-only); lee requirement (MC-03) para prereqs |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | sí | filtros + DnD + modal de bloqueo → draft visual recomendado al tomar (DET-18) |
| Data model | no | DnD persiste period/position de planEntry (objeto de MC-02) |

## Triage

REQs **confirmados**. Filtros Should + bloqueo/DnD Could. Lógica de dominio nueva: checker de prereqs (cursos + K-de-N; créditos NO alertan). Reuso: `sortablejs` (ya dependencia) para DnD.

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El checker de prereqs solo alerta para cursos (RecordState) y K-de-N (Group), no para créditos (MetricThreshold) | ✓ confirmada | **KB:** DEC-035 (decisión aceptada). **schema:** `rt__MetricThreshold__requirement.json` (créditos, no ubicación). **fuente:** MC-08.md REQ-02 gherkin + reunión 00:29:22 |
| H2 | El check de prereqs es **estructural** (prereq-curso ubicado en período anterior), NO transcript-based (no evalúa `mustBe` Approved/Taken contra notas) | ✓ confirmada | **schema:** `MeshEntry` no tiene estado de aprobación/nota (`curriculumMesh.logic.ts:35-67`); solo `period`/`position`. **docs:** degree-audit diferido a SP6 (`docs/reference/requirement-object.md:19`). **fuente:** gherkin "NO está en un período anterior" (ubicación, no estado). Resuelve gap de semántica |
| H3 | La malla NO carga hoy `requirement(ownerType=activity)`; REQ-02 requiere composable nuevo (patrón `useBlockOptions`) | ✓ confirmada | **frontend:** `useCurriculumMesh.ts` solo referencia `Group`/electivos, nunca `RecordState` (grep). **schema:** `objects/requirement.json` + `rt__RecordState__requirement.json` existen (MC-03/TICKET-083). Precedente: `useBlockOptions.ts:37-113` |
| H4 | REQ-03 DnD cross-column es lógica nueva; `sortablejs` está pero no se usa en la malla, y el precedente (`CompositeSectionTree`) es single-list | ✓ confirmada (build) | **dep:** `package.json:26` `sortablejs ^1.15.6` (no usado en `CurriculumMesh/`, grep). **precedente:** `CompositeSectionTreeElement.vue:482-490` (raw `Sortable.create`, single-list) + `buildPayloads.ts:93-97` (`computePositionUpdates`). **mutation:** `UPDATE_PLAN_ENTRY` reusable con `{period, position}` (`CurriculumMeshElement.vue:275-281`) |
| H5 | El gating `canEdit` (Draft-only) aplica a DnD (es edición) pero NO a filtros (operación de vista read-only) | ✓ confirmada (S2.T3) | **frontend:** `.cm-filters` con `v-if` sobre datos (rollups/chips), NO sobre `editable`; handlers `toggleCategoryFilter`/`clearFilters` no consultan `plan.status`/`mode`. Add/edit sí gated por `canEdit()` (`CurriculumMeshElement.vue:176,211`). Filtros usables en lectura/edición y en Draft/Active/Archived |
| H6 | El query `listInstances` de `requirement` soporta filtro multi-EQUALS (`ownerType`+`ownerId`) combinado con AND | ✓ confirmada (S3.T1) | **backend:** `instance.resolver.js:1227` itera `processedFilters` genéricamente (sin tope ni lógica por-campo) → `AND` final (`:1487-1489`). `useBlockOptions.ts:70-76` ya usa 3 EQUALS en prod. Gap: smoke en vivo pendiente (sin backend levantado) |

### Context found

**KB del módulo (kb_refs: DEC-035, RULE-cd-014):**
- `sortablejs` ya es dependencia del mod (drag&drop). Bloqueo por prereqs lee `requirement(owner=activity)` (MC-03). Alerta informativa, no corrección automática (reunión 00:31:01).

**Necesidad/reuso (DET-32):** filtros = build (lógica de resaltado); drag&drop = **reuse** de `sortablejs` (la lógica cross-columna es nueva); checker de prereqs = build (lógica de dominio nueva, no existe en ningún componente).

**Supuesto/delta clave:** el requisito de **créditos mínimos NO alerta** (solo cursos y K-de-N) — reunión 00:29:22.

**⚠️ Reconciliación de scope (intake-explore, 2026-07-02):** la transcripción inline del pre-spec (arriba, "Pre-spec transcrito de MC-08.md") quedó **congelada al crear el ticket (2026-06-25) con solo 3 REQs**. La fuente autoritativa [`sp5/prespecs/MC-08.md`](../../../../uplanner/specs/up1/sp5/prespecs/MC-08.md) fue actualizada el 2026-07-01 (feedback de MC-06/TICKET-086) y hoy tiene **5 REQs / 11 TCs / 5 tasks**. El SPEC formal (design-feature) transcribe la fuente completa 1:1. Delta:
- **REQ-01** amplía: chips de líneas + **rollup de créditos por línea** (barra `{current}/{min} créd`, reemplaza la leyenda estática de MC-05) + chips de bloques electivos + limpiar.
- **REQ-03** amplía: DnD + "Agregar período" + **alerta informativa de discrepancia de conteo** vs `Curriculum.totalPeriods` (no bloqueante).
- **REQ-04 (nuevo, 🆂 Should):** chip de línea en la tarjeta (ícono + abreviación + color) + badge "electivo" a la **derecha**; exponer `icon`/abreviación en `CategoryVM`/`toCategoryVM`. Diferido explícitamente a MC-08 (no scope creep).
- **REQ-05 (nuevo, 🅼 Must/fix):** quitar el doble `+` del botón "Agregar asignatura" — sacar `+ ` del texto i18n (`buttons.addSubject`, 3 locales), conservar el ícono del atom `Button`.

**Restricción de arquitectura (DEC-038 / RULE-mods-051, del cierre de TICKET-085):** la lógica de dominio nueva va al **adapter** (`CurriculumMeshElement.vue` + `.ts` puros), NO a las primitivas de render (grid/columna/tarjeta-shell). Contenido de tarjeta por slot, acciones por evento/callback. Ningún identificador curricular en primitivas (verificable por grep). Tasks de UI (modal de bloqueo, DnD) exigen **tests de interacción**, no solo `.spec.ts` de lógica pura (DET-23 dim. testing).

**Mapa de código (researcher, evidencia `path:line`):**
- **Entry shape:** `MeshEntry` (`curriculumMesh.logic.ts:35-67`) tiene `categoryId` + `blockId`; `MeshCard` deriva `isElective`/`categoryColor` (`:87-90`). Columnas por `groupByPeriod()` (`:135-159`).
- **Categorías (líneas):** query `LIST_CATEGORIES` filtrada por `curriculumId` → `toCategoryVM()` (`useCurriculumMesh.ts:104-112`); hoy `CategoryVM` = `{id,name,color,minCredits}` (falta `icon`/abreviación → REQ-04). Leyenda estática placeholder marcada "filtros interactivos = MC-08" (`CurriculumMeshElement.vue:91`).
- **Add-flow (hook de REQ-02):** `onAddEntryConfirm()` (`CurriculumMeshElement.vue:866-892`) → `createObligatoriaEntries()`/`createElectivaEntries()`; el check pre-alta engancha antes de los loops de `CREATE_PLAN_ENTRY`.
- **Requirement (MC-03):** `objects/requirement.json` (`ownerType`, `recordType`) + `rt__RecordState__requirement.json` (`targetId`, `timing` Before/Concurrent/Either, `mustBe`) + `rt__Group__requirement.json` (`combinator`, `minToSatisfy` = K-de-N). Helper puro `logic/helpers/buildRequirementTree.js`. **La malla NO lo carga aún.**
- **period/position:** `planEntry.json` (índice `planId,period,position`); `nextPosition()` solo append (`curriculumMesh.logic.ts:304-309`) — falta recálculo de hermanos. Precedente cross-item: `computePositionUpdates()` (`CompositeSectionTree/buildPayloads.ts:93-97`).
- **Patrón `.logic.ts`+`.logic.spec.ts`:** p.ej. `groupByPeriod()` puro (`curriculumMesh.logic.ts:135-159`) testeado en `curriculumMesh.logic.spec.ts` y consumido solo por `computed()` (`CurriculumMeshElement.vue:333`). MC-08 sigue el patrón: `prereqCheck.logic.ts`, filtros/rollup en `.ts` puro, recálculo period/position en `.ts` puro.

## Pre-spec (transcrito de MC-08.md)

### Requisitos (REQ)

| REQ | Certeza | source_ref | Enunciado |
|-----|---------|-----------|-----------|
| REQ-01 · filtros de la malla (🆂) | confirmed | handoff MC-CMP-9 + reunión 00:01:30/00:03:22 | chips de líneas (desde requirementCategory) que resaltan/atenúan por categoryId + chips de bloques electivos (derivados de blockId presentes); botón limpiar. |
| REQ-02 · bloqueo por prerrequisitos al agregar (🅲) | confirmed | handoff MC-CMP-6 + reunión 00:29:22 | ver escenario; cursos y K-de-N alertan, créditos NO. |
| REQ-03 · drag&drop + agregar período (🅲) | confirmed | handoff MC-CMP-8 + reunión 00:36:38 | DnD entre columnas actualiza period y position (recalcula hermanos), persistido; botón "Agregar período". |

<details><summary>Escenario bloqueo (REQ-02)</summary>

```gherkin
WHEN agrego un curso y un prereq-curso (RecordState, timing Before) NO está en un período anterior
OR un Group(K-de-N de cursos) tiene cursos miembros ausentes de la malla
THEN se bloquea: modal lista los faltantes, ofrece solo Cancelar o Volver
GIVEN el requisito es MetricThreshold(Credits)
THEN NO dispara alerta (son créditos cursados, no ubicación)
GIVEN no faltan prereqs
THEN se completa el alta
```
</details>

### Tasks previstas (con rollback)

| # | Task | Rollback |
|---|------|----------|
| T1 | chips de líneas + bloques + lógica de resaltado (REQ-01) en `.ts` + `.spec.ts` | quitar filtros |
| T2 | checker de prereqs faltantes (cursos + K-de-N; excluye créditos) + modal de bloqueo (REQ-02) | revertir |
| T3 | drag&drop con `sortablejs` + recálculo period/position + "Agregar período" (REQ-03) | desactivar DnD |

### Dependencias

- **Depende de:** MC-05 (componente) + MC-03 (requirement, para prereqs) + MC-06 (electivos para los chips).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1267-sp5` en `mods/curriculum-design` (creada desde `develop`; mod-only; nunca `develop`/`main`) — RULE-dev-004 |
| Base branch | `develop` |
| DB state | UPU con MC-02/03/05/06 + seed (requirement owner=activity para prereqs) |
| Services | suite (storybook + render), object-manager (GraphQL del mod) |
| Test data | plan con prereqs (EST200 → MAT110) + bloques electivos |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | REQ-05 (doble `+` en "Agregar asignatura") ya estaba resuelto: un solo `Button icon="bi bi-plus-lg"` + `$t(addSubject)` sin `+` literal en los 3 locales. El reporte original venía de una versión previa del i18n. Verify-first (DET-32) evitó re-litigarlo. | developer S1.T1 | S1 | discarded | — |
| L2 | `icon`/`code` ya existen en `requirementCategory.json` desde MC-02 (comentario UPONE-1272) — REQ-04 fue solo mapeo FE (`CategoryVM`/`toCategoryVM`), sin tocar el objeto ni codegen/migrate. MC-07 no agregó un campo "short label" separado. | developer S1.T2 | S1 | discarded | — |
| L3 | El mod `curriculum-design` (y el monorepo `up1`) NO tiene config de ESLint (`eslint.config*`/`.eslintrc*` ausentes) — el gate de lint de DET-23 queda sin tooling que ejecutar. Candidato a backlog/rule del proyecto up1 (fuera de scope de MC-08). | developer S1 | S1 | refined | BUG-core-005 |
| L4 | Reconfirma MC-06 L4: el vitest del mod corre en `environment: node` sin `@vitejs/plugin-vue` → los `.vue` no se montan; la interacción real es un `should`-gap conocido (RULE-mods-051). Lógica testeable va a `.ts`+`.spec.ts`; `.vue` se cubre con stories + smoke. NO reconfigurar el vitest del mod. | developer S1.T3 | S1 | refined | RULE-mods-051 |
| L5 | `loadBlockOptions` solo se cargaba al abrir modales de alta/edición; los chips de bloques electivos (REQ-01) necesitan el nombre resuelto al ver la malla → se agregó `watch(entries)` que dispara la carga automática cuando hay entries electivas. Cambio de comportamiento acotado a lectura (sin mutación). | developer S2.T2 | S2 | discarded | — |
| L6 | El atom `Progress.vue` del layout no tiene stub en `tests/stubs/atoms.ts`; la barra de progreso del rollup se hizo con `div`/`span` + tokens `var(--up1-*)` (patrón `.cm-sumstat`). Si una task futura quiere `Progress`, agregar el stub primero. | developer S2.T2 | S2 | discarded | — |
| L7 | **Decisión de diseño (DEC-LOCAL):** el alta soporta lotes (`activityIds: string[]`); el checker de prereqs aplica **todo-o-nada** — si cualquier actividad del lote tiene faltantes, se bloquea el lote completo (cero mutations), consistente con el rollback B2 de `createElectivaEntries`. Alternativa descartada: bloquear solo las actividades problemáticas. Confirmar con el dev si el criterio esperado difiere. | developer S3.T2 | S3 | refined | DEC-054 |
| L8 | H6 confirmada por lectura del resolver real: `object-manager/src/graphql/resolvers/instance.resolver.js:1227` itera `processedFilters` genéricamente → AND sin tope. Referencia reusable para futuros composables con filtros EQUALS compuestos. | developer S3.T1 | S3 | discarded | — |
| L9 | `requirement.ownerId` es 1:1 por curso y `listInstances` no expone filtro `IN` → `checkPrereqsForBatch` hace N queries (una por actividad del lote). Aceptable en SP5; costo a vigilar si los lotes crecen. | developer S3.T1 | S3 | discarded | — |
| L10 | Convención de `position` bifurcada: `computePositionUpdates` (CompositeSectionTree) es 1-based; `nextPosition`/`groupByPeriod` (CurriculumMesh) son 0-based. `recalcPeriodPosition` siguió la convención local (0-based). Si un consumidor futuro cruza ambos módulos, normalizar explícitamente. | developer S4.T1 | S4 | refined | RULE-curriculum-design-041 |
| L11 | **"Agregar período" es solo de vista** (`viewExtraPeriods`, estado local, reset al cambiar de plan) — NO persiste `Curriculum.totalPeriods`. De ahí nace la alerta de discrepancia (estado de trabajo válido, REQ-03). Si el negocio espera que persista el totalPeriods, es un REQ adicional fuera del alcance de S4 → confirmar con el dev. | developer S4.T3 | S4 | refined | DEC-055 |
| L12 | Sortable multi-lista cross-container requiere `group` compartido (`'cm-periods'`); el precedente `CompositeSectionTree` es single-list (sin `group`), así que el patrón se adaptó de la doc de sortablejs. Smoke real del DnD no ejercitable en el vitest node-env ni en story (necesita DOM+eventos de puntero) → gap conocido, smoke manual contra backend antes de dar REQ-03 por cerrado en ambiente real. | developer S4.T2 | S4 | discarded | — |
| L14 | La malla y "líneas de formación" son **tabs de un mismo Vueform siempre montado** (`v-show`, sin `<keep-alive>`) + editar categoría = **modal apilado** sobre esa vista → `CurriculumMeshElement` nunca se desmonta/reactiva. Por eso editar color/ícono de una categoría no se refleja al volver, y `onActivated` NO es viable (no hay ciclo activate/deactivate). Solución mod-only: **botón manual "Actualizar"** → `refetch()`. Reactividad instantánea (cache Apollo normalizada / event bus) quedaría como mejora futura (toca suite/otro mod). | orquestador (investigación) + dev | S5 | refined | RULE-curriculum-design-042 |
| L13 | **Unit-verificado ≠ integración-correcta** (hallado en smoke del dev, S5): el fix W5 dejó `addPeriod` como delta (`viewExtraPeriods += 1`) pero `groupByPeriod` usaba el 4º param como conteo absoluto (`max(totalPeriods, …, delta)`) → clic en "Agregar período" no agregaba columna. El re-judge aislado verificó que `addPeriod` incrementa y la lógica pura, pero NADIE renderizó el resultado (node-env no monta `.vue`). Refuerza RULE de verificar el render real, no solo config+unit. Mitiga: smoke visual obligatorio para features UI antes de cerrar; o test de integración del `columns` computed. | dev (smoke) + orquestador | S5 | refined | DET-36 |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-07-02 | (nuevo ticket) → super | dev trigger `super autopilot` al tomar el ticket | intake |

### Plan de sessions (preplanificacion)

4 sessions previstas. **Esqueleto producido por `intake-explore`.** El detalle final (tasks asignadas, gate criteria específicos) lo completa `design-feature` al generar el spec. Cada session puede subdividirse o colapsarse durante execute si el tamaño real difiere.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Presentación de tarjeta + fix rápido: REQ-05 (doble `+`) + REQ-04 (chip de línea icon+abrev+color, badge electivo a la derecha, `CategoryVM.icon`/abrev) | F2 | T2 | T5 + T4 | auto | REQ-05/04 con `.spec.ts` (CategoryVM) + tests de interacción (posición badge, chip render); TC-06/07/11 verde |
| S2 | Filtros de la malla: REQ-01 chips de líneas + chips de bloques electivos + resaltado/atenuado + rollup de créditos por línea + limpiar | F2 | T2 | T1 | auto | lógica de filtro/rollup en `.ts` puro + `.spec.ts`; TC-01/08 verde; filtros no mutan (read-only) |
| S3 | Bloqueo por prerrequisitos: composable `usePrereqRequirements` (query `requirement` owner=activity) + `prereqCheck.logic.ts` (RecordState Before + Group K-de-N; excluye MetricThreshold) + modal casero de faltantes (Cancelar/Volver) | F2 | T3 | T2 | ⚑ fuerte | valida H6 (query triple-EQUALS) como primera task; `prereqCheck.logic.ts` + `.spec.ts` (TC-02/03/04) + test de interacción del modal; smoke UI (bloqueo real) |
| S4 | Drag&drop + períodos: DnD cross-column con `sortablejs` (multi-list) + recálculo `period`/`position` (source+dest) + persistencia (`UPDATE_PLAN_ENTRY`) + botón "Agregar período" + alerta de discrepancia vs `totalPeriods` | F2 | T3 | T3 | ⚑ fuerte | recálculo en `.ts` puro + `.spec.ts` (TC-05) + alerta (TC-09/10) + test de interacción DnD; smoke UI (mover tarjeta, persiste) |

**Notas del esqueleto:**
- **Numeración continua** (DET-20): no hay `### Session N` previa → el plan arranca en S1.
- **Dependencias entre sessions:** S1/S2 comparten `CategoryVM`/líneas (S1 expone `icon`/abrev, S2 lo consume en chips) → S1 antes de S2. S3 y S4 son independientes entre sí (prereqs vs DnD) pero ambas dependen del componente base (MC-05, ya closed).
- **Riesgos:** S3 (lógica de dominio nueva, sin precedente de evaluación — degree-audit es SP6) y S4 (cross-container Sortable sin precedente local, solo single-list en `CompositeSectionTree`) son los gates ⚑ fuerte → tier T3 con smoke UI. H5/H6 (`~ inferred`) se validan empíricamente en S2/S3.
- **Tier:** REQ-05 aislado sería T1, pero se agrupa con REQ-04 (T2) en S1 por cohesión (ambos tocan presentación de tarjeta/líneas).

### Session 1 — 2026-07-02 — Presentacion de tarjeta + fix [phase: execute]

**Tipo**: auto
**Validation tier**: T2

**Tasks completadas**:
- [x] S1.T1 — REQ-05 verify-first: reproducir el render del boton "Agregar asignatura"; si no hay doble `+`, marcar resuelto (DET-32 drop); si persiste, corregir conservando el icono
- [x] S1.T2 — Exponer `icon`+abreviacion en `CategoryVM`/`toCategoryVM` (`useCurriculumMesh.ts`) + `.spec.ts` (REQ-04)
- [x] S1.T3 — Chip de linea en la tarjeta (icono+abreviacion+color) + badge electivo a la derecha + test interaccion TC-06/07 (REQ-04)
- [x] S1.GATE — Gate de sync Session 1 (tier T2): persistir, validar, decidir continue/iterate/escalate

**Objetivo**: Fix verify-first del doble `+` (REQ-05) + presentación de tarjeta (REQ-04): exponer `icon`/abreviación en `CategoryVM`, chip de línea en la tarjeta y badge electivo a la derecha.

**Validación del tier (T2)**: `npx vitest run` en el mod → **66 archivos, 1146 tests pass, 0 fail** (developer). Re-corrido independiente (DET-33): `curriculumMesh.logic.spec.ts` 74 + `useCurriculumMesh.spec.ts` 9 = 83 pass. `vue-tsc --noEmit`: 0 errores en archivos tocados (preexistentes en `molecules/*` ajenos, confirmado por `git diff --stat`). ESLint: sin config en el mod ni monorepo (L3) — gate de lint sin tooling.

**Archivos**: `curriculumMesh.logic.ts` (+`resolveCategoryIcon`/`resolveCategoryCode`/`findCategory`), `useCurriculumMesh.ts` (`toCategoryVM` mapea icon/code), `CurriculumMeshElement.vue` (chip de línea + `.cm-pe__badges` + badge a la derecha), `curriculumMesh.logic.spec.ts` (+5), `useCurriculumMesh.spec.ts` (+2), `CurriculumMesh.stories.ts` (story `TarjetaConLineaYElectivo`). REQ-05: sin cambios (ya resuelto).

**Quality review (DET-23)** — reviewer LLM aislado (read-only), tier standard (T2). **Resultado global: approve**.

| # | Dimensión | Resultado | Nota |
|---|-----------|-----------|------|
| 1 | Spec compliance (REQ-04/05) | pass | REQ-05 ya resuelto (commit previo `2f42565`), sin tocar; REQ-04 completo (chip via Badge, badge a la derecha, sin categoryId→sin chip) |
| 2 | Rules (RULE-cd-014, mods-051, colores) | pass | lógica en `.ts`; reusa atom `Badge`; sin colores hardcodeados en el componente (solo `customColor` prop) |
| 3 | Type safety | pass | sin `any`; `string\|undefined` consistente con `resolveCategoryColor`; vue-tsc 0 nuevos |
| 4 | Testing | pass | asserts con valores concretos (`bi-bookmark-star-fill`, `NUC`); cubre sin-categoryId; mordería si el mapeo se rompe |
| 5 | Mantenibilidad | pass | `findCategory` extraído (dedup de `categories.find`) — cleanup neto |
| 6 | Reuso | pass | mismo atom `Badge`; `findCategory` centraliza lookup |
| 7 | Accesibilidad | warn | chip siempre con texto (no icon-only) OK; `Badge.vue` sin `aria-hidden` en `<i>` = **gap preexistente del atom CORE**, fuera de scope |
| 8 | Error handling / null-safety | pass | early-return en `findCategory`; `\|\| undefined` normaliza vacíos |
| 9 | Consistencia | pass | espeja `resolveCategoryColor`; convención `bi bi-*` |
| 10 | Story coverage | warn | story no renderiza el caso "sin chip" que el docblock declara — gap de doc (lógica sí cubierta en unit) → backlog `could` |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Follow-ups (no bloqueantes)**: (a) agregar 4ª tarjeta sin línea ni electivo a la story `TarjetaConLineaYElectivo` → backlog `could`; (b) `aria-hidden="true"` en `<i>` de `Badge.vue` (CORE `layout/`, fuera de scope MC-08) → backlog local, NO Jira.

### Session 2 — 2026-07-02 — Filtros de la malla [phase: execute]

**Tipo**: auto
**Validation tier**: T2

**Tasks completadas**:
- [x] S2.T1 — `curriculumMeshFilters.logic.ts` puro (resaltado por categoryId + chips electivos + rollup de creditos) + `.spec.ts` TC-01/08 (REQ-01)
- [x] S2.T2 — Barra de filtros en `CurriculumMeshElement.vue` (chips linea+rollup, chips electivos, Limpiar, resaltado/atenuado) + test interaccion (REQ-01)
- [x] S2.T3 — Validar H5 (filtros read-only, sin gating `canEdit`) + evidencia (REQ-01)
- [x] S2.GATE — Gate de sync Session 2 (tier T2): persistir, validar, decidir continue/iterate/escalate

**Objetivo**: REQ-01 filtros de la malla — chips de líneas (con rollup de créditos + barra), chips de bloques electivos, botón Limpiar, resaltado/atenuado. Validar H5 (read-only).

**Validación del tier (T2)**: `npx vitest run` → **67 archivos, 1157 tests pass, 0 fail**. Re-corrido independiente (DET-33): `curriculumMeshFilters.logic.spec.ts` 11/11. `vue-tsc`: 0 errores en tocados (~70 preexistentes ajenos). H5 confirmada (filtros sin gating `canEdit`).

**Archivos**: `curriculumMeshFilters.logic.ts` (nuevo: `filterHighlight`/`deriveElectiveBlockChips`/`creditRollupByCategory`/`creditRollupRatio`), `curriculumMeshFilters.logic.spec.ts` (nuevo, 11 tests), `CurriculumMeshElement.vue` (barra `.cm-filters`, `.cm-pe--dimmed`, `watch(entries)`), `CurriculumMesh.stories.ts` (`BarraDeFiltrosInteractiva`), `lang/{es_CL,en_CL,pt_BR}.json` (labels de filtros).

**Quality review (DET-23)** — reviewer LLM aislado, tier standard (T2). **Resultado global: approve**. Destacado: tests verificados por mutation testing (TC-01 unión / TC-08 suma de créditos rompen la suite si se altera la lógica → muerden). Seam DEC-038 respetado (lógica en `.ts`). i18n en 3 locales. Type safety limpia.

**Follow-up (no bloqueante)**: `watch(entries)` con `listBlocks()` persistentemente vacío podría refetch redundante (no catastrófico) → chip de follow-up generado por el reviewer. Backlog `could`.

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-07-02 — Prerrequisitos [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Tasks completadas**:
- [x] S3.T1 — Validar H6 (query `requirement` triple-EQUALS) + `usePrereqRequirements.ts` (patron `useBlockOptions`) + `.spec.ts` (REQ-02)
- [x] S3.T2 — `prereqCheck.logic.ts` puro (RecordState Before/Either + Group K-de-N; excluye MetricThreshold) + `.spec.ts` TC-02/03/04 (REQ-02)
- [x] S3.T3 — Modal casero de bloqueo (atomo Modal, Cancelar/Volver) + hook en `onAddEntryConfirm()` + test interaccion + smoke UI (REQ-02)
- [x] S3.GATE — Gate de sync Session 3 (tier T3, ⚑ fuerte): persistir, validar, decidir continue/iterate/escalate

**Objetivo**: REQ-02 bloqueo por prerrequisitos al agregar — composable `usePrereqRequirements` + `prereqCheck.logic.ts` (estructural, H2) + modal casero de faltantes (Cancelar/Volver). MetricThreshold NO alerta (DEC-035).

**Validación del tier (T3, ⚑ fuerte)**: `npx vitest run` → **69 archivos, 1196 tests pass, 0 fail** (post-fix del dual-judge). Re-corrido independiente (DET-33): `prereqCheck.logic.spec.ts` 21 + `usePrereqRequirements.spec.ts` 10. `vue-tsc`: 0 errores introducidos (75 preexistentes ajenos). H6 confirmada por lectura del resolver (`instance.resolver.js:1227`). Smoke UI en vivo (backend) = gap conocido documentado (igual que MC-06).

**Archivos**: `usePrereqRequirements.ts` (nuevo, query `requirement` owner=activity + normalizador que excluye MetricThreshold), `prereqCheck.logic.ts` (nuevo, `findMissingPrereqs`/`findMissingPrereqsForBatch` + `labelResolver`), `PrereqBlockModal.ts` (nuevo, Modal casero, Cancelar/Volver), `CurriculumMeshElement.vue` (hook en `onAddEntryConfirm` con `activityIdsToCheck` + abort antes de mutations + `activityLabelById`), `*.spec.ts` (26+ tests), `lang/{es_CL,en_CL,pt_BR}.json` (`prereqBlock.*`), `CurriculumMesh.stories.ts` (`PrereqBlockModalFaltantes`).

**Quality review (DET-23 + DET-35 dual-judge, T3)** — 2 jueces ciegos en paralelo. **Contradicción**: Juez A `approve` (solo INFO); Juez B `iterate` con 2 WARNINGs reales que A no vio:
- **W1**: `onAddEntryConfirm` chequeaba la selección completa en vez de `toAdd` en edición de bloque electivo existente → podía bloquear un alta legítima por miembros ya colocados.
- **W2**: el modal mostraba el `activityId` crudo (UUID) en vez del código legible del curso (enmascarado por fixtures del test).

**Loop adversarial (DET-35)**: ambos WARNINGs verificados por el orquestador (DET-33), fix quirúrgico aplicado (`labelResolver` resuelve desde el catálogo `allActivityItems`; `activityIdsToCheck = diffBlockSelection(...).toAdd` para elec), test que muerde (id ≠ label). **Re-judge → approve**, sin regresión, 1196 tests. **Veredicto final: approve** (1 iteración de fix, dentro del tope DET-35).

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 4 — 2026-07-02 — Drag&drop + periodos [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Tasks completadas**:
- [x] S4.T1 — `recalcPeriodPosition.logic.ts` puro (recalculo position hermanos origen+destino; patron `computePositionUpdates`) + `.spec.ts` TC-05 (REQ-03)
- [x] S4.T2 — Wiring `sortablejs` multi-list cross-column + persistencia `UPDATE_PLAN_ENTRY` (loop por hermano) + test interaccion (REQ-03)
- [x] S4.T3 — Boton "Agregar periodo" + alerta de discrepancia vs `totalPeriods` + `.spec.ts` TC-09/10 + smoke UI (REQ-03)
- [x] S4.GATE — Gate de sync Session 4 (tier T3, ⚑ fuerte): persistir, validar, decidir continue/iterate/escalate

**Objetivo**: REQ-03 drag&drop cross-column con `sortablejs` (recálculo period/position persistido) + botón "Agregar período" + alerta de discrepancia vs `totalPeriods`.

**Validación del tier (T3, ⚑ fuerte)**: `npx vitest run` → **70 archivos, 1212 tests pass, 0 fail** (post-fix dual-judge). Re-corrido independiente (DET-33): `recalcPeriodPosition.logic.spec.ts` 7 + `curriculumMesh.logic.spec.ts` 91. `vue-tsc`: 0 errores introducidos. Smoke DnD real (DOM+eventos de puntero+backend) = gap conocido documentado.

**Archivos**: `recalcPeriodPosition.logic.ts` (nuevo, recálculo puro origen+destino 0-based) + `.spec.ts`, `CurriculumMeshElement.vue` (Sortable multi-list group `cm-periods`, `onDragEnd`→recalc→persist loop `UPDATE_PLAN_ENTRY`, lock durante mutación, addPeriod/removePeriod), `curriculumMesh.logic.ts` (`computePeriodCountDiscrepancy`, `canRemoveTrailingPeriod`, `groupByPeriod` viewPeriodCount) + `.spec.ts`, `lang/{es_CL,en_CL,pt_BR}.json`, `CurriculumMesh.stories.ts`.

**Quality review (DET-23 + DET-35 dual-judge, T3)** — 2 jueces ciegos. **Ambos iterate, hallazgos distintos y reales**:
- **Juez A**: off-by-one — `onDragEnd` usaba `evt.newIndex` (índice DOM sin filtrar, cuenta el header `.cm-colh`) → tarjetas soltadas al inicio de columna caían un slot más allá. **Bug de correctitud del happy-path.**
- **Juez B**: W1 (drag concurrente durante mutación in-flight → posible corrupción de position), W3 (persist loop sin rollback en fallo parcial), W5 ("Agregar período" sin undo, apila columnas).

**Loop adversarial (DET-35)**: los 5 hallazgos verificados por el orquestador (DET-33), fix quirúrgico: `newDraggableIndex`/`oldDraggableIndex` (cards-only), lock `disabled` de todas las instancias Sortable durante persist (re-enable en `finally`), `addPeriod` determinista (`+= 1`) + `removePeriod`/`canRemoveTrailingPeriod` (solo columna trailing vacía), refetch+error en persist parcial. **Re-judge → approve**, sin regresión, 1212 tests. **Veredicto final: approve** (1 iteración de fix, dentro del tope DET-35).

**Backlog (no bloqueante)**: W3 — persistencia atómica multi-entry (batch mutation) requiere soporte de backend, fuera del scope mod → backlog `could`. Smoke UI real del DnD contra backend antes de dar REQ-03 (Could) por cerrado en ambiente productivo.

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 5
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 5 — 2026-07-02 — Fixes de smoke (3 defectos de UI) [phase: execute]

**Tipo**: auto
**Validation tier**: T2 (unit + verificación visual del dev pendiente)

**Objetivo**: corregir 3 defectos hallados por el dev en el smoke manual de MC-08 (los que el vitest node-env no podía cazar).

**Tasks completadas**:
- [x] S5.T1 — FIX #3 "Agregar/Quitar período" no agregaba columna: `groupByPeriod` usaba el 4º param como conteo absoluto pero `addPeriod` lo pasa como delta → `columnCount = max(totalPeriods, maxEntryPeriod, 0) + extraPeriods` + specs (semántica delta)
- [x] S5.T2 — FIX #2 DnD: el hueco caía debajo de "+ Asignatura" → Sortable sobre nueva lista interna `.cm-col-list` (header y +Asignatura fuera); placeholder visible (borde punteado + fondo de acento)
- [x] S5.T3 — FIX #1 chips de líneas apilados a la izquierda → `.cm-fchip { flex: 1 1 140px }` (distribuyen el ancho)
- [x] S5.GATE — Gate de sync Session 5 (tier T2): persistir, validar, decidir; smoke visual del dev como verificación final

**Validación del tier (T2)**: `npx vitest run` → **70 archivos, 1213 tests pass, 0 fail**. Re-corrido independiente (DET-33): `curriculumMesh.logic.spec.ts` 92/92 (incluye tests delta de `extraPeriods`). `vue-tsc`: 0 errores introducidos. Estructura verificada: `.cm-col-list` envuelve solo `.cm-pe` (ref de Sortable movido ahí; `.cm-add` afuera → `filter` removido con seguridad); `groupByPeriod` = `max(...) + extraPeriods`; `.cm-fchip flex 1 1 140px`; ghost punteado con color.

**Archivos**: `curriculumMesh.logic.ts` (groupByPeriod delta), `CurriculumMeshElement.vue` (`.cm-col-list` + ghost CSS + chips flex), `curriculumMesh.logic.spec.ts`. Commits `UPONE-1351-S5` (fix + test).

**Fixes (3, hallados en smoke manual del dev):**
- **#1** chips de línea apilados a la izquierda → `flex: 1 1 140px` (ocupan el ancho).
- **#2** el hueco del drag caía debajo de "+ Asignatura" → Sortable sobre `.cm-col-list` (header/+Asignatura fuera); placeholder visible (borde punteado + fondo de acento).
- **#3** "Agregar/Quitar período" no agregaba columna → `groupByPeriod` delta (`+ extraPeriods`). **Bug de integración** (L13): el fix W5 (S4) lo dejó como delta pero la función lo leía absoluto; unit + re-judge aislado no lo cazaron (node-env no renderiza).

**Iteración (2do smoke del dev, S5):** 2 defectos más, corregidos (commit `UPONE-1351-S5 fix … flash + chips compactos`):
- **Flash post-drop:** `onDragEnd` hacía `refetch()` en éxito → prendía el `loading` de Apollo → `v-if="loading"` blanqueaba toda la malla. Fix: update optimista local (`applyLocalPositionUpdates`), sin refetch en éxito (solo en `catch`). `entries` es un `ref` plano escribible del composable → reasignación segura.
- **Chips voluminosos:** estaban `flex-direction: column` (apilados, altos). Fix: `.cm-fchip__head` horizontal (ícono+nombre izq, créditos der `margin-left:auto`) + barra fina full-width debajo; padding reducido, `min-width` 120, nombre con ellipsis. Compacto como la maqueta.

**Iteración 3 (3er smoke, S5):** bug — agregar una asignatura al último período creaba otro período fantasma. Causa: mi fix #3 dejó `groupByPeriod` sumando delta (`max(totalPeriods, maxEntryPeriod) + extraPeriods`) → al llenar el período extra, `maxEntryPeriod` crecía Y el delta seguía sumando. Fix: **modelo absoluto** `columnCount = max(maxEntryPeriod, viewPeriodCount || totalPeriods)` (rename `viewExtraPeriods`→`viewPeriodCount`; `addPeriod` fija target=`columns.length+1`; `removePeriod` solo si última vacía). +test de regresión. **Respuesta a la pregunta del dev:** quitar un período con asignaturas es imposible — `canRemoveTrailingPeriod` oculta el botón si la última columna tiene entries (sin pérdida de datos).

**Decisión del gate (S5):** `standby` → **`continue`/close (2026-07-02)** — el dev corrió el smoke y **aceptó** los fixes de S5 (chips compactos, sin flash post-drop, hueco de drag arriba del +, conteo de períodos absoluto, botón "Actualizar"), e instruyó cerrar el ticket. Delta de MC-08 que excede el scope original (paridad MCP de prereqs/mover/períodos/opciones-legibles) **derivado a [TICKET-099](TICKET-099.md)** (REQ-07..11) + gap MD §6. teach-close.html cubre S1–S4; S5 documentada en este bloque + Learns L13/L14.

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 6
- [ ] iterate → re-trabajar Session 5
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 | TC-01 | unit (.spec.ts) | pending |
| REQ-02 | TC-02, TC-03, TC-04 | unit | pending |
| REQ-03 | TC-05 | unit | pending |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-01 | clic en chip de la línea "Núcleo" | REQ-01 | unit | seed | filtrar | tarjetas de Núcleo resaltadas, resto atenuado | `filterHighlight` devuelve `highlightedIds={nucleo-1,nucleo-2}`; resto queda `cm-pe--dimmed` | `curriculumMeshFilters.logic.spec.ts` TC-01 (asserts set concreto) + story `BarraDeFiltrosInteractiva` | ✅ pass — S2 |
| TC-08 | línea "Núcleo" con 12 créd asignados y min 180 | REQ-01 | unit | seed | render chip | chip muestra "12/180 créd" + barra proporcional | `creditRollupByCategory` → `{current:12,min:180}`; `creditRollupRatio`=12/180 | `curriculumMeshFilters.logic.spec.ts` TC-08 (valores concretos) + story rollup real | ✅ pass — S2 |
| TC-02 | agregar EST200 (prereq MAT110) sin MAT110 antes | REQ-02 | unit | requirement seed | agregar | bloqueado; modal lista MAT110 | `findMissingPrereqs` retorna MAT110 (RecordState Before no colocado en período anterior); `onAddEntryConfirm` abre modal y `return` antes de mutations | `prereqCheck.logic.spec.ts` TC-02 (16 tests) + hook `CurriculumMeshElement.vue:1082-1085` | ✅ pass — S3 |
| TC-03 | agregar curso cuyo único requisito es MetricThreshold(≥60 cr) | REQ-02 | unit | requirement seed | agregar | NO bloquea | MetricThreshold excluido al normalizar (`usePrereqRequirements`) → `findMissingPrereqs` retorna `[]` | `prereqCheck.logic.spec.ts` TC-03 | ✅ pass — S3 |
| TC-04 | agregar EST200 con MAT110 en período anterior | REQ-02 | unit | MAT110 colocado | agregar | se completa | MAT110 en período estrictamente anterior → `[]`, alta procede | `prereqCheck.logic.spec.ts` TC-04 | ✅ pass — S3 |
| TC-05 | arrastrar tarjeta del período 2 al 1 | REQ-03 | unit | 2 períodos | DnD | period=1, position recalculada, persistido | `recalcPeriodPosition` retorna updates concretos (destino+origen reindexados 0-based, filtra sin cambios); onEnd persiste cada uno vía `UPDATE_PLAN_ENTRY` | `recalcPeriodPosition.logic.spec.ts` TC-05 (array concreto) + wiring Sortable `CurriculumMeshElement.vue:548-560`. Smoke DnD real = gap conocido (node-env) | ✅ pass (unit) — S4 |
| TC-09 | plan `totalPeriods=10`, agregar un período (11) | REQ-03 | unit | plan seed | agregar período | alerta "11 · configurado 10"; edición sigue (no bloquea) | `computePeriodCountDiscrepancy(11,10)` → `{hasDiscrepancy:true,actualPeriods:11,totalPeriods:10}`; alerta `variant=info` no bloqueante | `curriculumMesh.logic.spec.ts` TC-09 | ✅ pass — S4 |
| TC-10 | volver a 10 períodos (coincide) | REQ-03 | unit | plan seed | quitar período | la alerta desaparece | `computePeriodCountDiscrepancy(10,10)` → `{hasDiscrepancy:false}` | `curriculumMesh.logic.spec.ts` TC-10 | ✅ pass — S4 |
| TC-06 | tarjeta con línea "Núcleo" (icon bi-*, code NUC) | REQ-04 | unit+story | seed | render | chip ícono+"NUC" coloreado; borde con color de línea | chip via atom `Badge` (`customColor`); `resolveCategoryIcon`/`resolveCategoryCode`/`toCard` con valores concretos (`bi-bookmark-star-fill`, `NUC`) | `curriculumMesh.logic.spec.ts` (5 tests nuevos) + story `TarjetaConLineaYElectivo` | ✅ pass (interacción `.vue` = should-gap, cubierta por story + smoke) — S1 |
| TC-07 | tarjeta electiva | REQ-04 | unit+story | seed | render | badge "electivo" a la derecha | `.cm-pe__elective { margin-left:auto }` en flex row `.cm-pe__badges` | `CurriculumMeshElement.vue` + story `TarjetaConLineaYElectivo` | ✅ pass — S1 |
| TC-11 | render del botón de alta por período | REQ-05 | inspección | — | render | un solo `+` (ícono del Button); texto sin `+` | único `Button icon="bi bi-plus-lg"` + `$t(addSubject)` sin `+`; i18n 3 locales sin literal `+` | `CurriculumMeshElement.vue:146-155` + `lang/{es_CL,en_CL,pt_BR}.json` | ✅ pass — ya resuelto (verify-first, DET-32 drop) — S1 |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| spec FE | `npx vitest run` (mod) | ~1146 pass (pre-MC-08) | 1212 pass / 0 fail (70 files) | +66 tests (specs nuevos S1-S4); 0 regresiones. `vue-tsc`: 0 errores introducidos (75 preexistentes ajenos) |

## Summary

**MC-08 (UPONE-1351) — Malla: filtros + interacciones avanzadas.** Feature mod-only (`curriculum-design`) sobre el componente `CurriculumMesh` (MC-05). Entregado en 4 sessions, 12 tasks, 8 commits `UPONE-1351-S{1..4}` en `UPONE-1267-sp5` (mod branch; **push pendiente** — requiere revisión del team up1, RULE-dev-004).

**Qué se entregó (5 REQs, todos cumplidos):**
- **REQ-01 (Should)** filtros: chips de líneas de formación (resaltar/atenuar por `categoryId`) + **rollup de créditos por línea** (`{current}/{min}` + barra) + chips de bloques electivos + Limpiar. Lógica pura en `curriculumMeshFilters.logic.ts`.
- **REQ-02 (Could)** bloqueo por prerrequisitos al agregar: `usePrereqRequirements` (query `requirement` owner=activity) + `prereqCheck.logic.ts` (check **estructural** — RecordState Before/Either + Group K-de-N; **MetricThreshold NO alerta**, DEC-035) + modal casero (Cancelar/Volver) que aborta antes de mutar.
- **REQ-03 (Could)** drag&drop cross-column con `sortablejs` (recálculo `period`/`position` persistido vía `UPDATE_PLAN_ENTRY`) + "Agregar/Quitar período" + alerta no bloqueante de discrepancia vs `Curriculum.totalPeriods`.
- **REQ-04 (Should)** chip de línea en la tarjeta (ícono+abreviación+color) + badge electivo a la derecha; `CategoryVM` expone `icon`/`code`.
- **REQ-05 (Must/fix)** doble `+`: **verify-first → ya resuelto** en MC-06 (commit `2f42565`), sin cambio (DET-32 drop).

**Calidad:** 1212/1212 tests (66 nuevos), 0 regresiones, `vue-tsc` sin errores introducidos. Quality review por sesión (DET-23); las 2 sesiones T3 (prereqs, DnD) pasaron por **dual-judge (DET-35)** que detectó y corrigió **5 bugs reales** (labels crudos en el modal, scope del check vs `toAdd`, off-by-one de índice DnD, race de drag concurrente, "Agregar período" sin undo) — todos verificados y re-juzgados a `approve`. Cierre reforzado aislado: `approve`.

**Reconciliación de scope:** la transcripción inline del ticket estaba congelada en 3 REQs; el spec formal siguió la fuente autoritativa `MC-08.md` (5 REQs / 11 TCs). `execute_scope` ampliado a `lang/` (i18n declarativa).

**Gaps/backlog conocidos (no bloquean cierre; REQ-02/03 son Could):**
- Smoke UI real (DnD con eventos de puntero + prereqs contra backend) — no ejercitable en vitest node-env; **smoke manual pendiente** antes de dar por cerrado en ambiente productivo.
- W3: persistencia atómica multi-entry (batch mutation) requiere soporte de backend → backlog `could`.
- "Agregar período" es solo-vista (no persiste `totalPeriods`) — de ahí la alerta; confirmar con el dev si se espera persistencia (L11).
- Batch alta = todo-o-nada (L7, DEC-LOCAL) — confirmar criterio con el dev.
- Menores: story sin caso "sin chip"; `aria-hidden` en atom `Badge` (CORE `layout/`, fuera de scope); mod `up1` sin ESLint config (L3).

**Learns:** 12 capturados (ver tabla Learns). Educativo: teach-intake.html + teach-close.html (v2, validados).
