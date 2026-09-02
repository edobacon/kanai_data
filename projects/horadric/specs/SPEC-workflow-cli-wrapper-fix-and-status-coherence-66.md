---
id: SPEC-workflow-cli-wrapper-fix-and-status-coherence-66
project: horadric
ticket: HOR-066
status: done
---

# Fix wrapper bash dkc-validate + StatusCoherence + RULE patron 5 capas + cleanup specs drift

# Fix wrapper bash dkc-validate + StatusCoherence + RULE patron 5 capas + cleanup specs drift

## Executive summary — lo que estas aprobando

> Spec compacto post-revision empirica. Scope original era 18 SP; ahora son 6 SP porque 16/17 validators ya existen.

**Que se quiere**: completar lo que falta para que el contrato de enforcement DKC sea funcional para el usuario final (dev/LLM). El intake-explore de HOR-066 verifico empiricamente que el codigo TS de `commands/lib/` ya tiene los validators implementados — el dev (y el audit de HOR-065) lo veian como inexistentes por (a) Usage hardcoded del wrapper bash con solo 4 kinds, (b) wrapper no enforcea node 22+. Este spec cierra esos gaps + agrega el unico validator realmente faltante (`StatusCoherence`) + formaliza el patron como RULE + limpia 3 specs drift historicos.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | El wrapper bash usa `command -v nvm` + `nvm use 22` directo, NO un workaround tipo "ejecuta esto antes" | Si dejamos prerequisite documental, el dev olvida y vuelve a aparecer el bug. Auto-switch es la unica forma de garantizar consistencia |
| 2 | `StatusCoherence` valida cross-file: lee ticket → resuelve spec referenciado en frontmatter → verifica coherencia de status. NO valida en sentido inverso (spec → ticket) para evitar ambiguedad cuando un spec referencia ticket sin frontmatter | Direccion canonica: ticket es la SoT operacional, spec es la SoT estructural. El ticket "manda" sobre el spec en terminos de status del work |
| 3 | RULE-workflow-enforcement-pattern-009 documenta el patron pero NO se enforcea sobre DETs historicas (1-29). Solo aplica a DETs nuevas post-2026-05-23 | Auditar las 29 DETs existentes para verificar 5 capas completas seria un ticket aparte. La rule cubre prevencion futura, no remediation retroactiva |
| 4 | F6 cleanup conversacional con gate ⚑ fuerte por spec — NO autopilot | Cerrar 3 specs `in_progress` es accion semi-irreversible que el dev debe decidir caso por caso (close as done, archive, mantener) |

**Riesgos**:

- **Cambiar el wrapper bash puede romper invocaciones externas** → preservar la API actual (`dkc-validate {kind} {file} [--session N] [--no-strict]`), solo agregar kinds nuevos y nvm switch
- **`nvm use 22` puede fallar si el dev no tiene nvm instalado** → fallback: abortar con mensaje claro "instala nvm + node 22 o exporta NODE 22+ al PATH", no romper silencioso
- **StatusCoherence sobre HOR-015/058/060 va a fallar** → es esperado y deseado (es la prueba de que el validator funciona). El cleanup F6 las cierra coherentemente

**Que NO se hace**:

- **F2 (7 validators core) ni F3 (6 validators aux)** — refutados empiricamente (L8). Los validators existen, solo falta el wiring del Usage
- **F5 (extender DET-29)** — sin evidencia post-F2 que sustente la necesidad. Diferido sine die
- **Audit retroactivo de 29 DETs contra el patron 5 capas** — scope aparte; puede ser HOR-067 si hace falta

**Tamano estimado**: 4 sessions execute (S1-S4) de tier T1/T2, ~4-7h efectivas. **S4 es la mas conversacional** (cleanup de 3 specs con gate ⚑ fuerte).

**Como vas a saber que funciona**:

- Ejecuto `dkc-validate` sin args y veo 17 kinds en Usage (no solo 4)
- Ejecuto `dkc-validate Ticket HOR-066.md` y NO necesito hacer `nvm use 22` manual primero — el wrapper lo hace o me dice exactamente que hacer
- Ejecuto `dkc-validate StatusCoherence projects/horadric/tickets/HOR-015.md` y obtengo "drift: spec SPEC-workflow-dkc-flow-audit-15 status=in_progress pero ticket=closed"
- Despues de F6, `dkc-validate StatusCoherence` sobre todos los tickets cerrados retorna 0 drifts
- `~/.claude/CLAUDE.md` global menciona "Node 22+ requerido para dkc-validate"

