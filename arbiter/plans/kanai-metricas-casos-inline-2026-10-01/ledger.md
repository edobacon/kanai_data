---
plan_id: kanai-metricas-casos-inline-2026-10-01
created: 2026-10-01T19:28:52.338Z
updated: 2026-10-01T19:37:22.316Z
tags:
  projects:
    - kanai_self
  repos:
    - kanai-app
  tickets: []
  branches:
    - feat/metricas-casos-inline
  folders:
    - server/inlinePlan
    - server/mcp
  labels:
    - casos-inline
    - metricas
---

# Arbiter: kanai-metricas-casos-inline-2026-10-01

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| r1-kanai-app | 2026-10-01T16:50:00-03:00 | 5467fb4 | aprobable_con_reservas | 0 / 0 / 1 / 4 / 0 | 20/20 completos, 0 sin leer |
| r2-kanai-app | 2026-10-01T17:15:00-03:00 | afd37b9 | aprobable_con_reservas | 0 / 0 / 1 / 2 / 0 | 7/7 completos, 0 sin leer |
| r3-kanai-app | 2026-10-01T17:35:00-03:00 | e13c0bc | aprobable_con_nits | 0 / 0 / 0 / 2 / 0 | 2/2 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| r3-kanai-app/r3-f1 | S3 | correctness | server/inlinePlan/usageTrack.ts:110 | Tapar sin distinguir mayusculas tambien tapa texto fijo de la regla si un argumento libre coincide con el |  |
| r3-kanai-app/f5 | S3 | maintainability | server/inlinePlan/usage.ts:68 | Una regla con dos citas pierde su texto fijo y la senal queda ilegible | arrastrado de r2-kanai-app/f5 |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| r1-kanai-app/f1 | S2 | server/inlinePlan/usage.ts:68 | El saneo de rechazos depende de comillas; reglas que interpolan texto sin comillas (notas, nombres, rutas) llegan a usage.ndjson | re-chequeo: corregido |
| r1-kanai-app/f2 | S3 | server/mcp/inlinePlanTools.ts:19 | dry_run de create y judge_brief de advance cuentan como escritura y cortan la retoma | re-chequeo: corregido |
| r1-kanai-app/f3 | S3 | server/inlinePlan/metrics.ts:40 | Umbral de fase desbordada mezcla dias de jornada (8 h) con dias de calendario (24 h) | re-chequeo: corregido |
| r1-kanai-app/f4 | S3 | server/inlinePlan/metricsUsage.ts:70 | Errores que no son de reglas entran en rejected_by_rule y pueden generar la senal de regla | re-chequeo: corregido |
| r2-kanai-app/r2-f1 | S2 | server/inlinePlan/usageTrack.ts:109 | redactArgs distingue mayusculas y el rechazo de quitar del intake cita el valor en minusculas: nombres quedan sin tapar | re-chequeo: corregido |
| r2-kanai-app/r2-f2 | S3 | server/inlinePlan/usageTrack.ts:91 | Se tapan codigos de tarea bajo la clave code del plan y la misma regla queda en dos grupos | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
