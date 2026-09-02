---
id: SPEC-workflow-directive-enforcement-a-cross-host-51
project: horadric
ticket: HOR-051
status: draft
---

# Frente A cross-host — Directive enforcement portable a multiples LLM hosts (Claude Code, Ollama, Qwen-local, MCP clients)

# Frente A cross-host — Directive enforcement portable a multiples LLM hosts (Claude Code, Ollama, Qwen-local, MCP clients)

## Executive summary — lo que estas aprobando

### Que se quiere

El Frente A del directive enforcement (HOR-050 Solucion A) nacio amarrado a Claude Code (hooks `PostToolUse` en `.claude/settings.json`). Ese approach funciona HOY pero **no escala a LLM-local end-to-end** (HOR-029 mapping host con Qwen3-local). Este spec explora **6 approaches cross-host** para el ejecutor del catalogo de directivas a-hook, evalua trade-offs, y recomienda el approach a implementar en sub-tickets derivados.

**Conclusion adelantada**: **A.6 MCP tool dedicado** (primario) **+ A.2 file watcher daemon** (secundario opcional) cubren mejor el espectro de portabilidad sin over-engineering. El catalogo machine-readable (comments HTML) es universal a todos los approaches.

### Decisiones criticas

| # | Decision | Por que |
|---|----------|---------|
| 1 | **Reclassificar HOR-051 de improvement a explore** | Approach Claude-only no escala a LLM-local. Mejor decidir arquitectura cross-host antes de implementar (HOR-050 mitigacion → requirement) |
| 2 | **A.3 wrapper CLI manual: descartado como primario** | H4 confirmada: LLM-local con context chico falla mas que Claude (97.5% inline). Manual depende totalmente de disciplina. Sobrevive como fallback complementario |
| 3 | **A.5 abstraction layer + adapters: descartado por ahora** | H6 confirmada: YAGNI, disenar simple primero. Sigue valida para post-multiple-adapters |
| 4 | **Recomendacion primaria: A.6 MCP tool dedicado** | Estandar abierto MCP, integracion natural con deckard-cain (28→29 tools), explicit en step prompts. Trade-off "LLM debe invocar tool" mitigable con (a) prompt explicit, (b) validator C (HOR-053) post-hoc, (c) file watcher (A.2) como capa 2 |
| 5 | **Capa 2 opcional: A.2 file watcher daemon** | Independencia total de disciplina del LLM (observa filesystem). Lifecycle daemon agrega complejidad → sub-ticket dedicado, opt-in |
| 6 | **Catalogo machine-readable comun (DEC-LOCAL-02 HOR-050)** | Comment HTML `<!-- enforcement: a-hook command: "..." -->` portable a 100% — solo cambia el ejecutor del catalogo |
| 7 | **Implicacion: HOR-052 probable reclassificar paralelo** | Misma razon (Solucion B AGENT INVOCATION es Claude-fence-specific). Registrar en spec, ejecutar reclassificacion al arrancar HOR-052 |
| 8 | **Implicacion: HOR-053 sin cambio** | Frente C validator ya portable por diseno (`commands/lib/validate.ts` reusable cross-host) |

### Riesgos principales y como los mitigamos

| Riesgo | Probabilidad | Impact | Mitigacion |
|--------|--------------|--------|------------|
| **MCP tool requiere que el LLM lo invoque — si olvida, perdemos enforcement** | Media | Alto | (a) prompt explicit en cada step etiquetado a-hook ("invoca `dkc_enforce_step` ahora"); (b) validator C de HOR-053 detecta drift post-hoc; (c) file watcher A.2 como capa 2 garantiza dispatch automatic |
| **File watcher daemon requiere lifecycle (start/stop/restart)** | Media | Medio | Sub-ticket dedicado de implementacion + documentacion clara de operacion. Opt-in: dev habilita si quiere automaticidad maxima |
| **Recomendacion no escala a nuevo LLM host emergente** | Baja | Medio | MCP es estandar abierto — nuevos hosts compatibles MCP funcionan sin cambio. file watcher es host-agnostic por construccion |
| **Sub-tickets futuros se desordenan sin priorizacion** | Baja | Bajo | El spec recomienda orden: 1) HOR-054 MCP tool + catalogo, 2) HOR-055 file watcher (opcional, post-validation de 054), 3) HOR-056 etiquetado masivo (puede mergearse en 054) |
| **HOR-046 D11 sigue siendo Claude-specifico (1/40+ inline ratio medido con Claude)** | Baja | Bajo | Aceptado: baseline es Claude. La logica deductiva (LLM con menos context fallara mas) es defensible. Medicion empirica en LLM-local es paso futuro post-HOR-029 implementacion |

