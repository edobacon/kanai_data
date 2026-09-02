---
id: SPEC-workflow-dkc-doctor-staleness-118
project: horadric
ticket: HOR-118
status: done
---

# dkc-doctor — detector de staleness de anclas + investigación de trigger y KB validado

# dkc-doctor — detector de staleness de anclas + investigación de trigger y KB validado

## Executive summary — lo que estas aprobando

> *Revisión rápida. El detalle técnico vive en Requirements/Tasks abajo.*

**Que se quiere**: hoy las rules y bugs de DKC anclan a ubicaciones del código (sección `## Where`, `## Root cause`) pero nadie verifica que esas anclas sigan vivas — una rule puede apuntar a un archivo que ya se borró y nadie se entera hasta que la recomienda. Inspirado en `mem_doctor` de [engram](https://github.com/Gentleman-Programming/engram), se construye un comando **read-only** `dkc-doctor` que recorre el KB, parsea las anclas y reporta cuáles apuntan a código muerto. Sobre esa base, el ticket **investiga** dos cosas para preparar a DKC a operar sobre un "KB validado": (a) dónde conviene disparar el doctor automáticamente, y (b) si las rules pueden llevar un tiempo de validez (TTL) antes de revalidar.

**Decisiones críticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | El comando core (S1) es **independiente y shippable**; la investigación (S2/S3) no lo bloquea | Permite cerrar valor aunque S2/S3 deriven en follow-up |
| 2 | El trigger automático NO se fija por preferencia — se decide con una **prueba de drift sobre un proyecto con drift real** (up1/pehuen), DET-13 | horadric no tiene drift (KB joven); decidir sin datos sería adivinar |
| 3 | El estado de validación (TTL) vive en un **store doctor-owned** (tabla tipo `indexed_files`), NO en el frontmatter de la rule | Evita cambio de schema de rule + preserva el invariante read-only del KB |
| 4 | Si el TTL exige tocar el schema de rule → se **difiere a follow-up**, no se implementa aquí | Mismo costo de schema que ya diferimos para rules en HOR-119 |

**Riesgos principales y como los mitigamos**:

- **Falsos positivos del parser** (anclas relativas/condicionales/glob/símbolos marcadas como "muertas") → el parser **clasifica** cada ancla (concreta-root / relativa / glob / símbolo / condicional) y solo verifica las concretas; criterio de aceptación S1 incluye "cero falsos positivos en horadric".
- **Decidir el trigger sin evidencia** → S2 corre el doctor sobre un KB con drift real y hace `git blame` de las anclas muertas antes de decidir.
- **Scope creep del TTL hacia schema de rule** → bifurcación explícita: store externo viable → implementar; si no → propuesta + follow-up.

**Que NO se hace en este ticket**:

- TTL en frontmatter de rule (cambio de schema) — solo se diseña; impl difiere a follow-up si lo exige.
- Reconciliación de contradicción/supersesión — es HOR-119 (feature A).
- Mutar el markdown del KB — el doctor es read-only sobre rules/bugs.

**Tamaño estimado**: 3 sessions, ~4-6h efectivas. La más riesgosa es S1 (parser/clasificador de anclas heterogéneas); S2/S3 son investigación (producen decisión/diseño).

**Como vas a saber que funciona**:

- Corro `dkc-doctor horadric` y obtengo un reporte que lista las anclas concretas muertas SIN marcar `_archive/INDEX.md` (relativo+condicional) como muerto.
- `git status` queda limpio tras correrlo (read-only).
- Al cerrar S2 hay una decisión de trigger registrada con números reales de drift.

---

## Purpose

Comando CLI read-only que parsea las anclas al código de rules (`## Where`) y bugs (`## Root cause`), las clasifica, verifica existencia de archivo/símbolo contra los repos del proyecto, y reporta drift. Además, el ticket investiga el modelo de invocación óptimo (REQ-03) y la viabilidad de un estado de validez temporal del KB (REQ-04). Reusa el patrón fs-scan de `dkc_embeddings_prune` y el precedente de store por-archivo de `indexed_files`.

## Requirements

### REQ-01: Parser y clasificador de anclas

> **Que cambia**: el doctor lee la sección `## Where` de cada rule y `## Root cause` de cada bug, extrae los paths en backticks y los clasifica en concreto-root / relativo-a-subdir / glob-o-templated / símbolo-de-código / condicional. Solo las **concretas** se verifican.
> **Por que**: la prueba de drift S0 mostró que de 19 backticks en líneas `Files:`, solo 7 eran paths concretos — parsear ingenuamente genera falsos positivos.

El sistema MUST extraer las anclas de las secciones `## Where` (rules) y `## Root cause` (bugs) y clasificar cada token en backticks como `concrete-root | relative | glob | symbol | conditional`, verificando existencia SOLO para `concrete-root` y `relative`.

**Actor**: system (CLI)
**Layers**: backend (tooling)

<details><summary>Scenarios de validacion</summary>

#### Scenario: ancla concreta a archivo vivo
- **GIVEN** una rule con `- **Files**: \`src/composables/useETagPoll.ts\``
- **WHEN** corre el parser
- **THEN** clasifica el token como `concrete-root` y lo marca para verificación

#### Scenario: ancla glob/templated NO se verifica
- **GIVEN** una rule con `- **Files**: \`prompts/steps/*.md\`` o `\`HOR-{seq}\``
- **WHEN** corre el parser
- **THEN** clasifica como `glob`/`templated` y NO la reporta como drift

#### Scenario: símbolo de código no es path
- **GIVEN** un backtick `\`resolveRecordPath\`` o `\`status\`` en línea Files:
- **WHEN** corre el parser
- **THEN** clasifica como `symbol` y lo excluye de verificación de existencia
</details>

### REQ-02: Verificación de existencia + reporte read-only

> **Que cambia**: el doctor resuelve cada ancla concreta contra los repos del proyecto (`repo.path` + `additional_paths` del config), verifica que el archivo y, best-effort, el símbolo existan, y emite un reporte de drift. No escribe nada en el KB.
> **Por que**: operacionaliza el "verify it still exists before recommending" que hoy queda librado al LLM.

El sistema MUST verificar la existencia de archivo (y best-effort del símbolo vía grep) de cada ancla concreta contra los roots del proyecto, reportar las muertas agrupadas por rule/bug, y NO modificar ningún markdown del KB ni el index.db.

**Actor**: system (CLI)
**Layers**: backend (tooling)

<details><summary>Scenarios de validacion</summary>

#### Scenario: ancla a archivo borrado → drift
- **GIVEN** una rule con ancla concreta a un path inexistente
- **WHEN** corre `dkc-doctor {project}`
- **THEN** el reporte lista la rule + el path muerto + tipo de ancla

#### Scenario: read-only
- **GIVEN** git status limpio
- **WHEN** corre `dkc-doctor {project}`
- **THEN** `git status` sigue limpio y el index.db no cambia

#### Scenario: línea exacta no se verifica
- **GIVEN** un ancla `\`foo.ts:42\`` cuyo archivo existe pero la línea 42 ya no
- **WHEN** corre el doctor
- **THEN** NO reporta drift (solo verifica archivo+símbolo, no número de línea)
</details>

### REQ-03: Decisión del modelo de invocación (con evidencia)

> **Que cambia**: se decide DÓNDE corre el doctor automáticamente (on-demand / post-close-diff / intake / reindex), basándose en una prueba de drift sobre un proyecto con drift real, no en preferencia.
> **Por que**: H4 (trigger = post-close) es lógica pero no está probada; horadric no tiene drift para confirmarla.

El sistema (proceso de design/execute) MUST decidir el modelo de invocación corriendo el doctor sobre un proyecto con drift real (up1/pehuen), haciendo `git blame` de las anclas muertas para clasificar su origen, y registrar la decisión vía `dkc-record-decision` (DET-13).

**Actor**: system (investigación)
**Layers**: backend (tooling), meta (workflow)

<details><summary>Scenarios de validacion</summary>

#### Scenario: drift real encontrado → causación trazada
- **GIVEN** un proyecto (up1/pehuen) con anclas muertas reales
- **WHEN** corre el doctor + git blame sobre las muertas
- **THEN** se clasifica cada muerte (cambio de código en ticket cerrado vs nunca-válida) y se decide el trigger con esos números

#### Scenario: sin drift suficiente → decisión documentada como inferida
- **GIVEN** que ningún proyecto disponible tiene drift significativo
- **WHEN** se cierra S2
- **THEN** la decisión del trigger se registra como `inferida` con el plan de re-validación, NO como confirmada
</details>

### REQ-04: Propuesta de validez temporal (TTL) hacia "KB validado"

> **Que cambia**: se diseña si las rules pueden llevar `last_validated` + ventana de validez para revalidar solo lo vencido, y se decide dónde vive ese estado (store doctor-owned vs frontmatter).
> **Por que**: habilita un "KB validado" que intake puede preferir, complementando el trigger por-cambio-de-código con invalidación por paso-del-tiempo.

El sistema SHOULD producir una propuesta de diseño del TTL/validez temporal con veredicto sobre dónde vive el estado de validación (preferencia: store doctor-owned análogo a `indexed_files`, sin tocar schema de rule). MAY implementarlo en este ticket solo si el store externo resulta viable; si exige schema de rule, difiere a follow-up.

**Actor**: system (investigación)
**Layers**: backend (tooling), meta (workflow)

<details><summary>Scenarios de validacion</summary>

#### Scenario: store externo viable → propuesta de impl
- **GIVEN** el precedente `indexed_files (source_path, content_hash, indexed_at)`
- **WHEN** se diseña el store de validación
- **THEN** la propuesta define una tabla análoga (path + last_validated + status) doctor-owned, sin tocar el markdown de rule

#### Scenario: TTL exigiría schema de rule → follow-up
- **GIVEN** que el TTL requiriera un campo en el frontmatter de la rule
- **WHEN** se evalúa el costo (template + modelo + RecordStatus + HC viewer)
- **THEN** se difiere a follow-up con la propuesta documentada, NO se implementa aquí
</details>

## Non-functional requirements

| Tipo | Target | Como se mide |
|------|--------|--------------|
| Performance | El scan de un KB completo de un proyecto (≤300 records) corre en <5s | Cronometrar `dkc-doctor` sobre horadric (211 records) y up1 |
| Read-only safety | Cero escrituras al markdown del KB y al index.db | `git status` limpio + hash del index.db igual antes/después (S1.T4) |

## Tasks

### Session 1 — Comando core dkc-doctor (read-only) [tipo: auto] [tier: T2]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Parser + clasificador de anclas (`## Where`/`## Root cause` → tokens clasificados concrete-root/relative/glob/symbol/conditional) | REQ-01 | developer | — | `commands/lib/doctor/anchor-parser.ts` | tsx self-test: 19 backticks de horadric → 7 concretas, resto clasificado | git revert | DET-1, DET-2, RULE-workflow-catalog-executor-pattern-005 | pending | 1 |
| S1.T2 | Verificador de existencia (resolver concreto/relativo contra `repo.path` + `additional_paths`; símbolo best-effort vía grep) | REQ-02 | developer | S1.T1 | `commands/lib/doctor/verifier.ts` | tsx self-test: archivo vivo→ok, borrado→drift, símbolo ausente→warn | git revert | DET-2, DET-11 | pending | 1 |
| S1.T3 | Reporte + wrapper CLI `dkc-doctor` (agrupa drift por rule/bug, exit code, read-only) | REQ-02 | developer | S1.T2 | `commands/lib/doctor/report.ts`, `commands/dkc-doctor` | correr sobre horadric: reporte sin falsos positivos (`_archive/INDEX.md` NO muerto) | git revert + rm wrapper | DET-2, RULE-workflow-catalog-executor-pattern-005 | pending | 1 |
| S1.T4 | Self-tests TC-1/2/3 (fixtures: ancla viva, ancla muerta, read-only assertion git+index.db) | REQ-01, REQ-02 | developer | S1.T3 | `commands/lib/doctor/doctor.test.ts` | tsx self-tests verdes; git status limpio post-run | git revert | DET-7, DET-13 | pending | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T2) | — | reviewer | S1.T4 | `projects/horadric/tickets/HOR-118.md` | gate persistido + quality review DET-23 | n/a | DET-20, DET-23 | pending | 1 |

