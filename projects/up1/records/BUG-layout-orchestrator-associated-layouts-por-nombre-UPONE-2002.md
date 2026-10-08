---
id: BUG-layout-orchestrator-associated-layouts-por-nombre-UPONE-2002
project: up1
type: bug
module: layout/orchestrator
tags:
  - UPONE-2002
  - orchestrator
  - uuid
---

getAssociatedConfigs hacía solo getInstance por id y, con ids uuid, un nombre de layout configurado daba error de UUID que se tragaba en silencio. Ahora, si falla el id, consulta up1_layen_layout con filtro name EQUALS (GET_LAYOUT_BY_NAME, compartido con fetchLayoutByName) y, si tampoco resuelve, solo emite un warn. Los layouts asociados de un layoutConfig pueden declararse por id o por nombre exacto.

Fuente: 7cf0455c src/layouts/LayoutOrchestrator/LayoutOrchestrator.vue:551 y :739-744.
