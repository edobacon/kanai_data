---
id: RULE-mcp-014
project: up1
type: rule
module: up1-mcp
tags:
  - mcp
  - operational
  - testing
  - data-hygiene
---

# Los datos creados en vivo durante validación llevan prefijo `MCP-TEST-` y se registran sus ids

## What

Cuando una validación en vivo del MCP crea datos reales en un tenant (ej. un programa o sección de prueba), esos datos llevan el prefijo `MCP-TEST-` en su nombre/código y sus ids se registran en la bitácora de la sesión. Política de limpieza: documentarla por sesión (en S5 se decidió NO borrar — enfoque B — para enriquecer analytics e inspección UI; en otras sesiones se hizo cleanup explícito).

## Why

Distingue los datos de prueba de los reales en un tenant compartido, permite encontrarlos/limpiarlos y evita confundir analytics. Registrar los ids da trazabilidad para el cleanup o la inspección posterior.

## Where

- **Files**: bitácora de sesión del MCP; nombres/códigos de los objetos creados en validación.
- **Layers**: proceso de validación en vivo (no es código del MCP).

## When

Al ejecutar validaciones de escritura en vivo contra un tenant real (UPU).

## Verification

- Los objetos de prueba en el tenant tienen prefijo `MCP-TEST-`.
- Sus ids quedan en la bitácora de la sesión correspondiente.

## Source

- **Discovered in**: TICKET-080; origen plan MCP §15 obs #4, S5/S6.
- **Evidence**: S5 — datos `MCP-TEST-` no borrados (enfoque B); S6 — id creado y borrado tras la prueba; residual SMOKE-AP-92137 (S29) ejemplo de dato de prueba sin limpiar.
- **Related**: [[RULE-mcp-012]] (preview→commit).
