---
id: SPEC-workflow-repo-layer-048
project: horadric
ticket: HOR-048
status: done
---

# Repository layer tipada para paths DKC (`commands/lib/repo/`)

# Repository layer tipada para paths DKC (`commands/lib/repo/`)

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle tecnico vive abajo.*

**Que se quiere**: hoy las convenciones de paths de DKC (`tickets/{id}.md`, `{id}.teach/`, `{id}.draft/`, `{id}.sessions/`, `specs/`, `rules/{module}/`, etc.) viven hardcoded como strings repetidos en cada script de `commands/lib/*.ts`, y hasta la resolucion del propio `deckardRoot` esta implementada de 3 formas distintas. Renombrar una convencion implica un grep cross-archivo sin garantia de cobertura. Este ticket introduce una **capa tipada en `commands/lib/repo/`** que centraliza (a) las convenciones en una constante unica, (b) la resolucion de root, (c) los resolvers de path por entidad, (d) la clasificacion de un path a su tipo de record, y (e) la regla DET-19 (`external ?? ticket_id`). Es **aditiva**: ningun consumer rompe; se migran los prioritarios y el resto queda con su codigo actual funcionando.

**Decisiones criticas que necesitan tu OK** (racional en Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Layer TS en `commands/lib/repo/`, NO en `server/src/` | `server/src` es Python (dkc-mcp). El toolchain TS (tsx+zod+vitest) ya vive en `commands/lib`. Refuta H1 original |
| 2 | Server Python queda FUERA de alcance (backlog `should`) | Un modulo unico cross-language (Py+TS) es imposible. Cubrir TS primero maximiza valor / minimiza blast radius |
| 3 | HC se alinea por **paridad-de-test**, NO por import cross-repo | `horadric-cube` es repo independiente; import build-time es fragil (anti-patron conocido). HC ya tiene su semilla `root.ts`/`paths.ts` |
| 4 | API async (`fs/promises`) con helpers sync donde el CLI lo exija | Los scripts de `commands/lib` corren bajo tsx con top-level await |

**Riesgos principales y como los mitigamos**:

- **Regresion silenciosa al migrar consumers reales** (`validate.ts`, `compress-session.ts` son criticos del toolchain DKC) → S3 es ⚑ fuerte; la suite vitest completa de `commands/lib` corre como red de seguridad antes de cerrar, y cada migracion preserva el comportamiento observable (REQ-PRESERVE-02).
- **Drift de forma con HC** (dos layers que divergen) → test de paridad que verifica que la forma de la API publica coincide (REQ-PRESERVE-03).
- **Scope creep hacia "la layer tambien hace pipeline/validacion"** → limite explicito: la layer SOLO resuelve y clasifica paths; no parsea markdown ni valida (eso es validate.ts/HOR-042).

**Que NO se hace en este ticket** (limites del scope):

- Renombrar convenciones (`.teach/`, `.draft/`, etc.) — se preservan; el ticket solo abarata renames futuros.
- Migrar el server Python — backlog `should`.
- Migrar HC a importar la layer — paridad-de-test, no import.
- Cambiar el shape del markdown ni reemplazar SQLite — fuera de alcance (HOR-046 es ortogonal).

**Tamano estimado**: 4 sessions ejecutables (S1-S4), ~5-7h efectivas. La mas riesgosa es S3 (migracion de consumers reales del toolchain — ⚑ fuerte).

**Como vas a saber que funciona**:

- Corres `cd commands/lib && npx vitest run` y la suite completa pasa (incluyendo los tests nuevos de la layer y los tests existentes de los consumers migrados).
- Abres `commands/lib/repo/conventions.ts` y ves UN solo lugar con `.teach`/`.draft`/`.sessions`/dir-names.
- `dkc-validate`, `dkc-compress-session`, `dkc-record-decision` siguen comportandose identico desde la CLI.

---

## Purpose

Introducir `commands/lib/repo/` — una capa de acceso tipada que es la unica fuente de verdad para (1) convenciones de path DKC, (2) resolucion de `deckardRoot`/`projectPath`, (3) resolvers de path por entidad y subpath, (4) clasificacion path→RecordKind, y (5) la regla DET-19 de id de repo. Aditiva y backwards-compatible: migra los consumers prioritarios de `commands/lib` y deja el resto funcionando con su codigo actual.

## Requirements

### REQ-IMPROVE-01: Convenciones + root en una sola fuente

> **Que cambia**: los nombres de directorios (`tickets`, `specs`, `rules`, `bugs`, `decisions`, `transcripts`, `meta-specs`) y los sufijos (`.teach`, `.draft`, `.sessions`, `.screenshots`) dejan de estar repetidos en cada script y viven en una constante `CONVENTIONS`. La resolucion de `deckardRoot` deja de tener 3 implementaciones distintas.
> **Por que**: hoy renombrar `.teach/` requiere grep cross-archivo sin garantia, y `compress-session.ts`, `record-decision.ts` resuelven el root de formas incompatibles (`resolve(__dirname,'..','..')` vs `process.env.DECKARD_ROOT || process.cwd()`).

El sistema MUST exponer una constante `CONVENTIONS` y funciones `getDeckardRoot()` / `projectPath(project)` / `projectsDir()` en `commands/lib/repo/`, de modo que todo nombre de dir/sufijo y la resolucion de root tengan un unico origen.

**Actor**: system
**Layers**: backend (commands/lib toolchain)

<details><summary>Scenarios de validacion</summary>

#### Scenario: renombrar una convencion en un solo lugar
- **GIVEN** `CONVENTIONS.suffixes.teach === '.teach'`
- **WHEN** se cambia a `.learnings` en `conventions.ts`
- **THEN** todos los resolvers que usan el sufijo reflejan el cambio sin editar otros archivos

#### Scenario: root consistente
- **GIVEN** `DECKARD_ROOT` seteado en el entorno
- **WHEN** se llama `getDeckardRoot()`
- **THEN** retorna el valor del env validado como absoluto y existente; sin env, cae al fallback resuelto desde la ubicacion del modulo
</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre `commands/lib/repo/conventions.ts` y ve un unico objeto con todos los dir-names y sufijos.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | root por env | DECKARD_ROOT=/X (existe) | getDeckardRoot() | retorna /X | `/X` resuelto absoluto |
| 2 | projectPath valida nombre | project="../evil" | projectPath() | lanza error | Error path traversal |
| 3 | suffix unico | CONVENTIONS.suffixes.teach | leer | valor `.teach` | exactamente 1 definicion en el repo |

### REQ-IMPROVE-02: Resolvers de path por entidad

> **Que cambia**: en vez de construir `projects/${project}/tickets/${id}.md` a mano, el script llama `repo.tickets.path(project, id)`; idem para `.teach`/`.draft`/`.sessions`/`.screenshots`, specs (+archived), rules, bugs, decisions, transcripts, meta-specs.
> **Por que**: estos strings estan duplicados en `compress-session.ts`, `record-decision.ts`, `status-coherence.ts`, `session-checkboxes.ts`, etc., cada uno con riesgo de typo.

El sistema MUST exponer resolvers tipados por entidad en `commands/lib/repo/paths.ts` que retornen paths absolutos derivados de `CONVENTIONS` + `projectPath`.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: resolver de ticket
- **GIVEN** project="horadric", id="HOR-048"
- **WHEN** `repo.tickets.path('horadric','HOR-048')`
- **THEN** retorna `{root}/projects/horadric/tickets/HOR-048.md`

#### Scenario: subpath de teach
- **GIVEN** id="HOR-048", kind='intake'
- **WHEN** `repo.tickets.teachPath('horadric','HOR-048','intake')`
- **THEN** retorna `{root}/projects/horadric/tickets/HOR-048.teach/teach-intake.md`

#### Scenario: sesion comprimida
- **GIVEN** id="HOR-048", n=3
- **WHEN** `repo.tickets.sessionPath('horadric','HOR-048',3)`
- **THEN** retorna `{root}/projects/horadric/tickets/HOR-048.sessions/S3.md`
</details>

#### Acceptance
**El usuario puede verificar que funciona**: los tests de `paths.ts` aseveran cada resolver contra un valor concreto.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | ticket | horadric/HOR-048 | tickets.path | path .md | `.../tickets/HOR-048.md` |
| 2 | teach intake | HOR-048 | tickets.teachPath intake | path | `.../HOR-048.teach/teach-intake.md` |
| 3 | rule by module | views/RULE-views-001 | rules.path | path | `.../rules/views/RULE-views-001.md` |
| 4 | spec archived | SPEC-x | specs.archivedPath | path | `.../specs/_archive/SPEC-x.md` |

### REQ-IMPROVE-03: Clasificacion path → RecordKind

> **Que cambia**: el dispatch de `validate.ts` (`args.file.includes('/rules/') ...`) se reemplaza por `repo.classifyRecordPath(file)` que retorna el `RecordKind`.
> **Por que**: la cadena de `if/else includes` esta duplicada y es la unica logica de "que tipo de record es este path"; centralizarla la hace testeable y reutilizable.

El sistema MUST exponer `classifyRecordPath(filePath): RecordKind | null` que clasifique un path a `'rule' | 'decision' | 'bug' | 'spec' | 'ticket' | 'transcript' | 'meta-spec'` con el mismo orden de precedencia actual de `validate.ts`.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: clasificar rule
- **GIVEN** path `.../rules/views/RULE-views-001.md`
- **WHEN** `classifyRecordPath(path)`
- **THEN** retorna `'rule'`

#### Scenario: ticket por patron id
- **GIVEN** path `.../HOR-048.md` (sin `/tickets/` literal)
- **WHEN** `classifyRecordPath(path)`
- **THEN** retorna `'ticket'` (regex `/[A-Z]+-\d+\.md$/`)

#### Scenario: precedencia rules antes que specs
- **GIVEN** un path que contiene ambos tokens
- **WHEN** clasifica
- **THEN** respeta el orden actual (rule gana)
</details>

#### Acceptance
**El usuario puede verificar que funciona**: `dkc-validate <file>` con `kind=all` clasifica identico que antes (regression).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | rule | /rules/.../RULE-x.md | classify | 'rule' | rule |
| 2 | decision | /decisions/DEC-x.md | classify | 'decision' | decision |
| 3 | ticket by regex | /HOR-048.md | classify | 'ticket' | ticket |
| 4 | desconocido | /README.md | classify | null | null |

### REQ-IMPROVE-04: `resolveRepoId(ticket)` centraliza DET-19

> **Que cambia**: la regla "en commits/branches/PRs usar `external` si existe, sino el `ticket_id`" pasa a ser una funcion pura unica.
> **Por que**: DET-19 hoy se reimplementa donde se necesita; una sola funcion testeable la aplica globalmente (en el lado TS).

El sistema MUST exponer `resolveRepoId(ticket: { id: string; external?: string | null }): string` que retorne `external` si es no-vacio, sino `id`.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: external presente
- **GIVEN** ticket `{ id: 'HOR-048', external: 'PROJ-123' }`
- **WHEN** `resolveRepoId(ticket)`
- **THEN** retorna `'PROJ-123'`

#### Scenario: external null
- **GIVEN** ticket `{ id: 'HOR-048', external: null }`
- **WHEN** `resolveRepoId(ticket)`
- **THEN** retorna `'HOR-048'`

#### Scenario: external vacio o whitespace
- **GIVEN** `external: '  '`
- **WHEN** resolveRepoId
- **THEN** retorna `id` (trata whitespace como ausente)
</details>

#### Acceptance
**El usuario puede verificar que funciona**: test con los 3 casos retorna el id esperado.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | external | external='PROJ-1' | resolveRepoId | external | 'PROJ-1' |
| 2 | null | external=null | resolveRepoId | id | 'HOR-048' |
| 3 | whitespace | external='  ' | resolveRepoId | id | 'HOR-048' |

### REQ-IMPROVE-05: Existence / status tipados

> **Que cambia**: en vez de `fs.existsSync(path.join(...))` ad-hoc, hay `repo.tickets.teachStatus(project, id, kind)` que retorna `'pending' | 'done' | 'skipped' | 'missing'`, y helpers `exists` async por entidad.
> **Por que**: el chequeo de existencia de teach/draft se repite con interpretaciones distintas; un helper tipado lo unifica.

El sistema MUST exponer chequeos de existencia async (`fs/promises`) por entidad y un `teachStatus` que combine existencia del archivo + frontmatter `teachings` del ticket.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: teach skipped
- **GIVEN** ticket con `teachings.intake: skipped` y sin archivo teach
- **WHEN** `teachStatus(project, id, 'intake')`
- **THEN** retorna `'skipped'`

#### Scenario: teach done
- **GIVEN** archivo `{id}.teach/teach-intake.md` existe y `teachings.intake: done`
- **WHEN** teachStatus
- **THEN** retorna `'done'`

#### Scenario: teach missing
- **GIVEN** sin archivo y `teachings.intake: pending`
- **WHEN** teachStatus
- **THEN** retorna `'pending'` (o `'missing'` si ni siquiera hay campo)
</details>

#### Acceptance
**El usuario puede verificar que funciona**: tests fs-mock cubren los 4 estados.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | skipped | teachings.intake=skipped | teachStatus | skipped | 'skipped' |
| 2 | done | archivo + done | teachStatus | done | 'done' |
| 3 | pending | pending sin archivo | teachStatus | pending | 'pending' |
| 4 | missing | sin campo | teachStatus | missing | 'missing' |

### REQ-PRESERVE-01: Aditiva — consumers no migrados intactos

> **Que cambia**: nada para los scripts que NO se migran en este ticket.
> **Por que**: la layer es additiva (H2 confirmada); introducirla no debe tocar el comportamiento de ningun consumer existente que siga con su codigo actual.

El sistema MUST preservar el comportamiento de todos los scripts de `commands/lib` no migrados — la sola introduccion de `repo/` no altera ningun output.

<details><summary>Scenarios de validacion</summary>

#### Scenario: suite preexistente verde
- **GIVEN** la layer `repo/` agregada pero un script X no migrado
- **WHEN** corre la suite vitest de `commands/lib`
- **THEN** todos los tests preexistentes pasan sin cambios
</details>

#### Acceptance
**El usuario puede verificar que funciona**: `git diff` muestra solo archivos nuevos en `repo/` + los consumers explicitamente migrados; el resto intacto.

### REQ-PRESERVE-02: Cero cambio de comportamiento en consumers migrados

> **Que cambia**: `validate.ts`, `compress-session.ts`, `record-decision.ts`, `status-coherence.ts` usan la layer pero producen exactamente el mismo output que antes.
> **Por que**: migrar no debe introducir regresiones en el toolchain critico de DKC.

El sistema MUST mantener identico el comportamiento observable (CLI output, exit codes, archivos generados) de cada consumer migrado.

<details><summary>Scenarios de validacion</summary>

#### Scenario: validate dispatch identico
- **GIVEN** un set de records de cada kind
- **WHEN** `dkc-validate <file>` con `kind=all` antes y despues de migrar
- **THEN** mismo veredicto y mismo schema seleccionado

#### Scenario: compress-session identico
- **GIVEN** un ticket con session N
- **WHEN** `dkc-compress-session` antes/despues
- **THEN** mismo archivo `.sessions/S{N}.md` y mismo reemplazo en el ticket
</details>

#### Acceptance
**El usuario puede verificar que funciona**: los tests existentes de cada consumer migrado siguen verdes; smoke CLI manual identico.

### REQ-PRESERVE-03: Paridad de forma con HC

> **Que cambia**: la API publica de `commands/lib/repo/` (nombres de funciones de root + resolvers core) se mantiene alineada en forma con `horadric-cube/server/deckard/root.ts` + `paths.ts`.
> **Por que**: HC consume el mismo filesystem; si las dos layers divergen en convenciones, vuelve el problema de drift que el ticket ataca. Paridad-de-test, no import (anti-patron cross-repo).

El sistema SHOULD documentar y verificar via test de paridad que `getDeckardRoot`/`projectPath` y los sufijos/dir-names coinciden conceptualmente con la semilla de HC.

<details><summary>Scenarios de validacion</summary>

#### Scenario: paridad de sufijos
- **GIVEN** `CONVENTIONS.suffixes` en commands/lib y los strings de HC `assets.ts` (`.draft`, `.screenshots`)
- **WHEN** el test de paridad compara
- **THEN** coinciden; si divergen, el test falla con mensaje claro
</details>

#### Acceptance
**El usuario puede verificar que funciona**: existe un test `parity` que documenta la correspondencia y falla si HC y commands/lib divergen en convenciones core.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Mantenibilidad | Zero nuevas dependencias runtime | deps en package.json | sin cambios (solo node:fs/path) |
| Mantenibilidad | Funciones puras donde sea posible (resolvers sin I/O) | % resolvers sin fs | resolvers de path 100% puros; I/O solo en exists/status |
| Testabilidad | Cobertura de la layer | vitest --coverage sobre repo/ | ≥ 80% lines |

## Artifacts

### Modulo nuevo: `commands/lib/repo/`

| Archivo | Responsabilidad | Exporta |
|---------|-----------------|---------|
| `conventions.ts` | SoT de dir-names + sufijos | `CONVENTIONS` |
| `root.ts` | Resolucion de root/project | `getDeckardRoot`, `projectPath`, `projectsDir` |
| `paths.ts` | Resolvers de path por entidad | `tickets`, `specs`, `rules`, `bugs`, `decisions`, `transcripts`, `metaSpecs` |
| `records.ts` | Clasificacion + DET-19 | `classifyRecordPath`, `resolveRepoId` |
| `status.ts` | Existence/status async | `teachStatus`, `exists*` helpers |
| `index.ts` | Barrel + tipos | `RecordKind`, `TeachKind`, `TeachStatus`, re-exports |
| `repo.test.ts` | Tests fs-mock | — |
| `parity.test.ts` | Test de paridad con HC | — |

## Tasks

### Session 1 — Inventario + convenciones + root + tipos [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Formalizar baseline: inventario de path-strings + snapshot de suite vitest verde de commands/lib | REQ-IMPROVE-01 | researcher | — | (solo lectura) — anota inventario en spec/ticket | inventario documentado; `npx vitest run` baseline verde | (no aplica — lectura) | DET-1, DET-2, DET-11 | done | 1 |
| S1.T2 | Crear `conventions.ts` (CONVENTIONS: dir-names + sufijos) + `root.ts` (getDeckardRoot/projectPath/projectsDir) | REQ-IMPROVE-01 | developer | S1.T1 | commands/lib/repo/conventions.ts, commands/lib/repo/root.ts | tsc/tsx compila; smoke import | git revert | DET-8, DET-16 | done | 1 |
| S1.T3 | Crear `index.ts` con tipos (RecordKind, TeachKind, TeachStatus) + barrel export | REQ-IMPROVE-02 | developer | S1.T2 | commands/lib/repo/index.ts | tsx compila; tipos exportados | git revert | DET-2, DET-8 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T1)** — persistir en `## Sessions` del ticket, correr lint/tsx, quality review light, decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + decision documentada | (no aplica — cierre de session) | DET-20, DET-23 | done | 1 |

