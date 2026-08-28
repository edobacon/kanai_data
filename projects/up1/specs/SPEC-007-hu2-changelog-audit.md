---
id: SPEC-007-hu2-changelog-audit
project: up1
ticket: TICKET-020
status: done
---

# HU2 — changeLog universal append-only para activity, curricularSection y curricularLink

# HU2 — changeLog universal append-only para activity, curricularSection y curricularLink

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes. Si te basta el Executive summary, ya tenes lo critico para aprobar.*

**Que se quiere**: Auditar **quien cambio que, cuando y por que** sobre los 3 objetos del curriculum (activity, curricularSection, curricularLink) en una tabla **append-only `changeLog`** universal. La captura es automatica: el decorator `withEventPublish` (UPONE-1052) ya publica los eventos a Redis Pub/Sub → un **workflow n8n minimo del mod** (versionado en `mods/curriculum-design/flows/audit-capture.json`, sincronizado por Phase 9 del `npm run sync`) actua como router → invoca un **resolver custom del mod** (`logic/auditCapture.resolver.js`) que hace el diff field-by-field e INSERTa en `changeLog`. **Cero LOC en core.** La consulta es un **tab "Historial"** declarativo en RecordDetail con 7 columnas (per AC4) renderizadas con `TableCell` nativo (scope A confirmado en draft v2). Cubre la evidencia para acreditacion academica (ABET / SACSCOC / CNA).

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **AC6 mecanismo C (event-driven via Redis Pub/Sub + n8n + resolver custom del mod)** invierte la recomendacion del PM (A/B Prisma middleware o resolver wrapper). 4 drivers: scope mod estricto **cero core touch real**, UPONE-1052 entrega `_previousData` plug-and-play, n8n + Phase 9 syncFlows como patron canonico del platform, latencia aceptable | A/B requieren tocar `object-manager/` core. La opcion C confirmada se apoya 100% en infra existente (decorator + Pub/Sub + Phase 9 syncFlows). Si PM no acepta, hay que escalar — pero ahora el argumento es mas fuerte porque ningun otro approach es viable sin core touch |
| 2 | **Render del tab con TableCell nativo** (scope A — sin componentes custom Vueform). Texto i18n para `action`/`source`, monospace concatenado para diff `antes → despues` | Draft v2 ya aprobado. Componente custom con badges + diff visual → backlog item `B-follow-up-custom-table` (priority `should`) — se evalua post-cierre en UPU |
| 3 | **Captura via resolver custom + n8n router minimo** (`mods/curriculum-design/logic/auditCapture.resolver.js` + `flows/audit-capture.json`). El resolver concentra toda la logica TS (diff, edge cases, INSERTs); n8n es 2 nodos (Redis Trigger + GraphQL Mutation passthrough) | Approach pivotado durante design tras confirmar que `event-worker.js` core no tiene infra de plugins. **Cero LOC en core**. Patron canonico del mod (custom resolvers ya en uso) + canonico del platform (n8n workflows sincronizados). **OQ1 reformulada — validar topologia del flow** |
| 4 | **8 event JSONs declarativos manuales** (`activity-create/update/delete` + 3 de `curricularSection` + 3 de `curricularLink`) — sin `audited-objects.json` central con generador | Los event JSONs siguen siendo necesarios para que el decorator haga pre-fetch + publish a Pub/Sub. Generador agrega +0.25 SP. **Decision a confirmar — Open question OQ2** |
| 5 | **Polimorfismo plano `entityType`** (`activity`, `curricularSection`, `curricularLink` sin sufijo por recordType/linkType) — PM Slack 2026-05-13 | Decision cerrada del PM. Simplifica filtros del tab a uno solo (`entityType + entityId`). Filtrar por recordType de curricularSection futuro: via JOIN |
| 6 | **Tab Historial vive en RecordDetails de subtypes de curricularSection** (7 layouts adicionales: LearningOutcome, Modality, EvaluationComponent, Content, Session, Bibliography, CustomSection) — opcion (a) del draft | Opciones (b) wrapper curricularSection y (c) consolidado en activity_view no respetan el filtro `entityType+entityId` del AC4. Costo: ~30% mas trabajo en S11 vs solo 3 layouts. Beneficio: cumple AC4 verbatim |

**Riesgos principales y como los mitigamos**:

- **Riesgo R1 — n8n como dependencia critica del audit log**: si n8n esta down, no se publican filas en `changeLog`. → Mitigaciones: (a) healthcheck del service `flow` en docker-compose + alertas; (b) n8n YA es critico para otros workflows del platform (no es regresion); (c) **migracion path documentada**: si en el futuro se quiere remover n8n del path, basta agregar un subscriber Redis del mod que invoque el mismo resolver `recordAuditEvent` (cero refactor de la logica TS).
- **Riesgo R2 — Batch transaccional cubierto INDIRECTO** (H8 partial del intake): rollback Prisma = sin evento publicado = sin changeLog. **TC-16 valida empirico** con test integration de mutation que falla mid-batch en S10.
- **Riesgo R3 — Pre-fetch de `withEventPublish.js` puede no funcionar para `curricularSection` polimorfico** (recordType=LearningOutcome/Modality/etc.) → smoke test temprano en S9 con event JSON `curricularSection-update.json` antes de avanzar.
- **Riesgo R4 — 7 layouts subtypes de curricularSection x cambio repetitivo** → snippet copiable + grep cross-verificacion S11.T4. Si el costo crece, escalar OQ6.
- **Riesgo R5 — Acreditacion academica puede requerir badges/diff visual** que el scope A no entrega → item `B-follow-up-custom-table` (priority `should`) en backlog.
- **Riesgo R6 — Workflow n8n con bugs en concurrency / retry / dead-letter** podria perder eventos. → Mitigacion: el resolver custom `recordAuditEvent` es idempotente sobre `entityId+createdAt+field` (puede sufrir duplicados de bajo impacto, NO perdida). n8n config explicit en el flow JSON (retries: 3, backoff: exponential).

**Que NO se hace en este ticket** (limites explicitos del scope):

- Componente custom Vue para tab (`HistorialAuditLogElement.vue` con badges + diff visual + avatar chip + expand row) — diferido a `B-follow-up-custom-table` (post-cierre HU2)
- Auditoria sobre otros objetos del mod o de otros mods (academicCalendar, periods, etc.) — el patron extensible queda documentado en `.ai/PATTERNS.md` para que HU5+ adopten
- Cleanup de demos huerfanos del seed UPU HU3 — diferido a SP3 (HU2-D4 del intake)
- Reportes / exports del audit log (CSV/Excel/PDF) — fuera de scope ticket; queryeable solo via UI tab + Prisma Studio si se necesita
- Retencion 7 anos (Confluence) — fuera de scope; politica de archivado se aborda en SP3+
- Migrar `centralSchemaTracker` (UPONE-204 antecesor) — scope distinto (schema-level vs instance-level)

**Tamano estimado**: **6 sessions** (S8-S13) para **5 SP**. La mas riesgosa es **S9** (`⚑ fuerte` T2) — crear resolver custom + 8 event JSONs + n8n workflow + handler logic (diff field-by-field). Si el resolver expone bugs en el shape del payload del Pub/Sub (vs el shape que el decorator publica), S9 escala el plan a `iterate`.

**Como vas a saber que funciona**:

- Crear/editar/eliminar una activity en UPU sandbox → tab "Historial" del activity muestra 1+ rows en menos de 5 segundos con la informacion correcta (action, source, field, oldValue → newValue, user)
- Disparar transition `BOR → EDIT` en activity-standard de HU3 → row con `action=StateTransition` + `source=Workflow` + link FK a `workflowTransitionHistory`
- Smoke transition en `aa-uv-1124` y `TIR101` (entries reales de HU4) → tab Historial renderiza con datos reales
- Render del tab sobre `curricularSection` subtype `Modality` con entries demo huerfanos del seed HU3 → vista NO crashea aunque `entityId` no existe en BD (HU2-D1/D2)
- Usuario sin capability `activity:audit` → tab Historial NO aparece en el strip de tabs
- axe-core sobre tab en light + dark = 0 violations WCAG 2.1 AA (o mitigacion documentada)

---

## Purpose

Implementar auditoria universal `changeLog` (append-only, polimorfica via `entityType + entityId`) para los 3 objetos del SP2 — captura automatica via worker BullMQ + UI tab "Historial" declarativa con `RecordList`/`TableCell` nativo + RBAC granular. **Actor**: usuario admin/coordinador con capability `<obj>:audit`. **Layers**: backend (object-manager, worker), frontend (suite via LayoutOrchestrator), database (PostgreSQL via Prisma), config (mods/curriculum-design).

## Requirements

### REQ-IMPLEMENT-01: Objeto `changeLog` con tabla, indexes y enums

> **Que cambia**: el sistema gana un objeto nuevo `changeLog` (tabla PostgreSQL append-only) que registra todos los cambios sobre los objetos auditados. Es polimorfico — un solo objeto sirve para auditar activity, curricularSection, curricularLink (y futuros mods que adopten el patron).
> **Por que**: sin esta tabla universal, cada objeto requeriria su propia tabla de auditoria — multiplica codigo y rompe el patron extensible.

El sistema MUST registrar cada cambio auditable como una fila en la tabla `changeLog`. El JSON object schema del mod declara 12 properties (entityType, entityId, userId, action, source, field, oldValue, newValue, changeRequestId, workflowTransitionHistoryId, sourceRefId, comment). El codegen del platform agrega automaticamente: `id` Int autoincrement, `tenantId` String + index obligatorio, `createdAt` + `updatedAt` DateTime. Indexes declarados: `(entityType, entityId, createdAt)`, `(userId, createdAt)`. Total tabla generada: 16 columnas + 3 indexes (incluyendo el `tenantId` automatico).

**Actor**: system (worker BullMQ del mod)
**Layers**: backend (object-manager), database (Prisma)

<details><summary>Scenarios de validacion</summary>

#### Scenario: Codegen produce el schema correcto
- **GIVEN** `mods/curriculum-design/objects/changeLog.json` declara 12 properties + enums inline (action, source) + indexes en `metadata.indexes`
- **WHEN** se corre `npm run codegen` + `npx prisma migrate dev --name changelog_init`
- **THEN** la tabla `changeLog` existe en BD con 16 columnas (12 declaradas + 4 auto: id, tenantId, createdAt, updatedAt) + 3 indexes (`tenantId` auto, `(entityType, entityId, createdAt)`, `(userId, createdAt)`)
- **AND** el GraphQL schema generado expone enum types para action (7 valores) y source (6 valores) — enforce de valores validos a nivel GraphQL (no Prisma enum top-level)

#### Scenario: Append-only por convencion (no expone update/delete via API custom)
- **GIVEN** el mod tiene capabilities `activity:audit`, `curricularsection:audit`, `curricularlink:audit` configuradas
- **WHEN** un cliente GraphQL invoca `updateChangeLog` o `deleteChangeLog`
- **THEN** los resolvers o no existen, o estan tipados como deprecated/internal

