---
id: RULE-platform-009
project: up1
type: rule
module: platform
tags:
  - workflow
  - clone
  - versioning
  - currentStatusId
  - initialStatusId
  - prefillFrom
  - activity
---

# Registros derivados con workflow nacen en estado inicial, nunca heredan currentStatusId

## What

Todo registro derivado de un objeto con workflow — ya sea una versión (`asNewVersion`) o un clon (`prefillFromCurrent`) — debe nacer con `currentStatusId = workflow.initialStatusId`, nunca copiar el `currentStatusId` del source. Un derivado de un objeto publicado no debe nacer publicado.

## Why

Heredar el estado publicado en un derivado rompe el ciclo de revisión del workflow: el nuevo registro nacería directamente en un estado terminal (PUB) sin pasar por la revisión de Borrador (BOR). Además, si `currentStatusId` está excluido del prefill y no se setea explícitamente en el path clone, el campo queda nulo y la constraint `NOT NULL` (cuando existe) causa un error de base de datos. El path versión ya lo implementa correctamente en `version-from-source.js:51` (`currentStatusId = source.workflow.initialStatusId`); el path clone debe ser simétrico.

## Where

object-manager/src/graphql/resolvers/helpers/version-from-source.js (path versión, L51: `currentStatusId = source.workflow.initialStatusId`) · object-manager/src/graphql/resolvers/helpers/prefill-from-source.js (path clone: debe replicar el patrón) · mods/curriculum-design/objects/activity.json (`prefillFrom.exclude: ["currentStatusId"]` — excluido, no heredado) · Afecta cualquier objeto con `metadata.versioning.initialStateField` declarado.

## When

Al implementar o revisar la capacidad de clonar/versionar un objeto que tiene workflow (`workflowId` + `currentStatusId`). Aplica en: (1) el path `asNewVersion` del resolver `createInstance`, (2) cualquier path `prefillFromCurrent` sobre un objeto workflow-backed, (3) al declarar `metadata.prefillFrom.exclude` en el JSON del objeto — verificar que `currentStatusId` esté excluido Y que el path de creación lo setee desde `workflow.initialStatusId`.

## Verification

grep `currentStatusId` en el path clone del resolver (`prefill-from-source.js`/`createInstance`) y verificar que setea `workflow.initialStatusId`. Test: clonar un objeto en estado PUB → el clon debe nacer en BOR (o el estado `initialStatusId` configurado en el workflow).

## Source

- **Discovered in**: TICKET-044
