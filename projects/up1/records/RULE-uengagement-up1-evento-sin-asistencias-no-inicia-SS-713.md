---
id: RULE-uengagement-up1-evento-sin-asistencias-no-inicia-SS-713
project: up1
type: rule
module: uengagement-up1
level: should
tags:
  - SS-713
  - events
  - attendance
---

En Mis eventos, "Iniciar evento" y "Tomar asistencia" solo aparecen si el evento tiene asistencias, para que no quede un evento en curso que nunca se pueda finalizar. En sesión única la condición es Event.usedCapacity > 0; en todas-las-sesiones es offering.usedCapacity > 0, y se cumple porque FLOW-23 crea las asistencias de los inscritos al crear un evento Scheduled. Cada acción se divide por sessionMode porque las condiciones de fila no permiten anidar OR dentro de AND.

Fuente: 7143d07 config/layouts/engagement_Event_responsible_list.json:80,118,156,177; flows/flow-23-event-create-attendances-all-sessions.json.
