---
id: DECISION-academic-scheduling-asignacion-combinada-una-transaccion-UPONE-1891
project: up1
type: decision
module: academic-scheduling
tags:
  - UPONE-1891
  - sp11
  - unified-panel
---

En vez de tres mutaciones separadas por dimension, el panel unificado usa unified-assignment.resolver.js, que aplica applyInstructors, applyResources y applyTimeBlocks en una sola operacion. Asi no queda una asignacion guardada a medias si una de las tres partes falla.

sourceRef: a35bbd8 logic/unified-assignment.resolver.js, logic/schedule/applyInstructors.js, applyResources.js, applyTimeBlocks.js
