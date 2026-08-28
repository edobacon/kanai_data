---
id: BR-LIB-003
project: up1
type: doc
module: curriculum-design
status: in-spec
tags:
  - business-rule
  - libertad-evaluativa
  - ra-criticos
  - proteccion
  - curriculum-design
---

# BR-LIB-003: Proteccion de resultados de aprendizaje criticos

## Texto verbatim

- El coordinador puede marcar resultados de aprendizaje del programa de curso como "obligatorios en toda seccion"
- Un resultado de aprendizaje obligatorio no puede ser desactivado por el docente en CAP-ASM-007, independientemente del modo de libertad evaluativa
- Si el docente desactiva un resultado de aprendizaje no obligatorio que tributa a una competencia del perfil de egreso, el sistema genera una alerta visible para el coordinador del programa

## Aplicacion en Programa de asignatura

- En el RT `LearningOutcome` de `CurricularSection`, el campo `isRequiredInAllSections` (boolean) materializa esta regla.
- Al heredar al syllabus via MADS ([BR-MIG-001](BR-MIG-001.md)), este flag se propaga y el syllabus respeta la proteccion.

## SP2

- Modelar `isRequiredInAllSections` (boolean default `false`) en `rt__LearningOutcome__curricularsection.json`.
- La logica de bloqueo en syllabus se implementa en modulo Learning Assessment, fuera de SP2.

## Referencias

- [BR-LIB-001](BR-LIB-001.md), [BR-LIB-002](BR-LIB-002.md)
- CAP-CUR-015 (definir RA)
- CAP-ASM-007 (gestion RA en syllabus, fuera SP2)
