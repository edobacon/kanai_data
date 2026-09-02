---
id: SPEC-views-visual-nav-teach
project: horadric
ticket: HOR-020
status: done
---

# Mejoras visuales y de navegacion en HC + teach intake/close consultable

# Mejoras visuales y de navegacion en HC + teach intake/close consultable

## Executive summary — lo que estas aprobando

### Que se quiere

5 mejoras agrupadas en 1 ticket (monstruoso) tras observar friccion residual en HC dev post-HOR-018/019:

- **F1**: subir prose width de `max-w-prose` (~75ch) a `max-w-4xl` (~896px) en MarkdownBody. Parrafos legibles + armonia visual con tasks (~1024px). Revierte parcialmente HOR-018 S1.T1 tras evidencia visual del dev.
- **F2**: DET badges informativos en RulesList. Hoy ven solo el ID; arreglar **bug latente H8** (regex en server no captura DET-20+) y ampliar parser para exponer criterio breve via popover Tailwind native.
- **F3**: kanban en TicketsBoard ordena tickets recientes arriba en cada columna (`max(closed_at, modified_at, created_at)` desc).
- **F4**: filtro de actividad por defecto en kanban — 30d activo on load. Selector chips (7d/30d/90d/all). Persistencia decision diferida a S4 (URL vs localStorage).
- **F5**: teach-intake (DET-21) y teach-close (DET-22) **consultables** al user antes de generarlos. Patron igual a DET-18 (skipped con razon). No retroactivo. Toca deckard meta-sistema.

Cambio retroactivo donde aplica (F1, F2, F3, F4 mejoran tickets/specs/teachings existentes sin migracion). F5 solo aplica a tickets post-fecha.

### Decisiones criticas

| Decision | Por que pesa |
|---|---|
| F1 revierte HOR-018 S1.T1 (max-w-prose) → max-w-4xl | Evidencia visual del dev: mismatch entre prose y tasks. F1 evoluciona la decision tras observacion empirica — no es regresion |
| F2 + H8 son interdependientes — hacer ambos en S2 | Si arreglo solo regex (H8) sin criterio, badges siguen sin info. Si agrego criterio sin regex, DET-20+ siguen sin titulo. Se ejecutan juntos |
| F4 persistencia diferida a design (H4 inferred → open) | Decision UX: filtro persistente (configuracion dev) vs efimero (estado sesion). Se evalua en S4 con preview o consulta al dev |
| F5 aplica DESDE fecha del merge no retroactivo | Tickets cerrados con `teachings.intake/close: done` quedan intactos. Tickets `in_progress` post-fecha pueden skip con justificacion |
| Skip design-draft con justificacion (DEC-LOCAL-01) | F1+F2+F3+F4 son cambios visuales acotados (CSS, popover patron comun, sort/filter chips). Gates ⚑ fuertes en S2/S4 cubren validacion visual sin necesidad de preview previo |

### Riesgos principales y como los mitigamos

| Riesgo | Mitigacion |
|---|---|
| F1 prose se siente muy ancho para lectura larga (>1000 chars/parrafo) | Smoke en S1.T2 sobre SPEC-viewer-mvp (caso largo). Si se siente forced, opcion fallback `max-w-3xl` (~768px) |
| F2 popover oculta contenido bajo el badge (overlap mal posicionado) | Posicionamiento Tailwind: `absolute` con offset; activar solo on hover/click con delay; cerrar al click fuera. Tests visuales en S2.T3 |
| F2 ampliar parser de DETs rompe otros consumers | `loadDeterministicTitles` solo se usa para RuleRef.title. Si ampliamos sin tocar la firma existente (agregar nuevos campos), no rompe. Smoke en S2 sobre tickets con DETs |
| F3 sort por recencia oculta tickets `open` viejos importantes | Sort solo afecta dentro de columna. Las columnas siguen agrupando por status. Tickets viejos `open` siguen visibles, solo bajo en la columna |
| F4 filtro 30d default oculta tickets relevantes pero antiguos | Selector "all" siempre disponible. Persistir preferencia si emerge feedback de friccion (S4 decision) |
| F5 cambia contrato global de DET-21/22 — drift entre LLMs ejecutando flujos en paralelo | Aplicacion temporal explicita en las DETs (clausula "skip valido desde fecha X"). Otros LLMs leen CLAUDE.md global; el `dkc-export-rules --global` se ejecuta post-merge para propagar |

### Que NO se hace

- F1: no cambia max-w del contenedor padre (SpecDetail/TicketDetail mantienen max-w-5xl)
- F2: no reescribir RulesList completo — extender o crear `DetBadge.vue` componente nuevo y usarlo desde RulesList para `kind: deterministic`
- F3+F4: no virtualization de la columna (improbable necesidad)
- F5: no retroactivo a tickets cerrados; no cambia `teach-intake.md` y `teach-close.md` outputs (solo agrega pregunta al inicio del step)
- F5: no skip por default — sigue siendo obligatorio salvo skip explicito del dev

