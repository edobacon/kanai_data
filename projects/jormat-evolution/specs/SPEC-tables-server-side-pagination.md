---
id: SPEC-tables-server-side-pagination
project: jormat-evolution
ticket: JOR-068
status: done
---

# Paginación server-side para todas las tablas

# Paginación server-side para todas las tablas

## Executive summary — lo que estas aprobando

**Que se quiere**: que el "Mostrando 1 a 10 de N" + páginas + orden + filtros de todas las tablas se calculen en el **backend** (no en el cliente). Hoy cada lista trae TODO el dataset y pagina/filtra en memoria; se cambia a que el front pida `page`/`limit`/`sort`/filtros y el backend devuelva la página + total real.

**Decisiones críticas** (ya tomadas con el dev):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Server-side **completo** (paginación + filtro + orden), no solo paginación | Filtrar solo la página visible da resultados incorrectos; es el alcance real |
| 2 | Reusar el andamiaje backend existente (`paginate.ts` + `PaginationQueryDto`) | No se crea infra nueva; el backend es adopción |
| 3 | `DataTable` gana modo server **opt-in** (`manualPagination`) sin romper client-side | Componente compartido por 6 tablas — no se puede romper ninguna (REQ-PRESERVE) |
| 4 | Envelope uniforme `{ data, page, limit, total }` en todos los GET de listado | Contrato consistente; cambia el tipo de respuesta del front por endpoint |

**Riesgos y mitigaciones**:
- **Regresión transversal** (cambiar DataTable + contrato de 6 endpoints) → modo server opt-in (client-side intacto sin las props nuevas) + suite de regresión front+back verde por session + baseline al inicio.
- **Fuga de tenant en queries paginadas de DB** → `workspace_id` en el where ANTES de `applyPagination` + count sobre el mismo scope (RULE-global-002).
- **Sort injection** → ya cubierto por la whitelist `sortableColumns` de `paginate.ts`.

**Que NO se hace**: no se crean vistas/entidades nuevas; no se migran datos; no se cambia el look de la barra de paginación (ya existe). Búsqueda con debounce y sincronización con URL query params quedan como could (backlog).

**Tamaño estimado**: 5 sessions (~S1 infra front, S2 piloto Items e2e, S3 rollout backend, S4 rollout frontend, S5 regresión+cobertura+docs). Las más riesgosas: S1 (DataTable compartido) y S4 (recablear todas las vistas).

**Como vas a saber que funciona**: abro cualquier tabla, el "Mostrando X a Y de N" y las páginas vienen del backend; filtro/ordeno y el total refleja el filtro sobre TODO el dataset (no solo la página); cambio de página y el front pide la siguiente al backend; ninguna tabla se rompe; coverage ≥90.

---

## Purpose

Migrar la paginación de todas las tablas de client-side (TanStack en memoria sobre el dataset completo) a **server-side**: cada endpoint de listado acepta `PaginationQueryDto` (page/limit/sort/filtros) y devuelve `PaginatedResult<T>` (`{data,page,limit,total}`) con filtro/orden aplicados en el backend; el `DataTable` opera en modo controlado (manualPagination) consumiendo el total del server. Actor: usuario de cualquier listado. Valor: totales/paginación correctos y escalables (no traer 1.248 filas al cliente).

## Analysis — estado actual vs delta

**Estado actual (baseline)**:
- Backend: los GET de listado devuelven arrays planos, sin params; filtro/orden inexistentes o parciales. Andamiaje `paginate.ts` + `PaginationQueryDto` presente pero **sin uso**.
- Frontend: hooks/servicios traen el array completo (sin params); `DataTable` usa `getPaginationRowModel()` (client-side) y calcula `total` del largo del array filtrado en memoria; los `*ListView` aplican `applyFilters` en memoria.

**Delta**:
- Backend: cada controller de listado recibe `@Query() PaginationQueryDto` (+ sus filtros de dominio) y devuelve `PaginatedResult<T>`; el service resuelve con `resolvePagination` (stub: filtra+ordena+slice el array; DB: where `workspace_id` + filtros → `count` + `applyPagination`).
- Frontend: `DataTable` gana modo server opt-in; los servicios envían page/limit/sort/filtros; los hooks propagan estado de paginación; los `*ListView` pasan a paginación/filtrado controlado (server).

## Requirements

### REQ-IMPROVE-01: Endpoints de listado devuelven envelope paginado

> **Que cambia**: cada GET de listado deja de devolver un array plano y devuelve `{ data, page, limit, total }` con la página pedida y el total real.
> **Por que**: el front necesita el total calculado en backend para "Mostrando X a Y de N" y para paginar sin traer todo.

