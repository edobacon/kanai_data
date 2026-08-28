---
id: BUG-mods-021
project: up1
type: bug
module: mods
tags:
  - uengagement
  - retention
  - schema-change
  - sin-contexto
---

# Retiro de FKs `workflowId`/`currentStatusId` de `Activity` (uEngagement) sin contexto documentado en el commit

## Symptom

El objeto base `Activity` del mod `uengagement-up1` perdió dos FKs (`workflowId` → Workflow, `currentStatusId` → WorkflowStatus) en un commit sin ticket asociado ni explicación en el mensaje. No hay migración de datos visible en el diff, solo el cambio de definición JSON.

## Root cause

- **File**: `mods/uengagement-up1/objects/Activity.json` (verificado, commit `6cf017e` "Remove workflowId and currentStatusId FKs from Activity")
- **Cause**: sin contexto en el commit, se interpreta como rollback de un feature de workflow que no llegó a usarse en `Activity`. Un grep sobre el repo no encontró remanentes que sigan referenciando las FKs.

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | ninguno confirmado (feature no usado, según lectura del código) |
| Data affected | esquema de `Activity` (columnas FK retiradas) |
| Modules affected | uengagement-up1 |
| Frequency | n/a (cambio de esquema puntual) |

## Reproduction

### Steps
1. `git log -- mods/uengagement-up1/objects/Activity.json` muestra el commit `6cf017e` sin ticket.
2. No hay entrada de decision/bug previa en el KB que documente el motivo.

## Workaround

Ninguno necesario mientras no haya remanentes rotos (confirmado por grep en el propio repo).

## Solution

Pendiente: confirmar con el autor si fue intencional (rollback de feature abandonado) y, de serlo, registrar como decisión explícita en vez de dejarlo como cambio de esquema sin contexto. Este registro documenta el gap para que no se pierda el rastro.

## Related

- **Origen**: recon delta 2026-07-13..2026-08-03, repo `uengagement-up1`, sin ticket UPONE asociado.
