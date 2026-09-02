---
id: SPEC-workflow-agent-enforcement-25
project: horadric
ticket: HOR-025
status: done
---

# Enforcement multi-LLM existente + agent tester + medicion empirica context preservation

# Enforcement multi-LLM existente + agent tester + medicion empirica context preservation

## Executive summary — lo que estas aprobando

> *Esta seccion esta disenada para revision rapida. Si solo lees esto y te basta para decidir, ese es el objetivo. El detalle vive en Requirements, Artifacts y Tasks.*

### Que se quiere

DKC ya tiene **5 agents formales** con tier semantico (researcher/scribe fast, developer/reviewer balanced, architect reasoning), `prompts/agent-tiers.md` con mapping multi-provider (anthropic/openai/google/local) y output schemas JSON por agent. Pero **0 steps invocan Agent tool realmente** — el sistema es declarativo, no operacional. En HOR-022 (5h, 200K+ tokens) un solo LLM hizo TODO en un context window unico.

Este ticket NO inventa multi-LLM. Hace 4 cosas:
1. Define sintaxis canonica para invocar Agent tool en steps (5-7 steps clave migrados)
2. Agrega agent `tester` (unico gap real — ciclo run-tests-parse-report sin agent hoy)
3. Permite override per-project de agent-tiers global
4. **Mide empirico por primera vez** si delegar realmente alivia context del orchestrator (hipotesis nunca validada)

### Decisiones criticas que necesitan tu OK

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Sintaxis canonica de invocacion** — bloque markdown reconocible (ej. `> AGENT INVOCATION: subagent_type=X, tier=Y, prompt="..."`). NO inventa nueva infra — usa Agent tool existente | Sin sintaxis canonica, los steps siguen siendo declarativos y el LLM principal interpreta texto. Con sintaxis, el LLM SABE que debe invocar Agent tool — el comportamiento se vuelve enforced |
| 2 | **Per-project override de agent-tiers** — `config.yaml.tiers` opcional sobreescribe `agent-tiers.md` global. Resolution: project > global | Permite que bayley personal use todo sonnet, up1 SP3 use opus para architect, horadric meta-sistema use multi-tier. Sin override, todos los proyectos usan la misma config global — friccion para casos de uso distintos |
| 3 | **Agent tester nuevo** (tier balanced) — corre tests + parsea output + reporta JSON estructurado. Refactor menor en developer.md (corrida de tests delegada al tester) | El ciclo "implement → run tests → parse output → report" no tiene agent hoy. En HOR-022 lo hice yo mezclando developer+inline. Tester isolation independiza esa labor del developer y standardiza output |
| 4 | **S4 exploratoria T3** — medicion empirica de context preservation. Re-correr tasks selectas de HOR-022 con Agent delegation real, medir tokens del principal pre/post + activaciones DET-15 en proximos 3-5 tickets | Hipotesis H6/H7/H8 nunca se validaron porque nunca se implementaron. Es el valor real del ticket — si confirma, multi-LLM es game-changer para tickets >1500 lineas; si refuta, descartamos sin haber invertido en infra de adapter multi-provider |

### Riesgos principales y como los mitigamos

- **Enforcement rompe steps que no usan sintaxis canonica** → REQ-PRESERVE-02: backwards compat. Sintaxis canonica es opt-in por step migrado; steps no modificados ejecutan inline como antes. Validado por TC-10
- **Agent tester duplica trabajo del developer** → refactor minimo: developer NO corre tests si tester esta disponible. Ciclo nuevo `researcher → developer → tester → reviewer → scribe`. Sin developer doing tests, no hay duplicacion
- **Medicion S4 puede mostrar que multi-LLM NO entrega valor** → aceptable. Decision documentada con racional. Roadmap HOR-029 (adapters multi-provider) se condiciona a esto. Sin riesgo de scope creep si refuta
- **Override per-project sin uso real** → opcional, schema vacio es default. Si ningun proyecto lo usa en 3 meses, follow-up para descartar campo

### Que NO se hace en este ticket

- NO migrar TODOS los steps a invocacion explicita — solo 5-7 clave (otros pueden migrar gradual cuando se toquen por otros tickets)
- NO implementar adapters para invocar OpenAI/Gemini via API directa — Anthropic via Agent tool es lo unico operativo. Otros providers documentados en agent-tiers.md como future path (HOR-029 si validacion convence)
- NO agregar agents adicionales mas alla del tester (debugger/migrator/etc. quedan como follow-up condicional)
- NO refactorizar output schemas existentes (researcher/developer/reviewer ya tienen schema JSON; tester usa el patron como referencia)
- NO promover el patron de "audit KB-first antes de propuesta" a nueva DET en este ticket (puede emerger como rule en cierre)

