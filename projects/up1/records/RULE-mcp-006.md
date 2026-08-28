---
id: RULE-mcp-006
project: up1
type: rule
module: up1-mcp
tags:
  - mcp
  - principle
  - p6
  - multi-llm
  - transport
---

# P6 — Multi-LLM: el servidor habla MCP estándar y es transport-agnostic

## What

`up1-mcp` declara el protocolo MCP estándar (nombre + `instructions` + tools con descripciones ricas) de forma **agnóstica del LLM cliente** (Claude/ChatGPT/Gemini/Cline/Cursor). El mismo núcleo soporta múltiples transportes: **stdio** (local/Claude Desktop) y **Streamable HTTP+OAuth** (hospedado/ChatGPT/Gemini). El diseño es transport-agnostic desde el día 1.

## Why

No acoplarse a un LLM ni a un transporte: cambiar local↔online o de cliente no debe requerir reescribir el núcleo, solo config/transporte. El routing del LLM depende de `instructions` + nombres de tools con sinónimos del dominio, no de hooks propietarios.

## Where

- **Files**: capa de transporte del MCP (stdio / HTTP), `instructions` del servidor.
- **Layers**: backend del MCP, config.

## When

Al implementar transporte o al agregar tools (descripciones ricas para activación cross-LLM). El soporte hospedado real a ChatGPT/Gemini requiere el servidor desplegado (S9, backlog).

## Verification

- MVP validado en Claude (stdio + `.mcpb`).
- Reporte de compatibilidad vivo en `COMPATIBILITY.md`.
- Cambiar de stdio a HTTP no toca el núcleo (solo transporte/config).

## Source

- **Discovered in**: TICKET-080; origen plan MCP P6, §2.4, §6.
- **Evidence**: arquitectura transport-agnostic confirmada S0–S8; MVP en Claude.
- **Related**: [[RULE-mcp-001]] (homologación), [[SPEC-mcp-architecture]] §6.