### Tamano estimado

| Item | Valor |
|---|---|
| Sessions | 5 (S1 T1 auto · S2 T2 ⚑ fuerte · S3 T1 auto · S4 T2 ⚑ fuerte · S5 T2 ⚑ fuerte) |
| Horas estimadas | 4-6h efectivas |
| Sessions mas riesgosas | S2 (F2 backend + frontend + popover UX) y S5 (F5 meta-sistema cambia DET-21/22) |
| Archivos tocados | ~8 en horadric-cube (MarkdownBody, RulesList, DetBadge nuevo, TicketsBoard, TicketFilters, rules.ts server, posiblemente client.ts) + ~4 en deckard (DET-21, DET-22, teach-intake.md, request-close.md) |
| Repos tocados | 2 (`horadric-cube` y `deckard`) |

### Como vas a saber que funciona

- Abris cualquier spec/ticket en HC → parrafos del MarkdownBody se ven mas anchos (cercano al ancho de las tasks/cards)
- Hover/click sobre un DET badge (ej. `DET-21`) → popover muestra titulo + criterio breve. Funciona para DET-1 a DET-24 (no solo legacy)
- Abris el kanban → tickets recientes arriba en cada columna. Filtro "30d" activo por default. Selector visible permite cambiar a 7d/90d/all
- Creas un ticket nuevo de prueba con work_type `implement` → al llegar a teach-intake step, el LLM pregunta "¿generar teach-intake? (default: si)" con opcion skip + razon
- Tickets cerrados (HOR-018, HOR-019) siguen con `teachings: done` y teach-intake/close visibles en HC

## Purpose

Reducir friccion visual y de navegacion en Horadric Cube tras evidencia empirica post-HOR-018/019. Auditoria del dev identifico 5 puntos: (1) mismatch prose vs tasks, (2) DET badges sin info, (3) kanban no priorizado por recencia, (4) sin filtro de actividad reciente, (5) DETs de teach obligatorias incluso para tickets cortos. Audiencia: dev humano que navega el kanban diario + revisa tickets/specs en HC.

## Analisis de mejora

### Estado actual

- F1: `MarkdownBody.vue:24` con `max-w-prose` (HOR-018 S1.T1). Parrafos ~75ch dentro de wrapper max-w-5xl crea borde lateral grande
- F2: `RulesList.vue:64-86` rendea DET badges con `title` HTML plano. `server/deckard/rules.ts:100` parsea solo title con regex incompleto (H8: no captura DET-20+)
- F3: `TicketsBoard.vue:84-95` agrupa por status sin sort dentro de columna — ordenado por orden de retorno del backend (probablemente por id ascendente, los viejos arriba)
- F4: `TicketsBoard.vue` no tiene filtro por fecha. Todos los tickets visibles segun filtros existentes (module, workType, tag, showArchived)
- F5: `prompts/deterministic-rules.md` DET-21 y DET-22 son BLOQUEANTES sin opcion de skip. `prompts/steps/teach-intake.md` y `request-close.md` invocan los steps sin preguntar

### Problema / oportunidad

Tras HOR-018/019, el viewer se siente mas limpio pero quedan friccion concretas. El user pidio agrupar las 5 en 1 ticket (vs 5 granulares) para minimizar overhead DKC.

### Estado deseado

- F1: parrafos ~896px coherentes con tasks
- F2: hover/click sobre badge muestra popover con titulo + criterio + link
- F3: tickets recientes arriba en cada columna
- F4: filtro 30d activo on load, selector visible para cambiar
- F5: LLM pregunta antes de teach-intake/close, dev puede skip con razon

### Alcance propuesto

**Se toca**:
- `horadric-cube/src/components/shell/MarkdownBody.vue` (F1)
- `horadric-cube/src/components/tickets/RulesList.vue` (F2 wire)
- `horadric-cube/src/components/tickets/DetBadge.vue` (F2 nuevo)
- `horadric-cube/server/deckard/rules.ts` (F2 + H8 — regex + parser ampliado)
- Posiblemente `horadric-cube/shared/types.ts` (F2 — ampliar RuleRef con `description?`)
- `horadric-cube/src/views/TicketsBoard.vue` (F3 + F4)
- `horadric-cube/src/components/tickets/TicketFilters.vue` (F4 — extender con dateRange)
- `deckard/prompts/deterministic-rules.md` (F5 — DET-21 + DET-22 modificadas)
- `deckard/prompts/steps/teach-intake.md` (F5 — pregunta inicial)
- `deckard/prompts/steps/request-close.md` (F5 — pregunta antes de teach-close)

**NO se toca**:
- Contenedor padre de SpecDetail/TicketDetail (max-w-5xl mantiene)
- Template del ticket (frontmatter `teachings` ya soporta `skipped`)
- Output de teach-intake.md / teach-close.md (estructura intacta)

### Complejidad estimada

