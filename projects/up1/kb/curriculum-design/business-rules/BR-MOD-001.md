---
id: BR-MOD-001
project: up1
type: spec
module: curriculum-design
category: modelo-datos
status: in-spec
priority: critical
sources:
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988165713
referenced_by_caps: []
external_refs: []
tags: [business-rule, modelo-datos, course-program, divergencia, curriculum-design]
---

# BR-MOD-001: CourseProgram pertenece al catalogo, no al plan

## Texto verbatim

- Un `CourseProgram` pertenece a un curso base del catalogo, no directamente a un `StudyPlan`
- La relacion entre plan de estudios y cursos se establece via la malla curricular (CAP-CUR-003), no via FK directo en `CourseProgram`
- Esto permite que un mismo programa de curso se reutilice en multiples planes de estudio sin duplicacion
- **Divergencia con implementation plan (ReAssess v1):** El implementation plan incluye un campo `studyPlanId` en `CourseProgram`. Esta decision se revierte: la spec funcional prevalece. El implementation plan debera ajustarse cuando se implemente

## Aplicacion en Programa de asignatura

**CRITICO**: NO incluir un campo `studyPlanId` en `Activity`. La spec funcional manda.

La relacion `Activity` ↔ `StudyPlan` se modela via `PlanEntry` (objeto separado, fuera de este mod, parte del agregado StudyPlan):

```
StudyPlan 1 ── N PlanEntry N ── 1 Activity
```

Donde `PlanEntry` es la entrada de la malla curricular: cada entrada conecta un curso (Activity) a un plan, posiblemente en un periodo/semestre especifico.

## SP2

**Aplicar regla**: en `Activity.json` NO declarar `studyPlanId`. Si en algun momento aparece la tentacion de ese campo, recordar esta regla.

## Referencias

- [BR-VER-001](BR-VER-001.md) (versionamiento)
- [BR-WKF-004](BR-WKF-004.md) (coordinacion plan ↔ perfil de egreso)
- CAP-CUR-003 (malla curricular, fuera SP2)
