---
id: SPEC-curriculum-design-001-evaluation-empty-create-first
project: up1
module: curriculum-design
status: done
outcome: no-fix-applied — original report was UX confusion (H6), not functional bug. S1.Diagnosis refuted H1/H2/H3 with empirical evidence; dev opted to leave component as-is.
ticket: TICKET-017
meta_specs: []
created: '2026-05-12'
updated: '2026-05-12'
tags: [composite-section-tree, evaluation, empty-state, ux, regression]
depends_on: []
---

# Habilitar CTA "+ agregar elemento" en empty state del composite-section-tree de Evaluacion

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Fix scope, Tasks). Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: cuando un dev crea un Programa de asignatura nuevo (ej. "Taller de ingles") y va a la pestana Evaluacion, hoy ve un mensaje terminal "Este programa no tiene componentes de evaluacion cargados." sin call-to-action. El boton "+ agregar elemento" ya existe en el codigo del componente custom Vueform, pero un gate `v-if` lo oculta en runtime. El fix diagnostica primero por que falla (debug instrumentation + scenario LLM-e2e automatizado, sin Vue DevTools manual), aplica el cambio en el lugar correcto, cambia el copy a "+ agregar elemento" y cubre el caso con story Storybook + scenario nuevo. Tambien aprovecha para asegurar que el componente custom no tenga el mismo bug si manana se usa para otros RTs (LearningOutcome, Session, etc.).

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Diagnosis automatizada hibrida: data-attrs `data-cst-debug-*` + console.log `[CST_DEBUG]` estructurado en el SFC, TEMPORALES, removidos en S2 junto al fix | Es el approach decidido sobre evaluate_script puro / Vue runtime traversal. Define que S1 cambia codigo (instrumentation), no es solo lectura |
| 2 | El fix vive dentro del mod salvo que S1 confirme H2 (interpolacion `{{parentId}}` en LayoutOrchestrator core). Si gana H2, escalar y trabajar workaround temporal en el mod | Decision condicional al ganador de hipotesis. El spec deja branches alternativos para S2 segun el resultado de S1 |
| 3 | Copy del boton: "+ agregar elemento" (generico, no menciona "componente de evaluacion") | Decisi confirmada en intake. Aplica al i18n key `compositeSectionTree.buttons.createFirst` — sirve para todos los consumidores del componente custom (Evaluation, LearningOutcome futuro, etc.) |
| 4 | Cobertura cross-RT en S3: story `EmptyEditable` parametrizada por `recordType` + scenario LLM-e2e nuevo. NO solo Evaluation | Anticipa H7 (regresion silenciosa si LearningOutcome se cambia a tree pattern manana). Costo marginal, beneficio futuro alto |

**Riesgos principales y como los mitigamos**:

- **Si gana H2 (causa raiz fuera del mod), el fix sale del scope local** → S2 se split en (a) workaround dentro del mod (consume `route.params.id` cuando `ownerId === "{{parentId}}"`) + (b) issue paralelo a platform UP1 con el bug confirmado. El workaround va al codigo; el fix definitivo queda en backlog del ticket como dependencia externa.
- **Debug instrumentation queda en production por olvido** → S2.T1 lista explicitamente la remocion como step obligatorio del fix. S3.GATE valida via `grep -r "CST_DEBUG\|data-cst-debug" mods/curriculum-design/modsComponents/` que NO queda nada.
- **Cambio del copy rompe consumidores externos del i18n key** → el componente custom solo se consume desde el mod `curriculum-design` (verificado via grep en TICKET-012). El i18n key es propio del mod, no del platform. Sin consumers externos.

**Que NO se hace en este ticket** (limites explicitos):

- Cambiar el texto del empty state ("Este programa no tiene componentes de evaluacion cargados.") — queda como `should` del backlog si el dev decide en S3 que el cambio del boton no es suficiente.
- Fix de la interpolacion `{{parentId}}` en LayoutOrchestrator (core platform) si gana H2 — fuera del scope del mod.
- Migrar otros RTs (LearningOutcome, Session) a tree pattern — el fix solo asegura que el componente NO falle en empty state. La decision UX de cual RT usa tree es trabajo aparte.
- Refactor del SFC `CompositeSectionTreeElement.vue` mas alla del fix puntual — ya hubo review completo en TICKET-012, no hay deuda urgente.

**Tamano estimado**: 3 sessions ejecutables (S1 Diagnosis, S2 Patch+cleanup, S3 Cobertura), aproximadamente 4-6h efectivas distribuidas. **La mas riesgosa es S1** porque condiciona el approach de S2 — si gana H2, S2 se duplica en alcance.

**Como vas a saber que funciona**:

- Abro un programa recien creado sin EvaluationComponent → tab Evaluacion → veo el boton "+ agregar elemento" y al hacer click se abre el modal de creacion.
- Submit del form en el modal crea el primer EvaluationComponent y el tree muestra el nodo, summary "+ Agregar" tambien visible.
- Abro UV Ecuaciones Diferenciales (programa con evaluation poblada) → tab Evaluacion → todo lo que funcionaba antes (edit, drag-n-drop, view modal, weight validation) sigue funcionando.
- Storybook story `EmptyEditable` carga sin Apollo y muestra el boton; story `EmptyReadOnly` muestra el texto sin boton.

