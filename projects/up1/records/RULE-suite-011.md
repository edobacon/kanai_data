---
id: RULE-suite-011
project: up1
type: rule
module: suite
tags:
  - auth
  - tenant
  - membership
---

# El bypass del gate de membresia es solo server-to-server, con `X-Internal-Service-Key`, mas refresh de token Clerk

## What

`sync-user` llama a object-manager con el header interno `X-Internal-Service-Key` para saltar el gate de membresia de tenant, permitiendo que `syncUser` registre un tenant que aun no esta en la lista del usuario. Despues del sync, se fuerza un refresh de token de Clerk (`skipCache: true`) para que el claim del tenant nuevo llegue de inmediato.

## Why

`syncUser` sigue rechazando usuarios no aprovisionados, asi que el bypass no amplia el acceso: solo evita que el propio gate de membresia bloquee la llamada que otorga la membresia. Esto es lo que hace aceptable el patron, y es la unica razon por la que no debe reusarse en un flujo que el cliente pueda invocar directamente: la key es de confianza server-to-server, nunca debe llegar al navegador.

## Source_ref

- `server/api/auth/sync-user.post.ts:80` (`'X-Internal-Service-Key': config.internalServiceKey,`)
- `server/api/auth/sync-user.post.ts:76-78` (comentario: "Trusted server-to-server call: use the internal service key to bypass the tenant gate, so syncUser can record a tenant not yet in the user's list. syncUser still rejects unprovisioned users, so no access is widened.")
- `middleware/tenant-access.global.ts:94-97` (refresh de token best-effort: `await (window as any).Clerk?.session?.getToken({ skipCache: true });` dentro de un `try/catch` no fatal)

## Where

- `suite/server/api/auth/sync-user.post.ts`
- `suite/middleware/tenant-access.global.ts`

## When

Al agregar un flujo nuevo que necesite saltar un gate de autorizacion: usar este patron (header interno server-to-server) solo si la llamada nunca se origina en el cliente y el endpoint destino conserva su propia validacion de negocio (aqui, `syncUser` sigue rechazando no aprovisionados). No propagar `X-Internal-Service-Key` a codigo que corre en el navegador.
