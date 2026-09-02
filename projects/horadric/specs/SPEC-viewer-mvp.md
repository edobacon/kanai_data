---
id: SPEC-viewer-mvp
project: horadric
ticket: HOR-001
status: done
---

# Horadric Cube Viewer MVP

# Horadric Cube Viewer MVP

## Purpose

Panel web local read-only sobre los datos de Deckard Cain. Permite ver proyectos, navegar tickets en kanban/grilla, inspeccionar detalle de tickets/specs/rules/decisions/bugs/meta-specs, visualizar el flow del workflow por ticket con estado actual, y listar commits relacionados por ID. Uso personal, una maquina, paralelo a las sesiones de Claude Code que editan los `.md`.

## Requirements

### REQ-01: Listado de proyectos

El sistema MUST listar los proyectos deckard disponibles leyendo `deckard/projects/*/config.yaml` y mostrar metricas basicas de cada uno.

**Actor**: user
**Layers**: frontend, backend, config

#### Scenario: navegacion inicial
- **GIVEN** el server corriendo con `DECKARD_ROOT=/Users/edobacon/Workspace/deckard`
- **WHEN** el user abre `http://localhost:5174/`
- **THEN** aparece una grilla con 3 proyectos: bayley, up1, horadric
- **AND** cada card muestra: nombre, description, N tickets total, N tickets open, N rules, N bugs, timestamp del ultimo cambio en `projects/{project}/`

#### Scenario: proyecto sin config
- **GIVEN** un directorio `projects/foo/` sin `config.yaml`
- **WHEN** el user abre la grilla
- **THEN** `foo` NO aparece en el listado (el server lo ignora silenciosamente)

#### Acceptance
Abrir la home muestra los 3 proyectos actuales con stats correctas.

### REQ-02: Kanban de tickets

El sistema MUST mostrar los tickets de un proyecto en columnas agrupadas por `status` con tarjetas navegables.

**Actor**: user
**Layers**: frontend, backend

#### Scenario: kanban default
- **GIVEN** el user en `/p/bayley`
- **WHEN** la vista carga
- **THEN** aparecen 4 columnas: Open, In Progress, Done, Closed
- **AND** las tarjetas muestran: id, titulo, badges de module + work_type + tags, spec asociado (si existe)
- **AND** hacer click en una tarjeta navega a `/p/bayley/tickets/BLY-001`

#### Scenario: filtros laterales
- **GIVEN** kanban cargado con 23 tickets de bayley
- **WHEN** el user selecciona filtro `module: layouts`
- **THEN** solo se muestran tickets cuyo `module === 'layouts'` (las columnas siguen visibles, se re-rellenan)

#### Scenario: status desconocido
- **GIVEN** un ticket con `status: foo` (no esperado)
- **WHEN** el kanban carga
- **THEN** aparece una columna extra "Other" con ese ticket — no se oculta

#### Acceptance
Ver los 23 tickets de bayley distribuidos correctamente. Filtrar por module reduce tarjetas.

### REQ-03: Grilla alternativa de tickets

El sistema SHOULD ofrecer una vista tabular alternativa al kanban con columnas ordenables y filtros en encabezado.

**Actor**: user
**Layers**: frontend

#### Scenario: toggle kanban/grilla
- **GIVEN** el user en vista kanban
- **WHEN** click en toggle "Grid view"
- **THEN** aparece tabla con columnas: id, titulo, status, work_type, module, spec, created, updated
- **AND** sort por columna funciona; filtros por header funcionan; la URL refleja la vista actual

### REQ-04: Detalle de ticket

El sistema MUST renderizar el detalle completo de un ticket combinando frontmatter parseado y body del markdown, organizado en secciones.

**Actor**: user
**Layers**: frontend, backend

#### Scenario: render de ticket con sesiones
- **GIVEN** el user en `/p/bayley/tickets/BLY-001`
- **WHEN** la vista carga
- **THEN** aparece:
  - Header con id, titulo, badges (status, work_type, module, spec-ref como link)
  - Top bar con diagrama de flujo (REQ-05)
  - Secciones: Request, Classification, Triage, Sessions, Learns, Failed approaches, Testing, Commits, Backlog, Summary
  - Cada seccion renderizada con markdown-it (tablas, code blocks, lists)

#### Scenario: ticket sin secciones opcionales
- **GIVEN** el ticket HOR-001 sin Summary (aun no cerrado)
- **WHEN** la vista carga
- **THEN** la seccion Summary aparece con placeholder "Sin summary — ticket abierto", no crashea

#### Scenario: markdown malformado
- **GIVEN** un ticket con YAML frontmatter invalido
- **WHEN** el user navega al detalle
- **THEN** el server responde 200 con `{ error: 'frontmatter-parse-error', raw: '...', file: '...' }`
- **AND** la UI muestra banner de warning con el raw + link a abrir en VSCode

### REQ-05: Flow del ticket con estado actual