### Session 2 — Prueba de drift + decisión de trigger [tipo: ⚑ fuerte] [tier: T1]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Correr `dkc-doctor` sobre up1 y pehuen; recolectar drift real | REQ-03 | researcher | S1.GATE | — (ejecución read-only; output a reporte) | TC-4: lista de anclas muertas reales por proyecto | n/a (read-only) | DET-11, DET-13 | pending | 2 |
| S2.T2 | `git blame` sobre las anclas muertas; clasificar origen (cambio de código en ticket cerrado vs nunca-válida) | REQ-03 | researcher | S2.T1 | — | clasificación por ancla con commit/fecha culpable | n/a | DET-4, DET-13 | pending | 2 |
| S2.T3 | Decidir modelo de invocación (trigger) con la evidencia; actualizar H4; registrar `dkc-record-decision --step doctor-trigger` | REQ-03 | architect | S2.T2 | `projects/horadric/tickets/HOR-118.md` | decisión registrada en decisions_log + H4 → confirmed/refuted | n/a | DET-13, DET-16 | pending | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T1) — ⚑ fuerte (punto de decisión) | — | reviewer | S2.T3 | `projects/horadric/tickets/HOR-118.md` | gate persistido + decisión de trigger explícita | n/a | DET-14, DET-20 | pending | 2 |