#### Scenario: Multi-tenant filtrado
- **GIVEN** entries de tenant A y tenant B en la tabla
- **WHEN** un user del tenant A consulta el tab Historial de una activity de su tenant
- **THEN** solo ve entries con `tenantId = A` (filtrado implicito via context Clerk)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: con Prisma Studio (`npm run tenant:studio`), abrir la tabla `changeLog` y ver que las columnas (12 declaradas + 4 auto: id, tenantId, createdAt, updatedAt) + 3 indexes coinciden con el AC1 del ticket.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-1 | Codegen produce changeLog | changeLog.json declarado | `npm run codegen` + migrate | Tabla + indexes en BD | 16 cols (12 declaradas + 4 auto), 3 indexes (tenantId auto + 2 declaradas), enums inline en GraphQL |
| TC-2 | API append-only | mod sin update/delete custom | Mutation `updateChangeLog` | Rechaza o resolver ausente | Resolver tipado deprecated/internal |

---

### REQ-IMPLEMENT-02: Captura automatica Create / Update / Delete / StateTransition

> **Que cambia**: cuando un usuario crea/edita/elimina una activity (o curricularSection/curricularLink), o cuando un workflow ejecuta una transition, el sistema escribe **automaticamente** una fila en `changeLog` sin que el codigo de la mutation tenga que llamar a nada.
> **Por que**: si la captura se delegara a cada resolver, cada mutation futura tendria que recordar invocar al audit log. La captura automatica via worker BullMQ + `_previousData` (UPONE-1052) es plug-and-play.

El sistema MUST registrar 1 entry `changeLog` por Create, 1 por Delete, 1 por StateTransition, y **N entries por Update** (1 fila por campo modificado).

**Actor**: system (worker BullMQ via dispatch desde processEvent)
**Layers**: backend (object-manager core dispatch + handler del mod), database

<details><summary>Scenarios de validacion</summary>

#### Scenario: Create
- **GIVEN** event JSON `activity-create.json` declarado en el mod + worker corriendo
- **WHEN** un user invoca `createActivity` con un payload minimo
- **THEN** 1 row en `changeLog` con `entityType="activity"`, `entityId=<new id>`, `action="Create"`, `source="DirectEdit"`, `userId=<actor>`, sin `field/oldValue/newValue`

#### Scenario: Update (1 row por field modificado)
- **GIVEN** activity existente con `name="Algebra Lineal"`, `credits=3`
- **WHEN** un user invoca `updateActivity` con `name="Algebra Lineal I"`, `credits=4`
- **THEN** **2 rows** en `changeLog`: una con `field="name"`, oldValue="Algebra Lineal", newValue="Algebra Lineal I"; otra con `field="credits"`, oldValue="3", newValue="4"
- **AND** ambas con mismo `userId`, mismo `createdAt` (±1s), mismo `source="DirectEdit"`

#### Scenario: Delete
- **GIVEN** activity existente
- **WHEN** un user invoca `deleteActivity`
- **THEN** 1 row con `action="Delete"`, sin `field/oldValue/newValue`

#### Scenario: StateTransition (consume activity-transition.json existente de HU3)
- **GIVEN** event JSON `activity-transition.json` ya existe (creado por HU3 TICKET-018), workflow `activity-standard` activo
- **WHEN** se invoca `transitionActivityValidated` exitosamente (BOR → EDIT)
- **THEN** 1 row con `action="StateTransition"`, `source="Workflow"`, `workflowTransitionHistoryId` poblado con FK al `workflowTransitionHistory.id` creado por HU3
- **AND** `entityType` copiado **desde la fila wth** (no del payload del evento — L8 sync del SP2)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: editar una activity en UPU → en menos de 5s ver las filas correspondientes en el tab Historial (1 por campo modificado).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-3 | Create captura 1 row | event JSON declarado | createActivity | 1 row con action=Create | source=DirectEdit, sin field |
| TC-4 | Update N rows por campo | event JSON + activity | updateActivity 3 campos | 3 rows | field/oldValue/newValue poblados |
| TC-5 | Delete 1 row | event JSON | deleteActivity | 1 row action=Delete | sin field |
| TC-6 | StateTransition link FK | activity-transition.json + HU3 | transitionActivityValidated | 1 row | workflowTransitionHistoryId poblado, entityType copiado de wth |

---

### REQ-IMPLEMENT-03: Patron extensible via event JSONs declarativos

> **Que cambia**: para agregar un objeto nuevo al scope auditable basta con declarar 3 event JSONs (`<obj>-create.json`, `<obj>-update.json`, `<obj>-delete.json`) en `mods/<mod>/events/` + agregar la capability `<obj>:audit` + agregar el tab "Historial" al layout default. Sin tocar codigo central.
> **Por que**: el AC3 del ticket pedia `auditable: true` como meta-flag en el JSON object — flag no existe en platform y tocaria codegen. El patron de event JSONs declarativos es viable hoy sin tocar core.

El sistema MUST permitir agregar nuevos objetos auditables sin modificar codigo del worker base ni de `object-manager`.

**Actor**: dev de mod
**Layers**: backend (event JSONs en mod), config

<details><summary>Scenarios de validacion</summary>

#### Scenario: Agregar nuevo objeto auditable
- **GIVEN** un mod con objeto `X` sin auditoria
- **WHEN** el dev crea `mods/<mod>/events/X-create.json` + `X-update.json` + `X-delete.json` + capability `x:audit` + `npm run sync`
- **THEN** mutations sobre X disparan eventos BullMQ; el handler del mod los procesa y escribe filas en `changeLog` con `entityType="X"`

#### Scenario: Sin event JSON, no se audita (zero performance hit)
- **GIVEN** un objeto Y sin event JSONs declarados
- **WHEN** se invoca `updateY`
- **THEN** el decorator `withEventPublish.js` NO hace pre-fetch (cero query extra), NO publica evento, NO escribe en `changeLog`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: documentado en `mods/curriculum-design/.ai/PATTERNS.md` con receta de 4 pasos (declarar 3 event JSONs + capability + tab + sync).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-7 | Patron extensible | mod X sin auditoria | crear 3 event JSONs + sync + mutation | Worker captura sin tocar core | 1 row en changeLog para createX |

---

### REQ-IMPLEMENT-04: UI tab "Historial" en RecordDetail con 7 columnas

> **Que cambia**: en la pestaña "Historial" del RecordDetail de una activity, curricularSection o curricularLink, el usuario ve una tabla con 7 columnas (`Cuando`, `Usuario`, `Accion`, `Origen`, `Campo`, `Antes → Despues`, `Comentario`) filtrable y paginada, mostrando los entries del `changeLog` correspondientes al record abierto.
> **Por que**: AC4 del ticket. Render con `RecordList` + `TableCell` nativos (scope A — INT-A) — texto i18n para action/source, monospace concatenado para diff. Sin componentes custom.

El sistema MUST renderizar el tab "Historial" en RecordDetail mediante embed `record-list` declarativo en el JSON layout, filtrado por `entityType + entityId={{parentId}}`, ordenado por `createdAt DESC`, con las 7 columnas literal del AC4 del ticket.

**Actor**: usuario con capability `<obj>:audit` del objeto correspondiente
**Layers**: frontend (suite via LayoutOrchestrator), config (layouts del mod)

<details><summary>Scenarios de validacion</summary>

#### Scenario: Render basico sobre activity
- **GIVEN** `default_activity_view.json` modificado con tab "Historial" al final, capability `activity:audit` activa para el user
- **WHEN** se navega a `/UPU/activity/aa-uv-1124` y se selecciona tab Historial
- **THEN** se ve la tabla con 7 columnas, filtros activos `entityType=activity` + `entityId=aa-uv-1124`, orden `createdAt DESC`
- **AND** action/source se muestran como texto i18n: "Crear" / "Actualizar" / "Eliminar" / "Transicion de estado" / "Sync MADS" / "Importacion" / "Restaurar" + "Edicion directa" / "Workflow" / "Solicitud de cambio" / "MADS" / "Importacion" / "Calculo del sistema"
- **AND** diff `oldValue → newValue` aparece concatenado en monospace en 1 sola celda (OQ11 cerrada — opcion 1-cell)

#### Scenario: curricularLink — entityType plano
- **GIVEN** curricularLink existente, capability `curricularlink:audit` activa
- **WHEN** se navega a tab Historial
- **THEN** filtro `entityType=curricularLink` (sin sufijo por linkType — INT-4)

#### Scenario: curricularSection subtypes — tab en cada layout (7 layouts adicionales)
- **GIVEN** layouts `default_rt__Modality__curricularsection_view.json`, `default_rt__LearningOutcome__curricularsection_view.json`, etc. (7 subtypes)
- **WHEN** se navega a RecordDetail de cualquier subtype
- **THEN** el tab Historial aparece al final, con filtro `entityType=curricularSection` (plano per INT-4, sin sufijo por recordType)

#### Scenario: Demos huerfanos del seed HU3 (HU2-D1, HU2-D2)
- **GIVEN** entries de `workflowTransitionHistory` con `entityId="demo-activity-001"` (no existe en tabla `activity`)
- **WHEN** se renderiza el tab que las incluye
- **THEN** la vista NO crashea — muestra las filas con el entityId tal cual, sin intentar JOIN-resolve al record

</details>

#### Acceptance
**El usuario puede verificar que funciona**: navegar a `/UPU/activity/aa-uv-1124` post-HU3+HU4 smoke → tab Historial muestra al menos 1 entry real generada por HU4.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-8 | Tab activity render | layout modificado + entries | abrir RecordDetail activity, tab Historial | 7 cols + filtros + orden DESC | datos correctos visibles |
| TC-9 | Tab curricularLink | layout + entries | abrir RecordDetail curricularLink, tab | filtro entityType=curricularLink plano | render OK |
| TC-10 | Tab curricularSection subtype Modality | 7 layouts + entries | abrir RecordDetail Modality | filtro entityType=curricularSection | render OK con entries del subtype |
| TC-11 | Demos huerfanos | entries con entityId=demo-X | abrir tab | no crashea | filas renderizadas con entityId tal cual |

---

### REQ-IMPLEMENT-05: RBAC granular `<obj>:audit` gating del tab

> **Que cambia**: el tab "Historial" solo aparece en el strip de tabs si el usuario tiene la capability `<obj>:audit` correspondiente al objeto que esta viendo. Sin la capability, el tab NO se renderiza.
> **Por que**: AC5 del ticket. PM recomendo opcion B (granular `<obj>:audit`) sobre opcion A (`changelog:view` global) — coherencia con el patron del mod (TICKET-019 establecio capabilities object-level sin prefix `mod/`).

El sistema MUST gateaer el tab Historial via capability `<obj>:audit` object-level sin prefix `mod/`.

**Actor**: cualquier usuario
**Layers**: frontend (RecordDetail tab rendering condicional), backend (capabilities check)

<details><summary>Scenarios de validacion</summary>

#### Scenario: Con capability → tab visible
- **GIVEN** user con `activity:audit` en su rol
- **WHEN** abre RecordDetail de una activity
- **THEN** el tab "Historial" aparece al final del strip de tabs

#### Scenario: Sin capability → tab oculto
- **GIVEN** user sin `activity:audit`
- **WHEN** abre RecordDetail de una activity
- **THEN** el tab "Historial" NO aparece en el strip; los otros tabs (General, Modalidades, etc.) si

