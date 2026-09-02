---
id: SPEC-views-spec-render-comodo
project: horadric
ticket: HOR-018
status: done
---

# Render comodo de specs en HC: prose width, tabs en SpecDetail, DKC blocks, presentacion hibrida de tasks

# Render comodo de specs en HC: prose width, tabs en SpecDetail, DKC blocks, presentacion hibrida de tasks

## Executive summary — lo que estas aprobando

### Que se quiere

Que abrir un spec en HC sea comodo de leer y de aprobar. 4 fixes coordinados:

- **F1**: parrafos a ~75ch (no 200), tablas en contenedor con overflow horizontal cuando exceden viewport
- **F2**: tabs en SpecDetail (Resumen / Requirements / Tasks / Decisiones / Riesgos / Referencia) — patron portado de TicketDetail (HOR-005)
- **F4**: bloques `dkc:hypothesis-map / decision-matrix / learning-path` + `mermaid` se renderizan en specs (hoy aparecen como `<div>` vacios). Mermaid YA esta instalada (H4 refuted en intake) — solo importar
- **F5**: reemplazar `TasksTable.vue` por **alternativa D** (tree colapsable por session + detalle card al expandir task). Componente nuevo: `SpecSessionTree.vue`. Decision cerrada en design-draft v2 ([preview-D-hybrid.html](../tickets/HOR-018.draft/preview-D-hybrid.html))

Cambio retroactivo a TODOS los specs existentes (sin migracion de datos — la nueva presentacion lee los datos planos del parser actual). Toca repo `horadric-cube`.

### Decisiones criticas

| Decision | Por que pesa |
|---|---|
| Alternativa D (tree B + detalle C) para F5 (DEC-DRAFT-01) | Combina overview compacto (escaneo rapido del plan) con profundidad on-demand (review por task). Otras 3 alternativas evaluadas en design-draft y descartadas |
| Extraer mounting logic de `SectionTeachings.vue` a composable reusable | Permite reusar en SpecDetail sin duplicar codigo. Riesgo controlado: refactor sobre componente en uso por TicketDetail — verificacion de regresion obligatoria en S4 |
| F4 simplificado: mermaid ya instalada (no install, no lazy load nuevo) | H4 refuted en intake (mermaid 11.14.0 en package.json). Reduce tier de S4 de T2 a T1 |
| Aplicar nueva presentacion retroactivo a specs viejos (DEC-DRAFT-02) | Cambio visual sobre datos planos del parser actual — sin breaking change. Specs viejos se benefician automaticamente |

### Riesgos principales y como los mitigamos

| Riesgo | Mitigacion |
|---|---|
| Refactor de `SectionTeachings.vue` rompe TicketDetail | S4 tier T1 con smoke test obligatorio sobre HOR-005 (ticket que usa los tabs Draft con dkc:* blocks). Si falla, revertir y aislar el composable sin tocar el componente original |
| `SpecSessionTree.vue` nuevo introduce regresion en specs piloto largos (SPEC-viewer-mvp con muchas sessions) | S3 incluye smoke test sobre 2 specs piloto. Gate ⚑ fuerte — dev aprueba visual antes de cerrar la session |
| Mermaid render falla en specs con diagramas complejos | F4 importa mermaid igual que TicketDetail (codigo ya probado). Si emerge issue, backlog `could`: lazy load deferred |
| Prose `max-w-prose` rompe tablas anchas en mobile | F1 envuelve tablas con `overflow-x-auto` — scroll horizontal preserva legibilidad sin truncar |

### Que NO se hace

- **No migracion retroactiva de specs**: aplicacion automatica por re-render, sin tocar el markdown
- **No TOC lateral (F3 fuera de alcance)**: las tabs solas resuelven la navegacion; F3 queda en backlog `could`
- **No nuevas deps**: mermaid ya esta instalada; sin agregar libraries
- **No cambios en parser de spec**: backend sigue produciendo `tables` planas; la presentacion cambia solo en frontend
- **No cambios en TicketDetail**: solo refactor de la logica de mounting de `dkc:*` blocks (composable extraido), TicketDetail sigue usandolo igual via shim

### Tamano estimado

