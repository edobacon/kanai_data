---
id: DECISION-curriculum-design-evaluationcomponent-escala-explicita
project: up1
type: decision
module: curriculum-design
tags:
  - sp11
  - evaluacion
  - uretention
---

El record type rt__EvaluationComponent__curricularsection agrego maxScore, minScore, scaleType (enum Percentage, RubricPoints, Grade) y passingThreshold. Antes solo habia weight (0-100) y un maxScore de 100 no decia si era porcentaje o puntos de rubrica. scaleType y maxScore son obligatorios para que todo componente declare su escala; weight paso de number a float. Surgio de los cambios de notas para uRetention.

sourceRef: 69341b2 objects/RecordTypes/rt__EvaluationComponent__curricularsection.json:23-73
