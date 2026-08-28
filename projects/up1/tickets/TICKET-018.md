---
id: TICKET-018
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1099
module: curriculum-design
autopilot: manual
---

# HU3 — Modelo de objetos workflow + seed UPU

## Request

Implementar capa transversal de workflow (4 objetos) para que objetos curriculares (curriculumPlan, activity, competencyNode) y futuros consumers (changeRequest, booking) sean gobernados por flujos configurables por institucion.

**Objetos a crear:**
- `workflowStatus` — estado institucional reutilizable (BOR, EDIT, REV-DEC, PUB, DIS, PROP, EVAL, APR, REJ)
- `workflow` — plantilla de estados + transiciones, scoped por scopeType (activity/curriculumPlan/competencyNode/changeRequest)
- `workflowTransition` — flecha entre 2 estados con name y requiresComment
- `workflowTransitionHistory` — log inmutable polimorfico (entityType + entityId)

**Seed UPU (5 workflows, 21 transiciones, 5 history demo):**
- activity-standard (default) + activity-fast
- curriculumPlan-standard
- competencyNode-standard
- changeRequest-standard

**Constraints clave:** code unique por institutionId, scopeType extensible, fromStatusId != toStatusId, history append-only.

**Lo que NO hace:** NO conecta workflows a consumers reales (es HU4), NO UI de gestion (config via seed), NO permisos en transiciones (provisional).

Detalle completo en UPONE-1099.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | Nuevos objetos + seed de datos |
| Modulo principal | curriculum-design |
| Modulos afectados | object-manager (codegen Prisma + GraphQL types automatico) |
| Sprint | Migracion uAssessment - SP2 (2026-05-11 a 2026-05-22) |
| Story Points (refinement) | 5 |
| Assignee Jira | Eduardo Bacon |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El codegen automatico de UP1 (RULE-core-002) regenera Prisma schema y GraphQL types desde JSON — no se escriben mutations a mano | **confirmada** | RULE-core-002, CLAUDE.md de up1 ("Schema-Driven Development"), `up1/object-manager/docs/features/event-system.md`. Codegen toma JSON de `objects/business/Base/` y produce `prisma/schema.prisma` + `src/graphql/typeDefs/dynamic.js` |
| H2 | CRUD generico (`createInstance`/`updateInstance`/`deleteInstance` con `objectType`) ya existe — NO se necesitan resolvers custom para los 4 objetos workflow | **confirmada** | RULE-core-008, `up1/object-manager/src/graphql/resolvers/instance.resolver.js` |
| H3 | Constraints como `code unique por institutionId` se declaran via Prisma `@@unique` en el JSON object definition | **confirmada (inferida)** | Codegen lee directivas Prisma desde JSON. Validacion runtime adicional via resolver wrapper si es necesaria |
| H4 | `scopeType` extensible sin migracion manual = string libre en el campo del JSON, NO enum Prisma (un enum requiere migracion al agregar valor) | **inferida** | A validar en design: el ticket pide "Idealmente declarativo, sin migracion manual". Trade-off: string libre = sin safety enum, enum = migracion. Recomendar string + validacion en seed |
| H5 | Seed va en `mods/curriculum-design/seed/` siguiendo RULE-mods-008 (FKs con `connect` + relation lowercase, NO campo directo) | **confirmada** | RULE-mods-008. NO se modifica `up1/object-manager/prisma/<TENANT>/seed.js` core (feedback_up1_mod_scope) |
| H6 | No se requieren resolvers custom — solo schema + constraints + seed + doc | **confirmada** | El ticket explicitamente declara "NO conecta workflows a consumers reales, NO UI, NO permisos en transiciones" |

### Context found

**Reglas DKC aplicables:**
- [RULE-core-002](../../rules/core/rule-core-002.md) — `npm run codegen` obligatorio despues de cambiar objects JSON
- [RULE-core-008](../../rules/core/rule-core-008.md) — CRUD generico via createInstance/updateInstance/deleteInstance
- [RULE-core-009](../../rules/core/rule-core-009.md) — Prisma client per-tenant NO tiene campo tenantId
- [RULE-mods-003](../../rules/mods/rule-mods-003.md) — `npm run sync` obligatorio despues de cambios en mods
- [RULE-mods-008](../../rules/mods/rule-mods-008.md) — Seeds usan `connect` con relacion lowercase para FK
- [RULE-mods-017](../../rules/mods/rule-mods-017.md) — Planear `required[]` y NOT NULL antes del primer sync (union append-only)

**Codigo de referencia:**
- `up1/object-manager/objects/business/Base/` — donde van los 4 JSON objects (`workflowStatus.json`, `workflow.json`, `workflowTransition.json`, `workflowTransitionHistory.json`)
- `up1/object-manager/scripts/codegen/` — codegen 8 fases (`npm run codegen`)
- `up1/mods/curriculum-design/seed/` — donde va el seed (siguiendo patron de mod study-notes y curriculum-design SP1)

**Documentacion:**
- Confluence: `Modelo de objetos de negocio Learning Assurance` (page/2038366242) — propuesta del modelo workflow (4 objetos en draft, scope per-institution, append-only history)
- `up1/object-manager/docs/features/record-types.md` — para entender si workflowStatus.category enum se modela como string libre o enum cerrado

**Tickets relacionados:**
- **UPONE-1099** (este ticket, externo) — HU3 Modelo de objetos workflow
- **UPONE-1100** (TICKET-019) — HU4 Rename. Depende de este. Habilita conexion activity → workflow
- **UPONE-1098** (TICKET-020) — HU2 changeLog. Depende parcialmente de este (workflowTransitionHistoryId)
- Confluence: `Modelo de objetos de negocio Learning Assurance` (page/2038366242) define los 4 objetos en draft
- Confluence: `Learning Assurance` (page/1990066183) y `Curriculum Design` (page/1989148681) — overview del producto

**Decisiones previas relevantes (del proyecto):**
- DECISION-007 — RecordTypes globales NO per-tenant (aplica a si workflow viene como base o como RT — definir en design)
- Memorias: `project_curriculum_design.md` — DECISION-005 documenta que workflowState quedo postergado en SP1 y se modela en sprint futuro (este sprint)

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `USUITE-1099-hu3-workflow-objects` (a crear) |
| Base branch | `develop` (up1) |
| DB state | UPU sandbox — sin instancias workflow previas. Seed core "uPlanner University" debe coexistir |
| Services | `up1-start.sh` (object-manager :4000, suite :3000, redis :6379) |
| Test data | Cargado por seed del mod en `mods/curriculum-design/seed/workflow-seed.js`. Idempotente via `upsert`. |
| Sync command | `npm run sync` despues de crear JSON objects y seed |
| Codegen command | `npm run codegen` despues de modificar object definitions JSON |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | `static_default` en JSON object definitions UP1 acepta tanto string como literal — el codegen normaliza ambos en `generatePrismaSchema.js:326-330`. La convencion del codebase es string. | researcher | 5 | discarded | — |
| L2 | Finding H6 del intake (sobre `static_default: "true"` siendo string en codigo) era preocupacion incorrecta — el formato string es la convencion correcta y funciona perfecto. El draft v1 propuso literales por error, corregido en S5.GATE. | passive | 5 | discarded | — |
| L3 | Codegen UP1 (`generatePrismaSchema.js:926`) genera nombres de enum hardcoded como `{objectType}{FieldNameCapitalized}`. Sin custom enum names. Si el nombre concatenado colisiona con un modelo existente, validacion Prisma falla. Mitigacion: nunca usar campos enum cuyo nombre concatenado colisione | developer | 6 | refined | RULE-mods-038 |
| L4 | Sync UP1 hace merge **append-only** (RULE-mods-017) — campos eliminados del JSON del mod NO se quitan del core post-sync. Workaround: borrar el archivo en core y re-syncing | developer | 6 | discarded | — |
| L5 | FKs a modelos `core_*` siempre `type: integer` en JSON UP1 (id es Int autoincrement por convencion del codebase). FKs a modelos business usan `type: string` (id es cuid). Codegen `generatePrismaSchema.js:197` distingue: `fkType = baseModelName.startsWith('core_') ? 'Int' : 'String'` | developer | 6 | refined | RULE-mods-039 |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|
| FA-1 | Sync inicial con `workflow.status` (Confluence v1.10 literal) + `references: "CoreUser"` | 4 errores Prisma: (a) colision model workflowStatus vs enum auto-generado workflowStatus por convencion `{objectType}{FieldNameCapitalized}` del codegen; (b) `Type "CoreUser"` no existe — el modelo real es `core_User`; (c) `@default(Draft)` en relation field invalido | La nomenclatura canonica de Confluence NO siempre traduce 1:1 al codegen UP1. Validar contra convenciones del codebase ANTES de la primera invocacion de sync |
| FA-2 | Re-sync con fixes (`lifecycle` + `core_User`) pero SIN borrar `business/Base/workflow.json` viejo | 2 errores residuales: el merge append-only del sync (RULE-mods-017) dejo `status` antiguo + `lifecycle` nuevo en core, ambos como properties del mismo objeto + mismatch de tipos String vs Int para FKs | Sync UP1 es append-only — para renames/retypes hay que borrar el archivo del core (`up1/object-manager/objects/business/Base/`) y re-syncing desde mod limpio |

## Sessions

### Plan de sessions (preplanificacion)

Plan estructural del execute generado por `design-feature` (DET-20). Detalle de tasks en [SPEC-003-workflow-platform](../../../../uplanner/specs/up1/curriculum-design/SPEC-003-workflow-platform.md). Las sessions ejecutadas se registran como `### Session N — ...` debajo de esta tabla.

> **DET-23 — escalado pragmatico** (regla refinada 2026-05-13): cada `S{N}.GATE` ejecuta Quality review con rigor escalado al tier DET-20 de la session. Las dimensiones que no aplican al cambio se marcan `n/a` con justificacion (no se ejecutan). Comandos costosos (regression completa, coverage delta, e2e) solo en T3. El gate `exhaustive` se reserva al cierre del ticket (S9) o cambios user-facing.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Quality review tier + dims aplicables |
|---|----------|------|------|-----------------|-----------|---------------------------------------|
| S5 | Smoke de defaults boolean + decisiones tecnicas finales | execute | T1 | S5.T1, S5.T2, S5.GATE | **⚑ fuerte** | **light**: dims 1, 7 (config + claridad de la decision). Lint y typecheck `n/a` (smoke temporal, archivo se elimina) |
| S6 | Los 4 JSONs object definitions + codegen | execute | **T1** | S6.T1..T5, S6.GATE | auto | **light**: dims 1 (estructura JSON UP1) + 7 (descripciones claras). Dims 2, 3, 4, 5, 6, 8, 9, 10 `n/a` — sin codigo TS/JS, sin tests asociados, sin UI. Validacion focal: `drift:check` |
| S7 | Resolvers custom + validaciones runtime | execute | T2 | S7.T1..T3 (3 resolvers), S7.T4 (sync logic), S7.GATE | **⚑ fuerte** | **standard**: dims 1, 2, 3, 4, 6, 7, 10. Dim 5 evaluable. Compliance .ai/PATTERNS.md. Lint + typecheck + tests integration locales (NO coverage delta full) |
| S8 | Seed UPU completo (statuses + workflows + transitions + history demo) | execute | T2 | S8.T1..T5, S8.GATE | auto | **standard**: dims 1, 2, 6, 7, 10. Dims 3, 4, 5 `n/a` justificado (JS sin tipos; tests en S9; sin queries pesadas). Lint del seed + idempotencia + formato logs consistente |
| S9 | Tests E2E + smoke UPU + docs — **gate de cierre del ticket** | execute | T3 | S9.T1..T4, S9.GATE | **⚑ fuerte** | **exhaustive**: 10 dims con dims 8 y 9 `n/a` justificado (HU3 sin UI). Unico gate del ticket que corre comandos costosos: regression completa + coverage delta vs baseline TICKET-011 + drift:check + smoke manual |

**Estimacion total**: 5 sessions, ~8-12h efectivas. Quality review por gate: ~5-10min para light, ~15-20min para standard, ~30-45min para exhaustive (solo S9). Comandos costosos concentrados en S9, no distribuidos. Mas riesgosa: S7 (resolvers custom). Mas larga: S8 (seed completo).

### Session 0 — Discovery (pre-execute, 2026-05-12)

**Objetivo:** Refinamiento de SP2 — entender alcance real, estimar SP, validar dependencias con HU4/HU2, confirmar que UP1 ya entrega los mecanismos necesarios.

**Discoveries cronologicos:**

1. **2026-05-12 — Codegen automatico via JSON object definitions**
   - Fuente: documentacion (`up1/object-manager/docs/features/event-system.md`, CLAUDE.md de up1, RULE-core-002)
   - Decision: los 4 objetos workflow se definen como JSON en `objects/business/Base/`. `npm run codegen` regenera Prisma schema y GraphQL types. NO se escriben migrations a mano.
   - Implicacion para estimacion: alto descuento de complejidad (~3 SP).

2. **2026-05-12 — CRUD generico no requiere mutations custom**
   - Fuente: codigo `up1/object-manager/src/graphql/resolvers/instance.resolver.js`, RULE-core-008
   - Decision: el ticket NO necesita resolvers custom para CRUD de workflowStatus/workflow/workflowTransition/workflowTransitionHistory. Se usa `createInstance(objectType, data)` etc.