| Item | Valor |
|---|---|
| Sessions | 4 (S1 F1 T1 + S2 F2 T2 ⚑ fuerte + S3 F5 T2 ⚑ fuerte + S4 F4 T1) |
| Horas estimadas | 4-6h efectivas |
| Sessions mas riesgosas | S2 y S3 (gates ⚑ fuertes — cambios UX visibles) |
| Archivos tocados | ~5-7 en horadric-cube: MarkdownBody.vue, SpecDetail.vue, SectionTeachings.vue (refactor), nuevo composable, nuevo SpecSessionTree.vue, posiblemente teaching-blocks/MermaidBlock.vue si falta |
| Repos tocados | 1 (`horadric-cube`) — sin tocar `deckard` |

### Como vas a saber que funciona

- Abris un spec largo en HC (ej. SPEC-viewer-mvp) y los parrafos se leen como prosa, no como tira monoespaciada
- Las tabs `Resumen / Requirements / Tasks / Decisiones / Riesgos / Referencia` aparecen y navegan correctamente
- En tab Tasks ves el tree colapsable: cada session con summary + 2-3 tasks por click; cada task expand muestra card con files/rules/validation/rollback/source_ref
- Bloques `dkc:hypothesis-map`, `dkc:decision-matrix`, `mermaid` que aparezcan en specs se renderean (no `<div>` vacios)
- TicketDetail sigue funcionando sin regresion (HOR-005 abierto, tabs Draft con dkc:* blocks renderean)

## Purpose

Mejorar la legibilidad de specs en Horadric Cube — el viewer Vue/Tauri read-only sobre filesystem + sqlite de deckard. El cambio toca exclusivamente el frontend del modulo `views` y `components`. Audiencia: dev que abre un spec para aprobar (4-5 min de review en lugar de 15-20), dev futuro que retoma un caso (escaneo rapido del plan + drill-down a tasks especificas).

## Analisis de mejora

### Estado actual

- `MarkdownBody.vue:6` aplica `prose max-w-none` — el `max-w-none` anula la restriccion natural de prose (~75ch)
- `SpecDetail.vue` renderea scroll infinito plano (no tabs); el ejemplo en TicketDetail (HOR-005) sirve de modelo
- `TasksTable.vue` recibe tablas planas del markdown (`{columns: string[], rows: Record<string,string>[]}`) sin parser semantico — todas las columnas tratadas iguales, `max-w-xs truncate` ciego
- `markdownDkcInlineHook.ts` ya emite placeholders en specs igual que tickets, pero el mounting de `HypothesisMap / DecisionMatrix / LearningPath / mermaid` solo ocurre en `SectionTeachings.vue` (montado por TicketDetail)
- `package.json` ya tiene `mermaid: ^11.14.0` (refutacion del H4 original)

### Problema / oportunidad

Specs tipicos: 300-800 lineas, 5-15 REQs con 3-5 scenarios cada uno, 10-15 secciones canonicas. El dev humano que aprueba se enfrenta a wall of text plano. Auditoria de viewer + feedback explicito del dev: "tablas de tasks son un bloque de texto" sin highlights de lo accionable.

### Estado deseado

Render acotado tipograficamente, navegacion por intent (tabs), bloques especializados renderizados, presentacion de tasks que comunica jerarquia (session → tasks → gate + status/agent/dependencias visibles).

### Alcance propuesto

**Se toca** (estimado):

- `src/components/shell/MarkdownBody.vue` (F1)
- `src/views/SpecDetail.vue` (F2 + F5 + F4)
- `src/components/ticket-sections/SectionTeachings.vue` (F4 refactor — extraer mounting a composable)
- Nuevo composable: `src/composables/useDkcBlockMount.ts` (o nombre acordado en S4)
- Nuevo componente: `src/components/specs/SpecSessionTree.vue` (F5 — alternativa D)
- Posiblemente `src/components/teaching-blocks/MermaidBlock.vue` (crear si no existe; reusar si si)

**NO se toca**:

- `src/composables/useMarkdown.ts`, `markdownDkcInlineHook.ts` — hooks ya correctos
- `TasksTable.vue` — queda como deprecated, reemplazado por `SpecSessionTree` (NO eliminar todavia — si emerge regresion en S3, fallback al componente viejo)
- Backend, parser de spec, modelo de datos
- Specs ya cerrados en markdown

