---
id: SPEC-workflow-resurfacing-subfiles-89
project: horadric
ticket: HOR-089
status: done
---

# Re-surfacing dirigido en sub-archivos de request-execute

# Re-surfacing dirigido en sub-archivos de request-execute

## Executive summary — lo que estas aprobando

> *Revision rapida. Mecanico, acotado a request-execute (B1 de HOR-087).*

**Que se quiere**: HOR-087 cableo el re-surfacing en los steps root, pero request-execute es split — el punto de uso real durante execute es el sub-archivo de fase (task-loop, session-gate…), no el index. Este ticket agrega a cada sub-archivo su `dets:` por-fase + el snippet de re-surfacing.

**Decision critica**: el `dets:` por sub-archivo es **per-fase** (no uniforme) — cada fase gatea DETs distintas. start→[20,28,29,30]; task-loop→[9,10,25,29]; session-gate→[20,23,25,27]; gates→[20,23,25,29]; transversal→[12,15,30].

**Riesgos**: ruido (set incorrecto por fase) → derivar de los gates reales de cada sub-archivo; reviewer verifica.

**Que NO se hace**: los otros steps split (request-close, intake-explore, teach-*) — backlog (valor marginal).

**Tamaño**: 1 session, T1, mecanico.

**Como sabras que funciona**: los 5 sub-archivos tienen `dets:` (set por-fase) + el snippet; YAML valido; sin regresion.

---

## Purpose

Llevar el re-surfacing activo (HOR-087) a los 5 sub-archivos de fase de `request-execute`, con el set `dets:` que gatea cada fase, para que las DETs esten salientes en el punto de uso real durante execute (no solo en el index).

## Estado actual → deseado → delta

### Estado actual
- `request-execute.md` (root) tiene `dets:` + snippet (HOR-087). Sus 5 sub-archivos (start, task-loop, session-gate, gates, transversal) son `step-fragment` sin `dets:` ni snippet.

### Estado deseado
- Cada sub-archivo declara su `dets:` por-fase + lleva el snippet de re-surfacing.

### Delta
| Cambia | NO cambia |
|--------|-----------|
| 5 sub-archivos: +`dets:` por-fase + snippet | El root request-execute.md (ya tiene, HOR-087) |
| — | El catalogo / dkc_get_rules / global |

## Requirements

### REQ-IMPROVE-01: re-surfacing por-fase en los sub-archivos de request-execute

> **Que cambia**: cada sub-archivo de fase de request-execute declara su `dets:` (el set que gatea ESA fase) y trae el snippet de re-surfacing, igual que los root de HOR-087.
> **Por que**: durante execute el LLM esta en el sub-archivo, no en el index — ahi deben estar salientes las DETs de la fase.

El sistema MUST agregar a cada uno de los 5 sub-archivos de `prompts/steps/request-execute/` un `dets:` en frontmatter (subconjunto por-fase) + el snippet de re-surfacing en el body.

**Actor**: system
**Layers**: meta (prompts/steps)

<details><summary>Scenarios de validacion</summary>

#### Scenario: presente en los 5
- **GIVEN** los 5 sub-archivos de request-execute
- **WHEN** grep de `dets:` + del snippet
- **THEN** los 5 tienen ambos

</details>

### REQ-PRESERVE-01: sin regresion

> **Que cambia**: nada degrada — frontmatter valido, parsers OK.
> **Por que**: anti-objetivo ruido / romper parse.

El sistema MUST mantener los sub-archivos parseables (YAML valido) y `dkc_get_step_phase` funcional. Sin regresion en suite server.

**Actor**: system
**Layers**: meta

## Tasks

### Session 1 — dets por-fase + re-surfacing en sub-archivos de request-execute [tipo: auto] [tier: T1]

Quality review DET-23 light (reviewer aislado proporcional — gate T1 mecanico).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Confirmar el set `dets:` por-fase de cada sub-archivo (leer sus gates) | REQ-IMPROVE-01 | architect | — | prompts/steps/request-execute/ | set por-fase confirmado contra gates reales | N/A | DET-16 | done | 1 |
| S1.T2 | Agregar `dets:` frontmatter + snippet de re-surfacing a los 5 sub-archivos | REQ-IMPROVE-01 | developer | S1.T1 | prompts/steps/request-execute/*.md | TC-01 (5 con dets+snippet) | git revert | DET-16 | done | 1 |
| S1.T3 | Verificar: YAML valido, snippet presente, suite server sin regresion | REQ-PRESERVE-01 | developer | S1.T2 | prompts/steps/request-execute/, server/ | TC-01 + TC-02 (34/34) | git revert | DET-16 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T1) + quality review DET-23 light | — | reviewer | S1.T3 | — | grep 5 + suite verde + DET-23 light pass | — | DET-13, DET-14, DET-23 | done | 1 |

## Constraints

- DET-16 (propagación): el set por-fase debe coincidir con los gates reales del sub-archivo + con Principio 12.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| HOR-087 (snippet + Principio 12) | internal | reusa el patrón | — |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Set por-fase incorrecto (ruido) | medium | low | derivar de los gates reales de cada sub-archivo (S1.T1); reviewer verifica |

## Open questions

(Ninguna.)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: dets por-fase, no uniforme
- **Contexto**: el snippet podría llevar el set completo del root o un set por-fase.
- **Drivers**: precisión point-of-use (cada fase gatea DETs distintas) vs simplicidad.
- **Opción elegida**: set por-fase (start/task-loop/session-gate/gates/transversal cada uno con su subconjunto).
- **Alternativas**: copiar el set del root — descartado (ruido; no es point-of-use preciso).
- **Consecuencias**: precisión real; cuesta leer los gates de cada sub-archivo (S1.T1).
- **Session**: design.

## Acceptance checkpoints

- [x] **Funcional**: 5 sub-archivos con `dets:` por-fase + snippet (REQ-IMPROVE-01)
- [x] **Regression**: YAML válido + suite server 34/34 (REQ-PRESERVE-01)
- [x] **Rules**: set por-fase coincide con gates reales (DET-16)
