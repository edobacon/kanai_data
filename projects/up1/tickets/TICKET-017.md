---
id: TICKET-017
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1038
module: curriculum-design
autopilot: manual
---

# Habilitar crear primer EvaluationComponent cuando el composite-section-tree esta vacio en Programa de asignatura

## Request

Reportado por el dev: tras crear un Programa de asignatura nuevo ("Taller de ingles") y abrir el detail en modo edit, al ir a la pestana Evaluacion el componente `composite-section-tree` muestra el mensaje "Este programa no tiene componentes de evaluacion cargados." pero NO ofrece accion para crear el primer componente. El usuario queda bloqueado: no hay forma de bootstrappear el esquema de evaluacion desde la UI cuando el programa arranca sin EvaluationComponent.

Hasta hoy esto no se habia detectado porque todos los programas de los seeds (UV/AIEP) arrancan con EvaluationComponents precargados, y los flujos de QA/LLM-e2e validados en TICKET-009/010/011 siempre operaron sobre tree poblado (edit, add-child, reorder). El caso "tree.length === 0 + canCreate primero" nunca tuvo coverage real ni story de Storybook propia.

Solicitud: habilitar la creacion del primer EvaluationComponent cuando el tree esta vacio, en linea con como las demas listas RT del layout `default_AcademicActivity_edit` (Modalidades, Resultados, Contenidos, Sesiones, Bibliografia, CustomSection) ofrecen su CTA "Nueva" desde el estado vacio. Ticket basado en UPONE-1035 (Curriculum Design | Programa de asignatura | Configuracion de vista de detalle de programa de asignatura, sprint Migracion uAssessment SP1, epic UPONE-1038).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix |
| Tipo de cambio | single — modulo curriculum-design (sin tocar core platform) |
| Modulo principal | curriculum-design |
| Modulos afectados | mods/curriculum-design (CompositeSectionTreeElement.vue, stories, lang, layouts JSON, tests) |
| creates_visual | false |
| creates_data | false |

