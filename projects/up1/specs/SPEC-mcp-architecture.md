---
id: SPEC-mcp-architecture
project: up1
ticket: TICKET-080
status: done
---

# up1-mcp — Arquitectura, autenticación, multi-LLM y límites

# up1-mcp — Arquitectura, autenticación, multi-LLM y límites

> **Spec de referencia** (no de build). Documenta el diseño del adaptador `up1-mcp` tal como fue construido y validado en vivo (S0–S34, ver [EVOLUTION-up1-mcp](EVOLUTION-up1-mcp.md)). Fuente migrada desde el plan externo `mcp-curriculum-design-plan-ejecucion-2026-06-05.md` (§0–§4, §6, §8–§11, apéndice), retirado por TICKET-080. El **surface de tools y la capa de contratos** viven en [SPEC-mcp-surface-and-contracts](SPEC-mcp-surface-and-contracts.md). Los **principios P1–P7** son normativos en `rules/mcp/` (esta spec los resume).

## Executive summary — qué es up1-mcp

`up1-mcp` es **un solo componente**: un servidor MCP (Node/TypeScript, `@modelcontextprotocol/sdk`) que actúa como **adaptador/traductor** entre un LLM host (Claude/ChatGPT/Gemini) y la API GraphQL de up1. Permite a un LLM operar los mods **curriculum-design** (programas de asignatura/Activity, currículos/planes, carreras, sílabos), **uengagement** (servicios y agendamiento) y **layouts** (vistas) **en nombre del usuario real** (Clerk JWT), respetando sus permisos, **sin modificar up1** y de forma homologable local→producción.

- **No guarda datos** — up1 es la fuente de verdad. Es mayormente *stateless*.
- **Solo habla GraphQL de up1 + Clerk FAPI** — nunca DB directa, archivos de up1, ni secret key en el cliente.
- **Transport-agnostic**: stdio (MVP local/Claude Desktop) y Streamable HTTP+OAuth (online/ChatGPT/Gemini) sobre el mismo núcleo.

## Purpose

Dar a un LLM la capacidad de consultar, buscar, crear, editar, versionar y analizar objetos de up1 a través de tools MCP de alto nivel, traduciendo intención en lenguaje natural a llamadas GraphQL autenticadas como el usuario, aplicando las reglas frontend-only que up1 no enforza server-side (capa de contratos), y exponiendo su propia arquitectura/capacidades/límites (auto-documentado).

## 1. Principios y restricciones (no negociables)

> Normativos en `rules/mcp/` (una regla por principio). Resumen:

| # | Principio | Regla |
|---|-----------|-------|
| P1 | **Solo vía API GraphQL de up1 + Clerk FAPI.** Nunca DB ni código directo. Garantiza homologación local→online | `RULE-mcp-001` |
| P2 | **El MCP actúa como el usuario real** (Clerk JWT), no como service account. Atribución y RBAC correctos | `RULE-mcp-002` |
| P3 | **No modificar up1.** Las reglas frontend-only se replican en el MCP (capa de contratos) | `RULE-mcp-003` |
| P4 | **Permisos del usuario son la frontera.** El MCP nunca expone/ejecuta lo que el usuario no tiene (mod, objeto, capability) | `RULE-mcp-004` |
| P5 | **Genérico + contract-aware.** Soporta nuevos objetos/mods sin reescritura (contrato `ModPack`) | `RULE-mcp-005` |
| P6 | **Multi-LLM.** Habla MCP estándar; agnóstico del LLM cliente; transport-agnostic | `RULE-mcp-006` |
| P7 | **Auto-documentado.** Expone su arquitectura, capacidades, límites y roadmap en runtime | `RULE-mcp-007` |

## 2. Arquitectura

### 2.1 Topología — 3 capas

