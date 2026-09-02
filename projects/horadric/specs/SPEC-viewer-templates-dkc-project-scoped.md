---
id: SPEC-viewer-templates-dkc-project-scoped
project: horadric
ticket: HOR-021
status: done
---

# Templates DKC project-scoped: convencion + ciclo de vida + visualizacion en HC + redesign global

# Templates DKC project-scoped: convencion + ciclo de vida + visualizacion en HC + redesign global

## Executive summary — lo que estas aprobando

> Esta seccion esta diseñada para revision rapida. Si solo lees el Executive summary y te basta para decidir, ese es el objetivo. El detalle vive en Requirements + Tasks.

**Que cambia**: introducimos un nuevo artefacto DKC llamado `template` (project-scoped), con su ciclo de vida completo (consumo + validacion + actualizacion automaticos) + visualizacion en HC viewer. Como side effect aprovecho el draft visual para promover los design tokens a sistema global de HC.

**Por que importa**: 4 patrones de codigo recurrentes en mods de up1 viven inline como ejemplos en rules — pero no existen como templates ejecutables. Devs nuevos los replican de memoria. Este spec convierte el knowledge en infrastructure ejecutable, validable y visualizable.

**Alcance**:
- **Meta-tooling DKC**: nueva convencion `projects/{project}/templates/`, 2 steps nuevos (`validate-templates`, `update-template`), 2 hooks (close + execute), 1 schema migration SQLite (3→4)
- **Productos**: 4 templates iniciales en up1 (`mod-object-definition`, `mod-resolver-validated`, `mod-schema-graphql`, `mod-seed`) con back-refs a 5 rules existentes
- **HC viewer**: nuevo record type renderizado en sidebar + 2 vistas nuevas (TemplatesListView, TemplateDetailView) + 2 atoms nuevos (TemplateBadge, FreshnessChip) + extract tokens globales + refactor de 8+ vistas existentes para consumir los tokens
- **Documentacion**: design system formal de HC en `docs/design-system.md`

**Decisiones criticas tomadas en intake**:
- **D1** — SQLite schema generico (migration aditiva, NO tabla nueva)
- **D2** — `validates_against` es bash inline en frontmatter (NO DSL custom)
- **D3** — `last_validated` se actualiza automatico al pasar F3, manual al regenerar via F6

**Decisiones criticas resueltas en draft v1**:
- **D4** — Body del template en code block raw con syntax highlight (NO markdown rendered)
- **D5** — Redesign visual del draft se promueve a sistema global HC (scope expansion approved)

**Riesgos principales**:
- **R1** (H4 hipotesis) — hook close bloqueante puede ser UX-molesto si drift es frecuente. Validable empirico en S8
- **R2** (H9 hipotesis) — refactor F10 de vistas existentes puede introducir regresiones visuales. Mitigacion: screenshots before/after por vista en S13+S14
- **R3** (DET-12) — ticket es grande (13 sessions / 20-30 SP). Salida de emergencia: escalar a split (F9-F11 → HOR-022 post-S10)

## Purpose

Crear un artefacto DKC nuevo llamado `template` — snippet canonical de codigo project-scoped, ejecutable y validable, que captura patrones recurrentes del producto en un formato consumible por workflows DKC + visualizable en HC viewer. Setear el ciclo de vida completo (creacion, consumo, validacion, actualizacion) para que el knowledge no se vuelva stale. Como output secundario, formalizar el design system de HC viewer a partir del draft visual aprobado.

## Requirements

> Cada REQ abre con callout `**Que cambia**` + `**Por que**` (DET-24) en lenguaje conversacional, seguido del enunciado normativo RFC 2119. Scenarios de validacion en `<details>` colapsable.

### REQ-F1-CONVENCION-1: Espacio DKC project-scoped templates

> **Que cambia**: agregamos `templates/` como nuevo tipo de artefacto bajo `projects/{project}/`, simetrico con tickets/specs/rules/bugs/decisions/learns/teach.
> **Por que**: sin convencion documentada, devs futuros no saben donde van los templates ni HC viewer sabe donde buscarlos.

El sistema **MUST** entregar:
- Path `deckard/projects/{project}/templates/` reconocido como artefacto oficial DKC
- `templates/README.md` con: que es un template, naming convention (`TMPL-{slug-kebab}`), shape canonical del frontmatter, lifecycle
- `templates/INDEX.md` con: listado de templates del proyecto + last_validated + summary (regenerable manual; auto-gen es F7)
- `deckard/DECKARD.md` actualizado seccion "Resolucion de paths" agregando: `Templates por proyecto: {deckard_path}/projects/{project}/templates/`

**Source_ref**: F1 + draft `intent.md` + Session 0 Discovery #1. **Confidence**: confirmed.

<details>
<summary>Scenarios de validacion</summary>

```
GIVEN un proyecto DKC con `projects/{project}/` existente
WHEN se crea `projects/{project}/templates/` con README.md + INDEX.md
THEN `dkc_status` no falla
AND devs leyendo DECKARD.md descubren el nuevo path
AND otros proyectos sin `templates/` no se ven afectados (grep verifica)
```
</details>

### REQ-F2-TEMPLATES-INICIALES-1: 4 templates iniciales en up1

> **Que cambia**: creamos 4 archivos `.tmpl` en `projects/up1/templates/` con frontmatter rico y body con codigo canonical de los patrones que rules existentes describen.
> **Por que**: la convencion sin templates concretos es teoria — los 4 templates prueban el patron en un proyecto real (up1) y sirven de fixture para F3-F8.

El sistema **MUST** entregar 4 archivos en `projects/up1/templates/`:

1. **`mod-object-definition.json.tmpl`** — `applies_to: mods/<mod>/objects/*.json`, referenced_rules: RULE-mods-006/007/010/017/018/020/037
2. **`mod-resolver-validated.js.tmpl`** — `applies_to: mods/<mod>/logic/*.resolver.js`, referenced_rules: RULE-mods-002/004, RULE-curriculum-design-003, related_tickets: TICKET-018, TICKET-019
3. **`mod-schema-graphql.tmpl`** — `applies_to: mods/<mod>/logic/*.schema.graphql`, referenced_rules: RULE-mods-002/006
4. **`mod-seed.js.tmpl`** — `applies_to: mods/<mod>/seed/*.js`, referenced_rules: RULE-mods-008, related_tickets: TICKET-019

