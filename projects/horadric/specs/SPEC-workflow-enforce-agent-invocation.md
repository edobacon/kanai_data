---
id: SPEC-workflow-enforce-agent-invocation
project: horadric
ticket: HOR-060
status: done
---

# Enforce uso de sub-agentes via convencion T2 (extension de HOR-058 al fence `dkc:agent-invocation`)

# Enforce uso de sub-agentes via convencion T2 (extension de HOR-058 al fence `dkc:agent-invocation`)

## Executive summary — lo que estas aprobando

**Que se quiere**: cerrar el ultimo gap del patron sistemico que HOR-058 ataco. Hoy DKC tiene infraestructura completa para delegar a sub-agentes (fence `dkc:agent-invocation`, MCP tool `dkc_invoke_agent`, tier mapping multi-host, 6 roles canonicos), pero **NADA enforza que se use**. El LLM principal puede ejecutar todo inline (research + edit + reasoning) en su propio tier (Opus tipicamente) sin que ningun validator detecte. Resultado: costo ~10x por sub-task (Opus vs Haiku), context window contaminado, drift cross-host. El fix extiende la convencion T2 con quinto step interactivo `agent-invocation` + entries observables en `decisions_log` + validator que exige cobertura.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Cobertura por workflow_state, no por fence individual** (AQ1 — MVP simple): el validator exige minimo 1 entry `agent-invocation` por step interactivo presente en workflow_state. Granularidad por fence queda como follow-up | Enfoque (a) "parsear prompts en runtime" es fragil; enfoque (b) "manifest declarativo" requiere mantener counts sincronizados. (c) cobertura simple = MVP funcional, granularidad fina marginal |
| 2 | **Reason obligatoria para `fallback-inline` e `inline-bypass`, opcional para `invoked-mcp`** (AQ2): simetria con skip-* del schema HOR-058 (superRefine ya prueba este patron) | Sin reason en bypass, no podemos auditar por que el LLM no delego. Reason en invocacion real es ruido (es la accion default deseada) |
| 3 | **Patron multi-provider documentado en `prompts/agent-tiers.md` extension** (AQ4): ese archivo ya maneja mapping multi-host, anchor natural | Alternativas (`_style.md` o nuevo DET) fragmentarian la doctrina. agent-tiers ya es el referente cross-host |
| 4 | **El rol `tester` NO entra como step interactivo en MVP** (AQ3): los test cases manuales los hace dev humano o LLM principal; no hay fence canonico hoy. Si emerge necesidad, agregar fence + entry en ticket futuro | Mantener scope acotado. 6 roles → 4 con fence activo (researcher, architect, scribe, reviewer) → suficiente para el patron |
| 5 | **Backwards compat estricta**: tickets pre-2026-05-17 sin entries `agent-invocation` no se invalidan (mismo criterio que HOR-058 base) | Sin esto, 50+ tickets cerrados se romperian post-fix |

**Riesgos principales y como los mitigamos**:

- **Falso positivo en cobertura simple** (LLM resuelve 3 fences en 1 step pero solo registra 1 entry → validator pasa) → mitigacion: B-future granularidad por fence si emerge necesidad real, medible post-cierre via dogfooding
- **Hosts sin sub-agentes nativos rechazados como invalidos** → mitigacion: `fallback-inline` con reason citando host es valido — el validator no acopla a Anthropic
- **Costo del enforcement supera el ahorro** (registrar entry consume tokens) → mitigacion: entry tipica ~50 tokens, sub-task delegado ahorra 5-20K tokens del principal → ROI 100x+

**Que NO se hace en este ticket**:
- Telemetria del beneficio (costo/context measurement) — requiere infra runtime, B-future
- Forzar delegacion para steps lineales muy cortos — `inline-bypass` con reason valido es escape legitimo
- Implementar nuevos sub-agentes — los 6 existentes son suficientes
- Cambiar el MCP tool `dkc_invoke_agent` — solo agregar enforcement alrededor

**Tamano estimado**: 5 sessions ejecutables (S1-S5), aproximadamente **6-8h** efectivas. Mas riesgosa: **S4** (instrumentacion de 4 prompts con instruccion de registro) — requiere editar prompts core de DKC sin romper flujo existente.

