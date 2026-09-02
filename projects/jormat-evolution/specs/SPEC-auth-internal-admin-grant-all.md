---
id: SPEC-auth-internal-admin-grant-all
project: jormat-evolution
ticket: JOR-033
status: done
---

# Internal-admin sin wildcard `*`: grants explícitos auto-mantenidos + capability `config.roles:create` + paginación de la matriz de permisos

# Internal-admin sin wildcard `*`: grants explícitos auto-mantenidos + capability `config.roles:create` + paginación de la matriz de permisos

## Executive summary — lo que estas aprobando

**Que se quiere**: hoy `internal-admin` tiene una única capability `*` que en `can()` hace short-circuit a "puede todo". Funciona, pero hace su poder **invisible y no auditable** en la matriz de permisos (se ve "vacío + `*`"). Se reemplaza el wildcard por **grants explícitos de todas las capabilities**, sembrados por un seed que corre al final y otorga el catálogo completo a `internal-admin` de forma idempotente — así un permiso nuevo (agregado a cualquier seed) queda **activado por defecto** para `internal-admin` en el próximo re-seed, sin mantenimiento manual. Además se crea la capability `config.roles:create` (hoy crear rol se gatea con `:edit`) y se pagina la matriz de permisos (que crece al mostrar el catálogo completo).

