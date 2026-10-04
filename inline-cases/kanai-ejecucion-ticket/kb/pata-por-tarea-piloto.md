# La pata "por tarea" del experimento, medida sobre el piloto en curso (provisional)

Fecha: 2026-10-04. Caso: kanai-ejecucion-ticket. Fuente: store vivo (`agent_runs`, `tasks`, `sessions`) y el
registro de la corrida del piloto. **Provisional**: el piloto sigue corriendo y la sesión 3 de TAO-182 no
cerró su gate.

## Por qué esto sirve

El piloto de la épica está ejecutando tickets de taomangalam **con un subagente en frío por dispatch**. Eso es
exactamente la pata "por tarea" del experimento de F4, pero con datos frescos y con el instrumento de F0
(utilización, tokens, traspasos). No hay que reconstruirla del historial: se puede medir mientras corre.

## TAO-182, sus tres sesiones

| Sesión | Tareas de primer nivel | Hojas ejecutables | Corridas de developer | Entrada | Agente |
|---|---|---|---|---|---|
| S1 | 4 | 4 (sin subtareas) | 4 | 2,56 M | 33,6 min |
| S2 | 2 | 4 (T1 con 3 subtareas + T2) | 5 (una repetida) | 5,92 M | 83,3 min |
| S3 | 4 | 7 (T1 con 2, T2 con 3, T3 y T4) | 4 al 2026-10-04 21:52Z, 3 pendientes | 4,04 M | 37,7 min |

Promedio por corrida en S3: **1,01 M de tokens de entrada y 9,4 min**.

## El hallazgo: el motor despacha por hoja, no por tarea

El `pendingKey` del motor de épicas registra la acción pendiente como
`plan_task_execution {ticketId: "TAO-182", taskCode: "S3.T2.3"}` — una **subtarea**. En la corrida anterior,
`S2.T1.3`. O sea: quien elige la unidad de ejecución es el motor, y la regla de la skill
(`kn-execute-task`: "Granularidad = por TAREA, no por subtarea... UN subagente por tarea") no gobierna al
piloto.

Consecuencia medida: S2 pagó **2 arranques en frío de más** (4 hojas donde hay 2 tareas de primer nivel) y S3
va a pagar **3** (7 hojas donde hay 4). Al precio del piso de F1 (650 k de entrada, 6 a 10 min por corrida) y
con el promedio observado de S3, son **1,95 a 3,0 M de tokens de entrada y 14 a 29 min de agente extra por
sesión con subtareas**. No es un error de la persona ni del host: es cómo despacha el motor.

## Qué cambia esto

1. **Para F2**: el problema no es solo "por tarea contra por sesión". Aun con la sesión en un solo agente, si
   la unidad de dispatch sigue siendo la hoja, el motor seguirá pidiendo un arranque por hoja. F2 tiene que
   fijar explícitamente **la unidad de dispatch**, no solo el alcance del brief.
2. **Para F4**: la pata "por tarea" ya tiene datos frescos y comparables (TAO-182 S1/S2/S3, mismo ticket,
   mismo repo, sesiones contiguas). Falta su gate, que es lo que cierra la medición de cada sesión.
3. **Para el piloto en curso**: no se toca. El hallazgo se registra y se mide; corregir el dispatch durante
   el piloto invalidaría justo la comparación que el piloto alimenta.
