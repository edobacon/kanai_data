---
id: SPEC-workflow-reconcile-decisions-119
project: horadric
ticket: HOR-119
status: done
---

# Reconciliación de contradicción/supersesión entre decisions (decisions-first)

# Reconciliación de contradicción/supersesión entre decisions (decisions-first)

## Executive summary — lo que estas aprobando

**Que se quiere**: detectar cuándo una decision nueva **contradice o deja obsoleta** a una existente (inspirado en `mem_judge`/`conflicts scan` de engram). DKC acumula decisions sin reconciliar; esto cierra el gap *reconciliador* que DET-16 (propagación, aditivo) no cubre. Corte mínimo: **solo decisions** (ya soportan supersesión sin cambio de schema).

**Decisiones críticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Arquitectura split** (DEC-LOCAL-01, de H6): el tool Python solo hace *retrieval* de candidatos; la *adjudicación* dual-judge vive en un step LLM | `dkc_create_record` es Python síncrono; el dual-judge lo orquesta el LLM (`dkc_invoke_agent` no spawnea). No se puede meter el juez dentro del tool |
| 2 | Trigger **advisory/warn-first**, no bloquea la creación de la decision | reconciliación es señal, no gate; falso positivo no debe frenar el flujo |
| 3 | Confirmar supersesión **solo si ambos jueces coinciden** (DET-35) | evita marcar superseded por solapamiento léxico espurio |
| 4 | Rules **fuera de alcance** (no tienen `status`) → follow-up | mismo costo de schema diferido; decisions-first prueba el valor primero |

**Riesgos y mitigación**:
- **Falso positivo del juez** → umbral de similaridad alto antes de invocar + confirmación dual + warn-first (no borra, marca `superseded` reversible por git).
- **Costo (2 jueces por decision creada)** → solo se dispara si hay candidato sobre umbral; el retrieval (barato) filtra primero.
- **S2/S3 son orquestación LLM** (prompt + step) difíciles de unit-testar → validación demostrativa con fixture de 2 decisions en conflicto.

**Que NO se hace**: rules (follow-up), bugs, scan batch retroactivo de todo el KB (engram `conflicts scan` completo — follow-up), UI nueva (HC ya renderea status/relations).

**Tamaño estimado**: 3 sessions, ~5-7h. La más riesgosa es S2 (prompt de juez + step de orquestación).

**Como vas a saber que funciona**: creo DEC-B que contradice a DEC-A existente → el flujo detecta el candidato, los dos jueces coinciden en "supersedes", y DEC-A queda `status: superseded` + `superseded_by: DEC-B` + relación SUPERSEDES, sin borrarse.

---

## Purpose

Mecanismo de reconciliación decisions-first: un tool Python de retrieval (`dkc_find_supersede_candidates`) que devuelve decisions semánticamente cercanas, + un step LLM (`reconcile-decision`) que orquesta el dual-judge (DET-35) sobre esos candidatos con un prompt de juez-adjudicador nuevo, y aplica el efecto (marcar superseded + relación SUPERSEDES) solo si ambos jueces confirman. Arquitectura split retrieval/adjudicación impuesta por H6 (el tool Python no puede orquestar el dual-judge).

## Requirements

### REQ-01: Retrieval de candidatos de supersesión (Python)

> **Que cambia**: un tool nuevo devuelve, dada una decision (texto o id), las decisions existentes semánticamente cercanas por encima de un umbral — la materia prima para que el LLM las adjudique.
> **Por que**: el dual-judge es caro; primero hay que filtrar baratamente qué pares vale la pena juzgar.

El sistema MUST exponer `dkc_find_supersede_candidates(project, text|decision_id, threshold, top_k)` que reusa `dkc_semantic_search` con `scope={kind: decision}` y devuelve los candidatos sobre umbral (excluyendo la propia decision), sin invocar ningún LLM ni mutar nada.

**Actor**: system (MCP tool / CLI)
**Layers**: backend (Python)

<details><summary>Scenarios de validacion</summary>

#### Scenario: hay candidato cercano
- **GIVEN** DEC-A existe sobre el tema X
- **WHEN** se pide candidatos para una decision nueva sobre X
- **THEN** DEC-A aparece en los candidatos con su score ≥ umbral

