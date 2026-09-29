---
id: BUG-academic-scheduling-bre-check-facts-sala-docente-UPONE-1768
project: up1
type: bug
module: academic-scheduling
tags:
  - UPONE-1768
  - sp11
  - rules-engine
---

breCheckAssignment enviaba la sala y el docente elegidos solo como resourceId/instructorId, asi que toda regla que lee resource.* o instructor.* (aforo, elegibilidad, contrato, disponibilidad) quedaba not_applicable y el modal de confirmacion solo mostraba reglas de horario aunque la sala o el docente rompieran el catalogo. Ahora el chequeo carga sala y docente con pickResource/pickInstructor, las mismas funciones que arman los rankings.

sourceRef: bb53661 logic/schedule/breRanker.js:753 (pickResource), :802 (pickInstructor), :899 (breCheckAssignment)
