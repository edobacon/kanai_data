# Glosario de codigos — docs de versionamiento uP1 (v1, v2, v3, v3.1)

| Campo | Valor |
|---|---|
| **Autor** | Eduardo Bacon |
| **Fecha** | 2026-05-26 |
| **Proposito** | Decodificar los codigos referenciados en los docs `diseño-versionamiento_v*.md`, `historias-sprint-4_v*.md`, `cambios-versionamiento_v*.md` y `validacion-v3-vs-tickets-cerrados.md`. Util para alguien que abre los docs sin contexto DKC. |
| **Estructura** | Codigos organizados por categoria. Cada entrada incluye que es + donde se define + ejemplo de uso en los docs. |

---

## 1. Tickets — DKC internos y Jira externos

DKC (Deckard Cain) es el sistema spec-driven que usamos para gestionar el conocimiento del proyecto up1. Cada ticket tiene 2 identificadores:

- **`TICKET-XXX`**: identificador interno DKC. Vive en `deckard/projects/up1/tickets/ticket-XXX.md`.
- **`UPONE-XXXX`**: identificador en Jira (sistema externo del equipo platform). Aparece en el frontmatter del ticket DKC como `external: UPONE-XXXX`.

**Convencion DET-19**: en commits, branches, PRs y comentarios de codigo usamos el `external` (`UPONE-XXXX`). En records DKC (specs, rules, decisions) usamos el `ticket_id` interno.

### Tickets referenciados en los docs

| TICKET DKC | Jira | Que fue | Estado |
|------------|------|---------|--------|
| **TICKET-006** | UPONE-1033 | HU1 — modelado de los 4 objetos base del agregado curriculum-design (AcademicActivity → renamed a Activity, CurricularSection, CurricularLink, BibliographyReference) | closed |
| **TICKET-007** | UPONE-1034 | HU1 — layout RecordList de Activity | closed |
| **TICKET-009** | UPONE-1035 | HU1 — RecordTypes + layout RecordDetail | closed |
| **TICKET-018** | UPONE-1099 | **HU3 — workflow platform** (workflowStatus, workflow, workflowTransition, workflowTransitionHistory + seed UPU con 9 statuses + 5 workflows + 21 transiciones) | closed |
| **TICKET-019** | UPONE-1100 | **HU4 — rename `academicActivity → Activity`** + integrar workflow en Activity (`workflowId`, `currentStatusId` + mutations `transitionActivityValidated` / `updateActivityValidated`) | closed |
| **TICKET-020** | UPONE-1098 | **HU2 — changeLog audit chain** (registro polimorfico append-only de cambios; introduce el patron L40 de consolidacion al padre) | closed |
| **TICKET-030** | UPONE-1100 | Fix casing PascalCase del audit chain del mod curriculum-design (post-rename TICKET-019) | closed |
| **TICKET-031** | UPONE-1100 | Refactor PascalCase del mod curriculum-design end-to-end | closed |
| **TICKET-032** | sin Jira | Tech debt cleanup del mod curriculum-design | closed |

**Sprint SP3** = tickets TICKET-018 + TICKET-019 + TICKET-020 + sus follow-ups (TICKET-030/031/032).

---

## 2. Specs (SPEC-XXX)

Specs son los documentos vivientes de requerimientos. Viven en `deckard/projects/up1/specs/{module}/`.

| Spec | Modulo | Contenido |
|------|--------|-----------|
| **SPEC-003** | curriculum-design | Workflow platform (asociada a TICKET-018) |
| **SPEC-004** | curriculum-design | Rename Activity + integrar workflow (asociada a TICKET-019) |
| **SPEC-007** | curriculum-design | ChangeLog audit (asociada a TICKET-020) |
| **SPEC-008** | curriculum-design | HU2 audit + handoff polimorfico al equipo de desarrollo |
| **SPEC-010** | curriculum-design | Fix casing PascalCase (asociada a TICKET-028/030) |
| **SPEC-013** | curriculum-design | PascalCase audit del mod (asociada a TICKET-031) |
| **SPEC-014** | curriculum-design | Tech debt cleanup del mod (asociada a TICKET-032) |

---

