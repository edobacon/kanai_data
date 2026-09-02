---
id: RULE-testing-coverage-config-001
project: jormat-evolution
type: rule
module: testing
level: must
tags:
  - testing
  - coverage
  - jest
  - vitest
  - exclusions
  - v8-ignore
  - jsdom
  - convention
---

# Qué se excluye del coverage y cuándo es legítimo un v8-ignore

## What

El coverage se mide sobre **código con lógica testeable de forma unitaria**. Quedan FUERA del
denominador (configurado en `jest.config.ts` `collectCoverageFrom` y `vitest.config.ts`
`coverage.exclude`):

- **Backend (jest)**: `main.ts` (bootstrap), `*.module.ts` (wiring DI), `*.spec.ts`, `index.ts` (barrels).
- **Frontend (vitest)**: `app/**/{page,layout}.tsx` y `app/api/**/route.ts` (thin wrappers de Next),
  `app/providers.tsx`, `auth/msalConfig.ts` y `auth/MsalProviderWrapper.tsx` (bootstrap MSAL),
  `src/test/**` (setup + MSW), `types/api.gen.ts` (generado), `index.{ts,tsx}` (barrels), `*.stories.tsx`, `*.test.{ts,tsx}`.

Un comentario `/* v8 ignore */` en código de producción del frontend SOLO es legítimo para ramas
**genuinamente inalcanzables en el runner jsdom** (el proyecto storybook/browser está excluido por flaky):

1. Guards SSR `typeof window/document` (no se ejecutan en jsdom).
2. Handlers de drag de dnd-kit (PointerSensor no dispara sin pointer events reales).
3. `onOpenChange(true)` de Radix Dialog en modo controlado (Radix nunca lo invoca).
4. `?.`/`?? default` sobre estructuras siempre inicializadas por el form (DEFAULT_VALUES).

## Why

Medir cobertura sobre archivos en 0%-by-design (DI, bootstrap, generados) infla la dificultad sin
señal real. Excluirlos da el número honesto sobre la lógica que importa. El `v8 ignore` acotado a
ramas jsdom-unreachable evita tests falsos o habilitar el runner browser flaky, sin ocultar lógica
de negocio. Ver DEC-LOCAL-01 y DEC-LOCAL-03 de SPEC-testing-coverage-90.

## Where

- `backend/jormat-api/jest.config.ts` (`collectCoverageFrom`).
- `front/jormat-front/vitest.config.ts` (`coverage.include` / `coverage.exclude`).
- Comentarios `/* v8 ignore */` en componentes/hooks/stores del front (siempre con comentario en
  español explicando por qué la rama es inalcanzable).

## When

Al sumar exclusiones nuevas o un `v8 ignore`: debe encajar en una de las categorías de arriba. Está
PROHIBIDO usar `v8 ignore` para evitar testear lógica de negocio real o para "llegar al número".
Una exclusión por archivo conveniente (no por categoría) es un anti-patrón.

## Verification

`npm run test:cov` (back) y `vitest run --project '!storybook' --coverage` (front) reportan el
denominador acotado. Revisar en code review que cada `v8 ignore` tenga comentario justificando la
categoría jsdom-unreachable.

## Sintaxis obligatoria: bloques start/stop (JOR-061, L3)

Con `@vitest/coverage-v8` 4.x (AST-aware), los hints `/* v8 ignore next N */` **NO surten efecto**
sobre ramas multi-línea ni cuando hay comentarios entre el hint y el código — las ramas siguen
contándose en el denominador silenciosamente (verificado empíricamente en JOR-061: LineItemsTable
reportaba 44.68% branches con hints `next N` presentes). Usar SIEMPRE bloques:

```ts
/* v8 ignore start */
...rama inalcanzable...
/* v8 ignore stop */
```

**Alcance exacto**: el bloque debe cubrir SOLO la rama inalcanzable — envolver código cubierto por
tests (happy paths) es un ignore no-honesto aunque la justificación del comentario sea válida
(finding confirmado por dual-judge en JOR-061 S2). Hints `next N` preexistentes son deuda: ver
backlog B1 de JOR-061 (sweep repo-wide).

## Source

JOR-049 (S1 exclusiones, S4 v8-ignore). Evidencia: backend 99.35/95.88/96.46/99.28; frontend
96.65/90.91/96.82/97.26 (29 v8-ignore, todos jsdom-unreachable, verificados en S4).
Update JOR-061 S2 (2026-07-01): sintaxis start/stop obligatoria (L3) + alcance exacto del bloque
(dual-judge finding). Evidencia: LineItemsTable 44.68→100→96 branches segun scope del ignore.
