---
id: SPEC-workflow-trigger-rules-advisory-115
project: horadric
ticket: HOR-115
status: done
---

# Trigger rules con tiers de costo — capa advisory que modula la intensidad del review

# Trigger rules con tiers de costo — capa advisory que modula la intensidad del review

## Executive summary — lo que estas aprobando

**Que se quiere**: hoy el tier de validacion (T0-T3) lo fija el architect en design por heuristica; el quality review (DET-23) corre con la intensidad que ese tier dicta. No hay una capa que, en base a SEÑALES del cambio (evento × path sensible × tamano de diff), **recomiende subir** esa intensidad — por ejemplo, "este diff toca `auth/**` y supera 400 lineas → conviene 4 lentes o dual-judge, aunque la heuristica base diera T1". gentle-ai (Patron D, DEC-003 — `docs/trigger-rules.md`) resuelve esto con **trigger rules**: recomendaciones ADVISORY (no gates) con modelo de costo por tiers que el orquestador decide cuando accionar. La filosofia verbatim: *"organic recommendations, not enforced checkpoints ... the AI orchestrator decides when to act on it"*.

**La tension central** (y como la resolvemos): para DKC, "recomendaciones organicas, no gates" es el **OPUESTO** de los 35 DETs deterministas — el diferencial de DKC en Horadric Cube es justamente el determinismo y la auditabilidad. Por eso esta capa se **acota** quirurgicamente:

- **Sigue siendo gate duro (determinista, intacto)**: la EXISTENCIA del quality review (DET-23), la naturaleza bloqueante de `iterate`/`escalate` (DET-14), la decision del gate (DET-20), la convergencia del dual-judge (DET-35), todos los validators y la persistencia. Ningun DET se vuelve advisory.
- **Admite modo advisory (lo unico)**: la **seleccion de INTENSIDAD** del review — es decir, QUE tier de review correr (cuantas lentes / single-pass vs dual-judge). Las trigger rules pueden **RECOMENDAR subir** la intensidad; nunca bajar el piso que asigno el design.
- **Ratchet unidireccional**: una trigger rule solo sube intensidad. El piso determinista de DET-20/DET-23 es inviolable. Esto preserva el determinismo (nunca se revisa MENOS de lo que el DET exige) mientras suma la modulacion organica de gentle-ai (a veces se revisa MAS).
- **Auditabilidad sin determinismo**: cada evaluacion (señales → tier recomendado → aplicado/declinado + razon) se registra como **prosa** en el bloque `**Quality review (DET-23)**` de la session — visible en HC, auditable post-mortem, SIN convertirla en un validator (eso la volveria determinista y romperia su naturaleza advisory).

**Decisiones criticas (resueltas en super autopilot — racional en Decisions)**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **NO es un DET** — vive como capa advisory (doc + rule `should` + wiring), NO en `dets_catalog.py` | Un DET es determinista/bloqueante por definicion; una trigger rule es lo contrario. Meterla al catalogo de DETs seria una contradiccion en los terminos y rompe la semantica de "DET = contrato no-negociable" |
| 2 | **Capas 3-5 de RULE-009 = N/A** (sin validator/comando/a-hook) | RULE-009 rige la materializacion de **DETs**; esto NO es un DET → RULE-009 no rige, no hay capas 3-5 que materializar (su seccion Excepciones refuerza que ni las DETs declarativas las requieren). Forzar un validator/a-hook convertiria la recomendacion en gate → contradice el ticket. Advisory-only ES el objetivo aqui, no un defecto |
| 3 | **Ratchet unidireccional** — solo sube intensidad, nunca baja el piso | Resuelve la tension determinismo↔advisory: el no-determinismo queda acotado a "revisar de mas", jamas a "revisar de menos". El piso DET-20/23 se respeta siempre |
| 4 | **Auditabilidad en prosa** del bloque Quality review (no nuevo step en `decisions.ts`) | Un step nuevo en el enum seria capa 4 (validator) = determinista. La prosa en el bloque del gate da trazabilidad en HC sin romper la naturaleza advisory |
| 5 | **Nivel `should`** (no inventar `advisory`) + **scope `global`** | El enum `RuleLevelEnum` ya tiene `should` (recomendacion no bloqueante) — semantica exacta. scope global porque el mecanismo es DKC-core (cross-project), como RULE-009 |