### Session 2 — Resolvers + classify + resolveRepoId + status + tests [tipo: auto] [tier: T2]

parallel_groups: [[S2.T1, S2.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | `paths.ts`: resolvers tickets (+teachPath/draftDir/sessionPath/screenshotsDir), specs (+archivedPath), rules, bugs, decisions, transcripts, metaSpecs | REQ-IMPROVE-02 | developer | S1.GATE | commands/lib/repo/paths.ts | tests asertan cada resolver | git revert | DET-8, DET-2 | done | 2 |
| S2.T2 | `records.ts`: classifyRecordPath (precedencia de validate.ts) + resolveRepoId (DET-19) | REQ-IMPROVE-03, REQ-IMPROVE-04 | developer | S1.GATE | commands/lib/repo/records.ts | tests por kind + 3 casos DET-19 | git revert | DET-8, DET-2 | done | 2 |
| S2.T3 | `status.ts`: teachStatus (pending/done/skipped/missing) + exists helpers async (fs/promises) | REQ-IMPROVE-05 | developer | S2.T1 | commands/lib/repo/status.ts | tests fs-mock 4 estados | git revert | DET-8 | done | 2 |
| S2.T4 | Tests fs-mock `repo.test.ts` cubriendo paths/records/status ≥80% | REQ-IMPROVE-02, REQ-IMPROVE-03, REQ-IMPROVE-04, REQ-IMPROVE-05 | developer | S2.T1, S2.T2, S2.T3 | commands/lib/repo/repo.test.ts | `npx vitest run repo/ --coverage` ≥80% | git revert | DET-7, DET-13 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, vitest --coverage de repo/, quality review standard, decidir | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + coverage ≥80% verificado | (no aplica) | DET-20, DET-23 | done | 2 |

### Session 3 — Migrar consumers prioritarios + paridad HC [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: [[S3.T1, S3.T2, S3.T3, S3.T4, S3.T5]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Migrar `validate.ts` dispatch (kind=all) → `classifyRecordPath` | REQ-IMPROVE-03, REQ-PRESERVE-02 | developer | S2.GATE | commands/lib/validate.ts | tests existentes de validate verdes; smoke `dkc-validate` | git revert | DET-5, DET-7, DET-10 | done | 3 |
| S3.T2 | Migrar `compress-session.ts` → `repo.tickets.path` + `sessionPath` + `root` | REQ-IMPROVE-02, REQ-PRESERVE-02 | developer | S2.GATE | commands/lib/compress-session.ts | smoke `dkc-compress-session`; output identico | git revert | DET-5, DET-10 | done | 3 |
| S3.T3 | Migrar `record-decision.ts` → `repo.tickets.path` + `root` | REQ-IMPROVE-02, REQ-PRESERVE-02 | developer | S2.GATE | commands/lib/record-decision.ts | smoke `dkc-record-decision`; entry identica | git revert | DET-5, DET-10 | done | 3 |
| S3.T4 | Migrar resolucion de dirs en `status-coherence.ts` → resolvers de la layer | REQ-IMPROVE-02, REQ-PRESERVE-02 | developer | S2.GATE | commands/lib/schemas/status-coherence.ts | tests de status-coherence verdes | git revert | DET-5, DET-10 | done | 3 |
| S3.T5 | Test de paridad `parity.test.ts` con HC `root.ts`/`paths.ts`/`assets.ts` (sufijos + dir-names) | REQ-PRESERVE-03 | developer | S2.GATE | commands/lib/repo/parity.test.ts | test de paridad verde; doc de correspondencia | git revert | DET-7, DET-16 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2, ⚑ fuerte)** — suite vitest COMPLETA de commands/lib verde; quality review standard; reviewer aislado verifica cero regresion; decidir | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4, S3.T5 | ticket | suite completa verde + paridad documentada + cero cambio de comportamiento | (no aplica) | DET-13, DET-14, DET-20, DET-23 | done | 3 |

### Session 4 — Migracion restante + docs + backlog + cierre [tipo: ⚑ fuerte] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Barrer consumers restantes con path-construction runtime (no doc-comments); migrar los triviales, documentar los que se dejan | REQ-IMPROVE-02, REQ-PRESERVE-01 | developer | S3.GATE | commands/lib/*.ts (los que apliquen) | suite verde tras cada migracion | git revert | DET-16, DET-10 | done | 4 |
| S4.T2 | Documentar el API contract de `repo/` (README.md del modulo) | REQ-IMPROVE-01, REQ-IMPROVE-02 | developer | S3.GATE | commands/lib/repo/README.md | doc revisada; ejemplos compilan | git revert | DET-2 | done | 4 |
| S4.T3 | Poblar backlog (Python boundary `should`, renames diferidos, linter de paths) + propagacion DET-16 (¿que steps/docs referencian la layer?) | REQ-IMPROVE-01 | scribe | S3.GATE | ticket (Backlog) | backlog poblado; propagacion registrada | (no aplica) | DET-16, DET-17 | done | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T1, ⚑ fuerte)** — suite completa verde; quality review; acceptance checkpoints; decidir continue→close | — | reviewer | S4.T1, S4.T2, S4.T3 | ticket | gate persistido + acceptance ejecutado | (no aplica) | DET-13, DET-20, DET-23 | done | 4 |

