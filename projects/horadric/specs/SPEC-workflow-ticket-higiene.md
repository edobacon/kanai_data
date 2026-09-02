---
id: SPEC-workflow-ticket-higiene
project: horadric
ticket: HOR-009
status: done
---

# Higiene de tickets: evidencia visual, testing state, backlog y UX del viewer

# Higiene de tickets: evidencia visual, testing state, backlog y UX del viewer

## Purpose

Cerrar 5 leaks combinados que erosionan la confianza en el sistema spec-driven de Deckard Cain: TCs que cierran en `pending`, screenshots fisicos huerfanos del viewer (11/12 invisibles), backlog vacio pese a descubrir scope fuera, FlowDiagram invisible por index stale, y viewer con gaps UX menores. La capa de flujo (dkc) y la capa de rendering (hc) se arreglan en un solo ticket porque el viewer solo refleja lo que dkc produce: no hay fix independiente que resuelva.

**Para quien**: el dev (como autor y lector de tickets) y la auditabilidad del propio sistema.

## Requirements

### REQ-IMPROVE-01: Convencion de Evidence en template

El template `templates/records/ticket.md` MUST mostrar la sintaxis markdown valida para screenshots en Evidence, sin envolver paths en backticks.

**Actor**: scribe (al leer el template como referencia); dev (al escribir Evidence).
**Layers**: template (dkc).

#### Scenario: template ensena sintaxis correcta
- **GIVEN** `templates/records/ticket.md` linea ~174
- **WHEN** un dev o el scribe lee el ejemplo de Evidence
- **THEN** el ejemplo usa sintaxis `![caption](HOR-XXX.screenshots/HOR-XXX-foo.png)` o `[caption](path.png)` — NO backticks alrededor del path
- **AND** un comentario explicito advierte: "NO usar backticks — el hook del viewer los ignora por DEC-LOCAL-01 de `markdownImageHook.ts`"

#### Acceptance
**El usuario puede verificar que funciona**: abrir `templates/records/ticket.md`, buscar la linea de Evidence, confirmar que el ejemplo y el TC-1 preview usan sintaxis markdown valida sin backticks.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Template renderiza chip | template actualizado | copiar ejemplo a un ticket real y abrir en viewer | chip clickeable aparece | lightbox abre con caption |

---

### REQ-IMPROVE-02: Gate condicional de close con `Affects UI`

El sistema MUST bloquear el cierre de un ticket cuando algun test case con `Affects UI: yes` tenga Evidence vacia (`—`), salvo que exista un override formal registrado en el frontmatter del ticket.

**Actor**: scribe (al ejecutar `request-close.md`).
**Layers**: template (dkc), prompt de cierre (dkc).

#### Scenario: gate bloquea close sin evidencia visual
- **GIVEN** ticket con TC-3 `Affects UI: yes` + `Evidence: —`
- **WHEN** el scribe intenta ejecutar el paso "marcar status: closed"
- **THEN** el gate aborta con mensaje "TC-3 afecta UI y no tiene Evidence — completar o declarar override en frontmatter"
- **AND** el ticket NO cambia a closed

#### Scenario: override formal permite close
- **GIVEN** ticket con TC-3 en las mismas condiciones + frontmatter `overrides: [{tc: TC-3, reason: "validacion pendiente de prod — se cierra por urgencia"}]`
- **WHEN** el scribe ejecuta el cierre
- **THEN** el gate permite el close
- **AND** el Summary registra "1 TC cerrado sin evidencia por override: TC-3 (razon: validacion pendiente de prod)"

#### Scenario: TC no visual no requiere evidencia
- **GIVEN** ticket con TC-5 `Affects UI: no` + `Evidence: —`
- **WHEN** el scribe ejecuta el cierre
- **THEN** el gate permite el close sin bloqueo

#### Scenario: backwards compatibility con tickets legacy
- **GIVEN** ticket cerrado ANTES de este cambio cuyas tablas TC no tienen columna `Affects UI`
- **WHEN** se lee el ticket
- **THEN** se interpreta como `Affects UI: no` implicito en todas las filas
- **AND** no se re-evalua el gate sobre tickets ya closed

#### Acceptance
**El usuario puede verificar que funciona**: crear un ticket de prueba con TC visual sin evidencia, intentar cerrar, confirmar que se bloquea; luego agregar override en frontmatter, confirmar que cierra y queda registrado en Summary.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Bloqueo | TC Affects UI=yes, Evidence=— | cerrar | gate aborta | status sigue in_progress |
| 2 | Override | +overrides en frontmatter | cerrar | permite | Summary con razon |
| 3 | TC no visual | Affects UI=no | cerrar | permite | sin bloqueo |
| 4 | Legacy | ticket sin columna | leer | asume no | no re-evalua |

---

### REQ-IMPROVE-03: Captura de scope fuera al backlog durante execute

El prompt `prompts/steps/request-execute.md` MUST incluir una subsection explicita "Scope fuera descubierto" dentro del ciclo por task que instruya al scribe a capturar inmediatamente al backlog del ticket cualquier descubrimiento fuera de scope, antes de continuar a la task siguiente.

**Actor**: scribe (durante execute).
**Layers**: prompt de execute (dkc).