**Riesgos principales y mitigacion**:

- **Erosionar el determinismo de DKC** → ratchet unidireccional + boundary explicito (los DETs nunca se vuelven advisory; solo la intensidad por encima del piso).
- **Over-build (DET-32)** → cascada registrada: reusa nivel `should` (sin schema), patron de bloque `config` (como `mutation`), prosa del bloque del gate (sin step nuevo). Drop de DET/validator/comando.
- **Capa muerta (declarada pero no consultada)** → wiring (capa 2) en los 6 puntos donde se asigna/confirma el tier (intake-explore + 4 design + session-gate), con ref explicita a la rule/doc.
- **Diff >400 no conocido en design** → la re-evaluacion en `session-gate` (con diff REAL) es el punto donde esa señal se materializa; design usa señales conocidas (path, evento, work_type).

**Que NO se hace**:

- No se crea un DET ni se toca `dets_catalog.py` (no es determinista).
- No se crea validator/comando/a-hook (capas 3-5) — seria volverla gate.
- No se crea un step nuevo en `decisions.ts` (la auditabilidad vive en prosa del gate).
- No se baja ningun piso determinista (ratchet solo sube).
- No se activa el bloque `trigger_rules:` en horadric (queda comentado opt-in, fallback = comportamiento actual).

**Tamano estimado**: 1 session (~2-2.5h), T2 (por bump advisory dogfood — ver "Como vas a saber que funciona"). Sin codigo: doc + rule (markdown) + wiring de prompts + bloque config comentado.

**Como vas a saber que funciona**:

- `dkc-validate Rule projects/horadric/rules/workflow/RULE-workflow-trigger-rules-advisory-013.md` → valid:true; `dkc-reindex horadric` la indexa.
- `grep -nE "trigger.rules|trigger-rules|RULE-workflow-trigger-rules-advisory-013"` matchea en los 6 steps de wiring + config.yaml.
- `docs/trigger-rules.md` existe con las secciones: filosofia, boundary advisory/hard-gate, 3 tiers mapeados a DKC, default rules, ratchet, auditabilidad.
- `dkc-validate-step-references` → 0 refs huerfanas; NO aparece `35`/DET nuevo en `dets_catalog.py` (assert negativo: no es DET).
- **Dogfood**: este ticket toca `prompts/**` (path workflow-sensible) post-design → la propia trigger rule recomienda bump del piso (doc-only ≈ T0/T1) a **T2 dual-judge**; el S1.GATE corre el dual-judge sobre el propio diff y registra la evaluacion advisory en prosa (valida el patron en vivo, como HOR-114).

---

## Purpose

Anadir a DKC una capa de **trigger rules advisory** con modelo de costo por tiers (adaptacion del Patron D de gentle-ai, DEC-003): recomendaciones — no gates — que modulan la INTENSIDAD del quality review (DET-23) segun evento × path × tamano de diff. La capa se acota para preservar el determinismo y la auditabilidad que diferencian a DKC: **solo** modula la seleccion de intensidad (que tier de review correr), mediante un **ratchet unidireccional** (recomienda subir, nunca baja el piso de DET-20/DET-23), y registra cada evaluacion en **prosa auditable** del bloque del gate. Se materializa como capa advisory (NO es un DET → RULE-009 no rige; capas 3-5 N/A): un doc DKC-core (`docs/trigger-rules.md`), una rule `level: should` scope global, y wiring (capa 2) en los puntos donde se asigna/confirma el tier (intake-explore + design-{tipo} + session-gate), mas un bloque opt-in `trigger_rules:` en `config.yaml`. NO introduce un DET, ni validator/comando/a-hook, ni step nuevo en `decisions.ts` — eso convertiria la recomendacion en gate y contradiria el proposito.

