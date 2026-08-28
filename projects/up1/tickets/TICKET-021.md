---
id: TICKET-021
project: up1
type: ticket
status: closed
work_type: explore
external: UPONE-1038
module: curriculum-design
autopilot: manual
---

# Audit WCAG 2.1 AA de componentes visibles del mod curriculum-design

## Request

Revisar los componentes que creamos en el mod curriculum-design y verificar si cumplen accesibilidad WCAG 2.1 nivel AA. Auditar todo lo visible para el usuario final: SFCs principales (CompositeSectionTreeElement.vue, RichTextRendererElement.vue) y sub-componentes inline con render functions (CompositeSectionNode.ts, CompositeSectionForm.ts, CompositeSectionView.ts), incluyendo CSS / design tokens utilizados. Producir lista de findings agrupados por componente y severidad, con recomendaciones concretas de remediacion. El output queda en este ticket como exploracion previa a decidir si se invierte en mejorar a11y antes de produccion o se hace en un sprint posterior.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | explore |
| Tipo de cambio | audit (no se modifica codigo) |
| Modulo principal | curriculum-design |
| Modulos afectados | mods/curriculum-design (analisis sobre 5 archivos visibles al usuario) |
| creates_visual | false |
| creates_data | false |

## Methodology

**Target**: WCAG 2.1 nivel AA (incluye Principle 1 Perceivable, 2 Operable, 3 Understandable, 4 Robust). AAA noted cuando aparece pero no se evalua como bloqueante.

**Scope analizado** (archivos visibles al usuario):

1. [`CompositeSectionTreeElement.vue`](../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue) — SFC raiz del custom Vueform element (1004 lineas).
2. [`CompositeSectionNode.ts`](../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionNode.ts) — render function de cada fila del arbol (220 lineas).
3. [`CompositeSectionForm.ts`](../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionForm.ts) — render function del form en el modal create/edit (152 lineas).
4. [`CompositeSectionView.ts`](../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionView.ts) — render function del modal read-only de detalle (112 lineas).
5. [`RichTextRendererElement.vue`](../../uplanner/up1/mods/curriculum-design/modsComponents/RichTextRenderer/RichTextRendererElement.vue) — SFC del renderer HTML sanitizado.

**Tecnica**: lectura estatica + cross-check de cada archivo contra los Success Criteria de WCAG 2.1 AA. NO se ejecuto axe-core ni lighthouse en runtime (eso queda como recommendation S1.followup). Las dependencias en atoms del design system (Input, Textarea, Modal, Button, etc.) se asumen correctas a nivel a11y — sus fallos eventuales se anotan como riesgo, no como finding de este audit.

**Severidades**:
- **High**: bloquea WCAG 2.1 AA. Usuario con screen reader o solo-teclado no puede operar el componente.
- **Mid**: cumple AA marginal pero limita la experiencia. Usuario afectado puede operar con dificultad.
- **Low / Info**: mejora opcional (mayoria AAA o best-practice).

## Triage

### Findings agrupados por componente

#### A. CompositeSectionTreeElement.vue — SFC raiz