#### Scenario: descubrimiento fuera de scope va al backlog
- **GIVEN** ciclo por task en progreso; el developer descubre que al arreglar X hay que tocar Y (no esta en ninguna task del spec)
- **WHEN** el developer reporta el descubrimiento
- **THEN** el scribe evalua con el architect: ¿es una task nueva del spec actual (scope expandible) o queda fuera (backlog)?
- **AND** si queda fuera, scribe agrega al ticket `## Backlog` con: item autocontenido (titulo), "Que existe" (archivos ya tocados), "Como retomar" (pasos concretos), prioridad (must/should/could)
- **AND** NO se avanza a la task siguiente hasta que el item quede registrado

#### Scenario: discovery dentro de scope va al spec
- **GIVEN** el descubrimiento es autocontenido dentro del spec actual
- **WHEN** se evalua
- **THEN** va como nueva task del spec (flujo existente "Nuevas tasks descubiertas"), NO al backlog del ticket

#### Acceptance
**El usuario puede verificar que funciona**: abrir `prompts/steps/request-execute.md`, ver la subsection nueva entre lineas ~284 y el cierre del ciclo por task, con trigger + criterio de decision + accion de captura.

---

### REQ-IMPROVE-04: CommitDiffView con archivos expandables

`src/views/CommitDiffView.vue` MUST renderizar cada archivo del diff envuelto en un `<details>` colapsable, con default colapsado cuando el patch supera 50 lineas.

**Actor**: user (viewer).
**Layers**: frontend (hc views).

#### Scenario: archivo largo colapsado por default
- **GIVEN** un commit con archivo cuyo patch tiene 120 lineas
- **WHEN** el user abre el commit
- **THEN** el archivo aparece colapsado con header visible (path + stats)
- **AND** click en el header lo expande mostrando el patch completo

#### Scenario: archivo corto expandido por default
- **GIVEN** un commit con archivo cuyo patch tiene 15 lineas
- **WHEN** el user abre el commit
- **THEN** el archivo aparece expandido (patch visible)

#### Acceptance
**El usuario puede verificar que funciona**: abrir un commit grande (ej commit de HOR-007 con >3 archivos), confirmar que cada archivo es colapsable y que los largos inician colapsados.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Largo colapsado | patch>50 lineas | cargar commit | `<details open=false>` | header visible, body oculto |
| 2 | Corto expandido | patch<=50 lineas | cargar commit | `<details open=true>` | body visible |
| 3 | Toggle | click header | — | alterna estado | body aparece/desaparece |

---

### REQ-IMPROVE-05: BackToTop global

Existe un componente flotante `BackToTop` montado globalmente en `src/App.vue` que MUST aparecer cuando `window.scrollY > 300` y al hacer click MUST devolver el viewport al top con `behavior: smooth`.

**Actor**: user (viewer, en vistas largas).
**Layers**: frontend (hc components + App shell).

#### Scenario: aparece al scrollear
- **GIVEN** cualquier vista (ticket, spec, commit diff)
- **WHEN** user scrollea mas de 300px hacia abajo
- **THEN** el boton BackToTop aparece en la esquina bottom-right
- **AND** click sobre el boton dispara scroll smooth al top
- **AND** el boton desaparece cuando scrollY vuelve a < 300

#### Acceptance
**El usuario puede verificar que funciona**: abrir HOR-005 (ticket largo), scrollear hasta el final, verificar boton visible en bottom-right, click, confirmar que scroll vuelve al top.

---

### REQ-IMPROVE-06: Auditoria de screenshots huerfanos + migracion retroactiva

Existe el comando `commands/dkc-audit-screenshots` (bash) que MUST listar para cada ticket del proyecto activo: (a) screenshots fisicos en `{ticketId}.screenshots/`, (b) referencias con sintaxis markdown valida en el `.md`, (c) huerfanos (fisicos sin link valido). Los tickets HOR-005, HOR-007, HOR-008 MUST quedar migrados al cerrar HOR-009: todos sus screenshots fisicos pasan a estar linkeados con sintaxis markdown valida en el body del ticket.

**Actor**: dev (invoca comando); scribe (ejecuta migracion).
**Layers**: commands (dkc), tickets legacy (horadric).

#### Scenario: auditoria detecta huerfanos conocidos
- **GIVEN** proyecto horadric con HOR-005 (8 archivos), HOR-007 (3 archivos), HOR-008 (1 archivo)
- **WHEN** dev ejecuta `./commands/dkc-audit-screenshots`
- **THEN** el comando reporta por ticket: total fisicos, linkeados validos, huerfanos
- **AND** pre-migracion: HOR-005 7/8 huerfanos, HOR-007 3/3, HOR-008 1/1 (= 11/12)

#### Scenario: post-migracion todos son linkeados
- **GIVEN** HOR-005/007/008 migrados durante HOR-009
- **WHEN** dev re-ejecuta auditoria
- **THEN** los 3 tickets reportan 0 huerfanos
- **AND** abrir cada uno en viewer muestra los screenshots como chips clickeables

