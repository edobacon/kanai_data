---
id: RULE-global-001
project: jormat-evolution
type: rule
module: global
level: must
tags:
  - clean-code
  - typescript
  - dry
  - kiss
  - testing
  - mutation
  - lint
  - no-any
  - no-console
---

# Todo codigo nuevo o modificado cumple el DoD de calidad (clean code + tipado estricto + testing/mutation) y se verifica en cada sesion

## What

Todo codigo que se cree o modifique en jormat-evolution (front `jormat-front` y back `jormat-api`) cumple, como minimo no negociable, estos estandares — **verificados en cada paso, no al cierre del ticket**:

- **C1 — Clean code / buenas practicas JS+TS**: una responsabilidad por funcion (~40 lineas), archivos ~400, nombres descriptivos en ingles, early returns y guard clauses, sin codigo muerto ni comentado, sin magic numbers/strings (extraer a constantes).
- **C2 — Tipado estricto, sin `any`**: todo se tipa explicitamente; prohibido `any` (usar tipos concretos o `unknown`/`Record<string, unknown>`). `tsconfig` en `strict`. Validar `undefined`/`null` antes de operar. Funciones con >3 params reciben objeto tipado.
- **C3 — DRY**: no duplicar logica; extraer a helper/hook/util/repo. Reuso de UI por la libreria atomica (WP-A3); de datos por hooks de dominio (React Query) y repos por modulo (BE).
- **C4 — KISS**: la solucion mas simple que cumple el requisito; sin sobre-ingenieria ni abstraccion prematura. Explicito sobre clever.
- **C5 — Comentarios solo el "por que" no obvio**: el codigo se autodocumenta. No comentar el "que" (redundante) ni dejar codigo comentado. Si se permiten comentarios que expliquen una decision no evidente, un workaround o un `TODO`/`FIXME` con referencia. Los que queden, en espanol. **Override explicito de la regla global de CLAUDE.md ("comentarios en espanol") para este proyecto**: aqui la directriz es *evitar* comentarios, no agregarlos.
- **C6 — Sin `console.*` en codigo de produccion**: back usa el logger de Nest / `nestjs-pino`; front no deja `console.*` en runtime. El debug se quita antes de commitear.
- **Testing**: cada paso entrega sus tests (unit/integracion segun el artefacto). Assertions con valores concretos, no solo existencia/tipo — el test debe fallar cuando la condicion no se cumple.
- **Mutation testing (StrykerJS)**: habilitado e incorporado al flujo. Corre sobre el diff del WP/sesion (no full suite). **Warn-first**: sobreviviente critico → hardening task en la sesion siguiente; light → backlog `must`. No bloquea el cierre salvo tier alto.

## Why

El proyecto es greenfield y se esta construyendo la base de un ERP multi-tenant que crecera por composicion. La deuda de calidad introducida temprano (codigo sin tipar, duplicado, sin tests que muerdan) se propaga a cada modulo posterior. Enforzar el DoD **en cada sesion** — y no al cierre — evita que el costo de correccion escale. Mutation testing respalda empiricamente que los tests realmente protegen (cobertura alta con assertions debiles pasa el coverage pero no muerde).

## Where

- **Files**: todo `.ts`/`.tsx` en `front/jormat-front/src/**` y `backend/jormat-api/src/**`.
- **Layers**: frontend + backend (config compartida de lint/typecheck/test por app — repos/contextos separados).
- **Config**: ESLint flat por app (`no-explicit-any`, `no-console`), `tsconfig` strict, `vitest.config`/`jest`, `stryker.conf.json` por app, pre-commit (husky + lint-staged), CI required check en `develop`.
- **Plan fuente**: `jormat_docs/ongoing/requirements-and-stack.md §1.4` (DoD) + `implementation-tasks.md` (WP-A0.14 lint, A0.16 mutation, Gate de calidad por WP).

## When

Siempre que se cree o modifique codigo en cualquier sesion DKC del proyecto. Se verifica en el **S{N}.GATE** de cada sesion que toca codigo (alineado con DET-23 quality review y DET-31 mutation gate) y en el cierre de cada WP del plan. Aplica tambien al crear tickets: el alcance del ticket asume este DoD como linea base (no se re-negocia por ticket).

## Verification

Gate de calidad por WP/sesion (plan: `jormat_docs/ongoing/requirements-and-stack.md §1.4.3` — KB externo, sibling del repo de codigo):

- **Lint** verde (`npm run lint`) — incluye `no-explicit-any` (C2) y `no-console` (C6).
- **Typecheck** verde (`tsc --noEmit`) — sin `any`, sin errores de tipo.
- **Tests** del WP verdes (unit + integracion).
- **Mutation** del diff corrida (`test:mutation`, StrykerJS); sobrevivientes triados — warn-first.
- **Review clean code**: C1–C6 (grep de `console.*`, comentarios redundantes y codigo comentado; revision de DRY/KISS/responsabilidad unica).
- **Build** verde (`next build` / `nest build`).

Barreras automaticas: pre-commit (`eslint --fix` + prettier + `tsc --noEmit`) y CI required check en `develop`. El gate humano agrega lo que la maquina no atrapa (DRY, KISS, "por que" de los comentarios, diseño).

## Source

- **Discovered in**: directriz del dev (2026-06-13), al revisar el plan de implementacion antes de entrar a tickets.
- **Evidence**: el DoD del plan (`§1.4`) solo cubria testing; faltaba registrar clean code, tipado estricto sin `any`, DRY, KISS, mutation testing, sin comentarios redundantes y sin `console.log`, y un mecanismo de enforcement por sesion/paso.
- **Related**: DET-7 (regression), DET-23 (quality review gate), DET-31 (mutation gate, warn-first); plan `jormat_docs/ongoing/requirements-and-stack.md §1.4`, `implementation-tasks.md` (A0.14, A0.16, Gate de calidad).
