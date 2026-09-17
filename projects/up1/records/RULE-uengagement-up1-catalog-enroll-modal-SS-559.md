---
id: RULE-uengagement-up1-catalog-enroll-modal-SS-559
project: up1
type: rule
module: uengagement-up1
---

El enroll-row de las cards del catalogo dejo de llamar a enrollCurrentStudent directamente (no soportaba sesion unica) y ahora abre engagement_offering_view en un modal con autoTrigger, disparando la sesion elegida al abrir y cerrando el modal tras confirmar; enroll-row pasa a type:modal, unenroll-row sigue siendo mutacion directa.

**sourceRef:** a4569f6 + config/layouts/engagement-offering-enroll-modal.json.
