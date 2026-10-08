---
plan_id: plan-tracker-prueba
created: 2026-10-08T03:40:41.256Z
updated: 2026-10-08T03:41:19.137Z
tags:
  projects: []
  repos:
    - arb-test
  tickets: []
  branches: []
  folders: []
  labels:
    - prueba-plan-tracker
---

# Arbiter: plan-tracker-prueba

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| pt-prueba-r1 | 2026-10-08T12:05:00Z | worktree | bloquea | 1 / 0 / 2 / 0 / 0 | 1/1 completos, 0 sin leer |
| pt-prueba-r2 | 2026-10-08T12:25:00Z | worktree | aprobable_con_reservas | 0 / 0 / 1 / 0 / 0 | 1/1 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| pt-prueba-r2/f2 | S2 | maintainability | sum.ts:2-4 | Logica nueva de descuento sin ningun test | arrastrado de pt-prueba-r1/f2 |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| pt-prueba-r1/f1 | S0 | sum.ts:4 | El descuento porcentual divide por 10 en vez de 100 | re-chequeo: corregido |
| pt-prueba-r1/f3 | S2 | sum.ts:2 | discountPct sin validacion de rango | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
