---
id: SPEC-JOR-145-soft-delete-is-active
project: jormat-evolution
ticket: JOR-145
status: done
---

# Unificar soft-delete a is_active (dominio/datos): 17 tablas

# Unificar soft-delete a is_active (dominio/datos): 17 tablas

## Executive summary — lo que estas aprobando

**Que se quiere**: hoy conviven tres convenciones de borrado logico (`in_status` smallint en inventario, `disabled_at` timestamp en users/customers, y varias tablas sin columna de estado). Esta mejora las unifica a una sola: `is_active smallint NOT NULL DEFAULT 1` (1=activo, 0=borrado), por [[RULE-database-001]]. Reduce el riesgo de olvidar cual columna mirar en cada query nueva y habilita un unico predicado de "vivo".

**Decisiones criticas**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | `in_status` NO se dropea: queda reservado para el estado de falla del item; se agrega `is_active` al lado | Evita reinterpretar datos y preserva una feature futura |
| 2 | `disabled_at` se DROPEA en users/customers; users expone `isActive` (boolean) en vez de `disabledAt` | Cambia el contrato publico de users -> ripple al front (admin de usuarios). Se pierde la fecha de baja (queda solo activo/inactivo). Decision del dev 2026-08-13 |
| 3 | `trucks` queda FUERA (lo rehace [[JOR-147]] app-native con su propio is_active) | Evita doble trabajo sobre trucks |

**Riesgos principales y como los mitigamos**:

- **Dropear `disabled_at` rompe el front de usuarios** -> se migra el contrato a `isActive` y se actualizan `types/rbac.ts`, `UsersTable`, `UsersView` en el mismo ticket.
- **Un read que olvide filtrar `is_active=1` expondria filas borradas** -> el switch reemplaza cada filtro viejo por `is_active=1`; regresion de soft-delete lo verifica.
- **Migracion destructiva (drop) irreversible** -> expand-contract: expand aditiva primero, contract solo tras codigo verde; `down()` best-effort.

**Que NO se hace**: trucks (JOR-147), RBAC/acceso (JOR-146), workspaces (sigue hard-delete).

**Tamano estimado**: 1 session (T2). La parte mas riesgosa es el drop de `disabled_at` + el ripple al front.

**Como vas a saber que funciona**: borrar un item/cliente/usuario lo saca de los listados (no del disco); reactivar un usuario lo vuelve a activo; re-crear un RUT dado de baja no colisiona; la suite queda verde.

---

## Purpose

Unificar el borrado logico de 17 tablas de negocio/datos a `is_active smallint 1/0` (RULE-database-001), reemplazando `in_status` (activeness) y `disabled_at`. Frontera de lectura: los reads que alimentan al front omiten `is_active=0`, con la excepcion del listado de administracion de usuarios (muestra inactivos para reactivarlos).

## Requirements

### REQ-IMPROVE-01: is_active como unico flag de borrado logico

> **Que cambia**: toda tabla de negocio/datos (17) usa `is_active smallint 1/0`. Los reads de vivos filtran `is_active=1`; los deletes marcan `is_active=0` (no borran fisico).
> **Por que**: eliminar la convivencia de convenciones (in_status/disabled_at/ninguna) que hace fragil cada query nueva.

El sistema MUST usar `is_active` (smallint, 1=activo, 0=borrado) como unica fuente de activeness en las 17 tablas. Los reads que alimentan al front MUST filtrar `is_active=1`. Los deletes MUST hacer soft-delete (`is_active=0`), sin hard-delete salvo lo documentado.

**Actor**: system · **Layers**: database, backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: soft-delete inventario
- **GIVEN** un item activo, **WHEN** se elimina via repo, **THEN** `is_active=0`, la fila persiste y no aparece en el GET de vivos.

#### Scenario: catalogos_repuestos pasa de hard a soft
- **GIVEN** un catalogo, **WHEN** se elimina, **THEN** `is_active=0` (antes hacia `.del()` fisico), ausente de los reads.

</details>

#### Acceptance
Borrar un registro lo saca de los listados del front pero sigue en la DB.

### REQ-IMPROVE-02: users expone isActive (boolean); front migra