### Session 3 — Diseño TTL / KB validado [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Diseñar store de validación doctor-owned (tabla análoga a `indexed_files`: path + last_validated + status); decidir dónde vive | REQ-04 | architect | S2.GATE | `docs/dkc-doctor.md` | propuesta de schema del store + veredicto ubicación (TC-5) | n/a (diseño) | DET-32, DET-2 | pending | 3 |
| S3.T2 | Propuesta TTL (ventana de validez + qué se revalida) + decisión implementar-aquí vs follow-up | REQ-04 | architect | S3.T1 | `docs/dkc-doctor.md` | veredicto registrado vía `dkc-record-decision`; si schema de rule → follow-up en Backlog | n/a | DET-32, DET-16 | pending | 3 |
| S3.T3 | Wire del trigger elegido en S2 si es barato (sin schema de rule); sino documentar follow-up | REQ-03, REQ-04 | developer | S3.T2 | `docs/dkc-doctor.md`, (trigger host según S2) | trigger cableado + smoke, o follow-up documentado con razón | git revert | DET-16, RULE-workflow-catalog-executor-pattern-005 | pending | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier T2) — ⚑ fuerte (cierre de investigación) | — | reviewer | S3.T3 | `projects/horadric/tickets/HOR-118.md` | gate persistido + quality review + decisiones de REQ-03/04 cerradas | n/a | DET-13, DET-20, DET-23 | pending | 3 |

