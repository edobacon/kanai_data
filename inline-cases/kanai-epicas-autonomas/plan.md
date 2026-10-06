# Plan inline: Épicas con planificación y ejecución autónoma encadenada

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Implementar el plan acordado de épicas autónomas en Kanai, con permisos por harness, Teach/Skip, seguimiento de tickets, recuperación y métricas desde el inicio; evaluar piloto Tao Mangalam. Registrar el plan no inicia ejecución.
**Tags:** projects: kanai_self · repos: kanai-app · labels: epicas, autonomia, harness, metricas, piloto-taomangalam
**Estado:** 10 de 12 fases cerradas. Juez final: pendiente.

## Registro de avance

| Fase | Meta | Estado | Fecha real | Commits | Criterios | Pendiente |
|---|---|---|---|---|---|---|
| F1 Contrato y preparación | Resolver las decisiones de diseño y establecer la base verificable antes de implementar. | Hecho | 2026-10-03 → 2026-10-03 | d7802b51d7f35f17f14bdd0a5368463caafedf4f | 2/2 | - |
| F2 Modelo de épica, plan y corrida | Persistir composición, planes versionados y progreso recuperable. | Hecho | 2026-10-03 → 2026-10-03 | 0de9f9cc5df1592a3cf3242c1cb8cdc8e4a1f619 | 2/2 | - |
| F3 Composición y dependencias | Validar viabilidad y orden, contrastando declaraciones con el cuerpo de los tickets. | Hecho | 2026-10-03 → 2026-10-03 | 89dc3cfc3bfc1b8935e88580960d064cc7118fad | 2/2 | - |
| F4 Ramas, integración y checkpoints | Vincular evidencia por ticket al estado real de la rama acumuladora. | Hecho | 2026-10-03 → 2026-10-03 | a2a49360d25eb80f651bbb5077b8b5895cbc65df, a471da5289bd0439a158a0e1ca616c13956dccd8, 5dde60d4d6368c9d322f1f800f4c262c6e4065f7 | 2/2 | - |
| F5 Harnesses, permisos y aprobaciones | Comprobar autonomía efectiva antes de iniciar y respetar las restricciones del host. | Hecho | 2026-10-03 → 2026-10-03 | de910a6a9dcb6586943b1efced79a1023154a127 | 2/2 | - |
| F6 Orquestación, Teach y recuperación | Encadenar tickets con intake individual y avance dentro del alcance autorizado. | Hecho | 2026-10-03 → 2026-10-03 | e86dbbed17280f857d1560aaf72391d0f0988a41 | 2/2 | - |
| F7 Revisión integral y cierre | Concentrar revisión amplia y CI final sin perder evidencia ni autorización. | Hecho | 2026-10-03 → 2026-10-03 | c19285df5aa8f2a3b149bce415ab96cf47858512 | 2/2 | - |
| F8 Vistas y operaciones MCP | Mostrar y gestionar épicas con el mismo contrato de autorización desde UI y MCP. | Hecho | 2026-10-03 → 2026-10-03 | e6d5a6a103a184773e3e038b56a0e8647f3c83ac | 2/2 | - |
| F9 Tablero y exportación de métricas | Hacer evaluables velocidad, autonomía, calidad y recuperación con datos reconciliables. | Hecho | 2026-10-03 → 2026-10-03 | 1d716b440eb4ae9b112f4ba75f47dacb288b0ef0 | 2/2 | - |
| F11 Correcciones de revisión de implementación | Resolver los ocho hallazgos originales de arbiter y los adicionales de los ciclos de revisión antes del piloto, con evidencia y registro. | Hecho | 2026-10-03 → 2026-10-03 | 80c2d51dcced57d84e5e1802eb9a50ed40689ab4, bd004db5261a4e72dc49a64155823b9bb4cdaa8d, 364eb16afcd35f7fe8879f20f645c00a76e7561e | 2/2 | - |
| F12 Correcciones del planificador destapadas por el piloto Jormat | Que una épica de otro proyecto se planifique sin dependencias falsas, con lecturas externas como entrada válida y con el repo aceptado por nombre o id, antes de ejecutar la cohorte Jormat del piloto. | En curso | 2026-10-06 → - | - | 2/2 | - |
| F10 Piloto, evaluación y mejoras | Validar el conjunto en Tao Mangalam y decidir expansión con evidencia. | Bloqueado (Piloto real pendiente de selección humana de 3–5 tickets Tao Mangalam, baseline posterior a DEC-239, rama, host/versión, responsables y permisos efectivos. Además faltan ejecución real y observación de defectos durante 14 días desde merge. No hay bloqueo de revisión de código: F11 cerrada y arbiter aprobado.) | 2026-10-03 → - | 07b7ac7, a43fc9a, 8d4221f, 01e17bf, da26ab3, 70eb4bc, abe6359, c29530d, e6478a7, aacbbca, b7cb29d | 0/2 | Seleccionar tickets, baseline y ambiente del piloto (2026-10-04); Evaluar resultados y priorizar expansión (2026-10-18); Informe de piloto con muestra y cumplimiento (2026-10-18); Comparación y seguimiento de 14 días (2026-10-18); Ejecutar piloto y observar defectos 14 días (2026-10-18); F10.1; F10.2; F10.3 |

## Riesgos

- Cierre humano actual por ticket requiere diseño explícito para cierre agregado.
- Un harness puede exigir intervención que no permite anticipar; no prometer autonomía universal.
- Validación tardía puede aumentar retrabajo; mantener comprobación por ticket.
- Cambios de alcance o permisos invalidan autorización/evidencia afectada.
- Muestras pequeñas no permiten concluir ahorro causal ni estabilidad.

## Fuera de alcance

- Ejecución paralela en el MVP.
- Coordinación multirrepositorio en el MVP.
- Importación masiva de backlog.
- Despliegue/publicación o merge sin la autorización aplicable.
- Escritura directa al store o bypass de guards.

## Fases

### F1. Contrato y preparación

**Meta:** Resolver las decisiones de diseño y establecer la base verificable antes de implementar.
**Esfuerzo:** Por estimar en F1 tras revisar el código y las capacidades existentes.
**Cómo deshacerla:** Conservar documentos y evidencia; corregir decisiones mediante enmienda auditada, sin modificar código ni borrar historial.

**Registro F1** (estado: Hecho)
- **Fecha real:** inicio 2026-10-03 · fin 2026-10-03
- **Antes de empezar:**
  - [x] F1-P1: Plan registrado para revisión; antes de ejecutar, confirmar alcance, estado del repositorio y autorizaciones necesarias. (Autorización explícita de implementación en esta conversación. Repositorio limpio comprobado; rama codex/epicas-autonomas creada desde setup. Escritura fuera del workspace autorizada por revisión automática.)
- **Commits:**
  - `d7802b51d7f35f17f14bdd0a5368463caafedf4f` · docs(epics): define execution and authorization contract · kanai-app/codex/epicas-autonomas (verificado)
- **Qué se hizo:**
  - **F1.1** → Inventario de FSM, autopilot, acumuladora, MCP y registro inline.. Dónde: docs/development/epic-execution.md; server/dispatch/autopilotMode.ts; server/repo/accumulatorBranch.ts; server/mcp/tools.ts. Cómo se comprobó: Lectura de código y contrato; repositorio y rama comprobados con Git. · ejecutó: llm
  - **F1.2** → Contrato documentado: host visible, permisos efectivos, cierre humano y rama seleccionada.. Dónde: docs/development/epic-execution.md; server/dispatch/autopilotMode.ts; server/repo/accumulatorBranch.ts; server/mcp/tools.ts. Cómo se comprobó: Lectura de código y contrato; repositorio y rama comprobados con Git. · ejecutó: llm
  - **F1.3** → Esquema de eventos y plan de validación documentados; piloto real separado de tests.. Dónde: docs/development/epic-execution.md; server/dispatch/autopilotMode.ts; server/repo/accumulatorBranch.ts; server/mcp/tools.ts. Cómo se comprobó: Lectura de código y contrato; repositorio y rama comprobados con Git. · ejecutó: llm