> **Que cambia**: el DTO de users deja de exponer `disabledAt` (fecha) y expone `isActive: boolean`. El front de administracion de usuarios lee `isActive` para el estado y ya no muestra la fecha de baja.
> **Por que**: `disabled_at` se dropea; el estado activo/inactivo se deriva de `is_active`.

El sistema MUST exponer `isActive: boolean` en el DTO publico de users (`is_active === 1`) y el front MUST consumirlo para el estado. El display de la fecha de baja se elimina.

**Actor**: admin · **Layers**: backend, api, frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: reactivar usuario
- **GIVEN** un usuario con `is_active=0`, **WHEN** el admin lo reactiva, **THEN** `is_active=1` y la tabla lo muestra activo.

</details>

#### Acceptance
En la vista de usuarios se ve activo/inactivo y se puede alternar; ya no aparece fecha de baja.

### REQ-PRESERVE-01: in_status conservado (reservado), no leido como activeness

> **Que cambia**: nada visible. `in_status` se conserva en las 11 tablas de inventario pero deja de leerse/escribirse como flag de activo.
> **Por que**: reservarlo para el estado de falla del item (feature futura), sin reinterpretar datos.

El sistema MUST conservar la columna `in_status`; ningun read/delete MUST leerla/escribirla como activeness. El comportamiento de "lectura de vivos" MUST ser identico al previo (ahora via `is_active`).

**Actor**: system · **Layers**: database, backend

### REQ-PRESERVE-02: aislamiento y funcionalidad intactos (regression)

> **Que cambia**: nada. El aislamiento por `workspace_id` (`tenantScoped`), la paginacion, filtros y el resto del comportamiento no cambian.
> **Por que**: una mejora no debe romper lo que funciona (DET-7).

El sistema MUST preservar el aislamiento por workspace y toda la funcionalidad existente. El unico parcial de RUT de customers MUST seguir permitiendo re-alta de un RUT dado de baja (ahora `WHERE is_active=1`).

**Actor**: system · **Layers**: database, backend

### REQ-PRESERVE-04: la cascada de borrado de workspace sigue eliminando users FISICO

> **Que cambia**: nada de comportamiento. `workspaces.service.ts` borra un workspace y en cascada hace `.del()` fisico de sus `users` (y memberships). Ese `.del()` de users se CONSERVA hard (no pasa a soft), y se documenta como excepcion a RULE-database-001.
> **Por que**: `workspaces` se borra FISICO (fuera de alcance, sigue hard). Soft-deletear users hijos de un workspace fisicamente eliminado dejaria filas `is_active=0` huerfanas apuntando a un workspace inexistente. La FK `users.workspace_id` es `onDelete CASCADE`, coherente con borrado fisico.

El sistema MUST mantener el borrado FISICO de `users` en la cascada de `workspaces.service.ts` (no convertirlo a soft-delete). El path de soft-delete de users (disable/reactivate del admin) es independiente de esta cascada. Se documenta la excepcion hard-delete en el codigo (RULE-database-001 exige documentar excepciones).

**Actor**: system · **Layers**: backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: borrar workspace elimina users fisico (sin huerfanos)
- **GIVEN** un workspace con usuarios, **WHEN** se borra el workspace, **THEN** sus users se eliminan FISICO (no quedan filas `is_active=0` huerfanas apuntando al workspace borrado).

</details>

### REQ-PRESERVE-03: users-admin lista activos e inactivos

> **Que cambia**: nada. El listado de administracion de usuarios sigue devolviendo activos e inactivos (para reactivar).
> **Por que**: es la excepcion documentada a "omitir is_active=0" (management view).

El listado de users MUST devolver activos e inactivos con el flag `isActive`; NO debe filtrar `is_active=1` (a diferencia del resto de reads).

**Actor**: admin · **Layers**: backend

## Artifacts

### Models (cambios de schema)

| Table (x17) | Column | Type | Nullable | Default | Description |
|-------|--------|------|----------|---------|-------------|
| 17 tablas | is_active | smallint | no | 1 | flag de borrado logico (1=activo, 0=borrado) |
| users, customers | disabled_at | (DROP) | — | — | se elimina; reemplazado por is_active |

