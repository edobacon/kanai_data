---
id: RULE-mcp-005
project: up1
type: rule
module: up1-mcp
tags:
  - mcp
  - principle
  - p5
  - extensibility
  - modpack
---

# P5 — Arquitectura genérica + contract-aware: nuevos objetos/mods se agregan sin reescribir el núcleo

## What

El núcleo genérico del MCP (cliente GraphQL) opera CUALQUIER objeto. Agregar capacidad NO requiere tocar el núcleo: (a) **nuevo objeto** = una entrada de contrato (`{ objectType, requiredOnCreate, autoAssign, validations, validatedMutations, uniqueFields, fieldDocs[].fk }`) + opcionalmente tools de dominio; (b) **nuevo mod** = una carpeta autocontenida `src/mods/<mod>/` (manifest + tools + contracts + domainDoc) auto-registrada vía `ModPack` + 1 línea en el manifiesto append-only `src/mods/index.ts`.

## Why

Escalabilidad y trabajo en paralelo de equipos: cada mod es dueño de su carpeta; el único punto compartido es el manifiesto (1 línea por mod). Esto eliminó la superficie de colisión (6 archivos compartidos pre-refactor S13) y permite sumar mods (engagement, layouts) sin reescritura.

## Where

- **Files**: `src/mods/<mod>/` (pack), `contracts/registry.ts` (con guard de unicidad, S33), `src/mods/index.ts` (manifiesto).
- **Layers**: backend del MCP. Guía completa en `EXTENDING.md` del repo.

## When

Al agregar un objeto o un mod nuevo al surface del MCP. El núcleo (`core/instances.ts`) permanece agnóstico.

## Verification

- Agregar un objeto toca solo `registry.ts` (1 ObjectContract) — núcleo sin cambios (validado S7).
- `registerContract` rechaza colisión de objectType entre packs (guard de unicidad, S33).
- Los FK lookups se derivan solos de `fieldDocs[].fk` (S11).

## Source

- **Discovered in**: TICKET-080; origen plan MCP P5, §7, §12.E, S7/S13/S33.
- **Evidence**: S13 — ModPack elimina colisiones; S7 — agregar objeto toca solo el registry.
- **Related**: [[RULE-mcp-006]], [[SPEC-mcp-surface-and-contracts]].
