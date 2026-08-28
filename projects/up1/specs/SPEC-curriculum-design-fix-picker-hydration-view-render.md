---
id: SPEC-curriculum-design-fix-picker-hydration-view-render
project: up1
ticket: TICKET-097
status: done
---

# Hidratación de pickers al editar + modo read-only (view) dentro del mismo picker

# Hidratación de pickers al editar + modo read-only (view) dentro del mismo picker

## Executive summary — lo que estas aprobando

> *Revisión rápida. Detalle en Diagnóstico, Requirements, Tasks.*

**Que se quiere**: que ColorPicker e IconPicker (1) marquen el color/ícono ya guardado al abrir el modal de EDICIÓN (hoy no hidratan), y (2) en el modal de VER se muestren como chip de color / glifo de ícono read-only en vez de texto. Ambos modos viven en el MISMO componente (corrección del dev): el picker rinde grilla en edición y display read-only en view, según `element.isDisabled`. Sin cambios de valor/backend.

**Decisiones criticas**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Hidratación vía `onMounted` re-read de `element.value` (además de init + watch) | El modal carga el valor async, después del setup; `onMounted` lee cuando ya está (patrón ValidationTextEditorElement) |
| 2 | Modo read-only DENTRO del picker (`isReadonly` desde `element.isDisabled`), NO componente dedicado | Corrección del dev: un componente por picker con dos modos (ver/editar) |
| 3 | El view reusa los types `color-picker`/`icon-picker` (revierte DEC-LOCAL-03) | El `mode:"view"` del layout activa `isReadonly` → render read-only automático |

**Riesgos y mitigación**:
- **Hidratación no reproducible en vitest** (SFC no se monta) → lógica (`readLoadedValue`, `resolveDisabled`) cubierta por unit; **smoke DB-gated obligatorio** (es el síntoma).
- **Romper el modo edición** al agregar el read-only → tests de ambos modos + REQ-REGRESSION (844 baseline).

**Que NO se hace**: componente display separado (descartado por el dev); cambiar el valor persistido; tocar backend; layouts create/edit (ya OK).

**Tamaño**: 1 session T2 ⚑ (dual-judge).

**Como vas a saber que funciona**: abrís edición de una línea con valores → swatch/ícono marcados; abrís ver → chip de color + glifo (no texto); editar sigue funcionando.

## Purpose

Cerrar los dos comportamientos pendientes de los pickers: hidratación al abrir edición (`onMounted` re-read) y render read-only en view (modo `isReadonly` dentro del mismo picker). Actor: usuario que ve/edita una línea de formación.

## Diagnostico

- **Hidratación (REQ-FIX-01)**: el `select()` por click funciona (muta el ref local), pero al abrir edición el ref se init en `setup` cuando `element.value` aún está vacío (el modal carga async); el `watch(() => element.value)` no basta en ese timing. `ValidationTextEditorElement` resuelve esto con un `onMounted` que re-lee `element.value` tras montar.
- **View (REQ-FIX-02)**: el layout `view` quedó `type:text` (DEC-LOCAL-03 de TICKET-094). El dev pide render visual read-only. Se resuelve con un modo `isReadonly` dentro del picker (`element.isDisabled`, true en `mode:"view"`), revirtiendo DEC-LOCAL-03.

## Requirements

### REQ-FIX-01: hidratación al abrir el modal de edición (ambos pickers)

> **Que cambia**: al abrir edición, el swatch/ícono guardado aparece marcado.
> **Por que**: hoy solo se marca lo que el usuario clickea en la sesión.

El sistema MUST re-leer el valor cargado en `onMounted` (`selected = readLoadedValue(element)`) además del init en setup y el `watch`, de modo que el valor del registro (cargado async por el modal) hidrate el estado local. Aplica a ColorPickerElement e IconPickerElement.

<details><summary>Scenarios</summary>

| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| S1 | onMounted re-read | element con `value` poblado al mount | montar | `selected` = element.value | hidratación |
| S2 | edit hidrata (smoke) | línea con color/icon guardados | abrir edit | swatch+ícono marcados al abrir | DB-gated dev |

</details>

### REQ-FIX-02: modo read-only (view) dentro del mismo picker

> **Que cambia**: en el modal de ver, el color es un chip y el ícono un glifo (read-only), no texto ni grilla.
> **Por que**: el view debe comunicar el estilo visual de la línea.

El sistema MUST renderizar, cuando `element.isDisabled` es true (layouts `mode:"view"`), un modo read-only: ColorPicker = chip/swatch del color + label; IconPicker = glifo del ícono + nombre. Cuando es false, la grilla de edición (comportamiento actual). El modo read-only MUST ser accesible (aria-label con el color/ícono). El layout `view` MUST usar `type:color-picker`/`icon-picker` (revierte DEC-LOCAL-03).

<details><summary>Scenarios</summary>

| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| S1 | resolveDisabled | `element.isDisabled` = true \| `{value:true}` | resolver | isReadonly true | bool y ref-wrapped |
| S2 | render read-only | isReadonly + value | render | chip/glifo, sin grilla | aria-label presente |
| S3 | view layout | `default_requirementCategory_view.json` | render | color/icon = picker types | no `type:text` |
| S4 | edición intacta | isReadonly false | render | grilla editable | REQ-REGRESSION |

</details>

### REQ-REGRESSION: no romper el modo edición ni lo entregado

El sistema MUST preservar: selección por click, curaduría de íconos, emisión del valor, a11y de la grilla, y la suite (baseline 844/844).

## Fix scope

