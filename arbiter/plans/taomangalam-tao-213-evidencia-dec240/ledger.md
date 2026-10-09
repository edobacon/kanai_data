---
plan_id: taomangalam-tao-213-evidencia-dec240
created: 2026-10-09T17:11:25.928Z
updated: 2026-10-09T17:11:25.928Z
tags:
  projects:
    - taomangalam
  repos:
    - taomangalam
  tickets:
    - TAO-213
  branches:
    - feat/GH-69-hu-02-01-seguimiento-completar
  folders: []
  labels:
    - EP-02
    - DEC-240
---

# Arbiter: taomangalam-tao-213-evidencia-dec240

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| r1-tao213 | 2026-10-09T17:30:00Z | 0e80e00362bb4cbace001607687ff51bb5d900d3 | aprobable_con_nits | 0 / 0 / 0 / 0 / 2 | 4/4 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| r1-tao213/f1 | consulta | intent_gap | docs/product/decisiones/DEC-240-origen-y-presupuesto-de-assets-sobre-railway.md:159 | La fecha de la medicion remota (2026-10-09) no esta respaldada de forma explicita por el contexto |  |
| r1-tao213/f2 | consulta | maintainability | tests/test_assets_origin.py:150 | test_medicion_remota_no_fabricada sigue exigiendo marcas de bloqueo pendiente y evidencia faltante |  |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
