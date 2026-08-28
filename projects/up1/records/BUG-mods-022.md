---
id: BUG-mods-022
project: up1
type: bug
module: mods
tags:
  - up1-manager
  - rbac
  - audit
  - datalog
  - security
---

# `manageAppRoles` no verificaba capabilities y su audit log nunca se escribia

## Symptom

Cualquier token de tenant valido podia invocar `manageAppRoles` y reasignar los roles de una app,
sin importar si el usuario tenia permiso para administrar apps. Ademas, cada reconciliacion de roles
debia dejar un registro de auditoria y nunca lo dejaba.

## Expected behavior

`manageAppRoles` deberia exigir las capabilities de administracion de apps antes de reasignar roles, y cada reconciliacion deberia dejar un registro real en `core_DataLog`.

## Root cause

File: `mods/up1-manager/logic/appRoles.resolver.js`

Cause: la mutation `manageAppRoles` no estaba envuelta en ningun `requireCapability`, asi que
`withAuth` no la interceptaba. En paralelo, el audit log intentaba escribir en `prisma.dataLog`, un
modelo que no existe en el cliente Prisma tenant-scoped (el modelo real es `core_DataLog`): la
escritura fallaba en silencio y la rama quedaba muerta, sin dejar rastro de quien cambio los roles de
una app ni cuando.

## Fix

`manageAppRoles` se envuelve en `requireCapability(APP_ROLE_CAP.CREATE, requireCapability(APP_ROLE_CAP.DELETE, ...))`
(`logic/appRoles.resolver.js:86`, capabilities declaradas en `:21-24`), exigiendo ambas puertas antes
de cualquier escritura. El audit log pasa a escribir en `prisma.core_DataLog.create` con
`metadata.customAction: 'APP_ROLES_UPDATED'` (`logic/appRoles.resolver.js:154`), solo cuando el set de
roles realmente cambio (comparacion por set, no por orden). El fallo de escritura del audit se degrada
a `console.warn` para no romper la reconciliacion principal si el log falla.

## Impact

| Area | Antes | Despues |
|---|---|---|
| Autorizacion | Cualquier token de tenant valido reasignaba roles de una app | Exige `up1_suite_app_role:create` y `up1_suite_app_role:delete` |
| Auditoria | Escritura a un modelo Prisma inexistente, rama muerta | Registro real en `core_DataLog` con diff semantico de roles |
| Resiliencia | N/A | Un fallo del audit log no revierte ni bloquea la reconciliacion |

## Reproduction

### Steps
1. Obtener un token valido de un tenant sin la capability de administracion de apps.
2. Invocar la mutation `manageAppRoles`.
3. Verificar que la reasignacion de roles se ejecuta igual, y que no queda ningun registro en `core_DataLog` tras la operacion.
