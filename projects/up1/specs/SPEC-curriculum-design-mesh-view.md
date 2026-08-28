---
id: SPEC-curriculum-design-mesh-view
project: up1
ticket: TICKET-085
status: done
---

# Malla curricular — vista por período, resumen y gating de edición (MC-05)

# Malla curricular — vista por período, resumen y gating de edición (MC-05)

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico vive en Requirements / Artifacts / Tasks.*

**Que se quiere**: hoy la pestaña "Malla curricular" del detalle de un Plan (creada en TICKET-093) muestra una **tabla plana** de `planEntry`. Queremos reemplazarla por la **vista visual de malla**: asignaturas en columnas por período, tarjetas con código/créditos/color de línea/badge electivo, una barra de resumen del plan arriba, y las acciones de edición visibles sólo cuando el plan es editable (`status = Draft`). Es la vista base sobre la que MC-06 (alta/edición) y MC-08 (filtros) construyen. **100% mod-only, sólo lectura de datos** (no crea modelo, no toca core).

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Componente full-page **nuevo** `CurriculumMeshElement.vue` (Vueform `defineElement`), calcando el patrón `CompositeSectionTree` (no reusándolo: es un árbol, no un grid por período) | RULE-curriculum-design-014: se autora en el mod, lógica pura a `.ts`, modales caseros. El grid por período no existe como componente. |
| 2 | La pestaña "Malla curricular" **cambia su elemento** de `record-list` → el nuevo element; se agrega acción "Malla curricular" en `default_Curriculum_list.json` que navega a la pestaña | REQ-02: la pestaña ya existe (TICKET-093). MC-05 swap del contenido + acción de listado. Sin layoutType nuevo en core (auditoría §1.6). |
| 3 | El badge "electivo" se **deriva** de `blockId != null`; el color de línea sale de `requirementCategory.color`; el gating usa `Curriculum.status === 'Draft'` (enum `["Draft","Active","Archived"]`) | Sin campos nuevos: todo derivado de datos existentes de MC-02. `Draft` es el único estado editable. |

**Riesgos principales y como los mitigamos**:

- **Runtime DB-gated** (los layouts se aplican con `npm run sync` sobre la DB del tenant) → la verificación de código es JSON válido + suite del mod sin regresión + `.spec.ts` de la lógica pura; el smoke visual lo corre el dev tras el sync (precedente MC-02 S3 / TICKET-093).
- **Acoplar el componente a nombres de campo de RTs** (heurística por nombre) → la lógica recibe **specs explícitas tipadas** (props), no detecta por nombre (checklist de calidad §5, T-010 C2).
- **Swap del element rompe el embedding existente** → el element recibe `planId={{parentId}}` igual que el `record-list` actual; se preserva el filtro; smoke DB-gated del dev.

**Que NO se hace en este ticket** (límites explícitos):

- Alta/edición de asignaturas (drag&drop, modal de catálogo) → **MC-06**.
- Filtros interactivos por línea de formación / electivos → **MC-08** (acá las líneas son **leyenda estática**).
- Validación de prerrequisitos / banners de "prereqs no ubicados" → MC-08/MC-09.
- Registrar un `layoutType` nuevo en core → fuera de alcance (frontera mod-only).

**Tamano estimado**: 2 sessions ejecutables (S1 lógica+componente+resumen, S2 entrypoints+gating+stories), ~4-5h efectivas. La más riesgosa es S2 (toca config DB-gated + gating user-facing).

**Como vas a saber que funciona**:

- Tras `npm run sync`, abro el detalle de un Plan → pestaña "Malla curricular" → veo columnas por período con tarjetas (no una tabla).
- La barra de resumen muestra créditos diseño/req, períodos, asignaturas, carga máx/período.
- En un plan `Draft` con modo edición veo las acciones de alta; en `Active`/`Archived` no aparecen.
- `npm test` del mod: la lógica pura (`curriculumMesh.logic.spec.ts`) pasa TC-01..05; la suite del mod no regresiona.

---

## Purpose

Reemplazar el contenido de la pestaña "Malla curricular" del detalle del Currículo (Plan) por un componente full-page del mod que renderiza la malla por período (sólo lectura), una barra de resumen del plan, y gating de las acciones de edición por `Curriculum.status`. Mod-only, capa `modsComponents/` + config de layouts; consume `planEntry`/`requirementCategory`/`Curriculum` ya existentes (MC-02). Habilita MC-06 y MC-08.