#### Scenario: migracion solo toca Evidence / menciones
- **GIVEN** ticket cerrado a migrar
- **WHEN** scribe reescribe las menciones
- **THEN** modifica solo sintaxis (backticks → markdown link) en Coverage map + Test cases + narrativa
- **AND** NO agrega ni elimina contenido
- **AND** status del ticket sigue `closed` + fecha de closed sin cambios

#### Acceptance
**El usuario puede verificar que funciona**: correr el comando antes y despues, comparar reporte; abrir los 3 tickets migrados en el viewer y confirmar que los screenshots aparecen como chips.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | Reporte pre | estado actual | ejecutar | tabla por ticket | 11 huerfanos totales |
| 2 | Reporte post | migrado | ejecutar | tabla por ticket | 0 huerfanos |
| 3 | Viewer chips | post-migracion | abrir HOR-007 | 3 chips visibles | lightbox abre cada uno |

---

### REQ-IMPROVE-07: FlowDiagram visible en todos los tickets

El FlowDiagram MUST renderizarse en `TicketDetail.vue` para cualquier ticket existente en el proyecto activo, sin importar cuan reciente fue creado o cerrado.

**Actor**: user (viewer).
**Layers**: index (dkc), server `inferTicketFlow` (hc), frontend `TicketDetail.vue` (hc).

#### Scenario: ticket recien cerrado muestra flow
- **GIVEN** ticket HOR-009 cerrado con auto-reindex disparado
- **WHEN** user abre HOR-009 en viewer
- **THEN** FlowDiagram aparece con nodos intake → design-improvement → design-transition → execute → close
- **AND** estado actual reflejado en cada nodo (ver REQ-IMPROVE-08)

#### Scenario: ticket con BD stale muestra feedback
- **GIVEN** ticket XYZ que no esta en `index.db` (hipotetico error de reindex)
- **WHEN** user abre XYZ
- **THEN** el viewer muestra un banner "Ticket no indexado. Corre `./commands/dkc-reindex` o re-cerralo para disparar auto-reindex" en lugar de ocultar silenciosamente el componente

#### Acceptance
**El usuario puede verificar que funciona**: post-HOR-009 close, abrir HOR-005/007/008/009 en viewer, los 4 muestran FlowDiagram.

---

### REQ-IMPROVE-08: Tri-estado en FlowNode (skip / na)

`server/deckard/flowInference.ts` MUST emitir status `skip` para pasos omitidos deliberadamente con justificacion (ej `design-draft` cuando `creates_visual=false && creates_data=false`) y status `na` para pasos que no aplican al `work_type` (ej `execute` y `close` en `work_type: explore`). `FlowNode.vue` MUST renderizar los 3 estados nuevos (`done`, `skip`, `na`) con iconos/colores distinguibles y tooltip desde `skippedReason` cuando exista.

**Actor**: user (viewer).
**Layers**: shared types (hc), server inferidor (hc), frontend FlowNode component (hc).

#### Scenario: design-draft omitido por creates_visual=false
- **GIVEN** ticket improvement con `creates_visual: false && creates_data: false`
- **WHEN** se infiere el flow
- **THEN** el nodo `design-draft` tiene `status: 'skip'` + `skippedReason: "creates_visual=false && creates_data=false (Regla 18 no aplica)"`
- **AND** el tooltip al hover muestra la razon

#### Scenario: execute/close no aplica a explore
- **GIVEN** ticket `work_type: explore`
- **WHEN** se infiere el flow
- **THEN** los nodos `execute` y `close` tienen `status: 'na'`
- **AND** el tooltip indica "no aplica a work_type=explore"

#### Scenario: diferenciacion visual
- **GIVEN** FlowDiagram renderizado con nodos en los 5 status posibles (`pending`, `active`, `done`, `skip`, `na`)
- **WHEN** user observa el diagrama
- **THEN** cada status tiene icono y/o color distinto (ej `done`=check verde, `skip`=circulo discontinuo ambar, `na`=circulo tachado gris)

#### Acceptance
**El usuario puede verificar que funciona**: abrir HOR-009 (improvement con creates_visual=false), ver `design-draft` marcado como skip con tooltip explicativo; abrir HOR-001 (explore), ver `execute` y `close` como na.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | skip | creates_visual=false | inferir | nodo design-draft.status | `'skip'` + reason |
| 2 | na | work_type=explore | inferir | nodo execute.status | `'na'` |
| 3 | Render | 5 status distintos | paint | iconos | 5 iconos unicos |

---

### REQ-IMPROVE-09: Auto-reindex al cerrar ticket

`prompts/steps/request-close.md` MUST disparar auto-reindex del proyecto activo despues de escribir `status: closed` y antes de presentar el Summary final. El reindex se ejecuta **sincrono** (el close espera al resultado) via un nuevo script `commands/dkc-reindex` que ejecuta la logica de `prompts/steps/reindex.md` sin depender del LLM para cada paso.

**Actor**: scribe (ejecuta reindex durante close).
**Layers**: commands (dkc), prompts de close (dkc), index.db (dkc).

