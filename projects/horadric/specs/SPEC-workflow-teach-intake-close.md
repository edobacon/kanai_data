---
id: SPEC-workflow-teach-intake-close
project: horadric
ticket: HOR-013
status: done
---

# Mejora de flujos de Horadric: intake-explore + teach-intake + teach-close + plan de sessions persistido

# Mejora de flujos de Horadric: intake-explore + teach-intake + teach-close + plan de sessions persistido

## Purpose

Tres extensiones cohesivas al workflow del ticket en deckard-core + su rendering en horadric-cube: nuevo step `intake-explore` con loop iterativo de validacion de hipotesis multi-capa, dos artefactos educativos `teach-intake` (gate bloqueante antes de design-{tipo}) y `teach-close` (sub-paso intrinseco de request-close), y persistencia obligatoria del plan de sessions en el ticket markdown como sub-seccion `### Plan de sessions` dentro de `## Sessions`.

**Para quien**: el dev que define y ejecuta tickets en deckard, el dev que aprende del KB acumulado del proyecto, y el LLM/agent que retoma el ticket sin contexto del chat previo.

**Por que importa**: reduce la friccion de execute (preguntas que se podrian haber respondido en intake), aumenta retencion de aprendizajes (caso → teaching estructurado con apoyo grafico), y elimina perdida de contexto entre intake/design/execute (el plan vive en el archivo del ticket, no en el chat).

## Requirements

### REQ-01: Step `intake-explore` con loop iterativo de hipotesis × capas

El sistema MUST proveer un step nuevo `prompts/steps/intake-explore.md` que se invoca entre `request-intake` y `design-{tipo}`. El step itera: hipotesis pendientes (`status: ?` o `~ partial`) → investigacion (Grep/Read + preguntas al dev) → registro de evidencia multi-capa en la tabla Triage del ticket → siguiente hipotesis. Cierra cuando: 0 hipotesis con `status: ?`, gaps clasificados (`assumed`/`blocked`/`inferred` con justificacion), basics cubiertos.

**Actor**: scribe (registro), researcher (busqueda), architect (clasificacion de gaps).
**Layers**: prompts (deckard-core).

#### Scenario: Triage con 8 hipotesis, 4 propuestas
- **GIVEN** ticket post-`request-intake` con tabla Triage que tiene `H2/H3/H4/H6/H8` en `status: ?`
- **WHEN** se invoca `intake-explore`
- **THEN** el step itera por cada hipotesis: investiga capas relevantes, actualiza evidencia en la tabla del ticket, y produce status final (`✓ confirmed | ✗ refuted | ~ partial | open`)
- **AND** al finalizar, ninguna hipotesis queda en `?` salvo que el dev declare `assumed/blocked/inferred` con razon escrita

#### Scenario: hipotesis confirmada desde una sola capa (DET-5)
- **GIVEN** una hipotesis con evidencia en una sola capa
- **WHEN** intake-explore evalua su status
- **THEN** rechaza marcarla como `confirmed`; queda como `partial` y solicita evidencia en al menos otra capa relevante

#### Scenario: gap clasificado como blocked
- **GIVEN** una hipotesis cuyo confirmar requiere acceso/info externa no disponible
- **WHEN** intake-explore identifica el bloqueo
- **THEN** la marca como `blocked: {razon}` y NO permite cerrar el step hasta que el dev acepte el bloqueo y lo documente en Triage

#### Acceptance
**El usuario puede verificar que funciona**: leer la tabla Triage del ticket post-intake-explore — todas las hipotesis tienen status final no-`?` y, si hay `blocked`, una razon escrita; ninguna se confirmo desde una sola capa.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Loop convergente | 4 hipotesis en `?` | invocar intake-explore | iterar hasta 0 en `?` | tabla Triage con todos status final |
| 2 | DET-5 enforced | hipotesis con 1 capa de evidencia | proponer confirm | step rechaza, queda `partial` | status `~ partial` + log explicativo |
| 3 | Gap blocked | hipotesis sin info disponible | dev escribe razon | step acepta y avanza | status `blocked: {razon}` en tabla |

---

### REQ-02: Step `teach-intake` produce `.teach/teach-intake.md` con bloques estructurados

El sistema MUST proveer un step nuevo `prompts/steps/teach-intake.md` que se invoca tras `intake-explore` y antes de cualquier `design-{tipo}`. El step genera el archivo `tickets/{TICKET-id}.teach/teach-intake.md` siguiendo el template `templates/outputs/teach-intake.md`. El archivo presenta de forma educativa: hipotesis evaluadas con racional, drivers de decision, basics que el dev debe conocer, gaps activos.

**Actor**: scribe (escritura), architect (sintesis educativa).
**Layers**: prompts (deckard-core), templates (deckard-core), filesystem (tickets/{id}.teach/).

#### Scenario: generacion exitosa con 3 bloques
- **GIVEN** ticket con tabla Triage completa (status final en todas las hipotesis) y context found rico
- **WHEN** se invoca `teach-intake`
- **THEN** crea `tickets/{TICKET-id}.teach/teach-intake.md` con: secciones "Why this teaching exists", `dkc:hypothesis-map` (con todas las hipotesis del Triage), `dkc:decision-matrix` (con decisiones tomadas durante intake), `dkc:learning-path` (orden sugerido de lectura), bloque mermaid (decision flow opcional), seccion "Active questions" si hay gaps activos
- **AND** actualiza frontmatter del ticket: `teachings.intake: pending → done`

#### Scenario: gate bloqueante antes de design
- **GIVEN** ticket sin `tickets/{TICKET-id}.teach/teach-intake.md` o con frontmatter `teachings.intake: pending`
- **WHEN** se invoca `design-{tipo}` (feature/fix/improvement/refactor)
- **THEN** el step bloquea con mensaje: "DET-21: teach-intake obligatorio antes de design — invocar `teach-intake` primero"
- **AND** no genera spec ni avanza el flujo

#### Scenario: tickets quick/query exentos
- **GIVEN** request clasificado como quick-path o query
- **WHEN** flujo se ejecuta
- **THEN** `intake-explore` y `teach-intake` NO se invocan; `teachings` no se agrega al frontmatter (o se omite el ticket entero en quick)

#### Acceptance
**El usuario puede verificar que funciona**: para cualquier ticket full-path post-HOR-013, existe `tickets/{TICKET-id}.teach/teach-intake.md` con los 3 bloques `dkc:*` y se ve renderizado en HC con render interactivo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Genera archivo | Triage completo | invocar teach-intake | crea archivo con bloques | archivo presente + frontmatter actualizado |
| 2 | Gate bloquea sin teach | sin teach-intake.md | invocar design-feature | bloqueo + instruccion | error message + flujo detenido |
| 3 | Exencion quick-path | request quick (5/5) | flujo se ejecuta | sin teach forzado | sin archivo `.teach/`, sin campo en frontmatter |

---

### REQ-03: Step `teach-close` como sub-paso intrinseco de request-close

El sistema MUST extender `prompts/steps/request-close.md` para incluir como sub-paso obligatorio la generacion de `tickets/{TICKET-id}.teach/teach-close.md` ANTES de marcar `status: closed` en el ticket. El sub-paso usa el template `templates/outputs/teach-close.md`. El archivo presenta: que se hizo, evolucion de hipotesis (cuales se confirmaron/refutaron y por que), highlights por session, knowledge promovido (rules/decisions/bugs creados), lessons learned.

**Actor**: scribe (escritura), reviewer (validacion).
**Layers**: prompts (deckard-core), templates (deckard-core), filesystem.

#### Scenario: cierre genera teach-close automaticamente
- **GIVEN** ticket en `status: in_progress` con todas las tasks done
- **WHEN** se invoca `/dkc close` (request-close)
- **THEN** el step ejecuta el sub-paso `teach-close`: lee Triage final, sessions, learns refinados, decisions tomadas, rules creadas, y produce `tickets/{TICKET-id}.teach/teach-close.md` con bloques `dkc:hypothesis-map` (evolucion final de hipotesis), `dkc:decision-matrix` (decisiones criticas con rationale post-hoc), `dkc:learning-path` (orden educativo para futuro lector), mermaid timeline de sessions
- **AND** marca `teachings.close: pending → done` en frontmatter
- **AND** SOLO DESPUES marca `status: closed`

