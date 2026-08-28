---
id: SPEC-curriculum-design-002-wcag-aa-implementation
project: up1
ticket: TICKET-022
status: done
---

# Implementar WCAG 2.1 AA en componentes visibles del mod curriculum-design

# Implementar WCAG 2.1 AA en componentes visibles del mod curriculum-design

## Executive summary — lo que estas aprobando

**Que se quiere**: convertir el mod curriculum-design en un componente accesible WCAG 2.1 AA. Hoy un usuario solo-teclado o con screen reader NO puede operar el `composite-section-tree` ni el `View modal` de forma equivalente a un usuario con mouse. Este ticket cubre 22 de los 32 findings del audit (TICKET-021), agrupados en 4 sessions de criticidad creciente: aditivos ARIA + reduced-motion (S1), behavioral seguros con ESC/focus trap/form feedback (S2), keyboard navigation del tree con roving tabindex (S3), y keyboard drag-n-drop reorder (S4).

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Plan completo de 4 sessions (S1-S4) — incluye keyboard drag-n-drop (S4) que es AAA, no solo AA | Hace el componente totalmente operable sin mouse, pero suma ~2h. Alternativa: postergar S4 a ticket separado |
| 2 | Verificacion via tests unit + LLM-e2e existentes en cada GATE (sin Storybook a11y addon como tooling extra) | Mantiene el patron del mod establecido en TICKET-011. Sin tooling automatizado extra: si emerge regresion futura, se detecta cuando alguien la vea, no automatico |
| 3 | El modal casero de `CompositeSectionView` recibe role=dialog+aria-modal MANUAL (no migra a Modal molecule) | Migrar requiere resolver BUG-platform-011 (fuera de scope). El workaround manual cumple AA pero deja la dualidad: tree usa Modal molecule (Element.vue) + View usa modal casero. Documentar como deuda tecnica |
| 4 | Patron WAI-ARIA Tree (roving tabindex + Arrow keys) implementado custom (sin libreria externa) | Vue ecosystem no tiene libreria tree-a11y standard. Implementar custom con composable `useTreeKeyboardNav` es ~30-60min vs evaluar/incorporar libreria externa. Mantiene control |

**Riesgos principales y como los mitigamos**:

- **Roving tabindex cambia tabstops** → S3 con gate ⚑ fuerte + scenario LLM-e2e nuevo + validacion manual del dev antes de avanzar a S4
- **Keyboard drag-n-drop puede no integrar bien con SortableJS** → S4 implementacion custom (no plugin), emite el mismo event que mouse drag — el handler del reorder no cambia
- **Atomos del design system podrian no cumplir su parte** → audit verifica via render real durante S1.T11 si el atom Input genera `<label for>` correcto. Si falla, escalar a platform (queda como decision local)
- **prefers-reduced-motion puede romper Sortable animations** → S1.T5 incluye condicional para pasar `animation:0` a Sortable cuando matchMedia detecta reduced — fallback funcional

**Que NO se hace en este ticket**:
- Contraste de tokens con axe runtime (sin tooling, postergado a ticket dedicado)
- Validacion formal de atoms del design system platform UP1 (coordinacion separada)
- BUG-platform-011 (Modal molecule a Vueform custom) — fuera del mod
- `<dl><dt><dd>` semantica en View modal (mid finding, beneficio low)
- Migracion px→rem para zoom (marginal AA)

**Tamano estimado**: 4 sessions ejecutables, ~9-10h efectivas distribuidas. **S3 es la mas riesgosa** (cambia tabstops del tree).

**Como vas a saber que funciona**:
- Abro un programa con tree poblado, navego solo con teclado: Tab entra al tree, Arrow keys mueven entre nodos, Enter abre detail modal, ESC lo cierra, focus vuelve al nodo
- Abro modal create, hago submit sin completar — veo mensaje de error visible + focus al input + screen reader anuncia
- Activo "Reduce motion" en el OS — los hover transitions desaparecen, drag mantiene funcional pero sin animation
- Reordeno componentes con Shift+ArrowDown y verifico que persiste tras reload

---

## Purpose