| ID | Severidad | Success Criterion | Finding | Linea (aprox) | Recomendacion |
|----|-----------|-------------------|---------|---------------|---------------|
| A1 | **HIGH** | WCAG 4.1.2 Name, Role, Value | El container raiz `.cst-card` no declara `role` ni `aria-labelledby`. Screen reader al llegar via tab no anuncia que es un widget compuesto (arbol). El `<Heading>` interno SI esta declarado pero NO esta conectado al container | 44 | Agregar `role="region"` + `aria-labelledby="cst-heading-{uniqueId}"` al `.cst-card`, e `id` al Heading. O usar `role="tree"` directamente cuando aplique al tree poblado |
| A2 | **HIGH** | WCAG 1.3.1 Info and Relationships + 4.1.2 | El container del tree poblado `.cst-card__roots` NO tiene `role="tree"`. Los nodes NO tienen `role="treeitem"`. Sin esta semantica, screen readers no anuncian jerarquia, expansion ni posicion. Es el deficit mas grande del componente para usuarios de tecnologia asistiva | 92 | Agregar `role="tree"` al `cst-card__roots`. Ver findings B1-B3 para `role="treeitem"` + atributos asociados |
| A3 | **HIGH** | WCAG 2.1.1 Keyboard + 2.1.2 No Keyboard Trap | NO hay navegacion por teclado tipo arbol estandar. Tab navega entre interactive elements individuales, pero no hay ArrowDown/Up para mover entre nodes, ArrowRight para expandir, ArrowLeft para colapsar, Home/End para primer/ultimo. WAI-ARIA tree pattern lo requiere | — | Implementar keyboard navigation siguiendo [WAI-ARIA Authoring Practices: Tree View](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/). Requiere manager de focus dentro del tree |
| A4 | **HIGH** | WCAG 2.5.7 Dragging Movements (AAA) + 2.1.1 (AA via teclado) | El drag-n-drop con Sortable.js es exclusivamente pointer. Sin keyboard alternative para reordenar nodos siblings. Usuarios sin mouse no pueden reordenar | 363-379, 318-361 | Agregar keyboard reorder: Shift+ArrowUp/Down sobre un treeitem mueve la posicion entre siblings. Existe `Sortable.MultiDrag` con keyboard plugin, o implementacion custom |
| A5 | MID | WCAG 1.4.13 Content on Hover or Focus | El tooltip CSS-puro `.cst-node__metric-wrap--invalid::after` (lineas 800-851) solo se muestra en `:hover` y `:focus`. Cumple dismissable parcial (focus se quita con tab away) y persistente (sin auto-cierre). Hoverable es ambiguo porque es pseudo-element del wrap — si el cursor sale, desaparece. Probablemente OK pero requiere testing con axe | 800-851 | Verificar con axe-core. Si emerge gap, mover a un tooltip-component que cumpla dismissable + hoverable + persistent |
| A6 | MID | WCAG 2.3.3 Animation from Interactions / prefers-reduced-motion | Multiples transiciones `0.15s` y `0.12s` en hover/focus + Sortable animations (150ms). Sin `@media (prefers-reduced-motion: reduce)` override. Usuarios con vestibular sensitivity reciben animaciones sin opcion | 824-826, 866-872 + Sortable config | Agregar `@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms; transition-duration: 0.01ms; } }`. Pasar `animation: 0` a Sortable cuando matchMedia detecta reduced-motion |
| A7 | MID | WCAG 2.4.7 Focus Visible | No hay `:focus-visible` styling explicito para el row, el drag handle, el name clickable o los toggle buttons. Hay `:hover` pero el outline del browser puede ser inconsistente con el resto del UI | varios | Agregar `.cst-node__row:focus-within { outline: 2px solid var(--up1-color-primary); outline-offset: 2px; }` o equivalente |
| A8 | LOW | WCAG 1.4.3 Contrast minimum | Tokens `--up1-text-primary` vs `--up1-bg-primary` / `--up1-bg-secondary` / `--up1-bg-tertiary` no estan verificados aqui. Heredan del theme up1. **Riesgo** si los tokens no cumplen 4.5:1 en algun modo (light/dark) | varios | Correr axe-core o lighthouse contra una instancia poblada de Storybook + agregar test automatizado de contrast en CI |

#### B. CompositeSectionNode.ts — fila recursiva

