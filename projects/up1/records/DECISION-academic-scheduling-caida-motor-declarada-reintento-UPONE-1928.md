---
id: DECISION-academic-scheduling-caida-motor-declarada-reintento-UPONE-1928
project: up1
type: decision
module: academic-scheduling
tags:
  - UPONE-1928
  - sp11
  - rules-engine
  - unified-panel
---

useUnifiedAssignPanel recuerda si el motor ya respondio en la sesion (engineAnswered). Si despues una llamada falla, activa engineLost y el panel muestra un aviso con reintento (retryRanking), en vez de mostrar listas nativas sin decir que el motor esta caido. engineLost vuelve a false solo cuando el motor responde de nuevo.

sourceRef: a3a3c1e modsComponents/UnifiedAssignPanel/useUnifiedAssignPanel.ts:337-349, UnifiedAssignPanelElement.vue:730-733
