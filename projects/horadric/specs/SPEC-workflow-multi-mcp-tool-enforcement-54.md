---
id: SPEC-workflow-multi-mcp-tool-enforcement-54
project: horadric
ticket: HOR-054
status: done
---

# Multi-MCP-tool enforcement — dkc_enforce_step + dkc_invoke_agent + refactor AGENT INVOCATION

# Multi-MCP-tool enforcement — dkc_enforce_step + dkc_invoke_agent + refactor AGENT INVOCATION

## Executive summary — lo que estas aprobando

**Que se quiere**: implementar 2 MCP tools en deckard-cain (Python FastMCP) que materializan la triada A+B+C cross-host:
- `dkc_enforce_step`: lee step etiquetado, parsea tags `<!-- enforcement: a-hook -->` (catalogo HOR-055), ejecuta los comandos con log estructurado
- `dkc_invoke_agent`: resuelve subagent_type via HOR-029 mapping, dispatch real o inline-fallback con mensaje al LLM principal

Plus refactor de 6 mentions `AGENT INVOCATION` a fence `dkc:agent-invocation` (parser ya soportado en horadric-cube commit dfba980).

**Decisiones criticas**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | dkc_invoke_agent NO spawnea agentes (decision DEC-LOCAL-03 HOR-052) | Riesgo de spawn no controlado en Claude Code. El tool retorna instrucciones al LLM principal para que invoque Agent localmente |
| 2 | Universe a-hook real es 25-30 (no 34) — las 11 invocaciones extras son prose narrativa | H2 partial — S1 revisa cada una y clasifica antes de etiquetar |
| 3 | Restart server requerido al agregar tools, no del cliente MCP | Aceptable: restart <1s automatic. UX documentada en S1 |

**Riesgos**:
- Refactor 6 mentions rompe el patron AGENT INVOCATION actual → mitigacion: hacer en S3 con tests integrados pre/post
- Etiquetado masivo S4 desincroniza si nuevas directivas a-hook aparecen mientras se etiqueta → mitigacion: medir empirico al final + audit script HOR-055 detecta drift

**Que NO se hace**:
- File watcher daemon (A.2) — backlog should para sub-ticket separado
- Adapter Claude Code A.1 — opcion futura
- Etiquetado de directivas b-protocol y c-validator — sub-tickets futuros

**Tamano**: 4 sessions, ~10-13h. S4 ⚑ fuerte (medicion empirica skip rate).

**Como vas a saber que funciona**:
- `mcp__deckard-cain__dkc_enforce_step` invocable con `{ticket_id, step_id, file_path}` retorna log JSON
- `mcp__deckard-cain__dkc_invoke_agent` resuelve role → subagent_type via HOR-029, retorna mode `agent` o `inline-fallback`
- 6 archivos refactoreados con fence `dkc:agent-invocation` renderizan rich en HC
- 23 → 30+ tags a-hook (delta S4)
- Medicion empirica baseline pre-hook > 70% skip → post-hook < 30%

## Purpose

Extender MCP server deckard-cain con 2 tools que materializan directive enforcement cross-host. Sin estos tools, el catalogo a-hook poblado por HOR-055 queda declarativo. El LLM puede leer los tags y ejecutarlos via shell, pero no hay enforcement programatico ni resolucion de host-capability para agent dispatch.

## Requirements

### REQ-IMPROVE-01: MCP tool dkc_enforce_step

> **Que cambia**: el LLM puede invocar `mcp__deckard-cain__dkc_enforce_step` para ejecutar todos los tags a-hook de un step + recibir log estructurado de exit codes. Antes: el LLM tenia que parsear los tags y ejecutar cada comando manual con shell.
> **Por que**: el catalogo HOR-055 es machine-readable pero queda dormido sin ejecutor automatico. HOR-054 cierra el loop.

