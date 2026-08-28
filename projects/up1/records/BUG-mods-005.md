---
id: BUG-mods-005
project: up1
type: bug
module: mods
---

# curriculum-mapping sin carpeta lang — i18n completamente ausente

## Symptom

El mod curriculum-mapping no tiene carpeta `lang/`. Labels de layouts (columns, forms), mensajes del componente heatmap, tooltips y maps `levelLabels`/`typeLabels` en `modsComponents/TributationHeatmap/TributationHeatmapElement.vue:154-166` están hardcodeados en español.

## Expected behavior

Carpeta `lang/` con archivos `es_CL.json`, `en_CL.json`, `pt_BR.json` siguiendo estructura `object.{ObjectName}.{field}.label` y `enum.{field}.{value}`. Componentes usan `$t(...)` en vez de maps inline.

## Root cause

TICKETs 002-004 priorizaron funcionalidad (tabs, navegación, RBAC, heatmap) sobre i18n. Se difirió implícitamente.

## Impact

El mod es inusable en tenants no hispanohablantes. Bloqueante para rollout multi-país (uP1 opera al menos es_CL, en_CL, pt_BR).

## Reproduction

Cambiar locale a `en_CL` y abrir cualquier vista del mod curriculum-mapping — todos los textos aparecen en español.

## Workaround

Ninguno sin modificar archivos del mod.

## Solution

Pendiente.

## Related

- **Specs**: SPEC-mods-curriculum-mapping
- **Tickets**: TICKET-002
