---
id: BUG-suite-apollo-cache-getmypermissions-merge-MGR-fix
project: up1
type: bug
module: suite
---

UserPermissionsSummary no tiene id propio, y useRbacPermissions (pide capabilityNames) y useRoleSelection (pide user/roles) escriben el mismo campo getMyPermissions de ROOT_QUERY con selecciones disjuntas; sin merge policy Apollo reemplazaba el objeto entero y avisaba "Cache data may be lost". Se agrega Query:{fields:{getMyPermissions:{merge:true}}} al typePolicy.

**sourceRef:** 21216b2 + plugins/apollo.client.ts:189-191.
