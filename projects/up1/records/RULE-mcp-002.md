---
id: RULE-mcp-002
project: up1
type: rule
module: up1-mcp
tags:
  - mcp
  - principle
  - p2
  - auth
  - rbac
  - clerk
---

# P2 — El MCP actúa como el usuario real (Clerk JWT), no como service account

## What

Toda operación contra up1 se autentica con la **sesión Clerk del usuario real** (email OTP → session token fresco ~60s como `Authorization: Bearer` + `X-Tenant-ID` + `X-Selected-Role`). El MCP NO usa una service account ni un token de sistema (`up1_svc_*`).

## Why

Atribución y RBAC correctos: up1 resuelve permisos por el usuario real, y la auditoría (ChangeLog/eventos) atribuye los cambios al humano. Una service account no atribuye a un humano y rompe la trazabilidad (ver identidad/RBAC de up1). El usuario solo puede hacer a través del MCP exactamente lo que puede hacer en la UI.

## Where

- **Files**: capa auth del MCP (Clerk FAPI: sign_ins / attempt_first_factor / sessions/<sid>/tokens).
- **Layers**: api, config.

## When

Siempre que el MCP ejecute una tool que llegue a up1. Sin sesión válida → `authenticate()` + `submit_otp()` antes de operar.

## Verification

- `get_context()` devuelve el usuario real, no un service account.
- Los cambios escritos aparecen atribuidos al usuario en up1.
- Grep: no hay uso de `up1_svc_` ni service tokens en el flujo de requests.

## Source

- **Discovered in**: TICKET-080; origen plan MCP D6/D7, §29/§36, S1.
- **Evidence**: S1 — bootstrap OTP nativo Clerk sin secret key; eduardo.bacon con 4 roles / 428 caps.
- **Related**: [[RULE-mcp-001]], [[RULE-mcp-004]] (permisos como frontera).
