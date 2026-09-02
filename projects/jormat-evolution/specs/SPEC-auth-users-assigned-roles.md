---
id: SPEC-auth-users-assigned-roles
project: jormat-evolution
ticket: JOR-035
status: done
---

# Exponer y visualizar los roles RBAC asignados por usuario (cierra gap B4)

# Exponer y visualizar los roles RBAC asignados por usuario (cierra gap B4)

## Executive summary — lo que estas aprobando

**Que se quiere**: la vista de usuarios (`config/users`) ya lista cuentas y permite asignar/quitar roles RBAC, pero el `UserPublicDto` **no devuelve los roles asignados** (solo el `role` legacy). Por eso la tabla no muestra el rol RBAC y el `UserRolesModal` no puede pre-marcar lo asignado (gap "B4" anotado en el código). Se cierra el gap: el API expone `roles[]` (id+name) por usuario; la tabla los muestra y el modal pre-marca el estado por rol. **Se mantiene la relación N:M** (un usuario puede tener varios roles; assign/quitar ya existen, NO se crea mutación nueva).

**Decisiones críticas** (cerradas en super con racional — ver Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Exponer `roles: {id,name}[]` en `UserPublicDto` (allowlist), vía join a `user_roles` scopeado por ws+globales. | Cierra B4 sin filtrar columnas internas (S3); el front ya está listo para consumirlo. |
| 2 | NO crear endpoint de mutación nuevo: assign/quitar (`POST/DELETE /config/roles/:roleId/users/:userId`) ya cubren el cambio. Se mantiene N:M. | Decisión del dev: reflejar el modelo real, no imponer single-role. |
| 3 | El `UserRolesModal` permite asignar/quitar cualquier rol (incl. `internal-admin`/is_system); solo se muestra el badge "Sistema". | El backend gobierna (assign/unassign no bloquea is_system); evita una restricción de UX artificial. |
| 4 | En `UsersView`, el usuario del modal se deriva de la lista viva por id (no snapshot), para que el pre-marcado se refresque tras assign/quitar. | Sin esto, el modal mostraría estado stale tras mutar. |

**Riesgos principales y como los mitigamos**:

- **Fuga de columnas internas al agregar roles** → `roles[]` solo lleva `id`+`name` del rol; el mapper sigue siendo allowlist (test asserta que no aparece `b2c_oid`).
- **N+1 en el listado** → en `list` los roles se traen en UNA query batch por los ids de la página y se agrupan en memoria (no por-usuario).
- **Cross-tenant** → la query de roles del usuario filtra `r.workspace_id = ws OR r.workspace_id IS NULL` (RULE-002), igual que el listado de roles.
- **Pre-marcado stale** → el modal lee el user derivado de la lista viva; assign/quitar invalidan `userKeys.lists()` (hooks existentes) → refetch → roles actualizados.

**Que NO se hace**:
- NO se impone single-role ni se crea endpoint de reemplazo (se mantiene N:M — decisión del dev).
- NO se toca el `role` legacy ni `AuthGuard`/`can()` (RULE-003).
- NO se crea pantalla nueva (enhancement de vistas existentes).

**Tamano estimado**: 2 sessions (S1 backend, S2 frontend), ~2-3h.

**Como vas a saber que funciona**:
- En la tabla de usuarios ves los roles RBAC asignados (chips) por fila.
- Al abrir "Roles" de un usuario, el modal marca los roles que ya tiene; asignar/quitar actualiza el estado en vivo.

## Purpose

Completar la gestión de usuarios cerrando el gap B4: hacer **visibles** los roles RBAC asignados (hoy solo mutables a ciegas). Actor: admin del workspace (con `config.users:view`/`:assign-roles`).

## Requirements

### REQ-IMPROVE-01: el API de usuarios expone los roles RBAC asignados

> **Que cambia**: `GET /config/users` y `GET /config/users/:id` devuelven, por usuario, `roles: [{id, name}]` (los roles RBAC asignados vía `user_roles`).
> **Por que**: sin esto la UI no puede mostrar ni pre-marcar el rol del usuario (gap B4).

`UserPublicDto` MUST incluir `roles: { id: string; name: string }[]` con los roles asignados al usuario vía `user_roles`, filtrados por `r.workspace_id = :workspaceId OR r.workspace_id IS NULL` (RULE-002). El mapper MUST seguir siendo allowlist (NO exponer `b2c_oid`/`identity_provider`/`workspace_id`). En `list`, los roles MUST traerse en una única query batch por los ids de la página (sin N+1). `create` devuelve `roles: []` (usuario nuevo sin roles).

**Actor**: admin **Layers**: backend (service + dto)

<details><summary>Scenarios de validacion</summary>

- **GIVEN** un usuario con 2 roles asignados, **WHEN** `GET /config/users/:id`, **THEN** `roles` tiene 2 entradas `{id,name}`.
- **GIVEN** un usuario sin roles, **WHEN** `GET`, **THEN** `roles: []`.
- **GIVEN** el listado, **WHEN** `GET /config/users`, **THEN** cada item trae su `roles[]` y NO aparece `b2c_oid`.
- **GIVEN** un rol de OTRO workspace en `user_roles` (no debería pasar), **WHEN** se resuelve, **THEN** no se incluye (scope ws+globales).
</details>

#### Acceptance
**El usuario puede verificar que funciona**: `GET /api/config/users` devuelve `roles[]` por usuario.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | expone roles | user con roles | GET list/get | DTO.roles | [{id,name}] |
| 2 | sin roles | user sin roles | GET | DTO.roles | [] |
| 3 | allowlist | cualquier user | GET | DTO | sin b2c_oid/internal |

### REQ-IMPROVE-02: la UI muestra y pre-marca los roles asignados

> **Que cambia**: `UsersTable` muestra los roles RBAC asignados (chips); `UserRolesModal` pre-marca los asignados y muestra estado por rol (Asignado/Asignar/Quitar).
> **Por que**: es lo que el dev pidió — "ver su rol y modificar el rol dentro de los roles disponibles".

`UserPublic` (tipo front) MUST incluir `roles: { id: string; name: string }[]`. `UsersTable` MUST mostrar los roles asignados como chips (o "Sin rol" si vacío). `UserRolesModal` MUST pre-marcar, por cada rol disponible, si está asignado al usuario (usando `user.roles`), mostrando la acción coherente (Quitar si asignado, Asignar si no) y removiendo el aviso de "estado no disponible". `UsersView` MUST derivar el usuario del modal desde la lista viva (por id) para reflejar cambios tras assign/quitar.

**Actor**: admin **Layers**: frontend

<details><summary>Scenarios de validacion</summary>

- **GIVEN** un usuario con el rol "Cajero", **WHEN** abro su tabla, **THEN** veo el chip "Cajero".
- **GIVEN** abro el modal de ese usuario, **THEN** "Cajero" aparece marcado como asignado (acción Quitar); los demás como Asignar.
- **GIVEN** asigno un rol, **WHEN** la lista se refetch, **THEN** el chip y el pre-marcado se actualizan.
</details>

#### Acceptance
**El usuario puede verificar que funciona**: la tabla muestra los roles; el modal marca los asignados y permite asignar/quitar con feedback en vivo.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | tabla muestra roles | user con roles[] | render UsersTable | chips | nombres de rol |
| 2 | modal pre-marca | user con rol X | render UserRolesModal | rol X | estado asignado/Quitar |

### REQ-PRESERVE-01: el resto de la gestión de usuarios no cambia

El sistema MUST preservar: alta/edición/soft-disable de usuarios; assign/quitar de roles (endpoints sin cambio); el `role` legacy; el scope por workspace; el gating por capability. Las suites existentes (BE/FE) MUST seguir verdes.

## Changes

### Modified: `backend/jormat-api/src/users/user-public.dto.ts`
| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| UserPublicDto | sin roles | + `roles: {id,name}[]` | REQ-IMPROVE-01 |
| toUserPublicDto | `(row)` | `(row, roles=[])` | adjuntar roles |

### Modified: `backend/jormat-api/src/users/users-admin.service.ts`
| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| list | map(toUserPublicDto) | batch roles por ids + map con roles | sin N+1 |
| getById/update/disable | toUserPublicDto(row) | + fetch roles del user | exponer asignados |

### Modified (frontend)
| Archivo | Cambio |
|---------|--------|
| `types/rbac.ts` | `UserPublic` + `roles: {id,name}[]` |
| `UsersTable.tsx` | columna "Roles" = chips de roles asignados |
| `UserRolesModal.tsx` | pre-marca asignados; estado/ acción por rol; quita el aviso B4 |
| `UsersView.tsx` | user del modal derivado de la lista viva por id |

## Tasks

### Session 1 — Backend: exponer roles[] asignados [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | `UserPublicDto` + `toUserPublicDto(row, roles)` con `roles: {id,name}[]` | REQ-IMPROVE-01 | developer | — | backend/jormat-api/src/users/user-public.dto.ts | jest dto | git revert | DET-5, DET-8 | done | 1 |
| S1.T2 | `UsersAdminService`: helper roles scopeado + batch en list + fetch en get/update/disable | REQ-IMPROVE-01, REQ-PRESERVE-01 | developer | S1.T1 | backend/jormat-api/src/users/users-admin.service.ts | jest service/controller | git revert | DET-5, DET-8, RULE-global-002 | done | 1 |
| S1.T3 | Tests: roles[] expuesto (list/get), sin internos, scope ws | REQ-IMPROVE-01 | developer | S1.T2 | backend/jormat-api/src/users/*.spec.ts | jest suite verde | git revert | DET-7, DET-13 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier T2)** — suite BE + quality review + decisión | — | reviewer | S1.T1, S1.T2, S1.T3 | ticket | gate persistido | (no aplica) | DET-20, DET-23, DET-33 | done | 1 |

### Session 2 — Frontend: mostrar + pre-marcar roles asignados [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | `UserPublic` + `roles[]`; verificar api client pasa el campo | REQ-IMPROVE-02 | developer | S1.GATE | front/jormat-front/src/types/rbac.ts, src/services/api/config/users.ts | tsc | git revert | DET-5 | done | 2 |
| S2.T2 | `UsersTable` columna "Roles" (chips); `UserRolesModal` pre-marca + estado por rol (quita aviso B4); `UsersView` user derivado de lista viva | REQ-IMPROVE-02 | developer | S2.T1 | front/jormat-front/src/components/config/users/** | vitest | git revert | DET-5, RULE-frontend-001 | done | 2 |
| S2.T3 | Tests: UsersTable muestra roles; UserRolesModal pre-marca; fixtures con roles[] | REQ-IMPROVE-02, REQ-PRESERVE-01 | developer | S2.T2 | front/jormat-front/src/components/config/users/**/*.test.tsx | vitest verde + a11y | git revert | DET-7, DET-13 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier T2)** — vitest front + quality review + cierre | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido | (no aplica) | DET-20, DET-23, DET-33 | done | 2 |

