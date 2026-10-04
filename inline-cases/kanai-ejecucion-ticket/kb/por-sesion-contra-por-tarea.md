# Por sesión o por tarea: análisis medido

Fecha: 2026-10-04. Caso: kanai-ejecucion-ticket. Fuente: lectura del store vivo (agent_runs, gate_runs,
audit_events) y del código de kanai-app. Todas las consultas fueron de solo lectura.

## La pregunta

¿Es más costoso seguir ejecutando **una tarea por subagente en frío**, o llevar **la sesión a un solo agente**
con las tareas encadenadas, asegurando la calidad con una revisión a la altura? La decisión toca las tres
dimensiones por separado: dinero (tokens), reloj (lo que se siente) y riesgo (calidad verificable).

## El modelo de costo, explícito

- Por tarea: costo = N × (arranque + trabajo). Cada tarea arranca en frío, se orienta, hace el trabajo y muere.
- Por sesión encadenada: costo = arranque + Σ trabajo, **más un término de crecimiento**: cada tarea nueva
  arrastra el trabajo de las anteriores en el mismo contexto.

Encadenar no es gratis: si el contexto crece sin disciplina, el prefijo se alarga y la última tarea de la
sesión es la más cara. Ahorrar no es "encadenar", es **no re-descubrir** y **correr el trabajo pesado una vez**.

## Lo medido

### Arranque en frío

| Señal | Valor |
|---|---|
| Tarea de primer nivel: entrada / salida | 654 k / 5,0 k tokens = **0,77 %** |
| Duración promedio por corrida de developer | 321 s (375 s en la cohorte desde el 1/10) |
| Corridas de developer por sesión | **4,6** (63 sesiones con 3 o más) |
| TAO-182 sesión 1 (4 corridas) | entrada casi idéntica: 4 % de variación sobre un piso de ~640 k |
| TAO-179 sesión 2 (8 corridas) | 390 % de variación, 1,14 M promedio |
| Tareas con más de 1 M de entrada | 67 de 864 corridas de developer |

Dos lecturas, ambas ciertas: en las sesiones de piso plano (TAO-182/S1) el trabajo incremental casi se pierde
dentro de un arranque fijo de 640 k; en las de variación alta (TAO-179/S2, TAO-174/S2) la tarea sí mueve la
aguja. **Es un piso con trabajo encima, y se paga 4,6 veces por sesión.**

### El dato que va en contra del encadenado ingenuo

- La **misma tarea ejecutada dos veces** (TAO-182, sesión 2, tarea T2): la primera pasada 1.026 s / 1,55 M; la
  segunda, después del gate, **1.755 s / 2,37 M**. Volver sobre lo ya hecho costó 1,7× el tiempo y 1,5× los
  tokens. Razón: el agente igual arranca en frío y además tiene más que leer (2.106 tests, 2.081 goldens).
- **21 tareas re-ejecutadas** en la historia: primera pasada 1.734 k de entrada y 429 s; segunda 424 k y
  287 s (−76 % de entrada, pero 4,8 min igual).

Conclusión: hoy "seguir sobre lo ya hecho" es **más** caro, no menos. El encadenado sin disciplina de contexto
puede empeorar el costo en vez de bajarlo.

### El reloj

| Señal | Valor |
|---|---|
| TAO-181 | 1.073 min de reloj, 179 min de agente = **16,7 % de utilización** |
| TAO-182 (sesión continua de tarde) | 207 min de reloj, 139 min de agente = 67 % |
| Hueco entre corridas de menos de 15 min | **24 % a 55 % del tiempo activo** del ticket |
| Ceremonia bloqueante (1/10 al 4/10) | 276 min dentro de llamadas; **256 min** son planificación + gate + enmienda + re-gate + spec |
| Cierre de gate | 53 llamadas, 2 min promedio, **12,5 min la peor** |
| Planificar un ticket | 18 llamadas, 4,9 min promedio, **15,7 min la peor** |
| Round-trips del orquestador | 514 latidos, 158 briefs de tarea, 157 tickets releídos, 149 "qué sigue", 96 bootstraps |

