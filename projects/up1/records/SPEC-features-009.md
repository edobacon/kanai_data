---
id: SPEC-features-009
project: up1
type: doc
module: features
tags:
  - up1
  - layout-engine
  - dashboard
  - mosaic
  - widgets
  - record-list
  - report-builder
  - flexmonster
  - ui-pattern
  - UPONE-1091
  - UPONE-1226
---

# Schema Hot-Swap y Aislamiento Multi-Tenant de uP1

## Indice

1. [Que es y por que](#1-que-es-y-por-que)
2. [Hot-swap del Prisma client y del schema GraphQL](#2-hot-swap-del-prisma-client-y-del-schema-graphql)
3. [Persistencia de custom fields en runtime](#3-persistencia-de-custom-fields-en-runtime)
4. [Aislamiento per-tenant](#4-aislamiento-per-tenant)
5. [Health check por tenant](#5-health-check-por-tenant)
6. [Flags, entorno y limitaciones](#6-flags-entorno-y-limitaciones)

---

## 1. Que es y por que

Object Manager es schema-driven: los objetos (`objects/business/*.json`) generan `prisma/schema.prisma` (codegen), y de ahi Prisma genera el cliente y el schema GraphQL se reconstruye (`dynamic.js`). Historicamente, todo cambio de schema (crear un objeto, agregar un campo custom, editar una capacidad que toca columnas) terminaba en el mismo camino: escribir un flag de "pending changes", tocar un archivo de restart-trigger, y dejar que PM2/nodemon reinicie el proceso. `runPendingPipeline()` (`object-manager/src/services/applyChanges.js:257-345`) corre codegen → `prisma db push` → `prisma generate` de forma sincronica ANTES de levantar el servidor Apollo.

Ese camino tiene dos problemas en produccion multi-tenant:

- **Restart global**: reiniciar el proceso para aplicar el schema de UN tenant tira la conexion de TODOS los tenants servidos por ese pod, aunque su schema no haya cambiado.
- **Ventana de inconsistencia**: con replicas, mientras un nodo ya reinicio (BD migrada) y otro no, ese segundo nodo sigue sirviendo con un Prisma client viejo contra una BD ya migrada (columnas renombradas o borradas = error 500 silencioso).

UPONE-1365 ataca el segundo problema primero (aislar el "dano" del restart por tenant: gate de mantenimiento, restarts escalonados, `/health` por tenant) y deja documentado que el zero-restart hot-swap queda fuera de su alcance (ver `object-manager/docs/reference/multi-tenant-architecture.md:150`, seccion "Explicitamente NO provisto"). UPONE-1385 retoma exactamente ese punto: reconstruir el Prisma client y el schema GraphQL EN VIVO, sin restart, detras del flag `SCHEMA_HOT_SWAP_ENABLED` (default apagado).

```
Editar objeto/campo (Object Definition Editor)
        |
        v
applyChanges(tenantId, { destructive })
        |
   SCHEMA_HOT_SWAP_ENABLED=true?  --no--> restart-trigger (camino legado, sin cambios)
        | si
        v
codegen -> db push -> prisma generate (in-process, spawn async)
        |
        v
tenantManager.reloadClient()  (Prisma client nuevo, sin restart)
        |
        v
swapSchema()  (nuevo ApolloServer, sin restart)
        |
        v
Otros nodos: Redis Pub/Sub -> regeneran localmente y hacen swap tambien
```

## 2. Hot-swap del Prisma client y del schema GraphQL

### Que hot-swap SI cubre y que no

En el estado actual del platform, con `SCHEMA_HOT_SWAP_ENABLED=true` el hot-swap cubre TANTO nuevos campos COMO nuevos modelos (objetos y record-types) sin restart. Lo que lo habilita es el directorio versionado del cliente: `reloadClient` snapshotea `generated/` a `generated__<version>/`, un import URL nuevo que relee el grafo de modulos completo (DMMF incluido), y eso es lo que hace consultables in-process tanto modelos nuevos como campos nuevos (`object-manager/src/services/tenantManager.js:203-240`, ver el header de la funcion en las lineas 208-209).

| Cambio | Camino con flag activo |
|---|---|
| Editar/agregar un campo (field) de un objeto | Hot-swap en vivo (sin restart) |
| Editar metadata (label, gender, defaultLayout, etc.) | Hot-swap en vivo (sin restart) |
| Crear un objeto (nuevo modelo Prisma) | Hot-swap en vivo (sin restart) |
| Crear un record-type (`rt__...`, nuevo modelo) | Hot-swap en vivo (sin restart) |
| Borrar un objeto o campo (destructivo) | Hot-swap en vivo, gateando al tenant durante el pipeline |

El fallback al camino de restart NO depende del tipo de cambio: ocurre solo cuando `doSwap` devuelve `ok:false` por una de estas razones (`object-manager/src/services/schemaHotSwap.js:139-155,196-204`):

- `disabled`: el flag `SCHEMA_HOT_SWAP_ENABLED` esta apagado (default).
- `uninitialized`: `initSchemaHotSwap` todavia no inyecto la config de build.
- `escape-hatch`: se supero `SCHEMA_HOT_SWAP_MAX_BEFORE_RESTART` (default 10 swaps acumulados en el proceso, por el leak de modulos ESM).
- `error`: el rebuild del schema o el `start()` del ApolloServer fallo (schema malformado).

Los cambios destructivos (borrar un objeto o campo) NO fuerzan restart: hacen hot-swap igual, y solo gatean al tenant con 503 durante el pipeline (ver seccion 4).

> Nota forward-looking (NO vigente en el estado actual): existe un commit `915bda36` ("restart instead of hot-swap on model-set changes", UPONE-1385) que introduce un flag `modelSetChanged` para enrutar create/delete de objeto/RT al restart, argumentando que el reload in-process no surfacearia un modelo nuevo. Ese cambio NO esta mergeado al working tree ni a `origin/develop` (git grep de `modelSetChanged` vacio en ambos), asi que no describe el comportamiento actual. Si algun dia se integra, esta tabla cambiaria para create/delete de objeto/RT.

### El problema tecnico de fondo

`@apollo/server` v5 no tiene forma soportada de reemplazar el schema de una instancia ya iniciada, y el modulo ESM `dynamic.js` (typeDefs generados por codegen) se cachea por URL resuelta sin API de eviccion: reimportarlo devuelve el modulo viejo aunque el archivo en disco ya cambio. Lo mismo pasa con el cliente Prisma generado: sus modulos hermanos (DMMF, metadata de modelos) se cachean igual, asi que un simple bust por query-string (`?v=`) en `index.js` no alcanza (`object-manager/src/services/tenantManager.js:24-32`).

La solucion (documentada en el header de `schemaHotSwap.js:1-25`) es indirection en dos niveles:

- **GraphQL**: en vez de montar `expressMiddleware(server)` directo en `/graphql`, `index.js` monta un wrapper estable (`graphqlHandler`, `object-manager/src/services/schemaHotSwap.js:126-131`) que delega al handler actualmente registrado. Un swap arma un `ApolloServer` NUEVO con el schema fresco, lo inicia, y repunta el wrapper atomicamente (`object-manager/src/services/schemaHotSwap.js:144-206`, funcion `doSwap`).
- **Prisma**: `tenantManager.reloadClient()` no re-importa `generated/index.js` en el mismo path. Copia el directorio `generated/` regenerado a un directorio nuevo y unico `generated__<version>/` y apunta el tenant ahi (`object-manager/src/services/tenantManager.js:220-240`). Como es una URL de import distinta, TODO el grafo de modulos (incluido el DMMF) se lee fresco, y modelos/campos nuevos quedan consultables sin restart.

### Reglas duras del swap (verificadas contra `@apollo/server` 5.5.1)

- El `ApolloServer` de cada swap NO debe llevar `ApolloServerPluginDrainHttpServer`: ese plugin cierra el socket HTTP compartido al hacer `stop()`, lo que tumba el proceso entero. Por eso el servidor de boot (que si lleva el plugin) nunca se detiene: `schemaHotSwap.js:191` compara `oldServer !== bootServer` antes de programar el `stop()`.
- Cada servidor de swap se crea con `stopOnTerminationSignals: false` (linea 172), porque cada `start()` agrega listeners de SIGINT/SIGTERM que de otro modo se acumulan por swap.
- Cada reimport cache-busteado de `dynamic.js` (`object-manager/src/graphql/typeDefsIndex.js:36-40`, funcion `rebuildTypeDefs`) retiene el modulo viejo en memoria para siempre (no hay eviccion en ESM). Por eso existe un escape-hatch: pasado un umbral de swaps (`SCHEMA_HOT_SWAP_MAX_BEFORE_RESTART`, default 10, `schemaHotSwap.js:79-82`), el modulo devuelve `{ ok: false, reason: 'escape-hatch' }` y el caller cae al restart normal, reciclando el proceso.
- El swap corre serializado en el proceso por una promise chain (`swapChain`, linea 77 y 144-147) para que dos ediciones casi simultaneas no arranquen dos builds a la vez. La serializacion ENTRE nodos (varias replicas) es responsabilidad de otro modulo: `schemaLock.js`.

### Lock distribuido (`schemaLock.js`)

Dos candados via `SETNX` de Redis, con liberacion por token (Lua CAS, evita borrar un lock ya reasignado tras expirar) y **fail-open** si Redis no esta disponible (`object-manager/src/services/schemaLock.js:74-104`, funcion `withLock`):

- **Global** (`schema:dynamic-js:lock`): protege la escritura de `dynamic.js` y su reimport, porque es un artefacto UNICO construido a partir de TODOS los tenants (el codegen del tenant A podria pisar la lectura del tenant B).
- **Por tenant** (`tenant:<T>:schema:lock`): protege el `db push` y la regeneracion del cliente de ESE tenant.

`hotSwapPublisher` (`object-manager/src/services/applyChanges.js:182-215`) anida ambos: primero el lock global, adentro el lock del tenant.

### Publisher vs subscriber

- **Publisher** (el nodo donde el admin edito el objeto): `applyChanges()` corre el pipeline completo con `db push` real (`allowDataLoss: destructive`), recarga el cliente, hace el swap, y si tiene Redis publica la version convergida en `tenant:{id}:schema:version` (backstop de durabilidad) y borra la key de status para que el modal de "Applying Changes" del frontend caiga de inmediato (`object-manager/src/services/applyChanges.js:182-215`).
- **Subscriber** (las demas replicas): reciben el mensaje por Redis Pub/Sub en el canal `schema:changes` (`object-manager/src/services/schemaChangeSubscriber.js:20,80-109`) y corren `applyHotSwapSubscriber` (`schemaChangeSubscriber.js:172-202`), que hace SOLO `generate` (nunca `db push`, el publisher ya migro la BD) y luego el mismo `reloadClient` + `swapSchema`.
- **Deduplicacion de eco propio**: cada proceso tiene un `NODE_ID` estable (`hostname-pid`, `schemaHotSwap.js:35`). El publisher incluye su `nodeId` en el payload; un subscriber que vea su propio `nodeId` lo ignora (`schemaChangeSubscriber.js:89-95`), porque ya aplico el cambio inline.
- **Poll de reconciliacion**: Pub/Sub es fire-and-forget, asi que una replica momentaneamente caida puede perderse el mensaje. Con hot-swap activo, `startReconcilePoll()` (`schemaChangeSubscriber.js:130-157`) compara cada 30s (`SCHEMA_RECONCILE_POLL_MS`) la version aplicada localmente contra `tenant:{id}:schema:version` en Redis, y converge si esta atrasada.
- **Fallback**: si el hot-swap esta deshabilitado, falla, o se agota el escape-hatch, se usa el camino legado: `fallbackToRestart()` (`schemaChangeSubscriber.js:216-237`) escribe el flag pendiente y el trigger de restart, con un delay aleatorio (`restartStaggerDelayMs`, `schemaChangeSubscriber.js:248-253`) para que las replicas no reinicien todas al mismo instante.

## 3. Persistencia de custom fields en runtime

**Sintoma reportado** (UPONE-1385, fix `111396ca`): un campo custom creado en runtime via la mutacion `createCustomField` (campos con `isBaseField:false`, definidos en `ext__<CLIENT>__<objeto>.json`) desaparecia de la UI despues de un despliegue/restart, aunque la columna seguia existiendo en la base de datos.

**Causa raiz**: `createCustomField` solo insertaba la fila en `core_FieldDefinition` en el momento de la mutacion. El codegen (que SI corre en cada boot, incluso en el init container del despliegue) reconstruia los campos base y de RecordType desde el catalogo de objetos, pero nunca reconstruia los campos EXTENDED. El init container arranca con el catalogo "baked" de la imagen (sin el objeto/campo creado en runtime), asi que su corrida de codegen trataba esos `core_FieldDefinition` como huerfanos y los soft-borraba (limpieza de orphans). El resultado: la columna sigue en la BD, pero el campo no aparece en el listado de campos que la UI arma desde `core_FieldDefinition`.

**Solucion**: `syncExtendedFieldsToRegistry()` (`object-manager/src/services/codegen/generatePrismaSchema.js:2760-2883`), invocada justo despues de `syncBaseFieldsToRegistry` (`generatePrismaSchema.js:1355-1364`). Por cada `core_ObjectDefinition` no-RT:

1. Lee el archivo `ext__<clientCode>__<objeto>.json` compartido y, si se esta generando el schema de un tenant especifico, tambien el `ext__` del tenant en `config/tenants/{tenantId}/Extended/` (union de propiedades, el del tenant pisa al compartido).
2. Por cada propiedad del merge, reconstruye o actualiza la fila de `core_FieldDefinition` (tipo, enum, FK, formato, transiciones), reactivando campos que un codegen previo hubiera soft-borrado (`active: true` en el update, linea 2851).
3. Los campos que ya no estan en el catalogo JSON se soft-borran (`active: false`), replicando el mismo criterio que ya usaba `syncBaseFieldsToRegistry`.
4. Si no hay archivo `ext__` para el objeto, no toca nada (una ausencia de archivo no es senal de borrado, para no arrasar datos).

Los campos RT (`rt__` en el nombre del ObjectDefinition) se excluyen explicitamente (linea 2775) porque ya se registran en el bloque de RecordType.

Como refuerzo adicional del mismo ticket, `scripts/sync-objects-from-s3.js` corre ANTES del codegen en el init container para converger el catalogo local al de S3 (la fuente de verdad live) en vez de partir del catalogo baked en la imagen. Esta sync trajo su propio bug relacionado (mass-delete): `syncFromS3` originalmente borraba archivos locales ausentes en S3 sin mirar la magnitud del borrado; un bucket casi vacio (bug de seed, ~2 objetos contra ~112 locales) arrasaba el catalogo local completo. El guard actual (`object-manager/src/services/s3Sync.js:198-236`) rehusa el borrado de huerfanos cuando superaria `S3_SYNC_MAX_DELETE_FRACTION` (default 0.5) del catalogo local, tratando el bucket como no poblado/mal configurado en vez de honrar el borrado masivo.

## 4. Aislamiento per-tenant

### `tenantMaintenanceGate`

Middleware montado en `/graphql` ANTES del handler de GraphQL (`object-manager/src/index.js:453-459`): `app.use('/graphql', cors(...), express.json(), tenantMaintenanceGate, graphqlHandler)`.

Mientras el pipeline de un tenant corre, su key Redis `tenant:{id}:schema:status` (escrita por `applyChanges` con TTL, `applyChanges.js:112-135`) vale `restarting` o `maintenance`. El gate (`object-manager/src/services/tenantMaintenanceGate.js:50-97`) responde 503 + `Retry-After: 15` SOLO a las requests de ESE tenant (leido de `X-Tenant-ID`); cualquier otro tenant pasa sin tocar. El proposito: cerrar la ventana en la que un nodo que todavia no reinicio serviria con un Prisma client viejo contra una BD ya migrada (real quando el cambio es destructivo y hay restarts escalonados).

Dos capas de la misma gate:

- **Cache en memoria** (`cacheTtlMs`, default 2s) para no pegarle a Redis en cada request.
- **Flag local en proceso** (`localMaintenance`, `tenantMaintenanceGate.js:20-41`, `markTenantMaintenance` / `clearTenantMaintenance`): cubre el caso de una caida total de Redis durante un hot-swap destructivo. El gate normal es fail-open (si Redis no responde, deja pasar), pero un swap destructivo en curso en ESTE nodo se marca de forma local, independiente de Redis, hasta que termine su propio `reloadClient`.

`applyChanges` (publisher) y `applyHotSwapSubscriber` (subscriber) llaman `markTenantMaintenance`/`clearTenantMaintenance` alrededor del pipeline SOLO cuando `destructive` es true (`applyChanges.js:187,212` y `schemaChangeSubscriber.js:175,199`); los cambios puramente aditivos (crear un campo, por ejemplo) no gatean al tenant porque un cliente Prisma viejo sigue siendo compatible con columnas nuevas que aun no consulta.

> **Asimetria a tener en cuenta**: `applyChanges(tenantId)` tiene `destructive: true` por default cuando se omite (`applyChanges.js`). `createObjectDefinition` y `createRecordType` pasan explicitamente `{ destructive: false }` (`objectDefinition.resolver.js:1071,1539`), pero `updateObjectDefinition` (`:1190`, edicion solo de metadata: `label`/`labelPlural`/`gender`/`description`/`defaultLayoutType`) llama `applyChanges(tenantId)` **sin opciones**, asi que **gatea al tenant con 503** durante todo el pipeline (codegen + `prisma db push` + `prisma generate`), pese a ser un cambio puramente aditivo. Es inconsistente con el principio de arriba (posible bug o cautela intencional; ver follow-ups de codigo).

### Restarts escalonados

Cuando se cae al camino legado (hot-swap deshabilitado o fallido), cada replica subscriptora espera un delay aleatorio antes de escribir su propio restart-trigger: `restartStaggerDelayMs()` (`object-manager/src/services/schemaChangeSubscriber.js:248-253`) devuelve `base + random() * spread`, con `SCHEMA_RESTART_STAGGER_BASE_MS` (default 60000ms) y `SCHEMA_RESTART_STAGGER_SPREAD_MS` (default 30000ms). Poner ambos en 0 restaura el comportamiento previo (restart inmediato). El objetivo es que, con 2+ replicas, la plataforma siga sirviendo mientras al menos una replica ya reinicio y las demas todavia no.

### Migraciones y sync por tenant sin tumbar a los demas

`scripts/sync/dbSync.js` aisla el fallo de un tenant del resto en cada fase que itera tenants (relationship paths, capabilities, apps y layouts, layouts default, seeds, reportes de mod): un `try/catch` por tenant registra el error via `recordTenantError` y el loop continua; el cliente Prisma del tenant que fallo se desconecta en un `finally` antes de pasar al siguiente (`dbSync.js:146-149`, patron repetido en cada fase), y un `finally` de nivel de fase corre `disconnectAll()` como red de seguridad. Al final, `sync:db` imprime un bloque `PARTIAL FAILURE` listando tenant y fase de cada error (`dbSync.js:2313`); por defecto el proceso sigue saliendo con codigo 0 (retrocompatibilidad), y solo sale con 1 si se pasa `--strict` o `SYNC_DB_STRICT=1` (`dbSync.js:2323`).

Los scripts batch tambien capan el pool de conexiones Prisma por tenant (`TENANT_DB_CONNECTION_LIMIT`, default 5 solo en scripts) via `applyEnvConnectionParams` (`object-manager/src/services/dbUrl.js:53-58`), para que recorrer todos los tenants en paralelo no agote `max_connections` de la RDS compartida. La API en runtime NO aplica este cap salvo que ops lo setee explicitamente (el default de Prisma, `num_cpus + 8`, se mantiene).

## 5. Health check por tenant

### Object Manager: `GET /health`

`object-manager/src/index.js:475-498`. El status HTTP es SIEMPRE 200 mientras el proceso sirve (para que el health check de ALB/ECS no saque el target solo porque otro tenant esta migrando); el estado real viaja en el body como `schemaStatus`.

Con `?tenantId=` (o header `X-Tenant-ID`), el endpoint lee `tenant:{id}:schema:status` en Redis y devuelve `restarting`/`maintenance` SOLO si ese tenant especifico esta en pipeline. Sin `tenantId`, cae a la key global legada `schema:status` (mantenida por compatibilidad con clientes que aun no mandan el tenant). Fail-open: si Redis no responde, `schemaStatus` queda en `ready`.

En el boot del proceso, `index.js:145-161` maneja la transicion de la key GLOBAL: si estaba en `restarting`, le da un TTL corto de 15s (para que un health check sin tenant todavia vea "Applying Changes" un momento) y si no, la borra. Las keys POR TENANT nunca se tocan en el boot de un nodo (linea 142-144): un nodo que ya termino de bootear no debe acortar la ventana de otro que todavia esta reiniciando (restarts escalonados).

### Suite: `useConnectivityMonitor`

`suite/composables/useConnectivityMonitor.ts`. El composable hace polling periodico a `/health` (cada 10s en estado online, cada 5s durante un restart de schema detectado, `POLLING_INTERVAL`/`SCHEMA_RESTART_POLLING` en las lineas 21-22) y muestra el modal de "Applying Changes" cuando `schemaStatus === 'restarting'` (linea 135-142).

El fix de UPONE-1365 (`useConnectivityMonitor.ts:237-244`) agrega el tenant actual (`route.params.tenant_id`) como query param al construir el endpoint de health: `healthEndpoint += '?tenantId=' + encodeURIComponent(tenantId)`. Antes de este cambio, CUALQUIER usuario de CUALQUIER tenant veia el modal de "Applying Changes" mientras un admin editaba el schema de OTRO tenant, porque el endpoint sin tenant devolvia la key global. Con el scoping, el modal solo aparece para los usuarios del tenant cuyo schema realmente se esta migrando.

## 6. Flags, entorno y limitaciones

| Variable | Default | Efecto | Fuente |
|---|---|---|---|
| `SCHEMA_HOT_SWAP_ENABLED` | `false` | Activa el camino de swap sin restart. Apagado, el comportamiento es identico al legado | `schemaHotSwap.js:90-92` |
| `SCHEMA_HOT_SWAP_MAX_BEFORE_RESTART` | `10` | Swaps acumulados antes de forzar restart (escape-hatch del leak de modulos ESM) | `schemaHotSwap.js:79-82` |
| `SCHEMA_HOT_SWAP_DRAIN_MS` | `10000` | Espera antes de `stop()` del servidor Apollo reemplazado (deja drenar requests en vuelo) | `schemaHotSwap.js:84-87` |
| `SCHEMA_RECONCILE_POLL_MS` | `30000` | Intervalo del poll de reconciliacion (backstop de mensajes Pub/Sub perdidos) | `schemaChangeSubscriber.js:125-128` |
| `SCHEMA_RESTART_STAGGER_BASE_MS` / `_SPREAD_MS` | `60000` / `30000` | Delay del restart escalonado en el camino legado. Ambos en 0 = restart inmediato | `schemaChangeSubscriber.js:248-253` |
| `SCHEMA_STATUS_TTL_SECONDS` | `180` | TTL de la key de status por tenant en Redis; debe sobrevivir restart + stagger + boot de las replicas | `applyChanges.js:122-124` |
| `S3_SYNC_MAX_DELETE_FRACTION` | `0.5` | Fraccion maxima del catalogo local que `syncFromS3` puede borrar antes de rehusar (guard anti mass-delete) | `s3Sync.js:217` |
| `TENANT_DB_CONNECTION_LIMIT` / `TENANT_DB_POOL_TIMEOUT` | `5` / `30` (solo en scripts) | Cap de pool Prisma por tenant en flujos batch. No aplica a la API salvo opt-in explicito | `dbUrl.js:53-58` |
| `SYNC_DB_STRICT` / `--strict` | off | `sync:db` sale con codigo 1 si hubo fallas parciales por tenant | `dbSync.js:2323` |
| `ENABLE_REDIS_SYNC` / `REDIS_HOST` | (sin default) | Prerequisito para TODO lo de esta seccion: sin Redis configurado, ni el status por tenant, ni el hot-swap entre replicas, ni el gate funcionan (fail-open, camino legado intacto) | `schemaChangeSubscriber.js:27-29` |

### Limitaciones conocidas

- **No hay serializacion dura entre N replicas para el restart legado**: el stagger reduce la probabilidad de colision, pero no es un lock distribuido. El lock de Redis (`schemaLock.js`) SI serializa el camino de hot-swap, pero es fail-open (si Redis cae, el swap corre igual, sin lock).
- **El escape-hatch de hot-swap es un compromiso, no una solucion**: cada swap deja un modulo ESM huerfano en memoria (RSS crece por swap). Pasado el umbral configurado, el proceso sigue necesitando un restart real.
- **El hot-swap del subscriber nunca corre `db push`**: asume que el publisher ya migro la BD antes de publicar el mensaje. Si el mensaje llega antes de que la migracion del publisher haya terminado (no deberia pasar por el orden de pasos en `applyChanges`, pero depende de esa invariante), el subscriber podria generar contra un schema de BD desactualizado.
- **PostgreSQL advisory locks y colas de migracion cross-deploy siguen fuera de alcance** (documentado explicitamente como no provisto en `docs/reference/multi-tenant-architecture.md`), igual que la mutua exclusion entre corridas concurrentes de deploy.
- **La key global `schema:status` (sin tenant) es legado**: existe solo para clientes que todavia no mandan `tenantId` al health check. Se puede retirar cuando todos los suites desplegados envien el tenant.

## Ver tambien

- `specs/up1/core/object-manager.md`: arquitectura general del Object Manager, codegen y el resto del pipeline schema-driven.
- `specs/up1/core/programmatic-objects.md`: como se definen objetos y campos (base, extended, RecordType) que este hot-swap reconstruye en runtime.

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-07-16 | Documento inicial: hot-swap de schema (UPONE-1385) y aislamiento per-tenant (UPONE-1365), basado en `schemaHotSwap.js`, `schemaLock.js`, `tenantMaintenanceGate.js`, `tenantManager.js`, `schemaChangeSubscriber.js`, `applyChanges.js`, `generatePrismaSchema.js` (sync de campos extended) y el health check de suite |
