---
id: DECISION-academic-scheduling-scenario-selection-criteria-UPONE-1789
project: up1
type: decision
module: academic-scheduling
---

El selector de secciones del alta de escenario paso de enviar una lista de ids fija a enviar un criterio de seleccion (candidateSections.js + selectionDescriptor.ts) que el backend resuelve. Evita que el conjunto de secciones quede congelado al momento del alta si el criterio debe re-evaluarse.

**sourceRef:** 9f7b8fd + logic/schedule/candidateSections.js:32 (areaOf) + logic/scenario-create.resolver.js.
