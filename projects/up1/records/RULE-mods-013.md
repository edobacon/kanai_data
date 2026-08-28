---
id: RULE-mods-013
project: up1
type: rule
module: mods
---

# Dependencies de runtime peer van en peerDependencies, no en dependencies

## What

El `package.json` de un mod NO debe declarar como `dependencies` las librerías que el host (layout/suite) ya provee: `vue`, `@vueform/vueform`, `@apollo/client`, `graphql`, `graphql-tag`, `pinia`, etc. Estas deben ir en `peerDependencies` (si aplica) o simplemente omitirse. Sólo declarar `dependencies` para utilidades exclusivas del mod que el host no provee.

## Why

Los mods no se ejecutan independientemente — son sincronizados a los workspaces de core por `npm run sync`. Declarar peer libs como `dependencies` infla `node_modules/{mod}/` innecesariamente (60MB+ por mod), puede instalar versiones divergentes de la misma librería provocando conflictos de instancia (ej. dos copias de Vue reactivas en distinta store), y en CI incrementa tiempo y ancho de banda.

## Where

En `mods/{mod}/package.json` campo `dependencies`.

## When

Al crear o editar el `package.json` de cualquier mod.

## Verification

Revisar que el `dependencies` del mod no liste `vue`, `@vueform/vueform`, `@apollo/client`, `graphql`, `graphql-tag`, `pinia`, ni otras librerías presentes en el `dependencies` de layout/suite. El mod funciona sin ellas tras `npm run sync`.

## Source

- **Discovered in**: TICKET-001
