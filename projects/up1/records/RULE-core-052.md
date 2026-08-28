---
id: RULE-core-052
project: up1
type: rule
module: core
---

**Que.** El $extends global de soft-delete (`buildSoftDeleteExtension` en `object-manager/src/graphql/resolvers/services/tenantManager.js`) oculta los registros inactivos de forma ASIMETRICA segun la operacion:
- `findMany`/`findFirst`/`count`/`aggregate`/`groupBy`: usan `injectWhere`, que agrega `where {<campo>: true}` a la query. El filtro lo aplica la DB, asi que funciona sin importar el `select`.
- `findUnique`/`findUniqueOrThrow`: usan `dropIfInactive`, que corre la query y DESPUES descarta el resultado si `res[<campo>] === false`. Si el `select` NO incluye el campo bandera, `res[<campo>]` es `undefined`, nunca `=== false`, y la fila inactiva **se filtra igual por la DB? NO**: se devuelve (leak).

**Por que.** `dropIfInactive` es post-query y select-dependiente. Un `findUnique` con `select` angosto (sin el flag) devuelve el registro soft-deleted como si estuviera vivo.

**Donde.** `tenantManager.js`: `injectWhere` y `dropIfInactive` dentro de `buildSoftDeleteExtension` (query-extension de `$allModels`, wrappers `findMany`/`findUnique`). Caso real: `curriculum-mapping/logic/levelScheme-upsert.resolver.js:434` `readSourceForClone` hace `findUnique({ where:{id}, select:{recordType:true} })` (sin el flag), asi que si `LevelScheme` adoptara el soft-delete del core leeria un esquema fuente soft-deleted al clonar.

**Cuando aplica.** Cualquier objeto registrado en `core_ObjectDefinition.softDeleteConfig`, leido por `findUnique`/`findUniqueOrThrow` con un `select` que no incluya el campo bandera. No aplica a `findMany` (filtra siempre en DB).

**Como cumplir.** Al leer por PK un objeto que puede tener soft-delete: (a) incluir el campo bandera en el `select` para que `dropIfInactive` pueda descartarlo, o (b) chequear existencia/vigencia con `findFirst({ where:{ id } })` (que si filtra por DB). Nunca asumir que `findUnique` oculta el inactivo.

**Verificacion.** Comprobado empiricamente sobre el cliente extendido real (`tenantManager.getClient`) en un tenant scratch: `findUnique` con `select:{recordType:true}` devuelve la fila inactiva (leak); con `select:{recordType:true,isActive:true}` devuelve `null` (dropeada); `findMany` la filtra siempre. Identico en `develop` y en la rama UPONE-1740 (no es una regresion; es el comportamiento del mecanismo).

**Fuente.** Smoke de la bateria clonado x soft-delete (UPONE-1740), test `sd-cm-smoke.test.js`, caso "el drop de soft-delete en findUnique es select-dependiente". Codigo: `tenantManager.js` (buildSoftDeleteExtension), `levelScheme-upsert.resolver.js:434` (readSourceForClone).
