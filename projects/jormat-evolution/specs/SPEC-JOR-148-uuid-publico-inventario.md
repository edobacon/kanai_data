---
id: SPEC-JOR-148-uuid-publico-inventario
project: jormat-evolution
ticket: JOR-148
status: done
---

# Exponer uuid publico como identificador en inventario (el serial deja de cruzar la API)

# Exponer uuid publico como identificador en inventario (el serial deja de cruzar la API)

## Executive summary - lo que estas aprobando

**Que se quiere**: hoy el inventario se direcciona y expone por su id serial entero (`/api/inventario/items/25477`, `id: "25477"` en el payload). Un serial secuencial expuesto habilita enumeracion trivial de recursos (IDOR) y filtra informacion de negocio por el propio incremento. Esta mejora migra la frontera publica de inventario a un identificador uuid: el campo del contrato se sigue llamando `id` pero su VALOR pasa a ser el uuid (ya provisto `NOT NULL UNIQUE` en las tablas). El PK serial y los FKs internos quedan intactos (fachada, no migracion de PK). Empieza por `items` y replica por el resto de dominios de inventario en el mismo PR.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | El identificador del contrato se llama `id` y su valor es el uuid (NO se agrega un campo `uuid` aparte). Fachada: el repo emite `SELECT uuid AS id`, resuelve `WHERE uuid = :id`, `RETURNING uuid`; los joins/pivotes internos siguen por serial (resolucion uuid -> serial UNA vez al entrar). NO se migra el PK | Mantiene un solo shape de identificador (`record.id`) en todo el contrato y evita reescribir todos los FKs internos. Reversible, aislado a la capa API/repo + front |
| 2 | El token de sort `id` deja de ordenar por el serial y mapea a `created_at` (no al uuid) | Preserva la semantica "recientes primero" del `defaultSort id desc` actual; el uuid v4 no es monotonico (ordenar por uuid seria un orden estable pero sin sentido de negocio) |
| 3 | La superficie de referencia de catalogo (filtros pivote + arrays `categorias/aplicaciones/proveedores` del detalle + payloads de create/update + los endpoints `catalogos/categorias`, `catalogos/aplicaciones`, `catalogos/proveedores`) flipa a uuid EN EL MISMO PR que items, no despues | items y catalogos estan acoplados por esos ids: si items empieza a esperar uuid en los filtros mientras catalogos sigue emitiendo serial (o viceversa), el filtro de categoria/aplicacion del listado se rompe. Deben viajar juntos |
| 4 | Rollout big-bang por dominio, sin ventana de compat dual-accept | Front y back viven en el mismo monorepo, sin consumidores externos del API (D3 del ticket) |

**Riesgos principales y como los mitigamos**:

- **Un serial re-expuesto a futuro** (una proyeccion nueva que vuelva a seleccionar `i.id`) -> guardarrail de regresion (REQ-IMPROVE-05): test que falla si CUALQUIER endpoint de inventario emite un id numerico o si `:id` con un serial resuelve.
- **Romper el filtro de categoria/aplicacion del listado** (acople items <-> catalogos) -> los dos dominios flipan a uuid en la misma session (DEC-LOCAL-01); el guardarrail corre despues del flip de catalogos.
- **Un Zod schema del front que valide `id` como numerico** rechazaria el uuid -> T3 verifica que los schemas de item aceptan uuid antes de dar por transparente el cambio de valor.
- **Perder los marcadores `DEUDA_TECNICA` DT-18/DT-19** que JOR-144 dejo vivos en `items.repository.ts` al reescribir proyecciones -> DET-40 (auditoria de reemplazo): enumerar y re-verificar 1:1 antes de execute.

**Que NO se hace en este ticket** (limites explicitos del scope):

- Migrar los PK internos serial -> uuid ni tocar FKs internos (D2): destructivo, alto riesgo, sin beneficio adicional.
- `trucks`: queda FUERA. Lo rehace [[JOR-147]] como uuid-PK app-native (no tiene FK inbound, no aplica la fachada).
- Reconectar `sales`/`purchases`/`payments` al uuid de item (D4): hoy embeben `itemId` serial en data mockeada; impacto downstream registrado, se ejecuta cuando esos dominios se conecten a datos reales.
- Dominios que ya usan uuid como `id` (`customers`, `catalogos_repuestos`): ya cumplen la convencion, son el molde.
- Lecturas que NO emiten un serial (bodegas via `catalogos/bodegas` expone `ds_code` como `codigo`, no un id; `locations` sin endpoint propio): no requieren cambio (ver Technical reference).

**Tamano estimado**: 1 session (T2). La parte mas riesgosa es T4 (flip acoplado items <-> catalogos): toca las dos mallas de referencia a la vez y es donde un error rompe el filtro del listado.

