---
id: BUG-mods-004
project: up1
type: bug
module: mods
---

# TributationHeatmapElement usa patrón obsoleto de instanceId (getCurrentInstance().parent)

## Symptom

`modsComponents/TributationHeatmap/TributationHeatmapElement.vue:107-117` implementa `resolveInstanceIdFromParents()` caminando `getCurrentInstance().parent` para obtener el `matrixId` del RecordDetail padre. Patrón documentado en RULE-layout-013 pero obsoleto tras RULE-layout-014.

## Expected behavior

Usar DOM walk buscando `__vueParentComponent.props.instanceId` en ancestros DOM, como lo hace `assessment-matrix/modsComponents/WorkflowActions/WorkflowActionsElement.vue:110-125`.

## Root cause

El mod curriculum-mapping se desarrolló antes de que se descubriera que defineElement rompe la cadena Vue parents (formalizado en RULE-layout-014, TICKET-005).

## Impact

En producción, el heatmap no obtiene `matrixId` — no puede ejecutar la query. La tab del heatmap aparece vacía o con error silencioso.

## Reproduction

Abrir un `CmCompetencyMatrix` en RecordDetail, ir al tab del heatmap — no carga los datos porque `matrixId` queda undefined.

## Workaround

Copiar el patrón `findInstanceIdFromDOM` de `WorkflowActionsElement.vue`.

## Solution

Pendiente.

## Related

- **Specs**: SPEC-mods-curriculum-mapping
- **Tickets**: TICKET-002
