---
id: RULE-AUTH-002
project: pehuen
type: rule
module: auth
level: must
tags:
  - legacy-paridad
  - migration
  - cancha
  - roles
---

# RECEPTOR no puede tener `cancha = 'ALL'`

## What

Un usuario con rol `RECEPTOR` nunca puede tener `cancha` asignada al literal `'ALL'`. El intento de asignar `'ALL'` a un RECEPTOR debe ser rechazado con error 400.

## Why

El RECEPTOR opera en una cancha física específica. Darle visibilidad total equivale a escalar sus privilegios a nivel de ADMINISTRADOR sin serlo. La regla protege el scope de datos por cancha que es central al modelo de seguridad del sistema.

## Where

- **Files**: `server/api/auth/cancha.patch.ts` (o equivalente), `server/api/auth/users/[id].patch.ts`
- **Endpoints**: `PATCH /api/auth/cancha`, `PATCH /api/auth/user/:id`
- **Layers**: backend (validación en handler), posiblemente schema Zod contextual

## When

Siempre que se actualice el campo `cancha` de un usuario. La validación debe ocurrir antes de persistir, independientemente de si el cambio viene de un ADMINISTRADOR o del propio usuario.

## Verification

- Test: `PATCH /api/auth/cancha` con `{ cancha: 'ALL' }` para un usuario RECEPTOR → 400.
- Test: crear usuario RECEPTOR con `cancha: 'ALL'` → 400.
- `grep -rn "RECEPTOR.*ALL\|cancha.*ALL" server/api/auth/` → debe existir guard explícito.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/user.md` — nota en campo `cancha`: "Receptor NO puede tener `'ALL'`". Ídem en config.yaml key_concepts.
- **Related**: RULE-AUTH-001, RULE-AUTH-004
