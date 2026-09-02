---
id: SPEC-frontend-rbac-admin-views
project: jormat-evolution
ticket: JOR-011
status: done
---

# RBAC frontend (A6): vistas Usuarios + Roles/Permisos + cableado del vector de capabilities real

# RBAC frontend (A6): vistas Usuarios + Roles/Permisos + cableado del vector de capabilities real

## Executive summary — lo que estas aprobando

### 1. Que se quiere
Las dos vistas de administración de cuenta del producto: **Usuarios** (tabla + alta/edición + soft-disable + asignar roles) y **Roles y Permisos** (lista de roles + matriz de toggles por capability + filtros). Y el paso que enciende el RBAC de todo el producto: **conectar el vector de permisos real** (`GET /api/capabilities/me`) al store, de modo que el `<Can>`/`useCan` (hoy en mock `['*']`) empiecen a ocultar/mostrar de verdad.

### 2. Decisiones críticas
| Decisión | Racional (1 línea) |
|----------|--------------------|
| Tipado vía **openapi-typescript** (piloto DEC-002) | El backend ya sirve Swagger en `/api/docs`; generar tipos evita drift FE↔BE y cumple el piloto. Dev confirmó (vs tipar a mano). |
| **Draft saltado** (`skipped`) | Ya existe `prototipo.html` aprobado que cubre ambas vistas en claro/oscuro — no se diseña a ciegas. Dev confirmó. |
| Soft-disable gateado con **`config.users:delete`** | Es lo que **exige el backend** (`users-admin.controller.ts:67`); la doc §4 dice `:edit` (desactualizada → follow-up DET-16). |
| Conexión del vector en **S1** (no al final) | Sin vector real, las vistas no pueden probarse gateadas; es el cimiento del resto. Es ⚑ fuerte: toca el gateo de TODO el nav. |
| Cliente API tipado + **React Query** (no fetch suelto) | Convención del proyecto (`frontend-api-layer.md`): cliente axios centralizado + hooks. |

### 3. Riesgos principales y cómo los mitigamos
- **Desmockear `capabilities: ['*']` rompe el nav** que dependía implícitamente del acceso total → smoke obligatorio del nav con vector real en S1 (gate ⚑ fuerte). Mitigación adicional: el seed dev asigna `internal-admin` (cap `*`) a los admins (JOR-026), así el dev sigue viendo todo.
- **Escalamiento de privilegios** vía `config.roles:assign-permissions` (la cap más sensible: quien la tiene se otorga cualquier otra) → gateo UI estricto en S3 + verificar que el backend revalida (`permissions-by-view.md §8`), no confiar en ocultar.
- **DTO expone campos internos** (`b2c_oid`/`pass`) → el FE muestra solo campos de `UserPublicDto`; el backend ya hace allowlist (S3 backend).

### 4. Que NO se hace
- Backend RBAC (lo entregó JOR-010: tablas, endpoints, guard).
- Lógica MSAL / `AuthGuard` (RULE-global-003 — no se toca).
- Gateo de los módulos de **negocio** (FASE B / Capa C4) — este ticket habilita el vector; las vistas de negocio lo consumirán después.
- Corregir `permissions-by-view.md §4` (soft-disable cap) — follow-up menor post-cierre.

### 5. Tamaño estimado
**4 sessions** (~estimado 2 SP). La más riesgosa: **S1** (cimiento — desmockea el gateo transversal, ⚑ fuerte) y **S3** (matriz de permisos + capability de escalamiento, ⚑ fuerte).

### 6. Cómo vas a saber que funciona
- Un usuario **sin** `config.users:view` que entra a `/config/users` ve la pantalla **403** (e2e Playwright).
- Un **admin de cuenta** ve ambas vistas, crea/edita usuarios, asigna roles y guarda la matriz de un rol.
- El botón "Crear" **desaparece** para quien no tiene `config.users:edit` (no solo se deshabilita).
- `GET /api/capabilities/me` se llama post-login y el store deja de exponer `['*']`.

## Purpose

