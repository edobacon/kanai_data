---
id: DECISION-academic-scheduling-ranking-instructores-camino-unico-UPONE-1923
project: up1
type: decision
module: academic-scheduling
tags:
  - UPONE-1923
  - sp11
  - rules-engine
---

rankInstructorsForSectionPerBlock del panel individual duplicaba el armado de candidatos del panel unificado. fetchInstructorCandidates y rankInstructorCandidates viven ahora en logic/schedule/instructorCandidates.js como unico camino, para que ambos paneles no diverjan en que candidatos ni que facts envian al motor.

sourceRef: 58d762c logic/schedule/instructorCandidates.js:73, :105
