---
plan_id: kanai-planes-inline-2026-10-01
created: 2026-10-01T14:37:08.241Z
updated: 2026-10-01T15:17:02.335Z
tags:
  projects:
    - kanai_self
  repos:
    - kanai-app
  tickets: []
  branches:
    - setup
  folders:
    - server/inlinePlan
    - server/mcp
  labels:
    - planes-inline
---

# Arbiter: kanai-planes-inline-2026-10-01

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| r1-kanai-app | 2026-10-01T11:50:00-03:00 | 0cd11a0 | iterar | 0 / 1 / 4 / 3 / 1 | 29/29 completos, 0 sin leer |
| r2-kanai-app | 2026-10-01T12:30:00-03:00 | 12aff62 | aprobable_con_reservas | 0 / 0 / 1 / 2 / 1 | 2/20 completos, 0 sin leer |
| r3-kanai-app | 2026-10-01T12:55:00-03:00 | 1b9ccd8 | iterar | 0 / 0 / 3 / 7 / 1 | 17/18 completos, 0 sin leer |
| r4-kanai-app | 2026-10-01T13:10:00-03:00 | 5bacb8b | aprobable_con_nits | 0 / 0 / 0 / 2 / 1 | 11/11 completos, 0 sin leer |
| r5-kanai-app | 2026-10-01T13:25:00-03:00 | 9b0529c | aprobable_con_nits | 0 / 0 / 0 / 1 / 1 | 5/6 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| r5-kanai-app/r5-f1 | S3 | maintainability | server/inlinePlan/advance.ts:79 | El JSDoc de JudgeBrief quedo huerfano sobre DevExecution |  |
| r5-kanai-app/b1-f6 | consulta | intent_gap | server/inlinePlan/advance.ts:38 | El veredicto del juez final y los criterios manuales los puede registrar el mismo LLM sin juez ni dev | arrastrado de r4-kanai-app/b1-f6 |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| r1-kanai-app/b1-f1 | S1 | server/inlinePlan/state.ts:46 | Un not_met sin ref (o con ref a un requisito previo) no se puede resolver nunca y la fase no cierra mas | re-chequeo: corregido |
| r1-kanai-app/b1-f2 | S2 | server/inlinePlan/import.ts:101 | El importador descarta sin avisar lineas bajo rotulos desconocidos y mete en la meta tareas sin rotulo Tareas | re-chequeo: corregido |
| r1-kanai-app/b2-f1 | S2 | docs/mcp-catalogo.md:210 | El catalogo MCP generado lista las 7 tools inline_plan_* bajo Tickets y sus 7 filas dicen lo mismo | re-chequeo: corregido |
| r1-kanai-app/b2-f2 | S2 | docs/planes-inline.md:102 | La doc dice que se rechaza una ejecucion con comando distinto del plan, pero task_done no recibe command | re-chequeo: corregido |
| r1-kanai-app/b2-f3 | S2 | docs/plan/implementacion/plan-planes-inline.md:64 | El plan afirma que el lint exige rollback (es aviso), que entregar incluye commits, y que close devuelve dev_actions | re-chequeo: corregido |
| r1-kanai-app/b1-f3 | S3 | server/inlinePlan/service.ts:206 | La enmienda no vuelve a chequear proyectos registrados ni la pertenencia de las refs a su fase | re-chequeo: corregido |
| r1-kanai-app/b1-f4 | S3 | server/inlinePlan/service.ts:166 | El flujo per_phase se decide comparando el prefijo del mensaje 'la fase necesita veredicto' | re-chequeo: corregido |
| r1-kanai-app/b1-f5 | S3 | server/data/localConfig.ts:259 | setInlinePlanRepoPath no tiene consumidores | re-chequeo: corregido |
| r2-kanai-app/r2-f1 | S2 | tests/unit/inline-plan-service.test.ts:171 | Ningun test verifica que repo_paths se guarde: el caso valido solo comprueba que no lanza error | re-chequeo: corregido |
| r2-kanai-app/r2-f2 | S3 | scripts/docs-catalog.mts:50 | El comentario de firstSentence quedo arriba de SHARED_PREFIXES | re-chequeo: corregido |
| r2-kanai-app/r2-f3 | S3 | docs/planes-inline.md:158 | El parrafo 'Limite de confianza' parte en dos la lista de modos del juez | re-chequeo: corregido |
| r3-kanai-app/r3-b1-f1 | S2 | server/inlinePlan/next.ts:86 | Despues de un iterar del juez final, la correccion que sugiere next_step no se puede registrar y el brief nuevo no la muestra | re-chequeo: corregido |
| r3-kanai-app/r3-b2-f1 | S2 | docs/plan/implementacion/plan-planes-inline.md:213 | Fase 5 dice que el brief del juez incluye las tareas, pero el brief solo trae criterios, commits y pendientes | re-chequeo: corregido |
| r3-kanai-app/r3-b2-f2 | S2 | docs/plan/implementacion/plan-planes-inline.md:119 | El plan dice que el servidor exige un resumen de salida con numeros, y el codigo solo exige que no este vacio | re-chequeo: corregido |
| r3-kanai-app/r3-b1-f2 | S3 | server/inlinePlan/advance.ts:112 | buildJudgeBrief copia a mano la lista de veredictos en vez de usar JUDGE_VERDICTS | re-chequeo: corregido |
| r3-kanai-app/r3-b1-f3 | S3 | server/inlinePlan/types.ts:10 | El actor import se acepta al registrar pero nada lo produce, y la ficha de la tool dice llm\|dev | re-chequeo: corregido |
| r3-kanai-app/r3-b1-f4 | S3 | server/inlinePlan/render.ts:37 | Formato de ejecucion del dev duplicado para tareas y criterios en la vista | re-chequeo: corregido |
| r3-kanai-app/r3-b2-f3 | S3 | docs/plan/implementacion/plan-planes-inline.md:190 | Fase 6 dice que las tools se registran como ARBITER_TOOLS | re-chequeo: corregido |
| r3-kanai-app/r3-b2-f4 | S3 | docs/plan/implementacion/plan-planes-inline.md:171 | Fase 2 habla de 8 reglas del registro y la lista tiene 9 | re-chequeo: corregido |
| r3-kanai-app/r3-b2-f5 | S3 | docs/plan/implementacion/plan-planes-inline.md:204 | Fase 6 describe un test sobre las salidas de next_action; el test real revisa el codigo fuente | re-chequeo: corregido |
| r4-kanai-app/r4-f1 | S3 | server/inlinePlan/advance.ts:110 | El brief del juez trae lo registrado de cada tarea pero no lo que ejecuto el dev, y JUDGE_INSTRUCTIONS no pide contrastar las tareas | re-chequeo: corregido |
| r4-kanai-app/r4-f2 | S3 | server/inlinePlan/next.ts:88 | El camino de correccion por fase agregada no figura en la ficha de inline_plan_amend ni en la cabecera de amend.ts | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
