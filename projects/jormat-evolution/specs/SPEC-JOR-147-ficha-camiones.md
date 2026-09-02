---
id: SPEC-JOR-147-ficha-camiones
project: jormat-evolution
ticket: JOR-147
status: done
---

# Migrar la ficha de camiones del legacy a Next + API (tabla trucks, fachada uuid)

# Migrar la ficha de camiones del legacy a Next + API (tabla trucks, fachada uuid)

> **REVISION 2026-08-14**: trucks usa la **fachada uuid de RULE-api-001** (serial `id` PK interno + `uuid` expuesto como `id` publico), NO uuid-PK. Correccion: la tabla arrastra un serial legacy, y la regla manda "no migrar PK a uuid; mantener el serial + fachada". Donde este texto diga "uuid-PK app-native / descartar serial / promover uuid a PK", leer **fachada: conservar serial, exponer uuid** (como las 12 tablas de inventario de JOR-148). `client_id` uuid FK, `is_active` smallint, `status`/timestamps conservados se mantienen igual.

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks. Si con esto te basta para decidir, ese es el objetivo.*

**Que se quiere**: la vista de Camiones existe hoy solo en el legacy (`jormat-front-legacy/src/app/items/trucks/`), pega a un backend externo y no tiene ninguna contraparte en evolution-mono (cero codigo de aplicacion: ni modulo backend, ni servicio/hook/pagina front, ni capability, ni seed). La tabla `trucks` ya existe en la DB pero con un esquema hibrido (serial PK + uuid + `client_id` int sin FK + `is_active` int). Este ticket migra la ficha a paridad legacy: alinea el esquema de `trucks` al estandar app-native del repo (uuid-PK, FK tipada al cliente, soft-delete `is_active` smallint), levanta un modulo backend CRUD paginado clonando `src/customers/`, y construye la vista Next (listado + crear + editar + baja) reusando el buscador de clientes ya migrado. Al final el usuario administra camiones desde `/inventario/camiones` con el mismo comportamiento que el legacy.

**Decisiones criticas que necesitan tu OK** (cada una con racional en las secciones tecnicas):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | `trucks` nace uuid-PK app-native: se **descarta** el serial `id` (nada lo referencia, 0 FK inbound) y el `uuid` ya provisto pasa a ser el PK expuesto como `id` (molde `customers`/`catalogos_repuestos`). NO es la fachada uuid de JOR-148 | Define el estandar de identidad de la tabla; es irreversible sin restaurar el serial. Bajo riesgo porque la tabla no tiene datos de app ni FK entrantes |
| 2 | `client_id` int (sin FK) pasa a `client_id uuid` con FK a `customers.id`. La tabla no tiene datos reales, asi que es drop+add de columna, no migracion de datos | `customers.id` es uuid: un `client_id` entero no puede referenciar la maestra. Sin la FK, la integridad ficha-cliente queda sin garantizar |
| 3 | `is_active` int pasa a `smallint 1/0` (RULE-database-001); `status` se **conserva reservado** (no se dropea, no se lee como activeness) | Estandariza el soft-delete transversal; preserva `status` para una feature futura sin reinterpretar datos (decision del dev, D4) |
| 4 | Capability nueva en la familia `entities.*`: `entities.trucks:view|edit|delete` (NO `items.*`), sembrada en un seed propio y concedida a roles demo | `trucks` es entidad de datos maestros (analoga a `customers`/`suppliers`, que viven en `entities.*` aunque su UI cuelgue de Inventario) |

**Riesgos principales y como los mitigamos**:

- **La migracion promueve `uuid` a PK y descarta el serial** → se ejecuta sobre una tabla sin datos de app ni FK entrantes (grep 0). `down()` best-effort restaura el serial; se valida `migrate:status` + smoke de arranque de la API antes de seguir.
- **El picker de clientes (`GET /catalogos/clientes`) exige la capability `catalogos:view`**, distinta de `entities.trucks:edit` → un usuario que pueda crear camiones pero no tenga `catalogos:view` veria el buscador vacio. Se verifica/concede `catalogos:view` a los roles demo con `entities.trucks:edit` en el mismo seed de grants.
- **Romper la paridad legacy** (cliente editable en edicion, baja fisica, requeridos flojos) → REQ-PRESERVE-01 fija el contrato de paridad y los guardarrails (cliente inmutable en editar, `is_active=0` sin borrado fisico, requeridos patente/chasis/año/modelo) con test cases dedicados.
- **Fuga IDOR si el serial cruzara la API** → al nacer uuid-PK, ninguna proyeccion emite un serial; el DTO expone `id`=uuid y el `:id` resuelve por uuid (RULE-api-001, heredada como base).

**Que NO se hace en este ticket** (limites explicitos del scope):

- Reconectar ventas/compras/bodega a la ficha de camiones: no hay consumidores downstream reales de este dato (las otras menciones de "truck" en el legacy son iconos de bodega y nombres de CSV/formulario ajenos). Fuera de alcance, sin impacto.
- Migrar el estado de falla / `status`: se conserva reservado, no se modela su dominio (feature futura).
- Crear/rehacer el buscador de clientes: ya esta migrado (`customers` + `catalogos/clientes`), se reusa.
- Depender de JOR-145 / JOR-148: `trucks` queda fuera de ambas cadenas (nace app-native con su propio `is_active` y uuid-PK). Solo requiere que RULE-database-001 y RULE-api-001 existan (ya escritas).

**Tamano estimado**: 2 sessions (S1 backend, S2 frontend), aproximadamente 5-7h efectivas. La mas riesgosa es S1 (migracion app-native que define el estandar de la tabla + modulo nuevo con join a clientes).

**Como vas a saber que funciona** (criterios observables):

- Abro `/inventario/camiones` y veo el listado con las columnas del legacy (Patente, Marca, Modelo, Año, Chasis, Cliente, Rut, N° Motor), paginado y con buscador; el Cliente y el Rut salen del join a `customers`.
- Creo un camion eligiendo un cliente del buscador; los requeridos (patente, chasis, año 1980-2030, modelo) se validan; la marca es un select fijo; el N° motor es opcional.
- Edito un camion y el campo Cliente aparece bloqueado (inmutable).
- Doy de baja un camion: desaparece del listado pero la fila sigue en la DB con `is_active=0`.
- Un usuario sin `entities.trucks:*` recibe 403 en los endpoints y no ve la vista.
- La suite unit + e2e queda verde y el deep-link `/inventario/camiones` carga en runtime.