Construir la capa de administración de cuenta del frontend (vistas Usuarios y Roles/Permisos) para los actores con capabilities `config.*`, y cablear el vector de capabilities efectivas del usuario al estado del cliente, habilitando el gateo real por permisos en todo el producto. Es la pieza que convierte el RBAC backend (JOR-010) en control de acceso observable para el usuario final.

## Requirements

### REQ-01 · Tipado del contrato de admin vía openapi-typescript + cliente API tipado

> **Que cambia**: el front deja de no tener tipos del backend de admin; se generan desde el Swagger y se consumen vía un cliente axios tipado por dominio (`config/users`, `config/roles`, `config/capabilities`), con hooks React Query.
> **Por qué**: sin tipos sincronizados con el backend, los DTOs se escriben a mano y derivan; el piloto DEC-002 quiere generación automática.

El sistema MUST exponer un módulo de tipos generados desde el Swagger del backend (`http://localhost:4000/api/docs` / spec JSON) mediante `openapi-typescript`, y un cliente API tipado por dominio bajo `services/api/config/` que use el cliente axios existente (`/api/proxy`) — NO `fetch` suelto (convención `frontend-api-layer.md`). Las llamadas MUST exponerse como hooks React Query (`useUsers`, `useUser`, `useCreateUser`, `useUpdateUser`, `useDisableUser`, `useRoles`, `useRole`, `useCreateRole`, `useUpdateRole`, `useDeleteRole`, `useSaveRoleCapabilities`, `useAssignRoleToUser`, `useUnassignRoleFromUser`, `useCapabilitiesCatalog`, `useMyCapabilities`). El script de generación MUST quedar en `package.json` (`generate:api-types`) y los tipos generados versionados en `src/types/`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: generación de tipos
- **GIVEN** el backend sirviendo Swagger en `/api/docs`
- **WHEN** se corre `npm run generate:api-types`
- **THEN** se produce `src/types/api.gen.ts` con los DTOs de Users/Roles/Capabilities y `tsc` no reporta errores en los módulos que los consumen.

#### Scenario: cliente sin fetch suelto
- **GIVEN** los módulos `services/api/config/*.ts`
- **WHEN** se inspecciona su implementación
- **THEN** todas las llamadas pasan por el cliente axios centralizado (interceptor de idToken + `X-Admin-Workspace`), sin `fetch(`/`axios.create` ad-hoc.

#### Scenario: error de red tipado
- **GIVEN** un hook React Query de admin
- **WHEN** el backend responde 4xx/5xx
- **THEN** el error se propaga como `ApiError` tipado (no `any`), consumible por la UI.

</details>

**Acceptance**: `npm run generate:api-types` produce tipos; `tsc` limpio; ningún `fetch` suelto ni `any` en `services/api/config/`.

- **source_ref**: `permissions-by-view.md`, `frontend-api-layer.md`, DEC-002 (piloto tipado), decisions_log `typing-strategy`. **Layers**: frontend (services, types). **Certeza**: confirmed.

### REQ-02 · Conectar el vector de capabilities real al auth.store (desmockear `<Can>`/`useCan`)

> **Que cambia**: tras el login, el front llama `GET /api/capabilities/me` y puebla el store con las caps reales; `<Can>`, `useCan` y `<RouteGuard>` dejan de operar sobre el mock `['*']`.
> **Por qué**: hoy `auth.store:33` tiene `capabilities: ['*']` hardcodeado y `setCapabilities` no tiene caller — el gateo no protege nada.

El sistema MUST invocar `GET /api/capabilities/me` cuando hay sesión autenticada (post-login / hidratación del store) y MUST despachar el `{ capabilities: string[] }` recibido a `setCapabilities` del `auth.store`, eliminando el mock `['*']`. El `useCan`/`<Can>`/`<RouteGuard>` (JOR-008) MUST quedar operando con el vector real sin cambios en su firma. Mientras la petición está en vuelo, el sistema MUST evitar el "flash" de UI no autorizada (estado de carga / caps `null` no equivale a `[]`). El `can()` (`lib/can.ts`) MUST seguir resolviendo wildcards (`*`, `config.*`) — no se reimplementa.

