---
id: SPEC-workflow-context-budget-reduction-59
project: horadric
ticket: HOR-059
status: done
---

# Context budget reduction — Compresion sessions + Lazy-load steps (HOR-059b)

# Context budget reduction — Compresion sessions + Lazy-load steps (HOR-059b)

## Executive summary — lo que estas aprobando

> *Esta seccion esta disenada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Artifacts, Tasks). Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: bajar el context base del sistema DKC de los 83.7K tokens medidos hoy a aproximadamente 60-63K (~25% reduccion) implementando 2 piezas integradas — **compresion semantica de sessions** al cerrar gates (scribe genera summary de ~200 tokens preservando TCs/discoveries/gate-decision; original en `tickets/{id}.sessions/S{N}.md`) y **lazy-loading de steps** (split de los steps mas grandes en archivos por fase + tool MCP `dkc_get_step_phase`). El beneficio: ~50% reduccion de costo por ticket con Claude ($4-8 → $2-4) y headroom de razonamiento sostenido en LLMs locales con efectivo 128K.

**Decisiones criticas que necesitan tu OK** (cada una con racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Split de steps: ¿los 2 mas grandes (request-execute 69.2K + request-close 38.8K) o los 5? | Trade-off ROI vs costo: 2 → ~6K ahorro / bajo riesgo; 5 → ~10K ahorro / refs cruzadas mas extensas |
| 2 | Schema del summary de session: que campos se preservan literal vs comprimidos | Si pierde TCs/gate-decision/discoveries → rompe DET-13 (cierre con evidencia). Schema explicito mitiga |
| 3 | Modelo local target: 128K efectivo (conservador, default) vs 256K (requiere modelo confirmado) | Define ROI relativo de Pieza 3 — si efectivo real >200K, Pieza 3 marginal pero no daniña |
| 4 | Reabrir Pieza 1 (manifest DET) como HOR-059c si delta pilot <25%? | Cierra el ciclo: si la reduccion no llega al target, hay follow-up explicito |

**Riesgos principales y como los mitigamos**:

- **Compresion pierde info critica (H3)** → schema explicito + validacion empirica en S3.T7 sobre 5 tickets cerrados reales (HOR-022, HOR-046, HOR-055, HOR-056, HOR-040) con OK del dev antes de declarar GA
- **Lazy-load rompe DET-16 propagacion (H4)** → grep masivo obligatorio + nuevo comando `dkc-validate-step-references` que detecta refs huerfanas antes de S4.GATE
- **HC parser no soporta summary mixto** → S3.T5 inspecciona SessionDetailModal de HOR-058 antes de implementar; si no reusable, implementar pattern (no bloqueante)

**Que NO se hace en este ticket** (limites explicitos del scope):

- DKC-lite manifest DET para LLM principal — delegado a HOR-059c reactivable si pilot S5 mide <25% reduccion
- Embeddings KB retrieval — HOR-031 cerrado (cubrio el caso del researcher)
- Validation gate con modelo pequeno — HOR-033 roadmap
- Multi-modelo routing — HOR-035 roadmap
- Migracion masiva de tickets cerrados a sessions comprimidas — opt-in via comando manual

**Tamano estimado**: 3 sessions ejecutables (S3 compresion + S4 lazy-load + S5 pilot/close), aproximadamente 7-9h efectivas distribuidas. S4 (lazy-load) es la mas riesgosa por la propagacion DET-16. SP estimado: 8.

**Como vas a saber que funciona** (criterios de validacion observables, no tecnicos):

- Mido tokens del context base pre/post y veo reduccion ≥25% (target)
- Cierro 1 ticket pilot del backlog (ej. HOR-024) con las 2 piezas activas y los gates DKC siguen pasando sin regresion
- Abro un ticket cerrado con sesion comprimida en HC viewer y veo el summary inline + puedo click-to-expand al original sin error
- Ejecuto `dkc-validate-all horadric` post-cada-fase y obtengo exit 0

---

## Purpose

Reducir la presion de contexto del LLM ejecutor DKC mediante 2 mejoras coordinadas — compresion semantica de sessions y lazy-loading de steps — manteniendo enforcement completo de los DETs aplicables (especialmente DET-13 cierre con evidencia, DET-16 propagacion, DET-20 sessions con gate). Para un dev senior: este spec NO toca codigo de aplicacion fuera de `prompts/`, `templates/`, `commands/` y el MCP server `deckard-cain`, mas el parser/render de sessions en `horadric-cube`.

## Requirements

### REQ-IMPROVE-01: Compresion semantica de sessions al cerrar gate

> **Que cambia**: cuando cerras un `S{N}.GATE` con decision `continue` o `iterate`, el scribe genera un summary destilado (~200 tokens) que reemplaza la session full en `## Sessions` del ticket. El original queda preservado en `tickets/{id}.sessions/S{N}.md` y HC lo muestra como summary inline con click-to-expand.
> **Por que**: las sessions full ocupan 3-4K tokens cada una; en un ticket de 8 sessions (caso HOR-022) eso son ~25K solo en context de sessions cerradas. Comprimir libera ese budget para razonamiento activo.

El sistema MUST generar un summary de la session al cerrar `S{N}.GATE` con decision `continue` o `iterate`. El summary MUST preservar literal los siguientes campos: lista de TCs ejecutados (DET-25), discoveries criticos (D-prefixed), gate decision con su justificacion, failed approaches si existen, decisions tomadas (DEC-LOCAL-XX). El sistema MUST guardar la session original en `tickets/{TICKET-id}.sessions/S{N}.md` antes de reemplazar el bloque en el ticket markdown. El comando `dkc-compress-session {ticket} {N}` MUST ser idempotente — si la session ya esta comprimida, no-op + warning.

**Actor**: scribe (al cerrar gate) + dev (via comando standalone para compresion retroactiva)
**Layers**: backend (commands/), config (templates/)

<details><summary>Scenarios de validacion</summary>

#### Scenario: compresion al cerrar gate
- **GIVEN** ticket HOR-024 con session S3 lista para cerrar con decision `continue`
- **WHEN** scribe ejecuta el cierre del gate
- **THEN** session full original guardada en `tickets/HOR-024.sessions/S3.md`
- **AND** `## Sessions` del ticket markdown muestra summary ~200 tokens con TCs/discoveries/gate-decision literales
- **AND** HC viewer renderiza summary inline con boton expand-to-original

#### Scenario: compresion retroactiva idempotente
- **GIVEN** ticket HOR-046 con session S4 ya comprimida (preexistente)
- **WHEN** dev ejecuta `dkc-compress-session HOR-046 4` por segunda vez
- **THEN** comando detecta state comprimido + no-op
- **AND** warning visible "session ya comprimida — no-op"
- **AND** exit 0

#### Scenario: gate decision != continue/iterate no comprime
- **GIVEN** session S2 con gate decision `escalate` o `standby`
- **WHEN** scribe procesa el cierre
- **THEN** session NO se comprime (permanece full para inspeccion en escalamiento)
- **AND** `tickets/{id}.sessions/` no se crea para esa session

</details>

#### Acceptance
**El usuario puede verificar que funciona**: cierra un ticket pilot y revisa `## Sessions` — ve summaries en lugar de bloques full. Click en cualquier summary en HC abre modal con la version completa.

### REQ-IMPROVE-02: Lazy-loading de steps grandes via tool MCP

> **Que cambia**: los steps grandes (al menos `request-execute.md` 69.2K y `request-close.md` 38.8K) se split en archivos por fase (start, task-loop, session-gate, close-handoff). El LLM principal usa nuevo tool MCP `dkc_get_step_phase(step, phase)` para cargar solo la fase activa, ahorrando ~10K tokens por turno.
> **Por que**: hoy el step completo se carga en cada turno aunque el LLM esta en una fase puntual. Con split + lazy-load, cada turno carga 2-3K del step activo en lugar de ~13-19K.

El sistema MUST permitir split de un step grande en multiples archivos sin romper el flujo del workflow. El sistema MUST proveer tool MCP `dkc_get_step_phase(step_name: str, phase: str) -> {path, content}` que resuelve el archivo correcto. Las referencias cruzadas a steps (`prompts/steps/request-execute.md` y similares) en `commands/`, `templates/`, otros `prompts/steps/*.md`, MCP server, deben seguir resolviendo correctamente. El comando `dkc-validate-step-references` MUST detectar refs huerfanas y bloquear S4.GATE si encuentra >0.

**Actor**: LLM principal (via tool MCP) + dev (via comando de validacion)
**Layers**: backend (MCP server + commands/), config (templates/, prompts/)

<details><summary>Scenarios de validacion</summary>

#### Scenario: tool MCP resuelve fase
- **GIVEN** step `request-execute.md` split en `request-execute/{README,start,task-loop,session-gate,close-handoff}.md`
- **WHEN** LLM llama `dkc_get_step_phase('request-execute', 'task-loop')`
- **THEN** tool retorna `{path: 'prompts/steps/request-execute/task-loop.md', content: '...'}`
- **AND** content es < 3K tokens (vs ~19K del step monolitico)

#### Scenario: referencias cruzadas no se rompen
- **GIVEN** split aplicado a `request-execute.md` + `request-close.md`
- **WHEN** se ejecuta `commands/dkc-validate-step-references`
- **THEN** validator escanea `commands/`, `prompts/steps/*`, `templates/`, MCP server por refs a paths split-affected
- **AND** retorna exit 0 con reporte "0 refs huerfanas detectadas"
- **AND** si encuentra >0 refs huerfanas: exit 1 con reporte detallado (file:line + ref obsoleta + path nuevo sugerido)

#### Scenario: workflow ejecuta sin regression
- **GIVEN** split aplicado + tool MCP registrado
- **WHEN** dev arranca un ticket nuevo con `/dkc` y completa intake + design + execute + close
- **THEN** todos los pasos del workflow ejecutan correctamente
- **AND** ningun gate falla por step ref roto

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ejecuta un ticket pilot end-to-end (ej. HOR-024). Workflow corre sin errores; `dkc-validate-step-references` retorna 0 refs huerfanas.

### REQ-IMPROVE-03: Reduccion total context base ≥25%

> **Que cambia**: el context base actual (~83.7K tokens medidos) baja a ≤63K tras aplicar las 2 piezas combinadas. La medicion se hace empirica en S5 pilot sobre un ticket real.
> **Por que**: el objetivo de negocio del ticket. Sin medir, no hay forma de cerrar.

El sistema MUST permitir medir el context base pre/post con un comando reproducible (`commands/dkc-measure-context-base`). La reduccion total combinada de Pieza 2 + Pieza 3 MUST ser ≥25% del baseline medido en S1 (83.7K → ≤63K). Si la reduccion medida es <25%, el ticket NO cierra como done — se documenta en S5.T4 y se decide reabrir Pieza 1 como HOR-059c.

**Actor**: dev (via comando) + sistema (via mediciones automaticas)
**Layers**: backend (commands/)

<details><summary>Scenarios de validacion</summary>

#### Scenario: medicion baseline pre-implementacion
- **GIVEN** estado actual del sistema (pre-S3)
- **WHEN** dev ejecuta `dkc-measure-context-base`
- **THEN** comando retorna mapa archivo→tokens + total + delta vs medicion anterior
- **AND** baseline registrado en `## Regression` del ticket

#### Scenario: pilot exitoso
- **GIVEN** S3 + S4 cerradas + ticket pilot listo (S5)
- **WHEN** dev ejecuta `dkc-measure-context-base` post-implementacion
- **THEN** total medido ≤63K tokens (~25% reduccion vs 83.7K)
- **AND** delta reportado en `S5.T3` evidence

#### Scenario: pilot sub-target
- **GIVEN** medicion post-S5 retorna >63K
- **WHEN** dev evalua S5.T4
- **THEN** decision documentada: ¿reabrir HOR-059c (manifest LLM principal)? ¿aceptar el delta logrado?
- **AND** si reabre: crear HOR-059c con frontmatter `parent: HOR-059` + cerrar HOR-059 con razon explicita

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ejecuta `dkc-measure-context-base` antes y despues. Ve numeros concretos y un delta % al cierre.

### REQ-PRESERVE-01: Workflow DKC ejecuta sin regression

> **Que cambia**: cero — ningun comportamiento del workflow cambia post-implementacion. Todos los DETs siguen aplicables, todos los gates siguen pasando.
> **Por que**: la mejora es transparente al ejecutor. Si introduces regression, el ticket no sirve.

El sistema MUST mantener todos los DETs vigentes operativos post-implementacion. `commands/dkc-validate-all horadric` MUST retornar exit 0 tras cada session execute (S3.GATE, S4.GATE, S5.GATE). Ningun ticket abierto pre-existing MUST cambiar su shape, y el workflow `/dkc` MUST ejecutar end-to-end sin nuevos errores.

**Actor**: system
**Layers**: meta

#### Acceptance
**El usuario puede verificar que funciona**: ejecuta `dkc-validate-all horadric` y obtiene exit 0; abre 2-3 tickets cerrados pre-HOR-059 y se renderizan en HC sin error.

### REQ-PRESERVE-02: Tickets cerrados pre-HOR-059 siguen renderizables sin migracion

> **Que cambia**: nada para tickets historicos. HC parser distingue sessions full (legacy) de sessions summary (nuevas).
> **Por que**: migrar 50+ tickets cerrados retroactivamente es trabajo masivo sin ROI. Mejor coexistir.

El HC parser (`horadric-cube/server/deckard/sessions.ts`) MUST aceptar 2 shapes de session: full (legacy) y summary (nuevo). Ningun ticket cerrado pre-HOR-059 MUST requerir migracion manual. El componente Vue render MUST detectar el shape y renderizar acorde.

**Actor**: HC viewer
**Layers**: frontend, backend (parser HC)

#### Acceptance
**El usuario puede verificar que funciona**: abre HOR-022 (pre-HOR-059, full sessions) en HC y se renderiza igual que hoy.

### REQ-REGRESSION-01: dkc-validate global pasa post-cada-fase

> **Que cambia**: gate de validacion explicito en cada session execute.
> **Por que**: detectar regresion estructural temprano (validators de zod, FTS, embeddings, status coherence, etc.).

El sistema MUST pasar `commands/dkc-validate-all horadric` con exit 0 al cierre de cada gate execute (S3.GATE, S4.GATE, S5.GATE). Si falla: gate va a `iterate`, no `continue`.

**Actor**: reviewer (en gate D)
**Layers**: backend (commands/)

#### Acceptance
**El usuario puede verificar que funciona**: `cd /Users/edobacon/Workspace/deckard && ./commands/dkc-validate-all horadric` retorna exit 0 al final de cada session execute.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | Tool MCP `dkc_get_step_phase` latencia | p95 ms | < 50ms (read filesystem) |
| Performance | Generacion de summary de session | tokens del summary | ~200 (rango 150-300) |
| Scale | Tickets con sessions multiples comprimidas | sessions/ticket | hasta 15 sin degradacion |

## Artifacts

### Files modified / created

| Path | Type | Que cambia |
|------|------|------------|
| `prompts/steps/request-execute.md` | split | Se split en `request-execute/{README, start, task-loop, session-gate, close-handoff}.md` |
| `prompts/steps/request-close.md` | split | Se split en `request-close/{README, gates, persistence, close-final}.md` |
| `commands/dkc-compress-session` | new | Comando standalone para comprimir session especifica |
| `commands/dkc-measure-context-base` | new | Mide tokens del context base reproducible |
| `commands/dkc-validate-step-references` | new | Detecta refs huerfanas post-split |
| `templates/records/ticket.md` | modify | Agregar shape del summary block en seccion `## Sessions` |
| `prompts/agents/scribe.md` | modify | Documentar paso de compresion al cerrar gate |
| `prompts/steps/request-execute/session-gate.md` | new | (post-split) integra la generacion del summary en el gate |
| `server/deckard-cain/...` | modify | MCP tool `dkc_get_step_phase` registrado |
| `horadric-cube/server/deckard/sessions.ts` | modify | Parser distingue full vs summary |
| `horadric-cube/src/components/ticket-sections/SectionSessions.vue` | modify | Render summary inline con click-to-expand (reusar SessionDetailModal de HOR-058) |

## Tasks

> **Plan de sessions**: 3 sessions execute (S3, S4, S5) tras S1 (intake) + S2 (design, este spec). Numeracion continua del plan del ticket. DET-20 aplica.

### Session 3 — Compresion semantica de sessions [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Schema del summary + template en ticket markdown | REQ-IMPROVE-01 | developer | — | `templates/records/ticket.md` | lint + lectura visual | git revert | DET-2, DET-13, DET-25 | pending | 3 |
| S3.T2 | Scribe en gate cierra session: generar summary y mover original a `.sessions/` | REQ-IMPROVE-01 | developer | S3.T1 | `prompts/agents/scribe.md`, `prompts/steps/request-execute.md` (session-gate.md post-split) | manual test con 1 ticket dummy | git revert + restaurar session full | DET-13, DET-20, DET-23 | pending | 3 |
| S3.T3 | Comando standalone `dkc-compress-session {ticket} {N}` (idempotente) | REQ-IMPROVE-01 | developer | S3.T1 | `commands/dkc-compress-session` | test manual con HOR-046 | git revert | DET-8 | pending | 3 |
| S3.T4 | Crear subdir `tickets/{id}.sessions/` + migracion automatica al primer cierre | REQ-IMPROVE-01 | developer | S3.T2 | `commands/dkc-compress-session`, MCP server file ops | manual + dkc-validate global | rm -rf `.sessions/` + restaurar | DET-8, DET-16 | pending | 3 |
| S3.T5 | HC parser `sessions.ts` distingue full vs summary | REQ-PRESERVE-02 | developer | S3.T1 | `horadric-cube/server/deckard/sessions.ts` | vitest server suite | git revert | DET-16 | pending | 3 |
| S3.T6 | HC render summary inline + reusar SessionDetailModal (HOR-058) para expand | REQ-IMPROVE-01, REQ-PRESERVE-02 | developer | S3.T5 | `horadric-cube/src/components/ticket-sections/SectionSessions.vue` | vitest unit + smoke manual UI | git revert | DET-16 | pending | 3 |
| S3.T7 | Validacion empirica con 5 tickets (HOR-022, HOR-046, HOR-055, HOR-056, HOR-040) | REQ-IMPROVE-01, REQ-PRESERVE-04 (en ticket: preservar info critica) | reviewer | S3.T2, S3.T3, S3.T6 | tickets reales | dev valida calidad de cada summary contra session original | `dkc-compress-session --revert` (a implementar si emerge) | DET-7, DET-13, DET-25 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2)** — persistir resultados en `## Sessions` del ticket + dkc-validate global + DET-23 quality review (light/standard) | — | reviewer | S3.T1..S3.T7 | ticket | gate persistido + decision documentada | (no aplica) | DET-20, DET-23 | pending | 3 |

