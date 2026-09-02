---
id: RULE-viewer-001
project: horadric
type: rule
module: viewer
level: must
tags:
  - architecture
  - shared
  - cross-layer
  - vite
  - tsconfig
---

# Codigo compartido server-frontend vive en shared/, no en una de las capas

## What

Todo modulo de codigo que consuman AMBAS capas de HC (server/ y src/) debe vivir en shared/ (alias @shared), NO en server/ ni en src/. src/ no puede importar de server/ (ni viceversa); shared/ es el unico dir incluido por tsconfig.app Y tsconfig.server con alias @shared en ambos + en vite.config. Los tests co-located de modulos shared requieren que vite.config test.include liste 'shared/**/*.test.ts'.

## Why

src/ (tsconfig.app) y server/ (tsconfig.server) son grafos de compilacion separados; un import cross-layer rompe el type-check o el bundle. shared/ es el puente diseñado (precedente: shared/parallelGroups.ts, shared/types.ts). Ubicar un single-source en una capa obliga a la otra a un import ilegal.

## Where

horadric-cube: shared/ (ej. shared/sessionRegex.ts creado en HOR-123 S1.T2 para el regex de atribucion commit->sesion, consumido por server/git/blame.ts + server/routes/changes.ts + src/composables/useSessionCommits.ts). Config: vite.config.ts (alias @shared + test.include), tsconfig.app.json + tsconfig.server.json (paths @shared + include shared/**).

## When

Al crear cualquier helper/constante/tipo/regex que se necesite tanto en el backend (server/) como en el frontend (src/) de HC. Si el spec/diseño ubica un single-source en server/ o src/, corregir a shared/ antes de implementar.

## Verification

grep que el modulo este en shared/ y que ambas capas lo importen via @shared; type-check (vue-tsc + tsc) verde con el import cross-layer; el test co-located en shared/ corre (vite.config test.include lo cubre).

## Source

- **Discovered in**: HOR-123
