---
id: SPEC-workflow-tactic-work-type-67
project: horadric
ticket: HOR-067
status: done
---

# work_type tactic — path corto con registro compatible con rieles estandar

# work_type tactic — path corto con registro compatible con rieles estandar

## Executive summary — lo que estas aprobando

> *Esta seccion esta disenada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Artifacts, Tasks). Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: agregar un nuevo `work_type: tactic` al sistema DKC como path intermedio entre `quick` (sin ticket, sin record) y los full-path (intake + teach + design + execute + close con todos los gates). Tactic produce ticket minimo con 5 secciones esenciales (Request + KB consulted + Discoveries/decisions + Commits + Summary) sin spec, sin teach-intake/teach-close, sin gates pesados, single-session implicita. Invocacion explicita por el dev via `/dkc tactic <peticion>`.

**Decisiones criticas que necesitan tu OK** (cada una con racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Template separado (`ticket-tactic.md`) vs declarativo: **elegido separado** (DEC-LOCAL-01) | Claridad + alinea con patron del repo (1 archivo por tipo). Frontmatter duplicado es minimo |
| 2 | Tabla DETs aplicables en `tactic-execute.md` vs `deterministic-rules.md`: **elegido in-step** (DEC-LOCAL-02) | DRY + no infla deterministic-rules.md (HOR-059 ataco eso). Tabla in-context del propio step |
| 3 | Numeracion sessions: **`Session 1 [phase: tactic]` implicita** (DEC-LOCAL-03) | Preserva compat MAX con HC parser sessions.ts existente (cuenta sessions, valida shape) |

**Riesgos principales y como los mitigamos**:

- **Regresion en tickets full-path al extender enums** → cada extension (validator + MCP + HC) tiene su propio test de regresion en S3.T6 + S4.T6 sobre tickets full-path existentes (5 random + suite completa)
- **HC viewer no renderiza correctamente tickets tactic** → S4.T2 smoke manual UI con ticket tactic real antes del pilot
- **Pilot empirico revela necesidad de mas secciones** → permitido iterar el template en S4.T5 si emerge gap; H2 esta en `partial` justamente para validar empirico

**Que NO se hace en este ticket** (limites explicitos del scope):

- Modificar comportamiento de `work_type: quick` existente
- Clasificacion automatica de intencion para tactic (descartada por imprevisibilidad)
- Retroactividad: NO convertir tickets full-path existentes a tactic
- Conversion automatica entre work_types mid-ejecucion (escalamiento es manual: nuevo ticket full-path + cerrar tactic como `superseded`)
- Cambios en CLI/IDE plugins externos (solo DKC core + HC viewer)

**Tamano estimado**: 3 sessions ejecutables (S3 core + S4 HC+pilot + S5 close), aproximadamente 5-7h efectivas distribuidas. SP estimado: 5.

**Como vas a saber que funciona** (criterios de validacion observables, no tecnicos):

- Ejecuto `/dkc tactic fix typo en algun .md` y obtengo un ticket HOR-NNN creado en <5min con record completo
- Abro el ticket tactic en HC viewer y veo render correcto (flow simplificado, secciones esperadas)
- Ejecuto `dkc-validate Ticket` sobre el tactic y sobre 5 tickets full-path random — los 6 pasan sin errors
- Corro tests MCP server (`server/tests/`) y tests HC (`horadric-cube/`) — 0 regresiones

---

## Purpose

Cerrar el gap operacional entre `work_type: quick` (sin record) y full-path (con todo el overhead) mediante un nuevo `work_type: tactic` que produce ticket minimo trazable, sin spec, sin teach docs, sin gates pesados. Para un dev senior: este spec NO toca codigo de aplicacion fuera de `prompts/`, `templates/`, `commands/`, MCP server `deckard-cain`, y horadric-cube (parser + flowInference + types). Compatibilidad con los rieles existentes es requirement explicito — sin migracion ni branching de tools.

## Requirements

### REQ-IMPROVE-01: Nuevo `work_type: tactic` reconocido por el sistema

> **Que cambia**: el sistema DKC reconoce un nuevo `work_type: tactic` en frontmatter de tickets, en el routing del MCP server, en el validator zod del ticket, en el WorkType type del HC viewer y en el blueprint del flow.
> **Por que**: sin el work_type formal, no hay clasificacion ni routing — el dev no puede invocar `/dkc tactic ...` ni el sistema producir ticket tactic.

El sistema MUST extender `TicketWorkTypeEnum` en `commands/lib/schemas/ticket.ts` para incluir `'tactic'`. El sistema MUST extender el enum `work_type` + sequence steps en `server/src/deckard_cain/tools/project.py` con `tactic: [tactic-execute.md]`. El sistema MUST extender el `WorkType` union en `horadric-cube/shared/types.ts` para incluir `'tactic'`. El sistema MUST proveer un blueprint nuevo en `horadric-cube/server/deckard/workflow.ts` para `tactic` (1-2 nodos: `tactic-execute` y opcionalmente `closed`). Ninguna de estas extensiones MUST romper los work_types existentes (`implement`, `fix`, `improvement`, `refactor`, `explore`, `query`, `quick`).

**Actor**: dev (invocacion) + sistema (routing + validacion)
**Layers**: backend (validators + MCP + HC server), config (shared/types.ts)

<details><summary>Scenarios de validacion</summary>

#### Scenario: validator acepta tactic
- **GIVEN** ticket con frontmatter `work_type: tactic` valido
- **WHEN** dev ejecuta `dkc-validate Ticket {path}`
- **THEN** retorna `valid: true` con 0 errors
- **AND** validator sigue retornando valid sobre tickets full-path existentes

#### Scenario: MCP server enruta tactic
- **GIVEN** server MCP `deckard-cain` reload
- **WHEN** invoca `dkc_get_workflow_for_work_type('tactic')`
- **THEN** retorna sequence `[tactic-execute.md]` (1 solo step)
- **AND** workflow existente para otros work_types NO cambia

#### Scenario: HC blueprint
- **GIVEN** ticket tactic abierto en HC
- **WHEN** flowInference resuelve nodos
- **THEN** retorna blueprint con `[tactic-execute, closed]` (o `[tactic-execute]` solo)
- **AND** render funciona sin error

</details>

#### Acceptance
**El usuario puede verificar que funciona**: crea un ticket tactic manualmente, ejecuta `dkc-validate Ticket`, ve `valid: true`. Abre HC viewer y ve el ticket renderizado.

### REQ-IMPROVE-02: Step `tactic-execute.md` + template `ticket-tactic.md`

> **Que cambia**: nuevo step en `prompts/steps/tactic-execute.md` que cubre el flujo completo de tactic (request → KB lookup → ejecucion → commits → summary) en un solo archivo. Nuevo template en `templates/records/ticket-tactic.md` con shape minimo de 5 secciones.
> **Por que**: el dev necesita un step que el LLM lea cuando se invoca `/dkc tactic ...`. El template asegura shape canonical reproducible.

El sistema MUST proveer `prompts/steps/tactic-execute.md` como single step que cubre todo el flujo de tactic. El step MUST incluir: (a) seccion de KB lookup obligatorio (DET-11) consultando rules/bugs/specs del modulo; (b) instrucciones de ejecucion con respeto a DET-3 (request inmutable), DET-13 (cierre con evidencia), DET-16 (propagacion); (c) instrucciones para commits con prefijo `TICKET-id-tactic` (DET-19 + DET-27); (d) tabla in-step de DETs aplicables a tactic (DEC-LOCAL-02); (e) politica de escalamiento si tactic crece mid-ejecucion (crear ticket nuevo full-path + cerrar tactic como `closed_reason: superseded`).

El sistema MUST proveer `templates/records/ticket-tactic.md` con el shape canonical de 5 secciones esenciales: `## Request`, `## KB consulted`, `## Discoveries / decisions`, `## Commits`, `## Summary` (+ `### Session 1 [phase: tactic]` implicita segun DEC-LOCAL-03 dentro de `## Sessions`).

**Actor**: LLM (consume step) + dev (consume template via /dkc tactic)
**Layers**: prompts, templates

<details><summary>Scenarios de validacion</summary>

#### Scenario: step legible y completo
- **GIVEN** `prompts/steps/tactic-execute.md` existe
- **WHEN** LLM lo lee al recibir `/dkc tactic ...`
- **THEN** el step cubre todo el flujo sin requerir leer otros steps (excepto reads declarativos del frontmatter)

#### Scenario: template reproduce shape esperado
- **GIVEN** dev ejecuta `/dkc tactic fix typo`
- **WHEN** sistema produce el ticket
- **THEN** el ticket tiene exactamente las 5 secciones esenciales + Session 1 implicita
- **AND** frontmatter shape comun (id, project, module, work_type: tactic, status, etc.)

#### Scenario: DETs in-step
- **GIVEN** step tactic-execute.md
- **WHEN** dev consulta "que DETs aplican a tactic"
- **THEN** la tabla esta dentro del propio step (al final como referencia)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: lee `prompts/steps/tactic-execute.md` y entiende el flujo completo sin saltar a otros archivos. Crea un tactic siguiendo el step y produce ticket valido.

### REQ-IMPROVE-03: HC viewer renderiza tickets tactic via blueprint nuevo

> **Que cambia**: HC viewer (`horadric-cube/server/deckard/`) reconoce `work_type: tactic` y renderiza con flow simplificado. Parser body.ts y TicketFilters.vue funcionan automatico por su naturaleza declarativa.
> **Por que**: sin render correcto, el dev no puede inspeccionar tactic en HC — pierde la visibilidad operativa que justifica DKC.

El sistema MUST extender `horadric-cube/shared/types.ts` para que `WorkType` incluya `'tactic'`. El sistema MUST agregar blueprint para `tactic` en `horadric-cube/server/deckard/workflow.ts` (`getFlowBlueprint('tactic')`) con shape simplificado (1-2 nodos). El HC parser body.ts NO requiere cambios (es declarativo, parsea secciones que existen). HC TicketFilters.vue NO requiere cambios (workTypes dinamicos via `uniqueSorted`).

**Actor**: HC viewer
**Layers**: backend (HC server), shared (types)

<details><summary>Scenarios de validacion</summary>

#### Scenario: blueprint resuelve sin error
- **GIVEN** ticket tactic existe
- **WHEN** flowInference se invoca con `workType: 'tactic'`
- **THEN** retorna blueprint valido (no null, no throw)
- **AND** nodos esperados: `tactic-execute` y opcionalmente `closed`

#### Scenario: render manual smoke
- **GIVEN** HC dev-server up + 1 ticket tactic creado
- **WHEN** dev navega a `http://localhost:3016/projects/horadric/tickets/HOR-NNN`
- **THEN** render sin error en consola
- **AND** flow simplificado visible (no 8 nodos de full-path)
- **AND** secciones esperadas (Request, KB consulted, etc.) renderizadas

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre `http://localhost:3016/projects/horadric/tickets/HOR-NNN` (tactic) en HC y ve flow simplificado + secciones esperadas sin errores.

### REQ-PRESERVE-01: Rieles de tickets full-path sin regresion

> **Que cambia**: cero — ningun comportamiento de tickets full-path cambia post-implementacion.
> **Por que**: si la introduccion de tactic rompe full-path, el ticket no sirve (Request del HOR-067 lo marca como requirement explicito).

El sistema MUST mantener todos los tickets full-path existentes (`implement`, `fix`, `improvement`, `refactor`, `explore`) validables con `dkc-validate Ticket` sin cambios. El sistema MUST mantener todos los tests existentes pasando (server/tests + horadric-cube/server + horadric-cube/src). El validator schema MUST NO introducir union types ni branching que afecte la validacion de tickets existentes — solo extender el enum (extension aditiva, no breaking).

**Actor**: system
**Layers**: meta

<details><summary>Scenarios de validacion</summary>

#### Scenario: tickets full-path validan post-implementacion
- **GIVEN** 5 tickets full-path random del repo (ej. HOR-001, HOR-022, HOR-046, HOR-055, HOR-059)
- **WHEN** dev ejecuta `dkc-validate Ticket {path}` sobre cada uno
- **THEN** los 5 retornan `valid: true` con 0 errors
- **AND** ningun warning nuevo introducido por la extension del enum

#### Scenario: tests existentes pasan
- **GIVEN** post-implementacion en main
- **WHEN** se corren todas las suites: server/tests/, horadric-cube/server/, horadric-cube/src/
- **THEN** 0 tests fallan
- **AND** 0 nuevos warnings/errors

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ejecuta `for t in $(ls projects/horadric/tickets/HOR-0{0,1,2,3,4,5,6}*.md | shuf | head -5); do dkc-validate Ticket $t; done` y obtiene 5x `valid: true`. Tests MCP server + HC pasan.

### REQ-PRESERVE-02: `work_type: quick` sin cambios

> **Que cambia**: cero — quick path mantiene su comportamiento actual (Triage 5/5 → ejecutar directo sin ticket).
> **Por que**: tactic es path NUEVO, no reemplazo de quick. Ambos coexisten.

El sistema MUST mantener el flujo de `work_type: quick` definido en `prompts/steps/request-intake.md` paso 2a sin cambios. El sistema MUST documentar en `prompts/workflows/request.md` la diferencia explicita entre quick (sin record) y tactic (con record minimo).

**Actor**: dev (lee docs)
**Layers**: docs

#### Acceptance
**El usuario puede verificar que funciona**: lee `prompts/workflows/request.md` y ve tabla con 3 paths cortos: quick (sin record), tactic (record minimo), query (sin record, solo respuesta). Cada uno con su criterio de invocacion.

### REQ-REGRESSION-01: Validators + tests + reindex sin regresion

> **Que cambia**: gate de validacion explicito al cierre de cada session execute.
> **Por que**: detectar regresion estructural temprano.

El sistema MUST pasar `commands/dkc-validate Ticket` con exit 0 sobre 5 tickets full-path random + tactic ejemplo, al cierre de cada gate execute (S3.GATE, S4.GATE). Tests MCP server (`server/tests/`) MUST pasar (14/14 baseline post-HOR-059). Tests HC (`horadric-cube/`) MUST pasar (baseline a registrar en S3.T6). Reindex (`dkc-reindex horadric`) MUST completar sin error y incluir el ticket tactic en los records contados.

**Actor**: reviewer (en gates)
**Layers**: backend (commands/), tests

#### Acceptance
**El usuario puede verificar que funciona**: `dkc-validate Ticket` + suites MCP + HC suites retornan exit 0 al final de cada session execute.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Productivity | Tiempo de creacion de ticket tactic | minutos | <5 min (vs ~30-60min full-path) |
| Productivity | Lineas de ticket tactic tipico | lineas markdown | <60 (vs >300 full-path) |
| Compatibility | Tickets full-path validan | regresion count | 0 errors nuevos |
| Performance | dkc-validate Ticket sobre tactic | p95 ms | < 200ms (mismo orden que full-path) |

## Artifacts

### Files modified / created

| Path | Type | Que cambia |
|------|------|------------|
| `commands/lib/schemas/ticket.ts` | modify | Extender `TicketWorkTypeEnum` con `'tactic'` (linea 73-81) |
| `server/src/deckard_cain/tools/project.py` | modify | Extender enum work_type + sequence `tactic: [tactic-execute.md]` (lineas 80-200 aprox) |
| `horadric-cube/shared/types.ts` | modify | Extender `WorkType` union con `'tactic'` |
| `horadric-cube/server/deckard/workflow.ts` | modify | Agregar blueprint para `tactic` (1-2 nodos) |
| `prompts/steps/tactic-execute.md` | new | Single step con KB lookup + ejecucion + commits + summary + tabla DETs aplicables |
| `templates/records/ticket-tactic.md` | new | Template canonical del ticket tactic con 5 secciones esenciales |
| `commands/dkc.md` | modify | Agregar fila en tabla de intenciones para trigger `tactic` |
| `prompts/workflows/request.md` | modify | Documentar tactic + tabla diferencias quick vs tactic vs query |
| `prompts/deterministic-rules.md` | NO modify | DEC-LOCAL-02 elige in-step; no se infla deterministic-rules.md |

## Tasks

> **Plan de sessions**: 3 sessions execute (S3, S4, S5) tras S1 (intake, done) + S2 (design, en curso). Numeracion continua del plan del ticket. DET-20 aplica.

### Session 3 — Core implementation (validators + MCP + step + template) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Extender `TicketWorkTypeEnum` con `'tactic'` + extender `WorkType` union en shared/types.ts | REQ-IMPROVE-01 | developer | — | `commands/lib/schemas/ticket.ts`, `horadric-cube/shared/types.ts` | `dkc-validate Ticket` sobre 5 full-path random pasa | git revert | DET-3, DET-16 | pending | 3 |
| S3.T2 | Extender MCP server routing: enum work_type + sequence `tactic: [tactic-execute.md]` | REQ-IMPROVE-01 | developer | S3.T1 | `server/src/deckard_cain/tools/project.py` | smoke `dkc_get_workflow_for_work_type('tactic')` retorna sequence | git revert | DET-16 | pending | 3 |
| S3.T3 | Crear `prompts/steps/tactic-execute.md` (single step con KB lookup + execucion + commits + summary + tabla DETs aplicables in-step) | REQ-IMPROVE-02 | developer | S3.T1 | `prompts/steps/tactic-execute.md` (new) | lint + lectura visual + LLM smoke (puedo leerlo sin saltar a otros archivos?) | git revert | DET-2, DET-11, DET-13, DET-16 | pending | 3 |
| S3.T4 | Crear `templates/records/ticket-tactic.md` (shape canonical: Request + KB consulted + Discoveries/decisions + Commits + Summary + Session 1 [phase: tactic] implicita) | REQ-IMPROVE-02 | developer | S3.T3 | `templates/records/ticket-tactic.md` (new) | dkc-validate Ticket sobre ejemplo manual del template | git revert | DET-16 | pending | 3 |
| S3.T5 | Extender `commands/dkc.md` con trigger `tactic` en tabla de intenciones | REQ-IMPROVE-02 | developer | S3.T1..T4 | `commands/dkc.md` | grep retorna nueva fila | git revert | — | pending | 3 |
| S3.T6 | Validacion empirica: dkc-validate Ticket sobre ejemplo tactic + 5 tickets full-path random (regresion 0) + tests MCP server | REQ-PRESERVE-01, REQ-REGRESSION-01 | reviewer | S3.T1..T5 | n/a | exit 0 todo + 14/14 tests pass | (no aplica) | DET-13 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2)** — persistir resultados + dkc-validate + DET-23 quality review (standard) | — | reviewer | S3.T1..S3.T6 | ticket | gate persistido + decision documentada | (no aplica) | DET-20, DET-23 | pending | 3 |

