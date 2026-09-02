---
id: SPEC-workflow-super-autopilot-discrimination
project: horadric
ticket: HOR-080
status: done
---

# Fix super autopilot — discriminacion por modo en bloques ejecutivos de execute/close

# Fix super autopilot — discriminacion por modo en bloques ejecutivos de execute/close

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive abajo. Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: el modo `autopilot: super` (definido por DET-30 / HOR-079) debe correr el ticket entero S1..SN sin pausar entre sessions ni pedir aprobaciones triviales. Hoy se sigue deteniendo por 5 puntos en steps que no discriminan `super` vs `true`. Este fix arregla los 5 puntos y refuerza la arquitectura para evitar que el patron reaparezca cuando se introduzca un bloque ejecutivo nuevo.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Approach Opcion 3 (root-cause + meta-fix) sobre Opcion 1 (B1 solo) o Opcion 2 (B1-B5 puntual) | Driver anti-regresion peso mas que minimo cambio. RULE-009 predice repeticion del patron. Opcion 3 mitiga sistemicamente |
| 2 | Patron canonical de discriminacion: callout blockquote "Single source of truth" + chequeo explicito `if autopilot === ...` + link a transversal.md:50-65 en cada bloque ejecutivo afectado | Sin patron explicito, el proximo dev/LLM va a duplicar logica de aprobacion. Con el patron, el siguiente bloque que se introduzca tiene template arquitectonico visible |
| 3 | NO modificar `prompts/deterministic-rules.md` ni la tabla maestra en `transversal.md:50-65` | Tocar la regla regenera el bloque global de CLAUDE.md impactando todos los proyectos DKC sin necesidad. La spec ya esta correcta — el bug es de aplicacion |

**Riesgos principales y como los mitigamos**:

- **Duplicacion textual de la tabla maestra en los bloques** (si copiamos la tabla en cada decision-point) → usar **referencias linkeables** (`Ver tabla maestra en [transversal.md:50-65](path)`) en vez de duplicar contenido. Reviewer aislado en cada gate de session valida que no haya duplicacion.
- **Regresion accidental del comportamiento de `false / strict / true`** → REQ-PRESERVE-1/2/3 + TC-6/7/8 cubren los 3 modos con tests manuales explicit. Reviewer aislado en S3 GATE verifica.
- **Emergencia de bloque ejecutivo no inventariado** en la auditoria → S3 incluye task de re-auditoria + grep amplio post-refactor para detectar bloques residuales.

**Que NO se hace en este ticket**:

- NO modificar `prompts/deterministic-rules.md` ni `transversal.md` tabla maestra (decision 3 arriba).
- NO crear validator nuevo en `commands/dkc-validate` (capa 4 del patron RULE-009) — solo si emerge en S3 GATE; sino queda como backlog `could`.
- NO refactorizar otros aspectos del sistema autopilot (badge HC, parser de sub-tabla Modo autopilot, hooks multi-repo). Esos son backlog del HOR-079 (B3, B4, B6) — fuera de scope.
- NO tocar archivos fuera de `execute_scope` declarado (5 paths en frontmatter HOR-080).

**Tamano estimado**: 3 sessions ejecutables (S1, S2, S3), aproximadamente 3-5h efectivas. **S3 es la mas riesgosa** — el refactor arquitectonico del meta-fix puede emerger validator nuevo y escalar a T3.

**Como vas a saber que funciona**:

- Activo `autopilot: super` en otro ticket DKC y al cerrar S{N}.GATE con `continue → S{N+1}`, el LLM avanza directo sin pausa (TC-1).
- Discovery de rule durante una task auto-crea el RULE-* sin pedir OK (TC-2).
- Scope discovery (nueva task descubierta) se reporta al chat y continua sin AskUserQuestion (TC-3).
- Backlog item se registra y continua sin "¿Confirmamos?" (TC-4).
- En cierre del ticket, sub-step teach-close NO emite AskUserQuestion en `super` (TC-5).
- `autopilot: true` SIGUE pausando en commit DET-27 (TC-6 regression).
- Push/merge/destructivo SIGUE preguntando en `super` (TC-8 red de seguridad).

---

