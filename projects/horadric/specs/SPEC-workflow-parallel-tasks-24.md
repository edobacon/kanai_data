---
id: SPEC-workflow-parallel-tasks-24
project: horadric
ticket: HOR-024
status: done
---

# Async tasks paralelas dentro de session

# Async tasks paralelas dentro de session

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle tecnico vive en Requirements y Tasks. Si te basta con leer esto para decidir, ese es el objetivo.*

**Que se quiere**: hoy las tasks de una misma session se ejecutan en serie aunque sean independientes — eso desperdicia 20-30% del tiempo de reloj en tickets multi-feature (caso real: HOR-022 S3+S4). Este cambio permite que `design-{tipo}` marque que tasks pueden correr en paralelo (un bloque `parallel_groups` por session) y que `request-execute` las invoque concurrentes esperando a todas antes del gate. Es **opt-in**: lo que no se marca sigue corriendo como hoy. Ademas, el sistema detecta si el host LLM soporta concurrencia y degrada a secuencial si no, y HC muestra visualmente que tasks estan agrupadas para paralelo.

**Decisiones criticas que necesitan tu OK** (cada una con racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Notacion `parallel_groups` fuera de la tabla (no 12va columna) — AQ-1 opcion C | Cero cambios al shape canonico de 11 columnas, al gate F8 ni al parser; sin redundancia bidireccional |
| 2 | Capability-detection del host antes de paralelizar + fallback secuencial | DKC corre en multiples hosts (Codex/Cursor/Ollama no soportan multi tool_use); asumir concurrencia romperia la portabilidad |
| 3 | El spec dogfoodea la feature: S1.T1+S1.T2 declaradas como `parallel_group` | Valida la mecanica end-to-end en el propio ticket y deja un ejemplo canonico para futuros specs |

**Riesgos principales y como los mitigamos**:

- **Paralelizar tasks que en realidad colisionan (mismo archivo → race condition)** → la heuristica exige las 4 condiciones (a-d) simultaneas; ante cualquier duda, NO se paraleliza (conservador por default).
- **Host sin soporte de concurrencia ejecuta multi tool_use y falla** → REQ-IMPROVE-03 verifica capability ANTES de invocar; si no la soporta, corre el grupo en serie (peor caso = tan lento como hoy, nunca roto).
- **El quality review evalua con tasks paralelas a medio terminar** → el gate espera a que TODOS los Agent del grupo retornen antes de DET-23/DET-25 (semantica "esperar a todos" de async_execution).

**Que NO se hace en este ticket** (limites explicitos del scope):

- NO se paralelizan sessions completas — DET-20 sigue siendo estrictamente secuencial entre sessions.
- NO hay inferencia automatica en execute: si el design no declaro `parallel_groups`, execute no adivina.
- NO se permite paralelizar tasks que tocan el mismo archivo (condicion a de la heuristica).

**Tamano estimado**: 5 sessions ejecutables (S1-S5), ~6-9h efectivas. La mas riesgosa es **S4** (unico cambio de codigo real: parser `body.ts` + componente Vue del viewer); S2 y S3 son cambios de proceso (prompts) con gate `⚑ fuerte` porque alteran la mecanica de ejecucion.

**Como vas a saber que funciona** (criterios observables):

- Aplico la heuristica a HOR-022 retroactivo y S3+S4 quedan declaradas en un `parallel_group`.
- Un ticket fixture con 2 tasks paralelas: en execute se invocan en un solo mensaje (multi tool_use) y ambas cierran antes del gate.
- Un ticket sin `parallel_groups` se ejecuta task-por-task igual que hoy.
- En HC abro un spec con `parallel_groups` y veo las tasks del grupo marcadas con un badge/highlight.

---

## Purpose

Reducir el wall-clock de ejecucion de tickets multi-task habilitando paralelizacion **opt-in y segura** de tasks independientes dentro de una session, sin alterar la secuencialidad entre sessions (DET-20) ni el comportamiento de los tickets que no la usan. Para el dev DKC: tickets acotados con tasks independientes terminan antes; para hosts sin soporte de concurrencia: degradacion transparente a secuencial.

## Requirements

### REQ-IMPROVE-01: Heuristica de paralelizacion + declaracion explicita en design

> **Que cambia**: al particionar las sessions, `design-{tipo}` evalua que tasks pueden correr en paralelo y lo declara en un bloque `parallel_groups` bajo cada `### Session N`, dejando legible cuales son paralelas y cuales secuenciales (por dependencia o mismo archivo).
> **Por que**: hoy todo corre en serie aunque sea independiente; sin una declaracion explicita en design, execute no tiene forma de saber que puede paralelizar.

El architect en `design-{tipo}` MUST evaluar, para cada par de tasks de una misma session, las 4 condiciones de elegibilidad:

- **(a)** no comparten archivos modificados (columna `Files`)
- **(b)** sus rules no se cruzan de forma conflictiva (columna `Rules`)
- **(c)** sus validation gates son independientes (columna `Validation` — no testean lo mismo)
- **(d)** ninguna depende del output de otra (columna `Depends on`)

Si las 4 se cumplen, las tasks SHOULD declararse en un `parallel_group`. El bloque MUST vivir **fuera de la tabla de tasks**, bajo el header `### Session N`, con shape `parallel_groups: [[S{N}.T{x}, S{N}.T{y}], ...]`. El template y `_design-shared.md` MUST documentar la heuristica y un ejemplo. Ante cualquier duda sobre una condicion, la task NO se paraleliza (default conservador).

**Actor**: system (architect en design)
**Layers**: meta (templates + prompts)

<details><summary>Scenarios de validacion</summary>

#### Scenario: tasks independientes detectadas
- **GIVEN** una session con T1 (toca `a.ts`) y T2 (toca `b.ts`), sin dependencias ni rules cruzadas
- **WHEN** el architect aplica la heuristica
- **THEN** declara `parallel_groups: [[S{N}.T1, S{N}.T2]]` bajo el header de la session

#### Scenario: tasks con dependencia NO se paralelizan
- **GIVEN** T2 con `Depends on: S{N}.T1`
- **WHEN** el architect evalua la condicion (d)
- **THEN** T1 y T2 quedan secuenciales (no entran a ningun `parallel_group`)

#### Scenario: tasks mismo archivo NO se paralelizan
- **GIVEN** T1 y T2 ambas tocan `request-execute.md`
- **WHEN** se evalua la condicion (a)
- **THEN** quedan secuenciales (riesgo de race condition)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: aplico la heuristica a HOR-022 y S3+S4 quedan en un `parallel_group`; aplico al propio spec de HOR-024 y S1.T1+S1.T2 quedan agrupadas mientras S2-S5 quedan secuenciales.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Heuristica HOR-022 retroactivo | spec HOR-022 | aplicar 4 condiciones a S3/S4 | detectables paralelas | `parallel_groups: [[S3.T*, S4.T*]]` valido |
| 2 | Bloque parallel_groups es opcional | spec sin el bloque | parsear/validar shape | gate de 11 columnas no bloquea | spec valido sin `parallel_groups` |

### REQ-IMPROVE-02: Ejecucion concurrente + consolidacion en el gate

> **Que cambia**: `request-execute` lee `parallel_groups` de la session e invoca los Agent de esas tasks en paralelo (multiples tool_use en un mensaje), esperando a que TODAS terminen antes de correr el quality review (DET-23) y la consolidacion de evidencia (DET-25).
> **Por que**: aqui se materializa el ahorro de wall-clock; y sin "esperar a todos", el gate evaluaria con tasks incompletas.

El ciclo por task de `request-execute.md` MUST, al encontrar un `parallel_group` cuyas tasks estan listas (precondiciones cumplidas), invocar sus Agent de forma concurrente en un unico mensaje con multiples bloques tool_use. El step MUST esperar a que todos retornen antes de avanzar. El `S{N}.GATE` MUST consolidar DET-23 (las 10 dimensiones) y DET-25 (evidencia inline) leyendo el resultado de TODAS las tasks del grupo, no solo la ultima en retornar; el gate pasa `continue` solo si todas pasan. Las transiciones DET-29 (`start-task`/`done-task`) MUST registrarse por cada task del grupo.

**Actor**: system (LLM principal en execute)
**Layers**: meta (request-execute)

<details><summary>Scenarios de validacion</summary>

#### Scenario: invocacion concurrente
- **GIVEN** una session con `parallel_groups: [[S{N}.T1, S{N}.T2]]` y ambas con precondiciones cumplidas
- **WHEN** request-execute llega al grupo
- **THEN** emite un mensaje con 2 bloques tool_use (uno por task) y espera a ambos

#### Scenario: gate espera a todos
- **GIVEN** T1 retorna antes que T2
- **WHEN** se evalua el `S{N}.GATE`
- **THEN** el quality review NO corre hasta que T2 tambien retorne; consolida ambas

#### Scenario: una task del grupo falla
- **GIVEN** T1 pasa pero T2 falla su validacion
- **WHEN** se consolida el gate
- **THEN** decision = `iterate` (el grupo no pasa hasta resolver T2)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en un ticket fixture con 2 tasks paralelas, observo en el transcript un solo mensaje con 2 tool_use concurrentes, ambas cierran, y el gate consolida las dos antes de decidir.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 3 | Concurrencia + espera | fixture 2 tasks paralelas | execute del grupo | multi tool_use; ambas done; gate consolida | quality review pass solo si las 2 pass |

### REQ-IMPROVE-03: Capability-detection del host + degradacion segura

> **Que cambia**: antes de invocar tasks en paralelo, el sistema verifica si el host LLM soporta ejecucion concurrente (multi tool_use en un mensaje). Si no la soporta, ejecuta el grupo task-por-task en serie y registra la decision como entry observable.
> **Por que**: DKC se proyecta a multiples hosts (Claude Code si, Codex/Cursor/Ollama frecuentemente no); asumir concurrencia romperia esos hosts.

El step de execute MUST resolver una capability `supports_parallel_execution` del host antes de invocar un `parallel_group`. La resolucion sigue el orden: `config.yaml > tiers/host` (override por proyecto) → tabla multi-provider de `prompts/agent-tiers.md` (default por host conocido) → asumir `false` (conservador) si el host es desconocido. Si la capability es `false`, el grupo MUST ejecutarse secuencialmente (cada task en su propio turno) con resultado funcional identico. La decision MUST registrarse via `dkc-record-decision --step parallel-execution --choice <parallel|sequential-fallback>` con `reason` obligatoria cuando es fallback (auditabilidad cross-host, patron HOR-060).

**Actor**: system
**Layers**: meta (agent-tiers + config + request-execute)

<details><summary>Scenarios de validacion</summary>

#### Scenario: host con soporte
- **GIVEN** host Anthropic Claude Code (`supports_parallel_execution: true`)
- **WHEN** execute encuentra un `parallel_group`
- **THEN** invoca concurrente; registra `choice: parallel`

#### Scenario: host sin soporte
- **GIVEN** host tipo Codex (`supports_parallel_execution: false`)
- **WHEN** execute encuentra un `parallel_group`
- **THEN** ejecuta las tasks en serie; registra `choice: sequential-fallback` + reason citando el host

#### Scenario: host desconocido
- **GIVEN** un host no listado en la tabla multi-provider y sin override en config
- **WHEN** se resuelve la capability
- **THEN** asume `false` (conservador) → ejecucion secuencial

</details>

#### Acceptance
**El usuario puede verificar que funciona**: simulo `supports_parallel_execution: false` y el mismo plan corre task-por-task con una entry `sequential-fallback` en `decisions_log`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 4 | Fallback secuencial | host sin soporte | execute de un grupo | tasks en serie + entry observable | `decisions_log` con `parallel-execution: sequential-fallback` |

### REQ-IMPROVE-04: HC indica visualmente las tasks paralelas

> **Que cambia**: en HC, las tasks consideradas para ejecucion paralela se muestran con un indicador visual (badge "∥" / highlight de grupo) en el arbol de sessions del spec (`SpecSessionTree`).
> **Por que**: el dev necesita ver de un vistazo que se paralelizo al revisar/aprobar el plan, sin leer el markdown crudo.

El parser `horadric-cube/server/deckard/body.ts` MUST extraer el bloque `parallel_groups` de cada `### Session N` y exponerlo en la estructura de session (`PhaseStats`). El componente `SpecSessionTree.vue` MUST renderizar un indicador (badge o highlight de color de grupo) sobre las tasks cuyo id pertenece a algun `parallel_group` de su session. El indicador MUST cumplir accesibilidad (no depender solo del color — incluir texto/icono "∥"). Si el spec no tiene `parallel_groups`, el viewer MUST renderizar exactamente como hoy (sin indicador, sin error).

**Actor**: user (dev en HC)
**Layers**: backend (parser) + frontend (componente Vue)

<details><summary>Scenarios de validacion</summary>

#### Scenario: spec con grupos
- **GIVEN** un spec con `parallel_groups: [[S1.T1, S1.T2]]`
- **WHEN** el dev abre el spec en HC
- **THEN** S1.T1 y S1.T2 muestran el badge/highlight de grupo

#### Scenario: spec sin grupos (regresion visual)
- **GIVEN** un spec sin `parallel_groups`
- **WHEN** se renderiza el arbol de sessions
- **THEN** identico a hoy, sin badge ni error

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abro el propio spec HOR-024 en HC y veo S1.T1+S1.T2 marcadas como grupo paralelo; abro un spec viejo y se ve igual que antes.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 5 | Badge en grupo | spec con parallel_groups | render SpecSessionTree | tasks del grupo con indicador | badge "∥" visible + a11y |
| 6 | Regresion viewer | spec sin parallel_groups | render | sin indicador, sin error | identico al baseline |

### REQ-PRESERVE-01: Tickets sin `parallel_groups` se ejecutan identicos a hoy

> **Que cambia**: nada para los tickets que no declaran `parallel_groups` — siguen ejecutandose task-por-task en serie, exactamente como hoy.
> **Por que**: la paralelizacion es opt-in; un cambio de proceso no debe alterar el comportamiento default ni romper specs existentes.

El sistema MUST mantener el flujo secuencial task-por-task del `request-execute` actual para toda session que no declare `parallel_groups`. DET-20 (sessions secuenciales), DET-29 (transiciones in-flight) y los gates existentes MUST comportarse sin cambios. Specs pre-HOR-024 MUST seguir parseando y ejecutando sin modificacion.

**Actor**: system
**Layers**: meta (request-execute) + backend/frontend (parser/viewer)

<details><summary>Scenarios de validacion</summary>

#### Scenario: ticket legacy
- **GIVEN** HOR-022 (sin `parallel_groups`)
- **WHEN** se reprocesa conceptualmente con el nuevo execute
- **THEN** ejecucion identica a la original (secuencial)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: HOR-022 reprocesado conceptual corre task-por-task igual que cuando se ejecuto.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 7 | Regresion secuencial | spec sin parallel_groups | execute | flujo task-por-task | identico al baseline pre-HOR-024 |

### REQ-PRESERVE-02: Degradacion segura en hosts sin soporte de concurrencia

> **Que cambia**: un host que no soporta multi tool_use ejecuta el mismo plan en secuencial, con resultado funcional identico (solo mas lento).
> **Por que**: la portabilidad multi-host no debe sacrificarse; el peor caso aceptable es "tan lento como hoy", nunca "roto".

Para hosts con `supports_parallel_execution: false`, el sistema MUST ejecutar todo `parallel_group` en serie sin fallar y producir el mismo resultado funcional y los mismos artefactos (commits, evidencia, gate) que la ejecucion paralela. Ningun path MUST asumir concurrencia disponible.

**Actor**: system
**Layers**: meta (request-execute)

<details><summary>Scenarios de validacion</summary>

#### Scenario: degradacion sin perdida
- **GIVEN** host sin soporte + spec con `parallel_groups`
- **WHEN** se ejecuta el grupo
- **THEN** mismas tasks done, misma evidencia, mismo gate — solo en serie

</details>

#### Acceptance
**El usuario puede verificar que funciona**: con la capability forzada a `false`, el grupo cierra con identicos artefactos que con `true`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 8 | Paridad paralelo/secuencial | mismo grupo, capability false vs true | execute en ambos modos | resultado funcional identico | misma evidencia + gate decision |

## Non-functional requirements

No aplican NFRs de runtime — es un cambio de proceso meta (prompts/templates) + un cambio de viewer. El "performance" relevante (wall-clock) es el beneficio del ticket, no un NFR con metrica de sistema. El unico criterio cuantitativo es el observable del Executive summary (ahorro 20-30% en tickets multi-task), medible empiricamente en dogfooding post-cierre.

## Changes

### Modified: `templates/records/spec.md`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Bloque por session | solo header `### Session N` + tabla | header + bloque opcional `parallel_groups: [[...]]` antes de la tabla | declarar grupos sin tocar las 11 columnas (AQ-1 opcion C) |

### Modified: `prompts/steps/_design-shared.md`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Particion en sessions | agrupacion logica + dependencias + tiempo | + heuristica de paralelizacion (4 condiciones a-d) + distincion explicita paralelas/dependientes | que el architect declare `parallel_groups` con criterio |

### Modified: `prompts/steps/request-execute.md`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Ciclo por task | secuencial estricto | lee `parallel_groups` → capability-check → invoca concurrente o serie → espera-a-todos → gate consolidado | materializa la paralelizacion + degradacion segura |

### Modified: `prompts/agent-tiers.md`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Multi-provider compatibility | tabla de hosts con "soporta sub-agentes" | + columna/capability `supports_parallel_execution` por host | resolver si el host puede multi tool_use |

### Modified: `horadric-cube/server/deckard/body.ts`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Parser de sessions | extrae header + tablas de tasks | + extrae `parallel_groups` por session → expone en PhaseStats | alimentar el indicador visual |

### Modified: `horadric-cube/src/components/specs/SpecSessionTree.vue`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Render de task | fila + expand de campos canonicos | + badge/highlight "∥" si la task esta en un `parallel_group` | que el dev vea que se paralelizo |

## Tasks

> **Numeracion**: el ticket no tiene `### Session N` ejecutadas (solo el esqueleto del plan), entonces K=1.
>
> **Dogfooding de la feature**: S1.T1 (`templates/records/spec.md`) y S1.T2 (`_design-shared.md`) tocan archivos distintos, sin dependencias ni rules cruzadas → cumplen las 4 condiciones → declaradas como `parallel_group`. S2-S5 quedan secuenciales (mismo archivo o dependencia real). El propio spec demuestra la distincion paralelas vs dependientes que pidio el dev.

### Session 1 — Heuristica + bloque parallel_groups en template y design-shared [tipo: auto] [tier: T1]

parallel_groups: [[S1.T1, S1.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Documentar bloque opcional `parallel_groups` bajo `### Session N` en el template (no toca las 11 columnas) | REQ-IMPROVE-01 | developer | — | templates/records/spec.md | grep: shape 11 columnas intacto + ejemplo `parallel_groups` presente | git revert | DET-2, DET-16, DET-24 | pending | 1 |
| S1.T2 | Documentar heuristica de paralelizacion (4 condiciones a-d) + distincion explicita paralelas/dependientes en "Particion en sessions" | REQ-IMPROVE-01 | developer | — | prompts/steps/_design-shared.md | grep: heuristica + ejemplo visibles; cross-ref a DET-20 | git revert | DET-2, DET-16, DET-20 | pending | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T1) — persistir en `## Sessions` del ticket, validar shape no roto + cross-refs, quality review DET-23 (light), decidir continue/iterate | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | pending | 1 |

### Session 2 — request-execute: invocacion concurrente + consolidacion en gate [tipo: ⚑ fuerte] [tier: T1]

parallel_groups: [[S2.T1, S2.T2]]

> Nota: descubierto en execute — tras el split HOR-059, S2.T1 toca `task-loop.md` y S2.T2 toca `session-gate.md` (archivos disjuntos, sin dependencia mutua) → elegibles como parallel_group. El diseno original asumio `request-execute.md` monolitico (secuencial). Files y Depends on actualizados a la realidad.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Ciclo por task lee `parallel_groups` → invoca Agent concurrente (multi tool_use en un mensaje) → espera a todos antes del gate | REQ-IMPROVE-02 | developer | S1.GATE | prompts/steps/request-execute/task-loop.md | el step describe el patron capability-check + multi tool_use + espera-a-todos | git revert | DET-9, DET-20, DET-29 | done | 2 |
| S2.T2 | `S{N}.GATE` consolida DET-23 (10 dim) + DET-25 (evidencia inline) leyendo TODAS las tasks del grupo; pass solo si todas pass | REQ-IMPROVE-02 | developer | S1.GATE | prompts/steps/request-execute/session-gate.md | cross-ref a DET-23/DET-25 coherente; ejemplo de gate consolidado | git revert | DET-7, DET-23, DET-25 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T1, ⚑ fuerte) — dev confirma el patron de invocacion concurrente + espera-a-todos; quality review DET-23 (standard); decidir continue/iterate | — | reviewer | S2.T1, S2.T2 | ticket | gate persistido + dev confirma patron | (no aplica) | DET-20, DET-23 | pending | 2 |

### Session 3 — Capability-detection del host + degradacion segura [tipo: ⚑ fuerte] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Definir capability `supports_parallel_execution` por host en tabla multi-provider + orden de resolucion (config override → tabla → false) | REQ-IMPROVE-03 | developer | S2.GATE | prompts/agent-tiers.md | tabla actualizada con la capability + ejemplo de config override | git revert | DET-1, DET-11, DET-16 | pending | 3 |
| S3.T2 | request-execute verifica capability antes del grupo; si false → ejecuta serie; registra `dkc-record-decision --step parallel-execution` con choice+reason | REQ-IMPROVE-03, REQ-PRESERVE-02 | developer | S3.T1 | prompts/steps/request-execute.md | el step describe capability-check + fallback + entry observable | git revert | DET-9, DET-15 | pending | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier: T1, ⚑ fuerte) — valida el approach multi-provider con el dev; quality review DET-23 (standard); decidir continue/iterate | — | reviewer | S3.T1, S3.T2 | ticket | gate persistido + dev confirma multi-provider | (no aplica) | DET-20, DET-23 | pending | 3 |

