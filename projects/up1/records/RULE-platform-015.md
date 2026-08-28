---
id: RULE-platform-015
project: up1
type: rule
module: platform
tags:
  - object-manager
  - cold-restart
  - nodemon
  - reset-tenant
  - codegen
  - schema-per-tenant
  - stale-cache
---

# Tras reset-tenant o codegen, el object-manager requiere cold restart (no nodemon-reload)

## What

Tras `reset-tenant` o un nuevo `codegen`, el object-manager requiere un **cold restart completo** (kill + start) para recargar el schema por-tenant. Un nodemon-reload-on-touch (`touch src/index.js`) NO es suficiente: PID cambia, pero el ensamblado del schema por-tenant no se rearma. Secuencia correcta: `kill -9 <pid-nodemon> <pid-listener>`, esperar hasta que el puerto `:4000` quede libre, luego `npm run dev` fresco.

## Why

TICKET-068 L4: tras `reset-tenant UPU` (baja del override + codegen + seed), TODAS las fuentes persistentes quedaron en v2 (`prisma/UPU/schema.prisma`, `dynamic.js`, `business/Base/curriculum.json`, `core_ObjectDefinition`, `core_FieldDefinition` 12 campos, filas DB). Pero el OM server (nodemon) seguía sirviendo el schema v1 del `Curriculum` incluso después del respawn (PID cambió de 29251 a 91226 vía `touch src/index.js`). El v1 servido coincidía exacto con el override borrado. Solo el cold restart (kill -9 nodemon + listener, esperar :4000 libre, `npm run dev`) resolvió el problema: la introspeción GraphQL pasó a mostrar v2 con 0 campos v1. La documentación §8 diced "reiniciar el server tras reset" pero no precisaba que debe ser un cold restart real.

## Where

object-manager/ — servidor de desarrollo (nodemon). Doc operativa: `operations/database-reset.md §8`. Aplica en cualquier flujo que corra `npm run codegen`, `npm run sync`, o `reset-tenant <T>` en el proceso de desarrollo.

## When

Siempre que se ejecute: `reset-tenant <tenant>` (cualquier variante: `--recreate`, `--force`, `tenant:create --resume`), `npm run codegen -- <tenant>`, `npm run sync` seguido de verificación del schema GraphQL en runtime. La secuencia operativa es: (1) `kill -9 $(lsof -t -i:4000)` + `kill -9 $(pgrep nodemon)`, (2) esperar `lsof -i:4000` sin resultados, (3) `npm run dev`.

## Verification

Tras `reset-tenant`/codegen: `curl -s -X POST http://localhost:4000/graphql -H 'Content-Type: application/json' -H 'X-Tenant-ID: <tenant>' -d '{"query":"{__type(name:\"<Object>\"){fields{name}}}"}' | jq '.data.__type.fields[].name'` → devuelve los campos del schema nuevo. Si devuelve campos del schema anterior, el restart fue incompleto.

## Source

- **Discovered in**: TICKET-068
