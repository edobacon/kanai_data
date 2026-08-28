---
id: RULE-mods-019
project: up1
type: rule
module: mods
tags:
  - recordtypes
  - sync
  - convention
---

# Convencion sync para RecordTypes desde mod

## What

Los RecordTypes de un mod viven en `mods/<m>/objects/RecordTypes/rt__<RT>__<base>.json`. El sync (`syncModRecordTypes` en `fileSync.js:923`) los copia a `business/RecordTypes/`. Codegen genera modelo Prisma 1:1 con FK a la tabla base. RTs son **globales** (no per-tenant) — viven en `business/RecordTypes/`.

## Why

Convencion de la plataforma para extension de objetos via RecordType. Permite que la tabla `rt__<RT>__<base>` tenga campos especificos del tipo, manteniendo el base limpio.

## Where

`mods/<m>/objects/RecordTypes/rt__<RT>__<base>.json` — naming pattern obligatorio para que el sync lo reconozca.

## When

Al declarar un nuevo RecordType. La parte `<RT>` es PascalCase del tipo (`Modality`, `LearningOutcome`); `<base>` es lowercase del base (`curricularsection`).

## Source

- [TICKET-009](../../tickets/ticket-009.md) L17 — Session 2 (2026-04-29)
- DECISION-007 (RecordTypes globales)