## 3. Capabilities (CAP-CUR-XXX) — fuente: Confluence Learning Assurance

Capacidades funcionales del producto, definidas en Confluence. Viven como specs DKC en `deckard/projects/up1/specs/curriculum-design/capabilities/`.

| CAP | Nombre | Prioridad | Estado SP4 |
|-----|--------|-----------|------------|
| **CAP-CUR-014** | Crear programa de curso | Must | Cubierto en SP2 (TICKET-006/007) |
| **CAP-CUR-015** | Definir Resultados de Aprendizaje del curso | Must | Cubierto parcial |
| **CAP-CUR-016** | Gestionar secciones | Must | Cubierto en SP2 (TICKET-009) |
| **CAP-CUR-017** | Configurar modalidades | Should | Cubierto parcial |
| **CAP-CUR-018** | **Versionar programa** | Must | **Foco SP4 (este doc)** |
| **CAP-CUR-019** | Workflow del programa | Must | Cubierto en SP3 (TICKET-018) |
| **CAP-CUR-020** | Catalogo publico | Should | Fuera SP4 |
| **CAP-CUR-021** | Compartir via link | Could | Fuera SP4 |
| **CAP-CUR-022** | **Clonar programa** | Should | Tecnicamente listo en SP4, UI fuera de scope |

Las CAP que aparecen en los docs de versionamiento son principalmente **CAP-CUR-018** (Versionar) y **CAP-CUR-022** (Clonar). v3.1 unifica el mecanismo tecnico pero mantiene las dos como operaciones distintas en producto.

---

## 4. Business Rules (BR-XXX-XXX) — fuente: Confluence Learning Assurance

Reglas de negocio verbatim de Confluence, archivadas como specs DKC en `deckard/projects/up1/specs/curriculum-design/business-rules/`.

### BR mencionadas en los docs de versionamiento

| BR | Tema | Lo que dice (en corto) |
|----|------|------------------------|
| **BR-VER-001** | Cadena de versiones | Las entidades versionables se encadenan via `previousVersionId`. Solo una version vigente por entidad padre. Versiones anteriores no se eliminan ni modifican. |
| **BR-VER-002** | Clonacion | **CRITICA para SP4**. Clon nace en `Borrador`. Clonar = `AcademicActivity` + todas sus `CurricularSection` (recursivo) + **sus `CurricularLink` internos**. `BibliographyReference` NO se clona (es compartida). "Origen de clonacion = campo separado de previousVersionId. La clonacion NO es versionamiento." |
| **BR-WKF-001** | Reglas generales de workflow | El programa tiene estados (`Draft, Review, Approved, Published, OpenForEdit, Deprecated`). Cada transicion genera entry en tabla de auditoria. |
| **BR-WKF-002** | Control de acceso por workflow | (referenciada de contexto) |
| **BR-WKF-003** | Inmutabilidad por estudiantes activos | Plan con estudiantes activos no transiciona a estados de cierre. |
| **BR-WKF-004** | Coordinacion plan ↔ perfil egreso | (referenciada de contexto) |

Otras BRs existen para integraciones (BR-INT), migracion (BR-MIG), permisos (BR-PRM), multi-tenancy (BR-TNT), modulos (BR-MOD), librería (BR-LIB), taxonomia (BR-TAX), pero no son centrales para versionamiento.

---

## 5. Rules (RULE-XXX-XXX) — fuente: DKC, promovidas desde tickets

Reglas operacionales del codigo, promovidas desde learns de tickets. Viven en `deckard/projects/up1/rules/{module}/`.

Nivel normativo: `must` / `should` / `may`.

### Rules mencionadas en los docs de versionamiento