---

## Purpose

Migrar la vista Camiones (ficha de camiones) del legacy a evolution-mono con paridad funcional: alinear el esquema de `trucks` al estandar app-native del repo (uuid-PK, FK tipada a `customers`, soft-delete `is_active` smallint), exponer un modulo backend CRUD paginado clonando el molde `src/customers/` (trio de guards, `@RequireCapability`, `tenantScoped`, uuid publico), y construir la vista Next (listado/crear/editar/baja) clonando el molde de mantenedores `Categorias`/`Aplicaciones` bajo `inventario/`, reusando el buscador de clientes (`customers`). RBAC por la familia `entities.trucks`. Independiente de JOR-145 y JOR-148 (aplica RULE-database-001 y RULE-api-001 directo, sin heredar sus migraciones).

## Requirements

### REQ-01: migracion app-native de `trucks` (uuid-PK, client_id uuid, is_active smallint)

> **Que cambia**: la tabla `trucks` deja su esquema hibrido legacy y queda con `id uuid` PK, `client_id uuid` con FK a `customers.id`, `is_active smallint 1/0`, `status` reservado, `user_id`/`user_update` uuid, y timestamps app-native.
> **Por que**: el serial y el `client_id` int impiden cumplir el estandar del repo (uuid publico + FK tipada al cliente uuid); la tabla no tiene datos de app ni FK entrantes, asi que es el momento de dejarla app-native de una vez.

El sistema MUST migrar `trucks` con una migracion Knex forward-only que: (a) **CONSERVE el serial `id` como PK interno y la columna `uuid`** (fachada RULE-api-001: NO se dropea el serial ni se migra el PK; el repo proyecta `SELECT uuid AS id` y resuelve `WHERE uuid = :id`, el serial nunca cruza la API); (b) convierta `client_id` int → `client_id uuid` **NOT NULL** con FK a `customers.id` (`ON DELETE RESTRICT`), recreando el indice `idx_trucks_client_id`; (c) convierta `is_active` int → `smallint NOT NULL DEFAULT 1` (RULE-database-001; `1`=activo, `0`=baja); (d) **conserve `status`** tal cual (int, reservado, no se lee como activeness — D4); (e) convierta `user_id`/`user_update` int → `uuid` nullable (usuario del token; FK opcional a `users.id` `ON DELETE SET NULL`); (f) mantenga `workspace_id` (ya provisto por JOR-099, no se agrega) y **conserve** los timestamps existentes: `created_at`/`updated_at` (que usa el repo, molde customers) Y los legacy `date`/`update_date` (NO se dropean — instruccion del dev: "solo añadir is_active"; la redundancia es inocua en tabla vacia). La unica columna que se descarta es el serial `id` (D2). La operacion MUST ser segura sobre una tabla sin datos de app (drop+add de columnas donde el cast no es directo). `down()` MUST ser best-effort (restaurar serial + tipos int), documentado como irreversible parcial.

**Actor**: system · **Layers**: database

<details><summary>Scenarios de validacion</summary>

#### Scenario: esquema final app-native
- **GIVEN** la tabla `trucks` con esquema hibrido (serial + uuid + client_id int), **WHEN** corre la migracion, **THEN** `\d trucks` muestra `id integer PK` (serial CONSERVADO) + `uuid NOT NULL UNIQUE` (identificador publico), `client_id uuid NOT NULL` con FK a `customers`, `is_active smallint DEFAULT 1`, `status int` presente, `date`/`update_date` CONSERVADOS, y la API arranca (smoke health OK).

#### Scenario: el serial ya no existe
- **GIVEN** la migracion aplicada, **WHEN** se inspecciona la tabla, **THEN** no hay columna serial `id` ni secuencia asociada; el PK es `id uuid`.

#### Scenario: FK al cliente exige un cliente existente
- **GIVEN** la FK `client_id → customers.id`, **WHEN** se intenta insertar un camion con un `client_id` inexistente, **THEN** la DB rechaza el insert (violacion de FK).

</details>

#### Acceptance
La tabla `trucks` queda con `id uuid` PK, `client_id uuid` FK a `customers`, `is_active smallint`, `status` conservado; la API levanta sin error.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | esquema final | trucks hibrida | migrate up | id uuid PK, client_id uuid FK | \d trucks correcto |
| 2 | fachada: serial conservado + uuid publico | migrada | inspeccion | id serial PK interno + uuid NOT NULL UNIQUE expuesto como id | repo emite uuid, no serial |

### REQ-02: modulo backend `trucks` (CRUD paginado, uuid publico, molde customers)

> **Que cambia**: aparece `GET/POST/PATCH/DELETE /api/trucks` con paginacion/orden/busqueda server-side, aislado por workspace, con el detalle enriquecido por el cliente (razon social + RUT) via join a `customers`.
> **Por que**: la vista Next necesita un backend real (el legacy pegaba a un host externo fuera del repo).

El sistema MUST exponer un modulo `trucks` clonando el molde `src/customers/` (module/controller/service/repository + DTOs, trio de guards `AuthGuard → CapabilitiesHydrationGuard → CapabilitiesGuard`, `@WorkspaceId()`, `tenantScoped`). El repositorio MUST operar solo sobre camiones activos (`WHERE trucks.is_active = 1`), paginar/ordenar/buscar server-side, resolver el `:id` entrante por `uuid` (RULE-api-001; `@Param('id')` string sin cast), exponer el `id` uuid en todas las salidas (nunca un serial), y en el **listado y detalle** hacer join a `customers` para devolver `clientName` (razon_social) y `rut` del cliente dueño. `create` MUST derivar `user_id`/`workspace_id` del token (D5), validar que `client_id` corresponde a un cliente **activo del mismo workspace** (404/400 si no), y setear `user_id`. `update` MUST setear `user_update` del token y `updated_at`, e **ignorar/rechazar** cualquier cambio de `client_id` (cliente inmutable, REQ-PRESERVE-01). `remove` MUST hacer soft-delete (`is_active=0`), nunca `.del()` fisico. El modulo MUST registrarse en `app.module.ts`.

**Actor**: user, system · **Layers**: backend, api, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: listado con Cliente + Rut (join)
- **GIVEN** camiones y clientes sembrados en el workspace, **WHEN** `GET /api/trucks?page=1&limit=10&search=...`, **THEN** 200 con envelope `{ data, page, limit, total }`, cada fila con `id` uuid + `clientName` + `rut` derivados del join, paginado y filtrado por el search.

