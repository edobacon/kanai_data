---
id: RULE-layout-028
project: up1
type: rule
module: layout
tags:
  - recordlist
  - openmode
  - route
  - ux
---

# `openMode: "route"` aplica solo a listados top-level — embeds quedan en modal

## What

Plataforma agrego `layoutConfig.openMode` ([layout/docs/features/recordlist.md](../../../up1/layout/docs/features/recordlist.md)) en PR habilitador-UPONE-1035. Para activar route-mode (View/Edit como URL navegacion vs modal), declarar:

```json
"openMode": "route",
"associatedLayoutConfigs": {
    "view": { "layoutId": "default_X_view" },
    "edit": { "layoutId": "default_X_edit" }
}
```

**Aplica solo a listados top-level** — para embeds dentro de RecordDetail mantener `"modal"` (default) para no romper el contexto del padre. `create` siempre queda como modal (intencional, flow transient).

## Why

Route-mode da URL deep-linkeable + browser history preservado al "Volver" + menu lateral persistente. En embeds del detail padre, route-mode rompe la jerarquia (te sacaria del detail al hacer click en row del embed). Modal preserva el contexto del padre.

## Where

`mods/<m>/config/layouts/<obj>_list.json` (top-level lists). NO en embeds inline de RecordDetail.

## When

Top-level lists con detail rico (multi-tab, embebidos): usar route. Top-level lists simples: cualquier funciona, modal mas rapido. Embeds: siempre modal.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L48 — Session 6 (2026-04-30)
