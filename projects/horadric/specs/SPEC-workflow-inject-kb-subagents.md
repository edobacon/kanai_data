---
id: SPEC-workflow-inject-kb-subagents
project: horadric
ticket: HOR-113
status: done
---

# DET-34 — Inyeccion de KB resuelto al delegar (super sub-agent)

# DET-34 — Inyeccion de KB resuelto al delegar (super sub-agent)

## Executive summary — lo que estas aprobando

**Que se quiere**: hoy, cuando DKC delega a un sub-agente (researcher/developer/reviewer/tester), la resolucion del KB del modulo (rules/bugs/specs) es **best-effort del orquestador** o queda **delegada al child via prompt** ("anda y resolve `ticket.rules[]`"). Eso depende de que el LLM se acuerde de traer el contexto y de que el child re-busque bien — con riesgo de KB parcial o ignorado (debilita DET-11 KB-first). gentle-ai (Patron C, DEC-003) resuelve esto con el patron **super sub-agent**: *"The parent resolves the skill registry once, passes the relevant SKILL.md paths into each sub-agent prompt... Sub-agents read exact skill files instead of receiving generated summaries"*. DET-34 codifica este contrato en DKC: el parent resuelve el KB del ticket **una vez por session** (a paths exactos) e **inyecta esos paths** en el prompt de cada sub-agente, en vez de instruirlo a re-buscar o pasarle un resumen generado.

**Decisiones criticas que necesitan tu OK** (resueltas en super autopilot — racional abajo):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | DET nueva (DET-34) que REFUERZA DET-11/DET-9, no un bullet en DET-11 | DET-11 (KB-first) es declarativa; DET-34 materializa el COMO (resolver-once + inyectar paths) con bite verificable (resolver + validator + a-hook + entry T2) y observabilidad de primera clase en HC. Mismo patron que DET-31/32/33 |
| 2 | Capa 3 = comando `dkc-resolve-kb` (resolver real), no resolucion behavioral | El request pide "resolver el registry UNA VEZ por session" — un manifest estable, cross-host, observable y reusable. Behavioral pierde esas 4 propiedades. Cascada DET-32 → **build** (racional en DEC-LOCAL-02) |
| 3 | Manifest = **paths exactos** (no contenido inlineado) | Fiel a gentle-ai ("read exact files, not summaries"); el child hace `Read` de los paths. Evita inflar el prompt con el contenido completo del KB y mantiene una sola fuente (el archivo) |
| 4 | Capa 4 = step nuevo `kb-injection` (no sobrecargar `agent-invocation`) | `agent-invocation` registra SI se delego (mcp/inline); `kb-injection` registra si el KB resuelto se INYECTO. Son ortogonales. Mismo criterio que DET-33 que agrego `self-report-verification` en vez de reusar uno |
| 5 | WARN-first, proporcional por tier, en cualquier modo | El sesgo "el child ya buscara el KB" existe siempre. Adopcion sin friccion (patron DET-31/32/33); el veredicto registrado fuerza la consideracion explicita sin bloquear de entrada |

**Riesgos principales y como los mitigamos**:

- **Over-build del resolver (DET-32)** → la cascada necessity-assessment se corre y registra: no existe hoy un resolver ticket→KB-paths (no reuse), behavioral pierde once/cross-host/observable (no reduce) → veredicto **build** justificado.
- **Duplicar DET-11 (KB-first)** → DET-11 dice "consultar KB antes de proponer"; DET-34 dice "al DELEGAR, el parent resuelve e inyecta los paths del KB en el prompt del child". DET-11 es el principio; DET-34 es el mecanismo de delegacion.
- **Enum cerrado rechaza el step nuevo** (leccion DET-32 L4 / HOR-112) → REQ-IMPROVE-03 agrega `kb-injection` al enum con self-test.
- **Prompt bloat** → manifest de paths, no contenido. El child Read selectivo.

**Que NO se hace en este ticket**:

- No se enriquece `dkc_invoke_agent` para que inyecte el KB (se mantiene su responsabilidad unica = dispatch). El resolver es un comando separado; la inyeccion la hace el orquestador citando el manifest. (Backlog `could`: surface del manifest desde `dkc_invoke_agent`.)
- No se inyecta el CONTENIDO del KB en el prompt — solo paths exactos.
- No se endurece a bloqueante (queda WARN-first; graduacion a T3 documentada).
- No se aplica retroactivo a tickets/specs cerrados.
- No incluye el dual-judge (HOR-114) ni los trigger-rules (HOR-115) — tickets hermanos del plan DEC-003.