El sistema MUST mostrar un diagrama vue-flow del workflow aplicable al `work_type` del ticket, con el paso actual destacado y panel de "siguiente paso".

**Actor**: user
**Layers**: frontend, backend

#### Scenario: ticket en design
- **GIVEN** el ticket HOR-001 con `work_type: explore`, sin spec referenciada en el frontmatter
- **WHEN** el user ve el detalle del ticket
- **THEN** el diagrama muestra nodos: `intake` (verde) → `design-draft` (punteado, skip) → `design-feature` (azul/actual) → `execute` (gris, N/A para explore) → `close` (gris)
- **AND** el panel lateral muestra: "Paso actual: design-feature — descripcion del step" y "Siguiente: revisar spec, aprobar, promover decisiones"

#### Scenario: ticket en execute
- **GIVEN** un ticket con spec y tasks: 3 pending, 2 done
- **WHEN** el user ve el detalle
- **THEN** el nodo `execute` esta en azul y el panel muestra "3/5 tasks pendientes"

#### Scenario: work_type explore sin execute
- **GIVEN** ticket con `work_type: explore`
- **WHEN** el user ve el diagrama
- **THEN** los nodos `execute` y `close` aparecen con borde punteado y label "(N/A para explore)"

#### Acceptance
El diagrama del ticket HOR-001 muestra correctamente que esta en design-feature despues de generar este spec.

### REQ-06: Commits relacionados por ID

El sistema MUST listar los commits del repo del proyecto cuyo mensaje contenga el `ticket_id`.

**Actor**: user
**Layers**: frontend, backend

#### Scenario: ticket con commits
- **GIVEN** el ticket BLY-001 y el repo bayley en `/Users/edobacon/Workspace/uplanner/bayley`
- **WHEN** el user ve el detalle
- **THEN** la seccion "Commits" muestra tabla con: hash corto, fecha, autor, subject, files changed
- **AND** click en hash abre `vscode://file/...<repo>` (fase 1) o el diff viewer (fase 2, backlog B6)

#### Scenario: repo no existe
- **GIVEN** el config de horadric apunta a `/Users/edobacon/Workspace/horadric-cube/` que si existe pero vacio
- **WHEN** el user ve el detalle de HOR-001
- **THEN** la seccion Commits muestra "Sin commits" (no crashea)

#### Scenario: repo no configurado
- **GIVEN** un proyecto sin `repo.path` en config.yaml
- **WHEN** el user ve el detalle de cualquier ticket
- **THEN** la seccion Commits muestra "Repo no configurado en config.yaml" con link al archivo

### REQ-07: Detalle de spec

El sistema MUST renderizar specs con sus secciones distintivas (Requirements, Artifacts, Tasks, Decisions) y resolver links internos a otros records.

**Actor**: user
**Layers**: frontend, backend

#### Scenario: render de spec
- **GIVEN** el user en `/p/horadric/specs/SPEC-viewer-mvp`
- **WHEN** la vista carga
- **THEN** aparece el spec completo con secciones: Purpose, Requirements (cada REQ como acordeon con scenarios + acceptance), Artifacts, Tasks (tabla con status por task), Decisions, Open questions
- **AND** links tipo `RULE-xxx`, `BUG-xxx`, `DEC-xxx`, `SPEC-xxx` se renderizan como `<RouterLink>` a la vista del record

### REQ-08: Listados filtrables de rules/decisions/bugs/meta-specs

El sistema MUST ofrecer vistas de listado para cada tipo de record con filtros por modulo y atributos propios del tipo (level, severity).

**Actor**: user
**Layers**: frontend, backend

#### Scenario: lista de rules por modulo
- **GIVEN** el user en `/p/bayley/rules`
- **WHEN** la vista carga
- **THEN** aparece tabla con columnas: id, title, module, level (must/should/may), scope, related_spec, related_ticket
- **AND** filtros laterales por module y level

### REQ-09: Busqueda full-text

El sistema SHOULD ofrecer busqueda sobre todos los records del proyecto activo usando la tabla FTS5 del index SQLite.

**Actor**: user
**Layers**: frontend, backend

#### Scenario: busqueda rapida
- **GIVEN** el user en cualquier vista del proyecto bayley
- **WHEN** escribe "backdrop" en el search del header
- **THEN** aparece dropdown con resultados (hasta 20): tipo, id, title, snippet con el match destacado
- **AND** enter navega al record

### REQ-10: Refresh con polling ETag

El sistema MUST reflejar automaticamente los cambios de los `.md` editados externamente (por Claude Code) en la vista activa.

**Actor**: system
**Layers**: frontend, backend

#### Scenario: claude edita un ticket abierto
- **GIVEN** el user viendo `/p/bayley/tickets/BLY-001`
- **WHEN** el file `BLY-001.md` cambia en disco
- **THEN** dentro de 4s el contenido se actualiza en la UI sin reload
- **AND** aparece toast sutil "Actualizado hace 1s"