### Session 4 — HC viewer compat + /dkc skill + pilot empirico + docs [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Agregar blueprint para `tactic` en HC workflow.ts (1-2 nodos: `tactic-execute` + opcional `closed`) | REQ-IMPROVE-03 | developer | S3.GATE | `horadric-cube/server/deckard/workflow.ts` | vitest server suite + flowInference smoke | git revert | DET-16 | pending | 4 |
| S4.T2 | Smoke manual HC viewer: abrir 1 ticket tactic real y verificar render (flow + secciones) | REQ-IMPROVE-03 | reviewer | S4.T1 | HC dev-server up | screenshot manual + 0 errors en consola | (no aplica) | DET-13 | pending | 4 |
| S4.T3 | Extension /dkc skill (commands SDK del repo) reconoce `/dkc tactic ...` trigger explicito | REQ-IMPROVE-02 | developer | S3.GATE | `.claude/commands/dkc.md` o equivalente del SDK | manual test invocando trigger | git revert | — | pending | 4 |
| S4.T4 | Docs: actualizar `prompts/workflows/request.md` con tabla quick vs tactic vs query | REQ-PRESERVE-02 | developer | S3.GATE | `prompts/workflows/request.md` | lectura visual + lint | git revert | — | pending | 4 |
| S4.T5 | Pilot empirico: ejecutar 2-3 tactic reales (sugerencias: fix typo en algun .md, rename variable en algun .py, bump version en pyproject.toml). Validar H2 (4-5 secciones cubren gap) | REQ-IMPROVE-01, REQ-IMPROVE-02 | developer | S4.T1..T4 | 2-3 archivos del repo (a elegir) | cada tactic creado en <5min + record completo | (no aplica) | DET-3, DET-11, DET-13, DET-19, DET-27 | pending | 4 |
| S4.T6 | Medicion empirica + regresion final: tests MCP server + HC server + HC frontend pasan; dkc-validate sobre tickets nuevos + existentes; reindex; medicion tiempo + lineas | REQ-PRESERVE-01, REQ-REGRESSION-01 | reviewer | S4.T1..T5 | n/a | 0 regresiones; metrics registradas en `## Regression` | (no aplica) | DET-13 | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T3)** — regression completa + DET-23 exhaustive + pilot exitoso | — | reviewer | S4.T1..S4.T6 | ticket | gate persistido + decision documentada | (no aplica) | DET-20, DET-23 | pending | 4 |

