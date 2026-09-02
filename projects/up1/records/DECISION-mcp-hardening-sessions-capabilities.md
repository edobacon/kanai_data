---
id: DECISION-mcp-hardening-sessions-capabilities
project: up1
type: decision
module: mcp
tags:
  - UPONE-1530
  - sp9
  - mcp
---

Endurecimiento del MCP online (complementa el analisis sp9). Sesiones reales per-conversacion con aislamiento de institucion activa; gate de tools de mod pack por tenant/sesion + guardas contra fabricacion del LLM; ocultar ids/objectType crudos en previews de write; check de delete-impact antes de confirmar; tools nuevas get_field_options, get_create_guide y get_change_history/query_changes/analytics.

sourceRef (verificado por diff): mcp d668285 src/mcp-server.js:~14 + src/tenant.js + src/index.js (sesiones per-conversacion + aislamiento institucion), c91fca7 src/mcp-server.js:~13 + src/mods/index.js (gate mod pack por tenant/sesion + anti-fabricacion), 651cf49 (ocultar ids en previews de write), 0211a66 (delete-impact check), 2e15e6c (get_field_options), 2cdba94 (get_create_guide).
