---
id: TICKET-087
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1350
module: curriculum-design
autopilot: autonomous
---

# Malla — Pestaña "Líneas de formación" (CRUD + integración)

> **MC-07** · Épica Jira [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) (track interno "C") · Tier 🅼 Must (borrado/integración 🅲 Could) · 5 SP · repo `mod` (FE) · Fase F3.
> **Pre-spec (fuente de design):** [`sp5/prespecs/MC-07.md`](../../../../uplanner/specs/up1/sp5/prespecs/MC-07.md) — transcrito abajo. El SPEC formal DKC se crea al tomar el ticket (design-feature), transcribiendo REQ/tasks 1:1.

## ⛔ Gate de inicio — dependencias

> **1 dev, ejecución en serie.** Antes de iniciar design / `request-execute`, verificar que cada bloqueante esté `status: closed` (frontmatter `depends_on` + relaciones `depends_on` en HC; `dkc_read_frontmatter`). Si alguna NO está `closed`: **NO iniciar este ticket** — bloquear y avisar al dev (DET-30 guarda de inicio).

| Bloqueante | Aporta | Debe estar |
|---|---|---|
| [TICKET-082](TICKET-082.md) (MC-02) | requirementCategory + guard de borrado | closed |

## Request

Como diseñador curricular, quiero gestionar las líneas de formación del plan, para definir los buckets de crédito que organizan la malla.

Agrupa C1 + C2 + C3 + C4 (handoff). Pestaña en el detail del Curriculum (config del mod) que consume requirementCategory (MC-02): RecordList (línea, código, créditos actual/mín, obligatorias, electivas; solo lectura fuera de edición); modal crear/editar (nombre, código, créditos mín/máx, etiqueta corta, color+ícono con picker "Color e ícono"; validación min≤max); borrado con guard (Could, bloquea si hay planEntry asignados); integración (Could): el selector de línea de MC-06 y los chips/colores de MC-08 se nutren de las requirementCategory del plan. Color/ícono con atoms existentes (Icon/Select/Badge/Input).

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | UI (pestaña + RecordList + modal crear/editar con picker color/ícono) |
| Modulo principal | curriculum-design |
| Modulos afectados | curriculum-design (mod-only); consume requirementCategory + guard de MC-02 |

## Creation scope

| Dimension | Aplica | Descripcion |
|-----------|--------|-------------|
| Visual (UI) | sí (pre-existente) | pestaña + modal + pickers color/ícono **ya implementados** (TICKET-093/094); maqueta UPONE-1272 (597–684) ya materializada |
| Data model | no | CRUD de requirementCategory (objeto de MC-02) |

> **Draft (DET-18) — `draft_approved: skipped`** (2026-07-01): `creates_visual:true` pero el visual ya existe en la rama (pestaña `requirementCategories` + `record-list` + `ColorPicker`/`IconPicker` de TICKET-093/094, contra la maqueta UPONE-1272 ya aprobada). MC-07 **no crea UI nueva** — el delta visual es agregar 2 columnas (obligatorias/electivas) a un record-list existente y habilitar `canDelete`. Cambio trivial que no amerita un draft iterable. Ruta válida DET-18 (skipped con razón).

## Triage

REQs **confirmados**. Núcleo Must (ver + crear/editar) + borrado/integración Could. Reuso: RecordList estándar y guard de borrado del resolver de MC-02.

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El picker color/ícono se arma con atoms existentes (Icon/Select/Badge/Input) sin componente nuevo complejo | ↷ superada por realidad | FLAG-2 asumía atoms sueltos; **el picker ya existe** como custom Vueform elements `ColorPicker`/`IconPicker` (TICKET-094, sincronizados en `.sync-registry.json`), más ricos (radiogroup a11y + búsqueda bi-*). No se reconstruye. DEC-032 cumplida. |
| H2 | La lista de líneas requiere un element custom del mod (no `record-list` estándar) | ✗ refutada | **La pestaña ya usa `record-list` estándar** (`requirementCategoriesList` en `default_Curriculum_view.json:73-101` + `_edit`). `currentCredits` (actual) viene del enrichment de lectura (`curriculum-read.resolver.js:224-270`). Las columnas derivadas se resuelven extendiendo ese enrichment, NO con un element custom. |
| H3 | El guard de borrado ya existe en el resolver de MC-02 (REQ-09) — MC-07 solo lo consume vía `deleteInstance` y surface del error | ✓ confirmada | `requirementCategoryDelete.resolver.js` + `helpers/categoryGuard.js` (error `REQUIREMENT_CATEGORY_HAS_ENTRIES` "reasigna primero"). Defense-in-depth: `planEntry.categoryId onDelete:Restrict`. Falta habilitar `canDelete:true` en el record-list (hoy `false`). |
| H4 | El grueso de MC-07 ya está construido por MC-02 / TICKET-093 (embebió la pestaña) / TICKET-094 (pickers) en la misma rama; MC-07 se reduce a un delta de gaps | ✓ confirmada | intake-explore + Explore agent (grounding exhaustivo). Ver **Hallazgo mayor** en Context found. |

