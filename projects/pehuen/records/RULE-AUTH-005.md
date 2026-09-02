---
id: RULE-AUTH-005
project: pehuen
type: rule
module: auth
level: must
tags:
  - legacy-paridad
  - migration
  - seguridad
---

# Un usuario no puede cambiar su propio `active` vía toggle-status

## What

El endpoint `PATCH /api/auth/user-status/:id` (toggle de campo `active`) debe rechazar la operación si el `:id` coincide con el `id` del usuario autenticado que hace la solicitud. El auto-desactivarse está prohibido.

## Why

Si un administrador pudiera desactivarse a sí mismo accidentalmente, perdería acceso al sistema sin que nadie pudiera reactivarlo (si es el único administrador). Es una protección contra lock-out. El legacy implementa este guard.

## Where

- **Files**: `server/api/auth/user-status/[id].patch.ts`
- **Endpoints**: `PATCH /api/auth/user-status/:id`
- **Layers**: backend (guard antes de la operación de toggle)

## When

Siempre que se ejecute el toggle de status. El guard compara `params.id` con `event.context.user._id` (o `.id`).

## Verification

- Test: usuario ADMINISTRADOR llama `PATCH /api/auth/user-status/{su_propio_id}` → 400 o 403.
- Test: ADMINISTRADOR hace toggle de otro usuario → 200, `active` invertido.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/user.md` side effects: "`PATCH /auth/user-status/:id` — Toggle: `user.active = !user.active`". El guard de auto-toggle es comportamiento legacy verificado (verificar en `auth.controller.ts` la comparación de `req.user.id` vs `params.id`).
- **Related**: RULE-AUTH-003
