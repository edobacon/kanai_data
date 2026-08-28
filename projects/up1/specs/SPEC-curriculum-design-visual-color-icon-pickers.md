---
id: SPEC-curriculum-design-visual-color-icon-pickers
project: up1
ticket: TICKET-094
status: done
---

# Pickers visuales de color e ícono para líneas de formación

# Pickers visuales de color e ícono para líneas de formación

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: en MC-02 los campos `color` e `icon` de una línea de formación (`requirementCategory`) quedaron como cajas de texto — el usuario debe escribir a mano `var(--up1-color-primary)` o `bi-mortarboard`. Este ticket entrega la selección visual que el request original pedía: dos Vueform elements custom del mod — `ColorPickerElement` (grilla de swatches de los tokens del tema up1) e `IconPickerElement` (grilla de bootstrap-icons con búsqueda) — y reemplaza `type:text` por `type:color-picker`/`icon-picker` en los 3 layouts de `requirementCategory`. El valor persistido sigue siendo el mismo string (token/hex y `bi-*`): **cero cambio de objeto, schema, resolver o seed**. Mod-only, aditivo.

**Decisiones criticas que necesitan tu OK** (cada una con racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | ColorPicker ofrece swatches de un set curado de tokens `--up1-color-*` (no un color libre arbitrario) | Mantiene la coherencia visual del tema; el dato sigue siendo un token semántico. Hex libre queda fuera de alcance (ver "Qué NO se hace") |
| 2 | IconPicker usa el manifest completo de `bootstrap-icons` (2078) con búsqueda + render virtual/acotado | Catálogo completo sin lista duplicada a mano; la búsqueda evita scrollear 2078 íconos |
| 3 | Ambos elements cumplen WAI-ARIA APG (RULE-curriculum-design-002, must): ColorPicker=radiogroup, IconPicker=listbox+búsqueda | a11y es obligatorio en elements compuestos del mod; tests axe-core bloquean el gate |
| 4 | El valor se persiste como string idéntico al actual (token/hex, `bi-*`) | Compat total con MC-02: cero backend, los layouts solo cambian el `type` |

**Riesgos principales y como los mitigamos**:

- **a11y incompleta (foco/teclado/contraste)** → tests axe-core wcag2aa/21aa por componente (patrón `activity-status-badge-a11y`), gate ⚑ con dual-judge en T2; roving tabindex + roles explícitos.
- **Render de 2078 íconos degrada la UI** → búsqueda filtra + límite de íconos visibles (grid acotado/scroll), no se montan los 2078 de golpe.
- **El element no hidrata un valor preexistente (edit de una línea ya creada)** → TC explícito de hidratación desde string para ambos pickers.
- **Drift con MC-02-fix sobre los mismos layouts** → este ticket corre DESPUÉS de TICKET-093 (cerrado); los layouts ya están consolidados.

**Que NO se hace en este ticket** (limites explicitos del scope):

- **Selector de color hex/RGB libre**: solo swatches de tokens del tema. Un input hex arbitrario rompe la coherencia visual y no lo pide el request.
- **Cambios de backend/objeto/schema**: `color`/`icon` siguen siendo string nullable. Nada de migraciones ni resolvers.
- **Smoke runtime en la suite**: es DB-gated (requiere `npm run sync` + suite levantada); se difiere al dev (precedente MC-02/MC-02-fix). Storybook cubre la verificación visual aislada.
- **Reusar los pickers en otros objetos**: este ticket los cablea solo en `requirementCategory`. Si otro objeto los necesita, es trabajo futuro (los types quedan disponibles).

**Tamaño estimado**: 3 sessions (~3 SP). S1 ColorPicker (T2 ⚑), S2 IconPicker (T2 ⚑), S3 cablear layouts (T1). Las más riesgosas son S1/S2 por la a11y.

**Como vas a saber que funciona**: en Storybook se ven ambos pickers; seleccionar un swatch/ícono emite el string correcto; abrir el form de edición de una línea existente marca el valor guardado; los tests axe-core pasan con 0 violaciones; la suite del mod no regresiona.

## Purpose

Proveer captura visual de `color` e `icon` de `requirementCategory` mediante dos Vueform elements custom del mod `curriculum-design`, reemplazando los `type:text` actuales (MC-02) sin alterar el contrato del dato (string). Actor: el usuario que crea/edita una línea de formación de una malla. Valor: descubribilidad y consistencia visual; elimina la necesidad de conocer la sintaxis de tokens/`bi-*`.

## Requirements

### REQ-01: ColorPickerElement registrado como type `color-picker`

> **Que cambia**: el campo "Color" de la línea pasa de una caja de texto a una grilla de swatches del tema; eliges uno y queda guardado el token.
> **Por que**: hoy hay que escribir `var(--up1-color-primary)` a mano — frágil y poco descubrible.

El sistema MUST registrar un Vueform element custom `ColorPickerElement` (type `color-picker`) en `mods/curriculum-design/modsComponents/`, que renderiza una grilla de swatches de un set curado de tokens `--up1-color-*`, emite el token seleccionado como string (`value`) y se hidrata desde un string preexistente (token o hex) marcando el swatch correspondiente.

<details><summary>Scenarios de validacion</summary>

| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| S1 | selección | element montado sin valor | el usuario pincha el swatch "primary" | `value` se actualiza | `value === 'var(--up1-color-primary)'` (string) |
| S2 | hidratación | element montado con `value='var(--up1-color-success)'` | render inicial | el swatch success queda activo | swatch success con `aria-checked="true"` |
| S3 | valor desconocido | element montado con `value='#abcdef'` (hex no-token) | render inicial | no rompe; muestra el valor sin marcar swatch | sin error; chip de valor = `#abcdef` |

</details>

### REQ-02: IconPickerElement registrado como type `icon-picker`

> **Que cambia**: el campo "Ícono" pasa de texto a una grilla buscable de íconos bootstrap; buscas, pinchas, y queda guardada la clase `bi-*`.
> **Por que**: hoy hay que conocer y escribir `bi-mortarboard` de memoria.

El sistema MUST registrar un Vueform element custom `IconPickerElement` (type `icon-picker`) en `modsComponents/`, que renderiza un campo de búsqueda + grilla de íconos del manifest `bootstrap-icons`, filtra por texto, emite la clase `bi-*` seleccionada como string y se hidrata desde un `bi-*` preexistente.

<details><summary>Scenarios de validacion</summary>

| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| S1 | selección | element montado sin valor | el usuario pincha el ícono "book" | `value` se actualiza | `value === 'bi-book'` (string) |
| S2 | hidratación | element montado con `value='bi-mortarboard'` | render inicial | el ícono mortarboard queda activo | celda con `aria-selected="true"` |
| S3 | búsqueda | element montado, catálogo completo | el usuario escribe "mortar" | la grilla filtra | solo íconos cuyo nombre matchea "mortar" |

</details>

### REQ-03: Accesibilidad WAI-ARIA APG en ambos pickers

> **Que cambia**: los dos pickers se pueden operar con teclado y son legibles por lector de pantalla.
> **Por que**: RULE-curriculum-design-002 (must) lo exige para elements compuestos del mod.

El sistema MUST cumplir WAI-ARIA APG: `ColorPickerElement` como `radiogroup` (roving tabindex, `aria-checked`, navegación por flechas, Space/Enter selecciona) e `IconPickerElement` como `listbox`/`grid` con campo de búsqueda etiquetado (`aria-selected`, navegación por teclado). Cada componente MUST tener un test `axe-core` (wcag2aa + wcag21aa) con 0 violaciones, incluida `color-contrast` para el ColorPicker.

<details><summary>Scenarios de validacion</summary>

| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| S1 | axe color | DOM del ColorPicker renderizado | `axe.run(el, {runOnly:{type:'tag',values:['wcag2aa','wcag21aa']}})` | sin violaciones | `violations.length === 0` |
| S2 | axe icon | DOM del IconPicker renderizado | `axe.run(...)` | sin violaciones | `violations.length === 0` |
| S3 | roles | ambos montados | inspección de DOM | roles correctos | `radiogroup`/`listbox` + items con role + aria-state |

</details>

### REQ-04: Cableado en los 3 layouts de requirementCategory

> **Que cambia**: el formulario de crear/editar/ver una línea muestra los pickers en lugar de cajas de texto.
> **Por que**: es donde el usuario realmente captura color/ícono.

El sistema MUST reemplazar `type:text` por `type:color-picker` (campo `color`) y `type:icon-picker` (campo `icon`) en `default_requirementCategory_create.json`, `default_requirementCategory_edit.json` y `default_requirementCategory_view.json`, preservando label/description/columns. El JSON MUST seguir parseando y la suite del mod no MUST regresionar.

### REQ-05: lang + storybook por componente

> **Que cambia**: los pickers tienen sus textos en español y una historia en Storybook.
> **Por que**: convención del mod (i18n declarativo + storybook para verificación visual).

El sistema MUST agregar archivos de lang (`es_CL@colorPicker.json`, `es_CL@iconPicker.json` o entradas en `es_CL.json` según convención del mod) con los textos de cada picker (labels, placeholder de búsqueda, estados) y MUST crear un `.stories.ts` por componente que renderice el element en sus estados (vacío, con valor, búsqueda activa).

## Artifacts

### Vue components (METASPEC-vue-component)

| name | layer | props clave | emits | Notas |
|------|-------|-------------|-------|-------|
| ColorPickerElement | vueform-element | (Vueform element schema) | (via `value`/`update`) | `defineElement`, type `color-picker`, radiogroup de swatches de tokens curados |
| IconPickerElement | vueform-element | (Vueform element schema) | (via `value`/`update`) | `defineElement`, type `icon-picker`, listbox + búsqueda sobre manifest bootstrap-icons |

- **mod**: curriculum-design
- **storybook**: true (ambos)
- **Patrón base**: `RichTextRendererElement.vue` (Options API via `defineElement`, valor vía `this.value`). Auto-registro por glob en `vueform.config.ts` (el `name` deriva el type).
- **a11y**: WAI-ARIA APG (RULE-curriculum-design-002). Tests axe-core en `tests/integration/`.

### Layout config (METASPEC-layout-config)

| Layout | Cambio | Consumidor |
|--------|--------|-----------|
| `default_requirementCategory_create.json` | `color`/`icon`: `type:text` → `color-picker`/`icon-picker` | form de creación de línea |
| `default_requirementCategory_edit.json` | idem | form de edición de línea |
| `default_requirementCategory_view.json` | idem (read-only render del valor) | detalle de línea |

## Tasks

### Session 1 — ColorPickerElement (swatches de tokens up1) [tipo: ⚑ fuerte (dual-judge)] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear `ColorPickerElement.vue` (defineElement type `color-picker`; radiogroup de swatches de un set curado de tokens `--up1-color-*`; emite/hidrata string token/hex; roving tabindex + aria-checked) + helper de tokens si aplica | REQ-01, REQ-03 | developer | — | `modsComponents/ColorPicker/ColorPickerElement.vue` (+ `.ts` satélite si hace falta) | vitest unit (TC-01/TC-02) + JSON/TS OK | `git checkout` del dir ColorPicker | DET-1, DET-2, DET-8, RULE-curriculum-design-002, RULE-curriculum-design-014 | done | 1 |
| S1.T2 | Lang + storybook del ColorPicker (`es_CL@colorPicker.json` o entrada en `es_CL.json`; `ColorPicker.stories.ts` con estados vacío/con-valor) | REQ-05 | developer | S1.T1 | `lang/es_CL@colorPicker.json`, `modsComponents/ColorPicker/ColorPicker.stories.ts` | JSON.parse OK + story monta | `git checkout` de los archivos | DET-2, RULE-curriculum-design-014 | done | 1 |
| S1.T3 | Test a11y axe-core del ColorPicker (wcag2aa/21aa, incl. color-contrast) + unit de selección/hidratación | REQ-01, REQ-03 | developer | S1.T1 | `tests/integration/color-picker-a11y.test.ts`, `tests/integration/color-picker.test.ts` | vitest run: 0 violations + TC-01/02/03 PASS | `git checkout` de los tests | DET-7, DET-4, RULE-curriculum-design-002 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2, dual-judge DET-35) | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | axe 0 violations + vitest sin regresión + dual-judge APPROVED | — | DET-13, DET-20, DET-23, DET-35 | done | 1 |

