---
id: BUG-object-manager-fk-connect-id-cast-UPONE-1792
project: up1
type: bug
module: object-manager
---

Al construir el `connect` de Prisma para relaciones FK, el id se mantiene sin alterar (antes habia transformacion indebida que rompia ids no numericos tras UPONE-1560). Doc audit-fields.md actualizado en el mismo commit.

**sourceRef:** ea337578 + src/graphql/resolvers/instance.resolver.js.