---

## Purpose

Restaurar la capacidad de bootstrappear el esquema de evaluacion desde la UI cuando un programa arranca sin `EvaluationComponent`. Implica diagnosticar por que el gate `v-if="enableEdit && ownerId"` del boton interno del componente custom `composite-section-tree` falla en runtime, aplicar el fix en el lugar correcto (mod o escalar a platform), cambiar el copy del CTA y cubrir el caso con stories + scenario LLM-e2e para evitar regresion silenciosa cross-RT.

## Requirements

### REQ-FIX-01: CTA visible en empty state editable

El sistema MUST mostrar un boton primario "+ agregar elemento" dentro del componente `composite-section-tree` cuando: `tree.length === 0` AND `enableEdit === true` AND existe un `ownerId` real (UUID del owner, no placeholder literal `"{{parentId}}"`).

**Actor**: user (coordinador academico o admin de Curriculum Design).
**Layers**: frontend (custom Vueform element + interpolacion del layout config).

#### Scenario: programa nuevo sin EvaluationComponent

- **GIVEN** un `AcademicActivity` existente sin ningun `CurricularSection` de `recordType: EvaluationComponent` asociado
- **WHEN** el usuario navega al detail edit (`default_AcademicActivity_edit`) y hace click en el tab "Evaluacion"
- **THEN** el componente muestra el texto del empty state Y un boton primario con icono `bi-plus-lg` y label `"+ agregar elemento"`
- **AND** al hacer click en el boton, se abre el modal `CompositeSectionForm` en mode `create-root` con los campos del RT EvaluationComponent (`name`, `componentCode`, `componentType`, `weight`, `method`, `isDirectEvidence`)

#### Scenario: submit valido crea el primer nodo

- **GIVEN** el modal de creacion abierto (scenario anterior)
- **WHEN** el usuario completa los campos minimos y hace submit
- **THEN** se ejecuta la mutation `CREATE_INSTANCE` con `objectType: rt__EvaluationComponent__curricularsection` y payload conteniendo `ownerType`, `ownerId`, `recordType: EvaluationComponent`, `parentId: null`, `position: 0`, `baseData`, `rtData`
- **AND** tras `refetch()`, `tree.length === 1` y el componente renderiza el nodo + el `summary` con `"+ Agregar"` button visible

#### Scenario: empty state read-only NO muestra boton

- **GIVEN** un programa sin EvaluationComponent y el layout pasa `enableEdit: false`
- **WHEN** el componente renderiza
- **THEN** solo se muestra el texto del empty state, SIN boton CTA

#### Acceptance
**El usuario puede verificar que funciona**: crear un programa nuevo "Taller de ingles", ir a Evaluacion, ver el boton "+ agregar elemento" y crear un primer componente desde alli sin tener que recurrir a seed/API.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Empty editable muestra CTA | tree=[], enableEdit=true, ownerId=UUID | render | DOM contiene `.cst-card__empty-cta` con texto "+ agregar elemento" | boton visible |
| 2 | Click CTA abre modal create-root | TC1 + boton presente | click | modal abre con `mode: create-root` | modalState.open === true |
| 3 | Empty read-only oculta CTA | tree=[], enableEdit=false | render | DOM NO contiene `.cst-card__empty-cta` | boton ausente |
| 4 | ownerId placeholder literal NO renderiza CTA | tree=[], enableEdit=true, ownerId="{{parentId}}" | render | DOM NO contiene CTA (`{{parentId}}` truthy en JS pero invalido) | boton ausente (fix debe detectar el placeholder no interpolado) |

### REQ-REGRESSION-01: tree poblado mantiene addRoot / edit / drag-n-drop

El sistema MUST preservar todo el comportamiento existente cuando `tree.length > 0`:

- Summary muestra boton "+ Agregar" (`addRoot` label)
- Cada nodo permite edit via hover-actions
- Nodos siblings permiten drag-n-drop reorder
- View modal del nodo (click sobre el nombre) abre en modo read-only
- Validacion de weighted sum (si `validateWeightedSum: true`) sigue marcando padres invalidos

**Actor**: user.
**Layers**: frontend.

#### Scenario: edit y reorder de UV Ecuaciones Diferenciales

- **GIVEN** programa UV con 5 EvaluationComponents (seed)
- **WHEN** se entra al tab Evaluacion en mode edit
- **THEN** todos los comportamientos listados estan disponibles y los tests existentes (`detail-uv-evaluation-tree.md`, `edit-evaluation-tree-weight.md`, `reorder-evaluation-components.md`) pasan sin modificacion

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 5 | UV evaluation tree poblado | seed UV cargado | render tab Evaluacion | summary `+ Agregar` visible, 5 nodos con badges | tree.length === 5 |
| 6 | Drag handle visible en siblings | TC5 | hover nodo root | `.cst-node__drag-handle` visible | scenario existente reorder-evaluation-components pasa |
| 7 | Edit modal preserva valores | TC5 | click pencil icon de un nodo | modal abre con valores actuales | scenario existente edit-evaluation-tree-weight pasa |

### REQ-COVERAGE-01: cobertura cross-RT del componente custom