## Technical reference

- **Patrón fs-scan a reusar**: `dkc_embeddings_prune` en `server/src/deckard_cain/tools/embeddings.py:643-692` (recorre records, detecta archivos borrados).
- **Precedente de store por-archivo (REQ-04)**: tabla `indexed_files (source_path PK, content_hash, indexed_at)` en `embedding_index.py:259-263`.
- **Roots de verificación**: `config.yaml > repo.path` (horadric-cube) + `additional_paths` (deckard). El doctor debe resolver anclas contra ambos.
- **Anclas heterogéneas (de la prueba S0)**: concretas-root (`server/routes/tickets.ts`), relativas-a-subdir (`_archive/INDEX.md` relativo a specs/), glob (`prompts/steps/*.md`), templated (`HOR-{seq}`, `{project}`), símbolos (`resolveRecordPath`), condicionales ("si existe").
- **Patrón comando**: `RULE-workflow-catalog-executor-pattern-005` — wrapper `commands/dkc-doctor` + lib en `commands/lib/`; self-tests tsx (no vitest, HOR-048).

## Constraints

- RULE-workflow-catalog-executor-pattern-005: el comando sigue el patrón catalog/executor (wrapper + lib + self-test tsx).
- DET-2 (source_ref): el reporte de drift referencia el rule/bug + ancla exacta.
- Invariante read-only del KB: el doctor NO escribe rules/bugs/index.db. Estado de validación (REQ-04) solo en store doctor-owned.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Proyecto con drift real (up1/pehuen) | internal | S2 necesita anclas muertas reales para decidir el trigger | Si ningún proyecto tiene drift → REQ-03 queda inferido, no confirmado |
| `repo.path` + `additional_paths` accesibles | internal | El doctor resuelve anclas contra los repos en disco | Si un repo no está clonado → anclas de ese repo no verificables (reportar como skip, no drift) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Falsos positivos por anclas heterogéneas | high | reporte ruidoso e inútil | clasificador explícito (REQ-01); criterio S1: cero falsos positivos en horadric |
| horadric sin drift → no se puede validar H4 | high (confirmado en S0) | trigger decidido sin evidencia | S2 corre sobre up1/pehuen; si tampoco hay drift, decisión queda inferida |
| TTL arrastra cambio de schema de rule | medium | scope creep + romper read-only | bifurcación: store externo viable → impl; sino follow-up |
| Símbolo best-effort da falsos negativos/positivos | medium | confianza parcial en "símbolo existe" | reportar símbolo como warn (no drift duro); drift duro solo por archivo ausente |

