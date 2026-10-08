---
id: DECISION-mcp-fallas-transitorias-backend-reintentar-sin-ticket
project: up1
type: decision
module: mcp
tags:
  - sin-ticket
  - mcp
  - errores
  - reintento
---

graphql-client.js clasifica por forma y no por texto: un status 503 devuelve SERVICE_UPDATING, y los códigos de conexión (ECONNREFUSED, ECONNRESET, ETIMEDOUT, etc., también dentro de cause o de un AggregateError de undici) devuelven SERVICE_UNREACHABLE. Solo corre cuando el error iba a caer en el mensaje genérico, y un mensaje seguro con code propio gana. Se elige 503 y no 5xx porque es el único código que object-manager usa para indicar que todavía no puede atender. Commit sin ticket de Jira.

Fuente: 2a46827 src/graphql-client.js:246-261,317.