## Requirements

### REQ-IMPROVE-01: Doc DKC-core `docs/trigger-rules.md` con filosofia, boundary y modelo de 3 tiers

> **Que cambia**: aparece un doc transversal que define que SON las trigger rules en DKC, donde termina lo advisory y empieza el gate duro, y el catalogo de tiers de costo por defecto.
> **Por que**: el corazon del ticket es el boundary explicito advisory↔determinista. Sin un doc que lo fije, la capa seria ambigua y erosionaria el determinismo que diferencia a DKC.

El sistema MUST crear `docs/trigger-rules.md` (par de `docs/enforcement-pattern.md`) con, como minimo: (a) **Que son** — recomendaciones organicas, no gates (filosofia gentle-ai, con la adaptacion DKC); (b) **Boundary advisory/hard-gate** — tabla explicita de que sigue siendo gate duro (los 35 DETs, existencia del review, decision del gate, convergencia dual-judge, validators, persistencia) vs que admite modo advisory (solo la seleccion de INTENSIDAD del review por encima del piso); (c) **Ratchet unidireccional** — una trigger rule solo recomienda SUBIR intensidad; nunca baja el piso de DET-20/DET-23; (d) **Modelo de 3 tiers mapeado a DKC**: Tier 1 advisory (evento pre-commit/pre-push o cambio chico → review light / 1 lente, ~1x) · Tier 2 strong (path sensible `auth/**`/`security/**`/`update/**` o, en deckard self-dev, `prompts/**`/`commands/**`/`server/**`, O diff >400 lineas → review standard/exhaustive multi-dimension, ~4x) · Tier 3 strong (post-fase de design/apply en path sensible → dual-judge DET-35, ~4+3×hallazgos); (e) **Default trigger rules** — tabla `evento × path × diff_size → tier recomendado`; (f) **Auditabilidad** — convencion de registrar la evaluacion (señales → tier recomendado → aplicado/declinado + razon) en prosa del bloque `**Quality review (DET-23)**`.

**Actor**: system · **Layers**: docs

#### Acceptance
**Verificable**: `test -f docs/trigger-rules.md`; `grep -nE "advisory|ratchet|Tier 1|Tier 2|Tier 3|boundary|hard.gate|gate duro" docs/trigger-rules.md` matchea las 6 secciones; la tabla de boundary lista explicitamente "los 35 DETs" como gate duro y "intensidad del review" como advisory.

### REQ-IMPROVE-02: Rule advisory `RULE-workflow-trigger-rules-advisory-013` (level: should, scope: global)

> **Que cambia**: aparece una rule consultable de primera clase (HC la lista) que codifica el contrato: consultar trigger rules como input advisory al tier; solo suben; el orquestador decide y registra.
> **Por que**: el doc explica; la rule es lo que el wiring (capa 2) referencia y lo que el viewer surface al dev. Es la capa 1/2 del contrato sin las capas 3-5 (advisory por diseno).

El sistema MUST crear `projects/horadric/rules/workflow/RULE-workflow-trigger-rules-advisory-013.md` con `level: should`, `scope: global`, secciones What/Why/Where/When y, en el cuerpo: (a) las trigger rules son input ADVISORY a la seleccion de tier (DET-20) y de intensidad de review (DET-23/DET-35), NO gates; (b) **ratchet unidireccional** — solo recomiendan subir intensidad, nunca bajan el piso determinista; (c) el orquestador DECIDE accionar o no (puede declinar con razon); (d) cada evaluacion se registra en prosa del bloque del gate (auditabilidad); (e) referencia a `docs/trigger-rules.md` para el catalogo de tiers; (f) interaccion explicita con DET-20/DET-23/DET-35 y nota de que NO es un DET (RULE-009 no rige; capas 3-5 N/A).

**Actor**: system · **Layers**: docs (KB rule)

#### Acceptance
**Verificable**: `dkc-validate Rule projects/horadric/rules/workflow/RULE-workflow-trigger-rules-advisory-013.md` → valid:true; frontmatter `level: should` y `scope: global`; `dkc-reindex horadric` la indexa (aparece en index.db).

