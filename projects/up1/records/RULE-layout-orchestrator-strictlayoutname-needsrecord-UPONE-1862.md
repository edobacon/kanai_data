---
id: RULE-layout-orchestrator-strictlayoutname-needsrecord-UPONE-1862
project: up1
type: rule
module: layout/orchestrator
level: should
tags:
  - UPONE-1862
  - orchestrator
  - layout-widget
---

La prop strictLayoutName (default false) la usa el widget layout del Dashboard: un layoutName inexistente o no visible para el rol termina como not-found en vez de caer al default por rol. La resolución expone needsRecord y LayoutWidget no calcula pageUrl cuando needsRecord es verdadero, porque esa página tampoco tendría el registro. El orchestrator también emite el evento resolved.

Fuente: bfaee951 src/layouts/LayoutOrchestrator/LayoutOrchestrator.vue:334 y :619; 2a48a2b5 src/layouts/widgets/LayoutWidget.vue (pageUrl).
