---
id: RULE-curriculum-design-021
project: up1
type: rule
module: curriculum-design
tags:
  - vueform
  - custom-element
  - read-only
  - view
  - layout
  - disabled
  - pattern
---

# Custom Vueform element con modo read-only (view): isReadonly desde element.isDisabled + disabled:true en el layout view

## What

Un custom Vueform element del mod que debe verse DISTINTO en modo vista (read-only) vs edición (editable) NO necesita un componente display separado: implementa **dos modos en el MISMO componente** con un flag `isReadonly`.

1. `const isReadonly = computed(() => resolveDisabled(element))` donde `resolveDisabled` lee `element.isDisabled` y tolera bool plano y ref-wrapped (`{value:bool}`). El template renderiza con `v-if="isReadonly"` el display read-only (ej. chip de color + label, glifo + nombre) y con `v-else` el control editable.
2. **Vueform NO deriva `isDisabled` del `mode:"view"` del layout** (su computed `isDisabled` solo mira el `disabled` del schema del field o el estado de validación). Por eso, para que el element entre en modo read-only en una vista, el layout `*_view.json` DEBE setear **`"disabled": true`** en ese field. Sin eso, el field queda editable en la vista.
3. El render read-only DEBE ser accesible (RULE-curriculum-design-002): el swatch/glifo decorativo lleva `role="img"` + `aria-label`, o el texto visible porta el nombre accesible.
4. ALINEACIÓN: el bloque read-only suele ser más bajo que los inputs hermanos y "se va hacia arriba". Darle `min-height: var(--vf-min-height, 2.375rem)` + `align-items: center` para alinearlo con la altura de los demás campos de la línea.

## Why

En TICKET-097 el view mostraba la grilla editable (se podía seleccionar) porque se asumió que `element.isDisabled` era true en `mode:"view"` — falso: Vueform (core.mjs, computed `isDisabled`) solo lo deriva del `disabled` del field o de validación. Setear `disabled:true` en el layout view lo activa y el mismo componente cae al branch read-only. Reusar el componente (no uno dedicado) evita duplicar la lógica de matching/i18n y mantiene un solo punto de verdad por element.

## Where

mods/curriculum-design/modsComponents/*/*.vue (el componente) + mods/curriculum-design/config/layouts/*_view.json (el `disabled:true` por field). Ej.: ColorPickerElement/IconPickerElement + default_requirementCategory_view.json.

## When

Al crear un custom Vueform element que se use tanto en layouts de edición como de vista y deba mostrarse read-only en la vista. Coordinar SIEMPRE el cambio en dos lugares: el componente (isReadonly + branch) y el layout view (`disabled:true`).

## Verification

Smoke runtime (DB-gated): abrir la vista del objeto → el field se ve en modo read-only (no editable, no seleccionable) y muestra el valor; abrir edición → editable. Grep: el componente tiene `resolveDisabled`/`isReadonly` y un `v-if`/`v-else`; el layout `*_view.json` tiene `"disabled": true` en el field. axe 0 violaciones sobre el DOM read-only.

## Source

- **Discovered in**: TICKET-097 (REQ-FIX-02)
- **Relacionada**: RULE-curriculum-design-019 (patrón writable + hidratación via props.default), RULE-curriculum-design-002 (a11y)
