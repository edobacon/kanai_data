---
id: SPEC-workflow-necessity-reuse-gate-111
project: horadric
ticket: HOR-111
status: done
---

# DET-32 — Gate de necesidad/reuso antes de construir (cascada YAGNI)

# DET-32 — Gate de necesidad/reuso antes de construir (cascada YAGNI)

## Executive summary — lo que estas aprobando

**Que se quiere**: DKC decide que pasa a tasks midiendo un solo eje — certeza/procedencia (DET-1/2/4/5: "¿es cierto que se pide y de donde viene?"). Falta el eje ortogonal de **necesidad/reuso**: "¿hace falta construirlo, o ya existe / se resuelve mas barato?". Un REQ puede ser `confirmed` con `source_ref` impecable y aun asi ser YAGNI, duplicar algo del KB, o resolverse con una feature nativa. DET-32 agrega ese gate al design: una cascada de descarte barato-primero por cada artifact/REQ nuevo, con veredicto registrado. Inspirado en el repo ponytail.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Gate transversal en `_design-shared.md` (Paso 0d), no duplicado en los 4 design-* | Un punto de mantenimiento; los design-* solo lo referencian (RULE-workflow-det-introduction-001 capa 3) |
| 2 | WARN-first calibrable (no bloqueante de entrada), exige veredicto registrado | Adopcion sin friccion como DET-31; bloquea construir SIN evaluar reuso, no el build justificado |
| 3 | Reusa `dkc-record-decision --step necessity-assessment` (sin codigo nuevo) | Observabilidad HC con infra existente; mismo patron que parallelization-assessment/agent-invocation |
| 4 | Calibracion por work_type (full feature/improvement; light fix/refactor) | Evita friccion donde no aporta (un fix no descarta el bug; un refactor no agrega artefactos) |

**Riesgos principales y como los mitigamos**:

- **Duplicar gates existentes** (KB-first DET-11, checklist "consumidor concreto" de design-feature §5) → el Paso 0d los referencia explicitamente y se ubica en serie (DET-32 = "¿hay que construirlo?" ANTES; consumidor = "¿lo que construyo se usa?" DESPUES).
- **DET incompleta** (declarada sin las 3 capas, como DET-21/22 en HOR-014) → REQ-02 verifica empiricamente las 3 capas con grep.
- **Suite preexistente rota** (`test_dets_catalog.py` afirma 30, hay 31) → REQ-05 la sincroniza en commit aparte antes de cerrar.

**Que NO se hace en este ticket**:

- No se toca la *logica* de `dkc-record-decision`. **Correccion (S2)**: SI se agrego el literal `necessity-assessment` + su choice al enum del validator (`commands/lib/schemas/decisions.ts`) — el enum es cerrado y rechazaba el step. Es un cambio minimo de schema (con self-tests), no de la logica del motor. El supuesto inicial "reusa tal cual" era parcialmente falso (L4).
- No se aplica DET-32 retroactivo a tickets/specs cerrados.
- No se construye tooling de medicion tipo benchmark ponytail (ticket aparte si emerge).
- No se endurece a bloqueante (queda WARN-first; la graduacion a T3 es config futura, documentada).

**Tamano estimado**: 2 sessions (~2-3h efectivas). S1 (core: catalogo + regla integra + fix test + regenerar global) es la mas delicada por el wording de la regla. S2 (wiring de 3 capas) es mecanica. Posible colapso a 1 session.

**Como vas a saber que funciona**:

- `pytest server/tests/test_dets_catalog.py` verde con 32 DETs.
- `dkc-export-rules --global --dry-run` emite 32 bullets `- **DET-`.
- `grep -rn "DET-32" prompts/` matchea en deterministic-rules.md (capa 1), request.md (capa 2) y los design steps (capa 3).

---

## Purpose

Introducir DET-32 (Necesidad y reuso) como gate de la fase design, ortogonal a DET-1, que corre una cascada YAGNI/reuso por artifact/REQ nuevo antes de bajar a tasks, con veredicto `build|reuse|reduce|drop` registrado de forma observable. Cumplir RULE-workflow-det-introduction-001 (3 capas simetricas) y sincronizar el test del catalogo (fix preexistente de HOR-105).

