---
id: BUG-academic-scheduling-domingo-ultimo-sugerencia-UPONE-1768
project: up1
type: bug
module: academic-scheduling
tags:
  - UPONE-1768
  - sp11
  - rules-engine
  - horarios
---

El greedy de sugerencia (suggestSessions/buildSessions) ordenaba por dayOfWeek tal cual y, como domingo es 0, quedaba primero en el desempate cuando el motor no distingue dias. suggestionDayOrder mapea domingo a 7 solo para el orden de exploracion; el dayOfWeek real, el payload al motor y lo grabado en la base no cambian, asi que domingo sigue siendo valido cuando es la unica opcion.

sourceRef: 37e8c33 logic/schedule/breRanker.js:974 (suggestionDayOrder), :976 (blockOrder)