## Purpose

Fix de discriminacion por modo autopilot en los bloques ejecutivos de `prompts/steps/request-execute/*` y `prompts/steps/request-close/*`. La spec del comportamiento (tabla maestra en `transversal.md:50-65`, especificada por DET-30) esta correcta; los bloques ejecutivos no la aplican. Este spec refuerza la capa 2 del patron RULE-workflow-enforcement-pattern-009 propagando la spec a los 5 puntos identificados (B1-B5) y agregando callouts arquitectonicos para anti-regresion futura.

## Requirements

### REQ-FIX-B1: Transicion inter-session en `super` avanza sin pausa

> **Que cambia**: cuando un ticket esta en `autopilot: super` y se cierra `S{N}.GATE` con decision `continue → Session N+1`, el LLM reporta el cierre + objetivo de S{N+1} al chat (streaming, REQ-04 de HOR-079) y avanza directo a `dkc-execute-task open-session N+1` sin esperar OK del dev.
> **Por que**: el dev activa `super` para correr S1..SN continuo. Hoy el bloque "Sync con el dev" de `session-gate.md:77-111` no chequea autopilot y por defecto conservador pausa.

El sistema MUST, en el bloque "Sync con el dev" de `session-gate.md:77-111`, chequear `frontmatter.autopilot` y discriminar el comportamiento por modo segun la tabla maestra de `transversal.md:50-65`. En `super`, NO pausar al cerrar la session; reportar al chat y continuar.

**Actor**: system (LLM autopilot)
**Layers**: meta

<details><summary>Scenarios de validacion</summary>

#### Scenario: super avanza directo
- **GIVEN** ticket con `autopilot: super`, status `in_progress`, `S5.GATE` cerrado con decision `continue`
- **WHEN** LLM ejecuta el bloque "Sync con el dev" de session-gate.md
- **THEN** LLM emite reporte streaming del cierre de S5 + objetivo de S6
- **AND** LLM invoca `dkc-execute-task open-session 6` sin pausar

#### Scenario: true pausa al commit (regression)
- **GIVEN** ticket con `autopilot: true`, status `in_progress`, S5 cerrando
- **WHEN** LLM ejecuta el bloque de commits DET-27 al final de la session
- **THEN** LLM pausa esperando OK del dev (comportamiento DET-27 intacto)

#### Scenario: false/strict supervisado (regression)
- **GIVEN** ticket con `autopilot: false` o `strict`
- **WHEN** LLM ejecuta cualquier gate
- **THEN** LLM pausa en cada decision-point (comportamiento supervisado intacto)

</details>

### REQ-FIX-B2: Crear rule desde discovery auto-ejecuta en `super`

> **Que cambia**: cuando una discovery de tipo rule emerge durante una task y el ticket esta en `super`, el LLM auto-crea el RULE-* sin emitir "Pedir confirmacion al dev". Registra entry en `decisions_log` para trazabilidad.
> **Por que**: hoy `task-loop.md:378-379` dice "Pedir confirmacion" sin discriminar autopilot. En `super`, esto es una pausa innecesaria — el dev ya autorizo el ticket.

El sistema MUST, en el bloque de discovery promotion de `task-loop.md:378-379`, chequear `frontmatter.autopilot` y auto-crear el RULE-* en `super` con entry observable en `decisions_log` (step=`rule-creation`, choice=`auto-create-super`).

**Actor**: system (LLM autopilot)
**Layers**: meta

<details><summary>Scenarios de validacion</summary>

#### Scenario: super auto-crea rule
- **GIVEN** `autopilot: super`, discovery de rule emerge durante task
- **WHEN** LLM ejecuta task-loop.md:378-379 promotion logic
- **THEN** LLM crea archivo `RULE-{module}-{seq}.md` directo
- **AND** registra entry `step: rule-creation, choice: auto-create-super` en decisions_log

#### Scenario: false/strict/true preguntan (regression)
- **GIVEN** `autopilot ∈ {false, strict, true}`
- **WHEN** discovery de rule emerge
- **THEN** LLM emite AskUserQuestion al dev (comportamiento actual intacto)

</details>