## Requirements

### REQ-01: Ver la malla por período (sólo lectura)

> **Que cambia**: la pestaña "Malla curricular" deja de ser una tabla y muestra las asignaturas en columnas por semestre, con tarjetas (código, créditos, color de línea, badge "electivo").
> **Por que**: es la vista base del diseño del plan; la tabla plana no comunica la estructura por período.

El sistema MUST renderizar, en la pestaña "Malla curricular", las `planEntry` del plan agrupadas en columnas por `period`. Cada tarjeta MUST mostrar el código y créditos de la asignatura, el color de su línea de formación (`requirementCategory.color`) y un badge "electivo" cuando `blockId != null`. El número de columnas MUST derivarse de `totalPeriods` del Currículo.

**Actor**: diseñador curricular
**Layers**: frontend (modsComponents del mod)

<details><summary>Scenarios de validacion</summary>

#### Scenario: agrupación por período (éxito)
- **GIVEN** un plan con `planEntry` en los períodos 1 y 2
- **WHEN** se renderiza la malla
- **THEN** se ven 2 columnas, cada una con las tarjetas de su período

#### Scenario: badge electivo derivado
- **GIVEN** un `planEntry` con `blockId != null`
- **WHEN** se renderiza su tarjeta
- **THEN** la tarjeta muestra el badge "electivo"

#### Scenario: período sin entries (edge)
- **GIVEN** un plan con `totalPeriods = 6` pero entries sólo en 1..4
- **WHEN** se renderiza la malla
- **THEN** se ven 6 columnas; las columnas 5 y 6 quedan vacías (no se omiten)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre el detalle de un Plan, pestaña "Malla curricular", y ve columnas por período con tarjetas en lugar de una tabla.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | agrupación | entries en períodos 1 y 2 | groupByPeriod | 2 columnas con sus tarjetas | TC-01 |
| 2 | badge electivo | entry `blockId != null` | deriveElective | `isElective = true` | TC-02 |

### REQ-02: Puntos de entrada (mod-only)

> **Que cambia**: la pestaña "Malla curricular" (ya existente) pasa a renderizar el componente visual; el listado de planes gana una acción "Malla curricular" que abre esa pestaña.
> **Por que**: acceso natural desde el detalle y el listado, sin tocar core.

El sistema MUST renderizar el componente de malla como elemento de la pestaña "Malla curricular" de `default_Curriculum_view.json` (reemplazando el `record-list` actual de `planEntry`), pasándole `planId = {{parentId}}`. El sistema SHOULD agregar una acción "Malla curricular" en `default_Curriculum_list.json` que navegue al detalle del plan en esa pestaña. El sistema MUST NOT registrar un `layoutType` nuevo en el `LayoutOrchestrator` de core.

**Actor**: diseñador curricular
**Layers**: frontend (config/layouts del mod)

<details><summary>Scenarios de validacion</summary>

#### Scenario: pestaña renderiza el componente
- **GIVEN** un plan con entries
- **WHEN** el usuario abre la pestaña "Malla curricular"
- **THEN** ve el grid por período (no el `record-list` tabular previo)

#### Scenario: acción del listado
- **GIVEN** el listado de planes
- **WHEN** el usuario usa la acción "Malla curricular" de una fila
- **THEN** navega al detalle del plan con la pestaña de malla activa

</details>

#### Acceptance
**El usuario puede verificar que funciona**: desde el listado de planes, la acción "Malla curricular" abre el plan en la pestaña con el grid.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | JSON válido del view | layout editado | `JSON.parse` | element de malla en la tab, sin record-list | manual/dual-judge |
| 2 | acción listado | layout list editado | `JSON.parse` | rowAction "Malla curricular" presente | manual/dual-judge |

### REQ-03: Barra de resumen del plan

> **Que cambia**: arriba de la malla aparece una barra con créditos del diseño/requeridos, períodos, asignaturas y carga máxima por período.
> **Por que**: el diseñador necesita las métricas agregadas del plan de un vistazo.

