---
plan_id: kanai-app-flujo-revision
created: 2026-09-24T01:34:35.256Z
updated: 2026-09-24T11:22:57.062Z
tags:
  projects: []
  repos:
    - kanai-app
  tickets: []
  branches:
    - setup
  folders:
    - server/engine/guards/
    - server/dispatch/
    - server/repo/
    - server/data/
    - shared/
    - app/
    - docs/
  labels:
    - flujo
    - gate
    - cierre
    - escala
    - revision-flujo
---

# Arbiter: kanai-app-flujo-revision

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| flujo01 | 2026-09-24T01:30:00 | 780c921 | iterar | 0 / 1 / 4 / 4 / 1 | 49/66 completos, 13 sin leer |
| flujo02 | 2026-09-24T02:25:00 | 9e2ddf6 | iterar | 0 / 1 / 2 / 2 / 1 | 63/71 completos, 1 sin leer |
| flujo03 | 2026-09-24T03:20:00 | 2d020b4 | aprobable_con_nits | 0 / 0 / 0 / 4 / 2 | 70/72 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| flujo03/f1 | S3 | migration | server/repo/gateRuns.ts:124 | migracion convierte un gate de ticket con jueces caidos en un N3 que tapa el approved |  |
| flujo03/f2 | S3 | maintainability | docs/motor.md:32 | motor.md dice que tactic esta exento de DET-20/38 |  |
| flujo03/f3 | S3 | maintainability | scripts/db-rebuild.mts:3 | db-rebuild dice que heal reaplica el estado |  |
| flujo03/f4 | consulta | correctness | server/engine/guards/closure.ts:52 | DET-33 agrupa los self-report viejos sin session= en un solo grupo |  |
| flujo03/f5 | consulta | correctness | server/dispatch/jobs.ts:109 | ocupacion de repo aplica a todo job con brief.cwd |  |
| flujo03/f6 | S3 | scope_creep | server/dispatch/gateOutcome.ts:110 | cambios fuera de la lista de fases | arrastrado de flujo02/f6 |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| flujo01/f1 | S1 | server/engine/guards/integral.ts:21 | integralAck desbloquea el cierre pero su motivo no se audita | re-chequeo: corregido |
| flujo01/f2 | S2 | app/pages/panel.vue:58 | cierres de la web no pueden pasar integralAck y panel traga el error | re-chequeo: corregido |
| flujo01/f3 | S2 | server/db/migrations/0046_dazzling_stature.sql:1 | gate_runs arranca vacia sin migrar el estado previo de decisions | re-chequeo: corregido |
| flujo01/f4 | S2 | server/engine/guards/session.ts:218 | ids de sesion reciclados heredan evidencia de gate y estado del log | re-chequeo: corregido |
| flujo01/f5 | S2 | server/dispatch/locks.ts:716 | lock huerfano con el mismo pid (worker recargado) no se detecta hasta el TTL | re-chequeo: corregido |
| flujo01/f6 | S3 | server/repo/planning.ts:366 | reslice reorganiza sesiones en iterate/standby/escalate | re-chequeo: corregido |
| flujo01/f7 | S3 | server/repo/planning.ts:342 | setReqKind y setTicketDeliverables sin guardStructuralChange | re-chequeo: corregido |
| flujo01/f8 | S3 | server/mcp/tools.ts:3214 | avisos de cierre solo por MCP | re-chequeo: corregido |
| flujo02/f1 | S1 | server/repo/gateRuns.ts:106 | migracion legacy pierde el veredicto del N3 (unknown) | re-chequeo: corregido |
| flujo02/f2 | S2 | server/repo/preGate.ts:388 | ticketBranchRanges usa develop para repos fuera de la propuesta, ignora defaultRef | re-chequeo: corregido |
| flujo02/f3 | S2 | server/dispatch/locks.ts:490 | reserva del gate y lock ignoran la staleness de jobs (OB3) | re-chequeo: corregido |
| flujo02/f4 | S3 | server/dispatch/locks.ts:459 | lock sin renovar y release borra el archivo sin verificar dueño | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
