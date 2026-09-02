---
id: SPEC-workflow-dual-judge-loop-114
project: horadric
ticket: HOR-114
status: done
---

# DET-35 — Loop adversarial dual-judge en el quality gate (DET-23)

# DET-35 — Loop adversarial dual-judge en el quality gate (DET-23)

## Executive summary — lo que estas aprobando

**Que se quiere**: hoy el quality gate (DET-23) corre **un solo reviewer en una sola pasada** y la decision `iterate` (DET-14) es **manual** — no hay loop de convergencia. Un unico revisor tiene sesgo; cuando recomienda `iterate`, el orquestador re-trabaja y vuelve a evaluar a mano, sin tope ni re-judge automatizado. gentle-ai (Patron A, DEC-003 — skill judgment-day) resuelve esto con un **loop adversarial dual-judge**: dos jueces ciegos en paralelo → se confirma un hallazgo SOLO si ambos coinciden → un fix-agent quirurgico arregla solo lo confirmado → RE-JUDGE en paralelo → repetir hasta APPROVED o ESCALATED, con tope de 2 iteraciones. DET-35 codifica este contrato en DKC como **modo reforzado de DET-23 para gates T2/T3** (no reemplaza el reviewer single-pass en T0/T1).

**Decisiones criticas que necesitan tu OK** (resueltas en super autopilot — racional abajo):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | DET nueva (DET-35) que REFUERZA DET-23/14/13, no un bullet en DET-23 | DET-23 define el quality review de 10 dimensiones (single-pass); DET-35 materializa el COMO del modo reforzado (dos jueces ciegos + convergencia + fix quirurgico + re-judge + tope) con bite verificable (validator step + a-hook + entry T2) y observabilidad en HC. Mismo patron que DET-31/32/33/34 |
| 2 | Capa 3 (comando) = **N/A** — el loop es orquestacion del gate, no mutacion | A diferencia de DET-34 (que produce un manifest → comando), el loop dual-judge NO muta estado: reusa el **reviewer aislado** (DET-30·REQ-10) duplicado, `dkc-resolve-kb` (DET-34, kb_refs a los jueces), `dkc-record-decision` (entry observable) y la verificacion de self-report (DET-33). Cascada DET-32 → **drop** (racional en DEC-LOCAL-02). Mismo caso que DET-33 (sin comando nuevo) |
| 3 | Aplica solo a gates **T2/T3** (modo reforzado), single-pass en T0/T1 | Costo declarado ~4 + 3×hallazgos (DEC-003): insostenible para T0/T1. Proporcionalidad por tier (patron DET-31/32/33/34) |
| 4 | Capa 4 = step nuevo `dual-judge` (no sobrecargar `gate-decision` ni `self-report-verification`) | `gate-decision` registra el outcome del gate (continue/iterate/...); `dual-judge` registra el outcome del LOOP de convergencia (approved/escalated). Son ortogonales. Mismo criterio que DET-33/34 que agregaron su propio step |
| 5 | Terminal states = APPROVED / ESCALATED; choices del step = `approved \| escalated \| not-applicable` | Verbatim gentle-ai: "Terminal states are only APPROVED or ESCALATED". `not-applicable` documenta el gate T0/T1 (no corrio dual-judge). reason obligatoria para escalated/not-applicable; approved es accion estandar |

**Riesgos principales y como los mitigamos**:

- **Over-build (DET-32)** → la cascada necessity-assessment se corre y registra: el loop reusa reviewer aislado + dkc-resolve-kb + dkc-record-decision + verificacion DET-33 (todo ya existe) → **no hace falta comando nuevo** (drop la capa 3).
- **Duplicar DET-23** → DET-23 = quality review de 10 dimensiones (que se revisa); DET-35 = modo reforzado de COMO se revisa en T2/T3 (dos jueces ciegos + convergencia). DET-23 es el criterio; DET-35 es el motor de convergencia.
- **Inflar iteraciones con warnings falsos** → rubrica WARNING real vs theoretical (verbatim gentle-ai): solo bloquea si el uso normal lo dispara; el path imposible degrada a INFO. Tope duro de 2 iteraciones → preguntar al humano.
- **Enum cerrado rechaza el step nuevo** (leccion DET-32 L4 / HOR-112) → REQ-IMPROVE-02 agrega `dual-judge` al enum con self-test.
- **Self-report de los jueces/fixer** → DET-33 aplica a cada sub-agente del loop (git status + evidencia antes de aceptar veredicto/fix).

