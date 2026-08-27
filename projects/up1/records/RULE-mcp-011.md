---
id: RULE-mcp-011
project: up1
type: rule
module: up1-mcp
status: archived
tags:
  - mcp
  - contract
  - validated-mutations
  - integrity
---

# El CRUD genérico rehúsa objetos con `validatedMutations`/`blockGenericMutation` y fuerza la tool de dominio

> **SUPERSEDED (2026-08-27)** — **No implementado en el MCP nuevo**: el CRUD generico de escritura esta abierto (frontera real = RBAC), no rehusa por validatedMutations/blocked (verificado en src/; src/index.js:42 lo documenta como "abierto"). Afecta REQ-05 de 1530. Ver DEC-058 y los learns de TICKET-137 (desfase MCP viejo/nuevo).

## What

Los objetos cuyo contrato declara `validatedMutations` o `blockGenericMutation: true` NO pueden mutarse por las tools CRUD genéricas (`create_object`/`update_object`/`delete_object`). El CRUD genérico las rehúsa con un hint a la tool de dominio correspondiente (ej. Activity → `cd_create_program`; OfferingEnrollment/Attendance → tools `eng_*` de flujo).

## Why

Las tools de dominio aplican validaciones (V1–V9) y gates de flujo (capabilities semánticas) que el CRUD genérico saltaría. Sin este blindaje, el LLM podría crear un Activity sin V2 (workflow default) o inscribir sin el gate `mod/uengagement:*`. Hueco latente detectado en S17 (Activity create + OfferingEnrollment/Attendance eran bypasseables).

## Where

- **Files**: campo `blockGenericMutation` en `ObjectContract`; guard en el CRUD genérico (`tools/objects.ts`).
- **Layers**: backend del MCP.

## When

Al declarar el contrato de cualquier objeto con validaciones de negocio o flujo. Default conservador: si un objeto tiene tool de dominio con validaciones, bloquear el CRUD genérico.

## Verification

- `create_object`/`update_object`/`delete_object` sobre Activity / OfferingEnrollment / Attendance → bloqueados con hint (validado S17).
- Catálogos sin validaciones siguen operables por el CRUD genérico.

## Source

- **Discovered in**: TICKET-080; origen plan MCP S7/S17.
- **Evidence**: S17 — los 3 verbos sobre objetos de flujo bloqueados; Activity create también.
- **Related**: [[RULE-mcp-005]] (extensibilidad), [[SPEC-mcp-surface-and-contracts]] (V9).