- **Criterios cumplidos:**
  - **F1-C1** Inventario y decisiones documentados con evidencia de código; incertidumbres visibles. → Contrato versionado en d7802b51d7f35f17f14bdd0a5368463caafedf4f, inventario de puntos de integración, rama codex/epicas-autonomas, ambiente local Node 24.
  - **F1-C2** Contrato revisado, rama de trabajo y ambientes definidos; no se confunde aprobación del plan con permisos efectivos. → Contrato versionado en d7802b51d7f35f17f14bdd0a5368463caafedf4f, inventario de puntos de integración, rama codex/epicas-autonomas, ambiente local Node 24.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Contrato e inventario documentados y commit registrado. Host visible primero, sin bypass de cierre humano; piloto requiere selección real y seguimiento.. Siguiente: 2026-10-03: implementar F2, modelo y persistencia.

### F2. Modelo de épica, plan y corrida

**Meta:** Persistir composición, planes versionados y progreso recuperable.
**Esfuerzo:** Por estimar en F1 tras revisar el código y las capacidades existentes.
**Cómo deshacerla:** Revertir únicamente los commits de esta fase mediante el flujo acordado; conservar datos, eventos y evidencia. Si afecta persistencia, verificar compatibilidad y respaldos antes de aplicar cambios; no borrar corridas ni sobrescribir trabajo ajeno.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F2** (estado: Hecho)
- **Fecha real:** inicio 2026-10-03 · fin 2026-10-03
- **Antes de empezar:**
  - [x] F2-P1: F1 cerrada con sus criterios y evidencia verificados. (F1 cerrada; contrato y commit verificados por Kanai.)
- **Commits:**
  - `0de9f9cc5df1592a3cf3242c1cb8cdc8e4a1f619` · Modelo versionado y persistencia atómica de épicas · kanai-app/codex/epicas-autonomas (verificado)
- **Qué se hizo:**
  - **F2.1** → Modelo versionado y persistencia atómica de épicas; paquete 1 verificado en los archivos de la fase.. Dónde: server/epics/schema.ts; server/epics/store.ts; tests/unit/epic-store.test.ts. Cómo se comprobó: 2 tests pasan: persistencia/eventos, duplicados, traversal y exclusión de escritores; estado validado por Zod. · ejecutó: llm
  - **F2.2** → Modelo versionado y persistencia atómica de épicas; paquete 2 verificado en los archivos de la fase.. Dónde: server/epics/schema.ts; server/epics/store.ts; tests/unit/epic-store.test.ts. Cómo se comprobó: 2 tests pasan: persistencia/eventos, duplicados, traversal y exclusión de escritores; estado validado por Zod. · ejecutó: llm
  - **F2.3** → Modelo versionado y persistencia atómica de épicas; paquete 3 verificado en los archivos de la fase.. Dónde: server/epics/schema.ts; server/epics/store.ts; tests/unit/epic-store.test.ts. Cómo se comprobó: 2 tests pasan: persistencia/eventos, duplicados, traversal y exclusión de escritores; estado validado por Zod. · ejecutó: llm
- **Criterios cumplidos:**
  - **F2-C1** Modelo y transiciones verificados; corridas incompatibles no escriben simultáneamente. → 2 tests pasan: persistencia/eventos, duplicados, traversal y exclusión de escritores; estado validado por Zod.; commit 0de9f9cc5df1592a3cf3242c1cb8cdc8e4a1f619
  - **F2-C2** Eventos versionados y deduplicables; recuperación de estado sin escrituras directas al store. → 2 tests pasan: persistencia/eventos, duplicados, traversal y exclusión de escritores; estado validado por Zod.; commit 0de9f9cc5df1592a3cf3242c1cb8cdc8e4a1f619
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Modelo versionado y persistencia atómica de épicas. 2 tests pasan: persistencia/eventos, duplicados, traversal y exclusión de escritores; estado validado por Zod.. Siguiente: 2026-10-03: continuar con la siguiente fase según prerequisitos.

### F3. Composición y dependencias

**Meta:** Validar viabilidad y orden, contrastando declaraciones con el cuerpo de los tickets.
**Esfuerzo:** Por estimar en F1 tras revisar el código y las capacidades existentes.
**Cómo deshacerla:** Revertir únicamente los commits de esta fase mediante el flujo acordado; conservar datos, eventos y evidencia. Si afecta persistencia, verificar compatibilidad y respaldos antes de aplicar cambios; no borrar corridas ni sobrescribir trabajo ajeno.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F3** (estado: Hecho)
- **Fecha real:** inicio 2026-10-03 · fin 2026-10-03
- **Antes de empezar:**
  - [x] F3-P1: F2 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
- **Commits:**
  - `89dc3cfc3bfc1b8935e88580960d064cc7118fad` · Planificador de composición, dependencias y deriva · kanai-app/codex/epicas-autonomas (verificado)
- **Qué se hizo:**
  - **F3.1** → Planificador de composición, dependencias y deriva; paquete 1 verificado en los archivos de la fase.. Dónde: server/epics/planner.ts; server/epics/schema.ts; tests/unit/epic-planner.test.ts. Cómo se comprobó: 5 tests pasan: orden A-B-C, ciclos, externos, inferencias pendientes, compatibilidad de alcance y deriva del cuerpo. · ejecutó: llm
  - **F3.2** → Planificador de composición, dependencias y deriva; paquete 2 verificado en los archivos de la fase.. Dónde: server/epics/planner.ts; server/epics/schema.ts; tests/unit/epic-planner.test.ts. Cómo se comprobó: 5 tests pasan: orden A-B-C, ciclos, externos, inferencias pendientes, compatibilidad de alcance y deriva del cuerpo. · ejecutó: llm
  - **F3.3** → Planificador de composición, dependencias y deriva; paquete 3 verificado en los archivos de la fase.. Dónde: server/epics/planner.ts; server/epics/schema.ts; tests/unit/epic-planner.test.ts. Cómo se comprobó: 5 tests pasan: orden A-B-C, ciclos, externos, inferencias pendientes, compatibilidad de alcance y deriva del cuerpo. · ejecutó: llm
- **Criterios cumplidos:**
  - **F3-C1** Ciclo, dependencia externa e incompatibilidad impiden aprobar el plan afectado. → server/epics/planner.ts; tests/unit/epic-planner.test.ts: 5 tests junto a epic-store pasan, incluyendo ciclos, externos, orden e invalidación por cambio de cuerpo. Commit 89dc3cfc3bfc1b8935e88580960d064cc7118fad.
  - **F3-C2** Inferencias no se aprueban automáticamente; compartir archivos no se trata por sí solo como dependencia; cambios relevantes invalidan el plan. → server/epics/planner.ts; tests/unit/epic-planner.test.ts: 5 tests junto a epic-store pasan, incluyendo ciclos, externos, orden e invalidación por cambio de cuerpo. Commit 89dc3cfc3bfc1b8935e88580960d064cc7118fad.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Planificador y 5 tests verificados; commit registrado.. Siguiente: 2026-10-03: F4 ramas e integración.

### F4. Ramas, integración y checkpoints

**Meta:** Vincular evidencia por ticket al estado real de la rama acumuladora.
**Esfuerzo:** Por estimar en F1 tras revisar el código y las capacidades existentes.
**Cómo deshacerla:** Revertir únicamente los commits de esta fase mediante el flujo acordado; conservar datos, eventos y evidencia. Si afecta persistencia, verificar compatibilidad y respaldos antes de aplicar cambios; no borrar corridas ni sobrescribir trabajo ajeno.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F4** (estado: Hecho)
- **Fecha real:** inicio 2026-10-03 · fin 2026-10-03
- **Antes de empezar:**
  - [x] F4-P1: F2 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
- **Commits:**
  - `a2a49360d25eb80f651bbb5077b8b5895cbc65df` · feat(epics): verify branch integration and reconcile refs · kanai-app/codex/epicas-autonomas (verificado)
  - `a471da5289bd0439a158a0e1ca616c13956dccd8` · feat(epics): persist verified integration checkpoints · kanai-app/codex/epicas-autonomas (verificado)
  - `5dde60d4d6368c9d322f1f800f4c262c6e4065f7` · Ramas seguras, integración por Git y checkpoint idempotente · kanai-app/codex/epicas-autonomas (verificado)
