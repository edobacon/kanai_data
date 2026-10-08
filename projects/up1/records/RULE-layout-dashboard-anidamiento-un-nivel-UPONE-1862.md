---
id: RULE-layout-dashboard-anidamiento-un-nivel-UPONE-1862
project: up1
type: rule
module: layout/dashboard
level: must
tags:
  - UPONE-1862
  - dashboard
  - layout-widget
---

Dashboard.vue inyecta DASHBOARD_DEPTH y provee depth + 1. Si la profundidad es mayor que 0 muestra un aviso (dashboard.nestedBlockedTitle) en lugar de la grilla, no deriva filtros ni consulta nada, y widgets devuelve lista vacía. Aplica a cualquier widget, drill-down o modal cuyo layout resuelva a Dashboard. El widget layout sí ofrece abrir ese dashboard en su propia página y no le muestra el botón de recargar.

Fuente: b4623da9 src/layouts/Dashboard/Dashboard.vue:7 y :291-300; 351b6307 src/layouts/widgets/LayoutWidget.vue (pageUrl, canRefresh).
