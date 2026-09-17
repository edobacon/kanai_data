---
id: DOC-kb-sp10-Core-Reintroducir-la-deteccion-de-COLISIONES-de-nombres-de-rol-sin-cobertura-tra
project: up1
type: doc
module: curriculum-design
tags:
  - core
  - rbac
  - roleNaming
  - UPONE-1615
  - UPONE-1699
  - aviso-core
  - colisiones-nombres
---

# Core — Reintroducir la deteccion de COLISIONES de nombres de rol (sin cobertura tras UPONE-1699)

**Tipo:** Core / plataforma · no bloqueante · detectado desde UPONE-1615 (TICKET-133), S5.T5

## Contexto

UPONE-1699 elimino `validateModRoleNameCollisions`, que era el unico punto que detectaba **colisiones de nombres de rol** entre mods/core. El validador vigente `object-manager/scripts/sync/roleNaming.js` (`isConventionalRoleName` / `isAppProfileCandidate`) cubre **formato** (PascalCase espanol, espacios simples, convencion de nombres), **no colisiones**.

## Problema

Tras 1699, dos mods (o un mod y core) pueden declarar perfiles/roles con nombres que colisionan y **nada lo detecta** en el sync. El punto ciego de proteccion de nombres que origino el request de UPONE-1615 **sigue vigente**: roleNaming reporta no-conformidad de formato, pero no colisiones. UPONE-1615 no lo cierra; lo traslada a core reformulado (REQ-NOTIFY-01).

## Origen (clasificacion)

**Preexistente.** La brecha la introdujo la eliminacion del detector en **UPONE-1699**, no los cambios de UPONE-1615; este ultimo solo lo detecta y reporta.

## Propuesta para core

Reintroducir una validacion de **colisiones** de nombres de rol a nivel core/sync (reformulada respecto del detector viejo), independiente del chequeo de formato de `roleNaming.js`: al materializar `core_Role` / `core_ModRole`, detectar nombres duplicados/colisionantes entre fuentes (mods + core) y reportarlos (no auto-crear ni silenciar).

## Referencias

- `object-manager/scripts/sync/roleNaming.js`
- UPONE-1699 (eliminacion de `validateModRoleNameCollisions`)
- UPONE-1615 REQ-NOTIFY-01 (TICKET-133)