### REQ-IMPROVE-03: Wiring (capa 2) — consult-point advisory en intake-explore + design-{tipo} + session-gate

> **Que cambia**: los 6 steps donde se asigna o confirma el tier ganan una referencia: "consultar las trigger rules (RULE-013 / docs) como input advisory al elegir intensidad; pueden subir, nunca bajar el piso; registrar la evaluacion".
> **Por que**: una rule advisory declarada pero no referenciada queda inerte. El wiring es lo que la pone en el flujo, en el momento exacto donde se decide la intensidad (DET-16 propagacion).

El sistema MUST agregar referencias minimas y aditivas (sin alterar la heuristica determinista existente) en: (a) `prompts/steps/intake-explore/instructions.md` (esqueleto del plan de sessions — consultar trigger rules al estimar tier, señales conocidas: evento, path, work_type); (b) los 4 design steps `design-feature.md`, `design-fix.md`, `design-improvement.md`, `design-refactor.md` (al refinar el tier por session — consultar trigger rules como input advisory); (c) `prompts/steps/request-execute/session-gate.md` (re-evaluar trigger rules con el diff REAL antes del decision point — es donde la señal `diff >400` se materializa — y registrar la evaluacion en prosa del bloque `**Quality review (DET-23)**`). Cada referencia apunta a `RULE-workflow-trigger-rules-advisory-013` y/o `docs/trigger-rules.md`, deja claro el ratchet unidireccional, y NO convierte la recomendacion en gate (sin a-hook, sin bloqueo).

**Actor**: system · **Layers**: docs (prompts)

<details><summary>Scenarios de validacion</summary>

#### Scenario: design de un fix chico en path sensible
- **GIVEN** un fix de 1 archivo que la heuristica base daria T1, pero toca `auth/**`
- **WHEN** design-fix consulta las trigger rules
- **THEN** la trigger rule de Tier 2 recomienda subir a T2 (multi-dimension); el orquestador acciona o declina con razon, registrado en prosa; el piso T1 nunca se baja

#### Scenario: gate con diff grande no anticipado en design
- **GIVEN** una session estimada T1 cuyo diff real supera 400 lineas
- **WHEN** session-gate re-evalua las trigger rules con el diff real
- **THEN** recomienda bump a T2; la evaluacion (señales → recomendado → aplicado) queda en el bloque Quality review

#### Scenario: cambio doc-only sin señales
- **GIVEN** una session T0 de solo markdown sin path sensible ni diff grande
- **WHEN** se consultan las trigger rules
- **THEN** ninguna dispara; el tier queda en el piso del design; se registra "trigger-rules: sin señales, mantiene piso"

</details>

#### Acceptance
**Verificable**: `grep -lE "trigger.rules|RULE-workflow-trigger-rules-advisory-013|trigger-rules\.md" prompts/steps/intake-explore/instructions.md prompts/steps/design-feature.md prompts/steps/design-fix.md prompts/steps/design-improvement.md prompts/steps/design-refactor.md prompts/steps/request-execute/session-gate.md | wc -l` == 6; `dkc-validate-step-references` → 0 huerfanas.

### REQ-IMPROVE-04: Bloque opt-in `trigger_rules:` en config.yaml (fallback documentado)

> **Que cambia**: `config.yaml` gana un bloque comentado `trigger_rules:` que permite a un proyecto tunear sus paths sensibles / umbrales de diff / mapeo a tier.
> **Por que**: los paths sensibles difieren por proyecto (un web app: `auth/**`; deckard self-dev: `prompts/**`). El patron de bloque opt-in (como `tiers`/`mutation`) es el mecanismo idiomatico, con fallback al default del doc cuando esta ausente.