- **Qué se hizo:**
  - **F4.1** → Ramas seguras, integración por Git y checkpoint idempotente; paquete 1 verificado en los archivos de la fase.. Dónde: server/epics/git.ts; server/epics/checkpoint.ts; tests/unit/epic-git.test.ts; tests/unit/epic-checkpoint.test.ts. Cómo se comprobó: 2 tests pasan: rama sin checkout/reset, reachability, SHA final cambiado, recuperación/replay sin doble avance; efectos PR quedan bajo host y se reconcilian por commit integrado. · ejecutó: llm
  - **F4.2** → Ramas seguras, integración por Git y checkpoint idempotente; paquete 2 verificado en los archivos de la fase.. Dónde: server/epics/git.ts; server/epics/checkpoint.ts; tests/unit/epic-git.test.ts; tests/unit/epic-checkpoint.test.ts. Cómo se comprobó: 2 tests pasan: rama sin checkout/reset, reachability, SHA final cambiado, recuperación/replay sin doble avance; efectos PR quedan bajo host y se reconcilian por commit integrado. · ejecutó: llm
  - **F4.3** → Ramas seguras, integración por Git y checkpoint idempotente; paquete 3 verificado en los archivos de la fase.. Dónde: server/epics/git.ts; server/epics/checkpoint.ts; tests/unit/epic-git.test.ts; tests/unit/epic-checkpoint.test.ts. Cómo se comprobó: 2 tests pasan: rama sin checkout/reset, reachability, SHA final cambiado, recuperación/replay sin doble avance; efectos PR quedan bajo host y se reconcilian por commit integrado. · ejecutó: llm
- **Criterios cumplidos:**
  - **F4-C1** Ticket sólo desbloquea dependientes cuando está verificado e integrado en la rama seleccionada. → server/epics/git.ts; server/epics/checkpoint.ts; tests/unit/epic-git.test.ts; tests/unit/epic-checkpoint.test.ts; 2 tests pasan: rama sin checkout/reset, reachability, SHA final cambiado, recuperación/replay sin doble avance; efectos PR quedan bajo host y se reconcilian por commit integrado.; commit 5dde60d4d6368c9d322f1f800f4c262c6e4065f7
  - **F4-C2** Fallos inyectados después de efectos Git no duplican commits, PR ni integraciones; conflictos se reportan. → server/epics/git.ts; server/epics/checkpoint.ts; tests/unit/epic-git.test.ts; tests/unit/epic-checkpoint.test.ts; 2 tests pasan: rama sin checkout/reset, reachability, SHA final cambiado, recuperación/replay sin doble avance; efectos PR quedan bajo host y se reconcilian por commit integrado.; commit 5dde60d4d6368c9d322f1f800f4c262c6e4065f7
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Ramas seguras, integración por Git y checkpoint idempotente. 2 tests pasan: rama sin checkout/reset, reachability, SHA final cambiado, recuperación/replay sin doble avance; efectos PR quedan bajo host y se reconcilian por commit integrado.. Siguiente: 2026-10-03: continuar con la siguiente fase según prerequisitos.

### F5. Harnesses, permisos y aprobaciones

**Meta:** Comprobar autonomía efectiva antes de iniciar y respetar las restricciones del host.
**Esfuerzo:** Por estimar en F1 tras revisar el código y las capacidades existentes.
**Cómo deshacerla:** Revertir únicamente los commits de esta fase mediante el flujo acordado; conservar datos, eventos y evidencia. Si afecta persistencia, verificar compatibilidad y respaldos antes de aplicar cambios; no borrar corridas ni sobrescribir trabajo ajeno.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F5** (estado: Hecho)
- **Fecha real:** inicio 2026-10-03 · fin 2026-10-03
- **Antes de empezar:**
  - [x] F5-P1: F1 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
  - [x] F5-P2: F2 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
- **Commits:**
  - `de910a6a9dcb6586943b1efced79a1023154a127` · Preflight y permisos efectivos por recurso/harness · kanai-app/codex/epicas-autonomas (verificado)
- **Qué se hizo:**
  - **F5.1** → Preflight y permisos efectivos por recurso/harness; paquete 1 verificado en los archivos de la fase.. Dónde: server/epics/permissions.ts; tests/unit/epic-permissions.test.ts. Cómo se comprobó: 2 tests pasan: capability desconocida/denegada/interactiva, autorización vencida/revocada/otro recurso y merge no implícito. No se anuncia ningún harness real como plenamente autónomo. · ejecutó: llm
  - **F5.2** → Preflight y permisos efectivos por recurso/harness; paquete 2 verificado en los archivos de la fase.. Dónde: server/epics/permissions.ts; tests/unit/epic-permissions.test.ts. Cómo se comprobó: 2 tests pasan: capability desconocida/denegada/interactiva, autorización vencida/revocada/otro recurso y merge no implícito. No se anuncia ningún harness real como plenamente autónomo. · ejecutó: llm
  - **F5.3** → Preflight y permisos efectivos por recurso/harness; paquete 3 verificado en los archivos de la fase.. Dónde: server/epics/permissions.ts; tests/unit/epic-permissions.test.ts. Cómo se comprobó: 2 tests pasan: capability desconocida/denegada/interactiva, autorización vencida/revocada/otro recurso y merge no implícito. No se anuncia ningún harness real como plenamente autónomo. · ejecutó: llm
- **Criterios cumplidos:**
  - **F5-C1** Permiso desconocido no se concede; aprobación de plan no concede permiso del harness. → server/epics/permissions.ts; tests/unit/epic-permissions.test.ts; 2 tests pasan: capability desconocida/denegada/interactiva, autorización vencida/revocada/otro recurso y merge no implícito. No se anuncia ningún harness real como plenamente autónomo.; commit de910a6a9dcb6586943b1efced79a1023154a127
  - **F5-C2** Adaptadores soportados superan pruebas de conformidad; permiso tardío o revocado pausa y queda registrado. → server/epics/permissions.ts; tests/unit/epic-permissions.test.ts; 2 tests pasan: capability desconocida/denegada/interactiva, autorización vencida/revocada/otro recurso y merge no implícito. No se anuncia ningún harness real como plenamente autónomo.; commit de910a6a9dcb6586943b1efced79a1023154a127
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Preflight y permisos efectivos por recurso/harness. 2 tests pasan: capability desconocida/denegada/interactiva, autorización vencida/revocada/otro recurso y merge no implícito. No se anuncia ningún harness real como plenamente autónomo.. Siguiente: 2026-10-03: continuar con la siguiente fase según prerequisitos.

### F6. Orquestación, Teach y recuperación

**Meta:** Encadenar tickets con intake individual y avance dentro del alcance autorizado.
**Esfuerzo:** Por estimar en F1 tras revisar el código y las capacidades existentes.
**Cómo deshacerla:** Revertir únicamente los commits de esta fase mediante el flujo acordado; conservar datos, eventos y evidencia. Si afecta persistencia, verificar compatibilidad y respaldos antes de aplicar cambios; no borrar corridas ni sobrescribir trabajo ajeno.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F6** (estado: Hecho)
- **Fecha real:** inicio 2026-10-03 · fin 2026-10-03
- **Antes de empezar:**
  - [x] F6-P1: F3 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
  - [x] F6-P2: F4 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
  - [x] F6-P3: F5 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
- **Commits:**
  - `e86dbbed17280f857d1560aaf72391d0f0988a41` · Orquestación canónica y política temporal de autonomía/Teach · kanai-app/codex/epicas-autonomas (verificado)
- **Qué se hizo:**
  - **F6.1** → Orquestación canónica y política temporal de autonomía/Teach; paquete 1 verificado en los archivos de la fase.. Dónde: server/epics/runner.ts; server/epics/bridge.ts; server/epics/policy.ts; /private/tmp/kanai-epics-typecheck.txt; /private/tmp/kanai-epics-regressions.txt. Cómo se comprobó: 12 tests de épicas y 55 regresiones del motor pasan; typecheck exit 0. Lint no cubre TS, hallazgo preexistente registrado. El host visible ejecuta las llamadas canónicas devueltas. · ejecutó: llm
  - **F6.2** → Orquestación canónica y política temporal de autonomía/Teach; paquete 2 verificado en los archivos de la fase.. Dónde: server/epics/runner.ts; server/epics/bridge.ts; server/epics/policy.ts; /private/tmp/kanai-epics-typecheck.txt; /private/tmp/kanai-epics-regressions.txt. Cómo se comprobó: 12 tests de épicas y 55 regresiones del motor pasan; typecheck exit 0. Lint no cubre TS, hallazgo preexistente registrado. El host visible ejecuta las llamadas canónicas devueltas. · ejecutó: llm
  - **F6.3** → Orquestación canónica y política temporal de autonomía/Teach; paquete 3 verificado en los archivos de la fase.. Dónde: server/epics/runner.ts; server/epics/bridge.ts; server/epics/policy.ts; /private/tmp/kanai-epics-typecheck.txt; /private/tmp/kanai-epics-regressions.txt. Cómo se comprobó: 12 tests de épicas y 55 regresiones del motor pasan; typecheck exit 0. Lint no cubre TS, hallazgo preexistente registrado. El host visible ejecuta las llamadas canónicas devueltas. · ejecutó: llm
