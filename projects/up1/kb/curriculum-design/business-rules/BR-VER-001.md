---
id: BR-VER-001
project: up1
type: spec
module: curriculum-design
category: versionamiento
status: in-spec
sources:
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988165713
referenced_by_caps: [CAP-CUR-018]
external_refs: []
tags: [business-rule, versionamiento, curriculum-design]
---

# BR-VER-001: Cadena de versiones

## Texto verbatim

- Las entidades versionables (planes de estudio, programas de curso) se encadenan: cada version referencia a la anterior
- Solo una version puede estar marcada como vigente por entidad padre (un plan vigente por programa, un programa vigente por curso)
- Las versiones anteriores no se eliminan ni modifican

## Aplicacion en Programa de asignatura

- `Activity.previousVersionId` apunta a la version anterior
- "Entidad padre" para un programa = el `Course` base (representado en el modelo de objetos como un Activity con `recordType="Course"`). Solo un programa por curso puede estar `Published` simultaneamente.
- Versiones anteriores en `Deprecated` o `OpenForEdit` no son editables sin transicionar.

## Estado de implementacion

- `previousVersionId` implementado como FK opcional (self-reference) en `activity.json`.
- Constraint de unicidad implementado: `uniqueConstraints: [["previousVersionId", "version"]]` en `activity.json` (no exactamente "una version Published por curso": la unicidad es por par version/linaje, no por estado `Active`).

## Referencias

- [BR-VER-002](BR-VER-002.md) (clonacion)
- CAP-CUR-018 (versionar)
