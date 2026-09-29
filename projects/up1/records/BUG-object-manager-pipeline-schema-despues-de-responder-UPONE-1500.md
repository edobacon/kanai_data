---
id: BUG-object-manager-pipeline-schema-despues-de-responder-UPONE-1500
project: up1
type: bug
module: object-manager
tags:
  - UPONE-1500
  - UPONE-1499
  - sp11
  - schema-pipeline
---

applyChanges disparaba el pipeline de schema antes de que saliera la respuesta HTTP; si tardaba, el cliente recibia un error de conexion aunque el alta ya estuviera guardada. runAfterResponse (requestLifecycle.js) encola el pipeline para cuando la respuesta ya salio. En UPONE-1499 el pipeline se movio al final del alta para no perder capabilities, roles ni auditoria si el proceso se reinicia a mitad de camino.

sourceRef: a56bcf9b src/services/requestLifecycle.js:46, 14fa03c4 (UPONE-1499)
