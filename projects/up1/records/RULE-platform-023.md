---
id: RULE-platform-023
project: up1
type: rule
module: platform
tags:
  - platform
  - ci
  - deploy
  - submodules
  - yupi
  - docker
---

# Yupi se despliega vía submódulos separados, no embebido en el monorepo; CI de suite requiere memoria Docker aumentada

## What

El stack de Yupi (IA conversacional) MUST declararse como 3 submódulos independientes bajo `up1-Yupi/{ai-core,ai-bridge,ai-observability}` (`.gitmodules`), nunca como infraestructura embebida en el monorepo raíz (docker-compose.yml con langfuse/telegram-bridge/bridge, Dockerfiles AWS dedicados). El script `scripts/update-repos.js` detecta y actualiza estos submódulos vía `getYupiRepos()`.

Además, el build de CI (`bitbucket-pipelines.yml`) del workspace `suite` (Nuxt) MUST correr con memoria Docker >= 6144 MB (default de la plataforma: 2048 MB) y `size: 2x` en los build steps de OM/suite/flow, porque el build de Nuxt agota el heap por defecto.

## Why

UPONE-1435 removió el docker-compose.yml embebido, 3 Dockerfiles AWS y sus task definitions, reemplazándolos por submódulos independientes (`.gitmodules`, `scripts/update-repos.js` agrega `getYupiRepos()`). Aísla el deploy de Yupi del monorepo principal (deploy independiente, evita bloat). En paralelo, `fix/pipeline-memory` subió la memoria Docker de CI de 2048 a 6144 MB porque el build de suite (Nuxt) requería más heap del disponible. Enlaza [[DECISION-019]] (patrón de reuso de infraestructura entre mods, tema relacionado de desacoplamiento).

## Where

`.gitmodules`, `scripts/update-repos.js`, `bitbucket-pipelines.yml`, `up1-Yupi/README.md`, `up1-Yupi/RUNBOOK.md`.

## When

Al ejecutar `npm run update-repos` (debe cubrir Yupi vía `getYupiRepos()`), al tocar CI de `suite`, o al agregar nueva infraestructura de IA al monorepo (evaluar submódulo vs embebido según este precedente).
