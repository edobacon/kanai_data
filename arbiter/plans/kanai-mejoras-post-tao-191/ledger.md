---
plan_id: kanai-mejoras-post-tao-191
created: 2026-10-06T00:02:24.316Z
updated: 2026-10-06T00:07:30.824Z
tags:
  projects:
    - kanai
  repos:
    - kanai-app
  tickets:
    - TAO-191
  branches:
    - setup
  folders: []
  labels:
    - gate
    - jueces
    - auto-fix
---

# Arbiter: kanai-mejoras-post-tao-191

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| kanai-mejoras-post-tao-191-r1 | 2026-10-06T00:05:00Z | 8a1b990 | iterar | 0 / 1 / 1 / 1 / 1 | 47/47 completos, 0 sin leer |
| kanai-mejoras-post-tao-191-r2 | 2026-10-06T00:16:00Z | 27610d2 | aprobable_con_reservas | 0 / 0 / 1 / 0 / 1 | 10/10 completos, 0 sin leer |
| kanai-mejoras-post-tao-191-r3 | 2026-10-06T00:22:00Z | c1f1b5c | aprobable_con_nits | 0 / 0 / 0 / 0 / 1 | 2/2 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| kanai-mejoras-post-tao-191-r3/f4 | consulta | correctness | server/dispatch/gateAutofix.ts:41 | fixWouldChaseUnreliableTests exige que todo bloqueante sea source objective: si un juez repite los rojos como hallazgo propio, el auto-fix se lanza igual | arrastrado de kanai-mejoras-post-tao-191-r1/f4 |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| kanai-mejoras-post-tao-191-r1/f1 | S1 | server/dispatch/jobs.ts:167 | El tope de tokens tambien corta a los adaptadores que reportan el uso al final: un auto-fix de Claude o Codex ya completo queda failed y no se re-gatea | re-chequeo: corregido |
| kanai-mejoras-post-tao-191-r1/f2 | S2 | server/dispatch/gateChecksConsistency.ts:41 | Sin baseline de tests, una contradiccion que persiste no se decide por los nombres: el gate usa el conteo de consola mientras la nota dice que mandan los nombres | re-chequeo: corregido |
| kanai-mejoras-post-tao-191-r1/f3 | S3 | docs/configuration.md:174 | La doc de KANAI_GATE_FIX_MAX_TOKENS no aclara que con Claude/Codex una corrida que pasa el tope queda fallida | re-chequeo: corregido |
| kanai-mejoras-post-tao-191-r2/f1 | S2 | server/dispatch/gateChecksConsistency.ts:31 | namesRule borra la marca de corrida contradictoria cuando los checks vienen del fallback, y el auto-fix vuelve a perseguir tests no confiables | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
