---
id: RULE-GUIA-008
project: pehuen
type: rule
module: guias
level: must
tags:
  - legacy-paridad
  - migration
  - normalización
  - rut
---

# `rutProveedor` y `rutConductor` se limpian (sin guion, sin puntos) antes de persistir

## What

Los campos `rutProveedor` y `rutConductor` deben almacenarse en formato limpio: sin puntos separadores de miles y sin guion. Ejemplo: `'12.345.678-9'` → `'123456789'`. La limpieza ocurre antes de persistir, no en el cliente.

## Why

El legacy almacena RUTs en formato limpio para normalización de búsquedas y comparaciones. Si se almacenaran con formato visual, dos RUTs iguales con diferente formato no matchearían en queries de búsqueda.

## Where

- **Files**: `shared/schemas/guia.schema.ts` (Zod `.transform()` o `.preprocess()`), `server/api/guias/index.post.ts`
- **Endpoints**: `POST /api/guias`
- **Layers**: shared schema o backend handler

## When

En POST de guías cuando se envían `rutProveedor` o `rutConductor`. En PATCH si se actualiza alguno de estos campos.

## Verification

- Test: `POST /api/guias` con `rutProveedor: '12.345.678-9'` → persiste como `'123456789'`.
- Test: `rutConductor: '1.234.567-8'` → persiste como `'12345678'`.
- `grep -n "replace.*\\.\\|replace.*-\|cleanRut\|rutCleaner" server/api/guias/\|shared/schemas/guia` → debe existir limpieza.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/guia.md` campo `rutProveedor`: "RUT limpio (sin guion)". Campo `rutConductor`: "RUT limpio." Patrón consistente con `User.rut` que también se almacena limpio.
- **Related**: RULE-GUIA-009
