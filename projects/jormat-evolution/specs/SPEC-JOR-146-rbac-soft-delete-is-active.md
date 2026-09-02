---
id: SPEC-JOR-146-rbac-soft-delete-is-active
project: jormat-evolution
ticket: JOR-146
status: done
---

# Soft-delete is_active en RBAC/acceso: capabilities, roles, role_capabilities, user_roles, workspace_memberships

# Soft-delete is_active en RBAC/acceso: capabilities, roles, role_capabilities, user_roles, workspace_memberships

## Executive summary — lo que estas aprobando

> *Esta seccion esta disenada para revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks. Si te basta con esto para decidir, ese es el objetivo.*

**Que se quiere**: extender la convencion unica de soft-delete ([[RULE-database-001]]: `is_active smallint NOT NULL DEFAULT 1`) al bloque de **control de acceso** (5 tablas), convirtiendo su borrado fisico a logico. A diferencia de JOR-145 (dominio/datos), soft-deletear filas de acceso abre un **riesgo de fuga de permisos**: una asignacion "revocada" que siga autorizando. Por eso el corazon del ticket no es la migracion, sino el **barrido de seguridad**: todo join de hidratacion de permisos/membresia debe filtrar `is_active = 1`, con regresion dedicada que verifique que revocar produce 403.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | La cascada de borrado de workspace (`workspaces.service.ts`) mantiene el `.del()` de `workspace_memberships` HARD (fisico), consistente con `users` (DEC-LOCAL-02 de SPEC-JOR-145) | Soft-deletear memberships hijos de un workspace borrado fisico dejaria filas `is_active=0` huerfanas apuntando a un workspace/user inexistente |
| 2 | `roles.remove` deja de depender del FK `ON DELETE CASCADE` para limpiar `role_capabilities`/`user_roles`: al pasar a soft-delete, el cascade FISICO ya no dispara, asi que la remocion soft-deletea sus hijos en la misma transaccion | Sin esto, soft-deletear un rol deja sus `user_roles`/`role_capabilities` con `is_active=1` (inconsistencia; solo el filtro `r.is_active=1` en la hidratacion evita que autoricen). Es una auditoria de reemplazo DET-40 |
| 3 | `workspace_memberships` HOY no se lee para autorizar (solo se inserta y se borra en cascada); agregar `is_active` es conformidad de convencion + forward-compat, sin join que filtrar aun | Documenta que el barrido de seguridad de membresia no tiene sink de lectura actual; evita "arreglar" un join inexistente |

**Riesgos principales y como los mitigamos**:

- **Fuga de permisos: un join de hidratacion que olvide `is_active=1` autoriza una fila revocada** → barrido exhaustivo de los 5 sinks de lectura de acceso identificados (ver REQ-PRESERVE-01) + regresion revocar→403.
- **Soft-delete de un rol deja hijos activos** (el cascade fisico ya no corre) → `roles.remove` soft-deletea `role_capabilities`+`user_roles` del rol en transaccion (decision 2) + assert de hidratacion.
- **Re-otorgar tras revocar colisiona con la fila inactiva** → los 3 pivotes pasan su unique a indice parcial `WHERE is_active=1`; el check de duplicado en `assignToUser` filtra `is_active=1`. Regresion TC3.
- **Migracion sobre unique constraints en uso** → expand aditivo: agrega `is_active` (todo queda activo), luego swap unique→indice parcial en la misma migracion; sin ventana de datos inconsistentes.

**Que NO se hace en este ticket** (limites de scope):

- `workspaces` sigue hard-delete con su `status` de ciclo de vida (fuera de RULE-database-001, ya definido en JOR-145).
- El `.del()` de `users` en la cascada de workspace ya lo resolvio JOR-145 (se conserva hard); aqui solo se coordina el de `workspace_memberships`.
- No se agrega un flujo de UI de "revocar/reactivar rol": el ticket cubre la semantica de datos + seguridad, no una feature de administracion nueva.

**Tamano estimado**: 1 session (T3, regresion completa unit + e2e). La parte mas riesgosa es el barrido de joins (5 sinks) y la regresion de fuga de permisos.

**Como vas a saber que funciona**: revocar (soft-delete) una capability o un rol hace que el endpoint gateado responda 403 y la capability desaparezca de la hidratacion; re-otorgar el mismo rol tras revocarlo funciona sin colisionar; borrar un workspace no deja memberships huerfanos; la suite queda verde.

