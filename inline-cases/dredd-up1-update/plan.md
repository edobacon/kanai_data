# Plan inline: Dredd up1 1.1: plan de evolución autónoma

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Una única entrega final 1.1 para Claude Code, ejecutada y verificada en macOS de forma autónoma por el agente, con diseño portable a Linux y Windows cuya verificación real queda aplazada para después de la implementación. Todas las mejoras acordadas y documentación operativa propia. Preservar íntegra la documentación v1 y generar comparación v1/1.1. Sin push, publicación ni cambios de hooks globales.
**Tags:** projects: up1 · repos: up1 · branches: feat/dredd-update, feat/dredd-update-1.1 · labels: dredd, tooling, autonomo, metricas, investigacion
**Estado:** 2 de 8 fases cerradas. Juez final: pendiente.

## Registro de avance

| Fase | Meta | Estado | Fecha real | Commits | Criterios | Pendiente |
|---|---|---|---|---|---|---|
| F0 Cerrar contexto y contrato 1.1 | Resolver decisiones y fijar aceptación antes de cambios de implementación. | Hecho | 2026-10-05 → 2026-10-05 | - | 3/3 | - |
| F1 Base portable y operación segura | Helper, sesiones, guard y ejecución aislada con diseño portable, verificados en macOS. | Hecho | 2026-10-05 → 2026-10-05 | e7778ec, 7ac44c4, 1eed401, 2d80dc0 | 4/4 | - |
| F2 Rigor del protocolo y auditoría de configuración | Contrato autónomo por fases, hallazgos estructurados y veredicto reproducible. | En curso | 2026-10-05 → - | - | 0/4 | F2.1; F2.2; F2.3; F2.4 |
| F3 Concurrencia, jurado y verificación independiente | Adaptar esfuerzo al riesgo sin perder evidencia ni control del parent. | Pendiente | - → - | - | 0/4 | F3.1; F3.2; F3.3; F3.4 |
| F4 Seguimiento local, pre-envío y revisión del delta | Persistir puntos y cobertura para verificar cierres sin olvidar código no leído. | Pendiente | - → - | - | 0/4 | F4.1; F4.2; F4.3; F4.4 |
| F5 Métricas locales y exportación Markdown | Registrar ejecuciones reales y generar reportes compartibles sin servicios externos. | Pendiente | - → - | - | 0/4 | F5.1; F5.2; F5.3; F5.4 |
| F6 Documentación 1.1 y comparación histórica | Documentar la implementación real de 1.1 y mantener la referencia v1 íntegra. | Pendiente | - → - | - | 0/3 | F6.1; F6.2; F6.3; F6.4 |
| F7 Validación integral en macOS y juez final | Aceptar una única entrega 1.1 verificada en macOS, con documentación y auditoría independiente. | Pendiente | - → - | - | 0/4 | F7.1; F7.2; F7.3; F7.4 |

## Riesgos

- Sin verificación real en Linux y Windows, el diseño portable puede fallar al probarse después; la documentación 1.1 debe declararlos sin verificar.
- Las suites las corre el mismo agente que implementa; el juez ciego por fase y el juez final son el control independiente.
- Ledger concurrente y guard deben aislar sesiones sin abrir bypass de seguridad.
- Tokens/costo incompletos no se inventan; outcomes no equivalen automáticamente a precisión.
- Decisiones de jurado, Jira local, rúbrica y retención siguen pendientes hasta F0.
- Checkout con cambios ajenos; aislar ejecución sin descartar ni mezclar su trabajo.
- Un criterio de tests puede aprobar en vacío si la carpeta o el patrón no tienen tests; por eso cada criterio exige mínimo y suites nombradas.
- F2 corre en paralelo con F1.2-F1.4: cambios de F1 sobre helper o estado pueden obligar a ajustar F2 antes de cerrar F3.

## Fuera de alcance

- Verificación real en Linux y Windows (suites y smoke de Claude Code): aplazada para después de la implementación, como seguimiento aparte.
- Dependencias/referencias a plataformas de gestión o búsqueda excluidas en el producto up1.
- Cambios de funcionalidad o repos de módulos de up1.
- Codex como cliente objetivo; dashboards o servicios de métricas remotos.
- Push, PR, merge, despliegue, comentarios externos o instalación global automática.
- Modificar o reemplazar los documentos históricos v1.
- Ejecutar ahora la implementación o dar por corridas pruebas futuras.

## Fases

### F0. Cerrar contexto y contrato 1.1

