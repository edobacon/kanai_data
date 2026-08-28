---
id: TICKET-099
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1267
module: curriculum-design
autopilot: autonomous
---

# Malla — Paridad de la malla curricular desde el MCP (cobertura Fase A+B)

> **Linkeado a la épica [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267)** (`external: UPONE-1267`; commits/branch usan ese id, DET-19). No es una Historia nueva de Jira todavía — si el team quiere una Historia dedicada bajo la épica, se crea a pedido.
> **Fuente de diseño:** [`sp5/mcp-malla-coverage-gap.md`](../../../../uplanner/specs/up1/sp5/mcp-malla-coverage-gap.md) — gap analysis validado en vivo (2026-07-01) contra el MCP. El SPEC formal se crea al tomar el ticket (design-feature), transcribiendo REQ/tasks.

## Request

Que el usuario pueda **usar desde el MCP (`up1-mcp` / Elric) las capacidades del componente de malla curricular** (`CurriculumMesh`) construido en SP5, con paridad operable: ver la malla, agregar/editar/quitar asignaturas (obligatorias y electivas, creando bloque en el acto), gestionar líneas de formación y el árbol de requisitos, **sin conocer la forma cruda de los objetos** y **recibiendo aviso de los guards antes de commitear**.

Hoy los 3 objetos de la malla (`planEntry`, `requirementCategory`, `requirement`) ya están cubiertos por **CRUD genérico** + `get_create_guide` + enrichment de lectura (validado en vivo), y el guard MC-09 se aplica en runtime. Faltan: (A) exponer los guards y la editabilidad en los contratos, (B) tools dedicadas de malla (lectura agregada + alta/edición orquestadas). Las tools `cd_*` de malla se habían diferido a SP6 por MC-04; este ticket las adelanta a SP5.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement (tools MCP + metadata de contratos) |
| Tipo de cambio | MCP adapter (`uplanner/mcp/`) + exposición de metadata de guards del mod |
| Modulo principal | curriculum-design (dominio malla) / up1-mcp (adaptador) |
| Modulos afectados | up1-mcp (tools + contracts); curriculum-design (metadata de guards, solo lectura) |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | no | Es capa MCP (tools/JSON), sin UI. |
| Data model | no | No crea objetos ni campos; reusa `planEntry`/`requirementCategory`/`requirement` y el enrichment existente. |

## Triage

REQs derivados del gap analysis (validado en vivo). Alcance de este sprint = **Fase A + Fase B**; Fase C (layout de malla por MCP, motor de evaluación) queda **fuera** (documentado como diferido).

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Los guards (MC-09, rango, borrado) ya se aplican por MCP; solo falta exponerlos en `describe`/`get_create_guide` | ✓ confirmada | guard en override del resolver; `create_object` genérico pasa por él; `describe_object` muestra `validations:{}` |
| H2 | El enrichment de lectura de la malla llega por MCP sin trabajo extra | ✓ confirmada | `query_records requirementCategory` devolvió `currentCredits`/`mandatoryCount`/`electiveCount`/`creditStatus` en vivo |
| H3 | Las tools dedicadas son orquestación sobre las mutaciones existentes (no lógica nueva de dominio) | ✓ inferida | `cd_add_plan_entry` orquesta `CREATE_REQUIREMENT`(bloque)+create planEntry, ya existentes |

### Context found

**Estado MCP (validado en vivo 2026-07-01, tenant UPU):**
- `list_object_types` incluye `planEntry`, `requirementCategory`, `requirement`.
- `describe_object` / `get_create_guide` de los 3: CRUD genérico completo, recetas paso a paso, enums y opciones de campo — pero `validations:{}` y `usesValidatedMutations:{}` (no exponen los guards).
- `query_records` de `requirementCategory` devuelve derivados (`currentCredits`, `mandatoryCount`, `electiveCount`, `creditStatus`).
- No hay tools `cd_*` de malla (las 26 `cd_*` cubren lo preexistente: programas, currículos, secciones, sílabos, bibliografía).

**KB:** MC-04 ([TICKET-084](TICKET-084.md)) registró los objetos + RBAC (12 caps) + 3 ObjectContracts + resolver polimórfico `ownerId`; difirió `cd_*` de malla a SP6. RULE-dev-009 (contratos MCP).

**Gaps (del MD):** G1 guards no documentados · G2 sin tools dedicadas · G3 electiva en 2 pasos sin orquestación · G4 sin `get_mesh` · G5 `canEdit` no consultable · (G6 FE / G7 layout → fuera de alcance).