El sistema MUST agregar a `projects/horadric/config.yaml` un bloque comentado `trigger_rules:` siguiendo el patron de `mutation:` (HOR-105): comentario que documenta el schema (`enabled`, `rules[]` con `event`/`path_pattern`/`diff_size_min`/`diff_size_max`/`recommended_tier`/`escalate_to_dual_judge`) y el fallback explicito ("ausencia del bloque = usar los default tiers de `docs/trigger-rules.md`; comportamiento actual: tier asignado por design"). Queda comentado (no activado) en horadric.

**Actor**: system · **Layers**: config

#### Acceptance
**Verificable**: `grep -nE "trigger_rules|HOR-115" projects/horadric/config.yaml` matchea el bloque comentado; el bloque documenta el fallback; no altera el YAML parseado (queda comentado).

### REQ-PRESERVE-01: Sin regresion — los DETs siguen deterministas, sin nuevo DET ni validator

> **Que cambia**: nada en el comportamiento determinista — ningun DET se vuelve advisory, la heuristica de tier existente sigue, no se agrega DET al catalogo ni step al schema de decisiones.
> **Por que**: el diferencial de DKC es el determinismo; la capa advisory se suma SIN erosionarlo (DET-7 regression del propio sistema).

El sistema MUST mantener: (a) `dets_catalog.py` con 35 DETs (sin nueva entry — assert negativo: trigger rules NO es un DET); (b) `decisions.ts` sin step nuevo (sin cambio de enum); (c) la heuristica de tier en intake-explore/design intacta como piso; (d) validators existentes verdes (`tsx schemas/decisions.ts`, `pytest test_dets_catalog.py`).

**Actor**: system · **Layers**: config

#### Acceptance
**Verificable**: `python -c "from server.src.deckard_cain.dets_catalog import DETS_CONDENSED; assert 36 not in DETS_CONDENSED and len(DETS_CONDENSED)==35"`; `git diff --name-only` NO incluye `commands/lib/schemas/decisions.ts` ni `server/src/deckard_cain/dets_catalog.py`; `tsx schemas/decisions.ts` y `pytest test_dets_catalog.py` verdes.

## Tasks

### Session 1 — Capa advisory de trigger rules con tiers de costo [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `docs/trigger-rules.md`: filosofia advisory + boundary advisory/hard-gate (35 DETs duros vs intensidad advisory) + ratchet unidireccional + 3 tiers mapeados a DKC + default trigger rules + convencion de auditabilidad en prosa | REQ-IMPROVE-01 | developer | — | docs/trigger-rules.md | `test -f` + `grep` 6 secciones | git revert | DET-2, DET-16 | done | 1 |
| S1.T2 | Crear `RULE-workflow-trigger-rules-advisory-013.md` (`level: should`, `scope: global`, What/Why/Where/When + ratchet + interaccion DET-20/23/35 + "no es DET") + `dkc-reindex horadric` | REQ-IMPROVE-02 | developer | S1.T1 | projects/horadric/rules/workflow/RULE-workflow-trigger-rules-advisory-013.md | `dkc-validate Rule` valid:true + reindex | rm + reindex | DET-2, DET-11 | done | 1 |
| S1.T3 | Wiring capa 2: ref advisory a RULE-013/doc en intake-explore + 4 design steps + session-gate (re-eval con diff real + registro en prosa); bloque opt-in `trigger_rules:` comentado en config.yaml | REQ-IMPROVE-03, REQ-IMPROVE-04 | developer | S1.T1, S1.T2 | prompts/steps/intake-explore/instructions.md, prompts/steps/design-feature.md, prompts/steps/design-fix.md, prompts/steps/design-improvement.md, prompts/steps/design-refactor.md, prompts/steps/request-execute/session-gate.md, projects/horadric/config.yaml | `grep` 6 steps + config + `dkc-validate-step-references` 0 huerfanas | git revert | DET-9, DET-16, DET-20, DET-23 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier T2)** — DOGFOOD: la propia trigger rule (path `prompts/**` post-design) recomienda bump del piso doc-only a T2 → loop dual-judge (DET-35, dos jueces ciegos) sobre el diff + verificacion self-report (DET-33) + assert negativo (no DET/no validator nuevo) + commits DET-27 (local, push diferido) + decidir | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido + rule valida + wiring 6/6 + assert negativo (35 DETs, sin step nuevo) + git status submodulo limpio post-jueces + tabla veredictos + evaluacion advisory en prosa | (no aplica) | DET-20, DET-23, DET-33, DET-35 | done | 1 |

