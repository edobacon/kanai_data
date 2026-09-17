---
id: DOC-kb-sp11-CM-03-aduana
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
  - CM-03
---

# CM-03 · Frontera core/mod (Aduana) — evidencia extendida

Evidencia extendida de Aduana sobre CM-03 (interno, no pegar en Jira). Condensado en la sección 10 de [CM-03-detalle](CM-03-niveles-desarrollo).

## Artefactos técnicos y veredicto

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| `cm_upsert_development_level` | mod-only | Tool en el pack del mod; llama upsertDevelopmentLevelValidated (RC1-RC4) del mod | logic/developmentLevel-upsert.resolver.js; logic/helpers/validateDevelopmentLevel.js |
| `cm_set_development_level_active` | mod-only | Llama setDevelopmentLevelActiveValidated del mod | logic/developmentLevel-upsert.schema.graphql |
| `cm_delete_development_level` | mod-only | Llama deleteDevelopmentLevelValidated (guard RC6) del mod | logic/developmentLevel-upsert.schema.graphql |
| registerExtra / fichas declarativas | mod-only (se consume) | API existente del motor del MCP | up1/mcp/src/mods/types.js:37 |

## Veredicto global
`todo-mod-only`. Todas las reglas (RC1-RC4, RC6) viven en el resolver/helpers del mod; las tools solo las invocan. No hay artefacto core-worthy ni dependencia cross-mod.

## Nota de reajuste (si el core se implementa, Camino B)
SOBREVIVE. Operaciones compuestas (escala + niveles, cascada, borrado con guard), no escritura de una fila.

## Mecánica de publicación (sync)
Config de `ai/` del mod. No siembra objetos por sync. Sin dependencia externa.
