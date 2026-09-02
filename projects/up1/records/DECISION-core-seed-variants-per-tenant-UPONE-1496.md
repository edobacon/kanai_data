---
id: DECISION-core-seed-variants-per-tenant-UPONE-1496
project: up1
type: decision
module: object-manager
tags:
  - UPONE-1495
  - UPONE-1496
  - sp9
  - seed
  - core
---

Arquitectura de seeds sp9. Cada mod declara variantes de seed (minimal/demo/testing) y la variante se resuelve por tenant; cada seed de mod se aplica una vez por tenant. Ejemplos en cd/cm/hello-world/uengagement.

sourceRef (verificado por diff): object-manager c98d9a03 scripts/sync/modSeed.js (resolveTenantVariant: variante por tenant), f5b4096e scripts/sync/modSeed.js (cada seed de mod una vez por tenant), fc47632d (syncSeeds resuelve variante).
