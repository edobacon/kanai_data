---
id: SPEC-workflow-judge-model-tiering-116
project: horadric
ticket: HOR-116
status: done
---

# Jueces dual-judge con modelo escalonado — balanced por defecto, reasoning solo en disputa

# Jueces dual-judge con modelo escalonado — balanced por defecto, reasoning solo en disputa

## Executive summary — lo que estas aprobando

**Que se quiere**: el loop dual-judge (DET-35) corre dos jueces ciegos en paralelo; hoy ambos usan el mismo tier de modelo (de facto el caro), lo que explica el ~2-4x de costo en gates T2/T3. La garantia de DET-35 es **dos señales INDEPENDIENTES que convergen**, no dos modelos caros. Opcion A del analisis post-DEC-003: correr ambos jueces en tier **`balanced`** por defecto y escalar a **`reasoning`** SOLO sobre los findings **en disputa** (cuando los jueces se contradicen) — un adjudicador reasoning desempata. El acuerdo (caso comun, incluido APPROVED por ambos) se queda en balanced.

**Por que no toca calidad**: dos jueces balanced independientes que coinciden siguen siendo dos señales independientes (la convergencia es la garantia, no el modelo). El unico caso ambiguo — contradiccion — es exactamente donde se gasta el modelo fuerte. Se preservan: independencia, ceguera, convergencia confirmed/suspect/escalated, tope 2, terminal states APPROVED/ESCALATED, DET-33 (verificar self-report) y DET-34 (kb_refs).

**Decisiones (super autopilot, racional en Decisions)**:

| # | Decision | Por que |
|---|----------|---------|
| 1 | Refinamiento del COMO, NO del contrato | El condensado de DET-35 (dos jueces + convergencia) no cambia → no se toca `dets_catalog.py` ni se regenera el bloque global. El tier vive en la regla integra + prompts |
| 2 | Escalacion SOLO sobre findings en disputa (no re-review completo) | Un adjudicador reasoning evalua los findings contradictorios; el resto se queda balanced. Minimo gasto del modelo fuerte |
| 3 | Reusa el bloque `tiers` (fast/balanced/reasoning) | DET-32 → reduce: sin schema nuevo, sin comando, sin step en `decisions.ts`. Solo parametriza el tier de los `dkc:agent-invocation` ya existentes |
| 4 | T2 = balanced→escalar; T3 igual + knob para pinnear reasoning | Proporcionalidad por stakes: T3 puede fijar reasoning para ambos jueces desde el inicio via project tiers (no default) |

**Que NO se hace**: no se toca el condensado de DET-35 ni se regenera CLAUDE.md global; no se agrega step a `decisions.ts`; no se baja la garantia (dos jueces ciegos + convergencia siguen intactos); no se elimina ningun juez (sigue habiendo DOS en paralelo).

**Tamano**: 1 session T2. Sin codigo — 3 ediciones de prompt (regla integra + loop + modo reviewer).

**Como vas a saber que funciona**:
- `grep` de la politica "Model tiering"/`balanced`/`reasoning` en las 3 capas (deterministic-rules DET-35, session-gate loop, reviewer modo).
- `dkc-validate-step-references` → 0 huerfanas; condensado DET-35 sin cambio (assert: `dets_catalog.py` no en el diff; 35 DETs).
- **Dogfood**: el S1.GATE corre el dual-judge tiered sobre su propio diff (jueces balanced; escalar a reasoning solo si discrepan) y registra el tier en prosa.

---

## Purpose

Parametrizar el tier de modelo de los jueces del loop dual-judge (DET-35) para reducir su costo en gates T2/T3 sin degradar su garantia: ambos jueces ciegos corren en `balanced` por defecto; la escalacion a `reasoning` se reserva para adjudicar los findings en disputa (contradiccion entre jueces). Es un refinamiento del COMO (regla integra DET-35 + loop en `session-gate.md` + modo en `reviewer.md`) que reusa el bloque `tiers` existente; no altera el contrato normativo (condensado/catalogo) ni introduce capa 4.

## Requirements

### REQ-IMPROVE-01: Politica "Model tiering" en la seccion integra de DET-35

> **Que cambia**: la regla integra DET-35 gana una sub-nota que fija el tier de los jueces (balanced default) y la condicion de escalacion (reasoning on-disagreement).
> **Por que**: es donde vive el COMO normativo del loop; sin esto el tier queda implicito y los hosts usan el modelo caro por defecto.