La espera entre corridas, la ceremonia bloqueante, la serialización y los round-trips del orquestador **no se
tocan** con el cambio de granularidad. Si el objetivo es que el ticket se sienta rápido, pesan más que el
arranque en frío.

### La repetición

- Repetir una tarea entera es solo el **4,5 %** (39 de 864 corridas): no es ahí donde se repite.
- El bucle de gate sí: **67 corridas de "auto-fix del gate"**. TAO-158 acumuló **26 gates y 11 auto-fixes**;
  TAO-165, 6 auto-fixes = 11 M de tokens solo en corregir hallazgos.
- 63 errores de invocación en 2 días = reintentos pagados.

### La revisión

A favor: **la verificación ya es por sesión**. El gate cierra la sesión entera (N1/N2/N3), no la tarea. Hoy la
ejecución es por tarea y la verificación por sesión: hay un desajuste, y mover la ejecución a sesión **alinea**
las dos unidades en vez de romper una garantía.

En contra: **el juez es el mismo modelo que ejecuta**.

| Ticket | Developer | Reviewer |
|---|---|---|
| TAO-181 | 22 × deepseek-flash | 7 × deepseek-flash |
| TAO-166 | 25 × deepseek-flash | 14 × deepseek-flash |
| TAO-158 | 21 × deepseek-flash | 28 × deepseek-flash + 3 opus |

El roadmap 11 lo documenta: en taomangalam el juez aprobó 73 de 73 gates. Con un diff más grande, ese juez
correlacionado queda corto: **ir por sesión sin arreglar la revisión es cambiar velocidad por calidad.**

Lo que ya está construido y apagado o en modo laxo:

| Pieza | Estado | Para qué sirve acá |
|---|---|---|
| Aprobación con evidencia (cita archivo:línea del diff) | `measure` (mide, no exige) | `enforce` evita el approve sin sustento |
| Canario (defecto sembrado, se descarta antes de decidir) | tasa 0,2 (activo) | mide si el juez lee de verdad |
| Refutador (segundo juez del mismo modelo buscando el defecto) | apagado (lo enciende el gate reforzado) | descorrelaciona sin cambiar de modelo |
| Review aislado por tarea | apagado en esta instalación | punto de control chico dentro de la sesión |
| Presupuesto de diff (400 LOC) + sugerencia de reslice | mide y avisa | protege contra la sesión-monolito |
| Ejecución en paralelo de tareas | apagada | ataca el reloj sin tocar la granularidad |

## El techo y el rango del ahorro

- Techo: (n−1)/n del arranque de la sesión. Con n = 4,6, **78 %**.
- Dato de campo: un segundo pase sobre lo ya hecho cuesta −76 % de entrada.
- Rango realista: **30 % a 50 % del tiempo de agente de la sesión**. Es la sesión, no el ticket: con 16,7 % de
  utilización en TAO-181, el resto del reloj no es arranque en frío.

## La regla de revisita que ya existía

La etapa 7 de opt-09 (una sesión en un subagente) quedó postergada con esta condición de retorno: *"se retoma si
el tiempo entre tareas supera ~10 % del tiempo activo, o si se logra medir el arranque en frío y resulta
relevante"*. **Se cumplen las dos**: el hueco entre corridas de menos de 15 min es 24-55 % del activo, y el
arranque en frío hoy se mide (650 k de entrada por corrida con 0,77 % de salida).

Pero la regla del roadmap 10 dice que nada se implementa por intuición, y acá el contrafáctico no está medido:
no existe una sesión ejecutada encadenada con la que comparar. Además M9 sigue en rojo.

## Cómo se cierra

Con un **experimento acotado, no un rediseño**: dos sesiones comparables del próximo ticket (o un ticket de
prueba aislado, para no contaminar el piloto de la épica), una por tarea como hoy y otra con la sesión en un solo
agente y checkpoint por tarea. Se comparan reloj, tokens de entrada y salida, vueltas de gate, hallazgos reales
y escapes. En el mismo movimiento se enciende la revisión que ya existe, porque sin eso el experimento compara
rápido contra seguro.
