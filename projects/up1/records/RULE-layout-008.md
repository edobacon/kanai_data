---
id: RULE-layout-008
project: up1
type: rule
module: layout
tags:
  - layout
  - naming
  - convention
---

# Default layouts siguen naming convention default_ObjectName_mode

## What

Los layouts default de un objeto siguen el patron: default_{ObjectName}_{mode} (ej: default_Person_view, default_Person_edit). La resolucion de fallback busca este patron.

## Why

El sistema de resolucion de layouts busca por convencion de nombre: role-specific → global default → query-based match. Si el nombre no sigue el patron, el fallback no lo encuentra.

## Where

mods/*/config/layouts/

## When

Al crear el layout principal (default) de un objeto nuevo.

## Verification

Verificar naming de layouts default contra el patron.

## Source

- **Discovered in**: —
