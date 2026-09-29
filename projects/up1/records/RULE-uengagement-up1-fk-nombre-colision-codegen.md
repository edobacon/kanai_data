---
id: RULE-uengagement-up1-fk-nombre-colision-codegen
project: up1
type: rule
module: uengagement-up1
level: must
tags:
  - sp11
  - codegen
  - programenrollment
---

El codegen deriva el nombre de la relacion Prisma quitando el sufijo Id (statusId -> status). En ProgramEnrollment, status ya existia como campo plano definido por curriculum-design, asi que la nueva FK statusId al catalogo EnrollmentStatusDescriptions rompia prisma:generate. Se renombro a enrollmentStatusId como nombre DEFINITIVO: con datos y consumidores enganchados (reportes, listas, vistas), revertirlo repetiria el mismo riesgo. Antes de nombrar una FK, revisa que su nombre sin Id no exista en el objeto, incluso si lo aporta otro mod.

sourceRef: 2a11ed4 objects/ProgramEnrollment.json:6-11, 67c389e objects/ProgramEnrollment.json:10
