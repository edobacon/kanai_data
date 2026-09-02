---
id: RULE-vue-flow-001
project: bayley
type: rule
module: vue-flow
level: should
tags:
  - vue-flow
  - minimap
  - color
  - hex
  - tailwind
---

# Vue Flow `<MiniMap>` requiere hex literales, no clases Tailwind

## What

El componente `<MiniMap>` de Vue Flow renderiza los nodos como rectangulos SVG. Su prop `:node-color` acepta una funcion `(node) => string` donde el string **DEBE ser un color valido de SVG** (hex, rgb, nombre CSS), **no una clase Tailwind**. Si no se pasa la prop, todos los nodos se renderizan con el color default (blanco/neutro), lo que los hace indistinguibles en minimaps con 50+ nodos.

Aplica tambien a cualquier otra prop de color de Vue Flow que se inyecte a SVG attrs directamente: `node-stroke-color`, `mask-color`, etc.

## Why

Vue Flow inyecta el color en el atributo `fill` del `<rect>` SVG. El SVG no interpreta clases CSS pasadas como atributo. Tailwind genera CSS classes — si pasas `bg-amber-500` al `fill`, el resultado es `fill="bg-amber-500"` que el browser ignora (cae al default).

Si el sistema de paletas del proyecto usa clases Tailwind para los nodos del grafo principal (p.ej. `bg-amber-500`, `text-amber-800`), es necesario mantener un **mapping paralelo** a hex para el MiniMap. De lo contrario, la paleta se pierde en el minimapa.

Descubierto en BLY-001 (BUG-6): el MiniMap de la vista Layouts mostraba 123 nodos en blanco indistinguibles. Se anadio una funcion `colorForLayoutNode(node)` en `src/utils/layoutStyle.ts` que devuelve hex literal y se invoca desde la prop del MiniMap.

## Where

- **Files**: cualquier vista que use `<MiniMap>` de Vue Flow:
  - `src/views/DataModelView.vue` (ya aplicado antes — mapeo inline)
  - `src/views/LayoutsView.vue` (aplicado en BLY-001 via `colorForLayoutNode`)
- **Utilidades de color**: cualquier funcion en `src/utils/*Style.ts` destinada a MiniMap o SVGs debe exponer variantes hex explicitas
- **Layers**: frontend (UI)

## When

Siempre que:

1. Una vista incluya `<MiniMap>` de Vue Flow
2. El proyecto tenga un sistema de paletas basado en clases Tailwind para los nodos principales

## Verification

### Revisar props del MiniMap

```bash
grep -rn "<MiniMap" src/views src/components
```

Por cada ocurrencia verificar:

- ¿Tiene `:node-color` prop?
- El prop retorna hex literal (ej `#0ea5e9`), no clases (ej `bg-sky-500`)?

### Convencion en utilidades de style

Por cada paleta basada en Tailwind (`bg-X-500` para nodos), mantener en el mismo archivo una funcion `colorFor{Kind}(node): string` que retorne el hex equivalente. Convencion: 500 shade como accent.

Ejemplo en `src/utils/layoutStyle.ts`:

```typescript
const MOD_ACCENT_HEX = [
  '#f59e0b', // amber-500
  '#f43f5e', // rose-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#d946ef', // fuchsia-500
  '#84cc16', // lime-500
];

export function colorForLayoutNode(node: LayoutNode): string {
  if (node.source.kind === 'core') return CORE_RB_HEX;
  return MOD_ACCENT_HEX[hashStr(node.source.modName) % MOD_ACCENT_HEX.length];
}
```

### Test visual

Abrir la vista con `<MiniMap>`. Los nodos deben renderizarse con diferentes colores segun su categoria (scope, source, mod). Si todos se ven del mismo color (blanco/gris) → falta la prop o la funcion retorna una clase.

## Source

- **Discovered in**: BLY-001, Session #2 (2026-04-17)
- **Evidence**: User reporto "en el minimap los nodos se ven blancos, todos iguales". Export JSON filtrado confirmo paleta correcta en nodos grandes pero MiniMap ignoraba clases. Diff con DataModelView mostro que alli si habia `:node-color` inline con hex. Fix: helper `colorForLayoutNode` y prop `:node-color` en LayoutsView.
- **Related**: BUG-6 en SPEC-layouts-grafo; L8 en ticket BLY-001
- **Dep**: Vue Flow 1.x (`@vue-flow/minimap`)
