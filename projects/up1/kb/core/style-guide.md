---
id: SPEC-core-004
project: up1
type: spec
module: core
category: core
tags: [up1, estilo, design-tokens, css, colores, tipografia, espaciado, bordes, sombras, atoms, componentes, capas, dark-mode, temas, mods]
fecha: 2026-04-10
sources:
  - layout/src/styles/design-tokens/ (colors, typography, spacing, borders, shadows, transitions, z-index)
  - layout/src/components/atoms/ (20 atoms con index.ts)
  - layout/src/styles/design-tokens/components/atoms.css
  - suite/css/up1.css (orquestador de capas)
  - suite/css/1-theme/theme-tokens.css (light-dark dual mode)
  - suite/css/1-theme/default.css, dark.css
  - mods/hello-world-mod/css/ (ejemplo de CSS de mod)
  - layout/src/styles/vueform-uplanner.css (integracion Vueform)
  - up1/CLAUDE.md
---
# Guia de estilo de uP1

## Indice

1. [Principios de diseno](#1-principios-de-diseno)
2. [Arquitectura CSS](#2-arquitectura-css)
3. [Design tokens](#3-design-tokens)
4. [Colores](#4-colores)
5. [Tipografia](#5-tipografia)
6. [Espaciado](#6-espaciado)
7. [Bordes y radios](#7-bordes-y-radios)
8. [Sombras y elevacion](#8-sombras-y-elevacion)
9. [Transiciones y animaciones](#9-transiciones-y-animaciones)
10. [Z-index](#10-z-index)
11. [Atoms: componentes base](#11-atoms-componentes-base)
12. [Atomic Design: reglas de composicion](#12-atomic-design-reglas-de-composicion)
13. [Dark mode](#13-dark-mode)
14. [CSS en mods: como extender sin romper](#14-css-en-mods-como-extender-sin-romper)
15. [Integracion con Vueform](#15-integracion-con-vueform)
16. [Do's y Don'ts](#16-dos-y-donts)

---

## 1. Principios de diseno

### Tokens, no valores

Todo valor visual se define como **variable CSS** (`--up1-*`). Nunca hardcodear colores, tamanos, espaciados o sombras.

```css
/* MAL */
color: #212529;
padding: 16px;
border-radius: 8px;

/* BIEN */
color: var(--up1-text-primary);
padding: var(--up1-spacing-md);
border-radius: var(--up1-border-radius-md);
```

### Atoms sobre Bootstrap

Bootstrap esta presente en la plataforma pero **nunca se usa directamente** en moleculas ni organismos. Los atoms encapsulan Bootstrap:

```vue
<!-- MAL -->
<button class="btn btn-primary">Guardar</button>
<h2 class="h2">Titulo</h2>

<!-- BIEN -->
<Button variant="primary">Guardar</Button>
<Heading :level="2">Titulo</Heading>
```

### Capas sobre especificidad

El sistema usa `@layer` CSS para control de cascada, no `!important` ni selectores ultra-especificos.

### Consistencia sobre originalidad

Un mod debe verse como parte de uP1, no como una app separada. Usar los tokens de la plataforma como base y extender solo lo necesario.

---

## 2. Arquitectura CSS

### Capas de estilos

uP1 define dos sistemas de capas:

**Capas base** (cargadas por Nuxt):

```
design-tokens → theme-tokens → Bootstrap → layout → Vueform
```

**Capas semanticas** (definidas en `suite/css/up1.css`):

```css
@layer theme, objectName, viewType, objectId, contextId;
```

Capas posteriores sobreescriben las anteriores:

| Capa | Proposito | Ejemplo |
|------|-----------|---------|
| `theme` | Tokens del mod, estilos base | `css/1-theme/mi-mod.css` |
| `objectName` | Estilos por objeto | `css/2-objectName/mi-objeto.css` |
| `viewType` | Estilos por tipo de vista | `css/3-viewType/recordlist.css` |
| `objectId` | Estilos por registro | `css/4-objectId/` |
| `contextId` | Estilos por contexto | `css/5-contextId/` |

### Orden de carga en Suite

```
1. layout/src/styles/design-tokens/*.css     ← Tokens base (colores, tipografia, spacing...)
2. suite/css/1-theme/theme-tokens.css        ← Tokens unificados light-dark()
3. suite/css/up1.css                          ← Declara @layer + importa capas
4. layout/src/styles/vueform-uplanner.css    ← Mapeo Vueform → UP1 tokens
5. Bootstrap 5                                ← Framework CSS
6. suite/css/mods/*.css                       ← CSS de mods (synced)
```

### Ubicacion de archivos de tokens

```
layout/src/styles/design-tokens/
├── colors.css          ← Paleta + tokens semanticos (284 lineas)
├── typography.css       ← Familias, tamanos, pesos, line-heights
├── spacing.css          ← Escala de espaciado + aliases
├── borders.css          ← Colores de borde, anchos, border-radius
├── shadows.css          ← Sombras de elevacion + foco
├── transitions.css      ← Duraciones, easing, aliases
├── z-index.css          ← Jerarquia de capas z
└── components/
    └── atoms.css        ← Tokens especificos de cada atom (577 lineas)
```

---

## 3. Design tokens

### Convencion de nombres

Todos los tokens usan el prefijo `--up1-`:

```
--up1-{categoria}-{variante}
```

| Categoria | Ejemplo | Descripcion |
|-----------|---------|-------------|
| `color-primary-*` | `--up1-color-primary-500` | Paleta primaria |
| `color-success-*` | `--up1-color-success-500` | Estado exito |
| `gray-*` | `--up1-gray-700` | Escala de grises |
| `text-*` | `--up1-text-primary` | Colores de texto |
| `bg-*` | `--up1-bg-primary` | Colores de fondo |
| `border-*` | `--up1-border-color` | Bordes |
| `font-*` | `--up1-font-size-base` | Tipografia |
| `spacing-*` | `--up1-spacing-md` | Espaciado |
| `shadow-*` | `--up1-shadow-md` | Sombras |
| `z-*` | `--up1-z-modal` | Z-index |

### Tokens para mods

Los mods definen sus propios tokens con prefijo `--{modname}-`:

```css
:root {
  --hw-color-risk-low: #22c55e;
  --hw-card-bg: var(--up1-bg-primary, #ffffff);   /* Delega a UP1 con fallback */
}
```

**Regla**: siempre delegar a `--up1-*` con fallback para tokens de componente del mod.

---

## 4. Colores

### Paleta primaria (Teal)

Color de marca principal. Consistente en light y dark mode.

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--up1-color-primary-50` | `#E7F2F3` | `rgba(45,212,191,0.1)` | Fondos sutiles |
| `--up1-color-primary-100` | `#B6D9DC` | `rgba(45,212,191,0.15)` | Fondos hover |
| `--up1-color-primary-300` | `#47AEB8` | `#5eead4` | Acentos |
| `--up1-color-primary-500` | **`#0a808c`** | **`#2dd4bf`** | **Color base de marca** |
| `--up1-color-primary-600` | `#12717b` | `#14b8a6` | Hover |
| `--up1-color-primary-700` | `#16626b` | `#0d9488` | Active / bordes fuertes |
| `--up1-color-primary-900` | `#17464c` | `#115e59` | Texto alto contraste |

**Alias semanticos:**

```css
--up1-color-primary: var(--up1-color-primary-500);         /* Base */
--up1-color-primary-hover: var(--up1-color-primary-600);   /* Hover */
--up1-color-primary-active: var(--up1-color-primary-700);  /* Active */
--up1-color-primary-light: var(--up1-color-primary-50);    /* Fondo sutil */
```

### Escala de grises

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--up1-gray-0` | `#ffffff` | `#1a1a1a` | Fondo blanco/negro |
| `--up1-gray-50` | `#f0f0f0` | `#212121` | Fondo app |
| `--up1-gray-100` | `#e1e1e1` | `#2c2c2c` | Fondo secundario |
| `--up1-gray-200` | `#d3d3d3` | `#3a3a3a` | Bordes default |
| `--up1-gray-500` | `#a9a9a9` | `#a3a3a3` | Texto muted |
| `--up1-gray-700` | `#495057` | `#e5e5e5` | Texto secundario |
| `--up1-gray-900` | `#212529` | `#fafafa` | Texto primario |

### Colores de estado

| Estado | Token base | Light | Dark |
|--------|-----------|-------|------|
| Success | `--up1-color-success-500` | `#22946e` | `#22c55e` |
| Danger | `--up1-color-danger-500` | `#9c2121` | `#ef4444` |
| Warning | `--up1-color-warning-500` | `#f59e0b` | `#f59e0b` |
| Info | `--up1-color-info-500` | `#21498a` | `#38bdf8` |

Cada estado tiene variantes: `-50` (fondo sutil), `-100` (fondo), `-500` (base), `-600` (hover), `-700` (active).

### Colores secundarios

| Paleta | Token | Uso tipico |
|--------|-------|------------|
| Purple | `--up1-color-purple-500: #7c3aed` | Acentos, tags |
| Rose | `--up1-color-rose-500: #e11d48` | Alertas criticas |

### Tokens semanticos de texto

| Token | Uso |
|-------|-----|
| `--up1-text-primary` | Texto principal (gray-900) |
| `--up1-text-secondary` | Descripciones (gray-600) |
| `--up1-text-muted` | Texto desenfatizado (gray-500) |
| `--up1-text-disabled` | Texto deshabilitado (gray-300) |
| `--up1-text-inverse` | Texto sobre fondo oscuro (gray-0) |
| `--up1-text-link` | Links (primary) |
| `--up1-text-link-hover` | Links hover (primary-hover) |

### Tokens semanticos de fondo

| Token | Uso |
|-------|-----|
| `--up1-bg-body` | Fondo de la app (gray-50) |
| `--up1-bg-primary` | Cards, contenedores (gray-0 = blanco) |
| `--up1-bg-secondary` | Sidebars, paneles (gray-100) |
| `--up1-bg-tertiary` | Inputs, hovers (gray-200) |
| `--up1-bg-overlay` | Backdrop de modales |

---

## 5. Tipografia

### Familias

```css
--up1-font-family-base: 'Inter', system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
--up1-font-family-mono: 'SFMono-Regular', Menlo, Monaco, Consolas, monospace;
```

**Inter** es la fuente principal de toda la plataforma.

### Escala de tamanos

| Token | Tamano | Uso tipico |
|-------|--------|------------|
| `--up1-font-size-xs` | 12px (0.75rem) | Captions, helpers |
| `--up1-font-size-sm` | 14px (0.875rem) | Texto secundario, tablas |
| `--up1-font-size-base` | 16px (1rem) | Texto principal |
| `--up1-font-size-lg` | 18px (1.125rem) | Subtitulos |
| `--up1-font-size-xl` | 20px (1.25rem) | Titulos de seccion |
| `--up1-font-size-2xl` | 24px (1.5rem) | Titulos de pagina |
| `--up1-font-size-3xl` | 30px (1.875rem) | Titulos grandes |
| `--up1-font-size-4xl` | 36px (2.25rem) | Titulos hero |

### Pesos

| Token | Valor | Uso tipico |
|-------|-------|------------|
| `--up1-font-weight-light` | 300 | Texto decorativo |
| `--up1-font-weight-normal` | 400 | Texto base |
| `--up1-font-weight-medium` | 500 | Enfasis suave |
| `--up1-font-weight-semibold` | 600 | Labels, tabs, columnas |
| `--up1-font-weight-bold` | 700 | Titulos, acciones |
| `--up1-font-weight-extrabold` | 800 | Titulos hero |

### Line heights

| Token | Valor | Uso |
|-------|-------|-----|
| `--up1-line-height-tight` | 1.25 | Titulos |
| `--up1-line-height-snug` | 1.375 | Subtitulos |
| `--up1-line-height-normal` | 1.5 | Texto base |
| `--up1-line-height-relaxed` | 1.625 | Texto largo |

---

## 6. Espaciado

### Escala base

| Token | Valor | px |
|-------|-------|----|
| `--up1-spacing-0` | 0 | 0 |
| `--up1-spacing-px` | 1px | 1 |
| `--up1-spacing-0-5` | 0.125rem | 2 |
| `--up1-spacing-1` | 0.25rem | 4 |
| `--up1-spacing-1-5` | 0.375rem | 6 |
| `--up1-spacing-2` | 0.5rem | 8 |
| `--up1-spacing-3` | 0.75rem | 12 |
| `--up1-spacing-4` | 1rem | 16 |
| `--up1-spacing-5` | 1.25rem | 20 |
| `--up1-spacing-6` | 1.5rem | 24 |
| `--up1-spacing-8` | 2rem | 32 |
| `--up1-spacing-10` | 2.5rem | 40 |
| `--up1-spacing-12` | 3rem | 48 |
| `--up1-spacing-16` | 4rem | 64 |
| `--up1-spacing-24` | 6rem | 96 |

### Aliases semanticos

| Alias | Valor | Uso tipico |
|-------|-------|------------|
| `--up1-spacing-xs` | 4px | Padding minimo entre elementos |
| `--up1-spacing-sm` | 8px | Padding de inputs, gap entre items |
| `--up1-spacing-md` | 16px | Padding de cards, secciones |
| `--up1-spacing-lg` | 24px | Margin entre secciones |
| `--up1-spacing-xl` | 32px | Margin entre bloques principales |

---

## 7. Bordes y radios

### Colores de borde

| Token | Uso |
|-------|-----|
| `--up1-border-color` | Borde default (gray-200) |
| `--up1-border-color-hover` | Borde en hover (gray-300) |
| `--up1-border-color-focus` | Borde en foco (primary) |
| `--up1-border-light` | Borde sutil (gray-100) |
| `--up1-border-color-dark` | Borde fuerte (gray-700) |

Bordes sutiles para alertas:

```css
--up1-border-success-subtle: rgba(34, 148, 110, 0.2);
--up1-border-danger-subtle: rgba(156, 33, 33, 0.2);
--up1-border-warning-subtle: rgba(245, 158, 11, 0.2);
--up1-border-info-subtle: rgba(33, 73, 138, 0.2);
```

### Anchos de borde

| Token | Valor |
|-------|-------|
| `--up1-border-width-0` | 0 |
| `--up1-border-width-1` | 1px |
| `--up1-border-width-2` | 2px |
| `--up1-border-width-4` | 4px |
| `--up1-border-width` | 1px (default) |

### Border radius

| Token | Valor | Uso |
|-------|-------|-----|
| `--up1-border-radius-none` | 0 | Sin radio |
| `--up1-border-radius-sm` | 4px | Badges, tags |
| `--up1-border-radius` | 6px | Default (inputs, botones) |
| `--up1-border-radius-md` | 8px | Cards, modales |
| `--up1-border-radius-lg` | 12px | Cards grandes |
| `--up1-border-radius-xl` | 16px | Contenedores hero |
| `--up1-border-radius-2xl` | 24px | Elementos decorativos |
| `--up1-border-radius-full` | 9999px | Circulos, pills |

---

## 8. Sombras y elevacion

### Escala de elevacion

| Token | Valor | Uso |
|-------|-------|-----|
| `--up1-shadow-none` | none | Sin sombra |
| `--up1-shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Elevacion minima |
| `--up1-shadow` | `0 1px 3px rgba(0,0,0,0.1)` | Elevacion base |
| `--up1-shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, paneles |
| `--up1-shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Dropdowns, popovers |
| `--up1-shadow-xl` | `0 20px 25px rgba(0,0,0,0.1)` | Modales |
| `--up1-shadow-2xl` | `0 25px 50px rgba(0,0,0,0.25)` | Maxima elevacion |

### Sombras especificas

| Token | Uso |
|-------|-----|
| `--up1-shadow-card-hover` | Card en hover |
| `--up1-shadow-dropdown` | Menus dropdown |
| `--up1-shadow-popover` | Popovers y tooltips |
| `--up1-shadow-modal` | Modales |
| `--up1-shadow-sidebar` | Sidebar lateral |
| `--up1-shadow-focus` | Anillo de foco (teal 25%) |

---

## 9. Transiciones y animaciones

### Duraciones

| Token | Valor | Uso |
|-------|-------|-----|
| `--up1-duration-75` | 75ms | Micro-interacciones |
| `--up1-duration-150` | 150ms | Hovers rapidos |
| `--up1-duration-200` | 200ms | Transiciones normales |
| `--up1-duration-300` | 300ms | Transiciones medias |
| `--up1-duration-500` | 500ms | Transiciones lentas |

### Easing

| Token | Valor | Uso |
|-------|-------|-----|
| `--up1-ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default para la mayoria |
| `--up1-ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Elementos que aparecen |
| `--up1-ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Elementos que desaparecen |
| `--up1-ease-bounce` | `cubic-bezier(0.16, 1, 0.3, 1)` | Feedback interactivo |

### Aliases

```css
--up1-transition-fast: 0.15s ease-in-out;    /* Hovers, toggles */
--up1-transition-base: 0.3s ease-in-out;     /* Default */
--up1-transition-slow: 0.5s ease-in-out;     /* Modales, paneles */
```

---

## 10. Z-index

| Token | Valor | Uso |
|-------|-------|-----|
| `--up1-z-base` | 0 | Contenido normal |
| `--up1-z-dropdown` | 10 | Menus dropdown |
| `--up1-z-sticky` | 20 | Headers sticky |
| `--up1-z-fixed` | 30 | Elementos fijos |
| `--up1-z-sidebar` | 40 | Sidebar |
| `--up1-z-header` | 40 | Header principal |
| `--up1-z-modal-backdrop` | 100 | Fondo de modal |
| `--up1-z-modal` | 101 | Modal |
| `--up1-z-popover` | 102 | Popover |
| `--up1-z-tooltip` | 103 | Tooltip |
| `--up1-z-notification` | 104 | Notificaciones |
| `--up1-z-tour` | 105 | Tour/onboarding |

---

## 11. Atoms: componentes base

### Inventario (20 atoms)

| Atom | Proposito | Props clave |
|------|-----------|-------------|
| `Button` | Botones de accion | variant, size, loading, disabled |
| `IconButton` | Boton con solo icono | icon, variant, size, tooltip |
| `Input` | Campo de texto | type, placeholder, disabled, error |
| `Textarea` | Area de texto | rows, maxLength, resize |
| `Select` | Dropdown de seleccion | options, placeholder, multiple |
| `Checkbox` | Casilla de verificacion | modelValue, label, disabled |
| `Radio` | Boton de radio | options, modelValue, name |
| `Heading` | Titulos h1-h6 | level, size, weight |
| `Text` | Texto con semantica | as (p/span/div), variant, size |
| `Label` | Etiqueta de campo | for, required |
| `Link` | Enlace | href, external, variant |
| `Badge` | Etiqueta de estado | variant (success/danger/warning/info), size |
| `Alert` | Mensaje de alerta | variant, message, dismissible |
| `Icon` | Iconos Bootstrap | name, size, color |
| `Avatar` | Foto/iniciales de usuario | src, name, size |
| `Image` | Imagen responsive | src, alt, fallback |
| `Spinner` | Indicador de carga | size, variant, centered |
| `Progress` | Barra de progreso | value, max, variant |
| `Divider` | Separador visual | orientation, margin |
| `Tooltip` | Tooltip informativo | content, placement |

### Como importar en modsComponents

```typescript
// Desde modsComponents/{Component}/:
import { Button, Heading, Text, Spinner, Badge, Alert } from '../../components/atoms'
```

En `defineElement()` (Options API), registrar en `components`:

```javascript
export default defineElement({
  name: 'MiWidgetElement',
  components: { Button, Heading, Spinner },
  // ...
})
```

En `<script setup>` (standalone), auto-registrados:

```vue
<script setup>
import { Button, Badge } from '../../components/atoms'
</script>
```

---

## 12. Atomic Design: reglas de composicion

### Jerarquia

```
Atoms      → Elementos indivisibles (Button, Input, Badge, Icon)
Molecules  → Combinan atoms (SearchBar, TableCell, Modal, Card)
Organisms  → Combinan molecules (Table, CardGrid, ModalStackManager)
```

### Regla critica

**Bootstrap nunca se usa directamente en molecules ni organisms.** Solo los atoms lo encapsulan.

```vue
<!-- MAL: Bootstrap directo en molecule -->
<div class="card">
  <div class="card-body">
    <h5 class="card-title">{{ title }}</h5>
    <button class="btn btn-primary">Accion</button>
  </div>
</div>

<!-- BIEN: Atoms en molecule -->
<div :style="{ background: 'var(--up1-bg-primary)', borderRadius: 'var(--up1-border-radius-md)' }">
  <Heading :level="5">{{ title }}</Heading>
  <Button variant="primary">Accion</Button>
</div>
```

### En componentes de mods

Los modsComponents pueden usar:
- Atoms directos (importar de `../../components/atoms`)
- Tokens CSS (`var(--up1-*)`)
- Clases CSS scoped propias

No deben usar:
- Clases Bootstrap directas (`btn`, `card`, `modal`)
- Valores hardcodeados de color, tamano, spacing
- `!important`

---

## 13. Dark mode

### Como funciona

uP1 usa la funcion CSS nativa `light-dark()` para definir valores duales en un solo archivo:

```css
:root {
  color-scheme: light dark;
  --up1-gray-900: light-dark(#212529, #fafafa);
  --up1-bg-primary: light-dark(#ffffff, #1a1a1a);
}
```

### Activacion

- **Preferencia del sistema**: `prefers-color-scheme: dark`
- **Toggle manual**: guardado en `localStorage('up1-theme')`
- **Clase CSS**: `.theme-dark` en `<html>` + `color-scheme: dark`

### Valores que `light-dark()` no maneja (Category B)

Algunos valores no son compatibles con `light-dark()`: filtros, gradientes, SVGs inline, porcentajes. Estos van en `suite/css/1-theme/dark.css` como overrides:

```css
@layer theme {
  :root[data-theme="dark"],
  .theme-dark {
    --up1-some-filter: invert(1);
    --up1-some-gradient: linear-gradient(to bottom, #1a1a1a, #2a2a2a);
  }
}
```

### Implicacion para mods

Si tu mod define colores custom, proveer valores para ambos modos:

```css
:root {
  --mimod-accent: light-dark(#3B82F6, #60A5FA);
  --mimod-card-bg: var(--up1-bg-primary);  /* Automatico: hereda light/dark */
}
```

Delegar a tokens `--up1-*` es la forma mas simple — ya soportan dark mode automaticamente.

---

## 14. CSS en mods: como extender sin romper

### Estructura de carpetas

```
mods/{mod}/css/
├── 1-theme/{mod-name}.css      ← Tokens del mod
├── 2-objectName/{object}.css   ← Estilos por objeto
├── 3-viewType/                 ← Estilos por tipo de vista
├── 4-objectId/                 ← Estilos por registro
└── 5-contextId/                ← Estilos por contexto
```

Se sincronizan a `suite/css/mods/` via `npm run sync`.

### Paso 1: Definir tokens del mod en 1-theme/

```css
/* css/1-theme/mi-mod.css */
:root {
  /* Tokens de dominio (colores propios) */
  --mimod-color-risk-low: #22c55e;
  --mimod-color-risk-high: #ef4444;

  /* Tokens de componente (delegan a UP1) */
  --mimod-card-bg: var(--up1-bg-primary, #ffffff);
  --mimod-card-text: var(--up1-text-primary, #212529);
  --mimod-card-border: var(--up1-border-color, #dee2e6);
  --mimod-card-radius: var(--up1-border-radius-md, 8px);
}
```

**Regla**: tokens de dominio pueden ser valores directos. Tokens de componente siempre delegan a `--up1-*` con fallback.

### Paso 2: Estilos por objeto en 2-objectName/

```css
/* css/2-objectName/mi-objeto.css */
.risk-badge--low {
  background-color: var(--mimod-color-risk-low);
  color: var(--up1-text-inverse);
  padding: var(--up1-spacing-0-5) var(--up1-spacing-2);
  border-radius: var(--up1-border-radius-sm);
  font-size: var(--up1-font-size-sm);
  font-weight: var(--up1-font-weight-semibold);
}

.risk-badge--high {
  background-color: var(--mimod-color-risk-high);
  color: var(--up1-text-inverse);
  padding: var(--up1-spacing-0-5) var(--up1-spacing-2);
  border-radius: var(--up1-border-radius-sm);
  font-size: var(--up1-font-size-sm);
  font-weight: var(--up1-font-weight-semibold);
}
```

### Ejemplo real: hello-world-mod

**1-theme/hello-world.css:**

```css
:root {
  --hw-color-risk-low: #22c55e;
  --hw-color-risk-medium: #f59e0b;
  --hw-color-risk-high: #ef4444;
  --hw-color-risk-critical: #7c3aed;
  --hw-card-bg: var(--up1-bg-primary, #ffffff);
  --hw-card-text: var(--up1-text-primary, #212529);
  --hw-card-border: var(--up1-border-color, #dee2e6);
}
```

**2-objectName/hw-assessment.css:**

```css
.risk-badge--low { background-color: var(--hw-color-risk-low); color: white; ... }
.risk-badge--critical { background-color: var(--hw-color-risk-critical); color: white; ... }
```

---

## 15. Integracion con Vueform

Los formularios de RecordDetail usan Vueform. El archivo `layout/src/styles/vueform-uplanner.css` mapea tokens de Vueform (`--vf-*`) a tokens de uP1 (`--up1-*`):

```css
/* Extracto conceptual */
:root {
  --vf-primary: var(--up1-color-primary);
  --vf-bg-input: var(--up1-input-bg);
  --vf-border-color-input: var(--up1-input-border-color);
  --vf-ring-color: var(--up1-focus-ring-color);
  --vf-font-size: var(--up1-font-size-base);
  --vf-radius-input: var(--up1-border-radius);
}
```

Esto garantiza que los formularios se vean consistentes con el resto de la plataforma sin configuracion adicional.

---

## 16. Do's y Don'ts

### Colores

| DO | DON'T |
|----|-------|
| Usar `var(--up1-color-primary)` | Hardcodear `#0a808c` |
| Usar `var(--up1-text-primary)` para texto | Usar `color: black` o `color: #333` |
| Usar status tokens (`success`, `danger`, `warning`, `info`) | Inventar colores de estado propios |
| Definir tokens de mod con `--{modname}-*` | Usar el prefijo `--up1-*` para tokens del mod |
| Delegar a `--up1-*` con fallback: `var(--up1-bg-primary, #fff)` | Definir tokens de componente sin fallback |
| Soportar dark mode delegando a tokens UP1 | Asumir que solo hay light mode |

### Tipografia

| DO | DON'T |
|----|-------|
| Usar `var(--up1-font-size-*)` | Usar `font-size: 14px` directamente |
| Usar `var(--up1-font-weight-semibold)` | Usar `font-weight: 600` directamente |
| Usar `Inter` via token | Importar otra fuente sin autorizacion |
| Usar `<Heading>` y `<Text>` atoms | Usar `<h1>` directo con clases |

### Espaciado

| DO | DON'T |
|----|-------|
| Usar `var(--up1-spacing-md)` (16px) | Usar `padding: 16px` directo |
| Usar aliases semanticos (`xs`, `sm`, `md`, `lg`, `xl`) | Inventar valores arbitrarios |
| Mantener consistencia con la escala de 4px | Usar valores que no estan en la escala |

### Componentes

| DO | DON'T |
|----|-------|
| Importar atoms: `Button`, `Badge`, `Spinner` | Usar clases Bootstrap: `btn`, `badge` |
| Usar `<Heading :level="2">` | Usar `<h2 class="h2">` |
| CSS scoped en componentes Vue | CSS global que afecta otros mods |
| Usar `var(--up1-shadow-md)` para elevacion | Usar `box-shadow: 0 4px 6px rgba(...)` |
| Usar `var(--up1-border-radius-md)` | Usar `border-radius: 8px` |

### CSS en mods

| DO | DON'T |
|----|-------|
| Poner tokens en `1-theme/`, estilos de objeto en `2-objectName/` | Mezclar todo en un solo archivo |
| Usar selectores especificos al mod (`.risk-badge--low`) | Usar selectores globales (`.badge`, `.card`) |
| Delegar a tokens `--up1-*` para fondos, texto, bordes | Definir colores propios para elementos genericos |
| Proveer valores `light-dark()` para colores custom del mod | Definir solo light mode en tokens custom |
| Editar en `mods/{mod}/css/` y syncronizar | Editar en `suite/css/mods/` (se sobreescribe) |

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-04-10 | Documento inicial: guia de estilo basada en design tokens, atoms, y CSS del codebase real de uP1 |