### Que NO se hace en este explore

- **NO implementar** ningun approach — sub-tickets derivados lo hacen
- **NO refinar inventario completo** de las ~30 directivas — eso lo hace sub-ticket HOR-054 (o equivalente) al etiquetar masivo
- **NO disenar adapters concretos** mas alla de MCP tool y file watcher en alto nivel — los detalles van en sub-tickets
- **NO medir empirico con LLM-local** — depende de Ruta B HOR-029 implementada
- **NO reclassificar HOR-052 ahora** — solo registrar implicacion. La reclassificacion se decide al arrancar HOR-052

### Tamano estimado

| Session | Objetivo | Tier | Horas |
|---------|----------|------|-------|
| S1 (en este chat) | Exploracion comparativa 6 approaches + decision matrix | T0 | 45-60 min |
| S2 (en este chat) | Spec draft final + recomendacion + sub-tickets sugeridos | T0 | 30-45 min |

**Total explore**: ~1.5-2h efectivas. SP ejecutado del explore: tentativo 3 (vs 5 estimado original).

### Como vas a saber que funciona

- **Pre-spec** (baseline): 0 approaches evaluados al mismo nivel, decision arquitectural amarrada a Claude Code
- **Post-spec** (target): 6 approaches evaluados con decision matrix + recomendacion firmada + 1-3 sub-tickets derivados con scope definido
- **Verificacion**: el dev lee el Executive summary y la seccion Recomendacion, aprueba o pide iterate. Sub-tickets sugeridos pasan a `open` cuando el dev autoriza
- **Acceptance final post-implementacion** (medible en sub-tickets, no aqui): cobertura 100% del catalogo a-hook + zero acoplamiento Claude-Code-specifico + medicion empirica skip rate `<5%` en 2 tickets nuevos

## Purpose

Definir la **arquitectura cross-host** para el ejecutor del catalogo de directivas a-hook DKC. El catalogo machine-readable (comments HTML) es universal; el ejecutor varia segun host. Producir recomendacion firmada + sub-tickets derivados que implementen los approaches elegidos. Habilitar LLM-local end-to-end sin amarrar al harness Claude Code.

## Context — de donde viene este spec

- **Origen**: HOR-046 closed 2026-05-16 con 3 discoveries (D2 auto-reindex skip ~80%, D9 sessions parecen muertas, D11 AGENT INVOCATION 97.5% inline). Spec parent HOR-050 explore propuso Solucion A+B+C.
- **HOR-051 v1**: ticket original como improvement implementando Solucion A en Claude Code hooks. Spec v1 (`SPEC-workflow-hooks-claude-code-51`) generado y archivado el mismo dia tras feedback del dev: "el 051 quiero abrirlo exploratorio a mas alla de claude code, ya que aunque hoy es el modelo base, dkc puede usarse con otros modelos, como estamos pensando en llm local only".
- **HOR-051 v2 (este spec)**: ticket reclasificado a explore, scope ampliado a cross-host. Evalua 6 approaches al mismo nivel.

## Constraints

- **DET-11** (KB-first): inventario + decisiones HOR-046, HOR-050, HOR-029 ya consultados
- **DET-16** (propagacion): este spec propaga implicacion a HOR-052 (probable reclassificacion paralela), registrada en seccion Implicaciones
- **DET-20** (sessions): plan explore con S1+S2 ambas T0 doc-only, gate ⚑ fuerte en S2 para approval del dev
- **YAGNI** (heuristica DKC, no DET formal): aplicada en H6 — evitar abstraction layer prematuro
- **Cero acoplamiento Claude-Code-specifico en el approach primario** (requirement nuevo elevado por feedback del dev): el ejecutor primario debe funcionar con cualquier LLM host. A.1 Claude Code hooks queda como adapter opcional, no primario

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| HOR-029 mapping host | internal (closed) | Provee patron de abstraccion ligera entre hosts. Precedente para A.6 MCP tool | Bajo |
| HOR-050 spec parent | internal (draft) | DEC-LOCAL-02 (comment HTML catalogo) sigue vigente. Acceptance criteria final tambien | Bajo |
| MCP server deckard-cain | internal (existente, 28 tools) | A.6 agrega 1 tool mas. Trivial extension | Bajo |
| HOR-053 Frente C validator | internal (open) | Validator C es complementario al MCP tool (detecta drift post-hoc si LLM olvida) | Bajo |
| fswatch / inotify / chokidar | external | A.2 file watcher daemon. Herramientas maduras | Bajo |

