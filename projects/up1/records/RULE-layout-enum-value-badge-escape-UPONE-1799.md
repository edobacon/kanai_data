---
id: RULE-layout-enum-value-badge-escape-UPONE-1799
project: up1
type: rule
module: layout
tags:
  - UPONE-1799
  - sp10
  - enum
  - value-badge
  - xss
---

Estilo value-based badge para campos enum en TableCell (src/components/molecules/TableCell/TableCell.vue) y en RecordDetail/RecordList. El badge se dimensiona al contenido y tiene prioridad sobre el resaltado de busqueda. Seguridad: customColor e icon se escapan en el HTML crudo del badge y el mapa de variantes queda type-locked (evita inyeccion via estos campos). sourceRef: 17a7f84 (feat value badge en tabla+detalle), 241aaa3 (escape customColor/icon + type-lock variant map). No duplica RULE-layout-enum-translation-search-highlight-UPONE-1745 (esa es precedencia de traduccion de enums); esto es el render del badge + el escaping.
