---
id: RULE-mods-023
project: up1
type: rule
module: mods
tags:
  - vueform
  - custom-element
  - css
  - vue-render
---

# No usar `<style scoped>` en Vueform elements con sub-componentes render-function

## What

`<style scoped>` aplica el atributo `data-v-*` solo a elementos del template del SFC. Elementos generados via `h()` en sub-componentes con `render()` function NO reciben el scope — el CSS no aplica y los nodos quedan sin estilos. Solucion: quitar `scoped` y usar prefijo unico de clase (ej. `cst-*`, `rtr-*`, etc.) para evitar leak.

## Why

El compilador de Vue agrega el `data-v-*` a los elementos del template, pero los nodos creados via `h()` en otra `render()` function (custom defineComponent) no son trackeados por el compilador del parent SFC.

## Where

`mods/<m>/modsComponents/<Name>/<Name>Element.vue` — cuando el SFC define sub-componentes con render function.

## When

Al disenar el SFC. Si todos los elementos van en el `<template>`, scoped esta OK. Si hay sub-componentes con render function, NO uses scoped y prefija las clases.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L28 — Session 4 (2026-04-30)