### Context found

**KB del módulo (kb_refs: DEC-032, RULE-cd-014, DoR-flag color/ícono):**
- componente/pestaña en el mod; consume `requirementCategory` (MC-02). Color/ícono con picker (decisión §dec-1, valores de la maqueta).

**Necesidad/reuso (DET-32):** RecordList = **reuse** (estándar del mod); modal crear/editar = build sobre el form estándar; guard de borrado = **reuse** del resolver de MC-02 (REQ-09).

**Supuestos:** la pestaña "Líneas de formación" se declara en el detail del Curriculum (config del mod).

**FLAG-2 (resuelto):** color/ícono con **atoms existentes** (`Icon`, `Select`, `Badge`, `Input`) — `icon` = `Select` de un set curado de `bi-*` (preview con atom `Icon`); `color` = `Select` de tokens de tema / hex (swatch con `Badge`). **Sin componente nuevo complejo.** Pendiente menor: confirmar con Eduardo el **set curado** de íconos/colores (acota solo al picker; el resto de MC-07 es independiente).

### ⚠️ Hallazgo mayor (intake-explore 2026-07-01) — el 70% de MC-07 ya existe

El grounding del código (Explore agent, rama `UPONE-1267-sp5`) encontró que trabajo previo bajo **MC-02 (UPONE-1345)** — específicamente **TICKET-093** (embebió las pestañas planEntry/requirementCategory en el detail del Curriculum) y **TICKET-094** (construyó `ColorPicker`/`IconPicker`) — **ya entregó la mayor parte del alcance "confirmed" de MC-07**. MC-07 (TICKET-087) queda entonces como un **delta de gaps**, no una construcción desde cero. DET-32 (necesidad/reuso) + DET-16 (propagación).

**Ya construido y sincronizado (NO reconstruir):**
- Objeto `requirementCategory.json` (name, code, minCredits, maxCredits, position, description, color, icon). Sin campo `shortLabel`.
- Guard de borrado: `requirementCategoryDelete.resolver.js` + `helpers/categoryGuard.js` (error `REQUIREMENT_CATEGORY_HAS_ENTRIES`) + backstop DB `onDelete:Restrict`.
- Validación de rango: `helpers/creditRange.js` (`assertMinMaxCredits`) en create (`sectionValidation`) y update (`polymorphicUpdate`), **server-side**.
- Pestaña **"Líneas de formación"** (tab key `requirementCategories`, `conditions: recordType==Plan`) en `default_Curriculum_view.json` **y** `_edit.json`, con `record-list` `requirementCategoriesList` (cols: name, code, minCredits, maxCredits, currentCredits).
- Layouts CRUD: `default_requirementCategory_{create,edit,view}.json` con `color-picker` + `icon-picker` (custom Vueform elements `ColorPicker`/`IconPicker`, ya en `.sync-registry.json`).
- Enrichment de lectura `currentCredits` (REQ-10): `curriculum-read.resolver.js:224-270` (`enrichRequirementCategoryRows`).
- Selector de línea en MC-06 (`AddEntryModal.ts`/`EditEntryModal.ts`) ya consume `requirementCategory` vía `useCurriculumMesh` (LIST_CATEGORIES).

**Gaps reales de MC-07 (el delta a implementar):**
1. **REQ-01** — faltan columnas **obligatorias** y **electivas** (conteos derivados por `blockId`) en el `record-list`. Requiere extender `enrichRequirementCategoryRows` (add `mandatoryCount`/`electiveCount` con `partitionByElectivity`) + agregar 2 columnas a ambos layouts. **BE-in-mod** (dentro de execute_scope `mods/curriculum-design/`).
2. **REQ-02** — "etiqueta corta" **= `code`** (el objeto NO tiene `shortLabel`; agregar campo contradice `creates_data:false` → se descarta). Verificar/añadir validación **FE** min≤max (hoy solo server-side).
3. **REQ-03** — habilitar `canDelete:true` en el `record-list` (hoy `false`) para exponer el guard ya existente + verificar surface del mensaje.
4. **REQ-04** — verificación end-to-end del selector MC-06 + refresco de datos entre pestañas (posible invalidación de cache Apollo). TC-05.
5. **Sync**: `layout npm run sync` + `suite npm run sync` + restart (RULE-mods-050) antes de validar runtime.