**Delta MC-08 (TICKET-088 cerrado 2026-07-02) — incorporado 2026-07-02, ver gap MD §6:** MC-08 construyó dominio nuevo que hoy no tiene paridad MCP → REQ-07..REQ-11.
- **G8** pre-check estructural de prereqs al agregar (RecordState Before/Either + Group K-de-N; MetricThreshold NO alerta — H2). Distinto del guard MC-09 (que es de publicación). Reusa `prereqCheck.logic.ts` del mod.
- **G9** mover asignatura entre períodos con recálculo de `position` de hermanos (reusa `recalcPeriodPosition.logic.ts`).
- **G10** `Curriculum.totalPeriods` como constraint + aviso de discrepancia.
- **G11 (transversal)** opciones legibles + resolución por nombre/código (lección **W2** del dual-judge: el modal mostraba el `activityId` UUID → se corrigió a código). Nunca IDs crudos; `get_field_options` para selects/enums; matching tolerante a acentos + desambiguación.

## Requisitos (REQ) — a transcribir al SPEC

| REQ | Certeza | source_ref | Enunciado |
|-----|---------|-----------|-----------|
| REQ-01 · exponer guards en contratos (Fase A / G1) | confirmed | gap MD §3 G1 | `describe_object`/`get_create_guide` de `requirement`/`requirementCategory`/`planEntry` deben advertir MC-09 (bloqueo en Active → versionar), rango de créditos (min≤max) y guard de borrado ("reasigna primero") en `notes`/`validations`. |
| REQ-02 · exponer editabilidad del plan (Fase A / G5) | confirmed | gap MD §3 G5 | Exponer si un plan es editable (p.ej. `isEditable` derivado en lectura de `Curriculum`, desde `EDITABLE_STATUSES`) para consultarlo antes de mutar. |
| REQ-03 · `cd_get_mesh(curriculumId)` (Fase B / G4) | confirmed | gap MD §3 G4 | Lectura agregada: entradas por período + líneas con derivados + resumen. Reusa el enrichment existente. |
| REQ-04 · `cd_add_plan_entry` con creación de bloque orquestada (Fase B / G2,G3) | confirmed | gap MD §3 G2,G3 | Agregar asignatura (oblig/electiva) resolviendo por nombre/código; electiva acepta `blockId` **o** `newBlockName` (crea el `rt__Group__requirement` y luego la entrada, atómico). Paridad con TICKET-098. |
| REQ-05 · `cd_update_plan_entry` / `cd_remove_plan_entry` (Fase B / G2) | confirmed | gap MD §3 G2 | Editar (créditos/categoría/rol/bloque, con opción de crear bloque nuevo) y quitar. |
| REQ-06 · `cd_manage_formation_line` (Fase B / G2) | confirmed | gap MD §3 G2 | CRUD de línea de formación con rango y guard de borrado surfaceados. |
| REQ-07 · pre-check de prerrequisitos en el alta (Fase B / G8) | confirmed | gap MD §6 G8 + TICKET-088 REQ-02 (`prereqCheck.logic.ts`) | `cd_add_plan_entry` corre el **pre-check estructural** (RecordState timing Before/Either NO ubicado en período anterior; Group K-de-N con miembros ausentes; **`MetricThreshold`/créditos NO alerta** — H2) y devuelve los faltantes **por código/nombre legible** en el `preview`. **Informativo, no bloquea el commit** (paridad con el modal de MC-08). + `cd_get_prereqs(activity)` para inspeccionar el árbol de prereqs de una asignatura. |
| REQ-08 · mover asignatura entre períodos con recálculo (Fase B / G9) | confirmed | gap MD §6 G9 + TICKET-088 REQ-03 (`recalcPeriodPosition.logic.ts`) | `cd_move_plan_entry` (o `cd_update_plan_entry` extendido) cambia `period`/`position` **recalculando el orden de los hermanos** en columna origen y destino (paridad con el drag&drop; reusa la lógica de `recalcPeriodPosition`). Evita huecos/colisiones de posición. |
| REQ-09 · `totalPeriods` como constraint + aviso de discrepancia (Fase B / G10) | confirmed | gap MD §6 G10 + TICKET-088 REQ-03 | `cd_get_mesh` expone `Curriculum.totalPeriods` + `#períodos actuales`; el alta **avisa (no bloquea)** si el período destino excede `totalPeriods` (paridad con la alerta de discrepancia de MC-08). |
| REQ-10 · gestión del árbol de requisitos (Fase B / G8) | confirmed | gap MD §6 §6.4 B8 + MC-03/TICKET-083 | `cd_manage_requirement` — ver/crear el árbol (`RecordState`/`Group`/`MetricThreshold`) resolviendo el **target por código**, con `timing`/`mustBe`/`combinator` como **opciones** (`get_field_options`); respeta H2 (créditos no condicionan ubicación). |
| REQ-11 · **(transversal)** opciones legibles + resolución por nombre/código (Fase A+B / G11) | confirmed | gap MD §6.3 + lección W2 del dual-judge de TICKET-088 | **Todas** las tools de malla: nunca exigen IDs crudos — resuelven curso/línea/bloque/prereq **por nombre o código** en input (matching **tolerante a acentos** + **desambiguación** si hay varios matches) y devuelven **etiquetas legibles** en output (nunca UUIDs). Selects/enums vía `get_field_options`. |

