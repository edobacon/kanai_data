---
id: EXC-DEC-237-HANDOFF-BLOQUE-EP03A
project: taomangalam
type: decision
module: EP-03a
tags:
  - EP-03a
  - DEC-237
  - handoff
---

## Contexto

DEC-237 ("GitHub como backlog y ejecución selectiva en Kanai") establece que una persona desarrolladora crea en Kanai solo el issue de GitHub que va a ejecutar, y que Kanai no mantiene una réplica anticipada del backlog. La publicación en GitHub admite como máximo una épica por lote.

## Decisión (excepción autorizada por el dev, 2026-10-10)

Se importan en bloque a Kanai las 15 historias de EP-03a (GH-88 a GH-102), tickets TAO-217 a TAO-231, para poder armar la épica nativa en Kanai, que exige que los tickets existan. Es una sola épica en un solo lote.

- GH-88 · HU-03a-09 · TAO-217
- GH-89 · HU-03a-06 · TAO-218
- GH-90 · HU-03a-02 · TAO-219
- GH-91 · HU-03a-10 · TAO-220
- GH-92 · HU-03a-01 · TAO-221 (spike; tipo de trabajo implement en lugar de explore, porque exige prueba de concepto en código)
- GH-93 · HU-03a-14 · TAO-222
- GH-94 · HU-03a-15 · TAO-223
- GH-95 · HU-03a-07 · TAO-224
- GH-96 · HU-03a-03 · TAO-225
- GH-97 · HU-03a-11 · TAO-226
- GH-98 · HU-03a-08 · TAO-227
- GH-99 · HU-03a-04 · TAO-228
- GH-100 · HU-03a-05 · TAO-229
- GH-101 · HU-03a-12 · TAO-230
- GH-102 · HU-03a-13 · TAO-231

Cada ticket conserva el ID documental en el título, GH-<n> como referencia externa, la URL canónica en el cuerpo, módulo EP-03a, tipo implement y los puntos publicados como estimación externa.

## Particularidad

GH-88 (HU-03a-09) ya está cerrada en GitHub y su trabajo lo cubrió TAO-191 (preparación de EP-01). Se importó por decisión del dev; TAO-217 debe resolverse al armar la épica (descartarlo o cerrarlo con la evidencia de TAO-191), sin ejecutarlo de nuevo.

## Consecuencias / riesgo

- Se asume el costo que DEC-237 busca evitar: dos colas operativas con estados que pueden divergir. GitHub sigue siendo la fuente del estado hasta que cada ticket entre en ejecución.
- El intake, las sondas y el spec se hacen por ticket al ejecutarlo; esta decisión no preescribe sesiones, tareas, tier ni estimación interna.
- Cambios ya aplicados antes de importar: se quitó la dependencia de HU-06-01 en GH-96 y GH-101 (la base Drift v3 ya contiene preferencia_local y registro_legal_pendiente), y GH-92 pasó a tipo implement.

## Pendiente

- Si la práctica se repite (EP-00 y EP-03a), corresponde enmendar DEC-237 en el repo taomangalam y no solo dejar el registro en Kanai.