#### Scenario: el sub-paso falla, no se cierra
- **GIVEN** ticket que va a cerrar
- **WHEN** sub-paso teach-close falla (ej: error de YAML, archivo no escrito)
- **THEN** request-close NO marca `status: closed`; queda `in_progress` con error reportado al dev

#### Scenario: tickets quick/query exentos
- **GIVEN** ticket cerrado en quick-path o query
- **WHEN** se cierra
- **THEN** sin teach-close (DET-22 no aplica a quick/query)

#### Acceptance
**El usuario puede verificar que funciona**: cualquier ticket cerrado post-HOR-013 que sea full-path tiene `tickets/{id}.teach/teach-close.md` y aparece en HC en el tab Teaching > Close con renderizado completo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Cierre con teach | tasks done | /dkc close | crea archivo y cierra | teach-close.md + status:closed |
| 2 | Sub-paso falla | YAML invalido en input | sub-paso ejecuta | error + status no cambia | status:in_progress + log |
| 3 | Quick exempt | quick path | cerrar | sin teach | no archivo, no campo |

---

### REQ-04: Bloque `dkc:hypothesis-map` parseable con tolerancia a YAML invalido

El sistema MUST parsear fences markdown con info string `dkc:hypothesis-map` y cuerpo YAML conforme al schema `HypothesisMapBlock` (ver `data-model.ts` del draft). El parser vive en `server/deckard/blocks.ts`. Si el YAML es invalido, el bloque conserva el cuerpo raw y se marca con `error: {mensaje}` — el render cae a code block plano con warning visible, sin romper el render del ticket entero.

**Actor**: HC backend parser (servidor local).
**Layers**: server (HC backend).

#### Scenario: YAML valido produce HypothesisMapBlock parseado
- **GIVEN** teach-intake.md con fence \`\`\`dkc:hypothesis-map y body YAML valido (hypotheses[], layersScope[])
- **WHEN** body.ts extrae el bloque
- **THEN** blocks.ts retorna `DkcBlock` con `kind: 'hypothesis-map'`, `parsed: HypothesisMapBlock`, `error: null`

#### Scenario: YAML invalido degrada bien
- **GIVEN** fence \`\`\`dkc:hypothesis-map con YAML malformado
- **WHEN** blocks.ts intenta parsear
- **THEN** retorna `DkcBlock` con `parsed: null`, `error: "{mensaje del parser yaml}"`, `rawYaml: {body raw preservado}`
- **AND** el resto del ticket renderiza intacto (no rompe la pagina)

#### Acceptance
**El usuario puede verificar que funciona**: abrir un ticket con bloque malformado en HC — ve un card con borde rose, el error del parser, y el resto del teaching renderiza normal.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Parse valido | fence dkc:hypothesis-map valido | parsear | DkcBlock.parsed presente | shape conforme HypothesisMapBlock |
| 2 | Parse invalido | YAML malformado | parsear | DkcBlock.error con mensaje | rawYaml preservado, UI degrada bien |
| 3 | Bloque vacio | fence sin body | parsear | error: "empty body" | render warning |

---

### REQ-05: Bloque `dkc:decision-matrix` parseable con tolerancia

Mismo enfoque que REQ-04 pero para fence `dkc:decision-matrix` con schema `DecisionMatrixBlock` (drivers[], options[], chosen, why, promotedTo).

**Actor**: HC backend parser. **Layers**: server.

#### Scenario: matrix con 3 opciones y 3 drivers
- **GIVEN** teach con fence valido (3 drivers, 3 options con scores)
- **WHEN** blocks.ts parsea
- **THEN** retorna DkcBlock con DecisionMatrixBlock estructurado

#### Scenario: opcion `chosen` no esta en `options[].name`
- **GIVEN** YAML donde `chosen: "X"` pero ninguna option se llama "X"
- **WHEN** validacion de coherencia
- **THEN** error: `"chosen 'X' not in options[]"`, render warning

---

### REQ-06: Bloque `dkc:learning-path` parseable

Mismo enfoque para `dkc:learning-path` con schema `LearningPathBlock` (audience, steps[]).

**Actor**: HC backend parser. **Layers**: server.

#### Scenario: path con 5 pasos y prereqs validos
- **GIVEN** fence con steps[] numerados 1..5, prereqs apuntan a numeros existentes
- **WHEN** parsear
- **THEN** LearningPathBlock con steps ordenados

#### Scenario: prereq apunta a step inexistente
- **GIVEN** step con `prereqs: [99]` cuando max step es 5
- **WHEN** validacion
- **THEN** error: `"step 99 not found"`, render warning

---

### REQ-07: Mermaid embebido renderiza en `MarkdownBody`

El sistema MUST renderizar fences markdown con info string `mermaid` como diagramas SVG usando la libreria `mermaid` (^11.14.0, ya instalada). El render se integra al componente existente `MarkdownBody.vue` sin romper render de otros fences (codigo, dkc:*).

**Actor**: usuario que abre un teaching con mermaid embebido.
**Layers**: frontend (HC), shell/MarkdownBody.vue.

#### Scenario: teach-intake con mermaid graph LR
- **GIVEN** teach-intake.md con fence \`\`\`mermaid valido
- **WHEN** dev abre el ticket en HC y selecciona tab Teaching > Intake
- **THEN** el bloque renderiza como SVG interactivo (zoom/pan opcional)

#### Scenario: mermaid invalido degrada
- **GIVEN** fence mermaid con sintaxis rota
- **WHEN** mermaid lib falla
- **THEN** se muestra el codigo como code block plano + warning, no rompe la pagina

---

### REQ-08: Sub-seccion `### Plan de sessions` parseable y obligatoria pre-execute

El sistema MUST parsear una sub-seccion `### Plan de sessions` dentro de `## Sessions` del ticket markdown, con tabla cuyas columnas son: `# | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria`. El parser produce `SessionPlanEntry[]` consumible por HC. **DET-20 extendida**: si esta sub-seccion no existe en un ticket que va a entrar a execute, request-execute bloquea (excepto quick/explore).

**Actor**: HC backend parser, gate de request-execute.
**Layers**: server (HC), prompts (deckard-core).

#### Scenario: ticket post-design tiene plan parseable
- **GIVEN** ticket con `### Plan de sessions` con 7 filas
- **WHEN** body.ts parsea el ticket
- **THEN** TicketDetailPayload incluye `sessionPlan: SessionPlanEntry[]` con 7 items

#### Scenario: gate request-execute bloquea sin plan
- **GIVEN** ticket sin `### Plan de sessions` o con tabla vacia
- **WHEN** se invoca request-execute
- **THEN** gate bloquea con mensaje "DET-20: plan de sessions ausente en ticket markdown — completar antes de execute"

#### Scenario: legacy tolerance — tickets pre-HOR-013
- **GIVEN** ticket cerrado antes de HOR-013 sin sub-seccion
- **WHEN** parser intenta extraer
- **THEN** `sessionPlan: undefined` (no error); HC no muestra el panel

#### Acceptance
**El usuario puede verificar que funciona**: cualquier ticket nuevo full-path post-HOR-013 tiene la tabla de plan con N sessions; el panel `Plan de sessions` aparece en pestana Sessions de HC con badges de tier y gate.

---

### REQ-09: Componente `SectionTeachings.vue` con sub-toggle Intake/Close

El sistema MUST proveer el componente Vue `src/components/ticket-sections/SectionTeachings.vue` que renderiza el contenido del tab Teaching con sub-toggle Intake/Close, banner de status del archivo `.teach/{kind}.md`, y delega al `MarkdownBody` con bloques `dkc:*` interceptados a sus componentes especializados.

**Actor**: dev que abre un ticket en HC.
**Layers**: frontend (HC).