### Session 5 — Close [tipo: auto] [tier: T0]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | teach-close decision (dev elige si generar o skip con razon) | REQ-IMPROVE-01 | scribe | S4.GATE | `tickets/HOR-067.teach/teach-close.md` (si genera) | bloques `dkc:*` validan (si genera) | (no aplica) | DET-22 | pending | 5 |
| S5.T2 | Summary del ticket en 5 secciones (What was requested, What was done, What was discovered, Testing summary, Metrics) | — | scribe | S5.T1 | ticket | lectura visual + dkc-validate Ticket | revertir Summary | DET-13 | pending | 5 |
| S5.T3 | Frontmatter close (`status: closed`, `closed: 2026-XX-XX`, `story_points.executed`, `executed_method: sessions-heuristic`) | — | scribe | S5.T2 | ticket frontmatter | dkc-validate Ticket valid | revertir frontmatter | DET-26 | pending | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T0)** — close ticket + spec status: done + reindex | — | reviewer | S5.T1..S5.T3 | ticket | gate persistido + status: closed | (no aplica) | DET-20, DET-22, DET-26 | pending | 5 |

## Constraints

- **DET-3** (inmutabilidad del request): el step tactic-execute.md MUST capturar el Request inmutable al crear el ticket
- **DET-11** (KB-first): tactic-execute.md tiene paso explicito de KB lookup obligatorio antes de tocar codigo
- **DET-13** (cierre con evidencia): el Summary del ticket tactic es la evidencia de cierre — sin Summary, no se marca closed
- **DET-16** (propagacion): cada extension (validator + MCP + HC) verifica que tickets full-path siguen validando
- **DET-19** (external id): commits del tactic usan prefijo `TICKET-id-tactic` (o `external` si esta poblado)
- **DET-20** (sessions con gate): aplica al ticket HOR-067 (5 sessions), NO aplica al ticket tactic resultante (single-session)
- **DET-22** (teach-close): aplica al ticket HOR-067 (improvement full-path); NO aplica al ticket tactic resultante
- **DET-23** (quality review): S3.GATE y S4.GATE corren quality review (standard/exhaustive)
- **DET-25** (TCs inline): aplica a las sessions execute del HOR-067; opcional para tickets tactic (registrados solo si emergen)
- **DET-26** (Story points): S5.T3 setea SP executed con heuristica improvement (divisor 2.0)
- **DET-27** (commits por session): cada session de HOR-067 commitea separado por tipo. Tickets tactic resultantes commitean con prefix unico (1 commit por logical-unit)
- **DET-28** (tasks del spec al ticket): aplica al iniciar S3/S4/S5; tickets tactic NO copian tasks de spec (no tienen spec)
- **DET-29** (persistencia in-flight via dkc-execute-task): aplica a HOR-067; opcional para tickets tactic (single-session)

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| HOR-058 patron extension de enum TicketStatusEnum | internal | Referencia para H6 — extender enum sin breaking | low — patron probado |
| HOR-059 lazy-load steps | internal | Patron defensive split de prompts/steps — NO aplica a tactic-execute.md (es single archivo) | none |
| MCP server `deckard-cain` | internal | S3.T2 extiende routing | low — patron conocido |
| HC viewer | internal | S4.T1 extiende flowInference | low — patron conocido |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| H2 (4-5 secciones no cubren gap): emerge necesidad de mas secciones en pilot | medium | medium | S4.T5 pilot empirico con 2-3 tactic reales. Si emerge gap, iterar template antes de cerrar |
| Regresion en tickets full-path al extender validator | low | high | S3.T6 + S4.T6 sobre 5 tickets full-path random + suite completa de tests |
| HC viewer no renderiza tactic correctamente | medium | medium | S4.T1 blueprint + S4.T2 smoke manual antes de pilot |
| Dev confunde tactic con quick | low | low | S4.T4 docs explicitas con tabla diferencial |
| Escalamiento tactic→full-path mid-ejecucion no claro | low | medium | Politica en tactic-execute.md: si scope crece, crear ticket nuevo full-path + cerrar tactic como `closed_reason: superseded` |