**Media-alta** — 5 items independientes con riesgos heterogeneos. F2 es la session mas pesada (backend + frontend + popover). F5 toca meta-sistema. Sin draft (skipped), gates ⚑ fuertes en S2/S4/S5 son criticos.

## Requirements

### REQ-IMPROVE-01: Prose width subido a max-w-4xl en MarkdownBody

> **Que cambia**: cuando abris un ticket o spec en HC, los parrafos largos del markdown ocupan ~896px de ancho (vs 75ch ~600px actual), acercandose visualmente a las tasks/cards que viven en el mismo contenedor.
> **Por que**: hoy queda un borde lateral grande que rompe la armonia visual; HOR-018 S1.T1 acoto a prose pero la evidencia empirica del dev mostro que se siente forced.

El sistema MUST aplicar `max-w-4xl` (~896px) a parrafos renderizados por `MarkdownBody.vue` en lugar de `max-w-prose` (~75ch). Tablas mantienen `display: block` + `overflow-x-auto` (HOR-018).

**Actor**: dev humano (al leer cualquier markdown en HC) · MarkdownBody (todos los consumers)
**Layers**: frontend (components)

<details><summary>Scenarios de validacion</summary>

#### Scenario: parrafo largo en tab Requirements
- **GIVEN** SPEC-viewer-mvp en HC dev post-S1
- **WHEN** el dev navega a tab Requirements
- **THEN** parrafos ocupan ~896px max (no ~600px)
- **AND** no exceden el contenedor padre (max-w-5xl = 1024px)

#### Scenario: regresion en TicketDetail
- **GIVEN** HOR-005 abierto en HC dev
- **WHEN** el dev navega a tab Request
- **THEN** parrafos se ven mas anchos que antes pero sin truncar contenido

</details>

### REQ-IMPROVE-02: DET badges con popover informativo + arreglo H8

> **Que cambia**: hover o click sobre un badge de DET (ej. `DET-21`) en RulesList muestra un popover con titulo + criterio breve + link a la regla. Funciona para DET-1 a DET-24 (no solo las legacy 1-19).
> **Por que**: hoy el badge solo muestra el ID; el `title` HTML plano no provee suficiente info. Ademas DETs >19 ni siquiera tienen titulo cargado por bug latente del regex (H8).

El sistema MUST:
1. Ampliar `loadDeterministicTitles` (`server/deckard/rules.ts`) para soportar AMBOS formatos: `## N. titulo` (DET-1..19) y `### DET-N — titulo` (DET-20+)
2. Ampliar el parser para extraer el criterio breve de cada DET (primera oracion despues del header)
3. Exponer descripcion via `RuleRef.description?: string` o endpoint `/api/deterministic/:id` (decision en S2)
4. Crear `DetBadge.vue` componente nuevo con popover Tailwind native (titulo + criterio + link)
5. Usar `DetBadge` en `RulesList.vue` para `kind: deterministic` (mantener tooltip plano para `project` rules)

**Actor**: dev humano (al revisar rules en tickets/specs)
**Layers**: backend (server/deckard/rules), frontend (components/tickets)

<details><summary>Scenarios de validacion</summary>

#### Scenario: DET-21 badge muestra popover
- **GIVEN** HC dev post-S2; ticket HOR-018 abierto (tiene DET-21 en rules)
- **WHEN** hover sobre badge `DET-21`
- **THEN** aparece popover con "DET-21 — Teach-intake obligatorio antes de design-{tipo}" + 1-2 lineas de criterio + link a `prompts/deterministic-rules.md`

#### Scenario: DET-24 (post-DET-20) tambien tiene titulo
- **GIVEN** post-S2 con regex ampliado
- **WHEN** se renderea cualquier ticket con DET-24 en rules
- **THEN** el badge muestra `DET-24` (no `DET-24 — null`)
- **AND** popover muestra "DET-24 — REQ format human: callout obligatorio en specs futuros"

#### Scenario: cerrar popover al click fuera
- **GIVEN** popover abierto sobre DET-21
- **WHEN** click en cualquier parte fuera del popover
- **THEN** popover se cierra

</details>

### REQ-IMPROVE-03: Kanban sort por recencia dentro de columna

> **Que cambia**: en TicketsBoard kanban view, los tickets dentro de cada columna se ordenan por actividad reciente — tickets cerrados/modificados/creados mas recientemente arriba.
> **Por que**: hoy el orden parece arbitrario (probable orden de retorno del backend); el dev debe scroll para encontrar tickets activos vs historicos.

El sistema MUST ordenar `items` de cada `KanbanColumn` por `max(closed_at, modified_at, created_at)` en orden descendente.

**Actor**: dev humano (al usar el kanban)
**Layers**: frontend (views/TicketsBoard)

<details><summary>Scenarios de validacion</summary>

#### Scenario: columna Cerrados ordenada
- **GIVEN** kanban abierto en proyecto horadric con >5 tickets cerrados
- **WHEN** se renderea la columna `Cerrados`
- **THEN** HOR-019 y HOR-018 (cerrados hoy) arriba; HOR-001..HOR-010 (cerrados hace dias) abajo

