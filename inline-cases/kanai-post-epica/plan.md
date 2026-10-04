# Plan inline: Acelerar el motor después del piloto: gate con evidencia real y menos vueltas por ticket

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Reducir a la mitad el costo en tokens y la cantidad de vueltas por ticket sin perder calidad verificable: que el gate verifique de verdad lo que hizo la sesión, que un hallazgo no accionable no dispare un bucle de auto-corrección, que el trabajo se pague por sesión en lugar de por tarea y que la ceremonia de confirmación no cueste vueltas inútiles. El caso está sujeto a análisis de métricas: cada fase se acepta o se revierte comparando contra el baseline congelado del caso pre-épica, y no se activa durante el piloto de la épica. Antes de tocar el motor, una fase de análisis y validación decide si cada cambio es aplicable y con qué alcance: se ejecuta como está, se re-encuadra o se descarta.
**Tags:** repos: kanai-app · branches: codex/epicas-autonomas · labels: post-piloto, gate, evidencia, metricas
**Estado:** 0 de 6 fases cerradas. Juez final: pendiente.

## Registro de avance

| Fase | Meta | Estado | Fecha real | Commits | Criterios | Pendiente |
|---|---|---|---|---|---|---|
| F0 Análisis y validación de aplicabilidad (antes de ejecutar) | Determinar, antes de tocar el motor, si cada cambio es aplicable tal como está escrito y con qué alcance: reproducir el problema en el código actual, inventariar lo que ya existe para reutilizar, medir el impacto sobre los proyectos y los hosts, y decidir fase por fase si se ejecuta, se re-encuadra o se descarta. | Pendiente | - → - | - | 0/6 | F0.1; F0.2; F0.3; F0.4 |
| F1 Que el gate vea lo que hizo la sesión | El gate de cada sesión corre la verificación real sobre los archivos de esa sesión, de modo que el juez juzgue evidencia ejecutada en lugar de auto-reportes y desaparezcan los hallazgos que hoy se aceptan por criterio. | Pendiente | - → - | - | 0/5 | F1.1; F1.2; F1.3 |
| F2 Cortar el bucle del gate y el re-litigio | Un hallazgo que el agente no puede resolver (revisión humana de Diseño, una superficie que pertenece a otro ticket, arte faltante) deja de disparar una ejecución de auto-corrección y deja de reaparecer en cada gate del mismo ticket. | Pendiente | - → - | - | 0/4 | F2.1; F2.2; F2.3 |
| F3 Menos ejecuciones con el mismo resultado | Bajar a la mitad los tokens por ticket moviendo el costo de cada tarea a cada sesión, sin perder casos citados ni evidencia. | Pendiente | - → - | - | 0/4 | F3.1; F3.2; F3.3; F3.4 |
| F4 Ceremonia de confirmación humana | Dejar de pagar vueltas por confirmaciones que el host no puede mostrar, sin perder la trazabilidad de quién autorizó qué. | Pendiente | - → - | - | 0/3 | F4.1; F4.2 |
| F5 Análisis de métricas y decisión | Aceptar, ajustar o revertir lo hecho con números comparables contra el baseline, y dejar registrada la decisión. | Pendiente | - → - | - | 0/3 | F5.1; F5.2; F5.3 |

## Riesgos

- El arreglo del gate puede correr la suite de más y encarecer el cierre: se acota con el alcance por sesión y con el cache de checks que ya existe.
- Menos ejecuciones por ticket puede bajar la cobertura de casos citados: se acepta solo si la tasa de hallazgos reales y los escapes no empeoran.
- Un juez único puede volverse complaciente: la escalación a un segundo juez se fija por umbral de riesgo y se sigue midiendo con la métrica de juez complaciente.
- El cambio de comportamiento del gate afecta a todos los proyectos: entra detrás de una bandera, se prueba primero en un ticket de prueba y recién después va por defecto.
- Verificar de verdad puede bloquear tickets cuyos entornos no corren en el sandbox: se ancla a la config de calidad del proyecto antes de encenderlo.
- Una fase puede no ser aplicable tal como está escrita: la validación previa la re-encuadra o la descarta, no la fuerza.

## Fuera de alcance

- Modificar tickets existentes, en particular los de la épica del piloto: ni su spec, ni sus tareas, ni sus sesiones, ni su estado.
- Re-planificar, reabrir o re-ejecutar tickets ya cerrados.
- Reescribir el motor de FSM, los guards o los contratos DET.
- Tocar la matriz de casos de test por REQ y el brief (1.567 tokens promedio: no es el problema).
- Correr este trabajo durante el piloto de la épica: invalidaría su comparación.
- Escribir código de las fases de ejecución antes de que la validación de aplicabilidad esté aprobada.

## Fases

### F0. Análisis y validación de aplicabilidad (antes de ejecutar)

