---
id: SPEC-dkc-execute-task-lazy-stubs
project: horadric
ticket: HOR-064
status: done
---

# Lazy stubs en dkc-execute-task: sessions futuras quedan `projected` hasta abrirse

# Lazy stubs en dkc-execute-task: sessions futuras quedan `projected` hasta abrirse

## Executive summary — lo que estas aprobando

> *Fix estructural: `dkc-execute-task init-ticket` deja de exigir stubs de TODAS las sessions execute upfront. Solo asegura el stub de la primera execute session. Las futuras viven en `### Plan de sessions` subseccion hasta que `open-session N` las instancie. Resultado: el detector de format drift del HC viewer deja de disparar falsos positivos durante la primera task de cada session.*

**Que se quiere**: Eliminar el falso positivo del banner "Format drift detectado" que aparecia al iniciar cada session en tickets multi-session DKC (reproducido empirico en TICKET-031). HC viewer ya soporta `projected` status para sessions del plan no ejecutadas — el fix es del lado deckard, no del HC.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Cambio surgical al loop de `cmd_init_ticket` — solo verifica stub de `first_n`, no de todas las filas del plan | Minima superficie de cambio, comportamiento del rest del comando intacto |
| 2 | `cmd_open_session N` ya bloquea si stub no existe — sin cambios funcionales aqui | Reforzar mensaje del error para clarity de LLM (UX improvement, no logic change) |
| 3 | NO se toca HC viewer (sessions.ts ni SectionSessions.vue) | Cero cambios al HC mantiene los 942 tests existentes intactos |
| 4 | DET-28 docs en `prompts/deterministic-rules.md` clarifica singular "tasks de la session actual al iniciarla" | Evita ambiguedad futura — LLM y devs alineados sobre el contrato |

**Riesgos y mitigaciones**:

- **Tickets DKC `in_progress` ya iniciados con el viejo init-ticket podrian estar con stubs futuros pre-escritos** → no rompe nada: el comando `session_stub_exists` retorna true, no exige re-escribir. Sessions futuras siguen mostrando shape canonical en HC hasta cerrar — patron viejo no se borra retro.
- **Algun consumer externo del comando `dkc-execute-task` esperaba el side-effect de pre-llenar stubs** → no hay consumers externos conocidos (solo workflow LLM). Bash help text actualizado.

**Que NO se hace**:

- NO tocar HC viewer (parser sessions.ts + UI SectionSessions.vue)
- NO migrar tickets `in_progress` con stubs viejos pre-escritos (compatibility-friendly)
- NO cambiar templates `templates/records/ticket.md` (`### Plan de sessions` ya es subseccion canonical)
- NO refactorizar el predicate del drift detector

**Tamano**: 3 sessions, ~1-2h total. La mas riesgosa: S3 (validacion empirica con ticket reproductor).

**Como vas a saber que funciona**:

- Creo ticket dummy DKC con plan de 3 sessions, corro `init-ticket` → solo S1 stub escrito; el viejo comportamiento (exigia S1+S2+S3) se elimina
- HC viewer renderea S2 y S3 como `projected` (sin banner drift)
- `dkc-execute-task open-session 2` en flow normal: pide al LLM que escriba el stub de S2 cuando llegue su turno, luego marca current_session=2

---

## Purpose

`dkc-execute-task init-ticket` actual exige stubs canonical de TODAS las sessions execute del plan al iniciar el ciclo execute. Esto produce shape canonical (`**Tasks completadas**:` bloque) en sessions futuras, lo que dispara el HC parser a marcarlas `in_progress` automatico, lo que a su vez dispara el detector de format drift durante la primera task de cada session (predicate `executed === 0 && in_progress >= 1 && pending >= 2`). Este fix lazy stubs elimina el shape canonical en sessions futuras hasta que se abran, evitando el falso positivo en su origen.

## Requirements

### REQ-FIX-01: init-ticket no exige stubs de sessions futuras

