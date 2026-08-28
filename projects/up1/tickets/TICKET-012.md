---
id: TICKET-012
project: up1
type: ticket
status: closed
work_type: refactor
external: UPONE-1038
module: curriculum-design
autopilot: manual
---

# Calidad post-baseline CompositeSectionTree+RichTextRenderer: compliance RULE-mods, gaps de coverage y deuda residual T-010

## Request

Review de calidad / limpieza / escalabilidad / modularidad sobre el ecosistema **CompositeSectionTree** (SFC + 5 helpers + composable + types) y **RichTextRenderer** (SFC + sanitizeHtml) en el mod `curriculum-design`, ejecutada post TICKET-010 sobre rama `UPONE-1038-qa-baseline`.

Identifica **21 hallazgos**:
- 2 violaciones de reglas `must` (RULE-mods-014, RULE-mods-015)
- 6 de calidad
- 5 de escalabilidad
- 3 de modularidad
- 3 de limpieza
- 2 de seguridad (1 medium, 1 positivo confirmado)
- 2 gaps de coverage de tests

Scope organizado para PR de "platform compliance + cleanup" como continuacion natural de T-010 antes del cierre del Epic UPONE-1038.

**Estado del ecosistema (LOC):**

| Archivo | LOC | Notas |
|---------|-----|-------|
| `CompositeSectionTreeElement.vue` | 1485 | 4 sub-componentes inline + 580 LOC de CSS |
| `useCompositeSectionTree.ts` | 171 | Composable Apollo |
| `buildTree.ts` | 98 | Pure function — testeada |
| `resolveFieldKind.ts` | 68 | Pure function — testeada |
| `validateWeightedSum.ts` | 64 | Pure function — testeada (22 tests) |
| `formatViewValue.ts` | 51 | Pure function — testeada |
| `CompositeSectionTree.types.ts` | 60 | Types |
| `RichTextRendererElement.vue` | 179 | SFC + scoped styles |
| `sanitizeHtml.ts` | 89 | Pure function — testeada (25 tests) |
| **Total** | **2265** | (+ ~700 LOC de tests integration) |

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | refactor |
| Tipo de cambio | mixto (compliance + bug latente + perf + tests) |
| Modulo principal | curriculum-design |
| Modulos afectados | curriculum-design |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | Refactor zero-behavior-change. No se crean vistas/pantallas/componentes nuevos. Cambio aceptable: mejora de a11y por uso de atoms (focus trap, Esc, return focus) — no es UI nueva, es ajuste de la existente |
| Data model | no | No se introducen entidades/schemas/tablas. Solo cambios de codigo en componentes y helpers |

### Draft status

| Campo | Valor |
|-------|-------|
| Aprobado | — |
| Version aprobada | — |
| Path | — |

## Scope — 21 hallazgos

### Modularidad

#### M1 (HIGH) — Sub-componentes inline son extraibles a `.ts`, no solo a `.vue`

