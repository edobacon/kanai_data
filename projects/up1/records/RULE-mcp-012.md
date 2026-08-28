---
id: RULE-mcp-012
project: up1
type: rule
module: up1-mcp
tags:
  - mcp
  - contract
  - write
  - preview-commit
  - confirmation
---

# Toda tool de escritura usa preview→commit: sin `confirm:true` devuelve un preview sin mutar

## What

Las tools de escritura del MCP operan en dos pasos: sin `confirm:true` devuelven un **preview** (lo que se va a crear/editar, con los valores resueltos) sin mutar nada; recién con `confirm:true` ejecutan la mutación. El preview es además el **punto de desambiguación** de la resolución semántica (muestra candidatos cuando un input es ambiguo).

## Why

Evita cambios accidentales (patrón Yupi §34) y da al usuario/LLM la oportunidad de verificar lo resuelto antes de escribir. Es portable multi-LLM (no depende del UI de aprobación de un host específico).

## Where

- **Files**: tools de escritura del MCP (`cd_*`, `eng_*`, `view_*` de mutación).
- **Layers**: backend del MCP.

## When

Al implementar cualquier tool que cree/edite/borre/versione/transicione un objeto.

## Verification

- Llamar una tool de escritura sin `confirm:true` no muta (devuelve preview).
- El preview muestra los valores resueltos (FK/enum) y candidatos ante ambigüedad.

## Source

- **Discovered in**: TICKET-080; origen plan MCP §6.1, §15 obs #3, S23.
- **Evidence**: patrón preview→commit confirmado en las tools de escritura (S5/S6/S16); desambiguación de resolución en el preview (S28/S29).
- **Related**: [[RULE-mcp-010]] (resolución semántica).
