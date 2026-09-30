---
plan_id: kanai-llm-ergonomia-escapes-2026-09-30
created: 2026-09-30T21:48:24.696Z
updated: 2026-09-30T21:49:26.658Z
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
| r2 | 2026-09-30T22:24:00Z | 8b93b6a | aprobable_con_nits | 0 / 0 / 0 / 1 / 0 | 8/8 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| r2/f3 | S3 | maintainability | tests/unit/spanish-neutral.test.ts:49 | Las formas sin tilde del test de voseo coinciden con el preterito en primera persona escrito sin tilde | arrastrado de r1/f3 |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| r1/f1 | S2 | server/dispatch/sessionReslicePlanner.ts:43 | Quedo voseo sin tilde en prompts y skills (decidis, ceñite, escribis, incluis, abris) y el test endurecido no lo ve | re-chequeo: corregido |
| r1/f2 | S2 | docs/auditoria.md:27 | docs/auditoria.md dice que el resto de los eventos tiene actor fijo; record_*, kb_doc_*, kb_file_*, relation_* e integrity_drift van sin actor | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

| id | decision | sobre | motivo | fecha |
| --- | --- | --- | --- | --- |
| d1 | no se corrige | r2/f3 | El dev decide dejar las formas sin tilde en el test de voseo: atrapan voseo real, y el falso positivo con el preterito se resuelve escribiendo la tilde. | 2026-09-30T21:53:24.422Z |
| d2 | desvio aceptado | r1/c1 | El dev confirma que "explícame el flujo", con o sin tilde, va a la intencion teach. | 2026-09-30T21:53:25.650Z |
| d3 | corregido (manual) | r1/c2 | El dev pidio unificar el nombre a Agent; aplicado en instructions.ts, kn-execute-task, kn-refine y plan-migracion-subagentes. | 2026-09-30T21:53:26.650Z |