## Requirements

### REQ-01: DET-32 declarada en capa 1 (catalogo condensado + texto integro)

> **Que cambia**: aparece una DET-32 nueva — `dkc_get_rules` y el bloque global de CLAUDE.md la listan, y su detalle integro vive en `deterministic-rules.md`.
> **Por que**: la fuente unica `DETS_CONDENSED` (HOR-088) y el texto integro son las dos caras del contrato; ambas deben existir o la DET es invisible/incoherente.

El sistema MUST registrar DET-32 con `name: "Necesidad y reuso"`, `phases: ["design"]` y `rule` condensado (<600 chars) en `DETS_CONDENSED`, y una seccion integra `### DET-32` en `deterministic-rules.md`.

**Actor**: system · **Layers**: config (python catalog), docs (prompts)

#### Acceptance
**Verificable**: `pytest server/tests/test_dets_catalog.py` pasa con 32 DETs; `grep "## .*32\|### DET-32" prompts/deterministic-rules.md` matchea.

### REQ-02: Las 3 capas referencian DET-32 (RULE-workflow-det-introduction-001)

> **Que cambia**: DET-32 no queda como contrato "declarado pero no ejecutado" — el workflow (`request.md`) la orquesta y los steps de design la implementan.
> **Por que**: DET-21/22 quedaron incompletas por omitir la capa 3 (HOR-014); esta rule es `must` global y exige las 3 capas simetricas.

El sistema MUST tener DET-32 referenciada en las 3 capas: regla (`deterministic-rules.md`), workflow (`prompts/workflows/request.md`) y step(s) ejecutor(es) (`prompts/steps/_design-shared.md` + design-*).

**Actor**: system · **Layers**: docs

#### Acceptance
**Verificable**: `grep -rn "DET-32" prompts/workflows/ prompts/steps/ prompts/deterministic-rules.md` matchea en las 3 ubicaciones.

### REQ-03: Gate ejecutable de necesidad/reuso en design (Paso 0d)

> **Que cambia**: al disenar, antes de fijar artifacts/REQs como tasks, se corre una cascada (¿necesita existir? → ¿ya existe? → ¿lo da la plataforma? → ¿se reduce a config?) y se registra un veredicto por item.
> **Por que**: el peso del proceso DKC empuja a entregar de mas; este gate hace legitimo concluir "no se construye / ya existe / es config".

El sistema MUST, en `_design-shared.md`, definir un Paso 0d que (a) describa la cascada con veredicto `build|reuse|reduce|drop`, (b) lo registre via `./commands/dkc-record-decision --step necessity-assessment`, (c) lo calibre por work_type (full feature/improvement; light fix/refactor), (d) sea WARN-first (exige veredicto, no bloquea el build justificado), y (e) referencie KB-first (DET-11) y el checklist "consumidor concreto" sin duplicarlos.

**Actor**: system · **Layers**: docs

<details><summary>Scenarios de validacion</summary>

#### Scenario: artifact que ya existe en el KB
- **GIVEN** un design-feature que propone un helper de parsing de frontmatter
- **WHEN** se corre el Paso 0d y el KB/codigo ya tiene `gray-matter` instalado
- **THEN** el veredicto es `reuse` con razon, no se genera task de construccion, y queda entry `necessity-assessment` en decisions_log

#### Scenario: fix (calibracion light)
- **GIVEN** un design-fix de un bug puntual
- **WHEN** se corre el Paso 0d
- **THEN** se aplica la version light (¿el fix necesita codigo nuevo o se resuelve con lo existente?) sin descartar el fix mismo

</details>

#### Acceptance
**Verificable**: `_design-shared.md` contiene un `### Paso 0d` con la cascada, el comando de registro y la tabla de calibracion por work_type.

### REQ-04: Bloque global regenerado desde la fuente unica

