---
id: KANAI-KB009-SPEC
project: kanai_self
ticket: KANAI-KB009
status: draft
---

# Endurecer el camino canónico de ejecución/registro de Kanai: selección de backend, enforcement del store, tools MCP de registro, export de reglas al global e integración con host git/PR

## Requirements

#### REQ-01 `confirmed`
> Fuente: Request Alcance #1 (P0); causa raíz server/dispatch/adapters/index.ts:43 normalizeBackend(undefined)→'local'; AC 'run_process sin backend elegido PREGUNTA entre los favoritos'
> Necesidad: build
run_process NO debe caer a un default 'local' roto cuando no hay backend elegido. Si no hay LLM ya seleccionado (ni en input, ni en config de proyecto, ni en sesión), debe PREGUNTAR al usuario entre los LLM marcados como FAVORITOS en vez de elegir silenciosamente.

#### REQ-02 `confirmed`
> Fuente: Request Alcance #1 (P0); AC 'Existe la noción de LLM favoritos y un default de ejecución por proyecto'
> Necesidad: build
Introducir la noción de LLM/backends FAVORITOS marcables por el usuario y un default de ejecución configurable por proyecto en config.yaml (p.ej. executionBackend + model, como claude + claude-opus-4-8).

#### REQ-03 `confirmed`
> Fuente: Request Alcance #1 (P0) 'Fallback seguro'
> Necesidad: build
Fallback seguro: si el favorito/elegido no responde, run_process falla con un fix-hint claro (p.ej. 'elegí un backend disponible' / 'pasá backend:claude'), NO con un fetch error genérico ni cayendo a 'local'.

#### REQ-04 `confirmed`
> Fuente: Request Alcance #2 (P0) 'no improvisar'; contexto 'se fue a edición directa del store'
> Necesidad: build
Regla de contrato explícita: si la vía canónica no está disponible (backend caído, tool faltante), el agente debe FRENAR y avisar; nunca editar el store directamente. Debe reintentar con el backend real elegido antes de rendirse.