#### Scenario: Cross-object gating
- **GIVEN** user con `activity:audit` pero NO con `curricularsection:audit`
- **WHEN** abre RecordDetail de una activity → ve tab; abre RecordDetail de un curricularSection → NO ve tab

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en `capabilities.json` del mod aparecen `activity:audit`, `curricularsection:audit`, `curricularlink:audit` sin prefix. UPU smoke con 2 roles (uno con `:audit`, otro sin) muestra el tab condicionalmente.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-12 | Capabilities registradas | capabilities.json del mod | sync | 3 capabilities object-level sin prefix mod/ | activity:audit, curricularsection:audit, curricularlink:audit |

---

### REQ-IMPLEMENT-06: Captura via resolver custom del mod + n8n workflow router (cero core touch)

> **Que cambia**: cuando una mutation auditable se ejecuta, el decorator `withEventPublish` (ya existente, UPONE-1052) publica el evento al canal Redis Pub/Sub `{tenantId}/{ObjectType}/core:{operation}`. Un workflow n8n del mod (`mods/curriculum-design/flows/audit-capture.json`, sincronizado a la instancia n8n via Phase 9 del `npm run sync`) se subscribe a esos canales y actua como router minimo: invoca la mutation custom `recordAuditEvent(input)` del mod, que es donde vive TODA la logica del handler (diff, edge cases, INSERTs).
> **Por que**: AC6 del ticket. La opcion C (event-driven) invierte la recomendacion del PM (A/B Prisma/resolver) — DEC-LOCAL-01 documenta los 4 drivers. **Cero LOC en core** porque el decorator + Pub/Sub + Phase 9 syncFlows YA existen como infra del platform. La logica vive en TypeScript del mod (testeable con vitest); n8n es solo router declarativo.

El sistema MUST capturar cambios auditables sin tocar codigo de `object-manager/` core, usando el resolver custom `mods/curriculum-design/logic/auditCapture.resolver.js` invocado por un n8n workflow versionado en `mods/curriculum-design/flows/audit-capture.json`.

**Actor**: system
**Layers**: backend (resolver custom del mod), n8n (workflow declarativo), Redis Pub/Sub (transporte)

<details><summary>Scenarios de validacion</summary>

#### Scenario: Workflow n8n se sincroniza automaticamente via Phase 9 syncFlows
- **GIVEN** `mods/curriculum-design/flows/audit-capture.json` versionado en git con shape valido (name, nodes, connections, settings.up1Source)
- **WHEN** se corre `npm run sync` con la instancia n8n corriendo
- **THEN** Phase 9 (`object-manager/scripts/sync/flowSync.js:syncFlows`) upserts el workflow via n8n REST API usando `settings.up1Source="curriculum-design/audit-capture"` como identificador estable
- **AND** logs de sync indican "Found 1 flow file(s)" + "✅ curriculum-design/flows/audit-capture.json: valid"

#### Scenario: n8n flow recibe el evento Pub/Sub e invoca el resolver
- **GIVEN** workflow n8n con 2 nodos: [1] Redis Trigger subscribed a pattern `*/Activity/core:*` (y CurricularSection / CurricularLink), [2] GraphQL Mutation node con `mutation { recordAuditEvent(input: $payload) { id } }`
- **WHEN** un user ejecuta `updateActivity(...)` que dispara el publish del decorator
- **THEN** n8n recibe el mensaje, lo passthrough al resolver `recordAuditEvent` del mod con el payload completo (data, _previousData, _triggeredBy, objectType, operation)
- **AND** el resolver retorna las filas insertadas

#### Scenario: Diff field-by-field en el resolver
- **GIVEN** payload `{ objectType: "Activity", operation: "update", data: { id: "X", name: "X", credits: 4 }, _previousData: { id: "X", name: "Y", credits: 3 }, _triggeredBy: { userId: "U" } }`
- **WHEN** el resolver `recordAuditEvent` procesa
- **THEN** itera campos comunes, detecta 2 diferencias, emite 2 rows en `changeLog`
- **AND** campos excluidos (OQ5: `updatedAt`, `createdAt`, `version`, internos Prisma `_*`, `lockedBy`, `tenantId`) NO generan filas

#### Scenario: StateTransition usa mutation custom validated (INT-6)
- **GIVEN** evento de `activity-transition` con `_transitionContext.workflowTransitionHistoryId`
- **WHEN** el resolver procesa
- **THEN** lee wth via FK + copia `entityType` desde wth (L8 sync del SP2), e invoca `createWorkflowTransitionHistoryValidated` (NO el CRUD generic) — maneja codigos `WORKFLOW_HISTORY_COMMENT_REQUIRED`/`INVALID_USER`/`INVALID_TRANSITION` con retry (el flow n8n hace el retry segun configuracion)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: con la instancia n8n abierta en `http://localhost:5678`, ver el workflow "Audit Capture - changeLog" activo + executions en tiempo real al ejecutar mutations.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-13 | n8n flow upsert via Phase 9 | flow JSON valido en mod | `npm run sync` | Phase 9 upsert exitoso | workflow visible en n8n UI con up1Source correcto |
| TC-14 | Diff field-by-field en resolver | payload con 3 cambios | resolver procesa | 3 rows | field/oldValue/newValue correctos por fila |

---

### REQ-PRESERVE-01: Batch transaccional rollback revierte changeLog (indirecto)

> **Que cambia**: si una mutation falla mid-batch (ej. update de 5 records en 1 transaccion Prisma, falla el 3ro), las filas `changeLog` correspondientes a los records ya procesados NO quedan en la BD.
> **Por que**: el ticket pide "batch transaccional revierte changeLog". H8 del intake es partial — la cobertura es INDIRECTA: si Prisma rollback, el evento BullMQ NO se publica (decorator emite POST-resolver). TC-16 valida empirico.

El sistema MUST mantener consistencia entre el estado de los records auditados y el `changeLog` — si la mutation rollback, no debe quedar `changeLog` huerfano.

**Actor**: system
**Layers**: backend (decorator + worker), database

<details><summary>Scenarios de validacion</summary>

#### Scenario: Mutation rollback = sin changeLog
- **GIVEN** batch update sobre 5 activities, la 3ra dispara un error de validacion
- **WHEN** Prisma transaction hace rollback
- **THEN** las 5 activities siguen con datos previos en BD
- **AND** la tabla `changeLog` NO contiene filas correspondientes a las 5 mutations (porque el evento BullMQ no se publico — `withEventPublish.js` emite POST-resolver)

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-16 | Batch rollback indirecto | mutation que falla mid-batch | rollback Prisma | 0 rows nuevas en changeLog | H8 confirmada empirica |

---

### REQ-PRESERVE-02: JSON >10KB con hash + truncar 1KB + nota

> **Que cambia**: si un campo modificado tiene un valor `oldValue` o `newValue` que supera 10KB (ej. campo `description` largo, JSON estructurado), el worker lo hashea (sha256), trunca a 1KB y guarda una nota indicando el hash.
> **Por que**: edge case del ticket. Evita filas gigantes que rompan paginacion + queries del tab.

El sistema MUST truncar `oldValue`/`newValue` a 1KB cuando el valor original supera 10KB, registrando el hash sha256 inline en el valor truncado.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-17 | JSON >10KB truncado | campo description con 15KB | Update | row con oldValue/newValue truncados a 1KB | inline `[truncado · sha256:XXX]` |

---

### REQ-PRESERVE-03: Soft / hard delete + Restore registra ambos

> **Que cambia**: si una activity se soft-deletea (mark inactive), se registra `action=Delete`. Si despues se restaura, se registra `action=Restore` — dejando trazabilidad de la "vida" del record.
> **Por que**: acreditacion requiere ver tanto la baja como la reactivacion. Sin Restore explicito, la unica forma de saber que un record borrado volvio es por contexto temporal de queries.

El sistema MUST registrar Delete y Restore como acciones distintas, vinculadas por la misma `entityId`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-18 | Delete + Restore secuencia | activity activa | deleteActivity + restoreActivity | 2 rows: Delete + Restore | mismo entityId, distintas action |

---

### REQ-PRESERVE-04: Campos calculados NO se auditan

> **Que cambia**: campos como `updatedAt`, `createdAt`, `version`, internos Prisma (`_*`, `lockedBy`) NO generan filas en `changeLog` — son ruido.
> **Por que**: el ticket dice "updatedAt + lista por convencion" sin enumerar. OQ5 cierra la enumeracion explicita.

El sistema MUST excluir de la auditoria los campos: `updatedAt`, `createdAt`, `version`, todos los que empiezan con `_` (Prisma internos), `lockedBy`, `tenantId` (constante por contexto).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-19 | Campos excluidos | Update que solo modifica updatedAt | mutation | 0 rows en changeLog | lista campos excluidos respetada |

---

### REQ-PRESERVE-05: `source=SystemCalculation` para cambios programaticos

> **Que cambia**: si un cambio se origina sin user context (cron, scheduled job, recalculo automatico), la fila se registra con `source=SystemCalculation` en lugar de `DirectEdit`.
> **Por que**: edge case del ticket. Distinguir cambios de usuario vs cambios del sistema es critico para acreditacion (responsabilidad).

El sistema MUST registrar `source=SystemCalculation` cuando `_triggeredBy.userId` es `null` en el payload del evento.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-20 | SystemCalculation cuando userId null | cron sin context user | Update programatico | row con source=SystemCalculation | userId=null |

---

### REQ-PRESERVE-06: a11y WCAG 2.1 AA del tab Historial

> **Que cambia**: el tab Historial cumple WCAG 2.1 AA — keyboard nav, ARIA labels, contraste suficiente, screen reader anuncia accion/source/diff sin depender solo de color.
> **Por que**: rule del mod (RULE-curriculum-design-001). Scope A simplifica esto — sin badges, no hay color como portador unico de informacion (OQ7 vieja resuelta trivialmente).

El sistema MUST cumplir WCAG 2.1 AA en el tab Historial — validado con axe-core en S12.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-21 | axe-core a11y | tab Historial light + dark | run axe-core | 0 violations o mitigacion documentada | WCAG AA pass |

---

### REQ-PRESERVE-07: Mutations validated workflow integran sin error (INT-6)

> **Que cambia**: el worker usa `createWorkflowTransitionHistoryValidated` del mod (NO el CRUD generic auto-generado de HU3) para escribir entries `workflowTransitionHistory` desde el handler de auditoria.
> **Por que**: INT-6 del intake. El CRUD generic NO valida constraints Confluence v1.10 (comment requerido, userId valido, transitionId valido). La mutation custom validated rechaza con codigos `WORKFLOW_HISTORY_*` que el handler maneja con retry/dead-letter.

El sistema MUST usar la mutation custom validated cuando escribe en `workflowTransitionHistory` desde el contexto de auditoria.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| TC-22 | Mutation validated path | activity-transition con comment faltante (requiresComment=true) | handler procesa | rechazado con WORKFLOW_HISTORY_COMMENT_REQUIRED | retry/dead-letter |