---

## Purpose

Aplicar [[RULE-database-001]] (`is_active smallint 1/0`) a las 5 tablas de control de acceso — `capabilities`, `roles`, `role_capabilities`, `user_roles`, `workspace_memberships` — convirtiendo su hard-delete en soft-delete, y blindando la autorizacion: ningun join de hidratacion de permisos/membresia debe autorizar una fila `is_active=0`. Se aparta de JOR-145 porque el soft-delete de acceso introduce riesgo de fuga de permisos que exige barrido de seguridad, indices parciales para re-otorgar, y regresion dedicada.

## Requirements

### REQ-IMPROVE-01: las 5 tablas de acceso usan is_active; los deletes de acceso son soft

> **Que cambia**: `capabilities`, `roles`, `role_capabilities`, `user_roles`, `workspace_memberships` reciben `is_active smallint NOT NULL DEFAULT 1`. Los `.del()` fisicos de acceso pasan a `update({ is_active: 0 })`.
> **Por que**: unificar el borrado logico bajo una sola convencion (RULE-database-001) tambien en el bloque RBAC, que hoy borra fisico.

El sistema MUST agregar `is_active` (smallint, 1=activo, 0=eliminado) a las 5 tablas de acceso. Los borrados de acceso MUST hacer soft-delete (`is_active=0`), no `.del()` fisico, salvo la excepcion documentada de la cascada de workspace (REQ-PRESERVE-02). Los sinks de hard-delete a convertir son: `roles.service.ts` remove de `roles` (`:131`), remove de `role_capabilities` en `setCapabilities` (`:155`) y remove de `user_roles` en `unassignFromUser` (`:186`).

**Actor**: system · **Layers**: database, backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: revocar un rol de un usuario es soft
- **GIVEN** un usuario con un rol asignado, **WHEN** el admin lo quita (`unassignFromUser`), **THEN** la fila de `user_roles` queda `is_active=0`, persiste, y deja de hidratar sus capabilities.

#### Scenario: eliminar un rol es soft y arrastra sus hijos
- **GIVEN** un rol mutable del workspace con capabilities y usuarios asignados, **WHEN** se elimina (`roles.remove`), **THEN** `roles`, sus `role_capabilities` y sus `user_roles` quedan `is_active=0` en la misma transaccion (el FK CASCADE fisico ya no aplica — ver DEC-LOCAL-02).

#### Scenario: reset de capabilities de un rol
- **GIVEN** un rol con capabilities A,B, **WHEN** `setCapabilities([B,C])`, **THEN** la fila de A queda `is_active=0`, B permanece/renace activa, C se inserta activa; el indice parcial no colisiona.

</details>

#### Acceptance
Revocar/eliminar acceso deja la fila en la DB con `is_active=0` en lugar de borrarla; el acceso deja de concederse.

### REQ-IMPROVE-02: los unique de los pivotes pasan a indice parcial WHERE is_active=1

> **Que cambia**: los unique de `user_roles (user_id, role_id)`, `role_capabilities (role_id, capability_id)`, `workspace_memberships (user_id, workspace_id)` y `capabilities (name)` se reemplazan por indices unicos **parciales** `WHERE is_active = 1`.
> **Por que**: permitir re-otorgar (re-insertar) una asignacion previamente revocada sin colisionar con la fila inactiva que quedo en la tabla.

El sistema MUST convertir el unique constraint de cada pivote de acceso en un indice unico parcial `WHERE is_active = 1`. Uniques reales verificados en `20250101000000_initial_schema.ts` y `20260614000000_rbac_tables.ts`:
- `user_roles`: `unique(['user_id', 'role_id'])` (Knex: `user_roles_user_id_role_id_unique`).
- `role_capabilities`: `unique(['role_id', 'capability_id'])` (`role_capabilities_role_id_capability_id_unique`).
- `workspace_memberships`: `unique(['user_id', 'workspace_id'])` (`workspace_memberships_user_id_workspace_id_unique`).
- `capabilities`: `name.unique()` (`capabilities_name_unique`) — forward-compat: hoy no hay path de soft-delete de `capabilities`, pero se hace parcial por consistencia con la convencion.
- `roles`: NO tiene unique en DB (la unicidad de nombre se valida en la capa de servicio, `roles.service.ts:assertNameAvailable`, por los roles globales `workspace_id NULL`); no hay indice que convertir.

**Actor**: system · **Layers**: database

