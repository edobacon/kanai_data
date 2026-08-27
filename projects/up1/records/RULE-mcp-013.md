---
id: RULE-mcp-013
project: up1
type: rule
module: up1-mcp
status: archived
tags:
  - mcp
  - operational
  - security
  - session
  - clerk
---

# La sesión Clerk se persiste cifrada (AES-256-GCM, 0600) y nunca dentro del `.mcpb` distribuible

> **SUPERSEDED (2026-08-27)** — **Stale por cambio de transporte**: el MCP nuevo usa Streamable HTTP + OAuth (Clerk como Authorization Server); no hay archivo de sesion Clerk cifrado local (era del PoC stdio "Elric"). Ver DEC-058 y los learns de TICKET-137 (desfase MCP viejo/nuevo).

## What

La sesión Clerk del usuario (client token) se persiste **cifrada** con AES-256-GCM en un archivo por-usuario (`~/.up1-mcp/session.enc`, permisos `0600`). Preferir el keychain del SO cuando esté disponible (upgrade). La sesión NUNCA se incluye en el `.mcpb` distribuible ni en ningún artefacto compartido.

## Why

La sesión es una credencial: si se filtra, da acceso como el usuario. El cifrado + permisos restrictivos + scope por-usuario minimizan el riesgo en disco. Empaquetarla en el `.mcpb` la distribuiría a otros usuarios (fuga grave).

## Where

- **Files**: capa de persistencia de sesión del MCP (`~/.up1-mcp/session.enc`).
- **Layers**: backend del MCP, almacenamiento local.

## When

Al persistir o leer la sesión Clerk; al empaquetar el `.mcpb` (verificar que la sesión no se incluye).

## Verification

- `session.enc` cifrado, permisos `0600`, por-usuario.
- El `.mcpb` no contiene la sesión.

## Source

- **Discovered in**: TICKET-080; origen plan MCP §15 obs #5, S1.
- **Evidence**: S1 — persistencia AES-256-GCM implementada.
- **Related**: [[RULE-mcp-001]] (nunca secret key en cliente), [[RULE-mcp-002]].