**Tablas (17)**: providers, categories, applications, items, locations, item_references, item_providers, item_categories, application_items, item_warehouses, item_warehouse_locations (11 desde `in_status`); users, customers (2 desde `disabled_at`); warehouses, attachments, catalogos_repuestos, usage_metrics (4 sin estado previo).

**Indexes**:
| Columns | Type | Unique | Purpose |
|---------|------|--------|---------|
| item_providers (item_id, is_active) | btree | no | lectura de vivos (equivalente al de in_status) |
| customers (workspace_id, rut) WHERE is_active=1 | btree | si | re-alta de RUT dado de baja |

## Tasks

### Session 1 — Unificar soft-delete a is_active [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Migracion expand: agregar is_active + backfill en 17 tablas + indices is_active | REQ-IMPROVE-01 | developer | — | backend/jormat-api/migrations/20260813000000_soft_delete_is_active_expand.ts | migrate:status + backfill sin mismatches (items 0/12, customers 0/5) | migrate:rollback | DET-8, RULE-database-001 | done | 1 |
| S1.T2 | Switch de codigo: in_status/disabled_at -> is_active (inventario/catalogos/customers/users/auth) + DTO users isActive + front usuarios | REQ-IMPROVE-01, REQ-IMPROVE-02, REQ-PRESERVE-01, REQ-PRESERVE-03 | developer | S1.T1 | backend/jormat-api/src/{items,catalogos,customers,users,auth}, front/jormat-front/src/{types/rbac.ts,components/config/users,services/api/config/users.ts} | tsc backend+front verde (fuente); grep sin residuos; DT-18/DT-19 intactos | git revert | DET-5, DET-10, RULE-database-001 | done | 1 |
| S1.T2b | Documentar excepcion hard-delete de users en la cascada de `workspaces.service.ts` (comentario; sin cambio de comportamiento, users se sigue borrando fisico) | REQ-PRESERVE-04 | developer | S1.T2 | backend/jormat-api/src/workspaces/workspaces.service.ts | comentario presente; el `.del()` de users se conserva | git revert | RULE-database-001, DET-40 | done | 1 |
| S1.T3 | Actualizar tests al nuevo contrato (4 specs backend + 16 tests/stories front) + auditar `seeds/01_initial_data.ts` (DEFAULT 1) + regresion soft-delete | REQ-PRESERVE-02, REQ-PRESERVE-04 | developer | S1.T2b | backend/jormat-api/src/**/*.spec.ts, backend/jormat-api/seeds/01_initial_data.ts, front/jormat-front/src/**/*.test.tsx | suite backend + front VERDE; seeds preservan comportamiento; regresion (borrar->ausente; reactivar; re-alta RUT; borrar workspace elimina users fisico sin huerfanos) | git revert | DET-7, DET-13 | done | 1 |
| S1.T4 | Migracion contract: drop disabled_at (users, customers) + drop indice viejo | REQ-IMPROVE-02 | developer | S1.T3 | backend/jormat-api/migrations/20260813000001_soft_delete_drop_disabled_at.ts | DET-40: verificar 0 lecturas de disabled_at en src; migrate ok; app health ok | migrate:rollback | DET-8, DET-40 | done | 1 |
| S1.T5 | Docs: data-model users/customers + backend modules + nota jormat_docs | REQ-IMPROVE-01 | developer | S1.T4 | jormat_docs/data-model/{users,customers}.md, jormat_docs/backend/modules/{customers,catalogos}.md, jormat_docs/data-model/README.md | docs reflejan is_active; sin refs a disabled_at | git revert | DET-37 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en ## Sessions, correr suite+coverage, quality review aislado, self-report verification, decidir continue/close | — | reviewer | S1.T1, S1.T2, S1.T2b, S1.T3, S1.T4, S1.T5 | ticket | gate persistido + decision + reviewer approved | (no aplica) | DET-20, DET-23, DET-33 | done | 1 |

## Constraints

