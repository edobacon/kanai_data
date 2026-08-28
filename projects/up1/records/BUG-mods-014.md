---
id: BUG-mods-014
project: up1
type: bug
module: mods
tags:
  - report-builder
  - validation
  - env-filters
---

# Validación de env-filters no cubría create-via-pivot sin dataSourceFields explícito

## Symptom

Un `Report` roto (con un env-filter que no calza contra la proyección real de datos) quedaba
persistido sin error cuando el cliente enviaba `pivot` pero no `dataSourceFields` explícito; el
problema solo se detectaba en el siguiente `update`.

## Root cause

- **File**: `report-builder/logic/reportData.resolver.js` (`createReport`, sin línea exacta
  verificada; ver reporte de recon).
- **Cause**: `createReport` saltaba la validación de env-filters cuando `dataSourceFields` venía vacío,
  porque el merge client-side omite ese campo en reports nuevos creados directamente desde un pivot.
  Mismatch entre lo que el cliente envía y lo que el servidor espera para validar.

## Fix

Nueva función `deriveDataSourceFieldsFromPivot(pivot)` que extrae los fields desde
rows/columns/values del pivot (ignora nombres especiales como `[Measures]`) y se usa como fallback
cuando `dataSourceFields` viene vacío, tanto en `createReport` como en `updateReport`. Se amplía
además el trigger de validación en `updateReport` para disparar también cuando solo cambia `pivot`
(antes solo con `templateId`/`dataSourceFields`).

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | usuarios que crean reports directamente desde un pivot sin pasar por un template |
| Data affected | Report con env-filter roto persistido silenciosamente |
| Modules affected | report-builder (`reportData.resolver.js`) |
| Frequency | todo create-via-pivot sin dataSourceFields explícito, antes del fix |