El sistema MUST hacer que los endpoints de listado (items, ventas/documentos, pagos-clientes, compras/facturas-proveedor, users, roles, catálogos con tabla) acepten `PaginationQueryDto` y devuelvan `PaginatedResult<T>`, reusando `common/pagination/paginate.ts`.

<details><summary>Scenarios de validacion</summary>

#### Scenario: envelope con total
- **GIVEN** un endpoint de listado con N registros (stub o DB)
- **WHEN** se hace `GET ...?page=1&limit=10`
- **THEN** responde `{ data: [≤10], page:1, limit:10, total:N }`

#### Scenario: page 2
- **GIVEN** N > 10
- **WHEN** `?page=2&limit=10`
- **THEN** `data` son los registros 11–20 y `total` sigue siendo N

</details>

### REQ-IMPROVE-02: Filtro y orden calculados en el backend

> **Que cambia**: los filtros (ej. Marca/Categoría/Estado en Items) y el orden se aplican en el backend sobre TODO el dataset, no solo sobre la página visible.
> **Por que**: con paginación server-side, filtrar en el cliente solo la página da resultados y totales incorrectos.

El sistema MUST aplicar filtros de dominio + orden (`sort=campo:asc|desc`, validado contra whitelist) en el backend antes de paginar, y `total` MUST reflejar el conjunto filtrado.

<details><summary>Scenarios de validacion</summary>

#### Scenario: filtro afecta el total
- **GIVEN** Items con filtro Estado=sin_stock
- **WHEN** `GET items?filter/estado=sin_stock&page=1&limit=10`
- **THEN** `data` son solo sin_stock y `total` = cantidad total de sin_stock (no del catálogo completo)

#### Scenario: orden server-side
- **WHEN** `?sort=precio:desc`
- **THEN** los registros vienen ordenados por precio desc a través de las páginas (no solo dentro de la página)

#### Scenario: sort inválido cae al default
- **WHEN** `?sort=columna_inexistente:asc`
- **THEN** se ignora y aplica el orden por defecto (sin error, anti-inyección)

</details>

### REQ-IMPROVE-03: DataTable en modo server + tablas consumiendo el total del backend

> **Que cambia**: la barra "Mostrando X a Y de N" y las páginas se alimentan del envelope del backend; cambiar de página/orden dispara una request.
> **Por que**: es lo que el dev pidió — total/rango/páginas calculados en backend.

El sistema MUST extender `DataTable` con modo server opt-in (`manualPagination` + `pageCount`/`total`/`page`/`onPageChange`/`onSortingChange` controlados) y cada `*ListView` MUST usarlo pasando el estado de paginación al hook/servicio.

<details><summary>Scenarios de validacion</summary>

#### Scenario: navegación server-side
- **GIVEN** una tabla en modo server con total del backend
- **WHEN** el usuario va a la página 2
- **THEN** el front pide `?page=2` y renderiza esa página; "Mostrando 11 a 20 de N"

</details>

### REQ-PRESERVE-01: Las tablas en modo client-side no se rompen

> **Que cambia**: nada para quien no opte por modo server — el comportamiento client-side de `DataTable` queda idéntico.
> **Por que**: `DataTable` es compartido; el cambio debe ser aditivo.

El sistema MUST mantener el comportamiento client-side de `DataTable` cuando NO se pasan las props de modo server (tests existentes verdes).

### REQ-PRESERVE-02: Aislamiento de tenant en queries paginadas de DB

El sistema MUST filtrar `workspace_id` en las queries paginadas de DB (users/roles/catálogos) ANTES de paginar, y el `count` MUST usar el mismo scope (RULE-global-002).

## Changes

### Modified
- `backend/.../items|sales|payments|purchases|users|permissions|catalogos` controllers+services → aceptar `PaginationQueryDto`, devolver `PaginatedResult<T>`, filtro/orden server-side.
- `front/.../components/ui/data-table/data-table.tsx` → modo server opt-in.
- `front/.../services/api/*` + `hooks/*` + `*ListView` → enviar params, consumir envelope, paginación controlada.
- `front/.../test/msw/handlers/*` → mocks devuelven envelope + respetan page/limit/filtros.
- Tipos: `ItemListItem[]` → `Paginated<ItemListItem>` etc.

### Added
- `front/.../lib/api/pagination.ts` (o similar): tipo `Paginated<T>` + helper de params. Reusable por todos los servicios.
- Hook patrón `useServerTable`/estado de paginación (page/limit/sort/filtros) compartido por los ListView.

## Tasks

