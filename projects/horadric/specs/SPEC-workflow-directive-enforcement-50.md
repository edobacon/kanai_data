---
id: SPEC-workflow-directive-enforcement-50
project: horadric
ticket: HOR-050
status: draft
---

# Directive enforcement — arquitectura de hooks + validators + protocolos para sistematizar lo declarativo

# Directive enforcement — arquitectura de hooks + validators + protocolos para sistematizar lo declarativo

## Executive summary — lo que estas aprobando

### Que se quiere

Convertir las **~90 directivas declarativas en prosa** (BLOQUEANTE / MUST / obligatorio / "Si exit != 0...") distribuidas en 25 steps en **protocolos enforced programaticamente**. La causa raiz de D2, D9, D11 (HOR-046 backlog) es comun: sistema declara, LLM no ejecuta consistentemente (~97.5% inline en HOR-046, 1/40 invocaciones de Agent reales).

Esto NO es 3 bugs aislados. Es un patron arquitectural — el sistema **asume disciplina del LLM** donde deberia haber enforcement de codigo. Para LLM-local con context pequeño, esta asuncion rompe: si Claude (200K context) ya falla el 97.5% del tiempo, un Qwen 3 local (32K efectivo) fallara mas.

### Decisiones criticas

| # | Decision | Por que |
|---|----------|---------|
| 1 | **Solucion arquitectural = A + B + C combinados** (NO eleccion exclusiva) | Suma de cobertura ~100% sin solapamiento (H4+H5+H6 confirmed direccional). D queda subsumida en B |
| 2 | **A — Hooks Claude Code** para ejecucion programatica directa | Cubre ~40% (auto-reindex, dkc-validate, MCP calls especificas). PreToolUse / PostToolUse en `.claude/settings.json` |
| 3 | **C — Validator post-step** para post-conditions verificables | Cubre ~30% ("todas las tasks marcadas", "gate con [x]"). Reusable con cualquier LLM host |
| 4 | **B — Refactor de prompts a protocolos ejecutables** para invocaciones de subagentes | Cubre ~30% (AGENT INVOCATION 6 mentions en 4 files). Re-escribir como JSON spec que el harness interprete |
| 5 | **POC chico antes de implementacion completa** | S2 POC = 1 directiva por categoria + medicion empirica. Bajo costo, alto valor de aprendizaje. Si la metrica no cumple, re-evaluar antes de invertir |
| 6 | **3 tickets derivados post-explore** (no super-ticket) | Cada solucion es independiente. Permite paralelizacion + commits granulares |

### Riesgos principales y como los mitigamos

| Riesgo | Probabilidad | Impact | Mitigacion |
|--------|--------------|--------|------------|
| **Hooks Claude Code son no portables a otros LLM hosts** (Qwen local, Ollama) | Alta | Medio | C (validator) es portable. A da beneficio HOY con Claude. Si emerge cambio de host, validator C sigue. **No hay perdida** |
| **POC midiendo inline ratio requiere baseline real** — HOR-046 mide 97.5% pero es 1 ticket | Media | Bajo | Medir en 2-3 tickets nuevos (C2) antes de extrapolar. Si baseline varia mucho, refinar metrica |
| **Refactor B de prompts es masivo** (~6 AGENT INVOCATION + similares) | Media | Alto (scope grande) | POC con 1 invocacion. Resto incremental en ticket derivado B-impl |
| **Hooks programaticos pueden ralentizar Claude Code** | Baja | Bajo | Hooks bash simples (dkc-reindex, dkc-validate) son < 1s. Medible en S2 |

### Que NO se hace

- **NO implementar la solucion completa** — eso son 3 tickets derivados post-explore
- **NO modificar HOR-031 (embeddings)** — sigue como ticket separado
- **NO refactorear las 25 DETs** (HOR-047 lo cubre)
- **NO atacar Ruta A (HOR-030)** — depende de medicion HOR-029 primero

### Tamano estimado