Cada template **MUST** tener frontmatter con los campos canonicos (id, project, scope, applies_to, consumed_by, referenced_rules, validates_against, last_validated, related_tickets, created, updated).

Las 5 rules referenciadas **MUST** ganar seccion `## Template` con link al snippet (back-reference bidireccional).

**Source_ref**: F2 + data-model.md sample data. **Confidence**: confirmed.

### REQ-F3-VALIDATE-STEP-1: Step DKC `validate-templates`

> **Que cambia**: nuevo step `prompts/steps/validate-templates.md` que ejecuta el `validates_against` (bash inline) de cada template del proyecto y reporta drift.
> **Por que**: sin mecanismo de validacion automatica, los templates se desincronizan del codigo y se vuelven stale silenciosamente.

El sistema **MUST** entregar `prompts/steps/validate-templates.md` que:

a. Recibe `project` como parametro
b. Itera todos los archivos `.tmpl` en `projects/{project}/templates/`
c. Para cada template: parsea frontmatter, extrae `validates_against`, ejecuta `bash -c "$validates_against"` desde el cwd del repo del proyecto (resuelto via `config.yaml.repo.path`)
d. Si exit code 0: actualizar frontmatter `last_validated: $(date -I)` + commit dkc-only
e. Si exit code != 0: reportar drift con archivos afectados + opciones (ajustar codigo / invocar F6 update-template / marcar override con justificacion)
f. Output: tabla de templates con status (verde/amarillo/rojo segun freshness post-validacion)

Invocacion **MUST**: manual via `/dkc validate-templates {project}` + automatica desde hook close (F4) y hook execute gate D (F5).

**Source_ref**: F3 + D2 (bash inline) + D3 (auto-update last_validated). **Confidence**: confirmed.

### REQ-F4-HOOK-CLOSE-1: Hook close bloqueante con drift template-related

> **Que cambia**: `prompts/steps/request-close.md` ejecuta validate-templates filtrado a templates cuyo `applies_to` matchea archivos modificados en el ticket. Drift bloquea cierre hasta resolver.
> **Por que**: sin enforcement en close, los templates se vuelven knowledge stale (devs no actualizan last_validated por inercia).

El sistema **MUST** entregar update a `prompts/steps/request-close.md`:

a. Antes del gate A2 actual (test cases DET-25), agregar nuevo gate A3
b. Gate A3: identificar templates cuyo `applies_to` matchea archivos en el diff del ticket (via `git diff --name-only`)
c. Para esos templates, ejecutar `validates_against`
d. Si todos exit 0: pass, marcar last_validated, continuar al gate A2
e. Si alguno exit != 0: BLOQUEAR cierre con mensaje claro:
   ```
   Gate A3 (HOR-021) — drift detectado en N templates:
   - TMPL-X: <razon>
   Opciones:
     (a) Ajustar codigo del producto al template
     (b) Invocar F6 update-template (template stale, regenerar)
     (c) Marcar override con justificacion
   ```

**Source_ref**: F4 + H4 (validable empirico). **Confidence**: inferred (H4 a validar).

### REQ-F5-HOOK-EXECUTE-1: Hook execute gate D + DET-23 dim 6 ampliacion

> **Que cambia**: `prompts/steps/request-execute.md` gate D verifica drift template-related per-task. DET-23 dim 6 (mantenibilidad) ampliada para incluir el chequeo.
> **Por que**: detectar drift en task time evita acumulacion hasta el cierre. UX mas pronta.

El sistema **MUST** entregar:

a. Update a `request-execute.md` gate D: si la task tiene `template_ref` en su contract (campo nuevo opcional en DET-20), ejecutar validate-templates filtrado al template referenciado + archivos de la task
b. Update a DET-23 dim 6 documentacion en `prompts/deterministic-rules.md`: agregar criterio "Si la session toco archivos cubiertos por templates, validar contra ellos. Drift detectado → marcar warn → gate iterate"
c. Quality review documenta el drift con razon (template stale / codigo divergente) en la tabla de dimensiones

**Source_ref**: F5 + H8 (template_ref agregable). **Confidence**: inferred.

### REQ-F6-UPDATE-STEP-1: Step `update-template`

> **Que cambia**: nuevo step `prompts/steps/update-template.md` que regenera un template desde codigo actual + actualiza last_validated + crea decision.
> **Por que**: cuando drift es legitimo (codigo evoluciono y debe ser la nueva norma), regenerar template manual sin tooling es error-prone.

El sistema **MUST** entregar `prompts/steps/update-template.md` que:

a. Recibe `project` + `template_id` como parametros
b. Identifica archivos del producto cubiertos por `applies_to` del template
c. Si hay 1 archivo unico: lo toma como source de regeneracion. Si hay N archivos: pide al dev seleccionar cual usar como source (o sintetizar)
d. Genera nuevo body del template desde el source
e. Actualiza frontmatter `last_validated` + `updated` (auto)
f. Crea archivo `projects/{project}/decisions/DEC-{seq}-template-update-{slug}.md` documentando la evolucion (que cambio + why)
g. Commit dkc-only del template actualizado + decision

**Source_ref**: F6 + D3 (manual via F6). **Confidence**: confirmed.

### REQ-F7-INDEX-SQLITE-1: Indexar templates en SQLite

> **Que cambia**: schema SQLite migration 3→4 (columna `last_validated` nullable) + MCP server `deckard_cain` acepta `record_type='template'` en todos los `dkc_*` tools.
> **Por que**: HC viewer necesita queries rapidas sobre templates (filtros por freshness, applies_to, referenced_rule). Indexar permite eso.

El sistema **MUST** entregar:

a. Migration SQL en `deckard/templates/schema.sql`: `ALTER TABLE records ADD COLUMN last_validated TEXT` + bump `schema_version: '4'` + index opcional `idx_records_type_validated`
b. Tools MCP en `deckard_cain` aceptan `type='template'` en: `dkc_index_record`, `dkc_find_records`, `dkc_get_record`, `dkc_status`, `dkc_count_records`, `dkc_search_text`, `dkc_find_by_reference`, `dkc_add_relation`
c. Indexer parsea frontmatter de templates y popula: `id`, `project`, `type='template'`, `scope`, `tags` (con applies_to embebido), `file_path`, `last_validated`, `created`, `updated`, `content_hash`
d. Relations table populada: 1 row por `referenced_rule` (`type='references_rule'`) + 1 row por `related_ticket` (`type='discovered_in'`)
e. INDEX.md de cada proyecto auto-regenerable desde SQLite (opcional v1, manual ok)