| Rule | Modulo | Nivel | Que dice | Ticket origen |
|------|--------|-------|----------|---------------|
| **RULE-platform-006** | platform | must | **Objects, layouts y GraphQL types DEBEN usar PascalCase**. Lowercase rompe deploy en Linux + GraphQL codegen + LayoutOrchestrator. Aplica a: `title` en object JSON, `references` cross-object, filename de layout `default_<Object>_<mode>.json`, etc. | TICKET-028/030 |
| **RULE-curriculum-design-003** | curriculum-design | must | Workflow mutations DEBEN usar las `*Validated` custom — nunca las CRUD generic auto-generadas. | TICKET-018 |
| **RULE-curriculum-design-004** | curriculum-design | must | Cambios de estado del Activity van por `transitionActivityValidated`; otros campos por `updateActivityValidated`. **Relevante para HU3 de versionamiento**: el set inicial de `currentStatusId` en Create no es transicion, no viola esta rule. | TICKET-019 |
| **RULE-core-013** | core | should | Eventos del mod incluyen `_previousData` y `_triggeredBy` automaticamente en update/delete via decorator `withEventPublish`. | TICKET-020 |
| **RULE-core-015** | core | must | Worker BullMQ es CENTRALIZED en `event-worker.js`. Mods NO declaran workers independientes. | TICKET-020 |

---

## 6. Decisions (DECISION-XXX) — fuente: DKC

Decisiones de arquitectura/scope tomadas en sesiones de trabajo. Viven en `deckard/projects/up1/decisions/`.

### DECISIONs relevantes a versionamiento

| Decision | Estado | Contenido (en corto) |
|----------|--------|----------------------|
| **DECISION-005** | accepted | Postergar modelado completo de `workflowState` + objeto `Workflow` a sprint futuro (originalmente SP2). Proponia enum `[Draft, Review, Approved, Published, OpenForEdit, Deprecated]`. **Superseded** parcialmente por TICKET-018 que implemento con codes cortos (BOR, EDIT, REV-DEC, PUB, DIS, APR). |
| **DECISION-006** | accepted | Custom section con fixed RecordType — no toca polimorfismo de CurricularSection. |
| **DECISION-007** | accepted | RecordTypes son globales (no per-tenant). |
| **DECISION-012** | accepted | Two-phase tenant rollout (Phase 1 = UPU only). |
| **DECISION-015** | proposed | Captura de auditoria via event-driven BullMQ (no Prisma middleware ni resolver wrapper). Sienta precedente para futuros mods con auditoria. |
| **DECISION-mod-unico-curriculum-design** | accepted | Un solo mod `curriculum-design` para todos los objetos del agregado (no mods separados). |

---

## 7. Sprints (SPx)

| Sprint | Foco | Estado |
|--------|------|--------|
| **SP1** | Onboarding + setup inicial | done |
| **SP2** | Modelado del agregado curriculum-design (4 objetos base) | done |
| **SP3** | Workflow + Audit + Activity rename (TICKET-018/019/020 + follow-ups) | done |
| **SP4** | **Versionamiento (este doc)** | **planning** |
| **SP5** | TBD — candidato: `polymorphicChildrenDerived` + housekeeping del audit chain | future |

---

## 8. Workflow status codes (BOR, EDIT, etc.)

Estados del workflow `activity-standard` (default para Activity) seedeados en BD UPU por TICKET-018. Cada code es un `WorkflowStatus.code`.

| Code | Nombre | Category | Uso en activity-standard |
|------|--------|----------|--------------------------|
| **BOR** | Borrador | ToDo | Estado inicial. `initialStateValue` para version nueva. |
| **EDIT** | Editando | InExecution | Programa en edicion. |
| **REV-DEC** | En revision decanato | InReview | Programa en revision por el decanato. |
| **APR** | Aprobado | Published | **Seedeado pero no cableado en activity-standard hoy**. IMP-2 propone agregarlo. |
| **PUB** | Publicado | Published | Estado de programa publicado. |
| **DIS** | Descontinuado | Closed | Programa descontinuado. |
| **PROP** | Propuesto | ToDo | Solo en workflow `changeRequest-standard` (no Activity). |
| **EVAL** | En evaluacion | InReview | Solo en `changeRequest-standard`. |
| **REJ** | Rechazado | Closed | Solo en `changeRequest-standard`. |

**Mapeo con la nomenclatura Confluence original** (DECISION-005, que fue superseded):

| Confluence (PascalCase EN) | Codigo real (PascalCase ES abreviado) |
|----------------------------|---------------------------------------|
| Draft | BOR |
| OpenForEdit | EDIT |
| Review | REV-DEC |
| Approved | APR (existe pero no usado en activity-standard hoy) |
| Published | PUB |
| Deprecated | DIS |