### Task contract

```
Task S1.T1: Formalizar baseline
- source_ref: REQ-IMPROVE-01
- agent: researcher
- files: (solo lectura) — anota inventario en el ticket
- expected_output: lista de path-strings por archivo + confirmacion suite verde
- validation: `cd commands/lib && npx vitest run` baseline verde
- rollback: N/A (lectura)
- rules: [DET-1, DET-2, DET-11]

Task S2.T2: records.ts (classify + resolveRepoId)
- source_ref: REQ-IMPROVE-03, REQ-IMPROVE-04
- agent: developer
- files: commands/lib/repo/records.ts
- precondition: conventions.ts + index.ts listos (S1)
- expected_output: classifyRecordPath con la misma precedencia de validate.ts; resolveRepoId puro
- validation: tests por kind + 3 casos DET-19
- rollback: git revert
- rules: [DET-8, DET-2]

Task S3.T1: migrar validate.ts dispatch
- source_ref: REQ-IMPROVE-03, REQ-PRESERVE-02
- agent: developer
- files: commands/lib/validate.ts
- precondition: layer S2 con classifyRecordPath testeada
- expected_output: dispatch usa classifyRecordPath; comportamiento identico
- validation: tests existentes verdes + smoke dkc-validate por kind
- rollback: git revert
- rules: [DET-5, DET-7, DET-10]
```