### REQ-FIX-B3: Scope discovery (nueva task) auto-continua en `super`

> **Que cambia**: cuando intra-session se descubre una task adicional y el ticket esta en `super`, el LLM reporta al chat la task agregada y continua sin "¿De acuerdo?".
> **Por que**: `session-gate.md:119-130` siempre pregunta. En `super`, el dev ya autorizo el alcance del ticket — pausar es interrupcion innecesaria.

El sistema MUST, en el bloque de scope discovery de `session-gate.md:119-130`, chequear `frontmatter.autopilot`. En `super`/`true` (optimistic): reportar la task agregada al chat (streaming) y continuar sin pausa. En `false`/`strict`: pausar con AskUserQuestion (comportamiento actual).

**Actor**: system (LLM autopilot)
**Layers**: meta

<details><summary>Scenarios de validacion</summary>

#### Scenario: super reporta y continua
- **GIVEN** `autopilot: super`, descubrimiento de task S5.T6 intra-session
- **WHEN** LLM ejecuta el bloque de scope discovery
- **THEN** LLM agrega S5.T6 a `**Tasks completadas**:` con `[ ]` y reporta al chat
- **AND** continua sin AskUserQuestion

#### Scenario: false/strict pausan (regression)
- **GIVEN** `autopilot ∈ {false, strict}`
- **WHEN** descubrimiento de task adicional
- **THEN** LLM emite AskUserQuestion "Se agrego task #{N}. ¿De acuerdo?"

</details>

### REQ-FIX-B4: Backlog item auto-registra en `super`

> **Que cambia**: cuando un item de backlog se registra y el ticket esta en `super`, el LLM lo agrega a `## Backlog` y continua sin "¿Confirmamos?".
> **Por que**: `session-gate.md:133-145` siempre confirma. En `super`/`true`, registrar al backlog es operacion segura (no destructiva, no irreversible) — pausar no aporta.

El sistema MUST, en el bloque de backlog registration de `session-gate.md:133-145`, chequear `frontmatter.autopilot`. En `super`/`true`: agregar fila a `## Backlog` y reportar al chat. En `false`/`strict`: pausar con AskUserQuestion.

**Actor**: system (LLM autopilot)
**Layers**: meta

<details><summary>Scenarios de validacion</summary>

#### Scenario: super registra y continua
- **GIVEN** `autopilot: super`, item descubierto fuera de scope
- **WHEN** LLM ejecuta backlog registration
- **THEN** LLM agrega fila a `## Backlog` con prioridad inferida + reporta al chat
- **AND** continua sin pausa

</details>

### REQ-FIX-B5: Sub-step teach-close auto-decide en `super` segun frontmatter

> **Que cambia**: en el sub-step teach-close de `checkpoints-and-close.md:269-331`, el LLM NO emite AskUserQuestion en `super`. Si `teachings.close: pending` → auto-generar (DET-30 REQ-05 obliga). Si `teachings.close: skipped` con razon valida (caso `false` previo) → respetar skip silencioso.
> **Por que**: hoy emite AskUserQuestion para `super`+`pending`. REQ-05 obliga generar en autopilot strict/true/super — no hay decision a tomar del dev.

El sistema MUST, en `checkpoints-and-close.md:269-331`, chequear `frontmatter.autopilot` Y `teachings.close`. En `autopilot ∈ {strict, true, super}` con `teachings.close: pending`: SALTAR AskUserQuestion y generar `teach-close.md` directo. Registrar entry observable (step=`teach-close-0b`, choice=`generate`, reason=`autopilot={valor}: skip no permitido por REQ-05`).

**Actor**: system (LLM autopilot)
**Layers**: meta

<details><summary>Scenarios de validacion</summary>

#### Scenario: super con teachings.close pending auto-genera
- **GIVEN** `autopilot: super`, `teachings.close: pending` al cierre
- **WHEN** LLM ejecuta sub-step teach-close
- **THEN** LLM NO emite AskUserQuestion
- **AND** genera `tickets/{TICKET-id}.teach/teach-close.md` directo
- **AND** registra entry decisions_log step=`teach-close-0b`, choice=`generate`

