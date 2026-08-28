---
id: BR-WKF-003
project: up1
type: doc
module: curriculum-design
status: in-spec
tags:
  - business-rule
  - workflow
  - inmutabilidad
  - curriculum-design
---

# BR-WKF-003: Inmutabilidad por estudiantes activos

> Superseded (UPONE-1381): el workflow relacional descrito aqui fue reemplazado por transiciones declarativas de enum sobre `Activity.status` (6 estados). Ver [features/enum-transitions.md](../../features/enum-transitions.md).

## Texto verbatim

- Un plan de estudios con estudiantes matriculados activos no puede transicionar a estados de cierre (archivado, deprecado)
- La proteccion se propaga a entidades vinculadas al plan:

    - **Matrices de competencias** asociadas a un plan con estudiantes activos no pueden transicionar a estados de cierre ni editarse destructivamente (eliminar competencias, cambiar estructura jerarquica)
    - **Perfiles de egreso** de un plan con estudiantes activos no pueden transicionar a estados de cierre ni modificar competencias/niveles esperados ya declarados
    - **Esquemas de niveles** en uso por matrices vinculadas a planes con estudiantes activos no pueden eliminar niveles ni modificar umbrales cuantitativos existentes (agregar niveles nuevos si esta permitido)

- Esta regla se implementa como validacion de negocio, no como constraint de base de datos

## Aplicacion en Programa de asignatura

Esta regla aplica primariamente a **planes de estudio**, no a programas de asignatura directamente. Sin embargo:
- Si un programa tiene secciones dictadas (Offerings) con estudiantes activos, el programa NO debe transicionar a `Deprecated`.
- En SP2 esta validacion no aplica (no hay flujo de matricula). Documentar para futuras iteraciones.

## SP2

Fuera de scope.

## Referencias

- [BR-WKF-001](BR-WKF-001.md)
