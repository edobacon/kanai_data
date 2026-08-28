---
id: BUG-layout-003
project: up1
type: bug
module: layout
tags:
  - RecordList
  - enum
  - i18n
  - preexistente
---

# RecordList no traduce valores de enum en celdas de tabla

## Symptom

Valores de campos enum (ej: DRAFT, PUBLISHED, QUALITATIVE) se muestran raw en las celdas de RecordList. No se aplica traduccion via i18n.

## Expected behavior

Los valores enum deberian mostrarse con labels amigables usando las traducciones disponibles en enum.{fieldName}.{VALUE}

## Root cause

RecordList renderiza el valor raw del campo sin buscar traducciones en el namespace enum.*

## Impact

Todos los mods con campos enum en listados muestran valores tecnicos al usuario. Workaround parcial: crear layouts filtrados por estado.

## Reproduction

Abrir cualquier RecordList que muestre un campo enum (ej: ca_matrix_list con columna Estado). El valor aparece como DRAFT en vez de Borrador.

## Workaround

Crear layouts filtrados por valor de enum (ej: Borradores, En Revision, Publicadas) para evitar mostrar el enum raw en una lista general. Alternativa: campo calculado statusLabel en resolver custom.

## Solution

Pendiente.

## Related

- **Specs**: SPEC-mods-assessment-matrix
- **Tickets**: TICKET-005