### Session 4 — HC viewer: parser + indicador visual de tasks paralelas [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Parser extrae `parallel_groups` de cada `### Session N` → expone en PhaseStats; specs sin el bloque devuelven vacio (regresion) | REQ-IMPROVE-04, REQ-PRESERVE-01 | developer | S3.GATE | horadric-cube/server/deckard/body.ts | vitest del parser: spec con/sin parallel_groups; typecheck | git revert | DET-5, DET-8, DET-10 | pending | 4 |
| S4.T2 | SpecSessionTree.vue renderiza badge "∥"/highlight para tasks en un grupo; a11y (no solo color); sin grupo = render actual | REQ-IMPROVE-04, REQ-PRESERVE-01 | developer | S4.T1 | horadric-cube/src/components/specs/SpecSessionTree.vue | lint + typecheck + smoke visual del dev en HC (spec HOR-024 + spec legacy) | git revert | DET-5, DET-8 | pending | 4 |
| **S4.GATE** | Gate de sync Session 4 (tier: T2, ⚑ fuerte) — smoke visual del dev; quality review DET-23 (exhaustive: a11y dim 8 aplica); decidir continue/iterate | — | reviewer | S4.T1, S4.T2 | ticket | gate persistido + smoke visual OK | (no aplica) | DET-20, DET-23 | pending | 4 |

