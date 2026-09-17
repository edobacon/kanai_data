---
id: BUG-suite-sse-no-tenant-membership-check-UPONE-1779
project: up1
type: bug
module: suite
---

El guard de navegacion que chequea membresia corre solo client-side y nunca ve un request directo al endpoint. El handler ahora chequea publicMetadata.up1Tenants (ya cargado del usuario de Clerk) antes de abrir el stream, y responde 403 si no hay membresia. Ademas: un tenantId de query PRESENTE pero no resoluble se rechaza (400) en vez de caer al tenant de Clerk.

**sourceRef:** d0373f8 + server/api/notifications/stream.get.ts:42-74.
