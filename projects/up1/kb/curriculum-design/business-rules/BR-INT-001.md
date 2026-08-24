---
id: BR-INT-001
project: up1
type: spec
module: curriculum-design
category: integraciones
status: in-spec
sources:
  - https://u-planner.atlassian.net/wiki/spaces/uP1/pages/1988165713
referenced_by_caps: []
external_refs: []
tags: [business-rule, integraciones, sis, idempotencia, curriculum-design]
---

# BR-INT-001: Identificador de sistema externo

## Texto verbatim

- Toda entidad que puede ser importada desde un sistema externo (Banner, Anthology, LMS) lleva un identificador del sistema de origen
- El identificador permite sincronizacion idempotente: si el registro ya existe, se actualiza; si no, se crea
- El formato del identificador puede ser compuesto (ej: codigo de programa + codigo de periodo para Banner)
- El identificador nunca se modifica despues de la importacion inicial

## Aplicacion en Programa de asignatura

`Activity` debe llevar campos para identificador de sistema externo (cuando aplica el escenario A o B de [BR-INT-002](BR-INT-002.md)).

Probables campos:
- `externalSystemId` (string, ej: "BANNER", "ANTHOLOGY", null si nativo de uPlanner)
- `externalRecordId` (string, identificador en el sistema origen, puede ser compuesto)

## SP2

- Modelar los dos campos en `Activity.json` como nullable.
- En SP2 no hay flujo de import desde SIS — el campo queda preparado para futuras integraciones.

## Referencias

- [BR-INT-002](BR-INT-002.md) (escenarios)
- [BR-INT-003](BR-INT-003.md) (fuentes de calificaciones)