### Session 5 — Regresion + cierre + dogfooding [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Verificar REQ-PRESERVE-01 (HOR-022 retroactivo secuencial identico) + REQ-PRESERVE-02 (capability false → serie sin perdida) | REQ-PRESERVE-01, REQ-PRESERVE-02 | reviewer | S4.GATE | — | TC-4/TC-7/TC-8 ejecutados con Actual lleno | (no aplica) | DET-5, DET-7, DET-13, DET-14 | pending | 5 |
| S5.T2 | Acceptance checkpoints + summary; confirmar dogfooding (este spec usa parallel_groups en S1) | REQ-IMPROVE-01 | reviewer | S5.T1 | tickets/HOR-024.md, spec | acceptance checklist completo; TC-1/2/3/5/6 con Actual | (no aplica) | DET-4, DET-13 | pending | 5 |
| **S5.GATE** | Gate de sync Session 5 (tier: T2, ⚑ fuerte) — cierre; quality review DET-23 (exhaustive); decidir continue/close | — | reviewer | S5.T1, S5.T2 | ticket | todos los TC con Actual; acceptance verde | (no aplica) | DET-13, DET-20, DET-23 | pending | 5 |

## Constraints

- **DET-20**: sessions secuenciales — este cambio NO la toca; solo paraleliza tasks DENTRO de una session.
- **RULE-workflow-session-format-canonical-002**: shape canonico de session — `parallel_groups` es bloque opcional, compatible.
- **DET-9**: handoffs entre agents — la paralelizacion respeta el handoff (esperar a todos antes de proceder al gate).
- **HOR-022 F8 (gate de 11 columnas)**: no se altera — `parallel_groups` vive fuera de la tabla (AQ-1 opcion C).
- **HOR-060 multi-provider**: la capability + el choice observable siguen el patron agnostico al provider ya establecido.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Agent tool multi tool_use | internal (host) | host debe soportar multiples tool_use concurrentes en un mensaje | mitigado por REQ-IMPROVE-03 (capability-check + fallback) |
| parser body.ts | internal | S4 depende de que el parser exponga `parallel_groups` antes del componente | dependencia intra-ticket (S4.T2 depends S4.T1) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Paralelizar tasks que colisionan (mismo archivo) | medium | alto (race condition / corrupcion) | heuristica exige 4 condiciones; condicion (a) prohibe mismo archivo; default conservador |
| Host sin soporte ejecuta multi tool_use y falla | medium | alto (ejecucion rota en otros hosts) | REQ-IMPROVE-03 capability-check ANTES de invocar + fallback secuencial |
| Gate evalua con tasks paralelas incompletas | low | medio (review invalido) | espera-a-todos explicita antes de DET-23/DET-25 |
| Viewer rompe specs legacy sin parallel_groups | low | medio (regresion visual) | REQ-PRESERVE-01 + test de regresion del parser/viewer |

