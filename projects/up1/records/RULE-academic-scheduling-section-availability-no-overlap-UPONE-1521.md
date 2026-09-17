---
id: RULE-academic-scheduling-section-availability-no-overlap-UPONE-1521
project: up1
type: rule
module: academic-scheduling
---

createInstance no conoce el invariante y una UNIQUE de DB no alcanza: idSection/week viven en la tabla puente rt__SectionAvailability__availability y dayOfWeek/startTime/endTime/active en Availability (una UNIQUE no cruza tablas), y generateRecordTypeModel ignora metadata.uniqueConstraints en modelos rt__*. Regla: null en week significa "toda semana" y se solapa con cualquier semana puntual. createSectionAvailabilityValidated inactiva los bloques activos que se solapan y escribe el nuevo en la misma transaccion; si existe un gemelo inactivo exacto lo revive. dayOfWeek es ISO 1-7. Debt aceptado y documentado: ventana TOCTOU.

**sourceRef:** 4a5e4f8 + logic/section-availability.resolver.js:61 (createSectionAvailabilityValidated); 8ebb5d6 specs/UPONE-1521-disponibilidad-de-seccion.md.