**Por que los docs v1 usaban `["Approved", "Published"]`** y v3.1 usa `["APR", "PUB"]`: el doc original PM (v1) escribio con la nomenclatura Confluence; el codigo real implemento codes cortos. v3.1 alinea a la realidad del seed.

---

## 9. Codigos generados especificamente en los docs de versionamiento

Estos codigos los creamos nosotros en los docs v1..v3.1; no estan en DKC ni Confluence.

### 9.1 HU codes (`HU-X`, `HU-0x`)

Historia de Usuario del sprint SP4. Van a Jira como tickets hijos.

| HU | Tema |
|----|------|
| **HU-1** a **HU-13** | Stories base del versionamiento (Track 1-5) — heredadas del doc v1 PM original |
| **HU-0a, 0b, 0d, 0e, 0f, 0g** | **Track 0 — nuevas en v3/v3.1**. Cambios en SOT (Source Of Truth) que habilitan el vision declarativo de v1. Cada HU-0x corresponde a un IMP. |
| **HU-0c** | Existia en v3 (rename `sourceRefId`). **Eliminada en v3.1** por contradiccion con TICKET-020. |
| **HU-8a / HU-8b** | Split de HU-8 en v3/v3.1: a) declarar config en Activity.json, b) hook temporal para CurricularLinks. |

### 9.2 IMP codes (`IMP-X`) — solo v3/v3.1

**I**mplementation-first changes a la **SOT**. Cada IMP es un cambio en codigo / schema / Confluence / KB que habilita una capacidad que sin el cambio no es expresable declarativamente.

| IMP | Que cambia | Estado v3.1 |
|-----|------------|-------------|
| **IMP-1** | `Activity.version: Int` + `versionLabel: String?` | **Adoptado** |
| **IMP-2** | Agregar `APR` al workflow `activity-standard` | **Adoptado** |
| **IMP-3** | Rename `sourceRefId` → `parentChildRefId` en changeLog | **Rechazado** (rompe TICKET-020) |
| **IMP-4** | Codegen soporta `polymorphicChildren` en object JSON | **Adoptado parcial** (solo lectura) |
| **IMP-5** | Codegen auto-declara self-references reflexivas | **Adoptado** |
| **IMP-6** | SET NOT NULL en `Activity.workflowId` y `currentStatusId` | **Adoptado** |
| **IMP-7** | Unificar KB `AcademicActivity → Activity` | **Adoptado** |
| **IMP-8** | Agregar `"Clone"` al enum `action` de changeLog | **Rechazado** (rompe AC2 verbatim TICKET-020) |

### 9.3 D codes (`D1, D2, ..., D18`)

Design decisions tomadas en el doc de diseño. Tabla en seccion 8 de cada `diseño-versionamiento_vX.md`.

| D | Tema |
|---|------|
| **D1** | Que se clona del arbol de Activity (sections deepClone, BibRef referencia, CurricularLink remapea per BR-VER-002) |
| **D2** | Campos sobrescritos al versionar Activity (`exclude`) |
| **D5** | Constraint de unicidad sobre `code` (no hard) |
| **D7** | Limite de arbol para transaccion (≤200 nodos en SP4) |
| **D9** | `versionStrategy` default (v2: user-provided / v3.1: increment) |
| **D10** | Bump arranca en 1 o 2 |
| **D11** | Metadata `createdVia` en eventos |
| **D12** | Asignacion de HUs |
| **D13** | (v3.1) `"Clone"` en enum action — rechazado |
| **D14** | Splittear HU-2 |
| **D15** | `polymorphicChildrenDerived` en SP4 |
| **D16** | IMP-2 rompe la transicion combinada "Aprobar y publicar" |
| **D17** | `versionLabel` se hereda o se vacia al versionar |
| **D18** | Rename `sourceRefId` — rechazado |

### 9.4 P codes (`P1, P2, P3, P3.1, P3.2, P3.3, P3.4`)

Pendientes que bloquean el sprint. Decisiones que requieren input externo (PM, arquitecto, spike tecnico).