**Que NO se hace en este ticket**:

- No se reemplaza el reviewer single-pass de T0/T1 (queda como esta — escape por costo).
- No se construye un comando orquestador del loop (la orquestacion vive en el step `session-gate.md`; el loop es razonamiento del orquestador sobre sub-agentes existentes).
- No se persiste la tabla de veredictos como record (vive efimera en el bloque Quality review de la session).
- No se endurece a bloqueante universal (T2 WARN-first con tope; graduable a duro en T3).
- No incluye los trigger-rules (HOR-115) — ticket hermano del plan DEC-003.

**Tamano estimado**: 1 session (~2.5-3h efectivas), T2. Sin codigo net-new (capa 3 N/A): el unico codigo es el branch + self-tests de `decisions.ts`; el resto es catalogo, texto integro, wiring de prompts y regen.

**Como vas a saber que funciona**:

- `python -c "...assert 35 in DETS_CONDENSED"` + `pytest server/tests/test_dets_catalog.py` verde (35 contiguas).
- `tsx schemas/decisions.ts` verde incluyendo `dual-judge`; `dkc-record-decision --step dual-judge --choice approved` exit 0; `--choice escalated` sin reason → exit 1.
- `dkc-export-rules --global --dry-run` emite 35 bullets `- **DET-`.
- `grep "DET-35"` matchea en deterministic-rules.md (capa 1) + session-gate.md + reviewer.md (capa 2) + a-hook `dual-judge`.
- **Dogfood**: el `S1.GATE` de este mismo ticket (T2) corre el loop dual-judge sobre si mismo (dos jueces ciegos en vez de un reviewer), validando el patron en vivo.

---

## Purpose

Codificar DET-35 (Loop adversarial dual-judge en el quality gate) como **modo reforzado de DET-23** para gates **T2/T3**: en vez de un unico reviewer aislado single-pass, el gate lanza **dos jueces ciegos en paralelo** con el mismo handoff de contencion + kb_refs, confirma un hallazgo SOLO si ambos coinciden (uno → suspect; contradiccion → escalar), un **fix-agent quirurgico** arregla solo lo confirmado, **re-judge** en paralelo, y repite hasta **APPROVED o ESCALATED** con **tope de 2 iteraciones**. Refuerza DET-14 (automatiza la convergencia hoy manual), DET-13 (cierre por evidencia de dos jueces independientes), y reusa DET-33 (verificar self-report de jueces/fixer) y DET-34 (kb_refs a los jueces). Se materializa en las capas del patron de enforcement (RULE-workflow-enforcement-pattern-009) reusando la infra de `decisions_log`; la capa 3 (comando) es N/A porque el loop es orquestacion, no mutacion.

## Requirements

### REQ-IMPROVE-01: DET-35 declarada en capa 1 (catalogo condensado + texto integro)

> **Que cambia**: aparece DET-35 — `dkc_get_rules` y el bloque global de CLAUDE.md la listan, y su detalle integro vive en `deterministic-rules.md`.
> **Por que**: la fuente unica `DETS_CONDENSED` (HOR-088) y el texto integro son las dos caras del contrato; ambas deben existir o la DET es invisible/incoherente.

El sistema MUST registrar DET-35 con `name: "Loop adversarial dual-judge en el quality gate"`, `phases: ["review"]` y `rule` condensado (<600 chars) en `DETS_CONDENSED`, y una seccion integra `### DET-35` en `deterministic-rules.md` (Que / Por que / Cuando aplica (tier) / Decision gates de convergencia / Terminal states + tope / Rubrica WARNING real vs theoretical / Veredicto y registro / Interaccion con DETs / Capas de enforcement / Alcance / Aplicacion temporal). Bump del docstring/contadores "34"→"35".

**Actor**: system · **Layers**: config (python catalog), docs (prompts)

#### Acceptance
**Verificable**: `python -c "from server.src.deckard_cain.dets_catalog import DETS_CONDENSED; assert 35 in DETS_CONDENSED and DETS_CONDENSED[35]['name']"`; `grep "### DET-35" prompts/deterministic-rules.md` matchea; `pytest server/tests/test_dets_catalog.py` verde (deriva el conteo, 35 contiguas).

