---
id: SPEC-workflow-dkc-flow-audit-15
project: horadric
ticket: HOR-015
status: done
---

# Auditoria logica de los flujos DKC — coherencia, peso, gates, claude-sync, sessions atomicas

# Auditoria logica de los flujos DKC — coherencia, peso, gates, claude-sync, sessions atomicas

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle tecnico vive en Requirements, Changes y Tasks. Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: cerrar 5 sintomas de incoherencia que aparecieron al USAR el workflow extendido por HOR-013/HOR-014. Los prompts pesan demasiado por boilerplate duplicado entre `design-{tipo}`, las DETs declaradas no se cumplen automaticamente porque sus 3 capas estan asimetricas, los teach son data dumps en vez de material narrativo acompañante, las sessions del ticket viven como bloques opacos en HC sin granularidad atomica ni reindex en tiempo real, y `~/.claude/CLAUDE.md` global esta desconectado de las DETs de DKC. Cada sintoma tiene fix concreto basado en evidencia del intake-explore + decisiones tomadas en draft v1.

**Decisiones criticas que necesitan tu OK** (todas con racional en `tickets/HOR-015.teach/teach-intake.md` y `tickets/HOR-015.draft/intent.md`):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Consolidar boilerplate de los 4 design-{tipo} en `prompts/steps/_design-shared.md` (D3 revalidada por H8) | Reduce ~30-40% de lineas en design-{tipo}. Sin esto, cualquier cambio al patron design se duplica 4 veces. Riesgo aceptado: cada design-{tipo} pasa a depender del shared (mitigado por DET-7 regression) |
| 2 | Modelo atomico de sessions: steps + gates como elementos individuales con StepStatus mutable + reindex post-gate-decision (H10) | El dev pasa de ver "session = bloque opaco" a ver "que ejecuto el LLM y que viene". Reindex no satura (post-gate, no post-task). Cambio estructural pero backward-compatible |
| 3 | SessionStatus extendido con 'projected' (H5.1) — sin nuevo SessionKind | Sessions del `### Plan de sessions` aparecen en HC como placeholders navegables. Un componente cubre todos los status |
| 4 | Layout D Hibrido en SectionSessions (H5.2) | Cubre vista global + detalle atomico + gates colapsables en un solo componente. Mas codigo pero mejor UX general |
| 5 | Vue Flow para `dkc:hypothesis-map` (H11) | mermaid satura con 12+ nodos. Vue Flow agrega ~80kb gzipped lazy-loaded a cambio de pan/zoom/drill-down. Aplicable a futuros bloques dkc:* con grafos |
| 6 | `commands/dkc-export-rules --global` (D2) sincroniza `~/.claude/CLAUDE.md` con DETs `scope:global + level:must` | Sin sync, el LLM razona en vacio sobre DKC cuando opera fuera del deckard root. Helper agnostico de tooling (no acopla a claude harness) |
| 7 | Templates teach-{intake,close}.md con intros narrativas + checklist 5-ejes como contrato (H4 + H12) | Convierte teach de data dump en material acompañante. El dev nuevo entiende el por que de cada seccion antes de leer la data |
| 8 | Eliminar H7 del scope (sin hook claude harness) | Preserva agnosticismo de tooling — Cursor/Cline siguen funcionando sin cambios. Helper de D2 alcanza |

**Riesgos principales y como los mitigamos**:

- **Refactor del parser sessions.ts puede romper render de tickets legacy (HOR-001..HOR-014)** → REQ-PRESERVE-01: tickets pre-2026-05-10 mantienen render actual (atoms[]=[] + plannedTasks legacy). Smoke UI obligatorio en S8.GATE
- **Boilerplate compartido en `_design-shared.md` puede introducir regresion en cualquier design-{tipo}** → S7.GATE valida que cada design-{tipo} sigue produciendo spec valido. Tests del workflow + dogfooding del propio S8 (que usa design-improvement)
- **Vue Flow agrega ~80kb al bundle HC** → Lazy-load del componente: solo se importa cuando MarkdownBody encuentra un bloque `dkc:hypothesis-map`. Bundle inicial sin cambio
- **Reindex post-gate-decision puede disparar ciclo si un step de DKC dispara reindex y el reindex modifica metadata** → Hook idempotente y debounced: si reindex < 1s detecta no-cambios, no re-dispara

**Que NO se hace en este ticket**:

- **Hook PostToolUse claude harness** (H7 refuted en draft v1) — preserva agnosticismo de tooling
- **Reindex post-task individual** (H10-B opcion descartada) — granularidad gate alcanza, post-task seria spam
- **Refactor de `MarkdownBody.vue` mas alla del plugin para Vue Flow** — limita scope; otros refactors van a tickets dedicados
- **Migracion de bloques `dkc:decision-matrix` y `dkc:learning-path` a Vue Flow** — H11 cubre solo hypothesis-map; los otros quedan como follow-up evaluable
- **Auditoria retroactiva de teach generados antes de HOR-015** — los teach existentes (HOR-013/HOR-014) no se reescriben con intros narrativas; solo aplican a futuros teach
- **Findings menores que descubra el audit y no esten en hipotesis confirmadas** — quedan en backlog del ticket o follow-up

**Tamano estimado**: 4 sessions de execute (S6-S9), aproximadamente 8-14h efectivas distribuidas. **S8 es la mas pesada y riesgosa** (toca parser + componente + plugin Vue Flow + templates teach + reindex hook = ~6-8h con tier T3). S6 es la mas mecanica (parches DET asimetricas, T1, ~1.5-2h). S9 cierre + F-1 dogfooding requiere paciencia mas que tiempo.

