---
id: BUG-object-manager-003
project: up1
type: bug
module: object-manager
tags:
  - search
  - ilike
  - accents
  - mcp-limitation
---

# El ILIKE de up1 no pliega tildes: buscar "Ecuación" devuelve 0, "Ecuacion" devuelve 1

## Symptom

Las búsquedas por nombre (CONTAINS / ILIKE) sobre `listInstances` no son insensibles a acentos. Buscar `"Ecuación"` (con tilde) devuelve 0 resultados; `"Ecuacion"` (sin tilde) devuelve 1. Igual para cualquier término acentuado.

## Expected behavior

La búsqueda por nombre debería ser insensible a acentos (fold de tildes), como espera un usuario que escribe "estadística" o "estadistica" indistintamente.

## Root cause

- **File**: object-manager — resolver de `listInstances` con filtro CONTAINS (ILIKE de Postgres sin `unaccent`/`translate`).
- **Cause**: el ILIKE compara byte a byte; no hay `pg_trgm`/full-text ni `translate()` para plegar acentos.

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | cualquiera que busque términos acentuados |
| Data affected | búsquedas sobre cualquier objeto con nombres acentuados |
| Modules affected | object-manager (search), consumidores (suite, up1-mcp) |
| Frequency | siempre que el término tenga tildes |

## Reproduction

### Steps
1. `listInstances(Activity, filters:[{name CONTAINS "Ecuación"}])` → 0.
2. `listInstances(Activity, filters:[{name CONTAINS "Ecuacion"}])` → 1.

## Workaround

`up1-mcp` genera variantes sin acento del query antes de llamar a la API (`cd_search_programs`, R5/S2). Workaround del cliente; no corrige la API.

## Solution

Propuesta: `pg_trgm`/full-text en Postgres, o `translate()`/`unaccent` en el filtro ILIKE del resolver (patrón Yupi §34). Decisión de up1 (no del MCP, P3).

## Related

- **Rules**: —
- **Decisions**: —
- **Specs**: SPEC-mcp-surface-and-contracts (§5 search), SPEC-mcp-architecture (§11 limitaciones).
- **Origen**: descubierto en la build del MCP (S2, 2026-06-06); registrado en DKC vía TICKET-080.
