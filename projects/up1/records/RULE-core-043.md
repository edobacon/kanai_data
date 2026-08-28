---
id: RULE-core-043
project: up1
type: rule
module: core
tags:
  - recordtype
  - borrado
  - delete
  - cascada
  - soft-delete
  - restrict
  - datalog
  - alias
  - objecttype
  - instance-resolver
---

# El nombre de un RecordType es un alias de presentacion: resolver a base antes de aplicar la politica de borrado

## What

Cuando un resolver recibe un `objectType` con forma `rt__<RT>__<base>`, ese nombre es solo un **alias de presentacion** del objeto base (como lo arma el list layout). La metadata que gobierna el borrado (`directChildren`, `softDeleteConfig`, referencias `Restrict`) vive en el objeto **base**, no en la proyeccion RT. Por eso todo borrado que entre por el nombre RT MUST resolver el `objectType` a su nombre base canonico (via `core_ObjectDefinition`, `name` insensitive) **al inicio** del resolver, y enrutar por el mismo camino generico que la entrada base. Aplica a `deleteInstance` y `deleteBulkInstances` por igual (misma causa raiz).

## Why

El `objectType` de entrada NO debe cambiar la politica de borrado del registro real: borrar por el nombre base o por el nombre RT tiene que producir el mismo resultado (cascada de hijos, bloqueo `Restrict`, soft-delete, DataLog por nodo). Una rama RT que borre las capas del registro y retorne antes del motor de cascada/soft-delete deja hijos huerfanos y, si el objeto declara `softDelete`, lo elimina fisicamente: inconsistencia silenciosa, sin error (UPONE-1479, descubierto con `LevelScheme` de `curriculum-mapping`). El camino generico ya limpia las proyecciones `rt__`/`ext__` del base, asi que resolver a base no deja proyecciones colgando.

## Where

`object-manager/src/graphql/resolvers/instance.resolver.js` — `deleteInstance` y `deleteBulkInstances`. El parser `parseRecordTypeFileName` (`src/services/fileParsing.js`) provee el RT->base. Corolario para sinks que leen el `objectType` original de `args` (wrappers/decorators como `withEventPublish`, `withDataLog`): al reasignar `objectType` internamente, preservar el valor original (`rawObjectType`) para esos sinks, de modo que el evento `delete` y la auditoria mantengan el `objectType` de entrada y no diverjan entre entrypoints.

## When

Siempre que un resolver ramifique su comportamiento segun `objectType` y ese `objectType` pueda llegar como nombre de RecordType. Vale para borrado hoy; el mismo principio (alias RT -> base para leer metadata) aplica a cualquier logica futura gobernada por la metadata del objeto base. La cobertura de test MUST entrar por el nombre RT (no solo por el base) y por ambos entrypoints; los unit mockeados no cazan el huerfano silencioso, exige integration/smoke contra BD real (ver TICKET-117 L2/L3).