**Tamano estimado**: 1 session (~2.5-3h efectivas), T2. S1.T2 (resolver + tests) es la unica pieza de codigo net-new; el resto es mecanico (catalogo, schema, wiring de prompts, regen).

**Como vas a saber que funciona**:

- `python -c "...assert 34 in DETS_CONDENSED"` + `pytest server/tests/test_dets_catalog.py` verde (34 contiguas).
- `./commands/dkc-resolve-kb --ticket HOR-113` emite JSON con paths exactos (rules DET+RULE, bugs abiertos del modulo, specs relacionados); exit 0. Dogfood sobre el propio ticket.
- `tsx schemas/decisions.ts` verde incluyendo `kb-injection`; `dkc-record-decision --step kb-injection --choice injected` exit 0.
- `dkc-export-rules --global --dry-run` emite 34 bullets `- **DET-`.
- `grep "DET-34"` matchea en deterministic-rules.md (capa 1) + steps que delegan (capa 2) + `kb_refs` en la sintaxis canonica del fence.

---

## Purpose

Codificar DET-34 (Inyeccion de KB resuelto al delegar) como contrato de las fases con delegacion (**design/execute/review**): cuando el orquestador delega a un sub-agente, resuelve el KB del ticket UNA VEZ por session a **paths exactos** (rules de `ticket.rules[]` + bugs abiertos del modulo + specs relacionados) e inyecta esos paths en el prompt del child via el campo `kb_refs` del fence `dkc:agent-invocation`, en vez de instruir al child a re-buscar o pasarle un resumen generado. Refuerza DET-11 (KB-first) y DET-9 (handoffs estructurados) y se materializa en las 5 capas del patron de enforcement (RULE-workflow-enforcement-pattern-009), reusando la infra de `decisions_log`.

## Requirements

### REQ-IMPROVE-01: DET-34 declarada en capa 1 (catalogo condensado + texto integro)

> **Que cambia**: aparece DET-34 — `dkc_get_rules` y el bloque global de CLAUDE.md la listan, y su detalle integro vive en `deterministic-rules.md`.
> **Por que**: la fuente unica `DETS_CONDENSED` (HOR-088) y el texto integro son las dos caras del contrato; ambas deben existir o la DET es invisible/incoherente.

El sistema MUST registrar DET-34 con `name: "Inyeccion de KB resuelto al delegar"`, `phases: ["design", "execute", "review"]` y `rule` condensado (<600 chars) en `DETS_CONDENSED`, y una seccion integra `### DET-34` en `deterministic-rules.md` (Que / Por que / Que se resuelve e inyecta / Donde aplica / Fuerza / Interaccion con DETs / Capas de enforcement / Aplicacion temporal). Bump del docstring/contadores "33"→"34".

**Actor**: system · **Layers**: config (python catalog), docs (prompts)

#### Acceptance
**Verificable**: `python -c "from server.src.deckard_cain.dets_catalog import DETS_CONDENSED; assert 34 in DETS_CONDENSED and DETS_CONDENSED[34]['name']"`; `grep "### DET-34" prompts/deterministic-rules.md` matchea; `pytest server/tests/test_dets_catalog.py` verde (deriva el conteo, 34 contiguas).

### REQ-IMPROVE-02: Capa 3 (comando) — resolver `dkc-resolve-kb` que emite el manifest de paths

> **Que cambia**: nace `commands/dkc-resolve-kb --ticket <id>` que devuelve, en JSON, los paths exactos del KB del ticket: rules (`DET-{N}` → `deterministic-rules.md`, `RULE-{module}-{seq}` → archivo), bugs abiertos del modulo, specs relacionados.
> **Por que**: es el "skill registry resuelto una vez" del patron — un manifest estable, cross-host y observable que el orquestador inyecta. Sin el, la inyeccion vuelve a depender de que el LLM recuerde y re-busque.

