---
plan_id: epicas-archivar-modificar
created: 2026-10-07T01:31:24.272Z
updated: 2026-10-07T01:31:24.272Z
tags:
  projects:
    - kanai
  repos:
    - kanai-app
  tickets: []
  branches: []
  folders: []
  labels:
    - epicas
    - archive
---

# Arbiter: epicas-archivar-modificar

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| epicas-archivar-modificar-r1 | 2026-10-06T22:33:00.000Z | 6cc9a625167aa8e8c71c17db531695b745072ad3 | aprobable_con_reservas | 0 / 0 / 1 / 2 / 2 | 12/17 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| epicas-archivar-modificar-r1/f1 | S2 | maintainability | skills/claude/kn-epic/SKILL.md:42 | La doc y la skill dicen que basta pausar o cancelar para archivar, pero una corrida pausada tambien bloquea archive |  |
| epicas-archivar-modificar-r1/f2 | S3 | correctness | server/epics/archive.ts:41 | El rechazo de archive sugiere remove_tickets para tickets de hitos de preparacion que remove_tickets no acepta |  |
| epicas-archivar-modificar-r1/f3 | S3 | correctness | server/epics/archive.ts:60 | archiveEpic valida corrida y archivado fuera del mutate y no los re-chequea al escribir |  |
| epicas-archivar-modificar-r1/f4 | consulta | maintainability | docs/development/epic-execution.md:433 | add_tickets o remove_tickets sobre una epica entregada dejan su corrida integrated como cancelled en history |  |
| epicas-archivar-modificar-r1/f5 | consulta | intent_gap | server/epics/ticketsEdit.ts:39 | Una epica no iniciada con todos sus tickets abiertos no se puede archivar sin cerrar o descartar uno |  |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
