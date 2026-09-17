---
id: RULE-uengagement-up1-single-session-offering-SS-559
project: up1
type: rule
module: uengagement-up1
---

OfferingEnrollment agrega selectedEventId; cuando la Offering tiene sessionMode=SingleSession el estudiante elige una sesion al inscribirse en vez de quedar inscrito a todas. flows/flow-02-enrollment-attendance-create.json crea una sola Attendance si hay sesion elegida, o todas las futuras si no la hay.

**sourceRef:** a4569f6 + objects/OfferingEnrollment.json (selectedEventId) + flows/flow-02-enrollment-attendance-create.json:1-41.
