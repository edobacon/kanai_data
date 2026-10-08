---
id: RULE-object-manager-syncuser-clave-interna-UPONE-1933
project: up1
type: rule
module: object-manager/auth
level: must
tags:
  - UPONE-1933
  - syncUser
  - service-key
---

La mutación syncUser rechaza cualquier contexto sin isInternalService === true, que solo fija una clave interna válida. hasValidInternalServiceKey exige INTERNAL_SERVICE_KEY no vacía y un header string no vacío, porque timingSafeStringEqual('','') daría true. La clave se lee del env en cada llamada y se omite el gate de membresía del tenant.

Fuente: b11cbe22 src/services/auth/internalServiceKey.js:18-23; src/graphql/resolvers/user.resolver.js:372-378.
