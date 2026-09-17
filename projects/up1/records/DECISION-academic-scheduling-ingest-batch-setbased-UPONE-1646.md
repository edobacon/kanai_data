---
id: DECISION-academic-scheduling-ingest-batch-setbased-UPONE-1646
project: up1
type: decision
module: academic-scheduling
---

upsertSchedulingOutputs tardaba igual con lotes de 250 o 1000 filas porque su costo dominante era proporcional al ingest total y al tamaño del escenario: un round-trip de update() del ORM por fila coincidente (~25k UPDATEs al reingestar), y la lectura de existentes traia TODO el escenario en cada llamada. Decision: agrupar filas coincidentes en una sola UPDATE parametrizada set-based por grupo (buildAssignmentsBulkUpdateSql via $executeRawUnsafe dentro de la tx), acotar la lectura a las secciones de la llamada, y agregar un argumento tri-estado recomputeConflicts.

**sourceRef:** 39cc0f0 + logic/scheduling-outputs.resolver.js:137 (buildAssignmentsBulkUpdateSql).
