---
id: BUG-up1-manager-context-tree-filtra-por-registro-padre-UPONE-1506
project: up1
type: bug
module: up1-manager
tags:
  - UPONE-1506
  - sp11
  - context-tree
  - rbac
---

El constructor navegaba el grafo de contexto por tipo y ofrecia todas las instancias del objeto candidato sin mirar lo elegido antes, permitiendo guardar combinaciones incoherentes (organization A + institution de B). El motor de autorizacion no las rechaza porque resuelve desde el id mas profundo, asi que el nivel padre se ignoraba en silencio y el rol quedaba con mas alcance del que el admin creia otorgar. Ahora el select del segmento se filtra en el servidor por la FK segun la direccion de la relacion (reverse: filtra el candidato por esa columna; direct: filtra por id), el anchor elegido no se vuelve a ofrecer y un salto sin registro alcanzable queda deshabilitado con su motivo.

sourceRef: aa121fa modsComponents/ContextTreeCreate/contextSegmentRules.logic.ts:1-22, 2ca490c (limite con FK documentado)
