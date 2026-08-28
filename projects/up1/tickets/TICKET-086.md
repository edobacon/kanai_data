---
id: TICKET-086
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1349
module: curriculum-design
autopilot: autonomous
---

# Malla — Agregar y editar asignaturas (obligatorias + electivas)

> **MC-06** ⭐ (el FE más grande) · Épica Jira [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) (track interno "B") · Tier 🅼 Must (electivas 🆂 Should) · 8 SP · repo `mod` (FE) · Fase F2.
> **Pre-spec (fuente de design):** [`sp5/prespecs/MC-06.md`](../../../../uplanner/specs/up1/sp5/prespecs/MC-06.md) — transcrito abajo. El SPEC formal DKC se crea al tomar el ticket (design-feature), transcribiendo REQ/tasks 1:1.

## ⛔ Gate de inicio — dependencias

> **1 dev, ejecución en serie.** Antes de iniciar design / `request-execute`, verificar que cada bloqueante esté `status: closed` (frontmatter `depends_on` + relaciones `depends_on` en HC; `dkc_read_frontmatter`). Si alguna NO está `closed`: **NO iniciar este ticket** — bloquear y avisar al dev (DET-30 guarda de inicio).

| Bloqueante | Aporta | Debe estar |
|---|---|---|
| [TICKET-082](TICKET-082.md) (MC-02) | planEntry | closed |
| [TICKET-083](TICKET-083.md) (MC-03) | requirement Group (bloques electivos) | closed |
| [TICKET-085](TICKET-085.md) (MC-05) | componente base de malla | closed |

## Request

Como diseñador curricular, quiero agregar cursos obligatorios y electivos del catálogo y editar los ya colocados, para poblar y ajustar la malla.

Agrupa B4 + B5 + B7 (handoff). Modal de alta en 2 pasos (Obligatoria/Opcional → picker de Activity con filtro por departamento + multiselección que oculta cursos ya colocados y muestra isCurrent); obligatorias crean planEntry kind=Course sin blockId con categoría/línea opcional en masa y créditos heredados; electivas (Should) usan select-suggest para elegir bloque existente o crear/nombrar uno nuevo (tagging, no edición; precarga cursos del bloque; minToSatisfy auto-derivado; label por input de texto); modal editar/quitar (créditos override, línea, Rol Obligatoria/Electiva→bloque, "Quitar de la malla"). Modales caseros (átomo Modal); select-suggest = Vueform SelectElement search+create + useOwnerIdOptions (REUSAR).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | UI (modales de alta/edición + picker de catálogo + select-suggest de bloque) |
| Modulo principal | curriculum-design |
| Modulos afectados | curriculum-design (mod-only); picker filtra por OrgUnit (cross-mod uengagement-up1) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | sí | modales nuevos → draft visual recomendado al tomar (DET-18); maqueta ya existe (UPONE-1272, mockup 763–862) |
| Data model | no | crea/edita planEntry y tag de bloque (objetos de MC-02/03) |

## Triage

REQs **confirmados**. Núcleo Must (obligatorias + editar) + electivas Should. Reuso clave: select-suggest Vueform (no construir). Restricción: modales caseros por BUG-platform-011 (ModalStackManager no se expone a Vueform elements).

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El select-suggest (Vueform search) renderiza dentro del modal casero (atomo Modal) | ✓ confirmed (con matiz) | A favor: `layout/.../Modal/Modal.stories.ts:1113-1127` muestra `<Vueform>` + Multiselect `search:true` rindiendo DENTRO del Modal casero (Teleport-to-body, no depende de ModalStackManager). Precedente form casero: `CompositeSectionTreeElement.vue:131-154`. **Matiz (→H1.2)**: `create:true` puede invocar el ModalStackManager de Vueform (BUG-platform-011). Validacion empirica del render standalone sigue siendo primer paso de S3/T4. |
| H1.1 | `useOwnerIdOptions` se reusa tal cual para poblar bloques `requirement(Group)` del plan | ✗ refuted | `mods/curriculum-design/modsComposables/useOwnerIdOptions.ts:53` esta **hardcodeado a AcademicProgram/Institution** (no filtra `requirement` por curriculum). Hay que crear un composable analogo (ej. `useBlockOptions`) que liste `requirement` con `recordType=Group, ownerType=curriculum, ownerId=planId` via `listInstances`, siguiendo el patron de `useCurriculumMesh.ts`. Corrige el supuesto de RULE-cd-015. |
| H1.2 | El flujo "crear bloque nuevo" usa Vueform `create:true` | ✓ confirmed (spike S3.T1) | **Veredicto del spike: `create:true` OK** — self-contained: `createdOption` es un computed local del multiselect (`@vueform/multiselect/.../useOptions.js:110-111`), `handleTag` solo dispara el event bus interno de Vueform; NO toca el `ModalStackManager` (BUG-platform-011 descartado). Evidencia: `AllInputsModal.vue:261-269` ya usa `create:true` en modal + `Modal.stories.ts:1113-1127`. Story `SpikeS3T1SelectSuggestElectiva` agregada. Sin fallback necesario. |
| H2 | El picker de Activity reusa un composable existente | ✗ refuted | No existe `useActivityPicker` en el mod. Build: `listInstances(name:"Activity", filters:[executionUnitId EQUALS orgUnitId, isCurrent EQUALS true])` siguiendo `useCurriculumMesh.ts`. La exclusion de agregados se hace en cliente contra los planEntry del plan (REQ-03). |

### Context found

**KB del módulo (kb_refs: DEC-031, RULE-cd-014, RULE-cd-015, deltas §3):**
- modales **caseros** (átomo `Modal`) por BUG-platform-011 — patrón `CompositeSectionTree`.
- **select-suggest se reusa, no se construye**: Vueform `SelectElement` `search:true`+`create:true` + opciones remotas vía `useOwnerIdOptions` (deltas-transcript-vs-mockup.md §3).

**Necesidad/reuso (DET-32):** modales y flujos = build; select-suggest = **reuse** (Vueform nativo); picker de catálogo = build sobre `listInstances` de Activity.

**Supuestos / deltas del transcript (que la maqueta no cubría):** flujo obligatoria simple vs electiva con bloque; tagging (no edición de bloque); picker oculta agregados; `minToSatisfy` auto-derivado; label = input de texto.