<details><summary>Scenarios de validacion</summary>

#### Scenario: caps reales post-login
- **GIVEN** un usuario autenticado con rol que otorga `config.users:view`
- **WHEN** el store se hidrata
- **THEN** `GET /api/capabilities/me` se llama una vez y `useCan('config.users:view')` retorna `true`, `useCan('config.roles:edit')` retorna según su rol.

#### Scenario: sin acceso total por defecto
- **GIVEN** un usuario sin la capability `*`
- **WHEN** el store termina de hidratar
- **THEN** el store NO contiene `['*']`; contiene exactamente las caps efectivas del backend.

#### Scenario: nav no se rompe con vector real
- **GIVEN** un admin con `internal-admin` (cap `*`, seed JOR-026)
- **WHEN** navega el shell con el vector real
- **THEN** ve el mismo nav que antes (no hay regresión de navegación para quien tiene acceso).

</details>

**Acceptance**: el mock `['*']` ya no existe; `GET /api/capabilities/me` se observa en network post-login; smoke del nav OK con vector real.

- **source_ref**: `auth.store.ts:33,72`, `hooks/useCan.ts`, `components/auth/Can/`, `components/auth/RouteGuard/`, SPEC-backend-rbac REQ-04. **Layers**: frontend (store, hooks). **Certeza**: confirmed.

### REQ-03 · Vista Usuarios (`/config/users`) gateada

> **Que cambia**: nueva ruta `/config/users` con tabla de usuarios, alta/edición en form, soft-disable y asignación de roles — cada acción visible solo con su capability.
> **Por qué**: es la vista de gestión de usuarios de la cuenta; hoy no existe ninguna ruta de admin en el app router.

El sistema MUST renderizar en `/config/users` (route group `(app)`) un `DataTable` (JOR-007) con columnas nombre, email, roles asignados y estado activo/inactivo, usando `useUsers`. MUST ofrecer alta y edición de usuario en formulario (RHF + zod) vía `useCreateUser`/`useUpdateUser`, soft-disable vía `useDisableUser`, y asignación de roles vía `useAssignRoleToUser`/`useUnassignRoleFromUser`. La ruta MUST protegerse con `<RouteGuard cap="config.users:view">`. Las acciones MUST gatearse: crear/editar con `<Can cap="config.users:edit">`, asignar roles con `config.users:assign-roles`, soft-disable con `config.users:delete`. El DTO mostrado MUST limitarse a los campos de `UserPublicDto` (sin `b2c_oid`/`identity_provider`/`pass`). Las queries MUST incluir el `workspace_id` del tenant activo (el interceptor existente lo inyecta — no añadir bypass).

<details><summary>Scenarios de validacion</summary>

#### Scenario: acceso gateado
- **GIVEN** un usuario sin `config.users:view`
- **WHEN** navega a `/config/users`
- **THEN** ve `<Forbidden/>` (403), no la tabla.

#### Scenario: acción oculta sin capability
- **GIVEN** un usuario con `config.users:view` pero sin `config.users:edit`
- **WHEN** ve la tabla
- **THEN** el botón "Nuevo usuario" y la acción "Editar" no se renderizan.

#### Scenario: soft-disable
- **GIVEN** un usuario con `config.users:delete`
- **WHEN** desactiva un usuario
- **THEN** se llama `useDisableUser` (PATCH `/config/users/:id/disable`) y la fila refleja estado inactivo (no se borra).

</details>

**Acceptance**: tabla lista usuarios reales; forms validan con zod; acciones gateadas; ningún campo interno visible.

- **source_ref**: `prototipo.html` V.usuarios, `permissions-by-view.md §4`, `users-admin.controller.ts:39-71`, ticket Scope. **Layers**: frontend (app router, components, hooks). **Certeza**: confirmed.

### REQ-04 · Vista Roles y Permisos (`/config/roles`) con matriz de capabilities