### Tamano estimado

5 sessions execute + 1 cierre. **S4 mas pesada (T3)** — medicion empirica requiere correr Agent tool real, comparar metricas, trackear DET-15 en proximos tickets. **S2 + S3 son las criticas operacionalmente** (tester + enforcement). Estimacion total: **6-10h efectivas** segun cuanta validacion empirica detallada se haga en S4.

### Como vas a saber que funciona

- Abro `prompts/steps/request-execute.md` paso A y veo `> AGENT INVOCATION: subagent_type=researcher, tier=fast, prompt="..."` (sintaxis canonica)
- Ejecuto el step y el LLM principal invoca `Agent(subagent_type=researcher, ...)` realmente — no inline
- `prompts/agents/tester.md` existe con output schema JSON estructurado
- Tester ejecutado sobre `npm run test` de horadric-cube retorna JSON con `passed=201, failed=0, suites=[...]`
- En S4 mido tokens del principal antes/despues — reduccion >30% medible
- En 3-5 tickets post-HOR-025 trackeo activaciones DET-15 — sin activaciones en tickets >1000 lineas

---

## Purpose

Cerrar la brecha entre **declarativo y operacional** del sistema de agents DKC. El audit pre-execute revelo que 5 agents + agent-tiers.md + output schemas estan declarados pero NUNCA se ejecutan via Agent tool — un solo LLM hace todo. Agregar agent `tester` que faltaba. Medir empirico si la separacion REAL de agents alivia context del orchestrator (hipotesis nunca validada).

Para el dev DKC: tickets largos (>1500 lineas) se vuelven factibles sin disparar DET-15. Para futuros LLMs/devs DKC: documentacion clara del patron de invocacion + recepcion. Para el sistema: ahorro real de costos si los tiers se utilizan (haiku 10% del costo de opus para tasks de recoleccion).

## Analisis de mejora

### Estado actual

**Agents existen pero no se invocan**:
- `prompts/agents/*.md` (5 archivos): researcher, scribe, developer, reviewer, architect — con tier + capabilities + restrictions
- `prompts/agent-tiers.md`: catalogo multi-provider, configuraciones mixtas, fallback
- Output schemas JSON definidos en researcher/developer/reviewer (architect/scribe sin schema formal)
- 10 steps **mencionan** agents con sintaxis `Activar researcher (tier: fast)`
- **0 steps invocan** Agent tool con `subagent_type` (grep retorna 0 matches)
- Evidencia HOR-022: en 5h de ejecucion, Claude Code Opus 4.7 ejecuto inline todas las labores — researcher + developer + reviewer + scribe en una sola conversation. ~200K tokens estimados en el context principal

**Tareas sin agent dedicado**:
- Correr tests + parsear output + reportar fail/pass con detalle → mezclado en developer
- Reproducir bugs → mezclado en researcher + architect
- Migracion masiva → scripts automatizados lo cubren mejor

### Problema / oportunidad

Sistema declarado pero no enforced. La hipotesis "multi-LLM alivia context window del principal" no se ha validado porque no se ha implementado. Tickets como HOR-021 (1165 lineas) y HOR-022 (1210 lineas) estan cerca del limite practico — tickets de 2000+ lineas no son factibles hoy sin trigger DET-15.

Ademas: la migracion conceptual a CrewAI-style multi-LLM aparece como propuesta razonable pero VIOLA DET-11 (KB-first) — DKC ya tenia la abstraccion. El verdadero gap es enforcement + medicion.

### Estado deseado

- Steps clave invocan Agent tool con sintaxis canonica
- Agent tester existe con output schema JSON valido
- Per-project override de agent-tiers disponible
- Hipotesis context preservation validadas empirico (confirmadas o refutadas con datos)
- Decision documentada sobre roadmap multi-provider adapters

### Alcance propuesto

5 sessions execute + cierre. ~6-10h efectivas. Toca solo `deckard` (prompts + agents + agent-tiers + horadric config example).

### Complejidad estimada

**Media**. S1 + S2 son refactors documentales (low risk). S3 enforcement requiere ajustar 5-7 steps clave (moderate). S4 medicion empirica es T3 — requiere correr Agent tool real y comparar metricas (moderate-high — primera vez en DKC). S5 cierre + roadmap (low).

## Requirements

### REQ-IMPROVE-01: Sintaxis canonica de invocacion Agent en steps

> **Que cambia**: los steps DKC ahora tienen una sintaxis estandar para indicar "aqui invocar Agent tool", reconocible por el LLM principal. **Por que**: hoy los steps dicen "Activar researcher (tier: fast)" como texto declarativo y el LLM lo ejecuta inline en lugar de delegar.