### Complejidad estimada

**Media** — 4 sessions con 2 gates ⚑ fuertes. F4 refactor es la zona mas delicada (afecta TicketDetail). Mitigacion: tests visuales sobre HOR-005 antes y despues.

## Requirements

{Cada requirement describe UN comportamiento. Convencion DET-24: cada REQ abre con callout `> **Que cambia** / **Por que**`; scenarios envueltos en `<details>`.}

### REQ-IMPROVE-01: Prose width acotado en MarkdownBody

> **Que cambia**: cuando abris un spec o ticket en HC, los parrafos largos se leen como prosa (~75ch por linea) en vez de tiras de 200 caracteres que cansan la lectura.
> **Por que**: hoy `prose max-w-none` anula el ancho natural de Tailwind Typography — pasamos de prosa legible a wall of text.

El sistema MUST aplicar `max-w-prose` (~75ch) a parrafos renderizados por MarkdownBody, y MUST envolver tablas en contenedor full-width con `overflow-x-auto` cuando exceden el viewport.

**Actor**: dev humano (al leer cualquier markdown en HC)
**Layers**: frontend (views, components)

<details><summary>Scenarios de validacion</summary>

#### Scenario: parrafo largo se renderea acotado
- **GIVEN** un spec con parrafo de 600 caracteres
- **WHEN** el dev abre el spec en HC
- **THEN** el parrafo ocupa max ~75ch de ancho · sin cortes verticales · scroll natural si excede altura

#### Scenario: tabla ancha conserva ancho completo con overflow horizontal
- **GIVEN** un spec con tabla de 8 columnas que excede 75ch
- **WHEN** el dev abre el spec
- **THEN** la tabla mantiene ancho completo del viewport · aparece scroll horizontal si excede

</details>

### REQ-IMPROVE-02: Tabs en SpecDetail (patron TicketDetail)

> **Que cambia**: al abrir un spec ves tabs arriba: Resumen (default) · Requirements · Tasks · Decisiones · Riesgos · Referencia. Click en una tab navega a la seccion sin scroll infinito.
> **Por que**: hoy todo es scroll plano de 3000px; el Executive summary queda enterrado y el dev no encuentra rapido lo que quiere validar.

El sistema MUST agregar tabs en SpecDetail replicando el patron de TicketDetail (HOR-005). Tab `Resumen` default muestra Executive summary. Otras tabs muestran su seccion canonica del spec.

**Actor**: dev humano (al revisar un spec para aprobar)
**Layers**: frontend (views) + router (hash navigation)

<details><summary>Scenarios de validacion</summary>

#### Scenario: tab Resumen muestra Executive summary por default
- **GIVEN** un spec con Executive summary completo
- **WHEN** el dev abre el spec en HC
- **THEN** la tab Resumen aparece activa · contenido del Executive summary visible · resto del spec NO scrolleable directo

#### Scenario: cambiar a tab Tasks muestra la seccion Tasks
- **GIVEN** misma spec
- **WHEN** el dev hace click en tab "Tasks"
- **THEN** URL cambia a `#tasks` · tab Tasks queda activa · contenido muestra el plan de sessions con SpecSessionTree

#### Scenario: tab condicional cuando seccion ausente
- **GIVEN** un spec sin seccion `## Risks and mitigations`
- **WHEN** el dev abre el spec
- **THEN** la tab Riesgos NO aparece · resto de tabs visibles

</details>

### REQ-IMPROVE-03: dkc:* blocks + mermaid se renderean en SpecDetail

> **Que cambia**: bloques `dkc:hypothesis-map`, `dkc:decision-matrix`, `dkc:learning-path` y diagramas `mermaid` que aparezcan dentro de un spec se renderean como bloques interactivos (igual que en TicketDetail), no como `<div>` vacios.
> **Por que**: hoy estos bloques estan disponibles en tickets pero specs los pierden — los teach del intake/close vivian solo en tickets, pero specs con hypothesis-map o mermaid embebido quedaban en blanco.

El sistema MUST montar los componentes `HypothesisMap`, `DecisionMatrix`, `LearningPath`, `MermaidBlock` (si existe; sino crear) en SpecDetail.vue reusando la logica de mounting de `SectionTeachings.vue` extraida a composable.

