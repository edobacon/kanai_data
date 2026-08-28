---
id: SPEC-003-workflow-platform
project: up1
type: doc
module: curriculum-design
status: done
tags:
  - workflow
  - platform
  - seed
  - sprint-sp3
  - hu3
  - jira-upone-1099
---

# HU3 — Modelo de objetos workflow + seed UPU

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Si solo lees el Executive summary y te basta para decidir, ese es el objetivo. El detalle vive en Requirements, Artifacts, Tasks abajo.*

**Que se quiere**: Crear la capa transversal de workflow de UP1 con 4 objetos nuevos (`workflowStatus`, `workflow`, `workflowTransition`, `workflowTransitionHistory`) que reemplazan el enum `workflowState` hardcoded de los documentos curriculares. El seed UPU entrega 9 estados + 5 workflows (en Draft) + 21 transiciones nombradas + 5 entries demo huerfanas — listos para que HU4 (TICKET-019) los active y conecte a `activity`, y HU2 (TICKET-020) los audite.

**Decisiones criticas que necesitan tu OK** (todas tomadas en el intake, registradas en snapshot-sp3 L1-L15):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | `workflow.scopeType` **enum cerrado** (5 valores Confluence v1.10) | Type safety BD + GraphQL. Trade-off: nuevos consumers requieren migracion Prisma. Confluence lo declara literal |
| 2 | `workflowTransitionHistory.entityType` **string polimorfico abierto** | Confluence lo declara literal. Asimetria intencional con scopeType — el log no se bloquea por falta de migracion |
| 3 | 5 workflows del seed UPU en **`status: Draft`** | Permite ajustes finos antes de activar. HU4 los activa explicito como parte de su closing |
| 4 | 5 entries demo huerfanas con `entityId` ficticios (`demo-activity-001`, etc.) | Sirven como fixture para validar shape/layout en HU2/HU4 antes de que existan entries reales. Cleanup defer a SP4 |
| 5 | Constraints no-Prisma (from!=to, partial unique isDefault, append-only) van como **validacion runtime en resolver** | Prisma 6 no soporta CHECK constraints declarativos. Resolver + test E2E garantizan el comportamiento |

**Riesgos principales y como los mitigamos**:

- **Codegen UP1 con polimorfismo abierto (entityType string sin FK)** → smoke test temprano (S6) con JSON minimo de workflowTransitionHistory para confirmar que Prisma genera tabla sin restriccion FK
- **Defaults boolean en JSON UP1 — `true`/`false` literal vs `"true"`/`"false"` string** (hallazgo H6 del intake) → S5.T1 smoke test empirico antes de escribir los 4 JSONs. Si codegen rompe con literales, se ajustan los 4 a strings (paridad con curricularSection)
- **Race condition en partial unique `isDefault` por scopeType+institutionId** → validacion en resolver `createWorkflow` + test E2E que rechace 2 defaults concurrentes. Si emerge, escalar a partial unique index parcial en migracion SP4

**Que NO se hace en este ticket** (limites explicitos del scope):

- **NO conectar workflows a activity** → es scope de HU4 (TICKET-019). Activity sigue con `workflowState` enum legacy hasta que HU4 corra
- **NO crear changeLog** → es scope de HU2 (TICKET-020). HU3 NO toca auditoria
- **NO mutation `transitionActivity` runtime** → es responsabilidad de object-manager (futuro post-SP3). HU3 solo siembra el modelo + seed; las transiciones de activities reales las ejecuta HU4 en su smoke
- **NO UI de gestion de workflows** → config via seed; UI queda fuera del sprint
- **NO permisos por transicion** → cualquier user con permiso de edicion sobre el consumidor puede transicionar. RBAC granular es post-SP3
- **NO instancias reales de `curriculumPlan`, `competencyNode`, `changeRequest`** → los 5 workflows del seed apuntan a estos scopeTypes pero el dominio aun no tiene instancias. Los demos huerfanos cubren el patron polimorfico

**Tamano estimado**: **5 sessions ejecutables (S5-S9)**, aproximadamente **8-12h efectivas**. La mas riesgosa es S7 (resolvers custom + validacion runtime de constraints), la mas larga es S8 (seed UPU completo con 21 transitions + 5 demos + helpers idempotentes). Las sessions se numeran continuando la secuencia del intake (Session 0-4 del pre-execute) — ver DET-20 "Numeracion del plan de sessions".

**Como vas a saber que funciona** (criterios observables):

- Ejecutar `npm run sync` desde `up1/` y verificar que los 4 objetos workflow aparecen en `up1/object-manager/objects/business/` post-sync
- Ejecutar `npm run codegen` y verificar que `schema.prisma` tiene los 4 modelos + 4 enums (sin errores)
- Abrir Prisma Studio sobre tenant UPU y verificar las 4 tablas con conteo correcto: 9 statuses, 5 workflows en Draft, 21 transitions (5+2+6+4+4), 5 history demo
- Intentar via GraphQL playground `createWorkflowTransition` con `fromStatusId == toStatusId` → recibir error de validacion
- Intentar `createWorkflowTransitionHistory` para una transition con `requiresComment=true` SIN comment → recibir error

---

## Purpose

Implementar la capa de plataforma transversal del workflow para UP1 (4 objetos: status, workflow, transition, history), incluyendo seed canonico para tenant UPU. Es la base sobre la que HU4 conecta `activity.workflowId/currentStatusId` y HU2 audita via changeLog. Sin esta capa, el modelo de UP1 sigue con enum `workflowState` hardcoded incompatible con Confluence v1.9+. Implementacion 100% declarativa via JSON + codegen + resolvers custom para constraints no-Prisma; no requiere mutations CRUD adicionales por la regla RULE-core-008.

## Requirements

### REQ-01: Objeto `workflowStatus`

El sistema MUST exponer un objeto `workflowStatus` con codigo + nombre + categoria enum + status soft-delete, por institucion, via codegen UP1 (RULE-core-002).

**Actor**: system (codegen) + admin (CRUD via GraphQL post-codegen)
**Layers**: database, api, backend

#### Scenario: Crear status valido

- **GIVEN** institucion UPU existe con id valido
- **WHEN** se ejecuta `createWorkflowStatus({ institutionId: 'UPU', code: 'BOR', name: 'Borrador', category: 'ToDo', status: 'Active' })`
- **THEN** se persiste fila en `WorkflowStatus` con `id` generado
- **AND** queryable via GraphQL `workflowStatuses(filter: { institutionId: 'UPU' })`

#### Scenario: code duplicado por institucion rechazado

- **GIVEN** existe `workflowStatus { institutionId: 'UPU', code: 'BOR' }`
- **WHEN** se intenta crear otro `workflowStatus` con `code='BOR'` en la misma institucion
- **THEN** Prisma rechaza por constraint unique compuesto `(institutionId, code)`
- **AND** mensaje GraphQL incluye violacion de unique

#### Scenario: category fuera de enum rechazado

- **GIVEN** institucion UPU
- **WHEN** se intenta crear `workflowStatus` con `category: 'invalidValue'`
- **THEN** Prisma rechaza por valor fuera del enum `WorkflowStatusCategory`

#### Acceptance
**El usuario puede verificar que funciona**: abre Prisma Studio sobre tenant UPU, navega a tabla `WorkflowStatus`, ve los 9 registros del seed con `status='Active'` y `category` distribuida entre los 5 valores.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Create OK | institutionId UPU | createWorkflowStatus(BOR/ToDo/Active) | Persistido | Fila visible en BD |
| 2 | Code dup | code=BOR existe | createWorkflowStatus(BOR otra vez) | Rechazo unique | Error P2002 |
| 3 | Name dup | name=Borrador existe | createWorkflowStatus(Borrador otra vez) | Rechazo unique | Error P2002 |
| 4 | Category enum | — | category='invalid' | Rechazo enum | Error validacion |
| 5 | Status soft delete | status=Active | UPDATE status=Archived | Persistido | Catalogo soft-deleted |

---

### REQ-02: Objeto `workflow`

El sistema MUST exponer un objeto `workflow` con scopeType enum + status enum + createdBy FK CoreUser + isDefault unico por (institucion, scopeType), via codegen UP1.

**Actor**: admin (CRUD via GraphQL)
**Layers**: database, api, backend

#### Scenario: Crear workflow Draft