#### Scenario: false con teachings.close pending pregunta (regression)
- **GIVEN** `autopilot: false`, `teachings.close: pending`
- **WHEN** sub-step teach-close
- **THEN** AskUserQuestion: "¿Generar teach-close? (default: si)"

</details>

### REQ-FIX-META: Cada bloque ejecutivo referencia la tabla maestra como single source of truth

> **Que cambia**: cada uno de los 5 bloques afectados (B1-B5) abre con un callout blockquote markdown que linkea a `transversal.md:50-65` declarando explicit que la decision de pausar/continuar se rige por la tabla maestra.
> **Por que**: anti-regresion arquitectonica. Sin callouts visibles, el proximo bloque ejecutivo nuevo va a duplicar logica de aprobacion sin leer la tabla. El callout es la propagacion de capa 2 del patron RULE-workflow-enforcement-pattern-009 a nivel bloque.

El sistema MUST agregar un callout blockquote "Single source of truth" al inicio de cada bloque ejecutivo afectado por B1-B5. Patron canonical del callout:

```markdown
> **Single source of truth**: la decision de {pausar | confirmar | preguntar} se rige
> por la tabla maestra de [transversal.md:50-65](transversal.md#tabla-maestra) segun
> `frontmatter.autopilot`. Este bloque codifica el comportamiento concreto del step para
> cada modo — NO la spec.
```

El sistema MUST verificar la propagacion via grep al cierre de S3: `grep -l "transversal.md" prompts/steps/request-execute/*.md prompts/steps/request-close/*.md` retorna AL MENOS los 3 archivos afectados.

**Actor**: arquitectura
**Layers**: meta

<details><summary>Scenarios de validacion</summary>

#### Scenario: grep confirma propagacion
- **GIVEN** S3 closed con decision continue
- **WHEN** Ejecutar `grep -l "transversal.md" prompts/steps/request-execute/*.md prompts/steps/request-close/*.md`
- **THEN** Retorna >= 3 archivos (session-gate.md, task-loop.md, checkpoints-and-close.md)

#### Scenario: cada bloque tiene callout
- **GIVEN** Post-S3 refactor
- **WHEN** Lectura visual de session-gate.md, task-loop.md, checkpoints-and-close.md
- **THEN** Cada bloque B1-B5 abre con callout "Single source of truth" linkeando transversal.md

</details>

### REQ-PRESERVE-01: Modo `true` mantiene pausa en commit DET-27

> **Que cambia**: nada — comportamiento de `autopilot: true` queda intacto.
> **Por que**: regression bloqueante. El fix solo debe diferenciar `super` distinto de `true` donde DET-30 lo manda, NO cambiar `true`.

El sistema MUST mantener el comportamiento actual de `autopilot: true`: auto-aprueba ⚑ fuerte, pausa al commit DET-27 al cerrar cada session, entre tasks sin pausa.

### REQ-PRESERVE-02: Modos `false` y `strict` sin cambios

> **Que cambia**: nada — supervision conservadora intacta.
> **Por que**: regression bloqueante. Modos conservadores deben seguir pidiendo confirmacion en cada decision-point.

El sistema MUST mantener el comportamiento actual de `autopilot: false` (conversacional, supervisado) y `autopilot: 'strict'` (pausa siempre en ⚑ fuerte).

### REQ-PRESERVE-03: Acciones siempre-pregunta (red de seguridad) intactas

> **Que cambia**: nada — push/merge/destructivo/fuera-de-scope SIGUEN preguntando en todos los modos incluyendo `super`.
> **Por que**: red de seguridad de DET-30 transversal.md:69-74. Sin esto, `super` se vuelve peligroso.

El sistema MUST mantener intactas las 5 acciones "siempre-pregunta" de la tabla `transversal.md:69-74`: push, merge, close de ticket, archivos fuera de `execute_scope`, dependencias nuevas, operaciones destructivas. Ningun modo (incluyendo `super`) salta estas preguntas.

## Fix scope

### Antes (comportamiento actual)

5 bloques en 3 archivos no chequean `frontmatter.autopilot` para discriminar `super` vs `true`:

- `prompts/steps/request-execute/session-gate.md:77-111` — Sync inter-session (B1)
- `prompts/steps/request-execute/session-gate.md:119-130` — Scope discovery (B3)
- `prompts/steps/request-execute/session-gate.md:133-145` — Backlog registration (B4)
- `prompts/steps/request-execute/task-loop.md:378-379` — Crear rule (B2)
- `prompts/steps/request-close/checkpoints-and-close.md:269-331` — Sub-step teach-close (B5)

Resultado: `super` se comporta como `true` (pausa en cada decision-point), violando DET-30.

### Despues (comportamiento esperado)

Cada uno de los 5 bloques:

1. Abre con callout blockquote "Single source of truth" linkeando `transversal.md:50-65`
2. Chequea explicit `frontmatter.autopilot` y discrimina por modo (`super` vs otros)
3. En `super`: auto-ejecuta + entry observable en `decisions_log`
4. En otros modos: comportamiento actual

Resultado: `super` corre ticket completo S1..SN sin pausa; otros modos sin regresion.

### Archivos afectados

| File | Change | Impact |
|------|--------|--------|
| `prompts/steps/request-execute/session-gate.md` | 3 bloques modificados (B1, B3, B4): callout + discriminacion por modo | Steps de execute en todos los proyectos DKC |
| `prompts/steps/request-execute/task-loop.md` | 1 bloque modificado (B2): callout + discriminacion | Steps de execute |
| `prompts/steps/request-close/checkpoints-and-close.md` | 1 bloque modificado (B5): callout + discriminacion + entry observable | Cierre de ticket en todos los proyectos |

NO modificados:
- `prompts/deterministic-rules.md` (DET-30 ya correcta)
- `prompts/steps/request-execute/transversal.md` (tabla maestra ya correcta)
- Otros steps no inventariados (chequear en S3 task de re-auditoria)

## Tasks

> **Particion en sessions (DET-20)**: 3 sessions secuenciales. Numeracion empieza en S1 (el ticket no tiene `### Session N` previos — solo `### Plan de sessions`).

### Session 1 — Fix B1 + B3 + B4 en session-gate.md [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Implementar discriminacion B1 (Sync inter-session) en session-gate.md:77-111 + callout single source of truth | REQ-FIX-B1, REQ-FIX-META | developer | — | `prompts/steps/request-execute/session-gate.md` | TC-1 manual pasa (super avanza directo); TC-6/7/8 regression pasan | git revert | DET-5, DET-8, DET-10, DET-30, RULE-workflow-enforcement-pattern-009 | pending | 1 |
| S1.T2 | Implementar discriminacion B3 (Scope discovery) en session-gate.md:119-130 + callout | REQ-FIX-B3, REQ-FIX-META | developer | S1.T1 | `prompts/steps/request-execute/session-gate.md` | TC-3 manual pasa; TC-7 regression pasa | git revert | DET-5, DET-8, DET-10, DET-30 | pending | 1 |
| S1.T3 | Implementar discriminacion B4 (Backlog registration) en session-gate.md:133-145 + callout | REQ-FIX-B4, REQ-FIX-META | developer | S1.T2 | `prompts/steps/request-execute/session-gate.md` | TC-4 manual pasa; TC-7 regression pasa | git revert | DET-5, DET-8, DET-10, DET-30 | pending | 1 |
| S1.T4 | Revisar consumidores de session-gate.md (otros steps que lean de el) — analisis de impacto colateral | REQ-FIX-META | researcher | S1.T3 | (lectura) | Reportar consumidores; ninguno requiere cambios o lista pendientes | n/a | DET-5, DET-10, DET-11 | pending | 1 |
| S1.GATE | Gate de sync Session 1 (tier T2) — reviewer aislado approve, tests verdes, callouts presentes | REQ-FIX-B1, REQ-FIX-B3, REQ-FIX-B4 | reviewer | S1.T4 | n/a | TC-1/3/4 pass; TC-6/7/8 regression pass; reviewer approve; quality review DET-23 standard | n/a | DET-13, DET-14, DET-20, DET-23, DET-27, DET-30 | pending | 1 |