El sistema MUST adoptar una sintaxis canonica reconocible (ej. `> AGENT INVOCATION: subagent_type=X, tier=Y, prompt="..."` como blockquote) en los steps. El LLM principal MUST invocar `Agent(subagent_type=X, ...)` realmente al encontrar esta sintaxis. Steps que no usen la sintaxis canonica siguen ejecutando inline (backwards compat).

<details><summary>Scenarios de validacion</summary>

- GIVEN un step con sintaxis canonica, WHEN el LLM principal ejecuta el step, THEN invoca Agent tool real (no ejecuta inline)
- GIVEN un step sin sintaxis canonica, WHEN el LLM principal ejecuta, THEN ejecuta inline como antes (sin regresion)
- GIVEN sintaxis canonica con tier no disponible en host, WHEN el LLM intenta invocar, THEN fallback graceful con warning + ejecucion inline

</details>

#### Acceptance

- TC-1 (sintaxis documentada), TC-2 (invocacion real)

### REQ-IMPROVE-02: Per-project override de agent-tiers global

> **Que cambia**: cada proyecto DKC puede sobreescribir el mapeo tier→modelo del `agent-tiers.md` global via `config.yaml.tiers`. **Por que**: bayley personal puede dejar todo sonnet; up1 SP3 puede pagar opus para architect; horadric meta-sistema usa multi-tier. Una sola config global es friccion.

El sistema MUST permitir override opcional en `projects/{project}/config.yaml` con seccion `tiers:`. Resolution order: project tiers > global agent-tiers.md > host default. Sin override, comportamiento actual se preserva (REQ-PRESERVE-01).

<details><summary>Scenarios de validacion</summary>

- GIVEN config.yaml.tiers con override de reasoning, WHEN el LLM resuelve tier para architect, THEN usa el modelo override (no el global)
- GIVEN proyecto sin config.yaml.tiers, WHEN el LLM resuelve cualquier tier, THEN usa agent-tiers.md global
- GIVEN config.yaml.tiers con tier desconocido, WHEN el LLM lee, THEN warning + fallback al global

</details>

#### Acceptance

- TC-3

### REQ-IMPROVE-03: Agent tester nuevo con output schema estructurado

> **Que cambia**: nuevo agent `tester` (tier balanced) corre tests + parsea output + reporta JSON estructurado. Reemplaza la corrida de tests del developer. **Por que**: el ciclo "implement → run tests → parse output → report" no tiene agent hoy. Isolation del context del developer mejora el flujo.

El sistema MUST agregar `prompts/agents/tester.md` con:
- Tier balanced, capabilities `bash` + `read` + `grep`, restrictions `no_edit` + `no_write`
- Output schema JSON: `{suite, command_run, passed, failed, failures, coverage_delta, duration_ms, recommendation}`
- Restriction: NO arregla tests, solo ejecuta + reporta. Si fallan, sugiere `developer_review_needed`

El developer MUST delegar corrida de tests al tester (refactor minor en `developer.md`). Ciclo nuevo: `researcher → developer → tester → reviewer → scribe`.

<details><summary>Scenarios de validacion</summary>

- GIVEN tester invocado sobre `npm run test` de horadric-cube, WHEN ejecuta, THEN retorna JSON con passed=201/failed=0 + suites parseadas + duration_ms
- GIVEN tester encuentra failures, WHEN retorna, THEN incluye `failures: [{file, test, error, stacktrace}]` + recommendation `developer_review_needed`
- GIVEN developer post-implementacion, WHEN cierra task, THEN delega corrida de tests al tester (no inline) — REQ-IMPROVE-03

</details>

#### Acceptance

- TC-4 (schema valido), TC-5 (invocacion sobre horadric-cube)

### REQ-IMPROVE-04: 5-7 steps clave invocan Agent tool real

> **Que cambia**: los 5-7 steps con mayor uso de agents (`request-intake`, `intake-explore`, `request-execute` paso A/C, gate sync) migrados a invocacion explicita con sintaxis canonica. **Por que**: enforcement gradual — primero los steps mas usados, otros pueden migrar cuando se toquen.

El sistema MUST tener al menos 5 steps con bloques de invocacion canonica. Cada bloque MUST resolver al Agent tool real (no fallback a inline) cuando el tier este disponible.

<details><summary>Scenarios de validacion</summary>

