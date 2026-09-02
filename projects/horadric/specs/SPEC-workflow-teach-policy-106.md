---
id: SPEC-workflow-teach-policy-106
project: horadric
ticket: HOR-106
status: in_progress
---

# Opt-out de teach en autopilot — flag `teach_policy`

# Opt-out de teach en autopilot — flag `teach_policy`

## Executive summary — lo que estas aprobando

### 1. Que se quiere
Un flag de autopilot, `teach_policy: auto | skip` (default `auto`), que permita al dev **omitir explícitamente** la generación de teach-intake y teach-close, manteniendo el resto del flujo autónomo (super) intacto. Hoy el teach es obligatorio y no-skippable en autopilot (DET-21/22 + DET-30/HOR-079 REQ-05).

### 2. Decisiones criticas
| Decision | Racional |
|----------|----------|
| Flag ortogonal `teach_policy`, NO modo nuevo (DEC-LOCAL-01) | El teach es ortogonal a la autonomía; un modo `super-no-teach` ensuciaría el state machine y obligaría a tocar cada chequeo `autopilot∈{...}`. Confirmado por el dev: "un flag dentro del mismo autopilot" |
| Default `auto` (teach obligatorio) | Cero regresión: el comportamiento actual se preserva salvo opt-out explícito |
| Skip explícito + auditado | Preserva el racional de HOR-079 REQ-05 (teach = única ventana del dev). El skip se registra como entry observable; nunca es default |
| Una vez seteado, ejecución sin más preguntas | El dev pidió: registra el skip y procede como super normal, sin re-preguntar |

### 3. Riesgos y mitigaciones
| Riesgo | Mitigacion |
|--------|------------|
| Blast radius: DET-21/22/30 gobiernan TODOS los proyectos | Cambio aditivo (carve-out condicionado al flag); default preserva comportamiento; validators + dry-run en S3 |
| Skip silencioso del aprendizaje | Skip solo si flag explícito + entry observable `teach-policy` en decisions_log |
| Drift entre `dets_catalog.py` (condensado) y `deterministic-rules.md` (íntegro) | S1 edita ambos + regenera bloque global con `dkc-export-rules --global` |

### 4. Que NO se hace
- No se toca el resto de DET-30 (rama no-protegida, execute_scope, reviewer aislado, cierre reforzado, git hook).
- No se cambia el comportamiento default (auto-teach sigue obligatorio).
- No aplica a quick/query (ya exentos de teach).

### 5. Tamano estimado
3 sessions (~3-5h). S2 (steps) es la más riesgosa (⚑) por blast radius.

### 6. Como vas a saber que funciona
- Un ticket con `teach_policy: skip` corre full-path autónomo sin generar teach-intake/teach-close y sin bloquear gates.
- Un ticket sin el flag (default) sigue exigiendo teach como hoy.
- El skip queda auditado en `decisions_log` (`teach-policy`).

## Purpose
Agregar al modo autopilot un flag `teach_policy` que permita omitir teach-intake/teach-close de forma explícita y auditada, sin degradar el resto de la red de seguridad ni el comportamiento default.

## Requirements

### REQ-01: Flag `teach_policy` en el ticket (default auto)
> **Que cambia**: el ticket acepta `teach_policy: auto | skip` en frontmatter; ausente = `auto`.
> **Por que**: es el switch persistente del opt-out, orthogonal al nivel de autopilot.

El sistema MUST aceptar `teach_policy` (enum `auto|skip`, default `auto`) en el schema del ticket (`commands/lib/schemas/ticket.ts`). Ausencia ≡ `auto` (backwards-compatible).

### REQ-02: DET-21/22/30 con carve-out condicionado al flag
> **Que cambia**: las reglas que obligan teach reconocen `teach_policy: skip` como excepción válida.
> **Por que**: sin esto, los gates bloquean aunque el flag esté seteado.

