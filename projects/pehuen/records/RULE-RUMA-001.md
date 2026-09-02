---
id: RULE-RUMA-001
project: pehuen
type: rule
module: rumas
level: must
tags:
  - legacy-paridad
  - migration
  - schema
  - inmutabilidad
---

# `Ruma.numero` no se actualiza después de crear

## What

El campo `Ruma.numero` se asigna en la creación y nunca puede modificarse vía PATCH. Si el body de un PATCH incluye `numero`, el campo debe ignorarse (o rechazarse con 400). El número de ruma es inmutable post-creación.

## Why

El número de ruma es la referencia operacional que aparece en documentos físicos, reportes impresos y guías asociadas. Cambiar el número después de crear la ruma desincronizaría todos los registros que la referencian. La inmutabilidad garantiza la trazabilidad.

## Where

- **Files**: `server/api/rumas/[id].patch.ts`
- **Endpoints**: `PATCH /api/rumas/:id`
- **Layers**: backend (handler: eliminar `numero` del body antes de persistir, o usar schema Zod `readonly`)

## When

En todo PATCH de ruma.

## Verification

- Test: crear ruma con `numero: 100`, PATCH con `{ numero: 200 }` → ruma sigue con `numero: 100`.
- `grep -n "numero" server/api/rumas/\[id\].patch.ts` → debe existir lógica que excluye `numero` del update.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: comportamiento legacy inferido del modelo de datos — `Ruma.numero` es identificador operativo (verificar en `pehuen-server/src/controllers/ruma.controller.ts` si hay exclusión explícita de `numero` en update).
- **Related**: RULE-RUMA-002