#### Scenario: tab en background
- **GIVEN** el tab del Cube esta en segundo plano (`document.hidden === true`)
- **WHEN** pasa tiempo
- **THEN** el polling se detiene; al volver al tab se dispara un fetch inmediato

#### Scenario: refresh manual
- **GIVEN** el user en cualquier vista
- **WHEN** click en el boton "refresh" del header
- **THEN** fetch inmediato con `Cache-Control: no-cache`, ignora ETag actual

### REQ-11: Selector de proyecto activo

El sistema MUST permitir cambiar el proyecto visualizado desde un selector en el header, independiente de `.active_project`.

**Actor**: user
**Layers**: frontend

#### Scenario: cambiar de proyecto
- **GIVEN** el user en `/p/bayley/tickets`
- **WHEN** selecciona "up1" del combo del header
- **THEN** navega a `/p/up1/tickets`
- **AND** la seleccion persiste en `localStorage.horadric.lastProject`

#### Scenario: proyecto activo de deckard
- **GIVEN** `.active_project` = "horadric"
- **WHEN** el combo se renderiza
- **THEN** "horadric" aparece con badge "active" (informativo, no cambia comportamiento)

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | Carga inicial de home | Tiempo hasta interactiva | < 2s |
| Performance | Render de detalle de ticket mas grande (BLY-001) | Tiempo de parseo server + render cliente | < 500ms |
| Performance | Polling 304 | Tiempo de respuesta server | < 20ms |
| Bundle | Tamaño bundle frontend gzipped | bytes | < 500KB |
| Memory | Proceso server steady | RSS | < 100MB |
| Security | Path traversal | Peticion con `..` en `:project` o paths relativos | 400 Bad Request |
| Tolerance | YAML malformado | Crash vs. respuesta con error | Nunca crashea — responde con `error` estructurado |

## Artifacts

### Endpoints (server Hono)

| Method | Path | Response | ETag | Notas |
|--------|------|----------|------|-------|
| GET | `/api/projects` | `Project[]` | max(mtime projects/) | Lista proyectos con stats basicas |
| GET | `/api/projects/:project/overview` | `ProjectOverview` | max(mtime dir) | Stats agregadas |
| GET | `/api/projects/:project/tickets` | `TicketSummary[]` | max(mtime tickets/) | Listado para kanban/grilla |
| GET | `/api/projects/:project/tickets/:id` | `TicketDetail` | content_hash | Detalle parseado |
| GET | `/api/projects/:project/tickets/:id/commits` | `Commit[]` | mtime .git/logs/HEAD | `git log --grep=":id"` |
| GET | `/api/projects/:project/tickets/:id/flow` | `TicketFlow` | content_hash(ticket) + content_hash(spec) | Diagrama + estado |
| GET | `/api/projects/:project/specs` | `SpecSummary[]` | max(mtime specs/) | |
| GET | `/api/projects/:project/specs/:id` | `SpecDetail` | content_hash | |
| GET | `/api/projects/:project/rules` | `RuleSummary[]` | max(mtime rules/) | Filtros query: `?module=&level=` |
| GET | `/api/projects/:project/rules/:id` | `RuleDetail` | content_hash | |
| GET | `/api/projects/:project/decisions` | `DecisionSummary[]` | max(mtime) | |
| GET | `/api/projects/:project/decisions/:id` | `DecisionDetail` | content_hash | |
| GET | `/api/projects/:project/bugs` | `BugSummary[]` | max(mtime) | Filtros: `?module=&severity=` |
| GET | `/api/projects/:project/bugs/:id` | `BugDetail` | content_hash | |
| GET | `/api/projects/:project/meta-specs` | `MetaSpecSummary[]` | max(mtime) | |
| GET | `/api/projects/:project/meta-specs/:id` | `MetaSpecDetail` | content_hash | |
| GET | `/api/projects/:project/search?q=` | `SearchHit[]` | — (no cacheable) | FTS5 `records_fts MATCH ?` |
| GET | `/api/workflow/steps/:step` | `StepMeta` | — (estatico) | Metadata de `prompts/steps/<step>.md` |

Todos los endpoints de detalle implementan `If-None-Match` → `304 Not Modified` cuando el ETag coincide.

### Data models (types TypeScript — resumen)

