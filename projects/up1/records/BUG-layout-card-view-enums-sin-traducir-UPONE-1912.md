---
id: BUG-layout-card-view-enums-sin-traducir-UPONE-1912
project: up1
type: bug
module: layout
tags:
  - UPONE-1912
  - sp11
  - record-list
  - i18n
---

getDisplayValue() no traduce enums; TableCell.vue lo hace aparte resolviendo enums.<field>.<value> sobre el valor crudo (UPONE-1745). Las tarjetas renderizaban directo desde cardsForGrid y mostraban el literal (p.ej. 'InProgress'). Se extrajo translateEnumDisplayValue a recordListFormatters y se conecto solo en cardsForGrid, no en getDisplayValue, porque este tambien alimenta comparaciones de orden que deben seguir usando el valor crudo.

sourceRef: 56420958 src/layouts/RecordList/RecordList.vue:8332-8355 (getCardFieldDisplayValue)
