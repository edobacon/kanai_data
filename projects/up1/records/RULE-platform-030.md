---
id: RULE-platform-030
project: up1
type: rule
module: platform
tags:
  - npm
  - lockfile
  - eslint
  - ajv
  - monorepo
  - tooling
---

# El lockfile raiz se regenera junto con cualquier cambio de version de dependencia en un workspace; eslint se pinea en el root para hoist deterministico

## What

Dos convenciones de tooling del monorepo, ambas motivadas por roturas reales de `npm install`:

1. Cualquier alta, cambio o **revert** de version de dependencia en un `package.json` de workspace (`layout`, `curriculum-design`, etc.) SHOULD ir acompañado de la regeneracion del `package-lock.json` raiz. No editarlo a mano ni dejarlo desincronizado del grafo real.
2. `eslint` se pinea como devDependency en el `package.json` raiz (hoy `^9.0.0`) para que el hoist de npm sea deterministico, y el `overrides.ajv` debe quedar en una version compatible con `eslintrc` (`^6.12.6`), nunca la ultima major de `ajv`.

## Why

- **Lockfile stale tras un revert**: un commit (`005a15e`) agrego paquetes de vitest para `layout` y regenero el lock raiz con el grafo de vitest 4. Un commit posterior revirtio `layout/package.json` a vitest `^3.2.6`, pero el lock raiz **no** se regenero junto con ese revert: quedo con entradas del grafo de vitest 4 mientras `layout` pedia vitest 3, y `npm install` fallaba con `ERESOLVE` en **todo** el monorepo, no solo en `layout`. El fix (`a3ae9d6`) removio las entradas stale y re-reconcilio el lock, verificado contra la suite completa de `layout` (1891/1891 unit, 905/905 storybook).
- **eslint sin pin + ajv en la ultima major**: sin un pin explicito en el root, un workspace que fija una version distinta (`curriculum-design` pineaba `^8`) podia terminar shadow-eando el hoist para los demas workspaces. Ademas, el override de `ajv` en `8.18.0` rompia `eslintrc` al cargar, porque `eslintrc` espera las opciones de la API de `ajv` 6. El fix (`81ed54e`) pinea `eslint: ^9.0.0` en el root y relaja `ajv` a `^6.12.6` (CVE-patched, compatible con `eslintrc`).

## Where

- `package.json` raiz: `devDependencies.eslint` (`^9.0.0`), `overrides.ajv`/`overrides["@eslint/eslintrc"].ajv` (`^6.12.6`)
- `package-lock.json` raiz (se regenera, no se edita a mano)
- Commits de referencia: `005a15e` (alta que rompio el grafo), `a3ae9d6` (fix del lockfile stale), `81ed54e` (pin de eslint + relax de ajv)

## When

Al cambiar la version de cualquier dependencia (incluido un revert) en un `package.json` de workspace: correr `npm install` desde la raiz antes de commitear, para que el lock quede reconciliado con el cambio. Al tocar `eslint` o `ajv` en cualquier workspace, verificar que no rompa el pin/override del root.