**Actor**: dev humano (al leer un spec que use estos bloques)
**Layers**: frontend (views, components, composables)

<details><summary>Scenarios de validacion</summary>

#### Scenario: bloque dkc:hypothesis-map renderea en spec
- **GIVEN** un spec piloto con `dkc:hypothesis-map` valido en el body
- **WHEN** el dev abre el spec en HC
- **THEN** el bloque renderea como tabla/grafo navegable (igual que en TicketDetail) · sin error en consola

#### Scenario: mermaid diagram renderea en spec
- **GIVEN** un spec piloto con `graph LR` mermaid fence
- **WHEN** el dev abre el spec
- **THEN** el diagrama se dibuja · sin `<div>` vacio · sin warning de mermaid no encontrado

</details>

### REQ-IMPROVE-04: Presentacion hibrida de tasks (SpecSessionTree)

> **Que cambia**: la tabla de tasks (`TasksTable.vue`) se reemplaza por un tree colapsable por session: cada session muestra summary (objetivo + tier + gate type + cantidad de tasks); al expandir, lista compacta de tasks (1 linea por task con dot de status + ID + summary + agent + REQ). Click en una task expande detalle como card (files, rules, validation, rollback, source_ref).
> **Por que**: hoy las tablas son "un bloque de texto" sin highlights — el dev no distingue de un vistazo lo accionable. La nueva presentacion comunica jerarquia (session → tasks → gate) y permite drill-down sin perder contexto.

El sistema MUST implementar `SpecSessionTree.vue` siguiendo el ground truth visual de `tickets/HOR-018.draft/preview-D-hybrid.html`. Componente recibe los mismos datos que `TasksTable.vue` (tablas planas del parser) y los re-estructura en tree con cards.

**Actor**: dev humano (al revisar/aprobar tasks de un spec)
**Layers**: frontend (components, views)

<details><summary>Scenarios de validacion</summary>

#### Scenario: tree muestra plan completo collapsed por default
- **GIVEN** SPEC-deckard-core-req-format-human-callout (3 sessions, 11 tasks) abierto en HC
- **WHEN** el dev navega a tab Tasks
- **THEN** ve 3 lineas de session collapsed con S1/S2/S3 + objetivo + tier + gate type + count de tasks · sin scroll inicial

#### Scenario: expandir session muestra tasks compactas
- **GIVEN** mismo spec
- **WHEN** dev hace click en chevron de S1
- **THEN** la session expande mostrando filas compactas: dot status + ID + summary + agent + REQ ref · sin detalle expandido

#### Scenario: expandir task muestra detalle card
- **GIVEN** S1 expandida
- **WHEN** dev hace click en chevron de S1.T1
- **THEN** aparece card con grid 2 cols: Files / Rules / Validation / Rollback / Depends on / Source ref · sin abandonar contexto · misma jerarquia visual que tasks vecinas

#### Scenario: gates destacados visualmente
- **GIVEN** una session con `S{N}.GATE` como ultima task
- **WHEN** dev expande la session
- **THEN** la fila del GATE aparece con fondo ambar suave + icono ⚐ + sin click-to-expand (info ya visible en la fila)

</details>

### REQ-PRESERVE-01: TicketDetail no se rompe al refactorizar SectionTeachings

> **Que cambia**: nada visible en TicketDetail. La logica de mounting de `dkc:*` blocks se extrae de `SectionTeachings.vue` a un composable reusable, pero TicketDetail sigue usando `SectionTeachings` con el mismo comportamiento.
> **Por que**: el refactor es prerequisito para F4 (montar bloques en SpecDetail). Romper TicketDetail seria regresion inaceptable — HOR-005 (Draft visual / Data model con mermaid + dkc:* blocks) debe seguir funcionando.

El sistema MUST preservar el comportamiento de TicketDetail. Specifically, todos los teaching blocks en tickets con teach-intake/teach-close existentes (HOR-013, HOR-014, HOR-015, HOR-016, HOR-017, HOR-018, HOR-019) deben renderearse igual que antes del cambio.

**Actor**: dev humano (al abrir tickets con teaching)
**Layers**: frontend (components, views)

<details><summary>Scenarios de validacion</summary>