- **Criterios cumplidos:**
  - **F6-C1** A→B→C avanza sólo con prerequisitos verificados; Skip teach no omite intake, spec o gates. → server/epics/runner.ts; server/epics/bridge.ts; server/epics/policy.ts; /private/tmp/kanai-epics-typecheck.txt; /private/tmp/kanai-epics-regressions.txt; 12 tests de épicas y 55 regresiones del motor pasan; typecheck exit 0. Lint no cubre TS, hallazgo preexistente registrado. El host visible ejecuta las llamadas canónicas devueltas.; commit e86dbbed17280f857d1560aaf72391d0f0988a41
  - **F6-C2** Fallos, cambios de alcance y límites pausan; reanudar no repite efectos ni inventa aprobación humana. → server/epics/runner.ts; server/epics/bridge.ts; server/epics/policy.ts; /private/tmp/kanai-epics-typecheck.txt; /private/tmp/kanai-epics-regressions.txt; 12 tests de épicas y 55 regresiones del motor pasan; typecheck exit 0. Lint no cubre TS, hallazgo preexistente registrado. El host visible ejecuta las llamadas canónicas devueltas.; commit e86dbbed17280f857d1560aaf72391d0f0988a41
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - preexistente · eslint.config.mjs; /private/tmp/kanai-epics-lint.txt: El lint actual no configura archivos TypeScript y rechaza server/epics como ignorado. El caso kanai-eslint-real ya cubre habilitar lint real; no se declara que lint haya pasado.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Orquestación canónica y política temporal de autonomía/Teach. 12 tests de épicas y 55 regresiones del motor pasan; typecheck exit 0. Lint no cubre TS, hallazgo preexistente registrado. El host visible ejecuta las llamadas canónicas devueltas.. Siguiente: 2026-10-03: continuar con la siguiente fase según prerequisitos.

### F7. Revisión integral y cierre

**Meta:** Concentrar revisión amplia y CI final sin perder evidencia ni autorización.
**Esfuerzo:** Por estimar en F1 tras revisar el código y las capacidades existentes.
**Cómo deshacerla:** Revertir únicamente los commits de esta fase mediante el flujo acordado; conservar datos, eventos y evidencia. Si afecta persistencia, verificar compatibilidad y respaldos antes de aplicar cambios; no borrar corridas ni sobrescribir trabajo ajeno.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F7** (estado: Hecho)
- **Fecha real:** inicio 2026-10-03 · fin 2026-10-03
- **Antes de empezar:**
  - [x] F7-P1: F6 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
- **Commits:**
  - `c19285df5aa8f2a3b149bce415ab96cf47858512` · CI por SHA exacto y cierre agregado autorizado · kanai-app/codex/epicas-autonomas (verificado)
- **Qué se hizo:**
  - **F7.1** → CI por SHA exacto y cierre agregado autorizado; paquete 1 verificado en los archivos de la fase.. Dónde: server/epics/final.ts; server/epics/bridge.ts; tests/unit/epic-final.test.ts; /private/tmp/kanai-epics-typecheck.txt. Cómo se comprobó: 2 tests pasan: CI ausente/fallido/en nueva ejecución y SHA distinto bloquean; agente no puede autoaprobar revisión ni cierre. Cierre canónico conserva guards y reconcilia tickets ya cerrados; typecheck pasa. · ejecutó: llm
  - **F7.2** → CI por SHA exacto y cierre agregado autorizado; paquete 2 verificado en los archivos de la fase.. Dónde: server/epics/final.ts; server/epics/bridge.ts; tests/unit/epic-final.test.ts; /private/tmp/kanai-epics-typecheck.txt. Cómo se comprobó: 2 tests pasan: CI ausente/fallido/en nueva ejecución y SHA distinto bloquean; agente no puede autoaprobar revisión ni cierre. Cierre canónico conserva guards y reconcilia tickets ya cerrados; typecheck pasa. · ejecutó: llm
  - **F7.3** → CI por SHA exacto y cierre agregado autorizado; paquete 3 verificado en los archivos de la fase.. Dónde: server/epics/final.ts; server/epics/bridge.ts; tests/unit/epic-final.test.ts; /private/tmp/kanai-epics-typecheck.txt. Cómo se comprobó: 2 tests pasan: CI ausente/fallido/en nueva ejecución y SHA distinto bloquean; agente no puede autoaprobar revisión ni cierre. Cierre canónico conserva guards y reconcilia tickets ya cerrados; typecheck pasa. · ejecutó: llm
- **Criterios cumplidos:**
  - **F7-C1** CI/revisión fallidos impiden entrega; cambios posteriores invalidan resultados que ya no aplican. → server/epics/final.ts; server/epics/bridge.ts; tests/unit/epic-final.test.ts; /private/tmp/kanai-epics-typecheck.txt; 2 tests pasan: CI ausente/fallido/en nueva ejecución y SHA distinto bloquean; agente no puede autoaprobar revisión ni cierre. Cierre canónico conserva guards y reconcilia tickets ya cerrados; typecheck pasa.; commit c19285df5aa8f2a3b149bce415ab96cf47858512
  - **F7-C2** Sólo se cierran tickets elegibles con autorización registrada; no se simulan aprobaciones humanas. → server/epics/final.ts; server/epics/bridge.ts; tests/unit/epic-final.test.ts; /private/tmp/kanai-epics-typecheck.txt; 2 tests pasan: CI ausente/fallido/en nueva ejecución y SHA distinto bloquean; agente no puede autoaprobar revisión ni cierre. Cierre canónico conserva guards y reconcilia tickets ya cerrados; typecheck pasa.; commit c19285df5aa8f2a3b149bce415ab96cf47858512
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** CI por SHA exacto y cierre agregado autorizado. 2 tests pasan: CI ausente/fallido/en nueva ejecución y SHA distinto bloquean; agente no puede autoaprobar revisión ni cierre. Cierre canónico conserva guards y reconcilia tickets ya cerrados; typecheck pasa.. Siguiente: 2026-10-03: continuar con la siguiente fase según prerequisitos.

### F8. Vistas y operaciones MCP

**Meta:** Mostrar y gestionar épicas con el mismo contrato de autorización desde UI y MCP.
**Esfuerzo:** Por estimar en F1 tras revisar el código y las capacidades existentes.
**Cómo deshacerla:** Revertir únicamente los commits de esta fase mediante el flujo acordado; conservar datos, eventos y evidencia. Si afecta persistencia, verificar compatibilidad y respaldos antes de aplicar cambios; no borrar corridas ni sobrescribir trabajo ajeno.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F8** (estado: Hecho)
- **Fecha real:** inicio 2026-10-03 · fin 2026-10-03
- **Antes de empezar:**
  - [x] F8-P1: F3 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
  - [x] F8-P2: F5 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
  - [x] F8-P3: F6 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
  - [x] F8-P4: F7 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
- **Commits:**
  - `e6d5a6a103a184773e3e038b56a0e8647f3c83ac` · feat(epics): expose planning and execution through UI and MCP · kanai-app/codex/epicas-autonomas (verificado)
- **Qué se hizo:**
  - **F8.1** → feat(epics): expose planning and execution through UI and MCP; paquete 1 verificado en los archivos de la fase.. Dónde: /Users/edobacon/Workspace/kanai/kanai-app/server/epics/service.ts; app/pages/epicas/[id].vue; tests/e2e/epicas.spec.ts. Cómo se comprobó: 45 pruebas unitarias/regresión aprobadas; navegación E2E 1/1; typecheck y check:ui sin errores. Autorizaciones humanas y elección Teach permanecen obligatorias. · ejecutó: llm
  - **F8.2** → feat(epics): expose planning and execution through UI and MCP; paquete 2 verificado en los archivos de la fase.. Dónde: /Users/edobacon/Workspace/kanai/kanai-app/server/epics/service.ts; app/pages/epicas/[id].vue; tests/e2e/epicas.spec.ts. Cómo se comprobó: 45 pruebas unitarias/regresión aprobadas; navegación E2E 1/1; typecheck y check:ui sin errores. Autorizaciones humanas y elección Teach permanecen obligatorias. · ejecutó: llm
  - **F8.3** → feat(epics): expose planning and execution through UI and MCP; paquete 3 verificado en los archivos de la fase.. Dónde: /Users/edobacon/Workspace/kanai/kanai-app/server/epics/service.ts; app/pages/epicas/[id].vue; tests/e2e/epicas.spec.ts. Cómo se comprobó: 45 pruebas unitarias/regresión aprobadas; navegación E2E 1/1; typecheck y check:ui sin errores. Autorizaciones humanas y elección Teach permanecen obligatorias. · ejecutó: llm
