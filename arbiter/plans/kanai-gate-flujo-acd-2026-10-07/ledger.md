---
plan_id: kanai-gate-flujo-acd-2026-10-07
created: 2026-10-07T19:52:51.084Z
updated: 2026-10-07T20:01:11.635Z
tags:
  projects:
    - kanai_self
  repos:
    - kanai-app
  tickets: []
  branches:
    - setup
  folders:
    - server/dispatch
    - server/repo
    - docs
  labels:
    - gate-flujo
    - fases-A-C-D
---

# Arbiter: kanai-gate-flujo-acd-2026-10-07

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| arb-20261007-gate-acd | 2026-10-07T16:20:00-03:00 | f99097f6559e34e1c6600e773f1675c18f7dffce | iterar | 0 / 0 / 4 / 1 / 1 | 16/16 completos, 0 sin leer |
| arb-20261007-gate-acd-r2 | 2026-10-07T16:55:00-03:00 | 8392f3ddd6338705c3ba7ea6ce9d58a1263d6691 | aprobable_con_nits | 0 / 0 / 0 / 2 / 0 | 12/12 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| arb-20261007-gate-acd-r2/f1 | S3 | correctness | server/dispatch/gateRedGuard.ts:49 | envFailureOf descarta la falla de entorno si hay cualquier test con nombre en failed, incluidos los preexistentes del baseline |  |
| arb-20261007-gate-acd-r2/f2 | S3 | correctness | server/dispatch/gateCriteriaLint.ts:12 | remoteOnlyReason no detecta frases comunes y marca criterios locales de UI o de jobs de la app | arrastrado de arb-20261007-gate-acd/f5 |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| arb-20261007-gate-acd/f1 | S2 | server/dispatch/testBaseline.ts:103 | La herencia de baseline identifica al ticket que origino la rama por baseRef, pero baseRef guarda la base y no la rama de trabajo | re-chequeo: corregido |
| arb-20261007-gate-acd/f2 | S2 | server/dispatch/gateRedGuard.ts:27 | detectEnvFailure no se correlaciona con la falla que bloquea e incluye patrones que si pueden venir del codigo del ticket | re-chequeo: corregido |
| arb-20261007-gate-acd/f3 | S2 | server/dispatch/gate.ts:181 | Sin test de punta a punta de que un gate en rojo omite los jueces y persiste judge_count=0 para forzar el N2 siguiente | re-chequeo: corregido |
| arb-20261007-gate-acd/f4 | S2 | server/repo/gateRuns.ts:1 | Los comentarios de gate_runs y gateOutcome siguen diciendo que un gate sin jueces no se registra | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
