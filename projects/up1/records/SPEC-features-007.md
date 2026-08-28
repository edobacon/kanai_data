---
id: SPEC-features-007
project: up1
type: doc
module: features
tags:
  - up1
  - datalog
  - historial
  - auditoria
  - changelog-retirado
  - polymorphic-attribution
  - historyKey
  - recordtype-alias
---

# DataLog: historial unificado de auditoria en uP1

## 1. Que es DataLog

DataLog es una bitacora generica que registra cada operacion de escritura (create, update, delete y variantes bulk) sobre cualquier objeto del core. Vive como el objeto de negocio `core_DataLog` (`object-manager/objects/core/core_DataLog.json`), con los campos principales:

| Campo | Uso |
|-------|-----|
| `objectName` | Objeto auditado (siempre el nombre BASE canonico, ver seccion 6) |
| `recordId` | Id del registro afectado |
| `action` | `CREATE`, `UPDATE`, `DELETE`, `BULK_CREATE`, `BULK_UPDATE`, `BULK_DELETE`, `IMPORT` |
| `changes` | Diff `{ campo: { old, new } }` en update, snapshot completo en create/delete, `{ patch, count, affectedIds }` en bulk |
| `metadata` | Datos adicionales de atribucion (`parentObject`, `parentId`, `childRecordType`) |
| `parentObject` / `parentId` | Owner polimorfico cuando el registro auditado es un hijo (ver seccion 4) |
| `childRecordType` | RecordType concreto que origino la mutacion, cuando aplica el alias (ver seccion 6) |
| `historyKey` | Clave que agrupa el historial padre + hijos (ver seccion 5) |
| `userId` | Actor de la mutacion (`core_User.id`, coercionado a Int) |

DataLog esta ON por defecto para cualquier objeto resoluble. El opt-out es explicito: `metadata.enableDataLog === false` en el JSON del objeto desactiva la auditoria (`isDataLogEnabled`, `object-manager/src/events/decorators/withDataLog.js:92-109`).

> **Nota (UPONE-1503):** "objeto resoluble" dependia de que `resolveObjectFile` (`withDataLog.js:71-82`) encontrara el JSON del objeto, y esa funcion no buscaba en `objects/core/`. Como un objeto sin archivo resoluble cae a `enabled = false`, los objetos `core_*` (incluido todo el dominio RBAC: `core_Role`, `core_RoleCapability`, `core_RoleAssignment`) quedaban sin auditoria en silencio, mientras que un objeto de `objects/up1/**` (que si estaba en la lista) si auditaba. `resolveObjectFile` ahora agrega `objects/core/` a la busqueda (con fallback recursivo case-insensitive via `findObjectFile`, igual que `objects/up1/`), asi que la auditoria de objetos core esta activa. Ver `BUG-object-manager-011` para el detalle de los tres defectos de escritura que aparecieron al activarla.

> **Caveat sobre los action bulk (actualizado 2026-08-17, UPONE-1503)**: `BULK_CREATE` e `IMPORT` siguen sin producirse por el camino generico: `createBulkInstances` delega por fila al `createInstance` envuelto (genera N entradas `CREATE` individuales, no un `BULK_CREATE`), e `importInstances` hace lo mismo (`CREATE` por fila). `BULK_DELETE` si cambio: antes de UPONE-1503, `deleteBulkInstances` estaba envuelto solo en `withObjectAuth`, no en `withDataLog`, y no auditaba nada en `core_DataLog` para NINGUN objeto de la plataforma, incluso siendo el camino real de borrado desde el frontend (cualquier `RecordList` con `deleteWarning` de confirmacion tipeada llama a `deleteBulkInstances` con `ids: [id]`, incluso para un solo registro). Ahora `deleteBulkInstances` esta envuelto en `withDataLog('bulkDelete', ...)` (`object-manager/src/graphql/resolvers/instance.resolver.js`). Un bulk de un solo id sigue degradando a `DELETE` normal (mismo patron que `bulkUpdate`, ver seccion 3). El borrado en cascada sigue auditandose per-nodo aparte, via `writeDeleteDataLog` del motor (ver seccion 9), coordinado con este wrapper para no duplicar el nodo raiz.

## 2. Reemplazo de ChangeLog (retiro del mecanismo viejo)

Antes de UPONE-1380, la auditoria era **event-driven**: `Mutation -> withEventPublish -> Redis Pub/Sub -> flow n8n audit-capture.json -> recordAuditEvent -> filas en la tabla changeLog`. Este mecanismo fue **retirado**: el typedef `ChangeLog` y el flow `audit-capture` ya no forman parte del camino de auditoria (confirmado en `object-manager/src/graphql/resolvers/instance.resolver.js:3729`, que documenta el retiro en comentarios).

