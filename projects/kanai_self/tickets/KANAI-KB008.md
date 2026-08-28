---
id: KANAI-KB008
project: kanai_self
type: ticket
status: open
work_type: improvement
module: mcp
autopilot: manual
---

# Capa de presentación semántica del MCP de kanai

## Request

Que el MCP de kanai guíe al usuario en lenguaje de negocio, con seguridad preview→commit, sin exponer nombres técnicos (tools, ids, códigos DET, JSON crudo), adoptando patrones de Elric/up1-mcp.

**Decisión de diseño transversal**: la presentación semántica vive en la CAPA MCP (texto para el host LLM), no en `server/repo/*` (que el web UI consume como JSON). Ocultar ids en el texto no rompe el encadenado (el LLM ya los tiene).

## Plan de fases

- **F0 — Contrato de presentación**: `instructions` del MCP (PRESENTACIÓN/CONFIDENCIALIDAD/límites honestos) + refuerzo en actionSystemPrompt/bootstrap. (base hecha)
- **F1 — Presentador semántico compartido** (`server/mcp/present.ts`): oculta id/*Id/_*/hashes/DET/veredictos crudos, aplana wrappers, relabela a negocio. Fundación de F2/F3. + tests.
- **F2 — preview→commit** en tools mutantes (`create_ticket`, `refine_spec`, `approve_spec`, `create_record`, `add_relation`, transiciones): sin `confirm` → preview semántico sin mutar; con `confirm:true` → ejecuta. Ripple en el chat.
- **F3 — Presentación semántica de resultados de lectura** (get_ticket, find_context, review_spec, sp_estimate, list_*, search) en la capa MCP.
- **F4 — Guías y opciones legibles**: create_guide/describe de entidades + opciones de transición (nextStates) y enums en lenguaje de negocio.
- **F5 — `about` / onboarding de negocio** (qué hace kanai, sin dump técnico).
- **F6 — Resolución por nombre + límites honestos**.

Orden: F0 → F1 → F2 → F3 → (F4, F5, F6). F1 es prerequisito de F2/F3.
