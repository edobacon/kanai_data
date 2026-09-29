---
id: BUG-mcp-sync-tipos-hoja-base-y-build-ci
project: up1
type: bug
module: mcp
tags:
  - sp11
  - mcp-sync
  - ci
  - schema
---

Un enum de mod estaba en knownTypes pero no en typeFields: buildSelection recursaba y abortaba el sync de todo mod con "Tipo X desconocido o sin campos". Ademas los scalars y enums base de UP1 (DateTime, FilterOperator) pedian un pick imposible para un tipo hoja. El fix los trata como leafTypes, leyendo sus nombres por regex sobre los .js de object-manager/src/graphql/typeDefs (no por introspeccion, deshabilitada en produccion). Consecuencia: el build de la imagen del MCP debe clonar esa carpeta; si no, readBaseLeafTypes devuelve un set vacio y la imagen sale con el mismo bug que el fix resuelve en local.

sourceRef: 6b04f93 scripts/schema-index.js:36-101 (BASE_LEAF_RE, readBaseLeafTypes, leafTypes), a146551 .woodpecker/build.yml y Dockerfile