**Como vas a saber que funciona** (criterios observables, no tecnicos):

- Abro un ticket cualquiera en HC y veo `S{done}/{total}` en sticky header con timeline mini de dots por session
- Expando una session y veo los steps individuales con icon de estado (✓/🔄/⏳); los gates aparecen como barras colapsables entre clusters de steps
- Cuando el LLM avanza durante un step largo, los cambios aparecen al disparar gates (no en tiempo continuo, no al final del step DKC completo)
- Abro el `teach-intake.md` de HOR-015 en HC y veo el hypothesis-map renderizado con Vue Flow (pan/zoom/click en nodo expande)
- Abro `~/.claude/CLAUDE.md` y veo entre marcadores HTML las DETs `scope:global + level:must` sincronizadas
- Cuando HOR-015 se cierra, `teach-close.md` se produce automatico (sin atencion humana del dev en gates) — F-1 dogfooding pasa

---

## Purpose

Resolver la deuda estructural identificada en intake-explore HOR-015 (12 hipotesis × multi-capa) que el dogfooding del workflow HOR-013/014 dejo expuesta: peso de prompts (H8), gates 22×3 asimetricas (H3 + H9), teach con cobertura implicita y experiencia debil (H4 + H12), HC sessions sin granularidad atomica ni reindex en tiempo real (H5 + H5.1 + H5.2 + H10), grafos densos saturados con mermaid (H11), CLAUDE.md global drift (H6 + D2). Lo nuevo introducido en este spec se cierra con dogfooding empirico (S9 cierra HOR-015 usando los prompts editados, sin atencion humana en gates automaticos).

Para el dev de DKC: se libera de mantener boilerplate duplicado en design-{tipo}, gana visibilidad granular del progreso del LLM en HC, opera con CLAUDE.md global siempre coherente con las DETs, y los teach que produce se vuelven acompañantes en lugar de data dumps.

## Analisis de mejora

### Estado actual

**Prompts del workflow**: 4 archivos `prompts/steps/design-{feature,fix,improvement,refactor}.md` suman 1252 lineas con boilerplate identico (gates teach-intake/draft/spec, executive summary B3, secciones 1-9 paralelas). Los top-3 mas pesados (`request-close` 429, `request-execute` 403, `design-feature` 372) ya leen templates correctamente — no hay templates inline ocultos.

**Gates 3-capas**: 22 DETs declaradas en `prompts/deterministic-rules.md`. Spot-check de 5: DET-15 capa 3 = 0 archivos (ningun step la implementa); DET-16/19/20 capa 2 = 0 menciones en `prompts/workflows/request.md`. RULE-workflow-det-introduction-001 (HOR-014) formaliza la simetria pero no audita retroactivamente. `prompts/workflows/request.md` no documenta el ciclo `continue` — solo vive en `commands/dkc.md`.

**Teach**: templates `templates/outputs/teach-{intake,close}.md` cubren los 5 ejes ("que sucede / por que / cambio / por que se propone / hecho") distribuidos en multiples secciones, pero sin checklist explicito. Las secciones (Hypothesis map, Decision drivers, Code preview, etc.) no tienen intros narrativas que expliquen "que es / como afecta al dev / por que mirarla". El dev senior con DKC interno deduce; el dev nuevo se pierde.

**HC sessions**: parser `server/deckard/sessions.ts:298` reconoce solo headings `### Session N` y `### Gate N`. NO parsea tabla `### Plan de sessions`. SessionKind = 'gate' | 'session' sin distincion planned vs executed. SectionSessions.vue muestra sessions como bloques opacos — no contador `S{done}/{total}`, no atomos visibles, no placeholders de sessions futuras. Reindex actual (HOR-014) dispara post-step DKC completo — durante un step largo el dev no ve avance en tiempo real.

**Grafos en teach**: `dkc:hypothesis-map` se renderiza con mermaid embebido. Para HOR-015 (12 hipotesis clusterizadas por eje), mermaid auto-layout genera spaghetti.

**CLAUDE.md global**: `~/.claude/CLAUDE.md` (14kb) sin marcadores HTML para sync con DETs. Drift garantizado. Helper `commands/dkc-export-rules` existe para CLAUDE.md de repos individuales pero no tiene modo `--global`.

### Problema / oportunidad

**El contrato no se cumple solo**: DETs declaradas sin capa 3 son contratos invisibles. El bug de HOR-013 (teach-close manual) se replicaria silenciosamente en cualquier DET con capa 3 = 0.

**Pesos crecen con cada nuevo design-{tipo}**: si en el futuro se agrega un design-{tipo} (ej. `design-spike`, `design-migration`), se duplica el boilerplate una quinta vez.

**El dev pierde contexto entre intake y execute**: el plan de sessions vive en el ticket markdown (DET-20) pero HC no lo muestra — el dev no sabe cuanto falta hasta que abre el archivo.

**El LLM avanza opaco para el dev**: durante un step largo (S8 con 9 sub-tasks), el dev no ve "donde esta" — solo ve actividad cuando el step DKC completo termina y reindex dispara. Esto es exactamente lo opuesto a lo que necesita un human-in-the-loop.

**El teach es generic**: cubre los 5 ejes pero no los DECLARA como contrato. Si LLM omite seccion opcional (ej. `dkc:decision-matrix` cuando no hay alternativas comparables), el eje "por que se propone" queda implicito. El dev nuevo no entiende "que es esa matriz" sin contexto.

**CLAUDE.md global desincronizado**: cualquier proyecto que el LLM toque sin entrar al deckard root opera con DETs en memoria solo si las recuerda del CLAUDE.md global. Si CLAUDE.md global no las tiene, el LLM razona en vacio sobre flujos DKC.