### REQ-IMPROVE-02: Capa 4 (validator) — step `dual-judge` en el schema de decisiones

> **Que cambia**: `dkc-record-decision --step dual-judge` deja de ser rechazado por el enum cerrado y valida su choice.
> **Por que**: sin la capa 4, la DET queda advisory-only y el LLM puede cumplirla lexicamente sin que muerda (leccion DET-32 L4: el enum es cerrado).

El sistema MUST agregar `dual-judge` a `InteractiveStepId` y una rama discriminada a `DecisionChoice` en `commands/lib/schemas/decisions.ts`, con choices `approved | escalated | not-applicable`, donde `escalated` y `not-applicable` exigen `reason` (refinement — `escalated` ya esta cubierto por la lista `requiresReason`; agregar la rama no debe romper el refinement existente), y self-tests que cubran: choice valido (`approved` sin reason), `escalated` sin reason rechazado, `not-applicable` sin reason rechazado, y rechazo cross-step.

**Actor**: system · **Layers**: config (schema TS)

#### Acceptance
**Verificable**: `tsx schemas/decisions.ts` verde con los casos nuevos; `dkc-record-decision --step dual-judge --choice approved` exit 0; `--choice escalated` sin reason → exit 1.

### REQ-IMPROVE-03: Capas 2 y 5 — loop dual-judge en session-gate.md (T2/T3) + Modo dual-judge en reviewer.md + dets + a-hook

> **Que cambia**: el cierre de `S{N}.GATE` en `session-gate.md` gana una seccion que, para gates T2/T3, reemplaza el reviewer aislado single-pass por el loop dual-judge (dos jueces ciegos → convergencia → fix quirurgico → re-judge → tope 2); `reviewer.md` gana un "Modo dual-judge" que define el rol del juez (ciego, no ve al otro) y del fix-agent (quirurgico).
> **Por que**: una DET declarada pero no referenciada desde los steps queda inerte (caso DET-21/22 sin capa 3 en HOR-014).

El sistema MUST: (a) agregar en `prompts/steps/request-execute/session-gate.md`, dentro del cierre canonico del gate, una seccion "Loop dual-judge (DET-35) — gates T2/T3" que: lanza dos jueces ciegos en paralelo (dos `dkc:agent-invocation` role reviewer con handoff identico + `kb_refs`, sin que el orquestador revise el codigo el mismo); aplica las decision gates de convergencia (ambos coinciden → Confirmed; uno → Suspect, no auto-fix; contradiccion → Escalar); lanza un fix-agent quirurgico sobre lo Confirmed (solo lo confirmado, sin refactor extra); re-judge en paralelo tras el fix; repite hasta APPROVED/ESCALATED con tope 2 iteraciones (luego preguntar al humano — bloqueante incluso en super, como push); registra la tabla de veredictos `| Finding | Judge A | Judge B | Severity | Status |` en el bloque Quality review; aplica DET-33 (verificar self-report de cada juez + fixer) y DET-34 (kb_refs); (b) agregar en `prompts/agents/reviewer.md` un "## Modo dual-judge (DET-35)" que define juez ciego y fix-agent; (c) sumar `35` al frontmatter `dets:` de `session-gate.md`; (d) dejar el a-hook directive que registra `dual-judge` en `decisions_log`.

**Actor**: system · **Layers**: docs (prompts) + a-hook

<details><summary>Scenarios de validacion</summary>

#### Scenario: gate T2 con dos jueces que coinciden en un CRITICAL
- **GIVEN** un `S{N}.GATE` tier T2 con un bug real en el diff
- **WHEN** se aplica DET-35: dos jueces ciegos en paralelo
- **THEN** ambos reportan el mismo CRITICAL → Confirmed → fix-agent quirurgico → re-judge → si cero confirmados, JUDGMENT APPROVED; entry `dual-judge: approved`

#### Scenario: un solo juez halla el issue (suspect)
- **GIVEN** un gate T2 donde solo Judge A reporta un finding
- **WHEN** se evaluan las decision gates de convergencia
- **THEN** el finding queda Suspect (reportado, NO auto-fix); no bloquea el APPROVED si no hay confirmados

