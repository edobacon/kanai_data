---
id: SPEC-items-connect-db
project: jormat-evolution
ticket: JOR-081
status: done
---

# Conectar servicios de items a DB (modelo existente JOR-099)

# Conectar servicios de items a DB (modelo existente JOR-099)

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico vive en Requirements / Artifacts / Tasks.*

**Que se quiere**: hoy el modulo de items tiene el LISTADO conectado a la DB real (Knex), pero el resto de los endpoints (resumen, detalle, crear, editar) devuelven datos hardcodeados (`STUB_ITEMS`/`STUB_DETAIL`). Este ticket los conecta al modelo que ya existe (JOR-099: `items` + tablas N:M + catalogos), agrega la baja logica (falta exponerla) y expone en el DTO tres campos que el modelo ya trae (`priority`, `failure`, y el costo de compra gateado por RBAC). El contrato HTTP no cambia: el front sigue viendo la misma forma de respuesta, solo que con datos reales.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Costo de compra se expone como campo nuevo `costoCompra` en `ItemDto`/`ItemDetailDto`, presente SOLO si el usuario tiene `items.parts:cost-view` | Es una adicion al contrato de respuesta + gating a nivel de campo (no de endpoint); define como el front lee el costo |
| 2 | El costo se gatea con `items.parts:cost-view` (JOR-077), NO con `items.parts:critical` | El ticket original decia `critical` (previo a JOR-077); `cost-view` es la capability dedicada a costo/margen, ya sembrada y asignada a gerencia+jefaturas (DEC-LOCAL-2 del ticket) |
| 3 | En create/update, los arrays `categorias`/`aplicaciones`/`proveedores` se interpretan como **IDs enteros** de las tablas maestras (`categories.id`/`applications.id`/`providers.id`), no como nombres | El schema es normalizado y el detalle round-trippea por id (comentario `MultiSelect por id` del stub). Si el front envia nombres, es ajuste de follow-up. Ver OPEN-Q-1 |
| 4 | La baja es logica (`items.in_status = 0`) via nuevo endpoint `DELETE /inventario/items/:id`, gateado por `items.parts:edit` | El modelo ya tiene `in_status`; no hay borrado fisico. El listado real ya filtra `in_status = 1`, asi que la baja lo saca del listado sin romper FKs |

**Riesgos principales y como los mitigamos**:

- **Los mocks de Knex no muerden la persistencia N:M (Learn L1: mutation ~1% en el repo)** → S1 y S2 se validan con **integration tests contra la DB efimera real** (`test:e2e`, Postgres healthy), no con mocks. El write path (S2) corre ademas una **matriz destructiva** (create→verifica pivotes; update→re-sync sin duplicar/huérfanos; delete→`in_status=0` + ausente del listado).
- **Exponer `priority`/`failure`/`costo` toca el path del LISTADO que HOY funciona** → REQ-PRESERVE-01 fija la forma del listado; los specs existentes de repo/service/controller corren como regression en cada gate.
- **Firmas sincronas → async** (`getSummary`/`findOne`/`create`/`update` pasan a `Promise`) rompe el controller si no se propaga el `await`/tipo → se actualiza controller + specs en la misma task; typecheck + build en el gate.
- **Filtro de tenant omitido en las nuevas queries** (agujeros historicos D5/D6) → toda query nueva pasa por `tenantScoped(...)`; test de aislacion por workspace en el suite e2e.

**Que NO se hace en este ticket** (limites del scope):

- **Imagenes** de item (storage: archivo/path/tabla) — decision pendiente. Se deja el stub + comentario `DEUDA_TECNICA`.
- **Historial / kardex** de movimientos — falta tabla; requiere crear modelo + decidir alcance. Fuera de scope, `DEUDA_TECNICA`.
- Cambios en el front (`jormat-front`) — fuera del `execute_scope` (solo `backend/jormat-api/src/items/`).

**Tamano estimado**: 2 sessions ejecutables. **S1** (read paths, ~2h, tier T2) — bajo riesgo, desbloquea el carril front de detalle/resumen. **S2** (write paths + N:M, ~3h, tier T3 ⚑) — la mas riesgosa (persistencia N:M + matriz destructiva + dual-judge).