- **GIVEN** institucion UPU + CoreUser admin
- **WHEN** se crea `workflow { name: 'activity-standard', scopeType: 'activity', isDefault: true, status: 'Draft', createdBy: adminId }`
- **THEN** se persiste con id generado y status=Draft

#### Scenario: Segundo default por (institucion, scopeType) rechazado

- **GIVEN** existe `workflow { institutionId: UPU, scopeType: 'activity', isDefault: true }` (activity-standard)
- **WHEN** se intenta crear otro `workflow` con `scopeType='activity'` y `isDefault=true` en la misma institucion
- **THEN** validacion runtime en resolver `createWorkflow` lo rechaza
- **AND** mensaje claro: "Ya existe un workflow default para scopeType=activity en esta institucion"

#### Scenario: scopeType fuera del enum rechazado

- **GIVEN** institucion UPU
- **WHEN** se intenta crear `workflow` con `scopeType='Activity'` (PascalCase) o `'reservation'` (no en enum)
- **THEN** Prisma rechaza por enum invalido

#### Scenario: status transition Draft → Active permitido

- **GIVEN** workflow en Draft
- **WHEN** UPDATE status='Active' via GraphQL mutation
- **THEN** persistido. (HU4 hara esto en su smoke; HU3 no implementa logica de congelar post-Active)

#### Acceptance
**El usuario puede verificar que funciona**: abre Prisma Studio, ve los 5 workflows en `Workflow` con `status='Draft'`, 1 default por scopeType (activity-standard, curriculumPlan-standard, competencyNode-standard, changeRequest-standard; activity-fast con `isDefault=false`).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Create Draft | institucion UPU | createWorkflow(activity-standard, Draft) | Persistido | Visible en BD |
| 2 | Doble default | activity-standard existe | createWorkflow otra default activity | Rechazo runtime | Error explicito |
| 3 | scopeType enum | — | scopeType='Activity' | Rechazo Prisma | Error P2*** |
| 4 | createdBy FK | adminId no existe | createWorkflow(createdBy=invalid) | Rechazo FK | Error P2003 |
| 5 | Status transition | Draft | UPDATE status=Active | OK | Persistido (sin congelar en SP3) |

---

### REQ-03: Objeto `workflowTransition`

El sistema MUST exponer un objeto `workflowTransition` con workflowId + fromStatusId + toStatusId + name + requiresComment, validando runtime `fromStatusId != toStatusId` y "misma institucion entre from/to/workflow".

**Actor**: admin (CRUD via GraphQL)
**Layers**: database, api, backend

#### Scenario: Crear transition valida

- **GIVEN** workflow activity-standard + statuses BOR + EDIT en la misma institucion UPU
- **WHEN** se crea `workflowTransition { workflowId, fromStatusId: BOR, toStatusId: EDIT, name: 'Iniciar edicion', requiresComment: false }`
- **THEN** persistido + id generado

#### Scenario: Self-transition rechazada

- **GIVEN** workflow + status BOR
- **WHEN** se intenta crear `workflowTransition { fromStatusId: BOR, toStatusId: BOR }`
- **THEN** resolver `createWorkflowTransition` rechaza con mensaje "Self-transition no permitida"
- **AND** la BD NO contiene la fila

#### Scenario: Transition entre statuses de instituciones distintas rechazada

- **GIVEN** workflow en institucion UPU + status BOR de UPU + status PUB de otra institucion (improbable en SP3 con tenant unico, pero el resolver debe validar)
- **WHEN** se intenta crear `workflowTransition { workflowId: UPU, fromStatusId: UPU.BOR, toStatusId: OTRA.PUB }`
- **THEN** resolver rechaza con mensaje "Status no pertenece a la misma institucion del workflow"

#### Scenario: Duplicado por (workflow, from, to, name) rechazado

- **GIVEN** existe `workflowTransition { workflowId, fromStatusId: BOR, toStatusId: EDIT, name: 'Iniciar edicion' }`
- **WHEN** se intenta crear otra con misma combinacion
- **THEN** Prisma rechaza por unique compuesto `(workflowId, fromStatusId, toStatusId, name)`

#### Acceptance
**El usuario puede verificar que funciona**: abre Prisma Studio, ve 21 transitions distribuidas 5+2+6+4+4 entre los 5 workflows. Intenta crear una self-transition via GraphQL playground y recibe error.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Create OK | workflow + 2 statuses | createWorkflowTransition(BOR→EDIT) | Persistido | Visible |
| 2 | Self-trans | status BOR | createWorkflowTransition(BOR→BOR) | Rechazo resolver | Error explicito |
| 3 | Cross-institution | statuses 2 instituciones | createWorkflowTransition(UPU.BOR→OTRA.PUB) | Rechazo resolver | Error explicito |
| 4 | Dup name | (wf, BOR, EDIT, "Iniciar edicion") existe | crear duplicado | Rechazo Prisma | Error P2002 |

---

### REQ-04: Objeto `workflowTransitionHistory`

El sistema MUST exponer un objeto `workflowTransitionHistory` polimorfico (`entityType` string + `entityId` UUID, FK NO enforzada en BD), append-only, con validacion runtime de `comment` requerido cuando `transition.requiresComment=true`.

**Actor**: system (escrito por resolver de transition) + admin (read-only via GraphQL)
**Layers**: database, api, backend

#### Scenario: Append valido con polimorfismo abierto

- **GIVEN** workflowTransition existente + CoreUser admin
- **WHEN** se crea `workflowTransitionHistory { entityType: 'activity', entityId: 'demo-activity-001', transitionId, userId: adminId, comment: 'DEMO' }`
- **THEN** persistido. **`demo-activity-001` NO existe en la tabla `Activity`** — el polimorfismo NO valida existencia en BD (decision L14 + L5)

#### Scenario: Comment requerido violado

- **GIVEN** `workflowTransition` con `requiresComment=true` (ej. "Descontinuar")
- **WHEN** se crea `workflowTransitionHistory` SIN `comment`
- **THEN** resolver rechaza con mensaje "Esta transicion requiere comment"

#### Scenario: Append-only — UPDATE rechazado

- **GIVEN** existe entry en `workflowTransitionHistory`
- **WHEN** se intenta `updateWorkflowTransitionHistory` o `deleteWorkflowTransitionHistory` via GraphQL
- **THEN** la mutation no esta expuesta (resolver no la implementa)
- **AND** error: "Mutation no soportada"

#### Scenario: Query polimorfica por entityType + entityId

- **GIVEN** 5 history demo huerfanos en BD
- **WHEN** se ejecuta `workflowTransitionHistories(filter: { entityType: 'activity', entityId: 'demo-activity-001' })`
- **THEN** retorna las 2 entries que matchean (no las 3 de curriculumPlan + changeRequest)

#### Acceptance
**El usuario puede verificar que funciona**: query GraphQL `workflowTransitionHistories(filter: { entityType: 'activity', entityId: 'demo-activity-001' })` retorna 2 entries. Intenta `updateWorkflowTransitionHistory` y recibe "Mutation no soportada".

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Append polimorfico | transition existe | create con entityId huerfano | Persistido | Fila visible (sin FK check) |
| 2 | Comment violado | requiresComment=true | create sin comment | Rechazo resolver | Error explicito |
| 3 | Append-only | entry existe | updateMutation | No expuesto | Error mutation no soportada |
| 4 | Filter polimorfico | 5 demos | filter entityType=activity, entityId=demo-act-001 | Retorna 2 | Conteo correcto |
| 5 | requiresComment=false | transition no requiere | create sin comment | OK | Persistido |

---

### REQ-05: Constraints unique compuestos

El sistema MUST enforzar los siguientes constraints unique compuestos en la BD (Prisma `@@unique`) y/o resolver (validacion runtime):

| Objeto | Constraint | Implementacion |
|--------|-----------|----------------|
| workflowStatus | `(institutionId, code)` | Prisma `@@unique` |
| workflowStatus | `(institutionId, name)` | Prisma `@@unique` |
| workflow | `(institutionId, scopeType, name)` | Prisma `@@unique` |
| workflow | `(institutionId, scopeType, isDefault=true)` | **Runtime resolver** (Prisma no soporta partial unique) |
| workflowTransition | `(workflowId, fromStatusId, toStatusId, name)` | Prisma `@@unique` |

**Actor**: system
**Layers**: database, backend