### Estado deseado

- 4 design-{tipo}.md con ~150 lineas cada uno (vs ~300 actuales) referenciando `_design-shared.md` para boilerplate comun. Cualquier cambio al patron design se aplica una sola vez
- Matriz 22×3 DETs con simetria documentada. Cada DET con capa 1 + capa 2 + capa 3 verificada. RULE-workflow-det-introduction-001 cubre prevencion futura
- `prompts/workflows/request.md` documenta el ciclo `continue` con flujo + ref a `commands/dkc.md`
- Templates teach-{intake,close}.md con intros narrativas (`> Que es / Como te afecta / Por que mirarla`) + checklist 5-ejes como contrato del step ejecutor
- Parser sessions.ts extrae tabla `### Plan de sessions` (status='projected') + atomos individuales (steps + gates) con StepStatus mutable. Tickets legacy preservan render actual
- SectionSessions.vue con layout D Hibrido: timeline mini sticky + atoms expandibles + gates colapsables + contador `S{done}/{total}`
- Reindex post-gate-decision en deckard prompts (steps relevantes lo invocan al cierre de session/gate). Granularidad media — modelo granular maximo + reindex eficiente
- Componente `<DkcHypothesisGraph>` con Vue Flow para `dkc:hypothesis-map` — lazy-loaded (sin impacto bundle inicial)
- `commands/dkc-export-rules --global` sincroniza `~/.claude/CLAUDE.md` con DETs `scope:global + level:must` entre marcadores HTML. Idempotente

### Alcance propuesto

**SI se toca**:
- `prompts/steps/_design-shared.md` (NUEVO) + refactor de `design-{feature,fix,improvement,refactor}.md`
- `prompts/workflows/request.md` (continue-flow + parches DET capa 2)
- `prompts/steps/*.md` (parches DET capa 3 segun matriz)
- `prompts/deterministic-rules.md` (refinar texto si la matriz lo requiere — minimo)
- `templates/outputs/teach-{intake,close}.md` (intros narrativas + checklist 5-ejes)
- `prompts/steps/teach-{intake,close}.md` (validar checklist como gate)
- `commands/dkc-export-rules` (modo `--global`)
- `~/.claude/CLAUDE.md` (sync inicial entre marcadores)
- `horadric-cube/server/deckard/sessions.ts` (SessionStatus + parser plan + parser atomos)
- `horadric-cube/src/api/client.ts` (types AtomicStep/AtomicGate/StepStatus/SessionAtom)
- `horadric-cube/src/components/ticket-sections/SectionSessions.vue` (layout D Hibrido)
- `horadric-cube/src/components/shell/MarkdownBody.vue` (plugin para `dkc:hypothesis-map` → Vue Flow)
- `horadric-cube/src/components/dkc-blocks/DkcHypothesisGraph.vue` (NUEVO) — Vue Flow lazy-loaded

**NO se toca** (limites del scope):
- Hook PostToolUse claude harness (H7 refuted)
- Reindex post-task individual (H10-B opcion descartada)
- Migracion de `dkc:decision-matrix`/`dkc:learning-path` a Vue Flow (solo hypothesis-map)
- Refactor general de MarkdownBody mas alla del plugin Vue Flow
- Auditoria retroactiva de teach pre-HOR-015 (intros narrativas solo en futuros teach)
- Bloques dkc:* nuevos (ej. dkc:hypothesis-graph como bloque distinto) — se reusa dkc:hypothesis-map

### Complejidad estimada

**Compleja** — multi-archivo, multi-area (deckard prompts + horadric-cube + claude config), tier T3 en S8 y S9. Mitigacion: 4 sessions con ⚑ fuerte gates aislando riesgos por area. F-1 dogfooding empirico en S9 cierra el ciclo.

## Requirements

### REQ-IMPROVE-01: Simetria 3-capas para todas las DETs (cobertura retroactiva)

El sistema MUST garantizar que las 22 DETs (DET-1..DET-22) tengan capa 1 (regla en `prompts/deterministic-rules.md`) + capa 2 (mencion en `prompts/workflows/request.md` o subworkflow) + capa 3 (implementacion en step ejecutor). Si una DET no tiene capa 2 o capa 3 implementada, agregarla. Si una DET por su naturaleza no aplica a alguna capa, justificar inline en la matriz.

**Actor**: dev del workflow DKC.
**Layers**: meta (rules + workflows + steps).

#### Scenario: matriz post-fix tiene 22 filas con cobertura 3-capas
- **GIVEN** las 22 DETs declaradas en `prompts/deterministic-rules.md`
- **WHEN** se genera la matriz `prompts/det-coverage-matrix.md`
- **THEN** cada fila tiene `capa1 / capa2 / capa3` con valores `present / N/A justificada` — ningun valor `absent` queda sin parche
- **AND** RULE-workflow-det-introduction-001 cubre prevencion para DETs futuras

#### Acceptance
**Dev puede verificar**: leer la matriz, confirmar que toda DET tiene 3 capas (o N/A justificada). Detectar gaps con `grep "absent" prompts/det-coverage-matrix.md` → 0 matches.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Matriz completa | 22 DETs declaradas | generar matriz | 22 filas | 22 |
| 2 | Cero asimetrias | matriz | grep "absent" | 0 matches | 0 |
| 3 | Continue-flow capa 2 | request.md | grep "continue\|retomar" | ≥1 mencion | ≥1 |

### REQ-IMPROVE-02: Boilerplate de design-{tipo} extraido a `_design-shared.md`

