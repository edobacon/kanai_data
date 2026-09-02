---
id: RULE-RUMA-005
project: pehuen
type: rule
module: rumas
level: must
tags:
  - legacy-paridad
  - migration
  - calculo
  - volumen
---

# `volCalculado`, `volMR` y `volM3` se calculan al vuelo en `fillRumaData` — no se persisten

## What

Los campos de volumen calculado de una ruma (`volCalculado`, `volMR`, `volM3`) NO se almacenan en la colección `rumas`. Se calculan dinámicamente en la función `fillRumaData` a partir de las guías VIGENTE asociadas y los ajustes aplicados. Cada respuesta de GET de ruma incluye estos valores calculados en el momento de la consulta.

## Why

Los volúmenes dependen de guías que pueden cambiar de estado (VIGENTE → NULA) o de ajustes que se agregan posteriormente. Si se persistieran, quedarían desactualizados cada vez que cambia una guía o se agrega un ajuste. El cálculo al vuelo garantiza consistencia.

## Where

- **Files**: `server/services/ruma.service.ts` o `server/helpers/fillRumaData.ts`, `server/api/rumas/index.get.ts`, `server/api/rumas/[id].get.ts`
- **Layers**: backend (service/helper layer, no database)

## When

En cada respuesta de GET de rumas. No en POST/PATCH.

## Verification

- `grep -n "volCalculado\|volMR\|volM3" server/models/ruma.model.ts` → debe ser 0 matches (no persisten).
- `grep -n "fillRumaData\|volCalculado" server/services/ruma.service.ts` → debe aparecer el cálculo.
- Test: crear ruma, agregar guía VIGENTE → GET ruma retorna `volMR` calculado correctamente. Anular guía → GET ruma retorna `volMR` actualizado.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen_nuxt/config.yaml` key_concepts: "Volúmenes en M3 y MR — calculados al vuelo en fillRumaData a partir de guías VIGENTE + ajustes". Legacy: función `fillRumaData` en `pehuen-server` con la misma semántica.
- **Related**: RULE-RUMA-004