**Como vas a saber que funciona**:

- `GET /inventario/items/summary` devuelve conteos y marcas reales del catalogo del workspace (no los 4 stub).
- `GET /inventario/items/:id` devuelve un item real con sus referencias/proveedores/categorias/aplicaciones y stock por bodega; el costo aparece solo si tu rol tiene `cost-view`.
- `POST`/`PATCH` crean/editan y al re-consultar el detalle los cambios (incluidos los N:M) persisten en DB.
- `DELETE /inventario/items/:id` saca el item del listado (queda `in_status=0`, no se borra fisicamente).
- Suite `test:e2e` verde (incluye create/update/delete contra DB real + regression del listado).

---

## Purpose

Conectar a la DB (modelo JOR-099, tablas plural + `workspace_id`) los servicios de items que hoy son stub: resumen agregado, detalle, alta, edicion y baja logica. Preserva el contrato HTTP camelCase que el front ya consume y respeta la aislacion de tenant (`tenantScoped`). Es trabajo de **conexion**, no de modelado (el modelo ya existe).

## Requirements

### REQ-01: Resumen agregado real

> **Que cambia**: `GET /inventario/items/summary` deja de contar 4 items hardcodeados y devuelve los conteos (total / con stock / bajo stock / sin stock) y las marcas distintas del catalogo real del workspace.
> **Por que**: los KPIs y el facet de marca de la vista de listado no pueden derivarse de una pagina server-side; hoy mienten con datos stub.

El sistema MUST calcular el resumen con una query agregada sobre `items` (scoped por workspace, `in_status = 1`), reutilizando el mismo criterio de estado de stock que el listado (`SUM(item_warehouses.item_qty)` vs `critical_stock`).

**Actor**: user (rol con `items.parts:view`)
**Layers**: backend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: catalogo con items en varios estados
- **GIVEN** un workspace con items en_stock, bajo_stock y sin_stock sembrados
- **WHEN** GET /inventario/items/summary
- **THEN** `total` = count(items in_status=1), `conStock`/`bajoStock`/`sinStock` coinciden con el conteo por estado, `marcas` = marcas distintas ordenadas

#### Scenario: aislacion de tenant
- **GIVEN** items en workspace A y workspace B
- **WHEN** GET summary con contexto de workspace A
- **THEN** los conteos NO incluyen items de B

#### Scenario: catalogo vacio
- **GIVEN** workspace sin items
- **WHEN** GET summary
- **THEN** total=0, conteos=0, marcas=[]
</details>

### REQ-02: Detalle real por id

> **Que cambia**: `GET /inventario/items/:id` devuelve un item real con sus referencias, proveedores, categorias, aplicaciones, stock por bodega, resumen comercial y auditoria; 404 si no existe o esta dado de baja.
> **Por que**: hoy cualquier id conocido devuelve el mismo `STUB_DETAIL`.

El sistema MUST resolver el detalle desde `items` (scoped, `in_status=1`) + las tablas N:M (`item_references`, `item_providers`→`providers`, `item_categories`→`categories`, `application_items`→`applications`, `item_warehouses`→`warehouses`/`locations`) y mapearlo a `ItemDetailDto`. Item inexistente o `in_status=0` MUST devolver 404.

**Actor**: user (`items.parts:view`)
**Layers**: backend, database, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: detalle completo
- **GIVEN** un item con 2 referencias, 1 proveedor, 1 categoria, 2 aplicaciones y stock en 2 bodegas
- **WHEN** GET /inventario/items/:id
- **THEN** el DTO trae `referencias` (2), `proveedores`/`categorias`/`aplicaciones` (ids reales), `stockPorBodega` (2 entradas con bodega/stock/ubicacion), `auditoria` con usuario/fecha reales

#### Scenario: item inexistente
- **WHEN** GET /inventario/items/999999
- **THEN** 404 NotFound

#### Scenario: item dado de baja
- **GIVEN** un item con in_status=0
- **WHEN** GET /inventario/items/:id
- **THEN** 404 (no se expone lo dado de baja)
</details>

### REQ-03: Exponer `priority` y `failure`

