---
id: BUG-curriculum-mapping-reparto-automatico-orden-filas-UPONE-1770
project: up1
type: bug
module: curriculum-mapping
tags:
  - UPONE-1770
  - TICKET-149
  - sp11
  - tributacion
  - peso
---

isAutomaticDistribution comparaba fila por fila contra distributeEvenly, que asigna el resto de la division a la ULTIMA fila del array. El orden del borrador no es estable (retirar y reasignar manda la fila al final; la vista no ordena), asi que un reparto 33.34/33.33/33.33 dejaba de detectarse como automatico si la fila con 33.34 no quedaba ultima. Ahora compara el conjunto de valores ordenados.

sourceRef: aaa6f6a modsComponents/CompetencyAlignmentGrid/weights.ts:163-179