## Approaches evaluados

### A.1 — Hooks Claude Code (PostToolUse en .claude/settings.json)

> **Que es**: aprovechar el mecanismo nativo de Claude Code donde `.claude/settings.json` declara hooks que se ejecutan tras eventos de tool calls. El wrapper bash parsea el evento, detecta tags `<!-- enforcement: a-hook command: "..." -->` en el archivo editado, ejecuta el comando.

| Dimension | Valoracion | Notas |
|-----------|------------|-------|
| Portabilidad | LOW | Solo Claude Code. NO escala a Ollama, VSCode Continue, Cursor, llama.cpp |
| Automaticidad | HIGH | Hook dispara automatic tras Edit/Write. Zero disciplina del LLM requerida |
| Costo | LOW | Wrapper bash < 50 lineas. settings.json edit. Mecanismo documentado |
| Riesgos | LOW | Memoria `feedback_permissions_compound.md` confirma uso previo. Fallback graceful con `set +e + exit 0`. Latencia medible |
| Fit LLM-local | LOW | Bloquea Ruta B HOR-029 (Qwen3-local). Trabajo desechable si se cambia de host |

**Spec v1 archivado tiene todos los detalles**: ver `specs/_archive/SPEC-workflow-hooks-claude-code-51.md`.

**Veredicto**: NO recomendado como primario. Considerable como adapter opcional si dev quiere automaticidad maxima en Claude Code mientras se transiciona.

### A.2 — File watcher daemon (fswatch / inotify / chokidar)

> **Que es**: proceso bash/Node corriendo en background que observa `prompts/steps/`, `specs/`, `tickets/` con fswatch (macOS) / inotify (linux) / chokidar (cross-platform). Tras detectar cambio, parsea el archivo modificado, detecta tags, ejecuta comandos. Igual que A.1 pero **host-agnostic** — no requiere integracion con el LLM, solo necesita que el LLM escriba archivos.

| Dimension | Valoracion | Notas |
|-----------|------------|-------|
| Portabilidad | MAX | Funciona con CUALQUIER LLM que escriba archivos (= todos). Ollama, Qwen-local, Cursor, etc. |
| Automaticidad | HIGH | Daemon observa fs continuamente. Latencia 100-300ms (fswatch buffer) |
| Costo | MEDIUM | Codigo del daemon similar al wrapper bash de A.1 (< 100 lineas). PERO requiere lifecycle: start/stop/restart, logs, error recovery, auto-restart on crash |
| Riesgos | MEDIUM | Daemon corriendo en background = otro proceso a operar. Si crashes silencioso → enforcement desactivado sin que el dev sepa. Mitigacion: health check + alertas |
| Fit LLM-local | MAX | Indiferente al host del LLM. Es la opcion mas portable |

**Trade-off clave**: lifecycle del daemon es la complejidad operacional. Para tests/POC en horadric (solo el dev), aceptable. Para multi-usuario o agentes remotos, mayor friccion.

**Veredicto**: recomendado como **capa 2 opcional** (post-A.6). Util si dev quiere enforcement 100% automatico sin depender de la disciplina del LLM en absoluto.

### A.3 — Wrapper CLI manual invocado por el LLM

> **Que es**: script bash `commands/dkc-enforce-step <step-id>` que el LLM ejecuta manualmente como Bash tool tras procesar un step relevante. El script parsea el step, encuentra tags, ejecuta comandos. Cero hooks, cero daemon — todo manual por el LLM.