- **Criterios cumplidos:**
  - **F8-C1** La vista muestra ticket actual/siguiente, pausas y distinción validado frente a entregado. → /Users/edobacon/Workspace/kanai/kanai-app/server/epics/service.ts; app/pages/epicas/[id].vue; tests/e2e/epicas.spec.ts; 45 pruebas unitarias/regresión aprobadas; navegación E2E 1/1; typecheck y check:ui sin errores. Autorizaciones humanas y elección Teach permanecen obligatorias.; commit e6d5a6a103a184773e3e038b56a0e8647f3c83ac
  - **F8-C2** UI y MCP aplican los mismos guards; recorridos de preparación, ejecución y cierre verificados. → /Users/edobacon/Workspace/kanai/kanai-app/server/epics/service.ts; app/pages/epicas/[id].vue; tests/e2e/epicas.spec.ts; 45 pruebas unitarias/regresión aprobadas; navegación E2E 1/1; typecheck y check:ui sin errores. Autorizaciones humanas y elección Teach permanecen obligatorias.; commit e6d5a6a103a184773e3e038b56a0e8647f3c83ac
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** feat(epics): expose planning and execution through UI and MCP. 45 pruebas unitarias/regresión aprobadas; navegación E2E 1/1; typecheck y check:ui sin errores. Autorizaciones humanas y elección Teach permanecen obligatorias.. Siguiente: 2026-10-03: continuar con la siguiente fase según prerequisitos.

### F9. Tablero y exportación de métricas

**Meta:** Hacer evaluables velocidad, autonomía, calidad y recuperación con datos reconciliables.
**Esfuerzo:** Por estimar en F1 tras revisar el código y las capacidades existentes.
**Cómo deshacerla:** Revertir únicamente los commits de esta fase mediante el flujo acordado; conservar datos, eventos y evidencia. Si afecta persistencia, verificar compatibilidad y respaldos antes de aplicar cambios; no borrar corridas ni sobrescribir trabajo ajeno.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F9** (estado: Hecho)
- **Fecha real:** inicio 2026-10-03 · fin 2026-10-03
- **Antes de empezar:**
  - [x] F9-P1: F2 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
  - [x] F9-P2: F3 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
  - [x] F9-P3: F4 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
  - [x] F9-P4: F5 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
  - [x] F9-P5: F6 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
  - [x] F9-P6: F7 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
- **Commits:**
  - `1d716b440eb4ae9b112f4ba75f47dacb288b0ef0` · feat(epics): add auditable metrics and validate lifecycle integration · kanai-app/codex/epicas-autonomas (verificado)
- **Qué se hizo:**
  - **F9.1** → Agregar partición temporal por lifecycle y fase, motivos de pausa, reanudaciones/fallos, Teach, evidencia y mediciones idempotentes de CI/retrabajo/defectos/tokens/costos. Corregir gate de dependencia para checkpoint de épica y revalidación de permisos.. Dónde: /Users/edobacon/Workspace/kanai/kanai-app/server/epics/metrics.ts; server/epics/service.ts; server/repo/dependencyIntegration.ts. Cómo se comprobó: 21 pruebas de épicas aprobadas, incluyendo reloj fijo, deduplicación, cadena Git A→B→C y dependencia canónica sin cierre. Datos no disponibles permanecen null. · ejecutó: llm
  - **F9.2** → Vista y exports JSON/CSV con dimensiones proyecto/plan/harness/Teach/tickets, muestra/fuentes y comparación sólo cuando tickets de baseline coinciden; conservar historial y corridas canceladas.. Dónde: /Users/edobacon/Workspace/kanai/kanai-app/app/pages/epicas/[id].vue; server/api/epics/[id]/metrics.get.ts; server/mcp/epicTools.ts. Cómo se comprobó: E2E tests/e2e/epicas.spec.ts 1/1 verifica tablero y enlace export CSV; typecheck, check:ui, docs:check y build aprobados. · ejecutó: llm
  - **F9.3** → Probar intervalos mutuamente exclusivos, pausas repetidas, reanudación, revisión y final; deduplicación de IDs y claves de medición; fuente y desconocidos; distinción entre calendario de espera y trabajo humano declarado.. Dónde: /Users/edobacon/Workspace/kanai/kanai-app/tests/unit/epic-metrics.test.ts; tests/unit/epic-runner.test.ts; tests/unit/epic-service.test.ts. Cómo se comprobó: Regresión completa 2637/2637 en 333 archivos; pruebas dirigidas 54/54 y luego suite épicas 21/21. Hallazgo de primera corrida monorepo conservado; repetición completa aprobada. · ejecutó: llm
- **Criterios cumplidos:**
  - **F9-C1** Métricas reconciliables incluyen fallidas y canceladas; no se inventan ceros ni costos. → /Users/edobacon/Workspace/kanai/kanai-app/server/epics/metrics.ts; tests/unit/epic-metrics.test.ts: partición de calendario, historial, fallos/pausas y null en ausencia de consumo; 21/21 pruebas épicas. Commit 1d716b440eb4ae9b112f4ba75f47dacb288b0ef0.
  - **F9-C2** Pruebas de eventos y duraciones pasan; acceso/retención definidos y exportación sin secretos. → /Users/edobacon/Workspace/kanai/kanai-app/docs/development/epic-execution.md: acceso local, conservación sin borrado automático, fuentes sin secretos; server/api/epics/[id]/metrics.get.ts export JSON/CSV con escape de fórmulas. Tests con reloj fijo, dedup e idempotencia pasan. /private/tmp/kanai-epics-full-tests.txt: 2637/2637; build/typecheck/UI/docs aprobados.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - preexistente · /Users/edobacon/Workspace/kanai/kanai-app/tests/unit/gate-monorepo-integral.test.ts:74: Regresión general: 2635/2636 pasan; un delta Git del test monorepo devuelve [] bajo carga. El test y sessionDiff.ts no fueron modificados por esta implementación. Reejecución aislada 12/12 pasa; se conserva resultado fallido y evidencia, no se borra ni se atribuye éxito general.
  - preexistente · /Users/edobacon/Workspace/kanai/kanai-app/nuxt.config.ts; app/utils/ticketFlow.ts:12: El build SSR externaliza shared/session-policy.ts como ruta relativa inválida en el chunk generado. Se configura empaquetado explícito de esa fuente compartida para verificar producción; el import y política preceden los cambios de épicas.
  - introducido · /Users/edobacon/Workspace/kanai/kanai-app/server/repo/dependencyIntegration.ts; server/epics/runner.ts; tests/unit/epic-service.test.ts: La revisión de integración detectó que el gate canónico seguía usando rama de proyecto; se conecta temporalmente a rama/checkpoints de épica sin cerrar tickets. También se revalidan autorización y runId tras observación asíncrona, evidencia antes de cierre y dependencia previamente validada. Pruebas dirigidas 54/54 y suite completa 2637/2637 pasan; registros conservan la primera ejecución fallida del test preexistente.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Tablero, export y métricas auditables implementados con fuentes/muestras/desconocidos. Integración canónica y guardas reforzadas; regresión completa 2637/2637, épicas 21/21, E2E 1/1, build/typecheck/checkUI/docs aprobados. Árbol limpio y commit registrado.. Siguiente: 2026-10-03: preparar F10; selección explícita de tickets, baseline y permisos. Seguimiento de 14 días a partir del merge real, no de fixtures.

### F11. Correcciones de revisión de implementación

**Meta:** Resolver los ocho hallazgos originales de arbiter y los adicionales de los ciclos de revisión antes del piloto, con evidencia y registro.
**Esfuerzo:** Corrección guiada por revisión; se registra ejecución real.
**Cómo deshacerla:** Revertir commits de corrección sin eliminar historial ni datos de corridas.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F11** (estado: Hecho)
- **Fecha real:** inicio 2026-10-03 · fin 2026-10-03
- **Antes de empezar:**
  - [x] F11-P1: F9 cerrada y revisión arbiter registrada con ocho hallazgos pendientes. (F9 cerrada. Revisión registrada en /Users/edobacon/.kanai/data/kanai_data/arbiter/plans/kanai-epicas-autonomas/ledger.md: corrida 20261003-epicas-review1-kanai-app, siete S1 y un S2.)