### Session 4 — Lazy-loading de steps [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Decision: split solo 2 mas grandes (request-execute + request-close) vs los 5. Documentar en DEC-LOCAL-01 | REQ-IMPROVE-02 | architect | S3.GATE | spec markdown | dev confirma decision | revertir decision en spec | DET-1, DET-14 | pending | 4 |
| S4.T2 | Split `request-execute.md` en `request-execute/{README, start, task-loop, session-gate, close-handoff}.md` | REQ-IMPROVE-02 | developer | S4.T1 | `prompts/steps/request-execute.md` + nuevo dir | manual + grep refs | git revert | DET-16 | pending | 4 |
| S4.T3 | Split `request-close.md` en sub-archivos | REQ-IMPROVE-02 | developer | S4.T1 | `prompts/steps/request-close.md` + nuevo dir | manual + grep refs | git revert | DET-16 | pending | 4 |
| S4.T4 | (si S4.T1 = los 5) Split `intake-explore.md`, `_design-shared.md`, `request-intake.md` | REQ-IMPROVE-02 | developer | S4.T1 | 3 archivos + nuevos dirs | manual + grep refs | git revert | DET-16 | pending | 4 |
| S4.T5 | Tool MCP `dkc_get_step_phase(step_name, phase)` registrado en deckard-cain | REQ-IMPROVE-02 | developer | S4.T2, S4.T3 | server `deckard-cain` | test del tool via MCP + smoke | git revert + unregister tool | DET-8, DET-10 | pending | 4 |
| S4.T6 | Actualizar referencias en `commands/`, otros `prompts/steps/*`, `templates/`, MCP server, otros sitios | REQ-IMPROVE-02, REQ-PRESERVE-01 | developer | S4.T2..S4.T4 | multiples archivos del repo | grep masivo + `dkc-validate-step-references` | git revert masivo | DET-16 | pending | 4 |
| S4.T7 | Crear `commands/dkc-validate-step-references` — detector de refs huerfanas | REQ-IMPROVE-02, REQ-PRESERVE-01 | developer | S4.T6 | nuevo command | exit 0 sobre el repo post-S4.T6 | git revert | DET-8 | pending | 4 |
| S4.T8 | Grep masivo DET-16 propagation check final | REQ-PRESERVE-01 | reviewer | S4.T7 | repo entero | `dkc-validate-step-references` exit 0 + manual sanity check | escalate a iterate si refs huerfanas | DET-16 | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T3)** — regression completa: `dkc-validate-all horadric` + workflow end-to-end smoke + DET-23 exhaustive | — | reviewer | S4.T1..S4.T8 | ticket | gate persistido + decision documentada | (no aplica) | DET-20, DET-23 | pending | 4 |

