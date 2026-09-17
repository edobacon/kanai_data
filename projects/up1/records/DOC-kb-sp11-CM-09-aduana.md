---
id: DOC-kb-sp11-CM-09-aduana
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - aduana
  - frontera
  - dependencias-externas
  - cm-plan
  - CM-09
---

# CM-09 · Frontera core/mod (Aduana) — evidencia extendida

Evidencia extendida de Aduana sobre CM-09 (interno, no pegar en Jira). Condensado en las secciones 10 y 10bis de [CM-09-detalle](CM-09-escritura-segura-governedobjects).

## Artefactos técnicos y veredicto

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Declaración `governedObjects`/`blockGenericMutation` de los 10 | mod-only | Config del pack del mod; el enforcement vive en el cliente GraphQL del MCP (no en un resolver del mod ni en object-manager) | mods/curriculum-mapping/ai/index.js:38; up1/mcp/src/contracts/generic-write-block.js; src/graphql-client.js:77 |

## Dependencias externas (avaladas por Aduana)
El artefacto de cm es mod-only, pero la ACTIVACIÓN depende de piezas fuera del mod:
- **Motor del bloqueo** (up1/mcp, plataforma del MCP): rama `origin/UPONE-1758` ya construida, falta merge. No es código nuevo de core; es coordinación.
- **academic-scheduling**: migrar `as_set_rule_value` a `up1.write()` (~4 líneas). Otro mod.
- **curriculum-design**: sync de fixes cerrados (a70c3ab). Otro mod.
- **CI del repo mcp**: cablear `validate-governed-objects.js` como gate de PR.

Viabilidad: viable este sprint (todo está construido o es cambio mínimo), pero es un lockstep: mergea junto o el sistema queda peor (motor solo bloquea cero; motor + cm sin as rompe as; un mod sin motor rompe al revés).

## Veredicto global
`mod-only` (declaración) + dependencia externa de activación (coordinación multi-repo). No hay artefacto core-worthy que requiera escribir código de core: el motor ya existe.

## Nota de reajuste (si el core se implementa, Camino B)
SE ELIMINA. El override componible del core reemplaza el bloqueo defensivo del MCP; la declaración `governedObjects` deja de hacer falta y en su lugar iría la migración de cm a interceptores (CM-CORE).

## Mecánica de publicación (sync)
La declaración es config de `ai/`; el gate de completitud corre en el sync/CI. Sin siembra de objetos.
