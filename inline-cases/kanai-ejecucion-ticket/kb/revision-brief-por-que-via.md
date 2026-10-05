# El brief sí se puede entregar: `plan_task_execution` no lo manda, `get_task_brief` sí

Fecha: 2026-10-05. Ajusta el alcance del hallazgo registrado al preparar KT-012/S1.T1.

## Lo que se midió

`plan_task_execution` devuelve `resumen`, `runToken`, `objetivo`, `instrucciones`, `modelo_sugerido` y
`cwd_sugerido` — **sin el prompt**, porque `present.ts` descarta toda cadena de más de 2000 caracteres
(`isTechnicalValue`) y el MCP solo devuelve texto.

## Lo que se midió después

**`get_task_brief` sí entrega el brief completo**, y sin recortes: la llamada devolvió el objetivo, los
requisitos, el contrato de la tarea con su rollback y su comando de verificación, **los 9 casos de prueba con
su id**, los criterios de aceptación, las reglas de código, el análisis de impacto y el contrato de salida.
La diferencia no es de tamaño: `get_task_brief` devuelve **el brief como texto del resultado**, no dentro de un
objeto que el presentador recorra, así que el filtro no lo toca.

## Consecuencia

El hallazgo **no es que el brief no exista ni que no se pueda obtener**: es que **la tool que documenta el
protocolo no lo entrega y otra sí**. El protocolo de la skill dice "lanza un subagente con el prompt de
ejecución que devuelve `plan_task_execution`", y eso no se puede cumplir por esa vía; un host que conozca
`get_task_brief` lo consigue.

Queda como hipótesis a medir, no como afirmación: si los subagentes del piloto arrancan sin el brief, eso
contribuiría a los ~650 k tokens de entrada por corrida. Se puede medir comparando corridas con y sin brief.

Y sigue en pie la advertencia: arreglar `plan_task_execution` cambia lo que reciben las corridas de todos los
hosts, así que **no se toca mientras el piloto corre en un MCP viejo** — al reiniciarlo, su comportamiento
cambiaría a mitad de la comparación.
