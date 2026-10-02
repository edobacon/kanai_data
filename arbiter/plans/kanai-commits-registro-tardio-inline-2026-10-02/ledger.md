---
plan_id: kanai-commits-registro-tardio-inline-2026-10-02
created: 2026-10-02T15:43:22.046Z
updated: 2026-10-02T15:51:16.000Z
tags:
  projects: []
  repos:
    - kanai-app
  tickets: []
  branches:
    - setup
  folders:
    - server/inlinePlan
    - app/components
  labels:
    - casos-inline
    - planes-inline
---

# Arbiter: kanai-commits-registro-tardio-inline-2026-10-02

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| kanai-commits-registro-tardio-inline-2026-10-02-r1 | 2026-10-02T15:50:00Z | a84ef0d | aprobable_con_reservas | 0 / 0 / 1 / 2 / 2 | 30/30 completos, 0 sin leer |
| kanai-commits-registro-tardio-inline-2026-10-02-r2 | 2026-10-02T16:30:00Z | 6244ada | aprobable_con_nits | 0 / 0 / 0 / 1 / 0 | 13/13 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| kanai-commits-registro-tardio-inline-2026-10-02-r2/f1 | S3 | correctness | server/inlinePlan/next.ts:136 | Con juez por fase, el paso del juez desactualizado tapa los avisos de git y lleva a una llamada que se rechaza |  |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| kanai-commits-registro-tardio-inline-2026-10-02-r1/f1 | S2 | server/inlinePlan/state.ts:135 | Juez desactualizado se compara contra la hora del veredicto, no del brief | re-chequeo: corregido |
| kanai-commits-registro-tardio-inline-2026-10-02-r1/f2 | S3 | server/inlinePlan/next.ts:110 | Siguiente paso dice 'Antes del juez final' aunque el juez sea por fase o esté apagado | re-chequeo: corregido |
| kanai-commits-registro-tardio-inline-2026-10-02-r1/f3 | S3 | server/inlinePlan/next.ts:96 | Juez de fase desactualizado no se avisa en el siguiente paso mientras hay otra fase en curso | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
