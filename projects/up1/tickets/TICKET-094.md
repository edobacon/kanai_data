---
id: TICKET-094
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1345
module: curriculum-design
autopilot: autonomous
---

# Pickers visuales de color e ícono para líneas de formación (componentes custom)

## Request

El color y el ícono de una línea de formación (requirementCategory) deben elegirse VISUALMENTE — un selector de color con swatches del tema up1 (no escribir var(--up1-color-*) a mano) y un selector de íconos bootstrap-icons (verlos y pinchar) — no campos de texto. Hoy (MC-02 / TICKET-082) color e icon son type:text en los layouts create/edit. Crear dos componentes Vueform custom del mod en modsComponents/ (ColorPicker + IconPicker, patrón ActivityStatusBadge/CompositeSectionTree), registrarlos como type (color-picker / icon-picker), y usarlos en default_requirementCategory_{create,edit}.json reemplazando type:text. El valor persiste como string (compat con los campos color/icon actuales: var(--up1-color-*)/hex y bi-*). Incluye lang, storybook y tests a11y (patrón de los componentes del mod). creates_visual: true → arranca con design-draft (preview de ambos pickers). Asociado a UPONE-1345 (MC-02 debió entregar estos campos con selección visual). Coordinar con el ticket de placement (ambos tocan los layouts create/edit de requirementCategory): hacerlo después del embedding.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | single (solo mods/curriculum-design/, layer:mod) |
| Modulo principal | curriculum-design |
| Modulos afectados | — (mod auto-contenido; sync propaga a layout/suite) |

### Creation scope

| Dimension | Aplica | Detalle |
|-----------|--------|---------|
| creates_visual | true | DOS Vueform elements custom nuevos: `ColorPickerElement` (swatches de tokens `--up1-color-*`) e `IconPickerElement` (grid de bootstrap-icons `bi-*` con búsqueda). Ambos reemplazan `type:text` en los layouts de requirementCategory |
| creates_data | false | El valor persiste como string (compat con `requirementCategory.color`/`icon` actuales: token/hex y `bi-*`). Cero cambios de objeto/schema/backend |

## Triage

### Hipotesis

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El registro de un nuevo element type es automático: el `name` PascalCase+`Element` del `defineElement` deriva el `type` kebab-case y `vueform.config.ts` auto-registra todo `.vue` de `modsComponents/*/`. No hay que tocar registry alguno | confirmed | Researcher: `mods/curriculum-design/vueform.config.ts` usa `import.meta.glob(['./modsComponents/*/*.vue'])` → `elements`. Patrón verificado en ActivityStatusBadge/CompositeSectionTree/RichTextRenderer |
| H2 | El valor del element se lee/escribe vía la API estándar de Vueform (`this.value` / `el$.update`), persiste como string sin cambio de objeto ni backend | confirmed | `objects/requirementCategory.json`: `color`/`icon` son `type:string, not_null:false`. ActivityStatusBadge accede a `(this as any).value`. Layouts solo cambian `type:text` → `type:color-picker`/`icon-picker` |
| H3 | Los swatches del ColorPicker salen de los tokens `--up1-color-*` definidos en `layout/src/styles/design-tokens/colors.css`; el catálogo del IconPicker sale de `bootstrap-icons/font/bootstrap-icons.json` (2078 íconos, ya dependencia del mod) | confirmed | Researcher localizó ambos. `bootstrap-icons@^1.13.1` en package.json del mod. Tokens `--up1-color-{primary,success,danger,warning,info,purple,rose,gray}-*` |
| H4 | a11y es obligatorio y no trivial: RULE-curriculum-design-002 exige WAI-ARIA APG en elements custom. ColorPicker=radiogroup, IconPicker=grid/listbox + búsqueda. Tests con axe-core (patrón activity-status-badge-a11y) | confirmed | RULE-curriculum-design-002 (level: must). Patrón de test `tests/integration/activity-status-badge-a11y.test.ts` con `axe.run` wcag2aa/wcag21aa |