- [[RULE-database-001]]: is_active smallint 1/0 como unica convencion de soft-delete; in_status reservado; joins filtran is_active=1.
- [[RULE-testing-coverage-threshold-002]]: coverage no baja de 90.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Read sin filtro is_active expone borrados | medium | fuga de datos borrados al front | switch reemplaza cada filtro; regresion de soft-delete |
| Drop disabled_at rompe front usuarios | high (si no se migra) | vista usuarios rota | REQ-IMPROVE-02 migra el contrato + front en el mismo ticket |
| Drop irreversible | low | perdida de la fecha de baja | decision del dev asumida; expand-contract; down best-effort |
| Huerfanos por soft-delete en cascada de workspace | medium (si se cambiara) | filas is_active=0 apuntando a workspace borrado | DEC-LOCAL-02: la cascada conserva hard-delete de users; regresion lo verifica |

## Open questions

_(ninguna — la decision de users (Opcion A) y la cascada de workspaces (DEC-LOCAL-02) estan resueltas)_

## Decisions

### DEC-LOCAL-02: la cascada de borrado de workspace conserva hard-delete de users
- **Contexto**: `workspaces.service.ts` borra un workspace y en cascada hace `.del()` fisico de sus users y memberships; el ticket exige resolver esto antes de tocar ese archivo.
- **Drivers**: consistencia de la convencion vs integridad referencial (no dejar huerfanos).
- **Opcion elegida**: mantener el `.del()` de users HARD (fisico). `workspaces` se borra fisico (sigue hard, fuera de alcance), asi que sus hijos deben irse fisico; soft-deletearlos dejaria filas `is_active=0` apuntando a un workspace inexistente.
- **Alternativas**: pasar users a soft en la cascada (descartada: crea huerfanos); dejar sin definir (descartada: el ticket lo exige resuelto).
- **Consecuencias**: el path de soft-delete de users (disable admin) y el hard-delete de la cascada coexisten, documentado como excepcion RULE-database-001. workspace_memberships lo maneja [[JOR-146]].
- **Session**: 1

### DEC-LOCAL-03: `attachments` es excepcion hard-delete (documentada); `warehouses` si filtra is_active
- **Contexto**: hallazgo del dual quality review (DET-35). `attachments` recibio `is_active` por la migracion transversal pero `removeImage` hace `.del()` fisico; `getBodegas` (warehouses) no filtraba `is_active=1`.
- **Opcion elegida**: (a) `attachments` se mantiene HARD-delete (una imagen es un archivo; soft-deletear la fila dejaria un registro huerfano sin archivo real) y se documenta como excepcion en `items.repository.ts:removeImage` (RULE-database-001); su columna `is_active` queda vestigial. (b) `getBodegas` SI se corrige: `warehouses` es catalogo real, agrega `.where('is_active', 1)` como sus vecinos.
- **Consecuencias**: attachments queda como segunda excepcion documentada (junto a la cascada de workspaces); warehouses cumple REQ-IMPROVE-01.
- **Session**: 1 (fix post-review)

### DEC-LOCAL-01: users expone isActive (boolean), se dropea disabled_at, se migra el front
- **Contexto**: dropear disabled_at rompe el DTO de users que el front consume (estado + fecha de baja).
- **Drivers**: cumplir RULE-database-001 (una sola convencion) vs preservar el dato de fecha.
- **Opcion elegida**: Opcion A — dropear disabled_at, DTO expone `isActive` boolean, migrar front, perder el display de fecha.
- **Alternativas**: B conservar disabled_at como timestamp de auditoria (descartada por el dev); C shim derivado con updated_at (descartada por dato enganoso).
- **Consecuencias**: contrato de users mas simple; se pierde cuando se desactivo un usuario.
- **Session**: 1

## Acceptance checkpoints

- [ ] **Funcional**: soft-delete en las 17 tablas; users isActive; reactivar; re-alta RUT.
- [ ] **Tests** (DET-37 dim4): specs backend + tests front actualizados y en VERDE + regresion soft-delete.
- [ ] **Rules**: RULE-database-001 respetada (in_status reservado, joins filtran is_active=1).
- [ ] **Integration**: no rompe aislamiento por workspace ni el resto (regression).
- [ ] **Docs oficiales** (DET-37 dim1): data-model + backend modules actualizados.
- [ ] **Planning-completeness**: registrada.
