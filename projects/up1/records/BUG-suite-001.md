---
id: BUG-suite-001
project: up1
type: bug
module: suite
tags:
  - auth
  - clerk
  - session
  - http-401
---

# Sesión Clerk expirada dejaba al usuario como "Guest" con flood de peticiones 401

## Symptom

Al vencer la sesión de Clerk, la app seguía mostrando al usuario como autenticado (aparecía como "Guest" en vez de redirigir a login) y disparaba un flood continuo de respuestas 401 en vez de cerrar sesión o redirigir de forma ordenada.

## Root cause

- **File**: `composables/useAuth.ts` (antes del fix).
- **Cause**: el cliente decidía el estado de autenticación por la presencia de la cookie `__session`, que persiste incluso después de que la sesión real de Clerk expiró. Al no consultar el estado real de Clerk (`isSignedIn`), el frontend seguía tratando al usuario como logueado y repetía llamadas que el backend rechazaba con 401, sin un punto único que cortara el ciclo.

## Fix

- `useUp1Auth().isAuthenticated` ahora confía en `_clerkAuth.isSignedIn.value === true` cuando Clerk está `isLoaded` (`composables/useAuth.ts:70-72`), y solo cae a la cookie antes de que Clerk cargue o donde `inject()` no aplica (middleware, plugin Apollo).
- Se agrega `handleAuthFailure()` (`composables/useAuth.ts:181`) como entry point único e idempotente, invocado desde tres fuentes: Apollo `onError` (detecta `UNAUTHENTICATED` en `graphQLErrors` y en `networkError`, porque object-manager lo lanza como HTTP 500), `useServerNotifications.handleStreamError` (SSE no expone status, hace un probe fetch para distinguir 401 real de un corte transitorio), y el middleware global de rutas.
- Seguimiento (commit separado, mismo dominio): `middleware/guest.ts` agrega un contador `sessionStorage['up1:authBounce']` (línea 14, `BOUNCE_KEY`); si el cliente rebota 3 veces en menos de 6 segundos hacia el mismo tenant, fuerza `signOut()` (línea 71) en vez de seguir rebotando. `middleware/auth.global.ts` limpia el contador (`clearBounce`, línea 41) al aterrizar con éxito.

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | cualquier usuario con sesión Clerk expirada mientras la SPA sigue montada |
| Data affected | ninguno (solo estado de sesión en cliente) |
| Modules affected | suite (composables/useAuth.ts, useServerNotifications.ts, plugins/apollo.client.ts, middleware/auth.global.ts, middleware/guest.ts) |
| Frequency | siempre que la sesión vence con la app abierta, antes del fix |

## Related

- **Rules**: [[RULE-suite-007]]
- **Source**: recon suite (delta 2026-07-13 → 2026-08-03), verificado contra `composables/useAuth.ts` y `middleware/guest.ts`/`middleware/auth.global.ts` actuales.
