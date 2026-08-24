---
id: SPEC-features-007
project: up1
type: spec
module: features
category: features
ticket: UPONE-1380 (1281/1282); migracion a core_DataLog en UPONE-1366; interaccion con soft-delete/cascada en UPONE-1382; UPONE-1503 (auditoria de objetos core), UPONE-1539 (batch planEntry)
tags: [up1, datalog, historial, auditoria, changelog-retirado, polymorphic-attribution, historyKey, recordtype-alias]
fecha: 2026-08-17
sources:
  - object-manager/src/events/decorators/withDataLog.js (resolveObjectFile, isDataLogEnabled)
  - object-manager/src/graphql/resolvers/instance.resolver.js (deleteBulkInstances envuelto en withDataLog('bulkDelete', ...))
  - mods/curriculum-design/logic/planEntryDataLog.js (recordMutationDataLog manual para el batch tx directo)
  - object-manager/objects/core/core_DataLog.json (definicion del objeto)
  - object-manager/src/events/decorators/withDataLog.js (decorator, gate, diff, historyKey)
  - object-manager/src/events/decorators/polymorphicAttribution.js (reverse-index, 3 caminos de atribucion)
  - object-manager/src/graphql/resolvers/instance.resolver.js (cadena de decorators, retiro de ChangeLog)
  - object-manager/tests/integration/dataLogAttribution.integration.test.js
  - mods/curriculum-design/logic/polymorphicUpdate.resolver.js (override que llama recordMutationDataLog manualmente)
  - mods/up1-manager/config/layouts/objectdefinition-view.json (visor admin)
  - mods/curriculum-design/config/layouts/default_Activity_view.json, default_Curriculum_view.json, default_AcademicProgram_view.json, default_Offering_syllabus_view.json (visor por-registro)
  - mods/curriculum-design/modsComposables/useDataLogOwnerName.ts
  - mods/uengagement-up1/config/layouts/retention_dataLogEntry_view.json (reuso generico por retention/uengagement)
  - object-manager/docs/features/datalog.md (espejo interno)
  - core/datalog-audit-recordtype-alias-gap.md (gaps documentados en el KB)
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

Cuando el objeto mutado es un hijo polimorfico (ejemplo: una `CurricularSection` que pertenece a un `Activity`), la entrada quedaria en el hijo y quien abre la ficha del padre no la veria. `object-manager/src/events/decorators/polymorphicAttribution.js` resuelve esto con un reverse-index generico (`buildPolymorphicReverseIndex`, lineas 45 a 126), construido a partir de `metadata.polymorphicChildren` y `metadata.polymorphicChildrenDerived` de todos los objetos, sin hardcodear el mapeo padre/hijo.

Tres caminos de resolucion:

1. **Owner directo**: el hijo trae `ownerType`/`ownerId` en su snapshot. El padre viaja en el propio dato mutado, sin query extra, y sigue funcionando aunque el padre ya no exista (por ejemplo tras un borrado en cascada).
2. **Recursivo**: hijo anidado sin `ownerType`/`ownerId` propio (`recursiveBy`). Se sube la cadena de self-reference hasta el owner raiz, con un tope de 20 niveles.
3. **Derivado**: hijo sin `ownerType`/`ownerId` (`polymorphicChildrenDerived`, ejemplo `CurricularLink`). Se resuelve via la seccion referenciada y de ahi a su owner.

Owner directo tiene prioridad sobre derivado si un mismo hijo apareciera declarado en ambos caminos.

## 5. historyKey

`historyKey` es la clave que agrupa el historial unificado de un padre junto con el de todos sus hijos, para que un solo filtro `EQUALS` traiga todo:

- Si el registro auditado tiene atribucion a un padre: `{parentObject}:{parentId}`.
- Si es un cambio directo sobre el propio objeto: `{objectName}:{recordId}`.

Esta clave es la que consumen los visores de historial (seccion 8).

## 6. Alias RecordType

Las ediciones tipadas de la UI usan mutaciones como `updateCurriculumWithRecordType`, que internamente llaman `updateInstance` con un `objectType` en formato alias: `rt__<RecordType>__<base>` (ejemplo: `rt__Plan__curriculum`).

`resolveBaseObjectType` (`withDataLog.js:110-148`) normaliza ese alias al objeto BASE canonico antes de:
- Evaluar el gate `enableDataLog`.
- Resolver el modelo Prisma del pre-fetch.
- Fijar el `objectName` y el `historyKey` auditados.

Sin esta normalizacion, el gate buscaria un archivo `rt__plan__curriculum.json` inexistente en `Base/` y la mutacion quedaria sin auditar. El RecordType concreto no se pierde: queda preservado en `childRecordType`.

## 7. Invariante de override (resolvers que reemplazan la cadena)

Un resolver que **reemplaza** `createInstance`/`updateInstance`/`deleteInstance` y hace sus propios writes con Prisma directo se salta la cadena de decorators, y por lo tanto no pasa por `withDataLog`.

Ejemplo real: `mods/curriculum-design/logic/polymorphicUpdate.resolver.js` (lineas 172 a 197 y 487 a 497) implementa el update/delete propio para `rt__*__curricularsection`. Este resolver **debe** llamar a `recordMutationDataLog` manualmente despues de sus writes, o la mutacion queda sin auditar. Es una invariante no obvia: nada en la cadena avisa si falta la llamada, la unica senal es la ausencia de la entrada en `core_DataLog`.

Si el resolver delega al generico (por ejemplo, un caso como `sectionValidation`), la auditoria si ocurre, porque el generico esta envuelto por `withDataLog` normalmente.