### Context found

**Rules del módulo aplicables:**
- **RULE-curriculum-design-002** (must): Custom Vueform elements compuestos DEBEN cumplir WAI-ARIA APG (roles, focus trap, roving tabindex). Aplica directo a ambos pickers.
- **RULE-curriculum-design-014**: Patrón de componente del mod = CompositeSectionTree (`defineElement` + setup + modales caseros). Referencia de estructura. El más simple para imitar es RichTextRenderer.
- **RULE-curriculum-design-015**: Select-suggest → reusar Vueform search+create, no construir. Aplica al IconPicker (búsqueda): apoyarse en primitivas, no reinventar combobox.
- **RULE-curriculum-design-012**: Layouts por convención de nombre (`default_{object}_{action}.json`). Los 3 layouts de requirementCategory ya existen.
- **DEC-032** (accepted): requirementCategory modela color e icono (valores de la maqueta MC-02). Este ticket entrega la **selección visual** que MC-02 dejó como `type:text`.

**Bugs abiertos del módulo:** BUG-001 (audit gap Activity update) y BUG-002 (versioning Course UNIQUE) — ninguno afecta este trabajo (no tocan layouts/components/requirementCategory presentation).

**Código (researcher):**
- Componentes existentes: `mods/curriculum-design/modsComponents/{ActivityStatusBadge,CompositeSectionTree,RichTextRenderer}/`. Patrón: `defineElement({ name, submits:false, ... })`, valor vía `(this as any).value`, template con `<ElementLayout>`.
- Registro: `mods/curriculum-design/vueform.config.ts` → glob auto-registra; el sync copia los `.vue` al `layout/vueform.config.ts`.
- Layouts a tocar: `config/layouts/default_requirementCategory_{create,edit,view}.json` (campos `color`/`icon` = `type:text`).
- Objeto: `objects/requirementCategory.json` — `color`/`icon` string nullable (sin cambios).
- Tokens color: `layout/src/styles/design-tokens/colors.css` (`--up1-color-*`). Overrides light-dark: `suite/css/1-theme/theme-tokens.css`.
- Iconos: `bootstrap-icons/font/bootstrap-icons.json` (manifest) + `bootstrap-icons/font/bootstrap-icons.css` (clases `bi bi-*`).
- Lang: `mods/curriculum-design/lang/` — convención `{locale}@{objectOrComponent}.json` + `es_CL.json` general por componente.
- Tests/storybook: vitest3 + @vitest/browser + axe-core (NO jest-axe). Storybook 9 + addon-a11y. Patrón a11y: `tests/integration/activity-status-badge-a11y.test.ts`.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | UPONE-1267-sp5 (rama de la épica SP5, misma que TICKET-082/093 — layer:mod, commits con prefijo UPONE-1345 por DET-19) |
| Base branch | develop |
| DB state | Sin cambios (cero backend/schema). Render real en suite es DB-gated (requiere sync) — diferido como smoke, precedente MC-02 |
| Services | layout/storybook (6006/6010) para verificación visual; suite (3000) para smoke DB-gated |
| Test data | requirementCategory seed de MC-02 (`_data-malla.js`) con color/icon de la maqueta |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | defineElement (Vueform) con Options-API `methods`/`data` rompe la inferencia de `this` en el template de vue-tsc → error TS2349 "This expression is not callable" en $t/métodos/computed del template. Fix: usar `setup()` (patrón CompositeSectionTree) + `useI18n().t` en vez de `$t`. Para elements WRITABLE: `setup(props, { element })` y `element.update(val)` / `element.value` (patrón EnumValuesEditorElement). RichTextRenderer/ActivityStatusBadge no fallan porque usan solo computed. | developer | — | refined | RULE-curriculum-design-019 |
| L2 | El i18n de un componente del mod curriculum-design va anidado bajo su clave en `lang/es_CL.json` (como richTextRenderer/compositeSectionTree), NO en un archivo `es_CL@componente.json` con claves planas: el storybook preview hace `Object.assign(messages.es, content)` (merge flat) sobre todos los `es_CL*.json` → claves planas colisionarían a top-level. `$t('colorPicker.label')` resuelve por la clave anidada. | developer | — | refined | RULE-curriculum-design-020 |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Modo (autopilot)

