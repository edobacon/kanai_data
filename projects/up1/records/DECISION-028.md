---
id: DECISION-028
project: up1
type: decision
module: core
tags:
  - seeds
  - idempotencia
  - sync
  - object-manager
---

# Motor de seeds idempotente con proteccion de personalizacion

## Contexto

Los seeds de `npm run sync` (fase 8) sobreescribian datos en cada corrida, sin distinguir un registro sembrado sin tocar de uno que un usuario del tenant ya personalizo desde la UI. Cualquier re-seed (deploy, fix de datos demo, actualizacion de catalogo) arriesgaba pisar ediciones reales del tenant sin forma de saberlo.

## Decision

Se implementa `seedUpsert()` en `object-manager/scripts/sync/seedUpsert.js:58`, un motor de find/update/create que antes de escribir revisa `updatedById`: si el campo tiene un valor no nulo (el registro fue editado por un humano via la UI, ver comentario en `seedUpsert.js:201-212`), el registro se salta y no se toca. Los registros sembrados y nunca editados mantienen `updatedById: null`, por lo que siguen actualizables en cada corrida. Se agrega el objeto nuevo `core_SeedExecution` (`object-manager/objects/core/core_SeedExecution.json`) para trackear las corridas de seed por tenant (que se ejecuto, cuando, con que resultado). `syncSeeds` (fase 8) se refactoriza para usar `seedUpsert` en los seeds de formato array y registrar la ejecucion tanto para seeds array como para seeds de tipo funcion.

## Alternativas descartadas

- **Seguir con seeds no idempotentes que sobreescriben todo**: es el comportamiento previo. Se descarta porque cualquier tenant que edito un registro sembrado (ej. un catalogo de roles, un texto de configuracion) perdia esa edicion en el siguiente deploy, sin aviso ni forma de recuperarla.

## Impacto y reversibilidad

Afecta el comportamiento de sync de seeds en todos los tenants: `object-manager/scripts/sync/dbSync.js` (fase 8) y cualquier seed en formato array que pase por `seedUpsert`. La proteccion es conservadora: como `updatedById` es un FK entero a `core_User.id`, cualquier valor no nulo bloquea la actualizacion aunque el edit haya sido trivial. Es reversible a nivel de codigo (revertir el commit deja los seeds no idempotentes de antes), pero no es reversible a nivel de datos: una vez que un registro tiene `updatedById` seteado, seguira protegido salvo que se limpie el campo a mano. Documentado en detalle en `object-manager/docs/features/seed-upsert-engine.md`.