#### Scenario: HOR-005 mantiene tabs Draft con dkc:* blocks
- **GIVEN** HOR-005 abierto en HC
- **WHEN** navega a Draft visual / Data model
- **THEN** los bloques renderean igual que pre-cambio · sin error en consola

#### Scenario: HOR-019 teach-intake renderea hypothesis-map
- **GIVEN** HOR-019 abierto · tab Teaching > Intake activa
- **WHEN** el dev expande el hypothesis-map
- **THEN** las 5 hipotesis muestran correctamente con status, evidence, rationale

</details>

### REQ-PRESERVE-02: Specs cerrados pre-2026-05-13 renderean sin error

> **Que cambia**: nada en los specs viejos. El cambio es visual sobre datos planos del parser actual; specs cerrados se benefician automaticamente del nuevo render sin migracion.
> **Por que**: migrar 50+ specs cerrados seria trabajo gigante con valor marginal. La presentacion nueva DEBE leer el mismo formato de tablas que produce el parser actual.

El sistema MUST renderear specs cerrados (status=closed o done) con el nuevo SpecDetail sin error. SpecSessionTree MUST aceptar tablas planas (formato actual del parser) sin requerir cambios en el markdown del spec.

**Actor**: dev humano (al abrir specs viejos)
**Layers**: frontend (components, views)

<details><summary>Scenarios de validacion</summary>

#### Scenario: SPEC-viewer-mvp renderea completo
- **GIVEN** SPEC-viewer-mvp (spec largo, 561 lineas) en HC post-cambios
- **WHEN** dev abre el spec
- **THEN** todas las secciones canonicas presentes en tabs · sin secciones desaparecidas · sin warnings parsing tasks

#### Scenario: spec sin seccion Tasks NO rompe tree
- **GIVEN** un spec viejo sin seccion Tasks
- **WHEN** dev navega a tab Tasks
- **THEN** mensaje "Sin tasks definidas" en lugar de error · resto de tabs operativas

</details>

## Changes

### Modified: `src/components/shell/MarkdownBody.vue`

| Aspecto | Antes | Despues | Por que |
|---|---|---|---|
| Container class | `prose prose-invert prose-slate max-w-none` | `prose prose-invert prose-slate max-w-prose` + wrapper para tablas con `overflow-x-auto` | Restaura ancho legible; tablas conservan full-width via wrapper |

### Modified: `src/views/SpecDetail.vue`

| Aspecto | Antes | Despues | Por que |
|---|---|---|---|
| Layout | Scroll infinito plano | Tabs (Resumen / Requirements / Tasks / Decisiones / Riesgos / Referencia) + activacion via `router.replace({hash})` | F2 — patron TicketDetail |
| Tasks render | `TasksTable.vue` (tablas planas) | `SpecSessionTree.vue` (tree + card detalle) | F5 — alternativa D elegida |
| dkc:* mounting | placeholders `<div>` vacios | usar composable `useDkcBlockMount` para montar imperativamente | F4 |

### Modified: `src/components/ticket-sections/SectionTeachings.vue`

| Aspecto | Antes | Despues | Por que |
|---|---|---|---|
| Mounting logic | Inline imperativo dentro del componente | Extraido al composable `useDkcBlockMount` | Reuso en SpecDetail; SectionTeachings invoca el composable manteniendo la misma API publica |

### Added: `src/composables/useDkcBlockMount.ts` (nuevo)

| Field | Value | Purpose |
|---|---|---|
| Export | `function useDkcBlockMount(containerRef: Ref<HTMLElement>, ...): void` | Composable que monta HypothesisMap, DecisionMatrix, LearningPath, MermaidBlock sobre placeholders emitidos por `markdownDkcInlineHook` |
| Dep | mermaid (ya instalada), Vue 3 createApp / defineAsyncComponent | Lazy mount imperativo |

### Added: `src/components/specs/SpecSessionTree.vue` (nuevo)

| Field | Value | Purpose |
|---|---|---|
| Props | `tables: TableData[]`, `taskRules: Record<string, RuleRef[]>`, `project: string` | Compatible con shape actual de TasksTable.vue |
| Renderea | Tree colapsable por session + detalle card por task al expandir | F5 alternativa D |
| Reemplaza | TasksTable.vue (no eliminar — fallback opcional) | Coexistir hasta confirmar S3 GATE pass |

