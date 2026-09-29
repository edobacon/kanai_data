---
id: DEC-session-commit-descriptive-message
project: kanai_self
type: decision
module: sessions
---

## Decisión

Cuando el gate de una sesión commitea automáticamente al cerrar (DET-27, "commits al cierre de sesión"), el mensaje del commit NO debe ser "sesión N" (ni "S1"/"S2"). Debe llevar un descriptor de LO QUE SE IMPLEMENTÓ en esa sesión, manteniendo el prefijo de referencia externa del ticket cuando exista (convención del repo, p.ej. "UPONE-1770").

Formato esperado: `<ref-externa> <descripción de lo implementado>`.

Ejemplos (TICKET-149 / UPONE-1770):
- En vez de `UPONE-1770 sesión 1` -> `UPONE-1770 valida el peso de la tributación por fila en la escritura gobernada (contributionPercentage, R-6)`.
- En vez de `UPONE-1770 sesión 2` -> `UPONE-1770 guardado en conjunto transaccional de la tributación por matriz (upsert con retiro por scope y RBAC propio)`.

## Por qué

El mensaje del commit es parte del historial navegable del repo, no de la nomenclatura interna de Kanai. "sesión N" es un id interno de Kanai que no le dice nada a quien lee `git log` fuera de la herramienta: no comunica qué cambió ni por qué. Un descriptor de lo implementado hace el historial legible y trazable por sí solo, y evita reescrituras manuales posteriores (que fue lo que motivó esta decisión).

## De dónde sale el descriptor

El criterio observable de cada sesión ya se captura en el intake como `gateCriteria` (derivado de `plan.sessions[i].reviewOutcome`) y las tareas tienen su contrato. El mensaje del commit debe derivarse de ese contenido (el resultado observable de la sesión y/o el resumen de la ejecución reportada), no del ordinal.

## Alcance / pendiente

Cambio de comportamiento en la lógica de auto-commit del cierre de sesión (server, cerca de `close_gate` / DET-27). Registrado como comportamiento esperado a implementar; a la fecha el auto-commit todavía usa "sesión N" y hubo que reescribir los mensajes a mano en UPONE-1770.
