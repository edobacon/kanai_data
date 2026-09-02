---
id: RULE-MIGRATION-005
project: pehuen
type: rule
module: migration
level: must
tags:
  - migration
  - legacy
  - preflight
  - env
  - db-safety
  - toolchain
  - fundacional
---

# Pre-flight obligatorio antes de tocar codigo en los repos legacy (pehuen-client / pehuen-server)

## What

Todo ticket que vaya a modificar y/o levantar `pehuen-client` o `pehuen-server` DEBE completar este pre-flight ANTES de la primera task de codigo (formalizado desde PEH-012 S1+S2):

1. **Rama de ticket (no protegida)**: ambos repos sincronizados con `origin/main`; crear `{TICKET-id}-{slug}` desde `main` por repo. **NO borrar ramas** (mergeadas o no) sin revision explicita del dev — preservar trabajo huerfano (ej. features sin mergear que tocan los mismos archivos).
2. **Seguridad de DB (CRITICO)**: `pehuen-server/.env` con `NODE_ENV=development` (es el control real de conexion en `app.ts:initializeDb`, NO `MONGO_HOST`) y credenciales **locales** (`MONGO_USERNAME=root`, `MONGO_PASSWORD=example`, `MONGO_AUTH=admin`). El `.env` **NO debe contener credenciales de produccion**. El mongo local requiere auth → la conexion dev las usa desde env.
3. **Guardrail de conexion**: `app.ts:initializeDb` loguea el host conectado y **aborta** si `NODE_ENV != production` y la uri apunta a un host no-local. Verificar en el smoke que loguea `mongodb://localhost:27017/...`.
4. **Toolchain**: `.nvmrc` alineado a una version instalada (PEH-012: v16 en ambos). `npm install` bajo esa version. En **Apple Silicon (arm64)**: `npm rebuild bcrypt --build-from-source` (los prebuilts x86_64 crashean con `ERR_DLOPEN_FAILED`). Verificar tambien sharp si se procesan imagenes.
5. **Smoke local**: levantar el server con `npm run dev` (**nunca `npm start`** — fuerza `NODE_ENV=production` → PROD) y confirmar conexion a `localhost`. Levantar el client (`npm run serve`).
6. **Dataset**: la DB local tiene fixtures suficientes para las pruebas del ticket.

## Why

Los repos legacy conectan a una DB de produccion (DigitalOcean) si `NODE_ENV=production`, y operaciones como el bulk-edit de guias hacen escrituras masivas e **irreversibles**. Un `.env` con `NODE_ENV=production` (estado encontrado en PEH-012) hace que incluso `npm run dev` pegue a prod. Sin este pre-flight, una prueba local puede corromper datos reales. Ademas, el toolchain desalineado (nvmrc EOL, nativos x86 en arm64) bloquea el arranque y se descubre tarde.

## Where

`pehuen-server/.env`, `pehuen-server/src/app.ts` (initializeDb + guardrail), `.nvmrc` de ambos repos, scripts de arranque (`npm run dev`/`serve`). Aplica a todo ticket con `target_workspaces` que incluya un repo legacy.

## When

Al inicio de la ejecucion (Session de pre-flight), antes de cualquier task que modifique codigo o levante un servicio. Es bloqueante: sin el smoke confirmando conexion local, no se ejecutan tasks que escriben en DB.

## Evidence

PEH-012 S1 (branches/.nvmrc/.env) + S2 (guardrail en `app.ts` + dataset) + S5 (la conexion dev requirio creds locales: el mongo local exige auth). Learns L10, L15, L17, L20 del ticket.