```
┌── LLM host (Claude / Gemini / ChatGPT) ──┐  decide qué tool llamar según el prompt
└───────────────┬───────────────────────────┘
                │ MCP (stdio local / HTTP+OAuth online)
        ┌───────▼───────────────────────────────┐
        │  up1-mcp (Node/TypeScript)             │
        │  Capa 1 — Núcleo genérico (GraphQL)    │  list/get/create/update/delete/version → cualquier objeto
        │  Capa 2 — Registro de contratos        │  por objeto: pesos, autoAssign, workflow, uniqueFields, validatedMutations
        │  Capa 3 — Tools de dominio             │  cd_*, eng_*, view_* (la API que ve el LLM)
        │  Auth (Clerk) + sesión + rol           │  email OTP → session → refresh ~60s
        └───────────────┬────────────────────────┘
                        │ HTTPS: GraphQL + Clerk FAPI
        ┌───────────────▼────────────────────────┐
        │  up1 (object-manager GraphQL) — RBAC + tenant + mods │  local :4000 / staging / prod
        └──────────────────────────────────────────┘
```

1. **Núcleo genérico**: cliente GraphQL que envuelve `listInstances`/`getInstance`/`createInstance`/`updateInstance`/`deleteInstance`/bulk*/`getVersionChain`/`getObjectDefinitions`/`getObjectFields`. Sirve a CUALQUIER objeto; hereda validaciones server-side.
2. **Registro de contratos por objeto** (config-driven, extensible): declara las reglas frontend-only a aplicar antes de mutar (ver SPEC-mcp-surface-and-contracts).
3. **Tools de dominio**: traducen intención a llamadas del núcleo + contratos.

### 2.2 Flujo de una consulta

```
1. Usuario → LLM (lenguaje natural)
2. LLM elige tool + args según las tools que expone up1-mcp (cd_search_programs{query:"estadística"})
3. LLM → up1-mcp (protocolo MCP)
4. up1-mcp → GraphQL + token del usuario (Clerk) + X-Tenant-ID + contratos → up1
5. up1 resuelve con su RBAC → datos crudos
6. up1-mcp postprocesa (ranking/joins/cálculos, higiene de salida) → resultado estructurado → LLM
7. LLM → Usuario (lenguaje natural)
```
Reparto: el **LLM** decide *qué tool y con qué argumentos*; `up1-mcp` decide *qué query GraphQL, con qué auth y contratos*.

### 2.3 Transportes (mismo núcleo)

| Modo | Transporte | Uso |
|---|---|---|
| Local stdio | subproceso (stdin/stdout) | **MVP / Claude Desktop / Gemini CLI** |
| Local HTTP | `localhost:PORT` | emular prod; túnel para ChatGPT/Gemini remoto |
| HTTP hospedado | servicio HTTPS + OAuth | producción multi-LLM (post-MVP, S9 backlog) |

Cambiar local↔online = cambiar transporte/config, **cero cambios de código** (P1).

### 2.4 Qué se desarrolla vs qué ya existe

Se desarrolla **una sola cosa**: `up1-mcp` (1 repo, `/Users/edobacon/Workspace/uplanner/mcp`). El **MCP client** lo trae el LLM host; **up1** ya existe y no se toca (P3). Lo que se "instala" según el modo es **config** (stdio), un **`.mcpb`** (Claude un clic) o una **URL** (hospedado) — todos apuntan al mismo código.

### 2.5 Por qué no reusar el mod `ai-agent` / Yupi

Yupi es un LLM server-side dentro de up1 (text-in/text-out), no reusable como capa externa. Se adoptan sus **patrones** (fallback de acentos, confirmación de CRUD, rate limits) pero el MCP llama el GraphQL genérico directo.

## 4. Autenticación, identidad y roles

### 4.1 Configuración inicial
Config del MCP almacena `userEmail`, `tenantId`, `environment` (local|staging|prod), y por ambiente `graphqlUrl` + datos de la instancia Clerk (FAPI host / publishable key). **Defaults MVP**: `eduardo.bacon@uplanner.com` / `UPU` / `local`. El email se solicita al configurar o en la primera tool que requiera auth.

### 4.2 Flujo de login (Clerk email OTP — sin tocar up1)
1. `authenticate()` → Clerk FAPI `sign_ins` con `strategy=email_code` → código al inbox.
2. `submit_otp(code)` → `attempt_first_factor` → sesión (client token), **persistida cifrada** (AES-256-GCM, `~/.up1-mcp/session.enc`, perms 0600 — ver `RULE-mcp` operativa).
3. Por request: mintea un **session token fresco (~60s)** desde la sesión guardada y lo manda como `Authorization: Bearer` + `X-Tenant-ID`.
4. Re-login automático cuando la sesión expira.

