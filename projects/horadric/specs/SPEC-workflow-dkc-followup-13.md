---
id: SPEC-workflow-dkc-followup-13
project: horadric
ticket: HOR-014
status: done
---

# Followup HOR-013: cierre de gates DKC + render inline + teachings a nivel codigo + viewer coherence

# Followup HOR-013: cierre de gates DKC + render inline + teachings a nivel codigo + viewer coherence

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Artifacts, Tasks). Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: cerrar los huecos reales que aparecieron al USAR el workflow extendido por HOR-013. Tres categorias de problemas:

1. **El contrato no se cumple solo** — DET-22 (teach-close) y DET-21 (teach-intake) estan declarados como reglas pero los step ejecutores no los invocan automaticamente. HOR-013 cumplio porque el dev y el LLM tuvieron atencion humana en cada cierre. Cualquier cierre desatendido salta teach-close silenciosamente.

2. **El viewer (HC) no refleja la realidad de deckard** — el FlowDiagram modela 5 nodos cuando el workflow real tiene 8, los specs recien generados no aparecen en HC hasta reindex manual, las sessions planificadas no se ven (solo las ejecutadas), y hay un render bug que separa keys y values en sessions con un line break.

3. **El lenguaje pesado bloquea decisiones** — los specs son tecnicos y verbosos, el dev pierde tiempo parseando para aprobar. Falta una capa de lenguaje amigable orientada a aprobacion.