#### Scenario: create deriva usuario/workspace del token
- **GIVEN** un payload valido con `clientId` de un cliente activo, **WHEN** `POST /api/trucks`, **THEN** 201, el camion queda con `workspace_id`/`user_id` del token y `id` uuid; con un `clientId` inexistente o de otro workspace → 400/404.

#### Scenario: soft-delete
- **GIVEN** un camion activo, **WHEN** `DELETE /api/trucks/:id`, **THEN** 204, la fila persiste con `is_active=0` y desaparece de `GET /trucks`.

#### Scenario: serial no resuelve
- **GIVEN** un camion con uuid conocido, **WHEN** `GET /api/trucks/{cualquier-entero}`, **THEN** 404 (el `:id` resuelve solo por uuid).

</details>

#### Acceptance
Listar/crear/editar/eliminar camiones por la API funciona, el listado muestra Cliente y Rut, y ningun payload expone un id numerico.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | listado join | camiones+clientes | GET /trucks | filas con clientName+rut | envelope paginado |
| 2 | soft-delete | camion activo | DELETE /trucks/:id | is_active=0, ausente | fila persiste |
| 3 | create valida cliente | clientId invalido | POST /trucks | 400/404 | no crea |

### REQ-03: RBAC `entities.trucks:view|edit|delete` (seed + grants + gating)

> **Que cambia**: nace la familia de capabilities `entities.trucks:view|edit|delete`, se siembra en el catalogo, se concede a roles demo, y cada endpoint de `trucks` queda gateado (403 sin la capability).
> **Por que**: el mantenedor es administracion de datos maestros; debe gatearse como el resto (customers/suppliers/categorias).

El sistema MUST sembrar tres capabilities `entities.trucks:view` (leer listado/detalle), `entities.trucks:edit` (crear/editar) y `entities.trucks:delete` (eliminar) en un seed propio idempotente y no-prod (molde `05_sales_capabilities.ts`, familia `entities` como `entities.customers`/`entities.suppliers`). El controller MUST gatear cada endpoint: `GET` con `entities.trucks:view`, `POST`/`PATCH` con `entities.trucks:edit`, `DELETE` con `entities.trucks:delete`; un usuario sin la capability MUST recibir 403. El seed de grants (`10_demo_roles_users.ts`) MUST conceder el set a los roles demo que administran inventario (propuesta: `view` a bodega/cajero/jefe-local/jefe-venta/gerencia; `edit` a bodega/jefe-local/jefe-venta/gerencia; `delete` a jefe-local/jefe-venta/gerencia) y MUST garantizar que todo rol con `entities.trucks:edit` tambien tenga `catalogos:view` (requerida por el buscador de clientes que consume el form de creacion).

**Actor**: admin, system · **Layers**: backend, api, config, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: 403 sin capability
- **GIVEN** un usuario sin `entities.trucks:*`, **WHEN** `GET`/`POST`/`PATCH`/`DELETE /api/trucks`, **THEN** 403 en todos.

#### Scenario: edit sin catalogos:view rompe el picker
- **GIVEN** un rol con `entities.trucks:edit` pero sin `catalogos:view`, **WHEN** abre el form de crear camion, **THEN** el buscador de clientes daria 403 → el seed de grants concede `catalogos:view` junto con `edit` para evitarlo.

</details>

#### Acceptance
Un usuario con `entities.trucks:view` ve el listado; sin ella recibe 403. Crear/editar exige `entities.trucks:edit`; eliminar, `entities.trucks:delete`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | gating view | user sin cap | GET /trucks | 403 | denegado |
| 2 | gating edit | user solo view | POST /trucks | 403 | denegado |
| 3 | gating delete | user solo edit | DELETE /trucks/:id | 403 | denegado |

### REQ-04: front — listado de camiones (Cliente + Rut, paginado, no lista bajas)

> **Que cambia**: aparece la vista `/inventario/camiones` con el listado paginado y buscador, columnas de paridad legacy, gateada por `entities.trucks:view`.
> **Por que**: es la puerta de entrada del mantenedor; reemplaza el grid ui-grid del legacy.

El front MUST montar `/inventario/camiones` como page thin-wrapper que orquesta un composite `CamionesView` (molde `CategoriasView`): data layer con React Query (`useTrucksPaginated` etc.) + service axios (`services/api/trucks.ts`, pega a `/trucks`) + tipos + tabla server-side (`CamionesTable`, molde `CategoriasTable`). La tabla MUST mostrar las columnas del legacy: **Patente, Marca, Modelo, Año, Chasis, Cliente, Rut, N° Motor** (mas acciones editar/eliminar), con paginacion/orden/busqueda server-side. El listado MUST consumir solo camiones activos (el backend ya filtra `is_active=1`; el front no lista bajas). La ruta MUST gatearse con `<RouteGuard cap="entities.trucks:view">` y agregarse a `nav-data.ts` bajo Inventario (`{ label: 'Camiones', path: '/inventario/camiones', cap: 'entities.trucks:view' }`).

**Actor**: user · **Layers**: frontend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: listado con columnas legacy
- **GIVEN** camiones sembrados, **WHEN** abro `/inventario/camiones`, **THEN** veo la tabla con Patente/Marca/Modelo/Año/Chasis/Cliente/Rut/N° Motor, paginada y con buscador.

#### Scenario: baja no aparece
- **GIVEN** un camion dado de baja (`is_active=0`), **WHEN** cargo el listado, **THEN** no aparece.

</details>

#### Acceptance
La vista `/inventario/camiones` muestra el listado con Cliente y Rut; los dados de baja no aparecen; el item de menu aparece solo con `entities.trucks:view`.

### REQ-05: front — crear (picker de clientes) / editar (cliente inmutable) / baja logica

> **Que cambia**: un modal de alta/edicion (molde `CategoriaFormModal`) con el buscador de clientes reusado para elegir el dueño al crear; en edicion el cliente queda bloqueado; la baja se dispara desde la UI con confirmacion.
> **Por que**: replica el flujo del legacy (crear con cliente async, editar sin cambiar cliente, baja logica).