### Task contract (resumen)

```
S1.T1: doc trigger-rules.md — files: docs/trigger-rules.md — validation: test -f + grep 6 secciones — rollback: git revert — rules: [DET-2, DET-16]
S1.T2: rule advisory should — files: RULE-workflow-trigger-rules-advisory-013.md — validation: dkc-validate Rule valid:true + reindex — rollback: rm + reindex — rules: [DET-2, DET-11]
S1.T3: wiring 6 steps + config block — files: intake-explore, 4 design, session-gate, config.yaml — validation: grep 6/6 + step-references 0 huerfanas — rollback: git revert — rules: [DET-9, DET-16, DET-20, DET-23]
S1.GATE: dogfood dual-judge + assert negativo + verify + commits — files: ticket — rollback: n/a — rules: [DET-20, DET-23, DET-33, DET-35]
```

## Constraints

- **RULE-workflow-enforcement-pattern-009** (must) — rige la materializacion de **DETs**; trigger rules NO son un DET → RULE-009 no rige, capas 3-5 (validator/comando/a-hook) N/A (su seccion Excepciones refuerza que ni las DETs declarativas las requieren). Capas 1 (doc + rule) + 2 (wiring en steps) presentes.
- **No es un DET** — NO tocar `dets_catalog.py` ni `deterministic-rules.md` (catalogo DET). Un DET es determinista; esto es lo opuesto.
- **Ratchet unidireccional** — el wiring debe dejar explicito que las trigger rules solo SUBEN intensidad; el piso de DET-20/DET-23 es inviolable.
- **Auditabilidad sin determinismo** — la evaluacion se registra en prosa del bloque del gate, NO como step en `decisions.ts` (eso seria capa 4 = determinista).
- **DET-16 (propagacion)** — la referencia advisory se propaga a los 6 puntos donde se decide el tier; consistencia doc↔rule↔wiring.
- **Fidelidad gentle-ai** — recomendaciones organicas, no gates; el orquestador decide cuando accionar; modelo de 3 tiers de costo.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Erosionar el determinismo de DKC (su diferencial) | medium | alto (identidad del producto) | Ratchet unidireccional + boundary explicito: ningun DET se vuelve advisory; solo la intensidad por encima del piso |
| Over-build (DET/validator/comando/step nuevo) | medium | deuda + contradiccion del proposito | Cascada DET-32 registrada: reusa `should` + patron config + prosa del gate; drop de DET/validator/comando/step |
| Capa muerta (declarada, no consultada) | medium | inutil | Wiring (capa 2) en los 6 puntos de asignacion/confirmacion del tier + ref a rule/doc |
| Diff >400 no conocido en design | low | recomendacion incompleta en design | Re-evaluacion en session-gate con diff REAL es el punto canonico de esa señal |
| Percibida como "gate blando" que el LLM ignora | medium | recomendacion sin efecto | El registro en prosa del gate hace visible cuando se acciono/declino (auditabilidad), creando presion social sin volverla gate |

## Open questions

- [ ] Ninguna — alcance cerrado; super autopilot resuelve las decisiones con racional documentado.

## Decisions

### DEC-LOCAL-01: La capa NO es un DET — vive como advisory (doc + rule `should` + wiring)
- **Contexto**: el request es explicito en que las trigger rules son "el OPUESTO de los 32 DETs deterministas" (el request dice "32" — cifra historica de DEC-003; hoy son **35** DETs: DET-1..DET-35)
- **Cascada DET-32 (necessity-assessment)**: ¿necesita ser DET? No — un DET es un contrato no-negociable/bloqueante; una recomendacion organica es lo contrario. Meterla al catalogo de DETs seria contradiccion semantica
- **Opcion elegida**: capa advisory = doc DKC-core + rule `level: should` scope global + wiring (analogo a capas 1/2, refs desde steps); no es un DET → RULE-009 no rige, capas 3-5 N/A
- **Alternativas**: DET-36 con validator (descartada — convierte la recomendacion en gate, rompe el proposito y erosiona la semantica de DET)
- **Consecuencias**: 35 DETs sin cambios; la capa advisory coexiste sin tocar el motor determinista
- **Session**: design (S0)