3. **2026-05-12 — Seed va en mods/, NO en core**
   - Fuente: RULE-mods-008, RULE-mods-003, feedback_up1_mod_scope (memoria)
   - Decision: el seed con 9 statuses + 5 workflows + 21 transitions + 5 history demo vive en `mods/curriculum-design/seed/`. Idempotente con `upsert`. NO se toca `up1/object-manager/prisma/UPU/seed.js`.

4. **2026-05-12 — `scopeType` extensible: string libre (recomendado) vs enum**
   - Fuente: ticket Jira AC5 + experiencia con Prisma migrations
   - Open question: el ticket pide "idealmente declarativo, sin migracion manual". Trade-off documentado en H4. Decision pendiente al design.

5. **2026-05-12 — workflowTransitionHistory es polimorfico (entityType + entityId)**
   - Fuente: Confluence "Modelo de objetos de negocio Learning Assurance" (page/2038366242), ticket Jira
   - Decision: Mismo patron que `changeLog` (HU2/TICKET-020). Coexisten intencionalmente — workflowTransitionHistory para transiciones, changeLog para auditoria universal.

**Desglose por capa (todo dentro de 5 SP):**

| Capa | Detalle | SP |
|------|---------|---:|
| Implementacion | 4 JSON object definitions + codegen automatico Prisma+GraphQL. Constraints declarativos (unique por institutionId, no self-transitions, append-only). Seed UPU: 9 statuses + 5 workflows + 21 transitions + 5 history demo (~40 registros con FKs cruzadas) | 2.5 |
| Testing | Unit tests del seed (idempotencia con upsert, FKs correctos, conteos por workflow). Integration tests del CRUD generico sobre los 4 objetos via GraphQL. Tests de constraints (rechazar self-transitions, code duplicado) | 1 |
| a11y | **N/A** — sin UI nueva (el ticket explicitamente declara "NO UI de gestion (config via seed)"). Si en design surge alguna UI, escalar SP | 0 |
| Storybook | **N/A** — sin componentes Vue nuevos | 0 |
| QA / acceptance | Smoke en UPU: cargar seed, verificar via Prisma Studio + GraphQL playground los 5 workflows seedeados, verificar las 5 entradas demo de workflowTransitionHistory, probar rollback del seed | 0.5 |
| Documentacion | README del seed, patron de integracion para futuros consumers (como un objeto se engancha via `workflowId`+`currentStatusId`), update del INDEX del mod | 1 |
| **Total** | | **5** |

**Estimacion final: 5 SP**

**Justificacion:**
- Codegen + CRUD generico cubren el trabajo "ancho" del ticket sin requerir mutations custom ni migraciones manuales.
- Seed es deterministico pero requiere FKs correctos via `connect` (RULE-mods-008).
- Sin UI = sin a11y ni Storybook. Si el design genera UI inesperada, escalar SP.

**Riesgos identificados:**
- R1: si codegen no soporta directamente FK polimorfica (entityType + entityId), agregar resolver de validacion (+0.5 SP). Mitigacion: validar en design temprano.
- R2: ~~enum vs string libre para `scopeType` y `category`. Decision en design temprano.~~ **Resuelto 2026-05-13 (Sessions 2 + 3)**: todos los enum/string del modelo workflow tienen decision tomada con respaldo documental. `workflowStatus.status`, `workflowStatus.category`, `workflow.status`, `workflow.scopeType` = enum. `workflowTransitionHistory.entityType` y `changeLog.entityType` = string. Asimetria intencional segun Confluence v1.10. Ver Session 3 para decision matrix completa y citas verbatim.

**Dependencias:**
- Bloquea: TICKET-019 (HU4, necesita workflow objects para conectar activity), TICKET-020 (HU2, necesita workflowTransitionHistoryId)
- No bloqueado por nada

**Decision de scope:** comprometer en SP2. Orden de ejecucion sugerido SP2: 
1. TICKET-018 (este) — semana 1
2. TICKET-019 (HU4 rename + connect) — semana 1
3. TICKET-020 (HU2 changeLog) — semana 2

### Session 1 — Intake con Learning Assurance v1.10 (2026-05-12)

**Objetivo**: Re-validar el design del ticket contra la version actualizada de Confluence "Modelo de objetos de negocio Learning Assurance" (page 2038366242, version 14, doc v1.10, editada 2026-05-12T18:20Z). El dev informo que el modelo de objetos fue actualizado. Confirmar que el diseno general sigue valido e identificar ajustes obligatorios antes de generar JSONs.