**Capa codigo (intake-explore, agente Explore sonnet — refs `path:line`):**
- **Componente base MC-05**: `mods/curriculum-design/modsComponents/CurriculumMesh/CurriculumMeshElement.vue` — props `planId`, `enableEdit` (gated por `Curriculum.status === 'Draft'`), `title`. Stub de alta `onAddPlaceholder(idx+1)` en `:192`; boton de alta `disabled` en `:128-139` (MC-06 lo habilita + cablea modal). Logica pura en `curriculumMesh.logic.ts` (+`.spec.ts`); composable `useCurriculumMesh.ts`.
- **Atomo Modal casero**: `layout/src/components/molecules/Modal/Modal.vue` — `v-model` de visibilidad, props `title/size/scrollable/...`, slots default/`#header`/`#footer`, `<Teleport to="body">`. Patron de uso: `CompositeSectionTreeElement.vue:131-154` (`modalState` reactive + `openCreate/openEdit/closeModal`). Import desde `'../../components/molecules'`.
- **search+create precedente**: `layout/.../AllInputsModal.vue:261-269` (`type:'tags'`, `search+create`); `layout/.../Select-vueform/Select.stories.ts:42-58` (`type:'select', search:true`).
- **planEntry (MC-02)**: `createInstance(objectType:"planEntry", data:{planId, activityId, period, position, categoryId?, blockId?, credits?, kind:'Course'})`. Schema `object-manager/.../dynamic.js:711-732`. Read enrichment (`curriculum-read.resolver.js:185-225`) agrega `effectiveCredits = credits ?? Activity.credits` e `isElective = blockId != null`.
- **requirement Group (MC-03)**: `createInstance(objectType:"rt__Group__requirement", data:{ownerType:'curriculum', ownerId:planId, parentId:null, recordType:'Group', effect, label, combinator:'OR', minToSatisfy, isHardRule:false, position})`. Schema `dynamic.js:764-781` + `:2133-2152`. Sin resolver custom de create → pasa por `createInstance` del platform.
- **Picker Activity**: `Activity.isCurrent` (`dynamic.js:65`) + `Activity.executionUnitId` → `OrgUnit`. `listInstances(name:"Activity", filters:[{executionUnitId EQUALS orgUnitId},{isCurrent EQUALS true}], limit)`. No hay composable → build `useActivityPicker` segun patron `useCurriculumMesh.ts`.
- **Tests**: Vitest (`vitest run` / `pnpm test` en el mod). Config `mods/curriculum-design/vitest.config.ts`. Logica pura → `*.logic.spec.ts` (env node); tests de componente Vue → `@vitest-environment jsdom`. Mock Apollo: `vi.mock('@/composables/useApolloClient', () => ({ useTenantApolloClient: () => ({ query: mockQuery }) }))`. Stubs en `tests/stubs/{atoms,molecules,useApolloClient}.ts`. Specs de referencia: `CurriculumMesh/curriculumMesh.logic.spec.ts`, `tests/integration/use-composite-section-tree.test.ts`.

## Pre-spec (transcrito de MC-06.md)

### Requisitos (REQ)

| REQ | Certeza | source_ref | Enunciado |
|-----|---------|-----------|-----------|
| REQ-01 · modal de alta en 2 pasos | confirmed | reunión 00:04:49/00:06:10 + mockup 763–817 | Paso 1 = tipo (Obligatoria/Opcional); Paso 2 = picker de Activity (buscar + filtro depto + multiselección). |
| REQ-02 · flujo obligatoria + línea en masa | confirmed | reunión 00:39:19/00:40:25 | línea de formación opcional aplicada en masa; crea planEntry (kind=Course) sin blockId, con categoryId (si hay línea) + créditos heredados. |
| REQ-03 · picker oculta cursos ya agregados | confirmed | reunión 00:26:58 | excluir Activity con planEntry ya en el plan; muestra/filtra `isCurrent`. |
| REQ-04 · filtro por departamento | confirmed | reunión 00:06:10 | picker filtra por `Activity.executionUnitId` → `OrgUnit` (cross-mod uengagement-up1). |
| REQ-05 · electiva: bloque existente o nuevo (select-suggest) (🆂) | confirmed | reunión 00:17:02/00:22:41 + deltas §1 | seleccionar bloque existente del plan o crear/nombrar nuevo (Vueform search+create, opciones de `requirement(Group, ownerType=curriculum)` vía useOwnerIdOptions). |
| REQ-06 · tagging, no edición del bloque (🆂) | confirmed | reunión 00:22:41/00:25:45 | crear planEntry con blockId; el bloque se crea/crece como consecuencia, no se edita directo. Bloque independiente de la línea (entry puede tener categoryId Y blockId). |
| REQ-07 · precarga de bloque + minToSatisfy auto (🆂) | confirmed | reunión 00:24:35/00:28:18 | al elegir bloque existente precarga sus cursos; minToSatisfy auto-derivado del conteo (default=total, ajustable); label por input de texto. |
| REQ-08 · editar / quitar un planEntry | confirmed | handoff MC-CMP-7 + mockup 837–862 | modal: créditos override, línea, Rol (Obligatoria/Electiva→bloque), "Quitar de la malla". Rol→Electiva setea blockId; →Obligatoria lo limpia; cambiar categoría no afecta electividad. |

### Tasks previstas (con rollback)

| # | Task | Rollback |
|---|------|----------|
| T1 | modal 2 pasos (casero) — paso 1 tipo+línea, paso 2 picker (REQ-01,02,04) | quitar modal |
| T2 | picker: query Activity + filtro depto + exclusión de agregados + `isCurrent` (REQ-03,04) | revertir |
| T3 | lógica de alta obligatoria → planEntries (REQ-02) en `.ts` + `.spec.ts` | revertir |
| T4 | select-suggest de bloque (Vueform search+create + useOwnerIdOptions); validar render en modal casero (REQ-05) | quitar selector |
| T5 | tagging electivo: crear/crecer bloque, precarga, minToSatisfy auto, label (REQ-06,07) | revertir |
| T6 | modal editar/quitar (REQ-08) | quitar modal |

### Dependencias

