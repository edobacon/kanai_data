---
id: RULE-uengagement-up1-evento-con-asistencia-no-se-cancela-SS-570
project: up1
type: rule
module: uengagement-up1
level: must
tags:
  - SS-570
  - SS-569
  - ENG-24
  - sp11
  - event
---

Las acciones de fila "Iniciar evento" (Scheduled -> InProgress) y "Cancelar evento" (desde Scheduled o InProgress, y solo si no se tomo asistencia, -> Cancelled) completan el ciclo. "Tomar asistencia" exige InProgress. El historial (ahora "Historial de eventos") incluye tambien los Cancelled, con columna de Estado, y unifica el de eventos y ofertas. Se corrigio "Cancelar oferta", que estaba mal etiquetada como "cancelar evento" en capability, layout y los 3 idiomas.

sourceRef: e1f5310 config/layouts/engagement_Event_responsible_list.json, capabilities.json; 7799e19 (modales de confirmacion en acciones de estado)
