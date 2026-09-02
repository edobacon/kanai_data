---
id: SPEC-auth-users-unified-rbac-role
project: jormat-evolution
ticket: JOR-095
status: draft
---

# Modelo de rol de usuario unificado en RBAC (A2)

# Modelo de rol de usuario unificado en RBAC (A2)

## Executive summary — lo que estas aprobando

**Que se quiere**: hoy el form de usuario expone un `<Select>` de 3 valores estructurales
(owner/member/internal-admin) etiquetado como "Rol", que se confunde con los roles RBAC reales
(los que portan permisos). Este spec unifica el modelo en un solo eje: el usuario se asigna a roles
del catalogo RBAC (los que tienen capabilities), y `internal-admin` deja de leerse del enum para
derivarse del **rol de sistema global RBAC**. Al final, "rol" significa una sola cosa en toda la app.

**Decisiones criticas**:

| Decision | Eleccion | Ref |
|----------|----------|-----|
| Modelo de rol | Unificar en RBAC (A2): `AuthGuard.isAdmin` deriva del rol de sistema global; enum deprecado en su lugar | [[DEC-016]] |
| Excepcion a regla | Modificar `auth.guard.ts` (base entregada) es excepcion consciente a [[RULE-global-003]]; reportar O-7 al dueño | [[DEC-016]] |
| Institucion / Grupos | n/a — cubiertos por workspace + Roles RBAC (sin codigo) | [[DEC-017]] |
| Asignacion de roles | Reusar `UserRolesModal` existente (catalogo RBAC + badge "Sistema"); no UI nueva | intake |

---

## Purpose

Unificar los dos conceptos de rol (enum estructural `users.role` vs catalogo RBAC) en un solo eje
RBAC, para el admin de `config/usuarios` y de plataforma. Cierra O-7 (rol duplicado) en la fuente,
alinea el form de usuario al modelo real usuario -> roles -> permisos, y elimina la confusion de
exponer 3 valores estructurales como si fueran los roles del usuario. Valor: un modelo mental unico,
administrable desde el catalogo RBAC que ya existe.

## Requirements

### REQ-01: AuthGuard deriva `isAdmin` del rol de sistema global RBAC

> **Que cambia**: el `AuthGuard` deja de decidir el privilegio de plataforma leyendo el enum
> `users.role === 'internal-admin'` y pasa a derivarlo de si el usuario tiene el rol de sistema
> global RBAC `internal-admin` (`roles.is_system=true`, `workspace_id IS NULL`).
> **Por que**: es el nucleo de la unificacion — un solo eje de rol; cierra O-7 en la fuente.

El sistema MUST calcular `isAdmin` en `AuthGuard` a partir del rol de sistema global RBAC del
usuario, resuelto **dentro del `resolveUser` existente (solo en cache-miss)** y almacenado en el
mismo `userCache` (5 min por `oid`), de modo que NO se agregue I/O por request. La forma de
`req.user` MUST permanecer sin cambios (`req.user.role` sigue quedando `'internal-admin'` cuando
`isAdmin`), y el `InternalAdminGuard` MUST seguir funcionando sin modificacion. La via
`x-admin-token` (`tokenIsAdmin`) se preserva tal cual.

<details><summary>Scenarios de validacion</summary>

#### Scenario: admin via rol RBAC global (exitoso)
GIVEN un usuario con `users.role = 'member'` que tiene asignado el rol de sistema global
`internal-admin`
WHEN presenta un idToken valido con header `x-admin-workspace: {otro-ws}`
THEN `isAdmin` es true, `req.user.role = 'internal-admin'` y `req.user.workspaceId = {otro-ws}`.

#### Scenario: usuario sin rol global (no admin)
GIVEN un usuario sin el rol de sistema global (cualquier `users.role`)
WHEN presenta idToken valido con header `x-admin-workspace: {otro-ws}`
THEN `isAdmin` es false y `req.user.workspaceId = {su propio workspace}` (override ignorado).

