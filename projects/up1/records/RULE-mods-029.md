---
id: RULE-mods-029
project: up1
type: rule
module: mods
tags:
  - richtext
  - security
  - sanitization
---

# Sanitizar HTML user-generated en mods con DOMParser native

## What

`sanitize-html` no esta instalado en up1. Para sanitizacion HTML user-generated sin dep externa: **DOMParser browser native + whitelist de tags/attrs**. Suficiente para HTML controlado del Trix editor de Vueform (output limitado a tags conocidos). Patron del componente `RichTextRendererElement`:

1. Parse: `new DOMParser().parseFromString(html, 'text/html')`.
2. Walker recursivo del tree DOM, replace con childNodes para tags no permitidos.
3. Strip de attrs no whitelisted.
4. Bloqueo de `href="javascript:"`.
5. Force `target=_blank rel=noopener noreferrer` en links.

## Why

Evita XSS al renderizar HTML user-generated via `v-html`. Sin dep externa = sin overhead de bundle. Suficiente para input controlado del Trix editor (que ya genera output sanitizado de origen).

## Where

Cualquier custom Vueform element del mod que renderee `v-html` desde input user-generated. Patron implementado en `mods/curriculum-design/modsComponents/RichTextRenderer/`.

## When

Antes de pasar HTML user-generated a `v-html`. NO usar para HTML untrusted de fuentes externas — el whitelist es conservador para input Trix, no para HTML general de internet.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L46 — Session 6 (2026-04-30)