**Meta:** Resolver decisiones y fijar aceptación antes de cambios de implementación.
**Responsable sugerido:** Agente prepara propuestas y artefactos; el dev decide y confirma F0.C1
**Esfuerzo:** Estimación inicial de esfuerzo activo: 1-2 días; recalibrar tras F0; no es fecha de entrega.
**Cómo deshacerla:** No aplica: fase de análisis/validación sin cambios de código ni publicación.

**Registro F0** (estado: Hecho)
- **Fecha real:** inicio 2026-10-05 · fin 2026-10-05
- **Antes de empezar:**
  - [x] F0.P1: El usuario autoriza el plan; documentos base y repos verificados, sin iniciar implementación. (El dev autorizó el plan en el chat el 2026-10-05 ('autorizo el plan, arranca F0'), después de tres enmiendas del mismo día (tests por fase, verificación solo macOS, modo autónomo opción A). Repo up1 verificado por el intake: rama base develop y rama de trabajo feat/dredd-update existen; documentos base v1 en 348ea29.)
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F0.1** → Propuesta de las 6 políticas (D1 jurado, D2 costo, D3 Jira, D4 veredictos, D5 workers/modelos/tiempo, D6 retención y anonimización) con opciones y motivo; el dev aprobó la opción A de todas.. Dónde: KB: f0-propuesta-decisiones.md (propuesta) y f0-decisiones-aprobadas.md (decisión humana, separada). Cómo se comprobó: Aprobación explícita del dev en el chat el 2026-10-05; propuesta y decisión registradas en documentos distintos como pide la tarea. · ejecutó: llm
  - **F0.2** → Arquitectura portable definida: Python mínimo 3.9 stdlib (D7), git 2.38 con merge-tree (D8), bb.py en lugar de bb.sh (D9), estado por corrida con escritura atómica y lock O_EXCL (D10), vínculo de sesión por init (D11), DREDD_HOME y schema_version (D12). Fuente de tokens: solo la que exponga el cliente, si no null (D2). Validación Linux/Windows aplazada por decisión del dev.. Dónde: KB: f0-propuesta-decisiones.md D7-D12, f0-decisiones-aprobadas.md, f0-contrato-y-matriz.md secciones 1 y 2. Cómo se comprobó: Versiones relevadas en la máquina (git 2.54.0; Python 3.9.6 sistema, 3.9.25/3.10/3.13/3.14.4 homebrew, 3.10.12 pyenv; Claude Code 2.1.278); aprobación del dev el 2026-10-05. · ejecutó: llm
  - **F0.3** → Baseline v1 congelada (blobs y SHA-256 de los dos documentos en 348ea29), foto del checkout dirty (8 rutas ajenas) con estrategia de preservación, convención de tests test_fN_<area>.py y matriz de aceptación con mínimos por fase: F1 24, F2 23, F3 16, F4 17, F5 15; total 95 y 20 suites.. Dónde: KB del caso: f0-baseline-v1-y-preservacion.md y f0-contrato-y-matriz.md. Cómo se comprobó: Blobs con git rev-parse 348ea29:<ruta> y SHA-256 con git show | shasum -a 256 (dredd-v1.md 57a2661, 122 líneas; dredd-operacion-v1.md ac32aa7, 845 líneas). git status --porcelain=v1 con 8 líneas, SHA-256 2ac64f44. Mínimos contados caso por caso desde la matriz. · ejecutó: llm, `git rev-parse 348ea29:docs/reference/dredd-v1.md 348ea29:docs/guides/dredd-operacion-v1.md && git status --porcelain=v1 | shasum -a 256`, salida 0, 2 blobs registrados; 8 líneas de cambios ajenos; ningún archivo modificado por el agente.
