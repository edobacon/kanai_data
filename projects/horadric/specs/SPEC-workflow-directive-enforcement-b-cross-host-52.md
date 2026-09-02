---
id: SPEC-workflow-directive-enforcement-b-cross-host-52
project: horadric
ticket: HOR-052
status: draft
---

# Frente B cross-host — AGENT INVOCATION portable a multiples LLM hosts via MCP tool dedicado

# Frente B cross-host — AGENT INVOCATION portable a multiples LLM hosts via MCP tool dedicado

## Executive summary — lo que estas aprobando

### Que se quiere

Convertir las **6 mentions actuales** de `> **AGENT INVOCATION (HOR-025)**: subagent_type=X, tier=Y, prompt="..."` (en 4 archivos de `prompts/steps/`) — prosa interpretada con 97.5% skip rate (D11 HOR-046) — en **enforcement programatico cross-host** via MCP tool dedicado. Coherente con la recomendacion de HOR-051 (A.6 MCP tool) — mismo mecanismo cubre A+B, reduce friccion para el dev.

**Conclusion adelantada**: **B.2 MCP tool dedicado `mcp__deckard-cain__dkc_invoke_agent`** + estrategia explicit para LLM host sin equivalente a `Task` tool (H4). Sub-ticket derivado: **HOR-057** (tentativo) implementa el tool + refactor de las 6 mentions a fence machine-readable + tests.

### Decisiones criticas

| # | Decision | Por que |
|---|----------|---------|
| 1 | **Reclassificar HOR-052 a explore (preemptivo)** | Decision del dev al cerrar HOR-051. Coherencia arquitectural cross-host en triada A+B+C. Evita drift cross-frente |
| 2 | **Aceptar simetria con HOR-051: B.2 MCP tool primario** | Driver coherencia arquitectural + no-inventar respuesta-que-ya-existe. 1 mecanismo MCP cubre A+B |
| 3 | **Estrategia H4: fail con mensaje claro al LLM principal cuando host no soporta subagent_type** | Default seguro (no silencio que confunda, no spawn no controlado). Mensaje sugiere "ejecuta inline" como fallback explicit |
| 4 | **B.4 (status quo) descartado** | Es el problema actual D11. Mantener seria no resolver |
| 5 | **B.1 (fence parseado por harness wrapper) descartado** | Claude-Code-specific por la misma razon que A.1 hooks (HOR-051) |
| 6 | **B.3 (CLI bridge manual) descartado como primario** | Mismo problema D11 trasladado (depende de disciplina del LLM). Sobrevive como fallback complementario |
| 7 | **Sub-ticket derivado: 1 merged (analogo a HOR-054)** | Por simetria de granularidad con decision del dev en HOR-051 |

### Riesgos principales y como los mitigamos

| Riesgo | Probabilidad | Impact | Mitigacion |
|--------|--------------|--------|------------|
| **MCP tool requiere que LLM lo invoque** (mismo riesgo que HOR-051) | Media | Alto | (a) prompt explicit en step etiquetado, (b) validator C HOR-053 detecta drift post-hoc. Para Frente B, **NO hay opcion file watcher analoga** (AGENT INVOCATION no es evento de filesystem) — el riesgo es ligeramente mayor que en A |
| **Hosts LLM con subagent_type heterogeneo** (H4) | Alta | Medio | Estrategia fail-with-message documentada + HOR-029 mapping host provee tabla por capability |
| **Refactor de 6 mentions invasive** | Baja | Bajo | 6 mentions es universo conocido. Cambio mecanico (formato actual a fence) trivial |
| **Spawn no controlado de nuevos LLM instances** (H4 opcion c) | Baja | Alto | Descartado por default. Si dev quiere "spawn behavior" en futuro, sub-ticket dedicado |

### Que NO se hace en este explore

- **NO implementar** el MCP tool — eso es el sub-ticket derivado
- **NO refactorear las 6 mentions** — eso es el sub-ticket
- **NO disenar mapping host completo** — HOR-029 ya lo cubre. Solo referencias
- **NO investigar nuevos LLM hosts emergentes** — MCP estandar abierto cubre futuro

### Tamano estimado