#### Scenario: sin candidato cercano
- **GIVEN** ninguna decision sobre el tema
- **WHEN** se piden candidatos
- **THEN** retorna lista vacía (no error)

#### Scenario: read-only
- **GIVEN** estado del KB
- **WHEN** corre el retrieval
- **THEN** no se escribe markdown ni index
</details>

### REQ-02: Adjudicación dual-judge (step LLM)

> **Que cambia**: un step orquesta dos jueces ciegos que dictaminan, por cada par (nueva, candidata), si la nueva `supersedes`/`conflicts`/`independent` respecto a la candidata; solo cuenta si ambos coinciden.
> **Por que**: el reviewer de calidad (10 dimensiones de código) no sirve para adjudicar contradicción semántica entre decisiones.

El sistema MUST proveer un prompt de juez-adjudicador nuevo + un step `reconcile-decision` que, sobre los candidatos de REQ-01, orqueste el dual-judge (DET-35: dos jueces en paralelo vía `dkc_invoke_agent` + fence, kb_refs DET-34, confirmar solo si coinciden; contradicción → suspect/escalate).

**Actor**: system (orquestación LLM)
**Layers**: meta (prompts/steps)

<details><summary>Scenarios de validacion</summary>

#### Scenario: ambos jueces coinciden supersedes
- **GIVEN** par (DEC-B nueva, DEC-A candidata) genuinamente contradictorio
- **WHEN** corre el dual-judge
- **THEN** veredicto confirmado = supersedes

#### Scenario: jueces en desacuerdo
- **GIVEN** par ambiguo
- **WHEN** corre el dual-judge
- **THEN** queda suspect/escalate, NO se confirma supersesión
</details>

### REQ-03: Efecto de supersesión confirmada

> **Que cambia**: cuando se confirma que DEC-B supera a DEC-A, DEC-A queda marcada `superseded` + `superseded_by: DEC-B` + relación SUPERSEDES, sin borrarse.
> **Por que**: cierra el ciclo reconciliador preservando el historial (DET-6 inmutabilidad).

El sistema MUST, ante supersesión confirmada, setear en la decision superada `status: superseded` + `superseded_by: {DEC-nueva}` y crear la relación `SUPERSEDES` (`dkc_add_relation`), sin eliminar la decision. Reusa schema existente (cero migración).

**Actor**: system
**Layers**: backend, meta

<details><summary>Scenarios de validacion</summary>

#### Scenario: marca y preserva
- **GIVEN** supersesión confirmada DEC-B→DEC-A
- **WHEN** se aplica el efecto
- **THEN** DEC-A.status=superseded, DEC-A.superseded_by=DEC-B, relación SUPERSEDES en tabla `relations`, DEC-A sigue existiendo
</details>

### REQ-04: Integración warn-first en el flujo de creación

> **Que cambia**: al crear una decision (DEC formal), el flujo corre la reconciliación como paso advisory que no bloquea.
> **Por que**: reconciliación es señal, no gate; un falso positivo no debe frenar la creación.

El sistema SHOULD invocar `reconcile-decision` tras crear una DEC formal (en el path de decision-creation de task-loop / promoción de learn), warn-first: reporta candidatos/supersesión sugerida pero NO bloquea el flujo.

**Actor**: system
**Layers**: meta

## Tasks

### Session 1 — Retrieval de candidatos (Python) [tipo: auto] [tier: T2]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Implementar `find_supersede_candidates` (reusa semantic search, scope=decision, filtra score ≥ umbral, excluye self) | REQ-01 | developer | — | `server/src/deckard_cain/tools/embeddings.py` | pytest: candidato cercano→aparece, sin candidato→vacío | git revert | DET-11, DET-32 | done | 1 |
| S1.T2 | Exponer como MCP tool `dkc_find_supersede_candidates` + registrar en el server | REQ-01 | developer | S1.T1 | `server/src/deckard_cain/tools/embeddings.py`, `server/src/deckard_cain/server.py` | tool invocable; read-only | git revert | RULE-workflow-catalog-executor-pattern-005 | done | 1 |
| S1.T3 | pytest `test_find_supersede_candidates` (fixture: 2 decisions mismo tema) | REQ-01 | developer | S1.T2 | `server/tests/test_supersede_candidates.py` | pytest verde | git revert | DET-7, DET-13 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T2) | — | reviewer | S1.T3 | `projects/horadric/tickets/HOR-119.md` | gate persistido + quality review DET-23 | n/a | DET-20, DET-23, DET-35 | done | 1 |

