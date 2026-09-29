---
id: RULE-academic-scheduling-guardar-advierte-no-bloquea-UPONE-1941
project: up1
type: rule
module: academic-scheduling
level: must
tags:
  - UPONE-1941
  - sp11
  - rules-engine
  - unified-panel
---

dailyCapExcess y el chequeo del motor calculan que reglas rompe la combinacion elegida (exceso del tope diario, mensajes del catalogo) y el panel muestra un modal de confirmacion, pero esas reglas no impiden guardar. Lo unico que bloquea es no completar el cupo semanal de la seccion (weeklyModules), verificado aparte por unifiedSaveCompleteness (UPONE-1948).

sourceRef: 718d2af logic/schedule/dailyCap.js:22 (dailyCapExcess), logic/schedule/breRanker.js:925-938 (brokenRules, asked)
