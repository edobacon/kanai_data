---
id: RULE-layout-026
project: up1
type: rule
module: layout
tags:
  - atoms
  - icons
  - bootstrap-icons
  - design-system
---

# Atomos `Button` e `IconButton`: `icon` recibe la clase CSS completa

## What

Atomos `Button` e `IconButton` del design system up1 ([layout/src/components/atoms/](../../../up1/layout/src/components/atoms/)) usan la prop `icon` como **clase CSS completa** del icono — `<i :class="icon">`. Para iconos de Bootstrap Icons hay que pasar `"bi bi-pencil"` (NO solo `"pencil"` ni `"bi-pencil"` solo sin el `bi` base).

```vue
<Button icon="bi bi-pencil" ...>
<IconButton icon="bi bi-plus-lg" ...>
```

El sub-componente atomo `Icon` SI tolera el nombre solo con prefix `bi-` (`name="bi-pencil"`) porque internamente normaliza con `props.name.startsWith('bi-') ? "bi ${props.name}" : props.name`, pero `Button.icon` y `IconButton.icon` NO normalizan.

## Why

Convencion explicita del atom — el dev tiene control total sobre la clase aplicada al `<i>`. Permite usar packs de iconos no-Bootstrap pasando otras clases.

## Where

Cualquier consumidor de `Button` o `IconButton` del design system up1.

## When

Al usar Button/IconButton con icono. Para Icon atom, ver [RULE-layout-029](rule-layout-029.md).

## Source

- [TICKET-009](../../tickets/ticket-009.md) L41 — Session 6 (2026-04-30)