#### Scenario: cache (edge)
GIVEN un usuario ya resuelto y cacheado
WHEN llega un segundo request dentro de la TTL
THEN NO se ejecuta consulta de roles adicional (el flag admin-global vino del cache-miss previo).

</details>

#### Acceptance
Un usuario con el rol RBAC global `internal-admin` puede operar cross-tenant sin tener el enum
`users.role = 'internal-admin'`; uno sin ese rol RBAC no puede, aunque el header este presente.

### REQ-02: UserFormModal no expone el Select de rol estructural

> **Que cambia**: se quita el campo `<Select>` de 3 valores (`role`) del form de alta/edicion de
> usuario. El alta queda email + name + display_name.
> **Por que**: ese campo era el eje estructural disfrazado de "Rol"; su presencia es la confusion
> que origino el ticket.

El form (`UserFormModal`) MUST NOT renderizar el `<Select>` de `VALID_USER_ROLES`. El submit de
creacion MUST dejar de enviar `role` (el backend ya default a `'member'` en
`users-admin.service.ts:91`). La edicion MUST NOT permitir cambiar el rol estructural desde este
form. El schema zod MUST remover el campo `role`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: alta sin campo rol (exitoso)
GIVEN el modal en modo crear
WHEN el admin completa email + name y guarda
THEN se crea el usuario (backend default `role='member'`) sin que el admin haya elegido un rol estructural.

#### Scenario: edicion (exitoso)
GIVEN el modal en modo editar
WHEN el admin cambia name/display_name
THEN se persisten esos campos y el rol estructural no aparece ni se altera.

</details>

#### Acceptance
El form de alta/edicion no muestra el selector de owner/member/internal-admin; el alta funciona con
solo los datos de identidad.

### REQ-03: Asignacion de roles via catalogo RBAC (reuso)

> **Que cambia**: la asignacion de roles del usuario queda unicamente por el catalogo RBAC
> (`UserRolesModal`), que ya lista todos los roles y badgea los de sistema.
> **Por que**: es el modelo pedido (usuario -> roles del catalogo -> permisos) y el componente ya existe.

La UI MUST ofrecer la asignacion de roles del usuario mediante el catalogo RBAC completo
(`UserRolesModal`), con los roles de sistema marcados (badge "Sistema"), como via unica. NO se crea
UI nueva. El wiring desde la vista de usuarios MUST estar presente (accion "Roles" por fila).

<details><summary>Scenarios de validacion</summary>

#### Scenario: asignar rol de sistema (exitoso)
GIVEN un usuario y el catalogo con el rol global `internal-admin` badgeado "Sistema"
WHEN el admin lo asigna
THEN el usuario obtiene el rol; por REQ-01 pasa a operar como admin de plataforma.

</details>

#### Acceptance
Desde la vista de usuarios se pueden asignar/quitar todos los roles del catalogo, con los de sistema
identificados, sin pasar por el enum estructural.

### REQ-04: Alinear limite de `name` en el front a 120

> **Que cambia**: el schema zod del front agrega `.max(120)` a `name` (y `display_name`), paridad con backend.
> **Por que**: hoy el front no tiene tope y el backend corta en 120 (`@MaxLength(120)`); un name >120
> pasaria la validacion del front y fallaria en el backend.

El schema zod de `UserFormModal` MUST validar `name` y `display_name` con `.max(120)` y mostrar
error de longitud antes de enviar.

<details><summary>Scenarios de validacion</summary>

#### Scenario: name largo (error)
GIVEN el modal
WHEN el admin escribe un name de 121 caracteres
THEN el form muestra error de longitud y no envia.

</details>

#### Acceptance
Front y backend rechazan el mismo umbral (120) con mensaje claro en el front.

## Non-functional requirements