### Session 5 — Pilot empirico + close [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Crear `commands/dkc-measure-context-base` (tokenizer reproducible) | REQ-IMPROVE-03 | developer | S4.GATE | nuevo command | smoke con archivos conocidos | git revert | DET-8 | pending | 5 |
| S5.T2 | Eleccion ticket pilot — sugerencia HOR-024 (async tasks paralelas, alcance acotado) | REQ-IMPROVE-03 | architect | S5.T1 | spec markdown | dev confirma eleccion | revertir decision | DET-14 | pending | 5 |
| S5.T3 | Ejecutar pilot end-to-end con metrics pre/post | REQ-IMPROVE-03 | developer | S5.T2 | ticket pilot real | medicion empirica + workflow ejecuta sin errores | (no aplica) | DET-13, DET-15 | pending | 5 |
| S5.T4 | Decision sobre reabrir Pieza 1 (HOR-059c manifest DET): solo si delta medido <25% | REQ-IMPROVE-03 | architect | S5.T3 | spec + posible ticket nuevo | dev aprueba decision | crear/no crear HOR-059c | DET-1, DET-14, DET-16 | pending | 5 |
| S5.T5 | Generar teach-close (DET-22) + Summary + learns refinados | — | scribe | S5.T4 | `tickets/HOR-059.teach/teach-close.md` + ticket | bloques `dkc:*` validan | (no aplica) | DET-22 | pending | 5 |
| S5.T6 | Frontmatter close (`status: closed`, `closed: 2026-XX-XX`, `story_points.executed`, `executed_method`) | — | scribe | S5.T5 | ticket frontmatter | dkc-validate global pass | revertir frontmatter | DET-26 | pending | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T3)** — pilot exitoso + DET-23 exhaustive + close ticket | — | reviewer | S5.T1..S5.T6 | ticket | gate persistido + status: closed | (no aplica) | DET-20, DET-22, DET-23 | pending | 5 |