#### Scenario: empate por fechas iguales
- **GIVEN** dos tickets cerrados el mismo dia
- **WHEN** se ordenan
- **THEN** sin garantia de orden secundario (no critico — el sort es stable, mantiene orden de entrada)

</details>

### REQ-IMPROVE-04: Filtro de actividad por defecto en kanban (30d)

> **Que cambia**: al abrir TicketsBoard, solo se muestran tickets con actividad en los ultimos 30 dias. Un selector visible permite cambiar a 7d/90d/all.
> **Por que**: la columna `Cerrados` acumula historico — la actividad reciente queda enterrada bajo tickets antiguos.

El sistema MUST:
1. Agregar filtro `dateRange` al pipeline de `filtered` en TicketsBoard
2. Default `30d` al cargar la pagina
3. UI: chips horizontales `7d / 30d / 90d / all` sobre el kanban (o extender TicketFilters)
4. Tickets fuera del rango ocultos en kanban y grid views
5. Persistencia: diferida a S4 (URL `?range=30d` vs localStorage vs efimero) — decision empirica del dev

**Actor**: dev humano (al usar el kanban dia a dia)
**Layers**: frontend (views/TicketsBoard, components/tickets/TicketFilters)

<details><summary>Scenarios de validacion</summary>

#### Scenario: filtro 30d activo por default
- **GIVEN** HC dev post-S4 cargado en kanban
- **WHEN** se renderea la pagina
- **THEN** chip `30d` activo (highlight ambar); tickets con actividad >30d ocultos

#### Scenario: cambiar a all muestra todos
- **GIVEN** mismo estado anterior
- **WHEN** click en chip `all`
- **THEN** todos los tickets visibles (incluido HOR-001..HOR-010 historicos)

</details>

### REQ-IMPROVE-05: Teach intake/close consultable al user

> **Que cambia**: antes de generar `tickets/{id}.teach/teach-intake.md` (DET-21) o `teach-close.md` (DET-22), el LLM pregunta al dev si producirlo. Si dev responde "skip" con razon, se documenta y se omite.
> **Por que**: hoy DET-21/22 son obligatorias incluso para tickets cortos donde el overhead no se justifica. Patron de skip ya existe (DET-18) — F5 lo replica.

El sistema MUST:
1. Modificar DET-21 y DET-22 en `prompts/deterministic-rules.md` agregando clausula: "skip valido si dev confirma explicitamente con razon documentada"
2. Modificar `prompts/steps/teach-intake.md` para preguntar al inicio: "¿generar teach-intake para este ticket? (default: si)"
3. Modificar `prompts/steps/request-close.md` (sub-paso teach-close) para preguntar antes
4. Si dev responde skip: documentar razon en frontmatter del ticket `teachings.intake: skipped` o `teachings.close: skipped` con linea de justificacion en el body
5. Regenerar global rules con `commands/dkc-export-rules --global`
6. Aplicacion temporal: a partir de fecha del merge; no retroactivo

**Actor**: LLM al ejecutar workflow · dev humano (al decidir)
**Layers**: meta (prompts, deterministic-rules)

<details><summary>Scenarios de validacion</summary>

#### Scenario: ticket nuevo de prueba con teach-intake skip
- **GIVEN** S5 mergeado; ticket nuevo work_type `implement` post-intake-explore
- **WHEN** LLM llega al step teach-intake
- **THEN** pregunta "¿generar teach-intake? (si/skip+razon)"
- **AND** si dev responde "skip: ticket de tipo trivial, no requiere material educativo"
- **THEN** frontmatter `teachings.intake: skipped`; no se crea `.teach/teach-intake.md`; design-{tipo} se desbloquea con justificacion

#### Scenario: ticket existente con teachings: done sigue valido
- **GIVEN** HOR-018, HOR-019 con teachings.intake/close: done
- **WHEN** S5 aplica
- **THEN** sus frontmatter NO se modifican; HC sigue mostrando "teach presente"

</details>

### REQ-PRESERVE-01: TicketDetail y SpecDetail tabs no se rompen post-cambios

> **Que cambia**: nada visible en TicketDetail. F1 toca MarkdownBody que TicketDetail consume — debe seguir renderando igual.
> **Por que**: HOR-018 dejo TicketDetail funcionando con prose acotado; F1 sube a max-w-4xl que solo cambia ancho, no comportamiento.

El sistema MUST preservar comportamiento de TicketDetail y SpecDetail post-cambios. Smoke test sobre HOR-005, HOR-013, HOR-019.

**Actor**: dev humano (al abrir cualquier ticket post-cambios)
**Layers**: frontend (views, components)

<details><summary>Scenarios de validacion</summary>

#### Scenario: HOR-005 mantiene tabs Draft + dkc:* blocks
- **GIVEN** HC dev post-S1+S2; HOR-005 abierto
- **WHEN** se navega a tabs (Draft intent, visual, data model, Teaching)
- **THEN** renderean sin error; dkc:* blocks visibles