| Session | Objetivo | Tier | Horas |
|---------|----------|------|-------|
| S1 (consolidada en intake-explore) | Inventario empirico + clasificacion | T0 | 30min — done |
| S2 | POC de 1 directiva por categoria + medicion | T1 | 2h |
| S3 | Decision arquitectural firmada + spec draft + tickets derivados sugeridos | T0 | 1h |

**Total tentativo**: 3-4h efectivas. SP estimado: **5** (explore intensivo sin implementacion).

### Como vas a saber que funciona

- **Pre-POC** (baseline): inline ratio actual ~97.5% (HOR-046 medido). Auto-reindex skip rate ~80% (estimado de la conversacion)
- **Post-POC** (target): con hooks A activos sobre auto-reindex post-spec, skip rate < 5%. Con validator C sobre Tasks completadas, drift < 1%. Con refactor B sobre 1 AGENT INVOCATION, invocacion real == 100%
- **3 tickets derivados post-spec** (A-impl, B-impl, C-impl) generados con tasks concretas + acceptance criteria. Cada uno puede empezar independiente

## Purpose

Resolver la causa raiz arquitectural compartida por D2 + D9 + D11 + ~90 directivas similares: el sistema DKC asume disciplina del LLM donde deberia haber enforcement de codigo. Habilita LLM-local end-to-end al eliminar dependencia de la "interpretacion" del LLM para directivas mecanicas.

## Constraints

- DET-11 (KB-first): el inventario ya cubre las directivas declaradas. Cualquier solucion debe respetarlas, no reemplazarlas
- DET-16 (propagacion): cada directiva enforced debe declarar consumers — el LLM no se entera del cambio sin documentacion
- DET-20 (sessions con gate): explore produce spec draft sin pasar a execute (DET-20 exime explore)
- HOR-029 mapping host: Ruta B (researcher→Explore, architect→Plan, etc.) sigue siendo el target. Solucion B convierte `AGENT INVOCATION:` en algo que el harness pueda procesar
- HOR-042 opt-in flag heredado: cualquier nuevo enforcement entra como opt-in via flag en frontmatter (`enforce_directives: true`). Cero breaking changes

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| HOR-029 mapping host | internal (closed, hipotesis pendientes) | Solucion B re-escribe AGENT INVOCATION como protocolo que el harness mapea a Explore/Plan/general-purpose | Medio — si Ruta B no funciona en medicion empirica, B pierde valor |
| HOR-046 schemas | internal (closed) | TeachSchema + AntiPatternsDetector funcionales. Solucion C reusa el patron de schemas validables | Bajo — fundacion solida |
| HOR-042 pipeline | internal (closed) | dkc-write opt-in flag. Solucion A puede colgarse del post-write hook | Bajo |
| Claude Code hooks support | external | `.claude/settings.json` PreToolUse / PostToolUse. Mi memoria `feedback_permissions_compound.md` ya cubre PreToolUse | Bajo |

## Requirements (delta para explore — refinables en tickets derivados)

### REQ-IMPROVE-01: Categorizacion canonical de directivas

> **Que cambia**: cada directiva declarativa en `prompts/steps/*.md` (BLOQUEANTE / MUST / obligatorio / "Si exit") se etiqueta con su categoria de enforcement (`a-hook | b-protocol | c-validator`). Antes era prosa indistinguible.
> **Por que**: sin categorizacion explicita, no hay forma sistematica de saber cual solucion aplica a cual directiva.

El sistema MUST etiquetar cada directiva con su categoria via comment markdown standard:
```markdown
<!-- enforcement: a-hook -->
**BLOQUEANTE**: Inmediatamente despues de producir el spec, ejecutar `./commands/dkc-reindex {project}` sincrono.
```

Validable via `dkc-validate Directive prompts/steps/{step}.md` (categoria nueva del validator extendido).

<details><summary>Scenarios de validacion</summary>

