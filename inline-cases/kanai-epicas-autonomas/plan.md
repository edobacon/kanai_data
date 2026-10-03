# Plan inline: Épicas con planificación y ejecución autónoma encadenada

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Implementar el plan acordado de épicas autónomas en Kanai, con permisos por harness, Teach/Skip, seguimiento de tickets, recuperación y métricas desde el inicio; evaluar piloto Tao Mangalam. Registrar el plan no inicia ejecución.
**Tags:** projects: kanai_self · repos: kanai-app · labels: epicas, autonomia, harness, metricas, piloto-taomangalam
**Estado:** 4 de 10 fases cerradas. Juez final: pendiente.

## Registro de avance

| Fase | Meta | Estado | Fecha real | Commits | Criterios | Pendiente |
|---|---|---|---|---|---|---|
| F1 Contrato y preparación | Resolver las decisiones de diseño y establecer la base verificable antes de implementar. | Hecho | 2026-10-03 → 2026-10-03 | d7802b51d7f35f17f14bdd0a5368463caafedf4f | 2/2 | - |
| F2 Modelo de épica, plan y corrida | Persistir composición, planes versionados y progreso recuperable. | Hecho | 2026-10-03 → 2026-10-03 | 0de9f9cc5df1592a3cf3242c1cb8cdc8e4a1f619 | 2/2 | - |
| F3 Composición y dependencias | Validar viabilidad y orden, contrastando declaraciones con el cuerpo de los tickets. | Hecho | 2026-10-03 → 2026-10-03 | 89dc3cfc3bfc1b8935e88580960d064cc7118fad | 2/2 | - |
| F4 Ramas, integración y checkpoints | Vincular evidencia por ticket al estado real de la rama acumuladora. | Hecho | 2026-10-03 → 2026-10-03 | a2a49360d25eb80f651bbb5077b8b5895cbc65df, a471da5289bd0439a158a0e1ca616c13956dccd8, 5dde60d4d6368c9d322f1f800f4c262c6e4065f7 | 2/2 | - |
| F5 Harnesses, permisos y aprobaciones | Comprobar autonomía efectiva antes de iniciar y respetar las restricciones del host. | En curso | 2026-10-03 → - | de910a6a9dcb6586943b1efced79a1023154a127 | 0/2 | - |
| F6 Orquestación, Teach y recuperación | Encadenar tickets con intake individual y avance dentro del alcance autorizado. | Pendiente | - → - | - | 0/2 | F6.1; F6.2; F6.3 |
| F7 Revisión integral y cierre | Concentrar revisión amplia y CI final sin perder evidencia ni autorización. | Pendiente | - → - | - | 0/2 | F7.1; F7.2; F7.3 |
| F8 Vistas y operaciones MCP | Mostrar y gestionar épicas con el mismo contrato de autorización desde UI y MCP. | Pendiente | - → - | - | 0/2 | F8.1; F8.2; F8.3 |
| F9 Tablero y exportación de métricas | Hacer evaluables velocidad, autonomía, calidad y recuperación con datos reconciliables. | Pendiente | - → - | - | 0/2 | F9.1; F9.2; F9.3 |
| F10 Piloto, evaluación y mejoras | Validar el conjunto en Tao Mangalam y decidir expansión con evidencia. | Pendiente | - → - | - | 0/2 | F10.1; F10.2; F10.3 |

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

**Registro F5** (estado: En curso)
- **Fecha real:** inicio 2026-10-03 · fin -
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
  - **F5-C1** pendiente (evidence): Permiso desconocido no se concede; aprobación de plan no concede permiso del harness.
  - **F5-C2** pendiente (evidence): Adaptadores soportados superan pruebas de conformidad; permiso tardío o revocado pausa y queda registrado.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F6. Orquestación, Teach y recuperación

**Meta:** Encadenar tickets con intake individual y avance dentro del alcance autorizado.
**Esfuerzo:** Por estimar en F1 tras revisar el código y las capacidades existentes.
**Cómo deshacerla:** Revertir únicamente los commits de esta fase mediante el flujo acordado; conservar datos, eventos y evidencia. Si afecta persistencia, verificar compatibilidad y respaldos antes de aplicar cambios; no borrar corridas ni sobrescribir trabajo ajeno.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F6** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F6-P1: F3 cerrada con sus criterios y evidencia verificados.
  - [ ] F6-P2: F4 cerrada con sus criterios y evidencia verificados.
  - [ ] F6-P3: F5 cerrada con sus criterios y evidencia verificados.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F6.1** pendiente: Implementar arranque con elección explícita Teach/Skip teach y herencia temporal por corrida; reanudación conserva decisión y controles.
  - **F6.2** pendiente: Implementar recorrido intake→planificación/spec→ejecución→verificación→integración→siguiente ticket, comprobando deriva y límites en cada paso.
  - **F6.3** pendiente: Implementar pausas, cancelación, reintentos acotados y recuperación por checkpoints; emitir eventos de fases, espera, intervención y consumo disponible.
- **Criterios cumplidos:**
  - **F6-C1** pendiente (evidence): A→B→C avanza sólo con prerequisitos verificados; Skip teach no omite intake, spec o gates.
  - **F6-C2** pendiente (evidence): Fallos, cambios de alcance y límites pausan; reanudar no repite efectos ni inventa aprobación humana.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F7. Revisión integral y cierre

