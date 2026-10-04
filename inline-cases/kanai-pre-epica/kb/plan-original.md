# Desbloquear el análisis de la épica y dejar el terreno medido (pre-piloto)

## Objetivo

Dejar la épica lista para iniciar su piloto: corregir el planificador de dependencias que hoy produce auto-referencias y referencias truncadas, registrar los commits que el plan no tiene, cerrar la telemetría que falta y congelar el baseline del flujo actual. No modifica tickets ni enciende cambios de flujo: es requisito previo del piloto y medición.

## Riesgos

- Corregir el planificador cambia las aristas inferidas: hay que comparar contra las 126 actuales y revisar que no desaparezcan dependencias reales.
- El baseline puede quedar contaminado si algo del motor cambia después de congelarlo: se congela al final y se anota su fecha y su alcance.
- Tocar la épica nativa de taomangalam está fuera de alcance: la verificación del planificador se hace con los cuerpos canónicos como fixtures.

## Fuera de alcance

- Modificar tickets, specs, estados o sesiones de taomangalam, incluida la épica EP-01 en ejecución.
- Re-planificar la épica nativa: la verificación usa sus cuerpos como fixtures, no corre el planificador sobre la épica real.
- Los cambios de flujo del caso post-épica (evidencia del gate, corte del bucle de auto-corrección, ejecución por sesión): contaminarían la comparación del piloto.

### F0. Telemetría y baseline del flujo actual

**Meta:** Que el flujo actual quede medido con números propios, para que el piloto tenga contra qué compararse y para que ninguna mejora posterior se atribuya sin dato.

**Responsable sugerido:** dev

**Antes de empezar:**
- [ ] Node 24 y pnpm disponibles, con las dependencias de kanai-app al día.
- [ ] Store vivo accesible en modo lectura y el data repo sin cambios propios pendientes.

**Tareas:**
- [ ] **F0.1** Cerrar la telemetría por ejecución.
  El reporte de ejecución ya acepta duración, tokens de entrada y salida, y modelo. El hueco es que DSH no los informa (OpenCode sí, con el plugin que instala el instalador de Kanai), y la métrica de completitud de telemetría da 0 de 3 backends por encima del 90%. Cerrar el hueco en el host.
- [ ] **F0.2** Congelar el baseline del corpus.
  Desglose por tipo de ejecución (developer, gate, intake, plan, refine) y por ticket de TAO-181 y TAO-182, con tokens, ejecuciones, gates, overrides y duración.
  Sumar la foto del corpus: 44 tickets, 31 cerrados, 1 listo para cerrar, 1 en curso, 11 abiertos, 34 con spec y 10 sin planificar.
  Va al KB del caso con su fecha de congelamiento.
- [ ] **F0.3** Auditar en solo lectura los planes ya materializados.
  Correr el pre-flight de superficies y assets sobre los 34 planes ya escritos: el resultado es un informe con los casos y su evidencia, no una enmienda.
  Evidencia de partida: el spec de TAO-181 pide la splash (que es TAO-183) y el tablero (EP-07), ninguno existe: costó 305.199 tokens en una ejecución y obligó al juez a declararlo fuera de alcance en cuatro gates.

**Criterios de cumplimiento:**
- `pnpm vitest run tests/unit/gate-telemetry-capture.test.ts` termina con código 0; esperado: la salida informa la cantidad de tests y 0 fallos.
- Evidencia: el informe de completitud de telemetría con el porcentaje por backend (objetivo: al menos el 90% de las ejecuciones con tokens y duración).
- Evidencia: el baseline del corpus en el KB del caso, con tokens por tipo y por ticket y su fecha de congelamiento.
- Evidencia: el informe de la auditoría de los 34 planes, con los casos que nombran superficies o assets inexistentes.
- La medición no altera ningún ticket: los datos salen de lectura del store y de las ejecuciones ya registradas.

**Esfuerzo:** 2 días

### F1. Desbloquear el análisis de la épica

**Meta:** Que el planificador de dependencias deje de producir candidatos falsos y referencias incompletas, y que el plan de la épica quede sin commits sin registrar, para que su análisis pueda cerrarse y el piloto arrancar sobre un plan confiable.

**Responsable sugerido:** dev

**Antes de empezar:**
- [ ] F0.2 cerrada (el baseline registra el estado del que se parte).
- [ ] El hallazgo del planificador leído: 126 aristas inferidas, metadatos propios como dependencias externas, IDs truncados y auto-referencias en los ocho tickets.

**Tareas:**
- [ ] **F1.1** Excluir las auto-referencias del planificador.
  La referencia propia del handoff del ticket se resuelve a sí misma: GH-59 se resuelve a TAO-181 y genera TAO-181 hacia TAO-181, y ocurre con los ocho tickets del conjunto.
  Fuente: la evaluación de menciones y la resolución por aliases del planificador de épicas (`server/epics/planner.ts`).
- [ ] **F1.2** Resolver los identificadores completos y tratar los metadatos propios como contexto.
  HU-01-17 se recorta a HU-01. Y decisiones, vistas, casos de QA y la propia épica (DEC-102, V-51, QA-01, EP-01, HU-01) aparecen como dependencias externas por decidir, cuando son contexto.
  Las aristas inferidas que sí son reales siguen necesitando decisión humana: el arreglo no las aprueba.
- [ ] **F1.3** Registrar los commits que el plan de la épica no tiene.
  Son 6 en la rama de trabajo, incluidos los 3 del workstream de aceleración (instalación en DSH, integridad del store y autorización de épica).
  Se registran en la fase que corresponde y, si la fase ya está cerrada, como registro tardío con su motivo; si un commit pertenece a otro workstream, se deja esa constancia.
  Hoy frenan el cierre de la fase F10 y el brief del juez.
- [ ] **F1.4** Verificar el planificador con los cuerpos canónicos como fixtures.
  Test con los cuerpos de TAO-181 a TAO-188: cero auto-referencias, cero identificadores truncados, y las aristas externas restantes son decisiones humanas legítimas.
  No se re-planifica la épica real: la verificación es sobre fixtures.

**Criterios de cumplimiento:**
- `pnpm vitest run tests/unit/epic-planner-references.test.ts` termina con código 0; esperado: la salida informa la cantidad de tests y 0 fallos.
- `pnpm typecheck` termina con código 0; esperado: la salida informa la cantidad de errores encontrados (0).
- Evidencia: la comparación de aristas inferidas antes y después (126 contra el conteo nuevo), con las que desaparecen por falsas y las que se conservan porque son reales.
- Evidencia: los 6 commits registrados en el plan de la épica, o la constancia de su workstream cuando no correspondan a una fase.
- La épica nativa y sus tickets quedan intactos: ningún cambio de estado, de spec ni de sesión.

**Esfuerzo:** 2 a 3 días
