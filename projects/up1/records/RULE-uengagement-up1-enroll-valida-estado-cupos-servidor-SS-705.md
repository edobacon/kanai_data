---
id: RULE-uengagement-up1-enroll-valida-estado-cupos-servidor-SS-705
project: up1
type: rule
module: uengagement-up1
level: must
tags:
  - SS-705
  - SS-712
  - enrollment
  - concurrency
---

El resolver ya no confía en lo que mostró la vista: dentro de una transacción con pg_advisory_xact_lock por oferta rechaza si la oferta no está Active (ENROLL_OFFERING_NOT_ACTIVE), si en todas-las-sesiones no quedan cupos (ENROLL_OFFERING_FULL), o si en sesión única el evento no está Scheduled o está lleno (ENROLL_SESSION_NOT_AVAILABLE, ENROLL_SESSION_FULL). El cupo se cuenta con las inscripciones reales, no con usedCapacity, porque los flows lo actualizan después. El chequeo de idempotencia va antes de los de cupo para que un doble clic no responda sin cupos, y el publish de flows ocurre fuera de la transacción solo si se creó la inscripción.

Fuente: 7938b3c logic/enroll-current-student.resolver.js:28,31,188; .ai/PATTERNS.md.
