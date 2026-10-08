---
plan_id: epic-preparacion-2026-10-07
created: 2026-10-08T02:06:14.033Z
updated: 2026-10-08T02:18:06.937Z
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
| epic-preparacion-r3 | 2026-10-08T00:10:00-03:00 | 5afc1ebf5fc7666f322f3038f13268107fad97f6 | aprobable_con_reservas | 0 / 0 / 1 / 1 / 0 | 11/11 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| epic-preparacion-r3/h1 | S2 | maintainability | skills/claude/kn-epic/SKILL.md:86 | Los textos dicen que el panel solo propone respuestas de una persona, pero el pool incluye respuestas del agente |  |
| epic-preparacion-r3/h2 | S3 | maintainability | server/epics/decisionBank.ts:24 | normalizeQuestion quedo exportado sin consumidores externos con un docstring que ya no aplica |  |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| epic-preparacion-r1/f1 | S1 | server/dispatch/specMissingValues.ts:103 | La reutilizacion del banco aplica una respuesta propuesta sin confirmacion humana en lote | re-chequeo: corregido |
| epic-preparacion-r1/f2 | S1 | server/epics/decisionBank.ts:12 | La similitud Jaccard 0,30 da falsos positivos entre preguntas que solo difieren en el dato | re-chequeo: corregido |
| epic-preparacion-r1/f3 | S2 | server/mcp/tools.ts:4014 | answer_open_question sin autorizacion humana alimenta el banco como respuesta humana, y la reutilizacion se encadena | re-chequeo: corregido |
| epic-preparacion-r1/f4 | S1 | server/epics/preparation.ts:76 | Bloqueo sin salida: prepare exige dataModelAck pero este solo se escribe en approve, que exige preparacion | re-chequeo: corregido |
| epic-preparacion-r1/f5 | S2 | server/epics/runner.ts:117 | runner.ts escribe /tmp/kanai-drift.log en cada ticket_drift, con catch vacio y sin flag | re-chequeo: corregido |
| epic-preparacion-r1/f6 | S2 | server/epics/preparation.ts:136 | answer_batch no es atomico: si bankAnswer lanza quedan respuestas aplicadas a medias | re-chequeo: corregido |
| epic-preparacion-r1/f7 | S2 | server/epics/contracts.ts:3 | La doc y el comentario dicen que los contratos van detras del flag; el codigo no los condiciona | re-chequeo: corregido |
| epic-preparacion-r1/f8 | S2 | server/epics/schema.ts:74 | Un contrato pasa a agreed por update (no humano) y la confirmacion de approve no muestra los valores | re-chequeo: corregido |
| epic-preparacion-r1/f9 | S3 | server/epics/preparation.ts:112 | answer_batch y preview_preparation funcionan con el flag apagado | re-chequeo: corregido |
| epic-preparacion-r1/f10 | S3 | server/dispatch/specMissingValues.ts:28 | La reutilizacion dentro del ticket ignora la revision del cuerpo | re-chequeo: corregido |
| epic-preparacion-r2/g1 | S2 | server/dispatch/specMissingValues.ts:29 | La reutilizacion de la misma pregunta no distingue si la respuesta la dio una persona | re-chequeo: corregido |
| epic-preparacion-r2/g2 | S2 | server/epics/preparation.ts:115 | prepare dice que no queda ninguna decision pendiente aunque el ack del modelo de datos sigue pendiente | re-chequeo: corregido |
| epic-preparacion-r2/g3 | S2 | server/epics/runner.ts:29 | El docstring de assertNoUnforeseenQuestions dice que el banco hace nacer respondidas las preguntas | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
