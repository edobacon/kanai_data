---
id: SPEC-mcp-001
project: up1
type: spec
module: mcp
category: mcp
tags: [up1, mcp, model-context-protocol, agentes, claude, oauth, clerk, http, streamable-http, mod-packs, declarativo, object-manager, multi-tenant]
fecha: 2026-08-27
repos: [uplanner/mcp (up1-mcp, gitlink del monorepo up1), uplanner/up1 (object-manager, mods)]
sources:
  - mcp/src/index.js
  - mcp/src/mcp-server.js
  - mcp/src/config.js
  - mcp/src/mods/index.js
  - mcp/README.md
  - object-manager/src/services/auth/userExtractor.js
---
# MCP de uP1 — Vision general

Servidor **MCP (Model Context Protocol)** de uP1: permite que agentes externos que el cliente final ya usa (Claude, ChatGPT, Gemini) operen la plataforma **con la identidad y los permisos reales de esa persona**, sin instalar nada del lado del cliente. Es un producto/workspace propio del monorepo, no un mod.

> Estado: **PoC** (v0.1.0). Expone un **subconjunto** de la plataforma, deliberadamente acotado. Lo que falta esta declarado explicito (ver [services.md](services.md) y el `README.md` del repo).

## Indice
1. [Que es y donde vive](#1-que-es-y-donde-vive)
2. [Relacion con Elric](#2-relacion-con-elric)
3. [Arquitectura de transporte](#3-arquitectura-de-transporte)
4. [Modelo de sesion](#4-modelo-de-sesion)
5. [Modelo de seguridad (auth + tenant)](#5-modelo-de-seguridad-auth--tenant)
6. [Activacion de mods: los dos gates](#6-activacion-de-mods-los-dos-gates)
7. [Motor declarativo](#7-motor-declarativo)

---

## 1. Que es y donde vive

- **Workspace** `mcp` del monorepo `uplanner/up1` (paquete `@uplanner/mcp`). Registrado en `package.json` raiz (`workspaces` + `uPlannerProjects` como `mcp.git`) y en `scripts/update-repos.js`. En el repo raiz esta como **gitlink** (no submodulo con `.gitmodules`: mismo patron que object-manager/suite/layout/flow).
- Codigo en `mcp/src/`. Entry HTTP en `mcp/src/index.js`.
- Habla con el **object-manager** por GraphQL (`UP1_GRAPHQL_URL`, default `http://localhost:4000/graphql`). No accede a la BD directo.

## 2. Relacion con Elric

Hay **dos** MCP distintos, no confundir:

| | **Elric** (`up1-mcp`) | **Este MCP** (`@uplanner/mcp`) |
|---|---|---|
| Repo | `uplanner/mcp` (standalone) | `uplanner/up1/mcp` (workspace) |
| Transporte | stdio (local, Clerk email+OTP) | **HTTP + Clerk OAuth** |
| Rol | herramienta local del dev (PoC previo) | producto: el reemplazo, en la nube |

No es un fork. **Se porto el patron** de "mod pack" de Elric (`src/contracts/`, `src/mods/`) y **evoluciono a declarativo** (fichas que un motor generico interpreta). El scaffold de transporte (Express + `@clerk/express` + Streamable HTTP) viene del PoC `up1-mcp-remoto`. Elric sigue existiendo aparte, sin cambios.

## 3. Arquitectura de transporte

Express (`mcp/src/index.js`), transporte `StreamableHTTPServerTransport` del SDK de MCP:
- `POST /mcp` y `DELETE /mcp` (protegidos por `mcpAuthClerk`).
- `GET /.well-known/oauth-protected-resource/mcp` y `/.well-known/oauth-authorization-server` — metadatos OAuth que el cliente descubre tras un `401` (Clerk como Authorization Server).
- `GET /health` (liveness) y `GET /health/deep` (chequea el object-manager: `{ ok, objectManager }`).
- Puerto y config por env, ver `mcp/src/config.js`: `PORT` (4100), `UP1_GRAPHQL_URL`, `MCP_BASE_URL`, `UP1_DEV_FALLBACK_TENANT` (solo dev), Clerk keys (acepta los nombres `NUXT_*` de la suite como fallback), `MCP_MAX_SESSIONS`/`MCP_MAX_SESSIONS_PER_USER`, `LOG_LEVEL`, `MCP_METRICS_ENABLED`, `MCP_HEALTH_CHECK_INTERVAL_MS`.

## 4. Modelo de sesion

- Un `McpServer` por **sesion MCP real** (`Mcp-Session-Id`), no por request: `buildMcpServer(config, sessionState, initialAuth)` en `mcp/src/mcp-server.js`. `index.js` crea un `sessionState` nuevo al arrancar una conversacion y lo reusa en cada llamada siguiente.
- La **institucion activa de la conversacion** vive solo en `sessionState` (a proposito no es un campo de Clerk), para que cambiar de institucion en una conversacion no se filtre a otra abierta en paralelo con la misma cuenta.
- Topes de sesiones concurrentes: `MCP_MAX_SESSIONS` (default 500 total, 10 por usuario). Excedente → `429`.

## 5. Modelo de seguridad (auth + tenant)

- **Auth**: OAuth de Clerk. El cliente recibe `401` con discovery, hace sign-in y manda un **OAuth access token** (`typ: at+jwt`) como Bearer. El object-manager lo verifica en `object-manager/src/services/auth/userExtractor.js` (`verifyClerkOAuthToken` → `authenticateRequest({ acceptsToken: 'oauth_token' })`).
  - **Requisito de config del object-manager**: para verificar OAuth tokens necesita **pubkey + secret** de Clerk (`NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `NUXT_CLERK_SECRET_KEY`). Sin la pubkey, todo request del MCP falla con `AUTH_TOKEN_INVALID` / 401 aunque el token sea valido. Ver [dev-and-usage.md](dev-and-usage.md).
- **Identidad**: el `sub` del token OAuth es el `clerkUserId`; el object-manager resuelve el `core_User` por ese id. Los tokens OAuth traen solo `sub` (sin email), asi que el auto-link por email (`allowLink`, que si salva a la suite) **no aplica** al MCP: el match es directo por `clerkUserId`.
- **Tenant**: se deriva de `publicMetadata.tenantId` del usuario Clerk (ver `mcp/src/tenant.js`), no de una env fija. En dev, si el usuario no lo tiene, `UP1_DEV_FALLBACK_TENANT` lo resuelve. Cuentas con >1 institucion sin elegir → `INSTITUTION_CONFIRMATION_REQUIRED` (se resuelve con `list_my_institutions` + `set_active_institution`).
- **RBAC / visibilidad de tools**: cada tool puede declarar `requiresCapability`; se oculta (fuera de `tools/list` y rechazada si se llama igual) para roles sin esa capability. Se re-evalua al arrancar sesion, cambiar de institucion y cambiar de rol (`mcp/src/tools/capability-gate.js`). Las lecturas genericas NO estan gateadas por mod pack, solo por capabilities del rol.

## 6. Activacion de mods: los dos gates

Un mod pack aparece en una sesion solo si pasa **ambos** gates (ver `mcp/src/mcp-server.js` y `mcp/src/mods/index.js`):

1. **App activa para el rol** — `getAppsFiltered` (misma query que usa la Suite para navegacion: `isActive` + rol a nivel app) devuelve los `name` de apps activas. Ante error de red/permiso → set vacio (nunca "todo activo" por default).
2. **Pack existente** — `registerMods` filtra los packs descubiertos en `mcp/src/mods/` por su `id`, quedandose con los que esten en el set del gate 1. **El `id` del pack DEBE ser igual al `name` del app.**

Consecuencia: un mod puede estar activo como app (gate 1 verde) y aun asi no exponerse en el MCP porque no existe su pack `ai/` (gate 2). Es el caso de curriculum-design y curriculum-mapping hoy — ver la seccion "Agregar un mod pack" en [dev-and-usage.md](dev-and-usage.md).

## 7. Motor declarativo

Un mod pack **no escribe funciones por tool**: declara "fichas" (datos: nombre, operacion GraphQL, forma del input) y un motor generico las convierte en tools reales. Aplica **tanto a las tools genericas del core como a las de cada mod** (no hay dos sistemas).

- Motor: `mcp/src/tools/register-declarative-tools.js`. Zod desde fichas: `mcp/src/tools/type-schema.js`.
- Forma de un `ModPack` y de una ficha (`ToolDescriptor`): `mcp/src/mods/types.js`.
- Los packs se descubren mirando carpetas bajo `mcp/src/mods/` (`mcp/src/mods/index.js`), y se generan con `npm run sync` desde `mods/<mod>/ai/` del monorepo (no versionado, `.gitignore`).
- **Escotilla de escape** (`registerExtra`): para una operacion que no se reduce a "una llamada GraphQL con inputs" (ej. un upsert que busca y luego crea-o-edita). Es la excepcion, no la regla (ej. `as_set_rule_value` en academic-scheduling).

Ver [services.md](services.md) para el catalogo de tools y [dev-and-usage.md](dev-and-usage.md) para el loop de dev y como agregar un pack.
