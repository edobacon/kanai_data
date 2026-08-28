---
id: RULE-platform-024
project: up1
type: rule
module: platform
tags:
  - platform
  - mods
  - lifecycle
  - sync
  - mods-json
  - uPlannerMods
  - ignoredMods
---

# Lifecycle de mods en el monorepo: clonado (uPlannerMods), activo (mods.json) y excluido (ignoredMods)

## What

El estado de un mod lo determinan TRES listas independientes, no una sola:
- **`uPlannerMods`** (root `package.json`): lista de repos que se clonan al hacer setup/update. Estar aquí solo garantiza que el directorio `mods/<name>/` exista; no lo activa.
- **`mods.json`** (`mods: [{name, repo, active}]`): registro de mods ACTIVOS. Un mod se propaga por el sync (objetos, capabilities, layouts, componentes) y CI lo hornea en la imagen de object-manager SOLO si aparece aquí con `active: true`.
- **`ignoredMods`** (root `package.json`): lista de exclusión explícita de los scripts de sync (`npm run sync`, `check-mods`), aunque el mod esté clonado.

De ahí los estados reales:
- **active**: en `mods.json` con `active: true` (ej. `academic-scheduling`, `curriculum-design`, `up1-manager`, `uengagement`).
- **standby**: clonado (en `uPlannerMods`) pero AUSENTE de `mods.json`. Es el caso de `curriculum-mapping`: existe en el filesystem pero el sync no lo propaga porque no está registrado como activo. Activarlo = agregarlo a `mods.json` con `active: true` (NO requiere tocar `ignoredMods`).
- **ignored**: en `ignoredMods` (ej. `hello-world-mod` template, `ueng-dev`, `ai-agent`), excluido del sync aunque esté clonado o incluso listado en `mods.json`.

## Why

Verificado contra `package.json` y `mods.json` reales a 2026-08-03 (no confiar en el recon inicial, que atribuía el standby de curriculum-mapping a `ignoredMods`; es incorrecto). Estado real: `ignoredMods = ["hello-world-mod","ueng-dev","ai-agent"]`; `uPlannerMods` incluye `curriculum-mapping.git`; `mods.json` activos: ai-agent, up1-manager, curriculum-design, uengagement, academic-scheduling. `curriculum-mapping` NO está en `ignoredMods` NI en `mods.json`, por eso queda standby. `academic-scheduling` pasó a `active: true` en `mods.json` (commit `2718979`), lo que disparó su inclusión en CI.

## Where

Root `package.json` (`uPlannerMods`, `ignoredMods`), `mods.json` (registro de mods activos con scope de tenant/roles).

## When

Al activar o desactivar un mod. Estado verificado a 2026-08-03: `academic-scheduling` active (tenants UPU/DEMO02), `curriculum-mapping` standby (clonado, ausente de `mods.json`).
