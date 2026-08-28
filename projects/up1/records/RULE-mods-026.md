---
id: RULE-mods-026
project: up1
type: rule
module: mods
tags:
  - recordlist
  - embed
  - recordtypes
  - associated-layouts
---

# Embeds RecordList sobre base con `recordType` requieren `associatedLayoutConfigs` para `view` Y `edit`

## What

Cuando un embed `record-list` se filtra por `recordType` sobre el base (ej. `CurricularSection` filtrado por `recordType=Modality`) y se quiere abrir el detail del RT al click en row, declarar **`associatedLayoutConfigs` para AMBOS modos** (`view` y `edit`) apuntando al RT — no solo edit.

```json
"associatedLayoutConfigs": {
    "view": { "objectName": "rt__Modality__curricularsection", "mode": "view" },
    "edit": { "objectName": "rt__Modality__curricularsection", "mode": "edit" }
}
```

## Why

Sin `view` declarado, el click en row name abre con `objectName` del embed (base) y la plataforma cae a layout default autogenerado del base — formulario completamente distinto al `_view` del RT.

## Where

`mods/<m>/config/layouts/<parent>_view.json` y `<parent>_edit.json` — en cada embed `type: "record-list"` con filtro por `recordType`.

## When

Siempre que el embed filtre por un RT del base y se quiera abrir el detail del RT (no del base) al click en row.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L36 — Session 5 (2026-04-30)