**Como vas a saber que funciona**:

- `GET /api/inventario/items/{uuid}` devuelve el item correcto con `id` = uuid; `GET /api/inventario/items/{serial}` da 404.
- Ningun payload de inventario (list/detail/summary, arrays de catalogo, endpoints de catalogos) contiene un id numerico.
- El deep-link `/inventario/items/{uuid}` navega y carga la ficha; editar/duplicar por uuid funciona.
- Filtrar el listado por una categoria/aplicacion (ahora por su uuid) sigue devolviendo el subset correcto.
- La suite unit + e2e queda verde.

---

## Purpose

Migrar la frontera publica del inventario de `jormat-api` de un id serial a un uuid publico, aplicando [[RULE-api-001]] (el serial nunca cruza la frontera de la API/vista). Patron fachada: el PK serial y los FKs internos se conservan; el repo proyecta `uuid AS id`, resuelve `WHERE uuid = :id` y `RETURNING uuid`, y traduce `uuid -> serial` una sola vez al entrar para operar joins/pivotes/`syncPivots` por serial. Alcance: dominio `items` primero y el resto de dominios de inventario con endpoint propio (categorias, aplicaciones, proveedores) en el mismo PR (big-bang por dominio, D3). Sin cambio de esquema ni de datos (la columna `uuid` ya existe `NOT NULL UNIQUE`).

## Requirements

### REQ-IMPROVE-01: el contrato de items direcciona y expone por uuid

> **Que cambia**: `GET/POST/PATCH/DELETE /api/inventario/items[/:id]`, `GET :id`, `GET summary` y las salidas de listado/detalle usan el uuid como `id`. El serial deja de emitirse en cualquier salida.
> **Por que**: cortar la enumeracion trivial del inventario por el id secuencial (IDOR).

El sistema MUST proyectar el uuid como campo `id` (`SELECT uuid AS id`) en todas las salidas del dominio items (list, detail, summary derivado, create, update). El serial (`items.id`) MUST NOT aparecer en ningun payload de respuesta. La resolucion interna `uuid -> serial` para joins/pivotes/`syncPivots`/`RETURNING` MUST hacerse una sola vez por operacion; los joins, `item_warehouses`, `item_references` y `syncPivots` internos MUST seguir operando por serial (fachada, no migracion de PK).

**Actor**: system, public · **Layers**: backend, api, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: detalle por uuid
- **GIVEN** un item sembrado, **WHEN** `GET /api/inventario/items/{uuid}`, **THEN** 200 y `body.id` = uuid, sin ningun serial en el payload.

#### Scenario: create devuelve uuid
- **GIVEN** un payload valido, **WHEN** `POST /api/inventario/items`, **THEN** 201 y el detalle devuelto trae `id` = uuid (el repo hace `RETURNING uuid`), y las filas pivote se insertaron con el serial interno resuelto.

#### Scenario: update/softDelete mutan la fila correcta
- **GIVEN** un item activo con uuid conocido, **WHEN** `PATCH`/`DELETE /items/{uuid}`, **THEN** se muta la fila correcta (resuelta por uuid), el serial interno y sus FKs quedan intactos.

</details>

#### Acceptance
Abrir el detalle de un item por su uuid devuelve la ficha correcta y ningun campo del payload es un numero secuencial.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | detalle por uuid | item sembrado | GET /items/{uuid} | 200, id=uuid | sin serial en payload |
| 2 | create RETURNING uuid | payload valido | POST /items | 201, detalle | id es uuid, pivotes por serial |

### REQ-IMPROVE-02: el `:id` entrante se resuelve contra uuid; un serial no resuelve

> **Que cambia**: los endpoints de items resuelven el `:id` de la URL contra la columna `uuid`. Un serial pasado como `:id` da 404. El filtro `itemId` del listado tambien se resuelve por uuid.
> **Por que**: aceptar el serial como `:id` dejaria abierta la mitad de la superficie IDOR (leer/mutar por serial).

El sistema MUST resolver el `:id` entrante de items (`getOne`, `update`, `remove`, `setFailure`, `setPriority`, `:id/images*`) contra `WHERE uuid = :id`. Un serial pasado como `:id` MUST NOT resolver (404). El param MUST tiparse `string` y NO castearse a `Number` en el limite publico. El filtro de query `itemId` (hoy `itemId?: number`, `WHERE i.id = itemId`) MUST pasar a `string` y resolverse contra el uuid (es el identificador propio del item usado como filtro).

**Actor**: public · **Layers**: backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: serial como :id da 404
- **GIVEN** un item con serial 25477 y su uuid, **WHEN** `GET /api/inventario/items/25477`, **THEN** 404 (el serial ya no direcciona).