- GIVEN `request-execute.md` paso A modificado, WHEN se ejecuta, THEN invoca `Agent(subagent_type=researcher)` (no inline)
- GIVEN gate sync paso, WHEN se cierra session, THEN invoca `Agent(subagent_type=reviewer)` para quality review
- GIVEN steps migrados, WHEN grep `subagent_type` en `prompts/steps/`, THEN >0 matches (era 0 pre-HOR-025)

</details>

#### Acceptance

- TC-6

### REQ-IMPROVE-05: LLM principal usa menos tokens con delegation real (exploratorio)

> **Que cambia**: cuando los steps delegan realmente via Agent tool, el LLM principal libera context window — su token usage por ticket grande baja sustancialmente. **Por que**: hipotesis nunca validada. El valor real de multi-LLM se mide aqui, no en costo total.

El sistema MUST demostrar empiricamente reduccion >=30% en tokens del LLM principal en un ticket de complejidad similar a HOR-022 (5h, 8 F items) cuando se aplica delegation real.

<details><summary>Scenarios de validacion</summary>

- GIVEN baseline HOR-022 (estimado ~200K tokens en el principal), WHEN se re-correo tasks selectas (researcher inicial + scribe registros + tester runs) con Agent delegation real, THEN tokens del principal bajan >=30%
- GIVEN reduccion confirmada, WHEN se documenta en S4, THEN H6 marca confirmed con evidencia
- GIVEN reduccion NO confirmada (<10%), WHEN se documenta, THEN H6 marca refuted + roadmap multi-provider descartado

</details>

#### Acceptance

- TC-7 (medicion empirica)

### REQ-IMPROVE-06: Escalabilidad — tickets largos sin trigger DET-15 (exploratorio)

> **Que cambia**: con delegation real, tickets >1000 lineas no disparan DET-15 (protocolo contexto agotado). **Por que**: HOR-021 (1165) y HOR-022 (1210) son cerca del limite practico; tickets de 2000+ lineas no son factibles hoy.

El sistema MUST trackear activaciones DET-15 en proximos 3-5 tickets post-HOR-025. Validacion exitosa: sin activaciones DET-15 en tickets >1000 lineas.

<details><summary>Scenarios de validacion</summary>

- GIVEN 3-5 tickets post-HOR-025 (HOR-023/024/026/027/028 candidatos), WHEN se ejecutan con delegation real, THEN DET-15 no se activa en ninguno
- GIVEN ticket >1500 lineas (improbable pero posible), WHEN se ejecuta, THEN completa sin perder coherencia
- GIVEN activacion DET-15 emerge, WHEN se reporta, THEN H7 marca refuted + documentar causa

</details>

#### Acceptance

- TC-8 (medicion en 3-5 tickets post-fecha)

### REQ-PRESERVE-01: Proyectos sin config.tiers usan agent-tiers global

> **Que cambia**: nada — backwards compat. **Por que**: override es opt-in; proyectos como bayley o drunappgor sin la seccion siguen con el comportamiento default.

El sistema MUST resolver tier al global `agent-tiers.md` cuando `config.yaml.tiers` esta ausente.

#### Acceptance

- TC-9

### REQ-PRESERVE-02: Steps que no usen sintaxis canonica siguen funcionando

> **Que cambia**: steps no migrados (la mayoria) siguen ejecutando inline. **Por que**: enforcement gradual; no romper steps existentes.

El sistema MUST permitir coexistencia de steps con/sin sintaxis canonica. El LLM principal MUST detectar la sintaxis y solo aplicar delegation cuando esta presente.

#### Acceptance

- TC-10

## Non-functional requirements

| NFR | Descripcion |
|-----|-------------|
| Overhead de delegation | Cada Agent tool call agrega latencia (1-3s tipico). Aceptable si reduce context window real |
| Backwards compat | Steps legacy sin sintaxis canonica deben ejecutar identico a pre-HOR-025 |
| Fallback graceful | Si Agent tool no soporta tier requerido (ej. host limitado a Anthropic), warning + execucion inline |
| Output schema validable | Tester JSON debe parsearse sin error con zod-like check (informal hasta HOR-026) |
| Medicion empirica documentada | S4 produce tabla comparativa pre/post con datos reales |

## Artifacts

### Modified

