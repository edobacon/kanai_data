---
id: RULE-AUTH-009
project: pehuen
type: rule
module: auth
level: must
tags:
  - legacy-paridad
  - migration
  - jwt
  - ttl
---

# Access token TTL = 3 horas (10800s); Refresh token TTL = 90 días

## What

Los tokens JWT deben tener los siguientes tiempos de vida exactos:
- **Access token**: `60 * 60 * 3 = 10800` segundos (3 horas).
- **Refresh token**: `60 * 60 * 24 * 90 = 7776000` segundos (90 días).

## Why

Son los valores exactos del legacy. Cambiarlos impacta la UX: reducir el access TTL aumenta los re-logins; reducir el refresh TTL expulsa usuarios que trabajaban semanas sin problema. La paridad es crítica para no degradar la experiencia durante la migración.

## Where

- **Files**: `server/api/auth/login.post.ts`, `server/api/auth/refresh.post.ts`, `server/utils/createToken.ts` (o equivalente), variables de entorno `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` si se externalizan
- **Endpoints**: `POST /api/auth/login`, `POST /api/auth/refresh`
- **Layers**: backend

## When

En cada generación de token (login y refresh). Los TTL deben estar en constantes, no inline como magic numbers.

## Verification

- Test: decodificar el JWT del access token → `exp - iat ≈ 10800`.
- Test: decodificar el JWT del refresh token → `exp - iat ≈ 7776000`.
- `grep -n "10800\|60.*3\|60.*60.*3" server/` → debe aparecer en la generación de token.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/user.md` método `createToken`: `ACCESS: 60 * 60 * 3`, `REFRESH: 60 * 60 * 24 * 90`. Contrato de migración punto 3: "TTL: 3h access, 90d refresh."
- **Related**: RULE-AUTH-010, DEC-002
