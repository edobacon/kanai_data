---
id: RULE-mcp-004
project: up1
type: rule
module: up1-mcp
tags:
  - mcp
  - principle
  - p4
  - rbac
  - permissions
  - allowlist
---

# P4 — Los permisos del usuario son la frontera: el MCP no expone ni ejecuta lo que el usuario no tiene

## What

El MCP aplica **doble defensa** de permisos: (a) up1 enforza RBAC server-side; (b) el MCP **lee las capabilities del usuario** y no ofrece ni ejecuta tools para objetos/acciones sin permiso, devolviendo un mensaje legible. Las tools son **permission/context-aware** (`tools/list_changed`, S31): las gateadas se ocultan según el rol. Además, **allowlist por objeto/mod**: el MCP solo expone objetos de los mods soportados, aunque el usuario tenga acceso a más.

## Why

El MCP nunca debe ampliar la superficie de lo que el usuario puede hacer. Sin el gate del lado del MCP, el LLM podría intentar acciones que up1 rechaza (mala UX) o exponer objetos fuera de alcance. Los errores de permiso se traducen a mensajes legibles (no stack traces — ver bug auth stacktrace leak).

## Where

- **Files**: capa auth/permisos del MCP (gate map, `tools/list_changed`); allowlist de objetos por `ModPack`.
- **Layers**: backend del MCP.

## When

Al registrar cualquier tool (gate por capability) y en cada request (traducir errores de permiso de up1). Al agregar un objeto: entra a la allowlist explícitamente.

## Verification

- Con un rol de bajo privilegio (ej. estudiante-eng, 16 caps), las tools gateadas se ocultan (validado S31).
- Errores de permiso de up1 se devuelven como texto legible, sin stack trace.
- Grep: ningún objeto fuera de la allowlist es operable por el CRUD genérico.

## Source

- **Discovered in**: TICKET-080; origen plan MCP P4, §17/§44, S16, S31.
- **Evidence**: S31 — 13 tools gateadas se ocultaron con rol de 16 caps; flujos engagement gateados por `mod/uengagement:*`.
- **Related**: [[RULE-mcp-002]], límite de aislamiento por institución (ver [[SPEC-mcp-architecture]] §11).
