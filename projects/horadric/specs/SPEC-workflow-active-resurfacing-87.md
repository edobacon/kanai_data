---
id: SPEC-workflow-active-resurfacing-87
project: horadric
ticket: HOR-087
status: done
---

# Re-surfacing activo de DETs por step

# Re-surfacing activo de DETs por step

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle vive en Requirements/Tasks abajo.*

**Que se quiere**: HOR-085 dejó los 11 steps declarando `dets:` en frontmatter pero **sin cablear** — ningún body los trae vía `dkc_get_rules(dets=...)`. Este ticket agrega esa instrucción activa, cerrando el gap B2. Materializa la saliencia point-of-use en Claude Code y restaura la cobertura en hosts sin global (Codex/Cursor/Ollama). Es el prerrequisito del Flujo A (aligerar el global).

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Instrucción de body **uniforme** (mismo snippet en los 11 steps) vs adaptada por step | Uniforme = consistencia + fácil de mantener/grepear; adaptada = ruido. Se elige uniforme (DEC-LOCAL-01). |
| 2 | a-hook comment se agrega como marcador **conceptual** (no runtime) | Los a-hooks no son runtime hoy (intake H3); agregarlo da consistencia con el patrón de 5 capas sin prometer enforcement que no existe. |

**Riesgos principales y como los mitigamos**:

- **Verbosidad sin valor (anti-objetivo)** → snippet de 1-2 líneas, estándar; quality review (reviewer aislado) evalúa señal/ruido.
- **Inconsistencia entre steps** → snippet idéntico aplicado programáticamente a los 11.

**Que NO se hace**:

- **Aligerar el global** (Flujo A / HOR-088) — fuera de scope, depende de este.
- **Hooks runtime reales** (PostToolUse del harness) — los a-hooks siguen conceptuales; instrumentación runtime es follow-up del sistema.
- **Tocar el server** — `dkc_get_rules(dets)` ya existe (HOR-085 S1).

**Tamaño estimado**: 1 session (~1h), mecánico. Tier T2.

**Como vas a saber que funciona**:

- Cada uno de los 11 steps tiene al inicio del body la instrucción `dkc_get_rules(dets=...)`.
- `grep` de la instrucción estándar retorna 11.
- Principio 12 de `_style.md` refleja que la responsabilidad de re-surfacing vive en el body del step.

---

## Purpose

Convertir el `dets:` declarativo de los 11 steps migrados en HOR-085 en re-surfacing activo: cada step, al ingresar, trae su set condensado vía `dkc_get_rules(dets=<frontmatter.dets>)`. Cierra REQ-IMPROVE-03 de HOR-085 (declarado pero no cableado) y el gap multi-provider B2.

## Estado actual → deseado → delta

### Estado actual
- 11 steps con `dets:` en frontmatter (HOR-085 S2) + comentario inline, pero **ningún body** instruye llamar `dkc_get_rules(dets=...)`.
- Principio 12 de `_style.md` documenta la convención pero la "responsabilidad de re-surfacing" no está cableada en los steps.

### Estado deseado
- Los 11 steps tienen al inicio del body una instrucción estándar accionable de re-surfacing.
- Opcional: a-hook comment (conceptual) por consistencia con el patrón de 5 capas.
- Principio 12 actualizado: la instrucción activa vive en el body (no solo declarada).

### Delta
| Cambia | NO cambia |
|--------|-----------|
| 11 step bodies: +instrucción activa `dkc_get_rules(dets=...)` | El frontmatter `dets:` (ya está, HOR-085) |
| Principio 12 (responsabilidad cableada) | El tool `dkc_get_rules` (ya soporta `dets`) |
| a-hook comment (conceptual) | El global, deterministic-rules.md |

## Requirements

### REQ-IMPROVE-01: instrucción activa de re-surfacing en cada step migrado

> **Que cambia**: cada uno de los 11 steps con `dets:` ahora tiene, al inicio de su body, una línea que le dice al LLM ejecutor que traiga ese set vía `dkc_get_rules(dets=...)`. Antes el `dets:` no lo leía nadie.
> **Por que**: sin la instrucción, el `dets:` es metadata muerta; el beneficio de saliencia no ocurre y los hosts sin global quedan sin cobertura.

El sistema MUST incluir, al inicio del body de cada step migrado en HOR-085, una instrucción estándar que indique invocar `dkc_get_rules(dets=<frontmatter.dets>)` al ingresar a la fase, para traer los condensados del set declarado.

**Actor**: system (LLM ejecutor)
**Layers**: meta (prompts/steps)

<details><summary>Scenarios de validacion</summary>