El sistema MUST consolidar el boilerplate identico de los 4 archivos `prompts/steps/design-{feature,fix,improvement,refactor}.md` en un nuevo archivo `prompts/steps/_design-shared.md` referenciado por cada uno. Cada `design-{tipo}.md` queda con: frontmatter + Read del shared + delta especifico del tipo.

**Actor**: dev que escribe un design-{tipo} nuevo o modifica el patron compartido.
**Layers**: meta (prompts/steps/).

#### Scenario: cada design-{tipo} sigue produciendo spec valido
- **GIVEN** los 4 design-{tipo}.md refactorizados con `Read prompts/steps/_design-shared.md`
- **WHEN** un ticket invoca `design-improvement` (este propio HOR-015 lo invoco — dogfooding)
- **THEN** el spec generado mantiene todas las secciones obligatorias (gates, exec summary B3, requirements, tasks, NFRs, etc.)
- **AND** el spec cumple los gates de `design-{tipo}` sin diferencias respecto al estado pre-refactor

#### Scenario: reduccion de lineas medible
- **GIVEN** cada design-{tipo}.md pre-refactor con ~280-372 lineas
- **WHEN** se aplica el refactor
- **THEN** cada uno queda con ~150 lineas (reduccion 30-40%)

#### Acceptance
**Dev puede verificar**: `wc -l prompts/steps/design-*.md` muestra reduccion. `_design-shared.md` existe y es referenciado por los 4. design-improvement de HOR-015 (dogfooding) produjo este propio spec sin issues.

### REQ-IMPROVE-03: `commands/dkc-export-rules --global` sincroniza CLAUDE.md global

El sistema MUST proveer un modo `--global` en `commands/dkc-export-rules` que exporta DETs con `scope:global + level:must` a `~/.claude/CLAUDE.md` entre marcadores HTML idempotentes (`<!-- BEGIN dkc-rules -->` ... `<!-- END dkc-rules -->`).

**Actor**: dev al editar `prompts/deterministic-rules.md`. Manual — el dev ejecuta el helper.
**Layers**: meta (commands/) + config (~/.claude/CLAUDE.md).

#### Scenario: sync inicial limpio
- **GIVEN** `~/.claude/CLAUDE.md` actual sin marcadores DKC
- **WHEN** se ejecuta `./commands/dkc-export-rules --global`
- **THEN** marcadores `<!-- BEGIN dkc-rules -->...<!-- END dkc-rules -->` insertados con DETs sincronizadas
- **AND** segunda ejecucion (idempotente) no duplica contenido

#### Acceptance
**Dev puede verificar**: leer `~/.claude/CLAUDE.md` post-sync. Ver bloque entre marcadores con las 22 DETs (o subset `level:must`). Re-ejecutar el helper no cambia nada.

### REQ-IMPROVE-04: Templates teach con intros narrativas + checklist 5-ejes como contrato

El sistema MUST modificar `templates/outputs/teach-{intake,close}.md` para que cada seccion principal (Hypothesis map, Decision drivers, Code preview, What you should know, Learning path, Active questions) tenga una intro narrativa con bloque `> **Que es esta seccion** / **Como te afecta** / **Por que mirarla**` ANTES del contenido de la seccion. El step ejecutor (`prompts/steps/teach-intake.md` y `teach-close.md`) MUST validar como gate la presencia de las intros y la cobertura de los 5 ejes (que sucede / por que sucede / que cambio se propone / por que / que se realizo).

**Actor**: scribe (genera teach), dev que lee el teach.
**Layers**: meta (templates + steps).

#### Scenario: nuevo teach generado pasa el checklist
- **GIVEN** un ticket nuevo en design-improvement
- **WHEN** se invoca teach-intake post intake-explore
- **THEN** el archivo generado tiene intros narrativas en cada seccion + cobertura de 4 ejes pre-execute
- **AND** el step ejecutor verifica como gate: presencia de las intros + cobertura ejes
- **AND** si una seccion omite intro narrativa, el gate bloquea con mensaje especifico

#### Acceptance
**Dev puede verificar**: abrir un teach-intake recien generado en HC. Cada seccion empieza con bloque blockquote `> **Que es / Como te afecta / Por que mirarla**`. Comparar con teach-intake de HOR-013/HOR-014 (sin intros) — la diferencia de experiencia es visible.

### REQ-IMPROVE-05: Modelo atomico de sessions con SessionStatus 'projected' y atomos navegables

El sistema MUST extender el modelo de sessions en horadric-cube para soportar:

(a) `SessionStatus: 'projected'` — sessions parseadas de la tabla `### Plan de sessions` del ticket. atoms[] vacio.

(b) `AtomicStep` y `AtomicGate` — atomos individuales con `StepStatus: 'pending' | 'in_progress' | 'executed'` y `type: 'step' | 'gate'` discriminado.

(c) Parser de tabla `### Plan de sessions` que emite `SessionSummary[]` con `status: 'projected'`.

(d) Parser de bloque `### Session N` que emite atomos individuales (steps via patron `S{N}.T{M}` con checkboxes `[x]/[~]/[ ]`, gates via patron `Gate {label}` con criterios).

**Actor**: HC viewer + dev que navega tickets en HC.
**Layers**: backend (parser + types) + frontend (api types) + meta (template del ticket).

#### Scenario: ticket nuevo con plan de sessions parseado
- **GIVEN** un ticket con tabla `### Plan de sessions` (S1..S5 proyectadas)
- **WHEN** HC consulta `/api/tickets/{id}`
- **THEN** la respuesta tiene 5 SessionSummary con `status: 'projected'` y `atoms: []`
- **AND** SectionSessions.vue las renderiza como placeholders

