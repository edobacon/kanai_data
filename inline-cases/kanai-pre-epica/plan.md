# Plan inline: Desbloquear el análisis de la épica y dejar el terreno medido (pre-piloto)

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Dejar la épica lista para iniciar su piloto: corregir el planificador de dependencias que hoy produce auto-referencias y referencias truncadas, registrar los commits que el plan no tiene, cerrar la telemetría que falta y congelar el baseline del flujo actual. No modifica tickets ni enciende cambios de flujo: es requisito previo del piloto y medición. Cierra con una prueba controlada que mide si la corrección se tradujo en mejora, antes de dar por listo el arranque.
**Tags:** repos: kanai-app · branches: codex/epicas-autonomas · labels: pre-piloto, planificador, telemetria, baseline
**Estado:** 2 de 3 fases cerradas. Juez final: pendiente.

## Registro de avance

| Fase | Meta | Estado | Fecha real | Commits | Criterios | Pendiente |
|---|---|---|---|---|---|---|
| F0 Telemetría y baseline del flujo actual | Que el flujo actual quede medido con números propios, para que el piloto tenga contra qué compararse y para que ninguna mejora posterior se atribuya sin dato. | Hecho | 2026-10-04 → 2026-10-04 | abe6359, b7cb29d | 5/5 | - |
| F1 Desbloquear el análisis de la épica | Que el planificador de dependencias deje de producir candidatos falsos y referencias incompletas, y que el plan de la épica quede sin commits sin registrar, para que su análisis pueda cerrarse y el piloto arrancar sobre un plan confiable. | Hecho | 2026-10-04 → 2026-10-04 | c29530d | 5/5 | - |
| F2 Validación post-ejecución: prueba controlada y medición de mejora | Comprobar con una prueba controlada que lo implementado se tradujo en la mejora buscada, midiendo antes y después con el mismo instrumento, antes de dar por listo el arranque del piloto. | En curso | 2026-10-04 → - | e6478a7, aacbbca | 0/6 | F2.1; F2.2; F2.3; F2.4 |

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

**Registro F0** (estado: Hecho)
- **Fecha real:** inicio 2026-10-04 · fin 2026-10-04
- **Antes de empezar:**
  - [x] F0.pre1: Node 24 y pnpm disponibles, con las dependencias de kanai-app al día. (Node 24 disponible vía nvm (v24.21.0; el node del shell sin nvm es 22, por eso se usa el prefijo de nvm). pnpm 10.33.0 y dependencias al día: en esta sesión corrieron pnpm typecheck y la suite completa (2732 tests) sobre el árbol actual.)
  - [x] F0.pre2: Store vivo accesible en modo lectura y el data repo sin cambios propios pendientes. (Store vivo leído en modo lectura durante toda la sesión (~/.kanai/data/kanai_data/kanai.db) sin escrituras de datos. El data repo tiene 9 archivos modificados que pertenecen a la épica en curso (TAO-181/182), no a este caso: no se commitea nada ajeno.)
- **Commits:**
  - `abe6359` · fix(telemetria): guarda el backend del run canonico en agent_runs · kanai-app/codex/epicas-autonomas (verificado)
  - `b7cb29d` · fix(inline): un commit se registra en su fase de destino aunque no este iniciada · kanai-app/codex/epicas-autonomas (verificado)
