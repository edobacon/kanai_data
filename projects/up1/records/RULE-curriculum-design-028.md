---
id: RULE-curriculum-design-028
project: up1
type: rule
module: curriculum-design
tags:
  - alias
  - delegate
  - read
  - fallback
  - null-safety
---

# Delegate-con-alias en READ: fallback a `getInstance` base si la extension devuelve null

## What

El branch RecordType del generic READ hace `findFirst` sobre la fila de extension (`rt__<RT>__<base>`) y devuelve null si NO existe; el delegate-con-alias DEBE fallback al `getInstance` base cuando la extension es null.

## Why

Una version v2 (workflow-less) cuya extension RT no se arrastro en la migracion mostraria `Record Not Found` sin el fallback. El registro base sigue siendo legible con sus campos base aunque la extension no exista.

## Where

Override del mod en el read con delegate-con-alias (incl. resolver del Curso/Plan/Minor).

## When

Implementacion de cualquier delegate-con-alias READ en el mod.

## Verification

Test de regresion con Plan v2 sin extension rt__Plan__curriculum (curl o UI).

## Source

- **Discovered in**: TICKET-075
