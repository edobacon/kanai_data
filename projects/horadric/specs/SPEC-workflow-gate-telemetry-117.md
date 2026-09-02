---
id: SPEC-workflow-gate-telemetry-117
project: horadric
ticket: HOR-117
status: done
---

# Telemetria de gates — mecanismo de medicion (proxy tokens + latencia + estructura)

# Telemetria de gates — mecanismo de medicion (proxy tokens + latencia + estructura)

## Executive summary — lo que estas aprobando

**Que se quiere**: hacer el proceso DKC **observable** para poder calibrarlo (Q2) y validar las optimizaciones de hoy (HOR-115/116) con datos, no estimaciones. Como el host no expone tokens por sub-agente, el mecanismo captura por gate: **conteos estructurales reales** (tier, work_type, review_mode, #jueces, #adjudicador, #iteraciones, outcome), **latencia real** (delta de timestamps del decisions_log), y **tokens estimados** (`chars/3.7` sobre el diff). Decision del dev: "Mecanismo + proxies".

**Forma** (DET-32 — reusa al maximo): un bloque de captura ```dkc:gate-telemetry``` (key:value) en el cierre del gate + un comando `dkc-telemetry` (bash, modela `dkc-measure-context-base`) que agrega across tickets como `dkc-sp-calibration`. Backfill de los 3 gates de hoy (HOR-114/115/116) = primeros numeros + fixture del smoke test.

**Honestidad de los numeros**: latencia y conteos = **reales**; tokens = **estimacion** (etiquetada como tal, sin falsa precision). La latencia es "span del gate" (incluye pausas humanas), no tiempo de computo.

**Que NO se hace**: no se inventa captura de tokens reales (no accesible); no UI en HC (futuro); no se reabren los tickets backfilled (el bloque es aditivo); no schema zod nuevo (el bloque es key:value parseado por el comando).

**Tamano**: 1 session T2. Codigo: 1 comando bash + smoke test; resto convencion + doc + backfill.

**Como vas a saber que funciona**: `./commands/dkc-telemetry horadric` corre verde y emite la tabla por gate + breakdown por work_type/tier sobre HOR-114/115/116; `--json` valido; tokens etiquetados "est."; smoke test pasa.

---

## Purpose

Construir un mecanismo de telemetria de gates para DKC: una convencion de captura estructurada por gate + un comando de reporte agregador. Vuelve medible el gasto (proxy de tokens via chars/3.7), la latencia (timestamps del decisions_log) y la estructura del review (single-pass / dual-judge / dual-judge-tiered, #iteraciones, #adjudicador), habilitando la calibracion (Q2) de las palancas advisory (HOR-115) y de tiering (HOR-116). Reusa la heuristica de `dkc-measure-context-base` y el patron de reporte de `dkc-sp-calibration`; sin dependencia de una fuente externa de tokens.

## Requirements

### REQ-IMPLEMENT-01: Convencion de captura `dkc:gate-telemetry` + wiring en session-gate + doc

> **Que cambia**: el cierre del `S{N}.GATE` gana un bloque estructurado con la telemetria del gate; un doc explica el mecanismo y el limite (tokens = estimacion).
> **Por que**: sin una captura parseable y delimitada, el reporte no tiene de donde leer (la prosa libre del bloque Quality review no es robusta).

El sistema MUST: (a) definir un bloque fenced ```dkc:gate-telemetry``` con lineas `key: value` capturado en el cierre del gate, con campos: `session`, `work_type`, `tier`, `review_mode` (single-pass|dual-judge|dual-judge-tiered), `judge_tier`, `fix_iterations`, `adjudicator_invocations`, `diff_chars`, `est_tokens` (= diff_chars × 10 / 37), `span_seconds` (delta entre el primer y ultimo timestamp de la session en decisions_log); (b) referenciar la captura en el flujo de cierre de `prompts/steps/request-execute/session-gate.md` (capa 2, paso del cierre canonico); (c) crear `docs/telemetry.md` con el formato, el origen de cada metrica y la advertencia "tokens = estimacion chars/3.7; span = wall-clock con pausas humanas, no computo".

**Actor**: system · **Layers**: docs (prompts + doc)

#### Acceptance
**Verificable**: `docs/telemetry.md` existe con el schema; `grep "dkc:gate-telemetry"` matchea en session-gate.md; el bloque define los 10 campos.

### REQ-IMPLEMENT-02: Comando `dkc-telemetry` (bash) — parse + agregar + --json + smoke test

> **Que cambia**: aparece `commands/dkc-telemetry [project] [--json]` que escanea los tickets, extrae los bloques de telemetria y emite tabla por gate + breakdown por work_type/tier.
> **Por que**: es el reporte que convierte la captura en numeros accionables (la base de Q2).

El sistema MUST crear `commands/dkc-telemetry` (bash ejecutable, patron de `dkc-measure-context-base`) que: (a) escanee `projects/{project}/tickets/*.md`, extraiga cada bloque ```dkc:gate-telemetry``` (awk); (b) emita una tabla por gate (ticket, session, work_type, tier, review_mode, fix_iterations, adjudicator_invocations, span_seconds, est_tokens con sufijo "est."); (c) emita un breakdown agregado por `work_type` y por `tier` (count, avg span, avg est_tokens, % dual-judge, % con adjudicador); (d) soporte `--json` (output estructurado); (e) reuse la heuristica `chars×10/37` para derivar/validar est_tokens; (f) incluya un smoke self-test (`--self-test` o un script que corra el comando contra los 3 gates backfilled y verifique >=3 filas + agregados no vacios, exit 1 on fail). Etiquetar tokens como estimacion en el output.

**Actor**: system · **Layers**: config (comando bash)

#### Acceptance
**Verificable**: `./commands/dkc-telemetry horadric` exit 0, >=3 filas (HOR-114/115/116), breakdown por work_type/tier presente; `./commands/dkc-telemetry horadric --json` parsea como JSON valido; smoke test exit 0.

### REQ-IMPLEMENT-03: Backfill HOR-114/115/116 + primer reporte

> **Que cambia**: los 3 gates de hoy ganan su bloque de telemetria (datos reales: span de timestamps, review_mode, iteraciones) → primer reporte con numeros.
> **Por que**: da valor inmediato (primeros numeros medidos) y valida el parser end-to-end.

El sistema MUST agregar el bloque ```dkc:gate-telemetry``` a HOR-114.md, HOR-115.md, HOR-116.md (aditivo, sin reabrir): `span_seconds` derivado de sus timestamps reales de decisions_log; `review_mode` = dual-judge (114/115), dual-judge-tiered (116); `diff_chars`/`est_tokens` estimados de sus commits; `fix_iterations`=1, `adjudicator_invocations`=0 en los tres. Correr `dkc-telemetry` y registrar la tabla resultante en el ticket (Testing/Summary).

**Actor**: system · **Layers**: docs (tickets)

#### Acceptance
**Verificable**: los 3 tickets tienen el bloque; `dkc-telemetry horadric` los lista con sus span reales; `dkc-validate Ticket` de los 3 sigue valid:true (bloque aditivo no rompe el schema).

### REQ-PRESERVE-01: Aditivo — sin regresion

> **Que cambia**: nada existente — comando nuevo, bloque aditivo; validators/commands previos intactos.
> **Por que**: DET-7 regression del sistema.

El sistema MUST mantener: `dkc-validate Ticket` valid:true en los 3 backfilled; los comandos existentes sin tocar; el bloque de telemetria no interfiere con el parser de SessionBlock/SessionExecution.

#### Acceptance
**Verificable**: `dkc-validate Ticket/SessionBlock/SessionExecution` de HOR-114/115/116/117 valid:true tras el backfill.

## Tasks

### Session 1 — Mecanismo de telemetria de gates [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Bloque ```dkc:gate-telemetry``` (10 campos) + wiring en session-gate close + `docs/telemetry.md` (schema + origen + advertencia estimacion) | REQ-IMPLEMENT-01 | developer | — | docs/telemetry.md, prompts/steps/request-execute/session-gate.md | grep dkc:gate-telemetry + doc existe | git revert | DET-20, DET-23 | done | 1 |
| S1.T2 | Comando `dkc-telemetry` bash (parse awk + agregar work_type/tier + --json + heuristica chars/3.7) + smoke self-test | REQ-IMPLEMENT-02 | developer | S1.T1 | commands/dkc-telemetry | comando exit 0 + --json valido + smoke test | rm comando | DET-32, RULE-005 | done | 1 |
| S1.T3 | Backfill bloque en HOR-114/115/116 (span real de timestamps) + correr `dkc-telemetry` → primera tabla | REQ-IMPLEMENT-03 | developer | S1.T1, S1.T2 | tickets HOR-114/115/116 | 3 filas en el reporte + dkc-validate Ticket valid:true | git revert | DET-7 | done | 1 |
| **S1.GATE** | **Gate T2** — dual-judge **tiered** (HOR-116: jueces balanced, adjudicador reasoning solo en disputa) sobre el propio diff + self-report (DET-33) + telemetria del propio gate + commits DET-27 + decidir | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | comando verde sobre 3 gates + smoke test + dual-judge APPROVED + bloque telemetria propio | (no aplica) | DET-20, DET-23, DET-33, DET-35 | done | 1 |

## Constraints

- **DET-32**: build solo el comando + la convencion; reusa heuristica (dkc-measure-context-base), latencia (decisions_log timestamps), patron de reporte (dkc-sp-calibration). Sin schema zod nuevo, sin fuente externa de tokens.
- **Honestidad de metricas**: tokens etiquetados "est." (chars/3.7); span = wall-clock con pausas, no computo. El reporte lo dice explicito.
- **Aditividad**: el bloque de telemetria no altera outcomes ni rompe parsers existentes.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Falsa precision en tokens | medium | decisiones mal calibradas | Etiqueta "est." + doc explicito; el valor esta en la tendencia/comparacion, no el absoluto |
| Parsing fragil del markdown | medium | reporte roto | Bloque delimitado key:value (no prosa) + smoke test contra 3 gates reales |
| Span contaminado por pausas humanas | high | latencia enganosa | Etiquetar "span del gate (incluye pausas)", no "computo"; util para comparar mismo-modo, no absoluto |

## Open questions

- [ ] Ninguna — alcance cerrado; super autopilot resuelve con racional documentado.

## Decisions

### DEC-LOCAL-01: Tokens via proxy chars/3.7 (no captura real)
- **Contexto**: el host no expone tokens por sub-agente; dev eligio "Mecanismo + proxies"
- **Opcion elegida**: estimacion chars/3.7 (heuristica canonica del repo) sobre el diff, etiquetada "est."
- **Alternativa**: integrar una fuente externa (ccusage/hook) — descartada por ahora (no se indico fuente; se puede sumar luego sin romper el schema)
- **Session**: design (S0)

### DEC-LOCAL-02: Comando bash determinista (no prompt-driven .md)
- **Contexto**: dkc-sp-calibration es prompt-driven; los numeros de telemetria requieren determinismo
- **Opcion elegida**: `dkc-telemetry` bash (modela dkc-measure-context-base) con --json + smoke test
- **Alternativa**: reporte prompt-driven (.md) — descartada (no reproducible para calibracion)
- **Session**: design (S0)

### DEC-LOCAL-03: Captura como bloque fenced key:value (no schema zod)
- **Contexto**: la telemetria es observabilidad, no dato de dominio (como decisions_log)
- **Opcion elegida**: bloque ```dkc:gate-telemetry``` parseado por el comando; sin validator zod nuevo (DET-32 reduce)
- **Alternativa**: record type + schema zod — descartada (over-build para un artefacto efimero de medicion)
- **Session**: design (S0)

## Acceptance checkpoints

- [x] **Funcional**: `dkc-telemetry horadric` emite tabla + breakdown sobre los 3 gates backfilled
- [x] **Honestidad**: tokens etiquetados "est."; span etiquetado wall-clock-con-pausas
- [x] **Self-test**: smoke test del comando pasa
- [x] **No-regresion**: dkc-validate Ticket/SessionBlock de HOR-114/115/116/117 valid:true
- [x] **Dogfood**: el S1.GATE corre dual-judge tiered (HOR-116) + captura su propia telemetria
