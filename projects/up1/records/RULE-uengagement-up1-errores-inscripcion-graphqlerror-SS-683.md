---
id: RULE-uengagement-up1-errores-inscripcion-graphqlerror-SS-683
project: up1
type: rule
module: uengagement-up1
tags:
  - SS-683
---

En `enroll-current-student.resolver.js` los errores de negocio se lanzan con `enrollError`, que crea un `GraphQLError` con `extensions.code` tomado del prefijo `ENROLL_*:` del mensaje. Apollo solo conserva `extensions` en un GraphQLError: con un Error pelado el codigo sale como INTERNAL_SERVER_ERROR y el MCP lo cambia por un mensaje generico, asi que el asistente no puede decir por que fallo. El mensaje conserva su prefijo porque la vista se lo quita con una regex (useOfferingEnrollment.ts).

sourceRef: b6a25a99 (SS-683), logic/enroll-current-student.resolver.js