| Dimension | Valoracion | Notas |
|-----------|------------|-------|
| Portabilidad | MAX | Cualquier LLM con Bash tool puede invocarlo |
| Automaticidad | LOW | Depende totalmente de que el LLM se acuerde de invocar. **Mismo problema D2/D9/D11 que estamos resolviendo** (97.5% inline ratio con Claude) |
| Costo | LOW | Script bash < 50 lineas |
| Riesgos | HIGH | H4 confirmada: LLM-local con context chico falla MAS que Claude. Skip rate proyectado > 80%. Approach se auto-derrota |
| Fit LLM-local | LOW | Aunque portable, no resuelve el problema |

**Veredicto**: **descartado como primario por H4**. Sobrevive como fallback complementario para hosts que no soporten ninguna otra opcion (improbable).

### A.4 — Git hook post-commit / pre-commit

> **Que es**: hook git declarado en `.git/hooks/post-commit` que se ejecuta tras `git commit`. Parsea archivos modificados en el commit, detecta tags, ejecuta comandos. Cualquier LLM que use git tiene acceso (todos eventualmente).

| Dimension | Valoracion | Notas |
|-----------|------------|-------|
| Portabilidad | HIGH | Cualquier LLM que use git. Casi todos eventualmente |
| Automaticidad | MEDIUM | Solo dispara tras `git commit`, NO tras Edit. Semantica distinta — bueno para validaciones pre-commit, malo para "auto-reindex post-step" inmediato |
| Costo | LOW | git hooks son estandar, mecanismo conocido |
| Riesgos | MEDIUM | Cambia la semantica del enforcement: solo aplica a archivos ya commiteados. Drift entre "editado pero no committed" e "indexed" |
| Fit LLM-local | MEDIUM | Funciona pero no es lo que queremos para auto-reindex (que debe ocurrir TRAS produccion del spec, no solo tras commit) |

**Veredicto**: **descartado para auto-reindex post-step**. Valido para validaciones pre-commit (linting, etc.) que NO son el universo a-hook actual. Mencion futura: si emergen directivas tipo "validar antes de commit", git hooks pueden ser su mecanismo.

### A.5 — Interface abstracta + adapters por host (a la JDBC para LLM hosts)

> **Que es**: capa de abstraccion en bash/TypeScript que define una interface generica (`enforce(step, file, tags) → result`). Adapters concretos por host: Claude Code adapter (invoca hook), Ollama adapter (invoca file watcher), MCP adapter (invoca tool), etc. El catalogo y la logica de parsing son comunes; solo el "trigger" cambia.

| Dimension | Valoracion | Notas |
|-----------|------------|-------|
| Portabilidad | MAX | Cualquier host con un adapter implementado |
| Automaticidad | MEDIUM | Depende del adapter — heredado |
| Costo | HIGH | Interface + N adapters + tests por adapter + documentacion + lifecycle de los adapters. Over-engineering si solo 1-2 adapters implementados |
| Riesgos | MEDIUM | YAGNI risk — abstraccion premature endurece el diseno antes de saber que adapters reales necesitamos |
| Fit LLM-local | MAX | Eventual end-state si DKC se vuelve multi-host real |

**Veredicto**: **descartado como primer movimiento por H6**. Aplicable en explore futuro cuando se haya implementado >=2 adapters reales (A.2 file watcher + A.6 MCP tool) y la abstraccion emerja organica de los 2 adapters concretos.

### A.6 — MCP tool dedicado (`mcp__deckard-cain__dkc_enforce_step`)

> **Que es**: agregar al servidor MCP de deckard-cain un tool `dkc_enforce_step(ticket_id, step_id)` que el LLM principal invoca explicito tras procesar un step. El tool lee el step, parsea tags, ejecuta comandos, retorna result. Cualquier LLM host compatible MCP puede invocar.

