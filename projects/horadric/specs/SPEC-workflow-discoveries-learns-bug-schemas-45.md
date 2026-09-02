---
id: SPEC-workflow-discoveries-learns-bug-schemas-45
project: horadric
ticket: HOR-045
status: draft
---

# Discoveries/Learns/Bug schemas (DKC v2 Phase 4 conditional)

# Discoveries/Learns/Bug schemas (DKC v2 Phase 4 conditional)

> **STATUS: draft** — NO se ejecuta hasta que C1-C4 (en HOR-045) se cumplan. Blueprint listo. Activacion: re-clasificar work_type explore → improvement, mover status `draft` → `in_progress`.

## Executive summary — lo que estas aprobando (post-activacion)

> *Lectura de 60s. Aprobacion = activacion del spec.*

### Que se quiere

Cerrar los 6 records core de DKC con schema formal. HOR-026 cubrio SpecTask + SessionBlock. HOR-041 cubrio Rule + Decision. HOR-045 cubre **Discovery + Learn + Bug** — los 3 restantes.

**Cobertura post-activacion**: 3 schemas zod + state machine learn validada + integracion CLI + dogfood retroactivo sobre KB horadric.

**Foundation logica completa**: los 6 records core con schema → habilita HOR-031 embedding semantico + HOR-037 LoRA fine-tuning dataset coherente.

### Decisiones criticas (DEC-LOCAL — cerradas en design-draft)

| # | Decision | Por que |
|---|----------|---------|
| 1 | **DiscoverySchema tolerante** (`classification` opcional, warning si missing) | Cero migracion retroactiva; discoveries son texto libre |
| 2 | **LearnSchema con state machine** (`.refine()` valida transiciones) | Previene status invalidos (raw → promoted sin refined) |
| 3 | **BugSchema extiende frontmatter actual** (no redefine) | H3 confirmed por sample real horadric; cero migracion |
| 4 | **Avanzar independiente de HOR-037** | Schemas self-sufficient; HOR-037 ajusta post si necesita |
| 5 | **NO migracion retroactiva automatic** | Solo records nuevos; historicos con drift documentado |
| 6 | **Reuso 100% de patron HOR-041** | Mismo CLI dkc-validate extendido, parsers extendidos |

### Riesgos

- **H1 refutada (discoveries demasiado libres)**: probabilidad media, impact medio. Mitigacion: schema tolerante `--lenient` default; aceptar trade-off de drift
- **Learn state machine rompe legacy**: probabilidad media. Mitigacion: warnings en legacy, `--strict` solo nuevos
- **Bug variantes no contempladas**: baja. Mitigacion: array extensible (HOR-041 pattern)
- **HOR-037 requiere shape diferente**: media. Mitigacion: schemas conservadores; ajustar post

### Que NO se hace

- NO migracion retroactiva (solo nuevos)
- NO auto-promotion learns (refined → rule/decision/bug) — out of scope
- NO embedding-aware retrieval (HOR-031 separate)
- NO discovery sub-IDs (D1.1, D2.3) — futuro
- NO breaking changes en HOR-026/041 schemas
- NO coordinacion bloqueante con HOR-037 (avanzar independiente)

### Tamano

4 sessions execute + 1 close = 5 sessions. SP estimated: **5**. Tiempo: ~5-6h efectivas (mas grande que HOR-041 que fue 1.5h porque 3 schemas + state machine + dogfood retroactivo sobre KB historico).

### Como vas a saber que funciona

- TC-01..10: schemas + state machine validan samples
- TC-11: tabla Learns de HOR-040 valida via CLI
- TC-12: dogfood retroactivo — bugs 100%, learns ≥85%, discoveries ≥75% valid
- TC-13: regression HOR-026 spec sin breaking
- TC-14: cero archivos legacy schemas modificados

---

## Purpose

Cerrar el 20% restante de drift estructural en DKC con foundation completa de schemas. **Activable cuando HOR-037 LoRA priorice** (dataset coherente para fine-tuning) o emerja drift recurrente.

