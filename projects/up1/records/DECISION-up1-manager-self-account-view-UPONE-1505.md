---
id: DECISION-up1-manager-self-account-view-UPONE-1505
project: up1
type: decision
module: up1-manager
---

Se creo core_user_self_edit.json / core_user_self_view.json como layout propio para que un usuario edite su propia cuenta, separado del layout administrativo. Por QA H005 se agrego un encabezado que la identifica como cuenta propia (es/en/pt) y se elimino la barra de recarga. detailTitle "Mi cuenta" y tabs Detalles/Roles; el tab Roles queda detras de core_roleassignment:view y la lista de roles es de solo lectura para que nadie se quite sus propios roles.

**sourceRef:** b28d68d config/layouts/core_user_self_edit.json; b194b34 (encabezado); e0e769f (detailTitle+tabs+roles).