## Open questions

Ninguna bloqueante. AQ-1 (notacion) resuelta → opcion C. AQ-2 (evidencia DET-25 por task paralela) cubierta por S2.T2.

## Decisions

### DEC-LOCAL-01: Notacion `parallel_groups` fuera de la tabla (AQ-1)
- **Contexto**: como expresar la paralelizacion sin romper el shape canonico de 11 columnas
- **Drivers**: minimo blast radius, no tocar gate F8 ni viewer base, evitar redundancia bidireccional
- **Opcion elegida**: C — bloque `parallel_groups: [[...]]` bajo cada `### Session N`, fuera de la tabla
- **Alternativas**: A) 12va columna (rompe shape + viewer); B) inline en `Depends on` (colision semantica secuencial vs paralelo)
- **Consecuencias**: cambio contenido en `deckard`; el viewer extiende (no reescribe); sin redundancia
- **Session**: intake (AQ-1, 2026-05-26)

### DEC-LOCAL-02: Capability-detection + degradacion segura (scope extension del dev)
- **Contexto**: DKC corre en multiples hosts; no todos soportan multi tool_use
- **Drivers**: portabilidad multi-provider (HOR-060), no romper hosts sin concurrencia
- **Opcion elegida**: verificar `supports_parallel_execution` antes de paralelizar; fallback secuencial + entry observable
- **Alternativas**: asumir siempre soporte (rompe Codex/Cursor/Ollama); deshabilitar paralelizacion global (pierde el beneficio en Claude Code)
- **Consecuencias**: peor caso = tan lento como hoy, nunca roto; +1 entry tipo `parallel-execution` en decisions_log
- **Session**: intake (scope extension, 2026-05-26)

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-IMPROVE-01..04 y REQ-PRESERVE-01..02 pasan
- [ ] **Tests**: TC-1..TC-8 con columna Actual llena (DET-25)
- [ ] **Regression**: ticket sin `parallel_groups` ejecuta identico (REQ-PRESERVE-01); host sin soporte degrada sin perdida (REQ-PRESERVE-02)
- [ ] **a11y**: indicador del viewer no depende solo del color (icono/texto "∥")
- [ ] **Dogfooding**: este spec declara `parallel_groups: [[S1.T1, S1.T2]]` y se ejecuto correctamente
- [ ] **Docs**: heuristica visible en `_design-shared.md`; capability en `agent-tiers.md`
