---
id: SPEC-workflow-cross-record-relations-43
project: horadric
ticket: HOR-043
status: draft
---

# Cross-record relations validation (DKC v2 Phase 4 conditional)

# Cross-record relations validation (DKC v2 Phase 4 conditional)

> **STATUS: draft** — Esta spec NO se ejecuta hasta que C1-C4 (en HOR-043) se cumplan. Es blueprint listo para activacion. Cuando se active: re-clasificar work_type explore → improvement, mover status `draft` → `in_progress`.

## Executive summary — lo que estas aprobando (post-activacion)

> *Lectura de 60s. Aprobacion = activacion del spec.*

### Que se quiere

Implementacion programatica de **DET-16 propagacion** ("si esto cambio, donde mas deberia verse reflejado?"). Hoy DET-16 es manual + olvidable; el validator detecta broken/stale references entre records DKC automatic.

**Cobertura inicial**: spec + ticket + rule + decision (Bug + Learn quedan en HOR-045 conditional). 10 tipos de relaciones cross-record catalogadas (R1-R10 — ver `tickets/HOR-043.draft/data-model.md`).

**Solucion**: comando `commands/dkc-validate-relations {project}` + flag opcional `--check-relations` en `dkc-write` (HOR-042 pipeline). Reuso 100% del `index.db` existente (cero nuevo store).

### Decisiones criticas (DEC-LOCAL — cerradas en draft)

| # | Decision | Por que |
|---|----------|---------|
| 1 | **CLI standalone** `dkc-validate-relations` (no extension de dkc-validate) | Separacion clara responsabilidades; ejecucion independiente |
| 2 | **Lookup contra index.db existente** | Reuso 100% infra; cero migracion de datos |
| 3 | **Default warning, `--strict` bloqueante** | Tolerancia a false-positives mientras estabiliza |
| 4 | **NO migracion retroactiva automatic** | Cero re-trabajo masivo; broken refs historicos documentados sin fix |
| 5 | **Frontmatter solamente (no body parsing)** | H1 inferred OK: relaciones inferibles de campos conocidos. Body parsing seria scope creep |
| 6 | **Pre-write opt-in via flag** `--check-relations` en `dkc-write` | Integracion con HOR-042 pipeline atomic |

### Riesgos

- **H1 refutada (relaciones en body, no frontmatter)**: si emergiera, scope 2x. Mitigacion: validar empirico en S1 antes de avanzar — si refuta, abandonar approach o ampliar scope con justificacion
- **Falsos positivos** por records archivados validos: severity matrix conservadora (default warning, no error)
- **Performance >2s en proyectos grandes**: lookup SQL O(log n) por record. Si KB crece >1000 records, cachear

### Que NO se hace

- NO migracion retroactiva automatic
- NO body parsing (solo frontmatter)
- NO templates Rule + Decision relations (Bug + Learn quedan en HOR-045 conditional)
- NO breaking changes en flujo v1
- NO hooks git pre-commit (HOR-046 conditional)
- NO auto-fix de broken references

### Tamano

4 sessions execute + 1 close = 5 sessions. SP estimated: **5**. Tiempo: ~5-7h efectivas (similar a HOR-042 scope).

### Como vas a saber que funciona

- TC-01..05: detectar broken/stale refs en samples sinteticos
- TC-06: integracion `dkc-write --check-relations` bloquea broken refs
- TC-07: dogfood retroactivo horadric (issues conocidos esperados)
- TC-08: performance <2s en 72 records horadric

---

## Purpose

Cerrar el 20% del dolor cross-record drift que HOR-040/041/042 no cubre. Implementacion programatica + integracion opcional en gates. **Solo activar si emerge dolor diario (C1-C4)** — sin condition, queda como draft.

## Requirements

### REQ-IMPROVE-01 — Comando `commands/dkc-validate-relations`

> **Que cambia**: nuevo comando ejecutable que recibe un proyecto + opciones, recolecta relaciones cross-record desde frontmatter de spec/ticket/rule/decision, lookups contra `index.db`, reporta broken/stale/info issues.
> **Por que**: implementacion programatica de DET-16. Sin tool, propagacion sigue manual + olvidable.

