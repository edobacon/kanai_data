---
id: BUG-workflow-stryker-vitest4-sigsegv-005
project: horadric
type: bug
module: workflow
status: confirmed
severity: medium
tags:
  - dkc-mutate
  - stryker
  - vitest4
  - mutation
  - det-31
  - sigsegv
  - upstream
  - mitigated
  - hor-126
  - hor-127
---

# StrykerJS 9.6.1 (ultimo publicado) crashea el worker de vitest 4.x con SIGSEGV — el gate de mutacion (DET-31) no corre en frontend vitest4

## Symptom

`dkc-mutate` (motor del gate DET-31) falla de forma no-determinista en proyectos frontend con **vitest 4.x**: unas veces crashea rapido (~16s) con "Something went wrong in the initial test run", otras se cuelga hasta el `dryRunTimeout` (~300s). En jormat-evolution se observo como "timeout ~305s" en ~6 tickets (JOR-055/057/059/060/061); en horadric-cube como crash rapido. El gate de mutacion queda **sin senal** en ~70% de las corridas frontend vitest4.

## Expected behavior

`dkc-mutate` deberia correr el dry-run de stryker, mutar el diff y reportar score (killed/survived), alimentando la dimension #4 (testing) del quality review (DET-23/DET-31). En repos frontend vitest4 esto no ocurre.

## Root cause

**Incompatibilidad de `@stryker-mutator/vitest-runner` 9.6.1 con vitest 4.1.x**: el worker de test que stryker spawnea **crashea con SIGSEGV** durante el dry-run inicial (stryker reintenta 2 veces, SIGSEGV cada vez → "Test runner crashed"). El peer de stryker declara `vitest: ">=2.0.0"` (optimista), pero 9.6.1 es previo a vitest 4 y **no lo soporta de forma estable**. Pista en el log: `test.poolOptions was removed in Vitest 4` + el crash es nativo (SIGSEGV), agravado en repos con modulos nativos en worker_threads (ej. horadric-cube usa `better-sqlite3`).

- **File**: `commands/dkc-mutate` (path stryker/vitest) + cache `commands/lib/mutation-tools/vitest4/node_modules/@stryker-mutator/*`
- **Cause**: stryker vitest-runner 9.6.1 ↔ vitest 4.1.x → worker SIGSEGV en el dry-run. **No hay stryker mas nuevo** (`npm view @stryker-mutator/vitest-runner@latest` = 9.6.1) que lo arregle.

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | Todos los proyectos DKC con frontend **vitest 4.x** (horadric-cube, jormat-front, up1 vitest4) |
| Data affected | Ninguna (tooling read-only, worktree efimero) |
| Modules affected | workflow (gate DET-31 mutation), quality review dimension #4 |
| Frequency | No-determinista: crash rapido O hang; ~70% de corridas frontend vitest4 sin senal |

## Reproduction

### Environment
| Campo | Valor |
|-------|-------|
| Environment | dev (local) |
| Client | node 22, StrykerJS 9.6.1 (cache DKC vitest4) |
| Data conditions | repo frontend con vitest ^4.x + diff mutable |

### Steps
1. En un repo vitest4 (ej. horadric-cube) con un diff fuente vs HEAD~1.
2. `./commands/dkc-mutate horadric --json` (o `--repo <path>`).
3. Resultado observado: `Child process exited unexpectedly (SIGSEGV)` x2 → `Test runner crashed` → "Something went wrong in the initial test run" (rc=1), sin reporte de mutantes. (Verificado 2026-07-03 contra horadric-cube vitest 4.1.6; log completo en la session de HOR-126.)

## Workaround / mitigation (HOR-126, 2026-07-03)

**Mitigado, NO resuelto** (la causa es upstream). `dkc-mutate` detecta `vitest major >= 4` y **corta rapido** con `recommendation: infrastructure_issue` (warn-first DET-31, no bloquea como gap) en vez de spawnear stryker y colgar/crashear (0.17s vs hang de 5-15 min). Escape hatch `DKC_FORCE_VITEST4=1` para forzar el intento cuando upstream publique soporte. Ver `commands/dkc-mutate` (guard `RUNNER=vitest && VMAJOR>=4`) + header "LIMITACION vitest >=4".

## Fix real (pendiente, upstream)

Esperar que `@stryker-mutator/vitest-runner` publique soporte estable de vitest 4.x. Al aparecer: quitar/relajar el guard, actualizar el cache DKC (`commands/lib/mutation-tools/vitest4`), y re-verificar contra horadric-cube + jormat-front. Alternativa exploratoria (HOR-126 B2, `could`): spike `pool:'forks'`/single-fork en la config efimera para esquivar el SIGSEGV nativo — payoff incierto (puede no cubrir el flavor timeout de jormat).

## Notes

- Detectado y verificado en HOR-126 (roadmap HOR-125 P1). Documentado tambien en el header de `commands/dkc-mutate` y en el ticket HOR-126.
- `status: confirmed` (causa raiz verificada); `fixed_in: null` porque la mitigacion (fast-skip) NO es el fix del bug — el gate sigue sin poder mutar vitest4 hasta el fix upstream.