Para HOR-037: dataset estructurado garantizado por enforcement de schema en escritura. Para HOR-031: embedding indexer puede filtrar por classification/status. Para dev: cero round-trips por bugs de formato canonical en discoveries/learns/bugs.

## Requirements

### REQ-IMPROVE-01 — DiscoverySchema (tolerante)

> **Que cambia**: `commands/lib/schemas/discovery.ts` define schema zod para discoveries con `description` required + `classification` opcional (enum 4 valores) + warning si missing en lenient mode.
> **Por que**: discoveries hoy texto libre. Schema captura shape canonical sin invalidar legacy.

El schema MUST:
- `id`: regex `/^(D|L)\d+$/` (D legacy + L legacy aceptados)
- `session`: union `string regex /^S\d+$/` | `integer >=0`
- `description`: string min 1 (siempre required)
- `evidence`: string opcional
- `classification`: enum `[rule-candidate, bug-found, decision-trigger, info]` opcional
- `promoted_to`: string nullable opcional
- Export type `Discovery`

### REQ-IMPROVE-02 — LearnSchema (state machine validada)

> **Que cambia**: `commands/lib/schemas/learn.ts` define schema con `.refine()` que valida state machine raw → refined → promoted/discarded.
> **Por que**: tabla Learns en cada ticket tiene state machine implicita. Schema la formaliza + previene status invalidos.

El schema MUST:
- `id`: regex `/^L\d+$/`
- `raw`: string min 1
- `refined`: string opcional (REQUIRED si status >= refined via `.refine()`)
- `detected_by`: enum `[developer, reviewer, researcher, passive, dev]`
- `session`: union string/integer
- `status`: enum `[raw, refined, promoted, discarded]`
- `promoted_to`: string nullable opcional (REQUIRED si status=promoted via `.refine()`)
- `promoted_at`: union string/date nullable opcional
- `.refine()` valida state machine: `status=promoted` requires `promoted_to + refined`; `status=refined` requires `refined`
- Export type `Learn`

### REQ-IMPROVE-03 — BugSchema (extension frontmatter actual)

> **Que cambia**: `commands/lib/schemas/bug.ts` define schema basado en sample horadric real (H3 confirmed): frontmatter + 8 secciones body con variantes normalizadas.
> **Por que**: bugs DKC tienen shape canonical observado. Schema formaliza.

El schema MUST:
- Frontmatter: id (`/^BUG-/`), project, module, severity (enum), status (enum), created, tags required; spec, ticket, detected_in, fixed_in opcional
- Severity enum: `[critical, high, medium, low]`
- Status enum: `[open, in_progress, fixed, wontfix, duplicate]`
- Body required: symptom, rootCause, reproduction (3 secciones core)
- Body opcional: expectedBehavior, impact, workaround, solution, related (5 opcional)
- Variantes normalizadas: `Workaround | Workaround pre-fix | Mitigation`; `Solution | Solution (post-fix ...) | Fix`
- Export type `Bug` + `BugSectionVariants` const

### REQ-IMPROVE-04 — Parsers + CLI extension

> **Que cambia**: `commands/lib/parsers/markdown.ts` agrega `parseDiscoveries`, `parseLearns`, `parseBug`. `commands/lib/validate.ts` + `commands/dkc-validate` aceptan `Discovery | Learn | Bug` kinds.
> **Por que**: sin parsers + CLI, schemas son TS inerte. Patron HOR-041 replicado.

Tool MUST:
- Aceptar kinds: SpecTask | SessionBlock | Rule | Decision | **Discovery | Learn | Bug** | all
- `all` dispatch por path: `/bugs/` → Bug; `/tickets/` con discoveries → Discovery; `/tickets/` con learns → Learn
- Help text actualizado

### REQ-IMPROVE-05 — Documentacion en `_style.md` Principio 9

> **Que cambia**: extension del Principio 9 con 3 schemas nuevos + state machine learn + variantes de seccion Bug.
> **Por que**: foundation completa visible para devs futuros.

