---
id: DECISION-report-builder-politica-celdas-vacias-flexmonster-UPONE-1863
project: up1
type: decision
module: report-builder
tags:
  - UPONE-1863
  - flexmonster
  - empty-cells
---

Flexmonster ya oculta filas y columnas sin valores; lo que queda son intersecciones sin registros, que se nombran en vez de ocultarse: nullValue, divideByZeroValue e infinityValue se fuerzan a "-" en todos los formatos, con celda atenuada y tooltip "Sin datos". La política se aplica en render a todas las formas de config (datos vivos, blob guardado y snapshot congelado), así los reportes existentes de todos los tenants la heredan sin migración ni opción por reporte. Un 0 real no cuenta como vacío, y el miembro (blank) se renombra con la i18n rb.viewer.blankMember cuando la localización viene empaquetada.

Fuente: 91e4530 modsComponents/FlexmonsterReport/emptyCellPolicy.ts:11,37; FlexmonsterComponent.vue:298.