## Open questions

(Todas resueltas en S1+S2 — ver Decisions)

## Decisions

### DEC-LOCAL-01: Template separado `templates/records/ticket-tactic.md`
- **Contexto**: OQ1 del intake — template tactic vs declarativo (variant de `ticket.md`)
- **Drivers**: claridad operacional; alineamiento con patron del repo (1 archivo por tipo en `templates/records/`); facilidad de mantenimiento
- **Opcion elegida**: archivo separado `templates/records/ticket-tactic.md`
- **Alternativas**:
  - Declarativo (variant de `ticket.md` con secciones condicionales): DRY pero template se vuelve mas complejo + condicionales ambiguos. Mayor riesgo de drift
- **Consecuencias**: gana claridad + facilidad de mantenimiento; pierde DRY del frontmatter (que es minimo)
- **Reversibilidad**: alta — si emerge necesidad, mergear en `ticket.md` declarativo
- **Session**: 2 (S2 design, 2026-05-24)

### DEC-LOCAL-02: Tabla DETs aplicables a tactic in-step (`tactic-execute.md`)
- **Contexto**: OQ2 del intake — donde vive la tabla de DETs aplicables a tactic
- **Drivers**: NO inflar `deterministic-rules.md` (HOR-059 ataco eso explicitamente); DRY (el LLM que ejecuta tactic ya carga el step — tabla in-context); facilidad de cambio
- **Opcion elegida**: tabla in-step al final de `prompts/steps/tactic-execute.md` como seccion "DETs aplicables a tactic"
- **Alternativas**:
  - En `deterministic-rules.md` (nueva subsection): canonical pero infla el archivo (91KB ya)
  - Nueva DET-30 formal: overhead innecesario para regla declarativa (patron NO usado para work_types existentes)
