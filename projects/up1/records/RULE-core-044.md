---
id: RULE-core-044
project: up1
type: rule
module: core
tags:
  - recordtype
  - rt
  - foreign-key
  - casing
  - introspection
  - information_schema
  - prisma
  - queryraw
  - delete
---

# El casing de la FK de una proyeccion RecordType no es derivable del nombre del objeto: resolver por introspeccion

## What

La columna FK con que una tabla de proyeccion `rt__*` referencia a su fila base NO se puede ensamblar como `${base}Id` ni descubrir por `endsWith('__' + base.toLowerCase())` case-sensitive. El casing real varia: `OrgUnit` -> `OrgUnitId`, `Activity` -> `ActivityId`, pero `Availability` -> `availabilityId` (FK en minuscula pese al objeto en PascalCase). Toda operacion que limpie o recorra proyecciones `rt__` MUST resolver el nombre de tabla `rt__*` y su columna FK por **introspeccion** (`information_schema`, o `core_FieldDefinition`), nunca por string armado.

## Why

Con el nombre de columna equivocado, el `deleteMany` de la proyeccion va a un `try/catch` silencioso, la proyeccion queda colgando y el borrado de la fila base FK-crashea (RESTRICT). Es un fallo silencioso que solo aparece en objetos cuya proyeccion RT tiene FK con casing no-estandar, y queda enmascarado en objetos que declaran hijos (el motor de cascada limpia por su cuenta) o latente cuando las tablas `rt__` estan vacias. Es corolario de [[rule-core-043]] (el RT es un alias del base; sus columnas fisicas no se infieren del alias).

## Where

`object-manager/src/graphql/resolvers/instance.resolver.js` — helper `resolveRtProjectionFks` (UPONE-1479): consulta `information_schema` por las tablas `rt__*` con FK a `<base>.id` y devuelve `{ rtTable, fkCol }`. Match de la tabla base con `LOWER()` en ambos lados (tolera el delegate camelCase de Prisma). Filtro de prefijo con `LEFT(table_name,4) = 'rt__'` — NO `LIKE 'rt\_\_%'`: en un template literal de JS el escape `\_` colapsa a `_` y queda como comodin. Regla derivada para `$queryRaw`: filtrar prefijos con guiones bajos por `LEFT`/`substring` o parametro bindeado con `ESCAPE`, nunca `LIKE` con backslash en template literal.

## When

Cualquier codigo que borre, recorra o proyecte capas `rt__`/`ext__` de un objeto base. Al agregar un objeto nuevo con proyeccion RT, no asumir el casing de su FK: resolverlo. Al escribir `$queryRaw` con filtros `LIKE` sobre nombres con `_`, verificar el patron efectivo (los backslashes se pierden en el cooking del template literal).
