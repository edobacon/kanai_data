---
id: RULE-layout-001
project: up1
type: rule
module: layout
tags:
  - atomic-design
  - css
  - pattern
---

# Atoms encapsulan Bootstrap — nunca clases Bootstrap en molecules u organisms

## What

Los atoms en layout/src/components/atoms/ encapsulan Bootstrap. Las clases CSS de Bootstrap (btn, form-control, col-*, etc.) NO deben aparecer en molecules ni organisms.

## Why

La capa de atoms es la abstraccion sobre Bootstrap. Si molecules/organisms usan Bootstrap directo, se acoplan al framework CSS y pierden portabilidad. Cambiar Bootstrap romperia todo en vez de solo atoms.

## Where

layout/src/components/molecules/, layout/src/components/organisms/, mods/*/modsComponents/

## When

Al crear o modificar componentes Vue que NO sean atoms.

## Verification

Grep por clases Bootstrap comunes (btn-, form-, col-, row, container) en archivos de molecules y organisms — deben estar ausentes.

## Source

- **Discovered in**: —