| P | Tema | Estado en v3.1 |
|---|------|----------------|
| **P1** (v2) | Links se vacian o remapean al versionar | **Resuelto** por BR-VER-002 (remapean) |
| **P2** (v2) | Sintaxis polimorfica completa o hook custom | **Reemplazado** por IMP-4 |
| **P3** (v2) | Codegen soporta self-refs reflexivas | **Reemplazado** por IMP-5 |
| **P3.1** (v3.1) | Esteban actualiza CAP-CUR-018 para `version` Int + `versionLabel` | Pendiente |
| **P3.2** (v3.1) | IMP-2 (APR state) puro o coexistente con "Aprobar y publicar" | Pendiente |
| **P3.3** (v3.1) | IMP-4 entrega solo lectura o tambien derived | Pendiente (spike JuanDi) |
| **P3.4** (v3, renumerado a P3.3 en v3.1) | Idem P3.3 | (en v3.1 ya es P3.3) |

---

## 10. Concepts DKC

### 10.1 DET (Deterministic Rules) — DET-X

Reglas no-negociables del workflow DKC. Definidas en `~/.claude/CLAUDE.md`. Aparecen en los docs como referencia operacional.

| DET | Tema |
|-----|------|
| **DET-7** | Test cases referencian al discovery que los motivo (regression obligatoria) |
| **DET-13** | Cierre basado en evidencia (no en "parece estar bien") |
| **DET-19** | Identificacion en artefactos del repo prefiere `external` (Jira ID) sobre `ticket_id` interno |
| **DET-20** | Specs particionan tasks en sessions con Gate de sync |
| **DET-21** | Teach-intake obligatorio antes de design-{tipo} |
| **DET-22** | Teach-close producido por request-close antes de status: closed |
| **DET-23** | Quality review gate al cierre de cada session ejecutada |
| **DET-25** | Test cases registrados en session de ejecucion |
| **DET-26** | Story Points tracking en frontmatter |
| **DET-27** | Commits automaticos al cierre de cada session |
| **DET-29** | Persistencia in-flight via `dkc-execute-task` |

(Lista completa en CLAUDE.md global.)

### 10.2 L codes (`L40`, `L39`, etc.) — Learns

Discoveries / lecciones aprendidas durante un ticket. Cronologicas, inmutables. Algunas se "promueven" a rules/decisions/bugs; otras quedan como contexto del ticket.

L codes mencionados en docs de versionamiento:

| L | Origen | Que es |
|---|--------|--------|
| **L40** | TICKET-020 | **CRITICO**. "Consolidacion al padre activity": cambios en hijos polimorficos (CurricularSection) se registran con `entityType=Activity, entityId=ownerId, sourceRefId=<id hijo>, sourceRefName, sourceRefType`. **Patron promovido** a `mods/curriculum-design/.ai/PATTERNS.md`. Razon por la que IMP-3 rompe TICKET-020. |
| **L39** | TICKET-020 | Limite del decorator `withEventPublish.js` para recordtypes polimorficos. |
| **L41** | TICKET-020 | B1.a wrapper override de `Mutation.updateInstance` desde el mod. |
| **L42, L43, L44** | TICKET-020 | Fields legibles + cleanup comment + lookup status names. |
| **L8, L9** | TICKET-018/019 | Workflows lifecycle=Draft, sync append-only del platform. |
| **L21** | TICKET-020 | Codegen asigna `id String @default(cuid())` por default a objetos del mod. |
| **L37** | TICKET-020 | n8n IF v2 quirks, refactor a Code node. |

### 10.3 AC (Acceptance Criteria)

Criterios de aceptacion del ticket Jira (sistema externo). Cuando un doc cita "AC2 verbatim de UPONE-1098", se refiere al criterio 2 del ticket Jira tal cual esta escrito.

Importante: el frontmatter del changeLog.json menciona *"7 valores per AC2 del ticket UPONE-1098 (verbatim)"*. Esto significa: el segundo AC del ticket Jira UPONE-1098 lista esos 7 valores. Modificarlo pisa el contrato verbatim.

### 10.4 Patrones del mod (`PATTERNS.md`)