**Estado del issue en Jira (sync 2026-05-12)**:
- UPONE-1099 paso a **`Developing`** el 2026-05-12 a las 22:53 (movido por Eduardo Bacon).
- Story Points = 5 asignados (18:26).
- Epic parent: **UPONE-1038** (asignado por Esteban Cortes a las 20:22).
- Spec canonica: Confluence [Modelo de objetos de negocio Learning Assurance — Objetos de plataforma — Workflow](https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2038366242/Modelo+de+objetos+de+negocio+Learning+Assurance#Objetos-de-plataforma-—-Workflow).
- 0 comentarios nuevos.

**Validacion contra Confluence v1.10:**

Confluence ahora documenta **30 objetos totales** (3 plataforma org + 4 plataforma workflow + 23 LA). De ellos:
- 6 estan **Implementados** (organization, institution, orgUnit, curricularSection, curricularLink, bibliographyReference)
- 5 estan **En implementacion** (los 4 workflow del HU3 + activity + changeLog)
- El resto (19) estan en **Draft**

El diseno general de TICKET-018 (4 objetos workflow + scopeType polimorfico + transitionId FK directo + append-only history + constraint `fromStatusId != toStatusId`) **coincide con Confluence sin necesidad de redesign**. Sin embargo emergen 3 ajustes obligatorios al JSON definition + 2 constraints nuevos a documentar.

#### Ajustes obligatorios (decision pendiente del dev antes de escribir JSONs)

**A. `workflowStatus.category` con 5 valores (no 4)**

Cita verbatim Confluence v1.10:
> "v1.10 (2026-04-28) — **Categoría `InReview` agregada al enum `workflowStatus.category`** (de 4 a 5 categorías). `InExecution` (alguien editando) e `InReview` (esperando evaluación de un tercero) son semánticamente distintos — sin la separación, métricas como '¿cuántos planes están atascados en revisión?' pierden la abstracción transversal. Flujo natural: `ToDo → InExecution → InReview → Published`, con `Closed` como terminal alternativo desde cualquier categoría anterior."

Impacto en el seed UPU: el mapeo de categoria de los 9 statuses debe usar **InReview** para REV-DEC y EVAL:

| Code | Name | Category (corregida) |
|------|------|----------------------|
| BOR | Borrador | ToDo |
| EDIT | Editando | InExecution |
| **REV-DEC** | En revision decanato | **InReview** |
| PUB | Publicado | Published |
| DIS | Descontinuado | Closed |
| PROP | Propuesto | ToDo |
| **EVAL** | En evaluacion | **InReview** |
| APR | Aprobado | Published |
| REJ | Rechazado | Closed |

Sin `InReview`, REV-DEC/EVAL quedan mal clasificados → metricas transversales degradadas.

**B. `workflow.createdBy` obligatorio**

Confluence define: `createdBy: UUID, Sí (requerido), FK → CoreUser`. El request original de TICKET-018 NO lo menciona. El JSON definition del objeto `workflow` debe incluirlo, y los 5 workflows del seed UPU deben tener `createdBy` poblado (idealmente userId del admin seed o del dev).

**C. `workflowStatus.status: Active/Archived` obligatorio**

Confluence define: `status: enum Active/Archived, Sí (requerido)`. Sirve para soft-delete del catalogo. El request original de TICKET-018 NO lo menciona. El JSON definition de `workflowStatus` debe incluirlo, y los 9 statuses del seed UPU deben cargarse con `status: Active`.

**D. `workflow.status: Draft/Active/Archived` obligatorio** (finding agregado 2026-05-13 tras extraccion estructural completa de Confluence v1.10)

Confluence define: `status: enum Draft/Active/Archived, Sí (requerido)`. Ciclo de vida del workflow — `Draft` editable; al primer consumidor pasa a `Active` y se **congela** (no se puede editar). Para evolucionar: clonar y crear uno nuevo. `Archived` retira el workflow.

El request original de TICKET-018 NO menciona este campo. El JSON definition de `workflow` debe incluirlo. La decision pendiente del intake `#2` (¿workflows del seed UPU se entregan Active o Draft?) es justamente la eleccion del valor inicial de este campo en el seed.

**E. `workflow.scopeType` (enum) + `workflowTransitionHistory.entityType` (string) — escenario hibrido segun Confluence v1.10** (resuelto 2026-05-13 — Session 3)

Confluence v1.10 declara **literal y explicito** la asimetria entre los dos campos:

- **`workflow.scopeType`** (objeto workflow): cita verbatim — *"`scopeType` | enum | Si | Tipo de objeto que puede usar el workflow. Valores: `curriculumPlan` / `activity` / `competencyNode` / `changeRequest` / `booking`. **El enum se extiende cuando una nueva app uP1 se suma al patron**"*. Decision de diseno explicita: *"Para cubrir nuevos tipos se extiende el enum y se crean workflows dedicados."*
- **`workflowTransitionHistory.entityType`** (objeto workflowTransitionHistory): cita verbatim — *"`entityType` | string | Si | Discriminador polimorfico. Valores: `curriculumPlan` / `activity` / `competencyNode` / `changeRequest` / `booking` **(extiende con consumidores)**"*. Decision de diseno explicita: *"Polimorfico entityType + entityId. **Conjunto abierto de consumidores** (LA hoy, uBooking manana, mas despues). Una FK polimorfica evita una columna por consumidor."*

**Resolucion**: respetar la asimetria documentada. La hipotesis H4 queda **parcialmente revisada**: era correcta en sentido amplio (extensibilidad), pero la doc canonica determina el mecanismo exacto por campo:

| Campo | Tipo | Justificacion (Confluence) |
|-------|------|----------------------------|
| `workflow.scopeType` | **enum** Prisma + GraphQL | "El enum se extiende cuando una nueva app uP1 se suma al patron". Acto raro (crear workflow), justifica rigor + migracion controlada |
| `workflowTransitionHistory.entityType` | **string** | "Conjunto abierto de consumidores". Acto frecuente (registrar transicion), no debe bloquearse por falta de migracion del enum |
| `changeLog.entityType` (HU2/T-020) | **string** | Confluence v1.10 lo declara como string: "Tipo de la entidad auditada (cualquier documento curricular u objeto de apoyo)". Coherente con la decision PM Esteban 2026-05-13 ("plano") |

**Implicancia operativa clave**: la asimetria es intencional. El `scopeType` enum bloquea la **definicion del flujo** (acto raro), pero los `entityType` string permiten el **registro historico** (acto frecuente) sin requerir migracion previa. Un mod nuevo (ej: uBooking) puede escribir entries de transitionHistory y changeLog desde el dia uno aunque el enum scopeType aun no incluya su tipo — la inconsistencia solo afecta crear el workflow, no registrar lo que paso.

**Cambio respecto a Session 2**: la Decision matrix de Session 2 marca `workflow.scopeType` como "string libre" — quedaba como decision propia del dev (H4) sin respaldo de Esteban. Tras revisar la doc canonica (Confluence v1.10 ya lista explicitamente `scopeType | enum`), la decision se **revierte a enum** alineada con la pagina oficial. La fila correspondiente queda **superada** por la decision matrix de Session 3.

#### Constraints adicionales detectados en Confluence (a documentar en el design)

- `workflow.name` es **unique por `(institutionId, scopeType)`** — no solo por institutionId.
- `workflowTransition.name` es **unique por `(workflowId, fromStatusId, toStatusId)`**.
- `workflowStatus.name` es **unique por institutionId** (ademas del unique `code`).
- Workflow pasa a `Active` al primer consumidor y se **congela** (no se puede editar). Decision pendiente: ¿los 5 workflows del seed UPU se entregan en `Active` o `Draft`?

#### Cambios no aplicables a TICKET-018 (pero documentados para context)

- Confluence agrega `booking` al enum `scopeType` (workflow) — para uBooking. El seed UPU no incluye booking. ~~La hipotesis H4 ya recomienda **string libre** para scopeType, asi que el `booking` futuro entra sin migracion.~~ **Update 2026-05-13 (Session 3)**: Confluence v1.10 declara explicitamente `scopeType | enum` (no string). Asimetria intencional con `workflowTransitionHistory.entityType | string`. Ver Ajuste E. H4 superada.

#### Findings colaterales fuera de scope de HU3

- **Curricular objects desfasados vs Confluence v1.10** (TICKET-006 ya cerrado):
  - `curricularSection.ownerType` local: `["AcademicActivity","Offering"]` PascalCase. Confluence: `activity / offering / curriculumPlan` camelCase. Falta `curriculumPlan` y casing inconsistente.
  - `curricularSection.sectionType` local: `["STRUCTURAL","COMPLEMENTARY"]` UPPER_SNAKE. Confluence: `Structural / Complementary` PascalCase.
  - `curricularLink.linkType` local: `["DEVELOPS","EVALUATES","COVERS","USES","CUSTOM"]` UPPER_SNAKE. Confluence: `Develops/Evaluates/Covers/Uses/Custom` PascalCase.
  - **No bloquea HU3.** Vale agendar como ticket de homologacion separado si se decide alinear casing (migracion de datos requerida).

- **Findings estructurales adicionales detectados 2026-05-13** (extraccion estructural completa de Confluence v1.10):

  1. **`AcademicActivity.previousVersionId` sin `isForeignKey` declarado** (codigo) vs `previousVersionId: UUID? FK → activity` (Confluence). En `mods/curriculum-design/objects/AcademicActivity.json` el campo es `type: string` sin `isForeignKey`/`references`. El codegen no genera FK constraint en BD — pierde integridad referencial. **No bloquea HU3**; puede arreglarse en TICKET-019 (HU4) cuando se toque el rename, o como ticket de homologacion separado. Bajo costo: agregar `isForeignKey: true, references: "activity"` (post-rename) o `"AcademicActivity"` (pre-rename) al JSON definition.

  2. **`curricularSection.description` faltante en codigo** vs `description: string?, No (opcional)` en Confluence. El campo no existe en `mods/curriculum-design/objects/CurricularSection.json`. **No bloquea HU3**; bajo costo agregarlo en homologacion (es campo opcional sin migracion).

  3. **Defaults boolean como string en CurricularSection**: `isSynchronizable`, `isVisible`, `isRequired` declaran `"static_default": "true"` o `"false"` como **string**, no como boolean. Confluence los define como boolean con default boolean. **Posible bug de codegen** — verificar como Prisma interpreta el string default. Si el codegen lo trata literal, el valor inicial sera el texto `"true"` y no el boolean `true` (rompe queries por igualdad). **Falta validar**: probar el JSON definition contra una instancia recien creada en UPU sandbox para confirmar el comportamiento.

  Estos 3 findings no bloquean HU3 (objetos workflow son nuevos, los curriculares son pre-existentes). Conviene agruparlos en un ticket de homologacion junto con el casing inconsistente del bullet anterior.

- **`activity.purpose` nuevo campo opcional en Confluence v1.10** (`Academic/Formative/Service/Extracurricular`). No esta en local ni en TICKET-019. Bajo impacto. Decision: ¿agregar en TICKET-019 como parte del rename, o postergar?

- **`activity.executionUnitId` segun Confluence es required**, pero local lo dejo nullable (DECISION-002). Divergencia pre-existente conocida, no cambia con v1.10.

- **`changeLog` model (TICKET-020) y los 4 objetos workflow estructura general** estan **alineados con Confluence sin diferencias materiales**.

- **Inconsistencia detectada en Confluence**: el "Resumen por estado" arriba de la pagina dice "Implementado: 0", pero la tabla general muestra 6 objetos como Implementado. Probable bug de edicion en la pagina (v14, editada 2026-05-12). Vale reportar a Esteban Cortes (PM).

#### Decisiones pendientes del dev para cerrar el intake

1. **¿Incorporar ajustes A/B/C/D/E al JSON definition de TICKET-018?** Recomendacion: **Si para A/B/C/D** (requisitos explicitos de Confluence v1.10), **Si tentativo para E** (string libre para `scopeType`/`entityType`) sujeto a confirmacion del PM. Implementar sin A/B/C/D genera regresion al alinear con la pagina canonica.

2. **¿Los 5 workflows del seed UPU se entregan con `workflow.status: Active` o `Draft`?**  (campo agregado por Ajuste D)
   - `Active` (recomendado): listos para consumir desde el dia uno por HU4. El workflow queda congelado — coherente con el seed canonico UPU.
   - `Draft`: permite ajustes finos antes de habilitar — pero implica que HU4 (o un setup posterior) los activa explicitamente.

3. **¿Abrir ticket de homologacion para curriculares?** Agruparia: casing (`ownerType/sectionType/linkType`), `previousVersionId` sin FK, `curricularSection.description` faltante, defaults boolean como string. Recomendacion: separado de HU3, despues de SP2.

4. **¿Incluir `activity.purpose` en TICKET-019?** Bajo costo, alta alineacion con Confluence — recomendacion: si.

5. **¿Confirmar con PM la lectura "string libre" para `workflow.scopeType` y `workflowTransitionHistory.entityType`?** (Ajuste E). La respuesta de Esteban del 2026-05-13 cubrio `workflowStatus.status` y `workflowStatus.category` pero NO `scopeType`. Recomendacion: incluir en el mismo mensaje de confirmacion de nomenclatura.

**Estado del intake**: en curso. A la espera de decisiones 1-4 para cerrar el intake y pasar a design-feature con el spec definitivo.

### Session 2 — Respuestas del PM a open questions (2026-05-13)

**Objetivo**: capturar respuestas de Esteban Cortes Sandoval (PM) sobre dos open questions trazadas en sessions anteriores. Avanza el cierre del intake del ticket.

**Fuente de las respuestas**: Slack, mensajes de Esteban Cortes Sandoval del 2026-05-13.

**Discoveries cronologicos:**

9. **2026-05-13 — PM se inclina por `enum` para `status` y `category` del workflow**
   - Cita verbatim de Esteban (Slack, 2026-05-13): *"sobre tu duda de si usar un string o un enum para los campos `workflow.status` y `workflow.category`, no tengo una justificacion tecnica pero mi 'guata' me dice que deberian ser enum, solo porque son categorias pre definidas y para las cuales espero que en algun punto hayan funcionalidades/reglas que dependan de ellas, pero acepto argumentos para convencerme de lo contrario"*.
   - **Aclaracion de nomenclatura (importante)**: los nombres `workflow.status` y `workflow.category` que cita Esteban no coinciden literal con el modelo Confluence v1.10. La interpretacion mas razonable es:
     - `workflow.status` → **`workflowStatus.status`** (enum `Active/Archived`, soft-delete del catalogo de statuses)
     - `workflow.category` → **`workflowStatus.category`** (enum `ToDo/InExecution/InReview/Published/Closed`, abstraccion transversal para metricas)
   - El campo `workflow.scopeType` (activity/curriculumPlan/competencyNode/changeRequest/booking) tambien fue evaluado en H4 como candidato a string libre — y Confluence v1.10 agrega `booking` al enum, lo que refuerza string libre para `scopeType` (evita migracion al sumar el proximo consumer).
   - **Resolucion provisional para el design**:
     - `workflowStatus.status` → **enum** (Active/Archived) — set cerrado, no extensible por institucion.
     - `workflowStatus.category` → **enum** (5 valores fijos por Confluence v1.10) — abstraccion transversal con semantica fija.
     - `workflow.scopeType` → **string libre** (decision separada, no cubierta por la respuesta de Esteban; mantener H4 hasta que el PM diga lo contrario).
   - **Update a Risk R2**: parcialmente resuelto. `category` y `status` van como enum. `scopeType` permanece como string libre.
   - **Validacion pendiente en design-feature**: confirmar con el PM que la interpretacion de nombres (`workflow.status` → `workflowStatus.status`, `workflow.category` → `workflowStatus.category`) es correcta antes de generar JSONs.

**Decision matrix:**

| Campo | Tipo decidido | Set de valores | Justificacion |
|-------|---------------|----------------|---------------|
| `workflowStatus.status` | enum | `Active`, `Archived` | Set cerrado, soft-delete del catalogo. Respaldo del PM (Slack 2026-05-13). |
| `workflowStatus.category` | enum | `ToDo`, `InExecution`, `InReview`, `Published`, `Closed` | 5 valores fijos por Confluence v1.10. Respaldo del PM (Slack 2026-05-13). |
| `workflow.scopeType` | string libre | `activity`, `curriculumPlan`, `competencyNode`, `changeRequest`, `booking`, ... | Extensible sin migracion; Confluence v1.10 ya agrego `booking`. Decision propia (H4) — no contradice respuesta del PM. |

**Estado del intake**: avanza. Quedan pendientes las decisiones 2-4 (workflows seed `Active` vs `Draft`, ticket de homologacion casing, `activity.purpose` en TICKET-019).

#### Decisiones confirmadas por el dev (Eduardo Bacon, 2026-05-13)

**Decision #1 (nomenclatura — Ajuste de Session 2)**
- Confirmado: lo que Esteban escribio (`workflow.status`, `workflow.category`) fue **typo**. Los campos reales son `workflowStatus.status` (Active/Archived) y `workflowStatus.category` (5 valores). La interpretacion de Session 2 queda **validada**, no provisional.
- "Validacion pendiente en design-feature" registrada en Session 2 punto 9 → **resuelta 2026-05-13**.

**Decision #2 (seed UPU — campo `workflow.status` del Ajuste D)**
- Confirmado: los 5 workflows del seed UPU se entregan en **`status: Draft`**.
- Implicancia: HU4 (TICKET-019) NO puede asumir que los workflows estan listos para uso inmediato — debe haber un paso explicito (manual en UPU, o en el setup de HU4) para activarlos. Documentar en el seed README y en HU4.
- Implicancia adicional: el campo `currentStatusId` de las activity migradas en HU4 puede setearse aunque el workflow este Draft (es FK al workflowStatus, no al workflow.status). La activacion del workflow solo bloquea ejecutar transiciones nuevas. Verificar este punto con PM en design-feature.

**Decision #4 (`activity.purpose` en TICKET-019)**
- Confirmado: incluir el campo en HU4 (TICKET-019) como parte del rename + reestructura de activity.
- A registrar en el ticket de HU4 cuando se haga su intake.

**Decision #5 (Ajuste E — `scopeType`/`entityType` enum-vs-string)**
- **Resuelta 2026-05-13 (Session 3)**: escenario hibrido enum/string segun Confluence v1.10 literal. `workflow.scopeType` enum + `workflowTransitionHistory.entityType` string + `changeLog.entityType` string. Ver Session 3 con citas verbatim.

**Decision #3 (ticket de homologacion curriculares)**
- Pendiente. Se aborda despues de SP2 — no bloquea HU3.

### Session 3 — Resolucion del Ajuste E con respaldo de Confluence v1.10 (2026-05-13)

**Objetivo**: cerrar la decision tecnica E (escenario enum-vs-string para los campos polimorficos `workflow.scopeType`, `workflowTransitionHistory.entityType`, `changeLog.entityType`). El dev pidio contexto, comparativa y efectos antes de decidir. La revision de Confluence v1.10 revelo que la doc canonica ya define el escenario hibrido explicito — la decision se reduce a respetarla.

**Fuente**: Confluence "Modelo de objetos de negocio Learning Assurance" (page/2038366242, v1.10, version 14 — editada 2026-05-12).

**Discovery cronologico:**

10. **2026-05-13 — Confluence v1.10 declara explicitamente enum/string asimetricos** (NO ambos como enum, NO ambos como string)

    Citas verbatim de la pagina:

    - **`workflow.scopeType`**:
      > `scopeType` | enum | Si | Tipo de objeto que puede usar el workflow. Valores: `curriculumPlan` / `activity` / `competencyNode` / `changeRequest` / `booking`. **El enum se extiende cuando una nueva app uP1 se suma al patron**.

      Decision de diseno explicita del objeto workflow: *"Un unico `scopeType` por workflow. [...] Para cubrir nuevos tipos se extiende el enum y se crean workflows dedicados."*

    - **`workflowTransitionHistory.entityType`**:
      > `entityType` | string | Si | Discriminador polimorfico. Valores: `curriculumPlan` / `activity` / `competencyNode` / `changeRequest` / `booking` (extiende con consumidores).

      Decision de diseno explicita del objeto workflowTransitionHistory: *"Polimorfico `entityType` + `entityId`. Conjunto abierto de consumidores (LA hoy, uBooking manana, mas despues). Una FK polimorfica evita una columna por consumidor."*

    - **`changeLog.entityType`** (HU2/T-020):
      > `entityType` | string | Si | Tipo de la entidad auditada (cualquier documento curricular u objeto de apoyo).

    Conclusion: la asimetria **no es invencion local** — Confluence la disena intencional. `scopeType` enum bloquea la **definicion del flujo** (acto raro, justifica migracion controlada); `entityType` string permite el **registro historico** (acto frecuente, no debe bloquearse por falta de migracion).

**Decision matrix final (supera la matrix tentativa de Session 2):**

| Campo | Tipo decidido | Set de valores conocidos | Mecanismo de extension | Justificacion (Confluence v1.10) |
|-------|---------------|--------------------------|------------------------|----------------------------------|
| `workflowStatus.status` | enum | `Active`, `Archived` | sistema (cambio raro de modelo) | Cita: enum, set cerrado fijo |
| `workflowStatus.category` | enum | `ToDo`, `InExecution`, `InReview`, `Published`, `Closed` | sistema (raro, v1.9→v1.10 agrego `InReview`) | Cita: enum, 5 valores transversales |
| `workflow.status` | enum | `Draft`, `Active`, `Archived` | sistema (cambio raro de modelo) | Cita: enum, ciclo de vida del workflow |
| `workflow.scopeType` | **enum** | `curriculumPlan`, `activity`, `competencyNode`, `changeRequest`, `booking` | "Extender enum cuando nueva app uP1 se suma" | Cita verbatim: `enum`. Decision de diseno explicita |
| `workflowTransitionHistory.entityType` | **string** | mismo set, "extiende con consumidores" | runtime (string libre + validacion soft opcional) | Cita verbatim: `string`. "Conjunto abierto de consumidores" |
| `changeLog.entityType` | **string** | `activity`, `curricularSection`, `curricularLink`, ... | runtime (cualquier objeto auditable) | Cita verbatim: `string`. "cualquier documento curricular u objeto de apoyo" |

**Impacto en H4 del Triage**

La hipotesis H4 ("`scopeType` extensible sin migracion manual = string libre") queda **parcialmente superada**. Era correcta en cuanto a la **necesidad de extensibilidad**, pero el mecanismo elegido por Confluence es enum + migracion controlada (no string libre). H4 se cierra: contradicha por evidencia documental directa (Confluence v1.10 dice `scopeType | enum` literal).

**Convencion de naming obligatoria (para evitar divergencia operacional)**

- Todos los valores se escriben en **camelCase** literal: `activity`, `curriculumPlan`, `competencyNode`, `changeRequest`, `booking`.
- Los tres campos (`scopeType`, `workflowTransitionHistory.entityType`, `changeLog.entityType`) usan la misma representacion para el mismo tipo de objeto.
- Cuando un objeto esta en los tres sets simultaneamente (ej. `activity`), los tres campos contienen el mismo string literal.
- A documentar en el README del seed UPU + en `mods/curriculum-design/docs/`.

**Sincronizacion automatica obligatoria (worker de changeLog)**

Para action=`StateTransition`, el worker que escribe `changeLog` **debe copiar `entityType` desde la fila linkeada de `workflowTransitionHistory`** (via `workflowTransitionHistoryId`), no del payload del evento. Garantiza coherencia entre las dos tablas sin depender de la convencion. Pseudo-codigo:

```js
// En el worker, para action="StateTransition":
const wth = await prisma.workflowTransitionHistory.findUnique({
  where: { id: payload.workflowTransitionHistoryId }
});
await prisma.changeLog.create({
  data: {
    entityType: wth.entityType,    // ← copia desde wth, no del evento
    entityId: wth.entityId,
    workflowTransitionHistoryId: wth.id,
    action: "StateTransition",
    source: "Workflow",
    // ...
  }
});
```

**Costo estimado adicional**: ~0.25-0.5 SP sobre la estimacion original (codigo en el worker de changeLog + tests E2E + doc de convencion). Va dentro del budget de HU2/HU3.

**Risk R2 actualizado**: resuelto totalmente. Todos los campos enum/string del modelo workflow tienen decision tomada con respaldo documental.

**Estado del intake post-Session 3**: las decisiones 1, 2, 4, 5 estan resueltas. Decision 3 (ticket de homologacion curriculares) pendiente pero NO bloquea — se aborda post-SP2. Quedan los detalles operativos del seed (Session 4) antes de cerrar el intake completo.

### Session 4 — Diseño del seed UPU (datos y entidades demo) (2026-05-13)

**Objetivo**: definir los detalles operativos del seed UPU para HU3 que quedaron sin resolver tras Session 1/2/3: estado inicial de las activities legacy post-HU4, las 5 entries demo de workflowTransitionHistory, y la coordinacion con HU2/HU4 para datos reales.

**Fuente**: discusion con el dev (Eduardo Bacon) sobre coordinacion entre HU3, HU4 y HU2 al revisar el seed existente de SP1 (`mods/curriculum-design/seed/_data-univalle.js`, `_data-aiep.js`).

**Discoveries cronologicos:**

11. **2026-05-13 — Seed UPU actual tiene 2 activities reales con `workflowState='Approved'`**
   - Fuente: codigo `mods/curriculum-design/seed/_data-univalle.js` (activity Univalle "Ecuaciones Diferenciales", `aa-uv-1124`, code `111026C`) y `_data-aiep.js` (activity AIEP `TIR101`, "Introduccion a las Redes").
   - Tambien existe CoreUser admin: `admin@uplanner.dev` (en `up1/object-manager/prisma/UPU/seed.js:2986`) — Storybook Admin con full system access. Candidato natural para `workflow.createdBy` y `workflowTransitionHistory.userId`.
   - Implicacion: el seed HU3 NO arranca de cero. Tiene que coordinar con la data legacy + admin user existente.

12. **2026-05-13 — UPU es sandbox de validacion, no produccion fiel**
   - Fuente: DECISION-012 (rollout en 2 fases) + memoria operativa del dev.
   - Implicacion: cambiar el estado inicial de las activities legacy a "Draft / BOR" para sandbox limpio NO falsifica la realidad — UPU es Fase 1 (validacion de modelo + funcionalidad). En Fase 2 (post-SP2) se separaran tenants UNIVALLE/AIEP con data productiva real, donde el mapeo conservador (Approved → PUB) sera relevante.

**Decisiones registradas para HU3 (seed UPU):**

**Decision #6 — Mapeo Approved → BOR (sandbox limpio para SP2)**
- Las 2 activities legacy (`aa-uv-1124` UV + `TIR101` AIEP) actualmente con `workflowState='Approved'` se mapean a `currentStatusId = id del workflowStatus BOR` post-HU4. NO a `PUB` (mapeo conservador descartado).
- **Razon**: UPU es sandbox de validacion (DECISION-012). Arrancar las activities en BOR permite ejercicio completo del flujo end-to-end en HU2 + HU4 (BOR → EDIT → REV-DEC → PUB) durante el smoke del sprint.
- **Donde aplicar**: en **HU4 (TICKET-019)** — modificar el script de migracion de instancias para mapear `Approved → BOR` (en lugar de Approved → PUB). HU3 NO toca las activities legacy. Mantiene ortogonalidad entre tickets.
- **Impacto Fase 2 (post-SP2)**: cuando se separen tenants UNIVALLE/AIEP con data productiva, el script de migracion necesitara logica condicional por tenant (`UPU → BOR`, `UNIVALLE/AIEP → PUB`). Documentar en HU4.

**Decision #7 — 5 entries demo huerfanos en workflowTransitionHistory**
- Los 5 entries del seed apuntan a `entityId` **ficticios** (UUIDs huerfanos — no corresponden a filas reales de las tablas activity / curriculumPlan / changeRequest). Esto es valido tecnicamente porque el polimorfismo abierto (decision L5) no enforza FK en BD.
- **Etiquetado obligatorio para identificacion posterior** (estrategia combinada A + B):
  - `entityId` con prefijo `demo-`: `demo-activity-001`, `demo-curriculumplan-001`, `demo-changerequest-001`.
  - `comment` con prefijo `DEMO:` para visibilidad en UI: `'DEMO: apertura del programa'`, `'DEMO: envio a revision decanato'`, etc.
- **Distribucion polimorfica (cubre 3 entityTypes)**:

| # | entityType | entityId | transition (from→to) | comment |
|---|------------|----------|----------------------|---------|
| 1 | activity | `demo-activity-001` | BOR → EDIT (workflow `activity-standard`) | `DEMO: apertura del programa` |
| 2 | activity | `demo-activity-001` | EDIT → REV-DEC (workflow `activity-standard`) | `DEMO: envio a revision decanato` |
| 3 | curriculumPlan | `demo-curriculumplan-001` | PROP → EVAL (workflow `curriculumPlan-standard`) | `DEMO: propuesta de plan curricular` |
| 4 | curriculumPlan | `demo-curriculumplan-001` | EVAL → APR (workflow `curriculumPlan-standard`) | `DEMO: aprobacion del plan` |
| 5 | changeRequest | `demo-changerequest-001` | BOR → EDIT (workflow `changeRequest-standard`) | `DEMO: change request en edicion` |

- Todos con `userId = admin@uplanner.dev` y `requiresComment` segun la transicion del workflow correspondiente.

**Decision #8 — Sirven como referencia ilustrativa para HU2 y HU4**
- **HU2 (TICKET-020 — vista tab Historial)**: los entries demo permiten validar shape + layout + filtro polimorfico (`entityType + entityId`) ANTES de que existan entries reales generados por runtime. Sirven como fixture para smoke + tests E2E de la vista.
- **HU4 (TICKET-019 — smoke)**: al ejecutar las primeras transiciones reales (post-activacion de workflows), los entries generados se renderizan junto a los demo en la vista. Sirven como **plantilla visual** para verificar que entries reales tienen el shape correcto.

**Decision #9 — Coexistencia y cleanup posterior**
- Los 5 demo **coexisten** con entries reales que generen HU4 (smoke) y HU2 (auditoria runtime).
- En SP2 NO se eliminan — sirven de red de seguridad durante el smoke.
- **Backlog para SP3 (post-SP2)**: item "Cleanup entries demo de workflowTransitionHistory (HU3)" — script trivial `DELETE FROM workflowTransitionHistory WHERE entityId LIKE 'demo-%'`. Priority: `should`. NO bloqueante.

**Decision #10 — HU4 ejecuta 2-3 transiciones reales en smoke**
- Como parte del closing de HU4 (TICKET-019), ejecutar 2-3 transiciones runtime sobre las activities reales para generar entries iniciales en workflowTransitionHistory:
  - `aa-uv-1124` (UV): BOR → EDIT (validar resolver de transicion + worker)
  - `TIR101` (AIEP): BOR → EDIT (segunda activity, segundo workflow `activity-fast`)
- Resultado esperado: ~5 demos huerfanos + ~2 entries reales sobre `aa-uv-1124`/`TIR101` en la BD post-HU4. La vista (HU2) los renderiza a todos.

**Resumen ejecutivo del seed UPU final para HU3:**

| Recurso | Cantidad | Notas |
|---------|---------:|-------|
| Statuses | 9 | con codigo + nombre + category + status=Active |
| Workflows | 5 | con scopeType + isDefault + status=Draft (decision L9) |
| Transitions | 21 | distribuidas en los 5 workflows (names UI + requiresComment quedan para design-draft) |
| History demo | 5 | huerfanos con entityId `demo-*` + comment `DEMO:` |
| createdBy / userId | 1 user | `admin@uplanner.dev` para todos los workflows y history |

**Estado del intake**: cerrado tras Session 4. Todas las decisiones operativas del seed UPU resueltas. Quedan pendientes solo los **names UI + requiresComment de las 21 transiciones**, que se resuelven en `design-draft` (DET-18) con la propuesta concreta + tu review.

**Gate decision:**
- [x] continue → Session 5 (S5 del plan execute — smoke boolean defaults)

Intake completo: 5 sessions de pre-execute (Session 0..4), 5 decisiones criticas (#1-#5 + #6-#10), draft v1 aprobado, spec SPEC-003-workflow-platform generado y aprobado, plan de sessions S5-S9 listo. Siguiente paso: `request-execute`.

### Session 5 — 2026-05-13 — Smoke boolean defaults (S5 del plan)

**Tipo:** ⚑ fuerte
**Validation tier:** T1
**Quality review tier (DET-23):** light (dims 1, 7 mandatorias; dims 2, 3 si toca codigo)
**Branch:** `UPONE-1099-workflow-objects` (mods/curriculum-design)

**Objetivo**: validar empirico si el codegen UP1 acepta `static_default` boolean **literal** (`true`/`false`) en JSON object definitions, o si requiere strings (`"true"`/`"false"`) como en el codigo legacy del mod (hallazgo H6 del intake). El resultado determina el formato de los 4 JSONs reales de HU3 (S6.T1..T4).

**Session log:**

| Timestamp | Agent | Accion | Referencia | Detalle |
|-----------|-------|--------|------------|---------|
| 2026-05-13 | researcher | discovery | `up1/object-manager/objects/business/Base/` | 10+ archivos base usan `static_default` como **string** (`"true"`/`"false"`). Ejemplos: `service.json:97`, `event.json:100`, `curricularsection.json:86-100`, `institution.json:66`. Convencion del codebase UP1 = string |
| 2026-05-13 | researcher | discovery | `mods/curriculum-design/objects/CurricularSection.json` | 3 casos con `static_default: "true"` / `"false"` (string). Confirma convencion en el propio mod |
| 2026-05-13 | researcher | discovery | `up1/object-manager/src/services/codegen/generatePrismaSchema.js:326-330` | Codigo del codegen acepta **AMBOS formatos** para Boolean: `typeof fieldDef.static_default === 'string' ? .toLowerCase() === 'true' : !!fieldDef.static_default`. Output Prisma: `@default(true)` o `@default(false)` (literal) — el codegen normaliza string a boolean en el output |
| 2026-05-13 | developer | decision | S5.T2 | **Usar strings `"true"`/`"false"` en los 4 JSONs de HU3** para paridad con codebase. Ambos formatos funcionan en codegen — la diferencia es estilistica. La convencion del codigo UP1 prevalece por DET-11 (KB-first) y RULE-mods-026 (consistency con patron del codebase) |
| 2026-05-13 | developer | skip | S5.T1 (smoke runtime) | NO se crea `_smoke.json` ni se ejecuta `npm run codegen` runtime. La evidencia documental + inspeccion del codigo del codegen es suficiente (DET-5: verificacion multi-capa = doc + codigo). Ahorra ~5-10 min de setup + posibles side effects |
| 2026-05-13 | scribe | update | tickets/ticket-018.draft/data-model-jsons.md | Pendiente: cambiar la "Nota sobre defaults boolean" del draft v1 — eliminar la opcion "literales" y dejar `"true"`/`"false"` strings como unica opcion. (Action item para S5.GATE) |

**Tasks de la session**:

| Task | Status | Resultado |
|------|--------|-----------|
| S5.T1 — Smoke test codegen con boolean literal | done (skipped runtime) | Evidencia documental + codigo del codegen confirma que ambos formatos funcionan. NO se ejecuto smoke runtime |
| S5.T2 — Decision formato boolean | done | Usar **strings** `"true"`/`"false"` en los 4 JSONs (paridad con codebase, RULE-mods-026) |

**Discoveries / Learns nuevos:**

- **L1 (raw)**: `static_default` en JSON object definitions UP1 acepta tanto string como literal — el codegen normaliza. La convencion del codebase es string. **Detected by**: researcher. **Promotion candidate**: posible RULE-mods-XXX si se confirma transversal a otros mods.
- **L2 (raw)**: la consulta del finding H6 (intake Sessions 1+) era preocupacion incorrecta — los strings funcionan perfectamente y son la convencion. No hay bug en codegen, solo divergencia de estilo en mi draft v1 (propuso literales en `data-model-jsons.md` lineas 30-40, contradice codebase). **Detected by**: passive (analisis del codigo). **Promotion candidate**: no, es decision local del sprint.

**Failed approaches:**
- Ninguno.

**Bloqueantes detectados:**
- Ninguno.

**Tiempo invertido:** ~10 min (research documental + inspeccion codegen).

**Pre-condiciones para Session 6:**
- Actualizar `data-model-jsons.md` del draft con la decision: `static_default` siempre como string. (Sub-task pendiente en S5.GATE).

**Quality review (DET-23 light):**

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | n/a | Sin codigo escrito (smoke runtime saltado, decision documental) |
| 2 | Lint | n/a | Sin codigo TS/JS tocado |
| 3 | Tipado | n/a | Sin TS tocado |
| 4 | Testing | n/a | Sin tests escritos en esta session |
| 5 | Escalabilidad | n/a | Sin logica nueva |
| 6 | Mantenibilidad | n/a | Sin codigo reutilizable |
| 7 | Claridad | **pass** | Session log documenta: lugares grep'eados, lineas exactas del codigo del codegen, razon de la decision, razon del skip del smoke runtime. Cualquier dev futuro entiende por que se eligio string |
| 8 | Accesibilidad | n/a | Backend research |
| 9 | Storybook | n/a | Sin componentes |
| 10 | Error handling | n/a | Sin codigo nuevo |

**Resultado global**: pass. Decision: continue.

**Gate decision:**
- [x] continue → Session 6 (S6 del plan — 4 JSONs object definitions + codegen)

Decision documentada con evidencia (codigo del codegen + 10+ archivos base + 3 archivos del mod). Listo para S6 con formato boolean confirmado como string. Action item pendiente en pre-condiciones de S6: actualizar draft v1 `data-model-jsons.md` para reflejar la decision.

### Session 6 — 2026-05-13 — Los 4 JSONs object definitions + codegen (S6 del plan)

**Tipo:** auto
**Validation tier:** T1
**Quality review tier (DET-23):** light (dims 1, 7 mandatorias; dims 2, 3, 4, 5, 6, 8, 9, 10 evaluadas como `n/a` — sin codigo TS/JS, sin tests, sin UI)
**Branch:** `UPONE-1099-workflow-objects` (mods/curriculum-design)

**Objetivo**: crear los 4 JSON object definitions de la capa transversal workflow + ejecutar `npm run sync` para propagar al core + verificar que el codegen genera `schema.prisma` correctamente (4 modelos + 4 enums + indexes).

**Session log:**

| Timestamp | Agent | Accion | Referencia | Detalle |
|-----------|-------|--------|------------|---------|
| 2026-05-13 | developer | create | `mods/curriculum-design/objects/workflowStatus.json` | 7 campos: institutionId FK Institution, code, name, category enum 5, description?, status enum 2 (Active/Archived). uniqueConstraints (institutionId+code, institutionId+name). 2 indexes |
| 2026-05-13 | developer | create | `mods/curriculum-design/objects/workflow.json` | 9 campos (post-rename status→lifecycle): institutionId, name, description?, scopeType enum 5 cerrado, isDefault, lifecycle enum 3, createdBy integer FK core_User. uniqueConstraints. 2 indexes |
| 2026-05-13 | developer | create | `mods/curriculum-design/objects/workflowTransition.json` | 5 campos: workflowId, fromStatusId, toStatusId, name, requiresComment. 3 FKs + unique compuesto |
| 2026-05-13 | developer | create | `mods/curriculum-design/objects/workflowTransitionHistory.json` | 5 campos polimorficos: entityType string sin FK (abierto), entityId, transitionId FK, userId integer FK core_User, comment?. 3 indexes incluido (entityType, entityId) |
| 2026-05-13 | developer | execute | `cd up1/ && npm run sync` (intento 1) | **FALLA**: 4 errores Prisma (a) colision model workflowStatus vs enum auto-generado, (b) `Type "CoreUser" is neither a built-in type` x2, (c) `@default(Draft)` en relation field |
| 2026-05-13 | developer | discovery | `up1/object-manager/src/services/codegen/generatePrismaSchema.js:926` | Codegen genera nombres de enum como `${objectType}${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`. Para `workflow.status` → enum `workflowStatus` que **colisiona** con el modelo workflowStatus. Hardcoded, sin custom enum names |
| 2026-05-13 | developer | discovery | `up1/object-manager/objects/business/Base/attendance.json` + otros | FKs a `core_User` usan **`"type": "integer"`** (no string). El modelo `core_User` tiene `id Int @id @default(autoincrement())` segun convencion UP1 (codegen `generateExtendedModel`: `core_*` → Int, otros → String cuid) |
| 2026-05-13 | developer | fix #1 | `workflow.json` | Renombrar campo `status` → `lifecycle` para evitar colision con modelo workflowStatus. Enum generado: `workflowLifecycle` (no colisiona) |
| 2026-05-13 | developer | fix #2 | `workflow.json`, `workflowTransitionHistory.json` | Cambiar `references: "CoreUser"` → `"core_User"` + `"type": "string"` → `"integer"` en `createdBy` y `userId`. Tipo coincide con `core_User.id Int` |
| 2026-05-13 | developer | execute | `npm run sync` (intento 2) | **FALLA aun**: 2 errores. El sync UP1 hace merge **append-only** (RULE-mods-017) — agrego `lifecycle` al core pero NO elimino el `status` viejo. Quedaron AMBOS campos en `business/Base/workflow.json`. Tambien quedaron campos viejos con `String` vs nuevos con `Int` (mismatch) |
| 2026-05-13 | developer | cleanup | `up1/object-manager/objects/business/Base/workflow.json`, `workflowtransitionhistory.json` | Borrar archivos del core (solo workflow.json + workflowTransitionHistory.json — los otros 2 estaban consistentes) para forzar re-sync limpio sin merge incremental |
| 2026-05-13 | developer | execute | `npm run sync` (intento 3 — limpio) | **EXITO**: `Total: 3 \| Success: 3 \| Failed: 0`. 4 modelos workflow* + 4 enums (workflowScopeType, workflowLifecycle, workflowStatusCategory, workflowStatusStatus) generados sin errores. Drift check 0 (no drift) |
| 2026-05-13 | reviewer | verify | `up1/object-manager/prisma/BASEMODEL/schema.prisma` | Modelos: workflow, workflowStatus, workflowTransition, workflowTransitionHistory ✓. Enums: workflowScopeType (5), workflowLifecycle (3), workflowStatusCategory (5), workflowStatusStatus (2) ✓. Total: 4 modelos + 4 enums ✓ |

**Adaptaciones tecnicas al modelo Confluence v1.10 (decisiones nuevas):**

| # | Cambio | Justificacion | Aplica a |
|---|--------|---------------|----------|
| **DEC-LOCAL-04** | Campo `workflow.status` (enum Draft/Active/Archived) **renombrado a `workflow.lifecycle`** | Codegen UP1 hardcoded genera enum como `{objectType}{FieldNameCapitalized}` (line 926 generatePrismaSchema.js). `workflow.status` → enum `workflowStatus` que **colisiona con el modelo workflowStatus**. Renombrar el campo evita colision sin tocar el modelo canonico. Semantica preservada (ciclo de vida) | SPEC-003 (a actualizar), snapshot-sp2 L3 (a anotar) |
| **DEC-LOCAL-05** | FKs a `core_User` (`workflow.createdBy`, `workflowTransitionHistory.userId`) usan **`type: integer`** en lugar de UUID/string | Modelo `core_User` UP1 tiene `id: Int @id @default(autoincrement())`. Convencion del codebase: modelos `core_*` siempre Int, business models cuid String. La FK debe matchear el tipo del referenciado. Diferencia con Confluence v1.10 que dice UUID — adaptacion al codebase | SPEC-003 (a actualizar), snapshot-sp2 (a anotar) |

**Discoveries / Learns nuevos:**

- **L3 (raw)**: codegen UP1 (`generatePrismaSchema.js:926`) genera nombres de enum de forma hardcoded como `{objectType}{FieldNameCapitalized}`. Sin custom enum names. Si hay colision con un modelo existente, falla validacion Prisma. **Mitigacion**: nunca usar campos enum cuyo nombre concatenado colisione con otros objetos del modelo. **Detected by**: developer. **Promotion candidate**: RULE-core-XXX (patron del codegen UP1) — futura.
- **L4 (raw)**: sync UP1 hace merge **append-only** (RULE-mods-017) — campos eliminados del JSON del mod NO se quitan del core post-sync. Workaround: borrar el archivo en core y re-syncing. **Detected by**: developer. **Promotion candidate**: ya documentado en RULE-mods-017, agregar nota de workaround.
- **L5 (raw)**: FKs a modelos `core_*` siempre `type: integer` en JSON UP1 (id es Int autoincrement). FKs a modelos business usan `type: string` (id es cuid). **Detected by**: developer. **Promotion candidate**: RULE-core-XXX o anexo a RULE-mods-008.

**Failed approaches:**

- **FA-1**: Intento 1 de sync con `workflow.status` (segun Confluence v1.10 literal) + `references: "CoreUser"`. Fallo con 4 errores Prisma. **Aprendizaje**: la nomenclatura canonica de Confluence no siempre traduce 1:1 al codegen UP1; hay que validar contra convenciones del codebase.
- **FA-2**: Intento 2 de sync con `lifecycle` + `core_User` pero SIN borrar `business/Base/workflow.json` viejo. Fallo con 2 errores residuales (merge incremental dejo el `status` antiguo + tipos String inconsistentes). **Aprendizaje**: sync UP1 es append-only — cleanup manual del core requerido para renames/retypes.

**Bloqueantes detectados:** ninguno.

**Tiempo invertido**: ~45 min (3 iteraciones de sync + 2 cleanups + investigacion del codegen).

**Tasks de la session**:

| Task | Status | Resultado |
|------|--------|-----------|
| S6.T1 — Crear workflowStatus.json | done | 7 campos correctos, pass codegen |
| S6.T2 — Crear workflow.json | done (2 iteraciones) | 9 campos (status→lifecycle aplicado, createdBy integer) |
| S6.T3 — Crear workflowTransition.json | done | 5 campos, 3 FKs, sin errores |
| S6.T4 — Crear workflowTransitionHistory.json | done (2 iteraciones) | 5 campos polimorficos (userId integer aplicado) |
| S6.T5 — npm run sync + verificar Prisma | done (3 iteraciones, 1 cleanup) | 4 modelos + 4 enums generados. Drift check 0 |

**Quality review (DET-23 light):**

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | **pass** | 4 JSONs siguen patron UP1 (metadata, properties, required, indexes, uniqueConstraints). Descripciones claras en cada campo. Estructura consistente con archivos legacy del mod |
| 2 | Lint | n/a | Sin codigo TS/JS tocado |
| 3 | Tipado | n/a | JSON puro |
| 4 | Testing | n/a | Tests en S9 |
| 5 | Escalabilidad | n/a | Sin queries/loops |
| 6 | Mantenibilidad | n/a | Cambio puntual aislado por objeto |
| 7 | Claridad | **pass** | Cada decision tecnica documentada en `description` del campo. Adaptaciones (lifecycle, integer) anotadas con razon. Discoveries L3-L5 capturados |
| 8 | Accesibilidad | n/a | Backend declarativo |
| 9 | Storybook | n/a | Sin componentes |
| 10 | Error handling | n/a | Sin codigo nuevo |

**Resultado global**: pass. Decision: continue.

**Gate decision:**
- [x] continue → Session 7 (S7 del plan — resolvers custom + validaciones runtime)

Sync UP1 exitoso post-3-iteraciones. 4 modelos + 4 enums en schema.prisma. Decisiones DEC-LOCAL-04 y DEC-LOCAL-05 a agregar al spec.

### Session 7 — 2026-05-13 — Mutations custom validated + docs PATTERNS (S7 del plan)

**Tipo:** ⚑ fuerte
**Validation tier:** T2
**Quality review tier (DET-23):** standard (dims 1, 2, 3, 6, 7, 10 mandatorias; 4 y 5 `n/a` justificado)
**Branch:** `UPONE-1099-workflow-objects` (mods/curriculum-design)

**Objetivo**: implementar 3 mutations custom validated (`createWorkflowValidated`, `createWorkflowTransitionValidated`, `createWorkflowTransitionHistoryValidated`) en el mod que envuelven validaciones runtime no-Prisma y delegan al CRUD generic. Actualizar `.ai/PATTERNS.md` del mod con la convencion de uso. Ver DEC-LOCAL-06 en SPEC-003 para racional completo.

**Decisiones que enmarcan la session**:
- Patron de mutations custom validated (DEC-LOCAL-06) — decision arquitectonica post-research del codebase
- Naming: sufijo `*Validated` para claridad
- Codigos de error: `WORKFLOW_*` consistentes (DOUBLE_DEFAULT, SELF_TRANSITION, CROSS_INSTITUTION, ARCHIVED, HISTORY_COMMENT_REQUIRED, HISTORY_INVALID_USER, HISTORY_INVALID_TRANSITION, INVALID_CREATOR)

**Session log:**

| Timestamp | Agent | Accion | Referencia | Detalle |
|-----------|-------|--------|------------|---------|
| 2026-05-13 | developer | create | `mods/curriculum-design/logic/workflow.resolver.js` + `workflow.schema.graphql` | Mutation `createWorkflowValidated` con validaciones runtime: partial unique `isDefault` (codigo `WORKFLOW_DOUBLE_DEFAULT`) + `createdBy` existe en `core_User` (`WORKFLOW_INVALID_CREATOR`). Delega a `prisma.workflow.create()` si pasa |
| 2026-05-13 | developer | create | `mods/curriculum-design/logic/workflowTransition.resolver.js` + schema | Mutation `createWorkflowTransitionValidated` con validaciones: `fromStatusId != toStatusId` (`WORKFLOW_SELF_TRANSITION`), `workflow.institutionId == statuses.institutionId` (`WORKFLOW_CROSS_INSTITUTION`), `workflow.lifecycle != Archived` (`WORKFLOW_ARCHIVED`). Tambien valida que `workflowId` + `fromStatusId` + `toStatusId` existan |
| 2026-05-13 | developer | create | `mods/curriculum-design/logic/workflowTransitionHistory.resolver.js` + schema | Mutation `createWorkflowTransitionHistoryValidated` con validaciones: `transitionId` existe (`WORKFLOW_HISTORY_INVALID_TRANSITION`), `userId` existe (`WORKFLOW_HISTORY_INVALID_USER`), `comment` requerido si `transition.requiresComment=true` (`WORKFLOW_HISTORY_COMMENT_REQUIRED`). Append-only: NO se expone update/delete |
| 2026-05-13 | developer | update | `mods/curriculum-design/.ai/PATTERNS.md` | Agregada seccion "Mutations validated vs CRUD generic" — convencion de uso (usar `*Validated` en codigo productivo, generic solo para data trusted), causas (codegen UP1 sin hooks pre-mutation), efectos (data invalida si se usa generic), 10 codigos error consistentes `WORKFLOW_*`, plan futuro (migrar a hooks cuando platform los habilite) |
| 2026-05-13 | developer | execute | `npm run sync:logic --workspace=@uplanner/object-management-backend` | Exit 0. Logic Sync (Phase 4) procesó 3 archivos: 3 created, 0 errors, 0.07s. 3 resolvers + 3 typeDefs copiados a `up1/object-manager/src/graphql/resolvers/mods/curriculum-design/` + `typeDefs/mods.js`. Mutations visibles en mods.js: `createWorkflowValidated`, `createWorkflowTransitionValidated`, `createWorkflowTransitionHistoryValidated` |
| 2026-05-13 | reviewer | verify | `npm run lint` del mod | Exit 0. Sin errores nuevos. Los 3 archivos `*.resolver.js` cumplen la config ESLint del mod |
| 2026-05-13 | reviewer | verify | `npm run typecheck` del mod | 79 errores TS preexistentes en componentes legacy (`BaseCard.vue`, `CalendarEventCard.vue`, `HolidayBanner.vue`, etc.). **Cero errores nuevos** de los 3 archivos `logic/*.resolver.js` (son JavaScript puro). Sin regresion |

**Tasks de la session**:

| Task | Status | Resultado |
|------|--------|-----------|
| S7.T1 — `workflow.resolver.js` + schema con createWorkflowValidated | done | Validaciones partial unique isDefault + createdBy existence |
| S7.T2 — `workflowTransition.resolver.js` + schema con createWorkflowTransitionValidated | done | Validaciones from!=to + same institution + workflow no Archived |
| S7.T3 — `workflowTransitionHistory.resolver.js` + schema con createWorkflowTransitionHistoryValidated | done | Validaciones comment requerido + FK existence. Append-only enforzado por omision de update/delete en typedef |
| S7.T4 — `.ai/PATTERNS.md` con convencion + causas/efectos | done | Seccion "Mutations validated vs CRUD generic" agregada con 10 codigos error documentados |
| S7.T5 — sync:logic + verificacion | done | 3 resolvers + 3 typeDefs en core. Mutations validated visibles en `typeDefs/mods.js`. Sin errores de sync |

**Discoveries / Learns nuevos:**

- **L6 (raw)**: el script `sync:logic` vive en el workspace `@uplanner/object-management-backend`, no en root del monorepo. Para invocarlo desde la raiz UP1 hay que usar `npm run sync:logic --workspace=@uplanner/object-management-backend`. **Detected by**: developer. **Promotion candidate**: anexo a docs operativas del monorepo.
- **L7 (raw)**: `npm run lint` del mod sigue el patron `eslint .` (config local). Los 3 resolvers nuevos en JS puro cumplen lint sin warnings. **Detected by**: developer.
- **L8 (passive)**: el codigo del mod tiene 79 errores TS preexistentes en componentes Vue (no en `logic/`). No bloqueantes para HU3 pero candidato a futuro ticket de homologacion. **Detected by**: passive (al correr typecheck para Quality Review).

**Failed approaches**: ninguno.

**Bloqueantes detectados**: ninguno.

**Tiempo invertido**: ~25 min (3 resolvers + 3 schemas + actualizacion PATTERNS + sync + lint/typecheck).

**Quality review (DET-23 standard):**

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | **pass** | 3 resolvers + 3 schemas. Funciones < 40 lineas. Sin `any`. Codigos error consistentes con prefijo `WORKFLOW_*` (10 codigos documentados). Sin magic strings — todos los codigos via `const ERR = {...}` |
| 2 | Lint | **pass** | `npm run lint` exit 0. Sin errores nuevos |
| 3 | Tipado | **pass** | `npm run typecheck` con 79 errores preexistentes en componentes legacy, **0 errores nuevos de logic/**. Sin regresion |
| 4 | Testing | **n/a** | Tests integration de las mutations validated se hacen en S9 (gate de cierre) |
| 5 | Escalabilidad | **n/a** | Validaciones son lookups simples (`findUnique` + 1 `findFirst`). Sin queries pesadas |
| 6 | Mantenibilidad | **pass** | Cada resolver con su archivo separado. Helper pattern (`const ERR = {...}`) consistente entre los 3. Sin duplicacion |
| 7 | Claridad | **pass** | Cada validacion tiene comentario en espanol explicando el constraint Confluence v1.10 al que responde. Header de cada archivo con convencion del mod + referencia a PATTERNS.md + spec |
| 8 | Accesibilidad | n/a | Backend puro, sin UI |
| 9 | Storybook | n/a | Sin componentes UI |
| 10 | Error handling | **pass** | Errores con codigos `WORKFLOW_*` consistentes. Mensajes user-friendly explicando que viola la regla + como remediar. Sin catch vacios. Todos los throw documentados |

**Resultado global**: pass. Decision: continue.

**Gate decision:**
- [x] continue → Session 8 (S8 del plan — seed UPU completo)

3 mutations validated implementadas + propagadas al core. PATTERNS.md del mod documenta convencion para HU4/HU2/frontend futuros. Tests integration en S9.

### Session 8 — 2026-05-13 — Seed UPU completo (S8 del plan)

**Tipo:** auto
**Validation tier:** T2
**Quality review tier (DET-23):** standard (dims 1, 2, 6, 7, 10 mandatorias; 3, 4, 5 `n/a` justificado — JS sin tipos, tests en S9, sin queries pesadas)
**Branch:** `UPONE-1099-workflow-objects` (mods/curriculum-design)

**Objetivo**: implementar el seed UPU completo en `mods/curriculum-design/seed/_data-workflow-objects.js`: 9 statuses + 5 workflows (lifecycle Draft) + 21 transitions con names UI + 5 history demo huerfanos. Modificar `seed.js` entrypoint para llamar al loader ANTES de Univalle/AIEP (para que las activities futuras puedan referenciar workflows existentes). Idempotencia con `upsert`. Validacion runtime de partial unique `isDefault` y `from!=to` en el codigo del seed (controlado por dev).

**Decisiones que enmarcan la session**:
- L9 del snapshot SP2: workflows en `Draft`
- L13: mapeo Approved → BOR (no aplica en HU3, es HU4)
- L14: 5 demos huerfanos con etiqueta `demo-*` + `comment: DEMO:`
- DEC-LOCAL-06: el seed usa `prisma.workflow.create()` directo (CRUD generic) — el dev controla el codigo y valida antes de insertar (no necesita usar las mutations `*Validated`)

**Session log:**

| Timestamp | Agent | Accion | Referencia | Detalle |
|-----------|-------|--------|------------|---------|
| 2026-05-13 | developer | create | `mods/curriculum-design/seed/_data-workflow-objects.js` | Modulo seed completo (~310 lineas): 4 constantes de data (STATUSES x9, WORKFLOWS x5 Draft, TRANSITIONS x21, HISTORY_DEMOS x5), 2 helpers de validacion runtime (`validatePartialUniqueIsDefault`, `validateNoSelfTransitions`), 4 loaders idempotentes (upsertStatuses, upsertWorkflows, upsertTransitions, upsertHistoryDemos), entrypoint `loadWorkflowObjects(prisma, tenantId)` con pre-condiciones de institucion + admin |
| 2026-05-13 | developer | modify | `mods/curriculum-design/seed/seed.js` | Importar `loadWorkflowObjects` + llamarlo ANTES de Univalle/AIEP. Documentar orden de carga en JSDoc del header. Workflow objects se cargan PRIMERO para que activities/curriculumPlans futuros referencien workflows existentes |
| 2026-05-13 | developer | execute | `npm run sync` (intento 1) | Sync exit 0 PERO seed workflow fallo silenciosamente — no aparecio `✓ Workflow:` en output ni hubo error visible. Cause: precondicion `Institution code='UPU'` no encontrada |
| 2026-05-13 | developer | discovery | BD UPU institutions list | El codigo correcto de la institucion principal en tenant UPU es `UPU-MAIN` (name "uPlanner University"), NO `UPU`. `UPU` es el tenantId del sistema multi-tenant, no una row de institution. Admin user `admin@uplanner.dev` (id=38) si existe |
| 2026-05-13 | developer | fix | `_data-workflow-objects.js` | Cambiar `INSTITUTION_CODE_UPU = 'UPU'` → `'UPU-MAIN'`. Comentario aclaratorio |
| 2026-05-13 | developer | execute | `npm run sync` (intento 2) | Exit 0. Output: `✓ Workflow: institution=qkqn8x2i statuses=9 workflows=5 (Draft) transitions=21 historyDemos=5`. Seguido por `✓ Univalle:`, `✓ AIEP:`, `Done.` |
| 2026-05-13 | reviewer | verify | Query directa BD UPU via Prisma client | Conteos: workflowStatus=9, workflow=5, workflowTransition=21, workflowTransitionHistory=5. Todos correctos |
| 2026-05-13 | reviewer | verify | Idempotencia: ejecutar `loadWorkflowObjects(prisma, 'UPU')` 2da vez manual | Pre y post: {ws:9, wf:5, wt:21, wth:5}. Conteos IDENTICOS. **Idempotencia: PASS** |
| 2026-05-13 | reviewer | verify | `npm run lint` del mod | Exit 0. Sin errores nuevos. `_data-workflow-objects.js` cumple ESLint config del mod |

**Tasks de la session**:

| Task | Status | Resultado |
|------|--------|-----------|
| S8.T1 — Helpers de upsert idempotente con validacion admin/UPU + lookup | done | 4 helpers: upsertStatuses, upsertWorkflows, upsertTransitions, upsertHistoryDemos. Pre-condiciones de institucion + admin validadas. Errores explicitos si faltan |
| S8.T2 — 9 statuses + 5 workflows (Draft) | done | Conteo en BD UPU: 9 statuses + 5 workflows. Todos lifecycle=Draft (L9). Statuses con category enum 5 valores |
| S8.T3 — 21 transitions con names UI + requiresComment | done | 21 transitions en BD: 5 activity-standard + 2 activity-fast + 6 curriculumPlan-standard + 4 competencyNode-standard + 4 changeRequest-standard. Names en castellano. 9 transitions con requiresComment=true |
| S8.T4 — 5 history demo huerfanos | done | 5 entries con entityId `demo-*` + comment `DEMO:`. Distribucion: 2 activity + 2 curriculumPlan + 1 changeRequest |
| S8.T5 — Modificar seed entrypoint (`seed.js`) | done | Llamada a `loadWorkflowObjects` ANTES de UV/AIEP. JSDoc actualizado con orden de carga |

**Discoveries / Learns nuevos:**

- **L9 (raw)**: en tenant UPU el codigo de la institucion principal es `UPU-MAIN`, no `UPU`. `UPU` es el tenantId del sistema multi-tenant (parametro pasado al seed), pero la institucion correspondiente tiene su propio `code` (`UPU-MAIN` para uPlanner University). **Detected by**: developer. **Promotion candidate**: anexar a docs operativas del mod o crear RULE-mods-XXX que aclare la distincion tenantId vs institutionCode.
- **L10 (passive)**: el sync de UP1 NO detiene la ejecucion completa si un seed individual falla silenciosamente — los otros seeds siguen corriendo. Esto significa que un seed roto puede ser invisible en el output del sync si no se monitorea los conteos finales. **Detected by**: passive (cuando el primer sync con `UPU` reporto exit 0 pero los conteos quedaron en 0). **Promotion candidate**: anexo a RULE-mods-017 o RULE-mods-008 sobre validacion post-seed obligatoria.

**Failed approaches:**
- **FA-3**: Primer intento del seed con `INSTITUTION_CODE_UPU = 'UPU'`. Fallo silencioso porque no existe esa institucion en BD (el codigo real es `UPU-MAIN`). Sync exit 0 confundio el diagnostico. **Aprendizaje**: validar conteos en BD post-seed, no solo el exit code del sync.

**Bloqueantes detectados**: ninguno.

**Tiempo invertido**: ~35 min (codigo del seed + entrypoint + 2 iteraciones de sync + verificacion idempotencia + lint).

**Quality review (DET-23 standard):**

| # | Dimension | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad codigo | **pass** | Funciones < 40 lineas. Sin `any`. Sin magic numbers (constantes al inicio). Estructura clara: constantes → helpers validacion → loaders → entrypoint |
| 2 | Lint | **pass** | `npm run lint` exit 0 sin errores nuevos |
| 3 | Tipado | **n/a** | Archivo JS puro (sin TS); convencion del mod para seeds (consistente con `_data-univalle.js` y `_data-aiep.js`) |
| 4 | Testing | **n/a** | Tests E2E del seed se hacen en S9 |
| 5 | Escalabilidad | **n/a** | Seed se ejecuta 1 vez por sync. No hay queries pesadas — upserts secuenciales sobre datasets pequeños (9/5/21/5) |
| 6 | Mantenibilidad | **pass** | Constantes claramente separadas. Helpers reusables. Sin duplicacion con `_data-univalle.js`/`_data-aiep.js` — patron seguido pero codigo independiente porque la naturaleza es distinta |
| 7 | Claridad | **pass** | JSDoc del header explica el proposito + decisiones aplicadas (L9, L13, L14 + DEC-LOCAL-06). Cada helper comentado. Cada error con codigo `WORKFLOW_*` consistente con resolver |
| 8 | Accesibilidad | n/a | Backend, sin UI |
| 9 | Storybook | n/a | Sin componentes |
| 10 | Error handling | **pass** | Pre-condiciones validadas explicito (institucion + admin). Errores con mensaje claro indicando que falta + como remediar. Validacion runtime de partial unique + no self-transition antes de cualquier insert (transaccion atomica via secuencia controlada) |

**Resultado global**: pass. Decision: continue.

**Gate decision:**
- [x] continue → Session 9 (S9 del plan — tests E2E + smoke UPU + docs — gate de cierre del ticket)

Seed UPU completo cargado en BD (9/5/21/5). Idempotencia validada. Lint OK. Siguiente: S9 — tests + docs + smoke manual + cierre.

---

### Session 8.5 — 2026-05-13 — Hardening LLM-guidance: Plan A (defensa en profundidad sin tocar core)

**Objetivo**: a peticion del dev, dejar como regla obligatoria (y visible) que cualquier LLM o consumer use las `*Validated` y NO las mutations CRUD generic auto-generadas para los 4 objetos workflow. Sin coordinacion con platform team (out of mod scope) — todo dentro del mod + DKC.

**Tier de validacion**: T0 (doc-only + frontmatter dkc). Tier de quality review: `light`.

**Acciones (Plan A — 3 capas de defensa contextual):**

1. **DKC RULE** — promovida desde learn L8 a `RULE-curriculum-design-003` (level: must, scope: module). What/why/where/when/verification completos. Referencia SPEC-003 DEC-LOCAL-06 y TICKET-018. Buscable via `dkc_find_context(query=workflow mutations)`.
2. **CLAUDE.md a nivel mod** — nuevo `mods/curriculum-design/CLAUDE.md` con seccion "Mutations: usar `*Validated`, NUNCA las CRUD generic". Lista SI-usar / NO-usar completa. 10 error codes. Excepcion documentada del seed de demos huerfanos. **Auto-load** por Claude Code al trabajar en cualquier path del mod — el LLM no tiene que invocarlo, se carga inevitable.
3. **JSDoc WARN headers reforzados** — bloque `=======` destacado al inicio de los 3 resolvers (`workflow.resolver.js`, `workflowTransition.resolver.js`, `workflowTransitionHistory.resolver.js`) con: lista de mutations generic prohibidas por nombre, motivo runtime concreto por archivo (partial-unique, no-self-transitions, FK polimorfica + comment), referencia cruzada a RULE-003 + CLAUDE.md mod + PATTERNS.md.
4. **PATTERNS.md cross-ref** — seccion "Mutations validated vs CRUD generic" enlaza explicitamente la RULE-003 y los archivos auto-load (CLAUDE.md mod + headers JSDoc) como red de seguridad combinada.

**Por que estos 3 vectores combinados** (no uno solo):
- DKC RULE cubre LLMs que consultan el KB antes de escribir codigo.
- CLAUDE.md mod cubre Claude Code (auto-load contextual sin invocacion).
- JSDoc WARN cubre el LLM que abre/edita el archivo del resolver directamente.

Un LLM que ignore las 3 capas es uno que tampoco respetaria un `@deprecated` declarativo.

**Lo que NO se hizo** (futuro, requiere platform team):
- **ESLint custom rule** (Plan B) — hard gate en lint detectando strings GraphQL `create(Workflow|WorkflowStatus|...)(` sin sufijo `Validated`. Coste estimado 1-2h. No bloquea HU3, candidato para SP3.
- **Runtime guard + `@deprecated` directive en CRUD generic** (Plan C) — requiere extender codegen del core platform UP1. Coordinacion con platform team. Backlog post-SP2. Documentado en SPEC-003 backlog.

**Quality review DET-23 (tier: light):**

| # | Dim | Resultado | Notas |
|---|-----|-----------|-------|
| 1 | Calidad codigo | n/a | Session doc-only |
| 2 | Lint | n/a | Sin codigo JS/TS tocado |
| 3 | Tipado | n/a | Sin codigo TS |
| 4 | Testing | n/a | Sin tests |
| 5 | Escalabilidad | n/a | Sin logica |
| 6 | Mantenibilidad | pass | Cross-refs entre RULE-003, CLAUDE.md mod, PATTERNS.md y headers JSDoc consistentes |
| 7 | Claridad | pass | Bloque WARN visible en headers, listado explicito de mutations prohibidas por nombre, excepcion del seed documentada |
| 8 | a11y | n/a | Sin UI |
| 9 | Storybook | n/a | Sin componentes |
| 10 | Error handling | n/a | Sin codigo runtime |

**Decision**: pass — continue.

**Outputs (archivos):**
- `projects/up1/rules/curriculum-design/rule-curriculum-design-003.md` (DKC, indexado)
- `up1/mods/curriculum-design/CLAUDE.md` (auto-load Claude Code)
- `up1/mods/curriculum-design/logic/workflow.resolver.js` (WARN header)
- `up1/mods/curriculum-design/logic/workflowTransition.resolver.js` (WARN header)
- `up1/mods/curriculum-design/logic/workflowTransitionHistory.resolver.js` (WARN header)
- `up1/mods/curriculum-design/.ai/PATTERNS.md` (cross-ref a RULE-003 + auto-load files)

DKC reindex: 307 records (+1), 781 relations (+4).

**Backlog post-SP2** (no bloqueante de cierre HU3):
- B6 — ESLint custom rule detectando mutations CRUD generic en strings GraphQL del repo (Plan B).
- B7 — Coordinar con platform team extension del codegen para `useCustomMutationOnly: true` flag + `@deprecated` directive en CRUD generic (Plan C).

---

### Session 9 — 2026-05-13 — Tests E2E + integration + docs + smoke prep (S9 del plan)

**Objetivo**: completar suite de tests del seed UPU + tests integration de los 3 resolvers `*Validated`, preparar guia de smoke manual para el dev, escribir README seed + patron de adopcion en PATTERNS.md. Gate fuerte tier T3 — gate de cierre del ticket.

**Tasks ejecutadas:**

| Task | Resultado | Detalle |
|------|-----------|---------|
| S9.T1 — Tests E2E del seed | ✓ done | `tests/integration/workflow-seed-counts.test.ts` — 13 tests (full counts UPU + idempotencia 2x + patron polimorfico). 13/13 verde. Estrategia B (stub Prisma con persistencia en memoria + matchWhere) — replica patron de `seed-counts.test.ts` |
| S9.T2 — Tests integration resolvers | ✓ done | `tests/integration/workflow-resolvers.test.ts` — 20 tests cubriendo los **10 error codes** (`WORKFLOW_DOUBLE_DEFAULT`, `WORKFLOW_INVALID_CREATOR`, `WORKFLOW_SELF_TRANSITION`, `WORKFLOW_CROSS_INSTITUTION`, `WORKFLOW_ARCHIVED`, `WORKFLOW_INVALID_WORKFLOW`, `WORKFLOW_INVALID_STATUS`, `WORKFLOW_HISTORY_COMMENT_REQUIRED`, `WORKFLOW_HISTORY_INVALID_USER`, `WORKFLOW_HISTORY_INVALID_TRANSITION`) + happy paths + **append-only contract** (test que `update*Validated`/`delete*Validated` NO existen como exports). 20/20 verde |
| S9.T3 — Smoke manual UPU | preparada (pendiente del dev) | Guia ejecutable en `up1/mods/curriculum-design/seed/SMOKE-UPU.md` con 4 pasos: (1) counts Prisma Studio 9/5/21/5, (2) query polimorfica `workflowTransitionHistoryList(filter: {entityType: activity, entityId: demo-activity-001})` → 2 entries, (3) rechazo `createWorkflowTransitionValidated(from=to)` → `WORKFLOW_SELF_TRANSITION`, (4) rechazo scopeType="Activity" PascalCase → error enum |
| S9.T4 — Docs | ✓ done | Nuevo `up1/mods/curriculum-design/seed/README.md` (~150 lineas) cubre orden de carga, idempotencia, pre-condiciones, validacion runtime, patron polimorfico, excepcion documentada, smoke checks, decisions activas. Nueva subseccion en PATTERNS.md "Patron de adopcion en otros mods" con 9 pasos para replicar el patron `*Validated` |
| **Bug fix introducido**: seed-entry.test.ts | ✓ done | El test del entrypoint mockeaba solo `loadUnivalle` y `loadAiep` — al agregar `loadWorkflowObjects` (Session 8) las 3 ramas de error fallaban con `Cannot read properties of undefined (reading 'findFirst')`. Agregado mock `vi.mock('../../seed/_data-workflow-objects.js', ...)` + 4 tests nuevos (dispatch, error propagation con la nueva capa). Clasificacion: **introducido por S8** — corregido inmediatamente |

**Validacion completa (S9.GATE — tier T3 exhaustive):**

| Comando | Resultado |
|---------|-----------|
| `npm test` (todos los tests del mod) | **488/488 pass** (en SP2 inicio: 455 — agrega 33 tests workflow + 4 ajustados en seed-entry) |
| `npm run lint` | **clean** (0 errores, 0 warnings) |
| `npm run typecheck` | 6 errores **preexistentes** (TICKET-014 territory: `composables/useRecurrenceConfig.ts`, `modsComponents/CompositeSectionTree/CompositeSectionForm.ts`, `CompositeSectionView.ts`, `tests/integration/form-feedback.test.ts`). **0 introducidos** por HU3. Mis archivos nuevos son JS (no chequeados por vue-tsc) o TS con tipado correcto |
| `npm run drift:check` | **NO ERRORS**, 76 warnings preexistentes (todos fuera de scope: object-manager-editor, hello-world-mod) |
| Coverage workflow (focalizado) | **96.22% statements / 100% functions / 85% branches / 96.22% lines** (threshold spec: 80%) |

**Quality review DET-23 (tier: exhaustive — 10 dimensiones):**

| # | Dim | Resultado | Notas |
|---|-----|-----------|-------|
| 1 | Calidad codigo | pass | Tests <= 40 lineas por test individual. Helpers en archivos separados. Sin `any` salvo `Proxy` types (justificado para stub Prisma). Sin magic numbers (counts 9/5/21/5 estan asserted contra arrays del seed) |
| 2 | Lint | pass | `npm run lint` clean en todo el mod |
| 3 | Tipado | warn | Tests TS pasan. Mod tiene 6 errores TS preexistentes (TICKET-014) — **no introducidos** por HU3. Reportar como deuda separada |
| 4 | Testing | pass | 33 tests nuevos pasan. Coverage workflow 96.22%/100%/85%/96.22%. Cubre todos los error codes (10/10) + happy paths + append-only contract + patron polimorfico + idempotencia 2x. Test del seed entrypoint actualizado para reflejar nueva capa |
| 5 | Escalabilidad | pass | Seed usa lookups indexados por key (Map<code, id>) — O(1) lookup. Stubs de Prisma persisten en memoria → tests rapidos (47ms total). No introduce queries N+1. `Promise.all` en resolvers para batch lookups |
| 6 | Mantenibilidad | pass | Stubs `makePrismaStub` y `makePrismaMock` reutilizados entre 2 archivos de test. Patron consistente con `seed-counts.test.ts` existente. Sin duplicacion de fixtures — `happyStore` reutilizado en describe blocks de resolvers |
| 7 | Claridad | pass | JSDoc en cada test file con scope + estrategia. Cada describe tiene comentario de origen (`TC-018-X / REQ-Y`). Mensajes de error en las mutations tienen contexto ("el workflow existente, id ..., para crear otro marcalo como isDefault=false, para reemplazar archivar el actual primero") |
| 8 | Accesibilidad | n/a | HU3 sin UI (resolvers + seed + tests). Aplica en HU2/HU4 cuando se construya UI de transitions |
| 9 | Storybook | n/a | HU3 sin componentes Vue. Aplica en HU2/HU4 |
| 10 | Error handling | pass | 10 error codes documentados en headers JSDoc + PATTERNS.md + CLAUDE.md mod. Mensajes incluyen contexto + sugerencia de recovery ("Para reemplazar el default actual, archivar el existente primero"). Pre-condiciones del seed (`Institution UPU-MAIN`, admin user) fail explicit antes de tocar BD |

**Decision**: pass — **continue → request-close** (con condicional).

**Pendiente bloqueante de cierre del ticket** (DET-13 — cierre por evidencia):
- **Smoke manual UPU** (S9.T3) — guia en `seed/SMOKE-UPU.md` lista para ejecutar (~8-10 min). Sin esto, NO se puede declarar HU3 cerrada con evidencia real de comportamiento end-to-end.

**Listo para cierre tras smoke** (request-close + teach-close DET-22 + status closed).

**Gate decision (inicial — pre-smoke):**
- [ ] continue → request-close (sin smoke: violacion DET-13)
- [x] iterate → ejecutar smoke + request-close + teach-close DET-22 (recomendado)

---

### Session 9.5 — 2026-05-13 — Smoke S9.T3 ejecutado + gap del codegen detectado

**Objetivo**: ejecutar smoke S9.T3 contra UPU real (BD seedeada + object-manager corriendo). Cierre del gate S9.

**Pre-paso (fix introducido por S7)**: al arrancar object-manager nuevo, crash con `Unknown type "workflowScopeType". Did you mean "workflowStatus"?` + `Unknown type "workflowLifecycle"`. Causa: el schema custom `workflow.schema.graphql` referenciaba enums (`workflowScopeType`, `workflowLifecycle`) que el codegen NO genera — emite `String!` para campos enum del JSON. Fix: cambiar tipos a `String!` con docstring listando valores validos. Re-sync logic phase (`npm run sync:logic`).

**Tipo**: bug fix introducido (clasificado **introducido**, no preexistente). Detectado al primer arranque post-S7. Corregido en S9.5 inline.

**Tier**: T2 (smoke real con persistencia + GraphQL).

**Smoke resultado (4/4 pass)**:

| Check | Tool | Expected | Actual | Pass |
|-------|------|----------|--------|------|
| 1 — Counts | Prisma direct via `tenantManager.getClient('UPU')` | `workflowStatus=9, workflow=5, workflowTransition=21, workflowTransitionHistory=5` | `9/5/21/5` exactos | ✅ |
| 2 — Polimorfismo | Prisma direct `findMany({entityType:'activity', entityId:'demo-activity-001'})` | 2 entries demo huerfanas | 2 rows: "DEMO: apertura del programa" + "DEMO: envio a revision decanato" | ✅ |
| 3 — Self-transition rejection | GraphQL mutation `createWorkflowTransitionValidated(from=BOR, to=BOR)` | error `WORKFLOW_SELF_TRANSITION` | `WORKFLOW_SELF_TRANSITION: fromStatusId y toStatusId no pueden ser iguales (ambos = "cmp4j41hu003hxxj6rj5dro94"). Una transicion conecta dos estados distintos.` | ✅ |
| 4 — Enum invalid | GraphQL mutation `createWorkflowValidated(scopeType: "Activity")` PascalCase | rechazo runtime | Prisma rejection: `Invalid prisma.workflow.create() invocation` (Prisma valida el enum del JSON object definition automaticamente) | ✅ |

**Hallazgo no previsto durante smoke** — **gap del codegen UP1**:

El codegen UP1 **NO auto-genera CRUD generic queries/mutations** para los 4 objetos workflow declarados en `mods/curriculum-design/objects/*.json`. Verificado via introspeccion GraphQL:

- 49 queries totales en el schema — **0** matches para `workflowList`, `workflowStatusList`, `workflowTransitionList`, `workflowTransitionHistoryList`
- 59 mutations totales — **0** matches para `createWorkflow`, `updateWorkflow`, `deleteWorkflow`, ni para los otros 3 objetos
- Solo expuestas: `createWorkflowValidated`, `createWorkflowTransitionValidated`, `createWorkflowTransitionHistoryValidated` (las custom del mod)

**Implicacion para RULE-curriculum-design-003 y CLAUDE.md mod**:

La rule + CLAUDE.md + JSDoc headers advierten "NO usar `createWorkflow` (generic), USAR `createWorkflowValidated`". Esta advertencia esta basada en RULE-core-008 (CRUD generic auto-generation). En la practica actual del codegen UP1 SP2, **esa CRUD generic NO existe** en GraphQL para los objetos workflow del mod. Por lo tanto:

- **Hoy** (SP2): no hay manera de saltarse la validacion via GraphQL. Las `*Validated` son el unico camino.
- **Futuro**: si platform team habilita el codegen para auto-generar CRUD en objetos de mods, la rule sigue valida como future-proofing.

**Decision**: mantener RULE-003 + headers JSDoc + CLAUDE.md mod intactos. Agregar nota explicita al respecto:

1. **RULE-curriculum-design-003** — agregar bloque "Estado actual del codegen (SP2)" indicando que la CRUD generic GraphQL no existe en este momento, la rule es **preventiva**.
2. **PATTERNS.md** mod — clarificar la tabla "Set CRUD generic" → "Auto-generado solo en algunos contextos (Prisma client directo) — en GraphQL no expuesto actualmente".
3. **CLAUDE.md mod** — agregar nota "actualmente la CRUD generic no esta expuesta en GraphQL para estos 4 objetos — la rule es preventiva para caso de que el codegen lo habilite o alguien escriba prisma.workflow.create directo".

**Quality review DET-23 (tier: standard)**:

| # | Dim | Resultado | Notas |
|---|-----|-----------|-------|
| 1 | Calidad codigo | pass | Smoke script <100 lineas, dotenv para .env, helpers reutilizables |
| 2 | Lint | n/a | Script throwaway (eliminado tras ejecucion) |
| 3 | Tipado | n/a | JS smoke script |
| 4 | Testing | pass | 4 smoke checks documentados con expected vs actual + tool empleada por check |
| 5 | Escalabilidad | n/a | Smoke one-shot |
| 6 | Mantenibilidad | pass | Patron reutilizable para futuros tickets — documentado en SMOKE-UPU.md como referencia |
| 7 | Claridad | pass | JSON output con rows + error messages literales |
| 8 | a11y | n/a | Sin UI |
| 9 | Storybook | n/a | Sin componentes |
| 10 | Error handling | pass | Cleanup automatico del workflow test (si insertara) — no contamina BD post-smoke |

**Gate final S9 + ticket:**
- [x] **continue → request-close** — smoke 4/4 verde, evidencia real persistida, gap del codegen documentado, no quedan bloqueantes
- [ ] iterate
- [ ] escalate

**Next**: request-close + teach-close DET-22 → `status: closed`.

---

### Session 10 — 2026-05-13 — Walkthrough Playwright post-cierre (validacion adicional visual)

**Objetivo**: a peticion del dev (post-cierre del ticket), generar evidencia visual con Playwright MCP del trabajo HU3 contra los 3 servicios activos. **No afecta el cierre del ticket** — es documentacion suplementaria para presentar al PM/LA. Tier: T0 (doc-only).

**Cobertura del walkthrough:**

| Caso | Endpoint | Resultado | Screenshots |
|------|----------|-----------|-------------|
| A — GraphQL Playground (Apollo Sandbox) | http://localhost:4000/graphql | Sandbox carga conectado a OM, schema reference accesible, connection settings con shared headers configurable (X-Tenant-ID: UPU). Hallazgo: Apollo Server v5 embebe Sandbox via iframe externo (CSP bloquea framing local → redirige a studio.apollographql.com con `?endpoint=` param). Workflow funciona pero requiere autorizar headers compartidos | 1-8 (8 screenshots) |
| B — Prisma Studio | http://localhost:5555 | UI muestra los 4 modelos workflow con conteos exactos en sidebar: `workflow: 5`, `workflowStatus: 9`, `workflowTransition: 21`, `workflowTransitionHistory: 5`. Tabla `workflow` muestra los 5 workflows con sus names canonicos (`activity-standard`, `activity-fast`, `curriculumPlan-standard`, `competencyNode-standard`, `changeRequest-standard`). Tabla `workflowTransitionHistory` muestra los 5 demos polimorphicos con entityType ∈ {activity, curriculumPlan, changeRequest} y entityId prefix `demo-*` | 9-12 (4 screenshots) |
| Validacion Suite 3000 | http://localhost:3000 | uPlanner One landing page carga sin errores criticos. Usuario logged-in (`eduardo.bacon@uplanner.com`, rol Consultor), tenant UPU activo, Curriculum Design app en sidebar (highlighted). Sin overlay de crash. Console errors: 6 (todos preexistentes — 404s de assets dev + hidration mismatch generico de Nuxt SSR, no relacionados con HU3) | 13 (1 screenshot) |

**Screenshots persistidos en**: `tickets/ticket-018.screenshots/TICKET-018-smoke-*.png` (13 archivos).

**Convencion de naming** (per HOR-006/HOR-007): prefix `TICKET-018-smoke-{NN}-{descripcion}.png`, ubicacion correcta `{ticket}.screenshots/` para portabilidad + inference de owner por prefix.

**Hallazgos adicionales del walkthrough:**

1. **Apollo Sandbox CSP limitation**: Apollo Server v5 sirve la pagina de bienvenida en `/graphql` que intenta embed Apollo Sandbox via iframe desde `studio.apollographql.com`. El CSP `frame-ancestors sandbox.embed.apollographql.com embeddable-sandbox.netlify.app` bloquea el iframe local. Solucion: navegar directo a `https://studio.apollographql.com/sandbox/explorer?endpoint=http://localhost:4000/graphql` + configurar shared headers (X-Tenant-ID: UPU) via Connection Settings. Documentado para devs futuros que se topen con esto.

2. **Apollo Sandbox shared headers + auto-introspeccion**: el schema reference requiere headers (X-Tenant-ID) para introspeccion exitosa. Sin header → endpoint indicator rojo + schema vacio. Con header → introspeccion responde el schema completo.

3. **Suite 3000 con HU3 deployado**: el frontend NO contiene UI para los 4 objetos workflow (HU3 fue pure backend). La pagina Curriculum Design no tiene nada para mostrar visualmente del modelo workflow — eso vendra en HU2 (vista de transitions) y HU4 (curriculumPlan con workflowId reference). El walkthrough confirma que **el frontend no rompe** con el schema actualizado.

**Quality review DET-23 (tier: light — session doc-only)**:

| # | Dim | Resultado | Notas |
|---|-----|-----------|-------|
| 1 | Calidad codigo | n/a | Sin codigo nuevo (solo screenshots) |
| 2 | Lint | n/a | Sin codigo |
| 3 | Tipado | n/a | Sin codigo |
| 4 | Testing | n/a | Walkthrough manual via Playwright MCP — no tests automatizados |
| 5 | Escalabilidad | n/a | One-shot |
| 6 | Mantenibilidad | pass | 13 screenshots con naming convention consistente, ubicacion correcta segun HOR-006 |
| 7 | Claridad | pass | Cada screenshot tiene descripcion en filename + cobertura tabulada arriba |
| 8 | a11y | n/a | Sin UI nuevo |
| 9 | Storybook | n/a | Sin componentes |
| 10 | Error handling | n/a | Sin codigo runtime |

**Decision**: pass — no-op para el cierre del ticket (ya esta `closed`). Documentacion visual queda persistida para presentacion al PM/LA.

**Servicios de dev usados**: object-manager (4000, ya corria), prisma-studio (5555, levantado durante session), suite (3000, ya corria con sesion Clerk activa). Prisma Studio se cierra al cerrar la session de Chrome de Playwright (proceso PID 55961 se mantiene hasta el proximo restart).

---

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|

## Summary
