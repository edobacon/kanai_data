---
id: DECISION-uengagement-up1-estado-matricula-catalogo
project: up1
type: decision
module: uengagement-up1
tags:
  - sp11
  - programenrollment
  - retencion
---

Todos los consumidores de ProgramEnrollment.status (layouts retention_ProgramEnrollment_*, KPIs de activos, desertados, en atencion, en riesgo y fuera de riesgo, report-templates ueng-ret-*) leen ahora enrollmentStatusId -> EnrollmentStatusDescriptions.canonicalStatus. Se agrego el catalogo con layout de vista, i18n en 3 idiomas, seeds y un backfill SQL. El estado se deriva de la fila mas reciente de ProgramEnrollmentStatusHistory, no se escribe por dos vias.

sourceRef: 67c389e config/layouts/retention_ProgramEnrollment_list_indicators.json, seed/d-enrollmentstatusdescriptions-seeds.js, seed/_migrations/programenrollment-enrollmentstatusid-backfill.sql