**Como vas a saber que funciona**:
- Creo un ticket dummy, ejecuto intake-explore + design-{tipo} + execute. Cada fence `dkc:agent-invocation` resuelto deja entry observable en `decisions_log`.
- `dkc-validate StepDecisions` retorna FAIL si el ticket cierra con step interactivo presente en workflow_state pero sin entry `agent-invocation` correspondiente.
- HOR-060 propio cierra con minimo 4 entries `agent-invocation` (una por cada step del workflow que tuvo fence).
- Tickets legacy (HOR-016, etc) siguen validando sin cambios.

---

## Purpose

Cerrar el ultimo gap del patron T2 — el fence `dkc:agent-invocation` queda enforzado como los gates DKC anteriores (DET-27 commits, DET-25 test cases, DET-21-0b skip teach, DET-22 skip teach-close). Cada delegacion (o decision explicita de no delegar) deja evidencia observable. Resultado: contexto preservation, cost saving y determinismo cross-host enforzados, no recomendados.

## Requirements

### REQ-IMPROVE-01: Schema extension — InteractiveStepId + DecisionChoice

> **Que cambia**: el schema `decisions.ts` reconoce un quinto step interactivo `agent-invocation` con 3 choices posibles (`invoked-mcp`, `fallback-inline`, `inline-bypass`).
> **Por que**: sin este step en el enum, no se pueden registrar entries del patron — el helper `dkc-record-decision` rechazaria con error.

El sistema MUST extender `InteractiveStepId` enum en `commands/lib/schemas/decisions.ts` con el valor `'agent-invocation'`.

El sistema MUST agregar un nuevo case al `DecisionChoice` discriminated union con shape:

```typescript
z.object({
  step: z.literal('agent-invocation'),
  choice: z.enum(['invoked-mcp', 'fallback-inline', 'inline-bypass']),
})
```

El sistema MUST extender el superRefine del `DecisionEntrySchema` para exigir `reason` cuando `choice ∈ {'fallback-inline', 'inline-bypass'}`. `invoked-mcp` tiene reason opcional.

**Actor**: system (schema)
**Layers**: meta (schemas, validators)

<details><summary>Scenarios de validacion</summary>

#### Scenario: invoked-mcp sin reason valida
- **GIVEN** entry `{step: 'agent-invocation', choice: 'invoked-mcp', actor: 'llm-autopilot', timestamp: ISO}`
- **WHEN** safeParse contra DecisionEntrySchema
- **THEN** success — reason opcional

#### Scenario: fallback-inline sin reason rechazada
- **GIVEN** entry `{step: 'agent-invocation', choice: 'fallback-inline'}` sin reason
- **WHEN** safeParse
- **THEN** error con path=reason: "reason es obligatoria cuando choice='fallback-inline'"

#### Scenario: inline-bypass sin reason rechazada
- **GIVEN** entry `{step: 'agent-invocation', choice: 'inline-bypass'}` sin reason
- **WHEN** safeParse
- **THEN** error path=reason

#### Scenario: choice cross-step rechazado
- **GIVEN** entry `{step: 'agent-invocation', choice: 'continue'}` (choice de gate-decision)
- **WHEN** safeParse
- **THEN** error — choice no esta en enum

</details>

#### Acceptance
**El dev verifica**: `npm run test:schemas` retorna 10/10 → 13/13 (3 tests nuevos para agent-invocation).

---

### REQ-IMPROVE-02: Validator StepDecisions — cobertura fence-aware (MVP simple)

> **Que cambia**: `dkc-validate StepDecisions` exige minimo 1 entry `agent-invocation` por cada step interactivo del workflow_state que tiene fence canonico.
> **Por que**: sin esta verificacion, el LLM principal puede saltarse la delegacion y el ticket cierra normal. El gate de cierre acepta resultado superficial sin evidencia observable.

El sistema MUST extender `validateStepDecisions` en `commands/lib/validate.ts` con cobertura adicional:

- Mantener checks existentes (legacy skip, quick/explore skip, shape validation, cobertura teachings + draft-approval)
- Agregar check: si `workflow_state` contiene step ∈ `{intake-explore, request-intake, request-execute, design-feature, design-fix, design-improvement, design-refactor}` Y el ticket no es legacy, exigir minimo 1 entry `step: 'agent-invocation'` con session asociada al step (o sin session si pre-execute). Warning si falta; **error** (bloqueante) si `--strict`.

