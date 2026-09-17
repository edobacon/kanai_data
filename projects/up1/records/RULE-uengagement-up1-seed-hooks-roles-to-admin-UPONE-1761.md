---
id: RULE-uengagement-up1-seed-hooks-roles-to-admin-UPONE-1761
project: up1
type: rule
module: uengagement-up1
---

Espejo de linkCurricularRolesToCoreAdmins: en vez de crear usuarios demo (sin clerkUserId, no logueables), el seed asigna los 6 roles eng/ret a los usuarios Admin y Consultor que ya pueden loguearse en /system/UPU, para que tras un setup haya al menos una cuenta por rol para probar. Es conveniencia de arranque; la asignacion real de produccion va por up1-manager, no por este seed.

**sourceRef:** cb84c4d + seed/_data-rbac.js:274-290.
