---
id: SPEC-curriculum-design-fix-embed-malla-in-curriculum
project: up1
ticket: TICKET-093
status: done
---

# Fix: embeber planEntry/requirementCategory como pestañas del Plan de estudios

# Fix: embeber planEntry/requirementCategory como pestañas del Plan de estudios

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico vive en Requirements / Fix scope / Tasks.*

**Que se quiere**: hoy las "líneas de formación" (`requirementCategory`) y la "malla" (`planEntry`) aparecen como objetos sueltos en el menú lateral, desconectados de su Plan padre. MC-02 (TICKET-082) les dio layouts `default_<Obj>_list` top-level que los registró en el menú. Queremos que se vean DENTRO del detalle del Currículo (Plan) como pestañas, igual que las secciones de un Programa de asignatura (`Activity`) se ven dentro del Programa. Cambio 100% de capa de layouts del mod, **cero backend**.

**Decisiones criticas**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Embeber vía campo `record-list` + `filters` por `{{parentId}}` en `default_Curriculum_view/_edit` (patrón `default_Activity_view`) | Es el mecanismo real del motor de layouts; probado en Activity. Reuso 1:1, no se construye componente (RULE-curriculum-design-014). |
| 2 | **NO** declarar `metadata.directChildren` en `Curriculum.json` (DET-32 → drop) | Grep: `directChildren` solo lo consume el object-manager (deepClone/versioning), **0 usos en `layout/src` y `suite/src`**. No mueve el embedding y tocaría backend (contra "cero backend"). |
| 3 | Borrar los 2 `default_<Obj>_list` saca a los hijos del menú; conservar `_view/_edit/_create` (los abre la lista embebida) | Quita la entrada de menú sin perder el CRUD ni el detalle de los hijos. |

**Riesgos principales y mitigacion**:

- **Aplicación DB-gated**: los layouts viven en la DB del tenant (se aplican con `npm run sync`). La verificación de código es JSON válido + suite del mod sin regresión; el smoke visual lo corre el dev tras el sync (precedente MC-02 S3).
- **Crear línea desde la pestaña embebida**: el `default_requirementCategory_create` pide `curriculumId` (picker required, sin prefill). El create funciona pero el usuario elige el currículo — prefill = nice-to-have fuera de alcance.

**Que NO se hace**: declarar `directChildren` (versioning/clone de hijos = trabajo del ticket de versioning, propagación DET-16); la grilla visual de la malla (MC-05/06); los pickers de color/icono (TICKET-094); prefill de `curriculumId` en el create embebido.

**Tamano estimado**: 1 session (S1), ~1-1.5h. Riesgo bajo (JSON declarativo con patrón espejo).

**Como vas a saber que funciona**: tras `npm run sync`, el menú ya no lista esos 2 objetos; el detalle de un Currículo muestra pestañas "General / Líneas de formación / Malla curricular"; la suite del mod sigue en 788/788.

---

## Purpose

Corregir la presentación de planEntry/requirementCategory (MC-02): moverlos del menú de objetos al detalle de su Currículo padre como pestañas embebidas. Mod-only (curriculum-design), capa de layouts. Reusa el patrón `record-list` de `default_Activity_view`; no introduce backend, objetos, resolvers ni datos.

## Diagnostico

- **Causa raíz**: MC-02 autoró `default_planEntry_list.json` y `default_requirementCategory_list.json` (layouts list top-level). En este mod un objeto con un layout `_list` registrado aparece como entrada del menú de objetos. Los hijos quedaron así desconectados de su padre.
- **Hipótesis** (Triage del ticket): H1 ✓ (los 2 `_list` los registran en el menú), H2 ✓ (el embedding lo hace el `record-list` del layout de detalle), H3 ✓ (`directChildren` es backend-only, no participa del embedding).
- **Impacto**: diseñador curricular que abre un Plan no ve su malla ni sus líneas en contexto; los ve como objetos globales sin relación visible al padre.

## Requirements

### REQ-FIX-01: planEntry y requirementCategory salen del menú de objetos

> **Que cambia**: los 2 objetos dejan de aparecer como entradas sueltas del menú lateral.
> **Por que**: son hijos del Currículo, no objetos de primer nivel.

