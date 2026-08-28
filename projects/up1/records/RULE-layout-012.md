---
id: RULE-layout-012
project: up1
type: rule
module: layout
tags:
  - layout
  - recorddetail
  - create
  - pattern
---

# Create form usa default layout auto-generado salvo layout custom con mode create

## What

El boton 'Crear registro' en RecordList abre un form auto-generado con labels del JSON object definition (en ingles). Para personalizar: crear un layout RecordDetail con mode: create y naming default_{ObjectName}_create. El sync lo registra y la plataforma lo usa automaticamente.

## Why

La plataforma genera un create form basico desde el object definition. Los labels vienen del campo title de cada property (ingles). Un layout custom con mode: create permite controlar labels, placeholders, defaults y campos visibles.

## Where

mods/*/config/layouts/default_{ObjectName}_create.json

## When

Al querer personalizar el formulario de creacion de un objeto.

## Verification

Crear layout con mode: create, sync, verificar que el modal de creacion usa los labels custom.

## Source

- **Discovered in**: —
