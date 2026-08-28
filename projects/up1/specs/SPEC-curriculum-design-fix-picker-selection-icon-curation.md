---
id: SPEC-curriculum-design-fix-picker-selection-icon-curation
project: up1
ticket: TICKET-096
status: in_progress
---

# Fix selección visible/hidratación de los pickers + curaduría de íconos educacionales

# Fix selección visible/hidratación de los pickers + curaduría de íconos educacionales

## Executive summary — lo que estas aprobando

> *Revisión rápida. Detalle en Diagnóstico, Requirements, Tasks.*

**Que se quiere**: corregir que ColorPicker e IconPicker (TICKET-094) no muestran cuál swatch/ícono está seleccionado — ni el guardado al abrir la edición (no hidrata), ni el que el usuario clickea. Y curar el catálogo de íconos para que por defecto muestre íconos educacionales/descriptivos en vez de navegación (flechas/alineación). El valor persistido no cambia. Mod-only, aditivo.

**Decisiones criticas**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Estado de selección LOCAL (`ref`), no `computed` sobre `element.value` | Es la causa raíz del bug. El patrón writable probado (ValidationTextEditorElement) mantiene estado local + watch + fallback a `form$.data` para hidratar |
| 2 | IconPicker: set curado educacional por defecto, catálogo completo buscable | Decisión del dev. El default alfabético del manifest es nav-heavy |

**Riesgos y mitigación**:
- **El fix de reactividad no se valida con tests de lógica pura** (gap de TICKET-094) → agregar cobertura del flujo de selección + **smoke runtime obligatorio** al cierre (sync + reinicio + verificar en una línea real).
- **Regresión en lo que ya funcionaba** (emisión del valor, a11y) → REQ-REGRESSION + suite 836/836 baseline.

**Que NO se hace**: cambiar el formato del valor persistido; tocar backend; render read-only del layout `view` (sigue como TICKET-094 DEC-LOCAL-03).

**Tamaño**: 1 session T2 ⚑ (dual-judge). La parte riesgosa es la reactividad/hidratación (es lo que falló).

**Como vas a saber que funciona**: abrís una línea con color/ícono guardados → aparecen marcados; clickeás otro → se resalta; el IconPicker arranca con íconos educacionales; la suite no regresiona.

## Purpose

Restaurar el feedback de selección (hidratación + click) en ColorPickerElement e IconPickerElement migrando el estado de display de un `computed` sobre `element.value` a estado LOCAL reactivo (patrón ValidationTextEditorElement), y curar el catálogo por defecto del IconPicker a un set educacional. Actor: usuario que crea/edita una línea de formación.

## Diagnostico

- **Síntoma**: al abrir el form de edición no se ve qué color/ícono está guardado; al clickear, no se resalta la selección. Ambos pickers.
- **Causa raíz** (multi-capa, DET-5): el SFC deriva `isSelected` de `currentValue = computed(() => element.value)`. (a) El `computed` no re-evalúa de forma fiable tras `element.update()` → el click no cambia el resalte. (b) Al montar la edición, `element.value` llega async y puede estar vacío en el setup → no hidrata. El CSS de selección (`.cp-swatch--selected`, `.ip-cell--selected`) es correcto; nunca se aplica porque `isSelected` queda en `false`.
- **Evidencia del patrón correcto**: `ValidationTextEditorElement` (mod object-manager-editor) usa `ref` local inicializado desde `element.value`/`props.default`, con fallback que lee `element.form$.data`, + `watch`, + `element.update()` para persistir.

## Requirements

### REQ-FIX-01: selección reactiva (hidratación + click) en ambos pickers

> **Que cambia**: al abrir la edición se marca el color/ícono guardado; al clickear, se resalta el elegido y persiste.
> **Por que**: hoy el indicador nunca se aplica porque el estado no es reactivo.

El sistema MUST mantener el estado de selección de ColorPickerElement e IconPickerElement en estado LOCAL reactivo (`ref`), inicializado desde `element.value` con fallback a `element.form$.data` (valor cargado del registro), sincronizado vía `watch` ante cambios externos del valor, y persistido con `element.update()` al seleccionar. `aria-checked`/`aria-selected` MUST reflejar el estado real.

<details><summary>Scenarios</summary>

| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| S1 | hidratación color | línea con `color='var(--up1-color-info-500)'` | abrir edición | swatch info marcado | `aria-checked="true"` en info |
| S2 | click color | form abierto | click swatch danger | danger se resalta + persiste | `value='var(--up1-color-danger-500)'`, danger `aria-checked` |
| S3 | hidratación icon | línea con `icon='bi-mortarboard'` | abrir edición | ícono mortarboard marcado | `aria-selected="true"` |
| S4 | click icon | form abierto | click ícono book | book se resalta + persiste | `value='bi-book'`, book `aria-selected` |

</details>

### REQ-FIX-02: catálogo del IconPicker curado a educacional por defecto

> **Que cambia**: sin búsqueda, el IconPicker muestra primero íconos educacionales/descriptivos; el catálogo completo sigue accesible al buscar.
> **Por que**: hoy arranca con flechas/alineación (navegación), irrelevantes para líneas de formación.

El sistema MUST mostrar, cuando no hay texto de búsqueda, un set curado de íconos educacionales/descriptivos primero (CURATED_EDUCATIONAL). Con texto de búsqueda, MUST filtrar el catálogo completo (2078). El set curado MUST contener solo nombres válidos del manifest.

<details><summary>Scenarios</summary>

| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| S1 | default curado | sin búsqueda | render inicial | primeros íconos = set curado | no aparecen `arrow-*`/`chevron-*` al inicio |
| S2 | búsqueda full | element | buscar "arrow" | el catálogo completo filtra | aparecen los arrow-* (siguen accesibles) |
| S3 | validez | — | — | cada nombre curado existe en el manifest | `CURATED_EDUCATIONAL ⊆ ALL_ICON_NAMES` |

</details>

### REQ-REGRESSION: no romper lo que ya funcionaba

> **Que cambia**: nada para el usuario; garantiza que el fix no rompe emisión/registro/a11y.

El sistema MUST preservar: el formato del valor emitido (token / `bi-*`), la navegación por teclado, 0 violaciones axe, y la suite del mod (baseline 836/836).

## Fix scope

| Archivo | Antes | Después |
|---------|-------|---------|
| `modsComponents/ColorPicker/ColorPickerElement.vue` | `currentValue = computed(() => element.value)` | `ref` local `selected` + init (element.value ?? form$.data) + watch + update |
| `modsComponents/IconPicker/IconPickerElement.vue` | idem | idem |
| `modsComponents/IconPicker/useIconPicker.ts` | `filterIcons('')` → primeros 120 alfabéticos | `CURATED_EDUCATIONAL` primero cuando query vacío; full catalog al buscar |
| tests `color-picker*.test.ts` / `icon-picker*.test.ts` | lógica pura | + flujo de selección/hidratación + set curado |
| `docs/guides/{color,icon}-picker.md` | limitación "wiring no testeado" | actualizar (cubierto) |

## Tasks

### Session 1 — Fix reactividad de selección (ambos pickers) + curaduría de íconos [tipo: ⚑ fuerte (dual-judge)] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | ColorPicker: estado local `selected` (ref) init desde `element.value` con fallback `element.form$.data` + watch + `element.update()`; `isSelected`/`activeIndex` derivan del ref local | REQ-FIX-01 | developer | — | `modsComponents/ColorPicker/ColorPickerElement.vue` | vitest + JSON/TS OK | `git checkout` del .vue | DET-5, DET-8, RULE-curriculum-design-019, RULE-curriculum-design-002 | done | 1 |
| S1.T2 | IconPicker: misma reactividad (ref local + fallback + watch) + `CURATED_EDUCATIONAL` en useIconPicker.ts mostrado primero cuando query vacío (catálogo completo al buscar) | REQ-FIX-01, REQ-FIX-02 | developer | S1.T1 | `modsComponents/IconPicker/IconPickerElement.vue`, `modsComponents/IconPicker/useIconPicker.ts` | vitest + JSON/TS OK | `git checkout` de los archivos | DET-5, DET-8, RULE-curriculum-design-019, RULE-curriculum-design-015 | done | 1 |
| S1.T3 | Tests del flujo de selección (montar SFC si es posible, si no verificar wiring/estado) + set curado (CURATED ⊆ manifest, default no-nav) + a11y aria-state real; actualizar guías | REQ-FIX-01, REQ-FIX-02, REQ-REGRESSION | developer | S1.T1, S1.T2 | `tests/integration/{color,icon}-picker*.test.ts`, `docs/guides/{color,icon}-picker.md` | vitest run sin regresión (≥836) + axe 0 | `git checkout` de tests/docs | DET-7, DET-4, RULE-curriculum-design-002 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T2, dual-judge DET-35) | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | dual-judge APPROVED + vitest sin regresión + smoke runtime exigido (DB-gated, dev) | — | DET-13, DET-20, DET-23, DET-35 | done | 1 |

## Constraints

- RULE-curriculum-design-019: patrón writable — este fix lo refuerza (estado local, no computed sobre element.value).
- RULE-curriculum-design-002 (must): aria-state debe reflejar la selección real.
- RULE-curriculum-design-015: reusar primitivas — el set curado es una constante, no un combobox nuevo.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Fix de reactividad no se valida con unit puros (gap TICKET-094) | high | el bug se repite sin que un test lo atrape | montar el SFC en el test si es posible; smoke runtime obligatorio al cierre |
| `element.form$.data` shape distinto al esperado | medium | hidratación falla | seguir el fallback exacto de ValidationTextEditorElement; verificar en smoke |
| Regresión en emisión/a11y | low | rompe lo que funcionaba | REQ-REGRESSION + axe + baseline 836 |

## Open questions

- (ninguna bloqueante) El set exacto de íconos curados se decide en execute con criterio educacional (super) y se documenta.

## Decisions

### DEC-LOCAL-01: estado de selección LOCAL, no computed sobre element.value
- **Contexto**: TICKET-094 derivó `isSelected` de `computed(() => element.value)`; no hidrata ni resalta.
- **Drivers**: reactividad fiable ante `update()`; hidratación del valor cargado (async); patrón probado del repo.
- **Opción elegida**: `ref` local + init (element.value ?? form$.data) + watch + persistir con `element.update()`.
- **Alternativas**: insistir con computed (descartado: es la causa del bug).
- **Consecuencias**: feedback de selección correcto; alinea con ValidationTextEditorElement; refuerza RULE-019.
- **Session**: S1.

## Acceptance checkpoints

- [ ] **Funcional**: REQ-FIX-01 (hidratación + click, ambos pickers) y REQ-FIX-02 (curaduría) verificados.
- [ ] **Tests**: flujo de selección + set curado + a11y, pasando.
- [ ] **Smoke runtime (DB-gated)**: tras sync + reinicio, hidratación y selección reales verificadas en una línea — evidencia exigida.
- [ ] **Regression**: suite ≥ 836/836, axe 0.
- [ ] **Rules**: RULE-019 reforzada; RULE-002 (aria-state real).
