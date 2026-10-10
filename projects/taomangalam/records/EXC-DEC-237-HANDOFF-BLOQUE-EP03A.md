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

Se importan en bloque a Kanai las historias de EP-03a (GH-88 a GH-102 y, tras el análisis de brecha, GH-164 y GH-165) para poder armar la épica nativa en Kanai, que exige que los tickets existan. Es una sola épica en un solo lote.

## Mapeo vigente (actualizado el 2026-10-10 tras el análisis de brecha)

Historia · issue de GitHub · ticket vigente · estado:

- HU-03a-09 · GH-88 · TAO-217 · descartado (cubierto por TAO-191; el issue sigue cerrado)
- HU-03a-06 · GH-89 · TAO-218 · descartado (cubierto en main; issue cerrado con comentario de trazabilidad)
- HU-03a-02 · GH-90 · TAO-234 · reemplaza a TAO-219 (alcance residual: siembra de configuración y vigencias)
- HU-03a-10 · GH-91 · TAO-235 · reemplaza a TAO-220 (alcance residual)
- HU-03a-01 · GH-92 · TAO-221 · sin cambios (spike, tipo implement porque exige prueba de concepto en código)
- HU-03a-14 · GH-93 · TAO-222 · sin cambios (contenido, fuera del lote de ejecución de Kanai)
- HU-03a-15 · GH-94 · TAO-223 · sin cambios (contenido, fuera del lote de ejecución de Kanai)
- HU-03a-07 · GH-95 · TAO-236 · reemplaza a TAO-224 (alcance residual)
- HU-03a-03 · GH-96 · TAO-237 · reemplaza a TAO-225 (alcance residual)
- HU-03a-11 · GH-97 · TAO-238 · reemplaza a TAO-226 (alcance residual)
- HU-03a-08 · GH-98 · TAO-239 · reemplaza a TAO-227 (alcance residual)
- HU-03a-04 · GH-99 · TAO-240 · reemplaza a TAO-228 (alcance reducido a lo no construido)
- HU-03a-05 · GH-100 · TAO-241 · reemplaza a TAO-229 (parte A: línea base HTTP)
- HU-03a-12 · GH-101 · TAO-242 · reemplaza a TAO-230 (alcance residual)
- HU-03a-13 · GH-102 · TAO-243 · reemplaza a TAO-231 (alcance residual)
- HU-03a-16 · GH-164 · TAO-232 · nuevo (parte B de HU-03a-05: límite persistente del alta)
- HU-03a-17 · GH-165 · TAO-233 · nuevo (parte C de HU-03a-05: integridad; bloqueado por GH-92)

Cada ticket conserva el ID documental en el título, GH-<n> como referencia externa, la URL canónica en el cuerpo, módulo EP-03a, tipo implement y los puntos publicados como estimación externa. Los tickets reemplazados (TAO-219, 220, 224 a 231) quedaron descartados con la observación del ticket que los sustituye y sus dependencias originales.

## Dependencias entre tickets vigentes

- TAO-241 depende de TAO-234 (mecanismo de siembra de claves de configuración).
- TAO-232 depende de TAO-234 y TAO-241.
- TAO-233 depende de TAO-232 y de GH-92 (spike de integridad, aún no ejecutado).
- Las demás historias residuales son independientes entre sí; las menciones a consumidores de otras épicas (HU-15-03, HU-15-04, HU-15-06, HU-04-05) son informativas.
- Dependencias originales de cada ticket reemplazado: consultar la observación de su descarte.

## Particularidades

- El análisis de brecha del 2026-10-10 mostró que gran parte de EP-03a ya está en main por las preparaciones de EP-01 (TAO-190 a TAO-193). Los cuerpos nuevos declaran qué está entregado y piden solo lo residual. Se corrió la suite del servidor en local contra PostgreSQL: 230 pruebas verdes, sin saltos; un archivo (idempotencia) falló solo en su limpieza por permisos del rol local, problema del entorno.
- Kanai no permite reescribir el pedido original de un ticket (DET-3), por eso los cuerpos se actualizaron descartando y recreando los tickets.
- HU-03a-14 y HU-03a-15 (textos legales) y HU-03a-01 (spike con dispositivos y cuentas de terceros) requieren trabajo humano externo y quedan fuera del lote de ejecución de Kanai salvo que se decida otra cosa.

## Consecuencias / riesgo

- Se asume el costo que DEC-237 busca evitar: dos colas operativas con estados que pueden divergir. GitHub sigue siendo la fuente del estado hasta que cada ticket entre en ejecución.
- El intake, las sondas y el spec se hacen por ticket al ejecutarlo; esta decisión no preescribe sesiones, tareas, tier ni estimación interna.
- Cambios ya aplicados antes de importar: se quitó la dependencia de HU-06-01 en GH-96 y GH-101 (la base Drift v3 ya contiene preferencia_local y registro_legal_pendiente), y GH-92 pasó a tipo implement.

## Pendiente

- Si la práctica se repite (EP-00 y EP-03a), corresponde enmendar DEC-237 en el repo taomangalam y no solo dejar el registro en Kanai.
