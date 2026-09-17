---
id: BUG-object-manager-rt-field-registry-orphans-UPONE-1818
project: up1
type: bug
module: object-manager
---

syncRtFieldsToRegistry no seguia el patron de soft-delete/reactivacion de sus tres funciones hermanas, dejando filas huerfanas cuando un campo propio de RT se removia del JSON. Una fila stale hacia crashear listInstances. Fix: syncRtFieldsToRegistry soft-deletea campos removidos y los reactiva si se redeclaran; listInstances reintenta sin el auto-include afectado (FK propia de RT, FK de objeto base, o cadena relations anidada) y reclasifica el error como metadata stale en vez de filtro invalido.

**sourceRef:** e22ced38 + src/graphql/resolvers/instance.resolver.js y src/services/codegen/generatePrismaSchema.js.