- **Criterios cumplidos:**
  - **F0.C1** Decisiones pendientes resueltas con motivo y responsable; autorización de implementación registrada. → El dev aprobó en el chat el 2026-10-05 las 12 decisiones (opción A, motivo en cada una) y autorizó implementar todas las fases ('ok, apruebo, ejecuta todas las fases'). Responsable: el dev. Registrado en f0-decisiones-aprobadas.md.
  - **F0.C2** Contrato de interfaces, entornos, rúbrica y matriz de pruebas disponibles en el KB, con convención de nombres de tests y mínimo de tests por fase. → f0-contrato-y-matriz.md: entorno (macOS, Python 3.9 y 3.14, git 2.38+), tabla de interfaces (bb.py, progreso, guard, estado, hallazgo, veredicto, expediente, métricas), rúbrica según D4 aprobada, convención test_fN_<area>.py y matriz con mínimos F1 24, F2 23, F3 16, F4 17, F5 15 (total 95, 20 suites). · ejecutó: llm
  - **F0.C3** Hashes/docs v1 congelados y estrategia para preservar cambios ajenos verificable. → f0-baseline-v1-y-preservacion.md registra blobs y SHA-256 de docs/reference/dredd-v1.md (57a2661df56bb29744ca0ff9dfd7c9bd3b07d78b) y docs/guides/dredd-operacion-v1.md (ac32aa749069c136c36c40195b3513d62f2c037d) en 348ea29, el comando de comprobación para F6.C2, la lista de 8 rutas ajenas y la estrategia: stage solo por rutas explícitas, comandos git prohibidos, control de git status sobre las 8 rutas al cerrar cada fase y tests en temporales con DREDD_HOME aislado. · ejecutó: llm, `git status --porcelain=v1 | shasum -a 256`, salida 0, 8 líneas; SHA-256 2ac64f44a016cd3f17d02980a819701bd54b9cf0b5a1de0587d9bf7d4bd9eab6
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Enmienda: 1) Criterios de comando por fase: cada fase corre solo sus tests (patrón test_fN_*.py) y la expectativa exige un mínimo de tests fijado en F0.3 (nunca 0) y las suites nombradas; F7 corre la suite completa y exige las 20 suites. F0.3 fija la convención y los mínimos. 2) F0.C4 nuevo: responsables de validar Linux y Windows asignados antes de cerrar F0; F7.P1 exige su disponibilidad. 3) Rangos de esfuerzo con guion simple. 4) F2 deja de esperar F1 completa: arranca con F0 cerrada y F1.1 terminada (prefetch con refs exactos); F3 exige F1 y F2 cerradas.. Motivo: Análisis del 2026-10-05: el mismo comando unittest en seis fases no distinguía qué probó cada una y podía aprobar con 'Ran 0 tests' sobre una carpeta vacía; la validación Linux/Windows no tenía responsable y bloquearía F7; las métricas leían esfuerzo mínimo 0 por el guion largo; la auditoría de configuración (F2) no depende del aislamiento de sesiones ni del guard de F1. Decisiones del dev: A+B, responsable Linux/Windows, rangos y desacople.
  - Enmienda: Ejecución y verificación del plan solo en macOS. La verificación real en Linux y Windows sale del plan y queda aplazada para después de la implementación. El código y la documentación mantienen el diseño portable, y la documentación declara Linux y Windows sin verificar. Se quita F0.C4 (responsables Linux/Windows) y la asignación en F0.2; F7 pasa a 'Validación integral en macOS y juez final' (F7.1, F7.C1, F7.C2 y F7.P1 solo macOS); F6 agrega el estado de verificación por sistema; out_of_scope y riesgos actualizados.. Motivo: Decisión del dev del 2026-10-05: la ejecución es en macOS y el plan debe ceñirse a eso; la verificación de Linux y Windows queda para después de implementar. Reemplaza la decisión anterior de verificar los tres sistemas en la primera entrega.
  - Enmienda: Modo autónomo (opción A): los criterios de tests F1.C1-F5.C1 y F7.C1 pasan de comando del dev a evidencia ejecutada por el agente en macOS, con el mismo comando, exit 0, mínimo de tests y suites nombradas, y la salida resumida en el registro. Se agrega un criterio de juez ciego por fase (F1.C4-F5.C4) en las fases con código. Owner de cada fase actualizado. F7.2 explicita lo que sigue siendo del dev: token de Bitbucket en el entorno y hooks para la prueba extremo a extremo.. Motivo: Decisión del dev del 2026-10-05 (opción A): ejecución autónoma del plan; intervención humana solo en F0, en lo que requiere credenciales u hooks de F7.2, en el smoke y aceptación de F7 y si el juez pide correcciones. El juez ciego por fase compensa que las suites las corra el agente.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Contexto y contrato 1.1 cerrados: 12 decisiones aprobadas por el dev (opción A), baseline v1 congelada con blobs y SHA-256, estrategia de preservación del checkout dirty, contrato de interfaces y matriz con 95 tests mínimos en 20 suites. Sin cambios de código.. Siguiente: 2026-10-05: iniciar F1 (base portable y operación segura) empezando por F1.1, el helper bb.py y el prefetch.

### F1. Base portable y operación segura

