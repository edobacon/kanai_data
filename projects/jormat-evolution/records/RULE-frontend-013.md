---
id: RULE-frontend-013
project: jormat-evolution
type: rule
module: frontend
level: must
tags:
  - frontend
  - storybook
  - react-query
  - decorator
  - addon-vitest
---

# `.storybook/preview.tsx` necesita un `QueryClientProvider` global: sin el, TODA story que use React Query falla

## What

El proyecto storybook (addon-vitest, corrido en chromium) estaba roto **project-wide** para cualquier vista que use React Query: `.storybook/preview.tsx` no tenia un `QueryClientProvider` global, asi que las stories de cualquier vista con hooks de React Query fallaban al renderizar con "No QueryClient set". Los tests jsdom no exponen este problema porque cada test envuelve su propio `QueryClientProvider` localmente. Fix: un decorator global `withQueryClient` en `preview.tsx` que crea un `QueryClient` fresco por story (con `retry: false`, para que los estados de error se muestren de inmediato en vez de reintentar).

## Why

Sin el decorator global, cada vista nueva que use React Query queda bloqueada en su capa de story-como-test (dimension Storybook de DET-23) hasta que alguien descubra el mismo problema de nuevo — un gap de infraestructura compartida, no del componente individual.

## Where

- **Layers**: frontend (`.storybook/preview.tsx`, configuracion global de Storybook).

## When

- Ya resuelto de forma global (JOR-013); verificar que `preview.tsx` conserve el decorator `withQueryClient` si se toca la configuracion de Storybook.
- Al crear una vista nueva que use React Query: sus stories heredan el `QueryClientProvider` global automaticamente, no requiere wrapping manual por story.

## Verification

- Cualquier story de una vista con hooks de React Query renderiza sin el error "No QueryClient set" en el proyecto storybook (chromium).

## Source

- **Discovered in**: JOR-013, Session #2.
- **Evidence**: L2 (decorator global `withQueryClient` en preview.tsx desbloqueo tambien RolesView/UsersView, 3/3 y 6/6 stories).