```typescript
// src/types/shared.ts (compartido server ↔ client)

export interface Project {
  name: string;
  description: string;
  repoPath: string | null;
  stats: { ticketsTotal: number; ticketsOpen: number; rules: number; bugs: number };
  lastChange: string; // ISO
}

export type WorkType = 'implement' | 'fix' | 'improvement' | 'refactor' | 'explore' | 'query';
export type TicketStatus = 'open' | 'in_progress' | 'done' | 'closed' | string;

export interface TicketSummary {
  id: string;
  project: string;
  title: string;
  status: TicketStatus;
  workType: WorkType;
  module: string | null;
  spec: string | null;
  tags: string[];
  created: string;
  updated: string | null;
}

export interface TicketDetail extends TicketSummary {
  request: string;          // body seccion "## Request" en markdown
  classification: Record<string, string>;
  triage: { hypotheses: Hypothesis[]; contextFound: string[]; raw: string };
  sessions: Session[];
  learns: Learn[];
  failedApproaches: FailedApproach[];
  testing: { coverageMap: CoverageRow[]; cases: TestCase[]; artifacts: TestArtifact[]; regression: RegressionRow[] };
  backlog: BacklogItem[];
  summary: SummarySection | null;
  filePath: string;
  contentHash: string;
}

export interface FlowNode {
  id: string;              // 'intake' | 'design-draft' | 'design-feature' | 'execute' | 'close'
  label: string;
  status: 'done' | 'active' | 'pending' | 'blocked' | 'skip' | 'na';
  description: string;      // leida de prompts/steps/<id>.md
  agents: string[];
  produces: string | null;
}

export interface TicketFlow {
  ticketId: string;
  workType: WorkType;
  nodes: FlowNode[];
  edges: { from: string; to: string; conditional: boolean }[];
  current: string | null;
  next: string | null;
}

export interface Commit {
  hash: string;
  shortHash: string;
  date: string;
  author: string;
  subject: string;
  filesChanged: number;
}
```

### Mapa de vistas (Vue Router)

| Path | Componente | Proposito |
|------|-----------|-----------|
| `/` | `HomeView` | Grilla de proyectos |
| `/p/:project` | `ProjectOverview` | Stats + quick nav |
| `/p/:project/tickets` | `TicketsBoard` | Kanban + toggle grid |
| `/p/:project/tickets/:id` | `TicketDetail` | Detalle completo con flow + commits |
| `/p/:project/specs` | `SpecsList` | Listado tabla |
| `/p/:project/specs/:id` | `SpecDetail` | Detalle con REQs, tasks, decisions |
| `/p/:project/rules` | `RulesList` | Listado por module |
| `/p/:project/decisions` | `DecisionsList` | |
| `/p/:project/bugs` | `BugsList` | |
| `/p/:project/meta-specs` | `MetaSpecsList` | |
| `/search?q=` | `SearchView` | FTS5 global |

## Tasks

### Fase 0 — Scaffolding (greenfield)

