---
id: RULE-core-005
project: up1
type: rule
module: core
tags:
  - prisma
  - naming
  - pattern
---

# Prisma relation names en lowercase para multi-word objects

## What

Prisma auto-genera nombres de relacion en lowercase para objetos multi-word. En layouts y resolvers, usar el nombre lowercase (ej: 'timeblocktemplate' no 'TimeBlockTemplate').

## Why

Si el nombre no coincide con lo que Prisma genero, la relacion no se resuelve. Esto causa que FKs muestren UUIDs, embedded lists queden vacias, y includes fallen silenciosamente.

## Where

mods/*/config/layouts/, mods/*/logic/*.resolver.js

## When

Al usar relations en layouts (relations[], include en Prisma) con objetos cuyo nombre tiene multiples palabras.

## Verification

Comparar relation names usados en layouts/resolvers contra los generados en prisma/schema.prisma.

## Source

- **Discovered in**: —
