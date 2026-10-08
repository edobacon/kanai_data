---
id: RULE-curriculum-mapping-update-competencias-arbol-completo-UPONE-1899
project: up1
type: rule
module: curriculum-mapping
level: must
tags:
  - UPONE-1899
  - competencias
  - mcp
---

assertPayloadCoversTree rechaza cualquier lista que omita competencias guardadas, incluido []. Omitir una competencia nunca la borra: borrar es solo cm_delete_competency_nodes. Un nodo existente que no envía parentId o position conserva los suyos; un parentId null explícito mueve el nodo al nivel superior; uno nuevo sin position va último. Reenviar filas missingParent o cycle falla con NODE_PARENT_NOT_FOUND o NODE_CYCLE. La clave competencies ausente no abre el persistidor y no lee ni valida el árbol. Las tools MCP (ai/tools.js) fueron reescritas con esta instrucción. Complementa a RULE-curriculum-mapping-rubric-scale-server-side-UPONE-1899, que cubre solo la validación de escala.

Fuente: 537fa1e logic/competencyMatrix-update.resolver.js; logic/competencyTree-upsert.resolver.js:9,268,390; ai/tools.js.