El sistema MUST exponer tool `dkc_enforce_step({ticket_id, step_id, file_path}) → {executed: [...], log: ...}` que parsea `<!-- enforcement: a-hook command: "..." -->` y ejecuta cada comando.

<details><summary>Scenarios</summary>

#### Scenario: step con 3 tags a-hook
- **GIVEN** step file con 3 tags a-hook
- **WHEN** invoca dkc_enforce_step
- **THEN** retorna `executed: [{cmd, exit_code, stdout, stderr, duration_ms}, ...]` con 3 entries

#### Scenario: comando falla
- **GIVEN** tag a-hook con comando que retorna exit 1
- **WHEN** ejecuta
- **THEN** log marca exit_code:1, continua con siguiente comando (set +e equivalente), no rompe el flujo

</details>

### REQ-IMPROVE-02: MCP tool dkc_invoke_agent

> **Que cambia**: el LLM invoca `dkc_invoke_agent({subagent_type, tier, prompt})` y recibe instrucciones de dispatch (agent real en hosts capaces, inline fallback en hosts sin support). Antes: 6 mentions de "AGENT INVOCATION" en prompts/steps/ con resolucion manual.
> **Por que**: HOR-052 documento drift 17% (1/6 invocaciones reales). El tool centraliza la decision agent vs inline.

El sistema MUST exponer tool `dkc_invoke_agent({subagent_type, tier?, prompt, output_schema?}) → {executed: bool, mode: 'agent'|'inline-fallback'|'failed', result?, message?}`.

**NO spawn no controlado** — el tool retorna instrucciones, el LLM principal invoca Agent tool localmente.

<details><summary>Scenarios</summary>

#### Scenario: host soporta subagent_type
- **GIVEN** subagent_type='researcher', host=Claude Code (Explore disponible)
- **WHEN** invoke
- **THEN** `mode: 'agent'`, `message: 'Invoke Agent({subagent_type: Explore, prompt: ...})'`

#### Scenario: host no soporta
- **GIVEN** subagent_type='custom-role' no mapeado
- **WHEN** invoke
- **THEN** `mode: 'inline-fallback'`, `message: 'Role no soportado en host. Ejecutar inline manteniendo limites del role.'`

</details>

### REQ-IMPROVE-03: Refactor 6 mentions AGENT INVOCATION a fence canonical

> **Que cambia**: las 6 mentions de "AGENT INVOCATION (HOR-025)" en prompts/steps/ ahora son fence `dkc:agent-invocation` con YAML schema. HC renderiza rich.
> **Por que**: prose narrativa → machine-readable. HOR-054 dkc_invoke_agent consume el fence directamente.

El sistema MUST refactorizar 6 mentions a formato:
```
```dkc:agent-invocation
role: researcher
prompt: "..."
tier: balanced
fallback: "..."
```
```

### REQ-IMPROVE-04: Etiquetado masivo restante a-hook

> **Que cambia**: las ~11 invocaciones extras de dkc-validate en prompts/steps/ se clasifican (a-hook real vs prose) y se etiquetan donde corresponda.
> **Por que**: H2 partial — HOR-055 etiqueto 23/34. S4 completa el universo real (25-30 esperado tras clasificacion).

### REQ-PRESERVE-01: Tools MCP existentes no rompen

> **Que cambia**: nada. Los 27 tools existentes (search, write, project, mechanical) siguen funcionando.
> **Por que**: extension del server, no cambio.

### REQ-PRESERVE-02: prompts/steps/ existentes sin regresion semantica

> **Que cambia**: nada. Etiquetado de a-hook + refactor 6 mentions preserva el comportamiento descrito en cada step. Solo cambia formato (prose → fence).
> **Por que**: cambios cosmeticos/estructurales, no de logica del workflow.

## NFRs

| Metric | Target |
|--------|--------|
| dkc_enforce_step latencia | < 1s para 5 comandos a-hook tipicos |
| dkc_invoke_agent latencia | < 100ms (resolucion + retorno) |
| Tests coverage | ≥ 80% line en `tools/enforcement.py` |
| Restart server | < 1s al hot-add tools |

