---
id: RULE-suite-004
project: up1
type: rule
module: suite
tags:
  - auth
  - clerk
  - claude-md-outdated
---

# Suite UP1 usa Clerk para auth — NO Auth0 (CLAUDE.md desactualizado)

## What

La autenticacion del suite UP1 (Nuxt 4) usa **Clerk** como provider de auth + session management. NO Auth0 como sugiere el CLAUDE.md global del repo.

Evidencia empirica:

- Suite local-dev en `localhost:3000` redirige a `/login/UPU` cuando no hay sesion
- Headers del response identifican Clerk: `x-clerk-auth-reason: dev-browser-missing` (cuando falta el dev browser session)
- Stack: Clerk session token en cookie (no Auth0 JWT)

CLAUDE.md (global) tiene texto desactualizado:

> "Suite uses **Auth0** for authentication with **HTTP-only cookie** token storage (XSS/CSRF protected). Server middleware validates tokens. The `useAuth` composable provides auth state in Vue components. Configuration lives in `suite/.env` (`AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`)."

→ Auth0 NO esta en uso. Real: Clerk via `@clerk/nuxt` (presumiblemente) o equivalente.

## Why

Refactor previo migro auth de Auth0 a Clerk pero CLAUDE.md no se actualizo. Confunde a:

- Devs nuevos que buscan `.env` con `AUTH0_DOMAIN` y no lo encuentran
- Tests automatizados que asumen Auth0 JWT flow
- LLMs que generan codigo de autenticacion siguiendo CLAUDE.md → falla en runtime

Importante para automatizacion: si queres correr Playwright contra UPU con storage state pre-autenticado (ej. para axe-core en BUG-platform-017), necesitas Clerk session, no Auth0 — la diferencia cambia el setup del test fixture.

## Where

- **Files**:
  - Suite middleware: `up1/suite/server/middleware/` o `up1/suite/middleware/`
  - Composables: `up1/suite/composables/useAuth.ts` (si existe — verificar API real)
  - Config: `up1/suite/.env` (vars Clerk, NO Auth0)
  - Doc desactualizada: `up1/CLAUDE.md` seccion "Authentication"
- **Layers**: frontend (Nuxt middleware + composables)

## When

Aplica cuando:

- Configuras env del suite local-dev
- Escribis tests E2E o smoke que requieren auth
- Setupeas Playwright con storageState pre-autenticado (BUG-platform-017)
- Actualizas CLAUDE.md o docs del root

## Verification

```bash
# Verificar empirico Clerk
curl -sI http://localhost:3000 2>&1 | grep -i clerk
# Expected: x-clerk-auth-reason: dev-browser-missing

# Verificar env del suite
grep -E "CLERK|AUTH0" up1/suite/.env
# Expected: CLERK_* keys, no AUTH0_*

# Verificar imports
grep -rln "@clerk" up1/suite/
# Expected: matches en middleware, composables, plugins
```

## Source

- **Discovered in**: TICKET-025, Session 3 (S3.T4 smoke UPU bloqueado por auth)
- **Evidence**: Intente smoke automatizado sobre `/UPU/activity/aa-uv-1124` desde Playwright sin auth. Suite respondio 302 → `/login/UPU` + header `x-clerk-auth-reason: dev-browser-missing`. CLAUDE.md prometia Auth0, pero Clerk era el real provider. Aprendizaje L15 del ticket. BUG-platform-017 incluye plan de setup Playwright con Clerk storageState
- **Related**: BUG-platform-017 (axe-core deferred — requiere Clerk storageState)