El validator MUST:
- Aceptar `project` (required) + `--record/--kind/--strict/--severity/--config/--json/--dry-run` opcionales
- Reusar `index.db` del proyecto (sin nuevo store)
- Aplicar 10 reglas R1-R10 (ver `data-model.md` del draft) segun kind del record
- Output JSON estructurado (--json) o tabla legible (default)
- Exit codes: 0 valid o info-only, 1 errors, 2 warnings, 3 error tecnico
- Soporte para severity matrix configurable via `--config .dkc-relations-config.yaml`

### REQ-IMPROVE-02 — Flag `--check-relations` en `dkc-write` (integracion con HOR-042)

> **Que cambia**: extension de `commands/dkc-write` para aceptar `--check-relations`. Si el JSON nuevo introduce broken refs con severity bloqueante, exit 1 sin escribir output.
> **Por que**: pipeline write→validate→**+relations**→commit. Cero broken refs nuevas introducidas.

El flag MUST:
- Recolectar relaciones cross-record del JSON pre-escritura
- Lookup contra `index.db`
- Si broken con severity bloqueante: exit 1, JSON errors a stderr, output NO escrito
- Si warning: continuar, output escrito, warnings a stderr

### REQ-IMPROVE-03 — Integracion en 4 gates DKC (opt-in via frontmatter `validate_relations: true`)

> **Que cambia**: 4 gates de DKC invocan validate-relations si flag activo: pre-design, post-task execute, **pre-close (bloqueante)**, futuro pre-commit hook (HOR-046).
> **Por que**: sin integracion, tool existe pero no se usa. Patron analogo a HOR-026/042 opt-in.

Gates a editar:
- `_design-shared.md` (warning, skip si records aun no existen)
- `request-execute.md` D post-task (warning)
- **`request-close.md` A2 pre-close (error con --strict)**
- HOR-046 conditional: hook git pre-commit

### REQ-PRESERVE-01 — Backward compat 100% (tickets sin flag)

> **Que cambia**: nada disruptivo. Tickets sin `validate_relations: true` siguen flujo v1.
> **Por que**: opt-in obligatorio mientras estabiliza, como HOR-042.

Validacion: HOR-029 (cerrado pre-HOR-043) sigue validando sin warnings nuevos en gates.

### REQ-PRESERVE-02 — Schemas zod sin extension

> **Que cambia**: nada. Reuso 100% de SpecTask/SessionBlock/Rule/Decision schemas.
> **Por que**: si extiendes schemas, drift entre validation post-write y validation pre-write con relations.

Validacion: `git log commands/lib/schemas/` post-HOR-043 cero cambios.

## Test cases

| # | Caso | REQ | Affects UI | Expected | Actual | Evidence | Status | Session | Cambios |
|---|------|-----|-----------|----------|--------|----------|--------|---------|---------|
| TC-01 | Spec con task.session=99 que el ticket nunca tuvo `### Session 99` | REQ-IMPROVE-01 | no | Exit 1, error R1 | — | bash test | pending | S1.T3 | — |
| TC-02 | Ticket con `**Tasks completadas**:` referenciando S99.T99 no existente | REQ-IMPROVE-01 | no | Exit 1, error R2 | — | bash test | pending | S1.T3 | — |
| TC-03 | Decision con superseded_by apuntando a DEC archived | REQ-IMPROVE-01 | no | Exit 1, error R7 | — | bash test | pending | S1.T3 | — |
| TC-04 | Ticket con DET-99 no existente en deterministic-rules | REQ-IMPROVE-01 | no | Exit 1, error R8 | — | bash test | pending | S2.T1 | — |
| TC-05 | Spec con REQ sin task que lo cubra | REQ-IMPROVE-01 | no | Exit 2, warning R9 | — | bash test | pending | S2.T1 | — |
| TC-06 | `dkc-write SessionBlock --check-relations` con session referenciando S99.T99 | REQ-IMPROVE-02 | no | Exit 1, output NO escrito | — | bash test | pending | S2.T2 | — |
| TC-07 | Dogfood retroactivo sobre horadric KB completo | REQ-IMPROVE-01 | no | Reportar issues historicos esperados (decisions con superseded_by chain rota, etc.) | — | bash test | pending | S3.T1 | — |
| TC-08 | Performance: validate-relations sobre horadric (72 records) | REQ-IMPROVE-01 | no | <2s total | — | time + benchmark | pending | S3.T2 | — |
| TC-09 | Grep `validate_relations` en gates editados | REQ-IMPROVE-03 | no | >=3 matches en distintos archivos | — | grep | pending | S2.T3 | — |
| TC-10 | Regression HOR-029 (pre-HOR-043) sin warnings nuevos | REQ-PRESERVE-01 | no | Validate-relations sobre HOR-029 sin errors nuevos (warnings esperados de relaciones historicas) | — | bash test | pending | S3.T2 | — |
| TC-11 | Cero archivos nuevos en `commands/lib/schemas/` | REQ-PRESERVE-02 | no | git log post-cierre cero cambios | — | git log | pending | S4.T1 | — |

