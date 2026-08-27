---
id: BUG-mcp-002
project: up1
type: bug
module: mcp
---

## Symptom

En el MCP oficial (`@uplanner/mcp`), cuando un rol SIN la capability de lectura de un objeto consulta ese objeto por las tools genericas (`up1_query_records`/`up1_get_object`), el MCP responde con un error **generico**: `"An unexpected error occurred in UP1. Try again in a moment..."`, en vez de un `PERMISSION_DENIED` claro y legible.

## Reproduccion (2026-08-27, tenant UPU)

Descubierto verificando el camino negativo de UPONE-1530 (curriculum-mapping read-only):
1. Cambiar el rol activo a `gestor-ret` (retencion), cuyo set NO incluye `competencynode:view` / `levelscheme:view` / `mod/curriculum-mapping:view`.
2. `up1_query_records` sobre `CompetencyNode` (recordType Matrix) y `LevelScheme` (recordType Scheme) -> ambos fallan con el error generico.
3. `up1_query_records` sobre `Student` (que `gestor-ret` SI puede ver) -> devuelve 131 registros.

O sea: la sesion funciona y el rechazo ES por permisos (no transitorio), pero el mensaje no lo dice.

## Root cause (hipotesis, a confirmar)

La denegacion RBAC del object-manager (GraphQL) no se traduce a un `PERMISSION_DENIED` en la superficie del MCP: se propaga como error generico. Revisar el manejo de error en las tools genericas de lectura / `graphql-client.js` del MCP (`~/Workspace/uplanner/up1/mcp/src`).

## Impacto

- UX: un usuario no-tecnico no entiende que es un tema de permisos.
- Trazabilidad: el rechazo por permisos no se distingue de un bug real.
- Contrato: REQ-03/05/08 de UPONE-1530 asumen `PERMISSION_DENIED`; la frontera RBAC opera (deniega el acceso) pero el mensaje no cumple ese contrato de salida.

## Workaround

Ninguno en el MCP hoy. La frontera de seguridad SI opera (el dato no se filtra); es solo la calidad del mensaje.

## Origen

Learn de TICKET-137 (UPONE-1530), refinado a este bug. Ver DEC-LOCAL-05 (el camino negativo era el diferido que se cerro en la misma sesion).
