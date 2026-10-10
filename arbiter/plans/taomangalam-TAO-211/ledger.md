---
plan_id: taomangalam-TAO-211
created: 2026-10-10T20:57:29.677Z
updated: 2026-10-10T21:17:17.571Z
tags:
  projects:
    - taomangalam
  repos:
    - taomangalam
  tickets:
    - TAO-211
  branches:
    - epic/EP-02
  folders:
    - app/lib/core/assets
    - app/test/core/assets
    - docs/product/tecnologia
  labels:
    - EP-02
    - HU-02-15
---

# Arbiter: taomangalam-TAO-211

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| taomangalam-TAO-211-r1 | 2026-10-10T21:20:00.000Z | 287c8ea | iterar | 0 / 0 / 5 / 5 / 0 | 37/39 completos, 0 sin leer |
| taomangalam-TAO-211-r2 | 2026-10-10T22:20:00.000Z | worktree | aprobable_con_nits | 0 / 0 / 0 / 3 / 0 | 20/44 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| taomangalam-TAO-211-r2/f1 | S3 | correctness | app/lib/core/assets/cache/cache_eviction_policy.dart:139 | La reserva en vuelo puede contarse dos veces para la reserva de espacio libre (cota conservadora) |  |
| taomangalam-TAO-211-r2/f2 | S3 | maintainability | app/lib/core/assets/cache/cache_eviction_policy.dart:100 | EvictionBlocked.fallback vive en lib y solo lo consultan las pruebas | arrastrado de taomangalam-TAO-211-r1/f8 |
| taomangalam-TAO-211-r2/f3 | S3 | dependency | app/pubspec.yaml:101 | widgetbook/pubspec.lock no incluye disk_space_2 (desfase preexistente) | arrastrado de taomangalam-TAO-211-r1/f10 |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