- **Consecuencias**: gana DRY + alineamiento con HOR-059; pierde discoverability cross-corpus
- **Reversibilidad**: alta — si emerge necesidad, mover la tabla a deterministic-rules.md
- **Session**: 2 (S2 design, 2026-05-24)

### DEC-LOCAL-03: Numeracion de sessions tactic — `Session 1 [phase: tactic]` implicita
- **Contexto**: OQ3 del intake — numeracion sessions tactic
- **Drivers**: compatibilidad MAXIMA con HC parser sessions.ts existente; preserva el contador de sessions (1/1 done); reusa Quality review opcional simplificado; minimiza work de HC
- **Opcion elegida**: `### Session 1 [phase: tactic]` implicita single-session dentro de `## Sessions` del ticket
- **Alternativas**:
  - Sin header de session (inline): semanticamente claro pero requiere ajuste de flowInference + HC parser para no esperar Sessions
  - Bloque `## Tactic execution` custom: agrega patron nuevo que HC parser debe reconocer
- **Consecuencias**: gana compat maxima; pierde semantica "session" en single-task tactic (pero funcional)
- **Reversibilidad**: media — cambiar shape post-implementacion requiere migrar tickets tactic existentes
- **Session**: 2 (S2 design, 2026-05-24)

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Tiempo de creacion de tactic | n/a (work_type no existe) | <5 min | Cronometro manual en S4.T5 pilot (3 ejemplos) |
| Lineas de ticket tactic | n/a | <60 | wc -l del archivo creado |
| Tickets full-path validan post-extension | 100% | 100% (0 regresiones) | `dkc-validate Ticket` sobre 5 random |
| Tests MCP server | 14/14 pass | 14/14 (sin nuevos fails) | `cd server && .venv/bin/python -m pytest tests/` |
| Tests HC | baseline a registrar S3.T6 | sin regresion | `cd horadric-cube && npm run test:server && npm run test` |
| HC render tactic | n/a | 0 errors consola | Smoke manual S4.T2 |

