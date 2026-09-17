---
id: RULE-uengagement-up1-offering-detail-responsible-SS-520
project: up1
type: rule
module: uengagement-up1
---

config/layouts/engagement-offering-view.json incorpora un bloque OfferingResponsible (logic/offering-responsibles.resolver.js + .schema.graphql nuevos, ~119 lineas) para mostrar el responsable de la oferta, y un segundo cambio agrega status y centro de soporte al mismo detalle, con RBAC nuevo en profiles/admin-centro-eng.json y profiles/estudiante-eng.json.

**sourceRef:** d292122 + logic/offering-responsibles.resolver.js:1-119; 5a84c9e profiles/admin-centro-eng.json.