#### Test scenarios
| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| 1 | code dup workflowStatus | code BOR existe | crear otro code=BOR | Rechazo Prisma |
| 2 | name dup workflow | name activity-standard existe | crear otro mismo name+scopeType+institucion | Rechazo Prisma |
| 3 | Doble default workflow | activity-standard default existe | crear otro activity isDefault=true | **Rechazo resolver** runtime |
| 4 | Transition dup | (wf, BOR, EDIT, "Iniciar edicion") existe | crear duplicada | Rechazo Prisma |

#### Acceptance
**El usuario puede verificar que funciona**: en GraphQL playground, ejecuta mutations que viol cada constraint y recibe error explicito en cada caso.

---

### REQ-06: Seed UPU idempotente

El sistema MUST entregar un seed para tenant UPU que cargue 9 workflowStatuses + 5 workflows (Draft) + 21 workflowTransitions + 5 workflowTransitionHistory demo huerfanos, idempotente (correr 2x no duplica), con FKs via `connect` (RULE-mods-008).

**Actor**: system (seed automatizado)
**Layers**: backend, database, config

#### Scenario: Primera ejecucion del seed

- **GIVEN** tenant UPU recien creado, sin workflows objects
- **AND** institution UPU existe + CoreUser `admin@uplanner.dev` existe
- **WHEN** se ejecuta `npm run sync` (que llama al seed del mod curriculum-design)
- **THEN** carga 9 statuses + 5 workflows + 21 transitions + 5 history demo
- **AND** conteo verificable: `SELECT count(*) FROM WorkflowStatus WHERE institutionId=UPU` = 9; idem otros

#### Scenario: Re-ejecucion del seed (idempotencia)

- **GIVEN** seed ya ejecutado una vez (9+5+21+5 entries existen)
- **WHEN** se ejecuta `npm run sync` por segunda vez
- **THEN** conteo final identico (no duplica) — upsert es idempotente

#### Scenario: Admin user faltante

- **GIVEN** CoreUser `admin@uplanner.dev` NO existe en tenant UPU
- **WHEN** se ejecuta el seed
- **THEN** el seed falla explicito con mensaje "Admin user admin@uplanner.dev no existe — verificar seed core de UPU"
- **AND** NO inserta entradas parciales

#### Scenario: Institucion UPU faltante

- **GIVEN** institution UPU NO existe
- **WHEN** se ejecuta el seed
- **THEN** falla explicito: "Institution UPU no existe — verificar seed core"

#### Scenario: Tenant distinto a UPU

- **GIVEN** tenant `OTRA` recien creado
- **WHEN** se ejecuta el seed del mod
- **THEN** el seed retorna sin hacer nada (Fase 1 DECISION-012: solo UPU)

#### Acceptance
**El usuario puede verificar que funciona**: ejecuta `npm run sync` 2 veces y abre Prisma Studio. Tablas tienen exactamente 9/5/21/5 registros. Verifica visualmente la fila `BOR / Borrador / ToDo / Active`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | First run | UPU vacio | npm run sync | 9+5+21+5 entries | Conteos exactos |
| 2 | Idempotencia | seed ya corrio | npm run sync de nuevo | Sin duplicados | Conteos identicos |
| 3 | Admin ausente | sin admin@uplanner.dev | seed corre | Falla explicito | Error claro + sin entries parciales |
| 4 | UPU ausente | sin institution UPU | seed corre | Falla explicito | Error claro |
| 5 | Otro tenant | OTRA recien creado | seed del mod | No-op | 0 entries |
| 6 | FK transitions | seed con statuses+workflows OK | crear transitions con connect | OK | FKs resueltas correctamente |
| 7 | Demo huerfano | seed completo | inspect WTH | 5 entries con entityId LIKE 'demo-%' | Visible |
| 8 | Demo comment DEMO | 5 demos | inspect comment | comment LIKE 'DEMO:%' | Todos etiquetados |

---

### REQ-07: Tests E2E del seed y constraints

El sistema MUST incluir tests E2E que validen los REQ-01..REQ-06 contra una BD real (tenant de test).

**Actor**: system (CI)
**Layers**: backend, database

#### Test scenarios

| # | Tipo | Suite | Que valida |
|---|------|-------|------------|
| 1 | Unit (Vitest) | seed/helpers.spec.js | upsertHelpers idempotencia |
| 2 | Integration | createWorkflow.spec.js | Rechazo de doble default por scopeType+institucion |
| 3 | Integration | createWorkflowTransition.spec.js | Rechazo de self-transition (from!=to) |
| 4 | Integration | createWorkflowTransitionHistory.spec.js | Rechazo de comment ausente si requiresComment=true |
| 5 | Integration | workflowTransitionHistory-append-only.spec.js | update/delete no expuestos via GraphQL |
| 6 | E2E | seed-upu-full.spec.js | Ejecutar seed 2x, verificar conteos 9/5/21/5 |
| 7 | E2E | seed-upu-polimorfico.spec.js | 5 demos huerfanos creados con entityId no existente |

#### Acceptance
**El usuario puede verificar que funciona**: ejecuta `npm test --workspace=@uplanner/object-management-backend` y los 7 nuevos tests pasan. Coverage de los 4 nuevos objetos > 80%.

---

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | Query polimorfica `workflowTransitionHistories(filter: entityType+entityId)` para tabla append-only que crece monotono | latencia p95 sobre 100K rows | < 100ms |
| Security | Multi-tenant: queries y mutations sobre workflow* DEBEN filtrar por `institutionId` derivado del header `X-Tenant-ID` | tenant isolation | 100% queries filtran (test E2E) |
| Security | RBAC del CRUD de workflows: requiere capability `workflow:edit` (provisional — granular en post-SP3) | gating | mutation rechazada sin capability |
| Scale | `workflowTransitionHistory` crece append-only — index compuesto (entityType, entityId) crucial | query 10K rows | < 50ms |
| Availability | El seed NO debe correr en builds de Docker (SKIP_DB_OPERATIONS=true) | flag respetada | seed no-op en build |

---

## Artifacts

### Object definitions (META-SPEC-json-object)

Cuatro JSON object definitions siguiendo el patron de meta-spec `METASPEC-json-object`:

| Archivo | Objeto | Status Confluence |
|---------|--------|-------------------|
| `mods/curriculum-design/objects/workflowStatus.json` | workflowStatus | En implementacion |
| `mods/curriculum-design/objects/workflow.json` | workflow | En implementacion |
| `mods/curriculum-design/objects/workflowTransition.json` | workflowTransition | En implementacion |
| `mods/curriculum-design/objects/workflowTransitionHistory.json` | workflowTransitionHistory | En implementacion |

Detalle completo en [tickets/ticket-018.draft/data-model-jsons.md](../../../deckard/projects/up1/tickets/ticket-018.draft/data-model-jsons.md) (draft aprobado v1).

#### Checklist de calidad por artefacto

- [x] Configuracion declarativa: enums declarados en JSON (no hardcoded en codigo del mod). i18n de `category`/`status` queda como **deuda explicita** (no aplica a v1 — los enums son tecnicos no UI-facing en HU3; en HU4 cuando se renderice el estado de activity, agregar i18n).
- [x] Cada artefacto tiene consumidor: HU4 (TICKET-019) consume los 4 objetos via FK + transiciones; HU2 (TICKET-020) consume `workflowTransitionHistory.entityType/entityId` via changeLog cross-reference.
- [x] Sin heuristicas: el polimorfismo `entityType` es string explicito; validacion runtime usa el set conocido como spec explicito (no infiere por nombre).

### Resolvers custom

| Resolver | Path | Que implementa |
|----------|------|----------------|
| `createWorkflow` | `mods/curriculum-design/logic/resolvers/workflow.js` | Validacion runtime de partial unique isDefault por (institutionId, scopeType) |
| `createWorkflowTransition` | `mods/curriculum-design/logic/resolvers/workflowTransition.js` | Validacion from!=to + statuses de la misma institucion del workflow |
| `createWorkflowTransitionHistory` | `mods/curriculum-design/logic/resolvers/workflowTransitionHistory.js` | Validacion comment requerido si transition.requiresComment; append-only (NO expone update/delete) |

### Seed UPU

| Archivo | Proposito |
|---------|-----------|
| `mods/curriculum-design/seed/workflow-objects.seed.js` | Funcion `loadWorkflowObjects(prisma, tenantId)` con 9+5+21+5 entries via upsert idempotente |
| `mods/curriculum-design/seed/seed.js` (modificacion) | Importar y llamar `loadWorkflowObjects` ANTES de las activities legacy (UV/AIEP) |