| Dimension | Valoracion | Notas |
|-----------|------------|-------|
| Portabilidad | HIGH | MCP es estandar abierto Anthropic + comunidad. Claude Code, Cursor, custom MCP clients lo soportan. Ollama tiene wrappers MCP en desarrollo |
| Automaticidad | MEDIUM | Requiere que el LLM invoque el tool — mismo trade-off que A.3, pero el LLM invoca tools como parte normal del flujo (no es ejecutar bash arbitrario) |
| Costo | LOW | deckard-cain ya tiene 28 tools — agregar 1 mas es trivial (~50 lineas Python). Tests + docs |
| Riesgos | MEDIUM | LLM puede olvidar invocar — mitigable con (a) prompt explicit en step etiquetado, (b) validator C HOR-053 detecta drift, (c) capa 2 A.2 file watcher como backup |
| Fit LLM-local | HIGH | LLM-local con MCP client funciona. Qwen3-local con MCP wrapper esta en roadmap del ecosistema |

**Trade-off clave**: similar a A.3 (manual) pero con la diferencia critica de que **el LLM invoca tools como parte natural del flujo** (no es ejecutar comandos bash adhoc). Skip rate proyectado < 30% si el step prompt es explicit ("invoca `dkc_enforce_step` ahora"), comparado con 80% de A.3.

**Veredicto**: **recomendado como primario**. Mejor trade-off de portabilidad + automaticidad + costo. Mitigaciones del riesgo de olvido son tractables.

## Decision matrix consolidada

Drivers ponderados + scores por approach. Score: 3=high, 2=mid, 1=low. Weight: 3=high, 2=mid, 1=low. Final score = sum(score × weight) / sum(weight × max_score=3).

| Driver | Weight | A.1 (Claude hooks) | A.2 (file watcher) | A.3 (CLI manual) | A.4 (git hook) | A.5 (abstraction) | A.6 (MCP tool) |
|--------|--------|--------------------|--------------------|------------------|----------------|-------------------|----------------|
| Portabilidad LLM-local | 3 (high) | 1 | 3 | 3 | 2 | 3 | 3 |
| Automaticidad (sin disciplina LLM) | 3 (high) | 3 | 3 | 1 | 2 | 2 | 2 |
| Costo de implementacion | 2 (mid) | 3 | 2 | 3 | 3 | 1 | 3 |
| Operabilidad (lifecycle, debug, error recovery) | 2 (mid) | 3 | 1 | 3 | 2 | 1 | 3 |
| Compatibilidad MCP ecosystem | 1 (low) | 1 | 1 | 1 | 1 | 2 | 3 |
| Risk de re-trabajo si emerge nuevo host | 2 (mid) | 1 | 3 | 3 | 2 | 3 | 3 |
| **Total score / max** | | **15/39** | **20/39** | **17/39** | **17/39** | **17/39** | **23/39** |
| **Normalizado** | | **38%** | **51%** | **44%** | **44%** | **44%** | **59%** |
| **Ranking** | | 6/6 | 2/6 | =3/6 | =3/6 | =3/6 | **1/6** |

**Resultado**: A.6 (MCP tool) lidera. A.2 (file watcher) segundo. A.1 (Claude hooks) ultimo por portabilidad.

## Recomendacion firmada

### Primario: A.6 MCP tool dedicado

Implementar como sub-ticket derivado **HOR-054** (tentativo):
- Agregar tool `mcp__deckard-cain__dkc_enforce_step` al servidor MCP de deckard-cain
- Diseno del tool: input `{ ticket_id, step_id, file_path }` → output `{ executed: [...], log: ... }`
- Etiquetado canonical de las ~30 directivas a-hook con `<!-- enforcement: a-hook command: "..." -->`
- Tests: 5/5 directivas POC invocadas correctamente + medicion latencia + fallback graceful

### Secundario opcional: A.2 file watcher daemon

Implementar como sub-ticket derivado **HOR-055** (tentativo, opt-in):
- Daemon bash con fswatch que observa `prompts/steps/`, `specs/`, `tickets/`
- Parsea archivo modificado, detecta tags, ejecuta comandos
- Lifecycle: start/stop/restart commands + log + health check
- Opt-in: dev habilita si quiere enforcement 100% automatic sin depender del LLM

Si HOR-054 valida que A.6 cubre la mayoria de los casos con bajo skip rate (< 30%), HOR-055 puede aplazarse o cancelarse. Si HOR-054 muestra skip rate alto, HOR-055 se vuelve prioritario.

### Capa 0: catalogo machine-readable (precondicion universal)

Comun a todos los approaches: etiquetar las ~30 directivas a-hook con `<!-- enforcement: a-hook command: "..." -->`. Puede mergearse en HOR-054 o ser sub-ticket separado **HOR-056** segun preferencia del dev.

