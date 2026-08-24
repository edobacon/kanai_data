---
id: BR-LIB-001
project: up1
type: spec
module: curriculum-design
category: libertad-evaluativa
status: in-spec
sources:
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988165713
referenced_by_caps: []
external_refs: []
tags: [business-rule, libertad-evaluativa, syllabus, curriculum-design]
---

# BR-LIB-001: Nivel de libertad evaluativa

## Texto verbatim

Un parametro institucional (configurable por programa o institucion desde el modulo de configuraciones de uP1) define el grado de personalizacion que el docente puede aplicar sobre la estructura de evaluacion heredada:

- **Restringido:** El docente solo puede agregar componentes nuevos. No puede eliminar ni modificar componentes heredados. Puede redistribuir pesos solo entre componentes nuevos
- **Guiado** (default): El docente puede agregar, modificar y eliminar componentes. El sistema valida cobertura de resultados de aprendizaje al avanzar en el workflow. Alertas en tiempo real al perder cobertura
- **Libre:** El docente puede hacer todo. El sistema muestra alertas de cobertura pero no bloquea el avance de workflow. La validacion es informativa, no bloqueante

## Aplicacion en Programa de asignatura

Esta regla aplica al **syllabus** (objeto fuera de este mod), no al programa directamente. Pero el programa **define** las componentes que despues se heredan.

`isSynchronizable` en `CurricularSection` es la base tecnica para esta regla: marca que datos heredados se sincronizan al syllabus, donde el docente luego puede modificarlos segun el modo configurado.

## SP2

NO aplica directamente al programa. Documentado para evitar romper el modelo cuando se implemente el syllabus.

## Referencias

- [BR-LIB-002](BR-LIB-002.md), [BR-LIB-003](BR-LIB-003.md)
- [BR-MIG-001](BR-MIG-001.md) (herencia)