> **Que cambia**: el listado y el detalle exponen `priority` (prioridad del repuesto) y `failure` (marca de falla), que el modelo ya trae y la query ya fetchea pero el mapper descarta.
> **Por que**: el front los necesita y ya estan en la DB; solo falta pasarlos por el DTO.

El sistema MUST incluir `priority: number` y `failure: number` en `ItemDto` (listado y detalle), poblados desde `items.priority`/`items.failure`.

**Actor**: user (`items.parts:view`)
**Layers**: backend, api

### REQ-04: Costo de compra gateado por RBAC (field-level)

> **Que cambia**: el listado y el detalle incluyen `costoCompra` (neto de compra) SOLO si el usuario tiene `items.parts:cost-view`; sin la capability el campo se omite del payload.
> **Por que**: el costo/margen es sensible; JOR-077 creo la capability dedicada. Gating a nivel de campo, no de endpoint (el endpoint sigue accesible con `view`).

El sistema MUST incluir `costoCompra?: number` (desde `items.net_price`) en la respuesta unicamente cuando `can(user.capabilities, 'items.parts:cost-view')` es true; en caso contrario MUST omitir el campo (no enviarlo en null).

**Actor**: user (gating por `items.parts:cost-view`)
**Layers**: backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: usuario con cost-view
- **GIVEN** rol con `items.parts:cost-view` (gerencia)
- **WHEN** GET detalle/listado
- **THEN** cada item trae `costoCompra` con el neto de compra real

#### Scenario: usuario sin cost-view
- **GIVEN** rol con `items.parts:view` pero sin `cost-view` (vendedor)
- **WHEN** GET detalle/listado
- **THEN** la respuesta NO contiene la clave `costoCompra`
</details>

### REQ-05: Alta real (insert + sync N:M)

> **Que cambia**: `POST /inventario/items` inserta un item real y crea sus filas N:M (referencias, proveedores, categorias, aplicaciones); devuelve el detalle persistido.
> **Por que**: hoy hace echo de `STUB_DETAIL` sin tocar la DB.

El sistema MUST insertar en `items` (mapeando el `CreateItemDto` a columnas snake_case, con `workspace_id` del contexto e `in_status=1`) y crear las filas N:M asociadas dentro de una **transaccion** (atomicidad: si falla un pivote, no queda item huerfano). MUST devolver el `ItemDetailDto` del registro creado.

**Actor**: user (`items.parts:edit`)
**Layers**: backend, database, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: alta con N:M
- **GIVEN** payload con 2 referencias, 1 proveedor, 1 categoria, 2 aplicaciones
- **WHEN** POST /inventario/items
- **THEN** 201; existe 1 fila en `items`, 2 en `item_references`, 1 en `item_providers`, 1 en `item_categories`, 2 en `application_items`, todas con el `workspace_id` correcto; GET del detalle refleja lo enviado

#### Scenario: rollback ante pivote invalido
- **GIVEN** payload con un `provider_id` inexistente
- **WHEN** POST
- **THEN** la operacion falla y NO queda item huerfano en `items` (transaccion revertida)
</details>

### REQ-06: Edicion real (update + re-sync N:M)

> **Que cambia**: `PATCH /inventario/items/:id` actualiza el item y re-sincroniza sus N:M (agrega los nuevos, baja los quitados) sin duplicar ni dejar huerfanos.
> **Por que**: hoy mergea sobre `STUB_DETAIL` sin persistir.

El sistema MUST actualizar `items` (solo los campos presentes en `UpdateItemDto`, scoped por workspace) y re-sincronizar cada relacion N:M enviada, dentro de una transaccion. 404 si el id no existe en el workspace. El re-sync MUST ser idempotente (PATCH con el mismo payload no cambia el conteo de pivotes).

**Actor**: user (`items.parts:edit`)
**Layers**: backend, database, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: re-sync sin duplicar
- **GIVEN** item con proveedores [p1, p2]
- **WHEN** PATCH proveedores [p2, p3]
- **THEN** quedan exactamente [p2, p3] (p1 removido, p3 agregado, p2 no duplicado)

#### Scenario: idempotencia
- **GIVEN** item con categorias [c1]
- **WHEN** PATCH categorias [c1] dos veces
- **THEN** queda exactamente [c1] en ambas (conteo estable)