## Constraints

- DET-11 (KB-first): la layer ES el "como" se accede al KB — su diseño debe respetar las convenciones existentes, no inventar nuevas.
- DET-16 (propagacion): al introducir la layer, evaluar que steps/docs/parsers deberian referenciarla (S4.T3).
- DET-19 (external id): `resolveRepoId` es la implementacion canonica TS de esta regla.
- RULE (config horadric): READ-ONLY del lado HC — la paridad es de forma, NO se modifica HC en este ticket (salvo que S3.T5 requiera un export menor; evaluar).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| commands/lib toolchain (tsx, vitest, zod) | internal | la layer vive y se testea aqui | bajo — ya instalado y en uso |
| horadric-cube/server/deckard (root.ts, paths.ts, assets.ts) | internal (read-only) | fuente de la paridad | bajo — solo lectura para el test |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Regresion en validate.ts/compress-session (toolchain critico) | medium | high | S3 ⚑ fuerte; suite completa verde + reviewer aislado read-only antes de cerrar (REQ-PRESERVE-02) |
| Drift de forma con HC reaparece | medium | medium | parity.test.ts (REQ-PRESERVE-03) |
| Scope creep (layer hace parsing/validacion) | medium | medium | limite explicito: solo paths; parsing es validate.ts/HOR-042 |
| classifyRecordPath cambia precedencia sutil | low | high | tests por kind replicando el orden exacto de validate.ts:1093-1110 |

