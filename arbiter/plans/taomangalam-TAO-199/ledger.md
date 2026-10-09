---
plan_id: taomangalam-TAO-199
created: 2026-10-09T20:13:44.734Z
updated: 2026-10-09T23:19:45.837Z
tags:
  projects:
    - taomangalam
  repos:
    - taomangalam
  tickets:
    - TAO-199
  branches: []
  folders: []
  labels: []
---

# Arbiter: taomangalam-TAO-199

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| r1-tao199 | 2026-10-09T16:55:00Z | d264fc96a090ba184cc67669671ac799deecbc38 | iterar | 0 / 0 / 2 / 2 / 1 | 14/14 completos, 0 sin leer |
| r2-tao199 | 2026-10-10T01:40:00Z | 10923db | aprobable_con_nits | 0 / 0 / 0 / 2 / 2 | 5/5 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| r2-tao199/f1 | S3 | maintainability | scripts/build_house_catalog.py:164-185 | El filtro de no continuacion (is_body_heading) no reconoce variantes de encabezado que la propia prueba ya conoce, y ninguna prueba lo ejercita |  |
| r2-tao199/f2 | S3 | maintainability | app/lib/catalogos/cargador_catalogo_casas.dart:205 | La clase _Nodo del cargador de casas copia la del cargador de resultados | arrastrado de r1-tao199/f3 |
| r2-tao199/c1 | consulta | correctness | docs/content/catalogos/casas.v1.json | Restos de maquetacion de la fuente llegan al catalogo porque el registro editorial esta vacio (incluye house-09 dictum con ':' intermedio y house-10 quantumField sin punto entre frases) | arrastrado de r1-tao199/c1 |
| r2-tao199/c2 | consulta | intent_gap | docs/content/catalogos/casas.v1.json | Parrafo p1084 de la Casa 8 ('.' suelto tras Rhema mantra) y catalogVersion 1.0.0 sin subir |  |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
