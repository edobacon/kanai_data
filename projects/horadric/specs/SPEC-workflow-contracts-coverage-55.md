---
id: SPEC-workflow-contracts-coverage-55
project: horadric
ticket: HOR-055
status: done
---

# Cobertura completa de contratos DKC — validators de artefactos + de ejecucion enforced + disponibilizados + en uso + auditados

# Cobertura completa de contratos DKC — validators de artefactos + de ejecucion enforced + disponibilizados + en uso + auditados

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Tasks, Changes). Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: cerrar 8 gaps de cobertura validators DKC identificados en analisis 2026-05-16 para preparar terreno a HOR-054 (MCP tools `dkc_enforce_step` + `dkc_invoke_agent`). El trabajo opera en dos ejes ortogonales — **validacion de artefactos** (que el LLM produzca contenido valido en frontmatter, REQs con callouts, fences `dkc:*`, narrativas) y **validacion de ejecucion** (que el LLM siga directivas durante el run: transiciones `[~]`, session log inline, Quality Review, Gate decision explicit, orden de steps) — mas catalogo de invocaciones machine-readable y audit script para detectar drift. Sin esta cobertura, HOR-054 hereda drift silencioso (yaml duplicates, fences sin parser, narrativas no enforced) y amplifica el problema D11 (LLM falla ~97.5% inline en directivas declarativas).

