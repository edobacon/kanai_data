---
id: SPEC-workflow-sp-llm-dev-differentiation-104
project: horadric
ticket: HOR-104
status: done
---

# SPEC — HOR-104: diferenciacion SP LLM/dev con speedup real (A+C-lite) + visibilidad en HC

# SPEC — HOR-104: diferenciacion SP LLM/dev con speedup real (A+C-lite) + visibilidad en HC

## Executive summary — lo que estas aprobando

> *Diseñada para revision rapida. Si te basta el Executive summary, ese es el objetivo.*

**Que se quiere**: que la descomposicion de Story Points en LLM/dev de DKC (a) **produzca un speedup real** en el metodo por defecto — hoy sale 0% por construccion — y (b) **se vea de un vistazo** en el kanban (card) y el grid de HC: total / dev / llm por ticket. La motivacion vino de la calibracion de SP4 (4 de 6 cerrados con speedup 0% no por falta de aporte del LLM sino porque `executed ≡ llm+human`).

**Decisiones criticas que necesitan tu OK** (racional en Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| A | `executed` se desacopla del proxy via **factor de compresion por work_type** aplicado a la porcion automatizable (DEC-LOCAL-01) | Es el corazon del fix: `executed = round(llm × c) + human`, con `c<1`. El speedup (`proxy − executed = llm × (1−c)`) deja de ser 0 sin pedir input nuevo |
| C-lite | **NO renombrar** campos del schema; clarificar significado en doc + calibracion + labels HC (DEC-LOCAL-02) | Evita migrar todos los tickets cerrados. La honestidad se logra en la presentacion |
| Backward-compat | Tickets ya cerrados NO se recalculan; el cambio aplica a cierres nuevos (DEC-LOCAL-03) | El motor es transversal a TODOS los proyectos — recalcular retroactivo reescribiria historia |
| Viz | Badge 3-segmentos en card + columnas en grid (+ roll-up `could`); tickets sin SP omiten el badge (DEC-LOCAL-04) | Lo que el dev pidio ver; sin ruido en tickets de proceso sin SP |

**Riesgos principales y mitigacion**:
- **Doble descuento** (el divisor de sesiones ya podria comprimir + c vuelve a comprimir) → DEC-LOCAL-01 separa explicito volumen (divisor) de compresion (c); OQ-1 lo marca para calibrar con datos.
- **Romper el motor SP de otros proyectos** → REQ-PRESERVE-05 + gate: ratios con default conservador, sin recalculo retroactivo, tests del calculo.
- **Cards/grid de tickets sin SP** (story_points null) → REQ-PRESERVE-05: el badge se omite, no "Σ 0", no rotos.

**Que NO se hace**: anclar `executed` en wall-clock real (B, follow-up); renombrar campos (C-full); recalcular tickets cerrados.

**Tamaño**: 4 sessions (~2-3 SP). La mas delicada es **S1** (cambio transversal al calculo).

**Como vas a saber que funciona**: (a) un ticket implement nuevo cierra con `executed < llm+human` y speedup > 0; (b) `dkc-sp-calibration` muestra speedup no-trivial en heuristicos; (c) la card del kanban muestra `Σtotal · 👤dev · 🤖llm`; (d) el grid tiene columnas total/dev/llm ordenables; (e) un ticket sin SP no muestra badge ni rompe; (f) tickets cerrados antes del cambio conservan su executed.

## Purpose

Mejorar el sistema de Story Points de DKC en dos planos: **motor** (deckard) — que el calculo por defecto de `executed` refleje la compresion del LLM (speedup real) y que la nomenclatura quede clara sin migracion (C-lite); y **viewer** (horadric-cube) — surfacear total/dev/llm en card del kanban y columnas del grid. Actor: el dev/PM que usa HC para leer el peso LLM vs humano del trabajo. Valor: planificacion (que delegar al LLM) + SP honestos ante el PM.

## Baseline (estado actual — obligatorio en improvement)

- **Calculo** (`prompts/steps/request-close/checkpoints-and-close.md` sec 5d paso 4): `executed = sp_suggested = sp_llm + sp_human`. → `proxy = executed` → `speedup = 0` salvo override `manual`.
- **Evidencia SP4** (eje pub→exec): 033 (5→8, 0%), 034 (3→6, 0%), 037 (1→4, 0%), 038 (1→5, 0%) heuristicos con speedup 0%; 035/036 (manual) con 33%.
- **HC**: `TicketSummary` NO expone `story_points` (verificado — grep en `api/client.ts`/shared types sin matches). `TicketCard.vue`/`TicketsGrid.vue` no renderizan SP. Es decir: la viz es net-new + requiere plomeria server→api→tipo.
- **Doc**: `docs/story-points.md` ya describe el modelo correcto (executed = proxy − speedup) pero el calculo no lo implementa.

## Requirements

### REQ-IMPROVE-01: `executed` por defecto refleja compresion del LLM (speedup real)

> **Que cambia**: al cerrar un ticket, el `executed` calculado por la heuristica deja de ser la suma cruda `llm+human`; aplica un factor de compresion a la parte automatizable, de modo que `executed < proxy` y el speedup sea > 0 sin que el dev tenga que hacer override manual.
> **Por que**: hoy el speedup es 0% por construccion — la diferenciacion no mide ahorro.

El sistema MUST calcular, en `request-close` sec 5d para `executed_method: sessions-heuristic`: `executed = round(sp_llm × compression_ratio[work_type]) + sp_human`, donde `compression_ratio < 1`. El `proxy humano-puro = sp_llm + sp_human` se preserva. El `delta_vs_calculated` MUST seguir reflejando override manual (no se altera su semantica). Si `sp_llm = 0`, `executed = sp_human` (sin cambio).

<details><summary>Scenarios de validacion</summary>

#### Scenario: implement nuevo con compresion
- **GIVEN** un ticket implement con `sp_llm=6`, `sp_human=2`, `compression_ratio[implement]=0.5`
- **WHEN** corre sec 5d
- **THEN** `executed = round(6×0.5)+2 = 5`, `proxy=8`, `speedup = 8−5 = 3 (37%)`

#### Scenario: explore (poco comprimible)
- **GIVEN** explore con `sp_llm=2`, `sp_human=3`, `compression_ratio[explore]=0.8`
- **WHEN** sec 5d
- **THEN** `executed = round(2×0.8)+3 = 5`, speedup bajo (~13%)

#### Scenario: sp_llm cero
- **GIVEN** `sp_llm=0`, `sp_human=2`
- **THEN** `executed = 2` (sin compresion aplicable)

</details>

### REQ-IMPROVE-02: C-lite — clarificar el significado sin renombrar

> **Que cambia**: el doc, el reporte de calibracion y los labels de HC explican que mide cada factor (dev = juicio no comprimible; llm = volumen automatizable humano-equivalente; executed = costo real con LLM), preservando los nombres de campo.
> **Por que**: `llm_factor`/`human_factor` se leen como "puntos del LLM/dev" pero significan otra cosa; la confusion se resuelve en la presentacion.

El sistema MUST mantener los nombres de campo del schema (`llm_factor_calculated`, `human_factor_calculated`, `executed`) sin cambios. El sistema MUST clarificar su significado en `docs/story-points.md` (tabla de interpretacion ya existe — reforzar) y en el output de `dkc-sp-calibration` (encabezados/leyenda). Los labels de HC (REQ-IMPROVE-03/04) MUST usar terminos claros ("dev"/"llm"/"total") con tooltip explicativo.

### REQ-IMPROVE-03: Badge SP total/dev/llm en la card del kanban

> **Que cambia**: cada card del kanban muestra en el footer un badge compacto `Σtotal · 👤dev · 🤖llm` + mini-bar proporcional dev|llm; speedup como hint secundario.
> **Por que**: leer el peso LLM vs dev de un vistazo, sin abrir el ticket.

El sistema MUST renderizar en `TicketCard.vue` un badge con `executed` (total), `human_factor_calculated` (dev) y `llm_factor_calculated` (llm) cuando el ticket tiene `story_points.executed != null`. El badge MUST usar el tema HC (amber/stone; dev=accent, llm=teal, total=neutro). El speedup (`proxy−executed`) MUST mostrarse como hint cuando > 0. Si `executed == null`: NO renderizar badge.

<details><summary>Scenarios de validacion</summary>

#### Scenario: card con SP
- **GIVEN** ticket cerrado con executed=5, dev=2, llm=3
- **THEN** la card muestra `Σ 5 · 👤 2 · 🤖 3` + mini-bar 40/60

#### Scenario: card sin SP
- **GIVEN** ticket con `story_points.executed: null` (explore/proceso)
- **THEN** la card NO muestra badge (sin "Σ 0")

</details>

### REQ-IMPROVE-04: Columnas SP en el grid

> **Que cambia**: la vista grid de tickets gana columnas total / dev / llm (+ speedup), ordenables.
> **Por que**: comparar el peso entre tickets y ordenar por dimension.

El sistema MUST agregar a `TicketsGrid.vue` columnas `Σ total`, `👤 dev`, `🤖 llm` y `speedup`, alimentadas de `story_points`. Las columnas numericas MUST ser ordenables. Tickets sin SP MUST mostrar celda vacia (no 0). El roll-up por columna (suma) es `could` (REQ-IMPROVE-06).

### REQ-IMPROVE-05: Exponer `story_points` en `TicketSummary` (plomeria)

> **Que cambia**: el endpoint de lista de tickets incluye `story_points` (al menos executed, llm_factor, human_factor) en el payload, y el tipo compartido lo refleja.
> **Por que**: hoy `TicketSummary` no expone SP — sin esto la card/grid no tienen datos.

El sistema MUST incluir `story_points` (executed, llm_factor_calculated, human_factor_calculated, published, estimated) en el `TicketSummary` que devuelve el server, y reflejarlo en el tipo compartido (`shared/types`). El campo MUST ser opcional/nullable (tickets sin SP).

### REQ-IMPROVE-06: Roll-up por columna del kanban (could)

> REQ opcional — auto-explicativo.

El sistema MAY mostrar, en el header de cada columna del kanban (`TicketsBoard.vue`), la suma de total/dev/llm de los tickets de esa columna. Si no se implementa: documentar como deferred, no bloquea cierre.

### REQ-IMPROVE-08: SP en la cabecera de la vista detalle del ticket

> **Que cambia**: al abrir un ticket (vista detalle), su cabecera muestra los SP que posee — total / dev / llm — sin tener que volver al tablero.
> **Por que**: el peso LLM/dev del ticket debe ser legible donde el dev lee el ticket completo, no solo en card/grid.

El sistema MUST renderizar en la **cabecera** de `TicketDetail.vue` el badge SP (`Σtotal · 👤dev · 🤖llm` + speedup) reusando el mismo `SpBadge` de la card (REQ-IMPROVE-03). MUST alimentarse de `story_points` del `TicketDetailPayload` (verificar que el payload de detalle lo exponga; si no, extender en S3.T1 junto con el summary). Si `executed == null`: NO renderizar badge (misma regla que la card).

<details><summary>Scenarios de validacion</summary>

#### Scenario: detalle con SP
- **GIVEN** abrir un ticket cerrado con executed=5, dev=2, llm=3
- **THEN** la cabecera del detalle muestra el badge `Σ 5 · 👤 2 · 🤖 3`

#### Scenario: detalle sin SP
- **GIVEN** abrir un ticket con `story_points.executed: null`
- **THEN** la cabecera NO muestra badge

</details>

### REQ-IMPROVE-09: Roster completo de sesiones en la seccion Sessions (planeadas + ejecutadas)

> **Que cambia**: la seccion Sessions del detalle muestra **todas** las sesiones del ticket (las N del plan) con su estado — ejecutada (✓) o pendiente — no solo los bloques ya ejecutados. El dev ve cuantas sesiones tiene el ticket de un vistazo, sin abrir el spec.
> **Por que**: hoy `SectionSessions.vue` solo renderiza los bloques `### Session N` ejecutados (lazy stubs DET-29/HOR-064 no materializa los futuros), asi que un ticket de 4 sesiones con 2 ejecutadas se ve como "2". El conteo real vive en `### Plan de sessions` / spec — menos practico.

El sistema MUST renderizar en `SectionSessions.vue` el **roster completo**: combinar las sesiones planeadas (`SessionPlanEntry[]`, ya parseadas por `server/deckard/sessionPlan.ts`) con las ejecutadas (`SessionSummary[]`), emparejadas por numero de sesion. Cada entrada MUST mostrar su estado: **ejecutada** (con link/expand al bloque) o **pendiente** (placeholder con objetivo del plan). El conteo total MUST reflejar las sesiones del plan (N), no solo las ejecutadas. El payload de detalle MUST exponer `SessionPlanEntry[]` (verificar `TicketDetailPayload`; si no esta, agregarlo — el server ya lo parsea). NO se materializan stubs markdown (se preserva DET-29 lazy); la visibilidad es de render.

<details><summary>Scenarios de validacion</summary>

#### Scenario: ticket 4 planeadas, 2 ejecutadas
- **GIVEN** HOR-104 con plan de 4 sesiones (S1-S4), S1/S2 ejecutadas, S3/S4 pendientes
- **THEN** la seccion Sessions muestra 4 entradas: S1✓ S2✓ S3(pendiente) S4(pendiente); conteo "2/4"

#### Scenario: ticket sin plan (quick/tactic)
- **GIVEN** un ticket sin `### Plan de sessions`
- **THEN** se muestran solo las sesiones ejecutadas (comportamiento actual, sin regresion)

</details>

### REQ-PRESERVE-07: Cero regresion del motor SP y de tickets cerrados

> **Que cambia**: nada para tickets ya cerrados (conservan su executed) ni para el calculo de los demas proyectos mas alla de la compresion. El override `manual` sigue funcionando igual.
> **Por que**: el motor SP es transversal (up1, bayley, etc.).

El sistema MUST NOT recalcular `story_points` de tickets ya `closed`. El sistema MUST preservar el path `executed_method: manual` (override del dev) sin cambios. El sistema MUST preservar el render de cards/grid de tickets sin `story_points` (no badge, no columnas pobladas, no errores).

## Changes (Modified / Added)

**Modified (deckard):**
- `prompts/steps/request-close/checkpoints-and-close.md` sec 5d — paso 4 del calculo (compresion).
- `docs/story-points.md` — formula (executed con compresion) + tabla de ratios + C-lite clarificacion.
- `commands/dkc-sp-calibration.md` — leyenda/encabezados C-lite + (la formula de speedup ya existe).

**Modified (horadric-cube):**
- `src/components/tickets/TicketCard.vue` — badge SP (kanban).
- `src/components/tickets/TicketsGrid.vue` — columnas SP (grid).
- `src/views/TicketDetail.vue` — badge SP en la **cabecera** del detalle (REQ-IMPROVE-08).
- `src/views/TicketsBoard.vue` — roll-up (could).
- `src/components/ticket-sections/SectionSessions.vue` — roster completo de sesiones (planeadas+ejecutadas) (REQ-IMPROVE-09).
- `src/api/client.ts` + `shared/types` — `story_points` en `TicketSummary` **y** verificar/exponer en `TicketDetailPayload`; exponer `SessionPlanEntry[]` en el payload de detalle si falta.
- `server/` — incluir `story_points` en el payload de lista y detalle; exponer el plan de sesiones parseado (`sessionPlan.ts` ya existe) en el detalle.

**Added (horadric-cube):**
- `src/components/tickets/SpBadge.vue` — mini-componente reusable en card + grid + cabecera del detalle (recomendado, no opcional: 3 consumidores justifican extraerlo).

## Tasks

### Session 1 — A: compresion de executed en el motor [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: []  <!-- secuencial: calculo -> doc -> tests del calculo -->

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Redefinir sec 5d paso 4: `executed = round(sp_llm × compression_ratio[work_type]) + sp_human`; agregar tabla de ratios (DEC-LOCAL-01); preservar proxy y override manual | REQ-IMPROVE-01 | developer | — | prompts/steps/request-close/checkpoints-and-close.md | review manual: formula correcta, sp_llm=0 manejado, manual intacto | git revert | DET-5, DET-8, DET-16 | done | 1 |
| S1.T2 | Actualizar `docs/story-points.md`: formula con compresion + tabla ratios + nota OQ-1 (doble descuento) | REQ-IMPROVE-01, REQ-IMPROVE-02 | scribe | S1.T1 | docs/story-points.md | doc consistente con sec 5d | git revert | DET-16 | done | 1 |
| S1.T3 | Backward-compat: documentar en sec 5d que tickets closed NO se recalculan; manual preservado (REQ-PRESERVE-07) | REQ-PRESERVE-07 | developer | S1.T1 | prompts/steps/request-close/checkpoints-and-close.md | nota explicita presente | git revert | DET-8 | done | 1 |
| **S1.GATE** | Gate de sync S1 (T2, ⚑ fuerte): reviewer aislado del cambio de calculo (transversal), decidir continue | — | reviewer | S1.T3 | tickets/HOR-104.md | gate persistido + formula validada | — | DET-20, DET-23, DET-27, DET-29 | done | 1 |

### Session 2 — C-lite: labels en calibracion + cierre del frente motor [tipo: auto] [tier: T1]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Clarificar leyenda/encabezados de `dkc-sp-calibration` (dev=juicio no comprimible, llm=volumen automatizable, total=executed con LLM) sin renombrar campos | REQ-IMPROVE-02 | developer | S1.GATE | commands/dkc-sp-calibration.md | leyenda clara; campos sin renombrar | git revert | DET-16 | done | 2 |
| **S2.GATE** | Gate de sync S2 (T1): review light, decidir continue a viz | — | reviewer | S2.T1 | tickets/HOR-104.md | gate persistido | — | DET-20, DET-23, DET-27 | done | 2 |

### Session 3 — Viz: plomeria + badge en card [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: []  <!-- secuencial: plomeria server/api/tipo -> badge card -->

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T0 | Setup rama HOR-104 en horadric-cube desde main (main es protegida — DET-30) | — | developer | S2.GATE | (git horadric-cube) | `git branch --show-current` = HOR-104 | borrar rama | RULE-dev-004, DET-30 | done | 3 |
| S3.T1 | Exponer `story_points` en `TicketSummary`: server payload + `shared/types` + `api/client.ts` (REQ-IMPROVE-05) | REQ-IMPROVE-05 | developer | S3.T0 | horadric-cube/server/, horadric-cube/shared/types, horadric-cube/src/api/client.ts | tipo compila; payload incluye story_points; nullable | git revert | DET-5, DET-8 | done | 3 |
| S3.T2 | Badge SP en `TicketCard.vue` (Σtotal/👤dev/🤖llm + mini-bar + hint speedup); omitir si executed null. Opcional `SpBadge.vue` reusable | REQ-IMPROVE-03, REQ-PRESERVE-07 | developer | S3.T1 | horadric-cube/src/components/tickets/TicketCard.vue (+ SpBadge.vue opcional) | build vite OK; card con/ sin SP correctos | git revert | DET-5, DET-16 | done | 3 |
| **S3.GATE** | Gate de sync S3 (T2, ⚑ fuerte): reviewer aislado + screenshot card (PW), decidir continue | — | reviewer | S3.T2 | tickets/HOR-104.md | gate persistido + evidencia visual | — | DET-20, DET-23, DET-25, DET-27, DET-29 | done | 3 |

### Session 4 — Viz grid + roll-up + cierre [tipo: auto] [tier: T2]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Columnas Σtotal/👤dev/🤖llm/speedup ordenables en `TicketsGrid.vue`; celda vacia si sin SP | REQ-IMPROVE-04, REQ-PRESERVE-07 | developer | S3.GATE | horadric-cube/src/components/tickets/TicketsGrid.vue | build OK; orden funciona; sin-SP vacio | git revert | DET-5 | done | 4 |
| S4.T2 | Badge SP en la cabecera de `TicketDetail.vue` (reusa `SpBadge` de S3); alimentar de `TicketDetailPayload.story_points`; omitir si executed null | REQ-IMPROVE-08 | developer | S4.T1 | horadric-cube/src/views/TicketDetail.vue | build OK; cabecera con/sin SP correcta | git revert | DET-5, DET-16 | done | 4 |
| S4.T3 | Roster completo de sesiones en `SectionSessions.vue`: merge planeadas (`SessionPlanEntry[]`)+ejecutadas, mostrar las N con estado; exponer plan en `TicketDetailPayload` si falta | REQ-IMPROVE-09 | developer | S4.T2 | horadric-cube/src/components/ticket-sections/SectionSessions.vue, horadric-cube/src/api/client.ts, horadric-cube/server/ | build OK; HOR-104 muestra 4 (2/4); ticket sin plan sin regresion | git revert | DET-5, DET-16 | done | 4 |
| S4.T4 | Roll-up por columna en `TicketsBoard.vue` (could — implementar si cabe, sino deferir documentado) | REQ-IMPROVE-06 | developer | S4.T3 | horadric-cube/src/views/TicketsBoard.vue | suma por columna o deferred documentado | git revert | DET-16 | done | 4 |
| S4.T5 | Review final + commits DET-27 (deckard + horadric-cube) + screenshots (grid + detalle + roster) | — | reviewer | S4.T4 | horadric-cube/, deckard/ | build OK, commits, evidencia | git reset local | DET-13, DET-27 | done | 4 |
| **S4.GATE** | Gate de cierre S4 (T2): validacion reforzada DET-30 (2 repos), teach-close, status closed | — | reviewer | S4.T5 | tickets/HOR-104.md | teach-close + acceptance | — | DET-20, DET-22, DET-30 | done | 4 |

## Technical reference

- **Calculo SP**: `prompts/steps/request-close/checkpoints-and-close.md` sec 5d (paso 1 factor LLM `ceil(sessions/divisor)`, paso 2 factor humano markers, paso 4 `executed = sp_suggested`).
- **Divisores actuales**: refactor 2.0, implement 1.5, fix 2.5, improvement 2.0, explore 1.0.
- **Schema SP**: `commands/lib/schemas/ticket.ts` L106-119 (`story_points` block).
- **Doc**: `docs/story-points.md` L99-160 (interpretacion + formula + trade-offs; trade-off #1 = el problema que A resuelve).
- **HC card**: `horadric-cube/src/components/tickets/TicketCard.vue` (tokens: bg-card, text-accent-hi, border-l-*, bg-ok-bg). Grid: `TicketsGrid.vue`. Board: `views/TicketsBoard.vue`.
- **API/types**: `src/api/client.ts` (`TicketSummary`), `shared/types`. Server arma el summary (verificar fuente: index.db vs markdown).

## Constraints

- **Motor transversal**: el cambio de calculo afecta el cierre de TODOS los proyectos. Default conservador + sin recalculo retroactivo (REQ-PRESERVE-07).
- **RULE-dev-004 (horadric ownership: solo)**: horadric-cube es proyecto propio del dev; rama de ticket HOR-104, commits modo libre permitido (info DKC OK).
- **Tema HC**: respetar tokens amber/stone; no introducir colores fuera del sistema (dev=accent, llm=teal son del tema).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `story_points` en el index/payload del server | internal | La viz necesita que el server exponga SP en TicketSummary (REQ-IMPROVE-05) | bajo — campo ya en frontmatter/index |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Doble descuento (divisor ya comprime + c) | medium | medium | DEC-LOCAL-01 separa volumen/compresion; OQ-1 a calibrar; ratios conservadores |
| Regresion en cierre de otros proyectos | low | high | REQ-PRESERVE-07 + gate ⚑ S1 + sin recalculo retroactivo |
| Card/grid rompe con tickets sin SP | medium | medium | REQ-PRESERVE-07: omitir badge/celda; test con ticket sin SP |
| Plomeria server→tipo incompleta | medium | medium | S3.T1 dedicada antes del badge; tipo nullable |

## Open questions

- **OQ-1**: ¿el divisor de sesiones (paso 1) ya incorpora parte de la compresion del LLM? Si la calibracion futura muestra que `executed` con compresion queda demasiado bajo (doble descuento), subir los `compression_ratio` hacia 1 o ajustar el divisor. Decision pragmatica: arrancar con ratios conservadores (implement 0.5) y calibrar con `dkc-sp-calibration` cuando haya 5+ tickets cerrados post-cambio. Residual para revision del dev.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: `executed = round(sp_llm × compression_ratio[work_type]) + sp_human`
- **Contexto**: el default fijaba `executed = sp_llm + sp_human` → speedup 0.
- **Drivers**: el speedup debe ser no-trivial sin pedir input nuevo; el modelo del doc ya quiere `executed < proxy`.
- **Opcion elegida**: factor de compresion por work_type sobre la porcion automatizable. Ratios iniciales: refactor 0.4, implement 0.5, improvement 0.5, fix 0.6, explore 0.8 (mas decisional = menos comprimible). `proxy = sp_llm + sp_human` se preserva.
- **Alternativas**: (a) anclar executed en wall-clock (B) — descartada: fuera de alcance, requiere instrumentar sessions; (b) compresion fija unica — descartada: explore y refactor comprimen distinto.
- **Consecuencias**: speedup real en heuristicos; riesgo de doble descuento (OQ-1).
- **Session**: design.

### DEC-LOCAL-02: C-lite (clarificar, no renombrar)
- **Contexto**: `llm_factor`/`human_factor` confunden ("puntos del LLM/dev" vs significado real).
- **Drivers**: renombrar implica migrar todos los tickets cerrados con SP poblado (transversal).
- **Opcion elegida**: preservar nombres; clarificar en doc + calibracion + labels HC con tooltip.
- **Alternativas**: C-full (renombrar a automatable_proxy/judgment_proxy) — descartada por costo de migracion.
- **Consecuencias**: cero migracion; la honestidad vive en la presentacion.
- **Session**: design (confirmado por dev en intake).

### DEC-LOCAL-03: sin recalculo retroactivo
- **Contexto**: cambiar el calculo no debe reescribir tickets ya cerrados.
- **Opcion elegida**: el nuevo calculo aplica solo a cierres nuevos; closed se conserva.
- **Consecuencias**: la serie historica mezcla pre/post-compresion — `dkc-sp-calibration` puede notarlo.
- **Session**: design.

### DEC-LOCAL-04: badge 3-segmentos, omitir sin SP
- **Contexto**: como mostrar total/dev/llm sin ruido.
- **Opcion elegida**: badge `Σtotal · 👤dev · 🤖llm` + mini-bar; omitir si executed null.
- **Session**: design (draft v1 aprobado).

## Acceptance checkpoints

- [ ] **Funcional**: REQ-IMPROVE-01..05 cumplidos; REQ-IMPROVE-06 (could) implementado o deferido
- [ ] **Motor**: ticket implement nuevo cierra con executed < proxy y speedup > 0 (REQ-IMPROVE-01)
- [ ] **C-lite**: doc + calibracion clarifican significado sin renombrar campos (REQ-IMPROVE-02)
- [ ] **Viz card**: badge total/dev/llm con tema HC; sin SP omite badge (REQ-IMPROVE-03)
- [ ] **Viz grid**: columnas ordenables; sin SP vacio (REQ-IMPROVE-04)
- [ ] **Viz detalle**: cabecera de TicketDetail muestra badge SP (reusa SpBadge); sin SP omite (REQ-IMPROVE-08)
- [ ] **Roster sesiones**: SectionSessions muestra las N sesiones del plan con estado (HOR-104 → 2/4); ticket sin plan sin regresion (REQ-IMPROVE-09)
- [ ] **Plomeria**: TicketSummary expone story_points (REQ-IMPROVE-05)
- [ ] **Regresion**: tickets closed sin recalcular; manual intacto; sin-SP no rompe (REQ-PRESERVE-07)
- [ ] **Teach**: teach-close generado (DET-22)

## Archiving

Cuando HOR-104 cierre, este spec vive en `specs/`. Mover a `_archive/` solo si una version superior lo reemplaza.