#### Scenario: backwards compatibility tickets legacy
- **GIVEN** HOR-001..HOR-014 (tickets pre-2026-05-10 sin atomos parseables)
- **WHEN** HC consulta `/api/tickets/{id}`
- **THEN** los SessionSummary tienen `atoms: []` + `plannedTasks` populated como antes
- **AND** SectionSessions.vue los renderiza con el modo legacy (sin regression visual)

#### Acceptance
**Dev puede verificar**: abrir HOR-015 en HC, ver 9 sessions (4 ejecutadas + 5 projected como placeholders dashed). Abrir HOR-013 (legacy), ver render igual al actual.

### REQ-IMPROVE-06: Layout D Hibrido en SectionSessions

El sistema MUST refactorizar `SectionSessions.vue` para implementar el layout D Hibrido aprobado en draft v1: timeline mini en sticky header + contador `S{done}/{total}` + sessions expandibles con atomos visibles + gates colapsables agrupando steps adyacentes.

**Actor**: dev que navega tickets en HC.
**Layers**: frontend (componente).

#### Scenario: dev navega HOR-015 durante S8
- **GIVEN** HOR-015 con S6/S7 ejecutadas, S8 in_progress, S9 projected
- **WHEN** dev abre el ticket en HC
- **THEN** sticky header muestra `7/9 sessions` + timeline mini con dots `1✓ 2✓ 3✓ 4✓ 5✓ 6✓ 7✓ 8🔄 9⊘`
- **AND** session S8 expandida muestra atomos individuales con icon de estado por StepStatus
- **AND** gates intermedios aparecen como barras colapsables (collapsedByDefault) con badge de status

#### Acceptance
**Dev puede verificar**: ver timeline mini sticky en cualquier ticket. Click en gate colapsado lo expande. Smoke UI 5 tabs HC pass.

### REQ-IMPROVE-07: Reindex post-gate-decision en deckard prompts

El sistema MUST agregar reindex automatico al cierre de session y/o cuando un gate decide (continue/iterate/escalate/standby). Replica el patron auto-reindex de HOR-014 pero a granularidad gate, no step DKC completo. Los steps relevantes (`request-execute`, `request-close`) invocan `./commands/dkc-reindex {project}` en el cierre del session/gate.

**Actor**: HC viewer + dev que navega progreso del LLM en tiempo real.
**Layers**: meta (prompts/steps/).

#### Scenario: dev ve cambios acumulados al disparar gate
- **GIVEN** una session con 5 tasks, dev mirando HC en otra ventana
- **WHEN** el LLM ejecuta tasks T1-T4 (cambios de estado pending→executed)
- **THEN** HC NO refleja los cambios task-por-task (no spam)
- **AND** cuando el gate del session decide, reindex dispara y HC refleja todos los cambios acumulados de golpe

#### Acceptance
**Dev puede verificar**: durante S8 de HOR-015 mantener HC abierto. Ver que los cambios aparecen en bloques al final de cada session, no continuamente. Logs de reindex muestran disparos en momentos discretos.

### REQ-IMPROVE-08: Vue Flow para `dkc:hypothesis-map`

El sistema MUST agregar un componente `<DkcHypothesisGraph>` en HC que renderiza el contenido de bloques `dkc:hypothesis-map` con Vue Flow (pan/zoom/click en nodo expande detalles). El componente se carga lazy via dynamic import — bundle inicial sin cambio. `MarkdownBody.vue` plugin detecta el bloque y monta el componente.

**Actor**: dev que lee teach con hypothesis-map denso (ej. HOR-015).
**Layers**: frontend (componente nuevo + plugin MarkdownBody).

#### Scenario: hypothesis-map de HOR-015 renderiza con Vue Flow
- **GIVEN** `tickets/HOR-015.teach/teach-intake.md` con bloque `dkc:hypothesis-map` (12 hipotesis)
- **WHEN** dev abre el teach en HC
- **THEN** el bloque renderiza con Vue Flow (no mermaid)
- **AND** dev puede pan/zoom/click en cada nodo para ver `rationale` expandido
- **AND** nodos custom muestran badge de status (confirmed/refuted/partial/open) y color por status

#### Scenario: bundle inicial sin cambio
- **GIVEN** HC sin abrir ningun teach con hypothesis-map
- **WHEN** se mide el bundle inicial
- **THEN** Vue Flow NO esta incluido (lazy import)
- **AND** primer abrir un teach con hypothesis-map dispara el lazy load (~80kb gzipped)

#### Acceptance
**Dev puede verificar**: abrir teach-intake de HOR-015, ver el grafo con Vue Flow. Click en nodo H8 expande tooltip con rationale. Dev tools Network muestra Vue Flow chunk cargado on-demand.

### REQ-PRESERVE-01: Tickets legacy mantienen render actual

El sistema MUST preservar el render visual de tickets pre-2026-05-10 (HOR-001..HOR-014). Sus sessions se parsean con `atoms: []` + `plannedTasks` legacy. SectionSessions.vue detecta atoms vacio y cae al modo legacy.

#### Scenario: HOR-013 sin regresion
- **GIVEN** HOR-013 (cerrado, sin atomos parseables)
- **WHEN** dev abre el ticket en HC
- **THEN** render visual identico al actual (sin cambios respecto a smoke baseline pre-refactor)

### REQ-PRESERVE-02: F-1 dogfooding pasa al cerrar HOR-015

El sistema MUST permitir que el cierre de HOR-015 (S9) se ejecute SIN atencion humana en gates automaticos. teach-close se produce automaticamente por el step ejecutor (no manual). Los 5 ejes quedan cubiertos en el teach-close generado.

