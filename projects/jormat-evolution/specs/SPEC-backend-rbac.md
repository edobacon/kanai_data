---
id: SPEC-backend-rbac
project: jormat-evolution
ticket: JOR-010
status: done
---

# RBAC backend (WP-A6): tablas capabilities/roles/role_capabilities/user_roles + effectiveCaps→DB + endpoints Usuarios/Roles + GET /api/capabilities/me

# RBAC backend (WP-A6): tablas capabilities/roles/role_capabilities/user_roles + effectiveCaps→DB + endpoints Usuarios/Roles + GET /api/capabilities/me

> **Evolución (JOR-033, 2026-06-22 — DET-16)**: el wildcard `*` que esta spec siembra en REQ-02 y testea en REQ-03 ("el vector incluye `*`") fue **eliminado del modelo**. Lo reemplaza [SPEC-auth-internal-admin-grant-all](SPEC-auth-internal-admin-grant-all.md): `internal-admin` ya no tiene `*` sino **grants explícitos de todo el catálogo** (seed `09_internal_admin_grant_all`). `can.ts` NO cambió (la rama `granted === '*'` queda inerte). Además se agregó la capability `config.roles:create` (el `POST /config/roles` de REQ-06 pasó de `config.roles:edit` a `config.roles:create`). Al leer REQ-02/REQ-03/REQ-06 de esta spec, interpretar bajo esa evolución.

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: Cerrar el RBAC del backend que JOR-009 dejó contratado pero sin fuente de datos. Seis piezas (WP-A6 · A6.1–A6.4 + endpoints): (1) **migración** de las 4 tablas (`capabilities`, `roles`, `role_capabilities`, `user_roles`) en el estilo del schema entregado, idempotente up/down; (2) **seed** del catálogo de capabilities del módulo A6 (`config.users:*`, `config.roles:*`) + capability `*` + rol global `internal-admin`; (3) **módulo `permissions`** Nest (module/controller/service/repo) que implementa el contrato `CapabilityResolver` de JOR-009 — `effectiveCaps(userId, workspaceId)` une las capabilities de los roles del user (del workspace + globales) resolviendo wildcards vía el `can()` entregado; (4) un **`CapabilitiesHydrationGuard`** aditivo que, ordenado entre el `AuthGuard` entregado y el `CapabilitiesGuard` de JOR-009, puebla `req.user.capabilities` **sin tocar ninguno de los dos** (RULE-global-003); (5) endpoint nuevo **`GET /api/capabilities/me`** (`{capabilities: string[]}`) + **`GET /api/capabilities`** (catálogo para la matriz de admin); (6) endpoints **Usuarios CRUD** (DTO público sin `b2c_oid`/`pass`/`identity_provider`, soft-disable) y **Roles CRUD** (+ asignación caps↔rol, rol↔user, caps por rol), todos con `@RequireCapability` (A6.4) y test 403.

