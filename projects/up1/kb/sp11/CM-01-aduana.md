---
id: DOC-kb-sp11-CM-01-aduana
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
  - CM-01
---

# CM-01 · Frontera core/mod (Aduana) — evidencia extendida

Evidencia extendida de la pasada de Aduana sobre CM-01 (interno, no pegar en Jira). Condensado en la sección 10 de [CM-01-detalle](CM-01-lectura-dominio).

## Artefactos técnicos y veredicto

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Tool de lectura por cada una de las 6 queries de dominio | mod-only | Se declara en el pack del mod; la query ya vive en el resolver del mod | mods/curriculum-mapping/ai/index.js:38; logic/adoptedMatrices.resolver.js:121, logic/alignmentView.resolver.js:317, logic/competencyAlignment.resolver.js:337, logic/matrixAdoption.resolver.js:1847 |
| Registro de tool de lectura (`operation:"query"`) | mod-only (se consume) | El motor del MCP ya soporta queries como fichas de forma nativa; no se crea ni modifica core | up1/mcp/src/mods/types.js:14; src/tools/register-declarative-tools.js:8 |
| Contratos/fieldDocs de resultados | mod-only | Guía tipo hint en `ai/` del mod | mods/curriculum-mapping/ai/ |

## Veredicto global
`todo-mod-only`. No hay artefacto core-worthy ni dependencia cross-mod. El punto que podría haber sido core-worthy (que el motor no soportara tools de lectura de dominio) quedó descartado: `ToolDescriptor.operation` admite `"query"` (types.js:14), así que exponer lecturas es capacidad existente de la plataforma, no una extensión de core.

## Mecánica de publicación (sync)
No aplica escritura de objetos ni de layouts; es config de `ai/` del mod. No arrastra siembra por sync más allá del registro del pack. Sin dependencia externa.
