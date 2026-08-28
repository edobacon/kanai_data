---
id: RULE-suite-007
project: up1
type: rule
module: suite
tags:
  - auth
  - clerk
  - session
  - routing
---

# "Logged in" = sesión Clerk real, nunca solo la cookie `__session`; "new" es palabra reservada en el segmento `instance_id`

## What

1. El estado de autenticación se decide por la sesión real de Clerk, no por la mera presencia de la cookie `__session`. `useUp1Auth().isAuthenticated` confía en `_clerkAuth.isSignedIn` cuando Clerk ya está `isLoaded`; solo cae a la cookie antes de que Clerk cargue o donde `inject()` no aplica (middleware, plugin de Apollo).
2. En la ruta de detalle `/{tenant_id}/{object_name}/{instance_id}/{view_type}/{layout_id}`, el valor `"new"` en el segmento `instance_id` es un sentinel reservado: fuerza modo create en LayoutOrchestrator/RecordDetail. No puede usarse como id real de instancia.

## Why

UPONE-1469: la cookie `__session` persiste después de que la sesión Clerk expira, por lo que decidir auth solo por la cookie dejaba al usuario mostrado como autenticado ("Guest" con flood de 401) cuando en realidad la sesión ya había vencido. El fix unifica el criterio en `isAuthenticated`, y agrega `handleAuthFailure()` como entry point único e idempotente, invocado desde Apollo `onError`, `useServerNotifications` y el middleware de rutas. Ver [[BUG-suite-001]] para el detalle del bug y su fix.

UPONE-1377: habilitar `openMode.create: "route"` en layouts de lista requiere una forma de representar "crear una instancia nueva" dentro del mismo patrón de ruta que edita una instancia existente; el sentinel `"new"` cumple ese rol. Cualquier objeto de negocio cuyo id real pudiera colisionar con el literal `"new"` rompería el enrutamiento.

## Where

- **Files**:
  - `composables/useAuth.ts:isAuthenticated` (computed, línea ~70), `composables/useAuth.ts:handleAuthFailure` (línea ~181)
  - `composables/useServerNotifications.ts:handleStreamError`
  - `plugins/apollo.client.ts`
  - `middleware/auth.global.ts`, `middleware/guest.ts`
  - `pages/[tenant_id]/[object_name]/[instance_id]/[view_type]/[layout_id]/index.vue:instanceId` (línea 100: `rawInstanceId.value === 'new' ? '' : rawInstanceId.value`)

## When

- Antes de agregar cualquier lógica nueva que decida "¿el usuario está logueado?" en suite: usar `useUp1Auth().isAuthenticated`, nunca inspeccionar la cookie `__session` directamente salvo en los puntos ya documentados donde `inject()` no aplica.
- Antes de generar o validar un id de instancia de negocio: verificar que nunca pueda ser el literal `"new"`.

## Source

- **Discovered in**: recon suite (delta 2026-07-13 → 2026-08-03), UPONE-1469 y UPONE-1377.
- **Evidence**: `composables/useAuth.ts:61` (comentario "real Clerk session validity - NOT the mere presence of the..."), línea 71 `if (_clerkAuth && _clerkAuth.isLoaded?.value)`, línea 72 `return _clerkAuth.isSignedIn.value === true`. `pages/[tenant_id]/[object_name]/[instance_id]/[view_type]/[layout_id]/index.vue:100` verificado.
- **Related**: [[BUG-suite-001]]
