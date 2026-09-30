---
plan_id: kanai-cobertura-revision-2026-09-30
created: 2026-09-30T21:12:43.271Z
updated: 2026-09-30T21:17:52.650Z
tags:
  projects:
    - kanai
  repos:
    - kanai-app
  tickets: []
  branches:
    - setup
  folders:
    - server/review
    - server/arbiter
    - skills/claude/arbiter
    - skills/claude/kn-dredd
  labels:
    - cobertura-revision
    - review-scope
    - lotes
---

# Arbiter: kanai-cobertura-revision-2026-09-30

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| r1 | 2026-09-30T21:10:00Z | b25c8f5 | iterar | 0 / 0 / 3 / 5 / 0 | 37/37 completos, 0 sin leer |
| r2 | 2026-09-30T21:40:00Z | 6f2a888 | aprobable_con_nits | 0 / 0 / 0 / 1 / 0 | 8/8 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| r2/f1 | S3 | correctness | server/mcp/reviewTools.ts:32 | openFindingsByRepo agrupa por clave de repo: una corrida legacy sin repo queda como ultima de la clave null |  |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| r1/f1 | S2 | server/review/scope.ts:136 | review_scope solo valida que el head anterior exista, no que sea ancestro: tras rebase o force-push el delta trae cambios de la base sin warning | re-chequeo: corregido |
| r1/f2 | S2 | server/mcp/reviewTools.ts:1 | El handler de review_scope no lo ejercita ningun test (hallazgos abiertos del plan, ledger externo, aviso de repo sin marcas, presupuesto y flags) | re-chequeo: corregido |
| r1/f3 | S2 | docs/arbiter.md:117 | docs/arbiter.md dice que los borrados se declaran en excluded; el codigo los descarta antes | re-chequeo: corregido |
| r1/f4 | S3 | server/mcp/reviewTools.ts:16 | sets.open toma solo la ultima corrida y deja abiertos los accepted | re-chequeo: corregido |
| r1/f5 | S3 | server/review/git.ts:138 | Un binario sin trackear en el working tree entra a los lotes | re-chequeo: corregido |
| r1/f6 | S3 | skills/claude/arbiter/SKILL.md:245 | Paso 7: 'el peor entre las corridas del repo' deberia decir 'de los repos' | re-chequeo: corregido |
| r1/f7 | S3 | docs/plan/implementacion/plan-cobertura-revision.md:113 | La tabla de decisiones del plan sigue con D1 y D2 abiertas | re-chequeo: corregido |
| r1/f8 | S3 | docs/plan/implementacion/plan-cobertura-revision.md:233 | El plan dice que un resumen nuevo anula el waiver de kn-dredd; solo lo anula uno de una ronda posterior | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
