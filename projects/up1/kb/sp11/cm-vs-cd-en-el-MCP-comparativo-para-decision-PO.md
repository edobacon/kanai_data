---
id: DOC-kb-sp11-cm-vs-cd-en-el-MCP-comparativo-para-decision-PO
project: up1
type: doc
module: mcp
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - curriculum-design
  - comparativo
  - PO
  - decision
---

# cm vs cd en el MCP: comparativo para decision (PO)

Comparativo de sp11 para el PO: que necesita cada mod propio (curriculum-design y curriculum-mapping) para funcionar por el asistente (MCP) igual que por la plataforma, cuanto cuesta, que riesgo hay hoy, y que hay que decidir. Sintesis de tres relevamientos por mod verificados contra el codigo real. Version de negocio; el detalle tecnico esta en los documentos por mod de sp11.

## 1. Que se busca

Que un agente que opere up1 por el asistente (MCP) pueda hacer lo mismo que un usuario por la pantalla, respetando las mismas reglas de negocio, y que no pueda corromper datos por un atajo. A eso lo llamamos "1:1 plataforma vs asistente".

## 2. Foto comparativa

| | curriculum-design (cd) | curriculum-mapping (cm) |
|---|---|---|
| **Punto de partida** | Sus reglas ya corren en el camino comun de escritura; el asistente por defecto ya las respeta. Ya tiene 4 operaciones expuestas al asistente. | Sus reglas corren en operaciones aparte que el camino comun no toca; hoy el asistente puede escribir salteandolas. No tiene ninguna operacion propia expuesta. |
| **Riesgo HOY** | Un hueco real y activo: agregar materias al plan por el asistente NO valida prerrequisitos/correquisitos/creditos (la pantalla si). Ya es alcanzable con una operacion existente. | Todo objeto de cm es escribible por el asistente salteandose sus 62 reglas; hoy solo lo frena el control de permisos (RBAC). |
| **Que falta** | Cerrar 4 reglas que hoy viven solo en la pantalla (sobre todo la de prerrequisitos). Poco trabajo de exposicion. | Declarar el bloqueo del atajo inseguro + construir las operaciones de dominio para que el asistente pueda escribir bien. |
| **Trabajo dominante** | Reforzar reglas en el servidor. | Construir operaciones nuevas para el asistente. |
| **Esfuerzo** | ~6 a 13 puntos (nucleo obligatorio 4 a 6). | ~9.5 a 16.5 puntos. |
| **Cierra tambien otras vias?** | Si: al reforzar en el servidor, la regla vale para pantalla, asistente y cualquier integracion. | Solo el asistente; el resto de las vias queda para una mejora estructural aparte (ver seccion 5). |

## 3. El punto mas urgente, cruzando ambos mods

De todo lo relevado, lo mas urgente NO es hipotetico: en cd, agregar materias a un plan por el asistente puede violar prerrequisitos, correquisitos o el umbral de creditos, porque esa validacion quedo solo en la pantalla y nunca se llevo al servidor (si existe para el borrado, no para el alta). Es un riesgo de integridad de datos vigente, alcanzable con una funcion que ya esta disponible en el asistente. Recomendacion: tratarlo como prioridad, independientemente de la decision de fondo. Es trabajo acotado y la pieza de servidor necesaria ya existe a medias.

En paralelo, en cm todos los objetos siguen escribibles por el asistente sin sus reglas; eso se cierra con el bloqueo que ya esta construido (falta activarlo, ver seccion 4).

## 4. Dependencia comun ya construida: el bloqueo del atajo inseguro

El mecanismo que impide que el asistente escriba salteando las reglas YA esta desarrollado (en una rama, sin integrar). Para activarlo hace falta un despliegue coordinado de tres piezas a la vez:
- cm declara que sus objetos van por sus reglas (config chica).
- Un tercer mod (academic-scheduling) ajusta una funcion suya (cambio minimo, medio dia).
- La rama del mecanismo se integra junto con las dos anteriores.

Si se integra suelto, o no bloquea nada, o rompe la funcion del tercer mod. Es un paso de coordinacion, no de desarrollo grande.

## 5. La decision de fondo (solo afecta a cm y al largo plazo)

Para que cm quede bien hay dos caminos, y conviene que el PO elija segun cuan urgente sea cerrar TODAS las vias (no solo el asistente):

- **Camino A (solo el mod):** construir las operaciones de dominio de cm + declarar el bloqueo. Rapido de tener el asistente usable, pero cierra solo la via del asistente; deja abiertas las escrituras masivas de la propia suite y las integraciones directas (hoy "riesgo asumido" por permisos). Es trabajo del mod, no toca el nucleo.
- **Camino B (cambio en el nucleo):** un cambio estructural en el nucleo (object-manager) que permite que varios mods gobiernen el mismo objeto. Cierra TODAS las vias de una, y ademas destraba una limitacion que hoy ata a cd. Es mas caro y sensible (toca el camino de escritura de toda la plataforma), y necesita el visto bueno del equipo de nucleo.

No es decision puramente tecnica: depende de cuan duro sea el requisito de cerrar todas las vias. Lo barato y no arrepentible (declarar el bloqueo, construir las operaciones nucleares de cm) sirve para los dos caminos y se puede empezar ya.

## 6. Que decidir (checklist para el PO)

1. **Prioridad del hueco de prerrequisitos en el alta (cd):** es riesgo vigente. Se aborda ya, si o no.
2. **Camino A vs B para cm:** decide el alcance del cierre (solo asistente vs todas las vias) y el costo. Mientras tanto, arrancar lo no arrepentible.
3. **Dos preguntas abiertas de cd** (tecnicas, para confirmar con el equipo): si el borrado de ciertos objetos no tiene refuerzo por decision o por olvido, y un detalle de reordenamiento de materias. No bloquean, pero conviene resolverlas antes de dar cd por cerrado.
4. **Alcance del asistente en cm:** hoy cm quedaria de solo-lectura por asistente hasta construir sus operaciones; definir cuantas se necesitan realmente (las de matriz, arbol y adopcion son el nucleo; el resto es incremental).

## 7. Esfuerzo total y secuencia sugerida

- Activar el bloqueo (coordinado): chico, es coordinacion.
- cd: ~6 a 13 puntos; el nucleo obligatorio (declarar + prerrequisitos + una consistencia simple) ~4 a 6.
- cm: ~9.5 a 16.5 puntos, segun cuantas operaciones se expongan y el camino elegido.

Secuencia recomendada: (1) el hueco de prerrequisitos de cd, por ser riesgo vigente; (2) activar el bloqueo coordinado (deja a cm seguro aunque todavia de solo-lectura por asistente); (3) construir las operaciones nucleares de cm; (4) resolver la decision Camino A vs B para el resto. Los numeros son orientativos y conviene calibrarlos con el equipo antes de comprometerlos.

Detalle por mod: ver en sp11 los documentos "Ticket cm auto-gobierno" y "Analisis cd para el MCP", la "Decision de camino para cm", la "Propuesta a core" y el "Reporte del fix de blockGeneric".
