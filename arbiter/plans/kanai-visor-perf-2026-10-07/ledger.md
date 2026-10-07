---
plan_id: kanai-visor-perf-2026-10-07
created: 2026-10-07T21:34:04.243Z
updated: 2026-10-07T21:34:04.243Z
tags:
  projects: []
  repos:
    - kanai-app
  tickets: []
  branches:
    - setup
  folders:
    - kanai-app/app
    - kanai-app/server
  labels:
    - visor
    - performance
---

# Arbiter: kanai-visor-perf-2026-10-07

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| kanai-visor-perf-2026-10-07-r1 | 2026-10-07T18:45:00-03:00 | 3d04b0f0 | iterar | 0 / 0 / 2 / 1 / 1 | 15/17 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| kanai-visor-perf-2026-10-07-r1/f1 | S2 | maintainability | server/api/tickets/index.get.ts:10 | Ningun test fija que los listados excluyan body/meta/imageDataUri ni cubre /api/records/counts |  |
| kanai-visor-perf-2026-10-07-r1/f2 | S3 | performance | server/api/records/index.get.ts:10 | El listado de records sigue enviando la columna embedding al navegador |  |
| kanai-visor-perf-2026-10-07-r1/f3 | S2 | maintainability | tests/unit/shared-changes-feed.test.ts:44 | Los tests de sharedChangesFeed no cubren stop() con el lock pendiente, el callback del lock con stopped=true ni el cambio de proyecto |  |
| kanai-visor-perf-2026-10-07-r1/f4 | consulta | correctness | app/utils/sharedChangesFeed.ts:303 | Si el navegador suspende la pestaña lider en segundo plano sin soltar el Web Lock, las demas dejan de recibir cambios |  |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
