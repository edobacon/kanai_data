---
id: SPEC-teach-v2-html-81
project: horadric
ticket: HOR-081
status: done
---

# Teaching v2 — formato HTML didactico self-contained renderizado via iframe

# Teaching v2 — formato HTML didactico self-contained renderizado via iframe

## Executive summary — lo que estas aprobando

> *Seccion para revision rapida. Si esto te basta para aprobar, ese es el objetivo.*

Hoy el teaching de DKC es prosa markdown: tedioso para estudiar conceptos y flujos, al punto de que los devs generan HTML aparte para entender. Este spec introduce **teaching v2**: el teach se autora como **HTML self-contained didactico** (un catalogo de bloques componibles: callouts, glosario, flujos mermaid, casos, Q&A, invariantes, formulas, comparativas...) y HC lo renderiza en un **iframe** con affordance "Abrir en pestaña" — el mismo patron probado de los drafts de diseño.

Es **forward-only y aditivo**: HC detecta el formato por existencia de archivo (`teach-{kind}.html` => v2 iframe; si no => render markdown v1 actual, intacto). **Cero migracion, cero regresion** en teaches existentes. Las libs (Tailwind + Mermaid) se sirven **localmente** desde HC (sin CDN). El catalogo de bloques **crece con el tiempo** sin romper teaches viejos.

Alcance: 2 repos. **deckard** (template base `teach-base.html` + catalogo + reescritura de los steps teach-intake/close + verificacion HTML-aware de DET-21/22 en sus 5 capas). **horadric-cube** (vendoring de libs + ruta que sirve el HTML + deteccion + tab Teaching v2 con iframe + fallback v1). 5 sessions. El propio HOR-081 cierra dogfoodeando su teach-close en v2.

## Purpose

Elevar la densidad didactica del teaching (flujos, casos, mejores explicaciones) dandole al autor **libertad de composicion** via un formato HTML con catalogo de bloques, sin sacrificar la retrocompatibilidad ni la operacion offline de HC. Resolver el dolor concreto: que el dev estudie comodo desde el teaching mismo, en lugar de fabricar HTML por fuera.

## Requirements

### REQ-01: Template base `teach-base.html` + catalogo de bloques didacticos

> **Que cambia**: aparece un molde HTML que el autor del teach copia y rellena, con un catalogo de bloques listos (callout, concept-card, flow, state-machine, case, code, comparison-table, study-qa, timeline, tldr, invariant, formula, tag, two-col-compare). No todos se usan en cada teach — se eligen segun el caso.
> **Por que**: sin un molde + catalogo, cada teach reinventa estructura y estilo; el catalogo da consistencia y baja el costo de autoria.

El sistema MUST proveer `templates/outputs/teach-base.html`: HTML self-contained (theme stone/amber alineado a HC, oscuro) con (a) header de trazabilidad, (b) referencia comentada del catalogo de los **14 bloques v1** (ground truth visual = el draft aprobado v2 de HOR-081), (c) cada bloque marcado con `data-dkc-block="{kind}"`. El template MUST referenciar las libs por URL local servida por HC (no CDN). El catalogo MUST ser ampliable: agregar un bloque nuevo al template NO invalida teaches existentes.

<details><summary>Scenarios de validacion</summary>

- **GIVEN** el template base **WHEN** un autor lo copia y compone 3 bloques **THEN** el HTML resultante abre y renderiza sin dependencias del repo.
- **GIVEN** un bloque nuevo agregado al catalogo **WHEN** se valida un teach v2 previo **THEN** sigue siendo valido (forward-compatible).

**Acceptance**: `teach-base.html` existe; contiene los 14 `data-dkc-block`; referencia libs locales; documenta el catalogo.
</details>

### REQ-02: Deteccion forward-only del formato (server)

> **Que cambia**: HC decide automaticamente que mostrar — si el ticket tiene `teach-{kind}.html` muestra el v2 (iframe); si solo tiene `.md`, el render markdown de siempre. Los teaches viejos no cambian en nada.
> **Por que**: permite adoptar v2 desde el proximo ticket sin tocar ni migrar lo existente.

El server MUST detectar, por kind (`intake`/`close`), si existe `tickets/{id}.teach/teach-{kind}.html`. Si existe => `format: 'html'` con URL servida; si no => `format: 'markdown'` (pipeline v1 actual). La deteccion MUST ser por `existsSync` sobre path determinista dentro de `deckard_root` (anti path-traversal, RULE-viewer-assets-context-001 / SPEC-server-legacy-tolerance). HTML tiene precedencia sobre md si ambos existen.