### Session 2 — Fix B2 + B5 en task-loop.md y checkpoints-and-close.md [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Implementar discriminacion B2 (Crear rule desde discovery) en task-loop.md:378-379 + callout + entry decisions_log | REQ-FIX-B2, REQ-FIX-META | developer | S1.GATE | `prompts/steps/request-execute/task-loop.md` | TC-2 manual pasa (super auto-crea rule + entry); TC-6/7 regression pasan | git revert | DET-5, DET-8, DET-10, DET-30 | pending | 2 |
| S2.T2 | Implementar discriminacion B5 (Sub-step teach-close AskUserQuestion) en checkpoints-and-close.md:269-331 + callout + entry decisions_log | REQ-FIX-B5, REQ-FIX-META | developer | S2.T1 | `prompts/steps/request-close/checkpoints-and-close.md` | TC-5 manual pasa (super con teachings.close=pending auto-genera, no AskUserQuestion); TC-7 regression pasa | git revert | DET-5, DET-8, DET-10, DET-30 | pending | 2 |
| S2.T3 | Verificar entries observables en `decisions_log` para B2 y B5 (paridad con HOR-058 convencion T2) | REQ-FIX-B2, REQ-FIX-B5 | reviewer | S2.T2 | (lectura de ticket markdown) | Entries presentes con choice=`auto-create-super` y `generate` respectivamente | n/a | DET-7, DET-13, DET-30 | pending | 2 |
| S2.GATE | Gate de sync Session 2 (tier T2) — reviewer aislado approve + Quality review DET-23 standard | REQ-FIX-B2, REQ-FIX-B5 | reviewer | S2.T3 | n/a | TC-2/5 pass; TC-6/7 regression pass; reviewer approve | n/a | DET-13, DET-14, DET-20, DET-23, DET-27, DET-30 | pending | 2 |

### Session 3 — Meta-fix arquitectonico [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Re-auditoria post-fix: grep amplio en `prompts/steps/` para detectar bloques ejecutivos no inventariados que NO chequeen autopilot pero deberian | REQ-FIX-META | researcher | S2.GATE | (lectura) | Lista de bloques residuales (cero esperado, sino agregar tasks en S3) | n/a | DET-5, DET-10, DET-11 | pending | 3 |
| S3.T2 | Aplicar patron canonical (callout single source of truth + discriminacion) a bloques residuales encontrados en S3.T1 (si los hay; si no, skip con justificacion) | REQ-FIX-META | developer | S3.T1 | (segun S3.T1) | TC-9 (grep verifica refs a transversal.md) pasa | git revert | DET-5, DET-8, DET-10, DET-30 | pending | 3 |
| S3.T3 | Evaluar necesidad de validator nuevo (capa 4 RULE-workflow-enforcement-pattern-009) que detecte drift bloque ↔ tabla. Decision: incluir en este ticket vs backlog `should` | REQ-FIX-META | architect | S3.T2 | (lectura) | Decision documentada inline en ticket como DEC-LOCAL. Si "incluir": agregar S3.T4. Si "backlog": item en `## Backlog` con prioridad `should` | n/a | DET-1, DET-2, DET-30 | pending | 3 |
| S3.GATE | Gate de sync Session 3 (tier T2 o T3 segun S3.T3 decision) — reviewer aislado approve + Quality review DET-23 exhaustive (cierre de ticket) | REQ-FIX-META, REQ-PRESERVE-01, REQ-PRESERVE-02, REQ-PRESERVE-03 | reviewer | S3.T3 (+ S3.T4 si aplica) | n/a | Todos los TCs (TC-1..TC-9) pass; reviewer approve; Quality review exhaustive 10 dimensiones | n/a | DET-13, DET-14, DET-16, DET-20, DET-23, DET-27, DET-30 | pending | 3 |

## Technical reference

- DET-30 raiz: [`prompts/deterministic-rules.md`](../../../prompts/deterministic-rules.md) seccion DET-30 (lineas ~1208+)
- Tabla maestra (single source of truth): [`prompts/steps/request-execute/transversal.md:50-65`](../../../prompts/steps/request-execute/transversal.md)
- Spec origen: [`SPEC-workflow-autopilot-safety-net`](SPEC-workflow-autopilot-safety-net.md) (HOR-079 — closed)
- Rule del patron de enforcement: [`RULE-workflow-enforcement-pattern-009`](../rules/workflow/RULE-workflow-enforcement-pattern-009.md)
- Ticket: [HOR-080](../tickets/HOR-080.md)
- Teach intake: [HOR-080.teach/teach-intake.md](../tickets/HOR-080.teach/teach-intake.md)