- **Commits:**
  - `80c2d51dcced57d84e5e1802eb9a50ed40689ab4` · fix(epics): enforce canonical integration and autonomous run boundaries · kanai-app/codex/epicas-autonomas (verificado)
  - `bd004db5261a4e72dc49a64155823b9bb4cdaa8d` · fix(epics): surface canonical proof infrastructure failures · kanai-app/codex/epicas-autonomas (verificado)
  - `364eb16afcd35f7fe8879f20f645c00a76e7561e` · fix(epics): preserve Git ancestry verifier errors · kanai-app/codex/epicas-autonomas (verificado)
- **Qué se hizo:**
  - **F11.1** → Corregidas sesiones superseded, prueba de commits canónicos y vencimiento de plazo; commit de F11 ya registrado.. Dónde: /Users/edobacon/Workspace/kanai/kanai-app/tests/unit/epic-corrections.test.ts:53. Cómo se comprobó: pnpm test: 2648/2648, 334 archivos, exit 0; regresión canónica posterior 15/15, exit 0. Logs /private/tmp/kanai-epic-corrections-full.log y /private/tmp/kanai-epic-corrections-canonical.log. El SHA base sin trabajo integrado se rechaza por el servicio canónico completo. · ejecutó: llm
  - **F11.2** → Corregidos artefactos, repos, carrera de update y fetch; probado cierre humano y recuperación sin duplicar auditoría; commit de F11 registrado.. Dónde: /Users/edobacon/Workspace/kanai/kanai-app/tests/unit/epic-corrections.test.ts:96; /Users/edobacon/Workspace/kanai/kanai-app/tests/unit/human-authorization.test.ts:410. Cómo se comprobó: Regresiones 70/70, exit 0, /private/tmp/kanai-epic-corrections-rerun.log; suite completa 2648/2648. Primer intento falló por helper de test fuera de scope, corregido y repetido con éxito. · ejecutó: llm
  - **F11.3** → Completados tres ciclos de corrección/revisión, diez hallazgos resueltos, tres commits registrados; documentación del repositorio y KB operativo actualizados.. Dónde: /Users/edobacon/Workspace/kanai/kanai-app/docs/development/epic-execution.md; /Users/edobacon/.kanai/data/kanai_data/arbiter/plans/kanai-epicas-autonomas/ledger.md. Cómo se comprobó: Node24 pnpm test: 2652/2652, 335 archivos, exit 0. Regresiones Git 41/41, exit 0. pnpm typecheck, build y docs:check pasan. check:ui pasó tras correcciones iniciales. Logs /private/tmp/kanai-epic-git-infra-*.log. Arbiter closure3 aprobado, cobertura 52/52 archivos y 1710/1710 líneas, diez fixed y cero pending; revisores limpios y re-chequeos separados. No se declara piloto ni compatibilidad real de todos los harnesses. · ejecutó: llm
- **Criterios cumplidos:**
  - **F11-C1** Los ocho hallazgos tienen corrección y evidencia verificable, sin omitir controles ni inventar integración. → Diez hallazgos (ocho originales y dos adicionales) reconciliados como fixed, ninguno descartado ni aceptado sin corregir. Evidencia individual en /Users/edobacon/.kanai/data/kanai_data/arbiter/plans/kanai-epicas-autonomas/ledger.md, corrida 20261003-epicas-closure3-kanai-app; Git/DB temporales y guards canónicos ejercitados en tests/unit/epic-corrections.test.ts y epic-git-infrastructure.test.ts. · ejecutó: llm
  - **F11-C2** Verificaciones relevantes y revisión de cierre aprobadas; commits y limitaciones registrados. → Arbiter aprobado con cobertura 52/52 y sin huecos. Commits 80c2d51, bd004db y 364eb16 registrados y verificados en F11. Suite final 2652/2652, tipos/build/docs aprobados: /private/tmp/kanai-epic-git-infra-{tests,types,build,docs}.log. Documentación actualizada en /Users/edobacon/Workspace/kanai/kanai-app/docs/development/epic-execution.md y KB del caso correcciones-arbiter.md/operacion-y-piloto.md. Piloto F10 sigue pendiente. · ejecutó: llm
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Enmienda: Agregar fase de correcciones F11 antes del piloto F10.. Motivo: La persona pidió corregir los ocho hallazgos de arbiter y registrarlos en el caso inline correspondiente.
  - Enmienda: Vincular tareas de corrección con los documentos operativos del caso y explicitar el ciclo de hallazgos adicionales.. Motivo: La persona pidió repetir corrección/revisión si aparecen más casos y actualizar documentación afectada; el ciclo detectó un S2 adicional ya corregido y en revisión.
- **Hallazgos:**
  - introducido · /Users/edobacon/Workspace/kanai/kanai-app/server/repo/dependencyIntegration.ts:224: Revisión independiente del lote 2 confirmó S2: catch absorbe excepciones de lectura canónica/infraestructura y las convierte en estado not_integrated, ocultando la causa de verificación. Se corregirá y revisará en siguiente ciclo.
  - introducido · /Users/edobacon/.kanai/data/kanai_data/arbiter/plans/kanai-epicas-autonomas/ledger.md: Corrida closure1 registró ocho hallazgos originales corregidos con re-chequeo individual. Nuevo S2 de diagnóstico de infraestructura fue registrado, corregido en bd004db5261a4e72dc49a64155823b9bb4cdaa8d y está en revisión de cierre2. Suite final 2649/2649, 334 archivos, exit 0; tipos y documentación pasan. No se declara piloto realizado.
  - introducido · /Users/edobacon/Workspace/kanai/kanai-app/docs/development/epic-execution.md:85: Segunda revisión independiente detectó S2: la nueva garantía de conservar errores incluye verificación Git, cuyos helpers aún absorbían errores de merge-base. Se distinguirá salida 1 (no ancestor) de errores de infraestructura y se repetirán pruebas y revisión.
  - introducido · /Users/edobacon/Workspace/kanai/kanai-app/server/epics/git.ts:31: Hallazgo informativo de cierre2 corregido reforzando implementación: merge-base sólo interpreta status 1 como no-ancestor; errores de infraestructura se propagan también al verificar commits contra el recibo. Tercer commit registrado. Tres nuevas pruebas ejercitan error Git, resultado negativo y error en segundo chequeo. Regresiones 41/41, exit 0. Revisión cierre3 en curso.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Diez hallazgos corregidos y reconciliados; arbiter aprobado, pruebas y documentación actualizadas; tres commits verificados.. Siguiente: 2026-10-04: F10 sigue pendiente de selección explícita de piloto Tao Mangalam, baseline y permisos. Seguimiento de 14 días se calcula desde el merge real, aún sin fecha.

### F12. Correcciones del planificador destapadas por el piloto Jormat