**Source_ref**: F7 + D1 (schema generico) + Session 0 Discovery #1. **Confidence**: confirmed.

### REQ-F8-VIEWER-1: HC viewer backend + frontend para templates

> **Que cambia**: HC viewer gana 1 ruta nueva (`/projects/:project/templates`), 1 route detail (`/templates/:id`), 3 componentes Vue nuevos (TemplateCard, TemplateList, TemplateDetail) + 2 atoms (TemplateBadge, FreshnessChip), 1 item nuevo en sidebar.
> **Por que**: visualizar templates con freshness y back-refs cierra el loop "knowledge ejecutable y descubrible".

El sistema **MUST** entregar:

**Backend** (`horadric-cube/server/`):
a. `routes/templates.ts` con endpoints `GET /projects/:project/templates` (listado) y `GET /projects/:project/templates/:id` (detalle)
b. `deckard/templates.ts` parser markdown + frontmatter rico (reusa `frontmatter.ts` + `body.ts` existentes)
c. Funcion `computeFreshness(last_validated)` que retorna `'fresh' | 'warm' | 'stale' | 'unknown'` segun edad
d. Funcion `resolveReferencedRules(rules)` y `resolveRelatedTickets(tickets)` que retornan links a HC views

**Frontend** (`horadric-cube/src/`):
a. `components/templates/TemplateCard.vue` — card de listado (id + descripcion + freshness chip + applies_to + referenced_rules + related_tickets)
b. `components/templates/TemplateBadge.vue` — atom chip para referenciar template en otras vistas
c. `components/templates/FreshnessChip.vue` — atom chip de freshness (verde/amarillo/rojo)
d. `views/TemplatesListView.vue` — listado con filtros (proyecto, freshness, applies_to)
e. `views/TemplateDetailView.vue` — detalle con frontmatter table + validates_against code block + body raw + back-refs clickables + boton "Validate now"
f. Router: rutas `/projects/:project/templates` y `/projects/:project/templates/:id`
g. Sidebar: item "Templates" agregado en `components/shell/AppSidebar.vue` (o equivalente)

**Source_ref**: F8 + preview.html v1 (4 escenarios). **Confidence**: confirmed.

### REQ-F9-DESIGN-TOKENS-1: Extract design tokens a sistema global HC

> **Que cambia**: los CSS variables del `preview.html` (dark mode + estados + freshness) se promueven a `src/assets/styles/tokens.css` (o equivalente global de HC) e importan globalmente.
> **Por que**: el draft validado introdujo paleta coherente — formalizarla evita drift (devs siguen agregando hardcoded en vistas nuevas).

El sistema **MUST** entregar:

a. Archivo `horadric-cube/src/assets/styles/tokens.css` con CSS custom properties: paleta dark mode (--color-bg/--color-bg-elevated/--color-bg-card/--color-border/--color-border-strong/--color-text/--color-text-muted/--color-text-dim), estados (--color-primary/--color-success/--color-warning/--color-danger + variantes -bg), radii, font families
b. Tokens importados globalmente desde el entry de Vue (main.ts o equivalente)
c. Documentacion inline de naming convention (`--color-{role}` / `--color-{role}-bg` / `--{prop}-{size}`)

**Source_ref**: F9 + draft preview.html v1 styles. **Confidence**: confirmed.

### REQ-F10-REFACTOR-VISTAS-1: Refactor vistas existentes para consumir tokens

> **Que cambia**: vistas existentes (HomeView, TicketsBoard, RecordsListView, SpecDetail, TicketDetail, RecordDetailView, ProjectOverview, CommitDiffView) + componentes (RuleBadge, commits, tickets, specs atoms, shell, dkc-blocks, teaching-blocks) consumen `var(--token)` en lugar de hardcoded.
> **Por que**: sin refactor, los tokens son sistema de facto solo para templates — el dev sigue agregando hardcoded en vistas nuevas y el design system queda fragmentado.

El sistema **MUST** entregar:

a. Refactor de cada vista listada arriba: reemplazar hex codes, rgb literals, named colors hardcoded por `var(--token)` del tokens.css
b. Conservar Tailwind utility-first para layout (margins, paddings, grid, flex) — solo migrar tokens visuales
c. Priorizacion via Q8 resolution: por uso (vistas con mas trafico primero) — HomeView, TicketsBoard, TicketDetail antes que CommitDiffView
d. Cada refactor genera screenshot before/after via Playwright (manual o automatizado segun Q9 resolution)
e. Hardcoded residual permitido solo en: assets fuente (favicons, logos), tokens.css definicion misma, css del :root

**Source_ref**: F10 + H9 (low-risk a validar). **Confidence**: inferred (H9 partial).

### REQ-F11-REGRESSION-DOCS-1: Smoke regression visual + docs design system

> **Que cambia**: smoke regression visual consolida screenshots before/after de F10, valida WCAG 2.1 AA, documenta el design system en `horadric-cube/docs/design-system.md`.
> **Por que**: cerrar HOR-021 sin docs del design system + sin smoke a11y deja el knowledge implicito — devs futuros no sabran que paleta usar para nuevas vistas.

El sistema **MUST** entregar:

a. Carpeta `tickets/HOR-021.screenshots/` con screenshots before/after por vista refactoreada (formato: `{vista}-{before|after}.png`)
b. Validacion a11y manual o automatica: WCAG 2.1 AA contraste, focus visible, keyboard nav. Tool sugerido: axe-core via Playwright o chrome-devtools MCP
c. `horadric-cube/docs/design-system.md` con: paleta canonical + naming convention + ejemplos de uso por componente + casos de uso de freshness chip
d. `horadric-cube/.ai/CONTEXT.md` actualizado con seccion "Design system" referenciando docs/design-system.md
e. Tracker comment en HOR-021 al cierre: que se hizo, decisions promovidas, learns refinados

**Source_ref**: F11 + Q9 (smoke automatico vs manual). **Confidence**: inferred (Q9 abierta).

## Coverage map