Hoy la auditoria es **sincrona**, dentro del propio resolver de la mutacion: al terminar con exito, se escribe directo a `core_DataLog`. No hay salto a Redis Pub/Sub ni a n8n en el camino de auditoria (si bien `withEventPublish` sigue existiendo para otros fines de eventos, ver `features/flow-engine.md`).

Un grep de `ChangeLog` en `object-manager` solo devuelve:
- Schemas Prisma generados (stale, no se regeneran hasta el proximo codegen completo).
- Snapshots historicos de datos de prueba.
- Comentarios y tests que documentan el retiro (`object-manager/tests/integration/dataLogAttribution.integration.test.js:215-236` verifica explicitamente 0 filas en `ChangeLog` tras una mutacion).

No queda tabla `changeLog` activa en el flujo de auditoria actual.

### core_SchemaAuditLog: el segundo trail (distinto de DataLog)

`core_DataLog` no es el unico registro de auditoria sincrono. Existe en paralelo `core_SchemaAuditLog`, escrito por `auditService.js` (`logSchemaChange` para cambios de esquema, `logInstanceOperation` para operaciones de instancia). En `instance.resolver.js` hay 12 call sites de `logInstanceOperation`, asi que corre junto a `withDataLog` en la mayoria de las mutaciones. Ambos son visibles en la misma pantalla de up1-manager (`config/layouts/objectdefinition-view.json`), en dos tabs distintos:

| Tab | Layout | Objeto | Que muestra |
|-----|--------|--------|-------------|
| **Logs** | `logsList` | `core_SchemaAuditLog` | Operaciones de instancia + cambios de esquema (forense, incluye el `mod-role-sync-delete` de RBAC) |
| **Change History** | `dataLogList` | `DataLog` | Historial de negocio con atribucion polimorfica y `historyKey` |

Al decir "la auditoria se consolido en DataLog" se habla del retiro del mecanismo **event-driven** (ChangeLog); `core_SchemaAuditLog` es un trail sincrono separado que sigue activo. (Nota: el tab "Change History" declara `objectName: "DataLog"`, alias que deberia migrar a `core_DataLog` tras la migracion de UPONE-1366; ver follow-ups de codigo.)

## 3. Cadena de decorators

```
withEventPublish -> withObjectAuth -> withDataLog -> resolver
```

El decorator `withDataLog` vive en `object-manager/src/events/decorators/withDataLog.js` (cabecera JSDoc, lineas 1 a 33). Envuelve el resolver de la operacion (`create`, `update`, `delete`, `bulkCreate`, `bulkUpdate`, `bulkDelete`, `import`):

- Solo escribe si la operacion tuvo exito. Si el resolver lanza, el error se propaga y no se registra nada.
- En update, pre-fetchea el registro previo (`findUnique`) antes de ejecutar el resolver, para poder computar el diff despues.
- En create/delete, guarda un snapshot completo del registro.
- En bulk sobre varios ids, un unico registro con `{ patch, count, affectedIds }`; si el bulk trae un solo id, se degrada a UPDATE normal con diff (evita registrar como bulk algo que en la practica es una edicion de fila unica).
- Nunca se audita a si mismo (`core_DataLog` nunca genera una entrada de `core_DataLog`).

> **Nota (UPONE-1503):** `deleteBulkInstances` nunca lanza por un id bloqueado por Restrict o inexistente: los reporta en `errors[]` y devuelve 200 con `deletedIds` (solo lo que REALMENTE se borro). Antes del fix, `withDataLog` para `bulkDelete` usaba `args.ids` tal cual (igual que `bulkCreate`/`bulkUpdate`, donde `args.ids` si coincide con lo procesado), asi que un delete solicitado y bloqueado por Restrict quedaba auditado como si se hubiera borrado. El chequeo ahora cruza `args.ids` contra `result.deletedIds` (`withDataLog.js:320-324`) y solo registra los ids que de verdad se borraron; si ninguno se borro, no escribe nada.

Para resolvers que reemplazan la cadena y hacen writes propios con Prisma directo (ver seccion 7), existe el helper reusable `recordMutationDataLog`, que hace el mismo trabajo (build de la entrada, atribucion, historyKey, escritura) fuera del wrapper.

## 4. Atribucion polimorfica (hijo hacia padre)

Cuando el objeto mutado es un hijo polimorfico (ejemplo: una `CurricularSection` que pertenece a un `Activity`), la entrada quedaria en el hijo y quien abre la ficha del padre no la veria