Cada mod tiene un archivo `mods/<mod>/.ai/PATTERNS.md` con patrones promovidos como guia para implementaciones futuras. El mod curriculum-design tiene patrones que aparecen en los docs:

- Patron **L40 — consolidacion al padre**
- Patron **L41 — wrapper override de Mutation generic**
- Patron **`*Validated`** — workflow mutations (RULE-cd-003/004)

---

## 11. Modulos y repositorios mencionados

| Repo / Workspace | Path en monorepo | Owner |
|------------------|-------------------|-------|
| **object-manager** | `up1/object-manager/` | Equipo platform (JuanDi) |
| **layout** | `up1/layout/` | Equipo platform |
| **suite** | `up1/suite/` | Equipo platform (Nuxt frontend) |
| **flow** | `up1/flow/` | Equipo platform (n8n base) |
| **report-builder** | `up1/report-builder/` | Equipo platform |
| **mods/curriculum-design** | `up1/mods/curriculum-design/` | Eduardo (dev externo) |
| **mods/ai-agent** | `up1/mods/ai-agent/` | otros |
| **mods/retention-wellbeing** | `up1/mods/retention-wellbeing/` | otros |

---

## 12. Tenants

UP1 es multi-tenant. Cada tenant es una institucion.

| Tenant | Que es | Estado |
|--------|--------|--------|
| **UPU** | uPlanner University (tenant demo principal) | Activo. Default para tests + smoke. |
| **UV** | Universidad del Valle | Seed legacy (no activo en SP3+) |
| **AIEP** | AIEP | Seed legacy |
| **TEST** | Tenant de testing | Para tests automatizados |
| **UCASMT / UCENG** | Otros tenants | Existen schemas, sin uso activo en mod curriculum-design |

**Phase 1** (decision DECISION-012): todo el trabajo de curriculum-design vive en UPU. Phase 2 expandiria.

---

## 13. Acronimos

| Acronimo | Significado |
|----------|-------------|
| **AC** | Acceptance Criterion (criterio de aceptacion de un ticket Jira) |
| **AGENTS.md** | Doc verbatim de formato up1 (entregado por equipo platform 2026-04-27) |
| **BR** | Business Rule (regla de negocio Confluence) |
| **BullMQ** | Sistema de queues sobre Redis usado en up1 para eventos |
| **CAP** | Capability (capacidad funcional Confluence) |
| **Clerk** | Auth provider de up1 |
| **DET** | Deterministic Rule (regla no-negociable del workflow DKC) |
| **DKC** | Deckard Cain (sistema de knowledge management spec-driven) |
| **FK** | Foreign Key |
| **HU** | Historia de Usuario |
| **IMP** | Implementation-first change (cambio en SOT propuesto en v3/v3.1) |
| **INT-X** | Decision de integracion / interpretacion del PM via Slack |
| **KB** | Knowledge Base |
| **L** | Learn (descubrimiento cronologico durante un ticket) |
| **MADS** | Sistema externo de up1 que sincroniza datos (los detalles del integrador estan fuera de scope; aparece en enum `source` de changeLog como `MADS` para auditoria) |
| **PM** | Product Manager (Esteban) |
| **REQ** | Requirement (en spec DKC) |
| **RT** | RecordType |
| **SOT** | Source Of Truth |
| **SP** | Sprint (`SP1..SP5`) o Story Points (segun contexto) |
| **TC** | Test Case |
| **uP1 / UP1** | uPlanner 1 (el platform) |
| **WCAG / a11y** | Web Content Accessibility Guidelines / accessibility |

---

## 14. Personas mencionadas

| Persona | Rol |
|---------|-----|
| **Esteban Cortes** | PM del producto. Aprobador de cambios en Confluence (CAP-CUR-018). |
| **Eduardo Bacon** | Dev del mod curriculum-design + dev externo en validacion del proceso. Autor de la revision tecnica + prisma implementativo v3.1. |
| **JuanDi Galdames** | Dev core del platform (object-manager, codegen). Owner de los IMPs platform (IMP-4, IMP-5). |
| **Klaus** | Aprobador del diseño. |
| **Clemente Jara** | Dev externo que detecto el deploy block de PascalCase (TICKET-028). |