### Possibly added: `src/components/teaching-blocks/MermaidBlock.vue`

Crear solo si no existe en el repo (verificar en S4). Si existe, reusar.

## Tasks

### Session 1 — F1: prose width acotado `[tipo: auto] [tier: T1]`

Objetivo: acotar prose de MarkdownBody sin romper tablas anchas.

| # | Task | source_ref | agent | depends_on | files | validation | rollback | rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Cambiar `max-w-none` por `max-w-prose` en MarkdownBody.vue; envolver tablas en contenedor con `overflow-x-auto` | REQ-IMPROVE-01 | developer | — | `src/components/shell/MarkdownBody.vue` | Diff revisado; smoke visual en SPEC-viewer-mvp y un ticket | `git revert` | DET-2, DET-7, DET-11 | pending | 1 |
| S1.T2 | Smoke test visual en HC dev: spec largo + ticket con tablas | REQ-PRESERVE-01 | reviewer | S1.T1 | (none) | Parrafos acotados sin truncar; tablas conservan ancho | (no aplica) | DET-7, DET-13 | pending | 1 |
| **S1.GATE** | Gate session 1 (validation tier: T1 + Quality review DET-23 light) | — | reviewer | S1.T2 | (none) | T1 lint visual OK; DET-23 dim 7 (claridad) + dim 2 (lint markdown si aplica) pass | (no aplica) | DET-13, DET-20, DET-23 | pending | 1 |

### Session 2 — F2: tabs en SpecDetail `[tipo: ⚑ fuerte] [tier: T2]`

Objetivo: portar patron de tabs de TicketDetail a SpecDetail. Mapear `findSection()` actual a tabs.

| # | Task | source_ref | agent | depends_on | files | validation | rollback | rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Refactor SpecDetail.vue para usar tabs: definir BASE_TABS, computed para filtrar tabs segun secciones presentes, setActiveTab via router.replace({hash}) | REQ-IMPROVE-02 | developer | S1.GATE | `src/views/SpecDetail.vue` | Tabs renderean; navegacion hash funciona | `git revert` | DET-2, DET-7, DET-11, DET-16 | pending | 2 |
| S2.T2 | Smoke test en 2 specs piloto (largo + corto): SPEC-viewer-mvp + SPEC-deckard-core-req-format-human-callout | REQ-PRESERVE-02 | reviewer | S2.T1 | (none) | Todas las tabs navegables; tabs condicionales aparecen/ocultan correctamente | (no aplica) | DET-5, DET-7, DET-13 | pending | 2 |
| **S2.GATE** | Gate session 2 (validation tier: T2 + Quality review DET-23 standard) — ⚑ fuerte: dev aprueba UX de tabs antes de continuar | — | reviewer | S2.T2 | (none) | T2 lint + smoke OK; DET-23 dim 1, 2, 3, 6, 7 pass; dev confirma visual | (no aplica) | DET-13, DET-14, DET-20, DET-23 | pending | 2 |

### Session 3 — F5: SpecSessionTree (alternativa D) `[tipo: ⚑ fuerte] [tier: T2]`

Objetivo: implementar `SpecSessionTree.vue` siguiendo preview-D-hybrid.html. Conectar a SpecDetail tab Tasks.

