---
id: RULE-layout-027
project: up1
type: rule
module: layout
tags:
  - ux-pattern
  - accessibility
  - contextual-actions
---

# UX-pattern: hover visibility para acciones contextuales por fila/nodo

## What

En componentes con acciones contextuales por fila/nodo (rowActions, tree node actions, list cell actions), aplicar `opacity: 0 + pointer-events: none` por default y revelar con `:hover` y `:focus-within` del contenedor de la fila + `transition: opacity 0.15s ease`.

```css
.row__actions { opacity: 0; pointer-events: none; transition: opacity 0.15s ease; }
.row:hover .row__actions, .row:focus-within .row__actions { opacity: 1; pointer-events: auto; }
```

## Why

Reduce ruido visual cuando el listado es largo (las acciones aparecen solo cuando el user interactua con la fila). `:focus-within` mantiene accesibilidad por teclado — el focus sobre cualquier hijo revela las acciones. Limpio y consistente con patrones modernos de design systems.

## Where

Componentes con acciones por fila/nodo en mods o layout core: rowActions, tree, lists con icon-buttons al final de fila.

## When

Cuando las acciones no son criticas (el user puede vivir sin verlas si no hover). Si las acciones son siempre relevantes (ej. checkbox de seleccion masiva), mantener visibles.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L42 — Session 6 (2026-04-30)