#### Scenario: id ajeno al workspace
- **WHEN** PATCH de un id de otro workspace
- **THEN** 404
</details>

### REQ-07: Baja logica + endpoint DELETE

> **Que cambia**: nuevo `DELETE /inventario/items/:id` que marca `in_status=0`; el item desaparece del listado y del detalle pero no se borra fisicamente.
> **Por que**: la baja no estaba expuesta; el modelo ya soporta baja logica.

El sistema MUST exponer `DELETE /inventario/items/:id` (gateado por `items.parts:edit`) que setee `items.in_status=0` (scoped por workspace). 404 si el id no existe o ya estaba de baja. Tras la baja el item MUST no aparecer en listado/summary/detalle.

**Actor**: user (`items.parts:edit`)
**Layers**: backend, database, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: baja saca del listado
- **GIVEN** item activo presente en el listado
- **WHEN** DELETE /inventario/items/:id
- **THEN** 200/204; el item ya no aparece en GET listado ni en GET detalle (404); la fila sigue existiendo con in_status=0

#### Scenario: doble baja
- **WHEN** DELETE de un item ya con in_status=0
- **THEN** 404
</details>

### REQ-PRESERVE-01: Contrato HTTP y listado intactos (regression)

> **Que cambia**: nada visible — el listado real (`findAllPaginated`) y la forma de las respuestas (envelope paginado, camelCase, rutas, guards) se preservan.
> **Por que**: el front ya consume estos contratos; conectar los stubs no debe romperlos.

El sistema MUST preservar: forma del envelope `{ data, page, limit, total }`, nombres camelCase del DTO, rutas y trio de guards. Los specs existentes (`items.repository.spec`, `items.service.spec`, `items.controller.spec`) MUST seguir verdes (ajustados solo por el cambio sync→async, sin cambiar aserciones de contrato).

**Actor**: system
**Layers**: backend, api

### REQ-08: Picklists de catalogo con ids reales (C1)

> **Que cambia**: los dropdowns de categorias/aplicaciones/proveedores del alta de item sirven ids reales (enteros de las tablas), no ids stub `cat-001`. Asi el alta de item funciona end-to-end.
> **Por que**: el dual-judge S2 confirmo que el catalogo stub servia ids desacoplados de las FK → create/update fallaban desde la UI real (C1).

El sistema MUST resolver `getCategorias`/`getAplicaciones`/`getProveedores` desde `categories`/`applications`/`providers` (scoped por workspace, `in_status=1`), devolviendo ids reales. El mantenedor CRUD (crear NUEVAS entradas) queda fuera (JOR-102).

**Actor**: user (`catalogos:view`) · **Layers**: backend, database

### REQ-09: Tenant-ownership de FK de catalogo en el write (C2)

> **Que cambia**: al crear/editar un item, las categorias/proveedores/aplicaciones referenciadas se validan como pertenecientes al workspace (y activas); si no, 400.
> **Por que**: el dual-judge S2 confirmo que el write insertaba FK sin validar tenant → referencia cross-tenant posible (C2).

El sistema MUST validar en `syncPivotIds` que cada id referenciado exista en la maestra DENTRO del workspace del item y con `in_status=1`; caso contrario MUST responder 400 (sin insertar).

**Actor**: system · **Layers**: backend, database

### REQ-10: Hardening del write (guard numerico + dedup + DTO parcial)

> **Que cambia**: ids de catalogo no numericos → 400 claro (no 500); ids/referencias repetidos no duplican filas; PATCH parcial de `precios`/`canales` ya no es rechazado.
> **Por que**: findings menores del dual-judge S2.

El sistema MUST rechazar ids de catalogo no numericos/no positivos con 400, MUST deduplicar ids/codigos antes de insertar pivotes, y `UpdateItemDto` MUST aceptar `precios`/`canales` parciales.

**Actor**: system · **Layers**: backend, api

## Artifacts

### Repositorio — nuevos metodos en `KnexItemsRepository` (`items.repository.ts`)

Extiende la interfaz `ItemsRepository` (hoy solo `findAllPaginated`/`count`) alineandose con el contrato `Repository<T>` de `common/repository.ts`:

| Metodo | Firma | Que hace |
|--------|-------|----------|
| `getSummary` | `(workspaceId): Promise<ItemsSummaryDto>` | Agregacion de conteos por estado de stock + marcas distintas (scoped, in_status=1) |
| `findById` | `(id, workspaceId): Promise<ItemDetailRow \| null>` | Item + N:M resueltos + stock por bodega + auditoria; null si no existe/baja |
| `create` | `(input, workspaceId): Promise<number>` | INSERT items + N:M en transaccion; devuelve id creado |
| `update` | `(id, input, workspaceId): Promise<boolean>` | UPDATE items + re-sync N:M en transaccion; false si no existe |
| `softDelete` | `(id, workspaceId): Promise<boolean>` | SET in_status=0 (scoped); false si no existe/ya de baja |

Todas reciben `workspaceId` obligatorio (frontera de aislacion real — RLS removida).

### DTOs — adiciones (`item.dto.ts`)

| Campo | Tipo | En | Gating |
|-------|------|----|--------|
| `priority` | `number` | ItemDto | — |
| `failure` | `number` | ItemDto | — |
| `costoCompra` | `number` (opcional) | ItemDto | presente solo con `items.parts:cost-view` |

`@ApiProperty` en cada uno (DEC-002: Swagger expone shapes reales para el `generate:api-types` del front).

### Endpoint nuevo (`items.controller.ts`)

| Method | Path | Auth | Capability | Response |
|--------|------|------|-----------|----------|
| DELETE | `/inventario/items/:id` | JWT + trio guards | `items.parts:edit` | 200/204; 404 si no existe |

Los handlers `summary`/`getOne`/`create`/`update` pasan de retorno sincrono a `Promise<...>` (propagan el async del service). `getOne`/`list` reciben `@CurrentUser() user` para el gating de `costoCompra`.

## Tasks

### Session 1 — Read paths (summary + detalle) [tipo: auto] [tier: T2]

parallel_groups: []  <!-- S1.T1 y S1.T2 comparten items.repository.ts + items.service.ts → no paralelizables (condicion (a) archivos disjuntos falla) -->

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | `getSummary` real en repo + service (agregacion por estado de stock + marcas, scoped) | REQ-01 | developer | — | src/items/items.repository.ts, src/items/items.service.ts | TC-01 (e2e summary) | git revert del metodo | DET-5, DET-8, DET-11 | done | 1 |
| S1.T2 | `findById` real (item + N:M + stockPorBodega + resumenComercial + auditoria); exponer priority/failure; costoCompra gateado por cost-view | REQ-02, REQ-03, REQ-04 | developer | S1.T1 | src/items/items.repository.ts, src/items/items.service.ts, src/items/dto/item.dto.ts | TC-02, TC-03, TC-04 (e2e detalle) | git revert | DET-5, DET-8, DET-11, DET-16 | done | 1 |
| S1.T3 | Controller: summary/getOne a async (Promise); inyectar @CurrentUser para gating; contrato HTTP intacto; ajustar specs sync→async | REQ-PRESERVE-01 | developer | S1.T2 | src/items/items.controller.ts, src/items/items.controller.spec.ts, src/items/items.service.spec.ts | typecheck + build + jest unit items | git revert | DET-5, DET-10 | done | 1 |
| S1.T4 | Integration tests contra DB real (summary + detalle + tenant isolation + cost gating) + regression del listado | REQ-01, REQ-02, REQ-04 | developer | S1.T3 | test/e2e/items-read.e2e-spec.ts | test:e2e verde | borrar spec nuevo | DET-7, DET-13 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T2): quality review + stryker scoped (items.repository/service) + regression | REQ-PRESERVE-01 | reviewer | S1.T4 | projects/jormat-evolution/tickets/JOR-081.md | gate persistido + mutation report | — | DET-20, DET-23, RULE-testing-mutation-003 | done | 1 |