> **Que cambia**: nueva ruta `/config/roles` maestro-detalle: lista de roles + matriz de toggles (módulo × feature × acción) con filtros, crear rol y guardar la matriz.
> **Por qué**: es donde se administran los permisos; la matriz se arma desde el catálogo `GET /api/capabilities`.

El sistema MUST renderizar en `/config/roles` un layout maestro-detalle: panel maestro con `useRoles` (lista de roles del workspace + globales) y panel detalle con la matriz de capabilities del rol seleccionado, construida desde `useCapabilitiesCatalog` (cada capability tiene `module`/`feature`/`action`/`risk_level`) cruzada con las caps otorgadas del rol (`useRole`). La matriz MUST permitir toggles por capability, filtros por módulo y por feature (`FilterBar`, JOR-007), botón "Crear rol" (`useCreateRole`) y "Guardar" (`useSaveRoleCapabilities` → `PUT /config/roles/:id/capabilities`). La ruta MUST protegerse con `<RouteGuard cap="config.roles:view">`; "Crear rol" con `config.roles:edit`; editar/guardar la matriz con `config.roles:assign-permissions`. Los roles `is_system`/globales MUST mostrarse no editables (el backend responde 403/409). La capability `*` y las de `risk_level` alto MUST señalizarse visualmente como sensibles.

<details><summary>Scenarios de validacion</summary>

#### Scenario: matriz refleja caps del rol
- **GIVEN** un rol con `['config.users:view']` otorgada
- **WHEN** se selecciona en el maestro
- **THEN** la matriz muestra ese toggle activo y el resto inactivos.

#### Scenario: guardar gateado (escalamiento)
- **GIVEN** un usuario sin `config.roles:assign-permissions`
- **WHEN** ve el detalle de un rol
- **THEN** los toggles están en solo-lectura y "Guardar" no se renderiza (la UI no permite escalar privilegios).

#### Scenario: rol de sistema no editable
- **GIVEN** el rol `internal-admin` (`is_system`, global)
- **WHEN** se selecciona
- **THEN** la matriz se muestra en solo-lectura (no se puede modificar un rol de sistema).

#### Scenario: filtro por módulo
- **GIVEN** la matriz con capabilities de varios módulos
- **WHEN** se filtra por módulo `config`
- **THEN** solo se muestran filas de capabilities `config.*`.

</details>

**Acceptance**: maestro-detalle funcional; matriz arma desde catálogo; toggles gateados por `assign-permissions`; guardar persiste vía `PUT`.

- **source_ref**: `prototipo.html` V.roles, `permissions-by-view.md §5/§8`, `roles.controller.ts:36-102`, SPEC-backend-rbac REQ-06. **Layers**: frontend (app router, components, hooks). **Certeza**: confirmed.

### REQ-05 · Acceso desde el área de cuenta del header

> **Que cambia**: las dos vistas se alcanzan desde el menú de cuenta del header (`#acct-menu`), no como módulo del sidebar de negocio; el grupo "Configuración" del sidebar, si aparece, va gateado.
> **Por qué**: `navigation-and-menus.md §1` + DEC-003 fijan el header como entrada canónica de administración.

El sistema MUST exponer enlaces a `/config/users` y `/config/roles` desde el área de cuenta del header (menú de usuario), y MAY incluir un grupo "Configuración" colapsable en el sidebar, en cuyo caso cada entrada MUST renderizarse gateada (`<Can cap="config.users:view">` / `config.roles:view`). Los enlaces de admin MUST ocultarse para usuarios sin ninguna capability `config.*`.

- **source_ref**: `navigation-and-menus.md §1`, DEC-003, `prototipo.html:234`. **Layers**: frontend (shell). **Certeza**: confirmed.

### REQ-06 · Cobertura de tests + e2e de bloqueo 403

> **Que cambia**: unit/integración (RTL + MSW) de ambas vistas y el gateo, y un e2e Playwright que prueba el bloqueo 403 de ruta y el flujo del admin.
> **Por qué**: la seguridad RBAC necesita prueba observable de que la UI bloquea (y que el backend revalida), no solo que renderiza.