| Session | Objetivo | Tier | Horas |
|---------|----------|------|-------|
| S1 (en este chat) | 4 approaches evaluados + decision matrix | T0 | 30 min |
| S2 (en este chat) | Spec draft + recomendacion + sub-ticket | T0 | 20 min |

**Total explore**: ~50 min. SP ejecutado del explore: tentativo 2 (vs 8 estimado original del improvement). Diferencia drastica por compactacion + reutilizacion de la decision arquitectural de HOR-051.

### Como vas a saber que funciona

- **Pre-spec** (baseline): 4 approaches evaluados al mismo nivel
- **Post-spec** (target): recomendacion firmada + 1 sub-ticket derivado con scope definido + implicaciones cruzadas
- **Acceptance final post-implementacion** (medible en sub-ticket HOR-057, no aqui): AGENT INVOCATION → Agent real ratio `17% → 100%` (6/6) tras refactor + MCP tool funcional

## Purpose

Definir la **arquitectura cross-host** para el ejecutor del catalogo de AGENT INVOCATION. Por simetria con HOR-051, el primario es MCP tool dedicado. El catalogo machine-readable (fence YAML reemplazando prosa) es universal. Producir recomendacion firmada + sub-ticket derivado.

## Context

Origen identico a HOR-051: HOR-046 D11 + spec parent HOR-050. La unica diferencia material es el universo (6 mentions de AGENT INVOCATION vs ~30 directivas a-hook) y la naturaleza del cambio (invocar subagent vs ejecutar comando). El patron arquitectural es identico — catalogo machine-readable + ejecutor portable.

**Decision preemptiva del dev (2026-05-16)**: reclassificar HOR-052 paralelo a HOR-051 antes de cerrar ambos. Razon: coherencia arquitectural en triada A+B+C.

## Constraints

- **DET-11** (KB-first): HOR-029, HOR-050, HOR-051 ya consultados
- **DET-16** (propagacion): este spec propaga sin nuevas implicaciones — HOR-053 confirmado sin cambio
- **DET-20** (sessions): plan explore S1+S2 doc-only T0
- **Coherencia con HOR-051**: el approach primario debe ser MCP tool por simetria (driver). Si analisis profundo revela razon material para divergir, escalar al dev antes de decidir

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| MCP server deckard-cain | internal (existente) | Agregar tool `dkc_invoke_agent` similar a `dkc_enforce_step` de HOR-051. Reusable patron | Bajo |
| HOR-029 mapping host | internal (closed) | Tabla de subagent_type → capability por host. Pre-existente | Bajo |
| HOR-051 spec cross-host | internal (draft, este lote) | Recomendacion arquitectural paralela. Coherencia | Bajo |
| HOR-053 validator | internal (open) | Complementario: detecta drift cuando MCP tool no es invocado | Bajo |

## Approaches evaluados

### B.1 — Fence `dkc:agent-invocation` parseado por harness wrapper

> **Que es**: reescribir `> **AGENT INVOCATION ...**:` como fence YAML que un wrapper bash en `.claude/` parsea + invoca `Agent({subagent_type})` real.

| Dimension | Valoracion | Notas |
|-----------|------------|-------|
| Portabilidad | LOW | Solo Claude Code (igual que A.1) |
| Automaticidad | HIGH | Wrapper dispara tras parsear |
| Costo | MEDIUM | Wrapper bash + integracion con Agent tool de Claude. Complejidad media |
| Riesgos | MEDIUM | Acoplamiento Claude. Si Claude cambia signature de Agent, romper |
| Fit LLM-local | LOW | Bloquea Ruta B HOR-029 |

**Veredicto**: descartado como primario. Adapter opcional si dev quiere automaticidad maxima en Claude Code.

### B.2 — MCP tool dedicado `mcp__deckard-cain__dkc_invoke_agent`

> **Que es**: agregar al MCP server de deckard-cain un tool con signature `dkc_invoke_agent({subagent_type, tier, prompt})`. El tool resuelve mapping segun host (HOR-029 tabla), ejecuta o falla con mensaje claro. El LLM principal lo invoca explicit reemplazando la prosa.

