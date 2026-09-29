---
plan_id: TICKET-149-whole_ticket
created: 2026-09-23T22:54:25.234Z
updated: 2026-09-23T23:12:59.473Z
tags:
  projects:
    - up1
  repos:
    - curriculum-mapping
  tickets:
    - TICKET-149
    - UPONE-1770
  branches:
    - feat/UPONE-1770-tributacion-peso-del-eje-1
  folders:
    - logic/
    - modsComponents/CompetencyAlignmentGrid/
    - tests/
  labels:
    - tributacion
---

# Arbiter: TICKET-149-whole_ticket

> Generado desde las corridas y las decisiones. No se edita a mano: las decisiones se registran con arbiter_record_decision.

## Corridas

| corrida | fecha | head | veredicto | S0 / S1 / S2 / S3 / consulta | cobertura |
| --- | --- | --- | --- | --- | --- |
| a149w01 | 2026-09-23T16:50:00 | c61029f | iterar | 0 / 0 / 3 / 4 / 1 | - |
| a149w02 | 2026-09-23T19:28:00 | 3aca36f | aprobable_con_reservas | 0 / 0 / 1 / 3 / 1 | - |

## Abiertos (ultima corrida)

| hallazgo | sev | kind | donde | titulo | nota |
| --- | --- | --- | --- | --- | --- |
| a149w02/f1 | S2 | correctness | modsComponents/CompetencyAlignmentGrid/weights.ts:167 | isAutomaticDistribution depende del orden |  |
| a149w02/f2 | S3 | error_handling | modsComponents/CompetencyAlignmentGrid/CompetencyAlignmentGridElement.vue:1392 | loadView post-guardado fallido deja borrador con altas ya persistidas |  |
| a149w02/f3 | S3 | correctness | modsComponents/CompetencyAlignmentGrid/CompetencyAlignmentGridTable.ts:1233 | Varias visible con solo modify |  |
| a149w02/f4 | S3 | security | logic/competencyAlignment-batch.resolver.js:427-464 | lectura y validacion antes de RBAC; no-op sin capability |  |
| a149w02/f5 | consulta | correctness | modsComponents/CompetencyAlignmentGrid/CompetencyAlignmentGridElement.vue:977 | selector de nivel con catalogo completo en Agregar competencias |  |

## Corregidos

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| a149w01/f1 | S2 | logic/competencyAlignment-batch.resolver.js:302-311,441 | upsert de conjunto conserva peso al pasar a Develops sin la clave | desaparecio y su archivo cambio |
| a149w01/f2 | S2 | tests/unit/competencyAlignmentBatch.test.js | sin tests del batch para reglas de peso (REQ-03/04) | desaparecio y su archivo cambio |
| a149w01/f3 | S2 | logic/competencyAlignment-batch.resolver.js:290-320 | fila persistida invalidada bloquea todo el guardado | desaparecio y su archivo cambio |

## Dejados de reportar sin cambio en el codigo (variacion del juez)

| hallazgo | sev | donde | titulo | evidencia |
| --- | --- | --- | --- | --- |
| a149w01/f6 | S3 | modsComponents/CompetencyAlignmentGrid/MatrixMeshView.ts:93 | comentarios obsoletos de guardado per-field | desaparecio sin que su archivo cambiara (variacion del juez) |
| a149w01/f7 | S3 | logic/competencyAlignment-bulkApply.resolver.js:154 | catch convierte error de infra en salto por regla | desaparecio sin que su archivo cambiara (variacion del juez) |

## Decisiones del dev

| id | decision | sobre | motivo | fecha |
| --- | --- | --- | --- | --- |
| d1 | desvio aceptado | REQ-01 (R-1..R-5/R-10 corridas por fila dentro del batch) | Una fila persistida que llega sin cambios no se re-valida: el guardado solo responde por lo que escribe. Asi una tributacion que el contexto dejo invalida (asignatura fuera del plan, competencia que ahora consolida, nivel no declarado) no bloquea guardar el resto de la matriz; si se edita, si se valida. Implementado en curriculum-mapping 3aca36f (fix f3 de la corrida a149w01) y documentado en docs/reference/competencyalignment-object.md seccion 4.1. | 2026-09-23T22:57:41.587Z |
