---
id: RULE-mods-030
project: up1
type: rule
module: mods
tags:
  - vueform
  - edit-vs-view
  - pattern
---

# Patron edit-vs-view con elements Vueform distintos por mode

## What

El mismo field puede usar elements Vueform distintos por mode si el shape del value es compatible. Caso ejemplar `CustomSection.content` (richText): `_edit/_create` usan Vueform native `editor` (Trix con toolbar), `_view` usa custom `rich-text-renderer` (HTML sanitizado sin toolbar). Cada element accede al value via `this.value` (BaseElement mixin) sin necesidad de plumbing extra.

## Why

UX optimo segun mode: en edit el user necesita la toolbar para formatear; en view la toolbar es ruido visual. Resolverlo con un solo element + `disabled: true` no funciona — Vueform editor en disabled muestra la toolbar visible pero deshabilitada (gris).

## Where

`mods/<m>/config/layouts/<obj>_view.json` vs `<obj>_edit.json` y `<obj>_create.json` — en fields donde edit y view tienen requisitos distintos.

## When

- richText fields (use editor en edit, render-only en view).
- File uploads (file input en edit, image/preview en view).
- Cualquier field donde la edicion y la visualizacion tienen UX divergente.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L47 — Session 6 (2026-04-30)
