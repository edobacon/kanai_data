---
id: RULE-AUTH-010
project: pehuen
type: rule
module: auth
level: must
tags:
  - migration
  - seguridad
  - cookies
  - jwt
---

# Tokens viajan en cookies `httpOnly` — no en `Authorization` header ni `localStorage`

## What

Los tokens JWT (access y refresh) se transmiten exclusivamente mediante cookies `httpOnly`. El cliente nunca lee el token desde `document.cookie` ni desde `localStorage`. El servidor setea las cookies en el login y las borra en el logout. El middleware de autenticación lee el token desde la cookie, no desde el header `Authorization`.

## Why

Mejora crítica de seguridad respecto al legacy (que usaba `localStorage`). Una cookie `httpOnly` es inaccesible desde JavaScript del cliente, eliminando el vector XSS de robo de token. Es la práctica recomendada por OWASP para tokens de sesión.

## Where

- **Files**: `server/api/auth/login.post.ts`, `server/api/auth/logout.post.ts`, `server/middleware/auth.ts`
- **Endpoints**: `POST /api/auth/login` (setCookie), `POST /api/auth/logout` (clearCookie), todos los endpoints protegidos (leen cookie)
- **Layers**: backend (middleware y handlers de auth)

## When

Siempre. No existe modo de compatibilidad con `Authorization: Bearer`. El middleware de autenticación NO debe leer headers de Authorization.

## Verification

- Test: login → response contiene `Set-Cookie: access_token=...; HttpOnly`.
- Test: login → response contiene `Set-Cookie: refresh_token=...; HttpOnly`.
- Test: llamar endpoint protegido sin cookie → 401.
- Test: llamar endpoint protegido con cookie válida → 200.
- `grep -rn "Authorization\|localStorage" server/middleware/auth.ts` → 0 matches.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen_nuxt/docs/07-migration-notes/improvements.md` sección 1.1: "Token JWT viaja en cookie `httpOnly: true` (nuxt) en lugar de `Authorization: Bearer ${localStorage.token}` (legacy)." Config `config.yaml`: `auth: "JWT httpOnly cookies (access_token + refresh_token)"`.
- **Related**: RULE-AUTH-009, DEC-002
