---
id: RULE-GUIA-004
project: pehuen
type: rule
module: guias
level: must
tags:
  - legacy-paridad
  - migration
  - validacion
  - cancha
  - magic-id
---

# Si `origen` o `destino` es OTRA CANCHA, se exige `origenCustom` o `destinoCustom`

## What

El id de Cancha `60e90cf10351b55538c40e46` representa "OTRA CANCHA" (una cancha externa no registrada en el sistema). Cuando `origen` tiene ese id, el campo `origenCustom` (string) es obligatorio. Cuando `destino` tiene ese id, `destinoCustom` es obligatorio. Si la validación falla → 400.

## Why

Las guías pueden involucrar canchas externas al sistema (proveedores, plantas externas). En lugar de crear una Cancha real, se usa el ID sentinel y se requiere el nombre textual en el campo custom. Sin esta validación, la guía quedará con `origenCustom` vacío y el cliente no sabrá qué cancha es.

## Where

- **Files**: `shared/schemas/guia.schema.ts` (validación Zod con `.refine()`), `server/api/guias/index.post.ts`, `shared/constants/mongodb-ids.ts` (id `OTRA_CANCHA`)
- **Endpoints**: `POST /api/guias`, `PATCH /api/guias/:id`
- **Layers**: shared schema, backend

## When

En cada POST y PATCH de guía que incluya `origen` o `destino`.

## Verification

- Test: `origen: '60e90cf10351b55538c40e46'` sin `origenCustom` → 400.
- Test: `destino: '60e90cf10351b55538c40e46'` sin `destinoCustom` → 400.
- Test: `origen: '60e90cf10351b55538c40e46'` con `origenCustom: 'Planta X'` → OK.
- `grep -n "60e90cf1\|OTRA_CANCHA" shared/constants/mongodb-ids.ts` → debe existir constante.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/guia.md` campo `origen`: "Si vale `'60e90cf10351b55538c40e46'` (OTRA CANCHA), requiere `origenCustom`." DTO sección: `origen === '60e90cf10351b55538c40e46' → requiere origenCustom`. Contrato migración punto 5.
- **Related**: RULE-GEN-005, RULE-GUIA-005