El sistema MUST dejar de registrar `planEntry` y `requirementCategory` en el menú de objetos, eliminando sus layouts `default_planEntry_list.json` y `default_requirementCategory_list.json`. Los layouts `_view/_edit/_create` de ambos se conservan (los consume la lista embebida).

**Actor**: diseñador curricular
**Layers**: frontend (config/layouts del mod)

#### Acceptance
Tras `npm run sync`, el menú de objetos no lista "Líneas de formación" ni "Entradas de plan".

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Menú sin hijos | sync aplicado | abrir menú objetos | sin entradas de esos 2 objetos | TC-01 |

### REQ-FIX-02: el detalle (view) del Currículo embebe Líneas y Malla como pestañas

> **Que cambia**: `default_Curriculum_view` pasa de plano a `tabs`: General + Líneas de formación + Malla curricular.
> **Por que**: el usuario debe leer la malla y las líneas en el contexto de su Plan.

El sistema MUST mostrar, en `default_Curriculum_view`, una pestaña "Líneas de formación" con un `record-list` de `requirementCategory` filtrado por `curriculumId = {{parentId}}`, y una pestaña "Malla curricular" con un `record-list` de `planEntry` filtrado por `planId = {{parentId}}`, además de la pestaña "General" con los campos actuales del Currículo. Patrón `default_Activity_view`.

**Actor**: diseñador curricular
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: pestaña Líneas de formación
- **GIVEN** un Currículo con requirementCategory hijas
- **WHEN** el usuario abre el detalle del Currículo y la pestaña "Líneas de formación"
- **THEN** ve la lista de líneas del currículo (filtro `curriculumId`), columnas name/code/minCredits/maxCredits/currentCredits

#### Scenario: pestaña Malla curricular
- **GIVEN** un Plan con planEntry hijas
- **WHEN** el usuario abre la pestaña "Malla curricular"
- **THEN** ve la lista de entradas (filtro `planId`), columnas activityId/period/kind/categoryId/effectiveCredits/isElective

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Tab Líneas | currículo con líneas | abrir view | lista filtrada por curriculumId | TC-02 |
| 2 | Tab Malla | plan con entradas | abrir view | lista filtrada por planId | TC-03 |

### REQ-FIX-03: el edit del Currículo replica las mismas pestañas embebidas

> **Que cambia**: `default_Curriculum_edit` adopta las mismas 3 pestañas (General editable + Líneas + Malla).
> **Por que**: el request pide embeber en view Y edit; precedente `default_Activity_edit` (embebe record-lists en modo edit).

El sistema MUST replicar en `default_Curriculum_edit` la estructura de `tabs` (General con los campos editables actuales + Líneas de formación + Malla curricular), conservando el `customEndpoint` `updateCurriculumWithRecordType` existente y los campos del schema actuales.

**Actor**: diseñador curricular
**Layers**: frontend

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Tabs en edit | — | abrir edit del currículo | General + Líneas + Malla presentes; form editable intacto | TC-04 |

### REQ-FIX-04: el CRUD de las líneas se preserva dentro de la pestaña embebida

> **Que cambia**: la lista embebida de "Líneas de formación" conserva crear/editar/borrar (apuntando a los layouts existentes); la de "Malla" queda lectura + borrar.
> **Por que**: al quitar la entrada de menú, no debe perderse la capacidad de gestionar líneas. planEntry se crea por la grilla MC-05/06, no desde acá.

El sistema MUST configurar el `record-list` de `requirementCategory` con `canCreate/canEdit/canDelete: true` y `associatedLayoutConfigs` hacia `default_requirementCategory_create/_edit/_view`; y el `record-list` de `planEntry` con `canCreate: false`, `canEdit: false`, `canDelete: true` y `associatedLayoutConfigs.view = default_planEntry_view` (consistente con su `_list` previo).

**Actor**: diseñador curricular
**Layers**: frontend

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | CRUD líneas embebido | sync aplicado | crear/editar/borrar desde la pestaña Líneas | acciones operativas (create abre layout existente; curriculumId se elige) | TC-05 |

### REQ-REGRESSION-01: cero cambio de backend y suite del mod sin regresión

> **Que cambia**: nada de backend — se verifica que objetos/resolvers/seed quedan intactos y la suite del mod no regresiona.
> **Por que**: el fix es puramente de layouts; no debe alterar el modelo ni la lógica.