---

## 15. Mapa rapido — cuando ves... significa...

| Codigo | Significa | Donde mirar |
|--------|-----------|--------------|
| `TICKET-XXX` | Ticket DKC interno | `deckard/projects/up1/tickets/ticket-XXX.md` |
| `UPONE-XXXX` | Ticket Jira externo | https://u-planner.atlassian.net/browse/UPONE-XXXX |
| `SPEC-XXX` | Spec DKC | `deckard/projects/up1/specs/{module}/SPEC-XXX-*.md` |
| `CAP-CUR-XXX` | Capability Confluence | `deckard/projects/up1/specs/curriculum-design/capabilities/CAP-CUR-XXX.md` |
| `BR-XXX-XXX` | Business Rule Confluence | `deckard/projects/up1/specs/curriculum-design/business-rules/BR-XXX-XXX.md` |
| `RULE-{module}-XXX` | Rule operacional DKC | `deckard/projects/up1/rules/{module}/rule-{module}-XXX.md` |
| `DECISION-XXX` | Decision DKC | `deckard/projects/up1/decisions/DECISION-XXX-*.md` |
| `DET-X` | Deterministic Rule DKC | `~/.claude/CLAUDE.md` |
| `LXX` | Learn cronologico | En la session del ticket correspondiente |
| `HU-X / HU-0x` | Historia de Usuario | `historias-sprint-4_vX.md` |
| `IMP-X` | Implementation-first change (v3+) | `diseño-versionamiento_v3.X.md` + `cambios-versionamiento_v2-a-v3.1.md` |
| `D-X` | Design decision (tabla seccion 8) | `diseño-versionamiento_vX.md` seccion 8 |
| `P3.X` | Pendiente que bloquea el sprint | `diseño-versionamiento_v3.X.md` seccion 12 |
| `BOR/EDIT/...` | Workflow status code en BD UPU | `mods/curriculum-design/seed/_data-workflow-objects.js` |

---

## 16. Convenciones de naming en codigo

| Tipo | Convencion | Ejemplo correcto | Ejemplo incorrecto |
|------|-----------|-------------------|---------------------|
| Object JSON `title` | PascalCase | `"title": "Activity"` | `"title": "activity"` |
| Filename de layout | `default_{Object}_{mode}.json` PascalCase | `default_Activity_list.json` | `default_activity_list.json` |
| Cross-object FK `references` | PascalCase | `"references": "Workflow"` | `"references": "workflow"` |
| GraphQL resolver return | PascalCase | `): Activity!` | `): activity!` |
| Field names (propiedades) | camelCase | `workflowId`, `currentStatusId` | `WorkflowId`, `current_status_id` |
| WorkflowStatus.code | Abreviatura corta ES (PascalCase si hace falta hyphen) | `BOR`, `REV-DEC`, `PUB` | `Borrador`, `Published` |
| WorkflowStatus.category | PascalCase EN (enum cerrado) | `Published`, `InReview` | `published`, `IN_REVIEW` |
| changeLog.action enum | PascalCase EN | `Create`, `StateTransition` | `create`, `state_transition` |
| changeLog.source enum | PascalCase EN | `DirectEdit`, `MADS` | `direct_edit` |

Detalle completo en **RULE-platform-006**.

---

## 17. Convencion del prisma para los `IMP` (terminologia v3+)

El concepto **IMP** (Implementation-first change) no es estandar de DKC ni Confluence — lo introducimos en v3/v3.1 para distinguir:

- **HU normal** (HU-1..HU-13): consume capacidades existentes. Implementa la feature pedida.
- **HU-0x (IMP-X)**: modifica la SOT (codigo, schema, Confluence, KB) para HABILITAR la feature. Es un cambio enabler, no la feature en si.

Filosofia: **IMPs invierten la convencion "doc/codigo es SOT inmutable"**. En vez de adaptar el diseño a lo que existe, proponen modificar lo que existe donde no contradiga tickets cerrados.

Cada IMP rechazado en v3.1 (IMP-3, IMP-8) tiene un **fallback v2** — el diseño se degrada elegantemente al modelo conservador si el IMP no se ejecuta.