### Convencion T2 — entries observables (HOR-058)

En `super`, las decisiones que antes preguntaban al dev (B2 crear rule, B5 generar teach-close) ahora auto-ejecutan. La trazabilidad post-mortem se preserva via entries observables en `decisions_log`:

```yaml
decisions_log:
  - timestamp: '<ISO>'
    actor: llm-autopilot
    session: S{N}.T{M}
    step: rule-creation | teach-close-0b | scope-discovery-in-super | backlog-registration-in-super | sync-inter-session-in-super
    choice: auto-create-super | generate | auto-continue-super
    reason: 'autopilot=super — DET-30 REQ-{N} permite auto-ejecucion sin OK'
```

## Constraints

- **NO modificar** `prompts/deterministic-rules.md` ni `transversal.md` tabla maestra — la spec ya esta correcta. Modificar regenera CLAUDE.md global impactando otros proyectos sin necesidad.
- **NO duplicar contenido** de la tabla maestra en los bloques — usar referencias linkeables.
- **NO cambiar** comportamiento de modos `false`, `strict`, `true` — REQ-PRESERVE-01/02 lo prohiben.
- **NO saltar** acciones siempre-pregunta de la tabla en linea 69-74 (push, merge, destructivo, etc.) en NINGUN modo — REQ-PRESERVE-03 las preserva.
- **Limite del execute_scope**: solo paths declarados en frontmatter HOR-080. Si emerge necesidad de tocar fuera (ej. `commands/dkc-validate/*.ts`), preguntar al dev (red de seguridad super).

## Dependencies

- `SPEC-workflow-autopilot-safety-net` (HOR-079, closed) — fuente de DET-30. NO modificar.

## Risks

- **R1** (medio): el meta-fix de callouts agrega ~25 lineas extra de markdown across 5 bloques. Mitigacion: callouts compactos (3-4 lineas max), revisar densidad en S3 reviewer aislado.
- **R2** (medio): S3.T1 re-auditoria podria encontrar bloques no inventariados que escalen el scope. Mitigacion: documentar en backlog `must` o `should` segun severidad — solo incluir en este ticket si son del mismo patron arquitectonico.
- **R3** (bajo): validator nuevo (capa 4) en S3.T3 podria emerger y requerir T3 tier en S3.GATE. Mitigacion: decision explicita en S3.T3 entre incluir vs backlog. Default conservador: backlog `should`.
- **R4** (bajo): regresion accidental de modos `false`/`strict`/`true`. Mitigacion: TC-6/7 regression manuales en cada GATE; reviewer aislado verifica.

## Open questions

Sin open questions al cierre del design-fix. Todas las hipotesis convergieron en intake-explore (3/3 confirmed). La decision de Opcion 3 (root-cause + meta-fix) fue tomada por el dev. Decisiones tecnicas restantes (validator nuevo en S3.T3) se resuelven durante execute.

## Acceptance

El spec se considera implementado correctamente cuando:

- TC-1 a TC-9 del ticket HOR-080 (testing seccion) pasan con resultados registrados en sus columnas Actual/Evidence/Session/Cambios gatillados (DET-25)
- Grep `grep -l "transversal.md" prompts/steps/request-execute/*.md prompts/steps/request-close/*.md` retorna >= 3 archivos
- Quality review DET-23 en S3.GATE (exhaustive — cierre de ticket) marca pass en las 10 dimensiones aplicables
- Reviewer aislado (sub-agente o fallback inline) approve en S1, S2, S3 GATE
- Validacion de cierre reforzada (DET-30 REQ-03) approve: ningun archivo fuera de `execute_scope`, rama HOR-080 no toco develop/master
- `teach-close.md` generado (DET-22) con cobertura de 5 ejes
- `teachings.close: done` en frontmatter
