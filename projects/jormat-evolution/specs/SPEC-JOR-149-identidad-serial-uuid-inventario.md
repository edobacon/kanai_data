---
id: SPEC-JOR-149-identidad-serial-uuid-inventario
project: jormat-evolution
ticket: JOR-149
status: draft
---

# Identidad serial + uuid en todo el dominio y fachada publica cerrada por uuid

# Identidad serial + uuid en todo el dominio y fachada publica cerrada por uuid

## Executive summary - lo que estas aprobando

**Que se quiere**: hoy el dominio convive con **dos moldes de identidad**. `items` y `trucks` tienen dos campos (`id` serial interno + `uuid` publico); `customers`, `attachments` y `catalogos_repuestos` tienen **un solo campo `id` que ES el uuid**. Este ticket homologa todo a **un unico estandar** (el molde de `items`/`trucks`): toda tabla del dominio tiene `id` serial + `uuid` unique, las relaciones **publicas** viajan por uuid y las **internas** (FK) por serial. En el camino cierra las cuatro superficies donde hoy un id malformado revienta con un 500 crudo de Postgres, unifica la regex de uuid que esta duplicada, y alinea las dos referencias que todavia hablan en serial (el snapshot de catalogos y los line items de ventas/compras).

**El valor uuid publico NO cambia**: en las tres tablas que se parten, el uuid actual se **mueve** de la columna `id` a la columna `uuid`. Los deep-links, las URLs firmadas de imagenes y cualquier id ya emitido siguen resolviendo.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Las 3 tablas uuid-native se parten en `id` serial (PK) + `uuid` unique, **moviendo** el valor uuid actual (no regenerandolo) | Es lo que hace el cambio transparente hacia afuera: mismo identificador publico, nuevo PK interno. Si se regenerara el uuid, todo deep-link vigente moriria |
| 2 | `trucks.client_id` pasa de uuid a **integer** apuntando al serial de customers (enfoque R1), y `SELECT_COLS` pasa a emitir `customers.uuid as client_id` | Sin el segundo cambio, el mismo re-apuntado que ordena la relacion interna **filtraria el serial del cliente** por la API. Es el punto mas delicado del ticket |
| 3 | El backfill de snapshots legacy (serial -> uuid) es una **migracion de datos propia, chica e idempotente, que corre en S3** (separada de la migracion de identidad de S1), no un aparato de migracion con specs propios | Verificado: `catalogos_repuestos` y `attachments` tienen **0 filas** en dev y ningun seed las crea; el front ya envia uuids. El costo del aparato completo no se justifica, pero la defensa para otras BD de dev si |
| 4 | GF1 (filtros + paginacion server-side de `catalogos_repuestos`) **sale del alcance** y queda en backlog `could` | No tiene relacion con la homologacion de identidad y exigiria tocar el front, que el ticket declara explicitamente fuera. No hay requerimiento de pantalla confirmado |
| 5 | El plan pasa de 2 a **3 sessions** | La primera version dejaba el cambio de esquema de `trucks.client_id` separado del codigo que lo escribe: la session habria cerrado con el build roto. Cada session ahora deja el sistema funcionando |

**Riesgos principales y como los mitigamos**:

- **Fuga del serial al re-apuntar trucks** (el riesgo #1 del ticket): `trucks.client_id` deja de ser el uuid del cliente, y `SELECT_COLS` lo proyectaba directo. Mitigacion: el cambio de `SELECT_COLS` a `customers.uuid as client_id` viaja en la MISMA task, y el guardarrail e2e falla si el payload de trucks trae un `clientId` numerico.
- **Un `RETURNING` que devuelva el serial nuevo en vez del uuid**: `customers.create/update` y `catalogos_repuestos.create/update` hacen `.returning(SELECT_COLS)`; si la lista no se migra a `uuid as id`, el create empieza a devolver el serial. Mitigacion: DET-40 (auditoria de reemplazo) enumerada por metodo en S1, y el guardarrail cubre create/update ademas de las lecturas.
- **`attachments.owner_id` guarda el uuid del item, no un FK**: es polimorfico (varchar). Al partir attachments es facil "ordenarlo" a serial por simetria y romper la descarga firmada de imagenes. Mitigacion: decision explicita DEC-LOCAL-02 (owner_id NO se toca) + test de descarga.
- **Tightening de `LineItemDto.itemId` a uuid rompe el guardado de borradores** si el builder pudiera mandar lineas sin item. Verificado que no: las lineas solo nacen desde `handleAddItem(item)` con `itemId: item.id`. Mitigacion: e2e del draft con linea valida + caso 400 con no-uuid.
- **La migracion corre sobre datos reales de customers** (5 filas en dev, con FK inbound desde trucks). Mitigacion: la migracion resuelve el FK con `UPDATE ... FROM` generico (funciona con 0 y con N filas), y trae `down()` completo.

**Que NO se hace en este ticket** (limites explicitos del scope):

- **No se toca el front** (`front/jormat-front/`): el contrato de cara al front no cambia de shape (`id` string, `clientId` uuid). Las fixtures de MSW y las stories que todavia usan seriales quedan como backlog `should`, no como cambio silencioso.
- **No se migra la malla de FK internos a uuid** (D-FK): los pivotes siguen por serial.
- **No se agrega serial a las tablas de plataforma/auth** (workspaces/users/roles/capabilities/user_roles, D-PLATFORM): las referencia el JWT y todo el RBAC; queda como compliance pendiente de un ticket propio.
- **No se implementa GF1** (filtros/paginacion de catalogos_repuestos): backlog `could`.
- **No se conecta sales/purchases/payments a base de datos**: siguen siendo stubs en memoria; solo se alinea la forma del `itemId` que embeben.

**Tamano estimado**: 3 sessions (T3 cada una). La mas riesgosa es **S1**: cambia el esquema de 4 tablas y reescribe cuatro fachadas a la vez; es donde un `SELECT` mal migrado filtra un serial o un `RETURNING` devuelve el id equivocado.

**Como vas a saber que funciona**:

- Un cliente que ya tenias abierto por su URL sigue abriendo con el mismo identificador; el camion sigue mostrando su cliente y al crearlo lo eliges igual que antes.
- Pegarle a un cliente / catalogo / camion / imagen con un id inventado devuelve "no encontrado" (404) en vez de un error del servidor (500).
- Filtrar el listado de items por un `itemId` que no es uuid ahora te dice que el filtro es invalido (400) en vez de devolver una lista vacia sin explicacion.
- Ninguna respuesta de la API trae un numero secuencial como identificador (lo verifica un test que falla si vuelve a pasar).
- La suite unit + e2e queda verde y el coverage no baja del piso (>=90 / branches >=89).

---

## Purpose

Homologar el modelo de identidad de `jormat-api` a un unico estandar: toda tabla del dominio tiene `id` serial (PK interno) + `uuid` unique (identificador publico), con `items`/`trucks` como molde canonico. Migrar las tres tablas uuid-native (`customers`, `attachments`, `catalogos_repuestos`) a ese molde preservando el valor uuid publico, re-apuntar el unico FK inbound afectado (`trucks.client_id`) al serial sin filtrar el serial por la API, y cerrar las divergencias de frontera que quedaron abiertas tras [[JOR-148]]: guards de uuid (404 en vez de 500), contrato del filtro `itemId` (400 en vez de resultado vacio), snapshot de `catalogos_repuestos` y line items de `sales`/`purchases` por uuid. Cierra reescribiendo [[RULE-api-001]] al estandar unico. Alcance: `backend/jormat-api` + documentacion; el front no se toca.

## Baseline (estado actual medido — verificado contra `epic/jormat-v1`, 2026-08-17)

| Dimension | Baseline (hoy) | Target |
|-----------|----------------|--------|
| Tablas del dominio con molde de dos campos (`id` serial + `uuid`) | 2 de 5 (`items`, `trucks`) | 5 de 5 |
| Superficies publicas con `:id`/`attachmentId` sin guard uuid (500 crudo de Postgres ante id malformado) | 4 (`catalogos_repuestos`, `customers`, `item-images`, `trucks`) | 0 |
| Definiciones duplicadas del patron uuid | **3**, no 2 (corregido en S2.T4): `items.repository.ts:69` y `catalogos.repository.ts:34` como `UUID_RE`, mas `workspaces.service.ts:50` como `uuidRegex` — local dentro de `delete()`, por eso el grep original por `UUID_RE` no la vio | 1 (`common/uuid.util.ts`) para el dominio; la de `workspaces` queda fuera por D-PLATFORM (backlog B6) |
| Filtro `itemId` no-uuid | resultado vacio en silencio (`whereRaw('1 = 0')`, `items.repository.ts:1010-1015,1061-1066`) | 400 explicito |
| Validacion de formato de los 4 arrays del snapshot (`items`/`aplicaciones`/`categorias`/`proveedores`) | ninguna (`@IsString` suelto, `dto/catalogo.dto.ts:52-93`); ejemplos Swagger en serial (`items: ['25435']`) | uuid validado + ejemplos uuid |
| `itemId` de los line items de `sales`/`purchases` | serial hardcodeado (`sales.service.ts:227` `'25477'`, `purchases.service.ts:157` `'1042'`) | uuid |
| Cobertura del guardarrail `inventory-uuid-regression` sobre las 3 tablas del ticket | 0 casos (cubre `items` + catalogos maestras) | las 3 tablas + trucks |
| Coverage backend (merge unit+e2e) | piso vigente >=90 / branches >=89 (`test:cov:all`) | no baja |

**Estado de datos (dev, `jormat_evolution`)**: `customers` 5 filas · `attachments` 0 · `catalogos_repuestos` 0 · `trucks` 0 · `items` 12 · `categories` 10 · `applications` 10 · `providers` 5. Ningun seed crea filas de `attachments`, `catalogos_repuestos` ni `trucks`.

## Requirements

### REQ-IMPROVE-01: las 3 tablas uuid-native adoptan el molde de dos campos

> **Que cambia**: `customers`, `attachments` y `catalogos_repuestos` pasan a tener `id` serial (PK) + `uuid` unique. El uuid que hoy vive en `id` se mueve a `uuid`, con su valor intacto.
> **Por que**: hoy conviven dos moldes de identidad en el mismo dominio y cada tabla nueva tiene que elegir uno; con un solo estandar deja de ser una decision por tabla.

El sistema MUST reestructurar `customers`, `attachments` y `catalogos_repuestos` a `id integer serial PRIMARY KEY` + `uuid uuid NOT NULL UNIQUE DEFAULT uuid_generate_v4()`. El valor uuid preexistente de la columna `id` MUST preservarse en la nueva columna `uuid` (mover, no regenerar). Los indices y constraints preexistentes MUST sobrevivir: `idx_customers_workspace_id` y el unique parcial **`uq_customers_workspace_rut_active_isactive`** (`(workspace_id, rut) WHERE is_active = 1` — es el nombre vigente en la BD; el `uq_customers_workspace_rut_active` original fue dropeado por `20260813000001`), `idx_attachments_workspace_owner`, `idx_catalogos_repuestos_workspace_id` y los FK a `workspaces`. La migracion MUST traer `down()` que revierta al molde uuid-native.

**Actor**: system · **Layers**: database

<details><summary>Scenarios de validacion</summary>

#### Scenario: esquema resultante
- **GIVEN** la migracion aplicada, **WHEN** se inspecciona el esquema de las 3 tablas, **THEN** cada una tiene `id` serial PK y `uuid` uuid NOT NULL UNIQUE con default.

#### Scenario: el identificador publico sobrevive
- **GIVEN** un cliente con uuid conocido antes de migrar, **WHEN** se aplica la migracion, **THEN** ese mismo uuid esta en `customers.uuid` y `GET /api/customers/{uuid}` sigue resolviendo.

#### Scenario: rollback
- **GIVEN** la migracion aplicada, **WHEN** se corre `migrate:rollback`, **THEN** las 3 tablas vuelven a `id` uuid PK con los valores originales y `trucks.client_id` vuelve a uuid.

</details>

#### Acceptance
Las tres tablas tienen las dos columnas y un cliente abierto por su URL vieja sigue abriendo.

### REQ-IMPROVE-02: la fachada publica de las 3 tablas emite y resuelve por uuid

> **Que cambia**: los repos de `customers`, `catalogos_repuestos` y las imagenes de item proyectan `uuid AS id`, resuelven `WHERE uuid = :id` y devuelven el uuid en los `RETURNING`. El serial nuevo queda interno.
> **Por que**: sin esto, el mismo dia que la tabla gana un serial la API empieza a emitirlo — exactamente el IDOR que [[RULE-api-001]] cierra.

El sistema MUST proyectar el uuid como campo `id` en toda salida de `customers`, `catalogos_repuestos` y las imagenes de item (`attachments`), y MUST resolver el identificador entrante contra la columna `uuid` en lectura, update y soft-delete. El serial MUST NOT aparecer en ningun payload de respuesta, incluidos los caminos `RETURNING` de create/update. La resolucion `uuid -> serial` MUST ocurrir una sola vez en el limite del repo cuando haga falta.

La cobertura incluye las superficies **derivadas**: `GET /api/catalogos/clientes` (`CatalogosService.getClientes` -> `CustomersService.search` -> `CustomersRepository.list`) emite clientes por el mismo `SELECT_COLS`, asi que hereda la fachada y MUST verificarse explicitamente (su e2e actual solo afirma `id: expect.any(String)`, que no distingue un uuid de un serial serializado).

**Actor**: public · **Layers**: backend, api, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: create devuelve el uuid
- **GIVEN** un payload valido de cliente, **WHEN** `POST /api/customers`, **THEN** 201 con `id` = uuid (no el serial recien generado).

#### Scenario: el serial no direcciona
- **GIVEN** un cliente con serial 3 y su uuid, **WHEN** `GET /api/customers/3`, **THEN** 404.

#### Scenario: imagen de item por uuid
- **GIVEN** un item con imagen, **WHEN** se lee el detalle, **THEN** el `id` de cada imagen es el uuid del attachment y la URL firmada resuelve con ese valor.

</details>

#### Acceptance
Crear un cliente devuelve el mismo tipo de identificador que antes; pedirle a la API el numero interno no encuentra nada.

### REQ-IMPROVE-03: `trucks` relaciona al cliente por serial internamente y por uuid hacia afuera

> **Que cambia**: `trucks.client_id` pasa a integer contra el serial de customers; el payload de camion sigue trayendo el `clientId` uuid porque ahora sale del join a `customers.uuid`.
> **Por que**: es el unico FK inbound afectado por la particion, y el punto donde un descuido convierte el orden interno en una fuga del serial del cliente.

El sistema MUST cambiar `trucks.client_id` a `integer NOT NULL` referenciando `customers.id` (serial), con backfill que resuelva el uuid previo contra `customers.uuid`. El repo MUST resolver el `clientId` uuid entrante a serial antes de insertar, MUST validar la vigencia del cliente contra `customers.uuid`, y MUST proyectar `customers.uuid as client_id`. El contrato publico (`clientId` uuid, inmutable en edicion) MUST NOT cambiar.

**Actor**: public, system · **Layers**: backend, api, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: sin fuga del serial
- **GIVEN** un camion y su cliente, **WHEN** `GET /api/trucks/{uuid}`, **THEN** `clientId` es el uuid del cliente y ningun campo del payload es un numero secuencial.

#### Scenario: create resuelve uuid -> serial
- **GIVEN** un cliente activo, **WHEN** `POST /api/trucks` con `clientId` uuid, **THEN** 201 y la fila persiste `client_id` = serial del cliente.

#### Scenario: cliente inexistente
- **GIVEN** un uuid que no corresponde a ningun cliente activo del workspace, **WHEN** `POST /api/trucks`, **THEN** 400 con el mensaje de cliente inexistente/inactivo (comportamiento actual preservado).

</details>

#### Acceptance
Crear y ver un camion funciona igual que antes, y el cliente que muestra sigue siendo el mismo identificador que usa el resto de la app.

### REQ-IMPROVE-04: un identificador malformado devuelve 404, no 500, en toda la frontera

> **Que cambia**: pedir un cliente, catalogo, camion o imagen con un id que no es uuid devuelve "no encontrado" en vez de un error 500 con el mensaje crudo de Postgres.
> **Por que**: hoy filtra detalle de implementacion de la base al cliente y ensucia los logs con errores que no son errores del servidor.

El sistema MUST validar el formato uuid del identificador entrante antes de consultar una columna `uuid` en `catalogos_repuestos`, `customers`, `trucks` y la descarga firmada de imagenes de item (`attachmentId`), devolviendo 404 cuando no lo sea. La expresion regular de uuid MUST vivir en un unico modulo compartido (`src/common/uuid.util.ts`) y las definiciones inline duplicadas MUST reemplazarse por ese import, sin cambiar el patron.

**Actor**: public · **Layers**: backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: id malformado
- **GIVEN** cualquiera de las 4 superficies, **WHEN** se le pasa `abc` como identificador, **THEN** 404 y ningun error de Postgres en el log.

#### Scenario: la regex sigue siendo la misma
- **GIVEN** el util compartido, **WHEN** se compara con las dos definiciones inline previas, **THEN** el patron es identico (mismo comportamiento, un solo hogar).

</details>

#### Acceptance
Inventar un id en la URL devuelve "no encontrado" en las cuatro pantallas, no una pantalla de error.

### REQ-IMPROVE-05: el filtro `itemId` rechaza un valor no-uuid con 400

> **Que cambia**: filtrar el listado de items por un `itemId` que no es uuid devuelve 400 en vez de una lista vacia.
> **Por que**: hoy un filtro invalido es indistinguible de "no hay resultados", y contradice al resto de los filtros por uuid del mismo listado, que ya responden 400.

El sistema MUST rechazar con 400 un `itemId` que no cumpla el formato uuid en el listado de items, alineado con el comportamiento de `parseUuidCsv` para los filtros de pivote. El camino de datos y el de conteo MUST comportarse igual.

**Actor**: public · **Layers**: backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: filtro invalido
- **GIVEN** items sembrados, **WHEN** `GET /api/inventario/items?itemId=25477`, **THEN** 400 con mensaje de uuid esperado (hoy: 200 con lista vacia).

#### Scenario: filtro valido intacto
- **GIVEN** un item sembrado, **WHEN** `GET /api/inventario/items?itemId={uuid}`, **THEN** 200 con ese item (sin cambio).

</details>

#### Acceptance
Filtrar por un id viejo avisa que el filtro es invalido en vez de mostrar una tabla vacia.

### REQ-IMPROVE-06: el snapshot de `catalogos_repuestos` referencia sus miembros por uuid

> **Que cambia**: los cuatro arrays del catalogo (`items`, `aplicaciones`, `categorias`, `proveedores`) solo aceptan uuids, los ejemplos de Swagger dejan de mostrar seriales, y un snapshot legacy guardado en serial se resuelve a uuid.
> **Por que**: el front ya envia uuids desde [[JOR-148]], pero el backend acepta cualquier string: un valor legacy entra sin ruido y queda persistido contra el molde viejo.

El sistema MUST validar que cada miembro de los cuatro arrays del payload de creacion/edicion de catalogo sea un uuid, respondiendo 400 en caso contrario, y MUST actualizar los ejemplos de Swagger a uuids. Los snapshots preexistentes cuyos miembros esten en serial MUST resolverse a uuid contra la tabla maestra correspondiente mediante una migracion de datos idempotente; un miembro ya en formato uuid MUST quedar intacto y uno no resoluble MUST conservarse sin romper la migracion.

**Actor**: public, system · **Layers**: backend, api, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: miembro no-uuid rechazado
- **GIVEN** maestras sembradas, **WHEN** `POST /api/inventario/catalogos` con `items: ['25435']`, **THEN** 400.

#### Scenario: backfill de snapshot legacy
- **GIVEN** una fila de catalogo con `items: ['<serial>']`, **WHEN** corre la migracion de datos, **THEN** ese miembro queda como el uuid del item correspondiente.

#### Scenario: backfill idempotente
- **GIVEN** un snapshot ya en uuids, **WHEN** corre la migracion de datos, **THEN** no cambia nada y la migracion no falla.

</details>

#### Acceptance
Guardar un catalogo con un id viejo lo rechaza explicitamente; los catalogos ya guardados siguen mostrando sus miembros.

### REQ-IMPROVE-07: los line items de `sales`/`purchases` referencian el item por uuid

> **Que cambia**: el `itemId` de las lineas de factura (venta y compra) pasa a ser el uuid del item, tanto en la validacion de entrada como en los datos de ejemplo de los stubs y de Swagger.
> **Por que**: es la ultima referencia del dominio que sigue hablando en serial; cuando estos modulos se conecten a datos reales, un `itemId` serial no resolveria contra nada.

El sistema MUST validar como uuid el `itemId` de **los dos** DTO de linea que existen — `LineItemDto` (ventas, `src/sales/dto/line-item.dto.ts`) y `SupplierLineItemDto` (compras, `src/purchases/dto/supplier-line-item.dto.ts`) — porque **ambos son DTO de entrada**: viajan en `FacturaInputDto.lineas` (`POST /ventas/facturas` y `/draft`) y en `FacturaProveedorInputDto.lineas` (`POST /compras/facturas` y `/draft`) respectivamente. MUST actualizar los datasets stub de `sales` y `purchases` y los ejemplos de Swagger de ambos DTO para usar uuids. `payments` no embebe `itemId` y queda sin cambio.

**Actor**: public · **Layers**: backend, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: linea de venta con item no-uuid
- **GIVEN** el builder de factura, **WHEN** `POST /api/ventas/facturas/draft` con una linea de `itemId: '25435'`, **THEN** 400.

#### Scenario: linea de compra con item no-uuid
- **GIVEN** el builder de factura de proveedor, **WHEN** `POST /api/compras/facturas/draft` con una linea de `itemId: '1042'`, **THEN** 400.

#### Scenario: lectura de documento
- **GIVEN** el stub de documentos (ventas y compras), **WHEN** se lee un documento con lineas, **THEN** cada `itemId` tiene forma uuid.

</details>

#### Acceptance
Las lineas de una factura identifican el repuesto con el mismo tipo de identificador que el resto de la app.

### REQ-IMPROVE-08: guardarrail de regresion sobre todo el dominio

> **Que cambia**: el test que hoy vigila que `items` y las catalogos maestras no filtren un serial pasa a cubrir tambien customers, imagenes, catalogos_repuestos y trucks.
> **Por que**: sin guardarrail, una proyeccion futura vuelve a exponer el serial y nadie se entera hasta que alguien enumera recursos.

El sistema MUST extender `inventory-uuid-regression` para que falle si: cualquier endpoint del dominio emite un identificador numerico, un serial resuelve como `:id`, un id malformado produce algo distinto de 404, un `itemId` no-uuid produce algo distinto de 400, un miembro del snapshot no es uuid, o alguna de las tres tablas migradas no tiene ambas columnas. La lista de superficies barridas MUST incluir `customers` (propio y via `GET /api/catalogos/clientes`), las imagenes de item, `catalogos_repuestos`, `trucks` (con `clientId` uuid, no serial) y los line items de ventas y compras. El barrido MUST cubrir tambien los **caminos de escritura**, no solo las lecturas: el `id` devuelto por create y update (`.returning(SELECT_COLS)` de customers, `.returning(this.columns())` de catalogos_repuestos, `.returning('*')` + `mapAttachmentRow` de `addImage`) es uuid, y la fila persistida tiene un serial distinto de ese valor. Es el punto donde una lista de columnas sin migrar empieza a emitir el serial recien nacido. El aserto sobre esas superficies MUST distinguir uuid de serial serializado (no basta `expect.any(String)`). Los casos preexistentes de [[JOR-148]] MUST conservarse sin relajarse.

**Actor**: system · **Layers**: backend, api, database

<details><summary>Scenarios de validacion</summary>

#### Scenario: el guardarrail muerde
- **GIVEN** el guardarrail extendido, **WHEN** se invierte a proposito una proyeccion para emitir el serial, **THEN** el test falla (verificacion de que el guardarrail no es decorativo).

#### Scenario: create no emite el serial
- **GIVEN** un workspace sembrado, **WHEN** se crea un cliente y un catalogo y se sube una imagen, **THEN** el `id` devuelto por cada create tiene forma uuid y NO coincide con el serial de la fila persistida.

</details>

#### Acceptance
Un cambio futuro que vuelva a exponer un id interno rompe la corrida de tests.

### REQ-PRESERVE-01: el identificador publico no cambia de valor

> **Que cambia**: nada de cara afuera — el uuid con el que hoy abris un cliente o descargas una imagen sigue siendo exactamente el mismo despues de migrar.
> **Por que**: la migracion mueve el uuid de una columna a otra; si en el camino se regenerara, todo link guardado moriria en silencio.

El sistema MUST preservar el valor uuid publico de toda fila preexistente de `customers`, `attachments` y `catalogos_repuestos`. Un deep-link, una URL firmada de imagen o un id ya emitido antes de la migracion MUST seguir resolviendo despues.

<details><summary>Scenarios de validacion</summary>

#### Scenario: uuid preservado
- **GIVEN** el set de uuids de customers capturado antes de migrar, **WHEN** se aplica la migracion, **THEN** el mismo set esta en `customers.uuid`, sin altas ni bajas.

</details>

### REQ-PRESERVE-02: aislamiento por workspace y soft-delete intactos

> **Que cambia**: nada — cada workspace sigue viendo solo lo suyo y lo eliminado sigue oculto.
> **Por que**: se reescriben las queries de cuatro repos completos; es donde un `where` se pierde sin que nadie lo note.

El sistema MUST mantener el filtrado por `workspace_id` en toda query de las tablas tocadas y el predicado `is_active = 1` de [[RULE-database-001]]. El hard-delete documentado de `attachments` MUST seguir siendo hard-delete.

<details><summary>Scenarios de validacion</summary>

#### Scenario: un workspace no ve al otro
- **GIVEN** clientes/catalogos en dos workspaces, **WHEN** se listan desde uno, **THEN** solo se devuelven los propios (regresion existente verde).

</details>

### REQ-PRESERVE-03: el contrato de cara al front no cambia de shape

> **Que cambia**: nada en el front — mismos campos, mismos tipos, mismas rutas; no se toca un solo archivo de `front/jormat-front/`.
> **Por que**: el ticket es de backend y esquema; si el front necesitara adaptarse, el cambio dejaria de ser transparente y el alcance se duplicaria.

El sistema MUST mantener el shape del contrato publico: identificador `id` string con valor uuid, `clientId` uuid en trucks, mismos nombres de campo y mismas rutas. El workspace `front/jormat-front/` MUST NOT modificarse en este ticket.

<details><summary>Scenarios de validacion</summary>

#### Scenario: front intacto
- **GIVEN** el diff del ticket, **WHEN** se revisa el alcance, **THEN** no hay archivos de `front/jormat-front/` modificados.

</details>

### REQ-PRESERVE-04: la fachada uuid de [[JOR-148]] sigue verde

> **Que cambia**: nada en items ni en las catalogos maestras — lo que JOR-148 dejo cerrado sigue cerrado.
> **Por que**: este ticket reescribe `items.repository.ts` en cuatro tasks distintas (S1.T3 fachada de attachments, S2.T1 import del util, S2.T2 guard de `attachmentId`, S2.T3 filtro `itemId`); es el archivo con mas superficie compartida con JOR-148.

El sistema MUST mantener pasando el guardarrail `inventory-uuid-regression` existente sobre `items` y las catalogos maestras, sin relajar ninguno de sus casos.

<details><summary>Scenarios de validacion</summary>

#### Scenario: guardarrail heredado
- **GIVEN** la suite e2e, **WHEN** corre `inventory-uuid-regression`, **THEN** los casos preexistentes siguen en verde ademas de los nuevos.

</details>

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Security | El serial no cruza la frontera de la API (IDOR) en ninguna de las 5 tablas del dominio | ids numericos emitidos | 0 (verificado por el guardarrail de REQ-IMPROVE-08) |
| Robustez | Un identificador malformado no produce un 500 | superficies con 500 ante id no-uuid | 0 (baseline: 4) |
| Performance | La resolucion uuid -> serial no degrada las escrituras de trucks | consultas extra a customers por create | 2 (`isActiveClient` en el service + la resolucion uuid -> serial en el repo, DEC-LOCAL-05), ambas por index unico en `customers.uuid` — marginal |
| Testing | Coverage del merge unit+e2e no baja del piso | statements/functions/lines / branches | >=90 / >=89 (ratchet, [[RULE-testing-coverage-threshold-002]]) |

## Changes

### Modified: esquema

| Tabla | Antes | Despues | Por que |
|-------|-------|---------|---------|
| `customers` | `id uuid PK DEFAULT uuid_generate_v4()` | `id serial PK` + `uuid uuid NOT NULL UNIQUE` (valor movido desde `id`) | molde canonico (D-ID) |
| `attachments` | `id uuid PK` | `id serial PK` + `uuid uuid NOT NULL UNIQUE` (valor movido) | molde canonico. `owner_id varchar` NO se toca (ver DEC-LOCAL-02) |
| `catalogos_repuestos` | `id uuid PK` | `id serial PK` + `uuid uuid NOT NULL UNIQUE` (valor movido) | molde canonico |
| `trucks` | `client_id uuid NOT NULL` FK -> `customers.id` (uuid) | `client_id integer NOT NULL` FK -> `customers.id` (serial) | relaciones internas por serial (D-FK / D-FK-CUST) |
| `catalogos_repuestos` (datos) | miembros jsonb pueden estar en serial legacy | miembros resueltos a uuid | coherencia de la fachada (DV2) |

### Modified: contrato / capa API

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `:id` de customers / catalogos_repuestos / trucks, `attachmentId` de item-images | sin guard: no-uuid -> 500 | guard uuid -> 404 | DV1/DV3/DV4 + propagacion a trucks |
| filtro `itemId` del listado de items | no-uuid -> `whereRaw('1 = 0')` (lista vacia) | no-uuid -> 400 | DV5 |
| miembros del snapshot de catalogo | `@IsString` (cualquier string) | uuid validado, 400 si no | DV2 |
| `LineItemDto.itemId` | `@IsString`, ejemplo `'25435'` | `@IsUUID`, ejemplo uuid | DV6 |
| `trucks` `SELECT_COLS` | `trucks.client_id as client_id` | `customers.uuid as client_id` | evita la fuga del serial tras R1 |
| `UUID_RE` | duplicada inline en 2 repos | `src/common/uuid.util.ts` | una sola fuente |

### Added

| Artefacto | Proposito |
|-----------|-----------|
| `src/common/uuid.util.ts` | `UUID_RE` unica + helper de validacion, consumido por los repos con fachada uuid |
| migracion `*_identity_serial_uuid_split.ts` | REQ-IMPROVE-01 + REQ-IMPROVE-03 (esquema), con `down()` |
| migracion `*_catalogos_repuestos_snapshot_uuid.ts` | REQ-IMPROVE-06 (datos, idempotente y defensiva) |
| casos nuevos en `test/e2e/inventory-uuid-regression.e2e-spec.ts` | guardarrail sobre las 3 tablas + trucks |
| `jormat_docs/data-model/customers.md`, `catalogos_repuestos.md` | gap de documentacion detectado en el catastro |

## Tasks

### Session 1 - Identidad serial+uuid: esquema + fachadas + trucks R1 [tipo: ⚑ fuerte] [tier: T3]

> `⚑ fuerte`: cambia el esquema de 4 tablas y reescribe 4 fachadas en el mismo paso. El esquema y el codigo que lo consume viajan juntos a proposito: separarlos dejaria la session cerrada con el build roto. Dual-judge (DET-35, T3) + DET-40 (auditoria de reemplazo) por metodo migrado.

parallel_groups: [[S1.T2, S1.T3, S1.T4, S1.T5]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Migracion de identidad, en la secuencia ejecutable descrita en "Secuencia de la migracion" abajo: soltar la FK `trucks_client_id_foreign`; en cada tabla soltar el PK, renombrar `id` -> `uuid` (preserva valor y default), agregar el unique de `uuid`, agregar `id` serial PK; re-apuntar `trucks.client_id` con **columna puente** (`client_id_new integer` + `UPDATE ... FROM customers` + drop + rename + NOT NULL + FK + recrear `idx_trucks_client_id`); preservar `uq_customers_workspace_rut_active_isactive`, `idx_attachments_workspace_owner` e `idx_catalogos_repuestos_workspace_id`; `down()` simetrico completo | REQ-IMPROVE-01, REQ-IMPROVE-03, REQ-PRESERVE-01 | developer | — | backend/jormat-api/migrations/ | `npm run migrate` + `migrate:rollback` + `migrate` en la BD dev sin error; `\d` de las 4 tablas verificando: 2 columnas de identidad, `uuid` con `NOT NULL` **y** su `DEFAULT uuid_generate_v4()` (el rename lo arrastra, pero `customers.create` y `addImage` insertan sin uuid explicito — si el default se pierde, no falla la migracion sino el primer insert), `client_id` integer, FK e indices intactos; set de uuids de customers identico antes/despues | `npm run migrate:rollback` (la migracion trae `down()`) | DET-8, DET-40, RULE-api-001, RULE-database-001 | done | 1 |
| S1.T2 | Fachada `customers`: `SELECT_COLS` y `returning` a `uuid as id`; `findById`/`update`/`softDelete` resuelven `WHERE customers.uuid`; `findByRut` compara `excludeId` contra `uuid`; el serial nunca sale del repo | REQ-IMPROVE-02, REQ-PRESERVE-02 | developer | S1.T1 | backend/jormat-api/src/customers/customers.repository.ts | unit customers (controller+service) verde + `tsc` sin error; DET-40: cada metodo migrado replica 1:1 el comportamiento previo (incl. `count('id as total')` y el alias del `returning`). Los e2e de customers se realinean y corren en S1.T6 (hoy direccionan por la columna `id`) | git revert | DET-40, RULE-api-001, RULE-database-001 | done | 1 |
| S1.T3 | Fachada `attachments` (imagenes de item): `fetchImages` proyecta `uuid as id`; `addImage` devuelve el uuid; `removeImage`/`findImageByIdUnscoped` resuelven por `uuid`; `mapAttachmentRow` mapea el uuid como `id`. `owner_id` NO cambia (sigue guardando el uuid del item — DEC-LOCAL-02) | REQ-IMPROVE-02, REQ-PRESERVE-01 | developer | S1.T1 | backend/jormat-api/src/items/items.repository.ts | unit items (service/controller de imagenes) verde + `tsc` sin error; el e2e `items-images` (incluida la descarga firmada por `attachmentId`) se realinea y corre en S1.T6 | git revert | DET-40, RULE-api-001 | done | 1 |
| S1.T4 | Fachada `catalogos_repuestos`: `columns()` proyecta `uuid as id`; `findById`/`update`/`remove` resuelven por `uuid`; `create`/`update` devuelven el uuid en el `returning` | REQ-IMPROVE-02, REQ-PRESERVE-02 | developer | S1.T1 | backend/jormat-api/src/items/catalogos-repuestos.repository.ts | unit catalogos-repuestos (controller+service) verde + `tsc` sin error; el e2e `catalogos-repuestos` se realinea y corre en S1.T6 | git revert | DET-40, RULE-api-001, RULE-database-001 | done | 1 |
| S1.T5 | `trucks` R1: `isActiveClient` valida contra `customers.uuid`; `create` resuelve el `clientId` uuid a serial antes del insert (una sola resolucion, en el repo — el service no ve el serial); `joinedScope` queda serial=serial; **`SELECT_COLS` pasa a `customers.uuid as client_id`** (cierra la fuga); DTO sin cambios | REQ-IMPROVE-03, REQ-PRESERVE-02, REQ-PRESERVE-03 | developer | S1.T1 | backend/jormat-api/src/trucks/trucks.repository.ts | unit trucks (fixtures `clientId` a uuid) verde + `tsc` sin error; verificar que ningun campo del payload de trucks es numerico; el e2e `trucks` (incluido el assert de `client_id`, que pasa a ser serial) se realinea y corre en S1.T6 | git revert | DET-40, RULE-api-001, RULE-database-001 | done | 1 |
| S1.T6 | Tests de identidad, en dos frentes. (a) **Fixtures unit** con ids no-uuid: `trucks.service.spec` (`'client-1'`), `customers.controller.spec` (`'cust-1'`), `item-images.controller.spec`/`items.service.spec` (`'att-1'`), `catalogos-repuestos.controller.spec` (`'cat-rep-001'`). (b) **Suites e2e que hoy direccionan por la columna `id`** y se rompen con el split (ver "Realineamiento de los e2e"): `customers` (`:41,99`), `customers-list` (`:59,66,73` — los 3 inserts), `trucks` (`:73` y `:79` inserts de CLIENT_A/CLIENT_B, `:85` `onConflict('id')` — que se queda sin target unico valido —, `:91` cleanup, y el assert `client_id` de `:139`, que pasa a ser serial), `catalogos-repuestos` (`:89,118`), `items-images` (`:111,124,144,151,165`) — migrar inserts, `onConflict`, cleanups y asserts a la columna `uuid`. La enumeracion es exhaustiva a proposito: es la task que sostiene "los e2e quedan rojos hasta T6, y es a proposito", asi que un punto no listado cierra el gate de S1 en rojo. Ademas, casos nuevos en `test/e2e/identity-serial-uuid.e2e-spec.ts` (suite propia): forma del esquema (las 3 tablas con serial+uuid) y trucks emitiendo el uuid del cliente sin filtrar el serial. **La preservacion del uuid (REQ-PRESERVE-01) NO se afirma aqui**: `test/e2e/global-setup.cjs:26-36` hace DROP+CREATE de la BD de test y recien despues `migrate:latest` + `seed:run`, asi que dentro de la suite nunca existe un estado "antes de migrar" contra el cual comparar. Su evidencia es la validacion de S1.T1 (`migrate` + `rollback` + `migrate` sobre la BD dev con el set de uuids capturado antes y despues). Si aun asi se quiere el caso dentro del e2e, la suite debe manejar ella misma `knex.migrate.down()`/`up()` (viable: `jest.e2e.config.ts:14` fija `maxWorkers: 1`) y garantizar que deja el esquema reaplicado aunque el caso falle | REQ-IMPROVE-01, REQ-IMPROVE-02, REQ-IMPROVE-03, REQ-PRESERVE-01, REQ-PRESERVE-04 | developer | S1.T2, S1.T3, S1.T4, S1.T5 | backend/jormat-api/src/**/*.spec.ts, backend/jormat-api/test/e2e/{customers,customers-list,trucks,catalogos-repuestos,items-images}.e2e-spec.ts, backend/jormat-api/test/e2e/identity-serial-uuid.e2e-spec.ts | `npm run test` + `npm run test:e2e` verdes (es el primer punto de S1 donde los e2e pueden estar en verde); coverage merge no baja del piso | git revert | DET-7, DET-13, DET-40, RULE-testing-coverage-threshold-002 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T3)** - persistir en `## Sessions`, correr unit+e2e+coverage, quality review con dual-judge aislado (DET-35), self-report verification (DET-33), auditoria de reemplazo (DET-40) sobre los metodos migrados, decidir continue/iterate/escalate | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5, S1.T6 | ticket | gate persistido + decision documentada + reviewer approved | (no aplica - cierre de session) | DET-20, DET-23, DET-33, DET-35, DET-40 | done | 1 |

### Session 2 - Frontera: guard uuid unificado + contrato del filtro [tier: T3]

> Sin `parallel_groups`: S2.T1 (util) y S2.T2/S2.T3 comparten `items.repository.ts` y `catalogos.repository.ts`, y T2/T3 dependen del util de T1. Secuencial por archivos compartidos, no por dependencia logica.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Extraer `UUID_RE` a `src/common/uuid.util.ts` (patron identico al actual) y reemplazar las dos definiciones inline por el import, sin alterar ningun uso existente | REQ-IMPROVE-04 | developer | — | backend/jormat-api/src/common/uuid.util.ts, backend/jormat-api/src/items/items.repository.ts, backend/jormat-api/src/catalogos/catalogos.repository.ts | unit items+catalogos verdes sin cambio de assertions; DET-40: el patron nuevo es literalmente el mismo | git revert | DET-40, RULE-global-001 | done | 2 |
| S2.T2 | Guards de uuid -> 404 en las 4 superficies: `catalogos_repuestos` (`findById`/`update`/`remove`), `customers` (`findById`/`update`/`softDelete`), `item-images` (`findImageByIdUnscoped`/`removeImage` sobre `attachmentId`) y `trucks` (`findById`/`update`/`softDelete`, y `isActiveClient` para no reventar con un `clientId` malformado) | REQ-IMPROVE-04 | developer | S2.T1 | backend/jormat-api/src/items/catalogos-repuestos.repository.ts, backend/jormat-api/src/customers/customers.repository.ts, backend/jormat-api/src/items/items.repository.ts, backend/jormat-api/src/trucks/trucks.repository.ts | unit por modulo; e2e (nivel repo/service, como el resto de las suites): `abc` como id resuelve a `null`/`false`/`NotFoundException` en las 4 superficies, sin error de Postgres en el log | git revert | RULE-api-001, RULE-global-002 | done | 2 |
| S2.T3 | Filtro `itemId` no-uuid -> 400 en el listado de items (camino de datos y de conteo), alineado con el mensaje de `parseUuidCsv`; el camino uuid valido queda intacto | REQ-IMPROVE-05, REQ-PRESERVE-04 | developer | S2.T1 | backend/jormat-api/src/items/items.repository.ts, backend/jormat-api/src/items/dto/list-items-query.dto.ts | unit items.repository/controller; e2e `items-list`: `?itemId=25477` -> 400, `?itemId={uuid}` -> 200 con el item | git revert | DET-40, RULE-api-001 | done | 2 |
| S2.T4 | Tests de frontera: casos unit de guard por modulo + extension e2e de los 404/400; verificar que no quedan superficies con 500 ante id malformado | REQ-IMPROVE-04, REQ-IMPROVE-05 | developer | S2.T2, S2.T3 | backend/jormat-api/src/**/*.spec.ts, backend/jormat-api/test/e2e/ | `npm run test` + `npm run test:e2e` verdes; coverage merge no baja | git revert | DET-7, DET-13, RULE-testing-coverage-threshold-002 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T3)** - persistir en `## Sessions`, unit+e2e+coverage, dual-judge (DET-35), self-report verification (DET-33), decidir continue/iterate/escalate | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + decision documentada + reviewer approved | (no aplica - cierre de session) | DET-20, DET-23, DET-33, DET-35 | done | 2 |

