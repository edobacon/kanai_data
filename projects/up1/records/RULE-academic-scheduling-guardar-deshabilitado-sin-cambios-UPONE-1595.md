---
id: RULE-academic-scheduling-guardar-deshabilitado-sin-cambios-UPONE-1595
project: up1
type: rule
module: academic-scheduling
level: should
tags:
  - UPONE-1595
  - sp11
  - assign-panels
---

InstructorAssignPanelElement y ResourceAssignPanelElement comparan la seleccion actual contra la inicial con selectionChanged(initial, current) y deshabilitan el guardado si son iguales, para evitar mutaciones sin cambios reales. Es distinto del tope de candidatos del mismo ticket (BUG-academic-scheduling-candidate-limit-UPONE-1595).

sourceRef: 29d80bd modsComponents/ResourceAssignPanel/selectionChanged.ts:27
