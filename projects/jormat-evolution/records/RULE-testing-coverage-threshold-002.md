---
id: RULE-testing-coverage-threshold-002
project: jormat-evolution
type: rule
module: testing
level: must
tags:
  - testing
  - coverage
  - threshold
  - jest
  - vitest
  - gate
  - ci
  - convention
  - merge
  - ratchet
---

# Piso de coverage ≥90% como gate del build (ambas capas)

## What

Ambas capas MUST mantener un piso de coverage que hace fallar la corrida (exit ≠ 0) si baja. El
mecanismo difiere por capa (backend actualizado por JOR-106):

- **Backend**: gate sobre el **MERGE unit + e2e** (`npm run test:cov:all`, via `scripts/merge-coverage.cjs`),
  NO sobre la corrida unit-only. La suite unit (`jest.config.ts`) subestima la capa de acceso a datos
  (repositories/SQL Knex), que se ejercita por e2e; por eso `jest.config.ts` ya **NO** lleva
  `coverageThreshold`. Umbral **por-eje, ratchet no-regresivo**: statements/functions/lines **≥90**,
  branches **≥89**. El piso se sube con el tiempo, nunca se baja.
- **Frontend**: `vitest.config.ts` → `coverage.thresholds = { lines:90, branches:90, functions:90, statements:90 }`
  (threshold global, medido sobre el proyecto jsdom).

## Why

Sin threshold el número se erosiona con cada PR. El piso ejecutable (no aspiracional) garantiza que
una regresión de cobertura rompe la corrida de tests (exit ≠ 0): criterio medible de calidad
(DET-13). El frontend usa threshold global (no per-file) para no bloquear cada archivo nuevo con
fricción desproporcionada (DEC-LOCAL-02). El **backend** mide sobre el merge unit+e2e porque la capa
de datos (repositories) se prueba por integración, no por unit (JOR-106); el umbral por-eje refleja
que branches converge más lento que el resto, y el **ratchet** (piso = lo ya logrado, sube pero no
baja) evita tanto el gate en rojo permanente como la erosión.

## Where

- Backend: `backend/jormat-api/scripts/merge-coverage.cjs` (gate del merge; umbral por-eje via
  `--branches=89`), `backend/jormat-api/jest.e2e.config.ts` (recolecta coverage e2e),
  `backend/jormat-api/package.json` (`test:cov:all` = unit cov + e2e cov + merge). `jest.config.ts`
  ya **no** lleva `coverageThreshold` (solo emite el reporte unit que alimenta el merge).
- Frontend: `front/jormat-front/vitest.config.ts` (`coverage.thresholds`).

## When

Siempre. Un archivo nuevo sin tests que baje una métrica por debajo de su piso DEBE cubrirse antes de
mergear (o, si es no-testeable unitariamente, excluirse según RULE-testing-coverage-config-001).
No bajar el piso para "dejar pasar": eso vacía el gate. Subir el piso (ratchet) SÍ es válido cuando
la cobertura real ya lo supera de forma estable.

## Nota de calibración (JOR-149, 2026-08-17)

- **El piso de branches (89) estaba UN escalón por encima del número real** al arrancar JOR-149:
  medido en un worktree detached a HEAD pre-ticket, branches daba 88.82% (890/1002) — el gate ya
  fallaba en la rama de la epica antes de este ticket. JOR-149 lo cerró de rebote (los tests de
  write-path lo subieron a 89.8%). Vigilar: si otra rama que parte de `epic/jormat-v1` corre el gate
  y da rojo por branches sin haberlo tocado, es este desalineamiento del ratchet, no una regresión
  propia.
- **El gate SOLO corre desde el host**: dentro del contenedor de la API `package.json` y los
  `jest.config` están horneados en la imagen (no bind-mounted), así que `test:cov:all` no existe ahí,
  el `jest.config.ts` del contenedor aún trae el `coverageThreshold` viejo, y el e2e coverage cae en
  `coverage/` pisando el reporte unit. Correr `npm run test:cov:all` desde `backend/jormat-api` en el
  host. `coverage-e2e/` y `coverage-merged/` NO están gitignoreados: limpiarlos tras correr el gate.

## Verification

- Backend: `npm run test:cov:all` termina exit 0 cuando el merge cumple los pisos por-eje, exit ≠ 0
  cuando alguno cae (verificado en JOR-106: branches 88.78 con piso 90 sale exit 1; con piso 89 sale
  exit 0). Frontend: `vitest run --project '!storybook' --coverage` sale exit ≠ 0 si baja de 90
  (verificado en JOR-049 S5 forzando `--coverage.thresholds.branches=99.99`).

## Source

JOR-049 (S5) — piso ≥90 y gate por herramienta (backend jest, frontend vitest). **Amendado por
JOR-106**: el gate del backend pasó de la corrida unit-only (`jest.config.ts coverageThreshold`) al
merge unit+e2e (`scripts/merge-coverage.cjs`) con umbral por-eje ratchet (branches ≥89), porque la
capa repository se cubre por e2e y el unit-only subestimaba el número. El frontend no cambió.
