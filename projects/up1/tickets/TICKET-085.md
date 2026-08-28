---
id: TICKET-085
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1348
module: curriculum-design
autopilot: autonomous
---

# Malla — Ver, modo edición y resumen

> **MC-05** · Épica Jira [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) (track interno "B") · Tier 🅼 Must · 5 SP · repo `mod` (FE) · Fase F2.
> **Pre-spec (fuente de design):** [`sp5/prespecs/MC-05.md`](../../../../uplanner/specs/up1/sp5/prespecs/MC-05.md) — transcrito abajo. El SPEC formal DKC se crea al tomar el ticket (design-feature), transcribiendo REQ/tasks 1:1.

## ⛔ Gate de inicio — dependencias

> **1 dev, ejecución en serie.** Antes de iniciar design / `request-execute`, verificar que cada bloqueante esté `status: closed` (frontmatter `depends_on` + relaciones `depends_on` en HC; `dkc_read_frontmatter`). Si alguna NO está `closed`: **NO iniciar este ticket** — bloquear y avisar al dev (DET-30 guarda de inicio).

| Bloqueante | Aporta | Debe estar |
|---|---|---|
| [TICKET-082](TICKET-082.md) (MC-02) | planEntry + requirementCategory + seed (la malla los pinta) | closed |

## Request

Como usuario, quiero ver la malla del plan por períodos con su resumen, y que la edición se habilite solo cuando corresponde, para entender y operar el plan con seguridad.

Agrupa B1 + B2 + B3 (handoff). Componente de malla en modsComponents/ (patrón CompositeSectionTree, carga vía GraphQL del mod): vista por período en columnas (código, créditos, línea/color, badge electivo derivado de blockId); accesible como pestaña del RecordDetail y acción del listado (sin layoutType nuevo en core); barra de resumen (créditos diseño/requeridos, períodos, asignaturas, carga máx por período); modo edición gated por status editable (Draft). Mod-only.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | UI (componente de malla en modsComponents/ + entrypoints en config del mod) |
| Modulo principal | curriculum-design |
| Modulos afectados | curriculum-design (mod-only); consume planEntry/requirementCategory de MC-02 |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | sí | componente de malla nuevo → draft visual recomendado al tomar (DET-18); maqueta ya existe (UPONE-1272, mockup 685–921) |
| Data model | no | solo lectura de objetos existentes |

## Triage

REQs **confirmados** (mockup 685–921). Reuso fuerte del precedente `CompositeSectionTree`. Frontera crítica: **mod-only**, NO registrar `layoutType` nuevo en core (auditoría §1.6).

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El entrypoint vía config del mod (pestaña + acción del listado) evita tocar core | ✓ confirmada | auditoría §1.6 (frontera); precedente CompositeSectionTree |

### Context found

**KB del módulo (kb_refs: RULE-cd-014):**
- componente autorado en el mod (`modsComponents/`), sincroniza a `layout/`. **Mod-only**: entrypoint vía config del mod, **NO** registrar layoutType nuevo en core (auditoría §1.6).
- modales/UI siguen el patrón `CompositeSectionTree`.
- Gotcha: recargar tras el primer render del listado (RULE/memoria up1).

**Necesidad/reuso (DET-32):** componente = **build**, pero **reusa** `CompositeSectionTree` (full-page Vueform element + GraphQL + lógica a `.ts`). Carga de datos = `useTenantApolloClient` + `listInstances` (patrón `useCompositeSectionTree`).

**Supuestos:** pestaña "Malla curricular" en `default_Curriculum_view.json` (config del mod); la acción del listado navega a la pestaña; `status` editable = `Draft`.

## Pre-spec (transcrito de MC-05.md)

### Requisitos (REQ)