#### Scenario: step con directiva sin etiqueta
- **GIVEN** `prompts/steps/foo.md` con `**BLOQUEANTE**: ...` sin comment `<!-- enforcement: ... -->`
- **WHEN** `dkc-validate Directive prompts/steps/foo.md`
- **THEN** retorna warning con la linea sin etiquetar
</details>

### REQ-IMPROVE-02: Hook engine para Solucion A (~40% cobertura)

> **Que cambia**: cuando un step declara `<!-- enforcement: a-hook -->` con comando ejecutable, un wrapper bash/tsx ejecuta el comando automatic post-step.
> **Por que**: auto-reindex hoy depende de disciplina del LLM (D2). Hook lo ejecuta por construccion.

El sistema MUST detectar directivas etiquetadas `a-hook` y ejecutar el comando declarado tras el step. Implementacion: `.claude/settings.json` PostToolUse + script wrapper que parsea el step ejecutado y dispara los hooks relevantes.

### REQ-IMPROVE-03: Validator post-step para Solucion C (~30% cobertura)

> **Que cambia**: cuando un step declara `<!-- enforcement: c-validator -->` con post-condition, un check programatico verifica que el estado producido cumple. Falla → step se considera incompleto.
> **Por que**: directivas tipo "todas las tasks marcadas con [x]" requieren verificacion no comando.

El sistema MUST detectar directivas `c-validator` y ejecutar el check pre-Gate decision. Extension natural del pipeline HOR-042.

### REQ-IMPROVE-04: Protocolo ejecutable para AGENT INVOCATION (Solucion B, ~30% cobertura)

> **Que cambia**: las 6 mentions de `> **AGENT INVOCATION (HOR-025)**: subagent_type=...` se re-escriben como bloques JSON/YAML que el harness interprete como tool call directo.
> **Por que**: hoy el LLM lee como prosa, 1/40 invocaciones reales. Necesita refactor estructural.

Propuesta tentativa:
```markdown
<!-- enforcement: b-protocol -->
```dkc:agent-invocation
subagent_type: researcher
tier: fast
prompt: "Validar hipotesis {H_id}..."
output_schema: prompts/agents/researcher.md
```
```

El harness (Claude Code wrapper) detecta el fence `dkc:agent-invocation` y ejecuta `Agent({subagent_type, ...})` antes de proceder. POC en S2 valida factibilidad.

### REQ-PRESERVE-01: Cero breaking changes para steps sin etiqueta

> **Que cambia**: nada. Steps sin `<!-- enforcement: ... -->` siguen funcionando como hoy (LLM interpreta prosa).
> **Por que**: opt-in por step, igual que HOR-042 opt-in por ticket.

### REQ-PRESERVE-02: Mantener directivas en prosa para legibilidad humana

El comment `<!-- enforcement: ... -->` AGREGA metadata, NO reemplaza la prosa. El dev y el LLM siguen leyendo la directiva en lenguaje natural; el enforcement programatico es paralelo.

## NFRs

| Tipo | Current | Target | How to measure |
|------|---------|--------|----------------|
| Hook latency (Solucion A) | N/A | < 1s por hook simple (dkc-reindex, dkc-validate) | Cronometrar en POC |
| Validator latency (Solucion C) | N/A | < 500ms por check | Idem |
| Inline ratio del LLM post-enforcement | ~97.5% (HOR-046) | < 30% en 2-3 tickets nuevos | Medir Agent calls vs inline en tickets post-POC |
| Refactor Solucion B coverage | 0/6 AGENT INVOCATION | 100% (6/6) en ticket B-impl | Grep + manual count |

## Tasks (para sessions S2 y S3 — ejecutables post-aprobacion del dev)

