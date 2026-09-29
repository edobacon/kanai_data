---
id: RULE-object-manager-alta-objeto-rol-por-permiso-UPONE-1500
project: up1
type: rule
module: object-manager
level: must
tags:
  - UPONE-1500
  - sp11
  - rbac
---

Un objeto o tipo de registro recien creado podia nacer sin rol en alguno de sus permisos y quedar inaccesible para todos hasta corregirlo a mano. createObjectDefinition y createRecordType ahora exigen, y aplican con los roles del wizard, un rol por cada accion de OBJECT_ACTIONS. La misma regla se aplica en up1-manager (wizards y manageObjectRoles).

sourceRef: d4f4fdeb src/services/auth/objectRoleAssignments.js:54, src/graphql/resolvers/objectDefinition.resolver.js; 03542e0b (UPONE-1499, roles del wizard)