---

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | Query del tab Historial sobre activity con 1K entries | Latencia p95 | < 200ms (usa index `(entityType, entityId, createdAt)`) |
| Performance | Pre-fetch del decorator `withEventPublish.js` | Overhead por mutation auditable | < 10ms (1 query Prisma `findUnique` por id) |
| Performance | Diff field-by-field en el handler | Tiempo por evento | < 50ms para records con <50 fields |
| Scale | Volumen esperado de filas en `changeLog` | Filas/tenant/mes (estimacion) | hasta 100K — politica de archivado SP3+ (fuera de scope) |
| Security | RBAC del tab | Mecanismo | Capability `<obj>:audit` object-level sin prefix mod/ |
| Security | Inputs del filter bar del tab | Sanitizacion | RecordList nativo — heredada del platform (sin custom) |

## Artifacts

### Models — JSON object schema del mod

> **PATRON REAL DEL MOD (corregido 2026-05-19, L20)**: los objetos del mod viven en `mods/curriculum-design/objects/<Name>.json` (NO `objects/business/Base/`). Schema canonico: JSON Schema draft-07 con `metadata` up1-specific. **El codegen del platform (Phase 8) traduce esto a Prisma + GraphQL automaticamente**, incluyendo: agregar `tenantId` + `@@index([tenantId])`, declarar `id` Int autoincrement por default, inferir tipos Prisma desde JSON types. Enums viven inline en cada property (no como top-level Prisma enum). Indexes van en `metadata.indexes` como strings (el codegen los traduce). Patron tomado del objeto hermano [`workflowTransitionHistory.json`](mods/curriculum-design/objects/workflowTransitionHistory.json) (HU3 — patron probado y deployed).

**Archivo a crear**: `mods/curriculum-design/objects/changeLog.json` con shape:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "changeLog",
  "type": "object",
  "metadata": {
    "label": "Change Log",
    "labelPlural": "Change Logs",
    "gender": "masculino",
    "description": "Log inmutable polimorfico de cambios sobre objetos auditables. entityType + entityId apuntan al record modificado (FK polimorfica abierta, sin enforcement BD). Append-only por convencion: el resolver NO expone updateChangeLog / deleteChangeLog. Modelado segun Confluence Learning Assurance v1.10. Modulos auditables: activity, curricularSection, curricularLink (entityType plano sin recordType per INT-4).",
    "defaultLayoutType": "RecordList",
    "indexes": [
      "entityType, entityId, createdAt",
      "userId, createdAt"
    ]
  },
  "properties": {
    "entityType": { "type": "string", "title": "Entity Type", "not_null": true, "description": "..." },
    "entityId": { "type": "string", "title": "Entity ID", "not_null": true, "description": "..." },
    "userId": { "type": "integer", "title": "User", "not_null": true, "isForeignKey": true, "references": "core_User", "targetField": "id", "description": "FK core_User integer autoincrement (convencion UP1, no UUID v1.10)" },
    "action": { "type": "string", "title": "Action", "not_null": true, "enum": ["Create", "Update", "Delete", "StateTransition", "MADSSync", "Import", "Restore"], "description": "..." },
    "source": { "type": "string", "title": "Source", "not_null": true, "enum": ["DirectEdit", "Workflow", "ChangeRequest", "MADS", "Import", "SystemCalculation"], "description": "..." },
    "field": { "type": "string", "title": "Field", "not_null": false, "description": "Solo Update" },
    "oldValue": { "type": "string", "title": "Old Value", "not_null": false, "description": "JSON serializado, hash+truncar si >10KB (resolver)" },
    "newValue": { "type": "string", "title": "New Value", "not_null": false, "description": "idem" },
    "changeRequestId": { "type": "string", "title": "Change Request", "not_null": false, "isForeignKey": true, "references": "changeRequest", "targetField": "id" },
    "workflowTransitionHistoryId": { "type": "string", "title": "Workflow Transition History", "not_null": false, "isForeignKey": true, "references": "workflowTransitionHistory", "targetField": "id", "description": "HU3" },
    "sourceRefId": { "type": "string", "title": "Source Ref ID", "not_null": false, "description": "Ref polimorfica externa (MADS sync, import batch)" },
    "comment": { "type": "string", "title": "Comment", "not_null": false }
  },
  "required": ["entityType", "entityId", "userId", "action", "source"]
}
```

> **Lo que el codegen agrega automaticamente** (NO declarar en el JSON):
> - `id`: Int autoincrement primary key
> - `tenantId`: String + index obligatorio (regla multi-tenant del platform)
> - `createdAt`, `updatedAt`: DateTime con `@default(now())` y `@updatedAt` respectivamente
> - Prisma `@relation` directives a partir de `isForeignKey + references + targetField`
> - Prisma `@@index` directives a partir de `metadata.indexes`
>
> **Append-only por convencion**: el JSON schema declara los campos. El comportamiento append-only se enforce en el resolver custom `auditCapture.resolver.js` (no expone `updateChangeLog`/`deleteChangeLog` como mutations publicas) — NO via constraint Prisma. Idem precedente HU3 (`workflowTransitionHistory` que es append-only por convencion).

**Mapping conceptual del JSON object a Prisma generado** (referencia — NO se escribe a mano):

```prisma
model ChangeLog {
  id                          Int                        @id @default(autoincrement())  // codegen
  tenantId                    String                                                     // codegen
  entityType                  String
  entityId                    String
  userId                      Int
  action                      String                                                     // enum se enforce en GraphQL/runtime, NO Prisma enum
  source                      String
  field                       String?
  oldValue                    String?
  newValue                    String?
  changeRequestId             String?
  workflowTransitionHistoryId String?
  sourceRefId                 String?
  comment                     String?
  createdAt                   DateTime                   @default(now())                 // codegen
  updatedAt                   DateTime                   @updatedAt                      // codegen — NUNCA se modifica post-create por convencion append-only

  user                        User                       @relation(fields: [userId], references: [id])
  workflowTransitionHistory   WorkflowTransitionHistory? @relation(fields: [workflowTransitionHistoryId], references: [id])
  // changeRequest, tenant relations: agregadas por codegen

  @@index([tenantId])
  @@index([entityType, entityId, createdAt])
  @@index([userId, createdAt])
  @@map("changeLog")
}
```

> **Implicaciones del patron real (vs draft v2 que asumia Prisma)**:
> - **userId es `Int`** (no String/UUID/cuid). El resolver lee `context.user?.id` (que es Int en UP1 core_User) y guarda directo.
> - **Enums como strings + array `enum`** en el JSON object — NO genera `enum ChangeLogAction` Prisma top-level. El enforce se hace en el GraphQL type generado + validacion runtime en el resolver.
> - **Indexes en `metadata.indexes`** como CSV strings (codegen los parsea y crea `@@index([cols])`).
> - **`tenantId` automatic**: regla del platform — todos los objetos del mod heredan tenantId por codegen.
> - **No `@db.Text`**: el JSON schema usa `"type": "string"` y el codegen elige el tipo Prisma. Si `oldValue`/`newValue` requieren explicit text largo, validar empirico al hacer codegen + revisar el `schema.prisma` generado (S8.T2). Si por default queda como `VARCHAR(255)`, agregar `"maxLength": 65535` en la property (verificar convencion del codegen).
>
> **OQ10 actualizada**: casing del enum sigue siendo PascalCase (`ChangeRequest`) en el JSON enum array para consistencia con valores del ticket, label camelCase en i18n (`changeLogSource.changeRequest = "Solicitud de cambio"`).

### Capabilities (mods/curriculum-design/capabilities.json)

| Capability | Type | Scope | Razon |
|------------|------|-------|-------|
| activity:audit | object-level | mod/curriculum-design | Gate del tab Historial sobre activity (RULE-mods-037 sin prefix mod/) |
| curricularsection:audit | object-level | mod/curriculum-design | Gate del tab sobre curricularSection (todos sub-types) |
| curricularlink:audit | object-level | mod/curriculum-design | Gate del tab sobre curricularLink (todos linkTypes) |

### Event JSONs (8 nuevos + 1 existente)

| Archivo | Status | Trigger | Notas |
|---------|--------|---------|-------|
| `events/activity-create.json` | nuevo | `{ objectType: activity, operation: create }` | priority 1, attempts 3 |
| `events/activity-update.json` | nuevo | `{ objectType: activity, operation: update }` | idem |
| `events/activity-delete.json` | nuevo | `{ objectType: activity, operation: delete }` | idem |
| `events/activity-transition.json` | **existente (HU3)** | `{ objectType: activity, operation: transition }` | NO se duplica — solo se consume |
| `events/curricularSection-create.json` | nuevo | idem | — |
| `events/curricularSection-update.json` | nuevo | idem | — |
| `events/curricularSection-delete.json` | nuevo | idem | — |
| `events/curricularLink-create.json` | nuevo | idem | — |
| `events/curricularLink-update.json` | nuevo | idem | — |
| `events/curricularLink-delete.json` | nuevo | idem | — |

**Total**: 8 archivos nuevos + 1 existente (consumido) = 9 events processed.

### Custom resolver (mod logic — patron canonico)

| Archivo | Tipo | Descripcion |
|---------|------|-------------|
| `mods/curriculum-design/logic/auditCapture.schema.graphql` | nuevo | Schema GraphQL del mod: `input AuditEventInput { objectType, operation, data, previousData, triggeredBy, transitionContext }`, `type AuditEventResult { rows: [ChangeLog!]! }`, `Mutation.recordAuditEvent(input): AuditEventResult` |
| `mods/curriculum-design/logic/auditCapture.resolver.js` | nuevo (~250 LOC TS) | Implementacion del resolver: diff field-by-field con campos excluidos (OQ5), edge cases (>10KB hash+truncate, source=SystemCalculation si userId null, StateTransition con lookup wth + `createWorkflowTransitionHistoryValidated`), idempotencia sobre (entityType+entityId+createdAt+field) |

### n8n workflow (sincronizado via Phase 9 syncFlows)

| Archivo | Tipo | Sync mechanism |
|---------|------|----------------|
| `mods/curriculum-design/flows/audit-capture.json` | nuevo | Phase 9 `syncFlows()` de `object-manager/scripts/sync/flowSync.js` upserts via n8n REST API. `settings.up1Source: "curriculum-design/audit-capture"` como identificador estable |

**Shape del workflow** (2 nodos):

| # | Node | Tipo | Config |
|---|------|------|--------|
| 1 | Redis Trigger | `n8n-nodes-base.redis` | Pattern subscribe: `*/Activity/core:*`, `*/CurricularSection/core:*`, `*/CurricularLink/core:*` (3 patterns o un wildcard por convencion del platform) |
| 2 | GraphQL Mutation | `n8n-nodes-base.graphql` | URL: `http://object-manager:4000/graphql`. Mutation: `mutation($input: AuditEventInput!) { recordAuditEvent(input: $input) { rows { id } } }`. Headers: `X-Tenant-ID` extraido del channel name |

> **Precedentes en el monorepo** (3 mods ya usan el patron, validados por filesystem):
> - `mods/hello-world-mod/flows/hello-world-event-handler.json` (template canonico)
> - `mods/retention-wellbeing/flows/enrollment-event-handler.json`
> - `mods/retention-wellbeing/flows/daily-checkin-reminder.json`
>
> Edicion del flow: dev edita visualmente en n8n UI (`http://localhost:5678`) → exporta JSON → commitea en `mods/curriculum-design/flows/audit-capture.json`. `npm run sync` propaga al runtime. Doc tecnica: [`flow/N8N_API_GUIDE.md`](flow/N8N_API_GUIDE.md).