El sistema MUST proveer `commands/dkc-resolve-kb --ticket <path-o-id> [--project <p>] [--module <m>]` que: (a) lee `ticket.frontmatter.rules[]` y resuelve cada ID canonico a su path (DET → `prompts/deterministic-rules.md` con ancla `#det-{n}`; RULE → `projects/{project}/rules/{module}/{id}.md`); (b) lista bugs abiertos del modulo (`projects/{project}/bugs/{module}/*.md` con `status` abierto); (c) resuelve el **spec propio del ticket** (`ticket.frontmatter.spec` → `projects/{project}/specs/{spec}.md`) — alto-senal; NO lista los specs del modulo entero (serian 50+, ruido que derrota el manifest, HOR-113 L1); (d) emite JSON `{ticket, project, module, rules:[{id,path,exists,anchor?}], bugs:[{id,path,status}], specs:[{id,path,status}], missing:[]}`; exit 0 en exito, no crashea ante ticket sin rules o modulo sin bugs (arrays vacios). Reusa `commands/lib` (parsers) — no re-implementa parsing de frontmatter.

**Actor**: system · **Layers**: code (command + lib)

#### Acceptance
**Verificable**: `./commands/dkc-resolve-kb --ticket HOR-113` exit 0 con JSON conteniendo los 6 RULE/DET de `HOR-113.rules` resueltos a paths (`exists: true` para los que existen) y arrays para bugs/specs; invocacion sobre un ticket sin `rules` retorna arrays vacios sin error (exit 0).

### REQ-IMPROVE-03: Capa 4 (validator) — step `kb-injection` en el schema de decisiones

> **Que cambia**: `dkc-record-decision --step kb-injection` deja de ser rechazado por el enum cerrado y valida su choice.
> **Por que**: sin la capa 4, la DET queda advisory-only y el LLM puede cumplirla lexicamente sin que muerda (leccion DET-32 L4: el enum es cerrado).

El sistema MUST agregar `kb-injection` a `InteractiveStepId` y una rama discriminada a `DecisionEntrySchema` en `commands/lib/schemas/decisions.ts`, con choices `injected | injection-skipped | not-applicable`, donde `injection-skipped` y `not-applicable` exigen `reason` (refinement), y self-tests que cubran: choice valido (`injected`), reason obligatoria en los 2 casos, y rechazo cross-step.

**Actor**: system · **Layers**: config (schema TS)

#### Acceptance
**Verificable**: `tsx schemas/decisions.ts` verde con los casos nuevos; `dkc-record-decision --step kb-injection --choice injected` exit 0; `--choice injection-skipped` sin reason → exit 1.

### REQ-IMPROVE-04: Capas 2 y 5 — campo `kb_refs` en la sintaxis del fence + wiring en steps + a-hook

> **Que cambia**: el fence `dkc:agent-invocation` gana un campo `kb_refs` (paths inyectados por el parent); los steps que delegan (intake, task-loop Fase A/C, session-gate reviewer aislado) lo usan, citando el manifest del resolver.
> **Por que**: una DET declarada pero no referenciada desde los steps queda inerte (caso DET-21/22 sin capa 3 en HOR-014).

El sistema MUST: (a) extender la sintaxis canonica del fence en `prompts/agent-tiers.md` (y la nota en `prompts/_style.md`) con el campo `kb_refs:` (lista de paths exactos resueltos por el parent que el child DEBE `Read` antes de actuar); (b) wire en `prompts/steps/request-execute/task-loop.md` (Fase A researcher, Fase C reviewer), `prompts/steps/request-execute/session-gate.md` (reviewer aislado) y `prompts/steps/request-intake.md` (researcher) — el parent corre `dkc-resolve-kb` una vez por session e inyecta el manifest en `kb_refs`; (c) sumar `34` al frontmatter `dets:` de esos sub-archivos; (d) dejar el a-hook directive que registra `kb-injection` en `decisions_log`; (e) referenciar DET-34 en `prompts/agents/reviewer.md` (modo aislado recibe `kb_refs`).

**Actor**: system · **Layers**: docs (prompts) + a-hook

<details><summary>Scenarios de validacion</summary>

#### Scenario: delegacion a researcher en Fase A inyecta el KB resuelto
- **GIVEN** una task que abre Fase A (researcher) en `task-loop.md`
- **WHEN** se aplica DET-34: el parent corre `dkc-resolve-kb --ticket {id}` una vez por session e inyecta los paths en `kb_refs`
- **THEN** el fence del researcher incluye `kb_refs` con los paths exactos (no "anda y resolve ticket.rules"); se registra entry `kb-injection: injected`

