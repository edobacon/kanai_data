---
id: RULE-uengagement-up1-finish-offering-exige-inprogress-SS-564
project: up1
type: rule
module: uengagement-up1
level: must
tags:
  - SS-564
  - sp11
  - offering
---

Offering.status gana el valor InProgress. La accion declarativa "Iniciar oferta" (updateInstance sin resolver custom, capability mod/uengagement:start_offering_as_responsible) pasa de Active a InProgress, y finishOffering ahora exige InProgress en vez de Active. El catalogo de estudiantes sigue filtrando solo Active; el calendario del estudiante filtra status IN [Active, InProgress]. Antes de inscribir en una oferta AllSessions se pide confirmacion (SS-565).

sourceRef: eb5e550 logic/finish-offering.resolver.js, objects/Offering.json:2, capabilities.json; 4eaaee4 (SS-565)
