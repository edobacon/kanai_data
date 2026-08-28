---
id: RULE-layout-024
project: up1
type: rule
module: layout
tags:
  - css
  - design-tokens
  - theme
  - antipattern
---

# No usar fallbacks de color hardcoded en CSS — `var(--up1-token, #fffXXX)` es trampa

## What

Fallbacks de color hardcoded en CSS — `var(--up1-token, #fffXXX)` — son trampa cuando el token NO existe: el fallback queda fijo en light mode aunque el resto del theme cambie. Patron correcto en componentes mod: usar tokens semanticos (`--up1-bg-primary`, `--up1-text-primary`, `--up1-border-color`) sin fallback de color, o `color: inherit` para heredar del root. Si el token podria no existir, validar primero contra `theme-tokens.css`.

## Why

Si el token existe → el fallback es inutil (nunca activa). Si NO existe → el fallback activa y queda fijo, ignorando el cambio de theme. Para un usuario en dark mode, ver un fondo light hardcoded sobre texto light es ilegible.

## Where

CSS de cualquier componente del mod (`<style>` de SFC, `mods/<m>/css/`).

## When

Al definir colores en CSS. Si quieres "fallback seguro", inheritar del root con `color: inherit`/`background: inherit`/`border-color: inherit` en lugar de hardcodear color.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L32 — Session 4 (2026-04-30)
- F6 (failed approach)
