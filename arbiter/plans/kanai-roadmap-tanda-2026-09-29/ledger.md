---
plan_id: kanai-roadmap-tanda-2026-09-29
created: 2026-09-29T22:21:31.510Z
updated: 2026-09-29T22:36:26.950Z
tags:
  projects:
    - kanai_self
  repos:
    - kanai-app
  tickets: []
  branches:
    - setup
  folders:
    - docs/roadmap
    - server/dispatch
    - server/engine/guards
    - server/repo
  labels:
    - roadmap
    - gentle-ai
    - engram
    - juez-propio
    - metricas
---

# Arbiter: kanai-roadmap-tanda-2026-09-29

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| r1-20260929 | 2026-09-29T22:35:00Z | 461c5e0 | iterar | 0 / 0 / 3 / 3 / 0 | 53/71 completos, 2 sin leer |
| r2-20260929 | 2026-09-29T22:55:00Z | 1180920 | iterar | 0 / 0 / 2 / 2 / 0 | 16/17 completos, 0 sin leer |
| r3-20260929 | 2026-09-29T23:06:00Z | f529026 | aprobable_con_reservas | 0 / 0 / 1 / 1 / 0 | 7/7 completos, 0 sin leer |
| r4-20260929 | 2026-09-29T23:14:00Z | 9102d49 | aprobado | 0 / 0 / 0 / 0 / 0 | 4/4 completos, 0 sin leer |

## Abiertos (ultima corrida)

Ninguno.

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| r1-20260929/f2 | S2 | server/dispatch/judgeCanary.ts:84 | Con evidencia enforce y canario, un juez que solo reporta el canario termina en approve sin validar evidencia | re-chequeo: corregido |
| r1-20260929/f3 | S2 | docs/roadmap/01-via-rapida-organica.md:13 | El doc 01 quedo en Planificada con limite archivos/LOC; el indice dice hecha y el codigo limita solo por archivos | re-chequeo: corregido |
| r1-20260929/f4 | S3 | server/repo/roadmapMetricsFlow.ts:93 | M5 mide archivos por run y DET-47 suma los archivos de todos los runs del ticket | re-chequeo: corregido |
| r1-20260929/f5 | S3 | server/dispatch/taskReview.ts:85 | La duracion del review por task suma la de jueces que corren en paralelo | re-chequeo: corregido |
| r1-20260929/f6 | S3 | server/dispatch/judgeAgents.ts:148 | Un escalate o iterate legitimo al repreguntar hereda la evidencia missing/invalid del primer intento | re-chequeo: corregido |
| r2-20260929/c1 | S2 | server/engine/guards/catalog.ts:74 | DET-47 ofrece pasar a tactic al cerrar, pero el cambio de tipo solo aplica con el ticket en open | re-chequeo: corregido |
| r2-20260929/c2 | S2 | server/dispatch/judgeAgents.ts:149 | Sin test para un escalate o iterate al repreguntar que no hereda la evidencia del primer approve | re-chequeo: corregido |
| r2-20260929/c3 | S3 | server/dispatch/judgeAgents.ts:149 | En enforce, un approve sin evidencia que al repreguntar pasa a iterate ya no queda registrado en judge-evidence | re-chequeo: corregido |
| r2-20260929/c4 | S3 | tests/unit/telemetry-reliability.test.ts:108 | El test de duracion del review por task usa la misma duracion en los dos jueces | re-chequeo: corregido |
| r3-20260929/n1 | S2 | server/dispatch/gate.ts:86 | La nueva rama de recordJudgeEvidence (evidenceFirstAttempt + retry=changed) no tiene test | re-chequeo: corregido |
| r3-20260929/n2 | S3 | server/dispatch/judgeCanary.ts:77 | evidenceFirstAttempt no pasa por el filtro del canario y invalid= cuenta citas al canario en filas retry=changed | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