| # | Task | source_ref | agent | depends_on | files | validation | rollback | rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Crear `SpecSessionTree.vue`: parsear las tablas planas en estructura session → tasks → gate; render con `<details>` para sessions y tasks; gate como fila destacada | REQ-IMPROVE-04 | developer | S2.GATE | `src/components/specs/SpecSessionTree.vue` (nuevo) | Componente renderea con datos de SPEC-deckard-core-req-format-human-callout (caso real) | Mantener TasksTable.vue como fallback; rollback con feature flag o revert | DET-2, DET-7, DET-8, DET-11, DET-16 | pending | 3 |
| S3.T2 | Conectar SpecSessionTree en SpecDetail tab Tasks (reemplaza TasksTable) | REQ-IMPROVE-04, REQ-PRESERVE-02 | developer | S3.T1 | `src/views/SpecDetail.vue` | Tab Tasks muestra el tree; specs sin tasks muestran mensaje vacio | `git revert` | DET-2, DET-7 | pending | 3 |
| S3.T3 | Smoke test sobre 3 specs piloto (corto / mediano / largo): SPEC-deckard-core-req-format-human-callout, SPEC-viewer-ticket-assets, SPEC-viewer-mvp | REQ-IMPROVE-04, REQ-PRESERVE-02 | reviewer | S3.T2 | (none) | Cada spec renderea con jerarquia visible; click flow consistente con preview-D | (no aplica) | DET-5, DET-7, DET-13 | pending | 3 |
| **S3.GATE** | Gate session 3 (validation tier: T2 + Quality review DET-23 standard + accessibility check) — ⚑ fuerte: dev aprueba UX final del componente | — | reviewer | S3.T3 | (none) | T2 + smoke OK; DET-23 dim 1, 6, 7, 8 (accesibilidad — focus visible en tree, keyboard nav) pass; dev confirma | (no aplica) | DET-13, DET-14, DET-20, DET-23 | pending | 3 |

### Session 4 — F4: dkc:* blocks + mermaid en SpecDetail `[tipo: auto] [tier: T1]`

Objetivo: extraer mounting logic de SectionTeachings a composable y reusar en SpecDetail. Mermaid ya esta instalada (H4 refuted).

| # | Task | source_ref | agent | depends_on | files | validation | rollback | rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Crear `useDkcBlockMount` composable extrayendo logica de mounting de SectionTeachings | REQ-IMPROVE-03 | developer | S3.GATE | `src/composables/useDkcBlockMount.ts` (nuevo) | Composable testable en aislamiento; firma compatible con uso actual | `git revert` | DET-2, DET-7, DET-10, DET-16 | pending | 4 |
| S4.T2 | Refactorizar `SectionTeachings.vue` para invocar `useDkcBlockMount`; API publica inmutable | REQ-PRESERVE-01 | developer | S4.T1 | `src/components/ticket-sections/SectionTeachings.vue` | Smoke test sobre HOR-005, HOR-013, HOR-019 — todos renderean igual | `git revert` | DET-5, DET-7, DET-10 | pending | 4 |
| S4.T3 | Conectar `useDkcBlockMount` en SpecDetail (todas las tabs que pueden contener `dkc:*` blocks). Crear `MermaidBlock.vue` si no existe | REQ-IMPROVE-03 | developer | S4.T2 | `src/views/SpecDetail.vue`, posiblemente `src/components/teaching-blocks/MermaidBlock.vue` | Spec piloto con dkc:hypothesis-map y mermaid renderean correctamente | `git revert` | DET-2, DET-7 | pending | 4 |
| **S4.GATE** | Gate session 4 (validation tier: T1 + Quality review DET-23 light) — verifica regresion sobre TicketDetail | — | reviewer | S4.T3 | (none) | T1 OK; DET-23 dim 1, 2, 6, 7 pass; smoke sobre HOR-005 confirma no regresion en TicketDetail | (no aplica) | DET-13, DET-20, DET-23 | pending | 4 |

## Constraints

- **DET-7** (regression obligatoria): REQ-PRESERVE-01 y REQ-PRESERVE-02 cubren TicketDetail intacto + specs viejos renderan
- **DET-13** (cierre con evidencia): smoke tests visuales son evidencia obligatoria en gates ⚑ fuertes
- **DET-23** (quality review): cada gate incluye Quality review acorde al tier
- **DET-24** (REQ format human): este spec dogfoodea — cada REQ tiene callout
- **RULE-viewer-polling-001**: composables con URL dinamica invalidan data + race guard. Aplica si tabs nuevas cargan data via useETagPoll
- **RULE-viewer-assets-context-001**: assets requieren contexto narrativo — coherente con el "callout" y el tree con session summary
- **RULE-server-frontmatter-legacy-001**: cambios en presentacion no afectan frontmatter de specs viejos

## Dependencies

