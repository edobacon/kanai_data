---
id: RULE-mods-017
project: up1
type: rule
module: mods
tags:
  - sync
  - object-schema
  - platform-limitation
---

# Planear `required[]` y NOT NULL del mod antes del primer sync

## What

Cuando un mod declara `required[]` o campos NOT NULL en JSON de objects, el merge del sync (Phase 2) los acumula en el Base por **union append-only** — no permite removerlos despues. Planear el contrato antes del primer sync. Si un campo se vuelve required por error, el unico camino es revertir el archivo Base al HEAD del submodule object-manager (`git checkout HEAD -- objects/business/Base/{object}.json`) y re-sync desde clean.

## Why

`fileSync.js:802-805` une los arrays sin diff semantico — agregar entries funciona, removerlas no.

## Where

`mods/<m>/objects/Base/{object}.json` y `mods/<m>/objects/Extended/{object}.json` cuando declaran `required` o `not_null`.

## When

- Antes del primer sync de un mod.
- Cuando se modifica una declaracion previa de required/NOT NULL.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L13 — Session 1 (2026-04-29)