El sistema MUST incluir tests con Vitest + Testing Library + MSW para: render de ambas vistas con datos simulados, gateo de acciones (`<Can>` oculta sin capability), forms con validación zod, y `useCan`/store con vector real vs vacío. MUST incluir e2e Playwright: (a) usuario sin `config.users:view` accede a `/config/users` → pantalla 403; (b) admin de cuenta ve ambas vistas y guarda la matriz de un rol. Los screenshots de Playwright MUST aterrizar en el subdir del ticket (config DKC).

<details><summary>Scenarios de validacion</summary>

#### Scenario: e2e 403
- **GIVEN** un usuario autenticado sin `config.users:view`
- **WHEN** navega directo a `/config/users`
- **THEN** la página muestra 403 (RouteGuard) y no hace fetch del listado.

#### Scenario: gateo de acción en unit
- **GIVEN** la vista Usuarios renderizada con caps `['config.users:view']`
- **WHEN** el test inspecciona el DOM
- **THEN** no existe el botón "Nuevo usuario".

</details>

**Acceptance**: suite verde; e2e 403 PASS; coverage delta de las vistas nuevas reportado.

- **source_ref**: `implementation-tasks.md` A6.8, `permissions-by-view.md §8`, ticket Testing. **Layers**: frontend (tests, e2e). **Certeza**: confirmed.

## Non-functional requirements

| Tipo | Target | Cómo se mide |
|------|--------|--------------|
| Security | El gateo UI nunca es la única frontera: toda acción sensible está cubierta por `@RequireCapability` en el backend (JOR-010) + la UI oculta. `config.roles:assign-permissions` (escalamiento) gateado UI + verificado que backend revalida. DTO sin campos internos. | e2e 403 (REQ-06) + revisión de que cada acción mapea a su capability (`permissions-by-view.md §8`) |

## Artifacts

| Artefacto | Path | source_ref | Acción |
|-----------|------|-----------|--------|
| Tipos generados del Swagger | `front/jormat-front/src/types/api.gen.ts` | REQ-01 | crea |
| Script de generación | `front/jormat-front/package.json` (`generate:api-types`) | REQ-01 | modifica (aditivo) |
| Cliente API Usuarios | `front/jormat-front/src/services/api/config/users.ts` | REQ-01/03 | crea |
| Cliente API Roles | `front/jormat-front/src/services/api/config/roles.ts` | REQ-01/04 | crea |
| Cliente API Capabilities | `front/jormat-front/src/services/api/config/capabilities.ts` | REQ-01/02/04 | crea |
| Hooks React Query | `front/jormat-front/src/hooks/` (useUsers, useRoles, useMyCapabilities, …) | REQ-01..04 | crea |
| Cableado del vector | `front/jormat-front/src/stores/auth.store.ts` | REQ-02 | modifica (aditivo — quita mock, añade fetch caps) |
| Vista Usuarios | `front/jormat-front/src/app/(app)/config/users/page.tsx` + `src/components/config/users/` | REQ-03 | crea |
| Vista Roles/Permisos | `front/jormat-front/src/app/(app)/config/roles/page.tsx` + `src/components/config/roles/` | REQ-04 | crea |
| Enlaces de navegación | shell (header `#acct-menu` + sidebar Config gateado) | REQ-05 | modifica (aditivo) |
| Tests + e2e | `src/components/config/**/*.test.tsx`, `front/jormat-front/e2e/rbac-admin.spec.ts` | REQ-06 | crea |

> **Checklist de calidad por artefacto**: copys/labels de la UI van en i18n del proyecto si existe; si no, documentar como deuda. Cada artefacto tiene consumidor en este sprint (todas las vistas/hooks se usan). La matriz NO usa heurística por nombre de campo — usa `module`/`feature`/`action` explícitos del catálogo (`GET /api/capabilities`).

## Constraints

