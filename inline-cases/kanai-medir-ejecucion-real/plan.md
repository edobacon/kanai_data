# Plan inline: Medir con corridas reales las mejoras de ejecución de Kanai

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Comprobar con LLM real que los cambios bajan rebotes, tokens y tiempo del gate N3, sin tocar tickets reales.
**Tags:** repos: kanai-app, kanai-app-codex · tickets: TAO-192, TAO-191, TAO-186 · labels: kanai, ejecucion, gates, medicion
**Estado:** Terminado. Juez: por fase (ver el registro de cada fase).

## Registro de avance

| Fase | Meta | Estado | Fecha real | Commits | Criterios | Pendiente |
|---|---|---|---|---|---|---|
| F0 Integrar y preparar | Que el MCP corra el código con los cambios, en una rama local desde setup. | Hecho | 2026-10-06 → 2026-10-06 | 19f1623, 3289cb4, 94a7afc, 897e1ca, a0cd2fe, d4f73e7, 9fe0257, 12c18ca | 2/2 | - |
| F1 Corrida real en KT | Medir un ticket sintético completo en KT con LLM real. | Hecho | 2026-10-06 → 2026-10-06 | - | 2/2 | - |
| F2 Repetir el caso de TAO-192 en KT | Medir el N3 sobre una copia en KT con el mismo diff de TAO-192, sin tocar el ticket real. | Hecho | 2026-10-06 → 2026-10-06 | - | 2/2 | - |
| F3 Ajustes | Corregir lo que las corridas muestren, solo si hace falta. | Hecho | 2026-10-06 → 2026-10-06 | - | 1/1 | - |
| F4 Medición final y arbiter | Comparar contra la línea base y correr el arbiter sobre el cambio. | Hecho | 2026-10-06 → 2026-10-06 | - | 1/1 | - |
| F5 Correcciones del arbiter | Corregir en kanai-app los hallazgos graves del arbiter (1 S1 y 2 S2) sin aflojar el bloqueo de contenido de texto no leido. | Hecho | 2026-10-06 → 2026-10-06 | e59f8a5, f47fe26, 6138429, 53f189c, f56f74e | 2/2 | - |
| F6 Ronda de cierre del arbiter | Volver a juzgar las correcciones con el arbiter. | Hecho | 2026-10-06 → 2026-10-06 | - | 1/1 | - |
| F7 Correcciones de la ronda 2 | Corregir en kanai-app los 3 hallazgos S2 de la ronda 2 del arbiter (codigo tratado como binario, alcance del rerun y deuda de impacto tras un escalate) sin aflojar el bloqueo de texto no leido. | Hecho | 2026-10-06 → 2026-10-06 | 6c7e810, 37de128, b34fc3b, a555940, 8ff3acd | 2/2 | - |
| F8 Ronda 3 del arbiter y tabla final | Volver a juzgar las correcciones de F7 con el arbiter, con tope, y dejar la tabla final al dia. | Hecho | 2026-10-06 → 2026-10-06 | - | 2/2 | - |

## Riesgos

- Cherry-pick de los 8 commits sobre setup puede dar conflictos: no se resuelven solos, se explican y se decide.
- Una corrida real con LLM cuesta tokens: el ticket sintético debe ser chico.
- El MCP debe reiniciarse para cargar el código nuevo; sin eso se mide el código viejo.
- kanai-app tiene cambios ajenos sin commitear que no deben entrar en los commits.
- Las correcciones de F5 y F7 cambian la completitud y el contexto del gate integral: no deben aflojar el bloqueo de archivos de texto no incluidos ni ocultar archivos de codigo.
- Los jueces ciegos calibran la severidad distinto entre rondas: puede aparecer un hallazgo nuevo en cada ronda; tope de una ronda mas de correcciones.

## Fuera de alcance

- Re-ejecutar gates o modificar tickets reales de taomangalam.
- Cambiar el alcance de cualquier ticket existente.
- Hacer push (solo con pedido explícito).
- Corregir en este caso los hallazgos S3 restantes y las consultas del arbiter, ni el contrato del planificador.

## Fases

### F0. Integrar y preparar

**Meta:** Que el MCP corra el código con los cambios, en una rama local desde setup.
**Esfuerzo:** 2 h
**Cómo deshacerla:** Descartar la rama feat/medir-ejecucion-real; setup queda intacta.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F0** (estado: Hecho)
- **Fecha real:** inicio 2026-10-06 · fin 2026-10-06
- **Antes de empezar:**
  - [x] F0-P1: El KB del caso contiene punto-de-partida.md con la línea base y las metas. (El KB del caso contiene punto-de-partida.md (creado 2026-10-06 19:13 UTC) con la línea base de TAO-192, TAO-191 y TAO-186 y las metas.)
- **Commits:**
  - `19f1623` · chore: complete F0 execution baseline validation · kanai-app/feat/medir-ejecucion-real (verificado)
  - `3289cb4` · chore: complete F1 execution gate diagnosis · kanai-app/feat/medir-ejecucion-real (verificado)
  - `94a7afc` · fix: optimize integral ticket execution and review · kanai-app/feat/medir-ejecucion-real (verificado)
  - `897e1ca` · chore: complete F3 isolated execution validation · kanai-app/feat/medir-ejecucion-real (verificado)
  - `a0cd2fe` · chore: complete F4 execution comparison · kanai-app/feat/medir-ejecucion-real (verificado)
  - `d4f73e7` · fix: preserve integral review coverage across size limits · kanai-app/feat/medir-ejecucion-real (verificado)
  - `9fe0257` · fix: reject integral approval for unread file content · kanai-app/feat/medir-ejecucion-real (verificado)
  - `12c18ca` · docs: document integral execution improvements · kanai-app/feat/medir-ejecucion-real (verificado)
- **Qué se hizo:**
  - **F0.1** → Rama feat/medir-ejecucion-real creada desde setup (e2250a5) en el checkout principal; los cambios ajenos sin commitear (docs/README.md, docs/analisis-persistencia.md) viajaron en el árbol y no entraron en commits.. Dónde: /Users/edobacon/Workspace/kanai/kanai-app, rama feat/medir-ejecucion-real. Cómo se comprobó: git branch --show-current devuelve feat/medir-ejecucion-real; git status --short sigue mostrando solo los archivos ajenos.
  - **F0.2** → Integrados por cherry-pick (con --allow-empty para los commits chore sin archivos) los 8 commits 9d4c1cf a 7204334 de la copia de Codex, traidos como ref remota codex/optimizar-ejecucion. Conflicto: el README local sin commitear y el commit de Codex agregan una linea en el mismo lugar del indice; se apartó el README con stash, se integraron los commits y al restaurarlo se resolvió conservando ambas lineas en orden cronologico (SQLITE_BUSY 10-05 y luego ejecución integral 10-06). El README queda como cambio local sin commitear, igual que antes.. Dónde: kanai-app, rama feat/medir-ejecucion-real, commits 19f1623 a 12c18ca; docs/README.md resuelto sin marcadores. Cómo se comprobó: git log setup..HEAD lista los 8 commits con los mismos asuntos que la copia de Codex; grep de marcadores de conflicto en docs/README.md devuelve 0; el stash quedó vacío.
  - **F0.3** → Typecheck, lint, docs:check y suite completa de kanai-app corridos sobre la rama integrada con Node 24.21.0 (el del .nvmrc).. Dónde: /Users/edobacon/Workspace/kanai/kanai-app, rama feat/medir-ejecucion-real. Cómo se comprobó: pnpm typecheck exit 0; pnpm lint exit 0; pnpm docs:check exit 0 (105 docs indexados, catálogos al día); pnpm test exit 0 con 370 archivos y 2946 tests pasados, 0 fallidos. · ejecutó: llm, `pnpm typecheck && pnpm lint && pnpm docs:check && pnpm test`, salida 0, typecheck 0; lint 0; docs:check 0 (105 docs); test 0: 370 archivos, 2946 tests pasados, 0 fallidos, 72,8 s.
  - **F0.4** → El dev reinició el MCP de Kanai (2026-10-06, antes de las 19:24 UTC) y se verificó que carga el código nuevo de feat/medir-ejecucion-real (12c18ca).. Dónde: Proceso del MCP de Kanai de esta sesión; verificación con la consulta de estado de entrega. Cómo se comprobó: La consulta de estado de entrega de las 19:24 UTC ya no incluye la línea 'El código de Kanai cambió desde que arrancó este MCP (e2250a5 -> 12c18ca)' que aparecía antes del reinicio. Siguen avisando 2 procesos de otras sesiones (pid 30805 y 54855) con código viejo; no son el de esta sesión.