## Open questions

- ¿Sobre qué proyecto exacto se corre la prueba de drift definitiva en S2 — up1, pehuen, o ambos? (se resuelve al abrir S2 según cuál tenga más drift)
- ¿El trigger elegido en S2 se implementa en S3 o se difiere? (depende del veredicto de S2)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Comando core independiente de la investigación
- **Contexto**: el ticket mezcla un entregable concreto (comando) con dos hilos de investigación (trigger, TTL)
- **Drivers**: el dev pidió "que no afecte al desarrollo del ticket pero lo prepare para KB validado"
- **Opción elegida**: S1 (comando) es shippable e independiente; S2/S3 (investigación) producen decisión/diseño y pueden derivar en follow-up sin bloquear S1
- **Alternativas**: meter todo en un solo flujo acoplado (descartado — la investigación bloquearía el valor core)
- **Consecuencias**: gana entregable garantizado; pierde "todo resuelto en un ticket" (TTL puede quedar follow-up)
- **Session**: design

### DEC-LOCAL-02: Estado de validación en store doctor-owned, no en frontmatter de rule
- **Contexto**: el TTL necesita persistir `last_validated` por rule
- **Drivers**: invariante read-only del KB + evitar cambio de schema de rule (mismo costo diferido en HOR-119)
- **Opción elegida**: store doctor-owned (tabla tipo `indexed_files`) como preferencia; frontmatter de rule solo si el store externo no alcanza → follow-up
- **Alternativas**: campo `last_validated` en frontmatter de rule (descartado para este ticket — cambio de schema + rompe read-only)
- **Consecuencias**: gana read-only preservado + cero schema; pierde acoplamiento directo rule↔validación (queda en store aparte)
- **Session**: design