Pseudo-codigo completo en [tickets/ticket-018.draft/seed-data.md](../../../deckard/projects/up1/tickets/ticket-018.draft/seed-data.md) (draft aprobado v1).

### Tests

| Archivo | Tipo | Cubre |
|---------|------|-------|
| `mods/curriculum-design/tests/seed/workflow-objects-idempotency.spec.js` | E2E | REQ-06 #2 |
| `mods/curriculum-design/tests/seed/workflow-objects-counts.spec.js` | E2E | REQ-06 #1, #7 |
| `mods/curriculum-design/tests/resolvers/createWorkflow.spec.js` | Integration | REQ-02 #2 (doble default) |
| `mods/curriculum-design/tests/resolvers/createWorkflowTransition.spec.js` | Integration | REQ-03 #2 (self-trans), #3 (cross-institution) |
| `mods/curriculum-design/tests/resolvers/createWorkflowTransitionHistory.spec.js` | Integration | REQ-04 #2 (comment violado), #3 (append-only) |
| `mods/curriculum-design/tests/resolvers/workflowTransitionHistory-polymorphic.spec.js` | Integration | REQ-04 #4 (filter polimorfico) |

### Docs

| Archivo | Contenido |
|---------|-----------|
| `mods/curriculum-design/seed/README.md` (modificacion o creacion) | Documentar nuevo seed `workflow-objects.seed.js`: que carga, idempotencia, dependencias (admin user + UPU institution), patron polimorfico de demos huerfanos |
| `mods/curriculum-design/.ai/PATTERNS.md` (anexo) | Patron de adopcion de workflow para futuros mods: como un mod nuevo declara `workflowId` + `currentStatusId` en su objeto + agrega su scopeType al enum |

---

## Tasks

> **DET-20 — Particion en sessions con Gate de sync**: 5 sessions agrupadas por afinidad logica + dependencias duras. Cada session termina con `S{N}.GATE` (reviewer + DET-20). Tier escala con riesgo del cambio.

### Session 5 — Smoke de defaults boolean + decisiones tecnicas finales [tipo: ⚑ fuerte] [tier: T1]

**Objetivo**: validar empirico el comportamiento del codegen UP1 con defaults boolean literales (hallazgo H6 del intake) ANTES de escribir los 4 JSONs. Si codegen rompe, ajustar los 4 JSONs a strings (paridad con curricularSection).

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S5.T1 | Smoke test codegen con boolean literal (true/false). Crear JSON minimo de prueba con campo `myBool: { type: boolean, static_default: true }` en `mods/curriculum-design/objects/_smoke.json` (archivo temporal, sin sync). Ejecutar `npm run codegen` y verificar Prisma generado | developer | — | `mods/curriculum-design/objects/_smoke.json` (temporal) | DET-1, DET-2, DET-5 | Manual: inspeccionar `prisma/schema.prisma` generado, verificar `myBool Boolean @default(true)` | **done** | 5 |
| S5.T2 | Decision: si S5.T1 funciona con literal, usar `true`/`false` en los 4 JSONs de HU3. Si rompe, usar strings `"true"`/`"false"` (paridad con curricularSection). Eliminar `_smoke.json` temporal. Documentar resultado en este spec (Decisions seccion) | developer | S5.T1 | spec + cleanup | DET-4, DET-8 | Codegen ejecuta sin errores final | **done** | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T1)** — persistir decision sobre defaults boolean en spec + ticket. Validar `npm run typecheck` del mod (no degrado). **Quality review DET-23 light**: dimensiones 1, 2, 3, 7. Decidir continue (si codegen funciona + quality review pass) | reviewer | S5.T1, S5.T2 | ticket + spec | DET-20, DET-23 | Gate persistido + decision documentada + bloque Quality review en session | **done** | 5 |

---

### Session 6 — Los 4 JSONs object definitions + codegen [tipo: auto] [tier: T1]

**Objetivo**: crear los 4 JSON definitions, ejecutar codegen, verificar schema.prisma generado. Validar polimorfismo abierto en workflowTransitionHistory (sin FK enforzada). **Tier T1**: cambio declarativo (JSONs), sin logica de negocio — validacion focal en codegen + drift.

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S6.T1 | Crear `mods/curriculum-design/objects/workflowStatus.json` con 7 campos (institutionId, code, name, category, description, status). Aplicar formato booleano de S5.T2 | developer | S5.GATE | `mods/curriculum-design/objects/workflowStatus.json` | DET-1, DET-2, DET-8 | `npm run codegen` no falla; Prisma schema.prisma tiene model WorkflowStatus + enum WorkflowStatusCategory + WorkflowStatusLifecycle | **done** | 6 |
| S6.T2 | Crear `mods/curriculum-design/objects/workflow.json` con 9 campos (institutionId, name, description, scopeType, isDefault, status, createdBy + auto createdAt/updatedAt) | developer | S6.T1 | `mods/curriculum-design/objects/workflow.json` | DET-1, DET-2, DET-8 | Codegen genera model Workflow + enum WorkflowScopeType + WorkflowLifecycle | **done** (2 iteraciones — DEC-LOCAL-04 + DEC-LOCAL-05) | 6 |
| S6.T3 | Crear `mods/curriculum-design/objects/workflowTransition.json` con 6 campos (workflowId, fromStatusId, toStatusId, name, requiresComment) | developer | S6.T2 | `mods/curriculum-design/objects/workflowTransition.json` | DET-1, DET-2, DET-8 | Codegen genera model WorkflowTransition con 3 FKs | **done** | 6 |
| S6.T4 | Crear `mods/curriculum-design/objects/workflowTransitionHistory.json` con 6 campos (entityType polimorfico abierto, entityId, transitionId, userId, comment + index compuesto entityType+entityId) | developer | S6.T3 | `mods/curriculum-design/objects/workflowTransitionHistory.json` | DET-1, DET-2, DET-8, DET-5 | Codegen genera model WorkflowTransitionHistory **SIN FK entityType→tabla** (string libre); index compuesto presente | **done** (2 iteraciones — DEC-LOCAL-05) | 6 |
| S6.T5 | Ejecutar `npm run sync` desde `up1/` para propagar JSONs a `up1/object-manager/objects/business/`. Verificar que los 4 archivos llegan al core via sync mechanism. Ejecutar `npx prisma migrate dev` y verificar tablas creadas en BASEMODEL + UPU | developer | S6.T1, S6.T2, S6.T3, S6.T4 | core via sync + Prisma migration | DET-5, DET-8, DET-16, RULE-core-002 | Tablas WorkflowStatus, Workflow, WorkflowTransition, WorkflowTransitionHistory existen en BD del tenant UPU | **done** (3 iteraciones + 1 cleanup) | 6 |
| **S6.GATE** | **Gate de sync Session 6 (tier: T1)** — `npm run drift:check` consistencia cross-tenant. Verificar 4 tablas en Prisma Studio sobre UPU. **Quality review DET-23 light**: dim 1 (estructura JSON respeta convencion UP1) + dim 7 (descripciones de objetos/campos claras). Lint y typecheck `n/a` (session solo JSONs declarativos, sin codigo TS/JS). Decidir continue si no hay drift | reviewer | S6.T1..T5 | ticket + Prisma Studio | DET-20, DET-23 | 0 drift. 4 tablas vacias presentes en UPU. Quality review light persistido | **done** | 6 |

---

### Session 7 — Mutations custom validated + docs PATTERNS [tipo: ⚑ fuerte] [tier: T2]

