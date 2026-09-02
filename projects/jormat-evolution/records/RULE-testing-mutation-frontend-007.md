---
id: RULE-testing-mutation-frontend-007
project: jormat-evolution
type: rule
module: testing
level: should
tags:
  - testing
  - mutation
  - stryker
  - dkc-mutate
  - frontend
  - vitest
  - det-31
  - tooling
---

# `dkc-mutate` en el frontend (vitest multi-proyecto): dos falsos positivos conocidos, no confundir con test-gap real

## What

El mutation gate (DET-31) sobre el frontend de jormat (vitest con proyectos `jsdom` + `storybook` browser) tiene dos limitaciones de tooling conocidas que producen senal falsa, no un gap de cobertura real:

1. **NoCoverage falso en proyectos multi-vitest**: StrykerJS usa `vitest --related` para mapear mutante -> tests; con `projects[]` (uno jsdom, otro storybook browser) esa deteccion falla ("Vitest failed to find test files related to mutated files") aunque el archivo SI tenga test real que lo cubre y pase con 3+ asserts concretos.
2. **`.tsx`/`.jsx` fuera del pathspec de `dkc-mutate`**: el filtro de diff del comando (`commands/dkc-mutate`) usa pathspec `'*.ts' '*.js' '*.vue' '*.mjs' '*.cts'`, sin incluir `*.tsx`/`*.jsx`. Para un ticket cuyos archivos fuente son componentes `.tsx` (ej. `LoginScreen.tsx`, `AuthGuard.tsx`), el diff sale vacio -> reporta `empty-diff`/score 100 trivial, sin mutar nada real.

Ninguno de los dos es un gap de tests del modulo; ambos son limitaciones del tooling de mutacion (DKC-owned el segundo).

## Why

Sin conocer estas dos limitaciones, un `NoCoverage` o un score 100 trivial en el frontend puede mal-interpretarse como test-gap real y disparar backlog `must` innecesario (DET-31), o al reves, dar falsa confianza de que el mutation gate cubrio el diff cuando en realidad no muto nada (`.tsx` excluido del pathspec).

## Where

- **Layers**: frontend (`vitest.config.ts` con `projects: [jsdom, storybook]`), tooling (`commands/dkc-mutate:280` en deckard, fuera de este repo).

## When

- Al leer un reporte de `dkc-mutate` sobre el frontend: si dice `NoCoverage` con "Vitest failed to find test files related", verificar manualmente que el archivo SI tiene test real antes de crear backlog `must`; es WARN-FIRST (T2), no bloquea.
- Si los archivos del diff son mayoritariamente `.tsx`/`.jsx`: verificar si `dkc-mutate` reporto `empty-diff` con score trivial — no asumir que el gate corrio de verdad.

## Verification

- El caso NoCoverage se verifica leyendo el archivo de test correspondiente (ej. `useTheme.test.ts` cubre `useTheme.ts` con asserts concretos) antes de aceptar el reporte de Stryker como gap real.
- Un reporte `empty-diff`/score 100 sobre un diff de puros `.tsx` se descarta como no-ejecutado, no como "mutation gate paso".

## Source

- **Discovered in**: JOR-003 Session #2 (NoCoverage falso) y JOR-004 Session #1 (pathspec sin `.tsx`/`.jsx`, post-cierre a pregunta del dev).
- **Evidence**: JOR-003 L4 (StrykerJS `--related` falla la deteccion en vitest multi-proyecto, no es test-gap real); JOR-004 L3 (`dkc-mutate` pathspec linea 280 sin `*.tsx`/`*.jsx`, diff vacio para archivos `.tsx`).