Seccion incluye:
- Schemas disponibles ahora: 7 schemas (los 4 existentes + Discovery + Learn + Bug)
- State machine learn con transiciones validas
- Variantes de seccion Bug normalizadas
- Antipatron actualizado: "Crear schemas para todos los records" → ahora cubre 6/6 core

### REQ-PRESERVE-01 — HOR-026/041 schemas sin extension

> **Que cambia**: nada. Los 4 schemas existentes intactos.
> **Por que**: cambios a schemas viejos serian breaking changes.

Validacion: `git log commands/lib/schemas/spec-task.ts session-block.ts rule.ts decision.ts` post-HOR-045 cero cambios.

### REQ-PRESERVE-02 — Backward compat 100%

> **Que cambia**: nada disruptivo. Tickets sin Discovery/Learn/Bug schemas siguen flujo v1.
> **Por que**: opt-in mientras estabiliza.

Validacion: HOR-029 (pre-HOR-045) sigue validando sin warnings nuevos.

## Test cases

| # | Caso | REQ | Affects UI | Expected | Actual | Evidence | Status | Session | Cambios |
|---|------|-----|-----------|----------|--------|----------|--------|---------|---------|
| TC-01 | DiscoverySchema valida discovery completo con classification | REQ-IMPROVE-01 | no | exit 0 valid | — | tsx | pending | S1.T1 | — |
| TC-02 | DiscoverySchema rechaza description vacia | REQ-IMPROVE-01 | no | exit 1 error | — | tsx | pending | S1.T1 | — |
| TC-03 | DiscoverySchema `--strict` rechaza missing classification | REQ-IMPROVE-01 | no | exit 1 | — | tsx | pending | S1.T1 | — |
| TC-04 | LearnSchema valida state machine: status=promoted + promoted_to + refined | REQ-IMPROVE-02 | no | exit 0 | — | tsx | pending | S1.T2 | — |
| TC-05 | LearnSchema rechaza status=promoted sin promoted_to | REQ-IMPROVE-02 | no | exit 1 (refine violation) | — | tsx | pending | S1.T2 | — |
| TC-06 | LearnSchema rechaza status=refined sin refined field | REQ-IMPROVE-02 | no | exit 1 | — | tsx | pending | S1.T2 | — |
| TC-07 | BugSchema valida BUG-workflow-teach-close-manual-hor013-001.md horadric | REQ-IMPROVE-03 | no | exit 0 (H3 sample) | — | bash | pending | S1.T3 | — |
| TC-08 | BugSchema rechaza severity invalida | REQ-IMPROVE-03 | no | exit 1 | — | tsx | pending | S1.T3 | — |
| TC-09 | BugSchema normaliza variante seccion (Workaround pre-fix → workaround) | REQ-IMPROVE-03 | no | exit 0 | — | bash | pending | S2.T1 | — |
| TC-10 | `dkc-validate Bug projects/horadric/bugs/workflow/BUG-X.md` exit 0 | REQ-IMPROVE-04 | no | exit 0 | — | bash | pending | S2.T2 | — |
| TC-11 | `dkc-validate Learn HOR-040.md` extrae tabla y valida | REQ-IMPROVE-04 | no | exit 0 con N records | — | bash | pending | S2.T2 | — |
| TC-12 | Dogfood retroactivo horadric: bugs 100%, learns ≥85%, discoveries ≥75% | REQ-IMPROVE-04 | no | majority valid | — | bash | pending | S3.T1 | — |
| TC-13 | Regression: SPEC-026 + HOR-026 + HOR-041 specs sin breaking | REQ-PRESERVE-01 | no | exit 0 todos | — | bash | pending | S3.T2 | — |
| TC-14 | Cero archivos legacy schemas modificados | REQ-PRESERVE-01 | no | git log post-cierre cero cambios en schemas viejos | — | git log | pending | S4.T1 | — |
| TC-15 | `_style.md` Principio 9 contiene Discovery + Learn + Bug | REQ-IMPROVE-05 | no | grep ≥3 matches | — | grep | pending | S3.T3 | — |