### Session 1 — Infra frontend: DataTable modo server + tipo Paginated + patrón de estado [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Extender `DataTable` con modo server opt-in (manualPagination + pageCount/total/page/onPageChange + sorting controlado); Pagination usa total/page de props | REQ-IMPROVE-03, REQ-PRESERVE-01 | developer | — | `front/jormat-front/src/components/ui/data-table/data-table.tsx` | vitest data-table (client + server) | git revert | DET-16, RULE-frontend-001, RULE-global-001 | done | 1 |
| S1.T2 | Tipo `Paginated<T>` + helper de query params (`toPaginationParams`) en `lib/api/pagination.ts` | REQ-IMPROVE-01 | developer | — | `front/jormat-front/src/lib/api/pagination.ts` | vitest + typecheck | git revert | DET-2, RULE-api-client-001 | done | 1 |
| S1.T3 | Tests del DataTable server-mode (navegación, total del server, sorting controlado) + preservar client-mode | REQ-IMPROVE-03, REQ-PRESERVE-01 | developer | S1.T1 | `.../data-table/data-table.test.tsx` | vitest + coverage | git revert | DET-7, RULE-frontend-002 | done | 1 |
| **S1.GATE** | Gate de sync S1 (T2): quality review + coverage ≥90 | — | reviewer | S1.T3 | ticket | gate persistido | — | DET-20, DET-23 | done | 1 |

### Session 2 — Piloto end-to-end: Items (backend paginado/filtrado + frontend server) [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Items backend: controller recibe `PaginationQueryDto` + filtros de catálogo; service filtra/ordena/pagina el stub con `resolvePagination` + slice; devuelve `PaginatedResult` | REQ-IMPROVE-01, REQ-IMPROVE-02 | developer | S1.T2 | `backend/jormat-api/src/items/items.controller.ts`, `.../items/items.service.ts` | jest items + build | git revert | DET-5, RULE-global-002 | done | 2 |
| S2.T2 | Items frontend: servicio+hook envían page/limit/sort/filtros (AbortSignal), consumen envelope; ItemsListView usa DataTable server-mode; MSW mock devuelve envelope filtrado | REQ-IMPROVE-03 | developer | S2.T1, S1.T1 | `front/.../services/api/inventario/items.ts`, `hooks/useItems.ts`, `components/items/list/ItemsListView/*`, `test/msw/handlers/items.ts` | vitest items | git revert | RULE-api-client-001, DET-16 | done | 2 |
| S2.T3 | Tests e2e-ish de Items (envelope+filtro+navegación) + regresión ItemsListView | REQ-IMPROVE-01, REQ-IMPROVE-02, REQ-PRESERVE-01 | developer | S2.T2 | `.../items/*.test.tsx`, backend items spec | vitest + jest + coverage | git revert | DET-7, RULE-frontend-002 | done | 2 |
| **S2.GATE** | Gate de sync S2 (T3): patrón e2e validado (contrato + UI) + smoke | — | reviewer | S2.T3 | ticket | gate persistido | — | DET-20, DET-23, DET-36 | done | 2 |

### Session 3 — Rollout backend (resto de endpoints) [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S3.T1, S3.T2, S3.T3], [S3.T4, S3.T5, S3.T6]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Ventas/documentos backend paginado+filtrado (stub) | REQ-IMPROVE-01, REQ-IMPROVE-02 | developer | S2.T1 | `backend/.../sales/*` | jest sales | git revert | DET-5 | done | 3 |
| S3.T2 | Pagos-clientes backend paginado+filtrado (stub) | REQ-IMPROVE-01, REQ-IMPROVE-02 | developer | S2.T1 | `backend/.../payments/*` | jest payments | git revert | DET-5 | done | 3 |
| S3.T3 | Compras/facturas-proveedor backend paginado+filtrado (stub) | REQ-IMPROVE-01, REQ-IMPROVE-02 | developer | S2.T1 | `backend/.../purchases/*` | jest purchases | git revert | DET-5 | done | 3 |
| S3.T4 | Users backend paginado (DB Knex: where workspace_id + count + applyPagination) | REQ-IMPROVE-01, REQ-PRESERVE-02 | developer | S2.T1 | `backend/.../users/*` | jest users | git revert | RULE-global-002, DET-5 | done | 3 |
| S3.T5 | Roles backend paginado (DB) | REQ-IMPROVE-01, REQ-PRESERVE-02 | developer | S2.T1 | `backend/.../permissions/*` | jest | git revert | RULE-global-002 | done | 3 |
| S3.T6 | Catálogos con tabla (mantenedores) backend paginado (DB) | REQ-IMPROVE-01, REQ-PRESERVE-02 | developer | S2.T1 | `backend/.../catalogos/*` | jest | git revert | RULE-global-002 | done | 3 |
| **S3.GATE** | Gate de sync S3 (T3): todos los endpoints con envelope + tenant aislado | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4, S3.T5, S3.T6 | ticket | gate persistido | — | DET-20, DET-23, RULE-global-002 | done | 3 |