<details><summary>Scenarios de validacion</summary>

#### Scenario: re-otorgar un rol revocado
- **GIVEN** un usuario cuyo `user_roles` para el rol R quedo `is_active=0`, **WHEN** el admin le vuelve a asignar R (`assignToUser`), **THEN** la insercion de la fila activa no colisiona con la inactiva (el indice parcial solo indexa `is_active=1`).

</details>

#### Acceptance
Tras revocar una asignacion, volver a otorgarla funciona sin error de constraint.

### REQ-PRESERVE-01 (CRITICO — seguridad): todo join de hidratacion de permisos/membresia filtra is_active=1

> **Que cambia**: cada read que resuelve permisos o pertenencia agrega `is_active = 1` a las tablas de acceso que toca. Una fila de acceso inactiva NO autoriza.
> **Por que**: sin el filtro, un permiso/rol/asignacion soft-deleteado sigue concediendo acceso — una fuga de permisos. Es el riesgo central del ticket.

El sistema MUST filtrar `is_active = 1` en TODOS los joins de hidratacion de permisos y en toda lectura de acceso. Omitir el filtro en un solo sink es una fuga. Barrido de sinks reales verificado en el codigo (5 lecturas de acceso):

1. **`permissions.repository.ts:findEffectiveCapabilities` (`:43-53`)** — join core de hidratacion `user_roles ur → roles r → role_capabilities rc → capabilities c`; alimenta `CapabilitiesHydrationGuard` → `req.user.capabilities` → `CapabilitiesGuard` (403). MUST filtrar `is_active=1` en las 4 tablas (`ur`, `r`, `rc`, `c`).
2. **`auth.guard.ts:userHasGlobalAdminRole` (`:66-73`)** — join `user_roles ur → roles r`; senal UNICA de superadmin de plataforma (`internal-admin`, DEC-016). Una asignacion revocada de `internal-admin` NO debe conceder superadmin. MUST filtrar `ur.is_active=1` y `r.is_active=1`.
3. **`roles.service.ts:getByIdWithCapabilities` (`:91-96`)** — join `role_capabilities rc → capabilities c` para la matriz de administracion; una capability revocada no debe mostrarse como otorgada. MUST filtrar `rc.is_active=1` (y `c.is_active=1`).
4. **`users-admin.service.ts:rolesByUserIds` (`:175-184`)** — join `user_roles ur → roles r` para el listado de usuarios; un rol revocado no debe listarse. MUST filtrar `ur.is_active=1` y `r.is_active=1`.
5. **`roles.service.ts:assignToUser` check de duplicado (`:171-174`)** y **`list`/`findVisible`/`assertNameAvailable` (`:70`, `:191`, `:220`)** — la lectura de `roles` vivos y el check de "ya tiene ese rol" MUST filtrar `is_active=1`, o (a) un rol soft-deleteado seguiria visible/mutable y (b) el check de duplicado hallaria la fila inactiva y bloquearia el re-otorgamiento con `ConflictException` (rompe REQ-IMPROVE-02).

Membresia por `workspace_id`: verificado que `workspace_memberships` HOY **no se lee** para autorizar (solo se inserta en `auth.service.ts:40` / `auth.guard.ts:374` y se hard-deletea en la cascada de `workspaces.service.ts:70`). No hay join de membresia que filtrar; se documenta como hallazgo (DEC-LOCAL-03) para que un futuro read de membresia nazca con el filtro.

**Actor**: system · **Layers**: backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: revocar capability produce 403
- **GIVEN** un usuario que accede a un endpoint gateado por una capability via rol, **WHEN** se soft-deletea la fila de `role_capabilities` (o `user_roles`) que la concede, **THEN** el endpoint responde 403 y la capability desaparece de `req.user.capabilities`.

#### Scenario: revocar internal-admin quita superadmin
- **GIVEN** un usuario con el rol global `internal-admin`, **WHEN** su `user_roles` queda `is_active=0`, **THEN** `userHasGlobalAdminRole` devuelve false (deja de ser superadmin de plataforma).

#### Scenario: rol soft-deleteado desaparece de la hidratacion
- **GIVEN** un usuario con un rol que aporta capabilities, **WHEN** el rol queda `is_active=0` (aunque sus `user_roles`/`role_capabilities` siguieran activos), **THEN** el join filtra `r.is_active=1` y las capabilities no se hidratan.

</details>