## Tasks

### Session 1 — 3 schemas + self-tests (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S1.T1 | Implementar `commands/lib/schemas/discovery.ts` con DiscoverySchema + DiscoveryClassificationEnum. Self-tests TC-01/02/03 | developer | balanced | commands/lib/schemas/discovery.ts | TC-01, TC-02, TC-03 | Schema carga + self-tests pass | git revert | pending | 1 | — |
| S1.T2 | Implementar `commands/lib/schemas/learn.ts` con LearnSchema + state machine via `.refine()`. Self-tests TC-04/05/06 | developer | balanced | commands/lib/schemas/learn.ts | TC-04, TC-05, TC-06 | State machine validada | git revert | pending | 1 | — |
| S1.T3 | Implementar `commands/lib/schemas/bug.ts` con BugSchema + variantes seccion. Self-tests TC-07/08 sobre sample horadric | developer | balanced | commands/lib/schemas/bug.ts | TC-07, TC-08 | Sample horadric pass | git revert | pending | 1 | — |
| S1.GATE | Quality review tier standard. Commit DET-27 `improve(dkc): zod schemas Discovery + Learn + Bug (HOR-045 S1)` | reviewer | balanced | commands/lib/schemas/ | TC-01..08 | Gate continue + commit | git revert | pending | 1 | — |

### Session 2 — Parsers + CLI extension (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S2.T1 | Extender `commands/lib/parsers/markdown.ts` con `parseDiscoveries`, `parseLearns`, `parseBug`. Variantes seccion Bug | developer | balanced | commands/lib/parsers/markdown.ts | TC-09 | Parsers extraen records reales | git revert | pending | 2 | — |
| S2.T2 | Extender `commands/lib/validate.ts` + `commands/dkc-validate` con Discovery/Learn/Bug kinds. CLI dispatch por path | developer | balanced | commands/lib/validate.ts, commands/dkc-validate | TC-10, TC-11 | CLI acepta nuevos kinds | git revert | pending | 2 | — |
| S2.T3 | TCs end-to-end sobre records reales horadric | reviewer | balanced | — | TC-10, TC-11 | TCs pass | — | pending | 2 | — |
| S2.GATE | Quality review tier standard. Commit DET-27 `improve(dkc): parsers + CLI Discovery + Learn + Bug (HOR-045 S2)` | reviewer | balanced | commands/ | TC-09..11 | Gate continue + commit | git revert | pending | 2 | — |

### Session 3 — Dogfood retroactivo + docs (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S3.T1 | Dogfood retroactivo: validar TODA la KB horadric (1 bug + ~30-50 learns + ~50-100 discoveries) | reviewer | balanced | — | TC-12 | Reporte: bugs 100%, learns ≥85%, discoveries ≥75% | — | pending | 3 | — |
| S3.T2 | Regression TC-13 sobre HOR-026/041 specs | reviewer | balanced | — | TC-13 | Sin breaking | — | pending | 3 | — |
| S3.T3 | Extender `prompts/_style.md` Principio 9 con Discovery + Learn + Bug. Cierre del set de 6 schemas core | scribe | fast | prompts/_style.md | TC-15 | Seccion extendida | git revert | pending | 3 | — |
| S3.GATE | Quality review tier exhaustive (dogfood retroactivo). Commit DET-27 `improve(dkc): dogfood retroactivo + Principio 9 (HOR-045 S3)` | reviewer | balanced | commands/, prompts/ | TC-12..15 | Gate continue + commit | git revert | pending | 3 | — |

