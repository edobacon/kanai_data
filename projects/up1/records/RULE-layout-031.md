---
id: RULE-layout-031
project: up1
type: rule
module: layout
tags:
  - css
  - theming
  - dark-mode
  - tokens
---

# CSS de mods solo usa tokens declarados en `theme-tokens.css` — fallbacks de color hardcoded prohibidos

## What

Todo `var(--up1-*)` en CSS de mods (custom elements Vueform, layouts, vistas, sub-componentes) debe referenciar una variable que existe en `theme-tokens.css`. **Prohibido** el patron `var(--up1-no-existe, #eef2f5)` con fallback de color hardcoded — si la variable no existe en `theme-tokens.css`, se debe crear ahi primero (con su valor para light + dark mode).

Casos validos:
- `var(--up1-bg-surface)` — variable declarada en `theme-tokens.css`, sin fallback
- `var(--up1-bg-surface, var(--up1-bg-default))` — fallback a otra variable que SI existe (cadena)

Casos prohibidos:
- `var(--up1-bg-hover, #eef2f5)` — fallback de color literal
- `var(--up1-color-X, lightgray)` — fallback con keyword de CSS

## Why

Los tokens `--up1-*` se redefinen en runtime entre `:root.light` y `:root.dark` para soportar theming. Un fallback hardcoded:
1. Enmascara la falta de la variable en light mode (parece funcionar)
2. **Rompe el theme dark** silenciosamente — el color claro queda visible en dark mode (texto sobre fondo claro = ilegible)
3. Genera deuda invisible: el dev no sabe que su CSS no soporta dark hasta que un usuario reporta el bug

Evidencia historica:
- T-009 Session 4 / L32: `var(--up1-bg-hover, #eef2f5)` rompio hover en dark mode del `CompositeSectionTreeElement`. El token `--up1-bg-hover` no existia en `theme-tokens.css`; el fallback `#eef2f5` (gris claro) fue ilegible en dark.
- BUG-mods-007 documenta el mismo patron en 3 mods: study-notes, curriculum-mapping, assessment-matrix.
- Bug recurrente cross-mod por **falta de gate** que valide que la variable existe.

## Where

- **Files**:
  - CSS de mods: `up1/mods/*/css/**/*.css`, bloques `<style>` en SFCs custom Vueform
  - Tokens: `up1/layout/css/theme-tokens.css` (fuente de verdad)
- **Layers**: ui-components / mods, layout (theme).

## When

- Siempre que se escriba CSS nuevo en un mod
- Cuando se modifique CSS existente y se agreguen nuevos `var(--up1-*)`
- Cuando aparezca un bug de hover/contraste en dark mode (probable causa: token inexistente con fallback hardcoded)

## Verification

- **Grep automatizable**:
  ```bash
  # Detectar fallbacks de color literal
  grep -rE "var\(--up1-[^,]+,\s*(#[0-9a-fA-F]{3,8}|rgb|rgba|hsl|hsla|[a-z]+)\s*\)" up1/mods/
  ```
  Cualquier match es candidato a violacion (excepcion: fallback a otra variable `var(--up1-*, var(--up1-*))`).

- **Manual en code review**:
  Para cada `var(--up1-*)` agregado: confirmar que la variable existe en `theme-tokens.css`. Si no, crearla ahi primero con valores para light + dark.

- **Test visual**: cargar la vista en dark mode + light mode antes de mergear. Si hay diferencia visual donde no deberia haberla → token con fallback no soportado.

## Source

- **Discovered in**: TICKET-009 Session 4 (curriculum-design hover bug en dark mode).
- **Evidence**:
  - `var(--up1-bg-hover, #eef2f5)` no soportaba dark — usuario reporto hover ilegible.
  - BUG-mods-007 lista 3 mods con mismo patron.
  - RULE-layout-023 / RULE-layout-024 (existentes) documentan el comportamiento correcto pero NO bloquean la violacion.
- **Related**:
  - BUG-mods-007 (CSS tokens sin fallback a `--up1-*` en multiples mods)
  - RULE-layout-023, RULE-layout-024 (theming correcto — esta rule las hace gate)
  - DET-5 (multi-capa: el bug no se detecta solo en frontend del light mode)
