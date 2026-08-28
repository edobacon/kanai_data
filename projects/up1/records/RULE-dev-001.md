---
id: RULE-dev-001
project: up1
type: rule
module: dev
tags:
  - dev
  - infrastructure
  - services
  - logs
  - startup
---

# Usar up1-start.sh para levantar servicios de desarrollo

## What

Los servicios de desarrollo de uP1 se levantan con el script `up1-start.sh` ubicado en `/Users/edobacon/Workspace/uplanner/up1-start.sh`. El script gestiona 3 servicios: object-manager (:4000), suite (:3000), y flow/n8n (:5678). Usa Node 22 via nvm.

### Comandos principales

| Comando | Efecto |
|---------|--------|
| `./up1-start.sh` o `--all` | Levanta los 3 servicios |
| `--om` | Solo object-manager (GraphQL API, puerto 4000) |
| `--suite` | Solo suite (frontend Nuxt, puerto 3000) |
| `--flow` | Solo flow/n8n (workflows, puerto 5678) |
| `--stop` | Detiene todos los servicios |
| `--status` | Muestra estado de los 3 puertos |

### Logs

| Comando | Efecto |
|---------|--------|
| `--logs [servicio]` | tail -f de la sesión activa (servicio: object-manager, suite, flow) |
| `--logs-list` | Listar sesiones anteriores |
| `--logs-show ID [servicio]` | Ver logs de sesión anterior |
| `--logs-find "texto" [--from YYYYMMDD] [--to YYYYMMDD] [--service srv] [-i]` | Buscar en logs por contenido y/o fecha |
| `--logs-clean [N]` | Mantener últimas N sesiones (default: 10) |

### Prerequisitos

- **Docker**: el script lo detecta y lo inicia automáticamente si no está corriendo (espera hasta 60s)
- **PostgreSQL**: debe estar corriendo en localhost:5432. Si no responde, el script aborta
- **nvm + Node 22**: el script ejecuta `source ~/.nvm/nvm.sh && nvm use 22` internamente

### Sesiones y logs

Cada ejecución crea una sesión con ID `YYYYMMDD-HHMMSS` en `~/.up1-logs/`. Cada servicio genera su propio `.log` y `.pid`. Los logs persisten entre ejecuciones.

### Detección de puertos

Si un puerto ya está en uso, el script lo reporta como warning y no intenta levantar ese servicio de nuevo (idempotente).

### Para desarrollo de mods

El flujo típico es:
1. `./up1-start.sh --om --suite` (levantar backend + frontend)
2. Hacer cambios en `mods/{mod}/`
3. `npm run sync` (propagar cambios)
4. Verificar en localhost:3000 (suite) o localhost:4000/graphql (API)
5. `./up1-start.sh --logs object-manager` si hay errores en backend
6. `./up1-start.sh --stop` al terminar

## Why

Centraliza el arranque de servicios con verificación de prerequisitos (Docker, PostgreSQL), gestión de logs por sesión, y detección de puertos en uso. Sin el script, hay que levantar cada servicio manualmente con nvm use + cd + npm run dev en terminales separadas, sin logs persistentes ni forma de buscar errores históricos.

## Where

`/Users/edobacon/Workspace/uplanner/up1-start.sh`. Logs en `~/.up1-logs/`.

## When

Al iniciar una sesión de desarrollo en up1, al diagnosticar errores de servicios, al verificar que el stack está corriendo antes de validar cambios.

## Verification

`./up1-start.sh --status` debe mostrar los servicios esperados como activos.

## Source

- **Discovered in**: —