**Objetivo**: implementar 3 **mutations custom validated** en el mod (`createWorkflowValidated`, `createWorkflowTransitionValidated`, `createWorkflowTransitionHistoryValidated`) que envuelven la logica de validacion runtime y delegan al CRUD generic. Quedan disponibles via GraphQL para todos los consumers (HU4, HU2, frontend, integraciones). Documentar en `.ai/PATTERNS.md` la convencion de uso vs CRUD generic auto-generado. Ver DEC-LOCAL-06 para racional completo. Tests integration se hacen en S9 (no en este gate).

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S7.T1 | Crear `mods/curriculum-design/logic/workflow.resolver.js` + `workflow.schema.graphql` con mutation `createWorkflowValidated`. Valida: (a) partial unique `isDefault` por (institutionId, scopeType) — rechaza con `WORKFLOW_DOUBLE_DEFAULT` si ya existe otro default; (b) `createdBy` existe en `core_User` — rechaza con `WORKFLOW_INVALID_CREATOR`. Delega a `prisma.workflow.create()` si pasa | developer | S6.GATE | `mods/curriculum-design/logic/workflow.resolver.js`, `mods/curriculum-design/logic/workflow.schema.graphql` | DET-1, DET-2, DET-8, RULE-core-008 | JSON valido + sintaxis correcta + delega al CRUD generic (revision estatica). Test integration en S9 | **done** | 7 |
| S7.T2 | Crear `mods/curriculum-design/logic/workflowTransition.resolver.js` + `workflowTransition.schema.graphql` con mutation `createWorkflowTransitionValidated`. Valida: (a) `fromStatusId != toStatusId` — `WORKFLOW_SELF_TRANSITION`; (b) `fromStatus` y `toStatus` misma institucion que workflow — `WORKFLOW_CROSS_INSTITUTION`; (c) `workflow.lifecycle != Archived` — `WORKFLOW_ARCHIVED`. Delega al CRUD generic | developer | S7.T1 | `mods/curriculum-design/logic/workflowTransition.resolver.js`, `mods/curriculum-design/logic/workflowTransition.schema.graphql` | DET-1, DET-2, DET-5, DET-8 | JSON valido + sintaxis correcta. Test integration en S9 | **done** | 7 |
| S7.T3 | Crear `mods/curriculum-design/logic/workflowTransitionHistory.resolver.js` + `workflowTransitionHistory.schema.graphql` con mutation `createWorkflowTransitionHistoryValidated`. Valida: (a) `comment` requerido si `transition.requiresComment=true` — `WORKFLOW_HISTORY_COMMENT_REQUIRED`; (b) `userId` existe en `core_User` — `WORKFLOW_HISTORY_INVALID_USER`; (c) `transitionId` existe — `WORKFLOW_HISTORY_INVALID_TRANSITION`. Delega al CRUD generic | developer | S7.T2 | `mods/curriculum-design/logic/workflowTransitionHistory.resolver.js`, `mods/curriculum-design/logic/workflowTransitionHistory.schema.graphql` | DET-1, DET-2, DET-8, DET-5 | JSON valido + sintaxis correcta. Test integration en S9 | **done** | 7 |
| S7.T4 | Crear/actualizar `mods/curriculum-design/.ai/PATTERNS.md` con seccion **"Mutations validated vs CRUD generic"**: las 3 mutations `*Validated` creadas, causas (CRUD generic NO valida — codegen UP1 sin hooks pre-mutation per-objeto), efectos (data invalida puede entrar a BD), convencion ("usar las `*Validated` en codigo productivo; el generic solo para data trusted como seed dev-controlled"), plan futuro (cuando platform habilite hooks per-objeto las custom pueden retirarse), tabla de codigos error `WORKFLOW_*` con su significado | developer | S7.T3 | `mods/curriculum-design/.ai/PATTERNS.md` | DET-2, DET-16 | Doc revisado; convencion + causas + efectos + plan futuro presentes; tabla de error codes documentada | **done** | 7 |
| S7.T5 | `npm run sync:logic` para propagar resolvers + schemas al core (`up1/object-manager/src/graphql/resolvers/mods/curriculum-design/`). Verificar GraphQL playground tiene **ambos sets**: las 3 `*Validated` (del mod) Y el CRUD generic auto-generado (de codegen). Confirmar que coexisten. Documentar el hallazgo visual en el session log del ticket | developer | S7.T4 | core sync logic + GraphQL playground manual check | DET-5, DET-16 | Playground muestra: `createWorkflowValidated`, `createWorkflowTransitionValidated`, `createWorkflowTransitionHistoryValidated` + `createWorkflow`, `createWorkflowTransition`, `createWorkflowTransitionHistory` (generic). Sync sin errores | **done** | 7 |
| **S7.GATE** | **Gate de sync Session 7 (tier: T2)** — `npm run lint` del mod + `npm run typecheck` sin errores nuevos. **Quality review DET-23 standard**: dims 1 (limites codigo, max ~40 lineas/funcion), 2 (lint pasa), 3 (typecheck pasa), 6 (mantenibilidad — extraer helper compartido `findOrThrow` si se repite), 7 (claridad — comentarios en cada validacion explicando el constraint Confluence v1.10 al que responde), 10 (error handling — codigos `WORKFLOW_*` consistentes + mensajes user-friendly). Dim 4 (testing) y 5 (escalabilidad) `n/a` — tests integration en S9, validaciones son lookup simple sin queries pesadas. Decision continue si lint + typecheck + quality pass | reviewer | S7.T1..T5 | ticket + lint + typecheck + `.ai/PATTERNS.md` | DET-20, DET-13, DET-23 | Lint OK; typecheck OK; Quality review standard persistido; PATTERNS.md actualizado | **done** | 7 |

---

### Session 8 — Seed UPU completo (statuses + workflows + transitions + history demo) [tipo: auto] [tier: T2]

**Objetivo**: implementar el seed idempotente UPU con todos los datos. Verificar conteos finales 9/5/21/5 en Prisma Studio.

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S8.T1 | Crear helpers de upsert idempotente en `mods/curriculum-design/seed/_data-workflow-objects.js`: upsertStatuses, upsertWorkflows, upsertTransitions, upsertHistoryDemos, validatePartialUniqueIsDefault, validateNoSelfTransitions. Verificacion de admin user + UPU institution existentes (errores explicitos si faltan) | developer | S7.GATE | `mods/curriculum-design/seed/_data-workflow-objects.js` | DET-1, DET-2, DET-8, RULE-mods-008 | Helpers idempotentes via `upsert`; segunda ejecucion no duplica filas | done | 8 |
| S8.T2 | Implementar carga de 9 statuses + 5 workflows (lifecycle=Draft, decision DEC-LOCAL-04). FKs via `connect` (RULE-mods-008, relation lowercase). 9 statuses con codigos BOR/EDIT/REV-DEC/PUB/DIS/PROP/EVAL/APR/REJ | developer | S8.T1 | `mods/curriculum-design/seed/_data-workflow-objects.js` | DET-1, DET-2, DET-8, RULE-mods-008 | Prisma Studio: 9 statuses + 5 workflows Draft. Conteos BD: workflowStatus=9, workflow=5 | done | 8 |
| S8.T3 | Implementar carga de 21 transitions con names UI propuestos + requiresComment. Distribucion: 5+2+6+4+4 entre los 5 workflows. Names en castellano (decision local) | developer | S8.T2 | `mods/curriculum-design/seed/_data-workflow-objects.js` | DET-1, DET-2, DET-8 | Prisma Studio: 21 transitions; 9 con requiresComment=true. Conteo BD: workflowTransition=21 | done | 8 |
| S8.T4 | Implementar carga de 5 history demo huerfanos. entityIds con prefijo `demo-` (decision L14); comments con prefijo `DEMO:`. Bypass de validacion runtime de existence (usar `prisma.workflowTransitionHistory.create` directo, NO via resolver) | developer | S8.T3 | `mods/curriculum-design/seed/_data-workflow-objects.js` | DET-1, DET-2, DET-8, DET-5 | Prisma Studio: 5 entries con entityId LIKE 'demo-%' y comment LIKE 'DEMO:%'. Conteo BD: workflowTransitionHistory=5 | done | 8 |
| S8.T5 | Modificar `mods/curriculum-design/seed/seed.js` (entrypoint del mod) para llamar `await loadWorkflowObjects(prisma, tenantId)` ANTES de `loadUnivalle` y `loadAiep`. Documentar el orden en el comentario del archivo | developer | S8.T4 | `mods/curriculum-design/seed/seed.js` | DET-5, DET-8, DET-16 | `npm run sync` desde `up1/` ejecuta seed sin errores y conteos finales 9/5/21/5 | done | 8 |
| **S8.GATE** | **Gate de sync Session 8 (tier: T2)** — seed 2x consecutivas: verificar idempotencia (conteos 9/5/21/5 identicos via SELECT count()). `npm run lint` del seed nuevo. **Quality review DET-23 standard**: dims 1 (limites codigo), 2 (lint JS), 6 (helpers no duplicados con `_data-univalle.js`/`_data-aiep.js`), 7 (formato logs `[curriculum-design seed] ...` consistente con patron del mod + comentarios sobre bypass de validacion runtime para huerfanos), 10 (falla explicito si admin/UPU missing, sin entries parciales). Dims 3 (typecheck), 4 (testing) y 5 (escalabilidad) `n/a` — seed es codigo JS sin tipos y sin tests asociados directos; tests del seed estan en S5 | reviewer | S8.T1..T5 | ticket + Prisma Studio + BD UPU | DET-20, DET-13, DET-23 | 2 ejecuciones del seed → conteos identicos (9/5/21/5). Quality review standard persistido con justificacion de `n/a`. Decision: continue → S9 | done | 8 |

