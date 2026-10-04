# Diagnóstico: por qué Kanai tarda y gasta de más en taomangalam

Medición sobre el store vivo (44 tickets, 770 ejecuciones de agente, 130 gates) y sobre el repositorio del
proyecto. Los números son la base de comparación del plan de aceleración.

## El gasto, medido

- **44 tickets creados** (30 cerrados, 1 listo para cerrar, 1 en curso, 12 abiertos) y **770 ejecuciones de agente**: ~17,5 por ticket.
- **TAO-181** (listo para cerrar): 22 ejecuciones, **10,6M tokens**, 4 sesiones, 7 gates, 26 casos de test.
- **TAO-182** (en curso): 8 ejecuciones, 6,1M tokens, 27 casos de test **todos pendientes**.
- Los runs de **developer** explican ~7,7M de los 10,6M de TAO-181 (**73%**); los gates ~0,9M.
- Un solo run de developer consumió **1.557.523 tokens de entrada**; varios, entre 400k y 500k.
- El brief **no es el problema**: 1.567 tokens promedio, con el bloque de plan en 79%.

## Las cinco causas

### 1. El gate no ve lo que hizo la sesión (el agujero central)

Todos los gates de TAO-181 y TAO-182 informan *"Verificacion en sandbox: NO corrio (los repos del ticket en su
rama de trabajo no tienen cambios detectables de esta sesion)"*. Sin evidencia ejecutada, el juez juzga
auto-reportes, y el dev termina aceptando los hallazgos a mano: **26 hallazgos aceptados, 9 actos de override,
todos del juez**, casi todos con el mismo texto ("el sandbox no corre la suite real", "el capture no lo ancla").

El trabajo **sí** existe: los commits `GH-59 sesión 1..4` y `GH-60 sesión 1` están en `epic/EP-01`, y la sesión 2
de GH-60 tiene 14 archivos sin confirmar. La resolución de cambios de sesión
(`server/repo/preGate.ts`, `reposOnWorkBranch`) resuelve los commits con `git log <base>..HEAD`: con rama
acumuladora la base y HEAD coinciden y **el rango queda vacío**. Dos causas candidatas, ambas en ese punto: el
rango vacío, y el uso de la referencia interna (`TAO-182`) contra subjects que usan la externa (`GH-60`).

### 2. Bucle de gate y auto-corrección sin salida

TAO-182 sesión 2: `gate→iterate` a las 20:40, `iterate→open` y `open→gate` a las 20:42, `gate→iterate` otra vez a
las 20:42. Hay una ejecución con objetivo **"auto-fix del gate"** y un `close_gate` de **187.500 ms (3,1 min)**.
El hallazgo que lo dispara es *revisión humana de Diseño*: la auto-corrección no puede resolverlo nunca, así que
la vuelta está garantizada.

### 3. Hallazgos no accionables re-litigados

El mismo hallazgo de fidelidad visual de la maqueta aparece en **cuatro gates** de TAO-181. El "tablero" (EP-07) y
la "splash" (TAO-183) no existen todavía y reaparecen en los criterios de gate, obligando al juez a declararlos
fuera de alcance una y otra vez.

### 4. Tareas que nacen imposibles, y ejecuciones que se repiten

Una ejecución de **305.199 tokens** para concluir que no existe ninguna superficie de splash (pertenece a otro
ticket). Otra de **415.223 tokens** bloqueada porque el juego de tokens de contraste aumentado no existía
(entregable de Diseño), y la misma tarea vuelta a ejecutar después con **460.610 tokens**.

### 5. El costo se paga por tarea en lugar de por sesión

15 ejecuciones de developer en TAO-181 (~3-4 por sesión). Cada una explora el repositorio completo y corre **la
suite Flutter entera**: 941, 942, 926, 925, 923, 919, 912, 898, 883, 872 y 452 tests, una vez por tarea. El gate,
que debería ser el lugar de la verificación fuerte, es el que hoy no puede verificar.

## Churn del store

1.704 re-proyecciones del cuerpo del spec y 738 actualizaciones de casos de test en 44 tickets; 1.765
transiciones y 2.583 evaluaciones de guard. Las fases del plan reducen este ruido cuando el gasto se mueve al
cierre de sesión.

## Ceremonia sin efecto

**41 de 93** autorizaciones humanas se resolvieron sin la confirmación de la persona (el host no la soporta) y
**12 autorizaciones concedidas nunca se aplicaron**: vueltas pagadas sin valor de gate.

## Qué falta medir

La métrica de completitud de telemetría está en rojo: **0 de 3 backends** informan tokens y duración en al menos
el 90% de sus runs, y las duraciones de ejecución casi no existen. El análisis de tiempo se apoya en marcas de
transición y en la duración de la llamada de cierre de gate (187 s), no en duración real de ejecución. Cerrar esa
telemetría es la tarea F0.2 del plan.

## Referencia

- Plan de mejora: `plan-aceleracion-kanai.md` (importado como plan del caso; el original queda en el KB).
- Código citado: `server/repo/preGate.ts`, `server/dispatch/gateChecks.ts`, `server/inlinePlan/`.
