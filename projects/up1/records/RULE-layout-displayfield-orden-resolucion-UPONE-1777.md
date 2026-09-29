---
id: RULE-layout-displayfield-orden-resolucion-UPONE-1777
project: up1
type: rule
module: layout
level: must
tags:
  - UPONE-1777
  - sp11
  - reference-select
  - fk
---

resolveFkDisplayField.ts prueba en orden: (1) schema[field].displayField del layout; (2) layoutConfig.relationDisplayFields por nombre de campo, de relacion o de objeto referenciado (si es array, solo el primero); (3) layoutConfig.nameField, solo si el objeto referenciado tiene ese campo; (4) el idColumn del objeto referenciado (UPONE-1750), que ya viene en getObjectFields; (5) el primero de name, title, label, firstName, email, code que exista. Los pasos 3 y 5 consultan los campos del objeto referenciado; el 4 no. Sin coincidencia, el campo no migra y queda el select precargado.

sourceRef: a6577889 src/layouts/RecordDetail/resolveFkDisplayField.ts, 6aa7e50c (relationDisplayFields por campo, relacion u objeto)
