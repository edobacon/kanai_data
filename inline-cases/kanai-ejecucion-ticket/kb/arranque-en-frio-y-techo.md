# Arranque en frío, techo del ahorro y testigo inline (F1)

Fecha: 2026-10-04. Caso: kanai-ejecucion-ticket. Fuente: lectura del store vivo (agent_runs, tickets) y del
historial Git de kanai-app. Solo lectura. Cohorte: taomangalam, ejecuciones desde el 2026-10-02.

## F1.1 — El piso de arranque NO es un piso plano

Se midió, por sesión con 3 o más corridas de developer, cuánto varía el tokens de entrada entre sus corridas.
32 sesiones:

| Señal | Valor |
|---|---|
| Variación media dentro de la sesión (max−min sobre promedio) | **143,9%** |
| Piso medio (mínimo sobre promedio) | 52% |
| Sesiones con variación menor al 25% (piso dominante) | **3 de 32** |
| Sesiones con variación mayor al 150% (trabajo dominante) | **12 de 32** |
| Sesiones con piso del 80% o más | 5 de 32 |

Las tres sesiones de piso plano son TAO-182/S1 (4% de variación sobre un piso de 640 k), TAO-181/S4 (20,9%) y
TAO-180/S4 (23,6%).

**Corrección a lo que decía el primer análisis:** el arranque en frío no es un piso constante con trabajo
encima. En la mayoría de las sesiones el trabajo de la tarea mueve el número tanto o más que cualquier piso
fijo: si el arranque fuera constante y grande, la variación entre corridas sería chica, y en 12 de 32
sesiones supera el 150%. El arranque en frío explica **parte** del costo, no todo, y su peso cambia sesión a
sesión.

## F1.2 — Volver sobre la misma tarea

21 tareas ejecutadas más de una vez:

| Pasada | n | Entrada | Salida | Duración | Salida/entrada |
|---|---|---|---|---|---|
| 1ª | 21 | 1.734 k | 14.990 | 429 s | 0,86% |
| 2ª | 21 | **424 k (−76%)** | 4.848 | **287 s (−33%)** | 1,14% |
| 3ª | 4 | 364 k | 6.226 | 177 s | 1,71% |

Es la cota alta de lo que se puede ahorrar por no re-descubrir: la segunda pasada sobre lo mismo cuesta 76%
menos de entrada, pero **sigue costando 4,8 minutos**. O sea: el re-descubrimiento es una parte grande de la
entrada y una parte menor del reloj. Hay un sesgo que no se puede eliminar: en la segunda pasada los
artefactos ya existen en disco, así que parte del ahorro no es contexto sino trabajo ya hecho.

## F1.3 — El techo del ahorro

110 sesiones de taomangalam con corridas de developer: **4,22 corridas por sesión** en promedio, máximo 12.
Sesión promedio: 3,04 M de tokens de entrada y 23,7 min de agente.

- Techo de entrada: (n−1)/n = **70,2%** → **2,13 M de tokens por sesión**.
- Techo de reloj, bajo el mismo supuesto: ~76% del tiempo de agente de la sesión.

**El techo no es una predicción, y hay que leerlo con F1.1 en la mano:** supone que las otras tareas de la
sesión tienen costo marginal cero. Si el trabajo de cada tarea mueve el número (y en 12 de 32 sesiones lo
mueve fuerte), el ahorro real es menor que el techo. El dato que lo acota por abajo es F1.2 (−76% de entrada,
−33% de reloj al repetir). **El ahorro real está entre "solo el arranque" y el techo, y no se puede decidir
sin el experimento de F4.**

## F1.4 — El testigo inline, con una corrección

**kanai-epicas-autonomas: refutado como fuente de reloj.** Sus fases figuran cerradas cada 2 o 3 minutos, pero
los commits de F1 a F9 se hicieron entre las 11:53 y las 13:20 del 10-03 y el caso se abrió a las 14:43. Las
fases se registraron **retroactivamente**: el `calendar_hours` mide cuándo se registró, no cuándo se trabajó.
Lo que sí es evidencia es el trabajo de abajo: **11 commits, 72 archivos y 1.433 líneas en 87 minutos**
(11:53 a 13:20), con un agente en contexto caliente y sin un gate por sesión.

**usuite-15425: testigo útil, pero no "limpio".** Su ventana es 2026-10-02 11:57 a 19:51 (7,9 h de reloj) y
5,7 h activas según la métrica del caso, con las tareas mayormente en `executed_by: dev`. Pero: sus commits
**no traen fecha** en el registro del caso y al menos los de F1 se registraron **tarde** (la fase cerró sin
ellos y se registraron después, a pedido del dev). Los repos (user-api, sandbox-api) no están locales, así que
**no se puede contrastar contra Git desde acá**. Su reloj es, entonces, **registrado por el plan y no
verificado contra Git**, no un testigo limpio.

**La regla que queda, y es la que importa:** en el camino inline el reloj **se lee del historial Git, no del
plan**. El plan registra la ceremonia; a veces también registra el trabajo (usuite), a veces solo la ceremonia
(kanai-epicas-autonomas), y desde el plan no se puede distinguir. Cualquier comparación tiene que declarar de
dónde salió el reloj del testigo y si está verificado.

## Qué tiene que medir el experimento de F4

1. Reloj de agente y utilización de la sesión (ya están en el desglose de tiempo).
2. Entrada y salida de tokens por sesión, y cuántas corridas tuvo cada pata.
3. Si el ahorro se acerca al techo o al suelo de F1.2: eso dice si el arranque en frío era el problema o no.
4. Y la calidad, porque el ahorro no se expande si el gate deja pasar más.
