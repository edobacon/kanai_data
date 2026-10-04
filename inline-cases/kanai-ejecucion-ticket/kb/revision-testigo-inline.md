# Revisión: el testigo inline no es tan limpio como decía el primer análisis

Fecha: 2026-10-04. Corrige dos afirmaciones de `comparacion-camino-inline.md`, a partir de la medición de F1.

## Qué decía

El análisis del camino inline afirmaba dos cosas que la medición no sostiene tal como están escritas:

1. Que `usuite-15425` era "el testigo limpio" y que sus tiempos "sí son tiempos de trabajo".
2. Que el arranque en frío se paga como un piso: "es un piso con trabajo encima, y se paga 4,6 veces por
   sesión".

## Qué se midió

**Sobre usuite-15425.** La ventana (7,9 h de reloj, 5,7 h activas) es un registro del plan con las tareas
mayormente en `executed_by: dev`, así que es un indicio de trabajo vivo. Pero sus commits **no traen fecha** en
el registro y al menos los de F1 se registraron **tarde**: la fase cerró sin ellos y se cargaron después, a
pedido del dev (`late_reason` en el evento). Los repos del ticket (user-api, sandbox-api) no están locales, así
que **no se puede contrastar contra Git**. Conclusión correcta: es un testigo **útil pero no verificado**, no
un testigo limpio. La regla de leer el reloj del inline desde Git sigue en pie, y ahora se sabe por qué: desde
el plan no se puede distinguir una fase registrada en vivo de una registrada tarde.

**Sobre el piso.** De 32 sesiones medidas, solo **3** tienen una variación de entrada menor al 25% (piso
dominante) y **12** superan el 150% (trabajo dominante). El arranque en frío explica parte del costo, y su peso
cambia sesión a sesión. La frase "un piso con trabajo encima" describe bien TAO-182/S1 y mal al resto.

## Qué queda en pie

- `kanai-epicas-autonomas` **sí** queda refutado como fuente de reloj: sus commits de F1 a F9 son tres horas
  anteriores a la apertura del caso, y el trabajo de abajo (11 commits, 72 archivos, 1.433 líneas en 87
  minutos) es evidencia real de ejecución en caliente.
- El techo del ahorro ((n−1)/n = 70,2% de la entrada) sigue siendo techo y nunca fue presentado como
  resultado; con F1.1 al lado, el ahorro real está entre el suelo de F1.2 y ese techo.
- La comparación de tres patas sigue siendo necesaria, y ahora con un requisito más: declarar de dónde salió
  el reloj de cada pata y si está verificado contra Git.