| Artefacto | REQ | Cambio |
|-----------|-----|--------|
| `prompts/_style.md` | REQ-IMPROVE-01 | Principio 7 nuevo: sintaxis canonica de invocacion Agent |
| `prompts/steps/request-intake.md` | REQ-IMPROVE-04 | Paso "Recopilar contexto (researcher)" con sintaxis canonica |
| `prompts/steps/intake-explore.md` | REQ-IMPROVE-04 | Loop multi-capa invoca researcher canonical |
| `prompts/steps/request-execute.md` | REQ-IMPROVE-03, REQ-IMPROVE-04 | Paso A (researcher refresh rules), paso C (reviewer), nuevo paso C2 (tester post-developer), gate sync (reviewer) |
| `prompts/steps/_design-shared.md` | REQ-IMPROVE-04 | Researcher de context-gathering inicial |
| `prompts/agents/tester.md` | REQ-IMPROVE-03 | **Nuevo** — tier balanced + capabilities + output schema |
| `prompts/agents/developer.md` | REQ-IMPROVE-03 | Refactor menor: delega corrida tests al tester |
| `prompts/agent-tiers.md` | REQ-IMPROVE-02 | Documentar resolution order: project > global |
| `projects/horadric/config.yaml` | REQ-IMPROVE-02 | Ejemplo de seccion `tiers:` (override opcional, mantener vacio inicialmente) |

### Added

| Artefacto | REQ | Descripcion |
|-----------|-----|-------------|
| `prompts/agents/tester.md` | REQ-IMPROVE-03 | Agent nuevo con output schema JSON |

## Tasks

> **Numeracion**: HOR-025 no tiene `### Session N` previas. Plan empieza en S1.

### Session 1 — Sintaxis canonica de invocacion + per-project override de tiers [tipo: ⚑ fuerte] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Definir sintaxis canonica de invocacion Agent en steps. Decision: blockquote `> AGENT INVOCATION: subagent_type=X, tier=Y, prompt="..."` (visible + parseable + opt-in) | REQ-IMPROVE-01 | architect | — | `prompts/_style.md` (Principio 7 nuevo) | Sintaxis aprobada por dev; ejemplo en `_style.md` con caso real | git revert | DET-2, DET-11 | pending | 1 |
| S1.T2 | `agent-tiers.md`: documentar resolution order `project > global > host default` + ejemplo de override per-project | REQ-IMPROVE-02 | scribe | S1.T1 | `prompts/agent-tiers.md` | Seccion nueva visible; ejemplo poblado | git revert | DET-11 | pending | 1 |
| S1.T3 | Schema `config.yaml.tiers` opcional. Ejemplo en `projects/horadric/config.yaml` (seccion vacia o con override mock) | REQ-IMPROVE-02 | developer | S1.T2 | `projects/horadric/config.yaml` | Schema validable; horadric tiene seccion (vacia o con ejemplo) | git revert | DET-2, RULE-server-frontmatter-legacy-001 | pending | 1 |
| **S1.GATE** | Gate session 1 — tier T1 + Quality review DET-23 light. Dev aprueba sintaxis canonica + resolution order | — | reviewer | S1.T3 | — | DET-23 dim 1 (calidad), 7 (claridad) pass | (no aplica) | DET-13, DET-20, DET-23 | pending | 1 |

### Session 2 — Agent `tester` nuevo + refactor developer [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Crear `prompts/agents/tester.md` con frontmatter (tier balanced, capabilities, restrictions), seccion `## Rol`, `## Cuando se activa`, `## Que hace`, `## Output` con schema JSON estructurado | REQ-IMPROVE-03 | architect | S1.GATE | `prompts/agents/tester.md` (nuevo) | Doc completo siguiendo template de otros agents; output schema valido | git revert | DET-2, DET-10 | pending | 2 |
| S2.T2 | Refactor `prompts/agents/developer.md`: seccion `## Que hace` ya no incluye "correr tests" (delegado al tester). Mencionar handoff post-implementacion al tester | REQ-IMPROVE-03 | developer | S2.T1 | `prompts/agents/developer.md` | Diff minimal; sin breaking changes a output schema del developer | git revert | DET-7, DET-9 | pending | 2 |
| S2.T3 | Smoke: invocar tester real sobre tests de horadric-cube. Usar Agent tool con subagent_type=tester (o subagent_type=general-purpose con prompt explicito si tester no esta registrado aun) | REQ-IMPROVE-03 | tester | S2.T2 | n/a (smoke) | Tester retorna JSON con passed=201/failed=0/suites=[...]. Datos parseables | (no aplica) | DET-7, DET-13 | pending | 2 |
| **S2.GATE** | Gate session 2 — tier T2 + Quality review DET-23 standard. ⚑ fuerte: dev confirma tester usable | — | reviewer | S2.T3 | — | DET-23 dim 1, 2, 3, 6, 7 pass; tester smoke confirma | (no aplica) | DET-13, DET-20, DET-23 | pending | 2 |

