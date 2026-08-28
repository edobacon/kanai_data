---
id: RULE-mcp-003
project: up1
type: rule
module: up1-mcp
tags:
  - mcp
  - principle
  - p3
  - contracts
---

# P3 — El MCP no modifica up1; las reglas frontend-only se replican en la capa de contratos

## What

`up1-mcp` no introduce cambios en el código de up1 (mods ni core). Las reglas de negocio que up1 hoy aplica solo en el frontend (suma de pesos, autoAssign de workflow, status readonly, uniqueFields, enums) y que la API GraphQL NO enforza server-side, se **replican en la capa de contratos del MCP** (Capa 2) y se aplican antes de mutar.

## Why

El MVP del MCP no debe acoplarse a una rama de up1 ni bloquear su roadmap. Si una validación frontend-only no se replica, el MCP puede escribir datos inconsistentes (ej. la API acepta suma de pesos >100). La fix definitiva de esas validaciones (moverlas al resolver) es trabajo de up1, no del MCP — se registra como límite/bug.

## Where

- **Files**: capa de contratos del MCP (`contracts/registry.ts`, contratos por objeto). Ver [[SPEC-mcp-surface-and-contracts]] (V1–V9).
- **Layers**: backend del MCP (no toca up1).

## When

Al diseñar cualquier tool de escritura: si up1 no enforza una regla server-side, replicarla en el contrato del objeto. Si una tarea pareciera requerir tocar up1, detenerse y registrarlo como límite (no implementarlo).

## Verification

- El repo de up1 no recibe commits desde el trabajo del MCP.
- Cada validación frontend-only relevante tiene su entrada de contrato (V1–V9).
- Bugs de up1 que requieren fix server-side registrados en `bugs/{módulo}/`.

## Source

- **Discovered in**: TICKET-080; origen plan MCP P3, §25, S4.
- **Evidence**: S6 — la API acepta suma de pesos inválida; S5 — `updateActivityValidated` sin `withEventPublish`.
- **Related**: [[RULE-mcp-surface-reflects-mod-capability]], bugs de curriculum-design/object-manager.
