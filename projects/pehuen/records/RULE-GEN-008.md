---
id: RULE-GEN-008
project: pehuen
type: rule
module: general
level: must
tags:
  - migration
  - timezone
  - fecha
---

# Timezone fijo `America/Santiago` en `moment-timezone`

## What

Toda operación de fecha/hora en el servidor debe usar `moment-timezone` con el timezone `'America/Santiago'` (no UTC, no `moment()` sin timezone). El parsing de strings de fecha, la generación de `guideDateOnMs` y cualquier cálculo temporal usa este timezone.

## Why

El sistema opera en Chile. Las guías forestales tienen fechas legales chilenas. Si los timestamps se generaran en UTC, una guía creada el 2026-04-15 a las 22:00 UTC equivaldría al 2026-04-15 o 2026-04-16 según la hora chilena, generando inconsistencias en reportes de corte diario. `America/Santiago` incluye el manejo de cambio de hora (DST chileno).

## Where

- **Files**: `server/utils/dateToTimestamp.ts` o equivalente, `server/api/guias/index.post.ts` (conversión `fechaGuia → guideDateOnMs`), cualquier lugar que use `moment()` o `new Date()`
- **Layers**: backend

## When

En toda operación que convierta strings de fecha a epoch o vice versa. En reportes con filtros por rango de fecha.

## Verification

- `grep -rn "moment()\|new Date()\|Date.now()" server/` → verificar que no haya `moment()` sin timezone (excepto para epoch ms puro con `+moment().format('x')` que es UTC-agnostic).
- `grep -rn "America/Santiago\|moment-timezone" server/` → debe aparecer en utilidades de fecha.
- Test DST: fecha durante el cambio de hora chileno → epoch correcto.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `config.yaml` conventions: `timezone: America/Santiago`. `pehuen-server/src/models/user.model.ts`: `+moment().format('x')` para epoch ms. El legacy usa `moment-timezone` para parsear `fechaGuia`.
- **Related**: RULE-GEN-009, RULE-GEN-010
