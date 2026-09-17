---
id: DECISION-curriculum-mapping-contribution-percentage-UPONE-1769
project: up1
type: decision
module: curriculum-mapping
---

Se agrega el campo contributionPercentage (string, opcional) a objects/CompetencyAlignment.json para registrar con que peso aporta una tributacion al logro de la competencia cuando el aporte se reparte entre varias fuentes. Se agrega el indice compuesto planId+competencyNodeId+developmentLevelId para soportar el agrupamiento por competencia y nivel dentro de un plan. Sin validador de suma/rango todavia en este rango; el campo es string (no numerico), la validacion de formato/rango queda pendiente.

**sourceRef:** e10d3b5 + objects/CompetencyAlignment.json:15-16,69-75.
