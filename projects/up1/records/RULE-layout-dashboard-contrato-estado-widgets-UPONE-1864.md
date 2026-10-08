---
id: RULE-layout-dashboard-contrato-estado-widgets-UPONE-1864
project: up1
type: rule
module: layout/dashboard
level: must
tags:
  - UPONE-1864
  - UPONE-1863
  - dashboard
  - widgets
---

Un widget informa su estado al Dashboard con el evento load-state mediante useWidgetLoadState. Todo estado distinto de loading cuenta como terminado para el indicador de página, y un widget que nunca reporta deja de contarse a los 20 s (WIDGET_SLOW_AFTER_MS). El widget de reporte nunca queda cargando para siempre: el visor emite report-error con reason load-failed o not-found, y un reportCode en resolución es carga, no mal configurado. Un tipo de widget nuevo debe respetar este contrato para aparecer bien en el indicador.

Fuente: 8b5cb397 docs/features/dashboard.md sección 'Load state contract (for widget authors)'; fad22833.
