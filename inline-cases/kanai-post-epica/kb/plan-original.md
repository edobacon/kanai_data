# Acelerar el motor después del piloto: gate con evidencia real y menos vueltas por ticket

## Objetivo

Reducir a la mitad el costo en tokens y la cantidad de vueltas por ticket sin perder calidad verificable: que el gate verifique de verdad lo que hizo la sesión, que un hallazgo no accionable no dispare un bucle de auto-corrección, que el trabajo se pague por sesión en lugar de por tarea y que la ceremonia de confirmación no cueste vueltas inútiles. El caso está sujeto a análisis de métricas: cada fase se acepta o se revierte comparando contra el baseline congelado del caso pre-épica, y no se activa durante el piloto de la épica.

## Riesgos

- El arreglo del gate puede correr la suite de más y encarecer el cierre: se acota con el alcance por sesión y con el cache de checks que ya existe.
- Menos ejecuciones por ticket puede bajar la cobertura de casos citados: se acepta solo si la tasa de hallazgos reales y los escapes no empeoran.
- Un juez único puede volverse complaciente: la escalación a un segundo juez se fija por umbral de riesgo y se sigue midiendo con la métrica de juez complaciente.
- El cambio de comportamiento del gate afecta a todos los proyectos: entra detrás de una bandera, se prueba primero en un ticket de prueba y recién después va por defecto.
- Verificar de verdad puede bloquear tickets cuyos entornos no corren en el sandbox: se ancla a la config de calidad del proyecto antes de encenderlo.

## Fuera de alcance

- Modificar tickets existentes, en particular los de la épica del piloto: ni su spec, ni sus tareas, ni sus sesiones, ni su estado.
- Re-planificar, reabrir o re-ejecutar tickets ya cerrados.
- Reescribir el motor de FSM, los guards o los contratos DET.
- Tocar la matriz de casos de test por REQ y el brief (1.567 tokens promedio: no es el problema).
- Correr este trabajo durante el piloto de la épica: invalidaría su comparación.

### F1. Que el gate vea lo que hizo la sesión

**Meta:** El gate de cada sesión corre la verificación real sobre los archivos de esa sesión, de modo que el juez juzgue evidencia ejecutada en lugar de auto-reportes y desaparezcan los hallazgos que hoy se aceptan por criterio.

**Responsable sugerido:** dev

**Antes de empezar:**
- [ ] El piloto de la épica cerrado, o su comparación ya congelada y decidida.
- [ ] Los repos y los commits reales de TAO-182 y TAO-181 accesibles en modo lectura, para verificar la resolución de cambios de sesión sin gatear ni modificar esos tickets.

**Tareas:**
- [ ] **F1.1** Resolver los commits de la sesión sin depender del rango entre la base y HEAD.
  Cuando la base y HEAD coinciden (rama acumuladora), ese rango queda vacío y la sesión "no existe" aunque sus commits estén a la vista. Orden propuesto: el registro estructurado de la sesión primero; si falta, derivar por la convención de subject sin rango, o desde el punto de divergencia con la base real del repositorio.
  Archivo principal: `server/repo/preGate.ts`.
- [ ] **F1.2** Aceptar la referencia interna y la externa en el subject del commit.
  Los commits reales del proyecto usan la referencia externa (por ejemplo GH-60) y la propuesta de rama puede traer la interna. Aceptar ambas, conservando el borde de dígito que evita confundir la sesión 1 con la 11.
- [ ] **F1.3** No degradar en silencio y anclar el sandbox.
  Registrar el motivo cuando no hay cambios detectables, intentar el diff acotado al ticket contra la base, y marcar el gate como "sin evidencia" con una acción explícita, en vez de dejar que el juez lo convierta en un hallazgo del cambio.
  Antes de encender la verificación real sobre un proyecto de Flutter, Postgres y Python, anclar ese estado a la config de calidad del proyecto (flaky conocidos y checks no bloqueantes): si el sandbox no puede correr la suite, un gate más estricto frena en lugar de acelerar.

**Criterios de cumplimiento:**
- `pnpm vitest run tests/unit/gate-session-changes.test.ts tests/unit/pre-gate.test.ts` termina con código 0; esperado: la salida informa la cantidad de tests y 0 fallos.
- `pnpm typecheck` termina con código 0; esperado: la salida informa la cantidad de errores encontrados (0).
- Evidencia: la resolución de cambios de sesión sobre los repos reales de TAO-182 y TAO-181 devuelve los archivos de la sesión (comprobación de solo lectura, sin gatear ni modificar esos tickets).
- Evidencia: el próximo gate natural de la épica informa evidencia ejecutada, observado sin intervenir el ticket.
- La bandera se activa primero en un proyecto o ticket de prueba, y el comportamiento por defecto queda igual hasta que el dev apruebe el cambio.