### Session 4 — Rollout frontend (resto de vistas) [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S4.T1, S4.T2, S4.T3, S4.T4, S4.T5]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Ventas/documentos frontend server-side (servicio/hook/ListView/MSW) | REQ-IMPROVE-03 | developer | S3.T1, S1.T1 | `front/.../ventas/list/*`, servicios/hooks/msw ventas | vitest ventas | git revert | RULE-api-client-001, DET-16 | done | 4 |
| S4.T2 | Pagos-clientes frontend server-side | REQ-IMPROVE-03 | developer | S3.T2, S1.T1 | `front/.../payments/list/*`, servicios/hooks/msw pagos | vitest payments | git revert | RULE-api-client-001 | done | 4 |
| S4.T3 | Compras/facturas-proveedor frontend server-side | REQ-IMPROVE-03 | developer | S3.T3, S1.T1 | `front/.../compras/list/*`, servicios/hooks/msw compras | vitest compras | git revert | RULE-api-client-001 | done | 4 |
| S4.T4 | Usuarios frontend server-side | REQ-IMPROVE-03 | developer | S3.T4, S1.T1 | `front/.../config/usuarios/*` | vitest users | git revert | RULE-api-client-001 | done | 4 |
| S4.T5 | Roles + catálogos frontend server-side | REQ-IMPROVE-03 | developer | S3.T5, S3.T6, S1.T1 | `front/.../config/roles/*`, catálogos | vitest | git revert | RULE-api-client-001 | done | 4 |
| **S4.GATE** | Gate de sync S4 (T3): todas las vistas server-side + smoke | — | reviewer | S4.T1, S4.T2, S4.T3, S4.T4, S4.T5 | ticket | gate persistido | — | DET-20, DET-23, DET-36 | done | 4 |

### Session 5 — Regresión + cobertura + docs [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Suite completa front + backend verde; coverage global ≥90 | REQ-PRESERVE-01 | developer | S4.GATE | tests | vitest + jest + coverage | — | DET-7, RULE-testing-coverage-threshold-002 | done | 5 |
| S5.T2 | Docs: actualizar contrato de paginación en `jormat_docs/api/` (envelope + params) | REQ-IMPROVE-01 | developer | S5.T1 | `jormat_docs/api/README.md` | lectura | git revert | RULE-global-001 | done | 5 |
| **S5.GATE** | Gate de cierre (T3): 0 regresiones, coverage ≥90, docs | — | reviewer | S5.T1, S5.T2 | ticket | gate persistido | — | DET-13, DET-23 | done | 5 |

## Constraints

- RULE-api-client-001: GET propaga AbortSignal + params.
- RULE-global-002: tenant isolation en queries paginadas de DB.
- RULE-frontend-001/002: DataTable + tests.
- RULE-testing-coverage-threshold-002: coverage global ≥90.
- Reuso obligatorio de `common/pagination/paginate.ts` (DEC-LOCAL-01).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `common/pagination/paginate.ts` + `PaginationQueryDto` | internal | Andamiaje backend a adoptar | Ninguno — ya existe |
| SPEC-frontend-ui-data-layout | internal | DataTable base | Extensión aditiva |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Romper una tabla al cambiar DataTable | medium | alto | modo server opt-in; client-mode intacto sin props nuevas; tests de ambos modos |
| Fuga de tenant en count/query DB | low | alto | where workspace_id antes de paginar; count del mismo scope |
| MSW mocks desalineados con el envelope | medium | medio | actualizar handlers en la misma task que el servicio |

## Decisions (cerradas durante design)

### DEC-LOCAL-01: reusar el andamiaje de paginación existente
- **Opcion elegida**: adoptar `paginate.ts` + `PaginationQueryDto` (no crear infra nueva). DET-32 = reduce.
- **Consecuencias**: consistencia + menos código; stubs usan `resolvePagination`+slice, DB usa `applyPagination`+count.

### DEC-LOCAL-02: DataTable modo server opt-in
- **Opcion elegida**: props opcionales de paginación controlada; sin ellas, client-side idéntico.
- **Alternativas**: componente nuevo (descartado — duplicación); breaking change (descartado — rompe 6 tablas).

## Acceptance checkpoints

- [ ] **Funcional**: REQ-IMPROVE-01/02/03 pasan en cada tabla
- [ ] **Tests**: envelope + filtro/orden server + navegación; regresión de client-mode
- [ ] **Rules**: RULE-global-002 (tenant) en queries DB; AbortSignal en GET
- [ ] **Integration**: las 6 tablas paginan/filtran server-side sin romperse; coverage ≥90
- [ ] **Docs**: contrato de paginación documentado (o n/a+razón)