### Session 2 — Write paths (create/update/softDelete + N:M) [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: []  <!-- todas tocan items.repository.ts + items.service.ts; dependencias duras → secuencial -->

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | `create` real: INSERT items + sync N:M en transaccion; mapear CreateItemDto→snake_case; devolver detalle | REQ-05 | developer | — | src/items/items.repository.ts, src/items/items.service.ts | TC-05 (e2e create) | git revert | DET-5, DET-8, DET-11 | done | 2 |
| S2.T2 | `update` real: UPDATE items + re-sync N:M idempotente en transaccion; 404 scoped | REQ-06 | developer | S2.T1 | src/items/items.repository.ts, src/items/items.service.ts | TC-06 (e2e update) | git revert | DET-5, DET-8, DET-16 | done | 2 |
| S2.T3 | `softDelete` + endpoint DELETE (in_status=0, scoped, 404 doble baja); controller create/update a async; sembrar comentarios DEUDA_TECNICA (imagenes/historial) | REQ-07 | developer | S2.T2 | src/items/items.repository.ts, src/items/items.service.ts, src/items/items.controller.ts, src/items/items.controller.spec.ts | TC-07 (e2e delete) + typecheck + build | git revert | DET-5, DET-8, DET-10 | done | 2 |
| S2.T4 | Matriz destructiva + integration tests write contra DB real (create/update/delete + rollback transaccional + tenant isolation) | REQ-05, REQ-06, REQ-07 | developer | S2.T3 | test/e2e/items-write.e2e-spec.ts | test:e2e verde (matriz completa) | borrar spec nuevo | DET-7, DET-13, DET-33, DET-36 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T3): dual-judge adversarial + stryker scoped al write path + matar/justificar survivors + regression completa | REQ-05, REQ-06, REQ-07 | reviewer | S2.T4 | projects/jormat-evolution/tickets/JOR-081.md | gate persistido + dual-judge + mutation report | — | DET-13, DET-23, DET-35, RULE-testing-mutation-003 | done | 2 |

### Session 3 — Expansion post dual-judge S2: catalogo real (C1) + tenant-scope (C2) + hardening [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: []  <!-- S3.T1 (catalogos) y S3.T2/T3 (items) tocan archivos distintos pero el re-judge (T5) depende de todo; se ejecuto secuencial -->

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Conectar getCategorias/getAplicaciones/getProveedores a tablas reales (ids reales scoped) — C1 | REQ-08 | developer | — | src/catalogos/catalogos.service.ts, src/catalogos/catalogos.controller.ts | catalogos-read e2e | git revert | DET-5, DET-11 | done | 3 |
| S3.T2 | Tenant-scope de FK de catalogo en el write (validar master en workspace + in_status) — C2 | REQ-09 | developer | — | src/items/items.repository.ts | items-write e2e (C2) | git revert | DET-5, DET-16 | done | 3 |
| S3.T3 | Hardening: guard numerico ids (400), dedup pivotes, canales.catalogo DEUDA, UpdateItemDto anidado opcional | REQ-10 | developer | S3.T2 | src/items/items.repository.ts, src/items/dto/update-item.dto.ts | items-write e2e (guard/dedup) | git revert | DET-5 | done | 3 |
| S3.T4 | e2e: catalogos-read (ids reales + tenant) + items-write con masters in-workspace + casos C2/guard/dedup/baja | REQ-08, REQ-09, REQ-10 | developer | S3.T3 | test/e2e/catalogos-read.e2e-spec.ts, test/e2e/items-write.e2e-spec.ts | test:e2e verde | borrar spec | DET-7, DET-13, DET-33 | done | 3 |
| **S3.GATE** | Re-dual-judge (tier T3): confirmar C1/C2 resueltos (APPROVED) + regression | REQ-08, REQ-09, REQ-10 | reviewer | S3.T4 | projects/jormat-evolution/tickets/JOR-081.md | gate persistido + dual-judge APPROVED | — | DET-13, DET-23, DET-35 | done | 3 |

## Technical reference