**Meta:** Helper, sesiones, guard y ejecución aislada con diseño portable, verificados en macOS.
**Responsable sugerido:** Agente implementa, ejecuta las suites en macOS y commitea por fase sin push
**Esfuerzo:** Estimación inicial de esfuerzo activo: 3-5 días; recalibrar tras F0; no es fecha de entrega.
**Cómo deshacerla:** Revertir sólo los commits nuevos de esta fase con git revert en la rama del caso; conservar cambios ajenos, documentación v1 y registros locales. Si cambia formato local, respaldar datos y ofrecer retorno de esquema sin borrar historial.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F1** (estado: Hecho)
- **Fecha real:** inicio 2026-10-05 · fin 2026-10-05
- **Antes de empezar:**
  - [x] F1.P1: F0 cerrada con criterios y commits aplicables registrados; autorización de implementación vigente. (F0 cerrada el 2026-10-05 con sus 3 tareas y 3 criterios registrados; no cambia código, sin commits aplicables. Autorización de implementación vigente (f0-decisiones-aprobadas.md). Trabajo en worktree limpio up1__dredd-1.1, rama feat/dredd-update-1.1, sin avisos de commits pendientes.)
- **Commits:**
  - `e7778ec` · feat(dredd): portable helper, isolated runs and non-mutating merge check · up1/feat/dredd-update-1.1 (verificado)
  - `7ac44c4` · fix(dredd): close guard bypasses and protect closed runs · up1/feat/dredd-update-1.1 (verificado)
  - `1eed401` · fix(dredd): guard rules by bypass class · up1/feat/dredd-update-1.1 (verificado)
  - `2d80dc0` · fix(dredd): quote-aware guard segments and more installers · up1/feat/dredd-update-1.1 (verificado)
- **Qué se hizo:**
  - **F1.1** → bb.py reemplaza a bb.sh (stdlib): paginación completa por next con límite de 200 páginas y sin seguir otros orígenes, salidas 3/4/5/6 para auth, HTTP, red/timeout y tasa, 3 reintentos ante 429 con Retry-After, solo refs hash, rutas URL-quoted, redirects sin credenciales a otro host, override de API solo a localhost, subcomandos nuevos tree y prefetch (foto única con manifiesto). bb.sh retirado; SKILL.md actualizado (Helper, Prefetch, Fase 0). Commit e7778ec.. Dónde: .claude/skills/dredd/scripts/bb.py; SKILL.md secciones Helper y Fase 0. Cómo se comprobó: test_f1_helper: 16 tests OK en Python 3.9 y 3.14 contra API simulada en 127.0.0.1. · ejecutó: llm
  - **F1.2** → dredd_state.py: corridas en <DREDD_HOME>/runs/<run_id>/state.json, escritura atómica (tmp + fsync + os.replace), lock O_CREAT|O_EXCL por corrida con retiro de locks de más de 30 s, TTL de 3 h desde la última actividad, run_id validado contra path traversal, aviso único del active.json v1. dredd-progress.py: init imprime RUN_ID, todos los comandos aceptan --run y fallan si hay varias corridas vivas sin --run, close cierra solo la corrida propia, list. dredd_render.py compartido por progress, statusline y notify; statusline muestra solo la corrida de su sesión.. Dónde: .claude/skills/dredd/scripts/dredd_state.py, dredd_render.py, dredd-progress.py, dredd-statusline.py, dredd-progress-notify.py. Cómo se comprobó: test_f1_sessions: 10 tests OK (8 escritores concurrentes por corrida sin pérdida, aislamiento de sesión, fallback por cwd, TTL por actividad, close propio, lock vencido, escritura interrumpida, aviso v1, run_id inválido). · ejecutó: llm
  - **F1.3** → Guard 1.1: inerte salvo sesiones vinculadas por --run (o cwd dentro del repo si falta session_id); permite runners instalados (npm test, npm run, pnpm exec, node_modules/.bin, npx --no-install, npm exec --no) y deniega instalaciones y descargas (npx sin --no-install, npm exec, dlx, pip, choco/winget), egress fuera de bb.py, secretos, binarios y escritura en el clone. dredd-git.py merge-check: merge-tree --write-tree o worktree temporal propio, base explícita y head por hash. dredd-install.py instala/desinstala/detecta v1 sin bash ni chmod. SKILL.md: F1.5 usa merge-check y npx --no-install; sección de instalación reemplazada.. Dónde: .claude/skills/dredd/scripts/dredd-guard.py, dredd-git.py, dredd-install.py; SKILL.md Fase 1.5, Paso 0c, Blindaje. Cómo se comprobó: test_f1_guard 10 tests y test_f1_checkout 6 tests OK: checkout, stash, worktrees y archivos sin commitear idénticos antes y después; solo se borran temporales propios. · ejecutó: llm
  - **F1.4** → Infraestructura de tests aislada (tests/_support.py): hogar y DREDD_HOME temporales, API de Bitbucket simulada en 127.0.0.1 con registro de requests, repos git temporales. Fixtures: más de 100 resultados (150 en 2 páginas y 101 en tree), credencial faltante y 401/403, rutas con espacios y Unicode (guía de uso.md, repo con espacios ñandú), limpieza de temporales propios y fallos parciales (timeout, 429 agotado, escritura interrumpida).. Dónde: .claude/skills/dredd/scripts/tests/. Cómo se comprobó: Suite F1 completa: 42 tests OK en 3.9 y 3.14; no toca el checkout ni ~/.dredd. · ejecutó: llm
