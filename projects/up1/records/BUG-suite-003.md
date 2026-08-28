---
id: BUG-suite-003
project: up1
type: bug
module: suite
tags:
  - auth
  - tenant
  - membership
---

# El login a un segundo tenant quedaba bloqueado antes de poder otorgar la membresia

## Symptom

Un usuario que ya tenia sesion en un tenant no podia iniciar sesion en un segundo tenant: el login quedaba bloqueado antes de que se le pudiera otorgar la membresia al tenant nuevo.

## Expected behavior

Un usuario con sesion activa en un tenant deberia poder iniciar sesion en un segundo tenant y recibir la membresia correspondiente, sin quedar bloqueado por el gate de acceso antes de que esa membresia se otorgue.

## Root cause

File: `server/api/auth/sync-user.post.ts`, `middleware/tenant-access.global.ts`
Cause: solo se registraba el primer tenant al que el usuario iniciaba sesion. El gate de membresia de tenant (que valida contra el claim `up1Tenants` del JWT de Clerk) rechazaba cualquier tenant posterior antes de que `syncUser` pudiera registrarlo, porque la llamada a `sync-user` pasaba por el mismo gate que protege al resto de las requests.

## Fix

`sync-user` ahora llama a object-manager con el header interno `X-Internal-Service-Key` (`server/api/auth/sync-user.post.ts:80`) para saltar el gate de membresia solo en esa llamada server-to-server, permitiendo que `syncUser` registre el tenant nuevo. `syncUser` sigue rechazando usuarios no aprovisionados, asi que el bypass no amplia el acceso. Despues del sync, `middleware/tenant-access.global.ts` fuerza un refresh de token Clerk (`skipCache: true`) para que el claim del tenant nuevo este disponible de inmediato. Ver [[RULE-suite-011]].

## Impact

| Area | Antes | Despues |
|---|---|---|
| Login a un tenant nuevo | Bloqueado si el usuario ya tenia sesion en otro tenant | Se otorga la membresia y el login procede |
| Token Clerk | El claim del tenant nuevo podia tardar en llegar | Refresh forzado (`skipCache: true`) tras el sync |

## Reproduction

### Steps
1. Iniciar sesion en el Tenant A.
2. Sin cerrar sesion, intentar iniciar sesion en el Tenant B.
3. Verificar que el gate de membresia de tenant bloquea el acceso antes de que `syncUser` pueda registrar la membresia nueva.
