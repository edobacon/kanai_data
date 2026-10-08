---
id: RULE-object-manager-core-role-isactive-un-solo-filtro-UPONE-1985
project: up1
type: rule
module: object-manager/auth
level: must
tags:
  - UPONE-1985
  - rbac
  - roles
---

userExtractor filtra roleAssignments con role.isActive !== false en el punto único donde se arma el grafo del usuario, así authChecker, activeRole y getMyPermissions no necesitan chequearlo. Los roles institucionales legacy se retiran de forma declarativa con config/retired-institutional-roles.json, aplicada por el sync (Phase 8): desactiva, nunca borra, audita y falla cerrado si el archivo no parsea. El fallback del rol activo ordena por createdAt, porque restar ids cuid da NaN.

Fuente: 758f080c src/services/auth/userExtractor.js:17-28; 3c47703d src/services/auth/activeRole.js; scripts/sync/retiredRoles.js.