### Adapter Claude Code (A.1) como opcion futura

NO se implementa ahora. Si en futuro emerge necesidad de automaticidad maxima en Claude Code (sin daemon de A.2), puede agregarse como adapter "pegado" al MCP tool — un hook PostToolUse de Claude Code que invoca el MCP tool A.6 automaticamente tras Edit. Trabajo bajo (~30 min) cuando se necesite, sin diseno previo.

## Sub-ticket derivado mergeado A+B (decision del dev 2026-05-16: HOR-054 cubre ambos frentes)

| Ticket | Scope | Priority | Estimated SP |
|--------|-------|----------|--------------|
| **HOR-054** — Multi-MCP-tool: implementa **AMBOS** tools `dkc_enforce_step` (Frente A) + `dkc_invoke_agent` (Frente B) + etiquetado canonical de las ~30 directivas a-hook + refactor de las 6 mentions de AGENT INVOCATION + tests integrados | Primario merged A+B. Cubre A.6 + B.2 + catalogo (Capa 0) + etiquetado masivo + refactor | must | 12-15 |

**Granularidad**: 1 sub-ticket merged A+B. Maximo aprovechamiento de codigo compartido (signature similar, mismo MCP server, mismas decisiones de mapping host). Trade-off: SP combinado 12-15 vs 8-10 + 5-8 separados = ahorro ~3-5 SP por reutilizacion + menor overhead de tickets. Riesgo: scope grande, considerar particion interna en sessions del propio HOR-054 cuando se arranque.

**A.2 file watcher daemon**: NO se crea sub-ticket todavia. Se decide post-HOR-054. Si skip rate alto (>30%), abrir HOR-055 (explore o improvement segun emerge). Si HOR-054 cubre bien (<30%), file watcher queda como backlog `could`.

## Implicaciones para HOR-052 y HOR-053

### HOR-052 (Frente B AGENT INVOCATION) — RECLASSIFICACION PREEMPTIVA DECIDIDA (2026-05-16)

**Decision del dev tras leer este spec**: reclassificar HOR-052 a explore cross-host **AHORA**, en paralelo con HOR-051, antes de cerrar ambos. Razon: evitar escenario "HOR-051 cerrado con implicacion abierta", mantener coherencia arquitectural en la triada A+B+C.

Misma logica: la Solucion B original (re-escribir AGENT INVOCATION como fence `dkc:agent-invocation` parseado por harness wrapper) es Claude-fence-specific. Para LLM-local, el approach correcto es probablemente **otro MCP tool** (`dkc_invoke_agent` o similar) que el LLM principal invoque explicit, no un fence interpretado por wrapper del harness.

**Plan**: HOR-052 sigue patron analogo a HOR-051: intake-explore v2 cross-host + teach-intake v2 + spec draft con N approaches + recomendacion + sub-tickets. Ejecutado antes de cerrar HOR-051.

### HOR-053 (Frente C validator post-step)

**Sin cambio necesario** — Frente C ya es portable por diseno. `commands/lib/validate.ts` extension con kind `Directive` es reusable con cualquier LLM host porque es post-hoc (corre tras el step, sin acoplamiento al evento de edit). El catalogo machine-readable comun a A+B+C funciona aqui tambien.

**Verificacion en sub-ticket de HOR-053**: confirmar que ningun check del validator depende de comportamiento Claude-Code-specifico.

## NFRs

> Aplicables a sub-tickets futuros, no a este spec exploratorio.

| Tipo | Current | Target sub-ticket HOR-054 (MCP) | Target sub-ticket HOR-055 (file watcher) |
|------|---------|---------------------------------|-------------------------------------------|
| Latencia ejecutor por directiva | N/A | < 1s p95 | < 500ms p95 (excluye fswatch buffer) |
| Cobertura del catalogo a-hook | 0/30 | 30/30 etiquetadas + 5/5 POC funcionales | 30/30 (heredado del catalogo) |
| Skip rate medido en 2 tickets reales | ~80% (D2 HOR-046, con Claude) | < 30% (target conservador para MCP tool) | < 5% (target con file watcher, cero disciplina LLM) |
| Portabilidad | Claude-only | MCP-compatible (Claude Code, Cursor, MCP clients custom) | Universal (cualquier LLM que escriba archivos) |

