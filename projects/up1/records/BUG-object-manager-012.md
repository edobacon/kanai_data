---
id: BUG-object-manager-012
project: up1
type: bug
module: object-manager
tags:
  - delete-cascade
  - recordtype
  - soft-delete
  - walk
  - metadata
---

# El walk de cascada releia la metadata del objeto raiz en cada iteracion, y el bulk-delete corria el chequeo FK legacy sobre soft-delete

## Symptom

En una cascada heterogenea de 3 o mas niveles, los nietos nunca se descubrian y `detectRestrictions` podia culpar al padre equivocado por una restriccion que en realidad pertenecia a un nieto. En paralelo, `deleteBulkInstances` bloqueaba objetos con soft-delete declarativo por una referencia FK que no aplica: nada se borra fisicamente en un soft-delete, asi que el chequeo de referencia legado no debia correr sobre esos objetos.

## Expected behavior

El walk de cascada deberia descubrir todos los niveles, incluidos los nietos, leyendo la metadata propia de cada nodo frontier, y atribuir una restriccion al nodo que realmente la declara. El bulk-delete no deberia aplicar el chequeo FK legado a objetos con soft-delete declarativo.

## Root cause

File: `object-manager/src/graphql/resolvers/helpers/deleteImpactPlan.js` (walk de `buildDeleteImpactPlan`; linea exacta no confirmada, archivo grande con el walk recursivo completo), `object-manager/src/graphql/resolvers/instance.resolver.js:6130-6139` (`validateBulkDelete`, con el comentario "SKIP para objetos soft-delete").

Cause: el walk de `buildDeleteImpactPlan` leia la metadata del objeto raiz de la cascada en cada iteracion, en vez de la metadata propia de cada nodo frontier (el nivel que se esta expandiendo). En una cascada de 3+ niveles con tipos de objeto distintos por nivel, eso significa que el segundo salto (nietos) seguia leyendo la metadata del root y nunca encontraba sus propios hijos declarados. Por separado, `deleteBulkInstances` corria `validateBulkDelete` (chequeo de referencia FK por convencion de nombre) incondicionalmente, sin excluir objetos que declaran `softDeleteConfig`.

Encontrado validando UPONE-1605 (delete de `Scenario`) contra datos reales de UPU, no contra prisma mockeado (ver [[RULE-core-034]]).

## Fix

El walk ahora lee la metadata del nodo frontier en cada iteracion, no la del root. `deleteBulkInstances` ahora salta `validateBulkDelete` cuando el objeto tiene `softDeleteConfig` resuelto (`bulkSoftField`), documentado en el propio codigo como "SKIP para objetos soft-delete (UPONE-1605 follow-up)".

## Impact

| Area | Antes | Despues |
|---|---|---|
| Cascada heterogenea 3+ niveles | nietos no descubiertos, restriccion atribuida al padre equivocado | walk por metadata del nodo frontier, cascada completa |
| Bulk-delete sobre objeto soft-delete | bloqueado por chequeo FK legacy que no aplica | chequeo FK legacy se saltea para objetos soft-delete |

## Reproduction

### Steps
1. Armar una cascada de eliminacion heterogenea de 3 o mas niveles (objeto raiz, hijo y nieto de tipos distintos).
2. Invocar `buildDeleteImpactPlan` sobre el objeto raiz.
3. Verificar que los nietos no aparecen en el plan y que una restriccion propia de un nieto se atribuye al padre.
4. Ejecutar `deleteBulkInstances` sobre un objeto con `softDeleteConfig`: el bulk queda bloqueado por el chequeo FK legado pese a no borrar nada fisicamente.
