---
id: RULE-academic-scheduling-skip-rule-eval-actor-tentativo-UPONE-1892
project: up1
type: rule
module: academic-scheduling
level: should
tags:
  - UPONE-1892
  - sp11
  - performance
  - unified-panel
---

Cuando el panel unificado refresca la grilla solo para mostrar el choque de horario de un docente o sala tentativos, la evaluacion del motor no cambia: el motor evalua contra las combinaciones ya guardadas. Repetirla costaba armar la cohorte y 1 o 2 llamadas al motor por cada eleccion, compitiendo con la reevaluacion de listas en el unico worker. Con args.skipRuleEval === true se salta breEvalTimeBlocks y breByBlock queda en null. Ademas la grilla carga primero y se eliminaron pedidos duplicados del panel.

sourceRef: 7c34608 logic/assign-timeblock.resolver.js:262-266, 28c6898 (grilla primero, sin pedidos duplicados)
