---
id: BUG-platform-001
project: up1
type: bug
module: platform
tags:
  - i18n
  - recordlist
  - column-tooltip
---

# `column.{key}.description` no es traducible desde el mod

## Symptom

Tooltips de header de columna (`description`) no traducibles desde el mod. La plataforma busca `column.{key}.description` en lang, pero la estructura JSON anidada no permite que vue-i18n resuelva sub-keys sobre string leaf.

## Expected behavior

El mod deberia poder traducir el description del column tooltip en su lang JSON via una key path coherente con vue-i18n.

## Root cause

La convencion de plataforma asume `column.{key}` como leaf string (`column.name = "Nombre"`). Agregar `column.{key}.description` no es valido en vue-i18n: ya hay un string en `column.{key}`. Para soportar description necesitaria namespace separado (ej. `columnDescription.{key}`).

## Impact

Tooltips quedan en idioma del schema description (uno solo). Para multi-locale, no hay workaround dentro del mod.

## Workaround

Schema description en idioma del mod (en up1: español hardcoded). Multi-locale requiere PR a plataforma.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L14 — Session 1 (2026-04-29)