</details>

### REQ-PRESERVE-02: Tickets cerrados pre-fecha X mantienen teachings status

> **Que cambia**: nada en los tickets cerrados. F5 no migra retroactivamente.
> **Por que**: F5 cambia el contrato a partir del merge. Tickets ya cerrados con `teachings.intake/close: done` son evidencia historica intacta.

El sistema MUST preservar frontmatter de tickets cerrados pre-fecha (HOR-018, HOR-019, HOR-013, HOR-014, etc.).

**Actor**: HC viewer · dev historico
**Layers**: meta (templates, prompts)

<details><summary>Scenarios de validacion</summary>

#### Scenario: HOR-018 frontmatter intacto
- **GIVEN** S5 mergeado
- **WHEN** se lee `cat projects/horadric/tickets/HOR-018.md | head -20`
- **THEN** `teachings: { intake: done, close: done }` intacto; sin modificaciones automaticas

</details>

## Changes

### Modified: `horadric-cube/src/components/shell/MarkdownBody.vue` (F1)

| Aspecto | Antes | Despues | Por que |
|---|---|---|---|
| Wrapper class | `max-w-prose` (~600px) | `max-w-4xl` (~896px) | Armonia con tasks/cards en max-w-5xl padre |

### Modified: `horadric-cube/server/deckard/rules.ts` (F2 + H8)

| Aspecto | Antes | Despues | Por que |
|---|---|---|---|
| Regex | `^##\s+(\d+)\.\s+(.+?)$` | Soporta ambos formatos: `## N. titulo` y `### DET-N — titulo` | H8: capturar DETs 1-19 + 20+ |
| Parser scope | Solo title | title + criterio breve (1-2 lineas) + aplicacion temporal | F2: badge necesita info descriptiva |
| Cache | `Map<number, string>` | `Map<number, DeterministicMeta>` con campos: title, criterion, applicationTemporal, anchor | F2: shape ampliado |

### Added: `horadric-cube/src/components/tickets/DetBadge.vue` (F2)