El sistema MUST mantener la lista de "steps interactivos con fence" como **constante en el validator** (no parsear prompts en runtime — fragil). Default lista incluye los 4 steps con fence verificados en HOR-060 S1: `intake-explore`, `request-intake`, `request-execute`, `design-feature|fix|improvement|refactor` (todos heredan `_design-shared.md`).

**Actor**: system
**Layers**: meta (validator)

<details><summary>Scenarios de validacion</summary>

#### Scenario: ticket post-T2 sin entry agent-invocation despite workflow_state lo tiene
- **GIVEN** ticket dummy con `workflow_state.intake-explore.status: done` Y `decisions_log` sin entry agent-invocation
- **WHEN** `dkc-validate StepDecisions {ticket}.md`
- **THEN** retorno con warning "Missing decision for step 'agent-invocation' despite step 'intake-explore' completed"

#### Scenario: ticket con entry cubre cobertura
- **GIVEN** mismo ticket con entry `{step: 'agent-invocation', choice: 'fallback-inline', reason: 'host Codex no soporta dkc_invoke_agent'}`
- **WHEN** validator
- **THEN** valid:true sin warnings de cobertura agent-invocation

#### Scenario: ticket legacy skip
- **GIVEN** HOR-016 (created 2026-05-09)
- **WHEN** validator
- **THEN** skip por fecha legacy — sin verificar cobertura

</details>

#### Acceptance
**El dev verifica**: ticket dummy en S5 dogfooding genera warnings esperados antes de los entries y pass post-entries.

---

### REQ-IMPROVE-03: Instrumentacion prompts — registrar entry post-fence

> **Que cambia**: cada step DKC que tiene fence `dkc:agent-invocation` agrega bloque de instruccion al LLM principal: "post-fence resolution, invocar `dkc-record-decision` con choice = invoked-mcp | fallback-inline | inline-bypass".
> **Por que**: sin la instruccion en el prompt, el LLM no sabe que debe registrar. Convencion T2 explicita.

El sistema MUST extender cada uno de los 4 prompts con fence (`intake-explore.md`, `request-intake.md`, `request-execute.md`, `_design-shared.md`) con bloque markdown explicito post-fence:

```markdown
> **HOR-060 — registrar entry agent-invocation**: post-fence (despues de resolver via `dkc_invoke_agent` MCP tool o fallback inline), ejecutar:
>
> ```bash
> ./commands/dkc-record-decision \
>   --ticket {TICKET-id} \
>   --step agent-invocation \
>   --choice <invoked-mcp|fallback-inline|inline-bypass> \
>   --session S{N}.T{M} (si aplica) \
>   --reason "<host + decision rationale>" \
>   --actor llm-autopilot
> ```
>
> Choice values:
> - `invoked-mcp`: delegacion real via `dkc_invoke_agent` (Anthropic Claude Code o equivalente)
> - `fallback-inline`: host no soporta sub-agentes nativos (ChatGPT Codex, Cursor, Ollama, etc) — LLM principal ejecuto inline manteniendo limites del rol
> - `inline-bypass`: LLM principal decidio inline aun pudiendo delegar — requiere reason explicita
```

**Actor**: scribe (registro) + LLM principal (decision)
**Layers**: meta (prompts)

<details><summary>Scenarios de validacion</summary>

#### Scenario: prompt actualizado tiene bloque post-fence
- **GIVEN** `intake-explore.md` post-fix
- **WHEN** grep "HOR-060 — registrar entry agent-invocation"
- **THEN** retorna match post cada fence dkc:agent-invocation

</details>

---

### REQ-IMPROVE-04: Gate de salida fence-aware en steps interactivos

> **Que cambia**: el gate de salida de cada step interactivo verifica que haya entry `agent-invocation` correspondiente antes de transicionar al siguiente step.
> **Por que**: sin gate runtime, el LLM puede saltarse el registro post-fence y el step cierra normal — el bug que HOR-060 ataca persistiria.

El sistema MUST agregar al checklist de gate de salida de cada step interactivo:

```markdown
[ ] Si el step ejecuto al menos 1 fence `dkc:agent-invocation`: invocar `dkc-validate StepDecisions {TICKET-id}.md` y verificar entry `step: 'agent-invocation'` correspondiente a este step. Si falta → FAIL bloqueante con mensaje del fix retroactivo.
```

Aplicar a los 4 steps: `intake-explore.md`, `request-intake.md`, `request-execute.md` (gate D + S{N}.GATE), `_design-shared.md`.

