---
id: RULE-core-053
project: up1
type: rule
module: core
---

**Que.** Cuando un objeto se registra para soft-delete del core (`core_ObjectDefinition.softDeleteConfig={field:...}`), el $extends global de `tenantManager.js` reescribe `delete`/`deleteMany` sobre ese modelo: en vez de borrar la fila, hacen `update`/`updateMany` seteando el campo bandera en `false`. Todo codigo que use `context.prisma.<modelo>.delete()` sobre ese modelo pasa a soft-deletear, aunque su intencion fuera un borrado FISICO.

**Por que.** El override vive en el cliente extendido que usan TODOS los resolvers (core y mods), no solo el CRUD generico. Un resolver de mod con delete custom por Prisma directo tambien queda afectado.

**Donde.** `tenantManager.js`: wrappers `delete`/`deleteMany` de `buildSoftDeleteExtension` (redirigen a `update`/`updateMany` con `{[field]: false}`). Caso real: `curriculum-mapping/logic/levelScheme-upsert.resolver.js:490` `deleteLevelScheme` borra en UNA transaccion, por Prisma directo, las filas RT (`rt__Level__levelscheme`, `rt__Scheme__levelscheme`) y la base (`LevelScheme`), a proposito sin el `deleteInstance` generico.

**Riesgo de adopcion.** Si `LevelScheme` adoptara el soft-delete del core pero sus tablas RT NO estan en el registry, `deleteLevelScheme` quedaria a medias: la fila base se SOFT-deletea (queda con la bandera en false) mientras las filas RT se HARD-borran, dejando un base sin su extension RT (estado inconsistente).

**Cuando aplica.** Al registrar soft-delete del core sobre un objeto que ya tiene un delete custom (mod-owned) que asume borrado fisico, sobre todo objetos RecordType con hijos/tablas RT.

**Como cumplir.** Antes de adoptar el soft-delete del core sobre un objeto con delete custom: (a) revisar cada `prisma.<modelo>.delete()` del path y decidir si debe seguir siendo hard (usar el cliente base sin extends, o `runWithIncludeInactive` no alcanza porque el override de delete no depende del ALS) o pasar a soft; (b) registrar de forma coherente las tablas hijas/RT (o excluirlas explicitamente) para no dejar base y RT en estados distintos; (c) si el objeto necesita ambos (soft para el usuario, hard para limpieza), separar los caminos.

**Verificacion.** Comprobado sobre el cliente extendido real en un tenant scratch: `prisma.levelScheme.delete({where})` con `LevelScheme` registrado deja la fila con `isActive=false` (soft), no la borra. Identico en `develop` y en la rama UPONE-1740 (comportamiento del mecanismo, no una regresion). El caso multi-tabla inconsistente es analisis del path de `deleteLevelScheme` + lo observado del override; no se ejercito end-to-end el delete custom completo.

**Fuente.** Smoke de la bateria clonado x soft-delete (UPONE-1740), test `sd-cm-smoke.test.js`, caso "DELETE del core adoptado". Codigo: `tenantManager.js` (buildSoftDeleteExtension, wrappers delete), `levelScheme-upsert.resolver.js:490` (deleteLevelScheme). Relacionada: RULE-core-052.