#### Scenario: ambos teachings done
- **GIVEN** ticket con `teachings: { intake: 'done', close: 'done' }` y ambos archivos presentes
- **WHEN** dev abre tab Teaching
- **THEN** sub-toggle muestra Intake (default por convencion: si `close: pending` → default Intake; aqui ambos done → default Intake)
- **AND** banner verde indica "ambos teachings presentes"

#### Scenario: sub-toggle persistido en URL
- **GIVEN** dev en tab Teaching > Close
- **WHEN** comparte la URL
- **THEN** otra persona abre y aterriza en Close (`?teach=close` en query param)

#### Scenario: default por status
- **GIVEN** `teachings: { intake: 'done', close: 'pending' }`
- **WHEN** dev abre tab Teaching sin query param
- **THEN** default: `Close` (lo nuevo, lo que el dev probablemente quiere ver)
- **AND** si ambos pending o ambos done: default `Intake`

---

### REQ-10: Componente `HypothesisMap.vue` dual mode (grafo + lista)

El sistema MUST proveer `src/components/teaching-blocks/HypothesisMap.vue` con dos modos de render toggleables: (a) **modo grafo** default usando `@vue-flow/core` — nodos drag-able, edges desde `Hypothesis.children[]`, color de borde por status, dashed para refuted, minimap + zoom controls; (b) **modo lista** alternativo usando `@headlessui/vue Disclosure` — cards expandibles, accesibilidad keyboard. Filtro por capa atenua nodos no relevantes.

**Actor**: dev que lee teaching con bloque hypothesis-map.
**Layers**: frontend (HC).

#### Scenario: render grafo con jerarquia padre-hijo
- **GIVEN** HypothesisMapBlock con 4 hipotesis donde H1 tiene `children: ['H2', 'H3']`
- **WHEN** componente renderiza modo grafo
- **THEN** vue-flow muestra 3 nodos con edges desde H1 hacia H2 y H3
- **AND** nodos colorean borde segun status (emerald/amber/slate/rose-dashed)

#### Scenario: toggle a modo lista
- **GIVEN** dev en modo grafo
- **WHEN** clickea botón "≡ lista"
- **THEN** view cambia a Disclosure cards con misma data, accesible por teclado

#### Scenario: filtro por capa
- **GIVEN** 8 hipotesis con capas variadas
- **WHEN** dev clickea pill "backend"
- **THEN** nodos sin capa "backend" se atenuan (opacity 0.3); resto resalta

#### Scenario: bloque con error
- **GIVEN** bloque con `error != null`
- **WHEN** componente renderiza
- **THEN** muestra card con borde rose + mensaje de error + rawYaml en code block; no intenta renderear grafo

---

### REQ-11: Componente `DecisionMatrix.vue` con heatmap

El sistema MUST proveer `src/components/teaching-blocks/DecisionMatrix.vue` que renderiza tabla opciones × drivers con heatmap (high/mid/low scores), columna pros/cons, fila resaltada para opcion elegida + texto "Por que" debajo. Filas usan `@headlessui/vue Disclosure` para expandir rationale por driver.

**Actor**: dev que lee teaching con bloque decision-matrix.
**Layers**: frontend (HC).

#### Scenario: matrix con opcion elegida
- **GIVEN** DecisionMatrixBlock con 3 options y `chosen: "Step separado"`
- **WHEN** componente renderiza
- **THEN** fila "Step separado" con background emerald; texto "Por que" debajo de la tabla con `why` field

#### Scenario: heatmap por score
- **GIVEN** option con scores `[high, mid, low]`
- **WHEN** render
- **THEN** celdas con colores emerald (high), amber (mid), rose (low) y letra H/M/L

---

### REQ-12: Componente `LearningPath.vue` timeline con prereqs

El sistema MUST proveer `src/components/teaching-blocks/LearningPath.vue` con timeline numerada vertical, prereqs marcados con flechas/conector, refs clickables a archivos / RULE-id / DECISION-id, expand de step con Disclosure para ver `why` y `refs`.

**Actor**: dev que lee teaching con bloque learning-path.
**Layers**: frontend (HC).

#### Scenario: 5 pasos con prereqs lineales
- **GIVEN** LearningPathBlock con 5 steps donde 2 tiene `prereqs: [1]`, 3 tiene `prereqs: [2]`, etc.
- **WHEN** render
- **THEN** timeline vertical numerada 1-5 con conector visual; cada step expandible

---

### REQ-13: Tab "Teaching" en `TicketDetail.vue` con hash routing

El sistema MUST agregar tab "Teaching" en `src/views/TicketDetail.vue` con hash `#teaching` y query param `?teach=intake|close`. Tab solo aparece si `payload.teachings != undefined` (legacy tolerance).

**Actor**: dev navegando en HC.
**Layers**: frontend (HC).

#### Scenario: navegacion deep-link
- **GIVEN** URL `/projects/horadric/tickets/HOR-013#teaching?teach=close`
- **WHEN** dev abre la URL
- **THEN** TicketDetail muestra tab Teaching activo con sub-toggle en Close

#### Scenario: ticket legacy
- **GIVEN** ticket pre-HOR-013 sin frontmatter `teachings`
- **WHEN** dev abre el ticket
- **THEN** tab Teaching no aparece en la barra de tabs

---

### REQ-14: Frontmatter `teachings: { intake, close }` con tolerancia legacy

El sistema MUST extender `templates/records/ticket.md` con campo opcional `teachings: { intake: TeachingStatus; close: TeachingStatus }` en frontmatter, donde `TeachingStatus = 'pending' | 'done' | 'skipped'`. Tickets nuevos full-path lo inicializan en `{ intake: 'pending', close: 'pending' }`. Tickets legacy sin el campo siguen parseando (gray-matter tolera campos extra; HC handlers verifican presencia con `v-if`).

**Actor**: scribe (al crear ticket), HC parser. **Layers**: deckard-core (template), HC backend (types).

#### Scenario: ticket nuevo
- **GIVEN** request full-path
- **WHEN** scribe crea TICKET-N.md
- **THEN** frontmatter incluye `teachings: { intake: pending, close: pending }`

#### Scenario: ticket legacy parseando
- **GIVEN** HOR-008 (cerrado pre-HOR-013) sin campo `teachings`
- **WHEN** HC parsea
- **THEN** `payload.teachings === undefined`; tab Teaching ausente; sin error

---

### REQ-15: Reglas DET-20 extendida + DET-21 + DET-22

El sistema MUST actualizar `prompts/deterministic-rules.md` y `DECKARD.md` con:

- **DET-20** (extendida): "Tasks particionadas en sessions de 1.5-3h efectivas... **El plan de sessions vive como sub-seccion `### Plan de sessions` dentro de `## Sessions` del ticket markdown — sin esto, request-execute bloquea (excepto quick/explore).**"
- **DET-21** (nueva): "Teach-intake obligatorio antes de cualquier `design-{tipo}` para work_types implement/fix/improvement/refactor/explore. Quick-path y query exentos."
- **DET-22** (nueva): "El step `request-close` MUST producir `teach-close.md` como sub-paso obligatorio antes de marcar `status: closed`. Quick-path y query exentos."

**Actor**: dkc workflow engine (LLM siguiendo prompts), reviewers humanos. **Layers**: prompts (deckard-core).

#### Scenario: tickets pre-existentes en in_progress
- **GIVEN** HOR-012 pausado, in_progress, sin teach-intake
- **WHEN** se reanuda y se intenta cerrar
- **THEN** DET-22 aplica al cierre: produce teach-close. **NO retroactivo: no fuerza teach-intake** (se descubrio post-intake del HOR-012).

