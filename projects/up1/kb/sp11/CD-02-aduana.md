---
id: DOC-kb-sp11-CD-02-aduana
project: up1
type: doc
module: curriculum-design
tags:
  - sp11
  - mcp
  - curriculum-design
  - aduana
  - frontera
  - cd-plan
  - CD-02
---

# CD-02 · Frontera core/mod (Aduana) — evidencia extendida

Evidencia extendida de Aduana sobre CD-02 (interno, no pegar en Jira). Condensado en la sección 10 de [CD-02-detalle](CD-02-consistencia-k-de-n).

## Artefactos técnicos y veredicto

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Invariante K<=N en el dispatch de requirement | mod-only | Cambio en el resolver override propio de cd (N0) | logic (dispatch de requirement); curriculumMesh.logic.ts:557-561 (referencia cliente) |

## Veredicto global
`todo-mod-only`. Al ser N0, la regla vale para todas las vías. Sin artefacto core-worthy ni dependencia cross-mod.

## Nota de reajuste (si el core se implementa, Camino B)
SOBREVIVE (gap de resolver propio; el core no lo cubre).

## Mecánica de publicación (sync)
Cambio de resolver del mod. Sin dependencia externa.
