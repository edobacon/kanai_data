# Revisión: la duplicación del brief no justifica el cambio

Fecha: 2026-10-04. Corrige la magnitud que yo mismo le atribuí a la duplicación del contexto compartido en
`requisitos-por-sesion.md` ("el defecto es la repetición").

## Qué dije

Que el brief de sesión repetía el contexto compartido una vez por tarea y que eso era **el** defecto a
corregir antes de medir.

## Qué dicen los números

Del `brief_metrics` de una corrida real: el brief entero pesa **1.249 tokens** estimados, y el bloque de
planificación (el contrato y los criterios de la tarea) es el **79%** de eso. O sea: el brief está dominado
por contenido **por tarea**, no por contexto compartido (el bloque de contexto medía 488 caracteres y las
referencias al KB, 17).

Cota superior de lo que se podría ahorrar deduplicando, en el peor caso (7 tareas):

| Medida | Valor |
|---|---|
| Brief concatenado de 7 tareas, sin deduplicar | 7 × 1.249 = **8.743 tokens** |
| Entrada de una corrida de developer | **650.013 tokens** |
| **Peso del brief entero** | **1,3% de una corrida** |
| Entrada de una sesión | 3,04 M |
| **Peso del brief entero en la sesión** | **0,3%** |

Y eso es la cota **superior** —el caso de concatenar todo sin deduplicar—, no lo que se ahorraría: la
duplicación real es solo la parte compartida, que es la menor del brief.

## Conclusión

**Deduplicar el brief es cosmético: mueve décimas de un punto.** No merece una intervención antes de medir, y
presentarlo como el arreglo necesario fue un error mío de proporción.

Lo que **sí** queda en pie de la decisión:

- **De una vez, no progresivo**, y por los motivos que no son de tamaño: una ida y vuelta por tarea agrega
  latencia (el dolor declarado) y el camino progresivo puede dejar una tarea sin su contrato **en silencio**.
- La regla de sesiones largas (híbrido acotado a un presupuesto) sigue siendo el escape correcto, pero por
  **límites de ventana del modelo**, no por costo.

## Qué hacer en su lugar

Ir directo a la medición: **ticket de prueba aislado, bandera encendida solo ahí, comparación contra la pata
por tarea ya medida**. El brief no es el cuello; el número de corridas sí.