### Caso verificado: batch de planEntry (UPONE-1539)

`createPlanEntriesBatch`/`deletePlanEntriesBatch` (`mods/curriculum-design/logic/planEntry-batch.resolver.js`) persisten con `tx.planEntry.create|delete` directo dentro de una transaccion (ver `decisions/DECISION-032`), sin pasar por el decorator del core. `mods/curriculum-design/logic/planEntryDataLog.js` cierra la divergencia llamando a `recordMutationDataLog` por fila, despues del commit, con el mismo patron que `polymorphicUpdate.resolver.js`. Dos detalles de contrato que el helper documenta explicitamente: `args` es obligatorio (la atribucion polimorfica en create lee `args.data`, y el `recordId` de delete sale de `args.id`, no de `previous.id`), y la llamada va envuelta en try/catch con warn por fila para que la auditoria nunca rompa la mutacion (best-effort, igual que el path generico). Ver `BUG-curriculum-design-017` (sintoma original) y `decisions/DECISION-032` (por que el batch escribe directo via `tx` en primer lugar).

## 8. Los dos visores reales

DataLog alimenta dos vistas distintas en la UI:

**Visor admin (up1-manager)**: tab "Change History" en `mods/up1-manager/config/layouts/objectdefinition-view.json`, con filtro `objectName EQUALS {{record.name}}`. Pensado para administradores de plataforma que revisan el historial completo de un tipo de objeto.

**Visor por-registro (curriculum-design)**: tab "Historial" con `requiredCapability: core_datalog:view`, presente en:
- `default_Activity_view.json:426-446`
- `default_Curriculum_view.json:53`
- `default_AcademicProgram_view.json:31`
- `default_Offering_syllabus_view.json:38`

El filtro es `historyKey EQUALS "Activity:{{parentId}}"` (o el equivalente segun el objeto padre de la vista). El drill-in de nombres de usuario en las entradas usa `mods/curriculum-design/modsComposables/useDataLogOwnerName.ts`.

## 9. Interaccion con cascade delete

Cuando un borrado dispara el motor de cascada (`executeDeletePlan`, ver `features/delete-cascade.md`), este escribe una entrada `DELETE` por cada nodo del subarbol borrado (padre + hijos), con su propio snapshot. Para evitar que `withDataLog` duplique el registro del padre, el motor marca `context._deleteHandledByMotor` antes de retornar; el decorator revisa esa marca y omite su propio registro cuando esta presente.

### Interaccion con soft-delete (short-circuit)

El soft-delete global (ver `features/soft-delete.md`) corre en `deleteInstance`/`deleteBulkInstances` **antes** que el motor de cascada: si el objeto declara `metadata.softDelete`, baja la bandera y retorna, sin cascadear. Consecuencia para DataLog:

- Como en ese camino no se setea `context._deleteHandledByMotor`, el wrapper `withDataLog('delete', ...)` **si** registra el `DELETE` del padre (con el snapshot pre-fetch).
- Pero los **hijos no se tocan** (no hay cascada): no reciben entradas `DELETE`, y sus futuras entradas seguiran resolviendo `historyKey` hacia un padre que ahora esta inactivo. El historial del padre soft-deleteado no arrastra a los hijos, a diferencia del hard-delete en cascada.

## 10. Reuso generico por otros mods (retention/uengagement)

El objeto `core_DataLog` no es exclusivo de curriculum-design. `mods/uengagement-up1` reusa el mismo mecanismo de core como trail de auditoria generico para sus propios objetos: el layout [`retention_dataLogEntry_view.json`](../../../up1/mods/uengagement-up1/config/layouts/retention_dataLogEntry_view.json) declara `objectName: "core_DataLog"` y muestra `createdAt`/`action`/`objectName`/`changes` en modo detalle, gateado por los roles `admin-ret`/`gestor-ret` del tenant UPU. No hay codigo propio de auditoria en el mod: es el mismo `core_DataLog` poblado por la cadena de decorators de la seccion 3, consumido con un layout y RBAC distintos. Confirma que DataLog es una capacidad de core reusable por cualquier mod, no algo acoplado a curriculum-design.

## 11. Referencias

- Doc interno espejo: `object-manager/docs/features/datalog.md`.
- Gaps ya documentados en el KB: `core/datalog-audit-recordtype-alias-gap.md`.
- Ticket de origen: UPONE-1380 (atribucion polimorfica y alias RecordType), con relacion a UPONE-1281/1282.
- Cascade delete: `features/delete-cascade.md`.
- Sistema de eventos (Redis Pub/Sub, n8n): `features/flow-engine.md`, para contrastar con el mecanismo retirado de la seccion 2.

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-08-03 | Version previa: retiro de ChangeLog, atribucion polimorfica, historyKey, alias RecordType, invariante de override, interaccion con cascada/soft-delete |
| 2026-08-17 | UPONE-1503: `resolveObjectFile` agrega `objects/core/` a la busqueda, la auditoria deja de estar deshabilitada de facto sobre objetos core (RBAC incluido); `deleteBulkInstances` pasa a estar envuelto en `withDataLog('bulkDelete', ...)` (antes no auditaba nada, siendo el camino real de borrado desde la UI); un delete bloqueado por Restrict deja de auditarse como exitoso (cruce contra `result.deletedIds`). UPONE-1539: seccion 7, caso verificado del batch de `planEntry` que restituye DataLog a mano via `planEntryDataLog.js` (ver `decisions/DECISION-032`) |
