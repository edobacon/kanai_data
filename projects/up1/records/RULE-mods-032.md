---
id: RULE-mods-032
project: up1
type: rule
module: mods
tags:
  - recordtypes
  - baseobject
  - extension-semantics
---

# rt__ con `baseObject` declarado inyecta los base fields automaticamente

## What

Cuando un RecordType declara `"baseObject": "<Base>"` en su JSON schema (ej. `rt__LearningOutcome__curricularsection.json` con `"baseObject": "CurricularSection"`), el platform devuelve los campos del base **mergeados** al GraphQL response del rt__. En layouts `_view`/`_edit`/`_create` del rt__ se puede declarar `name`, `position`, etc. directamente sin path ni `relations` config — el platform los resuelve.

## Why

Convencion semantica: el rt__ es una extension del base. Los base fields (name, position, ownerId) son user-visible y deben ser accesibles desde el detail/form del rt sin tener que JOIN-eando manualmente.

## Where

`mods/<m>/objects/RecordTypes/rt__<RT>__<base>.json` — declarar `"baseObject": "<Base>"`. Los layouts en `mods/<m>/config/layouts/default_rt__<RT>__<base>_*.json` pueden referenciar fields del base como si fueran propios.

## When

Al disenar un nuevo RT y sus layouts asociados. Si quieres mostrar/editar `name` u otros base fields en el form del rt, declararlos directos en el schema del layout — no hace falta `relations` config.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L52 — Session 7 (2026-05-04)
