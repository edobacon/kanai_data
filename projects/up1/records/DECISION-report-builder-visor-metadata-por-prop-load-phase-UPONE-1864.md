---
id: DECISION-report-builder-visor-metadata-por-prop-load-phase-UPONE-1864
project: up1
type: decision
module: report-builder
tags:
  - UPONE-1864
  - viewer
  - load-state
---

ReportViewerManager acepta la prop report (misma forma que getReportById): si viene, omite su propia consulta y va directo a la plantilla y sus datos, y sin ella consulta como antes. Emite load-phase con fase data o render (con rows y view table o chart; no en snapshot) para que el host informe la etapa de carga. Un fallo o un reporte no encontrado ya no termina como sin datos: emite report-error con reason not-found o load-failed, para que un host que espera report-ready (ReportWidget) no quede cargando para siempre. El spinner cubre desde el mount con isPending, y el estado sin datos solo aparece tras hasLoaded y sin error.

Fuente: bbd22eb ReportViewerManagerElement.vue:867; 40a4e49 ReportViewerManagerElement.vue:182,709,776; 8e51566 ReportViewerManagerElement.vue:173,810,937.
