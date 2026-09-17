---
id: RULE-curriculum-mapping-rubric-weight-percentage-UPONE-1758
project: up1
type: rule
module: curriculum-mapping
---

El validador de peso (isValidWeight/hasWeightPrecision) rechaza cualquier valor fuera de [0,100] o con mas de 2 decimales, tanto en el editor de arbol de competencias como en el validador de rubrica del backend (validateCompetencyTree.js). Dimensiones de un modelo de rubrica anterior al vigente quedan inertes: no cuentan como rubrica ni aportan a la suma de criterios (RP4). La tolerancia de suma baja a ruido binario (WEIGHT_EPS de 0.01 a 1e-6) porque la precision de decimales se controla aparte.

**sourceRef:** bf9bdf2 + modsComponents/CompetencyTreeEditor/weights.ts:17-70 (WEIGHT_DECIMALS, hasWeightPrecision, isValidWeight, weightCellInvalid).
