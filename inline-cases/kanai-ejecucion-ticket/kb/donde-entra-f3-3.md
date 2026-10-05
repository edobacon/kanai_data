# Dónde entra F3.3: la revisión por tarea en vez del diff completo

Fecha: 2026-10-05. Reconocimiento hecho al cerrar la ronda 20, para que la próxima sesión no tenga que buscarlo.

## Qué pide F3.3

"Evaluar cada tarea de la sesión con su rebanada de archivos y sus citas, en vez del diff completo de la
sesión."

Hoy, con el alcance de sesión, un solo run cubre varias tareas: el gate ve **un diff de sesión y un run**, y el
juez no puede atribuir un hallazgo a la tarea que lo causó. Los checkpoints que F2 dejó (un run por tarea, con
`filesTouched`, `testsRun`, `rollback` y citas caso→test por tarea) ya traen exactamente esa atribución: F3.3
es hacer que la revisión la use.

## Dónde está el código

| Archivo | Líneas | Rol |
|---|---|---|
| `server/dispatch/gateContext.ts` | 251 | **El punto de entrada.** Arma el contexto que ven los jueces. La línea 98 ya selecciona los runs de la sesión con `role`, `kind`, `outcome`, `testsPass`, `testsFail`, `summary` y **`files`** — o sea que la rebanada por tarea ya está recolectada, solo hay que usarla para atribuir en vez de agregar |
| `server/dispatch/gate.ts` | — | Orquesta el gate: llama a `makeJudge`/`dualJudge`, arma el `JudgeObjective` y registra la evidencia con `recordJudgeEvidence` |
| `server/dispatch/judgeEvidence.ts` | 151 | Las filas de evidencia por veredicto (`judgeEvidenceRows`) |
| `server/dispatch/judge.ts` | 131 | `dualJudge`, `severityGate`, `Verdict` |

## La forma del cambio

No hay que inventar la atribución: **los runs por tarea que F2 persiste ya la contienen**. Lo que hay que
hacer es que `gateContext.ts` componga el material del juez **por tarea** (la rebanada de archivos de cada run
más sus citas), en vez de un bloque único de sesión, y que `judgeEvidence` pueda colgar el veredicto de la tarea
correspondiente.

## Condición para hacerlo

El cambio toca el camino del gate, así que **debe quedar detrás de la misma condición que el alcance de sesión**
(que el run tenga checkpoints): un run sin checkpoints —como los del piloto de la épica— no debe ver ninguna
diferencia. Así el piloto no se contamina aunque se despliegue el código.

Y las dos mitades de F3 que **sí** están bloqueadas por el piloto son F3.1 y F3.2: encienden la aprobación con
evidencia en modo exigente y el refutador, que se leen del entorno del proceso y cambiarían los gates del
piloto en curso.