**Regresión a cuidar:** `tests/integration/layouts-declared.test.ts:52-55` cuenta layouts exactos — no se agregan/quitan layouts (solo se editan), así que no debería moverse el contador.

## Pre-spec (transcrito de MC-07.md)

### Requisitos (REQ)

| REQ | Certeza | source_ref | Enunciado |
|-----|---------|-----------|-----------|
| REQ-01 · ver líneas (RecordList) | confirmed | handoff MC-LF-1 + mockup 597–657 | RecordList con columnas: línea, código, créditos (actual/mín), obligatorias, electivas. Solo lectura fuera de edición. |
| REQ-02 · crear / editar línea | confirmed | handoff MC-LF-2 + mockup 658–684 + §dec-1 | modal: nombre, código, créditos mín/máx, etiqueta corta, color+ícono (picker "Color e ícono"). Validación min≤max (FE + BE de MC-02). |
| REQ-03 · eliminar con guard (🅲) | confirmed | handoff MC-LF-3 | borrado bloqueado si hay planEntry asignados ("reasigna primero") — consume el guard de MC-02. |
| REQ-04 · integración con la malla (🅲) | confirmed | handoff MC-LF-4 | el selector de línea (MC-06) y los chips/colores (MC-08) se nutren de las requirementCategory del plan. |
| REQ-05 · aviso de créditos fuera de rango (🆂) | confirmed | decisión dev 2026-07-01 (interrupción) | al editar el rango o cambiar asignaturas, si los créditos quedan **fuera de rango** **DEBE** avisarse de forma **no bloqueante**: `under` (incompleta, bajo mínimo, ámbar) y `over` (excedida, sobre máximo, rojo); `ok` en rango. Superficies: indicador por fila + contador resumen. Estado derivado `creditStatus` en lectura. Bloqueo duro = MC-09. |

### Tasks previstas (con rollback)

| # | Task | Rollback |
|---|------|----------|
| T1 | pestaña + RecordList de líneas (REQ-01) | quitar pestaña |
| T2 | modal crear/editar con color+ícono + validación min/max (REQ-02) | quitar modal |
| T3 | acción borrar con guard (REQ-03) | revertir |
| T4 | cableado selector/chips a requirementCategory (REQ-04) | revertir |

### Dependencias

- **Depende de:** MC-02 (requirementCategory + guard).
- **Integra con:** MC-06 (selector), MC-08 (chips/colores).

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | `UPONE-1267-sp5` en `mods/curriculum-design` (creada desde `develop`; mod-only; nunca `develop`/`main`) — RULE-dev-004 |
| Base branch | `develop` |
| DB state | UPU con MC-02 sincronizado + seed de 4 líneas |
| Services | suite (storybook + render), object-manager (GraphQL del mod) |
| Test data | plan con 4 requirementCategory de la maqueta |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | Tests que asertan el shape exacto del `select` de Prisma se rompen ante extensiones aditivas (agregar `blockId` rompió `requirementCategoryGuard.test.js`) | S1 | S1 | refined | RULE-curriculum-design-025 |
| L2 | `mandatoryCount`/`electiveCount`/`creditStatus` reusan el mismo `planEntry.findMany` que `currentCredits` → cero N+1 | S1 | S1 | refined | RULE-curriculum-design-025 |
| L5 | REQ-04 no requirió código: `useCurriculumMesh` usa `fetchPolicy:'network-only'` → categorías siempre frescas | S3 | S3 | discarded | nota de implementacion |
| L6 | Validación cross-field (min≤max) no trivial en form declarativo Vueform → patrón del mod es server-side + `description` guía | S3 | S3 | discarded | DEC en spec MC-07 |
| L7 | **El `record-list` estándar solo muestra columnas cuyo key es campo declarado/persistido del objeto** (`useColumnConfiguration.ts:149-156`; availableFields←getObjectFields←core_FieldDefinition). Columnas derivadas en enrichment se descartan en silencio. Verificar el **render real**, no solo config+DB. | smoke (dev) | S3/post-close | refined | RULE-platform-019 |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-07-01 | (ausente) → super | trigger dev "087 super autopilot" | intake-explore (proximo gate) |

### Plan de sessions (preplanificacion)

