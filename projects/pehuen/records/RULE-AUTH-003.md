---
id: RULE-AUTH-003
project: pehuen
type: rule
module: auth
level: must
tags:
  - legacy-paridad
  - migration
  - roles
  - seguridad
---

# Solo ADMINISTRADOR puede crear, editar o cambiar password de otro ADMINISTRADOR

## What

Ningún usuario que no sea ADMINISTRADOR puede: (a) crear un usuario con `role: 'ADMINISTRADOR'`, (b) editar los datos de un usuario que ya tiene `role: 'ADMINISTRADOR'`, ni (c) cambiar el password de un ADMINISTRADOR. Intentos de otros roles deben rechazarse con 403.

## Why

Evitar escalada de privilegios. Si un SUPERVISOR o RECEPTOR pudiera editar un ADMINISTRADOR, podría cambiar su password o cancha y tomar control del sistema. Esta restricción existía en el legacy y debe preservarse exactamente.

## Where

- **Files**: `server/api/auth/users/index.post.ts`, `server/api/auth/users/[id].patch.ts`, `server/api/auth/password/[id].patch.ts`
- **Endpoints**: `POST /api/auth/create`, `PATCH /api/auth/user/:id`, `PATCH /api/auth/password/:id`
- **Layers**: backend (guard después de `requireRole`)

## When

En cada operación de escritura sobre usuarios. El guard debe verificar el rol del usuario target, no solo del solicitante.

## Verification

- Test: SUPERVISOR intenta crear usuario ADMINISTRADOR → 403.
- Test: SUPERVISOR intenta editar usuario ADMINISTRADOR existente → 403.
- Test: ADMINISTRADOR crea/edita otro ADMINISTRADOR → 201/200.
- `grep -n "ADMINISTRADOR" server/api/auth/` → deben existir guards explícitos referenciando el rol del target.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/user.md` contrato de migración punto 8: "Solo ADMINISTRADOR puede tocar otros ADMINISTRADOR". Referencia código: `auth.controller.ts:39, 147`.
- **Related**: RULE-AUTH-006, DEC-008