- **RULE-global-001**: Definition of Done (C1–C6) — separar lógica/hooks/presentación, sin `any`, sin código muerto ni `console.*`.
- **RULE-global-002**: seguridad S1–S4 — `config.roles:assign-permissions` permite escalar privilegios; gatear con cuidado UI + backend; queries scopeadas por `workspace_id`; DTO sin campos internos.
- **RULE-global-003**: NO tocar `AuthGuard`/MSAL entregado. El cableado del vector usa `setCapabilities` + un fetch nuevo, sin alterar el flujo MSAL ni `/auth/me`.
- **DEC-002**: piloto tipado Fase 1 → `openapi-typescript` (confirmado por el dev).
- **DEC-003**: taxonomía de navegación (header canónico para admin).
- **DET-30**: rama de ticket (no develop/master). `execute_scope` declarado en el ticket.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| JOR-010 (SPEC-backend-rbac) | internal | endpoints `/config/users`, `/config/roles`, `/api/capabilities/me`, `/api/capabilities` + guard | DONE — bajo. Verificado en intake-explore (todos existen con `@RequireCapability`) |
| JOR-007 (UI data+layout) | internal | `DataTable`, `FilterBar`, `PageLayout`, `FormField` | DONE — bajo |
| JOR-008 (transversal) | internal | `<Can>`, `useCan`, `<RouteGuard>`, `lib/can.ts` | DONE — bajo |
| `openapi-typescript` | external (npm) | generación de tipos del Swagger | dep nueva (devDep). Si la generación falla, fallback documentado: tipar DTOs a mano para no bloquear |
| Backend levantado en dev | runtime | Swagger en `/api/docs` para generar tipos | medio — requiere `./run.sh dev` + DB migrada/seed; verificar antes de S1 |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Desmockear `['*']` rompe navegación que dependía del acceso total | medium | high | Smoke del nav con vector real en S1 (gate ⚑ fuerte); admin con `internal-admin` (seed JOR-026) sigue viendo todo |
| Gateo UI insuficiente permite intentar escalar privilegios | low | high | Backend revalida con `@RequireCapability` (JOR-010); e2e 403 + revisión por acción |
| `openapi-typescript` no resuelve el Swagger (auth/anidación) | medium | medium | Fallback: tipar DTOs a mano (son pocos); documentar como deuda del piloto |
| Backend dev no levantado al generar tipos | medium | low | Verificar `/api/health` + `/api/docs` como precondición de S1.T1 |

## Open questions

- Ninguna abierta. (AQ-1 tipado y gate de draft resueltos en intake — ver ticket decisions_log.)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Tipado vía openapi-typescript (piloto DEC-002)
- **Contexto**: el front no tiene tipos del backend de admin (H5 partial); DEC-002 fijó openapi-typescript como dirección.
- **Drivers**: evitar drift FE↔BE, cumplir el piloto, Swagger ya disponible.
- **Opción elegida**: instalar+configurar openapi-typescript en S1; generar `src/types/api.gen.ts`.
- **Alternativas**: tipar DTOs a mano (descartada — difiere el piloto y arriesga drift; queda como fallback si la generación falla).
- **Consecuencias**: +1 devDep + script; tipos sincronizados con el backend.
- **Session**: intake (confirmada por el dev) / S1 (implementación).

### DEC-LOCAL-02: Soft-disable gateado con `config.users:delete`
- **Contexto**: doc §4 dice `config.users:edit`, backend exige `config.users:delete`.
- **Drivers**: el gateo UI debe coincidir con el backend (fuente de verdad de authz).
- **Opción elegida**: el FE gatea soft-disable con `config.users:delete`.
- **Alternativas**: seguir la doc (descartada — produciría UI que muestra una acción que el backend rechaza con 403).
- **Consecuencias**: coherencia UI↔backend; follow-up DET-16: corregir `permissions-by-view.md §4`.
- **Session**: intake.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..06 pasan.
- [ ] **Tests**: unit/integración (RTL+MSW) + e2e 403 escritos y verdes.
- [ ] **NFRs**: cada acción sensible mapea a su capability + backend revalida; DTO sin campos internos.
- [ ] **Rules**: RULE-global-001/002/003 respetadas (sin `any`, MSAL intacto, queries scopeadas).
- [ ] **Integration**: el nav no se rompe con el vector real (smoke S1); `<Can>`/`useCan` operan con caps reales.
- [ ] **Docs**: nota de follow-up para `permissions-by-view.md §4` (soft-disable cap).