El front MUST proveer `CamionFormModal` (react-hook-form + zod, molde `CategoriaFormModal`) con: en **crear**, un buscador/selector de cliente que reusa `useClientes(q)` (`GET /catalogos/clientes?q=`, molde del select-suggest del builder de facturas) y guarda `clientId` (uuid); los campos de paridad (patente, chasis, año, modelo, marca, N° motor). En **editar**, el campo Cliente MUST renderizarse **deshabilitado/solo-lectura** (razon social + RUT del cliente actual), sin permitir cambiarlo (cliente inmutable). Las acciones MUST gatearse con `<Can cap="entities.trucks:edit">` (crear/editar) y `<Can cap="entities.trucks:delete">` (eliminar). La baja MUST usar `ConfirmDialog` y llamar al `DELETE` (soft-delete backend). El schema Zod (`lib/schemas/trucks.ts`) MUST validar `clientId` como uuid requerido.

**Actor**: user · **Layers**: frontend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: crear con picker de clientes
- **GIVEN** clientes sembrados, **WHEN** abro "Nuevo camion", busco y elijo un cliente y completo los requeridos, **THEN** el camion se crea con ese `clientId` y aparece en el listado con Cliente + Rut.

#### Scenario: cliente inmutable en editar
- **GIVEN** un camion existente, **WHEN** abro "Editar", **THEN** el campo Cliente esta deshabilitado y no se puede cambiar.

#### Scenario: baja desde la UI
- **GIVEN** un camion activo, **WHEN** confirmo "Eliminar", **THEN** desaparece del listado (soft-delete) y un toast confirma.

</details>

#### Acceptance
Puedo crear un camion eligiendo un cliente del buscador, editar sus datos sin cambiar el cliente (campo bloqueado), y darlo de baja con confirmacion.

### REQ-PRESERVE-01: paridad legacy (columnas, requeridos, rangos, inmutabilidad, baja logica)

> **Que cambia**: nada respecto del legacy — se preservan sus reglas de UI/validacion exactas en la version Next.
> **Por que**: la vista legacy es la referencia canonica; migrar no debe cambiar el comportamiento observado.

El sistema MUST preservar del legacy: (a) **columnas del listado**: Patente, Marca, Modelo, Año, Chasis, Cliente, Rut, N° Motor; (b) **campos requeridos al crear**: `patente`, `chassis`, `año` (rango **1980-2030**), `modelo`; (c) **marca**: select fijo (las 16 marcas del legacy `trucks-create.html`), **no requerido**; (d) **N° motor**: opcional; (e) **cliente inmutable en edicion** (no se puede reasignar el camion a otro cliente); (f) **baja logica, no fisica** (`is_active=0`, la fila persiste). El backend MUST reflejar los mismos requeridos/rango en los DTOs de validacion (class-validator) y el front en el schema Zod.

**Actor**: user, system · **Layers**: frontend, backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: requeridos y rango de año
- **GIVEN** el form de crear, **WHEN** envio sin patente/chasis/modelo o con año fuera de 1980-2030, **THEN** el form/DTO rechaza con error de validacion; el año valido pasa.

#### Scenario: marca opcional
- **GIVEN** el form de crear, **WHEN** dejo la marca sin elegir, **THEN** el alta procede (marca no requerida).

</details>

#### Acceptance
Los requeridos, el rango de año, la marca opcional (select fijo), el N° motor opcional, el cliente inmutable en edicion y la baja logica se comportan igual que en el legacy.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Security | Aislamiento por workspace en todas las operaciones (`tenantScoped`) | fugas cross-workspace | 0 |
| Security | RBAC por capability en cada endpoint | endpoints sin gate | 0 (view/edit/delete) |
| Security | El serial no cruza la API (RULE-api-001) | ids numericos emitidos por trucks | 0 (id=uuid) |
| Performance | Join a `customers` en el listado no degrada la lectura | resolucion por fila | 1 join (index en FK), marginal |

## Artifacts

### Endpoints (nuevos, montados en `/api/trucks`)

| Method | Path | Auth (capability) | Request body | Response | Errors |
|--------|------|-------------------|-------------|----------|--------|
| GET | /api/trucks | entities.trucks:view | — (query: page/limit/sort/search) | `{ data: TruckDto[], page, limit, total }` | 401, 403 |
| GET | /api/trucks/:id | entities.trucks:view | — | TruckDto | 401, 403, 404 |
| POST | /api/trucks | entities.trucks:edit | CreateTruckDto | TruckDto (201) | 400, 401, 403, 404 (cliente) |
| PATCH | /api/trucks/:id | entities.trucks:edit | UpdateTruckDto (sin clientId) | TruckDto | 400, 401, 403, 404 |
| DELETE | /api/trucks/:id | entities.trucks:delete | — | 204 | 401, 403, 404 |

**DTOs** (molde `customer.dto.ts`):
- `TruckDto` (lectura): `id` (uuid), `patent`, `brand`, `model`, `year`, `chassis`, `motorNumber`, `clientId` (uuid), `clientName` (join `customers.razon_social`), `rut` (join `customers.rut`).
- `CreateTruckDto`: `patent` (req), `chassis` (req), `year` (req, int 1980-2030), `model` (req), `clientId` (req, uuid), `brand` (opt, enum 16 marcas), `motorNumber` (opt).
- `UpdateTruckDto`: `PartialType(CreateTruckDto)` **omitiendo `clientId`** (cliente inmutable).
- `ListTrucksQueryDto`: `PaginationQueryDto` + `search?` (molde `list-customers-query.dto.ts`).

### Models (esquema final de `trucks` tras REQ-01)

| Table | Column | Type | Nullable | Default | Description |
|-------|--------|------|----------|---------|-------------|
| trucks | id | integer (serial) | no | nextval | PK **interno** conservado (no cruza la API) |
| trucks | uuid | uuid | no | uuid_generate_v4() | identificador **publico** (expuesto como `id`, fachada RULE-api-001) |
| trucks | workspace_id | uuid | no | (dev) | tenant isolation (ya provisto por JOR-099) |
| trucks | client_id | uuid | no | — | cliente dueño (FK `customers.id`) |
| trucks | patent | varchar(20) | si | — | patente |
| trucks | brand | varchar(50) | si | — | marca (select fijo 16) |
| trucks | model | varchar(100) | si | — | modelo |
| trucks | year | integer | si | — | año (1980-2030 a nivel validacion) |
| trucks | motor_number | varchar(50) | si | — | N° motor (opcional) |
| trucks | chassis | varchar(50) | si | — | chasis |
| trucks | is_active | smallint | no | 1 | soft-delete (1=activo, 0=baja) |
| trucks | status | integer | si | 0 | **reservado** (no se lee como activeness — D4) |
| trucks | user_id | uuid | si | — | creador (token; FK opcional `users.id`) |
| trucks | user_update | uuid | si | — | ultimo editor (token; FK opcional `users.id`) |
| trucks | created_at | timestamp | no | now() | auditoria (consolida `date` legacy) |
| trucks | updated_at | timestamp | no | now() | auditoria (consolida `update_date` legacy) |

