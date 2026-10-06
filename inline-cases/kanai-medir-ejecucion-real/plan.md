# Plan inline: Medir con corridas reales las mejoras de ejecución de Kanai

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Comprobar con LLM real que los cambios bajan rebotes, tokens y tiempo del gate N3, sin tocar tickets reales.
**Tags:** repos: kanai-app, kanai-app-codex · tickets: TAO-192, TAO-191, TAO-186 · labels: kanai, ejecucion, gates, medicion
**Estado:** 2 de 5 fases cerradas. Juez: por fase (ver el registro de cada fase).

## Registro de avance

| Fase | Meta | Estado | Fecha real | Commits | Criterios | Pendiente |
|---|---|---|---|---|---|---|
| F0 Integrar y preparar | Que el MCP corra el código con los cambios, en una rama local desde setup. | Hecho | 2026-10-06 → 2026-10-06 | 19f1623, 3289cb4, 94a7afc, 897e1ca, a0cd2fe, d4f73e7, 9fe0257, 12c18ca | 2/2 | - |
| F1 Corrida real en KT | Medir un ticket sintético completo en KT con LLM real. | Hecho | 2026-10-06 → 2026-10-06 | - | 2/2 | - |
| F2 Repetir el caso de TAO-192 en KT | Medir el N3 sobre una copia en KT con el mismo diff de TAO-192, sin tocar el ticket real. | En curso | 2026-10-06 → - | - | 0/2 | F2.1; F2.2; F2.3 |
| F3 Ajustes | Corregir lo que las corridas muestren, solo si hace falta. | Pendiente | - → - | - | 0/1 | F3.1 |
| F4 Medición final y arbiter | Comparar contra la línea base y cerrar con el arbiter. | Pendiente | - → - | - | 0/2 | F4.1; F4.2 |

## Riesgos

- Cherry-pick de los 8 commits sobre setup puede dar conflictos: no se resuelven solos, se explican y se decide.
- Una corrida real con LLM cuesta tokens: el ticket sintético debe ser chico.
- El MCP debe reiniciarse para cargar el código nuevo; sin eso se mide el código viejo.
- kanai-app tiene cambios ajenos sin commitear que no deben entrar en los commits.

## Fuera de alcance

- Re-ejecutar gates o modificar tickets reales de taomangalam.
- Cambiar el alcance de cualquier ticket existente.
- Hacer push (solo con pedido explícito).

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

**Registro F2** (estado: En curso)
- **Fecha real:** inicio 2026-10-06 · fin -
- **Antes de empezar:**
  - [x] F2-P1: F1 cerrada. (F1 cerrada el 2026-10-06 20:07 UTC con el juez ciego en aprobable_con_nits; ver medidas-kt-017.md y medidas-kt-018.md en el KB del caso.)
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F2.1** pendiente: Reproducir en KT el diff de TAO-192 (incluido lo heredado de TAO-191 y la rama acumuladora) en un repo de prueba, sin modificar taomangalam.
  - **F2.2** pendiente: Correr el gate N3 con LLM real sobre esa copia y guardar rondas, tokens por gate y hallazgos repetidos.
  - **F2.3** pendiente: Comparar contra los 5 rebotes y los 6,35M tokens del peor gate de TAO-192.
- **Criterios cumplidos:**
  - **F2-C1** pendiente (evidence): Cero hallazgos por diff heredado en el N3 de la copia.
  - **F2-C2** pendiente (evidence): El KB trae rondas y tokens por gate de la copia contra las metas (2 rondas o menos, menos de 1M), con los incumplidos explicados.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - F2 se ejecuta acotada: en vez de reproducir en KT el diff completo de TAO-192 (188 archivos de otro proyecto) se agrega un tercer ticket sintetico, KT-019, que consume a KT-017 y KT-018 en la misma rama acumuladora epic/KT-ACUM, para medir con LLM real si el diff del N3 excluye el trabajo de los dos tickets anteriores y como escalan rondas y tokens.. Por qué: El dev eligio la opcion B (F2 acotada) el 2026-10-06 tras cerrar F1: un ticket sintetico ya probo casi todo lo que mediria la replica, y copiar el diff de TAO-192 costaria mucho mas de lo que aporta.. Cambia la decisión: F2.1 pasa de reproducir el diff de TAO-192 a crear KT-019 sobre la rama acumuladora; F2.2 corre el N3 de KT-019 con LLM real; F2.3 compara contra los 5 rebotes y los 6,35M tokens de TAO-192 con el limite declarado de que la escala es mucho menor.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Juez de la fase:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F3. Ajustes

**Meta:** Corregir lo que las corridas muestren, solo si hace falta.
**Esfuerzo:** Según los hallazgos
**Cómo deshacerla:** Revertir los commits de la fase.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F3** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F3-P1: F2 cerrada y los hallazgos de las corridas registrados en el KB.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F3.1** pendiente: Corregir en feat/medir-ejecucion-real cada hallazgo confirmado por las corridas, con un commit por hallazgo; si no hay ninguno, registrar 'No aplica' con la evidencia.
- **Criterios cumplidos:**
  - **F3-C1** pendiente (command): Typecheck, lint y suite de kanai-app pasan; o la fase queda sin cambios con 'No aplica' y su evidencia.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Juez de la fase:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F4. Medición final y arbiter

**Meta:** Comparar contra la línea base y cerrar con el arbiter.
**Esfuerzo:** 2 h

**Registro F4** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F4-P1: F3 cerrada.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F4.1** pendiente: Guardar en el KB la tabla final contra las metas, los incumplidos y las señales de mejora pendientes.
  - **F4.2** pendiente: Correr el arbiter sobre feat/medir-ejecucion-real contra setup y registrar su veredicto.
- **Criterios cumplidos:**
  - **F4-C1** pendiente (evidence): El KB trae la tabla final con cada meta cumplida, incumplida o no medida.
  - **F4-C2** pendiente (evidence): El arbiter queda aprobado o aprobado con nits, y los hallazgos graves están corregidos.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Juez de la fase:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.
