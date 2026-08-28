---
id: DOC-kb-sp7-soft-delete-core-analisis-diseno
project: up1
type: doc
---

# Guía de borrado en up1: soft-delete global y hard-delete en cascada

Esta guía explica cómo up1 borra registros hoy, con dos mecanismos que conviven en el core (`object-manager`):

1. **Soft-delete global declarativo**: baja una bandera booleana; el registro persiste pero queda invisible e inutilizable para todo consumidor.
2. **Hard-delete en cascada**: borra físicamente un registro y su subárbol de hijos declarados, en una transacción atómica, bloqueando si algo externo lo usa.

Cubre el funcionamiento real de cada uno (con ejemplos de código), los tipos de hijos que modela la metadata, la comparación entre ambos, y cómo podría llevarse la inteligencia de subárbol y restricciones del hard-delete al soft-delete (con ejemplos de diseño claramente marcados como propuesta).

> Todas las rutas son relativas a este archivo y apuntan al código real en `Workspace/uplanner/up1`. Doc de plataforma relacionada: [`object-manager/docs/features/soft-delete.md`](../../../up1/object-manager/docs/features/soft-delete.md) y [`delete-cascade.md`](../../../up1/object-manager/docs/features/delete-cascade.md).

---

## 1. Panorama: dos mecanismos, una precedencia

Ambos son **opt-in por metadata** y **backward-compatible**: un objeto que no declara nada borra físicamente como siempre.

```
deleteInstance(objectType, id)
        │
        ▼
¿el objeto declara metadata.softDelete?  ──── sí ──▶  SOFT-DELETE: update bandera=false, retorna
        │ no                                          (NO cascadea; el evento delete igual se emite)
        ▼
¿declara hijos (polymorphicChildren /
 directChildren / polymorphicChildrenDerived)?  ── sí ──▶  HARD-DELETE EN CASCADA:
        │ no                                                build plan → Restrict? aborta
        ▼                                                   → si no, borra subárbol en $transaction
PATH GENÉRICO: borra RT/ext del registro + valida FKs reales
```

La decisión vive en `deleteInstance` ([`instance.resolver.js`](../../../up1/object-manager/src/graphql/resolvers/instance.resolver.js)): el soft-delete se evalúa **antes** que la cascada. Si el objeto tiene bandera, baja la bandera y no cascadea. Este es el orden real:

```js
// instance.resolver.js (deleteInstance): soft-delete corre primero
if (softDeleteConfig?.field) {
  const softField = softDeleteConfig.field;
  let before = null;
  try { before = await prisma[modelName].findUnique({ where: { id: idValue } }); } catch (_) {}
  await prisma[modelName].update({ where: { id: idValue }, data: { [softField]: false } });
  await logInstanceOperation({ operation: 'DELETE', objectType, instanceId: idValue, oldData: before, context });
  return true;                                   // ← retorna: NO entra a la cascada
}

// Si no hay soft-delete, recién aquí se intenta la cascada de hijos declarados
const cascade = await cascadeDeleteIfApplicable({ prisma, tenant: tenantId, objectType, requestedIds: [id], context });
if (cascade.applied) { /* Restrict → throw ; cascade → borrado atómico */ }
```

---

## 2. Soft-delete global declarativo

Un registro "borrado" no desaparece: se le baja una bandera booleana y, a partir de ahí, queda oculto para **toda** lectura (API genérica, otros mods, MCP, agente) y no puede referenciarse desde escrituras nuevas. El filtrado vive en **un solo punto**: el `$extends` del cliente Prisma del tenant. No hace falta declarar filtros por vista.

