---
id: RULE-global-004
project: jormat-evolution
type: rule
module: global
level: must
tags:
  - validation
  - dod
  - dev-stack
  - docker
  - acceptance
  - build
  - runtime-errors
  - console
---

# La validacion no termina en build verde: el stack dev debe LEVANTAR y la consola quedar sin errores

## What

Para todo ticket (`implement`/`fix`/`improvement`/`refactor`) que toque codigo que corre en el stack de desarrollo (`front/jormat-front` y/o `backend/jormat-api`), la validacion **NO se considera completa con `next build` / `nest build` verde**. Ademas, como criterio no negociable:

1. **El stack dev debe levantar** via el flujo real del equipo (`./run.sh dev` → `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`).
2. **La consola de cada servicio afectado debe quedar SIN errores**:
   - **front** (Next dev): compila sin `Module not found` / `Can't resolve` / errores de compilacion; la ruta responde (HTTP 200).
   - **api** (Nest `start:dev`): `Found 0 errors. Watching for file changes.` + `Nest application successfully started`; `/api/health` responde 200.
   - Sin errores de runtime en el arranque (unhandled rejections, fallos de provider/boot). Los errores de runtime dependientes de credenciales reales (ej. MSAL/Azure sin `.env` productivo) se documentan como tales, no se ignoran.
3. **Si el cambio toca archivos de config de raiz o dependencias** (`package.json`/lock, `tsconfig*.json`, `tailwind.config.js`, `postcss.config.js`, `next.config`, `nest-cli.json`), **rebuildar la imagen dev correspondiente ANTES de validar** (`docker compose ... build front|api`). El `docker-compose.dev.yml` monta **solo `src/`** → los config de raiz NO se hot-reloadean y un build de host limpio puede ocultar que el contenedor quedo stale.

`build verde` y `dev arranca limpio` son checks **complementarios y ambos obligatorios** — ninguno reemplaza al otro.

## Why

El `build` de produccion verde **no garantiza que el entorno real de trabajo (dev, en docker) levante**. Evidencia directa (JOR-003, 2026-06-13): el ticket cerro con `next build` ✓ pero al hacer `./run.sh dev` el stack tenia **dos bloqueantes** que el build no atrapo:

- **Imagen dev stale**: el contenedor del front traia un `node_modules` instalado antes de que JOR-002 agregara deps al `package.json` (`@tanstack/react-query`, `sonner`, …) → `Module not found` en runtime de dev. El `next build` paso porque corrio en el **host** (node_modules completo), no en el contenedor.
- **api compilando specs**: faltaba `tsconfig.build.json`; `nest start:dev` compilaba `*.spec.ts` con la app → `error TS2582` (describe/it/expect). El build de prod usa otro pipeline y no lo expuso.

La causa comun: el build corre en un contexto (host, tsconfig de build, sin watch) distinto del que usa el equipo a diario (docker, `tsconfig` de dev, `start:dev`/`next dev`). Validar solo con build deja pasar regresiones que rompen el arranque real. El costo de detectarlas tarde (al intentar correr) es el que esta rule evita.

## Where

- **Files**: cualquier `.ts`/`.tsx` en `front/jormat-front/src/**` y `backend/jormat-api/src/**`, y especialmente los config de raiz no montados (`tsconfig*.json`, `tailwind.config.js`, `postcss.config.js`, `next.config.*`, `nest-cli.json`, `package.json`).
- **Layers**: frontend + backend.
- **Infra**: `run.sh` (`cmd_dev`/`cmd_build`), `docker-compose.dev.yml` (monta solo `src/`; node_modules y config de raiz viven en la imagen), `Dockerfile.dev` (`RUN npm install` cacheado por capa de `package.json`).
- **Puertos en esta maquina**: front `localhost:3001`, api `localhost:4001/api`.

## When

- En el **S{N}.GATE** de toda sesion que toque codigo runnable (junto al DoD de RULE-global-001 y los gates DET-23/DET-31).
- En el **acceptance de close** (DET-13) de todo ticket que afecte codigo del stack: el checkpoint de Integration/regression incluye "dev levanta + consola limpia", no solo build.
- **Obligatorio** correr el rebuild de imagen dev si la sesion toco config de raiz o deps.

## Verification

1. Si se tocaron config de raiz/deps: `docker compose -p jormat-evolution -f docker-compose.yml -f docker-compose.dev.yml build <front|api>`.
2. Levantar: `./run.sh dev` (o `... up -d` para verificar headless).
3. Front: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/` → `200`; logs sin `Module not found`/`Can't resolve`/`error`.
4. Api: `curl http://localhost:4001/api/health` → `200`; logs con `Found 0 errors` + `Nest application successfully started`.
5. Grep de logs de ambos contenedores: `docker logs <ctr> 2>&1 | grep -iE "error TS|module not found|cannot find|Found [1-9][0-9]* error|UnhandledPromiseRejection"` → **0 matches** (los errores de runtime por credenciales ausentes se documentan, no se silencian).

Evidencia del check va en el ticket (Test cases / acceptance) como TC `Affects UI`/integration con el output del arranque.

## Source

- **Discovered in**: directriz del dev (2026-06-13), tras cerrar JOR-003 y descubrir al levantar el stack que `build verde` no implicaba `dev arranca`.
- **Evidence**: JOR-003 cerro con `next build` ✓ pero `./run.sh dev` fallo por (a) imagen dev del front stale (deps de JOR-002 ausentes en el contenedor → `Module not found @tanstack/react-query`) y (b) api sin `tsconfig.build.json` compilando `tooling.smoke.spec.ts` (`error TS2582`). Ambos invisibles al build de prod.
- **Related**: RULE-global-001 (DoD de calidad — su Verification listaba solo build; esta rule la complementa con el arranque real), DET-13 (cierre con evidencia), DET-16 (propagacion). Learn L1 de JOR-002 (falta `tsconfig.build.json`) y la limitacion de mount del compose dev (solo `src/`) — candidata a follow-up de JOR-002 (montar config de raiz o documentar el rebuild).
