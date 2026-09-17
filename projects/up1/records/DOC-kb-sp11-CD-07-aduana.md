---
id: DOC-kb-sp11-CD-07-aduana
project: up1
type: doc
module: curriculum-design
tags:
  - sp11
  - mcp
  - curriculum-design
  - aduana
  - frontera
  - dependencias-externas
  - cd-plan
  - CD-07
---

# CD-07 · Frontera core/mod (Aduana) — evidencia extendida

Evidencia extendida de Aduana sobre CD-07 (interno, no pegar en Jira). Condensado en la sección 10 de [CD-07-detalle](CD-07-postura-genericwriteallowed).

## Artefactos técnicos y veredicto

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Declaración `genericWriteAllowed` de los 13 | mod-only | Config del pack del mod (opt-out); el enforcement ya vive en los overrides N0 del mod | mods/curriculum-design/ai/; logic (overrides N0) |
| Guard de delete (si una decisión revela hueco) | mod-only | Cambio en el resolver de borrado propio de cd | logic/requirementCategoryDelete.resolver.js |

## Dependencia externa (SOFT, avalada por Aduana)
La declaración solo cobra efecto con el motor del bloqueo presente (rama `origin/UPONE-1758` del MCP). Es el mismo lockstep de [CM-09](CM-09-escritura-segura-governedobjects): cd es la contraparte opt-out (genericWriteAllowed) frente a los governedObjects de cm. SOFT porque cd ya es seguro por N0 aunque el motor no exista.

## Veredicto global
`mod-only` (declaración) + dependencia externa SOFT del merge del motor. No hay artefacto core-worthy: cd no necesita código de core.

## Nota de reajuste (si el core se implementa, Camino B)
SE REAJUSTA (no se elimina): cd migraría su override total a interceptores componibles del core. Decisión de diseño abierta (gradual vs override llamando al componedor).

## Mecánica de publicación (sync)
Config de ai/ + eventual guard de resolver. El gate de completitud corre en el sync/CI.