- **Qué se hizo:**
  - **F0.1** → Cerré lo cerrable desde kanai-app de la telemetría por ejecución: medí la completitud real por backend y canonicalicé el backend en los dos puntos de escritura de agent_runs.. Dónde: server/dispatch/persist.ts y tests/unit/persist-backend-label.test.ts; el informe queda en baseline-flujo-actual.md §2 del KB del caso.. Cómo se comprobó: Medición de solo lectura sobre el store (PRAGMA query_only): 1684 ejecuciones, 63% con duración y 67% con tokens; por backend ya canonicalizado OpenCode 785 (65%/76%), Claude Code 822 (61%/57%), Codex 47 (85%/85%). El test nuevo cubre el contrato del label canónico y el caso de un valor que no es backend ('motor' se conserva). · ejecutó: llm, `pnpm vitest run tests/unit/persist-backend-label.test.ts tests/unit/persist-waiting.test.ts tests/unit/roadmap-metrics.test.ts tests/unit/salud.test.ts`, salida 0, 4 archivos, 21 passing, 0 failing
  - **F0.2** → Congelé el baseline del flujo actual: desglose por tipo de ejecución y por ticket, más la foto del corpus.. Dónde: baseline-flujo-actual.md en el KB del caso (kind: registro), con fecha de congelamiento 2026-10-04.. Cómo se comprobó: Lectura del store (agent_runs y gate_runs) con PRAGMA query_only: 44 tickets (31 cerrados, 1 listo, 1 en curso, 11 abiertos), 34 con spec y 10 sin planificar; 1684 ejecuciones y 361.055.325 tokens; desglose por rol y por ticket de TAO-181 y TAO-182, y top de tickets por tokens. Agrupa por backend canónico.
  - **F0.3** → Audité en solo lectura los planes ya materializados y reporté los que citan archivos que no existen en el repositorio del proyecto.. Dónde: auditoria-planes-materializados.md en el KB del caso (kind: analisis); script de solo lectura sobre ~/.kanai/data/kanai_data/projects/taomangalam/specs.. Cómo se comprobó: Extracción mecánica de las referencias a archivos citadas en cada spec y contraste contra los archivos versionados del repo del proyecto (git ls-files). 34 specs auditados, 22 con referencias, 10 con al menos una inexistente: 186 referencias revisadas y 15 inexistentes. Ningún plan fue modificado.
- **Criterios cumplidos:**
  - **F0.c1** `pnpm vitest run tests/unit/gate-telemetry-capture.test.ts` termina con código 0; esperado: la salida informa la cantidad de tests y 0 fallos. → Reportado por la persona desde su terminal: 1 archivo, 10 passing, 0 failing, exit 0. Corrido en 1,30 s. Nota del entorno: lo corrió el node del shell (v22.22.2) y pnpm avisó 'Unsupported engine: wanted node >=24'; el repo pide 24, así que la corrida canónica del piloto va con el prefijo de nvm. · ejecutó: dev, `pnpm vitest run tests/unit/gate-telemetry-capture.test.ts`, salida 0, 10 passing, 0 failing
  - **F0.c2** Evidencia: el informe de completitud de telemetría con el porcentaje por backend (objetivo: al menos el 90% de las ejecuciones con tokens y duración). → Informe de completitud de telemetría en baseline-flujo-actual.md §2: 63% de las ejecuciones con duración y 67% con tokens sobre 1684 ejecuciones. Por backend canonico: OpenCode 785 runs (65% duración / 76% tokens), Claude Code 822 (61%/57%), Codex 47 (85%/85%), LLM local 19 (68%/68%), motor 11 (0%/0%). Ningún backend alcanza el 90%: el objetivo queda como hueco del host.
  - **F0.c3** Evidencia: el baseline del corpus en el KB del caso, con tokens por tipo y por ticket y su fecha de congelamiento. → baseline-flujo-actual.md (registro del KB del caso, congelado 2026-10-04) con tokens y duración por tipo de ejecución, por ticket de TAO-181 y TAO-182, top de tickets por tokens, y la foto del corpus: 44 / 31 / 1 / 1 / 11 / 34 con spec / 10 sin planificar.
  - **F0.c4** Evidencia: el informe de la auditoría de los 34 planes, con los casos que nombran superficies o assets inexistentes. → auditoria-planes-materializados.md: 34 specs auditados, 22 con referencias a archivos, 10 con al menos una inexistente (15 de 186 referencias). Los casos con más referencias faltantes: TAO-162 (3), TAO-163 (2) y TAO-158, TAO-164, TAO-166, TAO-172 (1 cada uno). El alcance es mecánico (existencia de archivos); no juzga superficies nombradas en prosa.
  - **F0.c5** La medición no altera ningún ticket: los datos salen de lectura del store y de las ejecuciones ya registradas. → La persona confirmó: la medición de F0 no alteró ningún ticket. Todas las consultas al store se abrieron con PRAGMA query_only = ON y lo único mutado fueron los artefactos de este caso (su plan y su KB); los 44 tickets de taomangalam, sus specs, sesiones y estados no se tocaron.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - preexistente · telemetría de runs: server/mcp/subagentReport.ts (receptor) y el plugin kanai-host-model de OpenCode (referencia); hosts sin plugin: DSH: La telemetría de tokens falta en los hosts sin plugin (67% global, 57% en Claude Code). La duración ya se completa en el servidor cuando el host no la informa, así que el hueco real son los tokens y el modelo. OpenCode los informa con el plugin del instalador de Kanai; DSH no tiene plugin equivalente y su puente MCP no permite inyectar argumentos en la llamada, así que cerrarlo es del host, no de kanai-app. Alcance propuesto: pedir al harness un plugin que informe provider/model y uso por llamada, como hace el de OpenCode.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** F0 cerrada: telemetría medida (1684 ejecuciones, 63% con duración y 67% con tokens; el hueco de tokens es del host y quedó como hallazgo), baseline congelado (361.055.325 tokens, foto del corpus 44/31/1/1/11/34/10) y auditoría en solo lectura de los 34 planes (10 citan archivos inexistentes). Incluye el fix de la mecánica del plan (b7cb29d) que hizo falta para poder cerrar la fase.. Siguiente: Iniciar F1 con el fix del planificador ya implementado y registrado. 2026-10-04

