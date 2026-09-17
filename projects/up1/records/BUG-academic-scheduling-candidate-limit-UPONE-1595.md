---
id: BUG-academic-scheduling-candidate-limit-UPONE-1595
project: up1
type: bug
module: academic-scheduling
---

Fix al limite de candidatos (candidateLimit.js) usado al rankear docentes en assign-instructor.resolver.js: el tope aplicado de forma ciega recortaba antes de garantizar que los candidatos relevantes (ej. ya asignados o mejor rankeados) quedaran incluidos.

**sourceRef:** 2d0f090 + logic/schedule/candidateLimit.js:35 (candidateLimit).