**Actor**: scribe + LLM principal
**Layers**: meta (prompts)

---

### REQ-PRESERVE-01: Backwards compat legacy

> **Que cambia**: tickets pre-2026-05-17 sin entries `agent-invocation` siguen validando sin cambios.

El sistema MUST mantener el check de `created < T2_CONVENTION_START_DATE` (HOR-058) y skipear esos tickets para todo verificacion de cobertura, incluyendo la nueva cobertura agent-invocation.

---

### REQ-PRESERVE-02: Multi-provider compatibility

> **Que cambia**: el enforcement T2 funciona con cualquier host LLM — Anthropic (via `dkc_invoke_agent`), OpenAI (Codex sin sub-agentes nativos → fallback-inline), Google (Gemini), hosts locales (Ollama, etc).
> **Por que**: DKC se proyecta a multi-provider; acoplar el enforcement a Anthropic seria limitante.

El sistema MUST mantener `DecisionEntrySchema` agnostico al provider — `actor: dev | llm-autopilot | system` sin referenciar Anthropic, OpenAI, Google.

El sistema MUST documentar en `prompts/agent-tiers.md` (extension AQ4) que el choice `fallback-inline` es valido y esperado para hosts sin soporte de sub-agentes nativos. Ejemplo concreto:

```markdown
## Multi-provider compatibility (HOR-060)

| Host LLM | Soporta sub-agentes nativos | Choice esperado al resolver fence |
|----------|----------------------------|-----------------------------------|
| Anthropic Claude Code | Si (`Agent` tool + `dkc_invoke_agent` MCP) | `invoked-mcp` |
| ChatGPT Codex | No (single-context) | `fallback-inline` con reason |
| Cursor | Parcial | `fallback-inline` (default) o `invoked-mcp` si plugin habilitado |
| Ollama / hosts locales | Depende del frontend | `fallback-inline` por default |
| Futuros providers | TBD | choice segun capability declarada en config.yaml |
```

---

### REQ-PRESERVE-03: enforcement T2 agnostico al provider (overlap con REQ-PRESERVE-02 — separado para trazabilidad de TC-10/11)

> **Que cambia**: el validator y schema explicitamente NO acoplan al provider Anthropic. Tests validan compatibility cross-provider.

El sistema MUST tener TCs explicitos (TC-10, TC-11 del ticket) que verifican:
- Schema acepta entries de cualquier actor (`llm-autopilot` agnostico al modelo subyacente)
- Validator no parsea labels Anthropic-specific
- Documentacion del spec menciona multi-provider explicitamente

---

## Improvement scope

### Antes (estado actual)

- 6 fences `dkc:agent-invocation` distribuidos en 4 prompts
- MCP tool `dkc_invoke_agent` disponible (HOR-054)
- Tier mapping (`fast/balanced/reasoning`) por host (HOR-029)
- 6 roles canonicos en `prompts/agents/*.md` (HOR-025)
- **0 validators**, **0 a-hooks**, **0 gates programaticos** verifican que se use
- El LLM principal puede ejecutar inline sin que nada falle
- `agent-tiers.md:123` declara explicitamente "sin garantia nativa del host"

### Despues (comportamiento esperado)

- Mismo infra preservado
- `InteractiveStepId` extendido con `agent-invocation`
- `DecisionChoice` cubre 3 cases (invoked-mcp, fallback-inline, inline-bypass) con reason obligatoria para los 2 ultimos
- `dkc-validate StepDecisions` exige cobertura por step interactivo del workflow_state
- 4 prompts con fence tienen bloque explicito de instruccion post-fence resolution
- Multi-provider documentado en `agent-tiers.md`
- HOR-060 propio dogfooded con entries en sus sessions execute

### Archivos afectados

| File | Change | Impact |
|------|--------|--------|
| `commands/lib/schemas/decisions.ts` | Extender InteractiveStepId enum + DecisionChoice union + superRefine para reason obligatoria en bypass/fallback | Schema retro-compat (entry sin agent-invocation sigue valida) |
| `commands/lib/validate.ts` | Extender validateStepDecisions con cobertura agent-invocation por workflow_state | Validator retro-compat (legacy skip preservado) |
| `commands/dkc-record-decision` | Sin cambios — helper ya acepta arbitrary step (validacion delegada al schema) | Sin impacto |
| `prompts/steps/intake-explore.md` | Bloque explicito post-fence registrar agent-invocation | Run-time instruction al LLM principal |
| `prompts/steps/request-intake.md` | Idem | Idem |
| `prompts/steps/request-execute.md` | Idem (3 fences) | Idem |
| `prompts/steps/_design-shared.md` | Idem | Idem |
| `prompts/agent-tiers.md` | Nueva seccion "Multi-provider compatibility (HOR-060)" con tabla | Documenta el patron cross-host explicitamente |
| `prompts/deterministic-rules.md` | DET-25 o DET-27 referencias actualizadas con agent-invocation como quinto patron T2 | Doctrina alineada |