### Session 2 — IconPickerElement (grid bootstrap-icons + búsqueda) [tipo: ⚑ fuerte (dual-judge)] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Crear `IconPickerElement.vue` (defineElement type `icon-picker`; campo de búsqueda + grilla acotada/virtual del manifest `bootstrap-icons`; emite/hidrata `bi-*`; listbox + aria-selected + nav teclado) + import del manifest | REQ-02, REQ-03 | developer | — | `modsComponents/IconPicker/IconPickerElement.vue` (+ `.ts` satélite si hace falta) | vitest unit (TC-04/TC-05) + TS OK | `git checkout` del dir IconPicker | DET-1, DET-2, DET-8, RULE-curriculum-design-002, RULE-curriculum-design-014, RULE-curriculum-design-015 | done | 2 |
| S2.T2 | Lang + storybook del IconPicker (`es_CL@iconPicker.json` o entrada en `es_CL.json`; `IconPicker.stories.ts` con estados vacío/con-valor/búsqueda) | REQ-05 | developer | S2.T1 | `lang/es_CL@iconPicker.json`, `modsComponents/IconPicker/IconPicker.stories.ts` | JSON.parse OK + story monta | `git checkout` de los archivos | DET-2, RULE-curriculum-design-014 | done | 2 |
| S2.T3 | Test a11y axe-core del IconPicker (wcag2aa/21aa) + unit de selección/hidratación/búsqueda | REQ-02, REQ-03 | developer | S2.T1 | `tests/integration/icon-picker-a11y.test.ts`, `tests/integration/icon-picker.test.ts` | vitest run: 0 violations + TC-04/05/06 PASS | `git checkout` de los tests | DET-7, DET-4, RULE-curriculum-design-002 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T2, dual-judge DET-35) | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | axe 0 violations + vitest sin regresión + dual-judge APPROVED | — | DET-13, DET-20, DET-23, DET-35 | done | 2 |