> Nota: el sintoma es UX pero el fix no introduce nuevas pantallas/datos. Pertenece al ecosistema existente del componente `composite-section-tree` (custom Vueform element). Asumido por defecto del scope del TICKET-009/010/011 en el cierre rapido — el bug es de gap, no de regresion intencional.

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El botón "Crear primer componente" YA existe en el codigo del SFC pero la condicion `v-if="enableEdit && ownerId"` no se cumple en runtime cuando se renderiza el empty state en la pestana Evaluacion del detail edit. Es un bug de gating, NO de componente faltante | open — alta confianza | [CompositeSectionTreeElement.vue:64-75](../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue#L64-L75). i18n key `compositeSectionTree.buttons.createFirst` declarado en `lang/es_CL.json:9`. CSS `.cst-card__empty-cta` declarado linea 541 |
| H2 | El `{{parentId}}` del `ownerId` no se interpola al UUID real del programa cuando llega al custom Vueform element. `LayoutOrchestrator.replacePlaceholders` (linea 491) recorre todo el config recursivamente — pero solo si `props.instanceId` esta presente (linea 543: `if (props.instanceId)`). En el momento exacto del primer render despues de crear, instanceId puede no estar listo y el watch reactivo del composable no recupera el botón (la condicion del v-if mira `props.ownerId` directo, no `tree`) | open | LayoutOrchestrator.vue:490-545. La interpolacion es global al config, pero el botón depende del prop NO de la query. Hay que reproducir y mirar Vue DevTools para confirmar el valor que llega como prop |
| H3 | `enableEdit` declarado como `true` en el JSON del layout llega como `false` al custom element por el pipe schema Vueform → element props. En el JSON el flag esta correcto (validado por inspeccion directa del usuario sobre `default_AcademicActivity_edit.json`), pero Vueform puede pisarlo si reconoce conflicto con su prop estandar `disabled` o por capability gating | open | El layout JSON tiene `"enableEdit": true` para evaluationList. Validar en Vue DevTools si la prop llega como `true` o `false`. Stories en Storybook con `enableEdit: true` literal (sin schema Vueform externo) funcionan — diferencial confirma el flow problematico |
| H4 | Es un caso de coverage NO de bug: el botón aparece bien en runtime al recargar el detail, pero el dev lo vio en el momento exacto post-crear cuando algun watch reactivo aun no habia disparado. Repro requiere reload despues de crear. Storybook no cubre el empty state con `enableEdit: true` + tree vacio porque las stories existentes (`LearningOutcomes`, `EvaluationComponents`, `ReadOnly`) parten con `ownerId: 'demo-academic-activity-id'` literal y esperan datos | open | [stories.ts:108,164,214](../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTree.stories.ts) usan los 3 patrones poblado/poblado/readonly. No hay story `EmptyEditable` |
| H5 | El componente custom Vueform `composite-section-tree` y el contrato `canCreate*` de record-list son dos contratos DISTINTOS. Las 6 listas RT usan `record-list` con `canCreate: true` + `canCreateLayoutId` + `canCreateInitialData` — el record-list de platform sabe pintar su propio CTA aunque este vacio. El composite tree maneja su empty state internamente con un boton custom que depende SOLO de sus propias props (`enableEdit + ownerId`). Si el fix se hace solo en el JSON del layout (replicar el contrato `canCreate*`) NO resuelve nada porque el composite-section-tree no lo lee | confirmed (lectura de codigo) | `record-list` lee `canCreate*` desde su `layoutConfig` (suite/RecordDetail.vue patron). `composite-section-tree` lee `enableEdit` + `ownerId` + boton interno custom — ver CompositeSectionTreeElement.vue:64-90. **No es un fix de layout JSON** salvo que el JSON ya no envie `enableEdit:true` o `{{parentId}}` |
| H6 | Existe gap UX/discoverability adicional: el texto del empty (`"Este programa no tiene componentes de evaluacion cargados."`) se ve mas como un estado terminal que como una invitacion a accion. Aunque el botón aparezca, conviene revisar copy + jerarquia visual del empty para que invite a crear. Comparar con record-list standard del platform (los otros 6 tabs) que muestran su CTA con prominencia mayor | open | Heuristica UX. Validar con LLM-e2e screenshot post-fix vs post-fix de los otros tabs |
| H7 | Posible regresion silenciosa del mismo problema en los otros 5 RT del tree pattern (LearningOutcome usa composite-section-tree tambien — ver story `LearningOutcomes`). El layout actual usa `record-list` para 5 RT y `composite-section-tree` solo para Evaluation. Pero si manana se cambia LearningOutcome a tree (caso valido por la metrica suma 100% de Bloom), heredaria el bug | open | Layout `default_AcademicActivity_edit.json` confirma 1 sola list con `composite-section-tree` (evaluationList). El resto son `record-list`. No es bug actual pero candidato a regresion futura — testear el fix sobre cualquier consumidor de `composite-section-tree`, no solo Evaluation |

### Context found

**Anatomia del problema (capa por capa)**

1. **Layout JSON** ([default_AcademicActivity_edit.json](../../uplanner/up1/mods/curriculum-design/objects/layouts/) — visible en el adjunto del intake):
   - `evaluationList.type: "composite-section-tree"` (unico custom element del layout — los otros 6 son `record-list`)
   - `evaluationList.enableEdit: true`
   - `evaluationList.ownerId: "{{parentId}}"`
   - `evaluationList.recordType: "EvaluationComponent"`
   - `evaluationList.relationName: "rt__EvaluationComponent__curricularsection"`
   - NO tiene `canCreateInitialData` (contrato que SI usan los 6 record-list) — y NO deberia tenerlo porque el composite tree es un contrato distinto (ver H5)

2. **LayoutOrchestrator** ([LayoutOrchestrator.vue:491-545](../../uplanner/up1/layout/src/layouts/LayoutOrchestrator.vue#L491-L545)):
   - Define `replacePlaceholders(obj, instanceId)` recursivo (string + array + object) que reemplaza `{{parentId}}` por el `instanceId` real
   - Se invoca en `processedConfig` solo si `props.instanceId` esta presente
   - **Gap potencial**: cuando un programa se crea via UI y se navega a edit del mismo, `instanceId` puede estar disponible en `route.params` pero el orden de mount puede dejar al custom element en primer render sin id resuelto. Pendiente verificar empiricamente

3. **CompositeSectionTreeElement.vue** (SFC custom Vueform):
   - Empty state branch en linea 64-75: `<div v-else-if="tree.length === 0">` con texto del `emptyText` y boton "Crear primer componente"
   - Boton tiene gating: `v-if="enableEdit && ownerId"` — ambos deben ser truthy. `ownerId` viene de la prop, no del composable (el composable solo dispara fetch o no, no afecta al render del boton)
   - Cuando se hace click, llama `openCreateRoot()` que abre el Modal con `CompositeSectionForm` en mode `create-root`
   - Submit del form ejecuta `CREATE_INSTANCE` mutation con `objectType: relationName` y el payload completo (linea 418-431) incluyendo `ownerType`, `ownerId`, `recordType`, `parentId: null`, `position: 0`, `baseData`, `rtData`

4. **useCompositeSectionTree composable**:
   - `resolveOwnerId()` retorna `null` si `ownerId` es falsy. NO hace fetch si owner es null
   - Si llega `"{{parentId}}"` literal (string no interpolada), pasa como truthy → ejecuta query con id invalido → 0 resultados → tree=[]
   - Watch reactivo sobre ownerId Ref, refresca cuando cambia

5. **Stories Storybook existentes** ([CompositeSectionTree.stories.ts](../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTree.stories.ts)):
   - `LearningOutcomes` (linea 71-122): poblado, `enableEdit: true`
   - `EvaluationComponents` (linea 128-178): poblado, `enableEdit: true`
   - `ReadOnly` (linea 184-228): poblado, `enableEdit: false`
   - **Ninguna story cubre `tree.length === 0 + enableEdit: true`** — gap directo de coverage

6. **Test LLM-e2e `create-section-flow.md`**:
   - El scenario actual valida CTA de creacion en los 6 record-list (Modalidades, Resultados, etc.)
   - **Declara explicitamente "todos menos Evaluacion que usa composite-section-tree custom"** — el equipo decidio no cubrir Evaluation con ese scenario porque el contrato es distinto. No hay scenario alternativo que cubra `evaluation-empty-create-first`

**Rules del modulo**: ninguna registrada en `curriculum-design/` (`dkc_find_records record_type=rule module=curriculum-design` → vacio). Las rules aplicables son de mods/platform en otros modulos.

**Bugs abiertos relacionados**: ninguno especificamente sobre composite-section-tree empty state. BUG-platform-011 (`modalStackManager no expuesto a custom Vueform elements`) ya esta workaroundeado con modal casero — no afecta este fix.

**Specs relacionados**:
- [SPEC-curriculum-design-overview](../specs/curriculum-design/overview.md)
- [SPEC-curriculum-design-programa-asignatura](../specs/curriculum-design/programa-de-asignatura.md)
- [CAP-CUR-029 Evaluacion](../specs/curriculum-design/capabilities/CAP-CUR-029.md) (si existe — buscar)
- TICKET-012 docs/guides/composite-section-tree.md (review completo del ecosistema)

**Tickets DKC predecesores**:
- TICKET-009 (UPONE-1035) — implementacion del detail con secciones configurables (cerrado)
- TICKET-010 — refactor calidad (cerrado, zero behavior change)
- TICKET-011 — plan de pruebas baseline + LLM-e2e (cerrado, scenarios validados)
- TICKET-012 — review calidad CompositeSectionTree post-baseline (cerrado)
- TICKET-013 — ESLint config del mod (cerrado)
- TICKET-014 — fix 84 errores TS (cerrado)
- TICKET-015 — selects en RecordTypes (cerrado)

**Warnings**:
- Tocar `CompositeSectionTreeElement.vue` impacta a TODOS los consumidores del componente (manana puede haber tree de LearningOutcome u otro RT). Cualquier cambio al gating del boton debe verificar regresion sobre el patron generico
- Si el bug resulta ser de LayoutOrchestrator (H2), el fix sale del mod a core platform y aplica DET-10 / instrucciones globales "no se modifican archivos fuera de mods/<mod>/" — escalar al equipo platform UP1 y trabajar workaround dentro del mod
- DET-21 obligatorio: este ticket es work_type=fix full-path, requiere `teach-intake` antes de design-fix
- DET-20 obligatorio: el plan de sessions debe vivir tambien en este ticket markdown bajo `### Plan de sessions`, no solo en el spec

## Setup

### Environment

| Campo | Valor |
|-------|-------|
| Branch | `UPONE-XXXX-evaluation-empty-create-first` (pendiente: confirmar Jira id nuevo o asociar a UPONE-1038 epic) |
| Base branch | `develop` (default del repo) |
| DB state | up1 corriendo con seeds standard. Programa de asignatura nuevo (sin EvaluationComponent) — el dev ya creo "Taller de ingles" en tenant UPU |
| Services | object-manager (4000), suite (3000), redis. `npm run sync --workspace=@uplanner/object-management-backend` si se tocan JSON del mod |
| Test data | (a) Programa SIN evaluation: "Taller de ingles" (creado por el dev). (b) Programa CON evaluation: UV Ecuaciones Diferenciales (seed) para regression |

### Reproduction steps

1. **Precondicion**: tenant UPU activo. Programa de asignatura nuevo creado via UI sin EvaluationComponents asociados. AcademicActivity.id conocido (visible en URL del detail).
2. Navegar a `http://localhost:3000/UPU/AcademicActivity/{newProgramId}/RecordDetail/default_AcademicActivity_edit`.
3. Click en tab "Evaluacion".
4. Observar el estado vacio del `composite-section-tree`.
5. **Resultado observado**: texto "Este programa no tiene componentes de evaluacion cargados.". Sin CTA visible para crear el primer componente.
6. **Resultado esperado**: el componente muestra ademas un boton primario "+ agregar elemento" (copy decidido por el dev 2026-05-12, ver Open questions resueltas) que al hacer click abre el modal de creacion con los campos del RT EvaluationComponent (componentCode, componentType, weight, method, isDirectEvidence) — equivalente a invocar `openCreateRoot()` del SFC.
7. **Regresion**: el mismo flujo sobre UV Ecuaciones Diferenciales (tab Evaluacion con tree poblado) sigue funcionando — `addRoot` button visible en el summary, edit y drag-n-drop intactos.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Plan de sessions (refinado por design-fix 2026-05-12 — ver SPEC-curriculum-design-001 para task IDs)

> Refinado en `design-fix`. Diagnosis automatizada via debug instrumentation + scenario LLM-e2e (decision dev: data-attrs + console.log `[CST_DEBUG]`, TEMPORALES — S2 los remueve).

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Diagnosis automatizada de causa raiz (H1/H2/H3) via instrumentation temporal + scenario LLM-e2e | 1 — research | T2 | S1.T1 agregar `data-cst-debug-*` attrs + console.log `[CST_DEBUG]` al SFC. S1.T2 crear scenario `diagnose-empty-state-props.md`. S1.T3 ejecutar contra "Taller de ingles" + reportar valores. S1.T4 baseline cross-validation contra UV poblado. S1.GATE | ⚑ fuerte | Hipotesis ganadora documentada con valores exactos. Si gana H2 (LayoutOrchestrator core) → escalate: workaround en el mod + issue paralelo platform UP1. Si gana H1/H3 → continue a S2 |
| S2 | Patch + cleanup de la instrumentation | 2 — fix | T2 | S2.T1 aplicar fix segun hipotesis ganadora (mod o workaround). S2.T2 cambiar copy a "+ agregar elemento". S2.T3 **CLEANUP** de instrumentation (grep limpio). S2.T4 tests unit empty-state.test.ts. S2.T5 regression suite. S2.GATE | auto | Tests verdes + coverage no baja + grep `CST_DEBUG\|data-cst-debug\|TICKET-017 DIAG` retorna 0 matches + repro manual del bug pasa |
| S3 | Cobertura cross-RT + lesson learned | 3 — coverage | T3 | S3.T1 stories `EmptyEditable - {EvaluationComponent, LearningOutcome}` + `EmptyReadOnly`. S3.T2 scenario `evaluation-empty-create-first.md` con 3 screenshots. S3.T3 re-ejecutar scenarios Evaluation existentes. S3.T4 crear RULE sobre coverage de empty states. S3.T5 actualizar doc. S3.GATE | ⚑ fuerte | Scenarios passing + screenshots archivados + rule promovida + doc actualizado + acceptance del dev. Continue → request-close (DET-22 → teach-close → status: closed) |

> **Heuristica de tier aplicada**: S1 cambia 1 archivo del mod (instrumentation aditiva) + scenario nuevo → T2. S2 multi-archivo (SFC + lang + tests + cleanup) → T2. S3 user-facing visible (stories + e2e + rule + doc) + gate ⚑ fuerte → T3.

> **Decisiones de intake aplicadas (ver SPEC-001 > Decisions y teach-intake > Decision drivers)**: external=UPONE-1038, copy="+ agregar elemento", instrumentation hibrida TEMPORAL.

### Sessions ejecutadas

#### Session 1 — Diagnosis automatizada (ejecutada 2026-05-12) [tipo: ⚑ fuerte] [tier: T2]

**Tasks ejecutadas**

| Task | Estado | Notas |
|------|--------|-------|
| S1.T1 — Agregar debug instrumentation TEMPORAL al SFC | done | `data-cst-debug-*` attrs + `console.log [CST_DEBUG]` + `onMounted` + `watch` aplicados en `CompositeSectionTreeElement.vue`. Validado typecheck (sin nuevos errors) y lint (limpio). Sync propagado a `layout/src/modsComponents/` via `npm run sync --workspace=@uplanner/layout-engine` (14 matches en target). 3 Vue warns sobre nombres `__cstDebug*` (prefix `_` reservado de Vue), funcional pero ruidoso — anotado como learn para si la instrumentation volviera a permanente |
| S1.T2 — Crear scenario LLM-e2e diagnose-empty-state-props.md | done | Scenario con 2 casos comparativos (A empty + B baseline UV poblado), evaluate_script para data-attrs + list_console_messages para entries [CST_DEBUG] |
| S1.T3 — Ejecutar scenario contra Taller de ingles (Caso A) | done | Ejecutado en ambos modes: VIEW (rol Consultor) y EDIT (acceso via row-action "Editar" desde el listado, NO via URL directa — URL directa al detail edit redirige a /login/UPU por race condition de Clerk session, hallazgo lateral) |
| S1.T4 — Baseline cross UV (Caso B) | NOT EXECUTED | Innecesario. Caso A en EDIT ya descarto H1/H2/H3 definitivamente. Sin valor agregado correr Caso B |
| S1.GATE | done | Decision: **iterate-to-close** (re-scope del fix a no-op) |

**Dump empirico — Caso A VIEW (Taller de ingles `cmp2qe04g0000xxmubwsiyujw`)**

```json
{
  "dataset": {
    "enableEdit": "false",
    "ownerId": "cmp2qe04g0000xxmubwsiyujw",
    "ownerIdIsPlaceholder": "false",
    "treeLength": "0",
    "ctaVisible": "false"
  },
  "ctaButtonInDOM": false,
  "emptyText": "Este programa no tiene componentes de evaluación cargados."
}
```

Console: `[CST_DEBUG] mounted` + `reactive-update` con `enableEdit: false`, `enableEditType: "boolean"`, `ownerId: "cmp2qe04g0000xxmubwsiyujw"`, `treeLength: 0`, `ctaVisible: false`. Comportamiento correcto en view (gate `enableEdit && ownerId` evalua false → CTA no se renderiza).

Screenshot: [s1t3a-empty-view-taller-ingles.png](TICKET-017.screenshots/s1t3a-empty-view-taller-ingles.png).

**Dump empirico — Caso A EDIT (mismo programa, via row-action "Editar")**

```json
{
  "dataset": {
    "enableEdit": "true",
    "ownerId": "cmp2qe04g0000xxmubwsiyujw",
    "ownerIdIsPlaceholder": "false",
    "treeLength": "0",
    "ctaVisible": "true"
  },
  "ctaButtonInDOM": true,
  "ctaButton": {
    "text": "Crear primer componente",
    "visible": true,
    "offsetWidth": 247,
    "offsetHeight": 38,
    "displayCss": "block",
    "visibilityCss": "visible",
    "opacityCss": "1",
    "bounding": { "x": 646.5, "y": 481.4 }
  }
}
```

Console: `[CST_DEBUG] mounted` + `reactive-update` con `enableEdit: true` (boolean), `ownerId: cuid real`, `ctaVisible: true`.

Screenshot: [s1t3a-empty-edit-taller-ingles-CTA-VISIBLE.png](TICKET-017.screenshots/s1t3a-empty-edit-taller-ingles-CTA-VISIBLE.png).

**Hipotesis status final**

| # | Hipotesis | Status final | Evidencia |
|---|-----------|--------------|-----------|
| H1 | Gate `v-if="enableEdit && ownerId"` falla en runtime | ✗ DESCARTADA | `ctaVisible: true` + `ctaButtonInDOM: true` + boton renderizado 247x38px visible |
| H2 | `{{parentId}}` no interpolado | ✗ DESCARTADA | `ownerId: cmp2qe04g0000xxmubwsiyujw` (cuid real), `ownerIdIsPlaceholder: false` en ambos modes (view + edit). LayoutOrchestrator.replacePlaceholders funciona correcto |
| H3 | `enableEdit` no llega como boolean true en edit | ✗ DESCARTADA | `enableEdit: true`, `enableEditType: "boolean"`. Vueform propaga la prop sin pisar |
| H4 | Coverage/timing/repro — no es bug, el dev no lo vio | ~ candidata | Confirmable post-feedback del dev (ver decision del gate) |
| H5 | Contratos distintos record-list vs composite-section-tree | ✓ CONFIRMADA (intake) | sin cambios |
| H6 | UX/discoverability del empty | ✓ CONFIRMADA POST-FEEDBACK | El dev reconoce: "lo veo, ya estaba ahi tambien antes, no lo note". El boton existe pero no fue identificado como CTA primario |
| H7 | Regresion cross-RT | ~ pendiente | Sin coverage agregado en este ticket — no es bloqueante porque H1/H2/H3 nunca aplicaron |

**Hallazgo lateral**: navegacion al detail edit via **URL directa** redirige a `/login/UPU` (Clerk session race condition); via **row-action "Editar"** del listado funciona. No es bug de este ticket pero conviene reportarlo aparte si es repro consistente.

**Decision del gate (⚑ fuerte)**: **iterate-to-close — re-scope del fix a no-op**

Driver: el bug funcional reportado NO EXISTE. El dev reconoce que el boton siempre estuvo y simplemente no lo identifico visualmente como CTA. Aplicar el fix planeado (cambio de copy + cobertura + cleanup) seria trabajo sin valor — el componente actua segun spec.

Acciones de cierre acordadas con el dev:
- Revertir toda la instrumentation de S1.T1 (working tree del SFC al estado pre-S1)
- Eliminar el scenario `diagnose-empty-state-props.md` de S1.T2
- NO aplicar cambio de copy (DEC-LOCAL-02 del spec queda como decision no-implementada — el dev opto por dejar el copy actual)
- NO agregar stories ni scenario nuevo de cobertura (el dev opto por dejar como esta)
- Git cleanup: vuelta a develop, eliminar feature branch
- Cerrar ticket DKC + spec con outcome documentado

Outcome del spec: `done` con campo de cierre = `no-fix applied — original report was UX confusion, not functional bug`.

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-017-1 — empty state ofrece CTA crear primer EvaluationComponent | TC1, TC2, TC3 | unit + integration + LLM-e2e | pending |
| REQ-017-2 — regression: tree poblado mantiene addRoot, edit, drag-n-drop | TC4, TC5 | LLM-e2e + manual | pending |
| REQ-017-3 — coverage cross-RT: cualquier consumidor de composite-section-tree con tree vacio | TC6 | Storybook story | pending |
| REQ-017-4 — regression negativa: sin `enableEdit` el boton NO aparece (modo view) | TC7 | unit + Storybook | pending |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC1 | Programa nuevo sin EvaluationComponent → tab Evaluacion → boton "+ agregar elemento" visible | REQ-017-1 | LLM-e2e + manual | Programa "Taller de ingles" creado, sin evaluation | 1) Navegar al detail edit. 2) Click tab Evaluacion. 3) Inspeccionar DOM | Boton primario con icono bi-plus-lg + texto "+ agregar elemento" visible en `.cst-card__empty-cta` | — | screenshot | pending |
| TC2 | Click "+ agregar elemento" → modal Form abre con campos EvaluationComponent | REQ-017-1 | LLM-e2e | Empty state visible (TC1 passes) | 1) Click boton. 2) Esperar modal | Modal `cst-modal__card` con campos: name, componentCode, componentType, weight, method, isDirectEvidence segun `editableFields` del layout | — | screenshot | pending |
| TC3 | Submit form valido → tree pasa a 1 nodo, summary visible | REQ-017-1 | LLM-e2e + unit | Modal abierto (TC2) | 1) Completar campos minimos. 2) Submit. 3) Esperar refetch | tree.length === 1, summary muestra "1 nodo / 1 raiz", primer nodo renderizado con codigo/tipo/weight | — | screenshot + apollo mutation log | pending |
| TC4 | Regression: programa UV con EvaluationComponents → addRoot button visible + edit + reorder OK | REQ-017-2 | LLM-e2e | UV Ecuaciones Diferenciales seed | 1) Detail edit. 2) Tab Evaluacion. 3) Inspeccionar summary y nodes | summary muestra "+ Agregar" button. Tree poblado. Edit modal funciona. Drag handles visibles | — | screenshot + reorder LLM-e2e existente | pending |
| TC5 | Story `EmptyEditable` en Storybook renderiza boton CTA | REQ-017-3 | unit | mock apollo retorna []. enableEdit=true. ownerId='demo-id' | render → assert boton present + click dispara openCreateRoot | Boton visible, click llama setup state mode='create-root' | — | Storybook screenshot | pending |
| TC6 | Story `LearningOutcomeEmpty` (cross-RT) renderiza boton CTA | REQ-017-3 | unit | mock apollo retorna []. recordType=LearningOutcome | render → assert boton present | Mismo boton, mismas labels — confirma agnosticismo | — | Storybook screenshot | pending |
| TC7 | Modo view (enableEdit=false) NO renderiza boton, solo texto empty | REQ-017-4 | unit | mock apollo retorna []. enableEdit=false | render → assert boton absent, texto present | `.cst-card__state` con texto, sin `.cst-card__empty-cta` | — | unit test snapshot | pending |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| `mods/curriculum-design/modsComponents/CompositeSectionTree/__tests__/empty-state.test.ts` | unit | S2.T3 | TC5, TC7 | vitest + vue-test-utils |
| `mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTree.stories.ts` (extender) | storybook | S3.T1, S3.T2 | TC5, TC6 | Storybook |
| `mods/curriculum-design/tests/llm-e2e/scenarios/evaluation-empty-create-first.md` | LLM-e2e | S3.T3 | TC1, TC2, TC3 | chrome-devtools MCP |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| vitest unit mod | `npm test --workspace=@uplanner/curriculum-design-mod -- composite` | — | — | — |
| vitest integration mod | `npm run test:integration --workspace=...mod` | — | — | — |
| LLM-e2e create-section-flow | chrome-devtools MCP scenario | passes (sin Evaluation) | passes (Evaluation incluida via nuevo scenario) | + 1 scenario |