**Meta:** Determinar, antes de tocar el motor, si cada cambio es aplicable tal como está escrito y con qué alcance: reproducir el problema en el código actual, inventariar lo que ya existe para reutilizar, medir el impacto sobre los proyectos y los hosts, y decidir fase por fase si se ejecuta, se re-encuadra o se descarta.
**Responsable sugerido:** dev
**Esfuerzo:** 1 a 2 días

**Registro F0** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F0.pre1: El piloto de la épica cerrado o su comparación ya congelada: la validación no lo altera, pero la decisión de aplicar depende de él.
  - [ ] F0.pre2: El baseline del caso pre-épica disponible: es la referencia contra la que se decide.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F0.1** pendiente: Reproducir el problema central en el código actual y aislar la causa.
  - **F0.2** pendiente: Inventariar qué existe para reutilizar y qué falta.
  - **F0.3** pendiente: Analizar el impacto de encender la verificación real.
  - **F0.4** pendiente: Decidir la aplicabilidad fase por fase.
- **Criterios cumplidos:**
  - **F0.c1** pendiente (evidence): Evidencia: la causa aislada del problema central, con el test que la reproduce y su salida en rojo (es el estado que la fase siguiente tiene que cambiar).
  - **F0.c2** pendiente (evidence): Evidencia: el inventario de reutilización con archivo y línea por pieza, y el mapa de qué fase toca qué archivo.
  - **F0.c3** pendiente (evidence): Evidencia: el análisis de impacto con los proyectos y hosts afectados, el costo estimado por gate, la bandera propuesta y las condiciones de reversión.
  - **F0.c4** pendiente (evidence): Evidencia: el go/no-go por fase, con las que se re-encuadran o se descartan y su motivo.
  - **F0.c5** pendiente (manual): La decisión de aplicabilidad queda aprobada por la persona antes de escribir código de las fases siguientes.
  - **F0.c6** pendiente (command): `pnpm typecheck` termina con código 0; esperado: la salida informa la cantidad de errores encontrados (0).
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Enmienda: Agrega la fase F0 de análisis y validación de aplicabilidad antes de las fases de ejecución, y su prerequisito en F1. También suma el riesgo de fases no aplicables y el fuera de alcance de escribir código antes de validar.. Motivo: Pedido de la persona: el caso post-piloto debe incluir una fase que analice y valide lo que se va a ejecutar antes de ejecutarlo, para saber si cada cambio es aplicable y con qué alcance. La validación es de solo lectura y su decisión se aprueba antes de escribir código.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F1. Que el gate vea lo que hizo la sesión

**Meta:** El gate de cada sesión corre la verificación real sobre los archivos de esa sesión, de modo que el juez juzgue evidencia ejecutada en lugar de auto-reportes y desaparezcan los hallazgos que hoy se aceptan por criterio.
**Responsable sugerido:** dev
**Esfuerzo:** 2 a 3 días

**Registro F1** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F1.pre1: El piloto de la épica cerrado, o su comparación ya congelada y decidida.
  - [ ] F1.pre2: Los repos y los commits reales de TAO-182 y TAO-181 accesibles en modo lectura, para verificar la resolución de cambios de sesión sin gatear ni modificar esos tickets.
  - [ ] F1.pre3: F0 cerrada: la aplicabilidad de esta fase decidida y aprobada.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F1.1** pendiente: Resolver los commits de la sesión sin depender del rango entre la base y HEAD.
  - **F1.2** pendiente: Aceptar la referencia interna y la externa en el subject del commit.
  - **F1.3** pendiente: No degradar en silencio y anclar el sandbox.
- **Criterios cumplidos:**
  - **F1.c1** pendiente (command): `pnpm vitest run tests/unit/gate-session-changes.test.ts tests/unit/pre-gate.test.ts` termina con código 0; esperado: la salida informa la cantidad de tests y 0 fallos.
  - **F1.c2** pendiente (command): `pnpm typecheck` termina con código 0; esperado: la salida informa la cantidad de errores encontrados (0).
  - **F1.c3** pendiente (evidence): Evidencia: la resolución de cambios de sesión sobre los repos reales de TAO-182 y TAO-181 devuelve los archivos de la sesión (comprobación de solo lectura, sin gatear ni modificar esos tickets).
  - **F1.c4** pendiente (evidence): Evidencia: el próximo gate natural de la épica informa evidencia ejecutada, observado sin intervenir el ticket.
  - **F1.c5** pendiente (manual): La bandera se activa primero en un proyecto o ticket de prueba, y el comportamiento por defecto queda igual hasta que el dev apruebe el cambio.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F2. Cortar el bucle del gate y el re-litigio

**Meta:** Un hallazgo que el agente no puede resolver (revisión humana de Diseño, una superficie que pertenece a otro ticket, arte faltante) deja de disparar una ejecución de auto-corrección y deja de reaparecer en cada gate del mismo ticket.
**Responsable sugerido:** dev
**Esfuerzo:** 3 a 4 días

