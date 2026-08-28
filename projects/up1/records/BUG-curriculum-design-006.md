---
id: BUG-curriculum-design-006
project: up1
type: bug
module: curriculum-design
tags:
  - datalog
  - coredatalog
  - manageapproles
  - audit
  - silentnoop
---

# manageAppRoles usa `prisma.dataLog` (delegate obsoleto) vs `core_DataLog` — silent no-op

## Symptom

Cambio de roles de app via mutation `manageAppRoles` podria no loguearse en el audit (silent no-op).

## Expected behavior

Escritura en `prisma.core_DataLog.create` (delegate Prisma vigente).

## Root cause

El objeto se renombro de `objects/business/Base/dataLog.json` (era) a `objects/core/core_DataLog.json` (Klaus). Delegate Prisma canonico es `core_DataLog`. `appRoles.resolver.js:manageAppRoles` aun referencia `prisma.dataLog` (probablemente no existe). Guard `if (changed && prisma.dataLog)` cae a falsy -> la condicion del then-branch no se ejecuta -> el cambio de rol no persiste en DataLog.

## Impact

Cambios de roles de app sin entrada en DataLog -> audit gap. Preexistente y tangencial a P3 (no es hijo polimorfico). No detectable por UI hasta forensic.

## Reproduction

Mutation `manageAppRoles` con un cambio de rol valido -> query `listInstances(name: "core_DataLog")` no lista la entrada.

## Workaround

Leer `core_Role` directamente para confirmar el cambio (no cubre la auditoria temporal).

## Solution

Pendiente.

## Related

- **Specs**: —
- **Tickets**: TICKET-102
