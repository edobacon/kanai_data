---
id: BUG-curriculum-design-is-not-null-sin-comillas-UPONE-1747
project: up1
type: bug
module: curriculum-design
tags:
  - UPONE-1747
  - sp11
  - reportes
---

El template de reporte de entradas de malla filtraba con operator: "IS_NOT_NULL" como string, lo que rompia el filtro contra listInstances del core, que espera el operador como identificador del enum. Afectaba el widget de carga por semestre del inicio. Aplica a todo report-template que use ese operador.

sourceRef: 9c25a79 config/reports/report-template/plan-entry.json:6
