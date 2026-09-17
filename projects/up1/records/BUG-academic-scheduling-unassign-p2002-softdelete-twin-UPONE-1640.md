---
id: BUG-academic-scheduling-unassign-p2002-softdelete-twin-UPONE-1640
project: up1
type: bug
module: academic-scheduling
---

Causa raiz: ScenarioSectionAssignment tiene soft delete (el $extends reescribe el deleteMany a active:false), asi que la fila retirada seguia ocupando la UNIQUE (scenarioSectionId, timeBlockId, resourceId, instructorId). La lectura del ingest filtraba solo filas activas, nunca veia al gemelo inactivo, lo mandaba a createMany y moria en P2002, tumbando la transaccion completa (~1000 filas). Reproducido contra uplanner_upu (23505). Fix: la busqueda corre dentro de runWithIncludeInactive y revive un gemelo soft-deleted coincidente en vez de recrearlo.

**sourceRef:** 6898b95 + logic/scheduling-outputs.resolver.js (revive dentro de runWithIncludeInactive).