### Session 3 — Enforcement: 5-7 steps clave con invocacion canonica [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | `request-intake.md` paso 5 (Recopilar contexto): agregar bloque AGENT INVOCATION canonical para researcher | REQ-IMPROVE-04 | developer | S2.GATE | `prompts/steps/request-intake.md` | grep `subagent_type=researcher` retorna >0 matches | git revert | DET-7, DET-9 | pending | 3 |
| S3.T2 | `intake-explore.md` paso 2.b (Investigar): bloque AGENT INVOCATION para researcher loop multi-capa | REQ-IMPROVE-04 | developer | S3.T1 | `prompts/steps/intake-explore.md` | grep confirma sintaxis canonica | git revert | DET-7, DET-9 | pending | 3 |
| S3.T3 | `request-execute.md` paso A (Contexto): bloque AGENT INVOCATION para researcher refresh rules | REQ-IMPROVE-04 | developer | S3.T2 | `prompts/steps/request-execute.md` | grep confirma sintaxis canonica | git revert | DET-7, DET-9 | pending | 3 |
| S3.T4 | `request-execute.md` paso C (Validar): bloque AGENT INVOCATION para reviewer. Insertar paso C2 nuevo con tester | REQ-IMPROVE-04, REQ-IMPROVE-03 | developer | S3.T3 | `prompts/steps/request-execute.md` | Pasos C + C2 con sintaxis canonica | git revert | DET-7, DET-9, DET-25 | pending | 3 |
| S3.T5 | `_design-shared.md` paso 0a (Executive summary): bloque AGENT INVOCATION para researcher context-gathering si aplica | REQ-IMPROVE-04 | developer | S3.T4 | `prompts/steps/_design-shared.md` | grep confirma sintaxis canonica | git revert | DET-7 | pending | 3 |
| S3.T6 | Smoke retroactivo conceptual: revisar HOR-022 con la nueva sintaxis — ¿hubiera sido distinto? Documentar | REQ-IMPROVE-04 | reviewer | S3.T5 | session log del ticket | Analisis cualitativo documentado | (no aplica) | DET-13 | pending | 3 |
| **S3.GATE** | Gate session 3 — tier T2 + Quality review DET-23 standard. ⚑ fuerte: dev confirma 5-7 steps con sintaxis canonica | — | reviewer | S3.T6 | — | DET-23 dim 1, 2, 6, 7 pass; grep >5 invocaciones canonical | (no aplica) | DET-13, DET-20, DET-23 | pending | 3 |

### Session 4 — Medicion empirica context preservation (exploratoria) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Baseline: estimar tokens del LLM principal en HOR-022 post-mortem. Usar `/context` del editor o telemetry si disponible. Documentar metodologia | REQ-IMPROVE-05 | researcher | S3.GATE | session log + HOR-022 ticket | Numero baseline documentado (estimacion con racional) | (no aplica) | DET-1, DET-4, DET-13 | pending | 4 |
| S4.T2 | Diseñar experimento: 3 tasks selectas de HOR-022 a re-correr — (a) researcher inicial del intake, (b) scribe registro post-task, (c) tester sobre tests reales. Cada una mide tokens del principal | REQ-IMPROVE-05 | architect | S4.T1 | session log | Diseño experimental con metricas precisas | (no aplica) | DET-1, DET-4 | pending | 4 |
| S4.T3 | Ejecutar experimento: invocar Agent tool REAL con subagent_type correspondiente. Medir tokens del principal pre/post invocacion | REQ-IMPROVE-05 | developer + agents reales | S4.T2 | session log + experimentos | 3 mediciones con delta calculado. Reduccion tokens en cada caso | git revert si emerge issue | DET-7, DET-13 | pending | 4 |
| S4.T4 | Analizar resultados: confirmar/refutar H6 (reduccion >=30%), H7 (DET-15 no se activa), H8 (escalabilidad). Documentar | REQ-IMPROVE-05, REQ-IMPROVE-06 | architect | S4.T3 | session log + decision documentada | Hipotesis con status final + decision sobre next steps | (no aplica) | DET-1, DET-4, DET-13 | pending | 4 |
| S4.T5 | Setup tracking DET-15 para proximos 3-5 tickets post-HOR-025: nota inline en steps o checklist para registrar activaciones | REQ-IMPROVE-06 | scribe | S4.T4 | session log + tickets futuros (HOR-023/024/026/027/028) | Tracker visible para futuras sessions | (no aplica) | DET-13 | pending | 4 |
| **S4.GATE** | Gate session 4 — tier T3 + Quality review DET-23 exhaustive. ⚑ fuerte: dev confirma datos empiricos + decision sobre roadmap | — | reviewer | S4.T5 | — | DET-23 las 10 dimensiones revisadas; datos reales validados | (no aplica) | DET-13, DET-20, DET-23 | pending | 4 |

