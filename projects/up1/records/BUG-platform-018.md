---
id: BUG-platform-018
project: up1
type: bug
module: platform
tags:
  - backticks
  - SDL
  - mods.js
  - template-literal
  - SyntaxError
  - object-manager
  - codegen
  - sync
  - docstring
---

# Backticks en docstrings SDL crashean el object-manager al bootear

## Symptom

Tras un `npm run sync` que agrega SDL nuevo con backticks en docstrings (bloques `""" ... """`), el object-manager falla silenciosamente al bootear: nodemon queda vivo pero el server no escucha en `:4000`. `curl http://localhost:4000` devuelve `000` (conexión rehusada). No hay error visible en pantalla salvo si se captura stderr del proceso.

## Expected behavior

El object-manager inicia correctamente tras `npm run sync` y responde en `:4000` independientemente del contenido de los docstrings SDL de los mods.

## Root cause

El codegen de object-manager embebe el SDL completo dentro de un template literal JavaScript en `object-manager/src/graphql/typeDefs/mods.js` (generado por el sync). Un backtick dentro del docstring SDL termina prematuramente el template string, produciendo un `SyntaxError: Unexpected identifier` en Node.js cuando se importa `mods.js` al bootear. El archivo `mods.js` se genera por `sync:logic` sin error (el sync no ejecuta el JS, solo lo escribe), por lo que el fallo solo aparece en el arranque del server. Detectado en TICKET-064 S1: el docstring de `createSyllabusOffering` tenía caracteres de backtick en \`code\`/\`@unique\` dentro de la descripción. Archivos involucrados: `mods/curriculum-design/logic/<mod>.schema.graphql` (cualquier docstring con backtick) → `object-manager/src/graphql/typeDefs/mods.js` (generado, no editar directo).

## Impact

El object-manager no levanta en `:4000`. Cualquier operación que requiera el server (smoke, introspcción, tests de integración) falla. Bloqueante de desarrollo.

## Reproduction

1. Agregar un docstring con backtick en un schema.graphql de mod, ej: `mutation createX { """crea con \`code\` unico""" }`. 2. `npm run sync`. 3. `npm run dev` en object-manager. 4. `curl http://localhost:4000` → `000`.

## Workaround

Eliminar todos los backticks de los docstrings SDL (bloques `""" ... """`): usar texto plano, comillas simples o asteriscos. Verificar el boot del OM tras cada `sync` que agregue SDL nuevo: `node src/index.js 2>&1 | head -20` debe terminar en `[nodemon] starting 'node ...'` sin `SyntaxError`.

## Solution

Pendiente.

## Related

- **Specs**: —
- **Tickets**: TICKET-043, TICKET-064
