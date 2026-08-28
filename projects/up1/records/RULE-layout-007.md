---
id: RULE-layout-007
project: up1
type: rule
module: layout
tags:
  - layout
  - navigation
  - pattern
---

# Layouts auxiliares con applicationId null

## What

Layouts que no deben aparecer en navegacion usan applicationId: null. Estos layouts sirven como targets de row actions, embedded record-lists, o formularios contextuales.

## Why

Sin applicationId: null, el layout aparece como item de navegacion visible, confundiendo al usuario. Layouts auxiliares existen solo para ser invocados desde otros layouts.

## Where

mods/*/config/layouts/

## When

Al crear layouts que son targets de row actions, modales, o embedded lists — no navegacion directa.

## Verification

Verificar que layouts auxiliares tienen applicationId: null en su JSON.

## Source

- **Discovered in**: —
