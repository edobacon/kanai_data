---
id: RULE-layout-030
project: up1
type: rule
module: layout
tags:
  - recordlist
  - columns
  - nested-fields
  - relations
---

# Columnas RecordList: dotted-path keys + `relations` para mostrar fields de relaciones 1:1

## What

El helper `getDisplayValue` del platform soporta dotted-path keys para columnas: `key: "rt__X__curricularsection.field"` se resuelve walking el path en `recordData` ([layout/src/utils/recordListFormatters.ts:237](../../../up1/layout/src/utils/recordListFormatters.ts#L237)). Combinado con `relations: [...]` en `layoutConfig`, el RT data llega en `extended.rt__X` y la columna lo muestra sin custom renderer.

```json
"layoutConfig": {
    "relations": ["rt__Modality__curricularsection"],
    "columns": [
        { "key": "name", "label": "Nombre" },
        { "key": "rt__Modality__curricularsection.code", "label": "Código" },
        { "key": "rt__Modality__curricularsection.deliveryMode", "label": "Modo entrega" }
    ]
}
```

## Why

Patron reusable para mostrar fields de relaciones 1:1 (RT extension, FK objetos relacionados) en lists sin tener que escribir custom cell renderers.

## Where

`mods/<m>/config/layouts/<obj>_list.json` y embeds `record-list` con relaciones 1:1.

## When

Cuando quieras mostrar info del RT extension o FK en columnas. Para FKs simples (id → name de un object), usar `relationDisplayFields` (ver layout docs).

## Source

- [TICKET-009](../../tickets/ticket-009.md) L51 — Session 7 (2026-05-04)
