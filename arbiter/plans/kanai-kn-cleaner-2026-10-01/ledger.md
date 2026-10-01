---
plan_id: kanai-kn-cleaner-2026-10-01
created: 2026-10-01T14:18:57.016Z
updated: 2026-10-01T14:27:58.679Z
tags:
  projects:
    - kanai
  repos:
    - kanai-app
  tickets: []
  branches:
    - setup
  folders:
    - skills/claude/kn-cleaner
    - server/dispatch
    - docs
  labels:
    - kn-cleaner
    - internal-ids
    - brief
---

# Arbiter: kanai-kn-cleaner-2026-10-01

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| kanai-kn-cleaner-2026-10-01-r1-kanai-app | 2026-10-01T11:19:00-03:00 | worktree | iterar | 0 / 0 / 2 / 1 / 1 | 9/9 completos, 0 sin leer |
| kanai-kn-cleaner-2026-10-01-r2-kanai-app | 2026-10-01T11:24:00-03:00 | worktree | aprobable_con_reservas | 0 / 0 / 1 / 1 / 1 | 6/10 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| kanai-kn-cleaner-2026-10-01-r2-kanai-app/f1 | S2 | maintainability | docs/kn-cleaner.md:51 | Se afirma que kn-dredd juzga los mismos ids que el gate, pero la fase de kn-dredd no lista REQ-, TC-, TC-REQ- ni S<n>.T<n> |  |
| kanai-kn-cleaner-2026-10-01-r2-kanai-app/f2 | S3 | maintainability | server/dispatch/internalIds.ts:13 | El comentario del regex del gate omite que tambien cubre familias que kn-dredd no lista |  |
| kanai-kn-cleaner-2026-10-01-r2-kanai-app/f4 | consulta | intent_gap | skills/claude/kn-cleaner/SKILL.md:13 | La description de la skill invita a que el host la dispare sola al terminar la ejecucion | arrastrado de kanai-kn-cleaner-2026-10-01-r1-kanai-app/f4 |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
