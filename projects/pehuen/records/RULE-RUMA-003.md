---
id: RULE-RUMA-003
project: pehuen
type: rule
module: rumas
level: must
tags:
  - legacy-paridad
  - migration
  - schema
  - geo
---

# Modelo almacena `geo.lon`; conversión a `lng` solo en endpoint `/rumas-map`

## What

El schema de `Ruma` almacena las coordenadas geográficas con el campo `geo.lon` (longitud). El campo `lng` (abreviatura alternativa) NO existe en la base de datos. La conversión de `lon` a `lng` se realiza únicamente en la respuesta del endpoint `/api/rumas-map` para compatibilidad con la API de Google Maps (que espera `lng`).

## Why

El modelo de datos usa `lon` como convención. Google Maps API espera `lng`. Si se almacenara como `lng` en la BD, cualquier query que use `geo.lon` fallaría. La transformación en el endpoint de mapa mantiene el modelo limpio y la compatibilidad con Google Maps.

## Where

- **Files**: `server/models/ruma.model.ts` (campo `geo.lon`), `server/api/rumas/map.get.ts` o equivalente (conversión `lon → lng` en respuesta)
- **Endpoints**: `GET /api/rumas-map`
- **Layers**: database (almacena `lon`), backend (transforma a `lng` en respuesta de mapa)

## When

Al responder el endpoint `/rumas-map`. En todos los demás contextos, el campo se usa como `geo.lon`.

## Verification

- Test: crear ruma con coordenadas → `db.rumas.findOne()` tiene `geo.lon`, no `geo.lng`.
- Test: `GET /api/rumas-map` → cada ruma en respuesta tiene `lng` (no `lon`).
- `grep -n "geo\.lon\|geo\.lng" server/models/ruma.model.ts` → solo `lon`.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: comportamiento legacy inferido de la distinción documentada entre el campo del modelo y el formato del endpoint de mapa (verificar en `pehuen-server/src/controllers/ruma.controller.ts` la transformación para Google Maps).
- **Related**: RULE-RUMA-005
