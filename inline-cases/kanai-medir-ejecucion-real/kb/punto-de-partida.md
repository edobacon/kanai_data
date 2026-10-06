# Punto de partida y metas de la medición real

Fecha: 2026-10-06. Caso antecesor: kanai-optimizar-ejecucion (cerrado, arbiter aprobado; ahorro LLM no medido).

## Línea base (proyecto taomangalam, solo lectura)

| | TAO-192 | TAO-191 | TAO-186 |
|---|---|---|---|
| REQs / casos de prueba | 14 / 61 | 8 / 32 | 7 / 33 |
| Runs | 76 | 43 | 22 |
| Tokens | 27,4M | 19,6M | 3,19M |
| Gates de sesión | 14 (5 iterate seguidos en el N3 final) | 20 | 4 (1 iterate) |
| Peor gate | 6,35M tokens | sin dato | 246k tokens |
| Sandbox | siempre "NO corrió" | sin dato | siempre "NO corrió" |
| Ejecución activa | 4 h | 2,7 h | 1 h 45 min |

Hallazgos de TAO-192: scope creep heredado de TAO-191 repetido en 5 de 7 rondas del N3; un bug real distinto en cada ronda; auto-fix de TAO-186 consumió 1,51M tokens (47% del ticket) sin producir cambios.

## Ya medido sin LLM (caso antecesor)

- Sandbox real en verde sobre un ticket sintético de KT.
- Armado del N3 de TAO-192 en copia aislada: diff de 188 a 154 archivos al excluir lo ya integrado; contexto de 22587 a 49669 caracteres con consumidores completos.
- 2946 tests en verde.
- Commits en la copia de Codex, rama feat/optimizar-ejecucion: 8 commits, 9d4c1cf a 7204334.

## Metas por comprobar con corrida real

| Señal | Meta |
|---|---|
| Sandbox | corre en el 100% de los gates |
| Hallazgos por diff heredado | 0 |
| Rondas del N3 | 2 o menos |
| Tokens por gate | menos de 1M |
| Auto-fix | corte por tope clasificado como bloqueado |

## Restricciones

- No se re-ejecuta ningún gate sobre tickets reales de taomangalam: la repetición de TAO-192 se hace en KT con una copia del mismo diff.
- Sin push. Cambios ajenos sin commitear en kanai-app no entran en ningún commit del caso.