> Validado en vivo (S1): bootstrap OTP nativo Clerk funciona **sin secret key**.

### 4.3 Roles (múltiples — fijar y cambiar por consulta)
- `get_context()` → usuario, tenant, **rol activo**, **roles disponibles**, capabilities resueltas.
- `set_active_role(role)` → fija el rol; el MCP envía `X-Selected-Role` + `X-Context-Path`.
- **GOTCHA (S1)**: `getMyPermissions` resuelve en el contexto del rol activo; con `X-Selected-Role` el roster colapsa a ese rol. **Mitigación**: el roster completo se obtiene SIEMPRE con contexto base (sin `X-Selected-Role`) y se cachea; las capabilities se piden con el rol activo. (Ver `bug-*` getMyPermissions role-collapse.)

### 4.4 Permisos como frontera (P4)
- **Doble defensa**: (a) up1 enforza RBAC server-side; (b) el MCP lee las capabilities del usuario y **no ofrece/ejecuta** tools sin permiso (tools permission-aware con `tools/list_changed`, S31).
- Errores de permiso de up1 se traducen a mensajes legibles (sanitizar — no stack traces; ver `bug-*` auth stacktrace leak).
- **Scope de mod**: allowlist por objeto; acceso a otros mods = extensión explícita.
- ⚠️ **Límite**: up1 hoy NO aísla por institución (todos en `/system/<tenant>`). El MCP no puede garantizar aislamiento más estricto que la UI sin cambios en up1.

## 6. Multi-LLM: activación y compatibilidad

El servidor declara **nombre + `instructions`** (routing) y **tool descriptions ricas** con sinónimos del dominio. Lectura idempotente; escritura con **preview→commit** (confirmación).

| Cliente LLM | Soporte MCP | Transporte | Estado |
|---|---|---|---|
| Claude (Desktop/Code/API) | nativo | stdio + HTTP | **referencia primaria (MVP validado)** |
| ChatGPT (connectors) | sí | HTTP | requiere hospedado + OAuth (S9 backlog) |
| Gemini (CLI/emergente) | parcial | stdio/HTTP | validar versión |
| Otros (Cline, Cursor) | sí | stdio | bonus |

Reporte vivo en `COMPATIBILITY.md` del repo. **MVP = Forma B (local) en Claude** (`.mcpb` un clic, Node bundled).

## 8. Homologación de ambientes (P1)
Config por ambiente (`local|staging|prod`): `graphqlUrl`, instancia Clerk, `tenantId`. El MCP solo usa GraphQL + Clerk FAPI → cambiar de local a online = cambiar config, cero cambios de código. Prohibido cualquier atajo local (DB, archivos, secret key).

## 9. Auto-documentación (P7)
El repo incluye y expone como recursos MCP: `ARCHITECTURE.md`, `CAPABILITIES.md`, `LIMITATIONS.md`, `ROADMAP.md`, `EXTENDING.md`, más tools `about` / `get_documentation(topic)` (overview, mods, conventions, uengagement, curriculum-design) para consulta en runtime. Doc de dominio user-facing por mod (S26): "qué es / qué puedo hacer" en lenguaje de negocio, sin nombrar tools/objetos internos.

## 10. Packaging y distribución
- **Forma A — Hospedado** (post-MVP, S9): corre en servidor central; el usuario solo agrega una URL + login OAuth. Clientes: ChatGPT, Gemini, (Claude).
- **Forma B — Local** (MVP): `.mcpb` (Node bundled, un clic) o npm; corre en la máquina del usuario. Cliente: Claude Desktop.
- `INSTALL.md` (config por cliente), `SHARING.md` (publicar paquete/endpoint), versionado semántico + changelog.

## 11. Limitaciones de up1 actuales (registradas como bugs)

