---
id: BUG-academic-scheduling-estado-escenario-transaccion-UPONE-1528
project: up1
type: bug
module: academic-scheduling
tags:
  - UPONE-1528
  - sp11
  - scenario
---

El callback y los resolvers de ejecucion y cancelacion de escenario actualizaban ScenarioJob y Scenario en dos awaits separados; si el segundo fallaba, el Scenario quedaba trabado en running mientras el job ya decia completed o failed. Ahora ambos updates van en prisma.$transaction en los tres puntos (callback, run, cancel).

sourceRef: 4f3c912 logic/runScenario.resolver.js:102, 6cd057e logic/runScenario.resolver.js:187 y :226