### F1. Desbloquear el análisis de la épica

**Meta:** Que el planificador de dependencias deje de producir candidatos falsos y referencias incompletas, y que el plan de la épica quede sin commits sin registrar, para que su análisis pueda cerrarse y el piloto arrancar sobre un plan confiable.
**Responsable sugerido:** dev
**Esfuerzo:** 2 a 3 días

**Registro F1** (estado: Hecho)
- **Fecha real:** inicio 2026-10-04 · fin 2026-10-04
- **Antes de empezar:**
  - [x] F1.pre1: F0.2 cerrada (el baseline registra el estado del que se parte). (F0.2 registrada como task_done: baseline-flujo-actual.md está en el KB del caso, congelado el 2026-10-04, con tokens y duración por tipo de ejecución y por ticket de TAO-181 y TAO-182 más la foto del corpus (44 / 31 / 1 / 1 / 11 / 34 con spec / 10 sin planificar).)
  - [x] F1.pre2: El hallazgo del planificador leído: 126 aristas inferidas, metadatos propios como dependencias externas, IDs truncados y auto-referencias en los ocho tickets. (Hallazgo leído en el KB del caso kanai-epicas-autonomas (piloto-ep01-preparacion-y-parser.md): 126 aristas inferidas, metadatos propios como dependencias externas, HU-01-17 recortado a HU-01 y GH-59 resolviendo a TAO-181 → TAO-181 en los ocho tickets. El esperado que declara el hallazgo es exactamente lo que arregla esta fase.)
- **Commits:**
  - `c29530d` · fix(epics): el planificador no inventa dependencias por menciones de contexto · kanai-app/codex/epicas-autonomas (verificado)
