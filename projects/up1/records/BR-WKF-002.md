---
id: BR-WKF-002
project: up1
type: doc
module: curriculum-design
status: in-spec
tags:
  - business-rule
  - workflow
  - control-acceso
  - curriculum-design
---

# BR-WKF-002: Control de acceso por workflow

> Superseded (UPONE-1381): el workflow relacional descrito aqui fue reemplazado por transiciones declarativas de enum sobre `Activity.status` (6 estados). Ver [features/enum-transitions.md](../../features/enum-transitions.md).

## Texto verbatim

- Cada transicion puede requerir un rol especifico para ejecutarse
- Un usuario sin el rol requerido no puede ejecutar la transicion
- Las entidades en estados finales no son editables; para editar, deben transicionar a un estado editable primero

## Aplicacion en Programa de asignatura

- `Draft` -> `Review`: Coordinador
- `Review` -> `Approved`: Director de Programa
- `Approved` -> `Published`: Coordinador o Director
- `Published` -> `Deprecated`: Coordinador
- `Published` -> `OpenForEdit`: Coordinador (cambios menores sin nueva version)

Estados finales (`Deprecated`): no editables.

## SP2

Fuera de scope. Modelado de roles y matriz de transiciones se hace en CAP-CUR-019.

## Referencias

- [BR-WKF-001](BR-WKF-001.md)
- CAP-CUR-019
