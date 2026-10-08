---
plan_id: epic-preparacion-2026-10-07
created: 2026-10-08T02:06:14.033Z
updated: 2026-10-08T02:14:09.404Z
tags:
  projects: []
  repos:
    - kanai-app
  tickets: []
  branches:
    - setup
  folders: []
  labels:
    - epicas
    - preparacion
---

# Arbiter: epic-preparacion-2026-10-07

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| epic-preparacion-r1 | 2026-10-07T23:20:00-03:00 | 1f0e717ad89a39a15ce72b48d850fa896435f824 | iterar | 0 / 3 / 5 / 2 / 1 | 21/27 completos, 1 sin leer |
| epic-preparacion-r2 | 2026-10-07T23:45:00-03:00 | 87e9e1afad1a6e146577c759a272fcadea5703a4 | iterar | 0 / 0 / 3 / 2 / 1 | 12/17 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| epic-preparacion-r2/g1 | S2 | correctness | server/dispatch/specMissingValues.ts:29 | La reutilizacion de la misma pregunta no distingue si la respuesta la dio una persona |  |
| epic-preparacion-r2/g2 | S2 | maintainability | server/epics/preparation.ts:115 | prepare dice que no queda ninguna decision pendiente aunque el ack del modelo de datos sigue pendiente |  |
| epic-preparacion-r2/g3 | S2 | maintainability | server/epics/runner.ts:29 | El docstring de assertNoUnforeseenQuestions dice que el banco hace nacer respondidas las preguntas |  |
| epic-preparacion-r2/f9 | S3 | maintainability | server/epics/preparation.ts:112 | answer_batch y preview_preparation funcionan con el flag apagado | arrastrado de epic-preparacion-r1/f9 |
| epic-preparacion-r2/f10 | S3 | correctness | server/dispatch/specMissingValues.ts:28 | La reutilizacion dentro del ticket ignora la revision del cuerpo | arrastrado de epic-preparacion-r1/f10 |
| epic-preparacion-r2/c1 | consulta | intent_gap | server/dispatch/specMissingValues.ts:51 | La reutilizacion exacta en el mismo ticket se aplica sin pasar por la confirmacion en lote |  |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
