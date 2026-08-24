---
id: SPEC-features-010
project: up1
type: spec
module: features
category: features
tags: [up1, soft-delete, borrado-logico, tenantManager, $extends, includeInactive, kill-switch, core, object-manager]
fecha: 2026-08-03
ticket: soft-delete-global (PR #415)
sources:
  - object-manager/src/services/tenantManager.js
  - object-manager/src/graphql/resolvers/instance.resolver.js
  - object-manager/src/services/codegen/generatePrismaSchema.js
  - object-manager/objects/core/core_ObjectDefinition.json
  - mods/uengagement-up1/objects/ActivityType.json
  - object-manager/docs/features/soft-delete.md (doc interno espejo)
---
# Soft-Delete Global de uP1

## Indice

1. [Que es y por que](#1-que-es-y-por-que)
2. [Declaracion en el objeto](#2-declaracion-en-el-objeto)
3. [Registry: la columna softDeleteConfig](#3-registry-la-columna-softdeleteconfig)
4. [Lectura: el filtro central en el $extends](#4-lectura-el-filtro-central-en-el-extends)
5. [Escape hatch: includeInactive](#5-escape-hatch-includeinactive)
6. [Borrado: baja la bandera en dos capas](#6-borrado-baja-la-bandera-en-dos-capas)
7. [Integridad en escritura (FK a inactivos)](#7-integridad-en-escritura-fk-a-inactivos)
8. [Precedencia frente al delete en cascada](#8-precedencia-frente-al-delete-en-cascada)
9. [Kill-switch](#9-kill-switch)
10. [Limitaciones actuales](#10-limitaciones-actuales)
11. [Estado de adopcion y como enrolar un objeto](#11-estado-de-adopcion-y-como-enrolar-un-objeto)

---

## 1. Que es y por que

Mecanismo de core (PR #415) para que "borrar" un registro baje una bandera booleana en vez de eliminarlo fisicamente. El registro persiste en la tabla pero queda **invisible e inutilizable** para todo consumidor: API generica, otros mods, MCP y agente. Es reversible (reactivar = subir la bandera).

Dos propiedades clave:

- **Opt-in por metadata y backward-compatible**: un objeto que no declara nada borra fisicamente como siempre (o entra al motor de cascada si declara hijos, ver [delete-cascade.md](delete-cascade.md)).
- **Filtrado en un solo punto**: el ocultamiento vive en el `$extends` del cliente Prisma del tenant, aguas arriba de GraphQL, resolvers y layouts. No hace falta declarar filtros por vista. Todo lo que pase por ese cliente hereda el filtro, incluido el MCP y el agente, que no consumen filtros de layout.

Vive en:

```
object-manager/src/services/tenantManager.js   (buildSoftDeleteExtension)
```

## 2. Declaracion en el objeto

En el bloque `metadata` del JSON del objeto:

```json
{
  "title": "ActivityType",
  "type": "object",
  "metadata": {
    "softDelete": { "field": "isActive" }
  },
  "properties": {
    "isActive": {
      "type": "boolean",
      "not_null": true,
      "static_default": "true",
      "description": "Soft delete flag. true = vivo/visible, false = borrado."
    }
  }
}
```

Reglas:

- **El nombre del campo es libre** (`active`, `isActive`, `enabled`, ...). El unico requisito: booleano **positivo** (`true` = vivo, `false` = borrado).
- Conviene declararlo `not_null` con `static_default: "true"`. Un `null` se trata como "no true" y quedaria oculto.
- **No soportado (todavia)**: modos invertidos (`isDeleted`), timestamps (`deletedAt`), enums de estado.

Ejemplo real enrolado (verificado en codigo): el objeto base [`object-manager/objects/business/Base/activitytype.json`](../../../up1/object-manager/objects/business/Base/activitytype.json) declara `metadata.softDelete: { field: "isActive" }` (tambien presente en la extension del mod [`mods/uengagement-up1/objects/ActivityType.json`](../../../up1/mods/uengagement-up1/objects/ActivityType.json)).

## 3. Registry: la columna softDeleteConfig

El bloque `metadata.softDelete` se persiste en build-time a una columna de `core_ObjectDefinition`, para que el runtime no reparse el JSON en cada request:

```prisma
// core_ObjectDefinition (schema generado)
softDeleteConfig  Json?   // { "field": "isActive" }  o  null
```

Lo puebla `syncSoftDeleteConfigToRegistry` (en `generatePrismaSchema.js`) durante el codegen. Verificacion consultando la BD del tenant:

```sql
SELECT name, "softDeleteConfig"
FROM "core_ObjectDefinition"
WHERE "softDeleteConfig" IS NOT NULL;
-- ActivityType | {"field": "isActive"}
```

> **Trampa operativa**: si cambias `metadata.softDelete` pero no corres codegen + migracion, el registry queda desactualizado y el runtime se comporta segun lo persistido. Ademas el registry se **cachea por cliente de tenant**: cambiar la config exige recrear el cliente (restart), no alcanza con regenerar.

## 4. Lectura: el filtro central en el $extends

Al crear el cliente del tenant, `getClient` carga el registry (`modelo -> campo`) y, si hay al menos un objeto con soft-delete, aplica el `$extends` que oculta los inactivos en **toda** lectura (`buildSoftDeleteExtension`, tenantManager.js):

```js
// Inyecta { [field]: true } en el where de las ops que lo tienen
const injectWhere = (model, args) => {
  const field = registry.get(model);
  if (!field || shouldIncludeInactive()) return args;   // sin bandera o escape hatch activo
  const cond = { [field]: true };
  return { ...args, where: args?.where ? { AND: [args.where, cond] } : cond };
};

// findUnique no admite campos no-unicos en el where -> post-filtro
const dropIfInactive = (model, res) => {
  const field = registry.get(model);
  if (!field || shouldIncludeInactive() || !res) return res;
  return res[field] === false ? null : res;
};
```

Aplica `injectWhere` a `findMany` / `findFirst` / `count` / `aggregate` / `groupBy`, y `dropIfInactive` a `findUnique` / `findUniqueOrThrow`. Para objetos sin bandera el `$extends` es passthrough (costo cero); para tenants sin ningun objeto con soft-delete no se aplica.

## 5. Escape hatch: includeInactive

La unica via soportada para leer inactivos (reporteria, administracion, reactivacion) es el parametro `includeInactive` de `listInstances`, **gateado por capability**:

```graphql
listInstances(name: "ActivityType", includeInactive: true) { id name isActive }
```

Internamente corre dentro de `runWithIncludeInactive(...)`, que activa un flag por-llamada via `AsyncLocalStorage`; el `$extends` lo lee (`shouldIncludeInactive()`) y no filtra:

```js
const softDeleteALS = new AsyncLocalStorage();
export function runWithIncludeInactive(fn) {
  return softDeleteALS.run({ includeInactive: true }, fn);
}
function shouldIncludeInactive() {
  return softDeleteALS.getStore()?.includeInactive === true;
}
```

Cualquier otra lectura no setea el flag, asi que se filtra. Esto hace que el ocultamiento sea confiable para consumidores que no son la UI.

## 6. Borrado: baja la bandera en dos capas

El soft-delete se cubre por partida doble para atrapar tanto la API generica como los mods que llaman a Prisma directo:

**Capa 1, el resolver** (`deleteInstance` en instance.resolver.js): lee `softDeleteConfig`; si hay `field`, hace `update` de la bandera. **Si no puede leer el config, aborta** (no cae a hard delete) para no destruir un registro por un fallo de lectura:

```js
if (softDeleteConfig?.field) {
  const softField = softDeleteConfig.field;
  const before = await prisma[modelName].findUnique({ where: { id: idValue } });
  await prisma[modelName].update({ where: { id: idValue }, data: { [softField]: false } });
  await logInstanceOperation({ operation: 'DELETE', objectType, instanceId: idValue, oldData: before, context });
  return true;                                   // retorna: NO entra a la cascada
}
```

**Capa 2, el `$extends`** (tenantManager.js): reescribe `delete -> update` y `deleteMany -> updateMany` para los modelos del registry, asi un `prisma.x.delete()` directo de un mod tampoco elimina fisicamente:

```js
async delete({ model, args, query }) {
  const field = registry.get(model);
  if (!field) return query(args);                              // sin bandera -> hard delete normal
  return delegate(model).update({ ...args, data: { [field]: false } });
},
```

El evento `delete` se sigue emitiendo: los flujos (n8n) y consumidores tratan el registro como eliminado.

## 7. Integridad en escritura (FK a inactivos)

En `create` / `update` / `createMany` / `updateMany`, el `$extends` **rechaza referenciar (via FK) un registro inactivo** de un modelo con soft-delete. Cubre las dos formas del payload: FK escalar directo y la relacion `connect` de Prisma:

```js
const checkFkRefs = async (model, data) => {
  const refs = referencingMap.get(model);              // que FKs de `model` apuntan a un modelo soft-delete
  if (!refs || !data) return;
  for (const { field, relationName, refModel, refField } of refs) {
    let val = data[field];                             // forma escalar: data.activityTypeId
    if (val == null && relationName) {
      const rel = data[relationName];                  // forma connect: data.activitytype.connect.id
      if (rel && typeof rel === 'object') val = rel.connect?.id ?? null;
    }
    if (val == null) continue;
    const ref = await delegate(refModel).findUnique({ where: { id: val }, select: { [refField]: true } });
    if (ref && ref[refField] === false) {
      throw new Error(`No se puede referenciar ${refModel} (${val}) desde ${model}.${field}: el registro esta inactivo.`);
    }
  }
};
```

El mapa de que FKs apuntan a modelos con soft-delete se arma desde `core_FieldDefinition` (`properties.references`) en `_loadReferencingMap`.

> **Forward-only**: impide crear **nuevas** referencias hacia un inactivo. **No** evalua las referencias **ya existentes** al momento de soft-deletear. Esa deteccion (soft-delete que deja referentes colgando) es un gap de diseno abierto, discutido en [`sp7/soft-delete-core-analisis-diseno.md`](../sp7/soft-delete-core-analisis-diseno.md) seccion 6.

## 8. Precedencia frente al delete en cascada

`deleteInstance` evalua el soft-delete **antes** que la cascada de hijos. Si el objeto tiene bandera, baja la bandera y retorna (no cascadea). Si no tiene bandera pero declara hijos, entra al [motor de cascada](delete-cascade.md). Si no declara nada, path generico:

```
deleteInstance(objectType, id)
  -> metadata.softDelete?        si -> SOFT-DELETE (baja bandera, retorna; NO cascadea)
  -> declara hijos?              si -> HARD-DELETE EN CASCADA (plan -> restrict? aborta ; si no, borra subarbol)
  -> path generico
```

Consecuencia: hoy un padre con soft-delete **no** propaga la baja a sus hijos. Un hijo que dependia del padre queda activo colgando de un padre invisible. El diseno de una cascada logica configurable es propuesta en el doc de sp7 (seccion 6), no esta implementado.

## 9. Kill-switch

Variable de entorno `SOFT_DELETE_GLOBAL_FILTER`:

```js
export function isSoftDeleteEnabled() {
  return process.env.SOFT_DELETE_GLOBAL_FILTER !== 'false';
}
```

- Sin definir (o cualquier valor distinto de `false`): mecanismo encendido (default).
- `SOFT_DELETE_GLOBAL_FILTER=false`: apaga todo (el `$extends` y las ramas de soft-delete de las mutaciones) sin deploy.

## 10. Limitaciones actuales

1. **Lecturas anidadas (`include` / relaciones) NO se filtran.** El `$extends` intercepta solo las ops top-level de `$allModels`. Un `findMany({ include: { activityType: true } })` sobre otro objeto puede devolver el `activityType` inactivo embebido.
2. **Registry cacheado por cliente de tenant**: cambiar `softDeleteConfig` requiere recrear el cliente.
3. **Solo booleano positivo** (`true` = vivo).
4. **RecordTypes no cubiertos** por el rewrite de borrado (los objetos base si). Declarar `metadata.softDelete` en un objeto RecordType no falla, pero tampoco tiene efecto: `deleteBulkInstances`/`deleteInstance` toman la rama RT (que hace `delete` fisico de extension + fila RT + fila base) y hacen `return` **antes** de llegar al bloque que lee `bulkSoftField`, asi que el borrado sigue siendo fisico. Causa raiz, evidencia y workaround mod-side documentados en [`mods/curriculum-mapping/docs/BUG-core-softdelete-recordtype.md`](../../../up1/mods/curriculum-mapping/docs/BUG-core-softdelete-recordtype.md) (hallado en UPONE-1454, reportado al platform team sin ticket UPONE propio abierto).
5. **Deploy**: requiere codegen + migracion (columna `softDeleteConfig`) junto con el codigo. Si la columna no existe, las rutas de borrado abortan con error claro (falla seguro, nunca hard delete por un fallo de lectura).

## 11. Estado de adopcion y como enrolar un objeto

El mecanismo de core esta desplegado, pero la adopcion es **por objeto** y todavia incipiente. Verificado en codigo (grep de `metadata.softDelete` sobre todos los objetos):

- **`ActivityType`** es el **unico** objeto enrolado hoy (`metadata.softDelete: { field: "isActive" }`). Es el ejemplo funcional de referencia.
- El resto de objetos que gestionan visibilidad con una bandera booleana lo hacen **ad-hoc por vista** (filtro declarado en cada layout + mutations propias), aun sin enrolar en el mecanismo central. Para ellos el ocultamiento vive solo en los layouts, asi que un consumidor sin ese filtro (MCP, otro mod, reporteria) sigue viendo los "borrados". Son los candidatos naturales a migrar.

**Migrar un objeto del enfoque por-vista al central**:

1. Declarar `metadata.softDelete: { field }` en el JSON (usar el booleano que ya tiene, ej. `active`).
2. Correr codegen + migracion para poblar `softDeleteConfig`.
3. Recrear el cliente del tenant (restart) para que el `$extends` cargue el nuevo registry.
4. Verificar: borrar baja la bandera; desaparece de la lectura generica y del MCP; `includeInactive` + capability lo recupera; no se puede crear una FK nueva hacia uno inactivo.
5. Validado esto, **retirar el filtro `active=true` de los layouts** de ese objeto (ya lo aplica el `$extends`).

**Checklist antes de enrolar un objeto con hijos**: hoy el soft-delete **no** cascadea, asi que revisar el diseno de sp7 (secciones 6.1 a 6.3) antes, para no dejar hijos colgando.

> Diseno profundo, comparacion soft vs hard, tipos de hijos y la propuesta de cascada logica: [`sp7/soft-delete-core-analisis-diseno.md`](../sp7/soft-delete-core-analisis-diseno.md).
