---
id: RULE-layout-020
project: up1
type: rule
module: layout
tags:
  - recordlist
  - embed
  - header
  - label
---

# Embeds inline RecordList: declarar siempre `layoutConfig.label`

## What

`layoutConfig.label` en un embed inline `record-list` personaliza el header del embed. Cuando se omite, la plataforma usa "{ObjectName} Record List" generico (en ingles, sin contexto del tab). Patron recomendado: siempre declarar `layoutConfig.label` cuando se use embed inline en RecordDetail.

## Why

Sin label custom, multiples embeds del mismo `objectName` en distintos tabs muestran el mismo header generico — el user no distingue entre tabs. Ademas el bug original (mismo label entre embeds, ver L22) se resolvio justo con esto.

## Where

`mods/<m>/config/layouts/<parent>_view.json` y `_edit.json` — cada embed `type: "record-list"`.

## When

Al declarar un embed inline RecordList. El label debe ser el contexto del tab (ej. "Modalidades del programa" en tab Modalidades de AcademicActivity).

## Source

- [TICKET-009](../../tickets/ticket-009.md) L24 — Session 3 (2026-04-29)