### DEC-LOCAL-03: doctor.ts monolítico (vs subdir del spec)
- **Contexto**: el spec listaba `commands/lib/doctor/{anchor-parser,verifier,report}.ts`
- **Drivers**: el comando es chico y cohesivo; un solo archivo con secciones claras es más simple de mantener que 4 archivos para ~250 líneas
- **Opción elegida**: monolítico `commands/lib/doctor.ts` + `doctor.test.ts`, funciones modulares internas exportadas (testeable)
- **Alternativas**: subdir con módulos separados (descartado — over-engineering para el tamaño)
- **Consecuencias**: gana simplicidad; si crece (S3 store de validación), refactorizar a subdir
- **Session**: S1

### DEC-LOCAL-04: `relative` no se verifica en S1 (requiere workspace-roots)
- **Contexto**: REQ-01 decía "verificar SOLO concrete-root y relative". Pero las anclas `relative` (base desconocida, p.ej. workspace-relative de pehuen) no se pueden resolver con solo el monorepo-root
- **Drivers**: verificar `relative` sin saber la base produce falsos positivos; resolverlo bien exige enumerar workspace-roots (pehuen tiene pehuen-nuxt/, pehuen-server/, pehuen-client/)
- **Opción elegida**: en S1, `relative` se clasifica y cuenta pero NO se verifica (conservador, cero falso positivo). La resolución de workspace-roots se evalúa en S2 (donde la prueba de drift sobre pehuen lo necesita)
- **Alternativas**: verificar relative contra todos los roots por basename (descartado — falsos positivos por colisión de nombres)
- **Consecuencias**: en monorepos el doctor hoy sub-reporta (marca relative lo que podría verificar con workspace-roots). Trazado en L1 de S1 + alcance de S2
- **Session**: S1

### DEC-LOCAL-05: Modelo de invocación del doctor — on-demand + post-close advisory (REQ-03)
- **Contexto**: REQ-03 pedía decidir el trigger con evidencia (S2: prueba de drift sobre up1/pehuen/horadric)
- **Drivers**: la prueba de drift mostró que (a) el drift real es RARO (~1 candidato en 3 proyectos, un code-move en up1), (b) el riesgo dominante era el FALSO POSITIVO (3 clases encontradas y corregidas en S1+S2), (c) en monorepos muchas anclas son no-verificables hoy (workspace-relative, DEC-LOCAL-04)
- **Opción elegida**: **on-demand como base** (siempre disponible) + **post-close scoped al diff como hook advisory (warn-first, no bloqueante)** — solo verifica anclas que tocan los archivos cambiados, costo casi nulo, captura el caso code-change en su origen (DET-16). NO intake-blocking, NO acoplado a reindex, NO scheduled
- **Alternativas**: post-close bloqueante (descartado — drift raro no justifica bloquear cierres); intake/KB-first (descartado para v1 — más caro, ataca la falla de recall que el TTL de S3 cubre mejor); scheduled (descartado — DKC sin scheduler)
- **Consecuencias**: gana cobertura barata del caso dominante sin friction; el caso "rule vencida en recall" queda para el TTL (S3/REQ-04). El wiring concreto del hook se evalúa en S3.T3 (implementar si es barato, sino follow-up)
- **Session**: S2

## Acceptance checkpoints

- [ ] **Funcional**: `dkc-doctor horadric` lista anclas concretas muertas sin falsos positivos (REQ-01/02)
- [ ] **Tests**: self-tests tsx TC-1/2/3 verdes
- [ ] **Read-only**: git status limpio + index.db sin cambios tras correr el doctor
- [ ] **REQ-03**: decisión de trigger registrada con evidencia de drift (o inferida con plan)
- [ ] **REQ-04**: propuesta TTL + veredicto de ubicación del estado; impl o follow-up documentado
- [ ] **Rules**: patrón catalog/executor respetado (RULE-workflow-catalog-executor-pattern-005)
- [ ] **Integration**: no rompe nada (read-only); self-tests del resto de commands/lib no regresan

## Archiving

Cuando deje de ser fuente de verdad: `/dkc-archive-spec SPEC-workflow-dkc-doctor-staleness-118 "razon"`.
