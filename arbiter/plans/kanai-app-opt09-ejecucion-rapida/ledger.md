---
plan_id: kanai-app-opt09-ejecucion-rapida
created: 2026-09-24T23:19:54.630Z
updated: 2026-09-24T23:48:29.209Z
tags:
  projects:
    - kanai
  repos:
    - kanai-app
  tickets: []
  branches:
    - feat/opt-09-ejecucion-rapida
  folders:
    - server/dispatch
    - server/repo
    - server/mcp
  labels:
    - opt-09
---

# Arbiter: kanai-app-opt09-ejecucion-rapida

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| opt09-r1 | 2026-09-24T20:22:00-03:00 | 075e0250b286ed876b8bc47b4d4bd18b242a8dee | iterar | 0 / 0 / 3 / 3 / 0 | 35/57 completos, 15 sin leer |
| opt09-r2 | 2026-09-24T21:25:00-03:00 | e3fc9c5 | iterar | 0 / 0 / 2 / 3 / 0 | 60/61 completos, 1 sin leer |
| opt09-r3 | 2026-09-24T21:55:00-03:00 | 1e313f7 | aprobable_con_nits | 0 / 0 / 0 / 6 / 0 | 46/61 completos, 13 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| opt09-r3/n1 | S3 | correctness | server/dispatch/planPostProcess.ts:60 | La re-planificacion compacta descarta tokens y costo del primer plan en la telemetria |  |
| opt09-r3/n2 | S3 | error_handling | server/dispatch/planPostProcess.ts:56 | Si falla la re-planificacion compacta se pierde el primer plan y aborta plan_ticket |  |
| opt09-r3/n3 | S3 | maintainability | server/mcp/server.ts:146 | El comentario de READONLY_TOOLS dice que las lecturas no generan tool_call |  |
| opt09-r3/n4 | S3 | correctness | server/repo/ticketTier.ts:42 | Tickets viejos cuyo tier estimo sessionSizing cuentan como tier fijado a mano |  |
| opt09-r3/n5 | S3 | correctness | server/dispatch/citationCheck.ts:69 | Un hueco de cita declarado en una tarea anterior no cuenta en la ultima tarea |  |
| opt09-r3/n6 | S3 | correctness | server/repo/postCloseAmendments.ts:88 | El registro post-cierre no es atomico ante una falla de insert a mitad del grupo |  |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| opt09-r1/f1 | S2 | server/dispatch/checksCache.ts:33 | La cache de verificacion ignora relatedFiles pero coverageLines depende de el | re-chequeo: corregido |
| opt09-r1/f2 | S2 | server/dispatch/planTicket.ts:174 | El tier 'explicito' es el estimado persistido: en re-plan tope/via rapida usan tier viejo y techo usa el nuevo | re-chequeo: corregido |
| opt09-r1/f3 | S2 | server/dispatch/specReview.ts:63 | La revision del delta aprueba sin LLM aunque haya adendas posteriores a la aprobacion | re-chequeo: corregido |
| opt09-r1/f4 | S3 | server/repo/postCloseAmendments.ts:52 | La enmienda post-cierre no es atomica: validate no revisa los casos de prueba | re-chequeo: corregido |
| opt09-r1/f5 | S3 | server/dispatch/postCloseVerify.ts:24 | verify:true mezcla evidencia declarada y verificada bajo 'verificada por Kanai' | re-chequeo: corregido |
| opt09-r1/f6 | S3 | server/mcp/tools.ts:3375 | record_post_close_amendment corre verify antes de validar que los tickets esten cerrados | re-chequeo: corregido |
| opt09-r2/c1 | S2 | server/dispatch/checksCache.ts:44 | La cache de verificacion guarda corridas fallidas con una clave que ignora el entorno y el gate no puede forzar | re-chequeo: corregido |
| opt09-r2/c2 | S2 | server/dispatch/citationCheck.ts:59 | La exigencia de citas pide casos de REQs que se completan en una sesion posterior | re-chequeo: corregido |
| opt09-r2/c3 | S3 | server/dispatch/preLevel.ts:190 | Con la nivelacion estructural el triage a tactic pierde el freno de palabras pesadas | re-chequeo: corregido |
| opt09-r2/c4 | S3 | docs/configuration.md:87 | La doc dice que cada recorte por tope de casos queda como decision pero en enmiendas no se registra | re-chequeo: corregido |
| opt09-r2/c5 | S3 | server/repo/audit.ts:74 | avg/p95 por tool mezcla lecturas lentas (registradas solo sobre el umbral) con mutadoras | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