El sistema MUST mostrar, a ancho completo sobre la malla, una barra de resumen con: créditos del diseño vs requeridos, número de períodos, número de asignaturas y carga máxima de créditos por período. Los valores MUST calcularse desde los `planEntry` (créditos efectivos) y `totalCredits`/`totalPeriods` del Currículo.

**Actor**: diseñador curricular
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: cálculo del resumen
- **GIVEN** un plan con 3 entries de 6, 4 y 5 créditos en períodos 1, 1 y 2
- **WHEN** se calcula el resumen
- **THEN** créditos del diseño = 15, asignaturas = 3, carga máx/período = 10 (período 1)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ve la barra con los 4 indicadores y los números coinciden con las tarjetas visibles.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | resumen | 3 entries (6+4+5 cr) | computeSummary | 15 cr de diseño, 3 asignaturas, maxLoad=10 | TC-03 |

### REQ-04: Modo edición gated por estado

> **Que cambia**: las acciones de alta/edición de la malla sólo aparecen cuando el plan está en modo edición y su `status` es editable (`Draft`); en sólo lectura quedan ocultas.
> **Por que**: proteger planes publicados (`Active`) o archivados de cambios accidentales.

El sistema MUST mostrar las acciones de alta/edición de la malla SÓLO cuando se está en modo edición Y `Curriculum.status === 'Draft'`. En cualquier otro caso (modo lectura, o `status ∈ {Active, Archived}`) las acciones MUST permanecer ocultas. (La implementación plena de esas acciones es MC-06; MC-05 entrega su visibilidad gated y un placeholder de acción.)

**Actor**: diseñador curricular
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: plan Draft en edición
- **GIVEN** un plan `status = Draft` en modo edición
- **WHEN** se renderiza la malla
- **THEN** las acciones de alta están visibles

#### Scenario: plan Draft en sólo lectura
- **GIVEN** un plan `status = Draft` en modo lectura
- **WHEN** se renderiza la malla
- **THEN** las acciones de alta están ocultas

#### Scenario: plan Active
- **GIVEN** un plan `status = Active` (cualquier modo)
- **WHEN** se renderiza la malla
- **THEN** las acciones de alta están ocultas

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en un plan Draft con edición activa ve "+ Asignatura"; en un plan Active no.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Draft editable | `status=Draft`, mode=edit | canEdit | true | TC-04 |
| 2 | Draft lectura | `status=Draft`, mode=view | canEdit | false | TC-04 |
| 3 | Active | `status=Active`, mode=edit | canEdit | false | TC-05 |

## Artifacts

### Vue components (METASPEC-vue-component)

| Componente | Path | Tipo | Props | Reuso |
|------------|------|------|-------|-------|
| `CurriculumMeshElement.vue` | mods/curriculum-design/modsComponents/CurriculumMesh/CurriculumMeshElement.vue | Vueform full-page element (`defineElement`) | `planId: string` (={{parentId}}), `enableEdit: boolean` | calca `CompositeSectionTree` (estructura, modales caseros con átomo `Modal`) |
| `useCurriculumMesh.ts` | mods/curriculum-design/modsComponents/CurriculumMesh/useCurriculumMesh.ts | composable | — | `useTenantApolloClient` + `listInstances` (patrón `useCompositeSectionTree`) |
| `curriculumMesh.logic.ts` | mods/curriculum-design/modsComponents/CurriculumMesh/curriculumMesh.logic.ts | módulo TS puro | funciones puras (ver abajo) | nuevo — testeable |
| `curriculumMesh.logic.spec.ts` | mods/curriculum-design/modsComponents/CurriculumMesh/curriculumMesh.logic.spec.ts | vitest | — | cubre TC-01..05 |
| `CurriculumMesh.stories.ts` | mods/curriculum-design/modsComponents/CurriculumMesh/CurriculumMesh.stories.ts | storybook | — | cubre el `.vue` |

**Átomos/moléculas reusados (layout/src/components)**: `Badge` (badge electivo + tags de línea, `customColor`), `Card`, `Icon`, `Text`, `Heading`, `Spinner` (loading), `Alert` (error). No se construyen.

**Funciones puras de `curriculumMesh.logic.ts`** (specs explícitas, no heurísticas por nombre):

