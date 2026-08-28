---
id: BUG-mods-013
project: up1
type: bug
module: mods
tags:
  - report-builder
  - rbac
  - security
---

# Las 7 mutations bespoke de report-builder no corrían RBAC server-side

## Symptom

Cualquier request GraphQL autenticado podía crear, editar o borrar `ReportTemplate`/`Report`
(`createReportTemplate`, `updateReportTemplate`, `deleteReportTemplate`, `createReport`,
`updateReport`, `deleteReport`, `duplicateReport`) sin tener la capability correspondiente, siempre
que llamara al endpoint GraphQL directamente en vez de pasar por la UI.

## Root cause

- **File**: `report-builder/logic/reportTemplate.resolver.js`, `report-builder/logic/reportData.resolver.js`
  (verificado: `checkCapability` ausente antes del fix en estas 7 mutations).
- **Cause**: estas mutations bespoke bypasean el resolver genérico de instancia
  (`instance.resolver.js` en object-manager), que sí trae RBAC automático. Antes del fix, la única
  gate era `requiredPermissions` del lado UI (`ReportFormManagerElement.vue`), que nunca corre contra
  llamadas GraphQL directas.

## Fix

Se agrega `checkCapability(context, ['mod/up1-manager/<recurso>:<accion>'])` al inicio de cada una de
las 7 mutations, antes de tocar la base de datos. Ver `reportData.resolver.js:932,1076,1400,1427` y
`reportTemplate.resolver.js:400,478,595`. Regla canónica: [[RULE-mods-061]].

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | cualquier usuario autenticado sin capability de reporting |
| Data affected | ReportTemplate, Report (creación/edición/borrado no autorizados) |
| Modules affected | report-builder (mutations bespoke) |
| Frequency | explotable en cada llamada GraphQL directa antes del fix |
