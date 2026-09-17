---
id: RULE-uengagement-up1-admin-centro-read-service-UPONE-1760
project: up1
type: rule
module: uengagement-up1
---

engagement_Activity_service_list.json quita el perfil admin-centro-eng (solo queda admin-general-eng), y engagement_Activity_service_view.json agrega requiredCapability:activityline:view a la seccion serviceLines, separando lectura puntual del servicio de la vista de listado completa.

**sourceRef:** 42a71dd + config/layouts/engagement_Activity_service_list.json:6-9 + engagement_Activity_service_view.json:48-49.
