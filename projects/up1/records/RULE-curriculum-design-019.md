---
id: RULE-curriculum-design-019
project: up1
type: rule
module: curriculum-design
tags:
  - vueform
  - custom-element
  - defineElement
  - writable
  - typescript
  - pattern
---

# Custom Vueform element WRITABLE: setup(props,{element}) + element.update(), NUNCA Options-API methods

## What

Un custom Vueform element del mod que ESCRIBE valor (submits:true) DEBE implementarse con `setup(props, context)` accediendo al element via `context.element` (`element.value` para leer, `element.update(val)` para escribir), NO con Options-API `methods`/`data`. Para i18n usar `useI18n().t` (Composition), NO `$t`. Patrón de referencia writable: EnumValuesEditorElement / ValidationTextEditorElement (mod object-manager-editor). Patrón estructural: CompositeSectionTreeElement.

**El estado de display que el usuario VE (selección, valor mostrado) DEBE ser estado LOCAL reactivo (`ref`), NO un `computed(() => element.value)`** (reforzado en TICKET-096). El `ref` se muta DIRECTAMENTE en el handler (ej. al seleccionar) ADEMÁS de persistir con `element.update()`. Un `computed` sobre `element.value` no re-evalúa fiable tras `element.update()` → el feedback de selección no aparece.

**HIDRATACIÓN del valor cargado del registro = `props.default` (CORREGIDO en TICKET-097).** Al abrir un form de edición/vista, Vueform entrega el valor persistido del registro al custom element a través de la prop **`default`**, NO de `element.value`. El element DEBE declarar `default: { type: String, default: '' }` en `props` y leer `props.default` como fuente primaria del valor (patrón `EnumValuesEditorElement`, que inicializa con `initEntries(props.default)`). `element.value` (objeto de Refs sin unwrap en el 2º arg de setup), `element.el$.value` (proxy) y `watch`/`onMounted` sobre ellos NO hidratan fiable en setup — todas esas vías se probaron y fallaron en el smoke de TICKET-097 (ver Failed approaches del ticket). Patrón robusto: `const readValue = () => (props.default || readLoadedValue(element))`, usado para init del `ref` Y como getter de un `watch(..., { immediate: true })`.

**El wiring del valor de un custom Vueform element NO lo atrapa el unit test** (los helpers puros se prueban con objetos planos, nunca con el element real de Vueform). Su validación es SOLO el smoke runtime → los test cases de hidratación/render deben marcarse smoke + Affects UI.

## Why

`defineElement` con Options-API `methods`/`data` rompe la inferencia de `this` en el template de vue-tsc → error TS2349 'This expression is not callable' en TODA referencia del template ($t, métodos, computed). Observado en TICKET-094 S1: 5 errores que desaparecieron al migrar a setup(). RichTextRenderer/ActivityStatusBadge no fallan porque usan solo `computed` (read-only), pero un element interactivo necesita handlers → con methods rompe. setup() retornando los handlers type-checkea limpio.

## Where

mods/curriculum-design/modsComponents/*/*.vue — cualquier custom element nuevo, especialmente los writable (submits:true).

## When

Al crear un custom Vueform element del mod que necesite handlers de evento (click/keydown) o escribir su value. Verificar con `npm run typecheck` que no agrega errores TS atribuibles al componente.

## Verification

vue-tsc (npm run typecheck) no reporta errores TS2349 'not callable' en el .vue del componente. Grep: el componente usa `setup(` y `element.update`, no `methods:` dentro de defineElement. Para writable con display: grep que el estado seleccionado/mostrado sea un `ref` (no un `computed(() => element.value)`). Para hidratación: grep que el componente declare la prop `default` y la lea (`props.default`) como fuente del valor. Validación funcional SOLO por smoke runtime (el unit no monta el SFC ni el element real de Vueform).

## Source

- **Discovered in**: TICKET-094
- **Reforzada en**: TICKET-096 (estado de display LOCAL, no computed sobre element.value)
- **Corregida en**: TICKET-097 (hidratación real = `props.default`, NO element.value/watch/onMounted ni proxy; el wiring solo lo valida el smoke)