**Fuera de alcance (Fase C, documentado como diferido):** config del layout de la malla por MCP (RecordDetail = fase 2, G7); motor de evaluación de requisitos (SP6); reactividad instantánea UI↔categorías (freshness — MC-08 lo resolvió con botón "Actualizar", no requiere MCP).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1267-sp5` (épica) — commits con `UPONE-1267` (DET-19). Repo MCP: `uplanner/mcp` (default branch `main`, repo standalone) |
| Base branch | `develop` (mod) / `main` (mcp) |
| DB state | UPU con planes Active + Draft y datos de malla (ya presentes) |
| Services | up1-mcp (adaptador) contra GraphQL de up1; sesión MCP (authenticate + submit_otp) |
| Test data | plan ICIV-2026 (Active), ICIV-2027 (Draft), Minor (Active) |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-07-02T16:15:14Z | (nuevo) → super | dev invocó `/dkc 099 super autopilot` | S1 (proximo gate) |

### Plan de sessions

| Session | Objetivo | REQ / Tasks | Tier | Tipo gate |
|---------|----------|-------------|------|-----------|
| S1 | Fase A: exponer guards + editabilidad en contratos (`describe`/`get_create_guide`/lectura Curriculum) + `cd_get_mesh` (lectura agregada, con `totalPeriods` REQ-09) | REQ-01, REQ-02, REQ-03, REQ-09 | T2 | ⚑ fuerte |
| S2 | Fase B (writes): `cd_add_plan_entry` (orquesta bloque + **pre-check de prereqs** REQ-07), `cd_update/move/remove_plan_entry` (**recálculo** REQ-08), `cd_manage_formation_line` + tests | REQ-04, REQ-05, REQ-06, REQ-07, REQ-08 | T2 | ⚑ fuerte |
| S3 | Árbol de requisitos + transversal: `cd_manage_requirement` (REQ-10) + `cd_get_prereqs` + **opciones legibles/resolución por nombre** aplicada a todas las tools (REQ-11) + tests | REQ-10, REQ-11 | T2 | ⚑ fuerte |

> Tier T2: tools MCP que orquestan mutaciones (crean bloque + entry); dependen del guard runtime y del contrato. Validación por tests de contrato del MCP + smoke con sesión real.
> **Delta MC-08 (incorporado 2026-07-02):** REQ-07..REQ-11 amplían el alcance original (REQ-01..06). El pre-check de prereqs (REQ-07) y el recálculo (REQ-08) reusan lógica pura ya construida en el mod (`prereqCheck.logic.ts`, `recalcPeriodPosition.logic.ts`) — la tool MCP orquesta, no reimplementa. REQ-11 es transversal a todas las tools.

### Session 1 — 2026-07-02 — Fase A: contratos (guards + editabilidad) + cd_get_mesh [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T2

**Objetivo**: Exponer los guards de negocio (MC-09, rango de créditos, borrado) y la editabilidad del plan en los contratos MCP, y proveer la lectura agregada `cd_get_mesh` con `totalPeriods` (REQ-01, REQ-02, REQ-03, REQ-09).

**Tasks completadas**:
- [x] S1.T1 — Agregar campo `guards?: string[]` a ObjectContract; poblarlo en requirement/requirementCategory/planEntry; surfacear en describe_object.validations.guards y get_create_guide.notes
- [x] S1.T2 — Derivar `isEditable` desde EDITABLE_STATUSES=['Draft'] y exponerlo en cd_get_curriculum
- [x] S1.T3 — Implementar cd_get_mesh(curriculumId): agrupar por período, resolver labels, exponer totalPeriods/#períodos/isEditable/derivados
- [x] S1.GATE — Gate de sync Session 1 (tier: T2)

**Validacion del tier** (T2): `npx tsc --noEmit` exit 0; suite completa `npx vitest run` → 104 tests verdes (12 files), incluidos 33 de contracts (TC-01/02/02c) y 9 de mesh-logic. Sin regresión (registry-collision verde con la tool nueva).

**Reviewer**: aislado (Explore/sonnet, contexto limpio) sobre el diff de S1
**Tier de revision**: standard (T2, ⚑ fuerte) — single-judge aislado (DET-35 dual-judge reducido por proporcionalidad: diff acotado ya con tests; documentado)
**Resultado global**: pass tras 1 iteración (iterate → fix → verificado)

#### Quality review (DET-23)

| # | Dimensión | Veredicto | Nota |
|---|-----------|-----------|------|
| 1 | Calidad de código | pass | funciones cortas; `num` duplicado resuelto reusando `toFiniteNumber` exportado |
| 2 | Lint/estilo | pass | consistente con curriculum.ts/programs.ts vecinos |
| 3 | Tipado | pass | `tsc --noEmit` limpio, sin `any` |
| 4 | Testing | pass | TC-01/02/02c + 9 mesh-logic con valores concretos; cap y guard accuracy cubiertos |
| 5 | Escalabilidad | pass | batch Activities por IN; truncation avisada; cap MAX_MESH_PERIODS anti-OOM |
| 6 | Mantenibilidad | pass | guards config-driven; procedencia del port documentada |
| 7 | Claridad | pass | nombres/comentarios en español, precisos |
| 8 | A11y | n/a | capa MCP |
| 9 | Storybook | n/a | capa MCP |
| 10 | Error handling | pass | try/catch + errorResult, sin catches vacíos |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

**Findings del reviewer y resolución**:
- **CRITICAL** — `PLAN_ENTRY_CONTRACT.guards` afirmaba un bloqueo por estado del plan que NO existe en el backend (MC-09 solo bloquea `requirement(ownerType=activity)`, no `planEntry`). **Corregido**: guard reescrito a la semántica real + TC-02c que lo fija. Es justo el tipo de info falsa que REQ-01 busca prevenir → bien detectado.
- WARN resueltos en la misma iteración: nota de rango duplicada (removida), `num()`↔`toFiniteNumber` (DRY), `effectiveCredits` del enrichment (preferido), truncamiento (avisado en summary), cap de columnas (MAX_MESH_PERIODS), `whatYouCanDo` actualizado.
- WARN(theoretical)/INFO: `nextPosition` sin consumidor aún (preparación S2, aceptado).

**Verificación self-report (DET-33)**: `git status` del repo MCP limpio tras el reviewer (sin contaminación); tests re-corridos por el orquestador (104 verdes), no confiados al self-report; `tsc` exit 0 verificado. Veredicto: verified.

**Commit DET-27**: `fd56013` UPONE-1267 feat(curriculum-design): expose mesh guards + editability + cd_get_mesh

```dkc:gate-telemetry
session: S1.GATE
work_type: implement
tier: T2
review_mode: isolated-single-judge
judge_tier: balanced
fix_iterations: 1
adjudicator_invocations: 0
diff_chars: 6400
est_tokens: 1730
span_seconds: 1500
```

### Session 2 — 2026-07-02 — Fase B: writes de entradas + port de lógica pura [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T2

**Objetivo**: Portar la lógica pura del mod (pre-check de prereqs, recálculo de posición) al MCP e implementar las tools de escritura de entradas (add/update/move/remove) y de línea de formación (REQ-04..REQ-08).

**Tasks completadas**:
- [x] S2.T1 — Portar lógica pura: findMissingPrereqs, recalcPeriodPosition, helpers de payload; tipos VM; comentario de procedencia
- [x] S2.T2 — cd_add_plan_entry: resolver por nombre/código; electiva con blockId o newBlockName (rollback); pre-check prereqs; aviso totalPeriods
- [x] S2.T3 — cd_update_plan_entry / cd_move_plan_entry (recalc) / cd_remove_plan_entry
- [x] S2.T4 — cd_manage_formation_line con validación de rango + guard de borrado
- [x] S2.GATE — Gate de sync Session 2 (tier: T2)

**Validacion del tier** (T2): `npx tsc --noEmit` exit 0; suite completa 117 tests verdes (12 files); 22 tests de mesh-logic cubren normalización/prereqs/recalc/payloads/deriveMinToSatisfy. Sin regresión (registry-collision + tool-visibility verdes con las 5 tools nuevas).

**Reviewer**: aislado (Explore/sonnet, contexto limpio) sobre el diff de S2, comparando el port contra los archivos fuente reales del mod
**Tier de revision**: standard (T2, ⚑ fuerte) — single-judge aislado (DET-35 dual-judge reducido por proporcionalidad; documentado)
**Resultado global**: pass tras 1 iteración (iterate → fix → verificado)

#### Quality review (DET-23)

| # | Dimensión | Veredicto | Nota |
|---|-----------|-----------|------|
| 1 | Fidelidad port (prereqs) | pass | findMissingPrereqs/normalize fieles; sin doble conteo de miembros de Group; MetricThreshold excluido (H2) |
| 2 | Fidelidad port (recalc) | pass | recalcPeriodPosition idéntico (0-based, filterChanged, 2 casos) |
| 3 | Fidelidad payloads | pass | buildBlockPayload/buildPlanEntryPayload campo por campo; deriveMinToSatisfy corregido a port exacto |
| 4 | Tipado | pass | `tsc` limpio, sin `any` |
| 5 | Testing | pass | 22 mesh-logic; test de deriveMinToSatisfy corregido para NO blindar el bug |
| 6 | Rollback/atomicidad | pass | bloque huérfano se borra si falla la entrada; BLOCK_OBJECT_TYPE reusado |
| 7 | cd_move (planId/fromPeriod/updates) | pass | obtiene del entry, aplica solo deltas |
| 8 | cd_manage_formation_line | pass | 3 acciones + validateCreditRange + guard de borrado surfaceado |
| 9 | Regresión (26 cd_* + tests) | pass | 117/117; sin colisión de nombres |
| 10 | Error handling | pass | try/catch + errorResult; rollback con catch anidado |

**Findings del reviewer y resolución**:
- **CRITICAL** — `deriveMinToSatisfy` no era un port fiel (parafraseado): `deriveMinToSatisfy(0)` daba 1 vs 0 del mod, y el override 0 se descartaba. **Corregido** al port exacto (`courseCount<=0→0; override null/negativo→#cursos; si no→override`) + test reescrito (antes blindaba el bug). Es justo la divergencia que los tests del port deben atrapar.
- **WARN(real)** — `cd_update_plan_entry` ignoraba `blockId`/`newBlockName` sin `role:electiva` (no-op silencioso). **Corregido**: pasar blockId/newBlockName implica electiva; role:obligatoria + block → error explícito.
- WARN menores resueltos: literal `rt__Group__requirement` → `BLOCK_OBJECT_TYPE` exportado; `credits` Zod ahora `.nullable().optional()` (coincide con la descripción "envía null para heredar").
- WARN(theoretical)/INFO: rollback batch (fuera de alcance — alta es de una entrada); cd_manage_formation_line multi-acción no gateada (conservador, documentado); tools de mesh-write sin test de handler (patrón del repo — cubiertas por la lógica pura + smoke).

