---
id: RULE-suite-sse-register-under-viewed-tenant-UPONE-1779
project: up1
type: rule
module: suite
---

La conexion se keyeaba por el tenant de publicMetadata de Clerk con default literal 'UPU', mientras los productores publican el tenant del dato que cambio: cualquier usuario fuera de UPU quedaba registrado bajo la key equivocada y el fan-out no llegaba (el push seguia respondiendo 200). El cliente ahora manda el tenant de la ruta actual y reconecta cuando cambia; el server lo canonicaliza contra la config de tenants y rechaza lo que no puede resolver.

**sourceRef:** 229db5f + composables/useServerNotifications.ts:18-37 (streamUrl/connectedTenantId).