---

## Tasks

### Session 3 — Schema extension + validator [tier: T2] [tipo: auto]

**Objetivo**: extender el schema de decisions con el nuevo step + actualizar validator. Base reusable para S4 (instrumentacion prompts).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Extender `commands/lib/schemas/decisions.ts`: agregar `agent-invocation` a InteractiveStepId enum + nuevo case en DecisionChoice discriminated union con 3 choices (invoked-mcp, fallback-inline, inline-bypass) | REQ-IMPROVE-01 | developer | — | `commands/lib/schemas/decisions.ts` | Self-test extendido pasa 13/13 (3 nuevos para agent-invocation) | git revert | DET-2, DET-7 | pending | 3 |
| S3.T2 | Extender superRefine: reason obligatoria para fallback-inline + inline-bypass; opcional para invoked-mcp | REQ-IMPROVE-01 | developer | S3.T1 | `commands/lib/schemas/decisions.ts` | Tests TC-1, TC-2, TC-3 pass | git revert | DET-7 | pending | 3 |
| S3.T3 | Extender `validateStepDecisions` en validate.ts: agregar lista constante INTERACTIVE_STEPS_WITH_FENCE + verificar entry agent-invocation por step presente en workflow_state | REQ-IMPROVE-02 | developer | S3.T2 | `commands/lib/validate.ts` | Test TC-4 pass: workflow_state con intake-explore done sin entry → warning | git revert | DET-2 | pending | 3 |
| S3.T4 | Tests unit + integration: 4 escenarios cubren happy path + 3 anti-patterns + legacy skip + quick/explore skip | REQ-IMPROVE-01, REQ-IMPROVE-02, REQ-PRESERVE-01 | developer | S3.T3 | `commands/lib/schemas/decisions.ts` (self-test) | npm run test:schemas retorna 13/13 (era 10/10) | git revert | DET-7 | pending | 3 |
| S3.GATE | Gate session: tests + dogfooding HOR-060 propio + commit DET-27 | REQ-IMPROVE-01, REQ-IMPROVE-02 | scribe | S3.T4 | HOR-060.md | Tests verdes + commit hash en `**Commit DET-27**:` + entry agent-invocation registrada via dkc-record-decision | n/a | DET-27, DET-23 | pending | 3 |

### Session 4 — Instrumentacion prompts + multi-provider docs [tier: T1] [tipo: auto]

**Objetivo**: agregar bloque de instruccion post-fence a los 4 prompts + documentar multi-provider en agent-tiers.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Editar `prompts/steps/intake-explore.md`: agregar bloque "HOR-060 — registrar entry agent-invocation" despues del fence dkc:agent-invocation existente | REQ-IMPROVE-03 | developer | S3.GATE | `prompts/steps/intake-explore.md` | Grep "HOR-060 — registrar entry" retorna 1 match post-fence | git revert | DET-11 | pending | 4 |
| S4.T2 | Idem para `request-intake.md`, `request-execute.md` (3 fences), `_design-shared.md` | REQ-IMPROVE-03 | developer | S4.T1 | 4 prompts | Grep total retorna 6 matches (1 por fence) | git revert | DET-11 | pending | 4 |
| S4.T3 | Extender gate de salida de cada step con check explicito de cobertura agent-invocation (REQ-IMPROVE-04) | REQ-IMPROVE-04 | developer | S4.T2 | 4 prompts (secciones GATEs) | Grep en cada step retorna check entry agent-invocation post-fence | git revert | DET-13 | pending | 4 |
| S4.T4 | Editar `prompts/agent-tiers.md`: nueva seccion "Multi-provider compatibility (HOR-060)" con tabla de hosts + choices esperados | REQ-PRESERVE-02, REQ-PRESERVE-03 | scribe | S4.T2 | `prompts/agent-tiers.md` | Grep "Multi-provider compatibility" retorna match + tabla con 4+ hosts ejemplo | git revert | DET-11 | pending | 4 |
| S4.T5 | Actualizar `prompts/deterministic-rules.md` DET-25 o DET-27 con referencia a agent-invocation como quinto patron T2 (crosslink) | REQ-IMPROVE-03 | scribe | S4.T2 | `prompts/deterministic-rules.md` | Crosslink agregado en seccion T2 convention | git revert | DET-11 | pending | 4 |
| S4.GATE | Gate session: tests + dogfooding + commit DET-27 | REQ-IMPROVE-03, REQ-IMPROVE-04, REQ-PRESERVE-02, REQ-PRESERVE-03 | scribe | S4.T5 | HOR-060.md | Tests pass + commit + entry agent-invocation registrada para S4 | n/a | DET-27, DET-23 | pending | 4 |