### 2.1 Declaración

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
      "title": "Is Active",
      "not_null": true,
      "static_default": "true",
      "description": "Soft delete flag. true = vivo/visible, false = borrado."
    }
  }
}
```

Reglas:

- **El nombre del campo es libre** (`active`, `isActive`, `enabled`, ...). El único requisito es que sea un booleano **positivo**: `true` = vivo, `false` = borrado.
- Conviene declararlo `not_null` con `static_default: "true"`. Un valor `null` se trata como "no true" y quedaría oculto.
- **No soportado (todavía)**: modos invertidos (`isDeleted`), timestamps (`deletedAt`), enums de estado.

### 2.2 El registry: la columna `softDeleteConfig`

El bloque `metadata.softDelete` se persiste en build-time a una columna de `core_ObjectDefinition`, para que el runtime no reparse el JSON en cada request:

```prisma
// core_ObjectDefinition (schema generado)
softDeleteConfig  Json?   // { "field": "isActive" }  o  null
```

Lo puebla `syncSoftDeleteConfigToRegistry` (en [`generatePrismaSchema.js`](../../../up1/object-manager/src/services/codegen/generatePrismaSchema.js)) durante el codegen. Verificación de que quedó aplicado, consultando la BD del tenant:

```sql
SELECT name, "softDeleteConfig"
FROM "core_ObjectDefinition"
WHERE "softDeleteConfig" IS NOT NULL;
-- ActivityType | {"field": "isActive"}
```

> **Trampa operativa**: si cambias `metadata.softDelete` pero no corres el codegen + migración, el registry queda desactualizado y el runtime se comporta según lo persistido. Además el registry se **cachea por cliente de tenant**: cambiar la config exige recrear el cliente (restart o `reloadClient`), no alcanza con regenerar.

### 2.3 Lectura: el filtro central en el `$extends`

Al crear el cliente del tenant, `tenantManager.getClient` carga el registry (`modelo -> campo`) y, si hay al menos un objeto con soft-delete, aplica un `$extends` que oculta los inactivos en **toda** lectura. Este es el mecanismo real ([`tenantManager.js:88`](../../../up1/object-manager/src/services/tenantManager.js)):

```js
// Inyecta { [field]: true } en el where de las ops que tienen where
const injectWhere = (model, args) => {
  const field = registry.get(model);
  if (!field || shouldIncludeInactive()) return args;   // objeto sin bandera o escape hatch activo
  const cond = { [field]: true };
  return { ...args, where: args?.where ? { AND: [args.where, cond] } : cond };
};

// findUnique/findUniqueOrThrow no admiten campos no-únicos en el where → post-filtro
const dropIfInactive = (model, res) => {
  const field = registry.get(model);
  if (!field || shouldIncludeInactive() || !res) return res;
  return res[field] === false ? null : res;
};

