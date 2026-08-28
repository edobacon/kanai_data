---
id: BUG-mods-018
project: up1
type: bug
module: mods
tags:
  - reconciliation
  - data-loss
  - up1-manager
  - app-roles
---

# `manageAppRoles` hacía delete+recreate completo de `up1_suite_app_role`, perdiendo `modRoleId` de las filas que se mantenían

## Symptom

Al reconciliar las asignaciones de rol de una app, las filas que no cambiaban perdían igual su `modRoleId` (mapeo al rol interno de mod), porque la operación borraba todas las filas existentes y las recreaba desde cero.

## Root cause

- **File**: `mods/up1-manager/logic/appRoles.resolver.js:76-90` (verificado)
- **Cause**: la reconciliación usaba `deleteMany` de todas las filas seguido de `create` de todas las asignaciones nuevas, sin diferenciar cuáles ya existían. `modRoleId` es una columna de mapeo adicional que no se reconstruye desde el input de la mutation, así que se perdía en cada reconciliación.

## Fix

Se cambió a diff contra el estado previo: solo se borran las filas que ya no aplican y solo se crean las nuevas; las filas que se mantienen no se tocan y conservan su `modRoleId`. Ver [[RULE-mods-063]].

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | administradores de roles internos de app en up1-manager |
| Data affected | `up1_suite_app_role.modRoleId` (mapeo a rol interno perdido en cada reconciliación) |
| Modules affected | up1-manager (asignación de roles internos por app) |
| Frequency | en toda reconciliación de `manageAppRoles` con filas preexistentes |

## Related

- **Rules**: [[RULE-mods-063]]
- **Origen**: recon delta 2026-07-13..2026-08-03, commit `9c81510`, UPONE-1354. Incluye tests unitarios nuevos (`tests/appRoles.resolver.test.ts`).