El sistema MUST actualizar DET-21, DET-22 y DET-30 (en `deterministic-rules.md` + `dets_catalog.py`) para que la obligatoriedad del teach aplique **salvo** `teach_policy: skip` explícito y auditado. El resto de DET-30 permanece sin cambios. MUST regenerar el bloque global (`dkc-export-rules --global`).

### REQ-03: teach-intake §0b respeta el flag (aun en autopilot)
> **Que cambia**: si `teach_policy: skip`, teach-intake registra `skipped` + NO genera archivo, incluso en super.
> **Por que**: hoy autopilot fuerza `generate` (REQ-05); el flag lo condiciona.

El sistema MUST, en `teach-intake` §0b: si `teach_policy: skip` → registrar entry `teach-intake-0b` choice `skipped` (reason del flag) + NO generar el .html + `teachings.intake: skipped`, **sin AskUserQuestion** (no re-pregunta). Si `teach_policy: auto` → comportamiento actual (autopilot fuerza generate).

### REQ-04: request-close (teach-close) respeta el flag
> **Que cambia**: si `teach_policy: skip`, el cierre no exige teach-close.
> **Por que**: DET-22 hoy bloquea status:closed sin teach-close.

El sistema MUST, en `request-close` sub-step teach-close: si `teach_policy: skip` → `teachings.close: skipped` (reason del flag) + NO generar teach-close + NO bloquear el cierre.

### REQ-05: trigger "skip teach" setea el flag + auditoría
> **Que cambia**: decir "skip teach" (junto al modo) setea `teach_policy: skip` y lo registra.
> **Por que**: es la UX pedida ("ticket super autopilot skip teach").

El sistema MUST parsear el token `skip teach` (en `commands/dkc.md` fila autopilot-trigger + `request-intake §0`) → setear `teach_policy: skip` en el frontmatter + registrar entry observable `teach-policy` (choice `skip`, actor dev) en `decisions_log`. El gate `_design-shared` GATE1 y el cierre reconocen el `skipped` resultante como válido.

## Tasks

### Session 1 — Reglas: DET-21/22/30 + schema + regen [tipo: auto] [tier: T1]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Agregar `teach_policy` (enum auto/skip, default auto, optional) al schema `commands/lib/schemas/ticket.ts` | REQ-01 | developer | — | `commands/lib/schemas/ticket.ts` | dkc-validate Ticket de un ticket con teach_policy → valid | git revert | DET-1, DET-2 | pending | 1 |
| S1.T2 | DET-21 y DET-22: carve-out "salvo teach_policy: skip explícito+auditado" en `deterministic-rules.md` + `dets_catalog.py` | REQ-02 | developer | — | `prompts/deterministic-rules.md`, `server/src/deckard_cain/dets_catalog.py` | grep muestra la excepción en ambos | git revert | DET-3, DET-16 | pending | 1 |
| S1.T3 | DET-30: acotar "teach MUST (no skip)" → "teach MUST salvo teach_policy: skip auditado" (resto de la red intacto) en ambos archivos + regenerar bloque global | REQ-02 | developer | S1.T2 | `prompts/deterministic-rules.md`, `server/src/deckard_cain/dets_catalog.py`, `CLAUDE.md`(global, vía export) | `dkc-export-rules --global` corre OK + DET-30 condensado refleja el cambio | git revert | DET-16 | pending | 1 |
| **S1.GATE** | Gate sync S1 (T1) — validators + regen coherente | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket, spec | dkc-validate Ticket OK + dets regen | (no aplica) | DET-20, DET-23 | pending | 1 |