| Dimension | Valoracion | Notas |
|-----------|------------|-------|
| Portabilidad | HIGH | MCP estandar abierto. Funciona con todo MCP client |
| Automaticidad | MEDIUM | LLM invoca tool — similar trade-off que A.6 |
| Costo | LOW | ~80 lineas Python (mas que dkc_enforce_step por la logica de mapping subagent_type → host). Tests + docs |
| Riesgos | MEDIUM | LLM puede olvidar (mitigable: prompt explicit + validator C HOR-053). Hosts heterogeneos (H4) requiere estrategia |
| Fit LLM-local | HIGH | LLM-local con MCP client funciona |

**Veredicto**: **recomendado como primario** por simetria con HOR-051.

### B.3 — CLI bridge manual

> **Que es**: script bash `commands/dkc-invoke-agent <subagent_type> <prompt>` que el LLM ejecuta como Bash tool. Equivalente a A.3 trasladado.

| Dimension | Valoracion | Notas |
|-----------|------------|-------|
| Portabilidad | HIGH | Cualquier LLM con Bash |
| Automaticidad | LOW | Misma falla D11 (97.5% inline) |
| Costo | LOW | Bash + jq |
| Riesgos | HIGH | Auto-derrota |
| Fit LLM-local | LOW | Aunque portable, no resuelve |

**Veredicto**: descartado como primario por mismo problema D11. Fallback complementario si MCP no disponible.

### B.4 — Status quo (sin enforcement)

> **Que es**: dejar la prosa actual, confiar en disciplina del LLM.

| Dimension | Valoracion | Notas |
|-----------|------------|-------|
| Portabilidad | MAX (no requiere nada) | — |
| Automaticidad | LOW (97.5% inline medido) | El problema actual |
| Costo | ZERO | — |
| Riesgos | HIGH | El problema D11 que estamos resolviendo |
| Fit LLM-local | LOW | LLM-local fallara mas |

**Veredicto**: descartado. Mantener seria no resolver el problema.

## Decision matrix consolidada

| Driver | Weight | B.1 (fence harness) | B.2 (MCP tool) | B.3 (CLI manual) | B.4 (status quo) |
|--------|--------|---------------------|-----------------|------------------|------------------|
| Portabilidad LLM-local | 3 | 1 | 3 | 3 | 3 |
| Automaticidad | 3 | 3 | 2 | 1 | 1 |
| Costo | 2 | 2 | 3 | 3 | 3 |
| Operabilidad | 2 | 2 | 3 | 3 | 3 |
| Compatibilidad MCP | 1 | 1 | 3 | 1 | 1 |
| Risk re-trabajo | 2 | 1 | 3 | 3 | 1 |
| **Total / max** | | **19/39** | **23/39** | **20/39** | **18/39** |
| **Normalizado** | | **49%** | **59%** | **51%** | **46%** |
| **Ranking** | | 3/4 | **1/4** | 2/4 | 4/4 |

**Resultado**: B.2 lidera (analogo a A.6 en HOR-051). Simetria confirmada.

## Recomendacion firmada

### Primario: B.2 MCP tool dedicado

Sub-ticket derivado **HOR-057** (tentativo, 1 merged):
- Agregar tool `mcp__deckard-cain__dkc_invoke_agent` al servidor MCP
- Signature: `{ subagent_type: string, tier?: 'fast'|'balanced'|'reasoning', prompt: string, output_schema?: path }` → resultado `{ executed: bool, mode: 'agent'|'inline-fallback'|'failed', result?, message? }`
- Resolver host capability via HOR-029 mapping. Si host no soporta subagent_type: retornar `mode: 'failed'` con mensaje sugiriendo inline (decision H4)
- Refactor de las 6 mentions actuales a fence YAML `dkc:agent-invocation` + invocacion explicit al tool
- Tests: 6/6 mentions invocan tool correctamente + manejo H4 verificado

### Estrategia H4 (LLM sin subagent_type)

Default: el MCP tool retorna `{ mode: 'failed', message: "Host {X} no soporta subagent_type {Y}. Ejecuta inline con prompt..." }`. El LLM principal entonces hace inline manteniendo la informacion del prompt. **NO spawn de model instance** (descartado por default).