- **Criterios cumplidos:**
  - **F1.C1** Suite de F1 ejecutada por el agente en macOS con el Python soportado de F0: python -m unittest discover -s .claude/skills/dredd/scripts/tests -p "test_f1_*.py" -v. Exit 0; 'Ran N tests' con N mayor o igual al mínimo de F1 fijado en F0.3 (nunca 0); suites test_f1_helper, test_f1_sessions, test_f1_guard y test_f1_checkout presentes; sin fallos ni skips que oculten requisitos. Comando, código de salida y totales en el registro. → Ejecutado en el worktree up1__dredd-1.1 sobre e7778ec, 2026-10-05. · ejecutó: llm, `PYTHONDONTWRITEBYTECODE=1 /opt/homebrew/bin/python3.9 -m unittest discover -s .claude/skills/dredd/scripts/tests -p "test_f1_*.py" -v (y lo mismo con /opt/homebrew/bin/python3.14)`, salida 0, Ran 42 tests, OK en ambos intérpretes (mínimo de F1: 24). Suites: test_f1_helper 16, test_f1_sessions 10, test_f1_guard 10, test_f1_checkout 6. Sin skips.
  - **F1.C2** Matriz por sistema identifica mecanismos usados, límites y resolución de Python/git; macOS verificado, Linux y Windows marcados como diseño sin verificar. → KB f1-matriz-plataformas.md: 9 mecanismos (helper, credenciales, estado, lock, sesión, guard, merge, instalador, consola) con implementación, estado por sistema (macOS verificado; Linux y Windows diseño sin verificar), límites conocidos y resolución de Python (mínimo 3.9, hooks con sys.executable) y git (2.38 o worktree temporal). · ejecutó: llm
  - **F1.C3** Guard y runners dejan de contradecirse sin ampliar permisos de red/escritura indiscriminadamente. → SKILL.md F1.5 invoca tsc/eslint/vitest con npx --no-install y el guard lo permite (test_allows_installed_runners) mientras sigue denegando npx sin esa bandera, npm install, pip install y dlx (test_denies_package_installs). El merge de la v1 en el checkout se reemplazó por dredd-git.py merge-check (no mutante). No se abrió egress nuevo: la única salida sigue siendo el helper (bb.py) y el guard deniega curl e inline urllib. · ejecutó: llm
  - **F1.C4** Juez ciego de fase: subagente de contexto limpio con un brief armado desde el plan, los criterios y el diff de la fase; veredicto sin hallazgos bloqueantes abiertos, registrado en el KB del caso. → Juez ciego sonnet de contexto limpio, 4 rondas (KB f1-juez-ciego.md): iterar en e7778ec, 7ac44c4 y 1eed401 por bypasses del guard; aprobado con nits en 2d80dc0. Sin hallazgos bloqueantes abiertos; quedan N5, N9, N10 como S3 aceptados y J5 (DKC en el protocolo) diferido a F2. · ejecutó: llm, `PYTHONDONTWRITEBYTECODE=1 /opt/homebrew/bin/python3.9 -m unittest discover -s .claude/skills/dredd/scripts/tests -p "test_f1_*.py"`, salida 0, 55 tests OK en 2d80dc0 (corrida del juez y propia, también en 3.14)
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Enmienda: F1.C4-F5.C4: el juez ciego de fase usa un brief armado por el agente desde el plan, los criterios y el diff de la fase (subagente de contexto limpio) y su veredicto se registra en el KB del caso; ya no exige el brief de fase de Kanai. El juez final de Kanai se mantiene para F7. Tags: se agrega la rama feat/dredd-update-1.1.. Motivo: Kanai permite juez por fase o juez final, no ambos; el plan está en juez final y no entrega brief por fase. Decisión del dev del 2026-10-05: mantener el final y correr un juez ciego propio en F1-F5.
- **Hallazgos:**
  - introducido · .claude/skills/dredd/scripts/dredd-guard.py (v1 y primera versión 1.1): El guard permitía instalar (npm ci, yarn) y abrir red vía wrappers (sh -c, xargs, node -e, os.system inline) y no pedía confirmación para bb.py comment; detectado por el juez ciego y corregido en 7ac44c4, 1eed401 y 2d80dc0.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Base portable y operación segura terminada en 4 commits (e7778ec, 7ac44c4, 1eed401, 2d80dc0): bb.py reemplaza a bb.sh con paginación, errores explícitos, prefetch y tree; corridas aisladas con lock portable y TTL por actividad; guard vinculado a sesión con reglas por clase de bypass y límite documentado; merge-check no mutante; instalador sin bash. 55 tests OK en Python 3.9 y 3.14. Juez ciego: aprobado con nits tras 4 rondas.. Siguiente: 2026-10-05: cerrar F2 (protocolo fragmentado, triage, rúbrica y auditoría de configuración ya en curso en paralelo).

