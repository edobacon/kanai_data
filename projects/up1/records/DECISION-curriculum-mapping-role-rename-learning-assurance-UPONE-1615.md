---
id: DECISION-curriculum-mapping-role-rename-learning-assurance-UPONE-1615
project: up1
type: decision
module: curriculum-mapping
---

El seed agrega un paso de renombre idempotente (ROLE_RENAME_MAP + renameLegacyRoles) que hace UPDATE in-place del name viejo al nuevo, reutilizando la fila core_Role existente antes del upsert de ensureRoles, con paridad literal contra el mismo renombre en curriculum-design. Se actualizan referencias al nombre viejo en seed, tests, SMOKE-UPU.md, capabilities.json y docs. Nombre sin guion (roleNaming.js lo exige).

**sourceRef:** 2216ea1 + seed/_data-rbac.js:1-79 (ROLE_RENAME_MAP, renameLegacyRoles).