### Session 5 — Cierre + roadmap adapters multi-provider [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Revisar backlog del ticket. Items must resueltos o documentados como follow-up | REQ-IMPROVE-05 | reviewer | S4.GATE | ticket Backlog | Lista clara | (no aplica) | DET-13, DET-17 | pending | 5 |
| S5.T2 | DET-22 paso 0: decision teach-close (preguntar al dev) | REQ-IMPROVE-05 | scribe | S5.T1 | ticket frontmatter + seccion Teaching — Close | teachings.close: done o skipped con razon | git revert | DET-13, DET-22 | pending | 5 |
| S5.T3 | Si H6 confirma valor real: roadmap HOR-029 — adapters OpenAI/Gemini via API directa (para tier no soportado por host). Si refuta: documentar descarte + razon | REQ-IMPROVE-05 | architect | S5.T2 | ticket Summary + posible nuevo ticket HOR-029 | Decision documentada con racional | (no aplica) | DET-13, DET-16 | pending | 5 |
| S5.T4 | Considerar otros agents faltantes que emergieron del audit: debugger, etc. Decidir follow-up | REQ-IMPROVE-03 | architect | S5.T3 | ticket Summary | Decision documentada | (no aplica) | DET-13 | pending | 5 |
| S5.T5 | Acceptance checkpoints: REQ-IMPROVE-01..06 + REQ-PRESERVE-01/02 con TC pass + evidence. Refinar learns | REQ-IMPROVE-01..06, REQ-PRESERVE-* | reviewer | S5.T4 | ticket Coverage map + Test cases + Learns | Coverage map sin NOT COVERED. Learns con status promoted/discarded | git revert si edicion masiva con error | DET-7, DET-13, DET-25 | pending | 5 |
| S5.T6 | Summary completo. Status: in_progress → closed. Closed: 2026-05-XX. Reindex final | REQ-IMPROVE-05 | scribe | S5.T5 | ticket frontmatter + seccion Summary | Frontmatter cerrado. Summary sin placeholders | git revert si frontmatter erroneo | DET-13 | pending | 5 |
| **S5.GATE** | Gate de cierre — tier T2 + Quality review DET-23 exhaustive sobre ticket completo. ⚑ fuerte: dev confirma close (accion irreversible) | — | reviewer | S5.T6 | — | DET-23 las 10 dimensiones revisadas sobre el conjunto. Dev confirma | (no aplica — irreversible) | DET-13, DET-17, DET-20, DET-22, DET-23 | pending | 5 |

### Task contract notes

Contracts viven en las columnas. Defaults aplicables: Rollback `git revert` salvo gates y cierre. Validation default sigue tier de la session + Quality review DET-23.

## Constraints

- **DET-10 limits per rol**: agents respetan capabilities + restrictions declaradas. Tester NO arregla tests (solo ejecuta + reporta)
- **DET-11 KB-first**: HOR-025 mismo es ejemplar de violacion en propuesta original — patron a documentar como rule candidata en cierre
- **RULE-workflow-det-introduction-001**: si emerge DET nueva (ej. "audit KB-first pre-propuesta"), debe seguir simetria 3-capas (regla + workflow + step)
- **RULE-server-frontmatter-legacy-001**: config.yaml.tiers debe ser opcional con guard explicito al leer (proyectos legacy sin la seccion no rompen)

## Dependencies

- `SPEC-views-supervisor-flow-22` (HOR-022): introdujo agent-tiers.md y patrones de invocacion documentales. Este spec extiende a operacional
- `prompts/agent-tiers.md`: existente, este spec lo extiende con resolution order
- `prompts/agents/*.md` existentes: este spec agrega tester + modifica developer

## Risks and mitigations

| Riesgo | Mitigacion |
|--------|-----------|
| Enforcement rompe steps que no usan sintaxis canonica | REQ-PRESERVE-02 + TC-10: backwards compat. Sintaxis canonica opt-in por step migrado |
| Agent tester duplica trabajo del developer | Refactor minor en developer.md — corrida tests delegada al tester. Sin developer doing tests, no duplicacion |
| Medicion S4 muestra que multi-LLM NO entrega valor | Aceptable. Decision documentada con racional. Roadmap HOR-029 se condiciona |
| Override per-project sin uso real | Opcional, schema vacio es default. Si ningun proyecto lo usa en 3 meses, follow-up para descartar campo |
| Latencia adicional por Agent tool calls | Aceptable si reduce context window. Medir en S4 |
| Host LLM no soporta delegation a otro proveedor | agent-tiers.md ya documenta este caso — fallback al modelo del mismo proveedor del host |