#### Scenario: close actualiza index inmediatamente
- **GIVEN** ticket HOR-009 con `status: in_progress` y todos los checks de close pasando
- **WHEN** scribe marca `status: closed` en el frontmatter
- **THEN** scribe invoca `./commands/dkc-reindex` (sync)
- **AND** al terminar, `sqlite3 ... WHERE id='HOR-009'` retorna fila con `type='ticket'` y `status='closed'`
- **AND** el close se completa en < 10s para un proyecto de hasta ~200 artefactos

#### Scenario: falla de reindex no revierte close
- **GIVEN** `./commands/dkc-reindex` falla (permiso, disk full)
- **WHEN** scribe detecta exit code != 0
- **THEN** el ticket queda marcado `closed` (close fue exitoso)
- **AND** scribe advierte al dev "reindex fallo — corre manualmente `./commands/dkc-reindex` o `prompts/steps/reindex.md`"
- **AND** registra el fallo en learns del ticket

#### Acceptance
**El usuario puede verificar que funciona**: cerrar HOR-009; antes del close, sqlite3 no devuelve HOR-009; despues del close, sqlite3 devuelve HOR-009 con status=closed, y el FlowDiagram aparece al abrirlo en viewer.

---

### REQ-PRESERVE-01: Hook markdownImageHook intacto

El sistema MUST mantener `src/composables/markdownImageHook.ts` sin modificaciones. La decision DEC-LOCAL-01 ("no procesar contenido de `code_inline`") se preserva.

**Actor**: developer (al no tocar el archivo).
**Layers**: frontend (hc).

#### Scenario: grep confirma hook intacto
- **GIVEN** HOR-009 cerrado
- **WHEN** `git diff main HEAD -- src/composables/markdownImageHook.ts`
- **THEN** sin cambios

---

### REQ-PRESERVE-02: Tickets con sintaxis correcta siguen renderizando

El sistema MUST preservar el render de screenshots en tickets que ya usan sintaxis markdown valida. Caso de referencia: `HOR-005-bug1-wire-internal-links-conflict.png` en HOR-005 (unica mencion valida pre-migracion).

**Actor**: user (viewer).
**Layers**: frontend (hc).

#### Scenario: chip pre-existente sigue activo
- **GIVEN** post-HOR-009
- **WHEN** user abre HOR-005
- **THEN** `HOR-005-bug1-wire-internal-links-conflict.png` sigue como chip clickeable (no regresion)

---

### REQ-PRESERVE-03: Tests existentes de flowInference siguen verdes

La suite `server/deckard/flowInference.test.ts` MUST pasar integramente despues del cambio en `inferTicketFlow` para soportar `skip`/`na`, incluyendo los tests de BLY-002, TICKET-001 (up1), HOR-001.

**Actor**: reviewer.
**Layers**: server (hc).

#### Scenario: regression de flow tests
- **GIVEN** cambios de REQ-IMPROVE-08 aplicados
- **WHEN** `cd horadric-cube && npm test -- flowInference`
- **THEN** todos los tests previos + tests nuevos (casos skip/na) pasan
- **AND** delta vs baseline = 0 failures

---

## Changes

### Modified: `templates/records/ticket.md`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Linea ~174 ejemplo Evidence | `` screenshot (`{TICKET-id}.screenshots/{TICKET-id}-nombre.png` junto al ticket) `` | `screenshot con sintaxis markdown: ![caption](HOR-XXX.screenshots/HOR-XXX-nombre.png)` + nota "NO backticks — ver DEC-LOCAL-01" | REQ-IMPROVE-01: el propio ejemplo autosabotaba la convencion |
| Tabla TC columnas | `\| # \| Case \| REQ \| Type \| Precondition \| Steps \| Expected \| Actual \| Evidence \| Status \|` | agregar columna **`Affects UI`** (yes/no) entre `Type` y `Precondition` | REQ-IMPROVE-02: gate condicional necesita leer este campo |
| TC ejemplo (fila 171) | — | defaultea `Affects UI: no` en el ejemplo, con nota de cuando poner `yes` | REQ-IMPROVE-02 claridad para el dev |

### Modified: `prompts/steps/request-close.md`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Gate final (seccion ⚠️ GATES) | checkbox "Test cases: todos con Actual + Status (no pending)" (recomendacion) | gate BLOQUEANTE: "Para cada TC con `Affects UI: yes`: Evidence != `—` OR override formal en frontmatter" | REQ-IMPROVE-02 |
| Summary — campo nuevo | — | "N TCs cerrados sin evidencia por override" + lista | REQ-IMPROVE-02 |
| Paso post-"status: closed" | — | paso nuevo "Auto-reindex: ejecutar `./commands/dkc-reindex`" | REQ-IMPROVE-09 |

### Modified: `prompts/steps/request-execute.md`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Seccion "Nuevas tasks descubiertas" (linea ~284) | solo contempla agregar al spec | agregar subsection "Scope fuera descubierto → Backlog" con trigger + criterio de decision + accion de captura obligatoria antes de siguiente task | REQ-IMPROVE-03 |

### Modified: `src/views/CommitDiffView.vue` (hc)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Template (71-109) | iterate archivos en `<section>` plana | envolver cada archivo en `<details>` con `open={patch.lineCount <= 50}` | REQ-IMPROVE-04 |

### Modified: `src/App.vue` (hc)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Montaje components globales | `<ScreenshotLightbox />` | agregar `<BackToTop />` | REQ-IMPROVE-05 |

