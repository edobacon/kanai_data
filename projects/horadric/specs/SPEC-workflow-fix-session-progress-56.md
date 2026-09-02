---
id: SPEC-workflow-fix-session-progress-56
project: horadric
ticket: HOR-056
status: done
---

# Fix session progress — parser `[~]` + prompt request-execute + frontmatter `status` flow per-step

# Fix session progress — parser `[~]` + prompt request-execute + frontmatter `status` flow per-step

## Executive summary — lo que estas aprobando

> *Lectura de 60s.*

**Que se quiere**: el dev observa hace varios ciclos que las sesiones DKC no se ven avanzar visualmente en HC mientras se ejecutan tasks — todo aparece terminado de golpe al cierre. HOR-040 (cerrado 2026-05-16) ya implemento SSE + chokidar 300ms para refrescar `## Sessions` sin reload, pero el sintoma persiste. Este ticket cierra el loop atacando 3 capas que comparten patron — codigo HC listo, prompts deckard no escriben:

1. **Capa A** — parser HC (`sessions.ts:901`) no captura `- [~]` ("in_progress"). Regex literal solo matchea `[ ]/[x]/[X]`. Tasks marcadas in_progress desaparecen del array. Render YA tiene spinner para `in_progress` (`SectionSessions.vue:85,311,407,430`), solo falta que el parser entregue el dato.
2. **Capa B** — prompt `request-execute.md` no instruye al LLM transicionar `[ ] → [~] → [x]`. Solo escribe `[ ]` en A2 y `[x]` en Gate D — no contempla estado intermedio. El propio prompt admite (linea 344) que el LLM "salta el registro para avanzar con la implementacion".
3. **Capa C** — frontmatter `status` del ticket no fluye per-step. HC tiene `INTAKE_STATUSES = {intake-explore, teach-intake, design-fix, ...}` y `EXECUTION_STATUSES = {request-execute, in_progress, request-close}` listos en `TicketsBoard.vue:103-123` — pero ningun prompt deckard escribe esos valores. El ticket permanece `status: open` durante todo intake/design/teach y solo cambia en execute/close.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Capa A regex extendida a `[(x|X|\s|~)]` + nuevo flag `inProgress` en `SessionTask` mapeado a `StepStatus: 'in_progress'` | Cambio quirurgico en parser. Tipo `StepStatus` ya soporta los 3 estados — la extension solo cablea el regex al tipo existente |
| 2 | Capa B: tool MCP dedicado `dkc_set_task_state` (atomic edit checkbox + spec status). NO Edit libre — revisado 2026-05-17 post-S2 con feedback del dev | Edit libre no resuelve la causa raiz (`request-execute.md:344` "el LLM salta el registro"). Tool MCP fuerza el patron deterministico: el prompt llama un tool en vez de hacer Edit libre. La invocacion del tool es trazable y validable. Decision actualizada de "deferred" a "in-scope" |
| 3 | Capa C: status literal-step-name (`status: intake-explore`, `status: teach-intake`, ..., `status: in_progress`, `status: closed`) | Opcion (a) del Active question del teach-intake. Alinea 1-a-1 con `INTAKE_STATUSES`/`EXECUTION_STATUSES` que HC ya tiene. Alternativa "fase agregada" (`status: intake`) requeria extender HC — disrupcion mayor sin beneficio claro |
| 4 | Capa C: cada step deckard agrega instruccion explicita al inicio "Edit frontmatter status al valor `{step-name}`" antes de su logica. NO requiere tool dedicado | Mantiene autocontencion de cada step. Pattern uniforme y verificable con grep. Si el LLM salta esto, dkc-validate Ticket puede agregar check post-step |
| 5 | Backwards compatibility: tickets cerrados pre-fix con `[ ]/[x]` se siguen viendo identicos. Tickets sin status intermedio (legacy) permanecen en columna "Registro" hasta que se cierren | Sin migracion masiva — fix solo aplica a tickets nuevos post-merge. Verificable por TC-5 (regression viewer en 3-5 cerrados antiguos) |
| 6 | **Capa D — Enforcement estructural (NEW post-S2)**: tools MCP `dkc_set_task_state` + `dkc_set_ticket_status` (atomic), validator `dkc-validate SessionCheckboxes` detecta drift entre spec.Status y ticket.checkbox, a-hook bloquea Gate D si validator falla | Sin esto, capas A+B+C dependen de "buena memoria" del LLM. `request-execute.md:344` documenta el patron de salto del registro como recurrente. Capa D cierra la causa raiz: el LLM NO PUEDE avanzar sin sincronizacion forzada. Trade-off: ~2-3h adicionales pero elimina el bug recurrente |
| 7 | **L1 — extender regex parser** sessions.ts:905 para aceptar separator `:` Y `—` (em-dash). Backwards compatible con tickets historicos | Drift descubierto en S2: template ticket.md instruye em-dash en Tasks completadas, parser actual solo matchea `:`. Tickets que siguen el template literal pierden `id`. Fix preventivo de drift template-parser. ~5min |
| 8 | **L2 — instalar `@vitest/coverage-v8`** como devDependency en horadric-cube. Habilita tier T2 estricto en sessions futuras | Sin coverage delta, gates `auto` con cambio multi-archivo solo tienen tests pass/fail — falta metrica de coverage delta. Reversible con `npm uninstall`. Tier T2 strict reactivado desde S4 onwards |

**Riesgos principales y como los mitigamos**:

- **Regression silenciosa del parser**: ampliar regex puede romper edge cases en tickets cerrados (e.g. checkboxes en codeblock literal). **Mitigacion**: tests unit que cubren `[ ]/[~]/[x]` mixtos + revision visual de 3-5 tickets cerrados antiguos (TC-2 + TC-5).
- **LLM ignora la convencion `[~]`** una vez en execute (mismo patron documentado en `request-execute.md:344`). **Mitigacion**: gate D actualizado verifica `[~]→[x]` como sub-item bloqueante; si tras 1-2 sessions de prueba el patron persiste, escalate a tool MCP dedicado en HOR futuro.
- **Cambios de prompts en 7 archivos descoordinados con el resto del sistema** (drift). **Mitigacion**: gate `⚑ fuerte` en S4 que requiere validacion manual end-to-end del kanban + dkc-validate Ticket post-cada-step.

**Que NO se hace en este ticket** (limites explicitos del scope, revisado 2026-05-17):

