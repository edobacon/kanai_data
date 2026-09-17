---
id: DECISION-uengagement-up1-mod-creates-own-roles-UPONE-1761
project: up1
type: decision
module: uengagement-up1
---

UPONE-1761 vacio el seed legacy de tenant en object-manager que creaba estudiante-eng/responsable-eng/admin-centro-eng/admin-general-eng/admin-ret/gestor-ret, y UPONE-1699 elimino el auto-create del sync. seed/_data-rbac.js agrega ensureEngagementRoles(prisma) que hace upsert idempotente (createMany + skipDuplicates) de esos 6 core_Role directamente desde el mod, como puente hasta la migracion a application profiles (SS-521).

**sourceRef:** 2c43d12 + seed/_data-rbac.js:27-46 (ROLE_DEFINITIONS + ensureEngagementRoles).
