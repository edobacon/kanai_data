---
id: RULE-layout-002
project: up1
type: rule
module: layout
tags:
  - layout
  - prisma
  - pattern
  - fk
---

# FK display: relations lowercase, relationDisplayFields PascalCase

## What

En layouts JSON, para mostrar campos FK human-readable: 'relations' usa el nombre de relacion Prisma en lowercase (ej: 'myobject'), 'relationDisplayFields' usa el nombre del Object en PascalCase apuntando al campo a mostrar (ej: { MyObject: 'name' }).

## Why

Prisma auto-genera nombres de relacion en lowercase para multi-word objects. Si el case no coincide, la relacion no se resuelve y la UI muestra UUIDs en vez de valores legibles.

## Where

mods/*/config/layouts/

## When

Al crear layouts que muestran campos FK (foreign keys) de objetos relacionados.

## Verification

Verificar en el layout JSON: relations[] tiene nombres lowercase, relationDisplayFields tiene keys PascalCase.

## Source

- **Discovered in**: —
