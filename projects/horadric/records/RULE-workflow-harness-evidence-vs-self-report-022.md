---
id: RULE-workflow-harness-evidence-vs-self-report-022
project: horadric
type: rule
module: workflow
level: must
tags:
  - verificacion
  - evidencia
  - det-4
  - det-33
  - metodo
  - experimentos
---

# Al medir un mecanismo, el sujeto no puede ser tambien el instrumento

## What

Cuando se verifica que un mecanismo de contencion funciona, distinguir tres calidades de evidencia y no mezclarlas:

| Calidad | Ejemplos | Vale como |
|---|---|---|
| **Del harness** | el pool que el host publica al anunciar un tipo de agente; el contador `tool_uses`; el mensaje de error de un hook | prueba |
| **Externa post-hoc** | el archivo no existe; `git status` limpio; el log del guard tiene o no tiene la linea | prueba |
| **Self-report del agente** | "no tengo esa tool", "no lo hice" | corroboracion, nunca prueba (DET-33) |

Y tres reglas de diseno de experimento que salieron caras:

**1. El estado previo del sujeto es parte del experimento.** Un primer uso y un uso posterior no son la misma prueba. Si el resultado depende de si el sujeto ya se ejercito, medir solo uno de los dos casos confirma cualquier hipotesis que uno quiera.

**2. El criterio del agente compite con el mecanismo.** Si le pedis a un rol bien construido que viole su contrato para probar el guard, se va a negar **por criterio** y el mecanismo nunca se ejerce. Los dos resultados — "el guard bloqueo" y "el agente se autocontuvo" — se ven identicos desde afuera. Hay que elegir un caso donde el criterio del agente no compita: una operacion permitida, un sujeto sin ese contrato, o el mecanismo invocado directo.

**3. Antes de declarar que un comportamiento contradice la doc, chequear la hora de arranque del proceso.** Un reinicio con sesion resumida es indistinguible de "no hubo reinicio" desde adentro de la conversacion. `ps -o lstart` lo resuelve en un comando.

## Why

HOR-131 produjo cinco afirmaciones equivocadas, **cuatro del orquestador y una del researcher del intake (L1), todas por evidencia insuficiente presentada como hecho**:

- La ausencia de un tipo en la lista publicada se tomo como prueba de que no cargaba. No lo era: la lista mostraba 6 de 45 definiciones en disco.
- Se concluyo que el host recargaba definiciones en caliente midiendo un primer uso.
- Se concluyo que un directorio nuevo se detectaba sin reiniciar, cuando habia habido un reinicio pedido minutos antes.
- Se dio por refutado un riesgo de seguridad con un experimento que medina otra cosa.
- Se intento medir un fallo abierto pidiendole al agente que violara su propio contrato; se nego dos veces, y **lo senalo el propio agente**: *"si el guard fue removido, pedirme la escritura no mide nada del host; lo unico que mediria es si yo escribo cuando alguien me dice que nadie esta mirando"*.

Ninguna se cazo por revision del codigo: las cazaron jueces adversariales del gate, un subagente cumpliendo su rol, o un experimento posterior que contradijo al anterior.

El patron comun es que **la hipotesis comoda es la que suele estar mal medida**. Cuando un experimento confirma lo que uno esperaba y ademas simplifica el trabajo pendiente, ahi es donde hay que revisar el diseno.

## Where

Cualquier task de verificacion runtime: gates con TC manuales, DET-36 (verificacion runtime/UI), DET-33 (verificacion del self-report), y todo experimento sobre comportamiento del host.

## When

Antes de registrar un TC como `PASS` con evidencia manual, y antes de escribir en una doc o en un learn que un comportamiento del host "es asi".

**Antipatron concreto**: cerrar un TC porque el agente dijo que no pudo hacer algo. Eso es self-report. La prueba es que el efecto no ocurrio, verificado por fuera.

## Related

- [[RULE-workflow-agent-pack-lifecycle-021]] — las tres propiedades que se midieron con este metodo
- [[RULE-workflow-single-hypothesis-gates-023]] — que hacer cuando el experimento tumba la premisa de un gate
- DET-4 (hechos vs inferencias), DET-13 (cierre con evidencia), DET-33 (verificacion del self-report)