### Session 4 — (Opcional condicional) Coordinacion HOR-037 + cierre tecnico (T2, gate ⚑ fuerte)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S4.T1 | Si HOR-037 esta activo en este momento: validar que dataset producido es coherente para fine-tuning | reviewer | balanced | — | — | Dataset validation report | — | pending | 4 | condicional segun HOR-037 status |
| S4.T2 | Si HOR-037 NO esta activo: skip esta seccion. Avanzar a S5 close | scribe | fast | — | — | Decision documentada | — | pending | 4 | condicional |
| S4.GATE | Quality review condicional. Commit DET-27 si hay cambios | reviewer | balanced | — | — | Gate continue | — | pending | 4 | — |

### Session 5 — Close + teach-close (T0, gate ⚑ fuerte)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S5.T1 | Summary completo: 3 schemas entregados + state machine learn + dogfood findings + plan adopcion | scribe | fast | tickets/HOR-045.md | TC-14 | Summary completo | — | pending | 5 | — |
| S5.T2 | Decision teach-close (DET-22): generar dado scope arquitectural (3 schemas + state machine) | scribe | fast | tickets/HOR-045.teach/teach-close.md | — | teach-close producido | — | pending | 5 | — |
| S5.T3 | Frontmatter post-close: status closed, executed SP, teachings.close done | scribe | fast | tickets/HOR-045.md | — | Frontmatter coherente | — | pending | 5 | — |
| S5.T4 | Reindex final | reviewer | fast | — | — | Reindex pasa | — | pending | 5 | — |
| S5.GATE | Close final. Commit DET-27 `close(horadric): HOR-045 closed — 6 records core con schemas completos` | scribe | fast | tickets/HOR-045.md | — | Ticket closed | — | pending | 5 | — |

## Constraints

- **DET-1, DET-2** (certeza + source_ref): cada REQ traza al ticket + intake
- **DET-7** (TCs ↔ discovery): 15 TCs trazan a REQ + session
- **DET-8** (rollback): cada task con git revert
- **DET-11 (KB-first)**: schemas habilitan retrieval consistente (foundation completa)
- **DET-20** (sessions con gates): 5 sessions con S{N}.GATE
- **DET-23** (quality review): tier standard S1+S2+S3; exhaustive S3 dogfood; fuerte S4+S5
- **DET-25 (TCs inline)**: implementado por LearnSchema y Bug schema (reproduction como TC implicit)
- **DET-26** (schemas reuso): HOR-026/041 schemas intactos (TC-14)

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `commands/lib/schemas/*` (HOR-026/041) | internal | Patron base. No modificar | bajo |
| `commands/lib/parsers/markdown.ts` (HOR-026/041) | internal | Reuso de `extractSection` con array variantes | bajo |
| `commands/lib/validate.ts` (HOR-026) | internal | Extension aditiva al enum de kinds | bajo |
| `commands/dkc-validate` (bash wrapper) | internal | Extension del usage + help | bajo |
| zod + tsx | external | Ya instalados (HOR-026) | nulo |
| Sample BUG horadric (1 archivo) | internal | Fixture para TC-07/08 (H3 confirmed) | bajo |
| Tabla Learns + Discoveries en tickets HOR-001..043 | internal | Fixtures para dogfood retroactivo | medio (variabilidad legacy) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| H1 refutada (Discovery shape menos estructurado) | media | medio | Schema tolerante (--lenient default); aceptar trade-off de drift |
| Learn state machine rompe legacy | media | medio | Validacion via `.refine()` flexible; warnings legacy; --strict solo nuevos |
| Bug variantes adicionales no contempladas | baja | bajo | Array extensible (HOR-041 pattern) |
| HOR-037 requiere shape diferente | media | medio | Schemas conservadores; ajustar post-HOR-037 si necesita |
| Performance dogfood >5s sobre KB grande | baja | bajo | Lookup SQL si necesario |

## Open questions

(Cerradas en draft via 6 DEC-LOCAL.)

## Decisions (cerradas durante design-draft)

