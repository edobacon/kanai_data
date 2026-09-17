---
id: DECISION-object-manager-institutional-roles-up1-layer-UPONE-1761
project: up1
type: decision
module: object-manager
---

Se agregan los 4 roles institucionales base como registro puro (sin grants) en prisma/seed/up1/minimal/core-rbac.js; cada mod engancha sus capabilities a estos roles por nombre via config-rbac. Antes vivian solo en el seed legacy de UPU. El resto del ticket (7 commits) vacia a stub los seeds legacy UCASMT/UCENG/UCPLN/TEST y reduce el seed UPU al minimo (solo usuarios dev), documentado en tenant-seed.md. Relaciona con DECISION-core-institutional-roles-fail-closed-UPONE-1699 y con up1-mods-solo-perfil-no-crear-core-role.

**sourceRef:** ee2656ae + prisma/seed/up1/minimal/core-rbac.js.