**Decisiones criticas** (resueltas en modo super con racional — ver Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **Hidratación de caps vía guard nuevo intermedio** (`CapabilitiesHydrationGuard`), ordenado `@UseGuards(AuthGuard, CapabilitiesHydrationGuard, CapabilitiesGuard)` | El `CapabilitiesGuard` (JOR-009) es **síncrono** y lee `req.user.capabilities ?? []`; el `AuthGuard` entregado NO lo puebla y NO se toca (RULE-global-003). Middleware no sirve (corre antes de los guards → `req.user` aún no existe). Un guard async intermedio es el único punto additive que corre **después** de AuthGuard y **antes** de CapabilitiesGuard. Ni el AuthGuard ni el guard de JOR-009 cambian |
| 2 | **`effectiveCaps` une roles del workspace activo + roles globales (`workspace_id NULL`)** en una sola query, scopeada por `userId` + `workspaceId`, devolviendo `capabilities.name[]` sin expandir wildcards en SQL | El `can()` entregado ya resuelve wildcards en runtime (testeado JOR-009). Expandir en SQL duplicaría esa lógica. El scope (roles del ws + globales) materializa S1 (RULE-global-002) + el rol `internal-admin` global |
| 3 | **Tablas join (`role_capabilities`, `user_roles`) con PK `id uuid` propia** + unique compuesto, no solo PK compuesta | El `Repository<T>` entregado asume `findById(id)`; uniforma el patrón. El unique compuesto preserva la semántica de presencia=otorgado. (Ver `data-model.md` decisión 3) |
| 4 | **Endpoints sobre el patrón módulo + `Repository<T>` de JOR-009**, repos finos scopeados por `workspaceId`, services dependen del repo por interfaz (testeable con mock); controllers sin lógica | Es exactamente el patrón que A5.1 fijó. Reusar evita deuda y hace los services unit-testeables sin DB |
| 5 | **Integration tests (Supertest) sin Postgres real**: Nest app mínima + `overrideProvider` del repo/resolver con un fake en memoria (sigue el precedente DEC-LOCAL-02 de JOR-009: el fixture inline prueba 200/403/contrato sin DB). La migración up/down + seed se verifican aparte con `db:reset` contra el Postgres de dev | El guard, los DTOs públicos y el 403 no requieren DB; un fake del repo permite el caso cross-tenant determinista. Testcontainers/PG efímero es de Capa C (YAGNI aquí) |

**Riesgos principales**:
- **Hidratación que no corre y deja `capabilities` vacío** → todo endpoint protegido daría 403. Mitigación: el hydration guard se aplica junto al `CapabilitiesGuard` en cada controller protegido; test 200-con-cap confirma que el vector llega. Documentar el trío de guards como patrón.
- **Fuga de columnas internas** en Usuarios (`b2c_oid`, `identity_provider`, futura `pass`) → S3. Mitigación: mapper a `UserPublicDto` explícito (allowlist de campos), nunca `SELECT *` al response. Test asserta que el body NO trae `b2c_oid`.
- **Query de caps sin scope de workspace** → un user vería caps de roles de otro tenant (S1). Mitigación: el `WHERE (r.workspace_id = :ws OR r.workspace_id IS NULL)` es obligatorio en el repo; test cross-tenant (ws A no ve rol de ws B).
- **`effectiveCaps` sin tests que muerdan** → mutation survivor en la lógica de unión/scope. Mitigación: unit con roles simples + wildcard + global + cross-tenant; mutation diff sobre el resolver (S5).

**Que NO se hace** (fuera de alcance):
- `AuthGuard` entregado y `/auth/me` — NO se tocan (RULE-global-003); `GET /api/capabilities/me` es endpoint nuevo y distinto.
- Parchear endpoints entregados sin authz (O-2 `PATCH /workspaces/:id`, O-5 `/users` expone columnas en el handler entregado) → se REPORTAN en JOR-012, no se corrigen aquí.
- Vistas FE de Usuarios/Roles + matriz de toggles + carga del vector a `<Can>` → **JOR-011**.
- Field-level caps (`obj.campo:accion`), CASL, condiciones por registro transversales → diferido (DEC-006 v1).
- Roles de negocio (Cajero, etc.) → se crean desde la UI por workspace; aquí solo el rol base `internal-admin`.
- `helmet`/`throttler`/env-validation → JOR-012.

## Purpose

**Actor**: el equipo de desarrollo + el administrador de cada workspace (vía la futura UI de JOR-011).
**Valor**: jormat obtiene una frontera de autorización **real y administrable** — permisos tan granulares como el legacy (matriz `modulo×feature×accion`) pero en 4 tablas lean, con el vector de caps efectivas servido por API para gatear la UI. El RBAC vive en la DB (independiente de Azure CIAM), así que se prueba sin crear cuentas Azure.
**Desbloquea**: JOR-011 (RBAC frontend — consume `GET /api/capabilities/me`, el catálogo y los endpoints de Usuarios/Roles), y Capa C (C4 RBAC por endpoint en módulos de negocio reusa el mismo guard + patrón).

## Requirements

### REQ-01 · Migración de las 4 tablas RBAC

> **Que cambia**: una migración Knex nueva crea `capabilities`, `roles`, `role_capabilities`, `user_roles` con sus FKs, uniques e índices, en el estilo del schema entregado.
> **Por que**: es la fuente de datos que el `CapabilitiesGuard` (JOR-009) necesita; sin ella el RBAC no tiene de dónde resolver caps.

La migración MUST crear las 4 tablas según `tickets/JOR-010.draft/data-model.md`: `capabilities` (`name` unique, `module`/`feature`/`action`, `description`, `risk_level` nullable), `roles` (`workspace_id` nullable FK→workspaces, `name`, `description`, `is_system`), `role_capabilities` (FK→roles + FK→capabilities, `unique(role_id, capability_id)`), `user_roles` (FK→users + FK→roles, `unique(user_id, role_id)`). MUST usar `uuid_generate_v4()` para PKs y `t.timestamps(true, true)` como el schema entregado. MUST crear índices `idx_user_roles_user`, `idx_role_capabilities_role`, `idx_roles_workspace`. La función `down` MUST dropear en orden inverso de dependencias. NO MUST tocar las migraciones existentes (`20250101000000`, `20250101000001`) — RULE-global-003.

<details><summary>Scenarios</summary>

- GIVEN una DB con el schema entregado, WHEN se corre `migrate:latest`, THEN las 4 tablas existen con sus FKs/uniques/índices y `migrate:status` las lista.
- GIVEN las 4 tablas creadas, WHEN se corre `migrate:rollback`, THEN se dropean sin error de FK (orden inverso) y la DB vuelve al estado previo.
</details>

- **source_ref**: ticket Scope "Dentro"; `permissions-model.md §4.3`; `implementation-tasks.md` A6.1. **Layers**: backend (Knex migration). **Certeza**: confirmed.

### REQ-02 · Seed del catálogo A6 + rol base `internal-admin`

> **Que cambia**: un seed nuevo, idempotente y no-prod-safe, inserta las capabilities del módulo A6, la capability `*`, y el rol global `internal-admin` con `*`.
> **Por que**: sin catálogo no hay qué asignar a roles ni qué pintar en la matriz; sin `internal-admin` no hay superusuario para administrar.

El seed `seeds/03_rbac.ts` MUST insertar las 8 capabilities del módulo A6 (`config.users:{view,edit,delete,assign-roles}`, `config.roles:{view,edit,delete,assign-permissions}`) + la capability `*` (module/feature/action = `*`). MUST crear el rol global `internal-admin` (`workspace_id NULL`, `is_system: true`) y asignarle `*` vía `role_capabilities`. MUST ser idempotente (re-run no duplica) y MUST NOT sembrar en `NODE_ENV=production` (patrón de `02_local_admin.ts`). NO MUST tocar `01_initial_data.ts` ni `02_local_admin.ts`. NO MUST asignar roles a usuarios reales (eso es dev manual / UI).

<details><summary>Scenarios</summary>

- GIVEN una DB migrada, WHEN se corre el seed dos veces, THEN las capabilities y el rol `internal-admin` existen exactamente una vez (sin duplicados).
- GIVEN `NODE_ENV=production`, WHEN se corre el seed, THEN no inserta nada y retorna sin error.
</details>

- **source_ref**: `implementation-tasks.md` "Registro de capabilities por módulo" (A6); `permissions-model.md §4.3`. **Layers**: backend (Knex seed). **Certeza**: confirmed.

### REQ-03 · `effectiveCaps` conectado a DB (cierra el contrato `CapabilityResolver`)

> **Que cambia**: el módulo `permissions` implementa `CapabilityResolver.resolve(user)` consultando las tablas, scopeado al workspace activo + roles globales.
> **Por que**: JOR-009 dejó la interfaz declarada y el guard denegando por defecto; este REQ le da la fuente real de caps.

El `PermissionsService` (o un `CapabilityResolver` concreto) MUST implementar `resolve(user: AuthenticatedUser): Promise<string[]>` devolviendo la unión de `capabilities.name` de los roles del usuario, vía `user_roles → roles → role_capabilities → capabilities`, con `WHERE ur.user_id = :userId AND (r.workspace_id = :workspaceId OR r.workspace_id IS NULL)`. MUST devolver `string[]` sin duplicados y sin expandir wildcards (el `can()` entregado los resuelve). El acceso a datos MUST pasar por un repo fino (`Repository`-style) inyectado por interfaz, testeable con mock. El resolver MUST quedar disponible para inyección (token DI) de modo que el `CapabilitiesHydrationGuard` (REQ-04) lo consuma.

<details><summary>Scenarios</summary>

- GIVEN un user con un rol del workspace que otorga `config.users:view` y `config.users:edit`, WHEN `resolve(user)`, THEN devuelve `['config.users:view','config.users:edit']` (orden indistinto).
- GIVEN un user con el rol global `internal-admin` (`*`), WHEN `resolve(user)`, THEN el vector incluye `*`.
- GIVEN un user del workspace A y un rol que otorga caps creado en el workspace B, WHEN `resolve(user)` con `workspaceId = A`, THEN el vector NO incluye las caps del rol de B (cross-tenant, S1).
</details>

- **source_ref**: `src/common/auth/capabilities.guard.ts` (interface `CapabilityResolver`); `permissions-model.md §4.6`; ticket Scope. **Layers**: backend (service + repo). **Certeza**: confirmed.

### REQ-04 · `CapabilitiesHydrationGuard` aditivo + `GET /api/capabilities/me` + `GET /api/capabilities`

> **Que cambia**: un guard nuevo puebla `req.user.capabilities` antes del `CapabilitiesGuard`; dos endpoints exponen las caps efectivas del user y el catálogo.
> **Por que**: el guard de JOR-009 necesita el vector poblado sin tocar el AuthGuard; el front necesita el vector (gateo UI) y el catálogo (matriz).

El `CapabilitiesHydrationGuard` MUST ser un `CanActivate` async que, si `req.user` existe, setea `req.user.capabilities = await resolver.resolve(req.user)` y retorna `true`. MUST ordenarse `@UseGuards(AuthGuard, CapabilitiesHydrationGuard, CapabilitiesGuard)` en los controllers protegidos. NO MUST modificar `auth.guard.ts` ni `capabilities.guard.ts` (RULE-global-003). `GET /api/capabilities/me` MUST devolver exactamente `{ capabilities: string[] }` (las efectivas del user autenticado) — sin `b2c_oid`, sin roles internos, sin stack (S3); NO es `/auth/me`. `GET /api/capabilities` MUST devolver el catálogo (para la matriz de admin) protegido con `@RequireCapability('config.roles:view')`.

<details><summary>Scenarios</summary>

- GIVEN un user autenticado con roles que otorgan caps, WHEN `GET /api/capabilities/me`, THEN responde `200 { capabilities: [...] }` y el body no tiene otras propiedades.
- GIVEN un endpoint protegido con `@RequireCapability('config.users:view')` y un user con esa cap, WHEN se llama, THEN 200 (el hydration guard pobló el vector).
- GIVEN un user sin `config.roles:view`, WHEN `GET /api/capabilities`, THEN 403 `{code:'FORBIDDEN'}`.
</details>

- **source_ref**: `capabilities.guard.ts` (CapabilityResolver, AuthenticatedUser); `permissions-model.md §4.4/§4.6`; ticket Scope. **Layers**: backend (guard + controller). **Certeza**: confirmed.

### REQ-05 · Endpoints Usuarios CRUD con DTO público + `@RequireCapability`

> **Que cambia**: controller/service nuevos (aditivos) de Usuarios con list/get/create/update/soft-disable, DTO público y guard por capability.
> **Por que**: la administración de usuarios es parte de A6; el `/users` entregado solo lista y expone columnas internas (O-5) — los endpoints nuevos son la superficie correcta.

Los endpoints nuevos de Usuarios MUST devolver un `UserPublicDto` (allowlist: `id`, `email`, `name`, `display_name`, `role`, `status`/`is_active`, timestamps) — NO MUST exponer `b2c_oid`, `identity_provider` ni futura `pass` (S3). MUST aplicar `@RequireCapability` por acción (`config.users:view` en lecturas, `config.users:edit` en create/update, `config.users:delete` en soft-disable, `config.users:assign-roles` si se expone asignación aquí) + `@UseGuards(AuthGuard, CapabilitiesHydrationGuard, CapabilitiesGuard)`. MUST scopear toda query por `workspaceId` del token (no del body) (S1/S4). La baja MUST ser soft-disable (no DELETE físico). DTOs de entrada MUST validar con class-validator (UUIDs en params, campos requeridos). NO MUST reescribir el `UsersService`/`UsersController` entregado — son endpoints/handlers aditivos (puede extender el controller existente con métodos nuevos sin alterar `list()` entregado, o un controller nuevo; ver Artifacts).

<details><summary>Scenarios</summary>

- GIVEN un user con `config.users:view`, WHEN `GET` el listado nuevo, THEN 200 y ningún item trae `b2c_oid`/`identity_provider`.
- GIVEN un user sin `config.users:edit`, WHEN `POST`/`PATCH` usuario, THEN 403.
- GIVEN un `id` que no es UUID en la ruta, WHEN se llama, THEN 400 `{code:'BAD_REQUEST'}`.
</details>

- **source_ref**: `implementation-tasks.md` A6.2; `permissions-model.md §4.4`; ticket Scope; RULE-global-002 (S3/S4). **Layers**: backend (controller/service/dto). **Certeza**: confirmed.

### REQ-06 · Endpoints Roles CRUD + asignación + `@RequireCapability`

> **Que cambia**: módulo de Roles con CRUD, asignación caps↔rol y rol↔user, consulta de caps por rol, todo gateado por capability.
> **Por que**: la UI de Roles/Permisos (JOR-011) administra roles y la matriz; necesita estos endpoints.

Los endpoints de Roles MUST cubrir: listar roles (del workspace + globales), obtener rol con sus caps, crear, actualizar, eliminar (no `is_system`), asignar/quitar capabilities a un rol (`role_capabilities`), asignar/quitar un rol a un user (`user_roles`). MUST aplicar `@RequireCapability` por acción (`config.roles:view`/`:edit`/`:delete`/`:assign-permissions`; la asignación rol↔user usa `config.users:assign-roles`) + el trío de guards. MUST scopear por `workspaceId` (roles del ws + globales visibles, pero crear/editar/borrar SOLO roles del workspace; `is_system`/globales NO editables — 403/409). Las caps asignadas MUST existir en el catálogo (integridad referencial — la FK lo garantiza; validar y responder error de dominio limpio si no). DTOs con class-validator.

<details><summary>Scenarios</summary>

- GIVEN un user con `config.roles:edit`, WHEN crea un rol y le asigna `['config.users:view']`, THEN 200/201 y `GET` del rol devuelve esa cap.
- GIVEN un user del workspace A, WHEN lista roles, THEN ve los roles de A + los globales, NO los de B (cross-tenant, S1).
- GIVEN un user sin `config.roles:edit`, WHEN crea/edita un rol, THEN 403.
- GIVEN el rol `is_system` `internal-admin`, WHEN se intenta editar/borrar, THEN se rechaza (403/409), no se modifica.
</details>

- **source_ref**: `implementation-tasks.md` A6.3; `permissions-model.md §4.3/§7`; ticket Scope. **Layers**: backend (module/controller/service/repo/dto). **Certeza**: confirmed.

## Artifacts

| Artifact | Path (repo) | REQ | Crea/Modifica |
|----------|-------------|-----|---------------|
| Migración RBAC | `backend/jormat-api/migrations/{ts}_rbac_tables.ts` | REQ-01 | crea |
| Seed RBAC | `backend/jormat-api/seeds/03_rbac.ts` | REQ-02 | crea |
| Módulo permissions | `backend/jormat-api/src/permissions/permissions.module.ts` | REQ-03/04 | crea |
| Permissions repo | `backend/jormat-api/src/permissions/permissions.repository.ts` | REQ-03 | crea |
| Permissions service (CapabilityResolver) | `backend/jormat-api/src/permissions/permissions.service.ts` | REQ-03 | crea |
| Hydration guard | `backend/jormat-api/src/permissions/capabilities-hydration.guard.ts` | REQ-04 | crea |
| Capabilities controller | `backend/jormat-api/src/permissions/capabilities.controller.ts` | REQ-04 | crea |
| Roles module/controller/service/repo/dto | `backend/jormat-api/src/permissions/roles.*` (o submódulo `roles/`) | REQ-06 | crea |
| Users endpoints nuevos + DTO público | `backend/jormat-api/src/users/` (aditivo) | REQ-05 | modifica (aditivo) |
| Registro en AppModule | `backend/jormat-api/src/app.module.ts` | REQ-03..06 | modifica (agrega import) |
| Tests | `*.spec.ts` co-locados | REQ-01..06 | crea |
| Docs KB | `jormat_docs/backend/modules/permissions.md`, `data-model/*`, `api/README.md` | todos | crea/actualiza |

## Tasks

> Particionadas en 5 sessions (DET-20). Numeración desde S1 (sin sessions previas registradas en el ticket). Detalle en el ticket `### Plan de sessions`. Cada `S{N}.GATE` corre quality review (DET-23); S2/S3/S4 con reviewer aislado (⚑ fuerte, DET-30 REQ-10).

- **S1.T1** — Migración `{ts}_rbac_tables.ts` (4 tablas + FKs + uniques + índices, up/down). source_ref: REQ-01. rollback: `migrate:rollback`.
- **S1.T2** — Seed `03_rbac.ts` (8 caps A6 + `*` + rol `internal-admin` con `*`, idempotente, no-prod). source_ref: REQ-02. rollback: borrar archivo + `db:reset`.
- **S1.T3** — Verificar `db:reset` (migrate:rollback:all → migrate → seed) verde contra Postgres dev + re-run seed idempotente. source_ref: REQ-01/02.
- **S2.T1** — `PermissionsRepository` (query effectiveCaps scopeada ws+globales) + interfaz. source_ref: REQ-03.
- **S2.T2** — `PermissionsService` implementa `CapabilityResolver.resolve` (unión sin duplicados). source_ref: REQ-03.
- **S2.T3** — `CapabilitiesHydrationGuard` (async, additive, no toca AuthGuard/CapabilitiesGuard). source_ref: REQ-04.
- **S2.T4** — `CapabilitiesController`: `GET /api/capabilities/me` + `GET /api/capabilities` + `PermissionsModule` + registro en AppModule. source_ref: REQ-04.
- **S2.T5** — Tests: unit `effectiveCaps` (simple/wildcard/global/cross-tenant) + Supertest (`/me` shape, 200-con-cap, 403). source_ref: REQ-03/04.
- **S3.T1** — `UserPublicDto` + mapper (allowlist, sin columnas internas). source_ref: REQ-05.
- **S3.T2** — Users endpoints nuevos CRUD (list/get/create/update/soft-disable) + `@RequireCapability` + trío de guards (aditivo, no reescribe `list()` entregado). source_ref: REQ-05.
- **S3.T3** — DTOs de entrada (create/update) class-validator + validación UUID en params. source_ref: REQ-05.
- **S3.T4** — Tests: unit DTO mapper (no expone internas) + Supertest (200/403/400/DTO público). source_ref: REQ-05.
- **S4.T1** — `RolesRepository` + `RolesService` (scope ws+globales; crear/editar/borrar solo ws; `is_system` protegido). source_ref: REQ-06.
- **S4.T2** — `RolesController`: CRUD + assign-caps + assign-role-to-user + caps-by-role + `@RequireCapability`. source_ref: REQ-06.
- **S4.T3** — DTOs class-validator. source_ref: REQ-06.
- **S4.T4** — Tests: Supertest (200/403 por acción + cross-tenant + `is_system` no editable). source_ref: REQ-06.
- **S5.T1** — Suite Jest BE completa verde (unit + integración). source_ref: todos.
- **S5.T2** — Mutation diff (StrykerJS) sobre `effectiveCaps`, DTO mapper, lógica de scope; triage warn-first (survivor crítico → hardening task / backlog must). source_ref: REQ-03/05.
- **S5.T3** — Review exhaustiva (reviewer aislado) + docs KB (`jormat_docs/backend/modules/permissions.md`, `data-model/`, `api/README.md`). source_ref: todos.

## Decisions (cerradas durante design — modo super)

| id | Decision | Alternativa descartada | Reversibilidad |
|----|----------|------------------------|----------------|
| DEC-LOCAL-06 | Hidratación de caps vía `CapabilitiesHydrationGuard` async intermedio | (a) Modificar `CapabilitiesGuard` a async + inyectar resolver → viola "el guard no cambia" (JOR-009 doc) y RULE-003 sobre el contrato. (b) Middleware → corre antes de los guards, `req.user` no existe aún. | Alta — borrar el guard y su registro; nada entregado tocado |
| DEC-LOCAL-07 | `effectiveCaps`: unión en SQL, wildcards resueltos por `can()` en runtime | Expandir wildcards en SQL → duplica la lógica ya testeada del `can()` entregado | Alta — query localizada en el repo |
| DEC-LOCAL-08 | Integration tests sin Postgres (repo/resolver fake via `overrideProvider`); migración/seed verificados con `db:reset` aparte | PG efímero/Testcontainers en jest → infra de Capa C, YAGNI aquí; el precedente JOR-009 (DEC-LOCAL-02) ya probó guard/validación sin DB | Media — si Capa C trae PG de test, los specs se re-apuntan |
| DEC-LOCAL-09 | Endpoints Usuarios nuevos = métodos aditivos (no reescriben `list()` entregado) + DTO público | Reescribir `UsersService`/`UsersController` → viola RULE-003 (código entregado) | Alta — métodos nuevos aislados |

> Las decisiones de modelo de datos (risk_level nullable, is_system, PK en joins) están en `tickets/JOR-010.draft/data-model.md` (aprobado v1).

## Open questions

Ninguna abierta. El modelo de datos está aprobado (draft v1) y `permissions-model.md` está en estado "v1 cerrado (2026-06-10)". Las decisiones de implementación se cerraron en super con racional + reversibilidad.

## NFRs

- **Seguridad (RULE-global-002)**: S1 toda query RBAC scopeada por `workspace_id` (+ globales); S2 endpoints nuevos con `@RequireCapability` + test 403; S3 `/me` y DTO público sin columnas internas ni stack; S4 inputs validados, `workspace_id` del token.
- **Aislamiento (RULE-global-003)**: `AuthGuard`, `/auth/me`, `CapabilitiesGuard`, `can()` entregados NO se tocan; migraciones/seeds entregados NO se tocan. Todo es aditivo.
- **Calidad (RULE-global-001)**: tipado estricto sin `any`; funciones ≤40 líneas; sin código muerto; comentarios en español, código en inglés.
- **Testing**: unit (Jest) para lógica pura (effectiveCaps, mappers); Supertest para HTTP+guard (200/403/400/cross-tenant); mutation diff warn-first sobre el código nuevo crítico.
- **Reversibilidad**: migración con `down`; seed borrable; módulo nuevo aislado; cero footprint en código entregado.

## Backlog

| id | item | priority | estado | destino |
|----|------|----------|--------|---------|
| BL-01 | `filter` en `PaginationQueryDto` (JOR-009) sin `@MaxLength` → un filtro muy largo fuerza un `ILIKE '%<grande>%'` costoso (sin SQLi, Knex parametriza). Preexistente, transversal a todos los listados. | should | resuelto por JOR-152 (2026-08-18) | JOR-012 (seguridad) — aplica a la base de paginación, no solo a Usuarios. `@MaxLength(100)` agregado en `PaginationQueryDto.filter`. |

> BL-01 es `should` (no bloquea cierre — DET-17). Es código de JOR-009 (no entregado-base), transversal; se trata en JOR-012 junto al resto de complementos de seguridad.
| BL-02 | Mutation diff S5: 7 sobrevivientes en `users-admin.service.ts` L16-17 (`SORTABLE_COLUMNS`/`DEFAULT_SORT`, StringLiteral/ArrayDeclaration de bajo valor). El service hace queries Knex reales no ejercitadas por jest (mockeado en el Supertest; scope verificado empírico vs PG). Un test que las mate = DB-backed (`*.e2e-spec.ts`, harness de Capa C inexistente aún). | should | re-rutear: gap de mutation e2e-config, diferido via DEC-019, pendiente ticket dedicado | Capa C (suite e2e con PG) — cuando exista el harness DB de integración. JOR-153 no cerro este item: lo re-registro como su propio backlog #1 (extender config de stryker/e2e con DB efimera) y lo asocio a DEC-019. |

> BL-02 es `should` (no bloquea cierre — DET-31 warn-first + paths críticos de authZ al 100%). Las piezas mutation-críticas (effectiveCaps resolver, mapper público `toUserPublicDto`, hydration guard, los 3 controllers) están al **100% covered-killed**; los sobrevivientes son config de orden de bajo valor, en código de acceso a datos verificado empíricamente.
