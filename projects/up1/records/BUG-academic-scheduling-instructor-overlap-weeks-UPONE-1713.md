---
id: BUG-academic-scheduling-instructor-overlap-weeks-UPONE-1713
project: up1
type: bug
module: academic-scheduling
---

Causa raiz: los bloques que llegaban al evaluador no cargaban su rango de semanas, asi que el chequeo de solape de docente comparaba por termino completo aunque la seccion estuviera acotada a un sub-periodo; ranking (lectura) y guardado (escritura) del mismo panel podian discrepar. Fix en dos pasos: 1c92eb0 acota el solape por semanas del sub-periodo (weekRange.js). Follow-up 200651e: el path de escritura no le pasaba al evaluador bloques con semana; el descarte de marca forzada usaba el nombre visible del docente en vez de su id (dos docentes con mismo nombre se pisaban); el panel resuelve el lado propio por slot.

**sourceRef:** 1c92eb0 logic/schedule/weekRange.js:44 (isoWeeksInRange) + 200651e logic/assign-instructor.resolver.js.