- **NO se migran tickets cerrados pre-fix** — backwards compatible (legacy permanecen `open/closed` sin status intermedio).
- **NO se cambia la decision H10-B** (reindex post-gate) — HOR-040 ya cubrio SSE complementario.
- **NO se agrega timestamp/duracion a las transiciones** de checkbox `[~]` — solo el estado, no metricas.
- **NO se modifica el render de HC** — el bug es exclusivamente parser + prompt + status flow. UI ya soporta los 3 estados.
- **NO se migra LLM principal a usar solo MCP** — los tools MCP son disponibles, pero Edit libre sigue funcionando como fallback (especialmente en host LLMs sin soporte completo MCP).

**Tamano estimado** (revisado 2026-05-17 post-S2): **5 sessions execute (S2-S6)** + close = ~7-10h efectivas. **S5 (capa D — enforcement)** es la mas riesgosa (introduce tools MCP nuevos + validator + a-hook). S2 ya completa (~30min reales). S3 incluye L1 ademas de capa B. S4 incluye L2 ademas de capa C. Renombrado: close pasa de S5 a S6.

**Como vas a saber que funciona** (criterios observables):

- En un ticket nuevo en execute, las tasks transicionan visualmente `[ ] → [~] (spinner) → [x] (checkmark)` en HC dentro de los ~500ms de SSE de HOR-040 (TC-3 + TC-4).
- El propio HOR-056 fluye Registro → Intake → Ejecucion → Cerrados en el kanban durante su ciclo de vida (TC-6 + TC-7, dogfooding).
- Tests unitarios del parser pasan (`[ ]/[~]/[x]` y mixtos). Coverage no baja.
- 3-5 tickets cerrados antiguos siguen viendose identicos (TC-5 regression viewer).

---

## Purpose

Cerrar el sintoma persistente "sessions DKC no avanzan visualmente durante execute" en HC, reparando 3 capas que comparten patron (codigo HC listo, prompts deckard no escriben los valores que activan features ya cableadas). Continuacion natural de HOR-040 — mismo dolor, capas distintas. Cross-repo (horadric-cube parser + 7 prompts deckard) coordinado en mismo ticket por acoplamiento de validacion alta.

## Requirements

### REQ-FIX-PARSER-01: Parser HC captura `[~]` como `in_progress`

> **Que cambia**: cuando una task en un bloque de session esta marcada `- [~] S{N}.T{M} — desc`, HC la muestra con spinner animado (`animate-spin`) y label "in_progress" en lugar de descartarla silenciosamente.
> **Por que**: hoy el regex en `sessions.ts:901` solo captura `[(x|X|\s)]`, y `[~]` retorna `null` del match → la task desaparece del array. La UI ya tiene el render listo (`stepStatusMeta` linea 85 + `animate-spin` en lineas 311/407/430) — falta solo que el parser entregue el dato.

El sistema MUST extender `extractTasksFromContent` (`horadric-cube/server/deckard/sessions.ts:897`) para reconocer el checkbox `[~]` y emitir `SessionTask` con flag/campo que `taskToAtomicStep` (linea 503) mapee a `StepStatus: 'in_progress'`.

**Actor**: HC viewer (renderer)
**Layers**: frontend (parser server-side de HC)

<details><summary>Scenarios de validacion</summary>

#### Scenario: task in_progress se captura y renderiza
- **GIVEN** un bloque de session con `- [~] S2.T1 — Implementar regex extendido`
- **WHEN** `extractTasksFromContent(content)` se ejecuta sobre ese bloque
- **THEN** retorna un `SessionTask` con flag in_progress (o `status: 'in_progress'`) y la descripcion correcta
- **AND** `taskToAtomicStep` mapea ese task a `AtomicStep` con `status: 'in_progress'`
- **AND** HC viewer renderiza la task con `animate-spin` y tone "amber" (segun `stepStatusMeta`)

#### Scenario: mix de estados se preserva
- **GIVEN** un bloque con `- [ ] S2.T1`, `- [~] S2.T2`, `- [x] S2.T3` en lineas consecutivas
- **WHEN** parser corre
- **THEN** retorna 3 tasks con status `pending`, `in_progress`, `executed` respectivamente
- **AND** ninguna task se descarta

#### Scenario: regression — `[ ]` y `[x]` siguen funcionando identicos
- **GIVEN** un bloque solo con `- [ ]` y `- [x]` (sin `[~]`)
- **WHEN** parser corre
- **THEN** retorna las mismas tasks que pre-fix (snapshot test)
- **AND** ningun cambio observable en HC para tickets sin `[~]`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: abre un ticket sintetico con `- [~] S2.T1 — test` en HC y ve un spinner animado al lado de la task.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Parser captura `[~]` | Markdown con `- [~] S2.T1 — desc` | `extractTasksFromContent(content)` | Devuelve task con flag in_progress | `tasks[0].inProgress === true` (o equivalente) |
| 2 | Mix preservado | Markdown con `[ ]/[~]/[x]` mixto | parser corre | 3 tasks con status correctos | `pending`, `in_progress`, `executed` |
| 3 | Regression `[x]`/`[ ]` | Markdown solo `[ ]/[x]` | parser corre | Comportamiento identico al baseline | Snapshot identico |

---

### REQ-FIX-PROMPT-01: `request-execute.md` instruye `[ ] → [~] → [x]` per-task

> **Que cambia**: cuando el LLM ejecuta una task en una session DKC, escribe el checkbox del ticket markdown como `- [~]` al abrir (paso A2) y lo transiciona a `- [x]` solo al cerrar (Gate D approve). HC muestra el spinner durante el ciclo de la task — ya no aparece todo `[x]` de golpe al final.
> **Por que**: hoy el paso A2 escribe `[ ]` y Gate D escribe `[x]` directo — no hay estado intermedio. Sin la transicion `[~]`, el fix del parser (REQ-FIX-PARSER-01) queda silencioso porque nadie escribe ese marker.

El sistema MUST modificar `prompts/steps/request-execute.md` para:

1. En **paso A2** (linea 200-230, registrar task pre-implementacion): instruir explicito "transicionar el checkbox de `- [ ] S{N}.T{M}` a `- [~] S{N}.T{M}` inmediatamente antes de invocar al developer".
2. En **Gate D** (linea 330-360, scribe post-developer): instruir explicito "transicionar `- [~]` → `- [x]` (no `- [ ]` → `- [x]`) tras reviewer approve".
3. En **Gate D checklist**: agregar item bloqueante "checkbox transicionado de `[~]` a `[x]`".