> **Que cambia**: el LLM ya no necesita escribir stubs de S2, S3, ... al entrar a execute. Solo el de S{primer N} es bloqueante.
> **Por que**: sessions futuras pre-llenadas con `**Tasks completadas**:` quedaban marcadas `in_progress` por HC parser, disparando falso positivo en el detector de drift.

El comando `dkc-execute-task init-ticket` MUST:
1. Validar existencia del `### Plan de sessions` con tabla no vacia (mantener actual)
2. Verificar que existe stub `### Session {first_n}` en `## Sessions` (donde `first_n` = primera fila del plan)
3. Si NO existe el stub de `first_n`: error bloqueante pidiendo al LLM que lo escriba (mantener mensaje de error con instrucciones)
4. Si existe: setear `current_session: first_n` en frontmatter + reindex + OK
5. NO iterar sobre otras filas del plan exigiendo stubs

**Scenarios de validacion**:

- GIVEN ticket DKC con plan de 3 sessions execute (S1, S2, S3) y solo stub de S1 escrito, WHEN se ejecuta `init-ticket`, THEN exit 0 con OK init-ticket
- GIVEN ticket DKC con plan de 3 sessions y NINGUN stub escrito, WHEN se ejecuta `init-ticket`, THEN exit 1 con mensaje "ERROR: stub de S1 falta" (similar al actual pero solo menciona S1, no las otras)
- GIVEN ticket DKC con plan de 3 sessions y stubs de S1, S2, S3 ya escritos (caso legacy), WHEN se ejecuta `init-ticket`, THEN exit 0 (idempotente — no borra stubs viejos, no exige re-escribir)

### REQ-FIX-02: open-session N mantiene comportamiento + mensaje clarificado

> **Que cambia**: nada funcional. Solo el mensaje del error es mas explicito sobre el LLM workflow esperado.
> **Por que**: en el nuevo flujo lazy, `open-session N` es el momento natural para crear el stub. El error debe guiar al LLM a escribirlo justo entonces.

El comando `dkc-execute-task open-session N` MUST:
1. Mantener su logica actual: si `session_stub_exists N` retorna false → exit 1
2. Mensaje del error actualizado: "ERROR: stub de Session N no existe. En flujo lazy stubs post-HOR-064, el LLM debe escribir el stub de S{N} ANTES de invocar open-session N (no en init-ticket). Template en `templates/records/ticket.md`."

### REQ-FIX-03: DET-28 clarifica singular

> **Que cambia**: la rule DET-28 en `prompts/deterministic-rules.md` deja explicito que el LLM copia tasks de la session **actual** (singular) al iniciarla, no de todas las execute.
> **Por que**: ambiguedad detectada en intake-explore. La interpretacion plural causo el patron del bug.

El archivo `prompts/deterministic-rules.md` MUST contener en DET-28 redaccion explicit: "tasks de la session ACTUAL al abrirla (singular). Sessions futuras viven en `### Plan de sessions` subseccion como filas projected; el stub `### Session N` con `**Tasks completadas**:` bloque se crea cuando `open-session N` la activa."

### REQ-PRESERVE-01: HC viewer sigue funcionando identico

> **Que cambia**: nada en HC viewer.
> **Por que**: cero touch HC mantiene los 942 tests del parser intactos.

Los archivos `horadric-cube/server/deckard/sessions.ts` y `horadric-cube/src/components/ticket-sections/SectionSessions.vue` MUST NOT modificarse en este ticket. Cualquier ajuste a HC se posterga a un ticket separado si emerge necesidad post-fix.

### REQ-PRESERVE-02: Tickets DKC `in_progress` legacy no se afectan

> **Que cambia**: nada para tickets ya iniciados con el viejo init-ticket.
> **Por que**: backwards compat — el LLM ya escribio stubs futuros, no los borramos retro.

El comando MUST ser idempotente sobre tickets legacy: si encuentra stubs de sessions ya escritos (S2, S3, ...) los acepta sin tocar.

## Artifacts

### Refactor map (cambios concretos)

