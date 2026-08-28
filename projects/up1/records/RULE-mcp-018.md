---
id: RULE-mcp-018
project: up1
type: rule
module: mcp
tags:
  - mcp
  - requirement
  - tree
  - cascade
  - reuse
---

# La lógica de árbol/cascade se porta pura y dependency-injected desde el mod, no se reimplementa ad-hoc

## What

La lógica de árbol de requisitos (vías OR/AND, cascade de borrado de grupos vacíos, validación de pisos numéricos) SHOULD portarse como funciones puras e inyectables (`requirement-tree-ops.ts`), reusando la paridad ya validada en el mod (Elric), en vez de reimplementarse ad-hoc dentro de la tool.

## Why

`requirement-tree-ops.ts` expone `buildParentedTree`, `findViaContainer`, `computeDeleteCascade`, `validateNumericFloors` como funciones puras consumidas por `cd_manage_requirement` (`requirement-write.ts`). Esto preserva la paridad con la UI del mod y permite rollback parcial seguro si falla el create de un leaf tras crear grupos de vía (borra solo grupos huérfanos nuevos).

## Where

- `src/mods/curriculum-design/requirement-tree-ops.ts` (líneas 28, 50, 142, 176)
- `src/mods/curriculum-design/requirement-write.ts` (import línea 27, consumo)

## When

Al implementar lógica de árbol/cascade nueva sobre objetos jerárquicos del MCP; antes de escribir una versión propia, verificar si `requirement-tree-ops.ts` (u otro módulo puro equivalente) ya la resuelve.
