---
id: RULE-testing-mutation-003
project: jormat-evolution
type: rule
module: testing
level: should
tags:
  - testing
  - mutation
  - stryker
  - backend
  - gate
  - convention
  - det-31
---

# Mutation gate en tickets de backend: stryker scoped + cubrir survivors

## What

Todo ticket de **backend** (`module: backend`) que agregue o cambie código de producción MUST correr
**mutation testing (stryker) scoped a los archivos cambiados** en el `S{N}.GATE` de cada session que
toca código, y SHOULD **matar los mutantes sobrevivientes en las líneas nuevas/cambiadas** — o
**justificar** cada superviviente aceptado en el ticket (mutante equivalente, interno de regex,
código dormant sin caller).

```bash
# scoped a lo cambiado (rápido; no full-suite):
npx stryker run --mutate "src/<archivo1>.ts,src/<archivo2>.ts"
# o diff-only contra la base:
npx stryker run --since=develop
```

Warn-first (operacionaliza DET-31): no rompe el build por default, pero el mutation score y los
survivors se reportan en el gate y quedan en el ticket. Escalar a bloqueante en sessions tier T3.

## Why

El piso de coverage ≥90% (RULE-testing-coverage-threshold-002) mide **líneas ejecutadas**, no si los
tests **muerden**. Evidencia dura (JOR-100, run 2026-07-22): `items.repository.ts` tenía cobertura
pero **mutation ~1%** — el mutante `this.db('users') → this.db('')` (blanquear el nombre de tabla)
**sobrevivía** porque los tests mockean knex e ignoran el argumento. Un test que pasa con el código
roto da falsa confianza (peor que no tenerlo). La mutación es el criterio empírico de "los tests
muerden" (DET-13, DET-31).

Contraste medido en JOR-100: donde hubo tests dirigidos (guard 100%, controller 100%, auth.guard
88%) los mutantes mueren; donde se heredaron mocks (items.repository ~1%, auth.service 22%) no.

## Where

- `backend/jormat-api/stryker.conf.json` (ya existe, warn-first: `mutate: src/**/*.ts` excl. specs/main).
- Aplicar en el `S{N}.GATE` de cada session de un ticket backend que toque código de producción.

## When

- En cada session de un ticket backend que agregue/cambie código de producción (NO specs, docs, ni
  config pura). Scoped/diff-only, no full-suite.
- **Prioridad alta** en código de **persistencia / proyecciones N:M / delete / aislación por
  `workspace_id`**: ahí los mocks consagran bugs (el repo/service se debe cubrir con **integration
  tests contra DB real**, no solo mock — un mock no mata el mutante de nombre de tabla ni de filtro).
- Survivors que son mutaciones internas de regex o mutantes equivalentes: aceptables, se documentan
  (rendimiento decreciente perseguirlos).

## Verification

- La corrida de stryker termina y reporta mutation score por archivo cambiado.
- Los survivors en líneas nuevas/cambiadas están killed o justificados en el ticket (session gate).
- Ej. JOR-100: `tenantScoped` pasó de 59%→65% agregando casos de whitespace; survivors restantes
  (regex interno) documentados como aceptados.

## Source

JOR-100 (mutation run 2026-07-22, stryker scoped). Operacionaliza DET-31 (mutation gate, warn-first)
para el backend de jormat-evolution. Complementa RULE-testing-coverage-threshold-002 (cobertura) con
la dimensión de "los tests muerden".