---

## Purpose

Cerrar 4 gaps operacionales del workflow DKC: (a) wrapper bash hardcoded oculta validators existentes, (b) wrapper no valida node version, (c) un validator faltante (StatusCoherence) impide detectar drift estructural, (d) 3 specs historicos con drift confirmado contaminan el KB. El spec NO toca codigo TS de los 16 validators existentes — solo wiring del CLI bash + 1 schema nuevo + 1 RULE + cleanup conversacional.

## Analisis de mejora

### Estado actual (verificado empiricamente 2026-05-23 en HOR-066 S0)

- `commands/lib/schemas/`: **17 archivos TS** existentes (anti-patterns, bug, decision, decisions, directive, draft, meta-spec, rule, session-block, session-checkboxes, session-execution, spec-full, spec-task, step-transition, teach, ticket, transcript)
- `commands/lib/validate.ts`: dispatch para **16 kinds + Directive + all** (lineas 869-912)
- `commands/dkc-validate` bash wrapper: **Usage hardcoded a 4 kinds** (SpecTask, SessionBlock, Rule, Decision, all). Sin validacion de node version.
- Schemas TS funcionando con node 22: verificado empiricamente — HOR-065 SessionBlock → `valid: true`; HOR-001 Ticket → `valid: true`; HOR-065 Ticket → `invalid` por enum drift (`sessions-heuristic` no aceptado)
- Drift `executed_method`: template ticket.md documenta `sessions-heuristic | manual | pre-DET-20-estimated | skip | null`, schema zod tiene set mas restrictivo
- Specs in_progress con ticket closed: HOR-015, HOR-058, HOR-060 (3 casos confirmados)

### Problema / oportunidad

Cuando el dev/LLM ejecuta `dkc-validate` sin args, lee 4 kinds en Usage y razona "solo 4 implementados". Cuando invoca un kind que el wrapper acepta pero tsx falla con node viejo, obtiene "Unexpected token {" sin contexto y razona "bug del parser". Ambos diagnosticos son incorrectos pero coherentes con la informacion visible. Resultado: el sistema TS rico no se aprovecha y el dev/LLM concluye que falta implementar lo que ya esta hecho.

### Estado deseado

- Wrapper bash imprime los 17 kinds en Usage (refleja el codigo TS real)
- Wrapper valida node version: si != 22+, intenta `nvm use 22` automatico; si no hay nvm, aborta con mensaje claro
- `StatusCoherence` validator implementado y disponible via wrapper
- Enum `executed_method` sincronizado template ↔ schema
- RULE-workflow-enforcement-pattern-009 formaliza el patron de 5 capas (DET + step + comando + validator + a-hook + entry T2)
- 3 specs drift cerrados con decision editorial del dev
- Addendum a HOR-065 documentando que el diagnostico fue revisado

## Requirements

### REQ-IMPROVE-WRAPPER-USAGE-01

> **Que cambia**: ejecutar `dkc-validate` sin args muestra los 17 kinds disponibles, no solo 4.
> **Por que**: la lista hardcoded hoy oculta 13 kinds que ya existen → diagnostico equivocado del usuario.

El sistema MUST imprimir el listado completo de kinds disponibles cuando se invoca el wrapper sin argumentos o con `--help`.

**Actor**: developer DKC + LLM
**Layers**: backend (bash wrapper)

<details><summary>Scenarios de validacion</summary>

- **GIVEN** wrapper actualizado **WHEN** dev ejecuta `dkc-validate` **THEN** Usage lista: SpecTask, SessionBlock, Rule, Decision, AntiPatterns, Ticket, Bug, SpecFull, MetaSpec, Draft, Transcript, Teach, SessionExecution, StepTransition, SessionCheckboxes, StepDecisions, StatusCoherence (post-S2), Directive, all
- **GIVEN** wrapper actualizado **WHEN** dev invoca kind valido nuevo (ej `dkc-validate Ticket HOR-001.md`) **THEN** se ejecuta correctamente

</details>

### REQ-IMPROVE-NODE-VERSION-02