---

### Session 9 — Tests E2E + smoke UPU + docs [tipo: ⚑ fuerte] [tier: T3]

**Objetivo**: completar suite de tests, smoke manual en UPU, actualizar documentacion del mod. Gate fuerte porque es el cierre.

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session |
|---|------|-------|------------|-------|-------|------------|--------|---------|
| S9.T1 | Escribir tests E2E del seed: full counts UPU (9/5/21/5), idempotencia (2 ejecuciones sin duplicar), patron polimorfico (5 demos huerfanos visibles). Consolidados en un solo archivo siguiendo la convencion del mod (`tests/integration/*.test.ts`) | developer | S8.GATE | `mods/curriculum-design/tests/integration/workflow-seed-counts.test.ts` | DET-7, DET-13, DET-2 | 13 tests pasan en 11ms | done | 9 |
| S9.T2 | Escribir tests integration de los 3 resolvers `*Validated`: 10 error codes cubiertos (`WORKFLOW_DOUBLE_DEFAULT`, `WORKFLOW_INVALID_CREATOR`, `WORKFLOW_SELF_TRANSITION`, `WORKFLOW_CROSS_INSTITUTION`, `WORKFLOW_ARCHIVED`, `WORKFLOW_INVALID_WORKFLOW`, `WORKFLOW_INVALID_STATUS`, `WORKFLOW_HISTORY_COMMENT_REQUIRED`, `WORKFLOW_HISTORY_INVALID_USER`, `WORKFLOW_HISTORY_INVALID_TRANSITION`) + happy paths + append-only contract (no exporta update/delete validated) + polimorfico abierto | developer | S9.T1 | `mods/curriculum-design/tests/integration/workflow-resolvers.test.ts` | DET-7, DET-13, DET-5 | 20 tests pasan; coverage 96.22%/100%/85% (statements/functions/branches) — supera threshold 80% | done | 9 |
| S9.T3 | Smoke real en UPU ejecutado script `smoke-upu.mjs`: (a) Prisma direct counts 9/5/21/5 ✓; (b) polimorfismo `findMany({entityType:'activity', entityId:'demo-activity-001'})` → 2 entries ✓; (c) GraphQL `createWorkflowTransitionValidated(from=BOR, to=BOR)` → `WORKFLOW_SELF_TRANSITION` ✓; (d) GraphQL `createWorkflowValidated(scopeType="Activity")` PascalCase → Prisma rejection (codegen valida enum del JSON) ✓. Hallazgo no previsto: codegen UP1 NO auto-expone CRUD generic GraphQL para mods — rule queda como preventiva | developer | S9.T2 | `seed/SMOKE-UPU.md` (guia) + smoke script ejecutado + resultado en ticket S9.5 | DET-13, DET-5 | 4/4 checks pass; gap codegen documentado en RULE-003 + CLAUDE.md mod | done | 9 |
| S9.T4 | Crear `mods/curriculum-design/seed/README.md` con seccion "workflow-objects seed": que carga, idempotencia, pre-condiciones, validacion runtime, patron polimorfico, excepcion documentada del bypass, smoke checks, decisions activas. Subseccion nueva en `mods/curriculum-design/.ai/PATTERNS.md` "Patron de adopcion en otros mods" con 9 pasos para replicar el patron `*Validated` | developer | S9.T3 | `mods/curriculum-design/seed/README.md` (nuevo) + `.ai/PATTERNS.md` (sub-seccion nueva) | DET-2, DET-16 | Docs revisados, cross-refs CLAUDE.md mod + PATTERNS.md + RULE-curriculum-design-003 funcionan | done | 9 |
| **S9.GATE** | **Gate de cierre del ticket (tier: T3 exhaustive)** completado: `npm test` (488/488), lint clean, typecheck (6 preexistentes TICKET-014, 0 introducidos), drift NO ERRORS, coverage workflow 96.22%/100%/85%, smoke real S9.5 → 4/4 pass. **Quality review DET-23 exhaustive 10/10**: 7 pass + 1 warn (typecheck preexistente) + 2 n/a (a11y, Storybook). Decision final: **continue → request-close + teach-close DET-22 + status: closed** | reviewer | S9.T1..T4 + smoke real | ticket + tests + BD + smoke output | DET-20, DET-13, DET-14, DET-23 | Todo verde + smoke evidencia persistida en S9.5 + teach-close producido | done | 9 |

---

## Constraints

- **DET-1 (niveles de certeza)**: cada task tiene status `confirmed` (alineada a Confluence v1.10 + decisiones intake L1-L15). Sin items `assumed`.
- **DET-2 (source_ref)**: cada task tiene `source_ref` a un REQ del spec.
- **DET-5 (verificacion multi-capa)**: tests integration validan en backend + BD; smoke S9.T3 valida en GraphQL + Prisma Studio.
- **DET-8 (rollback)**: rollback de cada task es `git revert` + reverse del Prisma migration (`npx prisma migrate reset` solo en dev/sandbox).
- **DET-20 (particion en sessions)**: 5 sessions con tipo + tier explicitos. S{N}.GATE como ultima task de cada session.
- **RULE-core-002 (codegen UP1)**: el codigo de los 4 objetos no se escribe en Prisma directamente — solo JSON + `npm run codegen`.
- **RULE-core-008 (CRUD generico)**: no escribir mutations CRUD basicas (create/read/update/delete) — el codegen las genera. Solo escribir resolvers custom para las validaciones runtime de S7.
- **RULE-mods-008 (seed en mod)**: el seed UPU vive en `mods/curriculum-design/seed/`, NO en `up1/object-manager/prisma/UPU/seed.js`. FKs via `connect` con relation lowercase.
- **RULE-core-013 (`_previousData` BullMQ)**: no aplica directo a HU3 (HU3 no toca events). Aplica a HU2 que escribira changeLog desde eventos del worker.
- **DECISION-005**: el campo `workflowState` legacy queda en `activity` hasta HU4 — HU3 NO modifica activity.
- **DECISION-012 (rollout 2 fases)**: HU3 carga seed solo en UPU. Si tenantId !== 'UPU' → no-op.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `up1/object-manager` codegen pipeline | internal | El codegen UP1 lee los JSONs del mod (post sync) y genera Prisma + GraphQL types | Si codegen falla con polimorfismo abierto o boolean defaults, S2 se bloquea (mitigation: S1 smoke + S6.T4 verifica) |
| Institucion UPU + CoreUser `admin@uplanner.dev` en seed core | internal | El seed del mod referencia ambos via lookup. Si no existen, falla explicito | Bajo: ambos confirmados en `up1/object-manager/prisma/UPU/seed.js` |
| Prisma 6 (UP1 default) | external | Soporte de enum, unique compuesto, FK opcional | Bajo: APIs estables; partial unique requiere validacion runtime (S7.T1) |
| BD PostgreSQL del tenant UPU | external | Tablas Workflow* se crean post-sync via Prisma migrate | Bajo: migracion estandar, sin DDL custom |
| `npm run sync` (8-fase) | internal | Propaga JSONs + resolvers + seeds del mod al core | Si sync falla, S6.T5 y S8.T5 se bloquean (mitigation: testing intermedio + drift:check) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Codegen UP1 rompe con boolean defaults literales (true/false vs "true"/"false") | medium | S2 bloqueado | S1 smoke test temprano antes de los 4 JSONs reales. Decision en S5.T2 |
| Codegen UP1 no soporta polimorfismo abierto (entityType string sin FK) | low | S6.T4 bloqueado | Verificacion en S6.T4 antes de avanzar. Fallback: declarar entityType como string sin `references` |
| Race condition en partial unique isDefault entre concurrentes | low | datos inconsistentes en BD | Resolver `createWorkflow` (S7.T1) hace check + insert atomicos. Test integration valida 2 concurrentes |
| Seed inserta datos parciales si admin user no existe | low | data parcial en BD | Validacion temprana en helper de S8.T1: si admin missing, lanzar error ANTES de insertar nada (transaccion atomic) |
| `npm run sync` no propaga correctamente JSONs nuevos al core | low | core inconsistente | S6.T5 ejecuta sync explicito + `drift:check` en S6.GATE |
| Test E2E del seed acumula datos entre runs en CI | medium | tests intermitentes | Tests E2E corren sobre tenant test efimero (no UPU); helper `_cleanup.js` borra antes |

