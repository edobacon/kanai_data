---
id: RULE-testing-coverage-granularity-005
project: jormat-evolution
type: rule
module: testing
level: must
tags:
  - testing
  - coverage
  - istanbul
  - branch-coverage
  - statement-coverage
  - false-green
  - backend
---

# Un hueco de coverage se juzga a nivel statement/branch, no a nivel linea

## What

Para decidir si un comportamiento esta cubierto en `backend/jormat-api`, mirar los **hit-counts por statement/branch** del `coverage-final.json` de istanbul, NO el reporte por linea ni el agregado por archivo.

- En un `if (cond) throw X;`, la **linea** cuenta como cubierta apenas se evalua el `if` (aunque el `throw` nunca se ejecute). El reporte de lineas y el "% del archivo" **enmascaran** un `throw` con 0 hits. Solo el statement del `throw` (`f.s[id]`) y la rama del `if` (`f.b[id]` = `[true, false]`) revelan el hueco.
- Un test que asserta el **mensaje** de una excepcion NO prueba que ejercito la **rama** que lo emite: el mismo mensaje puede lanzarse desde otra ruta. Es un **falso-verde**. Confirmar contra el codigo real que el input del test entra por la rama objetivo (leer el flujo, no confiar en el mensaje).
- Un hueco de coverage citado desde un artefacto **no versionado** (un `coverage-final.json` de una corrida vieja, borrado del working tree) se **re-verifica** contra el coverage vivo antes de escribir tests. El artefacto pudo transcribir branches que no corresponden a esas lineas.

Verificacion granular por archivo objetivo:
```
npx jest <spec> --coverage --collectCoverageFrom='**/<file>.ts' \
  --coverageReporters=json --coverageDirectory=/tmp/cov
# luego leer coverage-final.json: f.s[stmtId] (statement), f.b[branchId] (rama [t,f])
```

## Why

JOR-151 nacio de huecos de coverage que la corrida de merge de JOR-149 dejo visibles. El triage marco `auth.guard.ts:184`/`:186` como huecos citando un `coverage-final.json` ya borrado. Una lectura a nivel LINEA sugirio lo contrario (solo `:177` sin cubrir), porque la linea `:184` figuraba cubierta por el `if` que corre 29 veces — ocultando que su `throw` tenia 0 hits. A nivel statement/branch: `:184` SI era hueco (`throw` 0 hits, rama `[0,29]`), `:187` ya estaba cubierto (`[2,25]`), y el test existente de HS256 era un **falso-verde** (asertaba `'Algoritmo no soportado'` pasando por `verifyE2EToken`, sin ejecutar el `throw` de `:184`). Confiar en el reporte de linea o en el mensaje del test habria dejado el hueco abierto y consagrado el falso-verde. Es la contraparte de [[feedback_mocked_tests_consecrate_runtime_bugs]] a nivel de granularidad de coverage.

## Where

- Evidencia del caso: `src/auth/auth.guard.ts` (`verifyToken` — `:177` catch, `:181` rama HS256, `:184` throw); tests en `src/auth/auth.guard.canactivate.spec.ts` (el HS256 falso-verde convive con el G3b que ejercita el `throw` real via `alg:'none'`).
- El gate agregado del proyecto (`scripts/merge-coverage.cjs --branches=89`, ver [[RULE-testing-coverage-threshold-002]]) NO detecta estos huecos: estan bajo el piso agregado. La deteccion es por-archivo/por-rama, manual.

## When

- Al triagear o cerrar un hueco de coverage: mirar statement/branch del archivo objetivo, no la linea ni el %.
- Al escribir un test de una rama de rechazo (`throw`/`return false`/guard): confirmar que el input entra por esa rama y no por otra que produce el mismo efecto observable. Para algoritmos de token: un `alg` que no sea ni el aceptado ni el de bypass (`'none'`) para no caer en la ruta de e2e-login.
- Al recibir un hueco citado desde un coverage no presente en el working tree: re-correr el coverage scoped y verificar antes de escribir tests.

## Verification

- Reproducible: correr el spec objetivo con `--collectCoverageFrom` del archivo y comparar `f.s`/`f.b` del `throw`/rama antes y despues del test (JOR-151: `:177` `0->1`, `:184` throw `0->1` y rama `[0,29]->[1,29]`).
- Un test cuyo assert pasa pero cuya rama objetivo sigue en 0 hits es un falso-verde: el test se reescribe para entrar por la rama real.