| Field | Value | Purpose |
|---|---|---|
| Props | `rule: RuleRef` + `meta?: DeterministicMeta` | Badge para `kind: deterministic` con popover |
| Renderea | Badge id + popover (titulo + criterion + link a deterministic-rules.md#anchor) | UI rica reemplazando tooltip plano |
| Activacion | Hover (delay 300ms) + click toggle. Cerrar al click fuera | Patron comun popover |

### Modified: `horadric-cube/src/components/tickets/RulesList.vue` (F2 wire)

| Aspecto | Antes | Despues | Por que |
|---|---|---|---|
| Render DET | `<span :title=tooltip>...{{rule.id}}</span>` | `<DetBadge :rule :meta=metaFor(rule.id) />` | Usar componente nuevo para DETs |

### Modified: `horadric-cube/src/views/TicketsBoard.vue` (F3 + F4)

| Aspecto | Antes | Despues | Por que |
|---|---|---|---|
| filtered | Solo module/workType/tag | + dateRange (`30d` default) | F4 filtro de actividad |
| columns items | `.filter()` sin sort | `.filter().sort(byRecencyDesc)` | F3 sort por recencia |
| Selector UI | (no existe) | Chips 7d/30d/90d/all sobre kanban (en TicketFilters o panel propio) | F4 UI |

### Modified (deckard): `prompts/deterministic-rules.md` (F5)

| Aspecto | Antes | Despues | Por que |
|---|---|---|---|
| DET-21 criterio | Bloqueante sin opcion | Bloqueante salvo skip con razon (patron DET-18) | F5 |
| DET-22 criterio | Bloqueante sin opcion | Idem | F5 |
| Aplicacion temporal | Existing | + "skip habilitado desde fecha del merge; no retroactivo" | F5 |

### Modified (deckard): `prompts/steps/teach-intake.md` y `request-close.md` (F5)

Pregunta inicial: "¿generar teach-{intake|close} para este ticket? (default: si)". Si dev responde skip, documentar razon y actualizar frontmatter.

## Tasks

### Session 1 — F1: prose width max-w-4xl `[tipo: auto] [tier: T1]`

Objetivo: subir prose width en MarkdownBody.vue sin regresion en otros consumers.

| # | Task | source_ref | agent | depends_on | files | validation | rollback | rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Editar `MarkdownBody.vue:24` cambiando `max-w-prose` por `max-w-4xl`. Comentario inline justificando que F1 evoluciona HOR-018 S1.T1 tras evidencia visual | REQ-IMPROVE-01 | developer | — | `src/components/shell/MarkdownBody.vue` | Type-check verde; smoke visual en SPEC-viewer-mvp + HOR-005 | `git revert` | DET-2, DET-7, DET-11 | pending | 1 |
| S1.T2 | Smoke textual: grep confirma `max-w-4xl` aplicado; smoke visual en HC dev (1 spec + 1 ticket) | REQ-PRESERVE-01 | reviewer | S1.T1 | — | Cambio visible coherente con tasks; sin truncar | (no aplica) | DET-7, DET-13 | pending | 1 |
| **S1.GATE** | Gate session 1 — tier T1 + Quality review DET-23 light | — | reviewer | S1.T2 | — | T1 ok; DET-23 dim 7 (claridad), dim 8 (a11y — parrafos siguen accesibles) | (no aplica) | DET-13, DET-20, DET-23 | pending | 1 |

### Session 2 — F2: DET badges informativos + H8 fix `[tipo: ⚑ fuerte] [tier: T2]`

Objetivo: arreglar regex (H8) + ampliar parser + crear DetBadge.vue + integrar en RulesList.

| # | Task | source_ref | agent | depends_on | files | validation | rollback | rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Ampliar regex en `loadDeterministicTitles` para soportar ambos formatos (`## N. titulo` + `### DET-N — titulo`); ampliar parser para extraer criterio breve + aplicacion temporal. Cambiar `Map<number, string>` a `Map<number, DeterministicMeta>` | REQ-IMPROVE-02 (H8 fix) | developer | S1.GATE | `server/deckard/rules.ts`, posiblemente `shared/types.ts` | Unit test: `loadDeterministicTitles` carga DET-1 a DET-24 con titulo + criterio. Cache invalidable via `clearDeterministicTitlesCache()` | `git revert` | DET-2, DET-7, DET-11 | pending | 2 |
| S2.T2 | Exponer metadata de DET via `RuleRef.description?` o endpoint `/api/deterministic/:id`. Decision en S2.T1 segun el alcance del payload (si crece, separar endpoint) | REQ-IMPROVE-02 | developer | S2.T1 | `server/deckard/rules.ts`, `src/api/client.ts`, posiblemente `server/routes/` | Endpoint o ampliacion validable; type-check verde | `git revert` | DET-2, DET-7 | pending | 2 |
| S2.T3 | Crear `src/components/tickets/DetBadge.vue` componente nuevo. Props: `rule: RuleRef`, `meta?: DeterministicMeta`. Renderea badge + popover Tailwind native (hover 300ms delay + click toggle; cerrar click fuera) | REQ-IMPROVE-02 | developer | S2.T2 | `src/components/tickets/DetBadge.vue` (nuevo) | Popover renderea con info legible; sin overlap con contenido bajo; cerrado por default | `git revert` | DET-2, DET-7 | pending | 2 |
| S2.T4 | Integrar `DetBadge` en `RulesList.vue` para `kind: deterministic` (mantener tooltip plano para `project` rules) | REQ-IMPROVE-02 | developer | S2.T3 | `src/components/tickets/RulesList.vue` | Smoke en HOR-018 (rules con DET-21 + DET-24): popover muestra info correcta para ambas DETs | `git revert` | DET-2, DET-7 | pending | 2 |
| **S2.GATE** | Gate session 2 — tier T2 + Quality review DET-23 standard | — | reviewer | S2.T4 | — | T2 ok; DET-23 dim 1-7 pass; dim 8 a11y: popover keyboard nav + aria-describedby. **⚑ fuerte**: dev valida visual en HC dev | (no aplica) | DET-13, DET-14, DET-20, DET-23 | pending | 2 |

### Session 3 — F3: kanban sort por recencia `[tipo: auto] [tier: T1]`

Objetivo: agregar sort por recencia dentro de cada columna en TicketsBoard.

| # | Task | source_ref | agent | depends_on | files | validation | rollback | rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Editar `TicketsBoard.vue:84` agregando `.sort(byRecencyDesc)` a `items` de cada columna. Funcion helper `byRecencyDesc(a, b)` = compare `max(closed_at, modified_at, created_at)` desc. Asumir formato ISO 8601 string compare seguro | REQ-IMPROVE-03 | developer | S2.GATE | `src/views/TicketsBoard.vue` | Smoke en kanban horadric: HOR-020, HOR-019, HOR-018 arriba en columnas | `git revert` | DET-2, DET-7, DET-16 | pending | 3 |
| **S3.GATE** | Gate session 3 — tier T1 + Quality review DET-23 light | — | reviewer | S3.T1 | — | T1 ok; smoke visual confirma orden por recencia | (no aplica) | DET-13, DET-20, DET-23 | pending | 3 |

### Session 4 — F4: filtro 30d default en kanban `[tipo: ⚑ fuerte] [tier: T2]`

Objetivo: filtro de actividad reciente con chips y default 30d.

| # | Task | source_ref | agent | depends_on | files | validation | rollback | rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Agregar `dateRange` al state de TicketsBoard (`ref<'7d'\|'30d'\|'90d'\|'all'>` default `'30d'`). Computed `cutoff` que devuelve epoch ms del rango. Extender `filtered` para filtrar por `max(...) >= cutoff` (o `all` skip) | REQ-IMPROVE-04 | developer | S3.GATE | `src/views/TicketsBoard.vue` | Filtro logico funciona en computed; type-check verde | `git revert` | DET-2, DET-7 | pending | 4 |
| S4.T2 | UI chips horizontales `7d / 30d / 90d / all` arriba del kanban (en TicketFilters extendido o componente propio). Chip activo con highlight ambar | REQ-IMPROVE-04 | developer | S4.T1 | `src/views/TicketsBoard.vue`, posiblemente `src/components/tickets/TicketFilters.vue` | Chips visibles, clickeables; activacion cambia el filtro | `git revert` | DET-2, DET-7 | pending | 4 |
| S4.T3 | Decision sobre persistencia (H4 open). Opciones: URL `?range=30d`, localStorage, efimero. Implementar segun decision. Default sigue siendo 30d | REQ-IMPROVE-04 | developer | S4.T2 | mismo | Reload (F5 navegador) mantiene filtro o resetea segun decision; comportamiento esperado documentado | `git revert` | DET-2, DET-7, DET-16 | pending | 4 |
| **S4.GATE** | Gate session 4 — tier T2 + Quality review DET-23 standard. **⚑ fuerte**: dev valida UX en HC dev | — | reviewer | S4.T3 | — | T2 ok; DET-23 dim 1-7 pass; dev confirma persistencia comoda | (no aplica) | DET-13, DET-14, DET-20, DET-23 | pending | 4 |

### Session 5 — F5: teach intake/close consultable `[tipo: ⚑ fuerte] [tier: T2]`

Objetivo: cambiar DET-21 + DET-22 para permitir skip con justificacion, modificar steps para preguntar al user.

| # | Task | source_ref | agent | depends_on | files | validation | rollback | rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Modificar DET-21 y DET-22 en `prompts/deterministic-rules.md`: agregar clausula "skip valido si dev confirma explicitamente con razon documentada"; agregar entrada en `Aplicacion temporal`: "skip habilitado desde fecha del merge (no retroactivo)" | REQ-IMPROVE-05 | developer | S4.GATE | `deckard/prompts/deterministic-rules.md` | Wording coherente con DET-18 precedente; type-check no aplica (markdown) | `git revert` | DET-2, DET-16 | pending | 5 |
| S5.T2 | Modificar `prompts/steps/teach-intake.md`: agregar paso 0 (antes del paso 1) que pregunta al dev "¿generar teach-intake?". Si dev responde skip + razon, actualizar `teachings.intake: skipped` en frontmatter del ticket y documentar razon. Sin esto, continuar flujo normal | REQ-IMPROVE-05 | developer | S5.T1 | `deckard/prompts/steps/teach-intake.md` | Pregunta clara con default `si`; opcion skip con prompt de razon | `git revert` | DET-2, DET-7, DET-16 | pending | 5 |
| S5.T3 | Modificar `prompts/steps/request-close.md` sub-paso teach-close: misma logica de pregunta antes de invocar teach-close | REQ-IMPROVE-05 | developer | S5.T2 | `deckard/prompts/steps/request-close.md` | Pregunta coherente con S5.T2; comportamiento default si | `git revert` | DET-2, DET-7 | pending | 5 |
| S5.T4 | Regenerar global rules: `./commands/dkc-export-rules --global` — verificar que DET-21/22 actualizadas aparecen en `~/.claude/CLAUDE.md` con clausula nueva | REQ-IMPROVE-05 | developer | S5.T3 | `~/.claude/CLAUDE.md` (auto-generado) | DET-21/22 con wording actualizado visible en CLAUDE.md global | (no aplica) | DET-16 | pending | 5 |
| S5.T5 | Smoke regresion: leer HOR-018, HOR-019 (tickets cerrados con teachings: done). Frontmatter intacto. HC sigue mostrando "teach presente" | REQ-PRESERVE-02 | reviewer | S5.T4 | — | HOR-018/019 frontmatter sin cambios; HC tab Teaching renderea igual | (no aplica) | DET-7, DET-13 | pending | 5 |
| **S5.GATE** | Gate session 5 — tier T2 + Quality review DET-23 standard. **⚑ fuerte**: dev valida el wording de las DETs antes de promover a global | — | reviewer | S5.T5 | — | T2 ok; DET-23 dim 6-7 pass (mantenibilidad, claridad); dev aprueba | (no aplica) | DET-13, DET-14, DET-20, DET-23 | pending | 5 |

## Constraints

- **DET-7** (regression): REQ-PRESERVE-01 (TicketDetail/SpecDetail intactos) y REQ-PRESERVE-02 (tickets cerrados con teachings: done)
- **DET-13** (cierre con evidencia): smoke tests visuales en gates ⚑ fuertes
- **DET-16** (propagacion): F5 toca deterministic-rules.md → propaga a CLAUDE.md global via export
- **DET-18** (draft aprobado): skip documentado en DEC-LOCAL-01
- **DET-20** (sessions con gate): 5 sessions con S{N}.GATE
- **DET-21 + DET-22** (teach obligatorio): F5 las modifica para habilitar skip
- **DET-23** (quality review): cada gate con review acorde
- **DET-24** (REQ format human): aplicado a este spec
- **RULE-viewer-polling-001**: aplica a F4 si filter afecta endpoint (no afecta — filter es client)
- **RULE-viewer-assets-context-001**: aplica a F2 (popover con criterio = contexto narrativo)
- **RULE-server-frontmatter-legacy-001**: frontmatter de teachings es backwards compatible

## Dependencies

| Dependency | Type | Description | Risk |
|---|---|---|---|
| `loadDeterministicTitles` con cache | internal | F2 modifica el cache shape — invalidar via `clearDeterministicTitlesCache()` en cualquier consumer | bajo |
| `ticket.modified_at`, `closed_at`, `created_at` en payload | internal (server) | F3 + F4 dependen de estos campos. Verificar shape en `TicketSummary` antes de S3 | medio (si no estan, agregar en backend) |
| `dkc-export-rules` para global rules | internal | F5 depende de este comando para propagar DETs a CLAUDE.md | bajo (precedente HOR-019) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| F2 popover oculta contenido (overlap mal posicionado) | Medium | Medium | Posicionamiento Tailwind con offset; click fuera cierra; smoke en S2.GATE |
| F2 parser ampliado rompe consumers de `RuleRef.title` | Low | Medium | Mantener firma de `title` intacta; agregar campos nuevos opcionales |
| F4 filtro 30d esconde tickets relevantes pero antiguos | Low | Low | Selector `all` siempre accesible; persistir preferencia si emerge friccion |
| F5 cambio de DET-21/22 confunde a otros LLMs ejecutando flujos en paralelo | Low | Medium | Aplicacion temporal explicita en las DETs; CLAUDE.md global regenerado tras merge |
| `ticket.modified_at` no existe en TicketSummary | Medium | High | Verificar shape en S3.T1 ANTES de implementar sort; si falta, agregar en backend antes de continuar |

## Open questions

- **H4 (persistencia filtro F4)**: diferida a S4.T3. Decision empirica del dev al ejecutar — si se siente persistente (configuracion diaria), URL/localStorage. Si efimero, ref local.

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Skip design-draft (DET-18 excepcion)

- **Contexto**: HOR-020 tiene `creates_visual: true` por F1+F2+F3+F4. DET-18 obligaria preview HTML.
- **Drivers**: cambios acotados (F1 CSS, F2 popover patron comun, F3+F4 sort/filter); gates ⚑ fuertes en S2/S4 cubren validacion visual; precedente HOR-019 DEC-LOCAL-03 (skip valido cuando cambios estructurales sin UX nueva radical).
- **Opcion elegida**: skip design-draft con DEC documentada en ticket markdown + spec.
- **Alternativas descartadas**:
  - Draft completo con 4 previews (F1+F2+F3+F4) — ~1h trabajo, valor marginal sobre los gates ⚑ fuertes
  - Draft focalizado en F2 — 20min, pero el popover es patron suficientemente comun que el dev puede aprobar en S2.GATE
- **Consecuencias**: sin tickets/HOR-020.draft/. Riesgo controlado por S2 y S4 ⚑ fuertes.
- **Session**: design-improvement (2026-05-13)

### DEC-LOCAL-02: F2 + H8 fix juntos en S2 (no separar)

- **Contexto**: H8 (regex incompleto) es bug latente independiente de F2 (badges informativos). Tecnicamente podria ser bug fix separado.
- **Drivers**: ambos tocan `server/deckard/rules.ts`; arreglar H8 sin F2 no aporta valor visible (titulos siguen invisibles porque `RulesList.vue` solo usa `rule.title` HTML plano); arreglar F2 sin H8 deja DETs >19 sin info.
- **Opcion elegida**: ejecutar ambos en S2 (T1+T2 cubren ambos).
- **Alternativas descartadas**: sub-ticket separado HOR-021 para H8 — overhead innecesario.
- **Consecuencias**: S2 mas grande (~4 tasks) pero cohesivo.
- **Session**: design-improvement (2026-05-13)

## Acceptance checkpoints

- [ ] **Funcional**: F1, F2, F3, F4, F5 verificados en HC dev + workflow DKC
- [ ] **Tests**: smoke tests visuales en gates ⚑ fuertes (S2, S4, S5); unit test para `loadDeterministicTitles` (S2.T1)
- [ ] **NFRs**: no aplica
- [ ] **Rules**: DET-7, DET-13, DET-16, DET-23 cumplidas; DET-21/22 modificadas conforme F5
- [ ] **Integration**: TicketDetail intacto (REQ-PRESERVE-01); tickets cerrados intactos (REQ-PRESERVE-02)
- [ ] **Docs**: F5 actualizada en deterministic-rules.md + exportada a CLAUDE.md global
- [ ] **Quality review (DET-23)** completado en cada gate

## Archiving

Cuando este spec deje de ser fuente de verdad: `/dkc-archive-spec SPEC-views-visual-nav-teach "{razon}"`.
