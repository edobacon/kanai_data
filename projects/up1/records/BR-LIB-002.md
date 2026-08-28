---
id: BR-LIB-002
project: up1
type: doc
module: curriculum-design
status: in-spec
tags:
  - business-rule
  - libertad-evaluativa
  - validacion
  - cobertura
  - curriculum-design
---

# BR-LIB-002: Validacion de cobertura de resultados de aprendizaje

## Texto verbatim

- Al avanzar en el workflow de evaluacion (CAP-ASM-005), el sistema valida que todo resultado de aprendizaje activo de la seccion tenga al menos un componente de evaluacion vinculado
- En modo Restringido y Guiado, la validacion es bloqueante: no se permite la transicion si hay resultados de aprendizaje sin cobertura
- En modo Libre, la validacion es informativa: se permite la transicion pero se registra la alerta

## Aplicacion en Programa de asignatura

Aplica al **syllabus** (Learning Assessment), no al programa. Pero el programa hereda la estructura inicial via [BR-MIG-001](BR-MIG-001.md), entonces si el programa esta bien definido, la cobertura inicial llega correcta al syllabus.

En el programa, los `CurricularLink` con `linkType=Evaluates` ya documentan la cobertura. Si en el programa hay LearningOutcomes sin EvaluationComponent que los evalue, el syllabus heredado tampoco tendra cobertura.

## SP2

Solo documental.

## Referencias

- [BR-LIB-001](BR-LIB-001.md), [BR-LIB-003](BR-LIB-003.md)
- CAP-ASM-005 (workflow de evaluacion, modulo Learning Assessment)