<details><summary>Scenarios de validacion</summary>

- **GIVEN** ticket con `teach-intake.html` **WHEN** GET payload del ticket **THEN** teaching.intake.format === 'html' + servedUrl presente.
- **GIVEN** ticket legacy solo con `teach-intake.md` **WHEN** GET payload **THEN** format === 'markdown', rawMarkdown + blocks como hoy.
- **GIVEN** path con `../` **WHEN** resolucion **THEN** rechazado.

**Acceptance**: TC-1, TC-2 verdes; teaches v1 sin cambio observable.
</details>

### REQ-03: Libs vendored servidas localmente (server)

> **Que cambia**: Tailwind y Mermaid se cargan desde el propio HC, no desde internet. El teaching renderiza igual sin conexion.
> **Por que**: el dev rechazo depender de un CDN online; HC es una herramienta local.

El server MUST servir `@tailwindcss/browser` (v4) y `mermaid` (ESM, ya dep local `^11.14`) como assets estaticos por una ruta estable (ej. `/vendor/*`). El `teach-base.html` MUST referenciarlas por esa URL local. El render MUST funcionar **offline** (sin acceso a CDN). Las libs se agregan como dependencias en `package.json` de HC (no descargas en runtime).

<details><summary>Scenarios de validacion</summary>

- **GIVEN** HC corriendo sin red **WHEN** se abre un teach v2 **THEN** Tailwind aplica estilos y Mermaid renderiza diagramas (TC-3).

**Acceptance**: TC-3 verde con red deshabilitada.
</details>

### REQ-04: Tab Teaching v2 con iframe + "Abrir en pestaña" + fallback v1 (viewer)

> **Que cambia**: el tab Teaching muestra el HTML v2 embebido en un iframe (como el tab Draft) con un boton "Abrir en pestaña" para verlo full-page; si el ticket es v1, se ve el markdown de siempre.
> **Por que**: render rico sin pelear por espacio con el resto de HC, y transicion transparente entre formatos.

`SectionTeachings.vue` MUST, segun `format` (REQ-02): si `'html'` => `<iframe sandbox="allow-same-origin allow-scripts">` a la URL servida + link `target="_blank" rel="noopener"` "Abrir en pestaña" (patron `DraftVisualTab.vue:39-51`); si `'markdown'` => render legacy actual sin cambios. El toggle intake/close MUST seguir funcionando en ambos formatos. Los tipos TS (`TeachingSummary`, payload) MUST extenderse con `format` + `servedUrl` sin romper consumers.

<details><summary>Scenarios de validacion</summary>

- **GIVEN** teach v2 **WHEN** abro el tab **THEN** veo iframe + "Abrir en pestaña" que abre el HTML full-page (TC-1, TC-4).
- **GIVEN** teach v1 **WHEN** abro el tab **THEN** veo el markdown con bloques Vue como hoy (TC-2).

**Acceptance**: TC-1, TC-2, TC-4 verdes; typecheck sin errores nuevos.
</details>

### REQ-05: Steps teach-intake/close autoran HTML v2 desde el catalogo (workflow)

> **Que cambia**: cuando DKC genera un teaching de aqui en adelante, produce el HTML v2 (eligiendo bloques del catalogo segun el caso) en vez del markdown.
> **Por que**: es el cambio que hace que los teaches nuevos nazcan ya didacticos.

Los steps `prompts/steps/teach-intake.md` y `teach-close.md` MUST generar `teach-{kind}.html` desde `teach-base.html`, componiendo bloques del catalogo segun el caso (no todos siempre). El LLM MUST autora HTML directo (sin bloque `dkc:*` intermedio — DEC-LOCAL-04). La cobertura obligatoria (4 ejes intake / 5 ejes intake+close, framing autopilot) MUST preservarse en prosa dentro del HTML.

<details><summary>Scenarios de validacion</summary>

- **GIVEN** un ticket nuevo full-path **WHEN** corre teach-intake **THEN** se produce `teach-intake.html` valido (REQ-06) con los ejes cubiertos.

**Acceptance**: el teach-close de HOR-081 (dogfooding) se genera en v2 y valida.
</details>

### REQ-06: Verificacion HTML-aware de DET-21/22 + 5 capas de enforcement (workflow)

> **Que cambia**: el validador que hoy revisa que el teaching markdown tenga sus bloques `dkc:*` aprende a validar el HTML v2 (cuenta los `data-dkc-block` y la cobertura de ejes). El contrato de DET-21/22 sigue siendo real, no solo declarado.
> **Por que**: sin esto, un teach v2 pasaria la verificacion vacio — el bug exacto que RULE-workflow-det-introduction-001 previene.

