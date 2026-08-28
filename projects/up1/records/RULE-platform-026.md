---
id: RULE-platform-026
project: up1
type: rule
module: platform
tags:
  - mods
  - sync
  - monorepo
  - governance
  - ignoredMods
---

# El ciclo de vida de un mod lo gobiernan tres listas independientes: clonar, catalogar y sincronizar no son la misma decision

## What

Un mod de up1 pasa por tres mecanismos separados, cada uno con su propia fuente de verdad, y ninguno depende de los otros dos:

1. **Clonar** (`npm run setup`): lee `uPlannerMods` en el `package.json` raiz. Es la lista de repos que se clonan e instalan.
2. **Catalogar** (metadata de tipo y repo): lee `mods.json` (campo `active: true/false` por entrada). Responde "es un mod real de la plataforma, con nombre y repo", nada mas.
3. **Sincronizar** (los 10 fases de `npm run sync`): lee `ignoredMods` en el `package.json` raiz. Es la **unica** fuente de verdad para el sync, porque cada fase escanea el filesystem (`fs.readdir` sobre `mods/`) y excluye solo lo listado ahi.

Que un mod este `active: true` en `mods.json` **y** dentro de `ignoredMods` **no es una contradiccion**: son dos preguntas distintas ("es de la plataforma" vs "el sync lo procesa") que hoy conviven a proposito.

## Why

Es un gotcha recurrente: `mods.json` y `ignoredMods` parecen decir cosas opuestas sobre el mismo mod, y sin verificar el codigo del sync se asume que hay un error de configuracion. No lo hay. `ai-agent` es el caso real: esta `active: true` en `mods.json:4-8` y a la vez listado en `ignoredMods` (`package.json:57`). Segun el codigo verificado, esto significa: se clona (esta en `uPlannerMods`), se cataloga como mod activo de tipo `artifact`, pero las 10 fases de `npm run sync` lo saltean por completo porque leen `ignoredMods`.

Ademas, `mods.json` **no es autoritativo para el sync** y puede estar desactualizado sin que nada se rompa: `retention-wellbeing` no aparece en `mods.json` pero SI se sincroniza, porque el sync escanea el filesystem de `mods/` y no filtra por `mods.json`.

## Where

- `scripts/actions.js:12` (`const { uPlannerProjects, uPlannerMods, uPlannerYupi = [] } = packageJson;`, y `modsJson.mods.map(...)` para el alias repo->nombre usado solo en el flujo de clonado)
- `mods.json` (catalogo, campo `active` por mod)
- `package.json:41-49` (`uPlannerMods`, lista de clonado) y `:55-59` (`ignoredMods`, exclusion de sync)
- `object-manager/scripts/sync/SyncManager.js:26,79` (`ignoredMods: rootPackageJson.ignoredMods || []`, comentario "single source of truth")
- `object-manager/scripts/sync/fileSync.js:344-362` (`findModFolders`, salta `ignoredMods` al escanear `mods/`)
- `object-manager/scripts/sync/logicSync.js:85-94` (mismo patron para resolvers de mod)
- `object-manager/scripts/sync/configSync.js:105-115` (mismo patron para `config/settings.json` de mod)

## When

Al agregar, activar o desactivar un mod, o al depurar por que un mod "activo" no aparece sincronizado (o al reves, por que uno "ignorado" si aparece en el catalogo). Verificar las tres listas por separado antes de asumir un bug de configuracion.