- **Depende de:** MC-02 (planEntry) + MC-03 (requirement Group, A4) + MC-05 (componente base).
- **Patrón:** `CompositeSectionTree` (modales caseros); `AllInputsModal.vue:265` (search+create); `useOwnerIdOptions`.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1267-sp5` en `mods/curriculum-design` (creada desde `develop`; mod-only; nunca `develop`/`main`) — RULE-dev-004 |
| Base branch | `develop` |
| DB state | UPU con MC-02/03 + seed (catálogo de Activity, bloques) |
| Services | suite (storybook + render), object-manager (GraphQL del mod) |
| Test data | catálogo de Activity con departamentos; bloque electivo de seed |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | `useOwnerIdOptions` esta hardcodeado a AcademicProgram/Institution (`useOwnerIdOptions.ts:53`) — NO sirve para poblar bloques `requirement(Group)` por curriculum. Hay que crear un composable hermano (`useBlockOptions`) sobre `listInstances` filtrando `recordType=Group, ownerType=curriculum, ownerId=planId`. Corrige el supuesto de RULE-cd-015. | intake-explore (Explore sonnet) | S0 | refined | RULE-curriculum-design-015 (enmendada) |
| L2 | El select-suggest no necesita Vueform `create:true` (riesgo ModalStackManager / BUG-platform-011): basta `search:true` para elegir bloque existente + input de texto para nombrar uno nuevo, que ademas cumple REQ-07/delta D-1 (label por input de texto). Sidestep del unico riesgo de integracion. **NOTA: el dev opto por `create:true` (draft v1) — el riesgo vuelve a estar abierto; spike bloqueante en S3/T4. Input de texto queda como fallback.** | intake-explore (Explore sonnet) | S0 | discarded | superado (dev opto create:true; resuelto en MC-06) |
| L3 | `categories` (`CategoryVM[]`) ya viene del composable `useCurriculumMesh`; el adapter las mapea a `{key,name}` para el modal. La fuente de lineas de formacion ya existe → S2 (linea en masa) la reusa. | developer | S1 | discarded | nota de implementacion |
| L4 | El vitest del mod corre en `environment: 'node'` sin `@vitejs/plugin-vue` (molecules aliasadas a stubs) → los `.vue` no se montan; patron del mod = extraer logica a `.ts`+`.spec.ts`. Deps de test de componente (`@vue/test-utils`, `@vitejs/plugin-vue`, `jsdom`) instaladas en el root del monorepo pero no registradas en el vitest del mod (gap pre-existente, transversal al mod). | developer | S1 | refined | RULE-curriculum-design-026 |
| L8 | `create:true` de Vueform (SelectElement/TagsElement) es self-contained: `createdOption` es computed local, no toca el `ModalStackManager` → seguro dentro del modal casero del mod. Resuelve H1.2 sin fallback. | spike S3.T1 | S3 | **refined** | **RULE-curriculum-design-024** |
| L10 | `createInstance` de un RecordType requiere `objectType='rt__{RT}__{base}'` (ej. `rt__Group__requirement`); con el nombre base plano no se crea la fila RT. `listInstances` usa el base + filtro `recordType`. Asimetria create-vs-list. | dual-judge S4 | S4 | **refined** | **RULE-platform-018** |
| L14 | Tests verdes (vitest/esbuild) NO garantizan tipos ni integracion: correr `vue-tsc` + verificar el contrato backend (schema/seed) en gates de tasks UI, no solo vitest. | DET-33 S5 | S5 | **refined** | **RULE-mods-052** |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-06-30 | (ausente) → super | trigger dev "086 super autopilot" | intake-explore (proximo gate) |

### Plan de sessions (preplanificacion)

5 sessions previstas. **Esqueleto producido por `intake-explore`.** El detalle final
(tasks asignadas, gate criteria especificos) lo completa `design-feature` al generar el spec.
Cada session puede subdividirse o colapsarse durante execute si el tamano real difiere.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Modal de alta 2 pasos (casero) — shell + paso 1: tipo (Obligatoria/Opcional) + linea en masa | 1 | T2 | T1 | auto | Modal abre/cierra desde el componente base; paso 1 navega a paso 2; select de linea poblado; story render |
| S2 | Picker de Activity + alta obligatoria end-to-end (flujo Must completo) | 2 | T3 | T2, T3 | ⚑ fuerte | Picker filtra por depto + oculta agregados + isCurrent; alta crea N planEntry (kind=Course, sin blockId, categoryId, creditos heredados); `.spec.ts` de la logica pura + test de interaccion del picker; smoke UI |
| S3 | Select-suggest de bloque electivo + validacion empirica de H1 (render Vueform en modal casero) | 3 | T3 | T4 | ⚑ fuerte | SelectElement search+create renderiza standalone dentro del modal casero; opciones remotas via useOwnerIdOptions (requirement Group, ownerType=curriculum); elegir-existente y crear-nuevo funcionan |
| S4 | Tagging electivo: crear/crecer bloque, precarga de cursos, minToSatisfy auto, label | 4 | T3 | T5 | ⚑ fuerte | planEntry con blockId; bloque nuevo = requirement(Group, OR, ownerType=curriculum); precarga cursos del bloque existente; minToSatisfy auto-derivado del conteo; `.spec.ts` + interaccion |
| S5 | Modal editar/quitar planEntry (creditos override, linea, Rol, quitar de la malla) | 5 | T3 | T6 | ⚑ fuerte | Rol→Electiva setea blockId; →Obligatoria lo limpia; cambiar categoria no afecta electividad; "Quitar de la malla"; `.spec.ts` + interaccion |

**Notas del esqueleto**:
- **Orden Must-primero**: S1-S2 entregan el nucleo Must (obligatorias end-to-end) y NO dependen de H1; S3-S5 cubren electivas (🆂 Should) y editar. Si el tiempo aprieta, el Must ya quedo funcional tras S2.
- **Riesgo concentrado en S3 (H1)**: la integracion del select-suggest Vueform dentro del modal casero es el unico riesgo tecnico abierto. Mitigado por precedente `CompositeSectionTree` + `AllInputsModal.vue:265`. Validacion empirica del render standalone es el primer paso de S3 (T4) antes de cablear el tagging (S4).
- **Arquitectura (DEC-038 / RULE-mods-051)**: todo el dominio nuevo (alta→planEntries, tagging, derivaciones electivas, edicion) vive en el adapter `CurriculumMeshElement.vue` + logica `.ts`; las primitivas de render no reciben identificadores de dominio. Tarjeta por slot, acciones por evento. Tasks UI-pesadas (modales, picker) llevan tests de interaccion ademas del `.spec.ts` de logica pura.
- **Numeracion continua (DET-20)**: el ticket no tenia sessions previas → el plan arranca en S1.

### Session 1 — 2026-06-30 — Modal de alta 2 pasos (shell + paso 1) [phase: execute]

**Tipo**: auto
**Validation tier**: T2

**Objetivo**: Cablear el modal casero de alta (atomo Modal) con stepper de 2 pasos y el paso 1 (tipo Obligatoria/Electiva + linea en masa), habilitando el boton de alta del componente base.

**Tasks completadas**:
- [x] S1.T1 — AddEntryModal (modal casero) con stepper 2 pasos; paso 1 = tipo + linea en masa; navegacion; habilitar boton de alta en CurriculumMeshElement (REQ-01)
- [x] S1.GATE — Gate de sync Session 1 (tier T2): persistir, validar, decidir continue/iterate/escalate

**Validacion del tier**:
- T2 — `npx vitest run`: 933/933 pass (56 files), 0 failed. Spec nuevo `addEntryModal.logic.spec.ts` 8/8 (re-corrido independiente — DET-33). ESLint sin errores; vue-tsc sin errores en archivos de `CurriculumMesh/` (errores preexistentes en `BaseCard.vue`/`CalendarEventCard.vue` ajenos a la task).

**Archivos**: `AddEntryModal.vue` (nuevo), `addEntryModal.logic.ts` (nuevo), `addEntryModal.logic.spec.ts` (nuevo, 8 tests), `CurriculumMeshElement.vue` (cableado), `CurriculumMesh.stories.ts`, `lang/{es_CL,en_CL,pt_BR}.json`.

**Discoveries / Learns nuevos**:
- L3: `categories` (`CategoryVM[]`) ya viene del composable `useCurriculumMesh`; el adapter las mapea a `{key,name}` para el modal (mantiene el seam). Util para S2 (linea en masa) — la fuente de categorias ya existe.
- L4: el vitest del mod corre en `environment: 'node'` SIN `@vitejs/plugin-vue`, con `../../components/molecules` aliasado a stubs → los `.vue` no se montan en tests. Patron del mod: extraer logica a `.ts` + `.spec.ts` (se hizo: `addEntryModal.logic.ts`). Las deps de test de componente (`@vue/test-utils`, `@vitejs/plugin-vue`, `jsdom`) estan instaladas en el root del monorepo pero no registradas en el vitest del mod.

**Quality review (DET-23)**:

**Reviewer**: LLM (sub-agente aislado, read-only)
**Tier de revision**: standard (T2)
**Resultado global**: approve (con desviacion `should` aceptada por el dev — ver nota)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Spec compliance (REQ-01) | pass | modal 2 pasos, paso 1 tipo+linea, navegacion preserva tipo, boton gated por Draft en el adapter; paso 2 placeholder (correcto para S1) |
| 2 | Rules compliance | pass + warn | RULE-cd-014 (Modal casero + logica `.ts`) ✓; RULE-mods-051 seam ✓ (grep: sin `planEntry`/`blockId`/`createInstance` en el modal); **warn**: RULE-mods-051 pide test de interaccion para modales (nivel `should`) |
| 3 | Calidad codigo | pass | sin dead code/magic numbers; setup ~77 lineas (mayormente init de refs); naming EN + copys ES |
| 4 | Testing | warn | 8 tests de logica con asserts concretos (canProceed/advanceStep/goBack); falta test de interaccion del `.vue` (ver dim 2) |
| 5 | i18n | pass | 19 keys en los 3 locales (es_CL/en_CL/pt_BR), paridad verificada, sin hardcode |
| 6 | Seam/acoplamiento | pass | modal por props/eventos; dominio confinado al adapter |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

> **Desviacion `should` aceptada (dev, 2026-06-30)**: el reviewer marco ITERATE por ITER-01 (RULE-mods-051 exige test de interaccion para modales). RULE-mods-051 es nivel `should`; la logica de navegacion esta 100% cubierta por `addEntryModal.logic.spec.ts` (8 tests) + stories. El dev decidio **aceptar sin deuda** (no backlog) — el gap de infra de tests de componente Vue es pre-existente y transversal al mod, no especifico de MC-06. Veredicto efectivo: **approve**. Findings cosmeticos WARN-01 (cast de prop `period`) y WARN-02 (story sin listener) quedan como notas, no se actuan.

**Coverage (DET-25)**: REQ-01 (navegacion del modal) cubierto por `addEntryModal.logic.spec.ts` — `canProceed` (sin tipo → no avanza), `advanceStep` (oblig+categoria → payload `{type:'oblig',categoryId:'cat-nucleo'}`; elec sin categoria → `{type:'elec',categoryId:null}`), `goBack` (paso 2→1 preserva tipo). (Nota: el dev etiqueto internamente TC-06/07/08; las TC-06/07 del spec son de REQ-08/S5 — sin colision real en el coverage map del spec, que no asigna TC a REQ-01.)

### Session 2 — 2026-06-30 — Picker de Activity + alta obligatoria end-to-end [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: Construir el picker de catalogo (filtro depto + isCurrent + exclusion de agregados) y la logica de alta obligatoria → planEntries, cerrando el flujo Must obligatorias end-to-end.

parallel_groups: [[S2.T1, S2.T3]]

**Tasks completadas**:
- [x] S2.T1 — useActivityPicker: listInstances(Activity, filters executionUnitId/isCurrent) + departamentos; `.spec.ts` Apollo mock (REQ-04)
- [x] S2.T2 — ActivityPicker.vue (paso 2): buscar/filtro depto/multiseleccion/exclusion de agregados; test interaccion (REQ-03,04)
- [x] S2.T3 — logica alta obligatoria → planEntries (categoryId en masa, credits heredados, position); cablear createInstance; `.spec.ts` TC-01 (REQ-02)
- [x] S2.GATE — Gate de sync Session 2 (tier T3, dual-judge DET-35): flujo Must end-to-end, smoke UI, grep RULE-mods-051

**Validacion del tier**:
- T3 — `npx vitest run`: 967/967 pass (58 files), 0 failed. Nuevos: useActivityPicker (10), activityPicker.logic (17 TC-09..12), curriculumMesh.logic +8 (TC-01 alta). ESLint sin errores; vue-tsc sin errores en archivos tocados (preexistentes en BaseCard/CalendarEventCard ajenos). Grep RULE-mods-051: `ActivityPicker.vue`/`AddEntryModal.vue` sin `planEntry|blockId|createInstance|useMutation` (seam limpio). Smoke UI: flujo alta obligatoria cableado end-to-end (createInstance por payload + refetch).

**Archivos**: `useActivityPicker.ts` (+test integration), `ActivityPicker.vue`, `activityPicker.logic.ts` (+spec 17), `curriculumMesh.logic.ts` (buildObligatoriaPlanEntryPayloads/nextPosition/MeshEntry.activityId) (+spec), `AddEntryModal.vue`, `CurriculumMeshElement.vue` (createInstance + exclusion + error handling), `useCurriculumMesh.ts`, `lang/*`.

**Discoveries / Learns nuevos**:
- L5: `listInstances` con `includeRelations` fusiona la relacion en `item.data[relationName]`; el nombre Prisma para no-core es lowercase (`executionUnitId` → `executionunit`). `departmentName` sale de `item.data.executionunit.name`.
- L6: el filtro por depto se aplica client-side (el Element carga el catalogo completo con limit 500 y filtra en `ActivityPicker`); el composable soporta filtro server-side por `executionUnitId` pero no se usa hoy. Si el catalogo supera 500, faltarian Activities de un depto — aceptable en SP5, documentado.
- L7: el vitest raiz de up1 excluye `mods/`; correr specs del mod desde `/mods/curriculum-design`.

**Quality review (DET-23 / DET-35 dual-judge)**:

**Reviewer**: 2 jueces ciegos en paralelo (LLM, read-only) + fix-agent + verificacion independiente del orquestador
**Tier de revision**: exhaustive (T3, dual-judge)
**Resultado global**: approve (post-fix)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Spec compliance (REQ-02/03/04) | pass | payload obligatoria correcto (blockId/credits null, kind Course, categoryId en masa, position consecutiva); exclusion de agregados; filtro depto + isCurrent |
| 2 | Rules compliance | pass | RULE-mods-051 seam limpio (grep confirmado por ambos jueces); RULE-cd-014 modal casero + logica pura |
| 3 | Calidad codigo | pass (post-fix) | sin any en logica pura, constantes nombradas, funciones <40 lineas; **fix**: error handling de la mutation en lote (try/catch/finally + Alert + conditional close) |
| 4 | Testing | pass (con desviacion should) | logica pura + composable cubiertos con asserts concretos (35 tests nuevos); sin test de componente Vue (RULE-mods-051 `should` — desviacion S1 aceptada por dev) |
| 5 | i18n | pass | keys step2/confirm en los 3 locales |
| 6 | Seam/acoplamiento | pass | dominio confinado al adapter; picker presentacional por props/eventos |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 3 (S3: select-suggest + spike create:true)
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

> **Dual-judge (DET-35)**: Juez A=APPROVED-con-condiciones, Juez B=ITERATE. Confirmados por coincidencia: (W2) **dead code** — `AddEntryModal.vue` reimplementaba la navegacion inline sin usar `addEntryModal.logic.ts` (verificado por grep); (W1) **error handling** de `onAddEntryConfirm` sin try/catch. Fix-agent quirurgico resolvio ambos (SFC ahora usa la logica pura → los 8 tests guardan codigo real; try/catch/finally + mutationError Alert + mutationLoading + cierre condicional del modal). Verificado independiente (grep + 967/967). Test de interaccion (RULE-mods-051 `should`) = desviacion S1 ya aceptada, no bloquea. INFO no actuados: filtro depto >500, single-element test gap, Record<string,any> heredado.

**Coverage (DET-25)**: TC-01 (REQ-02 alta masa con linea) ✓ en `curriculumMesh.logic.spec.ts`; TC-02 (REQ-03 exclusion) ✓ en `activityPicker.logic.spec.ts` (`excludePlacedActivities`); REQ-04 filtro depto ✓ (`filterByDepartment` + composable test).

### Session 3 — 2026-06-30 — Select-suggest de bloque + spike create:true [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: Validar empiricamente el flujo Vueform `create:true` dentro del modal casero (riesgo H1.2/BUG-platform-011) y construir el select-suggest de bloque electivo (elegir existente via `useBlockOptions` o crear nuevo).

parallel_groups: [[S3.T1, S3.T2]]

**Tasks completadas**:
- [x] S3.T1 — SPIKE bloqueante: render del SelectElement Vueform (search+create) dentro del modal casero; veredicto create:true OK o fallback input de texto (REQ-05, riesgo H1.2)
- [x] S3.T2 — useBlockOptions: listInstances(requirement, recordType=Group/ownerType=curriculum/ownerId=planId) → opciones {value,label}; `.spec.ts` Apollo mock (REQ-05)
- [x] S3.T3 — integrar select-suggest en paso 1 electiva (elegir existente o crear segun veredicto S3.T1); test interaccion (REQ-05)
- [x] S3.GATE — Gate de sync Session 3 (tier T3, dual-judge): select-suggest funcional, veredicto del spike documentado

**Validacion del tier**:
- T3 — `npx vitest run`: 984/984 pass (60 files), 0 failed. Nuevos: useBlockOptions (9), blockSelect.logic (8 TC-S3-01..04). ESLint/typecheck limpios en archivos tocados. Seam RULE-mods-051: `AddEntryModal.vue` sin mutations ejecutables (grep solo comentario). Story `SpikeS3T1SelectSuggestElectiva` de validacion.

**Archivos**: `useBlockOptions.ts` (+test), `blockSelect.logic.ts` (+spec), `AddEntryModal.vue` (select-suggest electiva + blockOptionsLoading), `CurriculumMeshElement.vue` (carga useBlockOptions), `CurriculumMesh.stories.ts` (spike story), `lang/*`.

**Discoveries / Learns nuevos**:
- L8: **`create:true` de Vueform es self-contained** (`createdOption` computed local en `@vueform/multiselect/.../useOptions.js:110-111`; `handleTag` solo dispara event bus interno) → NO toca el `ModalStackManager` (BUG-platform-011 NO aplica al create del select). Resuelve H1.2 sin fallback. Promovible a learn de plataforma.
- L9: `combinator`/`minToSatisfy` no son campos formales del schema `requirement` base (solo del subtipo `rt__Group__requirement`); viven en el blob `data` y no se filtran por `listInstances` con EQUALS — el query filtra por `recordType=Group/ownerType=curriculum/ownerId`.

**Quality review (DET-23 / DET-35 dual-judge)**:

**Reviewer**: 2 jueces ciegos en paralelo + fix-agent + verificacion independiente
**Tier**: exhaustive (T3, dual-judge)
**Resultado global**: approve (post-fix)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Spec compliance (REQ-05) | pass | select-suggest elegir-existente (useBlockOptions) o crear-nuevo (create:true); interpretBlockSelectValue distingue isNew correctamente |
| 2 | Spike create:true | pass | veredicto OK fundamentado en source Vueform; H1.2 descartado |
| 3 | Rules compliance | pass | RULE-mods-051 seam (sin dead code esta vez — SFC usa blockSelect.logic); RULE-cd-015 (Vueform reusado); RULE-cd-014 |
| 4 | Calidad codigo | pass (post-fix) | sin any, constantes nombradas; **fix**: blockOptionsLoading conectado (disabled del select durante carga) |
| 5 | Scope | pass | tagging/createInstance electivo correctamente diferido a S4 (confirm electivo disabled + TODO) |
| 6 | i18n | pass (post-fix) | 3 locales; **fix**: copys "S3/S4" → "S4" |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 4 (S4: tagging electivo)
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

> **Dual-judge (DET-35)**: Juez A=APPROVED, Juez B=ITERATE. Confirmado por ambos: `blockOptionsLoading` prop declarado pero no consumido (A=INFO, B=WARNING dead prop). Fix-agent: conecto la prop al `disabled` del select-suggest (feedback de carga) + actualizo copys "S3/S4"→"S4" + tidy JSDoc combinator/comentario addOptionOn. Verificado independiente (grep + 984/984). Sin dead code (a diferencia de S2). INFO no actuados: addOptionOn delta (decision documentada).

**Coverage (DET-25)**: TC-03/TC-04 (REQ-05 elegir-existente / crear-nuevo) cubiertos por `blockSelect.logic.spec.ts` (interpretBlockSelectValue) + `use-block-options.test.ts`.

### Session 4 — 2026-06-30 — Tagging electivo: crear/crecer bloque + minToSatisfy auto [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: Cablear el alta electiva end-to-end: crear el bloque nuevo (requirement Group, OR) si no existe, crear planEntries con blockId (tagging), derivar minToSatisfy del conteo, precargar cursos del bloque existente.

**Tasks completadas**:
- [x] S4.T1 — logica tagging electivo en `curriculumMesh.logic.ts`: buildBlockPayload (requirement Group/OR/ownerType=curriculum/label), deriveMinToSatisfy (default=total), planEntry con blockId; `.spec.ts` (TC-04, TC-05) (REQ-06,07)
- [x] S4.T2 — wiring en Element: createInstance del bloque nuevo + tag de planEntries; precarga cursos del bloque existente; test interaccion (REQ-06,07)
- [x] S4.GATE — Gate de sync Session 4 (tier T3, dual-judge): electivas end-to-end

**Validacion del tier**:
- T3 — `npx vitest run`: 999/999 pass (60 files). Logica electiva: buildBlockPayload (+effect), deriveMinToSatisfy, buildElectivaPlanEntryPayloads (15 tests). ESLint/typecheck limpios. Seam RULE-mods-051 intacto (modal sin mutations). **Nota**: el create-new-block se valido contra el schema real (objectType RT + effect) — los tests unitarios no cubren el createInstance real (gap que el dual-judge cubrio).

**Discoveries / Learns nuevos**:
- L10: **El `createInstance` de un RecordType requiere `objectType='rt__{RT}__{base}'`** (ej. `rt__Group__requirement`), NO el nombre base — el platform usa `parseRecordTypeFileName` para crear la fila RT (combinator/minToSatisfy). Listar (`listInstances`) sí usa el nombre base + filtro recordType. Asimetria create-vs-list. Promovible a rule de plataforma.
- L11: `effect` es campo requerido (enum) de `requirement`; para bloque electivo del curriculum = **`ProgressGate`** (precedente directo en `seed/_data-requirement.js:115`).
- L12: los tests unitarios verdes (999) NO garantizan la integracion con el backend — solo testean los builders puros. El dual-judge + verificacion contra el schema real atraparon objectType/effect incorrectos que los tests no veian.

**Quality review (DET-23 / DET-35 dual-judge)**:

**Reviewer**: 2 jueces ciegos en paralelo + tie-break del orquestador + fix-agent + re-verificacion
**Tier**: exhaustive (T3, dual-judge)
**Resultado global**: approve (post-fix)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | REQ-06 tagging | pass | planEntry con blockId; blockId⟂categoryId; bloque como consecuencia (no edicion) |
| 2 | REQ-07 minToSatisfy | pass | deriveMinToSatisfy default=total/override; **preload visual de cursos del bloque existente → backlog B1 (Should)** |
| 3 | Creacion del bloque | pass (post-fix) | **F1/F2 criticos corregidos**: objectType `rt__Group__requirement` + `effect:'ProgressGate'` |
| 4 | Seam RULE-mods-051 | pass | dominio en adapter; modal presentacional; sin dead code |
| 5 | Error handling | pass | error parcial + loading + cierre condicional (bloque huerfano → backlog B2) |
| 6 | Calidad | pass (post-fix) | refactor onAddEntryConfirm (orquestador 27 lineas + 2 helpers); i18n limpia (keys huerfanas removidas, error string a i18n) |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Session 5 (S5: editar/quitar planEntry)
- [ ] iterate → re-trabajar Session 4
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

> **Dual-judge (DET-35) — catch critico**: Juez A=ITERATE (REQ-07 preload, funcion larga), Juez B=ITERATE con 2 FAIL: **F1** objectType `'requirement'` en vez de `'rt__Group__requirement'`, **F2** `effect` (enum requerido) ausente. **Contradiccion A-vs-B en F1** → tie-break por verificacion independiente del orquestador (DET-33): contrastado con el spec (Technical reference L474) + `requirement.json` (effect requerido) + seed MC-03 → **B confirmado**. El create-new-block estaba roto; los 999 tests verdes lo perdieron (solo testean builders puros). Fix-agent: F1+F2 (objectType + effect=ProgressGate con precedente seed) + refactor + i18n. Re-verificado independiente (grep + seed:115 + 999/999). REQ-07 preload + orphaned-block → backlog B1/B2.

**Coverage (DET-25)**: TC-04 (REQ-05/06 crear bloque nuevo) ✓ con assert de effect; TC-05 (REQ-07 minToSatisfy auto) ✓; electiva payloads (blockId + categoryId ortogonal) ✓ en `curriculumMesh.logic.spec.ts`.

### Session 5 — 2026-06-30 — Modal editar/quitar planEntry [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: Modal flotante para editar (creditos override, linea, Rol Obligatoria↔Electiva) y "Quitar de la malla" un planEntry colocado. Rol→Electiva setea blockId; →Obligatoria lo limpia; cambiar categoria no afecta electividad.

**Tasks completadas**:
- [x] S5.T1 — logica de edicion en `curriculumMesh.logic.ts`: applyRoleChange (Electiva→set blockId / Obligatoria→clear), override credits, categoria ortogonal a electividad, buildUpdatePayload/buildRemove; `.spec.ts` (TC-06, TC-07) (REQ-08)
- [x] S5.T2 — `EditEntryModal.vue` + cablear desde tarjeta del Element (updateInstance/deleteInstance); test interaccion (REQ-08)
- [x] S5.GATE — Gate de sync Session 5 (tier T3, dual-judge): editar/quitar funcional + acceptance checkpoints

**Validacion del tier**:
- T3 — `npx vitest run`: 1040/1040 pass (61 files). Nuevos: applyRoleChange/buildUpdateEntryPayload/isElective (14) + editEntryModal.logic (26, incl. guard negativos). **vue-tsc: 0 errores en archivos CurriculumMesh** (corrido por el orquestador — DET-33). i18n editModal en 3 locales. Seam RULE-mods-051: EditEntryModal sin mutations (grep solo comentario).

**Discoveries / Learns nuevos**:
- L13: `updateInstance`/`deleteInstance` de un objeto BASE (planEntry) usan `objectType:'planEntry'` (sin `rt__`); el id va como variable separada. Contrasta con el create del bloque (RT → `rt__Group__requirement`). Asimetria base-vs-RT consistente.
- L14: vitest (esbuild) NO typechequea — tests verdes no garantizan tipos. La verificacion DET-33 con `vue-tsc` atrapo 5 errores de tipo en EditEntryModal.vue que la suite no veia. Correr tsc en el gate de sessions UI es necesario.

**Quality review (DET-23 / DET-35 dual-judge)**:

**Reviewer**: 2 jueces ciegos + verificacion independiente DET-33 (tsc) + 2 fix-agents
**Tier**: exhaustive (T3, dual-judge)
**Resultado global**: approve (post-fix)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | REQ-08 reglas de Rol | pass | applyRoleChange (Electiva→blockId/Obligatoria→null); categoria ⟂ electividad; TC-06/07 |
| 2 | Override creditos | pass | parseCreditsRaw (vacio→null, invalido/negativo→null); patch parcial |
| 3 | objectType UPDATE/DELETE | pass | `planEntry` (base) correcto — leccion S4 aplicada |
| 4 | Seam RULE-mods-051 | pass | modal presentacional; prepareUpdatePayload usada sin dead code |
| 5 | Error handling | pass | onEditSave/onEditRemove: error+loading+cierre condicional+refetch |
| 6 | Calidad | pass (post-fix) | **DET-33 atrapo 5 errores tsc** → fix de raiz (OriginalEntryFields); cleanup dead ref + i18n huerfanas + guard negativos |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → Todas las tasks S1-S5 completadas; proceder a request-close
- [ ] iterate → re-trabajar Session 5
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

> **Dual-judge (DET-35)**: A+B=APPROVED. Verificacion DET-33 del orquestador (vue-tsc) atrapo 5 errores de tipo que los 1038 tests verdes ocultaban (esbuild no typechequea) → fix de raiz. Findings no-bloqueantes (dead ref `editMutationError` + i18n huerfanas + parseCreditsRaw negativos) → cleanup. W1 fidelidad del campo creditos (UX, sin corrupcion) → backlog B3. Re-verificado: 1040/1040 + tsc 0 err + 3 JSON parsean.

**Coverage (DET-25)**: TC-06 (Rol→Electiva setea blockId) ✓; TC-07 (cambiar categoria de electivo mantiene blockId) ✓.

### Session 6 — 2026-06-30 — Fix sync packaging: sub-componentes .vue → .ts (backlog must B0) [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: Resolver B0 (RULE-mods-022): convertir `AddEntryModal`/`EditEntryModal`/`ActivityPicker` de `.vue` a `.ts` (defineComponent + render `h()`, patron `CompositeSectionForm.ts`) para que `modsComponents/CurriculumMesh/` tenga 1 solo `.vue` y el sync mod→layout deje de saltar la carpeta. Verificar el round-trip de sync (la carpeta synced debe quedar completa y el app servir MC-06).

**Tasks completadas**:
- [x] S6.T1 — convertir AddEntryModal.vue/EditEntryModal.vue/ActivityPicker.vue → .ts (defineComponent render h()); actualizar imports en CurriculumMeshElement.vue; mantener .logic.ts y comportamiento (B0/RULE-mods-022)
- [x] S6.T2 — verificar deploy: `vue-tsc` 0 err + vitest verde + `npm run sync` SIN saltar CurriculumMesh + carpeta synced con los .ts + Element synced con MC-06
- [x] S6.GATE — Gate de sync Session 6 (tier T3, dual-judge): feature llega al runtime; smoke en el app (modo edicion visible)

**Validacion del tier**:
- T3 — `vue-tsc` 0 errores en CurriculumMesh; `vitest` 1040/1040. **Round-trip de sync verificado**: `npm run sync` ya NO salta `CurriculumMesh/`; carpeta synced completa (Element MC-06 `AddEntryModal`=6 + 3 `.ts` sub-componentes + logics + 2 composables in-folder); **0 imports rotos** a `modsComposables` en la copia synced. Reviewer de fidelidad de render functions: **APPROVE**.

**Discoveries / Learns nuevos**:
- L15: **El sync mod→layout exige 1 `.vue` por carpeta** (`sync.js:165-171` → `continue`); sub-componentes deben ser `.ts` (render `h()`, patron `CompositeSectionForm.ts`). Ya existia **RULE-mods-022** — MC-06 la violo. Tests/tsc del mod NO lo detectan (compilan la fuente aislada); solo se ve corriendo el sync o probando en el app.
- L16: composable **especifico de un componente** va IN-FOLDER (como `useCurriculumMesh.ts`), import `./`, sincroniza con la carpeta — robusto sin alias. `modsComposables/` es para compartidos (sync a `layout/src/composables/`).

**Quality review (DET-23)**: render-fidelity (sub-agente aislado) + verificacion independiente (tsc + vitest + sync round-trip + grep). **Resultado: approve**. Equivalencia sin cambio de comportamiento; RULE-mods-022 cumplida; runtime sirve MC-06; 0 imports rotos.

> **Por que existio B0**: MC-06 (S1-S5) construyo los modales como SFC `.vue` (4 en una carpeta) → viola RULE-mods-022; el sync saltaba la carpeta y el app servia MC-05 read-only. Ni los gates por-session ni el reviewer 1d lo vieron (validaban la fuente del mod, que compila aislada). Detectado por el dev probando en el app. Fix S6: `.vue`→`.ts` + composables in-folder + **verificacion del round-trip de sync** (la pieza que faltaba en "done").

**Coverage (DET-25)**: refactor de equivalencia — sin TC nuevos; 35+ tests de logica pura verdes. Smoke UI del modo edicion: **pendiente de confirmacion del dev en el app** (gated por `enableEdit`+`status==='Draft'`).

**Gate decision:** (approvedBy: autopilot)

- [x] continue → B0 resuelto (RULE-mods-022); feature en runtime. Pendiente: smoke del dev en app + close
- [ ] iterate → re-trabajar Session 6
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-02 | TC-01 | unit (.spec.ts) | pending |
| REQ-03 | TC-02 | unit | pending |
| REQ-05 | TC-03, TC-04 | unit | pending |
| REQ-07 | TC-05 | unit | pending |
| REQ-08 | TC-06, TC-07 | unit | pending |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-01 | agregar 3 obligatorias con línea "Núcleo" al período 1 | REQ-02 | unit | catálogo | builder de planEntry | 3 planEntry period=1, categoryId=Núcleo, sin blockId, créditos heredados | — | — | pending |
| TC-02 | abrir picker con MAT110 ya en la malla | REQ-03 | unit | MAT110 colocado | abrir picker | MAT110 no aparece | — | — | pending |
| TC-03 | electiva → elegir bloque existente "Electivo Esp." | REQ-05 | unit | bloque existe | tagging | planEntry con blockId del Group existente | — | — | pending |
| TC-04 | electiva → nombrar bloque nuevo "Electivo X" | REQ-05 | unit | sin bloque | crear+taggear | requirement(Group, OR, ownerType=curriculum) + planEntry tagueado | — | — | pending |
| TC-05 | agregar 4 cursos a un bloque nuevo | REQ-07 | unit | bloque nuevo | derivar minToSatisfy | minToSatisfy = 4 (auto) | — | — | pending |
| TC-06 | cambiar Rol de un entry a Electiva | REQ-08 | unit | entry obligatorio | editar Rol | setea blockId; badge electivo aparece | — | — | pending |
| TC-07 | cambiar categoría de un entry electivo | REQ-08 | unit | entry electivo | editar categoría | sigue electivo (blockId intacto) | — | — | pending |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| spec FE | vitest del mod | — | — | componente base (MC-05) sin afectar |

## Backlog

| # | Item | Priority | Status | Origen |
|---|------|----------|--------|--------|
| B0 | **🔴 Sync packaging roto (RULE-mods-022)**: MC-06 creo 4 `.vue` en `modsComponents/CurriculumMesh/` (Element + AddEntryModal + EditEntryModal + ActivityPicker); el sync mod→layout exige **1 `.vue` por carpeta** (`sync.js:165-171` → `continue` salta la carpeta). Resultado: el feature NO sincroniza al runtime; el app sirve el componente MC-05 read-only. Fix: convertir los 3 sub-componentes `.vue` → `.ts` (defineComponent + render `h()`, patron `CompositeSectionForm.ts`), dejar 1 `.vue`, re-sync y verificar. | **must** | resolved (S6) | Detectado por el dev probando en el app; root cause confirmado (sync skip). **Bloquea cierre (DET-17).** |
| B1 | ~~**REQ-07 precarga visual de cursos del bloque existente**: al elegir un bloque existente, preseleccionar/mostrar sus cursos actuales en el picker (sumar/quitar).~~ **resuelto (S8, 2026-07-01)**: prop `preselectedIds` en `ActivityPicker` + `chosenExistingBlockId`/`blockPreselectedIds`/`pickerExclusionIds` + `diffBlockSelection(preselectedIds, finalIds)→{toAdd,toRemove}` (solo tagea/destagea el delta). | should | resolved (S8) | dual-judge S4 (A-W1/B-W2). |
| B3 | ~~**REQ-08 fidelidad del campo creditos en edicion**: el modal abre con el credito EFECTIVO (resuelto, nunca null) → un entry sin override muestra los creditos heredados como override.~~ **resuelto (S8, 2026-07-01)**: `creditsOverride:number\|null` en `MeshEntry`/`toMeshEntry`; `openEditModal` pasa `card.creditsOverride ?? null` (override crudo, no efectivo) → el campo abre vacio cuando no hay override. | should | resolved (S8) | dual-judge S5 (A-W1/B-F3). |
| B2 | ~~**Rollback de bloque huerfano en error parcial**: si se crea el requirement Group pero falla el tag de una planEntry, el bloque queda sin entries.~~ **resuelto (S8, 2026-07-01)**: `DELETE_REQUIREMENT` (objectType `rt__Group__requirement`) en `createElectivaEntries` — si el bloque es nuevo (`blockSelection.isNew`) y falla un tag posterior, se borra el bloque huerfano antes de reportar el error. Bloque existente no se toca. | could | resolved (S8) | dual-judge S4 (B-W3). |
| B4 | **Modal de edición no cargaba bloques ni prellenaba créditos** (smoke-test dev, S9): (#2/#3) `openEditModal` no llamaba `loadBlockOptions()` → select de bloque vacío, sin mostrar el actual ni los otros; (#1) campo créditos vacío + placeholder confuso. | must | resolved (S9) | Detectado por el dev en el app. **Fix S9** (ver decisions_log). |
| B5 | **Display de línea en la tarjeta** (ícono + abreviación + color) + **badge electivo a la derecha** (hoy a la izquierda): fidelidad con la maqueta UPONE-1272; el detalle se perdió en el paso maqueta→prespec de MC-05 (redujo la línea a solo color). | should | **deferred → MC-08** | Decisión del dev (S9): diferir a MC-08 (dueño del tratamiento visual de líneas). Documentado en `sp5/prespecs/MC-08.md` REQ-04 + T4 + TC-06/07. |
| B6 | **Barra de líneas de formación con rollup de créditos por línea** (`{current}/{min} créd` + progreso) + **"Electivos añadidos"** + clic-para-resaltar: la maqueta (`mockup_v10.html` 726-740) reemplaza la leyenda estática actual (punto+nombre) por esta barra interactiva. | should | **deferred → MC-08** | Ya es MC-08 **REQ-01** (filtros/resalte). Se aumentó REQ-01 con el detalle del rollup de créditos (no estaba explícito) + TC-08. No es de MC-06 (nunca lo fue). |
| B7 | **Alerta "malla no editable" en la vista** cuando el plan está publicado (solo se editan mallas Draft), con texto **dinámico desde config** (fuente única compartida con el gate `canEdit`, no hardcodeado en dos lados). Hoy la malla queda read-only en silencio. | should | **deferred → MC-09** | Pedido del dev (S9). Documentado en `sp5/prespecs/MC-09.md` REQ-04 + T4 + TC-04/05/06 (incl. test de fuente única: extraer `EDITABLE_STATUSES` que consumen gate y mensaje). |
| B8 | **Alerta de discrepancia de conteo de períodos**: al agregar/quitar período (MC-08), si la cantidad difiere de `Curriculum.totalPeriods`, alertar (no bloqueante — es estado de trabajo válido, pero el usuario debe estar al tanto). | should | **deferred → MC-08** | Pedido del dev (S9). Documentado en `sp5/prespecs/MC-08.md` REQ-03 (aumentado) + T3 + TC-09/10. |
| B9 | **Bug: botón "Agregar asignatura" con doble `+`** ("＋ + Asignatura"): el `icon="bi bi-plus-lg"` del `Button` + el `+` literal del i18n `addSubject`. Debe quedar uno solo. | must | **deferred → MC-08** | Bug de MC-05/06 detectado por el dev (S9, screenshot). Fix: quitar `+ ` del texto i18n, conservar ícono. Documentado en `sp5/prespecs/MC-08.md` REQ-05 + T5 + TC-11. |

## Summary

**MC-06 (UPONE-1349) — Malla: agregar y editar asignaturas (obligatorias + electivas)**

Se convirtio la malla curricular de solo-lectura (MC-05) en editable: modal de alta en 2 pasos, picker de catalogo, alta obligatoria en masa, tagging electivo con bloques OptionPool, y modal editar/quitar. Implementado en 5 sessions sobre el adapter `CurriculumMeshElement` + logica pura testeable, respetando el seam DEC-038/RULE-mods-051 (dominio en el adapter; modales/picker presentacionales por props/eventos).

**Entregado (REQ-01..08):**
- REQ-01/02 (Must): modal 2 pasos + alta obligatoria en masa con linea + creditos heredados.
- REQ-03/04 (Must): picker filtra por depto, oculta cursos ya colocados, solo `isCurrent`.
- REQ-05/06/07 (Should): select-suggest de bloque electivo (Vueform `create:true`), tagging (planEntry con blockId), `minToSatisfy` auto + label. **Parcial**: precarga visual de cursos del bloque existente → backlog B1.
- REQ-08 (Must): modal editar/quitar (Rol Obligatoria↔Electiva, creditos override, linea, "Quitar de la malla").

**Artefactos nuevos**: `AddEntryModal.vue`, `ActivityPicker.vue`, `EditEntryModal.vue`, composables `useActivityPicker`/`useBlockOptions`, logica pura `activityPicker.logic`/`addEntryModal.logic`/`blockSelect.logic`/`editEntryModal.logic` + extension de `curriculumMesh.logic` (alta/tagging/edicion). i18n en 3 locales.

**Metricas**: 23 archivos, +4639/-21, **15 commits locales** (3 por session, prefijo `UPONE-1349-S{1..5}`), **1040 tests** verdes, `vue-tsc` 0 errores en archivos del mod.

**Calidad (DET-35 dual-judge por session T2/T3 + DET-33 verificacion independiente)** — el harness adversarial atrapo defectos reales que los tests verdes ocultaban:
- S2: dead code (`addEntryModal.logic` no usado por el SFC) + error handling de la mutation en lote → corregido.
- S4: **2 FAIL criticos** — `createInstance` del bloque usaba `objectType:'requirement'` (debia ser `'rt__Group__requirement'`) + faltaba el campo requerido `effect` → el "crear bloque nuevo" estaba ROTO; los 999 tests verdes no lo veian (solo testean builders puros). Corregido (`effect:'ProgressGate'` con precedente en seed MC-03).
- S5: `vue-tsc` (DET-33) atrapo 5 errores de tipo que vitest/esbuild no detecta → fix de raiz (sin `any`).

**Decisiones (registradas)**: modales caseros por BUG-platform-011 (DEC-031/precedente CompositeSectionTree); `create:true` de Vueform (dev, validado por spike S3 — self-contained, no toca ModalStackManager → H1.2 cerrado sin fallback); `useBlockOptions` nuevo (DEC-LOCAL-02, `useOwnerIdOptions` hardcodeado no servia).

**Validacion de cierre reforzada (1d, reviewer aislado, contexto limpio)**: APPROVE en los 5 chequeos (DET-13 spec, DET-16 propagacion, DET-23 calidad, scope dentro del mod, rama `UPONE-1267-sp5`).

**Story Points (DET-26)**: published 8 · executed **4** (sessions-heuristic: sp_llm 4 × compresion 0.5 + sp_human 2). LLM speedup ~2 (proxy humano-puro 6 → 4).

**Backlog — cerrado (S8, 2026-07-01, a pedido del dev "cubrir todo ahora")**:
- ✅ **Selector electivo nativo** (S8.T1): reemplazado el Vueform `create:true` (create no persistia, dropdown no clickeable, `blockSelection` null → Agregar deshabilitado) por control nativo — `<select>` de bloques existentes + opcion "crear nuevo" → `<input>` de texto. `resolveBlockSelection`/`BLOCK_NEW_SENTINEL` en `blockSelect.logic.ts`. 0 refs Vueform/`resolveComponent`.
- ✅ **B1 (should)**: precarga de cursos del bloque existente (`preselectedIds` + `diffBlockSelection` tagea/destagea solo el delta).
- ✅ **B3 (should)**: campo creditos abre vacio = heredar (`creditsOverride` crudo, no efectivo).
- ✅ **B2 (could)**: rollback de bloque huerfano (`DELETE_REQUIREMENT` si el bloque es nuevo y falla un tag posterior).

**Modal de edición — fixes de runtime (S9, 2026-07-01, smoke-test del dev):**
- ✅ **B4 (#2/#3)**: `openEditModal` ahora llama `loadBlockOptions()` → el select de Rol=Electiva muestra el bloque actual de la asignatura + los otros bloques para reasignar (antes `blockOptions=[]` porque solo `openAddModal` los cargaba).
- ✅ **B4 (#1)**: el campo créditos abre **prellenado con el efectivo** (override ?? heredado), como la maqueta. Guardado inteligente `resolveCreditsOverride(raw, heredado)`: vacío→heredar, `=heredado`→sin override redundante, `≠`→override. Nuevo `MeshEntry.inheritedCredits`. Reemplaza el `effectiveCredits` transitorio y elimina la clave i18n `creditsInherited`.

**Datos de prueba**: Plan Draft `UV-ICIV-PLAN-2027` + malla + bloque electivo cargados via pipeline reset+deploy UPU (`mods/curriculum-design/scripts/reset-deploy-upu.md`), verificados en DB.

**Diferido → MC-08 (decisión del dev S9)**:
- **B5**: display de la línea en la tarjeta (ícono + abreviación + color) + badge electivo a la derecha → MC-08 REQ-04 + T4 + TC-06/07.
- **B6**: barra de líneas con rollup de créditos por línea (`{current}/{min}` + progreso) + "Electivos añadidos" + clic-para-resaltar (reemplaza la leyenda estática actual) → ya es MC-08 REQ-01; se aumentó REQ-01 con el rollup + TC-08.
- **B7**: alerta "malla no editable" (plan publicado) con texto dinámico desde config (fuente única con el gate `canEdit`, no hardcodeado) → MC-09 REQ-04 + T4 + TC-04/05/06.
- **B8**: alerta de discrepancia de conteo de períodos vs `totalPeriods` al agregar/quitar período (no bloqueante) → MC-08 REQ-03 + T3 + TC-09/10.
- **B9** (bug, must): botón "Agregar asignatura" con doble `+` → MC-08 REQ-05 + T5 + TC-11 (quitar `+` del i18n, conservar ícono). Bug propio de MC-06 pero ruteado a MC-08 por decisión del dev ("incluir en los tickets que vienen").

_Fuera de alcance: MC-08 (display línea/badge B5, barra interactiva B6, prereqs/DnD/filtros, alerta de períodos B8, fix doble-`+` B9) + MC-09 (alerta malla no editable B7)._

**Learns promovibles a rule** (raw en el ticket, sugeridos al dev): L8 (`create:true` Vueform self-contained), L10 (`createInstance` de RT requiere `objectType=rt__X__Y`; listar usa el base + filtro recordType), L14 (tests verdes ≠ integracion/tipos — correr `vue-tsc` + verificar schema real en gates de UI), **L15 (i18n de mod NO llega al runtime con el sync de componentes: las claves nuevas requieren el merge `mods/*/lang → suite/lang` del full `npm run sync`; un cambio de placeholder que use una clave nueva se ve crudo hasta ese merge).**

**Estado del codigo**: 15 commits LOCALES en `UPONE-1267-sp5`. **NO pusheado** — el push requiere OK del dev (super autopilot nunca pushea solo).
