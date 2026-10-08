---
id: RULE-suite-selector-tenant-exige-continuar-cache-por-usuario-UPONE-1599
project: up1
type: rule
module: suite
level: must
tags:
  - UPONE-1599
  - tenants
  - auth
---

El selector en / ya no entra al tenant recordado automáticamente: con sesión viva lo preselecciona y Continuar entra a ese u otro sin pasar por login. Se eliminó ?selectTenant=1, Cambiar institución vuelve a /, y un acceso denegado va a /?error=tenant_forbidden&tenant={id}. La caché positiva de 5 minutos de tenant-access se indexa por usuario de Clerk y tenant (up1-tenant-access-{userId}-{TENANT}); sin usuario legible no hay caché, para que el resultado de otro usuario en la misma pestaña no salte el chequeo.

Fuente: bd41c45 utils/tenantEntry.ts:37; 62f4a94 middleware/tenant-access.global.ts:88; composables/useTenantSelection.ts.
