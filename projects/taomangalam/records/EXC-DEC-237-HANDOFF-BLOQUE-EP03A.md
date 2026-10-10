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

## Agrupación de historias (enmienda del 2026-10-10)

Para bajar el costo fijo por ticket (intake, plan, gates y verificación), el dev aprobó agrupar historias contiguas de la misma capa, módulo e hito en un solo ticket, con tope de 8 puntos. Los ids HU-xx-nn se conservan como secciones del cuerpo del issue anfitrión y los issues absorbidos se cerraron en GitHub como "absorbidos por #N". Un ticket de Kanai corresponde a un issue anfitrión. Quedan 6 tickets ejecutables más el de integridad (35 puntos en total, igual que antes).

## Mapeo vigente (2026-10-10, tras la agrupación)

Historias · issue anfitrión de GitHub · ticket vigente · estado:

- HU-03a-09 · GH-88 · TAO-217 · descartado (cubierto por TAO-191; el issue sigue cerrado)
- HU-03a-06 · GH-89 · TAO-218 · descartado (cubierto en main; issue cerrado con comentario de trazabilidad)
- E1: HU-03a-02 + HU-03a-07 · GH-90 · TAO-244 · 5 puntos (absorbe GH-95)
- E2: HU-03a-10 + HU-03a-11 · GH-91 · TAO-245 · 3 puntos (absorbe GH-97)
- HU-03a-01 · GH-92 · TAO-221 · sin cambios (spike, tipo implement porque exige prueba de concepto en código)
- HU-03a-14 · GH-93 · TAO-222 · sin cambios (contenido, fuera del lote de ejecución de Kanai)
- HU-03a-15 · GH-94 · TAO-223 · sin cambios (contenido, fuera del lote de ejecución de Kanai)
- E3: HU-03a-03 + HU-03a-04 · GH-96 · TAO-246 · 8 puntos (absorbe GH-99)
- E4: HU-03a-08 · GH-98 · TAO-239 · 3 puntos (sin cambios)
- E5: HU-03a-05 + HU-03a-16 · GH-100 · TAO-247 · 8 puntos (absorbe GH-164)
- E6: HU-03a-12 + HU-03a-13 · GH-101 · TAO-248 · 5 puntos (absorbe GH-102)
- HU-03a-17 · GH-165 · TAO-233 · 3 puntos (parte C de HU-03a-05: integridad; bloqueado por GH-92 y por E5)

Tickets descartados por la agrupación (con observación que nombra el reemplazo): TAO-232 (GH-164, absorbido por TAO-247), TAO-234 (reemplazado por TAO-244), TAO-235 (por TAO-245), TAO-236 (GH-95, absorbido por TAO-244), TAO-237 (por TAO-246), TAO-238 (GH-97, absorbido por TAO-245), TAO-240 (GH-99, absorbido por TAO-246), TAO-241 (por TAO-247), TAO-242 (por TAO-248), TAO-243 (GH-102, absorbido por TAO-248). Antes de esa agrupación ya estaban descartados TAO-219, 220 y 224 a 231.

Cada ticket vigente conserva los ids documentales en el título, GH-<n> del anfitrión como referencia externa, la URL canónica en el cuerpo, módulo EP-03a, tipo implement y los puntos publicados como estimación externa.

## Dependencias entre tickets vigentes

- TAO-247 (E5) depende de TAO-244 (E1: mecanismo de siembra de claves de configuración).
- TAO-233 depende de TAO-247 (E5) y de GH-92 (spike de integridad, aún no ejecutado).
- Las demás historias residuales son independientes entre sí; las menciones a consumidores de otras épicas (HU-15-03, HU-15-04, HU-15-06, HU-04-05) son informativas.
- Dependencias originales de cada ticket reemplazado: consultar la observación de su descarte.

## Particularidades

- El análisis de brecha del 2026-10-10 mostró que gran parte de EP-03a ya está en main por las preparaciones de EP-01 (TAO-190 a TAO-193). Los cuerpos declaran qué está entregado y piden solo lo residual. Se corrió la suite del servidor en local contra PostgreSQL: 230 pruebas verdes, sin saltos; un archivo (idempotencia) falló solo en su limpieza por permisos del rol local, problema del entorno.
- Kanai no permite reescribir el pedido original de un ticket (DET-3), por eso los cuerpos se actualizaron descartando y recreando los tickets.
- HU-03a-14 y HU-03a-15 (textos legales) y HU-03a-01 (spike con dispositivos y cuentas de terceros) requieren trabajo humano externo y quedan fuera del lote de ejecución de Kanai salvo que se decida otra cosa.
- La épica de Kanai aún no está armada; al armarla se preguntan rama de origen, rama de trabajo y CI.

## Consecuencias / riesgo

- Se asume el costo que DEC-237 busca evitar: dos colas operativas con estados que pueden divergir. GitHub sigue siendo la fuente del estado hasta que cada ticket entre en ejecución.
- El intake, las sondas y el spec se hacen por ticket al ejecutarlo; esta decisión no preescribe sesiones, tareas, tier ni estimación interna.
- Cambios ya aplicados antes de importar: se quitó la dependencia de HU-06-01 en GH-96 y GH-101 (la base Drift v3 ya contiene preferencia_local y registro_legal_pendiente), y GH-92 pasó a tipo implement.
- Riesgo de la agrupación: un ticket grande (8 puntos) concentra más riesgo en un intake. E3 trae una nota para dividirlo si el intake lo juzga excesivo.

## Pendiente

- La enmienda de DEC-237 (agrupación de historias) ya está en la rama docs/backlog-agrupacion del repo taomangalam, aún sin push ni PR.
