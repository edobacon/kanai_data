---
id: BUG-layout-002
project: up1
type: bug
module: layout
tags:
  - RecordDetail
  - header
  - UX
  - preexistente
---

# RecordDetail sin mecanismo nativo de titulo/header del registro

## Symptom

Al abrir un RecordDetail, no se muestra automaticamente el nombre o titulo del registro. El header del modal dice 'Vista {ObjectName}' pero no el nombre del registro especifico.

## Expected behavior

RecordDetail deberia mostrar el nombre del registro (campo name o un campo configurable) como titulo/header del detalle

## Root cause

RecordDetail no tiene configuracion de headerField o titleField en el layout JSON

## Impact

El usuario no ve de inmediato que registro esta viendo. Workaround: poner el campo name como primer elemento del tab.

## Reproduction

Abrir cualquier RecordDetail. El header muestra el label generico del layout, no el nombre del registro.

## Workaround

Usar el campo name como primer elemento del tab Detalle con clase CSS para destacarlo

## Solution

Pendiente.

## Related

- **Specs**: SPEC-mods-assessment-matrix
- **Tickets**: TICKET-005
