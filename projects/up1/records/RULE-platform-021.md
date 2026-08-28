---
id: RULE-platform-021
project: up1
type: rule
module: platform
tags:
  - graphql
  - typedefs
  - sync
  - codegen
  - deploy
  - mods
  - generated-artifacts
---

# Al retirar/renombrar un tipo o schema GraphQL de un mod, regenerar Y committear el typedef generado (mods.js), o el object-manager no arranca

## What

`object-manager/src/graphql/typeDefs/mods.js` (y `up1.js`) son artefactos **generados pero TRACKED** (committeados en git, no gitignored). Se generan concatenando los `.graphql` de `mods/*/logic/` (y de los proyectos core).

Si un commit retira o renombra un tipo/schema GraphQL de un mod pero **NO regenera y committea `mods.js`**, queda un `mods.js` viejo referenciando un tipo inexistente. Apollo falla al construir el schema con `Error: Unknown type "X"` (`assertValidSDL`), **antes de tocar la DB**. El object-manager no levanta y la suite queda "sin permiso / sin apps" (síntoma downstream de backend caído, no un problema de permisos ni de datos).

Caso origen: UPONE-1380 retiró el tipo `ChangeLog` (consolidado en `DataLog`) borrando `curriculum-design/logic/auditCapture.schema.graphql`, pero el `mods.js` committeado siguió con `rows: [ChangeLog!]!` → crash en cualquier arranque desde el checkout sin regenerar.

## Why

`mods.js` es fuente-de-verdad frágil: al ser un artefacto committeado, su correctitud depende de la disciplina de regenerarlo en el mismo commit que cambia el schema fuente. `npm run dev` (nodemon directo) no regenera typedefs al arrancar: confía ciegamente en el archivo committeado. Un artefacto viejo = crash duro de arranque.

## Where

- **Files**: `object-manager/src/graphql/typeDefs/mods.js` y `up1.js` (generados, tracked); fuente: `mods/*/logic/*.schema.graphql`
- **Generador**: `object-manager/scripts/sync/logicSync.js` → `generateModsTypeDefs()` (regenera completo, sobrescribe)
- **Layers**: backend / api / build / deploy

## When

Siempre que un commit **retire, renombre o modifique** un tipo/type/input/schema GraphQL en `mods/<mod>/logic/*.schema.graphql` (o en los schemas de proyectos core). Aplica también al retirar un objeto que aparecía como tipo en typedefs generados.

## Verification

- **Regeneración aislada sin BD**: `npm run sync:logic` (reescribe `mods.js`/`up1.js` desde el fuente). Alternativa: `SKIP_DB_OPERATIONS=true npm run sync`.
- **Gate sugerido (CI/pre-commit)**: correr `sync:logic` y fallar si `mods.js` difiere del committeado (`git diff --exit-code src/graphql/typeDefs/mods.js`). Existe `scripts/detect-schema-drift.js` que escanea typedefs generados.
- **Chequeo manual rápido**: `grep -c "<TipoRetirado>" src/graphql/typeDefs/mods.js` debe dar 0 tras regenerar.

## Recuperación (cuando ya ocurrió)

1. `npm run sync`. Si aborta en la fase 3 (Prisma apply) por cambio destructivo (post-reset o reducción de schema): el sync NO tiene flag `--accept-data-loss`, por diseño aborta y pide correr a mano:
   `npx prisma db push --schema prisma/<TENANT>/schema.prisma --accept-data-loss`
2. Re-correr `npm run sync` completo (ahora el push queda in-sync y corren las fases 5/6/8: typedefs, apps/layouts, seeds).

Ojo con el orden de fases: en `SyncManager.performSync` el apply de Prisma (fase 3) corre ANTES de la regeneración de typedefs (fase 5 Logic). Un push destructivo en fase 3 aborta todo el sync, dejando los typedefs sin regenerar. Por eso el desbloqueo rápido del arranque es `sync:logic` / `SKIP_DB_OPERATIONS=true`, independiente de la BD.

## Prevención en otros ambientes (sin modificar el proceso de sync)

- **Deploy**: los builds via `object-manager/Dockerfile` (AWS/prod) SON inmunes — corren `sync:files` + `sync:logic` + `codegen` y regeneran `mods.js` desde el fuente en cada build. El error solo aparece en ambientes que arrancan desde el checkout sin regenerar: dev local (`npm run dev`) y el `./Dockerfile` raíz (`CMD npm run dev`), que confían en el artefacto committeado. Acción: verificar que staging/prod usen el Dockerfile de object-manager y no el `./Dockerfile` raíz de dev; si algún ambiente arranca sin regenerar, agregar `RUN npm run sync:logic` (+ `codegen`) antes del start.
- **Git**: committear el `mods.js` regenerado en el mismo commit que cambia el schema del mod (quirúrgico: solo los typedefs, sin arrastrar drift no relacionado del working tree).

## Source

- **Discovered in**: sesión de debugging ad-hoc, 2026-07-15 (up1 corriendo en `uplanner/up1`, tenant UPU; síntoma reportado: "sin permiso / no muestra apps")
- **Evidence**: `object-manager.log` con `Error: Unknown type "ChangeLog"` en `assertValidSDL`; `mods.js` committeado con `rows: [ChangeLog!]!` mientras `curriculum-design/logic/` ya no tenía `auditCapture.schema.graphql` (removido en commit b70a6d9, UPONE-1380-S3). Tras `sync:logic` el archivo quedó en 0 refs a `ChangeLog` y el server arrancó.
- **Related**: convención de artefactos sincronizados (CLAUDE.md up1: "nunca modificar archivos sincronizados directamente"); flujo canónico codegen + sync + migrate.