## Constraints

- RULE-global-002: scope por workspace_id (la query de roles del user filtra ws+globales).
- RULE-global-003: no tocar AuthGuard/can()/migraciones entregadas; el DTO público (JOR-010) se extiende manteniendo el allowlist.
- RULE-frontend-001: pages orquestan composites; carpeta-por-componente + test.

## Decisions

### DEC-LOCAL-14: exponer roles[] en UserPublicDto (no endpoint nuevo de lectura)
- **Contexto**: cómo entregar los roles asignados al front.
- **Opcion elegida**: extender `UserPublicDto` con `roles: {id,name}[]` (el front ya lo consume en el mismo objeto user).
- **Alternativas**: endpoint dedicado `GET /config/users/:id/roles` → más round-trips + el front tendría que orquestar; innecesario.
- **Consecuencias**: un solo objeto user con sus roles; batch en list evita N+1.
- **Session**: S1 (design)

### DEC-LOCAL-15: mantener N:M (sin single-role, sin endpoint de reemplazo)
- **Contexto**: el dev pidió "un rol" y luego corrigió a mantener la relación actual.
- **Opcion elegida**: N:M — assign/quitar existentes; la UI soporta 0/1/varios roles.
- **Alternativas**: imponer single-role con reemplazo atómico → restringe el modelo sin pedido real.
- **Session**: S1 (design)

### DEC-LOCAL-16: el modal opera sobre cualquier rol (incl. is_system); user derivado de lista viva
- **Contexto**: W3 (trato de internal-admin) + estado stale del modal.
- **Opcion elegida**: assign/quitar para todos los roles (backend gobierna); badge "Sistema" informativo; `UsersView` deriva el user del modal de la lista viva por id.
- **Session**: S1 (design)

## Acceptance checkpoints

- [ ] **Funcional**: tabla muestra roles asignados; modal pre-marca; assign/quitar refresca.
- [ ] **Tests**: BE + FE verde; roles[] expuesto y pre-marcado cubiertos.
- [ ] **Rules**: allowlist DTO (sin internos), scope ws (RULE-002), RULE-003 intacta.
- [ ] **Integration**: regresión de gestión de usuarios (alta/edición/disable/assign) sin cambios.