- **Criterios cumplidos:**
  - **F0-C1** Typecheck, lint y suite de kanai-app pasan en la rama integrada (Node 24). → El dev corrió el comando en kanai-app sobre feat/medir-ejecucion-real; la cadena con && llegó hasta la suite y esta terminó sin fallas. · ejecutó: dev, `pnpm typecheck && pnpm lint && pnpm test`, salida 0, Test Files 370 passed (370); Tests 2946 passed (2946); 0 fallidos; duración 117,42 s. El código de salida se deduce de que la cadena && llegó a la suite y su resumen no muestra fallas; la salida pegada estaba truncada al inicio.
  - **F0-C2** Tras reiniciar el MCP, la verificación de entrega no informa código más nuevo que el proceso. → El dev confirmó en el chat que reinició el MCP. La verificación de entrega de 2026-10-06 19:24 UTC ya no informa código más nuevo que el proceso del MCP de esta sesión; quedan 2 procesos de otras sesiones (pid 30805 y 54855) con código viejo.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Juez de la fase:**
  - 2026-10-06 · aprobable_con_nits: Juez ciego (sonnet, solo lectura): los 8 commits están en la rama en orden y con los asuntos declarados, la base es setup (e2250a5) y los 5 chore son vacíos. Los 8 parches coinciden con sus orígenes de Codex, incluido el de docs/README.md; 12c18ca toca solo 2 archivos y no arrastra cambios ajenos; sin marcadores de conflicto; sin push, sin tickets reales tocados. Nits: (1) F0.3 y F0-C1 se apoyan en un código de salida deducido de la cadena && sobre salida truncada, aunque los totales (370 archivos, 2946 tests, 0 fallidos) se ven; (2) F0-C2 depende de la confirmación del dev y de la verificación de las 19:24 UTC, que el juez no pudo revisar; quedan 2 procesos MCP de otras sesiones con código viejo, a tener presente al medir.
- **Cierre y siguiente paso:** Rama feat/medir-ejecucion-real creada desde setup con los 8 commits de Codex integrados (19f1623 a 12c18ca) y el conflicto del README resuelto conservando ambas lineas. Typecheck, lint, docs:check y suite en verde (370 archivos, 2946 tests). MCP reiniciado y cargando el codigo nuevo. Juez ciego: aprobable_con_nits. Los cambios locales ajenos del dev (docs/README.md y docs/analisis-persistencia.md) quedaron en un stash para cerrar con el arbol limpio; se restauran con git stash pop.. Siguiente: 2026-10-06: iniciar F1, crear el ticket sintetico en KT y ejecutarlo completo con LLM real midiendo rondas del N3, tokens por gate y sandbox.

### F1. Corrida real en KT

**Meta:** Medir un ticket sintético completo en KT con LLM real.
**Esfuerzo:** 4 h

**Registro F1** (estado: Hecho)
- **Fecha real:** inicio 2026-10-06 · fin 2026-10-06
- **Antes de empezar:**
  - [x] F1-P1: F0 cerrada con el MCP ya reiniciado. (F0 cerrada el 2026-10-06 19:25 UTC con el MCP reiniciado; la verificación de entrega de las 19:24 UTC ya no informa código más nuevo que el proceso de esta sesión.)
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F1.1** → Creada la serie de pruebas en KT (proyecto kanai_test, repo kanai_test_repo): rama acumuladora epic/KT-ACUM desde main (18a055f); KT-017 (normalize.mjs, la dependencia) y KT-018 (normalized-count.mjs, el consumidor que importa normalizeText), ambos implement en 2 sesiones y modo manual; relación KT-018 depends_on KT-017; rama de trabajo de ambos fijada a epic/KT-ACUM. Por decisión del dev (opción B) la dependencia es un ticket nuevo que también se ejecuta, no commits de KT-016. KT-017 planificado (spec KT-017-SPEC en borrador, 4 REQs, 2 sesiones, 4 tareas, tope T2); KT-018 se planifica cuando KT-017 esté integrado en la rama acumuladora.. Dónde: Proyecto kanai_test: KT-017, KT-018, relación rel-kt018-depends-kt017; repo /Users/edobacon/Workspace/kanai/kanai_test_repo, rama epic/KT-ACUM. Cómo se comprobó: git branch --list 'epic/*' muestra epic/KT-ACUM en 18a055f; list_tickets y la exportación de KT-017 muestran el ticket con su spec en borrador; set_ticket_work_branch confirmó el override epic/KT-ACUM en los dos tickets; add_relation devolvió el id de la relación.
  - **F1.2** → Ejecutados completos con LLM real KT-017 (dependencia) y KT-018 (consumidor) en la rama acumuladora epic/KT-ACUM: spec revisado por el juez, aprobado por el dev con codigo de confirmacion, teach omitido por decision del dev, 2 sesiones cada uno con subagentes sonnet, gates N2 y N3. KT-017 quedo listo para cerrar con N3 aprobado en 1 ronda; KT-018 con N3 escalado en la ronda 1 (hueco real de test para null y undefined mas una observacion de citas del juez fuera del diff) y aprobado en la ronda 2 tras agregar el test. Medidas guardadas en el KB: medidas-kt-017.md y medidas-kt-018.md.. Dónde: Proyecto kanai_test, tickets KT-017 y KT-018, repo kanai_test_repo, rama epic/KT-ACUM; KB del caso. Cómo se comprobó: get_execution_summary y get_runs de ambos tickets (KT-017: 9 ejecuciones y 256.540 tokens registrados; KT-018: 10 ejecuciones y 495.118 tokens); git diff --stat main HEAD (5 archivos, 117 lineas) contra git diff --stat 9cbbafe HEAD (3 archivos, 63 lineas); node --test en el sandbox: 12 pass, 0 fail; ambos tickets en ready_to_close.
- **Criterios cumplidos:**
  - **F1-C1** El sandbox corrió y dejó evidencia en todos los gates del ticket sintético. → Ver medidas-kt-017.md y medidas-kt-018.md (KB del caso, tablas por gate). El sandbox real corrio y dejo evidencia (tests y cobertura) en 5 de los 7 gates de sesion: KT-017 N2 S1 (5 pass, 100%) y N3 (5 pass, 100%); KT-018 N2 S1 (11 pass, 100%), N3 ronda 1 (11 pass) y N3 ronda 2 (12 pass, 100%). Los 2 restantes, el N2 de la sesion 2 de cada ticket, son sesiones de solo documentacion y el gate declara su causa: verificacion real omitida por gate auto sin cambios de codigo; ya no aparece la causa de TAO-192 (repos sin cambios detectables en la rama de trabajo). El criterio dice todos los gates: se cumple en todo gate cuya sesion cambio codigo; las 2 omisiones por sesion sin codigo quedan a juicio del juez de la fase y del dev.
  - **F1-C2** El KB trae la tabla de medidas reales del ticket sintético contra las metas, sin cifras inventadas. → El KB del caso trae medidas-kt-017.md y medidas-kt-018.md con la tabla de F1 contra las metas (sandbox, hallazgos por diff heredado, rondas del N3, tokens por gate, auto-fix) con cifras tomadas de get_execution_summary y get_runs de Kanai, del diff real en git y de las notificaciones del host; lo no medido (auto-fix, sin corrida de control) y los limites estan declarados, sin cifras inventadas.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Juez de la fase:**
  - 2026-10-06 · aprobable_con_nits: Juez ciego (sonnet, solo lectura): todas las cifras del KB coinciden con Kanai y git (KT-017 256.540 tokens en 9 runs y KT-018 495.118 en 10, peor gate 82.118, diff de 5 a 3 archivos, 5 commits first-parent); los subagentes de KT-017 (157.204) solo son verificables por la notificacion del host y el KB lo declara. Las 2 omisiones de sandbox por sesion de solo documentacion cumplen F1-C1 con salvedad. Limites declarados con honestidad; sin push, sin tocar taomangalam. Nits, ya corregidos en el KB: (a) la fila de hallazgos por diff heredado decia 4 aprobaciones y 1 escalado y no cuadraba; (b) 'Cumplida' a secas para el diff heredado era fuerte con un solo caso y una observacion de citas sin explicar, se matizo a sin evidencia en contra; (c) faltaba la nota de los jueces del N2 de KT-017 sobre 5 tests en vez de 6, misma inconsistencia de contrato que causo el hueco de KT-018; ademas 'NO corrio' paso a 'omitido por diseno' en las sesiones sin codigo.
- **Cierre y siguiente paso:** KT-017 (dependencia) y KT-018 (consumidor) ejecutados completos con LLM real en la rama acumuladora epic/KT-ACUM, ambos en listo para cerrar. Sandbox real en 5 de 7 gates de sesion (los 2 restantes omitidos por diseno en sesiones de solo documentacion); diff del N3 de KT-018 de 5 a 3 archivos al excluir lo de KT-017; N3 en 1 y 2 rondas; peor gate 82.118 tokens; serie completa ~909k tokens. Hallazgos: hueco real de test por inconsistencia del plan (corregido), citas del juez fuera del diff sin explicar, 5 tests en vez de 6 por el mismo contrato. Auto-fix no medido. Juez ciego: aprobable_con_nits, nits corregidos en el KB.. Siguiente: 2026-10-06: iniciar F2, reproducir en KT el diff de TAO-192 (incluido lo heredado de TAO-191 y la rama acumuladora) en un repo de prueba y correr el N3 con LLM real, sin tocar taomangalam.