#### Scenario: filtro itemId por uuid
- **GIVEN** un item sembrado, **WHEN** `GET /items?itemId={uuid}`, **THEN** el listado devuelve ese item; con un serial como `itemId` no matchea.

</details>

#### Acceptance
Pegarle a un endpoint de item con el numero serial viejo devuelve 404; solo el uuid resuelve.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | serial no resuelve | item sembrado | GET /items/{serial} | 404 | no encontrado |
| 2 | param string sin cast | detail por uuid | GET /items/{uuid} | 200 | @Param string, sin Number() |

### REQ-IMPROVE-03: superficie derivada (filtros de pivote y sort)

> **Que cambia**: los filtros de catalogo del listado/summary (`categorias`, `aplicaciones`, y `proveedores` donde aplique) reciben uuid y se traducen a serial en el limite. El token de sort `id` deja de ordenar por serial y mapea a `created_at`.
> **Por que**: si el filtro sigue esperando serial mientras el front pasa uuid (que le da el catalogo ya migrado), el filtro deja de matchear. Y el token `id` no debe exponer/ordenar por el serial.

El sistema MUST aceptar uuids en los filtros de pertenencia N:M del listado y del summary (`applyPivotFilter`, `applySummaryFilters` para `categorias`/`aplicaciones`) y traducirlos a los seriales de la maestra correspondiente antes del `whereExists`/`whereIn` interno. El token de ordenamiento `id` (whitelist `SORTABLE_COLUMNS`, `SORT_COLUMN_MAP`, `defaultSort`) MUST mapear a `items.created_at` (campo estable, preserva "recientes primero"), NO al serial ni al uuid. La validacion de los ids de filtro MUST dejar de exigir enteros positivos (`parseIdCsv`) y pasar a validar uuids.

**Actor**: public, system · **Layers**: backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: filtro por uuid de categoria
- **GIVEN** items con categorias, **WHEN** `GET /items?categorias={uuid-categoria}`, **THEN** el subset correcto (traducido uuid -> serial internamente).

#### Scenario: sort id estable
- **GIVEN** varios items, **WHEN** `GET /items?sort=id:desc`, **THEN** ordena por `created_at desc` (recientes primero), sin exponer el serial.

</details>

#### Acceptance
Filtrar el listado por una categoria (por su uuid) devuelve el subset correcto; ordenar por `id` sigue mostrando los recientes primero.

### REQ-IMPROVE-04: front de items transporta uuid (transparente al valor)

> **Que cambia**: las rutas `[id]`, el cliente API y `api.gen.ts` transportan el uuid. El componente sigue leyendo `record.id` (cambia el valor, no el shape).
> **Por que**: el front ya trata `id` como `string` de punta a punta; el cambio es de valor, no de forma, salvo validaciones que asuman formato numerico.

El front MUST transportar el uuid en las rutas dinamicas `[id]` (detail/editar/duplicar), el cliente `services/api/inventario/items.ts` y los tipos (`api.gen.ts` regenerado). Los componentes MUST seguir leyendo `.id` sin ramificar. Los schemas Zod de item (`lib/schemas/items`) MUST aceptar un uuid como `id` (NO una regex/validacion numerica). El token de sort emitido por la tabla (`sort=id:...`) se conserva; el backend lo remapea (REQ-IMPROVE-03).

**Actor**: user · **Layers**: frontend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: deep-link por uuid
- **GIVEN** un item sembrado, **WHEN** se abre `/inventario/items/{uuid}`, **THEN** la ficha carga; editar (`/{uuid}/editar`) y duplicar (`/{uuid}/duplicar`) navegan bien.

#### Scenario: Zod acepta uuid
- **GIVEN** un detalle con `id` uuid, **WHEN** el schema Zod parsea la respuesta, **THEN** valida sin error (no exige numerico).

</details>

#### Acceptance
Navegar y editar un item por su uuid desde la UI funciona igual que antes; el listado y el detalle muestran el uuid como identificador.

### REQ-IMPROVE-05: guardarrail de regresion (ningun serial cruza la API)

> **Que cambia**: se agrega un test transversal que verifica que ningun endpoint de inventario emite un id numerico y que `:id` con un serial da 404.
> **Por que**: cerrar la puerta a re-exponer el serial en una proyeccion futura (regresion silenciosa).

El sistema MUST tener un test de regresion que (a) recorra las salidas de inventario (items list/detail/summary, arrays de referencia `categorias/aplicaciones/proveedores`, y los endpoints de catalogos `categorias`/`aplicaciones`/`proveedores`) y falle si algun `id` emitido es numerico, y (b) verifique que `GET /items/{serial}` y `GET`/`PATCH` de un catalogo por su serial dan 404. El test MUST correr despues del flip de catalogos (REQ-IMPROVE-06) para cubrir la superficie completa.

