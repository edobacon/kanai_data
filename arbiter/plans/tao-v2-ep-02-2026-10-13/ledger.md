---
plan_id: tao-v2-ep-02-2026-10-13
created: 2026-10-13T04:27:36.893Z
updated: 2026-10-13T11:15:56.591Z
tags:
  projects:
    - tao-v2
  repos:
    - tao-v2
  tickets:
    - TV2-003
    - TV2-065
    - TV2-004
    - TV2-005
    - TV2-006
  branches:
    - epic/EP-02
  folders:
    - scripts/dev
    - server/src
    - server/test/scope
    - server/prisma
    - docs/development
    - server/src/capacidades
    - server/src/routes
  labels:
    - EP-02
    - revision-final-epica
    - ronda-cierre
---

# Arbiter: tao-v2-ep-02-2026-10-13

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| tao-v2-ep-02-r1 | 2026-10-13T04:40:00.000Z | 6607fa5c26ab5285e2da2b0729401f6f6dc3b275 | iterar | 0 / 0 / 6 / 9 / 0 | 123/138 completos, 0 sin leer |
| tao-v2-ep-02-r2 | 2026-10-13T05:25:00.000Z | ee960da2087ef8ed4b1db2924ce643620f5a880b | iterar | 0 / 0 / 2 / 8 / 0 | 28/31 completos, 0 sin leer |
| tao-v2-ep-02-r3 | 2026-10-13T11:45:00.000Z | 9f74ac3cd7629ee7f82ff56cb49d1a974b1e592e | aprobable_con_nits | 0 / 0 / 0 / 3 / 0 | 17/17 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| tao-v2-ep-02-r3/g1 | S3 | correctness | scripts/dev/backend-verify.mjs:168-180 | backend:verify borra el reporte de Vitest viejo pero no el de cierre verify.json de la corrida anterior; la asercion de la prueba nueva es siempre verdadera |  |
| tao-v2-ep-02-r3/g2 | S3 | maintainability | server/src/test/device/alta-version-cliente.test.ts:45,276-284 | El test del alta dice verificar que no agrega ni reescribe migraciones, pero la asercion de prefijo no lo detecta |  |
| tao-v2-ep-02-r3/f7 | S3 | security | server/src/dispositivos/alta-version-cliente.ts:159 | POST /devices con un codigo ajeno nuevo crea un dispositivo sin credencial y el arranque posterior queda en 401 | arrastrado de tao-v2-ep-02-r2/f7 |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

| id | decision | sobre | motivo | fecha |
| --- | --- | --- | --- | --- |
| d1 | desvio aceptado | tao-v2-ep-02-r3/f7 | Decisión del dev 2026-10-13: es el comportamiento que pide el ticket TV2-006; se deja registrado como desvío aceptado. | 2026-10-13T11:57:02.477Z |
