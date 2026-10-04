# Plan inline: Desbloquear el análisis de la épica y dejar el terreno medido (pre-piloto)

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Dejar la épica lista para iniciar su piloto: corregir el planificador de dependencias que hoy produce auto-referencias y referencias truncadas, registrar los commits que el plan no tiene, cerrar la telemetría que falta y congelar el baseline del flujo actual. No modifica tickets ni enciende cambios de flujo: es requisito previo del piloto y medición. Cierra con una prueba controlada que mide si la corrección se tradujo en mejora, antes de dar por listo el arranque.
**Tags:** repos: kanai-app · branches: codex/epicas-autonomas · labels: pre-piloto, planificador, telemetria, baseline
**Estado:** 0 de 3 fases cerradas. Juez final: pendiente.

## Registro de avance

| Fase | Meta | Estado | Fecha real | Commits | Criterios | Pendiente |
|---|---|---|---|---|---|---|
| F0 Telemetría y baseline del flujo actual | Que el flujo actual quede medido con números propios, para que el piloto tenga contra qué compararse y para que ninguna mejora posterior se atribuya sin dato. | Pendiente | - → - | - | 0/5 | F0.1; F0.2; F0.3 |
| F1 Desbloquear el análisis de la épica | Que el planificador de dependencias deje de producir candidatos falsos y referencias incompletas, y que el plan de la épica quede sin commits sin registrar, para que su análisis pueda cerrarse y el piloto arrancar sobre un plan confiable. | Pendiente | - → - | - | 0/5 | F1.1; F1.2; F1.3; F1.4 |
| F2 Validación post-ejecución: prueba controlada y medición de mejora | Comprobar con una prueba controlada que lo implementado se tradujo en la mejora buscada, midiendo antes y después con el mismo instrumento, antes de dar por listo el arranque del piloto. | Pendiente | - → - | - | 0/6 | F2.1; F2.2; F2.3; F2.4 |

## Riesgos

- Corregir el planificador cambia las aristas inferidas: hay que comparar contra las 126 actuales y revisar que no desaparezcan dependencias reales.
- El baseline puede quedar contaminado si algo del motor cambia después de congelarlo: se congela al final y se anota su fecha y su alcance.
- Tocar la épica nativa de taomangalam está fuera de alcance: la verificación del planificador se hace con los cuerpos canónicos como fixtures.
- Usar el proyecto real como banco de pruebas: la prueba controlada corre sobre un proyecto demo aislado, con identificadores de prueba.

## Fuera de alcance

- Modificar tickets, specs, estados o sesiones de taomangalam, incluida la épica EP-01 en ejecución.
- Re-planificar la épica nativa: la verificación usa sus cuerpos como fixtures, no corre el planificador sobre la épica real.
- Los cambios de flujo del caso post-épica (evidencia del gate, corte del bucle de auto-corrección, ejecución por sesión): contaminarían la comparación del piloto.
- Declarar mejora sin medirla: la prueba controlada compara antes y después con el mismo instrumento, y si no hay mejora se registra el hallazgo en vez de cerrar.

## Fases

### F0. Telemetría y baseline del flujo actual

**Meta:** Que el flujo actual quede medido con números propios, para que el piloto tenga contra qué compararse y para que ninguna mejora posterior se atribuya sin dato.
**Responsable sugerido:** dev
**Esfuerzo:** 2 días

**Registro F0** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F0.pre1: Node 24 y pnpm disponibles, con las dependencias de kanai-app al día.
  - [ ] F0.pre2: Store vivo accesible en modo lectura y el data repo sin cambios propios pendientes.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F0.1** pendiente: Cerrar la telemetría por ejecución.
  - **F0.2** pendiente: Congelar el baseline del corpus.
  - **F0.3** pendiente: Auditar en solo lectura los planes ya materializados.
- **Criterios cumplidos:**
  - **F0.c1** pendiente (command): `pnpm vitest run tests/unit/gate-telemetry-capture.test.ts` termina con código 0; esperado: la salida informa la cantidad de tests y 0 fallos.
  - **F0.c2** pendiente (evidence): Evidencia: el informe de completitud de telemetría con el porcentaje por backend (objetivo: al menos el 90% de las ejecuciones con tokens y duración).
  - **F0.c3** pendiente (evidence): Evidencia: el baseline del corpus en el KB del caso, con tokens por tipo y por ticket y su fecha de congelamiento.
  - **F0.c4** pendiente (evidence): Evidencia: el informe de la auditoría de los 34 planes, con los casos que nombran superficies o assets inexistentes.
  - **F0.c5** pendiente (manual): La medición no altera ningún ticket: los datos salen de lectura del store y de las ejecuciones ya registradas.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F1. Desbloquear el análisis de la épica