#### REQ-05 `confirmed`
> Fuente: Request Alcance #3 (P1); AC 'El hook bloquea escrituras a ~/.kanai/data/** desde Bash/Edit/Write'; commit cb23fef hook PreToolUse
> Necesidad: build
Hook PreToolUse instalable que bloquee Bash/Edit/Write sobre ~/.kanai/data/** (DB, KB, teach, ndjson). La única vía de mutación del store son las tools MCP; el 'no toques el store' pasa de advisory a enforced.

#### REQ-06 `confirmed`
> Fuente: Request Alcance #4 (P1); commit 08d1fa4 manage_test_case + migración; DET-25
> Necesidad: build
Tool MCP para test cases: alta + actualizar estado/actual/evidencia (DET-25), sin depender del dispatch LLM, de modo que un ticket se registre sin editar el store a mano.

#### REQ-07 `confirmed`
> Fuente: Request Alcance #4 (P1); commit 3ba86f5 manage_learn; DET-39
> Necesidad: build
Tool MCP para refinar/descartar learns (DET-39) sin pasar por chat /refine-learn ni por run_process, para poder procesar learns raw al cierre sin tocar el store.

#### REQ-08 `confirmed`
> Fuente: Request Alcance #4 (P1); commit 454345a register_teach; DET-21/22
> Necesidad: build
Tool MCP para registrar teach (intake/close) (DET-21/22) sin depender del dispatch LLM.

#### REQ-09 `confirmed`
> Fuente: Request Alcance #4 (P1) 'refine_spec solo edita REQs/tasks'; Fuera de alcance aclara que la implementación completa del render puede derivar a su propio ticket
> Necesidad: build
Cubrir la prosa del spec: hoy refine_spec solo edita REQs/tasks estructurados y no reescribe Artifacts/Decisions/Technical reference/Acceptance ni la tabla ## Tasks del cuerpo. Resolver rendrizando el cuerpo desde datos estructurados o con una tool de enmienda de secciones del cuerpo, sin edición a mano.

#### REQ-10 `confirmed`
> Fuente: Request Alcance #5 (P2) defecto refine_spec duplica tasks; commit 65bf176 fix refine_spec no duplica; AC 'refine_spec no duplica tasks'
> Necesidad: build
refine_spec NO debe duplicar/resucitar tasks en cada enmienda (2 filas por código; los deletes se pisaban al re-materializar del cuerpo).

#### REQ-11 `confirmed`
> Fuente: Request Alcance #5 (P2) 'Test cases basura re-derivados de los encabezados'; AC 'no se re-derivan TCs basura'
> Necesidad: build
No re-derivar test cases basura ('File'/'Suite') a partir de los encabezados de las tablas vacías de ## Testing del ticket (el parser tomaba el header como TC).

#### REQ-12 `inferred`
> Fuente: Request Alcance #5 (P2) 'Store frágil ante escritura concurrente'; kanai-app/CLAUDE.md hazard SQLITE_BUSY/wal_checkpoint
> Necesidad: build
Robustecer el store ante escritura concurrente: el MCP con la DB abierta pisa writers externos; busy_timeout + checkpoint no alcanza. Garantizar que la vía canónica sea la única que muta y que escrituras concurrentes no corrompan/pierdan datos.

#### REQ-13 `confirmed`
> Fuente: Request Alcance #6 (P1); DET_CATALOG server/engine/guards/catalog.ts; AC 'kanai export-rules --global inyecta las reglas de Kanai y reemplaza el bloque DKC'
> Necesidad: build
Construir kanai export-rules --global (regenerable, entre marcadores, 'no editar a mano') que escriba el contrato + DETs condensados de Kanai en el CLAUDE.md global, REEMPLAZANDO el bloque DKC (Kanai es el sucesor; los DET son casi 1:1).

#### REQ-14 `confirmed`
> Fuente: Request Alcance #6 (P1) 'El instalador debe hacer las 3 cosas'; scripts/install-claude-skills.mts
> Necesidad: build
El instalador (pnpm kanai:install) debe hacer las 3 cosas: instalar skills + inyectar reglas al global (REQ-13) + instalar el hook PreToolUse (REQ-05).

#### REQ-15 `confirmed`
> Fuente: Request Alcance #7 (P1); AC 'Kanai conoce el host git por repo y puede guiar/ejecutar push + apertura de PR'; reuso de dredd-bb.sh
> Necesidad: build
Kanai debe conocer el host git por repo (Bitbucket Cloud en up1) y poder, como parte del cierre, guiar/ejecutar push + apertura de PR (título/descripción desde el ticket, base configurable), sin depender de recursos externos de DKC/dredd; credenciales resueltas por config y nunca impresas.

## Tasks

#### S1.T1 — Introducir favoritos de LLM y default de ejecución por proyecto: leer executionBackend+model desde config.yaml, exponer marcado/lectura de favoritos, y validar valores contra los adapters soportados.
Contrato: rollback: Revertir el commit; sin el bloque nuevo en config.yaml la resolución vuelve al comportamiento previo (feature aditiva, sin migración de datos).. Status: pending

#### S1.T2 — Reescribir la resolución de backend de run_process: orden input → config de proyecto → sesión → prompt-entre-favoritos; eliminar la caída silenciosa a 'local' en normalizeBackend(undefined).
Contrato: rollback: Restaurar normalizeBackend y la firma previa de run_process desde git; el default 'local' vuelve pero es reversible.. Status: pending

#### S1.T3 — Fallback seguro: cuando el backend elegido no responde, fallar con fix-hint accionable (nombrando el backend fallido y una alternativa como backend:claude), nunca con fetch error crudo ni cayendo a local.
Contrato: rollback: Revertir el wrapper de error; run_process vuelve a propagar el error de fetch tal cual.. Status: pending

#### S1.T4 — Registrar en el catálogo de reglas de Kanai (DET_CATALOG/guards) la regla de contrato 'no improvisar': vía canónica no disponible → frenar y avisar, reintentar con el backend elegido, nunca editar el store directo; emitida por kanai_bootstrap.
Contrato: rollback: Quitar la regla del catálogo; el set emitido por bootstrap vuelve al estado previo.. Status: pending

#### S1.T5 — Tests unitarios y de regresión de la sesión: resolución de backend en las 4 fuentes, no-caída a local, fix-hint, favoritos/config; regresión de que refine_spec/review_spec siguen ejecutando con claude-opus-4-8.
Contrato: rollback: Revertir el archivo de tests; no afecta código de producción.. Status: pending

#### S2.T1 — Tools MCP de registro canónico (test cases, learns, teach) para poder ejecutar y cerrar un ticket sin tocar el store a mano.
Contrato: rollback: Revertir los commits de las tools y su migración; el store no queda alterado (las tools son la única vía de mutación).. Status: pending
Subtasks: 3 (ejecutar hojas; el padre espera a todas)

#### S2.T1.1 — manage_test_case: alta + actualizar estado/actual/evidencia (DET-25), con reindex FTS y regla Affects UI:yes exige evidencia/override.
Contrato: rollback: Revertir commit 08d1fa4 y su migración.. Status: pending

#### S2.T1.2 — manage_learn: refinar a rule/bug/decision o descartar con razón, marcando estado en el markdown vivo (DET-39).
Contrato: rollback: Revertir commit 3ba86f5.. Status: pending

#### S2.T1.3 — register_teach: intake/close sin dispatch LLM, seteando teachings.intake/close y respetando teach_policy:skip (DET-21/22).
Contrato: rollback: Revertir commit 454345a.. Status: pending

#### S2.T2 — Hook PreToolUse instalable que bloquee Bash/Edit/Write sobre ~/.kanai/data/** con resolución canónica de path (relativos/symlinks), permitiendo lecturas y escrituras fuera del data workspace.
Contrato: rollback: Desinstalar/revertir el hook (commit cb23fef); el 'no toques el store' vuelve a ser advisory.. Status: pending
Subtasks: 4 (ejecutar hojas; el padre espera a todas)

#### S2.T2.1 — Resolvedor canónico de path del hook: normalizar relativos, expandir ~, resolver symlinks (realpath) y decidir si el target cae dentro de ~/.kanai/data/** (dbPath del data workspace resuelto, no hardcodeado).
Contrato: rollback: Revertir el módulo resolver del hook.. Status: pending

#### S2.T2.2 — Matcher de operaciones de escritura: interceptar Edit/Write y comandos Bash con sinks de escritura/borrado (>, >>, tee, sqlite3, rm, cp, mv, truncate) sobre paths del data workspace; dejar pasar lecturas (Read/cat/less).
Contrato: rollback: Revertir el matcher; el hook deja de interceptar.. Status: pending

#### S2.T2.3 — Mensaje de bloqueo accionable que nombra el path bloqueado y redirige a las tools MCP (manage_test_case/manage_learn/register_teach) como única vía de mutación del store.
Contrato: rollback: Revertir el texto del mensaje de bloqueo.. Status: pending

#### S2.T2.4 — Registrar el hook PreToolUse como instalable en settings (matcher Bash|Edit|Write) y validar bloqueo dentro / permiso fuera del data workspace y en el repo de código.
Contrato: rollback: Desregistrar el hook de settings (commit cb23fef).. Status: pending

#### S2.T3 — Cubrir prosa del spec y corregir defectos del parser/refine_spec por la vía canónica.
Contrato: rollback: Revertir los commits del grupo; refine_spec vuelve al comportamiento previo (documentado, con el bug conocido).. Status: pending
Subtasks: 3 (ejecutar hojas; el padre espera a todas)

#### S2.T3.1 — Enmienda de secciones de prosa del spec (Artifacts/Decisions/Technical reference/Acceptance/tabla ## Tasks) por tool/render, acotando a otro ticket la implementación completa de render-desde-estructura si excede el alcance.
Contrato: rollback: Revertir el commit de enmienda de prosa.. Status: pending

#### S2.T3.2 — Fix de duplicación/resurrección de tasks en refine_spec: dedupe por código y respetar deletes al re-materializar del cuerpo.
Contrato: rollback: Revertir commit 65bf176.. Status: pending

#### S2.T3.3 — Fix del parser de Testing: no tomar el header 'File'/'Suite' de tablas vacías como TC (normalizar mayúsculas/espacios).
Contrato: rollback: Revertir el commit del parser.. Status: pending

#### S2.T4 — Robustez ante escritura concurrente: busy_timeout + checkpoint en las tools, serialización del writer y verificación de persistencia post-mutación, apoyado en el hook como único writer externo.
Contrato: rollback: Revertir el commit; el store vuelve al manejo previo de concurrencia (frágil pero funcional).. Status: pending
Subtasks: 4 (ejecutar hojas; el padre espera a todas)

#### S2.T4.1 — Setear PRAGMA busy_timeout en la apertura de conexión de las tools de mutación para tolerar la DB abierta por el MCP sin fallar de inmediato.
Contrato: rollback: Quitar el pragma busy_timeout de la apertura de conexión.. Status: pending

#### S2.T4.2 — Serializar el writer: garantizar un único path de mutación (cola/lock a nivel del proceso MCP) para que dos mutaciones canónicas no se pisen.
Contrato: rollback: Revertir la serialización del writer.. Status: pending

#### S2.T4.3 — Checkpoint WAL tras cada mutación y verificación de persistencia en la DB (no solo en WAL) antes de reportar éxito.
Contrato: rollback: Revertir el checkpoint/verificación post-mutación.. Status: pending

#### S2.T4.4 — Manejo explícito de SQLITE_BUSY: reintento acotado o fallo con mensaje claro, nunca escritura a medias ni pérdida silenciosa.
Contrato: rollback: Revertir el handler de SQLITE_BUSY.. Status: pending

#### S2.T5 — Tests y regresión de la sesión: cada tool (alta/actualización/errores), bloqueo del hook (write bloqueado / read permitido / fuera-de-scope permitido), no-duplicación de tasks, cero TCs basura, y concurrencia sin pérdida.
Contrato: rollback: Revertir el archivo de tests; no afecta producción.. Status: pending
Subtasks: 6 (ejecutar hojas; el padre espera a todas)

#### S2.T5.1 — Tests de manage_test_case: alta ligada a ticket + persistencia/FTS, actualización estado/actual/evidencia, error en TC inexistente, Affects UI:yes exige evidencia/override, no colisión con el parser del cuerpo.
Contrato: rollback: Revertir el bloque de tests de manage_test_case.. Status: pending

#### S2.T5.2 — Tests de manage_learn: refinar raw a rule/bug/decision, descartar con razón, error en learn inexistente/ya procesado, conteo de learns raw a 0 tras procesar (gate DET-39).
Contrato: rollback: Revertir el bloque de tests de manage_learn.. Status: pending

#### S2.T5.3 — Tests de register_teach: intake/close sin dispatch LLM seteando teachings.intake/close, y teach_policy:skip marca skipped con razón sin generar archivo.
Contrato: rollback: Revertir el bloque de tests de register_teach.. Status: pending

#### S2.T5.4 — Tests del hook: write bloqueado dentro del data workspace (Edit/Write/Bash), read permitido, escritura fuera-de-scope permitida, path relativo/symlink resuelto y bloqueado.
Contrato: rollback: Revertir el bloque de tests del hook.. Status: pending

#### S2.T5.5 — Tests de enmienda de prosa y parser: enmienda persiste sin tocar REQs/tasks, no-duplicación al reenviar enmienda, task eliminada no reaparece, cero TCs basura de header 'File'/'Suite' (incluye variantes de mayúsculas/espacios).
Contrato: rollback: Revertir el bloque de tests de prosa/parser.. Status: pending

#### S2.T5.6 — Tests de concurrencia: escritura concurrente no se pierde (SQLITE_BUSY manejado/serializado), persistencia verificada post-checkpoint, operaciones secuenciales normales sin degradación.
Contrato: rollback: Revertir el bloque de tests de concurrencia.. Status: pending

#### S3.T1 — kanai export-rules --global: generar el contrato + DETs condensados de Kanai desde DET_CATALOG y escribirlos entre marcadores en el CLAUDE.md global, reemplazando el bloque DKC de forma idempotente y preservando el contenido fuera de marcadores.
Contrato: rollback: Revertir el comando; restaurar el CLAUDE.md global desde backup previo a la primera corrida.. Status: pending
Subtasks: 2 (ejecutar hojas; el padre espera a todas)

#### S3.T1.1 — Generador del bloque condensado desde server/engine/guards/catalog.ts (contrato + 41 DETs) con marcadores de inicio/fin y nota 'no editar a mano'.
Contrato: rollback: Revertir el generador; sin él no se emite bloque.. Status: pending

#### S3.T1.2 — Escritor idempotente sobre el CLAUDE.md global: detectar y reemplazar bloque DKC o bloque Kanai previo, insertar si no existe, preservar el resto.
Contrato: rollback: Restaurar el global desde backup.. Status: pending

#### S3.T2 — Instalador pnpm kanai:install de 3 etapas: skills + export-rules --global + hook PreToolUse, idempotente y con reporte de fallo por etapa.
Contrato: rollback: Revertir los cambios del instalador; queda solo la instalación de skills previa (install-claude-skills.mts).. Status: pending
Subtasks: 4 (ejecutar hojas; el padre espera a todas)

#### S3.T2.1 — Etapa skills: reutilizar install-claude-skills.mts como sub-paso idempotente (no duplica skills al re-ejecutar).
Contrato: rollback: Revertir el wrapper de la etapa skills; queda el script de skills standalone.. Status: pending

#### S3.T2.2 — Etapa export-rules --global: invocar el comando de REQ-13 desde el instalador, idempotente (no duplica ni anida el bloque).
Contrato: rollback: Quitar la invocación de export-rules del instalador.. Status: pending

#### S3.T2.3 — Etapa hook: colocar/registrar el hook PreToolUse (REQ-05) en settings, idempotente (no duplica el hook si ya existe).
Contrato: rollback: Quitar la etapa de instalación del hook.. Status: pending

#### S3.T2.4 — Orquestación de las 3 etapas con reporte de fallo por etapa: si una falla, reportar cuál y detenerse sin dejar estado a medias silencioso.
Contrato: rollback: Revertir el orquestador; el instalador vuelve a la etapa de skills sola.. Status: pending

#### S3.T3 — Integración con host git por repo y apertura de PR desde el cierre.
Contrato: rollback: Revertir los commits del grupo; el cierre vuelve a no crear PRs y el usuario usa recursos externos como antes.. Status: pending
Subtasks: 3 (ejecutar hojas; el padre espera a todas)

#### S3.T3.1 — Config de host git por repo (Bitbucket Cloud para up1) con base de PR configurable y resolución de credenciales por config, nunca impresas ni logueadas.
Contrato: rollback: Quitar el bloque de host git de la config; feature aditiva.. Status: pending

#### S3.T3.2 — Portar el mecanismo de dredd-bb.sh a Kanai para push + creación de PR con título/descripción derivados del ticket, usando el id externo (DET-19) cuando exista.
Contrato: rollback: Revertir el commit del cliente git/PR.. Status: pending

#### S3.T3.3 — Enganchar la etapa push+PR en request-close en modo guiado o ejecutado según haya host configurado, sin romper teach-close/learns/gates existentes.
Contrato: rollback: Revertir el hook de cierre; el flujo de close vuelve al previo.. Status: pending

#### S3.T4 — Tests y regresión de la sesión: idempotencia y reemplazo del bloque DKC por export-rules, preservación de contenido fuera de marcadores, instalador 3-etapas idempotente/fallo-por-etapa, PR con id externo, credenciales nunca impresas, y cierre guiado sin host; regresión del flujo de cierre existente.
Contrato: rollback: Revertir el archivo de tests; no afecta producción.. Status: pending
Subtasks: 3 (ejecutar hojas; el padre espera a todas)

#### S3.T4.1 — Tests export-rules --global: escribe el bloque entre marcadores con nota 'no editar a mano', reemplaza el bloque DKC in situ, idempotente al re-correr, inserta si no existe, preserva contenido del usuario fuera de marcadores.
Contrato: rollback: Revertir el bloque de tests de export-rules.. Status: pending

#### S3.T4.2 — Tests del instalador 3-etapas: ejecuta las 3 acciones verificable por efectos, idempotente en las 3, reporte de fallo por etapa, skills preexistente sigue funcionando.
Contrato: rollback: Revertir el bloque de tests del instalador.. Status: pending

#### S3.T4.3 — Tests de host git/PR: push+PR con título/descripción del ticket, id externo (DET-19) cuando existe, credenciales ausentes/inválidas → error accionable sin imprimir token, repo sin host → modo guiado, cierre existente no se rompe.
Contrato: rollback: Revertir el bloque de tests de host git/PR.. Status: pending

## Decisions

P0-P2 implementados por el motor (backend selection, tools canonicas de learns/testcases/teach, plan_ticket, export-rules, hilo de ejecucion). Registrado sin editar el store a mano.

