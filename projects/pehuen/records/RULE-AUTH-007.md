---
id: RULE-AUTH-007
project: pehuen
type: rule
module: auth
level: must
tags:
  - legacy-paridad
  - migration
  - password
  - validacion
---

# Password requiere mínimo 8 caracteres

## What

Todo password (en creación de usuario y en cambio de password) debe tener al menos 8 caracteres. Passwords más cortos deben rechazarse con error 400 antes de intentar hashear.

## Why

Requisito mínimo de seguridad documentado en el legacy. Passwords muy cortos son trivialmente vulnerables a ataques de fuerza bruta. El límite de 8 es paridad con el comportamiento actual en producción.

## Where

- **Files**: `shared/schemas/user.schema.ts` (Zod: `z.string().min(8)`), `server/api/auth/users/index.post.ts`, `server/api/auth/password/[id].patch.ts`
- **Endpoints**: `POST /api/auth/create`, `PATCH /api/auth/password/:id`
- **Layers**: shared schema (validación cliente y server), backend

## When

Siempre que se procese un password. La validación debe ocurrir en el schema Zod compartido para garantizar consistencia entre frontend y backend.

## Verification

- Test schema: `z.string().min(8)` rechaza `'1234567'` (7 chars), acepta `'12345678'` (8 chars).
- Test endpoint: `POST /api/auth/create` con `password: 'corto'` → 400.
- Test endpoint: `PATCH /api/auth/password/:id` con `password: '1234567'` → 400.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/user.md` contrato de migración punto 6: "Min password 8 chars (`auth.controller.ts:235`)".
- **Related**: RULE-AUTH-006, RULE-AUTH-008
