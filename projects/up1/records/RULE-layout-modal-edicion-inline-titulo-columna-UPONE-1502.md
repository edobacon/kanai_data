---
id: RULE-layout-modal-edicion-inline-titulo-columna-UPONE-1502
project: up1
type: rule
module: layout
level: should
tags:
  - UPONE-1502
  - sp11
  - record-list
---

TableCell.vue titulaba el modal con fieldMetadata.label o el nombre tecnico, que podia diferir del texto que el usuario acababa de leer en la cabecera (ya pasado por la misma cascada de traduccion que "Ordenado por <columna>"). Se agrego la prop columnLabel, con precedencia sobre fieldMetadata.label y el nombre crudo.

sourceRef: dc14304f src/components/molecules/TableCell/TableCell.vue:487-488, src/layouts/RecordList/RecordList.vue (columnHeaderLabel)
