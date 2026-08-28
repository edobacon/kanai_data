---
id: RULE-mods-031
project: up1
type: rule
module: mods
tags:
  - vueform
  - custom-element
  - elementlayout
---

# Custom Vueform elements: NO usar prop `description` (conflicta con ElementLayout)

## What

Vueform's `ElementLayout` pinta automaticamente la prop `description` del element debajo del card — sin pasar por slot, sin posibilidad de override desde un `#description` slot vacio. Para un custom element que renderea su propia descripcion en otra ubicacion, **NO declarar prop `description`** (conflicta con la convencion de Vueform). Usar un nombre custom (ej. `subtitle`) y actualizar los JSON configs.

## Why

`ElementLayout` interpreta `description` como prop standard de Vueform y la pinta debajo del element como helper text. Si el custom element tambien la pinta dentro del card (ej. debajo del titulo), aparece duplicada. Renombrar el prop evita el conflicto.

## Where

`mods/<m>/modsComponents/<Name>/<Name>Element.vue` — en `defineElement.props`.

## When

Al disenar un custom element que tenga texto descriptivo posicionado por el mod (ej. subtitulo de card). Si el texto descriptivo tiene la posicion default de Vueform, se puede usar `description` directamente.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L50 — Session 7 (2026-05-04)