### Session 3 - Referencias por uuid (snapshot + line items) + guardarrail + docs [tier: T3]

parallel_groups: [[S3.T1, S3.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Snapshot de catalogo por uuid: validar los 4 arrays (`items`/`aplicaciones`/`categorias`/`proveedores`) como uuid en `CreateCatalogoDto` (400 si no) y actualizar los ejemplos Swagger; migracion de datos idempotente que resuelve miembros en serial legacy contra su maestra (`items`/`applications`/`categories`/`providers`), dejando intactos los que ya son uuid y sin fallar ante un miembro no resoluble | REQ-IMPROVE-06 | developer | — | backend/jormat-api/src/items/dto/catalogo.dto.ts, backend/jormat-api/migrations/ | unit catalogos-repuestos: POST con miembro serial -> 400; e2e: backfill sobre una fila legacy sembrada resuelve a uuid y es idempotente al re-correr | `npm run migrate:rollback` + git revert | DET-8, RULE-api-001 | done | 3 |
| S3.T2 | Line items por uuid en **ambos** caminos de entrada: `LineItemDto.itemId` (ventas) y `SupplierLineItemDto.itemId` (compras) validados como uuid + ejemplos Swagger uuid; datasets stub de `sales` y `purchases` con `itemId` uuid (resueltos contra el inventario sembrado o uuids fijos coherentes); actualizar los unit specs que el tightening rompe (`documentos.controller.spec:75`, `facturas-proveedor.controller.spec:84,258`, `purchases.service.spec:271`). `payments` no embebe `itemId`: sin cambio | REQ-IMPROVE-07 | developer | — | backend/jormat-api/src/sales/dto/line-item.dto.ts, backend/jormat-api/src/purchases/dto/supplier-line-item.dto.ts, backend/jormat-api/src/sales/sales.service.ts, backend/jormat-api/src/purchases/purchases.service.ts, backend/jormat-api/src/sales/documentos.controller.spec.ts, backend/jormat-api/src/purchases/facturas-proveedor.controller.spec.ts, backend/jormat-api/src/purchases/purchases.service.spec.ts, backend/jormat-api/test/e2e/sales-purchases-line-items.e2e-spec.ts | unit sales/purchases verdes con las fixtures actualizadas; e2e nuevo (no existe suite de sales/purchases): como el 400 lo emite el `ValidationPipe`, la suite MUST montar `Test.createTestingModule` + `ValidationPipe` + supertest (patron de `e2e-login.e2e-spec.ts`) y afirmar `POST /ventas/facturas/draft` y `POST /compras/facturas/draft` con `itemId` no-uuid -> 400 y con uuid -> 201. **Ojo con el orden de Nest**: los guards corren ANTES de los pipes, y ambos controllers los declaran (`facturas.controller.ts:29,36` con `@RequireCapability('sales.invoices:edit')`), asi que un POST sin token/capability responde 401/403 y el 400 nunca se observa — la suite debe `overrideGuard` los tres guards, o emitir token e2e y sembrar la capability | git revert | DET-7, RULE-api-001, RULE-global-002 | done | 3 |
| S3.T3 | Guardarrail de regresion extendido: `inventory-uuid-regression` cubre las 3 tablas del ticket (`customers`, `attachments` via imagenes, `catalogos_repuestos`), `trucks` y la superficie derivada `GET /api/catalogos/clientes` — ningun id numerico emitido, serial como `:id` no resuelve, id malformado -> 404, `itemId` no-uuid -> 400, miembros del snapshot uuid, las 3 tablas con serial+uuid en el esquema, **y los caminos de escritura**: el `id` devuelto por create/update de customers y catalogos_repuestos y por `addImage` es uuid y no coincide con el serial persistido. Los casos preexistentes de [[JOR-148]] se conservan | REQ-IMPROVE-08, REQ-IMPROVE-02, REQ-PRESERVE-04 | developer | S3.T1, S3.T2 | backend/jormat-api/test/e2e/inventory-uuid-regression.e2e-spec.ts, backend/jormat-api/test/e2e/catalogos-clientes-reuse.e2e-spec.ts | `npm run test:e2e` verde; el guardarrail falla si se invierte a proposito una proyeccion o una lista de `returning` (verificacion de que muerde en lectura Y en escritura) | git revert | DET-7, DET-13, RULE-api-001 | done | 3 |
| S3.T4 | Documentacion + regla homologada: reescribir [[RULE-api-001]] al estandar unico (dos campos, publicas por uuid, internas por serial, `items`/`trucks` canonico, `attachments.owner_id` como excepcion polimorfica, plataforma/auth como compliance pendiente) **una vez que el codigo cumple**; actualizar `jormat_docs` (data-model de attachments/trucks + nuevos `customers.md` y `catalogos_repuestos.md`; backend/modules customers/catalogos/trucks; api README con los 404/400) y `docs/` in-repo de la **raiz del monorepo** (`docs/architecture/data-model.md`, `docs/back/database.md`). Sobre `jormat_docs/frontend/{catalog-maintainers,items-list-detail,camiones}.md`: decidir explicitamente actualizar o marcar n/a con razon (el shape no cambia; puede bastar una nota de semantica del identificador). Anclas concretas: `jormat_docs/data-model/README.md:14` ("Todas las PK son UUID v4" — contradice el estandar nuevo) y su indice de tablas `:18-24` (sumar las dos entradas nuevas); `jormat_docs/data-model/attachments.md:23` (fila `id`); el comentario stale sobre `customers.id es uuid` NO esta en el doc sino en el header de la migracion `migrations/20260725000000_attachments.ts:8-9`; en `docs/architecture/data-model.md` **no tocar el ERD de plataforma** (D-PLATFORM) — la nota del estandar va en su seccion "Convenciones para tablas nuevas" (`:143`); `docs/architecture/structure.md` se marca n/a con razon (solo menciona uuid por la extension `uuid-ossp`) | REQ-IMPROVE-01, REQ-IMPROVE-04, REQ-IMPROVE-05 | developer | S3.T3 | deckard/projects/jormat-evolution/rules/api/RULE-api-001-public-uuid-identifier.md, /Users/edobacon/Workspace/q/jormat_monorepo/jormat_docs/, docs/architecture/data-model.md, docs/back/database.md, backend/jormat-api/migrations/20260725000000_attachments.ts | la regla no afirma nada que el codigo incumpla; no quedan docs describiendo el molde uuid-native como valido (incl. `data-model/README.md:14`); el comentario stale de la migracion de attachments corregido; la decision sobre los 3 docs de front y el n/a de `structure.md` quedan registrados | git revert | DET-37, RULE-global-005 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** - persistir en `## Sessions`, unit+e2e+coverage completo, dual-judge (DET-35), self-report verification (DET-33), verificar acceptance checkpoints, decidir continue/close | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4 | ticket | gate persistido + acceptance ejecutado + reviewer approved | (no aplica - cierre de session) | DET-13, DET-20, DET-23, DET-33, DET-35 | done | 3 |

### Secuencia de la migracion (S1.T1) — orden ejecutable en Postgres

El atajo "cambiar el tipo de `trucks.client_id` de uuid a integer resolviendo contra customers en el mismo paso" **no es ejecutable**: `ALTER COLUMN ... TYPE integer USING` no admite una subconsulta a otra tabla, y una vez cambiado el tipo el valor uuid previo ya no existe para resolverlo. La secuencia real usa una columna puente:

```
up():
  1. ALTER TABLE trucks DROP CONSTRAINT IF EXISTS trucks_client_id_foreign   -- libera customers.id
  2. por cada tabla T in (customers, attachments, catalogos_repuestos):
       ALTER TABLE T DROP CONSTRAINT T_pkey
       ALTER TABLE T RENAME COLUMN id TO uuid                      -- preserva valor y default
       ALTER TABLE T ALTER COLUMN uuid SET NOT NULL                -- explicito, no implicito
       ALTER TABLE T ADD CONSTRAINT T_uuid_unique UNIQUE (uuid)
       ALTER TABLE T ADD COLUMN id serial PRIMARY KEY              -- rellena las filas existentes
  3. trucks (columna puente, generico para 0 o N filas):
       ALTER TABLE trucks ADD COLUMN client_id_new integer
       UPDATE trucks t SET client_id_new = c.id FROM customers c WHERE c.uuid = t.client_id
       ALTER TABLE trucks DROP COLUMN client_id                    -- se lleva FK e indice
       ALTER TABLE trucks RENAME COLUMN client_id_new TO client_id
       ALTER TABLE trucks ALTER COLUMN client_id SET NOT NULL
       ALTER TABLE trucks ADD CONSTRAINT trucks_client_id_foreign
         FOREIGN KEY (client_id) REFERENCES customers(id) ON DELETE RESTRICT
       CREATE INDEX idx_trucks_client_id ON trucks (client_id)

down():   -- NO es "el up al reves tabla por tabla": la FK se suelta primero y se restaura al final,
          -- porque solo puede apuntar a customers cuando su PK uuid ya volvio a existir.
  1. ALTER TABLE trucks DROP CONSTRAINT IF EXISTS trucks_client_id_foreign
  2. trucks vuelve a uuid (columna puente inversa):
       ALTER TABLE trucks ADD COLUMN client_id_old uuid
       UPDATE trucks t SET client_id_old = c.uuid FROM customers c WHERE c.id = t.client_id
       ALTER TABLE trucks DROP COLUMN client_id
       ALTER TABLE trucks RENAME COLUMN client_id_old TO client_id
       ALTER TABLE trucks ALTER COLUMN client_id SET NOT NULL
  3. por cada tabla T: DROP CONSTRAINT T_pkey; DROP COLUMN id (se lleva su secuencia);
       DROP CONSTRAINT T_uuid_unique; RENAME COLUMN uuid TO id; ADD CONSTRAINT T_pkey PRIMARY KEY (id)
  4. restaurar la FK y su indice, ahora contra el uuid:
       ALTER TABLE trucks ADD CONSTRAINT trucks_client_id_foreign
         FOREIGN KEY (client_id) REFERENCES customers(id) ON DELETE RESTRICT
       CREATE INDEX idx_trucks_client_id ON trucks (client_id)
```

**Por que el orden del `down()` no es simetrico paso a paso**: el `DROP COLUMN client_id` del puente se lleva tambien la FK y el `idx_trucks_client_id` (mismo efecto que `20260813000003_trucks_facade.ts:42,49` compensa con un `CREATE INDEX` explicito). Si el `down()` no los recrea al final, el rollback deja `trucks` sin FK y el siguiente `migrate` — que es literalmente la validacion declarada de S1.T1 (`migrate` + `rollback` + `migrate`) — fallaria en su paso 1. El `IF EXISTS` de ambos pasos 1 hace la re-corrida idempotente.

**Ensayo ejecutado (2026-08-17)**: la secuencia completa (`up` + `down`) se corrio en una BD desechable (`jor149_dryrun`, ya eliminada) que replicaba customers + trucks con 3 clientes y 3 camiones. Resultado verificado, no teorico:

- `up()`: los 3 uuid quedaron identicos al set previo (diff vacio), el serial se poblo 1..3 en las filas existentes, `UPDATE 3` resolvio la FK correctamente (cada camion quedo apuntando al serial de su cliente), y sobrevivieron `customers_pkey` (ahora sobre `id`), `customers_uuid_unique`, `idx_customers_workspace_id` y `uq_customers_workspace_rut_active_isactive` con su predicado `WHERE is_active = 1`. El `NOT NULL` de la columna renombrada tambien sobrevivio, pero el `SET NOT NULL` explicito queda en la secuencia para no depender de ese comportamiento implicito de Postgres.
- `down()`: roundtrip identico — los uuid volvieron a la columna `id` con los mismos valores y `trucks.client_id` volvio a uuid con la FK restaurada **en el orden de arriba** (FK al final, despues de restaurar el PK uuid de customers). Es el orden que se ensayo; el enunciado "simetrico e inverso tabla por tabla" que traia la version previa de este bloque no es ejecutable.
- Efecto cosmetico a tener presente: el rename + add deja la columna `id` **al final** del orden fisico de la tabla (`uuid` primero). Ningun consumidor depende del orden posicional (Knex mapea por nombre, incluido el `returning('*')` de `addImage`), pero un `SELECT *` en consola se ve distinto.

Notas verificadas: `uq_customers_workspace_rut_active_isactive`, `idx_customers_workspace_id`, `idx_attachments_workspace_owner` e `idx_catalogos_repuestos_workspace_id` no tocan la columna `id`, asi que sobreviven al rename sin intervencion. `idx_trucks_client_id` SI se pierde con el `DROP COLUMN` y hay que recrearlo (en `up` y en `down`). `seeds/12_customers_data.ts:47-51` inserta sin fijar `id`, asi que sigue funcionando tras el split.

### Task contract (notas de ejecucion)

```
Task S1.T1: Migracion de identidad
- source_ref: REQ-IMPROVE-01, REQ-IMPROVE-03, REQ-PRESERVE-01
- precondition: rama de ticket cortada de epic/jormat-v1; stack docker arriba (postgres 5433)
- expected_output: 3 tablas con id serial + uuid (valor preservado), trucks.client_id integer con FK al serial, down() reversible
- validation: migrate / rollback / migrate sobre la BD dev; set de uuids de customers identico antes y despues
- rollback: npm run migrate:rollback
- rules: [DET-8, DET-40, RULE-api-001, RULE-database-001]
- nota: el orden importa — soltar la FK de trucks antes de tocar el PK de customers, y recrearla contra el serial al final

Task S1.T5: trucks R1
- source_ref: REQ-IMPROVE-03, REQ-PRESERVE-03
- precondition: S1.T1 aplicada
- expected_output: relacion interna por serial; clientId publico sigue siendo el uuid del cliente
- validation: e2e trucks; ningun numero secuencial en el payload
- rollback: git revert
- rules: [DET-40, RULE-api-001]
- nota critica: `SELECT_COLS` es el punto de fuga. Cambiar `trucks.client_id as client_id` por
  `customers.uuid as client_id` en la MISMA task que el cambio de esquema.

Task S3.T4: Docs + regla
- source_ref: REQ-IMPROVE-01, REQ-IMPROVE-04, REQ-IMPROVE-05
- precondition: S3.T3 verde (el codigo ya cumple lo que la regla va a afirmar)
- expected_output: RULE-api-001 con un unico estandar; docs sin referencias al molde uuid-native
- validation: lectura cruzada regla <-> codigo; el gap de data-model (customers/catalogos_repuestos) cerrado
- rollback: git revert
- rules: [DET-37, RULE-global-005]
```

## Constraints

- [[RULE-api-001]]: el serial nunca cruza la frontera de la API/vista. Este ticket la **reescribe** al estandar unico (D-RULE); el invariante de seguridad se conserva, cambia el estandar de esquema.
- [[RULE-database-001]]: `is_active smallint 1/0`; los reads filtran `is_active = 1`; uniques con soft-delete son indices parciales. La migracion MUST preservar el unique parcial de `customers`.
- [[RULE-testing-coverage-threshold-002]]: piso de coverage sobre el merge unit+e2e (`test:cov:all`), statements/functions/lines >=90, branches >=89, ratchet no regresivo.
- [[RULE-global-005]]: todo ticket revisa documentacion y tests antes de cerrar.
- DET-40 (auditoria de reemplazo): cada proyeccion/`where`/`returning` migrado enumera el comportamiento viejo y verifica 1:1 que el nuevo lo replica, ANTES de dar la task por hecha.
- D-PLATFORM: las tablas de plataforma/auth quedan fuera de la migracion; la regla las alcanza como estandar con compliance pendiente.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| [[JOR-148]] (SPEC-JOR-148) | internal | la fachada uuid de inventario vive solo en `epic/jormat-v1`; este ticket se apoya en ella | trabajar sobre otra base branch invalida todo el catastro |
| [[JOR-147]] (trucks_facade) | internal | dejo `trucks.client_id` como uuid -> `customers.id`; R1 lo re-apunta | ninguno operativo (trucks tiene 0 filas); se documenta como correccion encima, no como reescritura de la migracion original |
| Stack docker local (postgres 5433) | external | migraciones + e2e corren contra la BD real | sin stack arriba no se puede validar la migracion |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `SELECT_COLS` de trucks re-expone el serial del cliente tras R1 | high (si el cambio de esquema y el de proyeccion se separan) | fuga de id interno, viola RULE-api-001 | ambos cambios en S1 (T1 esquema, T5 proyeccion) + caso de guardarrail que falla ante un `clientId` numerico |
| Un `returning(SELECT_COLS)` sin alias devuelve el serial nuevo en create/update | medium | el create empieza a emitir el serial | DET-40 por metodo en S1.T2/S1.T4 + guardarrail que cubre create/update, no solo lecturas |
| El uuid se regenera en vez de moverse al partir las tablas | low | mueren todos los deep-links y URLs firmadas vigentes | REQ-PRESERVE-01 con verificacion explicita (set de uuids identico antes/despues) + `down()` probado |
| "Ordenar" `attachments.owner_id` a serial por simetria | medium | rompe la descarga firmada de imagenes (compara contra el uuid del item) | DEC-LOCAL-02 explicita + e2e `items-images` en la validacion de S1.T3 |
| `@IsUUID` en `LineItemDto` rompe el guardado de borradores con lineas incompletas | low | regresion en el builder de factura | verificado que las lineas solo nacen con `itemId: item.id`; e2e del draft con linea valida cubre el camino feliz |
| Coverage baja al agregar ramas de guard sin test | medium | el gate `test:cov:all` rompe la corrida | cada session tiene task de tests propia y el gate mide antes de cerrar |
| Los e2e existentes quedan en rojo durante S1 hasta S1.T6 | high (es esperado, no accidental) | el gate de S1 cerraria en rojo si T6 no se ejecuta | S1.T6 es task explicita con las 5 suites y sus lineas enumeradas; la validacion de S1.T2-T5 se apoya en unit + `tsc`, no en e2e |
| El tightening de `itemId` rompe unit specs de sales/purchases no enumerados | medium | S3 cierra en rojo | los 4 specs afectados estan listados en los Files de S3.T2 |
| El backfill de snapshots asume que todo miembro resuelve | low | migracion que falla en una BD ajena | el paso es defensivo: deja intacto lo que ya es uuid y no falla ante un miembro no resoluble |

## Open questions

_(ninguna — D-BRANCH, D-DEV, D-ID, D-FK, D-FK-CUST, D-PLATFORM y D-RULE quedaron confirmadas en el ticket; GF1 y la particion de sessions se resuelven en Decisions)_

## Decisions

### DEC-LOCAL-01: GF1 (filtros + paginacion de catalogos_repuestos) sale del alcance
- **Contexto**: el ticket lo dejaba condicionado a "si la pantalla lo requiere (confirmar en design)". Verificado: `catalogos-repuestos.controller.ts:35` expone `list()` sin `@Query` y el front (`services/api/inventario/catalogos.ts`) llama `listCatalogos()` sin parametros y renderiza todo; la tabla en dev tiene 0 filas.
- **Drivers**: no tiene relacion con la homologacion de identidad; implementarlo bien exige tocar el front (paginacion + filtros), que el ticket declara explicitamente fuera de alcance; no hay requerimiento de pantalla confirmado.
- **Opcion elegida**: `drop` para este ticket, registrado en Backlog con priority `could`.
- **Alternativas**: (a) implementar solo el lado server (descartada: quedaria un endpoint paginado que nadie consume — YAGNI); (b) implementarlo completo (descartada: expande el alcance a front y diluye el foco del ticket).
- **Consecuencias**: el mantenedor sigue trayendo todo; cuando el volumen lo pida, entra por su propio ticket.
- **Session**: design

### DEC-LOCAL-02: `attachments.owner_id` NO se toca — sigue guardando el uuid del item
- **Contexto**: al partir `attachments` es tentador migrar tambien `owner_id` a serial por simetria con D-FK. Pero `owner_id` es **polimorfico** (`varchar(100)`, sin FK, con `owner_type` como discriminador) y hoy guarda el **uuid publico** del item: `items.repository.ts` lo escribe asi y la descarga firmada compara `attachment.ownerId !== itemId` contra el param uuid de la ruta.
- **Drivers**: D-FK habla de FK internos; `owner_id` no es un FK. Migrarlo a serial obligaria a resolver uuid -> serial en cada lectura de imagen y romperia la comparacion de pertenencia de la descarga firmada, sin ganancia.
- **Opcion elegida**: `owner_id` queda como esta (uuid del item en varchar). Lo que se parte es el identificador **propio** de attachments.
- **Alternativas**: migrar `owner_id` a serial (descartada: rompe la descarga firmada, agrega un JOIN por imagen, y una columna polimorfica no puede apuntar al serial de dos tablas distintas sin ambiguedad).
- **Consecuencias**: `attachments` queda con identidad canonica propia y una referencia polimorfica por uuid. Se documenta como excepcion explicita en la regla homologada.
- **Session**: design

### DEC-LOCAL-03: el backfill de snapshots es un paso defensivo, no un aparato de migracion
- **Contexto**: el ticket preveia "backfill de snapshots existentes (serial -> uuid)" con specs propios. Verificado: `catalogos_repuestos` tiene 0 filas en dev, ningun seed la puebla, y el front ya envia uuids (`CrearCatalogoView.tsx:156` manda `items: selected.map(i => i.id)`, y las maestras vienen de `useCatalogos` que post-JOR-148 emite uuids).
- **Drivers**: DET-32 (necesidad/reuso) — no construir un aparato para datos que no existen, pero tampoco dejar sin defensa una BD de otro dev que si los tenga.
- **Opcion elegida**: `reduce` — migracion de datos chica, idempotente y tolerante (resuelve lo que sea serial, deja lo que ya es uuid, no falla ante un miembro no resoluble), sin infraestructura adicional.
- **Alternativas**: (a) aparato completo con reporte y specs propios (descartada: sin datos que migrar); (b) no hacer backfill (descartada: dejaria snapshots incoherentes en cualquier BD que si tenga filas).
- **Consecuencias**: la validacion del backfill se hace sembrando una fila legacy en e2e, no con datos reales.
- **Session**: design

### DEC-LOCAL-04: el plan pasa de 2 a 3 sessions
- **Contexto**: el esqueleto del ticket proponia S1 (esquema + guards + contrato) y S2 (snapshot + downstream + guardarrail). El cambio de `trucks.client_id` a integer rompe inmediatamente el codigo de `trucks.repository.ts` que inserta y proyecta el uuid.
- **Drivers**: cada session debe dejar el sistema funcional; una session que cierra con el build o los e2e rotos no tiene gate util.
- **Opcion elegida**: S1 = esquema + las 4 fachadas + trucks R1 (todo lo que el cambio de esquema arrastra); S2 = frontera (guards + contrato del filtro); S3 = referencias por uuid + guardarrail + docs.
- **Alternativas**: mantener 2 sessions (descartada: S1 quedaria en ~9 tasks y por encima de la ventana de 1.5-3h de DET-20, con el riesgo de cerrar a medias).
- **Consecuencias**: el `### Plan de sessions` del ticket se actualiza a 3 entradas.
- **Session**: design

### DEC-LOCAL-05: la resolucion uuid -> serial de trucks vive en el repo, no en el service
- **Contexto**: `TrucksService.create` valida el cliente con `isActiveClient(workspaceId, dto.clientId)` (booleano) y luego llama `repo.create` con el `clientId` uuid.
- **Drivers**: el serial es un detalle interno del repositorio; que el service lo manipule lo filtraria hacia arriba y obligaria a cambiar la firma del service y sus specs.
- **Opcion elegida**: `isActiveClient` sigue devolviendo booleano (validando ahora contra `customers.uuid`) y `repo.create` resuelve el uuid a serial internamente antes del insert. Mismo patron que la fachada de `items` (resolucion una sola vez al entrar al repo).
- **Alternativas**: que `isActiveClient` devuelva el serial y el service lo pase a `create` (descartada: filtra el id interno al service y rompe el contrato de sus specs sin ganancia).
- **Consecuencias**: una consulta de resolucion por create (index unico en `customers.uuid`, costo marginal).
- **Session**: design

## Technical reference

Estado real verificado contra `epic/jormat-v1` (2026-08-17):

- **Esquema hoy**: `customers` `t.uuid('id').primary()` (`migrations/20260723000000_customers.ts:17`), con `idx_customers_workspace_id` y el unique parcial vigente **`uq_customers_workspace_rut_active_isactive`** `(workspace_id, rut) WHERE is_active = 1` (creado en `20260813000000_soft_delete_is_active_expand.ts:67`; el `uq_customers_workspace_rut_active` original de `20260723:29-31` fue **dropeado** por `20260813000001_soft_delete_drop_disabled_at.ts:20` y ya no existe — verificado con `\d customers` en la BD dev). `attachments` `t.uuid('id').primary()` (`20260725000000_attachments.ts:22`), `owner_id varchar(100)` sin FK (comentario `:15-18`: polimorfico a proposito), `idx_attachments_workspace_owner` (`:37-39`). `catalogos_repuestos` `t.uuid('id').primary()` (`20260726000000_catalogos_repuestos.ts:12`) con 4 columnas jsonb. `items`/`trucks` nacen `t.increments('id')` (`20260714000000_inventory_schema.ts:70`, `20260715000000_trucks_table.ts:7`) y reciben `uuid` NOT NULL UNIQUE en `20260721000000_normalize_inventory_plural.ts:75,95,101-104`.
- **FK inbound**: el unico hacia las 3 tablas es `trucks.client_id` -> `customers.id` (`20260813000003_trucks_facade.ts:41-49`, ON DELETE RESTRICT). `attachments` y `catalogos_repuestos` no tienen ninguno. La migracion de trucks aborta si la tabla tiene filas (`:32-39`) — hoy tiene 0.
- **Naming de migraciones**: `YYYYMMDDHHMMSS_snake_case.ts`; la ultima es `20260813000003`.
- **Patron a replicar** (`items.repository.ts:361-372`): guard `if (!UUID_RE.test(id)) return null` + `select(i.uuid AS id, i.id AS internal_id)`; la resolucion a serial ocurre una vez y los pivotes siguen por serial (`:403`).
- **`UUID_RE` duplicada**: `items.repository.ts:69` y `catalogos.repository.ts:34` (misma regex). Usos: items `:365,626,652,666,676,687,866,1013,1064,1191`; catalogos `:274,303,321`. No existe `src/common/uuid.util.ts`.
- **Sin guard hoy**: `catalogos-repuestos.repository.ts:66-73` (`where('id', id)` directo), `customers.repository.ts:135-141,161-172,174-179`, `trucks.repository.ts:176-183,207-225` (`where('trucks.uuid', id)` contra columna uuid, sin validar formato), `items.repository.ts:736-739` (`findImageByIdUnscoped`). El controller de imagenes (`item-images.controller.ts:47-65`) valida pertenencia + firma HMAC, no formato.
- **Filtro `itemId`**: `items.repository.ts:1010-1015` (conteo) y `:1061-1066` (datos) hacen `whereRaw('1 = 0')` ante un valor no-uuid; `parseUuidCsv` (`:1185-1198`) en cambio lanza `BadRequestException` — es la asimetria que DV5 corrige.
- **Snapshot**: `dto/catalogo.dto.ts:52-93` valida los 4 arrays con `@IsArray @ArrayNotEmpty @IsString({each:true})`; ejemplos `items: ['25435']`, `cat-001`, `app-001`, `prov-001`. El repo persiste con `JSON.stringify` sin validar (`catalogos-repuestos.repository.ts:75-89`).
- **Front (solo lectura, no se toca)**: el builder manda uuids — `CrearCatalogoView.tsx:156` (`items: selected.map(i => i.id)`) y `:233,244,255` (`options` desde `a.id`/`c.id`/`p.id` de las maestras); `TransactionBuilder.tsx:134` y `PurchaseInvoiceBuilder.tsx:114` setean `itemId: item.id`. Las lineas solo nacen desde `handleAddItem(item)`, nunca vacias. Las fixtures MSW (`test/msw/handlers/{ventas,purchases}.ts`) y las stories siguen en serial — backlog `should`.
- **Downstream**: `sales`/`purchases`/`payments` son stubs **en memoria**, sin Knex (`purchases.service.ts:46-48` y `payments.service.ts:39` lo declaran explicito). `LineItemDto` es DTO de **entrada** via `FacturaInputDto.lineas` en `POST /ventas/facturas` y `/draft` (`facturas.controller.ts:34,46`), asi que validar `itemId` como uuid es un cambio de contrato real, no cosmetico.
- **Tests**: guardarrail `test/e2e/inventory-uuid-regression.e2e-spec.ts` cubre items + catalogos maestras (`:147-216`), **cero casos** de customers/attachments/catalogos_repuestos. Fixtures unit no-uuid: `trucks.service.spec.ts:31,56,58,61` (`clientId: 'client-1'`), `customers.controller.spec.ts:159,167,213,224,239` (`'cust-1'`), `item-images.controller.spec.ts:19` e `items.service.spec.ts:495,573` (`'att-1'`), `catalogos-repuestos.controller.spec.ts:29` (`'cat-rep-001'`), `items.controller.spec.ts:70,138` (`'25435'`).
- **Realineamiento de los e2e (corregido tras el juicio del spec)**: los e2e usan valores uuid, pero los usan **contra la columna `id`**, que pasa a ser integer — por eso se rompen con S1.T1 (`invalid input syntax for type integer`), y por eso el trabajo esta enumerado y no se da por gratis. **La enumeracion exhaustiva y ejecutable vive en S1.T6** (5 suites, con sus lineas); no se duplica aqui para no dejar dos listas que diverjan. Matiz de diseno a tener presente al migrarlas: en `trucks.e2e-spec.ts:139` el assert `expect(row.client_id).toBe(CLIENT_A)` no se migra a `uuid` sin mas — tras R1 la columna guarda el **serial**, asi que el assert debe ir contra el serial resuelto desde ese uuid. Las referencias a `workspaces.id` NO cambian (esa tabla queda fuera por D-PLATFORM).
- **Superficie derivada de customers**: `CatalogosService.getClientes` (`src/catalogos/catalogos.service.ts:86-88`) devuelve customers via `CustomersService.search` -> `repo.list`, asi que hereda `SELECT_COLS`. Su e2e (`test/e2e/catalogos-clientes-reuse.e2e-spec.ts:68-74`) solo afirma `id: expect.any(String)`, que no distingue uuid de serial serializado — el guardarrail debe cubrirla con un aserto de forma uuid.
- **Nivel de asercion de los e2e (importante para redactar los casos)**: las suites de `test/e2e/` **no levantan la app** — instancian repos/services directo contra la BD (`customers.e2e-spec.ts:37`, `trucks.e2e-spec.ts`, `inventory-uuid-regression.e2e-spec.ts:67-73`). La unica que monta Nest con supertest es `e2e-login.e2e-spec.ts:8,62`. Consecuencia practica: los casos de "id malformado -> 404" se afirman como `null`/`false`/`NotFoundException` a nivel repo/service (precedente: `items-list.e2e-spec.ts:406` afirma `BadRequestException`, no un status 400), mientras que los casos de 400 del `ValidationPipe` sobre `lineas[].itemId` (TC8/TC15) SI exigen montar `Test.createTestingModule` + `ValidationPipe` + supertest en la suite nueva de sales/purchases.
- **Ejecucion**: `npm run test` (unit), `npm run test:e2e`, `npm run test:cov:all` (gate de coverage, merge unit+e2e con `--branches=89`). Migraciones: `npm run migrate` / `migrate:rollback`. Stack dev: postgres en 5433, api en 4001.

## Backlog

| # | Item | Priority | Origen | Status |
|---|------|----------|--------|--------|
| B1 | GF1 — filtros server-side (`search`) + paginacion en `catalogos_repuestos` (backend + front) | could | DEC-LOCAL-01 | open |
| B2 | Alinear fixtures del front (MSW `handlers/{ventas,purchases}.ts` y stories de ventas/compras) al `itemId` uuid | should | REQ-IMPROVE-07 (front fuera de alcance) | resuelto por JOR-155 (2026-08-18): `itemId` migrado a uuid con prefijo de dominio en `handlers/ventas.ts` y `handlers/purchases.ts`, stories de ventas alineadas |
| B3 | Compliance de identidad en tablas de plataforma/auth (workspaces, users, roles, capabilities, user_roles) | should | D-PLATFORM | open |
| B6 | **Validacion de formato uuid en plataforma/auth** (3 puntos, misma causa raiz, todos fuera de alcance por D-PLATFORM): (a) `PATCH /api/workspaces/:id` sin `ParseUUIDPipe` llega a `workspaces.service.ts:44` `.where({id}).update(...)` sobre una columna uuid → 500; asimetria interna: `delete()` (`:50`) SI valida, `update()` no. (b) El header `X-Admin-Workspace` se usa crudo como `req.user.workspaceId` (`auth.guard.ts:149-150`) y alimenta `tenantScoped()` en practicamente toda query del producto: un header malformado revienta cualquier endpoint (es el riesgo O-3 ya documentado en RULE-global-002). (c) La 3a copia del patron uuid (`workspaces.service.ts:50`, como `uuidRegex`) deberia importar `UUID_RE` de `common/uuid.util.ts`. Detectado por el barrido de S2.T4 | should | hallazgo de S2.T4 | resuelto por JOR-150 (2026-08-18), no JOR-156: los 3 puntos (a `ParseUUIDPipe` + guard en `update()`/`findById()`, b guard de formato en `X-Admin-Workspace`, c dedupe de `UUID_RE`) quedaron cerrados alli; JOR-156 se quedo solo con B4/B5 |
| B5 | `trucks.joinedScope` hace INNER JOIN a `customers` sin `customers.is_active = 1`: un cliente dado de baja sigue hidratando el camion en list/detail. **Preexistente**, misma forma que B4; detectado por el juez A en el gate de S1 | should | hallazgo del gate S1 | resuelto por JOR-156 (2026-08-18): `joinedScope()` agrega `customers.is_active = 1` (commit `3270b3b`) |
| B4 | `KnexCatalogosRepuestosRepository.update` no filtra `is_active = 1`: un catalogo dado de baja se puede editar por PATCH aunque `findById` ya no lo devuelva. **Preexistente** (no lo introduce este ticket); detectado y preservado 1:1 por DET-40 en S1.T4. Roza el contrato de lectura de [[RULE-database-001]] | should | hallazgo de S1.T4 | resuelto por JOR-156 (2026-08-18): `update()` agrega `.where('is_active', 1)` (commit `09f7b0a`) |

## Rules discovered

_(se llena durante ejecucion)_

## Bugs found

_(se llena durante ejecucion)_

## Acceptance checkpoints

- [x] **Funcional**: las 5 tablas del dominio tienen `id` serial + `uuid`; customers/catalogos_repuestos/imagenes direccionan y emiten por uuid; trucks relaciona por serial y expone el uuid del cliente; id malformado -> 404 en las 4 superficies; `itemId` no-uuid -> 400; snapshot y line items por uuid.
- [x] **Preservacion**: el valor uuid publico de toda fila preexistente es identico antes y despues (verificado sobre customers); `uq_customers_workspace_rut_active_isactive`, `idx_attachments_workspace_owner`, `idx_catalogos_repuestos_workspace_id` e `idx_trucks_client_id` presentes tras la migracion; aislamiento por workspace y `is_active = 1` intactos; `front/jormat-front/` sin cambios en el diff.
- [x] **Tests** (DET-37 dim4): unit actualizados + guardarrail extendido + e2e por tabla, corridos y en VERDE; coverage del merge unit+e2e no baja del piso (>=90 / branches >=89).
- [x] **NFRs**: 0 ids numericos emitidos por el dominio; 0 superficies con 500 ante id malformado.
- [x] **Rules**: [[RULE-api-001]] reescrita al estandar unico y cumplida por el codigo; [[RULE-database-001]] intacta (soft-delete + unique parcial preservado).
- [x] **Integration**: pivotes y FKs internos siguen por serial; la fachada de [[JOR-148]] sigue verde; `migrate:rollback` revierte limpio.
- [x] **Docs oficiales** (DET-37 dim1): `jormat_docs` (data-model incl. los dos archivos nuevos + el `README.md:14` que aun afirma "todas las PK son UUID v4", backend/modules, api) y `docs/` in-repo reflejan el estandar unico, sin tocar el ERD de plataforma; el comentario stale de `migrations/20260725000000_attachments.ts:8-9` corregido; decision registrada sobre los 3 docs de front y el n/a de `structure.md`.
- [x] **KB DKC** (DET-37 dim2): [[RULE-api-001]] homologada; backlog B1-B3 registrado.
- [x] **Gates observables**: `necessity-assessment`, `planning-completeness`, `parallelization-assessment`, `spec-judge`, `spec-approval` en `decisions_log`.
