---
id: RULE-suite-010
project: up1
type: rule
module: suite
tags:
  - auth
  - rbac
  - roles
---

# El cambio de rol es asincrono y server-authoritative: `selectRole()` solo aplica si el servidor confirma

## What

`selectRole()` deja de ser un setter local sincrono: llama la mutation `setActiveRole` y solo pinta el nuevo rol en la UI si el servidor lo confirma (`applyRoleLocally` con el rol que el servidor devuelve, no el clickeado). Si la mutation falla, se restaura el rol previo. `loadAvailableRoles()` deja de limpiar el header `X-Selected-Role` para forzar la respuesta union de roles; en su lugar consulta el campo `assignableRoles`.

## Why

Es el lado cliente de [[RULE-core-046]]: el rol activo que decide permisos vive en `core_User.activeRoleId` en el servidor. Un setter local sincrono, o el truco de limpiar `X-Selected-Role` para obtener la union de roles, permitia pintar (o consultar) datos resueltos bajo un rol distinto al que el servidor tiene registrado, lo cual es peor que mostrar que el cambio no ocurrio.

## Source_ref

- `composables/useRoleSelection.ts:62-99` (`selectRole`, async, `try/catch` con `applyRoleLocally(previousRole)` en el catch)
- `composables/useRoleSelection.ts:88` (`const confirmed = data?.setActiveRole?.roles?.[0] ?? role;`: confia en lo que el servidor reporta, no en lo clickeado)
- `composables/useRoleSelection.ts:104-138` (`loadAvailableRoles`, consulta `assignableRoles` en vez de limpiar el header)
- `components/static/Navbar.vue:287` (`const switched = await selectRole(role);`, la UI awaitea antes de refetch)

## Where

- `suite/composables/useRoleSelection.ts`
- `suite/components/static/Navbar.vue`

## When

Al tocar el flujo de seleccion de rol: nunca reintroducir un setter local sincrono ni el patron de limpiar `X-Selected-Role` para ampliar el roster de una consulta. Cualquier cambio de rol pasa por `setActiveRole` y espera su confirmacion antes de repintar la UI.