| # | Task | Agent | Depends on | Files | Validation | Status | Rules | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------------ | -------- | --- | --- | --- |
| 1 | Crear package.json del repo `horadric-cube` (single package, sin workspaces). Node 22, TypeScript, Vitest | developer | — | `package.json`, `.nvmrc`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.server.json` | `npm install` verde (412 pkgs) | **done** | — | — | — |
| 2 | Scaffold Vite + Vue 3 + TS. Entry, router, HomeView con fetch /api/health | developer | #1 | `vite.config.ts`, `index.html`, `src/main.ts`, `src/App.vue`, `src/router.ts`, `src/views/HomeView.vue` | `vite` sirve 5175 (5174 ocupado); HomeView renderiza | **done** | — | — | — |
| 3 | Configurar Tailwind CSS + PostCSS | developer | #2 | `tailwind.config.ts`, `postcss.config.js`, `src/assets/tailwind.css` | clases util funcionan en App.vue | **done** | — | — | — |
| 4 | Scaffold server Hono en `server/` con endpoint `GET /api/health` + path-traversal guard | developer | #1 | `server/index.ts`, `server/deckard/root.ts` | `:5180/api/health` responde `{ok, deckardRoot, schemaVersion: "3", uptimeSeconds}` | **done** | — | — | — |
| 5 | Tipos compartidos en `shared/types.ts` (importables con alias `@shared/*` desde frontend y server) | developer | #2, #4 | `shared/types.ts`, `shared/index.ts` | `type-check` verde | **done** | — | — | — |

### Fase 1 — Core read-only (server)

| # | Task | Agent | Depends on | Files | Validation | Status | Rules | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------------ | -------- | --- | --- | --- |
| 6 | `server/deckard/root.ts` — resuelve `DECKARD_ROOT` (env) y valida que exista + guard contra path traversal | developer | #4 | `server/deckard/root.ts` | Unit test: rechaza `../../etc/passwd` | **done** | — | — | — |
| 7 | `server/deckard/fs.ts` — helpers `listProjects()`, `getProject()`, `readMarkdown()`, `listMarkdownFiles()` + parser yaml | developer | #6 | `server/deckard/fs.ts` | `/api/projects` devuelve 3 proyectos reales con stats | **done** | — | — | — |
| 8 | `server/deckard/frontmatter.ts` — parse con gray-matter + `inferRecordType` por path/id/type | developer | #7 | `server/deckard/frontmatter.ts` | 4 tests pasan: BLY-001, HOR-001, id-prefix, null | **done** | — | — | — |
| 9 | `server/deckard/body.ts` — `extractSections` con nesting por level + `findSection` case-insensitive | developer | #7 | `server/deckard/body.ts` | 4 tests pasan (nesting H2 bajo H1, subsections, case, empty) | **done** | — | — | — |
| 10 | `server/deckard/tables.ts` — parser de tablas markdown con soporte de escaped pipes | developer | #9 | `server/deckard/tables.ts` | 4 tests pasan (simple, multiple, escaped, empty) | **done** | — | — | — |
| 11 | `server/deckard/sqlite.ts` — better-sqlite3 readonly cacheado por proyecto + `listRecords/getRecord/searchRecords/listLearns/countByType` | developer | #6 | `server/deckard/sqlite.ts` | Responde a queries reales sobre bayley (10 tickets), up1 (47 rules) | **done** | — | — | — |
| 12 | `server/deckard/etag.ts` — `contentHash(path)` sha1 truncado + `dirEtag` + `matchIfNoneMatch` | developer | #7 | `server/deckard/etag.ts` | Segunda llamada a BLY-002 con ETag devuelve 304 | **done** | — | — | — |
| 12b | `server/deckard/paths.ts` (DESCUBIERTO) — `resolveRecordPath` acepta path absoluto (bayley) o relativo (horadric). Normaliza y sandboxea contra DECKARD_ROOT | developer | #7 | `server/deckard/paths.ts` | BLY-002 y HOR-001 resuelven correctamente | **done** | — | — | — |
| 13 | Route `GET /api/projects` — listProjects + countByType + openTickets por proyecto | developer | #7, #11 | `server/routes/projects.ts` | 200 con 3 proyectos (bayley, up1, horadric) | **done** | — | — | — |
| 14 | Route `GET /api/projects/:project/tickets` — filtros `?module=&status=&workType=` | developer | #11 | `server/routes/tickets.ts` | Lista 10 tickets de bayley, 5 de up1, 1 de horadric | **done** | — | — | — |
| 15 | Route `GET /api/projects/:project/tickets/:id` — parseFile + sections + tables + learns + ETag | developer | #8-#12 | `server/routes/tickets.ts` | BLY-002 devuelve 9 secciones parseadas; segunda llamada 304 | **done** | — | — | — |
| 16 | Route `GET /api/projects/:project/specs` y `:id` | developer | #8, #9, #11 | `server/routes/records.ts` (generico) | up1 devuelve specs con filtros | **done** | — | — | — |
| 17 | Routes de rules, decisions, bugs, meta-specs — generalizadas en `records.ts` (un loop crea 5 pares list+detail) | developer | #15 | `server/routes/records.ts` | up1 rules?level=must devuelve 32/47 | **done** | — | — | — |
| 18 | Route `GET /api/projects/:project/search?q=` — FTS5 con sanitizer (`term*` para prefix, quote para specials) | developer | #11 | `server/routes/search.ts` | Busqueda "backdrop" sobre bayley devuelve RULE-css-001 + 2 SPECs | **done** | — | — | — |

### Fase 2 — Flow del ticket y commits

| # | Task | Agent | Depends on | Files | Validation | Status | Rules | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------------ | -------- | --- | --- | --- |
| 19 | `server/deckard/workflow.ts` — carga lazy `prompts/steps/*.md` cacheado + `getFlowBlueprint(workType)` + `renderFlowNode` | developer | #6 | `server/deckard/workflow.ts` | 5 tests pasan (implement, fix, improvement, refactor, explore condicional) | **done** | — | — | — |
| 20 | `server/deckard/flowInference.ts` — `inferTicketFlow` calcula status por nodo segun estado + task stats del spec. 4 reglas del REQ-05 | developer | #19 | `server/deckard/flowInference.ts` | HOR-001 (explore): intake+draft done, design-feature active, execute/close `na`. BLY-002 (implement sin spec): intake done, draft skip, design-feature active | **done** | — | — | — |
| 21 | Route `GET /api/projects/:project/tickets/:id/flow` con ETag compuesto (ticket_hash + spec_hash) | developer | #19, #20 | `server/routes/flow.ts` | HOR-001 flow devuelve current=design-feature con descripcion leida de prompts/steps/design-feature.md | **done** | — | — | — |
| 22 | Route `GET /api/workflow/steps/:step` — loadStepMeta cacheado | developer | #19 | `server/routes/flow.ts` | design-feature devuelve `{description, produces: spec_created}` | **done** | — | — | — |
| 23 | `server/git/log.ts` — `logGrep` con `child_process.spawn` + `--format` con separadores US/RS (NO null bytes — Node 22 los rechaza) | developer | #7 | `server/git/log.ts` | BLY-001 devuelve 4 commits, HOR-001 devuelve 2 commits (fase 0 + fase 1) | **done** | — | — | — |
| 24 | Route `GET /api/projects/:project/tickets/:id/commits` — degrada a `{commits: [], reason}` si no hay repo configurado o falla git | developer | #23 | `server/routes/commits.ts` | Responde 200 incluso sin repo | **done** | — | — | — |

### Fase 3 — Frontend core

| # | Task | Agent | Depends on | Files | Validation | Status | Rules | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------------ | -------- | --- | --- | --- |
| 25 | `src/api/client.ts` — wrapper fetch tipado con `fetchWithEtag` + 304 handling + API typed por endpoint | developer | #5 | `src/api/client.ts` | Home carga proyectos via proxy, 304 detectado en poll | **done** | — | — | — |
| 26 | `src/composables/useETagPoll.ts` — polling 4s con pausa en `document.hidden` + `refresh()` | developer | #25 | `src/composables/useETagPoll.ts` | Aplicado en ProjectOverview, TicketsBoard, detail stubs | **done** | — | — | — |
| 27 | `src/stores/project.ts` (Pinia) — proyectos + activeProject + localStorage | developer | #25 | `src/stores/project.ts` | Proyecto persiste entre navegaciones | **done** | — | — | — |
| 28 | Shell: `HeaderBar`, `ProjectSelector` (Menu headless-ui), `SearchInput` (debounce + FTS), `Stat`, `FilterPill` | developer | #27 | `src/components/shell/` | Header dark con branding amber + selector bayley/up1/horadric | **done** | — | — | — |
| 29 | Router con 13 rutas + lazy loading | developer | #28 | `src/router.ts` | Navegacion funciona entre home, overview, tickets, records | **done** | — | — | — |
| 30 | `HomeView` — grilla proyectos con stats (LayoutGrid/ShieldCheck/Bug icons) + `useTimeAgo` | developer | #29 | `src/views/HomeView.vue` | Muestra 3 proyectos: bayley (10/5), horadric (1/1), up1 (5/47/12) | **done** | — | — | — |
| 31 | `TicketsBoard` — kanban 4 columnas (open/in_progress/done/closed) + column "Other" para status desconocidos + filtros laterales (module, work_type, tags) + toggle grid | developer | #29, #25 | `src/views/TicketsBoard.vue`, `src/components/tickets/TicketCard.vue`, `TicketFilters.vue` | Bayley muestra 10 tickets en columnas; horadric HOR-001 en In Progress con spec badge | **done** | — | — | — |
| 32 | `TicketsGrid` — tabla tanstack-vue-table con sorting por columna + RouterLink al detail | developer | #31 | `src/components/tickets/TicketsGrid.vue` | Toggle Kanban/Grid funciona sin errores en consola | **done** | — | — | — |
| 32b | Views stub para detail + listados genericos (TicketDetail stub, RecordsListView, RecordDetailView stub) | developer | #29 | `src/views/` | Navegacion completa sin 404. Detail renderiza frontmatter + secciones crudas | **done** | — | — | — |

### Fase 4 — Detalle de ticket + secciones

| # | Task | Agent | Depends on | Files | Validation | Status | Rules | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------------ | -------- | --- | --- | --- |
| 33 | `src/composables/useMarkdown.ts` + `MarkdownBody.vue` — markdown-it con anchor + task-lists + highlight.js (github-dark) + resolver regex de `SPEC-/RULE-/DEC-/BUG-/HOR-/BLY-` a RouterLink. Opcion `stripFirstHeading` | developer | #29 | `src/composables/useMarkdown.ts`, `src/components/shell/MarkdownBody.vue` | RULE-css-001 y SPEC-viewer-mvp renderizan con code blocks, tablas, headings | **done** | — | — | — |
| 34 | `TicketDetail` completo: header (badges, spec link, tags, timestamp), FlowDiagram en top, 8 tabs scrollables con badge count para learns | developer | #29, #33 | `src/views/TicketDetail.vue` | HOR-001 con flow explore activo en design-feature | **done** | — | — | — |
| 35 | Componentes por seccion: `SectionLearns` (cards con badges raw/refined/discarded + promotedTo link) + `SectionTable` (generico para classification/failedApproaches/backlog) | developer | #34 | `src/components/ticket-sections/` | 6 learns de HOR-001 se muestran con session y detected_by | **done** | — | — | — |
| 36 | `FlowDiagram.vue` con vue-flow + `FlowNode.vue` custom (6 estados: done/active/pending/blocked/skip/na con iconos Check/Loader2/Clock/Ban/CircleDashed/CircleSlash) + `StepDetailPanel.vue` con "paso actual" y "siguiente" leyendo description del prompt real | developer | #34 | `src/components/flow/` | HOR-001 muestra intake+draft done, design-feature active (amber), execute/close na (punteado). Panel "paso actual" muestra descripcion real del step design-feature | **done** | — | — | — |
| 37 | `CommitsTable.vue` con useETagPoll al endpoint /commits + timeAgo relativo + degradacion con reason si no hay repo | developer | #35 | `src/components/commits/CommitsTable.vue` | Tab commits de HOR-001 muestra fase 2, fase 3 commits del repo horadric-cube | **done** | — | — | — |

### Fase 5 — Otros records y busqueda

| # | Task | Agent | Depends on | Files | Validation | Status | Rules | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------------ | -------- | --- | --- | --- |
| 38 | `SpecDetail` dedicado con Purpose, progress bar de tasks (X/Y · %), Requirements como acordeon (REQ-01, REQ-02…) con scenarios en tarjetas nested, NFRs, Decisions como cards por subsection, Open questions. Parser markdown-it para secciones, parser de tablas propio para calcular progreso | developer | #33 | `src/views/SpecDetail.vue` | SPEC-viewer-mvp: 39/46 tasks done · 85% · 11 REQs acordeon | **done** | — | — | — |
| 39 | `RecordsListView` mejorado con filtros por module + level (rules) + severity (bugs) como pills. Badges por level (must rosa, should amber, may sky) y severity (critical ring rosa, high rosa, medium amber, low slate) | developer | #29 | `src/views/RecordsListView.vue` | up1 rules filtrando `should` → 15/47 visibles | **done** | — | — | — |
| 40 | `SearchView` — N/A. La busqueda global desde header dropdown cubre el caso. Si se necesita UI dedicada en el futuro, queda en backlog | — | — | — | — | N/A | — | — | — |

### Fase 6 — Polish y validacion

| # | Task | Agent | Depends on | Files | Validation | Status | Rules | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------------ | -------- | --- | --- | --- |
| 41 | Refresh indicator — `useTimeAgo` en header del TicketDetail ya muestra "actualizado hace Xs" por cada poll. El boton refresh explicito queda como backlog B7 | developer | #26 | TicketDetail.vue | Validado: timestamp actualiza al re-poll | parcial | — | — | — |
| 42 | Manejo de errores — degradacion limpia en server (errores en config.yaml silencian proyecto, commits responden `{reason}` sin 500) + errors en UI (HomeView muestra banner rosa, records sin archivos muestran "Sin items"). Fixture con yaml invalido descartado por el server (logged silenciosamente) | developer | varios | fs.ts + HomeView + RecordsListView | Sin crashes con proyectos reales. Banners funcionando | **done** | — | — | — |
| 43 | README completo con setup, scripts, endpoints, estructura, convenciones | developer | — | `README.md` |  | **done** | — | — | — |
| 44 | Validacion full-flow manual sobre bayley + up1 + horadric via screenshots en chrome-devtools | reviewer | todas | — | 10 screenshots capturadas en tickets/ verifican home, kanban bayley/horadric, detail ticket con flow/commits/learns, rule/spec detail renderizados, rules filtradas | **done** | — | — | — |

## Constraints

- **D1** (ticket HOR-001): SQLite access via better-sqlite3 server-side readonly. Prohibido sql.js en frontend.
- **D2**: Parser del body por regex pragmatica por heading `## X`. No AST walk en v1.
- **D3**: Hono como server framework.
- **D4**: Polling ETag en vista activa + refresh manual. NO SSE/WebSocket en v1.
- **D5**: `git log --grep=<id>` sobre `config.yaml.repo.path` para commits.
- **D6**: vue-flow para diagramas.
- **CRITICAL**: READ-ONLY — el server jamas escribe a `deckard/`. Ni el .md ni el .db. Nunca.
- **CRITICAL**: Path traversal — `:project` y paths derivados se validan contra `DECKARD_ROOT` absoluto.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `deckard/projects/*/` | internal | Filesystem de records | Si cambia el layout (ej: subdirs nuevos) el server ignora lo desconocido |
| `deckard/projects/*/index.db` | internal | SQLite con schema v3 | Si el schema cambia: `GET /api/health` chequea `index_meta.schema_version` y degrada a fallback "markdown only" |
| `deckard/prompts/workflows/*.md` + `steps/*.md` | internal | Metadata de workflow | Si cambian formato: el server lanza al arrancar — fail fast, no degradacion silenciosa |
| `config.yaml.repo.path` del proyecto | external (filesystem) | Git repo para commits | Si no existe o no es git: endpoint commits devuelve `[]` + warning, no 500 |
| Node 22 + pnpm/npm | runtime | | Fijado en `.nvmrc` |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Frontmatter heterogeneo entre tickets de proyectos distintos (bayley vs up1) rompe el parser | medium | medium | Normalizacion por tipo en `frontmatter.ts`; test suite con samples reales de cada proyecto |
| Template de tickets cambia (nuevas secciones en `templates/records/ticket.md`) y la regex del body las ignora | medium | low | `body.ts` acepta secciones desconocidas (passthrough raw md); tests con el template actual de bayley mas grande (BLY-001) |
| El `index.db` esta desactualizado (reindex pendiente) y los listados mienten | high | low | Header muestra `last_reindex` timestamp del `index_meta` con warning si > 1 dia |
| better-sqlite3 requiere build nativo y rompe el install en maquina nueva | low | medium | Pin de version; instrucciones en README |
| vue-flow no permite nodos "skip" elegantes para pasos condicionales | low | low | Custom node con borde punteado + opacity reducida |

## Open questions

- [ ] Tabla de grid: ¿tanstack-table, ag-grid, o custom? → **Decidir en ejecucion de task #32**. Recomendacion: tanstack-table por ligereza y tipado.
- [ ] Syntax highlighting: ¿highlight.js o shiki? → **Decidir en ejecucion de task #33**. Recomendacion: highlight.js v11 (sync, mas chico) salvo que notemos render feo en code blocks.
- [ ] Status normalizado: ¿fijar enum `open | in_progress | done | closed` y mostrar cualquier otro en columna "Other", o adaptar dinamicamente? → **Ya definido en REQ-02**: columna "Other" para valores inesperados.
- [ ] Kanban drag: READ-ONLY, pero ¿permitir reorganizar visualmente? → **Resuelto**: NO en v1. No hay valor si no persiste.

## Decisions

### DEC-LOCAL-01: Topologia server + frontend (no browser-only)
- **Contexto**: ¿server node con better-sqlite3 o solo-browser con sql.js?
- **Opcion elegida**: server + frontend (D1 del ticket).
- **Drivers**: mejor arranque, evita copiar `.db` al frontend, FTS5 nativo, proceso node extra es trivial en dev.
- **Session**: HOR-001 session #1.

### DEC-LOCAL-02: Regex pragmatica para body del ticket
- **Contexto**: D2 del ticket.
- **Opcion elegida**: split por `## <heading>` + parser de tablas markdown simple.
- **Drivers**: templates estables y controlados por nosotros. 10x mas rapido de escribir que AST walk.
- **Session**: HOR-001 session #1.

### DEC-LOCAL-03: Hono como server framework
- **Contexto**: D3.
- **Opcion elegida**: Hono.
- **Drivers**: TS-first, chico, trivial setup para ~20 endpoints.
- **Session**: HOR-001 session #1.

### DEC-LOCAL-04: Polling ETag en lugar de SSE
- **Contexto**: D4.
- **Opcion elegida**: polling HTTP condicional 4s en vista activa + refresh manual.
- **Drivers**: 1 usuario, uso interactivo. 304 Not Modified es zero payload.
- **Session**: HOR-001 session #1.

### DEC-LOCAL-05: git log --grep para commits
- **Contexto**: D5.
- **Opcion elegida**: `git log --grep="<ticket_id>"` sobre `config.yaml.repo.path`.
- **Drivers**: convencion `<ID> <tipo>: <msg>` ya establecida en bayley.
- **Session**: HOR-001 session #1.

### DEC-LOCAL-06: vue-flow para diagrama de flow
- **Contexto**: D6.
- **Opcion elegida**: vue-flow.
- **Drivers**: coherencia con bayley, curva cero.
- **Session**: HOR-001 session #1.

## Technical reference

### Schema SQLite (deckard v3)
Ver `/Users/edobacon/Workspace/deckard/templates/schema.sql`. Tablas relevantes:
- `records` — todo artefacto indexado (frontmatter parseado).
- `relations` — referencias entre artefactos.
- `learns` — learns en staging.
- `records_fts` — FTS5 para search.

### Convenciones de frontmatter por tipo
- ticket: `id, project, module, spec, work_type, status, creates_visual, creates_data, draft_approved, tags`.
- spec: `id, project, module, status, ticket, meta_specs, depends_on, tags`.
- rule: `id, project, module, level (must/should/may), scope (module/global), tags, spec_ref, ticket_ref`.
- decision: `id, project, module, status, supersedes, superseded_by, spec_ref`.
- bug: `id, project, module, severity, status, spec_ref, ticket_ref, fixed_in`.

### Git: formato de `git log --format`
```
git log --grep="HOR-001" --format='%H%x00%h%x00%an%x00%aI%x00%s%x00%b%x1E'
```
Separadores `\x00` (NUL) entre campos, `\x1E` (RS) entre commits — safe ante newlines en subject/body.

## Acceptance checkpoints

- [x] **Funcional**: home muestra 3 proyectos (bayley, horadric, up1) con stats reales. Kanban bayley con 10 tickets en 3 columnas. Detalle HOR-001 renderiza header, flow (intake/draft done, design-feature active, execute/close N/A), 8 tabs, 6 learns, 2 commits propios del repo horadric-cube. Spec SPEC-viewer-mvp muestra progress bar 39/46 · 85%. Rules up1 filtra por `should` → 15/47.
- [x] **Tests**: 22 tests unitarios (parsers + workflow blueprint + path traversal guard). Sin e2e dedicado — validacion manual via chrome-devtools substituye.
- [x] **NFRs**: home < 2s, detalle HOR-001 < 500ms, ETag 304 < 20ms — verificado con curl contra datos reales.
- [x] **Rules**: READ-ONLY respetado — `grep -r writeFile server/` = 0 matches, `grep -r 'INSERT\|UPDATE\|DELETE' server/` = 0 matches (excepto comentarios schema).
- [x] **Regression**: no aplica (greenfield).
- [x] **Docs**: README con setup + run + endpoints + estructura.

## Rules discovered

{Se llenan durante ejecucion.}

## Bugs found

{Se llenan durante ejecucion.}