#### Scenario: tope de 2 iteraciones alcanzado
- **GIVEN** un gate T2 con issues que persisten tras 2 fix→re-judge
- **WHEN** se alcanza el tope
- **THEN** JUDGMENT ESCALATED → preguntar al humano (bloqueante aun en super, como push); entry `dual-judge: escalated` con reason

#### Scenario: gate T0/T1 (no aplica el loop)
- **GIVEN** un gate tier T1 auto trivial
- **WHEN** se cierra el gate
- **THEN** corre el reviewer aislado single-pass (o inline light) como hoy; entry `dual-judge: not-applicable` con reason (tier no reforzado) o se omite por proporcionalidad

</details>

#### Acceptance
**Verificable**: `grep -nE "DET-35|dual-judge|Loop dual-judge" prompts/steps/request-execute/session-gate.md` matchea; `grep -nE "Modo dual-judge|DET-35" prompts/agents/reviewer.md` matchea; `35` presente en el `dets:` de `session-gate.md`; a-hook directive `dual-judge` presente.

### REQ-IMPROVE-04: Bloque global regenerado desde la fuente unica

> **Que cambia**: el bloque DKC de `~/.claude/CLAUDE.md` pasa a listar 35 reglas con DET-35 incluida.
> **Por que**: el bloque se genera desde `DETS_CONDENSED`; sin regenerar, DET-35 existe en el catalogo pero no se ve en el contexto global.

El sistema MUST regenerar el bloque global via `dkc-export-rules --global` (no editar a mano — DET-16), emitiendo 35 bullets condensados.

**Actor**: system · **Layers**: config

#### Acceptance
**Verificable**: `dkc-export-rules --global --dry-run` produce bloque con `count("- **DET-") == 35`.

### REQ-PRESERVE-01: Sin regresion en el schema de decisiones, el catalogo ni los validators DKC

> **Que cambia**: nada — los steps previos de `decisions_log`, las 34 DETs previas y los validators existentes siguen funcionando igual.
> **Por que**: el cambio extiende enums cerrados y edita prompts; no debe romper steps/gates existentes (DET-7 regression).

El sistema MUST mantener verdes: los self-tests previos de `decisions.ts`, `pytest server/tests/test_dets_catalog.py`, y los validators `dkc-validate` / `dkc-verify-gate` usados en el gate de cierre de este mismo ticket. El reviewer single-pass de T0/T1 no se altera.

**Actor**: system · **Layers**: config

#### Acceptance
**Verificable**: `tsx schemas/decisions.ts` reporta previos + nuevos, todos pass; `pytest server/tests/test_dets_catalog.py` verde; gate de cierre de HOR-114 pasa G1/G4.

## Tasks

### Session 1 — DET-35 (loop dual-judge) en capas de enforcement [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Capa 1: entry `35` a `DETS_CONDENSED` (name "Loop adversarial dual-judge en el quality gate", phases ["review"], rule <600 chars) + docstring/contadores "34"→"35"; seccion integra `### DET-35` en deterministic-rules.md | REQ-IMPROVE-01 | developer | — | server/src/deckard_cain/dets_catalog.py, prompts/deterministic-rules.md | `python -c "...assert 35 in DETS_CONDENSED"` + `grep "### DET-35"` + `pytest test_dets_catalog.py` | git revert | DET-1, DET-2, DET-16, DET-24 | done | 1 |
| S1.T2 | Capa 4: `dual-judge` en `InteractiveStepId` + rama en `DecisionChoice` (approved/escalated/not-applicable) + self-tests (4 casos) | REQ-IMPROVE-02 | developer | S1.T1 | commands/lib/schemas/decisions.ts | `tsx schemas/decisions.ts` verde | git revert | DET-2, DET-7 | done | 1 |
| S1.T3 | Capas 2+5: seccion "Loop dual-judge (DET-35)" en session-gate.md (T2/T3: dos jueces ciegos + convergencia + fix quirurgico + re-judge + tope 2 + tabla veredictos + DET-33/34) + "Modo dual-judge" en reviewer.md (juez ciego + fix-agent) + `35` en `dets:` + a-hook `dual-judge` | REQ-IMPROVE-03 | developer | S1.T1, S1.T2 | prompts/steps/request-execute/session-gate.md, prompts/agents/reviewer.md | grep DET-35/dual-judge en ambos + `35` en dets + a-hook | git revert | DET-9, DET-14, DET-23, DET-33, DET-34 | done | 1 |
| S1.T4 | Capa global: regenerar `dkc-export-rules --global` (verificar 35 bullets) + registrar necessity-assessment (capa 3 = drop, racional DEC-LOCAL-02) | REQ-IMPROVE-04 | developer | S1.T1, S1.T2 | (CLAUDE.md global) | `dkc-export-rules --global --dry-run` (35 bullets) | re-run export desde catalogo previo | DET-16, DET-32 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier T2)** — DOGFOOD: loop dual-judge (dos jueces ciegos) sobre el propio diff + verificacion self-report del gate (DET-33) + commits DET-27 + decidir | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + self-tests verdes + export 35 + git status submodulo limpio post-jueces + tabla veredictos | (no aplica) | DET-20, DET-23, DET-33, DET-34, DET-35 | done | 1 |

