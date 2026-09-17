---
id: DECISION-curriculum-design-retire-core-role-UPONE-1848
project: up1
type: decision
module: curriculum-design
---

El seed de curriculum-design retira la creacion de los 4 core_Role curriculares (Consultor/Revisor/Disenador/Autoridad Curricular) via `ensureCurriculumModRbac`/`_data-rbac.js` (import y llamada eliminados de seed.js; `_data-rbac.js` borrado, 265 lineas). Los roles quedan solo como perfil (core_ModRole), materializado por el SYNC desde profiles/*.json, independiente del seed; la identidad asignable la aporta el perfil compuesto sobre Admin/Consultor en up1. `config/app.json` pierde el self-mapping de esos 4 roles, dejando solo el mapeo del perfil compuesto Disenador Autoridad hacia Admin/Consultor.

**sourceRef:** 354159c + seed/seed.js:36-46 y config/app.json:44-49 (profileRoleMapping).