**Meta:** Que una épica de otro proyecto se planifique sin dependencias falsas, con lecturas externas como entrada válida y con el repo aceptado por nombre o id, antes de ejecutar la cohorte Jormat del piloto.
**Esfuerzo:** Acotado a server/epics (planner, assets, schema, service, bridge), sus tests y dos documentos.
**Cómo deshacerla:** Revertir únicamente los commits de esta fase; las épicas guardadas siguen válidas porque sin prefijo y con repo por nombre el comportamiento es el actual.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F12** (estado: En curso)
- **Fecha real:** inicio 2026-10-06 · fin -
- **Antes de empezar:**
  - [x] F12-P1: Rama de trabajo de kanai-app definida y registrada en el intake antes de modificar código (la rama codex/epicas-autonomas del intake no existe; el código de épicas está en setup). (Intake del caso actualizado el 2026-10-06: kanai-app trabaja directo sobre setup (base y rama de trabajo), con commits por tarea y sin push, por decisión del dev (opción A).)
  - [x] F12-P2: Cuerpos originales de JOR-169 a JOR-175 (antes de la edición del 06-10) y de TAO-181 a TAO-188 disponibles como fixtures, sin re-planificar las épicas reales. (Fixtures fuera del repo (scratchpad de la sesión del 2026-10-06): cuerpos originales de JOR-169 a JOR-175 tomados de la salida de la épica en versión 2 (antes de editar los cuerpos) y cuerpos de TAO-181 a TAO-188 de las épicas taomangalam-ep-01 y ep-01a; catálogos armados con lectura de solo lectura (mode=ro) del store. Las épicas reales no se re-planificaron.)
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F12.1** → Las menciones del cuerpo se contrastan con un catálogo del proyecto (id, referencia externa e id entre corchetes del título, con estado) y con las familias de ids del proyecto. Ticket abierto: candidato; cerrado o descartado: contexto; desconocida de familia real: candidata 'no está en Kanai'; de familia ajena: contexto. Sin catálogo, criterio anterior. plan refresca el catálogo y re-deriva solo las inferidas sin decidir. Desvío: catálogo más familias en vez de solo ticketPrefix, porque el prefijo perdía historias HU reales de Tao. Commits 3114068 y 8e8af70 (anteriores al inicio formal de la fase).. Dónde: kanai-app server/epics/planner.ts, schema.ts, service.ts; tests/unit/epic-planner-catalog.test.ts; tests/unit/epic-service.test.ts. Cómo se comprobó: Vitest Node 24: 26 suites de épicas, 128 tests pasan, incluido el test de que plan conserva aceptadas y descartadas. · ejecutó: llm, `npx vitest run tests/unit/epic-*.test.ts`, salida 0, 26 archivos, 128 tests pasan
  - **F12.2** → Una cita a un archivo fuera del repo queda cubierta si coincide por sufijo con una lectura externa del inventario (readRequirements, incluye readPaths). Desvío: no se implementó external:true; alcanza la cobertura por sufijo. Un intento de distinguir archivo propio por existencia en disco se revirtió (hacía divergir plan y corrida); el residual quedó wont_fix por decisión del dev. Commit fc4ab80 (anterior al inicio formal de la fase).. Dónde: kanai-app server/epics/assets.ts (externallyRead); tests/unit/epic-planner-catalog.test.ts ('assets: lecturas externas declaradas'). Cómo se comprobó: Tests positivo y negativo de cobertura; epic-assets.test.ts pasa; arbiter r3 aprobable_con_nits. · ejecutó: llm, `npx vitest run tests/unit/epic-planner-catalog.test.ts tests/unit/epic-assets.test.ts`, salida 0, 19 tests pasan
  - **F12.3** → Repo de la épica por nombre o id, guardado como nombre (canonicalRepoName en canonicalDraft, también el repo de cada ticket); repoRoot acepta ambos; el error lista los nombres válidos. Documentado el caso monorepo registrado por subcarpetas. Commit ad8f4e1 (docs) y parte de 3114068 (anteriores al inicio formal de la fase).. Dónde: kanai-app server/epics/service.ts, server/epics/bridge.ts, docs/development/epic-execution.md, skills/claude/kn-epic/SKILL.md. Cómo se comprobó: Test 'crea la epica con el repo por id o por nombre y guarda siempre el nombre' con mensaje 'Válidos: monorepo'; typecheck 0, lint 0, docs:check OK (105 docs). · ejecutó: llm, `pnpm typecheck && pnpm lint && pnpm docs:check`, salida 0, typecheck 0, lint 0, docs OK
  - **F12.4** → Medición antes/después (medicion-f12-planificador.md), suite, typecheck y lint, arbiter r1-r3 (aprobable_con_nits) y reinicio del MCP por el dev el 2026-10-06. Tras el reinicio, el plan de la épica real EPIC-FACTURAS-CLIENTE-FEEDBACK carga el catálogo (JOR-166 y JOR-167 cerrados, familia JOR:2) y no genera ninguna inferida nueva sin decidir: 73 descartadas conservadas, 9 declaradas, aprobación vigente (versión 4, sin bloqueos, siguiente paso start). Cierre formal de F12 queda abierto por decisión del dev (opción B): commits previos al inicio formal y trabajo ajeno en setup.. Dónde: Store de Kanai, épica EPIC-FACTURAS-CLIENTE-FEEDBACK (epic_operate plan y status); KB medicion-f12-planificador.md. Cómo se comprobó: epic_operate plan: mentionCatalog con 2 entradas, mentionFamilies ['JOR:2'], dependencias inferred sin decidir = 0; epic_operate status: approved true, issues []. · ejecutó: dev, `reinicio del MCP de Kanai (dev); epic_operate plan + status (llm)`, salida 0, 0 inferidas nuevas; 73 descartadas y 9 declaradas; aprobada v4 sin bloqueos
- **Criterios cumplidos:**
  - **F12-C1** Con los cuerpos originales de JOR-169 a JOR-175 el plan no genera ninguna de las 81 aristas falsas y conserva las dependencias reales; con TAO-181 a TAO-188 no empeora el resultado de kanai-pre-epica F2 (44 avisos o menos, 0 referencias reales perdidas). → KB del caso medicion-f12-planificador.md: JOR-169..175 pasa de 81 aristas falsas a 0; TAO-181..188 de 36 a 18 avisos externos con las 8 internas conservadas y 0 referencias reales perdidas (lo eliminado son HU-01 cerradas, TAO-179 cerrado, P-225 y REQ-07). Código medido: server/epics/planner.ts en fc4ab80. · ejecutó: llm, `tsx measure.mts (scratchpad, importa server/epics/planner.ts)`, salida 0, jormat 81->0; tao 36->18, internas 8->8
  - **F12-C2** Referencias a archivos declarados en readPaths no bloquean el plan; un asset external cubierto por una lectura autorizada queda listo; una épica creada con el id o el nombre del repo guarda el nombre; suite y typecheck pasan y arbiter aprueba. → Citas cubiertas por lecturas externas declaradas no generan 'Asset sin clasificar'; épica creada con id y con nombre guarda 'monorepo'. Suites de épicas 128/128, typecheck y lint 0. Arbiter plan kanai-epicas-autonomas-f12: r1 iterar, r2 aprobable_con_reservas, r3 aprobable_con_nits (f3 wont_fix por el dev; piso de cobertura exceptuado por archivos de kn-aws de otra sesión, pedido del dev); reconcile 5 tp, 0 fp. El caso 'asset external' de la redacción no aplica: se resolvió sin ese campo. · ejecutó: llm, `npx vitest run tests/unit/epic-*.test.ts; pnpm typecheck; pnpm lint`, salida 0, 128 tests pasan; typecheck 0; lint 0
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Los commits de F12 (3114068, ad8f4e1, 8e8af70, fc4ab80 en kanai-app/setup) se hicieron antes de iniciar formalmente la fase en el plan y el registro los rechaza por fecha; además, setup comparte commits y cambios sin commitear de otra sesión (kn-aws, server/mcp).. Por qué: La fase se agregó y se implementó en la misma sesión antes de marcar el inicio; la rama de trabajo elegida (setup) es compartida.. Cambia la decisión: Los commits quedan citados en cada task_done. El cierre formal de F12 queda pendiente de decisión del dev sobre cómo registrar commits previos al inicio y los commits ajenos de setup.
  - Enmienda: Agrega F12 (correcciones del planificador destapadas por el piloto Jormat: dependencias por prefijo de proyecto, lecturas externas como entrada, repo por nombre o id) antes de F10; F10 pasa a requerir F12 cerrada y F10.1 incorpora la épica EPIC-FACTURAS-CLIENTE-FEEDBACK de jormat-evolution como segunda cohorte del piloto.. Motivo: Preparar la épica de jormat-evolution (JOR-169 a 175) requirió rechazar 81 dependencias falsas, cuatro rodeos de assets y usar el nombre del repo en vez del id. La persona decidió (06-10) corregirlo en este caso antes del piloto (opción A) y ejecutar la épica Jormat después de las correcciones como cohorte de F10 (opción 1). Detalle en piloto-jormat-hallazgos-planificador.md.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F10. Piloto, evaluación y mejoras

**Meta:** Validar el conjunto en Tao Mangalam y decidir expansión con evidencia.
**Esfuerzo:** Por estimar en F1 tras revisar el código y las capacidades existentes.
**Cómo deshacerla:** Conservar documentos y evidencia; corregir decisiones mediante enmienda auditada, sin modificar código ni borrar historial.

**Registro F10** (estado: Bloqueado (Piloto real pendiente de selección humana de 3–5 tickets Tao Mangalam, baseline posterior a DEC-239, rama, host/versión, responsables y permisos efectivos. Además faltan ejecución real y observación de defectos durante 14 días desde merge. No hay bloqueo de revisión de código: F11 cerrada y arbiter aprobado.))
- **Fecha real:** inicio 2026-10-03 · fin -
- **Antes de empezar:**
  - [x] F10-P1: F7 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
  - [x] F10-P2: F8 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
  - [x] F10-P3: F9 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
  - [ ] F10-P4: F12 cerrada con sus criterios y evidencia verificados.