| REQ | Tasks que lo cubren | Test cases |
|-----|---------------------|-----------|
| REQ-F1-CONVENCION-1 | S2.T1, S2.T2, S2.T3, S2.T4 | TC-F1-1, TC-F1-2 |
| REQ-F2-TEMPLATES-INICIALES-1 | S3.T1, S3.T2, S3.T3, S3.T4, S3.T5 | TC-F2-1, TC-F2-2 |
| REQ-F3-VALIDATE-STEP-1 | S4.T1, S4.T2, S4.T3, S4.T4 | TC-F3-1, TC-F3-2, TC-F3-3 |
| REQ-F4-HOOK-CLOSE-1 | S8.T1, S8.T2, S8.T3 | TC-F4-1, TC-F4-2 |
| REQ-F5-HOOK-EXECUTE-1 | S9.T1, S9.T2, S9.T3 | TC-F5-1, TC-F5-2 |
| REQ-F6-UPDATE-STEP-1 | S10.T1, S10.T2, S10.T3 | TC-F6-1 |
| REQ-F7-INDEX-SQLITE-1 | S5.T1, S5.T2, S5.T3, S5.T4 | TC-F7-1, TC-F7-2, TC-F7-3 |
| REQ-F8-VIEWER-1 | S6.T1-T5 (backend), S7.T1-T6 (frontend) | TC-F8-1..8 |
| REQ-F9-DESIGN-TOKENS-1 | S12.T1, S12.T2, S12.T3 | TC-F9-1 |
| REQ-F10-REFACTOR-VISTAS-1 | S13.T1-T8 | TC-F10-1..8 (1 por vista) |
| REQ-F11-REGRESSION-DOCS-1 | S14.T1, S14.T2, S14.T3, S14.T4, S14.T5, S14.T6 | TC-F11-1, TC-F11-2 |

## Tasks

### Session 2 — Convencion DKC (F1) [tipo: auto] [tier: T0]

| # | Task | Source_ref | Rollback | Status | Session | Rules | source_ref | Files | Depends on | Validation |
| --- | ------ | ----------- | ---------- | -------- | --------- | --- | --- | --- | --- | --- |
| S2.T1 | Crear directorio `deckard/projects/horadric/templates/` (empty) — convencion empieza por horadric (proyecto activo). El espacio en up1 se materializa en S3 cuando se crean los 4 templates | REQ-F1-CONVENCION-1 (a) | rm -rf | pending | 2 | — | — | — | — | — |
| S2.T2 | Escribir `templates/README.md` documentando: que es un template, naming convention TMPL-{slug-kebab}, shape canonical frontmatter, lifecycle (creacion → consumo → validacion → actualizacion) | REQ-F1-CONVENCION-1 (b) | git rm | pending | 2 | — | — | — | — | — |
| S2.T3 | Escribir `templates/INDEX.md` con tabla vacia + nota "regenerable manual ahora; auto-gen en F7 (S5)" | REQ-F1-CONVENCION-1 (c) | git rm | pending | 2 | — | — | — | — | — |
| S2.T4 | Actualizar `deckard/DECKARD.md` seccion "Resolucion de paths" agregando: `Templates por proyecto: {deckard_path}/projects/{project}/templates/` + nota sobre opt-in (proyectos sin el dir no se afectan) | REQ-F1-CONVENCION-1 (d) | git revert | pending | 2 | — | — | — | — | — |
| **S2.GATE** | Gate sync Session 2 (tier T0 doc-only). Validacion: dir creado, README + INDEX validos, DECKARD.md actualizado, otros proyectos DKC no afectados (grep verifica). Quality review light pass (dim 6 + 7). TC-F1-1, TC-F1-2 registrados | DET-20 + DET-23 + DET-25 | n/a | pending | 2 | — | — | — | — | — |

### Session 3 — Templates iniciales up1 (F2) [tipo: auto] [tier: T1]

