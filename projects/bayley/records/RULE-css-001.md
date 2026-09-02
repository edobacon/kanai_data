---
id: RULE-css-001
project: bayley
type: rule
module: css
level: must
tags:
  - css
  - stacking-context
  - z-index
  - backdrop-filter
  - headless-ui
  - dropdown
  - tailwind
---

# Nunca poner `backdrop-filter` (Tailwind `backdrop-blur`, `backdrop-*`) en un contenedor que incluya overlays posicionados con z-index

## What

Cualquier elemento con `backdrop-filter` (incluye las utilidades Tailwind `backdrop-blur`, `backdrop-saturate`, `backdrop-brightness`, `backdrop-contrast`, etc) **crea un nuevo stacking context CSS**. Todo `z-index` dentro de ese elemento queda atrapado en el contexto local — no puede ganarle a elementos hermanos o posteriores en el DOM aunque los valores numericos lo sugieran.

**Sintoma tipico**: un dropdown/popover/modal se ve visualmente encima de otro elemento, pero los clicks atraviesan el overlay y caen al elemento "debajo". El usuario ve el menu pero sus MenuItems no responden.

## Why

CSS spec: ciertas propiedades (entre ellas `backdrop-filter`, `filter`, `transform`, `will-change`, `isolation`, `opacity < 1`, `clip-path`) crean un nuevo stacking context. Un `z-index: 30` dentro de ese contexto puede ser superado por un elemento externo aunque ese tenga `z-index: 1` — porque el `30` solo aplica dentro de su contexto local.

Descubierto en BLY-001: el toolbar de `LayoutsView.vue` tenia `bg-white/60 dark:bg-neutral-900/60 backdrop-blur`. El ExportButton (Headless UI `Menu`) rendereaba su `MenuItems` dentro de ese contexto, con `z-30`. El canvas de Vue Flow ocupaba la fila siguiente. Los clicks en MenuItem visualmente encima del canvas terminaban en el canvas, no en el handler del menu. El sintoma se veia como "el boton Export no funciona" pero era puramente CSS.

## Where

- **Files**:
  - Cualquier Vue component que use `<Menu>`, `<Popover>`, `<Dialog>` de `@headlessui/vue` o libs similares
  - Archivos `src/views/*.vue` y `src/components/**/*.vue`
- **Layers**: frontend (solo UI/CSS)
- **Herramientas afectadas**: Headless UI, Radix, shadcn — todo overlay que dependa de z-index global

## When

Siempre que un elemento:

1. Contenga o hospede un overlay absoluto/fijo (dropdown, tooltip, modal in-place)
2. Tenga aplicada alguna utilidad Tailwind `backdrop-*`, `filter`, `transform`, `opacity-XX` (< 100), `will-change`

Tambien aplica a otros creadores de stacking context menos obvios:

- `transform-gpu`, `translate-x-*`, `scale-*`, `rotate-*`
- `mix-blend-*`
- `isolation` explicito

## Verification

### Grep preventivo

Buscar combinaciones sospechosas en archivos que tengan overlays:

```bash
# Archivos con backdrop-blur o filter que tambien tengan Menu/Popover
grep -l "backdrop-blur\|backdrop-filter\|isolation-" src/views src/components
grep -l "Menu\|Popover\|Dialog" src/views src/components
# Interseccion → candidatos a revisar
```

### Regla de oro al escribir UI

Si un componente tiene un toolbar/header que va a contener botones con dropdowns:

- **Preferir** fondo solido (`bg-white dark:bg-neutral-900`) al glassmorphism
- **Si `backdrop-blur` es deseado**: elevar el overlay con `<Teleport to="body">` para sacarlo del stacking context local
- **Alternativa**: aumentar el z-index a valores muy altos (`z-[9999]`) — no resuelve realmente el problema si el contexto padre existe, solo en casos simples

### Test manual

Abrir el dropdown en todas las vistas/rutas que lo usan. Click en cada MenuItem. Verificar que el handler se ejecute (console.log temporal si hace falta). Si no se ejecuta → inspeccionar el DOM y verificar computed `backdrop-filter` en los ancestros del Menu.

## Source

- **Discovered in**: BLY-001, Session #2 (2026-04-17)
- **Evidence**: User reporto que `Exportar JSON` en `/layouts` no descargaba. Otras 3 vistas con mismo ExportButton si funcionaban. Diagnostico: console.log en el handler NO aparecian → handler no se invocaba. Comparacion lado-a-lado con DataModelView revelo la unica diferencia: `backdrop-blur` en el toolbar. Remover la utilidad solucio el problema en una linea.
- **Related**: BUG-4 en SPEC-layouts-grafo; L6 en ticket BLY-001
- **Referencia externa**: [MDN — Stacking context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index/Stacking_context)
