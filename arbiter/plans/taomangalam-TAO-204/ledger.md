---
plan_id: taomangalam-TAO-204
created: 2026-10-09T21:21:27.993Z
updated: 2026-10-09T22:27:53.709Z
tags:
  projects:
    - taomangalam
  repos:
    - taomangalam
  tickets:
    - TAO-204
  branches:
    - feat/GH-77-hu-02-09-historia-descarga
  folders: []
  labels: []
---

# Arbiter: taomangalam-TAO-204

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| r1-tao204 | 2026-10-09T21:30:00Z | worktree | iterar | 0 / 0 / 2 / 4 / 1 | 21/22 completos, 1 sin leer |
| r2-tao204 | 2026-10-09T22:20:00Z | 3bf56a5 | iterar | 0 / 0 / 5 / 1 / 2 | 10/11 completos, 0 sin leer |
| r3-tao204 | 2026-10-09T23:05:00Z | 2a8bd38 | iterar | 0 / 0 / 2 / 1 / 2 | 10/10 completos, 0 sin leer |
| r4-tao204 | 2026-10-09T23:50:00Z | 46351bc | aprobable_con_reservas | 0 / 0 / 1 / 0 / 2 | 16/20 completos, 0 sin leer |
| r5-tao204 | 2026-10-10T00:25:00Z | da1e445 | aprobable_con_reservas | 0 / 0 / 1 / 0 / 3 | 6/6 completos, 0 sin leer |
| r6-tao204 | 2026-10-10T00:55:00Z | d8042ef | aprobable_con_nits | 0 / 0 / 0 / 1 / 3 | 3/3 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| r6-tao204/f1 | S3 | maintainability | app/lib/design_system/molecules/README.md:59 | README de moleculas no lista ResolvedDownloading entre los tipos sellados de ResolvedImage |  |
| r6-tao204/f2 | consulta | correctness | app/lib/core/assets/downloadable_asset_manager.dart:434-439 | Con el indice sin escritura, la entrada anterior queda sin limpiar si el hash cambia en una sesion posterior (modo degradado entre sesiones) | arrastrado de r5-tao204/f2 |
| r6-tao204/f3 | consulta | intent_gap | app/lib/core/assets/download_metrics.dart:10 | La adenda 3 dice una vez por pedido; hashMismatch cuenta una vez por descarga compartida | arrastrado de r5-tao204/f3 |
| r6-tao204/f4 | consulta | intent_gap | app/lib/core/images/downloadable_image.dart:26 | El camino descargable siempre pide y dibuja el derivado 1x; los 2.0x y 3.0x nunca se piden | arrastrado de r5-tao204/f4 |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
