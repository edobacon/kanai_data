# El camino inline como testigo: qué se gana y qué se deja de medir

Fecha: 2026-10-04. Caso: kanai-ejecucion-ticket. Fuente: los casos inline del store
(`inline-cases/*/plan.yaml`, `log.ndjson`, `usage.ndjson`), el historial Git de `kanai-app` y las tablas
`agent_runs` y `gate_runs`. Todo de solo lectura.

## Por qué se comparan

Los dos caminos hacen lo mismo —un plan con fases, tareas y criterios, commits registrados y evidencia— con
dos diferencias de forma: en el ticket **la ejecución la hace un subagente en frío por tarea** y la
verificación la cierra **un gate del motor**; en el caso inline **la ejecuta quien conduce**, en su sesión
caliente, y los comandos los corre la persona. Comparar los dos es la forma más barata de ver qué cuesta
cada pieza del proceso del ticket, porque el camino inline es, en la práctica, la ejecución por sesión
encadenada que el caso quiere evaluar.

## El testigo limpio: `usuite-15425`

Un ticket real (USUITE-15425, ofuscación de logs de autenticación) hecho como caso inline sobre dos repos
(`user-api` y `sandbox-api`). Los tiempos acá **sí** son tiempos de trabajo: `executed_by: dev`, la persona
corrió los comandos y el agente condujo.

| Dato | Valor |
|---|---|
| Ventana de trabajo | 2026-10-02 11:57 → 19:51 = **7,9 h de reloj** |
| Tiempo activo | **340 min (5,7 h)** sumando las diez fases |
| Fases cerradas | 10 de 11 (F10, PR y QA, pendiente) |
| Tareas y criterios | 65 tareas, 44 criterios |
| Commits registrados | **58**, en dos repos |
| Enmiendas al plan | 13 |
| Desvíos registrados | 13 |
| Hallazgos | 17 (4-5 introducidos por el propio trabajo) |
| Llamadas del agente | 256, con 198 briefs de ~6.400 caracteres |
| Gates del motor | **0** |
| Veredictos de juez | **0** |
| Tokens registrados | **0** |

Lectura: un ticket de dos repos con 58 commits se cerró en un día de trabajo real, con la persona
conduciendo y el agente en contexto caliente, **sin un solo gate y sin que quede un token medido**.

Y lo que no es gratis de ese camino: los 17 hallazgos los encontró quien trabajaba, no un revisor
independiente; de esos, 4 o 5 los introdujo el propio trabajo y los detectó el mismo que los escribió.
Nadie mide escapes en el camino inline.

## El testigo contaminado: `kanai-epicas-autonomas`

Es el caso más grande (el motor de épicas completo: 11 fases, 30 tareas, 15 commits, 2.652 pruebas) y sus
fases figuran cerradas cada 2 o 3 minutos. **Ese número no es velocidad de trabajo.**

Los commits de F1 a F9 se hicieron entre las 11:53 y las 13:20 del 10-03, y el caso se abrió a las 14:43:
las fases se registraron **retroactivamente**, contra commits que ya existían. El `calendar_hours` y el
tiempo activo por fase miden **cuándo se registró la fase**, no cuándo se escribió el código.

Lo que sí es informativo es el trabajo debajo: **11 commits, 72 archivos y 1.433 líneas nuevas en 87
minutos** (11:53 → 13:20), con features sustanciales (modelo de épica y persistencia, planificador,
integración de ramas y checkpoints, permisos por harness, orquestación, CI por SHA, vistas y métricas MCP).
Eso lo produjo un agente en contexto caliente, sin un gate por sesión.

**Conclusión metodológica: en el camino inline el reloj hay que leerlo del historial Git, no del plan.** El
plan registra la ceremonia, no el trabajo.

## El mismo día en Kanai

2026-10-02, el día del testigo limpio, el camino de tickets de taomangalam:

| Dato | Valor |
|---|---|
| Ejecuciones de agente | 119 |
| Tiempo de agente | **7,1 h** |
| Tokens | **78,9 M** |
| Tickets tocados | 7 (TAO-172 a TAO-180) |

Mismo día, mismo motor, dos formas: el camino inline cerró un ticket de dos repos en 5,7 h de trabajo
activo y 0 tokens medidos; el camino de tickets gastó 7,1 h de agente y 78,9 M de tokens en siete tickets.
La comparación **no** es de trabajo equivalente (son proyectos y tamaños distintos) y no se puede concluir
"tantas veces más rápido". Lo que sí se puede concluir es el orden de magnitud del sobrecosto por ticket, y
que el camino inline no paga ni arranque en frío por tarea ni ceremonia de gate.

## Las cuatro diferencias estructurales

1. **La unidad de ejecución.** Ticket: un subagente nuevo por tarea, que reconstruye el contexto (~654 k
   tokens de entrada por corrida, 0,77 % de salida). Inline: el agente que conduce mantiene el contexto
   entre tareas. Es exactamente la diferencia que el caso quiere medir, ya disponible como testigo.
2. **La ceremonia de plan.** Ticket: spec con requisitos, revisión del juez, aprobación, matriz de casos por
   requisito, teach. Inline: el plan entra importado o estructurado, y cambiarlo cuesta una enmienda (13 en
   el testigo, sin re-aprobación).
3. **La verificación.** Ticket: gate por sesión con jueces, checks y recolección de citas. Inline: la
   persona corre los comandos y el agente registra el criterio con su evidencia. **El testigo limítrofe tiene
   cero gates y cero veredictos de juez.**
4. **La medición.** Ticket: cada corrida queda en `agent_runs` con tokens, duración y modelo. Inline: **cero
   filas en `agent_runs`**, cero eventos en el feed de auditoría del proyecto, cero tokens. El camino inline
   es invisible para todas las métricas con las que Kanai habla de su propio costo.

## La trampa a evitar al concluir

La diferencia de velocidad es real en la parte que se puede medir (unidad de ejecución y ceremonia), pero
hay dos trampas:

- **Creer que el camino inline es barato porque no hay número.** No hay tokens registrados porque el camino
  no los mide, no porque no los gaste. El arranque en frío desaparece; el trabajo del modelo sigue ahí y
  ahora **tampoco se ve**.
- **Creer que el gate del ticket compra lo que cuesta.** La evidencia del otro análisis dice lo contrario:
  el juez es el mismo modelo que ejecuta, aprobó 73 de 73 gates en taomangalam, el sandbox no corría la
  suite y 26 hallazgos se aceptaron a mano. O sea: el ticket paga arranque en frío **más** una verificación
  que hoy verifica poco.

## Qué implica para el experimento

1. El testigo limpio ya existe: `usuite-15425` es la forma que el caso quiere construir, ejecutada sobre un
   ticket real. Antes de escribir código conviene releerla como especificación de comportamiento.
2. La comparación de F4 tiene que ser de **tres patas**, no de dos: por tarea, encadenada por el motor, y el
   testigo inline. La tercera pata es la que dice si hace falta código nuevo o si alcanza con adoptar la
   forma que ya funciona.
3. Hay que medir lo que el camino inline **deja de medir**: tokens del agente que conduce y escapes. Sin
   eso, "más rápido" y "más barato" se confunden, y el camino inline gana por no llevar la cuenta.
4. Y hay una pieza que el camino inline **no tiene y no conviene perder**: la verificación independiente.
   El objetivo no es copiar el camino inline, es quedarse con su forma de ejecutar y su medición, sin
   soltar la verificación.
