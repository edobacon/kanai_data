---
id: SPEC-workflow-context-diet-steps-86
project: horadric
ticket: HOR-086
status: done
---

# Context diet seguro de steps

# Context diet seguro de steps

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle vive en Requirements / Tasks abajo.*

**Que se quiere**: bajar los tokens que el LLM principal carga al ejecutar workflows DKC, atacando solo el desperdicio **mecanico** — sin tocar la saliencia de las reglas (eso es HOR-085). Tres frentes: (A) que `design-feature` y `tactic-execute` lean `rules/{module}/` en vez del directorio entero; (B) sacar los bloques v1 legacy muertos de los steps de teach; (C) partir 3 steps grandes en indice + sub-archivos lazy-load (patron HOR-059). Todo verificable y reversible.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Frente B acotado: mover solo los 2 bloques `<details>` v1 limpios, NO desentejer el awareness v1/v2 disperso | El intake (Session 0, D1) mostro que desentejer es alto costo/bajo valor y arriesga el render de tickets pre-2026-05-29 |
| 2 | Frente C (split) toca el workflow engine — se ejecuta con gate ⚑ fuerte + reviewer aislado + verificacion `dkc_get_step_phase` | Un split mal hecho rompe el flujo de TODOS los tickets futuros |

**Riesgos principales y como los mitigamos**:

- **Split rompe la carga de un step** → verificar `dkc_get_step_phase` retorna cada fase OK antes de cerrar cada gate de S2/S3; gate ⚑ fuerte (no auto-continue).
- **Extraer legacy rompe el render de tickets v1 (pre-2026-05-29)** → solo se mueven los 2 bloques `<details>` a archivos `-legacy.md` referenciados; el step mantiene el link condicional; no se tocan las refs v1/v2 entretejidas.
- **Scoping a `{module}` pierde una rule relevante** → el modulo del ticket es donde viven las rules aplicables (convencion DKC); el descubrimiento cross-modulo se cubre aparte (HOR-085 backlog #2, via semantic search).

**Que NO se hace en este ticket**:

- Desentejer el awareness v1/v2 disperso en los steps de teach (alto costo, bajo valor — D1 del intake).
- Retrieval semantico de rules/specs (depende de HOR-083+084 — HOR-085 backlog #2).
- Re-surfacing de DETs / saliencia (es HOR-085).

**Tamano estimado**: 3 sessions ejecutables (S1-S3), ~2-3h efectivas. La mas riesgosa: S2/S3 (split del engine, gate ⚑ fuerte).

**Como vas a saber que funciona**:

- `dkc_get_step_phase('teach-intake', '<fase>')` retorna la fase pedida (no el monolitico) tras el split.
- Un ticket nuevo corre teach-intake/teach-close/intake-explore sin error con los steps split.
- `grep "rules/{module}/" design-feature.md tactic-execute.md` matchea (scoping aplicado).
- El render de un teach v1 (pre-2026-05-29) sigue intacto.

---

## Purpose

Reducir el contexto/tokens que el LLM principal inyecta al correr workflows DKC, eliminando carga redundante (dead code v1), carga de archivos enteros cuando basta una parte (split lazy-load), y lectura de directorios completos cuando basta el modulo (scoping). Es un improvement de economia de contexto de **riesgo bajo** (mecanico), complementario a HOR-085 (saliencia de reglas, mayor riesgo).

## Requirements

### REQ-IMPROVE-01: Scoping de rules por modulo en design-feature + tactic-execute

> **Que cambia**: `design-feature.md` y `tactic-execute.md` pasan a leer `projects/{project}/rules/{module}/` en vez del directorio `rules/` completo, alineandose con sus hermanos design-improvement/fix/refactor.
> **Por que**: en proyectos maduros (up1: 115 rules / 272KB) leer todo el directorio gasta tokens en rules de modulos irrelevantes al ticket.

El sistema MUST hacer que `design-feature.md` (`reads:` linea 12) y `tactic-execute.md` (`reads:` linea 8) declaren `projects/{project}/rules/{module}/` como scope de rules.

<details><summary>Scenarios de validacion</summary>

- GIVEN un ticket de modulo X WHEN se invoca design-feature THEN se leen solo las rules de `rules/X/`, no las de otros modulos.
- GIVEN el `reads:` de design-feature/tactic-execute WHEN se compara con design-improvement/fix/refactor THEN usan el mismo patron `rules/{module}/`.
</details>

### REQ-IMPROVE-02: Extraer bloques v1 legacy de los steps de teach

> **Que cambia**: los bloques `<details>v1 LEGACY</details>` de `teach-intake.md` (~28 lineas) y `teach-close.md` (~29 lineas) se mueven a archivos `teach-intake-legacy.md` / `teach-close-legacy.md`, referenciados con un link condicional ("solo tickets pre-2026-05-29").
> **Por que**: para tickets nuevos (≥2026-05-29) ese contenido es dead code que igual se inyecta al leer el step.

El sistema MUST mover los 2 bloques `<details>` v1 a archivos `-legacy.md` y reemplazarlos en el step por una referencia condicional. El sistema MUST NOT desentejer las referencias v1/v2 dispersas fuera de esos bloques (decision 1).

<details><summary>Scenarios de validacion</summary>

- GIVEN teach-intake.md tras el cambio WHEN se busca `<details>v1 LEGACY` THEN no esta (movido a teach-intake-legacy.md).
- GIVEN el step WHEN un ticket pre-2026-05-29 necesita el formato v1 THEN el link condicional apunta al `-legacy.md`.
</details>

### REQ-IMPROVE-03: Split lazy-load de teach-intake, teach-close, intake-explore

> **Que cambia**: los 3 steps (525/423/379 lineas) se parten en indice liviano + sub-archivos por fase, siguiendo el patron de HOR-059; el LLM carga solo la fase activa via `dkc_get_step_phase`.
> **Por que**: hoy se inyecta el step entero aunque el turno use solo una fase.

El sistema SHOULD partir `teach-intake.md`, `teach-close.md` e `intake-explore.md` en indice + sub-archivos por fase, de modo que `dkc_get_step_phase(step, fase)` retorne solo la fase pedida y, si el step no estuviera split, retorne el monolitico sin error (auto-detect ya existente).

<details><summary>Scenarios de validacion</summary>

- GIVEN teach-intake split WHEN `dkc_get_step_phase('teach-intake', '<fase>')` THEN retorna la fase, no el monolitico.
- GIVEN un step split WHEN se mide el indice THEN es sustancialmente menor que el monolitico original.
</details>

### REQ-PRESERVE-01: El workflow sigue funcionando igual (regression — DET-7)

> **Que cambia**: nada en el comportamiento observable del workflow — tickets nuevos y pre-2026-05-29 se procesan igual que antes.
> **Por que**: una optimizacion de contexto que cambie el comportamiento del engine no es mejora, es un bug.

El sistema MUST preservar: (a) el render de teaching v1 de tickets pre-2026-05-29; (b) la resolucion de fases de cualquier step (split o no) via `dkc_get_step_phase`; (c) los gates DET-21/DET-22 de los steps de teach; (d) la funcion de intake-explore.

<details><summary>Scenarios de validacion</summary>

- GIVEN un teach-intake.md v1 existente WHEN HC lo renderiza THEN se ve igual que antes.
- GIVEN cualquier step (split o monolitico) WHEN `dkc_get_step_phase` THEN resuelve sin error.
- GIVEN un ticket nuevo WHEN corre teach-intake/teach-close/intake-explore split THEN completa sin regresion.
</details>

## Changes

### Modified: prompts/steps/design-feature.md, prompts/steps/tactic-execute.md

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `reads:` rules | `projects/{project}/rules/` | `projects/{project}/rules/{module}/` | Scoping por modulo (REQ-IMPROVE-01) |

### Modified: prompts/steps/teach-intake.md, prompts/steps/teach-close.md

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Bloque `<details>v1 LEGACY` | inline en el step | movido a `*-legacy.md` + link condicional | Dead code para tickets nuevos (REQ-IMPROVE-02) |
| Estructura | monolitico | indice + sub-archivos por fase | Lazy-load (REQ-IMPROVE-03) |

### Modified: prompts/steps/intake-explore.md

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Estructura | monolitico (379 lineas) | indice + sub-archivos por fase | Lazy-load (REQ-IMPROVE-03) |

### Added: prompts/steps/teach-intake-legacy.md, prompts/steps/teach-close-legacy.md

Bloques v1 extraidos, referenciados condicionalmente desde sus steps.

## Tasks

### Session 1 — Frente A (scoping) + Frente B (extraer legacy) [tipo: auto] [tier: T2]

| # | Task | source_ref | agent | Status | Session |
|---|------|-----------|-------|--------|---------|
| S1.T1 | Scoping `rules/{module}/` en design-feature.md + tactic-execute.md | REQ-IMPROVE-01 | developer | pending | 1 |
| S1.T2 | Extraer bloques `<details>v1` a teach-intake-legacy.md + teach-close-legacy.md + link condicional | REQ-IMPROVE-02 | developer | pending | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T2) + quality review DET-23 (reviewer aislado, REQ-10) | REQ-PRESERVE-01 | reviewer | pending | 1 |

### Session 2 — Frente C: split teach-intake [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | agent | Status | Session |
|---|------|-----------|-------|--------|---------|
| S2.T1 | Split teach-intake.md → indice + sub-archivos por fase (patron HOR-059) | REQ-IMPROVE-03 | developer | pending | 2 |
| **S2.GATE** | Gate ⚑ fuerte: verificar `dkc_get_step_phase('teach-intake', ...)` OK + quality review DET-23 (reviewer aislado) | REQ-IMPROVE-03, REQ-PRESERVE-01 | reviewer | pending | 2 |

### Session 3 — Frente C: split teach-close + intake-explore [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | agent | Status | Session |
|---|------|-----------|-------|--------|---------|
| S3.T1 | Split teach-close.md → indice + sub-archivos por fase | REQ-IMPROVE-03 | developer | pending | 3 |
| S3.T2 | Split intake-explore.md → indice + sub-archivos por fase | REQ-IMPROVE-03 | developer | pending | 3 |
| **S3.GATE** | Gate ⚑ fuerte: verificar `dkc_get_step_phase` OK para ambos + quality review DET-23 (reviewer aislado) | REQ-IMPROVE-03, REQ-PRESERVE-01 | reviewer | pending | 3 |

### Task contract (resumen — rollback comun)

- **rollback**: todas las tasks son edits de markdown en `prompts/steps/` → `git revert` del commit de la session. Sin migraciones ni estado persistente.
- **rules**: DET-5 (multi-capa: verificar dkc_get_step_phase), DET-7 (regression — REQ-PRESERVE), DET-8 (rollback), DET-16 (propagacion: ¿algun consumer referencia los steps por path/linea?), DET-23 (quality review).

## Constraints

- Solo se tocan archivos en `prompts/steps/` (execute_scope declarado).
- No romper el auto-detect de `dkc_get_step_phase` (split vs monolitico).

## Dependencies

- Patron de split: HOR-059 + `dkc_get_step_phase` (`server/src/deckard_cain/tools/steps.py`).
- Ninguna externa.

## Risks and mitigations

| Riesgo | Severidad | Mitigacion |
|--------|-----------|------------|
| Split rompe la carga de un step (afecta TODOS los tickets) | Alta | Gate ⚑ fuerte S2/S3 + verificar `dkc_get_step_phase` + reviewer aislado |
| Extraer legacy rompe render v1 | Media | Solo mover los 2 bloques limpios + link condicional; no tocar refs entretejidas |
| Scoping pierde una rule | Baja | El modulo del ticket es donde viven las rules; cross-modulo via HOR-085 #2 |

## Open questions

(Ninguna abierta — el intake convergio. Cross-modulo de rules diferido a HOR-085 #2.)

## Decisions

### DEC-LOCAL-01: Frente B acotado a los 2 bloques `<details>` limpios

- **Decision**: mover solo los bloques `<details>v1 LEGACY` (~57 lineas), NO desentejer el awareness v1/v2 disperso.
- **Alternativa descartada**: extraccion completa del legacy → alto costo, bajo valor, riesgo de romper render v1.
- **Consecuencia**: win de Frente B menor al estimado original (~225 lineas), pero seguro.
- **source_ref**: Session 0 intake, discovery D1.

## Success metrics

| Metric | Baseline (current) | Target | How to measure | When |
|--------|-------------------|--------|----------------|------|
| Lineas dead-code v1 en steps teach cargadas/ticket | ~57 (2 bloques `<details>`) | 0 (movidas a -legacy) | grep `<details>v1` en teach-intake/close.md | post-S1 |
| Carga de rules en design-feature (up1) | directorio completo (~272KB) | solo `rules/{module}/` | inspeccion `reads:` | post-S1 |
| teach-intake/close/intake-explore: carga por fase | monolitico (525/423/379 lineas) | solo fase activa via dkc_get_step_phase | dkc_get_step_phase retorna fase | post-S2/S3 |

## Acceptance checkpoints

- [ ] AC1: `design-feature.md` + `tactic-execute.md` leen `rules/{module}/` (grep).
- [ ] AC2: bloques `<details>v1` ausentes de teach-intake/close.md; presentes en `-legacy.md` con link condicional.
- [ ] AC3: `dkc_get_step_phase` retorna fases de teach-intake/teach-close/intake-explore split sin error.
- [ ] AC4: un teach v1 (pre-2026-05-29) sigue renderizando igual (regression).
- [ ] AC5: quality review (DET-23) reviewer aislado approve en cada S{N}.GATE.

## Technical reference

- Patron split: `request-execute.md`/`request-close.md` (HOR-059) + `dkc_get_step_phase`.
- Steps objetivo: `prompts/steps/{design-feature,tactic-execute,teach-intake,teach-close,intake-explore}.md`.

## Rules discovered

(A capturar durante execute.)

## Bugs found

(N/A esperado.)

## Archiving

(Spec activa hasta cierre de HOR-086.)
