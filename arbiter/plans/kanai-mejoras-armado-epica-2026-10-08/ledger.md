---
plan_id: kanai-mejoras-armado-epica-2026-10-08
created: 2026-10-08T20:12:05.977Z
updated: 2026-10-08T20:41:25.772Z
tags:
  projects: []
  repos:
    - kanai-app
  tickets: []
  branches: []
  folders: []
  labels:
    - mejoras-armado-epica
---

# Arbiter: kanai-mejoras-armado-epica-2026-10-08

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| r1-kanai-app | 2026-10-08T20:12:00Z | 5d8937f81ca74b7f4bbfe4ad2a35a9984c1eb127 | iterar | 0 / 1 / 3 / 5 / 1 | 15/18 completos, 0 sin leer |
| r2-kanai-app | 2026-10-08T20:30:00Z | 9eedda3d610489459d38837e05f17a3a56830c97 | iterar | 0 / 1 / 1 / 2 / 1 | 11/21 completos, 0 sin leer |
| r3-kanai-app | 2026-10-08T20:52:00Z | c4e8d460dd346c26df96498149617aaf6bb890a5 | iterar | 0 / 1 / 2 / 2 / 0 | 3/21 completos, 0 sin leer |
| r4-kanai-app | 2026-10-08T21:12:00Z | 1d82044c3dbf5e0c7d702c9a6a31c891dd731dbd | iterar | 0 / 1 / 0 / 2 / 1 | 2/21 completos, 0 sin leer |
| r5-kanai-app | 2026-10-08T21:32:00Z | f5440ceaba78a8f675c9a38a8f2e10f083ff30d2 | iterar | 0 / 1 / 1 / 2 / 0 | 2/21 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| r5-kanai-app/j1 | S1 | correctness | server/dataModel/detect.ts:302 | Si una negación va seguida de un cambio real en el mismo tramo sin coma ni conjunción el cambio se pierde ('Sin migrar datos se elimina la columna oil de items') |  |
| r5-kanai-app/j2 | S2 | correctness | server/dataModel/detect.ts:294 | El corte genérico deja activos los tramos que niegan con tampoco, jamás, ni siquiera |  |
| r5-kanai-app/i2 | S3 | correctness | server/dataModel/detect.ts | La raíz de los verbos de cambio también atrapa sustantivos ('y copias', 'y asignaciones') | arrastrado de r4-kanai-app/i2 |
| r5-kanai-app/i4 | S3 | correctness | server/dataModel/detect.ts:82 | 'esta creada y asignada' ya no frena, trade-off deliberado para no marcar 'ya están creadas en X' | arrastrado de r4-kanai-app/i4 |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
