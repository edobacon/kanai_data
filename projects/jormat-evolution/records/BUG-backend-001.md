---
id: BUG-backend-001
project: jormat-evolution
type: bug
module: backend
status: detected
severity: low
tags:
  - items
  - schema
  - legacy
  - assumption
---

# Nombre de columna `bloqueo_descuento` es un supuesto, no confirmado contra el legacy

## Symptom

La columna que respalda `bloqueoDescuento` en `items` se llamo `bloqueo_descuento` (snake_case derivado del nombre del DTO), pero ese nombre nunca se confirmo contra el sistema legacy MariaDB — fuente original del dato — porque no es accesible desde este workspace.

## Expected behavior

El nombre de columna deberia coincidir con (o mapear explicitamente desde) el campo real del legacy, para que una futura sincronizacion de datos legacy -> nuevo no choque con un nombre inventado.

## Root cause

DET-1 (certeza) no se pudo satisfacer en la capa de datos legacy: el MariaDB original no esta disponible en este workspace. Se opto por asumir el nombre en snake_case del DTO y marcarlo explicitamente `assumed` en codigo y documentacion (JOR-157 decisions_log, step `dt18-column-name`).

- **File**: `backend/jormat-api/migrations/` (migracion de JOR-157 S1.T1, columna `bloqueo_descuento`); `docs/deuda-tecnica.md` (DT-18)
- **Cause**: ausencia de acceso al legacy para verificar el nombre real de la columna equivalente

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | ninguno hoy (columna nueva, sin dato legado aun) |
| Data affected | `items.bloqueo_descuento` |
| Modules affected | items (backend); futura sincronizacion de datos legacy si se planifica |
| Frequency | latente — se activa si/cuando se importe data legacy real |

## Reproduction

No es un fallo en runtime; es una discrepancia potencial de nombre a futuro.

### Environment
| Campo | Valor |
|-------|-------|
| Environment | n/a (supuesto de schema, no un fallo ejecutable) |
| Browser/Client | n/a |
| Data conditions | se activa cuando aparezca el nombre real de la columna equivalente en el legacy |

### Steps
1. Se agrega la columna `bloqueo_descuento` sin poder confirmar el nombre legacy (JOR-157 S1.T1).
2. Si en el futuro se importa data legacy real y el nombre real difiere, el import fallaria o mapearia al campo incorrecto.
3. Resultado observado: hoy el campo funciona correctamente end-to-end con el nombre asumido; el riesgo es latente.

## Workaround

Ninguno necesario mientras no haya import de datos legacy — el campo funciona correctamente con el nombre asumido.

## Solution

Pendiente: si aparece el nombre real de la columna equivalente en el legacy, renombrar via migracion correctiva antes de cualquier sincronizacion de datos legacy -> nuevo.

## Related

- **Rules**: —
- **Decisions**: —
- **Specs**: SPEC-JOR-157-items-cluster
