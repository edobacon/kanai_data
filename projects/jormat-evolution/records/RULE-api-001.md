---
id: RULE-api-001
project: jormat-evolution
type: rule
module: api
level: must
tags:
  - uuid
  - identificador-publico
  - api-contract
  - seguridad
  - idor
  - serial
  - dto
  - repository
  - identidad
---

# Identidad de dos campos: serial interno + uuid publico, y el serial nunca cruza la frontera de la API/vista

## What

Toda tabla de negocio tiene **dos campos de identidad** y se **direcciona/expone hacia afuera por el uuid**, nunca por el serial.

- **Modelo canonico (dos campos)**: cada tabla del dominio tiene `id` = serial incremental (PK interno) + `uuid` = uuid NOT NULL UNIQUE (identificador publico). El molde de referencia es `items` y `trucks`. **No coexiste un segundo molde**: el patron uuid-native (un solo campo `id` que ES el uuid, sin serial) queda **eliminado** — las tablas que lo usaban (`customers`, `attachments`, `catalogos_repuestos`) se migraron al modelo canonico en [[JOR-149]], moviendo el valor uuid de `id` a `uuid` (sin regenerarlo, para preservar deep-links).
- **Contrato**: el identificador del recurso en el DTO se llama `id` y su **valor es el uuid**. El front lee siempre `record.id` sin ramificar por dominio; el serial y el uuid quedan indistinguibles desde afuera porque el serial no se expone.
- **Relaciones publicas por uuid**: cualquier identificador o referencia que cruza la API (el del recurso o el de una entidad relacionada) es el uuid. Ej.: `trucks` emite `clientId` = uuid del cliente, aunque internamente guarde el serial.
- **Relaciones internas por serial**: los FK entre tablas del dominio apuntan al `id` serial. La resolucion `uuid -> serial` ocurre **una sola vez** en el limite del repo (JOIN o lookup a la maestra); los joins, pivotes y `syncPivots` internos siguen operando por serial. No se migra la malla de FK a uuid.
- **El serial no se emite**: ningun payload de respuesta (list, detail, summary, nested, export) ni ningun camino `RETURNING` de create/update puede contener el serial de un recurso. La columna `uuid` se proyecta como `id` (`SELECT uuid AS id`, `.returning('uuid as id')`) y el serial queda oculto.
- **El serial no se acepta**: los endpoints resuelven el `:id` entrante contra la columna `uuid` (`WHERE uuid = :id`). Un serial pasado como `:id` no resuelve (404). El param se tipa `string` y se valida su formato uuid antes de tocar la columna `uuid` (id malformado -> 404, no 500).
- **Superficie derivada**: los filtros que reciben ids (ej. CSV de categorias/aplicaciones/proveedores, filtro `itemId` del listado) reciben uuids y se traducen a serial en el limite; un valor no-uuid se rechaza con 400. El token de ordenamiento `id` expuesto al front mapea a un campo estable (uuid o `created_at`), no al serial.
- **Tabla nueva**: nace con los **dos campos** (`id` serial + `uuid` unique). Una tabla de negocio sin ambos campos, o que exponga el serial, es un incumplimiento.

### Excepciones documentadas

- **`attachments.owner_id`** es una referencia **polimorfica** por uuid en `varchar` (`owner_type` como discriminador), NO un FK. Guarda el uuid publico del dueño (para `owner_type='item'`, el uuid del item) y por eso **no sigue** la regla "internas por serial": una columna polimorfica no puede apuntar al serial de dos tablas distintas sin ambiguedad, y la descarga firmada compara `owner_id` contra el uuid de la ruta ([[JOR-149]] DEC-LOCAL-02).
- **Pivotes puramente internos** sin endpoint propio no requieren emitir uuid mientras su serial no cruce ninguna respuesta.

Toda excepcion se documenta en el codigo.

## Why