El validador de teach (`dkc-validate Teach`) MUST reconocer el formato HTML: validar presencia de `data-dkc-block` markers + cobertura de ejes en prosa (heuristica) en vez de grepear fences `dkc:*`. Las 5 capas de enforcement de DET-21/DET-22 (regla textual, ref en steps, comando, validator, a-hook) MUST actualizarse simetricamente (RULE-workflow-enforcement-pattern-009). El gate de salida de teach-intake/close + el gate de design + el sub-paso de close MUST seguir bloqueando igual, ahora HTML-aware.

<details><summary>Scenarios de validacion</summary>

- **GIVEN** un teach v2 sin bloques **WHEN** `dkc-validate Teach` **THEN** error (no pasa).
- **GIVEN** un teach v2 completo **WHEN** validar **THEN** OK.
- **GIVEN** un teach v1 markdown **WHEN** validar **THEN** sigue usando la verificacion de fences `dkc:*` (sin regresion).

**Acceptance**: validador discrimina html/md; ambos paths verdes; las 5 capas alineadas.
</details>

### REQ-PRESERVE-01: Render markdown legacy intacto

> **Que cambia**: nada — los teaches v1 existentes se ven y validan exactamente como hoy.
> **Por que**: es la garantia de retrocompatibilidad que origino el ticket.

El sistema MUST preservar sin cambio observable: el pipeline `teaches.ts` markdown, el render de bloques `dkc:*` como componentes Vue, y la verificacion por fences para teaches sin `.html`.

## Non-functional requirements

- **Offline**: el render del teach v2 NO depende de red (REQ-03). Sin CDN.
- **Seguridad**: la ruta que sirve HTML + libs valida path-traversal contra `deckard_root`; iframe con `sandbox` minimo (`allow-same-origin allow-scripts`), sin `allow-top-navigation`/`allow-forms`.
- **Performance**: el iframe del teach carga bajo demanda al abrir el tab (no en el payload del ticket). Peso del HTML del teach acotado (libs NO inlined — DEC-LOCAL-01).
- **Read-only**: HC nunca escribe el teach; solo lo sirve.
- **Forward-compat**: ampliar el catalogo no invalida teaches v2 previos.

## Artifacts

### deckard
- `templates/outputs/teach-base.html` (NUEVO) — molde + catalogo.
- `prompts/steps/teach-intake.md`, `prompts/steps/teach-close.md` (MOD) — autoria HTML v2.
- `prompts/deterministic-rules.md` (MOD) — DET-21/DET-22 reconocen formato HTML.
- `commands/` validador de teach + a-hook (MOD) — verificacion HTML-aware.
- (posible) `projects/horadric/rules/workflow/RULE-workflow-teach-html-catalog-NNN.md` (NUEVO) — catalogo canonico + como ampliar (OQ4).

### horadric-cube
- `package.json` (MOD) — agregar `@tailwindcss/browser`.
- `server/` ruta `/vendor/*` (NUEVO) — sirve libs locales.
- `server/deckard/teaches.ts` (MOD) — deteccion html/md + servedUrl.
- `server/routes/tickets.ts` (MOD) — payload con `format`/`servedUrl`.
- `shared/types.ts`, `src/api/client.ts` (MOD) — tipos `format` + `servedUrl`.
- `src/components/ticket-sections/SectionTeachings.vue` (MOD) — render iframe + fallback + "Abrir en pestaña".

## Constraints

- RULE-viewer-assets-context-001: assets textuales autocontenidos (como el teach HTML) SI admiten tab dedicada — habilita el iframe.
- RULE-workflow-det-introduction-001 + RULE-workflow-enforcement-pattern-009: las 5 capas de DET-21/22 deben actualizarse simetricamente (REQ-06).
- RULE-server-frontmatter-legacy-001 / SPEC-server-legacy-tolerance: patron de tolerancia legacy a replicar para la deteccion.

## Dependencies

- `@tailwindcss/browser@^4.3.0` (nueva dep HC), `mermaid` (ya `^11.14`).
- SPEC-viewer-ticket-assets (patron iframe + ruta de assets), SPEC-server-legacy-tolerance (deteccion).

## Risks and mitigations

