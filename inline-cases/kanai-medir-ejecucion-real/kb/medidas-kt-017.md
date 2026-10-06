# Medidas reales de KT-017

Fecha: 2026-10-06 (UTC). Proyecto kanai_test, rama acumuladora epic/KT-ACUM, MCP reiniciado con feat/medir-ejecucion-real (12c18ca). Teach de entrada omitido por decision del dev. Ticket implement, 2 sesiones, 4 tareas, 4 REQs. Modelos: planificacion claude-opus-5; jueces claude-sonnet-5; subagentes sonnet.

## Cifras (fuente: get_execution_summary y get_runs de Kanai, salvo lo indicado)

| Etapa | Tokens (entrada/salida) | Sandbox |
|---|---|---|
| Planificacion | 56.742 / 3.084 | n/a |
| Juez de spec | 21.934 / 2.183 | n/a |
| Gate N2 sesion 1 | 40.515 / 11.046 | corrio: 5 pass, 0 fail, cobertura 100% |
| Gate N2 sesion 2 | 58.496 / 4.817 | omitido por diseno: "verificacion real omitida: gate auto sin cambios de codigo" (la sesion solo toco el README) |
| Gate N3 integral | 40.440 / 17.283 | corrio: 5 pass, 0 fail, cobertura 100% |

- Gates de sesion: 3 (2 N2 y 1 N3); el sandbox corrio en 2 y se omitio en 1 por diseno, al no haber cambios de codigo en la sesion.
- Total registrado por Kanai: 256.540 tokens en 9 ejecuciones.
- Subagentes de desarrollo (2): 80.252 y 76.952 tokens segun la notificacion del host (30 s y 26 s, solo verificables por esa notificacion). Los runs de Kanai no los traen: el total real ronda 414k. El reporte de ejecucion no incluyo tokens (omision de quien reporto, ver limites).
- Rondas del N3: 1 (aprobado, 2 jueces, sin hallazgos). Rebotes de gates de sesion: 0.
- Tokens por gate: entre 51,6k y 63,3k, muy por debajo de la meta de 1M.
- Hallazgos por diff heredado: no aplica, KT-017 es el primer ticket de la rama acumuladora; se mide en KT-018.

## Observaciones

1. El sandbox corre. El gate N2 de la sesion 2 lo omite por diseno y con causa distinta de la de TAO-192: aqui el mensaje dice que no hubo cambios de codigo en la sesion (solo documentacion), no que no se detectaron cambios en la rama.
2. Los dos jueces del N2 de la sesion 1 senalaron como nota menor que el test tiene 5 bloques y no los 6 que pedia la tarea (agrupa dos pares de casos). Es la misma inconsistencia de contrato entre la tarea y la lista de casos que despues produjo el hueco real del N3 de KT-018.
3. Armado del escenario: words.mjs y words.test.mjs no existen en epic/KT-ACUM (solo en la rama de KT-016); el spec los cito porque el repo estaba parado en esa rama al planificar. Un caso de regresion quedo como hueco declarado. No es un hallazgo de los cambios medidos.
4. Limpieza de comentarios: propone "reescribir" un comentario con el mismo texto que ya tiene (normalize.mjs:1). Posible ruido del propio kn-cleaner, a revisar aparte.
5. Cobertura de REQs al pasar a listo para cerrar: ningun caso en pass (advisory), porque la promocion a verificado ocurre al cerrar.

## Limites

- No hay corrida de control con el codigo viejo: se compara contra las metas y la linea base de TAO.
- Un solo ticket chico: no demuestra el comportamiento con 14 REQs ni con rondas de hallazgos reales.
- Los tokens de los subagentes de este ticket los saco de la notificacion del host, no de Kanai.