### F2. Rigor del protocolo y auditoría de configuración

**Meta:** Contrato autónomo por fases, hallazgos estructurados y veredicto reproducible.
**Responsable sugerido:** Agente implementa, ejecuta las suites en macOS y commitea por fase sin push
**Esfuerzo:** Estimación inicial de esfuerzo activo: 3-5 días; recalibrar tras F0; no es fecha de entrega.
**Cómo deshacerla:** Revertir sólo los commits nuevos de esta fase con git revert en la rama del caso; conservar cambios ajenos, documentación v1 y registros locales. Si cambia formato local, respaldar datos y ofrecer retorno de esquema sin borrar historial.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F2** (estado: En curso)
- **Fecha real:** inicio 2026-10-05 · fin -
- **Antes de empezar:**
  - [x] F2.P1: F0 cerrada y F1.1 terminada (prefetch con refs exactos) con sus commits registrados; autorización de implementación vigente. Puede avanzar en paralelo con F1.2-F1.4. (F0 cerrada el 2026-10-05; F1.1 terminada y registrada (bb.py con prefetch y refs por hash) en el commit e7778ec, registrado en F1. Autorización de implementación vigente. F2 avanza en paralelo con el cierre de F1 (juez de fase en curso).)
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F2.1** pendiente: Fragmentar protocolo y formalizar resultados
  - **F2.2** pendiente: Implementar triage y rúbrica
  - **F2.3** pendiente: Auditar configuraciones y layouts
  - **F2.4** pendiente: Validar rigor con casos tabulados
- **Criterios cumplidos:**
  - **F2.C1** pendiente (evidence): Suite de F2 ejecutada por el agente en macOS con el Python soportado de F0: python -m unittest discover -s .claude/skills/dredd/scripts/tests -p "test_f2_*.py" -v. Exit 0; 'Ran N tests' con N mayor o igual al mínimo de F2 fijado en F0.3 (nunca 0); suites test_f2_protocol, test_f2_triage, test_f2_rubric y test_f2_config presentes; sin fallos ni skips que oculten requisitos. Comando, código de salida y totales en el registro.
  - **F2.C2** pendiente (evidence): Mapa de fases demuestra preservación de capacidades v1 y autonomía del nuevo protocolo.
  - **F2.C3** pendiente (evidence): Veredicto calculado coincide con fixtures; cada hallazgo incluye mecanismo, ref y fundamento.
  - **F2.C4** pendiente (evidence): Juez ciego de fase: subagente de contexto limpio con un brief armado desde el plan, los criterios y el diff de la fase; veredicto sin hallazgos bloqueantes abiertos, registrado en el KB del caso.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - D4 aprobada decía 'mantener los nombres v1' pero listaba cinco nombres (rechazado, iterar, aprobable con reservas, aprobable con nits, aprobable) tomados de otra herramienta; la v1 de up1 usa cuatro: aprobable, aprobable-con-observaciones, iterar, bloquear (SKILL.md v1 y docs/reference/dredd-v1.md).. Por qué: Error de la propuesta del agente. Se implementa la intención de D4 (nombres v1 para comparar con la v1) con la misma tabla de reglas: S0 bloquear; S1 iterar; dos S2 sin piso o un S2 de contrato compartido iterar; S2 o solo S3/consultas aprobable-con-observaciones; nada aprobable.. Cambia la decisión: Nombres de veredicto: los cuatro de la v1 de up1. Se informa al dev en el próximo reporte para que confirme o corrija.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F3. Concurrencia, jurado y verificación independiente