## Tasks

> Plan exploratorio del ticket HOR-051. Sub-tickets derivados tienen sus propios planes.

### Session 1 — Exploracion comparativa de 6 approaches cross-host [tipo: auto] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Refinar inventario exhaustivo de directivas a-hook (cross-host, agnostico de ejecutor) | H2, H1 | researcher | — | spec (Appendix futuro), ticket Triage | Tabla con >=14 directivas, clasificadas por categoria de comando | N/A (read-only) | DET-1, DET-2, DET-11 | done (inline en spec) | 1 |
| S1.T2 | Para cada approach A.1-A.6: portabilidad, automaticidad, costo, riesgos, fit LLM-local. Evaluar al mismo nivel de detalle | H2 | architect | S1.T1 | spec (seccion Approaches evaluados) | 6 approaches evaluados con tabla homogenea | git revert | DET-2, DET-16 | done (inline en spec) | 1 |
| S1.T3 | Decision matrix consolidada con drivers + scores normalizados | H2 | architect | S1.T2 | spec (seccion Decision matrix consolidada) | Matrix con A.6 lider claro | git revert | DET-2 | done (inline en spec) | 1 |
| S1.GATE | Gate Session 1 (T0): inventario + 6 approaches evaluados + decision matrix coherente. Quality review light (5 dims aplicables) | — | reviewer | S1.T1-T3 | spec + ticket | Quality review DET-23 light. Decision: continue | git revert por task | DET-13, DET-14, DET-20, DET-23 | done (inline) | 1 |

### Session 2 — Spec draft final + sub-tickets derivados sugeridos + implicaciones [tipo: ⚑ fuerte] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Producir spec draft final con: recomendacion firmada (A.6 primario + A.2 secundario opcional) + conditions C1-C4 + sub-tickets sugeridos | H1-H6 | architect | S1.GATE | spec (este archivo) | Spec completo con todas las secciones | git revert | DET-2, DET-13, DET-16 | done (inline en spec) | 2 |
| S2.T2 | Implicaciones cruzadas: HOR-052 (probable reclassificacion paralela), HOR-053 (sin cambio) documentadas | H5 (AQ-051-03, AQ-051-04) | architect | S2.T1 | spec (seccion Implicaciones) | Implicaciones explicit con razon | git revert | DET-16 | done (inline en spec) | 2 |
| S2.T3 | Marcar spec status `draft` + ticket frontmatter (en request-close) | — | scribe | S2.T2 | spec + ticket frontmatter | spec status: draft (ya es draft en frontmatter) | git revert | DET-13 | done | 2 |
| S2.GATE | Gate Session 2 ⚑ fuerte (T0): spec completo + recomendacion firmada + Quality review exhaustive. Dev aprueba o pide iterate | — | reviewer | S2.T1-T3 | spec + ticket | Quality review DET-23 exhaustive. Decision: aprobado | N/A | DET-13, DET-14, DET-20, DET-23 | pending (dev decide al leer) | 2 |

## Success metrics (post-implementacion de sub-tickets)

| Metric | Baseline | Target HOR-054 | Target HOR-055 | How to measure |
|--------|---------|----------------|----------------|----------------|
| Directivas etiquetadas | 0 | 30 | 30 (heredado) | grep catalogo |
| MCP tool invocaciones reales / esperadas | N/A | > 70% (target conservador) | N/A | log invocaciones |
| File watcher dispatches / edits | N/A | N/A | > 95% | log daemon |
| Cobertura cross-host | Solo Claude | Claude Code + Cursor + MCP custom | Universal | manual test con Ollama si available |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| MCP tool olvidado por el LLM | Medium | High | Prompt explicit + validator C (HOR-053) + capa 2 A.2 |
| Daemon lifecycle complejo (A.2) | Medium | Medium | Sub-ticket dedicado + docs claras + opt-in |
| Approach recomendado no escala a host emergente | Low | Medium | MCP estandar abierto + file watcher host-agnostic |
| Sub-tickets sin priorizar | Low | Low | Spec recomienda orden: HOR-054 → validar → HOR-055 si necesario |
| Reclassificacion paralela HOR-052 anade trabajo | Medium | Low | Trabajo necesario eventualmente — temprano vs tarde |