#### Scenario: cierre desatendido exitoso
- **GIVEN** HOR-015 con S6-S8 completados
- **WHEN** se invoca request-close
- **THEN** teach-close.md se produce automatico
- **AND** frontmatter ticket queda `status: closed, teachings: { intake: done, close: done }`
- **AND** dev no tuvo que recordar manualmente DET-22

### REQ-PRESERVE-03: Smoke UI 5 tabs HC sin regresion

El sistema MUST mantener el render funcional de las 5 tabs principales de HC (Tickets / Specs / Rules / Decisions / Bugs) tras los cambios en MarkdownBody, SectionSessions y nuevos componentes.

#### Scenario: smoke UI manual
- **GIVEN** HC corriendo en localhost:3016
- **WHEN** dev navega las 5 tabs principales con tickets/specs/rules/decisions/bugs reales
- **THEN** todos renderizan sin errores de consola, sin layout breaks, sin missing components

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | Reindex incremental no debe agregar latencia perceptible | Reindex post-gate | < 500ms en horadric (32 records actuales) |
| Bundle | Vue Flow no impacta bundle inicial | Bundle initial size | sin cambio (lazy import) |
| Bundle | Vue Flow chunk on-demand | Tamano lazy chunk | < 100kb gzipped |
| Idempotencia | `dkc-export-rules --global` segunda ejecucion | Hash output | identico al primer run |
| Backwards compat | Tickets pre-2026-05-10 | Render visual smoke UI | identico a baseline |

## Changes

### Modified

| Archivo | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `prompts/steps/design-feature.md` | 372 lineas, boilerplate full | ~150 lineas, `Read _design-shared.md` + delta especifico | REQ-IMPROVE-02 |
| `prompts/steps/design-fix.md` | 266 lineas | ~140 lineas, idem | REQ-IMPROVE-02 |
| `prompts/steps/design-improvement.md` | 331 lineas | ~150 lineas, idem | REQ-IMPROVE-02 |
| `prompts/steps/design-refactor.md` | 283 lineas | ~140 lineas, idem | REQ-IMPROVE-02 |
| `prompts/workflows/request.md` | sin continue-flow, 0 menciones DET-16/19/20 | con seccion `## Re-entrada (continue)` + parches DET capa 2 | REQ-IMPROVE-01 |
| `prompts/steps/{ej. request-execute,close}.md` | DET-15 capa 3 = 0 archivos | invocacion explicita de DET-15 en steps relevantes | REQ-IMPROVE-01 |
| `templates/outputs/teach-intake.md` | secciones sin intros | con bloque `> **Que es / Como te afecta / Por que mirarla**` por seccion | REQ-IMPROVE-04 |
| `templates/outputs/teach-close.md` | idem | idem | REQ-IMPROVE-04 |
| `prompts/steps/teach-intake.md` | sin gate de checklist 5-ejes | con gate validando intros + 4 ejes pre-execute | REQ-IMPROVE-04 |
| `prompts/steps/teach-close.md` | idem | con gate validando intros + 5 ejes incluyendo "que se hizo" | REQ-IMPROVE-04 |
| `commands/dkc-export-rules` | sin modo `--global` | con modo `--global` apuntando a `~/.claude/CLAUDE.md` | REQ-IMPROVE-03 |
| `~/.claude/CLAUDE.md` | sin marcadores DKC | con bloque entre `<!-- BEGIN dkc-rules -->...<!-- END -->` | REQ-IMPROVE-03 |
| `horadric-cube/server/deckard/sessions.ts` | SessionKind = 'gate' \| 'session', sin parser de plan | extender SessionStatus con 'projected', parser de tabla, parser de atomos | REQ-IMPROVE-05 |
| `horadric-cube/src/api/client.ts` | sin types AtomicStep/AtomicGate | con types AtomicStep, AtomicGate, StepStatus, SessionAtom | REQ-IMPROVE-05 |
| `horadric-cube/src/components/ticket-sections/SectionSessions.vue` | layout actual (bloques opacos) | layout D Hibrido (timeline mini + atoms + gates colapsables + contador) | REQ-IMPROVE-06 |
| `horadric-cube/src/components/shell/MarkdownBody.vue` | sin plugin para `dkc:hypothesis-map` interactivo | con plugin que detecta el bloque y monta `<DkcHypothesisGraph>` lazy | REQ-IMPROVE-08 |
| `prompts/steps/{request-execute,close}.md` | auto-reindex post-step DKC | auto-reindex tambien post-gate-decision | REQ-IMPROVE-07 |

### Added

| Archivo | Proposito |
|---------|-----------|
| `prompts/steps/_design-shared.md` | Boilerplate compartido entre design-{tipo}: gates, executive summary B3, secciones 1-9 paralelas |
| `prompts/det-coverage-matrix.md` | Matriz 22×3 DETs vs (regla, workflow, step). Auditoria retroactiva H3 |
| `horadric-cube/src/components/dkc-blocks/DkcHypothesisGraph.vue` | Componente Vue Flow para `dkc:hypothesis-map`. Lazy-loaded |

## Tasks