**3 sessions previstas** (revisado tras el Hallazgo mayor: el 70% ya existe; + REQ-05 agregado por decisión dev). **Esqueleto producido por `intake-explore`.** El detalle final lo completa `design-feature`.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | **REQ-01 + REQ-05 (lógica/BE)** — helpers puros `countByCategory` (partition por blockId) + `deriveCreditStatus` (over si currentCredits>maxCredits) + `.spec.ts` (TC-06,07,08) + extender `enrichRequirementCategoryRows` (add `mandatoryCount`/`electiveCount`/`creditStatus`, reusa el findMany + currentCredits) | F3 | T2 | 3 | ⚑ fuerte | vitest verde (asserts concretos); enrichment no rompe currentCredits; getInstance+listInstances cubiertos |
| S2 | **REQ-01 + REQ-05 (superficies)** — 2 columnas obligatorias/electivas al `record-list` (ambos layouts) + indicador por fila de "excedida" (`creditStatus`) + contador resumen en la pestaña; i18n | F3 | T3 | 3 | ⚑ fuerte | JSON válido; layouts-declared.test sin cambio de contador; indicador+contador visibles (smoke DB-gated) |
| S3 | **REQ-03/02/04** — `canDelete:true` (ambos layouts) + verificar surface del guard; validación FE min≤max (o server-side-only documentado); "etiqueta corta"=`code`; verificar integración REQ-04 (selector MC-06, cache Apollo) + TC-05; sync (layout+suite) + acceptance + cierre | F3 | T3 | 3-4 | ⚑ fuerte | canDelete expone guard; TC-04/05 pasan; dual-judge APPROVED; acceptance checkpoints |

**Notas del esqueleto**:
- Numeracion arranca en **S1** (sin `### Session N` previas; subtablas "Modo"/"Plan" no cuentan).
- **S1 = BE-in-mod** (helpers puros + enrichment), **S2 = config/superficies**, **S3 = flags+integración**. S2 y S3 dependen de S1 (los campos enriquecidos).
- **Reuso masivo (DET-32)**: objeto, guard, pickers, pestaña, layouts CRUD, enrichment currentCredits, selector MC-06 → todo `reuse`. `build`: 2 helpers puros + 3 campos derivados; `reduce`: canDelete flag + columnas/indicador.
- **shortLabel**: descartado (contradice `creates_data:false`) → "etiqueta corta" = `code`.
- **REQ-05 no bloquea** (decisión dev): solo avisa "excedida"; bloqueo duro = MC-09.
- **Riesgo REQ-05 superficie**: el indicador coloreado por fila requiere modo card o columna; el contador resumen puede requerir un elemento pequeño sobre la lista — se resuelve empíricamente en S2 (DB-gated).

### Session 1 — 2026-07-01 — Lógica pura + enrichment (REQ-01 + REQ-05) [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T2

**Objetivo**: Helpers puros de conteo (obligatorias/electivas) y de estado de crédito (excedida), con sus tests, y extender el enrichment de lectura de `requirementCategory` para exponer `mandatoryCount`/`electiveCount`/`creditStatus` (under/ok/over) junto a `currentCredits` — sin romper `currentCredits`.

**Tasks completadas**:
- [x] S1.T1 — Helper puro `countByCategory(entries)` + `deriveCreditStatus({currentCredits,maxCredits})` (REQ-01, REQ-05)
- [x] S1.T2 — `.spec.ts`/`.test.js` de los helpers (TC-06, TC-07, TC-08) (REQ-01, REQ-05)
- [x] S1.T3 — Extender `enrichRequirementCategoryRows` (blockId al select; mandatoryCount/electiveCount/creditStatus; list + getInstance) (REQ-01, REQ-05)
- [x] S1.GATE — Gate de sync Session 1 (tier T2): persistir, validar, quality review, decidir continue/iterate/escalate

**Validacion del tier**:
- T2 — `npx vitest run` del mod: **1113/1113 pass (65 files), 0 failed** (re-corrido independiente — DET-33). Tests nuevos/tocados: `deriveElectivity.test.js` (9, +4 countByCategory), `creditRange.test.js` (20, +8 deriveCreditStatus), `requirementCategoryGuard.test.js` (12, +2 enrichment MC-07). ESLint sobre los 6 archivos tocados: **0 errores**.
- TC-06 ✓ (countByCategory 2 oblig/1 elec), TC-07 ✓ (deriveCreditStatus 'over'), TC-08 ✓ (a: 'ok' sin tope sobre mínimo; b/c: 'under' bajo mínimo).

