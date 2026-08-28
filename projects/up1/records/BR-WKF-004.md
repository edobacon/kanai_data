---
id: BR-WKF-004
project: up1
type: doc
module: curriculum-design
status: in-spec
tags:
  - business-rule
  - workflow
  - plan-estudios
  - perfil-egreso
  - curriculum-design
---

# BR-WKF-004: Coordinacion de workflows plan ↔ perfil de egreso

> Superseded (UPONE-1381): el workflow relacional descrito aqui fue reemplazado por transiciones declarativas de enum sobre `Activity.status` (6 estados). Ver [features/enum-transitions.md](../../features/enum-transitions.md).

## Texto verbatim

- Un plan de estudios no puede transicionar a estado Vigente si su perfil de egreso asociado (CAP-MAP-012) no esta al menos en estado Aprobado
- Si un plan en estado Vigente se revierte a Borrador, el perfil de egreso asociado transiciona automaticamente a un estado editable para mantener coherencia
- Esta regla garantiza que un plan vigente siempre tenga un perfil de egreso aprobado, respetando el concepto de "contrato con el estudiante"

## Aplicacion en Programa de asignatura

Aplica primariamente a **planes de estudio** (no programas de curso). Pero el principio analogo aplicaria al programa: no puede pasar a `Published` si tiene secciones obligatorias sin contenido (CAP-CUR-016).

## SP2

Fuera de scope. Documentado para coherencia con la familia BR-WKF.

## Referencias

- [BR-WKF-001](BR-WKF-001.md)
- CAP-MAP-012 (perfil de egreso, modulo Curriculum Mapping)
