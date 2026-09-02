---
id: DECISION-academic-scheduling-lastrun-duration-UPONE-1642
project: up1
type: decision
module: academic-scheduling
tags:
  - UPONE-1642
  - UPONE-1685
  - sp9
  - academic-scheduling
---

(UPONE-1642 CA4) La duracion de la ultima corrida se muestra como columna via Formula LATEST() (apoyada en UPONE-1685), tras descartar la via denormalizada (Scenario.lastRunDurationLabel via compute callback). Guard de duracion negativa.

sourceRef (verificado por diff): academic-scheduling 6a5f440 config/layouts/scenario-list.json + objects/Scenario.json (last run duration via LATEST), 9f517fb (revert denormalized lastRunDurationLabel), 9f147a5 (guard negative duration).