**Meta:** Concentrar revisión amplia y CI final sin perder evidencia ni autorización.
**Esfuerzo:** Por estimar en F1 tras revisar el código y las capacidades existentes.
**Cómo deshacerla:** Revertir únicamente los commits de esta fase mediante el flujo acordado; conservar datos, eventos y evidencia. Si afecta persistencia, verificar compatibilidad y respaldos antes de aplicar cambios; no borrar corridas ni sobrescribir trabajo ajeno.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F7** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F7-P1: F6 cerrada con sus criterios y evidencia verificados.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F7.1** pendiente: Preparar resumen por ticket, diff acumulado, riesgos y evidencia para la revisión integral.
  - **F7.2** pendiente: Integrar gate completo final sobre el estado exacto candidato; invalidar evidencia afectada si cambia; separar validación en épica de entrega.
  - **F7.3** pendiente: Implementar cierre agregado autorizado, integración y reconciliación idempotente de cierre parcial; conservar controles humanos acordados y eventos de calidad.
- **Criterios cumplidos:**
  - **F7-C1** pendiente (evidence): CI/revisión fallidos impiden entrega; cambios posteriores invalidan resultados que ya no aplican.
  - **F7-C2** pendiente (evidence): Sólo se cierran tickets elegibles con autorización registrada; no se simulan aprobaciones humanas.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F8. Vistas y operaciones MCP

**Meta:** Mostrar y gestionar épicas con el mismo contrato de autorización desde UI y MCP.
**Esfuerzo:** Por estimar en F1 tras revisar el código y las capacidades existentes.
**Cómo deshacerla:** Revertir únicamente los commits de esta fase mediante el flujo acordado; conservar datos, eventos y evidencia. Si afecta persistencia, verificar compatibilidad y respaldos antes de aplicar cambios; no borrar corridas ni sobrescribir trabajo ajeno.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F8** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F8-P1: F3 cerrada con sus criterios y evidencia verificados.
  - [ ] F8-P2: F5 cerrada con sus criterios y evidencia verificados.
  - [ ] F8-P3: F6 cerrada con sus criterios y evidencia verificados.
  - [ ] F8-P4: F7 cerrada con sus criterios y evidencia verificados.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F8.1** pendiente: Implementar listado y detalle de épica: tickets, orden, dependencias justificadas, progreso, rama y bloqueos; enlace desde cada ticket.
  - **F8.2** pendiente: Implementar revisión del plan, preflight, permisos, Teach y controles de inicio/pausa/reanudación/cancelación.
  - **F8.3** pendiente: Exponer operaciones MCP equivalentes, vista de revisión/CI/merge y validación de recorridos y consistencia UI/MCP.
- **Criterios cumplidos:**
  - **F8-C1** pendiente (evidence): La vista muestra ticket actual/siguiente, pausas y distinción validado frente a entregado.
  - **F8-C2** pendiente (evidence): UI y MCP aplican los mismos guards; recorridos de preparación, ejecución y cierre verificados.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F9. Tablero y exportación de métricas

**Meta:** Hacer evaluables velocidad, autonomía, calidad y recuperación con datos reconciliables.
**Esfuerzo:** Por estimar en F1 tras revisar el código y las capacidades existentes.
**Cómo deshacerla:** Revertir únicamente los commits de esta fase mediante el flujo acordado; conservar datos, eventos y evidencia. Si afecta persistencia, verificar compatibilidad y respaldos antes de aplicar cambios; no borrar corridas ni sobrescribir trabajo ajeno.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F9** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F9-P1: F2 cerrada con sus criterios y evidencia verificados.
  - [ ] F9-P2: F3 cerrada con sus criterios y evidencia verificados.
  - [ ] F9-P3: F4 cerrada con sus criterios y evidencia verificados.
  - [ ] F9-P4: F5 cerrada con sus criterios y evidencia verificados.
  - [ ] F9-P5: F6 cerrada con sus criterios y evidencia verificados.
  - [ ] F9-P6: F7 cerrada con sus criterios y evidencia verificados.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F9.1** pendiente: Agregar tiempos por fase, CI, espera humana, intervenciones, permisos/dependencias tardíos, Teach, retrabajo, calidad, recuperación y costos disponibles.
  - **F9.2** pendiente: Implementar segmentación por proyecto, versión, harness, tamaño y política; mostrar muestras, cobertura y datos no disponibles; exportar eventos y resumen.
  - **F9.3** pendiente: Probar fórmulas con reloj controlado, deduplicación y solapamientos; separar aprobaciones previstas de imprevistas y espera de trabajo humano.
- **Criterios cumplidos:**
  - **F9-C1** pendiente (evidence): Métricas reconciliables incluyen fallidas y canceladas; no se inventan ceros ni costos.
  - **F9-C2** pendiente (evidence): Pruebas de eventos y duraciones pasan; acceso/retención definidos y exportación sin secretos.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F10. Piloto, evaluación y mejoras

**Meta:** Validar el conjunto en Tao Mangalam y decidir expansión con evidencia.
**Esfuerzo:** Por estimar en F1 tras revisar el código y las capacidades existentes.
**Cómo deshacerla:** Conservar documentos y evidencia; corregir decisiones mediante enmienda auditada, sin modificar código ni borrar historial.

**Registro F10** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F10-P1: F7 cerrada con sus criterios y evidencia verificados.
  - [ ] F10-P2: F8 cerrada con sus criterios y evidencia verificados.
  - [ ] F10-P3: F9 cerrada con sus criterios y evidencia verificados.
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
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.