### Task contract (resumen)

```
S1.T1: capa 1 regla+catalogo — files: dets_catalog.py, deterministic-rules.md — validation: import assert + grep + pytest — rollback: git revert — rules: [DET-1, DET-2, DET-16, DET-24]
S1.T2: capa 4 validator — files: decisions.ts — validation: tsx self-test (4 casos) — rollback: git revert — rules: [DET-2, DET-7]
S1.T3: capas 2+5 loop+modo+a-hook — files: session-gate.md, reviewer.md — validation: grep DET-35/dual-judge + dets + a-hook — rollback: git revert — rules: [DET-9, DET-14, DET-23, DET-33, DET-34]
S1.T4: capa global regen + necessity drop — files: CLAUDE.md global — validation: export 35 bullets — rollback: re-run export — rules: [DET-16, DET-32]
```

## Constraints

- RULE-workflow-enforcement-pattern-009 (**must**): toda DET ≥30 se materializa en las 5 capas. DET-35: capa 3 (comando) = N/A (el loop es orquestacion, no mutacion — como DET-33); capas 1/2/4/5/5b presentes.
- HOR-088 (fuente unica): NO duplicar el condensado fuera de `DETS_CONDENSED`.
- DET-16 (no editar a mano el bloque global): regenerar con `dkc-export-rules --global`.
- DET-32 (necesidad/reuso): la capa 3 pasa la cascada con veredicto `drop` registrado via `dkc-record-decision --step necessity-assessment` (reusa reviewer aislado + dkc-resolve-kb + dkc-record-decision; no construir comando).
- Fidelidad gentle-ai: terminal states solo APPROVED/ESCALATED; jueces ciegos (no se ven entre si); fix-agent solo lo confirmado; rubrica WARNING real vs theoretical; tope 2.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Over-build (comando orquestador del loop) | medium | deuda/complejidad | Cascada DET-32 registrada: el loop reusa reviewer aislado + dkc-resolve-kb + dkc-record-decision + DET-33 → drop la capa 3 (como DET-33) |
| DET-35 percibida como duplicado de DET-23 | medium | confusion normativa | El texto integro define la frontera: DET-23 = que se revisa (10 dimensiones, single-pass); DET-35 = modo reforzado de COMO se revisa en T2/T3 (dos jueces + convergencia) |
| Iteraciones infladas por warnings falsos | medium | costo en tokens | Rubrica WARNING real vs theoretical (solo bloquea uso normal) + tope duro 2 → preguntar humano |
| Enum cerrado rechaza el step nuevo | low (conocido) | comando falla silencioso | REQ-IMPROVE-02 lo agrega con self-test (leccion DET-32 L4) |
| Self-report de jueces/fixer no verificado | medium | veredicto/fix falso | DET-33 aplica a cada sub-agente del loop (git status + evidencia antes de aceptar) |

## Open questions

- [ ] Ninguna — alcance cerrado en el plan; super autopilot resuelve las decisiones con racional documentado.

## Decisions

