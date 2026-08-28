---
id: RULE-mcp-007
project: up1
type: rule
module: up1-mcp
tags:
  - mcp
  - principle
  - p7
  - self-doc
---

# P7 — El MCP es auto-documentado: expone su arquitectura, capacidades, límites y roadmap en runtime

## What

El repo del MCP incluye y expone como recursos/tools consultables en runtime: `ARCHITECTURE.md`, `CAPABILITIES.md`, `LIMITATIONS.md`, `ROADMAP.md`, `EXTENDING.md`, más `about` / `get_documentation(topic)` (overview, mods, conventions, uengagement, curriculum-design). Incluye doc de dominio user-facing por mod ("qué es / qué puedo hacer") en lenguaje de negocio, sin nombrar tools/objetos internos.

## Why

El LLM (y el usuario) deben poder consultar qué hace el MCP, qué capacidades tiene, qué NO expone cada mod y cuáles son los límites de up1 — sin leer el código. La auto-doc derivada de contratos garantiza cero drift entre lo documentado y lo que el MCP realmente hace.

## Where

- **Files**: `docs/*.md` del repo del MCP (servidos en runtime, relativos al paquete); tools `about`/`get_documentation`.
- **Layers**: backend del MCP.

## When

Al agregar tools o capacidades nuevas: actualizar la auto-doc (la guía derivada de contratos lo hace automáticamente; los topics de dominio se mantienen al día — ver `RULE-mcp-surface-reflects-mod-capability`).

## Verification

- `get_documentation('mods')` reporta tools y no-expuestos por dominio (validado S19).
- `about` devuelve arquitectura/capacidades/límites.
- La doc se sirve leyendo `docs/*.md` en runtime (incluida en `files` de package.json).

## Source

- **Discovered in**: TICKET-080; origen plan MCP P7, §9, S19/S26/S30.
- **Evidence**: S26 — doc de dominio user-facing; S30 — EXTENDING reescrito.
- **Related**: [[RULE-mcp-surface-reflects-mod-capability]] (mantener doc al día), [[SPEC-mcp-architecture]] §9.
