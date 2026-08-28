---
id: RULE-mcp-001
project: up1
type: rule
module: up1-mcp
tags:
  - mcp
  - principle
  - p1
  - homologacion
  - security
---

# P1 — El MCP accede a up1 SOLO vía GraphQL + Clerk FAPI; nunca DB, archivos ni secret key

## What

`up1-mcp` se comunica con up1 exclusivamente a través de la **API GraphQL de up1** (object-manager) y con Clerk a través de su **FAPI** (Frontend API). Está prohibido: acceso directo a la base de datos, lectura de archivos del repo de up1, y embeber el **secret key** de Clerk en el cliente. El minting de tokens vía secret key que se usó en la validación inicial (§39 del plan original) fue solo para nuestra verificación — NO se distribuye ni se usa en runtime.

## Why

Garantiza la **homologación local→staging→producción** (P1 del plan): si el MCP solo usa GraphQL + Clerk FAPI, cambiar de ambiente es cambiar config (URL + instancia Clerk + tenant), cero cambios de código. Cualquier atajo local (DB directa, archivos) rompe esa propiedad y crea un MCP que funciona local pero no en prod. El secret key en el cliente es además un riesgo de seguridad (credencial de servidor expuesta).

## Where

- **Files**: `up1-mcp` repo (`/Users/edobacon/Workspace/uplanner/mcp`), capa núcleo (cliente GraphQL) + capa auth (Clerk FAPI).
- **Layers**: api (GraphQL), config (por ambiente).

## When

Siempre — en todo acceso a datos o auth desde el MCP. Si una tarea pareciera requerir DB directa o secret key, es señal de que falta una capacidad en up1 (registrar como límite/bug, no implementar el atajo).

## Verification

- Grep en el repo del MCP: no debe haber drivers de DB (pg, prisma), ni lectura de paths de up1, ni `CLERK_SECRET_KEY` en código de cliente.
- Lint/review que verifique que toda llamada a up1 pasa por el cliente GraphQL.

## Source

- **Discovered in**: TICKET-080 (migración); origen plan MCP §3 nota, §8, principio P1.
- **Evidence**: diseño homologable validado S0–S8; el secret-key minting fue solo para verificación nuestra.
- **Related**: [[RULE-mcp-003]] (no modificar up1), [[RULE-mcp-002]] (usuario real).