## Summary

**Outcome**: cerrado sin aplicar fix. El bug funcional reportado no existe: el boton "Crear primer componente" SI aparece en el empty state del tab Evaluacion en mode edit. El reporte original era confusion de UX/discoverability — el dev no identifico visualmente el boton como CTA primario.

**Resultado de la diagnosis (S1)**:
- H1 (gate del v-if falla) — ✗ refutada con evidencia empirica
- H2 (`{{parentId}}` no se interpola) — ✗ refutada con evidencia empirica
- H3 (`enableEdit: true` no llega como boolean) — ✗ refutada con evidencia empirica
- H5 (contratos distintos record-list vs composite-section-tree) — ✓ confirmada en intake (descarta path "agregar canCreateInitialData al JSON")
- H6 (UX/discoverability del empty) — ✓ confirmada por feedback explicito del dev

**Acciones de cierre aplicadas**:
- Revertido todo el codigo agregado en S1.T1 (instrumentation TEMPORAL del SFC)
- Eliminado scenario LLM-e2e `diagnose-empty-state-props.md` de S1.T2
- Re-sync para propagar el revert a `layout/src/modsComponents/` (verificado grep limpio: 0 matches CST_DEBUG)
- Branch `UPONE-1038-evaluation-empty-create-first` eliminado, vuelta a `develop`
- NO aplicado cambio de copy ni stories de cobertura ni scenario nuevo (decision del dev)

