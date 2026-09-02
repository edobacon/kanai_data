---
id: RULE-AUTH-001
project: pehuen
type: rule
module: auth
level: must
tags:
  - legacy-paridad
  - migration
  - cancha
---

# `User.cancha` admite el literal `'ALL'` como sentinel — no es ObjectId

## What

El campo `User.cancha` acepta dos formas de valor: un ObjectId-as-string apuntando a una Cancha, o el literal `'ALL'`. El literal `'ALL'` es un sentinel que indica que el usuario puede ver todas las canchas del sistema. No es un ObjectId ni un null; es un string ordinario con semántica especial.

## Why

El legacy almacena `cancha: 'ALL'` directamente en MongoDB para usuarios ADMINISTRADOR y SUPERVISOR. La lógica de autorización (scopeByCancha) detecta este literal para omitir el filtro de cancha en las queries. Cambiar esta semántica a `null` o `undefined` requeriría migrar la colección completa de usuarios y actualizar todos los puntos del código que filtran por cancha.

## Where

- **Files**: `server/models/user.model.ts`, `server/utils/scopeByCancha.ts`, `shared/constants/mongodb-ids.ts` (verificar si se define aquí)
- **Tables**: colección `users`, campo `cancha`
- **Endpoints**: `PATCH /api/auth/cancha`, `GET /api/auth/users`, cualquier endpoint que aplique `scopeByCancha`
- **Layers**: backend, database

## When

Siempre que se lea, escriba o valide `User.cancha`. El schema Zod debe permitir `z.string()` sin restricción de ObjectId válido para este campo.

## Verification

- `grep -r "cancha.*ALL\|ALL.*cancha" server/ shared/` → debe aparecer en `scopeByCancha` y en la validación de cambio de cancha.
- Test unitario: crear usuario con `cancha: 'ALL'` → no rechazado por validación de formato.
- Test: `scopeByCancha` con `user.cancha === 'ALL'` no agrega filtro `{ cancha: ... }` a la query Mongo.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/user.md` — campo `cancha: String` con nota explícita `ObjectId-as-string de Cancha **o** literal 'ALL'`. Config `config.yaml` key_concepts: `"Cancha 'ALL': sentinela string para usuarios admin que ven todas las canchas"`.
- **Related**: RULE-AUTH-002, DEC-002