### Session 2 — Juez-adjudicador + step de reconciliación (LLM) [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Prompt de juez-adjudicador de contradicción (supersedes/conflicts/independent; handoff = par de decisions + kb_refs) | REQ-02 | developer | S1.GATE | `prompts/agents/judge-reconcile.md` | prompt completo con schema de veredicto | git revert | DET-34, DET-35 | done | 2 |
| S2.T2 | Step `reconcile-decision` que orquesta el dual-judge sobre candidatos (paralelo, confirmar si coinciden, record-decision) | REQ-02 | developer | S2.T1 | `prompts/steps/reconcile-decision.md` | dry-run conceptual sobre fixture | git revert | DET-35, DET-9, DET-33 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T2) — ⚑ fuerte | — | reviewer | S2.T2 | `projects/horadric/tickets/HOR-119.md` | gate + quality review | n/a | DET-20, DET-23, DET-35 | done | 2 |

### Session 3 — Efecto + integración + validación [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Aplicar efecto: marcar superseded + superseded_by + relación SUPERSEDES (reusa dkc_add_relation + edición frontmatter) | REQ-03 | developer | S2.GATE | `prompts/steps/reconcile-decision.md`, `server/src/deckard_cain/tools/mechanical.py` | fixture: DEC-A queda superseded + relación; no borrada | git revert + restaurar DEC-A | DET-6, DET-16 | done | 3 |
| S3.T2 | Wire warn-first en el path de creación de DEC formal (task-loop / promoción de learn) | REQ-04 | developer | S3.T1 | `prompts/steps/request-execute/task-loop.md` | no bloquea creación; reporta sugerencia | git revert | DET-16 | done | 3 |
| S3.T3 | Validación end-to-end fixture (DEC-B supera DEC-A) + doc `docs/dkc-reconcile.md` | REQ-03, REQ-04 | developer | S3.T2 | `docs/dkc-reconcile.md` | demo fixture documentada; pytest retrieval verde | git revert | DET-13 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier T3) — ⚑ fuerte | — | reviewer | S3.T3 | `projects/horadric/tickets/HOR-119.md` | gate + quality review + acceptance | n/a | DET-13, DET-20, DET-23, DET-35 | done | 3 |

## Technical reference

- **Dedup existente a extender (retrieval)**: `dkc_create_record` topic_key dedup en `server/src/deckard_cain/tools/mechanical.py:71-81`.
- **Semantic search (retrieval base)**: `dkc_semantic_search(query, scope={kind:'decision'}, score_threshold)` en `tools/embeddings.py`.
- **Relación + schema**: `RelationType.SUPERSEDES` (`models/relation.py:7-15`), `dkc_add_relation` (`tools/write.py:128-149`), tabla `relations` (`templates/schema.sql:50-68`).
- **Schema decision**: `status: superseded` + `superseded_by` (`templates/records/decision.md`, `models/record.py:22-39`).
- **Dual-judge a reusar (orquestación)**: `prompts/steps/request-execute/session-gate.md:242-274` + `dkc_invoke_agent` (`tools/enforcement.py:256-319`, NO spawnea — confirma H6).
- **pytest**: `server/tests/` (ej. `test_next_id_ticket_prefix.py`), pyproject en `server/`.

## Constraints

- RULE-workflow-catalog-executor-pattern-005: tools/comandos siguen el patrón.
- DET-6: la decision superada NO se borra (status + relación, no delete).
- DET-35: confirmar solo si ambos jueces coinciden; contradicción → escalate.
- DEC-LOCAL-01 (arquitectura split): el tool Python NO orquesta el dual-judge.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Falso positivo del juez marca superseded espurio | medium | decision viva marcada obsoleta | umbral alto + confirmación dual + warn-first + reversible (git) |
| Costo de 2 jueces por decision | medium | latencia/tokens | solo si candidato sobre umbral; retrieval filtra primero |
| S2/S3 orquestación difícil de testear | high | cobertura débil | validación demostrativa con fixture + dry-run conceptual |
| Acoplar al path de creación rompe el flujo | low | creación de decision se traba | warn-first, no bloqueante (REQ-04) |

