---
id: RULE-academic-scheduling-conflictos-ignoran-grupo-equivalencia-UPONE-2035
project: up1
type: rule
module: academic-scheduling
level: should
tags:
  - UPONE-2035
  - schedule
  - equivalency
  - conflicts
---

El choque de docente y la doble reserva de sala no se marcan cuando la única coincidencia es con otra sección del mismo grupo de equivalencia vigente, porque comparten clase y sala por diseño. Los tramos de sala de esas secciones llevan equivalent: true y los resultados exponen equivalentWith. Un seed minimal (populate-zzzzz-equivalency-conflict-flags.js) recalcula ScenarioSection.hasConflict en escenarios con equivalencias, salvo los running, para corregir banderas viejas.

Fuente: 9546b34 logic/schedule/evalInstructor.js:352; logic/schedule/evalResource.js:59-73.