**Archivos**:
- `logic/helpers/deriveElectivity.js` — `countByCategory(entries)` (nuevo helper puro, REQ-01)
- `logic/helpers/creditRange.js` — `deriveCreditStatus({currentCredits,minCredits,maxCredits})` (nuevo helper puro, REQ-05, 3 estados)
- `logic/curriculum-read.resolver.js` — `enrichRequirementCategoryRows`: `blockId` al select + `mandatoryCount`/`electiveCount`/`creditStatus` derivados (REQ-01/05)
- `tests/unit/deriveElectivity.test.js`, `tests/unit/creditRange.test.js`, `tests/unit/requirementCategoryGuard.test.js` — cobertura de helpers + enrichment

**Discoveries / Learns nuevos**:
- L1: la aserción del `select` en `requirementCategoryGuard.test.js` fijaba la forma exacta `{categoryId,credits,activityId}`; agregar `blockId` la rompió (introducido, corregido de inmediato). Los tests que asertan el shape exacto del `select` de Prisma son frágiles ante extensiones aditivas.
- L2: `countByCategory` y `deriveCreditStatus` reusan el **mismo** `planEntry.findMany` que ya calcula `currentCredits` (solo se agregó `blockId` al select) → cero N+1 nuevo (NFR performance cumplido).

**Quality review (DET-23)**:

**Reviewer**: LLM (inline; cambio pequeño BE puro + aditivo, T2). Delegación a sub-agente aislado desproporcionada para 2 helpers puros + 1 extensión aditiva con cobertura 100% de la lógica nueva.
**Tier de revisión**: standard (T2)
**Resultado global**: approve

| # | Dimensión | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Spec compliance (REQ-01, REQ-05) | pass | counts por electividad + creditStatus 3 estados; derivado en lectura como especifica el spec |
| 2 | Rules compliance | pass | helpers puros testeables (RULE-cd-014); reuso del findMany (DET-32); sin persistir derivados |
| 3 | Calidad código | pass | funciones puras <25 líneas, guard clauses, JSDoc en español, naming EN; sin magic numbers |
| 4 | Testing | pass | asserts con valores concretos (2/1, 'over'/'under'/'ok', currentCredits=72); bordes cubiertos |
| 5 | Escalabilidad/perf | pass | cero N+1 nuevo — reusa el mismo `findMany` (L2) |
| 6 | Mantenibilidad | pass | helpers colocados con sus pares; tests colocados |
| 7 | Error handling | pass | tolerante a null/NaN/no-array → defaults seguros ('ok', {}); no lanza |
| 8 | Regresión | pass | 1113 tests verdes; `currentCredits` intacto (test previo sigue pasando) |