**Meta:** Adaptar esfuerzo al riesgo sin perder evidencia ni control del parent.
**Responsable sugerido:** Agente implementa, ejecuta las suites en macOS y commitea por fase sin push
**Esfuerzo:** Estimación inicial de esfuerzo activo: 2-4 días; recalibrar tras F0; no es fecha de entrega.
**Cómo deshacerla:** Revertir sólo los commits nuevos de esta fase con git revert en la rama del caso; conservar cambios ajenos, documentación v1 y registros locales. Si cambia formato local, respaldar datos y ofrecer retorno de esquema sin borrar historial.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F3** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F3.P1: F1 y F2 cerradas con criterios y commits aplicables registrados; autorización de implementación vigente.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F3.1** pendiente: Orquestar roles por ejes independientes
  - **F3.2** pendiente: Implementar jurado según F0 y síntesis
  - **F3.3** pendiente: Implementar verificador condicional
  - **F3.4** pendiente: Conservar acciones externas en parent
- **Criterios cumplidos:**
  - **F3.C1** pendiente (evidence): Suite de F3 ejecutada por el agente en macOS con el Python soportado de F0: python -m unittest discover -s .claude/skills/dredd/scripts/tests -p "test_f3_*.py" -v. Exit 0; 'Ran N tests' con N mayor o igual al mínimo de F3 fijado en F0.3 (nunca 0); suites test_f3_orchestration, test_f3_jury, test_f3_verifier y test_f3_consent presentes; sin fallos ni skips que oculten requisitos. Comando, código de salida y totales en el registro.
  - **F3.C2** pendiente (evidence): Una revisión amplia comparte prefetch y deduplica sin atribuir cobertura inexistente.
  - **F3.C3** pendiente (evidence): Sin consentimiento no hay publicación ni creación externa; hallazgos refutados recalibran resultado.
  - **F3.C4** pendiente (evidence): Juez ciego de fase: subagente de contexto limpio con un brief armado desde el plan, los criterios y el diff de la fase; veredicto sin hallazgos bloqueantes abiertos, registrado en el KB del caso.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F4. Seguimiento local, pre-envío y revisión del delta

**Meta:** Persistir puntos y cobertura para verificar cierres sin olvidar código no leído.
**Responsable sugerido:** Agente implementa, ejecuta las suites en macOS y commitea por fase sin push
**Esfuerzo:** Estimación inicial de esfuerzo activo: 3-5 días; recalibrar tras F0; no es fecha de entrega.
**Cómo deshacerla:** Revertir sólo los commits nuevos de esta fase con git revert en la rama del caso; conservar cambios ajenos, documentación v1 y registros locales. Si cambia formato local, respaldar datos y ofrecer retorno de esquema sin borrar historial.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F4** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F4.P1: F3 cerrada con criterios y commits aplicables registrados; autorización de implementación vigente.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F4.1** pendiente: Diseñar expediente local versionado
  - **F4.2** pendiente: Implementar cálculo git de scope y cobertura
  - **F4.3** pendiente: Integrar rondas y decisiones
  - **F4.4** pendiente: Probar invalidación y conservación de historia
- **Criterios cumplidos:**
  - **F4.C1** pendiente (evidence): Suite de F4 ejecutada por el agente en macOS con el Python soportado de F0: python -m unittest discover -s .claude/skills/dredd/scripts/tests -p "test_f4_*.py" -v. Exit 0; 'Ran N tests' con N mayor o igual al mínimo de F4 fijado en F0.3 (nunca 0); suites test_f4_case, test_f4_scope, test_f4_rounds y test_f4_invalidation presentes; sin fallos ni skips que oculten requisitos. Comando, código de salida y totales en el registro.
  - **F4.C2** pendiente (evidence): Expediente y métricas futuras distinguen corrección, decisión y pendiente.
  - **F4.C3** pendiente (evidence): Revisión parcial o archivo ojeado nunca aparecen como cobertura completa.
  - **F4.C4** pendiente (evidence): Juez ciego de fase: subagente de contexto limpio con un brief armado desde el plan, los criterios y el diff de la fase; veredicto sin hallazgos bloqueantes abiertos, registrado en el KB del caso.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F5. Métricas locales y exportación Markdown

**Meta:** Registrar ejecuciones reales y generar reportes compartibles sin servicios externos.
**Responsable sugerido:** Agente implementa, ejecuta las suites en macOS y commitea por fase sin push
**Esfuerzo:** Estimación inicial de esfuerzo activo: 2-3 días; recalibrar tras F0; no es fecha de entrega.
**Cómo deshacerla:** Revertir sólo los commits nuevos de esta fase con git revert en la rama del caso; conservar cambios ajenos, documentación v1 y registros locales. Si cambia formato local, respaldar datos y ofrecer retorno de esquema sin borrar historial.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F5** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F5.P1: F4 cerrada con criterios y commits aplicables registrados; autorización de implementación vigente.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F5.1** pendiente: Implementar esquema y captura
  - **F5.2** pendiente: Implementar comando report
  - **F5.3** pendiente: Implementar agregados y outcomes honestos
  - **F5.4** pendiente: Probar y generar muestra anonimizada
