---
id: DECISION-uengagement-up1-flow-22-cancelar-oferta-SS-713
project: up1
type: decision
module: uengagement-up1
tags:
  - SS-713
---

FLOW-22 escucha las actualizaciones de Offering con estado Cancelled. Los eventos Scheduled, y los InProgress sin asistencia tomada, pasan a Cancelled (FLOW-24 borra sus asistencias sin notificar por evento). Los InProgress con asistencia ya tomada pasan a Completed. Solo en la transicion a Cancelled cada alumno inscrito recibe una notificacion. Cada evento pasa por Object Manager, asi que FLOW-20 recalcula la capacidad de sesion unica. Es idempotente. Relacionado con DECISION-uengagement-up1-capacidad-sesion-unica-flow-20-SS-702.

sourceRef: 6b4e67f3 (SS-713), flows/flow-22-offering-cancel-scheduled-events.json, .ai/CONTEXT.md
