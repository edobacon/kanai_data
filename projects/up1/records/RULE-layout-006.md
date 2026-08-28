---
id: RULE-layout-006
project: up1
type: rule
module: layout
tags:
  - css
  - design-tokens
  - theming
  - pattern
---

# CSS tokens de mod con fallback a tokens de plataforma

## What

Mod CSS tokens usan formato --{modname}-* y DEBEN referenciar platform tokens --up1-* con fallback. Ejemplo: --mymod-card-bg: var(--up1-bg-primary, #ffffff).

## Why

Sin fallback a platform tokens, el mod no respeta el tema del tenant. Los tokens de plataforma cambian por tema/tenant, y el fallback garantiza que el mod se adapta automaticamente.

## Where

mods/*/css/1-theme/, mods/*/css/2-objectName/

## When

Al definir custom properties CSS en un mod.

## Verification

Verificar que custom properties del mod incluyen var(--up1-*) como fallback.

## Source

- **Discovered in**: —