Llevar los componentes visibles del mod curriculum-design a WCAG 2.1 AA. Esto desbloquea el uso del mod en instituciones con requisitos de accesibilidad (universidades publicas, regulaciones locales) y reduce la deuda tecnica documentada en TICKET-021 (32 findings) cubriendo el 70% de los gaps en un sprint coordinado. No se introducen pantallas ni datos nuevos — solo se extiende la semantica, comportamiento de teclado y CSS de los componentes existentes.

## Requirements

### REQ-A11Y-01: Semantica ARIA correcta en componentes visibles

El sistema MUST exponer correctamente la estructura semantica de los componentes via atributos ARIA conforme a WAI-ARIA Authoring Practices Guide.

**Actor**: user (todos), especialmente screen reader users.
**Layers**: frontend.

#### Scenarios
- Tree poblado → `[role="tree"]` con `[role="treeitem"]` por nodo, `aria-level`, `aria-expanded` (cuando hasChildren), `aria-setsize`, `aria-posinset`. Children container `[role="group"]`.
- View modal → `[role="dialog"]` + `aria-modal="true"` + `aria-labelledby` apuntando al titulo.
- Form en modal → `<form aria-labelledby="...">` apuntando al titulo del modal padre.
- Container raiz `.cst-card` → `[role="region"]` + `aria-labelledby` al Heading.
- RichTextRenderer → `[role="region"]` + `aria-label` que describe el contexto (ej. "Contenido formateado de Seccion X").

#### Acceptance
**Verificable**: con NVDA/VoiceOver en una instancia poblada, el screen reader anuncia "Tree, X items" al entrar, "tree item, level N, expanded" al navegar.

### REQ-A11Y-02: Dialog pattern completo en CompositeSectionView

El sistema MUST cumplir [WAI-ARIA Dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) en el modal casero de detalle: `Escape` cierra, focus trap impide tab fuera, focus se mueve al modal al abrir y se restaura al elemento previo al cerrar.

#### Scenarios
- Abrir view modal con click en nombre → focus al close button (o titulo si tabindex=-1)
- Tab dentro del modal → cycla entre interactive elements del modal, NO escapa
- Escape → modal cierra, focus restaurado al nombre clickable
- Click en backdrop → mismo cierre + restoration

#### Acceptance
**Verificable**: keyboard-only navigation completa del flujo open/operate/close/restore funciona en menos de 5 tab cycles.

### REQ-A11Y-03: Form feedback accesible al submit invalido

El sistema MUST comunicar errores de validacion del form al usuario (visual + screen reader) y mover focus al primer input invalido.

#### Scenarios
- Submit con name vacio → `aria-invalid="true"` en el input + mensaje visible con `role="alert"` + focus al input
- saveError tras mutation fallida → renderizado dentro de `role="alert"` (live region) que anuncia automatico

#### Acceptance
**Verificable**: NVDA anuncia "El nombre es requerido" al submit empty sin mover el cursor manualmente.

### REQ-A11Y-04: Navegacion del tree por teclado