#### Acceptance
**El usuario puede verificar que funciona**: leer `prompts/deterministic-rules.md` y ver las 3 reglas; intentar cerrar un ticket sin teach-close → bloqueo; tickets cerrados pre-HOR-013 sin teaching siguen visibles en HC sin error.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | Render de HypothesisMap modo grafo no degrada UX | hipotesis renderizadas sin lag perceptible | <50 nodos sin frame drop (caso tipico esperado: 5-15 hipotesis) |
| Tolerancia | YAML invalido en bloque `dkc:*` no rompe ticket | tickets con bloque malformado siguen renderizando | 100% de tickets renderizan resto del contenido aunque 1+ bloques fallen |
| Compatibilidad | Tickets pre-HOR-013 sin frontmatter `teachings` siguen parseando | tickets legacy abiertos sin error | 100% (verificable en regression con HOR-001..HOR-012) |
| Accesibilidad | HypothesisMap modo lista funciona con keyboard | nav por Tab + Enter expande/colapsa | HeadlessUI Disclosure default (gratis) |

## Artifacts

### Templates (deckard-core)

| File | Path | Purpose | Status |
|------|------|---------|--------|
| teach-intake template | `templates/outputs/teach-intake.md` | Estructura del archivo `.teach/teach-intake.md` con secciones, ejemplos de bloques `dkc:*` y mermaid | new |
| teach-close template | `templates/outputs/teach-close.md` | Estructura del archivo `.teach/teach-close.md` con secciones de evolucion de hipotesis, highlights por session, knowledge promovido | new |

### Steps (deckard-core)

| File | Path | Purpose | Status |
|------|------|---------|--------|
| intake-explore step | `prompts/steps/intake-explore.md` | Loop iterativo de validacion de hipotesis × capas. Frontmatter (name/type/inputs/reads/produces) + GATES + instrucciones numeradas | new |
| teach-intake step | `prompts/steps/teach-intake.md` | Genera `.teach/teach-intake.md` desde Triage + Context found + draft. Marca `teachings.intake: done` | new |
| teach-close step | `prompts/steps/teach-close.md` | Genera `.teach/teach-close.md` desde sessions + learns + decisions + rules. Invocado por request-close | new |
| request-intake (mod) | `prompts/steps/request-intake.md` | Gate de salida apunta a `intake-explore` (no a `design-*`). Agrega paso de **esqueleto** inicial del plan de sessions | modify |
| workflows/request (mod) | `prompts/workflows/request.md` | Cadena actualizada: request-intake → intake-explore → teach-intake → design-{tipo} → execute → request-close (que invoca teach-close) | modify |
| dkc (mod) | `prompts/dkc.md` | Workflows table refleja los nuevos pasos | modify |
| request-execute (mod) | `prompts/steps/request-execute.md` | Refuerza GATE E con verificacion de `### Plan de sessions` en ticket markdown | modify |

### Reglas deterministicas (deckard-core)

| File | Path | Purpose | Status |
|------|------|---------|--------|
| DET-20 (mod) | `prompts/deterministic-rules.md` | Extender clausula "el plan vive en el ticket markdown" | modify |
| DET-21 (new) | `prompts/deterministic-rules.md` | Nueva: teach-intake gate antes de design | new |
| DET-22 (new) | `prompts/deterministic-rules.md` | Nueva: teach-close en step de close | new |
| DECKARD.md (mod) | `DECKARD.md` | Reglas-deterministicas section refleja DET-20 ext + DET-21/22 | modify |

### Tipos compartidos (HC)

| Type | Path | Purpose | Status |
|------|------|---------|--------|
| TeachingStatus | `shared/types.ts` | union: `'pending' \| 'done' \| 'skipped'` | new |
| TeachingKind | `shared/types.ts` | union: `'intake' \| 'close'` | new |
| TicketTeachingsFrontmatter | `shared/types.ts` | `{ intake: TeachingStatus; close: TeachingStatus }` | new |
| TeachingSummary | `shared/types.ts` | shape parseado por HC: kind, filePath, present, rawMarkdown, blocks[] | new |
| DkcBlock | `shared/types.ts` | wrapper con kind, position, rawYaml, parsed, error | new |
| DkcBlockKind | `shared/types.ts` | union: `'hypothesis-map' \| 'decision-matrix' \| 'learning-path'` | new |
| HypothesisMapBlock + Hypothesis + HypothesisEvidence + HypothesisLayer + HypothesisStatus | `shared/types.ts` | schema del bloque hipotesis | new |
| DecisionMatrixBlock + DecisionDriver + DecisionOption + DriverWeight + OptionScore | `shared/types.ts` | schema matriz de decision | new |
| LearningPathBlock + LearningStep | `shared/types.ts` | schema path de aprendizaje | new |
| SessionPlanEntry | `shared/types.ts` | una fila del `### Plan de sessions` | new |
| TicketDetailPayload (ext) | `shared/types.ts` | agregar `teachings?: { intake; close }` y `sessionPlan?: SessionPlanEntry[]` opcionales | modify |

### Parsers backend (HC)

| File | Path | Purpose | Status |
|------|------|---------|--------|
| teaches.ts | `server/deckard/teaches.ts` | Parsea secciones `## Teaching — Intake\|Close` del ticket; analogo a `sessions.ts` | new |
| blocks.ts | `server/deckard/blocks.ts` | Parsea fences `dkc:hypothesis-map\|decision-matrix\|learning-path` con tolerancia a YAML invalido | new |
| body.ts (mod) | `server/deckard/body.ts` | Extender para incluir teachings y sessionPlan en TicketDetailPayload | modify |
| endpoint (mod) | `server/routes/...` | Endpoint del ticket retorna `teachings` y `sessionPlan` cuando estan presentes | modify |

### Componentes frontend (HC)

| Component | Path | Purpose | Status |
|-----------|------|---------|--------|
| SectionTeachings | `src/components/ticket-sections/SectionTeachings.vue` | Wrapper del tab Teaching con sub-toggle Intake/Close, banner de status, persistencia en URL | new |
| HypothesisMap | `src/components/teaching-blocks/HypothesisMap.vue` | Render bloque dkc:hypothesis-map con dual mode (vue-flow + Disclosure) | new |
| DecisionMatrix | `src/components/teaching-blocks/DecisionMatrix.vue` | Render bloque dkc:decision-matrix con heatmap | new |
| LearningPath | `src/components/teaching-blocks/LearningPath.vue` | Render bloque dkc:learning-path con timeline | new |
| MarkdownBody (mod) | `src/components/shell/MarkdownBody.vue` | Integrar render de mermaid + interceptar fences dkc:* a sus componentes especializados | modify |
| TicketDetail (mod) | `src/views/TicketDetail.vue` | Tab "Teaching" con hash + query param. Sub-seccion `Plan de sessions` en tab Sessions | modify |

### Template del ticket (deckard-core)

| File | Path | Cambio | Status |
|------|------|--------|--------|
| ticket template | `templates/records/ticket.md` | Frontmatter `teachings: { intake, close }`. Sub-seccion `### Plan de sessions` dentro de `## Sessions` (template de tabla). Sub-secciones placeholder `## Teaching — Intake` y `## Teaching — Close` (referencian archivos en `.teach/`). | modify |

### Configuracion declarativa (i18n / labels)

[x] **Etiquetas y labels visibles**: textos como "Pendiente"/"Listo"/"Skipped", "filtrar capa", "modo grafo"/"modo lista", "Por que importa" — todos hardcoded en castellano dentro de los componentes Vue. **horadric-cube no tiene infraestructura i18n hoy** (verificable: no hay archivos `lang/*.json` ni libreria de i18n en deps). **Decision documentada**: hardcoded por ausencia de i18n. Si se introduce i18n al proyecto en el futuro, los labels migran como parte de ese ticket. Sin ticket de seguimiento porque HC es uso personal del autor — no hay otros consumidores que esperen i18n.

[x] **Cada artefacto tiene consumidor concreto en este sprint**: cada artefacto declarado se consume en este spec.
- TeachingSummary, DkcBlock, HypothesisMapBlock, DecisionMatrixBlock, LearningPathBlock → consumidos por SectionTeachings + 3 componentes de bloque
- SessionPlanEntry → consumido por TicketDetail (panel Plan de sessions en tab Sessions)
- teaches.ts, blocks.ts → consumidos por body.ts y endpoint
- Templates teach-intake/close → consumidos por steps teach-intake/teach-close
- DET-20/21/22 → consumidas por gates de design-* y request-close/execute

