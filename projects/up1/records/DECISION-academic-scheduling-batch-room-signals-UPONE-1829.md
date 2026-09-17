---
id: DECISION-academic-scheduling-batch-room-signals-UPONE-1829
project: up1
type: decision
module: academic-scheduling
---

Mismo enfoque que UPONE-1800 aplicado a salas: getResourcesBusyModules lee la ocupacion de recursos del escenario en lote en vez de una consulta por (seccion, sala), con fallback uno-por-uno para los pares que el lote no puede resolver.

**sourceRef:** 2320648 + logic/schedule/evalResource.js:159 (getResourcesBusyModules).