| Timestamp | Cambio | Razon | Aplica desde |
|-----------|--------|-------|--------------|
| 2026-06-25 | (nuevo) → super | dev: `094 super autopilot` | intake |

### Plan de sessions (preplanificacion)

3 sessions previstas. **Esqueleto producido por `intake-explore`.** El detalle final (tasks, gate criteria) lo completa `design-feature` al generar el spec. Cada session puede subdividirse o colapsarse durante execute si el tamano real difiere.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | ColorPickerElement (swatches tokens up1, radiogroup WAI-ARIA) + lang + storybook + tests unit/a11y | 1 | T2 | element .vue + lang + story + tests | ⚑ fuerte | dual-judge APPROVED; axe 0 violations; value emite string token/hex; vitest sin regresion |
| S2 | IconPickerElement (grid bootstrap-icons + busqueda, grid/combobox WAI-ARIA) + lang + storybook + tests unit/a11y | 2 | T2 | element .vue + lang + story + tests | ⚑ fuerte | dual-judge APPROVED; axe 0 violations; value emite `bi-*`; busqueda filtra; vitest sin regresion |
| S3 | Cablear los 3 layouts requirementCategory (`type:text` → `color-picker`/`icon-picker`) + regression + smoke (DB-gated) | 3 | T1 | edit de create/edit/view layouts | auto | JSON.parse OK; vitest sin regresion; types presentes en config; smoke render diferido DB-gated |

**Notas del esqueleto**:
- S1 y S2 son unidades cohesivas independientes (cada picker = componente + test + story + lang). 1 dev serial → ejecutar S1 luego S2. No hay dependencia dura entre ellas salvo convenciones compartidas.
- S3 depende de S1+S2 (los layouts referencian ambos types). Cambio liviano (solo `type` en JSON).
- Tier T2 en S1/S2 por a11y obligatorio (RULE-curriculum-design-002) + valor user-facing. Gate ⚑ fuerte → dual-judge (DET-35) por T2.
- Render real en suite (smoke) es DB-gated (requiere `npm run sync` + suite levantada) → diferido, precedente MC-02/MC-02-fix. Storybook cubre la verificación visual aislada.

### Session 1 — 2026-06-25 — ColorPickerElement (swatches tokens up1, radiogroup WAI-ARIA) [phase: execute]

**Tipo:** ⚑ fuerte (dual-judge)
**Validation tier:** T2

**Tasks completadas**:
- [x] S1.T1 — Crear `ColorPickerElement.vue` (defineElement type `color-picker`; radiogroup de swatches de tokens `--up1-color-*`; emite/hidrata string token/hex; roving tabindex + aria-checked)
- [x] S1.T2 — Lang + storybook del ColorPicker (`es_CL@colorPicker.json`; `ColorPicker.stories.ts` con estados vacío/con-valor)
- [x] S1.T3 — Test a11y axe-core del ColorPicker (wcag2aa/21aa, incl. color-contrast) + unit de selección/hidratación
- [x] S1.GATE — Gate de sync Session 1 (tier T2, dual-judge DET-35)

**Validacion del tier**:
- T2 — vitest del mod 810/810 (788 baseline + 22 nuevos: 15 unit + 7 a11y); axe-core 0 violaciones (incl. color-contrast); eslint EXIT 0 en los 5 archivos nuevos; vue-tsc 0 errores en ColorPicker (75 restantes = baseline pre-existente CalendarEventCard/BaseCard, no de S1).

