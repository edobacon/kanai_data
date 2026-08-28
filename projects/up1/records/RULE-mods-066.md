---
id: RULE-mods-066
project: up1
type: rule
module: mods
tags:
  - recordtypes
  - composite
  - position
  - sort
  - codegen
  - prisma
  - curriculum-mapping
---

# En objetos Composite del mod, `position` (y todo campo por el que se ordena) va en la tabla BASE, no en la extension RecordType

## What

Cuando un objeto Composite (patron catalogo maestro-detalle: un scheme con niveles hijos, tipo
`LevelScheme` / `CoverageScheme`) necesita ordenar sus hijos por un campo (`position`), ese campo
MUST declararse en la tabla BASE del hijo, no en una extension `rt__<X>__<base>`. El `sort` desde el
front prefija `extended.` sobre los campos de RecordType, y esa ruta falla al ordenar; con el campo
en la base el `orderBy` resuelve directo.

## Why

El front construye el `orderBy` asumiendo que los campos ordenables viven en la tabla base del
objeto. Un campo declarado solo en el `rt__` queda accesible para lectura (via `baseObject`, ver
[[RULE-mods-032]]) pero no como clave de orden confiable: el prefijo `extended.` que agrega el front
no calza con la columna real y el sort no ordena. Mover `position` a la base habilita el `sort` por
`position` sin tocar el front. Es la decision D-imp-4 registrada en el `CLAUDE.md` del mod
`curriculum-mapping`.

Costo a tener presente: mover un campo de la extension a la base es un cambio de schema (codegen +
prisma migrate al sincronizar) que DROPea la columna en `rt__<X>__<base>` y la crea en la base. En un
tenant con datos reales eso pierde el valor previo de `position` si no se migra el dato aparte:
coordinar por el flujo canonico codegen + sync + migrate, no con un ALTER quirurgico (el sync de up1
no es quirurgico).

## Where

- Schema base del hijo: `mods/<m>/objects/business/**` (declarar `position` en el base, no en
  `objects/RecordTypes/rt__<X>__<base>.json`).
- Precedente: el refactor de `LevelScheme` en `curriculum-mapping` (PR #9 / UPONE-1455) movio
  `position` desde `rt__Level__levelscheme` a la base para habilitar el sort.

## When

Al disenar un objeto Composite (scheme + hijos ordenables) o al detectar que el `sort` por un campo
de un `rt__` no ordena desde la UI. Si el campo solo se lee (no se ordena ni filtra por el), puede
quedar en el `rt__`; la regla aplica a los campos usados como clave de orden.