### DEC-LOCAL-01: DiscoverySchema tolerante (`classification` opcional, warning si missing)
- **Contexto**: schema strict vs tolerante
- **Drivers**: tolerancia a variabilidad existente (high) + cero migracion (high)
- **Opcion elegida**: tolerante (--lenient default)
- **Alternativas**: strict (rechazado: invalida ~50-100 discoveries existentes)
- **Consecuencias**: drift posible si LLM ignora warnings

### DEC-LOCAL-02: LearnSchema con state machine via `.refine()`
- **Contexto**: validar transiciones vs solo enum
- **Drivers**: captura flujo correcto (high)
- **Opcion elegida**: state machine validada
- **Alternativas**: solo enum sin transiciones (rechazado: permite status invalidos)
- **Consecuencias**: refine simple ~10 lineas; previene drift en flujo learn

### DEC-LOCAL-03: BugSchema extension del frontmatter actual
- **Contexto**: extender vs redefinir
- **Drivers**: H3 confirmed por sample real horadric
- **Opcion elegida**: extender (incluye campos `detected_in`/`fixed_in` legacy)
- **Alternativas**: redefinir (rechazado: invalida bugs existentes)
- **Consecuencias**: schema con campos legacy

### DEC-LOCAL-04: Avanzar independiente de HOR-037
- **Contexto**: wait por HOR-037 requirements vs avanzar
- **Drivers**: HOR-045 self-sufficient + cero deps en planning
- **Opcion elegida**: avanzar independiente
- **Alternativas**: wait HOR-037 (rechazado: bloquea HOR-045)
- **Consecuencias**: schemas pueden requerir ajuste leve post-HOR-037

### DEC-LOCAL-05: NO migracion retroactiva automatic
- **Contexto**: validar todo el KB historico vs solo nuevos
- **Drivers**: reduce re-trabajo masivo
- **Opcion elegida**: solo nuevos
- **Alternativas**: migracion automatic (rechazado: ~80-150 records historicos)
- **Consecuencias**: drift historico documentado pero no fixed

### DEC-LOCAL-06: Reuso 100% de patron HOR-041
- **Contexto**: nuevo patron vs extension
- **Drivers**: H4 confirmed (extension aditiva); patron probado
- **Opcion elegida**: extension del CLI + parsers existentes
- **Alternativas**: nuevo tool (rechazado: scope creep)
- **Consecuencias**: cero nueva infra

## Acceptance checkpoints (post-activacion)

- [ ] **Funcional**: 15 TCs pass
- [ ] **NFRs**: dogfood retroactivo dentro de tiempo razonable (<10s sobre horadric)
- [ ] **Rules**: DET-11 + DET-25 implementados a traves de schemas
- [ ] **Integration**: CLI extendido (TC-10/11); backward compat preservada (TC-13)
- [ ] **Schemas**: HOR-026/041 sin breaking (TC-14)
- [ ] **Docs**: Principio 9 extendido (TC-15); teach-close producido (DET-22)

## Backlog

(Vacio. Si HOR-037 emerge con requirements adicionales en activacion, agregar items.)

## Follow-ups (post-activacion + close)

- **HOR-046 conditional**: hooks pre-commit + auto-promotion learns
- **HOR-037 desbloqueado**: dataset coherente para fine-tuning
- **HOR-031 mejorado**: embedding indexer puede filtrar por classification (discoveries) + status (learns) + severity (bugs)
- **Discovery sub-IDs** (D1.1, D2.3) — futuro si necesario

## When to activate this spec

| # | Condicion | Como se detecta |
|---|-----------|-----------------|
| C1 | HOR-037 prioriza | Decision en planning |
| C2 | ≥3 incidents drift en discoveries/learns/bugs | Learns con tag `discoveries-drift`/`learns-drift` |
| C3 | Local-only Qwen 30B emerge inconsistencia | HOR-031 S4 pilot |
| C4 | HOR-031 embedding KB reporta retrieval pobre | HOR-031 pilot |

**Si NINGUNA activa**: spec queda `draft`. Texto semi-libre actual es suficiente sin LoRA. Cerrar HOR-045 como `wont_do` si HOR-037 nunca emerge.
