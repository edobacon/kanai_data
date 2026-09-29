---
id: BUG-mcp-fk-target-references-no-targetobject
project: up1
type: bug
module: mcp
tags:
  - UPONE-1783
  - sp11
  - schema
  - fk
---

La rama FK de get_field_options y el hint de FK de create-guide leian field.targetObject, que object-manager solo llena en las entradas NESTED; la columna FK real llega con references. Los fixtures de test ponian el target en targetObject, asi que los tests pasaban mientras la rama FK nunca corria contra un object-manager real. fkTarget(field) prueba references primero y cae a targetObject como fallback.

sourceRef: 52ceb9c src/tools/create-guide.js:20-31 (fkTarget), src/graphql-client.js:150-156 (GET_OBJECT_FIELDS pide references)