## Tasks

### Session 1 — Refinar inventario a-hook + diseno detallado MCP tools [tipo: auto] [tier: T1]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S1.T1 | Revisar 11 invocaciones extras de dkc-validate — clasificar a-hook real vs prose narrativa | researcher | fast | tickets/HOR-054.notes.md | manual: tabla con 11 entries clasificadas | tabla clasificacion completa | — | done | 1 | — |
| S1.T2 | Diseno detallado Python pseudo-code dkc_enforce_step (signature, parser tags, executor subprocess, log JSON) | architect | reasoning | tickets/HOR-054.notes.md | manual: pseudo-code aprobado | pseudo-code en notes | — | done | 1 | — |
| S1.T3 | Diseno detallado Python pseudo-code dkc_invoke_agent (resolucion HOR-029, mode dispatch, NO spawn) | architect | reasoning | tickets/HOR-054.notes.md | manual: pseudo-code aprobado | pseudo-code en notes | — | done | 1 | — |
| **S1.GATE** | Gate sync Session 1 | reviewer | balanced | tickets/HOR-054.md | gate persistido | inventario + 2 pseudo-codes aprobados | — | done | 1 | — |

### Session 2 — Implementar dkc_enforce_step + tests + 5 POC [tipo: auto] [tier: T2]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S2.T1 | Crear server/src/deckard_cain/tools/enforcement.py + register() pattern | developer | balanced | server/src/deckard_cain/tools/enforcement.py | manual: import sin error | modulo importable, register() funcional | git revert | done | 2 | — |
| S2.T2 | Implementar dkc_enforce_step: parser tags + executor subprocess + log JSON | developer | reasoning | tools/enforcement.py | TC-IMPROVE-01-enforce-step | tool registrado, parsea tags correctamente | git revert | done | 2 | — |
| S2.T3 | Integrar enforcement.register en server.py | developer | balanced | server/src/deckard_cain/server.py | manual: server starts sin error | server inicia con 30 tools (27+3) | git revert | done | 2 | — |
| S2.T4 | Tests unit + integration para dkc_enforce_step (5 escenarios) | developer | balanced | server/tests/test_enforcement.py | TC-IMPROVE-02..06 | 5/5 tests pasan | git revert | done | 2 | — |
| **S2.GATE** | Gate sync Session 2 (DET-23 Quality Review) | reviewer | balanced | tickets/HOR-054.md | gate persistido | dkc_enforce_step funcional + tests pasan | — | done | 2 | — |

### Session 3 — Implementar dkc_invoke_agent + tests + refactor 6 mentions [tipo: auto] [tier: T2]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S3.T1 | Implementar dkc_invoke_agent: resolver HOR-029 mapping + dispatch logic | developer | reasoning | tools/enforcement.py | TC-IMPROVE-07-invoke-agent | tool registrado, mapping resolved | git revert | done | 3 | — |
| S3.T2 | Refactor las 6 mentions AGENT INVOCATION a fence dkc:agent-invocation | developer | balanced | prompts/steps/_design-shared.md, intake-explore.md, request-intake.md, request-execute.md | manual: grep 6 mentions → 0, grep fence → 6 | 6 archivos refactoreados | git revert | done | 3 | — |
| S3.T3 | Tests unit + integration para dkc_invoke_agent (4 escenarios) | developer | balanced | server/tests/test_enforcement.py | TC-IMPROVE-08..11 | 4/4 tests pasan | git revert | done | 3 | — |
| **S3.GATE** | Gate sync Session 3 (DET-23 Quality Review) | reviewer | balanced | tickets/HOR-054.md | gate persistido | dkc_invoke_agent + refactor 6 mentions completados | — | done | 3 | — |

### Session 4 ⚑ FUERTE — Etiquetado masivo + medicion empirica baseline [tipo: fuerte] [tier: T3]

