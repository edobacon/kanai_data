---
id: RULE-platform-025
project: up1
type: rule
module: platform
tags:
  - platform
  - governance
  - architecture
  - monorepo
---

# Creación de un nuevo top-level block (repo/deploy/sync propio) requiere justificación explícita

## What

Antes de crear un nuevo bloque de primer nivel en el monorepo (repo independiente, pipeline de deploy propio, script de sync dedicado tipo `npm run sync:<block>`), SHOULD confirmarse que el bloque tiene: (1) ownership de datos independiente, (2) cadencia de deploy distinta al resto de la plataforma, (3) su propio `COMMANDMENTS.md` documentando el contrato del bloque. La decisión la toma el arquitecto de plataforma junto al equipo core, no un desarrollador individual sobre la marcha.

## Why

`.ai/COMMANDMENTS.md` (raíz del monorepo, agregado 2026-07-XX) formaliza este criterio tras la experiencia de bloques existentes (object-manager, layout, suite, flow, mods, report-builder) y el precedente reciente de Yupi via submódulos ([[RULE-platform-023]]). Sin este gate, cada mod o feature tiende a reclamar infraestructura propia (docker-compose, Dockerfile, task def AWS) que fragmenta el deploy y duplica tooling de CI.

## Where

`.ai/COMMANDMENTS.md` (raíz), y el `COMMANDMENTS.md` propio de cada bloque existente.

## When

Al proponer un nuevo workspace, repo satélite, o pipeline de deploy independiente dentro de up1.