**Decisiones criticas que necesitan tu OK** (cada una con racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Aplicar B3 (lenguaje amigable) al template `spec.md` global — afecta a todos los specs futuros del proyecto | Tu friccion al revisar specs se reduce permanentemente, no solo en este ticket |
| 2 | Auto-reindex tras crear/modificar artefactos visibles (no solo en close) | El viewer HC siempre refleja el estado real de deckard sin friccion manual |
| 3 | Sessions planificadas + ejecutadas en SectionSessions de HC | Podes ver el avance global del ticket (cuanto falta vs cuanto hecho) en cada momento |
| 4 | Usar `dogfooding final` de HOR-014 como prueba empirica de que F-1 (DET-22 automatico) funciona | Sin esto, no hay forma de saber si el fix realmente cumple en cierres desatendidos futuros |

**Riesgos principales y como los mitigamos**:

- **Refactor del render markdown puede romper otros tabs HC** (S5) → smoke UI obligatorio en 5 tabs antes de cerrar la session.
- **Re-redactar spec con lenguaje amigable agrega trabajo** (B3 en S2) → patron simple (seccion al inicio + tabla de decisiones), no afecta al detalle tecnico abajo.
- **Auto-reindex puede agregar latencia perceptible si se invoca desde varios steps** (B1) → el script ya corre en ~400ms para horadric con 28 records; aceptable.

**Que NO se hace en este ticket**:
- Refactor mayor de `MarkdownBody.vue` (limita los cambios a `useMarkdown` sin tocar el shell component).
- Nuevas MCP tools especificas de teaching o reanudar HOR-012 (esas siguen como backlog HOR-013).
- Findings menores de auditoria F-7, F-9, F-10, F-11 si el tiempo no alcanza — quedan en backlog HOR-014.

**Tamano estimado**: 5 sessions ejecutables (S2-S6), aproximadamente 6-12h efectivas distribuidas. S2 (markdown-only T0) es la mas rapida; S5 (refactor markdown plugin T3) es la mas riesgosa.

**Como vas a saber que funciona**:
- El cierre del propio HOR-014 invoca `teach-close` automaticamente (sin que vos o el LLM lo recuerden).
- Abris un ticket en HC y ves su FlowDiagram correcto + sus sessions planificadas + ejecutadas + render limpio.
- Genero un teach-intake/spec/rule nuevo y aparece en HC sin que vos corras reindex manual.

---

## Purpose

Resolver los gaps reales que emergieron al usar el workflow extendido por HOR-013. Dos hallazgos criticos de auditoria (DET-22 ausente en `request-close`; DET-21 ausente en los 4 `design-{tipo}`) hacen que los gates declarados en `deterministic-rules` no se cumplan automaticamente — solo HOR-013 los cumplio porque el dogfooding tuvo atencion humana. Adicionalmente: el blueprint del FlowDiagram en HC modela 5 nodos cuando el workflow real tiene 8 (sintoma "ticket aparece como closing durante in_progress"), los teachings actuales son abstractos sin anclar codigo, y el render UX duplica contenido en tab Teaching. Esta spec consolida los fixes en un solo ciclo y termina con dogfooding que prueba empiricamente que el cierre cumple DET-22 sin intervencion humana.

## Requirements

### REQ-IMPROVE-01: request-close invoca teach-close automaticamente (DET-22)

El sistema MUST garantizar que `prompts/steps/request-close.md` invoque el sub-step `teach-close` antes de marcar `status: closed` en el ticket, y que el gate de salida verifique `teachings.close === 'done'`.

**Actor**: system (LLM ejecutando el flujo `/dkc close`)
**Layers**: meta (deckard prompts)

#### Scenario: cierre de ticket con work_type ∈ {implement, fix, improvement, refactor}
- **GIVEN** ticket en `status: in_progress` con todas las tasks `done` y `teachings.close: pending`
- **WHEN** se invoca `/dkc close`
- **THEN** `request-close` ejecuta el gate de DET-22 (verifica precondiciones), luego invoca `prompts/steps/teach-close.md`, espera a que termine
- **AND** despues verifica `teachings.close === 'done'` antes de marcar `status: closed`

#### Scenario: cierre de ticket quick / query (exentos)
- **GIVEN** ticket con `work_type ∈ {quick, query}`
- **WHEN** se invoca `/dkc close`
- **THEN** `request-close` salta el sub-step `teach-close` con justificacion documentada (DET-22 exime quick/query)
- **AND** marca `status: closed` directamente

#### Scenario: cierre falla porque teach-close no se completa
- **GIVEN** ticket en cierre + sub-step teach-close lanzado pero falla (ej: YAML invalido en bloques `dkc:*`)
- **WHEN** request-close verifica el gate de salida
- **THEN** detecta `teachings.close !== 'done'`, NO marca `status: closed`, reporta error al dev con localizacion del fallo

#### Acceptance
**El usuario puede verificar que funciona**: cerrar HOR-014 con `/dkc close` y observar que `tickets/HOR-014.teach/teach-close.md` se genera sin que el dev tenga que invocarlo manualmente, y que `frontmatter.teachings.close: pending → done` antes de `status: closed`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Cierre normal | ticket improvement con tasks done | `/dkc close` | teach-close invocado + status closed | `teachings.close: done` y archivo `.teach/teach-close.md` existe |
| 2 | Cierre quick exento | ticket quick con tasks done | `/dkc close` | teach-close skipped con razon | `status: closed` directo, sin archivo teach-close |
| 3 | teach-close falla YAML | YAML invalido en `dkc:hypothesis-map` | `/dkc close` → teach-close → falla | request-close NO marca closed | error reportado con linea del YAML |

### REQ-IMPROVE-02: design-{tipo} bloquean sin teach-intake (DET-21)

El sistema MUST garantizar que los 4 steps `design-feature.md`, `design-fix.md`, `design-improvement.md`, `design-refactor.md` implementen el gate DET-21 al inicio: verificar que `tickets/{TICKET-id}.teach/teach-intake.md` existe y `frontmatter.teachings.intake === 'done'` antes de empezar.

**Actor**: system (LLM ejecutando design)
**Layers**: meta (deckard prompts)

#### Scenario: design-{tipo} arranca con teach-intake done
- **GIVEN** ticket con `teachings.intake: done` y `tickets/{id}.teach/teach-intake.md` presente
- **WHEN** se invoca `design-{tipo}`
- **THEN** gate DET-21 pasa, design-{tipo} continua normal

#### Scenario: design-{tipo} bloquea sin teach-intake
- **GIVEN** ticket con `teachings.intake: pending` o campo ausente
- **WHEN** se invoca `design-{tipo}` directamente
- **THEN** gate DET-21 falla, design-{tipo} reporta "DET-21 violada — invocar teach-intake primero" y NO produce spec

#### Acceptance
**El usuario puede verificar que funciona**: crear un ticket con `teachings.intake: pending`, intentar invocar `design-improvement` directamente, observar que el step se rehusa a iniciar y senala el gate violado.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Gate pasa con teach-intake done | teachings.intake: done | invocar design-improvement | spec generado | spec con frontmatter completo |
| 2 | Gate bloquea con pending | teachings.intake: pending | invocar design-improvement | step rehusa | mensaje con DET-21 + ruta correcta (`teach-intake` primero) |
| 3 | Gate aplica a 4 design-{tipo} | mismo input | grep `DET-21` en design-feature/fix/improvement/refactor | match en los 4 | 4 archivos con gate explicito |

### REQ-IMPROVE-03: flowInference + workflow blueprint contemplan los 8 steps reales

El sistema MUST extender `horadric-cube/server/deckard/workflow.ts:getFlowBlueprint` y `flowInference.ts:inferCurrentStep` + `stepOrder` para modelar los steps faltantes: `intake-explore`, `teach-intake`, `design-transition-to-execute`, y `teach-close` como sub-step de `close`.

**Actor**: user (dev viendo FlowDiagram en HC)
**Layers**: backend (HC server), frontend (HC FlowDiagram component lee el resultado)

#### Scenario: ticket en intake-explore activo
- **GIVEN** ticket con `status: in_progress`, sin spec, frontmatter `teachings.intake: pending`
- **WHEN** HC renderea FlowDiagram para el ticket
- **THEN** muestra nodos `intake → intake-explore (active) → teach-intake → design-{tipo} → execute → close`
- **AND** `next: 'teach-intake'`

#### Scenario: ticket con todas las tasks done pero teach-close pendiente
- **GIVEN** ticket con spec, `specTaskStats.pending: 0`, `teachings.close: pending`, `status: in_progress`
- **WHEN** HC renderea FlowDiagram
- **THEN** muestra nodo `close` en estado `active` (no done), con sub-indicador "teach-close pending"
- **AND** NO muestra el ticket como `closed` o `done`

#### Scenario: ticket cerrado completamente
- **GIVEN** ticket con `status: closed`, `teachings.close: done`
- **WHEN** HC renderea FlowDiagram
- **THEN** todos los nodos en estado `done`
- **AND** `current: null`, `next: null`

#### Acceptance
**El usuario puede verificar que funciona**: abrir HOR-013 (que tiene `status: closed`, `teachings.close: done`) y HOR-014 (que estara `in_progress` durante S3) en HC. HOR-013 muestra todos los nodos done; HOR-014 muestra el nodo correspondiente al estado real (intake-explore done, teach-intake done, design-improvement active al momento de S3).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Ticket sin spec | hasSpec: false, teachings.intake: pending | inferCurrentStep | current: 'intake-explore' | nodo activo correcto |
| 2 | Ticket con spec + tasks pending | hasSpec: true, pending: 3 | inferCurrentStep | current: 'execute' | igual que pre-cambio |
| 3 | Ticket con tasks done + teach-close pending | hasSpec: true, pending: 0, teachings.close: pending | inferCurrentStep | current: 'close' (con sub-status teach-close pending) | NUEVO: distingue de close-done |
| 4 | Blueprint expone los 8 nodos | workType: improvement | getFlowBlueprint | nodes.length === 7 (excluye design-draft cuando creates_visual/data false) | array con intake-explore + teach-intake + ... |

### REQ-IMPROVE-04: Bloque `dkc:code-walkthrough` rendereable + templates extendidos

El sistema MUST agregar el bloque `dkc:code-walkthrough` con schema `CodeWalkthroughBlock` (ver `tickets/HOR-014.draft/data-model.ts`), parsearlo en HC y renderearlo via componente `CodeWalkthrough.vue`. Templates `teach-intake.md` y `teach-close.md` MUST tener seccion "Code preview/walkthrough" con ejemplo del bloque.

**Actor**: dev (autor del teaching) y dev (lector del teaching)
**Layers**: schema (shared types), backend (HC parser), frontend (HC component), meta (templates)

#### Scenario: autor de teaching incluye snippets de codigo
- **GIVEN** template `teach-intake.md` extendido con seccion "Code preview"
- **WHEN** el LLM (o dev) genera teach-intake.md siguiendo el template
- **THEN** el archivo incluye fence ` ```dkc:code-walkthrough` con `steps[]` validos
- **AND** HC parser reconoce kind `code-walkthrough` y produce `DkcBlock.parsed: CodeWalkthroughBlock`

#### Scenario: lector ve el bloque rendereado
- **GIVEN** archivo teach con bloque `dkc:code-walkthrough` parseado
- **WHEN** SectionTeachings rendea el block
- **THEN** `CodeWalkthrough.vue` despliega los steps con highlight + path:line clickable + texto educativo (`why`)
- **AND** layoutHint controla disposicion (numbered, before-after, flat)

#### Scenario: bloque con YAML invalido
- **GIVEN** fence `dkc:code-walkthrough` con YAML mal formado o falta `why` en step
- **WHEN** parser HC procesa el bloque
- **THEN** marca `block.parsed: false`, render visual cae a warning con razon especifica
- **AND** el resto del teaching se renderea normal

#### Acceptance
**El usuario puede verificar que funciona**: en S6, el `teach-close.md` de HOR-014 incluira automaticamente bloques `dkc:code-walkthrough` (porque el template extendido lo pide) con snippets reales de los 6+ archivos modificados en HOR-014. El dev abre HOR-014 en HC tab Teaching → Close y ve los snippets renderizados con highlight + ref a path:line.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Parser reconoce kind | fence `dkc:code-walkthrough` con YAML valido | blocks.ts parse | block.kind = 'code-walkthrough' | `parsed: CodeWalkthroughBlock` |
| 2 | Parser rechaza YAML invalido | step sin `why` | blocks.ts parse | block.parsed: false | warning especifico |
| 3 | Template incluye seccion | teach-intake.md ext | grep "Code preview" | match | seccion presente |
| 4 | Componente Vue renderea numbered | layoutHint: 'numbered' | mount CodeWalkthrough | DOM con steps numerados verticalmente | layout correcto |
| 5 | Componente Vue renderea before-after | layoutHint: 'before-after' + pares pre/post | mount | DOM con 2 columnas | layout correcto |

### REQ-IMPROVE-05: Render inline en HC tab Teaching (sin doble render)

El sistema MUST modificar `useMarkdown.ts` con un plugin custom (`markdownDkcInlineHook`) que sobreescriba `md.renderer.rules.fence` para fences con `info ∈ {dkc:hypothesis-map | dkc:decision-matrix | dkc:learning-path | dkc:code-walkthrough | mermaid}`, emitiendo placeholders en lugar de code blocks plain. `SectionTeachings.vue` MUST montar componentes Vue en los placeholders post-render y eliminar la seccion separada "Visualizaciones · N bloques".

**Actor**: user (dev/lector de teachings en HC)
**Layers**: frontend (HC composable + components)

#### Scenario: archivo teach renderea inline
- **GIVEN** archivo `.teach/*.md` con fences `dkc:hypothesis-map` y `mermaid`
- **WHEN** SectionTeachings monta el archivo
- **THEN** los fences `dkc:*` y `mermaid` aparecen como componentes ricos **en el lugar exacto del markdown** (no como YAML plain en code block)
- **AND** NO existe seccion "Visualizaciones" duplicada al final
- **AND** el resto del markdown (texto, tablas, headings, fences typescript/json/etc) se renderea como antes

#### Scenario: fence con lang no reconocido
- **GIVEN** fence ` ```typescript ... ``` ` o ` ```json ... ``` ` (NO `dkc:*` ni mermaid)
- **WHEN** plugin procesa el fence
- **THEN** delega al render default de markdown-it + highlight.js (zero impacto)

#### Scenario: bloque dkc:* con YAML invalido
- **GIVEN** fence `dkc:hypothesis-map` con YAML mal formado
- **WHEN** plugin emite placeholder + SectionTeachings monta componente
- **THEN** componente muestra warning visual + mantiene el rawYaml visible (fallback)
- **AND** el resto del teaching se renderea normal

#### Acceptance
**El usuario puede verificar que funciona**: abrir HOR-014 en HC tab Teaching tras S5 implementada. Los bloques de hypothesis-map, decision-matrix, learning-path, mermaid (flujo decisiones), y code-walkthrough aparecen integrados en el flujo del markdown sin doble render. La seccion "Visualizaciones · N bloques" ya no existe.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Render inline dkc:* | fence dkc:hypothesis-map | mount SectionTeachings | componente Vue en lugar exacto del fence | sin code block plain |
| 2 | Render inline mermaid | fence mermaid | mount | MermaidBlock inline | sin code block |
| 3 | Otros fences sin afectar | fence typescript | mount | `<pre><code class="language-typescript">` con highlight.js | igual que pre-cambio |
| 4 | YAML invalido en dkc | fence con YAML mal | mount | warning visual inline | resto del archivo OK |

### REQ-IMPROVE-06: Sweep de findings medios audit (F-3, F-4, F-5, F-6)

El sistema MUST aplicar correcciones a los 4 findings medios identificados en la auditoria S1:
- **F-3** (`deterministic-rules.md`): aclarar exencion de `explore` en DET-21 vs DET-22
- **F-4** (`request-execute.md`): simplificar excepcion redundante de `explore`
- **F-5** (`intake-explore.md`): aclarar `invoked_before` (cadena directa vs indirecta)
- **F-6** (`request-intake.md`): cambiar "los 6 items" → "los 7 items"

**Actor**: system (lectores futuros del workflow)
**Layers**: meta (deckard prompts)

#### Scenario: lector de DET-21 entiende exencion explore
- **GIVEN** DET-21 actualizada con nota sobre por que explore requiere teach-intake pero no teach-close
- **WHEN** un dev/LLM lee DET-21
- **THEN** entiende que explore SI pasa por design-{tipo} (necesita teach-intake) pero NO llega a close (no necesita teach-close)

#### Acceptance
**El usuario puede verificar que funciona**: grep en deterministic-rules para ver que DET-21 ahora aclara la exencion. grep en request-execute para confirmar excepcion simplificada. grep en intake-explore para ver invoked_before clarificado. grep en request-intake para "los 7 items".

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | F-3 aplicado | DET-21 ext | grep "explore.*teach-close.*no" | match | nota presente |
| 2 | F-4 aplicado | request-execute ext | grep "explore" en gate | sin "no llega aqui" redundante | excepcion simplificada |
| 3 | F-5 aplicado | intake-explore frontmatter | leer invoked_before | claridad directo/indirecto | doc explicita |
| 4 | F-6 aplicado | request-intake linea ~335 | grep "los 7 items" | match | conteo correcto |

### REQ-IMPROVE-07: Auto-reindex tras crear/modificar artefactos visibles

El sistema MUST disparar `./commands/dkc-reindex {project}` automaticamente al final de cada step que produce un artefacto visible en HC: `request-intake` (crea ticket), `design-{tipo}` (crea spec), `teach-intake` (crea teach-intake.md + actualiza ticket), `design-draft` (crea draft files), `teach-close` (crea teach-close.md + actualiza ticket). `request-close` ya lo hace post-close — el patron se replica.

**Actor**: dev (uso de HC)
**Layers**: meta (deckard prompts)

#### Scenario: dev crea ticket nuevo
- **GIVEN** dev invoca `/dkc <peticion>`
- **WHEN** `request-intake` cierra y produce el ticket
- **THEN** se ejecuta `./commands/dkc-reindex {project}` automaticamente al final del step
- **AND** el ticket aparece en HC sin que el dev tenga que reindexar manual

#### Scenario: design-{tipo} produce spec
- **GIVEN** spec generado y aprobado
- **WHEN** design-{tipo} marca status:in_progress en el spec
- **THEN** se ejecuta reindex
- **AND** el spec aparece en HC

#### Scenario: reindex falla
- **GIVEN** reindex retorna exit code != 0 (ej: archivo corrupto en index.db)
- **WHEN** el step recibe el exit code
- **THEN** el step NO falla — registra warning para el dev y continua
- **AND** el dev puede correr reindex manual posteriormente sin perder el artefacto generado

#### Acceptance
**El usuario puede verificar que funciona**: generar un teach-intake.md o un spec o un rule y abrir HC inmediatamente — el artefacto aparece sin friccion manual.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | reindex post-spec | spec recien generado | leer spec en HC | aparece | sin reindex manual |
| 2 | reindex post-teach-intake | teach generado | abrir tab Teaching | bloques renderean | con bloques recien parseados |
| 3 | reindex post-rule | rule promovida | navegar a /rules | aparece | sin reindex manual |
| 4 | reindex falla no-bloqueante | exit !=0 | step continua | warning al dev | step no aborta |

### REQ-IMPROVE-08: SectionSessions muestra sessions planificadas + ejecutadas

El sistema MUST extender `horadric-cube/server/deckard/sessions.ts` para parsear la sub-seccion `### Plan de sessions (preplanificacion)` del ticket markdown, emitiendo entries con `status: planned`. `SectionSessions.vue` MUST renderear ambas listas (planned + done) con diferenciacion visual clara.

**Actor**: dev (revisando progreso del ticket en HC)
**Layers**: backend HC parser, frontend HC component

#### Scenario: ticket con plan + sessions parciales
- **GIVEN** ticket con `### Plan de sessions` (S1-S6) y sessions ejecutadas (S1, S2 in_progress)
- **WHEN** dev abre tab Sessions en HC
- **THEN** ve listado completo: S1 done, S2 in_progress, S3-S6 planned (grayed con tier + objetivo)
- **AND** total de sessions y porcentaje de avance visible

#### Scenario: ticket sin plan (legacy pre-DET-20)
- **GIVEN** ticket cerrado pre-HOR-013 sin `### Plan de sessions`
- **WHEN** dev abre tab Sessions
- **THEN** muestra solo las sessions ejecutadas (comportamiento previo, backwards compatible)

#### Acceptance
**El usuario puede verificar que funciona**: abrir HOR-014 en HC tab Sessions y ver S1 done + S2 in_progress + S3/S4/S5/S6 planificadas (grayed), total 6/6 con avance visible.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Parser extrae plan | ticket con tabla plan | parseSessions | array combinado planned+done | length total correcto |
| 2 | Componente diferencia visual | mix planned + done | render | done full opacity, planned grayed | distincion visible |
| 3 | Legacy sin plan | ticket cerrado pre-HOR-013 | render | solo done | comportamiento previo intacto |
| 4 | Avance numeric | mix | render | "S2/S6" o "33%" visible | progreso explicito |

### REQ-IMPROVE-09: Lenguaje amigable en specs para aprobacion

El sistema MUST extender `templates/records/spec.md` con seccion `## Executive summary — lo que estas aprobando` al inicio (despues del titulo, antes de Purpose). Esta seccion en lenguaje conversacional resume: que se quiere, decisiones que necesitan OK, riesgos+mitigaciones, que NO se hace, tamano estimado, como saber que funciona. Las instrucciones de `design-{tipo}` MUST instruir al architect a redactar esta seccion antes que el resto.

**Actor**: dev (aprobando spec)
**Layers**: meta (deckard templates + prompts)

#### Scenario: dev recibe spec generado
- **GIVEN** template spec.md tiene la seccion ext + design-{tipo} la redacta
- **WHEN** architect produce un spec nuevo
- **THEN** el spec inicia con "Executive summary" amigable que cubre los 6 sub-items
- **AND** el dev puede aprobar/iterar leyendo solo esa seccion (todo el detalle tecnico abajo)

#### Scenario: dev aprueba sin leer detalle
- **GIVEN** spec con executive summary completo
- **WHEN** dev lee solo esa seccion y aprueba
- **THEN** el aprobado es informado (las decisiones criticas estan listadas explicitas en la tabla)

#### Acceptance
**El usuario puede verificar que funciona**: SPEC-workflow-dkc-followup-13 (este mismo) tiene executive summary aplicado. Dev puede aprobar el spec leyendo solo esa seccion. Templates `spec.md` actualizado para que futuros specs hereden el patron.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Template tiene seccion | spec.md ext | grep "Executive summary" | match | seccion presente |
| 2 | Spec generado incluye | nuevo spec via design-improvement | leer spec | seccion al inicio | redactada con 6 sub-items |
| 3 | Dev aprueba con summary | spec con summary | dev lee solo summary | aprueba informado | sin necesidad de leer 700 lineas |

### REQ-IMPROVE-10: Render markdown sin bug `**key**: value`

El sistema MUST resolver el bug donde el patron `**key**: value` en markdown se renderea como `key\n: value` (line break entre key y value) en HC tab Sessions. Investigar causa root: parser HC `sessions.ts` que extrae fields, o markdown-it edge case con strong + colon, o CSS de `prose-invert` con definition lists. Aplicar fix donde corresponda.

**Actor**: dev (revisando ticket en HC)
**Layers**: frontend HC + posible backend parser

#### Scenario: ticket con sessions descritas con `**key**: value`
- **GIVEN** ticket con session log usando patron `**Objetivo**: ...`, `**Tier**: ...`
- **WHEN** dev abre tab Sessions en HC
- **THEN** cada `key: value` se renderea en una sola linea (sin line break)
- **AND** el bold de `**key**` se preserva

#### Scenario: ticket con tablas de sessions (workaround actual)
- **GIVEN** ticket con session log usando tabla `\| Campo \| Valor \|`
- **WHEN** dev abre tab Sessions
- **THEN** la tabla renderea correctamente como antes

#### Acceptance
**El usuario puede verificar que funciona**: HOR-014 sessions vuelve al patron `**key**: value` (no tabla) y renderea limpio.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Render `**key**: value` | inline patron | mount SectionSessions | una linea por field | sin line break |
| 2 | Render tabla session | tabla | mount | tabla normal | comportamiento intacto |
| 3 | Edge case strong colon | `**bold**: word` en cualquier seccion (no solo sessions) | render | una linea | no introduce line break |

### REQ-PRESERVE-01: Tabs HC sin fences `dkc:*`/`mermaid` renderean identico

El sistema MUST garantizar que los tabs Request, Details, Testing, Summary, Draft-Intent en HC sigan renderizando identicamente al estado pre-HOR-014 cuando el contenido NO contiene fences `dkc:*` ni `mermaid`.

**Actor**: user (dev navegando tickets en HC)
**Layers**: frontend

#### Scenario: tab Request renderea sin cambios
- **GIVEN** ticket con seccion `## Request` que contiene texto, tablas, fences ` ```typescript`, ` ```json`
- **WHEN** dev abre tab Request en HC
- **THEN** render visual identico al estado pre-HOR-014 (mismas tablas, code blocks con highlight, paragraphs)

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Tab Request | sin fences dkc/mermaid | abrir tab | render igual | snapshot identico |
| 2 | Tab Details | mismo | abrir tab | igual | snapshot identico |
| 3 | Tab Testing | mismo | abrir tab | igual | snapshot identico |
| 4 | Tab Summary | mismo | abrir tab | igual | snapshot identico |
| 5 | Tab Draft-Intent | mismo | abrir tab | igual | snapshot identico |

### REQ-PRESERVE-02: Tickets quick/query siguen exentos de DET-21/22

El sistema MUST mantener la exencion existente de `work_type ∈ {quick, query}` en los gates DET-21 y DET-22. Los cambios de S2 (fixes F-1/F-2 ext) NO deben aplicar gates a quick/query.

**Actor**: dev usando flujo quick / query
**Layers**: meta (prompts)

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Quick exempt close | ticket quick | invocar request-close | sin teach-close | `status: closed` directo |
| 2 | Query no llega a design | ticket query | invocar `/dkc query` | researcher responde | sin design-{tipo} ni teach-intake |

### REQ-PRESERVE-03: Tests existentes HC siguen pasando

El sistema MUST mantener pasando los tests existentes de HC: `flowInference.test.ts`, `sessions.test.ts`, `workflow.test.ts`, `blocks.test.ts` (los que existan).

**Actor**: developer (CI / desarrollo)
**Layers**: backend tests

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Tests pre-cambio | rama HOR-014-followup-hor-013 | `npm test` (HC) | exit code 0 | suite pasa |
| 2 | Tests post-S3 | flowInference + workflow modificados | `npm test` | exit code 0 | nuevos casos pasan + existentes pasan |
| 3 | Tests post-S4 | blocks.ts ext con code-walkthrough | `npm test` | exit code 0 | parser nuevo pasa |
| 4 | Tests post-S5 | useMarkdown plugin | `npm test` | exit code 0 | plugin tests pasan |

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Render perf (HC) | Render de teach con N bloques inline (post-S5) no degrada >10% vs render actual | tiempo de mount de SectionTeachings con 5 bloques | < 200ms (medicion manual con dev tools) |
| Bundle size HC | Plugin markdown-it custom + CodeWalkthrough.vue no inflan bundle >5KB gzipped | size delta del bundle prod | < 5KB gzipped |

(NFRs solo para perceptibilidad visual del refactor S5. Otros REQs son meta — no aplican NFRs.)

## Artifacts

### Changes — Modified

#### Modified: `prompts/steps/request-close.md` (F-1)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Gates declarados | 1 gate (final del cierre) | 1 gate inicial DET-22 + invocacion teach-close + 1 gate final extendido | F-1: implementar contrato de DET-22 que estaba declarado solo en regla + workflow |
| Invocacion teach-close | ausente | sub-step explicito antes de marcar `closed` | F-1: cumplir DET-22 sin atencion humana |
| Gate final | sin verificar `teachings.close` | verifica `teachings.close === 'done'` | F-1 + F-10 |

#### Modified: `prompts/steps/design-feature.md`, `design-fix.md`, `design-improvement.md`, `design-refactor.md` (F-2 ext)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Gate DET-21 | ausente en los 4 archivos | gate inicial al patron de teach-intake (gate de salida) | F-2 ext: cumplir DET-21 sin que el dev tenga que recordar invocar teach-intake |
| Posicion del gate | — | antes del gate DET-18 cuando aplica | mantener orden coherente: teach-intake → design-draft (si aplica) → design-{tipo} |

#### Modified: `prompts/deterministic-rules.md` (F-3)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| DET-21 nota explore | sin nota | nota inline: "Explore requiere teach-intake porque pasa por design-{tipo}; NO requiere teach-close porque no llega a execute/close" | F-3: aclarar la asimetria que confunde a lectores |

#### Modified: `prompts/steps/intake-explore.md` (F-5)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Frontmatter `invoked_before` | lista teach-intake + 5 design-{tipo} sin distincion | lista solo teach-intake (directo) + nota documentada de cadena indirecta | F-5: evitar que se interprete como skip-teach-intake |

#### Modified: `prompts/steps/request-execute.md` (F-4)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Gate pre-execute excepcion | "quick y explore (no llegan aqui)" | "quick-path (single-session)" + nota separada sobre explore | F-4: explore es arquitecturalmente imposible aqui, no una excepcion runtime |

#### Modified: `prompts/steps/request-intake.md` (F-6)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Linea ~335 | "los 6 items" | "los 7 items" | F-6: conteo correcto (checklist tiene 7 items, no 6) |

#### Modified: `commands/dkc.md` (F-8 menor — incluido en S2 si tiempo)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Tabla flujos por work_type | omite design-draft entre intake-explore y design-feature | incluye design-draft con nota condicional `if creates_visual or creates_data` | F-8: prevenir que dev asuma draft opcional |

#### Modified: `horadric-cube/server/deckard/workflow.ts` (P5)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `getFlowBlueprint` nodes | 5 nodos (intake, design-draft?, design-{tipo}, execute, close) | 7-8 nodos (+intake-explore, +teach-intake, +design-transition-to-execute, close con sub-indicador teach-close) | P5: blueprint refleja workflow real |
| `getFlowBlueprint` edges | 5 edges lineales | edges actualizados a la cadena completa | P5 |
| `agentsFor` | mapea 5 ids | mapea 7-8 ids | P5 |

#### Modified: `horadric-cube/server/deckard/flowInference.ts` (P5)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `inferCurrentStep` | 5 ramas | ramas adicionales para teachings.intake pending, teach-close pending | P5: distinguir close-pending-teach-close de close-done |
| `stepOrder` | 5 ids ordenados | 7-8 ids ordenados | P5 |
| Manejo `teachings.close` | ausente | si tasks done && teachings.close: pending → current=close (active, sub-pending teach-close) | P5: sintoma "closing durante in_progress" resuelto |

#### Modified: `horadric-cube/src/composables/useMarkdown.ts` (P7)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `createRenderer` plugin chain | 3 plugins (anchor, taskLists, markdownImageHook) | 4 plugins (+markdownDkcInlineHook nuevo) | P7: interceptar fences `dkc:*` y `mermaid` inline |
| Render fences | code blocks plain via highlight.js fallback | placeholders `<div data-dkc-block-placeholder ...>` para `dkc:*`/`mermaid`, default para otros | P7 |

#### Modified: `horadric-cube/src/components/ticket-sections/SectionTeachings.vue` (P2 + P7)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Seccion "Visualizaciones · N bloques" | presente, mapea blocks a componentes | eliminada | P7: render inline reemplaza esta seccion |
| `blockComponent()` | 3 kinds (hypothesis-map, decision-matrix, learning-path) | 4 kinds (+code-walkthrough) | P2 |
| Mount de componentes | `<component :is>` declarativo en seccion separada | imperativo via `createApp().mount(placeholder)` post-mount | P7 |

#### Modified: `horadric-cube/server/deckard/blocks.ts` (P2)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Kinds reconocidos | hypothesis-map, decision-matrix, learning-path | + code-walkthrough | P2 |
| Validacion del bloque code-walkthrough | — | steps[] no vacio + cada step requiere step/path/code/why + lines.from<=to si presente | P2 (parser estricto) |

#### Modified: `horadric-cube/shared/types.ts` (P2)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Tipos `dkc:*` exportados | HypothesisMap*, DecisionMatrix*, LearningPath* | + CodeWalkthroughBlock + CodeWalkthroughStep | P2 (schema nuevo) |

#### Modified: `templates/outputs/teach-intake.md` (P2)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Secciones | Why, Hypothesis map, Decision drivers, What you should know, Learning path, Active questions, Refs | + nueva seccion "Code preview — donde se va a tocar" con bloque `dkc:code-walkthrough` ejemplo (`phase: pre` + `phase: delta`) | P2 |

#### Modified: `templates/outputs/teach-close.md` (P2)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Secciones | What was done, Hypothesis evolution, Decisions taken, Highlights, Knowledge promoted, Lessons learned, Learning path, Backlog, Refs | + nueva seccion "Code walkthrough — antes/despues" con bloque `dkc:code-walkthrough` ejemplo (`phase: pre` + `phase: post`, layoutHint: 'before-after') | P2 |

### Changes — Added

#### Added: `horadric-cube/src/components/teaching-blocks/CodeWalkthrough.vue`

Componente Vue nuevo que renderea bloque `dkc:code-walkthrough`. Recibe prop `block: DkcBlock`, deriva `block.parsed: CodeWalkthroughBlock`, renderea segun `layoutHint`.

| Field | Value | Purpose |
|-------|-------|---------|
| Props | `block: DkcBlock` | input estandar (mismo patron que HypothesisMap, DecisionMatrix, LearningPath) |
| Emits | (ninguno) | componente puro |
| Layouts | numbered (default), before-after, flat | flexibilidad para distintos tipos de walkthrough |
| Highlight | hljs por step (lang inferido o explicito) | consistencia con resto del rendering en HC |
| Path:line link | clickable si `lines` presente | trazabilidad al codigo real |

#### Added: `horadric-cube/src/composables/markdownDkcInlineHook.ts` (sub-utility de useMarkdown)

Plugin de markdown-it que sobreescribe `md.renderer.rules.fence`. Para fences con `info ∈ {dkc:hypothesis-map | dkc:decision-matrix | dkc:learning-path | dkc:code-walkthrough | mermaid}`, emite placeholder. Para otros: delega al render default.

| Field | Value | Purpose |
|-------|-------|---------|
| Function | `markdownDkcInlineHook(md: MarkdownIt): void` | API standard de plugin md-it |
| Side effect | mutates `md.renderer.rules.fence` | unico hook necesario |
| Placeholder format | `<div data-dkc-block-placeholder="N" data-kind="..." data-block-index="..."></div>` | parseable por SectionTeachings post-mount |

## Tasks

### Session 2 — CRITICOS audit + sweep medios [tipo: ⚑ fuerte] [tier: T0]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S2.T1 | Fix F-1: agregar gate DET-22 al inicio de `request-close.md` + invocacion explicita de sub-step `teach-close` antes de marcar status:closed + extender gate final con `teachings.close === 'done'`. Patron: copiar el gate de salida de `teach-intake.md` adaptado a close. | developer | — | `prompts/steps/request-close.md` | DET-5, DET-8, DET-22 | grep "DET-22" en archivo da matches; manual review del gate compara contra el de teach-intake; lint markdown | done (S2) | 2 | — | — |
| S2.T2 | Fix F-2 ext: agregar gate DET-21 al inicio de los 4 `design-{tipo}.md` (feature, fix, improvement, refactor). Verificar `teachings.intake === 'done'` antes de iniciar. Patron: gate de salida de teach-intake adaptado como gate de entrada. | developer | — | `prompts/steps/design-feature.md`, `design-fix.md`, `design-improvement.md`, `design-refactor.md` | DET-5, DET-8, DET-21 | grep "DET-21\ | teach-intake" en los 4 archivos da matches; gate explicitamente bloqueante en cada uno | pending | 2 | — | — |
| S2.T3 | Sweep findings medios: F-3 (DET-21 nota explore en deterministic-rules), F-4 (request-execute simplificar excepcion explore), F-5 (intake-explore.invoked_before clarificar directo vs indirecto), F-6 (request-intake "los 6 items" → "los 7 items"). | developer | S2.T1, S2.T2 | `prompts/deterministic-rules.md`, `prompts/steps/request-execute.md`, `prompts/steps/intake-explore.md`, `prompts/steps/request-intake.md` | DET-5, DET-8 | grep verificaciones especificas por finding; lint markdown | pending | 2 | — | — |
| S2.T4 | Sweep findings menores (best effort, si tiempo): F-8 (`commands/dkc.md` tabla incluir design-draft con nota condicional). F-7, F-9, F-10, F-11 → backlog si no caben. | developer | S2.T3 | `commands/dkc.md` (si aplica) | DET-5 | grep "design-draft" en tabla de dkc.md | pending | 2 | — | — |
| S2.T6 | **REQ-09 (B3)**: aplicar lenguaje amigable. Extender `templates/records/spec.md` con seccion `## Executive summary — lo que estas aprobando` al inicio (despues del titulo, antes de Purpose) con sub-items: que se quiere, decisiones que necesitan OK (tabla), riesgos+mitigaciones, que NO se hace, tamano estimado, como saber que funciona. Editar instrucciones de `design-feature/fix/improvement/refactor.md` para que el architect redacte esta seccion ANTES que el resto del spec, y que la presente al dev como punto de revision principal. | developer | S2.T3 | `templates/records/spec.md`, `prompts/steps/design-feature.md`, `design-fix.md`, `design-improvement.md`, `design-refactor.md` | DET-5, DET-8, DET-11 | grep "Executive summary" en template + instrucciones design-{tipo} actualizadas; este mismo SPEC-workflow-dkc-followup-13 ya tiene la seccion (referencia de patron); manual review verifica patron simetrico en los 4 design-{tipo} | pending | 2 | — | — |
| S2.T7 | **REQ-07 (B1)**: agregar auto-reindex post-step en los prompts que producen artefactos visibles. Replicar el patron de `request-close.md` paso 6b (auto-reindex sincrono con `./commands/dkc-reindex {project}`) en: `request-intake.md` (final), `teach-intake.md` (final), `design-draft.md` (final), `design-feature/fix/improvement/refactor.md` (cierre del spec), `teach-close.md` (final, antes de devolver control a request-close), `request-execute.md` (cuando crea rules/bugs/decisions). Manejo de fallo: warning al dev sin abortar el step. | developer | S2.T2, S2.T6 | 8+ archivos prompts/steps + posible refactor a step compartido `auto-reindex.md` invocable | DET-5, DET-8, DET-11, DET-16 | grep "dkc-reindex" en cada step modificado da matches; reindex no rompe steps existentes (test manual con un ticket de prueba) | pending | 2 | — | — |
| S2.T5 | Capturar baseline en HOR-014: `git log --oneline` antes/despues de S2 + grep counts de DET-21/22 + auto-reindex en steps + Executive summary en template. Verificacion empirica que los patrones B1/B2/B3 se confirman simetricamente. | researcher | S2.T1..S2.T4, S2.T6, S2.T7 | `tickets/HOR-014.md` Sessions S2 entry | DET-1, DET-2, DET-13 | session log con counts antes/despues | pending | 2 | — | — |
| **S2.GATE** | **Gate de sync Session 2 (tier: T0)** — markdown lint + cross-reference check + grep verifications (DET-21 en 4 design-{tipo}, DET-22 en request-close, F-3..F-6 fixados, Executive summary en template + 4 design-{tipo}, dkc-reindex en 8+ steps). Persistir en `## Sessions` del ticket. Decidir continue/iterate/escalate. | reviewer | S2.T1..S2.T7 | `tickets/HOR-014.md` | DET-20, DET-13 | gate persistido + decision documentada + log de greps | pending | 2 | — | — |

### Session 3 — P5 flowInference + workflow blueprint [tipo: ⚑ fuerte] [tier: T2]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S3.T1 | Extender `getFlowBlueprint` con nodos faltantes: intake-explore, teach-intake, design-transition-to-execute. Agregar logica para que `close` exponga sub-indicador "teach-close pending" cuando aplica. Actualizar edges. Mantener compatibilidad con explore/query (terminal en design). | developer | S2.GATE | `horadric-cube/server/deckard/workflow.ts` | DET-5, DET-8, DET-11 | vitest run del modulo verde; tipos TS sin errores | pending | 3 | — | — |
| S3.T2 | Extender `inferCurrentStep` con ramas para teachings.intake pending (current=teach-intake) y teachings.close pending (current=close pero sub-status pending teach-close). Extender `stepOrder` con los 7-8 ids. | developer | S3.T1 | `horadric-cube/server/deckard/flowInference.ts` | DET-5, DET-8, DET-11 | vitest run verde; tipos OK | pending | 3 | — | — |
| S3.T3 | Tests vitest para flowInference: caso ticket en intake-explore activo, ticket con teach-intake done + design active, ticket con tasks done + teach-close pending, ticket cerrado. Asegurar tests existentes (sessions, workflow) siguen pasando. | developer | S3.T2 | `horadric-cube/server/deckard/flowInference.test.ts`, posiblemente `workflow.test.ts` ext | DET-5, DET-7, DET-13 | `npm test` exit code 0 + nuevos casos cubiertos | pending | 3 | — | — |
| S3.T4 | Validacion empirica: navegar HOR-013 + HOR-014 en HC localhost:3016, verificar FlowDiagram muestra estado correcto en cada uno. HOR-013 cerrado → todos done. HOR-014 in_progress → nodo activo correcto. | researcher | S3.T3 | (UI manual) | DET-1, DET-13 | screenshots de HOR-013 y HOR-014 con FlowDiagram correcto | pending | 3 | — | — |
| S3.T5 | **REQ-08 (B2)**: extender `horadric-cube/server/deckard/sessions.ts` para parsear sub-seccion `### Plan de sessions (preplanificacion)` del ticket. Cada fila de la tabla → entry con `status: planned` + campos (number, objetivo, fase, tier, gateType, gateCriteria). Combinar con sessions ejecutadas (`### Session N` con `status: done` o `in_progress`) en un array `combinedSessions`. Backwards compat: ticket sin tabla plan → solo done sessions. | developer | S3.T2 | `horadric-cube/server/deckard/sessions.ts`, `sessions.test.ts` | DET-5, DET-7, DET-8, DET-11 | vitest verde con casos: ticket con plan + done, ticket legacy sin plan, ticket con plan vacio | pending | 3 | — | — |
| S3.T6 | **REQ-08 (B2)**: actualizar `horadric-cube/src/components/ticket-sections/SectionSessions.vue` para consumir `combinedSessions` y renderear: done sessions con expand/details + planned sessions grayed (opacity-60) con tier+objetivo+gate-type visibles. Indicador de avance: "S2/S6" o "33% (2 de 6)". | developer | S3.T5 | `horadric-cube/src/components/ticket-sections/SectionSessions.vue` | DET-5, DET-8, DET-11 | smoke UI: HOR-014 muestra S1 done + S2 in_progress + S3-S6 planned grayed; legacy ticket pre-DET-20 muestra solo done (backwards compat) | pending | 3 | — | — |
| S3.T7 | **REQ-10 (B4)**: investigar render bug `**key**: value` → `key\n: value`. Hipotesis A: parser HC `sessions.ts` extrae fields tipo `**key**: value` en struct y SectionSessions los renderea con `<dt>/<dd>` que CSS prose-invert aplica con line break. Hipotesis B: markdown-it edge case con strong + `:` al inicio de linea. Hipotesis C: definition list autodetectado. Reproducir, identificar causa, fixear donde corresponda (parser, componente, o CSS). Volver el HOR-014 al patron `**key**: value` (revertir workaround tabla). | developer | S3.T2 | a determinar (sessions.ts | SectionSessions.vue | useMarkdown.ts | css) | DET-5, DET-8, DET-11 | reproduccion documentada + fix aplicado + grep ticket markdown vuelve a usar `**key**: value` patron y renderea limpio | pending | 3 | — | — |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2)** — vitest verde (flowInference, sessions, useMarkdown si aplica) + smoke UI manual + screenshots adjuntos. Decidir continue/iterate/escalate. | reviewer | S3.T1..S3.T7 | `tickets/HOR-014.md` | DET-20, DET-13 | gate persistido + screenshots referenciados | pending | 3 | — | — |

### Session 4 — P2 templates + parser + componente CodeWalkthrough [tipo: auto] [tier: T2]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S4.T1 | Extender `shared/types.ts` con `CodeWalkthroughBlock` + `CodeWalkthroughStep` siguiendo schema declarado en `tickets/HOR-014.draft/data-model.ts`. Asegurar export y compatibilidad con `DkcBlock.parsed`. | developer | S3.GATE | `horadric-cube/shared/types.ts` | DET-1, DET-2, DET-5, DET-8 | tsc compila sin errores; types disponibles en HC server + client | pending | 4 | — | — |
| S4.T2 | Extender parser `server/deckard/blocks.ts` con kind `code-walkthrough`. Validar steps[], cada step con step/path/code/why obligatorios, lines.from<=to si presente. Warning para why<20chars (no bloquea). | developer | S4.T1 | `horadric-cube/server/deckard/blocks.ts`, `blocks.test.ts` | DET-5, DET-7, DET-8, DET-11 | vitest blocks verde; cases: kind valido + invalido + warning | pending | 4 | — | — |
| S4.T3 | Crear `CodeWalkthrough.vue` con 3 layoutHints: numbered (default), before-after (pares pre/post), flat (lista simple). Usar hljs para highlight. Path clickable si lines presente (link a `path#L<from>-L<to>`). Recibe prop `block: DkcBlock`. | developer | S4.T1 | `horadric-cube/src/components/teaching-blocks/CodeWalkthrough.vue` | DET-5, DET-8, DET-11, RULE-platform si aplica | smoke visual con block manual; sin errores Vue console | pending | 4 | — | — |
| S4.T4 | Extender `SectionTeachings.blockComponent()` con `code-walkthrough` → `CodeWalkthrough`. Importar + markRaw como los otros 3. | developer | S4.T3 | `horadric-cube/src/components/ticket-sections/SectionTeachings.vue` | DET-5, DET-8 | block code-walkthrough renderea en HC | pending | 4 | — | — |
| S4.T5 | Extender `templates/outputs/teach-intake.md` con seccion "Code preview — donde se va a tocar" + ejemplo bloque `dkc:code-walkthrough` (steps con phase: pre + phase: delta). Extender `templates/outputs/teach-close.md` con seccion "Code walkthrough — antes/despues" + ejemplo (phase: pre + phase: post, layoutHint: before-after). | developer | S4.T2 | `templates/outputs/teach-intake.md`, `templates/outputs/teach-close.md` | DET-5, DET-8, DET-21, DET-22 | grep "Code preview" + "Code walkthrough" en templates; ejemplo dkc:code-walkthrough valido (yaml lint mental) | pending | 4 | — | — |
| S4.T6 | Smoke UI: regenerar manual un teach con bloque code-walkthrough + abrir en HC. Verificar render de los 3 layoutHints (numbered, before-after, flat). | researcher | S4.T4, S4.T5 | (UI manual) | DET-1, DET-13 | 3 screenshots (uno por layout) adjuntados al ticket | pending | 4 | — | — |
| **S4.GATE** | **Gate de sync Session 4 (tier: T2)** — vitest verde (blocks.test) + smoke UI con 3 layoutHints. Decidir continue/iterate/escalate. | reviewer | S4.T1..S4.T6 | `tickets/HOR-014.md` | DET-20, DET-13 | gate persistido + screenshots | pending | 4 | — | — |

### Session 5 — P7 plugin markdown-it + regression smoke [tipo: ⚑ fuerte] [tier: T3]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S5.T1 | Crear `markdownDkcInlineHook.ts` plugin: sobreescribe `md.renderer.rules.fence`. Detecta info ∈ {dkc:hypothesis-map, dkc:decision-matrix, dkc:learning-path, dkc:code-walkthrough, mermaid}, emite placeholder `<div data-dkc-block-placeholder="N" data-kind="..." data-block-index="...">`. Otros fences: delegar a render default. | developer | S4.GATE | `horadric-cube/src/composables/markdownDkcInlineHook.ts` (nuevo) | DET-5, DET-8, DET-11 | vitest del plugin verde con casos: dkc:* match, mermaid match, otros lang fallthrough, info string con espacios | pending | 5 | — | — |
| S5.T2 | Integrar plugin en `useMarkdown.ts:createRenderer`. `md.use(markdownDkcInlineHook)` despues de los existentes. Asegurar que el plugin no rompe wireInternalLinks (pasa por placeholders sin afectar). | developer | S5.T1 | `horadric-cube/src/composables/useMarkdown.ts` | DET-5, DET-8, DET-11 | tests existentes de useMarkdown pasan; nuevo test para integracion | pending | 5 | — | — |
| S5.T3 | Modificar `SectionTeachings.vue`: post-mount (`onMounted`), `querySelectorAll('[data-dkc-block-placeholder]')`, para cada placeholder leer `data-block-index`, ubicar `block` correspondiente, montar componente Vue via `createApp(BlockComponent, { block }).mount(placeholder)`. Eliminar seccion `### Visualizaciones · N bloques`. | developer | S5.T2, S4.GATE | `horadric-cube/src/components/ticket-sections/SectionTeachings.vue` | DET-5, DET-8, DET-11 | smoke UI: bloques renderean inline; seccion Visualizaciones ya no esta | pending | 5 | — | — |
| S5.T4 | Smoke UI regression sobre 5 tabs: Request, Details, Testing, Summary, Draft-Intent en multiples tickets (HOR-013, HOR-014, BLY-001 si existe). Verificar render identico al pre-cambio. Capturar screenshots. | researcher | S5.T3 | (UI manual) | DET-5, DET-7, DET-13 | 5+ screenshots adjuntos; comparacion visual identica | pending | 5 | — | — |
| S5.T5 | Validacion empirica con dev: dev abre HOR-014 (que tiene teach-intake con bloques) en tab Teaching y confirma UX mejorada (sin doble render, sin YAML feo, flujo educativo coherente). | researcher | S5.T3 | (UI manual + dev) | DET-13, DET-14 | dev confirma explicitamente | pending | 5 | — | — |
| **S5.GATE** | **Gate de sync Session 5 (tier: T3)** — vitest + e2e smoke + dev confirma UX. Decidir continue/iterate/escalate. ESTA es la session mas riesgosa — no avanzar a S6 sin gate ⚑ fuerte pass. | reviewer | S5.T1..S5.T5 | `tickets/HOR-014.md` | DET-20, DET-13, DET-14 | gate persistido + dev approval + screenshots | pending | 5 | — | — |

### Session 6 — Cierre + dogfooding final [tipo: ⚑ fuerte] [tier: T3]

| # | Task | Agent | Depends on | Files | Rules | Validation | Status | Session | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------- | ------------ | -------- | --------- | --- | --- |
| S6.T1 | Promover learns L-S1-1 (patron "regla → workflow → step ausente") y L-S1-2 (gates divergidos en design-{tipo}) a rules formales si confirmados en S2. Crear `rules/workflow/RULE-workflow-XXX.md` segun template. | developer | S5.GATE | `projects/horadric/rules/workflow/RULE-workflow-{seq}.md` (nueva) | DET-5, DET-8, DET-16 | rule(s) creada(s) con what/why/where/when; reindex sqlite | pending | 6 | — | — |
| S6.T2 | Documentar BUG retroactivo: HOR-013 cerrado con teach-close producido manualmente (no por step automatico) — revelado por audit S1. Crear `bugs/workflow/BUG-workflow-XXX.md` con symptom, root cause (F-1), workaround usado en HOR-013, fix definitivo (S2.T1 de este spec). Estado: fixed (post-S2). | developer | S5.GATE | `projects/horadric/bugs/workflow/BUG-workflow-{seq}.md` (nueva) | DET-5, DET-8, DET-16 | bug creado; trazabilidad a HOR-013 + HOR-014.S2 | pending | 6 | — | — |
| S6.T3 | **DOGFOODING FINAL**: ejecutar `/dkc close` en HOR-014. **Sin** invocacion manual de teach-close. El step `request-close` (post-S2.T1) MUST invocar el sub-step `teach-close` automaticamente, generar `tickets/HOR-014.teach/teach-close.md`, actualizar `teachings.close: pending → done`, y solo entonces marcar `status: closed`. Esto es la prueba empirica del fix F-1. | researcher | S6.T1, S6.T2 | (flujo completo) | DET-1, DET-13, DET-14, DET-22 | teach-close.md generado + frontmatter actualizado correctamente + sin friccion humana en el flujo de cierre | pending | 6 | — | — |
| S6.T4 | Reindex sqlite + verificacion final: HC abre HOR-014 con FlowDiagram mostrando todos los nodos done, tab Teaching → Close con render inline, code-walkthrough block visible. | researcher | S6.T3 | `server/deckard/sqlite.ts` runtime reindex | DET-1, DET-13 | screenshots de HOR-014 cerrado en HC + DB query confirma index actualizado | pending | 6 | — | — |
| S6.T5 | Commit final + push + PR (si aplica) en deckard y horadric-cube. Mensaje patron HOR-013: "dkc: HOR-014 SX — descripcion". | developer | S6.T4 | git operations | DET-15, DET-16 | commits creados con mensajes coherentes; ramas listas para review | pending | 6 | — | — |
| **S6.GATE** | **Gate de sync Session 6 (tier: T3)** — DET-22 cumplida automaticamente (S6.T3 lo prueba) + audit P6 producido como artefacto cerrado (este spec + teach-close de HOR-014) + render UX validado + commits hechos. Marcar HOR-014 como `status: closed`. | reviewer | S6.T1..S6.T5 | `tickets/HOR-014.md` | DET-20, DET-13, DET-14, DET-22 | gate persistido + ticket cerrado + spec status: done | pending | 6 | — | — |

> **Numeracion `S{N}.T{M}` y `S{N}.GATE`**: cada session termina con `SX.GATE`. Para S2 (T0), gate verifica markdown lint + greps. Para S3-S5 (T2/T3), gate incluye vitest + smoke UI manual.

> **Distribucion de DET-21 / DET-22 en tasks**: las dos rules del frontmatter del ticket (DET-21, DET-22) aparecen explicitas en S2.T1 (DET-22), S2.T2 (DET-21), S4.T5 (DET-21+DET-22 en templates), S6.T3 (DET-22 — dogfooding). Cobertura completa.

### Task contracts

**Task S2.T1** (fix F-1 — DET-22 en request-close):
```
- source_ref: REQ-IMPROVE-01 (request-close invoca teach-close automaticamente)
- agent: developer
- files: [prompts/steps/request-close.md]
- precondition: ticket HOR-014 in_progress + S1 cerrada con audit findings disponibles
- expected_output: request-close.md tiene gate inicial DET-22 + invocacion explicita de teach-close + gate final extendido con teachings.close === 'done'. Patron del gate copiado de teach-intake.md (gate de salida) adaptado a close.
- validation: grep "DET-22\|teach-close\|teachings\.close" en archivo da matches; manual review compara contra el patron de teach-intake; lint markdown.
- rollback: git revert del commit de S2.T1 (markdown-only, sin side effects en datos).
- rules: [DET-5, DET-8, DET-22]
```

**Task S2.T2** (fix F-2 ext — DET-21 en design-{tipo}):
```
- source_ref: REQ-IMPROVE-02 (design-{tipo} bloquean sin teach-intake)
- agent: developer
- files: [prompts/steps/design-feature.md, design-fix.md, design-improvement.md, design-refactor.md]
- precondition: S2.T1 completada (orden logico: cierre primero, design despues)
- expected_output: los 4 archivos tienen gate DET-21 inicial verificando teachings.intake === 'done'. Patron simetrico (mismo wording de gate) entre los 4.
- validation: grep "DET-21\|teach-intake" en cada archivo da matches; gate explicitamente bloqueante; los 4 con misma forma estructural.
- rollback: git revert del commit de S2.T2.
- rules: [DET-5, DET-8, DET-21]
```

**Task S5.T1** (plugin markdown-it custom — el cambio mas riesgoso):
```
- source_ref: REQ-IMPROVE-05 (render inline en HC tab Teaching)
- agent: developer
- files: [horadric-cube/src/composables/markdownDkcInlineHook.ts (nuevo)]
- precondition: S4.GATE pasada (CodeWalkthrough.vue + parser code-walkthrough listos — sino los placeholders no tienen componente que montar)
- expected_output: plugin que sobreescribe md.renderer.rules.fence detectando info ∈ {dkc:*, mermaid} → emite placeholder. Otros fences: delegar a render default (sin alterar comportamiento existente).
- validation: vitest con casos: (1) dkc:hypothesis-map fence → placeholder con data-kind=hypothesis-map; (2) mermaid fence → placeholder con data-kind=mermaid; (3) typescript fence → render default highlight.js; (4) info string con espacios edge case ("dkc:hypothesis-map  ") → match correcto; (5) fence sin info → render default.
- rollback: git revert + remover el `md.use(markdownDkcInlineHook)` en useMarkdown.ts (S5.T2). El archivo nuevo queda en repo pero no se invoca.
- rules: [DET-5, DET-8, DET-11]
```

**Task S6.T3** (dogfooding final — prueba empirica de F-1):
```
- source_ref: REQ-IMPROVE-01 (validacion empirica del fix)
- agent: researcher (no modifica codigo, ejecuta el flujo y observa)
- files: [HOR-014.md frontmatter + tickets/HOR-014.teach/teach-close.md (generado por el step)]
- precondition: S6.T1 + S6.T2 completas (rules + bug retroactivo documentados); todas las S2-S5 done; ticket en estado correcto (specTaskStats.pending = 0; teachings.close: pending)
- expected_output: invocar `/dkc close` en HOR-014. request-close (post-S2.T1) invoca teach-close automaticamente. Genera tickets/HOR-014.teach/teach-close.md. Actualiza teachings.close: pending → done. SOLO ENTONCES marca status: closed. SIN intervencion humana en el flujo de cierre — el LLM no debe ejecutar manualmente teach-close.
- validation: (1) grep ".teach/teach-close.md" filesystem → existe; (2) frontmatter HOR-014.md teachings.close === 'done'; (3) frontmatter status === 'closed'; (4) auditoria de pasos en logs/conversation: el dev NO invoco teach-close manualmente.
- rollback: revertir frontmatter de HOR-014 (status, teachings.close) y borrar teach-close.md generado. Si esto pasa, S6.T3 fallo y el fix F-1 no funciono — escalar a iterate.
- rules: [DET-1, DET-13, DET-14, DET-22]
```

(Resto de tasks siguen patron similar — detalle en columna `Validation` + `Rollback` cuando aplica.)

## Constraints

- **DET-1** (certeza explicita): toda hipotesis/decision con status confirmado/inferido/asumido/bloqueado. Aplica en S3.T4 (validacion empirica), S5.T5 (dev confirma UX), S6.T3 (dogfooding).
- **DET-5** (multi-capa): cualquier task que modifica codigo lee al menos 2 capas. Aplica especialmente en S5 (plugin markdown-it toca composable + componente).
- **DET-7** (test cases con regression obligatoria): REQ-PRESERVE-01/02/03 son las regression rules; cubiertas en S5.T4 + S3.T3.
- **DET-8** (rollback documentado): cada task implementable tiene rollback en task contract.
- **DET-10** (limites por rol): researcher (S2.T5, S3.T4, S5.T4, S5.T5, S6.T3, S6.T4) no modifica codigo; developer modifica; reviewer (en GATEs) valida.
- **DET-11** (KB-first): consultar specs/rules antes de proponer. Aplica en S6.T1 (promover learns).
- **DET-13** (cierre por evidencia): GATEs persisten resultados con screenshots/logs/grep counts.
- **DET-14** (approve/iterate/escalate mutuamente excluyentes): cada GATE produce una unica decision.
- **DET-15** (protocolo contexto agotado): si la session pasa de 3h, persistir en ticket → standby → retomar.
- **DET-16** (propagacion): "si esto cambio, donde mas debe reflejarse?" — aplica especialmente en S2 (los 5 fixes son simetricos por patron H7.1).
- **DET-18** (draft aprobado antes de spec): cumplido en S1 con draft v1 aprobado.
- **DET-20** (particion en sessions con gate): este spec implementa DET-20 con S2-S6 + GATEs.
- **DET-21** (teach-intake gate antes de design): cumplido en S1 con teach-intake.md done.
- **DET-22** (teach-close sub-step de close): es el OBJETO de mejora REQ-IMPROVE-01 + cumplido empiricamente en S6.T3.

- **SPEC-workflow-teach-intake-close** (HOR-013, status: done): antecedente directo. Esta spec extiende los gates declarados pero no implementados.
- **SPEC-workflow-ticket-higiene** (HOR-009, status: done): patron de fixes en prompts del workflow.
- **SPEC-deckard-core-prompts-weight** (HOR-004, status: done): guia de estilo para prompts modificados en S2.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| markdown-it | external (lib) | API de plugins ya en uso (anchor, taskLists, markdownImageHook). Plugin S5.T1 sigue API estandar | Bajo — API estable, plugin pequeno |
| Vue 3 createApp | internal (Vue API) | Necesario en S5.T3 para mount imperativo de componentes en placeholders | Medio — requiere manejar lifecycle correctamente; usar markRaw como con los componentes existentes |
| highlight.js | external (lib) | Re-usado en S4.T3 (CodeWalkthrough renderea snippets con hljs). Ya esta en stack | Bajo |
| HOR-013 dogfooding | internal (test data) | HOR-013.teach/* sirve de test case visual para S5 (debe seguir renderando bien post-cambio) | Bajo |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| S5.T3 mount imperativo de Vue components causa memory leaks (apps no destruidas al unmount de SectionTeachings) | medium | high | gestionar lifecycle: capturar `app` instances en ref, llamar `app.unmount()` en `onBeforeUnmount` de SectionTeachings; tests con multiple navegacion |
| Plugin markdown-it (S5.T1) interfiere con `wireInternalLinks` en useMarkdown (los placeholders contienen attributes que el regex de RECORD_ID podria matchear) | medium | medium | Verificar en S5.T1: el regex es `/\b(SPEC\|RULE\|...)/`; los placeholders no contienen IDs canonicos. Si hay conflicto: agregar guard especifico para `data-dkc-block-placeholder` en wireInternalLinks |
| Templates extendidos (S4.T5) generan teach-intake/teach-close mas largos → confunde la pedagogia (mas no siempre es mejor) | low | medium | bloque code-walkthrough opcional segun aplique; documentar en template "incluir solo si el caso tiene snippets relevantes — no fabricar" |
| Patron H7.1 confirmado en S2 pero la rule promovida en S6.T1 es muy generica para ser util | low | low | escribir rule con what/why/where/when concretos; si no aplica, dejar como decision en lugar de rule |
| Smoke UI en S5.T4 revela regression no anticipada en algun tab (ej: Draft-Intent que muestra preview HTML iframed) | medium | high | iterate en S5: si tab roto, ajustar plugin o el mount imperativo. Si el riesgo es muy alto: fallback al render default + log warning |
| Cierre dogfooding (S6.T3) falla porque el step request-close post-S2.T1 tiene un bug en la invocacion del sub-step | low | high | en S2.T1 hacer review especialmente cuidadoso del wording del invocacion (verificar que es invocacion explicita, no instruccion narrativa); si S6.T3 falla, iterate desde S2 |

## Open questions

(Ninguna activa — intake-explore convergio. Cualquier nueva pregunta emerge durante execute y se resuelve en la session correspondiente.)

## Decisions

### DEC-LOCAL-01: S2 dedicada T0 vs mezclar fixes con S3-S5

- **Contexto**: post-auditoria S1, decidir como ordenar los 6 fixes criticos+medios audit (en deckard markdown) vs los fixes de codigo (P5, P2, P7).
- **Drivers**:
  - garantia de cierre HOR-014 via dogfooding (high)
  - homogeneidad de tier por session (mid)
  - validacion empirica del patron H7.1 (mid)
- **Opcion elegida**: S2 dedicada T0 markdown-only.
- **Alternativas**:
  - mezclar fixes en S3/S4/S5 — tier mixto, riesgo de cierre llegando antes de F-1 fixado
  - deferir al backlog post-cierre — viola principio de no dejar bloqueantes activos al cerrar
- **Consecuencias**: agrega 1 session formal (S2) pero el cierre HOR-014 dogfoodea automaticamente F-1 (que es el bug mas critico de la auditoria).
- **Session**: S1 (decision tomada en intake-explore con dev confirmando "Schema + intent" para draft + plan refrescado).

### DEC-LOCAL-02: phase pre/delta/post en lugar de status separado por template

- **Contexto**: schema del bloque `dkc:code-walkthrough` debe servir a `teach-intake` (estado actual + delta esperado) y a `teach-close` (estado final + comparacion).
- **Drivers**:
  - un schema unico reduces mantencion (high)
  - templates separados por tipo de teaching duplicarian schema (mid)
- **Opcion elegida**: campo `phase: 'pre' | 'delta' | 'post'` opcional en cada step.
- **Alternativas**:
  - dos schemas separados (CodeWalkthroughIntakeBlock vs CodeWalkthroughCloseBlock) — duplicacion innecesaria
  - sin phase, autor decide narrativa — menos rigor educativo
- **Consecuencias**: parser valida enum cerrado, componente Vue puede emitir markers visuales por phase (badges "pre"/"post").
- **Session**: S1 (definicion del schema en draft v1).

### DEC-LOCAL-03: layoutHint con 3 modos vs renderer estatico

- **Contexto**: el bloque code-walkthrough puede usarse de tres formas: lista numerada vertical (default educativo), pares pre/post para mostrar cambios (lay before-after), lista plana (snippets independientes).
- **Drivers**:
  - flexibilidad para distintos tipos de walkthrough (high)
  - simplicidad del componente (low — 3 layouts no es complejidad excesiva)
- **Opcion elegida**: enum `layoutHint: 'numbered' | 'before-after' | 'flat'` con default 'numbered'.
- **Alternativas**:
  - solo numbered — perdida de flexibilidad
  - n layouts via slot/composition — overkill para v1
- **Consecuencias**: CodeWalkthrough.vue tiene 3 ramas de render. Tests cubren los 3 layouts.
- **Session**: S1 (definicion del schema en draft v1).

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Tickets cerrados con teach-close generado automaticamente | 0% (HOR-013 fue manual) | 100% post-S2 (excluyendo quick/query) | inspeccionar git log + frontmatter de tickets cerrados; verificar que LLM no invoco teach-close manualmente en el log |
| Findings de auditoria DKC sin fix | 11 | 0-2 (criticos + medios fixados; menores opcionalmente al backlog) | grep verifications post-S2 |
| Tabs HC con regression de render | 0 | 0 (se mantiene) | smoke UI S5.T4 |
| Render UX con doble fence | 1 (tab Teaching) | 0 | smoke UI S5.T5 dev approval |

## Technical reference

### Schema del bloque dkc:code-walkthrough (referencia desde draft v1 aprobado)

Ver `tickets/HOR-014.draft/data-model.ts`. Campos clave:

- `steps: CodeWalkthroughStep[]` — minimo 1, ordenado narrativamente
- `step.path: string` — path relativo al repo, requerido
- `step.code: string` — snippet, requerido
- `step.why: string` — texto educativo, requerido (warning <20 chars)
- `step.lines?: { from: number; to: number }` — opcional, link a `path#L<from>-L<to>` si presente
- `step.phase?: 'pre' | 'delta' | 'post'` — semantica temporal opcional
- `layoutHint?: 'numbered' | 'before-after' | 'flat'` — default 'numbered'

### Plugin markdown-it API (referencia para S5.T1)

Patron del plugin existente `markdownImageHook` en HC sirve como referencia. Estructura tipica:

```ts
export function markdownDkcInlineHook(md: MarkdownIt): void {
  const defaultFenceRender = md.renderer.rules.fence!
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const info = (token.info || '').trim()
    const matchDkc = /^dkc:([a-z-]+)/.exec(info)
    if (matchDkc) {
      // emit placeholder for dkc:* fence
      return `<div data-dkc-block-placeholder="${idx}" data-kind="${matchDkc[1]}"></div>`
    }
    if (info === 'mermaid') {
      return `<div data-dkc-block-placeholder="${idx}" data-kind="mermaid"></div>`
    }
    return defaultFenceRender(tokens, idx, options, env, self)
  }
}
```

(El `data-block-index` real corresponde al index dentro de `block: DkcBlock[]` parseado por backend HC, no al token idx — resolver mapping en S5.T2/S5.T3.)

### Mount imperativo de Vue componentes (referencia para S5.T3)

Patron tipico Vue 3:

```ts
import { createApp, markRaw } from 'vue'
import HypothesisMap from '@/components/teaching-blocks/HypothesisMap.vue'
// ...

const apps: ReturnType<typeof createApp>[] = []

onMounted(() => {
  const placeholders = document.querySelectorAll('[data-dkc-block-placeholder]')
  placeholders.forEach((el) => {
    const kind = el.getAttribute('data-kind')
    const blockIndex = Number(el.getAttribute('data-block-index'))
    const block = activeTeaching.value.blocks[blockIndex]
    const Component = blockComponent({ kind } as any)
    if (Component && block) {
      const app = createApp(markRaw(Component), { block })
      app.mount(el)
      apps.push(app)
    }
  })
})

onBeforeUnmount(() => {
  apps.forEach((app) => app.unmount())
  apps.length = 0
})
```

(Detalle final en S5.T3 — manejar edge cases: navegacion entre tabs intake/close, re-render al cambiar activeKind.)

## Rules discovered

(se llena durante ejecucion; candidatos detectados en S1: L-S1-1 sobre patron "regla → workflow → step ausente", L-S1-2 sobre divergencia de gates en design-{tipo})

## Bugs found

(se llena durante ejecucion; candidato retroactivo en S6.T2: BUG-workflow-XXX "HOR-013 cerrado con teach-close manual revelado por audit S1")

## Acceptance checkpoints

- [ ] **Funcional**: REQ-IMPROVE-01 a 06 + REQ-PRESERVE-01 a 03 pasan los scenarios definidos
- [ ] **Tests**: vitest HC verde (sessions, flowInference, blocks, useMarkdown plugin, CodeWalkthrough)
- [ ] **NFRs**: render perf bajo target + bundle delta bajo target
- [ ] **Rules**: DET-21 + DET-22 verificadas con grep en steps fixados; patron H7.1 evaluado para promocion a rule
- [ ] **Integration**: smoke UI 5 tabs sin regresion (S5.T4)
- [ ] **Dogfooding**: cierre automatico de HOR-014 produce teach-close.md sin atencion humana (S6.T3)
- [ ] **Docs**: templates teach-intake/teach-close con seccion code-walkthrough; spec status: done; ticket status: closed