### Session 6 — Gates simetria + continue-flow [tipo: auto] [tier: T1]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S6.T1 | Auditoria 22×3 DETs → matriz `prompts/det-coverage-matrix.md` con cada fila clasificada `present / N/A justificada / absent` | researcher | — | `prompts/det-coverage-matrix.md`, lectura de `prompts/deterministic-rules.md`, `prompts/workflows/request.md`, `prompts/steps/*.md` | DET-1, DET-2, DET-11 | matriz con 22 filas, 0 valores `absent` sin parche planificado | pending | 6 | — | — |
| S6.T2 | Parche DETs con capa 2 ausente (DET-16, DET-19, DET-20 detectadas en intake) — agregar menciones en `prompts/workflows/request.md` | developer | S6.T1 | `prompts/workflows/request.md` | DET-5, DET-8, DET-10, DET-11 | grep `DET-16\ | DET-19\ | DET-20` muestra ≥1 mencion cada una | pending | 6 | — | — |
| S6.T3 | Parche DETs con capa 3 ausente (DET-15 detectada) — agregar invocacion explicita en steps relevantes (request-execute, request-close) | developer | S6.T1 | `prompts/steps/request-execute.md`, `prompts/steps/request-close.md` | DET-5, DET-8, DET-10, DET-11 | grep `DET-15` en steps muestra ≥1 mencion | pending | 6 | — | — |
| S6.T4 | Documentar continue-flow en `prompts/workflows/request.md` — seccion `## Re-entrada (continue)` con flujo + ref a `commands/dkc.md` (H9) | developer | S6.T1 | `prompts/workflows/request.md` | DET-5, DET-8 | seccion existe, mencion clara del ciclo continue | pending | 6 | — | — |
| S6.T5 | Re-verificar matriz post-fix | researcher | S6.T2, S6.T3, S6.T4 | `prompts/det-coverage-matrix.md` | DET-4, DET-13 | 0 valores `absent`, matriz actualizada | pending | 6 | — | — |
| **S6.GATE** | **Gate de sync Session 6 (tier: T1)** — persistir gate en `## Sessions` del ticket usando Template de Gate, validar workflow con tests del modulo, decidir continue/iterate/escalate/standby | reviewer | S6.T1, S6.T2, S6.T3, S6.T4, S6.T5 | ticket | DET-20 | gate persistido + decision documentada | pending | 6 | — | — |

### Session 7 — Design-shared + claude-sync [tipo: ⚑ fuerte] [tier: T2]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S7.T1 | Crear `prompts/steps/_design-shared.md` con boilerplate extraido (gates, exec summary B3, secciones 1-9 paralelas) | developer | S6.GATE | `prompts/steps/_design-shared.md` | DET-1, DET-2, DET-8, DET-16 | archivo creado, contenido coherente con los 4 design-{tipo} | pending | 7 | — | — |
| S7.T2 | Refactor `prompts/steps/design-feature.md` para `Read _design-shared` + delta especifico | developer | S7.T1 | `prompts/steps/design-feature.md` | DET-5, DET-8, DET-10, DET-16 | wc -l reducido a ~150, dogfooding test: design-feature de un ticket simulado produce spec valido | pending | 7 | — | — |
| S7.T3 | Refactor `prompts/steps/design-fix.md` | developer | S7.T1 | `prompts/steps/design-fix.md` | DET-5, DET-8, DET-10, DET-16 | idem | pending | 7 | — | — |
| S7.T4 | Refactor `prompts/steps/design-improvement.md` | developer | S7.T1 | `prompts/steps/design-improvement.md` | DET-5, DET-8, DET-10, DET-16 | idem | pending | 7 | — | — |
| S7.T5 | Refactor `prompts/steps/design-refactor.md` | developer | S7.T1 | `prompts/steps/design-refactor.md` | DET-5, DET-8, DET-10, DET-16 | idem | pending | 7 | — | — |
| S7.T6 | Extender `commands/dkc-export-rules` con modo `--global` apuntando a `~/.claude/CLAUDE.md` con marcadores HTML | developer | S6.GATE | `commands/dkc-export-rules` | DET-5, DET-8, DET-10, DET-16 | ejecutar `--global` actualiza `~/.claude/CLAUDE.md` entre marcadores. Idempotente (segunda corrida = no diff) | pending | 7 | — | — |
| S7.T7 | Sync inicial de `~/.claude/CLAUDE.md` global con DETs `scope:global + level:must` | developer | S7.T6 | `~/.claude/CLAUDE.md` | DET-5, DET-16 | bloque entre marcadores con DETs sincronizadas. Diff revisado por dev antes de aceptar | pending | 7 | — | — |
| **S7.GATE** | **Gate de sync Session 7 (tier: T2)** — diff CLAUDE.md global revisado, cada design-{tipo} sigue produciendo spec valido (test dogfooding), regression tests del workflow pasan | reviewer | S7.T1..S7.T7 | ticket | DET-20, DET-7, DET-13 | gate persistido + diff aprobado por dev + 0 regresiones en tests workflow | pending | 7 | — | — |

