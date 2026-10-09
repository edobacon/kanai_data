---
plan_id: taomangalam-tao-198-pipeline-catalogos
created: 2026-10-09T18:18:04.171Z
updated: 2026-10-09T18:20:54.629Z
tags:
  projects:
    - taomangalam
  repos:
    - taomangalam
  tickets:
    - TAO-198
  branches:
    - feat/GH-71-hu-02-04-historia-pipeline
  folders: []
  labels:
    - EP-02
    - HU-02-04
---

# Arbiter: taomangalam-tao-198-pipeline-catalogos

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| r1-tao198 | 2026-10-09T19:25:00Z | 04138338e92d6e89f3d75866d4e69dde83893e8a | aprobable_con_reservas | 0 / 0 / 1 / 3 / 0 | 16/16 completos, 0 sin leer |
| r2-tao198 | 2026-10-09T20:10:00Z | 107aa9493620968c99448066a0a415f3583845aa | aprobable_con_nits | 0 / 0 / 0 / 4 / 0 | 1/1 completos, 0 sin leer |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| r2-tao198/f1 | S3 | maintainability | app/test/catalogos/cargador_catalogo_resultados_test.dart:175 | El control de version soportada solo asserta el tipo del error y el error real no viene del cuerpo declarado ilegible |  |
| r2-tao198/f2 | S3 | correctness | app/lib/catalogos/cargador_catalogo_resultados.dart:83 | El cargador no comprueba por si mismo los invariantes que el README le atribuye (12 casas, 8 anillos, Casa 12 solo closure y sin regression) | arrastrado de r1-tao198/f2 |
| r2-tao198/f3 | S3 | breaking_change | scripts/catalog_common.py:192 | --check de build_result_catalog.py pasa de comparar normalizando saltos de linea a comparar byte a byte | arrastrado de r1-tao198/f3 |
| r2-tao198/f4 | S3 | maintainability | tests/test_result_catalog_schema.py:1814 | Dos pruebas de test_result_catalog_schema.py son tautologicas o solo miran la forma del fuente | arrastrado de r1-tao198/f4 |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| r1-tao198/f1 | S2 | app/test/catalogos/cargador_catalogo_resultados_test.dart:859 | Ninguna prueba Dart fija que schemaVersion se valide antes de mapear; la prueba de no devuelve ningun catalogo es tautologica | re-chequeo: corregido |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

Ninguno.

## Decisiones del dev

Ninguna.