## Constraints

- **DET-13** (cierre con evidencia): el summary de session MUST preservar TCs/discoveries/gate-decision literales — sino el ticket no cumple DET-13 al cerrar
- **DET-16** (propagacion): el split de steps tiene alto riesgo — `dkc-validate-step-references` es la mitigacion obligatoria
- **DET-20** (sessions con gate): la generacion del summary se integra al gate `S{N}.GATE` existente, no es un paso aparte
- **DET-22** (teach-close): S5.T5 produce teach-close.md como sub-paso del cierre
- **DET-23** (quality review): S3.GATE y S4.GATE corren quality review con tier acorde (standard/exhaustive)
- **DET-25** (TCs inline en session): el summary preserva la tabla de TCs ejecutados literal
- **DET-26** (Story points tracking): S5.T6 setea `story_points.executed` con `executed_method: sessions-heuristic`
- **DET-27** (commits por session): cada session execute commitea su trabajo separado por tipo (feat/test/docs/chore)
- **DET-28** (tasks del spec al ticket): al iniciar S3/S4/S5, dev/LLM copia las tasks del spec al ticket markdown como `[ ]` unchecked
- **DET-29** (persistencia in-flight): cada transicion de task usa `dkc-execute-task start-task / done-task`

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| HOR-058 SessionDetailModal | internal | Componente Vue3 ya cerrado disponible para reuso en S3.T6 | low — verificable rapido en S3.T5 |
| HOR-031 dkc_semantic_search | internal | No dependencia directa, pero el refactor a HOR-059b lo asume cubriendo Pieza 1 indirecto | none — ya cerrado |
| MCP server `deckard-cain` | internal | S4.T5 registra nuevo tool `dkc_get_step_phase` | low — pattern conocido de HOR-031 |
| Ticket pilot (S5.T2, sugerencia HOR-024) | internal | Necesario para validacion empirica | low — multiples opciones de backlog |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| H3: summary pierde info critica (TCs/discoveries/gate) | medium | high | Schema explicito en S3.T1 + validacion empirica con 5 tickets en S3.T7 + OK del dev antes de GA |
| H4: lazy-load rompe DET-16 (refs huerfanas) | medium | high | `dkc-validate-step-references` obligatorio + grep masivo + S4.T8 reviewer revisa antes del gate |
| Delta pilot <25% (no se alcanza target) | medium | medium | S5.T4 decision documentada — reabrir HOR-059c o aceptar el delta logrado. NO bloquea cierre |
| HC parser no soporta summary mixto | low | medium | S3.T5 inspecciona SessionDetailModal antes — fallback pattern propio si no reusable |
| Modelo local target no validado en S5 | low | low | Conservadora 128K es robusta. Si dev tiene modelo, mide en S5 |
| Sessions cerradas pre-HOR-059 se rompen en HC | low | high | REQ-PRESERVE-02 + S3.T5 explicito + smoke en HC con HOR-022 pre-fix |

