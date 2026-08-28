---
id: RULE-layout-015
project: up1
type: rule
module: layout
---

# Queries list sin hard-limits arbitrarios — usar paginación con cursor

## What

Las queries que retornan listas de entidades (`findMany`, queries con `limit`) en resolvers custom, composables (`useXApi`) y fetches de `modsComponents/` NO deben usar límites numéricos hardcoded (ej. `limit: 200`, `take: 500`). Deben implementar paginación explícita con cursor o offset, o iterar hasta agotar resultados cuando el caso de uso lo requiera (ej. poblar un árbol completo).

## Why

Los hard-limits truncan silenciosamente el resultado cuando el dominio crece. El usuario final no recibe error — simplemente ve datos incompletos (un árbol con ramas faltantes, un listado sin algunas filas). Esto degrada confianza en la UI y oculta bugs de completitud. Paginación o fetch-all iterativo expone explícitamente el costo y permite loading states correctos.

## Where

En archivos `logic/*.resolver.js`, `modsComponents/**/useXApi.ts`, `modsComposables/**/*.ts` y helpers que disparen queries de listado.

## When

Al implementar o revisar cualquier fetch de lista de entidades.

## Verification

Grep por `limit:` o `take:` con números literales en composables y resolvers. Si existe, debe venir acompañado de paginación (cursor, offset) o estar justificado con comentario explicando el límite de dominio.

## Source

- **Discovered in**: TICKET-005