- **Commits:**
  - `07b7ac7` · feat(epics): prepare batch decisions and phased dependency execution · kanai-app/codex/epicas-autonomas (verificado)
  - `a43fc9a` · fix(epics): prepare authorized execution and clarify epic and ticket views · kanai-app/codex/epicas-autonomas (verificado)
  - `8d4221f` · fix(epics): prioritize local accumulation over ticket PR workflows · kanai-app/codex/epicas-autonomas (verificado)
  - `01e17bf` · feat(instalacion): registra Kanai en DeepSeek Harness (DSH) · kanai-app/codex/epicas-autonomas (verificado)
  - `da26ab3` · fix(integridad): el feed de auditoria sin ticket no cuenta en el digest · kanai-app/codex/epicas-autonomas (verificado)
  - `70eb4bc` · fix(epics): la autoridad de corrida invalida bloquea la aprobacion por MCP · kanai-app/codex/epicas-autonomas (verificado)
  - `abe6359` · fix(telemetria): guarda el backend del run canonico en agent_runs · kanai-app/codex/epicas-autonomas (verificado)
  - `c29530d` · fix(epics): el planificador no inventa dependencias por menciones de contexto · kanai-app/codex/epicas-autonomas (verificado)
  - `e6478a7` · fix(mcp): el protocolo de epica sale de la descripcion de epic_operate a la skill kn-epic · kanai-app/codex/epicas-autonomas (verificado)
  - `aacbbca` · test(mcp): guarda que epic_operate apunte a la skill kn-epic y que el protocolo siga servido · kanai-app/codex/epicas-autonomas (verificado)
  - `b7cb29d` · fix(inline): un commit se registra en su fase de destino aunque no este iniciada · kanai-app/codex/epicas-autonomas (verificado)
- **Qué se hizo:**
  - **F10.1** pendiente: Seleccionar las cohortes del piloto con rama corta y baseline del flujo actual con CI liviano: EP-01 de Tao Mangalam (TAO-181 y TAO-182, ya ejecutada) y EPIC-FACTURAS-CLIENTE-FEEDBACK de jormat-evolution (JOR-169 a JOR-175, plan aprobado, se ejecuta después de F12); completar ambientes, roles y autorizaciones del piloto.
  - **F10.2** pendiente: Ejecutar piloto según permisos y controles aprobados; registrar datos de éxito/fallo, interrupciones y reanudación y observar defectos durante 14 días posteriores a integración.
  - **F10.3** pendiente: Comparar tiempos, intervenciones, CI, retrabajo y calidad; separar ahorro previo de DEC-239; registrar mejoras priorizadas y decisión de expansión o ajuste.
- **Criterios cumplidos:**
  - **F10-C1** pendiente (evidence): Informe con muestra y cobertura; cero avances fuera de autorización y cero efectos duplicados; cualquier incumplimiento impide expansión.
  - **F10-C2** pendiente (evidence): Comparación no atribuye causalidad con muestra insuficiente; seguimiento de 14 días completado y decisión de siguientes mejoras registrada.
- **No cumplido:**
  - ABIERTO · F10.1: Seleccionar tickets, baseline y ambiente del piloto. Por qué: La selección de 3–5 tickets, rama base y Teach/Skip está solicitada a la persona; no hay respuesta ni baseline comparable y permisos del ambiente todavía.. Impacto: Sin esto no se inicia corrida real en Tao Mangalam ni se mide ahorro.. Fecha: 2026-10-04. Responsable: Persona responsable del piloto Tao Mangalam y agente al recibir selección
  - ABIERTO · F10.3: Evaluar resultados y priorizar expansión. Por qué: Falta muestra real comparable posterior a DEC-239 y observación de defectos.. Impacto: No hay evidencia para afirmar aceleración o decidir expansión.. Fecha: 2026-10-18. Responsable: Persona responsable del piloto Tao Mangalam y agente al recibir selección
  - ABIERTO · F10-C1: Informe de piloto con muestra y cumplimiento. Por qué: Pruebas de implementación pasan, pero no hay datos de operación real de los tickets del piloto.. Impacto: La autorización y ausencia de duplicados no se pueden certificar para un piloto no ejecutado.. Fecha: 2026-10-18. Responsable: Persona responsable del piloto Tao Mangalam y agente al recibir selección
  - ABIERTO · F10-C2: Comparación y seguimiento de 14 días. Por qué: No existe fecha de integración real ni ventana de seguimiento cumplida.. Impacto: El plan y juez final permanecen abiertos, sin atribuir causalidad ni inventar muestras.. Fecha: 2026-10-18. Responsable: Persona responsable del piloto Tao Mangalam y agente al recibir selección
  - ABIERTO · F10.2: Ejecutar piloto y observar defectos 14 días. Por qué: Al 2026-10-03 no existe corrida piloto autorizada ni merge de referencia. Fixtures no reemplazan trabajo real; el seguimiento empieza después del merge.. Impacto: No se puede verificar calidad posintegración ni completar observación al 2026-10-03. La fecha de revisión es provisional y se ajustará al merge real.. Fecha: 2026-10-18. Responsable: Persona responsable del piloto Tao Mangalam y agente al recibir selección
- **Desvíos del plan:**
  - Los 8 commits del workstream de aceleracion (instalacion en DSH, integridad del store, telemetria del backend del run, planificador de epicas, protocolo de epica movido a la skill kn-epic y mecanica de registro de commits) no son trabajo de ninguna fase de esta epica: se registran en F10 como constancia de otro workstream, con su evidencia y su plan en el caso inline kanai-pre-epica.. Por qué: Comparten la rama de trabajo, asi que el guard de cierre los ve como faltantes de este plan; sin la constancia la epica no podria cerrar F10 ni pedir el brief del juez, y ninguno pertenece a una fase de esta epica.. Cambia la decisión: No cambia decisiones del plan: es una constancia de workstream ajeno, no un cambio de alcance, de criterios ni de juez.
- **Hallazgos:**
  - introducido · /Users/edobacon/.kanai/data/kanai_data/arbiter/plans/kanai-epicas-autonomas/ledger.md: Arbiter revisó implementación F1–F9 contra pedido original y base del primer commit: 48/48 archivos, 1397 líneas modificadas, 3 jueces completos y reverify adversarial de 6 defectos de comportamiento. Veredicto iterar: 7 S1 y 1 S2, todos pendientes. SHA ajeno al ticket aceptado por checkpoint (además reproducido con Git temporal/HostBridge sintético); sesiones reemplazadas bloquean recuperación; integración no comprueba deadline; autonomía temporal no llega a aprobación de artefactos; propuesta selecciona repos fuera de épica; update tiene carrera con resume; falta prueba positiva/recuperación parcial de cierre conjunto; grounding provoca fetch sin permiso de red. El historial arbiter conserva trazas, cobertura y resultados. No se cambió código ni se cerró juez final/piloto.
- **Bloqueos:**
  - 2026-10-03 bloqueada: Implementación F1–F9 cerrada con 11 commits registrados. Piloto requiere selección explícita de tickets, baseline posterior a DEC-239, Teach/Skip y permisos efectivos; solicitud de selección presentada. Luego necesita 14 días desde merge real. No iniciar trabajo no seleccionado ni cerrar el plan/juez con fixtures.
  - 2026-10-03 bloqueada: Arbiter de implementación F1–F9 devuelve iterar con 7 hallazgos altos y 1 medio pendientes; 6 defectos de comportamiento sostenidos en comprobación adversarial. Corregir y re-juzgar antes de iniciar piloto. Se mantienen selección de 3–5 tickets/baseline/Teach-permisos pendientes y seguimiento de 14 días desde merge real. Informe y cobertura registrados en área arbiter del mismo plan, con enlace en finding F10.
  - 2026-10-03 desbloqueada: Resuelto el bloqueo de revisión de implementación: arbiter closure3 aprobado, diez hallazgos fixed, F11 cerrada y tres commits registrados. Permanecen pendientes los requisitos reales del piloto.
  - 2026-10-03 bloqueada: Piloto real pendiente de selección humana de 3–5 tickets Tao Mangalam, baseline posterior a DEC-239, rama, host/versión, responsables y permisos efectivos. Además faltan ejecución real y observación de defectos durante 14 días desde merge. No hay bloqueo de revisión de código: F11 cerrada y arbiter aprobado.
- **Cierre y siguiente paso:** Sin cerrar.
