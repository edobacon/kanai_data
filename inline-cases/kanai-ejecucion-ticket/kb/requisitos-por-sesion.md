# Cómo recibe la sesión sus requisitos: de una vez, progresivo o híbrido

Fecha: 2026-10-04. Caso: kanai-ejecucion-ticket. Pregunta del dev sobre lo implementado en F2, y decisión.

## La pregunta

Con la sesión encadenada, ¿la sesión recibe todos los requisitos de una vez, o puede pedirlos mientras avanza
e ir sumando al contexto? ¿Qué es mejor?

## Lo que hay implementado (y su defecto)

F2 arma el brief de la sesión **concatenando el brief completo de cada tarea**. Eso garantiza que no falte
nada y que no haya idas y vueltas, pero **repite el contexto compartido** (reglas del KB, design system, bugs
del módulo) una vez por tarea: con 7 tareas, siete veces lo mismo. El defecto es la repetición, no el "todo de
una vez".

## Los cuatro hechos que deciden

| Hecho | Número |
|---|---|
| Peso del brief en una corrida | **1.207 tokens compilados** (`brief_metrics` de una corrida real) contra **650.013 de tokens de entrada** de developer en promedio = **0,2%** |
| Entrada de una sesión | 3,04 M de tokens con 4,22 corridas de developer |
| El dolor declarado por el dev | **la lentitud**, no el tamaño del prompt |
| Riesgo del camino progresivo | una tarea que no recibe su contrato **falla en silencio** y no se detecta hasta el gate |

## Decisión

**De una vez, deduplicado, por defecto.** El camino progresivo optimiza la parte que pesa 0,2% y a cambio
agrega dos costos que sí son reales acá: una ida y vuelta por tarea (latencia) y el riesgo de que una tarea se
ejecute sin sus requisitos.

El brief de sesión debe quedar así:

1. **Una vez** el contexto compartido (KB del módulo, design system, reglas y bugs).
2. **Una vez** el plan de la sesión: cada tarea en orden con su contrato y **sus obligaciones** (los REQs que
   valida y sus casos de prueba).
3. El detalle completo **solo de la tarea en curso**.

Misma garantía (cero idas y vueltas, nada se pierde), sin el N× de contexto.

## Cuándo sí conviene lo progresivo

Solo para sesiones largas, y **acotado a un presupuesto declarado**:

- Hasta ~6 tareas: todo de una vez, deduplicado.
- Sesiones largas (10+ tareas) que no caben en el presupuesto: el brief lleva las primeras K completas y el
  agente **pide el resto a medida que avanza**. La capacidad ya existe (`get_task_brief` y la regla de la skill
  de trabajar con las tools de Kanai), así que no hay que construir nada nuevo.
- Con camino progresivo, el **checkpoint de cada tarea declara qué leyó**, para que la falla silenciosa deje
  de ser silenciosa.

## Lo que falta medir

**No está medido el efecto del prompt monolítico sobre la calidad.** Con las obligaciones de varias tareas
juntas, el agente podría mezclar citas caso→test entre tareas; los checkpoints están para atraparlo, pero es
una hipótesis. Queda como comparación posible de F4: **de una vez contra progresivo**, mirando hallazgos
reales, citas y escapes — **no** tokens, porque ahí no hay nada que ganar.