### Session 2 — Steps: teach-intake / design-shared / request-close / trigger [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | teach-intake §0b: si `teach_policy: skip` → skipped + no archivo, sin AskUserQuestion (aun en autopilot); condicionar el no-skip de REQ-05 al flag | REQ-03 | developer | S1.GATE | `prompts/steps/teach-intake/instructions.md`, `prompts/steps/teach-intake/gates.md` | lectura: rama skip explícita + gate de salida acepta skipped | git revert | DET-21 | pending | 2 |
| S2.T2 | `_design-shared` GATE1: confirmar que `teachings.intake: skipped` por flag cae en la rama válida (Ruta B) sin requerir razón manual extra (la da el flag) | REQ-03 | developer | S2.T1 | `prompts/steps/_design-shared.md` | lectura: GATE1 no bloquea con skip-por-flag | git revert | DET-21 | pending | 2 |
| S2.T3 | request-close teach-close: si `teach_policy: skip` → teachings.close skipped + no bloquea cierre | REQ-04 | developer | S1.GATE | `prompts/steps/request-close.md`, `prompts/steps/request-close/` | lectura: cierre no exige teach-close con flag | git revert | DET-22 | pending | 2 |
| S2.T4 | Parsing del trigger `skip teach`: `commands/dkc.md` (fila autopilot-trigger) + `request-intake §0` → setea teach_policy: skip + entry observable `teach-policy` | REQ-05 | developer | S1.T1 | `commands/dkc.md`, `prompts/steps/request-intake.md` | lectura: token reconocido + registra decisión | git revert | DET-3 | pending | 2 |
| **S2.GATE** | Gate sync S2 (T2 ⚑) — quality review steps + coherencia gates | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket, spec | review 10 dims + grep coherencia | (no aplica) | DET-20, DET-23 | pending | 2 |

### Session 3 — Validación + docs + close [tipo: auto] [tier: T1]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Dry-run conceptual: verificar el flujo skip de punta a punta sobre HOR-106 mismo (ya corre con skip) + validators del repo verdes | REQ-01..05 | reviewer | S2.GATE | (lectura/validación) | dkc-validate de tickets afectados OK | (no aplica) | DET-13 | pending | 3 |
| S3.T2 | Documentar la convención `teach_policy` (dónde, default, cómo activarla, auditoría) en DECKARD.md o docs de workflow | — | developer | S2.GATE | `DECKARD.md` o doc workflow | doc presente + coherente | git revert | DET-16 | pending | 3 |
| **S3.GATE** | Gate sync S3 (T1) — validación + docs + close (teach-close skipped por flag/override) | — | reviewer | S3.T1, S3.T2 | ticket | validators OK + docs | (no aplica) | DET-20, DET-22 | pending | 3 |

## Constraints
- DET-3 (request inmutable), DET-16 (propagación: dets_catalog + deterministic-rules + global block sincronizados), DET-20/23/27/29 (workflow), HOR-079 REQ-05 (el racional que se preserva con "explícito + auditado").

## Decisions

### DEC-LOCAL-01: flag ortogonal `teach_policy` (no modo nuevo)
- **Contexto**: el opt-out podía ser un modo (`super-no-teach`), un flag, o solo un token.
- **Opción elegida**: flag `teach_policy: auto|skip` (default auto), ortogonal al nivel de autopilot, seteable por token "skip teach". Confirmado por el dev ("un flag dentro del mismo autopilot").
- **Alternativas**: modo nuevo (descartado: ensucia el state machine, teach es ortogonal a la autonomía).
- **Consecuencias**: cero regresión (default auto); el skip es explícito + auditado.
- **Session**: design (2026-06-07).

## Acceptance checkpoints
- [ ] `teach_policy` en schema; ticket con el flag valida.
- [ ] DET-21/22/30 con carve-out; bloque global regenerado coherente.
- [ ] teach-intake §0b respeta el flag (skip sin preguntar en autopilot).
- [ ] request-close no exige teach-close con el flag.
- [ ] trigger "skip teach" setea el flag + audita.
- [ ] Default (sin flag) preserva el comportamiento actual (sin regresión).
- [ ] Docs de la convención.

## Archiving
Cuando deje de ser fuente de verdad: `/dkc-archive-spec SPEC-workflow-teach-policy-106 "razon"`.
