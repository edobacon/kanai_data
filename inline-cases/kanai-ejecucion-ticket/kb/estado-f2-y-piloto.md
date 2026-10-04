# Estado: el piloto de la épica está corriendo y F2 está detrás de él

Fecha: 2026-10-04. Caso: kanai-ejecucion-ticket. Comprobado contra el store y el plan de la épica.

## El piloto está en ejecución (no cerrado)

El plan agregado de la épica `taomangalam-ep-01` se aprobó y arrancó:

| Evidencia | Valor |
|---|---|
| Corrida del piloto | `cfaec5f3-730c-438b-9408-7cbfe91fecd1`, iniciada 2026-10-04T20:12:25Z, plan versión 41, teach `skip` |
| TAO-181 | `ticket_verified` 20:12:35Z y `ticket_integrated` 20:13:08Z; en el store quedó en `ready_to_close` |
| TAO-182 | `in_progress`; corridas de developer hasta 2026-10-04 21:52Z (18:52 local), la última de 288 s |
| Cola | el plan acumulador tiene 8 tickets (TAO-181 a TAO-188) y el piloto declarado es de 3 a 5 |

## Qué implica para F2

**F2.pre2 no se cumple**: pide el piloto cerrado o su comparación ya congelada, y el plan dice
explícitamente que el experimento no se corre durante el piloto. F3, F4 y F5 están detrás de F2, así que
**cuatro de las seis fases quedan esperando al piloto**.

Hay además un motivo técnico, no solo de método: F2 cambia `kanai-app`, que es el código del MCP que está
sirviendo el piloto. Aunque el proceso en curso no toma los cambios hasta reiniciarse, un reinicio con F2
aplicado haría correr al piloto con la ejecución por sesión encendida, que es justo lo que la comparación
quiere evitar. **Escribir F2 ahora no solo está fuera de método: contamina el piloto.**

## Dos cosas que conviene decirle a quien corresponde

1. **El registro del piloto está desactualizado en el caso `kanai-epicas-autonomas`.** Su F10 figura
   `Bloqueado` por "selección humana de 3–5 tickets Tao Mangalam, baseline, rama, host/versión,
   responsables y permisos efectivos", pero el piloto ya se lanzó y lleva TAO-181 integrado y TAO-182 en
   curso. El caso no es mío y no lo toqué; conviene que su responsable registre el desbloqueo para que el
   historial no diga que nunca arrancó.
2. **Dos planes inline sobre la misma rama se marcan commits entre sí.** Mis ocho commits de F0 y F1 viven
   en `codex/epicas-autonomas` y aparecen como "commits sin registrar" en el plan de
   `kanai-epicas-autonomas`, que tiene su propia contabilidad de commits. La advertencia es honesta pero no
   es un error mío ni suyo: es una limitación del modelo cuando dos casos comparten rama, y puede confundir
   al juez de ese caso.

## Lo que sí queda listo para cuando F2 se pueda hacer

Inventario de la superficie que F2 toca (para arrancar con el mapa y no con descubrimiento):

| Archivo | Líneas | Rol en F2 |
|---|---|---|
| `server/mcp/planExecution.ts` | 199 | preparar la ejecución y armar el brief (hoy: una task) |
| `server/dispatch/context.ts` | 437 | `buildExecutionContext`/`buildTaskBrief` (foco por task) |
| `server/dispatch/execMode.ts` | 111 | banderas: paralelizar, review por task |
| `server/mcp/subagentReport.ts` | 169 | reporte del subagente (hoy: una task por runToken) |
| `server/dispatch/locks.ts` | 222 | reserva por ticket (hoy serializa por ticket) |
| `server/dispatch/sessionSizing.ts` | 101 | tamaño de la sesión |
| `server/dispatch/citationCheck.ts` | 99 | citas caso→test al reportar la última tarea |
| `server/dispatch/sessionCommit.ts` | 140 | commits por sesión |
| `server/dispatch/checksCache.ts` | 95 | reuso de la suite completa |
| `skills/claude/kn-execute-task/SKILL.md` | 128 | el protocolo que hoy dice "un subagente por TAREA" |

Unos 1.700 líneas de superficie declarada. El punto exacto que F2 cambia es esa última línea: la skill dice
"un subagente por tarea" y F2 necesita que pueda decir "un subagente por sesión, con checkpoint por tarea".
