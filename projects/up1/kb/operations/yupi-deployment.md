---
id: SPEC-operations-006
project: up1
type: spec
module: operations
category: operations
tags: [up1, yupi, ai-core, ai-bridge, ai-observability, submodulos, ci, docker, bitbucket-pipelines, mods, lifecycle]
fecha: 2026-08-03
ticket: UPONE-1435
sources:
  - .gitmodules (declaracion up1-Yupi/ai-core, up1-Yupi/ai-bridge, up1-Yupi/ai-observability)
  - scripts/update-repos.js (getYupiRepos())
  - docker-compose.yml (servicio flow unico; sin langfuse/bridge/telegram-bridge)
  - bitbucket-pipelines.yml (services.docker.memory, size: 2x por build step)
  - package.json (uPlannerMods, ignoredMods)
  - mods.json (academic-scheduling active:true)
  - commit a14bbc2 (UPONE-1435), commits fix/pipeline-memory (8f95a0b, 2b1360d)
---

# Despliegue de Yupi (AI infra) y ajustes de CI del monorepo

Como se declara y actualiza Yupi (infraestructura de IA) fuera del monorepo principal, y los ajustes de recursos de CI que acompañaron ese cambio.

## Indice

1. [Yupi via submodulos](#1-yupi-via-submodulos)
2. [Deteccion en update-repos](#2-deteccion-en-update-repos)
3. [Infra de IA removida del monorepo](#3-infra-de-ia-removida-del-monorepo)
4. [Ajustes de CI (Docker memory y size)](#4-ajustes-de-ci-docker-memory-y-size)
5. [Lifecycle de mods (contexto relacionado)](#5-lifecycle-de-mods-contexto-relacionado)

## 1. Yupi via submodulos

Yupi (los componentes de IA de la plataforma) ya no vive embebido en el monorepo `up1`. Se declara como tres submodulos Git bajo `up1-Yupi/`:

```
[submodule "up1-Yupi/ai-core"]
	path = up1-Yupi/ai-core
	url = git@bitbucket.org:uplanner/ai-core.git
	branch = main
[submodule "up1-Yupi/ai-bridge"]
	path = up1-Yupi/ai-bridge
	url = git@bitbucket.org:uplanner/ai-bridge.git
	branch = main
[submodule "up1-Yupi/ai-observability"]
	path = up1-Yupi/ai-observability
	url = git@bitbucket.org:uplanner/ai-observability.git
	branch = main
```
(`.gitmodules`)

Cada componente es un repo independiente con su propio ciclo de vida (branch, deploy, versionado), separado del monorepo `up1` y de los repos de mods.

## 2. Deteccion en update-repos

`scripts/update-repos.js` agrega `getYupiRepos()`, que detecta dinamicamente los submodulos clonados bajo `up1-Yupi/` (busca subdirectorios con `.git`) y los suma al set de repos que `npm run update-repos` actualiza junto a los repos core y los mods:

```javascript
function getYupiRepos() {
  const yupiPath = path.join(rootDir, 'up1-Yupi');
  if (!fs.existsSync(yupiPath)) return [];

  return fs.readdirSync(yupiPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && fs.existsSync(path.join(yupiPath, dirent.name, '.git')))
    .map(dirent => path.join('up1-Yupi', dirent.name));
}
```
(`scripts/update-repos.js:30-37`)

```javascript
const allRepos = [...mainRepos, ...getModRepos(), ...getYupiRepos()];
```
(`scripts/update-repos.js:67`)

Si `up1-Yupi/` no existe (workspace sin los submodulos clonados), `getYupiRepos()` devuelve `[]` y `update-repos` sigue funcionando sin Yupi.

## 3. Infra de IA removida del monorepo

UPONE-1435 removio del monorepo la infraestructura de IA que antes vivia embebida:

- `docker-compose.yml` raiz: ya no define los servicios `langfuse`, `telegram-bridge` ni `bridge`. Hoy solo declara el servicio `flow` (n8n) — verificado en `docker-compose.yml`.
- Dockerfiles AWS de bridge/langfuse (`Dockerfile.bridge.aws`, `Dockerfile.telegram-bridge.aws`, compose de `aws/langfuse/`) y sus task definitions de ECS fueron eliminados del repo (no hay coincidencias de `bridge`/`langfuse` bajo `aws/` al verificar).

**Razon**: aislar el ciclo de despliegue de Yupi del monorepo `up1` (deploy, versionado y recursos independientes), evitando abultar el docker-compose y el pipeline principal con servicios que no son core de la plataforma educativa.

## 4. Ajustes de CI (Docker memory y size)

En paralelo (`fix/pipeline-memory`), se ajustaron los recursos de `bitbucket-pipelines.yml`:

```yaml
definitions:
  services:
    docker:
      memory: 6144   # antes 2048
```
(`bitbucket-pipelines.yml:39-41`)

Los steps de build de object-manager, suite y flow quedaron con `size: 2x`:

```yaml
- step: &build-push-om
    name: Build & Push object-manager
    size: 2x
```
(`bitbucket-pipelines.yml:126-128`, repetido para `build-push-suite` y `build-push-flow`)

**Razon**: el build de Nuxt de suite requiere mas heap del que da el default de 2048 MB; sin el aumento, el build fallaba por memoria. El `docker: true` global previo se retiro de `options` — el `memory: 6144` queda acotado al `services.docker` compartido, no habilitado globalmente por step.

**Reversibilidad**: cambio de configuracion de CI puro (no toca codigo de aplicacion); requiere coordinacion con quien administra el pipeline si se revierte, porque afecta el consumo de minutos/recursos de Bitbucket.

## 5. Lifecycle de mods (contexto relacionado)

En la misma ventana de cambios se movieron dos mods en su ciclo de vida (ver `mods/creation-guide.md` para el mecanismo completo de activacion):

- **academic-scheduling**: pasa a `active: true` en `mods.json`, scope tenants TEST/UPU/DEMO02, roles Admin/Coordinador/Consultor. Desde este punto el CI clona el submodulo y hornea (`bake`) su `app.json` + layouts en la imagen de object-manager (`mods.json`).
- **curriculum-mapping**: se agrega a la lista de clonado `uPlannerMods` en `package.json` (repo `curriculum-mapping.git`), pero **no** se agrego a `mods.json`. Es decir: el repo se clona como workspace mod, pero queda fuera del registro de mods activos que consume el sync/CI — no se hornea en ninguna imagen ni se sincroniza. Estado: **standby**, sin wiring en `ignoredMods` (ese mecanismo es distinto: `ignoredMods` excluye mods que SI estan en `mods.json` de la corrida de sync; `curriculum-mapping` directamente no esta en `mods.json`).

Verificado en `package.json` (`uPlannerMods`, `ignoredMods`) y `mods.json` contra el estado actual de la rama `develop` (commit `a80fdaa` para el agregado a `uPlannerMods`; sin entrada de `curriculum-mapping` en el historial de `mods.json`).