### Session S2 — POC: 1 directiva por categoria + medicion empirica [tier: T1] [tipo: ⚑ fuerte]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | POC Solucion A: hook PostToolUse en `.claude/settings.json` que ejecuta `dkc-reindex horadric` tras edit de spec | REQ-IMPROVE-02 | developer | — | `.claude/settings.json`, comando hook wrapper | Hook se ejecuta automatic tras edit (verificable en logs) | Revert settings.json | DET-5, DET-10 | pending | 2 |
| S2.T2 | POC Solucion C: extender `commands/lib/validate.ts` con nuevo kind `Directive` que verifica directivas etiquetadas en un step | REQ-IMPROVE-03 | developer | S2.T1 | `commands/lib/validate.ts`, `commands/lib/schemas/directive.ts` (nuevo) | Self-test 5 tests pass | git revert | DET-5, DET-10 | pending | 2 |
| S2.T3 | POC Solucion B: re-escribir 1 AGENT INVOCATION (la de `_design-shared.md:124`) como fence `dkc:agent-invocation` + test manual con harness real | REQ-IMPROVE-04 | developer + architect | S2.T2 | `prompts/steps/_design-shared.md`, posible wrapper en `.claude/` | Invocacion real de Agent tool verificable | git revert | DET-5, DET-10, DET-16 | pending | 2 |
| S2.T4 | Medicion empirica: cronometrar latencia hooks + validators. Documentar resultados | NFR latency | researcher | S2.T1-T3 | Inline bench | < 1s hooks, < 500ms validators | N/A | DET-13 | pending | 2 |
| S2.GATE | Gate Session 2 ⚑ fuerte: POC funciona end-to-end + latencias dentro de NFR. Dev autoriza S3 o re-evaluar | — | reviewer | S2.T1-T4 | `tickets/HOR-050.md` | Quality review DET-23 standard. Decision: continue/iterate | git revert por task | DET-13, DET-14, DET-20, DET-23 | pending | 2 |

### Session S3 — Decision arquitectural firmada + spec draft + 3 tickets derivados [tier: T0] [tipo: ⚑ fuerte]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Decision arquitectural firmada: A+B+C combinados como solucion v1. Documentar en spec como DEC-LOCAL final | REQ-IMPROVE-01 | architect | S2.GATE | `specs/SPEC-workflow-directive-enforcement-50.md` | DEC-LOCAL agregada | git revert | DET-1 | pending | 3 |
| S3.T2 | Producir 3 tickets derivados sugeridos: HOR-051-A-hooks-impl, HOR-052-B-protocols-impl, HOR-053-C-validator-impl. Cada uno con scope inicial + tasks tentativas | REQ-IMPROVE-02+03+04 | architect | S3.T1 | `projects/horadric/tickets/HOR-051.md`, HOR-052.md, HOR-053.md (drafts iniciales) | 3 tickets creados con frontmatter + Request preservado | Eliminar tickets si dev rechaza | DET-2, DET-11 | pending | 3 |
| S3.T3 | Marcar spec status `draft` con conditions C1-C4 + close ticket HOR-050 con `closed_reason: explored` (patron HOR-049) | DET-13 | scribe | S3.T2 | spec + ticket frontmatter | spec status: draft. ticket: closed, closed_reason: explored | git revert | DET-13 | pending | 3 |
| S3.GATE | Gate Session 3 ⚑ fuerte: spec draft + 3 tickets derivados + ticket cerrado. Dev decide arrancar implementacion ahora o agendar | — | reviewer | S3.T1-T3 | spec + tickets | Quality review DET-23 exhaustive | N/A | DET-13, DET-14, DET-20, DET-23 | pending | 3 |

## Success metrics

| Metric | Baseline | Target | When to measure |
|--------|---------|--------|-----------------|
| Inline ratio (Agent calls vs inline) | 97.5% (HOR-046) | < 30% | 2-3 tickets nuevos post-implementacion |
| Auto-reindex skip rate | ~80% estimado | < 5% | POC S2 + medicion en S3 |
| Tasks con paso por `[~]` antes de `[x]` | 0% | > 80% | POC S2 (sub-task de Solucion A o C) |
| AGENT INVOCATION → Agent real | 1/6 = 17% (HOR-046) | 6/6 = 100% | Ticket B-impl post-spec |

## Risks and mitigations

