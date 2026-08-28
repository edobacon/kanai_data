---
id: RULE-mods-007
project: up1
type: rule
module: mods
tags:
  - mod
  - app
  - config
  - pattern
---

# app.json va en config/app.json singular con formato name/label/tenants

## What

El archivo de configuracion de la app del mod va en config/app.json (singular, no config/apps/). Formato: { name, label, icon (SVG inline), iconBg, order, tenants[], version, defaultObjects[] }. No usa applicationId/objectName/layoutName.

## Why

El sync Phase 6 busca config/app.json para insertar la app en la BD de cada tenant listado en tenants[]. Si el path o formato es incorrecto, la app no aparece en el sidebar.

## Where

mods/*/config/app.json

## When

Al crear un mod nuevo que necesita aparecer en el sidebar.

## Verification

Verificar que config/app.json existe, tiene tenants[] con al menos un tenant, y que despues de sync la app aparece en el sidebar.

## Source

- **Discovered in**: —