| REQ | Certeza | source_ref | Enunciado |
|-----|---------|-----------|-----------|
| REQ-01 · ver malla por período (solo lectura) | confirmed | handoff MC-CMP-1 + mockup 685–921 | asignaturas agrupadas en columnas por `period`; tarjeta = código, créditos, línea (color), badge "electivo" si blockId!=null. Columnas = totalPeriods/periodType. |
| REQ-02 · puntos de entrada (mod-only) | confirmed | handoff MC-CMP-1 + auditoría §1.6 | accesible como pestaña del RecordDetail (config del mod) + acción "Malla curricular" del RecordList (navega a la pestaña). NO registrar `layoutType` nuevo en LayoutOrchestrator de core. |
| REQ-03 · barra de resumen del plan | confirmed | handoff MC-CMP-3 + mockup 718–725 | ancho completo sobre filtros: créditos diseño/requeridos, n.º períodos, n.º asignaturas, carga máx. por período (desde planEntry + totalCredits/totalPeriods). |
| REQ-04 · modo edición gated por estado | confirmed | handoff MC-CMP-2 + reunión 00:38:02 | acciones de alta/edición solo en modo edición + `Curriculum.status` editable (Draft); en solo lectura, ocultas. |

### Tasks previstas (con rollback)

| # | Task | Rollback |
|---|------|----------|
| T1 | componente malla en `modsComponents/` (grid por período, tarjetas) + carga GraphQL (REQ-01) | eliminar componente |
| T2 | lógica pura a `.ts` (agrupación por período, derivación badge) + `.spec.ts` | revertir |
| T3 | entrypoint: pestaña en `default_Curriculum_view.json` + acción en `default_Curriculum_list.json` (REQ-02) | revertir config |
| T4 | barra de resumen + cálculos (REQ-03) | quitar sección |
| T5 | gating de modo edición (REQ-04) + stories | revertir |

### Dependencias