## Open questions

- **OPEN-1**: ~~¿1 sub-ticket merged o granulares?~~ RESUELTO (2026-05-16): 1 sub-ticket merged HOR-054 (decision del dev)
- **OPEN-2**: ¿implementar A.2 file watcher como HOR-055 desde el inicio? RESUELTO (2026-05-16): esperar a validar HOR-054 primero. Si HOR-054 skip rate > 30%, abrir HOR-055
- **OPEN-3**: ~~¿reclassificar HOR-052 ahora o cuando se arranque?~~ RESUELTO (2026-05-16): reclassificar AHORA preemptivo (decision del dev). HOR-052 sigue patron analogo a HOR-051 antes de cerrar ambos

## Decisions (cerradas durante explore)

### DEC-LOCAL-01: Reclassificar HOR-051 de improvement a explore

- **Contexto**: el dev pidio expandir scope mas alla de Claude Code tras generar el spec v1 Claude-specific
- **Drivers**: portabilidad high, evitar over-engineering high, preservar trabajo v1 mid
- **Opcion elegida**: reclassificar a explore + archivar spec v1 + producir spec v2 con 6 approaches
- **Alternativas**: refactorizar v1 con abstraction layer (rechazado por H6); cerrar v1 + crear HOR-054 explore separado (rechazado por duplicacion)
- **Consecuencias**: 1 ronda extra de exploracion (~2-3h). Spec v1 sigue util como referencia
- **Session**: intake (decisional con el dev)

### DEC-LOCAL-02: A.6 MCP tool como approach primario, A.2 file watcher como secundario opcional

- **Contexto**: decision matrix con 6 approaches, A.6 lidera con 59%, A.2 segundo con 51%
- **Drivers**: portabilidad LLM-local high, automaticidad high, costo mid, compatibilidad MCP ecosystem
- **Opcion elegida**: A.6 primario + A.2 capa 2 opcional
- **Alternativas**: A.2 solo (rechazado por lifecycle complejidad sin haber validado A.6 primero); A.1 + A.6 (rechazado por A.1 no escala); A.5 abstraction layer (rechazado por H6 YAGNI)
- **Consecuencias**: HOR-054 implementa MCP tool. HOR-055 implementa file watcher si HOR-054 muestra skip rate alto
- **Session**: S1+S2 explore (decisional del architect)

### DEC-LOCAL-03: A.3 descartado por H4, A.5 descartado por H6

- **Contexto**: filtrado de approaches antes de la matriz para evitar evaluar a profundidad opciones descartables
- **Drivers**: H4 confirmed (LLM-local fallara mas que Claude), H6 confirmed (YAGNI)
- **Opcion elegida**: descartar A.3 (manual) y A.5 (abstraction) como primarios. Mantener como adapters futuros si emerge necesidad
- **Alternativas**: evaluar las 6 con la misma profundidad (rechazado — diluye atencion)
- **Consecuencias**: matriz se enfoca en A.1/A.2/A.4/A.6. Recomendacion mas clara
- **Session**: S1 explore

## Acceptance checkpoints

- [ ] **C1 — dev autoriza recomendacion**: al leer Executive summary + Recomendacion firmada, dev aprueba con OK o pide iterate. Sub-tickets se crean cuando aprueba
- [ ] **C2 — implementacion HOR-054 valida portabilidad**: medible en sub-ticket post-implementacion (cobertura 100% del catalogo + zero acoplamiento Claude-Code)
- [ ] **C3 — abstraction layer evaluado solo si emerge necesidad**: NO bloquea esta spec. Trigger: si HOR-055 implementado + emerge tercer adapter, retomar A.5
- [ ] **C4 — implicaciones HOR-052/HOR-053 registradas**: documentadas en seccion Implicaciones de este spec

## Archiving

Cuando el spec deje de ser fuente de verdad (sub-tickets HOR-054 + HOR-055 cerrados con sus propios specs implementacion): `/dkc-archive-spec SPEC-workflow-directive-enforcement-a-cross-host-51 "implementado via HOR-054 + HOR-055"`.

Mientras los sub-tickets no se hayan creado, este spec permanece `draft`.
