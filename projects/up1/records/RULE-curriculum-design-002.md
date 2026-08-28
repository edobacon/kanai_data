---
id: RULE-curriculum-design-002
project: up1
type: rule
module: curriculum-design
tags:
  - a11y
  - wcag
  - wai-aria
  - accessibility
  - custom-element
  - composite-section-tree
  - rich-text-renderer
  - pattern
---

# Custom Vueform elements compuestos DEBEN cumplir WAI-ARIA APG (tree, dialog, focus trap, roving tabindex)

## What

Todo custom Vueform element que renderiza una estructura compuesta visible al usuario (arboles jerarquicos, modales, listas con drag-n-drop, etc.) DEBE cumplir el patron WAI-ARIA Authoring Practices Guide correspondiente a su tipo: Tree View para arboles (role=tree/treeitem/group + aria-level/expanded/setsize/posinset + roving tabindex + ArrowKeys/Home/End), Dialog para modales (role=dialog + aria-modal + aria-labelledby + focus trap + Escape close + focus restoration), prefers-reduced-motion override CSS + Sortable animation conditional, :focus-visible explicito, touch target minimo 24x24, aria-label en buttons/icons sin texto, aria-haspopup en triggers de modals. Para reorder por mouse (Sortable.js u otra lib), DEBE haber tambien reorder por teclado emitiendo el MISMO event handler (Shift+ArrowUp/Down como atajo estandar) + announce via live region (aria-live=polite + sr-only). Tests obligatorios: unit del aria semantica + LLM-e2e de keyboard interaction.

## Why

TICKET-021 audit estatico de 32 findings WCAG 2.1 AA en componentes visibles del mod (CompositeSectionTree, RichTextRenderer y sub-componentes). El componente original (TICKET-009/010/012) tenia buenas practicas atomicas (aria-labels en buttons, role=button en clickable spans) pero le faltaban los patrones COMPUESTOS del WAI-ARIA APG — tree pattern, dialog pattern, focus trap, roving tabindex, keyboard reorder. Consecuencia: un usuario solo-teclado o screen reader user NO podia operar el componente de forma equivalente a un usuario con mouse. TICKET-022 implemento la remediacion (4 sessions, 22 findings cubiertos). Esta rule cristaliza el patron para prevenir regresion en futuros custom Vueform elements del mod (H7 del audit anticipo este caso si LearningOutcome migra a tree pattern).

## Where

mods/curriculum-design/modsComponents/*. Aplica a CompositeSectionTree (implementado en TICKET-022), RichTextRenderer (parcial — sin keyboard interaction porque es read-only), y a cualquier custom element futuro del mod que sea compuesto visible.

## When

Al crear un nuevo custom Vueform element en modsComponents/ con cualquiera de estas caracteristicas: (a) renderiza estructura jerarquica, (b) abre/maneja modal/dialog, (c) tiene drag-n-drop o reorder, (d) integra mouse interaction con sub-elementos focuseables. Antes de open PR, verificar: tests unit aria-attrs + tests del composable de keyboard si aplica + LLM-e2e scenario de keyboard interaction + actualizar docs/guides/{component}.md con seccion Accesibilidad.

## Verification

1. Grep test files: cada custom element compuesto del mod debe tener `tests/integration/aria-attrs.test.ts` (o equivalente). 2. Grep docs: cada custom element debe tener seccion 'Accesibilidad (WCAG 2.1 AA)' en su guide con tabla de keyboard interaction. 3. Manual: corrobora con axe-core (cuando se instale @storybook/addon-a11y) o auditoria runtime. 4. LLM-e2e: scenarios `keyboard-nav-{component}.md` + `keyboard-drag-{component}.md` si aplica reorder. 5. Cross-check con findings TICKET-021 si emerge categoria similar.

## Source

- **Discovered in**: TICKET-022
