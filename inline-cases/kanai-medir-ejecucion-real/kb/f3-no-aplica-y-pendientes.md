# F3 sin ajustes y pendientes detectados por las corridas

Fecha: 2026-10-06. Decision del dev (opcion A): F3 queda "No aplica". Motivo: ninguna de las corridas de KT-017, KT-018 y KT-019 confirmo un defecto de los cambios medidos (commits 19f1623 a 12c18ca de feat/medir-ejecucion-real); la observacion de las citas del juez fuera del diff (pendiente 2) queda SIN CONFIRMAR y no se descarta como efecto del nuevo armado del diff del N3; corregir el planificador o el juez ampliaria el alcance del caso. Evidencia: medidas-kt-017.md, medidas-kt-018.md y medidas-kt-019.md. Los pendientes de abajo no se corrigen en este caso.

## Pendientes detectados

| # | Pendiente | Qué se vio | Causa conocida | Cómo investigarlo | Estado |
|---|---|---|---|---|---|
| 1 | Contrato del planificador contra la lista de casos | KT-017: los dos jueces del gate N2 de la sesion 1 notaron 5 tests en vez de 6. KT-018: el N3 ronda 1 escalo porque faltaba el test de null y undefined que exigia la lista de casos. | La tarea de tests fijaba "exactamente 6 tests" y la lista de casos del mismo spec pedia 7 casos. La contradiccion la genera el planificador al materializar el plan. | Revisar el prompt o la validacion del planificador: que el contrato de la tarea derive de la lista de casos o que el juez de spec marque la contradiccion. Un test que reproduzca con un pedido de N tests y N+1 casos. | Preexistente (del planificador); corregido en la corrida |
| 2 | Citas del juez fuera del diff | N3 de KT-018 ronda 1: el juez 2 cito lineas de normalized-count.mjs y de su test que el chequeo de evidencia no encontro en el codigo recibido. No se repitio en 3 rondas N3 posteriores. | Sin explicar: los runs no guardan el codigo entregado al juez; no se descarta el nuevo armado del diff del N3 ni la variabilidad del juez. | Guardar en el run el texto del codigo que recibe cada juez del N3, reproducir con la rama de KT-018 en el commit 0b03491 mas el commit de la sesion 2 y comparar contra las citas. | Sin confirmar, no descartado |
| 3 | Limpieza de comentarios con reescritura identica | KT-017: la propuesta de kn-cleaner "reescribe" el comentario de normalize.mjs:1 con el mismo texto que ya tiene. | Sin investigar. | Reproducir con ese archivo y mirar el clasificador de redundantes de la limpieza. | Preexistente probable, sin confirmar |
| 4 | Auto-fix con tope de tokens | No se disparo ningun auto-fix en las 3 corridas, asi que el tope y la clasificacion del corte como bloqueado quedaron sin medir. | Las corridas no produjeron un rebote que activara el auto-fix. | Forzar en KT un ticket cuyo gate de sesion rebote con un defecto real y medir los tokens del auto-fix. | Cobertura no medida, no es un defecto |

## Hallazgos del armado de las pruebas (no son defectos de los cambios)

- words.mjs y words.test.mjs no existian en epic/KT-ACUM cuando se planifico KT-017; el spec los cito porque el repo estaba parado en la rama de KT-016.
- El reporte de ejecucion de KT-017 se envio sin tokens de los subagentes y Kanai no permite agregarlos despues; en KT-018 y KT-019 se pasaron con tokensOut.
- La enmienda de F3 (changes_code de true a false) borro por error las etiquetas del plan; se restauraron con otra enmienda el mismo dia.