El sistema SHOULD actualizar tambien el template `templates/records/ticket.md` en el ejemplo de Template de Gate para reflejar la convencion de los 3 estados.

**Actor**: LLM principal (scribe + developer roles)
**Layers**: meta (prompts deckard)

<details><summary>Scenarios de validacion</summary>

#### Scenario: LLM siguiendo el prompt actualizado transiciona checkbox
- **GIVEN** un ticket real en `### Session N` activa con tasks pending
- **WHEN** el LLM abre task S{N}.T{M} (paso A2 invocado)
- **THEN** el ticket markdown contiene `- [~] S{N}.T{M}: {desc}` (no `- [ ]`)
- **AND** HC muestra spinner animado en esa task dentro de ~500ms (SSE de HOR-040)
- **AND** al cerrar Gate D approve, el checkbox pasa a `- [x]`

#### Scenario: gate D bloquea si checkbox quedo en `[~]`
- **GIVEN** una task con reviewer approve pero el scribe olvido transicionar `[~]` → `[x]`
- **WHEN** Gate D checklist se ejecuta
- **THEN** item "checkbox transicionado de [~] a [x]" falla
- **AND** Gate D NO avanza a la siguiente task

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en un ticket real en execute, observa en HC que cada task pasa visualmente de `pending` (vacio) → `in_progress` (spinner) → `executed` (checkmark) sin manual refresh.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | A2 escribe `[~]` | Task pending abre via A2 | LLM ejecuta paso A2 | Ticket contiene `- [~] S{N}.T{M}` | grep retorna 1+ match |
| 2 | Gate D escribe `[x]` desde `[~]` | Task con `[~]` aprobada | Gate D corre | Ticket contiene `- [x] S{N}.T{M}` | grep matchea, sin `[~]` huerfano |

---

### REQ-FIX-ENFORCEMENT-01: Tools MCP atomicos + validator bloqueante previenen drift recurrente

> **Que cambia**: cuando un step DKC abre/cierra una task, el LLM ya no edita libremente el checkbox del ticket o el status del spec — invoca un tool MCP dedicado (`dkc_set_task_state` / `dkc_set_ticket_status`) que hace la edicion atomica. Si el LLM intenta cerrar Gate D con drift entre spec.Status y ticket.checkbox, un validator a-hook lo bloquea con error explicito.
> **Por que**: el propio `request-execute.md:344` admite que "el LLM salta el registro para avanzar con la implementacion". Capas A+B+C confian en que el LLM siga el prompt — patron probado de fallar. Sin enforcement estructural, el bug recurrente vuelve. La causa raiz no es "LLM no instrucciado" sino "sistema permite drift". Capa D cierra esa puerta.

El sistema MUST proveer:

1. Tool MCP `dkc_set_task_state(project, ticket_id, task_id, target_state)` donde `target_state ∈ {'pending', 'in_progress', 'done'}`. Edita atomicamente: (a) checkbox `- [ ]/[~]/[x]` en `## Sessions > ### Session N > **Tasks completadas:**` del ticket markdown; (b) columna `Status` de la fila correspondiente en `## Tasks > ### Session N` del spec; (c) ejecuta reindex inline.
2. Tool MCP `dkc_set_ticket_status(project, ticket_id, status)` donde `status` es uno de los valores de `INTAKE_STATUSES` / `EXECUTION_STATUSES` definidos en HC + `'open'`, `'in_progress'`, `'closed'`. Edita atomicamente el frontmatter `status` + reindex inline.
3. Validator `dkc-validate SessionCheckboxes {project} {ticket_id}` que retorna:
   - exit 0 sin errores si para cada task en spec con `Status: in_progress` el ticket tiene `[~]`, y para cada `Status: done` el ticket tiene `[x]`
   - exit != 0 con errores si encuentra drift
4. A-hook bloqueante en Gate D de `request-execute.md`: tras procesar outputs del developer + reviewer, ejecutar validator. Si falla, NO marcar la task `done` — reportar drift al dev.
5. Modificacion de `prompts/steps/request-execute.md`: paso A2 y Gate D usan los tools MCP en vez de Edit libre (con fallback inline a Edit si host LLM no soporta tools MCP).
6. Modificacion de los ~7 prompts del workflow (intake-explore, teach-intake, design-{tipo}, design-transition-to-execute, request-execute, request-close): cada uno invoca `dkc_set_ticket_status({step-name})` al iniciar.

**Actor**: deckard server (tools MCP) + LLM principal (consumer) + validator a-hook (enforcement)
**Layers**: meta (prompts + MCP server)

<details><summary>Scenarios de validacion</summary>

#### Scenario: tool MCP edit atomico previene drift
- **GIVEN** un ticket con task S2.T1 en `Status: pending` (spec) y `- [ ] S2.T1` (ticket)
- **WHEN** LLM invoca `dkc_set_task_state(project, ticket_id, 'S2.T1', 'in_progress')`
- **THEN** spec.Status = `in_progress` Y ticket.checkbox = `- [~] S2.T1`
- **AND** reindex corrio inline
- **AND** ambas escrituras tienen exito o ninguna (atomic)

#### Scenario: validator detecta drift sintetico
- **GIVEN** un ticket con drift: spec.Status = `done` para S2.T1 pero ticket muestra `- [~] S2.T1` (no transiciono a `[x]`)
- **WHEN** ejecuta `dkc-validate SessionCheckboxes {project} {ticket_id}`
- **THEN** retorna exit != 0
- **AND** error message identifica S2.T1 con drift especifico (expected `[x]` got `[~]`)

#### Scenario: a-hook bloquea Gate D ante drift
- **GIVEN** Gate D corre tras developer + reviewer approve
- **WHEN** scribe intenta marcar task `done` pero el ticket markdown quedo con `[~]` (no `[x]`)
- **THEN** a-hook ejecuta validator, detecta drift, NO permite marcar `done`
- **AND** Gate D reporta error al dev con instrucciones de fix

</details>