| ID | Severidad | Success Criterion | Finding | Linea | Recomendacion |
|----|-----------|-------------------|---------|-------|---------------|
| B1 | **HIGH** | WCAG 1.3.1 + 4.1.2 | El row `cst-node__row` (linea 186-189) es un `<div>` plano. Falta `role="treeitem"` + `aria-level={depth+1}` + `aria-expanded={expanded \| undefined}` (solo si hasChildren) + `aria-setsize` + `aria-posinset` (posicion entre siblings) | 186-189 | Pasar siblings count y posicion via props desde el padre. Aplicar atributos al `<div>` del row |
| B2 | **HIGH** | WCAG 1.3.1 | Container `.cst-node__children` (linea 196-216) no tiene `role="group"`. ARIA tree pattern lo requiere para children container | 196 | Agregar `role="group"` al div de children |
| B3 | **HIGH** | WCAG 2.1.1 + 2.4.3 Focus Order | El treeitem no es focusable. Solo lo son sub-elementos (toggle, name clickable, action buttons). Roving tabindex es el patron recomendado: el treeitem activo tiene `tabindex="0"`, los demas `tabindex="-1"`. Sin esto el tab navega por TODOS los interactive elements del arbol — explosion de tabstops | 186 | Implementar roving tabindex con un manager en el SFC raiz. Tab navega por niveles relevantes, Arrow keys mueven el "focused treeitem" |
| B4 | MID | WCAG 4.1.2 Name, Role, Value | El nombre clickable usa `role="button"` + `tabindex="0"` + onClick + onKeydown(Enter/Space) — bien. PERO el `<Text>` atom puede renderizar como `<span>` que por si solo no comunica el state activo. Cuando el modal de detalle abre, no hay `aria-haspopup="dialog"` ni `aria-expanded` | 145-158 | Agregar `aria-haspopup="dialog"` al name clickable. Considerar `aria-pressed` si fuera toggle |
| B5 | MID | WCAG 2.4.7 Focus Visible + 2.4.6 Headings and Labels | El drag handle (linea 128-133) es un `<span>` con `aria-label` + `title`. Visible solo al hover via `.cst-node__actions { opacity: 0 }` (lineas 858-873). Esto significa que screen reader user lo ANUNCIA pero el sighted-keyboard user NO lo ve hasta hover/focus. Mismo issue con action buttons | 128-133, 858-873 | Cambiar `opacity: 0` por mostrar siempre en mobile / focus-within. Considerar `visibility: hidden + focus-within: visibility visible` |
| B6 | MID | WCAG 1.4.11 Non-text Contrast | Drag handle es 20x20px (chico). Iconos sin contraste verificado contra background hover. Target size minimo recomendado 24x24 (AA) o 44x44 (AAA) | 624-628 | Aumentar el touch target a 24x24 minimo. Pasa por aumentar padding del span sin cambiar el icono visible |
| B7 | LOW | WCAG 1.3.1 | Badges (`Badge` atom) muestran code y secondaryLabel sin contexto. Screen reader anuncia el code raw "NF" sin saber que es "Codigo: NF" | 140-143 | Wrappear cada badge con `<span class="sr-only">Codigo:</span>` o `aria-label="Codigo NF"`. Solo si el atom Badge no lo cubre |

#### C. CompositeSectionForm.ts — form del modal create/edit

| ID | Severidad | Success Criterion | Finding | Linea | Recomendacion |
|----|-----------|-------------------|---------|-------|---------------|
| C1 | **HIGH** | WCAG 3.3.1 Error Identification | `onSubmit` (linea 61-65) valida `form.name.trim() === ''` y silenciosamente retorna sin feedback. Usuario submit invalid no recibe error visible ni audible. NO hay aria-invalid, NO hay message error focuseado | 61-65 | Setear `nameError = ref('')` cuando falla. Pasar a Input atom como prop `error` o `aria-invalid="true"` + descripcion. Mover focus al input invalido. Live region `role="alert"` |
| C2 | **HIGH** | WCAG 3.3.2 Labels or Instructions | El form depende de que `Input`/`Textarea`/`Checkbox`/`Button` atoms generen `<label for>` correcto. Esta dependencia NO se verifica aqui — riesgo si los atoms no la cumplen | 89-100 | Confirmar comportamiento de atoms via su Storybook. Si fallan, esto bloquea AA en todo el mod (no solo este form) |
| C3 | **HIGH** | WCAG 1.3.1 + 4.1.2 | El `<form>` raiz (linea 147) no tiene `aria-labelledby` apuntando al titulo del modal. Screen reader no anuncia "Formulario para crear/editar nodo X". El titulo vive en el padre Element.vue:262-266 | 147 | Pasar un `id` del Modal title como prop al Form. Aplicar `aria-labelledby` |
| C4 | MID | WCAG 3.3.3 Error Suggestion + 1.4.13 | Si llega `saveError`, se muestra como Alert. Si el atom Alert NO tiene `role="alert"` o `aria-live="assertive"`, screen reader NO anuncia el error. Riesgo dependiente de atoms | 128-130 | Verificar atom Alert. Si falla, override con `<div role="alert">` aqui |
| C5 | MID | WCAG 2.4.3 Focus Order | Al abrir el modal, el focus NO se mueve automaticamente al primer input ni se atrapa dentro del modal. Esto depende del `<Modal>` molecule del padre — verificar | — | Confirmar atom Modal. Si falla: implementar focus trap manual + auto-focus al primer Input al mount |
| C6 | LOW | WCAG 2.5.3 Label in Name | Labels via i18n key `compositeSectionTree.form.labels.name`. Asumiendo i18n cumple. OK | 37-40 | — |

#### D. CompositeSectionView.ts — modal read-only de detalle