- **Qué se hizo:**
  - **F1.1** → Excluí las auto-referencias: la referencia externa propia (GH-59 dentro de TAO-181) ya no genera una arista del ticket consigo mismo.. Dónde: server/epics/planner.ts (resolveMention) y tests/unit/epic-planner-references.test.ts; commit c29530d.. Cómo se comprobó: Medición sobre las 604 menciones de los 34 cuerpos: en la épica guardada eran 8 auto-referencias, una por ticket. Test: 4 casos con los cuerpos reales como fixtures.
  - **F1.2** → Resolví los identificadores jerárquicos completos y traté los metadatos propios (DEC-, V-, QA-, EP-) como contexto.. Dónde: server/epics/planner.ts (MENTION_ID, CONTEXT_METADATA, titleRef); commit c29530d.. Cómo se comprobó: En 458 casos el patrón viejo cortaba un identificador jerárquico (HU-01-17 → HU-01); 101 de las 127 aristas inferidas del cuerpo en la épica guardada eran metadatos.
  - **F1.3** → Registré en el plan de la épica los 11 commits que le faltaban: 3 como trabajo de su fase F10 y 8 como constancia del workstream de aceleración.. Dónde: inline-cases/kanai-epicas-autonomas/log.ndjson (evento commits por grupo y la constancia del workstream ajeno); evidencia del workstream en inline-cases/kanai-pre-epica/plan.md.. Cómo se comprobó: Verificado con el estado derivado del plan de la épica: el aviso de commits sin registrar pasó de 11 a 0 (nextInlinePlan de kanai-epicas-autonomas), y su fase actual sigue siendo F10, Bloqueado, sin abrir ni cerrar nada. Los 3 de la épica (07b7ac7, a43fc9a, 8d4221f) caen dentro de la ventana de F10 (iniciada el 2026-10-03 16:22), así que no necesitaron registro tardío.
  - **F1.4** → Verifiqué el planificador con los cuerpos canónicos como fixtures, sin re-planificar la épica real.. Dónde: tests/unit/epic-planner-references.test.ts (nuevo) y los dos tests de decisiones ajustados a una referencia externa real.. Cómo se comprobó: 4 passing, 0 failing; los dos tests que usaban DEC-123 como vehículo del escenario pasaron a HU-03a-08 conservando su intención.
