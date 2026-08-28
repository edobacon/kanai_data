---
id: RULE-mods-028
project: up1
type: rule
module: mods
tags:
  - recordlist
  - inline-edit
  - workflow-fields
---

# Fields que representan workflow ordenado: `editable: false` en column

## What

El RecordList soporta inline editing por celda (lapiz al hover) controlado en 3 niveles: `canEditRowField` (global), `editableFields[]` (whitelist), y **`editable: false` por column** (bloqueo granular). Para fields que representan estados de un workflow controlado (`workflowState`, `approvalStatus`, etc.), bloquear con `editable: false` por column en el list. La logica de plataforma ([RecordList.vue:2874-2877](../../../up1/layout/src/layouts/RecordList.vue#L2874-L2877)) corta en el primer `editable === false` antes de cualquier validacion downstream.

## Why

Un workflow tiene transiciones validas (ej. Draft → Review → Approved). Permitir edit-per-celda lo viola — el user puede setear un estado invalido. El modal Edit honra el field como `select` y muestra todos los estados; ahi si se permite cambiar via flow.

## Where

`mods/<m>/config/layouts/<obj>_list.json` y embed `record-list` — en cada column cuyo field representa un workflow ordenado.

## When

Al declarar un column donde el field es enum de workflow. Si el field es libre (no controlado), `editable: false` no aplica.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L44 — Session 6 (2026-04-30)