## Technical reference

### Shape del template ticket-tactic.md (DEC-LOCAL-01 + DEC-LOCAL-03)

```markdown
---
id: TICKET-{seq}
external: null
project: {project}
module: {module}
spec: null
work_type: tactic
status: open | in_progress | closed
creates_visual: false
creates_data: false
draft_approved: null
draft_version: null
teachings: { intake: skipped, close: skipped }   # tactic skip por diseno
autopilot: false
sprint: null
story_points:
  published: null
  estimated: 1   # tactic tipicamente 1-2 SP
  executed: null
  executed_method: null
created: '{date}'
closed: null
closed_reason: null
tags: []
rules: []   # DETs aplicables a tactic (subset documentado en tactic-execute.md)
overrides: []
---

# {Titulo descriptivo corto}

## Request
{1-3 oraciones — que pidio el dev}

## KB consulted
- Rules: [RULE-xxx](path), [RULE-yyy](path) — o "n/a" si no aplica
- Bugs: [BUG-xxx](path) — o "n/a"
- Specs: [SPEC-xxx](path) — o "n/a"

## Discoveries / decisions
{Opcional. Solo si emerge algo mid-ejecucion. Bullets cortos:}
- D1: {finding}
- M1 (micro-decision): {que se decidio + por que en 1 linea}

## Sessions

### Session 1 — {date} — {objetivo corto} [phase: tactic]

**Objetivo**: {que se hizo en 1 linea}

**Tasks completadas**:
- [x] T1: {accion + archivos tocados + commit hash}

#### Commits

| Hash | Mensaje | Archivos |
|------|---------|----------|
| abc123 | TICKET-id-tactic fix(module): mensaje | path/a, path/b |

## Summary
{2-4 oraciones — que se hizo + resultado verificado}
```

