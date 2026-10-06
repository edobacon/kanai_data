# Plan inline: Medir con corridas reales las mejoras de ejecución de Kanai

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Comprobar con LLM real que los cambios bajan rebotes, tokens y tiempo del gate N3, sin tocar tickets reales.
**Tags:** repos: kanai-app, kanai-app-codex · tickets: TAO-192, TAO-191, TAO-186 · labels: kanai, ejecucion, gates, medicion
**Estado:** 1 de 5 fases cerradas. Juez: por fase (ver el registro de cada fase).

## Registro de avance

| Fase | Meta | Estado | Fecha real | Commits | Criterios | Pendiente |
|---|---|---|---|---|---|---|
| F0 Integrar y preparar | Que el MCP corra el código con los cambios, en una rama local desde setup. | Hecho | 2026-10-06 → 2026-10-06 | 19f1623, 3289cb4, 94a7afc, 897e1ca, a0cd2fe, d4f73e7, 9fe0257, 12c18ca | 2/2 | - |
| F1 Corrida real en KT | Medir un ticket sintético completo en KT con LLM real. | En curso | 2026-10-06 → - | - | 0/2 | F1.2 |
| F2 Repetir el caso de TAO-192 en KT | Medir el N3 sobre una copia en KT con el mismo diff de TAO-192, sin tocar el ticket real. | Pendiente | - → - | - | 0/2 | F2.1; F2.2; F2.3 |
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

**Registro F1** (estado: En curso)
- **Fecha real:** inicio 2026-10-06 · fin -
- **Antes de empezar:**
  - [x] F1-P1: F0 cerrada con el MCP ya reiniciado. (F0 cerrada el 2026-10-06 19:25 UTC con el MCP reiniciado; la verificación de entrega de las 19:24 UTC ya no informa código más nuevo que el proceso de esta sesión.)
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F1.1** → Creada la serie de pruebas en KT (proyecto kanai_test, repo kanai_test_repo): rama acumuladora epic/KT-ACUM desde main (18a055f); KT-017 (normalize.mjs, la dependencia) y KT-018 (normalized-count.mjs, el consumidor que importa normalizeText), ambos implement en 2 sesiones y modo manual; relación KT-018 depends_on KT-017; rama de trabajo de ambos fijada a epic/KT-ACUM. Por decisión del dev (opción B) la dependencia es un ticket nuevo que también se ejecuta, no commits de KT-016. KT-017 planificado (spec KT-017-SPEC en borrador, 4 REQs, 2 sesiones, 4 tareas, tope T2); KT-018 se planifica cuando KT-017 esté integrado en la rama acumuladora.. Dónde: Proyecto kanai_test: KT-017, KT-018, relación rel-kt018-depends-kt017; repo /Users/edobacon/Workspace/kanai/kanai_test_repo, rama epic/KT-ACUM. Cómo se comprobó: git branch --list 'epic/*' muestra epic/KT-ACUM en 18a055f; list_tickets y la exportación de KT-017 muestran el ticket con su spec en borrador; set_ticket_work_branch confirmó el override epic/KT-ACUM en los dos tickets; add_relation devolvió el id de la relación.
  - **F1.2** pendiente: Ejecutarlo completo (spec, sesiones y gates) con LLM real y guardar en el KB sus rondas del N3, tokens por gate, si el sandbox corrió y los hallazgos repetidos.
- **Criterios cumplidos:**
  - **F1-C1** pendiente (evidence): El sandbox corrió y dejó evidencia en todos los gates del ticket sintético.
  - **F1-C2** pendiente (evidence): El KB trae la tabla de medidas reales del ticket sintético contra las metas, sin cifras inventadas.
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

### F2. Repetir el caso de TAO-192 en KT

**Meta:** Medir el N3 sobre una copia en KT con el mismo diff de TAO-192, sin tocar el ticket real.
**Esfuerzo:** 4 h

**Registro F2** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F2-P1: F1 cerrada.
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
  - Sin registros.
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