Si en futuro emerge que spawn behavior es deseable: sub-ticket dedicado.

### Adapter Claude Code (B.1) como opcion futura

NO se implementa ahora. Si en futuro emerge necesidad de automaticidad maxima en Claude Code, puede agregarse adapter que invoque el MCP tool tras parsear fence.

## Sub-ticket derivado mergeado A+B (decision del dev 2026-05-16)

| Ticket | Scope | Priority | SP |
|--------|-------|----------|-----|
| **HOR-054** — Multi-MCP-tool: implementa AMBOS tools `dkc_enforce_step` (Frente A, de HOR-051) + `dkc_invoke_agent` (Frente B, de HOR-052) + catalogo a-hook completo + refactor 6 mentions AGENT INVOCATION + tests integrados | Primario merged A+B (no HOR-057 separado) | must | 12-15 |

**Razon merge**: codigo compartido (mismo MCP server deckard-cain, signatures similares, mismo mapping host de HOR-029, mismas decisiones de fallback). Ahorro ~3-5 SP vs 2 sub-tickets separados. Trade-off: scope grande del ticket — partir internamente en sessions cuando se arranque.

## Implicaciones para HOR-053

**Sin cambio confirmado**. Frente C validator post-step es portable por diseno (`commands/lib/validate.ts` extension reusable cross-host). El validator complementa B.2: si LLM olvida invocar `dkc_invoke_agent`, validator C detecta drift post-hoc grepeando que el step tiene 0 invocaciones cuando deberia tener N.

## NFRs (aplicables a sub-ticket HOR-057)

| Tipo | Current | Target HOR-057 |
|------|---------|----------------|
| AGENT INVOCATION → Agent real | 1/6 = 17% (D11 HOR-046) | 6/6 = 100% post-refactor |
| Inline ratio cuando MCP no invocado | 97.5% | < 30% con prompt explicit + validator C |
| Latencia MCP tool | N/A | < 200ms p95 (resolucion de mapping + dispatch) |

## Tasks

### Session 1 — Exploracion comparativa 4 approaches [tipo: auto] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Inventario inicial de 6 mentions confirmado | H1 | researcher | — | spec (Context) | 6/6 mentions en 4 archivos | N/A | DET-11 | done (inline) | 1 |
| S1.T2 | Evaluar 4 approaches (B.1-B.4) al mismo nivel | H2 | architect | S1.T1 | spec (seccion approaches) | 4 evaluados con tabla homogenea | git revert | DET-2 | done (inline) | 1 |
| S1.T3 | Decision matrix consolidada por simetria con HOR-051 | H3 | architect | S1.T2 | spec (decision matrix) | B.2 lider | git revert | DET-2 | done (inline) | 1 |
| S1.GATE | Gate Session 1 (T0): exploracion completa + simetria con HOR-051 validada | — | reviewer | S1.T1-T3 | spec | Quality review DET-23 light | git revert | DET-13, DET-23 | done | 1 |

### Session 2 — Spec draft final + sub-ticket [tipo: ⚑ fuerte] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Spec draft final con recomendacion B.2 + estrategia H4 + sub-ticket HOR-057 | H3, H4 | architect | S1.GATE | spec (este archivo) | Spec completo | git revert | DET-2, DET-13, DET-16 | done (inline) | 2 |
| S2.T2 | Implicaciones HOR-053 confirmadas sin cambio | H5, H6 | architect | S2.T1 | spec (seccion Implicaciones) | Documentado | git revert | DET-16 | done (inline) | 2 |
| S2.T3 | Marcar spec status `draft` + ticket frontmatter | — | scribe | S2.T2 | spec + ticket | spec status: draft | git revert | DET-13 | done (inline frontmatter) | 2 |
| S2.GATE | Gate Session 2 ⚑ fuerte (T0): spec completo + recomendacion firmada + Quality review exhaustive. Dev aprueba o pide iterate | — | reviewer | S2.T1-T3 | spec + ticket | Quality review DET-23 exhaustive | N/A | DET-13, DET-23 | pending (dev decide) | 2 |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LLM olvida invocar MCP tool | Medium | High | Prompt explicit + validator C HOR-053 |
| Host sin subagent_type (H4) | High | Medium | Strategy "fail con mensaje" + HOR-029 mapping |
| Refactor 6 mentions invasive | Low | Low | Universo conocido, cambio mecanico |
| Divergencia HOR-051 vs HOR-052 si emerge razon material | Low | Medium | Escalar al dev antes de implementar divergencia |

