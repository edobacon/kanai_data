---
id: BUG-mods-023
project: up1
type: bug
module: mods
tags:
  - up1-manager
  - rbac
  - roles
  - context
  - ux
---

# Asignar un rol desde el detalle de usuario lo otorgaba a toda la institucion sin aviso

## Symptom

De las tres vias para asignar un rol a un usuario, la del detalle de usuario no pedia contexto
(sede, sucursal, etc.). La asignacion no fallaba: otorgaba el rol a toda la institucion sin decirlo,
lo que es peor que un error visible porque el otorgamiento silencioso pasa desapercibido.

## Expected behavior

Asignar un rol desde el detalle de usuario deberia pedir el contexto (sede, sucursal, etc.) antes de confirmar, igual que las otras dos vias de asignacion, en vez de otorgar el rol a toda la institucion sin avisarlo.

## Root cause

File: `mods/up1-manager/config/layouts/core_user_account_edit.json`

Cause: el `canCreateAction` de la lista de roles del usuario mandaba
`contextId: "{{CURRENT_TENANT_CONTEXT_ID}}"` de forma fija, que el backend resuelve a la raiz del
tenant. Las otras dos vias de asignacion (desde el detalle de rol) si pedian el contexto al usuario
antes de confirmar.

## Fix

Se unifica la configuracion en el sublayout compartido `user-roles-list.json`: paso previo de
seleccion de contexto, filtro `HAS_NONE (userId, contextId)` (evita ofrecer una asignacion ya
existente para ese contexto) y aviso de alcance al remover ("elimina el rol solo en el contexto de
esa fila", en vez del dialogo generico de borrado permanente). El detalle de usuario ahora consume el
mismo sublayout que el detalle de rol, en vez de declarar su propio `canCreateAction` desactualizado.

## Impact

| Area | Antes | Despues |
|---|---|---|
| Alcance de la asignacion | Otorgaba el rol a toda la institucion sin preguntar | Exige elegir el contexto antes de confirmar |
| Consistencia | Las 3 vias de asignacion se comportaban distinto | Las 3 comparten la misma configuracion (sublayout) |
| Remocion | Dialogo generico ("elimina 1 Role Assignment") | Nombra el rol y aclara que el alcance es solo esa fila/contexto |

## Reproduction

### Steps
1. Ir al detalle de un usuario y asignarle un rol desde la lista de roles del usuario.
2. Confirmar la asignacion.
3. Verificar que el rol queda otorgado a nivel institucion completa, sin que la UI haya pedido elegir un contexto (sede/sucursal).