> **Que cambia**: el bloque DKC de tu `~/.claude/CLAUDE.md` pasa a listar 32 reglas en vez de 31, con DET-32 incluida.
> **Por que**: el bloque se genera desde `DETS_CONDENSED`; sin regenerar, DET-32 existe en el catalogo pero no la ves en el contexto global.

El sistema MUST regenerar `~/.claude/CLAUDE.md` via `dkc-export-rules --global`, emitiendo 32 bullets condensados (no editar el bloque a mano — DET-16).

**Actor**: system · **Layers**: config

#### Acceptance
**Verificable**: `dkc-export-rules --global --dry-run` produce bloque con `count("- **DET-") == 32` y `< 20000` chars.

### REQ-05: Test del catalogo sincronizado (fix preexistente)

> **Que cambia**: `test_dets_catalog.py` deja de afirmar 30 DETs cuando hay 32.
> **Por que**: HOR-105 agrego DET-31 sin actualizar el test → la suite quedo desincronizada/roja; arrastrarla bloquearia el gate (`feedback_fix_preexisting_errors_block_progress`).

El sistema MUST actualizar `test_dets_catalog.py` a `range(1, 33)`, `count == 32`, renombrar el test a un nombre version-agnostic y corregir docstring/comentarios. Commit aparte (`fix(tests)`).

**Actor**: system · **Layers**: config (tests)

#### Acceptance
**Verificable**: `pytest server/tests/test_dets_catalog.py` verde; el test ya no contiene literales `30` ni `range(1, 31)`.

## Tasks

### Session 1 — Core de la regla: catalogo + texto integro + fix test + regenerar global [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Agregar entry `32` a `DETS_CONDENSED` (name "Necesidad y reuso", phases ["design"], rule <600 chars) + docstring "31"→"32" | REQ-01 | developer | — | server/src/deckard_cain/dets_catalog.py | `python -c "from deckard_cain.dets_catalog import DETS_CONDENSED; assert 32 in DETS_CONDENSED"` | git revert | DET-1, DET-2, DET-16 | done | 1 |
| S1.T2 | Agregar seccion integra `### DET-32` antes de `## Meta-nota` (Que/Por que/Cascada/Veredicto+registro/Interaccion DETs/Calibracion/Fuerza/Aplicacion temporal) | REQ-01 | developer | S1.T1 | prompts/deterministic-rules.md | `grep "### DET-32" prompts/deterministic-rules.md` | git revert | DET-2, DET-24 | done | 1 |
| S1.T3 | Fix preexistente: `test_dets_catalog.py` → range(1,33), count 32, rename `test_catalog_covers_all_dets`, docstring/comentarios | REQ-05 | developer | S1.T1 | server/tests/test_dets_catalog.py | `pytest server/tests/test_dets_catalog.py` | git revert | DET-7, DET-13 | done | 1 |
| S1.T4 | Regenerar bloque global: `./commands/dkc-export-rules --global` (verificar 32 bullets) | REQ-04 | developer | S1.T1 | ~/.claude/CLAUDE.md | `dkc-export-rules --global --dry-run` (32 bullets, <20KB) | re-run export desde catalogo previo | DET-16 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier T2)** — persistir en `## Sessions`, correr pytest del catalogo, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + pytest verde + export 32 | (no aplica) | DET-20, DET-23 | done | 1 |