| ID | Severidad | Success Criterion | Finding | Linea | Recomendacion |
|----|-----------|-------------------|---------|-------|---------------|
| D1 | **HIGH** | WCAG 4.1.2 | Modal CASERO (no usa `<Modal>` molecule). `cst-modal__backdrop` + `cst-modal__card` (lineas 87-110) NO declaran `role="dialog"`, `aria-modal="true"`, `aria-labelledby`. Screen reader no anuncia que es un modal. **Patron inconsistente con el resto del mod** que SI usa Modal molecule | 87-110 | Migrar a `<Modal>` molecule del design system (resolverla via BUG-platform-011). Si no es viable: agregar `role="dialog"`, `aria-modal="true"`, `aria-labelledby="cst-view-title-{uniqueId}"` |
| D2 | **HIGH** | WCAG 2.1.2 No Keyboard Trap + 2.1.1 | NO hay handler `@keydown.esc` para cerrar el modal con tecla Escape. Patron dialog estandar. Tampoco hay focus trap (Tab puede escapar al fondo) | 107-110 | Agregar `onKeydown: (e) => { if (e.key === 'Escape') emit('close') }`. Implementar focus trap (move focus into modal at mount, restrict tab cycle dentro de modal hasta close) |
| D3 | **HIGH** | WCAG 2.4.3 Focus Order | Al abrir el view modal, focus NO se mueve al modal (deberia ir al titulo o close button). Al cerrarse, el focus NO se restaura al elemento que lo abrio (el name clickable del nodo). Esto desorienta al usuario keyboard-only | 107-110 + Element.vue:308-316 | Implementar `useFocusTrap` composable. Auto-focus al close button al mount. Restaurar previousActiveElement al cerrar |
| D4 | MID | WCAG 1.3.1 | Las filas label/value (lineas 75-78, 58-61) usan span pares en grid. `<dl><dt><dd>` seria mas semantico para definition lists | 57-79 | Refactor a `<dl>` con `<dt>` para labels y `<dd>` para values. Marginal pero mejora screen reader UX |
| D5 | LOW | WCAG 1.4.13 Content on Hover/Focus | El click-outside-to-close (linea 109) puede ser sorpresa para sighted user. Pero es patron comun. OK | 109 | — |

#### E. RichTextRendererElement.vue — renderer HTML sanitizado

| ID | Severidad | Success Criterion | Finding | Linea | Recomendacion |
|----|-----------|-------------------|---------|-------|---------------|
| E1 | MID | WCAG 4.1.2 Name, Role, Value | `.rtr-card` con v-html no declara semantica. Es contenido user-generated arbitrario. Falta `role="article"` o `role="region"` con `aria-label` que describa el contexto (ej. "Contenido formateado de Seccion X") | 22 | Agregar `role="region"` + prop `ariaLabel` desde el layout JSON. O usar `<article>` si el contenido es self-contained |
| E2 | MID | WCAG 1.4.3 Contrast | `:deep(code)` y `:deep(pre)` usan `--up1-bg-tertiary` sin verificacion explicita de contraste vs `--up1-text-primary` heredado | 126-131, 133-139 | axe-core en runtime o testing manual. Si falla, ajustar tokens del theme |
| E3 | LOW | WCAG 2.4.4 Link Purpose | Los `<a>` sanitizados heredan content del HTML user-generated. Sin enrich (tooltip mostrando URL, indicador externo) | 146-153 | Considerar agregar `target="_blank" rel="noopener noreferrer"` + indicador visual `aria-label="..., abre en nueva pestana"` si los enlaces salen del tenant |
| E4 | LOW | WCAG 1.3.1 Info and Relationships (positivo) | sanitize-html whitelist incluye semantica rica (h1-h6, lists, blockquote, table). Base solida si los autores escriben bien | sanitizeHtml.ts | — (positivo). Considerar publicar guia de escritura accessible para autores de richText |

#### F. CSS / design tokens (theme up1)

| ID | Severidad | Success Criterion | Finding | Recomendacion |
|----|-----------|-------------------|---------|---------------|
| F1 | MID-HIGH | WCAG 1.4.3 Contrast minimum | NO hay verificacion automatizada de contraste de los tokens up1 en este mod (`--up1-text-primary`, `--up1-bg-*`, `--up1-color-primary`, `--up1-border-color`, `--up1-table-row-hover`, etc.). Si los tokens fallan, **falla todo el mod** | Auditar el theme up1 con axe + Storybook a11y addon. Si emerge gap, abrir ticket aparte al equipo platform UP1 |
| F2 | MID | WCAG 2.3.3 prefers-reduced-motion | Sin `@media (prefers-reduced-motion: reduce)` global ni en este mod | Agregar override en CSS global del mod. Tambien afecta a Sortable animation config (pasar `animation: 0` cuando matchMedia) |
| F3 | LOW | WCAG 1.4.10 Reflow / 1.4.12 Text Spacing | CSS usa `px` para padding/margin/font-size. Si el usuario aumenta zoom o text spacing via stylesheet, los layouts pueden romperse | Considerar migrar a `rem` selectivo. Marginal para AA |