- **Criterios cumplidos:**
  - **F5.C1** pendiente (evidence): Suite de F5 ejecutada por el agente en macOS con el Python soportado de F0: python -m unittest discover -s .claude/skills/dredd/scripts/tests -p "test_f5_*.py" -v. Exit 0; 'Ran N tests' con N mayor o igual al mínimo de F5 fijado en F0.3 (nunca 0); suites test_f5_capture, test_f5_report, test_f5_aggregates y test_f5_anonymize presentes; sin fallos ni skips que oculten requisitos. Comando, código de salida y totales en el registro.
  - **F5.C2** pendiente (evidence): El comando genera un .md legible con sección de datos incompletos y muestra reproducible.
  - **F5.C3** pendiente (evidence): Registros/reportes declaran versión 1.1 y no exponen secretos, rutas personales ni código sensible.
  - **F5.C4** pendiente (evidence): Juez ciego de fase: subagente de contexto limpio con un brief armado desde el plan, los criterios y el diff de la fase; veredicto sin hallazgos bloqueantes abiertos, registrado en el KB del caso.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F6. Documentación 1.1 y comparación histórica

**Meta:** Documentar la implementación real de 1.1 y mantener la referencia v1 íntegra.
**Responsable sugerido:** Agente redacta, verifica y commitea sin push
**Esfuerzo:** Estimación inicial de esfuerzo activo: 1-2 días; recalibrar tras F0; no es fecha de entrega.
**Cómo deshacerla:** No aplica: fase de análisis/validación sin cambios de código ni publicación.

**Registro F6** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F6.P1: F5 cerrada con criterios y commits aplicables registrados; autorización de implementación vigente.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F6.1** pendiente: Crear referencia y guía operativa 1.1
  - **F6.2** pendiente: Crear comparación v1 a 1.1 e índice
  - **F6.3** pendiente: Documentar métricas y trazabilidad
  - **F6.4** pendiente: Verificar preservación y ejemplos
- **Criterios cumplidos:**
  - **F6.C1** pendiente (evidence): Documentos 1.1, comparación e índice presentes con enlaces y ejemplos validados.
  - **F6.C2** pendiente (evidence): Ambos documentos v1 coinciden byte a byte con la línea base 348ea29.
  - **F6.C3** pendiente (evidence): Documentación 1.1 describe sólo comportamientos implementados y declara Linux y Windows sin verificar, con la verificación aplazada como pendiente.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F7. Validación integral en macOS y juez final

**Meta:** Aceptar una única entrega 1.1 verificada en macOS, con documentación y auditoría independiente.
**Responsable sugerido:** Agente ejecuta suite, extremo a extremo y juez final; el dev confirma smoke (F7.C2) y aceptación (F7.C4)
**Esfuerzo:** Estimación inicial de esfuerzo activo: 1-2 días; recalibrar tras F0; no es fecha de entrega.
**Cómo deshacerla:** No aplica: fase de análisis/validación sin cambios de código ni publicación.

**Registro F7** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F7.P1: F6 cerrada con criterios y commits aplicables registrados; autorización de implementación vigente.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F7.1** pendiente: Ejecutar matriz en macOS
  - **F7.2** pendiente: Verificar extremo a extremo y regresión
  - **F7.3** pendiente: Preparar paquete único y revisión independiente
  - **F7.4** pendiente: Registrar resultado y correcciones necesarias
- **Criterios cumplidos:**
  - **F7.C1** pendiente (evidence): Suite completa ejecutada por el agente en macOS con el Python soportado de F0: python -m unittest discover -s .claude/skills/dredd/scripts/tests -v. Exit 0; 'Ran N tests' con N mayor o igual a la suma de los mínimos de F1-F5; las 20 suites test_f1_* a test_f5_* presentes; sin fallos ni skips que oculten requisitos. Comando, código de salida y totales en el registro.
  - **F7.C2** pendiente (manual): Smoke de Claude Code en macOS y revisión del reporte Markdown confirmados por el dev.
  - **F7.C3** pendiente (evidence): Juez final evalúa alcance completo, conservación v1 y que la verificación aplazada de Linux y Windows quede declarada; resultado registrado.
  - **F7.C4** pendiente (manual): Única entrega 1.1 aceptada con commits, docs y rollback, sin publicar por esta fase.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.