## Open questions

- ¿El wire de REQ-04 va en task-loop (decision-creation) o también en `dkc-learn` (promoción de learn a DEC)? — se resuelve en S3.T2 según dónde se crean DEC formales.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Arquitectura split retrieval (Python) / adjudicación (LLM)
- **Contexto**: el diseño de intake proponía extender el hook de dedup en `dkc_create_record` para correr el dual-judge
- **Drivers**: H6 — `dkc_create_record` es Python síncrono; `dkc_invoke_agent` NO spawnea (retorna instrucciones para que el LLM orqueste). Un tool Python no puede correr el dual-judge
- **Opción elegida**: Python solo *retrieval* (`dkc_find_supersede_candidates`); la *adjudicación* dual-judge en un step LLM `reconcile-decision`
- **Alternativas**: meter el juez en el tool (imposible por arquitectura); hacer todo inline en el LLM sin tool (descartado — el retrieval semántico vive mejor en Python reusando el índice)
- **Consecuencias**: 2 piezas (tool + step) en vez de 1 hook; alineado con cómo DET-35 ya funciona
- **Session**: design

### DEC-LOCAL-02: Trigger advisory warn-first, no bloqueante
- **Contexto**: ¿la reconciliación bloquea la creación de la decision?
- **Drivers**: reconciliación es señal; falso positivo no debe frenar el flujo; consistente con DEC-LOCAL-05 de HOR-118 (doctor advisory)
- **Opción elegida**: warn-first — reporta supersesión sugerida, no bloquea
- **Alternativas**: bloqueante (descartado — friction + riesgo de falso positivo)
- **Consecuencias**: el dev/LLM revisa la sugerencia; la marca se aplica solo con confirmación dual
- **Session**: design

### DEC-LOCAL-03: Retrieval decision-scoped exhaustivo (no KNN global)
- **Contexto**: el diseño decía "reusa `dkc_semantic_search`" (KNN global top-k + filtro kind=decision post-hoc). El dual-judge de S1.GATE confirmó que eso produce falso negativo silencioso
- **Drivers**: las decisions son ~1.6% del corpus (30 de 1831 chunks en horadric); un KNN global top-25 se satura de chunks spec/rule del mismo tema → las decisions reales no entran al pool → `{candidates: [], warning: None}` indistinguible de "no hay similar". Empeora al crecer el KB
- **Opción elegida**: `find_supersede_candidates` trae TODOS los chunks `kind=decision` (join `chunks`×`vec_chunks`) + su embedding y rankea por L2 en Python. Exacto, cero falso negativo. No usa `_semantic_search` → blast radius contenido (no afecta a `dkc_semantic_search`)
- **Alternativas**: subir el factor de over-fetch (frágil, sigue probabilístico); KNN partitioned por kind en sqlite-vec (correcto pero prematuro — YAGNI al volumen actual)
- **Consecuencias**: costo O(n_decision_chunks), trivial hoy; migrar a KNN-partitioned si las decisions crecen a miles de chunks. Reusa índice + modelo (DET-11/DET-32), no el KNN
- **Session**: S1.GATE (dual-judge)

## Acceptance checkpoints

- [x] **Funcional**: fixture DEC-B supera DEC-A → DEC-A superseded + superseded_by + relación SUPERSEDES, no borrada (`test_mark_superseded.py`)
- [x] **Tests**: pytest verde — suite 87 passed (retrieval 17 + efecto 8 + baseline 62)
- [x] **REQ-02**: prompt de juez (`judge-reconcile.md`) + step (`reconcile-decision.md`) escritos; dual-judge confirma solo si coinciden
- [x] **Rules**: DET-6 (no delete — verificado por jueces), DET-35 (dual en los 3 gates), patrón catalog/executor (tool delega a fn pura)
- [x] **Integration**: warn-first wired en task-loop, no bloquea creación de decision
- [x] **Scope**: rules fuera (follow-up B1); sin cambio de schema (reusa status/superseded_by/SUPERSEDES)

## Archiving

`/dkc-archive-spec SPEC-workflow-reconcile-decisions-119 "razon"` cuando deje de ser fuente de verdad.