**Esfuerzo:** 2 a 3 días

### F2. Cortar el bucle del gate y el re-litigio

**Meta:** Un hallazgo que el agente no puede resolver (revisión humana de Diseño, una superficie que pertenece a otro ticket, arte faltante) deja de disparar una ejecución de auto-corrección y deja de reaparecer en cada gate del mismo ticket.

**Responsable sugerido:** dev

**Antes de empezar:**
- [ ] F1 cerrada y verificada en un ticket de prueba.
- [ ] La traza de dos gates consecutivos de TAO-182 disponible para comparar.

**Tareas:**
- [ ] **F2.1** Extender la guarda del auto-fix con la clasificación de hallazgos.
  Ya existe una guarda del auto-fix (bloquea cuando hay repos pero no hay directorio de despacho, en `tests/unit/gate-autofix-guard.test.ts`). Se extiende para que la auto-corrección corra únicamente sobre hallazgos accionables por el agente. Criterio de clasificación: ¿existe un cambio de código o de test que cierre el hallazgo? Si la respuesta es no (comparación visual de Diseño, criterio de otro ticket, decisión de producto), es humano.
  Evidencia de partida: en TAO-182 la sesión 2 encadenó gate, auto-corrección y gate otra vez en dos minutos, con un cierre de gate de 187 segundos.
- [ ] **F2.2** Aceptar y recordar el hallazgo no accionable.
  La persistencia de hallazgos con severidad, origen y decisión ya existe (`gate-findings.test.ts` y `gate-override.test.ts`): lo que falta es suprimir la repetición.
  Persistir la aceptación por ticket y firma del hallazgo, y no volver a levantarlo en los gates siguientes del mismo ticket, dejándolo visible en el dossier. Evidencia de partida: el mismo hallazgo de fidelidad visual aparece en cuatro gates de TAO-181.
- [ ] **F2.3** Verificar la existencia de las superficies y los assets que el plan nombra, antes de materializarlo.
  Si una tarea o un criterio nombra una vista, un widget o un asset, el pre-flight comprueba que exista o que esté planificado en otro ticket. Si no, la tarea queda marcada como dependiente y se pide confirmación en lugar de crearla.
  Evidencia de partida: una ejecución de 305.199 tokens para descubrir que la splash no existe, y 415.223 tokens bloqueados por entregables de Diseño faltantes, repetidos después en 460.610.

**Criterios de cumplimiento:**
- `pnpm vitest run tests/unit/gate-autofix-guard.test.ts tests/unit/gate-findings.test.ts tests/unit/gate-override.test.ts` termina con código 0; esperado: la salida informa la cantidad de tests y 0 fallos.
- Evidencia: la traza de TAO-182 posterior al cambio muestra como máximo dos gates por sesión.
- Evidencia: cero hallazgos repetidos entre gates consecutivos del mismo ticket, comparando contra la traza previa.
- Ninguna tarea que nombre una superficie inexistente se materializa sin confirmación.

**Esfuerzo:** 3 a 4 días

### F3. Menos ejecuciones con el mismo resultado

**Meta:** Bajar a la mitad los tokens por ticket moviendo el costo de cada tarea a cada sesión, sin perder casos citados ni evidencia.

**Responsable sugerido:** dev

**Antes de empezar:**
- [ ] F1 cerrada (el gate ya verifica de verdad: sin eso, este recorte pierde calidad).
- [ ] El baseline del caso pre-épica disponible para comparar.

**Tareas:**
- [ ] **F3.1** Ejecutar por sesión en lugar de por tarea.
  La preparación de ejecución acepta el alcance de la sesión y arma un brief con sus tareas; el subagente reporta por tarea con hitos y resultado, con el mismo token de ejecución.
  El plan del ticket no cambia: se agrupa el despacho de las tareas ya definidas, sin reescribirlas ni reordenarlas.
  Evidencia de partida: 15 ejecuciones de developer en TAO-181, con un costo de 285.000 a 1.557.000 tokens de entrada cada una; los runs de developer explican el 73% del gasto del ticket.
