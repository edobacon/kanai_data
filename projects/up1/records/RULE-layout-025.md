---
id: RULE-layout-025
project: up1
type: rule
module: layout
tags:
  - recordlist
  - recorddetail
  - associated-layouts
  - naming-convention
---

# `associatedLayoutConfigs.{view,edit}` resuelve por nombre `default_<objectName>_<mode>`

## What

Convencion del listado para layouts default sin `layoutId` explicito en `associatedLayoutConfigs`: la plataforma busca por nombre `default_<objectName>_<mode>` ([RecordList.vue:4129-4170](../../../up1/layout/src/layouts/RecordList.vue#L4129-L4170)). Con esto basta declarar `objectName + mode` en `associatedLayoutConfigs.{view,edit}` y la plataforma resuelve el JSON correcto sin hardcodear ID.

```json
"associatedLayoutConfigs": {
    "view": { "objectName": "rt__Modality__curricularsection", "mode": "view" },
    "edit": { "objectName": "rt__Modality__curricularsection", "mode": "edit" }
}
```

## Why

Reduce acoplamiento entre embed y layout target — si renombras el layout target, no hay que actualizar todos los embeds que lo referencian. La resolucion por nombre tambien fuerza la convencion `default_<obj>_<mode>` para layouts default del mod.

## Where

`mods/<m>/config/layouts/<parent>_*.json` — embeds `record-list` con `associatedLayoutConfigs`.

## When

Al declarar embeds que abren detail/edit del row. Si necesitas un layout no-default (variante para tenant especifico, vista alternativa), si declarar `layoutId` explicito.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L34 — Session 5 (2026-04-30)
