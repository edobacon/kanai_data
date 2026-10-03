# Plan inline: Épicas con planificación y ejecución autónoma encadenada

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Implementar el plan acordado de épicas autónomas en Kanai, con permisos por harness, Teach/Skip, seguimiento de tickets, recuperación y métricas desde el inicio; evaluar piloto Tao Mangalam. Registrar el plan no inicia ejecución.
**Tags:** projects: kanai_self · repos: kanai-app · labels: epicas, autonomia, harness, metricas, piloto-taomangalam
**Estado:** 9 de 10 fases cerradas. Juez final: pendiente.

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
| F10 Piloto, evaluación y mejoras | Validar el conjunto en Tao Mangalam y decidir expansión con evidencia. | Bloqueado (Implementación F1–F9 cerrada con 11 commits registrados. Piloto requiere selección explícita de tickets, baseline posterior a DEC-239, Teach/Skip y permisos efectivos; solicitud de selección presentada. Luego necesita 14 días desde merge real. No iniciar trabajo no seleccionado ni cerrar el plan/juez con fixtures.) | 2026-10-03 → - | - | 0/2 | Seleccionar tickets, baseline y ambiente del piloto (2026-10-04); Evaluar resultados y priorizar expansión (2026-10-18); Informe de piloto con muestra y cumplimiento (2026-10-18); Comparación y seguimiento de 14 días (2026-10-18); Ejecutar piloto y observar defectos 14 días (2026-10-18); F10.1; F10.2; F10.3 |

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

### F10. Piloto, evaluación y mejoras

**Meta:** Validar el conjunto en Tao Mangalam y decidir expansión con evidencia.
**Esfuerzo:** Por estimar en F1 tras revisar el código y las capacidades existentes.
**Cómo deshacerla:** Conservar documentos y evidencia; corregir decisiones mediante enmienda auditada, sin modificar código ni borrar historial.

**Registro F10** (estado: Bloqueado (Implementación F1–F9 cerrada con 11 commits registrados. Piloto requiere selección explícita de tickets, baseline posterior a DEC-239, Teach/Skip y permisos efectivos; solicitud de selección presentada. Luego necesita 14 días desde merge real. No iniciar trabajo no seleccionado ni cerrar el plan/juez con fixtures.))
- **Fecha real:** inicio 2026-10-03 · fin -
- **Antes de empezar:**
  - [x] F10-P1: F7 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
  - [x] F10-P2: F8 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
  - [x] F10-P3: F9 cerrada con sus criterios y evidencia verificados. (Fases previas cerradas con commits y pruebas registrados en el caso.)
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F10.1** pendiente: Seleccionar 3–5 tickets relacionados, rama corta y baseline del flujo actual con CI liviano; completar ambientes, roles y autorizaciones del piloto.
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
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - 2026-10-03 bloqueada: Implementación F1–F9 cerrada con 11 commits registrados. Piloto requiere selección explícita de tickets, baseline posterior a DEC-239, Teach/Skip y permisos efectivos; solicitud de selección presentada. Luego necesita 14 días desde merge real. No iniciar trabajo no seleccionado ni cerrar el plan/juez con fixtures.
- **Cierre y siguiente paso:** Sin cerrar.
