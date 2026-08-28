---
id: BUG-platform-004
project: up1
type: bug
module: platform
tags:
  - rowactions
  - modal
  - mode-hardcoded
---

# `rowActions` con `targetLayoutType: "RecordDetail"` siempre abre en `mode: "create"` hardcoded

## Symptom

`rowActions` custom con `type: "modal"` y `targetLayoutType: "RecordDetail"` siempre abre el modal en `mode: "create"` hardcoded — no se respeta el `mode` declarado en el `layoutConfig` del layout target ni hay forma desde JSON de declarar `targetMode: "edit"`. Tampoco se pasa `instanceId`.

## Expected behavior

`rowActions` deberia aceptar `targetMode: "edit" | "view" | "create"` y pasar `instanceId` para que se abra el detail del row clickeado en el mode correcto.

## Root cause

[useRowActionHandler.ts:274](../../../up1/layout/src/composables/useRowActionHandler.ts#L274) — `mode: "create"` esta hardcodeado en el payload del modal trigger, sin path para parametrizar.

## Impact

`rowActions` custom no soporta editar records existentes desde un embed RecordList — solo crear. Para editar hay que usar `canEdit: true` + `associatedLayoutConfigs.edit`, que solo funciona cuando RecordDetail padre esta en `mode: edit` (ver [BUG-platform-003](bug-platform-003.md)).

**Combinacion BUG-platform-003 + BUG-platform-004**: no hay forma desde el config del mod de tener "Edit por elemento" en un embed cuando el detail padre esta en view.

## Workaround

Usar `canEdit: true` + `associatedLayoutConfigs.edit` y poner el padre en mode edit. Para fix real, PR a plataforma agregando `action.targetMode` y pase de `instanceId`.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L38 — Session 5 (2026-04-30)