**Relations**:
| From | To | Type | FK | On delete |
|------|----|------|----|-----------|
| trucks | customers | belongsTo | client_id → customers.id | RESTRICT |
| trucks | users | belongsTo (opt) | user_id / user_update → users.id | SET NULL |
| trucks | workspaces | belongsTo | workspace_id → workspaces.id | CASCADE (ya definido, JOR-099) |

**Indexes**:
| Columns | Type | Unique | Purpose |
|---------|------|--------|---------|
| id | btree (PK) | si | identificador publico |
| client_id | btree | no | join/listado por cliente (recreado) |
| patent | btree | no | busqueda por patente (preservado) |
| workspace_id | btree | no | aislamiento por tenant (ya existe) |

### Front (nuevos)

| Artefacto | Path | Molde |
|-----------|------|-------|
| Page thin-wrapper | `src/app/(app)/inventario/camiones/page.tsx` | `inventario/categorias/page.tsx` |
| Composite view | `src/components/items/camiones/CamionesView/` | `CategoriasView` |
| Tabla | `src/components/items/camiones/CamionesTable/` | `CategoriasTable` |
| Form modal | `src/components/items/camiones/CamionFormModal/` | `CategoriaFormModal` + select-suggest de cliente del `TransactionBuilder` |
| Service axios | `src/services/api/trucks.ts` | `services/api/catalogos/categorias.ts` |
| Hooks React Query | `src/hooks/useTrucks.ts` | `useCatalogos.ts` (+ `useClientes` reusado) |
| Schema Zod | `src/lib/schemas/trucks.ts` | `lib/schemas/clientes.ts` |
| Tipos | `src/types/trucks.ts` | `types/catalogos.ts` |
| Nav entry | `src/components/shell/nav/nav-data.ts` (grupo Inventario) | entradas Categorias/Aplicaciones |

## Tasks

### Session 1 — Backend: migracion app-native + modulo trucks + RBAC [tipo: ⚑ fuerte] [tier: T3]