**Hallazgo lateral**: navegacion al detail edit via URL directa redirige a `/login/UPU` (race condition Clerk session); via row-action "Editar" del listado funciona. No es bug de este ticket pero conviene reportarlo aparte si se reproduce consistentemente.

**Lessons learned promovidas** (ver [teach-close.md](TICKET-017.teach/teach-close.md)):
- Diagnosis automatizada antes del fix paga (~30min de instrumentation evita dias de fix mal orientado)
- Coverage por seed crea puntos ciegos en empty states de custom Vueform elements
- Distinguir bug funcional de UX confusion es trabajo del intake
- El contrato del custom Vueform element NO es el de record-list — leer el SFC ANTES de tocar JSON
- URL directa al detail edit no es equivalente al row-action (hallazgo lateral pendiente de confirmar como bug platform)

**Knowledge promoted**: ninguno formal (rules / decisions / bugs). El patron de diagnosis automatizada queda documentado en este ticket markdown + teach-close. Si vuelve a aparecer un caso similar, evaluar formalizar como RULE del mod.

**Spec status**: `done` con outcome `no-fix applied — original report was UX confusion, not functional bug`.

## Open questions

### Resueltas (2026-05-12 — antes de teach-intake)

1. ~~**¿Crear un Jira nuevo o asociar a UPONE-1038?**~~ → **Decision dev**: asociar al epic UPONE-1038 (frontmatter `external: UPONE-1038` ya refleja esto). Branches y commits del trabajo usaran prefijo `UPONE-1038-*` (DET-19 — preferir `external` sobre `ticket_id` para artefactos del repo).
2. ~~**Copy del boton CTA del empty state**~~ → **Decision dev**: `"+ agregar elemento"` (en lugar de "Crear primer componente"). Aplica al i18n key `compositeSectionTree.buttons.createFirst` en `mods/curriculum-design/lang/es_CL.json` y a las labels equivalentes que existan en otros locales (en_US, etc.). El cambio de copy se incluye en S2 (patch).

### Activas

3. **¿La causa raiz esta dentro del mod o en core platform?** — pendiente diagnosis empirico (S1). Las 3 explicaciones candidatas:
   - **A.** `{{parentId}}` no se reemplaza por el UUID real en LayoutOrchestrator → `ownerId` llega literal/null al componente → `&& ownerId` falla. Fix fuera del mod (escalar a platform).
   - **B.** `enableEdit: true` del JSON no llega como booleano `true` al custom Vueform element (Vueform pisa la prop o el schema no propaga el flag). Fix dentro del mod (ajustar como se declara el element o el SFC).
   - **C.** Otra (CSS ocultando, capability gate, error JS silencioso). Fix depende de hallazgo.

   La decision de donde tocar requiere ver en Vue DevTools que valores reales llegan como `enableEdit` y `ownerId` al elemento de la pestana Evaluacion cuando el tree esta vacio. Hasta S1.Diagnosis, mantener las 3 hipotesis abiertas en paralelo.