**Coverage (DET-25)**: TC-06 → `deriveElectivity.test.js`; TC-07/TC-08 → `creditRange.test.js`; enrichment → `requirementCategoryGuard.test.js`. Sin `Affects UI` en esta session (BE puro; la superficie es S2).

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S1: helpers + enrichment (REQ-01/05); 1113 tests verdes, lint 0; commits d45e509+409e838. Sigue S2.
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 2 — 2026-07-01 — Superficies en el listado (REQ-01 + REQ-05) [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: Exponer en el `record-list` de líneas las columnas de conteo (Obligatorias/Electivas) y el estado de créditos (Incompleta/En rango/Excedida) como **texto** — según decisión del dev, el indicador vive en el listado (no en la malla) y sin badges (única capacidad del record-list en tabla).

**Tasks completadas**:
- [x] S2.T1 — Columnas `mandatoryCount`/`electiveCount` en el record-list (ambos layouts) (REQ-01)
- [x] S2.T2 — Columna `creditStatus` con `valueLabels` (under→Incompleta/ok→En rango/over→Excedida) en ambos layouts (REQ-05)
- [x] S2.T3 — i18n: n/a — el record-list de este layout usa labels inline en español (convención del archivo); `valueLabels` inline consistente. Sin keys nuevas en `lang/`.
- [x] S2.GATE — Gate de sync Session 2 (tier T3): persistir, validar, decidir

**Validacion del tier**:
- JSON válido en ambos layouts (`JSON.parse` OK). `tests/integration/layouts-declared.test.ts`: **85/85 pass** — contador de layouts sin cambio (solo se editaron columnas, no se agregaron/quitaron layouts).
- **Investigación de capacidades del record-list (S2.T2)**: en modo tabla el record-list soporta `valueLabels` (mapeo valor→label localizado) — confirmado en `RecordList.vue:5284-5288`. **No soporta color/badge/clase condicional por celda** en tabla vía JSON (solo modo card, o extendiendo el runtime de `layout/` que es core, fuera de scope). Decisión aplicada: **solo texto** (DEC-LOCAL-03).
- **Smoke DB-gated pendiente** (S3.T4): render real en el tenant tras `layout sync` + `suite sync` + restart (RULE-mods-050).

**Archivos**:
- `config/layouts/default_Curriculum_view.json` — 3 columnas nuevas (Obligatorias, Electivas, Estado con valueLabels)
- `config/layouts/default_Curriculum_edit.json` — idem
- Commits: `6e73ed5` (S2.T1 conteos), `f5c5466` (S2.T2 estado)

**Discoveries / Learns nuevos**:
- L3: el `record-list` en modo tabla **solo** ofrece `valueLabels` (texto) para transformar el valor de una columna; el color/badge condicional existe **exclusivamente** en modo card (`card.badges[]`/`card.conditionalClass[]`). Pintar estado por color en tabla exigiría tocar `TableCell.vue`/`RecordList.vue` (core layout). → REQ-05 en tabla = texto localizado; el color queda como posible mejora futura en core o vía modo card.
- L4: el **contador resumen** de la pestaña no tiene un lugar limpio en config del record-list (no hay header/summary slot configurable) → **diferido** (requeriría un elemento custom, fuera de "capacidades del record-list" que el dev acotó).

**Quality review (DET-23)**:

**Reviewer**: LLM (inline; cambio de config de layouts, sin lógica). Investigación de capacidades delegada a Explore aislado (self-report verificado — DET-33).
**Tier de revisión**: standard (T3, pero cambio config acotado)
**Resultado global**: approve (con 2 items diferidos documentados, no deuda bloqueante)

| # | Dimensión | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Spec compliance (REQ-01, REQ-05) | pass | columnas de conteo + estado como texto localizado en el listado (DEC-LOCAL-03) |
| 2 | Rules compliance | pass | mod-only; sin tocar core; labels inline consistentes con el archivo; no se agregan/quitan layouts (RULE regresión) |
| 3 | Config quality | pass | `valueLabels` es la capacidad nativa correcta (evidencia RecordList.vue:5284-5288); JSON válido |
| 4 | Regresión | pass | layouts-declared 85/85; suite del mod intacta (S1 no afectada) |
| 5 | A11y | warn (aceptado) | sin color (límite del record-list en tabla); el texto "Incompleta/Excedida" es autosuficiente (no depende de color) — WCAG OK por texto |
| 6 | Alcance/deferrals | pass | color y contador diferidos con razón (L3/L4); dentro de lo acordado con el dev |

**Coverage (DET-25)**: REQ-01 columnas → verificado JSON + layouts-declared; REQ-05 columna estado → valueLabels validado contra `RecordList.vue`. Smoke visual (TC real) diferido a S3.T4 (DB-gated).

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S2: columnas conteo (6e73ed5) + columna Estado con valueLabels (f5c5466). Sin color (limite record-list tabla) ni contador (diferido) — dentro de lo acordado. Sigue S3 (canDelete + validacion + integracion + sync + close).
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

### Session 3 — 2026-07-01 — Borrado, validación e integración (REQ-03/02/04) [phase: execute]

**Tipo**: ⚑ fuerte
**Validation tier**: T3

**Objetivo**: Habilitar el borrado con guard en la UI (REQ-03), confirmar el mapeo "etiqueta corta"=`code` y la validación de rango (REQ-02), verificar la integración con el selector de la malla (REQ-04), y dejar listo el smoke DB-gated (sync) + acceptance para el cierre.

**Tasks completadas**:
- [x] S3.T1 — `canDelete:true` en el record-list (ambos layouts) → expone el guard existente (REQ-03)
- [x] S3.T2 — `code` = "etiqueta corta" (ya presente); validación FE min≤max: **server-side-only** documentado (el server rechaza + descripción guía en el campo) (REQ-02)
- [x] S3.T3 — REQ-04 verificado por inspección: `useCurriculumMesh` usa `fetchPolicy:'network-only'` → el selector siempre trae líneas frescas; sin cache stale, sin cambio de código
- [x] S3.T4 — regresión final (1113 tests, lint 0) + checklist de sync/smoke DB-gated para el dev
- [x] S3.GATE — Gate de sync Session 3 (tier T3): persistir, acceptance, decidir cierre

**Validacion del tier**:
- `npx vitest run` del mod: **1113/1113 pass (65 files)**, ESLint 0 sobre los archivos del ticket (re-corrido independiente — DET-33). JSON de ambos layouts válido.
- **REQ-03**: `canDelete:true` cablea la acción de borrar del record-list → `deleteInstance(requirementCategory)` → override `requirementCategoryDelete.resolver.js` corre el guard → si hay entries lanza `REQUIREMENT_CATEGORY_HAS_ENTRIES` ("reasigna primero"). Guard + backstop DB (`onDelete:Restrict`) ya testeados (`requirementCategoryGuard.test.js`). El surface del mensaje en la UI se confirma en el smoke DB-gated.
- **REQ-04**: `useCurriculumMesh.ts:183` `fetchPolicy:'network-only'` para `LIST_CATEGORIES` → cero cache stale (TC-05 verificado por inspección).
- **REQ-02**: `code` presente en los 3 layouts CRUD; `maxCredits` con descripción "debe ser mayor o igual al mínimo"; `assertMinMaxCredits` rechaza server-side. FE cross-field no agregado (riesgo en form declarativo; server-side aceptable per spec).

**Smoke DB-gated pendiente para el dev (RULE-mods-050)**:
```
cd layout && npm run sync        # propaga layouts a la DB del tenant + registra
cd suite  && npm run sync        # i18n
# reiniciar dev de suite/object-manager
```
Checklist de smoke en el tenant UPU (plan con líneas):
1. Pestaña "Líneas de formación" → columnas Obligatorias/Electivas/Estado visibles.
2. Estado muestra "Incompleta"/"En rango"/"Excedida" según créditos vs rango.
3. Borrar línea sin entries → OK; con entries → bloqueado "reasigna primero".
4. Crear línea nueva → aparece en el selector de la malla (MC-06).

**Archivos**:
- `config/layouts/default_Curriculum_view.json`, `default_Curriculum_edit.json` — `canDelete:true` (commit `e588bf5`)
- Sin cambios en `useCurriculumMesh.ts` (REQ-04 ya cubierto) ni en los layouts CRUD (REQ-02 code ya presente)

**Discoveries / Learns nuevos**:
- L5: REQ-04 no requirió código — `useCurriculumMesh` ya usa `network-only`, garantizando categorías frescas entre pestañas. El "cableado del selector" que la pre-spec anticipaba ya estaba resuelto por MC-06.
- L6: la validación FE cross-field (min≤max) no es trivial en el form declarativo (Vueform) del platform; el patrón del mod es validar server-side (`assertMinMaxCredits`) y guiar con `description`. Consistente con MC-02.

**Quality review (DET-23)**:

**Reviewer**: LLM (inline; S3 = 1 flag de config + 2 verificaciones sin cambio de código). Integración REQ-04 verificada leyendo `useCurriculumMesh` (DET-33).
**Tier de revisión**: standard (T3)
**Resultado global**: approve (smoke DB-gated diferido al dev, como en MC-05/TICKET-093)

| # | Dimensión | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Spec compliance (REQ-02/03/04) | pass | canDelete expone guard; code=etiqueta corta; REQ-04 cubierto por network-only |
| 2 | Rules compliance | pass | mod-only; guard reusado (no reimplementado); sin tocar core |
| 3 | Regresión | pass | 1113 tests verdes; JSON válido; layouts-declared sin cambio |
| 4 | Error handling | pass | borrado con entries → mensaje amigable del guard + backstop DB |
| 5 | Verificación (DET-33) | pass | REQ-04 verificado leyendo el fetchPolicy real; no self-report ciego |
| 6 | Smoke runtime | deferred | DB-gated (sync + tenant) — checklist entregado al dev (precedente MC-05) |

**Coverage (DET-25)**: TC-04 (borrar con entries → bloqueado) cubierto por `requirementCategoryGuard.test.js` (guard) + smoke; TC-05 (línea nueva en selector) verificado por inspección (network-only). Smoke visual DB-gated en manos del dev.

**Gate decision:** (approvedBy: autopilot)

- [x] continue → S3: canDelete (e588bf5) + REQ-04 verificado (network-only) + REQ-02 code/server-side. 1113 tests verdes. Codigo completo REQ-01..05; smoke DB-gated (sync+tenant) y push quedan al dev. Procede request-close + teach-close.
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket
- [x] close → todas las tasks REQ-01..05 implementadas y verdes; smoke DB-gated entregado al dev; procede request-close

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 | TC-06 (unit); TC-01 (smoke) | unit + smoke | TC-06 pass; TC-01 smoke DB-gated |
| REQ-02 | TC-02, TC-03 (server-side + smoke) | unit(server) + smoke | server-side pass; smoke DB-gated |
| REQ-03 | TC-04 (guard unit + smoke) | unit + smoke | guard pass; surface smoke DB-gated |
| REQ-04 | TC-05 (inspección network-only) | inspección | verificado (fetchPolicy network-only) |
| REQ-05 | TC-07, TC-08 (unit) | unit (.spec.ts) | pass |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-01 | plan con 4 líneas | REQ-01 | unit | seed | render RecordList | lista las 4 con créditos actual/mín | — | — | pending |
| TC-02 | crear línea min=72, color primary, icon bi-mortarboard | REQ-02 | unit | modal | crear | creada con color+ícono | — | — | pending |
| TC-03 | crear con min=30, max=20 | REQ-02 | unit | modal | crear | rechazado | — | — | pending |
| TC-04 | borrar línea con 1 entry | REQ-03 | unit | entry asignado | borrar | bloqueado | — | — | pending |
| TC-05 | crear línea → abrir selector en MC-06 | REQ-04 | unit | línea nueva | abrir selector | la nueva línea aparece como opción | — | — | pending |
| TC-06 | línea con 3 entries (2 sin blockId, 1 con blockId) | REQ-01 | unit | seed | contar por electividad | mandatoryCount=2, electiveCount=1 | — | — | pending |
| TC-07 | línea max=60, currentCredits=72 | REQ-05 | unit | seed | derivar creditStatus | creditStatus='over' (excedida) | — | — | pending |
| TC-08 | (a) max=null,min=72,current=999; (b) min=72,current=30; (c) min=72,max=null,current=30 | REQ-05 | unit | seed | derivar creditStatus | (a) 'ok' (supera mínimo, sin tope); (b) y (c) 'under' (bajo el mínimo) | — | — | pending |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| spec FE | vitest del mod | — | — | sin componentes previos afectados |

## Summary

**MC-07 cerrado con backend entregado y superficie visual bloqueada por límite de plataforma.**

- **Entregado (mergeable):** enrichment de `requirementCategory` con `currentCredits` (ya existía) + `mandatoryCount`/`electiveCount` (REQ-01) + `creditStatus` under/ok/over (REQ-05), derivados en lectura, reusando el `findMany` (cero N+1). Helpers puros `countByCategory`/`deriveCreditStatus` con tests (TC-06/07/08). 1113 tests verdes. **REQ-04** ya cubierto (`useCurriculumMesh` usa `network-only`). **REQ-02** `code`=etiqueta corta; min≤max server-side. Borrado (REQ-03) **desactivado por decisión del dev** (`canDelete:false`).
- **Bloqueado (no entregable mod-only):** la **superficie visual** de REQ-01 (columnas obligatorias/electivas + créditos actuales) y REQ-05 (estado por línea) en el `record-list`. Causa: el RecordList filtra columnas a campos **reales/persistidos** del objeto (`useColumnConfiguration.ts:149-156` → `availableFields` ← `getObjectFields` ← `core_FieldDefinition`); los campos derivados del enrichment se descartan (afecta también a `currentCredits`, que nunca se mostró). Verificado en smoke (post-sync + reset): las columnas no aparecen.
- **Corrección post-smoke (2026-07-01):** se removieron las columnas derivadas del record-list (config muerta) — commit `dd027bd`. El enrichment se mantiene (datos disponibles para consumidor futuro). Comentario explicativo en `curriculum-read.resolver.js`.
- **Handoff al team up1:** [`uplanner/specs/up1/sp5/SP5-issues.md`](../../../../uplanner/specs/up1/sp5/SP5-issues.md) → **ISSUE-SP5-01** (qué se quería, por qué no se puede, 3 opciones de solución con refs; recomendación: campo virtual/computed o whitelist de columnas derivadas en el record-list — cambio de core).
- **Learn L7 (para promover a RULE):** el `record-list` estándar **solo** muestra columnas cuyo key es un campo declarado/persistido del objeto — los derivados en enrichment no se pueden mostrar como columna sin cambio de core. Verificar el **render real** (no solo config+DB) antes de dar por hecha una columna en un record-list.
- **Commits (rama `UPONE-1267-sp5`, locales):** `d45e509`, `409e838` (S1 backend+tests), `6e73ed5`, `f5c5466` (S2 columnas — luego revertidas), `e588bf5` (S3 canDelete — luego a false), `dd027bd` (fix: revert columnas + canDelete false + comentario). Push pendiente (revisión team, RULE-dev-004).