El sistema MUST mantener intactos `Curriculum.json`, `planEntry.json`, `requirementCategory.json`, todos los resolvers y el seed del mod; la suite vitest del mod MUST seguir en su baseline (788/788).

**Actor**: system
**Layers**: backend, test

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Suite sin regresión | mod | `npm test` | mismo conteo PASS que baseline | TC-06 |

## Fix scope

### Antes (comportamiento actual)
`default_Curriculum_view/_edit` son planos (sin `tabs`). `planEntry`/`requirementCategory` tienen `default_<Obj>_list` top-level → aparecen en el menú de objetos, desconectados del Currículo.

### Despues (comportamiento esperado)
Los 2 `_list` se borran (los hijos salen del menú). `default_Curriculum_view/_edit` ganan `tabs` (General + Líneas de formación + Malla curricular) con campos `record-list` filtrados por la FK al Currículo. Los `_view/_edit/_create` de los hijos quedan como destino de la lista embebida.

### Archivos afectados
| File | Change | Impact |
|------|--------|--------|
| `mods/curriculum-design/config/layouts/default_planEntry_list.json` | **borrado** | planEntry sale del menú |
| `mods/curriculum-design/config/layouts/default_requirementCategory_list.json` | **borrado** | requirementCategory sale del menú |
| `mods/curriculum-design/config/layouts/default_Curriculum_view.json` | **modificado** — agregar `tabs` + 2 campos `record-list` al `schema` | embebe Líneas + Malla en el detalle |
| `mods/curriculum-design/config/layouts/default_Curriculum_edit.json` | **modificado** — agregar `tabs` + 2 campos `record-list` al `schema` (conserva `customEndpoint`) | embebe Líneas + Malla en el edit |

## Tasks

### Session 1 — Sacar del menú + embeber pestañas en el detalle del Currículo [tipo: ⚑ auto (dual-judge)] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Borrar `default_planEntry_list.json` y `default_requirementCategory_list.json` | REQ-FIX-01 | developer | — | los 2 `_list` | suite del mod sin regresión (S1.GATE) | `git checkout` de los 2 archivos | DET-8, RULE-curriculum-design-014 | done | 1 |
| S1.T2 | Agregar `tabs` (General + Líneas de formación + Malla curricular) + 2 campos `record-list` al `schema` de `default_Curriculum_view.json` y `default_Curriculum_edit.json` (filtros curriculumId/planId={{parentId}}, capacidades REQ-FIX-04, associatedLayoutConfigs a los layouts existentes) | REQ-FIX-02, REQ-FIX-03, REQ-FIX-04 | developer | S1.T1 | `default_Curriculum_view.json`, `default_Curriculum_edit.json` | JSON.parse OK + dual-judge (S1.GATE) | `git checkout` de los 2 layouts | DET-2, DET-8, RULE-curriculum-design-014 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions`, verificar JSON válido de los layouts + suite del mod sin regresión + quality review dual-judge (DET-35), decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + JSON válido + suite sin caída + dual-judge APPROVED | (no aplica — cierre de session) | DET-13, DET-20, DET-23, DET-35 | done | 1 |

### Task contract — detalle

```
Task S1.T1: borrar los 2 layouts _list
- source_ref: REQ-FIX-01
- agent: developer
- files: mods/curriculum-design/config/layouts/default_{planEntry,requirementCategory}_list.json
- precondition: ninguna
- expected_output: ambos archivos eliminados; los objetos salen del menú tras sync
- validation: suite del mod sin regresión (S1.GATE)
- rollback: git checkout de los 2 archivos
- rules: [DET-8, RULE-curriculum-design-014]

