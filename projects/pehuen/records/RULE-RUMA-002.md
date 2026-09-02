---
id: RULE-RUMA-002
project: pehuen
type: rule
module: rumas
level: must
tags:
  - legacy-paridad
  - migration
  - unicidad
---

# Unicidad activa de ruma: `(numero, cancha, estadoRuma.codigo === 0)`

## What

No pueden existir dos rumas activas (con `estadoRuma` de código `0`, que representa el estado activo) con el mismo `numero` en la misma `cancha`. La restricción aplica solo a rumas activas; rumas cerradas/inactivas no participan en la unicidad.

## Why

El número de ruma identifica físicamente una pila de madera en una cancha. Tener dos rumas activas con el mismo número en la misma cancha crearía ambigüedad operativa en conteos y reportes de stock.

## Where

- **Files**: `server/api/rumas/index.post.ts`, `server/models/ruma.model.ts`
- **Endpoints**: `POST /api/rumas`
- **Layers**: backend (query de existencia) y database (índice parcial opcional)

## When

Al crear una nueva ruma.

## Verification

- Test: crear ruma `{ numero: 5, cancha: 'abc', estadoRuma: <id-activo> }`, crear segunda igual → 400.
- Test: crear ruma, cerrarla, crear otra con mismo `numero` y `cancha` → OK (primera inactiva).
- Índice sugerido: `{ numero: 1, cancha: 1 }` con `partialFilterExpression: { 'estadoRuma.codigo': 0 }` (verificar si código de estado activo es 0).

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: comportamiento legacy — unicidad de rumas activas por número y cancha (verificar en `pehuen-server/src/controllers/ruma.controller.ts` la validación de existencia). Config `config.yaml` key_concepts: ID `60dfe7c9ba0ccfd21a8e04f3` aparece en EstadoRuma activa.
- **Related**: RULE-RUMA-001, RULE-RUMA-004
