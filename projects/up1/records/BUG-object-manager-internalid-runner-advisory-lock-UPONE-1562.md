---
id: BUG-object-manager-internalid-runner-advisory-lock-UPONE-1562
project: up1
type: bug
module: object-manager
tags:
  - UPONE-1562
  - sp11
  - internalId
  - migraciones
---

Dos ejecuciones concurrentes del runner (deploy mas reintento manual, o un rollout atascado) podian competir por el drop y rebuild del indice invalido y dejar un indice invalido nuevo. Se agrego pg_advisory_lock de sesion alrededor de todo el paso por tenant, liberado en finally, con el mismo patron que el swap de UUID de la fase 2 de UPONE-1560.

sourceRef: 2fd1d45b scripts/migrate-internal-id.js:173
