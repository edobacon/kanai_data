---
id: BUG-layout-001
project: up1
type: bug
module: layout
tags:
  - i18n
  - RecordList
  - RecordDetail
  - preexistente
---

# RecordList embebido en RecordDetail no hereda traducciones @RecordList

## Symptom

Keys de i18n como recordList.info.elements se muestran raw (sin traducir) cuando un RecordList esta embebido como tab dentro de un RecordDetail. El mismo RecordList standalone traduce correctamente.

## Expected behavior

RecordList embebido debe heredar las traducciones de @RecordList.json igual que cuando se renderiza standalone

## Root cause

El scope de i18n en RecordDetail no propaga las traducciones del namespace @RecordList a los RecordList hijos embebidos

## Impact

Afecta todos los mods que usan tabs con RecordList embebido en RecordDetail. Labels de informacion del listado se muestran como keys raw.

## Reproduction

Abrir cualquier RecordDetail con un tab que contenga un record-list element. Verificar que los textos informativos del listado (ej: 'X elementos') se muestran como keys.

## Workaround

No hay workaround limpio. Los textos raw no bloquean funcionalidad.

## Solution

Pendiente.

## Related

- **Specs**: SPEC-mods-assessment-matrix
- **Tickets**: TICKET-005
