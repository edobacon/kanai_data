---
id: RULE-academic-scheduling-carga-docente-equivalencia-una-vez-UPONE-2047
project: up1
type: rule
module: academic-scheduling
level: should
tags:
  - UPONE-2047
  - schedule
  - equivalency
---

El cálculo de carga actual del docente acumula por clase y no por sección: las secciones de un grupo de equivalencia vigente comparten una entrada con los weeklyModules de la principal. Sin grupo, la clase es la propia sección. Si agregas un cálculo de carga nuevo, usa la clave de clase (fetchScenarioLoadGroups) para no duplicar horas de un docente que dicta secciones cross-listed.

Fuente: 27570eb logic/schedule/evalInstructor.js:60-67.