return {
  query: {
    $allModels: {
      async findMany({ model, args, query })  { return query(injectWhere(model, args)); },
      async findFirst({ model, args, query }) { return query(injectWhere(model, args)); },
      async count({ model, args, query })     { return query(injectWhere(model, args)); },
      async aggregate({ model, args, query }) { return query(injectWhere(model, args)); },
      async groupBy({ model, args, query })   { return query(injectWhere(model, args)); },
      async findUnique({ model, args, query }) { return dropIfInactive(model, await query(args)); },
      // ...
    },
  },
};
```

Para objetos sin bandera el `$extends` es passthrough (costo cero). Para tenants sin ningún objeto con soft-delete, el `$extends` ni se aplica.

### 2.4 Escape hatch: `includeInactive`

La única vía soportada para leer inactivos (reportería, administración, reactivación) es el parámetro `includeInactive` de `listInstances`, **gateado por capability**:

```graphql
listInstances(name: "ActivityType", includeInactive: true) { id name isActive }
```

Internamente, esa lectura corre dentro de `runWithIncludeInactive(...)`, que activa un flag por-llamada vía `AsyncLocalStorage`; el `$extends` lo lee (`shouldIncludeInactive()`) y no filtra:

```js
// tenantManager.js: el flag por-llamada
const softDeleteALS = new AsyncLocalStorage();
export function runWithIncludeInactive(fn) {
  return softDeleteALS.run({ includeInactive: true }, fn);
}
function shouldIncludeInactive() {
  return softDeleteALS.getStore()?.includeInactive === true;
}
```

Cualquier otra lectura no setea el flag, así que se filtra. Esto es lo que hace que el ocultamiento sea confiable para consumidores que no son la UI (ver 2.8).

### 2.5 Borrado: baja la bandera, en dos capas

El soft-delete se cubre por partida doble para atrapar tanto la API genérica como los mods que llaman a Prisma directo:

**Capa 1, el resolver** ([`instance.resolver.js:3876`](../../../up1/object-manager/src/graphql/resolvers/instance.resolver.js)): lee `softDeleteConfig`; si hay `field`, hace `update` de la bandera. **Si no puede leer el config, aborta** (no cae a hard delete) para no destruir un registro por un fallo de lectura:

```js
let softDeleteConfig = null;
if (isSoftDeleteEnabled()) {
  try {
    const sdDef = await prisma.core_ObjectDefinition.findFirst({
      where: { name: { equals: objectType, mode: 'insensitive' } },
      select: { softDeleteConfig: true },
    });
    softDeleteConfig = sdDef?.softDeleteConfig ?? null;
  } catch (error) {
    throw new Error(
      `No se pudo determinar la política de borrado (softDeleteConfig) para ${objectType}: ${error.message}. ` +
      `Se aborta el borrado para no eliminar físicamente por error.`
    );
  }
}
```

**Capa 2, el `$extends`** ([`tenantManager.js:114`](../../../up1/object-manager/src/services/tenantManager.js)): reescribe `delete -> update` y `deleteMany -> updateMany` para los modelos del registry, así un `prisma.x.delete()` directo de un mod tampoco elimina físicamente:

```js
async delete({ model, args, query }) {
  const field = registry.get(model);
  if (!field) return query(args);                                  // sin bandera → hard delete normal
  return delegate(model).update({ ...args, data: { [field]: false } });
},
async deleteMany({ model, args, query }) {
  const field = registry.get(model);
  if (!field) return query(args);
  return delegate(model).updateMany({ ...args, data: { [field]: false } });
},
```

El evento `delete` se sigue emitiendo: los flujos (n8n) y consumidores tratan el registro como eliminado.

### 2.6 Integridad en escritura

En `create` / `update` / `createMany` / `updateMany`, el `$extends` **rechaza referenciar (vía FK) un registro inactivo** de un modelo con soft-delete. Cubre las dos formas del payload: FK escalar directo y la relación `connect` de Prisma ([`tenantManager.js:68`](../../../up1/object-manager/src/services/tenantManager.js)):

```js
const checkFkRefs = async (model, data) => {
  const refs = referencingMap.get(model);              // qué FKs de `model` apuntan a un modelo soft-delete
  if (!refs || !data) return;
  for (const { field, relationName, refModel, refField } of refs) {
    let val = data[field];                             // forma escalar: data.activityTypeId
    if (val == null && relationName) {
      const rel = data[relationName];                  // forma connect: data.activitytype.connect.id
      if (rel && typeof rel === 'object') val = rel.connect?.id ?? null;
    }
    if (val == null) continue;                         // no setea / limpia el FK → nada que validar
    const ref = await delegate(refModel).findUnique({ where: { id: val }, select: { [refField]: true } });
    if (ref && ref[refField] === false) {
      throw new Error(
        `No se puede referenciar ${refModel} (${val}) desde ${model}.${field}: el registro está inactivo (soft-deleted).`
      );
    }
  }
};
```

El mapa de qué FKs apuntan a modelos con soft-delete se arma desde `core_FieldDefinition` (`properties.references`) en `_loadReferencingMap`.

> **Ojo, esto es forward-only**: impide crear **nuevas** referencias hacia un inactivo. **No** evalúa las referencias **ya existentes** en el momento de soft-deletear (ver la sección 6.2, que es justo el gap a cubrir).

### 2.7 Kill-switch

Variable de entorno `SOFT_DELETE_GLOBAL_FILTER`:

```js
export function isSoftDeleteEnabled() {
  return process.env.SOFT_DELETE_GLOBAL_FILTER !== 'false';
}
```

- Sin definir (o cualquier valor distinto de `false`): mecanismo encendido (default).
- `SOFT_DELETE_GLOBAL_FILTER=false`: apaga todo (el `$extends` y las ramas de soft-delete de las mutaciones) sin deploy.

### 2.8 Consumo por terceros que no dependen de las vistas (MCP, agente, otros mods)

Aquí está la ventaja de tenerlo en core. El `$extends` vive en el **cliente Prisma del tenant**, aguas arriba de GraphQL, resolvers y layouts. Todo lo que pase por ese cliente hereda el filtrado:

- La API genérica (`listInstances`, `getInstance`).
- Otros mods que llamen a Prisma directo.
- El MCP y el agente, que **no** consumen filtros de layout (no tienen vistas). Con el enfoque viejo, basado en filtros por vista, veían los "borrados"; con el `$extends`, sus lecturas quedan filtradas por el mismo mecanismo que el resto, sin configuración adicional.

### 2.9 Limitaciones actuales

1. **Lecturas anidadas (`include` / relaciones) NO se filtran.** El `$extends` intercepta solo las ops top-level de `$allModels`. Un `findMany({ include: { activityType: true } })` sobre otro objeto puede devolver el `activityType` inactivo embebido. El filtrado aplica a la consulta directa del objeto con soft-delete, no a su aparición como relación incluida de un padre. Grieta conocida (cerrarla requeriría filtrar los `include` recursivamente).
2. **Registry cacheado por cliente de tenant** (ver 2.2): cambiar `softDeleteConfig` requiere recrear el cliente.
3. **Solo booleano positivo** (`true` = vivo).
4. **RecordTypes no cubiertos** por el rewrite de borrado (los objetos base sí).
5. **Deploy**: requiere codegen + migración (columna `softDeleteConfig`) junto con el código. Si la columna no existe, las rutas de borrado abortan con error claro (falla seguro, nunca hard delete por un fallo de lectura).

---

## 3. Hard-delete en cascada

Cuando un objeto **no** tiene soft-delete pero **sí** declara hijos, borrar el padre debe arrastrar su subárbol sin dejar huérfanos, y bloquear si algo externo lo usa. La base de datos no puede garantizar esto sola, porque muchas relaciones son polimórficas (`ownerType`/`ownerId`), sin FK real. El motor declarativo vive en [`deleteImpactPlan.js`](../../../up1/object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js) y separa **calcular** de **ejecutar**.

### 3.1 El gate: solo objetos con hijos declarados entran

```js
export function objectDeclaresChildren(objectType, tenant = null, options = {}) {
  const blocks = ['polymorphicChildren', 'directChildren', 'polymorphicChildrenDerived'];
  return blocks.some((key) => {
    const block = readObjectMetadataBlock(objectType, tenant, key);
    return Array.isArray(block) && block.length > 0;
  });
}

