# Medidas reales de KT-019 y comparacion de F2

Fecha: 2026-10-06 (UTC). Proyecto kanai_test, rama acumuladora epic/KT-ACUM, mismo MCP con feat/medir-ejecucion-real (12c18ca). KT-019 depende de KT-017 y de KT-018, ambos ya integrados en la rama antes de empezar. Teach omitido por decision del dev. Ticket implement, 2 sesiones, 4 tareas, 4 REQs. Reemplaza, por decision del dev (F2 acotada), la reproduccion del diff completo de TAO-192.

## Cifras de KT-019 (fuente: get_execution_summary y get_runs, entrada/salida)

| Etapa | Tokens | Sandbox |
|---|---|---|
| Planificacion | 57.370 / 4.878 = 62.248 | n/a |
| Juez de spec | 23.329 / 4.999 = 28.328 | n/a |
| Gate N2 sesion 1 | 41.462 / 5.938 = 47.400 | corrio: 19 pass, 0 fail, cobertura 100% |
| Gate N2 sesion 2 | 39.198 / 4.692 = 43.890 | omitido por diseno: sesion solo de documentacion (sin cambios de codigo) |
| Gate N3 integral (1 ronda) | 42.066 / 9.514 = 51.580 | corrio: 19 pass, 0 fail, cobertura 100%; veredicto approve |
| Subagentes de desarrollo (2) | 80.059 y 78.099 = 158.158 (solo salida, el total del subagente) | n/a |

- Total registrado por Kanai: 391.604 tokens en 9 ejecuciones (1 plan, 4 gates incluido el juez de spec y 4 subagentes), con los subagentes incluidos porque se pasaron al reportar.
- Rondas del N3: 1, aprobado por los 2 jueces. El juez 1 dejo una nota de mantenibilidad en text-report.mjs:8 (countNormalizedWords(text) vuelve a normalizar el texto crudo); es lo que el propio spec prescribia, no un hallazgo del cambio medido.
- Peor gate: 51.580 tokens.

## Diff del gate integral

- Contra la base general (main): 7 archivos, 178 lineas (incluye normalize, normalized-count y sus tests, text-report y su test, y las tres secciones del README).
- Contra el padre del primer commit de KT-019 (la base nueva): 3 archivos, 61 lineas (text-report.mjs, su test y su seccion del README).
- Reduccion: de 7 a 3 archivos (-57%) y de 178 a 61 lineas (-66%); excluye el trabajo de dos tickets anteriores, no solo de uno.
- Ningun juez marco como alcance no pedido el trabajo de KT-017 ni de KT-018.

## Comparacion con TAO-192

Fuentes de las cifras de TAO-192: punto-de-partida.md (14 REQs, 61 casos, 27,4M tokens, peor gate 6,35M, scope heredado en 5 de 7 rondas del N3, sandbox siempre "NO corrio") y el analisis de metricas de TAO-192 del 2026-10-06 hecho con get_execution_summary y get_runs de Kanai, de donde salen los datos que no estan en punto-de-partida.md: 4 sesiones, gates de 0,19M a 0,45M en rondas normales y la secuencia de rondas del N3. get_runs devuelve como maximo 50 de los 76 runs de TAO-192.

| Senal | TAO-192 | KT-019 | Nota |
|---|---|---|---|
| Rondas del N3 | 5 iterate seguidos y 1 approve (6 rondas visibles, inferidas de los runs que devuelve get_runs) | 1 (approve) | Escala distinta: 14 REQs y 4 sesiones contra 4 REQs y 2 sesiones |
| Tokens por gate N3 | 0,19M a 0,45M en rondas normales y 6,35M en la peor | 51.580 | El contexto de TAO-192 es 188 archivos; el de KT-019 es 3 |
| Scope heredado repetido | 5 de 7 rondas del N3 | 0 de 4 rondas N3 de la serie KT (KT-017: 1, KT-018: 2, KT-019: 1) | Comparable de forma directa: el mismo tipo de dependencia integrada en una rama acumuladora; no prueba causalidad por la escala sintetica |
| Sandbox | siempre "NO corrio" | corrio en todo gate cuya sesion cambio codigo; omitido por diseno en las sesiones de solo documentacion | Mensaje distinto: sin cambios de codigo, no sin cambios detectables; la meta "en cada gate" queda parcial |
| Hallazgos reales por ronda | un bug distinto en cada ronda | KT-018 ronda 1: un hueco de test por contradiccion del plan; KT-017 y KT-019: ninguno | No comparable: el codigo sintetico es trivial |

## Serie completa (KT-017, KT-018, KT-019)

- Tokens: KT-017 ~414k (256.540 de Kanai + 157.204 de subagentes), KT-018 495.118 y KT-019 391.604; total de la serie ~1,30M.
- Gates N3: 4 rondas en 3 tickets, 3 aprobadas y 1 escalada; maximo 82.118 tokens por gate.
- Citas del juez fuera del diff: aparecio una vez (KT-018 ronda 1) y no se repitio en las 3 rondas N3 restantes; sigue sin explicar.

## Limites

- Escala muy menor que TAO-192 (3 archivos contra 188, 4 REQs contra 14): la comparacion de rondas y tokens es indicativa, no equivalente, y no se atribuye a los cambios. Lo comparable de forma directa es la ausencia de scope heredado y el sandbox.
- Sin corrida de control con el codigo viejo en el mismo escenario.
- Una sola rama acumuladora y dependencias integradas por commits propios en secuencia; no se probaron integraciones por merge o squash.
- Los jueces son de la familia sonnet; con otros modelos el comportamiento puede variar.