- **Criterios cumplidos:**
  - **F1.c1** `pnpm vitest run tests/unit/epic-planner-references.test.ts` termina con código 0; esperado: la salida informa la cantidad de tests y 0 fallos. → Reportado por la persona desde su terminal: 1 archivo, 4 passing, 0 failing (los 4 casos: sin auto-referencias, metadatos como contexto, identificador jerárquico completo y referencias reales conservadas en los dos sentidos). Nota del entorno: corrió con el node del shell (v22.22.2) y pnpm avisó del engine (el repo pide >=24). · ejecutó: dev, `pnpm vitest run tests/unit/epic-planner-references.test.ts`, salida 0, 4 passing, 0 failing
  - **F1.c2** `pnpm typecheck` termina con código 0; esperado: la salida informa la cantidad de errores encontrados (0). → Reportado por la persona desde su terminal: '◆ Type check passed in 23500ms', código de salida 0 y 0 errores encontrados. Aviso del entorno: corrió con el node del shell (v22.22.2) y pnpm avisó del engine (el repo pide >=24). · ejecutó: dev, `pnpm typecheck`, salida 0, 0 errores (type check passed in 23500ms)
  - **F1.c3** Evidencia: la comparación de aristas inferidas antes y después (126 contra el conteo nuevo), con las que desaparecen por falsas y las que se conservan porque son reales. → Comparación antes/después medida en server/epics/planner.ts y verificada en tests/unit/epic-planner-references.test.ts: antes 140 aristas guardadas con 8 auto-referencias (una por ticket) y 101 de 127 aristas inferidas del cuerpo como metadatos; después esas dos clases no se proponen, 458 identificadores jerárquicos se capturan completos y las referencias reales entre tickets se conservan.
  - **F1.c4** Evidencia: los 6 commits registrados en el plan de la épica, o la constancia de su workstream cuando no correspondan a una fase. → Los 11 commits de la rama quedaron registrados en el plan de la epica (inline-cases/kanai-epicas-autonomas/log.ndjson): los 3 de trabajo de la epica (07b7ac7, a43fc9a, 8d4221f) como trabajo de F10 y los 8 del workstream de aceleracion (01e17bf, da26ab3, 70eb4bc, abe6359, c29530d, e6478a7, aacbbca, b7cb29d) como constancia de otro workstream, documentada tambien en inline-cases/kanai-epicas-autonomas/log.ndjson y evidenciada en inline-cases/kanai-pre-epica/plan.md. El aviso de commits sin registrar del plan de la epica queda en cero.
  - **F1.c5** La épica nativa y sus tickets quedan intactos: ningún cambio de estado, de spec ni de sesión. → La persona confirmó que la épica está corriendo con TAO-182 en este momento y que el movimiento observado (18:32: sidecars de TAO-182 reescritos y +65 líneas en el archivo de la épica, sin commitear; último commit del data repo 18:13 'gate aprobado TAO-182 sesion 2') es de esa corrida. Verificación del trabajo de esta fase: los scripts del planificador usan structuredClone + evaluate (puros), el store solo escribe en mutate y no se llamó, los tests que construyen EpicStore stubbean KANAI_DATA_ROOT a un temporal, y los 5 commits de la sesión son de kanai-app. Ningún cambio de estado, spec o sesión causado por F1.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** F1 cerrada: el planificador ya no inventa dependencias por menciones de contexto (sin auto-referencias por la referencia externa propia, metadatos DEC-/V-/QA-/EP- como contexto, identificadores jerárquicos completos resueltos por el catálogo real) y el plan de la épica quedó sin commits sin registrar (3 como trabajo de F10 y 8 como constancia del workstream de aceleración). Verificado con 4 tests de fixtures y typecheck, ambos reportados por el dev, sin tocar la épica nativa ni sus tickets.. Siguiente: Iniciar F2: validación post-ejecución con la prueba controlada y dejar el baseline en condiciones de servir de referencia (la corrida de la épica lo movió después de congelarlo). 2026-10-04

### F2. Validación post-ejecución: prueba controlada y medición de mejora

**Meta:** Comprobar con una prueba controlada que lo implementado se tradujo en la mejora buscada, midiendo antes y después con el mismo instrumento, antes de dar por listo el arranque del piloto.
**Responsable sugerido:** dev
**Esfuerzo:** 1 a 2 días

**Registro F2** (estado: En curso)
- **Fecha real:** inicio 2026-10-04 · fin -
- **Antes de empezar:**
  - [x] F2.pre1: F1 cerrada: el planificador corregido y los commits registrados. (F1 está cerrada (evento phase_closed con su resumen) y el planificador corregido quedó en el commit c29530d, con sus 4 tests de fixtures en verde reportados por el dev. Los 11 commits de la rama quedaron registrados en el plan de la épica: el aviso de commits sin registrar pasó de 11 a 0.)
  - [x] F2.pre2: El baseline de F0.2 disponible: es el lado "antes" de la comparación. (El baseline de F0.2 está en el KB del caso (baseline-flujo-actual.md, congelado 2026-10-04): 1684 ejecuciones, 361.055.325 tokens, desglose por tipo y por ticket y foto del corpus. Queda como lado "antes" de la comparación, con la salvedad registrada de que la corrida de la épica movió el corpus después de congelarlo (18:32), así que la primera tarea de F2 es declarar la ventana del piloto o re-congelar la referencia.)
- **Commits:**
  - `e6478a7` · fix(mcp): el protocolo de epica sale de la descripcion de epic_operate a la skill kn-epic · kanai-app/codex/epicas-autonomas (verificado)
  - `aacbbca` · test(mcp): guarda que epic_operate apunte a la skill kn-epic y que el protocolo siga servido · kanai-app/codex/epicas-autonomas (verificado)
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