### Modified: `shared/types.ts` (hc)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `FlowNode` | `{ id, label, status, description, agents, produces }` | agregar `skippedReason?: string` | REQ-IMPROVE-08 tooltip |

### Modified: `server/deckard/flowInference.ts` (hc)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Derivacion de status | `done \| active \| pending \| blocked` (sin skip/na poblados) | agregar logica para `skip` (design-draft omitido) y `na` (pasos no aplicables al work_type) | REQ-IMPROVE-08 |

### Modified: `src/components/flow/FlowNode.vue` (hc)

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| Render por status | casos done/active/pending/blocked | agregar render distinguible para `skip` (circulo discontinuo ambar) y `na` (circulo tachado gris) + tooltip de `skippedReason` | REQ-IMPROVE-08 |

### Added: `commands/dkc-audit-screenshots`

Bash script. Recorre `projects/{activo}/tickets/*.screenshots/`, compara con links markdown en el `.md` correspondiente, reporta huerfanos con formato:

```
HOR-005: 8 fisicos, 1 linkeado, 7 huerfanos
  HOR-005-req-02a-screenshots-inline-chips.png (HUERFANO)
  HOR-005-req-02b-lightbox-with-context.png (HUERFANO)
  ...
```

### Added: `commands/dkc-reindex`

Bash script que wraps la logica de `prompts/steps/reindex.md`. Sincrono. Exit code 0 en exito, != 0 en fallo. Usa `better-sqlite3` CLI o `sqlite3` directo. Output en stderr para logs, stdout silencioso en exito (o "reindexed N records").

### Added: `src/components/BackToTop.vue` (hc)

Componente Vue simple. Escucha scroll global, muestra boton flotante cuando scrollY > 300, scroll smooth al top on click.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Performance | Auto-reindex en close | tiempo total | < 10s para <= 200 artefactos |
| Performance | BackToTop scroll listener | throttling | debounce 100ms maximo |
| UX | FlowNode tooltip legible | tamano de texto | >= 12px, contraste WCAG AA |

## Tasks

