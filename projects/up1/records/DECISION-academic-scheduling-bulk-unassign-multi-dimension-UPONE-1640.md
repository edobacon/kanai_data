---
id: DECISION-academic-scheduling-bulk-unassign-multi-dimension-UPONE-1640
project: up1
type: decision
module: academic-scheduling
---

Estado final del feature: unassignSectionsBulk(scenarioSectionIds, dimension[]) reemplaza la mutacion de una sola dimension; el enum ALL se elimino porque pedir las tres dimensiones ya expresa "limpiar todo" (dimensionsFromArg dedupea y reordena al orden canonico). RBAC chequea una capability por dimension con OR entre ellas. Rechazos por seccion individual (seccion faltante, escenario corriendo, falla de escritura) en vez de fallar el lote; escrituras en chunks con reintento por seccion.

**sourceRef:** 7af8535 + logic/schedule/unassignDimension.js:22 (ALL_UNASSIGN_DIMENSIONS); 59f7a42.