| Función | Firma | Cubre |
|---------|-------|-------|
| `groupByPeriod` | `(entries: MeshEntry[], totalPeriods: number) => MeshCard[][]` | REQ-01 / TC-01 |
| `deriveElective` | `(entry: MeshEntry) => boolean` (`blockId != null`) | REQ-01 / TC-02 |
| `resolveCategoryColor` | `(entry: MeshEntry, categories: CategoryVM[]) => string \| undefined` | REQ-01 |
| `computeSummary` | `(entries: MeshEntry[], plan: PlanVM) => MeshSummary` | REQ-03 / TC-03 |
| `canEdit` | `(status: CurriculumStatus, mode: 'view' \| 'edit') => boolean` (`mode==='edit' && status==='Draft'`) | REQ-04 / TC-04, TC-05 |

### Layout config (METASPEC-layout-config)

| File | Change | Detalle |
|------|--------|---------|
| `mods/curriculum-design/config/layouts/default_Curriculum_view.json` | modificado | en la tab "Malla curricular": reemplazar el campo `record-list` de `planEntry` por el element de malla (`type: <element key>`, `planId: {{parentId}}`) |
| `mods/curriculum-design/config/layouts/default_Curriculum_list.json` | modificado | agregar rowAction "Malla curricular" que navega al detalle en la tab de malla |

> Nota: `default_Curriculum_edit.json` conserva su tab "Malla curricular" con el `record-list` o el element en modo lectura — el alta/edición plena es MC-06. MC-05 no requiere cambiarlo salvo paridad visual (se evalúa en S2.T1).

## Tasks

### Session 1 — Lógica pura + componente de malla + resumen [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Lógica pura `curriculumMesh.logic.ts` (`groupByPeriod`, `deriveElective`, `resolveCategoryColor`, `computeSummary`, `canEdit`) + tipos `MeshEntry/MeshCard/MeshSummary/CategoryVM/PlanVM` | REQ-01, REQ-03, REQ-04 | developer | — | modsComponents/CurriculumMesh/curriculumMesh.logic.ts | vitest (S1.T2) | git revert | DET-1, DET-2, DET-8, DET-16 | pending | 1 |
| S1.T2 | `.spec.ts` de la lógica pura cubriendo TC-01..05 (asserts con valores concretos) | REQ-01, REQ-03, REQ-04 | developer | S1.T1 | modsComponents/CurriculumMesh/curriculumMesh.logic.spec.ts | `vitest run` del mod (verde) | git revert | DET-7, DET-13 | pending | 1 |
| S1.T3 | `useCurriculumMesh.ts` (carga GraphQL `listInstances` de planEntry por planId + requirementCategory por curriculumId + Curriculum para status/totalPeriods/totalCredits) | REQ-01 | developer | S1.T1 | modsComponents/CurriculumMesh/useCurriculumMesh.ts | lint + build del mod | git revert | DET-5, DET-8, DET-11, RULE-curriculum-design-014 | pending | 1 |
| S1.T4 | `CurriculumMeshElement.vue` — grid por período + tarjetas (Badge/Card/Icon) + barra de resumen (REQ-03), consumiendo lógica+composable; estados Spinner/Alert | REQ-01, REQ-03 | developer | S1.T2, S1.T3 | modsComponents/CurriculumMesh/CurriculumMeshElement.vue | lint + build del mod | eliminar componente | DET-8, DET-16, RULE-curriculum-design-014 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions` (Template de Gate), correr `vitest run --coverage` del mod, quality review dual-judge (DET-35) sobre lógica+componente, decidir continue/iterate/escalate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + vitest verde + coverage no baja + dual-judge APPROVED | (no aplica — cierre de session) | DET-13, DET-20, DET-23, DET-35 | pending | 1 |

### Session 2 — Entrypoints + gating de edición + stories [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Entrypoint: en `default_Curriculum_view.json` swap del `record-list` de planEntry → element de malla (`planId={{parentId}}`); rowAction "Malla curricular" en `default_Curriculum_list.json` | REQ-02 | developer | S1.GATE | config/layouts/default_Curriculum_view.json, config/layouts/default_Curriculum_list.json | `JSON.parse` OK + dual-judge (S2.GATE) | git checkout de los 2 layouts | DET-2, DET-8, RULE-curriculum-design-014 | pending | 2 |
| S2.T2 | Gating de modo edición en el componente: acciones de alta visibles sólo si `canEdit(status, mode)`; placeholder "+ Asignatura" (impl. plena = MC-06) | REQ-04 | developer | S1.T4 | modsComponents/CurriculumMesh/CurriculumMeshElement.vue | vitest `canEdit` (S1.T2) + lint | git revert | DET-8, DET-16, RULE-curriculum-design-014 | pending | 2 |
| S2.T3 | `CurriculumMesh.stories.ts` (estados: lectura, edición Draft, Active read-only, plan vacío) | REQ-01, REQ-04 | developer | S2.T2 | modsComponents/CurriculumMesh/CurriculumMesh.stories.ts | storybook build del mod | git revert | DET-7, RULE-curriculum-design-014 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir en `## Sessions`, JSON válido de layouts + vitest del mod sin regresión + storybook build + quality review dual-judge (DET-35), decidir continue/iterate/escalate | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + JSON válido + suite sin caída + dual-judge APPROVED | (no aplica — cierre de session) | DET-13, DET-20, DET-23, DET-35 | pending | 2 |

