# Mejora al diseño de la medición: el mismo ticket DOS veces

Fecha: 2026-10-05. Añade al `protocolo-experimento-f4.md`. Detectado al preparar KT-012.

## El problema del diseño original

El protocolo preveía comparar la pata encadenada contra **la pata por tarea ya medida del piloto**
(TAO-182 S1/S2/S3). Eso tiene un defecto: **es otro trabajo**. TAO-182 son goldens de Flutter en taomangalam;
KT-012 es una función de saludo en un repo de juguete. Comparar a través de trabajos distintos obliga a
declarar "orden de magnitud" y deja la puerta abierta a que la diferencia sea del trabajo, no del modo de
ejecución.

## El diseño mejor

**El mismo ticket, dos veces.** KT-012 tiene una ventaja que no había visto: con la bandera encendida, la
ejecución por tarea sigue disponible **simplemente no pasando `sessionScope`**. Entonces:

| Corrida | Cómo | Qué mide |
|---|---|---|
| **A — por tarea** | 3 llamadas a `plan_task_execution` (una por tarea), sin `sessionScope` | La pata por tarea con ESTE trabajo |
| **B — encadenada** | 1 llamada con `sessionScope: true` | La pata encadenada con EL MISMO trabajo |

Entre A y B se vuelve la rama a `main` (el trabajo de A se descarta: es medición, no entrega), así que las dos
corridas parten del mismo punto y producen el mismo cambio. **Mismo ticket, mismo repo, mismo trabajo, misma
vara.** Eso es una comparación de verdad, no un orden de magnitud.

## Lo que cambia en el protocolo

- La pata por tarea de TAO-182 deja de ser la referencia principal y pasa a ser **contexto** (sirve para
  corroborar el piso de F1, no para comparar).
- El costo de la medición se duplica (las dos corridas), y vale la pena: es la diferencia entre un número
  atribuible y una impresión.
- Se mantiene todo lo demás: misma ventana declarada, dispatches como unidad, guarda de calidad y la regla de
  decisión escrita antes de ver los números.