### F2. Repetir el caso de TAO-192 en KT

**Meta:** Medir el N3 sobre una copia en KT con el mismo diff de TAO-192, sin tocar el ticket real.
**Esfuerzo:** 4 h

**Registro F2** (estado: Hecho)
- **Fecha real:** inicio 2026-10-06 · fin 2026-10-06
- **Antes de empezar:**
  - [x] F2-P1: F1 cerrada. (F1 cerrada el 2026-10-06 20:07 UTC con el juez ciego en aprobable_con_nits; ver medidas-kt-017.md y medidas-kt-018.md en el KB del caso.)
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F2.1** → Segun la desviacion registrada (F2 acotada, decision del dev), se creo KT-019 en KT: consume normalizeText de KT-017 y countNormalizedWords de KT-018 en la misma rama acumuladora epic/KT-ACUM, con depends_on a ambos y rama de trabajo fijada; spec revisado por el juez, aprobado por el dev con codigo de confirmacion, teach omitido por decision del dev. No se reprodujo el diff completo de TAO-192 ni se toco taomangalam.. Dónde: Proyecto kanai_test, ticket KT-019 y relaciones rel-kt019-depends-kt017 y rel-kt019-depends-kt018; repo kanai_test_repo, rama epic/KT-ACUM. Cómo se comprobó: add_relation devolvio los dos ids de relacion; set_ticket_work_branch confirmo el override epic/KT-ACUM; export del ticket con KT-019-SPEC; establish_branches con baseline de 0 rojos; git log --first-parent main..epic/KT-ACUM lista los commits de KT-017, KT-018 y KT-019 en secuencia.
  - **F2.2** → Ejecutado KT-019 completo con LLM real (2 sesiones con subagentes sonnet, gates N2 y N3). El N3 integral corrio en 1 ronda y aprobo con 2 jueces sin hallazgos de alcance; el sandbox real corrio en el N2 de la sesion 1 y en el N3 (19 pass, 0 fail, cobertura 100%) y se omitio por diseno en el N2 de la sesion 2 (solo documentacion). Ticket en ready_to_close. Rondas, tokens por gate y hallazgos guardados en medidas-kt-019.md.. Dónde: Proyecto kanai_test, ticket KT-019; KB del caso, medidas-kt-019.md. Cómo se comprobó: get_execution_summary de KT-019 (9 ejecuciones, 391.604 tokens) y get_runs (N3: 42.066 de entrada y 9.514 de salida, approve); git diff --stat main HEAD (7 archivos, 178 lineas) contra el diff desde el padre del primer commit de KT-019 (3 archivos, 61 lineas); propose_transition a ready_to_close con ok.
  - **F2.3** → Comparados los resultados de KT-019 con la linea base de TAO-192 en medidas-kt-019.md: rondas del N3 (6 visibles en TAO-192 contra 1), tokens por gate N3 (0,19M a 0,45M normales y 6,35M el peor contra 51.580), scope heredado repetido (5 de 7 rondas contra 0 de 4 rondas N3 de la serie KT) y sandbox. Declarado que la escala es muy menor (3 archivos contra 188, 4 REQs contra 14), por lo que solo la ausencia de scope heredado y el sandbox son comparables de forma directa.. Dónde: KB del caso, medidas-kt-019.md y punto-de-partida.md. Cómo se comprobó: Cifras de TAO-192 tomadas de punto-de-partida.md y de la linea base validada del caso anterior; cifras de KT-019 de get_runs y git diff --stat.
- **Criterios cumplidos:**
  - **F2-C1** Cero hallazgos por diff heredado en el N3 de la copia. → Ver medidas-kt-019.md (seccion Diff del gate integral y tabla de comparacion). El N3 de KT-019 aprobo en 1 ronda con 2 jueces y ninguno marco como alcance no pedido el trabajo de KT-017 ni de KT-018; el diff que recibe el N3 paso de 7 archivos y 178 lineas (contra main) a 3 archivos y 61 lineas (contra el padre del primer commit de KT-019). En las 4 rondas N3 de la serie KT hubo 0 hallazgos por diff heredado. La unica nota del juez 1 es de mantenibilidad sobre una linea que el propio spec prescribia. Salvedad: la 'copia' del criterio es un escenario sintetico chico, no el diff de TAO-192.
  - **F2-C2** El KB trae rondas y tokens por gate de la copia contra las metas (2 rondas o menos, menos de 1M), con los incumplidos explicados. → Ver medidas-kt-019.md (cifras y comparacion con TAO-192). Rondas del N3 de KT-019: 1, contra la meta de 2 o menos; tokens del gate N3: 51.580 (42.066 de entrada y 9.514 de salida), contra la meta de menos de 1M y los 6,35M del peor gate de TAO-192; en la serie KT el maximo fue 82.118. Incumplidos explicados: el literal 'todos los gates' del sandbox queda omitido por diseno en las sesiones de solo documentacion; el auto-fix no se disparo y no se midio; la escala es mucho menor que la de TAO-192 (3 archivos contra 188, 4 REQs contra 14), por lo que rondas y tokens son indicativos y no equivalentes.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - F2 se ejecuta acotada: en vez de reproducir en KT el diff completo de TAO-192 (188 archivos de otro proyecto) se agrega un tercer ticket sintetico, KT-019, que consume a KT-017 y KT-018 en la misma rama acumuladora epic/KT-ACUM, para medir con LLM real si el diff del N3 excluye el trabajo de los dos tickets anteriores y como escalan rondas y tokens.. Por qué: El dev eligio la opcion B (F2 acotada) el 2026-10-06 tras cerrar F1: un ticket sintetico ya probo casi todo lo que mediria la replica, y copiar el diff de TAO-192 costaria mucho mas de lo que aporta.. Cambia la decisión: F2.1 pasa de reproducir el diff de TAO-192 a crear KT-019 sobre la rama acumuladora; F2.2 corre el N3 de KT-019 con LLM real; F2.3 compara contra los 5 rebotes y los 6,35M tokens de TAO-192 con el limite declarado de que la escala es mucho menor.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Juez de la fase:**
  - 2026-10-06 · aprobable_con_nits: Juez ciego (sonnet, solo lectura): todas las cifras de KT-019 coinciden con Kanai y git (391.604 tokens en 9 ejecuciones, N3 de 42.066 mas 9.514 en 1 ronda, 7 commits first-parent, diff de 7 archivos y 178 lineas contra 3 archivos y 61 lineas, reducciones de 57% y 66% correctas); sin push, sin taomangalam tocado, sin cambios de alcance. F2-C1 y F2-C2 se sostienen, la desviacion es consistente con la decision del dev y esta declarada; el doc no atribuye a los cambios la diferencia de rondas y tokens. Nits, ya corregidos en el KB: (a) dos datos de TAO-192 no estaban en punto-de-partida.md, 0,19M a 0,45M y 4 sesiones, y ahora citan su fuente; (b) las 6 rondas visibles de TAO-192 son una inferencia y se marco asi, con el limite de 50 de 76 runs; (c) la meta de sandbox en cada gate se marco como parcial por las sesiones de solo documentacion; (d) F2-C1 no demuestra causalidad por la escala sintetica, ya matizado.
- **Cierre y siguiente paso:** F2 acotada (decision del dev): KT-019 ejecutado completo con LLM real en la rama acumuladora, consumiendo a KT-017 y KT-018. El diff del N3 paso de 7 archivos y 178 lineas a 3 archivos y 61 lineas al excluir los dos tickets anteriores; N3 en 1 ronda con 51.580 tokens, sin hallazgos de alcance heredado; sandbox corrio en todo gate con codigo. Serie KT completa: ~1,30M tokens, 4 rondas N3 (3 aprobadas y 1 escalada por un hueco de test del plan), 0 hallazgos heredados en las 4. Comparacion con TAO-192 declarada indicativa por la escala (3 archivos contra 188). Juez ciego: aprobable_con_nits, nits corregidos en el KB.. Siguiente: 2026-10-06: iniciar F3 (ajustes): revisar los hallazgos de las corridas en el KB y corregir en feat/medir-ejecucion-real solo los confirmados; decidir con el dev si los hallazgos del planificador (contrato de 6 tests contra lista de casos) y las citas fuera del diff se corrigen aqui o quedan como pendientes.

### F3. Ajustes

**Meta:** Corregir lo que las corridas muestren, solo si hace falta.
**Esfuerzo:** Según los hallazgos
**Cómo deshacerla:** Revertir los commits de la fase.