### Resumen ejecutivo de findings

| Severidad | Cantidad | Componentes afectados |
|-----------|---------:|----------------------|
| **HIGH** | 13 | A (3), B (3), C (3), D (3), F (1 si gana el riesgo) |
| **MID** | 13 | A (3), B (3), C (3), D (1), E (2), F (1) |
| **LOW** | 6 | A (1), B (1), C (1), D (1), E (2) |

**Total findings**: 32 (13 high + 13 mid + 6 low).

**Componentes con mas gaps high**: CompositeSectionTreeElement.vue raiz, CompositeSectionNode.ts, CompositeSectionForm.ts y CompositeSectionView.ts. RichTextRendererElement.vue es el mas limpio (0 high, 2 mid, 2 low).

**Patron emergente**: el mod implemento buenas practicas SIMPLES (aria-labels en buttons, role=button en clickable spans, focus en metric invalida) pero le faltan los patrones COMPUESTOS del WAI-ARIA Authoring Practices — tree pattern, dialog pattern, focus trap, roving tabindex. La consecuencia es que un usuario solo-teclado o screen reader user NO puede operar el componente de forma equivalente a un usuario con mouse.

**Patron secundario**: el modal CASERO (CompositeSectionView) duplica un patron que ya existe como atom (`<Modal>` molecule). Esto es consecuencia documentada de BUG-platform-011 (modalStackManager no expuesto a custom Vueform elements). El workaround es funcional pero **rompe la a11y del dialog pattern**. Resolver BUG-platform-011 ayudaria a cerrar D1/D2/D3 de un solo cambio.

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El audit estatico (sin axe runtime) cubre la mayoria de los issues estructurales pero subestima los de contraste y motion | open | F1 marcado como riesgo no verificable estaticamente |
| H2 | Los atoms del design system (Input, Textarea, Modal, Button, Alert) cumplen su parte de a11y; los issues de este mod son del composite/orchestrator, no de los building blocks | open | Asumido — requiere validar en Storybook propio de los atoms |
| H3 | Resolver BUG-platform-011 (ModalStackManager para custom Vueform elements) elimina 3 findings high de una vez (D1/D2/D3 + posiblemente C5) | inferred | El modal de View es casero precisamente por el bug. Si el platform lo expone, se migra a `<Modal>` molecule que asumimos a11y-correcto |
| H4 | El componente tree necesita una refactor seria para cumplir AA — tree pattern + roving tabindex + keyboard drag-n-drop son trabajo de 2-3 sessions | inferred | Lineas A1-A4 + B1-B3 requieren coordinacion entre 3 archivos y testing exhaustivo |
| H5 | Los tokens del theme up1 cumplen contraste AA en light mode pero pueden fallar en dark mode | open | El mod ya tiene workarounds para tokens problematicos en dark (badge bg-secondary forzado, tooltip CSS-puro). Sugiere que el theme tiene gaps en dark |

### Context found

**Rules del modulo**: ninguna rule de a11y registrada en `rules/curriculum-design/` ni en `rules/mods/`. Hay rules de platform que mencionan tokens (`rules/platform/`) pero no de WCAG.

**Bugs abiertos relacionados**:
- BUG-platform-010 — Atom Tooltip rompe en modo dark (workaround CSS puro en este mod, lineas 800-851). Sus arreglos formales beneficiarian a11y indirectamente.
- BUG-platform-011 — modalStackManager no expuesto a custom Vueform elements. Causa raiz del modal casero en CompositeSectionView (finding D1-D3).
- BUG-platform-012 — CSS de SFCs custom Vueform debe vivir inline (sin extracion a `<style>`).

**Specs relacionados**:
- [SPEC-curriculum-design-overview](../specs/curriculum-design/overview.md) — sin seccion de a11y.
- [SPEC-curriculum-design-programa-asignatura](../specs/curriculum-design/programa-de-asignatura.md) — sin seccion de a11y.
- [docs/guides/composite-section-tree.md](../../uplanner/up1/mods/curriculum-design/docs/guides/composite-section-tree.md) — guia del componente sin mencion de a11y.

