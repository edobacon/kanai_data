---
id: RULE-academic-scheduling-conflict-origin-agnostic-UPONE-1397
project: up1
type: rule
module: academic-scheduling
---

La evaluacion de conflicto dejo de filtrar por assignedBy === 'manual': un solape es un solape sin importar quien escribio la fila (algoritmo o manual). Antes la card, el drawer y el panel de horario podian discrepar porque solo algunos consumidores aplicaban ese filtro; ahora los tres coinciden y la marca de conflicto se propaga a la seccion contraparte. Ademas el grid de horario deriva su turno de los bloques reales de la seccion (selector > bloques asignados > Section.shiftId) y el guardado queda acotado a un solo turno por vez.

**sourceRef:** d84ac36 + logic/schedule/conflictDetail.js:222.