Resumen referencial — detalle en Executive summary §3.

| Risk | Mitigation |
|------|------------|
| Hooks no portables | C (validator) compensa para hosts no-Claude |
| Refactor B masivo (~6 mentions + similar) | POC con 1, resto incremental en ticket B-impl |
| Baseline solo 1 ticket | Medir en 2-3 nuevos antes de extrapolar (C2 condition) |

## Open questions

- **OPEN-1**: ¿hooks Claude Code soportan dispatch por filename ahora editado? Verificar empirico en S2.T1
- **OPEN-2**: ¿harness Claude Code expone API para que un wrapper externo dispare `Agent({subagent_type: ...})` desde un fence en markdown? Si NO, Solucion B requiere CLI bridge intermedio. Verificar en S2.T3

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Solucion arquitectural = A + B + C combinados (no exclusivos)

- **Contexto**: 4 soluciones tentativas (A hooks, B protocolos, C validators, D schemas JSON). Categorizacion empirica de ~90 directivas mostro distribucion ~40/30/30 entre 3 tipos de enforcement
- **Drivers**: cobertura total ~100% sin solapamiento. Cada solucion aplica al tipo distinto de directiva
- **Opcion elegida**: combinacion A+B+C
- **Alternativas**: solo A (cubre solo 40%), solo B (refactor masivo prematuro), solo C (detection post-hoc no preventiva), incluir D (over-engineering, subset implicit de B)
- **Consecuencias**: 3 tickets derivados independientes. Permite paralelizacion. Mayor scope pero cobertura completa
- **Session**: intake-explore (S0)

### DEC-LOCAL-02: Categorizacion canonical en cada step con comment markdown

- **Contexto**: Q de implementacion — ¿como etiquetar directivas para que el enforcer las detecte?
- **Drivers**: legibilidad humana + machine-readable + cero breaking changes
- **Opcion elegida**: comment HTML `<!-- enforcement: a-hook | b-protocol | c-validator -->` antes de cada directiva
- **Alternativas**: frontmatter por step (rechazada — no escala a directivas multiples), nuevo formato (rechazada — refactor masivo)
- **Consecuencias**: cada step tendra ~N comments adicionales (overhead minimo). El enforcer puede ignorar prosa sin tag (opt-in por directiva)
- **Session**: intake-explore (S0)

### DEC-LOCAL-03: POC chico antes de implementacion completa

- **Contexto**: si la combinacion A+B+C es viable y mide en ambito real
- **Drivers**: validar empirico antes de invertir 3 tickets de implementacion
- **Opcion elegida**: POC en S2 con 1 directiva por categoria + medicion. Si metrica falla, re-evaluar
- **Alternativas**: implementacion directa (rechazada — riesgo de re-trabajo), POC mas chico solo 1 categoria (rechazada — pierde el patron de combinacion)
- **Consecuencias**: 2h adicionales antes del spec draft final
- **Session**: intake-explore (S0)

## Acceptance checkpoints

- [ ] **C1** (POC validation): metrica empirica cumple targets (S2.T4)
- [ ] **C2** (real-world validation): inline ratio < 30% medido en 2-3 tickets nuevos post-implementacion (futuro, post-tickets derivados)
- [ ] **C3** (paralelismo): HOR-031 no bloquea, avanza en paralelo (verificable: dev confirma cuando arranque HOR-031)
- [ ] **C4** (dev approval): dev autoriza implementacion completa post-spec (S3.GATE)
- [ ] **3 tickets derivados** creados con frontmatter + Request + tasks tentativas (S3.T2)
- [ ] **Spec status: draft** (S3.T3)
- [ ] **Ticket HOR-050 closed** con `closed_reason: explored` (S3.T3)

## Archiving

Cuando el spec deje de ser fuente de verdad (despues de que los 3 tickets derivados se cierren con sus propios specs implementation): `/dkc-archive-spec SPEC-workflow-directive-enforcement-50 "implemented via HOR-051 + HOR-052 + HOR-053"`.