## Open questions

Sin open questions al cierre del design. Las decisiones criticas (L1-L15) estan tomadas y registradas en snapshot-sp3 + sessions del ticket. La unica validacion empirica pendiente (defaults boolean literal vs string, hallazgo H6) esta como **task explicita S5.T1** — no como open question.

## Decisions

Decisiones locales acumuladas durante design (referencia rapida — detalle en snapshot-sp3 L1-L15):

### DEC-LOCAL-01: scopeType enum cerrado, entityType string polimorfico (asimetria intencional)

- **Contexto**: Confluence v1.10 declara `workflow.scopeType` como enum y `workflowTransitionHistory.entityType` como string. Pareceria inconsistente conceptualmente.
- **Drivers**: fidelidad a doc canonica + type safety + extensibilidad mod system
- **Opcion elegida**: respetar la asimetria — scopeType enum, entityType string
- **Alternativas**: ambos enum (descartado por contradecir doc + bloquear logs para mods futuros); ambos string (descartado por contradecir doc + perder type safety en GraphQL)
- **Consecuencias**: nuevos consumers requieren migracion del enum scopeType; entityType permite logs desde dia 1 sin migracion
- **Session**: pre-design (intake Session 7)

### DEC-LOCAL-06: Mutations custom validated para constraints runtime no-Prisma

- **Contexto**: Confluence v1.10 documenta 4 constraints runtime que no son declarables en Prisma — partial unique `isDefault` por (institutionId, scopeType), `fromStatusId != toStatusId`, `comment` requerido si `requiresComment=true`, `workflowTransitionHistory` append-only. Originalmente S7 planeaba "crear resolvers custom de createWorkflow/etc." pero al investigar se descubrio que el codegen UP1 ya auto-genera el CRUD generic (RULE-core-008) y NO expone hooks/validators per-objeto.
- **Drivers**:
  - Codegen UP1 sin hooks pre-mutation per-objeto (cambio platform fuera de scope SP3).
  - Patron del codebase observado: otros mods (`ai-agent`, `retention-wellbeing`, `object-manager-editor`) NO sobrescriben el CRUD generic — agregan mutations con nombres distintos (`aiChat`, `manageAppRoles`).
  - Validaciones criticas deben enforzarse en GraphQL (no solo en seed/cliente) para que HU4 + HU2 + otros consumers las hereden sin duplicar logica.
- **Opcion elegida**: crear **3 mutations custom validated** con sufijo `Validated` que envuelven la logica de validacion y delegan al CRUD generic:
  - `createWorkflowValidated` — valida partial unique `isDefault` + `createdBy` existe
  - `createWorkflowTransitionValidated` — valida `fromStatusId != toStatusId` + statuses misma institucion + workflow.lifecycle != Archived
  - `createWorkflowTransitionHistoryValidated` — valida `comment` requerido si `transition.requiresComment=true` + verificacion de entityType conocido
- **Convencion**: el CRUD generic auto-generado (`createWorkflow`, etc.) coexiste pero **NO debe usarse** en codigo productivo. Documentar en `.ai/PATTERNS.md` del mod: causas (validaciones no se ejecutan en generic), efectos (data invalida puede entrar a BD), alternativa correcta (usar las `*Validated`).
- **Alternativas descartadas**:
  - Override del CRUD generic (colision con auto-generado, sin mecanismo de override)
  - Hooks/validators per-objeto en codegen UP1 (cambio platform, ~5-8 SP, fuera de scope SP3)
  - Trigger BD BEFORE INSERT (anti-patron UP1 — convencion: logica en resolvers/workers)
  - Solo validar en cliente / seed (data invalida puede entrar via GraphQL playground o integraciones futuras)
- **Consecuencias**:
  - HU4 (UPONE-1100) consume `createWorkflowTransitionValidated` y `createWorkflowTransitionHistoryValidated` para sus transitions runtime — no re-implementa validaciones.
  - HU2 (UPONE-1098) consume `createWorkflowTransitionHistoryValidated` desde el worker BullMQ — no re-implementa append-only ni validacion de comment.
  - Frontend / clientes futuros: documentacion clara en `.ai/PATTERNS.md` con la convencion + causas/efectos.
  - El CRUD generic coexiste como "back door" para data trusted (seed, migraciones controladas). Si se usa runtime sin validar, el riesgo lo asume el caller.
  - Cuando platform habilite hooks/validators per-objeto en codegen (SP4+ estimado), las mutations `*Validated` pueden retirarse y migrarse al mecanismo central.
- **Session**: Session 7 del ticket (S7 del plan execute) — actualizado en este intake post-research del codebase.

### DEC-LOCAL-04: Campo `workflow.status` renombrado a `workflow.lifecycle` por colision en codegen UP1

- **Contexto**: Confluence v1.10 declara campo `workflow.status` enum (Draft/Active/Archived). Al ejecutar `npm run sync` en S6.T5, Prisma falla con "The model 'workflowStatus' cannot be defined because a enum with that name already exists."
- **Drivers**: hardcoded del codegen UP1 (`generatePrismaSchema.js:926`) genera nombres de enum como `{objectType}{FieldNameCapitalized}`. Para `workflow.status` → enum `workflowStatus`. Colisiona con el modelo `workflowStatus` (objeto separado).
- **Opcion elegida**: renombrar el **campo** de `status` a `lifecycle`. Enum generado: `workflowLifecycle` (no colisiona). Semantica preservada (ciclo de vida del workflow).
- **Alternativas descartadas**:
  - Renombrar el modelo `workflowStatus` → desvia del nombre canonico Confluence
  - Modificar el codegen UP1 para custom enum names → cambio cross-project, fuera de scope HU3
- **Consecuencias**:
  - Adaptacion vs Confluence v1.10: campo se llama `lifecycle` en codigo (Confluence dice `status`)
  - Layer GraphQL expone `workflow.lifecycle` enum `workflowLifecycle` con 3 valores
  - Snapshot-sp3 L3 debe anotar la adaptacion
  - Eventualmente Confluence puede actualizarse para reflejar nombre del codebase (decision PM, post-SP3)
- **Session**: Session 6 (S6.T2 + S6.T5)

### DEC-LOCAL-05: FKs a `core_User` con `type: integer` (no UUID)

- **Contexto**: Confluence v1.10 declara `workflow.createdBy: UUID` y `workflowTransitionHistory.userId: UUID`. Al ejecutar sync, Prisma falla con "The type of the field `createdBy` in the model `workflow` is not matching the type of the referenced field `id` in model `core_User`."
- **Drivers**: convencion UP1 — modelos `core_*` tienen `id Int @id @default(autoincrement())`. Modelos business (workflow, etc.) tienen `id String @id @default(cuid())`. Codegen UP1 distingue ambos casos (line 197: `fkType = baseModelName.startsWith('core_') ? 'Int' : 'String'`). La FK debe matchear el tipo del id referenciado.
- **Opcion elegida**: tipar `createdBy` y `userId` como `"type": "integer"` en JSON. FKs Prisma se generan como `Int`. Consistente con otros archivos del core que referencian core_User (`attendance.json`, `issue.json`, `journal.json`).
- **Alternativas descartadas**:
  - Esperar a que core_User cambie a UUID → fuera de scope HU3
  - Crear un nuevo modelo `User` (cuid String) y FK ahi → duplica modelos
- **Consecuencias**:
  - Adaptacion vs Confluence v1.10: tipo de campo es integer (Confluence dice UUID)
  - Semantica preservada (FK al usuario)
  - Snapshot-sp3 debe anotar la convencion como adaptacion al codebase UP1
- **Session**: Session 6 (S6.T2 + S6.T4 + S6.T5)

### DEC-LOCAL-03: `static_default` boolean como string en JSON object definitions

