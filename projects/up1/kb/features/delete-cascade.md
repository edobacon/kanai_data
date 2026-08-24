---
id: SPEC-features-002
project: up1
type: spec
module: features
category: features
tags: [up1, delete, cascade, restrict, deleteImpactPreview, motor, curriculum-design]
fecha: 2026-08-17
ticket: UPONE-1382, UPONE-1376 (baseRelation.onDelete), UPONE-1613, UPONE-1557, UPONE-1600
sources:
  - layout/src/utils/graphqlErrors.ts (resolveBusinessErrorCode, isBusinessBulkDeleteError)
  - layout/src/layouts/RecordList/RecordList.vue (handleCriticalDeleteConfirm: ruteo toast vs ErrorState)
  - object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js
  - object-manager/src/graphql/resolvers/instance.resolver.js
  - object-manager/src/graphql/typeDefs/static.js
  - object-manager/src/events/decorators/withDataLog.js
  - object-manager/src/services/tenantManager.js (soft-delete kill-switch)
  - object-manager/src/services/codegen/generatePrismaSchema.js (baseRelation.onDelete)
  - object-manager/docs/features/delete-cascade.md (doc interno espejo)
  - layout/src/components/organisms/Modal/CriticalWarningModal.vue
  - layout/src/layouts/RecordList/RecordList.vue
  - mods/curriculum-design/objects/AcademicProgram.json
  - mods/curriculum-design/objects/Curriculum.json
  - mods/curriculum-design/objects/activity.json
  - mods/curriculum-design/objects/Offering.json
  - mods/curriculum-design/objects/CurricularSection.json
  - mods/curriculum-design/config/layouts/default_AcademicProgram_list.json
  - mods/curriculum-design/config/layouts/default_Curriculum_list.json
  - mods/curriculum-design/config/layouts/default_Activity_list.json
  - mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue
---
# Motor de Delete en Cascada de uP1

## Indice

