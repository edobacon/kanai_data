---
plan_id: kanai-llm-ergonomia-integridad-2026-09-30
created: 2026-09-30T11:36:59.949Z
updated: 2026-09-30T11:57:06.126Z
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
---

# Arbiter: kanai-llm-ergonomia-integridad-2026-09-30

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| r1 | 2026-09-30T04:08:00Z | de3ad67919e9c1b30f9cadb5f3e8af7e3833eb04 | iterar | 0 / 0 / 2 / 4 / 1 | 44/216 completos, 164 sin leer |
| r2 | 2026-09-30T12:07:00Z | ed938bb | iterar | 0 / 0 / 2 / 4 / 0 | 31/31 completos, 0 sin leer |
| r3 | 2026-09-30T12:24:00Z | 2823d13 | aprobable_con_nits | 0 / 0 / 0 / 2 / 0 | 15/16 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| r3/f1 | S3 | maintainability | docs/mcp.md:17-19 | La tabla de perfiles de docs/mcp.md tiene desactualizados los caracteres de las descripciones |  |
| r3/c1 | S3 | intent_gap | server/llm/nextActionState.ts:133 | next_action propone approve_spec(confirm:true) como llamada ejecutable; en hosts sin elicitation un modelo que la sigue aprueba el spec 'sin confirmación' | arrastrado de r2/c1 |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| r1/f1 | S2 | server/repo/tickets.ts:184 | setTicketConfig persiste el cambio que apaga reglas antes de la auditoría 'obligatoria': si la auditoría falla, la regla queda apagada sin registro | re-chequeo: corregido |
| r1/f2 | S2 | server/dispatch/persist.ts:112 | El id del modelo se canoniza al ESCRIBIR el run (pérdida irreversible del id real), no solo al leer como afirman el plan y el doc de métricas | re-chequeo: corregido |
| r1/f3 | S3 | server/dispatch/subagentRuns.ts:40 | runToken sin validar su formato antes de armar la ruta del archivo persistido (path traversal en la lectura y el borrado) | re-chequeo: corregido |
| r1/f4 | S3 | scripts/mcp-host.sh:7 | mcp-host.sh preserva sobre .env solo KANAI_TOOL_PROFILE: el KANAI_INTEGRITY=strict que Gemini/Antigravity fijan en su entrada queda pisado si .env define KANAI_INTEGRITY | re-chequeo: corregido |
| r1/f5 | S3 | server/mcp/humanConfirm.ts:115 | La autorización humana queda registrada como otorgada aunque la acción posterior falle | re-chequeo: corregido |
| r1/f6 | S3 | docs/plan/implementacion/plan-llm-ergonomia-integridad.md:89 | El plan deja sin tildar la fase 0 y la fase 8, ya commiteadas | re-chequeo: corregido |
| r2/f1 | S2 | server/mcp/tools.ts:643 | La pasada a español neutro convirtió un pretérito de primera persona ('Abrí la sesión') en imperativo ('Abre la sesión') | re-chequeo: corregido |
| r2/f2 | S2 | tests/unit/judge-hardening-hosts.test.ts:150 | El test 'runToken con otro formato se rechaza sin tocar el disco' pasa igual sin el fix de TOKEN_FORMAT | re-chequeo: corregido |
| r2/f3 | S3 | server/mcp/tools.ts:1056 | Quedan formas de voseo en tools.ts y el test de regresión de idioma no las ve cuando van después de un escape \n | re-chequeo: corregido |
| r2/f4 | S3 | server/mcp/humanAuthTools.ts:45 | Si la acción autorizada lanza una excepción, no queda la marca 'not-applied'; y si falla el registro de 'not-applied', se pierde el resultado original | re-chequeo: corregido |
| r2/f5 | S3 | server/dispatch/subagentRuns.ts:117 | La detección de 'cerrado por otro proceso' también invalida un token válido ante un error de lectura, y hasActiveRunForTask no aplica esa detección | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

| id | decision | sobre | motivo | fecha |
| --- | --- | --- | --- | --- |
| d1 | corregido (manual) | r3/c1 | El dev decidió que la aprobación del spec y de los drafts sigue el nivel del ticket: en autónomo se autoaprueba (spec con el juez aprobado); en manual y per_session es explícita de la persona y, en un host sin confirmación, se bloquea y remite a la app de Kanai. next_action ya no propone approve_spec ejecutable fuera del autónomo. Commit 24edf75. | 2026-09-30T12:19:56.587Z |
