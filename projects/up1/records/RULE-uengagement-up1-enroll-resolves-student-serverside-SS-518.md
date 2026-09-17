---
id: RULE-uengagement-up1-enroll-resolves-student-serverside-SS-518
project: up1
type: rule
module: uengagement-up1
---

El frontend solo conoce el userId de la sesion, no el Student.id; el resolver enrollCurrentStudent resuelve el Student server-side (mismo patron que feedback-request) y crea el OfferingEnrollment con prisma directo, publicando el evento a mano porque no pasa por withEventPublish del platform.

**sourceRef:** 4458dda + logic/enroll-current-student.resolver.js:1-16.
