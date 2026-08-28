---
id: BUG-object-manager-004
project: up1
type: bug
module: object-manager
tags:
  - auth
  - error-handling
  - security
  - stacktrace-leak
  - mcp-limitation
---

# Falta de auth devuelve `code: INTERNAL_SERVER_ERROR` + stacktrace con paths absolutos del filesystem

## Symptom

Una query GraphQL sin token (auth requerida) responde con `message: "Authentication required."` pero `extensions.code: INTERNAL_SERVER_ERROR` (no un código de auth), y `extensions` incluye `stacktrace[]` / `stack[]` con **rutas absolutas del filesystem** del servidor.

## Expected behavior

El código debería reflejar la causa (ej. `UNAUTHENTICATED`), y la respuesta NO debería exponer stacktraces ni paths absolutos del servidor al cliente (riesgo de information disclosure).

## Root cause

- **File**: object-manager — manejo de errores de GraphQL / authChecker.
- **Cause**: el error de auth se mapea a `INTERNAL_SERVER_ERROR` genérico y el formatError no sanitiza `stacktrace`/`stack` en las extensions.

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | cualquier cliente no autenticado |
| Data affected | exposición de paths del filesystem del servidor (information disclosure) |
| Modules affected | object-manager (API), consumidores |
| Frequency | siempre en errores sin auth |

## Reproduction

### Steps
1. `listInstances(...)` sin `Authorization`.
2. Respuesta: `message="Authentication required."`, `code=INTERNAL_SERVER_ERROR`, `extensions.stacktrace[]` con paths absolutos.

## Workaround

`up1-mcp` remapea "Authentication required." a un mensaje legible y NO propaga stacktraces al usuario (sanitiza). Workaround del cliente.

## Solution

Propuesta: mapear el error de auth a `UNAUTHENTICATED` y desactivar la exposición de `stacktrace`/`stack` en producción (formatError que los elimine). Decisión de up1 (P3).

## Related

- **Rules**: [[RULE-mcp-004]] (errores de permiso traducidos a mensajes legibles).
- **Specs**: SPEC-mcp-architecture (§4.4, §11).
- **Origen**: descubierto en la build del MCP (S0, 2026-06-06); registrado vía TICKET-080.