#### Acceptance
**El usuario puede verificar que funciona**: ejecuta `dkc-validate SessionCheckboxes` sobre un ticket sintetico con drift forzado, obtiene error. Ejecuta sobre un ticket consistente, obtiene exit 0. Tools MCP responden correctamente desde el host LLM via MCP protocol.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Tool MCP edit atomico | Ticket+spec sin drift | invoke `dkc_set_task_state(t, 'in_progress')` | spec.Status y ticket.checkbox actualizados | ambos `in_progress`/`[~]` |
| 2 | Validator detecta drift | Ticket con `[~]` y spec con `done` | validator corre | exit != 0 con error msg | error explicito identifica el drift |
| 3 | Validator sin drift | Ticket+spec consistentes | validator corre | exit 0 | sin errores |
| 4 | A-hook bloquea | Gate D con drift | hook ejecuta validator | Gate D detiene | error reportado al dev |

---

### REQ-FIX-STATUS-FLOW-01: Frontmatter `status` fluye literal-step-name per-step

> **Que cambia**: cuando un ticket esta en un step DKC (ej. teach-intake, design-fix, request-execute), su frontmatter `status` refleja ese step literal (no permanece en `open`). El kanban HC muestra el ticket en columna correspondiente (Intake, Ejecucion) sin intervencion manual.
> **Por que**: HC tiene `INTAKE_STATUSES`/`EXECUTION_STATUSES` listos en `TicketsBoard.vue:103-123` esperando esos valores. Hoy ningun prompt deckard escribe nada distinto a `open`/`in_progress`/`closed`. El ticket vive en columna "Registro" durante todo el intake/design/teach — UX confusa, parece estancado.

El sistema MUST modificar cada step DKC en `prompts/steps/` para agregar al inicio (despues de "Cargar contexto") una instruccion explicita "Edit frontmatter del ticket activo: `status: {step-name}`". Mapping:

| Step | `status` a escribir |
|------|----------------------|
| `request-intake` | `open` (se mantiene — no necesita cambio, ya es el estado inicial al crear) |
| `intake-explore` | `intake-explore` |
| `teach-intake` | `teach-intake` |
| `design-draft` | `design-draft` |
| `design-feature` / `design-fix` / `design-improvement` / `design-refactor` | `design-{tipo}` |
| `design-transition-to-execute` | `design-transition-to-execute` |
| `request-execute` | `request-execute` al iniciar, luego `in_progress` al abrir la primera Session ejecutada (convencion actual preservada) |
| `request-close` | `request-close` al iniciar, luego `closed` al cierre (convencion actual preservada) |
| `teach-close` | sub-step de `request-close` — no cambia status por su cuenta |

El sistema MUST validar que cada step que invoca `dkc-reindex` post-edit propaga el nuevo status al SQLite (verificable con `sqlite3 ... SELECT status WHERE id={TICKET-id}`).

**Actor**: LLM principal (executor de los steps)
**Layers**: meta (prompts deckard)

<details><summary>Scenarios de validacion</summary>

#### Scenario: ticket fluye Registro → Intake → Ejecucion en kanban
- **GIVEN** un ticket sintetico recien creado por `request-intake` con `status: open`
- **WHEN** el LLM ejecuta `intake-explore` → `teach-intake` → `design-fix` → `design-transition-to-execute` → `request-execute` secuencialmente
- **THEN** despues de cada step, el frontmatter `status` contiene el valor del step recien iniciado
- **AND** HC muestra el ticket moverse de columna "Registro" → "Intake" → "Ejecucion" sin reload manual

#### Scenario: cierre marca `closed`
- **GIVEN** un ticket en `request-close`
- **WHEN** el sub-step `teach-close` completa y request-close marca cierre final
- **THEN** frontmatter `status: closed`
- **AND** HC mueve el ticket a columna "Cerrados"

#### Scenario: regression — tickets cerrados pre-fix se siguen viendo iguales
- **GIVEN** 3-5 tickets cerrados pre-fix (HOR-040, HOR-055, HOR-054) con `status: closed`
- **WHEN** HC los renderiza post-fix
- **THEN** aparecen en columna "Cerrados" identicos al baseline
- **AND** ningun status intermedio se inyecta retroactivamente

</details>

#### Acceptance
**El usuario puede verificar que funciona**: crea un ticket nuevo y observa en el kanban como fluye automaticamente por las columnas a medida que el LLM ejecuta el flujo DKC, sin intervencion manual.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | intake-explore escribe status | Ticket open recien creado | step intake-explore inicia | frontmatter `status: intake-explore` | grep matchea |
| 2 | teach-intake escribe status | Ticket en intake-explore | step teach-intake inicia | frontmatter `status: teach-intake` | grep matchea |
| 3 | design-fix escribe status | Ticket en teach-intake | step design-fix inicia | frontmatter `status: design-fix` | grep matchea |
| 4 | Ticket en column correcta | Ticket sintetico con `status: design-fix` | HC renderiza kanban | Ticket aparece en columna "Intake" | inspect visual |

---

### REQ-REGRESSION-01: Tickets cerrados pre-fix se siguen viendo identicos

> **Que cambia**: cuando abres un ticket cerrado de antes del fix (por ejemplo HOR-040 o HOR-055), HC lo renderiza exactamente igual que antes — sin cambios visibles, sin checkboxes intermedios, sin status raros.
> **Por que**: el fix amplia el set de chars del checkbox y agrega valores nuevos al frontmatter `status`. Sin garantia explicita de backwards-compat, edge cases podrian alterar el render de tickets ya cerrados — UX confusa al dev abriendo historia.

El sistema MUST preservar el rendering de tickets cerrados con `status: closed` y checkboxes binarios `[ ]/[x]` sin diferencias visibles respecto al baseline pre-fix.

**Layers**: frontend (renderer HC)

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | HOR-040 baseline | Ticket cerrado HOR-040 | HC renderiza | Render identico a snapshot pre-fix | snapshot match |
| 2 | HOR-055 baseline | Ticket cerrado HOR-055 | HC renderiza | Render identico | snapshot match |

---

### REQ-REGRESSION-02: Otros parsers / endpoints HC sin afectacion

> **Que cambia**: cuando navegas otras tabs de HC (Tasks, Triage, Teaching, Commits) o llamas a la API REST, todo se comporta igual que antes del fix. Solo el tab Sessions del viewer cambia visualmente (spinner para `[~]`).
> **Por que**: el archivo `sessions.ts` modificado podria tener consumers ocultos que rompan si la signature cambia. Sin garantia explicita, el fix podria tener side-effects fuera del scope esperado.

El sistema MUST preservar el comportamiento de:
- Tab Tasks, Triage, Teaching, Commits del viewer
- Endpoint `/api/projects/horadric/tickets` (list y detail)
- Parser de specs (`SectionSessions.vue` solo afecta tab Sessions)

