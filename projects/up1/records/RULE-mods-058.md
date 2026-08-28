---
id: RULE-mods-058
project: up1
type: rule
module: mods
tags:
  - typecheck
  - vue-tsc
  - quality-gate
  - publicacion
  - seed
  - jsdoc
  - checkout-limpio
  - worktree
---

# Al publicar (push/PR), correr el typecheck aparte y clasificarlo en **checkout limpio**; tipar la coleccion inyectable del loader

## What

La suite verde y el typecheck son **gates independientes**: `vitest` transpila con esbuild y no
chequea tipos, asi que un archivo puede tener errores de TS con todos sus tests en verde. Por lo
tanto, al **publicar** (push o apertura de PR) el typecheck MUST correrse aparte, y su resultado MUST
clasificarse en **introducido vs preexistente** midiendo en **checkout limpio**, no en el working dir.

```bash
# 3 mediciones, cada una en su propio worktree — FUERA de mods/ (ver Gotcha)
git worktree add /tmp/tc-base <merge-base> && (cd /tmp/tc-base && npm run typecheck)
git worktree add /tmp/tc-dev  origin/develop && (cd /tmp/tc-dev  && npm run typecheck)
git worktree add /tmp/tc-head HEAD          && (cd /tmp/tc-head && npm run typecheck)
```

`introducidos = errores(HEAD) - errores(merge-base)`. Solo esos son del ticket.

**Corolario sobre la causa raiz**: en un loader `.js`, un parametro de **coleccion inyectable sin
tipo declarado** hace que TS infiera el contrato **de la data de demo**. Todo loader con coleccion
inyectable (ver [RULE-mods-057](RULE-mods-057.md)) MUST declarar su typedef JSDoc explicito. El fix
va en el **loader**, no en un cast del test.

```js
/**
 * @typedef {Object} CurriculumSeedEntry
 * @property {string}      code
 * @property {string|null} [plan]              // null es valido: la rama sin satelite existe
 * @property {string|null} [ownerProgramCode]
 * @property {string}      [status]
 */
export async function loadCurricula(prisma, tenantId, entries = CURRICULA) { … }
```

## Why

En TICKET-113 (S5.T6) el hook de pre-push reporto typecheck en rojo — y es **advisory**, o sea el
rojo se va en el scroll del push. Medido en checkout limpio: 77 errores preexistentes (base y
`origin/develop`) vs 84 en HEAD ⇒ **7 introducidos**, todos en `seed-counts.test.ts`, un archivo que
la suite corria en verde (1435 tests).

Los 7 salian de la causa raiz de arriba: `loadCurricula` y `loadMallas` son `.js` y su coleccion
inyectable no tenia tipo, asi que TS lo infirio del array de demo — donde los 20 planes traen `plan`
y `ownerProgramCode` siempre poblados y las 301 Activity no traen `status`. Los que pagaban eran
justo los tests que S5 agrego para vigilar las ramas que se quedaron **sin data** (`plan: null`,
`status: 'Draft'`). O sea: **la data definia el contrato del loader**, y el precio lo pagaba la
vigilancia que exige [RULE-mods-057](RULE-mods-057.md).

Medir en el working dir da un numero falso: en un mod de up1 el directorio tiene **symlinks**
(`components` -> `layout/src/components`, que entra al programa de TS sin estar versionado en el
repo del mod) y artefactos sincronizados. En este caso el ruido local inventaba 2 errores en
`.stories.ts` que **no existen** en checkout limpio.

## Where

- Loaders con coleccion inyectable: `mods/{mod}/seed/_data-*.js`.
- Momento: gate de la session que publica (push / PR), y en el cierre del ticket antes del handoff.
- Comando: `npm run typecheck` del mod (`vue-tsc --noEmit`), no el `npm test`.

## When

En todo ticket de un mod que llegue a push/PR. Es **adicional** a la suite verde, nunca sustituto.

**Gotcha operativo**: un worktree temporal creado **dentro** de `mods/` rompe `npm test` del monorepo
(*"multiple workspaces with the same name"*). Crearlo fuera del arbol del monorepo (`/tmp`) o
borrarlo antes de correr la suite.

## Verification

Post-fix, re-medir en worktree limpio: `errores(HEAD) == errores(merge-base)` ⇒ 0 introducidos. En
TICKET-113 quedo 77/77 con la suite en 80 archivos / 1435 tests verde (commit `c18cfd4`, sin cambio
de runtime).

## Source

- **Discovered in**: TICKET-113 / UPONE-1456 — S5.T6, al publicar el [PR #33](https://bitbucket.org/uplanner/curriculum-design/pull-requests/33).
- **Extiende**: [RULE-mods-052](RULE-mods-052.md) (tests verdes no garantizan tipos: correr `vue-tsc`)
  — 052 fija *que* hay que correrlo; esta fija *como clasificarlo* (checkout limpio) y de donde salio
  la clase de error mas comun en seeds.
- **Relacionada**: [RULE-mods-057](RULE-mods-057.md) (colecciones inyectables) — el typedef es el
  requisito que faltaba para que 057 no rompa el typecheck.