> **Que cambia**: el wrapper detecta que node activo < 22 y o (a) hace `nvm use 22` automatico si nvm disponible, o (b) aborta con mensaje claro indicando exactamente que hacer.
> **Por que**: hoy con node viejo el wrapper falla con "Unexpected token {" sin contexto — el usuario interpreta como bug del parser.

El sistema MUST validar la version de node antes de invocar `tsx`. Si la version < 22:

- Intentar `command -v nvm` y `nvm use 22` source en subshell
- Si falla, abortar con exit 3 y mensaje `"ERROR: dkc-validate requiere Node 22+. Ejecuta 'nvm use 22' o instala node 22 (https://nodejs.org/). Version actual: $(node --version)."`

**Actor**: developer DKC + LLM
**Layers**: backend (bash wrapper)

### REQ-IMPROVE-STATUS-COHERENCE-03

> **Que cambia**: existe un validator nuevo `StatusCoherence` que detecta cuando un ticket esta `closed` pero su spec referenciado esta `in_progress` (o similar).
> **Por que**: drift confirmado en 3 specs historicos. Sin validator, el patron se repite.

El sistema MUST implementar `commands/lib/schemas/status-coherence.ts` con schema zod que:

1. Lee el archivo destino (puede ser ticket o spec)
2. Si es ticket: lee frontmatter `spec`, resuelve path `projects/{project}/specs/{spec}.md`, lee su frontmatter `status`, valida coherencia: `ticket.status=closed → spec.status ∈ {done, archived}` (mismo proyecto)
3. Si es spec: lee `ticket` del frontmatter, valida `spec.status=in_progress → ticket.status ∈ {in_progress, request-close, ...}`
4. Exit 0 si coherente, 1 con detalle del drift, 3 si error tecnico (path no existe, etc.)

Agregar dispatch en `validate.ts` para el kind `StatusCoherence`. Agregar al Usage del wrapper.

**Actor**: developer DKC + LLM (via a-hooks futuros en request-close)
**Layers**: backend (schemas, validate dispatch, wrapper)

<details><summary>Scenarios de validacion</summary>

- **GIVEN** HOR-015 con `status: closed` y spec `SPEC-workflow-dkc-flow-audit-15` con `status: in_progress` **WHEN** ejecuto `dkc-validate StatusCoherence projects/horadric/tickets/HOR-015.md` **THEN** exit 1 con mensaje "drift: spec SPEC-workflow-dkc-flow-audit-15 status=in_progress pero ticket=closed"
- **GIVEN** HOR-066 con `status: in_progress` y spec del HOR-066 con `status: in_progress` **WHEN** invoco `dkc-validate StatusCoherence` **THEN** exit 0
- **GIVEN** HOR-064 con `status: closed` y spec `SPEC-dkc-execute-task-lazy-stubs` con `status: done` **WHEN** invoco **THEN** exit 0

</details>

### REQ-FIX-EXECUTED-METHOD-ENUM-04

> **Que cambia**: el enum del schema zod `commands/lib/schemas/ticket.ts` para `story_points.executed_method` acepta los mismos valores que documenta el template (`sessions-heuristic`, `manual`, `pre-DET-20-estimated`, `skip`, `null`, `computed`).
> **Por que**: HOR-065 cerro con `executed_method: sessions-heuristic` (valido segun template y DET-26) pero el schema lo rechaza → false positive de invalid.

El sistema MUST sincronizar el enum entre `templates/records/ticket.md` y `commands/lib/schemas/ticket.ts`. Verificar tambien `dkc-sp-import` que es la otra fuente.

**Actor**: developer DKC
**Layers**: backend (schema), config (template)

### REQ-IMPROVE-PATTERN-RULE-05

> **Que cambia**: existe `projects/horadric/rules/workflow/RULE-workflow-enforcement-pattern-009.md` que documenta el patron de 5 capas como contrato para futuras DETs.
> **Por que**: HOR-065 detecto que el patron emerge organicamente en DET-29 pero NO esta formalizado. Sin la rule, futuras DETs pueden saltarse capas inadvertidamente.

El sistema MUST tener una rule en el modulo `workflow` con shape canonical (what/why/where/when) que documente:

- Capa 1: DET declarativa en `prompts/deterministic-rules.md`
- Capa 2: referencia desde steps relevantes en `prompts/steps/*.md`
- Capa 3: comando ejecutable en `commands/dkc-*` si la regla requiere accion mutativa
- Capa 4: validator en `commands/lib/schemas/*.ts` + dispatch en `validate.ts` + alias en wrapper
- Capa 5: a-hook (`<!-- enforcement: a-hook command: ... -->`) en step/template
- Capa 5b: entry T2 observable en `decisions_log` del ticket (convencion HOR-058)

La rule MAY listar excepciones (DETs que pueden omitir alguna capa con justificacion).

**Actor**: developer DKC + LLM scribe al crear DETs nuevas
**Layers**: meta (rules, prompts)

### REQ-IMPROVE-DOCS-NODE22-06

> **Que cambia**: CLAUDE.md global y INSTALL.md mencionan explicitamente el requirement de Node 22+ para `dkc-validate`.
> **Por que**: sin documentacion centralizada, el dev (humano o LLM nuevo en el proyecto) re-descubre el problema. La rule de Runtimes en CLAUDE.md global ya menciona node 22 para Playwright; agregar la misma mencion para dkc-validate.

El sistema MUST agregar 1-2 lineas a `~/.claude/CLAUDE.md` (seccion Runtimes) y a `INSTALL.md` del deckard root indicando Node 22+ requerido para `commands/dkc-validate`.

**Actor**: developer DKC humano
**Layers**: meta (docs)

### REQ-IMPROVE-CLEANUP-DRIFT-07

> **Que cambia**: los 3 specs en `in_progress` con ticket `closed` (HOR-015, HOR-058, HOR-060) reciben decision editorial del dev: close as done, archive, o mantener (con justificacion).
> **Por que**: drift confirmado contamina el KB y es la prueba viva del problema. Cleanup conversacional libera el KB de inconsistencias historicas.

El sistema MUST resolver los 3 specs drift en conversacion con el dev (NO autopilot). Cada spec recibe decision documentada inline en el spec (decision section o nota) + cambio de status si aplica + reindex.

**Actor**: developer DKC humano (decision editorial)
**Layers**: meta (specs)

### REQ-IMPROVE-ADDENDUM-HOR065-08

> **Que cambia**: HOR-065 (cerrado) recibe addendum (no reescritura) documentando que su diagnostico fue revisado por HOR-066 S0 y el scope real era mucho menor.
> **Por que**: HOR-065 es referencia historica accesible desde HC viewer. Sin addendum, el dev futuro lee el diagnostico erroneo y razona en base a el.

El sistema MUST agregar una seccion `## Addendum 2026-05-23 — diagnostico revisado por HOR-066` al final de HOR-065.md con (a) que se revisó, (b) que cambio, (c) link a HOR-066 + spec. No reescribir el body original — preserva DET-3 (inmutabilidad del request).

**Actor**: LLM scribe (autopilot OK porque es accion aditiva no destructiva)
**Layers**: meta (ticket markdown)

### REQ-PRESERVE-WRAPPER-API-09

> **Que cambia**: NO cambia la API del wrapper (`dkc-validate {kind} {file} [--session N] [--no-strict]`). Cambian solo el Usage message y el node check.
> **Por que**: invocaciones externas (a-hooks, scripts) usan la API actual. Romperla rompe todo el ecosistema.

El sistema MUST preservar la sintaxis CLI actual del wrapper. Cambios aceptables: agregar nuevos kinds al dispatch, agregar pre-checks, mejorar mensajes de error.

**Actor**: developer DKC
**Layers**: backend (bash wrapper)

### REQ-PRESERVE-VALIDATORS-EXISTING-10

> **Que cambia**: los 16 validators ya existentes en `validate.ts` NO se tocan en este ticket (excepto enum fix en REQ-04).
> **Por que**: regression. Cualquier cambio en schemas existentes puede romper tickets historicos validados.

El sistema MUST limitar cambios a (a) StatusCoherence nuevo, (b) enum executed_method ajuste, (c) wrapper bash. No tocar logica de SpecTask, SessionBlock, Rule, Decision, AntiPatterns, Ticket (excepto enum), Bug, SpecFull, MetaSpec, Draft, Transcript, Teach, SessionExecution, StepTransition, SessionCheckboxes, StepDecisions, Directive.

**Actor**: developer DKC
**Layers**: backend (schemas)

