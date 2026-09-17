---
id: BUG-object-manager-object-name-casing-collision-registry
project: up1
type: bug
module: object-manager
tags:
  - registry-field-flag-collision
  - PR-582
  - sp10
  - codegen
---

Dos fixes de registro/codegen (PR #582, sin ref UPONE en el subject): (1) src/graphql/resolvers/objectDefinition.resolver.js rechaza crear un objeto cuyo nombre solo difiere en mayusculas/minusculas de uno ya existente (evita colision de casing que rompia el registry). (2) src/services/codegen/generatePrismaSchema.js: los lookups de core_FieldDefinition ahora matchean el unique (objectDefinitionId, name) en vez de solo por name, evitando que un flag de un campo cruce a un campo homonimo de otro objeto (field-flag collision). sourceRef: 4f18a23 (reject casing), d20bc14 (core_FieldDefinition unique match). Relacionado con BUG-object-manager-008 (core_User email casing) y BUG-object-manager-002 (codegen registry).