### Layouts (10 modificados: 1 activity + 1 curricularLink + 7 curricularSection subtypes + 1 wrapper)

| Layout | Cambio | OQ asociada |
|--------|--------|-------------|
| `default_activity_view.json` | Agregar tab "Historial" al final del array `tabs` con embed `record-list` `changeLog` filtrado | OQ4 cerrada (todos filtros visibles) |
| `default_curricularLink_view.json` | idem | — |
| `default_rt__LearningOutcome__curricularsection_view.json` | idem | OQ6 cerrada (opcion a) |
| `default_rt__Modality__curricularsection_view.json` | idem | OQ6 cerrada |
| `default_rt__EvaluationComponent__curricularsection_view.json` | idem | OQ6 cerrada |
| `default_rt__Content__curricularsection_view.json` | idem | OQ6 cerrada |
| `default_rt__Session__curricularsection_view.json` | idem | OQ6 cerrada |
| `default_rt__Bibliography__curricularsection_view.json` | idem | OQ6 cerrada |
| `default_rt__CustomSection__curricularsection_view.json` | idem | OQ6 cerrada |
| `default_changeLog_list.json` | NUEVO — layout standalone para el record-list base de `changeLog` (referenciado por los embeds) | — |

### i18n (3 archivos nuevos)

| Archivo | Contenido |
|---------|-----------|
| `lang/es_CL@ChangeLog.json` | Labels del objeto changeLog (header del tab, columnas, mensajes empty state) |
| `lang/es_CL@changeLogAction.json` | Labels del enum action: Create="Crear", Update="Actualizar", Delete="Eliminar", StateTransition="Transicion de estado", MADSSync="Sync MADS", Import="Importacion", Restore="Restaurar" |
| `lang/es_CL@changeLogSource.json` | Labels del enum source: DirectEdit="Edicion directa", Workflow="Workflow", ChangeRequest="Solicitud de cambio", MADS="MADS", Import="Importacion", SystemCalculation="Calculo del sistema" |

## Tasks

### Session 8 — Objeto changeLog + codegen + capabilities + i18n [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S8.T1 | Crear `changeLog.json` siguiendo patron del mod (JSON Schema draft-07 + metadata up1, NO Prisma). Path real: `mods/curriculum-design/objects/changeLog.json` (NO `objects/business/Base/` — L20). 12 properties declaradas (id + tenantId + createdAt + updatedAt los agrega codegen). Enums inline en property con `"enum": [...]`. Indexes en `metadata.indexes` como CSV strings. userId Int referenciando `core_User`. Tomar como template [`workflowTransitionHistory.json`](mods/curriculum-design/objects/workflowTransitionHistory.json) | REQ-IMPLEMENT-01 | developer | — | mods/curriculum-design/objects/changeLog.json | manual (lint JSON contra `$schema: draft-07`) + `npm run codegen` produce typedef sin error + grep `schema.prisma` generado confirma columnas, FKs, indexes esperados | git revert | DET-1, DET-2, DET-8, RULE-core-008 | pending | 8 |
| S8.T2 | Correr `npm run codegen` + `npx prisma migrate dev --name changelog_init` + validar schema en BD UPU. Verificar empirico: tipo Prisma de `oldValue`/`newValue` por default (string vs text). Si default es VARCHAR insuficiente para JSONs grandes, ajustar `maxLength` en property del JSON object + re-codegen | REQ-IMPLEMENT-01 | developer | S8.T1 | object-manager/prisma/schema.prisma (generado), object-manager/prisma/migrations/, mods/curriculum-design/objects/changeLog.json (posibles ajustes maxLength) | TC-1 — Prisma Studio muestra tabla con cols esperadas + 3 indexes + FKs a core_User, workflowTransitionHistory | `npx prisma migrate resolve --rolled-back changelog_init` + drop tabla manual | DET-5, DET-8, RULE-core-008 | pending | 8 |
| S8.T3 | Agregar 3 capabilities object-level (`activity:audit`, `curricularsection:audit`, `curricularlink:audit`) a `capabilities.json` sin prefix mod/ + `npm run sync` | REQ-IMPLEMENT-05 | developer | S8.T1 | mods/curriculum-design/capabilities.json | TC-12 — `npm run sync` 3/3 workspaces OK + capabilities visible en Suite | git revert | DET-2, RULE-mods-037 | pending | 8 |
| S8.T4 | Crear 3 archivos i18n para el objeto + 2 enums (action/source). Verificar convencion real del mod: si existen archivos `@<Object>.json` en `mods/curriculum-design/lang/es_CL/` como template (ej. `@WorkflowTransitionHistory.json`) o si la convencion es distinta. Ajustar path/naming al patron observado | REQ-IMPLEMENT-04 | developer | S8.T1 | mods/curriculum-design/lang/es_CL/@ChangeLog.json, @changeLogAction.json, @changeLogSource.json (o convencion real del mod) | manual (lint JSON) + `npm run sync` copia a suite/lang/ | git revert | DET-2, RULE-mods-003 | pending | 8 |
| **S8.GATE** | **Gate de sync Session 8 (tier: T2)** — persistir resultados en `## Sessions` del ticket usando Template de Gate, validar TC-1+TC-12 con `Actual` poblado, coverage delta no degrada vs baseline, DET-23 quality review standard (dims 1,2,3,4,6,7,10 mandatorias) | — | reviewer | S8.T1, S8.T2, S8.T3, S8.T4 | ticket | gate persistido + decision continue/iterate | (no aplica) | DET-20, DET-23, DET-25 | pending | 8 |

### Session 9 — Event JSONs + Resolver custom + n8n workflow (zero core touch) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S9.T1 | Crear 8 event JSONs nuevos (`activity-create/update/delete`, `curricularSection-*`, `curricularLink-*`) + `npm run sync` para que el decorator haga pre-fetch + publish a Pub/Sub | REQ-IMPLEMENT-02, REQ-IMPLEMENT-03 | developer | S8.GATE | mods/curriculum-design/events/*.json (8 archivos) | manual (lint JSON) + sync OK + smoke: ejecutar updateActivity y verificar via `redis-cli psubscribe '*/Activity/core:*'` que llega el mensaje con `_previousData` | git revert | DET-2, RULE-core-007, RULE-mods-003 | pending | 9 |
| S9.T2 | Crear schema GraphQL del resolver: `auditCapture.schema.graphql` con `input AuditEventInput`, `type AuditEventResult { rows: [ChangeLog!]! }`, `Mutation.recordAuditEvent(input): AuditEventResult` | REQ-IMPLEMENT-06 | developer | S8.GATE | mods/curriculum-design/logic/auditCapture.schema.graphql | manual (lint .graphql) + `npm run sync` propaga el schema | git revert | DET-2, RULE-core-008 | pending | 9 |
| S9.T3 | Implementar `auditCapture.resolver.js` — base del resolver: recibir input, diff `previousData` vs `data` field-by-field, persistir N rows via Prisma. Idempotente sobre (entityType+entityId+createdAt+field) | REQ-IMPLEMENT-02, REQ-IMPLEMENT-06 | developer | S9.T2 | mods/curriculum-design/logic/auditCapture.resolver.js, mods/curriculum-design/logic/auditCapture.test.js | TC-3, TC-4, TC-5, TC-14 — tests unitarios del resolver pasan (create, update, delete, diff) con vitest | git revert | DET-5, DET-8, RULE-core-008 | pending | 9 |
| S9.T4 | Resolver — branch para action=StateTransition: leer wth via FK, copiar entityType (L8), usar `createWorkflowTransitionHistoryValidated` (INT-6), retornar errores tipados `WORKFLOW_HISTORY_*` que el n8n flow puede reintentar | REQ-IMPLEMENT-02, REQ-PRESERVE-07 | developer | S9.T3 | mods/curriculum-design/logic/auditCapture.resolver.js | TC-6, TC-22 — StateTransition genera row con workflowTransitionHistoryId + entityType de wth | git revert | DET-5, DET-8, DET-10 | pending | 9 |
| S9.T5 | Crear `mods/curriculum-design/flows/audit-capture.json` — workflow n8n minimo (2 nodos: Redis Trigger subscribe `*/Activity/core:*` + `*/CurricularSection/core:*` + `*/CurricularLink/core:*`, GraphQL Mutation passthrough a `recordAuditEvent`). `settings.up1Source: "curriculum-design/audit-capture"`. Retries: 3, backoff exponential | REQ-IMPLEMENT-06 | developer | S9.T4 | mods/curriculum-design/flows/audit-capture.json | manual (lint JSON shape per `check-mod-structure.js`) + `npm run sync` Phase 9 logs "Found 1 flow file(s)" + workflow visible en n8n UI con up1Source correcto (TC-13) | git revert | DET-2 | pending | 9 |
| S9.T6 | Smoke end-to-end: `updateActivity` → decorator publica → n8n flow ejecuta → resolver inserta filas. Validar en n8n UI executions panel + Prisma Studio | REQ-IMPLEMENT-02, REQ-IMPLEMENT-06 | reviewer | S9.T1-T5 | UPU sandbox + n8n UI + Prisma Studio | E2E manual con screenshot de execution exitosa en n8n + fila visible en `changeLog` | (no aplica — solo verificacion) | DET-4, DET-13 | pending | 9 |
| **S9.GATE** | **Gate ⚑ fuerte Session 9 (tier: T2)** — TC-3/4/5/6/13/14/22 con Actual poblado, smoke E2E pasado, decision arquitectonica OQ1 formalizada como DEC-LOCAL-02 (zero core touch confirmado). DET-23 quality review standard | — | reviewer | S9.T1-T6 | ticket, spec | gate persistido + screenshot n8n execution | revert tasks 1-5 si gate iterate | DET-20, DET-23, DET-25 | pending | 9 |

### Session 10 — Edge cases del handler [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S10.T1 | Resolver — campos excluidos (`updatedAt`, `createdAt`, `version`, `_*`, `lockedBy`, `tenantId`) NO generan rows en diff | REQ-PRESERVE-04 | developer | S9.GATE | mods/curriculum-design/logic/auditCapture.resolver.js | TC-19 — Update que solo modifica updatedAt genera 0 rows | git revert | DET-5, DET-8 | pending | 10 |
| S10.T2 | Resolver — `triggeredBy.userId === null` → source=SystemCalculation | REQ-PRESERVE-05 | developer | S10.T1 | mods/curriculum-design/logic/auditCapture.resolver.js | TC-20 — cron mutation genera row con source=SystemCalculation | git revert | DET-5, DET-8 | pending | 10 |
| S10.T3 | Resolver — truncado JSON >10KB con hash sha256 + nota inline `[truncado · sha256:XXX]` | REQ-PRESERVE-02 | developer | S10.T1 | mods/curriculum-design/logic/auditCapture.resolver.js | TC-17 — Update con description >15KB genera row con valor truncado a 1KB + hash | git revert | DET-5, DET-8 | pending | 10 |
| S10.T4 | Resolver — Delete + Restore sequence (action distinta, mismo entityId) | REQ-PRESERVE-03 | developer | S10.T1 | mods/curriculum-design/logic/auditCapture.resolver.js | TC-18 — secuencia delete+restore genera 2 rows | git revert | DET-5, DET-8 | pending | 10 |
| S10.T5 | Test integration TC-16 — batch rollback indirecto (mutation que falla mid-batch = 0 rows nuevas) | REQ-PRESERVE-01 | reviewer | S10.T1-T4 | object-manager/tests/integration/changelog-batch-rollback.test.js | TC-16 pasa — H8 confirmada empirica o escalada a iterate | git revert | DET-4, DET-7, DET-13 | pending | 10 |
| **S10.GATE** | **Gate de sync Session 10 (tier: T2)** — TC-15..TC-20 con Actual poblado, lista campos excluidos finalizada (OQ5 cerrada), H8 confirmada/escalada. DET-23 quality review standard | — | reviewer | S10.T1-T5 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23, DET-25 | pending | 10 |