#### Scenario: instrucción presente
- **GIVEN** los 11 steps migrados en HOR-085
- **WHEN** `grep` de la instrucción estándar
- **THEN** retorna 11 (uno por step)

</details>

### REQ-IMPROVE-02: Principio 12 refleja la responsabilidad cableada

> **Que cambia**: el Principio 12 de `_style.md` deja explícito que la instrucción activa vive en el body del step (no solo el `dets:` declarado), y que steps nuevos deben incluirla.
> **Por que**: la doc debe coincidir con el mecanismo real para que steps futuros lo repliquen.

El sistema MUST actualizar Principio 12 (`prompts/_style.md`) para reflejar que el re-surfacing es una instrucción de body activa, y agregar el snippet de referencia.

**Actor**: dev (autor de steps futuros)
**Layers**: meta (docs)

### REQ-PRESERVE-01: sin verbosidad ni regresión

> **Que cambia**: nada degrada — la instrucción es concisa (1-2 líneas) y no rompe el parsing de steps ni los validators.
> **Por que**: el anti-objetivo es agregar ruido sin valor.

El sistema MUST mantener los steps parseables (frontmatter + body válidos) y la instrucción acotada a 1-2 líneas estándar. Sin regresión en validators existentes.

**Actor**: system
**Layers**: meta

<details><summary>Scenarios de validacion</summary>

#### Scenario: sin regresión
- **GIVEN** los steps modificados
- **WHEN** se corre la suite del server + validators de steps
- **THEN** sin errores nuevos

</details>

## Tasks

### Session 1 — Cablear re-surfacing activo en los 11 steps [tipo: auto] [tier: T2]

Agregar la instrucción activa estándar a los 11 steps + a-hook conceptual + actualizar Principio 12. Quality review DET-23 standard (reviewer aislado por `autopilot: super`, DET-30 REQ-10).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Definir el snippet estándar de re-surfacing (1-2 líneas) + dónde insertarlo en el body (post-frontmatter / inicio de instrucciones) | REQ-IMPROVE-01 | architect | — | projects/horadric/specs/SPEC-workflow-active-resurfacing-87.md | snippet definido + ubicación consistente | N/A (doc) | DET-16 | done | 1 |
| S1.T2 | Aplicar el snippet al inicio del body de los 11 steps migrados (+ a-hook comment conceptual) | REQ-IMPROVE-01 | developer | S1.T1 | prompts/steps/*.md | TC-01 (grep 11) | git revert | DET-16 | done | 1 |
| S1.T3 | Actualizar Principio 12 (`_style.md`) + verificar sin regresión (suite server + parse steps) | REQ-IMPROVE-02, REQ-PRESERVE-01 | developer | S1.T2 | prompts/_style.md | TC-02 (P12 actualizado) + TC-03 (31/31) | git revert | DET-16 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (validation tier: T2) + quality review DET-23 standard (reviewer aislado) | — | reviewer | S1.T3 | — | grep 11 + suite verde + DET-23 standard pass | — | DET-13, DET-14, DET-23 | done | 1 |

## Constraints

- DET-11 (KB-first): respetar Principio 12 existente (HOR-085).
- DET-16 (propagación): la instrucción debe coincidir con lo que Principio 12 documenta.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| HOR-085 (`dets:` migrados + tool `dkc_get_rules(dets)`) | internal | este ticket cablea sobre lo que HOR-085 dejó | sin HOR-085 presente en la rama, no hay `dets:` que cablear |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Verbosidad sin valor | medium | low | snippet 1-2 líneas estándar; reviewer evalúa señal/ruido |
| a-hook leído como runtime (no lo es) | low | low | comentario marca explícito "conceptual" |

## Open questions

(Ninguna — DEC-LOCAL-01 resuelve la forma del snippet.)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: snippet uniforme, no adaptado por step
- **Contexto**: la instrucción de re-surfacing podría redactarse a medida por step o uniforme.
- **Drivers**: consistencia, mantenibilidad, grepeabilidad vs ruido.
- **Opción elegida**: snippet uniforme idéntico en los 11 (parametrizado solo por `<frontmatter.dets>`).
- **Alternativas**: adaptado por step — descartado: más ruido, difícil de verificar, sin beneficio.
- **Consecuencias**: gana consistencia + verificación por grep; cuesta cero adaptación contextual (no se necesita).
- **Session**: design (pre-S1).

## Acceptance checkpoints

- [x] **Funcional**: los 11 steps tienen la instrucción activa (REQ-IMPROVE-01)
- [x] **Doc**: Principio 12 actualizado (REQ-IMPROVE-02)
- [x] **Regression**: suite server verde + steps parseables (REQ-PRESERVE-01)
- [x] **Rules**: DET-16 (instrucción ↔ doc coinciden)
