---
id: BUG-layout-record-list-link-fk-sin-permiso-lectura-UPONE-2008
project: up1
type: bug
module: layout/record-list
tags:
  - UPONE-2008
  - record-list
  - fk
  - rbac
---

Ahora el FK se renderiza como Link (con hover card) solo si hasViewPermission(references) es verdadero. Si no, se muestra el mismo valor como span sin link ni hover card. Se usa hasViewPermission y no hasCapability estricto porque este último no detecta base:view sobre un destino RecordType.

Fuente: 3528b318 src/components/molecules/TableCell/TableCell.vue:49 y :1022.
