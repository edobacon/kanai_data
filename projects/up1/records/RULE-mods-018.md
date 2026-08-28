---
id: RULE-mods-018
project: up1
type: rule
module: mods
tags:
  - object-schema
  - ux
  - documentation
---

# `properties.{field}.description` del schema es texto orientado al usuario final

## What

El JSON object schema `properties.{field}.description` se usa como tooltip de header de columna en RecordList (fallback nivel 2 cuando el lang del mod no traduce la column). Por lo tanto debe escribirse **orientado al usuario final**, no como nota tecnica para devs.

## Why

Los usuarios finales hover sobre el header de columna y ven este texto. La info tecnica (DECISION-XXX, NOT NULL pendiente, FK details) vive en spec/ticket/decisions, NO en el schema description.

## Where

`mods/<m>/objects/Base/<Object>.json` y `mods/<m>/objects/Extended/ext__<TENANT>__<Object>.json` — en cada `properties.{field}.description`.

## When

Al declarar/modificar la descripcion de un campo en el schema. Si el texto necesita info tecnica, ponerla en el spec/ticket/decision y dejar la `description` solo para el usuario.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L16 — Session 1 (2026-04-29)