### Task contract — detalle

```
Task S1.T1: lógica pura de la malla
- source_ref: REQ-01, REQ-03, REQ-04
- agent: developer
- files: modsComponents/CurriculumMesh/curriculumMesh.logic.ts
- precondition: ninguna
- expected_output: funciones puras exportadas + tipos; sin imports de Vue ni GraphQL
- validation: cubierto por vitest en S1.T2
- rollback: git revert
- rules: [DET-1, DET-2, DET-8, DET-16]

Task S1.T2: tests de la lógica pura
- source_ref: REQ-01, REQ-03, REQ-04
- agent: developer
- files: modsComponents/CurriculumMesh/curriculumMesh.logic.spec.ts
- precondition: S1.T1
- expected_output: TC-01..05 con asserts de valores concretos (2 columnas; isElective=true; 15cr/3asig/maxLoad=10; canEdit true/false/false)
- validation: vitest run del mod en verde
- rollback: git revert
- rules: [DET-7, DET-13]

Task S1.T3: composable de carga GraphQL
- source_ref: REQ-01
- agent: developer
- files: modsComponents/CurriculumMesh/useCurriculumMesh.ts
- precondition: S1.T1
- expected_output: carga planEntry(planId) + requirementCategory(curriculumId) + Curriculum(status,totalPeriods,totalCredits) via useTenantApolloClient/listInstances; estados loading/error
- validation: lint + build del mod
- rollback: git revert
- rules: [DET-5, DET-8, DET-11, RULE-curriculum-design-014]

Task S1.T4: componente de malla + resumen
- source_ref: REQ-01, REQ-03
- agent: developer
- files: modsComponents/CurriculumMesh/CurriculumMeshElement.vue
- precondition: S1.T2, S1.T3
- expected_output: grid por período con tarjetas (Badge/Card/Icon), barra de resumen (4 stats), Spinner/Alert; defineElement registrado
- validation: lint + build del mod
- rollback: eliminar componente
- rules: [DET-8, DET-16, RULE-curriculum-design-014]

Task S2.T1: entrypoints (swap tab + acción listado)
- source_ref: REQ-02
- agent: developer
- files: config/layouts/default_Curriculum_view.json, config/layouts/default_Curriculum_list.json
- precondition: S1.GATE (componente registrado)
- expected_output: tab "Malla curricular" renderiza el element (planId={{parentId}}); rowAction navega a la tab; sin layoutType en core
- validation: JSON.parse OK + dual-judge; smoke DB-gated diferido al dev
- rollback: git checkout de los 2 layouts
- rules: [DET-2, DET-8, RULE-curriculum-design-014]

Task S2.T2: gating de edición
- source_ref: REQ-04
- agent: developer
- files: modsComponents/CurriculumMesh/CurriculumMeshElement.vue
- precondition: S1.T4
- expected_output: acciones de alta visibles sólo si canEdit(status,mode); placeholder "+ Asignatura"
- validation: vitest canEdit (S1.T2) + lint
- rollback: git revert
- rules: [DET-8, DET-16, RULE-curriculum-design-014]

Task S2.T3: stories
- source_ref: REQ-01, REQ-04
- agent: developer
- files: modsComponents/CurriculumMesh/CurriculumMesh.stories.ts
- precondition: S2.T2
- expected_output: stories de lectura/edición Draft/Active/plan vacío
- validation: storybook build del mod
- rollback: git revert
- rules: [DET-7, RULE-curriculum-design-014]
```