### DEC-LOCAL-02: Ratchet unidireccional — las trigger rules solo suben intensidad
- **Contexto**: la tension determinismo↔advisory (el diferencial de DKC vs la filosofia organica de gentle-ai)
- **Drivers**: hay que sumar la modulacion organica sin permitir que una recomendacion baje el rigor que un DET exige
- **Opcion elegida**: las trigger rules solo RECOMIENDAN subir intensidad; el piso de DET-20/DET-23 es inviolable. El no-determinismo queda acotado a "revisar de mas"
- **Alternativas**: trigger rules bidireccionales (descartada — permitiria revisar de menos que el piso → erosiona el determinismo)
- **Consecuencias**: el peor caso de una trigger rule es costo extra de review, nunca menos rigor
- **Session**: design (S0)

### DEC-LOCAL-03: Auditabilidad en prosa del bloque del gate (no step nuevo en decisions.ts)
- **Contexto**: DKC valora la auditabilidad; pero un step en el enum cerrado de `decisions.ts` es capa 4 = validator = determinista
- **Cascada DET-32**: ¿se reduce a reuso? Si — el bloque `**Quality review (DET-23)**` de la session ya es prosa renderizada por HC; registrar ahi la evaluacion (señales → recomendado → aplicado/declinado + razon) da trazabilidad sin schema nuevo
- **Opcion elegida**: registro en prosa del bloque del gate
- **Alternativas**: step `trigger-eval` en `decisions.ts` (descartada — lo volveria determinista, contradice DEC-LOCAL-01)
- **Consecuencias**: auditable en HC + post-mortem; sin tocar el enum cerrado
- **Session**: design (S0)

### DEC-LOCAL-04: Nivel `should` + scope `global` para la rule
- **Contexto**: el schema `RuleLevelEnum = ['must','should','may']` no tiene `advisory`
- **Drivers**: `should` es semanticamente "recomendacion no bloqueante" — exactamente trigger-rule advisory. El mecanismo es DKC-core (cross-project) → scope global (como RULE-009)
- **Opcion elegida**: `level: should`, `scope: global`
- **Alternativas**: agregar `advisory` al enum (descartada — over-build; `should` ya lo cubre); scope horadric (descartada — el mecanismo es cross-project)
- **Session**: design (S0)

### DEC-LOCAL-05: Bloque `trigger_rules:` opt-in comentado (no activado)
- **Contexto**: los paths sensibles difieren por proyecto; el patron de bloque opt-in (`tiers`/`mutation`) es idiomatico
- **Opcion elegida**: documentar el schema comentado en config.yaml con fallback explicito; no activarlo en horadric (default = tiers del doc / comportamiento actual)
- **Alternativas**: activarlo en horadric (descartada — sin calibrar; el default del doc alcanza para self-dev)
- **Session**: design (S0)

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-IMPROVE-01..04 pasan
- [x] **Boundary**: `docs/trigger-rules.md` y RULE-013 fijan explicitamente que los 35 DETs siguen duros y solo la intensidad es advisory (ratchet unidireccional)
- [x] **No-regresion determinista**: 35 DETs sin cambios, sin step nuevo en `decisions.ts` (REQ-PRESERVE-01)
- [x] **Rule**: `dkc-validate Rule` valid:true; indexada
- [x] **Wiring**: 6/6 steps referencian la rule/doc; 0 refs huerfanas
- [x] **Dogfood**: el S1.GATE corre el loop dual-judge (bump advisory) sobre el propio diff y registra la evaluacion en prosa
