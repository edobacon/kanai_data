---
id: RULE-AUTH-006
project: pehuen
type: rule
module: auth
level: must
tags:
  - legacy-paridad
  - migration
  - seguridad
  - password
---

# Solo el dueño o un ADMINISTRADOR puede cambiar el password de un usuario

## What

El endpoint `PATCH /api/auth/password/:id` solo puede ser llamado exitosamente por: (a) el mismo usuario cuyo password se cambia (dueño), o (b) un ADMINISTRADOR. Cualquier otro rol que intente cambiar el password de un tercero debe recibir 403.

## Why

El password es credencial de autenticación. Permitir que un SUPERVISOR cambie el password de un RECEPTOR sin ser ADMINISTRADOR sería una escalada de privilegios lateral que podría usarse para tomar control de cuentas ajenas.

## Where

- **Files**: `server/api/auth/password/[id].patch.ts`
- **Endpoints**: `PATCH /api/auth/password/:id`
- **Layers**: backend (guard post-autenticación)

## When

En cada solicitud de cambio de password. El guard verifica: `solicitante._id === target._id || solicitante.role === 'ADMINISTRADOR'`.

## Verification

- Test: SUPERVISOR intenta cambiar password de un RECEPTOR → 403.
- Test: usuario cambia su propio password → 200.
- Test: ADMINISTRADOR cambia password de cualquier usuario → 200.
- Además, ver RULE-AUTH-007 para validación de longitud mínima.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/user.md` contrato de migración punto 6 (min 8 chars) y side effects: "Solo dueño o ADMINISTRADOR puede cambiarlo". Referencia código: `auth.controller.ts:235`.
- **Related**: RULE-AUTH-003, RULE-AUTH-007