**Registro F3** (estado: Hecho)
- **Fecha real:** inicio 2026-10-06 · fin 2026-10-06
- **Antes de empezar:**
  - [x] F3-P1: F2 cerrada y los hallazgos de las corridas registrados en el KB. (F2 cerrada el 2026-10-06 20:21 UTC con el juez ciego en aprobable_con_nits; los hallazgos de las corridas estan en medidas-kt-017.md, medidas-kt-018.md y medidas-kt-019.md, y su clasificacion en f3-no-aplica-y-pendientes.md.)
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F3.1** → No aplica: el dev decidio cerrar F3 sin cambios de codigo el 2026-10-06 (opcion A). Ninguna de las corridas de KT-017, KT-018 y KT-019 confirmo un defecto de los cambios medidos; los 4 hallazgos quedan como pendientes aparte con causa y forma de investigarlos: contrato del planificador contra la lista de casos, citas del juez fuera del diff, limpieza de comentarios con reescritura identica y auto-fix con tope sin medir.. Dónde: KB del caso, f3-no-aplica-y-pendientes.md; sin commits nuevos en feat/medir-ejecucion-real. Cómo se comprobó: Los hallazgos estan clasificados en f3-no-aplica-y-pendientes.md con su origen en medidas-kt-017.md, medidas-kt-018.md y medidas-kt-019.md; git log setup..feat/medir-ejecucion-real en kanai-app sigue en los 8 commits integrados en F0 (12c18ca).
- **Criterios cumplidos:**
  - **F3-C1** Typecheck, lint y suite de kanai-app pasan; o la fase queda sin cambios con 'No aplica' y su evidencia. → La fase queda sin cambios de codigo (No aplica, decision del dev el 2026-10-06; ver f3-no-aplica-y-pendientes.md). El dev corrio el comando de control sobre feat/medir-ejecucion-real: la cadena con && llego a la suite y esta termino sin fallas, con los mismos totales que en F0. · ejecutó: dev, `pnpm typecheck && pnpm lint && pnpm test`, salida 0, Test Files 370 passed (370); Tests 2946 passed (2946); 0 fallidos; duracion 97,09 s. El codigo de salida se deduce de que la cadena && llego a la suite y su resumen no muestra fallas; la salida pegada estaba truncada al inicio.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Enmienda: F3 pasa de changes_code true a false: la fase se cierra sin cambios de codigo (No aplica) y por eso no exige commits.. Motivo: El dev decidio el 2026-10-06 (opcion A) cerrar F3 como No aplica porque ninguna corrida confirmo un defecto de los cambios medidos; sin esta enmienda el plan exigiria commits que no existen.
  - Enmienda: Se restauran las etiquetas del plan (repos kanai-app y kanai-app-codex, tickets TAO-192, TAO-191 y TAO-186, labels kanai, ejecucion, gates y medicion) que la enmienda anterior borro; no cambia ninguna fase, tarea ni criterio.. Motivo: La enmienda del 2026-10-06 20:27 UTC mando el plan completo sin el campo tags y dejo las etiquetas vacias; sin repos nombrados el plan pierde la vigilancia de commits sin registrar de sus repos.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Juez de la fase:**
  - 2026-10-06 · aprobable_con_nits: Juez ciego (sonnet, solo lectura): feat/medir-ejecucion-real sigue en 12c18ca con los 8 commits de F0 y sin cambios en el codigo medido; sin push, sin taomangalam tocado, sin cambio de alcance. La clasificacion de los 4 pendientes se sostiene: el contrato del planificador es preexistente, las citas fuera del diff son el unico candidato a efecto de los cambios y quedan sin confirmar, la limpieza de comentarios es preexistente probable y el auto-fix es cobertura no medida. Cerrar F3 como No aplica es consistente con la meta y las dos enmiendas (changes_code a false y restauracion de etiquetas) son minimas y honestas. Nits: (a) el KB decia que ninguna corrida confirmo un defecto sin dejar claro que las citas fuera del diff no se descartan, ya corregido en f3-no-aplica-y-pendientes.md; (b) F3-C1 se apoya en una salida truncada y un codigo de salida deducido, evidencia aceptable pero debil, declarada; (c) los tokens de subagentes de KT-017 siguen fuera del registro de Kanai, ya declarado; (d) F3 sin commits es coherente con changes_code false.
- **Cierre y siguiente paso:** F3 cerrada como No aplica por decision del dev (opcion A): ninguna corrida de KT-017, KT-018 y KT-019 confirmo un defecto de los cambios medidos; 4 pendientes quedan aparte en f3-no-aplica-y-pendientes.md (contrato del planificador, citas del juez fuera del diff sin confirmar, limpieza de comentarios con reescritura identica y auto-fix sin medir). Sin commits nuevos en feat/medir-ejecucion-real (HEAD 12c18ca). Suite de control del dev: 370 archivos y 2946 tests pasados. Dos enmiendas del plan: changes_code de F3 a false y restauracion de las etiquetas que la primera borro por error. Juez ciego: aprobable_con_nits, nit del KB corregido.. Siguiente: 2026-10-06: iniciar F4, guardar en el KB la tabla final contra las metas con los incumplidos y pendientes, y correr el arbiter sobre feat/medir-ejecucion-real contra setup.

### F4. Medición final y arbiter

**Meta:** Comparar contra la línea base y correr el arbiter sobre el cambio.
**Esfuerzo:** 2 h

**Registro F4** (estado: Hecho)
- **Fecha real:** inicio 2026-10-06 · fin 2026-10-06
- **Antes de empezar:**
  - [x] F4-P1: F3 cerrada. (F3 cerrada el 2026-10-06 20:28 UTC con el juez ciego en aprobable_con_nits; ver f3-no-aplica-y-pendientes.md.)
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F4.1** → Guardada en el KB la tabla final contra las metas del caso (sandbox, diff heredado, rondas del N3, tokens por gate y auto-fix) con su estado cumplida, parcial o no medida, las cifras de la serie, la comparacion con la linea base de TAO-192 y TAO-186, los 4 pendientes, los limites y el estado final de la entrega.. Dónde: KB del caso, tabla-final-contra-metas.md. Cómo se comprobó: Cada fila cita medidas-kt-017.md, medidas-kt-018.md o medidas-kt-019.md, validados por el juez ciego de F1 y F2; la cuenta de gates (10, 7 con sandbox y 3 omitidos por diseno) se rehizo ticket por ticket contra get_runs y se corrigio una primera version confusa del mismo documento.
  - **F4.2** → Corrido el arbiter sobre feat/medir-ejecucion-real contra setup: juez opus de contexto limpio sobre 22 archivos y 668 lineas (un lote, todos leidos completos) y re-verify sonnet de f1, f2 y f4. Veredicto: iterar, con 1 S1, 2 S2, 6 S3 y 4 consultas. Corrida guardada en el historial de arbiter (plan kanai-medir-ejecucion-real, run kanai-medir-ejecucion-real-r1).. Dónde: KB del caso, arbiter-ronda-1.md; historial de arbiter en el data repo de Kanai, arbiter/plans/kanai-medir-ejecucion-real/. Cómo se comprobó: arbiter_save_run valido y guardo la corrida sin avisos (esquema, drift de veredicto con piso iterar para S1, cobertura 22 de 22 archivos leidos completos); git rev-parse confirma base e2250a5 y head 12c18ca.
- **Criterios cumplidos:**
  - **F4-C1** El KB trae la tabla final con cada meta cumplida, incumplida o no medida. → Ver tabla-final-contra-metas.md (KB del caso), actualizada tras el primer juicio de F4. Las 5 metas figuran con resultado y estado: parcial, sandbox en cada gate (7 de 10 gates de sesion, los 3 omitidos son sesiones de solo documentacion); cumplida sin evidencia en contra en una serie sintetica, cero hallazgos por diff heredado; cumplida en la serie sintetica pero en riesgo para binarios (f1) y reruns (f3) segun el arbiter, N3 en 2 rondas o menos; cumplida en la serie sintetica y sin tope que la garantice, menos de 1M de tokens por gate; no medida, auto-fix con tope. La tabla incluye el veredicto iterar del arbiter, los pendientes, los limites y el estado de la entrega.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Enmienda: Se agregan F5 (correcciones del arbiter en kanai-app: binarios en el gate integral, lista de archivos reutilizados en el rerun y comentario fail-open) y F6 (ronda de cierre del arbiter y tabla final). El criterio F4-C2 (arbiter aprobado o aprobable con nits) se mueve de F4 a F6, y F4 cierra con sus tareas y F4-C1 ya registradas.. Motivo: El arbiter dio iterar con 1 hallazgo S1 y 2 S2 abiertos; el dev eligio el 2026-10-06 (opcion A) corregirlos ahora y volver a juzgar, en vez de cerrar con reservas.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Juez de la fase:**
  - 2026-10-06 · aprobable_con_reservas: Juez ciego (sonnet, solo lectura): las cifras de tabla-final-contra-metas.md coinciden con medidas-kt-017/018/019.md, arbiter-ronda-1.md y la corrida guardada (10 gates y 7 con sandbox, ~1,30M tokens, 4 rondas del N3, hallazgos 0/1/2/6/4, cobertura 22 de 22); sin push, sin taomangalam tocado, sin cambio de alcance. Reserva: la tabla no mencionaba el veredicto iterar del arbiter y dejaba N3 en 2 rondas o menos y menos de 1M de tokens como Cumplida sin matiz de riesgo (f1 binarios, f3 reruns, objetivo de diff de 400k sin tope). Otros nits: el pendiente de las citas fuera del diff no incorporaba la conclusion del arbiter de que f2 no lo explica, y la palabra integrados sobre setup confundia con sin merge a setup. Corregido por el agente tras el juicio en tabla-final-contra-metas.md: seccion con el veredicto del arbiter, estado En riesgo para N3 y tokens, pendiente 2 con la conclusion del arbiter, basados sobre setup y un estado de entrega que dice que no se integra a setup antes de cerrar F5 y F6.
  - 2026-10-06 · aprobable_con_nits: Segunda revision del juez ciego (sonnet, solo lectura) sobre la tabla ya corregida: las 4 reservas del primer juicio estan corregidas (veredicto iterar con 1 S1, 2 S2, 6 S3 y 4 consultas, N3 en 2 rondas y menos de 1M de tokens con matiz de riesgo, citas fuera del diff con la conclusion del arbiter, y sin merge a setup) y las cifras cuadran contra medidas-kt-017/018/019.md, arbiter-ronda-1.md y el ledger (10 gates y 7 con sandbox, ~1,30M tokens, peor gate 82.118, diff de 5 a 3 y de 7 a 3 archivos). Restricciones cumplidas: sin push, sin taomangalam tocado, sin cambio de alcance. Nits: (N1) la fila de cero hallazgos por diff heredado dice sin evidencia en contra y deberia remitir al pendiente 2 de las citas fuera del diff, a corregir en F6.2; (N2) lo de los otros dos procesos del MCP con codigo anterior no se puede comprobar desde los archivos, es informativo; (N3) la tabla declara 5 metas y el caso 4, la quinta es el auto-fix marcado como no medido, coherente con el plan.
