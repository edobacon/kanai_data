---
id: RULE-core-042
project: up1
type: rule
module: core
tags:
  - transactions
  - deep-clone
  - prisma
  - serializable
---

# Creates con deep-clone deben ir en $transaction Serializable

## What

Todo create que ejecuta un deep-clone (ej. `prefillFrom.deepClone` en el motor de versionamiento de Curriculum/Plan) MUST envolverse en `prisma.$transaction` con `isolationLevel: 'Serializable'`.

## Why

Un deep-clone toca múltiples tablas relacionadas (mesh completo del registro origen); sin transacción Serializable, un fallo a mitad de camino deja un mesh parcial persistido, inconsistente e irrecuperable sin limpieza manual. Serializable evita además condiciones de carrera entre clones concurrentes del mismo origen. Ver [[DECISION-020]] (capability de clone separada de versionamiento, enforced en el mismo engine).

## Where

`src/graphql/resolvers/instance.resolver.js:4092` (`await prisma.$transaction((tx) => finalizeCreate(tx), { isolationLevel: 'Serializable' })`), path activado por `runtimePrefillFrom` (extraído de `data.prefillFrom` en `instance.resolver.js` cerca de la línea 3219).

## When

Al agregar cualquier nuevo tipo de create que clone o derive un sub-árbol de registros relacionados (no solo el caso de Curriculum/Plan). No aplica a creates simples de un único registro.