Reconocidas para `LIMITATIONS.md` y migradas a `bugs/{módulo}/` (dedup KB-first, ver TICKET-080 S3). Ninguna bloquea el MVP.

| Área | Limitación (evidencia) | Mejora propuesta en up1 |
|---|---|---|
| Aislamiento | Sin scope por institución; todos en `/system/<tenant>` | contextos `/acc/...` reales / `allowedInstitutions` |
| Búsqueda | ILIKE no pliega tildes ('Ecuación'→0, 'Ecuacion'→1) | `pg_trgm`/full-text o fallback `translate()` |
| Integridad | Reglas frontend-only no enforzadas en API (suma de pesos >100 aceptada, no autoasigna `position`, status readonly) | mover validaciones al resolver |
| Auditoría | `updateActivityValidated` no emite `withEventPublish` → updates de **programa** no generan ChangeLog (sí lo hacen creates/deletes/transiciones y updates de sección) | envolver con `withEventPublish` |
| Reorden | No atómico (N updates) | mutation `reorderSections` atómica |
| Analítica | Sin agregación nativa (counts/stats) | endpoints de agregación/vistas |
| Auth headless | Solo OTP de usuario; sin M2M sin secret key | sign-in tokens server-side / JWT template |
| Drift de tenant | UPU tiene `OfferingEnrollment`/`Attendance` híbridos (userId NOT NULL viejo + studentId nuevo) → bloquea escritura de engagement | regenerar baseline UPU a model-v2 limpio |

## Apéndice — Trazabilidad de requisitos del usuario → diseño

| Requisito del usuario | Dónde |
|---|---|
| Email para login (guardado, preguntado 1ª vez/config) | §4.1, §4.2 |
| Multi-LLM (Claude/Gemini/ChatGPT) + activación | §6 |
| Restringido a curriculum-design, extensible a objetos/mods | §4.4 (P4), surface §7 |
| Acción limitada a lo que el usuario posee (permisos reales) | §4.4 (P4) |
| Conexión homologable a prod/test, sin DB/código directo | §3 nota, §8 (P1) |
| Capacidades (consultar/buscar/detalle hijos/editar/crear/versionar/bibliografía/historial/calculadas) | surface §5 |
| Auto-documentación (arquitectura, capacidades, límites, roadmap) | §9, §11 |
| Múltiples roles: fijar y cambiar por consulta | §4.3 |
| Doc de instalación y de compartir | §10 |
| Reporte de compatibilidad con LLMs | §6 |
| Modelo conceptual (qué se desarrolla, flujo, transportes, qué instala) | §2.4, §2.5, §10 |
| MCP enseña persistir-vs-puntual al filtrar + no expone temas de desarrollo | surface §5 + `RULE-mcp` contrato conversacional |

## Technical reference

- **Repo**: `/Users/edobacon/Workspace/uplanner/mcp` (standalone, branch `main`). NO submódulo del monorepo up1.
- **Stack**: TypeScript + `@modelcontextprotocol/sdk`, cliente GraphQL (`graphql-request`/Apollo core), build con skill `mcp-builder`.
- **Dominio expuesto**: curriculum-design (Activity:Course, Curriculum, AcademicProgram, Syllabus, CurricularSection y typed `rt__*`), uengagement (Activity:Service, ActivityLine, Offering, Event, Attendance, OfferingEnrollment, Instructor, Student), layouts (`up1_layen_layout`).
- **Precondición operativa**: el object-manager local debe tener los mods synced; sin sync corre resolvers viejos (campos vacíos).

## Decisions

Ver `decisions/` (migradas en TICKET-080 S2): `DEC-*-mcp-foundations` (stack/repo/transport), `DEC-*-mcp-mvp-scope`, `DEC-*-mcp-multimod-arch`, `DEC-*-mcp-model-v2-realign`, `DEC-*-mcp-semantic-resolution`, `DEC-*-mcp-conversational-contract`.

## Rules discovered

Ver `rules/mcp/` — `RULE-mcp-001..007` (P1–P7) + acoplamiento + contrato/operativas.

## Bugs found

Ver `bugs/{módulo}/` — limitaciones de §11 (migradas/dedup en TICKET-080 S3).