| # | Task | Role | Tier | Files | Tests | DoD | Rollback | Status | Session | Cambios |
|---|------|------|------|-------|-------|-----|----------|--------|---------|---------|
| S4.T1 | Etiquetar invocaciones a-hook real identificadas en S1 (subset de las 11 extras + nuevas si aparecen) | developer | balanced | prompts/steps/*.md | manual: grep cuenta total ≥ 25 | universe a-hook completo etiquetado | git revert | done | 4 | — |
| S4.T2 | Audit baseline post-S4 via dkc-audit-validators | reviewer | balanced | (read only) | manual: audit exit 0 | drift 0 en corpus | — | done | 4 | — |
| S4.T3 | Medicion empirica skip rate: 2 tickets nuevos pre-hook (baseline) vs post-hook | reviewer | reasoning | tickets/HOR-054.notes.md | manual: tabla skip rate | baseline > 70%, post < 30% | — | done | 4 | — |
| **S4.GATE** ⚑ | Gate sync Session 4 (autopilot approvedBy: autopilot) | reviewer | reasoning | tickets/HOR-054.md | gate persistido + Quality Review | medicion documentada + HOR-054 close ready | — | done | 4 | — |

## Constraints

- DET-2 source_ref, DET-11 KB-first, DET-16 propagacion, DET-20 sessions, DET-22 teach-close (ya skipped)
- FastMCP 1.0+ con @mcp.tool() decorator pattern
- HOR-041 constraint: 0 dependencias nuevas (Python subprocess + json builtins suficiente)

## Dependencies

| Dep | Type | Description | Risk |
|-----|------|-------------|------|
| FastMCP | internal | Ya en uso, server.py:23 | Bajo |
| HOR-055 catalogo a-hook | internal | Pre-requisito CUMPLIDO (23 tags / 14 kinds) | Cero |
| HOR-055 parser HC fence | internal | Pre-requisito CUMPLIDO (commit dfba980) | Cero |
| prompts/agent-tiers.md HOR-029 | internal | Mapping host capability | Bajo |

## Risks and mitigations

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| Refactor 6 mentions rompe semantica del prompt | medium | medium | Tests pre/post mentions. Diff manual de cada |
| Spawn no controlado en Claude Code si dkc_invoke_agent es muy liberal | low | high | DEC-LOCAL-03: tool RETORNA instrucciones, no spawnea. LLM principal decide |
| Medicion empirica skip rate ruidosa (solo 2 tickets) | medium | low | Aceptamos error de medicion. S4 documenta numero + razonamiento |

## Open questions

- [ ] S1.T1: ¿las 11 invocaciones extras son a-hook real o prose? — resolver clasificando cada una
- [ ] S4.T3: ¿2 tickets nuevos son suficiente para baseline skip rate? — aceptamos como signal, no prueba estadistica

## Decisions

(A llenar en execute)

## Acceptance checkpoints

- [ ] dkc_enforce_step funcional + 5 tests pasan
- [ ] dkc_invoke_agent funcional + 4 tests pasan
- [ ] 6 mentions AGENT INVOCATION → fence dkc:agent-invocation
- [ ] 11+ etiquetas a-hook nuevas (subset clasificado) o documentadas como prose
- [ ] Audit dkc-audit-validators exit 0 post-S4
- [ ] Medicion empirica skip rate documentada
- [ ] Tests existentes (28 tools previos) sin regresion

## Success metrics

| Metric | Baseline (pre-HOR-054) | Target (post-HOR-054) |
|--------|------------------------|----------------------|
| Tools MCP en deckard-cain | 27 | 29 (+2) |
| Etiquetas a-hook en steps | 23 (HOR-055 S6) | 30+ (~30% incremento) |
| AGENT INVOCATION reales / total | 1/6 (17% — HOR-052) | 6/6 (100%) |
| Skip rate medido | >70% (estimado D11) | <30% post-tool |