El sistema MUST agregar a la seccion `### DET-35` de `prompts/deterministic-rules.md` una sub-nota "Model tiering (HOR-116)" que establezca: (a) ambos jueces ciegos corren en tier `balanced` por defecto; (b) la escalacion a `reasoning` aplica SOLO a los findings en disputa (contradiccion entre jueces) via un adjudicador reasoning; (c) el acuerdo (incluido APPROVED por ambos) se resuelve en balanced; (d) la garantia (dos jueces independientes + convergencia) es independiente del tier — el tiering no la altera; (e) reusa el bloque `tiers` (DET-32, sin schema nuevo). Dejar explicito que esto NO cambia el contrato condensado de DET-35.

**Actor**: system · **Layers**: docs (prompts)

#### Acceptance
**Verificable**: `grep -nE "Model tiering|balanced|reasoning" prompts/deterministic-rules.md` matchea dentro de la seccion DET-35; el condensado en `dets_catalog.py` queda sin cambio.

### REQ-IMPROVE-02: Loop en session-gate.md — tier balanced + paso de escalacion

> **Que cambia**: el paso 1 del loop ("lanzar dos jueces") especifica `tier: balanced`; se agrega la condicion de escalacion a `reasoning` para los findings en disputa.
> **Por que**: es el step que el orquestador ejecuta; sin el tier explicito, sigue corriendo el modelo caro.

El sistema MUST: (a) en el paso 1 del "Loop dual-judge (DET-35)" de `prompts/steps/request-execute/session-gate.md`, anotar que los dos `dkc:agent-invocation` role reviewer corren en `tier: balanced` por defecto; (b) en el paso de decision gates de convergencia, agregar que un finding `escalated` (contradiccion entre jueces) gatilla un **adjudicador `tier: reasoning`** que evalua SOLO ese finding en disputa antes de cortar el loop o confirmarlo; (c) dejar claro que el acuerdo no escala (se queda balanced) y que T3 MAY pinnear reasoning para ambos jueces desde el inicio via project tiers; (d) registrar el tier usado en prosa del bloque Quality review.

**Actor**: system · **Layers**: docs (prompts)

<details><summary>Scenarios</summary>

#### Scenario: ambos jueces balanced coinciden (caso comun)
- **GIVEN** un gate T2 donde Judge A y Judge B (ambos balanced) emiten el mismo veredicto
- **WHEN** convergen
- **THEN** se resuelve en balanced sin escalar; APPROVED o confirmed segun el caso; tier registrado en prosa

#### Scenario: jueces contradictorios → adjudicador reasoning
- **GIVEN** un finding donde Judge A reporta CRITICAL/real y Judge B no
- **WHEN** se aplican las decision gates
- **THEN** ese finding (y solo ese) escala a un adjudicador `reasoning` que desempata; el resto se queda balanced

</details>

#### Acceptance
**Verificable**: `grep -nE "balanced|reasoning|adjudicador|tier:" prompts/steps/request-execute/session-gate.md` matchea en la seccion del loop.

### REQ-IMPROVE-03: Modo dual-judge en reviewer.md — tier por rol

> **Que cambia**: el "Modo dual-judge" documenta el tier de cada rol (juez = balanced; adjudicador = reasoning on-disagreement).
> **Por que**: el agente define los roles del loop; el tier es parte de su contrato de rol.

El sistema MUST documentar en `## Modo dual-judge` de `prompts/agents/reviewer.md` que el rol Juez corre en `balanced` por defecto y que la disputa entre jueces invoca un adjudicador en `reasoning` sobre el finding contradictorio, manteniendo la independencia y ceguera. El fix-agent no cambia de tier (sigue su tier de developer).

**Actor**: system · **Layers**: docs (prompts)

#### Acceptance
**Verificable**: `grep -nE "balanced|reasoning|adjudicador" prompts/agents/reviewer.md` matchea en el Modo dual-judge.

### REQ-PRESERVE-01: Contrato y garantia de DET-35 intactos

> **Que cambia**: nada del contrato — sigue habiendo dos jueces ciegos en paralelo, convergencia, tope 2, terminal states, DET-33/34.
> **Por que**: el tiering es solo costo; la calidad no se toca (DET-7 regression del propio sistema).

El sistema MUST mantener: (a) el condensado de DET-35 en `dets_catalog.py` sin cambio (assert: no en el diff; `len(DETS_CONDENSED)==35`); (b) sin step nuevo en `decisions.ts` (el outcome sigue `dual-judge`); (c) la garantia textual "dos jueces ciegos + confirmar solo si ambos coinciden" intacta; (d) cross-refs sin huerfanas.

**Actor**: system · **Layers**: docs

#### Acceptance
**Verificable**: `git diff --name-only` NO incluye `dets_catalog.py` ni `decisions.ts`; `dkc-validate-step-references` 0 huerfanas; `len(DETS_CONDENSED)==35`.

## Tasks