## Constraints

- **RULE-curriculum-design-014** (should): componente full-page del mod = Vueform `defineElement` en `modsComponents/`, lógica pura a `.ts` con `.spec.ts`, modales caseros con átomo `Modal` (no `ModalStackManager`, BUG-platform-011). El `.vue` se cubre con stories.
- **RULE-dev-004 / core_work_policy**: `layer: mod` — sólo `mods/curriculum-design/`; cero core. Branch `UPONE-1267-sp5`, nunca `develop`.
- **Frontera mod-only (auditoría §1.6)**: NO registrar `layoutType` nuevo en `LayoutOrchestrator`. El entrypoint es config del mod (tab + rowAction).
- **DET-32 (necesidad/reuso)**: el componente/lógica/composable = `build`; los átomos = `reuse`; los entrypoints = `reduce` (la tab ya existe por TICKET-093, se modifica config). Veredicto agregado: `mixed`.
- **Cero backend**: `planEntry.json`/`requirementCategory.json`/`Curriculum.json`, resolvers y seed intactos. Sólo lectura.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| SPEC-curriculum-design-fix-embed-malla-in-curriculum (TICKET-093) | internal | creó la tab "Malla curricular" que MC-05 re-puebla | si no estuviera, habría que crear la tab — está done |
| `CompositeSectionTree` (patrón) | internal | molde de full-page element + GraphQL + lógica `.ts` | sólo referencia |
| `planEntry`/`requirementCategory`/`Curriculum` (MC-02) | internal | datos que la malla pinta | están en DB con seed |
| `npm run sync` + DB del tenant | internal | aplica los layouts (DB-gated) | smoke runtime lo corre el dev |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Swap del element rompe el embedding `{{parentId}}` de la tab | low | alto | el element recibe `planId={{parentId}}` igual que el record-list actual; JSON.parse + dual-judge; smoke del dev |
| Acoplar el componente a nombres de campo de RTs (heurística) | medium | medio | la lógica recibe specs tipadas (props/tipos), no detecta por nombre (checklist §5) |
| Runtime DB-gated enmascara error de layout | low | medio | JSON válido + suite del mod + `.spec.ts`; smoke runtime del dev (TC DB-gated) |
| Scope creep hacia alta/edición (MC-06) | medium | medio | gating entrega sólo visibilidad + placeholder; la impl. plena queda fuera (límite explícito) |

## Open questions

- (ninguna — las 3 del draft quedaron resueltas: markup propio para el resumen, líneas como leyenda estática, estados editables = sólo `Draft`)

## Decisions

### DEC-LOCAL-01: componente nuevo calcando CompositeSectionTree (no reuso directo)
- **Contexto**: REQ-01 pide un grid por período; `CompositeSectionTree` es un árbol jerárquico por `parentId`.
- **Drivers**: el grid por período no es un árbol; reusar el árbol forzaría el modelo. RULE-cd-014 pide reusar el **patrón** (element + GraphQL + lógica `.ts`), no el componente.
- **Opcion elegida**: `build` de `CurriculumMeshElement` calcando la estructura de `CompositeSectionTree`.
- **Alternativas**: reusar CompositeSectionTree tal cual → no encaja con columnas por período.
- **Consecuencias**: componente nuevo testeable; lógica pura aislada. Reuso fuerte de átomos.
- **Session**: design (pre-S1).

### DEC-LOCAL-02: la tab cambia su elemento, no se crea una tab nueva
- **Contexto**: TICKET-093 ya embebió la tab "Malla curricular" con un `record-list` de planEntry.
- **Opcion elegida**: swap del `record-list` → element de malla en `default_Curriculum_view.json`; agregar rowAction en `_list`.
- **Alternativas**: crear una tab nueva → duplicaría la entrada; tocar core con layoutType → fuera de frontera.
- **Consecuencias**: cambio mínimo de config; preserva el filtro `{{parentId}}`.
- **Session**: design (pre-S1).