| Dependency | Type | Description | Risk |
|---|---|---|---|
| `mermaid: ^11.14.0` | external (npm) | Ya instalada — verificado en intake-explore. F4 solo importa | bajo |
| `markdownDkcInlineHook.ts` | internal | Emite placeholders en specs igual que tickets — sin cambios | bajo |
| `SectionTeachings.vue` | internal | Refactor (extraer mounting) afecta TicketDetail por uso indirecto | medio (mitigado por REQ-PRESERVE-01 + smoke) |
| `TasksTable.vue` | internal | Coexiste con SpecSessionTree.vue hasta S3.GATE pass — sin eliminacion temprana | bajo |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Refactor SectionTeachings rompe TicketDetail | Medium | High | S4.T2 smoke obligatorio sobre HOR-005/013/019; rollback via git revert si emerge regresion |
| SpecSessionTree no escala bien en specs con 8+ sessions o 50+ tasks | Low | Medium | S3 smoke incluye SPEC-viewer-mvp (caso largo); fallback a TasksTable.vue si emerge perf issue |
| Mermaid render rompe en diagramas complejos | Low | Low | Mermaid ya usado en TicketDetail HOR-005; sin issue reportado |
| Tabs en SpecDetail cambian URLs anchor existentes (links externos) | Low | Medium | Soportar URL legacy: si hash es `#requirement` (anchor scrolling), redirigir a tab Requirements con scroll al elemento |

## Open questions

Sin gaps `blocked` ni `assumed` al cierre del design. Las 2 questions resueltas:

- **DEC-DRAFT-01** (alternativa F5): cerrada en design-draft v2 → hibrido D
- **DEC-DRAFT-02** (retroactivo): cerrada → si, aplica a todos automaticamente

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Refactor de SectionTeachings.vue a composable

- **Contexto**: F4 necesita el mounting logic en SpecDetail. SectionTeachings tiene esa logica inline en TicketDetail.
- **Drivers**: DRY (evitar duplicar mounting); reusabilidad cross-view; impacto colateral controlado en TicketDetail
- **Opcion elegida**: extraer a `useDkcBlockMount.ts` composable. SectionTeachings invoca el composable manteniendo API publica.
- **Alternativas descartadas**:
  - Duplicar mounting en SpecDetail — viola DRY, drift entre componentes
  - Mover SectionTeachings a un layout compartido — sobre-engineering para 2 sitios
- **Consecuencias**: 1 file nuevo (composable), 1 file refactor (SectionTeachings). Mitigacion del riesgo: smoke obligatorio sobre TicketDetail en S4.T2.
- **Session**: design-improvement (2026-05-13)

### DEC-LOCAL-02: SpecSessionTree.vue como componente nuevo, no extension de TasksTable

- **Contexto**: el cambio de F5 es estructural — pasar de tabla plana a tree con cards. Modificar TasksTable directamente vs crear componente nuevo.
- **Drivers**: claridad de diff (nuevo componente vs refactor pesado); fallback opcional si emerge regresion; nombres semanticamente correctos
- **Opcion elegida**: crear `SpecSessionTree.vue` y reemplazar TasksTable en SpecDetail. TasksTable queda en el repo como deprecated (no eliminar hasta confirmar S3.GATE pass).
- **Alternativas descartadas**:
  - Modificar TasksTable in-place — refactor pesado, sin fallback
  - Eliminar TasksTable inmediatamente — riesgo si S3 falla y hay que revertir
- **Consecuencias**: 1 file nuevo; TasksTable queda como dead code temporal (limpieza en backlog `should`).
- **Session**: design-improvement (2026-05-13)

## Acceptance checkpoints

- [ ] **Funcional**: F1 (prose width), F2 (tabs), F4 (dkc:* blocks + mermaid), F5 (SpecSessionTree) verificados en HC dev
- [ ] **Tests**: smoke tests manuales en gates de cada session (S1.T2, S2.T2, S3.T3, S4.T2)
- [ ] **NFRs**: no aplica (mejora de UX, no de performance)
- [ ] **Rules**: DET-7, DET-13, DET-23 cumplidas; DET-24 dogfooded en este spec
- [ ] **Integration**: TicketDetail sigue funcionando (REQ-PRESERVE-01); specs viejos renderean (REQ-PRESERVE-02)
- [ ] **Docs**: backlog item `should` para limpiar TasksTable.vue post-aprobacion S3
- [ ] **Quality review (DET-23)** completado en cada gate

## Archiving

Cuando este spec deje de ser fuente de verdad: `/dkc-archive-spec SPEC-views-spec-render-comodo "{razon}"`.