**Security** (RULE-global-002): REQ-01 toca la ruta de autorizacion de plataforma. La derivacion de
admin desde RBAC MUST no ampliar el privilegio (un no-admin nunca debe pasar a admin) y MUST
verificarse con tests de integracion contra BD real (no mocks — un mock del query de roles
consagraria un bug de runtime en el punto mas sensible). Sin exposicion de columnas internas.

## Artifacts

### Backend

- `auth.guard.ts` (base entregada — modificacion quirurgica, excepcion RULE-global-003):
  - En `resolveUser` (cache-miss): consulta `user_roles ur JOIN roles r ON r.id=ur.role_id` WHERE
    `ur.user_id = user.id AND r.workspace_id IS NULL AND r.name = 'internal-admin'` (o `is_system`
    + id conocido). Setear `user.is_global_admin` en el objeto cacheado.
  - `const isAdmin = user.is_global_admin || tokenIsAdmin;` (reemplaza `user.role === 'internal-admin'`).
- `internal-admin.guard.ts`: sin cambios (lee `req.user.role`, que sigue correcto).
- Schema/migraciones/seeds: sin cambios. Columna `users.role` queda deprecada en su lugar.

### Frontend

- `UserFormModal/UserFormModal.tsx`: remover `<Select>` de rol + `ROLE_LABELS` + campo `role` del
  `userFormSchema`; agregar `.max(120)` a `name`/`display_name`.
- `UsersView/UsersView.tsx`: dejar de pasar `role` en create/update; conservar wiring de `UserRolesModal`.
- `services/api/config/users.ts` + `types/rbac.ts`: `role` opcional/removido de `CreateUserInput`/`UpdateUserInput` del lado front (el DTO backend lo mantiene opcional).
- `UserRolesModal`: sin cambios (reuso).

## Tasks

### Session 1 — Backend: isAdmin desde RBAC global [tipo: ⚑ fuerte] [tier: T3]

Sensible (auth, mayor blast radius). Tier T3: quality gate exhaustivo + tests de integracion contra
BD real + mutation gate (DET-31). Dual-judge (DET-35) en el gate.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S1.T1 | Consulta de rol global (`hasGlobalAdminRole`) en `resolveUser` (cache-miss) + `user.is_global_admin` en cache | REQ-01 | developer | — | backend/jormat-api/src/auth/auth.guard.ts | unit + typecheck | git revert del hunk | DET-5, DET-8, RULE-global-003 (excepcion DEC-016) | pending | 1 |
| S1.T2 | Cambiar `isAdmin` a `user.is_global_admin \|\| tokenIsAdmin` | REQ-01 | developer | S1.T1 | backend/jormat-api/src/auth/auth.guard.ts | unit | git revert | DET-8, RULE-global-002 | pending | 1 |
| S1.T3 | Acotar seed `03_rbac:130` — grant del rol global solo a enum `internal-admin` (owner deja de auto-recibirlo). Preserva "owner != admin cross-tenant" | REQ-01 | developer | — | backend/jormat-api/seeds/03_rbac.ts | seed re-run + verificar grants | git revert | DET-5, DET-16, DEC-016 | pending | 1 |
| S1.T4 | Tests: integracion BD real de `hasGlobalAdminRole` (con/sin rol global; owner no; member+rol negocio no); unit de `isAdmin` (override con is_global_admin) | REQ-01 | developer | S1.T2, S1.T3 | backend/jormat-api/**/*.spec.ts + integration | jest verde (unit + integration reachable) | borrar spec | DET-7, DET-13, RULE-global-002 | pending | 1 |
| S1.GATE | Quality gate T3 (dual-judge) + self-report verify + mutation gate sobre el diff | — | reviewer | S1.T4 | — | gate verde | — | DET-13, DET-20, DET-23, DET-31, DET-33, DET-35 | pending | 1 |

### Session 2 — Frontend: form sin rol estructural + name 120 + wiring RBAC [tipo: auto] [tier: T2]