El sistema MUST implementar el patron [WAI-ARIA Tree View keyboard interaction](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/#keyboardinteraction): roving tabindex + Arrow keys + Home/End + Enter/Space.

#### Scenarios
- Tab desde fuera entra al tree (al treeitem actualmente activo, NOT al primero siempre — recuerda ultimo)
- ArrowDown → siguiente nodo visible (puede ser child del expandido o siguiente sibling)
- ArrowUp → previo nodo visible
- ArrowRight → expande si collapsed con children; si expanded mueve al primer child; si leaf no-op
- ArrowLeft → colapsa si expanded con children; si collapsed o leaf mueve al parent
- Home → primer treeitem visible
- End → ultimo treeitem visible
- Enter o Space sobre nombre → abre view modal (delega al onClick existente)

#### Acceptance
**Verificable**: dev recorre tree de 8 nodos del seed UV usando solo teclado, llega a cualquier nodo en <8 keystrokes.

### REQ-A11Y-05: Reorder siblings por teclado (Shift+Arrow)

El sistema MUST permitir reordenar nodos siblings sin mouse, emitiendo el mismo evento que el drag-n-drop por mouse.

#### Scenarios
- Treeitem focuseado + Shift+ArrowDown → mueve la posicion del nodo una abajo entre siblings, dispara mutation server-side igual que mouse drag
- Shift+ArrowUp → idem hacia arriba
- Boundary: primer sibling + Shift+ArrowUp → no-op (no wrap)
- Escape durante reorder en progreso → cancela (si se implementa preview optimistico, lo revierte)

#### Acceptance
**Verificable**: dev mueve un EvaluationComponent de posicion 3 a 1 con dos Shift+ArrowUp, recarga la pagina y la posicion persiste.

### REQ-A11Y-06: prefers-reduced-motion respetado

El sistema MUST reducir animaciones y transiciones cuando el sistema operativo indica `prefers-reduced-motion: reduce`.

#### Scenarios
- OS con motion reducido → hover transitions 0ms (en lugar de 0.15s), Sortable animation 0ms
- Funcionalidad drag-n-drop mantiene operativa (sin animation pero con feedback visual instantaneo)

#### Acceptance
**Verificable**: macOS System Settings > Accessibility > Display > Reduce motion ON → hover sobre nodo es instantaneo, Sortable drag se mueve sin transition.

### REQ-REGRESSION-01: Cero cambio en funcionalidad existente

El sistema MUST preservar 100% del comportamiento existente:
- Tree poblado renderiza con todos los nodos, badges, metrics, drag handles
- Edit modal abre, permite editar y guarda
- View modal abre y muestra detalle correcto
- Mouse drag-n-drop reorder funciona
- Weighted sum validation marca padres invalidos
- Truncation warning cuando tree > 500 items

**Actor**: user.
**Layers**: frontend.

#### Acceptance
**Verificable**: 5 scenarios LLM-e2e existentes (detail-uv-evaluation-tree, edit-evaluation-tree-weight, reorder-evaluation-components, create-section-flow, detail-uv-modality-tab) siguen passing sin modificacion + Storybook stories renderean igual.

## Tasks

> Plan de sessions DET-20: 4 sessions cubriendo aditivos (S1), behavioral seguros (S2), keyboard nav (S3), keyboard drag (S4).

### Session 1 — Aditivos ARIA + reduced-motion + focus-visible [tipo: auto] [tier: T2]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S1.T1 | Container raiz `.cst-card` recibe `role="region"` + `aria-labelledby="cst-region-{id}"` + Heading con id correspondiente | developer | — | CompositeSectionTreeElement.vue | DET-5, DET-8 | render no rompe + atributo presente | pending | 1 |
| S1.T2 | Tree poblado: `role="tree"` en `.cst-card__roots`, `role="treeitem"` + `aria-level/expanded/setsize/posinset` en cada row, `role="group"` en children container. Pasar siblings count + posicion via props desde CompositeSectionTreeElement a CompositeSectionNode | developer | S1.T1 | CompositeSectionTreeElement.vue, CompositeSectionNode.ts | DET-5, DET-8 | tests unit aria-attrs.test.ts assertean atributos. Storybook renderiza igual | pending | 1 |
| S1.T3 | Modal casero View recibe `role="dialog"` + `aria-modal="true"` + `aria-labelledby="cst-view-title-{id}"`. Titulo h5 con id correspondiente | developer | — | CompositeSectionView.ts | DET-5, DET-8 | unit test asserts atributos en open modal | pending | 1 |
| S1.T4 | Name clickable (`cst-node__name--clickable`) recibe `aria-haspopup="dialog"`. Tambien `aria-controls` apuntando al id del modal cuando abierto | developer | S1.T3 | CompositeSectionNode.ts | DET-5, DET-8 | unit test asserts | pending | 1 |
| S1.T5 | `@media (prefers-reduced-motion: reduce)` override en CSS del SFC: anula transiciones y `animation`. Tambien pasar `animation: 0` a Sortable.create cuando `matchMedia('(prefers-reduced-motion: reduce)').matches` | developer | — | CompositeSectionTreeElement.vue (style block + setup) | DET-5, DET-8 | manual: OS con reduced motion → hover instantaneo. Sortable mantiene drag pero sin animation | pending | 1 |
| S1.T6 | `:focus-visible` styling explicito para `.cst-node__row`, `.cst-node__drag-handle`, `.cst-node__name--clickable`, `.cst-node__toggle`. Outline solido 2px usando `--up1-color-primary` | developer | — | CompositeSectionTreeElement.vue (style) | DET-5, DET-8 | manual: keyboard tab muestra outline visible y consistente | pending | 1 |
| S1.T7 | RichTextRendererElement.vue: `role="region"` + nueva prop `ariaLabel` (con fallback al i18n key default `richTextRenderer.label`) | developer | — | RichTextRendererElement.vue, lang/es_CL.json | DET-5, DET-8 | unit + Storybook story renderiza con/sin prop | pending | 1 |
| S1.T8 | sanitize-html config: agregar `target="_blank"` + `rel="noopener noreferrer"` a `<a>` tags. Considerar aria-label hint si href es externo (host distinto) | developer | — | sanitizeHtml.ts | DET-5, DET-8 | unit test sanitize-html.test.ts: links sanitizan con atributos correctos | pending | 1 |
| S1.T9 | Drag handle padding aumentado a 24x24 minimo (touch target). `.cst-node__actions` cambio `opacity:0` por `visibility:hidden` + `:focus-within { visibility: visible }` para que actions sean keyboard-reachable | developer | — | CompositeSectionTreeElement.vue (style) | DET-5, DET-8 | manual: focus en row revela actions sin hover | pending | 1 |
| S1.T10 | Badges (code + secondaryLabel) reciben `aria-label` rico: `aria-label="Codigo: NF"` y `aria-label="Tipo: Sumativa"`. Mediante atributos en el `<Badge>` atom si lo soporta, sino `<span aria-hidden> + <span class="sr-only">` | developer | — | CompositeSectionNode.ts, CompositeSectionView.ts | DET-5, DET-8 | unit asserts label + manual screen reader test | pending | 1 |
| S1.T11 | Tests unit del mod: `aria-attrs.test.ts` cubre TC1-TC4. Verificar suite completa sigue verde: `npm test --workspace=@uplanner/curriculum-design`. Si algun test existente falla por snapshot change, actualizar baseline y registrar en gate. Re-sync con `npm run sync --workspace=@uplanner/layout-engine` | developer | S1.T1..T10 | tests/__tests__/aria-attrs.test.ts | DET-7, DET-8 | npm test verde, snapshots updated o passing | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions` del ticket: archivos cambiados, tests verdes, coverage delta. Auto-continue si suite del mod verde + LLM-e2e regression (5 scenarios existentes) passing + Storybook stories renderean igual | reviewer | S1.T1..T11 | ticket | DET-20, DET-13 | gate persistido + tests verdes + regression cero | pending | 1 |

### Session 2 — Behavioral seguros: ESC + focus trap + form feedback [tipo: auto] [tier: T2]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S2.T1 | CompositeSectionView: handler `onKeydown` global del backdrop captura `Escape` → emit('close'). Tambien al mount: capturar `previousActiveElement = document.activeElement` y al close emit-`close`, restaurar focus en parent. Para esto exportar evento o usar `nextTick` post-close | developer | S1.GATE | CompositeSectionView.ts, CompositeSectionTreeElement.vue (closeView handler) | DET-5, DET-8, DET-10 | unit test dialog-behavior.test.ts: ESC dispara close, focus restaurado | pending | 2 |
| S2.T2 | Focus trap simple en CompositeSectionView: queryAll(focusable selectors) en el modal, capture Tab/Shift+Tab y wrap. Al mount: focus al close button automatico | developer | S2.T1 | CompositeSectionView.ts | DET-5, DET-8 | unit test asserts wrap correcto | pending | 2 |
| S2.T3 | CompositeSectionForm submit invalid: si `form.name.trim() === ''` → setear `nameError = ref(t('compositeSectionTree.form.errors.nameRequired'))`. Pasar como prop al Input atom (`error` o `aria-invalid` segun el atom). Mover focus al input invalido. Renderizar mensaje en `<Alert>` con `role="alert"` (live region) | developer | S1.GATE | CompositeSectionForm.ts, lang/es_CL.json | DET-5, DET-7, DET-8 | unit test form-feedback.test.ts: submit empty muestra error + focus | pending | 2 |
| S2.T4 | saveError visualization: si el atom `Alert` ya tiene `role="alert"` aria-live, OK. Si no, wrappear: `h('div', { role: 'alert', 'aria-live': 'assertive' }, [Alert])`. Verificar via inspect del atom | developer | — | CompositeSectionForm.ts | DET-5, DET-8 | manual: NVDA anuncia el saveError sin click | pending | 2 |
| S2.T5 | Tests unit nuevos: `dialog-behavior.test.ts` (TC5-TC8), `form-feedback.test.ts` (TC9-TC10). Re-run LLM-e2e existentes (5 scenarios) para regression. Re-sync | developer | S2.T1..T4 | tests/__tests__/ | DET-7 | npm test verde + LLM-e2e passing | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — tests verdes + 5 scenarios LLM-e2e existentes passing + repro manual de ESC close + submit empty + focus restore | reviewer | S2.T1..T5 | ticket | DET-20, DET-13 | gate persistido + behavior verificado | pending | 2 |

### Session 3 — Keyboard navigation del tree [tipo: ⚑ fuerte] [tier: T3]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S3.T1 | Composable nuevo `useTreeKeyboardNav.ts`: maneja `focusedIndex` (ref<string \| null>), flat list de visible nodes (computed que considera expanded state), handlers `handleArrowDown/Up/Right/Left/Home/End/Enter`. Retorna `tabindexFor(nodeId)` y handlers | developer | S2.GATE | useTreeKeyboardNav.ts (NEW) | DET-1, DET-2, DET-5, DET-8 | unit test useTreeKeyboardNav.test.ts: cada handler con scenario | pending | 3 |
| S3.T2 | Aplicar roving tabindex: CompositeSectionNode recibe `isFocused: boolean` prop, aplica `tabindex={isFocused ? 0 : -1}` al row. CompositeSectionTreeElement instancia el composable y propaga | developer | S3.T1 | CompositeSectionTreeElement.vue, CompositeSectionNode.ts | DET-5, DET-8 | unit: solo 1 treeitem con tabindex=0 en cualquier momento | pending | 3 |
| S3.T3 | ArrowDown/Up: mueven focus al sibling/cousin visible. ArrowDown desde expanded mueve al primer child, sino al siguiente sibling, sino al siguiente sibling del parent. ArrowUp inverso. Caso edge: ultimo nodo + ArrowDown = no-op | developer | S3.T2 | useTreeKeyboardNav.ts, CompositeSectionTreeElement.vue (onKeydown handler) | DET-5, DET-8 | unit + manual con UV seed | pending | 3 |
| S3.T4 | ArrowRight/Left: expande/colapsa o sube a parent. Right en leaf = no-op. Left en root collapsed = no-op | developer | S3.T2 | useTreeKeyboardNav.ts | DET-5, DET-8 | unit + manual | pending | 3 |
| S3.T5 | Home/End: focus al primer/ultimo treeitem visible. Enter/Space sobre name dispara onClick (view modal). F2 opcional para abrir edit modal (DECISION-LOCAL: implementar o postergar) | developer | S3.T2 | useTreeKeyboardNav.ts, CompositeSectionNode.ts | DET-5, DET-8 | unit + manual | pending | 3 |
| S3.T6 | Tests unit del composable cubren TC11-TC15. Crear scenario LLM-e2e nuevo `keyboard-nav-tree.md`: precondicion UV seed, navegar 8 nodos con ArrowDown desde root, Home, End, ArrowRight para expandir Q1, ArrowLeft para colapsar Nota Final, Enter para abrir view modal, ESC para cerrar. Screenshots before/after de cada paso clave | developer | S3.T1..T5 | tests/llm-e2e/scenarios/keyboard-nav-tree.md, tests/__tests__/useTreeKeyboardNav.test.ts | DET-7, DET-8 | unit verde + scenario passing + 5 scenarios existentes regression OK | pending | 3 |
| S3.T7 | Actualizar `docs/guides/composite-section-tree.md` con seccion "Keyboard navigation": lista keys + ejemplos. Decision UX: el patron implementado, alternativas descartadas | scribe/developer | S3.T6 | docs/guides/composite-section-tree.md | DET-16 | doc actualizado | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** — ⚑ fuerte: dev valida MANUALMENTE keyboard nav con teclado real durante ~10min. Decision: (a) continue a S4, (b) iterate si UX siente raro, (c) escalate si conflicto con atajos del browser/SO. Decision tambien: promover patron a `RULE-curriculum-design-001` (Custom Vueform compuestos DEBEN seguir WAI-ARIA APG) o quedar como DEC-LOCAL | reviewer | S3.T1..T7 | ticket, rules/curriculum-design/ | DET-20, DET-13, DET-14, DET-16 | gate persistido + decision UX + decision rule | pending | 3 |

### Session 4 — Keyboard drag-n-drop reorder [tipo: ⚑ fuerte] [tier: T3]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S4.T1 | Extender `useTreeKeyboardNav`: detectar `Shift+ArrowUp/Down` sobre treeitem focuseado. Determinar siblings y posicion actual. Si reorder posible (no boundary), emit `reorder-by-keyboard` con `{ parentId, oldIndex, newIndex }` (mismo shape que mouse drag) | developer | S3.GATE | useTreeKeyboardNav.ts | DET-5, DET-8 | unit asserts emit con payload correcto | pending | 4 |
| S4.T2 | CompositeSectionTreeElement: handler `reorder-by-keyboard` llama al MISMO `onReorder` que mouse drag (handler unico). Asegura que la mutation y refetch son identicas | developer | S4.T1 | CompositeSectionTreeElement.vue | DET-5, DET-8, DET-11 | unit: handler unico para ambos events | pending | 4 |
| S4.T3 | Visual feedback durante reorder: aplicar clase `.cst-node__row--keyboard-moving` por ~200ms al nodo movido (subtle highlight). Skip si `prefers-reduced-motion` | developer | S4.T2 | CompositeSectionTreeElement.vue (style), CompositeSectionNode.ts | DET-5, DET-8 | manual: visible pulse en el row movido | pending | 4 |
| S4.T4 | ANNUNCE via `aria-live`: agregar live region invisible al SFC raiz que anuncia "Nodo movido de posicion N a M de K" para screen reader feedback. Resetear text post-1s | developer | S4.T2 | CompositeSectionTreeElement.vue | DET-5, DET-8 | manual NVDA: oye el anuncio post-reorder | pending | 4 |
| S4.T5 | Tests unit (TC16-TC18 unit-able parts) + scenario LLM-e2e nuevo `keyboard-drag-reorder.md`: precondicion UV seed, focus Q1, Shift+ArrowDown 3 veces, verificar posicion cambiada, reload, verificar persistencia. Regression run 5 scenarios existentes incluyendo `reorder-evaluation-components.md` (mouse drag debe seguir funcional) | developer | S4.T1..T4 | tests/llm-e2e/scenarios/keyboard-drag-reorder.md, tests/__tests__/ | DET-7, DET-8 | unit + scenario nuevo + scenarios existentes regression OK + 0 regresion en mouse drag | pending | 4 |
| S4.T6 | Actualizar `docs/guides/composite-section-tree.md` con seccion "Keyboard reorder". Decision rule: si en S3.GATE se promovio patron tree a RULE-curriculum-design-001, agregar requirement de keyboard reorder. Si quedo como DEC-LOCAL en S3, hacer lo mismo en S4 | scribe/developer | S4.T5 | docs/guides/composite-section-tree.md, rules/ | DET-16 | doc + rule actualizados | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T3)** — ⚑ fuerte: dev valida MANUALMENTE keyboard reorder + verifica mouse drag intacto. Decision final: ticket listo para `request-close` (DET-22 → teach-close → status: closed) | reviewer | S4.T1..T6 | ticket | DET-20, DET-13, DET-14 | gate persistido + acceptance checkpoints firmados | pending | 4 |

### Task contract — ejemplos criticos

```
Task S3.T1: Composable useTreeKeyboardNav
- source_ref: REQ-A11Y-04
- agent: developer
- files: useTreeKeyboardNav.ts (NEW)
- precondition: S2.GATE cerrado. tree estructura conocida (CompositeNode type)
- expected_output: composable exporta { focusedIndex, tabindexFor, handleArrowDown, ..., handleHome, handleEnd }
- validation: unit tests con flatten tree fixture, cada handler con N scenarios. Coverage 100% del composable
- rollback: composable es archivo nuevo aislado. git rm del archivo + unwire desde Element.vue
- rules: [DET-1, DET-2, DET-5, DET-8]
```

```
Task S4.T2: Handler unico mouse + keyboard reorder
- source_ref: REQ-A11Y-05
- agent: developer
- files: CompositeSectionTreeElement.vue (onReorder)
- precondition: S4.T1 (composable emite event correcto)
- expected_output: el `onReorder` existente (de mouse drag) maneja ambos events sin distinguir origen
- validation: scenario `reorder-evaluation-components.md` (mouse) + `keyboard-drag-reorder.md` (keyboard) both passing con cero codigo duplicado
- rollback: git revert del cambio en onReorder
- rules: [DET-5, DET-8, DET-11]
```

## Constraints

- **DET-3 (immutability del request)**: el request del ticket NO se reescribe. Nuevos hallazgos van a Triage del ticket o sessions ejecutadas.
- **DET-5 (verificacion multi-capa)**: ARIA attributes (frontend) + keyboard handlers (frontend) + Sortable integration (frontend) + reduced-motion (CSS + JS feature detect).
- **DET-7 (regression obligatoria)**: 5 scenarios LLM-e2e existentes deben seguir verdes en cada GATE.
- **DET-8 (rollback documentado)**: cada task con cambio de comportamiento tiene rollback definido. Cambios aditivos S1 son git revert trivial. S2/S3/S4 lo mismo, archivos aislados.
- **DET-10 (limites por rol)**: developer no expande scope. Si S3 o S4 emerge complejidad mayor (ej. tree gigante requiere virtualizacion), escalate en gate. No silently agregar trabajo.
- **DET-11 (KB-first)**: rules consultadas — ninguna a11y en `rules/curriculum-design/`. WAI-ARIA APG es fuente externa autoritativa.
- **DET-16 (propagacion)**: cambios al SFC tocan stories, docs, tests. Cobertura en S3.T7 + S4.T6.
- **DET-19 (external id en repo)**: branch `UPONE-1038-a11y-wcag-aa-curriculum-design`, commits con prefijo.
- **DET-20 (sessions + gates)**: 4 sessions documentadas. Gates auto en S1/S2, ⚑ fuerte en S3/S4.
- **DET-22 (teach-close)**: request-close producira `tickets/TICKET-022.teach/teach-close.md`.
- **Global rule**: NO modificar archivos fuera de `mods/curriculum-design/`. Atoms del design system → coordinacion separada.
- **Memoria `feedback_llm_e2e_approach`**: LLM-e2e con chrome-devtools MCP es el patron del modulo.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| SortableJS 1.15 | internal-lib | Mouse drag existente. S4 agrega keyboard sin tocar Sortable API | bajo |
| Atoms del design system (Input, Modal, Button, Alert) | internal-platform | Asumimos a11y correcta. Si fallan en S2.T4 (Alert con role=alert) o S1.T1 (Heading id), hay que reportar | medio-bajo |
| WAI-ARIA APG specs | external-spec | Patrones tree-view y dialog-modal | nulo |
| chrome-devtools MCP | internal-tool | Scenarios LLM-e2e | nulo |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Roving tabindex confunde a usuarios existentes acostumbrados a Tab tradicional | low | medium | S3.GATE ⚑ fuerte con validacion manual del dev. Si UX rara, iterate antes de S4 |
| `prefers-reduced-motion` rompe drag-n-drop visual feedback | very low | low | S1.T5 testea explicitamente Sortable con motion reducido — feedback minimal pero funcional |
| Atom Input no genera `<label for>` correcto y rompe C2 | low | high | S2.T3 verifica al implementar. Si falla, escalate (issue platform UP1) y workaround via aria-labelledby manual |
| Tests existentes fallan por cambios de snapshot (ARIA attrs nuevos) | medium | low | Esperado. Update baselines en S1.T11 con review explicit del diff |
| Keyboard drag-n-drop tiene edge cases en niveles anidados | medium | medium | S4.T5 scenario explicito con tree multi-nivel + unit tests con fixture jerarquico |
| Scope creep: emerge necesidad de keyboard nav del modal | low | low | Out-of-scope explicito. Si emerge, ticket aparte. No silently |

## Open questions

- [ ] **Implementar F2 para entrar a edit mode?** WAI-ARIA APG sugiere F2 como atajo para edit-in-place. No es estandar en tree views editables. Decidir en S3.T5 si vale la inversion (~20min)
- [ ] **`aria-label` rico en badges via Badge atom soporta o necesita wrap?** S1.T10 lo decide al implementar — si el atom acepta `aria-label` prop, simple. Sino, wrap.
- [ ] **Rule de mod o decision local para el patron WAI-ARIA Tree?** S3.GATE / S4.T6 decide. Recomendacion: rule formal, justifica futuro custom Vueform component que use tree pattern (LearningOutcome es candidato anticipado en H7 del audit)

## Decisions

### DEC-LOCAL-01: Plan completo S1+S2+S3+S4 incluyendo keyboard drag

- **Contexto**: 32 findings del audit, evaluar scope inicial
- **Drivers**: cumplimiento AA completo (high), tiempo invertido (mid)
- **Opcion elegida**: 4 sessions completas (~9-10h)
- **Alternativas**: solo aditivos (S1, ~3h), o conservador (S1+S2, ~4.5h)
- **Consecuencias**: ticket largo pero cubre 22 de 32 findings (~70%) de una vez
- **Session**: intake

### DEC-LOCAL-02: Modal casero recibe ARIA dialog manual (no migra a Modal molecule)

- **Contexto**: View modal usa modal casero por BUG-platform-011
- **Drivers**: scope acotado al mod (high), evitar dependencia bloqueada (high)
- **Opcion elegida**: agregar role=dialog + aria-modal + aria-labelledby + focus trap manual
- **Alternativas**: esperar resolucion BUG-platform-011 (sin ETA), o forzar migracion (rompe el workaround)
- **Consecuencias**: dualidad de patrones modal en el mod (Modal molecule en Edit del Element.vue + casero en View). Documentar como deuda
- **Session**: intake

### DEC-LOCAL-03: Composable custom `useTreeKeyboardNav` (no libreria externa)

- **Contexto**: como implementar WAI-ARIA Tree keyboard pattern
- **Drivers**: control (high), no introducir dependencia nueva (high), simplicidad (mid)
- **Opcion elegida**: composable custom en TS puro
- **Alternativas**: evaluar `@vueuse/integrations` o libreria tree-a11y especifica
- **Consecuencias**: ~30-60min de implementacion + maintenance propio. Mas trabajo que `pnpm add` pero independiente
- **Session**: intake

## Success metrics

> Componentes a11y son medibles via auditorias periodicas, no metrica de negocio. Opcional para improvements.

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Findings WCAG 2.1 AA en mod | 13 high + 13 mid | 0 high + ~5 mid (los postergados out-of-scope) | Re-audit estatico post-cierre. Idealmente runtime con axe |
| Operabilidad por teclado del tree | 0/8 nodos | 8/8 nodos en <8 keystrokes | Manual test |

## Technical reference

- **WAI-ARIA Tree pattern**: [https://www.w3.org/WAI/ARIA/apg/patterns/treeview/](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)
- **WAI-ARIA Dialog pattern**: [https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- **WCAG 2.1 quick reference**: [https://www.w3.org/WAI/WCAG21/quickref/](https://www.w3.org/WAI/WCAG21/quickref/)
- **prefers-reduced-motion MDN**: [https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- **Roving tabindex pattern**: [https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_roving_tabindex](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_roving_tabindex)
- **Audit base**: [TICKET-021](../../tickets/ticket-021.md) (32 findings con SC + linea + recomendacion)

## Acceptance checkpoints

- [ ] **Funcional**: TC1-TC19 cubren los 6 REQ-A11Y-XX. Todos passing
- [ ] **Tests**: vitest unit + integration verde, 2 scenarios LLM-e2e nuevos passing
- [ ] **Regression**: 5 scenarios LLM-e2e existentes passing sin modificacion
- [ ] **NFRs**: no aplica (no performance/availability changes)
- [ ] **Rules**: si S3.GATE promovio el patron, `RULE-curriculum-design-001` creada
- [ ] **Docs**: `composite-section-tree.md` actualizado con keyboard sections
- [ ] **Cleanup**: branch local mergeada (o pendiente PR) + working tree limpio
