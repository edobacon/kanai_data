---
id: DECISION-academic-scheduling-clone-assignable-UPONE-1641
project: up1
type: decision
module: academic-scheduling
tags:
  - UPONE-1641
  - UPONE-1740
  - sp9
  - academic-scheduling
---

(UPONE-1641) Clonar escenario desde la lista con nombre previo y form compacto en modal. Se apoya en la Core Extension UPONE-1740 (clonar un grafo declarado completo y por lotes; verificado 209ms para 1000 secciones en UPU).

sourceRef (verificado por diff): academic-scheduling 142a846 objects/Scenario.json:~19 + config/layouts/scenario-list.json (clone from list), b779b29 (name before cloning); object-manager f87b916b src/graphql/resolvers/helpers/deep-clone-direct.js (UPONE-1740 clone declared graph in batches).