| Action | Before | After | Reason |
|--------|--------|-------|--------|
| modify | `commands/dkc-execute-task:243-263` loop `while IFS='\|' read -r n ...` que itera todas las filas del plan | Reemplazar por single check sobre `first_n` (extraido en linea 236) | Lazy: solo S1 bloqueante |
| modify | `commands/dkc-execute-task:258-261` mensaje de error refiere "stub de S$n" | Actualizar a "stub de S$first_n (sessions futuras se crean lazy via open-session)" | Clarity del flujo nuevo |
| modify | `commands/dkc-execute-task:64-90` help text del init-ticket | Update doc del comando: "asegura el stub de la primera execute session; sessions futuras quedan implicit en Plan de sessions" | UX del LLM/dev |
| modify | `commands/dkc-execute-task:292-294` mensaje de error open-session | "post-HOR-064 lazy stubs: LLM debe escribir stub de S{N} antes de open-session N" | Guidance LLM |
| modify | `prompts/deterministic-rules.md` DET-28 enunciado | Singular explicit + ejemplo del flujo lazy | REQ-FIX-03 |

### Files affected

- `/Users/edobacon/Workspace/deckard/commands/dkc-execute-task` (bash script)
- `/Users/edobacon/Workspace/deckard/prompts/deterministic-rules.md` (DET-28 rule)

### Files NOT affected (verified)

- `/Users/edobacon/Workspace/deckard/templates/records/ticket.md` — `### Plan de sessions` ya es subseccion canonical, sin cambios
- `/Users/edobacon/Workspace/horadric-cube/server/deckard/sessions.ts` — parser sigue intacto
- `/Users/edobacon/Workspace/horadric-cube/src/components/ticket-sections/SectionSessions.vue` — UI sigue intacto

## Tasks

### Session 1 — Refactor cmd_init_ticket (lazy single-stub) + cmd_open_session message [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Reemplazar loop iterativo en `cmd_init_ticket` (lineas 243-263) por single check sobre `first_n`. Mantener: validacion del plan, set current_session, validate_post_write, do_reindex | REQ-FIX-01 | developer | — | `commands/dkc-execute-task` | grep + visual inspection: solo 1 check en lugar del loop; el comando ejecuta OK sobre ticket existente (TICKET-031 closed) y sobre HOR-064 (in_progress mid-execute) | git revert commit | DET-2, DET-8, DET-10 | pending | 1 |
| S1.T2 | Actualizar mensajes de error: en init-ticket "stub de S{first_n} falta..." (singular). En open-session "post-HOR-064 lazy stubs: ..." (REQ-FIX-02) | REQ-FIX-01, REQ-FIX-02 | developer | S1.T1 | `commands/dkc-execute-task` | grep mensajes nuevos presentes; bash -n syntax check pasa | git revert | DET-10, DET-16 | pending | 1 |
| S1.T3 | Actualizar help text del comando (lineas 64-90 init-ticket doc) para describir el nuevo comportamiento lazy | REQ-FIX-01 | developer | S1.T2 | `commands/dkc-execute-task` | `./commands/dkc-execute-task` (sin args) imprime help nuevo | git revert | DET-16 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T1)** — verificar bash script funcional + smoke con HOR-064 mismo (que esta in_progress mid-execute) | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido con decision continue/iterate | (no aplica) | DET-20, DET-23 | pending | 1 |

### Session 2 — Clarificar DET-28 en deterministic-rules [tipo: auto] [tier: T0] (doc-only)

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Grep DET-28 en `prompts/deterministic-rules.md`, actualizar enunciado a singular explicit + agregar nota sobre flujo lazy stubs introducido en HOR-064 | REQ-FIX-03 | developer | S1.GATE | `prompts/deterministic-rules.md` | grep DET-28 retorna nueva redaccion; lint frontmatter pasa | git revert | DET-16 | pending | 2 |
| S2.T2 | Verificar cross-references a DET-28 en `prompts/steps/`, templates, scripts. Actualizar si alguna asume "todas las sessions" upfront | REQ-FIX-03 | developer | S2.T1 | varios files | grep DET-28 sobre prompts/ + templates/ + commands/ retorna mentions actualizadas o N/A | git revert | DET-16 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T0)** — doc-only validacion | — | reviewer | S2.T1, S2.T2 | ticket | gate persistido | (no aplica) | DET-20, DET-23 | pending | 2 |

