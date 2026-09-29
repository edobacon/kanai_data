---
id: BUG-academic-scheduling-tope-candidatos-sala-UPONE-1924
project: up1
type: bug
module: academic-scheduling
tags:
  - UPONE-1924
  - sp11
  - assign-panels
---

DEFAULT_FILLER_LIMIT (100) aplica solo al relleno de candidatos NO relevantes: para instructores, quienes no dictan el curso ni estan asignados (UPONE-1595); para salas, las sin aforo suficiente, de otro campus y sin asignar (UPONE-1924). Los relevantes viajan siempre completos y no cuentan contra el tope. Antes, el tope de assign-resource.resolver.js podia recortar salas relevantes.

sourceRef: f2e9202 logic/schedule/candidateLimit.js:24-29, logic/assign-resource.resolver.js
