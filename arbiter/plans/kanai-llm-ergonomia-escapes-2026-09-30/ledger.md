---
plan_id: kanai-llm-ergonomia-escapes-2026-09-30
created: 2026-09-30T21:48:24.696Z
updated: 2026-09-30T21:48:24.696Z
tags:
  projects:
    - kanai
  repos:
    - kanai-app
  tickets: []
  branches:
    - setup
  folders: []
  labels:
    - tanda-llm-ergonomia-integridad
    - escapes
    - espanol-neutro
---

# Arbiter: kanai-llm-ergonomia-escapes-2026-09-30

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| r1 | 2026-09-30T22:11:00Z | 536676e | iterar | 0 / 0 / 2 / 1 / 2 | 20/20 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| r1/f1 | S2 | intent_gap | server/dispatch/sessionReslicePlanner.ts:43 | Quedo voseo sin tilde en prompts y skills (decidis, ceñite, escribis, incluis, abris) y el test endurecido no lo ve |  |
| r1/f2 | S2 | maintainability | docs/auditoria.md:27 | docs/auditoria.md dice que el resto de los eventos tiene actor fijo; record_*, kb_doc_*, kb_file_*, relation_* e integrity_drift van sin actor |  |
| r1/f3 | S3 | maintainability | tests/unit/spanish-neutral.test.ts:49 | Las formas sin tilde del test de voseo coinciden con el preterito en primera persona escrito sin tilde |  |
| r1/c1 | consulta | correctness | server/llm/guide.ts:62 | 'explícame el flujo' con tilde pasa de consulta a teach |  |
| r1/c2 | consulta | maintainability | skills/claude/kn-refine/SKILL.md:36 | kn-refine nombra 'la herramienta Task'; kn-dredd y kn-detective-mode dicen 'Agent tool' |  |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
