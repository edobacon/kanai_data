# Auditoría del alcance de sesión, correcciones y prueba real en KT-014

Fecha: 2026-10-05.

## Cómo funciona hoy la ejecución

Con `KANAI_SESSION_SCOPE=on`, el siguiente paso del ticket (`next_action` → `executeCall`) pide `plan_task_execution` con `sessionScope: true`. Kanai arma un brief con todas las tareas pendientes de la sesión, en orden y por hoja, y emite UN runToken. El host lanza UN subagente por sesión del ticket, que encadena las tareas y reporta un checkpoint por tarea. El orquestador corre el gate y la sesión siguiente arranca con otro subagente.

Es decir: se eliminó el arranque en frío por tarea, pero no el arranque por sesión. No existe todavía "una sola sesión que pide tareas y las ejecuta" a lo largo del ticket.

## Defectos encontrados y estado

| # | Defecto | Estado |
|---|---|---|
| H1 | La skill kn-execute-task pedía un subagente por tarea de primer nivel y "repetir por cada tarea", en contra del motor | Corregido (1b980ff) |
| H2 | El comentario del `.env` decía que el motor de épicas no pide el alcance de sesión. Lo pide desde bc5537a (bridge → nextAction → executeCall), así que el piloto de épicas ya corre encadenado | Corregido (el `.env` no está en git) |
| H3 | `durationMs` se copiaba en el run de cada tarea: el reloj se multiplicaba por N | Corregido (d690d3a) |
| H4 | `selfReport` era del run entero: no se podía reportar T1 y T2 hechas y T3 bloqueada | Corregido: `selfReport` por checkpoint |
| H5 | Una tarea sin checkpoint heredaba `filesTouched` del run: atribución falsa para el juez | Corregido: no hereda, y el reporte se rechaza si una tarea dada por hecha no trae checkpoint |
| H6 | El reintento tras un bloqueo recuperable re-persistía todos los runs y re-proponía `done` para tareas cerradas ("done → done ilegal"): bucle sin salida | Reproducido con test y corregido: `reportedRuns` en el registro + `refreshAgentRunResult` |
| H7 | Cada brief del alcance termina con el contrato de salida de UNA tarea ("devuelve ÚNICAMENTE un JSON" sin checkpoints), en contra del encabezado de la sesión | Pendiente |
| H8 | Los runs por tarea guardan como objetivo el de la primera tarea | Pendiente |

Juez ciego (sonnet) de las correcciones: aprobado; su hallazgo medio (el reintento de una sola tarea no corregía la fila) quedó resuelto con `refreshAgentRunResult`.

## Prueba real: KT-014

Ticket chico en kanai_test (despedida configurable: código, tests y README). El plan salió como 1 sesión con 3 tareas.

- El paso canónico pidió `sessionScope: true` sin intervención manual.
- Un solo runToken cubrió S1.T1 → S1.T2 → S1.T3 (unidad de dispatch: hoja).
- Un subagente sonnet hizo las 3 tareas: **30,5 s y 80,7 k tokens**. 6 de 6 tests verdes, greet.mjs sin tocar (verificado aparte por el orquestador).
- Rechazo H5 verificado en vivo: un reporte sin el checkpoint de S1.T3 se rechazó sin persistir y con el token vivo.
- Con el reporte completo: 3 runs, cada uno con sus archivos, tokens en uno solo (no multiplicados).
- Gate de sesión aprobado, gate integral aprobado, autocommit 56f6ab0 en la rama del ticket.

Advertencias para la medición (F4):
- Es una sola muestra, T1 y trivial: valida la mecánica, no el ahorro.
- Para comparar con la variante por tarea hay que apagar la bandera y reiniciar el MCP, o llamar `plan_task_execution` a mano sin `sessionScope`.
- Para esta corrida el orquestador escribió su propio contrato de salida con checkpoints (por H7). Sin ese ajuste, un host que siga el brief literal podría devolver un JSON sin checkpoints.

## Otros

- `docs:check` en rojo, preexistente: `docs/metrics/arranque-en-frio-2026-10-04.md` tiene un área inválida y los catálogos `det-catalogo.md` y `mcp-catalogo.md` están desfasados por los commits de verificación obligatoria.
- `gate-monorepo-integral.test.ts` falló una vez en la suite completa y pasó 3 de 3 aislado: flaky, sin relación con el cambio.