**Layers**: frontend + backend (HC API)

---

## Fix scope

### Antes (comportamiento actual)

| Capa | Sintoma observable |
|------|--------------------|
| A | `- [~] task` en markdown → HC descarta la task (regex no matchea). Visible: la task no aparece en el bloque session |
| B | LLM en execute escribe `[ ]` al abrir y `[x]` al cerrar. Nunca `[~]` durante la implementacion. Visible: tasks no muestran progreso intermedio |
| C | Ticket en intake/design/teach permanece `status: open` → HC muestra en columna "Registro". Visible: kanban no refleja avance |

### Despues (comportamiento esperado)

| Capa | Comportamiento |
|------|----------------|
| A | `- [~] task` se parsea como `status: 'in_progress'` y HC muestra spinner animado |
| B | LLM transiciona `[ ] → [~] → [x]` por task. HC muestra el ciclo visual |
| C | Ticket fluye columnas Registro → Intake → Ejecucion → Cerrados durante su ciclo |

### Archivos afectados

| File | Change | Impact |
|------|--------|--------|
| `horadric-cube/server/deckard/sessions.ts` | Extender regex `extractTasksFromContent` linea 901 + ajustar `taskToAtomicStep` linea 503 para emitir `in_progress` | Cambia output del parser — afecta tab Sessions de TODOS los tickets que HC abra |
| `horadric-cube/server/deckard/sessions.test.ts` (o equiv.) | Agregar tests unitarios para `[~]` + mix de estados + regression | Nuevos tests, no afecta runtime |
| `deckard/prompts/steps/request-execute.md` | Modificar paso A2 + Gate D para instruir transicion `[~]` | Afecta convencion del LLM en TODOS los tickets nuevos en execute |
| `deckard/prompts/steps/request-intake.md` | Mantener `status: open` (sin cambio explicito — `request-intake` ya lo escribe asi) | Sin cambios funcionales |
| `deckard/prompts/steps/intake-explore.md` | Agregar instruccion "Edit frontmatter status: intake-explore al iniciar" | Afecta TODOS los tickets nuevos en intake-explore |
| `deckard/prompts/steps/teach-intake.md` | Agregar instruccion "Edit frontmatter status: teach-intake al iniciar" | Idem |
| `deckard/prompts/steps/design-{draft,feature,fix,improvement,refactor}.md` | Agregar instruccion "Edit frontmatter status: design-{tipo} al iniciar" | 5 archivos. Afecta TODOS los tickets nuevos en design |
| `deckard/prompts/steps/design-transition-to-execute.md` | Agregar instruccion "Edit frontmatter status: design-transition-to-execute al iniciar" | Idem |
| `deckard/prompts/steps/request-execute.md` | Agregar "Edit frontmatter status: request-execute al iniciar" + preservar transicion existente a `in_progress` al abrir primera session | Idem |
| `deckard/prompts/steps/request-close.md` | Agregar "Edit frontmatter status: request-close al iniciar" + preservar transicion existente a `closed` al cierre | Idem |
| `deckard/templates/records/ticket.md` | Actualizar ejemplo de Template de Gate con checkbox `[~]` para reflejar la convencion | Documentacion del template |

---

## Tasks

### Session 2 — Capa A: parser HC captura `[~]` [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Leer `sessions.ts:897-913` + `:497-517` para confirmar estructura actual del regex y del mapping `taskToAtomicStep`. Documentar plan exacto del cambio (regex extendida + flag adicional en SessionTask + mapping en taskToAtomicStep) | REQ-FIX-PARSER-01 | researcher | — | `horadric-cube/server/deckard/sessions.ts` | grep confirma lineas exactas; plan escrito como discovery en ticket | (no aplica — read-only) | DET-5, DET-11 | done | 2 |
| S2.T2 | Implementar regex extendido (agregar `~` al set de chars validos del checkbox, ver REQ-FIX-PARSER-01 detalle). Agregar campo `inProgress` al `SessionTask` cuando matchea `~`. Ajustar `taskToAtomicStep` linea 503 para mapear `inProgress` → `in_progress` | REQ-FIX-PARSER-01 | developer | S2.T1 | `horadric-cube/server/deckard/sessions.ts`, `horadric-cube/src/api/client.ts` | typecheck pass + tests existentes pasan | git revert | DET-5, DET-8, DET-10, DET-11 | done | 2 |
| S2.T3 | Crear/extender tests unit del parser cubriendo: (a) `[~]` solo, (b) mix `[ ]/[~]/[x]`, (c) regression `[ ]/[x]` baseline, (d) edge: checkbox con commit ref. Asegurar 2+ tests nuevos | REQ-FIX-PARSER-01, REQ-REGRESSION-01 | developer | S2.T2 | `horadric-cube/server/deckard/sessions.test.ts` | `npx vitest run server/deckard/sessions.test.ts` verde 4+ tests nuevos pass | git revert | DET-7, DET-13 | done | 2 |
| S2.T4 | Smoke manual diferido a S3.T3 (end-to-end con ticket real + HC vivo). Justificacion: tests unit cubren pipeline completo parser→atoms con StepStatus correcto; render solo lee status ya validado. Override en TC-4 con link al test file | REQ-FIX-PARSER-01 | reviewer | S2.T3 | (manual — diferido) | tests unit como evidencia equivalente | (no aplica) | DET-7 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T1 efectivo)** — persistir resultados en `## Sessions` del ticket usando Template de Gate, validacion (typecheck + 42/42 tests), Quality review DET-23 light pass, decidir continue. Tier downgrade T2 → T1 por dep missing `@vitest/coverage-v8` (L2) | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket HOR-056 | gate persistido + Quality review pass + decision continue documentada | (no aplica) | DET-20, DET-23 | done | 2 |

