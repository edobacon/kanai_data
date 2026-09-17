---
id: BUG-object-manager-syncapproles-ownership-guard-UPONE-1776
project: up1
type: bug
module: object-manager
---

El deleteMany en syncAppRoles matcheaba solo por appId + roleId, asi que cualquier fila up1_suite_app_role cuyo rol no estuviera en app.json roles[] se borraba, incluyendo profile mappings hechos por un admin de plataforma. Fix: se agrega el mismo guard de ownership de las funciones hermanas (modRoleId null AND updatedById null), de forma que el sync solo borra filas que el mismo creo.

**sourceRef:** b4cdef45 + scripts/sync/dbSync.js.