- **Cierre y siguiente paso:** Tabla final contra las metas guardada y corregida tras dos juicios ciegos (aprobable_con_reservas y luego aprobable_con_nits): incluye el veredicto iterar del arbiter, marca N3 en 2 rondas y menos de 1M de tokens como cumplidas solo en la serie sintetica y en riesgo segun el arbiter, y recoge la conclusion de que f2 no explica las citas fuera del diff. Arbiter corrido sobre feat/medir-ejecucion-real contra setup (juez opus, re-verify sonnet): iterar con 1 S1, 2 S2, 6 S3 y 4 consultas. F4-C2 pasa a F6 tras las correcciones de F5 (decision del dev, opcion A).. Siguiente: 2026-10-06: iniciar F5, corregir en kanai-app f1 (binarios en el gate integral), f3 (lista de reutilizados en el rerun) y f6 (comentario fail-open), con tests y un commit por hallazgo; el nit N1 de la tabla (remitir al pendiente 2) se corrige en F6.2.

### F5. Correcciones del arbiter

**Meta:** Corregir en kanai-app los hallazgos graves del arbiter (1 S1 y 2 S2) sin aflojar el bloqueo de contenido de texto no leido.
**Esfuerzo:** 1 día
**Cómo deshacerla:** Revertir los commits de F5 en feat/medir-ejecucion-real; no hay migraciones ni datos.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F5** (estado: Hecho)
- **Fecha real:** inicio 2026-10-06 · fin 2026-10-06
- **Antes de empezar:**
  - [x] F5-P1: F4 cerrada con el veredicto iterar del arbiter registrado en arbiter-ronda-1.md. (F4 cerrada el 2026-10-06 con el arbiter en iterar registrado en arbiter-ronda-1.md (1 S1, 2 S2, 6 S3, 4 consultas) y el juez ciego de F4 en aprobable_con_nits.)
- **Commits:**
  - `e59f8a5` · fix(gate): los binarios no impiden aprobar el integral y el N3 los nombra · kanai-app/feat/medir-ejecucion-real (verificado)
  - `f47fe26` · fix(gate): el rerun del integral lista los archivos reutilizados y declara su alcance · kanai-app/feat/medir-ejecucion-real (verificado)
  - `6138429` · docs(gate): el comentario de ticketBranchDiff dice que propaga el error de la base · kanai-app/feat/medir-ejecucion-real (verificado)
  - `53f189c` · docs(gate): binarios y archivos reutilizados del integral · kanai-app/feat/medir-ejecucion-real (verificado)
  - `f56f74e` · docs: worklog del plan partido por SQLITE_BUSY e indice · kanai-app/feat/medir-ejecucion-real (verificado)
- **Qué se hizo:**
  - **F5.1** → f1 (S1): diffStats separa los binarios del texto no incluido (campos binary y reviewable, complete conserva su semantica); budgetDiff ya no marca un binario como cortado; reviewComplete pasa a isIntegralReviewComplete, que solo se bloquea por texto sin leer, repos caidos, impacto pendiente u omitidos por presupuesto; las notas del N3 nombran los binarios. Test existente gate-telemetry-capture adaptado con los dos campos nuevos (aserciones mas estrictas).. Dónde: kanai-app, rama feat/medir-ejecucion-real: server/dispatch/sessionDiff.ts, integralBudget.ts, gateLevels.ts; tests/unit/integral-binary.test.ts (5 tests, uno con un png real commiteado), gate-telemetry-capture.test.ts. Cómo se comprobó: npx vitest run tests/unit/integral-binary.test.ts: 5 pass; los 8 tests nuevos de f1 y f3 fallan sobre el codigo sin la correccion (git stash de server y docs) y pasan con ella; la suite completa paso despues con 372 archivos y 2954 tests.
  - **F5.2** → f3 (S2): la nota de reutilizacion del N3 lista las rutas de los archivos que conservan la revision de la ronda anterior (reusedList, hasta 40 con el resto contado) y el alcance del codigo del rerun (integralCodeScope) deja de decir rama completa a secas y declara que los reutilizados no se repiten.. Dónde: kanai-app, rama feat/medir-ejecucion-real: server/dispatch/integralReview.ts, gateContext.ts; tests/unit/integral-rerun-context.test.ts (3 tests, uno sobre un rerun real en git). Cómo se comprobó: npx vitest run tests/unit/integral-rerun-context.test.ts: 3 pass; fallan sobre el codigo sin la correccion y pasan con ella.
  - **F5.3** → f6 (S2): el comentario de ticketBranchDiff deja de prometer fail-open: dice que un repo sin git legible se omite del diff pero que un fallo al resolver la base del ticket se propaga al llamador.. Dónde: kanai-app, rama feat/medir-ejecucion-real: server/repo/preGate.ts (solo comentario). Cómo se comprobó: git show 6138429 muestra solo lineas de comentario; typecheck, lint y suite completa en verde despues del cambio.
  - **F5.4** → docs/gate-niveles.md documenta el tratamiento de binarios y la lista de archivos reutilizados del rerun, y se corrigio la frase anterior que decia que un binario impedia aprobar el N3. Ademas, por pedido del dev, se arreglo docs:check: el worklog del plan partido por SQLITE_BUSY estaba sin versionar y sin indexar (su linea del indice estaba en el stash del dev); se commitearon el worklog y el indice regenerado con pnpm docs:index. Verificaciones corridas por el agente tras los cambios: lint exit 0, typecheck exit 0, docs:check exit 0 con 105 docs, suite de 372 archivos y 2954 tests pasados; el criterio F5-C1 lo ejecuta el dev.. Dónde: kanai-app, rama feat/medir-ejecucion-real: docs/gate-niveles.md, docs/README.md, docs/worklog-2026-10-05-plan-partido-sqlite-busy.md. Cómo se comprobó: pnpm docs:check exit 0 con 105 docs indexados tras regenerar el indice; antes fallaba por el worklog sin indexar y paso apartando ese archivo un momento; git status solo muestra test-results/ sin versionar.
