---
plan_id: verificaciones-pospuestas-2026-10-07
created: 2026-10-07T23:15:25.857Z
updated: 2026-10-07T23:15:25.857Z
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
    - verificaciones-pospuestas
    - human_deferred
---

# Arbiter: verificaciones-pospuestas-2026-10-07

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| vp-2026-10-07-r1 | 2026-10-07T23:40:00Z | 33c77992680dbcbb4d867ec9210a7bace3fa6ca9 | iterar | 0 / 4 / 0 / 9 / 2 | 33/39 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| vp-2026-10-07-r1/f1 | S1 | correctness | server/dispatch/humanChecks.ts:39 | La bandeja descarta sesiones con executor pw aunque tengan items pospuestos |  |
| vp-2026-10-07-r1/f2 | S1 | intent_gap | server/dispatch/verification.ts:106 | El smoke de Playwright da por pasados los items requiresHuman |  |
| vp-2026-10-07-r1/f3 | S1 | intent_gap | server/repo/planning.ts:68 | Ningun camino automatico declara requiresHuman ni la ficha de la tool lo documenta |  |
| vp-2026-10-07-r1/f4 | S1 | maintainability | server/mcp/tools.ts:836 | Sin tests de la confirmacion humana deferVerification ni de lote.post.ts |  |
| vp-2026-10-07-r1/f5 | S3 | correctness | server/api/verificaciones/lote.post.ts:28 | La web marca deferRequestedByDev en todo pospuesto, tambien en items requiresHuman |  |
| vp-2026-10-07-r1/f6 | S3 | security | server/mcp/tools.ts:948 | report_verification_batch registra la autorizacion solo en el ticket del primer item |  |
| vp-2026-10-07-r1/f7 | S3 | correctness | app/pages/verificaciones.vue:76 | verificaciones.vue no recarga las marcas al cambiar de proyecto |  |
| vp-2026-10-07-r1/f8 | S3 | correctness | app/pages/verificaciones.vue:143 | Un error por item conserva las marcas de toda la sesion, incluidas las registradas |  |
| vp-2026-10-07-r1/f9 | S3 | correctness | server/dispatch/gateSpecial.ts:49 | Escrituras no atomicas del detalle de verificacion |  |
| vp-2026-10-07-r1/f10 | S3 | performance | server/dispatch/humanChecks.ts:41 | listHumanChecks relee todas las epicas por sesion y una epica ilegible tumba la bandeja y el badge |  |
| vp-2026-10-07-r1/f11 | S3 | maintainability | server/epics/policy.ts:19 | activeEpicPolicy().verification ignora la politica human_deferred persistida del ticket |  |
| vp-2026-10-07-r1/f12 | S3 | maintainability | server/dispatch/gateSpecial.ts:90 | Los hallazgos del gate no incluyen el motivo de los pospuestos |  |
| vp-2026-10-07-r1/f13 | S3 | maintainability | docs/verificaciones-pospuestas.md:51 | La doc dice que la bandeja no incluye sesiones abiertas pero si incluye sus pospuestos |  |
| vp-2026-10-07-r1/f14 | consulta | correctness | server/epics/policy.ts:65 | Precedencia ticket vs epica: la mas permisiva gana |  |
| vp-2026-10-07-r1/f15 | consulta | intent_gap | server/engine/verificationDetail.ts:58 | Bajo human_deferred un item automatizable pospuesto tampoco bloquea |  |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