**Decisiones críticas** (cerradas en modo super con racional — ver Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | NO tocar `can.ts` (RULE-global-003). La rama `granted === '*'` queda inerte al no existir la cap. | `can()` es código base entregado y testeado; tocarlo viola RULE-003. Al quitar la cap `*` del catálogo, ningún rol la tiene → la rama nunca matchea. |
| 2 | Seed `09_internal_admin_grant_all` corre último (orden alfabético) y otorga TODO el catálogo a internal-admin, idempotente. La limpieza del `*` residual la hace `03_rbac` (delete idempotente). | Mecanismo auto-mantenido: caps nuevas se otorgan solas al re-seed. Convergente sin requerir wipe destructivo de la DB. |
| 3 | Mover el guard de `POST /config/roles` de `config.roles:edit` → `config.roles:create` (cap nueva). | Cambio de autorización real: roles con solo `:edit` dejan de poder crear. internal-admin lo conserva por grant-all. Propaga al gating del botón en el front. |
| 4 | Paginación **client-side** de `CapabilityMatrix` (reusa `ui/pagination`). | Catálogo ~31 caps: server-side (paginar `GET /api/capabilities`) es YAGNI y agrega superficie. Reduce/reuse (DET-32). |

**Riesgos principales y como los mitigamos**:

- **internal-admin pierde acceso al quitar `*`** → el seed `09` debe correr y otorgar todo ANTES de validar; test de `effectiveCaps(internal-admin)` asserta que el vector contiene el catálogo completo (no `*`). Si `09` no corre, internal-admin queda sin nada → lo detecta el test y el smoke.
- **DBs de dev con `*` residual** → `03_rbac` borra la cap `*` idempotentemente (cascade limpia `role_capabilities`); el cierre corre `db:reset` (operación destructiva → se confirma con el dev, DET-30/protocolo data-loss).
- **Romper la matriz/filtros al paginar** → REQ-PRESERVE-02: filtros módulo/feature siguen operando sobre el set completo y la paginación opera sobre el resultado filtrado; tests de filtro + paginación combinados.
- **Tests de RBAC que asumen `*`** (SPEC-backend-rbac REQ-02/03) → propagación DET-16: se actualizan seed-tests y el escenario "vector incluye `*`" → "vector incluye el catálogo completo".

**Que NO se hace en este ticket**:

- NO se toca `can.ts` ni `AuthGuard`/`CapabilitiesGuard` (RULE-003) — la rama `*` queda inerte (documentada).
- NO se implementa creación de capabilities en runtime (siguen seed-driven) — fuera de alcance.
- NO se migra a paginación server-side (YAGNI a 31 caps).
- NO se redefine la semántica de `is_system`/roles globales (internal-admin sigue read-only en UI).

**Tamano estimado**: 2 sessions ejecutables (S1 backend, S2 frontend), ~3-4h efectivas. La más riesgosa es S1 (seed + authz + propagación de tests).

**Como vas a saber que funciona**:
- Tras `db:reset`, la matriz muestra a `internal-admin` con **todos** los permisos activos (no "vacío + `*`"), y ya no aparece la fila `*`.
- Crear un rol requiere `config.roles:create`; un rol con solo `:edit` ya no ve/usa el botón.
- La vista de permisos pagina cuando hay más de N filas.

## Purpose

Hacer el poder de `internal-admin` **explícito, auditable y auto-mantenido** en el modelo RBAC de jormat-api, eliminando el wildcard implícito. Secundariamente, granular la acción de crear rol (`config.roles:create`) y mejorar la usabilidad de la matriz de permisos con paginación. Actor: equipo de desarrollo + admins de workspace (vía la UI de roles).

## Requirements

### REQ-IMPROVE-01: internal-admin con grants explícitos auto-mantenidos (sin `*`)

> **Que cambia**: `internal-admin` deja de tener la capability `*`; pasa a tener **todas** las capabilities del catálogo otorgadas explícitamente, sembradas por un seed que corre al final. Un permiso nuevo, al agregarse a cualquier seed, queda otorgado a internal-admin en el próximo re-seed.
> **Por que**: el `*` hace el poder de internal-admin invisible en la matriz y no auditable; los grants explícitos lo hacen veraz.

El seed `seeds/03_rbac.ts` MUST dejar de crear la capability `*` y de asignarla a `internal-admin`, y MUST borrar idempotentemente la capability `*` si existe (cascade limpia `role_capabilities`). Un seed nuevo `seeds/09_internal_admin_grant_all.ts` MUST, tras correr todos los seeds de capabilities (03-08, garantizado por orden alfabético), otorgar a `internal-admin` **todas** las capabilities presentes en la tabla `capabilities` (insert idempotente en `role_capabilities`, sin duplicar). Ambos seeds MUST respetar el guard no-prod (`NODE_ENV=production` → no siembra) y ser idempotentes (re-run no duplica ni falla).

**Actor**: system (seed) **Layers**: database (seed)

<details><summary>Scenarios de validacion</summary>

- **GIVEN** una DB migrada, **WHEN** se corre el seed completo, **THEN** `internal-admin` tiene en `role_capabilities` exactamente una fila por cada capability del catálogo, y NO existe la capability `*`.
- **GIVEN** se agrega una capability nueva a un seed (ej. `08b`/futuro) y se re-corre el seed, **THEN** `internal-admin` la obtiene automáticamente (grant-all la incluye).
- **GIVEN** se corre el seed dos veces, **THEN** no hay filas duplicadas en `role_capabilities` ni error.
- **GIVEN** `NODE_ENV=production`, **WHEN** se corre, **THEN** no inserta nada.
</details>

#### Acceptance
**El usuario puede verificar que funciona**: tras `db:reset`, abrir la matriz de permisos con internal-admin seleccionado → todos los toggles activos; la fila `*` ya no aparece.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | grant-all completo | DB migrada | seed completo | caps de internal-admin | = catálogo completo, sin `*` |
| 2 | idempotencia | seed corrido 1x | re-correr seed | filas role_capabilities | sin duplicados |
| 3 | auto-grant cap nueva | cap nueva en seed | re-seed | caps internal-admin | incluye la nueva |

### REQ-IMPROVE-02: capability `config.roles:create` para crear rol

> **Que cambia**: se agrega la capability `config.roles:create`; el endpoint `POST /config/roles` y el botón "Crear rol" del front pasan a exigir `:create` en vez de `:edit`.
> **Por que**: crear rol es una acción distinta de editar; merece su propio permiso granular.

El seed `03_rbac.ts` MUST agregar la capability `config.roles:create` (module `config`, feature `roles`, action `create`). El endpoint `POST /config/roles` ([roles.controller.ts](../../../q/jormat_monorepo/jormat-evolution-mono/backend/jormat-api/src/permissions/roles.controller.ts)) MUST exigir `@RequireCapability('config.roles:create')` en vez de `:edit`. El botón "Crear rol" en `RolesView` MUST gatearse con `config.roles:create` (`<Can cap="config.roles:create">`). internal-admin conserva la capacidad por grant-all (REQ-IMPROVE-01).

**Actor**: admin **Layers**: database (seed), backend (controller), frontend (gating)

<details><summary>Scenarios de validacion</summary>

- **GIVEN** un user con `config.roles:create`, **WHEN** `POST /config/roles`, **THEN** 200/201 (crea).
- **GIVEN** un user con solo `config.roles:edit` (sin `:create`), **WHEN** `POST /config/roles`, **THEN** 403.
- **GIVEN** un user sin `config.roles:create`, **WHEN** abre la vista de roles, **THEN** el botón "Crear rol" no se renderiza.
</details>

#### Acceptance
**El usuario puede verificar que funciona**: con un rol que solo tiene `:edit`, el botón "Crear rol" no aparece y el POST devuelve 403; con `:create`, ambos funcionan.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | create con cap | user con `:create` | POST /config/roles | status | 201 |
| 2 | create sin cap | user con solo `:edit` | POST /config/roles | status | 403 |
| 3 | botón gateado | user sin `:create` | render RolesView | botón Crear rol | ausente |

### REQ-IMPROVE-03: paginación client-side de la matriz de permisos

> **Que cambia**: `CapabilityMatrix` pagina su tabla (reusa `ui/pagination`) en vez de listar todas las filas de una.
> **Por que**: con el catálogo completo visible la tabla crece; paginar mejora la navegación.

`CapabilityMatrix` MUST paginar las filas resultantes (tras aplicar filtros módulo/feature) con un tamaño de página fijo (default 10), reutilizando la primitiva `components/ui/pagination`. La paginación MUST operar sobre el set ya filtrado y MUST resetear a la página 1 cuando cambian los filtros. El contador "{n} de {total} permisos" MUST seguir mostrando el total filtrado.

**Actor**: admin **Layers**: frontend

<details><summary>Scenarios de validacion</summary>

- **GIVEN** un catálogo con más de 10 caps, **WHEN** se abre la matriz, **THEN** se muestran 10 filas y un control de paginación.
- **GIVEN** estoy en la página 2, **WHEN** aplico un filtro de módulo, **THEN** vuelve a página 1 mostrando el set filtrado.
- **GIVEN** filtro que deja <10 resultados, **THEN** no hay control de paginación (o queda en 1 página).
</details>

#### Acceptance
**El usuario puede verificar que funciona**: la matriz muestra páginas de 10 filas con navegación; al filtrar, regresa a la página 1.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | pagina | catálogo >10 | render matriz | filas visibles | 10 + control |
| 2 | reset al filtrar | en página 2 | cambia módulo | página | 1 |

### REQ-PRESERVE-01: la autorización efectiva sigue intacta

> **Que cambia**: nada en el comportamiento de `can()`/`effectiveCaps`/guards.
> **Por que**: cambiar el modelo de datos no debe romper la frontera de authz.

El sistema MUST preservar: `can()` sin cambios (RULE-003); `effectiveCaps(internal-admin)` devuelve el catálogo completo (vía grants explícitos) en vez de `['*']`; todos los endpoints protegidos siguen respondiendo 200 (con cap) / 403 (sin cap) como antes; el scope por workspace_id se mantiene.

<details><summary>Scenarios de validacion</summary>

- **GIVEN** un user internal-admin, **WHEN** `resolve(user)`, **THEN** el vector incluye todas las caps del catálogo (no `*`) y `can(vector, '<cualquier cap>')` es true.
- **GIVEN** un endpoint protegido y un user con la cap, **WHEN** se llama, **THEN** 200 (regresión).
- **GIVEN** un user de otro workspace, **WHEN** resolve, **THEN** no ve caps de roles ajenos (cross-tenant).
</details>

### REQ-PRESERVE-02: filtros de la matriz siguen funcionando con paginación

> **Que cambia**: nada en los filtros existentes.
> **Por que**: la paginación no debe romper el filtrado módulo/feature.

`CapabilityMatrix` MUST mantener los filtros de módulo y feature operando sobre el catálogo completo; la paginación se aplica sobre el resultado filtrado. El estado vacío ("Sin resultados") y los toggles read-only/gateados se preservan.

## Changes

### Modified: `seeds/03_rbac.ts`
| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| capability `*` | se crea + se asigna a internal-admin | NO se crea; se borra idempotentemente si existe | quitar wildcard (REQ-IMPROVE-01) |
| grant a internal-admin | inserta `*` en role_capabilities | (eliminado — lo hace `09`) | grants explícitos |
| catálogo config.roles | view/edit/delete/assign-permissions | + `config.roles:create` | REQ-IMPROVE-02 |

### Added: `seeds/09_internal_admin_grant_all.ts`
| Field | Value | Purpose |
|-------|-------|---------|
| orden | corre último (alfabético, post 03-08) | otorgar todo el catálogo ya sembrado |
| acción | insert idempotente de todas las caps a internal-admin | grant-all auto-mantenido |
| guard | no-prod (`NODE_ENV=production` → skip) | consistencia con 02-08 |

### Modified: `src/permissions/roles.controller.ts`
| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| guard POST | `@RequireCapability('config.roles:edit')` | `@RequireCapability('config.roles:create')` | REQ-IMPROVE-02 |

### Modified (frontend): `RolesView.tsx`, `CapabilityMatrix.tsx`
| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| gating botón Crear rol | `<Can cap="config.roles:edit">` | `<Can cap="config.roles:create">` | REQ-IMPROVE-02 |
| matriz | lista todas las filas | pagina client-side (10/pág) | REQ-IMPROVE-03 |

### Modified (propagación DET-16): `specs/SPEC-backend-rbac.md`
Nota de evolución: REQ-02 ya no siembra `*` (lo reemplaza grant-all); REQ-03 escenario "vector incluye `*`" → "vector incluye el catálogo completo". Tests asociados actualizados.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Security | crear rol exige cap dedicada | RBAC | `config.roles:create` |
| Security | internal-admin sin bypass implícito | grants | explícitos, auditables en matriz |

## Tasks

### Session 1 — Backend: quitar `*`, grant-all, cap roles:create, guard + propagación [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Editar `03_rbac.ts`: quitar creación+grant de `*`, delete idempotente de `*`, agregar cap `config.roles:create` | REQ-IMPROVE-01, REQ-IMPROVE-02 | developer | — | backend/jormat-api/seeds/03_rbac.ts | jest seed util + lectura | git revert | DET-5, DET-8, DET-11 | done | 1 |
| S1.T2 | Crear `09_internal_admin_grant_all.ts` (grant-all idempotente, no-prod) | REQ-IMPROVE-01 | developer | S1.T1 | backend/jormat-api/seeds/09_internal_admin_grant_all.ts | jest + idempotencia | borrar archivo | DET-1, DET-2, DET-8 | done | 1 |
| S1.T3 | Mover guard `POST /config/roles` a `config.roles:create` | REQ-IMPROVE-02 | developer | S1.T1 | backend/jormat-api/src/permissions/roles.controller.ts | jest 403/201 | git revert | DET-5, DET-8 | done | 1 |
| S1.T4 | Propagar SPEC-backend-rbac + actualizar tests RBAC que asumen `*` (effectiveCaps, seed, 403 create) | REQ-PRESERVE-01, REQ-IMPROVE-02 | developer | S1.T2, S1.T3 | backend/jormat-api/src/permissions/*.spec.ts, specs/SPEC-backend-rbac.md | jest suite verde | git revert | DET-7, DET-13, DET-16 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir, suite BE + (db:reset si autorizado), quality review, decidir | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4 | ticket | gate persistido + decisión | (no aplica) | DET-20, DET-23, DET-33 | done | 1 |

### Session 2 — Frontend: gating crear-rol con `:create` + paginación de la matriz [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Gatear botón "Crear rol" con `config.roles:create` en RolesView (+ comentario doc) | REQ-IMPROVE-02 | developer | S1.GATE | front/jormat-front/src/components/config/roles/RolesView/RolesView.tsx | vitest RolesView | git revert | DET-5, DET-8 | done | 2 |
| S2.T2 | Paginación client-side en CapabilityMatrix (reusa ui/pagination, reset al filtrar) | REQ-IMPROVE-03, REQ-PRESERVE-02 | developer | S1.GATE | front/jormat-front/src/components/config/roles/CapabilityMatrix/CapabilityMatrix.tsx | vitest matrix | git revert | DET-5, DET-32 | done | 2 |
| S2.T3 | Actualizar/añadir tests front (RolesView gating, CapabilityMatrix paginación+filtros) | REQ-IMPROVE-02, REQ-IMPROVE-03, REQ-PRESERVE-02 | developer | S2.T1, S2.T2 | front/jormat-front/src/components/config/roles/**/*.test.tsx | vitest verde + a11y | git revert | DET-7, DET-13 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, vitest front verde, quality review, decidir cierre | — | reviewer | S2.T1, S2.T2, S2.T3 | ticket | gate persistido + decisión | (no aplica) | DET-20, DET-23, DET-33 | done | 2 |

## Constraints

- RULE-global-002: scope por workspace_id — la query de effectiveCaps mantiene el scope (no se toca).
- RULE-global-003: `can()`, AuthGuard, CapabilitiesGuard, migraciones/seeds entregados NO se tocan. Los seeds 03-08 son de JOR-010 (DKC-owned, modificables); `can.ts` es base entregada (NO se toca).
- DET-16: propagación a SPEC-backend-rbac y sus tests.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `09` no corre → internal-admin sin permisos | low | high | test effectiveCaps asserta catálogo completo; smoke matriz |
| `*` residual en dev DB | medium | low | delete idempotente en 03 + db:reset al cierre (confirmado) |
| Tests RBAC asumen `*` | high | medium | S1.T4 los actualiza (propagación) |
| Paginación rompe filtros | low | medium | REQ-PRESERVE-02 + tests combinados |

## Decisions

### DEC-LOCAL-10: NO tocar `can.ts`; la rama `*` queda inerte
- **Contexto**: quitar el wildcard `*`; ¿remover también el short-circuit `granted === '*'` en `can()`?
- **Opcion elegida**: NO tocar `can.ts`. Al eliminar la capability `*` del catálogo, ningún rol la tiene → la rama nunca matchea.
- **Alternativas**: borrar la rama → viola RULE-global-003 (código base entregado y testeado) y aporta riesgo sin beneficio.
- **Consecuencias**: rama inerte (defensiva). Documentado.
- **Session**: S1 (design)

### DEC-LOCAL-11: seed `09` grant-all final + cleanup en `03`
- **Contexto**: cómo materializar "internal-admin obtiene todo permiso nuevo activado".
- **Opcion elegida**: seed `09_internal_admin_grant_all` corre último (orden alfabético) y otorga todo el catálogo idempotentemente; `03` borra el `*` residual.
- **Alternativas**: trigger DB en `capabilities` (runtime real, pero YAGNI sin creación en runtime + superficie en DB); enumerar caps a mano en internal-admin (frágil, se desincroniza).
- **Consecuencias**: auto-mantenido, convergente, sin wipe destructivo obligatorio. Reversible (borrar 09 + restaurar `*` en 03).
- **Session**: S1 (design)

### DEC-LOCAL-12: guard `POST /config/roles` → `config.roles:create`
- **Contexto**: crear rol se gateaba con `:edit`; el dev pide cap dedicada.
- **Opcion elegida**: nueva cap `config.roles:create`; guard backend + gating front la usan.
- **Alternativas**: dejar bajo `:edit` (no cumple el pedido).
- **Consecuencias**: roles con solo `:edit` dejan de crear; internal-admin conserva por grant-all.
- **Session**: S1 (design)

### DEC-LOCAL-13: paginación client-side de la matriz
- **Contexto**: la matriz crece al mostrar el catálogo completo.
- **Opcion elegida**: paginación client-side reutilizando `ui/pagination` (catálogo ~31).
- **Alternativas**: server-side (paginar `GET /api/capabilities`) → YAGNI, más superficie.
- **Consecuencias**: simple; si el catálogo creciera mucho, revisitar server-side. Reversible.
- **Session**: S1 (design)

## Acceptance checkpoints

- [ ] **Funcional**: internal-admin con todos los grants explícitos (sin `*`); crear rol exige `:create`; matriz pagina.
- [ ] **Tests**: suite BE + front verde; tests RBAC propagados.
- [ ] **Rules**: RULE-003 respetada (can.ts intacto), RULE-002 (scope) intacta.
- [ ] **Integration**: regresión effectiveCaps/guards/endpoints (REQ-PRESERVE-01) + filtros matriz (REQ-PRESERVE-02).
- [ ] **Docs**: SPEC-backend-rbac propagada; KB `jormat_docs` si aplica.