| Archivo | Antes | Después |
|---------|-------|---------|
| `modsComponents/ColorPicker/ColorPickerElement.vue` | sin onMounted; sin modo read-only | `onMounted` re-read + `isReadonly` (element.isDisabled) + render read-only (chip+label) |
| `modsComponents/IconPicker/IconPickerElement.vue` | idem | `onMounted` re-read + `isReadonly` + render read-only (glifo+nombre) |
| `modsComponents/*/useColorPicker.ts` / `useIconPicker.ts` | — | `resolveDisabled(element)` helper testeable |
| `config/layouts/default_requirementCategory_view.json` | color/icon `type:text` | `color-picker`/`icon-picker` |
| tests | edición | + onMounted/resolveDisabled + render read-only a11y (ambos modos) |
| `docs/guides/{color,icon}-picker.md` | — | documentar modo read-only + hidratación onMounted |

## Tasks

### Session 1 — Hidratación (onMounted) + modo read-only en los pickers + cablear view [tipo: ⚑ fuerte (dual-judge)] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | ColorPicker: `onMounted` re-read + `resolveDisabled`/`isReadonly` + render read-only (chip color + label, aria-label) cuando isReadonly | REQ-FIX-01, REQ-FIX-02 | developer | — | `modsComponents/ColorPicker/ColorPickerElement.vue`, `useColorPicker.ts` | vitest + TS OK | `git checkout` | DET-5, DET-8, RULE-curriculum-design-019, RULE-curriculum-design-002 | done | 1 |
| S1.T2 | IconPicker: `onMounted` re-read + `isReadonly` + render read-only (glifo + nombre, aria-label) cuando isReadonly | REQ-FIX-01, REQ-FIX-02 | developer | S1.T1 | `modsComponents/IconPicker/IconPickerElement.vue`, `useIconPicker.ts` | vitest + TS OK | `git checkout` | DET-5, DET-8, RULE-curriculum-design-019, RULE-curriculum-design-002 | done | 1 |
| S1.T3 | Cablear `view` a los types (revierte DEC-LOCAL-03) + tests (resolveDisabled bool/ref, render read-only a11y axe, ambos modos) + guías | REQ-FIX-02, REQ-REGRESSION | developer | S1.T1, S1.T2 | `config/layouts/default_requirementCategory_view.json`, `tests/integration/{color,icon}-picker*.test.ts`, `docs/guides/{color,icon}-picker.md` | vitest sin regresión (≥844) + axe 0 | `git checkout` | DET-7, DET-4, RULE-curriculum-design-012, RULE-curriculum-design-002 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T2, dual-judge DET-35) | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | dual-judge APPROVED + vitest sin regresión + smoke runtime exigido (DB-gated, dev) | — | DET-13, DET-20, DET-23, DET-35 | pending | 1 |

## Constraints

- RULE-curriculum-design-019: estado de display = ref local; init + watch + `onMounted` re-read (este ticket cierra el matiz del timing).
- RULE-curriculum-design-002 (must): el modo read-only también accesible (aria-label).
- RULE-curriculum-design-012: layouts por convención de nombre.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Hidratación no reproducible en vitest | high | el bug persiste sin que un test lo atrape | lógica (readLoadedValue/resolveDisabled/onMounted) cubierta unit; smoke DB-gated obligatorio |
| Agregar read-only rompe el modo edición | medium | regresión | tests de ambos modos + REQ-REGRESSION + baseline 844 |
| `element.isDisabled` con shape inesperada | low | modo mal resuelto | `resolveDisabled` tolera bool y ref-wrapped (patrón VTE) + unit test |

## Open questions

- (ninguna bloqueante) El estilo exacto del chip/glifo read-only se decide en execute (super) — coherente con el tema.

## Decisions

### DEC-LOCAL-01: modo read-only DENTRO del picker (supersede DEC-LOCAL-03 de TICKET-094)
- **Contexto**: TICKET-094 dejó el view como `type:text` (DEC-LOCAL-03); el dev pide render visual y que viva en el mismo componente.
- **Drivers**: un componente por picker con dos modos (ver/editar); evitar un componente display separado; reusar `element.isDisabled`.
- **Opción elegida**: `isReadonly` (desde `element.isDisabled`) dentro de cada picker → render read-only; el view reusa los types `color-picker`/`icon-picker`. Revierte DEC-LOCAL-03.
- **Alternativas**: componente display dedicado (descartado por el dev tras evaluarlo); inline en layout (descartado: no soporta bien el binding).
- **Consecuencias**: un solo componente por picker, dos modos; el view deja de mostrar texto. Más lógica condicional en cada element (cubierta por tests).
- **Session**: S1.

## Acceptance checkpoints

- [x] **Funcional**: REQ-FIX-01 (hidratación edit, vía `props.default`) + REQ-FIX-02 (read-only view, `disabled:true`+isReadonly) + REQ-REGRESSION (edición intacta). Confirmado en smoke del dev.
- [x] **Tests**: readLoadedValue (+unwrap de Ref), resolveDisabled (bool/ref), resolveElementProxy, render read-only a11y (axe 0), ícono fuera de curados como primero, ambos modos.
- [x] **Smoke runtime (DB-gated)**: edit hidrata + view muestra chip/glifo read-only + alineado + modal + sin eliminar — confirmado visualmente por el dev (S2).
- [x] **Regression**: suite 875/875 (baseline 844), axe 0, TS 75==baseline (0 nuevos), ESLint 0.

> **Nota de cierre**: la hipótesis del intake (`onMounted` re-read) y los intentos S2 (proxy `element.el$.value`, unwrap del Ref) NO hidrataban — ver Failed approaches del ticket. El mecanismo real es `props.default` (RULE-019 refinada). Read-only en view exige `disabled:true` en el layout, no se deriva de `mode:"view"` (RULE-021 nueva).
