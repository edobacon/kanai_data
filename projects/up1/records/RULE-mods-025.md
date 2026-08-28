---
id: RULE-mods-025
project: up1
type: rule
module: mods
tags:
  - vueform
  - form-config
  - editable-types
---

# Patrones Vueform editable para enums, numbers y booleans

## What

Convencion de tipos editables para layouts de mod:

| Tipo de valor | `type` | Config adicional |
|---------------|--------|------------------|
| Enum (string) | `select` | `native: true`, `items: { Value1: "Etiqueta", ... }` (objeto value→label, no array) |
| Numero | `text` | `inputType: "number"` (no `type: "number"` directo) |
| Boolean | `toggle` | `default: true/false` opcional |

## Why

Convencion validada en layouts de plataforma (`default_Category_create_Consultor.json`, `default_Infrastructure_create_Consultor.json`). Otras combinaciones no funcionan o producen UI inconsistente con el resto de la app.

## Where

`mods/<m>/config/layouts/*_edit.json` y `*_create.json` — fields de tipo enum/number/boolean.

## When

Al declarar un field editable en un layout del mod. Validar contra el schema del object/RT que el `type` Vueform sea consistente con el `type` JSON Schema del object.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L35 — Session 5 (2026-04-30)