**Actor**: system · **Layers**: backend, api

#### Acceptance
La suite incluye un test que falla si un endpoint de inventario vuelve a emitir un id numerico o si un serial vuelve a resolver como `:id`.

### REQ-IMPROVE-06: resto de dominios de inventario (catalogos + superficie de referencia acoplada)

> **Que cambia**: `catalogos/categorias`, `catalogos/aplicaciones` (CRUD) y `catalogos/proveedores` (lectura) direccionan/exponen por uuid; y en el MISMO cambio, los arrays `categorias/aplicaciones/proveedores` del detalle de item, los payloads de create/update de item y los filtros de pivote pasan a uuid.
> **Por que**: esos ids de catalogo son referenciados por items (filtros, arrays del detalle, payloads). El front toma el id del catalogo y lo manda al filtro/create de item. Si un lado flipa y el otro no, el filtro y el alta se rompen. Deben viajar juntos (D3 big-bang por dominio, aplicado a la malla acoplada).

El sistema MUST hacer que `catalogos.repository`/`catalogos.controller`/`CategoriaDto`/`AplicacionDto`/`ProveedorDto` emitan el uuid como `id` (`SELECT uuid AS id`) y resuelvan el `:id` de categorias/aplicaciones contra el uuid (`WHERE uuid`, sin `Number.parseInt`). En el mismo cambio, en `items.repository`: (a) `fetchPivotIds` (arrays del detalle) MUST emitir los uuid de la maestra (join pivote -> maestra), NO el serial del FK; (b) `syncPivotIds` (create/update) MUST recibir uuids, resolverlos a serial de la maestra (validando ownership por workspace + `is_active=1`, como hoy) e insertar el FK serial; (c) los filtros de pivote/summary MUST traducir uuid -> serial. El front MUST seguir consumiendo `.id` del catalogo (transparente). `catalogos/bodegas` NO cambia (expone `codigo`, no un id). Comportamiento y datos internos intactos (REQ-PRESERVE-01).

**Actor**: public, system · **Layers**: backend, api, frontend, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: categoria por uuid
- **GIVEN** una categoria sembrada, **WHEN** `PATCH /api/catalogos/categorias/{uuid}`, **THEN** muta la fila correcta; `PATCH .../{serial}` da 404.

#### Scenario: detalle de item emite uuids de catalogo
- **GIVEN** un item con categorias, **WHEN** `GET /items/{uuid}`, **THEN** `body.categorias` son uuids de categoria (no seriales).

#### Scenario: create de item por uuid de catalogo
- **GIVEN** categorias validas, **WHEN** `POST /items` con `categorias: [uuid]`, **THEN** 201 y las filas `item_categories` se insertan con el serial resuelto de la maestra.

</details>

#### Acceptance
Editar una categoria por su uuid funciona y da 404 con el serial; el detalle de item muestra uuids de catalogo; crear un item eligiendo categorias por uuid persiste las relaciones.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Security | El serial no cruza la frontera de la API (IDOR) | ids numericos emitidos por inventario | 0 (verificado por guardarrail REQ-IMPROVE-05) |
| Performance | La resolucion uuid -> serial no degrada las lecturas | costo adicional por operacion | 1 resolucion (index unico en `uuid`), marginal |

## Artifacts

### Endpoints (contrato afectado; sin cambio de rutas, cambia el tipo/valor de `:id` y de `id`)

| Method | Path | `:id` resuelve por | `id` emitido |
|--------|------|--------------------|--------------|
| GET | /api/inventario/items | (n/a) | uuid |
| GET | /api/inventario/items/summary | (n/a) | (sin id; filtros por uuid) |
| GET/PATCH/DELETE | /api/inventario/items/:id | uuid | uuid |
| POST | /api/inventario/items | (n/a, RETURNING uuid) | uuid |
| PATCH | /api/inventario/items/:id/failure, /:id/priority | uuid | uuid |
| POST/DELETE | /api/inventario/items/:id/images[/:attachmentId] | uuid | uuid (item) |
| GET | /api/uploads/inventario/items/:id/images/:attachmentId (firmado) | uuid | (binario) |
| GET | /api/catalogos/categorias, /aplicaciones, /proveedores | (n/a) | uuid |
| PATCH/DELETE | /api/catalogos/categorias/:id, /aplicaciones/:id | uuid | uuid |
| GET | /api/catalogos/bodegas | (n/a) | `codigo` (sin cambio) |

### Models (sin cambio de esquema; columna ya provista)