- [ ] **F3.2** Verificación por costo.
  Tests acotados al diff en cada paso y una sola suite completa por sesión, en el gate. Ajustar la skill de ejecución de tarea en consecuencia.
  Evidencia de partida: la suite completa de Flutter se corrió una vez por tarea (941, 942, 926, 925, 923, 919, 912, 898, 883, 872 y 452 tests).
- [ ] **F3.3** Juez único por defecto, con escalación a un segundo juez.
  Escala cuando hay discrepancia, cuando el diff toca zonas de riesgo o cuando el ticket es de nivel alto. Configurable por proyecto.
  Evidencia de partida: los dos jueces son el mismo modelo que ejecutó (deepseek-flash en TAO-181, gpt-6.1-sol en TAO-182).
- [ ] **F3.4** Reducir el churn del store.
  Dejar de re-proyectar el spec en cada mutación (volcarlo al cerrar la sesión) y agrupar las actualizaciones de casos de test.
  Evidencia de partida: 1.704 re-proyecciones del cuerpo del spec y 738 actualizaciones de casos de test en 44 tickets.

**Criterios de cumplimiento:**
- `pnpm vitest run tests/unit/session-scoped-execution.test.ts tests/unit/gate-judge-escalation.test.ts` termina con código 0; esperado: la salida informa la cantidad de tests y 0 fallos.
- Evidencia: la comparación de tokens por ticket contra el baseline del caso pre-épica muestra una reducción de al menos el 50% en TAO-181 y TAO-182.
- La tasa de hallazgos reales por gate no empeora respecto del baseline y la métrica de escapes por modelo no sube.
- El número de re-proyecciones del spec por ticket baja a una por cierre de sesión.

**Esfuerzo:** 3 a 5 días

### F4. Ceremonia de confirmación humana

**Meta:** Dejar de pagar vueltas por confirmaciones que el host no puede mostrar, sin perder la trazabilidad de quién autorizó qué.

**Responsable sugerido:** dev

**Antes de empezar:**
- [ ] F1 cerrada, para no mezclar el arreglo de evidencia con el de autorizaciones.

**Tareas:**
- [ ] **F4.1** Detectar en el handshake si el host soporta confirmación interactiva y registrar la autorización como declarada por el agente, sin la vuelta del código fuera de banda. Queda auditada igual.
  Evidencia de partida: 41 de 93 autorizaciones humanas se resolvieron sin confirmación de la persona.
- [ ] **F4.2** Revisar las autorizaciones que se concedieron y nunca se aplicaron.
  Evidencia de partida: 12 autorizaciones concedidas sin efecto.

**Criterios de cumplimiento:**
- `pnpm vitest run tests/unit/human-authorization.test.ts` termina con código 0; esperado: la salida informa la cantidad de tests y 0 fallos.
- Evidencia: la métrica de autorizaciones humanas sin confirmación distingue las declaradas por el agente de las pedidas y no mostradas.
- Cero autorizaciones concedidas sin aplicación, o cada una con su motivo registrado.

**Esfuerzo:** 1 día

### F5. Análisis de métricas y decisión

**Meta:** Aceptar, ajustar o revertir lo hecho con números comparables contra el baseline, y dejar registrada la decisión.

**Responsable sugerido:** dev

**Antes de empezar:**
- [ ] F1 a F4 cerradas, con su evidencia registrada.
- [ ] El baseline congelado del caso pre-épica accesible.

**Tareas:**
- [ ] **F5.1** Comparar el gasto contra el baseline.
  Mismo desglose que el baseline (tokens por tipo de ejecución y por ticket, ejecuciones, gates, overrides y duración), sobre los tickets que se ejecutaron después del cambio. Sin mezclar cohortes ni atribuir causalidad con muestra insuficiente.
- [ ] **F5.2** Verificar que la calidad no cayó.
  Tasa de hallazgos reales por gate, escapes por modelo, casos de test citados y promovidos, y tickets que cerraron con menos evidencia que antes. Cualquier caída frena la expansión.
- [ ] **F5.3** Registrar la decisión.
  Expansión a otros proyectos, ajuste del alcance o reversión, con el motivo y las fases afectadas.

**Criterios de cumplimiento:**
- Evidencia: la comparación contra el baseline del caso pre-épica, con el porcentaje de reducción de tokens y de vueltas por ticket y el tamaño de la muestra.
- Evidencia: el informe de calidad con la tasa de hallazgos reales, los escapes y los casos promovidos, comparado con el baseline.
- La decisión de expansión, ajuste o reversión queda registrada con su motivo, y ninguna fase se da por buena sin su comparación.

**Esfuerzo:** 1 a 2 días