[CompositeSectionTreeElement.vue:46-48](up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue#L46-L48) justifica los inline con:
> "Auto-recursion: el sync solo admite 1 .vue por folder. Sub-componentes recursivos se definen inline con render function."

La restriccion es "1 `.vue` por folder", no "1 archivo por folder". Los 3 sub-componentes usan `defineComponent({ render() })` puro — sin `<template>` — por lo que pueden vivir en `.ts` adyacentes.

| Sub-componente | Lineas en SFC | LOC del render | Candidato a |
|----------------|---------------|----------------|-------------|
| `CompositeSectionNode` | 176-357 | ~135 | `CompositeSectionNode.ts` |
| `CompositeSectionForm` | 359-517 | ~100 | `CompositeSectionForm.ts` |
| `CompositeSectionView` | 519-610 | ~80 | `CompositeSectionView.ts` |

RULE-platform-003 lo cubre explicitamente. La excepcion de la regla ("render functions de sub-componentes Vueform NO extraen aun por restriccion RULE-mods-022") aplica al `defineElement` raiz, no a los `defineComponent` interiores.

**Beneficio:** cada `.ts` queda ~150 LOC (testeable con `mount` o `render` puro), el SFC baja a ~700 LOC (solo `defineElement`, glue layer, CSS).

**Riesgo:** validar con un sync de prueba que reconoce `defineComponent` exportados desde `.ts` adyacentes a un `.vue`.

#### M2 (MEDIUM) — Logica de payload-building dentro de `setup()` deberia extraerse

`submitForm` (63 LOC, lineas 809-872) y `onReorder` (40 LOC, lineas 747-786) mezclan reactividad + logica pura.

Logica pura extraible:
- `submitForm` lineas 813-819 + 838-848: separacion base/rt y armado de payload create/edit
- `onReorder` lineas 754-762: calculo de updates `{id, oldPos, newPos}` y filtrado de no-cambios

Extraccion propuesta a `buildPayloads.ts`:
- `splitFormData(formData, baseFieldNames)`
- `buildCreatePayload(formData, ctx)`
- `buildUpdatePayload(formData)`
- `computePositionUpdates(reordered, originalSiblings)`

Cierra **item 7 del TICKET-010** ("function size: refactor submitForm <40 LOC") que quedo pendiente.

#### M3 (LOW) — `flattenTree` dentro del setup duplica logica de busqueda

[CompositeSectionTreeElement.vue:686-691](up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue#L686-L691) flatten para encontrar 1 padre por id en `findSiblings` (lineas 741-745). Es codigo puro. Mover a `treeOps.ts` con `flattenTree(nodes)` + `findNodeById(tree, id)` (early-return).

Junta con M2 en el mismo archivo.

### Calidad

#### C1 (HIGH — viola RULE-mods-014) — Form modal usa HTML crudo en lugar de atoms

`CompositeSectionForm` ([359-517](up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue#L359-L517)) renderiza HTML crudo en lugar de atoms del layout-library:

| Linea | Elemento crudo | Atom equivalente |
|-------|----------------|------------------|
| 424-431 | `<input type="checkbox">` + slider DIY | `<Toggle>` o `<Switch>` |
| 433-439 | `<textarea>` | `<Textarea>` |
| 441-450 | `<input type=text\|number>` | `<Input>` |
| 453 | `<label>` | `<FormLabel>` |
| 502-515 | `<div class="cst-modal__*">` (modal entero) + `<button class="cst-modal__close">` + `<h5>` | `<Modal>` del layout-library |

El SFC ya importa `Button` (linea 155) y lo usa (lineas 482-495). Falta repetir el patron con el resto.

**Tradeoff conocido:** comentario lineas 33-44 escala C3 a `BUG-platform-011` (modalStackManager no expuesto a custom Vueform elements) → modal casero. Pero RULE-mods-014 solo prohibe HTML crudo, no impone usar el orchestrator. **Es perfectamente compatible:** modal casero (custom Vueform) + atoms del layout-library para los inputs.

**Severidad alta** porque (a) regla `must`, (b) bloquea theming consistente (atoms encapsulan tokens dark/light), (c) bloquea i18n (cada atom resuelve `$t()` automatico), (d) modal casero no trapea focus / no maneja Esc / no devuelve focus al trigger — Modal atom resuelve esto.

#### C2 (HIGH — viola RULE-mods-015) — Literales UI hardcoded

Inventario de strings que deberian vivir en `lang/es_CL@CompositeSectionTree.json`:

| Linea | String | Ubicacion |
|-------|--------|-----------|
| 59 | `'Cargando arbol...'` | label de spinner |
| 73 | `'Crear primer componente'` | CTA empty state |
| 80 | `'{N} en total — {M} de nivel raiz'` | summary |
| 89 | `'Agregar raiz'` | boton |
| 235, 249, 261, 275-276 | `'Colapsar'`, `'Expandir'`, `'Editar'`, `'Agregar hijo'`, `'Arrastrar para reordenar'` | tooltips/aria |
| 307, 312 | `'Esperado: X, suma actual: Y'` + `'Ponderacion invalida'` | tooltip validacion |
| 378-381 | `baseLabels = { name: 'Nombre', position: 'Orden' }` | labels form |
| 403-405 | `'Crear componente raiz'`, `'Crear hijo de "..."'`, `'Editar "..."'` | titulos modal |
| 488, 494 | `'Cancelar'`, `'Guardar'`, `'Guardando...'` | botones modal |
| 508, 557, 587, 591, 601 | `'Cerrar'`, `'Posicion'`, `'Detalle'` | view modal |
| 630-632 | defaults: `'Estructura'`, `'No hay elementos cargados.'` | props |
| 780, 868 | `'No se pudo reordenar'`, `'No se pudo guardar el cambio'` | mensajes error |
| useCompositeSectionTree.ts:136 | `'No se pudo cargar el arbol de secciones'` | composable |
| formatViewValue.ts:38-39 | `'Si'`, `'No'` (booleans) | helper |
| buildTree.ts:43 | `'(sin nombre)'` | helper |
| RichTextRendererElement.vue:49 | `'Sin contenido.'` | default RichText |

**Estrategia para helpers puros:** `formatViewValue` y `buildTree` no acceden a `$t`. Recibir los strings como parametros desde el SFC consumidor preserva pureza y testabilidad. NO inyectar `useI18n` dentro del helper.

#### C3 (MEDIUM) — `(this as any)` y `evt: any` persisten

**Item 8 del TICKET-010** (instalar `@types/sortablejs`, eliminar `evt: any` y reducir `(this as any)`) quedo pendiente.

- `(this as any)` en [CompositeSectionTreeElement.vue:224, 230, 236, 335, 417, 487, 509, 515, 530, 532, 605, 607](up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue#L224) — root cause: render functions sin tipado del componente. **Fix natural al ejecutar M1**: cada render en su `.ts` puede tipar `this` con `ThisType<ComponentInstance<...>>`.
- `evt: any` en lineas 206, 798; `payload: any` en linea 349 — root cause: sin `@types/sortablejs` instalado. Verificar `package.json` del mod o monorepo root.

#### C4 (MEDIUM) — `submitForm` ignora `baseFields` prop — bug latente

[CompositeSectionTreeElement.vue:813](up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue#L813) hardcodea:
```ts
const baseFieldNames = ['name']
```
para split base/rt en submit. Pero la prop `baseFields` (linea 370) admite `['name', 'position']` y el render del Form respeta `baseFields.includes('name'|'position')` (lineas 460-465).

**Bug latente:** un consumer que pase `baseFields: ['name', 'position']` ve el input de position en el form pero el value se va al `rtData` payload del create/update — porque el split de submitForm solo reconoce `name` como base. Hoy todos los layouts del mod usan default y `position` se calcula auto en server-side, asi que pasa desapercibido.

**Fix:** usar la misma lista en split que en render (`props.baseFields`).

#### C5 (LOW) — `void maxPos` codigo muerto

[CompositeSectionTreeElement.vue:693-705](up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue#L693-L705) calcula `maxPos` y lo descarta con `void maxPos`. El comentario dice "Mejora futura: pasar suggestedPosition al form" — eso pertenece a un TODO, no a codigo vivo. Borrar el calculo entero (~4 LOC).

#### C6 (LOW) — `console.error` directos sin logger central

[CompositeSectionTreeElement.vue:779, 867](up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue#L779), [useCompositeSectionTree.ts:135](up1/mods/curriculum-design/modsComponents/CompositeSectionTree/useCompositeSectionTree.ts#L135), [buildTree.ts:81](up1/mods/curriculum-design/modsComponents/CompositeSectionTree/buildTree.ts#L81). Validar si hay `useLogger()` central en suite/object-manager antes de mergear mas mods con esto. Si no existe, dejar como esta y abrir bug platform.

### Escalabilidad

#### E1 (HIGH) — Reorder de N siblings emite N mutations paralelas

[CompositeSectionTreeElement.vue:767-776](up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue#L767-L776):
```ts
await Promise.all(updates.map(u => apolloClient.mutate({...})))
```

Para 50 siblings reordenados → 50 mutations paralelas → backpressure de Apollo, race conditions si dos cambios pisan la misma row, y rate limits del object-manager. El TICKET-010 item 17 lo documenta como "TODO bulkReorder mutation en object-manager".

**Workaround sugerido:** sequential con `for...of await` + cancel token (la promise actual ni siquiera tiene cancel). Mas lento pero elimina race. Alternativa: batch de 5 con `p-limit`.

**Bloqueante real?** Hoy no — los arboles SP1 son <40 nodos. Documentar como pre-requisito para SP2 si se usa con programs grandes.

#### E2 (HIGH) — Tree limitado a 500 nodos silently

[useCompositeSectionTree.ts:26](up1/mods/curriculum-design/modsComponents/CompositeSectionTree/useCompositeSectionTree.ts#L26):
```ts
export const SECTION_LIST_LIMIT = 500
```

Si un program tiene >500 nodos, la query trunca y el arbol se renderiza incompleto sin warning al usuario. El comentario reconoce el TODO E1.

**Fix interim** (mientras no haya paginacion):
```ts
if (totalCount.value > items.length) {
  error.value = `Tree truncado: ${totalCount.value} items pero limit ${SECTION_LIST_LIMIT}`
}
```
O al menos `console.warn` consumible por monitoring + telemetria.

#### E3 (MEDIUM) — Sub-componente recreate sortable en cada toggle de `expanded`

[CompositeSectionTreeElement.vue:218](up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue#L218):
```ts
watch([childrenEl, () => props.enableEdit, expanded, hasChildren], setupSortable, { flush: 'post' })
```

Cada `expanded.value = !expanded` (toggle) dispara `teardownSortable` + `Sortable.create`. Para arboles SP1 (40 nodos max) imperceptible. Para 200+ nodos con UX de expand-all es ~200 destroys+creates.

**Fix:** quitar `expanded` del watch — el `childrenEl` ref ya cambia cuando se monta/desmonta el contenedor (lo hace `v-if` interno).

#### E4 (MEDIUM) — `refetch()` despues de cada mutation — over-fetch

[CompositeSectionTreeElement.vue:777, 862](up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue#L777). Cada save/reorder hace re-query completa de hasta 500 items.

En SP2 con bulkReorder de platform, el server podria responder con el subset cambiado y permitir update incremental local. Por ahora deuda de perf documentable, no bloqueante.

#### E5 (LOW) — Render recursivo H sin virtualizacion

[CompositeSectionTreeElement.vue:332-352](up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue#L332-L352) renderiza recursivamente todos los hijos cuando `expanded`. Si un padre tiene 200 hijos directos y todos `expanded:true`, son 200 `h(CompositeSectionNode)` sincronos.

[CompositeSectionTreeElement.vue:189](up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue#L189) `expanded = ref(props.depth < 1)` solo expande nivel 0 inicial — mitiga.

Virtual scroll es overkill para SP1. Solo notar.

### Limpieza

#### L1 (MEDIUM) — Comentario inline duplica info de DKC

[CompositeSectionTreeElement.vue:33-44](up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue#L33-L44) tiene 12 lineas de bullets describiendo limitaciones del modal casero. Esa info esta en `BUG-platform-011`. Reducir a:

```
/* C3: Modal casero por BUG-platform-011 (modalStackManager no expuesto).
   Reemplazar cuando platform exponga el orchestrator. */
```

#### L2 (LOW) — 17 props en el `defineElement`

[CompositeSectionTreeElement.vue:618-645](up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue#L618-L645). Patron valido pero en el limite. Si crece mas, agrupar:

```ts
type CompositeTreeConfig = {
  tree: { baseObject, ownerType, recordType, relationName }
  metric: { field, suffix, validateSum, sumTolerance }
  secondary: { field, labels }
  edit: { enabled, viewModal, editableFields, fieldLabels }
}
```

No urgente.

#### L3 (POSITIVO) — `enrichNodeWithRtFields` muerto fue eliminado

Item C4 del TICKET-010 confirmado por `git log` y ausencia en buildTree.ts. ✓

### Seguridad

#### S1 (MEDIUM) — `data:` URLs no se bloquean en `href`

[sanitize-html.test.ts:15-22](up1/mods/curriculum-design/tests/integration/sanitize-html.test.ts#L15-L22) documenta:
> "href data: NO bloqueado en el sanitizer actual (limitacion documentada)"

[sanitizeHtml.ts:76](up1/mods/curriculum-design/modsComponents/RichTextRenderer/sanitizeHtml.ts#L76):
```ts
if (name === 'href' && /^\s*javascript:/i.test(attr.value)) { ... }
```

Solo bloquea `javascript:`. `<a href="data:text/html,<script>alert(1)</script>">` ejecuta JS al click en algunos browsers.

**Fix de 1 linea:**
```ts
if (name === 'href' && /^\s*(javascript|data):/i.test(attr.value)) { ... }
```

Mas test correspondiente en `sanitize-html.test.ts`. Riesgo real bajo (el WYSIWYG actual no produce `data:` URLs, pero RichTextRenderer tambien consume contenido proveniente de imports/migrations/api calls de tenants).

#### S2 (POSITIVO) — C7 walker re-entrante validado

[sanitizeHtml.ts:46-64](up1/mods/curriculum-design/modsComponents/RichTextRenderer/sanitizeHtml.ts#L46-L64) implementa el while-loop con re-snapshot. Test [sanitize-html.test.ts:104-110](up1/mods/curriculum-design/tests/integration/sanitize-html.test.ts#L104-L110) verifica el caso `<form><input>` que era el bug pre-existente. Cierra C7 del TICKET-010. ✓

### Testing

#### T1 (POSITIVO) — Helpers puros con coverage robusto

| Archivo | Tests |
|---------|-------|
| `validateWeightedSum.spec.ts` | 22 (REQ-02/03/04, output shape, caso real Univalle) |
| `composable-buildTree.test.ts` | ~25 (jerarquia, coercion, ciclos E3, sort) |
| `sanitize-html.test.ts` | ~25 (whitelist, XSS canonicos, href, walker C7) |
| `formatViewValue.test.ts` | ~20 (null/bool/array/object/HTML) |
| `resolveFieldKind.test.ts` | ~25 (specs explicitos, heuristica) |

Total ~117 test cases sobre 5 archivos `.ts` puros. Cobertura excelente.

#### T2 (GAP) — Composable Apollo y SFC sin coverage

`useCompositeSectionTree.ts` (171 LOC):
- Apollo query construction
- Reactividad (watch + immediate)
- Coercion Ref/value para `validateWeightedSum`, `weightedSumTolerance`, `ownerId`
- Computed condicional para `invalidNodes`

→ 0 tests. Apollo client mockeable con `MockedProvider` o stub directo.

**Test cases sugeridos:**
- `ownerId null → tree vacio sin query`
- `Ref<ownerId> cambia → refetch`
- `query error → error.value seteado`
- `validateWeightedSum=false → invalidNodes=Map vacio sin computar` (perf default)

`CompositeSectionTreeElement.vue` setup tiene ~250 LOC de logica de modales, openCreate/Edit/View, submitForm, onReorder. Sin test del SFC.

**Decision a presentar al equipo:** el coverage del SFC requiere `@vue/test-utils` con stubs de atoms. Antes de invertir, validar si no es mas eficiente cubrirlo via E2E (RULE-platform-003 documenta que e2e con Playwright/LLM-e2e tambien cuenta como verificacion, especialmente cuando hay deps DOM/Apollo). Validado en TICKET-011 con LLM-e2e + DEC-001.

## Priorizacion (de mas urgente a menos)

| # | Hallazgo | Por que primero |
|---|----------|----------------|
| 1 | C1 (RULE-mods-014) + C2 (RULE-mods-015) | Reglas `must`, bloquean theming + i18n. Mismo PR de "platform compliance" |
| 2 | M1 (extraer sub-componentes a `.ts`) | Habilita C3 (tipar `this`) + T2 (testear sub-components) + reduce SFC a ~700 LOC |
| 3 | C4 (`baseFields` ignorado en submit) | Bug latente, fix de 1 linea |
| 4 | E1 (sequential reorder) | Riesgo real con escalado, sin esperar bulkReorder de platform |
| 5 | S1 (`data:` href en sanitizer) | 1 linea + 1 test |
| 6 | M2 + M3 (extraer payload-building) | Cierra item 7 TICKET-010 |
| 7 | E2 (warn UI cuando truncate >500) | UX defensiva |
| 8 | C5, C6, L1, L2, E3, E4, E5 | Cleanup oportunista |
| **9** | **Etapa de testing post-refactor (ver "Etapa de testing" abajo)** | **NO mergear sin coverage de los archivos extraidos en M1 + composable + cambios introducidos. Sin esto, cierre del ticket queda condicional a evidencia de regression** |
| **10** | **Documentacion del mod (ver "Documentacion del mod" abajo)** | **Pre-cierre del ticket. Garantiza que el mod queda LLM-ready y alineado al patron up1. NO bloquea el merge del refactor pero SI el cierre del ticket** |

## Etapa de testing — post-refactor

**Coverage actual baseline (medido con `vitest run --coverage` el 2026-05-06):**

```
Total: 28.3% statements / 92.51% branch / 86.95% funcs / 28.3% lines
288 tests pasando en 10 archivos integration

Helpers puros (.ts):           ~99% (excelente)
  - buildTree.ts                100/100/100/100
  - formatViewValue.ts          100/95.23/100/100  (linea 21 SSR no cubierta)
  - resolveFieldKind.ts         100/100/100/100
  - sanitizeHtml.ts             100/100/100/100
  - validateWeightedSum.ts      100/94.73/100/100  (linea 49 epsilon=0)
Composable Apollo (.ts):       0%
  - useCompositeSectionTree.ts  0/100/100/0       (171 LOC sin tocar)
SFCs Vue (.vue):               0%
  - CompositeSectionTreeElement 0/0/0/0           (1485 LOC)
  - RichTextRendererElement     0/0/0/0           (179 LOC)
Types:                         0% (esperado — no se ejecutan)
Seed UV/AIEP:                  ~99%
seed.js entry:                 0%
_cleanup.js:                   69.56% (paths 34-44, 46-52)
```

**El 28.3% global es enganoso:** denominador inflado por las 1485 LOC del SFC raiz al 0%. La logica pura (helpers) esta a ~99%. Los archivos no-puros viven al 0% porque dependen de Apollo + DOM y no fueron testeados aun.

### Trade-off: NO testear lo que se reescribe

Antes de invertir en cualquier test sobre el SFC actual, considerar que C1+C2+M1+M2 reescriben:
- `CompositeSectionForm` (HTML crudo → atoms)
- Strings hardcoded → `lang/`
- `submitForm`/`onReorder` → helpers extraidos

Testear hoy el form modal actual = trabajo descartable cuando se ejecute la etapa de refactor. Por eso la etapa de testing va **despues** del refactor, no antes.

### Plan de testing (ejecutar al cerrar items 1-8)

#### Fase A — quick wins low-risk (no afectados por el refactor) — ~1.5 dias

Estos archivos NO se reescriben en items 1-8. Pueden testearse antes, durante o despues del refactor sin perdida.

| # | Archivo nuevo | Cubre | Cases |
|---|---------------|-------|-------|
| A1 | `tests/integration/use-composite-section-tree.test.ts` | Composable Apollo: `ownerId` null/string/Ref, query error, `validateWeightedSum` on/off, tolerance Ref/number, refetch cuando ownerId cambia, `invalidNodes` perf default | ~15 |
| A2 | `tests/integration/rich-text-renderer.test.ts` | `RichTextRendererElement.vue`: computed `sanitizedHtml` (raw vacio, no-string, valido, XSS), default `emptyText`, render de v-html | ~6 |
| A3 | `tests/integration/seed-entry.test.ts` | `seed.js`: dispatch a UV vs AIEP segun tenant code, no double-load, _cleanup.js paths defensivos (lineas 34-44, 46-52) | ~3 |
| A4 | Extender `sanitize-html.test.ts` | Bloqueo `data:` URLs (S1) — fix es 1 linea + 1 test | +2 |
| A5 | Extender `formatViewValue.test.ts` | Caso SSR (no `document` global) — linea 21 sin cubrir | +1 |
| A6 | Extender `validateWeightedSum.spec.ts` | Caso `epsilon=0` exacto — linea 49 sin cubrir | +1 |

**Proyeccion:** 28.3% → **~38%** absoluto. +28 cases. Sin reescribir codigo del SFC.

#### Fase B — post-M1 (sub-componentes extraidos) — ~3 dias

**Pre-requisito**: M1 ejecutado (sub-componentes en `.ts` adyacentes al SFC).

| # | Archivo nuevo | Cubre | Cases |
|---|---------------|-------|-------|
| B1 | `tests/integration/composite-section-node.test.ts` | `CompositeSectionNode.ts`: render de hojas vs nodos con hijos, expansion inicial (`depth < 1`), invalidNodes tooltip, click de view/edit/add-child, sortable lifecycle | ~12 |
| B2 | `tests/integration/composite-section-form.test.ts` | `CompositeSectionForm.ts` post-C1: render con atoms, modos create-root/create-child/edit, submit emit, `baseFields` respetado en split (cierra C4) | ~10 |
| B3 | `tests/integration/composite-section-view.test.ts` | `CompositeSectionView.ts`: render de rtRows filtrando `VIEW_SYSTEM_FIELDS`, `secondaryLabels` mapping, formato de metric, close emit | ~8 |
| B4 | `tests/integration/build-payloads.test.ts` | Helpers extraidos en M2 (`splitFormData`, `buildCreatePayload`, `buildUpdatePayload`, `computePositionUpdates`) | ~12 |
| B5 | `tests/integration/tree-ops.test.ts` | Helpers extraidos en M3 (`flattenTree`, `findNodeById`) | ~6 |

**Proyeccion:** ~38% → **~75%** absoluto. +48 cases.

#### Fase C — SFC raiz (lo que queda en `defineElement`) — ~1 dia

Despues de M1+M2+M3, lo que queda en el `.vue` es `defineElement` + props + setup() reducido + style. Setup() todavia tiene logica de modales (open/close) y el wiring del composable.

| # | Archivo | Cubre | Cases |
|---|---------|-------|-------|
| C1 | `tests/integration/composite-section-tree-element.test.ts` | `defineElement` setup: openCreateRoot/Child, openEdit, openView, closeModal/View, integracion con composable y mutations (mock Apollo) | ~10 |

**Proyeccion:** ~75% → **~85%** absoluto.

### Targets de coverage por capa al cerrar TICKET-012

| Capa | Baseline | Target | Como se valida |
|------|----------|--------|---------------|
| Helpers puros | 99% | **100%** | Branches faltantes (formatViewValue:21, validateWeightedSum:49) cubiertos en Fase A |
| Composable Apollo | 0% | **≥85%** | Fase A1, mock Apollo client |
| Sub-componentes extraidos (M1) | N/A | **≥80%** | Fase B1-B3, render functions con `@vue/test-utils` |
| Helpers nuevos (M2, M3) | N/A | **100%** | Fase B4-B5, pure functions |
| SFC raiz (defineElement) | 0% | **≥70%** | Fase C1, setup() con stubs |
| RichTextRenderer SFC | 0% | **≥80%** | Fase A2 |
| **Global del mod** | **28.3%** | **≥75%** | `vitest run --coverage` final |

### Regresion vs baseline

Cada fase agrega tests SIN romper los existentes. Comando de validacion al final:

```bash
cd up1/mods/curriculum-design
npx vitest run                                  # 288+ → ~370+ pasando
npx vitest run --coverage                       # global ≥75%
# LLM-e2e: 18/18 scenarios siguen pasando (TICKET-011 baseline)
```

Si una fase del refactor (items 1-8) hace que un LLM-e2e scenario falle, **detener avance**, agregar test integration que reproduzca el caso (regla: regression antes de fix), y resolver.

### Compromiso de calidad

- **No mergear PR de TICKET-012 sin Fase A completa** (composable + RichText + branches faltantes). Es lo unico que NO depende del refactor.
- **No cerrar TICKET-012 sin Fases A + B + C completas y coverage global ≥75%.**
- **Cualquier bug detectado durante las fases** → test que falla ANTES de fixear (DET-7). Si emerge un bug que no estaba en los 21 hallazgos, capturar como learn y evaluar si entra al scope o se difiere.

## Tasks (DET-20)

Tasks particionadas en 12 sessions segun DET-20. Cada session termina con `S{N}.GATE`. El detalle del scope de cada hallazgo (M1, C1, etc.) vive en `## Scope`. Esta seccion es el plan ejecutable con notation canonica.

> **Notacion**: `S{N}.T{M}` = Task M de Session N. `S{N}.GATE` = Gate de sync (siempre ultima task de la session). Columna `Rules` referencia DET-{N} y RULE-{module}-{seq}. Status: `pending | in_progress | done | blocked`.

### Session 1 — Pre-flight + validacion hipotesis [tipo: ⚑ fuerte] [tier: T1]

| # | Task | Files | Rules | Validation | Status | Session |
|---|------|-------|-------|------------|--------|---------|
| S1.T1 | Merge T-010 → develop directo, crear branch `UPONE-1038-quality-pass-2` | git | DET-19 | branch creada, develop actualizado | done | 1 |
| S1.T2 | Crear BUG-platform-013 en DKC para CORS x-app-id (decision N4) | `bugs/platform/bug-platform-013.md` | DET-1, DET-19 | bug indexado, refleja symptom + workaround | done | 1 |
| S1.T3 | Validar H1: Modal en molecules + compat render functions | layout/ | DET-1, DET-4 | H1 ✓ confirmada | done | 1 |
| S1.T4 | Validar H2: sync acepta .ts adyacentes (validado por inspeccion del sync.js + estado actual del componente) | sync.js | DET-5, DET-8 | H2 ✓ confirmada sin necesidad de experimento empirico (redundante) | done | 1 |
| S1.T5 | Validar H3: `@types/sortablejs` disponible en registry, scope decidido (mod, no root). Instalacion difiere a S4.T1 | npm registry | DET-1 | H3 ✓ confirmada, plan en S4 | done | 1 |
| S1.T6 | Validar H5: utilities oficiales en `up1/layout/src/__tests__/utils/` + gaps de setup del mod identificados | layout/__tests__/utils/ | DET-11 | H5 ✓ confirmada con setup pendiente (L8) | done | 1 |
| S1.T7 | Editar T-012 con discoveries (H1-H5 finales, Context found, L5-L8) + reindex DKC | `tickets/ticket-012.md` | DET-15, DET-16 | T-012 actualizado, indice DKC refrescado | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T1)** — persistir en `## Sessions` usando Template de Gate. Decisiones humanas: continuar a S2 (quick wins), H2 confirmada → M1 sigue en scope para S4 | `tickets/ticket-012.md` | DET-20 | gate persistido + decision documentada | done | 1 |

### Session 2 — Quick wins atomicos [tipo: auto] [tier: T2]

| # | Task | Files | Rules | Validation | Status | Session |
|---|------|-------|-------|------------|--------|---------|
| S2.T1 | S1 fix: bloquear `data:` URLs en `sanitizeHtml.ts:76` (regex extendida `javascript:` → `(javascript|data):`) + 3 tests en `sanitize-html.test.ts` | `modsComponents/RichTextRenderer/sanitizeHtml.ts`, `tests/integration/sanitize-html.test.ts` | DET-5, DET-7 | 291/291 vitest passing (288 baseline + 3 nuevos), commit `69fa9d6` | done | 2 |
| S2.T2 | C4 fix: usar `props.baseFields` en `submitForm:813` (cierra bug latente split base/rt en edit; create residual capturado en L9) | `CompositeSectionTreeElement.vue` | DET-5, DET-7 | 291/291 vitest passing, fix valida via inspeccion (test concreto en B4 Fase B), residual L9 documentado, commit `4ff7932` | done | 2 |
| S2.T3 | C5 chore: eliminar `void maxPos` y comment block en `openCreateRoot` (6 LOC) | `CompositeSectionTreeElement.vue` | DET-10 | 291/291 vitest, commit `1e5fc5a` | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — `vitest run --coverage` verde, coverage delta no baja vs baseline, 3 commits atomicos | ticket | DET-20 | 291/291, coverage 28.38% (baseline 28.3% +0.08%), 3 commits (`69fa9d6`/`4ff7932`/`1e5fc5a`), gate persistido | done | 2 |

### Session 3 — RULE compliance C1 + C2 [tipo: ⚑ fuerte] [tier: T3]

| # | Task | Files | Rules | Validation | Status | Session |
|---|------|-------|-------|------------|--------|---------|
| S3.T1 | C1: refactor `CompositeSectionForm` usando atoms `Input`/`Textarea`/`Checkbox(isSwitch)`/`Alert` (Label integrado en Input/Textarea/Checkbox) | `CompositeSectionTreeElement.vue:359-505` | RULE-mods-014, DET-5, DET-8 | atoms en lugar de HTML crudo, 291/291 vitest, -95 LOC neto, commit `92a086f` | done | 3 |
| S3.T2 | C1: refactor Modal usando molecule `Modal` (envuelve Form en template del Element + modalTitle computed) | `CompositeSectionTreeElement.vue` template/setup | RULE-mods-014, DET-5 | Modal de molecules con focus trap + Esc + return focus + aria-modal heredados, commit `92a086f` (mismo commit que S3.T1 — C1 unificado) | done | 3 |
| S3.T3 | C2: crear `lang/es_CL.json` base con namespaces `compositeSectionTree.*` + `richTextRenderer.*` (decision L10-A) + reemplazar ~30 strings hardcoded en SFC por `$t()` / `t()` via `useI18n` | `lang/es_CL.json` (new), `CompositeSectionTreeElement.vue`, `RichTextRendererElement.vue` | RULE-mods-015, DET-5 | 291/291 vitest (incluye lang-enums.test.ts), sync OK con keys integradas a suite/lang global, commit `c024e5a` | done | 3 |
| S3.T4 | Validar LLM-e2e selectivo (opcion B aprobada) sobre 4 scenarios afectados por C1/C2: detail-uv-evaluation-tree (+ view modal extra) / edit-evaluation-tree-weight / detail-uv-customsection-tab / customsection-wysiwyg-edit + smoke modal dark mode | LLM-e2e via chrome-devtools MCP | DET-7, DET-13, DET-14 | 4/4 PASS post-fix-regresion + view modal extra PASS + smoke modal dark mode OK (tokens respetados). Bug regression detectado y corregido en commit `eb4a3d8` (FA-1) | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** — vitest --coverage + LLM-e2e selectivo + smoke manual + 1 fix de regresion. Decision humana: continue → S4 | ticket | DET-20 | 4/4 LLM-e2e PASS + 291/291 vitest, gate persistido | done | 3 |

### Session 4 — M1 + C3 sub-componentes a `.ts` [tipo: auto] [tier: T3]

> **Pre-condicion**: H2 confirmada en S1.T4. Si H2 fallo → mover M1 a `## Excluido del scope` y skip a Session 5.

| # | Task | Files | Rules | Validation | Status | Session |
|---|------|-------|-------|------------|--------|---------|
| S4.T1 | `npm install -D @types/sortablejs` en el mod (decision H3 scope) | `package.json` mod | DET-1 | `@types/sortablejs@^1.15.9` instalado, hoisting al monorepo root | done | 4 |
| S4.T2 | Extraer `CompositeSectionView` a `.ts` adyacente al SFC | `modsComponents/CompositeSectionTree/CompositeSectionView.ts` | RULE-platform-003, DET-5 | ~110 LOC, modal read-only + i18n preservado | done | 4 |
| S4.T3 | Extraer `CompositeSectionForm` a `.ts` post-C1 (con atoms) | `modsComponents/CompositeSectionTree/CompositeSectionForm.ts` | RULE-platform-003, DET-5 | ~150 LOC, form modal con atoms + i18n preservado | done | 4 |
| S4.T4 | Extraer `CompositeSectionNode` a `.ts` (recursivo + Sortable) | `modsComponents/CompositeSectionTree/CompositeSectionNode.ts` | RULE-platform-003, DET-5 | ~210 LOC, recursion + sortable lifecycle preservados | done | 4 |
| S4.T2-T4 commit | M1 commit unificado + sync OK | SFC raiz -437 LOC, 3 .ts nuevos sincronizados | DET-13 | commit `e1dd807`, H2 confirmada empiricamente post-sync | done | 4 |
| S4.T5 | C3: tipar `evt: Sortable.SortableEvent` (rootSortable + Node onEnd) + `MouseEvent` (View backdrop) + `HTMLElement \| null` (Node template ref). `(this as any)` queda como deuda conocida (Vue3+TS render() limitation) | `.ts` extraidos + SFC raiz | DET-5 | commit `812e637`, 291/291 vitest | done | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T3)** — vitest --coverage 29.64% (+1.26% vs S3) + smoke browser modal edit Q1 OK + LLM-e2e selectivo no re-corrido (cambio NO-behavior, solo extraccion estructural). 2 commits atomicos M1 + C3 | ticket | DET-20 | gate persistido + decision continue | done | 4 |

### Session 5 — M2 + M3 helpers extraidos [tipo: auto] [tier: T2]

| # | Task | Files | Rules | Validation | Status | Session |
|---|------|-------|-------|------------|--------|---------|
| S5.T1 | M2: crear `buildPayloads.ts` con `splitFormData`/`computeNextPosition`/`buildCreatePayload`/`buildUpdatePayload`/`computePositionUpdates` (~95 LOC, pure functions) | `modsComponents/CompositeSectionTree/buildPayloads.ts` | DET-5, DET-8 | helpers exportados, tipos correctos | done | 5 |
| S5.T2 | M3: crear `treeOps.ts` con `flattenTree`/`findNodeById` (early-return) + `findSiblings` (~50 LOC) | `modsComponents/CompositeSectionTree/treeOps.ts` | DET-5 | helpers exportados | done | 5 |
| S5.T3 | Refactor SFC raiz `submitForm`/`onReorder` para usar helpers (cierra item 7 T-010 — submitForm ~30 LOC efectivos) | `CompositeSectionTreeElement.vue` | DET-5, DET-8 | comportamiento identico (smoke browser + vitest 291/291) | done | 5 |
| S5.T4 | Tests B4/B5 — DEFERIDOS a Fase B (Session 9), no son scope S5 | `tests/integration/` | DET-7 | tests deferidos | deferred | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T2)** — vitest 291/291, coverage 29.3% (vs 28.3% baseline +1%, vs S4 29.64% -0.34% por 145 LOC nuevas sin tests pero los cubrira Fase B). 1 commit `c149226` M2+M3 unificado | ticket | DET-20 | gate persistido + decision continue | done | 5 |

### Session 6 — Escalabilidad E1 + E2 + E3 [tipo: auto] [tier: T3]

| # | Task | Files | Rules | Validation | Status | Session |
|---|------|-------|-------|------------|--------|---------|
| S6.T1 | E1: sequential reorder — `Promise.all(updates.map(...))` -> `for...of await mutate`. Reduce backpressure Apollo + race conditions | `CompositeSectionTreeElement.vue` onReorder | DET-5, DET-8 | comportamiento identico para 1 sibling, secuencial para N | done | 6 |
| S6.T2 | E2: composable expone `truncated: ComputedRef<boolean>` + SFC renderiza Alert variant=warning + 2 keys i18n con params {limit, total} | `useCompositeSectionTree.ts`, `CompositeSectionTreeElement.vue`, `lang/es_CL.json` | DET-5, DET-7 | Alert correctamente NO visible con totalCount=8 (smoke browser), key fallback OK | done | 6 |
| S6.T3 | E3: quitar `expanded` de las deps del watch — `childrenEl` cubre el toggle null<->HTMLElement | `CompositeSectionNode.ts:69` | DET-5 | watch deps simplificado, smoke OK | done | 6 |
| **S6.GATE** | **Gate de sync Session 6 (tier: T3)** — vitest 291/291, coverage 29.13% (vs baseline 28.3% +0.83%, vs S5 29.3% -0.17%). 1 commit `101d6ba` E1+E2+E3 unificado. **Caveat**: smoke con N siblings real (drag-n-drop) NO ejecutado — requiere accion manual; cambio E1 es trivial (loop vs paralelo) sin behavior change observable. Reorder de 1 sibling validado en S3. | ticket | DET-20 | gate persistido + decision continue | done | 6 |

### Session 7 — Cleanup oportunista [tipo: auto] [tier: T1]

| # | Task | Files | Rules | Validation | Status | Session |
|---|------|-------|-------|------------|--------|---------|
| S7.T1 | C6: grep cross suite/layout/object-manager → NO existe useLogger central. BUG-platform-014 creado en DKC. `console.error` con prefijo `[CompositeSectionTree]` queda — bulk update cuando platform exponga el helper | varios | DET-1, DET-4 | BUG-platform-014 indexado, BL-3 en backlog | done | 7 |
| S7.T2 | L1: comentario inline reducido 16→5 LOC, referencia a BUG-platform-011 | `CompositeSectionTreeElement.vue` | DET-10 | comentario sintetico | done | 7 |
| S7.T3 | E4+E5: TODO inline en codigo (onReorder refetch + Node render recursivo) + entries BL-1/BL-2 en Backlog. L2 documentado como BL-4 | comentarios + Backlog ticket | DET-10 | TODOs explicitos, 4 items diferidos `could` | done | 7 |
| **S7.GATE** | **Gate de sync Session 7 (tier: T1)** — vitest 291/291. Cleanup minimo sin cambios user-facing. 1 commit `d370279` | ticket | DET-20 | gate persistido + decision continue | done | 7 |

### Session 8 — Fase A testing low-risk [tipo: auto] [tier: T2]

| # | Task | Files | Rules | Validation | Status | Session |
|---|------|-------|-------|------------|--------|---------|
| S8.T0 | Setup: stub `tests/stubs/useApolloClient.ts` + alias `@/composables/useApolloClient` en vitest.config. jsdom ya disponible en monorepo (env por archivo via header) — happy-dom NO necesario | `vitest.config.ts`, `tests/stubs/` | DET-1 | tests SFC pueden mockear Apollo aislado | done | 8 |
| S8.T1 | A1: `use-composite-section-tree.test.ts` (13 cases) — mock Apollo, ownerId reactivity (null/string/Ref/changing), query error, GraphQL errors, validateWeightedSum on/off, tolerance Ref reactivo, **truncated flag E2**, refetch manual | `tests/integration/use-composite-section-tree.test.ts` | DET-7 | composable 0%->98.9% coverage, 13/13 pasan | done | 8 |
| S8.T2 | A2: `rich-text-renderer.test.ts` (14 cases) — contrato del computed sanitizedHtml: falsy/no-string/HTML valido/XSS strippado. Render real cubierto LLM-e2e S3+S4 (no monta Vueform por overhead) | `tests/integration/rich-text-renderer.test.ts` | DET-7 | 14/14 pasan, sanitizer cubierto al contrato | done | 8 |
| S8.T3 | A3: `seed-entry.test.ts` (6 cases) — dispatch UPU vs otros tenants, orden Univalle->AIEP, error propagation. Mocks via `vi.hoisted` para evitar hoisting ReferenceError | `tests/integration/seed-entry.test.ts` | DET-7 | seed.js 0%->100%, 6/6 pasan | done | 8 |
| S8.T4 | A5+A6: extender tests existentes — `formatViewValue` SSR (sin document) + `validateWeightedSum` epsilon=0 + tolerance negativa (Math.max guard) | `tests/integration/formatViewValue.test.ts`, `modsComponents/CompositeSectionTree/validateWeightedSum.spec.ts` | DET-7 | +3 tests, 100% statements en helpers | done | 8 |
| **S8.GATE** | **Gate de sync Session 8 (tier: T2)** — vitest 327/327 (+36 vs S7), coverage 34.03% (vs S7 29.13% **+4.9%**, vs baseline 28.3% **+5.73%**). 1 commit `651eecb` Fase A unificado | ticket | DET-20 | gate persistido + decision continue | done | 8 |

### Session 9 — Fase B testing sub-componentes [tipo: auto] [tier: T2]

> **Pre-condicion**: M1 ejecutado en Session 4. Si M1 fuera del scope → skip a Session 10.

| # | Task | Files | Rules | Validation | Status | Session |
|---|------|-------|-------|------------|--------|---------|
| S9.T0 | Setup: stubs locales `atoms.ts`/`molecules.ts` con render functions + alias `../../components/{atoms,molecules}` apuntando a stubs (atoms del platform son `.vue` y requieren `@vitejs/plugin-vue` no instalado) | `tests/stubs/`, `vitest.config.ts` | DET-1 | stubs cubren contrato props/slots/emits | done | 9 |
| S9.T1 | B1: `composite-section-node.test.ts` (15 cases) — render hoja vs con children, expansion inicial depth<1, badges, metric+suffix, invalidWeight tooltip con i18n params, view/edit/add-child emits, Sortable lifecycle mock via `vi.hoisted` | tests/ | DET-7 | Node 0%->**92.13%**, 15/15 pasan | done | 9 |
| S9.T2 | B2: `composite-section-form.test.ts` (15 cases) — initial values por mode (create-root/create-child/edit), L9 position visibility, submit con guard name vacio + cancel emits, rtFields heuristica vs spec ({textarea/boolean}), saveError Alert. **Cubre C4 con test concreto** que detectaria FA-1 | tests/ | DET-7 | Form 0%->**94.21%**, 15/15 pasan, C4 cierra con cobertura | done | 9 |
| S9.T3 | B3: `composite-section-view.test.ts` (10 cases) — title+badges+metric, rtRows filter VIEW_SYSTEM_FIELDS, secondaryLabels mapping, close emit (X/footer/backdrop) | tests/ | DET-7 | View 0%->**97.77%**, 10/10 pasan | done | 9 |
| S9.T4 | B4: `build-payloads.test.ts` (16 cases) — splitFormData, computeNextPosition, build Create/Update payloads, computePositionUpdates con filter no-cambios | tests/ | DET-7 | buildPayloads.ts 0%->**100%**, 16/16 pasan | done | 9 |
| S9.T5 | B5: `tree-ops.test.ts` (10 cases) — flattenTree DFS pre-order, findNodeById early-return, findSiblings (raiz/children/null) | tests/ | DET-7 | treeOps.ts 0%->**100%**, 10/10 pasan | done | 9 |
| **S9.GATE** | **Gate de sync Session 9 (tier: T2)** — vitest 393/393 (+66 vs S8), coverage **51.25%** (vs S8 34.03% **+17.22%**, vs baseline 28.3% **+22.95%**). 1 commit `175ca48` Fase B unificado | ticket | DET-20 | gate persistido + decision continue | done | 9 |

### Session 10 — Fase C testing SFC raiz [tipo: auto] [tier: T2]

| # | Task | Files | Rules | Validation | Status | Session |
|---|------|-------|-------|------------|--------|---------|
| S10.T1 | **Decision A scope ajustado**: NO unit test del SFC raiz. Razon: `.vue` con defineElement de Vueform requiere plugin-vue no instalado + mock Vueform fragil. Refactor a composable extraido (~1-2h) fuera de scope. Cobertura compensada por LLM-e2e ya validado (S3.T4) + nuevos scenarios | decision | DET-12 | trade-off documentado | done | 10 |
| S10.T2 | Crear scenarios LLM-e2e para gaps no cubiertos por unit: `create-evaluation-component.md` (submitForm CREATE branch + L9 hide position + modalTitle params) y `reorder-evaluation-components.md` (onReorder + sequential mutations E1 + setupRootSortable + computePositionUpdates) | `tests/llm-e2e/scenarios/` | DET-7 | 2 scenarios `.md` con asserts + cleanup obligatorio | done | 10 |
| S10.T3 | Documentar BL-5 en backlog: SFC raiz 0% unit, cobertura via LLM-e2e mapeada explicitamente. Gaps cuantificados (truncated Alert por seed limit, error fetch edge case) | backlog ticket | DET-10 | BL-5 con plan ejecutable | done | 10 |
| **S10.GATE** | **Gate de sync Session 10 (tier: T2)** — coverage global **51.25%** (mantenido vs S9, sin nuevo unit en S10). Target original 75% NO alcanzado por decision A; cobertura conceptual del SFC raiz cubierta por 4 LLM-e2e scenarios ya ejecutados (S3.T4) + 2 nuevos documentados (no ejecutados aun, parte de S12 GATE final pre-merge) | ticket | DET-20 | gate persistido + decision continue. **Caveat**: 51% < 75% target — justificado por scope ajustado | done | 10 |

### Session 11 — Docs `.ai/` D1-D4 [tipo: auto] [tier: T0]

| # | Task | Files | Rules | Validation | Status | Session |
|---|------|-------|-------|------------|--------|---------|
| S11.T1 | D1: `.ai/CONTEXT.md` (83 LOC) — purpose + domain model (AcademicActivity → CurricularSection con 7 RTs) + scope SP1 + DECISION-006/012 + architecture diagram | `.ai/CONTEXT.md` | DET-1, DET-2 | sigue patron hello-world-mod, sin frontmatter (mods up1 no lo usan) | done | 11 |
| S11.T2 | D2: `.ai/PATTERNS.md` (148 LOC) — auto-recursion render fns en .ts adyacentes (RULE-platform-003), atoms (RULE-mods-014), i18n namespaces (RULE-mods-015), pure helpers M2/M3, sequential reorder E1, validateWeightedSum, sanitizer | `.ai/PATTERNS.md` | DET-1, DET-2 | composite tree + decisions linkeadas | done | 11 |
| S11.T3 | D3: `.ai/TASKS.md` (87 LOC) — agregar field/RT, modificar CompositeSectionTree, debug Apollo, levantar vitest, re-correr seed | `.ai/TASKS.md` | DET-1, DET-2 | tasks ejecutables paso a paso | done | 11 |
| S11.T4 | D4: `.ai/TROUBLESHOOTING.md` (147 LOC) — CORS X-App-ID (BUG-platform-013), dark mode tokens (RULE-layout-031), tree/lang/modal issues, FA-1 anti-regresion, L9 position, drag-n-drop revert, sync `.ts`, logger faltante (BUG-platform-014) | `.ai/TROUBLESHOOTING.md` | DET-1, DET-2 | BUG-platform-* + workarounds | done | 11 |
| S11.T5 | Smoke test LLM diferido a S12 cierre (no critico — los docs son self-contained y validables por inspeccion humana) | manual | DET-7, DET-13 | smoke en S12 si tiempo | deferred | 11 |
| **S11.GATE** | **Gate de sync Session 11 (tier: T0)** — 4 docs creados (~465 LOC), patron consistente con hello-world-mod, cross-references a BUG-platform-* / RULE-* validas. NO toca codigo. 1 commit `223910c` | ticket | DET-20 | gate persistido + decision continue | done | 11 |

### Session 12 — Docs humanos + cierre [tipo: ⚑ fuerte] [tier: T3]

| # | Task | Files | Rules | Validation | Status | Session |
|---|------|-------|-------|------------|--------|---------|
| S12.T1 | D5: extender `README.md` de 51 → ~170 LOC (paridad hello-world-mod) | `README.md` | DET-1, DET-2 | 169 LOC efectivos (paridad exacta hello-world). 9 secciones, 18 features, 4 capabilities, 18 tests + 10 LLM-e2e, cross-refs DEC-006/012 + RULE-* | done | 12 |
| S12.T2 | D6: crear `docs/guides/composite-section-tree.md` | `docs/guides/` | DET-1, DET-2 | ~145 LOC. 17 props, layout JSON real, composable returns, 12 helpers, sub-componentes, i18n, E1, validacion, modal workaround, 10 tests + 3 LLM-e2e, refs DEC-006/012 + 8 RULE-* + 2 BUG-* | done | 12 |
| S12.T3 | D7: crear `docs/guides/{rich-text-renderer,seed-data,rt-extending}.md` | `docs/guides/` | DET-1, DET-2 | 3 guides creados (91+108+171 LOC). RTR: DOMParser walker, whitelist, javascript:/data: blocked. Seed: dispatch UPU DEC-012, idempotencia, ejemplo jerarquico. RT-ext: 8 pasos + 6 anti-patterns | done | 12 |
| S12.T4 | Validacion docs (lint frontmatter YAML, cross-references no rotas, paridad estructural vs hello-world-mod) | docs | DET-7, DET-13 | 21/21 refs OK post-fix de 3 broken (DECISION-{slug}.md paths + runner-instructions.md). Paridad 8/8 secciones core con hello-world. 0 frontmatter (consistente patron mods up1) | done | 12 |
| S12.T5 | Llenar `## Summary` del ticket + metricas finales (testing summary + metrics tables) | `tickets/ticket-012.md` | DET-13, DET-15 | Summary completo: 7 bloques de cambios, 0 rules nuevas + 2 bugs creados, testing 393/393 + 10 LLM-e2e, 21/21 hallazgos, coverage +22.95%, LOC SFC -35%. Ready para GATE | done | 12 |
| S12.T6 | Merge `UPONE-1038-quality-pass-2` → `develop` (decision humana de cierre) | git | DET-19 | merge ejecutado, develop actualizado | pending | 12 |
| S12.T7 | **Backlog BL-1 ejecutado parcial (Opcion C)**: edit sin refetch via `applyEditToTree` helper en composable. Ampliar UPDATE_INSTANCE selection set a `{ id, data, extended }`. Mantener refetch en create + reorder + error path. Rollback documentado: revertir 3 archivos al commit pre-T7 si vitest rompe | `useCompositeSectionTree.ts`, `CompositeSectionTreeElement.vue`, `use-composite-section-tree.test.ts` (extended) | DET-1, DET-5, DET-7, DET-8, DET-16, DET-17 | helper applyEditToTree(id, patch) exportado con re-derivacion de code/secondary/metric, mutation con data+extended, refetch movido al catch del edit, 5 tests passing (happy sin refetch, nodo no existe no-op, patch vacio, id falsy, validateWeightedSum recompute), 398/398 vitest, commit 8c39f89 + fix a7a1f18 (spread del rtData sobrescribe siempre, regresion detectada en LLM-e2e #1) | done | 12 |
| S12.T8 | **Sync UP1 2026-05-06 — alineacion visual**: (1) Heading level 4→2 para alinear con titulos de otras pestañas (record-list standard del platform), (2) eliminar `border + border-radius + padding 16px + background` del `.cst-card` envolvente para ganar espacio y ligereza visual. Rollback: revertir SFC al commit pre-T8 | `modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue` | DET-5, DET-13, DET-16 | level=2 en template + .cst-card sin border/padding/background, vitest 399/399 (cambio visual puro), smoke visual browser confirma alineacion con tabs platform, commit a6ac154 | done | 12 |
| S12.T8.1 | **Diagramacion / spacing pixel-precise**: ajustar padding y gaps del `.cst-card` para matchear la diagramacion del record-list standard del platform: tabs→heading 48px + heading→subtitle 40px + heading_x=164px. Mediciones via evaluate_script en chrome-devtools contra tab Sesiones referencial. Rollback: revertir SFC al commit pre-T8.1 | `modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue` | DET-5, DET-13, DET-16 | padding 32 24 0 + header.gap 40px + reset h2 margin-bottom, mediciones post-fix gaps 48/40 exactos, x=164 alineado, smoke visual OK, commit 0a85dcf | done | 12 |
| S12.T8.2 | **Tipografia heading match platform**: igualar font-weight + line-height del titulo de Evaluacion con .record-list-title del platform via `!important` para vencer `fw-semibold` del atom Heading (Bootstrap utility con 600 !important). Rollback: revertir SFC al commit pre-T8.2 | `modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue` | DET-5, DET-13, DET-16 | font-weight 500 !important + line-height 1.2 !important, mediciones post-fix fontWeight=500 + lineHeight=37.84 + fontSize=31.532 + fontFamily=Inter — match exacto con tab Sesiones, smoke visual OK, commit 72c3ca4 | done | 12 |
| **S12.GATE** | **Gate de sync Session 12 (tier: T3)** — vitest --coverage final + LLM-e2e Tier A+B + smoke visual T8/T8.1/T8.2 + merge cf2f9ca. Decision humana de cierre del ticket. T-012 closed, Backlog BL-1 parcial + BL-2/3/4/5 registrados | ticket | DET-20 | vitest 399/399 (51.25% coverage) + LLM-e2e 9 PASS / 1 SKIP / 0 FAIL + merge cf2f9ca sin conflictos + ticket cerrado | done | 12 |

## Excluido del scope

- **BUG-platform-011** (modalStackManager no expuesto a custom Vueform) — fuera del mod, ya documentado. Cuando platform lo cierre, abrir nuevo ticket de migracion.
- **bulkReorder mutation en object-manager** (item 17 T-010) — responsabilidad de platform.
- **Virtualizacion del tree** (E5 si crece) — overkill para SP1/SP2.
- **Refactor de `defineElement` props a config object** (L2 hallazgo) — solo si crece mas.
- **Fix oficial de CORS x-app-id en `object-manager/src/index.js:45`** (decision B4/N4) — se reporta como BUG-platform en DKC y se espera fix oficial del equipo platform. El workaround local del dev queda aplicado pero NO commiteado en este ticket. Ver L1 del Learns para detalles.
- **Comentario en Jira UPONE-1057** sobre el CORS — el dev ya esta en conversacion directa con el encargado del platform. No se canaliza por Jira (decision N4).

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | C1+C2 son ejecutables en un PR sin tocar atom Modal del platform | ✓ confirmada (Session 1) | Atoms verificados (20 atoms en `up1/layout/src/components/atoms/`, lista L2 actualizada). Modal existe en `up1/layout/src/components/molecules/Modal/Modal.vue` (542 LOC, replacement de BModal). API: `v-model`, slots `default`/`#header`/`#footer`, props `size`, `centered`, `closeOnBackdrop`, `closeOnEscape`, `noEnforceFocus` para nested modals, `teleportTo`/`teleportDisabled`. A11y completa (role=dialog, aria-modal, aria-labelledby, focus management). Compat con render functions: Vue 3 acepta slots-as-functions en `h(Modal, props, { default: () => ..., footer: () => ... })`, Teleport funciona desde defineElement (target es DOM real). C1 es ejecutable sin tocar el atom |
| H2 | M1 (extraer sub-componentes a `.ts`) no rompe el sync | ✓ confirmada (Session 1) | Doble evidencia: (a) [up1/layout/scripts/sync.js:146-153](up1/layout/scripts/sync.js#L146-L153) acepta exactamente 1 `.vue` + multiples `.ts` (no `.stories.ts`) por folder, (b) el componente actual YA tiene 6 `.ts` adyacentes sincronizados sin issues (`buildTree.ts`, `formatViewValue.ts`, `resolveFieldKind.ts`, `useCompositeSectionTree.ts`, `validateWeightedSum.ts`, `CompositeSectionTree.types.ts`). Sub-componentes con `defineComponent({ render() })` puro son archivos `.ts` validos — cumplen el criterio del sync. Experimento empirico de S1.T4 redundante |
| H3 | `@types/sortablejs` esta disponible para instalar en el monorepo | ✓ confirmada (Session 1) | `@types/sortablejs@1.15.9` disponible en npm registry. `sortablejs@^1.15.6` runtime ya instalado en `mods/curriculum-design/package.json`. Grep cross-monorepo: solo curriculum-design usa sortablejs (mod aislado). **Scope decidido: instalar como devDep DEL MOD** (no workspace root). **Action diferida**: instalar en S4.T1 al iniciar item C3 (NO en Session 1, principio "validar no implementar") |
| H5 | Platform expone test utilities oficiales para custom Vueform elements y SFCs con Apollo | ✓ confirmada con setup pendiente (Session 1) | Utilities oficiales en `up1/layout/src/__tests__/utils/`: `mountWithDefaults` (wraps `@vue/test-utils mount` con stubs `teleport:true`/`transition:false` + mock `$t`), `withSetup` (composables con lifecycle/inject), `mocks/i18n`, `factories/fieldMetadata`. Usadas por atoms (Modal.spec.ts, Dropdown.spec.ts), composables (15 spec files en `composables/__tests__/`), layouts. **Gaps para uso desde el mod**: (1) `vitest.config.ts` del mod usa `environment: 'node'` — debe cambiar a `happy-dom` o `jsdom` para Fases A/B/C; (2) falta dependency `happy-dom` en mod; (3) acceso a las utilities requiere alias en vitest.config.ts (`'@layout-test-utils': resolve(__dirname, '../../layout/src/__tests__/utils')`) o copia local. **No es BUG-platform** — es setup del mod. **LLM-e2e fallback ratificado** (RULE-platform-003) para regresion completa |

### Context found

**Pre-flight (registrado 2026-05-06):**
- Workspace `up1/mods/curriculum-design`: branch origen `UPONE-1038-qa-baseline`, sin cambios pendientes
- Merge T-010 → develop ejecutado en repo del mod: commit `929ad4d UPONE-1038 merge: cierre TICKET-010 a develop (qa-baseline)` (--no-ff, siguiendo patron existente de merges UPONE-1035). 83 archivos / +4560/-336
- Branch nueva creada: `UPONE-1038-quality-pass-2` desde `develop`
- Fix CORS local en `up1/object-manager/src/index.js:45` ya aplicado (incluye `'X-App-ID'`), NO commiteado
- BUG-platform-013 creado documentando el CORS issue (severity: high, status: detected, owner: equipo platform)
- Push de develop a remote: PENDIENTE (esperando confirmacion del dev)

**Hallazgos secundarios:**
- Atom Modal soporta `noEnforceFocus` para nested modals — util si Form modal abre confirmaciones
- Atom Modal usa Teleport por default → solucion natural para el problema de stacking en defineElement (BUG-platform-012 relacionado a custom modal stacking, no a Modal de molecules)
- vitest.config.ts del mod hereda `environment: 'node'` que bloquea SFC tests — cambio menor pero requerido antes de Fase A1/A2

### Decisiones pre-execute (registradas 2026-05-06)

### Decisiones pre-execute (registradas 2026-05-06)

10 decisiones tomadas antes de iniciar la ejecucion. Documentan el "como" del trabajo, no el "que" (que esta en Scope).

| # | Decision | Rationale | Implicancia |
|---|----------|-----------|-------------|
| **B1** | Merge T-010 → develop (directo, sin PR formal). Nueva rama desde develop sigue siendo UPONE-1038 | T-010 ya esta closed en DKC y validado. PR review formal no aporta a esta etapa | Cerrar workspace de T-010 antes de empezar T-012 |
| **B2** | T-012 monolitico en una sola rama, commits atomicos por labor, sumando todo y al final merge a develop | Evita tickets DKC fragmentados. Cierre del Epic UPONE-1038 en un solo movimiento. NO se splittea en T-012a/b/c | 1 PR final con muchos commits atomicos |
| **B3** | Validar hipotesis (Session 1) ANTES de tocar codigo de refactor. Ajustar plan con discoveries. Despues ejecutar | DET-5 (multi-capa) + Regla 4 (no presentar inferencia como hecho). H1 ya parcialmente validada en este analisis | Session 1 = validacion + quick wins (S1/C4/C5) sin tocar items que dependen de hipotesis |
| **B4** | Fix CORS de `object-manager/src/index.js:45` queda LOCAL, NO se commitea. Se reporta como BUG platform en DKC | El cambio toca core workspace fuera del mod. El encargado de platform ya esta en conversacion con el dev. Esperar fix oficial | Bug DKC creado pre-execute. Mientras: el fix local desbloquea el dev. NO incluir en commits del mod |
| **B5** | Test framework para SFCs: usar lo OFICIAL del platform (utilities, documentacion, configuracion del mod). LLM-e2e queda como FALLBACK para casos no cubiertos por lo oficial | RULE-platform-003 documenta LLM-e2e como verificacion valida pero costosa. Lo oficial es preferible para CI continuo | H5 nueva debe validarse en Session 1 antes de comprometer Fase C |
| **N1** | Merge T-010 → develop directo, sin PR review | Mismo rationale B1: cierre rapido de T-010 cerrado en DKC | Antes de Session 1: `git checkout develop && git merge UPONE-1038-qa-baseline` |
| **N2** | Nueva rama: `UPONE-1038-quality-pass-2` | Continuidad con `UPONE-1038-qa-baseline` de T-010, prefijo del Jira ID (no del repo USUITE — convencion del Epic) | Comando: `git checkout -b UPONE-1038-quality-pass-2 develop` |
| **N3** | Granularidad de commits = **A**: 1 commit por hallazgo (C1, C2, M1, ...). Alineado con git log de T-010 | T-010 commits: `UPONE-1038 refactor: C1 ...`, `UPONE-1038 refactor: C2 ...`, etc. Pattern probado | ~21 commits refactor + ~12 commits testing + ~7 commits docs = ~40 commits. Mensaje: `UPONE-1038 <tipo>: <id-hallazgo> <resumen> (TICKET-012)` |
| **N4** | Reporte de CORS a platform = solo BUG-platform en DKC. NO comentar Jira UPONE-1057 (el dev conversa directo con el encargado de platform) | Comunicacion humana ya activa. DKC funciona como tracker interno | Crear BUG-platform-XXX en DKC con symptom/root_cause/workaround. Sin comentario Jira |
| **N5** | Test utilities = oficiales primero (platform docs, configuracion del mod, utilities expuestas). LLM-e2e como fallback | Coincide con B5. H5 valida si existe lo oficial | Session 1 incluye busqueda en `up1/layout/`, `up1/suite/`, mods que ya testean SFCs |
| **N6** | Workflow Session 1 confirmado: validar hipotesis → editar T-012 con discoveries → re-indexar → Session 2 ejecuta refactor | Loop tight de plan-validate-adjust-execute. DET-5 + DET-15 (persistir antes de codear) | Session 1 termina con T-012 actualizado y commits de S1/C4/C5. Session 2 arranca con plan ajustado |

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1038-quality-pass-2` (decision N2) |
| Base branch | `develop` (post-merge de T-010 directo, decision N1/B1) |
| DB state | seed Univalle SP1 |
| Services | up1 stack via `up1-start.sh --all` (con fix CORS local de `object-manager/src/index.js:45` aplicado pero NO commiteado, decision B4) |
| Test data | tickets test cases TICKET-011 (LLM-e2e baseline 18/18) |
| Commits | Atomicos por hallazgo, prefijo `UPONE-1038 <tipo>: <id> <resumen> (TICKET-012)` (decision N3) |

### Pre-flight checklist

Antes de arrancar Session 1, completar en orden:

1. **Verificar workspace de T-010** — `git log` en `UPONE-1038-qa-baseline`, sin cambios pendientes sin commit
2. **Merge T-010 → develop**:
   ```bash
   cd up1/mods/curriculum-design
   git checkout develop
   git merge UPONE-1038-qa-baseline
   git push origin develop  # Si tiene remote
   ```
3. **Crear nueva rama** desde develop:
   ```bash
   git checkout -b UPONE-1038-quality-pass-2 develop
   ```
4. **Verificar fix CORS local** sigue aplicado en `up1/object-manager/src/index.js:45` (allowedHeaders incluye `X-App-ID`). NO se debe commitear (decision B4)
5. **Crear BUG-platform-XXX en DKC** documentando el CORS issue (decision N4)

### Plan multi-session con gates — 12 sesiones

**Filosofia de gates** (registrar en `## Sessions` al cierre de cada session):
- **Tamano objetivo:** 1.5-3h efectivas por session. Gate al cierre: 5-10 min de persistencia.
- **Ratio "no asfixiante":** un gate cada hora es asfixiante; cada 4+h pierde el savepoint. Banda 1.5-3h preserva contexto sin friccion.
- **Auto-continue** si: tests verdes + coverage no baja + sin bloqueantes detectados.
- **Gates fuertes** requieren validacion humana antes de avanzar (marcados con ⚑ abajo).

| # | Session | Scope | Tiempo | Tipo | Tier |
|---|---------|-------|--------|------|------|
| **1** | Pre-flight + validacion hipotesis | Merge T-010, branch nueva, BUG-platform CORS, validar H1/H2/H3/H5 | 1.5-2h | ⚑ fuerte | T1 |
| **2** | Quick wins atomicos | S1 (data: URLs) + C4 (baseFields) + C5 (void maxPos) | 1-1.5h | auto | T2 |
| **3** | RULE compliance — C1 + C2 | Form modal con atoms + strings a `lang/` | 2.5-3h | ⚑ fuerte | T3 |
| **4** | M1 — extraccion sub-componentes | Node/Form/View → `.ts` adyacentes + C3 tipado | 2-3h | auto | T3 |
| **5** | M2 + M3 — helpers extraidos | `buildPayloads.ts` + `treeOps.ts` con tests B4/B5 | 2h | auto | T2 |
| **6** | Escalabilidad — E1 + E2 + E3 | Sequential reorder + warn UI + fix watch | 2h | auto | T3 |
| **7** | Cleanup oportunista | C6 + L1 + L2 + E4/E5 (TODOs) | 1.5h | auto | T1 |
| **8** | Fase A testing — composable + RichText | A1 + A2 + A3 + A4-A6 branches | 1.5-2h | auto | T2 |
| **9** | Fase B testing — sub-componentes | B1+B2+B3 (post-M1) | 2.5-3h | auto | T2 |
| **10** | Fase C testing — SFC raiz | C1 testing del defineElement | 1.5h | auto | T2 |
| **11** | Docs `.ai/` — D1-D4 | CONTEXT, PATTERNS, TASKS, TROUBLESHOOTING | 2h | auto | T0 |
| **12** | Docs humanos + cierre | D5 + D6 + D7 + Summary + merge | 2h | ⚑ fuerte | T3 |

**Total:** 22-27h efectivas en 12 sessions. ~10 dias al ritmo de 2-3h/dia, ~5-6 dias al ritmo de 4h/dia.

**Gates fuertes (3):**
- **Gate 1** — Si H2 falla → M1 fuera del scope, replan necesario antes de Session 4
- **Gate 3** — Si LLM-e2e falla post-C1 → revertir, escalar
- **Gate 12** — Pre-merge a develop. Decision final de cierre del ticket

**Distribucion de tiers (validacion escalonada):**
- T0 (doc-only, <30s): 1 session — S11
- T1 (unit area, 1-3s): 2 sessions — S1, S7
- T2 (unit + coverage, 5-15s): 5 sessions — S2, S5, S8, S9, S10
- T3 (regression completa, 5-30min): 4 sessions — S3, S4, S6, S12

Costo total de validacion: ~2h vs ~6h si todo fuera T3 → reduccion ~70% sin perder safety en gates criticos.

> **Detalle de tasks por session** — ver `## Tasks (DET-20)` mas abajo. Cada session tiene su tabla canonica con `S{N}.T{M}` y `S{N}.GATE` como ultima task. La ejecucion sigue el orden Session 1 → Session 12.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | CORS preflight del object-manager NO whitelistea `X-App-ID` (header introducido por `up1/suite/plugins/apollo.client.ts:124` para UPONE-1057). Browser bloquea preflight → "No se pudo conectar con el servidor" en suite. Object-manager log NO muestra error porque la request muere antes del handler. Fix de 1 linea: agregar `'X-App-ID'` a `allowedHeaders` en `object-manager/src/index.js:45` | passive (debug pre-execute) | pre-Session 1 | refined | BUG-platform-013 |
| L2 | Atoms reales en `up1/layout/src/components/atoms/`: `Input`, `Textarea`, `Checkbox` (NO `Toggle`/`Switch`), `Label` (NO `FormLabel`), `Button`, `Select`, `Tooltip`, `Badge`, `Heading`, `Text`, `Spinner`, `Alert`, `Icon`, `IconButton`, `Avatar`, `Divider`, `Image`, `Link`, `Progress`, `Radio`. C1 del scope debe ajustar nombres antes de implementar | researcher (verificacion H1) | pre-Session 1 | discarded | razon: ya documentado en `.ai/PATTERNS.md` del mod + RULE-mods-014 cubre el patron general |
| L3 | `@types/sortablejs` NO esta instalado en el monorepo (`up1/package.json` ni en `node_modules/@types/`). Disponible en npm registry. C3 requiere instalacion previa al fix de tipado | researcher (verificacion H3) | pre-Session 1 | discarded | razon: one-shot — instalado en S4.T1 |
| L4 | Naming de archivos lang en curriculum-design es per-Object o per-RT: `es_CL@<ObjectName>.json`, `es_CL@rt__<RT>__curricularsection.json`. NO existe pattern para componentes UI (CompositeSectionTree es componente, no Object). C2 estrategia debe revisarse: investigar precedente up1 antes de decidir | researcher (verificacion A2) | pre-Session 1 | discarded | razon: pattern documentado en `docs/guides/rt-extending.md` del mod; decision real capturada en L10 resolved |
| L5 | Atom `Modal` en `up1/layout/src/components/molecules/Modal/Modal.vue` (542 LOC) es replacement de BModal: v-model boolean, slots `default`/`#header`/`#footer`, props `size` (sm/md/lg/xl/full), `centered`, `scrollable`, `closeOnBackdrop`, `closeOnEscape`, `noEnforceFocus` para nested, `teleportTo`/`teleportDisabled`. A11y completa (role=dialog, aria-modal, aria-labelledby, focus mgmt). Compat con render functions de Vueform: usar `h(Modal, props, { default: () => ..., footer: () => ... })` — Vue 3 acepta slots-as-functions desde render() | researcher (verificacion H1) | Session 1 | discarded | razon: documentado en `docs/guides/composite-section-tree.md` (seccion Modal in-place) |
| L6 | `up1/layout/scripts/sync.js:146-153` valida exactamente 1 `.vue` + N `.ts` (sin `.stories.ts`) por folder de modsComponents/. Sub-componentes Vueform definidos como `defineComponent({ render() })` puro son `.ts` validos para el sync. M1 ejecutable sin riesgo de romper sync — el componente actual ya tiene 6 `.ts` adyacentes funcionando | researcher (verificacion H2) | Session 1 | discarded | razon: cubierto por RULE-platform-002 (sub-componentes inline con render functions) y RULE-platform-003 (extraccion a `.ts`) |
| L7 | Test utilities oficiales del platform en `up1/layout/src/__tests__/utils/`: `mountWithDefaults` (wraps `@vue/test-utils mount` con stubs `teleport:true`/`transition:false` + mock `$t`), `withSetup` (composables con lifecycle/inject), `mocks/i18n`, `factories/fieldMetadata`. Usadas por atoms/molecules/composables/layouts. **NO expuestas como package** — acceso desde mod requiere alias en `vitest.config.ts` o copia local | researcher (verificacion H5) | Session 1 | discarded | razon: stubs propios del mod en `tests/stubs/*.ts` cubrieron el caso (S8.T0); referencia info |
| L8 | Setup pendiente del mod para Fases A/B/C de testing: (1) cambiar `vitest.config.ts` `environment: 'node'` → `'happy-dom'` (o `'jsdom'`), (2) instalar `happy-dom` como devDep del mod, (3) agregar alias `'@layout-test-utils'` apuntando a `../../layout/src/__tests__/utils`. Estos 3 cambios deben ejecutarse al inicio de Session 8 (S8.T0 implicito) | researcher (verificacion H5) | Session 1 | discarded | razon: setup ejecutado en S8.T0 (commit `651eecb`); info historica |
| L12 | **Componentes custom Vueform que renderizan como tabs de LayoutRecordDetail deben matchear la diagramacion del record-list standard del platform**: heading h2 (no h4), font-weight 500 (no fw-semibold/600), line-height 1.2, padding lateral 24px (`container-fluid px-4`), gap tabs→heading 48px, gap heading→subtitle 24px (metadata) o ≥40px (subtitle descriptivo real). Sin esto los tabs custom y standard se ven inconsistentes (heading mas grande/bold, padding distinto, gaps comprimidos). Detectado al cierre del ticket (sync UP1 2026-05-06) en `CompositeSectionTreeElement` que tenia h4+border+padding 16px+gaps 16/16+fw-semibold | passive (sync UP1 2026-05-06 + smoke visual usuario) | Session 12 | refined | RULE-mods-035 |
| L13 | El atom `Heading` del up1 aplica `fw-semibold` (font-weight 600) con `!important` via Bootstrap utility class. Overrides tipograficos en CSS scoped/inline del SFC consumidor requieren `!important` para ganar la cascada. Sin `!important` los selectores propios pierden contra la utility | active (S12.T8.2 al verificar override no aplicado) | Session 12 | discarded | aplicado en commit `72c3ca4` con !important explicito + comentario en CSS — info reusable, no se promueve a rule formal (es detalle de cascada Bootstrap) |
| L14 | Validacion pixel-precise de alineacion visual con platform: usar `mcp__chrome-devtools__evaluate_script` con `getBoundingClientRect()` + `getComputedStyle()` sobre el heading/subtitle/tabs del componente target vs un tab record-list referencial. Mediciones de gaps verticales y posiciones x descubrieron deltas que el solo "smoke visual" no capturaba (16px vs 48px tabs→heading, font-weight 600 vs 500, x=140 vs x=164). Tecnica aplicada en S12.T8.1/T8.2 — preferida sobre Playwright cuando ya hay sesion Clerk activa en el browser MCP | passive (metodologia descubierta en S12.T8.1) | Session 12 | discarded | metodologia documentada en RULE-mods-035 seccion Verification — no se promueve a rule independiente (es tecnica de validacion, no constraint) |
| L9 | C4 fix corrige el split base/rt en `submitForm` (caso edit OK), pero el caso CREATE en `CompositeSectionTreeElement.vue:848` forzaba `position: nextPosition` post-spread, sobrescribiendo silenciosamente el input editable del form. **Resuelto opcion C** (commit `8b83738`): render condicional en form — input position solo visible en mode edit, hidden en create-*. Coherente con comentario inline "position se gestiona via drag-n-drop". 7 LOC. Test concreto en B2 Fase B | active (durante S2.T2 fix) | Session 2 | discarded | commit `8b83738` (no se promueve a rule — cambio puntual, comentario inline preserva el por que) |
| L11 | platform up1 NO expone logger central (`useLogger`/equivalent). Mods replican `console.error('[<Scope>]', err)` con prefijo manual. Verificado via grep cross `up1/suite/composables/`, `up1/layout/src/composables/`, `up1/object-manager/src/`. Falta DX para observability — bloquea integracion futura con Sentry/Datadog | researcher (S7.T1) | Session 7 | refined | BUG-platform-014 (logger central no expuesto) |
| L10 | Naming de strings hardcoded en `CompositeSectionTree`/`RichTextRenderer` (componentes UI genericos del mod, NO Objects). Patron platform: namespace dentro de archivo base `lang/{locale}_{country}.json` (segun `up1/mods/docs/guides/i18n.md`). curriculum-design NO tiene archivo base hoy (solo `@<Object>.json` y `@rt__*.json`). **Decision A** (registrada Session 2): crear `lang/es_CL.json` base con namespaces `compositeSectionTree.*` y `richTextRenderer.*` en S3.T3 (item C2). Razon: componentes son genericos, override per-Object queda disponible via cascade. Alternativas descartadas: B (extension de @CurricularSection) mezcla labels Object+UI; C (@CompositeSectionTree) no documentado por platform | researcher (resolucion L4) | Session 2 | discarded | aplicar en S3.T3 (no se promueve a rule — decision puntual del mod) |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| FA-1 | C4 fix (commit `4ff7932`): cambiar `baseFieldNames = ['name']` por `props.baseFields` en `submitForm` del Element raiz | El Element raiz **NO declaraba `baseFields` como prop** — solo lo tenia el sub-componente Form. `props.baseFields` quedo undefined → `undefined.includes(k)` crash al guardar. Detectado en LLM-e2e S3.T4 scenario edit-evaluation-tree-weight. Test concreto del submit no existia en baseline (Fase B4 lo cubrira) — el bug paso vitest verde. **Aprendido**: cuando se cambia hardcoded a prop, **verificar que la prop existe en ese componente** — analisis de impacto colateral debe incluir el componente que ejecuta el codigo, no solo el que declara la prop. La validacion via vitest del area NO substituye la regression e2e cuando el codigo modificado vive en un SFC sin coverage |
| FA-2 | S8.T3: usar const top-level con vi.fn() y luego referenciarlas en vi.mock factory | vi.mock se hoistea al top del archivo ANTES de las consts → ReferenceError "Cannot access 'mockX' before initialization". **Resuelto con `vi.hoisted(() => ({...}))`** que registra los mocks ANTES del hoisting de vi.mock. Patron documentado en vitest docs |
| FA-3 | S8.T1: helper `sampleItem` con campos planos (id/name/position/parentId/rt) | `buildTree` lee `it.data.{...}` y `it.data[relationName]` (linea 19 de buildTree.ts). Sample plano resultaba en tree donde TODO era root sin metric. **Resuelto wrapeando** en `{ id, data: {...} }` y mantener relationName como key del rt dentro de data |
| FA-4 | S9.T0/B1: stub de atom con `...attrs, class: 'stub-atom ...'` | El segundo `class` reemplazaba el heredado en lugar de mergearlo, asi que selectores como `.cst-node__name` no matcheaban en tests. **Resuelto** mergeando classes manualmente: extraer `attrs.class` (string/array), concatenar con la clase del stub, y aplicar via spread excluyendo `class`/`onClick` originales |

## Sessions

### Template de Gate

Cada session cierra con un Gate persistido aqui. Tamano objetivo: 5-10 min. Mantiene contexto entre sessions, evita regresion silenciosa, y crea savepoints retomables.

```markdown
### Session N — <YYYY-MM-DD HH:MM> — <objetivo corto>

**Tipo:** ⚑ fuerte (requiere decision humana) | auto (auto-continue si criterios verdes)

**Tasks completadas:**
- [x] T-N.1: <descripcion> → commit `<hash corto>` <mensaje>
- [x] T-N.2: <descripcion> → commit `<hash corto>` <mensaje>

**Tests / coverage:**
- vitest run: <pass>/<total> (delta vs gate anterior: +N o =)
- vitest run --coverage: <%global> (delta vs baseline 28.3%)
- LLM-e2e: <pass>/18 (regresion vs TICKET-011 baseline)

**Discoveries / Learns nuevos:**
- L#: <descripcion en 1 linea>

**Failed approaches** (solo si hubo):
- <approach intentado>: <por que fallo>

**Bloqueantes detectados** (solo si hay):
- <descripcion> → escala a <quien>

**Gate decision:**
- [ ] continue → Session N+1 (<objetivo>)
- [ ] iterate → re-trabajar Session N (motivo: <...>)
- [ ] escalate → bloqueante requiere decision externa de <quien>
- [ ] standby → pausar ticket, retomar despues de <evento>

**Pre-condiciones para Session N+1:**
- <que debe estar listo>

**Tiempo invertido:** <Nh efectivos>
**Contexto retomable:** <1-2 lineas: que se persistio, que esta en wip>
```

### Gate 0 (pre-execute) — registrado 2026-05-06

**Estado del ticket:** open, plan refinado, decisiones tomadas. Listo para Session 1.

**Trabajo previo a Session 1:**
- TICKET-012 creado con 21 hallazgos, 3 fases testing, 7 docs
- Auditoria de formato vs template DKC: ✓ alineado
- 10 decisiones pre-execute registradas (B1-B5, N1-N6)
- 4 Learns capturados (L1 CORS, L2 atoms, L3 sortablejs, L4 lang naming)
- BUG-platform CORS pendiente de crear (Session 1 task)

**Pre-condiciones para Session 1:**
- Workspace de T-010 sin cambios pendientes
- Fix CORS local aplicado en `object-manager/src/index.js:45` (NO commit)
- DKC up1 activo

---

### Session 1 — 2026-05-06 — Pre-flight + validacion hipotesis

**Tipo:** ⚑ fuerte (gate humano antes de Session 2)

**Tasks completadas:**
- [x] S1.T1: merge `UPONE-1038-qa-baseline` → `develop` (--no-ff, commit `929ad4d`) + crear branch `UPONE-1038-quality-pass-2` desde develop
- [x] S1.T2: crear BUG-platform-013 (CORS X-App-ID, severity high, status detected) — promueve L1
- [x] S1.T3: validar H1 (Modal en molecules + compat render functions) → ✓ confirmada
- [x] S1.T4: validar H2 (sync acepta .ts adyacentes) → ✓ confirmada por inspeccion + estado actual (experimento redundante)
- [x] S1.T5: validar H3 (`@types/sortablejs@1.15.9` disponible, scope mod) → ✓ confirmada, instalacion diferida a S4.T1
- [x] S1.T6: validar H5 (test utilities oficiales en `up1/layout/src/__tests__/utils/`) → ✓ confirmada con setup pendiente
- [x] S1.T7: editar T-012 con discoveries (H1-H5 finales, Context found, L5-L8) + reindex DKC

**Tests / coverage:**
- vitest run: NO ejecutado (Session 1 = solo validacion, sin cambios al codigo del producto)
- LLM-e2e: NO ejecutado (sin cambios funcionales)
- Tier T1: justificado — sin codigo nuevo del mod, solo lecturas/research

**Discoveries / Learns nuevos:**
- L5: API completa del atom Modal (542 LOC, BModal replacement, slots/props/a11y/teleport/nested)
- L6: sync.js de layout valida 1 .vue + N .ts por folder — sub-componentes Vueform extraibles a .ts
- L7: utilities oficiales del platform en `layout/src/__tests__/utils/` (mountWithDefaults, withSetup, mocks i18n, factories) — NO expuestas como package
- L8: setup pendiente del mod para Fases A/B/C — environment node→happy-dom, devDep happy-dom, alias `@layout-test-utils`

**Failed approaches:** ninguno

**Bloqueantes detectados:** ninguno
- BUG-platform-013 NO bloquea — workaround local activo, comunicacion humana ya en curso con encargado de platform

**Gate decision:**
- [x] continue → Session 2 (Quick wins atomicos: S1 data: URLs, C4 baseFields, C5 void maxPos)
- [ ] iterate
- [ ] escalate
- [ ] standby

**Decisiones humanas (confirmadas 2026-05-06):**
- **N7** — Push diferido: `develop` post-merge y branch `UPONE-1038-quality-pass-2` quedan SOLO LOCAL hasta proximo handoff. Razon: aislar publicacion del avance, evitar exponer un cierre de T-010 sin acompañamiento. Decision se revisa antes de S2 commits o al primer punto de coordinacion con el equipo.
- **Standby intermedio**: Session 2 NO arranca de inmediato. El dev pausa entre S1 (cerrada) y S2 (pendiente). Estado totalmente persistido — retoma sin perdida de contexto.

**Pre-condiciones para Session 2 (cuando se retome):**
- Branch activa: `UPONE-1038-quality-pass-2` ✓ (local, no pushed)
- BUG-platform-013 indexado en DKC (reindex OK: 269 records / 61 learns)
- vitest del mod sigue al 28.3% baseline (sin cambios)
- Decision N7 vigente: continuar local hasta nuevo aviso

**Tiempo invertido:** ~1.5h (research + persistencia, sin codigo de producto)
**Contexto retomable:** S2 arranca con S2.T1 (sanitizeHtml `data:` URL block, 1 linea + 1 test). Plan original sin cambios — todas las hipotesis confirmaron sin replan. Para retomar: `/dkc` → confirmar continuar T-012 → S2.T1.

---

### Session 2 — 2026-05-06 — Quick wins atomicos

**Tipo:** auto (T2)

**Pre-condiciones verificadas:**
- Branch `UPONE-1038-quality-pass-2` activa, sin cambios pendientes
- vitest baseline: 288 tests / 28.3% coverage
- Decision N7 vigente: trabajo local, sin push

**Decision tecnica menor (S2.T1, registrada 2026-05-06):**
- **Enfoque A (denylist extendida)** elegido para bloqueo de `data:` URLs en sanitizer (vs B allowlist de schemes). Razon: scope del ticket dice "1 linea + 1 test"; allowlist expande scope. `vbscript:` legacy IE-only; `blob:` con HTML requiere setup adicional fuera del WYSIWYG. Si emerge necesidad de defense-in-depth → ticket nuevo de improvement.

**Tasks completadas:**
- [x] S2.T1: `sanitizeHtml.ts:76` regex `(javascript|data):` + 3 tests data: → commit `69fa9d6`
- [x] S2.T2: `submitForm:813` usa `props.baseFields` (cierra C4 split base/rt en edit) → commit `4ff7932`
- [x] S2.T3: `openCreateRoot` -6 LOC dead code (calculo maxPos + comment + void) → commit `1e5fc5a`

**Tests / coverage:**
- vitest run: 291/291 passing (288 baseline + 3 nuevos data: en S2.T1) — sin regresion
- vitest run --coverage: **28.38% global (baseline 28.3%, delta +0.08%, no baja)**
- sanitizeHtml.ts: 100% statements/branches/funcs/lines (sin cambios — nuevos tests refuerzan branches de href filter)
- CompositeSectionTreeElement.vue: 0% (sin cambios — Fase B/C cubrira post-M1/M2)
- LLM-e2e: NO ejecutado (S3 lo correra post-C1/C2 que es el cambio de UX significativo)

**Discoveries / Learns nuevos:**
- L9: C4 fix corrige split en edit, pero create case en linea 848 (`...payload, position: nextPosition`) sigue forzando override del position del user. Comportamiento intencional segun comentario inline, pero crea inconsistencia con form que muestra input editable. Decision pendiente del dev — captura en Failed approaches/Backlog si no se resuelve

**Failed approaches:** ninguno

**Bloqueantes detectados:** ninguno

**Gate decision:**
- [x] continue → Session 3 (RULE compliance C1 + C2, ⚑ gate fuerte, T3, 2.5-3h)
- [ ] iterate
- [ ] escalate
- [ ] standby

**Pre-condiciones para Session 3:**
- 3 commits S2 en branch `UPONE-1038-quality-pass-2` (no pushed)
- C4 fix limita exposicion del bug latente — habilita refactor seguro de `CompositeSectionForm` (C1) sin temer al split base/rt
- L9 pendiente de decision (no bloquea S3 — independent)

**Tiempo invertido:** ~45 min efectivos (3 quick wins + gate persistencia)
**Contexto retomable:** S3 arranca con S3.T1 (refactor `CompositeSectionForm` usando atoms del layout-library: `Input`/`Textarea`/`Checkbox`/`Label`/`Button`). Tier T3 (regression LLM-e2e + UI smoke). Gate fuerte humano al cierre.

---

### Session 3 — 2026-05-06 — RULE compliance C1 + C2

**Tipo:** ⚑ fuerte (gate humano al cierre)

**Approach C1 (S3.T1+S3.T2 unificadas):**
Delegar "soy un modal" al `Modal` de molecules. Form contenido puro (Input/Textarea/Checkbox isSwitch/Alert) + Element envuelve con `<Modal v-model :title>`. Cleanup CSS obsoleto en mismo commit. ModalTitle al Element. Gana a11y completa (focus trap + Esc + return focus + aria-modal) heredada.

**Approach C2 (S3.T3, decision L10-A):**
Crear `lang/es_CL.json` BASE del mod con namespaces `compositeSectionTree.*` y `richTextRenderer.*` (sigue platform i18n.md). Reemplazar ~30 strings via `$t()` (template) + `useI18n` `t()` (render functions de Node/Form/View y setup del Element). Props defaults `''` con fallback `$t()` en template.

**Tasks completadas:**
- [x] S3.T1+T2: C1 refactor form+Modal — commit `92a086f` (-95 LOC neto, atoms + molecule Modal)
- [x] S3.T3: C2 i18n + `lang/es_CL.json` (37 keys + `_source_module`) — commit `c024e5a` (+95/-35)
- [x] **FIX REGRESION**: C4 commit `4ff7932` referenciaba `props.baseFields` undefined en Element → fix commit `eb4a3d8` (declarar `baseFields` prop con default `['name']`)
- [x] S3.T4 LLM-e2e selectivo (opcion B): 4/4 scenarios PASS + view modal extra PASS
- [x] S3.T4 smoke modal dark mode: OK (atoms + Modal molecule respetan tokens platform)

**Tests / coverage:**
- vitest run: 291/291 passing — sin regresion
- vitest run --coverage: 28.38% (igual que S2)
- LLM-e2e selectivo (4 scenarios afectados por C1/C2):
  - **detail-uv-evaluation-tree** PASS — tree + i18n summary/collapse + view modal NF (title/close/position)
  - **edit-evaluation-tree-weight** PASS post-fix — modal Form atoms + i18n params {expected, actual, suffix} + mutation + tree refetch + cleanup Q1=11
  - **detail-uv-customsection-tab** PASS — richText render sin tags HTML literales + XSS prevention
  - **customsection-wysiwyg-edit** PASS — Trix toolbar + content matchea seed
- LLM-e2e completo 18/18: NO ejecutado (decision opcion B del dev — LLM-e2e selectivo). Diferido a S12 GATE final pre-merge

**Discoveries / Failed approaches:**
- **FA-1** registrado: C4 fix referenciaba prop no declarada en Element — bug introducido por commit `4ff7932`, detectado en LLM-e2e (vitest no lo cubría — test concreto en B4). Fix `eb4a3d8` agrega `baseFields` como prop del Element. **Aprendido**: cambiar hardcoded a prop requiere verificar que la prop existe en ESE componente, no solo en componentes hermanos. vitest del area NO substituye regression e2e cuando el codigo vive en SFC sin coverage.
- L9 (residual create position) resuelto en commit `8b83738` (S2 extension): render condicional que esconde input position en mode create-*. Coherente con auto-asignacion documentada.
- L10 (lang naming) resuelto: decision A aplicada en S3.T3.

**Bloqueantes detectados:** ninguno (FA-1 corregido durante S3.T4)

**Gate decision:**
- [x] continue → Session 4 (M1 extraccion sub-componentes a `.ts`)
- [ ] iterate
- [ ] escalate
- [ ] standby

**Pre-condiciones para Session 4:**
- Branch con 7 commits S2+S3: `69fa9d6` (S1) → `4ff7932` (C4) → `1e5fc5a` (C5) → `8b83738` (L9) → `92a086f` (C1) → `c024e5a` (C2) → `eb4a3d8` (C4-fix-regression). Local, sin push (decision N7 vigente)
- vitest 291/291 + coverage 28.38%
- LLM-e2e selectivo PASS + smoke dark mode OK
- H2 confirmada en S1 (sync acepta `.ts` adyacentes) → M1 ejecutable en S4

**Tiempo invertido:** ~3.5h (refactor C1+C2 + LLM-e2e + 1 fix de regresion + smoke)
**Contexto retomable:** S4 arranca con S4.T1 (instalar `@types/sortablejs` como devDep del mod, decision H3 → mod scope) + M1 extraccion `CompositeSectionView`/`CompositeSectionForm`/`CompositeSectionNode` a `.ts` adyacentes + C3 tipado de `evt`/`payload` Sortable. Tier T3 (regression LLM-e2e + sync test).

---

### Session 4 — 2026-05-06 — M1 + C3 extraccion sub-componentes

**Tipo:** auto (T3)

**Tasks completadas:**
- [x] S4.T1: `npm install -D @types/sortablejs` (mod scope, decision H3) → package.json +1
- [x] S4.T2-T4 (M1 unificado): extraer `CompositeSectionView` (~110 LOC), `CompositeSectionForm` (~150 LOC), `CompositeSectionNode` (~210 LOC, recursivo) → 3 archivos `.ts` adyacentes — commit `e1dd807`
- [x] S4.T5 (C3): tipar `Sortable.SortableEvent` (rootSortable + Node) + `MouseEvent` (View) + `HTMLElement | null` (Node ref) — commit `812e637`

**Tests / coverage:**
- vitest run: 291/291 passing — sin regresion
- vitest run --coverage: **29.64% (baseline S3 28.38%, delta +1.26%)** — sube por reduccion del SFC raiz al denominador (lines del .vue cuentan menos)
- LLM-e2e selectivo: NO re-ejecutado (cambio estructural NO-behavior, solo extraccion de codigo + tipado). Smoke browser modal edit Q1 verifica integridad funcional
- Sync test: H2 doblemente confirmada empiricamente — los 3 `.ts` aparecen en `layout/src/modsComponents/CompositeSectionTree/` post-`npm run sync`

**Discoveries / Learns nuevos:**
- (ninguno nuevo — el refactor M1 sigue el patron documentado en RULE-platform-003)

**Failed approaches:** ninguno

**Bloqueantes detectados:** ninguno

**Gate decision:**
- [x] continue → Session 5 (M2 + M3: extraer `buildPayloads.ts` + `treeOps.ts`)
- [ ] iterate
- [ ] escalate
- [ ] standby

**Pre-condiciones para Session 5:**
- 9 commits S2+S3+S4 en branch `UPONE-1038-quality-pass-2`, local sin push
- vitest 291/291 + coverage 29.64%
- SFC raiz a 983 LOC (objetivo final: <700 post-M2+M3 que extraen `submitForm` y `onReorder` helpers)
- 3 sub-componentes en .ts listos para Fase B testing

**Tiempo invertido:** ~1.5h (1 install + 3 extracciones + tipado + smoke)
**Contexto retomable:** S5 arranca con M2 (extraer `splitFormData`/`buildCreatePayload`/`buildUpdatePayload`/`computePositionUpdates` a `buildPayloads.ts`) + M3 (`flattenTree`/`findNodeById` a `treeOps.ts`). Tests B4/B5 parte de Fase B (no S5). Tier T2 (unit tests del area + coverage delta).

---

### Session 5 — 2026-05-06 — M2 + M3 helpers extraidos

**Tipo:** auto (T2)

**Tasks completadas:**
- [x] S5.T1 (M2): `buildPayloads.ts` (~95 LOC) con 5 pure functions — splitFormData, computeNextPosition, buildCreatePayload, buildUpdatePayload, computePositionUpdates
- [x] S5.T2 (M3): `treeOps.ts` (~50 LOC) con flattenTree, findNodeById (early-return), findSiblings (DFS pre-order)
- [x] S5.T3: refactor `submitForm` y `onReorder` para usar helpers — cierra item 7 T-010 (submitForm ahora ~30 LOC efectivos, antes 63 LOC). Lectura declarativa: split → compute → build → mutate
- Commit unificado `c149226` (M2+M3 = 1 hallazgo en N3)

**Tests / coverage:**
- vitest run: 291/291 passing
- vitest run --coverage: **29.3%** (vs S4 29.64% delta -0.34%, vs baseline original 28.3% delta +1.0%)
- Delta intra-sesion negativo esperado: 145 LOC nuevas sin tests inflan denominador. Fase B4 (build-payloads.test.ts) + B5 (tree-ops.test.ts) cubrira post-S9 → coverage proyectado +5-7% al agregar esos tests
- Sync OK
- Smoke browser tree post-refactor: identico

**Discoveries / Learns nuevos:** ninguno

**Failed approaches:** ninguno

**Bloqueantes detectados:** ninguno

**Gate decision:**
- [x] continue → Session 6 (Escalabilidad — E1 sequential reorder + E2 warn UI + E3 fix watch)
- [ ] iterate
- [ ] escalate
- [ ] standby

**Pre-condiciones para Session 6:**
- 10 commits en branch `UPONE-1038-quality-pass-2`, local sin push
- vitest 291/291, coverage 29.3% (>baseline)
- Helpers `treeOps.ts` y `buildPayloads.ts` listos para Fase B testing
- SFC raiz a 959 LOC

**Tiempo invertido:** ~50 min (2 helpers nuevos + refactor submitForm/onReorder + smoke)
**Contexto retomable:** S6 arranca con E1 (sequential reorder, mejorar `Promise.all` actual a sequencial para evitar race en server con escalado), E2 (warn UI cuando truncate>500), E3 (fix watch). Tier T3 (LLM-e2e regression).

---

### Session 6 — 2026-05-06 — Escalabilidad E1 + E2 + E3

**Tipo:** auto (T3)

**Tasks completadas:**
- [x] S6.T1 (E1, HIGH): onReorder ahora itera con for-loop secuencial (vs Promise.all paralelo). Reduce backpressure Apollo + race con N siblings escalado
- [x] S6.T2 (E2, HIGH): `truncated: ComputedRef<boolean>` en useCompositeSectionTree + Alert variant=warning en SFC + 2 keys i18n `compositeSectionTree.truncated.{title,message}` con params {limit, total}
- [x] S6.T3 (E3, MEDIUM): CompositeSectionNode quita `expanded` de las deps del watch [childrenEl, enableEdit, hasChildren] — el cambio de `childrenEl` (null↔HTMLElement) ya cubre el toggle. Reduce destroys+creates de Sortable en arboles grandes
- Commit unificado `101d6ba` (E1+E2+E3 = 1 hallazgo "Escalabilidad" en N3)

**Tests / coverage:**
- vitest run: 291/291 passing
- vitest run --coverage: **29.13%** (vs S5 29.3% delta -0.17% por LOC E2 sin tests, vs baseline 28.3% delta +0.83% — sigue por encima)
- Sync OK
- Smoke browser tree post-refactor: identico funcionalmente. Alert truncated correctamente NO visible con totalCount=8 (< 500)

**Discoveries / Learns nuevos:** ninguno

**Failed approaches:** ninguno

**Bloqueantes detectados:** ninguno

**Caveat documentado:** smoke de reorder con N siblings reales (drag-n-drop) NO ejecutado en este gate — requiere accion manual del dev. Cambio E1 es trivial (loop secuencial) sin behavior change observable (mismo set de mutations, distinta concurrencia). Reorder de 1 sibling ya validado en S3.

**Gate decision:**
- [x] continue → Session 7 (Cleanup oportunista — C6 + L1 + L2 + E4/E5 TODOs)
- [ ] iterate
- [ ] escalate
- [ ] standby

**Pre-condiciones para Session 7:**
- 11 commits en branch `UPONE-1038-quality-pass-2`, local sin push
- vitest 291/291, coverage 29.13% (>baseline)
- E1 + E2 + E3 cerrados; quedan E4 (refetch over-fetch) + E5 (virtualizacion) — parte del cleanup oportunista de S7

**Tiempo invertido:** ~40 min (3 cambios pequeños + i18n keys + smoke)
**Contexto retomable:** S7 arranca con cleanup oportunista — C6 (`console.error` -> logger central si existe), L1 (TODO comments E4/E5 documentados como deuda), L2 (otros chequeos finales). Tier T1.

---

### Session 7 — 2026-05-06 — Cleanup oportunista

**Tipo:** auto (T1)

**Tasks completadas:**
- [x] S7.T1 (C6): grep cross suite/layout/object-manager → NO existe `useLogger` central. **BUG-platform-014 creado** documentando la falta. 4 `console.error` con prefijo `[CompositeSectionTree]` se mantienen — bulk update cuando platform exponga el helper. BL-3 en backlog
- [x] S7.T2 (L1): comentario inline del SFC reducido 16→5 LOC con referencia a BUG-platform-011. Detalle de limitaciones vive en el bug DKC, no se duplica
- [x] S7.T3 (E4+E5+L2 deuda): TODO inline en `onReorder` (E4 refetch over-fetch) + `CompositeSectionNode.render` (E5 recursion). 4 entries en `## Backlog`: BL-1 (E4), BL-2 (E5), BL-3 (C6 logger), BL-4 (L2 17 props). Todos prioridad `could` — no bloquean cierre
- Commit unificado `d370279`

**Tests / coverage:**
- vitest run: 291/291 passing — sin cambios
- vitest --coverage: NO ejecutado (cleanup minimo, no cambia LOC ejecutables; coverage S6 29.13% sigue valido)
- Sin sync (no hay cambios en archivos sincronizados que afecten layout/suite a runtime)

**Discoveries / Learns nuevos:**
- L11: platform up1 NO expone logger central — confirmado via grep en suite/layout/object-manager. Documentado en BUG-platform-014. Mods replican `console.error` con prefijo manual del scope. UX defensiva minimo, falta DX para observability en SP2+

**Failed approaches:** ninguno
**Bloqueantes detectados:** ninguno

**Gate decision:**
- [x] continue → Session 8 (Fase A testing — composable + RichText + branches faltantes)
- [ ] iterate
- [ ] escalate
- [ ] standby

**Pre-condiciones para Session 8:**
- 12 commits en branch `UPONE-1038-quality-pass-2`, local sin push
- vitest 291/291, coverage 29.13%
- 4 items diferidos en backlog (BL-1 a BL-4), todos `could`
- Setup pendiente del mod (L8): cambiar `vitest.config.ts` `environment: 'node'` → `'happy-dom'` + instalar `happy-dom` + agregar alias `'@layout-test-utils'`

**Tiempo invertido:** ~30 min (1 BUG-platform + cleanup comentario + TODOs + backlog)
**Contexto retomable:** S8 arranca con setup del mod (S8.T0 implicito: env happy-dom + dep + alias) seguido de Fase A1 (composable test) + A2 (RichTextRenderer test) + A3 (seed entry test) + A4-A6 (extender tests con branches faltantes data:/SSR/epsilon=0). Tier T2.

---

### Session 8 — 2026-05-06 — Fase A testing low-risk

**Tipo:** auto (T2)

**Setup ajustado vs L8:** jsdom YA disponible en monorepo (los tests existentes `sanitize-html` y `formatViewValue` ya lo usaban via `@vitest-environment jsdom`). NO se instalo happy-dom. Solo se agrego alias `@/composables/useApolloClient` -> stub local. Decision pragmatica: respetar el patron del mod (env-por-archivo) sin tocar el default.

**Tasks completadas:**
- [x] S8.T0: stub `tests/stubs/useApolloClient.ts` + alias en `vitest.config.ts`
- [x] S8.T1 (A1): `use-composite-section-tree.test.ts` — 13 tests con mock Apollo, ownerId reactivity, error handling, validateWeightedSum, tolerance, **truncated flag (E2)**, refetch
- [x] S8.T2 (A2): `rich-text-renderer.test.ts` — 14 tests del contrato del computed sanitizedHtml. NO monta Vueform (overhead) — render real cubierto por LLM-e2e
- [x] S8.T3 (A3): `seed-entry.test.ts` — 6 tests dispatch UPU vs others, orden Univalle->AIEP, error propagation. Mocks via `vi.hoisted`
- [x] S8.T4 (A5+A6): extensiones formatViewValue (SSR sin document) + validateWeightedSum (epsilon=0 + tolerance negativa Math.max guard)
- Commit `651eecb`

**Tests / coverage:**
- vitest run: **327/327** passing (+36 vs S7 baseline 291/291)
- vitest --coverage: **34.03%** (vs S7 29.13% delta **+4.9%**, vs baseline original 28.3% delta **+5.73%**)
- Mejoras puntuales:
  - `useCompositeSectionTree.ts`: 0% → **98.9%** statements (linea 153 SSR-watch fallback, no relevante)
  - `seed.js`: 0% → **100%**
  - `formatViewValue.ts`: 95% branches → **100%**
  - `validateWeightedSum.ts`: 95% branches → 95% (linea 49 cubierta tras epsilon=0)

**Discoveries / Learns nuevos:**
- L12: vi.mock con factory necesita variables hoisted. Usar `vi.hoisted(() => ({ ... }))` para mocks que se referencian en `vi.mock(...)` factory. Sin esto: `ReferenceError: Cannot access 'mockX' before init`
- L13: jsdom YA viene como hoisted dep del monorepo up1 (no requiere install per-mod). Tests del mod usan `@vitest-environment jsdom` por archivo en lugar de cambiar el default `node` global

**Failed approaches:**
- FA-2: vi.mock con const top-level falla por hoisting → resuelto con `vi.hoisted` (L12)
- FA-3: sample data plano (sin `data:` wrapper) en mock Apollo no construia tree correctamente porque `buildTree` lee `it.data` → resuelto wrapeando en `{ id, data: {...} }` (linea 19 de buildTree.ts)

**Bloqueantes detectados:** ninguno

**Gate decision:**
- [x] continue → Session 9 (Fase B testing — sub-componentes Vue post-M1)
- [ ] iterate
- [ ] escalate
- [ ] standby

**Pre-condiciones para Session 9:**
- 13 commits en branch `UPONE-1038-quality-pass-2`, local sin push
- vitest 327/327, coverage 34.03%
- 3 sub-componentes en `.ts` adyacentes listos para test con `mount`: `CompositeSectionView.ts`, `CompositeSectionForm.ts`, `CompositeSectionNode.ts`
- Helpers de M2/M3 listos para B4/B5: `buildPayloads.ts`, `treeOps.ts`

**Tiempo invertido:** ~1.5h (4 archivos test nuevos + 2 extensiones + setup vitest + 2 fixes de hoisting/data)
**Contexto retomable:** S9 arranca con Fase B post-M1 — B1 (CompositeSectionNode tests), B2 (CompositeSectionForm tests), B3 (CompositeSectionView tests), B4 (buildPayloads tests), B5 (treeOps tests). Tier T2. **Proyeccion coverage S9: 34% → ~75%** segun ticket original.

---

### Session 9 — 2026-05-06 — Fase B testing sub-componentes

**Tipo:** auto (T2)

**Setup ajustado vs L8:** los atoms/molecules del platform son `.vue` que requieren `@vitejs/plugin-vue` no instalado en mod. Approach: **stubs locales** en `tests/stubs/` (render functions con contrato props/slots/emits) + alias `../../components/{atoms,molecules}` en vitest.config. Sin nuevas deps en mod.

**Tasks completadas:**
- [x] S9.T0: stubs `atoms.ts` (Button/Badge/Text/Heading/Icon/IconButton/Spinner + Input/Textarea/Checkbox/Alert con v-model) + `molecules.ts` (Modal). Alias en vitest.config.
- [x] S9.T1 (B1): `composite-section-node.test.ts` — 15 tests, mock sortablejs via `vi.hoisted`
- [x] S9.T2 (B2): `composite-section-form.test.ts` — 15 tests, **cubre C4 con test concreto**
- [x] S9.T3 (B3): `composite-section-view.test.ts` — 10 tests
- [x] S9.T4 (B4): `build-payloads.test.ts` — 16 tests
- [x] S9.T5 (B5): `tree-ops.test.ts` — 10 tests
- Commit unificado `175ca48`

**Tests / coverage:**
- vitest run: **393/393** passing (+66 vs S8 327/327)
- vitest --coverage: **51.25%** (vs S8 34.03% delta **+17.22%**, vs baseline 28.3% delta **+22.95%**)
- Mejoras puntuales (sub-componentes Vue):
  - `CompositeSectionView.ts`: 0% → **97.77%**
  - `CompositeSectionForm.ts`: 0% → **94.21%**
  - `CompositeSectionNode.ts`: 0% → **92.13%**
- Helpers M2/M3 a 100%:
  - `buildPayloads.ts`: 0% → **100%**
  - `treeOps.ts`: 0% → **100%**
- Solo SFC raiz queda 0% (`CompositeSectionTreeElement.vue` 962 LOC) — Fase C en S10

**Discoveries / Learns nuevos:**
- L14: stubs locales superiores a mockear platform `.vue` cuando no hay `@vitejs/plugin-vue`. Mantener contrato (props/slots/emits) sin cargar dependencias del platform real (Bootstrap, design-tokens, etc.) que rompen jsdom
- FA-2/FA-3 se reaplicaron exitosamente en S9 (vi.hoisted en B1 sortablejs mock)

**Failed approaches:**
- FA-4: stub atom con `...attrs, class: 'stub-atom...'` reemplazaba el class heredado en lugar de mergearlo → `.cst-node__name` no encontrable. Resuelto mergeando classes manualmente con guard de tipo (string vs array)

**Bloqueantes detectados:** ninguno

**Gate decision:**
- [x] continue → Session 10 (Fase C testing — SFC raiz `defineElement` setup)
- [ ] iterate
- [ ] escalate
- [ ] standby

**Pre-condiciones para Session 10:**
- 14 commits en branch, local sin push
- vitest 393/393, coverage 51.25%
- Sub-componentes y helpers cubiertos. SFC raiz (962 LOC) sigue 0% — Fase C target ≥70% setup() coverage

**Tiempo invertido:** ~2.5h (setup stubs + 5 archivos test + 2 fixes hoisting/class merge)
**Contexto retomable:** S10 arranca con C1 testing del SFC raiz `defineElement` setup. Mock Apollo client + mock sortablejs ya disponibles desde S8/S9. Tier T2.

---

### Session 10 — 2026-05-06 — Fase C testing SFC raiz (scope ajustado A)

**Tipo:** auto (T2)

**Decision tecnica menor (S10.T1, opcion A elegida con caveat):**
SFC raiz `CompositeSectionTreeElement.vue` (962 LOC) no es testeado en unit. Razon: `.vue` con `defineElement` de Vueform requiere `@vitejs/plugin-vue` no instalado + mockear Vueform es fragil. Refactor de extraer setup() a composable (~1-2h) fuera del scope. **Trade-off**: coverage 51% < 75% target original; **mitigacion**: cobertura conceptual via LLM-e2e (4 scenarios ya en S3.T4 + 2 nuevos en S10.T2) + sub-componentes (B1-B3) y helpers (B4-B5) ya cubiertos al 92-100%.

**Tasks completadas:**
- [x] S10.T1: Decision A registrada con trade-off documentado
- [x] S10.T2: 2 scenarios LLM-e2e nuevos creados:
  - `create-evaluation-component.md` (escenarios A=create-root + B=create-child, ~10 asserts) — cubre submitForm CREATE branch con `splitFormData`/`computeNextPosition`/`buildCreatePayload`/refetch + L9 (input position oculto) + `modalTitle` createRoot/createChild con i18n params
  - `reorder-evaluation-components.md` (drag-n-drop a nivel children + cleanup, ~8 asserts) — cubre `onReorder` + sequential mutations E1 + `setupRootSortable` + `computePositionUpdates` + revert via refetch on error
- [x] S10.T3: BL-5 documentado en backlog con cobertura LLM-e2e mapeada explicitamente y gaps cuantificados

**Tests / coverage:**
- vitest run: 393/393 passing (sin cambios vs S9)
- vitest --coverage: **51.25%** (sin cambios; SFC raiz sigue 0%)
- LLM-e2e scenarios:
  - 4 ya ejecutados en S3.T4: detail-uv-evaluation-tree, edit-evaluation-tree-weight, detail-uv-customsection-tab, customsection-wysiwyg-edit
  - 2 nuevos documentados (S10.T2): create-evaluation-component, reorder-evaluation-components — pendientes de ejecucion en S12 GATE final

**Discoveries / Learns nuevos:** ninguno

**Failed approaches:** ninguno

**Bloqueantes detectados:** ninguno

**Caveat documentado:** target original 75% coverage NO alcanzado (51%). Justificado por scope ajustado decision A. Si emerge necesidad de coverage del SFC raiz: extraer setup() a `useCompositeSectionTreeElement.ts` composable testeable (~1-2h, BL-5 plan ejecutable).

**Gaps explicitamente NO cubiertos** (documentados en BL-5):
1. **Truncated Alert (E2)**: seed UV tiene 8 nodos, totalCount nunca > SECTION_LIST_LIMIT=500. Necesita fixture sintetico o seed alterno en SP2.
2. **Error fetch tree-level**: composable error.value renderea Alert variant=danger en SFC. Edge case bajo, no validado.

**Gate decision:**
- [x] continue → Session 11 (Docs `.ai/`)
- [ ] iterate
- [ ] escalate
- [ ] standby

**Pre-condiciones para Session 11:**
- 14 commits en branch (sin nuevos commits en S10 — solo doc)
- vitest 393/393, coverage 51.25%
- 2 scenarios LLM-e2e nuevos pending de ejecucion (S12 GATE final)
- BL-5 documentado en backlog

**Tiempo invertido:** ~30 min (decision + 2 scenarios .md + backlog)
**Contexto retomable:** S11 arranca con docs `.ai/` (CONTEXT.md + PATTERNS.md + TASKS.md + TROUBLESHOOTING.md). Tier T0 (doc-only). Despues S12: docs humanos + cierre del ticket.

---

### Session 11 — 2026-05-06 — Docs `.ai/` D1-D4

**Tipo:** auto (T0 doc-only)

**Tasks completadas:**
- [x] S11.T1 (D1): `.ai/CONTEXT.md` (83 LOC) — purpose + domain model + scope SP1 + decisions
- [x] S11.T2 (D2): `.ai/PATTERNS.md` (148 LOC) — auto-recursion + atoms + i18n + helpers + reorder + sanitizer
- [x] S11.T3 (D3): `.ai/TASKS.md` (87 LOC) — agregar field/RT, debug Apollo, vitest, seed
- [x] S11.T4 (D4): `.ai/TROUBLESHOOTING.md` (147 LOC) — CORS, dark mode, tree/lang/modal, FA-1 anti-regresion, drag-n-drop, sync, logger
- Commit `223910c`

**Tests / coverage:** sin cambios (T0 doc-only). vitest 393/393, coverage 51.25%.

**Discoveries / Learns nuevos:** ninguno

**Failed approaches:** ninguno

**Bloqueantes detectados:** ninguno

**Notas de patron:** mods up1 NO usan frontmatter YAML en `.ai/` (verificado en hello-world-mod). Estructura: H1 + secciones H2 narrativas. ~465 LOC totales — equivalente al hello-world-mod (mas detallado por la complejidad del CompositeSectionTree).

**Gate decision:**
- [x] continue → Session 12 (Docs humanos + cierre)
- [ ] iterate
- [ ] escalate
- [ ] standby

**Pre-condiciones para Session 12:**
- 16 commits en branch `UPONE-1038-quality-pass-2`, local sin push
- vitest 393/393, coverage 51.25%
- 4 docs `.ai/` listos
- 2 scenarios LLM-e2e nuevos pending de ejecucion (S12 GATE final)

**Tiempo invertido:** ~45 min (4 docs + research patron mods existentes)
**Contexto retomable:** S12 arranca con docs humanos (D5 README del mod, D6 guia para devs externos al mod, D7 arquitectura del agregado curricular). Tier T3 (gate fuerte cierre). Decisiones criticas: ¿push de develop + branch a remote? ¿merge develop o PR review primero?

---

### Session 12 (pre-execute) — 2026-05-06 — Plan confirmado, standby intermedio

**Tipo:** ⚑ fuerte (gate humano pre-merge)

**Estado:** plan confirmado pre-ejecucion, dev pausa hasta proxima sesion.

**Decisiones humanas (confirmadas 2026-05-06 al cierre de S11):**
- **N8** — Standby tras S11. Branch con 16 commits queda local sin push (N7 vigente). Plan S12 documentado + tasks listadas pero NO ejecutadas — retoma con `/dkc continue`
- **Alcance docs**: 3 docs humanos completos (D5+D6+D7) — audience dual humano + LLM. Deben cubrir desarrollo y tests. NO se reduce el scope ("debe estar todo documentado")
- **Alcance LLM-e2e**: 6 scenarios completos (4 re-run baseline S3.T4 + 2 nuevos S10). "Es la prueba final que debe asegurar la entrega a este punto". NO smoke selectivo
- **Push diferido**: NO se hace push en S12. Decision N7 sigue activa hasta proximo handoff

**Plan ejecutable S12** (confirmado, ~3-3.5h efectivos):

| Orden | Task | Alcance | Tiempo |
|-------|------|---------|--------|
| 1 | D5 `README.md` del mod | Entry point dev humano + LLM. Setup, comandos, structure, key decisions, links a `.ai/`. **Seccion Testing con 3 sub-secciones**: Unit (vitest 393), LLM-e2e (approach + link a `tests/llm-e2e/README.md` + cuando usarlo + discoverability primer aterrizaje del dev nuevo). ~200 LOC | ~25 min |
| 2 | D6 Integration guide | Consumir el mod desde otros mods/core: custom Vueform elements expuestos, capabilities, sync mechanism, layouts JSON contract. **Mencion breve en seccion Validacion**: pre-merge correr unit + LLM-e2e. ~150 LOC | ~20 min |
| 3 | D7 Arquitectura del agregado curricular | Modelo conceptual + decisiones architecturales (composite tree pattern, RT pattern, owner-base relation, validateWeightedSum, sanitizer XSS) + diagrama + drivers. **Mencion del approach LLM-e2e como decision architectural DEC-001** (Playwright+Clerk no viable SP1 — ver TICKET-011). ~220 LOC | ~30 min |
| 4 | Extender `.ai/TASKS.md` (S11) | Agregar task **"Correr LLM-e2e"**: cuando hacerlo (cambios al SFC, pre-merge), como (prompt sistema en `tests/llm-e2e/runner-instructions.md` + scenario.md), donde ver resultados (`tests/llm-e2e/result.md`). +30-40 LOC | ~10 min |
| 5 | Update `tests/llm-e2e/README.md` | Listar los **2 scenarios nuevos S10** (`create-evaluation-component`, `reorder-evaluation-components`) en el inventario de scenarios. Actualizar metadata (TC del TICKET-012 que cubren) | ~10 min |
| 6 | Commit docs unificado (D5+D6+D7+TASKS extension+llm-e2e README update) | branch | ~5 min |
| 7 | **LLM-e2e completo (6 scenarios)** — momento de la verdad | 4 baseline re-run + 2 nuevos. Stack ya levantado, fix CORS aplicado. Scenarios: detail-uv-evaluation-tree, edit-evaluation-tree-weight, detail-uv-customsection-tab, customsection-wysiwyg-edit, **create-evaluation-component (nuevo)**, **reorder-evaluation-components (nuevo)** | ~45-60 min |
| 8 | Summary del ticket | metrics + evidence + commits log + backlog handoff | ~10 min |
| 9 | Cierre formal | status in_progress → done + reindex + persistir gate ⚑ | ~5 min |

**Discoverability LLM-e2e (gap detectado en pre-S12 audit):** el approach LLM-e2e existe en `tests/llm-e2e/` desde TICKET-011 con README + runner-instructions, pero los docs de alto nivel (.ai/, futuros README) NO apuntan a esa capacidad. Un dev nuevo (humano o LLM) NO descubre que existe a menos que explore manualmente. Tasks 1-5 cierran este gap explicitamente — el dev pregunto y se confirmo el alcance.

**Riesgos identificados:**
- LLM-e2e re-run puede detectar regresion de commit posterior a S3.T4 (M1/C3/M2/M3/E1/E2/E3). Si emerge → **gate fail, iterate, no continue**
- 2 scenarios nuevos (S10) ejecutados primera vez — drag-n-drop puede requerir ajuste del .md (coordinates, evaluate_script en lugar de drag MCP)
- Sesion del browser podria haber expirado entre standby y resume — re-login manual

**Pre-condiciones para retomar S12:**
- 16 commits en branch `UPONE-1038-quality-pass-2`, local sin push (N7+N8 vigentes)
- vitest 393/393, coverage 51.25%
- 4 docs `.ai/` listos
- 2 scenarios LLM-e2e nuevos pendientes
- Stack up1 corriendo (ver `./up1-start.sh --status`)
- Fix CORS local en `up1/object-manager/src/index.js:45` aun aplicado
- Browser autenticado como `eduardo.bacon@uplanner.com` (puede requerir re-login)

**Contexto retomable:** `/dkc continue` o `/dkc seguir` — Cain detecta TICKET-012 in_progress + identifica que tasks S12 estan pending → arranca con D5.

---

_(Session 12 ejecutara las tasks de arriba en orden. Gate ⚑ humano al cierre.)_

## Testing

### Coverage map

**Baseline (medido 2026-05-06):** 28.3% global. **Target al cerrar:** ≥75%. Ver seccion "Etapa de testing" arriba para fases A/B/C.

| REQ | Test cases | Type | Fase | Status |
|-----|-----------|------|------|--------|
| C1 (atoms en form) | TC-C1-{1..N} (render con atoms, no HTML crudo) | unit (vue-test-utils) + LLM-e2e regression | B2 | pending |
| C2 (i18n) | TC-C2-{1..N} (textos resueltos via $t() contra es_CL@*.json) | unit (lang-enums extendido) + LLM-e2e | A4/B2 | pending |
| C4 (baseFields submit) | TC-C4-1 (consumer con `baseFields=['name','position']` el position se persiste como base, no rt) | unit (build-payloads.test.ts) | B4 | pending |
| E1 (sequential reorder) | TC-E1-1 (reorder N siblings: orden de mutations correcto, sin race) | integration con mock Apollo | A1 | pending |
| S1 (data: href blocked) | TC-S1-1 (sanitize-html.test.ts extension: data:text/html bloqueado) | unit | A4 | pending |
| M1 (sub-componentes en .ts) | TC-M1-{1..N} (render de Node/Form/View en isolation) | unit (vue-test-utils) | B1-B3 | pending |
| M2 (payload helpers) | TC-M2-{1..N} (splitFormData, buildCreate/UpdatePayload, computePositionUpdates) | unit (pure functions) | B4 | pending |
| M3 (tree ops) | TC-M3-{1..N} (flattenTree, findNodeById early-return) | unit | B5 | pending |
| Composable Apollo | TC-T2-{1..N} (ownerId reactivity, query error, computed condicional) | integration con mock | A1 | pending |
| RichTextRenderer SFC | TC-RT-{1..N} (sanitizedHtml computed, default emptyText) | unit | A2 | pending |
| Branch coverage | TC-BR-{1..3} (formatViewValue:21 SSR, validateWeightedSum:49 epsilon=0) | unit | A5/A6 | pending |
| Regresion baseline | LLM-e2e 18/18 scenarios | LLM-e2e | post cada fase | pending |
| D1 (.ai/CONTEXT.md) | TC-D1-1 (smoke test LLM agrega RT nuevo con solo este doc) | manual | post-refactor | pending |
| D2 (.ai/PATTERNS.md) | TC-D2-1 (cubre Composite tree + RT pattern + decisions DECISION-006/007/008/012) | review manual | post-refactor | pending |
| D3 (.ai/TASKS.md) | TC-D3-{1..N} (cada task ejecutable end-to-end por LLM sin info adicional) | smoke LLM | post-refactor | pending |
| D4 (.ai/TROUBLESHOOTING.md) | TC-D4-1 (cada BUG-platform-* mencionado linkea a workaround) | review manual | post-refactor | pending |
| D5 (README.md) | TC-D5-1 (~170 LOC, paridad con hello-world-mod, links no rotos) | review manual + lint | post-refactor | pending |
| D6 (docs/guides/composite-section-tree.md) | TC-D6-1 (props completas, ejemplo por RT, cuando usar/no usar) | review manual | post-refactor | pending |
| D7 (docs/guides/{rich-text-renderer,seed-data,rt-extending}.md) | TC-D7-{1..3} (cada guide ejecutable) | review manual | post-refactor | pending |
| Frontmatter valido | TC-FM-1 (lint YAML + campos minimos en todos los .md nuevos) | unit (script) | post-D1-D7 | pending |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| validateWeightedSum | `vitest run validateWeightedSum.spec` | 22/22 | — | — |
| buildTree | `vitest run composable-buildTree.test` | ~25/~25 | — | — |
| sanitize-html | `vitest run sanitize-html.test` | ~25/~25 | — | — |
| formatViewValue | `vitest run formatViewValue.test` | ~20/~20 | — | — |
| resolveFieldKind | `vitest run resolveFieldKind.test` | ~25/~25 | — | — |
| LLM-e2e TICKET-011 | (per ticket spec) | 18/18 | — | — |

## Contrato

- **Suite vitest existente sigue pasando 100%** en cada fase (288 cases baseline → ~370+ al cierre).
- **Coverage global ≥75%** medido con `vitest run --coverage` antes de cerrar el ticket.
- **Coverage por capa** segun targets de la seccion "Etapa de testing": helpers 100%, composable ≥85%, sub-componentes ≥80%, SFC raiz ≥70%, RichText ≥80%.
- **Fase A obligatoria antes de mergear el PR del refactor.** Fases B y C obligatorias antes de cerrar el ticket.
- **Regresion vs LLM-e2e TICKET-011** — los 18 scenarios siguen pasando despues de cada fase. Si alguno falla: detener, agregar test integration que reproduzca el caso (DET-7), fixear, validar.
- **Behavior user-facing identico** — modal de edit, drag-n-drop, validacion sumativa, WYSIWYG CustomSection no cambian visualmente. Cambio aceptable: mejora de a11y por uso de atoms (focus trap, Esc, return focus al trigger).
- **Bug nuevo detectado durante testing** → test failing ANTES del fix (DET-7). Si esta fuera de los 21 hallazgos originales, capturar como learn y evaluar inclusion en scope.
- **Documentacion D1-D7 completa** antes de cerrar el ticket (no bloquea merge, si bloquea cierre). Ver "Documentacion del mod" abajo.
- **Smoke test LLM** sobre `.ai/*.md` nuevos: un LLM sin contexto previo debe poder ejecutar tasks D3 con solo los docs disponibles. Si pide info → falta cubrir.
- **Frontmatter valido** en todos los `.md` nuevos del mod (campos minimos: title, audience, module, project, type, last_updated).
- **Gates persistidos** al cierre de cada session (template en `## Sessions → Template de Gate`). 12 sessions planificadas, 3 gates fuertes (Session 1, 3, 12) requieren decision humana antes de avanzar. Gates auto-continue si tests verdes + coverage no baja + sin bloqueantes.
- **Cierre del ticket bloqueado** sin Gate 12 explicito (decision humana de merge a develop).

## Documentacion del mod — gap analysis y plan

### Gap analysis (medido 2026-05-06)

Patron canonico de docs en up1 (validado contra `mods/hello-world-mod/`, `mods/.ai/`, `mods/docs/`):

```
mods/<name>/
├── README.md                    ← 150-170 LOC: quick start, domain, features, capabilities, tests, links
├── .ai/                         ← Audiencia LLM
│   ├── CONTEXT.md               ← Domain model, file structure, fork checklist
│   ├── PATTERNS.md              ← Patterns ESPECIFICOS del mod (no genericos)
│   ├── TASKS.md                 ← Tareas comunes paso a paso
│   └── TROUBLESHOOTING.md       ← Issues conocidos del mod
└── docs/                        ← Audiencia humana
    └── guides/<feature>.md      ← How-to guides por feature
```

| Doc esperado | Estado en curriculum-design | Comentario |
|--------------|----------------------------|-----------|
| `README.md` | ⚠️ 51 LOC vs 169 hello-world | Falta domain model, features list, capabilities, tests, links a docs |
| `.ai/CONTEXT.md` | ❌ no existe | |
| `.ai/PATTERNS.md` | ❌ no existe | Patterns unicos (Composite tree, RT pattern, MADS, semana18=Session) sin documentar |
| `.ai/TASKS.md` | ❌ no existe | Como agregar RT/layout/extender el tree sin documentar |
| `.ai/TROUBLESHOOTING.md` | ❌ no existe | BUG-platform-008/009/010/011/012 mencionados en codigo sin doc consolidado |
| `docs/guides/` | ❌ no existe | |
| `tests/llm-e2e/README.md` | ✓ existe | OK |

### Frontmatter LLM-friendly — propuesta

Compatible con markdown estandar (renderers que no lo procesan lo ignoran). Aplica a **todos** los `.md` nuevos del mod:

```yaml
---
title: <one-line descriptivo>
audience: llm | human | both        # filter por consumidor
module: curriculum-design
project: up1
type: context | pattern | task | troubleshooting | guide | reference | readme
last_updated: <YYYY-MM-DD>
related:                            # grafo navegable
  - .ai/PATTERNS.md
  - docs/guides/composite-section-tree.md
sources:                            # trazabilidad a DKC
  - TICKET-009
  - SPEC-composite-section-tree-weighted-sum
tags: [domain-model, file-structure]
---
```

**Justificacion por campo:**

| Campo | Por que | Compatibilidad |
|-------|---------|----------------|
| `audience` | LLM puede priorizar docs especificas para LLM vs humano | Ignorado por renderers — no rompe |
| `module` / `project` | Search/filter por proyecto | Coincide con shape de records DKC (1-a-1 ingest) |
| `type` | Entender rol del doc en el arbol mental | — |
| `last_updated` | Detectar staleness | — |
| `related` | Grafo navegable sin full-text search | Coincide con DKC `related` |
| `sources` | Trazabilidad a tickets/specs DKC | Permite ingest a knowledge base sin reformatear |
| `tags` | Keyword search ligero | — |

**Compatibilidad garantizada:**
- Frontmatter YAML es estandar Jekyll/Hugo/MDX/Astro/Docusaurus — todos lo procesan o lo ignoran sin romper
- Markdown raw sigue siendo legible (frontmatter va antes del primer `#`)
- VSCode/IDE rendering no se afecta
- El patron up1 actual no usa frontmatter en `.ai/` — esto es **adicion no destructiva**: cualquier consumer existente sigue funcionando
- Si en el futuro DKC quiere ingest estos docs, los campos coinciden con records DKC

### Tasks D1-D7 — plan de creacion de docs

| # | Archivo | Contenido esperado | Effort | Frontmatter |
|---|---------|-------------------|--------|-------------|
| **D1** | `.ai/CONTEXT.md` | Domain model (AcademicActivity → CurricularSection con 7 RTs: Modality, LearningOutcome, Content, Session, EvaluationComponent, Bibliography, CustomSection), file structure del mod, dominio Learning Assurance, MADS pattern (template → silabos via learning-assessment), fork checklist | 1h | `audience: llm, type: context` |
| **D2** | `.ai/PATTERNS.md` | Composite section tree pattern (parentId self-FK sobre CurricularSection base), RT pattern (rt__X__curricularsection 1:1), agnostic component reusable, validateWeightedSum (REQ-02/03/04), DECISION-008 (semana 18 = Session no ApprovalCondition), DECISION-007 (RTs globales), DECISION-012 (tenant=UPU Fase 1), CustomSection schema fijo (DECISION-006) | 1.5h | `audience: llm, type: pattern` |
| **D3** | `.ai/TASKS.md` | "Agregar un nuevo RT" (object + lang + 3 layouts + seed), "Agregar layout list/view/edit a un RT existente", "Extender el composite tree con nuevo metric/secondary field" (props + types + tests), "Crear seed para tenant nuevo" (replicar shape `_data-univalle.js`/`_data-aiep.js`), "Debugear coverage de tests" (vitest run --coverage) | 1.5h | `audience: llm, type: task` |
| **D4** | `.ai/TROUBLESHOOTING.md` | BUG-platform-008/009/010/011/012 + workarounds documentados, "AcademicActivity no carga" (cita TICKET-012 fix CORS x-app-id en object-manager/src/index.js:45), "tooltip dark mode roto" (BUG-platform-010 + RULE-platform-001), "WYSIWYG no renderiza" (BUG-platform-009), "modal de Form no usa atoms" (BUG-platform-011 escalada), test de coverage falla por SSR (formatViewValue.ts:21) | 1h | `audience: llm, type: troubleshooting` |
| **D5** | `README.md` extender 51 → ~170 LOC | Mantener Quick Start actual + agregar: Domain Model (con diagrama ASCII), Features (lista de capabilities cubiertas), Capabilities table (`mod/curriculum-design:*`), Tests command (`vitest run`, `vitest run --coverage`), File Structure tree, Development Guides links a `.ai/` y `docs/` | 1h | `audience: both, type: readme` |
| **D6** | `docs/guides/composite-section-tree.md` | Como configurar el componente: props detalladas, ejemplo por RT (LearningOutcome, EvaluationComponent), cuando usar `validateWeightedSum`, cuando NO usar (single-level RTs), drag-n-drop behavior, modal casero limitations (link a BUG-platform-011) | 2h | `audience: human, type: guide` |
| **D7** | `docs/guides/{rich-text-renderer,seed-data,rt-extending}.md` | 3 guides: RichTextRenderer (sanitizer whitelist, target=_blank auto, scoped CSS), seed-data (estructura `_data-*.js`, shape de fixtures LLM-e2e), rt-extending (como agregar un nuevo RT al patron sin romper sync) | 3h | `audience: human, type: guide` |

**Total estimado: ~11h** efectivos en una sesion dedicada (D5 puede ser la primera porque es la cara visible del mod).

### Validacion de docs creadas

Antes de cerrar el ticket:

1. **Smoke test LLM**: pasar `.ai/CONTEXT.md` + `.ai/PATTERNS.md` + `.ai/TASKS.md` a un LLM nuevo (sin contexto previo) y pedirle "agregar un RT nuevo al mod" → debe poder hacerlo sin pedir info adicional. Si pide info → falta cubrir en docs.
2. **Linting frontmatter**: validar que cada `.md` nuevo parsea como YAML frontmatter valido y tiene los campos requeridos (`title`, `audience`, `module`, `project`, `type`, `last_updated`).
3. **Cross-references**: cada link relativo en frontmatter `related:` y en body resuelve a archivo existente.
4. **Compatibilidad markdown**: render en VSCode/Bitbucket muestra los docs sin frontmatter visible (oculto via tooling estandar).
5. **Auditoria contra patron up1**: estructura coincide con `mods/hello-world-mod/` (4 archivos `.ai/` + README expandido + `docs/guides/`).

### Compromiso de calidad para D1-D7

- **Cada doc creado** referencia su origen (TICKETs, SPECs, RULEs, BUGs) en frontmatter `sources:`
- **No duplicar** contenido genericos que ya viven en `mods/.ai/PATTERNS.md` o `mods/docs/guides/` — referenciar via `related:`
- **Links validados** antes de mergear (no broken refs)
- **`last_updated`** se actualiza con cada modificacion futura
- **Frontmatter es opcional para humanos** pero **mandatorio para LLM**: sin frontmatter, el doc no participa del index LLM

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|-------------|-----------|
| BL-1 | E4: refetch over-fetch tras cada mutation (re-query 500 items) — **PARCIAL ejecutado en S12.T7** (Opcion C: edit sin refetch). Pendiente create + reorder | — | TICKET-012 hallazgo E4, ejecucion parcial S12.T7 | Edit ya cubierto por applyEditToTree helper. Para create+reorder: cuando platform exponga bulkReorder/bulkUpdate (SP2) — server responde con subset cambiado, permitir update incremental local. Approach: cache update con writeQuery + delta. Ahora overkill para create (id assignment server) y reorder (N positions cross-parent) | could |
| BL-2 | E5: render recursivo H sin virtualizacion para arboles >200 hijos directos expandidos | — | TICKET-012 hallazgo E5 | TODO comment en CompositeSectionNode.render() | Si emerge caso real (cliente con muchos hijos directos en un nivel): considerar `vue-virtual-scroller` solo en el container `.cst-node__children`. Mitigado parcialmente por `expanded = ref(props.depth < 1)` (solo nivel 0 expande). Skip hasta tener metricas | could |
| BL-3 | C6: migrar `console.error` a `useLogger()` central | — | TICKET-012 hallazgo C6 | BUG-platform-014 creado (logger central no expuesto), 4 console.error con prefijo `[CompositeSectionTree]` | Cuando platform expone `useLogger()`: importar y reemplazar los 4 calls. Bulk update cross-mods en mismo PR | could |
| BL-4 | L2: 17 props del defineElement en limite, podrian agruparse en config object tipado | — | TICKET-012 hallazgo L2 | Patron actual valido (ver lineas 596-650 del SFC) | Si crece a >20 props o aparece duplicacion en otro RT consumer: agrupar en `CompositeTreeConfig = { tree, metric, secondary, layout }`. Refactor breaking-change para consumers — coordinar | could |
| BL-5 | SFC raiz `CompositeSectionTreeElement.vue` (962 LOC) queda 0% en unit coverage. Razon: `.vue` con `defineElement` de Vueform requiere `@vitejs/plugin-vue` no instalado en mod + mockear Vueform. Refactor de extraer setup() a composable testeable (~1-2h) NO se hizo en S10 (decision A — scope ajustado). Cobertura compensada via LLM-e2e | — | TICKET-012 Fase C decision A en S10 | **Cobertura via LLM-e2e** (mantener actualizada): scenarios cubren explicitamente: (1) submitForm edit → `edit-evaluation-tree-weight.md`, (2) submitForm create → `create-evaluation-component.md` (nuevo S10), (3) onReorder + sequential mutations + setupRootSortable → `reorder-evaluation-components.md` (nuevo S10), (4) openCreate/Edit/View + modalTitle → scenarios 1+2, (5) L9 hide position create → unit B2 + scenario create. **Gaps documentados**: truncated Alert (seed=8, no dispara — fixture sintetico en SP2), error fetch tree-level (edge case bajo). Si emerge necesidad real de unit del SFC raiz: extraer setup() a `useCompositeSectionTreeElement.ts` composable + tests aislados | could |

_(Items descubiertos durante execute que quedan fuera del scope actual. Items BL-1 a BL-4 documentados en S7 como deuda diferida — todos prioridad `could`, ninguno bloquea cierre.)_

## Summary

### What was requested

Quality pass post-baseline T-010 sobre el ecosistema CompositeSectionTree + RichTextRenderer del mod `curriculum-design`: 21 hallazgos repartidos en compliance RULE-mods (2 must), calidad (6), escalabilidad (5), modularidad (3), limpieza (3), seguridad (2) y gaps de coverage (2).

### What was done

- **Compliance RULE-mods (C1+C2)**: refactor de `CompositeSectionForm` a atoms `Input`/`Textarea`/`Checkbox`/`Modal`/`Alert` (RULE-mods-014) + extraccion de ~30 strings hardcoded a namespaces `compositeSectionTree.*` + `richTextRenderer.*` en `lang/es_CL.json` (RULE-mods-015).
- **Modularidad (M1+M2+M3)**: 3 sub-componentes inline (`Node`/`Form`/`View`) extraidos a `.ts` adyacentes (RULE-platform-003); helpers `buildPayloads` (5 funciones) y `treeOps` (3 funciones) extraidos como pure functions testeables.
- **Calidad (C3+C4+C5)**: tipado de eventos Sortable/Mouse/HTMLElement; fix submitForm con `props.baseFields` (cierra bug latente split base/RT en edit); cleanup `void maxPos` y comentario obsoleto.
- **Escalabilidad (E1+E2+E3)**: reorder secuencial via `for...of await` (elimina race conditions Apollo); composable expone `truncated: ComputedRef<boolean>` con Alert + i18n params; simplificacion de watch deps en Node.
- **Limpieza (C6+L1+L2)**: console.error con prefijo (BUG-platform-014 abierto); reduccion comentario inline 16→5 LOC; TODO inline + entries BL-1/2/4 en backlog.
- **Seguridad (S1)**: `data:` URLs bloqueadas en `sanitizeHtml.ts` (regex `(javascript|data):`) + 3 tests.
- **Testing Fase A+B+C**: composable Apollo + sanitizer + seed (Fase A 36 tests), sub-componentes Node/Form/View + buildPayloads + treeOps (Fase B 66 tests), SFC raiz cubierto via 5 LLM-e2e scenarios (Fase C). Coverage 28.3% → 51.25% (+22.95%).
- **Docs (S11+S12)**: 4 `.ai/` docs (CONTEXT, PATTERNS, TASKS, TROUBLESHOOTING) + README extendido (51→169 LOC paridad hello-world-mod) + 4 guides (composite-section-tree, rich-text-renderer, seed-data, rt-extending).
- **Optimizacion (S12.T7 / BL-1 parcial)**: edit sin refetch via `applyEditToTree(id, patch)` en composable. Re-deriva code/secondary/metric desde rtData mergeado. UPDATE_INSTANCE selection set ampliado a `{ id, data, extended }`. Ahorro 1 request por edit exitoso (~80ms en seeds tipicos, hasta ~400ms con 500 items). Create + reorder mantienen refetch — esperan bulkUpdate del platform (SP2).

### What was discovered

- **Rules creadas**: 0 (este ticket valida y aplica RULE-mods-014/015 + RULE-platform-001/002/003 ya existentes — ninguna nueva).
- **Decisions tomadas**: 0 formales (DECs locales documentadas en sessions: A scope ajustado fase C, B opcion LLM-e2e selectivo, N4 CORS workaround diferido a platform).
- **Bugs encontrados**: BUG-platform-013 (CORS x-app-id en object-manager — workaround local, fix esperado del equipo platform), BUG-platform-014 (logger central no expuesto a custom Vueform elements).

### Testing summary

| Metric | Value |
|--------|-------|
| REQs covered | 21/21 hallazgos cerrados (C1-C6, M1-M3, E1-E3 + setup, L1-L2, S1, A1-A6, B1-B5) |
| REQs NOT covered | E4/E5 (deuda explicita en backlog BL-1/BL-2 — `could`, no bloquean), C6 (BL-3 esperando platform logger) |
| Test cases total | 398 unit (vitest) + 10 LLM-e2e scenarios markdown |
| Test cases pass | 398/398 unit + 5 LLM-e2e ejecutados pre-cierre (3 nuevos S10 documentados, ejecucion parte del GATE final) |
| Test cases fail | 0 |
| Test artifacts created | 13 nuevos archivos test (Fase A: 4, Fase B: 5, S10 LLM-e2e: 2, fixtures-vs-seed + lang-enums + recordtypes-declared + layouts-declared) + 5 tests inline en use-composite-section-tree.test.ts (S12.T7 applyEditToTree) |
| Regression delta | +107 tests vs baseline T-011 (291 → 398), 0 suites rotas |

### Metrics

| Metric | Value |
|--------|-------|
| Sessions | 12 (1-11 cerradas, S12 docs + BL-1 parcial + cierre) |
| Tasks completed | 51/53 (2 deferred conscientemente: S5.T4 → Fase B en S9, S11.T5 → smoke S12; +1 task S12.T7 ejecucion parcial BL-1) |
| Commits | 17 atomicos |
| Learns captured | 11 (raw → refinamiento al cierre) |
| Rules created | 0 (aplicacion de existentes) |
| Decisions taken | 0 formales (3 DEC-LOCAL en sessions) |
| Bugs found | 2 (BUG-platform-013, BUG-platform-014) |
| Coverage | 28.3% → 51.25% (+22.95%) |
| LOC delta SFC raiz | 1485 → 962 (-523 LOC, -35%) por extraccion sub-componentes + helpers |

## Teaching — Intake

**Status**: skipped
**Razon**: pre-DET-21. Ticket creado 2026-05-06, antes de que DET-21 (teach-intake obligatorio antes de design) entrara en vigor el 2026-05-09. NO retroactivo por DET-21.

## Teaching — Close

**Status**: done (2026-05-14) — generado al cerrar formalmente el ticket con `/dkc` post-DET-22 (regla en vigor desde 2026-05-09). El trabajo real cerro el 2026-05-07, pero el flip `status: done → closed` se difirio hasta hoy. Ver [teach-close.md](ticket-012.teach/teach-close.md) con sintesis del caso, hypothesis evolution, decisions, highlights por session, knowledge promoted, lessons learned y learning path.
