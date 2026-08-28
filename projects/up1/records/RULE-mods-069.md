---
id: RULE-mods-069
project: up1
type: rule
module: mods
tags:
  - curriculum-mapping
  - rbac
  - recordtype
  - capabilities
  - field-level
---

# Para habilitar capabilities de CAMPO de un RecordType, gatear la mutation contra el ALIAS del RT, no contra el objeto base

## What

Cuando una mutation debe respetar capabilities de CAMPO declaradas en un RecordType (por ejemplo,
transiciones de una maquina de estados con `requiredCapabilities` propias por arista), el
`checkPermission`/`requireCapability` de esa mutation MUST evaluarse contra el ALIAS del
RecordType (`rt__<RT>__<base>`), no contra el nombre del objeto base.

## Why

El `authChecker` del core solo evalua el prefijo de capabilities de CAMPO de un RecordType
(`<base>.<alias>.<field>:<action>`) cuando la mutation se gatea con el alias. Contra el objeto base,
ese prefijo no se evalua: el `authChecker` normaliza la capability de objeto al base (`directCap` usa
`parsed.baseObject`), asi que un rol con la capability de objeto completo (`competencynode:modify`)
sigue pasando, pero un rol que solo tiene una capability de CAMPO del RT especifico
(`competencynode:matrix.status:modify`) queda sin puerta de entrada si la mutation gatea contra el
objeto base.

Evidencia verificada en `curriculum-mapping/logic/competencyMatrix-update.resolver.js:95-102`: la
mutation `updateCompetencyMatrix` llama `checkPermission(context, MATRIX_ALIAS, 'modify')` (alias, no
objeto base), y el propio comentario del codigo documenta el motivo: "el gate va contra el ALIAS, no
contra el objeto base, y eso es lo que habilita el permiso partido". Esto es lo que permite que los
roles Revisor y Autoridad avancen el `status` de la matriz de competencias con sus capabilities de
transicion (`competencynode:approve`, `:publish`, `:deprecate`, `:archive`, `:revert`, declaradas en
`capabilities.json:54-74`) sin necesitar la capability completa `competencynode:modify`, que solo
tiene el rol Disenador.

Ticket: UPONE-1537.

## Where

- `curriculum-mapping/logic/competencyMatrix-update.resolver.js` (implementacion de referencia).
- `curriculum-mapping/capabilities.json` (declaracion de las capabilities de transicion por arista).
- Cualquier resolver custom de un objeto con RecordTypes que declaren capabilities de campo propias
  (maquinas de estado, campos exclusivos de un RT).

## When

Al escribir un resolver custom para un objeto con RecordTypes, si alguno de esos RecordTypes declara
capabilities de campo (transitions con `requiredCapabilities`, o cualquier prefijo `<objeto>.<alias>.`
en `capabilities.json`). Si el objeto no tiene RecordTypes con capabilities de campo propias, gatear
contra el objeto base sigue siendo correcto.