### Session 2 — Wiring de 3 capas en el flujo de design [tipo: ⚑ fuerte] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Capa 2 (workflow): mencionar DET-32 en `request.md` (seccion de design / gates pre-design) | REQ-02 | developer | S1.GATE | prompts/workflows/request.md | `grep "DET-32" prompts/workflows/request.md` | git revert | DET-16, RULE-workflow-det-introduction-001 | done | 2 |
| S2.T2 | Capa 3: agregar `### Paso 0d` (cascada + registro + calibracion work_type + refs DET-11/consumidor) en `_design-shared.md` + DET-32 en "Reglas transversales (heredadas)" | REQ-03 | developer | S1.GATE | prompts/steps/_design-shared.md | grep Paso 0d + DET-32; verificar no duplica KB-first | git revert | DET-11, DET-16, RULE-workflow-det-introduction-001 | done | 2 |
| S2.T3 | Frontmatter `dets:` += 32 en los 4 design-*; nota full en feature/improvement (ref §5 Artifacts), nota light en fix/refactor | REQ-02 | developer | S2.T2 | prompts/steps/design-feature.md, design-improvement.md, design-fix.md, design-refactor.md | `grep -l "32" prompts/steps/design-*.md` (4 archivos) | git revert | DET-16 | done | 2 |
| S2.T4 | Verificar 3 capas (REQ-02) + confirmar H3 (`dkc-record-decision --step necessity-assessment` acepta el step) | REQ-02 | reviewer | S2.T1, S2.T2, S2.T3 | — | `grep -rn "DET-32" prompts/{workflows,steps}/ prompts/deterministic-rules.md` + comando de prueba | (no aplica) | DET-4, DET-13 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier T1)** — persistir, smoke de prompts coherente, decidir | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + 3 capas verificadas | (no aplica) | DET-20, DET-23 | done | 2 |

### Task contract (resumen)

```
S1.T1: entry catalogo — files: dets_catalog.py — validation: import assert — rollback: git revert — rules: [DET-1, DET-2, DET-16]
S1.T3: fix test preexistente — files: test_dets_catalog.py — validation: pytest — rollback: git revert — rules: [DET-7, DET-13]
S2.T2: Paso 0d capa 3 — files: _design-shared.md — validation: grep + no-dup check — rollback: git revert — rules: [DET-11, DET-16]
```

## Constraints

- RULE-workflow-det-introduction-001 (**must**): las 3 capas (regla + workflow + step ejecutor) deben actualizarse simetricamente. Es el driver del scope de S2.
- RULE-workflow-enforcement-pattern-009: patron de enforcement; el Paso 0d se apoya en el a-hook `dkc-record-decision` + validator `StepDecisions` ya existentes.
- HOR-088 (fuente unica): NO duplicar el condensado fuera de `DETS_CONDENSED`.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| El Paso 0d duplica KB-first (DET-11) o el checklist "consumidor concreto" | medium | confusion / redundancia normativa | El Paso 0d referencia ambos explicitamente y se ubica en serie (antes/despues); smoke de prompts en S2.GATE |
| DET incompleta (falta capa 2 o 3) | low | DET declarada pero no ejecutada | REQ-02 + S2.T4 verifican las 3 capas con grep |
| Wording de DET-32 ambiguo (build vs reduce) | medium | veredictos inconsistentes en design | Definir los 4 veredictos con ejemplo en el texto integro; modelo SPEC-workflow-mutation-gate-105 |

## Open questions

- [ ] Ninguna — el alcance quedo cerrado en el plan aprobado.

## Decisions

### DEC-LOCAL-01: WARN-first calibrable en vez de bloqueante de entrada
- **Contexto**: como introducir el gate sin frenar features grandes con falsos bloqueos
- **Drivers**: adopcion sin friccion (patron DET-31), el veredicto observable ya fuerza la consideracion explicita
- **Opcion elegida**: WARN-first — exige veredicto registrado por item, el `build` con razon es valido; endurecible a bloqueante en T3 (config futura)
- **Alternativas**: bloqueante de entrada (mayor friccion, riesgo de falsos bloqueos) — descartada
- **Consecuencias**: gana adopcion y bajo riesgo; pierde enforcement duro inmediato (aceptable, graduable)
- **Session**: design (S0)

## Acceptance checkpoints

- [x] **Funcional**: los scenarios de REQ-01..05 pasan
- [x] **Tests**: `pytest server/tests/test_dets_catalog.py` verde (32 DETs)
- [x] **Rules**: RULE-workflow-det-introduction-001 satisfecha (3 capas verificadas con grep)
- [x] **Integration**: `dkc-export-rules --global` emite 32 bullets; resto de la suite del server sin regresion
- [x] **Docs**: deterministic-rules.md, request.md, _design-shared.md y los 4 design-* coherentes, sin duplicar gates