#### Scenario: host sin sub-agentes nativos (fallback inline)
- **GIVEN** un host que mapea el role a inline (Codex/Cursor/Ollama)
- **WHEN** se aplica DET-34
- **THEN** el manifest del resolver igual se computa y se trae al contexto inline; entry `kb-injection: injected` (o `not-applicable` con reason si el ticket no tiene KB resoluble)

</details>

#### Acceptance
**Verificable**: `grep -n "kb_refs" prompts/agent-tiers.md` matchea; `grep -nE "DET-34|kb_refs|dkc-resolve-kb" prompts/steps/request-execute/task-loop.md prompts/steps/request-execute/session-gate.md prompts/steps/request-intake.md` matchea en cada uno; `34` presente en el `dets:` de los sub-archivos de execute; a-hook directive `kb-injection` presente.

### REQ-IMPROVE-05: Bloque global regenerado desde la fuente unica

> **Que cambia**: el bloque DKC de `~/.claude/CLAUDE.md` pasa a listar 34 reglas con DET-34 incluida.
> **Por que**: el bloque se genera desde `DETS_CONDENSED`; sin regenerar, DET-34 existe en el catalogo pero no se ve en el contexto global.

El sistema MUST regenerar el bloque global via `dkc-export-rules --global` (no editar a mano — DET-16), emitiendo 34 bullets condensados.

**Actor**: system · **Layers**: config

#### Acceptance
**Verificable**: `dkc-export-rules --global --dry-run` produce bloque con `count("- **DET-") == 34` y `< 20000` chars.

### REQ-PRESERVE-01: Sin regresion en el schema de decisiones, el catalogo ni los validators DKC

> **Que cambia**: nada — los steps previos de `decisions_log`, las 33 DETs previas y los validators existentes siguen funcionando igual.
> **Por que**: el cambio extiende enums cerrados, agrega un comando y edita prompts; no debe romper steps/gates existentes (DET-7 regression).

El sistema MUST mantener verdes: los self-tests previos de `decisions.ts`, `pytest server/tests/test_dets_catalog.py`, y los validators `dkc-validate` / `dkc-verify-gate` usados en el gate de cierre de este mismo ticket. El resolver nuevo no altera el comportamiento de comandos existentes.

**Actor**: system · **Layers**: config + code

#### Acceptance
**Verificable**: `tsx schemas/decisions.ts` reporta previos + nuevos, todos pass; `pytest server/tests/test_dets_catalog.py` verde; gate de cierre de HOR-113 pasa G1/G4.

## Tasks

### Session 1 — DET-34 en 5 capas + resolver dkc-resolve-kb + wiring de inyeccion + regen global [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Capa 1: entry `34` a `DETS_CONDENSED` (name "Inyeccion de KB resuelto al delegar", phases ["design","execute","review"], rule <600 chars) + docstring/contadores "33"→"34"; seccion integra `### DET-34` en deterministic-rules.md | REQ-IMPROVE-01 | developer | — | server/src/deckard_cain/dets_catalog.py, prompts/deterministic-rules.md | `python -c "...assert 34 in DETS_CONDENSED"` + `grep "### DET-34"` + `pytest test_dets_catalog.py` | git revert | DET-1, DET-2, DET-16, DET-24 | done | 1 |
| S1.T2 | Capa 3: comando `dkc-resolve-kb` que resuelve ticket.rules[] + bugs abiertos + spec del ticket a paths exactos (JSON), reusando commands/lib; manejo de vacios | REQ-IMPROVE-02 | developer | — | commands/dkc-resolve-kb, commands/lib/ (helper si aplica) | `./commands/dkc-resolve-kb --ticket HOR-113` exit 0 con paths; ticket sin rules → arrays vacios | git rm + revert | DET-2, DET-9, DET-11 | done | 1 |
| S1.T3 | Capa 4: `kb-injection` en `InteractiveStepId` + rama en `DecisionEntrySchema` (injected/injection-skipped/not-applicable) + reason refinement + self-tests (3-4 casos) | REQ-IMPROVE-03 | developer | S1.T1 | commands/lib/schemas/decisions.ts | `tsx schemas/decisions.ts` verde | git revert | DET-2, DET-7 | done | 1 |
| S1.T4 | Capas 2+5: campo `kb_refs` en sintaxis del fence (agent-tiers.md + _style.md) + wiring en task-loop.md (Fase A/C), session-gate.md (reviewer aislado), request-intake.md (researcher) + `34` en `dets:` + a-hook `kb-injection` + ref en reviewer.md | REQ-IMPROVE-04 | developer | S1.T1, S1.T2, S1.T3 | prompts/agent-tiers.md, prompts/_style.md, prompts/steps/request-execute/task-loop.md, prompts/steps/request-execute/session-gate.md, prompts/steps/request-intake.md, prompts/agents/reviewer.md | grep kb_refs/DET-34/dkc-resolve-kb en los archivos + `34` en dets + a-hook | git revert | DET-9, DET-11, DET-16 | done | 1 |
| S1.T5 | Capa global: regenerar `dkc-export-rules --global` (verificar 34 bullets) + verificar capa 5b (`dkc-record-decision --step kb-injection`) | REQ-IMPROVE-05 | developer | S1.T1, S1.T3 | (CLAUDE.md global) | `dkc-export-rules --global --dry-run` (34 bullets) + comando de prueba exit 0 | re-run export desde catalogo previo | DET-16 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier T2)** — reviewer aislado (DET-30·REQ-10) + quality review DET-23 + verificacion self-report del gate (DET-33) + commits DET-27 + decidir | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | ticket | gate persistido + self-tests verdes + resolver dogfood OK + export 34 + git status submodulo limpio post-review | (no aplica) | DET-20, DET-23, DET-33, DET-34 | done | 1 |

