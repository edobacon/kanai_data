---
id: BUG-mods-017
project: up1
type: bug
module: mods
tags:
  - security
  - rbac
  - auth
  - up1-manager
  - sec-01
---

# SEC-01: `getObjectRoleCapabilities`/`manageObjectRoles` sin guarda de autorización - cualquier autenticado leía/mutaba roles y capabilities de un objeto

## Symptom

Cualquier caller autenticado (sin verificación de capability) podía consultar `getObjectRoleCapabilities` o ejecutar `manageObjectRoles` para reasignar roles/capacidades de cualquier objeto del tenant.

## Root cause

- **File**: `mods/up1-manager/logic/objectRoles.resolver.js:71,129` (verificado)
- **Cause**: ambos resolvers estaban expuestos sin ningún wrapper de autorización; el core no aplica guarda automática a mutations/queries custom de mod.

## Fix

Se envolvieron con `requireCapability('mod/up1-manager/objectdefinition:view', ...)` (lectura) y `withAuth(['mod/up1-manager/objectdefinition:create', 'mod/up1-manager/objectdefinition:edit'], ...)` (mutation), importados de `services/auth/withAuth.js`. Ver [[RULE-mods-063]].

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | cualquier usuario autenticado del tenant (antes del fix) |
| Data affected | asignaciones de roles/capabilities por objeto (`core_Capability`, tablas de roles internos) |
| Modules affected | up1-manager (RBAC de objeto) |
| Frequency | en toda llamada a las dos operaciones, mientras no tuvieron guarda |

## Related

- **Rules**: [[RULE-mods-062]] (mutations custom de mod no reciben auth automática del core), [[RULE-mods-063]] (guarda explícita + reconciliación diff + vocabulario runtime en up1-manager)
- **Origen**: recon delta 2026-07-13..2026-08-03, commit `d795773`, UPONE-1354.
