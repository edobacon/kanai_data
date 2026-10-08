---
id: BUG-up1-manager-triggers-manuales-no-activan-flujo-UPONE-1507
project: up1
type: bug
module: up1-manager
tags:
  - UPONE-1507
  - flows
  - n8n
---

hasTriggerNode contaba manualTrigger y manualChatTrigger como nodos que permiten activar el workflow, pero n8n los ignora al decidir si se puede activar (STARTING_NODES). Ahora MANUAL_START_NODE_TYPES los excluye, de modo que un flujo con solo triggers manuales se reporta sin trigger.

Fuente: 9c0edd3 logic/n8nWorkflowProxy.js:105; tests/n8nWorkflowTrigger.test.ts.