### Session 11 — UI tab Historial en 10 layouts [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S11.T1 | Crear `default_changeLog_list.json` — layout standalone del record-list base (7 columnas, filtros, orden DESC) | REQ-IMPLEMENT-04 | developer | S10.GATE | mods/curriculum-design/config/layouts/default_changeLog_list.json | manual + render preview en suite con datos seed | git revert | DET-2, RULE-layout-003, RULE-suite-001 | pending | 11 |
| S11.T2 | Modificar `default_activity_view.json` agregando tab "Historial" al final con embed `record-list` filtrado `entityType=activity` + `entityId={{parentId}}` | REQ-IMPLEMENT-04, REQ-IMPLEMENT-05 | developer | S11.T1 | mods/curriculum-design/config/layouts/default_activity_view.json | TC-8 — UPU smoke valida tab visible y filtrado correcto | git revert | DET-2, DET-16, RULE-layout-003, RULE-mods-026 | pending | 11 |
| S11.T3 | Modificar `default_curricularLink_view.json` idem | REQ-IMPLEMENT-04 | developer | S11.T1 | mods/curriculum-design/config/layouts/default_curricularLink_view.json | TC-9 | git revert | DET-2, RULE-layout-003 | pending | 11 |
| S11.T4 | Modificar 7 layouts subtypes de curricularSection (LearningOutcome, Modality, EvaluationComponent, Content, Session, Bibliography, CustomSection) — agregar tab Historial al final con filtro `entityType=curricularSection` + entityId={{parentId}} (plano per INT-4) | REQ-IMPLEMENT-04 | developer | S11.T1 | mods/curriculum-design/config/layouts/default_rt__*__curricularsection_view.json (7) | TC-10 — UPU smoke valida en 1 subtype (Modality) + grep verifica que los 7 estan modificados | git revert (7 archivos) | DET-2, DET-16, RULE-layout-003 | pending | 11 |
| S11.T5 | UPU smoke — abrir activity `aa-uv-1124` post-HU3+HU4 → ver tab con entry de StateTransition real generado por HU4 + demos huerfanos coexisten sin crashear | REQ-IMPLEMENT-04, REQ-PRESERVE-07 | reviewer | S11.T2-T4 | navegacion manual UPU | TC-11 — vista NO crashea con entityId huerfanos demo (HU2-D1/D2) | (no aplica — solo verificacion) | DET-4, DET-13 | pending | 11 |
| **S11.GATE** | **Gate ⚑ fuerte Session 11 (tier: T3)** — TC-8/9/10/11 con Actual+Evidence (screenshots), OQ6 + OQ11 cerradas. DET-23 quality review exhaustive (10 dims, a11y solo preliminar — axe completo en S12) | — | reviewer | S11.T1-T5 | ticket | gate persistido + screenshots | revert layouts si gate iterate | DET-20, DET-23, DET-25 | pending | 11 |

### Session 12 — a11y axe-core + cross-ticket integration con HU3 + smoke completo [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S12.T1 | axe-core sobre tab Historial en activity (light + dark) — patron DEC-LOCAL-04 de TICKET-025. Sin badges → a11y simplificado (OQ7 vieja resuelta) | REQ-PRESERVE-06 | reviewer | S11.GATE | tests e2e Playwright | TC-21 — 0 violations WCAG 2.1 AA o mitigacion documentada | (no aplica) | DET-4, DET-13, RULE-curriculum-design-001 | pending | 12 |
| S12.T2 | Cross-ticket integration — smoke en `aa-uv-1124` y `TIR101`: trigger transition runtime con `createWorkflowTransitionHistoryValidated` (HU3) → row StateTransition aparece en tab con workflowTransitionHistoryId + entityType copiado de wth | REQ-IMPLEMENT-02, REQ-PRESERVE-07 | reviewer | S11.GATE | UPU manual + Prisma Studio | TC-22 — row StateTransition con FK correcto, source=Workflow | (no aplica) | DET-4, DET-13 | pending | 12 |
| S12.T3 | Smoke con entries demo huerfanos + reales coexistiendo (HU2-D1) — verificar que la vista NO filtra ni crashea | REQ-IMPLEMENT-04 | reviewer | S12.T2 | UPU manual | TC-11 confirmada con screenshot | (no aplica) | DET-4, DET-13 | pending | 12 |
| **S12.GATE** | **Gate ⚑ fuerte Session 12 (tier: T3)** — TC-21, TC-22 con Actual+Evidence (screenshots, axe report), 0 violations WCAG AA. DET-23 quality review exhaustive con 10 dims incluyendo a11y y Storybook (Storybook n/a porque scope A no introduce componentes nuevos) | — | reviewer | S12.T1-T3 | ticket | gate persistido + axe report adjunto | (no aplica) | DET-20, DET-23, DET-25 | pending | 12 |

### Session 13 — Documentacion + backlog follow-up + cleanup + cierre [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S13.T1 | Actualizar `mods/curriculum-design/.ai/PATTERNS.md` con seccion "ChangeLog audit pattern": event JSONs declarativos + worker handler service + tab Historial. Receta "Como agregar un nuevo objeto auditable" en 4 pasos | REQ-IMPLEMENT-03 | developer | S12.GATE | mods/curriculum-design/.ai/PATTERNS.md | manual review (lectura) + grep cross-ref `audited-objects` no aparece | git revert | DET-16 | pending | 13 |
| S13.T2 | Update `mods/curriculum-design/.ai/INDEX.md` con referencias al nuevo objeto `changeLog` + capabilities + event JSONs | REQ-IMPLEMENT-03 | developer | S13.T1 | mods/curriculum-design/.ai/INDEX.md | manual review | git revert | DET-16 | pending | 13 |
| S13.T3 | Evaluar promover DEC-LOCAL-01 (AC6 inversion PM A/B → C event-driven) + DEC-LOCAL-02 (captura via resolver custom + n8n router zero core touch) a DECISION-id formal del proyecto. Patron reusable para futuros mods que necesiten audit log o cualquier hook event-driven | REQ-IMPLEMENT-06 | reviewer | S13.T1 | projects/up1/decisions/DECISION-XXX-mod-audit-via-n8n-resolver.md (potencialmente) | manual review del dev + PM | (no aplica) | DET-16 | pending | 13 |
| S13.T4 | Transcribir item `B-follow-up-custom-table` al backlog del spec (priority `should`) — desde intent.md draft v2 | — | scribe | S13.T1 | este spec, seccion Backlog | grep backlog del spec confirma item presente | (no aplica) | DET-16, DET-25 | pending | 13 |
| S13.T5 | Generar teach-close (DET-22) con sintesis de las 13 sessions, hipotesis confirmadas/refutadas, lessons learned | — | scribe | S13.T1-T4 | tickets/ticket-020.teach/teach-close.md | grep frontmatter `kind: close, status: done` | (no aplica) | DET-22 | pending | 13 |
| S13.T6 | **Documentar funcionalidades del platform up1 descubiertas durante el ticket** en `uplanner/specs/up1/` (doc local, no se commitea). Mantener documentado: (a) decorator `withEventPublish` + payload shape UPONE-1052 (`_previousData` + `_triggeredBy`), (b) canales Redis Pub/Sub `{tenantId}/{ObjectType}/{domain}:{operation}` publicados siempre, (c) Phase 9 `syncFlows` que upserts `mods/<mod>/flows/*.json` a n8n via REST API, (d) patron custom resolver del mod (`mods/<mod>/logic/*.resolver.js`), (e) patron n8n workflow del mod (`mods/<mod>/flows/*.json`) con precedentes hello-world-mod + retention-wellbeing, (f) Acceso a Prisma desde resolver via `context.prisma` (no import directo). **Carpeta sugerida**: `uplanner/specs/up1/platform/` o `uplanner/specs/up1/learning-assurance/platform-events/` segun preferencia del dev | — | scribe | S13.T1 | uplanner/specs/up1/platform/events-system.md (o ubicacion equivalente — a decidir con el dev) | manual review — archivo refleja el codigo verificado en S9.T1 + S9.T6 | (no aplica — solo docs locales) | DET-11, DET-16 | pending | 13 |
| **S13.GATE** | **Gate de sync Session 13 (tier: T1)** — docs escritos (mod + uplanner local), INDEX actualizado, teach-close generado, backlog poblado. DET-23 quality review light (dims 1, 7 mandatorias — docs). Cierre del ticket habilitado | — | reviewer | S13.T1-T6 | ticket, spec | gate persistido — listo para `/dkc close` | (no aplica) | DET-20, DET-23, DET-25 | pending | 13 |

> **DET-20 numeracion continua**: el plan parte en **S8** (max session actual del ticket = 7, plan = max+1 = 8). Tasks `S8.T1..S13.GATE`. Total: 6 sessions, 35 tasks (incl. 6 gates).

## Constraints