## Tasks

### Session 1 — Fix wrapper bash + node version + docs [tier: T1, gate: auto]

| # | Task | Source ref | Owner | Status | Rollback | Session |
|---|------|------------|-------|--------|----------|---------|
| S1.T1 | Update Usage message en `commands/dkc-validate` con los 17 kinds (SpecTask, SessionBlock, Rule, Decision, AntiPatterns, Ticket, Bug, SpecFull, MetaSpec, Draft, Transcript, Teach, SessionExecution, StepTransition, SessionCheckboxes, StepDecisions, StatusCoherence — este ultimo se agrega en S2, marcar como `(coming soon S2)` en S1) | REQ-01 | developer | pending | git revert | 1 |
| S1.T2 | Agregar validacion de node version antes de `exec npx tsx`: si node < 22, intentar `nvm use 22` source en subshell. Si falla, exit 3 con mensaje claro | REQ-02 | developer | pending | git revert | 1 |
| S1.T3 | Smoke test: ejecutar `dkc-validate {kind} <ticket>` para 5 kinds aleatorios (ej: Ticket, SessionBlock, AntiPatterns, Teach, Bug) sobre HOR-001 y HOR-065. Confirmar funcionan via wrapper | REQ-01 | developer | pending | n/a | 1 |
| S1.T4 | Update `~/.claude/CLAUDE.md` seccion Runtimes con linea "Node 22+ requerido para `commands/dkc-validate` (mismo que Playwright)". Update `INSTALL.md` del deckard root con seccion node version | REQ-06 | developer | pending | git revert | 1 |
| S1.GATE | Gate decision (validation tier T1) | — | reviewer | pending | — | 1 |

### Session 2 — StatusCoherence validator + fix enum executed_method [tier: T2, gate: auto]

| # | Task | Source ref | Owner | Status | Rollback | Session |
|---|------|------------|-------|--------|----------|---------|
| S2.T1 | Crear `commands/lib/schemas/status-coherence.ts` con schema zod cross-file: lee ticket/spec, resuelve referenciado, verifica coherencia de status segun reglas REQ-03 | REQ-03 | developer | pending | git revert | 2 |
| S2.T2 | Agregar dispatch en `commands/lib/validate.ts` (linea 869-912 area) para kind `StatusCoherence` invocando el schema nuevo | REQ-03 | developer | pending | git revert | 2 |
| S2.T3 | Update Usage del wrapper bash agregando `StatusCoherence` (quitando el `(coming soon)` de S1.T1) | REQ-03 | developer | pending | git revert | 2 |
| S2.T4 | Sincronizar enum `story_points.executed_method` entre `templates/records/ticket.md` y `commands/lib/schemas/ticket.ts`. Verificar tambien `commands/lib/schemas/decisions.ts` (entry method enum) y `commands/dkc-sp-import` (si existe) | REQ-04 | developer | pending | git revert | 2 |
| S2.T5 | Smoke test: `dkc-validate StatusCoherence projects/horadric/tickets/HOR-015.md` → exit 1 con drift detectado. `... HOR-066.md` → exit 0. `... HOR-064.md` → exit 0 | REQ-03 | developer | pending | n/a | 2 |
| S2.T6 | Smoke test: `dkc-validate Ticket projects/horadric/tickets/HOR-065.md` → exit 0 (post-fix enum) | REQ-04 | developer | pending | n/a | 2 |
| S2.GATE | Gate decision (T2) | — | reviewer | pending | — | 2 |

### Session 3 — RULE-workflow-enforcement-pattern-009 [tier: T1, gate: auto]

| # | Task | Source ref | Owner | Status | Rollback | Session |
|---|------|------------|-------|--------|----------|---------|
| S3.T1 | Escribir `projects/horadric/rules/workflow/RULE-workflow-enforcement-pattern-009.md` con shape canonical what/why/where/when documentando las 5 capas del patron | REQ-05 | scribe | pending | git revert | 3 |
| S3.T2 | Agregar nota corta en `prompts/deterministic-rules.md` (al final o como section meta) referenciando la rule y los 5 artefactos obligatorios para futuras DETs | REQ-05 | scribe | pending | git revert | 3 |
| S3.T3 | Validar la rule recien escrita: `dkc-validate Rule projects/horadric/rules/workflow/RULE-workflow-enforcement-pattern-009.md` → exit 0 | REQ-05 | reviewer | pending | n/a | 3 |
| S3.T4 | Grep de cobertura: cuantas de las DETs 1-29 mencionan explicitamente sus 5 capas. Capturar como baseline en learn (no es accion correctiva — es metric) | REQ-05 | researcher | pending | n/a | 3 |
| S3.GATE | Gate decision (T1) | — | reviewer | pending | — | 3 |

