---
id: RULE-curriculum-design-014
project: up1
type: rule
module: curriculum-design
tags:
  - componentes
  - vueform
  - modsComponents
  - curriculum-design
  - sp5
---

# Componente full-page del mod: patron CompositeSectionTree (Vueform element + modales caseros)

## What

Un componente full-page custom del mod (malla, editor de árbol, etc.) se autora en `mods/<mod>/modsComponents/` como Vueform element (`defineElement`), consume datos vía GraphQL (`useTenantApolloClient`/`listInstances`), usa `sortablejs` para drag&drop, y **modales CASEROS** (átomo `Modal` del design system) — NO el `ModalStackManager` (no se expone a Vueform elements, BUG-platform-011). La lógica se extrae a módulos `.ts` puros (testeables con `.spec.ts`); el `.vue` se cubre con stories.

## Why

Patrón probado en producción: `CompositeSectionTree`. Mantiene el componente testeable y mod-only (se sincroniza a layout, no edita core).

## Where

mods/<mod>/modsComponents/<Componente>/ — Element.vue + lógica .ts + .spec.ts + .stories.ts.

## When

Al construir un componente custom full-page del mod (ej. el componente de malla curricular).

## Verification

El componente renderiza en su pestaña/vista; la lógica pura tiene .spec.ts; los modales usan el átomo Modal (no ModalStackManager).

## Source

- **Discovered in**: —
