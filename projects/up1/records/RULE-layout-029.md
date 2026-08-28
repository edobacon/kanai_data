---
id: RULE-layout-029
project: up1
type: rule
module: layout
tags:
  - atoms
  - icons
  - bootstrap-icons
  - design-system
---

# Atom `Icon`: `name` requiere prefix `bi-` literal

## What

El atom `Icon` ([layout/src/components/atoms/Icon/Icon.vue:19](../../../up1/layout/src/components/atoms/Icon/Icon.vue#L19)) hace:

```ts
const iconClass = computed(() => props.name.startsWith('bi-') ? `bi ${props.name}` : props.name);
```

Si pasas `name: "chevron-down"` (sin prefix `bi-`), el atom NO agrega la clase `bi`, y bootstrap-icons no aplica → glyph invisible. Hay que pasar `name: "bi-chevron-down"`.

## Why

Convencion del atom para soportar packs de iconos diferentes — si el name no empieza con `bi-`, asume que es una clase custom que se aplica directo. Pero la documentacion del atom no lo deja claro y el comportamiento es silencioso (sin error).

## Where

Cualquier consumidor de `Icon` atom — `<Icon name="..." />` o `h(Icon, { name: "..." })`.

## When

Siempre. Para Button.icon / IconButton.icon ver [RULE-layout-026](rule-layout-026.md) (esos requieren clase completa `"bi bi-pencil"`).

## Source

- [TICKET-009](../../tickets/ticket-009.md) L49 — Session 7 (2026-05-04)