## Open questions

(Ninguna — boundary Python/TS y paridad-vs-import resueltas en intake-explore. Ver Decisions.)

## Decisions

### DEC-LOCAL-01: Layer TS en commands/lib/repo/ — server Python fuera de alcance
- **Contexto**: el ticket original (H1) asumia layer TS en `server/src/repo/`, pero `server/src` es el dkc-mcp server en Python.
- **Drivers**: imposibilidad de modulo unico cross-language; el toolchain TS (tsx+zod+vitest) ya vive en `commands/lib`; los strings duplicados se concentran ahi.
- **Opcion elegida**: layer TS en `commands/lib/repo/`, consumida por `commands/lib/*.ts`. Python queda como backlog `should` (su path-logic ya esta razonablemente centralizada en `config.py`).
- **Alternativas**: (a) contrato declarativo YAML/JSON leido por ambos lenguajes — mas complejo, diferido a HOR-046; (b) codegen Py desde TS — sobre-ingenieria para el valor actual.
- **Consecuencias**: gana valor inmediato + bajo blast radius; pierde unificacion con Python (duplicacion documentada, no resuelta).
- **Session**: design (intake-explore + design-improvement).

### DEC-LOCAL-02: HC por paridad-de-test, no import cross-repo
- **Contexto**: H3 asumia que HC importaria la layer (npm link/package).
- **Drivers**: `horadric-cube` es repo git independiente; import build-time es fragil (DECKARD_ROOT es runtime-env); anti-patron cross-bundle conocido.
- **Opcion elegida**: HC mantiene su semilla (`root.ts`/`paths.ts`); se alinea por test de paridad de forma.
- **Alternativas**: npm workspace / publish package — acoplamiento y overhead de release para 2 consumers.
- **Consecuencias**: gana desacople; pierde DRY estricto (mitigado por parity.test.ts).
- **Session**: design.

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Definiciones de cada sufijo/dir-name en commands/lib | N (duplicado) | 1 (en conventions.ts) | grep tras migracion |
| Implementaciones de resolucion de deckardRoot en commands/lib | 3 | 1 (root.ts) | grep |
| Coverage de la layer | 0% | ≥80% | vitest --coverage |

## Technical reference

- Dispatch actual a replicar: `commands/lib/validate.ts:1093-1110` (orden: rules → decisions → bugs → specs → tickets).
- Root resolution actual (inconsistente): `compress-session.ts:70` (`resolve(__dirname,'..','..')`), `record-decision.ts:106` (`process.env.DECKARD_ROOT || process.cwd()`).
- HC semilla de paridad: `horadric-cube/server/deckard/root.ts`, `paths.ts`, sufijos en `assets.ts:65,90`.

## Rules discovered

(Se llena durante ejecucion.)

## Bugs found

(Se llena si se descubren.)

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-IMPROVE-01..05 pasan
- [ ] **Tests**: repo.test.ts + parity.test.ts verdes; coverage ≥80%
- [ ] **NFRs**: zero nuevas deps runtime; resolvers de path puros
- [ ] **Rules**: DET-19 centralizada; convenciones preservadas
- [ ] **Integration**: suite completa de commands/lib verde (consumers migrados sin regresion)
- [ ] **Docs**: README del modulo repo/ escrito

## Archiving

Cuando la layer sea superseded (ej. por HOR-046 SoT consolidation) o eliminada: usar `/dkc-archive-spec`.