### Task contract (resumen)

```
S1.T1: capa 1 regla+catalogo — files: dets_catalog.py, deterministic-rules.md — validation: import assert + grep + pytest — rollback: git revert — rules: [DET-1, DET-2, DET-16, DET-24]
S1.T2: capa 3 resolver — files: commands/dkc-resolve-kb (+ lib) — validation: dogfood HOR-113 + vacios — rollback: git rm + revert — rules: [DET-2, DET-9, DET-11]
S1.T3: capa 4 validator — files: decisions.ts — validation: tsx self-test — rollback: git revert — rules: [DET-2, DET-7]
S1.T4: capas 2+5 convencion+wiring+a-hook — files: agent-tiers.md, _style.md, task-loop.md, session-gate.md, request-intake.md, reviewer.md — validation: grep kb_refs/DET-34 + dets — rollback: git revert — rules: [DET-9, DET-11, DET-16]
S1.T5: capa global regen — files: CLAUDE.md global — validation: export 34 bullets + comando de prueba — rollback: re-run export — rules: [DET-16]
```

## Constraints

- RULE-workflow-enforcement-pattern-009 (**must**): toda DET ≥30 se materializa en las 5 capas. DET-34: capa 3 = `dkc-resolve-kb` (read-only pero produce el manifest — presente, no N/A), capas 1/2/4/5/5b presentes.
- HOR-088 (fuente unica): NO duplicar el condensado fuera de `DETS_CONDENSED`.
- DET-16 (no editar a mano el bloque global): regenerar con `dkc-export-rules --global`.
- DET-32 (necesidad/reuso): el resolver pasa la cascada con veredicto `build` registrado via `dkc-record-decision --step necessity-assessment`.
- Manifest = paths exactos, no contenido (evita prompt bloat; una sola fuente = el archivo).

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Over-build del resolver (podia ser behavioral) | medium | deuda/complejidad | Cascada DET-32 registrada: no reuse existente, behavioral pierde once/cross-host/observable → build justificado (DEC-LOCAL-02) |
| DET-34 percibida como duplicado de DET-11 | medium | confusion normativa | El texto integro define la frontera: DET-11 = consultar KB antes de proponer (principio); DET-34 = al delegar, el parent resuelve e inyecta paths del KB en el prompt del child (mecanismo) |
| Enum cerrado rechaza el step nuevo | low (conocido) | comando falla silencioso | REQ-IMPROVE-03 lo agrega con self-test (leccion DET-32 L4) |
| Prompt bloat al inyectar KB | low | ruido en el prompt del child | Manifest de paths, no contenido; el child Read selectivo |

## Open questions

- [ ] Ninguna — alcance cerrado en el plan; super autopilot resuelve las decisiones con racional documentado.

