---
id: RULE-academic-scheduling-asignacion-completa-antes-de-guardar-UPONE-1948
project: up1
type: rule
module: academic-scheduling
level: must
tags:
  - UPONE-1948
  - sp11
  - unified-panel
---

UnifiedAssignPanelElement calcula cuantos actores necesita la seccion (requiredCount) y solo marca el titulo y el guardado como completos cuando la sala y todos los instructores requeridos estan elegidos. Con una asignacion parcial el guardado queda deshabilitado, en vez de guardar un estado incompleto en silencio.

sourceRef: b807b85 modsComponents/UnifiedAssignPanel/UnifiedAssignPanelElement.vue:100-104 (titleComplete)
