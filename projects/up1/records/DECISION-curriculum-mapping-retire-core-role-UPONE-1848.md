---
id: DECISION-curriculum-mapping-retire-core-role-UPONE-1848
project: up1
type: decision
module: curriculum-mapping
---

El commit d035e5e elimina seed/_data-rbac.js completo (289 lineas, el seed que creaba/actualizaba los core_Role curriculares) y agrega scripts/rbac/profileEffective.js con tests que comparan el snapshot de roles en DB contra el baseline efectivo esperado tras el retiro. 31b5795 actualiza docs de diseno (CLAUDE.md AD-18, PLAN-*) marcando como no vigente el seed RBAC anterior, redirigiendo a que los roles son solo perfil via sync desde profiles/*.json. Ejecuta en codigo la direccion up1-mods-solo-perfil-no-crear-core-role.

**sourceRef:** d035e5e seed/_data-rbac.js (289 deletions), seed/seed.js:1-18; 9ec468d tests/unit/rbacCoreRoleRemovalOutcome.test.js.