El sistema MUST tener tests automatizados que validen el empty state CTA para CUALQUIER `recordType`, no solo `EvaluationComponent`. Implementacion: Storybook story `EmptyEditable` parametrizada por recordType, ejecutada minimamente para `EvaluationComponent` y `LearningOutcome` (segundo consumer mas probable de tree pattern segun H7).

**Actor**: developer (dev futuro que cambie LearningOutcome u otro RT a tree pattern).
**Layers**: frontend (Storybook).

#### Acceptance
**El usuario puede verificar que funciona**: abrir Storybook (`npm run storybook --workspace=@uplanner/layout-engine` + path al mod) y ver dos stories nuevas: `EmptyEditable - EvaluationComponent` y `EmptyEditable - LearningOutcome`, ambas con el boton "+ agregar elemento" visible. Story `EmptyReadOnly - EvaluationComponent` muestra el empty SIN boton.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 8 | Story EmptyEditable EvaluationComponent | mock Apollo retorna [], enableEdit=true, recordType=EvaluationComponent | render | DOM contiene CTA, click dispara `openCreateRoot` | snapshot Storybook coincide |
| 9 | Story EmptyEditable LearningOutcome | mock Apollo retorna [], enableEdit=true, recordType=LearningOutcome | render | DOM contiene CTA (mismo copy, recordType cambia) | snapshot Storybook coincide |
| 10 | Story EmptyReadOnly EvaluationComponent | mock Apollo retorna [], enableEdit=false | render | DOM no contiene CTA | snapshot Storybook coincide |

### REQ-DIAG-01: instrumentation temporal removida tras fix

El sistema MUST quedar SIN debug attrs `data-cst-debug-*` ni `console.log('[CST_DEBUG]', ...)` despues de cerrar S2. Verificacion automatica en S3.GATE via grep.

**Actor**: system (grep CI / reviewer).
**Layers**: frontend.

#### Acceptance
**El usuario puede verificar que funciona**: `grep -rn "CST_DEBUG\|data-cst-debug" mods/curriculum-design/modsComponents/` retorna 0 matches al cerrar el ticket.

## Diagnostico

> Diagnostico inicial, refinado en S1 con evidencia empirica.