#### Acceptance
Revocar (soft-delete) cualquier eslabon de acceso (capability, rol, asignacion) hace que el endpoint protegido responda 403 y la capability no aparezca en la hidratacion.

### REQ-PRESERVE-02: la cascada de borrado de workspace mantiene hard-delete de workspace_memberships

> **Que cambia**: nada de comportamiento. `workspaces.service.ts:delete` sigue haciendo `.del()` FISICO de `workspace_memberships` (y `users`) al borrar un workspace. Ese `.del()` de memberships se conserva HARD (no pasa a soft) y se documenta como excepcion a RULE-database-001.
> **Por que**: `workspaces` se borra fisico (fuera de alcance) y `users` tambien (DEC-LOCAL-02 de JOR-145). Soft-deletear las memberships hijas dejaria filas `is_active=0` huerfanas apuntando a un workspace/user inexistente. Las FKs `user_id`/`workspace_id` son `onDelete CASCADE`, coherentes con borrado fisico.

El sistema MUST mantener el borrado FISICO de `workspace_memberships` en la cascada de `workspaces.service.ts:delete` (no convertirlo a soft-delete), alineado con el `.del()` de `users` ya conservado por JOR-145. La excepcion hard-delete MUST documentarse en el codigo (comentario), como exige RULE-database-001 para excepciones.

**Actor**: system · **Layers**: backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: borrar workspace elimina memberships fisico (sin huerfanos)
- **GIVEN** un workspace con memberships, **WHEN** se borra el workspace, **THEN** sus `workspace_memberships` se eliminan FISICO (no quedan filas `is_active=0` huerfanas apuntando al workspace borrado).

</details>

#### Acceptance
Borrar un workspace no deja memberships residuales con `is_active=0` apuntando a un workspace inexistente.

### REQ-PRESERVE-03: seeds RBAC y funcionalidad de acceso intactos (regression)

> **Que cambia**: nada. Los seeds de RBAC (`seeds/03_rbac.ts` + capabilities `04..08`) y el resto del comportamiento de autorizacion no cambian.
> **Por que**: una mejora de convencion no debe alterar los permisos demo ni el flujo de autorizacion existente (DET-7).

El sistema MUST preservar el comportamiento de autorizacion: las filas sembradas MUST nacer activas (`is_active=1` por default), y los permisos demo MUST quedar identicos. El scope por workspace + roles globales (`workspace_id NULL`) de la hidratacion MUST seguir igual.

**Actor**: system · **Layers**: backend, database

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Security | Ninguna fila de acceso `is_active=0` autoriza (sin fuga de permisos) | joins de hidratacion con filtro | 5/5 sinks filtran `is_active=1`; regresion revocar→403 verde |
| Testing | Coverage no cae bajo el umbral | cobertura backend | ≥ 90 (RULE-testing-coverage-threshold-002) |

## Artifacts

### Models (cambios de schema)

| Table (x5) | Column | Type | Nullable | Default | Description |
|-------|--------|------|----------|---------|-------------|
| capabilities, roles, role_capabilities, user_roles, workspace_memberships | is_active | smallint | no | 1 | flag de borrado logico de acceso (1=activo, 0=revocado/eliminado) |

**Estado real verificado (columnas de estado que tienen HOY estas 5 tablas)**: ninguna de las 5 tenia columna de borrado logico previa. Solo `roles.is_system` (boolean, marca rol base no editable — NO es activeness) y `workspace_memberships.role`/`roles.name` existen. No hay `in_status`, `disabled_at`, `status` ni `deleted_at` en el bloque de acceso. Por eso NO hay backfill desde una columna vieja (todo nace `is_active=1` por default) ni migracion contract (no hay columna que dropear).

**Indexes** (uniques reales que se convierten a parcial):
| Constraint actual | Tabla | Se convierte a |
|-------------------|-------|----------------|
| `user_roles_user_id_role_id_unique` | user_roles | indice unico parcial `(user_id, role_id) WHERE is_active=1` |
| `role_capabilities_role_id_capability_id_unique` | role_capabilities | indice unico parcial `(role_id, capability_id) WHERE is_active=1` |
| `workspace_memberships_user_id_workspace_id_unique` | workspace_memberships | indice unico parcial `(user_id, workspace_id) WHERE is_active=1` |
| `capabilities_name_unique` | capabilities | indice unico parcial `(name) WHERE is_active=1` (forward-compat) |
| (sin unique en DB) | roles | no aplica — unicidad en capa de servicio |