## Tasks

### Session 1 — Fundación RBAC FE: tipado + cliente API + hooks + cablear vector real [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: [[S1.T2, S1.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Verificar backend dev levantado (`/api/health` + `/api/docs`); instalar+configurar `openapi-typescript` + script `generate:api-types`; generar `src/types/api.gen.ts` | REQ-01 | developer | — | `front/jormat-front/package.json`, `src/types/api.gen.ts` | `npm run generate:api-types` + `tsc` limpio | git revert del commit; quitar devDep | DET-1, DET-2, DET-8 | done | 1 |
| S1.T2 | Cliente API tipado `config/users.ts` + `config/roles.ts` + `config/capabilities.ts` (axios centralizado, sin fetch suelto) | REQ-01 | developer | S1.T1 | `src/services/api/config/{users,roles,capabilities}.ts` | `tsc` + lint (sin `any`, sin fetch suelto) | git revert | DET-2, DET-8, DET-16, RULE-global-001 | done | 1 |
| S1.T3 | Hooks React Query (useUsers/useRoles/useMyCapabilities/…) sobre el cliente | REQ-01 | developer | S1.T1 | `src/hooks/` | `tsc` + unit hook básico | git revert | DET-2, DET-8, RULE-global-001 | done | 1 |
| S1.T4 | Cablear `GET /api/capabilities/me` → `setCapabilities`; quitar mock `['*']`; manejar estado de carga (no flash) | REQ-02 | developer | S1.T2, S1.T3 | `src/stores/auth.store.ts` | unit store (vector real vs vacío) + smoke nav manual | revertir a mock `['*']` (1 línea) | DET-5, DET-8, DET-16, RULE-global-002, RULE-global-003 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T2, ⚑ fuerte): reviewer aislado + smoke del nav con vector real + tsc/lint | REQ-01/02 | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket, spec | gate persistido + quality review 10-dim | — | DET-13, DET-20, DET-23 | done | 1 |

### Session 2 — Vista Usuarios (`/config/users`) [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Ruta `/config/users` + `<RouteGuard cap="config.users:view">` + `PageLayout` + `DataTable` (useUsers) | REQ-03 | developer | S1.GATE | `src/app/(app)/config/users/page.tsx`, `src/components/config/users/` | unit RTL (render + columnas) | git rm de la ruta | DET-2, DET-8, RULE-global-001 | done | 2 |
| S2.T2 | Form alta/edición (RHF+zod) + create/update + soft-disable, acciones gateadas (`<Can>` edit/delete) | REQ-03 | developer | S2.T1 | `src/components/config/users/` | unit RTL (gateo oculta acciones; zod valida) | git revert | DET-5, DET-8, RULE-global-002 | done | 2 |
| S2.T3 | Asignación de roles (selector) vía useAssignRoleToUser/useUnassignRoleFromUser, gateada `config.users:assign-roles` | REQ-03 | developer | S2.T1 | `src/components/config/users/` | unit RTL (asignar/quitar) | git revert | DET-5, DET-8, RULE-global-002 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T2): quality review + coverage delta vista Usuarios | REQ-03 | reviewer | S2.T1, S2.T2, S2.T3 | ticket, spec | gate persistido + vitest --coverage | — | DET-13, DET-20, DET-23 | done | 2 |

