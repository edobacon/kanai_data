---
id: RULE-GUIA-003
project: pehuen
type: rule
module: guias
level: must
tags:
  - legacy-paridad
  - migration
  - validacion
  - movimiento
---

# `comuna` se elimina del body si `movimiento !== 1`

## What

En `POST /api/guias` y `PATCH /api/guias/:id`, si el campo `movimiento` tiene valor distinto de `1`, el campo `comuna` debe eliminarse del body procesado antes de persistir. No se almacena, no se valida, no se retorna. Si el cliente lo envía, se ignora silenciosamente.

## Why

`comuna` solo tiene sentido semántico en el movimiento 1 (Compra), que representa el origen geográfico del proveedor. En movimientos 2-5 no hay proveedor ni origen de compra, por lo que almacenar `comuna` generaría datos basura. El legacy lo implementa a nivel de controller, no de DTO.

## Where

- **Files**: `server/api/guias/index.post.ts`, `server/api/guias/[id].patch.ts`
- **Endpoints**: `POST /api/guias`, `PATCH /api/guias/:id`
- **Layers**: backend (handler, antes de persistir)

## When

En cada POST/PATCH de guía. El delete del campo ocurre en el handler, no en el schema Zod (el schema puede ignorarlo o marcarlo como opcional).

## Verification

- Test: `POST /api/guias` con `movimiento: 2` y `comuna: <objectId>` → guía creada, `guia.comuna` es `undefined`/ausente.
- Test: `POST /api/guias` con `movimiento: 1` y `comuna: <objectId>` → guía creada, `guia.comuna` tiene el ObjectId.
- `grep -n "delete.*comuna\|body.comuna" server/api/guias/` → debe existir el delete condicional.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/guia.md` campo `comuna`: "Si `movimiento !== 1` el controller hace `delete body.comuna` antes de save." Contrato migración punto 4.
- **Related**: RULE-GUIA-001, RULE-GUIA-009
