---
plan_id: taomangalam-TAO-199
created: 2026-10-09T20:13:44.734Z
updated: 2026-10-09T20:13:44.734Z
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

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| r1-tao199/f1 | S2 | correctness | scripts/build_house_catalog.py:164 | Campo cuantico y Dictamen truncados: los parrafos de continuacion de la fuente no llegan al catalogo |  |
| r1-tao199/f2 | S2 | maintainability | scripts/house_catalog_nodes.py:58 | La rama que aplica correcciones editoriales de casas no tiene prueba |  |
| r1-tao199/f3 | S3 | maintainability | app/lib/catalogos/cargador_catalogo_casas.dart:201 | La clase _Nodo del cargador de casas copia la del cargador de resultados |  |
| r1-tao199/f4 | S3 | correctness | scripts/build_house_catalog.py:177 | arrival_entries ordena un set solo por parrafo |  |
| r1-tao199/c1 | consulta | correctness | docs/content/catalogos/casas.v1.json | Restos de maquetacion de la fuente llegan al catalogo porque el registro editorial esta vacio |  |

## Corregidos

Ninguno.

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
