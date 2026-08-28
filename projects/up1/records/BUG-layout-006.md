---
id: BUG-layout-006
project: up1
type: bug
module: layout
tags:
  - layout
  - atoms
  - Badge
  - dark-theme
  - contraste
  - a11y
  - design-tokens
---

# Badge variant="secondary" ilegible en dark theme (bg gray-600 fijo + texto blanco ≈ 2:1)

## Symptom

Un `<Badge variant="secondary">` en dark theme se ve con fondo gris **claro** y texto blanco: el texto casi no se lee (contraste ≈ 2:1). Observado en el chip "Solo lectura" de la malla (MC-05) antes del workaround.

## Expected behavior

El badge `secondary` debe ser legible en ambos temas (light y dark) — contraste texto/fondo ≥ 4.5:1 (WCAG AA para texto normal; ≥ 3:1 para texto grande/UI). En dark, un badge neutro debería tener fondo oscuro + texto claro (o un gris suficientemente oscuro con texto blanco).

## Root cause

- **File**: `layout/src/components/atoms/Badge/Badge.vue:135-137` + `layout/src/styles/design-tokens/colors.css:111,304`
- **Cause**: `.bg-secondary { background-color: var(--up1-color-secondary-500) }` y `--up1-color-secondary-500: var(--up1-gray-600)` = **#9b9b9b** (gris claro, valor **fijo**). El bloque dark (`colors.css:304 [data-theme="dark"], .dark`) **no remapea** `secondary-500` ni `gray-600`. El texto del badge queda blanco (default Bootstrap `--bs-badge-color`, el átomo sólo fija `color` para `.bg-light`/`.bg-dark`). Resultado: #9b9b9b + #fff ≈ 2:1. A diferencia de `.bg-light`/`.bg-dark` (que sí fijan `color`), las variantes intermedias no garantizan contraste.

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | cualquier usuario en dark theme que vea un Badge secondary |
| Data affected | ninguna (visual/a11y) |
| Modules affected | layout (átomo Badge) + todo consumidor de `Badge variant="secondary"` en dark |
| Frequency | siempre en dark theme |

## Reproduction

### Environment
| Campo | Valor |
|-------|-------|
| Environment | dev |
| Client | suite/storybook en dark theme (`[data-theme="dark"]` / `.dark`) |
| Data conditions | — |

### Steps
1. Activar dark theme.
2. Renderizar `<Badge label="Solo lectura" variant="secondary" />`.
3. Resultado observado: fondo gris claro (#9b9b9b) + texto blanco, ilegible.

## Workaround

No usar `variant="secondary"` para chips neutros en contextos dark. En MC-05 (TICKET-085) se reemplazó por un chip propio `.cm-mode` con **tokens semánticos que invierten por tema** (`--up1-bg-tertiary` + `--up1-text-secondary` + `--up1-border-color` en lectura; `--up1-color-primary` sólido + `--up1-text-inverse` en edición). Alternativa: `customColor` con un gris suficientemente oscuro (el átomo fuerza `color:#fff` en `.badge-custom`).

## Solution

(Propuesta — core/layout, fuera de alcance del mod en SP5) En el átomo `Badge`: (a) fijar un `color` legible para `.bg-secondary` (y demás variantes intermedias) acorde al fondo, y/o (b) remapear `--up1-color-secondary-500` (o introducir un token de "badge neutro") en el bloque dark de `colors.css` para que invierta. Verificar contraste AA en ambos temas para todas las variantes.

## Related

- **Rules**: —
- **Decisions**: —
- **Specs**: SPEC-curriculum-design-mesh-view (TICKET-085 / MC-05), learn L5; fix del consumidor en commit `667b4e6`
