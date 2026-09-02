---
id: SPEC-backend-foundations
project: jormat-evolution
ticket: JOR-009
status: done
---

# Fundaciones backend (WP-A5): patrón módulo + paginación + ExceptionFilter + CapabilitiesGuard/can() + capa API tipada del front

# Fundaciones backend (WP-A5): patrón módulo + paginación + ExceptionFilter + CapabilitiesGuard/can() + capa API tipada del front

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: Construir la plomería de backend que TODO módulo de negocio (Fases B/C) reutiliza, más la capa API tipada del front. Cinco piezas (WP-A5 · A5.1–A5.5): (A5.1) **patrón de módulo Nest** por dominio (module/controller/service/dto/repo, DI por constructor, repo fino sobre Knex con slot `workspace_id`) — documentado + contrato, sin shippear un módulo de dominio fake; (A5.2) **DTO de paginación/filtros/orden** reutilizable (`class-validator`) + **query builder** que lo traduce a Knex con límites seguros; (A5.3) **ExceptionFilter global** que normaliza toda excepción a `{code,message}` + status, sin stack trace al cliente; (A5.4) función pura **`can()`** con wildcards (alineada al `can()` del front, JOR-008) + **`CapabilitiesGuard`** + decorador **`@RequireCapability`** — la frontera de authZ, con la resolución de caps efectivas como interfaz (la conexión real a DB la cierra JOR-010); (A5.5) **capa API tipada del front** — clase `ApiError`, normalización del cliente axios, `handleApiError`→toast y **hooks base React Query** (`useApiQuery`/`useApiMutation`) que los dominios de Fase B construyen encima.

