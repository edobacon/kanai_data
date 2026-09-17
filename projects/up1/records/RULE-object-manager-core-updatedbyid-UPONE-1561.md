---
id: RULE-object-manager-core-updatedbyid-UPONE-1561
project: up1
type: rule
module: object-manager
---

modelHasUpdatedById excluia core_* porque antes CORE no tenia columna updatedById. Ahora que core hereda la columna desde common.json, el guard debe incluir core: devuelve true para modelos base (business/up1/core) y false solo para tablas ext__/rt__, que siguen sin la columna. Verificado contra una escritura real a core_Tag.

**sourceRef:** 330753f0 + src/graphql/resolvers/helpers/audit-updated-by.js.
