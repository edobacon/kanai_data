---
plan_id: kanai-casos-inline-2026-10-01
created: 2026-10-01T17:22:40.257Z
updated: 2026-10-01T17:37:50.233Z
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
    - casos-inline
---

# Arbiter: kanai-casos-inline-2026-10-01

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| r1-kanai-app | 2026-10-01T15:20:00-03:00 | a22f237 | iterar | 0 / 0 / 3 / 7 / 0 | 45/47 completos, 0 sin leer |
| r2-kanai-app | 2026-10-01T15:55:00-03:00 | 7880b24 | iterar | 0 / 0 / 3 / 2 / 0 | 21/22 completos, 0 sin leer |
| r3-kanai-app | 2026-10-01T16:12:00-03:00 | 743804f | aprobable_con_nits | 0 / 0 / 0 / 2 / 0 | 6/11 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| r3-kanai-app/r3-f1 | S3 | correctness | server/inlinePlan/caseKb.ts:59 | El titulo derivado rechaza documentos cuyo primer encabezado es 'Clave: ...', 'Token: ...' o 'Password: ...', con un mensaje que no sugiere pasar title |  |
| r3-kanai-app/r3-f2 | S3 | maintainability | server/mcp/inlineCaseTools.ts:135 | La ficha de inline_case_list repite el literal 'ilegible' en vez de interpolar UNREADABLE_CASE_STAGE |  |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| r1-kanai-app/b1-f1 | S2 | server/inlinePlan/caseView.ts:56 | La etapa cerrado dice que el juez final aprobo aunque el plan tenga judge off o per_phase | re-chequeo: corregido |
| r1-kanai-app/b1-f2 | S2 | server/inlinePlan/import.ts:4 | La cabecera de import.ts sigue diciendo que el original queda como contexto del plan | re-chequeo: corregido |
| r1-kanai-app/b2-f1 | S2 | docs/planes-inline.md:51 | La garantia de que ninguna tool de tickets ni guard nombra inline_case_* no tiene test, aunque el doc la atribuye a los tests | re-chequeo: corregido |
| r1-kanai-app/b1-f3 | S3 | server/inlinePlan/caseKb.ts:56 | El KB del caso no escanea credenciales en title, summary ni tags (solo en content) | re-chequeo: corregido |
| r1-kanai-app/b1-f4 | S3 | server/mcp/inlineCaseTools.ts:126 | inline_case_list falla entera si un caso tiene kb/index.json o plan.yaml corrupto; avisa por cada archivo suelto del area | re-chequeo: corregido |
| r1-kanai-app/b1-f5 | S3 | server/inlinePlan/caseIntake.ts:112 | Quitar una nota que no existe se ignora pero deja en case-log un evento 'notas: +0 -1' | re-chequeo: corregido |
| r1-kanai-app/b1-f6 | S3 | server/inlinePlan/caseState.ts:26 | caseState decide bloqueo vs aviso comparando el prefijo 'la rama de trabajo'; writeAtomic duplicado | re-chequeo: corregido |
| r1-kanai-app/b1-f7 | S3 | server/inlinePlan/planCreate.ts:94 | Al importar un plan se descartan los avisos de credencial sospechosa del plan-original.md | re-chequeo: corregido |
| r1-kanai-app/b2-f2 | S3 | docs/plan/implementacion/plan-casos-inline.md:141 | plan-casos-inline.md describe modulos que no existen, '7 tools' y un faltante de intake imposible | re-chequeo: corregido |
| r1-kanai-app/b2-f3 | S3 | tests/unit/inline-plan-create-case.test.ts:833 | Ningun test comprueba que dry_run con import_path no escribe en el KB ni en el caso | re-chequeo: corregido |
| r2-kanai-app/r2-f1 | S2 | server/mcp/inlineCaseTools.ts:78 | La ficha de inline_case_kb_add y las cabeceras de secrets.ts/caseKb.ts dicen que lo sospechoso del KB solo se avisa; en los metadatos se rechaza | re-chequeo: corregido |
| r2-kanai-app/r2-f2 | S2 | docs/plan/implementacion/plan-casos-inline.md:32 | La etapa cerrado se documenta como veredicto aprobatorio del juez final aunque cierra tambien con juez per_phase u off | re-chequeo: corregido |
| r2-kanai-app/r2-f3 | S2 | server/mcp/inlineCaseTools.ts:20 | El listado no tumbado por un caso roto (stageOf) no tiene test, y la etapa 'error' es un string magico que la ficha no menciona | re-chequeo: corregido |
| r2-kanai-app/r2-f4 | S3 | server/inlinePlan/caseKb.ts:57 | El titulo derivado del primer encabezado no pasa por la guarda de metadatos | re-chequeo: corregido |
| r2-kanai-app/r2-f5 | S3 | server/inlinePlan/caseStore.ts:19 | CASE_DIR_PATTERN duplica PLAN_ID_PATTERN y no excluye nombres con forma de ticket como listInlinePlans | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
