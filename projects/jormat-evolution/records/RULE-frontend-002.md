---
id: RULE-frontend-002
project: jormat-evolution
type: rule
module: frontend
level: should
tags:
  - frontend
  - testing
  - storybook
  - vitest
  - conventions
  - radix
  - next
---

# Convenciones de autoria de test + story por componente (stack vitest dual-project + storybook-nextjs-vite)

## What

Patrones concretos para escribir el `*.test.tsx` (jsdom) y la `*.stories.tsx` (storybook browser) de un componente React en `front/jormat-front/`, derivados de JOR-024. Complementan [[RULE-frontend-001]] (donde van los archivos); esta rule dice **como** escribirlos para este stack.

1. **Dual-project**: `vitest run` corre 2 proyectos — `jsdom` (los `.test.tsx`) y `storybook` (las `.stories.tsx` en chromium/Playwright via addon-vitest). El test cubre logica/variantes/roles; la story es la base de test visual + a11y (`@storybook/addon-a11y`, `test: 'todo'`).
2. **Radix en portal (dropdown-menu, sheet, tooltip, dialog)**:
   - En el **test jsdom**: usar `defaultOpen` para montar el contenido del portal sin depender de pointer events. El rol semantico (`menu`/`dialog`/`tooltip`) lo provee radix; OJO: en tooltip el `role="tooltip"` lo lleva un span sr-only (sin clases) — verificar el contenido visible estilizado por su clase (`.bg-popover`), no por el rol.
   - En la **story**: el `play()` DEBE abrir el overlay (click/hover en el trigger) para que el addon-a11y escanee el contenido montado; el contenido va a un portal (document.body) → consultarlo con `screen`, no con `within(canvasElement)`.
3. **Stories de componentes que usan hooks de App Router** (`usePathname`/`useRouter` de `next/navigation`): setear `parameters: { nextjs: { appDirectory: true, navigation: { pathname: '...' } } }`. Sin `appDirectory: true` fallan con "expected app router to be mounted" (useRouter) o pathname `null` (usePathname). Los tests jsdom en cambio mockean `next/navigation` con `vi.mock`.
4. **Story de componente con prop requerida** (ej. `children`): aunque uses `render`, TS exige `args` que satisfaga el tipo → setear `args: { children: null }` (o el valor) en el `meta`.
5. **Cache de storybook flaky**: el proyecto storybook puede fallar intermitente con "Failed to fetch dynamically imported module .../@storybook_addon-docs" (cache stale de optimizeDeps), sobre todo al agregar stories o correr un subset. Fix: `rm -rf node_modules/.cache/storybook node_modules/.vite` antes del `vitest run` completo. Por-task conviene validar el `.test.tsx` (jsdom filtrado, estable y rapido) y dejar las stories para el full run con cache limpia.

## Why

Estos patrones son no-obvios y costaron iteraciones en JOR-024 (cada uno fue un fallo real antes de resolverse). Documentarlos evita que cada ticket de frontend los re-descubra. La separacion test(jsdom)/story(browser) reparte el trabajo: el test es deterministico y barato; la story valida render real + a11y.

## Where

- **Files**: `front/jormat-front/src/components/ui/*.{test,stories}.tsx` y `front/jormat-front/src/shell/**/*.{test,stories}.tsx`.
- **Layers**: frontend.
- **Config**: `vitest.config.ts` (2 proyectos), `.storybook/` (addon-vitest + addon-a11y), `src/test/setup.ts`.

## When

Al escribir o mover el test/story de cualquier componente. Especialmente al cubrir primitivas radix (portales) o composites que consumen `next/navigation`.

## Verification

- Test de primitiva radix usa `defaultOpen` y la story abre el overlay en `play()`.
- Story que usa `usePathname`/`useRouter` declara `nextjs.appDirectory: true`.
- `vitest run` completo verde tras limpiar cache si aparece el error de modulo dinamico.

## Source

- **Discovered in**: JOR-024 (refactor de migracion a RULE-frontend-001) — learns L1-L5.
- **Evidence**: L1 (cache storybook flaky), L2 (`appDirectory` para stories con App Router hooks), L3 (imports relativos suben un nivel al mover a sub-carpeta — `./icon-registry`→`../icon-registry`, `./NavItem`→`../NavItem`), L4 (`args` para prop requerida en story con `render`), L5 (extraer composite desde page.tsx es transparente al build/tests; reapuntar import default→named).
- **Related**: [[RULE-frontend-001]] (estructura de archivos); `jormat_docs/ongoing/component-architecture.md`.
