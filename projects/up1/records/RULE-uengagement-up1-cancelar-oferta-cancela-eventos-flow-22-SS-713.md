---
id: RULE-uengagement-up1-cancelar-oferta-cancela-eventos-flow-22-SS-713
project: up1
type: rule
module: uengagement-up1
level: should
tags:
  - SS-713
  - flows
  - offering
---

FLOW-22 escucha las actualizaciones de Offering y, cuando el estado es Cancelled, pasa sus eventos Scheduled a Cancelled mediante Object Manager, de modo que FLOW-20 recalcula la capacidad de sesión única. Los eventos en curso y completados no se tocan, y las asistencias no se limpian (punto pendiente documentado en CONTEXT.md). La confirmación de "Cancelar oferta" lo informa al usuario.

Fuente: 16aec6c flows/flow-22-offering-cancel-scheduled-events.json:1; .ai/CONTEXT.md (sección Mis ofertas).
