---
id: BR-MIG-003
project: up1
type: doc
module: curriculum-design
status: in-spec
tags:
  - business-rule
  - migracion
  - bloqueo
  - calificaciones
  - curriculum-design
---

# BR-MIG-003: Bloqueo por calificaciones

## Texto verbatim

- Si al menos un componente de evaluacion de la seccion tiene calificaciones registradas, la migracion automatica se bloquea completamente para esa seccion
- No se ejecuta ninguna insercion, actualizacion ni inactivacion de componentes de evaluacion
- **Esta regla tiene la maxima prioridad sobre cualquier otra regla de migracion**

## Aplicacion en Programa de asignatura

Esta regla NO se implementa en este mod (vive en MADS / Learning Assessment), pero **debe documentarse** como invariante para que no se rompa al implementar el flujo de herencia.

## SP2

Fuera de scope. Solo documental.

## Referencias

- [BR-MIG-001](BR-MIG-001.md), [BR-MIG-002](BR-MIG-002.md)
- BR-INT-003 (fuentes de calificaciones — explica que las notas vienen de SIS/LMS/A&G, no de uP1 directamente)
