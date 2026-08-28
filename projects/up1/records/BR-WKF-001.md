---
id: BR-WKF-001
project: up1
type: doc
module: curriculum-design
status: in-spec
tags:
  - business-rule
  - workflow
  - curriculum-design
---

# BR-WKF-001: Reglas generales de workflow

> Superseded (UPONE-1381): el workflow relacional descrito aqui fue reemplazado por transiciones declarativas de enum sobre `Activity.status` (6 estados). Ver [features/enum-transitions.md](../../features/enum-transitions.md).

## Texto verbatim

- Toda entidad con ciclo de vida aprobable tiene un estado actual controlado por un workflow
- Solo las transiciones definidas en la configuracion del workflow son permitidas
- Cada transicion genera un registro de auditoria inmutable que incluye: quien ejecuto, cuando, estado origen, estado destino, y comentario/justificacion
- Los workflows son configurables por institucion (CAP-ASM-041) con defaults de plataforma que no se pueden eliminar

## Aplicacion en Programa de asignatura

`Activity.status` con valores `Draft`, `Review`, `Approved`, `Published`, `OpenForEdit`, `Deprecated`. Cada transicion genera entry en tabla de auditoria.

## SP2

- En SP2 se modela el campo `workflowState` con default `Draft`. Las transiciones, validaciones y auditoria son **fuera de scope** (CAP-CUR-019).

## Referencias

- CAP-CUR-019 implementa esta regla
- Auditoria inmutable se gestiona via [BR-WKF-002](BR-WKF-002.md) (control de acceso) y BR-WKF-003 (inmutabilidad)