> `⚑ fuerte`: migracion que define el estandar de la tabla (irreversible parcial) + modulo nuevo con join a clientes + RBAC. Dual-judge (DET-35, aplica en T2/T3). Orden: primero la migracion (T1), luego el modulo (T2-T3), luego RBAC (T4), luego tests (T5).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Migracion FACHADA de `trucks` (RULE-api-001): **CONSERVA serial `id` PK + columna `uuid`** (no migra PK), `client_id` int→uuid NOT NULL FK `customers.id` (RESTRICT, recrear idx), `is_active` int→smallint 1/0, conservar `status`, `user_id`/`user_update` int→uuid (FK opt `users.id` SET NULL), conservar `date`/`update_date`. El repo expone `uuid` como `id` (`SELECT uuid AS id`, `WHERE uuid`). `down()` best-effort | REQ-01 | developer | — | backend/jormat-api/migrations/20260813000002_trucks_app_native.ts | `docker exec jormat-evolution-api-1 npm run migrate:latest` + `migrate:status`; `\d trucks` correcto; API arranca (health OK); DET-40 audita que el esquema final cumple D2/D4 y que ninguna columna viva se pierde sin reemplazo | migrate:rollback (best-effort) | DET-8, DET-40, RULE-database-001, RULE-api-001 | done | 1 |
| S1.T2 | Modulo `trucks` — repository + DTOs (clonar customers): `KnexTrucksRepository` (activeScope `is_active=1` + `tenantScoped`, list paginado/orden/busqueda con join a `customers` para `clientName`+`rut`, findById por uuid, create con validacion de cliente activo del workspace + `user_id` token, update con `user_update`+`updated_at` sin tocar `client_id`, softDelete `is_active=0`); `TruckDto`/`CreateTruckDto`/`UpdateTruckDto`(omit clientId)/`ListTrucksQueryDto` | REQ-02, REQ-PRESERVE-01 | developer | S1.T1 | backend/jormat-api/src/trucks/trucks.repository.ts, backend/jormat-api/src/trucks/dto/*.ts | unit repo trucks in-container; proyeccion `id`=uuid (sin serial); DET-40 audita paridad (requeridos, cliente inmutable, soft-delete) | git revert | DET-40, RULE-api-001, RULE-database-001 | done | 1 |
| S1.T3 | Controller + service + module + registro: `TrucksController` (`@Controller('trucks')`, trio de guards, `@RequireCapability` por accion, `@Param('id')` string), `TrucksService` (NotFound/validacion de cliente), `TrucksModule`, alta en `app.module.ts` | REQ-02, REQ-03 | developer | S1.T2 | backend/jormat-api/src/trucks/trucks.controller.ts, backend/jormat-api/src/trucks/trucks.service.ts, backend/jormat-api/src/trucks/trucks.module.ts, backend/jormat-api/src/app.module.ts | unit controller trucks; build Nest sin error; Swagger genera | git revert | RULE-api-001 | done | 1 |
| S1.T4 | RBAC: seed de capabilities `entities.trucks:view/edit/delete` (molde `05_sales_capabilities.ts`, idempotente/no-prod) + grants a roles demo en `10_demo_roles_users.ts` (view: bodega/cajero/jefes/gerencia; edit: bodega/jefes/gerencia; delete: jefes/gerencia) + garantizar `catalogos:view` en todo rol con `entities.trucks:edit` (picker de clientes) | REQ-03 | developer | S1.T3 | backend/jormat-api/seeds/14_entities_trucks_capabilities.ts, backend/jormat-api/seeds/10_demo_roles_users.ts | correr seeds en dev; catalogo tiene las 3 caps; grants presentes; ningun rol con edit sin catalogos:view | git revert (borrar seed + revertir grants) | DET-2, RULE-database-001 | done | 1 |
| S1.T5 | Tests backend: unit repo/service/controller (molde `customers.*.spec.ts`) + e2e in-container (`test/e2e`) cubriendo TC1 (listado join), TC2 (soft-delete), TC4 (403 por capability), create con cliente invalido, serial no resuelve; opcional seed de camiones demo | REQ-02, REQ-03, REQ-PRESERVE-01 | developer | S1.T4 | backend/jormat-api/src/trucks/*.spec.ts, backend/jormat-api/test/e2e/trucks.e2e-spec.ts, backend/jormat-api/seeds/*(opcional) | `docker exec jormat-evolution-api-1 npm run test -- trucks` + `npm run test:e2e` verde; coverage no baja | git revert | DET-7, DET-13, RULE-api-001 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T3)** — persistir en `## Sessions`, correr suite unit + e2e + coverage delta, quality review dual-judge aislado (DET-35), self-report verification (DET-33), decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | ticket | gate persistido + decision + reviewer approved | (no aplica — cierre de session) | DET-20, DET-23, DET-33, DET-35 | done | 1 |

### Session 2 — Frontend: vistas camiones + tests + docs [tipo: ⚑ fuerte] [tier: T3]

> `⚑ fuerte`: cambio user-facing (nueva vista con RBAC + picker reusado). Pre-condicion: S1.GATE (backend `/api/trucks` disponible). Incluye la task de docs (DET-37) y la verificacion runtime (DET-36).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Data layer front: `services/api/trucks.ts` (list paginado/get/create/update/delete a `/trucks`, AbortSignal en GET), `hooks/useTrucks.ts` (React Query + invalidacion), `types/trucks.ts`, `lib/schemas/trucks.ts` (Zod: patente/chasis/modelo req, año 1980-2030, marca enum 16 opt, motorNumber opt, clientId uuid req) | REQ-04, REQ-05, REQ-PRESERVE-01 | developer | S1.GATE | front/jormat-front/src/services/api/trucks.ts, front/jormat-front/src/hooks/useTrucks.ts, front/jormat-front/src/types/trucks.ts, front/jormat-front/src/lib/schemas/trucks.ts | tsc front verde; schema valida rango año y clientId uuid | git revert | RULE-api-001 | done | 2 |
| S2.T2 | UI listado: `CamionesView` + `CamionesTable` (molde Categorias) con columnas Patente/Marca/Modelo/Año/Chasis/Cliente/Rut/N° Motor, paginacion/orden/busqueda server-side, `<RouteGuard cap="entities.trucks:view">`, acciones con `<Can>`; entrada en `nav-data.ts` (Inventario › Camiones) | REQ-04, REQ-PRESERVE-01 | developer | S2.T1 | front/jormat-front/src/app/(app)/inventario/camiones/page.tsx, front/jormat-front/src/components/items/camiones/CamionesView/**, front/jormat-front/src/components/items/camiones/CamionesTable/**, front/jormat-front/src/components/shell/nav/nav-data.ts | tsc verde; nav-data.test actualizado; listado renderiza columnas | git revert | — | done | 2 |
| S2.T3 | UI form: `CamionFormModal` (rhf + zod, molde CategoriaFormModal) con buscador de cliente reusando `useClientes` (select-suggest del builder) que guarda `clientId` al crear; cliente **deshabilitado/solo-lectura** en editar (inmutable); baja con `ConfirmDialog`; acciones gateadas `<Can cap="entities.trucks:edit|delete">` | REQ-05, REQ-PRESERVE-01 | developer | S2.T2 | front/jormat-front/src/components/items/camiones/CamionFormModal/** | tsc verde; crear con picker; editar con cliente bloqueado | git revert | — | done | 2 |
| S2.T4 | Tests front: unit/component (Vitest + Testing Library, molde tests de Categorias) para TC1 (columnas + Cliente/Rut), TC2 (baja quita del listado), TC3 (cliente inmutable en editar), gating `<Can>`/`<RouteGuard>`; MSW handlers de `/trucks` | REQ-04, REQ-05, REQ-PRESERVE-01 | developer | S2.T3 | front/jormat-front/src/components/items/camiones/**/*.test.tsx, front/jormat-front/src/test/msw/handlers/trucks.ts | `npm run test` front verde; coverage no baja | git revert | DET-7, DET-13 | done | 2 |
| S2.T5 | Docs (DET-37): backend module trucks + frontend camiones + data-model trucks + api contract en `jormat_docs`; nota de que RULE-api-001/RULE-database-001 se aplican a trucks app-native | REQ-01, REQ-02, REQ-03, REQ-04 | developer | S2.T4 | jormat_docs/backend/modules/trucks.md, jormat_docs/frontend/camiones.md, jormat_docs/data-model/trucks.md, jormat_docs/api/** | docs reflejan el esquema + endpoints + capabilities; sin refs a serial/int | git revert | DET-37 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T3)** — persistir en `## Sessions`, correr suite front + e2e/smoke, verificacion runtime DET-36 (deep-link `/inventario/camiones` carga listado + crear/editar), quality review dual-judge (DET-35), self-report (DET-33), decidir continue/iterate/escalate/close | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4, S2.T5 | ticket | gate persistido + decision + reviewer approved + evidencia runtime | (no aplica — cierre de session) | DET-20, DET-23, DET-33, DET-35, DET-36 | done | 2 |

### Task contract (notas de ejecucion)

```
Task S1.T1: Migracion app-native de trucks
- source_ref: REQ-01
- files: backend/jormat-api/migrations/20260813000002_trucks_app_native.ts
- precondition: 20260721000000 (uuid + workspace_id) aplicada; tabla sin datos de app (verificar) 
- expected_output: trucks con id uuid PK, client_id uuid FK customers, is_active smallint, status reservado; API arranca
- validation: migrate:latest + migrate:status; \d trucks; smoke health; DET-40 (ninguna columna viva sin reemplazo)
- rollback: migrate:rollback best-effort (irreversible parcial, documentado)
- rules: [DET-8, DET-40, RULE-database-001, RULE-api-001]

Task S1.T2: Repository + DTOs trucks (join a customers)
- source_ref: REQ-02, REQ-PRESERVE-01
- files: backend/jormat-api/src/trucks/trucks.repository.ts, dto/*
- expected_output: CRUD por uuid, listado con clientName+rut, soft-delete, cliente inmutable en update, user del token
- validation: unit repo; id=uuid; DET-40 paridad de requeridos + inmutabilidad + soft-delete
- rollback: git revert
- rules: [DET-40, RULE-api-001, RULE-database-001]
```

## Constraints

- [[RULE-database-001]]: `is_active smallint 1/0` como unica convencion de soft-delete; reads filtran `is_active=1`; delete = `is_active=0`. `status` reservado, no se lee como activeness. trucks lo aplica directo en su migracion app-native.
- [[RULE-api-001]]: el serial nunca cruza la frontera; `id`=uuid, `@Param('id')` string sin cast, `WHERE uuid`. trucks nace uuid-PK (no fachada), asi que su `id` uuid es el PK directo.
- DET-40 (auditoria de reemplazo): al reescribir el esquema de trucks (drop serial, cambio de tipos, drop de `date`/`update_date`), enumerar el comportamiento/columnas del esquema viejo y verificar que el nuevo lo replica antes de execute.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `customers` (JOR-089) + `catalogos/clientes` | internal | maestra de clientes (uuid) para la FK `client_id` y el buscador del form de creacion | ninguno (ya migrado); si falta el seed de clientes, el picker/e2e no tienen datos |
| Capability `catalogos:view` | internal | requerida por `GET /catalogos/clientes` (buscador de clientes) | un rol con `entities.trucks:edit` sin `catalogos:view` ve el buscador vacio → S1.T4 lo concede junto |
| Migracion 20260721 (uuid + workspace_id) | internal | provee `uuid` NOT NULL UNIQUE y `workspace_id` que la app-native promueve/conserva | ninguno (verificado presente) |
| RULE-database-001 + RULE-api-001 | internal | reglas que trucks aplica directo | ninguno (ya escritas) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Migracion irreversible (drop serial / drop date/update_date) | low | perdida del serial y de los timestamps legacy | tabla sin datos de app ni FK inbound (grep 0); `down()` best-effort; DET-40 audita; smoke de arranque |
| `client_id` int→uuid rompe filas existentes | low | fallo de migracion si hubiera datos | verificar 0 datos de app antes (T1); drop+add de columna en tabla vacia; si hubiera datos, escalar |
| Rol con `entities.trucks:edit` sin `catalogos:view` | medium | buscador de clientes vacio (403) al crear | S1.T4 concede `catalogos:view` con `edit`; scenario de REQ-03 lo cubre |
| Perder la paridad legacy (cliente editable, baja fisica) | medium | comportamiento distinto al legacy | REQ-PRESERVE-01 + TC2/TC3 + DET-40 |
| Lista exacta de 16 marcas no disponible en el repo | low | select de marca incompleto | extraer de `jormat-front-legacy/.../trucks-create.html` en S2.T1 (fuente unica; ver Technical reference) |

## Open questions

_(ninguna bloqueante — D1..D5 resueltas en el ticket; timestamps y matriz de grants resueltos en Decisions/Tasks. La lista de 16 marcas se extrae del legacy durante S2.T1, no es un bloqueo de diseño.)_

## Decisions

### DEC-LOCAL-01: descartar el serial y promover `uuid` a PK (uuid-PK app-native)
- **Contexto**: `trucks` tiene hoy serial PK `id` + `uuid` NOT NULL UNIQUE (agregado por JOR-099). El estandar del repo (customers/catalogos_repuestos) es uuid-PK expuesto como `id`.
- **Drivers**: cumplir RULE-api-001 sin arrastrar el serial; `customers.id` es uuid (la FK exige uuid); trucks no tiene FK inbound (grep 0), asi que no aplica la fachada serial de JOR-148.
- **Opcion elegida**: drop del serial `id` + rename `uuid`→`id` como PK uuid. La tabla queda indistinguible de un dominio uuid-native.
- **Alternativas**: (a) fachada uuid sobre serial (JOR-148) — descartada: trucks no tiene la malla de FK internos que justifica la fachada, y mantener el serial es deuda; (b) dejar el hibrido — descartada: incumple el estandar y complica la FK a customers.
- **Consecuencias**: migracion irreversible parcial (down best-effort). Esquema limpio, alineado al molde.
- **Session**: 1

### DEC-LOCAL-02: `client_id` int → uuid con FK a `customers.id` (drop+add sobre tabla sin datos)
- **Contexto**: `client_id` es hoy int sin FK; `customers.id` es uuid.
- **Drivers**: integridad ficha-cliente y join Cliente+Rut; imposibilidad de un FK int → PK uuid.
- **Opcion elegida**: convertir `client_id` a uuid NOT NULL con FK `customers.id` (RESTRICT). Como la tabla no tiene datos de app, es drop+add de columna (no cast/backfill).
- **Alternativas**: (a) mantener int + resolver por join manual — descartada: sin integridad referencial, fragil; (b) cast in-place — inaplicable (int no castea a uuid).
- **Consecuencias**: la FK garantiza que todo camion apunta a un cliente real; borrar un cliente con camiones queda RESTRINGIDO (coherente con soft-delete de customers).
- **Session**: 1

### DEC-LOCAL-03: `status` se conserva reservado (no se dropea, no se lee como activeness)
- **Contexto**: `trucks.status` (int def 0) es un flag legacy sin uso claro; D4 lo reserva.
- **Drivers**: no reinterpretar datos; preservar una posible feature futura (analogo a `in_status` en inventario).
- **Opcion elegida**: conservar `status` tal cual; solo se agrega/normaliza `is_active smallint`. Ningun read/delete lee `status` como activeness.
- **Alternativas**: dropear `status` — descartada por el dev (D4).
- **Consecuencias**: la columna queda vestigial hasta que un ticket futuro defina su dominio.
- **Session**: 1

### DEC-LOCAL-04: conservar los timestamps legacy `date`/`update_date` (NO dropear)
- **Contexto**: `trucks` tiene `date`/`update_date` (legacy) y ademas `created_at`/`updated_at` (agregados por JOR-099) — auditoria duplicada.
- **Opcion elegida (revisada por instruccion del dev)**: el dev pidio explicitamente "solo añadir is_active" en trucks. Por eso NO se dropea `date`/`update_date`; se conservan junto a `created_at`/`updated_at`. El repo usa `created_at`/`updated_at` (molde customers); los legacy quedan inertes.
- **Consecuencia**: redundancia de timestamps (inocua en tabla vacia). Si se quiere limpiar a futuro, es un ticket aparte con OK del dev.
- **Consecuencias**: menos columnas, alineado al molde. Se pierde la nomenclatura legacy (sin impacto: no hay consumidores).
- **Session**: 1

## Technical reference

Estado real verificado (2026-08-13):

- **Esquema actual de `trucks`** (dos capas): `20260715000000_trucks_table.ts` → `id` serial PK, `patent varchar(20)`, `client_id integer` (sin FK, idx `idx_trucks_client_id`), `brand varchar(50)`, `year integer`, `model varchar(100)`, `motor_number varchar(50)`, `chassis varchar(50)`, `is_active integer DEFAULT 1`, `date timestamp DEFAULT now()`, `update_date timestamp`, `user_id integer`, `user_update integer`, `status integer DEFAULT 0`, idx `idx_trucks_patent`. Luego `20260721000000_normalize_inventory_plural.ts` (JOR-099) **agrego** a las 13 tablas de inventario (incluida trucks): `uuid` (DEFAULT `uuid_generate_v4()`, luego NOT NULL + constraint `trucks_uuid_unique`), `workspace_id uuid NOT NULL` (FK `workspaces` ON DELETE CASCADE, DEFAULT `11111111-...`), `created_at`/`updated_at` (trucks no tenia `created_at`, asi que `timestamps(true,true)` los agrego), idx `idx_trucks_workspace_id`. **Estado HOY: serial PK + uuid + workspace_id + client_id int + is_active int + status int + date/update_date + created_at/updated_at conviven.** trucks NO tiene FK inbound (nada referencia su PK).
- **Molde backend** (`src/customers/`): `activeScope = tenantScoped(db, 'customers', workspaceId).where('customers.is_active', 1)`; list paginado con `SORTABLE_COLUMNS`/`SORT_COLUMN_MAP` + `resolvePagination`/`buildPaginatedResult`; `create` inserta `{ workspace_id, ...cols }` con `.returning(SELECT_COLS)`; `softDelete` = `update({ is_active: 0, updated_at: now() })`; controller `@Controller('customers')` con trio de guards + `@RequireCapability('entities.customers:edit')` por accion + `@Param('id') string`; DTO expone `id` uuid como ejemplo. `customers` esta montado en `app.module.ts` (linea 40). Migracion `20260723000000_customers.ts` = uuid PK + workspace_id + timestamps (molde app-native).
- **Familia de capability**: `entities.*` para datos maestros referenciados por otros modulos: `entities.customers:edit` (seed `05_sales_capabilities.ts`), `entities.suppliers:view` (seed `04_items_capabilities.ts`). Formato `module.feature:action`. Grants de roles demo en `10_demo_roles_users.ts` (`grantCapabilities` valida que cada cap exista en el catalogo). **`catalogos:view`** (seed 04) es la capability del `GET /catalogos/clientes` (buscador de clientes) — NO esta concedida a los roles demo en 10 hoy; S1.T4 la agrega a los roles con `entities.trucks:edit`.
- **Molde front mantenedor** (`components/items/categorias/`): `CategoriasView` = `RouteGuard cap` + `PageLayout` + buscador + `CategoriasTable` (server pagination) + `CategoriaFormModal` (rhf+zod, `useUnsavedChangesModal`/`useFormMountBaseline`, remontado por `key`) + `ConfirmDialog`; acciones con `<Can>`. Service `catalogos/categorias.ts` (list paginado a `/list`, create/update/delete). Hooks en `useCatalogos.ts`. Page thin-wrapper. Nav en `nav-data.ts` (grupo Inventario, `cap` por entrada).
- **Buscador de clientes reusable**: `useClientes(q, { enabled: q.length>=2 })` → `listClientes(q)` → `GET /catalogos/clientes?q=` (`Cliente` tiene `id` uuid + razonSocial/rut/telefono/ciudad/direccion). Patron select-suggest en `TransactionBuilder.tsx` (input de query + listbox de resultados + `handleSelectCliente` que guarda el cliente). El form de creacion de camion reusa este patron para elegir el dueño y guardar `clientId`.
- **Lista de 16 marcas**: select fijo en el legacy `jormat-front-legacy/src/app/items/trucks/trucks-create.html` (backend legacy fuera del repo). Extraer los 16 valores en S2.T1 y fijarlos como enum en `lib/schemas/trucks.ts` + `CreateTruckDto` (brand opcional).
- **Ejecucion de tests**: unit host o in-container; e2e `docker exec jormat-evolution-api-1 npm run test:e2e`. Front: `npm run test` (Vitest) + MSW handlers en `src/test/msw/handlers/`.

## Rules discovered

_(se llena durante ejecucion)_

## Bugs found

_(se llena durante ejecucion)_

## Acceptance checkpoints

- [x] **Funcional**: `trucks` **fachada uuid** (serial PK interno + uuid publico, client_id uuid FK, is_active smallint, status reservado); CRUD `/api/trucks` por uuid con join Cliente+Rut; soft-delete; RBAC 403; front listado/crear(picker)/editar(cliente inmutable)/baja. Verificado.
- [x] **Tests** (DET-37 dim4): unit **714/714** + e2e backend **172/172** (`trucks.e2e` 7/7: join, soft-delete, 403, cliente invalido) + tests front camiones 13/13 + MSW, en VERDE.
- [x] **NFRs**: 0 fugas cross-workspace (tenantScoped); 0 endpoints sin gate (@RequireCapability por accion); 0 ids numericos emitidos (repo emite uuid AS id).
- [x] **Rules**: RULE-database-001 (is_active 1/0, status reservado) y RULE-api-001 (id=uuid, fachada) respetadas (dual review).
- [x] **Integration**: paridad legacy preservada (requeridos, año 1980-2030, marca opcional, N° motor opcional, cliente inmutable, baja logica).
- [x] **Docs oficiales** (DET-37 dim1): jormat_docs backend module + frontend + data-model reflejan trucks.
- [x] **KB DKC** (DET-37 dim2): sin rules/bugs nuevos (trucks aplica RULE-database-001 + RULE-api-001 existentes).
- [~] **Runtime** (DET-36): **smoke-not-reproducible** — `/inventario/camiones` esta tras login MSAL/CIAM, no autenticable en el browser. Cubierto por tests de componente (vitest+MSW 13/13) + e2e (7/7); el front sirve (login renderiza).
- [x] **Planning-completeness**: complete (docs + tests como tasks S1/S2; KB N/A).
