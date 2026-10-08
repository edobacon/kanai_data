---
id: RULE-report-builder-kpi-exige-medida-en-pivot-UPONE-1782
project: up1
type: rule
module: report-builder
level: should
tags:
  - UPONE-1782
  - kpi
  - wizard
---

El paso Configuración del wizard bloquea el guardado con advertencia si Mostrar como KPI está activo y no hay medida, o si la medida elegida ya no está entre los valores del pivot. isKpiMeasureMissing recibe la lista de medidas del pivot para validarlo. La validación vive solo en el wizard: la API GraphQL acepta medida vacía y los reportes sembrados desde mods/<mod>/config/reports/ no pasan por el chequeo.

Fuente: 1b8d2eb modsComponents/ReportFormManager/kpiValidation.ts:8; ReportFormManagerElement.vue:1725.
