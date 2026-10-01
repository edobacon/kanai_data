# Decision: config flat propia, arreglar todo, borrar eslint-disable sin efecto

Decidido por el dev el 2026-10-01, sobre las opciones de `analisis-lint-actual.md`.

## Via de integracion: 2, config flat propia

- devDependencies nuevas: `typescript-eslint`, `eslint-plugin-vue`, `vue-eslint-parser`.
- `eslint.config.mjs` con `pluginVue.configs['flat/base']` (trae `vue/comment-directive`, necesario para los eslint-disable de templates) y las reglas `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unused-vars` (ignorando el prefijo `_`) y `vue/no-v-html`, todas en `error`.
- No depende de `.nuxt` ni de `nuxt prepare`.
- Descartadas: modulo `@nuxt/eslint` y `@nuxt/eslint-config` (232 avisos, dependencia mas pesada).

## Tratamiento de lo existente: A, arreglar todo

- Sin baseline ni supresiones: al cerrar, `pnpm lint` termina con 0 errores y 0 avisos.
- Los 20 v-html se revisan uno por uno (escape o sanitizacion) antes de anotarlos; si alguno no es seguro, se corrige el origen, no se silencia.

## eslint-disable sin efecto: a, borrarlos

- Se borran los 44 eslint-disable de `no-console` y `no-control-regex` (no se activan esas reglas).
- Se mantiene el aviso por defecto de ESLint 9 de eslint-disable sin efecto, para que no vuelvan a acumularse.