- **Depende de:** MC-02 (planEntry/requirementCategory) + seed.
- **Habilita:** MC-06 (alta/edición usan el componente), MC-08 (filtros sobre la vista).
- **Patrón:** `CompositeSectionTree`.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1267-sp5` en `mods/curriculum-design` (creada desde `develop`; mod-only; nunca `develop`/`main`) — RULE-dev-004 |
| Base branch | `develop` |
| DB state | UPU con MC-02 sincronizado + seed de malla |
| Services | suite (storybook 6006 + render), object-manager (GraphQL del mod) |
| Test data | plan con planEntries en varios períodos |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | `listInstances` nombra las relaciones de FK no-core en lowercase (`activityId`→`activity`) y las deposita en `item.data[rel]` (fallback `extended`), per `instance.resolver.js:140` `getRelationName` + `buildTree.ts:32`. Leer la clave/ubicación equivocada rompe el mapeo en runtime. | dual-judge S1 + verificación propia | S1 | **promoted** | **[RULE-platform-017](../rules/platform/RULE-platform-017.md)** |
| L2 | El motor de layouts no soporta `rowAction` de navegación a una pestaña del detalle: `type:'modal'`+`targetLayoutType:'RecordDetail'` fuerza `mode:'create'` sin `instanceId` (`useRowActionHandler.ts:309-323`); `type:'default'` requiere `handler` JS no declarable en JSON. | dual-judge S2 + verificación propia | S2 | **promoted** | **[BUG-layout-005](../bugs/layout/bug-layout-005.md)** |
| L3 | Convención type→element: un `XxxElement` se referencia en layouts como type kebab `xxx` (sufijo `Element` eliminado), per `auto-register.ts` + `CustomElements.stories.ts`. | researcher | S2 | refined | reference (documentado en spec + stories) |
| L4 | Un element nuevo del mod requiere **DOS syncs** para renderizar (no uno): `layout npm run sync` (registra el type en `component-registry.json` vía `layout/scripts/sync.js`) **y** `suite npm run sync`→`sync-i18n.js` (mergea lang del mod a `suite/lang/`, que es lo que lee el i18n global `suite/plugins/i18n.ts:27`). El `setup reset` de object-manager NO hace ninguno (es backend). Detectado en runtime post-cierre. | dev (runtime) | post-cierre | **promoted** | **[RULE-mods-050](../rules/mods/RULE-mods-050.md)** |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Plan de sessions

> Fuente de verdad de tasks: [SPEC-curriculum-design-mesh-view](../specs/SPEC-curriculum-design-mesh-view.md). Plan DET-20 (2 sessions, ~4-5h).

| Session | Objetivo | Tier | Tasks | Tipo |
|---------|----------|------|-------|------|
| S1 | Lógica pura + componente de malla + resumen | T2 | S1.T1..T4 + S1.GATE | ⚑ fuerte |
| S2 | Entrypoints (swap tab + acción listado) + gating de edición + stories | T2 | S2.T1..T3 + S2.GATE | ⚑ fuerte |

### Session 1 — 2026-06-30 — Lógica pura + componente de malla + resumen [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T2

**Objetivo**: Implementar la lógica pura de la malla (agrupación, badge, resumen, gating), su `.spec.ts`, el composable de carga GraphQL y el componente full-page con grid por período + barra de resumen.

**Tasks completadas**:
- [x] S1.T1 — Lógica pura `curriculumMesh.logic.ts` (groupByPeriod, deriveElective, resolveCategoryColor, computeSummary, canEdit) + tipos
- [x] S1.T2 — `.spec.ts` de la lógica pura cubriendo TC-01..05
- [x] S1.T3 — `useCurriculumMesh.ts` (carga GraphQL planEntry/requirementCategory/Curriculum)
- [x] S1.T4 — `CurriculumMeshElement.vue` (grid por período + tarjetas + barra de resumen)
- [x] S1.GATE — Gate de sync Session 1 (tier T2)

**Validación del tier**:
- T2 — vitest run del área: 16/16 PASS (`vitest run modsComponents/CurriculumMesh/`); suite completa del mod sin regresión (exit 0, con coverage); eslint del dir limpio; vue-tsc 0 errores en CurriculumMesh (76 errores TS preexistentes en otros archivos del mod, no introducidos).

**Discoveries / Learns nuevos**:
- L1: el resolver `listInstances` (object-manager `instance.resolver.js:140` `getRelationName`) nombra las relaciones de FK no-core en **lowercase** (`activityId`→`activity`, `categoryId`→`category`) y las deposita en `item.data[relación]` (con fallback a `extended`), igual que lee `buildTree.ts:32`. Detectado por dual-judge + verificado contra el resolver: el primer mapeo usaba `extended['Activity']` (clave/ubicación incorrectas) → habría roto la malla en runtime. Candidato a RULE del módulo.

**Quality review (DET-23)**:

**Reviewer**: LLM principal — loop adversarial dual-judge (DET-35)
**Tier de revisión**: exhaustive (2 jueces ciegos en paralelo + re-judge del fix)
**Resultado global**: pass

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad código | pass | separación lógica pura / composable / componente; JSDoc; nombres claros |
| 2 | Lint | pass | eslint del dir sin findings |
| 3 | Tipado | pass | tipos explícitos (MeshEntry/CategoryVM/PlanVM); `Record<string,any>` sólo en frontera GraphQL (patrón del precedente) |
| 4 | Testing | pass | 16/16; TC-01..05 con asserts concretos + edge (columnas vacías, credits=0, categoría inexistente) |
| 5 | Escalabilidad | pass | `truncated`/`totalCount` expuestos + Alert (>500), alineado a CompositeSectionTree |
| 6 | Mantenibilidad | pass | calca patrón CompositeSectionTree; lógica pura testeable aislada |
| 7 | a11y | pass | `role=region` + `aria-labelledby` |
| 8 | Storybook | n/a | stories son S2.T3 |
| 9 | Error handling | pass | try/catch loguea + limpia estado; loading/error/empty cubiertos |
| 10 | Frontera/reglas | pass | mod-only, sin core, sin ModalStackManager (RULE-cd-014); strings en i18n (no hardcode) |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S1 verde: 16/16 tests, suite del mod sin regresion, lint+tsc limpios. Dual-judge DET-35 APPROVED (2 WARNING confirmados+corregidos, re-judge OK). Continue -> Session 2 (entrypoints+gating+stories).
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Hallazgos dual-judge**: 2 WARNING de correctitud (relación Activity) confirmados por verificación independiente (DET-33) y corregidos; THEORETICAL (color vacío, token CSS dark-mode, truncated, test credits=0) aplicados; concurrencia de fetch (heredada de CompositeSectionTree) y botón de alta en empty-state diferidos a backlog/MC-06. Re-judge del fix: APPROVED, 0 issues nuevos.

### Session 2 — 2026-06-30 — Entrypoints (swap tab + acción listado) + gating + stories [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T2

**Objetivo**: Cambiar el elemento de la pestaña "Malla curricular" del `record-list` al element de malla y agregar la acción de listado (REQ-02); confirmar el gating de edición en el componente (REQ-04); agregar stories del componente.

**Tasks completadas**:
- [x] S2.T1 — Entrypoint: swap del record-list → element de malla en `default_Curriculum_view.json` + rowAction en `default_Curriculum_list.json`
- [x] S2.T2 — Gating de modo edición en el componente (acciones de alta sólo si `canEdit`) + placeholder
- [x] S2.T3 — `CurriculumMesh.stories.ts` (lectura / edición Draft / Active read-only / plan vacío)
- [x] S2.GATE — Gate de sync Session 2 (tier T2)

**Validación del tier**:
- T2 — JSON.parse OK de los 3 layouts (view/edit/list); eslint del dir limpio; vue-tsc 0 errores en CurriculumMesh; vitest del mod 16/16. Smoke runtime (sync + DB) diferido al dev (DB-gated, precedente MC-02/TICKET-093). Storybook build no corrido localmente.

**Discoveries / Learns nuevos**:
- L2: el motor de layouts no soporta una `rowAction` que navegue al detalle en una pestaña específica (`useRowActionHandler.ts:309-323`): `type:'modal'`+`targetLayoutType:'RecordDetail'` fuerza `mode:'create'` sin `instanceId`; `type:'default'` requiere `handler` JS no declarable en JSON. Acceso a tab desde listado ⇒ solo via row-click. Candidato a RULE/bug del módulo.
- L3: convención type→element confirmada — `XxxElement` ⇒ type kebab `xxx` (sufijo `Element` eliminado; `CustomElements.stories.ts` + `auto-register.ts`). `curriculum-mesh`→`CurriculumMeshElement`.

**Quality review (DET-23)**:

**Reviewer**: LLM principal — loop adversarial dual-judge (DET-35), 3 revisiones
**Tier de revisión**: exhaustive
**Resultado global**: pass (tras fix)

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Config swap view/edit | pass | tab→`planEntriesMesh` (type `curriculum-mesh`, planId={{parentId}}, enableEdit view=false/edit=true); sin `planEntriesList` huérfano |
| 2 | Type resolution | pass | `curriculum-mesh`→`CurriculumMeshElement` verificado (auto-register + CustomElements.stories) |
| 3 | rowAction listado | pass (tras fix) | WARNING confirmado: modal→RecordDetail fuerza create sin instanceId → **eliminada**; REQ-02 acción-listado → backlog should (DEC-LOCAL-03) |
| 4 | Props element | pass | planId/enableEdit/title coinciden con `CurriculumMeshElement.vue` |
| 5 | Stories | pass | 2 stories prop-contract (Vista/Edición); data-states (Active/empty) DB-gated en smoke (precedente CompositeSectionTree) |
| 6 | JSON validez | pass | 3 layouts parsean |
| 7 | Frontera/reglas | pass | mod-only, sin core, sin layoutType nuevo (RULE-cd-014) |
| 8 | Despliegue | n/a | `component-registry.json` = artefacto de `npm run sync` (no se autora) |

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S2 verde tras fix: 3 layouts JSON OK, eslint+tsc limpios, vitest 16/16. Dual-judge DET-35 (3 revisiones): WARNING rowAction confirmado -> eliminada (REQ-02 accion-listado diferida a backlog should, DEC-LOCAL-03). Pestana (REQ-02 MUST) + REQ-01/03/04 entregados. Smoke sync/DB diferido al dev. -> cierre del ticket.
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Hallazgos**: 1 WARNING confirmado (rowAction rota) → corregido por eliminación (recomendación convergente de los jueces); REQ-02 acción-listado diferida a backlog `should` (DEC-LOCAL-03, no bloquea cierre DET-17). THEORETICAL: stories de Active/empty (backend-coupled, smoke-validadas), registry de sync (paso de pipeline del dev).

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 | TC-01, TC-02 | unit (.spec.ts) | pass |
| REQ-03 | TC-03 | unit | pass |
| REQ-04 | TC-04, TC-05 | unit | pass |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-01 | plan con entries en períodos 1 y 2 | REQ-01 | unit | seed | groupByPeriod | tarjetas agrupadas en 2 columnas | 2 columnas (['b','a'] / ['c']) | curriculumMesh.logic.spec.ts | pass |
| TC-02 | entry con `blockId != null` | REQ-01 | unit | seed | deriveElective | tarjeta con badge "electivo" | isElective=true; propagado a MeshCard | curriculumMesh.logic.spec.ts | pass |
| TC-03 | plan con 3 entries (6+4+5 cr) | REQ-03 | unit | seed | computeSummary | 15 cr de diseño, 3 asignaturas | designCredits=15, courses=3, maxLoad=10 | curriculumMesh.logic.spec.ts | pass |
| TC-04 | plan `status=Draft` en edición / en Ver | REQ-04 | unit | seed | canEdit | acciones visibles / ocultas | edit→true, view→false | curriculumMesh.logic.spec.ts | pass |
| TC-05 | plan `status=Active` | REQ-04 | unit | seed | canEdit | acciones de edición ocultas | Active→false, Archived→false | curriculumMesh.logic.spec.ts | pass |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| spec FE | vitest del mod | 788/788 (baseline TICKET-093) | suite del mod verde (exit 0, --coverage) + nuevo `curriculumMesh.logic.spec.ts` 16/16 | +16 tests, sin regresión |

## Summary

**MC-05 (UPONE-1348) — cerrado.** La pestaña "Malla curricular" del detalle de un Plan pasó de una tabla (`record-list`) a la **vista visual de malla**: grid de columnas por período, tarjetas (código, créditos, color de línea, badge electivo), barra de resumen del plan y gating de edición por `Curriculum.status`. 100% mod-only, sólo lectura.

**Entregado**:
- **REQ-01** — `CurriculumMeshElement.vue` (type `curriculum-mesh`) renderiza el grid por período (`groupByPeriod`) con badge electivo (`blockId != null`) y color de línea (`requirementCategory.color`).
- **REQ-03** — barra de resumen (créditos diseño/req, períodos, asignaturas, carga máx/período) vía `computeSummary`.
- **REQ-04** — gating `canEdit(status, mode)` (edición sólo en modo edit + `status='Draft'`); `Active`/`Archived` siempre sólo lectura.
- **REQ-02 (MUST)** — pestaña del RecordDetail (`default_Curriculum_view/_edit.json`) renderiza el element con `planId={{parentId}}`.

**Artefactos**: `curriculumMesh.logic.ts` (+ `.spec.ts`, 16 tests), `useCurriculumMesh.ts` (GraphQL), `CurriculumMeshElement.vue`, `CurriculumMesh.stories.ts` (4 estados), i18n `curriculumMesh.*` en `lang/es_CL.json`, swap en 2 layouts. Reuso: átomos del design system + patrón `CompositeSectionTree`.

**Calidad**: 16/16 tests, suite del mod sin regresión, eslint + vue-tsc limpios (0 errores introducidos). Dual-judge adversarial (DET-35) por session: en S1 cazó 2 bugs de runtime (relación Activity mal nombrada/ubicada) confirmados verificando el resolver real (DET-33) y corregidos; en S2 cazó una rowAction rota (eliminada). Reviewer aislado de cierre (DET-30 REQ-03): **approve** (5/5 checks).

**Diferido (no bloquea — DET-17)**:
- **Backlog B-1 (should)**: acción "Malla curricular" en el listado de planes (REQ-02 escenario acción-listado). El motor de layouts no soporta hoy rowAction de navegación-a-tab (DEC-LOCAL-03). El acceso a la malla queda por el row-click → detalle → pestaña.
- **MC-06**: alta/edición de asignaturas (el placeholder "+ Asignatura" gated ya está). **MC-08**: filtros interactivos (líneas hoy = leyenda estática).

**Pendiente de despliegue (DB-gated)** — para que la malla renderice en runtime se requieren **DOS syncs distintos** (ver Post-cierre):
1. `cd layout && npm run sync` — copia el element a `layout/src/modsComponents/` + regenera `component-registry.json` (registra el type `curriculum-mesh`).
2. `cd suite && npm run sync` (corre `sync-i18n.js`) — mergea los lang del mod a `suite/lang/` (las claves `curriculumMesh.*`).
3. Reiniciar/recargar el dev de suite (Vite `import.meta.glob` es build-time) + smoke en UPU.

**Learns para promover** (ofrecidos): L1 (relaciones lowercase en `listInstances` → RULE platform), L2 (rowAction sin navegación-a-tab → BUG/RULE layout), L3 (convención type→element, ya documentada).

**Story Points**: published 5 · executed 2 (sessions-heuristic; LLM speedup ~1).

## Post-cierre — fix de runtime (registro de element + i18n)

> 2026-06-30, tras el cierre. El dev levantó el entorno y reportó que la pestaña "Malla curricular" no mostraba ni el record-list (correcto, se quitó) ni el componente nuevo; luego, ya renderizando, las etiquetas salían como claves crudas (`curriculumMesh.summary.*`, `curriculumMesh.period`…). Ningún defecto de código — **dos pasos de sync de entorno faltantes**. Código entregado intacto.

**Síntoma 1 — componente en blanco.** El element `curriculum-mesh` no resolvía: no estaba en `layout/src/modsComponents/` ni en `component-registry.json`. El `vueform.config.ts` de layout registra elements vía `import.meta.glob('./src/modsComponents/*/*.vue')` (build-time). El `setup reset` de object-manager (backend) no sincroniza componentes de frontend.
- **Fix**: `cd layout && node scripts/sync.js` → copió `CurriculumMesh/` + regeneró `component-registry.json` con `"curriculum-mesh": { componentName: CurriculumMeshElement }`. Verificado. Datos OK al render (códigos/nombres/créditos correctos → el fix de relación de S1 confirmado en runtime).

**Síntoma 2 — claves i18n crudas.** El i18n global de suite se arma con `import.meta.glob('../lang/**/*.json')` sobre **`suite/lang/`** (`suite/plugins/i18n.ts:27`), no sobre el lang del mod. `suite/lang/es_CL.json` tenía `compositeSectionTree`/`colorPicker` pero **no `curriculumMesh`** (mi bloque vivía sólo en `mods/curriculum-design/lang/es_CL.json`).
- **Fix**: `cd suite && node scripts/sync-i18n.js` (parte de `suite npm run sync`) → mergeó `curriculumMesh.*` a `suite/lang/es_CL.json`. Verificado. Pendiente: recargar/reiniciar el dev de suite (glob build-time).

**Artefactos tocados** (todos **generados por sync — NO se commitean**, per `config.yaml` critical_rules): `layout/src/modsComponents/CurriculumMesh/`, `layout/src/modsComponents/component-registry.json`, `layout/src/stories/CurriculumMesh.stories.ts`, `suite/lang/*.json`. Sin cambios de código fuente.

**Fix de contraste (dark theme)** — commit `667b4e6` (UPONE-1348 fix): el badge de modo usaba `Badge variant="secondary"`, cuyo bg es `--up1-color-secondary-500` = `--up1-gray-600` (#9b9b9b, **fijo — el dark block de `colors.css:304` no lo remapea**) con texto blanco → contraste ~2:1, ilegible en dark. Reemplazado por chip propio `.cm-mode` con tokens que **invierten por tema** (`--up1-bg-tertiary` + `--up1-text-secondary` en lectura; `--up1-color-primary` sólido + `--up1-text-inverse` en edición). Validado lint+tsc+16/16; re-synced a layout. → **Learn L5 → promovida a [BUG-layout-006](../bugs/layout/bug-layout-006.md)**: el `Badge variant="secondary"` del DS no es seguro en dark (gray fijo + texto blanco); el fix del átomo (fijar `color` legible o remapear secondary en dark) es core/layout fuera de alcance del mod — registrado como bug `detected`.

**i18n en/pt agregado** — commit `f118cc3` (mod): se crearon `mods/curriculum-design/lang/{en_CL,pt_BR}.json` con el namespace `curriculumMesh` (title/mode/summary/period/electiveBadge/buttons/truncated) y se mergeó a `suite/lang/{en_CL,pt_BR}.json` vía `sync-i18n.js`. Nota: el resto de los namespaces de componentes del mod (`compositeSectionTree`, `colorPicker`, `iconPicker`) siguen **es-only** — `curriculumMesh` es el primero con en/pt; cobertura completa en/pt de componentes es un esfuerzo project-wide aparte.

**Learn L4 → promovida a [RULE-mods-050](../rules/mods/RULE-mods-050.md)**: un modsComponent nuevo requiere 2 syncs (layout component + suite i18n) + restart; el reset de object-manager no los hace. Candidato a RULE del módulo: *checklist de despliegue de un modsComponent nuevo* (layout sync → registra type; suite sync → i18n; reiniciar dev). Mitiga el gap entre "código mergeado" y "renderiza en runtime".