## Open questions

> Resueltas durante el ticket en sessions indicadas.

- **¿Sintaxis canonica exacta?** S1.T1 — propuesta `> AGENT INVOCATION: ...` blockquote
- **¿Resolution order project > global > host?** S1.T2 — confirmar con dev en S1.GATE
- **¿Tester invocacion en HC Claude Code soporta subagent_type=tester custom?** S2.T3 — si no, usar general-purpose con prompt explicito
- **¿H6/H7/H8 confirman valor real?** S4 — empirico

## Decisions

### DEC-LOCAL-01: Skip teach-intake — material educativo ya condensado

- **Contexto**: HOR-025 tiene 9 hipotesis del Triage + audit DKC en Context found
- **Drivers**: la informacion educativa relevante esta visible sin necesidad de archivo separado
- **Decision**: `teachings.intake: skipped` con razon documentada. Aprobado por el dev (2026-05-15)

### DEC-LOCAL-02: Re-scope post-audit (pre-finding DET-11)

- **Contexto**: propuesta original violaba DET-11 (reinventaba agent-tiers.md que ya existia)
- **Drivers**: KB-first audit revelo gap real (enforcement) vs gap percibido (abstraccion)
- **Decision**: re-scope a 4 dimensiones cohesivas centradas en enforcement + tester + medicion empirica
- **Consecuencias**: ticket mas chico, mas enfocado, valor medible

## Success metrics

| Metric | Target | Source |
|--------|--------|--------|
| Steps con sintaxis canonica | ≥ 5 | grep subagent_type en prompts/steps/ |
| Agent tester usable | smoke pass sobre horadric-cube | S2.T3 |
| Tokens del LLM principal en task delegada vs inline | reduccion ≥30% | S4.T3 mediciones |
| Activaciones DET-15 en proximos 3-5 tickets | 0 en tickets >1000 lineas | S4.T5 tracking |
| Backwards compat | steps no migrados ejecutan inline sin regresion | TC-10 |

## Technical reference

### Sintaxis canonica propuesta (S1.T1 final decision)

```markdown
> **AGENT INVOCATION (HOR-025)**: subagent_type=researcher, tier=fast, prompt="<task description con contexto suficiente>"
```

- Blockquote markdown visible al dev
- `subagent_type` mapeable a Agent tool de Claude Code
- `tier` redundante pero util (fallback si subagent_type no esta registrado)
- `prompt` quoteado con todo el contexto

### Resolution order de tiers

```
1. projects/{project}/config.yaml > tiers > {tier}  (si existe)
2. prompts/agent-tiers.md > active > {tier}          (global default)
3. host LLM default                                  (fallback final)
```

### Tester output schema (S2.T1 final)

```json
{
  "suite": "vitest",
  "command_run": "npm run test",
  "passed": 201,
  "failed": 0,
  "failures": [],
  "coverage_delta": null,
  "duration_ms": 1014,
  "recommendation": "all_pass"
}
```

## Rules discovered

_Pendiente — se llena durante execute si emergen patrones generalizables._

**Candidato**: `RULE-workflow-kb-first-audit-001` — antes de proponer cambios al sistema DKC, hacer audit del KB existente (agents, tiers, schemas) para evitar reinvencion. Pattern observado en HOR-022 F2 audit + HOR-025 mi propuesta inicial.

## Bugs found

_Pendiente — se llena durante execute._

## Acceptance checkpoints

Al close del ticket (S5), verificar:

- [ ] REQ-IMPROVE-01..04 todos cubiertos por TCs con `Status: pass`
- [ ] REQ-IMPROVE-05/06 (exploratorios) con decision documentada (confirmed o refuted con datos)
- [ ] REQ-PRESERVE-01/02 validados sin regresion
- [ ] Quality review DET-23 ejecutado en cada gate de session
- [ ] Test cases registrados inline con Actual + Evidence + Session + Cambios gatillados (DET-25)
- [ ] Findings del audit pre-execute (KB-first violado) incorporados o derivados a rule candidata
- [ ] Backlog evaluado (DET-17)
- [ ] Frontmatter actualizado: status: closed, closed: 2026-05-XX, teachings.close: done | skipped
- [ ] Tabla `## Commits` poblada con hashes del ticket

## Archiving

Esta spec se archiva via `/dkc-archive-spec` solo si:

- HOR-025 cierra exitosamente con acceptance checkpoints verdes
- Patron enforced de delegation queda como flujo estandar (no se revierte)
- Tester agent integrado en agents/ y ciclo execute

Mientras tanto, vive como referencia para tickets futuros que extiendan multi-LLM operacional (HOR-029+ si emerge).