### Session 3 — Validacion empirica end-to-end [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Reproducir el caso original: con HOR-064 (este mismo ticket) `in_progress`, verificar que el nuevo `init-ticket` solo exige stub de su S1 (esta ahora ya escrito desde el plan refinado del intake-explore) | REQ-FIX-01 | developer | S2.GATE | proyecto deckard | `dkc-execute-task horadric HOR-064 init-ticket` exit 0 idempotente | (no aplica — read only) | DET-10, DET-13 | pending | 3 |
| S3.T2 | Smoke en HC viewer: abrir HOR-064 en HC `localhost:3016`, verificar que sessions S2 y S3 aparecen como `projected` (sin banner format drift) | REQ-PRESERVE-01 | reviewer (dev humano) | S3.T1 | HC dev runtime | screenshot HC sin banner amber visible | revert toda la branch | DET-13, DET-23 | pending | 3 |
| S3.T3 | Smoke regression: HC parser tests del proyecto horadric-cube siguen verdes (`npm test`) | REQ-PRESERVE-01 | developer | S3.T2 | horadric-cube | 942 tests pass (delta 0 vs baseline) | revert | DET-7, DET-13 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3) ⚑ fuerte** — dev valida visualmente la ausencia del banner + tests regresion verdes | — | reviewer (dev humano) | S3.T1, S3.T2, S3.T3 | ticket | gate persistido con dev approval | (no aplica) | DET-20, DET-23, DET-13 | pending | 3 |

## Constraints

- **DET-2**: source_ref en cada task (REQ-FIX-* o REQ-PRESERVE-*)
- **DET-7**: regression obligatoria — HC parser tests + manual smoke
- **DET-8**: rollback documentado (git revert atomico)
- **DET-10**: limites por rol (developer no decide spec, reviewer aprueba con evidencia)
- **DET-13**: cierre con evidencia (smoke + tests)
- **DET-16**: propagacion (si cambia init-ticket, tambien docs DET-28)
- **DET-20**: sessions con gate
- **DET-23**: quality review por gate
- **DET-25**: TCs registrados in-flight
- **DET-27**: commits granulares per session
- **DET-29**: persistencia in-flight via dkc-execute-task (irony: este spec usa el mismo comando que va a refactorizar)

## Risks

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|------------|--------|------------|
| `bash` sintax error post-refactor rompe el comando | Baja | Otros tickets DKC no pueden ejecutar execute | `bash -n` syntax check + smoke con HOR-064 mismo en S3 |
| Tickets DKC legacy con stubs futuros pre-escritos rompen con nuevo init-ticket | Muy baja | Tickets viejos quedan en limbo | `session_stub_exists` retorna true → comando idempotente, no exige re-escribir |
| HC viewer empieza a marcar sessions futuras diferente (regresion del parser) | Muy baja | Falso positivo opuesto: sessions visibles como `pending` cuando deberian `projected` | NO se toca HC viewer; tests 942 del parser cubren el comportamiento |

## Open questions

Ninguna activa. Decisiones criticas resueltas (scope B confirmado, no tocar HC, DET-28 singular).

## Acceptance

- [ ] `cmd_init_ticket` solo verifica `first_n`; loop sobre filas del plan eliminado
- [ ] Mensajes de error actualizados con guidance del flujo lazy
- [ ] DET-28 enunciado en singular explicit con nota sobre HOR-064
- [ ] HOR-064 mismo (in_progress) validable: init-ticket exit 0 idempotente
- [ ] HC viewer renderea S2 y S3 de HOR-064 como `projected` sin banner drift
- [ ] HC parser tests del proyecto horadric-cube siguen verdes (delta 0)