### Session 5 — Integration + regression + close [tier: T2] [tipo: ⚑ fuerte]

**Objetivo**: dogfooding final + regression suite + cierre formal del ticket.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Dogfooding integral: HOR-060 propio valida T2 extendido (4 entries agent-invocation minimo: 1 por step interactivo de S1-S5 si aplica) | REQ-IMPROVE-04 | scribe | S4.GATE | HOR-060.md | StepDecisions sobre HOR-060: valid:true + 4+ entries agent-invocation | git revert | DET-13 | pending | 5 |
| S5.T2 | Regression: npm run test:schemas deckard (13/13 pass) + dkc-validate Ticket/StepDecisions sobre HOR-058, HOR-057, HOR-056 (sin regresiones) | REQ-PRESERVE-01 | developer | S5.T1 | tests | Suite verde, delta no negativo | git revert | DET-7 | pending | 5 |
| S5.T3 | Multi-provider TC-10/TC-11: simular entries de hosts no-Anthropic, verificar schema acepta + spec final menciona multi-provider (TC-10 auto via test, TC-11 manual via spec review) | REQ-PRESERVE-02, REQ-PRESERVE-03 | developer | S5.T2 | tests, spec | TC-10/11 pass con evidencia inline; scribe valida spec doc en review humano del Quality | git revert | DET-7 | pending | 5 |
| S5.T4 | Cleanup + reindex final | — | scribe | S5.T3 | filesystem | reindex pass; sin archivos test temporales | git checkout | — | pending | 5 |
| S5.GATE | ⚑ Gate fuerte — dev valida regression + aprueba cierre formal via request-close (teach-close pregunta) | REQ-IMPROVE-01..04, REQ-PRESERVE-01..03 | scribe | S5.T4 | HOR-060.md | Acceptance checkpoints PASS + commit final + dev OK | n/a | DET-27, DET-13 | pending | 5 |

---

## Technical reference