[x] **Heuristicas reemplazadas con specs explicitas**: el render de bloques usa `kind` explicito (no infiere por nombre del campo); los teachings tienen `kind: 'intake' \| 'close'` explicito; status de hypothesis es enum cerrado, no string libre. Sin heuristicas por nombre.

## Tasks

### Session 1 — Templates de teach + reglas DET nuevas/extendida [tipo: ⚑ fuerte] [tier: T0]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S1.T1 | Crear `templates/outputs/teach-intake.md` con secciones, frontmatter `version/created/updated/status` y ejemplos de los 3 bloques `dkc:*` + mermaid | developer | — | `templates/outputs/teach-intake.md` | DET-1, DET-2 | lint markdown + cross-reference a `templates/outputs/teach.md` existente como base | done | 1 | — | — |
| S1.T2 | Crear `templates/outputs/teach-close.md` con secciones de evolucion de hipotesis, highlights por session, knowledge promovido (rules/decisions/bugs), lessons learned | developer | S1.T1 | `templates/outputs/teach-close.md` | DET-1, DET-2 | lint markdown + simetria estructural con teach-intake.md | done | 1 | — | — |
| S1.T3 | Extender DET-20 (clausula "plan en ticket markdown") + crear DET-21 (teach-intake gate) + DET-22 (teach-close en close) en `prompts/deterministic-rules.md`. Actualizar la lista en `DECKARD.md`. **CRITICO: verificar que DET-20 actual no rompe referencias en otros prompts (Grep "DET-20" recursivo + leer cada match)** | developer | — | `prompts/deterministic-rules.md`, `DECKARD.md` | DET-2, DET-16 | grep DET-20 recursivo + cero referencias rotas + lint markdown | done | 1 | — | — |
| **S1.GATE** | **Gate de sync Session 1 (tier: T0)** — persistir resultados en `## Sessions` del ticket usando Template de Gate, validar lint+cross-references, decidir continue/iterate/escalate | reviewer | S1.T1, S1.T2, S1.T3 | ticket HOR-013 | DET-20 | gate persistido + decision documentada | done | 1 | — | — |

### Session 2 — Steps nuevos (intake-explore, teach-intake, teach-close) [tipo: auto] [tier: T0]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S2.T1 | Crear `prompts/steps/intake-explore.md` con frontmatter (name/type/inputs/reads/produces) + GATES (loop convergente + clasificacion gaps) + instrucciones numeradas + Contexto&Notas. Inputs: `ticket_id`. Reads: ticket.md (Triage + Context found). Produces: ticket Triage actualizado con status final. **Producir tambien el esqueleto inicial del plan de sessions en ticket markdown (ver Q1 cerrada en draft)** | developer | S1.GATE | `prompts/steps/intake-explore.md` | DET-1, DET-2, DET-5 | lint frontmatter + cross-references + sin steps huerfanos referenciados | done | 2 | — | — |
| S2.T2 | Crear `prompts/steps/teach-intake.md`. Frontmatter inputs: `ticket_id`. Reads: ticket Triage + draft + context. Produces: `tickets/{TICKET-id}.teach/teach-intake.md` + frontmatter `teachings.intake: done`. Gates: archivo escrito + frontmatter actualizado | developer | S1.T1, S2.T1 | `prompts/steps/teach-intake.md` | DET-2, DET-21 | lint frontmatter + verificar referencia a template teach-intake.md | done | 2 | — | — |
| S2.T3 | Crear `prompts/steps/teach-close.md`. Inputs: `ticket_id`. Reads: ticket sessions + learns + decisions + rules. Produces: `tickets/{TICKET-id}.teach/teach-close.md` + frontmatter `teachings.close: done`. **Diseñado para ser invocado como sub-paso del request-close, NO standalone** | developer | S1.T2, S2.T1 | `prompts/steps/teach-close.md` | DET-2, DET-22 | lint frontmatter + simetria con teach-intake | done | 2 | — | — |
| **S2.GATE** | **Gate de sync Session 2 (tier: T0)** | reviewer | S2.T1, S2.T2, S2.T3 | ticket HOR-013 | DET-20 | gate persistido | done | 2 | — | — |

### Session 3 — Ajustes transversales (request-intake, workflow, dkc, ticket template, request-execute) [tipo: ⚑ fuerte] [tier: T1]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S3.T1 | Modificar `prompts/steps/request-intake.md`: gate de salida apunta a `intake-explore` (no a design-*). Agregar paso de **esqueleto inicial** del plan de sessions en el ticket markdown (responsabilidad split con design-{tipo}). **Analisis de impacto colateral: Grep `request-intake` en otros prompts** | developer | S2.GATE | `prompts/steps/request-intake.md` | DET-5, DET-8, DET-10, DET-16 | grep request-intake + leer consumidores + lint | done | 3 | — | — |
| S3.T2 | Modificar `prompts/workflows/request.md`: cadena actualizada (request-intake → intake-explore → teach-intake → design-{tipo} → execute → request-close (con teach-close interno)). Frontmatter `steps[]` refleja orden | developer | S3.T1 | `prompts/workflows/request.md` | DET-5, DET-16 | grep workflows/request + leer consumidores + lint | done | 3 | — | — |
| S3.T3 | Modificar `prompts/dkc.md`: workflows table en Comments section refleja los nuevos pasos. Mencion explicita de DET-21/22 | developer | S3.T1 | `prompts/dkc.md` | DET-5, DET-8 | lint + cross-reference a deterministic-rules | done | 3 | — | — |
| S3.T4 | Modificar `templates/records/ticket.md`: agregar campo `teachings: { intake: pending; close: pending }` al frontmatter. Agregar sub-seccion `### Plan de sessions` (con tabla template) ANTES de Gate 0 dentro de `## Sessions`. Agregar sub-secciones placeholder `## Teaching — Intake` y `## Teaching — Close` que referencian archivos `.teach/`. Documentar legacy tolerance (campo opcional) | developer | — | `templates/records/ticket.md` | DET-2, DET-8, DET-16 | grep template usage + leer scribes/scaffold + lint | done | 3 | — | — |
| S3.T5 | Reforzar GATE E de `prompts/steps/request-execute.md` con verificacion de presencia de `### Plan de sessions` en ticket markdown. Mensaje de error claro: "DET-20: plan ausente en ticket — completar antes de execute" | developer | S3.T2 | `prompts/steps/request-execute.md` | DET-1, DET-5, DET-11 | lint + simulacion mental con HOR-013 | done | 3 | — | — |
| **S3.GATE** | **Gate de sync Session 3 (tier: T1)** — review final del flujo end-to-end papel; trazabilidad de cambios por archivo; verificar que cualquier ticket existente sigue siendo parseable (legacy tolerance) | reviewer | S3.T1, S3.T2, S3.T3, S3.T4, S3.T5 | ticket HOR-013 | DET-13, DET-14, DET-20 | review humano del flujo completo | done | 3 | — | — |