**Quality review (DET-23)** — loop dual-judge (DET-35, tier T2):
- Jueces: balanced (A `a167f0a` + B `a87dfca`), ciegos en paralelo, mismo handoff (spec + REQs + execute_scope + diff + kb_refs). Sin disputa → sin adjudicador reasoning.

| # | Dimensión | Judge A | Judge B | Resultado |
|---|-----------|---------|---------|-----------|
| 1 | Calidad de código | pass | pass | pass |
| 2 | Lint | pass | pass | pass |
| 3 | Tipado | warn | pass | pass (warn de A: cast `unknown` — theoretical) |
| 4 | Testing | pass | pass | pass |
| 5 | Escalabilidad | pass | pass | pass |
| 6 | Mantenibilidad | pass | warn | pass (warn de B: token===cssVar redundancia — INFO) |
| 7 | Claridad | pass | pass | pass |
| 8 | Accesibilidad | pass | pass | pass (axe 0 violaciones) |
| 9 | Storybook | warn | warn | pass (warn: registro global del element — patrón del mod) |
| 10 | Error-handling | pass | pass | pass |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 2
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

- **Veredicto: APPROVED** — ambos jueces `approve`, scope_ok (todo bajo `up1:mods/curriculum-design/`), cero CRITICAL, cero real-WARNING confirmado por ambos.
- **Findings confirmados por ambos** (cast `unknown` vs destructuring; DOM-espejo del test a11y): WARNING-theoretical → INFO, no bloquean.
- **Suspect (un solo juez), resueltos**:
  - Judge A — falta `docs/guides/color-picker.md` (RULE-curriculum-design-002 verificación item 2 lo exige, `must`). Verificado factual contra la rule → **fix aplicado**: creado el guide con sección "Accesibilidad (WCAG 2.1 AA)" + tabla de teclado + entrada en INDEX (additive docs, sin cambio de código → no requiere re-judge de código).
  - Judge B — sin test unitario directo del handler `onKeydown` del SFC (el mod no monta SFCs en vitest). La lógica de navegación (`nextIndexForKey`/`rovingTabIndex`) SÍ está cubierta; el wiring teclado→foco y el render real son smoke DB-gated + LLM-e2e diferido (documentado en Limitaciones del guide). No bloquea (gap estructural del patrón del mod, no defecto introducido).

```dkc:gate-telemetry
session: 1
work_type: implement
tier: T2
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 0
adjudicator_invocations: 0
diff_chars: 14200
est_tokens: 3838
span_seconds: 2400
```

