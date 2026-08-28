---
id: RULE-platform-027
project: up1
type: rule
module: platform
tags:
  - rootPath
  - deploy
  - docker
  - config
  - sync
  - runtime
---

# No resolver rutas relativas a `rootPath` en runtime del object-manager: la imagen es aplanada y ese layout de monorepo no existe ahi

## What

En codigo que corre dentro del contenedor de object-manager (sync de deploy, arranque), no resolver rutas relativas a `this.config.rootPath` cuando `rootPath` asume el layout de monorepo (`up1/object-manager/...`, `up1/mods/...`). La imagen de runtime **aplanea** `object-manager/` a la raiz del contenedor: un path con prefijo `object-manager/-` nunca existe ahi, y la lectura falla en silencio (sin excepcion visible) en vez de fallar ruidosamente.

Para leer un archivo que vive junto al codigo del propio object-manager (no en `mods/`), resolver relativo al propio archivo fuente (`path.resolve(__dirname, ...)`), nunca a `rootPath`.

## Why

`configSync.js` resolvia `core/settings.json` relativo a `rootPath`, asumiendo la estructura de monorepo. En la imagen aplanada esa ruta nunca existe, asi que los configs PLATFORM (`user.theme`, `user.locale`) quedaban vacios en la nube sin ningun error, porque el `try/catch` de la lectura degradaba a "no encontrado, se omite" en vez de propagar la falla. Fix verificado: `configSync.js:88-92` deja el comentario explicito del porque, y resuelve el path con `path.resolve(__dirname, '../../config/settings.json')` en vez de `rootPath`. Ademas `dbSync.js` no llamaba a `syncConfigDefinitions()` en los paths de deploy en la nube (`sync:layouts`, `sync:db`); el fix agrega la fase `4b` a ambos paths (`dbSync.js:2596`, `:2605`) y aisla el error por-tenant para que un tenant con schema desactualizado no aborte la fase completa.

El mismo patron de fondo (assumir el layout de monorepo dentro de una imagen aplanada) aparece en el rebuild de schemas Prisma por-tenant en build/startup: ver BUG-platform-024.

## Where

- `object-manager/scripts/sync/configSync.js:84-99` (`collectConfigDefinitions`, lectura de `core/settings.json` resuelta por `__dirname`, no por `rootPath`)
- `object-manager/scripts/sync/dbSync.js:2589,2596,2605` (llamada a `syncConfigDefinitions()` agregada en las tres ramas del pipeline: seed completo, `layoutsOnly`, y el resto)

## When

Al escribir codigo de sync/deploy que lee archivos ubicados dentro del propio workspace `object-manager/` (no bajo `mods/`, que si vive relativo a `rootPath` porque el mod completo se clona en el filesystem). Verificar contra el Dockerfile que la ruta resuelta exista realmente en la imagen final antes de asumir el layout de monorepo.