- **commands/lib/schemas/decisions.ts** (HOR-058 S4.T1): InteractiveStepId enum, DecisionChoice discriminated union, superRefine — base directa
- **commands/lib/validate.ts validateStepDecisions** (HOR-058 S4.T3): patron de cobertura por flags conocidos — extender con workflow_state-aware
- **prompts/steps/intake-explore.md, request-intake.md, request-execute.md, _design-shared.md**: 4 archivos con fence dkc:agent-invocation (6 fences total)
- **prompts/agent-tiers.md:123**: declaracion explicita "sin garantia nativa del host" — el archivo a extender con multi-provider
- **prompts/agents/*.md**: 6 roles canonicos (architect, developer, researcher, reviewer, scribe, tester) — sin cambios, solo se aplican
- **commands/dkc-record-decision** (HOR-058 S4.T4): helper sin cambios — schema extension lo cubre

## Constraints

- **HOR-058 convencion T2** — base directa; este ticket extiende, no reemplaza
- **HOR-029 tier mapping** — el patron multi-host es preservado
- **HOR-054 MCP tool** — `dkc_invoke_agent` no cambia, solo se enforza su uso
- **HOR-025 roles canonicos** — los 6 roles intocados; solo `researcher`, `architect`, `developer`, `reviewer` tienen fence activo hoy
- **DET-13** (cierre con evidencia) — entries agent-invocation son evidencia adicional
- **DET-25** (test cases inline) y **DET-27** (commits granulares) — mismo patron T2 aplicado a otro gate

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| HOR-058 cerrado | internal | Base T2 (schema, validator, helper) | Bajo — ya cerrado |
| zod | external | Schemas runtime validation | Bajo — ya en uso |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Lista constante INTERACTIVE_STEPS_WITH_FENCE diverge de los prompts reales | medium | medium | Tests dummy en S5 dogfooding verifican lista vs fences encontrados; agregar audit script al cierre si emerge necesidad |
| Falso positivo cobertura simple (LLM resuelve 3 fences en 1 step → 1 entry alcanza) | medium | low | Backlog B-future granularidad por fence; medible empiricamente en dogfooding S5 |
| Hosts no-Anthropic confunden el patron — falsean entries fallback-inline para parecer mas delegado | low | medium | Reason obligatoria con citation del host obliga documentar honestamente; review humano via Quality review DET-23 dimension 7 (claridad) |
| Costo del enforcement supera ahorro | low | low | Entry ~50 tokens vs sub-task ahorra 5-20K tokens — ROI claro |

## Open questions

Resueltas en intake-explore — no quedan abiertas para execute.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Cobertura simple por workflow_state (no por fence individual) — AQ1
- **Contexto**: granularidad de cobertura del validator
- **Drivers**: simplicidad MVP; mantenibilidad (no parsear prompts en runtime); rendimiento decreciente de granularidad fina
- **Opcion elegida**: 1+ entry agent-invocation por step interactivo presente en workflow_state (lista constante)
- **Alternativas**: (a) runtime parse de prompts (fragil), (b) manifest declarativo de fence counts (overhead mantener sincronizado)
- **Consecuencias**: falso positivo posible si LLM resuelve N fences y registra 1 entry; aceptable como MVP, B-future granularidad si emerge
- **Session**: S2 design

### DEC-LOCAL-02: Reason obligatoria para fallback-inline + inline-bypass — AQ2
- **Contexto**: cuando exigir reason en DecisionChoice
- **Drivers**: simetria con skip-* del schema HOR-058; auditabilidad de decisiones de no-delegar
- **Opcion elegida**: superRefine exige reason para fallback-inline + inline-bypass; opcional para invoked-mcp
- **Alternativas**: reason opcional siempre (perdemos audit) / reason siempre obligatoria (ruido en happy path)
- **Consecuencias**: validator rechaza entries de bypass sin justificacion — fuerza disciplina
- **Session**: S2 design

### DEC-LOCAL-03: Multi-provider docs en agent-tiers.md — AQ4
- **Contexto**: donde documentar el patron cross-host explicitamente
- **Drivers**: anchor natural; archivo ya cubre tier mapping multi-host
- **Opcion elegida**: extender agent-tiers.md con seccion "Multi-provider compatibility (HOR-060)"
- **Alternativas**: nuevo DET-N (fragmenta doctrina) / `_style.md` (poco visibility)
- **Consecuencias**: doctrina cross-host vive en un solo lugar
- **Session**: S2 design

### DEC-LOCAL-04: Tester role NO entra en MVP — AQ3
- **Contexto**: el rol tester (HOR-025) tiene prompt pero no fence canonico activo
- **Drivers**: mantener scope acotado; 4 roles con fence activo es suficiente para validar el patron
- **Opcion elegida**: MVP cubre researcher + architect + scribe + reviewer; tester queda para ticket futuro si emerge fence
- **Alternativas**: agregar fence a tester ahora (scope creep)
- **Consecuencias**: si emerge necesidad de delegar testing a tester role, abrir ticket dedicado
- **Session**: S2 design

## Acceptance checkpoints

- [ ] **Funcional**: cada REQ-IMPROVE-01..04 + REQ-PRESERVE-01..03 con scenarios pasan
- [ ] **Tests**: npm run test:schemas retorna 13/13 (3 tests nuevos)
- [ ] **Multi-provider**: TC-10/TC-11 pass (schema agnostico + spec doc explicita)
- [ ] **Dogfooding**: HOR-060 propio cierra con 4+ entries agent-invocation en decisions_log
- [ ] **Regression**: HOR-056/057/058 siguen validando sin regression
- [ ] **Backwards compat**: HOR-016 (legacy) no se invalida
- [ ] **Quality review DET-23**: standard (T1/T2) pass

## Archiving

Si emerge granularidad por fence (B-future) o nuevos hosts/providers cambian el shape del enforcement, considerar archivar este spec con razon. Mientras tanto, mantener como fuente de verdad del patron T2 extension a sub-agentes.
