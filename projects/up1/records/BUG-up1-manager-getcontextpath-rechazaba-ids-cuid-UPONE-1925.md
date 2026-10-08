---
id: BUG-up1-manager-getcontextpath-rechazaba-ids-cuid-UPONE-1925
project: up1
type: bug
module: up1-manager
tags:
  - UPONE-1925
  - contexts
  - cuid
---

getContextPath devolvía vacío para todo contextId no numérico, pero core_Context.id es un cuid() alfanumérico en los contextos creados hoy y getInstance recibe ID!. Con eso contextPath quedaba en blanco y el selector de roles de user-roles-assign nunca montaba para un contexto recién creado. Se quitó la guarda numérica; un valor inválido, como el sentinel __CREATE_NEW__, cae al catch y devuelve vacío.

Fuente: 90c8446 modsComposables/useContexts.ts:24; tests/useContexts.test.ts.