## Tasks

### Session 1 — Inventario + comando standalone (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S1.T1 | Inventario de relaciones cross-record en KB existente. Confirmar H1 (todas inferibles de frontmatter, no body) | researcher | balanced | (validacion) | — | Reporte de inventario en session log, H1 confirmed o refuted | — | pending | 1 | — |
| S1.T2 | Implementar `commands/lib/relations.ts` con recolector + lookup. Reuso de `commands/lib/parsers/markdown.ts` para parsear records existentes | developer | balanced | commands/lib/relations.ts | — | Modulo expone `validateRelations({project, options})` | git revert | pending | 1 | — |
| S1.T3 | Self-tests inline para R1, R2, R7 (las 3 bloqueantes por default). Wrapper bash `commands/dkc-validate-relations` | developer | balanced | commands/dkc-validate-relations | TC-01, TC-02, TC-03 | TCs pass | git revert | pending | 1 | — |
| S1.GATE | Quality review tier standard. H1 confirmed/refuted documentado. Commit DET-27 `improve(dkc): comando dkc-validate-relations + tests R1/R2/R7 (HOR-043 S1)` | reviewer | balanced | commands/ | TC-01..03 | Gate decision continue + commit | git revert | pending | 1 | — |

### Session 2 — Reglas R4-R10 + integracion con dkc-write (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S2.T1 | Implementar R4-R10 + severity matrix. TCs verificacion | developer | balanced | commands/lib/relations.ts | TC-04, TC-05 | Reglas R4-R10 implementadas + tests pass | git revert | pending | 2 | — |
| S2.T2 | Integrar flag `--check-relations` en `commands/dkc-write` (HOR-042) | developer | balanced | commands/lib/dkc-write.ts | TC-06 | Pipeline pre-write con check-relations funciona | git revert | pending | 2 | — |
| S2.T3 | Editar 3 gates (`_design-shared.md`, `request-execute.md`, `request-close.md`) con sub-secciones opt-in via `validate_relations: true` | developer | balanced | prompts/steps/*.md | TC-09 | 3 gates editados, grep verifica | git revert | pending | 2 | — |
| S2.T4 | Documentar Principio 11 en `_style.md`: DET-16 implementacion programatica, opt-in pattern, severity matrix | scribe | fast | prompts/_style.md | — | Seccion Principio 11 completa | git revert | pending | 2 | — |
| S2.GATE | Quality review tier standard. Commit DET-27 `improve(dkc): reglas R4-R10 + integracion 3 gates + Principio 11 (HOR-043 S2)` | reviewer | balanced | commands/, prompts/ | TC-04..09 | Gate decision continue + commit | git revert | pending | 2 | — |

### Session 3 — Dogfood retroactivo + benchmark + regression (T2, gate auto)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S3.T1 | Dogfood retroactivo: `dkc-validate-relations horadric` sobre 72 records. Documentar issues historicos en session log | reviewer | balanced | (validacion) | TC-07 | Reporte completo de issues | — | pending | 3 | — |
| S3.T2 | Benchmark performance + TC-10 regression sobre HOR-029 | reviewer | balanced | (validacion) | TC-08, TC-10 | Performance OK <2s, HOR-029 sin warnings nuevos | — | pending | 3 | — |
| S3.T3 | Decision con dev: ¿fixear broken refs historicos retroactivamente o aceptar como documented? Documentar resolucion en spec | architect | balanced | (decision) | — | DEC-LOCAL-07 documentada | — | pending | 3 | — |
| S3.GATE | Quality review tier exhaustive (dogfood retroactivo es validacion empirica). Commit DET-27 `improve(dkc): dogfood retroactivo + benchmark + regression (HOR-043 S3)` | reviewer | balanced | commands/ | TC-07..10 | Gate decision continue + commit | git revert | pending | 3 | — |

### Session 4 — Close + teach-close + plan adopcion (T0, gate ⚑ fuerte)

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S4.T1 | Summary completo: que se entrego, H1-H4 confirmadas/refutadas, learns, plan adopcion. TC-11 verifica cero archivos schema nuevos | scribe | fast | tickets/HOR-043.md | TC-11 | Summary completo | — | pending | 4 | — |
| S4.T2 | Decision teach-close (DET-22): generar teach-close dado scope arquitectural (validation cross-record es concepto reusable) | scribe | fast | tickets/HOR-043.teach/teach-close.md | — | teach-close.md producido | — | pending | 4 | — |
| S4.T3 | Frontmatter post-close: status: closed, executed SP, teachings.close: done | scribe | fast | tickets/HOR-043.md | — | Frontmatter coherente | — | pending | 4 | — |
| S4.T4 | Reindex final + verificacion gate viewer (sin regresion) | reviewer | fast | — | — | Reindex pasa | — | pending | 4 | — |
| S4.GATE | Close final. Commit DET-27 `close(horadric): HOR-043 closed — cross-record relations validation operacional` | scribe | fast | tickets/HOR-043.md | — | Ticket closed | — | pending | 4 | — |

## Constraints

- **DET-1, DET-2** (certeza + source_ref): cada REQ traza al ticket/draft
- **DET-7** (test cases ↔ discovery): 11 TCs trazan a REQ + session
- **DET-8** (rollback): cada task con git revert
- **DET-11** (KB-first): reuso de schemas + index.db existentes
- **DET-16 (propagacion)**: este spec implementa DET-16 programaticamente
- **DET-20** (sessions con gates): 4 sessions con S{N}.GATE
- **DET-23** (quality review): tier standard S1+S2; exhaustive S3 (dogfood); fuerte S4
- **DET-25** (TCs inline): columna Session poblada

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `commands/lib/schemas/*` (HOR-026/041) | internal | Reuso para inferir shape de relaciones | bajo |
| `commands/lib/parsers/markdown.ts` (HOR-026/041) | internal | Reuso para parsear records | bajo |
| `commands/lib/dkc-write.ts` (HOR-042) | internal | Extension con `--check-relations` | bajo |
| `index.db` (commands/dkc-reindex) | internal | Lookup de records y relaciones | bajo |
| zod + tsx + handlebars | external | Ya instalados (HOR-026/042) | nulo |

## Risks and mitigations

(Replicado del draft `relations-spec.md` Riesgos pre-implementacion + agregado de mitigaciones empiricas)

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| H1 refutada (relaciones en body) | baja | alto | Validar empirico en S1.T1 antes de implementar; si refuta, abandonar o ampliar scope con justificacion |
| Falsos positivos | media | medio | Severity matrix conservadora default warning |
| Performance >2s | baja | bajo | Lookup SQL O(log n); cache si KB crece >1000 records |
| Pipeline rompe steps existentes con --check-relations | baja | medio | Opt-in via flag; activacion gradual |

## Open questions

(Cerradas en draft via 6 DEC-LOCAL. Cuando se active spec, esta seccion queda vacia.)

## Decisions (cerradas durante design-draft)

### DEC-LOCAL-01: CLI standalone `dkc-validate-relations`
- **Contexto**: separar del dkc-validate (HOR-026) vs extender
- **Drivers**: separacion clara responsabilidades + ejecucion independiente
- **Opcion elegida**: standalone
- **Alternativas**: extension `dkc-validate Relations` (rechazado: mezcla concerns)
- **Consecuencias**: 1 comando mas; mas focused
- **Session**: design-draft (S2 explore)

### DEC-LOCAL-02: Lookup contra `index.db` existente
- **Contexto**: nuevo store dedicado vs reuso
- **Drivers**: reuso 100% (high) + cero migracion (high)
- **Opcion elegida**: reuso `index.db`
- **Alternativas**: nuevo `relations.sqlite` (rechazado: 2 stores a mantener)
- **Consecuencias**: schema del index.db puede sentirse complejo si crece
- **Session**: design-draft

### DEC-LOCAL-03: Default warning, `--strict` para bloqueante
- **Contexto**: bloqueante por default vs warning
- **Drivers**: tolerancia false-positives + reversibilidad
- **Opcion elegida**: default warning
- **Alternativas**: default bloqueante (rechazado: false-positives frenan adopcion)
- **Consecuencias**: dev decide cuando promover a bloqueante via flag
- **Session**: design-draft

### DEC-LOCAL-04: NO migracion retroactiva automatic
- **Contexto**: validar todo el KB historico vs solo nuevos
- **Drivers**: reduce re-trabajo masivo
- **Opcion elegida**: NO migracion automatic. Dev decide caso por caso post-dogfood
- **Alternativas**: migracion automatic (rechazado: 5+ tickets historicos pueden tener broken refs)
- **Consecuencias**: KB historico queda con drift documentado pero no fixed
- **Session**: design-draft

### DEC-LOCAL-05: Frontmatter solamente (no body parsing)
- **Contexto**: parsear referencias en texto libre del body
- **Drivers**: H1 inferred OK + cero scope creep
- **Opcion elegida**: solo frontmatter
- **Alternativas**: parsear body (rechazado: scope 2x)
- **Consecuencias**: relaciones en body (raras) no detectadas. Documentar en _style.md
- **Session**: design-draft

### DEC-LOCAL-06: Pre-write opt-in via flag `--check-relations` en dkc-write
- **Contexto**: integracion con HOR-042 pipeline pre-write
- **Drivers**: atomic write+validate; reuso de pipeline existente
- **Opcion elegida**: flag opt-in
- **Alternativas**: mandatory check (rechazado: pipeline mas lento por default)
- **Consecuencias**: opt-in conocido (HOR-042 patron)
- **Session**: design-draft

## Acceptance checkpoints (post-activacion)

- [ ] **Funcional**: 11 TCs pass
- [ ] **Tests**: dogfood retroactivo horadric reporta issues conocidos
- [ ] **NFRs**: TC-08 performance <2s en 72 records
- [ ] **Rules**: DET-16 implementado programaticamente
- [ ] **Integration**: 3 gates editados (TC-09); backward compat preservada (TC-10)
- [ ] **Schemas**: cero archivos nuevos en `commands/lib/schemas/` (TC-11)
- [ ] **Docs**: Principio 11 en `_style.md`; teach-close.md producido (DET-22)

## Backlog

(Vacio. Si emergen broken refs criticos en dogfood retroactivo, agregar items aqui o spawn tickets nuevos.)

## Follow-ups (post-activacion + close)

- **HOR-046 conditional**: hook git pre-commit que invoca validate-relations
- **HOR-045 conditional**: extender a Bug + Learn relations (post-Bug/Learn schemas)
- **Merge con HOR-028**: si entity tracking se prioriza junto, merge probable
- **Auto-fix tool** (futuro): `dkc-fix-relations` para fix automatic de broken refs comunes (out of scope HOR-043)
- **Default → mandatory**: post-stabilizacion (2+ sprints), cambiar default `validate_relations` a true

## When to activate this spec

Replicado de `tickets/HOR-043.md` para visibilidad:

| # | Condicion | Como se detecta |
|---|-----------|-----------------|
| C1 | ≥3 incidentes broken refs en proximos 3-5 tickets post-HOR-042 | Learns con tag `cross-record-drift` |
| C2 | HOR-028 priorizado | Decision en planning |
| C3 | Dolor recurrente reportado | Learns con frecuencia ≥2 |
| C4 | HOR-037 LoRA prioriza coherencia cross-record | Decision en HOR-037 |

**Si NINGUNA condicion activa**: spec queda `draft` indefinido. Si HOR-042 cubre suficiente: cerrar HOR-043 como `wont_do`.