- **Sintoma**: el boton "Crear primer componente" del empty state del `composite-section-tree` NO se renderiza en la pestana Evaluacion del detail edit de un programa recien creado, aunque el codigo lo declara y el i18n existe.
- **Causa raiz preliminar**: el `v-if="enableEdit && ownerId"` en [CompositeSectionTreeElement.vue:67](../../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue#L67) evalua false en runtime. Una de las dos condiciones falla. Las 3 hipotesis candidatas (H1/H2/H3 del intake) no se distinguen sin inspeccion runtime.
- **Hipotesis status**: H5 ✓ confirmada (descarta path "agregar canCreateInitialData al JSON"). H1, H2, H3 abiertas — S1 las cierra con evidencia. H4, H6, H7 abiertas — informan scope de tests y backlog.
- **Por que no fue detectado antes**: el coverage existente (stories, LLM-e2e scenarios, integration tests) opero SIEMPRE sobre tree poblado. El scenario `create-section-flow.md` excluyo Evaluation explicitamente. Programas del seed (UV/AIEP) arrancan con EvaluationComponents precargados. Primer programa empty creado por el dev expuso el caso.
- **Impacto**: todos los programas nuevos sin seed pre-cargado quedan con tab Evaluacion bloqueado para creacion via UI. No hay workaround para el usuario salvo crear desde otro path (admin / seed / API directo).

## Fix scope

### Antes (comportamiento actual)

- Empty state del composite-section-tree muestra solo texto, sin CTA visible para crear el primer elemento.
- El boton existe en codigo pero queda oculto por gate `v-if="enableEdit && ownerId"`.
- Copy actual del boton (cuando aparece): "Crear primer componente".
- Coverage de tests: 0 stories empty-state, 0 scenarios LLM-e2e empty-create. El caso nunca se valida.

### Despues (comportamiento esperado)

- Empty state muestra boton "+ agregar elemento" cuando `enableEdit && ownerId-real` (no placeholder literal).
- Click dispara modal `CompositeSectionForm` en mode `create-root`.
- Submit crea el primer EvaluationComponent y refetch poblo el tree.
- Coverage: story `EmptyEditable` (parametrizada por recordType, instanciada para EvaluationComponent + LearningOutcome), story `EmptyReadOnly`, scenario LLM-e2e `evaluation-empty-create-first.md`.
- Debug instrumentation de S1 removida (grep limpio).

### Archivos afectados

| File | Change | Impact |
|------|--------|--------|
| `mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue` | S1: agregar 4 `data-cst-debug-*` attrs + `console.log('[CST_DEBUG]', ...)` en `onMounted/watch`. S2: aplicar fix (depende de hipotesis ganadora) + remover toda instrumentation. Si gana H1/H3: ajuste del gate o de la prop. Si gana H2: workaround consumiendo `route.params.id` cuando `ownerId === "{{parentId}}"`. S2 tambien actualiza el copy via i18n key | Sincroniza a `suite/modsComponents/` via `npm run sync`. Impacta a TODOS los consumidores del componente custom (manana LearningOutcome u otros) |
| `mods/curriculum-design/lang/es_CL.json` | Cambiar `compositeSectionTree.buttons.createFirst` de "Crear primer componente" a "+ agregar elemento". Aplicar tambien en otros locales si existen (`en_US.json`, etc.) | Cosmetico. Cero impacto funcional. Sincroniza a `suite/lang/` via sync |
| `mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTree.stories.ts` | Agregar 3 stories: `EmptyEditable - EvaluationComponent`, `EmptyEditable - LearningOutcome`, `EmptyReadOnly - EvaluationComponent`. Requieren mock Apollo que retorne `[]` para listInstances | Sin impacto runtime. Aporta coverage Storybook |
| `mods/curriculum-design/tests/llm-e2e/scenarios/evaluation-empty-create-first.md` | Crear scenario nuevo: precondicion (programa sin evaluation), navegacion, asserts del boton, click + assert del modal, screenshot before/after | Sin impacto runtime. Apoya REQ-FIX-01 y REQ-REGRESSION-01 |
| `mods/curriculum-design/tests/llm-e2e/scenarios/diagnose-empty-state-props.md` (S1 only) | Scenario de diagnosis automatizada: lee `data-cst-debug-*` attrs + console messages `[CST_DEBUG]`. Reporta valores de `enableEdit`, `ownerId`, `treeLength`, `ctaVisible`. **Removido o archivado en S2** porque el codigo que lee tampoco existira | Sin impacto runtime. Util solo durante S1 |
| `mods/curriculum-design/modsComponents/CompositeSectionTree/__tests__/empty-state.test.ts` | Tests unit con vue-test-utils + jsdom: 3 cases (CTA visible editable, CTA hidden read-only, CTA hidden con ownerId placeholder literal) | Sin impacto runtime. Aporta coverage barata pre-LLM-e2e |
| `mods/curriculum-design/docs/guides/composite-section-tree.md` | Actualizar seccion empty-state describing el contrato `enableEdit && ownerId` y el copy generico decidido. Anotar la trampa "coverage por seed oculto el caso" como lesson learned breve | Documentacion. Apoya teach-close eventual |

## Tasks

> Plan de sessions DET-20: 3 sessions cubriendo Diagnosis automatizada (S1), Patch + cleanup (S2), Cobertura (S3). El plan en el ticket markdown bajo `### Plan de sessions` refleja esto a alto nivel; aqui en el spec se detalla con task IDs y contracts.

### Session 1 — Diagnosis automatizada de causa raiz (H1/H2/H3) [tipo: ⚑ fuerte] [tier: T2]

> **Gate ⚑ fuerte**: decision humana requerida. El ganador de H1/H2/H3 cambia el approach de S2 (fix en mod vs escalar a platform). Sin decision explicita post-gate, S2 no arranca.

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S1.T1 | Agregar debug instrumentation TEMPORAL al SFC: 4 `data-cst-debug-*` attrs (`enable-edit`, `owner-id`, `tree-length`, `cta-visible`) en el container `.cst-card`, + `console.log('[CST_DEBUG]', JSON.stringify({...}))` en `onMounted` y en watcher del `ownerId`. Marcar el bloque con comentario `// TICKET-017 DIAG — remover en S2` para que sea trivialmente identificable | developer | — | `mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue` | DET-3, DET-8 | npm run sync OK + load Storybook OK | pending | 1 |
| S1.T2 | Crear scenario LLM-e2e `diagnose-empty-state-props.md`: precondicion (programa "Taller de ingles" o programa nuevo sin EvaluationComponent), nav a detail edit + tab Evaluacion, `evaluate_script` para leer `dataset` del `.cst-card`, `list_console_messages` para capturar entries `[CST_DEBUG]`, screenshot before, REPORTAR valores exactos | developer | S1.T1 | `mods/curriculum-design/tests/llm-e2e/scenarios/diagnose-empty-state-props.md` | DET-3, DET-7 | scenario corre completo y reporta los 4 valores | pending | 1 |
| S1.T3 | Ejecutar scenario S1.T2. Capturar los valores exactos de `enableEdit`, `ownerId`, `treeLength`, `ctaVisible`. Determinar hipotesis ganadora: H1 (gate falla), H2 (ownerId placeholder no interpolado), H3 (enableEdit false), o causa nueva | researcher | S1.T2 | — | DET-4, DET-5 | reporte con valores reales + hipotesis ganadora documentada | pending | 1 |
| S1.T4 | Validacion cross: ejecutar el mismo scenario contra UV Ecuaciones Diferenciales (tree poblado) para confirmar que en ese caso `enableEdit && ownerId` evalua truthy y el `summary + addRoot` aparece. Sirve de baseline | researcher | S1.T3 | — | DET-5, DET-7 | dump comparativo empty vs poblado | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions` del ticket el dump empty + poblado, hipotesis ganadora con evidencia, decision continue/iterate/escalate. Si gana H2: escalate (escribir issue paralelo para platform UP1, definir workaround dentro del mod). Si gana H1 o H3: continue a S2. Si emerge causa nueva: iterate y volver a S1.T2 con scenario extendido | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | DET-20, DET-14 | gate persistido + decision documentada | pending | 1 |

### Session 2 — Patch + cleanup de debug instrumentation [tipo: auto] [tier: T2]

> Gate `auto`: continue si tests verdes + coverage no baja + grep de CST_DEBUG limpio. Si la causa raiz quedo `escalate` en S1.GATE, S2 cambia su contenido (workaround temporal + issue paralelo) pero el shape de tasks se mantiene.

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S2.T1 | Aplicar fix segun ganador de H1/H2/H3: <br/>**Si H1/H3 (mod)**: ajuste targeted del SFC. Caso H3 (enableEdit no llega): revisar declaracion del element en el layout JSON (`evaluationList` schema) — Vueform puede requerir `type-cast` explicito del flag. Caso H1 (otra condicion): documentar y arreglar. <br/>**Si H2 (LayoutOrchestrator)**: workaround en el SFC — cuando `ownerId === "{{parentId}}"`, consumir `route.params.id` via `useRoute()` dentro del setup como fallback. Validador en la prop loguea warning. + Crear issue Jira paralelo bajo UPONE-1038 para fix en core platform | developer | S1.GATE | `mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue` | DET-5, DET-8, DET-10, DET-11 | repro manual del bug pasa (boton aparece) | pending | 2 |
| S2.T2 | Cambiar copy del CTA: i18n key `compositeSectionTree.buttons.createFirst` de "Crear primer componente" a "+ agregar elemento" en `es_CL.json`. Replicar en otros locales si existen. NO renombrar el key — el nombre simbolico sigue siendo coherente con el componente | developer | — | `mods/curriculum-design/lang/es_CL.json` (+ otros locales) | DET-8 | npm run sync OK, render Storybook muestra el nuevo copy | pending | 2 |
| S2.T3 | **CLEANUP**: remover toda la instrumentation agregada en S1.T1 (data-attrs + console.log + comentarios `// TICKET-017 DIAG`). Verificacion `grep -rn "CST_DEBUG\|data-cst-debug\|TICKET-017 DIAG" mods/curriculum-design/modsComponents/` retorna 0 matches. Archivar el scenario `diagnose-empty-state-props.md` (mover a `tests/llm-e2e/scenarios/_archive/` o eliminar — decision: archivar para preservar evidencia historica) | developer | S2.T1 | `mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue`, `mods/curriculum-design/tests/llm-e2e/scenarios/diagnose-empty-state-props.md` | DET-3, DET-8 | grep limpio | pending | 2 |
| S2.T4 | Tests unit con vue-test-utils para el gate del SFC: 3 cases (CTA visible editable, CTA hidden read-only, CTA hidden con ownerId placeholder literal). Mock de `useTenantApolloClient` retorna `items: []` | developer | S2.T1 | `mods/curriculum-design/modsComponents/CompositeSectionTree/__tests__/empty-state.test.ts` | DET-7 | `npm test --workspace=...mod -- empty-state` verde, 3/3 | pending | 2 |
| S2.T5 | Re-ejecutar suite completa del mod para regression. Sin coverage delta > 0.5% negativo respecto al baseline previo | developer | S2.T1, S2.T2, S2.T3, S2.T4 | — | DET-7 | `npm run test:integration --workspace=...mod` + coverage report verde | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir en `## Sessions`: archivos cambiados, decision sobre H1/H2/H3 aplicada, tests passing, coverage delta. Auto-continue si todo verde + grep limpio. Si emerge regresion en otro test: iterate y diagnosticar | reviewer | S2.T1..T5 | ticket | DET-20, DET-13 | gate persistido + tests verdes + grep limpio | pending | 2 |

### Session 3 — Cobertura cross-RT + lesson learned [tipo: ⚑ fuerte] [tier: T3]

> Gate ⚑ fuerte: el cierre del ticket requiere decision humana sobre lesson learned (rule del modulo? decision documentada?) y validacion empirica final del user-facing change. T3: regression completa + LLM-e2e + screenshots before/after.

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S3.T1 | Extender `CompositeSectionTree.stories.ts` con 3 stories nuevas: `EmptyEditable - EvaluationComponent`, `EmptyEditable - LearningOutcome`, `EmptyReadOnly - EvaluationComponent`. Cada una con mock Apollo via decorator que retorna `items: []`. Las dos editables muestran el CTA "+ agregar elemento"; la read-only solo el texto | developer | S2.GATE | `mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTree.stories.ts` | DET-7, DET-16 | Storybook compila + visual review de 3 stories | pending | 3 |
| S3.T2 | Crear scenario LLM-e2e `evaluation-empty-create-first.md`: precondicion (programa "Taller de ingles" o programa empty creado on-the-fly via mutation), nav a detail edit + tab Evaluacion, screenshot "before-empty-cta-visible.png", click boton, screenshot "after-modal-open.png", completar form con valores minimos, submit, screenshot "after-first-node-created.png". Asserts del DOM en cada paso | developer | S2.GATE | `mods/curriculum-design/tests/llm-e2e/scenarios/evaluation-empty-create-first.md` + `tickets/TICKET-017.screenshots/` | DET-7 | scenario corre completo, 3 screenshots archivados | pending | 3 |
| S3.T3 | Re-ejecutar scenarios LLM-e2e existentes que tocan Evaluation: `detail-uv-evaluation-tree.md`, `edit-evaluation-tree-weight.md`, `reorder-evaluation-components.md`. Confirmar que siguen passing — el cambio de copy y el ajuste del gate no introducen regresion en flujos poblados | researcher | S3.T1, S3.T2 | — | DET-7 | 3 scenarios passing, screenshots actualizados si UI cambio | pending | 3 |
| S3.T4 | Crear `RULE-curriculum-design-001` (o RULE-mods generico, segun decision del gate) que documente: "todo custom Vueform element con empty state editable DEBE tener story Storybook `EmptyEditable` que demuestre el CTA visible con datos vacios". Razon: prevenir regresion del bug. Promover el learn al KB | reviewer | S3.T1 | `projects/up1/rules/curriculum-design/` o `projects/up1/rules/mods/` | DET-1, DET-2, DET-16 | rule creada + indexada | pending | 3 |
| S3.T5 | Actualizar `mods/curriculum-design/docs/guides/composite-section-tree.md`: seccion "Empty state" describiendo el contrato (`enableEdit && ownerId` con UUID real, no placeholder literal), copy del CTA, ejemplos de uso correcto desde un layout JSON. Anotar la trampa "coverage por seed oculto el caso" como lesson learned | scribe/developer | S3.T4 | `mods/curriculum-design/docs/guides/composite-section-tree.md` | DET-16 | doc actualizado, ejemplo de uso correcto presente | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** — persistir en `## Sessions` del ticket: scenarios passing, screenshots archivados, rule creada/decision tomada, doc actualizado. Decision humana: promover lesson learned a rule global del mod / decision local del ticket / ambas. Validacion empirica final: el dev confirma manualmente en UPU el flujo completo de Taller de ingles. Continue → request-close (DET-22 produce teach-close antes de status: closed) | reviewer | S3.T1..T5 | ticket | DET-20, DET-13, DET-14, DET-16 | gate persistido + acceptance checkpoints firmados | pending | 3 |

### Task contract

> Cada task del listado anterior asume el contract template del spec. Tasks criticas (las que tocan codigo) detallan rollback y rules explicitas:

```
Task S1.T1: Agregar debug instrumentation TEMPORAL
- source_ref: REQ-DIAG-01
- agent: developer
- files: CompositeSectionTreeElement.vue
- precondition: sync del mod limpio, Storybook compila
- expected_output: SFC con data-cst-debug-* attrs + console.log [CST_DEBUG] gateado solo por DEV — bloque marcado con comentario "// TICKET-017 DIAG — remover en S2"
- validation: npm run sync OK, Storybook compila, scenario LLM-e2e diagnose-empty-state-props.md (S1.T2) puede leer los valores
- rollback: revertir el bloque de instrumentation (single commit), no afecta otros archivos
- rules: [DET-3, DET-8]
```

```
Task S2.T1: Aplicar fix segun ganador de H1/H2/H3
- source_ref: REQ-FIX-01
- agent: developer
- files: CompositeSectionTreeElement.vue (+ posible workaround si H2 gana)
- precondition: S1.GATE cerrado con hipotesis ganadora documentada
- expected_output: repro del paso 1-6 del ticket pasa — boton aparece y dispara modal
- validation: scenario manual + scenario LLM-e2e evaluation-empty-create-first.md (S3.T2)
- rollback: git revert del commit del fix. Si hubo workaround para H2, tambien cerrar issue paralelo en Jira como "no aplica — issue platform original resuelve"
- rules: [DET-5, DET-8, DET-10, DET-11]
```

```
Task S2.T3: CLEANUP de instrumentation
- source_ref: REQ-DIAG-01
- agent: developer
- files: CompositeSectionTreeElement.vue, tests/llm-e2e/scenarios/diagnose-empty-state-props.md
- precondition: S2.T1 completada (fix aplicado, no se necesita seguir leyendo valores)
- expected_output: grep limpio (0 matches CST_DEBUG/data-cst-debug/TICKET-017 DIAG)
- validation: grep -rn en mods/curriculum-design/modsComponents/ + suite/modsComponents/ post-sync
- rollback: no aplica — es trabajo aditivo, su rollback es no haberlo hecho
- rules: [DET-3, DET-8]
```

## Constraints

- **DET-3 (immutability del request)**: el request original del ticket (TICKET-017 Request section) NO se reescribe. Nuevos hallazgos van a Triage o sessions.
- **DET-5 (verificacion multi-capa)**: la diagnosis de S1 inspecciona frontend (DOM + Vue runtime via debug attrs + console) y meta (LayoutOrchestrator behavior). No se confirma hipotesis sin evidencia de la capa donde aplica.
- **DET-7 (regression obligatoria)**: REQ-REGRESSION-01 cubre lo que ya funcionaba. Tests existentes de Evaluation deben seguir passing en S3.
- **DET-8 (rollback documentado)**: todas las tasks que tocan codigo (S1.T1, S2.T1, S2.T3, S3.T1) tienen rollback definido.
- **DET-10 (limites por rol)**: developer no expande scope. Si S2.T1 emerge complejidad mayor (ej. fix requiere tocar 5 archivos del platform), escalate inmediato en S2.GATE — no continue silenciosamente.
- **DET-11 (KB-first)**: rules consultadas — ninguna en `rules/curriculum-design/` (modulo sin rules todavia). Rules de platform/mods globales aplicables: ninguna especifica al composite-section-tree.
- **DET-16 (propagacion)**: el cambio toca SFC, lang, stories, scenarios, doc. Tambien S3 puede crear rule. Cobertura propagacion explicita en S3.T5 (doc).
- **DET-19 (external id en repo)**: branches y commits usan `UPONE-1038-*` (frontmatter del ticket). NO `TICKET-017-*`.
- **DET-20 (sessions + gates)**: las 3 sessions con sus gates ya documentadas arriba.
- **DET-22 (teach-close)**: request-close producira `tickets/TICKET-017.teach/teach-close.md` antes de marcar `status: closed`.
- **Global rule (CLAUDE.md project)**: "Nunca modificar core workspace files when the change belongs in a mod". Si gana H2, NO tocar `up1/layout/src/layouts/LayoutOrchestrator.vue` — workaround en el mod + issue paralelo a platform UP1.
- **Memoria `feedback_llm_e2e_approach`**: LLM-e2e con chrome-devtools MCP es el patron validado del modulo. NO usar Playwright + Clerk.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Sync mechanism del mod | internal | `npm run sync` despues de cambios en `mods/curriculum-design/` para que se reflejen en `suite/modsComponents/` y `suite/lang/` | si falla, S1/S2/S3 no ven el cambio en runtime — diagnosticar con `npm run sync:verbose` |
| chrome-devtools MCP server activo | internal-tool | scenarios LLM-e2e dependen de la conexion al MCP del navegador local | si cae, ejecutar manual con instrucciones del scenario como fallback |
| Tenant UPU activo con programa empty creable | internal | el dev necesita un programa sin EvaluationComponent. "Taller de ingles" sirve si todavia esta; sino crear uno nuevo on-the-fly | bajo, controlable desde la UI |
| LayoutOrchestrator core platform (solo H2 path) | external (otro equipo) | si gana H2, el fix definitivo lo debe hacer platform UP1 | medio-alto — workaround del mod cubre meanwhile, pero el fix permanente sale del control de este ticket |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Causa raiz fuera del mod (H2 gana) duplica el alcance de S2 | medium | medio (alcance +50% en S2) | Plan B en S2.T1 ya redactado: workaround dentro del mod + issue paralelo. Time-boxed |
| Debug instrumentation olvidada en production | low | medio (debug logs visibles, dataset attrs leaked) | S2.T3 explicito + S3.GATE valida grep limpio + considerar pre-commit hook futuro |
| Cambio del copy rompe consumer externo del i18n key | very low | low | Grep previo: i18n key `compositeSectionTree.buttons.createFirst` solo se usa en el SFC del componente — no hay consumidores externos confirmado |
| Tests unit nuevos (S2.T4) capturan jsdom edge cases que difieren de runtime real | low | low | LLM-e2e en S3 cubre el runtime real, jsdom solo es pre-filtro barato |
| H4 gana (no es bug, es solo coverage) — S2.T1 queda sin trabajo de fix | very low | low (positivo) | S1 detecta esto: si `ctaVisible: true` aparece en algunos casos y no en otros, registrar como flake reproducible y validar con multiple reload pre-fix |
| Cambio cross-RT en S3 introduce regresion en otros consumers no obvios | very low | medium | Grep de consumers de `composite-section-tree` antes de S3.T1 — confirmar que solo el layout `default_AcademicActivity_edit` usa el element |

## Open questions

- [ ] **Locales adicionales (`en_US.json`, `pt_BR.json`, etc.)** — ¿existen? Confirmar en S2.T2 con `ls mods/curriculum-design/lang/`. Si existen, replicar el cambio de copy en todos.
- [ ] **¿Rule cross-mod o rule local al mod?** S3.T4 crea una rule. Decidir scope: si solo aplica a custom Vueform elements de `curriculum-design`, es local. Si aplica a cualquier mod que use Vueform elements custom, es global (`rules/mods/`).
- [ ] **¿Texto del empty state ('Este programa no tiene componentes de evaluacion cargados.') necesita ajuste tambien?** H6 abierta. Decision en S3 basada en screenshot de UX final.

## Decisions

> Tomadas en intake (ver `tickets/TICKET-017.teach/teach-intake.md > Decision drivers`):

### DEC-LOCAL-01: Asociar al epic UPONE-1038 en vez de crear Jira nuevo o reabrir UPONE-1035

- **Contexto**: evaluar donde rastrear el bug
- **Drivers**: trazabilidad cross-team (high) + integridad cierre SP2 (high)
- **Opcion elegida**: Issue nuevo bajo UPONE-1038 (cuando se cree). Frontmatter del ticket usa `external: UPONE-1038` mientras el issue concreto no exista
- **Alternativas**: reabrir UPONE-1035 (rompe SP2 cierre) o quedar solo en DKC (perjudica trazabilidad)
- **Consecuencias**: branches con prefijo `UPONE-1038-*` (DET-19), commits y PRs igual
- **Session**: intake

### DEC-LOCAL-02: Copy del CTA "+ agregar elemento" (generico, no especifico de Evaluation)

- **Contexto**: definir copy del boton del empty state
- **Drivers**: alineacion con CTAs del resto del layout (high) + concision (high) + cross-RT futuro (medium)
- **Opcion elegida**: "+ agregar elemento"
- **Alternativas**: "Crear primer componente" (default actual, verbose), "Agregar primer componente de evaluacion" (verbose, no cross-RT)
- **Consecuencias**: i18n key generico — sirve para Evaluation y LearningOutcome futuro sin renombrar
- **Session**: intake

### DEC-LOCAL-03: Diagnosis automatizada hibrida (data-attrs + console.log), TEMPORAL

- **Contexto**: como inspeccionar valores de `enableEdit` y `ownerId` en runtime sin Vue DevTools manual
- **Drivers**: automatizacion (high), reproducibilidad (high), simplicidad de la traversal (medium)
- **Opcion elegida**: data-attrs `data-cst-debug-*` + `console.log('[CST_DEBUG]', ...)` en el SFC, vida util TEMPORAL — S2.T3 los remueve. Scenario LLM-e2e `diagnose-empty-state-props.md` los lee
- **Alternativas**: evaluate_script puro con Vue runtime traversal (fragil con Vueform), debug permanente con flag (decision dev: no)
- **Consecuencias**: S1 implica cambio de codigo aditivo + scenario nuevo. S2 obligatoriamente incluye cleanup + grep validation
- **Session**: intake

## Success metrics

> No aplica para fixes menores. Excepcion: si en production se observan otros programas empty con tab Evaluacion sin uso, monitorear creacion del primer EvaluationComponent en programas nuevos como signal de UX recuperada.

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Bug recurrence en programas empty | N/A (caso no medido) | 0 reportes post-fix | Logs/feedback en Jira UPONE-1038 |

## Technical reference

- **Empty state SFC**: [CompositeSectionTreeElement.vue:64-75](../../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue#L64) — branch del v-else-if + gate del boton
- **Composable owner resolution**: [useCompositeSectionTree.ts:87-100](../../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/useCompositeSectionTree.ts#L87) — `resolveOwnerId()` returns null si falsy, sino el valor (string o Ref.value)
- **Submit del form (create-root flow)**: [CompositeSectionTreeElement.vue:413-437](../../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue#L413) — mutation `CREATE_INSTANCE` con payload de `buildCreatePayload`
- **Interpolacion `{{parentId}}`**: [LayoutOrchestrator.vue:490-545](../../../uplanner/up1/layout/src/layouts/LayoutOrchestrator.vue#L490) — recursivo, gated by `props.instanceId`
- **i18n key**: [es_CL.json:9](../../../uplanner/up1/mods/curriculum-design/lang/es_CL.json#L9) — `compositeSectionTree.buttons.createFirst`
- **Stories existentes**: [CompositeSectionTree.stories.ts](../../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTree.stories.ts) — `LearningOutcomes`, `EvaluationComponents`, `ReadOnly` (todas poblado)
- **Scenarios LLM-e2e Evaluation poblados**: `detail-uv-evaluation-tree.md`, `edit-evaluation-tree-weight.md`, `reorder-evaluation-components.md`
- **Doc del componente**: [composite-section-tree.md](../../../uplanner/up1/mods/curriculum-design/docs/guides/composite-section-tree.md)
- **Sync mechanism**: `npm run sync --workspace=@uplanner/object-management-backend` propaga `mods/curriculum-design/modsComponents/` → `suite/modsComponents/`. Sin sync, los cambios no se ven en runtime

## Rules discovered

> Se llena en execute. Posible rule a crear en S3.T4 (ya planeada).

- (pendiente — RULE-curriculum-design-001 sobre Storybook coverage de empty states en custom Vueform elements)

## Bugs found

> Se llena si emerge bug platform en S1.

- (pendiente — BUG-platform-XXX si gana H2 y se confirma interpolacion `{{parentId}}` falla en LayoutOrchestrator)

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-FIX-01 (TC1-TC4), REQ-REGRESSION-01 (TC5-TC7) y REQ-COVERAGE-01 (TC8-TC10) todos pasan
- [ ] **Tests**: `npm test --workspace=...mod -- empty-state` verde + LLM-e2e `evaluation-empty-create-first` passing
- [ ] **NFRs**: no aplica
- [ ] **Rules**: RULE-curriculum-design-001 creada y promovida (S3.T4)
- [ ] **Integration**: scenarios LLM-e2e existentes (`detail-uv-evaluation-tree`, `edit-evaluation-tree-weight`, `reorder-evaluation-components`) siguen passing
- [ ] **Docs**: `composite-section-tree.md` actualizado con seccion empty state + ejemplo correcto + lesson learned (S3.T5)
- [ ] **Cleanup**: `grep -rn "CST_DEBUG\|data-cst-debug\|TICKET-017 DIAG" mods/curriculum-design/modsComponents/` retorna 0 matches (S2.T3 + S3.GATE)
- [ ] **Decision externa (solo si gana H2)**: issue paralelo en Jira con bug del LayoutOrchestrator creado y vinculado a UPONE-1038