## Open questions

- [ ] S4.T1: ¿split solo 2 (request-execute + request-close) o los 5 grandes? — Recomendado: empezar con 2 y evaluar ROI en S5 antes de comprometer los otros 3
- [ ] S5.T4: ¿threshold exacto del delta para reabrir HOR-059c? — Propuesta: <25% reabre; 25-30% acepta; >30% no se necesita follow-up

## Decisions

### DEC-LOCAL-01: Modelo local target asumido conservador 128K efectivo
- **Contexto**: H5 del intake — sin modelo target confirmado por dev al cierre S1, el efectivo real es especulativo
- **Drivers**: cubrir el peor caso (cualquier modelo open weights 2025); reversibilidad (Pieza 3 mantiene ROI en 128K)
- **Opcion elegida**: 128K efectivo conservador
- **Alternativas**: 256K efectivo optimista (requeriria modelo confirmado — no disponible)
- **Consecuencias**: gana robustez del plan; pierde optimizacion si modelo real >200K (en cuyo caso Pieza 3 es marginal pero no daniña)
- **Session**: 1 (intake-explore S1)

### DEC-LOCAL-02: Split solo 2 mas grandes (request-execute + request-close)
- **Contexto**: Pieza 3 puede limitarse a los 2 mas grandes (request-execute 69.2K + request-close 38.8K) o cubrir 5 (+ _design-shared 23.2K + intake-explore 21.6K + request-intake 21.3K)
- **Drivers**: ROI por unidad de trabajo (los 2 mas grandes = 62% del payload, presentes en sessions de mayor frecuencia 3-5 execute/ticket vs 1 intake/ticket); riesgo DET-16 escala exponencial con N refs cruzadas a mover
- **Opcion elegida**: split 2 (request-execute + request-close)
- **Alternativas**:
  - Split 5: +38% ahorro marginal pero solo en sessions intake (1/ticket); 2-3x mas refs a actualizar (~25-40 archivos en commands/, otros steps, MCP server, templates); riesgo DET-16 medio
  - Split 0 (no implementar Pieza 3): contradice el objetivo del refactor HOR-059b