- Un serial expuesto habilita **enumeracion trivial** de recursos (IDOR) y filtra informacion de negocio por el propio incremento (cuantos items/clientes/documentos existen, ritmo de alta). El uuid publico corta esa superficie. Es el invariante de seguridad que la regla protege.
- **Un unico estandar** (dos campos, publico por uuid, interno por serial) elimina la decision por-tabla entre dos moldes de identidad. Antes convivian la fachada-serial (`items`/`trucks`) y el uuid-native (`customers`/`catalogos_repuestos`), y cada tabla nueva tenia que elegir; con un solo molde deja de ser una eleccion.
- Elegir la **fachada** (uuid publico + serial interno) sobre migrar la malla de FK a uuid evita reescribir todos los pivotes: es reversible, aislado a la capa API/repo + rutas front, y de bajo riesgo. El costo (una resolucion `uuid -> serial` por operacion, por indice unico en `uuid`) es marginal frente al de una migracion destructiva de claves.
- Nombrar el campo `id` con valor uuid (en vez de un `uuid` aparte de cara al front) mantiene **un solo shape de identificador** en todo el contrato.

## Where

- **Backend** (`backend/jormat-api/`): repos (proyeccion `uuid AS id`, `WHERE uuid`, `RETURNING uuid`, resolucion `uuid -> serial` en el limite, traduccion de filtros), DTOs (identificador = uuid), controllers (`@Param('id')` string sin cast). **Molde canonico correcto**: `src/items/` y `src/trucks/` (dos campos, fachada uuid, FK interno por serial). `src/customers/`, `src/items/catalogos-repuestos.*` y las imagenes de item (`attachments`) siguen ese mismo molde desde [[JOR-149]].
- **Guard de formato**: `src/common/uuid.util.ts` (`UUID_RE`) es la unica fuente del patron uuid; los repos con fachada lo importan para validar `:id`/`attachmentId` antes de consultar la columna `uuid`.
- **Gotcha del alias en `RETURNING`**: `.returning(SELECT_COLS)` con `'uuid as id'` SI honra el alias (Knex 3.x pasa el `returning` por el mismo `columnize` que el `select`), asi que create/update devuelven el uuid. Pero `.returning('*')` NO aliasea: trae la fila cruda con el serial, y el mapeo debe leer `row.uuid` explicito (caso `addImage` -> `mapAttachmentRow`). Un `returning('*')` mapeado por `row.id` filtra el serial recien nacido.
- **Frontend** (`front/jormat-front/`): rutas dinamicas `[id]`, cliente API y tipos generados (`api.gen.ts`) transportan uuid. El componente sigue leyendo `record.id`. El contrato de cara al front **no cambia de shape** (`id` string, `clientId` uuid).
- **Plataforma / auth** (`workspaces`, `users`, `roles`, `capabilities`, `user_roles`): **alcanzadas por el estandar** pero con **compliance pendiente** — hoy siguen siendo uuid-PK sin serial y no se migran (radio enorme, las referencia el JWT y todo el RBAC). Es deuda de un ticket propio ([[JOR-149]] D-PLATFORM; backlog B3). La validacion de formato uuid en esos endpoints tambien queda pendiente (backlog B6).

## When

- Al crear un endpoint o vista para un recurso de negocio: se direcciona por uuid desde el dia uno.
- Al crear una tabla de negocio nueva: nace con los dos campos (`id` serial + `uuid` unique).
- Al tocar un endpoint legacy que aun expone el serial: se migra a uuid en ese mismo cambio (big bang por dominio, sin ventana dual-accept, dado que front y back viven en el monorepo sin consumidores externos).
- **Migracion del inventario** (fachada uuid sobre las 13 tablas serial + uuid ya provisto): [[JOR-148]] — **APLICADA** (items list/detail/summary + catalogos categorias/aplicaciones/proveedores, incl. `/list`, direccionan y exponen por uuid; el serial no cruza la API).
- **Homologacion de identidad del dominio** (partir las 3 tablas uuid-native al molde de dos campos, re-apuntar `trucks.client_id` al serial, cerrar guards 404 y contrato `itemId` 400, snapshot y line items por uuid): [[JOR-149]] — **APLICADA**. El guardarrail de regresion `test/e2e/inventory-uuid-regression.e2e-spec.ts` cubre lectura y escritura de las 5 tablas del dominio (`items`, `trucks`, `customers`, `attachments`, `catalogos_repuestos`) y falla si un serial vuelve a cruzar la API.
- **Compliance pendiente**: identidad de dos campos + validacion de formato uuid en las tablas de plataforma/auth ([[JOR-149]] D-PLATFORM; backlog B3/B6). Los dominios `sales`/`purchases`/`payments` (stubs en memoria) ya validan el `itemId` de sus line items como uuid; se conectaran a datos reales por uuid en un ticket propio.