- **Criterios cumplidos:**
  - **F5-C1** Typecheck, lint, docs:check y suite de kanai-app pasan sin fallas nuevas (Node 24). → El dev corrio el comando de control en kanai-app sobre feat/medir-ejecucion-real con las correcciones de F5 commiteadas: la cadena con && llego hasta la suite y esta termino sin fallas, con 2 archivos y 8 tests mas que en F0. · ejecutó: dev, `pnpm typecheck && pnpm lint && pnpm docs:check && pnpm test`, salida 0, Test Files 372 passed (372); Tests 2954 passed (2954); 0 fallidos; duracion 68,81 s. El codigo de salida se deduce de que la cadena && llego a la suite y su resumen no muestra fallas; la salida pegada estaba truncada al inicio. La suite incluye integral-binary.test.ts (5) e integral-rerun-context.test.ts (3).
  - **F5-C2** Los tests nuevos de f1 y f3 fallan sobre el codigo sin la correccion y pasan con ella. → Ver tests/unit/integral-binary.test.ts (5 tests) y tests/unit/integral-rerun-context.test.ts (3 tests). Apartando temporalmente los cambios de server/ y docs/gate-niveles.md con git stash, los 8 tests fallaron (5 de f1 y 3 de f3, por ejemplo 'isIntegralReviewComplete is not a function' y 'expected undefined to deeply equal [app:logo.png]'); con las correcciones restauradas pasaron los 8 y la suite completa quedo en 372 archivos y 2954 tests pasados. Uno de los tests de f1 usa un png real commiteado en un repo git temporal.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Juez de la fase:**
  - 2026-10-06 · aprobable_con_nits: Juez ciego (opus, solo lectura) sobre los 5 commits de F5 (12c18ca..HEAD): las tres correcciones resuelven f1, f3 y f6 sin introducir un defecto grave. El bloqueo por texto no leido se mantiene (UNREAD_TEXT_FILE sigue marcando cortado en budgetDiff y deja reviewable en false; isIntegralReviewComplete exige sin omitidos, cortados, impacto pendiente ni repos caidos). Sin consumidores rotos: complete conserva su semantica, binary y reviewable no se serializan, diffBudget no los lee; el binario pasa de coverage partial a full y la nota de binarios lo nombra fuera del presupuesto. Sin push y worklog sin secretos. Nits S3 o consulta, no corregidos en este caso: (1) un archivo que git trate como binario (UTF-16, byte NUL, .gitattributes) aprueba sin leerse aunque sea codigo, la unica defensa es la nota; (2) un binario sin commitear de mas de 200 KB sigue bloqueando el N3; (3) integralCodeScope anuncia archivos reutilizados en todo rerun aunque integralReviewFiles caiga a revision completa en varios casos; (4) el titulo de un test dice only when files can be reused y solo prueba isRerun; (5) la lista de binarios de las notas no tiene tope; (6) dos tests construyen DiffStats a mano sin los campos nuevos y typecheck no tipa tests; (7) varios de los 8 tests nuevos fallan sin la correccion por un import inexistente y no por comportamiento, asi que la evidencia del stash prueba menos de lo que declara, aunque las aserciones sobre budgetDiff y diffStats si habrian fallado por comportamiento.
- **Cierre y siguiente paso:** Corregidos en kanai-app los hallazgos graves del arbiter: f1 (S1, binarios en el gate integral), f3 (S2, lista de archivos reutilizados y alcance del rerun) y f6 (S2, comentario fail-open), mas docs/gate-niveles.md y el arreglo de docs:check por pedido del dev (worklog e indice). 5 commits (e59f8a5, f47fe26, 6138429, 53f189c, f56f74e) sin push; 8 tests nuevos y 1 adaptado con una asercion mas estricta; suite de control del dev: 372 archivos y 2954 tests pasados. Juez ciego (opus): aprobable_con_nits, con 7 nits S3 o consulta que quedan como pendientes, entre ellos que parte de la evidencia de F5-C2 prueba por import faltante y no por comportamiento.. Siguiente: 2026-10-06: iniciar F6, correr la ronda de cierre del arbiter sobre feat/medir-ejecucion-real (head f56f74e) contra setup con re-chequeo de los hallazgos de la ronda 1, y actualizar la tabla final del KB con su veredicto y los nits de F4 y F5.

### F6. Ronda de cierre del arbiter

**Meta:** Volver a juzgar las correcciones con el arbiter.
**Esfuerzo:** 3 h

**Registro F6** (estado: Hecho)
- **Fecha real:** inicio 2026-10-06 · fin 2026-10-06
- **Antes de empezar:**
  - [x] F6-P1: F5 cerrada con sus commits registrados. (F5 cerrada el 2026-10-06 con sus 5 commits registrados (e59f8a5, f47fe26, 6138429, 53f189c, f56f74e) y el juez ciego en aprobable_con_nits; ver arbiter-ronda-1.md para los hallazgos que se vuelven a juzgar.)
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F6.1** → Corrida la ronda 2 del arbiter sobre feat/medir-ejecucion-real (head f56f74e) contra setup, en paralelo: juez ciego opus sobre el lote de 12 archivos y 449 lineas que cambiaron o nunca se habian revisado (los otros 14 de 26 ya estaban leidos completos con el mismo blob) y re-chequeo sonnet de los 13 hallazgos de la ronda 1. No fue ronda de cierre porque el plan paso de 5 a 7 fases, asi que corrio como ronda normal con alcance reducido por cobertura. Resultado: f1 (S1), f3 (S2) y f6 (S2) de la ronda 1 corregidos, 3 de 3 confirmados por la reconciliacion; los 4 S3 y 4 consultas sin corregir siguen igual; el juez ciego reporta 3 hallazgos S2 y 8 S3 nuevos o que cambian de severidad. Veredicto: iterar, porque la rubrica sube a iterar con 2 o mas S2. Corrida guardada como kanai-medir-ejecucion-real-r2.. Dónde: Historial de arbiter, plan kanai-medir-ejecucion-real, run kanai-medir-ejecucion-real-r2; arbiter_reconcile aplicado. Cómo se comprobó: arbiter_save_run valido y guardo la corrida sin avisos (esquema, drift de veredicto con piso iterar, cobertura 26 de 26 archivos); arbiter_reconcile devolvio fixed para f1, f3 y f6 con precision 1 y pending para el resto; re-chequeo y juez en paralelo sin acceso a los hallazgos del otro.
- **Criterios cumplidos:**
  - **F6-C1** La ronda 2 del arbiter queda guardada en el historial con su veredicto y los hallazgos de la ronda 1 reconciliados. → Ver el historial de arbiter del plan, ledger.md y runs/20261006-211200-kanai-medir-ejecucion-real-r2.json (data repo de Kanai, arbiter/plans/kanai-medir-ejecucion-real/). La ronda 2 quedo guardada como kanai-medir-ejecucion-real-r2 con veredicto iterar (0 S0, 0 S1, 3 S2, 11 S3, 4 consultas) y cobertura 26 de 26 archivos; arbiter_reconcile con apply true marco como fixed los 3 hallazgos graves de la ronda 1 (f1 S1, f3 S2 y f6 S2, precision 3 de 3) y dejo pending el resto.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Enmienda: F6 queda limitada a la ronda 2 del arbiter (F6.1 ya registrada); su criterio F6-C1 pasa a pedir que la corrida quede guardada y reconciliada. La tarea F6.2 y el criterio F4-C2 se mueven a una fase nueva F8 (ronda 3 del arbiter y tabla final), precedida por F7, con las correcciones de los 3 hallazgos S2 de la ronda 2: codigo tratado como binario (g1), alcance del rerun (g3) y deuda de impacto tras un escalate (g2), mas dos limpiezas menores.. Motivo: La ronda 2 del arbiter dio iterar con 3 hallazgos S2; el dev eligio el 2026-10-06 (opcion A) una fase mas de correcciones con tope: si la ronda 3 vuelve a dar S2, se cierra con reservas y se consulta al dev.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Juez de la fase:**
  - 2026-10-06 · aprobable_con_nits: Juez ciego (sonnet, solo lectura): el run r2 y el ledger dicen iterar con findings 0/0/3/11/4 (S0, S1, S2, S3, consulta), que coincide con su cuenta de findings_detail; cobertura 26 de 26 leidos completos, head f56f74e, base e2250a5, plan_phase_ids F0 a F6; el bloque de re-chequeo tiene los 13 hallazgos de r1 y el ledger lista f1, f3 y f6 como corregidos; con 3 S2 la rubrica manda iterar; sin push (git branch -r --contains f56f74e vacio). Nits: (1) la frase de F6.1 '8 S3 nuevos o que cambian de severidad' no esta respaldada: de los 11 S3, 5 son arrastrados de r1 (f7, f8, f9, f11, f12) y los realmente nuevos son 5 (g4, g5, g7, g8, g9); g6 es el f13 de r1 con id nuevo y c1 es el f10 de r1 pasado a consulta, asi que lo correcto es 5 S3 nuevos y 2 re-identificados, correccion que queda aqui porque el evento F6.1 no se puede editar; (2) g9 y f12 apuntan al mismo archivo y linea y quiza se solapan; (3) g1 y g3 son casos borde residuales de las correcciones de f1 y f3, que si se confirmaron.
- **Cierre y siguiente paso:** Ronda 2 del arbiter corrida y guardada como kanai-medir-ejecucion-real-r2: iterar con 0 S0, 0 S1, 3 S2, 11 S3 y 4 consultas sobre 26 archivos leidos completos; los 3 hallazgos graves de la ronda 1 (f1, f3, f6) quedaron corregidos y reconciliados (3 de 3). Los 3 S2 nuevos (g1 codigo tratado como binario, g2 deuda de impacto tras un escalate, g3 alcance del rerun) pasan a F7. Juez ciego: aprobable_con_nits; correccion registrada de que los S3 nuevos son 5 y 2 re-identificados, no 8.. Siguiente: 2026-10-06: iniciar F7, corregir en kanai-app g1, g3 y g2 con tests que fallen por comportamiento, mas las limpiezas menores y la doc, con un commit por hallazgo.

### F7. Correcciones de la ronda 2

