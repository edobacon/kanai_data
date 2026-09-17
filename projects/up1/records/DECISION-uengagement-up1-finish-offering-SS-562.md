---
id: DECISION-uengagement-up1-finish-offering-SS-562
project: up1
type: decision
module: uengagement-up1
tags:
  - SS-562
  - ENG-20
  - sp10
  - offering
---

El responsable de una oferta puede finalizarla: logic/finish-offering.resolver.js + logic/finish-offering.schema.graphql (mutation que exige la oferta Active y lanza error explicito si ya esta Finished/Inactive/Cancelled; NO idempotente). En UI, las ofertas/eventos finalizados se excluyen de "Mis ofertas" y "Mis eventos", con botones "Ofertas finalizadas"/"Eventos finalizados" para verlos aparte. sourceRef: 649f6ff (resolver+schema), e5dd04d/eb51829 (exclusion de finalizados + botones). Incluye fixes de la misma tanda: ofertas creadas desde admin no aparecian en Administracion de ofertas (92cf064) y operador de filtro invalido rompia "Mis eventos" (5d8f77b).