### Session 3 — Capa B + L1: prompt request-execute instruye `[~]` + extender regex separator [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | **L1 fix**: extender regex `idMatch` en `sessions.ts:905` para aceptar separator `:` Y `—` (em-dash). Cambio: `/^([A-Z0-9.\-]+)\s*[:—]\s*(.*)$/`. Agregar 2 tests unit con em-dash separator para verificar id captura. Backwards compatible con todos los tests existentes (`:`) | REQ-FIX-PARSER-01 | developer | S2.GATE | `horadric-cube/server/deckard/sessions.ts`, `horadric-cube/server/deckard/sessions.test.ts` | tests verdes incluyendo nuevos casos em-dash; tickets historicos con `:` siguen pass | git revert | DET-5, DET-8, DET-10 | done | 3 |
| S3.T2 | Editar `request-execute.md` paso A2 (linea ~212-217): agregar instruccion "transicionar checkbox `[ ]` → `[~]` inmediatamente antes de invocar developer". Editar Gate D (~330-360): instruccion "transicionar `[~]` → `[x]` post-approve". Agregar item bloqueante en Gate D checklist | REQ-FIX-PROMPT-01 | developer | S3.T1 | `deckard/prompts/steps/request-execute.md` | grep confirma presencia de instrucciones nuevas; estructura preservada | git revert | DET-10, DET-11, DET-16 | done | 3 |
| S3.T3 | Editar `templates/records/ticket.md` Template de Gate: actualizar ejemplo de checkbox para mostrar convencion de 3 estados. Agregar nota explicativa | REQ-FIX-PROMPT-01 | developer | S3.T2 | `deckard/templates/records/ticket.md` | grep confirma cambio; ejemplo coherente | git revert | DET-16 | done | 3 |
| S3.T4 | Validacion manual end-to-end: crear ticket sintetico real y ejecutar 2-3 tasks siguiendo el prompt actualizado. Confirmar en HC que cada task pasa `[ ] → [~] → [x]` visualmente. Validar tambien em-dash separator captura ids en HC | REQ-FIX-PROMPT-01, REQ-FIX-PARSER-01 | reviewer | S3.T3 | (ticket sintetico /tmp + HC viewer) | diferido a S5.T6 (end-to-end completo con tools MCP); tests unit como evidence | rollback ticket sintetico | DET-7, DET-23 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2) — gate `⚑ fuerte`** — dev valida visualmente convencion + aprueba. Quality review DET-23 dim 7 (claridad) + 10 (error handling) | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4 | ticket HOR-056 | autopilot optimistic: Quality review standard pass + gate persistido + L1 fixeado | (no aplica) | DET-20, DET-23 | done | 3 |

### Session 4 — Capa C + L2: frontmatter status flow per-step + install coverage-v8 [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T0 | **L2 fix**: `cd horadric-cube && npm i -D @vitest/coverage-v8`. Re-run baseline coverage de sessions.ts post-S2 (`npx vitest run --coverage`). Capturar metricas en ticket Discovery | — | developer | S3.GATE | `horadric-cube/package.json`, `horadric-cube/package-lock.json` | `npx vitest run --coverage` ejecuta sin missing dep; metricas baseline capturadas | `npm uninstall @vitest/coverage-v8` | DET-8 | done | 4 |
| S4.T1 | Editar `intake-explore.md`: agregar al inicio (tras "Cargar contexto") instruccion "Edit frontmatter del ticket: `status: intake-explore`". Auto-reindex despues del Edit (patron existente) | REQ-FIX-STATUS-FLOW-01 | developer | S4.T0 | `deckard/prompts/steps/intake-explore.md` | grep confirma instruccion presente | git revert | DET-16 | done | 4 |
| S4.T2 | Editar `teach-intake.md`: instruccion "Edit frontmatter: `status: teach-intake`" al inicio | REQ-FIX-STATUS-FLOW-01 | developer | S4.T1 | `deckard/prompts/steps/teach-intake.md` | grep | git revert | DET-16 | done | 4 |
| S4.T3 | Editar los 5 design-{tipo}: `design-draft.md`, `design-feature.md`, `design-fix.md`, `design-improvement.md`, `design-refactor.md`. Instruccion "Edit frontmatter: `status: design-{tipo}`" al inicio. Patron uniforme | REQ-FIX-STATUS-FLOW-01 | developer | S4.T2 | `deckard/prompts/steps/design-{draft,feature,fix,improvement,refactor}.md` | grep en los 5 archivos confirma instruccion presente | git revert | DET-16 | done | 4 |
| S4.T4 | Editar `design-transition-to-execute.md`: instruccion "Edit frontmatter: `status: design-transition-to-execute`" al inicio | REQ-FIX-STATUS-FLOW-01 | developer | S4.T3 | `deckard/prompts/steps/design-transition-to-execute.md` | grep | git revert | DET-16 | done | 4 |
| S4.T5 | Editar `request-execute.md`: instruccion "Edit frontmatter: `status: request-execute`" al inicio. Preservar transicion existente a `in_progress` al abrir primera Session ejecutada (es contrato vigente del flow) | REQ-FIX-STATUS-FLOW-01 | developer | S4.T4 | `deckard/prompts/steps/request-execute.md` | grep + verificar que la transicion existente a `in_progress` sigue presente y no se duplica | git revert | DET-16 | done | 4 |
| S4.T6 | Editar `request-close.md`: instruccion "Edit frontmatter: `status: request-close`" al inicio. Preservar transicion existente a `closed` al cierre final (es contrato vigente) | REQ-FIX-STATUS-FLOW-01 | developer | S4.T5 | `deckard/prompts/steps/request-close.md` | grep + verificar transicion a `closed` preservada | git revert | DET-16 | done | 4 |
| S4.T7 | Validacion end-to-end manual: crear ticket sintetico y ejecutar el flujo completo intake → teach → design → execute observando el kanban HC. Confirmar el ticket aparece en columna correspondiente despues de cada step. Tambien validar regression: 3-5 tickets cerrados antiguos (HOR-040, HOR-055) se siguen viendo en columna "Cerrados" | REQ-FIX-STATUS-FLOW-01, REQ-REGRESSION-01 | reviewer | S4.T6 | (manual — ticket sintetico + HC) | inspeccion visual: 4 transiciones de columna observadas en kanban; 3 tickets cerrados sin cambio | rollback ticket sintetico | DET-7, DET-16, DET-23 | done | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T2) — gate `⚑ fuerte`** — dev valida visualmente el flow completo de columnas + aprueba antes de close. Quality review DET-23 dimensiones 7 (claridad) + 10 (consistency). Dogfooding: el propio HOR-056 deberia haber fluido durante S2-S3-S4 si los fixes funcionan | — | reviewer | S4.T1..S4.T7 | ticket HOR-056 | autopilot optimistic: Quality review standard pass + gate persistido + dogfooding confirmado API HC | (no aplica) | DET-20, DET-23 | done | 4 |