- **R1 — iframe aislado pierde links navegables/theme de HC**: aceptado (decision A). Mitigacion: theme stone/amber dentro del HTML alinea visualmente; "Abrir en pestaña" da full-page.
- **R2 — `@tailwindcss/browser` JIT pesa/lentea el iframe**: vendored + carga on-demand. Si el peso molesta, fallback a CSS precompilada (no inlined). Evaluar en S2.
- **R3 — verificacion HTML-aware mas laxa que el grep de fences**: mitigacion: exigir `data-dkc-block` + heuristica de ejes; documentar limitaciones en REQ-06.
- **R4 — drift de las 5 capas (DET-21/22 declaradas pero no implementadas en HTML)**: S4 valida las 5 capas explicitamente; dogfooding en S5 lo prueba en vivo.

## Open questions

- **OQ4 (parcial) — hogar del catalogo**: propuesta — el catalogo vive documentado en `teach-base.html` (comentario) + una rule `RULE-workflow-teach-html-catalog-NNN`. Confirmar en S1 si la rule es necesaria o basta el template.

## Decisions

### DEC-LOCAL-01: Libs vendored servidas por HC (no inlined, no CDN) — OQ1
- **Drivers**: offline-safe + integrado + HTML liviano. **Alternativas**: CDN (rechazada: online), inlined (rechazada: teaches de varios MB). **Confirmacion**: dev 2026-05-29 sobre el draft v2.

### DEC-LOCAL-02: Deteccion por existencia de archivo (`.html`) — OQ2
- Sin campo `teach_format` obligatorio en frontmatter. El HTML puede llevar `<meta name="dkc-teach-format" content="v2">` autodescriptivo, pero la fuente de verdad de la deteccion es `existsSync`. Mas simple y alineado a H4.

### DEC-LOCAL-03: Marcadores `data-dkc-block="{kind}"` para verificacion HTML-aware — OQ3
- Reemplazan al fence `dkc:*` como unidad grepeable/parseable de cobertura. El validador cuenta/valida estos markers.

### DEC-LOCAL-04: Autoria HTML directa desde el catalogo (sin `dkc:*` intermedio) — OQ5
- El LLM compone el HTML directo. Se acepta la perdida de la data estructurada queryable de los bloques `dkc:*` para teaches v2 (R3).

## Tasks

### Session 1 — deckard: template base `teach-base.html` + catalogo + (rule catalogo) [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `teach-base.html` desde el draft aprobado v2: header + 14 bloques con `data-dkc-block` + libs por URL local placeholder | REQ-01 | developer | — | `templates/outputs/teach-base.html` | manual: abre en browser, 14 bloques renderizan | git revert | DET-1, DET-2 | pending | 1 |
| S1.T2 | Documentar el catalogo (comentario en template) + decidir/crear `RULE-workflow-teach-html-catalog-NNN` (OQ4) | REQ-01, OQ4 | developer | S1.T1 | `templates/outputs/teach-base.html`, `projects/horadric/rules/workflow/` | manual: catalogo legible + criterio de ampliacion | git revert | DET-16, RULE-workflow-enforcement-pattern-009 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en ticket (Template de Gate), quality review DET-23, decidir continue/iterate | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23 | pending | 1 |

### Session 2 — horadric-cube server: vendoring libs + ruta + deteccion forward-only [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Agregar `@tailwindcss/browser` a package.json + ruta `/vendor/*` que sirve Tailwind + mermaid ESM (path-traversal safe) | REQ-03 | developer | S1.GATE | `horadric-cube/package.json`, `server/routes/*` | test: GET /vendor/* 200 + content-type; offline | git revert | DET-8, RULE-viewer-assets-context-001 | pending | 2 |
| S2.T2 | `teaches.ts`: deteccion html/md por existsSync + servedUrl; `tickets.ts` payload con `format`+`servedUrl` | REQ-02 | developer | S2.T1 | `server/deckard/teaches.ts`, `server/routes/tickets.ts` | test integ: v2=>html, v1=>markdown, `../`=>rechazado | git revert | DET-5, RULE-server-frontmatter-legacy-001 | pending | 2 |
| S2.T3 | Tests integ del server: TC-2 (v1 sin regresion), TC-3 (offline), deteccion | REQ-02, REQ-03, REQ-PRESERVE-01 | developer | S2.T2 | `server/**/*.test.ts` | vitest run del area verde | git revert | DET-7, DET-25 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — quality review DET-23, commits DET-27 | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23, DET-27 | pending | 2 |

