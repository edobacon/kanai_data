---
id: RULE-layout-019
project: up1
type: rule
module: layout
tags:
  - recordlist
  - embed
  - layout-config
---

# Embeds RecordList sin `layoutId` no se registran en `up1_layen_layout`

## What

Cuando se omite `layoutId` en un embed `record-list` y se inline `columns` + `filters` directamente en `layoutConfig`, el layout **NO se registra como entrada en la tabla `up1_layen_layout`** — vive solo en el JSON del parent layout. No aparece en menu de objetos, no aparece en dropdown de "vistas" del header del list, no se promueve por sync.

## Why

La logica de Phase 7 (Default Layouts Sync) registra layouts top-level (archivos JSON con `id`/`name` propios). Embeds inline son hijos del parent, no entries independientes. Patron preferido para evitar deuda de cleanup posterior y mantener el modulo cohesivo.

## Where

`mods/<m>/config/layouts/<parent>_view.json` y `_edit.json` — embeds `type: "record-list"`.

## When

Al declarar un embed `record-list`. Si el embed va a ser reusado en multiples parents o necesita ser navegable desde el menu, declararlo como layout top-level con `id` propio.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L19 — Session 1 (2026-04-29)
