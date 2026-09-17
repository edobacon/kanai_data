---
id: DOC-kb-sp11-CD-01-aduana
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
  - CD-01
---

# CD-01 · Frontera core/mod (Aduana) — evidencia extendida

Evidencia extendida de Aduana sobre CD-01 (interno, no pegar en Jira). Condensado en la sección 10 de [CD-01-detalle](CD-01-prereq-on-add).

## Artefactos técnicos y veredicto

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Guard de prerreq/correq/créditos en el create de planEntry | mod-only | Cambio en el resolver override propio de cd (N0); reusa el twin server ya existente en el mod | logic/sectionValidation.resolver.js:202-221; planEntry-batch.resolver.js:154-160; evaluateRequirementTree.js; requirementTreeLoader.js |
| Patrón de referencia (delete guard) | mod-only | Ya existe en el mod | logic/planEntryDeletionRequirementGuard.js |

## Veredicto global
`todo-mod-only`. La regla se cierra en el override N0 de cd. Al ser N0, la validación vale para pantalla + genérico (MCP) + cualquier otra vía a la vez, sin tocar el core. No hay artefacto core-worthy ni dependencia cross-mod.

## Nota de reajuste (si el core se implementa, Camino B)
SOBREVIVE. El core no cubre los gaps client-only de cd: siguen siendo trabajo del resolver propio.

## Mecánica de publicación (sync)
Cambio de resolver del mod. Si hay artefactos regenerables por sync, correr el sync tras el cambio. Sin dependencia externa.