- **Consecuencias**: gana Pareto 80/20 + minimiza surface DET-16; ahorro estimado ~16K/turno en sessions execute + ~7.5K/turno en sessions close; pierde ~3K/turno en sessions intake — aceptable
- **Reversibilidad**: si pilot S5 mide delta <25%, abrir HOR-059c con split de los 3 restantes como follow-up acotado (~3 SP)
- **Session**: 4 (S4.T1, 2026-05-24)

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Context base total (DETs + _style + 5 steps grandes) | 83.7K tokens | ≤63K tokens | `dkc-measure-context-base` (S5.T1) |
| Costo por ticket con Claude | $4-8 | $2-4 | factura mensual / tickets cerrados |
| Step activo cargado en cada turno | ~13-19K tokens (request-execute monolitico) | ~2-3K tokens (lazy-load fase activa) | trace de llamadas MCP `dkc_get_step_phase` |
| Tiempo de prefill (proxy de cost en local) | n/a baseline | -40% en local lento | medicion in-tool en S5 (opcional) |

## Technical reference

### Schema del summary de session (S3.T1)

```yaml
summary_version: "1.0"
session_number: {N}
session_objective: "{copiado del header de la session original}"
phase: intake | execute
tier: T0 | T1 | T2 | T3
gate_type: auto | strong
gate_decision: continue | iterate | escalate | standby
gate_decision_reason: "{razon del cierre — preservada literal}"
tasks_completed:
  - "{S{N}.T1: copia literal del checkbox + descripcion}"
  - "{S{N}.T2: ...}"
discoveries:
  - "D1 ({date}): {finding literal}"
test_cases_executed:
  - "{TC-X: status + evidence path — copia literal de la fila}"
failed_approaches:
  - "{approach: razon de fallo}"  # vacio si no hay
decisions_taken:
  - "DEC-LOCAL-{N}: {titulo}"
quality_review_result: pass | iterate | escalate
links:
  full_session_path: "tickets/{TICKET-id}.sessions/S{N}.md"
```

