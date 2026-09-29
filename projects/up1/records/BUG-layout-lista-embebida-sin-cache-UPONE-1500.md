---
id: BUG-layout-lista-embebida-sin-cache-UPONE-1500
project: up1
type: bug
module: layout
tags:
  - UPONE-1500
  - sp11
  - record-list
  - apollo-cache
---

RecordList solo forzaba network-only en modo picker o con additionalFilters. Una lista hija dentro de un RecordDetail (identificada por parentContext.id) usaba el cache de Apollo, y el tab Logs de un tipo de registro mostraba solo el alta original despues de editarlo. needsFreshInitialFetch() ahora tambien exige red cuando hay parentContextId (un parentContext sin id no cuenta).

sourceRef: 4cebd652 src/layouts/RecordList/initialFetchPolicy.ts:12-20 (UPONE-1500 H011)
