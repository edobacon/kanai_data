---
id: BUG-mods-020
project: up1
type: bug
module: mods
tags:
  - recorddetail
  - layout-config
  - up1-manager
  - report
---

# RecordDetail caía a modo `view` cuando la URL traía `instanceId` si `layoutConfig.mode` no estaba explícito, aunque el layout fuera de edición

## Symptom

Al migrar `report-edit`/`reporttemplate-edit` a componente genérico, los layouts quedaban en modo solo-lectura cuando la URL incluía `instanceId`, aunque el layout fuera de edición y el wizard custom (`ReportFormManager`) ya trajera sus propios controles Anterior/Siguiente/Guardar.

## Root cause

- **File**: `mods/up1-manager/config/layouts/report-edit.json`, `reporttemplate-edit.json` (verificado)
- **Cause**: `computedMode` de RecordDetail no encontraba un `mode` explícito en `layoutConfig`, y con `instanceId` presente en la URL infería `view` por default. Afecta a cualquier layout con wizard custom embebido que no dependa de los controles nativos de RecordDetail.

## Fix

Se agregó `mode: "edit"` explícito + `hasIntegratedControls: true` en `layoutConfig` (el wizard ya trae sus propios controles, así que RecordDetail no debe superponer los suyos).

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | administradores editando reports/report templates via up1-manager |
| Data affected | ninguno (bug de modo de UI, no de persistencia) |
| Modules affected | up1-manager (report-edit, reporttemplate-edit); riesgo latente en cualquier mod con wizard custom embebido en RecordDetail |
| Frequency | siempre que se abría un edit con `instanceId` en la URL sin `mode` explícito |

## Related

- **Rules**: contrato `layoutConfig.hasIntegratedControls`/`openMode.create=route` (ver reference de up1-manager y layout)
- **Origen**: recon delta 2026-07-13..2026-08-03, UPONE-1377 (fix de seguimiento a la migración de reports a RecordList genérico).
