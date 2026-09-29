---
plan_id: kanai-app-gate-niveles
created: 2026-09-23T23:57:42.263Z
updated: 2026-09-24T00:14:21.030Z
tags:
  projects: []
  repos:
    - kanai-app
  tickets: []
  branches:
    - setup
  folders:
    - server/dispatch/
    - docs/
    - tests/unit/
    - server/repo/
  labels:
    - gate
    - gate-niveles
    - refactor
---

# Arbiter: kanai-app-gate-niveles

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| gate01 | 2026-09-23T21:20:00 | 068eee0 | iterar | 0 / 2 / 3 / 4 / 0 | 16/27 completos, 1 sin leer |
| gate02 | 2026-09-23T22:30:00 | d941fc8 | iterar | 0 / 2 / 2 / 2 / 0 | 9/28 completos, 7 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| gate02/f1 | S1 | intent_gap | server/dispatch/gate.ts:188 | N3 automatico nunca corre si la ultima sesion abierta es de verificacion o revision |  |
| gate02/f2 | S1 | correctness | server/repo/preGate.ts:359 | untracked filtrados por prefix en repo subcarpeta de monorepo |  |
| gate02/f3 | S2 | correctness | server/dispatch/sessionDiff.ts:510 | delta N1 sin pathspec de subcarpeta: se duplica por repo en monorepo |  |
| gate02/f4 | S2 | correctness | server/dispatch/gate.ts:159 | N3 puede correr mas de una vez |  |
| gate02/f5 | S3 | correctness | server/dispatch/sessionSizing.ts:59 | sizing cuenta la sesion reemplazada mientras la nueva no cerro |  |
| gate02/f6 | S3 | error_handling | server/dispatch/gateLevels.ts:202 | error de git en un repo invalida todo el diff; foto borrada no cae a deltaSince |  |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| gate01/f1 | S1 | server/dispatch/sessionDiff.ts:78 | diff N2/N1 no incluye archivos nuevos untracked | re-chequeo: corregido |
| gate01/f2 | S1 | server/dispatch/gateLevels.ts:85 | N3 integral sin enganche al cierre del ticket | re-chequeo: corregido |
| gate01/f3 | S2 | server/dispatch/gateContext.ts:182 | handoff N1 sin verification ni recentRuns | re-chequeo: corregido |
| gate01/f4 | S2 | server/dispatch/sessionDiff.ts:95 | delta N1 es todo el working tree de la sesion | re-chequeo: corregido |
| gate01/f5 | S2 | server/dispatch/judgeAgents.ts:26 | prefijo pN del juez N1 anula findingsStalled | re-chequeo: corregido |
| gate01/f6 | S3 | server/dispatch/gate.ts:187 | error al armar el diff se presenta como sin cambios | re-chequeo: corregido |
| gate01/f7 | S3 | server/dispatch/gateOutcome.ts:42 | gate con judgesFailed cuenta como ronda N1 | re-chequeo: corregido |
| gate01/f8 | S3 | server/dispatch/sessionSizing.ts:33 | sizing cuenta sesiones supersedidas y solo corre en refine_spec MCP | re-chequeo: corregido |
| gate01/f9 | S3 | tests/unit/gate-orchestration.test.ts:18 | sin test del cableado de niveles ni de handoffs N2/N3 | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