### Session 1 — Jueces dual-judge con modelo escalonado [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Sub-nota "Model tiering (HOR-116)" en la seccion integra DET-35 (balanced default + escalacion reasoning on-disagreement + garantia independiente del tier) | REQ-IMPROVE-01 | developer | — | prompts/deterministic-rules.md | grep Model tiering/balanced/reasoning en DET-35; condensado sin cambio | git revert | DET-16, DET-32 | done | 1 |
| S1.T2 | Loop en session-gate.md: paso 1 `tier: balanced` + paso de escalacion `reasoning` sobre findings en disputa + registro de tier en prosa | REQ-IMPROVE-02 | developer | S1.T1 | prompts/steps/request-execute/session-gate.md | grep tier/adjudicador en el loop | git revert | DET-9, DET-23, DET-35 | done | 1 |
| S1.T3 | Modo dual-judge en reviewer.md: tier por rol (juez balanced; adjudicador reasoning on-disagreement) | REQ-IMPROVE-03 | developer | S1.T1 | prompts/agents/reviewer.md | grep balanced/reasoning/adjudicador en el modo | git revert | DET-9, DET-35 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (T2)** — DOGFOOD: dual-judge tiered (jueces balanced; escalar a reasoning solo si discrepan) sobre el propio diff + self-report (DET-33) + assert negativo (condensado/decisions.ts sin tocar) + commits DET-27 (local) + decidir | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | grep 3 capas + step-refs 0 huerfanas + 35 DETs + git status limpio post-jueces + tabla veredictos + tier en prosa | (no aplica) | DET-20, DET-23, DET-33, DET-35 | done | 1 |

## Constraints

- **DET-32** (necesidad/reuso): reusa `tiers` + el loop existente; veredicto reduce. No schema, no comando, no step.
- **No tocar el contrato**: condensado DET-35 + bloque global CLAUDE.md sin cambio (el tiering es COMO, no QUE).
- **Preservar la garantia**: dos jueces ciegos + convergencia + tope 2 intactos; la escalacion DEBE cubrir el caso disputa (contradiccion) para no introducir falsos negativos.
- **DET-33/34**: aplican a cada juez/adjudicador/fixer independiente del tier.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Falso negativo de dos balanced que coinciden por error | low-medium | bug escapado | La escalacion cubre el caso disputa; T3 MAY pinnear reasoning para ambos desde el inicio (knob por stakes); la independencia de dos jueces sigue |
| Over-scope: tocar el condensado/regen | medium | deuda + contrato alterado | REQ-PRESERVE-01 lo prohibe (assert negativo en el gate) |
| Escalacion mal definida (re-review completo en vez de findings en disputa) | medium | gasto que anula el ahorro | REQ-IMPROVE-02: escalar SOLO findings contradictorios via adjudicador |

## Open questions

- [ ] Ninguna — alcance cerrado; super autopilot resuelve con racional documentado.

## Decisions

### DEC-LOCAL-01: Refinamiento del COMO, no del contrato (no tocar condensado/regen)
- **Contexto**: DET-35 tiene contrato condensado (catalogo) + regla integra + prompts
- **Drivers**: el tier de modelo es un detalle de ejecucion/costo, no de la garantia normativa (dos jueces + convergencia)
- **Cascada DET-32**: reduce — parametriza el tier de invocaciones existentes; sin schema/comando/step
- **Opcion elegida**: editar solo la regla integra + loop + modo reviewer; condensado y CLAUDE.md global sin cambio
- **Alternativa**: reescribir el condensado + regen (descartada — over-scope; el contrato no cambia)
- **Session**: design (S0)

### DEC-LOCAL-02: Escalacion solo sobre findings en disputa
- **Contexto**: la disputa entre jueces es el caso ambiguo
- **Opcion elegida**: un adjudicador `reasoning` evalua SOLO el/los finding(s) contradictorios; el acuerdo se queda balanced
- **Alternativa**: re-review completo con reasoning ante cualquier disputa (descartada — gasto que anula el ahorro)
- **Session**: design (S0)

### DEC-LOCAL-03: balanced default para ambos tiers, knob reasoning en T3
- **Contexto**: T3 es mas alto-stakes que T2
- **Opcion elegida**: default balanced→escalar en T2 y T3; T3 MAY pinnear reasoning para ambos jueces via project tiers (no default)
- **Alternativa**: reasoning fijo en T3 siempre (descartada — el default proporcional ya cubre; el knob queda disponible)
- **Session**: design (S0)

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-IMPROVE-01..03 pasan
- [x] **Costo**: el tiering esta documentado en las 3 capas (balanced default + escalacion reasoning on-disagreement)
- [x] **No-regresion**: condensado DET-35 + decisions.ts sin cambio; garantia intacta (REQ-PRESERVE-01)
- [x] **Cross-refs**: 0 refs huerfanas
- [x] **Dogfood**: el S1.GATE corre el dual-judge tiered sobre el propio diff y registra el tier en prosa