**Meta:** Que el planificador de dependencias deje de producir candidatos falsos y referencias incompletas, y que el plan de la épica quede sin commits sin registrar, para que su análisis pueda cerrarse y el piloto arrancar sobre un plan confiable.
**Responsable sugerido:** dev
**Esfuerzo:** 2 a 3 días

**Registro F1** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F1.pre1: F0.2 cerrada (el baseline registra el estado del que se parte).
  - [ ] F1.pre2: El hallazgo del planificador leído: 126 aristas inferidas, metadatos propios como dependencias externas, IDs truncados y auto-referencias en los ocho tickets.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F1.1** pendiente: Excluir las auto-referencias del planificador.
  - **F1.2** pendiente: Resolver los identificadores completos y tratar los metadatos propios como contexto.
  - **F1.3** pendiente: Registrar los commits que el plan de la épica no tiene.
  - **F1.4** pendiente: Verificar el planificador con los cuerpos canónicos como fixtures.
- **Criterios cumplidos:**
  - **F1.c1** pendiente (command): `pnpm vitest run tests/unit/epic-planner-references.test.ts` termina con código 0; esperado: la salida informa la cantidad de tests y 0 fallos.
  - **F1.c2** pendiente (command): `pnpm typecheck` termina con código 0; esperado: la salida informa la cantidad de errores encontrados (0).
  - **F1.c3** pendiente (evidence): Evidencia: la comparación de aristas inferidas antes y después (126 contra el conteo nuevo), con las que desaparecen por falsas y las que se conservan porque son reales.
  - **F1.c4** pendiente (evidence): Evidencia: los 6 commits registrados en el plan de la épica, o la constancia de su workstream cuando no correspondan a una fase.
  - **F1.c5** pendiente (manual): La épica nativa y sus tickets quedan intactos: ningún cambio de estado, de spec ni de sesión.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F2. Validación post-ejecución: prueba controlada y medición de mejora

**Meta:** Comprobar con una prueba controlada que lo implementado se tradujo en la mejora buscada, midiendo antes y después con el mismo instrumento, antes de dar por listo el arranque del piloto.
**Responsable sugerido:** dev
**Esfuerzo:** 1 a 2 días

**Registro F2** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F2.pre1: F1 cerrada: el planificador corregido y los commits registrados.
  - [ ] F2.pre2: El baseline de F0.2 disponible: es el lado "antes" de la comparación.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F2.1** pendiente: Diseñar la prueba controlada y declarar los valores esperados antes de correrla.
  - **F2.2** pendiente: Ejecutar la prueba y capturar los números.
  - **F2.3** pendiente: Comparar y decidir si hubo mejora.
  - **F2.4** pendiente: Registrar el resultado y la decisión de arranque del piloto.
- **Criterios cumplidos:**
  - **F2.c1** pendiente (command): `pnpm vitest run tests/unit/epic-planner-references.test.ts` termina con código 0; esperado: la salida informa la cantidad de tests y 0 fallos.
  - **F2.c2** pendiente (evidence): Evidencia: el escenario de la prueba con su proyecto demo aislado y los valores esperados declarados antes de correrla.
  - **F2.c3** pendiente (evidence): Evidencia: la medición antes y después con el mismo instrumento, con los cuatro indicadores y su comparación.
  - **F2.c4** pendiente (evidence): Evidencia: la conclusión explícita sobre si hubo mejora, con el dato que la sostiene y la recomendación de arranque del piloto.
  - **F2.c5** pendiente (evidence): Evidencia: el estado del suite completo y la decisión sobre el rojo preexistente (corregido acá o documentado como excepción).
  - **F2.c6** pendiente (manual): La prueba no toca el proyecto real: se corre sobre un proyecto demo aislado cuyos identificadores no son de un proyecto real.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Enmienda: Agrega la fase F2 de validación post-ejecución: una prueba controlada sobre un proyecto demo aislado que mide antes y después si la corrección del planificador y la telemetría se tradujeron en mejora, con decisión registrada. Suma el riesgo del banco de pruebas y el fuera de alcance de declarar mejora sin medirla.. Motivo: Pedido de la persona: el caso pre-piloto debe cerrar con una etapa de validación posterior a la ejecución de una prueba, para ver si el trabajo se tradujo en mejora antes de arrancar el piloto. La prueba corre sobre un proyecto demo aislado y no toca el proyecto real.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.
