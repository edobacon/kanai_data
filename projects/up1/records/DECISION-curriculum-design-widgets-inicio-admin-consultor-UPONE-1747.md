---
id: DECISION-curriculum-design-widgets-inicio-admin-consultor-UPONE-1747
project: up1
type: decision
module: curriculum-design
tags:
  - UPONE-1747
  - sp11
  - reportes
  - roles
---

Los roles de los charts y KPIs del inicio (config/reports/report-definition y report-template) volvieron de la lista de roles curriculares (Consultor, Disenador, Revisor, Autoridad Curricular de Learning Assurance) a ["Admin", "Consultor"]. El acceso al inicio queda acotado a esos dos roles. reportWidgetRoles.test.js fija la lista para que no se amplie sin notarlo.

sourceRef: f444ffb config/reports/report-definition/chart-courses-status.json:23-25, tests/unit/reportWidgetRoles.test.js
