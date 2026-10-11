---
plan_id: mejoras-gates-epicas-2026-10-11
created: 2026-10-11T06:46:55.007Z
updated: 2026-10-11T07:00:54.960Z
tags:
  projects:
    - kanai_self
  repos:
    - kanai-app
  tickets: []
  branches:
    - feat/mejoras-gates-epicas
  folders: []
  labels:
    - mejoras-gates-epicas
---

# Arbiter: mejoras-gates-epicas-2026-10-11

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| mejoras-gates-epicas-2026-10-11-r1 | 2026-10-11T04:05:00-03:00 | de1713ae | iterar | 0 / 0 / 4 / 3 / 0 | 71/71 completos, 0 sin leer |
| mejoras-gates-epicas-2026-10-11-r2 | 2026-10-11T04:25:00-03:00 | 62976b6a | iterar | 0 / 0 / 2 / 2 / 1 | 15/15 completos, 0 sin leer |
| mejoras-gates-epicas-2026-10-11-r3 | 2026-10-11T04:45:00-03:00 | c8c9b1b0 | aprobable_con_nits | 0 / 0 / 0 / 2 / 0 | 3/3 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| mejoras-gates-epicas-2026-10-11-r3/f3 | S3 | performance | server/dispatch/gate.ts:599 | El N3 omitido por vacio no deja gate_run: integralPending sigue true y se reintenta en cada cierre | arrastrado de mejoras-gates-epicas-2026-10-11-r2/f3 |
| mejoras-gates-epicas-2026-10-11-r3/f5 | S3 | maintainability | server/repo/workflowConfig.ts:59-65 | El catch de humanCheckDueDays ante un config.yaml ilegible sigue sin cobertura real | arrastrado de mejoras-gates-epicas-2026-10-11-r2/f5 |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| mejoras-gates-epicas-2026-10-11-r1/f1 | S2 | server/dispatch/gateDecision.ts:118 | humanOnly reclasifica hallazgos de codigo como evidencia humana en cualquier gate de sesion | re-chequeo: corregido |
| mejoras-gates-epicas-2026-10-11-r1/f2 | S2 | server/dispatch/ciChecks.ts:262 | knownRed tapa por subcadena sin anclar, se declara sin confirmacion y el hallazgo de regresion sugiere declararlo | re-chequeo: corregido |
| mejoras-gates-epicas-2026-10-11-r1/f4 | S2 | docs/configuration.md:171 | KANAI_UNPUSHED_WARN_THRESHOLD no figura en docs/configuration.md | re-chequeo: corregido |
| mejoras-gates-epicas-2026-10-11-r1/f6 | S3 | server/repo/ticketReviewBase.ts:16-19 | reachableStartHead trata cualquier error de git como no es ancestro y el N3 termina como nota vacia reconocible por la epica | re-chequeo: corregido |
| mejoras-gates-epicas-2026-10-11-r1/f7 | S3 | tests/unit/epic-in-place-integral-ack.test.ts:1 | Cabeceras de tres tests citan Mejora 2, etiqueta interna que no existe en el repo | re-chequeo: corregido |
| mejoras-gates-epicas-2026-10-11-r2/n1 | S2 | server/dispatch/ciChecks.ts:77 | La validacion y el docstring de knownRed siguen describiendo patrones por fragmento y se acepta en silencio un fragmento que ya no tapa nada | re-chequeo: corregido |
| mejoras-gates-epicas-2026-10-11-r2/n2 | S2 | server/repo/ticketReviewBase.ts:19 | La clasificacion nueva de errores de git en reachableStartHead no tiene test para el commit inexistente ni para el relanzado | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