### Session 3 — Cablear los layouts de requirementCategory [tipo: auto] [tier: T1]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Cambiar `color`/`icon` de `type:text` → `type:color-picker`/`icon-picker` en los 3 layouts de requirementCategory (preservar label/description/columns) | REQ-04 | developer | S1.GATE, S2.GATE | `config/layouts/default_requirementCategory_{create,edit,view}.json` | JSON.parse OK + suite del mod sin regresión | `git checkout` de los 3 layouts | DET-2, DET-8, DET-16, RULE-curriculum-design-012 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier: T1) | — | reviewer | S3.T1 | ticket | vitest sin regresión + types presentes en config; smoke runtime DB-gated diferido | — | DET-13, DET-20, DET-23 | done | 3 |

## Constraints

- RULE-curriculum-design-002: WAI-ARIA APG obligatorio en elements compuestos — gobierna el diseño a11y de ambos pickers (bloqueante en el gate).
- RULE-curriculum-design-014: patrón de componente del mod (defineElement + auto-registro glob) — molde estructural.
- RULE-curriculum-design-015: reusar Vueform search+create, no construir desde cero — aplica a la búsqueda del IconPicker (apoyarse en primitivas).
- RULE-curriculum-design-012: layouts por convención de nombre — los 3 layouts ya existen, solo se cambia el `type`.
- DEC-032: requirementCategory modela color e icono — este spec entrega su selección visual.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| bootstrap-icons (`^1.13.1`) | internal (dep del mod) | manifest `font/bootstrap-icons.json` + clases `bi-*` | ya instalada; sin riesgo nuevo |
| tokens `--up1-color-*` | internal (layout) | swatches del ColorPicker | propagados a la suite vía CSS; en Storybook se cargan los tokens del layout |
| TICKET-082 / TICKET-093 | internal | objeto + layouts de requirementCategory | ambos cerrados |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| a11y incompleta (teclado/foco/contraste) | medium | gate falla / usuarios con lector de pantalla bloqueados | tests axe-core wcag2aa/21aa por componente + dual-judge T2 |
| render de 2078 íconos degrada UI | medium | jank en el form | búsqueda filtra + grid acotado/scroll; no montar todos a la vez |
| element no hidrata valor preexistente | medium | edit de línea muestra picker vacío | TC explícito de hidratación desde string en ambos pickers |
| drift de layouts con MC-02-fix | low | conflicto de edición | TICKET-093 cerrado; layouts consolidados; S3 corre al final |