**Meta:** Corregir en kanai-app los 3 hallazgos S2 de la ronda 2 del arbiter (codigo tratado como binario, alcance del rerun y deuda de impacto tras un escalate) sin aflojar el bloqueo de texto no leido.
**Esfuerzo:** 1 día
**Cómo deshacerla:** Revertir los commits de F7 en feat/medir-ejecucion-real; no hay migraciones ni datos.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F7** (estado: Hecho)
- **Fecha real:** inicio 2026-10-06 · fin 2026-10-06
- **Antes de empezar:**
  - [x] F7-P1: F6 cerrada con la ronda 2 del arbiter (iterar) guardada como kanai-medir-ejecucion-real-r2. (F6 cerrada el 2026-10-06 con la ronda 2 del arbiter (iterar) guardada como kanai-medir-ejecucion-real-r2 en el historial de arbiter del data repo de Kanai (arbiter/plans/kanai-medir-ejecucion-real/runs/20261006-211200-kanai-medir-ejecucion-real-r2.json).)
- **Commits:**
  - `6c7e810` · fix(gate): el codigo o texto que git muestra como binario sigue bloqueando el integral · kanai-app/feat/medir-ejecucion-real (verificado)
  - `37de128` · fix(gate): el alcance del rerun solo promete archivos reutilizados si las notas los listan · kanai-app/feat/medir-ejecucion-real (verificado)
  - `b34fc3b` · fix(gate): el integral que termina en escalate con deuda de impacto la conserva para el rerun · kanai-app/feat/medir-ejecucion-real (verificado)
  - `a555940` · docs(gate): binarios de codigo, deuda tras un escalate y worklog al dia · kanai-app/feat/medir-ejecucion-real (verificado)
  - `8ff3acd` · docs(gate): los comentarios de binarios distinguen assets de codigo marcado binario · kanai-app/feat/medir-ejecucion-real (verificado)
- **Qué se hizo:**
  - **F7.1** → g1 (S2): un archivo con extension de codigo, configuracion o documentacion (TEXT_FILE: ts, sql, yml, md y similares) que git muestra como binario ya no cuenta como asset: hasUnreadText lo trata como texto sin leer, deja reviewable en false y budgetDiff lo marca como cortado, asi que bloquea el integral. Los assets binarios (png, fuentes) siguen entrando por nombre. Tambien se quito el export sin uso TICKET_DIFF_BUDGET.. Dónde: kanai-app, rama feat/medir-ejecucion-real: server/dispatch/sessionDiff.ts; tests/unit/integral-binary.test.ts (3 tests nuevos, uno con un .ts marcado -diff en .gitattributes de un repo git real). Cómo se comprobó: npx vitest run tests/unit/integral-binary.test.ts: 8 pass; sobre el codigo de F5 (git stash de server) fallan por aserciones, por ejemplo expected ['app:src/a.ts'] to deeply equal [] y expected ['app:feature.ts','app:logo.png'] to deeply equal ['app:logo.png'].
  - **F7.2** → g3 (S2): integralCodeScope redacta el alcance del rerun de forma condicional y verdadera (si las notas del codigo listan archivos reutilizados de la ronda anterior, esos conservan su revision y no se repiten); el test pasa a titularse y probar eso, y se agrega un test de un rerun real sin foto previa donde reused queda vacio y no hay nota de reutilizados.. Dónde: kanai-app, rama feat/medir-ejecucion-real: server/dispatch/gateContext.ts; tests/unit/integral-rerun-context.test.ts (4 tests). Cómo se comprobó: npx vitest run tests/unit/integral-rerun-context.test.ts: 4 pass; sobre el codigo de F5 el test del alcance falla por una asercion de igualdad de texto.
  - **F7.3** → g2 (S2): priorIntegralGate devuelve la ronda previa cuando el integral anterior termino en escalate y su cobertura trae impactRoots pendientes, para que la deuda de impacto solo se limpie con lecturas completas como dice la doc; un escalate sin deuda sigue devolviendo null, y iterate y approve conservan su comportamiento.. Dónde: kanai-app, rama feat/medir-ejecucion-real: server/dispatch/gateLevels.ts (priorIntegralGate); tests/unit/integral-escalate-debt.test.ts (3 tests con base de datos en memoria). Cómo se comprobó: npx vitest run tests/unit/integral-escalate-debt.test.ts tests/unit/integral-review-limits.test.ts: 7 pass; sobre el codigo de F5 el test del escalate con deuda falla con expected null not to be null.
  - **F7.4** → docs/gate-niveles.md documenta que el codigo, la configuracion y la documentacion que git muestra como binario bloquean, que un escalate con deuda la conserva y que el alcance del rerun es condicional; docs/worklog-2026-10-06-ejecucion-integral.md deja de decir que un binario no se puede aprobar, cita los hashes de esta rama y remite a gate-niveles para las correcciones posteriores. El export TICKET_DIFF_BUDGET se quito en el commit de g1. Verificaciones corridas por el agente: typecheck exit 0, lint exit 0, docs:check exit 0 con 105 docs, suite de 373 archivos y 2961 tests pasados; el criterio F7-C1 lo ejecuta el dev.. Dónde: kanai-app, rama feat/medir-ejecucion-real: docs/gate-niveles.md, docs/worklog-2026-10-06-ejecucion-integral.md. Cómo se comprobó: pnpm docs:check exit 0 tras los cambios; git status solo muestra test-results/ sin versionar; el commit del export muerto va dentro del de g1 porque comparten archivo, desviacion declarada del un commit por hallazgo.
- **Criterios cumplidos:**
  - **F7-C1** Typecheck, lint, docs:check y suite de kanai-app pasan sin fallas nuevas (Node 24). → Corrida del dev en kanai-app, rama feat/medir-ejecucion-real: suite de 373 archivos y 2961 tests sin fallas. · ejecutó: dev, `pnpm typecheck && pnpm lint && pnpm docs:check && pnpm test`, salida 0, Test Files 373 passed (373); Tests 2961 passed (2961); duracion 89.37s. La salida de typecheck, lint y docs:check quedo fuera del texto truncado; el codigo 0 se infiere porque la cadena con && llego a la suite.
  - **F7-C2** Los tests de g1, g2 y g3 fallan por comportamiento (no por un import inexistente) sobre el codigo sin la correccion y pasan con ella. → Ver tests/unit/integral-binary.test.ts (tests de codigo tratado como binario), tests/unit/integral-rerun-context.test.ts (alcance del rerun) y tests/unit/integral-escalate-debt.test.ts (deuda tras un escalate). Apartando con git stash los cambios de server/ para volver al codigo de F5, 5 de esos tests fallaron por aserciones de comportamiento y no por imports inexistentes: expected ['app:src/a.ts'] to deeply equal [], expected ['app:assets/logo.png', ...] to deeply equal ['app:assets/logo.png'], expected ['app:feature.ts','app:logo.png'] to deeply equal ['app:logo.png'], expected null not to be null, y la igualdad de texto del alcance del rerun; con las correcciones restauradas pasaron los 15 tests de esos tres archivos y la suite completa quedo en 373 archivos y 2961 tests pasados. Los otros 10 tests de esos archivos prueban comportamiento que ya existia y pasan en ambos codigos.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Registros tardíos** (pedidos por el dev con la fase cerrada):
  - 2026-10-06 · Commits de la fase: 8ff3acd. Motivo: El dev eligio la opcion B tras la ronda 3 del arbiter (corregir por commit los dos comentarios del hallazgo h1, sin nueva ronda) y confirmo el commit; ocurrio cuando F7 ya estaba cerrada.
- **Bloqueos:**
  - Sin registros.
- **Juez de la fase:**
  - 2026-10-06 · aprobable_con_nits: Juez ciego (sonnet), solo lectura con git y Grep. Sin S0, S1 ni S2. g1: logica correcta, el bloqueo de texto no leido no se aflojo, los assets binarios siguen sin bloquear, tests con valores concretos y un caso con git real. g3: alcance del rerun condicional y verdadero. g2: priorIntegralGate conserva el escalate con impactRoots y devuelve null sin deuda. Docs coherentes con el codigo. Nits S3: (1) TEXT_FILE es una lista cerrada, un Dockerfile, .env o .svg que git marque binario se trataria como asset; (2) el prior de un escalate se devuelve con decision iterate fija en gateLevels.ts:86-88, enganoso al leer; (3) el resumen de F7.1 cita integralBudget.ts y gateLevels.ts, que g1 no cambia. Consulta: el test con git real solo cubre -diff, no UTF-16 ni NUL. El juez no ejecuto nada: F7-C1 y F7-C2 se apoyan en lo declarado y en la corrida del dev.
  - 2026-10-06 · aprobado: Juez ciego (sonnet), solo lectura, sobre el registro tardio del commit 8ff3acd. El commit toca solo comentarios en integralBudget.ts y en los docstrings de DiffStats.binary y DiffStats.reviewable de sessionDiff.ts, sin cambio de codigo ni de tests. Los comentarios nuevos coinciden con el codigo actual: binary solo lista assets (isBinaryAsset), y el codigo, config o docs que git muestra como binario cae en hasUnreadText y deja reviewable en false. El Grep de binari en server/dispatch no encontro otro comentario que diga que todo binario es un asset. Sin hallazgos. El juez no ejecuto nada; no se corrio typecheck ni la suite tras ese commit, que solo cambia comentarios.
