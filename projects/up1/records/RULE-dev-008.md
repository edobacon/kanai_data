---
id: RULE-dev-008
project: up1
type: rule
module: dev
tags:
  - bitbucket
  - mod-extraction
  - setup
  - monorepo
  - workflow
---

# Proceso de extracción de un mod a repositorio Bitbucket independiente

## What

Para extraer un mod de up1 del monorepo a un repositorio Bitbucket independiente: (1) crear el repo en Bitbucket UI con rama default `develop`; (2) en el directorio del mod: `git init -b develop && git add . && git commit -m 'UPONE-XXXX chore: scaffold inicial'`; (3) `git remote add origin git@bitbucket.org:uplanner/<mod>.git && git push -u origin develop`; (4) en el monorepo: agregar `<mod>.git` al array `uPlannerMods` de `up1/package.json` y commitear en la rama del ticket. NO usar git submodules.

## Why

El monorepo up1 gestiona mods externos via un script propio (`npm run setup`) que clona desde `BITBUCKET_BASE_URL + uPlannerMods[]`, sin lock de SHA. Los submodules de git no son compatibles con este mecanismo y generan conflictos. Commitear archivos del mod en el monorepo genera duplicación y rompe la sincronización — los archivos del mod deben quedar untracked en el working tree del monorepo (igual que los demás mods externos).

## Where

Aplica cuando un mod es promovido de desarrollo local (directorio untracked en `up1/mods/<mod>/`) a repositorio productivo en Bitbucket. Relevante en: `up1/package.json` (campo `uPlannerMods`), el directorio `up1/mods/<mod>/` (donde el mod vive untracked post-extracción), y el script `npm run setup` del monorepo.

## When

Activar al momento de registrar un mod nuevo en el monorepo para que otros desarrolladores puedan clonarlo via `npm run setup`. También aplica si se necesita migrar un mod que comenzó untracked en el monorepo. Verificar post-extracción: `git pull` directo en `mods/<mod>/` funciona y `npm run sync` del monorepo procesa el mod correctamente.

## Verification

1. El repo existe en `bitbucket.org/uplanner/<mod>` con rama `develop`. 2. `up1/package.json` campo `uPlannerMods` incluye `<mod>.git`. 3. `up1/mods/<mod>/` aparece como untracked en `git status` del monorepo (no staged ni committed). 4. `npm run setup` desde una copia limpia clona el mod sin errores. 5. `npm run sync` desde `up1/` procesa el mod sin errores.

## Source

- **Discovered in**: TICKET-006