parallel_groups: [[S2.T1, S2.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|-----------|-------|-----------|----------|-------|--------|---------|
| S2.T1 | Remover Select de rol + `ROLE_LABELS` + campo `role` del schema; `.max(120)` en name/display_name | REQ-02, REQ-04 | developer | S1.GATE | UserFormModal.tsx | vitest + typecheck | git revert | DET-5, DET-8, RULE-frontend-001 | pending | 2 |
| S2.T2 | UsersView: no enviar `role` en create/update; conservar wiring UserRolesModal | REQ-02, REQ-03 | developer | S2.T1 | UsersView.tsx, services/api/config/users.ts, types/rbac.ts | vitest (integration del view) | git revert | DET-5, DET-16 | pending | 2 |
| S2.T3 | Actualizar/crear tests + stories de UserFormModal (sin rol, tope 120) | REQ-02, REQ-04 | developer | S1.GATE | UserFormModal.test.tsx, UserFormModal.stories.tsx | vitest verde | git revert | DET-7, RULE-frontend-001 | pending | 2 |
| S2.T4 | Docs + KB (DET-37): actualizar jormat_docs auth/users; reportar O-7 al dueño (marca); confirmar tests verdes | REQ-01..04 | developer | S2.T2, S2.T3 | jormat_docs/backend/modules/auth.md, .../modules/users.md, .../frontend/*, observations/README.md (O-7 marca) | build/lint docs + suite verde | git revert | DET-16, DET-37 | pending | 2 |
| S2.GATE | Quality gate T2 + runtime verify (UI) del form sin rol | — | reviewer | S2.T4 | — | gate verde + smoke UI | — | DET-13, DET-20, DET-23, DET-25, DET-33, DET-36 | pending | 2 |

### Task contract (resumen)

Cada task lleva `source_ref`, rollback (git revert del hunk salvo tests que se borran), y rules
listadas. Detalle canonico se replica en execute via `dkc-execute-task`.

## Constraints

- `RULE-global-003` (must): la modificacion de `auth.guard.ts` es excepcion consciente (DEC-016).
  Ningun otro archivo entregado (schema, migraciones, seeds, workspaces, users service) se toca.
- `RULE-global-002` (must): REQ-01 en la ruta de authz — tests de integracion reales obligatorios.
- No dropear ni migrar `users.role` (schema entregado).

## Dependencies

- Rol de sistema global `internal-admin` en `roles` (seed 03_rbac) — precondicion de datos de REQ-01.
- `UserRolesModal` + endpoint de asignacion RBAC (JOR-035/JOR-010) — reuso de REQ-03.

## Risks and mitigations

| Riesgo | Mitigacion |
|--------|-----------|
| Regresion en auth (mayor blast radius) | Cambio quirurgico; `req.user` sin cambio de forma; tests de integracion reales; dual-judge; reversibilidad alta |
| Ampliar privilegio por error en el query del rol global | Test de "no-admin no pasa"; predicate exacto (workspace_id NULL + name/is_system) |
| Front deja de enviar `role` y algun consumidor lo esperaba | Verificar consumidores de `CreateUserInput.role` (analisis de impacto en S2.T2) |

## Open questions

- Predicate exacto del rol global: `r.name = 'internal-admin'` vs `r.is_system = true AND r.id = '4444...'`.
  Resolver en S1.T1 leyendo el seed 03_rbac (preferir el id conocido si es estable, sino name+is_system).

## Acceptance

- REQ-01..04 con sus acceptance cumplidos y verificados con evidencia (tests reales + smoke UI).
- O-7 reportado como marca al dueño de la base (DET-37 dim KB).
- Suite backend + front en verde; cobertura no baja de 90 (RULE-testing-coverage-threshold-002).

## Decisions

Ver [[DEC-016]] (modelo unificado A2 + excepcion RULE-global-003) y [[DEC-017]] (institucion/grupos n/a).
Sin decisiones locales adicionales.

## Rules discovered

(ninguna aun — se captura en execute si emerge)
