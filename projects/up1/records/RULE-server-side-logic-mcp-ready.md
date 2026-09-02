---
id: RULE-server-side-logic-mcp-ready
project: up1
type: rule
module: general
---

**Maxima de trabajo.** Toda logica de negocio (validaciones, reglas de dominio, calculos, invariantes) se resuelve en el backend/servicio (resolver server-side gobernado, mutaciones `*Validated`), **no en el cliente/front**. Corolario MCP: toda capacidad debe ser **MCP-ready**, es decir operable por el servicio/MCP, y **ninguna via de escritura (UI, API, MCP, importacion) puede saltear las reglas**; la logica no debe residir exclusivamente en el cliente.

**Como se aplica:** es un factor transversal por defecto de la DoD/Factores de todo ticket que introduzca o modifique logica. Si una regla vive hoy solo en el cliente, el ticket la escala al resolver (o declara explicitamente por que queda como UX pura).

**Origen:** criterio transversal fijado por el PO en el planning sp10 (2026-08-31); alineado con el trabajo Elric -> MCP online (endurecimiento del MCP, `blockGenericMutation`; ver UPONE-1757/1758 y `sp9/ANALISIS-backend-vs-client-cd-cm-endurecimiento-mcp`).
