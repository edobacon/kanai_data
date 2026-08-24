---
id: BR-INT-003
project: up1
type: spec
module: curriculum-design
category: integraciones
status: in-spec
sources:
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988165713
referenced_by_caps: []
external_refs: []
tags: [business-rule, integraciones, calificaciones, curriculum-design]
---

# BR-INT-003: Fuentes de calificaciones

## Texto verbatim

Learning Assurance no incluye funcionalidad de captura directa de notas. Las calificaciones ingresan al sistema exclusivamente desde fuentes externas:

- **Attendance & Grades** (aplicacion uP1): captura de notas y asistencia por parte del docente. Disponible como modulo adicional de uP1
- **SIS** (Banner, Anthology): sincronizacion de notas ya registradas en el sistema de registro academico (CAP-ASM-035, CAP-ASM-036)
- **LMS** (Brightspace, Canvas): importacion de notas desde el sistema de gestion de aprendizaje (CAP-ASM-037)

El calculo de logro de competencias (CAP-ASM-012) opera sobre las calificaciones independientemente de su fuente de origen.

## Aplicacion en Programa de asignatura

NO aplica directamente al programa (las notas no viven en `CurricularSection` con `recordType=EvaluationComponent` — el componente es la **plantilla**, no las notas reales). Documentado para evitar confundir scope.

## SP2

Solo documental. Aclarar en el ticket UPONE-1033 que `EvaluationComponent` es plantilla, no captura de notas.

## Referencias

- [BR-MIG-003](BR-MIG-003.md) (bloqueo por calificaciones)
- BR-CAL-001..005 (calculo de logro)