### Split de `request-execute.md` (S4.T2 — propuesta)

```
prompts/steps/request-execute/
├── README.md          # Entry point + navigation map (~50 lineas, ~1K tokens)
├── start.md           # Init-ticket + open-session + gates pre-task (~100 lineas, ~2.5K)
├── task-loop.md       # Ciclo A/B/C/D per task (~180 lineas, ~5K)
├── session-gate.md    # S{N}.GATE close + DET-20 + DET-23 + summary generation (~140 lineas, ~3.5K)
└── close-handoff.md   # Transicion a request-close + persistencia commits (~60 lineas, ~1.5K)
```

Total split: ~13.5K tokens distribuidos. Por turno, LLM carga README + fase activa = ~2-3.5K vs 19K monolitico.

## Rules discovered

{Se llena durante ejecucion.}

## Bugs found

{Se llena si se descubren problemas.}

## Acceptance checkpoints

- [ ] **Funcional**: REQ-IMPROVE-01/02/03 scenarios pasan en S5 pilot
- [ ] **Tests**: TCs registrados inline en cada session execute (DET-25) — actual llenado, no `—`
- [ ] **NFRs**: latencia tool MCP <50ms p95, summary 150-300 tokens, sessions/ticket hasta 15
- [ ] **Rules**: DETs aplicables todos pasan post-cada-fase
- [ ] **Integration**: `dkc-validate-all horadric` exit 0 + workflow `/dkc` end-to-end smoke OK
- [ ] **Docs**: scribe.md + ticket.md template actualizados + teach-close producido (DET-22)

## Archiving

Spec activa hasta cierre del ticket HOR-059. Si pilot S5 mide delta <25% y dev reabre HOR-059c, esta spec NO se archiva — queda como referencia historica de Piezas 2 + 3 implementadas. HOR-059c tendria spec propio.