### Session 8 — Teach narrativo + HC sessions atomicas + Vue Flow [tipo: ⚑ fuerte] [tier: T3]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S8.T1 | Refactor `templates/outputs/teach-intake.md` con intros narrativas (`> Que es / Como te afecta / Por que mirarla`) en cada seccion principal | developer | S7.GATE | `templates/outputs/teach-intake.md` | DET-5, DET-8, DET-16 | cada seccion empieza con bloque blockquote narrativo. Diff comparado con HOR-015 teach (que ya dogfoodeo el patron) | pending | 8 | — | — |
| S8.T2 | Refactor `templates/outputs/teach-close.md` con intros narrativas (5 ejes — incluye "que se hizo") | developer | S7.GATE | `templates/outputs/teach-close.md` | DET-5, DET-8, DET-16 | idem | pending | 8 | — | — |
| S8.T3 | Actualizar `prompts/steps/teach-intake.md` y `teach-close.md` con gate que valida intros narrativas + cobertura 5-ejes | developer | S8.T1, S8.T2 | `prompts/steps/teach-intake.md`, `prompts/steps/teach-close.md` | DET-5, DET-8, DET-10 | gate falla si una seccion omite intro o un eje no esta cubierto. Test: generar teach mock que falla un eje → gate bloquea | pending | 8 | — | — |
| S8.T4 | Extender `horadric-cube/server/deckard/sessions.ts` con SessionStatus 'projected', parser de tabla `### Plan de sessions`, parser de atomos (steps `S{N}.T{M}` con checkboxes + gates intermedios) | developer | S7.GATE | `horadric-cube/server/deckard/sessions.ts` | DET-5, DET-8, DET-10, DET-11 | unit tests del parser pasan. Tests sobre HOR-015 (con plan + atomos) producen SessionSummary[] correcto. Tests sobre HOR-013 (legacy) producen atoms=[] sin regresion | pending | 8 | — | — |
| S8.T5 | Extender `horadric-cube/src/api/client.ts` con types AtomicStep, AtomicGate, StepStatus, SessionAtom (consumir `data-model.ts` del draft) | developer | S8.T4 | `horadric-cube/src/api/client.ts` | DET-5, DET-8, DET-16 | typecheck pass. Types alineados con server/deckard/sessions.ts | pending | 8 | — | — |
| S8.T6 | Refactor `horadric-cube/src/components/ticket-sections/SectionSessions.vue` con layout D Hibrido (timeline mini sticky + atoms expandibles + gates colapsables + contador `S{done}/{total}`) | developer | S8.T5 | `horadric-cube/src/components/ticket-sections/SectionSessions.vue` | DET-5, DET-8, DET-10, RULE-platform-001 (si existe) | smoke UI manual: HOR-015 muestra timeline 9 dots + sticky contador + S8 expandido con atomos + gates colapsables. HOR-013 (legacy) sin regresion visual | pending | 8 | — | — |
| S8.T7 | Agregar reindex post-gate-decision en steps relevantes (`request-execute.md`, `request-close.md`) — invocar `dkc-reindex` en cierre de session/gate | developer | S6.GATE | `prompts/steps/request-execute.md`, `prompts/steps/request-close.md` | DET-5, DET-8, DET-16 | dogfooding inmediato: durante S8 ejecucion, dev mantiene HC abierto y ve cambios aparecer en bloques al cierre de gates (no continuamente, no al final del step DKC) | pending | 8 | — | — |
| S8.T8 | Crear `horadric-cube/src/components/dkc-blocks/DkcHypothesisGraph.vue` con Vue Flow (nodos custom + drill-down + colores por status) | developer | S8.T5 | `horadric-cube/src/components/dkc-blocks/DkcHypothesisGraph.vue` | DET-1, DET-2, DET-8, DET-16 | unit tests pasan. Componente renderiza un hypothesis-map mock con 12 nodos sin layout broken | pending | 8 | — | — |
| S8.T9 | Extender `horadric-cube/src/components/shell/MarkdownBody.vue` plugin para detectar bloques `dkc:hypothesis-map` y montar `<DkcHypothesisGraph>` lazy via dynamic import | developer | S8.T8 | `horadric-cube/src/components/shell/MarkdownBody.vue` | DET-5, DET-8, DET-10, DET-16 | abrir HOR-015 teach-intake en HC: hypothesis-map renderiza con Vue Flow. Bundle inicial sin cambio (DevTools Network: chunk Vue Flow on-demand) | pending | 8 | — | — |
| **S8.GATE** | **Gate de sync Session 8 (tier: T3)** — smoke UI 5 tabs HC pass + dogfooding inmediato (durante S8 propio, dev navego progreso del LLM en tiempo real al disparar gates) + Vue Flow renderiza hypothesis-map de HOR-015 + regression tests pasan | reviewer | S8.T1..S8.T9 | ticket | DET-20, DET-7, DET-13, DET-14 | gate persistido + dev confirma observabilidad + 0 regresiones en 5 tabs | pending | 8 | — | — |

### Session 9 — Cierre + F-1 dogfooding [tipo: ⚑ fuerte] [tier: T3]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S9.T1 | Cerrar HOR-015 invocando `prompts/steps/request-close.md` (modificado en S8.T7 con reindex post-gate) sin atencion humana en gates automaticos | developer + reviewer | S8.GATE | ticket | DET-22, DET-13, DET-14 | request-close ejecuta sin intervencion. teach-close.md producido automatico (no manual). Frontmatter `teachings.close: done` | pending | 9 | — | — |
| S9.T2 | Verificar 5 ejes cubiertos en teach-close.md generado | reviewer | S9.T1 | `tickets/HOR-015.teach/teach-close.md` | DET-22, DET-4 | grep en teach-close encuentra cobertura de los 5 ejes (que sucede / por que / cambio / por que / hecho). Gate del step bloquearia si faltara alguno | pending | 9 | — | — |
| S9.T3 | Verificar dogfooding HC: dev navego progreso del LLM en tiempo real durante S8/S9 (validacion empirica H10-B reindex post-gate) | reviewer | S9.T1 | observable HC | DET-13 | dev confirma que vio cambios aparecer al disparar gates, no al final del step DKC completo | pending | 9 | — | — |
| S9.T4 | Regression suite completa horadric-cube (vitest) post-cambios | reviewer | S9.T1 | `horadric-cube/tests/` | DET-7, DET-13 | tests pasan, 0 fails introducidos respecto a baseline pre-S6 | pending | 9 | — | — |
| S9.T5 | Smoke UI final 5 tabs HC con tickets antiguos (HOR-001..HOR-014) y nuevos (HOR-015) | reviewer | S9.T1 | observable HC | DET-7, DET-13 | render funcional sin errores en consola, tickets legacy sin regresion visual | pending | 9 | — | — |
| **S9.GATE** |
