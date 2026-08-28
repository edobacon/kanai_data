---
id: BUG-curriculum-design-011
project: up1
type: bug
module: curriculum-design
tags:
  - updateinstance
  - mcp
  - graphqlshape
  - basevsrt
  - mockgap
---

# `updateInstance` de objeto base devuelve `data: null` (vs `rt__` devuelve `data: {...}`) — MCP tools rompen armado de respuesta

## Symptom

Las tools MCP `cd_transition_program`/`cd_update_program` explotaban con `TypeError: Cannot read properties of null` al armar `result.data.<campo>` aunque la transicion YA persistia en DB.

## Expected behavior

El shape GraphQL de `updateInstance` para objeto base retorna `data: { ...campo }` consistente (o se documenta explicitamente como `data: null` para base).

## Root cause

`updateInstance` de un objeto BASE (Activity) devuelve `data: null` (record NO viene anidado bajo `data`, a diferencia de los `rt__` que si exponen `data: {...}`). El smoke de S5 no lo detecto porque re-consultaba la DB en vez de confiar en el retorno real de la mutation.

## Impact

S5.T1 tools MCP (despues commit `8dc1261`) inutilizables sin el blindaje. Tests que re-consultan DB para verificar dan falsa sensacion de que el shape es OK (no confian en el retorno real).

## Reproduction

Mutation `updateInstance` sobre un Activity base via MCP -> `result.data === null` -> `result.data.name` -> TypeError. Mismo path con `rt__Syllabus__activity` -> `result.data.name` OK.

## Workaround

Blindar armado de respuesta en tools MCP (optional chaining + fallback `toStatus`/patch) — fix aplicado en commit `8dc1261`.

## Solution

Pendiente.

## Related

- **Specs**: —
- **Tickets**: TICKET-103
