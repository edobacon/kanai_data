---
id: RULE-layout-fk-reference-select-por-defecto-UPONE-1777
project: up1
type: rule
module: layout
level: must
tags:
  - UPONE-1777
  - sp11
  - record-detail
  - fk
---

RecordDetail reemplaza el select precargado por reference-select cuando el campo es FK, el modo es create o edit, el tipo declarado es vacio/text/select, no tiene items ni esta en multiSelectFields, y se puede resolver un displayField. No hace falta declararlo a mano: el reference-select explicito queda solo para lo que la compuerta no cubre (campo no FK que guarda un id, campo dentro de un repeatable, o filtro dependiente con placeholders). Cierra UPONE-1726: el select precargado traia un lote fijo de 1000 registros y un valor fuera del lote se veia como id o no se podia elegir. Complementa RULE-mods-074 (idColumn en RecordList).

sourceRef: a6577889 src/layouts/RecordDetail/fkReferenceSelectGate.ts:1-80, d4aedd5a src/layouts/RecordDetail/RecordDetail.vue, docs/features/reference-select.md:16-38