| Table | Column | Type | Nullable | Default | Description |
|-------|--------|------|----------|---------|-------------|
| items, warehouses, providers, categories, applications, locations, item_references, item_providers, item_categories, application_items, item_warehouses, item_warehouse_locations | uuid | uuid | no | uuid_generate_v4() | identificador publico (ya `NOT NULL UNIQUE` por 20260721) - se cablea, no se crea |

## Tasks

### Session 1 - Fachada uuid en inventario (items + catalogos) [tipo: ⚑ fuerte] [tier: T2]

> Session unica. `⚑ fuerte`: cambio de contrato multi-repo (back + front) con superficie acoplada (items <-> catalogos). Dual-judge (DET-35, aplica en T2). Orden: primero el identificador propio de items (T1-T3), luego el flip acoplado de la malla de referencia + catalogos (T4), luego el guardarrail sobre la superficie completa (T5) y docs (T6).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Repo items - identificador propio por uuid: proyeccion `uuid AS id` en `findById`/`buildDataQuery`/`mapRowToDto`/`mapDetailRow`; `WHERE uuid = :id` en `findById`/`update`/`softDelete`/`setFailure`/`setPriority`/`existsActive`/`removeImage`; `RETURNING uuid` en `create`; resolver `uuid -> serial` UNA vez para `syncPivots`/pivotes; filtro `itemId` por uuid; sort token `id` -> `created_at` (`SORT_COLUMN_MAP`, `defaultSort`). Preservar marcadores DT-18 (`bloqueoDescuento`) y DT-19 (`canales.catalogo`) | REQ-IMPROVE-01, REQ-IMPROVE-02, REQ-IMPROVE-03 | developer | — | backend/jormat-api/src/items/items.repository.ts | unit repo items in-container (`docker exec jormat-evolution-api-1 npm run test -- items.repository`) o host; DET-40 audita que cada proyeccion/where migrado replica el comportamiento viejo 1:1 y DT-18/DT-19 siguen presentes | git revert | DET-40, RULE-api-001, RULE-database-001 | done | 1 |
| S1.T2 | DTO/query-dto/controller items + Swagger: `ListItemsQueryDto.itemId` de `number` a `string` (sin `Number()` en el limite, quitar `IsInt`); confirmar `@Param('id')` string sin cast; actualizar ejemplos `@ApiProperty` de `id` (ItemDto/ItemDetailDto) a un uuid; regenerar `docs-json`/Swagger | REQ-IMPROVE-01, REQ-IMPROVE-02 | developer | S1.T1 | backend/jormat-api/src/items/items.controller.ts, backend/jormat-api/src/items/dto/list-items-query.dto.ts, backend/jormat-api/src/items/dto/item.dto.ts | unit controller items; build Swagger sin error | git revert | RULE-api-001 | done | 1 |
| S1.T3 | Front items - transparencia de valor: verificar que rutas `[id]` (detail/editar/duplicar), `services/api/inventario/items.ts` y componentes leen `.id` string sin cast (ya es asi); VALIDAR que los Zod schemas de item aceptan uuid (no regex numerica) y ajustarlos si hace falta; regenerar `api.gen.ts` (`npm run generate:api-types`) | REQ-IMPROVE-04 | developer | S1.T2 | front/jormat-front/src/app/(app)/inventario/items/[id]/**, front/jormat-front/src/services/api/inventario/items.ts, front/jormat-front/src/lib/schemas/items, front/jormat-front/src/types/api.gen.ts | tsc front verde; e2e smoke deep-link `/inventario/items/{uuid}` carga la ficha | git revert | RULE-api-001 | done | 1 |
| S1.T4 | Resto de dominios + malla de referencia acoplada (flip conjunto): catalogos categorias/aplicaciones (CRUD) y proveedores (lectura) emiten `uuid AS id` y resuelven `:id` por uuid (sin `Number.parseInt`); en items.repository: `fetchPivotIds` emite uuids de la maestra (join pivote -> maestra), `syncPivotIds` recibe uuids y resuelve a serial de la maestra (conservando validacion de ownership + `is_active=1`), `applyPivotFilter`/`applySummaryFilters`/`parseIdCsv` traducen uuid -> serial; front consume `.id` uuid del catalogo (hooks/cliente catalogos); regenerar `api.gen.ts` | REQ-IMPROVE-06, REQ-IMPROVE-03, REQ-PRESERVE-01 | developer | S1.T3 | backend/jormat-api/src/catalogos/catalogos.repository.ts, backend/jormat-api/src/catalogos/catalogos.controller.ts, backend/jormat-api/src/catalogos/dto/catalogos.dto.ts, backend/jormat-api/src/items/items.repository.ts, front/jormat-front/src/services/api/catalogos/**, front/jormat-front/src/hooks/useCatalogos.ts | unit repos items+catalogos; e2e filtro `categorias={uuid}` devuelve subset correcto; PATCH catalogo por serial da 404; DET-40 audita paridad de create/update de pivotes | git revert | DET-40, RULE-api-001, RULE-database-001 | done | 1 |
| S1.T5 | Guardarrail de regresion (superficie completa, despues del flip de catalogos): test e2e que recorre inventario (items list/detail/summary + arrays `categorias/aplicaciones/proveedores` + endpoints catalogos) y falla si algun `id` emitido es numerico; y que `GET /items/{serial}` y `PATCH/GET` de catalogo por serial dan 404 | REQ-IMPROVE-05 | developer | S1.T4 | backend/jormat-api/test/e2e/**, backend/jormat-api/src/items/items.controller.spec.ts, backend/jormat-api/src/catalogos/catalogos.controller.spec.ts | `docker exec jormat-evolution-api-1 npm run test:e2e` verde; el guardarrail falla si se re-expone un serial (verificado invirtiendo una proyeccion) | git revert | DET-7, DET-13, RULE-api-001 | done | 1 |
| S1.T6 | Docs + regla: actualizar `jormat_docs` (backend/modules items+catalogos, frontend items-list-detail + catalog-maintainers, api contract, data-model) reflejando `id`=uuid y `:id` por uuid; nota de la convencion; mantener viva [[RULE-api-001]] (marcar la migracion de inventario como aplicada) | REQ-IMPROVE-01 | developer | S1.T5 | jormat_docs/backend/modules/catalogos.md, jormat_docs/frontend/items-list-detail.md, jormat_docs/frontend/catalog-maintainers.md, jormat_docs/api/**, jormat_docs/data-model/**, deckard/projects/jormat-evolution/rules/api/RULE-api-001-public-uuid-identifier.md | docs reflejan uuid; sin refs a id serial publico | git revert | DET-37 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** - persistir resultados en `## Sessions` del ticket, correr suite unit + e2e + coverage delta, quality review con dual-judge aislado (DET-35), self-report verification (DET-33), decidir continue/iterate/escalate/close | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5, S1.T6 | ticket | gate persistido + decision documentada + reviewer approved | (no aplica - cierre de session) | DET-20, DET-23, DET-33, DET-35 | done | 1 |

### Task contract (notas de ejecucion)

```
Task S1.T1: Repo items - identificador propio por uuid
- source_ref: REQ-IMPROVE-01, REQ-IMPROVE-02, REQ-IMPROVE-03
- files: backend/jormat-api/src/items/items.repository.ts
- precondition: JOR-144 y JOR-145 commiteados (comparten items.repository.ts)
- expected_output: el repo emite/resuelve items por uuid; joins/pivotes internos siguen por serial; DT-18/DT-19 intactos
- validation: unit repo items; DET-40 auditoria de reemplazo (cada where/proyeccion migrado replica el viejo 1:1)
- rollback: git revert
- rules: [DET-40, RULE-api-001, RULE-database-001]

Task S1.T4: Flip acoplado items <-> catalogos
- source_ref: REQ-IMPROVE-06, REQ-IMPROVE-03, REQ-PRESERVE-01
- precondition: S1.T3 (item propio ya por uuid)
- expected_output: categorias/aplicaciones/proveedores por uuid; arrays de referencia del detalle emiten uuid; create/update resuelven uuid->serial; filtros traducen; front consume uuid del catalogo
- validation: unit + e2e filtro por uuid; PATCH catalogo por serial 404; DET-40 paridad de syncPivotIds
- rollback: git revert
- rules: [DET-40, RULE-api-001, RULE-database-001]
```

## Constraints

- [[RULE-api-001]]: el serial nunca cruza la frontera de la API/vista; `id`=uuid, `WHERE uuid`, `RETURNING uuid`, fachada sobre PK serial, filtros/sort derivados por uuid. Es la regla que este ticket materializa para inventario.
- [[RULE-database-001]] (via SPEC-JOR-145): los reads de vivos filtran `is_active=1`; este ticket NO toca ese predicado, lo hereda como base estable del guardarrail.
- DET-40 (auditoria de reemplazo): al reescribir proyecciones/where y el path de pivotes, enumerar el comportamiento viejo (efectos, casing, orden, validaciones) y verificar 1:1 que el nuevo lo replica antes de execute.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| SPEC-JOR-145 (soft-delete is_active) | internal | reescribe los mismos repos de items; se ejecuta antes para dejar `WHERE is_active=1` como base estable | colision de merge si se ejecutan en paralelo |
| JOR-144 | internal | comparte items.repository.ts/items.controller.ts (comentarios DT-18/DT-19) | perder los marcadores DEUDA_TECNICA al reescribir proyecciones (DET-40 lo cubre) |
| Columna `uuid` (migracion 20260721) | internal | ya existe `NOT NULL UNIQUE` en las 12 tablas de inventario | ninguno (verificado presente) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Flip parcial rompe el filtro de categoria/aplicacion del listado (acople items <-> catalogos) | high (si se hace por separado) | filtro del listado roto | DEC-LOCAL-01: items y catalogos flipan juntos en la misma session; guardarrail corre despues del flip |
| Una proyeccion futura re-expone el serial | medium | regresion IDOR silenciosa | guardarrail REQ-IMPROVE-05 (falla si hay id numerico o serial resuelve) |
| Zod del front valida `id` como numerico | medium | detalle no parsea con uuid | T3 verifica/ajusta los schemas antes de dar por transparente el valor |
| Perder marcadores DT-18/DT-19 al reescribir | low | reaparece deuda oculta | DET-40 auditoria de reemplazo en T1/T4 |
| Sort `id` sin `created_at` disponible | low | orden no estable | verificado: `items` tiene `created_at` (migracion base 20260714) |

## Open questions

_(ninguna - D1..D4 del ticket resueltas; sort -> created_at y acople items<->catalogos resueltos en Decisions)_

## Decisions

### DEC-LOCAL-01: items y catalogos flipan a uuid en la misma session (superficie acoplada)
- **Contexto**: los ids de categoria/aplicacion/proveedor que el filtro del listado, los arrays del detalle y los payloads de create/update de item consumen provienen de los endpoints `catalogos/*`. El front toma `c.id` del catalogo y lo manda al filtro/create de item.
- **Drivers**: no dejar un estado intermedio roto (un lado esperando uuid mientras el otro emite serial rompe el filtro y el alta).
- **Opcion elegida**: flipar el identificador propio de items (T1-T3) y luego, en la misma session, la malla de referencia + catalogos (T4) de forma conjunta; el guardarrail (T5) corre al final sobre la superficie completa.
- **Alternativas**: (a) items primero en un PR y catalogos en otro (descartada: ventana con el filtro roto, contradice big-bang D3); (b) mantener los ids de catalogo en serial y solo flipar el id propio de item (descartada: dejaria seriales de catalogo cruzando la API, incumple RULE-api-001 y el guardarrail).
- **Consecuencias**: T4 es la task mas riesgosa (toca las dos mallas). El intermedio T1-T3 es consistente (categorias siguen 100% seriales hasta T4).
- **Session**: 1

### DEC-LOCAL-02: el token de sort `id` mapea a `created_at`, no al uuid
- **Contexto**: `SORT_COLUMN_MAP.id = 'sub.id'` (serial) y `defaultSort { id, desc }` ordenan hoy por el serial (proxy de "recientes primero"). El front emite `sort=id:...` desde la columna `id` de la tabla.
- **Drivers**: preservar la semantica "recientes primero" sin exponer/ordenar por el serial.
- **Opcion elegida**: mapear `id` a `items.created_at` (existe en el esquema). El front conserva el token `id`; el backend lo remapea.
- **Alternativas**: (a) ordenar por `uuid` (descartada: uuid v4 no monotonico, orden estable pero sin sentido de negocio); (b) renombrar el token de sort a `created_at` en el front (descartada: cambio innecesario, el remapeo server-side alcanza).
- **Consecuencias**: la flecha de sort de la columna `id` ordena por `created_at` (matiz de UX menor, aceptable). Sin cambio en el front.
- **Session**: 1

## Technical reference

Estado real verificado (2026-08-13):

- **Columna `uuid`**: `NOT NULL UNIQUE` (default `uuid_generate_v4()`) en las 12 tablas de inventario que reciben la fachada (`items`, `warehouses`, `providers`, `categories`, `applications`, `locations`, `item_references`, `item_providers`, `item_categories`, `application_items`, `item_warehouses`, `item_warehouse_locations`). `trucks` tambien la recibio pero queda FUERA (JOR-147). Fuente: `backend/jormat-api/migrations/20260721000000_normalize_inventory_plural.ts` (INVENTORY_TABLES + up() pasos 3-5).
- **Donde items emite/resuelve el serial hoy** (`backend/jormat-api/src/items/items.repository.ts`): proyecciones `select('i.id', ...)` en `findById` (~340) y `buildDataQuery` (~865); `mapDetailRow` `id: String(row.id)` (~510) y `mapRowToDto` `id: String(row.id)` (~1138); `.where('i.id', id)` / `.where('items.id', id)` en `findById` (~365), `update` (~578), `softDelete` (~599), `setFailure` (~611), `setPriority` (~619), `existsActive` (~631); `RETURNING 'id'` + `Number(id)` en `create`/`syncPivots` (~561-565, ~588); filtro `itemId` `.where('i.id'/'sub.id', query.itemId)` (~944, ~992). Controller: `@Param('id') id: string` (ya string, sin cast). DTO: `ItemDto.id`/`ItemDetailDto.id` ya `string`.
- **Superficie de referencia de catalogo** (acoplada): arrays del detalle via `fetchPivotIds` -> `String(serial)` (~423-425); `syncPivotIds` valida numerico + chequea maestra por serial (~789-835); filtros `applyPivotFilter`/`parseIdCsv` numericos (~1085-1122) y `applySummaryFilters` (~323-329). Catalogos (`backend/jormat-api/src/catalogos/catalogos.repository.ts`): `mapCatalogoRow` `id: String(row.id)` (~104), `updateCatalogo`/`softDelete`/`findByCodigo` resuelven por `Number.parseInt(id)` (~262, ~291, ~309); `getProveedores` emite `String(row.id)` (~139). Controller catalogos: `categorias/:id`, `aplicaciones/:id` `@Param('id') string`.
- **Front** (`front/jormat-front/`): rutas `src/app/(app)/inventario/items/[id]/{page,editar,duplicar}.tsx` pasan `params.id` string sin cast; cliente `src/services/api/inventario/items.ts` (`getItem`/`updateItem`/`setItemFailure`/`setItemPriority`/`uploadItemImage`/`deleteItemImage`, todos `id: string`); tipos `src/types/api.gen.ts` (`ItemDto.id` ~618, `ItemDetailDto.id` ~679, path param ~1699 ya string) - los tipos vivos son Zod en `src/lib/schemas/items` (verificar que aceptan uuid); tabla `src/components/items/list/ItemsTable/ItemsTable.tsx` (`accessorKey 'id'`, `row.original.id`); sort en `src/components/items/list/ItemsListView/ItemsListView.tsx:140` (`${sorting[0].id}:${desc?...}`); filtros `categorias`/`aplicaciones` son id unico (no CSV) tomados de `useCatalogos.ts` -> `catalogos/categorias.ts` (`c.id`). Regeneracion: `npm run generate:api-types` (`openapi-typescript` contra `docs-json`).
- **Superficies que NO emiten serial (sin cambio)**: `catalogos/bodegas` expone `codigo` (`ds_code`), no un id; `locations` no tiene endpoint propio (solo join interno en `fetchStockPorBodega`); `customers`/`catalogos_repuestos` ya son uuid-native (molde). `catalogos-repuestos` (`inventario/catalogos`, uuid-native) es un dominio DISTINTO del modulo `catalogos` (categorias/aplicaciones/proveedores, serial, en scope) - no confundir.
- **Impacto downstream (fuera de scope, D4)**: `sales`/`purchases`/`payments` embeben `itemId` serial en line items mockeados (`sales/dto/line-item.dto.ts`, `sales.service.ts`, `purchases.service.ts`). Referenciar item por uuid cuando se conecten a datos reales.
- **Ejecucion de tests**: unit host o in-container; e2e `docker exec jormat-evolution-api-1 npm run test:e2e` (el contenedor monta `test/`) o host con `npm run test:e2e` (`jest --config jest.e2e.config.ts`).

## Rules discovered

_(se llena durante ejecucion)_

## Bugs found

_(se llena durante ejecucion)_

## Acceptance checkpoints

- [ ] **Funcional**: items direcciona/expone por uuid (list/detail/summary/create/update/delete); serial como `:id` da 404; catalogos (categorias/aplicaciones/proveedores) por uuid; filtros y detalle por uuid.
- [ ] **Tests** (DET-37 dim4): unit repos/controllers actualizados + guardarrail de regresion + e2e por uuid, corridos y en VERDE.
- [ ] **NFRs**: 0 ids numericos emitidos por inventario (guardarrail).
- [ ] **Rules**: RULE-api-001 respetada (fachada uuid, serial oculto); RULE-database-001 intacta (is_active=1).
- [ ] **Integration**: pivotes/syncPivots/FKs internos siguen por serial; aislamiento por workspace y resto del comportamiento intactos (REQ-PRESERVE-01).
- [ ] **Docs oficiales** (DET-37 dim1): jormat_docs backend/front + api + data-model reflejan `id`=uuid.
- [ ] **KB DKC** (DET-37 dim2): RULE-api-001 marcada como aplicada a inventario.
- [ ] **Planning-completeness**: entry `planning-completeness` registrada.
</content>
</invoke>
