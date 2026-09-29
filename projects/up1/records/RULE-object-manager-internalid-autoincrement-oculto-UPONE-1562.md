---
id: RULE-object-manager-internalid-autoincrement-oculto-UPONE-1562
project: up1
type: rule
module: object-manager
level: must
tags:
  - UPONE-1562
  - sp11
  - internalId
---

internalId dejo de inyectarse desde common.json y paso a declararse por objeto como "internalId": { "type": "autoincrement" }. El codegen lo emite como Int @default(autoincrement()) no nulo, excluido del registro de campos y de los tipos GraphQL. Solo se devuelve con includeInternalId: true en listInstances/getInstance (por defecto se filtra, incluso para roles con permiso completo sobre el objeto), y cualquier internalId que llegue en el input de create/update se descarta en silencio antes de separar campos base y extendidos.

sourceRef: 7bf7dfd2 src/services/typeMappers.js:18, b86726b1 src/graphql/resolvers/instance.resolver.js:3614, a5380f93 src/graphql/resolvers/instance.resolver.js:4239
