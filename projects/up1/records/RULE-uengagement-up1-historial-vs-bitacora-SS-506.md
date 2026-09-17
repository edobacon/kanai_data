---
id: RULE-uengagement-up1-historial-vs-bitacora-SS-506
project: up1
type: rule
module: uengagement-up1
---

El tab 'log' preexistente (cambios automaticos de StudentLogger) se renombra de Bitacora a Historial, y se agrega un tab nuevo 'Bitacora': record-list embebido de Journal filtrado por studentId (no por la inscripcion, para que un estudiante con dos programas vea el mismo journal en ambas), create-only via engagement_Journal_responsible_create.

**sourceRef:** 67d8cfb + config/layouts/retention_ProgramEnrollment_view.json (tabs log/bitacora).