### Session 4 — HC backend: tipos + parsers teaches + blocks [tipo: auto] [tier: T2]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S4.T1 | Extender `shared/types.ts` con: TeachingStatus, TeachingKind, TicketTeachingsFrontmatter, TeachingSummary, DkcBlock, DkcBlockKind, HypothesisMap+Hypothesis+Evidence+Layer+Status, DecisionMatrix+Driver+Option+Weight+Score, LearningPath+Step, SessionPlanEntry. Extender TicketDetailPayload con `teachings?` y `sessionPlan?` opcionales. Copiar 1:1 desde `data-model.ts` del draft | developer | S3.GATE | `shared/types.ts` | DET-1, DET-2, DET-8, DET-16 | type-check clean (vue-tsc + tsc) | done | 4 | — | — |
| S4.T2 | Crear `server/deckard/blocks.ts`: parser de fences `dkc:hypothesis-map\ | decision-matrix\ | learning-path`. Usa `yaml` lib (^2.6.1). Tolerancia a YAML invalido: `try { parse } catch { error }`. Validacion de coherencia (chosen en options[].name, prereqs valido, etc) | developer | S4.T1 | `server/deckard/blocks.ts` | DET-1, DET-2, DET-5, DET-8 | vitest unit: 9+ tests (1 valido + 1 invalido por cada uno de los 3 kinds, + edge cases) | done | 4 | — | — |
| S4.T3 | Crear `server/deckard/teaches.ts`: parser de archivos `tickets/{id}.teach/teach-intake.md` y `teach-close.md`. Lee filesystem, parsea frontmatter + body markdown, llama a blocks.ts para extraer DkcBlock[]. Tolerancia a archivo ausente (returns `null` para ese kind) | developer | S4.T2 | `server/deckard/teaches.ts` | DET-1, DET-5, DET-8, RULE-server-frontmatter-legacy-001 | vitest unit: 6 tests (intake presente / close presente / ambos / ambos ausentes / archivo malformado / bloques mezclados) | done | 4 | — | — |
| S4.T4 | Extender `server/deckard/body.ts` y `server/routes/...` para incluir `teachings?: { intake; close }` y `sessionPlan?: SessionPlanEntry[]` en `TicketDetailPayload`. Implementar parser de sub-seccion `### Plan de sessions` (puede vivir en body.ts o archivo nuevo `session-plan.ts`). Verificar **RULE-viewer-polling-001**: endpoint preserva contentHash incluyendo cambios en subdir `.teach/` | developer | S4.T3 | `server/deckard/body.ts`, `server/routes/...` | DET-5, DET-11, DET-16, RULE-viewer-polling-001, RULE-index-001 | vitest unit + integration: endpoint retorna teachings y sessionPlan; HOR-013 (que tiene plan en ticket) parsea correctamente | done | 4 | — | — |
| **S4.GATE** | **Gate de sync Session 4 (tier: T2)** — vitest run completo + coverage delta. Si coverage de blocks.ts/teaches.ts <80% o coverage global baja: iterate | reviewer | S4.T1, S4.T2, S4.T3, S4.T4 | ticket HOR-013 + HC repo | DET-7, DET-13, DET-14, DET-20 | vitest --coverage; type-check clean | done | 4 | — | — |

### Session 5 — HC frontend: 3 componentes de bloque + render mermaid [tipo: auto] [tier: T2]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S5.T1 | Crear `src/components/teaching-blocks/HypothesisMap.vue` con dual mode. **Modo grafo**: `@vue-flow/core` con custom nodes (rect coloreado por status), edges desde `Hypothesis.children[]`, MiniMap + Controls. **Modo lista**: `@headlessui/vue Disclosure` con cards expandibles. Toggle persistente (composable o local). Filtro por capa con pills. Render warning si `block.error` | developer | S4.GATE | `src/components/teaching-blocks/HypothesisMap.vue` | DET-1, DET-2, DET-5 | vitest unit: render valido / render invalido / toggle / filtro de capa (4+ tests) | done | 5 | — | — |
| S5.T2 | Crear `src/components/teaching-blocks/DecisionMatrix.vue`. Tabla con `<table>` semantica + estilos dark consistentes con SectionSessions. Heatmap por score (emerald/amber/rose). Fila resaltada para `chosen`. Disclosure por fila para expand de driver rationale | developer | S4.GATE | `src/components/teaching-blocks/DecisionMatrix.vue` | DET-1, DET-2 | vitest unit: render valido / chosen no esta en options (warning) / heatmap (3+ tests) | done | 5 | — | — |
| S5.T3 | Crear `src/components/teaching-blocks/LearningPath.vue`. Timeline vertical custom (CSS) con conectores. Numeros con color accent. Disclosure por step para `why` + `refs`. Refs clickables (links relativos a archivos del proyecto / RULE / DECISION) | developer | S4.GATE | `src/components/teaching-blocks/LearningPath.vue` | DET-1, DET-2 | vitest unit: render valido / prereqs validos / step expandido (3+ tests) | done | 5 | — | — |
| S5.T4 | Modificar `src/components/shell/MarkdownBody.vue` para integrar render de mermaid (^11.14.0) en fences `\`\`\`mermaid`. Interceptar fences `dkc:hypothesis-map\ | decision-matrix\ | learning-path` y delegar a los 3 componentes de bloque (lookup por kind). Preservar render normal de fences de codigo. **Analisis de impacto: Grep MarkdownBody en views, leer consumidores** | developer | S5.T1, S5.T2, S5.T3 | `src/components/shell/MarkdownBody.vue` | DET-5, DET-8, DET-10, DET-11, DET-16 | vitest unit: mermaid valido / dkc:* delegado correctamente / fences de codigo siguen funcionando (5+ tests) | done | 5 | — | — |
| **S5.GATE** | **Gate de sync Session 5 (tier: T2)** — vitest run + type-check + sin warnings de Vue compiler | reviewer | S5.T1, S5.T2, S5.T3, S5.T4 | HC repo | DET-7, DET-13, DET-20 | vitest pass + tsc clean | done | 5 | — | — |

### Session 6 — SectionTeachings + tab Teaching + smoke UI [tipo: ⚑ fuerte] [tier: T3]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S6.T1 | Crear `src/components/ticket-sections/SectionTeachings.vue`. Sub-toggle Intake/Close con default por status (close pending → Intake; close done → Close si intake done; both done → Intake). Banner verde si archivo presente, gris si ausente. Persistencia en URL como query param `?teach=intake\ | close`. Delegate a MarkdownBody con teaching activo | developer | S5.GATE | `src/components/ticket-sections/SectionTeachings.vue` | DET-1, DET-2, DET-5 | vitest unit: default por status / persistencia URL / banner status (4+ tests) | done | 6 | — | — |
| S6.T2 | Modificar `src/views/TicketDetail.vue`: agregar tab "Teaching" con hash `#teaching`. Tab solo aparece si `payload.teachings != undefined` (legacy tolerance). Sub-seccion `Plan de sessions` en tab Sessions usando datos de `payload.sessionPlan`. **Analisis de impacto: revisar router + RouterView consumers** | developer | S6.T1 | `src/views/TicketDetail.vue` | DET-5, DET-8, DET-10, DET-11, DET-16, RULE-viewer-assets-context-001 | vitest unit + smoke browser local en http://localhost:3016 | done | 6 | — | — |
| S6.T3 | **Smoke UI manual con HOR-013 en development server**: el ticket ya tiene draft v2 aprobado y Plan de sessions persistido. Iniciar `npm run dev` (frontend + server). Abrir HOR-013 en HC. Validar: tab Teaching aparece, sub-toggle funciona, render de los 3 bloques `dkc:*` (cuando teach-intake/close existan en S7), render mermaid, deep-link `#teaching?teach=close`, panel Plan de sessions en tab Sessions. Capturar screenshots a `projects/horadric/tickets/HOR-013.screenshots/` para TC-2/3/4/6 | developer | S6.T1, S6.T2 | HC dev server (3016/5180) | DET-7, DET-13, RULE-viewer-assets-context-001 | smoke pass para 3 bloques + mermaid + sub-toggle + persistencia URL; screenshots en subdir | done | 6 | — | — |
| **S6.GATE** | **Gate de sync Session 6 (tier: T3)** — smoke UI pass + screenshots capturados + type-check clean | reviewer | S6.T1, S6.T2, S6.T3 | HC repo + ticket | DET-13, DET-14, DET-20 | review humano de smoke UI + screenshots | done | 6 | — | — |