### Session 5 — Capa D: Enforcement estructural (tools MCP + validator + a-hook) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Implementar tool MCP `dkc_set_task_state(project, ticket_id, task_id, target_state)` en `deckard/server/src/deckard_cain/tools/write.py` (o nuevo `state.py`). Logica: parse ticket markdown, encontrar checkbox de la task en session activa, editarlo, parse spec, encontrar fila de task en `## Tasks > ### Session N`, editar columna Status, ejecutar reindex inline. Atomic — todo o nada (try/except) | REQ-FIX-ENFORCEMENT-01 | developer | S4.GATE | `deckard/server/src/deckard_cain/tools/write.py`, `deckard/server/src/deckard_cain/server.py` (registro tool) | tests Python pytest unit cubren happy path + ticket not found + task not found + atomic rollback en error | revert commit del tool | DET-1, DET-2, DET-8, DET-10 | done | 5 |
| S5.T2 | Implementar tool MCP `dkc_set_ticket_status(project, ticket_id, status)` en `deckard/server/src/deckard_cain/tools/write.py`. Logica: parse ticket markdown frontmatter, validar status contra enum, editar frontmatter, reindex inline | REQ-FIX-ENFORCEMENT-01, REQ-FIX-STATUS-FLOW-01 | developer | S5.T1 | `deckard/server/src/deckard_cain/tools/write.py` | tests pytest cubren happy + invalid status + ticket not found | revert commit | DET-1, DET-2, DET-8, DET-10 | done | 5 |
| S5.T3 | Implementar validator `dkc-validate SessionCheckboxes {project} {ticket_id}` en `commands/lib/schemas/sessionCheckboxes.ts`. Logica: parse ticket markdown sessions + spec tasks, comparar Status (spec) vs checkbox (ticket), retornar errores estructurados si drift. Exit code != 0 si hay errores | REQ-FIX-ENFORCEMENT-01 | developer | S5.T2 | `deckard/commands/lib/schemas/sessionCheckboxes.ts`, `deckard/commands/dkc-validate` (entry) | tests TS cubren: consistent (exit 0), drift in_progress (exit !=0), drift done (exit !=0) | revert commit | DET-1, DET-7, DET-8 | done | 5 |
| S5.T4 | Agregar a-hook bloqueante en `request-execute.md` Gate D: tras procesar outputs, ejecutar `dkc-validate SessionCheckboxes`. Si falla, NO marcar `done`, reportar drift al dev. Hook visible via comentario HTML `<!-- enforcement: ... -->` (patron HOR-055 S6) | REQ-FIX-ENFORCEMENT-01 | developer | S5.T3 | `deckard/prompts/steps/request-execute.md` | grep confirma hook comment presente; mocking del scenario gate-with-drift falla correctamente | git revert | DET-16 | done | 5 |
| S5.T5 | Refactorizar prompts S3+S4 escritos en sessions previas para usar los tools MCP en vez de Edit libre. `request-execute.md` A2 y Gate D usan `dkc_set_task_state`. Cada step DKC con `Edit status` usa `dkc_set_ticket_status`. Mantener fallback inline para host LLMs sin MCP (patron HOR-029) | REQ-FIX-ENFORCEMENT-01 | developer | S5.T4 | `deckard/prompts/steps/request-execute.md`, `deckard/prompts/steps/intake-explore.md`, `deckard/prompts/steps/teach-intake.md`, `deckard/prompts/steps/design-{draft,feature,fix,improvement,refactor}.md`, `deckard/prompts/steps/design-transition-to-execute.md`, `deckard/prompts/steps/request-close.md` | grep confirma referencias a tools MCP en cada prompt; fallback inline documentado | git revert | DET-16 | done | 5 |
| S5.T6 | Validacion end-to-end: crear ticket sintetico nuevo, ejecutar flujo intake → teach → design → execute → close usando los tools MCP. Confirmar que (a) ticket fluye visualmente por las 4 columnas en HC, (b) cada task transiciona `[ ] → [~] → [x]` visible, (c) validator no detecta drift al cerrar | REQ-FIX-ENFORCEMENT-01, REQ-FIX-PARSER-01, REQ-FIX-PROMPT-01, REQ-FIX-STATUS-FLOW-01 | reviewer | S5.T5 | (ticket sintetico end-to-end) | dev confirma observacion visual completa de los 4 sintomas resueltos + validator sin drift | rollback ticket sintetico | DET-7, DET-13, DET-23 | done | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T2) — gate `⚑ fuerte`** — dev aprueba arquitectura MCP + validator + a-hook + refactor. Quality review DET-23 standard (dimensiones 1, 2, 3, 6, 7, 10 mandatorias para cambio multi-archivo). Bug recurrente cerrado en su causa raiz | — | reviewer | S5.T1..S5.T6 | ticket HOR-056 | dev aprueba enforcement estructural + gate persistido | (no aplica) | DET-20, DET-23 | done | 5 |

### Session 6 — Close [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S6.T1 | Quality review final del ticket: verificar TCs todos con `Actual` lleno + `Session` referenciada (DET-25), learns refinados (L1+L2 promovidos), regression suite verde, validator `dkc-validate SessionCheckboxes` sin drift en el propio HOR-056 (dogfooding) | — | reviewer | S5.GATE | ticket HOR-056 | DET-25 + DET-13 cumplidos + dogfooding pass | (no aplica) | DET-13, DET-25 | done | 6 |
| S6.T2 | Generar `teach-close.md` (DET-22 sub-step de request-close): hypothesis evolution post-execute (6 hipotesis con status final incluida H6 enforcement), highlights por session (S1-S5), knowledge promoted (rules + decisions creadas), lessons learned con `dkc:learning-path` para devs futuros enfocado en patron "codigo listo + huerfano sin escritura" | — | scribe | S6.T1 | `tickets/HOR-056.teach/teach-close.md` | `dkc-validate Teach` valid 0 errors 0 warnings | delete archivo | DET-22 | done | 6 |
| S6.T3 | Commits DET-27 finales coordinados: horadric-cube (parser capa A + L1 + S5 validator) + deckard (prompts capa B + capa C + tools MCP capa D). Mensajes referencian HOR-056 + scope completo | — | scribe | S6.T2 | git (ambos repos) | `git log -1 --format=%h` retorna hash en ambos repos | git revert (ambos) | DET-27 | done | 6 |
| **S6.GATE** | **Gate de sync Session 6 (tier: T1) — cierre del ticket** — request-close marca status: closed despues de teach-close done + validator pass | — | reviewer | S6.T1, S6.T2, S6.T3 | ticket HOR-056 | ticket cerrado con todas las dimensiones DET-23 pass o n/a + status: closed | (no aplica) | DET-20, DET-22, DET-23 | done | 6 |

