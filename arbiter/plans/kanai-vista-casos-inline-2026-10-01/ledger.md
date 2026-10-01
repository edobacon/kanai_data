---
plan_id: kanai-vista-casos-inline-2026-10-01
created: 2026-10-01T19:07:37.014Z
updated: 2026-10-01T19:07:37.014Z
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
    - server/api/inline-cases
    - app/pages/casos-inline
    - app/components
  labels:
    - casos-inline
    - vista-web
---

# Arbiter: kanai-vista-casos-inline-2026-10-01

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| r1-kanai-app | 2026-10-01T16:12:00-03:00 | 4a31ae0 | aprobable_con_nits | 0 / 0 / 0 / 1 / 0 | 35/35 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| r1-kanai-app/f1 | S3 | maintainability | docs/planes-inline.md:250 | La guia muestra el endpoint del KB con '#' literal en ?ref=doc.md#slug: el slug no llega al servidor y se devuelve el documento entero |  |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