- **RULE-core-013** — Eventos del mod incluyen `_previousData` y `_triggeredBy` — habilita captura plug-and-play (UPONE-1052)
- **RULE-core-007** — Eventos via BullMQ: mutations triggean, workers procesan
- **RULE-core-008** — CRUD generico para el objeto `changeLog`
- **RULE-core-015** — Worker BullMQ centralized (no per-mod) — el dispatch a handlers de mods es contrato del worker base
- **RULE-mods-003** — `npm run sync` recarga cache de eventos
- **RULE-mods-026** — Embeds record-list sobre base con recordType
- **RULE-mods-037** — Naming: `<obj>:audit` o `changelog:view` sin prefix `mod/`
- **RULE-layout-003** — Embedded record-lists con `{{parentId}}` placeholder
- **RULE-layout-019** — Embeds inline record-list (consideraciones)
- **RULE-layout-025** — (a confirmar — listado en frontmatter del ticket)
- **RULE-suite-001** — LayoutOrchestrator unico punto de renderizado
- **RULE-suite-002** — (a confirmar — listado en frontmatter del ticket)
- **RULE-platform-001, RULE-platform-003** — Tokens up1, scope mod
- **RULE-curriculum-design-001** — WCAG 2.1 AA en UI del mod
- **DET-13** (cierre con evidencia), **DET-7** (test cases ↔ discovery), **DET-19** (external id en commits/branches/PRs = `UPONE-1098`), **DET-18** (draft aprobado), **DET-20** (sessions con gate), **DET-21** (teach-intake done), **DET-22** (teach-close obligatorio), **DET-23** (quality review por session), **DET-25** (test cases registrados en sesion)

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `SPEC-003-workflow-platform` (HU3, cerrado) | internal | Provee `workflowTransitionHistory` + `createWorkflowTransitionHistoryValidated` + event JSON `activity-transition.json` | Bloqueo: si HU3 no esta deployed en UPU, S9.T4 + TC-22 no validan |
| `SPEC-004-rename-activity-workflow` (HU4, cerrado) | internal | Establece `entityType="activity"` post-rename + activities legacy migradas (`aa-uv-1124`, `TIR101`) | Bloqueo: si HU4 no esta deployed, el smoke S11/S12 no tiene data real |
| `UPONE-1052` (cerrado SP17 2026-05-07) | internal | `_previousData` + `_triggeredBy` en eventos publicados — habilita H1 confirmada | Sin esto, scope sube a 8-13 SP — ya merged a developer |
| `UPONE-1051` (cerrado SP17) | internal | `includeFields` filter — disponible si en el futuro hay campos sensibles a filtrar del payload | Bajo |
| **Phase 9 syncFlows** (`object-manager/scripts/sync/flowSync.js`) | internal — infra existente | Upserts `mods/<mod>/flows/*.json` a la instancia n8n via REST API usando `settings.up1Source` como identifier estable | Si Phase 9 esta rota, el workflow no se sincroniza — fallback: import manual via n8n UI (operativamente aceptable como ultimo recurso) |
| **n8n runtime** (`flow/` workspace + service docker) | internal — critico | Ejecuta el workflow `audit-capture.json` que rutea Pub/Sub → resolver | Si n8n esta down, no se audita (mitigacion: healthcheck + migration path documentada en DEC-LOCAL-02) |
| Redis Pub/Sub (canal `core`) | internal — critico | Transporte de eventos del decorator al workflow n8n | Si Redis cae, tanto el platform como el audit fallan (gap general no especifico de HU2) |
| Sandbox UPU + flow service corriendo | external | `docker compose --profile flow up -d` durante el ciclo de execute. **Worker BullMQ NO es necesario** para HU2 — usamos el canal Pub/Sub no la queue | Si el flow service no esta arriba, no se procesa el audit log |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| n8n como dependencia critica del audit log (down = no se audita) | low-medium | medio — gap de evidencia en periodo de outage | (a) Healthcheck del service `flow` en docker-compose; (b) n8n YA es critico para otros workflows del platform (no es regresion); (c) **migracion path documentada** en DEC-LOCAL-02: agregar subscriber Redis del mod que invoque el mismo resolver = trivial, cero refactor de logica TS |
| Workflow n8n con bugs de concurrency / retry / dead-letter podria perder eventos o crear duplicados | medium | bajo-medio | Resolver `recordAuditEvent` es **idempotente** sobre (entityType+entityId+createdAt+field) — duplicados son re-inserts no-op. Retries explicit en el flow JSON: 3 con backoff exponencial. Validar empirico en S9.T6 smoke E2E |
| Shape del payload del Pub/Sub puede no coincidir 1:1 con el `AuditEventInput` GraphQL del resolver | medium | bajo | Smoke temprano en S9.T1 con `redis-cli psubscribe` verifica el JSON real publicado. Si diverge, ajustar el mapping en el GraphQL node del n8n (sin cambios en el resolver) |
| H8 batch transaccional partial — cobertura INDIRECTA via rollback Prisma = sin evento publicado | medium | alto si refuta — re-design del approach | TC-16 valida empirico en S10. Si refuta (eventos publicados aun con rollback), escalar a `iterate` y considerar capturar el commit/rollback en el publish path (gap arquitectonico) |
| 7 layouts subtypes curricularSection trabajo repetitivo | medium | medio — error humano por copy/paste | Snippet copiable + grep cross-verificacion S11.T4. Si el costo crece, consolidar via script de sync |
| UX texto plano sin badges puede no cumplir necesidades de acreditacion | medium | medio — si requiere badges, falta ticket de seguimiento | Item `B-follow-up-custom-table` en backlog (priority `should`). Smoke post-cierre en UPU con PM decide |
| Demos huerfanos del seed HU3 podrian confundir al usuario al ver entries con entityId que no existe | low | bajo | Comentario inline `DEMO·...` en el seed (HU3); cleanup diferido a SP3 (HU2-D4) |
| Codigos error `WORKFLOW_HISTORY_*` (INT-6) no implementados con retry/dead-letter robusto | medium | medio | TC-22 valida path de error en S9.T4. El flow n8n maneja retries; el resolver retorna error tipado |

## Open questions

- [ ] **OQ1 [topologia del workflow n8n]** — Confirmar el shape del `flows/audit-capture.json`: ¿pattern subscribe `*/Activity/core:*` + 2 patterns mas (uno por objectType), o un wildcard mas amplio `*/{Activity,CurricularSection,CurricularLink}/core:*` (si n8n Redis Trigger soporta brace expansion)? ¿Concurrency: 1 (serial) o N (paralelo con resolver idempotente)? ¿Retries: 3 con backoff exponencial? ¿Dead-letter strategy si retry exhausts? **Impacta S9.T5**. Resolucion: verificar empirico en S9.T1 que el shape del Pub/Sub que publica el decorator coincide con lo que el Redis Trigger node de n8n espera, y armar la config del flow basado en eso.
- [ ] **OQ2 [DRY event JSONs]** — Confirmar **8 event JSONs manuales** vs `audited-objects.json` central + generador automatic. Trade-off: +0.25 SP setup del generador vs ahorro a futuro (HU5+, otros mods). **Propuesta del spec: 8 manuales** — simplicidad inmediata. *Impacta scope S9.T1*.

## Decisions

### DEC-LOCAL-01: AC6 mecanismo C (event-driven BullMQ) invierte recomendacion PM A/B

- **Contexto**: PM Esteban Cortes recomendo opciones A (Prisma middleware) o B (resolver wrapper) en AC6 del ticket UPONE-1098. Intake DKC eligio C (event-driven BullMQ).
- **Drivers**: (a) scope mod estricto — zero core touch ideal; (b) UPONE-1052 cerrado SP17 entrega `_previousData` + `_triggeredBy` plug-and-play; (c) latencia aceptable para auditoria (eventually consistent).
- **Opcion elegida**: C — event-driven via worker BullMQ con event JSONs declarativos.
- **Alternativas**: A (Prisma middleware) — descartada: requiere modificar `object-manager/` core, performance hit en TODAS las mutations. B (resolver wrapper) — descartada: mismo issue scope. C tiene contras (eventual consistency, batch rollback INDIRECTO) mitigados con UPONE-1052 + TC-16.
- **Consecuencias**: gana scope mod, gana performance (asincrono no penaliza mutations), pierde sincronia transaccional (cubierto INDIRECTO H8 partial).
- **Session**: Session 6 del intake.
- **Promote-to-formal?**: candidato a `DECISION-XXX-mod-audit-via-n8n-resolver.md` del proyecto (evaluacion en S13.T3) — patron reusable para futuros mods.

### DEC-LOCAL-02: Captura via resolver custom del mod + n8n workflow router (PIVOTE 2026-05-19 — zero core touch)

- **Contexto**: durante design-feature, la verificacion empirica del codigo (`event-worker.js:58-82` + `eventLoader.js` + `queueManager.js`) confirmo que el platform NO tiene mecanismo de plugins/handlers registrables. `processEvent` es un stub con TODO n8n. La propuesta inicial (extender `processEvent` con dispatch ~30 LOC) **fue rechazada por el dev** invocando la regla de scope mod estricto. Se busco un approach que NO toque core.
- **Drivers**: (a) **scope mod estricto cero core touch** confirmado por el dev; (b) el decorator `withEventPublish` (UPONE-1052) YA publica eventos al canal Redis Pub/Sub `{tenantId}/{ObjectType}/core:{operation}` (`n8nPublisher.js:127,141`); (c) **Phase 9 syncFlows ya existe** (`object-manager/scripts/sync/flowSync.js`) y upserts workflows del mod (`mods/<mod>/flows/*.json`) a la instancia n8n via REST API usando `settings.up1Source` como identificador estable; (d) **patron canonico del mod** — custom resolvers ya en uso (`mods/curriculum-design/logic/*.resolver.js`, 5 archivos existentes); (e) **patron canonico del platform** — n8n como motor de workflows declarativos (workspace `flow/` activo); (f) **precedentes confirmados** — 3 mods ya usan `flows/*.json` versionado en git.
- **Opcion elegida**: **Captura via resolver custom del mod + n8n workflow router minimo**:
  1. El decorator publica al canal Pub/Sub `*/{ObjectType}/core:*` (sin cambios — infra existente)
  2. Un workflow n8n en `mods/curriculum-design/flows/audit-capture.json` (2 nodos: Redis Trigger + GraphQL Mutation passthrough) se subscribe y rutea al resolver del mod
  3. El resolver `mods/curriculum-design/logic/auditCapture.resolver.js` expone la mutation `recordAuditEvent(input)` con TODA la logica del handler (diff field-by-field, edge cases, INSERTs N rows, lookup wth para StateTransition)
  4. `npm run sync` Phase 9 sincroniza el workflow a la instancia n8n automaticamente
- **Alternativas descartadas**:
  - **Dispatch declarativo en `processEvent` core (propuesta inicial)** — descartada: rompe regla de scope mod estricto (~30 LOC en `object-manager/src/workers/event-worker.js`). Sin precedente de plugins en up1 hoy.
  - **Worker propio del mod en proceso Docker separado** — descartada: BullMQ queue del mod la consume el event-worker.js base (linea 87-108 itera por queues). Dos workers en misma queue = jobs distribuidos = inconsistencia (event-worker solo loguea, ours auditaria). Usar otra queue requeriria cambios en como el decorator publica.
  - **n8n workflow puro con logica de diff en function nodes** (opcion A del pivote) — descartada: logica critica de auditoria (diff, edge cases, casing enum, hash >10KB) en function nodes JS no testeable con vitest, dificil de revisar en PR. Compromete calidad por conveniencia operacional.
- **Consecuencias**: **gana** zero LOC en core, logica TS testeable en el mod, infra 100% existente del platform, alineamiento con 5 SP. **Pierde** sincronia con la mutation (n8n + Pub/Sub introducen latencia ~50-200ms post-commit; aceptable para audit eventually-consistent). **Dependencia critica**: n8n debe estar corriendo — mitigado por healthcheck + migracion path documentada a worker propio del mod si se necesita en el futuro.
- **Session**: 8 del ticket (design-feature, pivote post-design-draft v2).
- **Pendiente OQ1**: validar topologia del flow n8n (concurrency, retry, dead-letter config) antes de S9.T5.

### DEC-LOCAL-03: `entityType` polimorfico plano (sin recordType/linkType)

