---
id: RULE-mods-049
project: up1
type: rule
module: mods
tags:
  - sync
  - graphql
  - schema
  - pattern
---

# Descripciones en .schema.graphql de mods — sin backticks

## What

Las descripciones GraphQL (bloques `"""..."""` o strings `"..."`) en un `mods/*/logic/*.schema.graphql` NO deben contener backticks (`` ` ``). Usar texto plano.

## Why

`scripts/sync.js` embebe el contenido de cada `.schema.graphql` dentro de un template literal JS (delimitado por backticks) en `object-manager/src/graphql/typeDefs/mods.js`. Un backtick en la descripcion cierra el template literal antes de tiempo → SyntaxError → object-manager crashea al rebootear (nodemon queda esperando) y el puerto 4000 deja de responder. Sintoma observable: tras `npm run sync`, la suite no puede crear/leer nada porque el backend esta caido.

## Where

mods/*/logic/*.schema.graphql (campos de descripcion de tipos, campos y mutations)

## When

Al escribir o editar descripciones en schemas GraphQL de mods. Especialmente al documentar mutations/queries custom con ejemplos de codigo (la tentacion de usar backticks para `inline code` es alta).

## Verification

Tras `npm run sync` (o `npm run sync --workspace=object-manager`), correr `node --check object-manager/src/graphql/typeDefs/mods.js` — debe salir sin error. Alternativa: grep de `` ` `` dentro de bloques de descripcion en los `.schema.graphql` del mod.

## Source

- **Discovered in**: TICKET-070 (up1, mod curriculum-design) — la descripcion de `createCurriculumWithRecordType` usaba `` `data.recordType` `` y crasheo object-manager en `mods.js:408`.
