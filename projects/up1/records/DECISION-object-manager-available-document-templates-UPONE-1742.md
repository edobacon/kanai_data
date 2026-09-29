---
id: DECISION-object-manager-available-document-templates-UPONE-1742
project: up1
type: decision
module: object-manager
tags:
  - UPONE-1742
  - sp11
  - documentos
---

La query de descubrimiento por objeto (para que la UI decida si mostrar la descarga) comparte la regla de permisos de generateDocument: sin gate de objeto sobre la plantilla y allowedRoles contra el rol activo, extrayendo isRoleAllowed de assertAllowedRole. Las plantillas sin archivo subido se filtran porque siempre fallarian con TEMPLATE_NO_FILE.

sourceRef: c6245641 src/graphql/typeDefs/static.js:1323, src/graphql/resolvers/documentTemplate.resolver.js