- **Contexto**: curricularSection es polimorfico (LearningOutcome, Modality, EvaluationComponent, Content, Session, Bibliography, CustomSection); curricularLink tambien (PREREQUISITE, CO_REQUISITE, etc.).
- **Drivers**: (a) simplicidad de filtros UI — un solo filtro por tab (entityType + entityId); (b) coherencia con modelo Confluence canonico que no distingue por recordType.
- **Opcion elegida**: `entityType` plano (`activity`, `curricularSection`, `curricularLink`) sin sufijo por recordType/linkType.
- **Alternativas**: granular `rt__Modality__curricularsection` descartada — multiplica filtros UI, complica polimorfismo.
- **Consecuencias**: gana simplicidad, pierde granularidad nativa (filtrar por recordType requiere JOIN futuro).
- **Session**: Session 1 del intake (PM Slack 2026-05-13).

### DEC-LOCAL-04: Render del tab con TableCell nativo, sin componentes custom (scope A)

- **Contexto**: `RecordList`/`TableCell` de up1 NO soportan badges declarativos en celdas. Investigacion 2026-05-19 confirmo. Componente custom estilo `CompositeSectionTreeElement` estimado en ~800-950 LOC.
- **Drivers**: (a) scope mod estricto + alineamiento con 5 SP; (b) componente custom escalaria a 8 SP; (c) UX texto plano es funcional aunque menos rica.
- **Opcion elegida**: scope A — render con `TableCell` nativo + texto i18n + monospace para diff.
- **Alternativas**: scope B (extender TableCell core, ~150-250 LOC en `layout/`) descartada — rompe scope mod. Scope C (componente custom) descartada — escala SP fuera del sprint.
- **Consecuencias**: gana SP del sprint, pierde UX visual (sin badges semanticos, sin diff visual). Item `B-follow-up-custom-table` en backlog (priority `should`) captura la mejora diferida.
- **Session**: Session 7 del intake (post-design-draft v2 aprobado).

### DEC-LOCAL-05: Tab Historial en RecordDetails de subtypes curricularSection (opcion a — 7 layouts)

- **Contexto**: curricularSection tiene 7 subtypes. El tab Historial debe vivir en alguna parte para que el usuario lo encuentre.
- **Drivers**: (a) opcion (b) wrapper de curricularSection requiere infra que no existe en up1; (c) opcion (c) consolidado en activity_view no respeta el filtro `entityType+entityId` del AC4.
- **Opcion elegida**: (a) — modificar 7 layouts subtypes + 1 layout curricularLink + 1 activity = 9 layouts.
- **Alternativas**: (b) descartada — sin infra. (c) descartada — viola AC4.
- **Consecuencias**: gana cumplimiento AC4, pierde tiempo en S11 (~30% mas trabajo vs solo 3 layouts).
- **Session**: Session 7 del intake (post-design-draft v2).

### DEC-LOCAL-06: Casing del enum Source — PascalCase Prisma + camelCase i18n

- **Contexto**: El ticket usa `changeRequest` (camelCase) como valor de source. Convencion Prisma enum: PascalCase.
- **Opcion elegida**: PascalCase en Prisma enum (`ChangeRequest`) + label camelCase en i18n (`changeLogSource.changeRequest = "Solicitud de cambio"`).
- **Session**: Session 7 del intake / design-feature.

### DEC-LOCAL-07: Shape del diff — 1 celda concatenada (preserva AC4 verbatim)

- **Contexto**: el AC4 dice "7 columnas explicit: fecha+hora, usuario, accion, source, campo modificado, valor anterior → valor nuevo, comentario".
- **Opcion elegida**: 1 celda concatenada con formato `{oldValue} → {newValue}` en monospace.
- **Alternativas**: 2 columnas separadas — descartada, rompe el conteo 7 columnas AC4.
- **Consecuencias**: gana cumplimiento AC4 literal, pierde claridad visual del diff (mitigada con monospace + arrow).
- **Session**: design-feature.

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Tiempo de reconstruir evidencia auditoria para 1 activity (acreditacion) | manual ~30min | < 30s (consulta tab Historial) | cronometrar |
| Cobertura de mutations auditadas sobre los 3 objetos | 0% | 100% (Create + Update + Delete + StateTransition para activity, curricularSection, curricularLink) | grep eventos en `events/` + smoke test |
| Latencia del tab Historial con 1K entries en UPU | N/A | < 200ms p95 | profile en UPU con seed |

## Technical reference

### Codigo de referencia (lectura — infra existente que se reusa)

- `up1/object-manager/src/events/decorators/withEventPublish.js:52-66,113-123,127` — implementacion UPONE-1052 (`_previousData` + `_triggeredBy`). **Publica al canal Pub/Sub `core` SIEMPRE (linea 127), independiente de X-App-ID**
- `up1/object-manager/src/events/publishers/n8nPublisher.js:123-161` — `publishToChannel`. Shape del mensaje publicado: `{ type, tenantId, userId, timestamp, objectType, operation, domain, data }` con `data` enriched con `_previousData` + `_triggeredBy`
- `up1/object-manager/scripts/sync/flowSync.js:45` — `syncFlows()` Phase 9 que upserts `mods/<mod>/flows/*.json` via n8n REST API usando `settings.up1Source` como identifier estable
- `up1/object-manager/src/services/flowService.js` — helpers de n8n API (session bridge, sharing)
- `up1/flow/N8N_API_GUIDE.md` — guia de n8n API (auth, workflow CRUD)
- `up1/mods/hello-world-mod/flows/hello-world-event-handler.json` — **template canonico** del shape de un flow del mod
- `up1/mods/retention-wellbeing/flows/{enrollment-event-handler,daily-checkin-reminder}.json` — precedentes adicionales
- `up1/mods/curriculum-design/logic/activity.resolver.js` — patron canonico de custom resolver del mod (referencia para escribir `auditCapture.resolver.js`)
- `up1/mods/curriculum-design/objects/workflowTransitionHistory.json` — **template canonico del JSON object del mod** (HU3, patron probado): JSON Schema draft-07, `metadata.label`, `metadata.indexes` como CSV strings, properties con `isForeignKey + references + targetField`, userId Int referenciando `core_User`, sin `tenantId` declarado (codegen lo agrega)
- `up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue` — patron de Vueform `defineElement` (referencia para `B-follow-up-custom-table` futuro, NO se usa en HU2)

### Codigo de referencia (escritura — archivos del mod creados/modificados)

- `up1/mods/curriculum-design/objects/changeLog.json` (NUEVO) — path real del mod, NO `objects/business/Base/` (ver L20)
- `up1/mods/curriculum-design/events/{activity,curricularSection,curricularLink}-{create,update,delete}.json` (8 NUEVOS) + `events/activity-transition.json` (existente, consumido implicito via canal Pub/Sub)
- `up1/mods/curriculum-design/logic/auditCapture.schema.graphql` (NUEVO)
- `up1/mods/curriculum-design/logic/auditCapture.resolver.js` (NUEVO ~250 LOC TS)
- `up1/mods/curriculum-design/logic/auditCapture.test.js` (NUEVO — vitest unit tests del resolver)
- `up1/mods/curriculum-design/flows/audit-capture.json` (NUEVO — workflow n8n 2 nodos)
- `up1/mods/curriculum-design/config/layouts/default_*_view.json` (9 modificados + 1 nuevo `default_changeLog_list.json`)
- `up1/mods/curriculum-design/capabilities.json` (3 capabilities nuevas)
- `up1/mods/curriculum-design/lang/es_CL@*.json` (3 archivos nuevos)
- `up1/mods/curriculum-design/.ai/{PATTERNS,INDEX}.md` (actualizados en S13 — incluye seccion "n8n workflows del mod" referenciando los 3 precedentes + `flow/N8N_API_GUIDE.md`)

**Cero archivos modificados en `object-manager/` core.**

### Resolver — acceso a Prisma desde el mod

El custom resolver del mod recibe `prisma` via `context` GraphQL (patron canonico — ver `activity.resolver.js` del mismo mod, ya usa este patron). Sin imports directos al `@uplanner/object-management-backend`.

### Documentacion externa

- **Confluence — Modelo de objetos LA**: page/2038366242 (define changeLog §27, append-only, polimorfico, retencion 7 anos)
- **Confluence — Sistema de Eventos**: page/1984462859
- **Jira**: UPONE-1098 (HU2), UPONE-1099 (HU3), UPONE-1100 (HU4), UPONE-1052 (`_previousData`), UPONE-1051 (`includeFields`), UPONE-204 (antecesor schema-level, scope distinto)

## Acceptance checkpoints

- [ ] **Funcional**: TC-1..TC-22 con `Actual` poblado y `Status: pass` (DET-25)
- [ ] **Tests**: integration tests del handler escritos y pasando (S10.T5 TC-16)
- [ ] **NFRs**: query del tab <200ms p95 medido en UPU, overhead pre-fetch <10ms (verificacion S12)
- [ ] **Rules**: patterns obligatorios del modulo respetados (RULE-mods-026, RULE-suite-001, RULE-mods-037, RULE-core-013)
- [ ] **Integration**: smoke en `aa-uv-1124` y `TIR101` (entries reales HU4) + demos huerfanos coexistiendo (HU2-D1) — sin crash
- [ ] **Docs del mod**: `mods/curriculum-design/.ai/PATTERNS.md` y `INDEX.md` actualizados (S13.T1-T2)
- [ ] **Docs local del platform**: `uplanner/specs/up1/platform/` actualizada con las funcionalidades descubiertas — decorator UPONE-1052, Pub/Sub channels, Phase 9 syncFlows, custom resolvers del mod, flows del mod (S13.T6 — doc local, no se commitea)
- [ ] **Teach-close**: generado (S13.T5, DET-22)
- [ ] **Backlog**: `B-follow-up-custom-table` transcrito (S13.T4)
- [ ] **a11y**: axe-core sin violations WCAG 2.1 AA (S12.T1 TC-21)
- [ ] **OQ1 (topologia del flow n8n)**: resuelto empirico en S9.T1 al verificar el shape del Pub/Sub publicado, validacion del flow en S9.T5/T6 (no bloqueante — el resolver TS se prueba con vitest independiente del flow)

## Backlog

> **DET-17 — ciclo de vida del backlog**: items `must` bloquean cierre del ticket. Items `should`/`could` no bloquean.

| ID | Item | Priority | Que existe | Como retomar |
|----|------|----------|-----------|--------------|
| **B-follow-up-custom-table** | Componente custom Vue para tab Historial con badges semanticos en action/source + diff visual (strikethrough + highlight + arrow) + user chip con avatar + expand row para comentarios largos | `should` | Patron precedente `mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue` (~1160 LOC). Investigacion 2026-05-19 documento ~800-950 LOC estimados. Decision INT-A / DEC-LOCAL-04 descarta para HU2 priorizando scope A. Apendice del `preview.html` v2 documenta tradeoffs A vs C | Post-cierre HU2: evaluar UX en UPU sandbox con usuarios reales del PM. Si UX texto plano se valida insuficiente para acreditacion academica, crear nuevo ticket de seguimiento (`work_type: improvement`). Si UX se valida suficiente, cerrar el item como `discard` |

## Rules discovered

{Se llena durante ejecucion. Rules nuevas descubiertas en S8-S13 se crean en `rules/{module}/` y se referencian aqui.}
