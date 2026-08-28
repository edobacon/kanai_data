---
id: BUG-mods-015
project: up1
type: bug
module: mods
tags:
  - report-builder
  - flexmonster
  - ui
---

# Flexmonster disparaba alerta bloqueante en widgets read-only con measures vacías o schema stale

## Symptom

Instancias read-only de Flexmonster (widgets de dashboard) mostraban su alert dialog nativo ("No hay
medidas para mostrar") cuando el pivot guardado no tenía measures, o referenciaba campos que el
dataset actual no resuelve (filtro de URL a cero filas, snapshot con schema desactualizado).

## Root cause

- **File**: `report-builder/modsComponents/FlexmonsterReport/FlexmonsterComponent.vue`,
  `report-builder/modsComponents/ReportViewerManager/ReportViewerManagerElement.vue` (sin línea exacta
  verificada, ver reporte de recon).
- **Cause**: la librería Flexmonster dispara su propio alert dialog nativo internamente cuando detecta
  measures vacías o un runtime error, independiente del modo read-only del componente que la envuelve.

## Fix

Resuelto en 4 iteraciones: placeholder inline cuando `measures.length === 0`; ampliar la detección a
slice anidado en `dataSource` + pasar `readonly` al viewer; handler de `runtimeerror` + supresión CSS
a nivel body como red de seguridad; finalmente se desacopla de `readonly` (que también apagaba
toolbar/configurator) introduciendo un prop nuevo `suppressEmptyAlert`, para no regresionar el
toolbar de los dashboards que sí necesitan quedar interactivos.

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | usuarios viendo dashboards con widgets Flexmonster read-only |
| Data affected | ninguna, solo UX (dialog bloqueante indeseado) |
| Modules affected | report-builder (`FlexmonsterComponent.vue`, `ReportViewerManagerElement.vue`) |
| Frequency | todo widget read-only con measures vacías o schema stale, antes del fix |
