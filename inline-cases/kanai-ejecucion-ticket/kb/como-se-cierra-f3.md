# Cómo se cierra F3: qué encender, qué medir y qué falta para F3.c4

Fecha: 2026-10-05. Estado: F3.3 y F3.4 cerradas; F3.1, F3.2 y F3.c4 pendientes.

## F3.1 y F3.2: encender y medir

Las dos encienden interruptores que **se leen del entorno del proceso**, así que no hay forma de activarlos solo
para un ticket: hay que reiniciar el MCP con ellos puestos. Y el piloto de la épica corre en dos procesos
viejos (pids 14700 y 39673, anteriores al último commit): mientras no los reinicien, no los ven.

| Tarea | Qué encender | Qué medir |
|---|---|---|
| F3.1 | la aprobación con evidencia en modo exigente (hoy está en modo de medición: pide la cita pero no la exige) | la tasa de `iterate` **antes y después**, con la cantidad de gates de cada muestra; condición de reversión: volver al modo de medición |
| F3.2 | el refutador en los gates de código | la tasa de `iterate` y **los hallazgos nuevos que aporta** (los que el juez principal no vio) |

**La muestra es el problema, no el encendido.** Medir una tasa de `iterate` necesita un cuerpo de gates; los
gates del piloto son la muestra natural, y encender esto **a mitad de su comparación la contamina**. De ahí la
condición real: o el piloto ya cerró, o F3.1/F3.2 esperan.

## F3.c4: qué falta y por qué no alcanza lo que hay

El criterio pide "cada tarea de la sesión encadenada con su revisión y sus citas, sin huecos de atribución".
Corrí el gate de `KT-012-S1` (sesión encadenada, 3 tareas, un run por tarea) y el veredicto fue **iterate**,
con dos hallazgos que citan el run de `S1.T1`: la revisión **sí** lee evidencia por tarea. Pero eso no cierra el
criterio, por dos motivos:

1. **Iteró**, así que no hay un desglose por tarea aprobado que sirva de evidencia.
2. **El registro del gate no guarda el material que vio el juez.** `gate_runs` guarda nivel, decisión, tokens,
   duración y conteos, pero no el handoff. Sin eso, la atribución por tarea es verificable **solo por dentro**:
   no se puede auditar después qué rebanada recibió el juez.

Decisión pendiente del dev: si el registro del gate debe guardar el handoff (o al menos las rebanadas y qué
archivos quedaron sin tarea), o si el criterio se da por cumplido con menos. Es la diferencia entre "funciona"
y "se puede demostrar que funciona".

## Un dato del gate que sirve para el hallazgo de telemetría

El gate de `KT-012-S1` **sí** reportó tokens (19101 de entrada, 3041 de salida, 31,9 s de duración), mientras
las corridas de subagente del mismo ticket tienen `tokens_in`/`tokens_out` **vacíos**. El camino del juez mide;
el del subagente no. Para el número de F4 hay que cerrar esa asimetría.
