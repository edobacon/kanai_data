---
id: RULE-curriculum-design-planentry-shape-guard-UPONE-1757
project: up1
type: rule
module: curriculum-design
---

En `assertValidPlanEntryShape`, `markedElective` debe calcularse como `isElective === true || blockId != null` (OR). Un ternario que evalua `isElective` primero y solo cae a `blockId` cuando `isElective` es `undefined` deja pasar `isElective=false` + `blockId=''` (bloque invalido, string vacio) sin validar. Refina la DEC-030 (electividad derivada de planEntry.blockId sin flag): el guard debe considerar ambas señales.

**sourceRef:** 821bdb5 + logic/helpers/planEntryShapeGuard.js:50 (assertValidPlanEntryShape).
