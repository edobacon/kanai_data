---
id: RULE-layout-error-classifier-403-UPONE-1790
project: up1
type: rule
module: layout
---

useFriendlyErrors ya no clasifica un error como RBAC/permiso solo porque el texto contenga "forbidden" o "403". Solo clasifica como permiso si hay una frase RBAC especifica o un extensions.code declarado (FORBIDDEN/TENANT_FORBIDDEN/PERMISSION_DENIED). Un 403 de infraestructura (WAF/gateway por tamaño de payload) cae en un mensaje generico, severidad 'warning', sin exponer el mensaje tecnico crudo.

**sourceRef:** ca289c3e + src/composables/useFriendlyErrors.ts (ERROR_PATTERNS ~L336, clasificacion ~L503-568).