**Decisiones criticas que necesitan tu OK** (cada una con racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Parser YAML strict no-duplicates: extender parser casero (`commands/lib/markdown.ts:117-171`) vs introducir js-yaml con FAILSAFE_SCHEMA | Trade-off: simplicidad/0-deps (HOR-041 constraint) vs robustez probada. Resolver en S1.T3 (DEC-LOCAL-01) |
| 2 | Heuristica `[~]` ausente: git history retroactivo vs marker explicit del LLM en spec | Trade-off: cobertura completa vs simplicidad. Git history es retroactivo pero costoso; marker explicit es simple pero requiere disciplina. Resolver en S1.T4 (DEC-LOCAL-02) |
| 3 | Shape canonico de tabla de tasks: schema actual (`# | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios`) vs documentado en template (`source_ref / Agent / Depends on / Validation / Rules`) | Drift conocido entre schema Zod y template del spec. Spec actual usa shape del schema para validar bajo `dkc-validate SpecTask`. DEC-LOCAL-03: alinear template a schema en S2 (parte del SpecFull validator) |
| 4 | Patron a-hook `<!-- enforcement: a-hook command: "./commands/dkc-validate <kind> <file>" -->` NO existe hoy en steps (H6 refuted) — HOR-055 lo CREA + puebla | Reinterpretacion del Gap 6: no es "verificar que existe" sino "introducir + poblar en 15-20 steps". HOR-054 lo CONSUME |
| 5 | Templates project-scoped horadric: mover a backlog `should` | NO bloquea HOR-054. Opcional dentro de S7.T5 |

**Riesgos principales y como los mitigamos**:

- **Drift en pattern a-hook entre steps al poblar manualmente (10-20 invocaciones)** → S7 audit script corre baseline + detecta drift declarado vs invocado. Pattern verificado con regex `<!-- enforcement: a-hook command: "./commands/dkc-validate (\w+) `
- **Validator Teach extendido tiene <100% cobertura de reglas narrativas** (R5 semantica profunda) → Aceptar 70-80% cobertura via heuristicas + section detection. Documentar gap conocido en S3.T4
- **Parser HC fence `dkc:agent-invocation` trivial vs registry generico** → Trivial primero (case en switch). Registry generico queda en backlog si crece N° de fences (DEC-LOCAL-04)
- **Workflow state marker requiere disciplina del LLM** → HOR-054 lo automatiza post-fact. HOR-055 solo introduce template + render HC + validator que detecta ausencia

**Que NO se hace en este ticket** (limites explicitos del scope):

- **NO implementa MCP tools** (`dkc_enforce_step`, `dkc_invoke_agent`) — delegado a HOR-054
- **NO migra tickets/specs historicos** — DET-25 patron no-retroactivo (tickets cerrados pre-2026-05-17 no requieren `## Workflow state` ni tags a-hook)
- **NO popula templates project-scoped** de otros proyectos (up1, bayley, etc.) — solo horadric opcional (S7.T5 backlog should)
- **NO refactor a registry pattern generico** del parser HC — case en switch primero
- **NO forzar transicion `[~]` automatica** desde validator — eso requiere MCP tool (HOR-054)

**Tamano estimado**: 7 sessions ejecutables (S1-S7), aproximadamente 18-22h efectivas distribuidas. S2/S3/S4/S5 paralelizables (distintos kinds + repos). La mas riesgosa es **S7 ⚑ fuerte (audit + baseline + reporte drift)** — consolida todo lo anterior y requiere validacion empirica del catch rate del audit.

**Como vas a saber que funciona** (criterios de validacion observables, no tecnicos):

- Ejecutas `./commands/dkc-validate Ticket projects/horadric/tickets/HOR-046.md` y obtienes detection de yaml duplicates historicos (D12)
- Abres HC en un ticket con `## Workflow state` poblado y ves la cronologia de steps en tab Sessions
- Abres un step con fence `dkc:agent-invocation` y ves tabla rica vs code plain
- Ejecutas `grep -c "<!-- enforcement: a-hook" prompts/steps/*.md` y obtienes ≥14 (no 0 como hoy)
- Ejecutas `./commands/dkc-audit-validators` y retorna exit 0 sobre el corpus horadric
- Introduces drift artificial (validator nuevo sin invocacion en step) y `dkc-audit-validators` lo detecta con exit 1
- Ejecutas `./commands/dkc-validate SessionExecution projects/horadric/tickets/HOR-046.md` y detecta tasks `[x]` sin entry en `## Sessions` o Quality Review faltante

---

## Purpose

Disponibilizar 14 validators (6 existentes + 6 artefactos nuevos + 2 ejecucion) integrados con `dkc-validate <kind> <file>` + parser HC extendido + catalogo a-hook poblado en steps + audit script para drift detection. Producir terreno tecnico que HOR-054 (enforcement programatico via MCP tools) consume sin heredar drift silencioso. Audiencia: dev del workflow DKC + LLM ejecutor de HOR-054.

## Requirements

### REQ-IMPROVE-01: Validators de artefactos completos para los 12+ kinds canonicos

> **Que cambia**: cualquier kind canonico (Ticket, Bug, MetaSpec, Spec full, Draft, Transcript) ahora se puede validar con `dkc-validate <kind> <file>` y obtener detection programatica de drift en frontmatter o estructura.
> **Por que**: hoy solo 6/12+ kinds tienen validator. HOR-054 va a leer artefactos del filesystem y heredar drift en los faltantes.

El sistema MUST exponer 6 validators Zod nuevos (`Ticket`, `Bug`, `MetaSpec`, `SpecFull`, `Draft`, `Transcript`) registrados en `commands/dkc-validate` con exit 0 cuando el archivo cumple el contrato y exit 1 con errors[] JSON cuando no.

**Actor**: developer del workflow + LLM ejecutor
**Layers**: meta (commands/lib/schemas/), code (commands/dkc-validate router)

<details><summary>Scenarios de validacion</summary>

#### Scenario: ticket valido pasa
- **GIVEN** un ticket conforme al template (frontmatter con id, status, work_type, teachings, story_points, etc.)
- **WHEN** ejecuto `./commands/dkc-validate Ticket projects/horadric/tickets/HOR-055.md`
- **THEN** exit code 0
- **AND** stdout vacio o reporte "OK"

#### Scenario: ticket con frontmatter invalido falla con error explicito
- **GIVEN** un ticket con campo `status` no enum (ej. "doing" en vez de "open"/"in_progress"/"closed")
- **WHEN** ejecuto `./commands/dkc-validate Ticket <file>`
- **THEN** exit code 1
- **AND** stdout JSON con `errors[].path = "status"` y mensaje explicit del enum esperado

#### Scenario: spec full con drift en Executive summary
- **GIVEN** un spec sin seccion `## Executive summary` o sin tabla de decisiones criticas
- **WHEN** ejecuto `./commands/dkc-validate SpecFull <file>`
- **THEN** exit code 1
- **AND** errors[] incluye seccion faltante con `path = "executive_summary.decisions_table"`

</details>

#### Acceptance
El dev puede validar cualquier kind con `dkc-validate <kind> <file>` y obtener output JSON estructurado de drift.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Ticket valido | HOR-055.md conforme | `dkc-validate Ticket HOR-055.md` | exit 0 | exit 0 |
| 2 | Ticket invalido | status="doing" | `dkc-validate Ticket <bad>.md` | exit 1 + errors[] | error path = "status" |
| 3 | Spec sin Executive summary | spec sin H2 | `dkc-validate SpecFull <bad>.md` | exit 1 | error path = "executive_summary" |

---

### REQ-IMPROVE-02: YAML strict no-duplicates en frontmatter

> **Que cambia**: el parser de frontmatter detecta duplicate keys (ej. `closed: '...'` mas `closed: null` en la misma seccion YAML) y los reporta como error explicito en vez de tomar el ultimo valor silenciosamente.
> **Por que**: bug D12 recurrente (HOR-046, HOR-050, HOR-051) — HC server retorna `frontmatter: {}` cuando hay duplicates; SQLite es mas permisivo. Listing funciona pero detail rompe.

El sistema MUST rechazar frontmatter con duplicate keys cuando se invoca cualquier validator (modo strict).

**Actor**: LLM productor de tickets/specs + dev
**Layers**: meta (parser yaml en `commands/lib/markdown.ts`)

<details><summary>Scenarios de validacion</summary>

#### Scenario: duplicate key detectado
- **GIVEN** un ticket con frontmatter `closed: '2026-05-16'\n closed: null`
- **WHEN** ejecuto `./commands/dkc-validate Ticket <file>` o cualquier kind
- **THEN** exit code 1
- **AND** error path = "frontmatter._duplicates" con key "closed" y lineas 26-27

#### Scenario: yaml valido sin duplicates pasa
- **GIVEN** un ticket con frontmatter sin duplicates
- **WHEN** ejecuto cualquier validator
- **THEN** exit code 0

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Duplicate closed | HOR-046 con D12 | validate | error duplicates | error path frontmatter._duplicates |
| 2 | Yaml valido | HOR-055 actual | validate | exit 0 | exit 0 |

---

### REQ-IMPROVE-03: Reglas narrativas convertibles a checks programaticos (cobertura 70-80%)

> **Que cambia**: el validator Teach extendido verifica R1 (glosario inline en primera aparicion), H12 (intros narrativas 3-lineas), cobertura 4-5 ejes pre/post execute. El validator SpecFull verifica callouts F8 (Que cambia / Por que) en REQs no triviales.
> **Por que**: hoy las reglas narrativas se verifican por grep mental del LLM (~97.5% falla, evidencia HOR-051+052). Sin schema, drift acumula y el dev se entera al cerrar el ticket o nunca.

El sistema MUST validar reglas narrativas estructurales (R1, H12, F8) via heuristicas + section detection con cobertura aceptable de 70-80%. Reglas semanticas profundas (R5 lessons learned con relevancia) quedan documentadas como gap conocido en S3.T4.

**Actor**: LLM productor de teach + spec
**Layers**: meta (schemas Teach + SpecFull)

<details><summary>Scenarios de validacion</summary>

#### Scenario: teach-intake sin intros H12 en seccion canonica
- **GIVEN** un teach-intake con `## Hypothesis map` pero sin blockquote `> **Que es esta seccion**:`
- **WHEN** `dkc-validate Teach <file>`
- **THEN** exit 1 con error path = "sections.hypothesis_map.intro_h12_missing"

#### Scenario: spec con REQ sin callout F8 (REQ no trivial)
- **GIVEN** un spec con `### REQ-IMPROVE-01: ...` seguido directo de "El sistema MUST..." sin blockquote previo
- **WHEN** `dkc-validate SpecFull <file>`
- **THEN** exit 1 con error path = "requirements[0].callout_f8_missing"

#### Scenario: REQ trivial sin callout (excepcion valida)
- **GIVEN** un REQ marcado como `trivial: true` o con 1 oracion auto-explicativa
- **WHEN** validate
- **THEN** exit 0 (callout omitido validamente)

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Teach con H12 | teach completo HOR-046 | validate | exit 0 | exit 0 |
| 2 | Teach sin H12 | teach con seccion sin intro | validate | error intro_h12_missing | error path |
| 3 | Spec sin F8 | spec con REQ sin callout | validate | error callout_f8_missing | error path |

---

### REQ-IMPROVE-04: Parser HC para `dkc:agent-invocation` + render rich

> **Que cambia**: el fence `dkc:agent-invocation` (introducido por HOR-054 para refactorizar los 6 mentions de AGENT INVOCATION) renderiza como tabla rica en HC (campos visibles: role, subagent_type, tier, prompt, fallback) en vez de code plain.
> **Por que**: enforcement cataloging debe ser visible al dev sin requerir lectura del raw YAML. Patron alineado con los 4 fences existentes (hypothesis-map, decision-matrix, learning-path, code-walkthrough).

El sistema MUST registrar el kind `agent-invocation` en `isKnownKind` enum + case en `parseBlock` switch de `horadric-cube/server/deckard/blocks.ts`, parsear YAML conforme a schema, y renderizar via Vue component dedicado.

**Actor**: dev que lee specs en HC
**Layers**: code (horadric-cube server + frontend)

<details><summary>Scenarios de validacion</summary>

#### Scenario: fence agent-invocation renderiza tabla
- **GIVEN** un step con fence ` ```dkc:agent-invocation\nrole: researcher\nprompt: "..."\n``` `
- **WHEN** abro el step en HC
- **THEN** veo tabla con columnas role/prompt/fallback en vez de code plain

#### Scenario: yaml invalido en fence agent-invocation
- **GIVEN** un fence con yaml malformado
- **WHEN** HC parsea
- **THEN** muestra error con linea + columna del yaml invalido

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Render rich | fence valido | HC carga | tabla visible | tabla con role + prompt |
| 2 | YAML error | fence malformado | HC parsea | error explicit | error con linea |

---

### REQ-IMPROVE-05: Validators de ejecucion (SessionExecution + StepTransition)

> **Que cambia**: tasks marcadas `[x]` sin entry correspondiente en `## Sessions` del ticket, sub-seccion Quality Review faltante en tier T1+, Gate decision implicita (no documentada), step out-of-order — todos detectables por `dkc-validate SessionExecution <file>` y `dkc-validate StepTransition <file>`.
> **Por que**: directivas declarativas D9 (transiciones `[~]`), DET-23 (Quality Review obligatorio), Gate decision explicit se incumplen silenciosamente (D11 ~97.5% medido HOR-046). Validar solo artefactos finales no detecta drift en proceso.

El sistema MUST exponer 2 validators de ejecucion (`SessionExecution`, `StepTransition`) que leen ticket markdown + spec y verifican consistencia transicional, Quality Review presente, Gate decision explicit, orden valido de steps.

**Actor**: LLM ejecutor (post-task) + dev (audit retroactivo)
**Layers**: meta (schemas), code (parser session blocks)

<details><summary>Scenarios de validacion</summary>

#### Scenario: task `[x]` sin entry en Sessions
- **GIVEN** spec con task `S2.T3 [x] done` pero ticket sin `### Session 2` con esa task en log
- **WHEN** `dkc-validate SessionExecution <ticket>`
- **THEN** exit 1 con error path = "tasks[S2.T3].session_log_missing"

#### Scenario: Quality Review faltante en tier T2
- **GIVEN** session con tier T2 cerrada pero sin sub-seccion `#### Quality review (DET-23)`
- **WHEN** `dkc-validate SessionExecution <ticket>`
- **THEN** exit 1 con error path = "sessions[2].quality_review_missing"

#### Scenario: Gate decision implicita
- **GIVEN** session sin linea `**Gate decision:** continue | iterate | escalate | standby`
- **WHEN** validate
- **THEN** exit 1 con error path = "sessions[N].gate_decision_missing"

#### Scenario: step out-of-order
- **GIVEN** ticket con design-improvement registrado antes que teach-intake
- **WHEN** `dkc-validate StepTransition <ticket>`
- **THEN** exit 1 con error path = "transitions.invalid_order"

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Task sin session log | spec + ticket inconsistente | validate | error session_log_missing | error path |
| 2 | Quality Review faltante | session T2 sin QR | validate | error quality_review_missing | error path |
| 3 | Gate decision implicita | session sin decision line | validate | error gate_decision_missing | error path |
| 4 | Step out-of-order | design antes que teach-intake | validate | error invalid_order | error path |

---

### REQ-IMPROVE-06: Marker `## Workflow state` machine-readable en template de ticket

> **Que cambia**: cada ticket post-2026-05-17 puede declarar `## Workflow state` con tabla cronologica de steps ejecutados (request-intake/intake-explore/teach-intake/design-{tipo}/execute/close) con timestamps Started/Closed.
> **Por que**: hoy no hay tracking de "que step esta corriendo ahora". Validator StepTransition lo lee para verificar orden valido + gates DET-21/22. HC tab Sessions lo renderiza para visibilidad.

El sistema MUST agregar al template `templates/records/ticket.md` una seccion opcional `## Workflow state` con tabla `| Step | Status | Started | Closed |`. Tickets legacy sin la seccion siguen funcionando (backwards compat).

**Actor**: LLM productor de tickets + HC viewer
**Layers**: meta (template), code (HC parser + Vue render)

<details><summary>Scenarios de validacion</summary>

#### Scenario: ticket nuevo con Workflow state poblado
- **GIVEN** un ticket con `## Workflow state` poblado con 3 steps cronologicos
- **WHEN** abro en HC tab Sessions
- **THEN** veo tabla con steps + timestamps

#### Scenario: ticket legacy sin Workflow state
- **GIVEN** un ticket pre-2026-05-17 sin la seccion
- **WHEN** abro en HC
- **THEN** ticket renderea sin error, tab Sessions oculta el bloque

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Nuevo ticket con seccion | HOR-056+ con WS | HC carga | tabla visible | tabla con steps |
| 2 | Legacy sin seccion | HOR-001..045 | HC carga | sin error | render normal |

---

### REQ-IMPROVE-07: Catalogo a-hook en steps DKC

> **Que cambia**: cada step DKC declara sus invocaciones de validators via comentarios machine-readable `<!-- enforcement: a-hook command: "./commands/dkc-validate <kind> <file>" -->`. HOR-054 lee el catalogo para enforcement automatic.
> **Por que**: el patron NO existe hoy (H6 refuted — `grep "<!-- enforcement:" prompts/steps/` retorna 0). Sin catalogo machine-readable, HOR-054 no sabe que validar cuando. Los validators son codigo muerto en aislamiento.

El sistema MUST introducir el patron `<!-- enforcement: a-hook command: "..." -->` y poblar invocaciones para los 14 validators (6 existentes + 6 artefactos nuevos + 2 ejecucion) en sus steps invocadores correspondientes.

**Actor**: HOR-054 MCP tool (consumer) + LLM ejecutor (read)
**Layers**: meta (prompts/steps/*.md)

<details><summary>Scenarios de validacion</summary>

#### Scenario: grep retorna tags poblados
- **GIVEN** post-S6 ejecutado
- **WHEN** `grep -c "<!-- enforcement: a-hook" prompts/steps/*.md`
- **THEN** retorna numero ≥ 14 (uno minimo por validator)

#### Scenario: tag con kind no existente
- **GIVEN** tag a-hook que invoca `dkc-validate NoExisteKind <file>`
- **WHEN** `dkc-audit-validators`
- **THEN** detecta como ref rota

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Catalogo poblado | post-S6 | grep | ≥14 tags | conteo correcto |
| 2 | Tag con kind invalido | error introducido | audit | detected | exit 1 + ref rota |

---

### REQ-IMPROVE-08: Audit script `dkc-audit-validators`

> **Que cambia**: el script lista validators declarados en `commands/lib/schemas/`, lista invocaciones (tags a-hook + calls en prose), reporta drift declarado vs invocado, codigo muerto (validators sin invocacion), refs rotas (invocaciones a validators que no existen).
> **Por que**: validators y steps evolucionan. Sin audit, drift acumula silencioso. Reutiliza patron de `validate-templates` (HOR-021).

El sistema MUST exponer `commands/dkc-audit-validators` con exit 0 si no hay drift y exit 1 con reporte JSON cuando lo hay.

**Actor**: dev (pre-merge) + CI futuro + HOR-054 (consumer opcional)
**Layers**: code

<details><summary>Scenarios de validacion</summary>

#### Scenario: audit pasa sobre corpus actual post-S6
- **GIVEN** catalogo a-hook poblado en S6 y todos los validators implementados
- **WHEN** `./commands/dkc-audit-validators`
- **THEN** exit 0 + reporte "0 drift detected"

#### Scenario: validator sin invocacion (codigo muerto)
- **GIVEN** validator nuevo agregado sin tag a-hook en ningun step
- **WHEN** audit
- **THEN** exit 1 + reporte "validator X sin invocacion"

#### Scenario: invocacion a validator inexistente
- **GIVEN** tag a-hook con kind "NoExisteKind"
- **WHEN** audit
- **THEN** exit 1 + reporte "invocacion broken ref a NoExisteKind"

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Audit clean | post-S6 ok | audit | exit 0 | exit 0 |
| 2 | Validator muerto | nuevo sin tag | audit | exit 1 | error codigo muerto |
| 3 | Ref rota | tag con kind invalido | audit | exit 1 | error ref rota |

---

### REQ-PRESERVE-01: Validators existentes sin regresion

> **Que cambia**: nada. Los 6 validators existentes (SpecTask, SessionBlock, Teach, Decision, Rule, AntiPatterns) siguen pasando con `dkc-validate` sin regresion.
> **Por que**: cambios al router de `dkc-validate` y al parser de `markdown.ts` no deben romper detecciones que ya funcionan (DET-7 regression obligatoria).

El sistema MUST preservar el comportamiento actual de los 6 validators existentes. Tests existentes pasan post-cambios.

<details><summary>Scenarios de validacion</summary>

#### Scenario: SpecTask sigue validando
- **GIVEN** spec actual con tasks shape canonical
- **WHEN** `dkc-validate SpecTask <file>`
- **THEN** exit code igual al pre-cambios (0 si valido)

</details>

---

### REQ-PRESERVE-02: Tickets legacy renderean en HC sin error

> **Que cambia**: nada. Tickets sin `## Workflow state` renderean igual que antes (seccion opcional, parser tolerante).
> **Por que**: backwards-compat critico. No se migran tickets historicos (DET-25 patron no-retroactivo).

El sistema MUST preservar el render correcto de tickets pre-2026-05-17 sin `## Workflow state`.

---

### REQ-PRESERVE-03: Fences `dkc:*` existentes siguen renderizando

> **Que cambia**: nada. hypothesis-map, decision-matrix, learning-path, code-walkthrough renderean igual que antes en HC.
> **Por que**: extension del parser para `dkc:agent-invocation` no debe romper kinds existentes (DET-7).

El sistema MUST preservar el render correcto de los 4 fences `dkc:*` existentes.

---

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | `dkc-validate <kind> <file>` ejecuta rapido | latencia | < 500ms para archivos < 100KB |
| Performance | `dkc-audit-validators` corpus completo | latencia | < 10s para 100 archivos |
| Maintainability | Cobertura tests validators nuevos | line coverage | ≥ 80% en commands/lib/schemas/{ticket,spec-full,bug,meta-spec,draft,transcript,session-execution,step-transition}.ts |
| Compatibility | Tickets/specs/teaches historicos | regresion | 0 (pasan post-S6) |

## Changes

### Modified: `commands/lib/markdown.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Parser yaml | Casero minimalist, sin detect duplicates | Modo strict optional con duplicate detection (segun DEC-LOCAL-01) | REQ-IMPROVE-02 |

### Modified: `commands/lib/schemas/teach.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| TeachSchema | Valida bloques dkc:* (4 kinds) + structure | Extension con checks de R1 glosario, H12 intros, 4-5 ejes | REQ-IMPROVE-03 |

### Modified: `commands/dkc-validate`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Router | Resuelve 6 kinds | Resuelve 14 kinds (6 + 6 + 2) | REQ-IMPROVE-01, REQ-IMPROVE-05 |

### Modified: `horadric-cube/server/deckard/blocks.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| isKnownKind | enum literal 4 kinds | enum literal 5 kinds (+ agent-invocation) | REQ-IMPROVE-04 |
| parseBlock switch | 4 cases | 5 cases | REQ-IMPROVE-04 |

### Modified: `templates/records/ticket.md`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Seccion Workflow state | No existe | Seccion opcional con tabla cronologica | REQ-IMPROVE-06 |

### Modified: `prompts/steps/*.md` (15-20 archivos)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Tags a-hook | No existen (0 occurrencias) | 14+ tags poblados | REQ-IMPROVE-07 |

### Added: `commands/lib/schemas/`

| File | Purpose |
|------|---------|
| `ticket.ts` | TicketSchema (REQ-IMPROVE-01) |
| `bug.ts` | BugSchema (REQ-IMPROVE-01) |
| `meta-spec.ts` | MetaSpecSchema (REQ-IMPROVE-01) |
| `spec-full.ts` | SpecFullSchema con callouts F8 check (REQ-IMPROVE-01, REQ-IMPROVE-03) |
| `draft.ts` | DraftSchema (REQ-IMPROVE-01) |
| `transcript.ts` | TranscriptSchema (REQ-IMPROVE-01) |
| `session-execution.ts` | SessionExecutionSchema (REQ-IMPROVE-05) |
| `step-transition.ts` | StepTransitionSchema (REQ-IMPROVE-05) |

### Added: `commands/dkc-audit-validators`

| Field | Value | Purpose |
|-------|-------|---------|
| Script | bash + node | List validators + parse tags + diff + report |
| Exit code | 0 sin drift, 1 con drift | REQ-IMPROVE-08 |

### Added: `horadric-cube/src/components/.../AgentInvocationBlock.vue`

| Field | Value | Purpose |
|-------|-------|---------|
| Component | Vue 3 SFC | Render rich tabla de fence dkc:agent-invocation |

### Added: `horadric-cube/src/components/tickets/WorkflowState.vue`

| Field | Value | Purpose |
|-------|-------|---------|
| Component | Vue 3 SFC | Render `## Workflow state` en tab Sessions del ticket |

## Tasks

> **SHAPE CANONICO**: tabla 11-column del schema actual `SpecTaskSchema` (`commands/lib/schemas/spec-task.ts`): `# | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios`. Drift conocido vs template (`source_ref / Agent / Depends on / Validation / Rules`) documentado en DEC-LOCAL-03 — alinear template a schema en S2 como parte del SpecFullSchema.

### Session 1 — Diseno schemas + decisiones criticas (H2 yaml-strict + H8 heuristica `[~]`) + audit pseudocode [tipo: auto] [tier: T1]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S1.T1 | Inventariar patron Zod canonical de los 6 schemas existentes — extraer template reusable | researcher | fast | commands/lib/schemas/*.ts | manual: documento de patron en notas | template Zod pattern documentado | — | done | 1 | — |
| S1.T2 | Disenar schemas Zod (esqueleto, sin implementar) para los 6 validators artefactos: Ticket, Bug, MetaSpec, Spec full, Draft, Transcript | architect | reasoning | tickets/HOR-055.notes.md | manual: 6 esqueletos compilan | 6 schemas esqueleto + tests previstos | — | done | 1 | — |
| S1.T3 | DEC-LOCAL-01 (H2): yaml strict no-duplicates — parser casero extendido vs js-yaml | architect | reasoning | spec section Decisions | manual: DEC-LOCAL-01 escrita con drivers + alternativas | DEC-LOCAL-01 con opcion elegida + razon | — | done | 1 | — |
| S1.T4 | DEC-LOCAL-02 (H8): heuristica `[~]` — git history vs marker explicit | architect | reasoning | spec section Decisions | manual: DEC-LOCAL-02 escrita | DEC-LOCAL-02 con opcion elegida + razon | — | done | 1 | — |
| S1.T5 | Disenar schemas Zod (esqueleto) para 2 validators ejecucion: SessionExecution, StepTransition | architect | reasoning | tickets/HOR-055.notes.md | manual: 2 esqueletos compilan | 2 schemas esqueleto + tests previstos | — | done | 1 | — |
| S1.T6 | Disenar pseudocodigo de `dkc-audit-validators` basado en patron de `validate-templates` | architect | balanced | tickets/HOR-055.notes.md | manual: pseudocode revisado | pseudocode con steps + integracion CI | — | done | 1 | — |
| S1.T7 | Diseno marker `## Workflow state`: formato tabla + campos minimos (Step/Status/Started/Closed) + interaccion con HC | architect | balanced | tickets/HOR-055.notes.md | manual: spec del marker | spec marker en notas con ejemplos positivo y negativo | — | done | 1 | — |
| **S1.GATE** | Gate de sync Session 1 (tier T1) — persistir resultados en `## Sessions` + validar decisiones cerradas + Quality Review DET-23 | reviewer | balanced | tickets/HOR-055.md | gate persistido | decisiones DEC-LOCAL-01/02 cerradas, esquemas disenados, audit pseudocode aprobado | — | done | 1 | — |

### Session 2 — Validators artefactos criticos: Ticket, Spec full, Bug + yaml-strict [tipo: auto] [tier: T2]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S2.T1 | Implementar TicketSchema (Zod) con frontmatter completo (id, status, work_type, teachings, story_points, autopilot, sprint, draft_approved, etc.) | developer | balanced | commands/lib/schemas/ticket.ts | TC-IMPROVE-01-ticket | TicketSchema exporta + tests unit pasan | git revert | done | 2 | — |
| S2.T2 | Implementar SpecFullSchema (Zod): valida secciones canonicas (Executive summary con tabla, Purpose, REQs con callouts F8, Tasks, Acceptance) | developer | reasoning | commands/lib/schemas/spec-full.ts | TC-IMPROVE-02-spec-full | SpecFullSchema exporta + tests + check de callouts F8 funciona | git revert | done | 2 | — |
| S2.T3 | Implementar BugSchema (Zod) basado en templates/records/bug.md frontmatter | developer | balanced | commands/lib/schemas/bug.ts | TC-IMPROVE-03-bug | BugSchema exporta + tests | git revert | done | 2 | — |
| S2.T4 | Implementar yaml strict no-duplicates segun DEC-LOCAL-01 (S1.T3) | developer | reasoning | commands/lib/markdown.ts | TC-IMPROVE-04-yaml-strict | duplicate keys detectados con error explicito + path en errors[] | git revert | done | 2 | — |
| S2.T5 | Integrar 3 validators artefactos + yaml-strict con `dkc-validate` router | developer | balanced | commands/dkc-validate, commands/lib/dkc-validate.ts | TC-IMPROVE-05-cli | `dkc-validate Ticket/Bug/SpecFull <file>` retorna exit 0/1 correcto | git revert | done | 2 | — |
| **S2.GATE** | Gate de sync Session 2 (tier T2 + Quality Review DET-23 10-dim) | reviewer | balanced | tickets/HOR-055.md | gate persistido + Quality Review tabla | 3/3 validators artefactos funcionan + yaml-strict catches D12 historico (test sobre HOR-046 backup) | — | done | 2 | — |

### Session 3 — Validators artefactos restantes: MetaSpec, Draft, Transcript + Teach extendido [tipo: auto] [tier: T2]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S3.T1 | Implementar MetaSpecSchema (Zod) basado en templates/records/meta-spec.md | developer | balanced | commands/lib/schemas/meta-spec.ts | TC-IMPROVE-06-meta-spec | MetaSpecSchema + tests | git revert | done | 3 | — |
| S3.T2 | Implementar DraftSchema (Zod) basado en tickets/{id}.draft/intent.md | developer | balanced | commands/lib/schemas/draft.ts | TC-IMPROVE-07-draft | DraftSchema + tests | git revert | done | 3 | — |
| S3.T3 | Implementar TranscriptSchema (Zod) basado en templates/records/transcript.md | developer | balanced | commands/lib/schemas/transcript.ts | TC-IMPROVE-08-transcript | TranscriptSchema + tests | git revert | done | 3 | — |
| S3.T4 | Extender TeachSchema con checks narrativos (R1 glosario inline regex, H12 intros narrativas section detect, cobertura 4-5 ejes) — 70-80% cobertura aceptable | developer | reasoning | commands/lib/schemas/teach.ts | TC-IMPROVE-09-teach-narrative | TeachSchema detecta drift narrativo en spot-checks + gap conocido documentado para R5 semantico | git revert | done | 3 | — |
| S3.T5 | Integrar 3 validators + Teach extendido con `dkc-validate` router | developer | balanced | commands/dkc-validate, commands/lib/dkc-validate.ts | TC-IMPROVE-10-cli | router resuelve los 9 kinds artefactos (6 originales + 3 nuevos) | git revert | done | 3 | — |
| **S3.GATE** | Gate de sync Session 3 (tier T2 + Quality Review DET-23) | reviewer | balanced | tickets/HOR-055.md | gate persistido + Quality Review | 6/6 validators artefactos funcionan + Teach detecta drift narrativo en spot-checks | — | done | 3 | — |

### Session 4 — Parser HC `dkc:agent-invocation` + render `## Workflow state` (repo horadric-cube) [tipo: auto] [tier: T2]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S4.T1 | Implementar parser fence `dkc:agent-invocation`: agregar kind a isKnownKind enum + case en parseBlock switch | developer | balanced | horadric-cube/server/deckard/blocks.ts | TC-IMPROVE-11-parser-agent-invocation | fence parseado a DkcBlock con kind=agent-invocation | git revert | done | 4 | — |
| S4.T2 | Schema parser para YAML del fence (campos: subagent_type, tier, prompt, role, fallback) | developer | balanced | horadric-cube/server/deckard/blocks.ts | TC-IMPROVE-12-yaml-schema | YAML conforme a schema, errores con linea + columna | git revert | done | 4 | — |
| S4.T3 | Vue component AgentInvocationBlock.vue para mostrar fence rich (tabla con role + prompt + fallback) | developer | balanced | horadric-cube/src/components/.../AgentInvocationBlock.vue | TC-IMPROVE-13-vue-render | componente renderiza en tab de spec con todos los campos | git revert | done | 4 | — |
| S4.T4 | Vue component WorkflowState.vue para render de `## Workflow state` en tab Sessions | developer | balanced | horadric-cube/src/components/tickets/WorkflowState.vue | TC-IMPROVE-14-workflow-state | Workflow state visible en HC con cronologia steps | git revert | done | 4 | — |
| S4.T5 | Test regresion: fences existentes (hypothesis-map, decision-matrix, learning-path, code-walkthrough) renderean igual | reviewer | balanced | horadric-cube/tests/ | TC-PRESERVE-01-fences-existentes | 4 fences existentes pasan tests sin regresion | git revert | done | 4 | — |
| **S4.GATE** | Gate de sync Session 4 (tier T2 + Quality Review DET-23) | reviewer | balanced | tickets/HOR-055.md | gate persistido | parser fence agent-invocation funciona + Workflow state visible + zero regresion en fences existentes | — | done | 4 | — |

### Session 5 — Validators de ejecucion + marker Workflow state en template [tipo: auto] [tier: T2]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S5.T1 | Implementar SessionExecutionSchema: verifica tasks `[x]` sin entry Sessions, Quality Review faltante T1+, Gate decision implicita, sessions cronologicas inmutables | developer | reasoning | commands/lib/schemas/session-execution.ts | TC-IMPROVE-15-session-execution | SessionExecutionSchema detecta 5+ patrones de drift conocidos | git revert | done | 5 | — |
| S5.T2 | Implementar StepTransitionSchema: verifica orden valido (grafo invoked_after/invoked_before), gates DET-21/22 respetados | developer | reasoning | commands/lib/schemas/step-transition.ts | TC-IMPROVE-16-step-transition | StepTransitionSchema detecta saltos de step + gates incumplidos | git revert | done | 5 | — |
| S5.T3 | Agregar seccion opcional `## Workflow state` al template del ticket (formato segun S1.T7) | developer | balanced | templates/records/ticket.md | TC-IMPROVE-17-template-ticket | template actualizado, sample con seccion poblada validable | git revert | done | 5 | — |
| S5.T4 | Integrar SessionExecution + StepTransition con `dkc-validate` router | developer | balanced | commands/dkc-validate, commands/lib/dkc-validate.ts | TC-IMPROVE-18-cli-ejecucion | `dkc-validate SessionExecution/StepTransition <file>` funcionan | git revert | done | 5 | — |
| S5.T5 | Test regresion: tickets legacy sin `## Workflow state` renderean en HC sin error | reviewer | balanced | horadric-cube/tests/ | TC-PRESERVE-02-legacy-tickets | tickets legacy (HOR-001..045) pasan sin regresion | git revert | done | 5 | — |
| **S5.GATE** | Gate de sync Session 5 (tier T2 + Quality Review DET-23) | reviewer | balanced | tickets/HOR-055.md | gate persistido + Quality Review | 2/2 validators ejecucion funcionan + template Workflow state aceptado por TicketSchema | — | done | 5 | — |

### Session 6 — Catalogo a-hook: poblar tags en steps [tipo: auto] [tier: T2]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S6.T1 | Definir patron canonico del tag `<!-- enforcement: a-hook command: "./commands/dkc-validate <kind> <file>" -->` con campos minimos + ejemplo positivo/negativo | architect | balanced | docs/enforcement-pattern.md (nuevo) | manual: pattern documentado | pattern documentado con ejemplo positivo y negativo | — | done | 6 | — |
| S6.T2 | Poblar tags a-hook en steps de design (_design-shared, design-feature, design-fix, design-improvement, design-refactor) — invocaciones de SpecTask, SpecFull, Decision, Rule | developer | balanced | prompts/steps/_design-shared.md, design-*.md | manual: grep retorna ≥5 tags | tags a-hook visibles en cada step de design | git revert | done | 6 | — |
| S6.T3 | Poblar tags a-hook en steps de intake (request-intake, intake-explore, teach-intake) — Ticket, Teach, Decision, AntiPatterns | developer | balanced | prompts/steps/request-intake.md, intake-explore.md, teach-intake.md | manual: grep retorna ≥4 tags | tags a-hook visibles en steps de intake | git revert | done | 6 | — |
| S6.T4 | Poblar tags a-hook en steps de execute/close (request-execute, request-close, teach-close) — SessionExecution, StepTransition, SpecTask, Rule | developer | balanced | prompts/steps/request-execute.md, request-close.md, teach-close.md | manual: grep retorna ≥4 tags | tags a-hook visibles en execute/close | git revert | done | 6 | — |
| S6.T5 | Poblar tags a-hook en steps especializados (transcript-*, validate-templates, archive-spec, init-*) — segun aplica | developer | balanced | prompts/steps/transcript-*.md, validate-templates.md, archive-spec.md, init-*.md | manual: tags consistentes | tags donde aplique, N/A marcado donde no | git revert | done | 6 | — |
| **S6.GATE** | Gate de sync Session 6 (tier T2 + Quality Review DET-23) | reviewer | balanced | prompts/steps/*.md | gate persistido + Quality Review | 14+ validators con tag a-hook declarado en step correcto, catalogo machine-readable listo para HOR-054 | — | done | 6 | — |

### Session 7 — Audit script + baseline corpus horadric ⚑ FUERTE [tipo: ⚑ fuerte] [tier: T3]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S7.T1 | Implementar `commands/dkc-audit-validators` segun pseudocode de S1.T6 (artefactos + ejecucion) | developer | reasoning | commands/dkc-audit-validators, commands/lib/audit-validators.ts | TC-IMPROVE-19-audit-impl | script implementa 4 detecciones (codigo muerto, refs rotas, kind en step incorrecto, drift declarado vs invocado) | git revert | done | 7 | — |
| S7.T2 | Tests de audit con casos artificiales (validator sin invocacion, invocacion a kind inexistente, kind invocado en step incorrecto) | developer | balanced | commands/lib/audit-validators.test.ts | TC-IMPROVE-20-audit-tests | tests pasan con 4+ casos artificiales | git revert | done | 7 | — |
| S7.T3 | Ejecutar audit baseline sobre corpus horadric (post-S6) — reporte de drift encontrado o exit 0 | researcher | balanced | (lectura) | manual: reporte baseline en spec section Success metrics | reporte baseline con conteo de validators + invocaciones | — | done | 7 | — |
| S7.T4 | Spot-checks artificiales: introducir 3 drifts sinteticos y verificar deteccion | reviewer | balanced | (test only, revert) | manual: 3 drifts artificiales detectados | catch rate documentado (≥95%) | — | done | 7 | — |
| S7.T5 | OPCIONAL: poblar `projects/horadric/templates/` con 1-2 templates project-scoped (backlog should — S5 reclassificado) | developer | balanced | projects/horadric/templates/ | manual: templates compilan via validate-templates | sample de templates project-scoped (si dev decide) o skip documentado | git revert | done | 7 | — |
| **S7.GATE** | Gate de sync Session 7 ⚑ FUERTE (tier T3 + regression completa + Quality Review DET-23 10-dim) — aprobacion explicit del dev requerida | reviewer | reasoning | tickets/HOR-055.md, audit reporte | gate ⚑ fuerte: dev firma | audit exit 0 sobre corpus + 3 drifts artificiales detectados + baseline documentado + HOR-054 desbloqueado oficialmente | — | done | 7 | — |

### Task contract — extension de la tabla

Cada task aplica las rules transversales de design-improvement (heredadas del frontmatter del ticket + DETs base de `_design-shared`):

- **DET-1, DET-2** (certeza + source_ref): toda task implementable con REQ asociado
- **DET-5, DET-7, DET-8** (multi-capa + test cases regression + rollback): aplican a S2-S6
- **DET-10, DET-11** (limites por rol + KB-first): aplican a todas las tasks
- **DET-13, DET-16** (cierre con evidencia + propagacion): aplican al close (post-S7.GATE)
- **DET-20, DET-23** (sessions con gate + Quality Review 10-dim): aplican a S{N}.GATE
- **DET-25** (test cases inline durante execute): aplican a S2-S7 al registrar TCs en el momento

## Constraints

- **DET-1..DET-25**: contratos base del workflow DKC. Aplican transversalmente — sin mencion explicit por task salvo donde es bloqueante (gates)
- **DET-11 (KB-first)**: consultar rules del workflow + bugs abiertos + decisions existentes antes de implementar cada validator (ej. patron Zod canonical, convencion de error path)
- **RULE-workflow-***: rules del modulo workflow que aplican al validar. A inventariar en S1.T1 desde `projects/horadric/rules/workflow/`
- **HOR-041 constraint "NO nuevas dependencias"**: peso en DEC-LOCAL-01 (yaml strict). Si se elige js-yaml, justificar override explicito

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Zod | internal (ya en uso) | Library de schemas para los validators | Bajo — ya en uso |
| commands/lib/markdown.ts parser | internal | Extender parser casero para yaml strict | Medio — toca parser core, regresion potencial sobre 6 validators existentes |
| horadric-cube `server/deckard/blocks.ts` | internal (otro repo) | Extension del switch de fence parsers | Bajo — patron mecanico |
| validate-templates (HOR-021) | internal | Patron base para audit script | Bajo — solo lectura |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Drift en pattern a-hook entre los 14+ tags poblados manualmente | medium | medium | S7 audit script corre baseline + detecta drift declarado vs invocado. Regex verifica formato canonical |
| Extension de parser yaml casero rompe los 6 validators existentes | low | high | REQ-PRESERVE-01 con tests de regresion. Modo strict opt-in (no obligatorio para validators existentes) |
| Validator Teach extendido <100% cobertura en R5 semantico | medium | low | Gap documentado en S3.T4. 70-80% cobertura via heuristicas es aceptable. R5 profundo queda como follow-up futuro |
| Parser HC `dkc:agent-invocation` se desincroniza con futuras fences | low | low | DEC-LOCAL-04 documenta: case en switch primero, registry generico si crece N° de fences |
| HOR-054 cambia API esperada de los validators post-HOR-055 | low | medium | Coordinar S1 + S6 con disenio de HOR-054. Documentar contrato esperado en docs/enforcement-pattern.md (S6.T1) |
| Auditor catch rate <95% (false negatives ocultos) | medium | medium | S7.T4 spot-checks artificiales miden catch rate empirico. Si <95%, S7.GATE ⚑ fuerte queda en iterate hasta resolver |

## Open questions

- [ ] **H2 decisional** (DEC-LOCAL-01 en S1.T3): parser yaml casero extendido vs js-yaml. Trade-off entre 0-deps (HOR-041) y robustez probada. Pendiente: pesar effort de extension (~30-50 LOC casero) vs override de constraint
- [ ] **H8 decisional** (DEC-LOCAL-02 en S1.T4): heuristica `[~]` ausente — git history retroactivo vs marker explicit en spec history. Pendiente: validar costo de git history para 100+ tickets
- [ ] **Decision opt-in templates project-scoped** (S5 reclassificado a backlog should — S7.T5 opcional): poblar `projects/horadric/templates/` ahora vs dejar para sample futuro

## Decisions

### DEC-LOCAL-01: (pendiente — S1.T3) yaml strict no-duplicates: parser casero extendido vs js-yaml

- **Contexto**: bug D12 (duplicate keys en frontmatter) requiere detection programatica. Parser actual es casero (HOR-041: NO nuevas dependencias).
- **Drivers**: a definir en S1.T3 — effort extension casero, robustez vs deps externas, performance, mantenibilidad
- **Opcion elegida**: (pendiente)
- **Alternativas**: (a) extender parser casero ~30-50 LOC, (b) introducir js-yaml con FAILSAFE_SCHEMA + override HOR-041
- **Consecuencias**: (pendiente)
- **Session**: 1

### DEC-LOCAL-02: (pendiente — S1.T4) heuristica `[~]` para SessionExecution validator

- **Contexto**: validar que tasks pasaron por estado intermedio `[~]` visible en spec history. Hoy sin pattern.
- **Drivers**: a definir en S1.T4 — costo retroactivo (git log), simplicidad, falsa-negatividad
- **Opcion elegida**: (pendiente)
- **Alternativas**: (a) git history para 100+ tickets, (b) marker explicit del LLM en cada task transition (`[~] timestamp`), (c) sin heuristica (acepted gap)
- **Consecuencias**: (pendiente)
- **Session**: 1

### DEC-LOCAL-03: Spec actual usa shape 11-column del SpecTaskSchema (no del template)

- **Contexto**: Schema `SpecTaskSchema` actual usa columnas `# | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios`. Template `templates/records/spec.md` documenta `source_ref / Agent / Depends on / Validation / Rules`. Drift entre schema y template.
- **Drivers**: HOR-055 spec debe pasar `dkc-validate SpecTask` con exit 0. Schema es source of truth (Zod compila + ejecuta); template es documentacion.
- **Opcion elegida**: usar shape del schema (`Role / Tier / Files / Tests / DoD / Cambios`) en este spec. Alinear template a schema en S2 como parte del SpecFullSchema (incluir check de coherencia template-schema).
- **Alternativas**: (a) usar shape del template + override schema (rompe validators existentes — REQ-PRESERVE-01); (b) refactorizar schema para coincidir con template (scope creep — fuera de HOR-055)
- **Consecuencias**: spec valida hoy. Drift documentado para resolucion en S2.
- **Session**: 0 (intake)

### DEC-LOCAL-04: Parser HC `dkc:agent-invocation` — case en switch vs registry generico

- **Contexto**: H4 confirmed — parser actual usa enum literal `isKnownKind` + switch en `parseBlock`. Extension trivial: agregar caso.
- **Drivers**: complejidad refactor a registry dinamico vs ROI con 1 fence nuevo. Patron actual es funcional, no roto.
- **Opcion elegida**: case en switch primero (S4.T1). Registry generico queda en backlog si N° de fences crece (≥7 fences hace que mantener switch sea fricciono).
- **Alternativas**: (a) refactor a registry dinamico ahora (~2-4h adicionales), (b) ignorar y dejar codigo plain (rechazado — REQ-IMPROVE-04 exige render rich)
- **Consecuencias**: refactor a registry queda pospuesto. Si HOR-056+ introduce 2+ fences mas, evaluar promocion.
- **Session**: 0 (intake)

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Cobertura validators (kinds artefactos) | 6/12+ (50%) | 12+/12+ (100%) | `ls commands/lib/schemas/*.ts \| wc -l` post-S3 |
| Cobertura validators (kinds ejecucion) | 0/3 (0%) | 3/3 (100% — SessionExecution, StepTransition, marker) | `ls commands/lib/schemas/*.ts \| grep -E "(session-execution\|step-transition)" \| wc -l` post-S5 |
| Tags a-hook en steps | 0 occurrencias | ≥14 occurrencias | `grep -c "<!-- enforcement: a-hook" prompts/steps/*.md` post-S6 |
| Audit catch rate (3 drifts artificiales) | N/A | ≥95% (3/3 detectados) | S7.T4 spot-checks empiricos |
| YAML strict catches D12 historico | N/A | 100% (HOR-046, HOR-050, HOR-051 backups) | TC-IMPROVE-04-yaml-strict ejecutado sobre archivos historicos |
| Cobertura tests validators nuevos | 0% | ≥80% line coverage | `vitest --coverage` post-S5 |
| Regresion validators existentes | 0 regression | 0 regression | REQ-PRESERVE-01 tests |

## Technical reference

**Schemas existentes a usar como referencia** (HOR-055 los inventaria en S1.T1):
- `commands/lib/schemas/spec-task.ts` — patron Zod canonical (object + strict + enums + regex + union types)
- `commands/lib/schemas/session-block.ts` — parser markdown sections + Zod combination
- `commands/lib/schemas/teach.ts` — extension de Zod para bloques dkc:*
- `commands/lib/schemas/rule.ts` — patron simple Zod para metadatos
- `commands/lib/schemas/decision.ts` — similar
- `commands/lib/schemas/anti-patterns.ts` — patron de detection con regex

**Parser markdown actual**:
- `commands/lib/markdown.ts:117-171` — parser yaml casero. Extender en S2.T4
- `commands/lib/markdown.ts:246-256` — parseSessionBlocks via regex `/(?=^### Session \d+)/m`. Reutilizar en SessionExecutionSchema (S5.T1)

**Parser HC**:
- `horadric-cube/server/deckard/blocks.ts:30-81` — `isKnownKind` enum literal
- `horadric-cube/server/deckard/blocks.ts:95-117` — `parseBlock` switch
- `horadric-cube/server/deckard/body.ts:1-77` — extractSections / findSection (case-insensitive, tolera secciones nuevas — base de REQ-PRESERVE-02)

**Patron baseline para audit**:
- `commands/dkc-validate-templates.md` — 46 lineas doc + ~100-150 LOC impl (HOR-021)

## Rules discovered

(Se llena durante execute)

## Bugs found

(Se llena durante execute)

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de cada REQ-IMPROVE-01..08 pasan + scenarios de regression REQ-PRESERVE-01..03 pasan
- [ ] **Tests**: TC-IMPROVE-01..20 + TC-PRESERVE-01..02 escritos y pasando
- [ ] **NFRs**: latencia validators < 500ms, audit < 10s corpus completo, line coverage ≥ 80% en validators nuevos
- [ ] **Rules**: patterns DET-1..DET-25 respetados en task contracts y gates
- [ ] **Integration**: validators existentes (REQ-PRESERVE-01) + tickets legacy (REQ-PRESERVE-02) + fences existentes (REQ-PRESERVE-03) no rompen
- [ ] **Docs**: `docs/enforcement-pattern.md` creado, `templates/records/ticket.md` actualizado, drift template vs schema resuelto (DEC-LOCAL-03 cerrado)
- [ ] **HOR-054 desbloqueado**: S7.GATE ⚑ fuerte aprobado por dev. Catalogo a-hook + validators artefactos + validators ejecucion + audit baseline = listo para HOR-054 consumer

## Archiving

Una vez HOR-054 cierre y el sistema cerrado de directive enforcement este operativo, evaluar si esta spec se promueve a meta-spec o queda como spec historico. NO archivar manualmente — usar `/dkc-archive-spec` si emerge la decision.
