---
id: DECISION-academic-scheduling-propuesta-tope-diario-menos-mala-UPONE-1940
project: up1
type: decision
module: academic-scheduling
tags:
  - UPONE-1940
  - sp11
  - rules-engine
  - horarios
---

El greedy que arma el conjunto de modulos propuesto respeta dailyModules de la seccion y construye por sesiones para que el conjunto completo pase el motor. Si ningun candidato del nivel es factible, en vez de dejar la sesion sin sugerencia conserva el de menor costo del motor (leastBad) y marca la propuesta con feasible=false, para que el panel unificado la muestre indicando que rompe una regla.

sourceRef: 86aa891 (sugerencia por sesiones), 0e7544c logic/schedule/breRanker.js:1033 (leastBad), 4bdde28 logic/schedule/breRanker.js:1045-1051
