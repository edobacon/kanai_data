---
id: RULE-core-049
project: up1
type: rule
module: core
tags:
  - codegen
  - prisma
  - metadata
  - information_schema
  - generalization
---

# La fuente de verdad es el artefacto generado o la BD real, no la metadata declarada en el JSON del objeto

## What

Toda decision de codigo que dependa de una propiedad estructural de un modelo (tipo de PK, nombre de columna FK, presencia de un indice, etc.) MUST leerse del artefacto realmente generado (el schema Prisma emitido, `information_schema`) o de la BD real, nunca de la metadata declarada en el JSON del objeto de origen ni de una convencion de nombres/prefijos. El codegen puede divergir de lo que el JSON declara.

## Why

`hasIntegerId()` decidia si un objeto usa PK entera leyendo `metadata.idType` del JSON o el prefijo `core_` del nombre; ninguna de las dos fuentes es confiable porque el codegen nunca consulta `metadata.idType` al emitir modelos core (siempre escribe `id Int @id @default(autoincrement())`) y existen modelos `core_*` cuya PK no sigue el patron. El fix lee el schema Prisma generado en runtime: `readTenantSchema(tenantId)` mas una regex sobre el bloque `model <objectType> { ... }`, exigiendo literalmente `id Int @id`.

Esta rule generaliza [[RULE-core-044]] (la FK de una proyeccion RT no se deriva del nombre, se introspecciona `information_schema`), que es el mismo principio aplicado a un caso mas especifico: casing de columna FK en vez de tipo de PK.

Source_ref: `object-manager/src/events/decorators/withDataLog.js:176` (`hasIntegerId`, lee `readTenantSchema` y una regex sobre el modelo, no `metadata.idType` ni el prefijo `core_`).

## Where

`object-manager/src/events/decorators/withDataLog.js` (caso puntual de esta rule), y en general cualquier codigo del object-manager que necesite inferir una propiedad estructural de un modelo generado por codegen.

## When

Al escribir codigo nuevo que necesite saber "que tipo es esta columna" o "como se llama esta FK": preguntar al schema generado o a `information_schema`, no leer el JSON de origen ni asumir una convencion de nombres.
