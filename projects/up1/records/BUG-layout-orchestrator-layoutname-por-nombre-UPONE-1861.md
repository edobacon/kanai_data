---
id: BUG-layout-orchestrator-layoutname-por-nombre-UPONE-1861
project: up1
type: bug
module: layout
tags:
  - UPONE-1861
  - sp11
  - layout-orchestrator
---

LayoutOrchestrator resolvia un layoutName sin layoutNameMap saltando directo al default por rol (resolveDefaultLayout), asi que dos widgets de dashboard sobre el mismo objeto terminaban mostrando el mismo layout por defecto en vez del que cada uno pedia. Ahora hay una prioridad 2b: buscar el layout por su name exacto (listInstances filtrado por name) y solo si no existe caer al default por rol.

sourceRef: 23cd3d60 src/layouts/LayoutOrchestrator/LayoutOrchestrator.vue:508-565