export async function cascadeDeleteIfApplicable({ prisma, tenant, objectType, requestedIds, context, options }) {
  if (!objectDeclaresChildren(objectType, tenant, options)) return { applied: false };  // path genérico intacto

  const plan = await buildDeleteImpactPlan({ prisma, tenant, objectType, requestedIds, options });

  if (plan.status === 'restricted') {
    return { applied: true, executed: false, restrictions: plan.restrictions, plan };   // aborta, no toca DB
  }
  const res = await executeDeletePlan({ prisma, tenant, plan, context });
  return { applied: true, executed: true, deletedIds: res.deletedIds, plan };
}
```

Un objeto sin hijos declarados no paga el costo de recorrer el grafo.

### 3.2 El plan (read-only)

`buildDeleteImpactPlan` recorre el grafo sin tocar la DB y devuelve una estructura estable, reusada por el borrado real y por el preview de la UI:

| Campo | Contenido |
|---|---|
| `status` | `'cascade'` (se puede borrar) o `'restricted'` (bloqueado) |
| `nodes` | cada registro alcanzable: padres pedidos (`deleteMode: 'requested'`) + hijos/nietos/derivados (`deleteMode: 'cascade'`) |
| `edges` | relaciones que conectan nodos, con `semantics: 'cascade'` o `'restrict'` |
| `restrictions` | referencias externas y cadenas de versión que bloquean |
| `deleteOrder` | orden topológico inverso (hijos por `depth` desc, luego los `requested`) que el delete real itera |
| `summary` | conteos por `byObjectType` / `byRecordType` + `cascadeNodes` |

### 3.3 Cómo se recorren los hijos

El walk consume la metadata. Ejemplo real del recorrido de hijos polimórficos ([`deleteImpactPlan.js:199`](../../../up1/object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js)):

```js
async function walkPolymorphicChildren({ prisma, parentNodes, polymorphicChildren, plan }) {
  for (const entry of polymorphicChildren) {
    const { object, ownerTypeValue } = entry;
    const { ownerTypeField, ownerIdField } = parseOwnerVia(entry.via);   // "ownerType/ownerId" → dos columnas
    const model = prismaModelFor(prisma, object).model;

    const candidateParents = parentNodes.filter((n) => n.objectType === entry.parentObjectType);
    for (const parent of candidateParents) {
      const children = await model.findMany({
        where: {
          [ownerTypeField]: ownerTypeValue,   // ej. "Curriculum"
          [ownerIdField]: String(parent.id),  // ej. el id del currículo borrado
        },
      });
      // cada child entra al plan como nodo deleteMode:'cascade', depth = parent.depth + 1
      // (self-ref recursivo por recursiveBy para nietos, sobrinos, etc.)
    }
  }
}
```

### 3.4 Restricciones: bloqueo genérico por convención

Para cada nodo, `detectRestrictions` busca referencias entrantes **desde fuera del subárbol** y cadenas de versión. Si hay al menos una, el plan pasa a `restricted` con mensajes semánticos (label del objeto, no ids) ([`deleteImpactPlan.js:627`](../../../up1/object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js)):

```js
for (const node of plan.nodeMap.values()) {
  // 1) Referencias externas (FK por convención <objetoLower>Id, custom fields reference, polimórficas)
  const refs = await findIncomingReferences({ prisma, node, subtreeKeys, referenceFieldDefs });
  for (const ref of refs) {
    if (ref.externalIds.length === 0) continue;
    restrictions.push({
      nodeKey: node.key, referencingObject: ref.referencingObject, referencingField: ref.referencingField,
      count: ref.externalIds.length, reason: 'external-reference',
      message: `«${name}» está en uso por ${ref.externalIds.length} ${countedLabel(refLabels, ...)}. Resuélvelo antes de eliminar.`,
    });
  }

  // 2) Cadena de versión: si algún registro apunta a ESTE nodo por previousVersionId, es una versión anterior
  if (versionLinkageField && versionSelfRefObjects.has(node.objectType)) {
    const successors = await model.findMany({ where: { [versionLinkageField]: String(node.id) }, take: 5 });
    if (successors.length > 0) {
      restrictions.push({
        reason: 'version-chain',
        message: `«${name}» es una versión anterior de ${successors.length} ${...}. Eliminarla rompería el historial de versiones.`,
      });
    }
  }
}
```

### 3.5 Ejecución atómica

Si `status === 'cascade'`, un único `prisma.$transaction` borra cada nodo de `deleteOrder` (capa por capa según su `projectionStack`: `ext__` / `rt__` / base). Si cualquier delete falla, rollback total: no queda un subárbol a medio borrar. Si `status === 'restricted'`, no toca la DB.

Además, el motor audita cada nodo en `core_DataLog` (una entrada `DELETE` por nodo, con snapshot pre-delete y atribución al padre).

### 3.6 Preview para la UI

La misma estructura del plan se expone read-only como query `deleteImpactPreview`, que el `RecordList` consume al abrir el modal de confirmación para mostrar el conteo por tipo y bloquear el botón cuando el impacto es `restricted`:

```graphql
query DeleteImpactPreview($objectType: String!, $ids: [ID!]!) {
  deleteImpactPreview(objectType: $objectType, ids: $ids) {
    status            # 'cascade' | 'restricted'
    totalCount
    byObjectType
    byRecordType
    restrictions { message }
    warnings
  }
}
```

---

## 4. Los tipos de hijos (el modelo declarativo)

El motor de cascada, el clonado y el versionado consumen la **misma** metadata de hijos. Entender los cuatro tipos es clave tanto para el hard-delete como para diseñar el soft-delete en cascada, porque cada uno se comporta distinto. Ejemplo real completo en [`Curriculum.json`](../../../up1/mods/curriculum-design/objects/Curriculum.json):

```json
"metadata": {
  "polymorphicChildren": [
    { "name": "sections",     "object": "CurricularSection", "via": "ownerType/ownerId", "ownerTypeValue": "Curriculum", "recursiveBy": "parentId" },
    { "name": "requirements", "object": "requirement",       "via": "ownerType/ownerId", "ownerTypeValue": "curriculum", "recursiveBy": "parentId" }
  ],
  "directChildren": [
    { "name": "planEntries",          "object": "planEntry",          "fk": "planId" },
    { "name": "requirementCategories","object": "requirementCategory","fk": "curriculumId" }
  ],
  "versioning": {
    "linkageField": "previousVersionId",
    "versionField": "version"
  }
}
```

### 4.1 `polymorphicChildren`

- **Forma**: `{ name, object, via: "ownerType/ownerId", ownerTypeValue, recursiveBy }`.
- **Naturaleza**: posesión polimórfica. El hijo apunta al padre con dos columnas (`ownerType` = nombre del objeto padre, `ownerId` = su id). No hay FK real, así que la base de datos **no protege** la relación. `recursiveBy` permite anidamiento (una sección con subsecciones): el walk baja recursivamente por ese campo.
- **En hard-delete**: se recorre y se borra todo el subárbol.
- **Ejemplo**: un `Curriculum` posee `CurricularSection` vía `ownerType="Curriculum"`, y cada sección puede tener hijas por `parentId`.

### 4.2 `directChildren`

- **Forma**: `{ name, object, fk }`.
- **Naturaleza**: FK real y simple. La base de datos **sí** puede tener integridad a nivel constraint (ver 4.5).
- **En hard-delete**: el motor lo borra igual, pero además la FK física respalda la consistencia.
- **Ejemplo**: `planEntry.planId -> Curriculum.id`.

### 4.3 `polymorphicChildrenDerived`

- **Forma**: `{ object, via: "campoA,campoB", remapTo }`. El `via` es una **lista** de campos.
- **Naturaleza**: filas que referencian al padre a través de **varios** campos (no una posesión simple). Un mismo registro derivado puede apuntar a **más de un padre a la vez**. Ejemplo real en [`Offering.json`](../../../up1/mods/curriculum-design/objects/Offering.json) y [`activity.json`](../../../up1/mods/curriculum-design/objects/activity.json):

```json
"polymorphicChildrenDerived": [
  { "object": "CurricularLink", "via": "sourceSectionId,targetSectionId", "remapTo": "sections" }
]
```

- **Cuidado**: un `CurricularLink` conecta dos secciones. Borrar una no necesariamente invalida la fila entera de la misma forma que un hijo exclusivo. Requiere criterio distinto al de un hijo directo.

### 4.4 Cadena de versión (`versioning.linkageField`)

- **Forma**: `metadata.versioning.linkageField: "previousVersionId"` (más `versionField`, etc.).
- **Naturaleza**: no es un "hijo" en el sentido de composición, es un enlace temporal entre versiones (el sucesor apunta al predecesor). En hard-delete, borrar una versión que tiene sucesores dispara un `restrict` (rompería el linaje), como se ve en `detectRestrictions` (3.4).

### 4.5 `onDelete` por campo (constraint de FK)

- **Forma**: en la propiedad del campo, `"onDelete": "Cascade" | "Restrict"`. Ejemplo en [`planEntry.json`](../../../up1/mods/curriculum-design/objects/planEntry.json):

```json
"requirementCategoryId": {
  "type": "string",
  "description": "Línea de formación que clasifica la entrada. onDelete Restrict: la DB bloquea borrar una categoría con entries.",
  "onDelete": "Restrict"
}
```

- **Naturaleza**: es un **backstop a nivel de base de datos**, generado en el schema Prisma (`@relation(onDelete: ...)`). Complementa al motor: el motor bloquea a nivel aplicativo con mensaje semántico, y la DB es la última línea de defensa.
- **Importante para el soft-delete**: `onDelete` **solo aplica al borrado físico**. En un soft-delete no hay `delete`, así que un `onDelete: Restrict` **no** protege contra dejar una referencia colgando. Hay que resolver esa protección a nivel aplicativo (sección 6.2).

### Resumen

| Tipo | Declaración | Protección DB | Nota para soft-delete |
|---|---|---|---|
| `polymorphicChildren` | `via: "ownerType/ownerId"`, recursivo | Ninguna | Candidato natural a cascada lógica si el hijo tiene bandera |
| `directChildren` | `fk` | Posible (`onDelete`) | La FK no se rompe (el padre no desaparece); cascada lógica opcional |
| `polymorphicChildrenDerived` | `via: "a,b"` (multi-campo) | Ninguna | Multi-padre: probablemente restrict/warn, no cascada ciega |
| Cadena de versión | `versioning.linkageField` | Ninguna | Restrict si hay sucesores (romper linaje) |
| `onDelete` por campo | `onDelete` en la property | Sí (constraint) | No se dispara en soft-delete |

---

## 5. Comparación soft-delete vs hard-delete

| Dimensión | Soft-delete global | Hard-delete en cascada |
|---|---|---|
| Qué hace | Baja una bandera (`field = false`); el registro persiste | Borra físicamente en orden topológico, en transacción |
| Opt-in | `metadata.softDelete.field` | `metadata.polymorphicChildren` / `directChildren` / `polymorphicChildrenDerived` |
| Dónde vive | `$extends` del cliente Prisma + rama en el resolver | `deleteImpactPlan.js` (build/detect/execute) + wiring en el resolver |
| Hijos | **No cascadea hoy**: baja la bandera del padre y retorna | Recorre y borra el subárbol declarado |
| Referencias externas | Previene crear **nuevas** referencias a inactivos; no evalúa las existentes | `detectRestrictions`: bloquea si algo externo al subárbol lo usa |
| Reversibilidad | Alta (reactivar = subir la bandera) | Nula |
| Auditoría | Evento `delete` + el registro queda en tabla | DataLog `DELETE` por nodo (snapshot + atribución) |
| Atomicidad | Un `update` simple | `$transaction` con rollback total |
| Lectura posterior | Invisible salvo `includeInactive` (capability) | No existe |
| Consumo por terceros | Filtrado central para todos (MCP incluido); grieta en `include` anidados | El delete es definitivo |

**Lectura clave**: el hard-delete resuelve la **integridad al eliminar** (subárbol + restricciones). El soft-delete resuelve la **trazabilidad y reversibilidad**, pero hoy **no hereda** esa inteligencia de subárbol ni de restricciones. La sección 6 propone cómo llevarla.

---

## 6. Cómo llevar la inteligencia del hard-delete al soft-delete (diseño)

> Todo lo de esta sección es **propuesta**, no está implementado. La idea rectora es **reusar** el motor declarativo (`deleteImpactPlan.js`) y la metadata de hijos, en vez de reinventar.

### 6.1 Cascada configurable padre → hijos

**Hoy**: el soft-delete no cascadea. Baja la bandera del padre y retorna. Un hijo polimórfico que dependía del padre queda activo y visible, colgando de un padre invisible.

**Objetivo**: que al soft-deletear un padre, la propagación a los hijos sea **configurable** (no fija). Opciones:

- **A. Config declarativa por relación de hijo** (recomendada): agregar a cada entrada de hijos una propiedad `onSoftDelete`. Ejemplo:

```json
"polymorphicChildren": [
  {
    "name": "sections",
    "object": "CurricularSection",
    "via": "ownerType/ownerId",
    "ownerTypeValue": "Curriculum",
    "recursiveBy": "parentId",
    "onSoftDelete": "cascade"     // "cascade" | "restrict" | "detach" | "ignore"   (propuesta)
  }
]
```

  Pros: granular, declarativo, simétrico con el `onDelete` de FK. Contra: hay que definir el default y migrar la metadata existente.

- **B. Flag global por objeto** (`metadata.softDelete.cascade: true`): simple, pero no distingue tipos de hijo (una malla puede querer arrastrar sus secciones pero no sus inscripciones). Menos expresivo.

- **C. Sin cascada, solo restrict**: no propagar nunca; bloquear el soft-delete si hay hijos vivos y exigir resolverlos antes. Conservador.

**Cómo se implementaría reusando el plan**: `buildDeleteImpactPlan` ya produce el `deleteOrder` con los nodos del subárbol. Una variante "soft" de `executeDeletePlan` recorrería ese orden bajando la bandera en vez de borrar:

```js
// PROPUESTA (no implementado): ejecutar el plan como soft-delete en cascada
async function executeSoftDeletePlan({ prisma, plan, registry, childPolicy }) {
  return prisma.$transaction(async (tx) => {
    for (const node of plan.deleteOrder) {
      const field = registry.get(node.objectType);          // ¿el hijo soporta soft-delete?
      if (field) {
        await tx[modelFor(node.objectType)].update({
          where: { id: node.id },
          data: { [field]: false },
        });
        continue;
      }
      // Hijo SIN bandera: aplicar la política declarada en onSoftDelete
      switch (childPolicy(node)) {          // derivado de metadata (6.1 opción A)
        case 'restrict':  throw new Error(`No se puede soft-deletear: ${node.objectType} no soporta borrado lógico`);
        case 'hardDelete': await tx[modelFor(node.objectType)].delete({ where: { id: node.id } }); break;
        case 'ignore':    default: break;   // se deja como está (queda colgando: hay que avisarlo)
      }
    }
  });
}
```

El punto delicado es el **hijo que no soporta soft-delete**: un padre soft con un hijo sin bandera no puede cascadear "lógicamente". Esa mezcla soft-padre / hard-hijo es la mayor fuente de inconsistencia y el motor debe resolverla de forma explícita, nunca en silencio.

### 6.2 Detección de que el soft-delete deje otros objetos mal configurados

**Hoy**: la integridad en escritura es forward-only (2.6): impide crear **nuevas** referencias a un inactivo, pero **no** evalúa las referencias **existentes** al soft-deletear. Si `PlanEntry.requirementCategoryId -> RequirementCategory X` y soft-deleteas `X`, la `PlanEntry` sigue activa apuntando a una categoría ahora invisible: queda mal configurada por falta de datos que estaba usando.

**Diferencia clave frente al hard-delete**: en hard-delete una FK entrante real **impide** el borrado (constraint / `restrict`) porque rompería integridad física. En soft-delete la fila no desaparece, así que la base de datos no protege nada: el daño es **semántico** (referencia a un registro invisible), no un error de FK. Por eso la detección tiene que ser **aplicativa y explícita**.

**Objetivo**: antes de confirmar un soft-delete, detectar los referentes vivos y decidir qué hacer. Opción recomendada: exponer un `softDeleteImpactPreview` análogo a `deleteImpactPreview`, reusando `detectRestrictions` (que ya sabe encontrar "quién me está usando desde fuera"):

```js
// PROPUESTA (no implementado): preview de impacto de un soft-delete
async function softDeleteImpactPreview({ prisma, tenant, objectType, id }) {
  // Reusa el mismo motor read-only del hard-delete para hallar referentes vivos
  const plan = await buildDeleteImpactPlan({ prisma, tenant, objectType, requestedIds: [id] });

  // A diferencia del hard-delete, aquí una referencia entrante NO rompe integridad física:
  // solo deja al referente apuntando a algo invisible. Se reporta como WARN, no como bloqueo duro,
  // salvo que la metadata del referente pida 'restrict'.
  return {
    danglingReferences: plan.restrictions.map((r) => ({
      referencingObject: r.referencingObject,
      referencingField: r.referencingField,
      count: r.count,
      severity: policyFor(r) === 'restrict' ? 'block' : 'warn',
      message: r.message,
    })),
  };
}
```

Y el comportamiento ante referentes vivos también configurable por tipo de referencia: `block` (no dejar soft-deletear hasta reasignar), `warn` (avisar y permitir), o `detach` (poner el FK en null / soft-deletear también al referente), en la misma línea del `onSoftDelete` de 6.1.

### 6.3 Tratamiento por tipo de hijo

Combinando 4 (tipos de hijos) con la cascada del soft-delete:

| Tipo de hijo | Tratamiento sugerido en soft-delete |
|---|---|
| `polymorphicChildren` | Candidato a **cascade** de la bandera si el hijo la soporta; recorrer recursivamente. Si el hijo no tiene bandera, aplicar política explícita (6.1) |
| `directChildren` | La FK física no se rompe (el padre no desaparece). **Cascade lógico** si el hijo soporta soft-delete; el `onDelete` de constraint no aplica |
| `polymorphicChildrenDerived` | Multi-padre: soft-deletear un extremo no siempre invalida la fila. Probable **restrict/warn**, no cascade ciego |
| Cadena de versión | Soft-deletear una versión con sucesores debería **restrict** (romper el linaje deja versiones huérfanas), igual que en hard-delete |
| `onDelete` por campo | No se dispara en soft-delete. La protección equivalente debe ser aplicativa (6.2) |

**Principio transversal**: el soft-delete en cascada solo puede propagarse a hijos que **también** soporten soft-delete. Para el resto, la política debe ser explícita (bloquear, hard-deletear, o desvincular), y el motor debe detectar la situación, nunca resolverla en silencio.

---

## 7. Estado de adopción y guía de migración

El mecanismo de core está desplegado (columna `softDeleteConfig` presente, código activo), pero la adopción es **por objeto** y todavía incipiente:

- **`ActivityType`** ya está enrolado: declara `metadata.softDelete: { field: "isActive" }` y su `softDeleteConfig` quedó poblado en `core_ObjectDefinition`. Es el ejemplo funcional de referencia.
- Otros objetos que hoy usan un soft-delete **ad-hoc por vista** (bandera `active`/`isActive` + filtro declarado en cada layout + mutations propias), sin estar enrolados en el mecanismo central: `Availability`, `Attendance`, `Journal`, `FormTemplate`, `InstructorTier`. Para ellos, el ocultamiento vive solo en los layouts, así que cualquier consumidor sin ese filtro (MCP, otro mod, reportería) sigue viendo los borrados.

**Migrar un objeto del enfoque por-vista al central**:

1. Declarar `metadata.softDelete: { field }` en el JSON del objeto (usar el campo booleano que ya tiene, ej. `active`).
2. Correr codegen + migración para poblar `softDeleteConfig`.
3. Recrear el cliente del tenant (restart) para que el `$extends` cargue el nuevo registry.
4. Verificar: borrar un registro baja la bandera; desaparece de la lectura genérica y del MCP; `includeInactive` + capability lo recupera; no se puede crear una FK nueva hacia uno inactivo.
5. Una vez validado, **retirar el filtro `active=true` de los layouts** de ese objeto (ya no hace falta: lo aplica el `$extends`). Esto elimina la deuda de filtros dispersos.

**Checklist antes de enrolar un objeto con hijos**: si el objeto es padre en una cascada, revisar antes las secciones 6.1 a 6.3, porque hoy el soft-delete **no** cascadea y podría dejar hijos colgando.

---

## 8. Referencias de código

- Soft-delete (`$extends`, registry, escape hatch, kill-switch): [`object-manager/src/services/tenantManager.js`](../../../up1/object-manager/src/services/tenantManager.js) (`buildSoftDeleteExtension`, `runWithIncludeInactive`, `isSoftDeleteEnabled`, `_loadSoftDeleteRegistry`, `_loadReferencingMap`).
- Rama soft-delete + `includeInactive` en la API: [`object-manager/src/graphql/resolvers/instance.resolver.js`](../../../up1/object-manager/src/graphql/resolvers/instance.resolver.js) (`deleteInstance`, `deleteBulkInstances`, `listInstances`).
- Motor de cascada (hard-delete): [`object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js`](../../../up1/object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js) (`objectDeclaresChildren`, `buildDeleteImpactPlan`, `walkPolymorphicChildren`, `detectRestrictions`, `executeDeletePlan`, `cascadeDeleteIfApplicable`).
- Registry y codegen: [`objects/core/core_ObjectDefinition.json`](../../../up1/object-manager/objects/core/core_ObjectDefinition.json) (`softDeleteConfig`), [`src/services/codegen/generatePrismaSchema.js`](../../../up1/object-manager/src/services/codegen/generatePrismaSchema.js) (`syncSoftDeleteConfigToRegistry`).
- Metadata de hijos (ejemplos reales): [`mods/curriculum-design/objects/Curriculum.json`](../../../up1/mods/curriculum-design/objects/Curriculum.json), [`Offering.json`](../../../up1/mods/curriculum-design/objects/Offering.json), [`planEntry.json`](../../../up1/mods/curriculum-design/objects/planEntry.json).
- Preview en la UI: [`layout/src/layouts/RecordList.vue`](../../../up1/layout/src/layouts/RecordList.vue) (`deleteImpactPreview`, `loadDeleteImpact`, `confirmDeleteRow`).
- Docs de plataforma: [`object-manager/docs/features/soft-delete.md`](../../../up1/object-manager/docs/features/soft-delete.md), [`delete-cascade.md`](../../../up1/object-manager/docs/features/delete-cascade.md).