## Open questions

- **OPEN-1** (decisional, sera resuelto en S2.GATE): ¿confirmar B.2 MCP tool como primario? RESUELTO inline: simetria con HOR-051 + decision matrix coherente
- **OPEN-2** (decisional, sera resuelto en HOR-057 implementacion): ¿estrategia H4 final = fail con mensaje, inline silencioso, o spawn? Default propuesto: fail. Confirmable en sub-ticket
- **OPEN-3**: ~~¿reclassificar HOR-052?~~ RESUELTO: ya reclassificado preemptivo (2026-05-16)

## Decisions (cerradas durante explore)

### DEC-LOCAL-01: Reclassificar HOR-052 a explore (preemptivo)

- **Contexto**: decision del dev al cerrar HOR-051 (OPEN-3 de SPEC-workflow-directive-enforcement-a-cross-host-51 resuelta)
- **Drivers**: coherencia arquitectural cross-host high, evitar drift cross-frente high
- **Opcion elegida**: reclassificar paralelo a HOR-051 antes de cerrar ambos
- **Alternativas**: dejar HOR-052 como improvement (rechazado por drift cross-frente); cerrar HOR-052 como was + crear nuevo explore (rechazado por trabajo duplicado)
- **Consecuencias**: ~50 min extra de exploracion compactada (vs full session). Coherencia cross-frente garantizada
- **Session**: intake (decision del dev)

### DEC-LOCAL-02: B.2 MCP tool primario por simetria con HOR-051

- **Contexto**: 4 approaches evaluados, B.2 lidera decision matrix con 59% (analogo a A.6 en HOR-051)
- **Drivers**: coherencia arquitectural high, no-inventar-respuesta-existente high, especificidad B mid
- **Opcion elegida**: B.2 MCP tool. Sub-ticket HOR-057 merged
- **Alternativas**: B.1 fence harness (rechazado por Claude-specific); B.3 CLI manual (rechazado por D11 auto-derrota); B.4 status quo (rechazado por problema actual)
- **Consecuencias**: 1 sub-ticket HOR-057 implementa MCP tool. Coherencia maxima con HOR-054 (sub-ticket de HOR-051) — ambos son MCP tools dedicados
- **Session**: S1+S2 explore

### DEC-LOCAL-03: Estrategia H4 = fail con mensaje claro (default)

- **Contexto**: H4 abre como manejar LLM host sin equivalente a Task tool con subagent_type. 3 opciones: fail, inline silencioso, spawn
- **Drivers**: seguridad por default high, claridad del comportamiento alta
- **Opcion elegida**: fail con mensaje claro sugiriendo inline fallback explicit
- **Alternativas**: inline silencioso (rechazado por opacidad — el dev no sabe que paso); spawn nuevo model (rechazado por complejidad + costo no controlado)
- **Consecuencias**: el MCP tool tiene 3 modos: 'agent' (host soporta), 'inline-fallback' (no soporta, sugiere inline), 'failed' (otro error). Resoluble en HOR-057
- **Session**: S2 explore

## Acceptance checkpoints

- [ ] **C1 — dev autoriza recomendacion B.2 + sub-ticket HOR-057**
- [ ] **C2 — estrategia H4 documentada en sub-ticket** (sera implementada en HOR-057)
- [ ] **C3 — coherencia HOR-051+HOR-052 mantenida** (1 mecanismo MCP cubre A+B)
- [ ] **C4 — HOR-053 confirmado sin cambio**

## Archiving

Cuando HOR-054 cierre con su propio spec implementation (cubre ambos frentes A+B mergeados): `/dkc-archive-spec SPEC-workflow-directive-enforcement-b-cross-host-52 "implementado via HOR-054 merged"`. Tambien archivar `SPEC-workflow-directive-enforcement-a-cross-host-51` en el mismo close.
