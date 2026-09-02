---
id: RULE-frontend-010
project: jormat-evolution
type: rule
module: frontend
level: should
tags:
  - frontend
  - tsconfig
  - testing
  - jest-dom
  - editor
---

# `tsconfig.json` excluye tests/stories: errores rojos del editor en esos archivos son invisibles para build y vitest

## What

`tsconfig.json` excluye `**/*.test.tsx`, `**/*.stories.tsx` y `src/test`. Esto hace que el TS server del editor abra esos archivos en un *inferred project* sin los `paths` (`@/`) ni la augmentacion de tipos de jest-dom (`src/test/setup.ts`). Sintoma: errores rojos en el editor (`Cannot find module '@/...'`, `toBeInTheDocument no existe en Assertion`) que son **invisibles** tanto para `next build`/`tsc` (los excluye) como para `vitest` (no type-checkea). Fix file-local: usar imports relativos en vez de `@/` dentro de tests/stories, e importar explicitamente `import '@testing-library/jest-dom/vitest'` en cada test que use matchers DOM. Fix de raiz (cambio de tooling, no de un ticket puntual): ajustar `tsconfig.json` para incluir tests/stories con sus `paths`, o agregar jest-dom a `types` globalmente.

## Why

Sin este conocimiento, cada test/story nuevo que use `@/` o matchers de jest-dom muestra errores en el editor que ningun gate automatizado (build, vitest) detecta, generando ruido que el dev debe diagnosticar cada vez de cero. Aplica a TODO test/story nuevo del proyecto (DET-16): un cierre de sesion no deberia dejar estos errores en el editor.

## Where

- **Layers**: frontend (`tsconfig.json`, cualquier `*.test.tsx`/`*.stories.tsx` nuevo).

## When

- Al escribir un nuevo `*.test.tsx`/`*.stories.tsx`: usar imports relativos (no `@/`) y declarar explicitamente `import '@testing-library/jest-dom/vitest'` si usa matchers DOM.
- Al revisar el cierre de una sesion frontend: verificar que el editor no muestre errores rojos nuevos en los archivos de test/story tocados.

## Verification

- El editor no marca `Cannot find module '@/...'` ni `toBeInTheDocument no existe` en los tests/stories nuevos.
- `next build`/`tsc` y `vitest` siguen verdes (no detectan este tipo de error por diseno del inferred project).

## Source

- **Discovered in**: JOR-004, Session #1.
- **Evidence**: L1 (tsconfig excluye test/story files -> inferred project sin paths/jest-dom; fix relativo + import explicito jest-dom).