**Verificación self-report (DET-33)**: `git status` MCP limpio tras el reviewer; 117 tests re-corridos por el orquestador; `tsc` exit 0. Veredicto: verified.

**Commit DET-27**: `6c30362` UPONE-1267 feat(curriculum-design): mesh write tools (add/update/move/remove entries + formation line)

```dkc:gate-telemetry
session: S2.GATE
work_type: implement
tier: T2
review_mode: isolated-single-judge
judge_tier: balanced
fix_iterations: 1
adjudicator_invocations: 0
diff_chars: 15000
est_tokens: 4050
span_seconds: 1400
```

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-07-02 — Árbol de requisitos + transversal (opciones legibles) [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T2

**Objetivo**: Gestionar el árbol de requisitos por código (`cd_manage_requirement`, `cd_get_prereqs`) y aplicar el principio transversal G11 (resolución por nombre/código + labels legibles) a todas las tools de malla (REQ-10, REQ-11).

**Tasks completadas**:
- [x] S3.T1 — cd_manage_requirement (view/create) resolviendo target por código; timing/mustBe/combinator como opciones; H2
- [x] S3.T2 — cd_get_prereqs(activity): inspeccionar árbol de prereqs, salida legible por código
- [x] S3.T3 — Transversal G11: verificar resolución por nombre/código + labels legibles en todas las tools; registrar tools nuevas en el pack
- [x] S3.GATE — Gate de sync Session 3 (tier: T2)

**Validacion del tier** (T2): `npx tsc --noEmit` exit 0; suite completa 121 tests verdes (13 files) — TC-12/TC-13 (enums por etiqueta + desambiguación) + requirement-tree (árbol anidado). Sin regresión (registry-collision verde con 7 tools de malla).

**Reviewer**: aislado (Explore/sonnet, contexto limpio) sobre el diff de S3
**Tier de revision**: standard (T2, ⚑ fuerte) — single-judge aislado (DET-35 dual-judge reducido por proporcionalidad; documentado)
**Resultado global**: pass tras 1 iteración (iterate → fix → verificado)

#### Quality review (DET-23)

| # | Dimensión | Veredicto | Nota |
|---|-----------|-----------|------|
| 1 | Correctness (contrato/enums) | pass | mustBe/timing/effect/combinator canonicalizados por etiqueta ES (TC-12) |
| 2 | Resolución polimórfica owner | pass | ownerId resuelto por ownerType via resolveContractInputs |
| 3 | H2 (créditos no ubican) | pass | normalizePrereqRequirements excluye MetricThreshold; nota en cd_get_prereqs |
| 4 | REQ-11 (nombre/código + labels) | pass | tras fix: árbol anidado, targets por código; parent documentado como de view |
| 5 | Registro en el pack | pass | 2 tools en tools[]+registerTools; notExposed/whatYouCanDo actualizados |
| 6 | Regresión 26 cd_* / tests | pass | 121/121; sin colisión de nombres |
| 7 | Visibilidad por permisos | pass | multi-acción/lectura sin gate (conservador, consistente) |
| 8 | Errores/desambiguación | pass | ambiguous→candidatos legibles; not_found→mensaje claro |
| 9 | Validación por recordType | n/a | delegada al backend por diseño del contrato (documentado) |
| 10 | Cobertura tests | pass | enums+ambigüedad+árbol; patrón del repo (lógica pura + smoke) |

**Findings del reviewer y resolución** (sin CRITICAL):
- **WARN(real)** — `view` devolvía lista plana con `parentId` crudo (UUID). **Corregido**: `buildRequirementTree` anida hijos bajo su Group (`children[]`), targets por código, sin exponer `parentId` — test `requirement-tree.test.ts` lo fija.
- **WARN(real)** — docstring de `parent` no aclaraba el flujo. **Corregido**: "(obtenido de `cd_manage_requirement action:view`)".
- WARN(theoretical)/INFO: validación de campos por recordType delegada al backend (diseño del contrato); `docs/TOOLS.md` sin tools de malla (brecha preexistente → backlog); default `effect=EligibilityToEnroll` documentado en código.

**Verificación self-report (DET-33)**: `git status` MCP limpio tras el reviewer; 121 tests re-corridos; `tsc` exit 0. Veredicto: verified.

**Commit DET-27**: `bf52206` UPONE-1267 feat(curriculum-design): requirement tree tools (cd_manage_requirement, cd_get_prereqs)

```dkc:gate-telemetry
session: S3.GATE
work_type: implement
tier: T2
review_mode: isolated-single-judge
judge_tier: balanced
fix_iterations: 1
adjudicator_invocations: 0
diff_chars: 9000
est_tokens: 2430
span_seconds: 1300
```

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Testing

### Coverage map

> **Nota de evidencia (DET-13)**: la lógica de cada REQ está cubierta por tests unitarios/de contrato (vitest, 121 verdes). Los TCs con componente **smoke** requieren una sesión MCP real contra UPU (authenticate + OTP), no ejecutable en esta corrida autónoma — su semántica subyacente SÍ está verificada por unit tests; la verificación smoke en vivo queda como backlog `could` (B1). Sin claim falso de smoke (memoria: verificar render real).

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 | TC-01, TC-02 | contract | pass |
| REQ-02 | (unit isEditable) | unit | pass |
| REQ-03 | TC-03 | contract/smoke | partial (lógica verificada; smoke live diferido) |
| REQ-04 | TC-04, TC-05 | contract/smoke | partial (payloads verificados; smoke live diferido) |
| REQ-05 | TC-06 | contract | partial (lógica de patch verificada) |
| REQ-06 | TC-07 | contract | partial (validateCreditRange verificado) |
| REQ-07 | TC-08, TC-09 | contract/smoke | pass (unit); smoke live diferido |
| REQ-08 | TC-10 | contract | pass (unit recalc) |
| REQ-09 | TC-11 | smoke | partial (lógica de aviso; smoke live diferido) |
| REQ-10 | TC-12 | contract | pass |
| REQ-11 | TC-13 | contract/smoke | pass (contract); smoke live diferido |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-01 | `describe_object requirement` advierte MC-09 | REQ-01 | contract | — | describe | `validations.guards`/`notes` mencionan bloqueo en Active + versionar | guards[] menciona "Active" + "nueva versión" + "MC-09" | test/contracts.test.ts TC-01 | pass |
| TC-02 | `describe`/`guide` de requirementCategory advierten rango + borrado | REQ-01 | contract | — | describe/guide | notes con min≤max + "reasigna primero" | guards[] con "minCredits ≤ maxCredits" + "reasigna" | test/contracts.test.ts TC-02 | pass |
| TC-03 | `cd_get_mesh` devuelve malla agrupada + derivados | REQ-03 | contract/smoke | plan con entries | groupByPeriod | períodos ordenados + líneas con derivados + resumen | groupByPeriod verificado (columnas, orden, cap); tool smoke live no ejecutada | test/mesh-logic.test.ts (groupByPeriod) | partial |
| TC-04 | `cd_add_plan_entry` electiva con bloque nuevo | REQ-04 | contract/smoke | plan Draft | buildBlock+buildEntry | crea bloque + entry atómico | payloads verificados (ownerType=curriculum, kind=Course, blockId); create+rollback smoke live no ejecutada | test/mesh-logic.test.ts (payloads) | partial |
| TC-05 | `cd_add_plan_entry` sobre plan Active bloqueado (MC-09) | REQ-04 | smoke | plan Active | add requirement owner=activity | rechazo con mensaje versionar | guard corre en el resolver up1 (verificado por TICKET-089); rechazo en vivo requiere sesión OTP → diferido | — | deferred (B1) |
| TC-06 | `cd_update/remove_plan_entry` | REQ-05 | contract | entry existente | update/remove | patch aplicado / entry quitado | lógica de patch parcial (credits/categoryId/blockId) + role inference verificada por inspección/tsc; smoke live diferido | tsc + review | partial |
| TC-07 | `cd_manage_formation_line` con guard de borrado | REQ-06 | contract | línea con entries | delete | bloqueado "reasigna primero" | validateCreditRange verificado (contracts TC-03); guard de borrado surfaceado en preview text; rechazo backend en vivo diferido | test/contracts.test.ts TC-03 | partial |
| TC-08 | prereq (RecordState Before) no ubicado antes | REQ-07 | contract/smoke | plan Draft, prereq sin ubicar | findMissingPrereqs | lista el prereq faltante **por código**, informativo | findMissingPrereqs devuelve item con label=código; timing Before/Either | test/mesh-logic.test.ts TC-08 | pass |
| TC-09 | único requisito es `MetricThreshold` (créditos) | REQ-07 | contract | plan Draft | normalizePrereqRequirements | NO reporta faltante (H2) | MetricThreshold excluido en normalización; missing=[] | test/mesh-logic.test.ts TC-09 | pass |
| TC-10 | `cd_move_plan_entry` de período 2 → 1 | REQ-08 | contract | 2 períodos con hermanos | recalcPeriodPosition | `period`/`position` recalculados sin hueco/colisión | movida→(1,1), hermano→(1,2), origen cierra hueco→(2,0), sin-cambio omitido | test/mesh-logic.test.ts TC-10 | pass |
| TC-11 | período destino > `totalPeriods` | REQ-09 | smoke | plan totalPeriods=10 | add período 11 | avisa discrepancia, no bloquea; `cd_get_mesh` expone totalPeriods | lógica de aviso en cd_add_plan_entry (periodWarning) + summary.totalPeriods; smoke live diferido | inspección + review | partial |
| TC-12 | `cd_manage_requirement` crea RecordState resolviendo target por código | REQ-10 | contract | activity existente | resolveContractInputs | target por código; `timing`/`mustBe` como opciones | mustBe "Aprobado"→Approved, timing "Antes"→Before, effect canónico | test/contracts.test.ts TC-12 | pass |
| TC-13 | tool invocada con nombre de curso (no id), 2 matches | REQ-11 | contract/smoke | catálogo con homónimos | resolveReference | desambigua, resuelve sin UUID; output legible | resolveReference status=ambiguous con 2 candidatos; árbol view sin parentId crudo | test/contracts.test.ts TC-13 + requirement-tree.test.ts | pass |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| MCP suite completa | `npx vitest run` (uplanner/mcp) | 89 tests (12 files) | 121 tests (13 files) | +32 tests (guards, mesh-logic, requirement-tree, TC-12/13); 0 regresiones; registry-collision + tool-visibility verdes con 7 tools nuevas |
| Typecheck | `npx tsc --noEmit` | exit 0 | exit 0 | sin errores de tipo |

## Backlog

| # | Item | REQ | Spec ref | Que existe | Como retomar | Prioridad |
|---|------|-----|----------|-----------|--------------|-----------|
| B1 | Smoke en vivo de las tools de malla contra UPU | REQ-03..11 | descubierto en cierre de TICKET-099 | 7 tools implementadas + 121 tests unit/contract verdes en `uplanner/mcp` | Abrir sesión MCP (`authenticate` + `submit_otp`) contra tenant UPU; correr TC-03/04/05/08/11/13 en vivo (ver malla de un plan, agregar electiva con bloque nuevo, intentar sobre plan Active, pre-check de prereqs, aviso de períodos, desambiguación por nombre). Registrar evidencia (JSON de respuesta). No bloquea: la lógica está cubierta por unit tests | could |
| ~~B2~~ | ~~Documentar las 7 tools de malla en `uplanner/mcp/docs/TOOLS.md`~~ **✓ resuelto 2026-07-02** (commit `e0862f6`): manifest.json (74→82), TOOLS.md (subsección Malla + conteos), CAPABILITIES.md (casos de uso), topic in-server `curriculum-design` ya cubierto vía domainDoc del pack | — | reviewer S3 | — | — | could |

## Summary

**Resultado**: paridad operable de la malla curricular desde el MCP (Fase A + B). Se entregaron 7 tools nuevas de dominio y se expusieron los guards de negocio + la editabilidad del plan en los contratos, sin tocar nada fuera de `uplanner/mcp/`.

**Entregado (11/11 REQs)**:
- **Fase A** — `guards[]` en `ObjectContract` surfaceado en `describe_object` + `get_create_guide` (MC-09, rango de créditos, borrado); `isEditable` derivado de `EDITABLE_STATUSES=['Draft']` en `cd_get_curriculum`; `cd_get_mesh` (malla agrupada por período + líneas con derivados + `totalPeriods`).
- **Fase B** — `cd_add_plan_entry` (electiva con bloque nuevo atómico + rollback, pre-check estructural de prereqs informativo, aviso de `totalPeriods`), `cd_update/move/remove_plan_entry` (recálculo de posición), `cd_manage_formation_line`, `cd_manage_requirement` (árbol anidado, target por código), `cd_get_prereqs`. Transversal G11: todas resuelven por nombre/código y devuelven labels legibles.

**Lógica portada** (DEC-LOCAL-01): `findMissingPrereqs`, `recalcPeriodPosition`, `groupByPeriod`, `nextPosition`, payload builders y `deriveMinToSatisfy` viven en `mesh-logic.ts` (con procedencia al mod). El MCP es standalone → se portó, no se importó (patrón espejo de `validations.ts`).

**Commits** (rama `UPONE-1267-sp5`, modo limpio, push diferido a revisión del team up1 per core_work_policy):
- `fd56013` — S1: guards + editability + cd_get_mesh
- `6c30362` — S2: write tools de entradas + formation line
- `bf52206` — S3: requirement tree tools

**Calidad**: 3 sessions, cada una con reviewer aislado (contexto limpio) que gatilló 1 iteración de fix — hallazgos reales: guard de `planEntry` con bloqueo falso (S1), `deriveMinToSatisfy` parafraseado en vez de portado (S2), árbol de requisitos plano vs anidado (S3). Validación de cierre reforzada: **approve** (11 REQs sin desviaciones, scope OK, rama correcta). 121 tests verdes (13 files, +32 vs baseline), `tsc --noEmit` exit 0, 0 regresiones.

**Fuera de alcance (documentado)**: Fase C (layout de malla por MCP, depende de RecordDetail — fase 2) y motor de evaluación de requisitos (SP6).

**Pendiente (backlog `could`, no bloquea)**:
- B1 — smoke en vivo contra UPU (requiere sesión OTP): la lógica está cubierta por unit tests; la verificación smoke real quedó diferida.
- B2 — documentar las 7 tools de malla en `uplanner/mcp/docs/TOOLS.md` (brecha preexistente).

**Nota de estilo (INFO, no bloqueante)**: inconsistencia menor en el guard de auth entre `mesh-read.ts` (`throw {}` heredado de `curriculum.ts`) y `mesh-write.ts`/`requirement-write.ts` (`Up1McpError`). Funcionalmente inocuo (`errorResult` maneja ambos).

**Story Points (DET-26)**: executed 2 (sessions-heuristic: llm=2, human=1, compresión implement c=0.5). Sin SP publicados en Jira (ticket linkeado a épica UPONE-1267, sin Historia dedicada).
