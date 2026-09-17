---
id: DOC-kb-sp11-CD-08-aduana
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
  - CD-08
---

# CD-08 · Frontera core/mod (Aduana) — evidencia extendida

Evidencia extendida de Aduana sobre CD-08 (interno, no pegar en Jira). Condensado en la sección 10 de [CD-08-detalle](CD-08-ergonomia-move-requirement-tools).

## Artefactos técnicos y veredicto

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| `cd_move_plan_entry` (expone movePlanEntry) | mod-only | La mutation ya existe en el mod; solo se expone | logic (movePlanEntry, computeMoveRenumbering, assertValidMoveDestination) |
| Tools del Requirement Editor | mod-only | Exponen operaciones de dominio del mod; se apoyan en CD-03/CD-04 | mods/curriculum-design/ai/tools.js; logic (resolver de requirement) |

## Veredicto global
`todo-mod-only`. Sin artefacto core-worthy ni dependencia cross-mod.

## Nota de reajuste (si el core se implementa, Camino B)
SOBREVIVE. Son tools de dominio del mod (una expone una mutation existente, las otras orquestan operaciones de dominio); el genérico gobernado del core no las reemplaza porque no son escritura de una fila.

## Mecánica de publicación (sync)
Config de ai/ del mod. Sin dependencia externa.
