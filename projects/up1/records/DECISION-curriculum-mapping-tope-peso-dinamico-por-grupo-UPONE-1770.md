---
id: DECISION-curriculum-mapping-tope-peso-dinamico-por-grupo-UPONE-1770
project: up1
type: decision
module: curriculum-mapping
tags:
  - UPONE-1770
  - TICKET-149
  - sp11
  - tributacion
  - peso
---

El input de peso de cada fila Evaluates/Both tiene como maximo disponible = 100 menos la suma de las otras filas del mismo grupo (planId, competencyNodeId, developmentLevelId). Si el valor lo supera, el input queda invalido, no se guarda y vuelve al valor anterior al salir, con el mensaje "Solo tienes disponible {disponible}% para asignar". "Repartir en partes iguales" no pasa por este tope porque emite el reparto completo del grupo de una vez.

sourceRef: b523c01 modsComponents/CompetencyAlignmentGrid/weights.ts
