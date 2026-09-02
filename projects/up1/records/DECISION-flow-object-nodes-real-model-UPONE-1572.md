---
id: DECISION-flow-object-nodes-real-model-UPONE-1572
project: up1
type: decision
module: flow
tags:
  - UPONE-1572
  - UPONE-1574
  - UPONE-1625
  - sp9
  - flow
---

Los pickers de los nodos UP1 Object usan el modelo de objetos real, fail-visibly, con utils compartidos; se remueve el Up1EventTrigger generico y los nodos de evento usan pickers vivos de objeto+dominio; las sesiones de UP1 Manager se confinan a un unico flow.

sourceRef (verificado por diff): flow 91973fd6 packages/nodes-base/nodes/Up1FormObject/Up1FormObject.node.ts + Up1Event/utils.ts (object node pickers modelo real), c8882ea2 (remove Up1EventTrigger, live pickers), 9e8133e8 (confine UP1 Manager a single flow).
