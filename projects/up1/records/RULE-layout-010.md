---
id: RULE-layout-010
project: up1
type: rule
module: layout
tags:
  - layout
  - config
  - pattern
---

# Layouts JSON requieren id, name y tenants para insertarse en BD

## What

Los layouts JSON del mod DEBEN incluir id, name (ademas de layoutName), y tenants[] indicando en que tenants se insertan. Las columns de RecordList usan key (no field) como nombre del campo.

## Why

Sin tenants[], el sync Phase 6 no inserta el layout en la BD del tenant y no se puede acceder desde la UI. Sin id/name, el upsert falla silenciosamente.

## Where

mods/*/config/layouts/*.json

## When

Al crear layouts JSON para un mod.

## Verification

Verificar que cada layout JSON tiene id, name, tenants[]. Columns usan key. Despues de sync, verificar que el layout aparece en la app.

## Source

- **Discovered in**: —