### DEC-LOCAL-03: la acción de listado (REQ-02, SHOULD) se difiere — sin mecanismo limpio en config
- **Contexto**: REQ-02 pide (SHOULD) una acción "Malla curricular" en el listado de planes que "navega al detalle en la pestaña de malla".
- **Drivers**: el motor de layouts NO soporta una rowAction de navegación-a-tab. Verificado (DET-33 + dual-judge DET-35) en `layout/src/composables/useRowActionHandler.ts:309-323`: una rowAction `type:'modal'` con `targetLayoutType:'RecordDetail'` cae al `else` → `mode:'create'` SIN `instanceId` → abriría un form de creación en blanco, no la malla del plan. Un `type:'default'` requeriría un `handler` JS, no declarable en JSON. No existe deep-link a tab.
- **Opción elegida**: **drop** de la rowAction. El acceso a la malla queda por la **pestaña "Malla curricular" del RecordDetail** (REQ-02 MUST, entregado) — alcanzable con el click de fila normal (`openMode:'route'`), que sí resuelve `{{parentId}}`.
- **Alternativas**: (a) rowAction modal→RecordDetail → rota (mode create sin instanceId); (b) rowAction modal→RecordList → no aplica (la malla no es un layout list).
- **Consecuencias**: la acción dedicada del listado queda **diferida a backlog (priority: should, NO bloquea cierre — DET-17)**; requiere que el motor agregue soporte de modal/route RecordDetail en modo view con `instanceId`, o un tipo de rowAction de navegación con tab destino. El caso de uso (ver la malla) está cubierto por la pestaña.
- **Session**: S2.

> **Nota de despliegue (no es defecto de código)**: el `type: 'curriculum-mesh'` se registra en Vueform vía `npm run sync` del mod (genera `layout/src/modsComponents/` + `component-registry.json` — artefactos de sync, no se autoran ni commitean, ver `config.yaml` critical_rules). Hasta correr el sync, el type no resuelve en runtime. Mismo gating DB/sync que la aplicación de los layouts (smoke del dev).

## Backlog

| # | Item | Priority | Razón |
|---|------|----------|-------|
| B-1 | Acción "Malla curricular" en el listado de planes (REQ-02, escenario acción del listado) | should | El motor de layouts no soporta hoy rowAction de navegación-a-tab ni modal RecordDetail en modo view con instanceId (DEC-LOCAL-03). No bloquea cierre (DET-17). Retomar si el motor agrega el soporte. |

## Technical reference

- **planEntry** (objects/planEntry.json): `planId` (FK Curriculum), `activityId` (FK Activity), `categoryId` (FK requirementCategory, opt), `blockId` (opt — electividad derivada), `kind` (Course/Internship/Thesis), `period` (int, req), `position` (int, opt), `credits` (number, opt — override; si null hereda de Activity.credits), `sourceEntryId` (opt).
- **requirementCategory** (objects/requirementCategory.json): `curriculumId`, `name`, `code`, `minCredits`, `maxCredits`, `position`, `color` (token CSS `var(--up1-color-*)` o hex), `icon` (bi-*). `currentCredits` derivado en lectura.
- **Curriculum** (objects/Curriculum.json): `status` enum `["Draft","Active","Archived"]` (default `Draft`); `totalPeriods`, `totalCredits`.
- **Patrón de carga**: `useTenantApolloClient` + `listInstances` filtrando por baseObject/ownerType/ownerId/recordType (ver `useCompositeSectionTree.ts`, límite 500).
- **Átomos**: `Badge` (`customColor`), `Card`, `Icon`, `Text`, `Heading`, `Spinner`, `Alert` en `layout/src/components/`.

## Acceptance checkpoints

- [ ] **Funcional**: REQ-01..04 verificados (código + smoke DB-gated del dev)
- [ ] **Tests**: `curriculumMesh.logic.spec.ts` cubre TC-01..05 con asserts concretos y pasa; suite del mod sin regresión
- [ ] **NFRs**: n/a (vista de lectura, sin endpoints nuevos)
- [ ] **Rules**: RULE-curriculum-design-014 respetada (element + lógica `.ts` + stories); cero core (RULE-dev-004); cero backend
- [ ] **Integration**: layouts JSON válidos; tab renderiza el element; rowAction presente
- [ ] **Docs**: ticket actualizado (sessions, TCs, learns); teach-close generado