Task S1.T2: embeber tabs en Curriculum_view y _edit
- source_ref: REQ-FIX-02, REQ-FIX-03, REQ-FIX-04
- agent: developer
- files: mods/curriculum-design/config/layouts/default_Curriculum_{view,edit}.json
- precondition: S1.T1
- expected_output: tabs General/Líneas/Malla con record-list filtrado por {{parentId}}; capacidades por REQ-FIX-04; customEndpoint del edit intacto
- validation: JSON.parse OK + dual-judge (S1.GATE); smoke runtime DB-gated diferido al dev
- rollback: git checkout de los 2 layouts
- rules: [DET-2, DET-8, RULE-curriculum-design-014]
```

## Constraints

- **RULE-curriculum-design-014** (should): reusar el componente/patrón nativo antes de construir uno propio — acá se reusa el `record-list` nativo (patrón `default_Activity_view`), no se construye modsComponent.
- **RULE-dev-004 / core_work_policy**: ticket `layer: mod` — solo edita `mods/curriculum-design/`; cero core. Branch del mod (UPONE-1267-sp5), no `develop`.
- **DET-32 (necessity/reuse)**: `metadata.directChildren` evaluado y **descartado** (drop) — no participa del embedding (backend-only) y tocaría `Curriculum.json` (contra "cero backend").
- **Cero backend**: `Curriculum.json`/`planEntry.json`/`requirementCategory.json`, resolvers y seed quedan intactos (REQ-REGRESSION-01).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `default_Activity_view.json` (patrón) | internal | molde del embedding de record-list por tabs | ninguno (solo referencia) |
| `default_{requirementCategory,planEntry}_{view,edit,create}` | internal | destino de la lista embebida (associatedLayoutConfigs) | si se borraran, la lista no abriría detalle — se conservan |
| `npm run sync` + DB del tenant | internal | aplica los layouts al tenant (DB-gated) | smoke runtime lo corre el dev |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| El motor no resuelve el filtro `{{parentId}}` para el record-list embebido | low | alto | patrón idéntico a `default_Activity_view` (7 listas) ya en producción del mod |
| Crear línea desde la pestaña no prefilla `curriculumId` | medium | bajo | el create abre el layout existente con picker required; prefill = follow-up, no regresión (la capacidad de crear se mantiene) |
| Aplicación DB-gated enmascara un error de layout | low | medio | JSON.parse + dual-judge sobre el shape; smoke runtime por el dev (TC DB-gated, no override) |

## Open questions

- [ ] **OQ-1**: ¿el create de `requirementCategory` desde la pestaña embebida debería prefillar `curriculumId` desde el padre? — fuera de alcance; candidato a follow-up / TICKET-094.

## Decisions

### DEC-LOCAL-01: el embedding lo hace el `record-list` del layout, no `metadata.directChildren`
- **Contexto**: el request proponía declarar `metadata.directChildren` en `Curriculum.json`.
- **Drivers**: `grep directChildren` → solo `object-manager/src/.../deep-clone-{direct,polymorphic}.js`, `instance.resolver.js`, `codegen/helpers/validate-prefill-from.js`; **0 usos en `layout/src` y `suite/src`**. El embedding de pestañas lo produce el campo `record-list` + `filters` (patrón `default_Activity_view`).
- **Opcion elegida**: embeber solo vía layouts; **drop** de `directChildren` en este ticket (DET-32).
- **Alternativas**: (a) declarar `directChildren` igual → toca backend (contra "cero backend"), expande scope a versioning, sin efecto en el embedding.
- **Consecuencias**: fix mínimo, mod-only, cero backend. Propagación (DET-16): si se quiere que versionar/clonar un Currículo cascade a sus hijos, eso es trabajo del ticket de versioning (UPONE-1270) — registrado como nota, no como gap de este ticket.
- **Session**: diseño (pre-S1).

### DEC-LOCAL-02: preservar CRUD de líneas en la pestaña; planEntry read+delete
- **Contexto**: al borrar `default_requirementCategory_list` (CRUD completo) se perdería el único punto de gestión de líneas.
- **Opcion elegida**: la lista embebida de líneas conserva `canCreate/canEdit/canDelete: true` apuntando a los layouts existentes; la de planEntry queda `canCreate/canEdit: false`, `canDelete: true` (creación vía malla MC-05/06).
- **Consecuencias**: cero regresión de capacidad. El único matiz es el prefill de `curriculumId` (OQ-1).
- **Session**: diseño (pre-S1).

## Acceptance checkpoints

- [ ] **Funcional**: REQ-FIX-01..04 + REQ-REGRESSION-01 verificados (código + smoke DB-gated)
- [ ] **Tests**: suite del mod sin regresión (TC-06); TC-01..05 DB-gated registrados
- [ ] **Rules**: RULE-curriculum-design-014 respetada; cero core (RULE-dev-004); cero backend
- [ ] **Integration**: layouts JSON válidos; menú sin los 2 objetos; detalle con pestañas
- [ ] **Docs**: ticket actualizado (sessions, TCs, learns); teach-close generado