## Open questions

- (ninguna bloqueante) El set exacto de tokens a exponer como swatches y la cantidad de íconos visibles antes de scroll se deciden en execute con racional (super autopilot) y se registran como learn.

## Decisions

### DEC-LOCAL-01: Swatches de tokens curados, no color hex libre
- **Contexto**: el ColorPicker podría ofrecer un input hex/RGB arbitrario o solo swatches del tema.
- **Drivers**: coherencia visual del tema up1; el dato es semántico (token), no un color cualquiera; el request habla de "swatches del tema up1".
- **Opcion elegida**: grilla de swatches de un set curado de tokens `--up1-color-*`. Hidrata un hex preexistente sin romper, pero no ofrece picker hex libre.
- **Alternativas**: input hex libre (descartado: rompe coherencia, no lo pide el request).
- **Consecuencias**: gana consistencia; pierde flexibilidad de color arbitrario (fuera de alcance).
- **Session**: design.

### DEC-LOCAL-03: el layout `view` de requirementCategory NO se cablea con los pickers
- **Contexto**: REQ-04 pedía cablear los 3 layouts (create/edit/view). Los pickers son elements interactivos (`submits: true`, grilla clickeable).
- **Drivers**: en una pantalla de solo-lectura (view), una grilla seleccionable es UX incorrecta; los pickers no implementan un modo read-only.
- **Opción elegida**: `view` se mantiene en `type:text` (display read-only del valor token/`bi-*`). Solo `create`/`edit` reciben `color-picker`/`icon-picker`. Además se amplió `columns.container` de 3→6 (la grilla visual necesita ancho que la caja de texto no requería).
- **Alternativas**: (a) cablear view con el picker interactivo (descartado: UX confusa en read-only); (b) construir un render read-only dedicado (swatch chip + glyph) para view (descartado: fuera de alcance, nice-to-have follow-up).
- **Consecuencias**: la selección visual (el core del request) vive en create/edit; view muestra el valor elegido. Desviación de REQ-04 auditada.
- **Session**: S3.

### DEC-LOCAL-02: IconPicker sobre el manifest completo con búsqueda
- **Contexto**: ofrecer un subset curado de íconos vs el catálogo completo (2078).
- **Drivers**: evitar mantener una lista a mano (drift); el usuario sabe buscar por nombre.
- **Opcion elegida**: manifest completo `bootstrap-icons.json` + búsqueda que filtra + grid acotado.
- **Alternativas**: subset hardcoded (descartado: lista duplicada que envejece).
- **Consecuencias**: catálogo completo siempre actualizado con la dep; requiere render acotado para performance.
- **Session**: design.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..REQ-05 pasan (selección, hidratación, búsqueda, cableado de layouts).
- [ ] **Tests**: tests axe-core (0 violaciones) + unit de selección/hidratación/búsqueda escritos y pasando.
- [ ] **NFRs**: a11y WAI-ARIA APG verificada por axe (wcag2aa/21aa).
- [ ] **Rules**: RULE-curriculum-design-002/014/015/012 respetadas.
- [ ] **Integration**: suite del mod sin regresión (baseline 788/788).
- [ ] **Docs**: lang + storybook por componente.
