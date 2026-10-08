---
id: RULE-layout-record-list-requiredcapability-lista-and-UPONE-2009
project: up1
type: rule
module: layout/record-list
level: should
tags:
  - UPONE-2009
  - record-list
  - row-actions
  - rbac
---

El tipo pasa a string | string[] en RowAction y EnhancedRowAction. isActionVisible oculta la acción si falta alguna capability de la lista. Una lista vacía no oculta la acción. requiredPermission (deprecado) sigue tomándose como fallback.

Fuente: c7139956 src/composables/useRowActionHandler.ts:55 y :191-195; src/shared/types/recordlist.ts:174.