**Tickets predecesores que tocaron estos componentes**:
- TICKET-009 (UPONE-1035) — creacion del detail con secciones configurables. Sin gates de a11y.
- TICKET-010 — refactor calidad, zero behavior change. Sin gates de a11y.
- TICKET-011 — plan de pruebas baseline + LLM-e2e. **0 scenarios validan a11y** (todos validan funcional / visual).
- TICKET-012 — review calidad CompositeSectionTree. La review identifico mejoras de a11y a nivel atom (uso de IconButton con tooltip) pero no audito el patron compuesto (tree, dialog).

**Tooling no presente en el mod**:
- Sin `@storybook/addon-a11y` instalado.
- Sin `axe-core` ni `axe-playwright` en tests.
- Sin lint rule de `eslint-plugin-jsx-a11y` o equivalente en `eslint.config.js`.
- Sin manifests de target WCAG en el repo.

## Setup

> No aplica para work_type=explore. Este ticket es analisis estatico — no requiere environment ni reproduction.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Audit estatico cubre estructura semantica pero requiere axe/lighthouse en runtime para contraste y prefers-reduced-motion confiables | static review 2026-05-12 | — | refined | RULE-curriculum-design-001 |
| L2 | El mod implemento buenas practicas atomicas (aria-labels en buttons) pero le faltan patrones compuestos del WAI-ARIA APG (tree, dialog, roving tabindex) | static review | — | refined | RULE-curriculum-design-001 |
| L3 | El modal casero de CompositeSectionView duplica patron y rompe a11y de dialog. Es consecuencia documentada de BUG-platform-011. Resolverlo destraba 3-4 findings high | static review + BUG cross-ref | — | refined | BUG-platform-011 |

## Failed approaches

> No aplica — el audit no probo approaches.

## Sessions

> work_type=explore no requiere execute. El audit completo es este ticket markdown. Si emerge decision de implementar fixes, se abre TICKET-NN nuevo con work_type=fix/improvement.

## Teaching — Close

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Summary

Audit estatico WCAG 2.1 AA de 5 archivos visibles al usuario del mod curriculum-design. **32 findings totales: 13 high, 13 mid, 6 low**. Los gaps mas criticos son: (a) falta de semantica de tree (tree/treeitem/group roles + aria-expanded/level/setsize/posinset), (b) sin keyboard navigation del tree (Arrow keys, Home/End), (c) drag-n-drop inaccesible por teclado, (d) modal casero de View sin role=dialog/aria-modal/focus trap/Escape close, (e) form sin feedback visible de error de submit invalido. RichTextRendererElement.vue es el componente mas limpio. El theme up1 (tokens de color, motion) requiere verificacion runtime con axe-core para confirmar contrast y prefers-reduced-motion — no evaluable solo con lectura estatica.

**Decision pendiente del dev**: que hacer con los findings. Opciones razonables:
1. **Sprint a11y dedicado** — abrir 1-2 tickets work_type=improvement (uno para tree pattern + keyboard nav, otro para dialog/form/modal). Costo estimado: 3-5 sessions tier T3.
2. **A11y como gate de close en tickets futuros** — agregar a `templates/records/ticket.md` un acceptance checkpoint "Componentes visibles cumplen WCAG 2.1 AA verificado con axe-core". Sin gate retroactivo.
3. **Solo agregar axe-core + Storybook addon a11y como tooling** — sin fix inmediato, pero futuros cambios reciben feedback. Costo bajo, beneficio diferido.
4. **No accion ahora** — documentar findings como deuda tecnica y resolver cuando emerja requerimiento de cliente/regulacion.

El ticket cierra como `explore` sin fix aplicado. Si se decide actuar, se abren tickets descendientes.

### Resolucion (2026-05-12)

El dev opto por la **opcion 1** (sprint a11y dedicado). Se abrio [TICKET-022](./ticket-022.md) (UPONE-1038, work_type=improvement) que implemento **22 de los 32 findings** distribuidos en 4 sessions: S1 aditivos ARIA + reduced-motion, S2 ESC/focus trap/form feedback, S3 keyboard navigation con roving tabindex y Arrow keys, S4 keyboard drag-n-drop.

**10 findings NO implementados** quedan como deuda tecnica con justificacion:
- 4 findings de contraste (axe runtime, depende de tooling no instalado en el mod)
- 3 findings de atoms del design system (riesgo de coordinacion con platform UP1)
- 3 findings que dependen de BUG-platform-011 (modal molecule para custom Vueform elements)

Por DET-22, `explore` esta exento de teach-close — el ticket cierra con este Summary como artefacto educativo final.
