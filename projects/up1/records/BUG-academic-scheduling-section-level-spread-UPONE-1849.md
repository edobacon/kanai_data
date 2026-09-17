---
id: BUG-academic-scheduling-section-level-spread-UPONE-1849
project: up1
type: bug
module: academic-scheduling
---

Causa raiz: una sala o docente asignado a la seccion completa (fila ScenarioSectionAssignment con timeBlockId NULL) llegaba al algoritmo como preset "solo sala"/"solo docente" compitiendo con las filas "solo horario" de la misma seccion, y el algoritmo la descartaba. Fix: sectionLevelSpread.js distribuye las salas/docentes a nivel de seccion sobre cada fila de bloque (producto cruzado por fila de bloque, semanas del bloque preservadas, filas de nivel-seccion consumidas), aplicado antes de armar el preset por semana. Misma regla que los caminos SQL y listInstances de ds_algorithm_assignment.

**sourceRef:** 06c8a45 + logic/schedule/sectionLevelSpread.js:31 (spreadSectionLevelAssignments).
