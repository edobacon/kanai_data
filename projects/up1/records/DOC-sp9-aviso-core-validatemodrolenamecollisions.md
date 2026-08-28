---
id: DOC-sp9-aviso-core-validatemodrolenamecollisions
project: up1
type: doc
module: core
status: open
source_ref: UPONE-1615 H12; object-manager/scripts/sync/dbSync.js:1031-1040
tags:
  - rbac
  - core
  - aviso
  - modrole
  - sp9
  - UPONE-1615
---

# Aviso a team core: punto ciego de `validateModRoleNameCollisions`

> **Que es esto**: registro del mensaje que UPONE-1615 (mod-only) debe enviar a team core.
> NO es un cambio de core dentro de este ticket: es una notificacion de un punto ciego, no bloqueante.
> El ticket sigue siendo mod-only en codigo; lo unico que "toca" core es este aviso (comunicacion).

## Resumen para core

La proteccion de colision de nombres de roles del core es **ciega a los roles creados por seed o por
layout**. Solo considera los nombres declarados en `config.app.roles`. Los mods que siembran roles por
otra via (seed `_data-rbac.js`, o auto-create desde layout) quedan fuera de esa validacion, de modo que
un renombre o una colision de esos roles no es detectada por el guard.

## Evidencia (verificada en codigo)

- `object-manager/scripts/sync/dbSync.js:1031-1040`: `validateModRoleNameCollisions` arma
  `institutionalNames` **exclusivamente** desde `config.app?.roles`.
- `mods/curriculum-design/config/app.json` no declara el array `roles`; los 4 roles curriculares entran
  por **seed** (`mods/curriculum-design/seed/_data-rbac.js`). Por eso el guard no los ve.
- Camino adicional que tampoco cubre: auto-create de roles desde layout (`dbSync.js:846-855`,
  "Auto-created role from layout configuration").

## Impacto

- Bajo/informativo para UPONE-1615: el ticket adopta la convencion de nombres `Learning Assurance - <Rol>`
  (decision D3), que **esquiva** el punto ciego. El aviso es preventivo, no un bloqueo.
- General: cualquier mod que gestione roles por seed/layout puede chocar nombres sin que el guard avise.

## Accion propuesta a core (no en alcance de UPONE-1615)

Extender `validateModRoleNameCollisions` para considerar tambien los roles materializados por seed y por
layout (no solo `config.app.roles`), o documentar explicitamente que la proteccion es solo para roles
declarados en config. Coordinar con UPONE-1633 (mismo mecanismo de defaults engorda `Consultor`).

## Trazabilidad

- Requisito en el spec de UPONE-1615: **REQ-NOTIFY-01** (no bloqueante) — el cierre verifica que el
  aviso se envio, por evidencia, no por buena voluntad.
- Task que lo ejecuta: **S5.T6**.
