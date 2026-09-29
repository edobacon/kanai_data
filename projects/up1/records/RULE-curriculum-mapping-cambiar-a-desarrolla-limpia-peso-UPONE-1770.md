---
id: RULE-curriculum-mapping-cambiar-a-desarrolla-limpia-peso-UPONE-1770
project: up1
type: rule
module: curriculum-mapping
level: must
tags:
  - UPONE-1770
  - TICKET-149
  - sp11
  - tributacion
  - peso
---

Al pasar contributionType a Develops, el editor envia contributionPercentage:null explicito en la misma mutacion. Antes no habia forma de quitar el peso de una fila que pasaba a Develops (ese tipo no muestra input de peso) y quedaba un peso huerfano que R-6 rechazaba al guardar. Cambiar entre Evaluates y Both no toca el peso. El backend ya distinguia null explicito de undefined.

sourceRef: 78bf6d4 modsComponents/CompetencyAlignmentGrid/CompetencyAlignmentGridElement.vue