### Session 3 — horadric-cube viewer: tab Teaching v2 iframe + fallback + tipos [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Extender tipos `TeachingSummary` + payload (`format`, `servedUrl`) sin romper consumers | REQ-04 | developer | S2.GATE | `shared/types.ts`, `src/api/client.ts` | typecheck sin errores nuevos | git revert | DET-5 | pending | 3 |
| S3.T2 | `SectionTeachings.vue`: render iframe v2 + "Abrir en pestaña" + fallback v1 segun format; toggle intake/close en ambos | REQ-04, REQ-PRESERVE-01 | developer | S3.T1 | `src/components/ticket-sections/SectionTeachings.vue` | manual UI: TC-1, TC-2, TC-4 | git revert | DET-5, RULE-viewer-assets-context-001 | pending | 3 |
| S3.T3 | Smoke UI + verificar TC-1..TC-4 con un teach v2 de prueba; registrar evidencia (DET-25) | REQ-04 | reviewer | S3.T2 | ticket | smoke: 4 TCs verdes con screenshots | (no aplica) | DET-7, DET-13, DET-25 | pending | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** — regression + quality review DET-23 exhaustive (a11y/UI) + commits DET-27. ⚑ fuerte: dev valida v2/v1 visual | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido + decision dev | (no aplica) | DET-20, DET-23, DET-27 | pending | 3 |

### Session 4 — deckard workflow: steps autoran HTML v2 + DET-21/22 HTML-aware + 5 capas [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Validador `dkc-validate Teach` HTML-aware: contar `data-dkc-block` + cobertura ejes; discriminar html/md | REQ-06 | developer | S3.GATE | `commands/lib/schemas/*`, validador teach | self-test: v2 vacio=>error, v2 ok=>pass, v1=>fences | git revert | DET-13, RULE-workflow-enforcement-pattern-009 | pending | 4 |
| S4.T2 | Reescribir `teach-intake.md` + `teach-close.md`: generar HTML v2 desde catalogo; preservar cobertura de ejes en prosa | REQ-05 | developer | S4.T1 | `prompts/steps/teach-intake.md`, `prompts/steps/teach-close.md` | manual: steps producen html valido | git revert | DET-21, DET-22 | pending | 4 |
| S4.T3 | Actualizar DET-21/DET-22 (regla textual) + a-hooks + ref en design/close: 5 capas simetricas | REQ-06 | developer | S4.T2 | `prompts/deterministic-rules.md`, steps de design/close | grep: 5 capas alineadas | git revert | RULE-workflow-det-introduction-001, RULE-workflow-enforcement-pattern-009 | pending | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T3)** — quality review DET-23 + commits DET-27. ⚑ fuerte: cambio de contrato DET | — | reviewer | S4.T1, S4.T2, S4.T3 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23, DET-27 | pending | 4 |

### Session 5 — dogfooding + cierre: teach-close de HOR-081 en v2 + regresion final [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Generar `teach-close.html` de HOR-081 en v2 (primer teach v2 real) y validarlo HTML-aware | REQ-05, REQ-06 | developer | S4.GATE | `tickets/HOR-081.teach/teach-close.html` | `dkc-validate Teach` pass; render en HC iframe | git revert | DET-22, DET-25 | pending | 5 |
| S5.T2 | Regresion final: un teach v1 existente sigue identico (TC-2) + typecheck/lint cross-repo | REQ-PRESERVE-01 | reviewer | S5.T1 | ticket | TC-2 verde + suites verdes | (no aplica) | DET-7, DET-13 | pending | 5 |
| **S5.GATE** | **Gate de sync Session 5 (tier: T3)** — quality review DET-23 exhaustive + commits DET-27 + cierre | — | reviewer | S5.T1, S5.T2 | ticket | gate persistido + decision | (no aplica) | DET-20, DET-23, DET-27 | pending | 5 |

## Success metrics

- Teaches v2 nuevos renderizan en HC iframe offline (sin CDN) — TC-1, TC-3.
- Teaches v1 existentes sin cambio observable — TC-2 (regresion 0).
- "Abrir en pestaña" funcional — TC-4.
- DET-21/22 bloquean igual con verificacion HTML-aware (las 5 capas alineadas).
- Dogfooding: el teach-close de HOR-081 es el primer teach v2 valido en produccion.

## Acceptance checkpoints

- [x] `teach-base.html` con catalogo de 14 bloques + libs locales (S1).
- [x] Server detecta html/md + sirve HTML y libs offline + path-traversal safe (S2).
- [x] Tab Teaching v2 iframe + "Abrir en pestaña" + fallback v1 + typecheck (S3).
- [x] Validador HTML-aware + steps autoran v2 + 5 capas DET-21/22 (S4).
- [x] teach-close de HOR-081 en v2 valido + regresion v1 (S5).

## Archiving

Spec activo durante HOR-081. Al cerrar, queda como fuente de verdad del formato teach v2.
