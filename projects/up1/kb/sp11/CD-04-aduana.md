---
id: DOC-kb-sp11-CD-04-aduana
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
  - CD-04
---

# CD-04 · Frontera core/mod (Aduana) — evidencia extendida

Evidencia extendida de Aduana sobre CD-04 (interno, no pegar en Jira). Condensado en la sección 10 de [CD-04-detalle](CD-04-cascada-groups-vacios).

## Artefactos técnicos y veredicto

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Post-delete cleanup de Groups vacíos | mod-only | Cambio en el resolver de borrado propio de cd (N0) | logic/requirementCategoryDelete.resolver.js; cliente requirementEditor.logic.ts:214-238 (referencia) |

## Veredicto global
`todo-mod-only`. Al ser N0, el cleanup vale para todas las vías. Sin artefacto core-worthy ni dependencia cross-mod.

## Nota de reajuste (si el core se implementa, Camino B)
SOBREVIVE (gap de resolver propio; el core no lo cubre).

## Mecánica de publicación (sync)
Cambio de resolver del mod. Sin dependencia externa.