### Session 7 — Dogfooding + cierre formal [tipo: ⚑ fuerte] [tier: T3]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S7.T1 | **Dogfooding teach-intake**: invocar (manual o via step nuevo) la generacion de `tickets/HOR-013.teach/teach-intake.md` retroactivo. Sintetizar desde Triage (8 hipotesis con status final) + Context found + draft v2 (decisiones cerradas) + spec REQs. Usar template `teach-intake.md` recien creado. Marcar `teachings.intake: done` en frontmatter del ticket | developer | S6.GATE | `projects/horadric/tickets/HOR-013.teach/teach-intake.md`, `projects/horadric/tickets/HOR-013.md` (frontmatter) | DET-1, DET-2, DET-21 | archivo presente + bloques `dkc:*` validos + frontmatter actualizado + render OK en HC | done | 7 | — | — |
| S7.T2 | **Dogfooding teach-close** via request-close: invocar `/dkc close` formal sobre HOR-013. El step request-close (modificado en S3) ejecuta sub-paso teach-close, sintetiza sessions S1-S7 + learns + decisions DEC-LOCAL del draft + rules creadas (si las hay), produce `tickets/HOR-013.teach/teach-close.md`, marca `teachings.close: done`, completa Summary del ticket, marca `status: closed`, fecha `closed: 2026-05-09` | scribe | S7.T1 | `projects/horadric/tickets/HOR-013.teach/teach-close.md`, `projects/horadric/tickets/HOR-013.md` (Summary + frontmatter) | DET-13, DET-22 | archivo presente + bloques validos + status:closed + Summary completo | done | 7 | — | — |
| S7.T3 | Reindex deckard (`commands/dkc-reindex horadric`) + verificar TC-1..TC-11 del ticket pasan + capturar regression suite final HC + retomar HOR-012 desde pausa (cambiar status: open → in_progress) opcional segun decision del dev en gate | scribe | S7.T2 | deckard index.db, ticket HOR-013 testing section | DET-13, DET-14, RULE-index-001 | reindex sin errores + 11/11 TCs pass (TC-12 deferred) | done | 7 | — | — |
| **S7.GATE** | **Gate de sync Session 7 (tier: T3) — cierre formal del ticket** | reviewer | S7.T1, S7.T2, S7.T3 | ticket HOR-013 cerrado | DET-13, DET-14, DET-20, DET-21, DET-22 | DET-21 y DET-22 cumplidas sobre HOR-013 (ambos teach-* presentes); TCs verificados | done | 7 | — | — |

## Constraints

- **DET-1**: certeza — todo item implementable confirmed/inferred/assumed/blocked. Source_ref obligatorio.
- **DET-2**: source_ref a REQ-XX en cada task contract.
- **DET-5**: multi-capa — hipotesis y cambios verifican en frontend + backend + DB + config segun corresponda. Aplica a HypothesisMap (estructura del bloque enforce evidencia multi-capa) y a tasks que tocan integraciones.
- **DET-7**: test cases referencian discovery + regression obligatoria. Aplica a tests de blocks.ts, teaches.ts, componentes Vue.
- **DET-8**: rollback documentado en cada task que modifica codigo existente (S3.*, S4.T4, S5.T4, S6.T2).
- **DET-10**: limites por rol — researcher no modifica, developer no expande, reviewer no aprueba sin evidencia. Aplica especialmente a S3.T1 (analisis de impacto antes de modificar request-intake).
- **DET-11**: KB-first — consultar rules existentes antes de proponer. Ya cumplido en intake (4 rules listadas en frontmatter).
- **DET-13**: cierre con evidencia — gates con validation tier; S7 verifica TCs reales, no "parece estar bien".
- **DET-14**: approve/iterate/escalate mutuamente excluyentes en gates.
- **DET-16**: propagacion — "si esto cambio, donde mas deberia reflejarse?". Critico en S1.T3 (DET renumber) y S3.T4 (template change).
- **DET-18**: draft aprobado antes de spec — cumplido (draft v2 aprobado 2026-05-09).
- **DET-20** (extendida): plan de sessions vive en ticket markdown (esta clausula la introduce este ticket).
- **DET-21** (nueva): teach-intake gate antes de design.
- **DET-22** (nueva): teach-close en step de close.
- **RULE-viewer-assets-context-001**: assets en subdir del ticket — `.teach/` sigue mismo patron que `.screenshots/` y `.draft/`.
- **RULE-viewer-polling-001**: endpoint preserva contentHash con cambios en subdir `.teach/` — verificar en S4.T4.
- **RULE-server-frontmatter-legacy-001**: tolerancia frontmatter legacy — campo `teachings` opcional, tickets pre-HOR-013 siguen parseando.
- **RULE-index-001**: indexacion idempotente — reindex tras agregar teachings no duplica entradas.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `mermaid` ^11.14.0 | npm (HC) | Render de fences mermaid en MarkdownBody | low — ya instalada, integrada en S5.T4 |
| `@vue-flow/core` ^1.48.2 + background + controls | npm (HC) | Modo grafo de HypothesisMap | low — ya instalada |
| `@headlessui/vue` ^1.7.23 | npm (HC) | Disclosure expandibles | low — ya instalada |
| `lucide-vue-next` ^1.0.0 | npm (HC) | Iconos | low — ya en uso |
| `yaml` ^2.6.1 | npm (HC) | Parser de cuerpos YAML en blocks.ts | low — ya instalada |
| HC dev server | local service | Puertos 3016 (vite) + 5180 (node) para smoke UI | low — flujo conocido (HOR-012 lo usa intensivamente) |
| Repo deckard | filesystem | Templates, prompts, steps, rules — todo en `/Users/edobacon/Workspace/deckard` | low — repo local |
| Repo horadric-cube | filesystem | Codigo TS/Vue — `/Users/edobacon/Workspace/horadric-cube` | low — repo local, sin remote |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Renumeracion DET rompe referencias en otros prompts | medium | medium — gates pueden fallar en runtime | S1.T3 incluye Grep recursivo de `DET-20` previo a edicion + lectura de cada match. **Alternativa contemplada**: extender DET-20 (no renombrar) + agregar DET-21/22 al final. **Decidida**: extender (no renombrar) por exactamente este riesgo |
| `markdown-it` con info string no estandar (`dkc:hypothesis-map`) puede comportarse distinto en versiones | low | medium | Fijar version en package.json (^14.1.0 ya pinned), agregar test en S4.T2 que verifica info string preservado en token |
| Vue-flow performance degrada con muchos nodos | low | low | Caso tipico esperado: 5-15 hipotesis por teaching. NFR documenta limite practico <50 nodos. Si emerge en uso real, agregar virtualizacion en pase 2 |
| Tickets legacy (HOR-001..HOR-012, BLY-*) rompen al parsear con nuevos campos | medium | high — regression visible | S4.T4 incluye test con HOR-008 (ticket cerrado pre-HOR-013) verificando que `payload.teachings === undefined` y resto del payload intacto. Test agregado a regression suite |
| Smoke UI en S6.T3 detecta friccion del flujo nuevo no anticipada | medium | medium | Si emerge friccion, S7 regresa a fase responsable (probable: S1 o S2 si templates/steps son confusos en uso real). Plan ya contempla regreso explicito |
| El sub-paso teach-close del request-close falla en S7.T2 (dogfooding) | medium | high — bloquea cierre del propio meta-ticket | S7.T2 tiene fallback: si falla, generar teach-close.md manualmente y reportar bug en el step para fix en pase 2. Documentar friccion como learn del propio ticket |
| Working tree de bayley con cambios pendientes contamina commits | low | low | Ya commiteados antes de S1 (3 commits BLY-* en main pre-branch HOR-013) |

## Open questions

(Todas cerradas durante design-draft v2. Ver `tickets/HOR-013.draft/intent.md` seccion "Decisiones cerradas" para racional completo.)

## Decisions

### DEC-LOCAL-01: Step separado `intake-explore` (no extender `request-intake`)
- **Contexto**: el dev pidio loop iterativo de validacion de hipotesis post-intake.
- **Drivers**: mantenibilidad, reversibilidad, contrato claro entre steps.
- **Opcion elegida**: step separado nuevo.
- **Alternativas**: (a) extender request-intake actual (descartada — el step ya tiene 346 lineas); (b) toggle por work_type (descartada — ramas en workflow).
- **Consecuencias**: +1 archivo en prompts/steps/, contrato claro, responsabilidades aisladas.
- **Session**: design-draft v1 → confirmada en v2.

