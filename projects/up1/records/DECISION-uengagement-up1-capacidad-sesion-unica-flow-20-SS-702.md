---
id: DECISION-uengagement-up1-capacidad-sesion-unica-flow-20-SS-702
project: up1
type: decision
module: uengagement-up1
tags:
  - SS-702
  - flows
  - capacity
---

En una oferta SingleSession la capacidad vive en el evento: Event.usedCapacity cuenta las inscripciones con ese selectedEventId, Offering.maxCapacity es la suma de Event.capacity y Offering.usedCapacity la suma de Event.usedCapacity, ambos sobre eventos no cancelados. FLOW-20 recalcula siempre desde cero (cuenta inscripciones, nunca suma o resta 1) y solo escribe lo que cambió, lo que corta el ciclo al re-disparar con el update del Event. FLOW-01 y FLOW-03 omiten ofertas SingleSession, la capacidad del evento es obligatoria (entero >= 1), sessionMode es de solo lectura al editar y existe events/event-deleted.json para que el delete traiga offeringId. Alternativa descartada: incrementos de más o menos 1, que se desfasan con inscripción masiva y recurrencia.

Fuente: dc1e25a flows/flow-20-singlesession-capacity-rollup.json:1; flows/flow-01-enrollment-capacity-increment.json; events/event-deleted.json; seed/migrations/2026-10-04-sesion-unica-cupos-por-evento.sql.
