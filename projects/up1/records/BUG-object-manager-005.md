---
id: BUG-object-manager-005
project: up1
type: bug
module: object-manager
tags:
  - rbac
  - permissions
  - roles
  - getMyPermissions
  - mcp-limitation
---

# `getMyPermissions` con `X-Selected-Role` colapsa el roster de roles al rol activo

## Symptom

`getMyPermissions` resuelve en el contexto del rol activo: si el request envía `X-Selected-Role`, el campo `roles[]`/`availableRoles` devuelve **solo ese rol**, no el roster completo del usuario. Tras `set_active_role(Coordinador)`, `availableRoles` colapsaba a `[Coordinador]`, impidiendo volver a otro rol.

## Expected behavior

El roster de roles disponibles del usuario debería ser estable e independiente del rol activo seleccionado; cambiar de rol no debería borrar los demás roles disponibles.

## Root cause

- **File**: object-manager — resolver `getMyPermissions` / resolución de `roleAssignments` bajo `X-Selected-Role`.
- **Cause**: el resolver calcula roles disponibles en el contexto del rol seleccionado en vez del contexto base del usuario.

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | usuarios multi-rol que cambian de rol |
| Data affected | roster de roles devuelto |
| Modules affected | object-manager (RBAC), consumidores que permiten cambiar rol (suite, up1-mcp) |
| Frequency | siempre que se envía X-Selected-Role |

## Reproduction

### Steps
1. Usuario con varios roles llama `getMyPermissions` con `X-Selected-Role: Coordinador`.
2. `availableRoles` devuelve solo `[Coordinador]` (esperado: roster completo).

## Workaround

`up1-mcp` obtiene el roster SIEMPRE con contexto base (sin `X-Selected-Role`) y lo cachea; pide las capabilities con el rol activo. Workaround del cliente (S1).

## Solution

Propuesta: separar en el resolver la resolución del roster (contexto base) de la resolución de capabilities (rol activo). Decisión de up1 (P3).

## Related

- **Rules**: [[RULE-mcp-002]], [[RULE-mcp-004]], [[RULE-core-046]].
- **Specs**: SPEC-mcp-architecture (§4.3).
- **Origen**: descubierto en la build del MCP (S1, 2026-06-06); registrado vía TICKET-080.

## Superseded

UPONE-1353 elimina `X-Selected-Role` como fuente de autorización: el rol activo pasa a resolverse server-side desde `core_User.activeRoleId` (ver [[RULE-core-046]]), y el header sobrevive solo como hint cuyo mismatch se loguea, nunca se obedece. El mecanismo completo que causaba este bug (calcular el roster en el contexto del rol seleccionado) desapareció junto con la dependencia del header. `getMyPermissions`/el contrato de rol expone ahora el campo `assignableRoles`, que da el roster completo independiente del rol activo — la separación que este bug pedía como solución propuesta. No queda un fix puntual que aplicar sobre el código viejo: se reemplazó el mecanismo entero.