- **Contexto**: hallazgo H6 del intake reporto que `curricularSection.isSynchronizable` usa `static_default: "true"` (string) en codigo y dudo si el codegen requiere literales boolean o si acepta ambos. Decision tomada en Session 5 del ticket (S5 del plan).
- **Drivers**: paridad con codebase + RULE-mods-026 (consistency con patterns existentes) + DET-11 (KB-first)
- **Opcion elegida**: usar **strings** `"true"` / `"false"` en los 4 JSONs de HU3
- **Alternativas**: literales boolean — funcionan tambien (el codegen normaliza ambos en `generatePrismaSchema.js:326-330`) pero rompen consistencia con codebase
- **Consecuencias**: data-model-jsons.md del draft v1 propuso literales — debe ajustarse antes de S6. El smoke runtime de S5.T1 no se ejecuto — la decision se tomo con evidencia documental (codigo del codegen + 10+ archivos base + 3 del propio mod)
- **Session**: Session 5 del ticket (S5 del plan execute)

### DEC-LOCAL-02: 5 history demo con entityId huerfanos

- **Contexto**: Confluence menciona "5 history demo" sin especificar; intake propuso UUIDs ficticios para demostrar polimorfismo
- **Drivers**: simplicidad + valor como fixture para HU2/HU4 + sin ampliar scope con instancias de objetos no implementados
- **Opcion elegida**: 5 entries con entityId `demo-*` etiquetados con comment `DEMO:`. Cleanup defer a SP4
- **Alternativas**: entries reales sobre activities legacy (rechazado por incoherencia con flujo de transiciones); crear instancias demo de curriculumPlan/changeRequest (rechazado por aumento de scope)
- **Consecuencias**: la vista de HU2 renderiza demos + reales coexistiendo; cleanup queda como backlog SP4
- **Session**: pre-design (intake Session 8)

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Tiempo de query `workflowTransitionHistories(filter: entityType+entityId)` con 100K rows en BD UPU | N/A (objeto no existe) | < 100ms p95 | Test perf + Grafana post-deploy |
| Adopcion del modelo workflow por mods | 0 mods | 1 (curriculum-design via activity en HU4) | Conteo de objetos con `workflowId/currentStatusId` en `up1/object-manager/objects/business/` |
| Tests passing del area workflow | 0 | 100% (10+ tests) | `npm test` output |

## Technical reference

### Codegen UP1 schema JSON

Patron para los 4 objetos:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "{nombreCamelCase}",
  "type": "object",
  "metadata": { "label": "...", "labelPlural": "...", "description": "..." },
  "properties": {
    "{campo}": { "type": "string|boolean|number", "title": "...", "not_null": true|false, "enum": [...], "isForeignKey": true, "references": "...", "targetField": "id", "static_default": "..." }
  },
  "required": [...],
  "indexes": ["col1, col2"]
}
```

Codegen genera: Prisma model + enum (si aplica) + GraphQL type + CRUD mutations (RULE-core-008). Procesa via 10-fase `npm run sync`.

### Esquema Prisma esperado (resumen)

Detalle completo en `tickets/ticket-018.draft/data-model.prisma`. Highlights:

- 4 enums: `WorkflowStatusCategory` (5), `WorkflowStatusLifecycle` (2), `WorkflowScopeType` (5), `WorkflowLifecycle` (3)
- 4 models con FKs + relations bidireccionales
- 5 indexes (institutionId × 2, scopeType, entityType+entityId, transitionId, userId)
- 5 unique compuestos (declarables) + 1 partial unique (validacion runtime)

### Convencion de naming

- **camelCase** en titles de JSON + valores polimorficos (`workflow.scopeType`, `workflowTransitionHistory.entityType`)
- Codigos de statuses UPU: `BOR`, `EDIT`, `REV-DEC`, `PUB`, `DIS`, `PROP`, `EVAL`, `APR`, `REJ` (estables para integraciones)
- Names de workflows UPU: `{scopeType}-{variant}` (`activity-standard`, `activity-fast`, `curriculumPlan-standard`, etc.)

### Patron de validacion en resolver custom

```js
// mods/curriculum-design/logic/resolvers/workflow.js
export async function createWorkflow(_parent, { input }, { prisma, tenantId }) {
  // 1. Validacion runtime partial unique isDefault
  if (input.isDefault === true) {
    const existing = await prisma.workflow.findFirst({
      where: { institutionId: input.institutionId, scopeType: input.scopeType, isDefault: true }
    })
    if (existing) {
      throw new Error(`Ya existe un workflow default para scopeType=${input.scopeType} en esta institucion (${existing.name})`)
    }
  }
  // 2. Inherit standard codegen create
  return prisma.workflow.create({ data: input })
}
```

### Test integration patron

```js
// mods/curriculum-design/tests/resolvers/createWorkflowTransition.spec.js
import { expect, test } from 'vitest'
import { createTestContext } from '../_helpers/context.js'

test('rechaza self-transition (from!=to)', async () => {
  const { prisma, resolver } = await createTestContext('UPU')
  const wf = await prisma.workflow.create({ data: { /* ... */ } })
  const status = await prisma.workflowStatus.create({ data: { code: 'BOR', /* ... */ } })

  await expect(
    resolver.createWorkflowTransition(null, {
      input: { workflowId: wf.id, fromStatusId: status.id, toStatusId: status.id, name: 'invalid', requiresComment: false }
    }, { prisma, tenantId: 'UPU' })
  ).rejects.toThrow(/self-transition/i)
})
```

## Rules discovered

(Se llena durante ejecucion)

## Bugs found

(Se llena si se descubren problemas)

## Acceptance checkpoints

### Funcional + tests + integration

- [ ] **Funcional**: scenarios de REQ-01..REQ-07 pasan (smoke S9.T3 + tests S9.T1, S9.T2)
- [ ] **Tests**: 10+ tests nuevos (3 E2E + 7 integration) pasan; coverage > 80% en archivos nuevos
- [ ] **NFRs**: query polimorfica < 100ms con seed cargado; tenant isolation 100% en tests
- [ ] **Rules DKC**: RULE-core-002 (codegen via JSON), RULE-core-008 (no CRUD custom), RULE-mods-008 (seed en mod) respetadas
- [ ] **Integration**: `npm run drift:check` sin diferencias; seed legacy (UV/AIEP) sigue cargando OK
- [ ] **Docs**: seed/README actualizado; .ai/PATTERNS.md anexo presente

### Calidad de codigo (DET-23 — reforzado tras 2026-05-13)

- [ ] **Lint**: `npm run lint --workspace=@uplanner/object-management-backend` sin errores nuevos en archivos del mod
- [ ] **Typecheck**: `npm run typecheck` del mod (o equivalente `vue-tsc --noEmit`) sin errores nuevos respecto al baseline TICKET-014
- [ ] **Limites de codigo**: max ~40 lineas/funcion, ~400 lineas/archivo (regla CLAUDE.md global); resolvers nuevos respetan
- [ ] **Sin `any` en TypeScript**: tipado explicito en cualquier helper/type del mod
- [ ] **Sin magic numbers/strings**: codigos de error como constantes (`WORKFLOW_DOUBLE_DEFAULT`, `WORKFLOW_SELF_TRANSITION`, `WORKFLOW_HISTORY_COMMENT_REQUIRED`, `WORKFLOW_HISTORY_APPEND_ONLY`)
- [ ] **Comentarios**: validaciones runtime de constraints no-Prisma (partial unique, from!=to, append-only, comment-required) tienen comentario en espanol explicando el "por que" no obvio
- [ ] **Compliance con `.ai/PATTERNS.md` del mod**: resolvers nuevos siguen patron del mod (imports, error handling, helper structure)
- [ ] **Code review (reviewer agent)**: las 5 sessions tienen bloque `#### Quality review (DET-23)` persistido en `## Sessions` del ticket con las 10 dimensiones evaluadas (las que apliquen)
- [ ] **Coverage delta vs baseline TICKET-011**: cobertura global del mod no degrada
- [ ] **Logging consistente**: seed nuevo usa formato `[curriculum-design seed] ...` igual que `loadUnivalle`/`loadAiep`

### Accesibilidad + Storybook

- [ ] **Accesibilidad**: `n/a` para HU3 — no toca UI. Validado en DET-23 dimension 8 como `n/a` en cada session
- [ ] **Storybook**: `n/a` para HU3 — sin componentes nuevos. Validado en DET-23 dimension 9 como `n/a` en cada session

## Archiving

(No aplica — spec activo)
