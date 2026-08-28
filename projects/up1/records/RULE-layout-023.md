---
id: RULE-layout-023
project: up1
type: rule
module: layout
tags:
  - css
  - design-tokens
  - theme
  - hover
---

# Tokens validos para hover en up1: usar `--up1-table-row-hover` o `--up1-background-hover`

## What

Tokens validos para hover en up1 (theme-aware via `--up1-bg-secondary` redefinido por theme):

- `--up1-table-row-hover`
- `--up1-background-hover`

**El token `--up1-bg-hover` NO existe** en `suite/css/1-theme/theme-tokens.css`. Usarlo cae al fallback hardcoded → claro fijo en dark mode → texto claro sobre fondo claro ilegible.

## Why

`light-dark()` es la funcion CSS que da el theme-awareness. Solo los tokens que esten DEFINIDOS en `theme-tokens.css` con `light-dark(...)` funcionan en ambos modos. Tokens inventados resuelven al fallback (segundo arg de `var(...)`).

## Where

CSS de cualquier componente del mod (`<style>` de SFC, `mods/<m>/css/`).

## When

Al definir hover de filas, items o areas interactivas. Validar siempre contra `up1/suite/css/1-theme/theme-tokens.css` antes de usar un token nuevo.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L31 — Session 4 (2026-04-30)
- F6 (failed approach)