### Shape de la tabla DETs aplicables (en tactic-execute.md — DEC-LOCAL-02)

```markdown
## DETs aplicables a tactic

| DET | Aplica | Notas |
|-----|--------|-------|
| DET-3 (request inmutable) | SI | Request del ticket tactic NO se reescribe post-creacion |
| DET-11 (KB-first) | SI | Seccion `## KB consulted` obligatoria — lookup explicito de rules/bugs/specs |
| DET-13 (cierre con evidencia) | SI | Summary obligatorio — sin Summary, no se cierra |
| DET-16 (propagacion) | SI | Si tactic afecta otros archivos, verificar consumers |
| DET-19 (external id) | SI | Commits con prefix `TICKET-id-tactic` o `external` si poblado |
| DET-27 (commits por session) | SI (granularidad logical-unit, NO per-type) | 1 commit por logical-unit suficiente |
| DET-18 (draft) | NO | Tactic NO crea visual/data por definicion |
| DET-20 (sessions con gate) | NO | Single-session implicita |
| DET-21 (teach-intake) | NO | Skipped por diseno |
| DET-22 (teach-close) | NO | Skipped por diseno |
| DET-23 (quality review formal) | NO | Light implicito, sin tabla formal |
| DET-25 (TCs inline) | OPCIONAL | Solo si emergen tests; tipicamente n/a para tactic |
| DET-26 (SP heuristica compleja) | NO | Tactic = siempre 1-2 SP, sin breakdown |
| DET-28 (tasks del spec) | NO | Sin spec |
| DET-29 (persistencia in-flight via dkc-execute-task) | NO | Single-session implica overkill |
```

### Politica de escalamiento tactic → full-path

Si durante ejecucion de un tactic emerge complejidad inesperada:

1. **NO continuar el tactic** — pausar
2. **Crear ticket nuevo** full-path (`/dkc <peticion ampliada>`) con `work_type` apropiado (fix/improvement/refactor)
3. **Cerrar tactic** con `closed_reason: superseded` apuntando al nuevo ticket
4. **NO transformar el tactic existente** en otro work_type — la conversion no esta soportada

Senales de escalamiento (cualquiera activa):
- Cambio toca >3 archivos
- Emerge necesidad de spec o decisions formales
- Cambio afecta API publica o datos persistentes
- Tiempo estimado revisado >1h
- Multiples capas coordinadas

## Rules discovered

{Se llena durante ejecucion.}

## Bugs found

{Se llena si se descubren problemas.}

## Acceptance checkpoints

- [ ] **Funcional**: REQ-IMPROVE-01/02/03 scenarios pasan en S3 + S4
- [ ] **Tests**: TCs registrados inline en sessions execute (DET-25)
- [ ] **NFRs**: tiempo creacion <5min, lineas <60, p95 validator <200ms
- [ ] **Rules**: DETs aplicables todas pasan; DETs no-aplicables documentadas en tabla in-step
- [ ] **Integration**: dkc-validate Ticket exit 0 sobre tactic + 5 full-path random + tests pass
- [ ] **Docs**: prompts/workflows/request.md actualizado + tactic-execute.md con tabla DETs

## Archiving

Spec activa hasta cierre del ticket HOR-067. Post-cierre, archivable si emerge superseder (improbable — tactic es feature stable). Mantener referencia historica del Request + Decisions.