**Indices existentes preservados** (de `20260614000000_rbac_tables.ts`): `idx_user_roles_user`, `idx_role_capabilities_role`, `idx_roles_workspace`. No se tocan.

## Tasks

### Session 1 — RBAC soft-delete is_active con barrido de seguridad [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Migracion expand: agregar `is_active smallint NOT NULL DEFAULT 1` a las 5 tablas de acceso + swap de los 4 uniques (user_roles, role_capabilities, workspace_memberships, capabilities) a indice unico parcial `WHERE is_active=1` | REQ-IMPROVE-01, REQ-IMPROVE-02 | developer | — | backend/jormat-api/migrations/20260813000002_rbac_soft_delete_is_active.ts | `migrate:latest` ok + `migrate:status`; `\d` de las 5 tablas muestra is_active y los 4 indices parciales; filas existentes quedan is_active=1 | `migrate:rollback` (down dropea indices parciales, recrea uniques, dropea is_active) | DET-8, DET-40, RULE-database-001 | done | 1 |
| S1.T2 | Switch hard→soft + barrido de joins de acceso: (a) `roles.service.ts` remove roles→soft + soft-delete de sus role_capabilities+user_roles en trx (DEC-LOCAL-02); setCapabilities remove→soft; unassignFromUser→soft; check de duplicado en assignToUser filtra is_active=1; list/findVisible/assertNameAvailable filtran is_active=1. (b) join `is_active=1` en los 5 sinks de lectura: permissions.repository, auth.guard.userHasGlobalAdminRole, roles.service.getByIdWithCapabilities, users-admin.rolesByUserIds. (c) documentar excepcion hard-delete de workspace_memberships en la cascada de workspaces.service.ts | REQ-IMPROVE-01, REQ-PRESERVE-01, REQ-PRESERVE-02 | developer | S1.T1 | backend/jormat-api/src/permissions/{roles.service.ts,permissions.repository.ts}, backend/jormat-api/src/auth/auth.guard.ts, backend/jormat-api/src/users/users-admin.service.ts, backend/jormat-api/src/workspaces/workspaces.service.ts | tsc backend verde; grep sin `.del()` de acceso salvo el documentado de workspace_memberships; los 5 sinks filtran is_active=1 | git revert | DET-5, DET-10, DET-40, RULE-database-001 | done | 1 |
| S1.T3 | Tests de regresion de fuga de permisos + re-otorgamiento + seeds: TC1 revocar (soft) role_capability/user_role → endpoint gateado 403 y capability fuera de la hidratacion; TC2 (documentar) membresia sin sink de lectura; TC3 re-otorgar tras revocar valida indice parcial; TC4 cascada de workspace borra memberships fisico sin huerfanos; TC5 seeds RBAC nacen is_active=1 y preservan permisos. Actualizar specs backend afectadas | REQ-PRESERVE-01, REQ-IMPROVE-02, REQ-PRESERVE-02, REQ-PRESERVE-03 | developer | S1.T2 | backend/jormat-api/src/permissions/**/*.spec.ts, backend/jormat-api/src/auth/*.spec.ts, backend/jormat-api/src/users/*.spec.ts, backend/jormat-api/test/**, backend/jormat-api/seeds/03_rbac.ts | unit en contenedor (src montado) VERDE + e2e en HOST `cd backend/jormat-api && DB_HOST=localhost POSTGRES_PORT=5433 DB_PORT=5433 npm run test:e2e` VERDE; regresion revocar→403 pasa; coverage ≥90 | git revert | DET-7, DET-13, DET-35, RULE-testing-coverage-threshold-002 | done | 1 |
| S1.T4 | Docs: is_active + indices parciales en las 5 tablas de acceso (data-model/rbac.md); efecto de revocar (soft-delete) sobre la hidratacion (flows/users/user-access-recipes.md); nota de soft-delete + filtro en joins (development/testing/permissions.md) | REQ-IMPROVE-01, REQ-PRESERVE-01 | developer | S1.T3 | jormat_docs/data-model/rbac.md, jormat_docs/flows/users/user-access-recipes.md, docs (development/testing/permissions.md) | docs reflejan is_active + indices parciales + filtro en joins; sin refs a hard-delete de acceso salvo la excepcion documentada | git revert | DET-37 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T3)** — persistir en `## Sessions` del ticket, correr unit (contenedor) + e2e (HOST) + coverage, quality review dual-judge aislado (DET-35, sensibilidad de seguridad), self-report verification, decidir continue/close | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decision + dual-judge approved + e2e VERDE en host | (no aplica) | DET-20, DET-23, DET-33, DET-35 | done | 1 |

### Task contract (notas de ejecucion)

```
Task S1.T1: Migracion expand RBAC
- source_ref: REQ-IMPROVE-01, REQ-IMPROVE-02
- precondition: JOR-145 expand ya aplicada (20260813000000). Verificar nombres reales de los
  uniques con `\d <tabla>` antes de dropear (Knex usa `<tabla>_<cols>_unique`); si difieren, usar el real.
- expected_output: 5 tablas con is_active DEFAULT 1; 4 indices unicos parciales WHERE is_active=1.
- rollback: down() dropea los indices parciales, recrea los uniques originales, dropea is_active.
- rules: [DET-8, DET-40, RULE-database-001]

Task S1.T2: Switch + barrido de joins (SEGURIDAD)
- DET-40 (auditoria de reemplazo): el `.del()` de roles dependia del FK ON DELETE CASCADE para
  limpiar role_capabilities y user_roles. Al pasar roles a soft-delete, el cascade FISICO ya no
  dispara → la remocion soft debe soft-deletear esos hijos en la MISMA transaccion, o quedan
  is_active=1 huerfanos. Enumerar 1:1 lo que hacia el cascade viejo y replicarlo en soft.
- Los 5 sinks de lectura (REQ-PRESERVE-01) deben quedar con is_active=1; ninguno omitido.
- rollback: git revert (cambio de codigo).
- rules: [DET-5, DET-10, DET-40, RULE-database-001]

Task S1.T3: Regresion de seguridad
- e2e corre en HOST (no contenedor) por learn L1 de JOR-145; comando con DB_HOST=localhost puerto 5433.
- TC1 es el test de fuga de permisos (bloqueante de cierre).
- rules: [DET-7, DET-13, DET-35, RULE-testing-coverage-threshold-002]
```

## Constraints

- [[RULE-database-001]]: `is_active smallint 1/0` como unica convencion; joins de acceso filtran `is_active=1`; uniques de pivotes con soft-delete van a indice parcial; excepciones hard-delete se documentan en el codigo.
- [[SPEC-JOR-145-soft-delete-is-active]] (depends_on): define la convencion base y DEC-LOCAL-02 (cascada de workspace conserva hard-delete de users). Este ticket coordina el `.del()` de `workspace_memberships` en la misma cascada.
- RULE-testing-coverage-threshold-002: coverage no baja de 90.
- RULE-global-002 (aislacion de tenant): el barrido de joins no debe alterar el scope por workspace + roles globales de la hidratacion.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| SPEC-JOR-145 | internal | debe estar aplicada (users soft-delete + cascada de workspace resuelta para users) antes de tocar la misma cascada | si no esta, la excepcion de workspace_memberships quedaria mal coordinada con users |
| Postgres (indices parciales) | internal | soporte de `CREATE UNIQUE INDEX ... WHERE` | ninguno (ya usado en customers, JOR-145) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Un join de hidratacion olvida `is_active=1` → fuga de permisos | medium | fila revocada sigue autorizando (falla de seguridad) | barrido de los 5 sinks identificados + regresion revocar→403 (TC1) + dual-judge (DET-35) |
| Soft-delete de rol deja role_capabilities/user_roles activos (cascade fisico ya no corre) | high (si no se maneja) | inconsistencia; solo el filtro `r.is_active=1` evita la fuga | DEC-LOCAL-02: roles.remove soft-deletea hijos en trx (DET-40) |
| Re-otorgar tras revocar colisiona con la fila inactiva | medium | ConflictException bloquea re-otorgar | indice parcial WHERE is_active=1 + check de duplicado filtra is_active=1 (TC3) |
| Soft-delete de memberships en la cascada deja huerfanos | medium (si se cambiara) | filas is_active=0 apuntando a workspace/user borrado | DEC-LOCAL-01: la cascada conserva hard-delete de workspace_memberships |
| Drop de un unique por nombre incorrecto rompe la migracion | low | migracion falla | verificar nombres reales con `\d` antes de dropear (precondition T1) |

## Open questions

_(ninguna — las 3 decisiones criticas estan resueltas en Decisions; el dev confirma en spec-approval)_

## Decisions

### DEC-LOCAL-01: la cascada de borrado de workspace conserva hard-delete de workspace_memberships
- **Contexto**: `workspaces.service.ts:delete` hard-deletea `workspace_memberships` y `users` al borrar un workspace. JOR-145 exigio resolver el de users (se conservo hard, DEC-LOCAL-02 de SPEC-145); este ticket debe decidir el de memberships.
- **Drivers**: consistencia de la convencion (soft) vs integridad referencial (no huerfanos).
- **Opcion elegida**: mantener el `.del()` de `workspace_memberships` HARD (fisico), consistente con users. `workspaces` y `users` se borran fisico, asi que sus memberships hijas deben irse fisico; soft-deletearlas dejaria filas `is_active=0` apuntando a un workspace/user inexistente.
- **Alternativas**: pasar memberships a soft en la cascada (descartada: crea huerfanos); dejar sin definir (descartada: el ticket lo exige resuelto).
- **Consecuencias**: se documenta como segunda excepcion hard-delete de la cascada (junto a users). El path de soft-delete de acceso (revocar rol/capability) es independiente de esta cascada.
- **Session**: 1

### DEC-LOCAL-02: roles.remove soft-deletea sus role_capabilities y user_roles en transaccion (auditoria de reemplazo DET-40)
- **Contexto**: `roles.service.ts:remove` hoy hace `.del()` fisico de `roles` y confia en el FK `ON DELETE CASCADE` para limpiar `role_capabilities` y `user_roles` (comentario `:130`). Al pasar `roles` a soft-delete (`is_active=0`), el cascade FISICO ya no dispara.
- **Drivers**: consistencia (no dejar hijos `is_active=1` de un rol inactivo) vs minimo cambio.
- **Opcion elegida**: `roles.remove` soft-deletea el rol Y sus `role_capabilities` + `user_roles` en la misma transaccion, replicando el efecto del cascade viejo en su version logica.
- **Alternativas**: (a) confiar solo en el filtro `r.is_active=1` de la hidratacion y dejar los hijos activos — descartada: inconsistencia latente, y un futuro read que joinee user_roles sin pasar por roles podria leakear; (b) mantener roles.remove hard-delete — descartada: viola REQ-IMPROVE-01 y RULE-database-001.
- **Consecuencias**: la remocion de rol es transaccional y deja un estado consistente (rol + hijos inactivos). Se acumulan filas `is_active=0` (audit trail aceptable).
- **Session**: 1

### DEC-LOCAL-03: workspace_memberships no tiene sink de lectura de autorizacion hoy (hallazgo del barrido)
- **Contexto**: el barrido de REQ-PRESERVE-01 debia cubrir "queries de membresia por workspace_id". Verificado que `workspace_memberships` HOY solo se inserta (`auth.service.ts:40`, `auth.guard.ts:374`) y se hard-deletea en la cascada; ningun read autoriza en base a ella (la autorizacion usa `users.workspace_id` + `user_roles`).
- **Opcion elegida**: agregar `is_active` a `workspace_memberships` por conformidad de convencion + forward-compat, sin join que filtrar. Documentar el hallazgo para que un futuro read de membresia nazca con `is_active=1`.
- **Consecuencias**: no se "arregla" un join inexistente; se deja constancia para no reintroducir una fuga cuando la membresia se lea para autorizar.
- **Session**: 1

## Acceptance checkpoints

- [ ] **Funcional**: las 5 tablas usan `is_active`; los deletes de acceso son soft (salvo la cascada documentada); revocar→403; re-otorgar tras revocar funciona.
- [ ] **Seguridad**: los 5 sinks de hidratacion/lectura de acceso filtran `is_active=1`; regresion de fuga de permisos (TC1) en VERDE.
- [ ] **Tests** (DET-37 dim4): specs backend actualizadas + regresion; unit (contenedor) + e2e (HOST) corridos y en VERDE; coverage ≥90.
- [ ] **Rules**: RULE-database-001 respetada (convencion, indices parciales, excepciones hard-delete documentadas).
- [ ] **Integration**: no rompe el scope por workspace + roles globales ni los seeds RBAC (regression).
- [ ] **Docs oficiales** (DET-37 dim1): data-model/rbac.md + flows/users + docs de permissions actualizados (o N/A con razon).
- [ ] **KB DKC** (DET-37 dim2): no crea rule nueva (reusa RULE-database-001); DEC-LOCAL-01/02/03 registradas.
- [ ] **Planning-completeness**: entry registrada (complete).
