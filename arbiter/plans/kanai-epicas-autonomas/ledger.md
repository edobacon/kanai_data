---
plan_id: kanai-epicas-autonomas
created: 2026-10-03T16:49:57.464Z
updated: 2026-10-03T16:49:57.464Z
tags:
  projects:
    - kanai_self
  repos:
    - kanai-app
  tickets: []
  branches:
    - codex/epicas-autonomas
  folders:
    - server/epics
    - app/pages/epicas
  labels:
    - epicas
    - revision-implementacion
    - caso-inline
---

# Arbiter: kanai-epicas-autonomas

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| 20261003-epicas-review1-kanai-app | 2026-10-03T16:49:51.669112Z | 1d716b440eb4ae9b112f4ba75f47dacb288b0ef0 | iterar | 0 / 7 / 1 / 0 / 0 | 48/48 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| 20261003-epicas-review1-kanai-app/b1-f1 | S1 | correctness | server/epics/bridge.ts:29 | La observación rechaza sesiones reemplazadas que el motor permite conservar |  |
| 20261003-epicas-review1-kanai-app/b1-f2 | S1 | correctness | server/epics/checkpoint.ts:21 | El checkpoint acepta un ancestro ajeno al trabajo del ticket como integración |  |
| 20261003-epicas-review1-kanai-app/b1-f3 | S1 | correctness | server/epics/checkpoint.ts:11 | Confirmar integración permite avanzar después del límite de corrida |  |
| 20261003-epicas-review1-kanai-app/b1-f4 | S2 | security | server/dispatch/context.ts:330 | El grounding de una corrida provoca fetch sin verificar permiso de red |  |
| 20261003-epicas-review1-kanai-app/b2-f1 | S1 | correctness | server/llm/nextActionState.ts:98 | La política autónoma temporal no llega a approve_artifact |  |
| 20261003-epicas-review1-kanai-app/b2-f2 | S1 | correctness | server/repo/preGate.ts:272 | La propuesta incluye repos que el nuevo guard de épica rechaza |  |
| 20261003-epicas-review1-kanai-app/b2-f3 | S1 | correctness | server/epics/service.ts:65 | update puede cancelar una corrida reanudada mientras espera lecturas |  |
| 20261003-epicas-review1-kanai-app/b3-f1 | S1 | intent_gap | tests/unit/epic-final.test.ts:16 | El cierre agregado no tiene pruebas que atraviesen sus guards ni recuperen un cierre parcial |  |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