- **Cierre y siguiente paso:** F7 cerrada: g1 (codigo, config o docs que git muestra como binario sigue bloqueando el integral), g3 (alcance del rerun condicional y verdadero) y g2 (un escalate con deuda de impacto la conserva para el rerun) corregidos en 4 commits (6c7e810, 37de128, b34fc3b, a555940). Suite de 373 archivos y 2961 tests pasados (corrida del dev). Juez ciego: aprobable_con_nits, sin S0 a S2; nits S3 de lista TEXT_FILE cerrada, decision iterate fija en el prior de un escalate y un resumen de tarea que cita archivos que g1 no toca.. Siguiente: 2026-10-06: F8, correr la ronda 3 del arbiter sobre feat/medir-ejecucion-real contra setup (head a555940) con recheck de los hallazgos de la ronda 2; si vuelve a dar S2, cerrar con reservas y consultar al dev.

### F8. Ronda 3 del arbiter y tabla final

**Meta:** Volver a juzgar las correcciones de F7 con el arbiter, con tope, y dejar la tabla final al dia.
**Esfuerzo:** 3 h

**Registro F8** (estado: Hecho)
- **Fecha real:** inicio 2026-10-06 · fin 2026-10-06
- **Antes de empezar:**
  - [x] F8-P1: F7 cerrada con sus commits registrados. (F7 esta cerrada (evento e0083) con sus 4 commits registrados en F7.1 a F7.4 (6c7e810, 37de128, b34fc3b, a555940) y sin avisos de commits sin registrar.)
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F8.1** → Ronda 3 del arbiter sobre el interdiff f56f74e..a555940 (8 archivos, 180 lineas): juez ciego opus y re-chequeo sonnet de los 18 hallazgos de la ronda 2. Veredicto aprobable_con_reservas (0 S0, 0 S1, 1 S2, 10 S3, 5 consultas), guardado como kanai-medir-ejecucion-real-r3. Corregidos g1, g2, g3, g6, g9 y f12. El unico S2 (h1) eran dos comentarios que el delta dejo falsos (integralBudget.ts:4 y sessionDiff.ts:121); por la regla acordada no se abrio otra ronda: el dev eligio corregirlo por commit sin nueva ronda del arbiter, asi que esa correccion (commit 8ff3acd, registrado aparte como registro tardio de F7) no la juzgo el arbiter.. Dónde: Historial del arbiter en ~/.kanai/data/kanai_data/arbiter/plans/kanai-medir-ejecucion-real/ (run r3). Cómo se comprobó: arbiter_save_run devolvio el archivo de la corrida r3 sin avisos; los dos comentarios se confirmaron en el codigo antes de corregirlos; la correccion es solo de comentarios y no se corrio typecheck ni la suite sobre ese commit.
  - **F8.2** → Reescrita tabla-final-contra-metas.md en el KB del caso: tabla de las 3 rondas del arbiter, metas con su estado (se agrego la reserva de las citas fuera del diff a la fila de diff heredado y que las correcciones de F5 y F7 se probaron con tests y no con corridas reales), correcciones de F5 y F7, hallazgos abiertos (h2, h3, g4, g5, g7, g8, f7, f8, f9, f11 y las consultas), pendientes, limites y estado de la entrega.. Dónde: KB del caso kanai-medir-ejecucion-real: tabla-final-contra-metas.md. Cómo se comprobó: inline_case_kb_add devolvio replaced true sin avisos; las cifras se tomaron del run r3 guardado y de las medidas de KT-017 a KT-019.
- **Criterios cumplidos:**
  - **F4-C2** El arbiter no deja S0 ni S1 y los S2 quedan corregidos o resueltos con decision del dev; los S3 y consultas restantes quedan listados. → Run kanai-medir-ejecucion-real-r3 del arbiter: 0 S0, 0 S1, 1 S2, 10 S3 y 5 consultas, veredicto aprobable_con_reservas. Los S2 de las rondas 1 y 2 (f1, f3, f6, g1, g2, g3) estan corregidos y el re-chequeo de la ronda 3 los dio por corregidos. El unico S2 de la ronda 3 (h1, dos comentarios desactualizados) se resolvio por decision del dev con el commit 8ff3acd, juzgado aprobado sin hallazgos por el juez de F7 (evento e0092); el arbiter no lo volvio a juzgar. Los 10 S3 y las 5 consultas restantes estan listados en tabla-final-contra-metas.md, seccion Hallazgos que quedan abiertos.
  - **F8-C1** La tabla final del KB refleja las correcciones de F5 y F7 y el veredicto final del arbiter. → tabla-final-contra-metas.md (KB del caso, actualizada 2026-10-06T21:29:39Z) trae la tabla de las 3 rondas del arbiter con el veredicto final aprobable con reservas, la seccion de correcciones de F5 (ronda 1) y F7 (ronda 2, commits 6c7e810, 37de128, b34fc3b y a555940), y la correccion posterior 8ff3acd marcada como no juzgada por el arbiter.
- **No cumplido:**
  - resuelto · F4-C2: El veredicto final guardado del arbiter es aprobable_con_reservas (ronda 3, run r3), no aprobado ni aprobado con nits. No quedan S0 ni S1 y los S2 de las rondas 1 y 2 estan corregidos y verificados por el re-chequeo. El unico S2 de la ronda 3 (h1, dos comentarios desactualizados) se corrigio por el commit 8ff3acd por decision del dev, sin una cuarta ronda, asi que el arbiter no lo juzgo.. Por qué: El plan fijo un tope: si la ronda 3 daba S2 no se abria otra ronda de correcciones y se cerraba con reservas consultando al dev; el dev eligio corregir el S2 por commit sin volver a juzgar.. Impacto: El cambio puede integrarse a setup solo con decision del dev; quedan 10 S3 y 5 consultas abiertos (listados en tabla-final-contra-metas.md) y la correccion de h1 sin juicio del arbiter.. Fecha: 2026-10-06. Responsable: dev
- **Desvíos del plan:**
  - El criterio F4-C2 pedia el arbiter aprobado o aprobado con nits y queda en aprobable_con_reservas.. Por qué: Tras la ronda 3 el unico S2 eran dos comentarios desactualizados; el dev eligio corregirlos por commit (8ff3acd, juzgado aprobado por el juez de F7) sin abrir una cuarta ronda, segun el tope acordado.
  - Enmienda: El criterio F4-C2 de F8 pasa de "El arbiter queda aprobado o aprobado con nits, y los hallazgos graves están corregidos" a "El arbiter no deja S0 ni S1 y los S2 quedan corregidos o resueltos con decision del dev; los S3 y consultas restantes quedan listados.". Motivo: El dev eligio la opcion A: el arbiter quedo en aprobable_con_reservas tras la ronda 3 y el tope acordado impide una cuarta ronda; el criterio se redacta segun lo que se puede probar.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Juez de la fase:**
  - 2026-10-06 · aprobable_con_nits: Juez ciego (sonnet), solo lectura. 0 S0, 0 S1, 0 S2, 3 S3. Las cifras de la tabla final coinciden con el run r3 y con las medidas de KT-017 a KT-019 (conteos por ronda 0/1/2/6/4, 0/0/3/11/4 y 0/0/1/10/5; tokens de la serie; diff de 5 a 3 y de 7 a 3; sandbox en 7 de 10 gates), sin cifras inventadas. Los hallazgos abiertos coinciden con findings_detail y el ledger de r3. La tabla no afirma mas de lo probado y marca 8ff3acd como no juzgado por el arbiter; la enmienda de F4-C2 esta registrada con honestidad en plan.md. Nits S3: (1) tabla-final-contra-metas.md linea 13 dice que F4-C2 no se cumple en sentido estricto sin citar la enmienda del dev, y plan.md lo registra como cumplido con el texto enmendado; (2) la linea 11 dice 12 archivos y 449 lineas para la ronda 2 mientras el run registra 26 archivos en el diff (es el lote juzgado); (3) la suite de 373 archivos y 2961 tests esta atribuida al dev y no tiene respaldo en el run.
- **Cierre y siguiente paso:** F8 cerrada: ronda 3 del arbiter con aprobable_con_reservas (0 S1, 1 S2 que eran dos comentarios, 10 S3, 5 consultas); corregidos g1, g2, g3, g6, g9 y f12; el S2 se resolvio por el commit 8ff3acd sin cuarta ronda, juzgado aprobado por el juez de F7. Tabla final del KB al dia. F4-C2 enmendado por el dev y cumplido; F8-C1 cumplido. Juez ciego de F8: aprobable_con_nits (3 S3 sobre la redaccion de la tabla).. Siguiente: No aplica: el caso termina aqui; la integracion a setup, el push, el cierre de KT-017 a KT-019 y los hallazgos S3 abiertos quedan como decisiones del dev.
