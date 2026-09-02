---
id: RULE-testing-typecheck-006
project: jormat-evolution
type: rule
module: testing
level: should
tags:
  - testing
  - frontend
  - tsc
  - typecheck
  - gate
  - det-23
---

# El gate de sessions frontend debe correr `tsc --noEmit`, no solo vitest

## What

El modo server de una DataTable (JOR-068 S1) tenia un bug de tipo latente (`onSortingChange` vs `OnChangeFn` de TanStack) que los gates de las sessions S1/S2 no detectaron, porque solo corrieron `vitest` — que no type-checkea — y no `tsc`. El gate de cualquier session frontend que toque codigo TypeScript debe incluir `tsc --noEmit` (o el build, que lo hace transitivamente) ademas de la suite de vitest.

## Why

`vitest` ejecuta el codigo transpilado sin verificar tipos; un mismatch de tipos entre una prop del componente y el tipo esperado por la libreria (ej. TanStack Table) puede pasar la suite verde y solo manifestarse en build o en el editor de otro dev, quedando sin detectar durante 2 sessions completas.

## Where

- **Layers**: frontend (gate de cualquier session que agregue/modifique codigo TypeScript).

## When

- En el `S{N}.GATE` de toda session frontend (DET-23, dimension "Tipado"): correr `tsc --noEmit` explicitamente, no asumir que `vitest`/`npm test` lo cubre.

## Verification

- El gate de la session reporta la salida de `tsc --noEmit` (0 errores) junto con el resultado de vitest, no solo este ultimo.

## Source

- **Discovered in**: JOR-068, Session #4.
- **Evidence**: L9 (bug de tipo en modo server de DataTable no detectado por S1/S2 al correr solo vitest, no tsc).
