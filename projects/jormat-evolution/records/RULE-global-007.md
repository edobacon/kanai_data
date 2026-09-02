---
id: RULE-global-007
project: jormat-evolution
type: rule
module: global
level: must
tags:
  - docker
  - dev-stack
  - seeds
  - tsconfig
  - backend
  - tooling
---

# Contenedor dev de la api: node_modules/seeds se hornean en build, tsconfig.build.json debe excluir specs, build usa el compose dev

## What

Tres gotchas recurrentes del entorno docker dev del backend (`jormat-evolution-api-1`), detectados por separado en JOR-002, JOR-013 y JOR-014:

1. **`node_modules` y `seeds/` se hornean en la imagen en build time**: el contenedor dev solo monta `src/`+`shared/` como volumen. Un dependency nuevo en `package.json` (ej. `@types/multer`) o un seed nuevo (ej. `03_rbac`) agregados **despues** del ultimo build NO llegan al contenedor corriendo hasta rebuildearlo. Para validar un seed nuevo sin rebuild: correr desde el **host** contra el puerto expuesto de la DB (`DB_HOST=localhost DB_PORT=5433 NODE_ENV=development npx knex seed:run --specific=NN_archivo.ts`) — usar siempre `--specific` (el directorio `seeds/` tiene al menos un `.spec.ts` que `seed:run` completo intenta cargar como seed y revienta porque `describe` no existe fuera de Jest).
2. **`tsconfig.build.json` es obligatorio si el backend agrega jest/specs**: `nest start --watch` (start:dev) compila con `tsconfig.build.json` por defecto; si no existe, cae a `tsconfig.json` (que incluye `src/**/*`), metiendo los `.spec.ts` en el build de la app -> errores `TS2582`/`TS2304` (`describe`/`it`/`expect` no encontrados) en la consola. Fix: crear `backend/jormat-api/tsconfig.build.json` con `{extends: "./tsconfig.json", exclude: ["node_modules","test","dist","**/*spec.ts"]}`.
3. **El build debe apuntar al compose + Dockerfile de dev, no al de prod**: `docker compose build` sin `-f docker-compose.dev.yml` usa el compose de prod, donde `CORS_ORIGIN` es obligatorio (`:?`, interpolado ANTES del merge de archivos, asi que el default del override dev no lo salva) y construye `Dockerfile` (prod) en vez de `Dockerfile.dev`. Receta correcta: `docker compose -p jormat-evolution -f docker-compose.yml -f docker-compose.dev.yml build api` (el hash de `package.json` invalida la capa `npm install` y la re-ejecuta) -> `... up -d --no-deps api` (recrea el contenedor; no hace falta `docker restart` aparte). Ademas, `CORS_ORIGIN=http://localhost:3000` debe estar en `.env` (si falta, ni siquiera el build de prod interpola).

## Why

Cualquiera de los tres gotchas produce un error que, sin este conocimiento, se mal-diagnostica como bug de codigo (dependencia rota, tests mal escritos, CORS mal configurado) cuando en realidad es un desfase entre lo que el contenedor tiene horneado y lo que el repo tiene en disco. Los tres aparecieron en tickets distintos (JOR-002, JOR-013, JOR-014) confirmando que es un patron recurrente del entorno, no un incidente aislado.

## Where

- **Layers**: infra (docker, docker-compose), backend (`backend/jormat-api`).
- **Files**: `backend/jormat-api/tsconfig.build.json`, `.env` (`CORS_ORIGIN`), `docker-compose.yml`+`docker-compose.dev.yml`.

## When

- Al agregar un dependency nuevo a `package.json` del backend, o un seed nuevo: rebuildear el contenedor o correr el seed desde el host contra el puerto expuesto.
- Al agregar jest/ts-jest/specs al backend por primera vez: crear `tsconfig.build.json` si no existe.
- Al buildear/levantar el contenedor api de desarrollo: usar siempre `-f docker-compose.yml -f docker-compose.dev.yml`, nunca `docker compose build` a secas.

## Verification

- API responde en `:4001` (`API_PORT=4001`) tras rebuild: `curl localhost:4001/api/health` 200.
- `docker exec <contenedor> ls node_modules/@types` (o el path del dependency nuevo) confirma que llego a la imagen.
- `docker compose config` valida tanto el archivo de prod como el merge con `docker-compose.dev.yml` sin error de interpolacion.
- `nest start --watch` no compila archivos `*.spec.ts` (revisar consola tras levantar).

## Source

- **Discovered in**: JOR-002 (tsconfig.build.json faltante), JOR-013 Session #1 (seeds horneados + `.spec.ts` en seeds/), JOR-014 Session #5 (build command + CORS_ORIGIN).
- **Evidence**: JOR-002 L1; JOR-013 L1; JOR-014 L1 (parte seeds) y L4 (receta de build + CORS_ORIGIN).
