---
id: DECISION-academic-scheduling-cohorte-sql-directo-UPONE-1890
project: up1
type: decision
module: academic-scheduling
tags:
  - UPONE-1890
  - sp11
  - performance
  - rules-engine
---

breRanker arma la cohorte de secciones del escenario (facts de grupo para reglas SSA de conteo y acumulado) con consultas SQL directas en vez de include anidados de Prisma, para no hidratar objetos completos cuando solo se necesitan filas planas. Esas consultas deben castear los binds de id con pgIdType.js (ver la regla de UPONE-1768).

sourceRef: 549ba1a logic/schedule/breRanker.js:457
