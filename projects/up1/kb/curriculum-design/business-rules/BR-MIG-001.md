---
id: BR-MIG-001
project: up1
type: spec
module: curriculum-design
category: migracion
status: in-spec
sources:
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988165713
referenced_by_caps: []
external_refs: []
tags: [business-rule, migracion, mads, programa-syllabus, curriculum-design]
---

# BR-MIG-001: Herencia automatica de estructura

## Texto verbatim

- Al crear un syllabus para una seccion, la estructura definida en el programa de curso se hereda automaticamente: componentes de evaluacion, resultados de aprendizaje, contenidos, estrategias, referencias, vinculos competencia↔resultado de aprendizaje y vinculos componente↔resultado de aprendizaje
- La migracion solo aplica cuando se cumplen todas las condiciones:
    - El programa de curso esta en estado **Publicado** y es la **version vigente**
    - La seccion esta en su estado inicial del workflow (Pendiente/Borrador)
    - La seccion pertenece al periodo academico activo
- Cada dato migrado se marca con un flag de sincronizacion (`is_synchronizable`) que distingue datos heredados de datos creados manualmente por el docente

## Aplicacion en Programa de asignatura

- Ejecucion: cuando se crea un `Offering` (instancia para un periodo) basado en un `Activity` template.
- Replica: cada `CurricularSection` con `isSynchronizable=true` se copia al syllabus, manteniendo `sourceId` apuntando a la plantilla original.
- Esto explica por que el modelo polimorfico de `CurricularSection` tiene `ownerType` (`Activity` vs `Offering`).

## SP2

- En SP2 NO se implementa MADS — el `Offering` es modulo Learning Assessment / Syllabi.
- En `CurricularSection` se modela el campo `isSynchronizable` (boolean default `true`) para soportar este flujo en el futuro.
- En `CurricularSection` se modela el campo `sourceId` (UUID nullable) para trazabilidad.

## Referencias

- [BR-MIG-002](BR-MIG-002.md) (parametros de control)
- [BR-MIG-003](BR-MIG-003.md) (bloqueo por calificaciones)
- [BR-LIB-001](BR-LIB-001.md) (libertad evaluativa del docente)
