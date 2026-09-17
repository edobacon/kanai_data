---
id: BUG-up1-manager-validation-editor-int-ids-MGR-fix
project: up1
type: bug
module: up1-manager
---

parseValidationText y getObjectDefinitions(id) se llamaban con variable tipada Int! pero tras UPONE-1560 el schema pide ID; Apollo respondia 400, el editor no validaba y Guardar quedaba deshabilitado sin feedback. Se agrego test de contrato que prohibe variables Int en los documentos GraphQL del mod. Ademas: manageObjectRoles escribe el objectId real en el evento RBAC_ROLE_CHANGE (antes null, el tab Logs no mostraba cambios de permisos); saveObjectRoles refresca useRbacPermissions tras asignar roles; objectvalidation-create pasa objectDefinitionId a select con busqueda.

**sourceRef:** e820050 useObjectValidationFields.ts, useValidationParser.ts + tests/graphql-id-variables-contract.test.ts; 709c916 objectRoles.resolver.js.