---

## Constraints

- **DET-5** (multi-capa): aplica al fix — hipotesis confirmadas en 2+ capas (meta + frontend para H1, meta para H2, meta + frontend para H5).
- **DET-7** (test cases ↔ discovery, regression obligatoria): TC-1..TC-7 trazan a REQs explicitos. TC-5 cubre regression viewer (DET-7).
- **DET-8** (rollback documentado): cada task tiene `git revert` o `(no aplica)` para gates/manuales.
- **DET-16** (propagacion): cambio en `sessions.ts` se propaga a tab Sessions de TODOS los tickets — TC-5 valida regression. Cambio en prompts se propaga a TODOS los tickets nuevos — el flow se valida en S3.T3 y S4.T7.
- **DET-20** (sessions con gate): tasks particionadas en S2-S5 con `S{N}.GATE` ultima task de cada session. Numeracion continua desde `### Session 1` (intake) en el ticket.
- **DET-23** (quality review): aplicada en cada `S{N}.GATE` con tier light (S2, S5) o standard (S3, S4 por ⚑ fuerte).
- **DET-25** (TCs inline): TC-1..TC-7 se registran en momento de ejecucion en `## Test cases` del ticket (gate D del request-execute).
- **RULE-workflow-session-format-canonical-002**: parser HC depende del formato canonico de tasks (em dash entre id y desc). El fix de capa A NO toca este formato — solo extiende el set de chars validos en el checkbox.
- **RULE-workflow-state-sot-markdown-canonical-003**: markdown SOT — el cambio respeta que frontmatter `status` es la fuente de verdad del estado del ticket.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| HOR-040 (SPEC-workflow-hc-live-updates-40) | internal | SSE + chokidar 300ms que refresca `## Sessions` sin reload. Sin esto, aun con el fix del parser, el dev necesitaria F5 manual | Resuelto: HOR-040 status `done` 2026-05-16 |
| Vite frontend en localhost:3016 | external (dev env) | Para validacion manual S2.T4 + S3.T3 + S4.T7 | Bajo — dev levanta con `npm run dev` |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Regex extendido del parser rompe edge case en codeblock (e.g. `\`\`\`md\n- [~]\n\`\`\``) | medium | medium — tickets con codeblock que ejemplifica markdown podrian renderizar mal | TC-2 case (d): test edge con codeblock; revision visual de 3 tickets que tienen codeblocks markdown documentando convenciones |
| LLM ignora la convencion `[~]` durante execute (mismo patron de salto del registro documentado en `request-execute.md:344`) | high | medium — fix queda silencioso aunque el codigo funcione | Gate D checklist con item bloqueante explicito; si tras 1-2 sessions de prueba el patron persiste, escalate a HOR futuro para tool MCP `dkc_set_task_checkbox` |
| Cambios en 7+ prompts deckard generan drift entre archivos (algunos con la instruccion nueva, otros sin) | medium | high — flow inconsistente | Patron uniforme: copy-paste de la instruccion exacta + grep en S4.T7 validation; ademas `dkc-validate Ticket` post-cada-step podria agregar check |
| Tickets cerrados pre-fix renderizan diferente por algun side effect del regex extendido | low | high — regression visible al dev abriendo tickets viejos | TC-5 explicito: snapshot test + revision visual de HOR-040, HOR-055, HOR-054 antes de cerrar S4 |
| El propio HOR-056 no fluye en kanban durante su S4 (dogfooding falla) | medium | medium — indica bug del fix de capa C antes de cerrar | Auto-validacion como criterio explicito en S4.GATE — si HOR-056 quedo en columna Registro durante S4 implementacion, iterate antes de cerrar |

## Open questions

Las 2 active questions del teach-intake resueltas como decisiones criticas #1-#4 del Executive summary. Sin questions abiertas adicionales.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Edit libre del prompt (NO tool MCP dedicado)
- **Contexto**: capa B podia implementarse con Edit libre del prompt o con tool MCP `dkc_set_task_checkbox` dedicado
- **Drivers**: complejidad de implementacion (tool = ~2h adicional + nuevo MCP endpoint) vs robustez del fix (tool reduce riesgo de "salto del registro")
- **Opcion elegida**: Edit libre del prompt
- **Alternativas**: tool MCP dedicado (descartado por complejidad inicial)
- **Consecuencias**: si el LLM salta sistematicamente la convencion en ejecuciones reales, abrir HOR futuro para el tool. Hoy: medir empiricamente
- **Session**: design (pre-execute, intake del ticket)

### DEC-LOCAL-02: Status literal-step-name (no fase agregada)
- **Contexto**: capa C — que valor escribir exactamente en `status` per-step
- **Drivers**: minimum disruption a HC vs verbosidad de los valores
- **Opcion elegida**: literal-step-name (`status: intake-explore`, `status: teach-intake`, ...)
- **Alternativas**: fase agregada (`status: intake` durante intake/teach/design, `status: execute` durante execute) — descartada porque requeria extender HC con nuevas constantes
- **Consecuencias**: valores verbosos pero alineados 1-a-1 con `INTAKE_STATUSES`/`EXECUTION_STATUSES` ya existentes en HC. No requiere cambios en frontend
- **Session**: design (pre-execute)

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de cada REQ pasan (3 scenarios funcionales en REQ-FIX-PARSER-01; 2 en REQ-FIX-PROMPT-01; 3 en REQ-FIX-STATUS-FLOW-01)
- [ ] **Tests**: tests unit del parser nuevos + existentes pasan; coverage delta no degrada
- [ ] **NFRs**: no aplican (fix sin requirements de performance/scale)
- [ ] **Rules**: DET-5, DET-7, DET-8, DET-16, DET-20, DET-23, DET-25 cubiertas en task contracts
- [ ] **Integration**: 3-5 tickets cerrados pre-fix se renderizan identicos (TC-5)
- [ ] **Docs**: template `ticket.md` actualizado con la convencion de 3 estados de checkbox; instruccion explicita en cada step deckard sobre frontmatter status
- [ ] **Dogfooding**: el propio HOR-056 fluye visualmente por las columnas Registro → Intake → Ejecucion → Cerrados durante su ciclo de vida