1. [Que es y por que](#1-que-es-y-por-que)
2. [Contrato DeleteImpactPlan](#2-contrato-deleteimpactplan)
3. [Deteccion de Restrict](#3-deteccion-de-restrict)
4. [Atomicidad de la ejecucion](#4-atomicidad-de-la-ejecucion)
5. [Auditoria: DataLog por nodo](#5-auditoria-datalog-por-nodo)
6. [Query deleteImpactPreview](#6-query-deleteimpactpreview)
7. [Campo onDelete: aclaracion](#7-campo-ondelete-aclaracion)
8. [Integracion en UI: CriticalWarningModal](#8-integracion-en-ui-criticalwarningmodal)
9. [Como declararlo en un mod](#9-como-declararlo-en-un-mod)

---

## 1. Que es y por que

Motor reusable que calcula y ejecuta el impacto de borrar un registro con hijos declarados en su metadata (`polymorphicChildren`, `directChildren`, `polymorphicChildrenDerived`). Vive en:

```
object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js
```

Nace del ticket UPONE-1382 para evitar dos problemas del delete generico: borrados que dejan huerfanos (hijos sin padre) y borrados que rompen referencias externas sin avisar.

### Gate de minimo blast radius

El motor no se activa para todo objeto. Solo corre si el objeto declara hijos en su JSON:

```javascript
// deleteImpactPlan.js:1501-1515
function objectDeclaresChildren(objectDef) {
  // true si polymorphicChildren, directChildren o polymorphicChildrenDerived existen
}
```

Si el objeto **no** declara hijos, `cascadeDeleteIfApplicable` devuelve `{ applied: false }` y el path generico de delete sigue intacto, sin overhead ni cambio de comportamiento.

### Gate previo: soft-delete tiene precedencia

`objectDeclaresChildren` **no** es el primer gate. Desde el soft-delete global (ver `features/soft-delete.md`), `deleteInstance`/`deleteBulkInstances` evaluan primero si el objeto declara `metadata.softDelete`: si es asi, bajan la bandera booleana y retornan **antes** de llamar a `cascadeDeleteIfApplicable`. Es decir, un objeto con soft-delete nunca entra a este motor (no hay hard-delete, no hay recorrido del subarbol, no hay deteccion de Restrict). El kill-switch `SOFT_DELETE_GLOBAL_FILTER=false` (`tenantManager.js`, `isSoftDeleteEnabled`) desactiva ese gate previo y devuelve el control al motor de cascada. El doc interno espejo (`object-manager/docs/features/delete-cascade.md`) ya refleja esta precedencia.

### Wiring

| Resolver | Ubicacion | Rol |
|----------|-----------|-----|
| `deleteInstance` | instance.resolver.js (soft-delete `~3871-3903`, cascada `~3905-3928`) | Delete de un solo registro |
| `deleteBulkInstances` | instance.resolver.js (soft-delete `~5532-5552`, cascada `~5653-5691`) | Delete masivo |

> Las lineas son aproximadas: `instance.resolver.js` cambia seguido. La rama de soft-delete quedo intercalada entre la firma del resolver y el bloque de cascada.

### El path generico sin hijos: `validateBulkDelete` (UPONE-1557)

Cuando el objeto **no** declara hijos (el gate de arriba devuelve `{ applied: false }`), el borrado no queda sin validacion: `deleteBulkInstances` valida las referencias entrantes con `validateBulkDelete` (`object-manager/src/services/referenceValidationService.js`) y, si no hay ninguna, borra la base y sus capas de proyeccion en el loop. `validateBulkDelete` detecta referencias por dos vias: la convencion de FK `<base>Id` sobre los modelos Prisma y los custom fields `fieldType: 'reference'` de `core_FieldDefinition`. Si encuentra una referencia real, bloquea con `CONSTRAINT_VIOLATION` y no borra ese id.

**Exclusion de la proyeccion RT propia (UPONE-1557).** Las tablas de proyeccion del propio objeto (`rt__<RT>__<base>`, cuya PRIMARY KEY es una FK a `<base>.id`) NO son referencias externas: son capas del mismo registro logico, y el loop de borrado ya las limpia antes de la base (igual que `deleteInstance`). Antes, el bulk las contaba como referencia entrante por la convencion `<base>Id` y bloqueaba con un false-RESTRICT sin referencia real (disparador: una limpieza en bloque de `InstructorAvailability`). Ahora `validateBulkDelete` las excluye del gate, resolviendolas por introspeccion de la PK/FK real (`information_schema`, case-insensitive), no por un patron de string `rt__`. Con esto el borrado en bloque queda **a paridad con el borrado individual**.

La exclusion es quirurgica y se ancla en `PK == FK`: una tabla `rt__` de OTRO objeto que referencia al base por una columna que NO es su PK (p.ej. `rt__InstructorAvailability__availability.orgUnitId` hacia `OrgUnit.id`) NO se excluye y sigue bloqueando, igual que una FK externa real o un custom field `reference`. El scan es fail-safe: ante un error de introspeccion devuelve un set vacio (no excluye nada, mantiene el bloqueo). Doc interno espejo: `object-manager/docs/features/delete-cascade.md`.

> **Cierre verificado (2026-08-17):** los dos analisis de `kb/sp8/` sobre este dominio quedaron resueltos por esta ventana. `BUG-core-bulkdelete-rt-projection-false-restrict.md` (el false-RESTRICT descripto arriba) se cerro con UPONE-1557, Opcion A del propio analisis: exclusion quirurgica en `discoverFKRelationshipsFromPrisma`, verificado contra BD real (`hard-delete-cascade.integration.test.js`). `BUG-core-recordlist-harddelete-block-renders-as-load-error.md` (un bloqueo LEGITIMO que se renderizaba como `ErrorState` full-view en vez de un aviso accionable) se cerro con UPONE-1557/1600, Opcion A1 del propio analisis: ver seccion 8 mas abajo para el detalle del ruteo toast vs `ErrorState`.

### Skip del chequeo FK legacy para objetos soft-delete en bulk (UPONE-1613)

`deleteBulkInstances` corria `validateBulkDelete` de forma incondicional, incluso para objetos con `metadata.softDelete`. Un soft-delete no borra ninguna fila (baja una bandera), asi que ninguna FK entrante se rompe: el chequeo legacy solo podia bloquear un soft-delete legitimo por una convencion de nombre que no conoce `onSoftDelete`. El propio soft-delete ya valida restrict/cascada-a-no-soft/detach-derivado antes, cuando el objeto declara hijos (`executeSoftDeletePlan`). Ahora `validateBulkDelete` se saltea cuando el objeto tiene un campo de soft-delete (`bulkSoftField`, `instance.resolver.js:6022-6050`), mismo criterio que ya aplicaba `deleteInstance` (singular) con su `return` temprano en la rama soft-delete.

---

## 2. Contrato DeleteImpactPlan

```javascript
buildDeleteImpactPlan({ prisma, tenant, objectType, requestedIds, options })
```

Funcion **read-only** (deleteImpactPlan.js:946-1230): no muta la base de datos, solo calcula el plan.

### Campos del plan

| Campo | Descripcion |
|-------|-------------|
| `status` | `'cascade'` o `'restricted'` |
| `nodes` | Nodos del arbol de impacto (padre + hijos recorridos) |
| `edges` | Relaciones padre-hijo entre nodos |
| `restrictions` | Referencias externas que bloquean el borrado (ver seccion 3) |
| `deleteOrder` | Orden de borrado por capas, hijos antes que padres |
| `summary` | Resumen agregado: `byObjectType`, `byRecordType`, `cascadeNodes` (deleteImpactPlan.js:1171-1192) |
| `warnings` | Advertencias no bloqueantes |

### Recorrido del arbol (walk)

El motor no camina los tres tipos en secuencia. El loop principal (BFS acotado, `deleteImpactPlan.js`) recorre **`polymorphicChildren` y `directChildren` juntos en cada iteracion**; recien cuando ese loop termina corre **una sola pasada** de `polymorphicChildrenDerived`. Es decir, los derivados siempre se resuelven **al final**, no en segundo lugar:

1. Loop BFS: `polymorphicChildren` (`walkPolymorphicChildren`) + `directChildren` (`walkDirectChildren`) por iteracion, bajando por `recursiveBy`.
2. Al cerrar el loop: `polymorphicChildrenDerived` (`walkPolymorphicDerived`), una vez.

### Metadata por nodo frontier, no por objeto raiz (UPONE-1613)

Cada iteracion del loop lee la metadata de **cada tipo distinto presente en el frontier de esa vuelta**, no la del `objectType` raiz (`deleteImpactPlan.js:1083-1098`: `frontierTypes` deduplica los tipos del frontier actual y arma `polyEntries`/`directEntries` leyendo `readBlock(frontierType, ...)` por cada uno). Antes de este fix, cada iteracion releia siempre `readBlock(objectType, ...)` con el `objectType` de la raiz. Un walk heterogeneo de 3+ niveles (ej. `Scenario -> ScenarioSection -> ScenarioSectionAssignment`) llega a la segunda iteracion con un frontier de nietos cuyo tipo NO es la raiz: sus propios `directChildren`/`polymorphicChildren` nunca se leian, asi que esos nietos jamas se descubrian. Consecuencia colateral: `detectRestrictions` podia terminar culpando al padre equivocado, porque el subarbol que calculaba estaba incompleto. Descubierto y corregido validando UPONE-1605 (delete de Scenario) contra datos reales de UPU. Ver `BUG-object-manager-012`.

---

## 3. Deteccion de Restrict

```javascript
detectRestrictions(...)  // deleteImpactPlan.js:568-688
```

Busca referencias entrantes hacia el subarbol que vienen **desde fuera** de el. Fuentes revisadas:

- FK por convencion (naming estandar de campo)
- Custom field de `core_FieldDefinition` con `fieldType: 'reference'`
- Relaciones polimorficas
- Cadenas de version (`previousVersionId`)

### Deteccion generica, no hardcodeada

La deteccion recorre metadata por convencion; no hay una lista fija de objetos o campos escrita a mano. Cualquier objeto nuevo que declare una referencia queda cubierto automaticamente.

### Mensajes con nombres semanticos

Los mensajes de restriccion usan `label`/`labelPlural` de `core_ObjectDefinition`, nunca ids tecnicos. Ejemplo real (deleteImpactPlan.js:645-647):

```
«${name}» esta en uso por N Curriculos. Resuelvelo antes de eliminar.
```

### Cadena de version (BR-VER-001)

Si existe un sucesor cuyo `previousVersionId` apunta al nodo que se quiere borrar, el borrado se bloquea (deleteImpactPlan.js:652-655).

---

## 4. Atomicidad de la ejecucion

```javascript
executeDeletePlan({ prisma, tenant, plan, context })  // deleteImpactPlan.js:1279-1400
```

### Si el plan esta restringido

No toca la base de datos. Devuelve (deleteImpactPlan.js:1288-1301):

```javascript
{ deletedIds: [], executed: false, errors: [...] }
```

### Si el plan es cascada

Un unico `prisma.$transaction` borra capa por capa segun `deleteOrder` (deleteImpactPlan.js:1342-1363). Cualquier fallo en cualquier capa produce rollback completo: no quedan borrados parciales.

### Diferencia de contrato entre resolvers

| Resolver | Ante restriccion |
|----------|-------------------|
| `deleteInstance` | Lanza `Error` con el mensaje semantico (instance.resolver.js:3852-3860) |
| `deleteBulkInstances` | Devuelve `errors[]` con `type: 'DELETE_RESTRICTED'`, sin lanzar (instance.resolver.js:5580-5592) |

Esta diferencia es intencional: el bulk procesa multiples ids y no puede abortar todo el request por uno restringido.

---

## 5. Auditoria: DataLog por nodo

`executeDeletePlan` escribe una entrada `DELETE` en `core_DataLog` por **cada nodo** del `deleteOrder`, no solo por el registro padre. Lo hace via:

```javascript
writeDeleteDataLog(...)  // deleteImpactPlan.js:1424-1467
```

Es best-effort y ocurre post-commit (no forma parte de la transaccion de borrado).

### Coordinacion con el decorator generico

El caller marca `context._deleteHandledByMotor = true` (instance.resolver.js:3862) para que el decorator generico `withDataLog` no vuelva a loguear el nodo raiz (withDataLog.js:388-390), evitando entradas duplicadas.

Ver `features/datalog.md` para el detalle del sistema de auditoria.

---

## 6. Query deleteImpactPreview

| Elemento | Ubicacion |
|----------|-----------|
| TypeDef | object-manager/src/graphql/typeDefs/static.js:1035 |
| Resolver | instance.resolver.js:1468 |

> Las lineas son aproximadas: `instance.resolver.js` cambia seguido (ver nota de la seccion 1).

### Unica excepcion al gate de minimo blast radius

`deleteImpactPreview` corre el motor para **cualquier** objeto, declare hijos o no. Razon: un objeto sin hijos declarados igual puede tener referencias externas entrantes que ameriten un Restrict.

> **Ojo con soft-delete**: `deleteImpactPreview` llama a `buildDeleteImpactPlan` sin contemplar el gate de soft-delete. Para un objeto con `metadata.softDelete`, el preview puede mostrar un plan de cascada aunque el borrado real vaya a hacer soft-delete (baja de bandera, sin cascada). El preview refleja lo que haria el hard-delete, no lo que efectivamente hara `deleteInstance` en un objeto con soft-delete.

### Resolucion del alias RT antes del motor

`deleteImpactPreview` resuelve el `objectType` de entrada con `resolveRecordTypeToBaseObject({ prisma, objectType })` (`instance.resolver.js:1469`) antes de invocar `buildDeleteImpactPlan`. Si el preview se pide con el nombre tecnico de un RecordType (`rt__<RT>__<base>`, el caso de un list layout armado por el RT), el motor igual calcula el arbol de impacto sobre el objeto BASE, en paridad con lo que hace el borrado real (ver seccion 9, "Borrado por RecordType").

### Permisos

Gateado por la misma capability que el borrado (`objectname:delete`). No introduce un permiso nuevo.

### Ejemplo de contrato

```graphql
query {
  deleteImpactPreview(objectType: "Activity", ids: ["A1"]) {
    status
    totalCount
    requestedCount
    byObjectType
    byRecordType
    restrictions {
      nodeKey
      referencingObject
      referencingField
      reason
      message
    }
    warnings
  }
}
```

---

## 7. Campo onDelete: aclaracion

El campo `onDelete` de un objeto JSON es **independiente** del motor de cascada. La deteccion de Restrict se basa en si existe una fila que referencia al nodo desde fuera del subarbol, no en el valor de `onDelete`.

`onDelete` solo controla el backstop de constraint en el `schema.prisma` generado por codegen (nivel de base de datos). Ambos mecanismos son complementarios: el motor calcula y ejecuta el impacto a nivel de aplicacion; `onDelete` es la ultima linea de defensa a nivel de constraint SQL si algo se salta el motor.

### `baseRelation.onDelete` en Extended JSON (opt-in, UPONE-1376)

Los modelos `ext__<CLIENT>__<objectType>` (campos custom de un objeto base) tienen su propia FK de vuelta al registro base, independiente de la deteccion del motor de cascada. Por default esa FK **no** cascadea (comportamiento historico de los modelos `ext__` existentes). Un Extended JSON puede optar por cascade explicito con:

```json
{
  "baseRelation": { "onDelete": "Cascade" }
}
```

`generatePrismaSchema.js:607-608` lee `extSchema?.baseRelation?.onDelete` y lo agrega al `@relation(..., onDelete: Cascade)` de la FK generada hacia el modelo base. Cualquier valor de Prisma es valido (`Cascade`, `SetNull`, `Restrict`, etc.), no solo `Cascade`. Esto restituye, de forma declarativa, comportamiento que antes se escribia a mano en Prisma crudo (ejemplo real: `ext__uplanner__report` tenia `onDelete: Cascade` antes de UPONE-1396 y hoy lo declara asi en su JSON). Requiere `npm run codegen` para tomar efecto.

---

## 8. Integracion en UI: CriticalWarningModal

Componente: `layout/src/components/organisms/Modal/CriticalWarningModal.vue`

Muestra el conteo dinamico de cascada y bloquea el borrado si hay Restrict. Al abrirse dispara `deleteImpactPreview`.

### Estados del modal

| Estado | Comportamiento |
|--------|-----------------|
| `loading` | Texto "Calculando el impacto..." |
| `cascade` | Lista el desglose de hijos por tipo, habilita el boton de confirmar |
| `restricted` | Lista las referencias que bloquean, deshabilita el boton via `isConfirmDisabled` cuando `isRestricted` |

### Convencion del boton de confirmacion

El nombre del registro va en la **pregunta** del cuerpo del modal ("Estas seguro de que deseas eliminar «N»?"), nunca en el boton. El boton mantiene un label fijo y corto ("Eliminar"), para que nombres largos envuelvan en el cuerpo sin desbordar el boton.

### Referencias en codigo

```
layout/src/components/organisms/Modal/CriticalWarningModal.vue:16-21,62-82,121-141,279-281
layout/src/layouts/RecordList/RecordList.vue:1735-1749   (query DELETE_IMPACT_PREVIEW)
layout/src/layouts/RecordList/RecordList.vue:6096-6133   (loadDeleteImpact)
layout/src/layouts/RecordList/RecordList.vue:6139-6155   (confirmDeleteRow dispara el modal critico solo si deleteWarning.enabled && type === 'critical')
layout/src/layouts/RecordList/RecordList.vue:894         (item-name)
```

> Lineas no re-verificadas en esta pasada (2026-08-17): `RecordList.vue` crecio bastante desde que se documentaron. Ver seccion 8bis para la referencia verificada de `handleCriticalDeleteConfirm`.

### 8bis. Ruteo de errores: rechazo de negocio (toast) vs error de transporte (ErrorState)

Un Restrict o una regla de negocio que bloquea un borrado **no** es una falla de la pantalla: la lista sigue siendo valida y el usuario necesita leer por que no se pudo, sin perder la vista. `handleCriticalDeleteConfirm` (`layout/src/layouts/RecordList/RecordList.vue:6995`) distingue dos fuentes de error del borrado critico single, con el mismo criterio en ambas:

- **Path estandar** (`deleteBulkInstances`, sin `customMutation`): el motor de cascada no lanza, devuelve `errors[]` con un `type` plano en el payload de la mutation. `isBusinessBulkDeleteError(bulkErrors)` (`layout/src/utils/graphqlErrors.ts`) clasifica por ese `type`: si es un rechazo de negocio (Restrict/`CONSTRAINT_VIOLATION`, entre otros), el mensaje va a `showWarning` (toast) y la lista sigue montada; solo una falla sin `type` de dominio reconocido cae a `error.value` (la ruta de `<ErrorState>` full-view).
- **Path `customMutation`** (mutations propias de un mod, ej. `deleteLevelSchemeValidated`): el resolver SI lanza. `resolveBusinessErrorCode(err)` (mismo archivo) lee `err.extensions.code`: si hay un codigo de negocio, `showWarning(err.message)`; si no, `error.value` con el mensaje generico.

Antes de este ruteo (UPONE-1557/UPONE-1600), el `catch` de `customMutation` escribia siempre en `error.value`, el mismo ref que gobierna el `<ErrorState>` full-view de la lista. Un rechazo legitimo de dominio (ej. "no se puede eliminar un esquema en uso, inactivalo en su lugar") reemplazaba toda la lista por un cartel de error generico, y el texto explicativo que el backend habia redactado nunca llegaba a mostrarse. El fix lleva `customMutation` a paridad con el path estandar y con `useRowMutation.ts` (que ya mostraba sus errores de mutation como toast).

Cobertura: `layout/src/layouts/RecordList/__tests__/bulkDeleteErrorRouting.spec.ts`. Ver `RULE-layout-047`.

---

## 9. Como declararlo en un mod

### Tabla de metadata verificada (curriculum-design)

| Objeto | Metadata de hijos declarada | Archivo |
|--------|------------------------------|---------|
| `AcademicProgram` | `polymorphicChildren` (curricula via `ownerType`/`ownerId`) | AcademicProgram.json:12-19 |
| `Curriculum` | `polymorphicChildren` (sections, requirements) + `directChildren` (planEntries, requirementCategories) | Curriculum.json:12-39 |
| `Activity` | `polymorphicChildren` (sections, requirements) + `polymorphicChildrenDerived` (CurricularLink) | activity.json:12-34 |
| `Offering` | `polymorphicChildren` + `polymorphicChildrenDerived` (CurricularLink) | Offering.json:7-29 |
| `CurricularSection` | `directChildren` self-recursivo (children via `parentId`) | CurricularSection.json:15-22 |

### Habilitacion en layouts

`canDelete` y `deleteWarning` se habilitan en:

- `default_AcademicProgram_list.json:36-61`
- `default_Curriculum_list.json`
- `default_Activity_list.json:50-61`
- Listas embebidas en las variantes `_edit` y `_view` de cada objeto

### Caso especial: arbol con borrado por nodo

El componente `CompositeSectionTree` permite borrar un nodo individual del arbol de secciones curriculares, combinando `deleteImpactPreview` con `deleteBulkInstances(objectType: CurricularSection)`:

```
mods/curriculum-design/modsComponents/CompositeSectionTree/CompositeSectionTreeElement.vue:257-268,484-545
```

### Pasos para declarar el motor en un objeto nuevo

1. Agregar `polymorphicChildren`, `directChildren` y/o `polymorphicChildrenDerived` en el JSON del objeto padre, apuntando a los objetos hijos y su campo de relacion.
2. Correr `npm run codegen` para regenerar el schema.
3. Habilitar `canDelete` y `deleteWarning` en los layouts `_list` (y sus variantes embebidas) del objeto.
4. Verificar con `deleteImpactPreview` que el arbol de impacto y las restricciones se calculan como se espera antes de habilitar el borrado en produccion.

### Borrado por RecordType (entrada por el alias `rt__<RT>__<base>`)

El borrado que entra por el nombre de un RecordType (`objectType = "rt__<RT>__<base>"`, como cuando el list layout se arma por el RT) se enruta igual que el borrado por el objeto base. `deleteBulkInstances`/`deleteInstance` resuelven el alias RT al nombre canonico del objeto base al inicio del resolver y corren TODO por el camino generico: el motor de cascada (`directChildren`/`polymorphicChildren`), el soft-delete declarativo, la auditoria por nodo y la deteccion de Restrict. Las proyecciones `rt__`/`ext__` del base se limpian antes de borrar la fila base; la columna FK de cada proyeccion se resuelve por introspeccion de `information_schema` (su casing no es derivable del nombre del objeto: `OrgUnit` -> `OrgUnitId`, pero `Availability` -> `availabilityId`).

Fijado en UPONE-1479 (reemplaza la rama RT paralela que existia desde antes de UPONE-1382 y que borraba solo la fila objetivo, dejando hijos huerfanos y borrado fisico en objetos soft-delete). Caso que lo destapo: `LevelScheme`/`Scheme`+`Level` self-recursivo, [`mods/curriculum-mapping/docs/BUG-core-harddelete-cascade-recordtype.md`](../../../up1/mods/curriculum-mapping/docs/BUG-core-harddelete-cascade-recordtype.md) (origen UPONE-1454). Cobertura: `object-manager/tests/integration/hard-delete-cascade.integration.test.js` (casos por RT, hard/soft/Restrict/DataLog, por bulk y single).

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-07-16 | Documento inicial: motor de delete en cascada basado en UPONE-1382, contrato DeleteImpactPlan, deteccion de Restrict, atomicidad, auditoria DataLog, query deleteImpactPreview, integracion UI y ejemplo de declaracion en curriculum-design |
| 2026-08-03 | Agrega seccion 7: `baseRelation.onDelete` opt-in en Extended JSON (UPONE-1376) para cascade Prisma en la FK `ext__` hacia el modelo base; verificado en `generatePrismaSchema.js:607-608` |
| 2026-08-03 | UPONE-1479: el borrado por RecordType (`rt__<RT>__<base>`) se resuelve a base y corre el camino generico (cascada, soft-delete, Restrict, DataLog); limpieza de proyecciones `rt__`/`ext__` con FK resuelta por introspeccion. Reemplaza la seccion "Gap conocido: borrado por RecordType no cascadea" (ese hueco quedo cerrado) |
| 2026-08-13 | UPONE-1557: documenta el path generico sin hijos (`validateBulkDelete`) en la seccion 1 y la exclusion de la proyeccion RT propia (`PK == FK`, introspeccion `information_schema`) que lleva el borrado en bloque a paridad con el individual (corrige el false-RESTRICT). No confundir con el motor de cascada: es el path de objetos sin hijos declarados |
| 2026-08-17 | UPONE-1613: el walk del motor lee la metadata de cada tipo del frontier, no solo la del objeto raiz (corrige que nietos de un cascade heterogeneo de 3+ niveles nunca se descubrieran); `deleteBulkInstances` saltea `validateBulkDelete` para objetos soft-delete. `deleteImpactPreview` resuelve el alias RT al objeto base antes de correr el motor (seccion 6). Nueva seccion 8bis: ruteo toast (rechazo de negocio) vs `ErrorState` full-view (error de transporte) en `handleCriticalDeleteConfirm`, cierra UPONE-1557/UPONE-1600. Cierra los dos analisis de `kb/sp8/` sobre este dominio (nota en seccion 1) |
