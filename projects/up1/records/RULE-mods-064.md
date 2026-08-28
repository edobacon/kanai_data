---
id: RULE-mods-064
project: up1
type: rule
module: mods
tags:
  - rbac
  - soft-delete
  - retention
  - uengagement
  - seed
---

# retention/uengagement: soft-delete via `metadata.softDelete` debe ir acompañado de la capability `<object>:delete` explícita en el seed RBAC

## What

Cuando un objeto de un mod declara `metadata.softDelete: { field: ... }`, el rol que tenga `canDelete:true` en su layout SHOULD tener también la capability `<object>:delete` sembrada explícitamente en el seed RBAC. Un layout con `canDelete:true` sin la capability correspondiente deja un gap entre lo que la UI ofrece y lo que el backend autoriza.

## Why

`ActivityType.json` habilitó `metadata.softDelete: { field: "isActive" }` (borrado lógico en vez de físico) y se agregó `activitytype:delete` al seed RBAC del rol admin junto con un comentario explicando que el layout ya exponía `canDelete:true` sin la capability correspondiente. El gap se detectó al implementar el soft-delete, no antes; de no corregirse, la UI habría mostrado una acción de borrado que el backend rechazaría (o peor, que pasaría sin chequeo si no hay guarda server-side).

## Where

- `mods/uengagement-up1/objects/ActivityType.json:11` (`metadata.softDelete`)
- `mods/uengagement-up1/seed/_data-rbac.js:105` (`'activitytype:delete'`)

## When

Al declarar `metadata.softDelete` en cualquier objeto de mod, o al revisar un layout con `canDelete:true`: confirmar que la capability `<object>:delete` está en el seed RBAC del/los roles que deben poder ejecutarlo.
