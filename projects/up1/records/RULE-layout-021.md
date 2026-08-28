---
id: RULE-layout-021
project: up1
type: rule
module: layout
tags:
  - recordlist
  - embed
  - label
  - duplicate-rendering
---

# Embeds inline RecordList: NO declarar `label` top-level + `layoutConfig.label` simultaneo

## What

Si un embed inline RecordList declara `label` en TOP-level del schema entry **y** `layoutConfig.label`, la plataforma renderiza ambos: uno como heading uppercase fuera del list, otro como heading interno del list. Produce duplicacion visual. Solucion: **declarar solo `layoutConfig.label`**. El top-level `label` esta pensado para forms (RecordDetail single-mode), no para record-list embebido.

## Why

`label` top-level activa el render de un heading externo (estilo form-section header). `layoutConfig.label` controla el header interno del list. Ambos pueden coexistir pero produce ruido visual.

## Where

`mods/<m>/config/layouts/<parent>_view.json` y `_edit.json` — cada embed `type: "record-list"`.

## When

Al declarar un embed RecordList. Si necesitas un heading externo de tab (no del list), usar el `label` del tab/section, no del embed.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L25 — Session 3 (2026-04-29)
