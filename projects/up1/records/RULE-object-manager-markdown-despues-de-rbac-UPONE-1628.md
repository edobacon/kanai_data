---
id: RULE-object-manager-markdown-despues-de-rbac-UPONE-1628
project: up1
type: rule
module: object-manager
level: must
tags:
  - UPONE-1628
  - sp11
  - markdown
  - rbac
---

markdownFields es un argumento (no una seleccion GraphQL, porque InstanceResult.data es un JSON escalar) que agrega markdown, markdownStatus, markdownWarning y markdownTruncated a cada entrada del campo archivo. Se ejecuta despues del filtrado de campos por RBAC, asi que nunca reintroduce un campo que el gate de vista ya quito; sin metadata del campo, falla cerrado y no entrega markdown. Un campo denegado nunca dispara la conversion. Un markdownFields null explicito se acepta como "sin enriquecimiento".

sourceRef: 54831ce2 src/graphql/resolvers/helpers/markdownEnrichment.js:62, 8efdd3d6 (null explicito)
