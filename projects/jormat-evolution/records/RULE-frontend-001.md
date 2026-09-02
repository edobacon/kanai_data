---
id: RULE-frontend-001
project: jormat-evolution
type: rule
module: frontend
level: should
tags:
  - frontend
  - components
  - structure
  - storybook
  - testing
  - convention
---

# Organizacion de archivos de componentes frontend: carpeta-por-componente (todo en components/), con story + test por componente

## What

Convencion de co-locacion de archivos para componentes React en `front/jormat-front/src/`. **Una sola regla, sin hibrido** (revisado JOR-025):

- **Ubicacion raiz (separacion app/components)**: TODO componente React vive bajo `src/components/`, organizado por dominio: `components/ui/` (primitivas), `components/<dominio>/` (composites — ej. `components/shell/`, `components/auth/`). `src/app/` contiene **solo rutas** (page.tsx, layout.tsx, route handlers, not-found.tsx) + el wiring de providers (`providers.tsx`, `theme-provider.tsx`). **NO** crear directorios de componentes hermanos de `components/` (ej. el viejo `src/shell/`) ni `src/stories/` (scaffold de `storybook init` — borrarlo). Excepcion: infra de auth no-UI (`src/auth/MsalProviderWrapper`, `msalConfig`) que `services/`/`stores/` consumen — es base entregada (RULE-global-003), no se mueve.
- **CARPETA por componente (primitivas Y composites)**: cada componente vive en su carpeta `Component/{Component.tsx, Component.test.tsx, Component.stories.tsx, index.ts}`. El `index.ts` es el barrel (`export * from './Component'`) — los imports `@/components/ui/button` o `@/components/<dominio>/Comp` resuelven a la carpeta sin cambiar. Aplica IGUAL a primitivas (`components/ui/button/`) y composites (`components/shell/Sidebar/`). Sub-componentes propios de un composite van en una sub-carpeta dentro del padre (ej. `Sidebar/NavItem/`).
- **Story + test por componente**: cada componente lleva **story** (documentacion viva + base de test visual con addon-vitest/a11y) **y test unitario** (render + variantes CVA + a11y assertions / logica). (Excepcion de story: un componente sin visual propio que solo delega — ej. `AuthGuard`, gate de auth que renderiza `LoginScreen`/children — lleva test pero puede omitir story con justificacion.)
- **Co-locacion estricta**: el test y la story viven en la MISMA carpeta del componente. NO en un dir `__tests__/` separado ni en `src/stories/` global. Un test/story huerfano (separado de lo que prueba) es drift a corregir.
- **Post-`shadcn add` (reorg obligatorio)**: `npx shadcn add <x>` escribe `components/ui/<x>.tsx` PLANO. Tras correrlo, reorganizar a carpeta: `mkdir ui/<x>`, mover `<x>.tsx` → `ui/<x>/<x>.tsx`, crear `ui/<x>/index.ts` (`export * from './<x>'`), y agregar `<x>.test.tsx` + `<x>.stories.tsx`. Es un paso manual asumido a cambio del orden.

## Why

- **Carpeta-por-componente (uniforme)**: con el catalogo creciendo, archivos planos en `ui/` se mezclan (N componentes × 3 archivos sueltos). Una carpeta por componente mantiene cada unidad (componente + test + story + barrel) agrupada, descubrible y escalable — mismo modelo mental para primitivas y composites, sin distincion plano/carpeta (decision del dev en JOR-025). El barrel `index.ts` hace la migracion import-transparente.
- **Costo asumido**: `npx shadcn add` escribe plano → reorg manual por primitiva nueva (paso documentado arriba). Se prioriza el orden del arbol sobre la friccion ocasional del CLI.
- **Story + test por componente**: la story es la base de test visual (Storybook + addon-vitest + a11y); el test unitario cubre logica/interaccion. Decision del dev en JOR-023 — cobertura explicita por componente.

## Where

- **Files**: `front/jormat-front/src/components/ui/<x>/{<x>.tsx, <x>.stories.tsx, <x>.test.tsx, index.ts}` (primitivas en carpeta) · `front/jormat-front/src/components/<dominio>/<Component>/{...}` (composites en carpeta; `<dominio>` incluye `shell`, `auth`, etc.).
- **Layers**: frontend.
- **Excepcion**: `app/.../page.tsx` (pantallas) solo orquestan composites; su test/story (si aplica) acompanan al composite extraido, no a la page.

## When

Al **crear o mover** cualquier componente React en el frontend (primitiva o composite). Tickets nuevos siguen esta convencion desde el inicio.

## Verification

- Cada componente (primitiva o composite) vive en su carpeta con `Component.tsx` + `.test.tsx` + `.stories.tsx` + `index.ts` (story exenta solo para gates sin visual propio, con justificacion). Verificar: `components/ui/` y `components/<dominio>/` contienen SOLO carpetas, no `.tsx` sueltos.
- Sin test/story huerfanos (un `*.test.tsx`/`*.stories.tsx` cuyo componente no esta en la misma carpeta).
- No hay directorios de componentes hermanos de `src/components/` (verificar: `src/shell/` y `src/stories/` NO existen; `src/app/` solo rutas + providers).

## Source

- **Discovered in**: JOR-023 (tactic), a partir de gaps observados al cerrar JOR-005 (primitivas shadcn agregadas sin story ni test; `Home.test/stories` huerfanos en `shell/` separados de `app/(app)/page.tsx`).
- **Evidence**: JOR-005 agrego `components/ui/{avatar,badge,button,dropdown-menu,separator,sheet,tooltip}.tsx` sin `*.stories.tsx`/`*.test.tsx`, incumpliendo `component-architecture.md` L59 ("una story por primitiva").
- **Related**: `jormat_docs/ongoing/component-architecture.md` (fuente de verdad de estructura, actualizada en JOR-023); [[RULE-global-001]] (DoD). Migracion del codigo existente a esta convencion: JOR-024 (cobertura ui/ + composites del shell a carpeta).
- **Revisado en JOR-025** (2 partes): (1) **relocacion** — se elimino `src/shell/` como ubicacion valida; todos los composites bajo `src/components/` (shell→`components/shell/`); principio `app/`(rutas) vs `components/`(componentes); borrado scaffold `src/stories/`; AuthGuard→`components/auth/AuthGuard/`. (2) **fin del hibrido** — las primitivas `ui/` pasan de PLANAS a **carpeta-por-componente** (igual que composites): una sola regla para todo el frontend. Costo: reorg manual tras `npx shadcn add` (documentado en What). Revierte la decision "ui plano" original de JOR-023 (el motivo era la friccion del CLI; el dev prioriza el orden del arbol al crecer el catalogo).
