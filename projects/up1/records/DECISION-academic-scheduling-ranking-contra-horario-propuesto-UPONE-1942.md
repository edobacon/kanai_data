---
id: DECISION-academic-scheduling-ranking-contra-horario-propuesto-UPONE-1942
project: up1
type: decision
module: academic-scheduling
tags:
  - UPONE-1942
  - sp11
  - unified-panel
---

useUnifiedAssignPanel recalcula el ranking de sala e instructor con el horario que el usuario esta proponiendo (bloques tentativos aun sin guardar), no con el horario persistido. Asi el panel no muestra como factibles candidatos que solo lo son contra un horario que el usuario ya cambio.

sourceRef: 979542f modsComponents/UnifiedAssignPanel/useUnifiedAssignPanel.ts