### DEC-LOCAL-02: Plan de sessions split asimetrico (intake-explore esqueleto + design-{tipo} detalle)
- **Contexto**: quien produce el plan de sessions y donde vive.
- **Drivers**: el siguiente paso debe respetar la estructura sin perderse en contexto; el spec tiene mas info para detalle.
- **Opcion elegida**: split asimetrico — intake-explore produce **esqueleto** (objetivo + tier estimado + gate type) directo en ticket markdown; design-{tipo} **refina** con tasks asignadas y gate criteria detallados. Esqueleto bloqueante en intake-explore; detalle bloqueante en transition-to-execute.
- **Alternativas**: (a) solo intake-explore (descartada — no tiene tasks aun); (b) solo design-{tipo} (descartada — pierde info entre intake y design); (c) split simetrico (descartada — duplicacion de responsabilidad).
- **Consecuencias**: dos puntos de control con responsabilidades claras; plan visible desde intake; refinamiento natural en design.
- **Session**: design-draft v2.

### DEC-LOCAL-03: Extender DET-20 + crear DET-21/22 (no renombrar reglas)
- **Contexto**: las reglas nuevas (teach-intake gate, teach-close en close) podrian renumerar reglas existentes.
- **Drivers**: estabilidad de referencias en prompts, reversibilidad, evitar trabajo de Grep+update masivo.
- **Opcion elegida**: extender DET-20 con clausula "plan en ticket markdown" + crear DET-21 (teach-intake) y DET-22 (teach-close) al final.
- **Alternativas**: (a) crear 3 DETs nuevas reordenando (descartada — rompe referencias en otros prompts); (b) consolidar todo en DET-20 (descartada — DET-20 se vuelve mega-regla incomprensible).
- **Consecuencias**: cambio aditivo, referencias preservadas, la lista crece a 22 reglas.
- **Session**: design-draft v2. Mitigacion del riesgo de renumeracion en S1.T3.

### DEC-LOCAL-04: HypothesisMap dual mode (vue-flow grafo default + HeadlessUI lista alternativo)
- **Contexto**: como renderear bloque dkc:hypothesis-map.
- **Drivers**: practicidad para el dev, accesibilidad, aprovechamiento del stack.
- **Opcion elegida**: dual mode toggleable — vue-flow para visualizacion natural de jerarquia padre-hijo, HeadlessUI Disclosure para keyboard nav e impresion.
- **Alternativas**: (a) solo grafo (descartada — sin keyboard nav nativo); (b) solo lista (descartada — pierde la jerarquia visualmente); (c) tabla simple (descartada — pierde estructura padre-hijo).
- **Consecuencias**: 2 paths de render, ~30% mas de codigo en el componente, pero sin nuevas deps.
- **Session**: design-draft v2.

### DEC-LOCAL-05: YAML invalido en bloque dkc:* → warning visual + render plano + sin learn automatico
- **Contexto**: tolerancia a errores de schema en bloques.
- **Drivers**: degradacion graceful, simplicidad de pase 1, no over-engineer.
- **Opcion elegida**: warning visual + render plano del rawYaml en code block + sin learn automatico al ticket.
- **Alternativas**: (a) registrar como learn automatico (descartada — over-engineering en pase 1); (b) bloquear render del ticket entero (descartada — destruye UX por un bloque malo); (c) intentar reparar YAML (descartada — heuristica peligrosa).
- **Consecuencias**: el resto del ticket renderiza siempre; el dev decide si capturar manualmente; si en uso real falla seguido, reconsiderar en pase 2 (backlog).
- **Session**: design-draft v2.

### DEC-LOCAL-06: Sin nuevas deps en HC (todo el stack ya esta instalado)
- **Contexto**: que librerias se necesitan para el render.
- **Drivers**: minimizar superficie de cambio, evitar updates forzados de package.json.
- **Opcion elegida**: usar solo deps existentes (mermaid, @vue-flow/core+background+controls, @headlessui/vue, lucide-vue-next, yaml, @tanstack/vue-table).
- **Alternativas**: agregar dagre-d3, react-flow, otra lib YAML — todas descartadas, redundantes con lo ya instalado.
- **Consecuencias**: cero cambios en package.json. Pase 1 limpio.
- **Session**: design-draft v2.

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Tickets full-path post-HOR-013 con teach-intake antes de design | 0% | 100% | Grep `tickets/{id}.teach/teach-intake.md` para tickets full-path con `created > 2026-05-09` |
| Tickets full-path post-HOR-013 cerrados con teach-close | 0% | 100% (excluido HOR-012 retroactivo) | Grep para tickets full-path con `closed > 2026-05-09` |
| Tickets full-path post-HOR-013 con `### Plan de sessions` en markdown pre-execute | 0% | 100% | Grep tabla `### Plan de sessions` en tickets full-path con sessions execute > 0 |
| Preguntas durante execute reducidas | baseline TBD (medir en HOR-013 ejecucion S4-S7) | <50% del baseline | conteo manual de "AskUserQuestion" durante execute vs intake |

## Technical reference

- **Patron del parser de sessions** (`server/deckard/sessions.ts`): usa regex para extraer bloques `### Session N — {fecha} — {objetivo}`, parsea Gate template (Tipo, Validation tier, Tasks completadas, Discoveries, Failed approaches, Bloqueantes, Gate decision, Pre-condiciones, Tiempo, Contexto retomable). `teaches.ts` sigue mismo patron pero para `## Teaching — Intake` y `## Teaching — Close`.
- **Patron de DET-18** (`prompts/deterministic-rules.md` regla 18 + `prompts/steps/design-draft.md` GATE inicial): gate bloqueante con checklist + mensaje de bloqueo + alternativa "skipped con justificacion". DET-21/22 siguen mismo patron.
- **API endpoint del ticket**: `GET /api/projects/{project}/tickets/{id}` retorna `TicketDetailPayload` (ver `shared/types.ts`). Extension agrega `teachings?: { intake; close }` y `sessionPlan?: SessionPlanEntry[]` opcionales — consumers deben usar `v-if` para legacy tolerance.
- **Ticket existente con plan en markdown**: HOR-013 tiene `### Plan de sessions` con 7 filas. Es el primer ticket en usar la convencion. Sirve como caso de prueba para S4.T4 y S6.T3.
- **Componente de referencia**: `src/components/ticket-sections/SectionSessions.vue` (300+ lineas) implementa expand/collapse, badges status/tier/gate, render condicional. SectionTeachings sigue mismo patron de UX.

## Rules discovered

(Se llenan durante ejecucion. Rules descubiertas se crean en `rules/{module}/` y se referencian aqui.)

## Bugs found

(Se llenan durante ejecucion.)

## Acceptance checkpoints

- [ ] **Funcional**: 11 TCs del ticket (TC-1..TC-11) pasan; TC-12 deferred a HOR-012.
- [ ] **Tests**: vitest unit con coverage >80% en blocks.ts, teaches.ts; coverage global no baja vs baseline.
- [ ] **NFRs**: HypothesisMap modo grafo renderiza con 8 nodos sin lag perceptible (caso del propio HOR-013); YAML invalido degrada bien (TC-5).
- [ ] **Rules**: DET-20 ext + DET-21 + DET-22 escritas en `prompts/deterministic-rules.md` y `DECKARD.md`; tickets legacy parsean sin error (TC-9).
- [ ] **Integration**: HOR-008 / HOR-012 abren en HC sin error post-deploy.
- [ ] **Docs**: DECKARD.md refleja workflow nuevo; el propio HOR-013 cerrado dogfoodea ambos teach-* (cumple DET-21 y DET-22 retroactivamente como caso de prueba).
- [ ] **Dogfooding pass**: HOR-013.teach/teach-intake.md y teach-close.md presentes y renderizando correctamente en HC con los 3 bloques `dkc:*` y mermaid embebido.
