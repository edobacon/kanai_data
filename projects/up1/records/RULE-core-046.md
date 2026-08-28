---
id: RULE-core-046
project: up1
type: rule
module: core
tags:
  - rbac
  - active-role
  - server-authoritative
  - multi-tenant
  - security
---

# El rol activo del request se resuelve server-side, nunca desde un header del cliente

## What

El rol bajo el que opera un request de GraphQL MUST resolverse en el servidor a partir de `core_User.activeRoleId` (FK nullable a `core_Role`, por tenant), via `resolveActiveRole()`. El header `X-Selected-Role` se acepta como hint pero nunca se obedece: un mismatch entre el header y el rol resuelto server-side se loguea (`rbac.active_role_mismatch`), no se usa para calcular permisos.

## Why

Antes de esto, el scope de permisos de nueve consumidores del backend dependia del patron `if (selectedRole) { filter }` sobre el valor de `X-Selected-Role`, un header que la Suite llenaba desde un `window` global respaldado por `localStorage`. Omitir el header ampliaba los permisos efectivos a la union de todos los roles asignados al usuario: una restriccion controlada por un header del cliente no es enforcement. `resolveActiveRole()` mantiene esos nueve consumidores intactos y cambia solo el origen del valor.

Source_ref: `object-manager/src/services/auth/activeRole.js:69` (`resolveActiveRole`), jsdoc con el orden completo de resolucion en `:23-43`.

## Where

`object-manager/src/services/auth/activeRole.js` (fuente de verdad), `src/index.js` (llena `context.selectedRole` con el resultado). Cualquier resolver que hoy lea `context.selectedRole` sigue funcionando igual; lo que cambia es de donde sale ese valor.

## When

Al escribir o revisar un resolver nuevo que necesite el rol activo del request: leer `context.selectedRole`, nunca el header `X-Selected-Role` directamente. Al depurar un permiso inesperado, revisar el log `rbac.active_role_mismatch` antes de asumir que el header manda.
