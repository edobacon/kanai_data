---
id: RULE-uengagement-up1-iniciar-evento-oferta-inprogress-SS-714
project: up1
type: rule
module: uengagement-up1
level: should
tags:
  - SS-714
  - events
  - offering
---

En la lista Mis eventos, la acción de fila "Iniciar evento" solo se muestra si el evento está Scheduled y su oferta (offering.status) está InProgress. La condición se agregó a las dos variantes de la acción, sesión única y todas-las-sesiones. Así un evento no puede arrancar antes que su oferta, igual que el ciclo Active, InProgress, Finished de la oferta.

Fuente: 89b57bb config/layouts/engagement_Event_responsible_list.json:110 y :148.
