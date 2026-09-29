---
id: RULE-academic-scheduling-bre-assignmentrequired-UPONE-1768
project: up1
type: rule
module: academic-scheduling
level: must
tags:
  - UPONE-1768
  - sp11
  - rules-engine
---

Cada regla del catalogo SSA usa Section.assignmentRequired.<dimension> (module, instructor, resource) como gate de aplicabilidad. Si la clave no viaja, el motor la deja not_applicable en modo strict_nulls y la regla queda apagada sin error visible. timeBlocksForSection y el panel individual de docentes armaban la seccion a mano sin esta columna y perdieron reglas de horario e instructor hasta el fix. Toda query u objeto section nuevo que se pase al motor debe incluir assignmentRequired.

sourceRef: 2a295fd logic/assign-timeblock.resolver.js:95, 22a72b3 logic/schedule/instructorCandidates.js:120