| # | Task | Agent | Depends on | Files | Validation | Status | Session | Rules | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------------ | -------- | --------- | --- | --- | --- |
| 1 | Baseline: capturar regression suite pre-cambios | researcher | — | — (solo lectura) | `npm test` completo en horadric-cube, registrar resultado | **done** | 1 | — | — | — |
| 2 | Snapshot index.db pre-cambios | researcher | — | — | `sqlite3 projects/horadric/index.db "SELECT count(*) FROM records"` registrar | **done** | 1 | — | — | — |
| 3 | A1+A2.template: Evidence sintaxis + columna Affects UI + overrides frontmatter | developer | #1 | `templates/records/ticket.md` | manual: abrir template, confirmar sintaxis + nota + columna + campo overrides; usar en HOR-009 cierre como dogfooding | **done** | 1 | — | — | — |
| 4 | A3: subsection "Scope fuera descubierto" en execute.md | developer | #1 | `prompts/steps/request-execute.md` | manual: confirmar subsection entre lineas ~284 y cierre del ciclo | **done** | 1 | — | — | — |
| 5 | A2.close: gate condicional + logica de override + Summary en close.md (parte template ya cubierta en #3) | developer | #1, #3 | `prompts/steps/request-close.md` | manual: ticket sintetico con TC Affects UI=yes, Evidence=— → gate bloquea; agregar override → permite + Summary registra | **done** | 1 | — | — | — |
| 6 | B3: BackToTop component + montaje en App.vue | developer | #1 | `src/components/shell/BackToTop.vue` (nuevo), `src/App.vue` | `npm test`; manual: HOR-005 scroll > 300 → boton visible, click → top | **done** | 1 | — | — | — |
| 7 | B2: CommitDiffView archivos expandables | developer | #1 | `src/views/CommitDiffView.vue` | `npm test`; manual: abrir commit con archivo >50 lineas → colapsado; toggle funciona | **done** | 1 | — | — | — |
| 8 | B5 parte 1: skippedReason + inferTicketFlow reason + tests (skip/na ya existia en el inferidor) | developer | #1 | `shared/types.ts`, `server/deckard/workflow.ts`, `server/deckard/flowInference.ts`, `server/deckard/flowInference.test.ts` | `npm test -- flowInference` — 6/6 pass; full suite 80/80 (delta +1) | **done** | 1 | — | — | — |
| 9 | B5 parte 2: render tri-estado en FlowNode.vue (labels DEC-LOCAL-05 + tooltip) | developer | #8 | `src/components/flow/FlowNode.vue` | manual: abrir HOR-009 (skip en design-draft) + HOR-001 (na en execute/close) → iconos + tooltip correctos | **done** | 1 | — | — | — |
| 10 | A5: `commands/dkc-reindex` + hook en request-close.md | developer | #1 | `commands/dkc-reindex` (nuevo), `prompts/steps/request-close.md` | manual: correr script → index.db actualizado; `chmod +x`; exit code 0 en exito | **done** | 1 | — | — | — |
| 11 | A4: `commands/dkc-audit-screenshots` + migracion HOR-005/007/008 | developer | #10 | `commands/dkc-audit-screenshots` (nuevo), `projects/horadric/tickets/HOR-005.md`, `HOR-007.md`, `HOR-008.md` | auditoria pre: 11 huerfanos; auditoria post: 0 en scope | **done** | 1 | — | — | — |
| 12 | Verificar TC-11 FlowDiagram visible en HOR-005/007/008/009 post-reindex | reviewer | #10 | `server/deckard/flowInference.test.ts` | test integracion: inferTicketFlow no null para los 4 tickets + HOR-009 design-draft=skip | **done** | 1 | — | — | — |
| 13 | Regression final: comparar con baseline #1 | reviewer | #3..#12 | — | `npm test` full, delta = 0 regresiones | **done** | 1 | — | — | — |
| 14 | Ejecutar los 15 TC del ticket y llenar Evidence/Status | reviewer | #13 | `projects/horadric/tickets/HOR-009.md` | cada TC con Actual, Evidence (link markdown), Status actualizado | **done** | 1 | — | — | — |
| 15 | Cerrar HOR-009 validando A2 gate + A5 auto-reindex end-to-end; ademas abordar Backlog B1 (bug indexer) por decision del dev | scribe + developer | #14 | `projects/horadric/tickets/HOR-009.md`, `server/src/deckard_cain/core/records.py`, `server/src/deckard_cain/tools/mechanical.py`, `server/tests/test_indexer_topic_key_dedup.py` | gate A2 permite cierre con 6 overrides validos; pytest 3/3 pass; auto-reindex post-close disparado; HOR-009 con status=closed en index.db | **done** | 1 | — | — | — |

### Task contract

```
Task #1: Baseline regression suite
- source_ref: REQ-PRESERVE-03 (+ baseline general)
- agent: researcher
- files: —
- precondition: rama HOR-009-ticket-higiene-evidencia-viewer creada
- expected_output: "Baseline: N pass / M fail en horadric-cube tests" registrado en sesion 1
- validation: `npm test` ejecutado, resultado registrado
- rollback: N/A
- rules: [11, 13]

Task #3: Corregir Evidence en template
- source_ref: REQ-IMPROVE-01
- agent: developer
- files: templates/records/ticket.md
- precondition: baseline capturado (#1)
- expected_output: linea ~174 con sintaxis markdown valida + comentario explicito sobre DEC-LOCAL-01
- validation: manual (abrir template, confirmar)
- rollback: git revert commit
- rules: [2, 8, 11, 16]  # source_ref, rollback, KB-first, propagacion (el template afecta todos los proyectos)

Task #5: Gate condicional de close con Affects UI
- source_ref: REQ-IMPROVE-02
- agent: developer
- files: templates/records/ticket.md (columna), prompts/steps/request-close.md (gate + override)
- precondition: #1
- expected_output: (a) template con columna nueva + ejemplo, (b) close.md con gate bloqueante condicional + logica de override + entrada en Summary
- validation: ticket sintetico TC Affects UI=yes Evidence=— → gate bloquea; con override → permite + Summary registra
- rollback: git revert (ambos archivos)
- rules: [2, 5, 8, 10, 11, 16]  # source_ref, multi-capa (template+prompt), rollback, limites de rol, KB-first, propagacion

Task #8: inferTicketFlow para skip/na
- source_ref: REQ-IMPROVE-08, REQ-PRESERVE-03
- agent: developer
- files: shared/types.ts, server/deckard/flowInference.ts, server/deckard/flowInference.test.ts
- precondition: #1
- expected_output: (a) FlowNode.skippedReason?, (b) inferidor deriva skip para design-draft sin creates_*, na para execute/close en explore, (c) tests nuevos + tests legacy pasan
- validation: `npm test -- flowInference` verde full
- rollback: git revert
- rules: [2, 5, 7, 8, 10, 11]

Task #10: commands/dkc-reindex + hook en close
- source_ref: REQ-IMPROVE-09
- agent: developer
- files: commands/dkc-reindex (nuevo, chmod +x), prompts/steps/request-close.md
- precondition: #1
- expected_output: (a) script bash sincrono con exit codes, (b) paso "Auto-reindex" insertado post-"status: closed", (c) manejo de fallo (ticket queda closed + advertencia)
- validation: correr script con index.db vacio de HOR-009 → aparece tras correr
- rollback: git revert
- rules: [2, 5, 8, 10, 11]

Task #11: Auditoria + migracion retroactiva
- source_ref: REQ-IMPROVE-06
- agent: developer
- files: commands/dkc-audit-screenshots (nuevo), HOR-005.md, HOR-007.md, HOR-008.md
- precondition: #10 (reindex disponible para re-indexar post-migracion)
- expected_output: (a) script con reporte tabular, (b) 11 menciones con backticks migradas a sintaxis markdown link en los 3 tickets, (c) auditoria post = 0 huerfanos, (d) tickets siguen status:closed con fecha original
- validation: auditoria pre/post + viewer visual
- rollback: git revert de los 3 .md + eliminar script
- rules: [2, 5, 8, 10, 11, 16]

Task #15: Cerrar HOR-009 (dogfooding)
- source_ref: todos los REQ-IMPROVE (validacion end-to-end)
- agent: scribe
- files: projects/horadric/tickets/HOR-009.md
- precondition: #14
- expected_output: ticket cerrado + auto-reindex disparado + FlowDiagram visible en viewer + Summary completo sin override (o con override justificado)
- validation: sqlite3 devuelve HOR-009 post-close; viewer muestra flow completo con skip en design-draft
- rollback: re-abrir ticket (status: in_progress) si el close fue prematuro
- rules: [13, 14, 17]  # evidencia, approve/iterate, backlog lifecycle
```

## Constraints

- **RULE-viewer-assets-context-001** (HOR-005) — UI que expone asset debe preservar contexto narrativo. **Cumplida**: no introducimos tab ni galeria, seguimos patron inline + lightbox.
- **DEC-LOCAL-01** (markdownImageHook) — no procesar `code_inline`. **Respetada** via REQ-PRESERVE-01.
- **DEC-LOCAL-06** (HOR-005) — screenshots sin tab dedicada. **Respetada**.
- **Regla 18** (draft aprobado antes de spec) — **no aplica**: `creates_visual: false && creates_data: false` confirmado por dev como excepcion justificada.
- **Regla 17** (backlog lifecycle) — HOR-009 debe cerrar con backlog sin items `must` abiertos. Aplicar especialmente si T11 (migracion retroactiva) descubre casos raros.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| better-sqlite3 / sqlite3 CLI | internal | `commands/dkc-reindex` lo consume | bajo — ya esta en hc |
| `prompts/steps/reindex.md` | internal | logica de reindex (fuente del bash script) | bajo — existe y funciona manual |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Regresion silenciosa en bayley/up1 por cambios en prompts globales | medio | medio | Cambios additive; A2 aplica solo hacia adelante; default implicito `Affects UI: no` para tickets legacy; baseline `npm test` antes y despues |
| Scope creep en B5 (tentacion de rediseno full de FlowNode) | medio | bajo | Alcance cerrado: iconos + color + tooltip. Cualquier deseo extra → Backlog |
| Migracion retroactiva rompe tickets cerrados | bajo | medio | Task 11 solo cambia sintaxis (no contenido); git revert como rollback; T12 valida visualmente los 3 tickets en viewer |
| Auto-reindex falla en close | bajo | bajo | Manejo definido: ticket queda closed + advertencia + learn; comando manual disponible como fallback |
| Override de A2 se abusa (se cierran muchos TC sin evidencia) | medio | medio | Cada override queda registrado en Summary + razon obligatoria; auditoria visual periodica por el dev |

## Open questions

Todas cerradas en la fase de analisis con aprobacion del dev:

- ~OQ1 (sync vs async auto-reindex)~ — resuelto: **sync** (DEC-LOCAL-02).
- ~OQ2 (migracion dentro de HOR-009 o aparte)~ — resuelto: **dentro** (T11).
- ~OQ3 (override libre vs formal)~ — resuelto: **formal via frontmatter** (DEC-LOCAL-03).
- ~OQ4 (LLM reindex vs bash script)~ — resuelto: **bash script `commands/dkc-reindex`** (DEC-LOCAL-04).
- ~OQ5 (criterios skip vs na)~ — resuelto: **skip = omitido deliberado con justificacion; na = no aplica al work_type** (DEC-LOCAL-05).

## Decisions

### DEC-LOCAL-01: Migracion retroactiva dentro de HOR-009
- **Contexto**: HOR-005/007/008 tienen 11 screenshots huerfanos (backticks). Se puede migrar dentro de este ticket o abrir otro.
- **Drivers**: dogfooding — los cambios de A1 (convencion) solo se validan si hay tickets migrados que los demuestren; TC-8 depende de tenerlos linkeados.
- **Opcion elegida**: dentro, Task 11.
- **Alternativas**: ticket separado HOR-010 — descartado por perdida de dogfooding + ciclo de feedback mas lento.
- **Consecuencias**: HOR-009 crece 1 task + editar 3 tickets cerrados. Rollback simple (git revert).

### DEC-LOCAL-02: Auto-reindex sincrono
- **Contexto**: auto-reindex puede ser sync (close espera) o async (close no espera).
- **Drivers**: TC-15 exige verificacion "dentro del mismo minuto"; consistencia inmediata > velocidad marginal.
- **Opcion elegida**: sync. Target < 10s.
- **Alternativas**: async (disparar en background) — descartado por ventana de inconsistencia donde el viewer no muestra flow del ticket recien cerrado.
- **Consecuencias**: close tarda ~2-10s mas, aceptable. Falla de reindex no revierte close (documentado en REQ-IMPROVE-09).

### DEC-LOCAL-03: Override de A2 via campo formal en frontmatter
- **Contexto**: A2 gate necesita un mecanismo de override. Opciones: declaracion libre en session (detecta por grep) vs campo formal en frontmatter.
- **Drivers**: auditabilidad > flexibilidad. Sin campo formal, un dev podria "cerrar sin evidencia" sin dejar rastro claro.
- **Opcion elegida**: campo `overrides: [{tc: TC-X, reason: "..."}]` en frontmatter del ticket.
- **Alternativas**: grep de session — descartado por fragilidad y dificultad de auditar.
- **Consecuencias**: schema del ticket se expande; el dev DEBE escribir un YAML explicito para saltar el gate — friccion deliberada.

### DEC-LOCAL-04: `commands/dkc-reindex` como bash script
- **Contexto**: el auto-reindex puede ejecutarse via LLM siguiendo `prompts/steps/reindex.md` paso a paso, o via script bash.
- **Drivers**: velocidad (sync close depende de esto), repetibilidad, consistencia con `commands/dkc-active-ticket` y `dkc-audit-screenshots`.
- **Opcion elegida**: script bash `commands/dkc-reindex`.
- **Alternativas**: LLM ejecuta el prompt cada vez — descartado por lentitud (~20s vs ~2s) + drift.
- **Consecuencias**: nuevo artefacto mantenible en bash. `prompts/steps/reindex.md` queda como spec-doc del script.

### DEC-LOCAL-05: Semantica de skip vs na
- **Contexto**: flow tri-estado necesita definicion clara.
- **Drivers**: ambigua sin regla — `skip` y `na` podrian confundirse.
- **Opcion elegida**: `skip` = se omitio deliberadamente con justificacion (requiere `skippedReason` no vacio); `na` = no aplica al work_type actual (ej execute/close en explore).
- **Alternativas**: colapsar en un solo estado — descartado por perder la distincion entre "nadie lo hizo a proposito" y "estructuralmente no va".
- **Consecuencias**: `FlowNode.skippedReason?` solo se llena cuando status es `skip`. Para `na`, el tooltip se deriva estaticamente ("no aplica a work_type=X").

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Screenshots huerfanos en horadric | 11/12 (92%) | 0/12 (0%) | `./commands/dkc-audit-screenshots` |
| Tickets con TC visual sin evidencia cerrados | 3/3 (HOR-005/007/008) | 0 prox tickets | grep + auditoria manual |
| Tickets con FlowDiagram invisible en viewer | 3/3 recientes | 0 | abrir en viewer |
| Latencia close → index consistente | indefinido (manual) | < 10s sync | timing del close |
| Backlog vacio en tickets improvement con execute | 3/3 | captura explicita documentada en prox ticket | revision de HOR-00N proximos |

## Technical reference

### Schema ejemplo de `overrides` en frontmatter del ticket

```yaml
overrides:
  - tc: TC-5
    reason: "prod deploy mañana, revalidacion pendiente"
  - tc: TC-8
    reason: "dependencia bloqueada por ticket aparte HOR-012"
```

### Ejemplo de output de `commands/dkc-reindex`

```
$ ./commands/dkc-reindex
Reindexing project: horadric
  scanned: 47 records (12 tickets, 7 specs, 15 rules, 3 bugs, 10 decisions)
  written: projects/horadric/index.db
  elapsed: 1.8s
  exit: 0
```

### Ejemplo de output de `commands/dkc-audit-screenshots`

```
$ ./commands/dkc-audit-screenshots
Auditing screenshots in project: horadric

HOR-001: 13 fisicos, 13 linkeados, 0 huerfanos ✓
HOR-002: 11 fisicos, 11 linkeados, 0 huerfanos ✓
HOR-005: 8 fisicos, 1 linkeado, 7 huerfanos ✗
  HOR-005-req-02a-screenshots-inline-chips.png (HUERFANO)
  HOR-005-req-02b-lightbox-with-context.png (HUERFANO)
  HOR-005-req-03-draft-intent.png (HUERFANO)
  HOR-005-req-04-draft-visual.png (HUERFANO)
  HOR-005-req-06-07-data-model-mermaid.png (HUERFANO)
  HOR-005-req-08-tabs-draft.png (HUERFANO)
  HOR-005-req-08-tabs-hidden-legacy.png (HUERFANO)
HOR-007: 3 fisicos, 0 linkeados, 3 huerfanos ✗
  ...

Totals: 11 orphans across 3 tickets
```

## Rules discovered

{Se llena durante ejecucion.}

## Bugs found

{Se llena si se descubren.}

## Acceptance checkpoints

- [ ] **Funcional**: todos los scenarios de REQ-IMPROVE-01..09 pasan
- [ ] **Tests**: `npm test` verde en horadric-cube; `flowInference.test.ts` con casos nuevos skip/na + legacy todos pass
- [ ] **NFRs**: auto-reindex < 10s; BackToTop scroll listener debounced; tooltips >= 12px contraste AA
- [ ] **Rules**: DEC-LOCAL-01 y RULE-viewer-assets-context-001 respetadas
- [ ] **Integration**: HOR-001/002 siguen mostrando FlowDiagram con status correctos; bayley y up1 no afectados
- [ ] **Docs**: `DECKARD.md` no cambia; prompts modificados (execute, close) reflejan convencion nueva
- [ ] **Dogfooding**: HOR-009 mismo cierra con las convenciones nuevas (A1 + A2 + A5 end-to-end)
- [ ] **Auditoria**: `commands/dkc-audit-screenshots` reporta 0 huerfanos en horadric post-T11
- [ ] **Regression**: delta vs baseline #1 = 0 failures nuevos