### Session 4 — Cleanup drift specs + addendum HOR-065 [tier: T1, gate: ⚑ fuerte per spec]

| # | Task | Source ref | Owner | Status | Rollback | Session |
|---|------|------------|-------|--------|----------|---------|
| S4.T1 | Leer HOR-015 spec + ticket. Presentar al dev opciones (close as done, archive, mantener con justificacion). Aplicar decision via Edit + reindex | REQ-07 | reviewer + dev | pending | git revert | 4 |
| S4.T2 | Leer HOR-058 spec + ticket. Idem T1 | REQ-07 | reviewer + dev | pending | git revert | 4 |
| S4.T3 | Leer HOR-060 spec + ticket. Idem T1 | REQ-07 | reviewer + dev | pending | git revert | 4 |
| S4.T4 | Ejecutar `dkc-validate StatusCoherence` sobre los 3 tickets post-cleanup → debe retornar exit 0 para todos | REQ-03 + REQ-07 | reviewer | pending | n/a | 4 |
| S4.T5 | Escribir addendum en HOR-065.md (seccion `## Addendum 2026-05-23 — diagnostico revisado por HOR-066`) documentando: que se revisó (L8/L9), que cambio (16/17 existen, no 4/17; bug node version no parser), link a HOR-066 + este spec | REQ-08 | scribe | pending | git revert | 4 |
| S4.GATE | Gate decision (T1, ⚑ fuerte porque cierre del ticket es accion semi-irreversible) | — | dev | pending | — | 4 |

## Constraints

- Compatibilidad con `commands/dkc-validate` CLI actual (REQ-09)
- Compatibilidad con validators existentes — solo modificar enum executed_method (REQ-10)
- Schemas zod usan misma version de zod que el resto del lib (no introducir nueva dependencia)
- Tests unitarios siguen estructura HOR-026/041

## Dependencies

- HOR-026 (output schemas zod base)
- HOR-041 (Rule + Decision schemas)
- HOR-065 (audit operacional — input + sera corregido en S4.T5 via addendum)
- Node 22+ via nvm (constraint, no dependencia explicita en codigo)

## Risks

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|--------------|---------|------------|
| Cambios al wrapper bash rompen invocaciones externas | baja | medio | REQ-09 PRESERVE API + smoke tests S1.T3 |
| `nvm use 22` falla en CI/CD sin nvm | media | bajo | Mensaje claro de fallback (REQ-02) permite al CI configurar node 22 nativamente |
| StatusCoherence detecta mas drifts de los 3 conocidos | baja | bajo | Resolver iterativo en S4 — gate ⚑ fuerte permite escalar a tickets adicionales si emergen |
| Fix enum executed_method invalida tickets historicos | media | bajo | El fix EXPANDE el enum (agrega valores), no restringe → backwards compatible |
| RULE-009 expone que muchas DETs no tienen 5 capas completas | alta | bajo | S3.T4 captura baseline; no accion correctiva en este ticket (out of scope) |

## Open questions

- ¿La RULE-009 debe aplicar a DETs historicas o solo a nuevas? — decision tomada (decision criticas tabla 3): solo nuevas
- ¿F5 (extender DET-29) se justifica empiricamente? — diferido sine die hasta evidencia

## Acceptance

Este spec se considera `done` cuando:

- Los 4 sessions cierran con gate continue
- `dkc-validate` sin args lista 17 kinds
- `dkc-validate StatusCoherence` sobre HOR-066 retorna exit 0; sobre HOR-015 (pre-cleanup) retorna exit 1
- Post-S4, `dkc-validate StatusCoherence` sobre todos los tickets `closed` retorna 0 drifts
- RULE-009 existe y valida
- `~/.claude/CLAUDE.md` y `INSTALL.md` mencionan node 22+
- HOR-065 tiene addendum con la revision del diagnostico
