---
plan_id: epicas-archivar-modificar
created: 2026-10-07T01:31:24.272Z
updated: 2026-10-07T01:44:59.077Z
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
| epicas-archivar-modificar-r2 | 2026-10-06T22:44:00.000Z | 9f79fcf52858972aadd87c148e18b1e43854e28a | iterar | 0 / 0 / 2 / 0 / 1 | 8/18 completos, 0 sin leer |
| epicas-archivar-modificar-r3 | 2026-10-06T22:53:00.000Z | 8860a5be4a1ca3d9c8fb48cb916a3713670349ec | aprobable_con_nits | 0 / 0 / 0 / 2 / 1 | 1/18 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| epicas-archivar-modificar-r3/f1 | S3 | maintainability | tests/unit/epic-archive-operations.test.ts:11 | StaleFirstReadStore depende del orden exacto de lecturas y no verifica que el mutate haya leido |  |
| epicas-archivar-modificar-r3/f2 | S3 | maintainability | tests/unit/epic-archive-operations.test.ts:89 | El test del mensaje de corrida viva fija un literal largo |  |
| epicas-archivar-modificar-r3/f5 | consulta | intent_gap | server/epics/ticketsEdit.ts:39 | Una epica no iniciada con todos sus tickets abiertos no se puede archivar sin cerrar o descartar uno | arrastrado de epicas-archivar-modificar-r2/f5 |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| epicas-archivar-modificar-r1/f1 | S2 | skills/claude/kn-epic/SKILL.md:42 | La doc y la skill dicen que basta pausar o cancelar para archivar, pero una corrida pausada tambien bloquea archive | re-chequeo: corregido |
| epicas-archivar-modificar-r1/f2 | S3 | server/epics/archive.ts:41 | El rechazo de archive sugiere remove_tickets para tickets de hitos de preparacion que remove_tickets no acepta | re-chequeo: corregido |
| epicas-archivar-modificar-r1/f3 | S3 | server/epics/archive.ts:60 | archiveEpic valida corrida y archivado fuera del mutate y no los re-chequea al escribir | re-chequeo: corregido |
| epicas-archivar-modificar-r2/f1 | S2 | tests/unit/epic-archive-operations.test.ts:68 | El test del mensaje de cancelar primero tambien pasa con el mensaje viejo, asi que no fija el fix | re-chequeo: corregido |
| epicas-archivar-modificar-r2/f2 | S2 | server/epics/archive.ts:75 | La revalidacion dentro del mutate de archive no tiene test | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
