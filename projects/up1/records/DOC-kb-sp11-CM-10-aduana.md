---
id: DOC-kb-sp11-CM-10-aduana
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - aduana
  - frontera
  - cm-plan
  - CM-10
---

# CM-10 · Frontera core/mod (Aduana) — evidencia extendida

Evidencia extendida de Aduana sobre CM-10 (interno, no pegar en Jira). Condensado en la sección 10 de [CM-10-detalle](CM-10-huecos-server-rm7-rp5).

## Artefactos técnicos y veredicto

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| RM7 (retiro/borrado de matriz), si se implementa | mod-only | Resolver/mutation propio de cm | logic/competencyMatrix-update.* o nueva mutation del mod |
| RP5 (completitud de descriptores), si se implementa | mod-only | Resolver del árbol/rúbrica de cm | logic/competencyTree-upsert.resolver.js (persistRubric) |

## Veredicto global
`todo-mod-only` si se implementa; `N/A` mientras sea solo decisión de PO. No hay artefacto core-worthy ni dependencia cross-mod.

## Nota de reajuste (si el core se implementa, Camino B)
SOBREVIVE (independiente del core; son reglas server-side del propio mod).

## Mecánica de publicación (sync)
Cambio de resolver del mod (si se implementa). Sin siembra por sync.
