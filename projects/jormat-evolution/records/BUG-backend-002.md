---
id: BUG-backend-002
project: jormat-evolution
type: bug
module: backend
status: fixed
severity: medium
tags:
  - migraciones
  - det-36
  - e2e
  - dev-stack
  - catalogos-repuestos
---

# Migracion verde en e2e (DB efimera) pero nunca aplicada a la DB dev en ejecucion

## Symptom

JOR-110 (`creates_data: true`) se cerro con evidencia solo del e2e (`catalogos-repuestos.e2e-spec.ts`), que corre sus propias migraciones desde cero en cada run y por eso paso verde. La migracion `20260726000000_catalogos_repuestos.ts` nunca se aplico a la **DB dev en ejecucion**. Resultado runtime: la tabla `catalogos_repuestos` no existia; `GET /api/inventario/catalogos` devolvia 500 (`relation does not exist`); el front mostraba "Error al cargar los datos" en `/inventario/catalogos`.

## Expected behavior

Un ticket que crea una migracion de datos debe dejar la DB dev real migrada antes de cerrarse; el endpoint vivo debe responder 200 contra el entorno real, no solo contra la DB efimera del e2e.

## Root cause

El codigo y la migracion eran correctos. El e2e usa una DB efimera que corre las migraciones desde cero en cada ejecucion, dando una senal verde que **no implica** que el entorno dev de verdad quedo migrado. El gate DET-36 (verificacion runtime/UI, `creates_data: true`) no incluyo un smoke del endpoint vivo contra la DB dev real, solo la evidencia del e2e.

- **File**: `backend/jormat-api/migrations/20260726000000_catalogos_repuestos.ts`
- **Cause**: falta de paso de aplicar la migracion al entorno dev en ejecucion + falta de smoke real del endpoint vivo, antes de dar por cerrado un ticket `creates_data`.

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | cualquiera que navegara a `/inventario/catalogos` en dev mientras la tabla no existia |
| Data affected | ninguna (tabla vacia, sin perdida de datos) |
| Modules affected | inventario/catalogos (backend + front) |
| Frequency | se repite cada vez que un ticket `creates_data` se cierra solo con evidencia de e2e contra DB efimera |

## Fix

`npm run migrate` corrido en el contenedor de la api (migracion aditiva/reversible). Verificado end-to-end: `GET /api/inventario/catalogos` devuelve `200 []`.

## Prevention

Para tickets `creates_data: true`, la verificacion runtime (DET-36) debe incluir: (1) correr la migracion en el entorno dev real (no solo la DB efimera del e2e), y (2) un smoke del endpoint vivo contra ese entorno. Tests contra DB efimera/mock no prueban que el entorno real quedo migrado.

## Source

- **Discovered in**: JOR-110, cierre (post e2e verde, smoke manual del dev).
- **Evidence**: L1 (e2e verde con DB efimera, GET 500 en dev real hasta correr `npm run migrate`; verificado GET 200 tras el fix).
