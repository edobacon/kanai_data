---
id: DECISION-uengagement-up1-application-profiles-SS-521
project: up1
type: decision
module: uengagement-up1
---

config/app.json reemplaza el array plano roles:[Admin,Coordinador,Estudiante,estudiante-eng,...] por profileRoleMapping, que asocia cada perfil de aplicacion (admin-general-eng, admin-ret, ...) a los roles institucionales. Migracion transversal a decenas de layouts del mod.

**sourceRef:** 0e59e61 + config/app.json:6-20.
