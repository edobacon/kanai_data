---
id: BUG-curriculum-design-009
project: up1
type: bug
module: curriculum-design
tags:
  - withdatalog
  - alias
  - rtprojected
  - audit
  - uipath
---

# `withDataLog` no auditaba ediciones via alias RecordType (`rt__<RT>__<base>`) — audit gap masivo

## Symptom

Writes sobre Curriculum/Activity/Offering via alias RecordType (path principal de la UI) NO generaban entrada en DataLog. Estandar probado contra UPU real.

## Expected behavior

`isDataLogEnabled` resuelve el archivo del objeto por nombre canonico base (no por alias RT). Tras el fix, `resolveBaseObjectType` normaliza alias -> base canonico y `recordMutationDataLog` se reutiliza en el override del mod.

## Root cause

`isDataLogEnabled` resolvia el archivo JSON por `${objectType.toLowerCase()}.json` en `business/Base`/`tenants/Base`/`objects/up1` pero NO en `business/RecordTypes/`. Para alias `rt__Plan__curriculum` -> archivo no encontrado -> `enabled=false` -> passthrough sin audit. Ademas `polymorphicUpdate.rtUpdateHandler` (rt__X__curricularsection) escribia sin pasar por `withDataLog` (segundo gap).

## Impact

Planes de estudio (Plan/Minor) y sus hijos NO auditados en absoluto antes del fix. Brecha grande en historial de la UI. Tests S1/S2 testeaban con `objectType` base (no alias).

## Reproduction

Editar un Plan via UI -> query `listInstances(name: "core_DataLog")` no lista la entrada. Mismo path via MCP con `objectType=Plan` tampco.

## Workaround

Fix: `resolveBaseObjectType` (normaliza alias -> base canonico en withDataLog) + `recordMutationDataLog` reutilizable (llamado tambien por el mod).

## Solution

Pendiente.

## Related

- **Specs**: SPEC-curriculum-design-datalog-history-attribution
- **Tickets**: TICKET-102
