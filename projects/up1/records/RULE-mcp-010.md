---
id: RULE-mcp-010
project: up1
type: rule
module: up1-mcp
tags:
  - mcp
  - contract
  - resolution
  - enums
  - fk
---

# Resolución semántica de inputs no-escalares: config-driven, con sinónimos en el contrato y desambiguación en el preview

## What

Las tools de escritura aceptan **lenguaje de negocio** para inputs no-escalares (FK y enum/select) y los resuelven internamente al valor canónico (id de FK o token enum), vía la capa compartida `core/resolve.ts`. Los enums declaran **sinónimos en el contrato** (`enumLabels`: etiquetas es/en + sinónimos; determinista y auditable). Ante ambigüedad, la tool devuelve **candidatos** y el preview→commit es el punto de desambiguación. `resolveEnum` es agnóstico de contrato (recibe values+labels planos — `core/` no depende de `contracts/`).

## Why

El usuario nunca tiene el id de FK ni el token enum en inglés que la API exige. Sin esta capa, el LLM orquesta una cadena frágil (`get_field_options` sin búsqueda por nombre, sin fold de acentos, match exacto de enum). Config-driven + sinónimos = comportamiento predecible y auditable, en vez de dejar el mapeo al criterio del LLM.

## Where

- **Files**: `core/resolve.ts` (núcleo), `enumLabels` en los contratos por objeto, `get_field_options(query)`.
- **Layers**: backend del MCP.

## When

Al diseñar una tool de escritura con inputs FK/enum, o al declarar el contrato de un objeto con campos select.

## Verification

- Un input en lenguaje de negocio ('pregrado', 'centro de apoyo X') resuelve al valor canónico o devuelve candidatos en el preview.
- `core/resolve.ts` no importa `contracts/` (layering).

## Source

- **Discovered in**: TICKET-080; origen plan MCP §12.R, S27/S28/S29.
- **Evidence**: S28 — `resolveEnum` agnóstico; S29 — cableado bifurcado CRUD genérico vs tools de dominio.
- **Related**: [[RULE-mcp-012]] (preview→commit), [[SPEC-mcp-surface-and-contracts]] §12.R.
