---
id: BUG-curriculum-design-008
project: up1
type: bug
module: curriculum-design
tags:
  - datalog
  - coredatalog
  - rbac
  - layout
  - visor
  - transversal
---

# Visor `Historial`/`Visor DataLog` referencia `objectName: \"DataLog\"` (renombrado a `core_DataLog`) — RBAC default-deny transversal

## Symptom

El tab 'Historial -> ChangeLog' en `default_Activity_view.json` y el visor DataLog lanzan 'Authorization Error: You do not have permission to view DataLog objects'.

## Expected behavior

`listInstances(name: "core_DataLog")` (uso del nombre vigente del objeto) o el `objectName` del layout corregido.

## Root cause

Layout usa `objectName: "DataLog"` pero el objeto se renombro a `core_DataLog` (rename Klaus). RBAC default-deny (`authChecker.js:310`) bloquea por nombre inexistente. Mismo patron en `up1-manager/objects/business/Base/objectdefinition-view.json:402` y su contract test `datalog-viewer-contract.test.ts:34`.

## Impact

8 layouts (Activity + 7 RT de CurricularSection + CurricularLink_view) muestran 'No tienes permiso'. Transversal afecta tambien el visor de up1-manager (mod fuera de scope P3).

## Reproduction

Abrir cualquier RecordDetail de Activity -> tab Historial -> 'No tienes permiso'. Cambio `objectName: DataLog` -> `core_DataLog` resuelve el permiso.

## Workaround

Cambiar `objectName` a `core_DataLog` en cada layout.

## Solution

Pendiente.

## Related

- **Specs**: —
- **Tickets**: TICKET-102
