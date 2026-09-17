---
id: DECISION-academic-scheduling-batch-instructor-signals-UPONE-1800
project: up1
type: decision
module: academic-scheduling
---

Antes: 1-3 queries SQL por cada par (seccion, docente). Decision: leer la ocupacion de todo el escenario UNA vez y restar en memoria la seccion propia de cada par. Medido en escenario demo de 1000 secciones (819 pares): la pasada de docente bajo de 4261 statements SQL a 18, con el mismo conjunto de secciones en conflicto. El ruteo bloque-vs-seccion y el nucleo de evaluacion quedan compartidos entre batch y uno-por-uno, asi que solo difieren en como leen; los pares que el batch no resuelve caen al camino uno-por-uno.

**sourceRef:** 83ef4e2 + logic/schedule/bulkConflictRecompute.js:92 (planConflictRecompute).