### DEC-LOCAL-01: DET nueva (DET-35) que refuerza, en vez de extender DET-23 con un bullet
- **Contexto**: el request ofrecia reforzar DET-23 (quality review) o anadir un DET nuevo
- **Drivers**: DET-23 es el criterio de revision (10 dimensiones, single-pass); el contrato del modo reforzado (dos jueces ciegos + convergencia + fix quirurgico + re-judge + tope) amerita bite verificable (validator step + a-hook + entry observable) y observabilidad de primera clase en HC
- **Cascada DET-32 (necessity-assessment)**: build — el contrato de loop dual-judge no existe hoy (DET-23 es single-pass), gana observabilidad como DET propia
- **Opcion elegida**: DET-35 que refuerza DET-23/14/13 (mismo patron que DET-31/32/33/34)
- **Alternativas**: bullet en DET-23 (descartada — quedaria advisory-only sin capas de enforcement)
- **Consecuencias**: +1 DET en el catalogo (35); coherente con el patron establecido
- **Session**: design (S0)

### DEC-LOCAL-02: Capa 3 (comando) = N/A (drop) — el loop es orquestacion, no mutacion
- **Contexto**: el patron RULE-009 pide capa 3 (comando) solo si la regla requiere mutacion
- **Cascada DET-32 (necessity-assessment)**:
  - ¿Necesita existir un comando? No — el loop es razonamiento del orquestador sobre sub-agentes
  - ¿Ya existe lo que necesita? Si — reviewer aislado (DET-30·REQ-10) se duplica para los dos jueces; `dkc-resolve-kb` (DET-34) provee kb_refs; `dkc-record-decision` registra el veredicto; la verificacion de self-report (DET-33) cubre jueces/fixer
  - ¿Lo da framework/nativo? El paralelismo de jueces lo da el host (multiples Agent en un mensaje); no hace falta orquestador propio
  - ¿Se reduce a config/prompt? Si — el loop vive en `session-gate.md` (orquestacion) + el step de decision
  - **Veredicto**: drop (capa 3 N/A, como DET-33)
- **Opcion elegida**: sin comando nuevo; el loop reusa la infra existente
- **Alternativas**: comando `dkc-dual-judge` orquestador (descartada — over-build; el host ya paraleliza sub-agentes y la convergencia es razonamiento)
- **Consecuencias**: capa 3 N/A explicita y justificada; menos superficie de mantenimiento
- **Session**: design (S0)

### DEC-LOCAL-03: Aplica solo a gates T2/T3 (modo reforzado), single-pass en T0/T1
- **Contexto**: el dual-judge cuesta ~4 + 3×hallazgos (DEC-003)
- **Drivers**: proporcionalidad — el costo es insostenible para T0/T1 triviales; la independencia de dos jueces aporta donde el riesgo lo justifica
- **Opcion elegida**: dual-judge en T2/T3; reviewer aislado single-pass (o inline light) en T0/T1
- **Alternativas**: dual-judge universal (descartada — Option B de DEC-003, ~4x tokens insostenible)
- **Session**: design (S0)

### DEC-LOCAL-04: Capa 4 = step nuevo `dual-judge` (no sobrecargar gate-decision/self-report-verification)
- **Contexto**: ya existen los steps `gate-decision` y `self-report-verification`
- **Drivers**: ortogonalidad — `gate-decision` registra el outcome del gate (continue/iterate/...); `self-report-verification` registra la verificacion del self-report; `dual-judge` registra el outcome del LOOP de convergencia (approved/escalated). Mezclarlos pierde la senal
- **Opcion elegida**: step `dual-judge` (approved/escalated/not-applicable), mismo criterio que DET-33/34
- **Session**: design (S0)

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-IMPROVE-01..04 pasan
- [x] **Tests**: `tsx schemas/decisions.ts` verde (previos + nuevos); `pytest server/tests/test_dets_catalog.py` verde (35 DETs)
- [x] **Rules**: RULE-workflow-enforcement-pattern-009 satisfecha (capas 1/2/4/5/5b — capa 3 N/A justificada)
- [x] **Integration**: `dkc-export-rules --global` emite 35 bullets; resto de la suite sin regresion
- [x] **Docs**: deterministic-rules.md, session-gate.md, reviewer.md coherentes; DET-35 sin duplicar DET-23/14
- [x] **Dogfood**: el S1.GATE corre el loop dual-judge sobre el propio diff (dos jueces ciegos)