**Commit DET-27**: `6f7abfd` feat(curriculum-design): ColorPicker visual element + `6a2c04c` test + `eca2d25` docs (rama UPONE-1267-sp5, modo limpio external=UPONE-1345; ver tabla ## Commits)

### Session 2 — 2026-06-25 — IconPickerElement (grid bootstrap-icons + búsqueda, listbox WAI-ARIA) [phase: execute]

**Tipo:** ⚑ fuerte (dual-judge)
**Validation tier:** T2

**Tasks completadas**:
- [x] S2.T1 — Crear `IconPickerElement.vue` (defineElement type `icon-picker`; campo de búsqueda + grilla acotada del manifest bootstrap-icons; emite/hidrata `bi-*`; listbox + aria-selected + nav teclado)
- [x] S2.T2 — Lang + storybook del IconPicker (`iconPicker` en `es_CL.json`; `IconPicker.stories.ts` con estados vacío/con-valor/búsqueda)
- [x] S2.T3 — Test a11y axe-core del IconPicker (wcag2aa/21aa) + unit de selección/hidratación/búsqueda
- [x] S2.GATE — Gate de sync Session 2 (tier T2, dual-judge DET-35)

**Validacion del tier**:
- T2 — vitest del mod 836/836 (810 + 26 nuevos: 19 unit + 7 a11y); axe-core 0 violaciones; eslint EXIT 0; vue-tsc 0 errores en IconPicker (75 = baseline pre-existente).

**Quality review (DET-23)** — loop dual-judge (DET-35, tier T2), 1 iteración de fix:
- Ronda 1: jueces balanced (A `a2de787` + B `a9e10d4`) → ambos `iterate`. 2 findings **confirmados por ambos**: (CRITICAL) falta `docs/guides/icon-picker.md` (RULE-002 item 2); (WARNING-real) falta story "búsqueda activa" (REQ-05). Suspects de un solo juez (button[role=option] — mismo patrón aprobado en S1 + axe pasa; visibilidad del seleccionado con query activo) → INFO/documentados.
- Fix quirúrgico (additive, sin cambio de lógica): creado `docs/guides/icon-picker.md` (sección Accesibilidad WCAG 2.1 AA + tabla teclado) + entrada INDEX; story `ActiveSearch` con prop opcional `initialQuery`.
- Ronda 2 (re-judge): jueces balanced (A `af15473` + B `a5fed1c`) → **ambos `approve`**, ambos confirman los 2 fixes resueltos; restantes solo INFO/theoretical (navegación 1D documentada, elementSlots/el$ patrón del mod).

| # | Dimensión | Resultado (ronda 2) |
|---|-----------|---------------------|
| 1 | Calidad | pass |
| 2 | Lint | pass |
| 3 | Tipado | pass |
| 4 | Testing | pass |
| 5 | Escalabilidad | pass (MAX_VISIBLE_ICONS=120, no monta los 2078) |
| 6 | Mantenibilidad | pass |
| 7 | Claridad | pass |
| 8 | Accesibilidad | pass (axe 0 violaciones; listbox APG) |
| 9 | Storybook | pass (3 estados: vacío/con-valor/búsqueda) |
| 10 | Error-handling | pass |

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 3
- [ ] iterate → re-trabajar Session 2
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

- **Veredicto: APPROVED** (tras 1 iteración) — scope_ok (todo bajo `up1:mods/curriculum-design/`), cero CRITICAL/real-WARNING remanente.

```dkc:gate-telemetry
session: 2
work_type: implement
tier: T2
review_mode: dual-judge
judge_tier: balanced
fix_iterations: 1
adjudicator_invocations: 0
diff_chars: 16800
est_tokens: 4540
span_seconds: 1800
```

**Commit DET-27**: `0d176c5` feat(curriculum-design): IconPicker visual element + `928732e` test + `e8bad8f` docs (rama UPONE-1267-sp5, modo limpio external=UPONE-1345; ver tabla ## Commits)

### Session 3 — 2026-06-25 — Cablear los 3 layouts de requirementCategory [phase: execute]

**Tipo:** auto
**Validation tier:** T1

**Tasks completadas**:
- [x] S3.T1 — Cambiar `color`/`icon` de `type:text` → `type:color-picker`/`icon-picker` en `default_requirementCategory_{create,edit,view}.json` (preservar label/description/columns)
- [x] S3.GATE — Gate de sync Session 3 (tier T1)

**Validacion del tier**:
- T1 — los 3 layouts parsean (JSON.parse OK); suite del mod 836/836 sin regresión (inventario de layouts sin cambio). Smoke runtime en la suite (render del picker) es DB-gated (requiere `npm run sync`), diferido al dev (precedente MC-02).

**Quality review (DET-23)** — inline light (tier T1, dual-judge N/A por proporcionalidad DET-35 — cambio trivial de `type` en JSON):
- Dim 1 (calidad): pass — solo cambio de `type` + `columns`, sin lógica.
- Dim 7 (claridad): pass — `type:color-picker`/`icon-picker` mapean a los elements de S1/S2.
- Scope: pass — solo `config/layouts/` del mod.

```dkc:gate-telemetry
session: 3
work_type: implement
tier: T1
review_mode: inline-light
judge_tier: n/a
fix_iterations: 0
adjudicator_invocations: 0
diff_chars: 600
est_tokens: 162
span_seconds: 300
```

**Commit DET-27**: `3f3db04` feat(curriculum-design): cablear color-picker/icon-picker en layouts create/edit (rama UPONE-1267-sp5, modo limpio external=UPONE-1345)

**Gate decision:** (approvedBy: dev)

- [x] continue → Session 4
- [ ] iterate → re-trabajar Session 3
- [ ] escalate → bloqueante requiere decision externa
- [ ] standby → pausar ticket

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| (REQ se definen en design-feature) | TC-01..TC-06 | auto + a11y | NOT COVERED |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| TC-01 | ColorPicker registra como type y emite el token al seleccionar swatch | REQ-01 | auto | element montado | seleccionar swatch | `value` = token (string) | `select(idx)` → `element.update(swatch.token)`; matching cubierto por findSwatchIndex/isSwatchSelected | color-picker.test.ts (15 tests PASS) | ✅ done (S1) |
| TC-02 | ColorPicker hidrata desde un valor string existente (token/hex) marcando el swatch activo | REQ-01 | auto | value preset | montar con token existente | swatch marcado `aria-checked` | findSwatchIndex('var(--up1-color-success-500)')→success; hex desconocido→-1 (no rompe) | color-picker.test.ts | ✅ done (S1) |
| TC-03 | ColorPicker cumple WAI-ARIA APG (radiogroup) sin violaciones de contraste | REQ-03 | a11y (axe) | DOM render | axe.run wcag2aa/21aa | 0 violations color-contrast + roles correctos | color-picker-a11y.test.ts (7 tests PASS, 0 axe violations, indicador SVG aria-hidden) | ✅ done (S1) |
| TC-04 | IconPicker registra como type, busca y emite `bi-*` al pinchar un ícono | REQ-02 | auto | element montado | seleccionar ícono | `value` = `bi-{name}` (string) | `select(name)` → `element.update(toToken(name))`; toToken('book')='bi-book' | icon-picker.test.ts (19 tests PASS) | ✅ done (S2) |
| TC-05 | IconPicker hidrata desde `bi-*` existente y filtra el catálogo por texto | REQ-02 | auto | value preset | montar `bi-mortarboard` + buscar | ícono activo marcado + grid filtrado | fromToken('bi-mortarboard')='mortarboard'; filterIcons('mortar')⊇mortarboard; seleccionado garantizado visible | icon-picker.test.ts | ✅ done (S2) |
| TC-06 | IconPicker cumple WAI-ARIA APG (listbox + búsqueda) sin violaciones | REQ-03 | a11y (axe) | DOM render | axe.run wcag2aa/21aa | 0 violations + roles/labels correctos | icon-picker-a11y.test.ts (7 tests PASS, 0 axe violations) | ✅ done (S2) |

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|
| tests/integration/color-picker.test.ts | unit | S1.T3 | REQ-01 (TC-01/02) | vitest3 |
| tests/integration/color-picker-a11y.test.ts | a11y | S1.T3 | REQ-03 (TC-03) | vitest3 + axe-core |
| tests/integration/icon-picker.test.ts | unit | S2.T3 | REQ-02 (TC-04/05) | vitest3 |
| tests/integration/icon-picker-a11y.test.ts | a11y | S2.T3 | REQ-03 (TC-06) | vitest3 + axe-core |

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|
| mod curriculum-design | `npm run test` (en mods/curriculum-design) | 788/788 (post MC-02-fix) | 836/836 (post S2, +22 ColorPicker +26 IconPicker) | +48 |

## Commits

| Hash | Fecha | Subject | Tasks | Session |
|------|-------|---------|-------|---------|
| 6f7abfd | 2026-06-25 | UPONE-1345 feat(curriculum-design): ColorPicker visual element (swatches del tema) para requirementCategory.color | S1.T1, S1.T2 | 1 |
| 6a2c04c | 2026-06-25 | UPONE-1345 test(curriculum-design): unit + a11y axe (WAI-ARIA radiogroup) del ColorPicker | S1.T3 | 1 |
| eca2d25 | 2026-06-25 | UPONE-1345 docs(curriculum-design): guía del ColorPicker con sección Accesibilidad WCAG 2.1 AA | S1.GATE (fix RULE-002) | 1 |
| 0d176c5 | 2026-06-25 | UPONE-1345 feat(curriculum-design): IconPicker visual element (búsqueda bootstrap-icons) para requirementCategory.icon | S2.T1, S2.T2 | 2 |
| 928732e | 2026-06-25 | UPONE-1345 test(curriculum-design): unit + a11y axe (WAI-ARIA listbox) del IconPicker | S2.T3 | 2 |
| e8bad8f | 2026-06-25 | UPONE-1345 docs(curriculum-design): guía del IconPicker con sección Accesibilidad WCAG 2.1 AA | S2.GATE (fix RULE-002) | 2 |
| 3f3db04 | 2026-06-25 | UPONE-1345 feat(curriculum-design): cablear color-picker/icon-picker en layouts create/edit de requirementCategory | S3.T1 | 3 |

## Summary

**Qué se entregó**: los dos selectores visuales que MC-02 (TICKET-082) dejó como `type:text`. Dos Vueform elements custom del mod `curriculum-design`:
- **ColorPickerElement** (`color-picker`): radiogroup WAI-ARIA de 8 swatches de tokens `--up1-color-*`; emite/hidrata string token.
- **IconPickerElement** (`icon-picker`): listbox WAI-ARIA + búsqueda sobre el manifest de bootstrap-icons (2078, render acotado a 120); emite/hidrata `bi-*`.

Ambos con lang (`es_CL.json`), storybook (3 estados c/u), guías con sección Accesibilidad WCAG 2.1 AA, y tests (48 nuevos: 34 unit + 14 a11y axe con 0 violaciones). Cableados en los layouts `create`/`edit` de requirementCategory (`type:text` → picker, container 3→6). **Cero backend** — el valor persiste como el mismo string de MC-02.

**Sessions**: 3 (S1 ColorPicker T2 ⚑, S2 IconPicker T2 ⚑, S3 layouts T1). Dual-judge (DET-35): S1 APPROVED (0 iter), S2 iterate→fix→APPROVED (1 iter, ambos por la guía RULE-002 + story búsqueda). S3 inline light.

**Verificación**: suite del mod 788→836 (+48), eslint EXIT 0, vue-tsc 0 errores nuevos en los pickers. Validación de cierre reforzada (reviewer aislado): approve, 5/5 checks. Smoke runtime en la suite = DB-gated, diferido al dev (precedente MC-02).

**Decisiones**: DEC-LOCAL-01 (swatches curados, no hex libre), DEC-LOCAL-02 (manifest completo + búsqueda), DEC-LOCAL-03 (view se mantiene texto — los pickers son interactivos sin modo read-only; desviación de REQ-04 auditada).

**Conocimiento promovido**: RULE-curriculum-design-019 (custom element WRITABLE = `setup(props,{element})` + `element.update()`, nunca Options-API methods — evita TS2349) y RULE-curriculum-design-020 (i18n de componente anidado en `es_CL.json`, no `@flat`).

**Commits** (rama UPONE-1267-sp5, modo limpio UPONE-1345, push diferido): 7 — 6f7abfd/6a2c04c/eca2d25 (S1), 0d176c5/928732e/e8bad8f (S2), 3f3db04 (S3).

**Story points**: published 3 / estimated 3 / executed 2 (sessions-heuristic; sp_llm 2 × c0.5 + sp_human 1).

**Pendiente (no bloqueante)**: render read-only dedicado para el layout `view` (chip color + glifo); LLM-e2e de keyboard interaction (diferido como en el resto del mod); smoke en la suite tras `npm run sync` (dev).
