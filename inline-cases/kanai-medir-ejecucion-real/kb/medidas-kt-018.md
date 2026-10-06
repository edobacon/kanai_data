# Medidas reales de KT-018 y tabla de F1

Fecha: 2026-10-06 (UTC). Proyecto kanai_test, rama acumuladora epic/KT-ACUM, mismo MCP con feat/medir-ejecucion-real (12c18ca). KT-018 depende de KT-017, que ya estaba integrado en la rama antes de empezar. Teach omitido por decision del dev. Ticket implement, 2 sesiones, 4 tareas, 5 REQs.

## Cifras de KT-018 (fuente: get_execution_summary y get_runs, entrada/salida)

| Etapa | Tokens | Sandbox |
|---|---|---|
| Planificacion | 76.949 / 4.409 = 81.358 | n/a |
| Juez de spec | 23.414 / 5.621 = 29.035 | n/a |
| Gate N2 sesion 1 | 41.451 / 5.922 = 47.373 | corrio: 11 pass, 0 fail, cobertura 100% |
| Gate N2 sesion 2 | 39.188 / 4.688 = 43.876 | omitido por diseno: sesion solo de documentacion (sin cambios de codigo) |
| Gate N3 ronda 1 | 63.216 / 18.902 = 82.118 | corrio: 11 pass; veredicto escalate |
| Gate N3 ronda 2 | 41.700 / 12.880 = 54.580 | corrio: 12 pass, 0 fail, cobertura 100%; veredicto approve |
| Subagentes de desarrollo (2) | 79.676 y 77.102 = 156.778 | n/a |

- Total registrado por Kanai: 495.118 tokens en 10 ejecuciones; ya incluye los subagentes porque esta vez se pasaron al reportar (en KT-017 no se pasaron).
- Peor gate: 82.118 tokens, contra la meta de 1M y el peor gate de TAO-192 de 6,35M.

## Diff del gate integral

- Contra la base general (main): 5 archivos, 117 lineas (incluye normalize.mjs, normalize.test.mjs y la seccion del README de KT-017).
- Contra el padre del primer commit de KT-018 (la base nueva): 3 archivos, 63 lineas (solo normalized-count.mjs, su test y su seccion del README).
- Ningun juez marco como alcance no pedido el trabajo de KT-017 en ninguna de las 2 rondas del N3 de KT-018, ni en el N3 de KT-017.

## Hallazgos del N3 ronda 1

1. Hueco real: el caso de test pedia que countNormalizedWords(null) y (undefined) lancen TypeError y no habia test para eso. Causa: el contrato de la tarea de tests fijaba exactamente 6 tests y la lista de casos del mismo spec exigia ese caso (inconsistencia del plan, no del codigo). Se corrigio agregando un test (12 tests pasando) y el N3 de la ronda 2 aprobo sin hallazgos.
2. "El juez aprobo sin evidencia verificable en el diff (citas fuera del diff: normalized-count.mjs:3, :6, :8, :10 y normalized-count.test.mjs:5)": el juez 2 cito lineas que el chequeo de evidencia no encontro en el codigo que recibio. No se repitio en la ronda 2 y no se pudo explicar con las salidas de Kanai (los runs no guardan el codigo entregado al juez). Queda sin explicar; no se descarta un efecto del nuevo armado del diff del N3, ni que sea variabilidad del juez.

## Tabla de F1 contra las metas (KT-017 y KT-018 juntos)

| Meta | Resultado | Estado |
|---|---|---|
| Sandbox corre en cada gate | Corrio en 5 de 7 gates de sesion; los 2 restantes son sesiones de solo documentacion omitidas por diseno con la causa explicita "sin cambios de codigo" | Cumplida para todo gate cuya sesion cambio codigo; el literal "todos los gates" no se cumple en las 2 sesiones sin codigo |
| Hallazgos por diff heredado | 0 en los 3 N3 que corrieron (KT-017 ronda 1; KT-018 rondas 1 y 2); el diff de KT-018 paso de 5 a 3 archivos | Sin evidencia en contra, con un solo caso de dependencia por commits propios y una observacion de citas sin explicar |
| Rondas del N3 | KT-017: 1. KT-018: 2 | Cumplida (2 o menos) |
| Tokens por gate | Maximo 82.118 | Cumplida (menos de 1M) |
| Auto-fix cortado por tope como bloqueado | No se disparo ningun auto-fix | No medida |

Tokens totales: KT-017 ~414k (256.540 de Kanai + 157.204 de subagentes que no se pasaron) y KT-018 495.118. Total de la serie ~909k.

## Limites

- Sin corrida de control con el codigo viejo, un solo escenario chico y gates de sonnet; no demuestra el comportamiento con 14 REQs.
- La tecnica de diff solo se probo con una dependencia integrada por commits propios del ticket anterior en la misma rama; no con dependencias integradas por merge o squash.
- La correccion del hueco (test de null y undefined) la hizo el agente principal, no un subagente de desarrollo, porque era una edicion de 5 lineas; no esta incluida en los tokens de subagentes.