**Decisiones criticas** (resueltas en modo super con racional — ver Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **No se shippea un módulo de dominio "ejemplo" en `src/`.** El patrón se documenta (spec + `jormat_docs/backend/`) y se demuestra ejecutablemente con un **controller fixture inline** en el integration spec de Supertest | Un módulo fake en producción es dead code (RULE-global-001 C1) y un módulo de dominio real está fuera de alcance (Fase B/C). El fixture cumple la demostración + el test del guard sin contaminar `src/` |
| 2 | **Los integration tests (Supertest) se escriben como `*.spec.ts`** co-locados bajo `src/common/`, booteando una Nest app mínima (guard + ValidationPipe + controller fixture) **sin DB** | `jest.config` ya corre `src/**/*.spec.ts`. El guard y la validación no requieren Postgres → no se crea config jest-e2e separada (YAGNI; la suite e2e con DB llega en Capa C) |
| 3 | **El backend `can()` replica las semánticas de wildcard del `can()` del front** (`*`, `module.*` por `.*`, `module.feature:*` por `:*`) — son paquetes independientes (no cross-import), pero el **formato de capability es un contrato compartido** (DEC-006) | Si front y back divergen en el matching, un usuario vería un botón que el back luego rechaza (o viceversa). Mismo algoritmo, dos runtimes |
| 4 | **`CapabilitiesGuard` lee `req.user.capabilities ?? []`**; hoy el `AuthGuard` entregado NO inyecta ese campo → el guard **deniega** salvo que no haya capability requerida. La resolución de caps efectivas (consulta DB) es **interfaz declarada que JOR-010 implementa** | Respeta RULE-global-003 (no tocar `AuthGuard`). El contrato del guard queda cerrado y testeado; JOR-010 solo enchufa la fuente de caps |
| 5 | **A5.5 NO recrea `can()`/`useCan` ni el `QueryClientProvider`** (ya existen de JOR-008). Entrega solo la capa de transporte tipada: `ApiError` + normalización + base hooks | Evita duplicar lo entregado; A5.5 es transporte (axios→ApiError→RQ), no permisos UI |

**Riesgos principales**:
- **Guard que "pasa" por capability ausente**: si `@RequireCapability` no se aplica, el endpoint queda abierto. Mitigación: el guard es opt-in por decorador (no global); se documenta que cada endpoint de dominio DEBE declararlo (S2 RULE-global-002). Test cubre 403 sin cap y 200 con cap.
- **Builder de paginación con inyección por `sort`/`filter`**: ordenar/filtrar por columnas arbitrarias del input abre SQL injection / fuga de columnas. Mitigación: el builder recibe una **whitelist de columnas ordenables/filtrables** por consumidor; columnas fuera de whitelist se ignoran. Test cubre columna no permitida.
- **ExceptionFilter que filtra de más o de menos**: exponer stack trace (S3) o tragarse el status real. Mitigación: normaliza `HttpException` preservando status, `Error` genérico → 500 `{code:'INTERNAL_ERROR'}`, nunca incluye `stack`. Test cubre los tres caminos.

**Que NO se hace** (fuera de alcance — Fase B/C o tickets vecinos):
- Modelo RBAC de negocio (tablas capabilities/roles, resolución real de `effectiveCaps`) → **JOR-010**.
- Registro de helmet/throttler en el bootstrap → **JOR-012** (este ticket deja documentado el punto de enganche).
- Cualquier módulo de dominio real (items, ventas, compras) → Fases B/C.
- `AuthGuard` entregado y `/auth/me` (RULE-global-003 — no se tocan).
- Módulos de dominio del front (`itemsApi`, `useItems`, …) → Fase B (este ticket entrega la BASE genérica).

## Purpose

**Actor**: el equipo de desarrollo (consumidor interno de la infraestructura).
**Valor**: cada módulo de negocio posterior se construye sobre un patrón uniforme, un contrato de error consistente, una paginación segura y una frontera de authZ común — calidad pareja sin reinventar plomería por feature.
**Desbloquea**: JOR-010 (RBAC backend — usa guard + patrón módulo), JOR-012 (seguridad — helmet/throttler en el bootstrap), y toda la Fase B (endpoints de dominio + sus hooks RQ).

## Requirements

### REQ-01 · Patrón de módulo Nest + repo por dominio (contrato)

> **Que cambia**: se fija (documenta + contrata) el patrón module/controller/service/dto/repo con DI por constructor y un repo fino sobre Knex que deja el slot `workspace_id` en cada query.
> **Por que**: sin un patrón único, cada módulo de Fase B improvisaría acceso a datos y validación → deuda y aislamiento de tenant inconsistente (DEC-001).

El patrón MUST quedar documentado en `jormat_docs/backend/` y expresado como **contrato verificable**: una interface `Repository<T>` (o equivalente por dominio) que los repos implementan, inyectada por constructor en el service; el controller no contiene lógica (solo mapea ruta→service); el service depende del repo por interfaz (testeable con mock). El repo MUST exponer en su contrato el parámetro `workspaceId` para toda query de datos de tenant (S1 RULE-global-002 / DEC-001), aunque en este ticket no haya queries de negocio.

- **Actor**: developer de Fase B. **Layers**: backend (documentación + contrato TS).
- **Acceptance**: existe la interface de repo + un service de referencia con repo **mockeado** en su unit test (demuestra la testabilidad del patrón); doc en `jormat_docs/backend/` describe el patrón con el slot `workspace_id`.

<details><summary>Scenarios</summary>

| Given | When | Then |
|-------|------|------|
| Un service de referencia con repo inyectado por interfaz | El unit test mockea el repo | El service se testea sin DB ni Knex real |
| El contrato del repo | Un dev de Fase B lo implementa | La query incluye `workspaceId` (slot documentado) |

</details>

### REQ-02 · DTO de paginación/filtros/orden + query builder

> **Que cambia**: un `PaginationQueryDto` reutilizable (validado con class-validator) y un builder puro que lo traduce a `.limit().offset().orderBy()` de Knex con whitelist de columnas.
> **Por que**: toda lista de Fase B pagina/filtra/ordena igual; centralizarlo evita validación dispar y cierra el vector de inyección por `sort`/`filter`.

El DTO MUST validar `page` (≥1, default 1), `limit` (1–100, default 20), `sort` (string opcional `campo:asc|desc`) y `filter` (opcional). El builder MUST aplicar `limit`/`offset` calculados, ordenar **solo** por columnas en una whitelist provista por el consumidor (columna fuera de whitelist → se ignora, no error 500), y devolver además la metadata de paginación (`page`, `limit`, `total?`). Sin `any` (RULE-global-001 C2).

- **Actor**: cualquier endpoint de listado. **Layers**: backend (`src/common/dto/` + `src/common/pagination/`).
- **Acceptance**: DTO rechaza `limit=999` y `page=0` vía ValidationPipe; builder con whitelist `['name','created_at']` ordena por `name:desc` y **ignora** `sort=secret_col:asc`; defaults aplicados cuando faltan params.

<details><summary>Scenarios</summary>

| Given | When | Then |
|-------|------|------|
| `?page=0&limit=999` | ValidationPipe corre | 400 `{code,message}` (page≥1, limit≤100) |
| Sin query params | builder corre | limit=20, offset=0, orden default |
| `sort=secret_col:asc`, whitelist sin `secret_col` | builder corre | orden default (columna ignorada, sin error) |
| `sort=name:desc`, whitelist con `name` | builder corre | `.orderBy('name','desc')` |

</details>

### REQ-03 · ExceptionFilter global `{code,message}`

> **Que cambia**: un `@Catch()` global que normaliza toda excepción a `{code,message}` + status HTTP, sin stack trace en la respuesta.
> **Por que**: el front (REQ-05 `ApiError`) y todo consumidor esperan un shape único; exponer stacks es fuga de información (S3 RULE-global-002).

El filter MUST: mapear `HttpException` preservando su `status` y derivando `code` (ej. `NOT_FOUND`, `FORBIDDEN`, `BAD_REQUEST`) + `message`; mapear cualquier `Error` no-HTTP a `500` `{code:'INTERNAL_ERROR', message:'Internal server error'}` (mensaje genérico, **sin** detalle interno ni `stack`); preservar el array de mensajes de validación de `ValidationPipe` como `message` legible. Registrado global en `main.ts` (aditivo — RULE-global-003).

- **Actor**: todo cliente HTTP. **Layers**: backend (`src/common/filters/` + registro en `main.ts`).
- **Acceptance**: `NotFoundException` → 404 `{code:'NOT_FOUND', message}`; `throw new Error('boom')` → 500 `{code:'INTERNAL_ERROR'}` sin `boom` ni `stack`; respuesta nunca contiene la clave `stack`.

<details><summary>Scenarios</summary>

| Given | When | Then |
|-------|------|------|
| Controller lanza `NotFoundException` | filter corre | 404 body `{code:'NOT_FOUND', message}` |
| Controller lanza `Error('boom')` | filter corre | 500 `{code:'INTERNAL_ERROR'}`, sin `boom`/`stack` |
| ValidationPipe rechaza DTO | filter corre | 400 `{code:'BAD_REQUEST', message}` con detalle de campos |

</details>

### REQ-04 · `can()` + `CapabilitiesGuard` + `@RequireCapability`

> **Que cambia**: función pura `can(userCaps, required)` con wildcards (misma semántica que el front), decorador `@RequireCapability(...caps)` y `CapabilitiesGuard` que los une.
> **Por que**: es la frontera de authZ del backend (S2 RULE-global-002); el front (JOR-008) solo gatea UI — el back revalida cada acción.

`can()` MUST soportar: `*` (acceso total), coincidencia exacta, `module.feature:*` (wildcard de acción por `:*`), `module.*` (wildcard de módulo por `.*`) — **idéntico** a `front/jormat-front/src/lib/can.ts` (DEC-006, contrato compartido). El decorador `@RequireCapability(...caps: string[])` MUST setear metadata. El guard MUST: leer la metadata (handler + class), permitir si no hay caps requeridas, y denegar con `ForbiddenException` (→ 403 vía REQ-03) si `req.user.capabilities ?? []` no satisface **todas** las requeridas vía `can()`. La resolución de `effectiveCaps` desde DB queda como **interfaz documentada** (JOR-010 la implementa); hoy lee el campo del `req.user` que el `AuthGuard` deja (ausente → vector vacío → deniega).

- **Actor**: endpoints protegidos (Fase B). **Layers**: backend (`src/common/auth/` o `src/auth/capabilities/`).
- **Acceptance**: `can(['sales.*'],'sales.documents:view')` → true; `can(['sales.documents:*'],'sales.documents:edit')` → true; `can([],'x:y')` → false; `can(['*'],'cualquier:cosa')` → true; guard concede 200 con cap suficiente, deniega 403 sin cap (Supertest, REQ del fixture).

<details><summary>Scenarios</summary>

| Given | When | Then |
|-------|------|------|
| `userCaps=['*']`, required `'items:edit'` | `can()` | true |
| `userCaps=['sales.*']`, required `'sales.documents:view'` | `can()` | true |
| `userCaps=['sales.documents:*']`, required `'sales.documents:edit'` | `can()` | true |
| `userCaps=[]`, required `'items:view'` | `can()` | false |
| Endpoint `@RequireCapability('items:view')`, `req.user.capabilities=['items:view']` | guard | 200 |
| Mismo endpoint, `req.user` sin `capabilities` | guard | 403 `{code:'FORBIDDEN'}` |

</details>

### REQ-05 · Capa API tipada del front: ApiError + normalización + base hooks RQ

> **Que cambia**: clase `ApiError`, normalización de errores axios → `ApiError` en el cliente, `handleApiError`→toast y hooks base `useApiQuery`/`useApiMutation` sobre los que los dominios de Fase B construyen.
> **Por que**: que ningún componente vea un `AxiosError` crudo; el shape `{code,message,status,fields?}` del back (REQ-03) llega tipado y los hooks de dominio no repiten boilerplate de RQ.

`ApiError` MUST extender `Error` con `code: string`, `status: number`, `fields?: Record<string,string>` + guard `isApiError(e)`. El interceptor de respuesta de `src/services/api.ts` MUST mapear cualquier error con `error.response` al `ApiError` correspondiente (preservando el 401→redirect MSAL ya existente). `handleApiError(e)` MUST mostrar `toast.error(message)` (sonner, ya montado). `useApiQuery`/`useApiMutation` MUST ser wrappers tipados de `useQuery`/`useMutation` que tipan el error como `ApiError`. **No** se crean módulos de dominio (`itemsApi`) ni se recrea `can()`/`useCan`/`QueryClientProvider` (existen de JOR-008).

- **Actor**: componentes/hooks de dominio de Fase B. **Layers**: frontend (`src/services/api.ts`, `src/lib/api/`, `src/hooks/`).
- **Acceptance**: ante 404 `{code:'NOT_FOUND'}` el interceptor lanza `ApiError` con `code/status` correctos (MSW); `useApiQuery` expone `isLoading`→`data` en éxito y `error instanceof ApiError` en fallo (MSW + renderHook); el 401 sigue gatillando el redirect MSAL existente.

<details><summary>Scenarios</summary>

| Given | When | Then |
|-------|------|------|
| MSW responde 404 `{code:'NOT_FOUND',message}` | request del cliente | rechaza con `ApiError` (`code='NOT_FOUND'`, `status=404`) |
| MSW responde 500 sin body | request | `ApiError` (`code='INTERNAL_ERROR'`/fallback, `status=500`) |
| `useApiQuery` con MSW 200 | render hook | `isLoading`→`false`, `data` poblada |
| `useApiQuery` con MSW 4xx | render hook | `error instanceof ApiError` |

</details>

## Non-functional requirements

- **NFR-1 (tipado)**: cero `any` en artefactos nuevos; `tsc` (back `tsconfig.json` strict, front `tsconfig`) limpio (RULE-global-001 C2).
- **NFR-2 (seguridad)**: ExceptionFilter nunca expone `stack`; guard deniega por defecto sin caps; builder no ordena/filtra por columnas fuera de whitelist (S2/S3/S4 RULE-global-002).
- **NFR-3 (testing)**: unit Jest (`can`, guard, filter, builder, service de referencia con repo mock), integración Supertest (guard 200/403, ValidationPipe reject), Vitest+MSW (ApiError, base hooks). Mutation StrykerJS warn-first sobre el diff, foco en `can()` y `ExceptionFilter` (DET-31).
- **NFR-4 (mantenibilidad)**: barrels por carpeta común; un solo lugar para cada utilidad; comentarios en español, código en inglés (RULE-global-001 C5).

## Artifacts

### Backend (`backend/jormat-api/src/`)
- `common/dto/pagination-query.dto.ts` — `PaginationQueryDto` (class-validator). **Source**: A5.2, DEC-004.
- `common/pagination/paginate.ts` — query builder puro (Knex) + tipo `PaginatedResult<T>`. **Source**: A5.2.
- `common/filters/all-exceptions.filter.ts` — ExceptionFilter global. **Source**: A5.3.
- `common/auth/can.ts` — función pura `can()`. **Source**: A5.4, DEC-006.
- `common/auth/require-capability.decorator.ts` — `@RequireCapability`. **Source**: A5.4.
- `common/auth/capabilities.guard.ts` — `CapabilitiesGuard` (+ interfaz `CapabilityResolver` documentada para JOR-010). **Source**: A5.4.
- `common/repository.ts` — interface `Repository`/contrato + tipo de query con `workspaceId`. **Source**: A5.1, DEC-001.
- `common/index.ts` — barrel.
- `main.ts` — **editar** (aditivo): registrar `app.useGlobalFilters(new AllExceptionsFilter())`. **Source**: A5.3.
- Specs: `common/auth/can.spec.ts`, `capabilities.guard.spec.ts`, `common/filters/all-exceptions.filter.spec.ts`, `common/pagination/paginate.spec.ts`, `common/*.integration.spec.ts` (Supertest, fixture inline).

### Frontend (`front/jormat-front/src/`)
- `lib/api/api-error.ts` — `ApiError` + `isApiError`. **Source**: A5.5, frontend-api-layer.md §4.
- `lib/api/handle-error.ts` — `handleApiError`→toast. **Source**: A5.5.
- `lib/api/use-api-query.ts` — `useApiQuery`/`useApiMutation` tipados con `ApiError`. **Source**: A5.5, §6.
- `lib/api/index.ts` — barrel.
- `services/api.ts` — **editar** (aditivo): interceptor de respuesta normaliza axios→`ApiError` (preservando 401 MSAL). **Source**: A5.5.
- Tests: `lib/api/api-error.test.ts`, `lib/api/use-api-query.test.ts` (MSW), handlers MSW en `src/test/msw/handlers.ts` (extender).

### Docs (`jormat_docs/`)
- `backend/README.md` o `backend/foundations.md` — patrón módulo + common/ + contrato de error + guard. **Source**: REQ-01..04.
- `frontend/api-client.md` — actualizar con `ApiError` + base hooks. **Source**: REQ-05.

## Tasks

### Session 1 — Patrón módulo + paginación + builder [tipo: auto] [tier: T2]
- **S1.T1** — `PaginationQueryDto` con class-validator (page/limit/sort/filter, rangos+defaults). *Rollback*: borrar archivo.
- **S1.T2** — builder `paginate()` (Knex limit/offset/orderBy + whitelist + `PaginatedResult<T>`) + unit (defaults, límites, whitelist, columna ignorada). *Rollback*: borrar archivos.
- **S1.T3** — `common/repository.ts` (interface + slot workspaceId) + service de referencia con repo mock en su spec + doc patrón. *Rollback*: borrar archivos + revertir doc.
- **S1.GATE** — quality review light + commits granulares + validación T2.

### Session 2 — ExceptionFilter + can() + guard + Supertest [tipo: ⚑ fuerte] [tier: T3]
- **S2.T1** — `AllExceptionsFilter` + registro en `main.ts` + unit (HttpException/Error/validación, sin stack). *Rollback*: borrar filter + revertir `main.ts`.
- **S2.T2** — `can()` (wildcards alineados al front) + unit exhaustivo (exacto, `*`, `module.*`, `module.feature:*`, vector vacío). *Rollback*: borrar archivos.
- **S2.T3** — `@RequireCapability` + `CapabilitiesGuard` (+ interfaz `CapabilityResolver` para JOR-010) + unit (concede/deniega con Reflector + request mock). *Rollback*: borrar archivos.
- **S2.T4** — integration spec Supertest (fixture inline: controller `@RequireCapability` → 200/403; DTO inválido → 400 `{code,message}`). *Rollback*: borrar spec.
- **S2.GATE** — quality review **standard/exhaustive** + **reviewer aislado** (DET-30) + commits + validación T3.

### Session 3 — Frontend capa API tipada [tipo: auto] [tier: T2]
- **S3.T1** — `ApiError` + `isApiError` + unit. *Rollback*: borrar archivos.
- **S3.T2** — interceptor de respuesta normaliza axios→`ApiError` en `services/api.ts` (preserva 401 MSAL) + test MSW (4xx/5xx→ApiError). *Rollback*: revertir interceptor.
- **S3.T3** — `handleApiError`→toast + test. *Rollback*: borrar archivo.
- **S3.T4** — `useApiQuery`/`useApiMutation` + test MSW (loading/success/error) + handlers MSW. *Rollback*: borrar archivos + revertir handlers.
- **S3.GATE** — quality review light + commits + validación T2.

### Session 4 — Cierre WP: suite + mutation + review + docs [tipo: auto] [tier: T3]
- **S4.T1** — suite completa: `npm test` backend (Jest) verde + `vitest run` front (jsdom) verde. *Rollback*: n/a (solo corrida).
- **S4.T2** — mutation diff (`dkc-mutate`) backend foco `can()`/`ExceptionFilter` + front; triage survivors (crítico→hardening task; light→backlog must). *Rollback*: n/a.
- **S4.T3** — review exhaustiva 10 dimensiones + docs `jormat_docs/backend/` + `frontend/api-client.md` + commits docs aparte. *Rollback*: revertir docs.
- **S4.GATE** — validación T3 + cierre del WP (backlog must vacío) → habilita request-close.

## Technical reference

- `can()` front (a replicar): `front/jormat-front/src/lib/can.ts` — wildcard por `endsWith(':*')` y `endsWith('.*')`.
- `req.user` shape (AuthGuard entregado): `{userId, oid, email, name, role, workspaceId}` — **sin** `capabilities` (lo agrega JOR-010). Ver `backend/jormat-api/src/auth/auth.guard.ts:74`.
- Bootstrap: `backend/jormat-api/src/main.ts` (ValidationPipe ya global; agregar `useGlobalFilters`).
- Módulo ejemplo del patrón actual (Knex crudo, a evolucionar a repo): `src/users/`, `src/workspaces/`.
- Cliente axios front: `src/services/api.ts` (interceptores idToken + 401→redirect; agregar normalización ApiError).
- Test infra: backend `jest.config.ts` (rootDir src, `*.spec.ts`); front `vitest.config.ts` (proyecto jsdom + setup `src/test/setup.ts`, MSW en `src/test/msw/`).

## Constraints

- RULE-global-003: no tocar `auth.guard.ts`, `auth.service.ts`, `/auth/me` ni migraciones/seeds entregadas. Todo aditivo.
- DEC-004: validación con class-validator (no nestjs-zod en v1).
- DEC-006: capability `module.feature:action`, guard de strings, sin CASL.
- DEC-001: repos dejan slot `workspace_id` (S1).
- RULE-global-001: ≤40 líneas/fn, ≤400/archivo, sin `any`, sin `console.*` (logger Nest), sin dead code.

## Dependencies

- **Requiere**: JOR-002 (Jest/Supertest/Stryker BE + Vitest/MSW/Stryker FE + estructura). ✅ verificado en intake (package.json ambos workspaces).
- **Habilita**: JOR-010 (RBAC — implementa `CapabilityResolver` + tablas), JOR-012 (helmet/throttler en bootstrap), Fase B/C.

## Risks and mitigations

| Riesgo | Mitigación |
|--------|-----------|
| Endpoint de Fase B olvida `@RequireCapability` → queda abierto | Guard opt-in documentado como obligatorio (S2); checklist en doc del patrón; review de cada endpoint nuevo |
| Inyección/fuga por `sort`/`filter` arbitrario | Whitelist de columnas por consumidor en el builder; test de columna no permitida |
| ExceptionFilter expone stack o traga status | Test de los 3 caminos (HttpException/Error/validación) + assertion de ausencia de `stack` |
| Divergencia `can()` front/back | Mismo algoritmo replicado + tests con los mismos casos; doc del contrato compartido |

## Backlog

| id | item | priority | status | source |
|----|------|----------|--------|--------|
| BL-01 | `CapabilityResolver` real (consulta DB de caps efectivas) | must (de JOR-010, no de este ticket) | deferred | A5.4 — fuera de alcance |
| BL-02 | Registrar helmet + throttler en bootstrap | must (de JOR-012) | deferred | A5 warnings |

> BL-01/BL-02 son `deferred` porque pertenecen a JOR-010/JOR-012 (no bloquean el cierre de JOR-009 — su alcance es la interfaz/punto de enganche, ya entregado).

## Open questions

Ninguna abierta. Las decisiones de diseño se cerraron en modo super (ver Decisions).

## Decisions (cerradas durante design — modo super)

| id | choice | racional |
|----|--------|----------|
| DEC-LOCAL-01 | No shippear módulo de dominio fake; patrón documentado + fixture inline en Supertest | Dead code (C1) + módulo de dominio fuera de alcance |
| DEC-LOCAL-02 | Supertest como `*.spec.ts` bajo `src/common/`, sin DB, sin config jest-e2e | jest ya corre `src/**/*.spec.ts`; guard/validación no requieren Postgres; YAGNI |
| DEC-LOCAL-03 | Backend `can()` replica semánticas del front; no cross-import | Paquetes independientes; formato de capability es contrato compartido (DEC-006) |
| DEC-LOCAL-04 | `CapabilitiesGuard` lee `req.user.capabilities ?? []`; `CapabilityResolver` como interfaz para JOR-010 | RULE-global-003 (no tocar AuthGuard); contrato cerrado y testeado hoy |
| DEC-LOCAL-05 | A5.5 entrega base genérica (ApiError + base hooks), no módulos de dominio ni `can`/provider | Esos existen (JOR-008) o son Fase B |

## Acceptance checkpoints

- [ ] **AC-1**: `npm test` backend verde — unit de `can()`, `CapabilitiesGuard`, `AllExceptionsFilter`, `paginate()`, service de referencia (repo mock); integración Supertest (200/403, DTO inválido→400).
- [ ] **AC-2**: `vitest run` (jsdom) front verde — `ApiError` shape en 4xx/5xx (MSW), `useApiQuery` loading/success/error (MSW).
- [ ] **AC-3**: lint + `tsc` limpios en ambos workspaces; sin `any`; sin `console.*`; sin squiggles de editor.
- [ ] **AC-4**: ExceptionFilter registrado en `main.ts`; respuesta de error nunca incluye `stack`.
- [ ] **AC-5**: mutation diff corrida; survivors triados (crítico→hardening en gate; light→backlog must); RBAC `can()`/filter sin survivors críticos.
- [ ] **AC-6**: docs `jormat_docs/backend/` + `frontend/api-client.md` actualizadas; `AuthGuard`/`/auth/me`/migraciones intactos (RULE-global-003).