| # | Task | Source_ref | Rollback | Status | Session | Rules | source_ref | Files | Depends on | Validation |
| --- | ------ | ----------- | ---------- | -------- | --------- | --- | --- | --- | --- | --- |
| S3.T1 | Crear `projects/up1/templates/` + INDEX.md vacio inicial | REQ-F2-TEMPLATES-INICIALES-1 | rm -rf | pending | 3 | — | — | — | — | — |
| S3.T2 | Crear `projects/up1/templates/mod-object-definition.json.tmpl` con frontmatter rico + body extraido de rule-mods-006/007/010/017/018/020/037 ejemplos | REQ-F2-TEMPLATES-INICIALES-1 (1) | git rm | pending | 3 | — | — | — | — | — |
| S3.T3 | Crear `projects/up1/templates/mod-resolver-validated.js.tmpl` con frontmatter + body extraido de rule-mods-002/004 + rule-curriculum-design-003 + codigo real de SPEC-003/004 implementaciones | REQ-F2-TEMPLATES-INICIALES-1 (2) | git rm | pending | 3 | — | — | — | — | — |
| S3.T4 | Crear `projects/up1/templates/mod-schema-graphql.tmpl` con frontmatter + body extraido de rule-mods-002/006 ejemplos | REQ-F2-TEMPLATES-INICIALES-1 (3) | git rm | pending | 3 | — | — | — | — | — |
| S3.T5 | Crear `projects/up1/templates/mod-seed.js.tmpl` con frontmatter + body extraido de rule-mods-008 + seeds reales del mod curriculum-design (post-HU4 S15) | REQ-F2-TEMPLATES-INICIALES-1 (4) | git rm | pending | 3 | — | — | — | — | — |
| S3.T6 | Agregar seccion `## Template` con link al snippet en 5 rules: rule-mods-002, rule-mods-004, rule-mods-006, rule-mods-008, rule-curriculum-design-003. Mantener link bidireccional (template referenced_rules → rule, rule ## Template → template) | REQ-F2-TEMPLATES-INICIALES-1 last_bullet | git revert | pending | 3 | — | — | — | — | — |
| **S3.GATE** | Gate sync Session 3 (tier T1). Validacion: 4 templates parseables (frontmatter valido), 5 rules con seccion ## Template link funcional, INDEX.md de up1 actualizado manual con los 4 templates. Quality review light pass. TC-F2-1, TC-F2-2 registrados | DET-20 + DET-23 + DET-25 | n/a | pending | 3 | — | — | — | — | — |

### Session 4 — Step `validate-templates` (F3) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | Source_ref | Rollback | Status | Session | Rules | source_ref | Files | Depends on | Validation |
| --- | ------ | ----------- | ---------- | -------- | --------- | --- | --- | --- | --- | --- |
| S4.T1 | Crear `deckard/prompts/steps/validate-templates.md` con: parametros, flujo (iterar templates → parsear frontmatter → ejecutar validates_against), output (tabla de resultados) | REQ-F3-VALIDATE-STEP-1 (a)(b)(c)(f) | git rm | pending | 4 | — | — | — | — | — |
| S4.T2 | Implementar logica de auto-update last_validated: cuando exit 0, escribir frontmatter actualizado via parser. Cuando exit != 0, preservar valor anterior + reportar drift | REQ-F3-VALIDATE-STEP-1 (d)(e) | git revert | pending | 4 | — | — | — | — | — |
| S4.T3 | Tests manuales contra los 4 templates de up1: confirmar exit 0 + last_validated actualizado en frontmatter. Test sintetico de drift (modificar un archivo del codigo para que valide_against falle, verificar reporte) | REQ-F3-VALIDATE-STEP-1 + TC-F3-1..3 | revertir modificaciones sinteticas | pending | 4 | — | — | — | — | — |
| S4.T4 | Agregar comando `/dkc validate-templates {project}` al entry point `prompts/workflows/request.md` o `prompts/dkc.md` (segun donde viven los comandos) | REQ-F3-VALIDATE-STEP-1 invocacion | git revert | pending | 4 | — | — | — | — | — |
| **S4.GATE** | Gate sync Session 4 (tier T2). Validacion: step parseable, comando invocable, 4 templates de up1 verde post-validacion, drift sintetico reportado. TC-F3-1, TC-F3-2, TC-F3-3 registrados con evidence. Quality review standard pass | DET-20 + DET-23 + DET-25 + DET-27 | n/a | pending | 4 | — | — | — | — | — |

### Session 5 — Indexar templates en SQLite (F7) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | Source_ref | Rollback | Status | Session | Rules | source_ref | Files | Depends on | Validation |
| --- | ------ | ----------- | ---------- | -------- | --------- | --- | --- | --- | --- | --- |
| S5.T1 | Aplicar migration aditiva: `ALTER TABLE records ADD COLUMN last_validated TEXT` + bump schema_version 3→4 en `deckard/templates/schema.sql` | REQ-F7-INDEX-SQLITE-1 (a) | drop column + revert schema_version | pending | 5 | — | — | — | — | — |
| S5.T2 | Extender MCP server `deckard_cain` para aceptar `type='template'` en `dkc_index_record`, `dkc_find_records`, `dkc_get_record`, `dkc_status`, `dkc_count_records`, `dkc_search_text`, `dkc_find_by_reference`, `dkc_add_relation` | REQ-F7-INDEX-SQLITE-1 (b) | git revert | pending | 5 | — | — | — | — | — |
| S5.T3 | Indexer parsea frontmatter de templates y popula records + relations (referenced_rules como type='references_rule', related_tickets como type='discovered_in') | REQ-F7-INDEX-SQLITE-1 (c)(d) | DELETE FROM records WHERE type='template' | pending | 5 | — | — | — | — | — |
| S5.T4 | Indexar manualmente los 4 templates de up1 + verificar via `dkc_find_records(record_type='template', project='up1')` retorna los 4 | REQ-F7-INDEX-SQLITE-1 (c)(d) + TC-F7-1..3 | re-run indexer post-fix | pending | 5 | — | — | — | — | — |
| **S5.GATE** | Gate sync Session 5 (tier T2, ⚑ fuerte). Validacion: migration aplicada (schema_version=4), 4 templates indexados, relations populated, otros records (tickets/specs/rules) sin afectacion. TC-F7-1, TC-F7-2, TC-F7-3 registrados. Quality review standard pass | DET-20 + DET-23 + DET-25 + DET-27 | n/a | pending | 5 | — | — | — | — | — |

### Session 6 — HC backend (F8a) [tipo: auto] [tier: T2]

| # | Task | Source_ref | Rollback | Status | Session | Rules | source_ref | Files | Depends on | Validation |
| --- | ------ | ----------- | ---------- | -------- | --------- | --- | --- | --- | --- | --- |
| S6.T1 | Crear `horadric-cube/server/deckard/templates.ts` parser markdown + frontmatter rico (reusa `frontmatter.ts` + `body.ts`) | REQ-F8-VIEWER-1 backend (b) | git rm | pending | 6 | — | — | — | — | — |
| S6.T2 | Implementar `computeFreshness(last_validated)` → `'fresh' | 'warm' | 'stale' | 'unknown'` (< 7d / 7-30d / > 30d / null) | REQ-F8-VIEWER-1 backend (c) | git revert | pending | 6 | — | — | — | — | — |
| S6.T3 | Implementar `resolveReferencedRules(rules)` y `resolveRelatedTickets(tickets)` retornando links a vistas HC | REQ-F8-VIEWER-1 backend (d) | git revert | pending | 6 | — | — | — | — | — |
| S6.T4 | Crear `horadric-cube/server/routes/templates.ts` con endpoints GET `/projects/:project/templates` (listado) y GET `/projects/:project/templates/:id` (detalle). Reusar `listRecords` + `getRecord` de SQLite | REQ-F8-VIEWER-1 backend (a) | git rm | pending | 6 | — | — | — | — | — |
| S6.T5 | Tests integration: endpoints retornan datos correctos para up1 + freshness computado + back-refs presentes. TC-F8-1..4 (backend) registrados con evidence | REQ-F8-VIEWER-1 + TC-F8-1..4 | n/a | pending | 6 | — | — | — | — | — |
| **S6.GATE** | Gate sync Session 6 (tier T2 auto). Endpoints retornan JSON correcto, parser maneja frontmatter rico, freshness computado correctamente, tests integration pass. Quality review standard | DET-20 + DET-23 + DET-25 + DET-27 | n/a | pending | 6 | — | — | — | — | — |

### Session 7 — HC frontend (F8b) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | Source_ref | Rollback | Status | Session | Rules | source_ref | Files | Depends on | Validation |
| --- | ------ | ----------- | ---------- | -------- | --------- | --- | --- | --- | --- | --- |
| S7.T1 | Crear `src/components/templates/FreshnessChip.vue` atom (verde/amarillo/rojo segun edad) | REQ-F8-VIEWER-1 frontend (c) | git rm | pending | 7 | — | — | — | — | — |
| S7.T2 | Crear `src/components/templates/TemplateBadge.vue` atom (chip con id + freshness) | REQ-F8-VIEWER-1 frontend (b) | git rm | pending | 7 | — | — | — | — | — |
| S7.T3 | Crear `src/components/templates/TemplateCard.vue` (card de listado) | REQ-F8-VIEWER-1 frontend (a) | git rm | pending | 7 | — | — | — | — | — |
| S7.T4 | Crear `src/views/TemplatesListView.vue` con filtros (proyecto, freshness, applies_to). Reusar grid + Tailwind del preview.html | REQ-F8-VIEWER-1 frontend (d) | git rm | pending | 7 | — | — | — | — | — |
| S7.T5 | Crear `src/views/TemplateDetailView.vue` con frontmatter table + validates_against code block + body raw + back-refs + boton "Validate now" (opcional segun Q seguimiento) | REQ-F8-VIEWER-1 frontend (e) | git rm | pending | 7 | — | — | — | — | — |
| S7.T6 | Routing: agregar `/projects/:project/templates` y `/projects/:project/templates/:id`. Sidebar: agregar item "Templates" en `components/shell/AppSidebar.vue` | REQ-F8-VIEWER-1 frontend (f)(g) | git revert | pending | 7 | — | — | — | — | — |
| S7.T7 | Smoke E2E: levantar HC viewer, navegar a /horadric/templates (cuando no hay templates indexados aun) y /up1/templates (con 4 templates). Verificar listado + detail render correcto. TC-F8-5..8 (frontend) registrados | REQ-F8-VIEWER-1 + TC-F8-5..8 | n/a | pending | 7 | — | — | — | — | — |
| **S7.GATE** | Gate sync Session 7 (tier T3 ⚑ fuerte). Quality review exhaustive (10 dims incluyendo a11y WCAG 2.1 AA). Vista listado funcional, detalle renderiza, back-refs clickables, sidebar item visible. TC-F8-1..8 todos con Actual + Evidence | DET-20 + DET-23 + DET-25 + DET-27 | n/a | pending | 7 | — | — | — | — | — |

### Session 8 — Hook close (F4) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | Source_ref | Rollback | Status | Session | Rules | source_ref | Files | Depends on | Validation |
| --- | ------ | ----------- | ---------- | -------- | --------- | --- | --- | --- | --- | --- |
| S8.T1 | Update `deckard/prompts/steps/request-close.md` insertando gate A3 (validate-templates) antes del gate A2 (test cases) | REQ-F4-HOOK-CLOSE-1 (a) | git revert | pending | 8 | — | — | — | — | — |
| S8.T2 | Implementar logica filtrado: `git diff --name-only` del ticket vs `applies_to` glob de cada template. Solo validar templates relevantes a archivos modificados | REQ-F4-HOOK-CLOSE-1 (b)(c)(d) | git revert | pending | 8 | — | — | — | — | — |
| S8.T3 | Implementar mensaje de bloqueo con opciones (ajustar codigo / F6 update-template / override). Tests sinteticos: simular drift en archivos del ticket, verificar bloqueo. TC-F4-1, TC-F4-2 registrados | REQ-F4-HOOK-CLOSE-1 (e) + TC-F4-1..2 | revertir modificaciones sinteticas | pending | 8 | — | — | — | — | — |
| **S8.GATE** | Gate sync Session 8 (tier T2 ⚑ fuerte). H4 validada empirico: medir tiempo de resolucion via F6. Si < 30s OK; si > minutos, re-disenar como warning soft-block. Quality review standard | DET-20 + DET-23 + DET-25 + DET-27 | n/a | pending | 8 | — | — | — | — | — |

### Session 9 — Hook execute gate D + DET-23 dim 6 (F5) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | Source_ref | Rollback | Status | Session | Rules | source_ref | Files | Depends on | Validation |
| --- | ------ | ----------- | ---------- | -------- | --------- | --- | --- | --- | --- | --- |
| S9.T1 | Update `deckard/prompts/steps/request-execute.md` gate D: verificar si task tiene `template_ref` en su contract, si si ejecutar validate-templates del template referenciado | REQ-F5-HOOK-EXECUTE-1 (a) | git revert | pending | 9 | — | — | — | — | — |
| S9.T2 | Update DET-23 dim 6 documentacion en `deckard/prompts/deterministic-rules.md`: agregar criterio de conformance con templates | REQ-F5-HOOK-EXECUTE-1 (b) | git revert | pending | 9 | — | — | — | — | — |
| S9.T3 | Tests sinteticos: task con `template_ref` sin drift → gate continue. Task con drift → gate iterate + dim 6 warn. TC-F5-1, TC-F5-2 registrados | REQ-F5-HOOK-EXECUTE-1 (c) + TC-F5-1..2 | revertir modificaciones | pending | 9 | — | — | — | — | — |
| **S9.GATE** | Gate sync Session 9 (tier T2 ⚑ fuerte). Hook funcional, DET-23 dim 6 ampliada, tests pasan. Quality review standard | DET-20 + DET-23 + DET-25 + DET-27 | n/a | pending | 9 | — | — | — | — | — |

### Session 10 — Step `update-template` (F6) [tipo: auto] [tier: T1]

| # | Task | Source_ref | Rollback | Status | Session | Rules | source_ref | Files | Depends on | Validation |
| --- | ------ | ----------- | ---------- | -------- | --------- | --- | --- | --- | --- | --- |
| S10.T1 | Crear `deckard/prompts/steps/update-template.md` con flujo (identificar archivos del producto → seleccionar source → regenerar body → actualizar frontmatter) | REQ-F6-UPDATE-STEP-1 (a)(b)(c)(d) | git rm | pending | 10 | — | — | — | — | — |
| S10.T2 | Implementar creacion automatica de `DEC-{seq}-template-update-{slug}.md` en `projects/{project}/decisions/` documentando la evolucion del template | REQ-F6-UPDATE-STEP-1 (e)(f) | git revert | pending | 10 | — | — | — | — | — |
| S10.T3 | Test sintetico: modificar uno de los 4 templates de up1 (introducir drift), invocar F6, verificar regenerado correcto + last_validated actualizado + decision creada. TC-F6-1 registrado | REQ-F6-UPDATE-STEP-1 (g) + TC-F6-1 | revertir modificaciones | pending | 10 | — | — | — | — | — |
| **S10.GATE** | Gate sync Session 10 (tier T1 auto). Step funcional, decisions auto-creadas, smoke OK. Quality review light pass | DET-20 + DET-23 + DET-25 + DET-27 | n/a | pending | 10 | — | — | — | — | — |

### Session 11 — Smoke E2E templates + walkthrough HC viewer [tipo: ⚑ fuerte] [tier: T3]

| # | Task | Source_ref | Rollback | Status | Session | Rules | source_ref | Files | Depends on | Validation |
| --- | ------ | ----------- | ---------- | -------- | --------- | --- | --- | --- | --- | --- |
| S11.T1 | E2E completo: levantar DKC + HC viewer. Validar 4 templates de up1 verde (validate-templates + freshness chip verde en HC) | REQ-F1-CONVENCION-1 + REQ-F2 + REQ-F3 + REQ-F7 + REQ-F8 | n/a | pending | 11 | — | — | — | — | — |
| S11.T2 | Walkthrough HC viewer: navegar sidebar → Templates → seleccionar TMPL-mod-resolver-validated → ver detail con frontmatter + back-refs → click en RULE-mods-002 → ver rule detail (cross-navigation OK) | REQ-F8-VIEWER-1 frontend | n/a | pending | 11 | — | — | — | — | — |
| S11.T3 | Smoke hooks: simular ticket en up1 que toque `mods/*/logic/*.resolver.js`, intentar close, verificar gate A3 ejecuta validate-templates, drift sintetico bloquea | REQ-F4-HOOK-CLOSE-1 + REQ-F5-HOOK-EXECUTE-1 | revertir simulaciones | pending | 11 | — | — | — | — | — |
| S11.T4 | Test idempotencia: re-correr validate-templates, verificar last_validated se actualiza pero contenido no cambia | REQ-F3-VALIDATE-STEP-1 (d) | n/a | pending | 11 | — | — | — | — | — |
| **S11.GATE** | Gate sync Session 11 (tier T3 ⚑ fuerte). E2E completo verde, walkthrough sin friccion, hooks funcionan. Quality review exhaustive (10 dims). Decision: continue → S12 (scope expansion F9-F11). Si emerge riesgo de ingobernabilidad, aplicar DET-12 (escalar a split, F9-F11 → HOR-022) | DET-20 + DET-23 + DET-25 + DET-27 + DET-12 (potencial) | n/a | pending | 11 | — | — | — | — | — |

### Session 12 — Extract design tokens (F9) [tipo: auto] [tier: T1]

| # | Task | Source_ref | Rollback | Status | Session | Rules | source_ref | Files | Depends on | Validation |
| --- | ------ | ----------- | ---------- | -------- | --------- | --- | --- | --- | --- | --- |
| S12.T1 | Crear `horadric-cube/src/assets/styles/tokens.css` con CSS custom properties extraidas del preview.html v1: dark mode tokens + estados + radii + font families | REQ-F9-DESIGN-TOKENS-1 (a) | git rm | pending | 12 | — | — | — | — | — |
| S12.T2 | Importar `tokens.css` globalmente desde el entry de Vue (main.ts o equivalente). Verificar que se carga antes de tailwind + componentes | REQ-F9-DESIGN-TOKENS-1 (b) | git revert | pending | 12 | — | — | — | — | — |
| S12.T3 | Documentar inline naming convention en tokens.css (`--color-{role}` / `--color-{role}-bg` / `--{prop}-{size}`). Smoke: vistas existentes siguen renderizando OK pre-refactor (regression base) | REQ-F9-DESIGN-TOKENS-1 (c) + TC-F9-1 | git revert | pending | 12 | — | — | — | — | — |
| **S12.GATE** | Gate sync Session 12 (tier T1 auto). Tokens canonicos definidos, importados globalmente, regression pre-refactor OK. TC-F9-1 registrado. Quality review light pass | DET-20 + DET-23 + DET-25 + DET-27 | n/a | pending | 12 | — | — | — | — | — |

### Session 13 — Refactor vistas existentes (F10) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | Source_ref | Rollback | Status | Session | Rules | source_ref | Files | Depends on | Validation |
| --- | ------ | ----------- | ---------- | -------- | --------- | --- | --- | --- | --- | --- |
| S13.T1 | Refactor HomeView + ProjectOverview (priorizacion alta: vistas de entrada) | REQ-F10-REFACTOR-VISTAS-1 (a)(c) | git revert | pending | 13 | — | — | — | — | — |
| S13.T2 | Refactor TicketsBoard + TicketDetail | REQ-F10 | git revert | pending | 13 | — | — | — | — | — |
| S13.T3 | Refactor RecordsListView + RecordDetailView | REQ-F10 | git revert | pending | 13 | — | — | — | — | — |
| S13.T4 | Refactor SpecDetail | REQ-F10 | git revert | pending | 13 | — | — | — | — | — |
| S13.T5 | Refactor CommitDiffView | REQ-F10 | git revert | pending | 13 | — | — | — | — | — |
| S13.T6 | Refactor RuleBadge + commits atoms + tickets atoms + specs atoms | REQ-F10 | git revert | pending | 13 | — | — | — | — | — |
| S13.T7 | Refactor dkc-blocks renderers + teaching-blocks renderers | REQ-F10 | git revert | pending | 13 | — | — | — | — | — |
| S13.T8 | Refactor shell (AppSidebar + AppTopbar si existe). Smoke por vista: screenshot before/after consolidado. TC-F10-1..8 registrados (1 por vista/grupo) | REQ-F10 + TC-F10-1..8 | git revert | pending | 13 | — | — | — | — | — |
| **S13.GATE** | Gate sync Session 13 (tier T3 ⚑ fuerte). Quality review exhaustive. Cada vista refactoreada documentada con before/after, hardcoded eliminado, a11y WCAG AA preservada. TC-F10-1..8 todos pass | DET-20 + DET-23 + DET-25 + DET-27 | n/a | pending | 13 | — | — | — | — | — |

### Session 14 — Smoke regression visual + docs design system + cierre [tipo: ⚑ fuerte] [tier: T3]

| # | Task | Source_ref | Rollback | Status | Session | Rules | source_ref | Files | Depends on | Validation |
| --- | ------ | ----------- | ---------- | -------- | --------- | --- | --- | --- | --- | --- |
| S14.T1 | Consolidar screenshots before/after en `tickets/HOR-021.screenshots/` (estructura: `{vista}-{before | after}.png`) | REQ-F11-REGRESSION-DOCS-1 (a) | git rm | pending | 14 | — | — | — | — | — |
| S14.T2 | Validacion a11y manual o automatica (axe-core via chrome-devtools MCP o Playwright segun Q9 resolution): contraste WCAG 2.1 AA, focus visible, keyboard nav. TC-F11-1 registrado | REQ-F11-REGRESSION-DOCS-1 (b) + TC-F11-1 | n/a | pending | 14 | — | — | — | — | — |
| S14.T3 | Crear `horadric-cube/docs/design-system.md` con paleta canonical + naming convention + ejemplos de uso + casos de uso de freshness chip | REQ-F11-REGRESSION-DOCS-1 (c) | git rm | pending | 14 | — | — | — | — | — |
| S14.T4 | Actualizar `horadric-cube/.ai/CONTEXT.md` con seccion "Design system" referenciando docs/design-system.md. TC-F11-2 registrado | REQ-F11-REGRESSION-DOCS-1 (d) + TC-F11-2 | git revert | pending | 14 | — | — | — | — | — |
| S14.T5 | Tracker comment en HOR-021 (Confluence/Jira si aplica) o resumen exhaustivo en summary del ticket: que se hizo, decisions promovidas (D1-D5), learns refinados, RULE-dkc nueva si emerge (probable: rule sobre patron de templates project-scoped) | REQ-F11-REGRESSION-DOCS-1 (e) | git revert | pending | 14 | — | — | — | — | — |
| S14.T6 | Pre-cierre: completar Test cases table consolidada (todos los TC con Actual + Evidence), validar cobertura 5 ejes en teach-close (DET-22), preparar PR descriptions si aplica | REQ-F11-REGRESSION-DOCS-1 + DET-25 + DET-22 | n/a | pending | 14 | — | — | — | — | — |
| **S14.GATE** | Gate sync FINAL Session 14 (tier T3 ⚑ fuerte). Quality review exhaustive (10 dims). Decision: continue → request-close (teach-close + frontmatter status → closed). Pre-cierre validado | DET-20 + DET-23 + DET-25 + DET-27 + DET-22 | n/a | pending | 14 | — | — | — | — | — |

## Backlog

| ID | Item | Priority | Estado | Que existe | Como retomar |
|----|------|----------|--------|------------|--------------|
| _(populado durante execute si emerge trabajo fuera del scope inicial)_ |

## Acceptance checkpoints

- [ ] **Convencion**: `projects/{project}/templates/` documentada en DECKARD.md, README + INDEX validos
- [ ] **Templates iniciales**: 4 templates en up1 con frontmatter valido + back-refs en 5 rules
- [ ] **Validacion**: step `validate-templates` funcional, comando `/dkc validate-templates` operativo
- [ ] **SQLite**: schema_version=4, 4 templates indexados, dkc_find_records(record_type='template') retorna los 4
- [ ] **HC viewer**: sidebar item Templates + TemplatesListView + TemplateDetailView funcionando, freshness chip correcto
- [ ] **Hooks**: close bloqueante drift template-related funcional, execute gate D + DET-23 dim 6 ampliada
- [ ] **Update**: step `update-template` regenera template + crea decision
- [ ] **Smoke**: 4 templates verde, walkthrough HC sin friccion, hooks operativos
- [ ] **Design system**: tokens.css importado globalmente, 8+ vistas refactoreadas, zero regression visual
- [ ] **Docs**: docs/design-system.md + .ai/CONTEXT.md actualizados
- [ ] **Cierre**: teach-close producido, status=closed, frontmatter completo

## Decisions

| ID | Decision | Driver | Alternativa descartada | Source |
|----|----------|--------|------------------------|--------|
| D1 | SQLite schema generico (migration aditiva 3→4 + columna last_validated nullable) | Consistencia DKC + cero breaking changes | Tabla `templates` tipada nueva | Session 0 Discovery #1 |
| D2 | `validates_against` es bash inline en frontmatter | Idiomatic DKC + ejecutable directo | DSL declarativa / AST parsing | Session 0 Discovery #2 |
| D3 | `last_validated` auto-update en F3 al pasar; manual via F6 al regenerar | Validacion sin friccion + signal claro de freshness | Solo manual | Session 0 Discovery #3 |
| D4 | Body del template en code block raw con syntax highlight (NO markdown rendered) | Template es codigo ejecutable, preservar formato exacto | Markdown rendered | Draft v1 aprobado (Q6 resuelta) |
| D5 | Redesign visual del draft se promueve a sistema global HC | Aprovechar paleta coherente + evitar drift en vistas futuras | Split a HOR-022 / decision capturada sin compromiso | Session 1 Scope expansion |

## Open questions remanentes

| # | Pregunta | Bloquea? | Cuando se resuelve |
|---|----------|----------|---------------------|
| Q2 | `template_ref` opcional vs requerido en design-feature cuando work_type es implement | no | En S9 design o cuando aplique caso real |
| Q4 | Otros proyectos DKC adoptan ahora o solo up1 prueba el patron? | no | Opt-in — decision por proyecto post-HOR-021 cerrado |
| Q7 | `consumed_by` informativo vs parseable strict | no | S4 design — default soft |
| Q8 | Priorizacion refactor vistas: por uso vs por riesgo | si — bloquea S13 design | S12 → S13 transicion |
| Q9 | Smoke regression visual automatizado (Playwright+percy) vs manual | no | S14 — segun setup existente de tests en HC |

## Source

- Ticket: [HOR-021](../tickets/HOR-021.md)
- Teach-intake: [HOR-021.teach/teach-intake.md](../tickets/HOR-021.teach/teach-intake.md)
- Design-draft v1: [HOR-021.draft/](../tickets/HOR-021.draft/) — `intent.md` + `preview.html` + `data-model.md`
- Sessions previas: Session 0 (Discovery) + Session 1 (Scope expansion) en el ticket markdown
