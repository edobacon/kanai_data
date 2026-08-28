---
id: BUG-platform-010
project: up1
type: bug
module: platform
tags:
  - layout-library
  - atom
  - tooltip
  - dark-mode
  - design-tokens
  - a11y
---

# Atom `Tooltip` rompe contraste en modo dark de la app (white-on-white)

## Symptom

Al usar `<Tooltip variant="dark">` (default) dentro de la app en **modo dark**, el tooltip se renderiza con fondo blanco y texto blanco — completamente ilegible. En modo light el mismo Tooltip funciona correctamente. La variant `light` sufre el problema simetrico (oscuro-sobre-oscuro en modo dark).

## Expected behavior

El Tooltip debe tener contraste correcto en ambos modos light y dark de la app. Convencion habitual de tooltips: fondo dark + texto light en modo light de la app, y fondo light + texto dark en modo dark (o sea, *invertir* respecto al fondo principal del modo activo).

## Root cause

Los design tokens del atom no flipean junto al modo dark de la app. Definicion en `up1/layout/src/styles/design-tokens/components/atoms.css:539-542`:

```css
--up1-tooltip-dark-bg: var(--up1-text-primary);   /* OK en light, WHITE en dark */
--up1-tooltip-dark-color: white;                   /* SIEMPRE white */
--up1-tooltip-light-bg: white;                     /* SIEMPRE white */
--up1-tooltip-light-color: var(--up1-text-primary); /* OK en light, WHITE en dark */
```

- En modo light: `--up1-text-primary` = dark → `dark-bg` queda `dark`, `dark-color` queda `white`. Contraste OK.
- En modo dark: `--up1-text-primary` = white → `dark-bg` queda `white`, `dark-color` sigue `white`. **white-on-white**.

`--up1-tooltip-dark-color` y `--up1-tooltip-light-bg` son literales `white` en lugar de tokens semanticos como `--up1-text-inverse` que sí flipean correctamente.

## Impact

UX critico: cualquier consumidor del atom Tooltip en modo dark renderiza tooltips invisibles. A11y: WCAG 2.1 AA contrast falla. Detectado en uso real (TICKET-009 — composite-section-tree feedback de validacion sumativa).

Consumidores actuales (encontrados con grep): `molecules/ActionToolbar`, `molecules/ButtonGroup`, y todos los que se sumen.

## Workaround

CSS-puro theme-aware via tokens semanticos `--up1-text-primary` + `--up1-text-inverse` (mismo flip que ya aplica el `Badge` con clase `bg-secondary`). Patron usado en TICKET-009 / `CompositeSectionTreeElement.vue`:

```css
.my-tooltip-trigger::after {
  content: attr(data-tooltip);
  position: absolute;
  /* posicionamiento... */
  background: var(--up1-text-primary);   /* dark en light, light en dark */
  color: var(--up1-text-inverse);        /* light en light, dark en dark */
  /* ... */
  opacity: 0;
  visibility: hidden;
}
.my-tooltip-trigger:hover::after,
.my-tooltip-trigger:focus::after {
  opacity: 1;
  visibility: visible;
}
```

Triggered por `:hover` y `:focus` para mantener accesibilidad por teclado. `tabindex=0` + `aria-label` complementan al pseudo-elemento (que no es accesible a screen readers).

## Fix correcto (PR a plataforma)

Reescribir los 4 tokens en `atoms.css:539-542` usando `--up1-text-inverse` en los slots que estan literales `white`:

```css
--up1-tooltip-dark-bg: var(--up1-text-primary);
--up1-tooltip-dark-color: var(--up1-text-inverse);   /* antes: white */
--up1-tooltip-light-bg: var(--up1-bg-primary);        /* antes: white literal */
--up1-tooltip-light-color: var(--up1-text-primary);
```

Validar en ambos modos con stories de Storybook que cubran light + dark.

## Source

- [TICKET-009](../../tickets/ticket-009.md) Session 8 (2026-05-04)
- Codigo afectado: [`up1/layout/src/styles/design-tokens/components/atoms.css:539-542`](../../../../uplanner/up1/layout/src/styles/design-tokens/components/atoms.css)
- Workaround documentado en [`CompositeSectionTreeElement.vue`](../../../../uplanner/up1/mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue) (clases `cst-node__metric-wrap--invalid::after/::before`)
