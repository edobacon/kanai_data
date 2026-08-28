---
id: RULE-mcp-015
project: up1
type: rule
module: up1-mcp
tags:
  - mcp
  - coupling
  - propagation
  - backlog
  - det-16
  - det-17
  - surface
---

# Toda capability de mod nueva expuesta a usuario final se refleja en up1-mcp (backlog must que bloquea el cierre)

## What

Cuando un ticket agrega o cambia una **capability de un mod** (curriculum-design, uengagement, layouts, u otro mod expuesto por el MCP) que es **observable por el usuario final** —un objeto nuevo, un campo nuevo en un objeto ya expuesto, una mutación/flujo nuevo, un enum/FK nuevo, un cambio de modelo que altere lectura/escritura—, el ticket DEBE evaluar su reflejo en `up1-mcp`. Si el reflejo aplica, el ticket lleva un **backlog item `must`** con el formato:

> `mcp: <exponer|ajustar> <tool|contrato|resolución|doc> para <capability>` — que **bloquea el cierre** del ticket (DET-17) hasta que el surface del MCP esté actualizado y con smoke (no-auth como mínimo).

El reflejo concreto puede ser: una tool de dominio nueva (`cd_*`/`eng_*`/`view_*`), una entrada/cambio de contrato (`ObjectContract`: requiredOnCreate, validations, enums, FK, validatedMutations), resolución semántica (`enumLabels`/lookup), y la doc de dominio (`get_documentation`, CAPABILITIES). Esta regla es **scope global**: se auto-carga en tickets de cualquier módulo.

## Why

`up1-mcp` es **downstream** del mod (DET-16 propagación): expone sus capabilities a los LLMs. Sin un gate, el surface del MCP **deriva** silenciosamente — un programa gana un campo nuevo en el mod y el MCP sigue sin exponerlo, o peor, un cambio de modelo (model-v2, §12.F) rompe tools sin que nadie lo note hasta producción. El backlog must (DET-17) convierte "actualizar el MCP" de un acto voluntario y olvidable en una condición de cierre del mismo ticket que tocó el mod — el "update orgánico" pedido en TICKET-080.

## Where

- **Files**: `## Backlog` del ticket que toca el mod (item `must` `mcp: ...`); el reflejo se implementa en el repo `up1-mcp` (`/Users/edobacon/Workspace/uplanner/mcp`: tools de dominio, `contracts/`, `core/resolve.ts`, `docs/`).
- **Modules**: curriculum-design, uengagement (mod), layout/layouts, y cualquier mod futuro expuesto por el MCP.
- **Layers**: la capability vive en el mod (backend up1); el reflejo vive en el MCP (P3 — no se mezclan).

## When

En el design de cualquier ticket de un mod expuesto por el MCP: preguntar "¿esto cambia algo que el MCP expone o debería exponer al usuario?". Si sí → backlog must. **No aplica** a cambios internos del mod sin efecto observable en el surface del MCP (refactors internos, fixes que no cambian forma de dato/capability).

## Verification

- Un ticket de mod con capability user-facing nueva tiene un item `must` `mcp: ...` en `## Backlog` (o una nota explícita de "no aplica reflejo" con razón).
- El cierre del ticket no procede con ese `must` sin resolver (DET-17).
- Tras resolverlo: la tool/contrato/doc del MCP existe y tiene smoke; la doc de dominio (`get_documentation`) refleja la capability.

## Source

- **Discovered in**: TICKET-080 (formaliza el acoplamiento mod→MCP, decisión D-B).
- **Evidence**: el MCP siguió al mod reactivamente y con drift (S12 executionUnitId; §12.F model-v2 rompió tools eng_*; S34 reflejó UPONE-1270 tarde). Esta regla hace el reflejo proactivo y bloqueante.
- **Related**: DET-16 (propagación), DET-17 (backlog lifecycle), [[RULE-mcp-003]] (no modificar up1 — el reflejo va en el MCP, no en el mod), [[SPEC-mcp-surface-and-contracts]].