**Registro F2** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F2.pre1: F1 cerrada y verificada en un ticket de prueba.
  - [ ] F2.pre2: La traza de dos gates consecutivos de TAO-182 disponible para comparar.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F2.1** pendiente: Extender la guarda del auto-fix con la clasificación de hallazgos.
  - **F2.2** pendiente: Aceptar y recordar el hallazgo no accionable.
  - **F2.3** pendiente: Verificar la existencia de las superficies y los assets que el plan nombra, antes de materializarlo.
- **Criterios cumplidos:**
  - **F2.c1** pendiente (command): `pnpm vitest run tests/unit/gate-autofix-guard.test.ts tests/unit/gate-findings.test.ts tests/unit/gate-override.test.ts` termina con código 0; esperado: la salida informa la cantidad de tests y 0 fallos.
  - **F2.c2** pendiente (evidence): Evidencia: la traza de TAO-182 posterior al cambio muestra como máximo dos gates por sesión.
  - **F2.c3** pendiente (evidence): Evidencia: cero hallazgos repetidos entre gates consecutivos del mismo ticket, comparando contra la traza previa.
  - **F2.c4** pendiente (manual): Ninguna tarea que nombre una superficie inexistente se materializa sin confirmación.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F3. Menos ejecuciones con el mismo resultado

**Meta:** Bajar a la mitad los tokens por ticket moviendo el costo de cada tarea a cada sesión, sin perder casos citados ni evidencia.
**Responsable sugerido:** dev
**Esfuerzo:** 3 a 5 días

**Registro F3** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F3.pre1: F1 cerrada (el gate ya verifica de verdad: sin eso, este recorte pierde calidad).
  - [ ] F3.pre2: El baseline del caso pre-épica disponible para comparar.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F3.1** pendiente: Ejecutar por sesión en lugar de por tarea.
  - **F3.2** pendiente: Verificación por costo.
  - **F3.3** pendiente: Juez único por defecto, con escalación a un segundo juez.
  - **F3.4** pendiente: Reducir el churn del store.
- **Criterios cumplidos:**
  - **F3.c1** pendiente (command): `pnpm vitest run tests/unit/session-scoped-execution.test.ts tests/unit/gate-judge-escalation.test.ts` termina con código 0; esperado: la salida informa la cantidad de tests y 0 fallos.
  - **F3.c2** pendiente (evidence): Evidencia: la comparación de tokens por ticket contra el baseline del caso pre-épica muestra una reducción de al menos el 50% en TAO-181 y TAO-182.
  - **F3.c3** pendiente (manual): La tasa de hallazgos reales por gate no empeora respecto del baseline y la métrica de escapes por modelo no sube.
  - **F3.c4** pendiente (manual): El número de re-proyecciones del spec por ticket baja a una por cierre de sesión.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F4. Ceremonia de confirmación humana

**Meta:** Dejar de pagar vueltas por confirmaciones que el host no puede mostrar, sin perder la trazabilidad de quién autorizó qué.
**Responsable sugerido:** dev
**Esfuerzo:** 1 día

**Registro F4** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F4.pre1: F1 cerrada, para no mezclar el arreglo de evidencia con el de autorizaciones.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F4.1** pendiente: Detectar en el handshake si el host soporta confirmación interactiva y registrar la autorización como declarada por el agente, sin la vuelta del código fuera de banda. Queda auditada igual.
  - **F4.2** pendiente: Revisar las autorizaciones que se concedieron y nunca se aplicaron.
- **Criterios cumplidos:**
  - **F4.c1** pendiente (command): `pnpm vitest run tests/unit/human-authorization.test.ts` termina con código 0; esperado: la salida informa la cantidad de tests y 0 fallos.
  - **F4.c2** pendiente (evidence): Evidencia: la métrica de autorizaciones humanas sin confirmación distingue las declaradas por el agente de las pedidas y no mostradas.
  - **F4.c3** pendiente (manual): Cero autorizaciones concedidas sin aplicación, o cada una con su motivo registrado.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F5. Análisis de métricas y decisión

**Meta:** Aceptar, ajustar o revertir lo hecho con números comparables contra el baseline, y dejar registrada la decisión.
**Responsable sugerido:** dev
**Esfuerzo:** 1 a 2 días

**Registro F5** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F5.pre1: F1 a F4 cerradas, con su evidencia registrada.
  - [ ] F5.pre2: El baseline congelado del caso pre-épica accesible.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F5.1** pendiente: Comparar el gasto contra el baseline.
  - **F5.2** pendiente: Verificar que la calidad no cayó.
  - **F5.3** pendiente: Registrar la decisión.
- **Criterios cumplidos:**
  - **F5.c1** pendiente (evidence): Evidencia: la comparación contra el baseline del caso pre-épica, con el porcentaje de reducción de tokens y de vueltas por ticket y el tamaño de la muestra.
  - **F5.c2** pendiente (evidence): Evidencia: el informe de calidad con la tasa de hallazgos reales, los escapes y los casos promovidos, comparado con el baseline.
  - **F5.c3** pendiente (manual): La decisión de expansión, ajuste o reversión queda registrada con su motivo, y ninguna fase se da por buena sin su comparación.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.