- **Schema final** (migracion `20260721000000_normalize_inventory_plural.ts`): tablas PLURAL con `uuid` + `workspace_id` + timestamps. Raiz `items`; N:M `item_references`/`item_providers`/`item_categories`/`application_items`/`item_warehouses`/`item_warehouse_locations`; maestras `providers`/`categories`/`applications`/`warehouses`/`locations`.
- **Columnas items relevantes**: `ds_name` (descripcion), `brand` (marca), `brand_code` (codigoMarca), `nm_net` (precio venta neto), `net_price` (costo compra neto → `costoCompra`), `ds_max_discount`, `critical_stock`, `priority`, `failure`, `oil`, `offer_is` (oferta), `in_status` (baja logica), `us_modifier_id`/`user_id` (auditoria — FK diferida a users).
- **Aislacion**: `tenantScoped(db, 'items as i', workspaceId)` filtra `i.workspace_id`; las hijas se acotan por FK (`item_id`).
- **Estado de stock** (reusar logica del listado): `stock = SUM(item_warehouses.item_qty)`; `sin_stock` si 0, `bajo_stock` si `<= critical_stock`, si no `en_stock`.
- **RBAC field-level**: `request.user.capabilities: string[]` (poblado por `CapabilitiesHydrationGuard`); usar `can(user.capabilities, 'items.parts:cost-view')` de `common/auth/can.ts`.
- **Integration infra**: `test:e2e` (jest.e2e.config.ts) crea DB efimera `jormat_evolution_test` en `POSTGRES_PORT=5433`, migra + siembra (globalSetup). Plantilla: `test/e2e/roles-config.e2e-spec.ts`. `WORKSPACE_ID` dev = `11111111-1111-1111-1111-111111111111`.

## Constraints

- **DET-11 / DET-5**: consultar KB + verificar multi-capa (hecho en design: seeds, e2e matrix, can.ts).
- **RULE-testing-mutation-003**: cada gate cierra con stryker scoped a los archivos tocados + matar/justificar survivors.
- **DET-36 / DET-33**: verificacion runtime real (integration contra DB), no self-report ni mocks — Learn L1.
- Filtro de tenant obligatorio en toda query (`tenantScoped`), no `.where('workspace_id')` a mano.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Mock de Knex no muerde N:M (L1) | high | tests verdes con bugs de runtime | integration contra DB real + matriz destructiva + mutation gate |
| Mapeo catalogos id-vs-nombre erroneo (OPEN-Q-1) | medium | create/update guardan FK invalidas | asumir IDs enteros (DEC-LOCAL-3) + test con seeds reales; flag en S2.GATE para validar con front |
| sync→async rompe controller | medium | build roto | actualizar controller + specs en misma task; typecheck+build en gate |
| Omision de filtro tenant en query nueva | low | fuga cross-tenant | tenantScoped + test de aislacion |

## Open questions

- **OPEN-Q-1**: ¿el front envia IDs o nombres en `categorias`/`aplicaciones`/`proveedores` del `CreateItemDto`? El `@ApiProperty` ejemplifica nombres, pero el detalle round-trippea por id. **Resolucion provisional (DEC-LOCAL-3)**: interpretar como IDs enteros de las maestras. Validar contra el front en S2.GATE; si envia nombres, follow-up de mapeo por `ds_name`.

## Decisions (cerradas durante design)

### DEC-LOCAL-3: catalogos en write path como IDs enteros
- **Contexto**: `CreateItemDto.categorias/aplicaciones/proveedores: string[]` — id vs nombre ambiguo.
- **Drivers**: schema normalizado (FK enteros), comentario `MultiSelect por id` del detalle stub, consistencia con el round-trip del detalle.
- **Opcion elegida**: interpretar los valores como IDs de `categories`/`applications`/`providers`.
- **Alternativas**: lookup/upsert por `ds_name` (descartada: fragil, crea duplicados por typos, no hay unique por nombre).
- **Consecuencias**: si el front envia nombres, requiere follow-up. Documentado en OPEN-Q-1; se valida en S2.GATE.
- **Session**: design (S1 previa al execute).

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..07 pasan
- [ ] **Tests**: integration read (S1.T4) + write (S2.T4) verdes contra DB real + regression unit
- [ ] **Rules**: `tenantScoped` en toda query nueva; costo gateado por `cost-view`
- [ ] **Integration**: listado real y contrato HTTP no rotos (REQ-PRESERVE-01)
- [ ] **Mutation**: stryker scoped en ambos gates; survivors muertos o justificados
- [ ] **Docs**: `DEUDA_TECNICA` (imagenes/historial) sembrada en los stubs restantes
