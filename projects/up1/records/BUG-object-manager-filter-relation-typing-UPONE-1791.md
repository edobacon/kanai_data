---
id: BUG-object-manager-filter-relation-typing-UPONE-1791
project: up1
type: bug
module: object-manager
---

fieldTypeMap solo cubre la tabla consultada; un filtro que llega a un campo de otro modelo (children.<rel>.<field> o un FK display field) entraba a buildFilterCondition sin fieldType y adivinaba el tipo por la forma del valor, asi que un id numerico como '6' se convertia en Int 6 y Prisma lo rechazaba contra la columna de texto. Rompia lecturas de objetos RBAC de CORE desde la UI. Fix: getFieldTypesForModel (nuevo, en sourceContract.js) resuelve tipos leyendo core_FieldDefinition (no getObjectFields, que aplica RBAC de campo); convertFilterValue cubre las 11 familias de getFieldTypeFamily; la heuristica ya NO convierte strings numericos a numero. Commit hermano 931b1958: detectIdTypeFromSchema cambia su fallback de Int a String, porque desde UPONE-1560 no queda ninguna PK Int.

**sourceRef:** d61e35ef + src/graphql/resolvers/instance.resolver.js, src/utils/sourceContract.js; 931b1958 src/services/typeMappers.js:441-467.
