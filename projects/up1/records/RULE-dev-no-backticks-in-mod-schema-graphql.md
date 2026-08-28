---
id: RULE-dev-no-backticks-in-mod-schema-graphql
project: up1
type: rule
module: dev
tags:
  - graphql
  - schema
  - sync
  - mods
  - typedefs
  - boot
  - object-manager
---

# En descripciones de un `.schema.graphql` de un mod NUNCA usar backticks: rompen el boot de OM

## What

Las `description` (y cualquier texto) dentro de un archivo `.schema.graphql` de un mod NUNCA deben contener backticks (`` ` ``). El generador de `sync:logic` embebe el SDL de TODOS los mods dentro de un **template literal JS** (backticks) en `typeDefs/mods.js` **sin escapar**. Un backtick en el SDL del mod cierra el literal antes de tiempo -> `SyntaxError` al cargar `mods.js` -> **OM no bootea** (nodemon queda en crash). Usar comillas simples/dobles o texto plano.

## Why

Al propagar el resolver del batch a OM (setup de S6), un backtick en la `description` del schema del mod tumbo OM ~2 minutos hasta quitarlo y re-sincronizar. La falla es no-local y confusa: el error aparece en `mods.js` (archivo generado) por un caracter en el schema de un mod, y afecta a TODO OM, no solo al mod. Es una trampa facil de pisar porque en Markdown/docs el backtick es el modo natural de citar codigo.

## Where

- **Files**: `mods/<mod>/logic/*.schema.graphql` (fuente a mantener limpia); `object-manager/.../typeDefs/mods.js` (generado, embebe el SDL en un template literal sin escapar).
- **Layers**: backend / api / config (sync:logic).

## When

Siempre que se escriba o edite un `.schema.graphql` de un mod, en especial las `description` de types/fields/args (donde es tentador citar codigo con backticks).

## Verification

- Grep en `mods/<mod>/logic/*.schema.graphql` por el caracter backtick -> debe ser 0.
- Tras `npm run sync` / `sync:logic`, OM bootea sin `SyntaxError` en `mods.js`.

## Source

- **Discovered in**: TICKET-120 (UPONE-1539), Session 6 (setup runtime, al propagar `planEntry-batch.schema.graphql` a OM).
- **Evidence**: L8 del ticket. Fix `6a43ecc` (drop backticks in batch schema description).
- **Related**: candidato a fix del generador (escapar o usar `String.raw` en el emisor de `typeDefs/mods.js`).