### Session 3 — Vista Roles y Permisos + matriz [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S3.T2, S3.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Ruta `/config/roles` + `<RouteGuard cap="config.roles:view">` + layout maestro-detalle (useRoles lista) | REQ-04 | developer | S1.GATE | `src/app/(app)/config/roles/page.tsx`, `src/components/config/roles/` | unit RTL (maestro lista roles) | git rm de la ruta | DET-2, DET-8, RULE-global-001 | done | 3 |
| S3.T2 | Matriz de capabilities desde catálogo (module×feature×action) + toggles + filtros (FilterBar), señalizar caps sensibles (`*`/risk alto) | REQ-04 | developer | S3.T1 | `src/components/config/roles/` | unit RTL (matriz refleja caps; filtro por módulo) | git revert | DET-5, DET-8, RULE-global-001 | done | 3 |
| S3.T3 | Crear rol (`config.roles:edit`) + guardar matriz (`config.roles:assign-permissions`) gateados; roles `is_system`/globales en solo-lectura | REQ-04 | developer | S3.T1 | `src/components/config/roles/` | unit RTL (guardar gateado; sistema no editable) | git revert | DET-5, DET-8, RULE-global-002 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier T3, ⚑ fuerte): reviewer aislado + smoke matriz + verificar gateo escalamiento UI + backend revalida | REQ-04 | reviewer | S3.T1, S3.T2, S3.T3 | ticket, spec | gate persistido + smoke UI + quality review | — | DET-13, DET-20, DET-23 | done | 3 |

### Session 4 — Testing + e2e 403 + navegación + cierre [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Enlaces de navegación: `#acct-menu` del header + grupo "Configuración" del sidebar gateado | REQ-05 | developer | S2.GATE, S3.GATE | shell (header + sidebar) | unit RTL (enlaces ocultos sin caps) | git revert | DET-8, RULE-global-002 | done | 4 |
| S4.T2 | Completar suite unit/integración (RTL+MSW) de ambas vistas + useCan vector real | REQ-06 | developer | S2.GATE, S3.GATE | `src/components/config/**/*.test.tsx` | vitest --coverage verde | git revert | DET-7, DET-13 | done | 4 |
| S4.T3 | E2e Playwright: 403 bloqueo de ruta + flujo admin — DEFERIDA a B7 (sin infra e2e/MSAL-mock; 403 cubierto a nivel integración en S4.T2). DEC-LOCAL-03 | REQ-06 | developer | S4.T1 | `front/jormat-front/e2e/rbac-admin.spec.ts` | playwright e2e PASS | git revert | DET-7, DET-13 | deferred | 4 |
| **S4.GATE** | Gate de cierre Session 4 (tier T3, ⚑ fuerte): reviewer aislado + acceptance checkpoints + coverage + nota follow-up §4 | REQ-06 | reviewer | S4.T1, S4.T2, S4.T3 | ticket, spec | acceptance ejecutado + e2e PASS + quality review | — | DET-13, DET-14, DET-20, DET-23 | done | 4 |

## Technical reference

**Endpoints (backend JOR-010, base `/api`, proxy `/api/proxy`):**
- `GET /api/capabilities/me` → `{ capabilities: string[] }` (autenticado, sin cap).
- `GET /api/capabilities` → catálogo `[{ name, module, feature, action, description, risk_level }]` (cap `config.roles:view`).
- `GET /config/users` (view) · `GET /config/users/:id` (view) · `POST /config/users` (edit) · `PATCH /config/users/:id` (edit) · `PATCH /config/users/:id/disable` (delete).
- `GET /config/roles` (view) · `GET /config/roles/:id` (view) · `POST /config/roles` (edit) · `PATCH /config/roles/:id` (edit) · `DELETE /config/roles/:id` (delete) · `PUT /config/roles/:id/capabilities` (assign-permissions) · `POST|DELETE /config/roles/:roleId/users/:userId` (users:assign-roles).

**`UserPublicDto`** (allowlist): `id`, `email`, `name`, `display_name`, `role`, `status`/`is_active`, timestamps. NO `b2c_oid`/`identity_provider`/`pass`.

**Capabilities A6**: `config.users:{view,edit,delete,assign-roles}`, `config.roles:{view,edit,delete,assign-permissions}`, `*`.

**Wildcards**: `lib/can.ts` resuelve `*` y `config.*` — no reimplementar en el front.