## Decisions

### DEC-LOCAL-01: DET nueva (DET-34) que refuerza, en vez de extender DET-11 con un bullet
- **Contexto**: el request ofrecia reforzar DET-11 (KB-first) o anadir un DET nuevo
- **Drivers**: DET-11 es declarativa (principio); el contrato del COMO (resolver-once + inyectar paths) amerita bite verificable (resolver + validator + a-hook + entry observable) y observabilidad de primera clase en HC
- **Cascada DET-32 (necessity-assessment)**: build — el contrato de inyeccion no existe hoy (no es duplicado de DET-11/9), no lo da plataforma, no se reduce a config; gana observabilidad como DET propia
- **Opcion elegida**: DET-34 que refuerza DET-11/DET-9 (mismo patron que DET-31/32/33)
- **Alternativas**: bullet en DET-11 (descartada — quedaria advisory-only sin capas de enforcement)
- **Consecuencias**: +1 DET en el catalogo (34); coherente con el patron establecido
- **Session**: design (S0)

### DEC-LOCAL-02: Capa 3 = comando `dkc-resolve-kb` (build), no resolucion behavioral
- **Contexto**: la inyeccion de KB podia dejarse behavioral (el parent lee frontmatter + globea bugs y arma el manifest a mano)
- **Cascada DET-32 (necessity-assessment)**:
  - ¿Necesita existir? Si — el request pide "resolver el registry UNA VEZ por session" (manifest estable)
  - ¿Ya existe? No — `dkc_get_rules` solo da DETs condensadas; `dkc_find_context` da resultados de busqueda, no un manifest de paths para `ticket.rules[]`; `dkc_invoke_agent` solo resuelve dispatch
  - ¿Lo da framework/nativo? No
  - ¿Se reduce a config? No — behavioral pierde 4 propiedades: once-per-session, cross-host (hosts sin buena "memoria"), observable (manifest loggeable), reusable
  - **Veredicto**: build
- **Opcion elegida**: comando `dkc-resolve-kb` que compone el index existente (commands/lib), read-only, emite JSON de paths
- **Alternativas**: (a) behavioral puro (descartada — pierde once/cross-host/observable); (b) enriquecer `dkc_invoke_agent` (descartada — rompe su responsabilidad unica = dispatch; queda como backlog `could`)
- **Consecuencias**: +1 comando read-only; capa 3 del patron presente (no N/A, a diferencia de DET-33)
- **Session**: design (S0)

### DEC-LOCAL-03: Manifest = paths exactos, no contenido inlineado
- **Contexto**: el manifest podia inyectar el contenido del KB o solo los paths
- **Drivers**: fidelidad al patron gentle-ai ("read exact files, not generated summaries"); evitar prompt bloat; una sola fuente de verdad (el archivo)
- **Opcion elegida**: paths exactos; el child hace `Read` selectivo
- **Alternativas**: contenido inlineado (descartada — infla el prompt, duplica la fuente, se desactualiza)
- **Session**: design (S0)

### DEC-LOCAL-04: Capa 4 = step nuevo `kb-injection` (no sobrecargar `agent-invocation`)
- **Contexto**: ya existe el step `agent-invocation` (invoked-mcp/fallback-inline/inline-bypass)
- **Drivers**: ortogonalidad — `agent-invocation` registra SI se delego; `kb-injection` registra si el KB resuelto se INYECTO. Mezclarlos pierde la senal
- **Opcion elegida**: step `kb-injection` (injected/injection-skipped/not-applicable), mismo criterio que DET-33 (`self-report-verification`)
- **Session**: design (S0)

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-IMPROVE-01..05 pasan
- [x] **Tests**: `tsx schemas/decisions.ts` verde (previos + nuevos); `pytest server/tests/test_dets_catalog.py` verde (34 DETs); `dkc-resolve-kb` dogfood sobre HOR-113 OK
- [x] **Rules**: RULE-workflow-enforcement-pattern-009 satisfecha (capas 1/2/3/4/5/5b — capa 3 presente como resolver)
- [x] **Integration**: `dkc-export-rules --global` emite 34 bullets; resto de la suite sin regresion
- [x] **Docs**: deterministic-rules.md, task-loop.md, session-gate.md, request-intake.md, agent-tiers.md coherentes; DET-34 sin duplicar DET-11/DET-9
