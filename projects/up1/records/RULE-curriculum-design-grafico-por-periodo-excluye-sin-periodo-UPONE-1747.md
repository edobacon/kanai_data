---
id: RULE-curriculum-design-grafico-por-periodo-excluye-sin-periodo-UPONE-1747
project: up1
type: rule
module: curriculum-design
level: should
tags:
  - UPONE-1747
  - sp11
  - reportes
  - planes-modulares
---

El reporte CD-PLANENTRY (carga por semestre en el inicio) filtra period IS_NOT_NULL para excluir los planEntry de planes modulares (UPONE-1539), porque un grafico por semestre no aplica a un plan sin periodos secuenciales. Antes mezclaba planes modulares con secuenciales en un eje que no les corresponde.

sourceRef: eed50c9 config/reports/report-template/plan-entry.json:4,6
