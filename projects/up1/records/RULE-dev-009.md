---
id: RULE-dev-009
project: up1
type: rule
module: dev
tags:
  - frontera
  - mod-only
  - core
  - mcp
  - scope
  - sp5
---

# Frontera de scope: mod-only salvo versionado/clonado (core); cobertura MCP en el mismo SP

## What

El trabajo de un feature del mod se ciñe a `mods/<mod>/`. Tocar core (object-manager/layout/suite/flow) requiere ser **excepción autorizada** (ej. versionado/clonado) con rama de épica + review del team (RULE-dev-004). Además, **lo desarrollado en un SP debe quedar operable vía el MCP** (`uplanner/mcp`) en el mismo SP: contratos (`ObjectContract` + allowlist) son requeridos y baratos; los `cd_*` de dominio son opcionales/ergonómicos.

## Why

Mantiene el aislamiento modular (sync mods→core), evita tocar core inadvertidamente, y garantiza que cada objeto/operación entregada sea operable conversacionalmente (MCP) sin deuda diferida.

## Where

mods/<mod>/ (default del feature) · object-manager/ etc. solo como excepción autorizada (rama de épica core) · uplanner/mcp (contratos + tools).

## When

En toda planificación y ejecución de features de un mod. Si aparece una necesidad de core que NO sea versionado/clonado, escalar (no resolver inline).

## Verification

Revisar el diff del ticket: solo toca mods/<mod>/ (+ uplanner/mcp para contratos); cualquier cambio en object-manager/layout/suite está justificado como excepción autorizada con su rama de épica.

## Source

- **Discovered in**: —
